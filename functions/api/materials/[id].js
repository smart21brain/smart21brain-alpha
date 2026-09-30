import { getSessionUser, unauthorized, forbidden, notFound, json } from '../../_lib/auth.js';

export async function onRequestGet({ params, env }) {
  const material = await env.DB.prepare('SELECT * FROM materials WHERE id = ?').bind(params.id).first();
  if (!material) return notFound();

  const object = await env.MATERIALS.get(material.file_key);
  if (!object) return notFound('File missing from storage.');

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Content-Disposition', `inline; filename="${material.title}"`);
  return new Response(object.body, { headers });
}

export async function onRequestDelete({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const material = await env.DB.prepare('SELECT * FROM materials WHERE id = ?').bind(params.id).first();
  if (!material) return notFound();

  await env.MATERIALS.delete(material.file_key);
  await env.DB.prepare('DELETE FROM materials WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
