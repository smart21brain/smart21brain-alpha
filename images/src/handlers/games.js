import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound, slugify } from '../lib/auth.js';

export async function listGames({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM games WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ games: results });
}

export async function createGame({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest('Title is required.');

  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO games (title, slug, subject, description, emoji, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, slug, body.subject || null, body.description || null,
    body.emoji || '🎮', body.published === false ? 0 : 1, user.id
  ).run();

  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}

export async function getGame({ params, env }) {
  const game = await env.DB.prepare('SELECT * FROM games WHERE id = ?').bind(params.id).first();
  if (!game) return notFound();
  return json({ game });
}

export async function updateGame({ request, params, env }) {
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

export async function deleteGame({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM games WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

export async function submitGameScore({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isFinite(score)) return badRequest('A numeric score is required.');

  await env.DB.prepare(
    'INSERT INTO game_scores (user_id, game_id, score) VALUES (?, ?, ?)'
  ).bind(user.id, params.id, score).run();

  return json({ ok: true }, { status: 201 });
}
