// Smart21Shop — dashboard, alerts, global search, activity log and reports.
import { json } from '../../lib/auth.js';
import {
  fail, secure, V, audit, likeTerm, paging, can, round2, localDate, offsetMin, shopToday, addDays,
} from '../../lib/shop-auth.js';

const all = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
const one = (env, sql, ...b) => env.DB.prepare(sql).bind(...b).first();

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
export const dashboard = secure(async ({ env, ctx }) => {
  const sid = ctx.shop.id; const off = offsetMin(ctx);
  const today = shopToday(off);
  const monthStart = today.slice(0, 8) + '01';
  const from14 = addDays(today, -13);
  const from30 = addDays(today, -29);
  const D = localDate('s.created_at', off);
  const seeSales = can(ctx, 'sales.view') || can(ctx, 'sales.create');
  const seeProfit = can(ctx, 'profit.view');
  const out = { today, currency: ctx.shop.currency };

  const jobs = [];
  if (seeSales) {
    jobs.push(one(env, `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(cost_total), 0) AS cost, COALESCE(SUM(balance), 0) AS credit
                        FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} = ?`, sid, today).then((r) => { out.today_sales = { count: r.count, total: r.total, credit: r.credit, profit: seeProfit ? round2(r.total - r.cost) : undefined }; }));
    jobs.push(one(env, `SELECT COALESCE(SUM(p.amount), 0) AS n FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id
                        WHERE p.shop_id = ? AND s.status = 'completed' AND ${localDate('p.created_at', off)} = ?`, sid, today).then((r) => { out.received_today = r.n; }));
    jobs.push(one(env, `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(total - tax), 0) AS net, COALESCE(SUM(cost_total), 0) AS cost
                        FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ?`, sid, monthStart).then((r) => { out.month_sales = { count: r.count, total: r.total, profit: seeProfit ? round2(r.net - r.cost) : undefined }; }));
    jobs.push(all(env, `SELECT ${D} AS date, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(total - tax - cost_total), 0) AS profit
                        FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ? GROUP BY 1`, sid, from14).then((rows) => {
      const map = new Map(rows.map((r) => [r.date, r]));
      out.daily = Array.from({ length: 14 }, (_, i) => { const d = addDays(from14, i); const r = map.get(d); return { date: d, count: r ? r.count : 0, total: r ? r.total : 0, profit: seeProfit ? (r ? round2(r.profit) : 0) : undefined }; });
    }));
    jobs.push(all(env, `SELECT p.method, SUM(p.amount) AS total FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id
                        WHERE p.shop_id = ? AND s.status = 'completed' AND ${localDate('p.created_at', off)} >= ? GROUP BY p.method ORDER BY total DESC`, sid, monthStart).then((r) => { out.by_method = r; }));
    jobs.push(all(env, `SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS revenue FROM shp_sale_items i JOIN shp_sales s ON s.id = i.sale_id
                        WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ? GROUP BY i.product_id, i.name ORDER BY revenue DESC LIMIT 6`, sid, from30).then((r) => { out.top_products = r; }));
    if (can(ctx, 'sales.view')) {
      jobs.push(all(env, `SELECT s.id, s.receipt_no, s.customer_name, s.total, s.balance, s.payment_status, s.status, s.created_at FROM shp_sales s
                          WHERE s.shop_id = ? ORDER BY s.id DESC LIMIT 7`, sid).then((r) => { out.recent_sales = r; }));
    }
  }
  if (can(ctx, 'customers.view')) {
    jobs.push(one(env, `SELECT COUNT(*) AS total, SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS new_30d FROM shp_customers WHERE shop_id = ?`, sid)
      .then((r) => { out.customers = { total: r.total, new_30d: r.new_30d || 0 }; }));
    jobs.push(one(env, `SELECT COUNT(DISTINCT customer_id) AS n, COALESCE(SUM(balance), 0) AS total FROM shp_sales WHERE shop_id = ? AND status = 'completed' AND balance > 0.004 AND customer_id IS NOT NULL`, sid)
      .then((r) => { out.debts = { count: r.n, total: r.total }; }));
    if (seeSales) {
      jobs.push(all(env, `SELECT c.id, c.full_name, COUNT(*) AS orders, SUM(s.total) AS spent FROM shp_sales s JOIN shp_customers c ON c.id = s.customer_id
                          WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ? GROUP BY c.id ORDER BY spent DESC LIMIT 5`, sid, from30).then((r) => { out.top_customers = r; }));
    }
  }
  if (can(ctx, 'products.view')) {
    jobs.push(one(env, `SELECT COUNT(*) AS total, SUM(CASE WHEN track_stock = 1 AND stock_qty <= 0 THEN 1 ELSE 0 END) AS out_count,
                        SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) AS low_count,
                        COALESCE(SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 THEN stock_qty * cost_price END), 0) AS stock_cost
                        FROM shp_products WHERE shop_id = ? AND status = 'active'`, sid).then((r) => { out.inventory = { total: r.total, out: r.out_count || 0, low: r.low_count || 0, stock_cost: seeProfit ? r.stock_cost : undefined }; }));
    jobs.push(all(env, `SELECT id, name, unit, stock_qty, reorder_level FROM shp_products WHERE shop_id = ? AND status = 'active' AND track_stock = 1 AND stock_qty <= reorder_level
                        ORDER BY stock_qty ASC LIMIT 6`, sid).then((r) => { out.low_stock = r; }));
  }
  if (can(ctx, 'expenses.manage')) {
    jobs.push(one(env, `SELECT COALESCE(SUM(amount), 0) AS n FROM shp_expenses WHERE shop_id = ? AND expense_date >= ?`, sid, monthStart).then((r) => { out.month_expenses = r.n; }));
  }
  if (can(ctx, 'audit.view')) {
    jobs.push(all(env, `SELECT l.action, l.details, l.created_at, u.name AS user_name FROM shp_audit_logs l LEFT JOIN users u ON u.id = l.user_id
                        WHERE l.shop_id = ? AND l.action != 'user.login' ORDER BY l.id DESC LIMIT 7`, sid).then((r) => { out.recent_activity = r; }));
  }
  await Promise.all(jobs);
  if (seeProfit && out.month_sales && out.month_expenses != null) out.month_net_profit = round2(out.month_sales.profit - out.month_expenses);
  return json(out);
});

// ---------------------------------------------------------------------
// Alerts (the bell) — worked out live, nothing to clean up
// ---------------------------------------------------------------------
export const alerts = secure(async ({ env, ctx }) => {
  const sid = ctx.shop.id; const today = shopToday(offsetMin(ctx));
  const list = [];
  if (can(ctx, 'products.view')) {
    const r = await one(env, `SELECT SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END) AS out_count,
        SUM(CASE WHEN stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) AS low_count
        FROM shp_products WHERE shop_id = ? AND status = 'active' AND track_stock = 1`, sid);
    if (r.out_count) list.push({ type: 'stock_out', icon: 'fa-box-open', tone: 'bad', title: `${r.out_count} product${r.out_count === 1 ? ' is' : 's are'} out of stock`, message: 'Restock before customers ask for them.', route: 'products?stock=out' });
    if (r.low_count) list.push({ type: 'stock_low', icon: 'fa-triangle-exclamation', tone: 'warn', title: `${r.low_count} product${r.low_count === 1 ? ' is' : 's are'} running low`, message: 'Below the low-stock level you set.', route: 'products?stock=low' });
  }
  if (can(ctx, 'customers.view')) {
    const d = await one(env, `SELECT COUNT(DISTINCT customer_id) AS n, COALESCE(SUM(balance), 0) AS total,
        COUNT(DISTINCT CASE WHEN due_date IS NOT NULL AND due_date < ? THEN customer_id END) AS late
        FROM shp_sales WHERE shop_id = ? AND status = 'completed' AND balance > 0.004 AND customer_id IS NOT NULL`, today, sid);
    if (d.late) list.push({ type: 'debt_late', icon: 'fa-clock', tone: 'bad', title: `${d.late} customer${d.late === 1 ? ' has' : 's have'} passed their payment date`, message: 'Follow up on overdue balances.', route: 'debts' });
    else if (d.n) list.push({ type: 'debt', icon: 'fa-hand-holding-dollar', tone: 'info', title: `${d.n} customer${d.n === 1 ? ' owes' : 's owe'} you money`, message: `${round2(d.total).toLocaleString('en-US')} ${ctx.shop.currency} in unpaid balances.`, route: 'debts' });
  }
  return json({ alerts: list, count: list.length });
});

// ---------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------
export const search = secure(async ({ env, url, ctx }) => {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ results: {} });
  const like = likeTerm(q); const sid = ctx.shop.id; const results = {};
  const jobs = [];
  if (can(ctx, 'customers.view')) {
    jobs.push(all(env, `SELECT id, full_name, customer_no, phone FROM shp_customers WHERE shop_id = ? AND (full_name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR customer_no LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 6`, sid, like, like, like, like)
      .then((r) => { results.customers = r.map((c) => ({ title: c.full_name, sub: `${c.customer_no}${c.phone ? ' · ' + c.phone : ''}`, route: `customer/${c.id}` })); }));
  }
  if (can(ctx, 'products.view')) {
    jobs.push(all(env, `SELECT id, name, sku, sell_price FROM shp_products WHERE shop_id = ? AND (name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\' OR barcode LIKE ? ESCAPE '\\') ORDER BY name LIMIT 6`, sid, like, like, like)
      .then((r) => { results.products = r.map((p) => ({ title: p.name, sub: `${p.sku || 'No code'} · ${p.sell_price.toLocaleString('en-US')} ${ctx.shop.currency}`, route: `products/${p.id}` })); }));
  }
  if (can(ctx, 'sales.view')) {
    jobs.push(all(env, `SELECT id, receipt_no, customer_name, total FROM shp_sales WHERE shop_id = ? AND (receipt_no LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\') ORDER BY id DESC LIMIT 6`, sid, like, like)
      .then((r) => { results.sales = r.map((s) => ({ title: s.receipt_no, sub: `${s.customer_name || 'Walk-in'} · ${s.total.toLocaleString('en-US')} ${ctx.shop.currency}`, route: `sales/${s.id}` })); }));
  }
  await Promise.all(jobs);
  return json({ results });
});

// ---------------------------------------------------------------------
// Activity log
// ---------------------------------------------------------------------
export const listAudit = secure({ perm: 'audit.view' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 30, 100);
  const sp = url.searchParams; const where = ['l.shop_id = ?1']; const binds = [ctx.shop.id];
  if (sp.get('q')) { const l = likeTerm(sp.get('q')); where.push(`(l.action LIKE ?2 ESCAPE '\\' OR l.details LIKE ?2 ESCAPE '\\' OR u.name LIKE ?2 ESCAPE '\\')`); binds.push(l); }
  const base = `FROM shp_audit_logs l LEFT JOIN users u ON u.id = l.user_id WHERE ${where.join(' AND ')}`;
  const [logs, n] = await Promise.all([
    all(env, `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.ip, l.created_at, u.name AS user_name ${base} ORDER BY l.id DESC LIMIT ${limit} OFFSET ${offset}`, ...binds),
    one(env, `SELECT COUNT(*) AS n ${base}`, ...binds),
  ]);
  return json({ logs, total: n.n, page, limit });
});

// ---------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------
const REPORT_CATALOGUE = [
  { group: 'Sales', items: [
    { key: 'sales.daily', label: 'Daily sales', filters: ['from', 'to'] },
    { key: 'sales.products', label: 'Sales by product', filters: ['from', 'to', 'category_id'] },
    { key: 'sales.customers', label: 'Sales by customer', filters: ['from', 'to'] },
    { key: 'sales.cashiers', label: 'Sales by staff member', filters: ['from', 'to'] },
    { key: 'sales.receipts', label: 'All receipts', filters: ['from', 'to', 'status'] },
  ] },
  { group: 'Customers', items: [
    { key: 'customers.all', label: 'Customer list', filters: [] },
    { key: 'customers.debtors', label: 'Customers who owe money', filters: [] },
    { key: 'customers.top', label: 'Top customers', filters: ['from', 'to'] },
    { key: 'customers.new', label: 'New customers', filters: ['from', 'to'] },
  ] },
  { group: 'Stock', items: [
    { key: 'inventory.stock', label: 'Stock levels & value', filters: ['category_id'] },
    { key: 'inventory.low', label: 'Low & out of stock', filters: [] },
    { key: 'inventory.movements', label: 'Stock movements', filters: ['from', 'to'] },
  ] },
  { group: 'Money', items: [
    { key: 'finance.profit', label: 'Profit & loss', filters: ['from', 'to'], needs: 'profit.view' },
    { key: 'finance.payments', label: 'Money received', filters: ['from', 'to', 'method'] },
    { key: 'finance.expenses', label: 'Expenses', filters: ['from', 'to'], needs: 'expenses.manage' },
  ] },
];

export const reportCatalogue = secure({ perm: 'reports.view' }, async ({ ctx }) => {
  const groups = REPORT_CATALOGUE.map((g) => ({ ...g, items: g.items.filter((i) => !i.needs || can(ctx, i.needs)) })).filter((g) => g.items.length);
  return json({ groups });
});

const money = (label, key) => ({ key, label, type: 'money', align: 'end' });
const num = (label, key) => ({ key, label, type: 'number', align: 'end' });

async function buildReport(env, ctx, key, q) {
  const sid = ctx.shop.id; const off = offsetMin(ctx); const profit = can(ctx, 'profit.view');
  const today = shopToday(off);
  const from = V.date(q.from, 'From date') || today.slice(0, 8) + '01';
  const to = V.date(q.to, 'To date') || today;
  if (to < from) fail(400, 'The end date cannot be before the start date.');
  const D = localDate('s.created_at', off);
  const range = `${from} → ${to}`;
  const def = REPORT_CATALOGUE.flatMap((g) => g.items).find((i) => i.key === key);
  if (!def) fail(404, 'Unknown report.');
  if (def.needs && !can(ctx, def.needs)) fail(403, 'You do not have permission to open this report.');

  switch (key) {
    case 'sales.daily': {
      const rows = await all(env, `SELECT ${D} AS date, COUNT(*) AS receipts, COALESCE(SUM(s.subtotal), 0) AS subtotal, COALESCE(SUM(s.discount), 0) AS discount, COALESCE(SUM(s.tax), 0) AS tax,
          COALESCE(SUM(s.total), 0) AS total, COALESCE(SUM(s.paid), 0) AS paid, COALESCE(SUM(s.balance), 0) AS balance, COALESCE(SUM(s.total - s.tax - s.cost_total), 0) AS profit
          FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ? GROUP BY 1 ORDER BY 1 DESC`, sid, from, to);
      const t = rows.reduce((a, r) => ({ n: a.n + r.receipts, total: a.total + r.total, profit: a.profit + r.profit }), { n: 0, total: 0, profit: 0 });
      return { title: `Daily sales (${range})`, summary: [`${t.n} receipts`, `Total sales ${round2(t.total).toLocaleString('en-US')} ${ctx.shop.currency}`, ...(profit ? [`Profit ${round2(t.profit).toLocaleString('en-US')} ${ctx.shop.currency}`] : [])],
        columns: [{ key: 'date', label: 'Date', type: 'date' }, num('Receipts', 'receipts'), money('Sales', 'subtotal'), money('Discounts', 'discount'), money('VAT', 'tax'), money('Total', 'total'), money('Paid', 'paid'), money('Owing', 'balance'), ...(profit ? [money('Profit', 'profit')] : [])],
        rows: rows.map((r) => ({ ...r, profit: round2(r.profit) })) };
    }
    case 'sales.products': {
      const cat = q.category_id ? Number(q.category_id) : 0;
      const rows = await all(env, `SELECT i.name AS product, COALESCE(c.name, '—') AS category, SUM(i.qty) AS qty, SUM(i.line_total) AS revenue, SUM(i.line_total - i.cost_price * i.qty) AS profit
          FROM shp_sale_items i JOIN shp_sales s ON s.id = i.sale_id LEFT JOIN shp_products p ON p.id = i.product_id LEFT JOIN shp_categories c ON c.id = p.category_id
          WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ? ${cat ? 'AND p.category_id = ?' : ''}
          GROUP BY COALESCE(i.product_id, i.name), i.name ORDER BY revenue DESC`, sid, from, to, ...(cat ? [cat] : []));
      return { title: `Sales by product (${range})`, summary: [`${rows.length} products sold`],
        columns: [{ key: 'product', label: 'Product' }, { key: 'category', label: 'Category' }, num('Quantity sold', 'qty'), money('Revenue', 'revenue'), ...(profit ? [money('Profit', 'profit')] : [])],
        rows: rows.map((r) => ({ ...r, profit: round2(r.profit) })) };
    }
    case 'sales.customers': case 'customers.top': {
      const rows = await all(env, `SELECT c.customer_no, c.full_name AS customer, c.phone, COUNT(*) AS orders, SUM(s.total) AS spent, SUM(s.balance) AS balance, MAX(s.created_at) AS last_purchase
          FROM shp_sales s JOIN shp_customers c ON c.id = s.customer_id WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ?
          GROUP BY c.id ORDER BY spent DESC ${key === 'customers.top' ? 'LIMIT 50' : ''}`, sid, from, to);
      return { title: `${key === 'customers.top' ? 'Top customers' : 'Sales by customer'} (${range})`, summary: [`${rows.length} customers`],
        columns: [{ key: 'customer_no', label: 'No.' }, { key: 'customer', label: 'Customer' }, { key: 'phone', label: 'Phone' }, num('Purchases', 'orders'), money('Total spent', 'spent'), money('Owing', 'balance'), { key: 'last_purchase', label: 'Last purchase', type: 'date' }], rows };
    }
    case 'sales.cashiers': {
      const rows = await all(env, `SELECT COALESCE(u.name, 'Unknown') AS staff, COUNT(*) AS receipts, SUM(s.total) AS total, SUM(s.discount) AS discount
          FROM shp_sales s LEFT JOIN users u ON u.id = s.sold_by WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ? GROUP BY s.sold_by ORDER BY total DESC`, sid, from, to);
      return { title: `Sales by staff member (${range})`, summary: [`${rows.length} staff`], columns: [{ key: 'staff', label: 'Staff member' }, num('Receipts', 'receipts'), money('Total sales', 'total'), money('Discounts given', 'discount')], rows };
    }
    case 'sales.receipts': {
      const st = q.status === 'void' ? 'void' : q.status === 'completed' ? 'completed' : '';
      const rows = await all(env, `SELECT s.receipt_no, s.created_at AS date, s.customer_name AS customer, s.total, s.paid, s.balance, s.payment_status, s.status, COALESCE(u.name, '') AS staff
          FROM shp_sales s LEFT JOIN users u ON u.id = s.sold_by WHERE s.shop_id = ? AND ${D} BETWEEN ? AND ? ${st ? 'AND s.status = ?' : ''} ORDER BY s.id DESC`, sid, from, to, ...(st ? [st] : []));
      return { title: `All receipts (${range})`, summary: [`${rows.length} receipts`], columns: [{ key: 'receipt_no', label: 'Receipt' }, { key: 'date', label: 'Date', type: 'datetime' }, { key: 'customer', label: 'Customer' }, money('Total', 'total'), money('Paid', 'paid'), money('Owing', 'balance'), { key: 'payment_status', label: 'Payment' }, { key: 'status', label: 'Status' }, { key: 'staff', label: 'Sold by' }], rows };
    }
    case 'customers.all': {
      const rows = await all(env, `SELECT c.customer_no, c.full_name AS name, c.phone, c.email, c.customer_type AS type, c.city, c.status, c.created_at AS joined,
          COALESCE(st.orders, 0) AS orders, COALESCE(st.spent, 0) AS spent, COALESCE(st.balance, 0) AS balance
          FROM shp_customers c LEFT JOIN (SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent, SUM(balance) AS balance FROM shp_sales WHERE shop_id = ?1 AND status = 'completed' GROUP BY customer_id) st ON st.customer_id = c.id
          WHERE c.shop_id = ?1 ORDER BY c.full_name COLLATE NOCASE`, sid);
      return { title: 'Customer list', summary: [`${rows.length} customers`], columns: [{ key: 'customer_no', label: 'No.' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'email', label: 'Email' }, { key: 'type', label: 'Type' }, { key: 'city', label: 'City' }, num('Purchases', 'orders'), money('Total spent', 'spent'), money('Owing', 'balance'), { key: 'status', label: 'Status' }, { key: 'joined', label: 'Saved on', type: 'date' }], rows };
    }
    case 'customers.debtors': {
      const rows = await all(env, `SELECT c.customer_no, c.full_name AS name, c.phone, SUM(s.balance) AS owed, COUNT(*) AS open_sales, MIN(s.created_at) AS oldest, MIN(s.due_date) AS due
          FROM shp_sales s JOIN shp_customers c ON c.id = s.customer_id WHERE s.shop_id = ? AND s.status = 'completed' AND s.balance > 0.004 GROUP BY c.id ORDER BY owed DESC`, sid);
      const total = rows.reduce((s, r) => s + r.owed, 0);
      return { title: 'Customers who owe money', summary: [`${rows.length} customers`, `Total owed ${round2(total).toLocaleString('en-US')} ${ctx.shop.currency}`], columns: [{ key: 'customer_no', label: 'No.' }, { key: 'name', label: 'Customer' }, { key: 'phone', label: 'Phone' }, money('Owes', 'owed'), num('Unpaid sales', 'open_sales'), { key: 'oldest', label: 'Oldest unpaid', type: 'date' }, { key: 'due', label: 'Pay by', type: 'date' }], rows };
    }
    case 'customers.new': {
      const rows = await all(env, `SELECT customer_no, full_name AS name, phone, customer_type AS type, city, created_at AS joined FROM shp_customers
          WHERE shop_id = ? AND ${localDate('created_at', off)} BETWEEN ? AND ? ORDER BY id DESC`, sid, from, to);
      return { title: `New customers (${range})`, summary: [`${rows.length} customers saved`], columns: [{ key: 'customer_no', label: 'No.' }, { key: 'name', label: 'Name' }, { key: 'phone', label: 'Phone' }, { key: 'type', label: 'Type' }, { key: 'city', label: 'City' }, { key: 'joined', label: 'Saved on', type: 'date' }], rows };
    }
    case 'inventory.stock': {
      const cat = q.category_id ? Number(q.category_id) : 0;
      const rows = await all(env, `SELECT p.name AS product, COALESCE(c.name, '—') AS category, p.unit, p.stock_qty AS qty, p.reorder_level AS reorder, p.cost_price AS cost, p.sell_price AS price,
          CASE WHEN p.stock_qty > 0 THEN p.stock_qty * p.cost_price ELSE 0 END AS cost_value, CASE WHEN p.stock_qty > 0 THEN p.stock_qty * p.sell_price ELSE 0 END AS retail_value,
          CASE WHEN p.track_stock = 0 THEN 'Service' WHEN p.stock_qty <= 0 THEN 'Out of stock' WHEN p.stock_qty <= p.reorder_level THEN 'Low' ELSE 'OK' END AS state
          FROM shp_products p LEFT JOIN shp_categories c ON c.id = p.category_id WHERE p.shop_id = ? AND p.status = 'active' AND p.track_stock = 1 ${cat ? 'AND p.category_id = ?' : ''} ORDER BY p.name COLLATE NOCASE`, sid, ...(cat ? [cat] : []));
      const cv = rows.reduce((s, r) => s + r.cost_value, 0); const rv = rows.reduce((s, r) => s + r.retail_value, 0);
      return { title: 'Stock levels & value', summary: [`${rows.length} products`, ...(profit ? [`Stock cost ${round2(cv).toLocaleString('en-US')} ${ctx.shop.currency}`] : []), `Retail value ${round2(rv).toLocaleString('en-US')} ${ctx.shop.currency}`],
        columns: [{ key: 'product', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'unit', label: 'Unit' }, num('In stock', 'qty'), num('Low level', 'reorder'), ...(profit ? [money('Cost price', 'cost'), money('Cost value', 'cost_value')] : []), money('Selling price', 'price'), money('Retail value', 'retail_value'), { key: 'state', label: 'State' }],
        rows: rows.map((r) => { if (!profit) { delete r.cost; delete r.cost_value; } return r; }) };
    }
    case 'inventory.low': {
      const rows = await all(env, `SELECT p.name AS product, COALESCE(c.name, '—') AS category, p.unit, p.stock_qty AS qty, p.reorder_level AS reorder,
          CASE WHEN p.stock_qty <= 0 THEN 'Out of stock' ELSE 'Low' END AS state FROM shp_products p LEFT JOIN shp_categories c ON c.id = p.category_id
          WHERE p.shop_id = ? AND p.status = 'active' AND p.track_stock = 1 AND p.stock_qty <= p.reorder_level ORDER BY p.stock_qty ASC, p.name`, sid);
      return { title: 'Low & out of stock', summary: [`${rows.length} products need restocking`], columns: [{ key: 'product', label: 'Product' }, { key: 'category', label: 'Category' }, { key: 'unit', label: 'Unit' }, num('In stock', 'qty'), num('Low level', 'reorder'), { key: 'state', label: 'State' }], rows };
    }
    case 'inventory.movements': {
      const rows = await all(env, `SELECT m.created_at AS date, p.name AS product, m.type, m.qty_change AS change, m.balance_after AS balance, COALESCE(u.name, '') AS staff, COALESCE(m.note, '') AS note
          FROM shp_stock_moves m JOIN shp_products p ON p.id = m.product_id LEFT JOIN users u ON u.id = m.user_id
          WHERE m.shop_id = ? AND ${localDate('m.created_at', off)} BETWEEN ? AND ? ORDER BY m.id DESC LIMIT 2000`, sid, from, to);
      return { title: `Stock movements (${range})`, summary: [`${rows.length} movements`], columns: [{ key: 'date', label: 'Date', type: 'datetime' }, { key: 'product', label: 'Product' }, { key: 'type', label: 'Type' }, num('Change', 'change'), num('Balance', 'balance'), { key: 'staff', label: 'By' }, { key: 'note', label: 'Note' }], rows };
    }
    case 'finance.profit': {
      const s = await one(env, `SELECT COALESCE(SUM(s.subtotal), 0) AS gross, COALESCE(SUM(s.discount), 0) AS discount, COALESCE(SUM(s.tax), 0) AS tax, COALESCE(SUM(s.cost_total), 0) AS cost, COUNT(*) AS n
          FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ?`, sid, from, to);
      const e = await one(env, `SELECT COALESCE(SUM(amount), 0) AS n FROM shp_expenses WHERE shop_id = ? AND expense_date BETWEEN ? AND ?`, sid, from, to);
      const net = round2(s.gross - s.discount); const gp = round2(net - s.cost); const np = round2(gp - e.n);
      const rows = [
        { line: 'Gross sales', amount: round2(s.gross), note: `${s.n} receipts` },
        { line: 'Less: discounts given', amount: -round2(s.discount), note: '' },
        { line: 'Net sales', amount: net, note: 'Before VAT' },
        { line: 'Less: cost of goods sold', amount: -round2(s.cost), note: 'What the items cost you' },
        { line: 'Gross profit', amount: gp, note: net > 0 ? `${round2(gp / net * 100)}% margin` : '' },
        { line: 'Less: expenses', amount: -round2(e.n), note: 'Rent, transport, salaries…' },
        { line: 'Net profit', amount: np, note: np < 0 ? 'A loss for this period' : '' },
        { line: 'VAT collected (not income)', amount: round2(s.tax), note: 'Owed to the tax authority' },
      ];
      return { title: `Profit & loss (${range})`, summary: [`Net profit ${np.toLocaleString('en-US')} ${ctx.shop.currency}`], columns: [{ key: 'line', label: 'Item' }, money('Amount', 'amount'), { key: 'note', label: 'Note' }], rows };
    }
    case 'finance.payments': {
      const method = q.method ? String(q.method) : '';
      const rows = await all(env, `SELECT p.created_at AS date, s.receipt_no, s.customer_name AS customer, p.method, p.amount, COALESCE(p.reference, '') AS reference, COALESCE(u.name, '') AS staff
          FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id LEFT JOIN users u ON u.id = p.received_by
          WHERE p.shop_id = ? AND s.status = 'completed' AND ${localDate('p.created_at', off)} BETWEEN ? AND ? ${method ? 'AND p.method = ?' : ''} ORDER BY p.id DESC`, sid, from, to, ...(method ? [method] : []));
      const total = rows.reduce((a, r) => a + r.amount, 0);
      const byM = {}; rows.forEach((r) => { byM[r.method] = (byM[r.method] || 0) + r.amount; });
      return { title: `Money received (${range})`, summary: [`Total ${round2(total).toLocaleString('en-US')} ${ctx.shop.currency}`, ...Object.entries(byM).map(([m, v]) => `${m}: ${round2(v).toLocaleString('en-US')}`)],
        columns: [{ key: 'date', label: 'Date', type: 'datetime' }, { key: 'receipt_no', label: 'Receipt' }, { key: 'customer', label: 'Customer' }, { key: 'method', label: 'Method' }, money('Amount', 'amount'), { key: 'reference', label: 'Reference' }, { key: 'staff', label: 'Received by' }], rows };
    }
    case 'finance.expenses': {
      const rows = await all(env, `SELECT expense_date AS date, category, COALESCE(description, '') AS description, COALESCE(method, '') AS method, amount FROM shp_expenses
          WHERE shop_id = ? AND expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, id DESC`, sid, from, to);
      const total = rows.reduce((a, r) => a + r.amount, 0);
      return { title: `Expenses (${range})`, summary: [`${rows.length} expenses`, `Total ${round2(total).toLocaleString('en-US')} ${ctx.shop.currency}`], columns: [{ key: 'date', label: 'Date', type: 'date' }, { key: 'category', label: 'Category' }, { key: 'description', label: 'Description' }, { key: 'method', label: 'Paid with' }, money('Amount', 'amount')], rows };
    }
    default: fail(404, 'Unknown report.');
  }
}

export const runReport = secure({ perm: 'reports.view' }, async ({ request, env, params, url, ctx }) => {
  const q = Object.fromEntries(url.searchParams.entries());
  const report = await buildReport(env, ctx, params.key, q);
  await audit(env, request, ctx, 'report.run', 'report', null, params.key);
  return json({ report: { ...report, shop: ctx.shop.name, currency: ctx.shop.currency, generated_at: new Date().toISOString(), key: params.key } });
});
