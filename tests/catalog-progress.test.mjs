// Run: node --test tests/catalog-progress.test.mjs
// Exercises the real handlers against a real SQLite database built from
// schema.sql (D1 is SQLite), through a thin D1-compatible shim.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { getCatalogProgress, saveCatalogProgress } from '../src/handlers/catalog-progress.js';
import { getDashboard } from '../src/handlers/dashboard.js';
import { CATALOG } from '../src/lib/catalog-index.js';

function makeD1(db) {
  return {
    prepare(sql) {
      const stmt = db.prepare(sql);
      let params = [];
      const o = {
        bind(...p) { params = p; return o; },
        async first() { return stmt.get(...params) || null; },
        async all() { return { results: stmt.all(...params) }; },
        async run() { const r = stmt.run(...params); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: r.changes } }; },
        _run() { return stmt.run(...params); },
      };
      return o;
    },
    async batch(stmts) {
      db.exec('BEGIN');
      try { for (const s of stmts) s._run(); db.exec('COMMIT'); } catch (e) { db.exec('ROLLBACK'); throw e; }
      return [];
    },
  };
}

function setup() {
  const raw = new DatabaseSync(':memory:');
  raw.exec(readFileSync(new URL('../schema.sql', import.meta.url), 'utf8'));
  const env = { DB: makeD1(raw) };
  const user = (name, token) => {
    const r = raw.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, 'x', 'y', 'user')").run(name, `${name}@t.test`);
    raw.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))").run(token, r.lastInsertRowid);
    return r.lastInsertRowid;
  };
  return { raw, env, user };
}
const req = (token, body) => new Request('http://x/api', {
  method: body ? 'POST' : 'GET', headers: token ? { Cookie: `s21_session=${token}`, 'Content-Type': 'application/json' } : {},
  body: body ? JSON.stringify(body) : undefined,
});
const post = async (env, token, courses) => (await saveCatalogProgress({ request: req(token, { courses }), env })).json();
const dash = async (env, token) => (await getDashboard({ request: req(token), env })).json();

const FR = 'fractions-made-fun';
const ids = (slug, n) => CATALOG[slug].lessons.slice(0, n ?? CATALOG[slug].lessons.length);
const state = (slug, n, over = {}) => {
  const now = Date.now();
  const list = ids(slug, n);
  return { [slug]: { enrolled_at: now - 1000, updated_at: now, completed: list, times: Object.fromEntries(list.map((i) => [i, new Date(now).toISOString()])), ...over } };
};

test('signed-out requests are refused', async () => {
  const { env } = setup();
  assert.equal((await getCatalogProgress({ request: req(null), env })).status, 401);
  assert.equal((await saveCatalogProgress({ request: req(null, { courses: {} }), env })).status, 401);
});

test('progress saves to the account and comes back on another device', async () => {
  const { env, user } = setup(); user('ann', 'tokA');
  assert.deepEqual((await (await getCatalogProgress({ request: req('tokA'), env })).json()).courses, {});
  const saved = await post(env, 'tokA', state(FR, 3));
  assert.equal(saved.courses[FR].completed.length, 3);
  // "another phone": a fresh GET returns the same
  const again = await (await getCatalogProgress({ request: req('tokA'), env })).json();
  assert.deepEqual(again.courses[FR].completed.sort(), ids(FR, 3).sort());
  assert.equal(again.courses[FR].completed_at, null);
});

test('XP, level, streak count lessons; finishing a course adds the bonus and the subject badge', async () => {
  const { env, user } = setup(); user('bo', 'tokB');
  let d = await dash(env, 'tokB');
  assert.equal(d.xp, 0); assert.equal(d.streak_days, 0); assert.equal(d.badges.math_master, false);

  await post(env, 'tokB', state(FR, 3));
  d = await dash(env, 'tokB');
  assert.equal(d.lessons_completed, 3);
  assert.equal(d.xp, 30);
  assert.equal(d.streak_days, 1);
  assert.equal(d.courses_completed, 0);
  assert.equal(d.badges.math_master, false);

  const full = state(FR, undefined, { updated_at: Date.now() + 5 });
  const saved = await post(env, 'tokB', full);
  assert.ok(saved.courses[FR].completed_at, 'server marks the course completed');
  d = await dash(env, 'tokB');
  const n = CATALOG[FR].lessons.length;
  assert.equal(d.xp, n * 10 + 50);
  assert.equal(d.courses_completed, 1);
  assert.equal(d.badges.math_master, true);
  assert.equal(d.level, Math.floor((n * 10 + 50) / 200) + 1);
  assert.ok(d.earned_badges.includes('math_master'));
});

test('other subjects unlock their own badges', async () => {
  const { env, user } = setup(); user('cy', 'tokC');
  const cases = { 'science-explorers-human-body': 'science_star', 'coding-for-beginners-scratch': 'coding_hero', 'art-music-and-creativity': 'creative_star', 'english-reading-starter': 'book_explorer' };
  let t = Date.now();
  for (const [slug, badge] of Object.entries(cases)) {
    t += 10;
    await post(env, 'tokC', state(slug, undefined, { updated_at: t }));
    assert.equal((await dash(env, 'tokC')).badges[badge], true, `${slug} -> ${badge}`);
  }
});

test('only real lessons count; unknown courses are ignored; no XP from invented ids', async () => {
  const { env, user } = setup(); user('di', 'tokD');
  const now = Date.now();
  const out = await post(env, 'tokD', {
    [FR]: { enrolled_at: now, updated_at: now, completed: [`${FR}::1`, `${FR}::999`, 'made-up::1', `${FR}::1`], times: {} },
    'not-a-course': { enrolled_at: now, updated_at: now, completed: ['x::1'], times: {} },
  });
  assert.deepEqual(out.courses[FR].completed, [`${FR}::1`]);
  assert.equal(out.courses['not-a-course'], undefined);
  assert.equal((await dash(env, 'tokD')).xp, 10);
});

test('newest write wins per course; a stale device cannot overwrite; completion is never un-earned', async () => {
  const { env, user } = setup(); user('ed', 'tokE');
  const t = Date.now();
  await post(env, 'tokE', state(FR, undefined, { updated_at: t }));           // finishes the course
  const stale = await post(env, 'tokE', state(FR, 1, { updated_at: t - 5000 })); // an old device
  assert.equal(stale.courses[FR].completed.length, CATALOG[FR].lessons.length, 'older write ignored');
  const undone = await post(env, 'tokE', state(FR, 2, { updated_at: t + 50 }));   // newer: learner un-ticked lessons
  assert.equal(undone.courses[FR].completed.length, 2);
  assert.ok(undone.courses[FR].completed_at, 'completed_at is kept once earned');
});

test('a wrong clock far in the future cannot lock the course', async () => {
  const { env, user } = setup(); user('fy', 'tokF');
  const far = Date.now() + 365 * 24 * 3600 * 1000;
  const first = await post(env, 'tokF', state(FR, 1, { updated_at: far }));
  assert.ok(first.courses[FR].updated_at <= Date.now() + 5, 'clamped to server time');
  const later = await post(env, 'tokF', state(FR, 4, { updated_at: Date.now() + 20 }));
  assert.equal(later.courses[FR].completed.length, 4, 'a normal later write is accepted');
});

test('streak counts consecutive days with a finished lesson', async () => {
  const { env, user, raw } = setup(); const id = user('gi', 'tokG');
  const day = (n) => new Date(Date.now() - n * 86400000).toISOString();
  for (const [i, n] of [[1, 0], [2, 1], [3, 2]]) {
    raw.prepare('INSERT INTO catalog_progress (user_id, course_slug, lesson_id, completed_at) VALUES (?, ?, ?, ?)').run(id, FR, `${FR}::${i}`, day(n));
  }
  const d = await dash(env, 'tokG');
  assert.equal(d.streak_days, 3);
});

test('database-course lessons also count toward XP', async () => {
  const { env, user, raw } = setup(); const id = user('hu', 'tokH');
  raw.prepare("INSERT INTO courses (title, slug, published) VALUES ('T','t-course',1)").run();
  const c = raw.prepare("SELECT id FROM courses WHERE slug='t-course'").get();
  raw.prepare("INSERT INTO course_lessons (course_id, title, sort_order) VALUES (?, 'L1', 1)").run(c.id);
  const l = raw.prepare('SELECT id FROM course_lessons WHERE course_id=?').get(c.id);
  raw.prepare("INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at) VALUES (?, ?, 1, ?)").run(id, l.id, new Date().toISOString());
  const d = await dash(env, 'tokH');
  assert.equal(d.lessons_completed, 1); assert.equal(d.xp, 10);
});

test("one learner's progress is invisible to another", async () => {
  const { env, user } = setup(); user('ia', 'tokI'); user('jo', 'tokJ');
  await post(env, 'tokI', state(FR, 5));
  assert.deepEqual((await (await getCatalogProgress({ request: req('tokJ'), env })).json()).courses, {});
  assert.equal((await dash(env, 'tokJ')).xp, 0);
});

test('dashboard still works before catalog-progress-schema.sql has been applied', async () => {
  const { env, user, raw } = setup(); user('ke', 'tokK');
  raw.exec('DROP TABLE catalog_progress; DROP TABLE catalog_enrollments;');
  const res = await getDashboard({ request: req('tokK'), env });
  assert.equal(res.status, 200);
  assert.equal((await res.json()).xp, 0);
});
