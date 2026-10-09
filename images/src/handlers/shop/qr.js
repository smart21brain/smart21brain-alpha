// Smart21Shop — QR tags: make them, print them, scan them, see if an item is sold.
//
//   staff (signed in, this shop only)
//     GET  /api/shop/products/:id/qr      list the tags of a product
//     POST /api/shop/products/:id/qr      make N new tags
//     GET  /api/shop/qr/lookup?code=      scan result (product + sold status + receipt)
//     POST /api/shop/qr/:id/status        disable / re-enable an unsold tag
//   public (no sign-in, opened by any phone camera)
//     GET  /api/shop/public/qr/:code      "is this item still available?" — basic facts only
//
// Selling a tag happens in sales.js (createSale marks it sold, voidSale frees it).
import { json } from '../../lib/auth.js';
import { fail, secure, readJson, V, audit, paging, can, errorResponse, HttpError } from '../../lib/shop-auth.js';
import { newQrCodes, extractQrCode, QR_CODE_RE, QR_MAX_PER_BATCH } from '../../lib/shop-qr.js';

const STATUSES = ['in_stock', 'sold', 'disabled'];

async function loadProduct(env, ctx, id) {
  const p = await env.DB.prepare('SELECT id, name, unit, sell_price, track_stock, stock_qty, status FROM shp_products WHERE id = ? AND shop_id = ?').bind(id, ctx.shop.id).first();
  if (!p) fail(404, 'Product not found.');
  return p;
}

async function summaryFor(env, productId) {
  const { results } = await env.DB.prepare('SELECT status, COUNT(*) AS n FROM shp_qr_codes WHERE product_id = ? GROUP BY status').bind(productId).all();
  const s = { in_stock: 0, sold: 0, disabled: 0, total: 0 };
  results.forEach((r) => { s[r.status] = r.n; s.total += r.n; });
  return s;
}

// ---------------------------------------------------------------------
// Tags of one product
// ---------------------------------------------------------------------
export const listProductQr = secure({ perm: 'products.view' }, async ({ env, params, url, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const { page, limit, offset } = paging(url, 30, 200);
  const status = url.searchParams.get('status');
  const where = ['q.product_id = ?1', 'q.shop_id = ?2']; const binds = [p.id, ctx.shop.id];
  if (status) { where.push('q.status = ?3'); binds.push(V.oneOf(status, 'Status', STATUSES)); }
  const base = `FROM shp_qr_codes q LEFT JOIN shp_sales s ON s.id = q.sale_id WHERE ${where.join(' AND ')}`;
  const [{ results }, count, summary] = await Promise.all([
    env.DB.prepare(`SELECT q.id, q.code, q.serial, q.status, q.sale_id, q.sold_at, q.created_at, s.receipt_no
                    ${base} ORDER BY q.serial DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
    summaryFor(env, p.id),
  ]);
  // People who may not open sales should not be pointed at receipts.
  if (!can(ctx, 'sales.view')) results.forEach((r) => { r.sale_id = null; r.receipt_no = null; });
  return json({ product: p, units: results, total: count.n, page, limit, summary });
});

export const generateProductQr = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const b = await readJson(request);
  const count = V.int(b.count, 'Number of QR codes', { required: true, min: 1, max: QR_MAX_PER_BATCH });

  // One INSERT … SELECT over a JSON list keeps this to a single database call
  // (D1 allows only 100 bound values per statement, so a row-per-value INSERT would not fit).
  let base = 0; let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const top = await env.DB.prepare('SELECT COALESCE(MAX(serial), 0) AS n FROM shp_qr_codes WHERE product_id = ?').bind(p.id).first();
    base = top.n;
    try {
      await env.DB.prepare(
        `INSERT INTO shp_qr_codes (shop_id, product_id, code, serial, created_by)
         SELECT ?1, ?2, j.value, ?3 + j.key + 1, ?4 FROM json_each(?5) j`
      ).bind(ctx.shop.id, p.id, base, ctx.user.id, JSON.stringify(newQrCodes(count))).run();
      lastErr = null;
      break;
    } catch (e) {
      // Two people generating at the very same moment (same serial) or a one-in-a-quintillion code clash: just try again.
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
      lastErr = e;
    }
  }
  if (lastErr) throw new HttpError(409, 'Another person was creating QR codes at the same time. Please try again.');

  const { results } = await env.DB.prepare(
    `SELECT id, code, serial, status, sale_id, sold_at, created_at FROM shp_qr_codes WHERE product_id = ? AND serial > ? ORDER BY serial`
  ).bind(p.id, base).all();
  await audit(env, request, ctx, 'qr.generate', 'product', p.id, `${p.name}: ${results.length} QR codes (#${base + 1}–#${base + results.length})`);
  return json({ ok: true, units: results, summary: await summaryFor(env, p.id) }, { status: 201 });
});

// ---------------------------------------------------------------------
// Scan result for staff
// ---------------------------------------------------------------------
export const lookupQr = secure({ perm: ['products.view', 'sales.create'] }, async ({ env, url, ctx }) => {
  const code = extractQrCode(url.searchParams.get('code'));
  if (!code) fail(400, 'That does not look like a Smart21Shop QR code.');
  const u = await env.DB.prepare(
    `SELECT q.id, q.code, q.serial, q.status, q.sold_at, q.created_at, q.sale_id,
            p.id AS product_id, p.name, p.unit, p.sell_price, p.status AS product_status, p.track_stock, p.stock_qty, p.image_key,
            c.name AS category_name
     FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id LEFT JOIN shp_categories c ON c.id = p.category_id
     WHERE q.code = ? AND q.shop_id = ?`
  ).bind(code, ctx.shop.id).first();
  // A code from another shop looks exactly like a code that does not exist.
  if (!u) fail(404, 'This QR code was not found in your shop.');

  let sale = null;
  if (u.status === 'sold' && u.sale_id && can(ctx, 'sales.view')) {
    sale = await env.DB.prepare('SELECT id, receipt_no, customer_name, total, created_at FROM shp_sales WHERE id = ? AND shop_id = ?').bind(u.sale_id, ctx.shop.id).first();
  }
  return json({
    unit: { id: u.id, code: u.code, serial: u.serial, status: u.status, sold_at: u.sold_at, created_at: u.created_at },
    product: {
      id: u.product_id, name: u.name, unit: u.unit, sell_price: u.sell_price, status: u.product_status, track_stock: u.track_stock,
      stock_qty: u.stock_qty, category_name: u.category_name, has_image: !!u.image_key,
    },
    sale,
  });
});

export const setQrStatus = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, 'Status', ['in_stock', 'disabled'], { required: true });
  const u = await env.DB.prepare(
    `SELECT q.id, q.serial, q.status, p.name FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id WHERE q.id = ? AND q.shop_id = ?`
  ).bind(params.id, ctx.shop.id).first();
  if (!u) fail(404, 'QR code not found.');
  if (u.status === 'sold') fail(400, 'This item has already been sold. Cancel the sale first if it came back.');
  if (u.status === status) return json({ ok: true, status });
  await env.DB.prepare('UPDATE shp_qr_codes SET status = ? WHERE id = ? AND shop_id = ? AND status != \'sold\'').bind(status, u.id, ctx.shop.id).run();
  await audit(env, request, ctx, status === 'disabled' ? 'qr.disable' : 'qr.enable', 'product', null, `${u.name} #${u.serial}`);
  return json({ ok: true, status });
});

// ---------------------------------------------------------------------
// Public page — anyone who scans the label with a phone camera
// ---------------------------------------------------------------------
// Deliberately minimal (same idea as the school ID check): shop, product,
// item number, sold or not, and the DATE it was sold. Never the customer,
// receipt, payment, cost price or stock level.
export async function publicQr({ params, env }) {
  const noStore = { 'Cache-Control': 'no-store' };
  try {
    const code = String(params.code || '').toUpperCase();
    if (!QR_CODE_RE.test(code)) return json({ valid: false, error: 'This QR code could not be verified.' }, { status: 404, headers: noStore });
    const r = await env.DB.prepare(
      `SELECT q.serial, q.status, q.sold_at, p.name AS product_name, p.sell_price, p.status AS product_status, c.name AS category_name,
              s.id AS shop_id, s.name AS shop_name, s.phone, s.logo_key, s.primary_color, s.currency, s.utc_offset_min
       FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id JOIN shp_shops s ON s.id = q.shop_id
       LEFT JOIN shp_categories c ON c.id = p.category_id WHERE q.code = ?`
    ).bind(code).first();
    if (!r) return json({ valid: false, error: 'This QR code could not be verified.' }, { status: 404, headers: noStore });

    const available = r.status === 'in_stock' && r.product_status === 'active';
    let soldOn = null;
    if (r.status === 'sold' && r.sold_at) {
      const off = Number.isInteger(r.utc_offset_min) ? r.utc_offset_min : 180;
      soldOn = new Date(Date.parse(String(r.sold_at).replace(' ', 'T') + 'Z') + off * 60000).toISOString().slice(0, 10);
    }
    return json({
      valid: true,
      shop: { id: r.shop_id, name: r.shop_name, phone: r.phone, has_logo: !!r.logo_key, color: r.primary_color, currency: r.currency },
      product: { name: r.product_name, category: r.category_name },
      item: {
        serial: r.serial,
        status: r.status === 'sold' ? 'sold' : available ? 'available' : 'unavailable',
        sold_on: soldOn,
        price: available ? r.sell_price : null,
      },
    }, { headers: noStore });
  } catch (e) { return errorResponse(e); }
}
