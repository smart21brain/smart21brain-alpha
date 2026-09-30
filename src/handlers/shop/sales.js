// Smart21Shop — Point of Sale: create sales, receipts, payments, voids.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getSettings, likeTerm, paging, can, round2, localDate, offsetMin,
} from '../../lib/shop-auth.js';
import { cleanQrList } from '../../lib/shop-qr.js';

// ---------------------------------------------------------------------
// Everything a receipt needs, in one object
// ---------------------------------------------------------------------
export async function loadSaleData(env, ctx, id) {
  const sale = await env.DB.prepare(
    `SELECT s.*, u.name AS sold_by_name, vu.name AS voided_by_name FROM shp_sales s
     LEFT JOIN users u ON u.id = s.sold_by LEFT JOIN users vu ON vu.id = s.voided_by
     WHERE s.id = ? AND s.shop_id = ?`
  ).bind(id, ctx.shop.id).first();
  if (!sale) fail(404, 'Sale not found.');
  const [{ results: items }, { results: payments }, settings] = await Promise.all([
    env.DB.prepare('SELECT id, product_id, name, unit, qty, unit_price, cost_price, line_total FROM shp_sale_items WHERE sale_id = ? ORDER BY id').bind(sale.id).all(),
    env.DB.prepare(
      `SELECT p.id, p.amount, p.method, p.reference, p.note, p.created_at, u.name AS user_name FROM shp_payments p
       LEFT JOIN users u ON u.id = p.received_by WHERE p.sale_id = ? ORDER BY p.id`).bind(sale.id).all(),
    getSettings(env, ctx.shop.id),
  ]);
  // Item numbers of the QR-tagged pieces on this sale (shown on the receipt / warranty proof).
  const { results: qrUnits } = await env.DB.prepare(
    'SELECT product_id, serial FROM shp_qr_codes WHERE sale_id = ? AND shop_id = ? ORDER BY product_id, serial'
  ).bind(sale.id, ctx.shop.id).all();
  const profit = can(ctx, 'profit.view');
  const cust = sale.customer_id
    ? await env.DB.prepare('SELECT id, customer_no, full_name, phone, loyalty_points FROM shp_customers WHERE id = ?').bind(sale.customer_id).first()
    : null;
  if (!profit) { delete sale.cost_total; items.forEach((i) => { delete i.cost_price; }); }
  return {
    sale, items, payments, customer: cust, qr_units: qrUnits,
    shop: {
      id: ctx.shop.id, name: ctx.shop.name, phone: ctx.shop.phone, email: ctx.shop.email, address: ctx.shop.address,
      tax_no: ctx.shop.tax_no, currency: ctx.shop.currency, has_logo: !!ctx.shop.logo_key, primary_color: ctx.shop.primary_color,
      tax_rate: ctx.shop.tax_rate, receipt_note: ctx.shop.receipt_note,
    },
    receipt_footer: settings.receipt_footer,
  };
}

// ---------------------------------------------------------------------
// Make a sale
// ---------------------------------------------------------------------
export const createSale = secure({ perm: 'sales.create' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const sid = ctx.shop.id;
  const settings = await getSettings(env, sid);
  const canDiscount = can(ctx, 'sales.discount');

  if (!Array.isArray(b.items) || !b.items.length) fail(400, 'Add at least one item to the sale.');
  if (b.items.length > 100) fail(400, 'Too many different items in one sale (100 maximum).');

  // ---- products in one query
  const ids = [...new Set(b.items.filter((i) => i.product_id).map((i) => Number(i.product_id)))];
  if (ids.some((n) => !Number.isInteger(n) || n <= 0)) fail(400, 'One of the items is not valid. Please refresh the till.');
  const byId = new Map();
  if (ids.length) {
    const { results } = await env.DB.prepare(`SELECT * FROM shp_products WHERE shop_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(sid, ...ids).all();
    results.forEach((p) => byId.set(p.id, p));
  }

  // ---- lines
  const lines = []; const need = new Map();
  const qrWanted = []; // { code, product_id, name } — QR-tagged pieces scanned at the till
  for (const it of b.items) {
    const qty = V.num(it.qty, 'Quantity', { required: true, min: 0.001, max: 1e7 });
    if (it.qr_codes !== undefined && it.qr_codes !== null && !(Array.isArray(it.qr_codes) && !it.qr_codes.length)) {
      if (!it.product_id) fail(400, 'QR codes can only be used on products from the product list.');
      const clean = cleanQrList(it.qr_codes);
      if (clean.error) fail(400, clean.error);
      if (clean.codes.length > qty + 0.0001) fail(400, 'More QR-tagged items were scanned than the quantity being sold.');
      clean.codes.forEach((code) => qrWanted.push({ code, product_id: Number(it.product_id) }));
    }
    if (it.product_id) {
      const p = byId.get(Number(it.product_id));
      if (!p) fail(400, 'One of the products no longer exists. Please refresh the till.');
      if (p.status !== 'active') fail(400, `"${p.name}" is inactive and cannot be sold.`);
      let price = p.sell_price;
      if (it.unit_price !== undefined && it.unit_price !== null && it.unit_price !== '' && Math.abs(Number(it.unit_price) - p.sell_price) > 0.004) {
        if (!canDiscount) fail(403, 'You do not have permission to change prices at the till.');
        price = V.num(it.unit_price, 'Price', { min: 0, max: 1e12 });
      }
      lines.push({ product: p, product_id: p.id, name: p.name, unit: p.unit, qty, price, cost: p.cost_price, line: round2(qty * price) });
      if (p.track_stock) need.set(p.id, round2((need.get(p.id) || 0) + qty));
    } else {
      if (!canDiscount) fail(403, 'You can only sell items from the product list.');
      const price = V.num(it.unit_price, 'Price', { required: true, min: 0, max: 1e12 });
      lines.push({ product: null, product_id: null, name: V.str(it.name, 'Item name', { required: true, max: 160 }), unit: 'pcs', qty, price, cost: 0, line: round2(qty * price) });
    }
  }
  if (!settings.allow_negative_stock) {
    for (const [pid, q] of need) {
      const p = byId.get(pid);
      if (q > p.stock_qty + 0.0001) fail(400, `Not enough stock for "${p.name}" — only ${p.stock_qty} ${p.unit} left.`);
    }
  }

  // ---- QR-tagged pieces: each must exist in this shop, belong to that product and still be on the shelf
  const qrCodes = qrWanted.map((x) => x.code);
  if (new Set(qrCodes).size !== qrCodes.length) fail(400, 'The same item was scanned twice.');
  if (qrCodes.length > 500) fail(400, 'Too many QR-tagged items in one sale (500 maximum).');
  if (qrCodes.length) {
    const { results: found } = await env.DB.prepare(
      `SELECT q.code, q.serial, q.status, q.product_id, p.name FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id
       WHERE q.shop_id = ?1 AND q.code IN (SELECT value FROM json_each(?2))`
    ).bind(sid, JSON.stringify(qrCodes)).all();
    const byCode = new Map(found.map((f) => [f.code, f]));
    for (const w of qrWanted) {
      const f = byCode.get(w.code);
      if (!f) fail(400, 'One of the scanned QR codes was not found in this shop.');
      if (f.product_id !== w.product_id) fail(400, `QR code #${f.serial} belongs to \"${f.name}\", not to the item it was added to.`);
      if (f.status === 'sold') fail(409, `\"${f.name}\" #${f.serial} has already been sold.`);
      if (f.status === 'disabled') fail(400, `\"${f.name}\" #${f.serial} is disabled and cannot be sold.`);
    }
  }

  // ---- money
  const subtotal = round2(lines.reduce((s, l) => s + l.line, 0));
  const discount = round2(V.num(b.discount, 'Discount', { min: 0, max: 1e12 }) ?? 0);
  if (discount > 0 && !canDiscount) fail(403, 'You do not have permission to give discounts.');
  if (discount > subtotal + 0.004) fail(400, 'The discount cannot be more than the sale total.');
  const taxable = round2(subtotal - discount);
  const tax = ctx.shop.tax_rate > 0 ? round2(taxable * ctx.shop.tax_rate / 100) : 0;
  const total = round2(taxable + tax);

  const pays = [];
  for (const p of (Array.isArray(b.payments) ? b.payments : [])) {
    const amount = round2(V.num(p.amount, 'Payment amount', { required: true, min: 0.01, max: 1e12 }));
    const method = V.str(p.method, 'Payment method', { required: true, max: 40 });
    if (!settings.payment_methods.includes(method)) fail(400, 'Please choose one of the shop\'s payment methods.');
    pays.push({ amount, method, reference: V.str(p.reference, 'Reference', { max: 80 }) });
  }
  const paid = round2(pays.reduce((s, p) => s + p.amount, 0));
  if (paid > total + 0.004) fail(400, 'The payment is more than the sale total. Enter only the amount that covers the sale (give change separately).');
  const balance = Math.max(0, round2(total - paid));
  const payStatus = balance <= 0.004 ? 'paid' : paid > 0 ? 'partial' : 'unpaid';

  // ---- customer
  let customer = null;
  if (b.customer_id) {
    customer = await env.DB.prepare('SELECT * FROM shp_customers WHERE id = ? AND shop_id = ?').bind(b.customer_id, sid).first();
    if (!customer) fail(400, 'That customer was not found.');
    if (customer.status !== 'active') fail(400, `${customer.full_name} is marked Inactive. Activate the customer first.`);
  }
  const dueDate = V.date(b.due_date, 'Due date');
  if (balance > 0.004) {
    if (!customer) fail(400, 'Choose or save a customer before selling on credit (someone has to owe the balance).');
    if (customer.credit_limit > 0) {
      const owed = await env.DB.prepare(`SELECT COALESCE(SUM(balance), 0) AS n FROM shp_sales WHERE shop_id = ? AND customer_id = ? AND status = 'completed'`).bind(sid, customer.id).first();
      if (round2(owed.n + balance) > customer.credit_limit + 0.004) {
        fail(400, `This would take ${customer.full_name} over their credit limit of ${customer.credit_limit.toLocaleString('en-US')} (they already owe ${round2(owed.n).toLocaleString('en-US')}).`);
      }
    }
  }
  const costTotal = round2(lines.reduce((s, l) => s + l.cost * l.qty, 0));
  const customerName = customer ? customer.full_name : (V.str(b.customer_name, 'Customer name', { max: 120 }) || 'Walk-in customer');

  // ---- save (the receipt number is worked out inside the INSERT so it can never repeat)
  const ins = await env.DB.prepare(
    `INSERT INTO shp_sales (shop_id, seq, receipt_no, customer_id, customer_name, customer_phone, subtotal, discount, tax, total, paid, balance,
        cost_total, payment_status, due_date, note, sold_by)
     SELECT ?1, n.seq, ?2 || '-' || substr('000000' || n.seq, -6, 6), ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
     FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM shp_sales WHERE shop_id = ?1) n`
  ).bind(sid, settings.receipt_prefix, customer ? customer.id : null, customerName, customer ? customer.phone : null, subtotal, discount, tax, total, paid, balance,
    costTotal, payStatus, balance > 0.004 ? dueDate : null, V.str(b.note, 'Note', { max: 300 }), ctx.user.id).run();
  const saleId = ins.meta.last_row_id;

  // Claim the scanned pieces. The UPDATE only touches pieces that are STILL in_stock, so if another
  // till sold one a moment ago the counts differ and this sale is rolled back instead of selling it twice.
  const releaseQr = () => env.DB.prepare(
    `UPDATE shp_qr_codes SET status = 'in_stock', sale_id = NULL, sold_at = NULL WHERE sale_id = ? AND shop_id = ?`
  ).bind(saleId, sid).run().catch(() => {});
  if (qrCodes.length) {
    const claim = await env.DB.prepare(
      `UPDATE shp_qr_codes SET status = 'sold', sale_id = ?1, sold_at = datetime('now')
       WHERE shop_id = ?2 AND status = 'in_stock' AND code IN (SELECT value FROM json_each(?3))`
    ).bind(saleId, sid, JSON.stringify(qrCodes)).run();
    if (claim.meta.changes !== qrCodes.length) {
      await releaseQr();
      await env.DB.prepare('DELETE FROM shp_sales WHERE id = ?').bind(saleId).run().catch(() => {});
      fail(409, 'One of the scanned items was just sold by someone else. Please scan it again.');
    }
  }

  const stmts = [];
  for (const l of lines) {
    stmts.push(env.DB.prepare('INSERT INTO shp_sale_items (shop_id, sale_id, product_id, name, unit, qty, unit_price, cost_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(sid, saleId, l.product_id, l.name, l.unit, l.qty, l.price, l.cost, l.line));
  }
  for (const [pid, q] of need) {
    stmts.push(
      env.DB.prepare(`UPDATE shp_products SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`).bind(q, pid, sid),
      env.DB.prepare(`INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, sale_id, user_id)
                      VALUES (?, ?, 'sale', ?, (SELECT stock_qty FROM shp_products WHERE id = ?), ?, ?)`).bind(sid, pid, -q, pid, saleId, ctx.user.id),
    );
  }
  for (const p of pays) {
    stmts.push(env.DB.prepare('INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, reference, received_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(sid, saleId, customer ? customer.id : null, p.amount, p.method, p.reference, ctx.user.id));
  }
  if (customer && settings.loyalty_rate > 0) {
    const pts = Math.floor(total / settings.loyalty_rate);
    if (pts > 0) stmts.push(env.DB.prepare('UPDATE shp_customers SET loyalty_points = loyalty_points + ? WHERE id = ?').bind(pts, customer.id));
  }
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    await releaseQr();
    await env.DB.prepare('DELETE FROM shp_sales WHERE id = ?').bind(saleId).run().catch(() => {});
    throw e;
  }
  const data = await loadSaleData(env, ctx, saleId);
  await audit(env, request, ctx, 'sale.create', 'sale', saleId, `${data.sale.receipt_no} — ${total}${balance > 0.004 ? ` (owing ${balance})` : ''}${qrCodes.length ? ` · ${qrCodes.length} QR item(s)` : ''}`);
  return json({ ok: true, id: saleId, ...data }, { status: 201 });
});

// ---------------------------------------------------------------------
// List & view
// ---------------------------------------------------------------------
export const listSales = secure({ perm: 'sales.view' }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id; const off = offsetMin(ctx);
  const sp = url.searchParams;
  const { page, limit, offset } = sp.get('all') === '1' ? { page: 1, limit: 5000, offset: 0 } : paging(url, 20, 100);
  const where = ['s.shop_id = ?1']; const binds = [sid];
  const add = (sql, ...v) => { let i = binds.length; where.push(sql.replace(/\?/g, () => `?${++i}`)); binds.push(...v); };

  const q = (sp.get('q') || '').trim();
  if (q) { const l = likeTerm(q); add(`(s.receipt_no LIKE ? ESCAPE '\\' OR s.customer_name LIKE ? ESCAPE '\\' OR s.customer_phone LIKE ? ESCAPE '\\')`, l, l, l); }
  if (sp.get('from')) add(`${localDate('s.created_at', off)} >= ?`, V.date(sp.get('from'), 'From date'));
  if (sp.get('to')) add(`${localDate('s.created_at', off)} <= ?`, V.date(sp.get('to'), 'To date'));
  if (sp.get('status')) add('s.status = ?', V.oneOf(sp.get('status'), 'Status', ['completed', 'void']));
  if (sp.get('payment_status')) add('s.payment_status = ?', V.oneOf(sp.get('payment_status'), 'Payment status', ['paid', 'partial', 'unpaid']));
  if (sp.get('customer_id')) add('s.customer_id = ?', Number(sp.get('customer_id')) || 0);
  if (sp.get('owing') === '1') where.push(`s.status = 'completed' AND s.balance > 0.004`);

  const base = `FROM shp_sales s WHERE ${where.join(' AND ')}`;
  const [{ results }, sum] = await Promise.all([
    env.DB.prepare(`SELECT s.id, s.receipt_no, s.customer_id, s.customer_name, s.customer_phone, s.subtotal, s.discount, s.tax, s.total, s.paid, s.balance,
        s.payment_status, s.status, s.due_date, s.created_at, s.cost_total, (SELECT COUNT(*) FROM shp_sale_items i WHERE i.sale_id = s.id) AS item_count,
        (SELECT name FROM users WHERE id = s.sold_by) AS sold_by_name
      ${base} ORDER BY s.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total END), 0) AS total,
        COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.paid END), 0) AS paid, COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.balance END), 0) AS balance
      ${base}`).bind(...binds).first(),
  ]);
  if (!can(ctx, 'profit.view')) results.forEach((r) => { delete r.cost_total; });
  return json({ sales: results, total: sum.n, page, limit, summary: { count: sum.n, total: sum.total, paid: sum.paid, balance: sum.balance } });
});

export const getSale = secure({ perm: 'sales.view' }, async ({ env, params, ctx }) => json(await loadSaleData(env, ctx, params.id)));

// ---------------------------------------------------------------------
// Payments against one sale
// ---------------------------------------------------------------------
export const addPayment = secure({ perm: 'payments.record' }, async ({ request, env, params, ctx }) => {
  const sale = await env.DB.prepare('SELECT * FROM shp_sales WHERE id = ? AND shop_id = ?').bind(params.id, ctx.shop.id).first();
  if (!sale) fail(404, 'Sale not found.');
  if (sale.status !== 'completed') fail(400, 'This sale was cancelled, so it cannot take payments.');
  if (sale.balance <= 0.004) fail(400, 'This sale is already fully paid.');
  const b = await readJson(request);
  const settings = await getSettings(env, ctx.shop.id);
  const amount = round2(V.num(b.amount, 'Amount', { required: true, min: 0.01, max: 1e12 }));
  if (amount > sale.balance + 0.004) fail(400, `Only ${sale.balance.toLocaleString('en-US', { maximumFractionDigits: 2 })} is still owed on this sale.`);
  const method = V.str(b.method, 'Payment method', { required: true, max: 40 });
  if (!settings.payment_methods.includes(method)) fail(400, 'Please choose one of the shop\'s payment methods.');
  const newPaid = round2(sale.paid + amount);
  const newBal = Math.max(0, round2(sale.total - newPaid));
  await env.DB.batch([
    env.DB.prepare('INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, reference, note, received_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
      .bind(ctx.shop.id, sale.id, sale.customer_id, amount, method, V.str(b.reference, 'Reference', { max: 80 }), V.str(b.note, 'Note', { max: 200 }), ctx.user.id),
    env.DB.prepare('UPDATE shp_sales SET paid = ?, balance = ?, payment_status = ? WHERE id = ?').bind(newPaid, newBal, newBal <= 0.004 ? 'paid' : 'partial', sale.id),
  ]);
  await audit(env, request, ctx, 'payment.create', 'sale', sale.id, `${sale.receipt_no}: ${amount} via ${method}`);
  return json({ ok: true, paid: newPaid, balance: newBal });
});

// ---------------------------------------------------------------------
// Cancel (void) a sale — puts the stock back
// ---------------------------------------------------------------------
export const voidSale = secure({ perm: 'sales.void' }, async ({ request, env, params, ctx }) => {
  const sid = ctx.shop.id;
  const sale = await env.DB.prepare('SELECT * FROM shp_sales WHERE id = ? AND shop_id = ?').bind(params.id, sid).first();
  if (!sale) fail(404, 'Sale not found.');
  if (sale.status === 'void') fail(400, 'This sale is already cancelled.');
  const b = await readJson(request);
  const reason = V.str(b.reason, 'Reason', { required: true, max: 200, min: 3 });
  const settings = await getSettings(env, sid);

  const { results: items } = await env.DB.prepare(
    `SELECT i.product_id, SUM(i.qty) AS qty FROM shp_sale_items i JOIN shp_products p ON p.id = i.product_id
     WHERE i.sale_id = ? AND p.track_stock = 1 GROUP BY i.product_id`).bind(sale.id).all();
  const stmts = [
    env.DB.prepare(`UPDATE shp_sales SET status = 'void', void_reason = ?, voided_by = ?, voided_at = datetime('now') WHERE id = ?`).bind(reason, ctx.user.id, sale.id),
    // QR-tagged pieces on this sale go back on the shelf (scanning them says "not sold" again).
    env.DB.prepare(`UPDATE shp_qr_codes SET status = 'in_stock', sale_id = NULL, sold_at = NULL WHERE sale_id = ? AND shop_id = ?`).bind(sale.id, sid),
  ];
  for (const it of items) {
    stmts.push(
      env.DB.prepare(`UPDATE shp_products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`).bind(it.qty, it.product_id, sid),
      env.DB.prepare(`INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, sale_id, user_id)
                      VALUES (?, ?, 'void', ?, (SELECT stock_qty FROM shp_products WHERE id = ?), ?, ?, ?)`)
        .bind(sid, it.product_id, it.qty, it.product_id, `Sale ${sale.receipt_no} cancelled`, sale.id, ctx.user.id),
    );
  }
  if (sale.customer_id && settings.loyalty_rate > 0) {
    const pts = Math.floor(sale.total / settings.loyalty_rate);
    if (pts > 0) stmts.push(env.DB.prepare('UPDATE shp_customers SET loyalty_points = MAX(0, loyalty_points - ?) WHERE id = ?').bind(pts, sale.customer_id));
  }
  await env.DB.batch(stmts);
  await audit(env, request, ctx, 'sale.void', 'sale', sale.id, `${sale.receipt_no} cancelled: ${reason}`);
  return json({ ok: true, refund: sale.paid });
});
