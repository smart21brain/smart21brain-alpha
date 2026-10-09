import { getSessionUser, json, badRequest, unauthorized, notFound } from '../../../_lib/auth.js';

export async function onRequestPost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const quiz = await env.DB.prepare('SELECT questions FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!quiz) return notFound();

  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.answers)) return badRequest('answers[] is required.');

  const questions = JSON.parse(quiz.questions);
  let score = 0;
  questions.forEach((q, i) => {
    if (body.answers[i] === q.correct_index) score++;
  });

  await env.DB.prepare(
    'INSERT INTO quiz_attempts (user_id, quiz_id, score, total) VALUES (?, ?, ?, ?)'
  ).bind(user.id, params.id, score, questions.length).run();

  return json({ score, total: questions.length }, { status: 201 });
}
