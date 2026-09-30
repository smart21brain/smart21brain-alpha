// Smart21Shop — customers: save, search, profile, notes, statement, debt payments.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getSettings, likeTerm, paging, can, round2, HttpError,
} from '../../lib/shop-auth.js';

const PHONE_KEY_SQL = (col) => `REPLACE(REPLACE(REPLACE(REPLACE(${col}, ' ', ''), '-', ''), '(', ''), ')', '')`;
const phoneKey = (p) => (p ? String(p).replace(/[\s\-()]/g, '') : null);
const TYPES = ['retail', 'wholesale', 'vip'];

// Per-customer totals from completed (not voided) sales.
const CUSTOMER_STATS_JOIN = `LEFT JOIN (
    SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent, SUM(balance) AS balance, MAX(created_at) AS last_purchase
    FROM shp_sales WHERE shop_id = ?1 AND status = 'completed' AND customer_id IS NOT NULL GROUP BY customer_id
  ) st ON st.customer_id = c.id`;

function readCustomer(b) {
  const gender = V.oneOf(b.gender, 'Gender', ['male', 'female'], { def: null });
  return {
    full_name: V.str(b.full_name, 'Customer name', { required: true, max: 120, min: 2 }),
    phone: V.phone(b.phone, 'Phone number'),
    alt_phone: V.phone(b.alt_phone, 'Second phone number'),
    email: V.email(b.email, 'Email'),
    address: V.str(b.address, 'Address', { max: 300 }),
    city: V.str(b.city, 'City / area', { max: 80 }),
    company: V.str(b.company, 'Company', { max: 120 }),
    customer_type: V.oneOf(b.customer_type, 'Customer type', TYPES, { def: 'retail' }),
    gender,
    birthday: V.date(b.birthday, 'Birthday'),
    credit_limit: V.num(b.credit_limit, 'Credit limit', { min: 0, max: 1e12 }) ?? 0,
    notes: V.str(b.notes, 'Notes', { max: 1000 }),
  };
}

async function assertPhoneFree(env, shopId, phone, exceptId = 0) {
  const key = phoneKey(phone);
  if (!key) return;
  const dup = await env.DB.prepare(
    `SELECT id, full_name, customer_no FROM shp_customers WHERE shop_id = ? AND ${PHONE_KEY_SQL('phone')} = ? AND id != ? LIMIT 1`
  ).bind(shopId, key, exceptId).first();
  if (dup) throw new HttpError(409, `${dup.full_name} (${dup.customer_no}) is already saved with this phone number.`, { existing_id: dup.id });
}

async function loadCustomer(env, ctx, id) {
  const c = await env.DB.prepare('SELECT * FROM shp_customers WHERE id = ? AND shop_id = ?').bind(id, ctx.shop.id).first();
  if (!c) fail(404, 'Customer not found.');
  return c;
}

// ---------------------------------------------------------------------
// List / search
// ---------------------------------------------------------------------
export const listCustomers = secure({ perm: 'customers.view' }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id;
  const sp = url.searchParams;
  const all = sp.get('all') === '1';
  const { page, limit, offset } = all ? { page: 1, limit: 5000, offset: 0 } : paging(url, 20, 100);
  const where = ['c.shop_id = ?1']; const binds = [sid];
  const add = (sql, ...v) => { let i = binds.length; where.push(sql.replace(/\?/g, () => `?${++i}`)); binds.push(...v); };

  const q = (sp.get('q') || '').trim();
  if (q) {
    const like = likeTerm(q);
    add(`(c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.alt_phone LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.customer_no LIKE ? ESCAPE '\\' OR c.company LIKE ? ESCAPE '\\')`, like, like, like, like, like, like);
  }
  if (sp.get('status')) add('c.status = ?', V.oneOf(sp.get('status'), 'Status', ['active', 'inactive']));
  if (sp.get('type')) add('c.customer_type = ?', V.oneOf(sp.get('type'), 'Type', TYPES));
  if (sp.get('owing') === '1') where.push('COALESCE(st.balance, 0) > 0.004');

  const SORTS = {
    name: 'c.full_name COLLATE NOCASE ASC', recent: 'c.id DESC', spent: 'COALESCE(st.spent, 0) DESC',
    balance: 'COALESCE(st.balance, 0) DESC', last: 'st.last_purchase DESC, c.id DESC',
  };
  const order = SORTS[sp.get('sort')] || SORTS.recent;

  const base = `FROM shp_customers c ${CUSTOMER_STATS_JOIN} WHERE ${where.join(' AND ')}`;
  const [{ results }, count, summary] = await Promise.all([
    env.DB.prepare(`SELECT c.*, COALESCE(st.orders, 0) AS orders, COALESCE(st.spent, 0) AS spent, COALESCE(st.balance, 0) AS balance, st.last_purchase
      ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN COALESCE(st.balance, 0) > 0.004 THEN 1 ELSE 0 END) AS owing_count,
              COALESCE(SUM(CASE WHEN COALESCE(st.balance, 0) > 0.004 THEN st.balance ELSE 0 END), 0) AS owing_total,
              SUM(CASE WHEN c.created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS new_30d
       FROM shp_customers c ${CUSTOMER_STATS_JOIN} WHERE c.shop_id = ?1`).bind(sid).first(),
  ]);
  return json({ customers: results, total: count.n, page, limit, summary });
});

// ---------------------------------------------------------------------
// Create / update / delete
// ---------------------------------------------------------------------
export const createCustomer = secure({ perm: 'customers.create' }, async ({ request, env, ctx }) => {
  const b = readCustomer(await readJson(request));
  const sid = ctx.shop.id;
  await assertPhoneFree(env, sid, b.phone);
  const settings = await getSettings(env, sid);
  const prefix = settings.customer_prefix;

  // The next customer number is worked out inside the INSERT so two people
  // saving at once can never get the same number.
  const r = await env.DB.prepare(
    `INSERT INTO shp_customers (shop_id, seq, customer_no, full_name, phone, alt_phone, email, address, city, company,
        customer_type, gender, birthday, credit_limit, notes, created_by)
     SELECT ?1, n.seq, ?2 || '-' || substr('0000' || n.seq, -4, 4), ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15
     FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM shp_customers WHERE shop_id = ?1) n`
  ).bind(sid, prefix, b.full_name, b.phone, b.alt_phone, b.email, b.address, b.city, b.company,
    b.customer_type, b.gender, b.birthday, b.credit_limit, b.notes, ctx.user.id).run();
  const id = r.meta.last_row_id;
  const row = await env.DB.prepare('SELECT * FROM shp_customers WHERE id = ?').bind(id).first();
  await audit(env, request, ctx, 'customer.create', 'customer', id, `${row.full_name} (${row.customer_no})`);
  return json({ ok: true, id, customer: row }, { status: 201 });
});

export const updateCustomer = secure({ perm: 'customers.edit' }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = readCustomer(await readJson(request));
  await assertPhoneFree(env, ctx.shop.id, b.phone, c.id);
  await env.DB.prepare(
    `UPDATE shp_customers SET full_name = ?, phone = ?, alt_phone = ?, email = ?, address = ?, city = ?, company = ?,
       customer_type = ?, gender = ?, birthday = ?, credit_limit = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND shop_id = ?`
  ).bind(b.full_name, b.phone, b.alt_phone, b.email, b.address, b.city, b.company, b.customer_type, b.gender, b.birthday,
    b.credit_limit, b.notes, c.id, ctx.shop.id).run();
  // Keep the name on old receipts in step with the customer card
  await env.DB.prepare('UPDATE shp_sales SET customer_name = ?, customer_phone = ? WHERE customer_id = ? AND shop_id = ?')
    .bind(b.full_name, b.phone, c.id, ctx.shop.id).run();
  await audit(env, request, ctx, 'customer.update', 'customer', c.id, b.full_name);
  return json({ ok: true });
});

export const setCustomerStatus = secure({ perm: 'customers.edit' }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = await readJson(request);
  const status = V.oneOf(b.status, 'Status', ['active', 'inactive'], { required: true });
  await env.DB.prepare(`UPDATE shp_customers SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, c.id).run();
  await audit(env, request, ctx, 'customer.status', 'customer', c.id, `${c.full_name} → ${status}`);
  return json({ ok: true });
});

export const deleteCustomer = secure({ perm: 'customers.delete' }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM shp_sales WHERE customer_id = ? AND shop_id = ?').bind(c.id, ctx.shop.id).first();
  if (used.n > 0) fail(409, 'This customer has purchase history, so they cannot be deleted. Mark them Inactive instead — their records are kept.');
  await env.DB.prepare('DELETE FROM shp_customers WHERE id = ? AND shop_id = ?').bind(c.id, ctx.shop.id).run();
  await audit(env, request, ctx, 'customer.delete', 'customer', c.id, `${c.full_name} (${c.customer_no})`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------
export const getCustomer = secure({ perm: 'customers.view' }, async ({ env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const sid = ctx.shop.id;
  const seeSales = can(ctx, 'sales.view');
  const q = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);

  const [stats, sales, top, payments, notes] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, COALESCE(SUM(balance), 0) AS balance,
              MAX(created_at) AS last_purchase, MIN(created_at) AS first_purchase, COALESCE(AVG(total), 0) AS avg_order
       FROM shp_sales WHERE shop_id = ? AND customer_id = ? AND status = 'completed'`).bind(sid, c.id).first(),
    seeSales ? q(`SELECT id, receipt_no, total, paid, balance, payment_status, status, created_at FROM shp_sales
                  WHERE shop_id = ? AND customer_id = ? ORDER BY id DESC LIMIT 15`, sid, c.id) : Promise.resolve([]),
    seeSales ? q(`SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS amount FROM shp_sale_items i
                  JOIN shp_sales s ON s.id = i.sale_id WHERE s.shop_id = ? AND s.customer_id = ? AND s.status = 'completed'
                  GROUP BY i.name ORDER BY amount DESC LIMIT 5`, sid, c.id) : Promise.resolve([]),
    can(ctx, 'payments.record') || seeSales ? q(`SELECT p.id, p.amount, p.method, p.reference, p.created_at, s.receipt_no FROM shp_payments p
                  JOIN shp_sales s ON s.id = p.sale_id WHERE p.shop_id = ? AND p.customer_id = ? AND s.status = 'completed'
                  ORDER BY p.id DESC LIMIT 10`, sid, c.id) : Promise.resolve([]),
    can(ctx, 'customers.notes') ? q(`SELECT n.id, n.note, n.created_at, u.name AS user_name FROM shp_customer_notes n
                  LEFT JOIN users u ON u.id = n.user_id WHERE n.shop_id = ? AND n.customer_id = ? ORDER BY n.id DESC LIMIT 50`, sid, c.id) : Promise.resolve([]),
  ]);
  return json({ customer: c, stats, sales, top_products: top, payments, notes });
});

export const addNote = secure({ perm: 'customers.notes' }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = await readJson(request);
  const note = V.str(b.note, 'Note', { required: true, max: 1000 });
  const r = await env.DB.prepare('INSERT INTO shp_customer_notes (shop_id, customer_id, user_id, note) VALUES (?, ?, ?, ?)')
    .bind(ctx.shop.id, c.id, ctx.user.id, note).run();
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const deleteNote = secure({ perm: 'customers.notes' }, async ({ env, params, ctx }) => {
  await env.DB.prepare('DELETE FROM shp_customer_notes WHERE id = ? AND shop_id = ?').bind(params.id, ctx.shop.id).run();
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Statement (every sale and payment, with a running balance)
// ---------------------------------------------------------------------
export const statement = secure({ perm: ['customers.view', 'sales.view'] }, async ({ env, params, url, ctx }) => {
  if (!can(ctx, 'customers.view')) fail(403, 'You do not have permission to do this. Ask the shop owner.');
  const c = await loadCustomer(env, ctx, params.id);
  const sid = ctx.shop.id;
  const [{ results: sales }, { results: pays }] = await Promise.all([
    env.DB.prepare(`SELECT id, receipt_no, total, created_at FROM shp_sales WHERE shop_id = ? AND customer_id = ? AND status = 'completed'`).bind(sid, c.id).all(),
    env.DB.prepare(`SELECT p.id, p.amount, p.method, p.reference, p.created_at, s.receipt_no FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id
                    WHERE p.shop_id = ? AND p.customer_id = ? AND s.status = 'completed'`).bind(sid, c.id).all(),
  ]);
  const entries = [
    ...sales.map((s) => ({ date: s.created_at, kind: 'sale', ref: s.receipt_no, sale_id: s.id, debit: s.total, credit: 0, sort: 0, id: s.id })),
    ...pays.map((p) => ({ date: p.created_at, kind: 'payment', ref: p.receipt_no, sale_id: null, method: p.method, debit: 0, credit: p.amount, sort: 1, id: p.id })),
  ].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : a.sort - b.sort || a.id - b.id));
  let bal = 0;
  entries.forEach((e) => { bal = round2(bal + e.debit - e.credit); e.balance = bal; });
  const from = url.searchParams.get('from'); const to = url.searchParams.get('to');
  const shown = entries.filter((e) => (!from || e.date.slice(0, 10) >= from) && (!to || e.date.slice(0, 10) <= to));
  return json({ customer: c, entries: shown.reverse(), balance: bal });
});

// ---------------------------------------------------------------------
// Receive a payment against everything the customer owes (oldest first)
// ---------------------------------------------------------------------
export const receivePayment = secure({ perm: 'payments.record' }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = await readJson(request);
  const settings = await getSettings(env, ctx.shop.id);
  const amount = round2(V.num(b.amount, 'Amount', { required: true, min: 0.01, max: 1e12 }));
  const method = V.str(b.method, 'Payment method', { required: true, max: 40 });
  if (!settings.payment_methods.includes(method)) fail(400, 'Please choose one of the shop\'s payment methods.');
  const reference = V.str(b.reference, 'Reference', { max: 80 });
  const note = V.str(b.note, 'Note', { max: 200 });

  const { results: open } = await env.DB.prepare(
    `SELECT id, receipt_no, total, paid, balance FROM shp_sales
     WHERE shop_id = ? AND customer_id = ? AND status = 'completed' AND balance > 0.004 ORDER BY created_at, id`
  ).bind(ctx.shop.id, c.id).all();
  const owed = round2(open.reduce((s, x) => s + x.balance, 0));
  if (!open.length) fail(400, 'This customer does not owe anything.');
  if (amount > owed + 0.004) fail(400, `This customer owes only ${owed.toLocaleString('en-US', { maximumFractionDigits: 2 })}. Please enter that amount or less.`);

  let left = amount; const allocations = []; const stmts = [];
  for (const s of open) {
    if (left <= 0.004) break;
    const pay = round2(Math.min(left, s.balance));
    left = round2(left - pay);
    const newPaid = round2(s.paid + pay);
    const newBal = Math.max(0, round2(s.total - newPaid));
    const status = newBal <= 0.004 ? 'paid' : 'partial';
    stmts.push(
      env.DB.prepare('INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, reference, note, received_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(ctx.shop.id, s.id, c.id, pay, method, reference, note, ctx.user.id),
      env.DB.prepare('UPDATE shp_sales SET paid = ?, balance = ?, payment_status = ? WHERE id = ? AND shop_id = ?').bind(newPaid, newBal, status, s.id, ctx.shop.id),
    );
    allocations.push({ sale_id: s.id, receipt_no: s.receipt_no, amount: pay, settled: status === 'paid' });
  }
  await env.DB.batch(stmts);
  await audit(env, request, ctx, 'payment.customer', 'customer', c.id, `${amount} from ${c.full_name} via ${method}`);
  return json({ ok: true, allocations, remaining: round2(owed - amount), paid: amount });
});
