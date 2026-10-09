import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, logAudit } from '../../lib/stationery-auth.js';

export async function listCustomers({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const q = (url.searchParams.get('q') || '').trim();
  let stmt, binds;
  if (q) {
    stmt = `SELECT * FROM stn_customers WHERE business_id = ? AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY created_at DESC LIMIT 200`;
    binds = [ctx.business.id, `%${q}%`, `%${q}%`, `%${q}%`];
  } else {
    stmt = `SELECT * FROM stn_customers WHERE business_id = ? ORDER BY created_at DESC LIMIT 200`;
    binds = [ctx.business.id];
  }
  const { results } = await env.DB.prepare(stmt).bind(...binds).all();
  return json({ customers: results });
}

export async function createCustomer({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  if (!name) return badRequest('Customer name is required.');

  const result = await env.DB.prepare(
    `INSERT INTO stn_customers (business_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, name, body.phone || null, body.email || null, body.notes || null).run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function getCustomer({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const customer = await env.DB.prepare('SELECT * FROM stn_customers WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!customer) return notFound();

  const { results: orders } = await env.DB.prepare(
    `SELECT id, order_no, status, payment_status, total_amount, paid_amount, created_at
     FROM stn_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(customer.id).all();

  return json({ customer, orders });
}

export async function updateCustomer({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body.');

  const customer = await env.DB.prepare('SELECT id FROM stn_customers WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!customer) return notFound();

  await env.DB.prepare(
    `UPDATE stn_customers SET name = COALESCE(?, name), phone = COALESCE(?, phone),
      email = COALESCE(?, email), notes = COALESCE(?, notes) WHERE id = ?`
  ).bind(body.name || null, body.phone || null, body.email || null, body.notes || null, customer.id).run();

  return json({ ok: true });
}

export async function deleteCustomer({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const customer = await env.DB.prepare('SELECT id FROM stn_customers WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!customer) return notFound();

  await env.DB.prepare('DELETE FROM stn_customers WHERE id = ?').bind(customer.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, 'customer.deleted', `#${customer.id}`);
  return json({ ok: true });
}
