import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound, isStaff, canEditOwned } from '../lib/auth.js';
import { syncCoursesForQuiz } from '../lib/course-engine.js';

// One place that decides what a valid quiz looks like (used when creating and when editing).
// Returns a plain-English problem, or null when everything is fine.
export function validateQuestions(questions) {
  if (!Array.isArray(questions) || questions.length === 0) return 'Add at least one question.';
  if (questions.length > 100) return 'A quiz can have at most 100 questions.';
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i]; const n = i + 1;
    if (!q || typeof q.prompt !== 'string' || !q.prompt.trim()) return `Question ${n} needs text.`;
    if (q.prompt.length > 500) return `Question ${n} is too long (500 characters at most).`;
    if (!Array.isArray(q.options) || q.options.length < 2) return `Question ${n} needs at least two answers.`;
    if (q.options.length > 8) return `Question ${n} has too many answers (8 at most).`;
    if (q.options.some((o) => typeof o !== 'string' || !o.trim())) return `Question ${n} has an empty answer.`;
    if (q.options.some((o) => o.length > 300)) return `Question ${n} has an answer that is too long (300 characters at most).`;
    if (!Number.isInteger(q.correct_index) || q.correct_index < 0 || q.correct_index >= q.options.length) return `Question ${n}: choose which answer is correct.`;
  }
  return null;
}

export async function listQuizzes({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT id, title, subject, description, published, created_at FROM quizzes WHERE published = 1 ORDER BY created_at DESC'
  ).all();
  return json({ quizzes: results });
}

export async function createQuiz({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!isStaff(user)) return forbidden('Admins or teachers only.');

  const body = await request.json().catch(() => null);
  if (!body || !String(body.title || '').trim()) return badRequest('Give the quiz a title.');
  const problem = validateQuestions(body.questions);
  if (problem) return badRequest(problem);

  const result = await env.DB.prepare(
    `INSERT INTO quizzes (title, subject, description, questions, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    String(body.title).trim(), body.subject || null, body.description || null,
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
  if (!isStaff(user)) return forbidden();

  const quiz = await env.DB.prepare('SELECT * FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!quiz) return notFound();
  if (!canEditOwned(user, quiz.created_by)) return forbidden('You can only change quizzes you created.');

  const body = await request.json().catch(() => ({}));
  if (body.title !== undefined && !String(body.title).trim()) return badRequest('The quiz title cannot be empty.');
  if (body.questions !== undefined) {
    const problem = validateQuestions(body.questions);
    if (problem) return badRequest(problem);
  }
  await env.DB.prepare(
    `UPDATE quizzes SET title = ?, subject = ?, description = ?, questions = ?, published = ? WHERE id = ?`
  ).bind(
    body.title != null ? String(body.title).trim() : quiz.title, body.subject ?? quiz.subject, body.description ?? quiz.description,
    body.questions !== undefined ? JSON.stringify(body.questions) : quiz.questions,
    body.published != null ? (body.published ? 1 : 0) : quiz.published, params.id
  ).run();
  return json({ ok: true });
}

export async function deleteQuiz({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!isStaff(user)) return forbidden();

  const quiz = await env.DB.prepare('SELECT created_by FROM quizzes WHERE id = ?').bind(params.id).first();
  if (!quiz) return notFound();
  if (!canEditOwned(user, quiz.created_by)) return forbidden('You can only delete quizzes you created.');

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
