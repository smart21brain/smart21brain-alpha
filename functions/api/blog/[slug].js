import { getSessionUser, json, unauthorized, forbidden, notFound } from '../../_lib/auth.js';

export async function onRequestGet({ params, env }) {
  const post = await env.DB.prepare('SELECT * FROM blog_posts WHERE slug = ?').bind(params.slug).first();
  if (!post) return notFound();
  return json({ post });
}

export async function onRequestPut({ request, params, env }) {
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

export async function onRequestDelete({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM blog_posts WHERE slug = ?').bind(params.slug).run();
  return json({ ok: true });
}
