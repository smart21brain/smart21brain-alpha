import { getSessionUser, json, badRequest, unauthorized, forbidden, slugify } from '../../_lib/auth.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM games WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ games: results });
}

export async function onRequestPost({ request, env }) {
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
