import { getSessionUser, json, unauthorized, forbidden, notFound } from '../../_lib/auth.js';

export async function onRequestGet({ params, env }) {
  const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(params.id).first();
  if (!game) return notFound();
  return json({ game });
}

export async function onRequestPut({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE games SET title = ?, subject = ?, description = ?, emoji = ?, published = ? WHERE id = ?`
  ).bind(
    body.title, body.subject || null, body.description || null,
    body.emoji || '🎮', body.published === false ? 0 : 1, params.id
  ).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM games WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
