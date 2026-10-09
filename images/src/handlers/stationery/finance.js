import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit } from '../../lib/stationery-auth.js';

export async function listExpenses({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const from = url.searchParams.get('from');
  const to = url.searchParams.get('to');

  const clauses = ['business_id = ?'];
  const binds = [ctx.business.id];
  if (from) { clauses.push('date(created_at) >= date(?)'); binds.push(from); }
  if (to) { clauses.push('date(created_at) <= date(?)'); binds.push(to); }

  const { results } = await env.DB.prepare(
    `SELECT e.*, u.name AS created_by_name FROM stn_expenses e LEFT JOIN users u ON u.id = e.created_by
     WHERE ${clauses.join(' AND ')} ORDER BY e.created_at DESC LIMIT 300`
  ).bind(...binds).all();
  return json({ expenses: results });
}

export async function createExpense({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_finance');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return badRequest('A positive amount is required.');

  const result = await env.DB.prepare(
    `INSERT INTO stn_expenses (business_id, branch_id, category, description, amount, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, ctx.branchId, body.category || 'General', body.description || null, amount, ctx.user.id).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'expense.created', `${body.category || 'General'}: ${amount}`);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function deleteExpense({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_finance');
  if (denied) return denied;

  const expense = await env.DB.prepare('SELECT id FROM stn_expenses WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!expense) return notFound();

  await env.DB.prepare('DELETE FROM stn_expenses WHERE id = ?').bind(expense.id).run();
  return json({ ok: true });
}

// Cashbook: chronological ledger of money in (payments) and money out (expenses).
export async function cashbook({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const from = url.searchParams.get('from') || '1970-01-01';
  const to = url.searchParams.get('to') || '2999-12-31';

  const { results: incoming } = await env.DB.prepare(
    `SELECT p.id, p.created_at, p.amount, p.method, o.order_no, c.name AS customer_name
     FROM stn_payments p JOIN stn_orders o ON o.id = p.order_id LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE p.business_id = ? AND date(p.created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).all();

  const { results: outgoing } = await env.DB.prepare(
    `SELECT id, created_at, amount, category, description FROM stn_expenses
     WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).all();

  const entries = [
    ...incoming.map((p) => ({ type: 'in', date: p.created_at, amount: p.amount, label: `${p.order_no} — ${p.customer_name || 'Walk-in'} (${p.method})` })),
    ...outgoing.map((e) => ({ type: 'out', date: e.created_at, amount: e.amount, label: `${e.category}${e.description ? ': ' + e.description : ''}` })),
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  const totalIn = incoming.reduce((s, p) => s + p.amount, 0);
  const totalOut = outgoing.reduce((s, e) => s + e.amount, 0);

  return json({ entries, totalIn, totalOut, balance: totalIn - totalOut });
}

// Outstanding customer debts (credit sales / partial payments).
export async function debts({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results } = await env.DB.prepare(
    `SELECT o.id, o.order_no, o.total_amount, o.paid_amount, (o.total_amount - o.paid_amount) AS balance,
            c.name AS customer_name, c.phone AS customer_phone, o.created_at
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.business_id = ? AND o.payment_status IN ('Unpaid','Partial') AND o.status != 'Cancelled'
     ORDER BY o.created_at DESC`
  ).bind(ctx.business.id).all();

  const totalOwed = results.reduce((s, r) => s + r.balance, 0);
  return json({ debts: results, totalOwed });
}

export async function summary({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const from = url.searchParams.get('from') || '1970-01-01';
  const to = url.searchParams.get('to') || '2999-12-31';

  const income = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_payments WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).first();

  const expenseTotal = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_expenses WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).first();

  const orderCount = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM stn_orders WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?) AND status != 'Cancelled'`
  ).bind(ctx.business.id, from, to).first();

  return json({
    income: income.total,
    expenses: expenseTotal.total,
    profit: income.total - expenseTotal.total,
    orders: orderCount.count,
  });
}
