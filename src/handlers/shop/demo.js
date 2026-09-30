// Smart21Shop — one-click sample data (so a new owner can explore) and shop reset.
import { json } from '../../lib/auth.js';
import { fail, secure, readJson, audit, getSettings, chunk, round2, shopToday, offsetMin, addDays, formatReceiptNo } from '../../lib/shop-auth.js';

// Small deterministic random numbers, so sample data looks the same every time.
function rng(seed) {
  let a = seed >>> 0;
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// name, category, unit, cost, price, opening stock, low level, track
const PRODUCTS = [
  ['Rice (1 kg)', 'Food & Drinks', 'kg', 2300, 2800, 180, 30], ['Sugar (1 kg)', 'Food & Drinks', 'kg', 2600, 3200, 140, 25],
  ['Cooking oil (1 L)', 'Food & Drinks', 'litre', 5200, 6000, 90, 20], ['Wheat flour (2 kg)', 'Food & Drinks', 'pcs', 4400, 5200, 70, 15],
  ['Bottled water (500 ml)', 'Food & Drinks', 'bottle', 450, 800, 240, 48], ['Soda (350 ml)', 'Food & Drinks', 'bottle', 550, 1000, 200, 48],
  ['Bread (loaf)', 'Food & Drinks', 'pcs', 1800, 2300, 50, 12], ['Eggs (tray of 30)', 'Food & Drinks', 'pcs', 9500, 11500, 30, 6],
  ['Fresh milk (500 ml)', 'Food & Drinks', 'pcs', 1100, 1500, 60, 12], ['Tea leaves (250 g)', 'Food & Drinks', 'pack', 1500, 2000, 55, 10],
  ['Laundry soap (bar)', 'Household', 'pcs', 1400, 1900, 100, 20], ['Washing powder (1 kg)', 'Household', 'pack', 4200, 5000, 60, 12],
  ['Toothpaste', 'Household', 'pcs', 1700, 2400, 70, 15], ['Toilet paper (4 rolls)', 'Household', 'pack', 2800, 3600, 65, 12],
  ['Dish washing liquid', 'Household', 'bottle', 2400, 3200, 40, 8], ['Candles (pack of 6)', 'Household', 'pack', 1800, 2500, 45, 10],
  ['Phone charger', 'Electronics', 'pcs', 4500, 8000, 25, 5], ['Earphones', 'Electronics', 'pcs', 3500, 7000, 30, 6],
  ['USB flash drive 16 GB', 'Electronics', 'pcs', 9000, 14000, 20, 4], ['Torch (rechargeable)', 'Electronics', 'pcs', 7500, 12000, 14, 4],
  ['Batteries AA (4 pack)', 'Electronics', 'pack', 2200, 3500, 50, 10], ['Cotton T-shirt', 'Clothing', 'pcs', 6500, 12000, 36, 8],
  ['School socks (pair)', 'Clothing', 'pcs', 1200, 2500, 60, 12], ['Kitenge fabric (2 m)', 'Clothing', 'pcs', 12000, 20000, 18, 4],
  ['Exercise book', 'General', 'pcs', 700, 1200, 150, 30], ['Ball pen (blue)', 'General', 'pcs', 250, 500, 220, 40],
  ['Padlock', 'General', 'pcs', 3200, 5500, 22, 5], ['Phone airtime voucher', 'Services', 'service', 0, 0, 0, 0],
  ['Photocopy (per page)', 'Services', 'service', 0, 100, 0, 0], ['Delivery within town', 'Services', 'service', 0, 3000, 0, 0],
];
const CATEGORY_COLORS = { 'Food & Drinks': '#F59E0B', Household: '#10B981', Electronics: '#3B82F6', Clothing: '#EC4899', General: '#6366F1', Services: '#8B5CF6' };

const CUSTOMERS = [
  ['Amina Juma', 'female', 'retail', 'Kariakoo', 0], ['John Mushi', 'male', 'retail', 'Sinza', 0], ['Neema Mwakyusa', 'female', 'vip', 'Mikocheni', 500000],
  ['Hassan Ally', 'male', 'wholesale', 'Kariakoo', 2000000], ['Grace Kimaro', 'female', 'retail', 'Mbezi', 0], ['Baraka Lyimo', 'male', 'retail', 'Ubungo', 100000],
  ['Fatuma Said', 'female', 'retail', 'Temeke', 0], ['Peter Mollel', 'male', 'wholesale', 'Tegeta', 1500000], ['Rehema Mrema', 'female', 'vip', 'Msasani', 800000],
  ['Daudi Kessy', 'male', 'retail', 'Kinondoni', 0], ['Zawadi Komba', 'female', 'retail', 'Mwenge', 150000], ['Emmanuel Shayo', 'male', 'retail', 'Kimara', 0],
  ['Halima Bakari', 'female', 'retail', 'Magomeni', 0], ['Joseph Mwita', 'male', 'wholesale', 'Gongo la Mboto', 1000000], ['Upendo Massawe', 'female', 'retail', 'Mbagala', 0],
  ['Salum Omary', 'male', 'retail', 'Buguruni', 100000], ['Mariam Chuwa', 'female', 'vip', 'Oysterbay', 1000000], ['Frank Temba', 'male', 'retail', 'Ilala', 0],
  ['Joyce Ndunguru', 'female', 'retail', 'Ubungo', 0], ['Rashidi Mfaume', 'male', 'retail', 'Kigamboni', 0], ['Esther Kileo', 'female', 'retail', 'Sinza', 80000],
  ['Kelvin Msigwa', 'male', 'retail', 'Mikocheni', 0], ['Tumaini Lema', 'female', 'wholesale', 'Kariakoo', 1200000], ['Issa Mtemvu', 'male', 'retail', 'Tabata', 0],
];
const EXPENSES = [
  ['Rent', 'Monthly shop rent', 300000], ['Electricity & water', 'LUKU token and water bill', 85000], ['Transport', 'Stock delivery from Kariakoo', 40000],
  ['Salaries', 'Shop assistant wages', 250000], ['Marketing', 'Flyers and social media promotion', 25000], ['Repairs', 'Fix shelf and door lock', 30000],
  ['Transport', 'Fuel for deliveries', 35000], ['Other', 'Cleaning supplies', 12000], ['Electricity & water', 'Water bill', 18000], ['Marketing', 'Shop signboard repaint', 45000],
];

const pad = (n) => String(n).padStart(2, '0');

export const loadDemoData = secure({ perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const sid = ctx.shop.id; const off = offsetMin(ctx);
  const busy = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM shp_customers WHERE shop_id = ?1) + (SELECT COUNT(*) FROM shp_products WHERE shop_id = ?1) + (SELECT COUNT(*) FROM shp_sales WHERE shop_id = ?1) AS n`
  ).bind(sid).first();
  if (busy.n > 0) fail(409, 'Sample data can only be added to an empty shop. Use "Reset shop data" first if you want to start over.');

  const settings = await getSettings(env, sid);
  const rand = rng(21);
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const today = shopToday(off);

  // ---- categories
  await env.DB.batch(Object.entries(CATEGORY_COLORS).map(([n, c]) => env.DB.prepare('INSERT OR IGNORE INTO shp_categories (shop_id, name, color) VALUES (?, ?, ?)').bind(sid, n, c)));
  const { results: cats } = await env.DB.prepare('SELECT id, name FROM shp_categories WHERE shop_id = ?').bind(sid).all();
  const catId = new Map(cats.map((c) => [c.name, c.id]));

  // ---- ids (explicit, so sales can point at customers and products in the same batch)
  const base = await env.DB.prepare(
    `SELECT (SELECT COALESCE(MAX(id), 0) FROM shp_customers) AS c, (SELECT COALESCE(MAX(id), 0) FROM shp_products) AS p, (SELECT COALESCE(MAX(id), 0) FROM shp_sales) AS s`
  ).first();

  const products = PRODUCTS.map((p, i) => ({
    id: base.p + i + 1, name: p[0], cat: p[1], unit: p[2], cost: p[3], price: p[4], stock: Math.round(p[5] * 1.6), low: p[6], track: p[2] === 'service' ? 0 : 1, opening: Math.round(p[5] * 1.6),
  }));
  const customers = CUSTOMERS.map((c, i) => ({
    id: base.c + i + 1, seq: i + 1, name: c[0], gender: c[1], type: c[2], city: c[3], limit: c[4],
    phone: `+255 ${pick([71, 74, 75, 76, 65, 67, 68, 69])}${Math.floor(1000000 + rand() * 8999999)}`,
  }));

  // ---- sales over the last 30 days
  const sales = [];
  for (let n = 0; n < 150; n++) {
    const daysAgo = Math.floor(Math.pow(rand(), 1.15) * 30);
    const day = addDays(today, -daysAgo);
    const hh = 8 + Math.floor(rand() * 12); const mm = Math.floor(rand() * 60);
    // local time -> UTC string
    const localMs = Date.parse(`${day}T${pad(hh)}:${pad(mm)}:00Z`) - off * 60000;
    if (localMs > Date.now()) { n--; continue; }
    sales.push({ ms: localMs, day, customer: rand() < 0.62 ? pick(customers) : null });
  }
  sales.sort((a, b) => a.ms - b.ms);

  const saleRows = []; const itemRows = []; const payRows = []; const moveRows = [];
  const toSql = (ms) => new Date(ms).toISOString().slice(0, 19).replace('T', ' ');
  sales.forEach((s, idx) => {
    const id = base.s + idx + 1; const nLines = 1 + Math.floor(rand() * 4); const used = new Set(); let subtotal = 0; let cost = 0;
    for (let k = 0; k < nLines; k++) {
      const p = pick(products);
      if (used.has(p.id)) continue;
      let qty = p.unit === 'service' ? 1 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 4);
      if (p.name.startsWith('Photocopy')) qty = 5 + Math.floor(rand() * 30);
      let price = p.price;
      if (p.name.startsWith('Phone airtime')) { price = [1000, 2000, 5000, 10000][Math.floor(rand() * 4)]; qty = 1; }
      if (p.track && p.stock < qty) continue;
      used.add(p.id);
      const line = round2(qty * price);
      subtotal += line; cost += qty * p.cost;
      itemRows.push({ sale: id, p, qty, price, line });
      if (p.track) {
        p.stock = round2(p.stock - qty);
        moveRows.push({ product: p.id, change: -qty, balance: p.stock, sale: id, at: s.ms });
      }
    }
    if (!itemRows.some((r) => r.sale === id)) { // nothing fitted — sell one bottle of water
      const p = products[4]; itemRows.push({ sale: id, p, qty: 1, price: p.price, line: p.price }); subtotal += p.price; cost += p.cost;
      p.stock -= 1; moveRows.push({ product: p.id, change: -1, balance: p.stock, sale: id, at: s.ms });
    }
    const discount = rand() < 0.07 ? Math.round(subtotal * 0.05 / 100) * 100 : 0;
    const total = round2(subtotal - discount);
    let paid = total; const method = () => pick(['Cash', 'Cash', 'Cash', 'Mobile Money', 'Mobile Money', 'Bank']);
    const pays = [];
    if (s.customer && rand() < 0.36) {
      const r = rand();
      paid = r < 0.45 ? 0 : Math.round(total * (0.3 + rand() * 0.4) / 100) * 100;
      if (paid > 0) pays.push({ amount: paid, method: method(), at: s.ms });
      if (rand() < 0.4) { // paid off (partly) some days later
        const later = s.ms + (1 + Math.floor(rand() * 9)) * 86400000;
        if (later < Date.now()) { const extra = round2(Math.min(total - paid, Math.round((total - paid) * (0.5 + rand() * 0.5) / 100) * 100 || total - paid)); if (extra > 0) { pays.push({ amount: extra, method: method(), at: later }); paid = round2(paid + extra); } }
      }
    } else {
      pays.push({ amount: total, method: method(), at: s.ms });
    }
    const balance = Math.max(0, round2(total - paid));
    saleRows.push({ id, seq: idx + 1, ms: s.ms, customer: s.customer, subtotal: round2(subtotal), discount, total, paid, balance, cost: round2(cost), status: balance <= 0.004 ? 'paid' : paid > 0 ? 'partial' : 'unpaid', due: balance > 0 ? addDays(s.day, 14) : null });
    pays.forEach((p) => payRows.push({ sale: id, customer: s.customer, ...p }));
  });

  // a few stock adjustments so "low stock" and "out of stock" have something to show
  const tweak = (name, to, note, type) => {
    const p = products.find((x) => x.name.startsWith(name)); if (!p) return;
    const change = round2(to - p.stock); p.stock = to;
    moveRows.push({ product: p.id, change, balance: to, sale: null, at: Date.now(), note, type });
  };
  tweak('Cooking oil', 4, 'Stock count', 'adjust'); tweak('Earphones', 0, 'Damaged in storage', 'damage'); tweak('Eggs', 3, 'Stock count', 'adjust'); tweak('Bread', 5, 'Sold out this morning', 'adjust');

  // ---- write everything
  const stmts = [];
  products.forEach((p) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_products (id, shop_id, category_id, name, sku, unit, cost_price, sell_price, stock_qty, reorder_level, track_stock, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-31 days'))`).bind(p.id, sid, catId.get(p.cat) || null, p.name, `SKU-${String(p.id - base.p).padStart(3, '0')}`, p.unit, p.cost, p.price, p.stock, p.low, p.track)));
  products.filter((p) => p.track).forEach((p) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, user_id, created_at) VALUES (?, ?, 'opening', ?, ?, 'Opening stock', ?, datetime('now', '-31 days'))`).bind(sid, p.id, p.opening, p.opening, ctx.user.id)));
  customers.forEach((c) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_customers (id, shop_id, seq, customer_no, full_name, phone, city, customer_type, gender, credit_limit, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`).bind(c.id, sid, c.seq, `${settings.customer_prefix}-${String(c.seq).padStart(4, '0')}`, c.name, c.phone, c.city, c.type, c.gender, c.limit, ctx.user.id, `-${30 - (c.seq % 28)} days`)));
  saleRows.forEach((s) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_sales (id, shop_id, seq, receipt_no, customer_id, customer_name, customer_phone, subtotal, discount, tax, total, paid, balance, cost_total, payment_status, due_date, sold_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(s.id, sid, s.seq, formatReceiptNo(settings.receipt_prefix, s.seq), s.customer ? s.customer.id : null, s.customer ? s.customer.name : 'Walk-in customer',
    s.customer ? s.customer.phone : null, s.subtotal, s.discount, s.total, s.paid, s.balance, s.cost, s.status, s.due, ctx.user.id, toSql(s.ms))));
  itemRows.forEach((i) => stmts.push(env.DB.prepare('INSERT INTO shp_sale_items (shop_id, sale_id, product_id, name, unit, qty, unit_price, cost_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(sid, i.sale, i.p.id, i.p.name, i.p.unit, i.qty, i.price, i.p.cost, i.line)));
  payRows.forEach((p) => stmts.push(env.DB.prepare('INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, received_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(sid, p.sale, p.customer ? p.customer.id : null, p.amount, p.method, ctx.user.id, toSql(p.at))));
  moveRows.forEach((m) => stmts.push(env.DB.prepare('INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, sale_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(sid, m.product, m.type || 'sale', m.change, m.balance, m.note || null, m.sale, ctx.user.id, toSql(m.at))));
  EXPENSES.forEach((e, i) => stmts.push(env.DB.prepare('INSERT INTO shp_expenses (shop_id, category, description, amount, expense_date, method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(sid, e[0], e[1], e[2], addDays(today, -Math.floor(i * 2.8) - 1), i % 3 === 0 ? 'Bank' : 'Cash', ctx.user.id)));
  const notes = [[customers[3], 'Buys in bulk every Monday. Prefers delivery to the shop door.'], [customers[2], 'VIP — always give first choice of new stock.'], [customers[5], 'Pays balances at month end.']];
  notes.forEach(([c, t]) => stmts.push(env.DB.prepare('INSERT INTO shp_customer_notes (shop_id, customer_id, user_id, note) VALUES (?, ?, ?, ?)').bind(sid, c.id, ctx.user.id, t)));

  for (const part of chunk(stmts, 80)) await env.DB.batch(part);
  await audit(env, request, ctx, 'demo.load', 'shop', sid, `${customers.length} customers, ${products.length} products, ${saleRows.length} sales`);
  return json({ ok: true, customers: customers.length, products: products.length, sales: saleRows.length }, { status: 201 });
});

export const resetShopData = secure({ roles: ['owner'], perm: 'settings.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  if (String(b.confirm || '').trim().toUpperCase() !== 'RESET') fail(400, 'Type RESET to confirm.');
  const sid = ctx.shop.id;
  await env.DB.batch([
    env.DB.prepare('DELETE FROM shp_qr_codes WHERE shop_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM shp_sales WHERE shop_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM shp_stock_moves WHERE shop_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM shp_customer_notes WHERE shop_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM shp_customers WHERE shop_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM shp_products WHERE shop_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM shp_expenses WHERE shop_id = ?').bind(sid),
  ]);
  await audit(env, request, ctx, 'shop.reset', 'shop', sid, 'All customers, products, sales and expenses deleted');
  return json({ ok: true });
});
