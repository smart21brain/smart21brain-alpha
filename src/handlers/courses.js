import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound, slugify } from '../lib/auth.js';
import { getCourseProgress } from '../lib/course-engine.js';

// A teacher may manage only their own courses; an admin may manage any.
function canManage(user, course) {
  if (!user) return false;
  if (user.role === 'admin') return true;
  return user.role === 'teacher' && course.instructor_id === user.id;
}

// ---- Categories (admin-manageable) ----

export async function listCategories({ env }) {
  const { results } = await env.DB.prepare(
    'SELECT * FROM course_categories ORDER BY name ASC'
  ).all();
  return json({ categories: results });
}

export async function createCategory({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || !body.name) return badRequest('name is required.');

  const slug = slugify(body.slug || body.name);
  const result = await env.DB.prepare(
    'INSERT INTO course_categories (name, slug, icon) VALUES (?, ?, ?)'
  ).bind(body.name, slug, body.icon || 'fa-solid fa-book').run();

  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}

export async function deleteCategory({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();

  await env.DB.prepare('DELETE FROM course_categories WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

// ---- Courses ----

function parseJsonArray(text) {
  try {
    const v = JSON.parse(text || '[]');
    return Array.isArray(v) ? v : [];
  } catch { return []; }
}

// Catalog: /api/courses?category=slug&level=beginner&instructor=5&free=true&q=fractions&sort=new|title
export async function listCourses({ request, env, url }) {
  const params = url.searchParams;
  const clauses = ['c.published = 1'];
  const binds = [];

  const category = params.get('category');
  if (category) { clauses.push('cat.slug = ?'); binds.push(category); }

  const level = params.get('level');
  if (level && level !== 'all') { clauses.push('c.level = ?'); binds.push(level); }

  const instructor = params.get('instructor');
  if (instructor) { clauses.push('c.instructor_id = ?'); binds.push(instructor); }

  const free = params.get('free');
  if (free === 'true') clauses.push('c.is_free = 1');
  if (free === 'false') clauses.push('c.is_free = 0');

  const q = params.get('q');
  if (q) { clauses.push('(c.title LIKE ? OR c.description LIKE ?)'); binds.push(`%${q}%`, `%${q}%`); }

  const sort = params.get('sort') === 'title' ? 'c.title ASC' : 'c.created_at DESC';

  const { results } = await env.DB.prepare(
    `SELECT c.*, cat.name AS category_name, cat.slug AS category_slug,
            u.name AS instructor_name,
            (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS lesson_count,
            (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) AS enrolled_count
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.instructor_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY ${sort}`
  ).bind(...binds).all();

  return json({ courses: results.map((c) => ({ ...c, objectives: parseJsonArray(c.objectives), requirements: parseJsonArray(c.requirements) })) });
}

export async function createCourse({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin' && user.role !== 'teacher') return forbidden('Admins or teachers only.');

  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest('title is required.');

  // A teacher can only create courses under their own name.
  const instructorId = user.role === 'teacher' ? user.id : (body.instructor_id || user.id);

  const price = Number(body.price) || 0;
  const slug = slugify(body.slug || body.title);

  const result = await env.DB.prepare(
    `INSERT INTO courses (
      title, slug, description, thumbnail_url, category_id, instructor_id, level, age_range,
      language, objectives, requirements, price, is_free, certificate_enabled, passing_score,
      final_exam_quiz_id, final_exam_passing_score, published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title, slug, body.description || null, body.thumbnail_url || null,
    body.category_id || null, instructorId, body.level || 'beginner', body.age_range || null,
    body.language || 'English',
    JSON.stringify(Array.isArray(body.objectives) ? body.objectives : []),
    JSON.stringify(Array.isArray(body.requirements) ? body.requirements : []),
    price, price > 0 ? 0 : 1, body.certificate_enabled ? 1 : 0, Number(body.passing_score) || 70,
    body.final_exam_quiz_id || null, Number(body.final_exam_passing_score) || 70,
    body.published === false ? 0 : 1, user.id
  ).run();

  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}

// Looked up by numeric id or slug (course.html deep links via ?slug=).
// Includes curriculum (modules -> lessons, plus any ungrouped lessons)
// and, for a signed-in learner, their enrollment + progress through the
// full Phase 8 completion algorithm (lessons -> required % -> final
// exam -> passing score -> certificate) so the page can render real
// state without a second round trip.
export async function getCourse({ request, params, env }) {
  const key = params.id;
  const isNumeric = /^\d+$/.test(key);
  const course = await env.DB.prepare(
    `SELECT c.*, cat.name AS category_name, cat.slug AS category_slug, u.name AS instructor_name, u.avatar_key AS instructor_avatar_key
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.instructor_id
     WHERE c.${isNumeric ? 'id' : 'slug'} = ?`
  ).bind(key).first();
  if (!course) return notFound();

  const user = await getSessionUser(request, env.DB);
  const isManager = user && (user.role === 'admin' || (user.role === 'teacher' && course.instructor_id === user.id));
  if (!course.published && !isManager) return notFound();

  course.objectives = parseJsonArray(course.objectives);
  course.requirements = parseJsonArray(course.requirements);

  const { results: lessons } = await env.DB.prepare(
    'SELECT id, module_id, title, content_type, duration_seconds, sort_order, is_preview FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
  ).bind(course.id).all();

  let enrollment = null;
  let progress = null;
  if (user) {
    enrollment = await env.DB.prepare(
      'SELECT payment_status, status, enrolled_at, completed_at FROM course_enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(user.id, course.id).first();

    if (enrollment) {
      const { results: done } = await env.DB.prepare(
        `SELECT lp.lesson_id FROM lesson_progress lp
         JOIN course_lessons cl ON cl.id = lp.lesson_id
         WHERE lp.user_id = ? AND cl.course_id = ? AND lp.completed = 1`
      ).bind(user.id, course.id).all();
      const completedIds = new Set(done.map((r) => r.lesson_id));
      lessons.forEach((l) => { l.completed = completedIds.has(l.id); });

      progress = await getCourseProgress(env, user.id, course);
    }
  }

  // PHASE 8: nest lessons under their module, keep a separate bucket for
  // lessons with no module (older/simpler courses, or lessons not yet
  // organized into a module) — both are fully valid shapes.
  const { results: moduleRows } = await env.DB.prepare(
    'SELECT id, title, description, quiz_id, passing_score, sort_order FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
  ).bind(course.id).all();
  const modules = moduleRows.map((m) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
    quiz_status: progress?.module_status?.[m.id] || null,
  }));
  const ungroupedLessons = lessons.filter((l) => !l.module_id);

  const reviewCount = 0; // reviews aren't tracked yet — surfaced honestly as 0, not a fake number
  return json({
    course, lessons, modules, ungrouped_lessons: ungroupedLessons,
    enrollment, progress, review_count: reviewCount,
  });
}

export async function updateCourse({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(params.id).first();
  if (!course) return notFound();
  if (!canManage(user, course)) return forbidden();

  const body = await request.json().catch(() => ({}));
  const price = body.price != null ? Number(body.price) : course.price;

  await env.DB.prepare(
    `UPDATE courses SET title = ?, description = ?, thumbnail_url = ?, category_id = ?, level = ?,
      age_range = ?, language = ?, objectives = ?, requirements = ?, price = ?, is_free = ?,
      certificate_enabled = ?, passing_score = ?, final_exam_quiz_id = ?, final_exam_passing_score = ?,
      published = ? WHERE id = ?`
  ).bind(
    body.title ?? course.title,
    body.description ?? course.description,
    body.thumbnail_url ?? course.thumbnail_url,
    body.category_id ?? course.category_id,
    body.level ?? course.level,
    body.age_range ?? course.age_range,
    body.language ?? course.language,
    JSON.stringify(Array.isArray(body.objectives) ? body.objectives : parseJsonArray(course.objectives)),
    JSON.stringify(Array.isArray(body.requirements) ? body.requirements : parseJsonArray(course.requirements)),
    price, price > 0 ? 0 : 1,
    body.certificate_enabled != null ? (body.certificate_enabled ? 1 : 0) : course.certificate_enabled,
    body.passing_score != null ? Number(body.passing_score) : course.passing_score,
    body.final_exam_quiz_id !== undefined ? body.final_exam_quiz_id : course.final_exam_quiz_id,
    body.final_exam_passing_score != null ? Number(body.final_exam_passing_score) : course.final_exam_passing_score,
    body.published === false ? 0 : 1,
    params.id
  ).run();

  return json({ ok: true });
}

export async function deleteCourse({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(params.id).first();
  if (!course) return notFound();
  if (!canManage(user, course)) return forbidden();

  await env.DB.prepare('DELETE FROM courses WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

// ---- Enrollment ----

export async function enrollCourse({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(params.id).first();
  if (!course) return notFound();

  const existing = await env.DB.prepare(
    'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?'
  ).bind(user.id, course.id).first();
  if (existing) return json({ enrollment: existing, already_enrolled: true });

  // Free courses enroll instantly. Paid courses are recorded as
  // 'pending' — there's no payment gateway wired up yet (that's a
  // later phase), so we don't pretend the course was paid for.
  const paymentStatus = course.is_free ? 'free' : 'pending';

  await env.DB.prepare(
    'INSERT INTO course_enrollments (user_id, course_id, payment_status, status) VALUES (?, ?, ?, ?)'
  ).bind(user.id, course.id, paymentStatus, 'active').run();

  return json({
    enrolled: true,
    payment_status: paymentStatus,
    message: paymentStatus === 'pending'
      ? 'Enrollment recorded — this is a paid course and payment collection isn\'t wired up yet. Contact us to confirm payment and unlock lessons.'
      : 'Enrolled! You can start learning right away.',
  }, { status: 201 });
}

// Dashboard "My Courses" / "Continue Learning": every course the current
// user is enrolled in, plus a real completed/total lesson count.
export async function myCourses({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT c.id, c.title, c.slug, c.thumbnail_url, c.level,
            e.payment_status, e.status, e.enrolled_at, e.completed_at,
            (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS total_lessons,
            (SELECT COUNT(*) FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id
               WHERE lp.user_id = ? AND cl.course_id = c.id AND lp.completed = 1) AS completed_lessons,
            (SELECT code FROM certificates WHERE user_id = ? AND course_id = c.id) AS certificate_code
     FROM course_enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.user_id = ?
     ORDER BY e.enrolled_at DESC`
  ).bind(user.id, user.id, user.id).all();

  const courses = results.map((c) => ({
    ...c,
    progress_percent: c.total_lessons > 0 ? Math.round((c.completed_lessons / c.total_lessons) * 100) : 0,
  }));

  return json({ courses });
}
