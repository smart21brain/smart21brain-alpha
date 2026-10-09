import { getSessionUser, json, badRequest, unauthorized, forbidden } from '../../_lib/auth.js';

export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, subject, description, published, created_at FROM quizzes WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ quizzes: results });
}

export async function onRequestPost({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return badRequest('Title and at least one question are required.');
  }
  for (const q of body.questions) {
    if (!q.prompt || !Array.isArray(q.options) || typeof q.correct_index !== 'number') {
      return badRequest('Each question needs a prompt, options[], and correct_index.');
    }
  }

  const result = await env.DB.prepare(
    `INSERT INTO quizzes (title, subject, description, questions, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, body.subject || null, body.description || null,
    JSON.stringify(body.questions), body.published === false ? 0 : 1, user.id
  ).run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}
