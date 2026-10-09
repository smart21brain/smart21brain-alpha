// Smart21Institution — tenant isolation check (each admin has their own private workspace).
// Run:  node --no-warnings tests/tenant-isolation.test.mjs
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

// ---- Tenant isolation: every admin gets their OWN workspace -------------------------------
const reg = async (inst, email, ip) => {
  const raw = await worker.fetch(new Request(H + '/api/institution/register', { method: 'POST', headers: { Origin: H, 'Content-Type': 'application/json', 'CF-Connecting-IP': ip },
    body: JSON.stringify({ institution_name: inst, inst_type: 'college', name: inst + ' Admin', email, password: 'Secret123!', phone: '' }) }), env, { waitUntil() {} });
  const m = (raw.headers.get('Set-Cookie') || '').match(/s21_session=([^;]+)/);
  return { status: raw.status, cookie: m && m[1], data: await raw.json() };
};
const A = await reg('Kilimanjaro College', 'a@kili.test', '1.1.1.1');
const B = await reg('Bahari Institute', 'b@bahari.test', '2.2.2.2');
ok(A.status === 201 && B.status === 201 && A.data.institution_id !== B.data.institution_id, 'each admin gets a separate institution');

let r = await call('GET', '/api/institution/context', { cookie: B.cookie });
ok(r.data.institution.name === 'Bahari Institute' && r.data.memberships.length === 1, 'B sees only their own institution');
ok(!JSON.stringify(r.data).includes('Kilimanjaro'), "B's session never mentions A's institution");

// A adds data; B must not see it
r = await call('POST', '/api/institution/departments', { cookie: A.cookie, body: { name: 'Secret Dept A', code: 'SDA' } });
const secret = r.status;
r = await call('GET', '/api/institution/lookups', { cookie: B.cookie });
ok(!JSON.stringify(r.data).includes('Secret Dept A'), "B cannot see A's data");
r = await call('GET', '/api/institution/students', { cookie: B.cookie }); ok(r.status === 200 && (r.data.students || r.data.items || []).length === 0, "B's student list is empty (own database)");

// B tries to act inside A's institution by sending A's id: server ignores it and keeps B in their own
const rb = await worker.fetch(new Request(H + '/api/institution/context', { headers: { Cookie: 's21_session=' + B.cookie, 'X-Institution-Id': String(A.data.institution_id) } }), env, { waitUntil() {} });
const cb = await rb.json(); ok(cb.institution.id === B.data.institution_id, "forged X-Institution-Id cannot switch B into A's institution");
const rq = await worker.fetch(new Request(H + '/api/institution/context?institution_id=' + A.data.institution_id, { headers: { Cookie: 's21_session=' + B.cookie } }), env, { waitUntil() {} });
ok((await rq.json()).institution.id === B.data.institution_id, 'institution_id query parameter cannot switch tenant either');

// Public entry page never lists institutions
r = await call('GET', '/api/institution/public-sites'); ok(r.data.sites.length === 0, 'entry page lists no institutions');

// Roles: a person invited to B is not a member of A
r = await call('GET', '/api/institution/users', { cookie: B.cookie });
ok(!JSON.stringify(r.data).includes('a@kili.test'), "A's admin is not listed among B's users");

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);
