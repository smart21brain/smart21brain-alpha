import { getSessionUser, json, badRequest, unauthorized, forbidden, slugify } from '../../_lib/auth.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, slug, excerpt, cover_key, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ posts: results });
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.content) return badRequest('Title and content are required.');

  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO blog_posts (title, slug, excerpt, content, cover_key, published, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, slug, body.excerpt || null, body.content,
    body.cover_key || null, body.published === false ? 0 : 1, user.id
  ).run();

  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
