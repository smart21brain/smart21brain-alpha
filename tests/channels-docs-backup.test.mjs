// Smart21Institution — e-mail/SMS/push, student documents, file backup & restore, offline replay.
// Run:  node --no-warnings tests/channels-docs-backup.test.mjs
// Runs against the real schema in a local SQLite database (stand-in for D1), an in-memory R2 stand-in, and a
// fake network (no e-mail, SMS or push service is ever contacted).
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import worker from '../src/index.js';
import { notify } from '../src/lib/institution-auth.js';
import { flushOutbox, vapidAuthHeader, vapidPublicKey, normalisePhone, isAllowedPushEndpoint, channelStatus } from '../src/lib/institution-channels.js';
import { restoreFileBatch } from '../src/handlers/institution/backup-files.js';

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

// R2 stand-in with head / list / get(text, arrayBuffer) / put / delete. `uploaded` can be aged to test cleanup.
const store = new Map();
const toBytes = (v) => (typeof v === 'string' ? new TextEncoder().encode(v) : v instanceof ArrayBuffer ? new Uint8Array(v.slice(0)) : new Uint8Array(v));
const obj = (k, x) => ({ key: k, size: x.v.length, uploaded: x.uploaded, httpMetadata: x.o && x.o.httpMetadata, body: x.v, text: async () => new TextDecoder().decode(x.v), arrayBuffer: async () => x.v.buffer.slice(x.v.byteOffset, x.v.byteOffset + x.v.byteLength) });
const MATERIALS = {
  put: async (k, v, o) => { store.set(k, { v: toBytes(v), o, uploaded: new Date() }); },
  get: async (k) => { const x = store.get(k); return x ? obj(k, x) : null; },
  head: async (k) => { const x = store.get(k); return x ? { key: k, size: x.v.length } : null; },
  delete: async (k) => { store.delete(k); },
  list: async ({ prefix = '', cursor, limit = 1000 }) => { const keys = [...store.keys()].filter((k) => k.startsWith(prefix)).sort(); const start = cursor ? keys.indexOf(cursor) + 1 : 0; const page = keys.slice(start, start + limit); return { objects: page.map((k) => ({ key: k, size: store.get(k).v.length, uploaded: store.get(k).uploaded })), truncated: start + limit < keys.length, cursor: page[page.length - 1] }; },
};
const ASSETS = { fetch: async (r) => new Response('ASSET ' + new URL(r.url).pathname) };

// real VAPID key pair for the push check
const kp = await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const vapidJwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const env = { DB, MATERIALS, ASSETS };
const H = 'https://t.test';
let pass = 0, failn = 0;
const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL:', m); } };

// fake network: records every outbound call, answers like the real services would
const calls = []; let emailStatus = 200; let pushStatus = 201;
const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init = {}) => {
  const u = String(url);
  if (u.startsWith('https://api.resend.com')) { calls.push({ svc: 'email', init, body: JSON.parse(init.body) }); return new Response('{"id":"x"}', { status: emailStatus }); }
  if (u.includes('africastalking.com')) { calls.push({ svc: 'sms', init, form: Object.fromEntries(new URLSearchParams(String(init.body))) }); return new Response(JSON.stringify({ SMSMessageData: { Recipients: [{ statusCode: 101, status: 'Success' }] } }), { status: 201 }); }
  if (u.startsWith('https://fcm.googleapis.com')) { calls.push({ svc: 'push', url: u, init }); return new Response('', { status: pushStatus }); }
  throw new Error('unexpected outbound call to ' + u);
};

async function call(method, path, { body, cookie, form, headers: extra } = {}) {
  const headers = { Origin: H, ...(extra || {}) };
  if (cookie) headers.Cookie = 's21_session=' + cookie;
  let b;
  if (form) b = form; else if (body !== undefined) { headers['Content-Type'] = 'application/json'; b = JSON.stringify(body); }
  const res = await worker.fetch(new Request(H + path, { method, headers, body: b }), env, { waitUntil(p) { pending.push(p); } });
  const buf = await res.arrayBuffer(); const text = new TextDecoder().decode(buf); let data = null; try { data = JSON.parse(text); } catch (e) { data = text; }
  return { status: res.status, data, headers: res.headers, bytes: new Uint8Array(buf) };
}
const pending = [];
const mkUser = (id, name, token) => { raw.prepare(`INSERT INTO users (id, name, email, password_hash, password_salt, role) VALUES (?, ?, ?, 'x', 'x', 'user')`).run(id, name, `${name}@x.test`); raw.prepare(`INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, datetime('now','+1 day'))`).run(token, id); };
mkUser(101, 'owner', 'tok-owner'); mkUser(102, 'stud', 'tok-stud'); mkUser(103, 'other', 'tok-other'); mkUser(104, 'lib', 'tok-lib'); mkUser(105, 'stud2', 'tok-stud2'); mkUser(106, 'admin', 'tok-admin');
raw.prepare(`INSERT INTO ins_institutions (id, name, short_name, slug) VALUES (1, 'Demo College', 'DC', 'demo'), (2, 'Other College', 'OC', 'other')`).run();
raw.prepare(`INSERT INTO ins_students (id, institution_id, student_no, full_name, phone) VALUES (1, 1, 'STU0001', 'Asha Juma', '0712 345 678'), (2, 1, 'STU0002', 'Baraka Mussa', NULL)`).run();
raw.prepare(`INSERT INTO ins_members (institution_id, user_id, role, student_id) VALUES (1, 101, 'super_admin', NULL), (1, 102, 'student', 1), (1, 105, 'student', 2), (2, 103, 'super_admin', NULL), (1, 104, 'librarian', NULL), (1, 106, 'admin', NULL)`).run();
for (const [role, perm] of [['librarian', 'students.view'], ['admin', 'students.manage'], ['admin', 'settings.manage']]) raw.prepare('INSERT INTO ins_role_permissions (institution_id, role, permission) VALUES (1, ?, ?)').run(role, perm);
const O = 'tok-owner';

// =====================================================================================================
// 1. Channels: nothing configured → nothing queued; configured → queued and sent through the right provider
// =====================================================================================================
await notify(env, 1, 102, 'overdue', 'No channels yet', 'x', '#my-library');
ok(raw.prepare('SELECT COUNT(*) n FROM ins_outbox').get().n === 0, 'no provider configured → nothing is queued (in-app only, as before)');
ok(raw.prepare('SELECT COUNT(*) n FROM ins_notifications').get().n === 1, 'the in-app notification is still created');

Object.assign(env, { RESEND_API_KEY: 're_test', EMAIL_FROM: 'Uhuru <no-reply@uhuru.test>', AT_API_KEY: 'at_key', AT_USERNAME: 'uhuru', VAPID_PRIVATE_JWK: JSON.stringify(vapidJwk), VAPID_SUBJECT: 'mailto:admin@uhuru.test', SITE_URL: 'https://uhuru.test' });
raw.prepare(`INSERT INTO ins_settings (institution_id, key, value) VALUES (1, 'notify_sms', '1')`).run();   // SMS costs money: the institution switches it on itself
const st = channelStatus(env);
ok(st.email && st.sms && st.push && st.sms_provider === 'africastalking', 'server reports the three channels as configured');
ok(!JSON.stringify(st).includes('re_test') && !JSON.stringify(st).includes(vapidJwk.d), 'channel status never leaks a secret');
ok(normalisePhone('0712 345 678', env) === '+255712345678' && normalisePhone('+255 712-345-678') === '+255712345678' && normalisePhone('0012025550123') === '+12025550123' && normalisePhone('abc') === null, 'phone numbers are normalised (Tanzania default, +, 00)');
ok(isAllowedPushEndpoint('https://fcm.googleapis.com/fcm/send/abc') && !isAllowedPushEndpoint('https://evil.example/x') && !isAllowedPushEndpoint('http://fcm.googleapis.com/x'), 'only real push services are accepted as push endpoints');

// push subscription through the API
let r = await call('POST', '/api/institution/push/subscribe', { cookie: 'tok-stud', body: { endpoint: 'https://evil.example/hook' } });
ok(r.status === 400, 'a push endpoint pointing at an arbitrary site is refused (no server-side request forgery)');
r = await call('POST', '/api/institution/push/subscribe', { cookie: 'tok-stud', body: { endpoint: 'https://fcm.googleapis.com/fcm/send/dev1' } });
ok(r.status === 200 && raw.prepare('SELECT COUNT(*) n FROM ins_push_subscriptions WHERE user_id = 102').get().n === 1, 'student can subscribe a device to push');
r = await call('POST', '/api/institution/push/subscribe', { body: { endpoint: 'https://fcm.googleapis.com/fcm/send/dev1' } });
ok(r.status === 401, 'anonymous cannot subscribe');

// student phone comes from the student record; an overdue notice goes to all three channels
await notify(env, 1, 102, 'overdue', 'A book is overdue <b>now</b>', 'Return "Maths" soon', '#my-library');
ok(raw.prepare(`SELECT COUNT(*) n FROM ins_outbox WHERE status = 'pending'`).get().n === 3, 'an overdue notice queues e-mail, SMS and push');
let f = await flushOutbox(env);
ok(f.sent === 3, `all three channels sent (got ${JSON.stringify(f)})`);
const em = calls.find((c) => c.svc === 'email'); const sm = calls.find((c) => c.svc === 'sms'); const pu = calls.find((c) => c.svc === 'push');
ok(em && em.body.to[0] === 'stud@x.test' && em.init.headers.Authorization === 'Bearer re_test' && em.body.from.includes('no-reply@uhuru.test'), 'e-mail goes to the person\'s own address through the provider');
ok(em && !em.body.html.includes('<b>now</b>') && em.body.html.includes('&lt;b&gt;now&lt;/b&gt;'), 'e-mail HTML is escaped (no injected markup)');
ok(em && em.body.html.includes('https://uhuru.test/institution-app.html#my-library'), 'e-mail has an Open link built from SITE_URL');
ok(sm && sm.form.to === '+255712345678' && sm.init.headers.apiKey === 'at_key' && sm.form.username === 'uhuru' && sm.form.message.startsWith('Demo College:'), 'SMS goes to the student record phone, normalised');
ok(pu && pu.init.headers.Authorization.startsWith('vapid t=') && pu.init.headers['Content-Length'] === '0', 'push is sent with a VAPID header and no payload');
// verify the VAPID JWT really is signed by our key and names the push service as audience
{
  const hdr = pu.init.headers.Authorization; const jwt = hdr.match(/t=([^,]+)/)[1]; const [h, c, s] = jwt.split('.');
  const bytes = (x) => Uint8Array.from(atob(x.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (x.length % 4)) % 4)), (ch) => ch.charCodeAt(0));
  const valid = await crypto.subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, kp.publicKey, bytes(s), new TextEncoder().encode(h + '.' + c));
  const claims = JSON.parse(new TextDecoder().decode(bytes(c)));
  ok(valid, 'VAPID signature verifies against the public key');
  ok(claims.aud === 'https://fcm.googleapis.com' && claims.exp > Date.now() / 1000 && claims.sub === 'mailto:admin@uhuru.test', 'VAPID claims are correct');
  ok(hdr.includes('k=' + vapidPublicKey(env)), 'VAPID header carries the public key');
}
ok(raw.prepare(`SELECT COUNT(*) n FROM ins_outbox WHERE status = 'sent'`).get().n === 3, 'outbox rows are marked sent');
const before = calls.length; f = await flushOutbox(env); ok(calls.length === before && f.sent === 0, 'flushing again sends nothing twice');

// ordinary notices are not texted; the reserved-book notice can be
calls.length = 0;
await notify(env, 1, 102, 'announcement', 'Holiday', 'School closed Friday', '#announcements');
await flushOutbox(env);
ok(!calls.some((c) => c.svc === 'sms') && calls.some((c) => c.svc === 'email'), 'announcements go by e-mail/push but never by SMS (cost)');
calls.length = 0;
await notify(env, 1, 102, 'system', 'Your reserved book is ready', 'Collect it', '#my-library', { sms: true });
await flushOutbox(env);
ok(calls.some((c) => c.svc === 'sms'), 'a notice can ask for SMS explicitly');

// institution switch and personal choice
calls.length = 0;
raw.prepare(`INSERT INTO ins_settings (institution_id, key, value) VALUES (1, 'notify_email', '0')`).run();
await notify(env, 1, 102, 'overdue', 'Switch test', 'm', '#my-library'); await flushOutbox(env);
ok(!calls.some((c) => c.svc === 'email') && calls.some((c) => c.svc === 'sms'), 'institution switch turns e-mail off while SMS still goes');
ok(raw.prepare(`SELECT detail FROM ins_outbox WHERE channel = 'email' ORDER BY id DESC LIMIT 1`).get().detail === 'Turned off by the institution', 'a skipped notice records why');
raw.prepare(`UPDATE ins_settings SET value = '1' WHERE key = 'notify_email'`).run();
r = await call('PUT', '/api/institution/notification-prefs', { cookie: 'tok-stud', body: { sms_on: false, phone: 'not a number' } });
ok(r.status === 400, 'an invalid phone number is rejected with a clear message');
r = await call('PUT', '/api/institution/notification-prefs', { cookie: 'tok-stud', body: { sms_on: false, phone: '0755 111 222' } });
ok(r.status === 200 && r.data.prefs.phone === '+255755111222' && r.data.prefs.sms_on === 0, 'person can turn SMS off and save their own number');
calls.length = 0;
await notify(env, 1, 102, 'overdue', 'Pref test', 'm', '#my-library'); await flushOutbox(env);
ok(!calls.some((c) => c.svc === 'sms') && calls.some((c) => c.svc === 'email'), 'a person who turned SMS off is not texted');
r = await call('GET', '/api/institution/notification-settings', { cookie: 'tok-stud' });
ok(r.status === 200 && r.data.server.push && r.data.server.push_public_key === vapidPublicKey(env) && r.data.devices === 1 && r.data.has_email, 'settings screen data: server channels, public push key, devices');
ok(!JSON.stringify(r.data).includes('re_test') && !JSON.stringify(r.data).includes(vapidJwk.d), 'settings data contains no secret');

// failure handling: temporary error is retried, permanent error is not, gone devices are forgotten
emailStatus = 500; calls.length = 0;
await notify(env, 1, 105, 'system', 'Retry test', 'm', '#dashboard');
raw.prepare(`DELETE FROM ins_outbox WHERE channel != 'email'`).run();
await flushOutbox(env); ok(raw.prepare(`SELECT status, attempts FROM ins_outbox WHERE channel='email' ORDER BY id DESC LIMIT 1`).get().status === 'pending', 'a temporary provider error is kept for another try');
await flushOutbox(env); await flushOutbox(env);
ok(raw.prepare(`SELECT status, attempts FROM ins_outbox WHERE channel='email' ORDER BY id DESC LIMIT 1`).get().status === 'failed', 'after 3 tries the notice is marked failed (never lost silently)');
emailStatus = 200;
pushStatus = 410; await notify(env, 1, 102, 'system', 'Gone', 'm', '#dashboard'); await flushOutbox(env); pushStatus = 201;
ok(raw.prepare('SELECT COUNT(*) n FROM ins_push_subscriptions WHERE user_id = 102').get().n === 0, 'a device the push service says is gone is removed');

// test-send endpoint and its rate limit
r = await call('POST', '/api/institution/notifications/test', { cookie: 'tok-stud', body: { channel: 'email' } });
ok(r.status === 200 && r.data.ok && r.data.detail.includes('stud@x.test'), 'send-me-a-test works for e-mail');
r = await call('POST', '/api/institution/notifications/test', { cookie: 'tok-stud', body: { channel: 'push' } });
ok(r.status === 200 && r.data.ok === false && /not allowed push|has not allowed/i.test(r.data.detail), 'push test explains that this device has not allowed push yet');
r = await call('POST', '/api/institution/notifications/test', { cookie: 'tok-stud', body: { channel: 'fax' } }); ok(r.status === 400, 'unknown channel is rejected');
for (let i = 0; i < 6; i++) r = await call('POST', '/api/institution/notifications/test', { cookie: 'tok-stud', body: { channel: 'email' } });
ok(r.status === 429, 'test messages are rate limited');
r = await call('GET', '/api/institution/notifications/delivery', { cookie: 'tok-stud' }); ok(r.status === 403, 'students cannot see the delivery overview');
r = await call('GET', '/api/institution/notifications/delivery', { cookie: O }); ok(r.status === 200 && r.data.totals.length > 0, 'administrators can see delivery totals and reasons');

// a request that creates a notice delivers it afterwards through ctx.waitUntil
calls.length = 0; pending.length = 0;
r = await call('POST', '/api/institution/announcements', { cookie: O, body: { title: 'Exam week', body: 'Starts Monday', audience: 'members' } });
await Promise.all(pending);
ok(r.status < 300 && calls.some((c) => c.svc === 'email'), `announcement request triggers delivery in the background (status ${r.status})`);

// =====================================================================================================
// 2. Offline replay: the same client operation id is applied once
// =====================================================================================================
const annBefore = raw.prepare('SELECT COUNT(*) n FROM ins_announcements').get().n;
const op = { 'X-Client-Op-Id': 'op-aaaaaaaa-1111' };
const a1 = await call('POST', '/api/institution/announcements', { cookie: O, headers: op, body: { title: 'Queued while offline', body: 'Hello', audience: 'members' } });
const a2 = await call('POST', '/api/institution/announcements', { cookie: O, headers: op, body: { title: 'Queued while offline', body: 'Hello', audience: 'members' } });
ok(a1.status < 300 && a2.status === a1.status && a2.headers.get('X-Replayed') === '1', 'a replayed offline operation returns the saved answer');
ok(raw.prepare('SELECT COUNT(*) n FROM ins_announcements').get().n === annBefore + 1, 'a replayed offline operation is applied only once');
const a3 = await call('POST', '/api/institution/announcements', { cookie: O, headers: { 'X-Client-Op-Id': 'op-bbbbbbbb-2222' }, body: { title: 'Another one', body: 'Hello there', audience: 'members' } });
ok(raw.prepare('SELECT COUNT(*) n FROM ins_announcements').get().n === annBefore + 2, 'a different operation id is a different operation');
const bad = await call('POST', '/api/institution/announcements', { cookie: O, headers: { 'X-Client-Op-Id': 'x' }, body: { title: 'Bad id', body: 'Hello there', audience: 'members' } });
ok(bad.status < 300 && raw.prepare('SELECT COUNT(*) n FROM ins_announcements').get().n === annBefore + 3, 'a malformed operation id is ignored, the request still works');
// the same id from another person is not mixed up
const o2 = await call('POST', '/api/institution/announcements', { cookie: 'tok-admin', headers: op, body: { title: 'Same id different person', body: 'Hello there', audience: 'members' } });
ok(o2.headers.get('X-Replayed') !== '1', 'operation ids are scoped per person (no cross-user replay)');

// =====================================================================================================
// 3. Student documents
// =====================================================================================================
const pdf = (txt = 'doc') => new Blob([`%PDF-1.4\n${txt}`], { type: 'application/pdf' });
const up = (blob, name, extra = {}) => { const fd = new FormData(); fd.append('file', blob, name); for (const [k, v] of Object.entries(extra)) fd.append(k, v); return fd; };
r = await call('POST', '/api/institution/students/1/documents', { cookie: O, form: up(pdf('birth cert'), 'birth.pdf', { title: 'Birth certificate', doc_type: 'birth_certificate' }) });
ok(r.status === 201, `administrator can attach a document (status ${r.status})`); const docId = r.data.id;
r = await call('POST', '/api/institution/students/1/documents', { cookie: O, form: up(new Blob(['MZ\x90\x00 not a pdf']), 'virus.pdf') });
ok(r.status === 400 && /content does not match/.test(r.data.error), 'a program renamed .pdf is refused (file content is checked)');
r = await call('POST', '/api/institution/students/1/documents', { cookie: O, form: up(new Blob(['x']), 'run.exe') }); ok(r.status === 400, 'unsupported extension is refused');
r = await call('POST', '/api/institution/students/1/documents', { cookie: 'tok-lib', form: up(pdf(), 'x.pdf') }); ok(r.status === 403, 'a librarian (can view students) cannot upload documents');
r = await call('POST', '/api/institution/students/1/documents', { cookie: 'tok-stud', form: up(pdf(), 'x.pdf') }); ok(r.status === 403, 'a student cannot upload documents');
r = await call('POST', '/api/institution/students/1/documents', { cookie: 'tok-other', form: up(pdf(), 'x.pdf') }); ok([403, 404].includes(r.status), 'another institution cannot upload to this student');
r = await call('GET', '/api/institution/students/1/documents', { cookie: O });
ok(r.status === 200 && r.data.documents.length === 1 && r.data.documents[0].doc_type === 'birth_certificate' && !('file_key' in r.data.documents[0]), 'documents are listed without exposing the storage key');
r = await call('GET', '/api/institution/students/1/documents', { cookie: 'tok-stud' }); ok(r.status === 200 && r.data.documents.length === 1 && r.data.can_manage === false, 'the student sees their own documents (read only)');
r = await call('GET', '/api/institution/students/1/documents', { cookie: 'tok-stud2' }); ok(r.status === 404, 'another student cannot list them');
r = await call('GET', '/api/institution/students/1/documents', { cookie: 'tok-lib' }); ok(r.status === 404, 'a librarian cannot list them');
r = await call('GET', '/api/institution/students/1/documents', { cookie: 'tok-other' }); ok(r.status === 404, 'another institution cannot list them');
r = await call('GET', `/api/institution/student-documents/${docId}/file`, { cookie: O });
ok(r.status === 200 && r.headers.get('Content-Type') === 'application/pdf' && r.headers.get('X-Content-Type-Options') === 'nosniff' && /sandbox/.test(r.headers.get('Content-Security-Policy')) && /no-store/.test(r.headers.get('Cache-Control')) && new TextDecoder().decode(r.bytes).includes('birth cert'), 'administrator opens the file with safe headers');
r = await call('GET', `/api/institution/student-documents/${docId}/file`, { cookie: 'tok-stud' }); ok(r.status === 200, 'the student opens their own file');
for (const t of ['tok-stud2', 'tok-lib', 'tok-other']) { r = await call('GET', `/api/institution/student-documents/${docId}/file`, { cookie: t }); ok(r.status === 404, `${t} cannot open the file`); }
r = await call('GET', `/api/institution/student-documents/${docId}/file`); ok(r.status === 404, 'anonymous cannot open the file');
r = await call('GET', `/api/institution/student-documents/${docId}/file?download=1`, { cookie: O }); ok(/attachment/.test(r.headers.get('Content-Disposition')), '?download=1 forces a download');
ok(raw.prepare(`SELECT COUNT(*) n FROM ins_audit_logs WHERE action IN ('document.upload','document.open')`).get().n >= 2, 'uploads and openings are written to the audit log');
r = await call('PUT', `/api/institution/student-documents/${docId}`, { cookie: O, body: { title: 'Birth certificate (copy)', doc_type: 'certificate' } }); ok(r.status === 200, 'title and type can be changed');

// =====================================================================================================
// 4. Backups hold uploaded files; restoring puts them back
// =====================================================================================================
const put = async (k, text) => MATERIALS.put(k, new TextEncoder().encode(text), { httpMetadata: { contentType: 'application/octet-stream' } });
await put('institution/1/student/photo-asha', 'PHOTO-ASHA'); await put('institution/1/resources/book1.pdf', '%PDF BOOK ONE'); await put('institution/1/thumb/book1', 'THUMB-ONE'); await put('institution/1/resources/book2.pdf', '%PDF BOOK TWO');
raw.prepare(`UPDATE ins_students SET photo_key = 'institution/1/student/photo-asha' WHERE id = 1`).run();
raw.prepare(`INSERT INTO ins_resources (id, institution_id, title, file_key, file_name, file_size, mime, thumb_key) VALUES (1, 1, 'Book One', 'institution/1/resources/book1.pdf', 'book1.pdf', 13, 'application/pdf', 'institution/1/thumb/book1'), (2, 1, 'Book Two', 'institution/1/resources/book2.pdf', 'book2.pdf', 13, 'application/pdf', NULL)`).run();
raw.prepare(`INSERT INTO ins_resources (id, institution_id, title, file_key, file_name, file_size, mime) VALUES (3, 1, 'Ghost', 'institution/1/resources/never-uploaded.pdf', 'ghost.pdf', 1, 'application/pdf')`).run();
r = await call('POST', '/api/institution/backups', { cookie: O, body: {} });
ok(r.status === 201 && r.data.files.saved === 5 && r.data.files.missing === 1 && r.data.files.pending === 0, `backup copies the uploaded files (${JSON.stringify(r.data.files)})`);
const b1 = r.data.id;
ok(!JSON.stringify(r.data.counts).includes('_files'), 'file summary is kept out of the record counts');
r = await call('GET', '/api/institution/backups', { cookie: O });
ok(r.data.backups[0].files && r.data.backups[0].files.saved === 5 && !Object.keys(r.data.backups[0].row_counts).some((k) => k.startsWith('_')), 'backup list shows a file summary, record counts stay clean');
ok(r.data.backups[0].row_counts.ins_student_documents === 1, 'student documents (records) are part of the backup');
r = await call('POST', `/api/institution/backups/${b1}/verify`, { cookie: O, body: {} }); ok(r.data.ok && /5 uploaded files are saved/.test(r.data.detail) && /already missing/.test(r.data.detail), `verify reports the files (${r.data.detail})`);
ok([...store.keys()].filter((k) => k.includes('/backup-files/')).length === 5, 'one copy per original file in the private backup folder');
const copiesBefore = [...store.keys()].filter((k) => k.includes('/backup-files/'));
r = await call('POST', '/api/institution/backups', { cookie: O, body: {} });
ok(JSON.stringify([...store.keys()].filter((k) => k.includes('/backup-files/')).sort()) === JSON.stringify(copiesBefore.sort()), 'a second backup reuses the copies instead of duplicating them');

// disaster: records changed and files lost
const docKey = raw.prepare('SELECT file_key FROM ins_student_documents WHERE id = ?').get(docId).file_key;
for (const k of ['institution/1/student/photo-asha', 'institution/1/resources/book1.pdf', 'institution/1/thumb/book1', docKey]) store.delete(k);
raw.prepare('DELETE FROM ins_resources WHERE id IN (1,2)').run(); raw.prepare('DELETE FROM ins_student_documents').run();
r = await call('POST', `/api/institution/backups/${b1}/restore`, { cookie: O, body: { confirm: 'RESTORE' } });
ok(r.status === 200 && r.data.files && r.data.files.restored === 4 && r.data.files.present === 1 && r.data.files.missing === 1 && r.data.files.next === null, `restore puts the lost files back (${JSON.stringify(r.data.files)})`);
const dec = async (k) => (store.has(k) ? new TextDecoder().decode(store.get(k).v) : null);
ok((await dec('institution/1/student/photo-asha')) === 'PHOTO-ASHA' && (await dec('institution/1/resources/book1.pdf')) === '%PDF BOOK ONE' && (await dec('institution/1/thumb/book1')) === 'THUMB-ONE', 'photo, e-library file and thumbnail are back with the right content');
ok((await dec(docKey)).includes('birth cert') && raw.prepare('SELECT COUNT(*) n FROM ins_student_documents').get().n === 1, 'the student document and its file are both restored');
r = await call('GET', `/api/institution/student-documents/${docId}/file`, { cookie: O }); ok(r.status === 200 && new TextDecoder().decode(r.bytes).includes('birth cert'), 'a restored document can be opened again through the app');
r = await call('GET', '/api/institution/resources/1/file', { cookie: O }); ok(r.status === 200, 'a restored e-library file can be opened again through the app');
r = await call('POST', `/api/institution/backups/${b1}/restore-files`, { cookie: O, body: { start: 0 } }); ok(r.status === 200 && r.data.files.restored === 0 && r.data.files.present === 5, 'running the file restore again is safe (nothing is overwritten or duplicated)');
r = await call('POST', `/api/institution/backups/${b1}/restore`, { cookie: 'tok-admin', body: { confirm: 'RESTORE' } }); ok(r.status === 403, 'only the Super Administrator can restore');
r = await call('POST', `/api/institution/backups/${b1}/restore-files`, { cookie: 'tok-admin', body: {} }); ok(r.status === 403, 'only the Super Administrator can restore files');
r = await call('POST', `/api/institution/backups/${b1}/restore-files`, { cookie: 'tok-other', body: {} }); ok([403, 404].includes(r.status), 'another institution cannot restore this backup\'s files');

// a lost copy is detected by verify
const aBlob = [...store.keys()].find((k) => k.includes('/backup-files/')); store.delete(aBlob);
r = await call('POST', `/api/institution/backups/${b1}/verify`, { cookie: O, body: {} }); ok(r.data.ok === false && /missing from backup storage/.test(r.data.detail), 'verify fails when a saved file copy has gone missing');

// backups made before this feature still verify and restore (records only)
const oldKey = 'institution/1/backups/old.json';
const oldPayload = JSON.stringify({ app: 'Smart21Institution', format: 1, created: '2026-01-01', tables: { ins_students: [{ id: 1, institution_id: 1, student_no: 'STU0001', full_name: 'Asha Juma', phone: '0712 345 678' }] } });
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const sum = hex(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(oldPayload)));
await MATERIALS.put(oldKey, oldPayload, {});
const oldId = raw.prepare(`INSERT INTO ins_backups (institution_id, file_key, size_bytes, row_counts, checksum) VALUES (1, ?, ?, '{"ins_students":1}', ?)`).run(oldKey, oldPayload.length, sum).lastInsertRowid;
r = await call('POST', `/api/institution/backups/${oldId}/verify`, { cookie: O, body: {} }); ok(r.data.ok && /records only/.test(r.data.detail), 'an older backup (no file copies, no documents table) still verifies');
raw.prepare(`INSERT INTO ins_student_documents (institution_id, student_id, title, file_key, file_name, mime) VALUES (1, 1, 'Keep me', 'institution/1/student-docs/keep.pdf', 'keep.pdf', 'application/pdf')`).run();
r = await call('POST', `/api/institution/backups/${oldId}/restore`, { cookie: O, body: { confirm: 'RESTORE' } });
ok(r.status === 200 && r.data.files === null && raw.prepare(`SELECT COUNT(*) n FROM ins_student_documents WHERE title = 'Keep me'`).get().n === 1, 'restoring an older backup leaves tables it never contained (documents) untouched');

// safety: a tampered manifest cannot write outside this institution or into the backup folder
const evil = [{ k: 'institution/2/student/secret', b: 'institution/1/backup-files/aaa', st: 'saved' }, { k: 'institution/1/../x', b: 'institution/1/backup-files/aaa', st: 'saved' }, { k: 'institution/1/backup-files/zzz', b: 'institution/1/backup-files/aaa', st: 'saved' }, { k: 'institution/1/student/ok', b: 'institution/2/backup-files/other', st: 'saved' }];
await put('institution/1/backup-files/aaa', 'X');
const rb = await restoreFileBatch(env, 1, evil, 0, 50);
ok(rb.failed === 4 && rb.restored === 0 && !store.has('institution/2/student/secret') && !store.has('institution/1/student/ok'), 'a tampered manifest is refused entry by entry');

// batching: a big restore is spread over several requests
const many = []; for (let i = 0; i < 5; i++) { await put(`institution/1/backup-files/m${i}`, 'D' + i); many.push({ k: `institution/1/resources/many${i}.pdf`, b: `institution/1/backup-files/m${i}`, st: 'saved' }); }
let batch = await restoreFileBatch(env, 1, many, 0, 2); ok(batch.restored === 2 && batch.next === 2, 'restore works in batches');
batch = await restoreFileBatch(env, 1, many, batch.next, 2); batch = await restoreFileBatch(env, 1, many, batch.next, 2);
ok(batch.next === null && many.every((m) => store.has(m.k)), 'the last batch finishes the job');

// partial copy: only a few new files per run; the next backup continues
env.BACKUP_FILE_COPIES_PER_RUN = '3';   // 4 new files + 1 copy deleted earlier = 5 to copy, 3 per run
for (let i = 0; i < 4; i++) await put(`institution/1/resources/new${i}.pdf`, 'N' + i);
for (let i = 0; i < 4; i++) raw.prepare(`INSERT INTO ins_resources (institution_id, title, file_key, file_name, file_size, mime) VALUES (1, ?, ?, 'n.pdf', 2, 'application/pdf')`).run('New ' + i, `institution/1/resources/new${i}.pdf`);
r = await call('POST', '/api/institution/backups', { cookie: O, body: {} });
ok(r.data.files.pending === 2 && r.data.files.saved >= 3, `a big batch of new files is copied in parts (${JSON.stringify(r.data.files)})`);
const bPart = r.data.id;
r = await call('POST', '/api/institution/backups', { cookie: O, body: {} });
ok(r.data.files.pending === 0, 'the next backup finishes the remaining files');
r = await call('POST', `/api/institution/backups/${bPart}/verify`, { cookie: O, body: {} }); ok(/will be saved by the next backup/.test(r.data.detail), 'verify tells the administrator that a partial backup is partial');
delete env.BACKUP_FILE_COPIES_PER_RUN;

// cleanup: when old backups are pruned, copies nobody refers to any more are removed (but fresh copies are protected)
const lonely = 'institution/1/backup-files/lonely'; await put(lonely, 'orphan'); store.get(lonely).uploaded = new Date(Date.now() - 3 * 86400000);
const fresh = 'institution/1/backup-files/fresh'; await put(fresh, 'new orphan');
r = await call('DELETE', `/api/institution/backups/${bPart}`, { cookie: O });
ok(r.status === 200 && !store.has(lonely), 'an old copy that no backup refers to is cleaned up');
ok(store.has(fresh), 'a copy younger than a day is kept (it may belong to a backup being written)');
ok(![...store.keys()].some((k) => k.endsWith('.files.json') && !raw.prepare('SELECT 1 FROM ins_backups').get()), 'manifests are only kept for existing backups');
ok(!store.has(`${'institution/1/backups/'}`), 'sanity');

// tenant isolation of the file copies
r = await call('GET', '/api/institution/backups', { cookie: 'tok-other' }); ok(r.status === 200 && r.data.backups.length === 0, 'another institution sees none of these backups');

console.log(`\n${pass} passed, ${failn} failed`);
globalThis.fetch = realFetch;
process.exit(failn ? 1 : 0);
