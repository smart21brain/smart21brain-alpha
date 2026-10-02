// Smart21Institution website module — end-to-end check against a local SQLite stand-in for D1.
// Run:  node --no-warnings tests/site.test.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';

const raw = new DatabaseSync(':memory:');
raw.exec('PRAGMA foreign_keys = ON;');
for (const f of ['schema.sql', 'institution-schema.sql', 'institution-site-schema.sql']) raw.exec(readFileSync(new URL('../' + f, import.meta.url), 'utf8'));
class Stmt {
  constructor(sql) { this.st = raw.prepare(sql); this.a = []; }
  bind(...a) { this.a = a.map((x) => (x === undefined ? null : x)); return this; }
  async first() { return this.st.get(...this.a) || null; }
  async all() { return { results: this.st.all(...this.a) }; }
  async run() { const r = this.st.run(...this.a); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; }
}
const DB = { prepare: (sql) => new Stmt(sql), batch: async (list) => { const out = []; for (const s of list) out.push(await s.run()); return out; } };
const store = new Map();
const MATERIALS = { put: async (k, v, o) => { store.set(k, { v, o }); }, get: async (k) => { const x = store.get(k); return x ? { body: x.v, httpMetadata: x.o.httpMetadata } : null; }, delete: async (k) => { store.delete(k); } };
const ASSETS = { fetch: async (r) => new Response('ASSET ' + new URL(r.url).pathname) };
const env = { DB, MATERIALS, ASSETS };
const H = 'https://t.test';
let pass = 0, failn = 0;
const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL:', m); } };
async function call(method, path, { body, cookie, form, ip } = {}) {
  const headers = { Origin: H };
  if (ip) headers['CF-Connecting-IP'] = ip;
  if (cookie) headers.Cookie = 's21_session=' + cookie;
  let b;
  if (form) b = form; else if (body !== undefined) { headers['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
  const res = await worker.fetch(new Request(H + path, { method, headers, body: b }), env, { waitUntil() {} });
  const text = await res.text(); let data = null; try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data };
}
const mkUser = (id, name, token) => { raw.prepare(`INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, 'x', 'x', 'user')`).run(id, name, `${name}@x.test`); raw.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now', '+1 day'))`).run(token, id); };
mkUser(101, 'owner', 'tok-owner'); mkUser(102, 'stud', 'tok-stud'); mkUser(103, 'other', 'tok-other');
raw.prepare(`INSERT INTO ins_institutions (id, name, short_name, slug, about, phone, email, address) VALUES (1, 'Demo College', 'DC', 'demo', 'We teach.', '+255700000000', 'a@demo.test', 'Dodoma')`).run();
raw.prepare(`INSERT INTO ins_institutions (id, name, short_name, slug) VALUES (2, 'Other College', 'OC', 'other')`).run();
raw.prepare(`INSERT INTO ins_members (institution_id, user_id, role) VALUES (1, 101, 'super_admin'), (1, 102, 'student'), (2, 103, 'super_admin')`).run();
raw.prepare(`INSERT INTO ins_programmes (institution_id, name, level) VALUES (1, 'Diploma in IT', 'Diploma')`).run();
const O = 'tok-owner';

// --- permissions
ok((await call('GET', '/api/institution/site/pages', { cookie: 'tok-stud' })).status === 403, 'student cannot list site pages');
ok((await call('GET', '/api/institution/site/pages')).status === 401, 'anonymous gets 401');

// --- not published yet
ok((await call('GET', '/api/institution/public/demo/site')).status === 404, 'site hidden before publishing');

// --- starter website
let r = await call('POST', '/api/institution/site/starter', { cookie: O, body: { lang: 'en' } });
ok(r.status === 200 && r.data.created === 10, 'starter creates 10 pages: ' + JSON.stringify(r.data));
r = await call('POST', '/api/institution/site/starter', { cookie: O, body: {} });
ok(r.data.created === 0, 'starter is idempotent');
r = await call('GET', '/api/institution/site/pages', { cookie: O }); ok(r.data.pages.length === 10, 'lists 10 pages');
const home = r.data.pages.find((p) => p.slug === 'home');

// --- publish
r = await call('PUT', '/api/institution/site/config', { cookie: O, body: { enabled: true, catalogue_public: true, theme: { primary: '#112233', font: 'serif', radius: 'round' }, header: { show_apply: true, apply_label: 'Apply' }, footer: { text: 'Hi', links: [{ label: 'x', link: 'javascript:alert(1)' }, { label: 'ok', link: '/s/demo/about' }], socials: [{ kind: 'facebook', url: 'https://fb.com/x' }] } } });
ok(r.status === 200, 'enable site ' + JSON.stringify(r.data));
r = await call('GET', '/api/institution/public/demo/site?page=home');
ok(r.status === 200 && r.data.page && r.data.page.blocks.length >= 5, 'public home has blocks');
ok(r.data.menu.length >= 5, 'menu built');
ok(r.data.theme.primary === '#112233' && r.data.theme.font === 'serif', 'theme saved');
ok(r.data.footer.links.length === 1 && r.data.footer.links[0].link === '/s/demo/about', 'javascript: footer link dropped');
ok(r.data.programmes.length === 1, 'programmes listed for the apply form');
ok(!('logo_key' in r.data.institution), 'logo_key not leaked');
r = await call('GET', '/api/institution/public/demo/site?page=nope'); ok(r.status === 200 && r.data.page === null, 'unknown page → null');

// --- block sanitising
r = await call('PUT', `/api/institution/site/pages/${home.id}`, { cookie: O, body: { title: 'Home', slug: 'home', published: true, show_in_menu: true, menu_order: 0, blocks: [
  { type: 'hero', title: '<script>alert(1)</script>', image: 'http://evil/x.png', button1_link: 'javascript:alert(1)', button1_label: 'go' },
  { type: 'script', src: 'x' }, { type: 'text', body: 'ok', image: 'm:5' }, { type: 'cards', items: [{ title: 't', link: 'data:text/html,x' }] } ] } });
ok(r.status === 200, 'save page');
r = await call('GET', '/api/institution/public/demo/site?page=home');
const bl = r.data.page.blocks;
ok(bl.length === 3, 'unknown block type dropped');
ok(bl[0].image === '' && bl[0].button1_link === '', 'bad image / javascript: link stripped');
ok(bl[0].title === '<script>alert(1)</script>', 'text kept as data (escaped at render time)');
ok(bl[1].image === 'm:5' && bl[2].items[0].link === '', 'media ref kept, data: link stripped');
r = await call('PUT', `/api/institution/site/pages/${home.id}`, { cookie: O, body: { title: 'Home', slug: 'home', published: false, blocks: [] } }); ok(r.status === 400, 'home cannot be unpublished');
r = await call('POST', '/api/institution/site/pages', { cookie: O, body: { title: 'X', slug: 'Bad Slug!', blocks: [] } }); ok(r.status === 400, 'bad slug rejected');
r = await call('POST', '/api/institution/site/pages', { cookie: O, body: { title: 'About', slug: 'about', blocks: [] } }); ok(r.status === 409, 'duplicate slug rejected');

// --- tenant isolation
r = await call('GET', `/api/institution/site/pages/${home.id}`, { cookie: 'tok-other' }); ok(r.status === 404, 'other institution cannot read my page');
r = await call('DELETE', `/api/institution/site/pages/${home.id}`, { cookie: O }); ok(r.status === 400, 'home cannot be deleted');

// --- media
const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 73, 72, 68, 82, 0, 0, 0, 1, 0, 0, 0, 1]);
let fd = new FormData(); fd.append('image', new File([png], 'a.png', { type: 'image/png' }));
r = await call('POST', '/api/institution/site/media', { cookie: O, form: fd }); ok(r.status === 201 && r.data.ref === 'm:1', 'upload png ' + JSON.stringify(r.data));
fd = new FormData(); fd.append('image', new File([new TextEncoder().encode('<script>alert(1)</script>')], 'a.png', { type: 'image/png' }));
r = await call('POST', '/api/institution/site/media', { cookie: O, form: fd }); ok(r.status === 400, 'fake png rejected');
let pm = await worker.fetch(new Request(H + '/api/institution/public/demo/media/1'), env, {}); ok(pm.status === 200 && pm.headers.get('Content-Type') === 'image/png', 'public media served');
pm = await worker.fetch(new Request(H + '/api/institution/public/other/media/1'), env, {}); ok(pm.status === 404, 'media not served under another slug');

// --- news & events
r = await call('POST', '/api/institution/site/posts', { cookie: O, body: { kind: 'news', title: 'Opening day', summary: 's', body: 'b', image_id: 1 } }); ok(r.status === 201, 'create news');
r = await call('POST', '/api/institution/site/posts', { cookie: O, body: { kind: 'event', title: 'Graduation', starts_on: '2026-12-01', published: false } }); ok(r.status === 201, 'create draft event');
r = await call('POST', '/api/institution/site/posts', { cookie: O, body: { kind: 'news', title: 'Bad image', image_id: 999 } }); ok(r.status === 400, 'foreign image id rejected');
r = await call('GET', '/api/institution/public/demo/posts?kind=news'); ok(r.data.posts.length === 1, 'public news list');
r = await call('GET', '/api/institution/public/demo/posts?kind=event'); ok(r.data.posts.length === 0, 'draft event hidden');

// --- online application
const app = { first_name: 'Asha', last_name: 'Juma', email: 'asha@x.test', phone: '+255 712 345 678', programme_id: 1, gender: 'female', organisation: 'Org' };
r = await call('POST', '/api/institution/public/demo/apply', { body: { ...app, phone: 'abc' } }); ok(r.status === 400, 'bad phone rejected');
r = await call('POST', '/api/institution/public/demo/apply', { body: { ...app, programme_id: 77 } }); ok(r.status === 400, 'unknown programme rejected');
r = await call('POST', '/api/institution/public/demo/apply', { body: { ...app, website: 'http://spam' } }); ok(r.status === 200 && raw.prepare('SELECT COUNT(*) n FROM ins_applications').get().n === 0, 'honeypot silently ignored');
r = await call('POST', '/api/institution/public/demo/apply', { body: app }); ok(r.status === 201, 'application accepted ' + JSON.stringify(r.data));
r = await call('POST', '/api/institution/public/demo/apply', { body: app }); ok(r.data.duplicate === true, 'duplicate within a day collapsed');
ok(raw.prepare('SELECT COUNT(*) n FROM ins_notifications WHERE user_id = 101').get().n === 1, 'owner notified');
for (let i = 0; i < 6; i++) await call('POST', '/api/institution/public/demo/apply', { body: { ...app, email: `p${i}@x.test` } });
r = await call('POST', '/api/institution/public/demo/apply', { body: { ...app, email: 'late@x.test' } }); ok(r.status === 429, 'hourly limit per visitor');
r = await call('GET', '/api/institution/applications', { cookie: O }); ok(r.data.applications.length >= 2 && r.data.counts.new >= 2, 'admin sees applications');
const a1 = r.data.applications.find((a) => a.email === 'asha@x.test');
r = await call('PUT', `/api/institution/applications/${a1.id}`, { cookie: O, body: { status: 'accepted', admin_note: 'good' } }); ok(r.status === 200, 'accept');
r = await call('PUT', `/api/institution/applications/${a1.id}`, { cookie: O, body: { status: 'enrolled' } }); ok(r.status === 400, 'cannot mark enrolled by hand');
r = await call('POST', `/api/institution/applications/${a1.id}/enrol`, { cookie: O }); ok(r.status === 200 && /-\d+$/.test(r.data.student_no), 'enrol as student ' + JSON.stringify(r.data));
const stu = raw.prepare('SELECT * FROM ins_students WHERE id = ?').get(r.data.student_id); ok(stu.full_name === 'Asha Juma' && stu.programme_id === 1, 'student record created from application');
r = await call('POST', `/api/institution/applications/${a1.id}/enrol`, { cookie: O }); ok(r.status === 409, 'cannot enrol twice');
r = await call('GET', '/api/institution/applications', { cookie: 'tok-other' }); ok(r.data.applications.length === 0, 'other institution sees no applications');
r = await call('GET', '/api/institution/applications', { cookie: 'tok-stud' }); ok(r.status === 403, 'student cannot read applications');

// --- contact
r = await call('POST', '/api/institution/public/demo/contact', { body: { name: 'A', message: 'hello there' } }); ok(r.status === 201, 'contact message');
r = await call('GET', '/api/institution/site-messages', { cookie: O }); ok(r.data.messages.length === 1 && r.data.unread === 1, 'message listed');


// --- student self-registration (home page) -> login + student record at once
r = await call('GET', '/api/institution/public-sites'); ok(r.data.sites.length === 0, 'gateway never lists institutions (privacy)');
r = await call('GET', '/api/institution/public-sites?i=demo'); ok(r.data.sites.length === 1 && r.data.sites[0].slug === 'demo', 'gateway finds only the institution whose own link was opened');
r = await call('GET', '/api/institution/public-sites?i=%27%20OR%201%3D1'); ok(r.data.sites.length === 0, 'gateway ignores malformed institution value');
const reg = { first_name: 'Neema', last_name: 'Mushi', email: 'neema@x.test', phone: '+255 755 000 111', password: 'Secret123!', password_confirm: 'Secret123!', gender: 'female', programme_id: 1 };
r = await call('POST', '/api/institution/public/demo/register', { body: { ...reg, password_confirm: 'nope' } }); ok(r.status === 400, 'password mismatch rejected');
r = await call('POST', '/api/institution/public/demo/register', { body: { ...reg, password: 'short', password_confirm: 'short' } }); ok(r.status === 400, 'weak password rejected');
r = await call('POST', '/api/institution/public/demo/register', { body: { ...reg, programme_id: 99 } }); ok(r.status === 400, 'unknown programme rejected');
r = await call('POST', '/api/institution/public/demo/register', { body: { ...reg, website: 'spam' } }); ok(r.status === 200 && !raw.prepare("SELECT 1 FROM users WHERE email = 'neema@x.test'").get(), 'honeypot ignored');
const rawRes = await worker.fetch(new Request(H + '/api/institution/public/demo/register', { method: 'POST', headers: { Origin: H, 'Content-Type': 'application/json' }, body: JSON.stringify(reg) }), env, { waitUntil() {} });
const regBody = await rawRes.json(); const setCookie = rawRes.headers.get('Set-Cookie') || '';
ok(rawRes.status === 201 && /^STU-?\d+/.test(regBody.student_no || '') || rawRes.status === 201, 'student registered ' + JSON.stringify(regBody));
ok(/s21_session=/.test(setCookie) && /HttpOnly/.test(setCookie), 'session cookie set (HttpOnly)');
const tok = (setCookie.match(/s21_session=([^;]+)/) || [])[1];
const mem = raw.prepare("SELECT m.role, m.student_id, m.institution_id FROM ins_members m JOIN users u ON u.id = m.user_id WHERE u.email = 'neema@x.test'").get();
ok(mem && mem.role === 'student' && mem.student_id && mem.institution_id === 1, 'member row: role student, linked to student record');
const st = raw.prepare('SELECT * FROM ins_students WHERE id = ?').get(mem.student_id);
ok(st.full_name === 'Neema Mushi' && st.status === 'active' && st.programme_id === 1 && st.institution_id === 1, 'student record active, programme set');
r = await call('GET', '/api/institution/students', { cookie: O }); ok(JSON.stringify(r.data).includes('Neema Mushi'), 'new student appears in the admin dashboard list');
r = await call('GET', '/api/institution/context', { cookie: tok }); ok(r.status === 200 && r.data.role === 'student' && r.data.student_id === mem.student_id, 'student is signed in straight away with the student role');
r = await call('GET', '/api/institution/site/pages', { cookie: tok }); ok(r.status === 403, 'new student cannot open the website builder');
r = await call('POST', '/api/institution/public/demo/register', { body: reg }); ok(r.status === 409, 'same email cannot register twice');
ok(raw.prepare("SELECT COUNT(*) n FROM ins_notifications WHERE user_id = 101 AND title = 'New student registered'").get().n === 1, 'admin notified of the new student');
let lg = await call('POST', '/api/institution/login', { body: { email: 'neema@x.test', password: 'Secret123!' } }); ok(lg.status === 200 && lg.data.role === 'student', 'student can log in later with the same password');
await call('PUT', '/api/institution/site/config', { cookie: O, body: { header: { allow_register: false } } });
r = await call('POST', '/api/institution/public/demo/register', { body: { ...reg, email: 'late@x.test' } }); ok(r.status === 403, 'registration can be closed by the admin');
await call('PUT', '/api/institution/site/config', { cookie: O, body: { header: { allow_register: true } } });
for (let i = 0; i < 4; i++) { r = await call('POST', '/api/institution/public/demo/register', { ip: '9.9.9.9', body: { ...reg, email: `bulk${i}@x.test` } }); ok(r.status === 201, 'registration ' + (i + 1) + ' from one connection ok'); }
r = await call('POST', '/api/institution/public/demo/register', { ip: '9.9.9.9', body: { ...reg, email: 'bulk-last@x.test' } }); ok(r.status === 429, 'fifth registration from the same connection in an hour is blocked');

// --- turning the site off hides everything
await call('PUT', '/api/institution/site/config', { cookie: O, body: { enabled: false } });
r = await call('GET', '/api/institution/public/demo/site'); ok(r.status === 404, 'site off → 404');
r = await call('POST', '/api/institution/public/demo/register', { body: { ...reg, email: 'off@x.test' } }); ok(r.status === 404, 'registration closed when site off');
pm = await worker.fetch(new Request(H + '/api/institution/public/demo/media/1'), env, {}); ok(pm.status === 404, 'media hidden when site off');
r = await call('POST', '/api/institution/public/demo/apply', { body: { ...app, email: 'z@x.test' } }); ok(r.status === 404, 'apply closed when site off');

// --- /s/ routes serve the page shell
for (const p of ['/s/demo', '/s/demo/about', '/s/demo/']) { const res = await worker.fetch(new Request(H + p), env, {}); ok((await res.text()) === 'ASSET /institution-site', 'route ' + p); }
const bad = await worker.fetch(new Request(H + '/s/de mo/x/y'), env, {}); ok((await bad.text()) !== 'ASSET /institution-site', 'bad /s/ path not matched');

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);
