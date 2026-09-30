import { getSessionUser, json, unauthorized, forbidden, notFound } from '../../_lib/auth.js';

export async function onRequestGet({ params, env }) {
  const quiz = await env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!quiz) return notFound();
  quiz.questions = JSON.parse(quiz.questions);
  return json({ quiz });
}

export async function onRequestPut({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE quizzes SET title = ?, subject = ?, description = ?, questions = ?, published = ? WHERE id = ?`
  ).bind(
    body.title, body.subject || null, body.description || null,
    JSON.stringify(body.questions || []), body.published === false ? 0 : 1, params.id
  ).run();

  return json({ ok: true });
}

export async function onRequestDelete({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM quizzes WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}
