// Smart21Brain — the student side of the teacher dashboard.
//
//   GET  /api/courses/:id/reviews   public list + rating summary
//   POST /api/courses/:id/reviews   an enrolled student rates / reviews a course
//   GET  /api/courses/:id/updates   announcements + assignments for that course
//   GET  /api/announcements         announcements for the signed-in student's dashboard
//
// :id may be the numeric id or the slug (course.html deep-links by slug).

import { getSessionUser, json, badRequest, unauthorized, forbidden, notFound } from '../lib/auth.js';

async function findCourse(env, key) {
  const numeric = /^\d+$/.test(key);
  return env.DB.prepare(`SELECT id, title, slug, published, instructor_id FROM courses WHERE ${numeric ? 'id' : 'slug'} = ?`)
    .bind(key).first();
}

function isManager(user, course) {
  return !!user && (user.role === 'admin' || (user.role === 'teacher' && course.instructor_id === user.id));
}

function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'Student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

export async function listReviews({ request, params, env }) {
  const course = await findCourse(env, params.id);
  if (!course) return notFound();
  const user = await getSessionUser(request, env.DB);
  if (!course.published && !isManager(user, course)) return notFound();

  let rows = [];
  let summary = { avg: null, count: 0 };
  try {
    ({ results: rows } = await env.DB.prepare(
      `SELECT r.id, r.user_id, r.rating, r.comment, r.teacher_reply, r.replied_at, r.created_at, u.name, u.avatar_key
       FROM course_reviews r JOIN users u ON u.id = r.user_id
       WHERE r.course_id = ? ORDER BY r.created_at DESC LIMIT 50`
    ).bind(course.id).all());
    const s = await env.DB.prepare(
      'SELECT ROUND(AVG(rating), 1) AS avg, COUNT(*) AS count FROM course_reviews WHERE course_id = ?'
    ).bind(course.id).first();
    summary = { avg: s?.avg ?? null, count: s?.count || 0 };
  } catch { /* phase-10 migration not applied — behave like "no reviews yet" */ }

  let canReview = false;
  if (user && !isManager(user, course) && user.id !== course.instructor_id) {
    const enrolled = await env.DB.prepare(
      "SELECT payment_status FROM course_enrollments WHERE user_id = ? AND course_id = ?"
    ).bind(user.id, course.id).first();
    canReview = !!enrolled && enrolled.payment_status !== 'pending';
  }

  return json({
    summary,
    can_review: canReview,
    mine: user ? (rows.find((r) => r.user_id === user.id) ? { rating: rows.find((r) => r.user_id === user.id).rating, comment: rows.find((r) => r.user_id === user.id).comment } : null) : null,
    reviews: rows.map((r) => ({
      id: r.id, rating: r.rating, comment: r.comment, teacher_reply: r.teacher_reply,
      replied_at: r.replied_at, created_at: r.created_at,
      name: shortName(r.name),
      avatar_url: r.avatar_key ? `/api/avatar/${r.user_id}` : null,
    })),
  });
}

export async function submitReview({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized('Sign in to review this course.');

  const course = await findCourse(env, params.id);
  if (!course || !course.published) return notFound();
  if (course.instructor_id === user.id) return forbidden("You can't review your own course.");

  const enrollment = await env.DB.prepare(
    'SELECT payment_status FROM course_enrollments WHERE user_id = ? AND course_id = ?'
  ).bind(user.id, course.id).first();
  if (!enrollment || enrollment.payment_status === 'pending') {
    return forbidden('Enroll in this course before reviewing it.');
  }

  const body = await request.json().catch(() => null);
  const rating = Number(body?.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return badRequest('Choose a rating from 1 to 5 stars.');
  const comment = String(body?.comment ?? '').trim().slice(0, 1000) || null;

  try {
    await env.DB.prepare(
      `INSERT INTO course_reviews (course_id, user_id, rating, comment) VALUES (?, ?, ?, ?)
       ON CONFLICT(course_id, user_id) DO UPDATE SET rating = excluded.rating, comment = excluded.comment`
    ).bind(course.id, user.id, rating, comment).run();
  } catch {
    return badRequest('Reviews are not set up yet. Run migrations/phase10-teacher-dashboard.sql.');
  }
  return json({ ok: true }, { status: 201 });
}

export async function courseUpdates({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return json({ announcements: [], assignments: [] });

  const course = await findCourse(env, params.id);
  if (!course) return notFound();

  if (!isManager(user, course)) {
    const enrolled = await env.DB.prepare(
      'SELECT 1 AS ok FROM course_enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(user.id, course.id).first();
    if (!enrolled) return json({ announcements: [], assignments: [] });
  }

  try {
    const [ann, asg] = await Promise.all([
      env.DB.prepare(
        `SELECT a.id, a.title, a.body, a.created_at, u.name AS teacher_name
         FROM announcements a JOIN users u ON u.id = a.teacher_id
         WHERE a.course_id = ? OR (a.course_id IS NULL AND a.teacher_id = ?)
         ORDER BY a.created_at DESC LIMIT 10`
      ).bind(course.id, course.instructor_id).all(),
      env.DB.prepare(
        `SELECT id, title, instructions, due_date, created_at FROM assignments
         WHERE course_id = ? ORDER BY COALESCE(due_date, '9999-12-31') ASC, created_at DESC LIMIT 20`
      ).bind(course.id).all(),
    ]);
    return json({ announcements: ann.results, assignments: asg.results });
  } catch {
    return json({ announcements: [], assignments: [] });
  }
}

// The student dashboard's notification list: announcements from every teacher
// whose course the student is enrolled in.
export async function myAnnouncements({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  try {
    const { results } = await env.DB.prepare(
      `SELECT a.id, a.title, a.body, a.created_at, a.course_id,
              u.name AS teacher_name, c.title AS course_title, c.slug AS course_slug
       FROM announcements a
       JOIN users u ON u.id = a.teacher_id
       LEFT JOIN courses c ON c.id = a.course_id
       WHERE (a.course_id IN (SELECT course_id FROM course_enrollments WHERE user_id = ?))
          OR (a.course_id IS NULL AND a.teacher_id IN (
                SELECT c2.instructor_id FROM course_enrollments e JOIN courses c2 ON c2.id = e.course_id WHERE e.user_id = ?))
       ORDER BY a.created_at DESC LIMIT 10`
    ).bind(user.id, user.id).all();
    return json({ announcements: results });
  } catch {
    return json({ announcements: [] });
  }
}
