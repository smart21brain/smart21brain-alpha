// Smart21Institution — offline queue and saved-screen logic (js/institution/extras.js) with stubbed browser pieces.
// Run:  node --no-warnings tests/offline-queue.test.mjs
// Covers the in-memory path (what runs when IndexedDB is unavailable, e.g. private mode); the logic is shared with IndexedDB.
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

let pass = 0, failn = 0;
const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL:', m); } };

const toasts = []; const sent = []; let online = true; let mode = 'ok';   // mode: ok | offline | refuse | server
const els = new Map();
const window = {
  addEventListener() {}, matchMedia: () => ({ matches: false }), isSecureContext: true,
  dispatchEvent() {}, CustomEvent: class { constructor(t, o) { this.type = t; this.detail = o && o.detail; } },
};
const IN = {
  state: { user: { id: 7 }, inst: { id: 3 } }, modules: {}, esc: (s) => String(s), t: (en) => en, isSw: () => false,
  toast: (m, t) => toasts.push({ m, t }), can: () => true, chip: (a, b) => b, dateTime: (d) => d, bytes: (n) => n, closeModal() {}, modal() { return { addEventListener() {} }; },
  confirm: async () => true, delegate() {}, route() {}, lib: async () => {},
  rawRequest: async (method, path, body, isForm, extra) => {
    if (mode === 'offline') { const e = new Error('Cannot reach the server.'); e.offline = true; throw e; }
    if (mode === 'refuse') { const e = new Error('That copy is not on loan.'); e.status = 400; throw e; }
    if (mode === 'server') { const e = new Error('Server error'); e.status = 500; throw e; }
    sent.push({ method, path, body, opId: extra.opId, instId: extra.instId });
    return { ok: true };
  },
};
const document = { getElementById: (id) => els.get(id) || null, addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, createElement: () => ({ style: {}, classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {} }), body: { appendChild() {} } };
const navigator = { get onLine() { return online; }, userAgent: 'test', platform: 'x', maxTouchPoints: 0 };
const ctx = vm.createContext({ window, document, navigator, IN, crypto: globalThis.crypto, console, setTimeout, setInterval: () => 0, clearInterval() {}, Date, Math, JSON, Promise, Array, Object, String, Number, Uint8Array, URL, Map, Error, CustomEvent: window.CustomEvent, performance: { now: () => 0 }, requestAnimationFrame: () => 0, cancelAnimationFrame() {}, atob, btoa });
window.IN = IN; ctx.window = window;
vm.runInContext(readFileSync(new URL('../js/institution/extras.js', import.meta.url), 'utf8'), ctx);
const O = IN.offline;

ok(typeof O.newId() === 'string' && /^op-[a-f0-9]{24}$/.test(O.newId()) && O.newId() !== O.newId(), 'operation ids are unique and match what the server accepts (8–64 safe characters)');
ok(/^[A-Za-z0-9_-]{8,64}$/.test(O.newId()), 'operation id format is accepted by the server check');

// ----- waiting changes
await O.enqueue({ method: 'POST', path: '/loans/return', body: { accession_no: 'ACC-1', condition: 'good' }, label: 'Return: copy ACC-1', opId: 'op-aaaaaaaa1' });
await O.enqueue({ method: 'POST', path: '/results/sheet', body: { rows: [] }, label: 'Marks: 3 student(s)', opId: 'op-bbbbbbbb2' });
ok((await O.count()) === 2 && toasts.some((t) => /Saved on this device/.test(t.m)), 'changes are kept and the person is told');
IN.state.user.id = 8; ok((await O.count()) === 0, 'another person on the same device does not see (or send) these changes'); IN.state.user.id = 7;
IN.state.inst.id = 4; ok((await O.count()) === 0, 'changes belong to one institution only'); IN.state.inst.id = 3;

mode = 'offline'; let r = await O.replay(); ok(r.sent === 0 && (await O.count()) === 2, 'still offline: nothing is lost, nothing is sent');
online = false; r = await O.replay(); ok(r.sent === 0 && sent.length === 0, 'replay does nothing while the browser says offline'); online = true;
mode = 'ok'; r = await O.replay();
ok(r.sent === 2 && sent.length === 2 && sent[0].opId === 'op-aaaaaaaa1' && sent[1].opId === 'op-bbbbbbbb2' && sent[0].instId === 3, 'back online: sent in the order they were made, each with its own operation id');
ok((await O.count()) === 0, 'sent changes are removed from the device');
r = await O.replay(); ok(r.sent === 0 && sent.length === 2, 'nothing is sent twice');

// refused by the server (a real answer): kept for the person to read, never retried forever
await O.enqueue({ method: 'POST', path: '/loans/return', body: { accession_no: 'NOPE' }, label: 'Return: copy NOPE', opId: 'op-cccccccc3' });
mode = 'refuse'; r = await O.replay();
let list = await O.list(); ok(r.failed === 1 && list.length === 1 && list[0].status === 'failed' && /not on loan/.test(list[0].error), 'a refused change stays in the list with the reason');
ok((await O.count()) === 0, 'refused changes do not count as waiting');
mode = 'ok'; const before = sent.length; await O.replay(); ok(sent.length === before, 'a refused change is not sent again');
await O.discard(list[0].id); ok((await O.list()).length === 0, 'the person can discard it');

// temporary server errors are retried a few times, then given up on
await O.enqueue({ method: 'POST', path: '/results/sheet', body: {}, label: 'Marks', opId: 'op-dddddddd4' });
mode = 'server';
for (let i = 0; i < 4; i++) await O.replay(); ok((await O.list())[0].status === 'waiting' && (await O.list())[0].attempts === 4, 'a server error is retried');
await O.replay(); ok((await O.list())[0].status === 'failed', 'after 5 tries it is shown as refused instead of looping');
await O.discard((await O.list())[0].id); mode = 'ok';

// ----- saved screens (read copies)
await O.cachePut('/my-library', { loans: [1, 2] });
let hit = await O.cacheGet('/my-library'); ok(hit && hit.data.loans.length === 2 && hit.at > 0, 'a safe screen is saved on the device');
await O.cachePut('/students/5/documents', { documents: [{ title: 'secret' }] }); ok((await O.cacheGet('/students/5/documents')) === null, 'student documents are never saved on the device');
await O.cachePut('/backups', { backups: [] }); ok((await O.cacheGet('/backups')) === null, 'administration screens are never saved on the device');
await O.cachePut('/notification-settings', {}); ok((await O.cacheGet('/notification-settings')) === null, 'settings are not saved either');
IN.state.user.id = 8; ok((await O.cacheGet('/my-library')) === null, "another person does not get the first person's saved screen"); IN.state.user.id = 7;
ok((await O.cacheGet('/my-library')) !== null, 'the owner still gets their own copy');
for (let i = 0; i < 80; i++) await O.cachePut(`/opac?q=${i}`, { i });
ok((await O.cacheGet('/opac?q=79')) !== null, 'recent screens are kept');
await O.clearCache(); ok((await O.cacheGet('/my-library')) === null && (await O.cacheGet('/opac?q=79')) === null, 'signing out clears the saved screens');
await O.cachePut('/loans?filter=overdue', { loans: [] }); ok((await O.cacheGet('/loans?filter=overdue')) !== null, 'the circulation list can be saved for offline reading');

// sign-out keeps waiting changes for that person and asks first
await O.enqueue({ method: 'POST', path: '/loans/return', body: {}, label: 'x', opId: 'op-eeeeeeee5' });
let asked = false; IN.confirm = async () => { asked = true; return false; };
ok((await O.beforeSignOut()) === false && asked, 'sign-out asks before leaving changes unsent (and can be cancelled)');
IN.confirm = async () => true; ok((await O.beforeSignOut()) === true && (await O.count()) === 1, 'after confirming, the unsent change is kept for the next sign-in');

// ===== core.js: request(), reads falling back to a saved copy, and IN.api.queued() =====
{
  const calls = []; let netDown = false; let reply = { ok: true, status: 200, json: async () => ({ done: true }) };
  const win = { addEventListener() {}, matchMedia: () => ({ matches: false }), CustomEvent };
  const doc = { addEventListener() {}, getElementById: () => null, createElement: () => ({ style: {} }), head: { appendChild() {} }, body: { appendChild() {} }, documentElement: { dataset: {} } };
  const fetchStub = async (url, opts) => { calls.push({ url, opts }); if (netDown) throw new TypeError('Failed to fetch'); return reply; };
  const c2 = vm.createContext({ window: win, document: doc, navigator: { onLine: true, userAgent: 't' }, fetch: fetchStub, localStorage: { getItem: () => null, setItem() {} }, location: { pathname: '/institution-app.html', href: '' }, crypto: globalThis.crypto, console, setTimeout, Date, Math, JSON, Promise, Array, Object, String, Number, URL, Map, Error, Set, RegExp, encodeURIComponent });
  vm.runInContext(readFileSync(new URL('../js/institution/core.js', import.meta.url), 'utf8'), c2);
  const I2 = win.IN; I2.state.user = { id: 7 }; I2.state.inst = { id: 3 };
  const queue = []; const stale = [];
  I2.offline = { newId: () => 'op-test0001', enqueue: async (x) => { queue.push(x); }, cachePut: async () => {}, cacheGet: async (p) => (p === '/my-library' ? { at: 1700000000000, data: { loans: [9] } } : null), noteStale: (a) => stale.push(a) };

  let res = await I2.api.queued('POST', '/loans/return', { accession_no: 'A1' }, 'Return A1');
  ok(res.done && !res.queued && calls[0].opts.headers['X-Client-Op-Id'] === 'op-test0001' && calls[0].opts.headers['X-Institution-Id'] === '3', 'online: the write goes straight through with its operation id and institution');
  ok(!('X-Client-Op-Id' in (await (async () => { await I2.api.post('/books', {}); return calls[calls.length - 1].opts.headers; })())), 'ordinary writes carry no operation id');
  netDown = true;
  res = await I2.api.queued('POST', '/loans/return', { accession_no: 'A2' }, 'Return A2');
  ok(res.queued === true && queue.length === 1 && queue[0].opId === 'op-test0001' && queue[0].path === '/loans/return' && queue[0].label === 'Return A2', 'offline: the write is handed to the queue and the screen is told it was queued');
  let err = null; try { await I2.api.post('/books', {}); } catch (e) { err = e; }
  ok(err && err.offline === true && /internet connection/.test(err.message), 'offline: an ordinary write still fails with a clear message');
  const g = await I2.api.get('/my-library'); ok(g._offline === true && g.loans[0] === 9 && stale.length === 1, 'offline: a safe screen opens from the saved copy and says so');
  err = null; try { await I2.api.get('/backups'); } catch (e) { err = e; } ok(err && err.offline, 'offline: a screen that is not saved fails clearly');
  netDown = false; reply = { ok: false, status: 400, json: async () => ({ error: 'Not on loan' }) };
  err = null; try { await I2.api.queued('POST', '/loans/return', {}, 'x'); } catch (e) { err = e; }
  ok(err && err.status === 400 && queue.length === 1, 'a real refusal from the server is shown at once and never queued');
}

console.log(`\n${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);
