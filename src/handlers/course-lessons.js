import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';
import { syncCourseCompletion } from '../lib/course-engine.js';

export async function canManageCourse(env, user, courseId) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  if (user.role !== 'teacher') return false;
  const course = await env.DB.prepare('SELECT instructor_id FROM courses WHERE id = ?').bind(courseId).first();
  return !!course && course.instructor_id === user.id;
}

// GET /api/courses/:id/lessons — used by the admin/instructor curriculum
// editor (full list, regardless of preview/enrollment).
export async function listLessons({ params, env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
  ).bind(params.id).all();
  return json({ lessons: results });
}

export async function createLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!(await canManageCourse(env, user, params.id))) return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest('title is required.');

  const contentType = ['text', 'video', 'pdf', 'quiz'].includes(body.content_type) ? body.content_type : 'text';

  const { count } = await env.DB.prepare(
    'SELECT COUNT(*) AS count FROM course_lessons WHERE course_id = ?'
  ).bind(params.id).first();

  const result = await env.DB.prepare(
    `INSERT INTO course_lessons (course_id, module_id, title, content_type, video_id, material_id, quiz_id, body, duration_seconds, sort_order, is_preview)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.id, body.module_id || null, body.title, contentType,
    body.video_id || null, body.material_id || null, body.quiz_id || null,
    body.body || null, body.duration_seconds || null,
    Number.isFinite(body.sort_order) ? body.sort_order : count + 1,
    body.is_preview ? 1 : 0
  ).run();

  return json({ id: result.meta.last_row_id }, { status: 201 });
}

export async function updateLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const lesson = await env.DB.prepare('SELECT * FROM course_lessons WHERE id = ?').bind(params.lessonId).first();
  if (!lesson) return notFound();
  if (!(await canManageCourse(env, user, lesson.course_id))) return forbidden();

  const body = await request.json().catch(() => ({}));
  const contentType = ['text', 'video', 'pdf', 'quiz'].includes(body.content_type) ? body.content_type : lesson.content_type;

  await env.DB.prepare(
    `UPDATE course_lessons SET module_id = ?, title = ?, content_type = ?, video_id = ?, material_id = ?, quiz_id = ?,
      body = ?, duration_seconds = ?, sort_order = ?, is_preview = ? WHERE id = ?`
  ).bind(
    body.module_id !== undefined ? body.module_id : lesson.module_id,
    body.title ?? lesson.title, contentType,
    body.video_id ?? lesson.video_id, body.material_id ?? lesson.material_id, body.quiz_id ?? lesson.quiz_id,
    body.body ?? lesson.body, body.duration_seconds ?? lesson.duration_seconds,
    body.sort_order ?? lesson.sort_order,
    body.is_preview != null ? (body.is_preview ? 1 : 0) : lesson.is_preview,
    params.lessonId
  ).run();

  return json({ ok: true });
}

export async function deleteLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const lesson = await env.DB.prepare('SELECT * FROM course_lessons WHERE id = ?').bind(params.lessonId).first();
  if (!lesson) return notFound();
  if (!(await canManageCourse(env, user, lesson.course_id))) return forbidden();

  await env.DB.prepare('DELETE FROM course_lessons WHERE id = ?').bind(params.lessonId).run();
  return json({ ok: true });
}

// GET /api/lessons/:id — the lesson viewer page. Requires the learner to
// be enrolled, unless the lesson is marked as a free preview, or the
// requester is the course's admin/instructor previewing their own work.
export async function getLesson({ request, params, env }) {
  const lesson = await env.DB.prepare('SELECT * FROM course_lessons WHERE id = ?').bind(params.id).first();
  if (!lesson) return notFound();

  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(lesson.course_id).first();
  if (!course) return notFound();

  const user = await getSessionUser(request, env.DB);
  const manager = await canManageCourse(env, user, course.id);

  if (!lesson.is_preview && !manager) {
    if (!user) return unauthorized('Sign in and enroll to view this lesson.');
    const enrolled = await env.DB.prepare(
      'SELECT 1 FROM course_enrollments WHERE user_id = ? AND course_id = ? AND payment_status != \'pending\''
    ).bind(user.id, course.id).first();
    if (!enrolled) return forbidden('Enroll in this course to view this lesson.');
  }

  // Attach the referenced content so the viewer has everything in one call.
  let video = null, material = null, quiz = null;
  if (lesson.video_id) video = await env.DB.prepare('SELECT id, title, external_url, file_key, source_type, thumbnail_url FROM videos WHERE id = ?').bind(lesson.video_id).first();
  if (lesson.material_id) material = await env.DB.prepare('SELECT id, title, file_key, file_type FROM materials WHERE id = ?').bind(lesson.material_id).first();
  if (lesson.quiz_id) {
    quiz = await env.DB.prepare('SELECT id, title, questions FROM quizzes WHERE id = ?').bind(lesson.quiz_id).first();
    if (quiz) { try { quiz.questions = JSON.parse(quiz.questions); } catch { quiz.questions = []; } }
  }

  // Ordered siblings, for Next/Previous lesson navigation.
  const { results: siblings } = await env.DB.prepare(
    'SELECT id, title, sort_order FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
  ).bind(course.id).all();
  const idx = siblings.findIndex((s) => s.id === lesson.id);
  const previous = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;

  let completed = false;
  if (user) {
    const row = await env.DB.prepare(
      'SELECT completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?'
    ).bind(user.id, lesson.id).first();
    completed = !!row?.completed;
  }

  return json({
    lesson, video, material, quiz, completed,
    course: { id: course.id, title: course.title, slug: course.slug, certificate_enabled: !!course.certificate_enabled, passing_score: course.passing_score },
    previous, next, lesson_index: idx + 1, lesson_total: siblings.length,
  });
}

// POST /api/lessons/:id/complete — marks (or unmarks) the lesson complete
// for the current user, and reports the course's updated progress so the
// UI can update its progress bar without a second round trip.
export async function completeLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const lesson = await env.DB.prepare('SELECT * FROM course_lessons WHERE id = ?').bind(params.id).first();
  if (!lesson) return notFound();

  const enrollment = await env.DB.prepare(
    'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?'
  ).bind(user.id, lesson.course_id).first();
  if (!enrollment) return forbidden('Enroll in this course first.');

  const body = await request.json().catch(() => ({}));
  const completed = body.completed !== false; // default true

  await env.DB.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at`
  ).bind(user.id, lesson.id, completed ? 1 : 0, completed ? new Date().toISOString() : null).run();

  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(lesson.course_id).first();
  const progress = await syncCourseCompletion(env, user.id, course);

  return json({
    ok: true, completed,
    progress_percent: progress.progress_percent,
    completed_lessons: progress.completed_lessons, total_lessons: progress.total_lessons,
    required_percent: progress.required_percent,
    lessons_requirement_met: progress.lessons_requirement_met,
    final_exam: progress.final_exam,
    course_completed: progress.course_completed,
    certificate: progress.certificate,
  });
}
