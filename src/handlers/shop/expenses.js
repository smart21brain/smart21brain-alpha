// Smart21Shop — expenses (rent, transport, salaries…) used for profit reports.
import { json } from '../../lib/auth.js';
import { fail, secure, readJson, V, audit, getSettings, likeTerm, paging, round2, shopToday, offsetMin } from '../../lib/shop-auth.js';

export const listExpenses = secure({ perm: 'expenses.manage' }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id; const sp = url.searchParams;
  const { page, limit, offset } = sp.get('all') === '1' ? { page: 1, limit: 5000, offset: 0 } : paging(url, 20, 100);
  const where = ['shop_id = ?1']; const binds = [sid];
  const add = (sql, v) => { where.push(sql.replace('?', `?${binds.length + 1}`)); binds.push(v); };
  if (sp.get('from')) add('expense_date >= ?', V.date(sp.get('from'), 'From date'));
  if (sp.get('to')) add('expense_date <= ?', V.date(sp.get('to'), 'To date'));
  if (sp.get('category')) add('category = ?', sp.get('category'));
  const q = (sp.get('q') || '').trim();
  if (q) { const l = likeTerm(q); where.push(`(description LIKE ?${binds.length + 1} ESCAPE '\\' OR category LIKE ?${binds.length + 1} ESCAPE '\\')`); binds.push(l); }
  const base = `FROM shp_expenses WHERE ${where.join(' AND ')}`;
  const [{ results }, sum, byCat] = await Promise.all([
    env.DB.prepare(`SELECT e.*, (SELECT name FROM users WHERE id = e.created_by) AS user_name ${base.replace('FROM shp_expenses', 'FROM shp_expenses e')} ORDER BY expense_date DESC, id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total ${base}`).bind(...binds).first(),
    env.DB.prepare(`SELECT category, SUM(amount) AS total ${base} GROUP BY category ORDER BY total DESC`).bind(...binds).all(),
  ]);
  const settings = await getSettings(env, sid);
  return json({ expenses: results, total: sum.n, page, limit, summary: { count: sum.n, total: sum.total, by_category: byCat.results }, categories: settings.expense_categories });
});

export const createExpense = secure({ perm: 'expenses.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const settings = await getSettings(env, ctx.shop.id);
  const method = V.str(b.method, 'Payment method', { max: 40 });
  if (method && !settings.payment_methods.includes(method)) fail(400, 'Please choose one of the shop\'s payment methods.');
  const date = V.date(b.expense_date, 'Date') || shopToday(offsetMin(ctx));
  const r = await env.DB.prepare('INSERT INTO shp_expenses (shop_id, category, description, amount, expense_date, method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)')
    .bind(ctx.shop.id, V.str(b.category, 'Category', { required: true, max: 60 }), V.str(b.description, 'Description', { max: 300 }),
      round2(V.num(b.amount, 'Amount', { required: true, min: 0.01, max: 1e12 })), date, method, ctx.user.id).run();
  await audit(env, request, ctx, 'expense.create', 'expense', r.meta.last_row_id, `${b.category}: ${b.amount}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const deleteExpense = secure({ perm: 'expenses.manage' }, async ({ request, env, params, ctx }) => {
  const e = await env.DB.prepare('SELECT * FROM shp_expenses WHERE id = ? AND shop_id = ?').bind(params.id, ctx.shop.id).first();
  if (!e) fail(404, 'Expense not found.');
  await env.DB.prepare('DELETE FROM shp_expenses WHERE id = ?').bind(e.id).run();
  await audit(env, request, ctx, 'expense.delete', 'expense', e.id, `${e.category}: ${e.amount}`);
  return json({ ok: true });
});
