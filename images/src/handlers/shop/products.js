// Smart21Shop — products, categories and stock.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getSettings, likeTerm, paging, can, round2, storeImage, imageResponse, HttpError,
} from '../../lib/shop-auth.js';

const UNITS = ['pcs', 'kg', 'g', 'litre', 'ml', 'metre', 'box', 'pack', 'dozen', 'bottle', 'bag', 'set', 'hour', 'service'];

// Cost price and profit are only shown to people allowed to see them.
const hideCost = (ctx, row) => {
  if (can(ctx, 'profit.view')) return row;
  const { cost_price, ...rest } = row; // eslint-disable-line no-unused-vars
  return rest;
};
const withFlags = (p) => ({
  ...p,
  has_image: !!p.image_key, image_key: undefined,
  stock_state: !p.track_stock ? 'na' : p.stock_qty <= 0 ? 'out' : p.stock_qty <= p.reorder_level ? 'low' : 'ok',
});

async function loadProduct(env, ctx, id) {
  const p = await env.DB.prepare('SELECT * FROM shp_products WHERE id = ? AND shop_id = ?').bind(id, ctx.shop.id).first();
  if (!p) fail(404, 'Product not found.');
  return p;
}

async function checkCategory(env, ctx, id) {
  if (id == null || id === '') return null;
  const c = await env.DB.prepare('SELECT id FROM shp_categories WHERE id = ? AND shop_id = ?').bind(id, ctx.shop.id).first();
  if (!c) fail(400, 'That category was not found.');
  return c.id;
}

async function assertUnique(env, ctx, field, value, label, exceptId = 0) {
  if (!value) return;
  const dup = await env.DB.prepare(`SELECT id, name FROM shp_products WHERE shop_id = ? AND ${field} = ? AND id != ? LIMIT 1`).bind(ctx.shop.id, value, exceptId).first();
  if (dup) throw new HttpError(409, `${label} "${value}" is already used by "${dup.name}".`);
}

// ---------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------
export const listCategories = secure({ perm: ['products.view', 'sales.create'] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.color, (SELECT COUNT(*) FROM shp_products p WHERE p.category_id = c.id) AS products
     FROM shp_categories c WHERE c.shop_id = ? ORDER BY c.name`
  ).bind(ctx.shop.id).all();
  return json({ categories: results });
});

export const saveCategory = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Category name', { required: true, max: 60 });
  const color = V.color(b.color, 'Colour');
  const sid = ctx.shop.id;
  const clash = await env.DB.prepare('SELECT id FROM shp_categories WHERE shop_id = ? AND name = ? COLLATE NOCASE AND id != ?').bind(sid, name, params.id || 0).first();
  if (clash) fail(409, `A category called "${name}" already exists.`);
  if (params.id) {
    const r = await env.DB.prepare('UPDATE shp_categories SET name = ?, color = ? WHERE id = ? AND shop_id = ?').bind(name, color, params.id, sid).run();
    if (!r.meta.changes) fail(404, 'Category not found.');
    return json({ ok: true });
  }
  const r = await env.DB.prepare('INSERT INTO shp_categories (shop_id, name, color) VALUES (?, ?, ?)').bind(sid, name, color).run();
  await audit(env, request, ctx, 'category.create', 'category', r.meta.last_row_id, name);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const deleteCategory = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const c = await env.DB.prepare('SELECT * FROM shp_categories WHERE id = ? AND shop_id = ?').bind(params.id, ctx.shop.id).first();
  if (!c) fail(404, 'Category not found.');
  await env.DB.prepare('DELETE FROM shp_categories WHERE id = ? AND shop_id = ?').bind(c.id, ctx.shop.id).run();
  await audit(env, request, ctx, 'category.delete', 'category', c.id, c.name);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------
export const listProducts = secure({ perm: ['products.view', 'sales.create'] }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id;
  const sp = url.searchParams;
  const all = sp.get('all') === '1';
  const { page, limit, offset } = all ? { page: 1, limit: 5000, offset: 0 } : paging(url, 24, 200);
  const where = ['p.shop_id = ?1']; const binds = [sid];
  const add = (sql, ...v) => { let i = binds.length; where.push(sql.replace(/\?/g, () => `?${++i}`)); binds.push(...v); };

  const q = (sp.get('q') || '').trim();
  if (q) { const l = likeTerm(q); add(`(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\' OR p.barcode LIKE ? ESCAPE '\\')`, l, l, l); }
  if (sp.get('barcode')) add('(p.barcode = ? OR p.sku = ?)', sp.get('barcode').trim(), sp.get('barcode').trim());
  if (sp.get('category_id')) add('p.category_id = ?', Number(sp.get('category_id')) || 0);
  if (sp.get('status')) add('p.status = ?', V.oneOf(sp.get('status'), 'Status', ['active', 'inactive']));
  const stock = sp.get('stock');
  if (stock === 'out') where.push('p.track_stock = 1 AND p.stock_qty <= 0');
  else if (stock === 'low') where.push('p.track_stock = 1 AND p.stock_qty > 0 AND p.stock_qty <= p.reorder_level');
  else if (stock === 'attention') where.push('p.track_stock = 1 AND p.stock_qty <= p.reorder_level');
  else if (stock === 'in') where.push('(p.track_stock = 0 OR p.stock_qty > 0)');

  const SORTS = { name: 'p.name COLLATE NOCASE ASC', recent: 'p.id DESC', stock: 'p.stock_qty ASC, p.name', price: 'p.sell_price DESC' };
  const order = SORTS[sp.get('sort')] || SORTS.name;
  const base = `FROM shp_products p LEFT JOIN shp_categories c ON c.id = p.category_id WHERE ${where.join(' AND ')}`;
  const [{ results }, count, summary] = await Promise.all([
    env.DB.prepare(`SELECT p.*, c.name AS category_name, c.color AS category_color ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN track_stock = 1 AND stock_qty <= 0 THEN 1 ELSE 0 END) AS out_count,
              SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) AS low_count,
              COALESCE(SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 THEN stock_qty * cost_price ELSE 0 END), 0) AS stock_cost,
              COALESCE(SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 THEN stock_qty * sell_price ELSE 0 END), 0) AS stock_retail
       FROM shp_products WHERE shop_id = ?`).bind(sid).first(),
  ]);
  if (!can(ctx, 'profit.view')) { delete summary.stock_cost; }
  return json({ products: results.map((p) => hideCost(ctx, withFlags(p))), total: count.n, page, limit, summary, units: UNITS });
});

function readProduct(b, ctx, existing) {
  const track = b.track_stock === undefined ? (existing ? existing.track_stock : 1) : (b.track_stock === false || b.track_stock === 0 || b.track_stock === '0' ? 0 : 1);
  const canCost = can(ctx, 'profit.view');
  return {
    name: V.str(b.name, 'Product name', { required: true, max: 160 }),
    sku: V.str(b.sku, 'SKU / code', { max: 60 }),
    barcode: V.str(b.barcode, 'Barcode', { max: 60 }),
    category_id: b.category_id === '' ? null : b.category_id,
    unit: (V.str(b.unit, 'Unit', { max: 20 }) || 'pcs').toLowerCase(),
    cost_price: b.cost_price === undefined || !canCost ? (existing ? existing.cost_price : 0) : (V.num(b.cost_price, 'Cost price', { min: 0, max: 1e12 }) ?? 0),
    sell_price: V.num(b.sell_price, 'Selling price', { required: true, min: 0, max: 1e12 }),
    reorder_level: V.num(b.reorder_level, 'Low-stock level', { min: 0, max: 1e9 }) ?? 0,
    track_stock: track,
    status: V.oneOf(b.status, 'Status', ['active', 'inactive'], { def: existing ? existing.status : 'active' }),
    description: V.str(b.description, 'Description', { max: 600 }),
  };
}

export const createProduct = secure({ perm: 'products.manage' }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const p = readProduct(body, ctx, null);
  const sid = ctx.shop.id;
  p.category_id = await checkCategory(env, ctx, p.category_id);
  await assertUnique(env, ctx, 'sku', p.sku, 'The code');
  await assertUnique(env, ctx, 'barcode', p.barcode, 'The barcode');
  const opening = p.track_stock ? (V.num(body.opening_stock, 'Opening stock', { min: 0, max: 1e9 }) ?? 0) : 0;

  const r = await env.DB.prepare(
    `INSERT INTO shp_products (shop_id, category_id, name, sku, barcode, unit, cost_price, sell_price, stock_qty, reorder_level, track_stock, status, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(sid, p.category_id, p.name, p.sku, p.barcode, p.unit, p.cost_price, p.sell_price, opening, p.reorder_level, p.track_stock, p.status, p.description).run();
  const id = r.meta.last_row_id;
  if (opening > 0) {
    await env.DB.prepare(`INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, user_id) VALUES (?, ?, 'opening', ?, ?, 'Opening stock', ?)`)
      .bind(sid, id, opening, opening, ctx.user.id).run();
  }
  await audit(env, request, ctx, 'product.create', 'product', id, p.name);
  return json({ ok: true, id }, { status: 201 });
});

export const getProduct = secure({ perm: ['products.view', 'sales.create'] }, async ({ env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const cat = p.category_id ? await env.DB.prepare('SELECT name, color FROM shp_categories WHERE id = ?').bind(p.category_id).first() : null;
  const sold = await env.DB.prepare(
    `SELECT COALESCE(SUM(i.qty), 0) AS qty, COALESCE(SUM(i.line_total), 0) AS revenue, COALESCE(SUM(i.line_total - i.cost_price * i.qty), 0) AS profit
     FROM shp_sale_items i JOIN shp_sales s ON s.id = i.sale_id WHERE i.product_id = ? AND s.shop_id = ? AND s.status = 'completed'`
  ).bind(p.id, ctx.shop.id).first();
  if (!can(ctx, 'profit.view')) delete sold.profit;
  return json({ product: hideCost(ctx, withFlags({ ...p, category_name: cat && cat.name, category_color: cat && cat.color })), sold });
});

export const updateProduct = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const existing = await loadProduct(env, ctx, params.id);
  const p = readProduct(await readJson(request), ctx, existing);
  p.category_id = await checkCategory(env, ctx, p.category_id);
  await assertUnique(env, ctx, 'sku', p.sku, 'The code', existing.id);
  await assertUnique(env, ctx, 'barcode', p.barcode, 'The barcode', existing.id);
  await env.DB.prepare(
    `UPDATE shp_products SET category_id = ?, name = ?, sku = ?, barcode = ?, unit = ?, cost_price = ?, sell_price = ?, reorder_level = ?,
       track_stock = ?, status = ?, description = ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`
  ).bind(p.category_id, p.name, p.sku, p.barcode, p.unit, p.cost_price, p.sell_price, p.reorder_level, p.track_stock, p.status, p.description, existing.id, ctx.shop.id).run();
  await audit(env, request, ctx, 'product.update', 'product', existing.id, p.name);
  return json({ ok: true });
});

export const deleteProduct = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM shp_sale_items WHERE product_id = ? AND shop_id = ?').bind(p.id, ctx.shop.id).first();
  if (used.n > 0) fail(409, 'This product has already been sold, so it cannot be deleted. Mark it Inactive instead — it will disappear from the till but your sales history stays correct.');
  await env.DB.prepare('DELETE FROM shp_products WHERE id = ? AND shop_id = ?').bind(p.id, ctx.shop.id).run();
  if (p.image_key && env.MATERIALS) await env.MATERIALS.delete(p.image_key).catch(() => {});
  await audit(env, request, ctx, 'product.delete', 'product', p.id, p.name);
  return json({ ok: true });
});

export const uploadProductImage = secure({ perm: 'products.manage' }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a photo.');
  const key = await storeImage(env, form.get('photo'), `shop/${ctx.shop.id}/product-${p.id}`);
  await env.DB.prepare(`UPDATE shp_products SET image_key = ?, updated_at = datetime('now') WHERE id = ?`).bind(key, p.id).run();
  if (p.image_key && env.MATERIALS) await env.MATERIALS.delete(p.image_key).catch(() => {});
  return json({ ok: true });
});

export const getProductImage = secure({ perm: ['products.view', 'sales.create'] }, async ({ env, params, ctx }) => {
  const p = await env.DB.prepare('SELECT image_key FROM shp_products WHERE id = ? AND shop_id = ?').bind(params.id, ctx.shop.id).first();
  if (!p || !p.image_key) return new Response('Not found', { status: 404 });
  return imageResponse(env, p.image_key);
});

// ---------------------------------------------------------------------
// Stock
// ---------------------------------------------------------------------
const STOCK_TYPES = { purchase: 1, return: 1, damage: -1, count: 0 };

export const adjustStock = secure({ perm: 'stock.adjust' }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  if (!p.track_stock) fail(400, 'This item is not tracked in stock (it is a service).');
  const b = await readJson(request);
  const type = V.oneOf(b.type, 'Stock action', Object.keys(STOCK_TYPES), { required: true });
  const qty = V.num(b.qty, type === 'count' ? 'Counted quantity' : 'Quantity', { required: true, min: type === 'count' ? 0 : 0.001, max: 1e9 });
  const note = V.str(b.note, 'Note', { max: 200 });
  const settings = await getSettings(env, ctx.shop.id);

  let change = type === 'count' ? round2(qty - p.stock_qty) : round2(STOCK_TYPES[type] * qty);
  if (change === 0) fail(400, 'That is already the quantity in stock — nothing to change.');
  if (p.stock_qty + change < 0 && !settings.allow_negative_stock) fail(400, `You only have ${p.stock_qty} ${p.unit} in stock, so you cannot remove ${Math.abs(change)}.`);
  const moveType = type === 'count' ? 'adjust' : type;

  const stmts = [
    env.DB.prepare(`UPDATE shp_products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`).bind(change, p.id, ctx.shop.id),
  ];
  if (type === 'purchase' && can(ctx, 'profit.view') && b.cost_price !== undefined && b.cost_price !== '') {
    stmts.push(env.DB.prepare('UPDATE shp_products SET cost_price = ? WHERE id = ? AND shop_id = ?').bind(V.num(b.cost_price, 'Cost price', { min: 0, max: 1e12 }), p.id, ctx.shop.id));
  }
  stmts.push(env.DB.prepare(
    `INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, user_id)
     VALUES (?, ?, ?, ?, (SELECT stock_qty FROM shp_products WHERE id = ?), ?, ?)`
  ).bind(ctx.shop.id, p.id, moveType, change, p.id, note, ctx.user.id));
  await env.DB.batch(stmts);
  const fresh = await env.DB.prepare('SELECT stock_qty FROM shp_products WHERE id = ?').bind(p.id).first();
  await audit(env, request, ctx, 'stock.adjust', 'product', p.id, `${p.name}: ${change > 0 ? '+' : ''}${change} (${type})`);
  return json({ ok: true, stock_qty: fresh.stock_qty, change });
});

export const stockHistory = secure({ perm: 'products.view' }, async ({ env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.type, m.qty_change, m.balance_after, m.note, m.sale_id, m.created_at, u.name AS user_name, s.receipt_no
     FROM shp_stock_moves m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN shp_sales s ON s.id = m.sale_id
     WHERE m.product_id = ? AND m.shop_id = ? ORDER BY m.id DESC LIMIT 100`
  ).bind(p.id, ctx.shop.id).all();
  return json({ product: { id: p.id, name: p.name, unit: p.unit, stock_qty: p.stock_qty }, moves: results });
});
