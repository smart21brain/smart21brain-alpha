import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';
import { syncCoursesForQuiz } from '../lib/course-engine.js';

export async function listQuizzes({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, subject, description, published, created_at FROM quizzes WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ quizzes: results });
}

export async function createQuiz({ request, env }) {
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

export async function getQuiz({ params, env }) {
  const quiz = await env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!quiz) return notFound();
  quiz.questions = JSON.parse(quiz.questions);
  return json({ quiz });
}

export async function updateQuiz({ request, params, env }) {
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

export async function deleteQuiz({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM quizzes WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

export async function submitQuizAttempt({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const quiz = await env.DB.prepare('SELECT questions FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!quiz) return notFound();

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.answers)) return badRequest('answers[] is required.');

  const questions = JSON.parse(quiz.questions);
  let score = 0;
  questions.forEach((q, i) => { if (body.answers[i] === q.correct_index) score++; });

  await env.DB.prepare(
    'INSERT INTO quiz_attempts (user_id, quiz_id, score, total) VALUES (?, ?, ?, ?)'
  ).bind(user.id, params.id, score, questions.length).run();

  // PHASE 8: this quiz might be a module quiz or a final exam for one or
  // more courses — if so, resync that course's completion/certificate
  // for this user. Any ordinary standalone site quiz just gets [] here.
  const courses = await syncCoursesForQuiz(env, user.id, Number(params.id));

  return json({ score, total: questions.length, courses }, { status: 201 });
}
