import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, logAudit } from '../../lib/stationery-auth.js';

const TYPES = ['TRA', 'BRELA', 'NIDA', 'Passport', 'Visa', 'TIN'];

// Default requirement checklist per service type — a starting point only.
// This never touches any government system directly; it just tracks the
// customer's paperwork and progress for the shop operator.
export async function getTemplates({ env }) {
  const { results } = await env.DB.prepare('SELECT * FROM stn_service_templates').all();
  const templates = {};
  for (const row of results) templates[row.service_type] = JSON.parse(row.checklist);
  return json({ types: TYPES, templates });
}

export async function listRequests({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const status = url.searchParams.get('status');

  const clauses = ['o.business_id = ?'];
  const binds = [ctx.business.id];
  if (status) { clauses.push('o.status = ?'); binds.push(status); }

  const { results } = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
     FROM stn_online_services o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE ${clauses.join(' AND ')} ORDER BY o.created_at DESC`
  ).bind(...binds).all();

  return json({ requests: results.map((r) => ({ ...r, checklist: JSON.parse(r.checklist) })) });
}

export async function createRequest({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const body = await request.json().catch(() => null);
  const serviceType = body?.service_type;
  if (!TYPES.includes(serviceType)) return badRequest(`service_type must be one of: ${TYPES.join(', ')}`);

  let customerId = body.customer_id || null;
  if (!customerId && body.customer_name) {
    const created = await env.DB.prepare('INSERT INTO stn_customers (business_id, name, phone) VALUES (?, ?, ?)')
      .bind(ctx.business.id, body.customer_name.trim(), body.customer_phone || null).run();
    customerId = created.meta.last_row_id;
  }

  let checklist = body.checklist;
  if (!Array.isArray(checklist)) {
    const template = await env.DB.prepare('SELECT checklist FROM stn_service_templates WHERE service_type = ?').bind(serviceType).first();
    const items = template ? JSON.parse(template.checklist) : [];
    checklist = items.map((label) => ({ label, done: false }));
  }

  const result = await env.DB.prepare(
    `INSERT INTO stn_online_services (business_id, customer_id, service_type, checklist, fee, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, customerId, serviceType, JSON.stringify(checklist), Number(body.fee) || 0, body.notes || null, ctx.user.id).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'onlineservice.created', serviceType);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function updateRequest({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const reqRow = await env.DB.prepare('SELECT * FROM stn_online_services WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!reqRow) return notFound();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body.');

  const checklist = Array.isArray(body.checklist) ? body.checklist : JSON.parse(reqRow.checklist);
  const status = body.status || reqRow.status;

  await env.DB.prepare(
    `UPDATE stn_online_services SET checklist = ?, status = ?, notes = COALESCE(?, notes), fee = COALESCE(?, fee), updated_at = datetime('now')
     WHERE id = ?`
  ).bind(JSON.stringify(checklist), status, body.notes || null, body.fee !== undefined ? Number(body.fee) : null, reqRow.id).run();

  return json({ ok: true });
}
