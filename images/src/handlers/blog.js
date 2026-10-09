import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound, slugify } from '../lib/auth.js';

export async function listPosts({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, slug, excerpt, cover_key, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ posts: results });
}

export async function createPost({ request, env }) {
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

export async function getPost({ params, env }) {
  const post = await env.DB.prepare('SELECT * FROM blog_posts WHERE slug = ?').bind(params.slug).first();
  if (!post) return notFound();
  return json({ post });
}

export async function updatePost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE blog_posts SET title = ?, excerpt = ?, content = ?, cover_key = ?, published = ? WHERE slug = ?`
  ).bind(
    body.title, body.excerpt || null, body.content, body.cover_key || null,
    body.published === false ? 0 : 1, params.slug
  ).run();
  return json({ ok: true });
}

export async function deletePost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM blog_posts WHERE slug = ?').bind(params.slug).run();
  return json({ ok: true });
}
