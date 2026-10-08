import { getSessionUser, json, badRequest, unauthorized } from '../lib/auth.js';
import { CATALOG } from '../lib/catalog-index.js';

// Account-level progress for the BUILT-IN course catalog (js/courses-data.js).
//
// The browser keeps working from its own saved copy (so lessons work offline
// and for signed-out visitors); this endpoint stores the same data against
// the learner's account so it follows them to another device and so the
// dashboard can count it for XP / streak / badges.
//
// State shape, identical in the browser and here:
//   { "<course-slug>": { enrolled_at, updated_at, completed: [lessonId...],
//                        times: { lessonId: ISO }, completed_at: ISO|null } }
//
// Conflict rule: per course, the write with the newer updated_at wins. Only
// lessons that really exist in the catalog are accepted, and the server — not
// the browser — decides when a course counts as completed.

async function loadState(env, userId) {
  const [enr, prog] = await Promise.all([
    env.DB.prepare('SELECT course_slug, enrolled_at, updated_at, completed_at FROM catalog_enrollments WHERE user_id = ?').bind(userId).all(),
    env.DB.prepare('SELECT course_slug, lesson_id, completed_at FROM catalog_progress WHERE user_id = ?').bind(userId).all(),
  ]);
  const state = {};
  for (const e of enr.results) {
    state[e.course_slug] = { enrolled_at: e.enrolled_at, updated_at: e.updated_at, completed: [], times: {}, completed_at: e.completed_at || null };
  }
  for (const p of prog.results) {
    const s = state[p.course_slug];
    if (!s) continue;
    s.completed.push(p.lesson_id);
    s.times[p.lesson_id] = p.completed_at;
  }
  return state;
}

function isoOrNull(v) {
  const d = typeof v === 'string' ? new Date(v) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toISOString() : null;
}

// GET /api/progress/catalog
export async function getCatalogProgress({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  return json({ user_id: user.id, courses: await loadState(env, user.id) });
}

// POST /api/progress/catalog   { courses: { slug: state, ... } }
// Returns the account's full, merged state so the browser can adopt it.
export async function saveCatalogProgress({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const incoming = body && body.courses;
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) return badRequest('courses is required.');
  const slugs = Object.keys(incoming).filter((slug) => CATALOG[slug]).slice(0, 100);

  const existing = await loadState(env, user.id);
  const now = Date.now();
  const statements = [];

  for (const slug of slugs) {
    const course = CATALOG[slug];
    const c = incoming[slug] || {};
    // Never let a wrong clock pin a course into the future.
    const updatedAt = Math.min(Number(c.updated_at) || 0, now);
    const have = existing[slug];
    if (have && have.updated_at > updatedAt) continue; // the account's copy is strictly newer — keep it

    const valid = new Set(course.lessons);
    const times = {};
    for (const id of Array.isArray(c.completed) ? c.completed : []) {
      if (!valid.has(String(id))) continue;
      times[String(id)] = isoOrNull(c.times && c.times[id]) || new Date(now).toISOString();
    }
    const done = Object.keys(times);
    const complete = course.lessons.length > 0 && done.length >= course.lessons.length;
    const enrolledAt = Math.min(Number(c.enrolled_at) || updatedAt || now, now);
    let completedAt = have && have.completed_at ? have.completed_at : null; // once earned, kept
    if (complete && !completedAt) {
      completedAt = isoOrNull(c.completed_at) || done.map((id) => times[id]).sort().pop();
    }

    statements.push(env.DB.prepare('DELETE FROM catalog_progress WHERE user_id = ? AND course_slug = ?').bind(user.id, slug));
    for (const id of done) {
      statements.push(env.DB.prepare(
        'INSERT INTO catalog_progress (user_id, course_slug, lesson_id, completed_at) VALUES (?, ?, ?, ?)'
      ).bind(user.id, slug, id, times[id]));
    }
    statements.push(env.DB.prepare(
      `INSERT INTO catalog_enrollments (user_id, course_slug, enrolled_at, updated_at, completed_at)
       VALUES (?, ?, ?, ?, ?)
       ON CONFLICT(user_id, course_slug) DO UPDATE SET
         enrolled_at = excluded.enrolled_at, updated_at = excluded.updated_at, completed_at = excluded.completed_at`
    ).bind(user.id, slug, enrolledAt, updatedAt || now, completedAt));
  }

  if (statements.length) await env.DB.batch(statements);
  return json({ user_id: user.id, courses: await loadState(env, user.id) });
}
