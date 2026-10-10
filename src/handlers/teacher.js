// Smart21Brain — Teacher dashboard API (teachers.html).
//
// Everything here reads/writes the same D1 tables the public website uses
// (courses, course_lessons, course_enrollments, lesson_progress, quizzes,
// quiz_attempts, videos, materials, ...), so what a teacher does in the
// dashboard shows up on courses.html / course.html / dashboard.html
// immediately, and what students do shows up in the teacher's numbers.
//
// A teacher sees only their own courses. An admin using this page sees all.
//
// New tables (migrations/phase10-teacher-dashboard.sql):
//   course_reviews, announcements, assignments, teacher_settings

import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';

// ---- helpers -------------------------------------------------------------

async function requireTeacher(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: unauthorized() };
  if (user.role !== 'teacher' && user.role !== 'admin') {
    return { error: forbidden('Teachers only.') };
  }
  return { user };
}

// SQL fragment limiting a query to the courses this person may see.
// `alias` is the table alias of `courses` in the query.
function scope(user, alias = 'c') {
  return user.role === 'admin'
    ? { sql: '1 = 1', binds: [] }
    : { sql: `${alias}.instructor_id = ?`, binds: [user.id] };
}

async function ownedCourse(env, user, courseId) {
  const course = await env.DB.prepare('SELECT * FROM courses WHERE id = ?').bind(courseId).first();
  if (!course) return null;
  if (user.role === 'admin' || course.instructor_id === user.id) return course;
  return null;
}

// "Halima Rashid" -> "Halima R." — teachers don't need children's full names.
function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

const clean = (v, max) => String(v ?? '').trim().slice(0, max);

// Tables from the phase-10 migration may not exist yet on an old database.
// Dashboard sections that depend on them degrade to "empty" instead of 500.
async function safely(run, fallback) {
  try { return await run(); } catch { return fallback; }
}

// ---- GET /api/teacher/overview ------------------------------------------

export async function overview({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const sc = scope(user);
  const db = env.DB;

  const monthStart = "datetime('now', 'start of month')";

  const [courses, students, revenue, newEnroll, lessonsDone] = await Promise.all([
    db.prepare(
      `SELECT SUM(c.published = 1) AS published, SUM(c.published = 0) AS drafts
       FROM courses c WHERE ${sc.sql}`
    ).bind(...sc.binds).first(),
    db.prepare(
      `SELECT COUNT(DISTINCT e.user_id) AS n
       FROM course_enrollments e JOIN courses c ON c.id = e.course_id WHERE ${sc.sql}`
    ).bind(...sc.binds).first(),
    db.prepare(
      `SELECT COALESCE(SUM(CASE WHEN e.payment_status = 'paid' THEN c.price END), 0) AS revenue,
              SUM(e.payment_status = 'pending') AS pending
       FROM course_enrollments e JOIN courses c ON c.id = e.course_id
       WHERE ${sc.sql} AND e.enrolled_at >= ${monthStart}`
    ).bind(...sc.binds).first(),
    db.prepare(
      `SELECT COUNT(*) AS n FROM course_enrollments e JOIN courses c ON c.id = e.course_id
       WHERE ${sc.sql} AND e.enrolled_at >= ${monthStart}`
    ).bind(...sc.binds).first(),
    db.prepare(
      `SELECT COUNT(*) AS n FROM lesson_progress lp
       JOIN course_lessons cl ON cl.id = lp.lesson_id
       JOIN courses c ON c.id = cl.course_id
       WHERE ${sc.sql} AND lp.completed = 1 AND lp.completed_at >= ${monthStart}`
    ).bind(...sc.binds).first(),
  ]);

  // Average quiz score this month, across every quiz used in my courses
  // (lesson quizzes, module quizzes and final exams) by my enrolled students.
  const quizAvg = await safely(() => db.prepare(
    `SELECT AVG(qa.score * 100.0 / NULLIF(qa.total, 0)) AS avg
     FROM quiz_attempts qa
     WHERE qa.completed_at >= ${monthStart}
       AND qa.quiz_id IN (
         SELECT cl.quiz_id FROM course_lessons cl JOIN courses c ON c.id = cl.course_id WHERE cl.quiz_id IS NOT NULL AND ${sc.sql}
         UNION SELECT cm.quiz_id FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.quiz_id IS NOT NULL AND ${sc.sql}
         UNION SELECT c.final_exam_quiz_id FROM courses c WHERE c.final_exam_quiz_id IS NOT NULL AND ${sc.sql}
       )`
  ).bind(...sc.binds, ...sc.binds, ...sc.binds).first(), null);

  const ratings = await safely(() => db.prepare(
    `SELECT ROUND(AVG(r.rating), 1) AS avg, COUNT(*) AS n,
            SUM(r.teacher_reply IS NULL AND r.comment IS NOT NULL AND r.comment != '') AS unanswered
     FROM course_reviews r JOIN courses c ON c.id = r.course_id WHERE ${sc.sql}`
  ).bind(...sc.binds).first(), { avg: null, n: 0, unanswered: 0 });

  return json({
    published_courses: courses?.published || 0,
    draft_courses: courses?.drafts || 0,
    enrolled_students: students?.n || 0,
    average_rating: ratings?.avg ?? null,
    review_count: ratings?.n || 0,
    // Only enrollments marked 'paid' count as revenue. There is no payment
    // gateway wired up yet, so paid-course enrollments sit at 'pending'
    // until an admin confirms payment.
    revenue_this_month: revenue?.revenue || 0,
    pending_payments: revenue?.pending || 0,
    currency: 'TZS',
    new_enrollments: newEnroll?.n || 0,
    lessons_completed: lessonsDone?.n || 0,
    avg_quiz_score: quizAvg?.avg != null ? Math.round(quizAvg.avg) : null,
    comments_to_answer: ratings?.unanswered || 0,
  });
}

// ---- GET /api/teacher/courses -------------------------------------------

export async function listMyCourses({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const sc = scope(user);

  const build = (ratingCols) => env.DB.prepare(
    `SELECT c.id, c.title, c.slug, c.description, c.thumbnail_url, c.category_id, c.level, c.age_range,
            c.language, c.price, c.is_free, c.published, c.certificate_enabled, c.passing_score,
            c.objectives, c.requirements, c.final_exam_quiz_id, c.created_at,
            cat.name AS category_name, u.name AS instructor_name,
            (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS lesson_count,
            (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) AS student_count,
            ${ratingCols}
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.instructor_id
     WHERE ${sc.sql}
     ORDER BY c.created_at DESC`
  ).bind(...sc.binds).all();

  let results;
  try {
    ({ results } = await build(
      `(SELECT ROUND(AVG(rating), 1) FROM course_reviews WHERE course_id = c.id) AS avg_rating,
       (SELECT COUNT(*) FROM course_reviews WHERE course_id = c.id) AS review_count`
    ));
  } catch {
    ({ results } = await build('NULL AS avg_rating, 0 AS review_count'));
  }

  const parse = (t) => { try { const v = JSON.parse(t || '[]'); return Array.isArray(v) ? v : []; } catch { return []; } };
  return json({
    courses: results.map((c) => ({ ...c, objectives: parse(c.objectives), requirements: parse(c.requirements) })),
  });
}

// ---- GET /api/teacher/students ------------------------------------------
// ?course_id=  ?attention=1 (only students who need a nudge)  ?q=name

export async function listStudents({ request, env, url }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const sc = scope(user);

  const clauses = [sc.sql];
  const binds = [...sc.binds];
  const courseId = url.searchParams.get('course_id');
  if (courseId) { clauses.push('c.id = ?'); binds.push(courseId); }
  const q = clean(url.searchParams.get('q'), 60);
  if (q) { clauses.push('u.name LIKE ?'); binds.push(`%${q}%`); }

  const { results } = await env.DB.prepare(
    `SELECT u.id AS user_id, u.name, u.avatar_key,
            c.id AS course_id, c.title AS course_title,
            e.status, e.payment_status, e.enrolled_at, e.completed_at,
            (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS total_lessons,
            (SELECT COUNT(*) FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id
               WHERE lp.user_id = u.id AND cl.course_id = c.id AND lp.completed = 1) AS completed_lessons,
            (SELECT MAX(lp.completed_at) FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id
               WHERE lp.user_id = u.id AND cl.course_id = c.id AND lp.completed = 1) AS last_lesson_at
     FROM course_enrollments e
     JOIN courses c ON c.id = e.course_id
     JOIN users u ON u.id = e.user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY e.enrolled_at DESC
     LIMIT 500`
  ).bind(...binds).all();

  const now = Date.now();
  let students = results.map((r) => {
    const lastActive = r.last_lesson_at || r.enrolled_at;
    const lastMs = Date.parse(String(lastActive).replace(' ', 'T') + 'Z');
    const daysInactive = Number.isFinite(lastMs) ? Math.max(0, Math.floor((now - lastMs) / 86400000)) : null;
    const progress = r.total_lessons > 0 ? Math.round((r.completed_lessons / r.total_lessons) * 100) : 0;
    return {
      user_id: r.user_id,
      name: shortName(r.name),
      avatar_url: r.avatar_key ? `/api/avatar/${r.user_id}` : null,
      course_id: r.course_id,
      course_title: r.course_title,
      status: r.status,
      payment_status: r.payment_status,
      enrolled_at: r.enrolled_at,
      progress_percent: progress,
      completed_lessons: r.completed_lessons,
      total_lessons: r.total_lessons,
      last_active: lastActive,
      days_inactive: daysInactive,
      // "Needs attention": still working on it, not finished, and quiet for a week.
      needs_attention: r.status !== 'completed' && r.payment_status !== 'pending' && progress < 100 && daysInactive != null && daysInactive >= 7,
    };
  });

  if (url.searchParams.get('attention') === '1') {
    students = students.filter((s) => s.needs_attention)
      .sort((a, b) => (b.days_inactive || 0) - (a.days_inactive || 0));
  }
  return json({ students });
}

// ---- Reviews -------------------------------------------------------------

export async function listReviews({ request, env, url }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const sc = scope(user);

  const clauses = [sc.sql];
  if (url.searchParams.get('unanswered') === '1') clauses.push("r.teacher_reply IS NULL AND r.comment IS NOT NULL AND r.comment != ''");

  const results = await safely(async () => (await env.DB.prepare(
    `SELECT r.id, r.course_id, r.rating, r.comment, r.teacher_reply, r.replied_at, r.created_at,
            c.title AS course_title, u.name AS student_name, u.avatar_key, u.id AS user_id
     FROM course_reviews r
     JOIN courses c ON c.id = r.course_id
     JOIN users u ON u.id = r.user_id
     WHERE ${clauses.join(' AND ')}
     ORDER BY r.created_at DESC LIMIT 50`
  ).bind(...sc.binds).all()).results, []);

  return json({
    reviews: results.map((r) => ({
      id: r.id, course_id: r.course_id, course_title: r.course_title,
      rating: r.rating, comment: r.comment, teacher_reply: r.teacher_reply,
      replied_at: r.replied_at, created_at: r.created_at,
      student_name: shortName(r.student_name),
      avatar_url: r.avatar_key ? `/api/avatar/${r.user_id}` : null,
    })),
  });
}

export async function replyToReview({ request, params, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;

  const review = await env.DB.prepare(
    'SELECT r.id, r.course_id FROM course_reviews r WHERE r.id = ?'
  ).bind(params.id).first().catch(() => null);
  if (!review) return notFound('Review not found.');
  if (!(await ownedCourse(env, user, review.course_id))) return forbidden('That review is not on one of your courses.');

  const body = await request.json().catch(() => null);
  const reply = clean(body?.reply, 1000);
  if (!reply) return badRequest('Write a reply first.');

  await env.DB.prepare(
    "UPDATE course_reviews SET teacher_reply = ?, replied_at = datetime('now') WHERE id = ?"
  ).bind(reply, review.id).run();
  return json({ ok: true });
}

// ---- Announcements -------------------------------------------------------

export async function listAnnouncements({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;

  const results = await safely(async () => (await env.DB.prepare(
    `SELECT a.id, a.course_id, a.title, a.body, a.created_at, c.title AS course_title
     FROM announcements a LEFT JOIN courses c ON c.id = a.course_id
     WHERE a.teacher_id = ?
     ORDER BY a.created_at DESC LIMIT 30`
  ).bind(user.id).all()).results, []);
  return json({ announcements: results });
}

export async function createAnnouncement({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;

  const body = await request.json().catch(() => null);
  const text = clean(body?.body, 1500);
  if (!text) return badRequest('Write an announcement first.');

  let courseId = null;
  if (body.course_id) {
    const course = await ownedCourse(env, user, body.course_id);
    if (!course) return forbidden('You can only post to your own courses.');
    courseId = course.id;
  }

  try {
    const r = await env.DB.prepare(
      'INSERT INTO announcements (teacher_id, course_id, title, body) VALUES (?, ?, ?, ?)'
    ).bind(user.id, courseId, clean(body.title, 120) || null, text).run();
    return json({ id: r.meta.last_row_id }, { status: 201 });
  } catch {
    return badRequest('Announcements are not set up yet. Run migrations/phase10-teacher-dashboard.sql.');
  }
}

export async function deleteAnnouncement({ request, params, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const row = await env.DB.prepare('SELECT teacher_id FROM announcements WHERE id = ?').bind(params.id).first().catch(() => null);
  if (!row) return notFound();
  if (user.role !== 'admin' && row.teacher_id !== user.id) return forbidden();
  await env.DB.prepare('DELETE FROM announcements WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

// ---- Assignments ---------------------------------------------------------

export async function listAssignments({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const sc = scope(user);

  const results = await safely(async () => (await env.DB.prepare(
    `SELECT a.id, a.course_id, a.title, a.instructions, a.due_date, a.created_at, c.title AS course_title
     FROM assignments a JOIN courses c ON c.id = a.course_id
     WHERE ${sc.sql}
     ORDER BY a.created_at DESC LIMIT 50`
  ).bind(...sc.binds).all()).results, []);
  return json({ assignments: results });
}

export async function createAssignment({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;

  const body = await request.json().catch(() => null);
  const title = clean(body?.title, 160);
  if (!title) return badRequest('Give the assignment a title.');
  if (!body.course_id) return badRequest('Choose a course for this assignment.');

  const course = await ownedCourse(env, user, body.course_id);
  if (!course) return forbidden('You can only add assignments to your own courses.');

  const due = clean(body.due_date, 10);
  if (due && !/^\d{4}-\d{2}-\d{2}$/.test(due)) return badRequest('Due date must look like 2026-11-30.');

  try {
    const r = await env.DB.prepare(
      'INSERT INTO assignments (course_id, teacher_id, title, instructions, due_date) VALUES (?, ?, ?, ?, ?)'
    ).bind(course.id, user.id, title, clean(body.instructions, 3000) || null, due || null).run();
    return json({ id: r.meta.last_row_id }, { status: 201 });
  } catch {
    return badRequest('Assignments are not set up yet. Run migrations/phase10-teacher-dashboard.sql.');
  }
}

export async function deleteAssignment({ request, params, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const row = await env.DB.prepare('SELECT course_id FROM assignments WHERE id = ?').bind(params.id).first().catch(() => null);
  if (!row) return notFound();
  if (!(await ownedCourse(env, user, row.course_id))) return forbidden();
  await env.DB.prepare('DELETE FROM assignments WHERE id = ?').bind(params.id).run();
  return json({ ok: true });
}

// ---- Settings ------------------------------------------------------------

const SETTING_DEFAULTS = { show_profile_to_parents: 1, email_on_comments: 1, weekly_summary_email: 0 };

export async function getSettings({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const row = await safely(() => env.DB.prepare(
    'SELECT show_profile_to_parents, email_on_comments, weekly_summary_email FROM teacher_settings WHERE user_id = ?'
  ).bind(user.id).first(), null);
  const s = { ...SETTING_DEFAULTS, ...(row || {}) };
  return json({ settings: {
    show_profile_to_parents: !!s.show_profile_to_parents,
    email_on_comments: !!s.email_on_comments,
    weekly_summary_email: !!s.weekly_summary_email,
  } });
}

export async function updateSettings({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest('Invalid request.');

  const current = await safely(() => env.DB.prepare(
    'SELECT show_profile_to_parents, email_on_comments, weekly_summary_email FROM teacher_settings WHERE user_id = ?'
  ).bind(user.id).first(), null);
  const base = { ...SETTING_DEFAULTS, ...(current || {}) };
  const pick = (k) => (body[k] != null ? (body[k] ? 1 : 0) : base[k]);

  try {
    await env.DB.prepare(
      `INSERT INTO teacher_settings (user_id, show_profile_to_parents, email_on_comments, weekly_summary_email, updated_at)
       VALUES (?, ?, ?, ?, datetime('now'))
       ON CONFLICT(user_id) DO UPDATE SET
         show_profile_to_parents = excluded.show_profile_to_parents,
         email_on_comments = excluded.email_on_comments,
         weekly_summary_email = excluded.weekly_summary_email,
         updated_at = datetime('now')`
    ).bind(user.id, pick('show_profile_to_parents'), pick('email_on_comments'), pick('weekly_summary_email')).run();
  } catch {
    return badRequest('Settings are not set up yet. Run migrations/phase10-teacher-dashboard.sql.');
  }
  return json({ ok: true });
}

// ---- My uploaded content (for attaching to lessons) ----------------------

export async function myContent({ request, env }) {
  const { user, error } = await requireTeacher(request, env);
  if (error) return error;
  const all = user.role === 'admin';

  const [videos, materials, quizzes] = await Promise.all([
    env.DB.prepare(
      `SELECT id, title, subject, source_type, placements, published, duration_seconds, created_at
       FROM videos ${all ? '' : 'WHERE created_by = ?'} ORDER BY created_at DESC LIMIT 200`
    ).bind(...(all ? [] : [user.id])).all(),
    env.DB.prepare(
      `SELECT id, title, subject, file_type, file_size, created_at
       FROM materials ${all ? '' : 'WHERE uploaded_by = ?'} ORDER BY created_at DESC LIMIT 200`
    ).bind(...(all ? [] : [user.id])).all(),
    env.DB.prepare(
      `SELECT id, title, subject, description, published, questions, created_at
       FROM quizzes ${all ? '' : 'WHERE created_by = ?'} ORDER BY created_at DESC LIMIT 200`
    ).bind(...(all ? [] : [user.id])).all(),
  ]);

  return json({
    videos: videos.results.map((v) => ({ ...v, placements: (v.placements || '').split(',').filter(Boolean) })),
    materials: materials.results,
    quizzes: quizzes.results.map((q) => {
      let n = 0; try { n = JSON.parse(q.questions).length; } catch { /* ignore */ }
      const { questions, ...rest } = q;
      return { ...rest, question_count: n };
    }),
  });
}

// ---- Course thumbnail upload ---------------------------------------------
// POST /api/teacher/thumbnail (multipart, field "file") -> { url }
// GET  /api/course-thumbs/:name (public; this is what courses.thumbnail_url stores)

const THUMB_TYPES = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' };
const MAX_THUMB_BYTES = 5 * 1024 * 1024;

export async function uploadThumbnail({ request, env }) {
  const { error } = await requireTeacher(request, env);
  if (error) return error;

  const form = await request.formData().catch(() => null);
  const file = form?.get('file');
  if (!file || typeof file === 'string') return badRequest('Choose an image file.');
  const ext = THUMB_TYPES[file.type];
  if (!ext) return badRequest('Thumbnail must be a PNG, JPG, WEBP or GIF image.');
  if (file.size > MAX_THUMB_BYTES) return badRequest('Image is too large (5MB max).');

  const name = `${Date.now()}-${crypto.randomUUID()}.${ext}`;
  await env.MATERIALS.put(`course-thumbs/${name}`, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type },
  });
  return json({ url: `/api/course-thumbs/${name}` }, { status: 201 });
}

export async function getThumbnail({ params, env }) {
  if (!/^[\w.\-]+$/.test(params.name)) return notFound();
  const object = await env.MATERIALS.get(`course-thumbs/${params.name}`);
  if (!object) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set('Cache-Control', 'public, max-age=86400');
  headers.set('X-Content-Type-Options', 'nosniff');
  return new Response(object.body, { headers });
}
