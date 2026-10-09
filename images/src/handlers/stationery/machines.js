import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit } from '../../lib/stationery-auth.js';

export async function listMachines({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_machines WHERE business_id IS NULL OR business_id = ? ORDER BY category, name`
  ).bind(ctx.business.id).all();

  return json({ machines: results.map((m) => ({ ...m, content: JSON.parse(m.content) })) });
}

// Owner/Manager can add a shop-specific machine (e.g. a custom printer
// model) with its own notes, layered on top of the shared library.
export async function createMachine({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_business');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const name = String(body?.name || '').trim();
  if (!name) return badRequest('Machine name is required.');

  const content = {
    parts: body.content?.parts || [],
    setup: body.content?.setup || [],
    operation: body.content?.operation || [],
    maintenance: body.content?.maintenance || [],
    troubleshooting: body.content?.troubleshooting || [],
    error_codes: body.content?.error_codes || {},
    safety: body.content?.safety || [],
  };

  const result = await env.DB.prepare(
    `INSERT INTO stn_machines (business_id, name, category, content) VALUES (?, ?, ?, ?)`
  ).bind(ctx.business.id, name, body.category || 'Printer', JSON.stringify(content)).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'machine.created', name);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function deleteMachine({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_business');
  if (denied) return denied;

  const machine = await env.DB.prepare('SELECT id FROM stn_machines WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!machine) return notFound('Only shop-specific machines can be removed here.');

  await env.DB.prepare('DELETE FROM stn_machines WHERE id = ?').bind(machine.id).run();
  return json({ ok: true });
}
