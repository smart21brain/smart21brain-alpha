import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext, requirePermission, logAudit } from '../../lib/stationery-auth.js';

// Global presets (business_id IS NULL) + this business's custom presets.
export async function listPresets({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_photo_presets WHERE business_id IS NULL OR business_id = ? ORDER BY country, name`
  ).bind(ctx.business.id).all();
  return json({ presets: results });
}

export async function createPreset({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_pricing');
  if (denied) return denied;

  const body = await request.json().catch(() => null);
  const { country, name, width_mm, height_mm } = body || {};
  if (!country || !name || !Number(width_mm) || !Number(height_mm)) {
    return badRequest('country, name, width_mm and height_mm are required.');
  }

  const result = await env.DB.prepare(
    `INSERT INTO stn_photo_presets (business_id, country, name, width_mm, height_mm, dpi, face_min_pct, face_max_pct, bg_color, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    ctx.business.id, country, name, Number(width_mm), Number(height_mm),
    Number(body.dpi) || 300, Number(body.face_min_pct) || 50, Number(body.face_max_pct) || 69,
    body.bg_color || '#FFFFFF', body.notes || null
  ).run();

  await logAudit(env, ctx.business.id, ctx.user.id, 'preset.created', `${country} ${name}`);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function deletePreset({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, 'manage_pricing');
  if (denied) return denied;

  const preset = await env.DB.prepare('SELECT id FROM stn_photo_presets WHERE id = ? AND business_id = ?')
    .bind(params.id, ctx.business.id).first();
  if (!preset) return notFound('Preset not found, or it is a global preset that cannot be deleted here.');

  await env.DB.prepare('DELETE FROM stn_photo_presets WHERE id = ?').bind(preset.id).run();
  return json({ ok: true });
}
