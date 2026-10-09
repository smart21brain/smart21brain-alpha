import { json, badRequest, notFound } from '../../lib/auth.js';
import { getStationeryContext } from '../../lib/stationery-auth.js';

export async function listCourses({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const { results: courses } = await env.DB.prepare('SELECT * FROM stn_courses ORDER BY category, title').all();
  const { results: progress } = await env.DB.prepare(
    'SELECT * FROM stn_course_progress WHERE user_id = ?'
  ).bind(ctx.user.id).all();

  const progressByCourse = Object.fromEntries(progress.map((p) => [p.course_id, {
    completed_modules: JSON.parse(p.completed_modules),
    quiz_scores: JSON.parse(p.quiz_scores),
    certificate_issued: !!p.certificate_issued,
  }]));

  return json({
    courses: courses.map((c) => ({ ...c, modules: JSON.parse(c.modules) })),
    progress: progressByCourse,
  });
}

export async function getCourse({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const course = await env.DB.prepare('SELECT * FROM stn_courses WHERE id = ?').bind(params.id).first();
  if (!course) return notFound();

  const progress = await env.DB.prepare(
    'SELECT * FROM stn_course_progress WHERE course_id = ? AND user_id = ?'
  ).bind(course.id, ctx.user.id).first();

  return json({
    course: { ...course, modules: JSON.parse(course.modules) },
    progress: progress ? {
      completed_modules: JSON.parse(progress.completed_modules),
      quiz_scores: JSON.parse(progress.quiz_scores),
      certificate_issued: !!progress.certificate_issued,
    } : { completed_modules: [], quiz_scores: {}, certificate_issued: false },
  });
}

// Mark a module's video/notes as viewed and/or record its quiz score.
export async function updateProgress({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;

  const course = await env.DB.prepare('SELECT * FROM stn_courses WHERE id = ?').bind(params.id).first();
  if (!course) return notFound();

  const body = await request.json().catch(() => null);
  const moduleIndex = Number(body?.module_index);
  const modules = JSON.parse(course.modules);
  if (!Number.isInteger(moduleIndex) || moduleIndex < 0 || moduleIndex >= modules.length) {
    return badRequest('A valid module_index is required.');
  }

  let progress = await env.DB.prepare(
    'SELECT * FROM stn_course_progress WHERE course_id = ? AND user_id = ?'
  ).bind(course.id, ctx.user.id).first();

  const completedModules = new Set(progress ? JSON.parse(progress.completed_modules) : []);
  const quizScores = progress ? JSON.parse(progress.quiz_scores) : {};

  if (body.completed) completedModules.add(moduleIndex);
  if (typeof body.quiz_score === 'number') quizScores[moduleIndex] = body.quiz_score;

  const certificateEligible = completedModules.size >= modules.length;

  if (progress) {
    await env.DB.prepare(
      `UPDATE stn_course_progress SET completed_modules = ?, quiz_scores = ?, certificate_issued = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify([...completedModules]), JSON.stringify(quizScores), certificateEligible ? 1 : 0, progress.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO stn_course_progress (course_id, user_id, completed_modules, quiz_scores, certificate_issued) VALUES (?, ?, ?, ?, ?)`
    ).bind(course.id, ctx.user.id, JSON.stringify([...completedModules]), JSON.stringify(quizScores), certificateEligible ? 1 : 0).run();
  }

  return json({ ok: true, certificate_issued: certificateEligible, completed_modules: [...completedModules] });
}
