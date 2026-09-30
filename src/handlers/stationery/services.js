import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit } from '../../lib/stationery-auth.js';

export async function listServices({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const activeOnly = url.searchParams.get('active') !== '0';

  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_services WHERE business_id = ? ${activeOnly ? 'AND active = 1' : ''} ORDER BY category, name`
  ).bind(ctx.business.id).all();
  return json({ services: results });
}

export async function createService({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_pricing');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  const unit_price = Number(body?.unit_price);
  if (!name || !Number.isFinite(unit_price) || unit_price < 0) {
    return badRequest('name and a non-negative unit_price are required.');
  }

  const result = await env.DB.prepare(
    `INSERT INTO stn_services (business_id, name, category, unit, unit_price, cost_price, inventory_item_id, deduct_qty, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    ctx.business.id, name, body.category || 'Printing', body.unit || 'unit', unit_price,
    Number(body.cost_price) || 0, body.inventory_item_id || null, Number(body.deduct_qty) || 0
  ).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'service.created', name);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function updateService({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_pricing');
  if (denied) return denied;

  const service = await env.DB.prepare('SELECT id FROM stn_services WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!service) return notFound();

  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid JSON body.');

  await env.DB.prepare(
    `UPDATE stn_services SET
      name = COALESCE(?, name), category = COALESCE(?, category), unit = COALESCE(?, unit),
      unit_price = COALESCE(?, unit_price), cost_price = COALESCE(?, cost_price),
      inventory_item_id = ?, deduct_qty = COALESCE(?, deduct_qty),
      active = COALESCE(?, active)
     WHERE id = ?`
  ).bind(
    body.name || null, body.category || null, body.unit || null,
    body.unit_price !== undefined ? Number(body.unit_price) : null,
    body.cost_price !== undefined ? Number(body.cost_price) : null,
    body.inventory_item_id !== undefined ? body.inventory_item_id : service.inventory_item_id,
    body.deduct_qty !== undefined ? Number(body.deduct_qty) : null,
    typeof body.active === 'boolean' ? (body.active ? 1 : 0) : null,
    service.id
  ).run();

  return json({ ok: true });
}

export async function deleteService({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_pricing');
  if (denied) return denied;

  const service = await env.DB.prepare('SELECT id FROM stn_services WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!service) return notFound();

  await env.DB.prepare('UPDATE stn_services SET active = 0 WHERE id = ?').bind(service.id).run();
  return json({ ok: true });
}
