import { JSDOM } from 'jsdom';
import fs from 'node:fs';
import { makeDb } from './d1shim.mjs';
const SITE = process.env.SITE_ROOT || new URL('../../', import.meta.url).pathname;
const worker = (await import(SITE + 'src/index.js')).default;
const SCRIPT = process.argv[2] || (SITE + 'js/teacher-dashboard.js');

function freshWorld({ seed = () => {}, role = 'teacher' } = {}) {
  const db = makeDb(['schema.sql', 'course-engine-schema.sql', 'migrations/phase10-teacher-dashboard.sql', 'migrations/phase11-teacher-email.sql'], false);
  const R = db.raw;
  for (const t of ['quiz_attempts','lesson_progress','course_reviews','announcements','assignments','course_enrollments','course_lessons','course_modules','courses','course_categories','quizzes','videos','materials','sessions','users']) { try { R.exec('DELETE FROM ' + t); } catch {} }
  const U = R.prepare(`INSERT INTO users (id,name,email,role,password_hash,password_salt) VALUES (?,?,?,?,'x','y')`);
  U.run(1, 'Halima Rashid', 'h@t.com', role); U.run(2, 'Other Teacher', 'o@t.com', 'teacher'); U.run(4, 'Amina Juma', 'a@t.com', 'student'); U.run(5, 'Baraka Msuya', 'b@t.com', 'student');
  R.prepare(`INSERT INTO sessions (token,user_id,expires_at) VALUES ('tok1',1,datetime('now','+1 day'))`).run();
  R.prepare(`INSERT INTO course_categories (id,name,slug) VALUES (1,'Maths','maths')`).run();
  seed(R);
  return { db, R, env: { DB: db, ASSETS: { fetch: async () => new Response('nf', { status: 404 }) } } };
}

async function openDashboard(world, { withToken = true, noBootstrap = false, failPaths = [], offline = () => false } = {}) {
  const html = fs.readFileSync(SITE + 'teachers.html', 'utf8').replace(/<script[\s\S]*?<\/script>/g, '');
  const dom = new JSDOM(html, { url: 'http://localhost/teachers.html', runScripts: 'outside-only', pretendToBeVisual: true });
  const w = dom.window; const log = { toasts: [], errors: [], redirects: [], confirms: [], prompts: [] };
  w.console.error = (...a) => log.errors.push(a.join(' '));
  w.S21_toast = (m, o) => log.toasts.push((o && o.type || 'success') + ': ' + m.replace(/&amp;/g, '&').replace(/&#39;/g, "'").replace(/&quot;/g, '"'));
  w.confirm = (m) => { log.confirms.push(m); return w.__confirmAnswer !== false; };
  w.prompt = () => (w.__promptQueue || []).shift() ?? null;
  w.scrollTo = () => {}; w.HTMLElement.prototype.scrollIntoView = () => {};
  w.fetch = async (path, init = {}) => {
    if (offline()) throw new TypeError('Failed to fetch');
    if (failPaths.some((f) => path.startsWith(f))) return new Response(JSON.stringify({ error: 'boom' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    const headers = new Headers(init.headers || {}); if (withToken) headers.set('Cookie', 's21_session=tok1');
    const req = new Request('http://localhost' + path, { method: init.method || 'GET', headers, body: typeof init.body === 'string' ? init.body : undefined });
    return worker.fetch(req, world.env, { waitUntil() {} });
  };
  if (!noBootstrap) { w.eval(fs.readFileSync(new URL('./node_modules/bootstrap/dist/js/bootstrap.bundle.js', import.meta.url), 'utf8')); }
  w.eval(fs.readFileSync(SCRIPT, 'utf8'));
  return { w, d: w.document, log, $: (s) => w.document.querySelector(s), $$: (s) => [...w.document.querySelectorAll(s)] };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function waitFor(fn, what, ms = 4000) { const t0 = Date.now(); while (Date.now() - t0 < ms) { try { const v = fn(); if (v) return v; } catch {} await sleep(25); } throw new Error('TIMEOUT waiting for: ' + what); }
let fails = 0, passes = 0;
const ok = (c, m, x) => { if (!c) { fails++; console.log('FAIL:', m, x !== undefined ? JSON.stringify(x) : ''); } else { passes++; console.log('pass:', m); } };
const setVal = (el, v) => { el.value = v; el.dispatchEvent(new el.ownerDocument.defaultView.Event('input', { bubbles: true })); el.dispatchEvent(new el.ownerDocument.defaultView.Event('change', { bubbles: true })); };
const click = (el) => el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
export { freshWorld, openDashboard, sleep, waitFor, ok, setVal, click, worker };
export const summary = () => { console.log(fails ? `\n${fails} FAILURE(S), ${passes} passed` : `\nALL ${passes} PASSED`); return fails; };
