import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';
import { canManageCourse } from './course-lessons.js';

// GET /api/courses/:id/modules — used by the admin/instructor curriculum
// editor. Public course viewing goes through GET /api/courses/:id
// instead, which nests modules with their lessons and progress.
export async function listModules({ params, env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
  ).bind(params.id).all();
  return json({ modules: results });
}

export async function createModule({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!(await canManageCourse(env, user, params.id))) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest('title is required.');

  const { count } = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM course_modules WHERE course_id = ?'
  ).bind(params.id).first();

  const result = await env.DB.prepare(
    `INSERT INTO course_modules (course_id, title, description, quiz_id, passing_score, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    params.id, body.title, body.description || null, body.quiz_id || null,
    Number.isFinite(body.passing_score) ? body.passing_score : 70,
    Number.isFinite(body.sort_order) ? body.sort_order : count + 1
  ).run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function updateModule({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const module_ = await env.DB.prepare('SELECT * FROM course_modules WHERE id = ?').bind(params.moduleId).first();
  if (!module_) return notFound();
  if (!(await canManageCourse(env, user, module_.course_id))) return forbidden();

  const body = await request.json().catch(() => ({}));

  await env.DB.prepare(
    `UPDATE course_modules SET title = ?, description = ?, quiz_id = ?, passing_score = ?, sort_order = ? WHERE id = ?`
  ).bind(
    body.title ?? module_.title,
    body.description ?? module_.description,
    body.quiz_id !== undefined ? body.quiz_id : module_.quiz_id,
    body.passing_score ?? module_.passing_score,
    body.sort_order ?? module_.sort_order,
    params.moduleId
  ).run();

  return json({ ok: true });
}

// DELETE /api/course-modules/:moduleId — lessons in the module aren't
// deleted, just ungrouped (module_id -> NULL), same as removing a
// folder without removing what was inside it.
export async function deleteModule({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const module_ = await env.DB.prepare('SELECT * FROM course_modules WHERE id = ?').bind(params.moduleId).first();
  if (!module_) return notFound();
  if (!(await canManageCourse(env, user, module_.course_id))) return forbidden();

  await env.DB.prepare('UPDATE course_lessons SET module_id = NULL WHERE module_id = ?').bind(params.moduleId).run();
  await env.DB.prepare('DELETE FROM course_modules WHERE id = ?').bind(params.moduleId).run();
  return json({ ok: true });
}
