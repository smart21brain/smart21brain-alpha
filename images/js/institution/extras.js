/* Smart21Institution — offline saving, camera scanning, notification settings, student documents.
   Loaded right after core.js. Plain JavaScript, no build step. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;
  const uid = () => (IN.state.user && IN.state.user.id) || 0;
  const iid = () => (IN.state.inst && IN.state.inst.id) || 0;

  // =====================================================================================================
  // 1. Offline: changes typed without a connection wait on the device and are sent later;
  //    a few safe screens show the last copy that was loaded.
  // =====================================================================================================
  // Only these reads are kept on the device (nothing about other people's private records, no documents).
  const CACHEABLE = /^\/(opac|my-library|me|me\/results|me\/reading|results\/sheet|loans|lookups|dashboard)(\?|$)/;
  const MAX_CACHE = 60; const MAX_ATTEMPTS = 5;
  const mem = { queue: [], cache: new Map(), seq: 1 };
  let dbp = null;
  function db() {
    if (dbp) return dbp;
    dbp = new Promise((resolve) => {
      try {
        if (!window.indexedDB) return resolve(null);
        const r = indexedDB.open('in-offline-v1', 1);
        r.onupgradeneeded = () => { const d = r.result; d.createObjectStore('queue', { keyPath: 'id', autoIncrement: true }); d.createObjectStore('cache', { keyPath: 'key' }); };
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => resolve(null);
        r.onblocked = () => resolve(null);
      } catch (e) { resolve(null); }
    });
    return dbp;
  }
  const tx = (store, mode, fn) => db().then((d) => new Promise((resolve, reject) => {
    if (!d) return resolve(undefined);
    const t = d.transaction(store, mode); const s = t.objectStore(store); let out;
    try { out = fn(s); } catch (e) { return reject(e); }
    t.oncomplete = () => resolve(out && out.result !== undefined ? out.result : out); t.onerror = () => reject(t.error); t.onabort = () => reject(t.error);
  }));
  const req2p = (r) => new Promise((resolve, reject) => { r.onsuccess = () => resolve(r.result); r.onerror = () => reject(r.error); });
  async function allOf(store) { const d = await db(); if (!d) return store === 'queue' ? mem.queue.slice() : [...mem.cache.values()]; return req2p(d.transaction(store).objectStore(store).getAll()); }

  const O = IN.offline = {};
  O.newId = () => 'op-' + (crypto.randomUUID ? crypto.randomUUID().replace(/-/g, '').slice(0, 24) : Date.now().toString(36) + Math.random().toString(36).slice(2, 12));

  // ----- read copies
  O.cacheKey = (path) => `${uid()}:${iid()}:${path}`;
  O.cachePut = async (path, data) => {
    if (!CACHEABLE.test(path) || !uid()) return;
    const row = { key: O.cacheKey(path), at: Date.now(), data };
    try {
      const d = await db();
      if (!d) { mem.cache.set(row.key, row); return; }
      await tx('cache', 'readwrite', (s) => s.put(row));
      const rows = await allOf('cache');
      if (rows.length > MAX_CACHE) { rows.sort((a, b) => a.at - b.at); await tx('cache', 'readwrite', (s) => { rows.slice(0, rows.length - MAX_CACHE).forEach((r) => s.delete(r.key)); }); }
    } catch (e) { /* storage full or blocked: the app still works online */ }
  };
  O.cacheGet = async (path) => {
    if (!CACHEABLE.test(path) || !uid()) return null;
    try { const d = await db(); if (!d) return mem.cache.get(O.cacheKey(path)) || null; return (await req2p(d.transaction('cache').objectStore('cache').get(O.cacheKey(path)))) || null; } catch (e) { return null; }
  };
  O.clearCache = async () => { mem.cache.clear(); try { await tx('cache', 'readwrite', (s) => s.clear()); } catch (e) { /* ignore */ } };
  let staleToastAt = 0;
  O.noteStale = (at) => {
    if (Date.now() - staleToastAt < 20000) return; staleToastAt = Date.now();
    IN.toast(IN.t('You are offline. Showing the copy saved on this device at ', 'Huna mtandao. Inaonyesha nakala iliyohifadhiwa kwenye kifaa saa ') + new Date(at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + '.', 'warn');
  };

  // ----- waiting changes
  O.list = async () => (await allOf('queue')).filter((x) => x.user_id === uid() && x.inst_id === iid()).sort((a, b) => a.id - b.id);
  O.count = async () => (await O.list()).filter((x) => x.status !== 'failed').length;
  O.enqueue = async (item) => {
    const row = { method: item.method, path: item.path, body: item.body, label: item.label, opId: item.opId, user_id: uid(), inst_id: iid(), at: Date.now(), attempts: 0, status: 'waiting', error: '' };
    const d = await db();
    if (!d) { row.id = mem.seq++; mem.queue.push(row); } else await tx('queue', 'readwrite', (s) => s.add(row));
    IN.toast(IN.t('No connection. Saved on this device — it will be sent automatically when you are back online.', 'Hakuna mtandao. Imehifadhiwa kwenye kifaa — itatumwa yenyewe mtandao ukirudi.'), 'warn');
    refreshBadge();
  };
  async function put(row) { const d = await db(); if (!d) { const i = mem.queue.findIndex((x) => x.id === row.id); if (i >= 0) mem.queue[i] = row; return; } await tx('queue', 'readwrite', (s) => s.put(row)); }
  async function del(id) { const d = await db(); if (!d) { mem.queue = mem.queue.filter((x) => x.id !== id); return; } await tx('queue', 'readwrite', (s) => s.delete(id)); }
  O.discard = async (id) => { await del(id); refreshBadge(); };

  let replaying = false;
  O.replay = async ({ quiet = false } = {}) => {
    if (replaying || !navigator.onLine || !uid()) return { sent: 0, failed: 0 };
    replaying = true; let sent = 0; let failed = 0;
    try {
      for (const it of (await O.list()).filter((x) => x.status === 'waiting')) {
        try {
          await IN.rawRequest(it.method, it.path, it.body, false, { opId: it.opId, instId: it.inst_id });
          await del(it.id); sent++;
        } catch (e) {
          if (e && e.offline) break;                                      // still no connection: try again later
          if (e && e.status === 401) break;                               // signed out: the change stays until the person signs in again
          it.attempts += 1; it.error = (e && e.message) || 'Error';
          const retryable = !e.status || e.status >= 500 || e.status === 429;
          if (!retryable || it.attempts >= MAX_ATTEMPTS) { it.status = 'failed'; failed++; }
          await put(it);
        }
      }
    } finally { replaying = false; }
    refreshBadge();
    if (!quiet && sent) IN.toast(IN.t(`${sent} change${sent === 1 ? '' : 's'} saved while you were offline ${sent === 1 ? 'was' : 'were'} sent.`, `Mabadiliko ${sent} yaliyohifadhiwa ukiwa nje ya mtandao yametumwa.`));
    if (failed) IN.toast(IN.t(`${failed} saved change${failed === 1 ? ' was' : 's were'} refused by the server. Open the waiting-changes list to see why.`, `Mabadiliko ${failed} yamekataliwa na seva. Fungua orodha ya yanayosubiri kuona sababu.`), 'error');
    if (sent) document.dispatchEvent(new CustomEvent('in-offline-synced', { detail: { sent } }));
    return { sent, failed };
  };

  async function refreshBadge() {
    const b = document.getElementById('inQueueBtn'); if (!b) return;
    const items = await O.list(); const waiting = items.filter((x) => x.status === 'waiting').length; const bad = items.filter((x) => x.status === 'failed').length;
    b.classList.toggle('in-hide', !items.length);
    b.querySelector('b').textContent = String(waiting + bad);
    b.classList.toggle('danger-ghost', !!bad);
    b.title = IN.t('Changes waiting to be sent', 'Mabadiliko yanayosubiri kutumwa');
  }
  O.showPanel = async () => {
    const items = await O.list();
    const m = IN.modal(IN.t('Changes waiting to be sent', 'Mabadiliko yanayosubiri kutumwa'), `<p class="in-muted in-small">${IN.t('These were saved on this device because there was no connection. They are sent automatically when you are online.', 'Haya yalihifadhiwa kwenye kifaa hiki kwa kuwa hakukuwa na mtandao. Hutumwa yenyewe ukiwa mtandaoni.')}</p>
      ${items.length ? items.map((x) => `<div class="in-row" style="justify-content:space-between;gap:.6rem;padding:.55rem 0;border-top:1px solid var(--in-border,#ddd)"><div style="min-width:0"><b>${esc(x.label)}</b><div class="in-small in-muted">${IN.dateTime(new Date(x.at).toISOString().replace('T', ' '))} · ${x.status === 'failed' ? IN.chip('failed', IN.t('Refused', 'Imekataliwa')) : IN.chip('waiting', IN.t('Waiting', 'Inasubiri'))}</div>${x.error ? `<div class="in-small" style="color:var(--in-danger,#c0392b)">${esc(x.error)}</div>` : ''}</div><button class="in-btn danger-ghost sm" data-discard="${x.id}">${IN.t('Discard', 'Futa')}</button></div>`).join('') : `<div class="in-muted">${IN.t('Nothing is waiting.', 'Hakuna kinachosubiri.')}</div>`}`,
      { footer: `<button class="in-btn primary" id="inSendNow"><i class="fa-solid fa-paper-plane"></i> ${IN.t('Send now', 'Tuma sasa')}</button>` });
    m.addEventListener('click', async (e) => {
      const d = e.target.closest('[data-discard]');
      if (d) { await O.discard(Number(d.dataset.discard)); IN.closeModal(); O.showPanel(); }
      if (e.target.closest('#inSendNow')) { if (!navigator.onLine) { IN.toast(IN.t('Still offline.', 'Bado huna mtandao.'), 'warn'); return; } const r = await O.replay(); if (!r.sent && !r.failed) IN.toast(IN.t('Nothing could be sent yet.', 'Hakuna kilichoweza kutumwa bado.'), 'warn'); IN.closeModal(); O.showPanel(); }
    });
  };
  O.mount = () => {
    if (document.getElementById('inQueueBtn')) return;
    const bell = document.getElementById('inBell'); if (!bell) return;
    const b = document.createElement('button');
    b.id = 'inQueueBtn'; b.className = 'in-btn ghost sm in-hide'; b.style.whiteSpace = 'nowrap';
    b.innerHTML = '<i class="fa-solid fa-cloud-arrow-up"></i> <b>0</b>'; b.addEventListener('click', O.showPanel);
    bell.parentNode.insertBefore(b, bell);
    refreshBadge();
    window.addEventListener('online', () => O.replay());
    setInterval(() => { if (navigator.onLine) O.replay({ quiet: false }); }, 60000);
    setTimeout(() => O.replay(), 1500);
  };
  // Sign-out: keep waiting changes (they belong to this person), drop the saved screens.
  O.beforeSignOut = async () => {
    const n = await O.count();
    if (n && !(await IN.confirm({ title: IN.t('Changes are still waiting', 'Mabadiliko bado yanasubiri'), message: IN.t(`${n} saved change(s) have not reached the server yet. They stay on this device and are sent the next time you sign in with this account while online. Sign out now?`, `Mabadiliko ${n} bado hayajafika kwenye seva. Yanabaki kwenye kifaa na yatatumwa utakapoingia tena ukiwa mtandaoni. Toka sasa?`), confirmText: IN.t('Sign out', 'Toka'), danger: false }))) return false;
    await O.clearCache(); return true;
  };

  // =====================================================================================================
  // 2. Camera scanning (barcodes and QR codes)
  // =====================================================================================================
  const WANT = ['code_128', 'code_39', 'code_93', 'codabar', 'ean_13', 'ean_8', 'itf', 'upc_a', 'upc_e', 'qr_code', 'data_matrix'];
  let detector;
  async function getDetector() {
    if (detector !== undefined) return detector;
    detector = null;
    try {
      if ('BarcodeDetector' in window) {
        const have = await window.BarcodeDetector.getSupportedFormats();
        const formats = WANT.filter((f) => have.includes(f));
        if (formats.length) detector = { det: new window.BarcodeDetector({ formats }), barcodes: formats.some((f) => f !== 'qr_code' && f !== 'data_matrix') };
      }
    } catch (e) { detector = null; }
    return detector;
  }
  async function decodeStill(file) {
    const bmp = await createImageBitmap(file);
    const d = await getDetector();
    if (d) { const r = await d.det.detect(bmp); if (r[0] && r[0].rawValue) return r[0].rawValue; }
    await IN.lib('jsqr');
    const c = document.createElement('canvas'); const sc = Math.min(1, 1200 / Math.max(bmp.width, bmp.height)); c.width = Math.round(bmp.width * sc); c.height = Math.round(bmp.height * sc);
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(bmp, 0, 0, c.width, c.height);
    const px = g.getImageData(0, 0, c.width, c.height); const res = window.jsQR(px.data, px.width, px.height, { inversionAttempts: 'attemptBoth' });
    return res ? res.data : null;
  }

  // IN.scanCode({ title, continuous, onCode })
  //   single mode: resolves to the code (or null if the person closes the window)
  //   continuous mode: calls onCode(code) for every new code (it may return a text to show), stays open until closed
  IN.scanCode = ({ title, continuous = false, onCode } = {}) => new Promise((resolve) => {
    let stream; let stopped = false; let raf; let busy = false; let last = 0; let lastCode = ''; let lastAt = 0; let done = false;
    // Its own overlay (not IN.modal), so scanning from inside the "Issue a book" form does not close that form.
    document.getElementById('inScan') && document.getElementById('inScan').remove();
    const m = document.createElement('div'); m.id = 'inScan'; m.className = 'in-modal-back'; m.style.zIndex = '120';
    m.innerHTML = `<div class="in-modal" role="dialog" aria-modal="true" aria-label="${esc(title || IN.t('Scan a code', 'Changanua msimbo'))}">
      <div class="in-modal-head"><h3>${esc(title || IN.t('Scan a code', 'Changanua msimbo'))}</h3><button class="in-icon-btn" data-scclose aria-label="${IN.t('Close', 'Funga')}"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="in-modal-body">
      <div style="position:relative;background:#000;border-radius:12px;overflow:hidden;aspect-ratio:4/3;max-height:52vh">
        <video id="scVideo" playsinline muted style="width:100%;height:100%;object-fit:cover"></video>
        <div style="position:absolute;inset:18% 10%;border:2px solid rgba(255,255,255,.85);border-radius:10px;box-shadow:0 0 0 999px rgba(0,0,0,.28);pointer-events:none"></div>
      </div>
      <div id="scMsg" class="in-small in-muted" style="margin:.6rem 0" role="status" aria-live="polite">${IN.t('Starting the camera…', 'Inafungua kamera…')}</div>
      <div id="scLog" class="in-small"></div>
      <div class="in-row" style="gap:.5rem;flex-wrap:wrap;margin-top:.4rem">
        <input class="in-input" id="scType" placeholder="${IN.t('…or type the code', '…au andika msimbo')}" style="flex:1;min-width:160px" autocomplete="off">
        <button class="in-btn ghost" id="scUse" type="button">${IN.t('Use', 'Tumia')}</button>
        <label class="in-btn ghost" for="scFile"><i class="fa-solid fa-image"></i> ${IN.t('Photo', 'Picha')}</label><input type="file" id="scFile" accept="image/*" capture="environment" class="in-sr">
      </div></div></div>`;
    document.body.appendChild(m);
    const finish = (value) => { if (done) return; done = true; stop(); document.removeEventListener('keydown', onKey, true); m.remove(); resolve(value); };
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); finish(null); } };
    document.addEventListener('keydown', onKey, true);
    m.addEventListener('mousedown', (e) => { if (e.target === m) finish(null); });
    m.querySelector('[data-scclose]').addEventListener('click', () => finish(null));
    const video = m.querySelector('#scVideo'); const msg = (t, warn) => { const el = m.querySelector('#scMsg'); if (el) { el.textContent = t; el.style.color = warn ? 'var(--in-danger,#c0392b)' : ''; } };
    function stop() { stopped = true; cancelAnimationFrame(raf); if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; }
    async function accept(code) {
      code = String(code || '').trim(); if (!code) return;
      const now = Date.now(); if (code === lastCode && now - lastAt < 3000) return; lastCode = code; lastAt = now;
      if (navigator.vibrate) try { navigator.vibrate(60); } catch (e) { /* ignore */ }
      if (!continuous) { finish(code); return; }
      let line = code;
      try { const r = onCode ? await onCode(code) : null; line = (r || code); m.querySelector('#scLog').insertAdjacentHTML('afterbegin', `<div><i class="fa-solid fa-circle-check" style="color:var(--in-primary,#0F766E)"></i> ${esc(line)}</div>`); }
      catch (e) { m.querySelector('#scLog').insertAdjacentHTML('afterbegin', `<div style="color:var(--in-danger,#c0392b)"><i class="fa-solid fa-circle-exclamation"></i> ${esc(code)} — ${esc(e.message || e)}</div>`); }
    }
    m.querySelector('#scUse').addEventListener('click', () => { const v = m.querySelector('#scType').value; m.querySelector('#scType').value = ''; accept(v); });
    m.querySelector('#scType').addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const v = e.target.value; e.target.value = ''; accept(v); } });
    m.querySelector('#scFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      try { const t = await decodeStill(f); if (t) accept(t); else msg(IN.t('No code found in that photo. Try again, closer and in good light.', 'Hakuna msimbo kwenye picha hiyo. Jaribu tena, karibu zaidi na kwa mwanga mzuri.'), true); } catch (err) { msg(err.message || String(err), true); }
    });
    const canvas = document.createElement('canvas'); const g = canvas.getContext('2d', { willReadFrequently: true });
    async function tick() {
      if (stopped) return;
      if (!m.isConnected) { stop(); return; }
      raf = requestAnimationFrame(tick);
      const now = performance.now(); if (busy || now - last < 130 || video.readyState < 2 || !video.videoWidth) return;
      last = now; busy = true;
      try {
        let text = null; const d = await getDetector();
        if (d) { const r = await d.det.detect(video); text = r[0] && r[0].rawValue; }
        else {
          const sc = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight)); canvas.width = Math.round(video.videoWidth * sc); canvas.height = Math.round(video.videoHeight * sc);
          g.drawImage(video, 0, 0, canvas.width, canvas.height); const px = g.getImageData(0, 0, canvas.width, canvas.height);
          const res = window.jsQR(px.data, px.width, px.height, { inversionAttempts: 'dontInvert' }); text = res && res.data;
        }
        if (text) await accept(text);
      } catch (e) { /* a bad frame is fine */ } finally { busy = false; }
    }
    (async function start() {
      if (!window.isSecureContext || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) { msg(IN.t('This browser cannot open the camera here. Take a photo, or type the code.', 'Kivinjari hiki hakiwezi kufungua kamera hapa. Piga picha, au andika msimbo.'), true); return; }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
      catch (e) { msg(e && e.name === 'NotAllowedError' ? IN.t('The camera is blocked. Allow camera access for this site, or take a photo / type the code.', 'Kamera imezuiwa. Ruhusu kamera kwa tovuti hii, au piga picha / andika msimbo.') : IN.t('No camera found. Take a photo, or type the code.', 'Kamera haijapatikana. Piga picha, au andika msimbo.'), true); return; }
      if (stopped || !m.isConnected) { stop(); return; }
      video.srcObject = stream; await video.play().catch(() => {});
      const d = await getDetector();
      if (!d) { try { await IN.lib('jsqr'); } catch (e) { msg(e.message, true); return; } msg(IN.t('Point the camera at a QR code. (This browser cannot read barcodes by camera — use Chrome or Edge on Android, a USB scanner, or type the number.)', 'Elekeza kamera kwenye msimbo wa QR. (Kivinjari hiki hakisomi barcode kwa kamera — tumia Chrome au Edge kwenye Android, kichanganuzi cha USB, au andika namba.)')); }
      else msg(d.barcodes ? IN.t('Point the camera at the barcode on the book.', 'Elekeza kamera kwenye barcode ya kitabu.') : IN.t('Point the camera at the code.', 'Elekeza kamera kwenye msimbo.'));
      tick();
    }());
  });

  // Puts a "Scan" button beside a text input. When a code is read it is typed into the input; `after(code)` runs next.
  IN.attachScan = (input, { after, continuous, onCode, title } = {}) => {
    if (!input || input.dataset.scan) return; input.dataset.scan = '1';
    const b = document.createElement('button'); b.type = 'button'; b.className = 'in-btn ghost'; b.title = IN.t('Scan with the camera', 'Changanua kwa kamera');
    b.innerHTML = `<i class="fa-solid fa-camera"></i><span class="in-sr"> ${IN.t('Scan', 'Changanua')}</span>`;
    b.addEventListener('click', async () => {
      if (continuous) { await IN.scanCode({ title, continuous: true, onCode }); return; }
      const code = await IN.scanCode({ title }); if (code) { input.value = code; input.dispatchEvent(new Event('input', { bubbles: true })); if (after) after(code); }
    });
    input.insertAdjacentElement('afterend', b); return b;
  };

  // =====================================================================================================
  // 3. Notification settings (my choices, push on this device, and the administrator's switches)
  // =====================================================================================================
  const b64uToBytes = (str) => { const p = String(str).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); };
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  async function swReg() {
    if (!('serviceWorker' in navigator)) return null;
    let reg = await navigator.serviceWorker.getRegistration(location.href);
    if (!reg) reg = await navigator.serviceWorker.register('/institution-sw.js', { scope: '/institution-' });
    await navigator.serviceWorker.ready; return reg;
  }
  async function pushState() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return { supported: false };
    try { const reg = await swReg(); const sub = reg && await reg.pushManager.getSubscription(); return { supported: true, permission: Notification.permission, sub }; } catch (e) { return { supported: false }; }
  }
  async function enablePush(publicKey) {
    if (Notification.permission === 'denied') throw new Error(IN.t('Notifications are blocked for this site in the browser settings. Allow them there and try again.', 'Arifa zimezuiwa kwa tovuti hii kwenye mipangilio ya kivinjari. Ziruhusu huko kisha jaribu tena.'));
    const perm = await Notification.requestPermission();
    if (perm !== 'granted') throw new Error(IN.t('Permission was not given.', 'Ruhusa haikutolewa.'));
    const reg = await swReg();
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64uToBytes(publicKey) });
    await IN.api.post('/push/subscribe', { endpoint: sub.endpoint });
  }
  async function disablePush() {
    const reg = await swReg(); const sub = reg && await reg.pushManager.getSubscription();
    if (sub) { await IN.api.post('/push/unsubscribe', { endpoint: sub.endpoint }).catch(() => {}); await sub.unsubscribe().catch(() => {}); }
  }

  const status = (ok, text) => `<span class="in-chip ${ok ? 'success' : 'waiting'}">${esc(text)}</span>`;
  IN.modules['notification-settings'] = async (el) => {
    const d = await IN.api.get('/notification-settings'); const ps = await pushState();
    const adminCan = IN.can('settings.manage'); const p = d.prefs;
    const row = (key, icon, title, sub, on, avail, extra) => `<div class="in-row" style="justify-content:space-between;gap:1rem;padding:.7rem 0;border-top:1px solid var(--in-border,#ddd);flex-wrap:wrap">
      <div style="min-width:220px;flex:1"><b><i class="fa-solid ${icon}"></i> ${title}</b> ${avail}<div class="in-small in-muted">${sub}</div>${extra || ''}</div>
      <div class="in-row" style="gap:.6rem"><label class="in-row" style="gap:.4rem"><input type="checkbox" data-pref="${key}" ${on ? 'checked' : ''} ${avail.includes('waiting') ? 'disabled' : ''}> ${IN.t('On', 'Washa')}</label><button class="in-btn ghost sm" data-act="test" data-ch="${key}" ${avail.includes('waiting') ? 'disabled' : ''}>${IN.t('Send me a test', 'Nitumie jaribio')}</button></div></div>`;
    const NA = status(false, IN.t('not set up on the server yet', 'bado haijawekwa kwenye seva')); const OFF = status(false, IN.t('turned off by the institution', 'imezimwa na taasisi'));
    const avail = (srv, inst) => (!srv ? NA : !inst ? OFF : status(true, IN.t('available', 'ipo')));
    const pushOn = ps.supported && ps.sub;
    el.innerHTML = `${IN.pageHead(IN.t('Notifications', 'Arifa'), IN.t('Choose how you want to hear about due books, reserved books, results and announcements. The bell in the top bar always works.', 'Chagua jinsi unavyotaka kupata taarifa za vitabu vinavyodaiwa, vilivyohifadhiwa, matokeo na matangazo. Kengele iliyo juu hufanya kazi kila wakati.'))}
      <div class="in-card"><h3 style="margin-top:0">${IN.t('How I get notified', 'Jinsi ninavyoarifiwa')}</h3>
        ${row('email_on', 'fa-envelope', IN.t('E-mail', 'Barua pepe'), d.has_email ? IN.t('Sent to the e-mail address of your login.', 'Hutumwa kwa barua pepe ya akaunti yako.') : IN.t('Your login has no e-mail address.', 'Akaunti yako haina barua pepe.'), p.email_on, avail(d.server.email, d.institution.email))}
        ${row('sms_on', 'fa-comment-sms', 'SMS', IN.t('Only for overdue books, reserved books that are ready, results and security notices (SMS costs the institution money).', 'Kwa vitabu vilivyochelewa, vilivyohifadhiwa vilivyo tayari, matokeo na usalama tu (SMS ina gharama).'), p.sms_on, avail(d.server.sms, d.institution.sms),
          `<div class="in-field" style="margin:.5rem 0 0;max-width:320px"><label for="nPhone">${IN.t('Phone number for SMS', 'Namba ya simu kwa SMS')}</label><input class="in-input" id="nPhone" type="tel" value="${esc(p.phone)}" placeholder="0712 345 678"><span class="hint">${IN.t('Leave empty to use the phone number in your record.', 'Acha wazi kutumia namba ya simu iliyo kwenye rekodi yako.')}</span></div>`)}
        ${row('push_on', 'fa-bell', IN.t('Push on my phone / computer', 'Arifa kwenye simu / kompyuta'), IN.t('A pop-up appears even when the app is closed.', 'Ujumbe huonekana hata programu ikiwa imefungwa.') + (isIOS && !standalone ? ' ' + IN.t('On iPhone/iPad, first add this app to the Home Screen (Share → Add to Home Screen).', 'Kwenye iPhone/iPad, kwanza weka programu hii kwenye Skrini ya Mwanzo (Share → Add to Home Screen).') : ''), p.push_on, avail(d.server.push, d.institution.push),
          d.server.push ? `<div style="margin-top:.5rem">${ps.supported ? `<button class="in-btn ${pushOn ? 'ghost' : 'primary'} sm" data-act="${pushOn ? 'push-off' : 'push-on'}"><i class="fa-solid ${pushOn ? 'fa-bell-slash' : 'fa-bell'}"></i> ${pushOn ? IN.t('Turn off push on this device', 'Zima arifa kwenye kifaa hiki') : IN.t('Turn on push on this device', 'Washa arifa kwenye kifaa hiki')}</button> <span class="in-small in-muted">${IN.t(`${d.devices} device(s) registered`, `Vifaa ${d.devices} vimesajiliwa`)}</span>` : `<span class="in-small in-muted">${IN.t('This browser does not support push notifications.', 'Kivinjari hiki hakitumii arifa za push.')}</span>`}</div>` : '')}
        <div style="margin-top:1rem"><button class="in-btn primary" data-act="save"><i class="fa-solid fa-floppy-disk"></i> ${IN.t('Save my choices', 'Hifadhi chaguo langu')}</button></div>
      </div>
      <div id="nAdmin"></div>`;
    const read = () => ({ email_on: el.querySelector('[data-pref=email_on]').checked, sms_on: el.querySelector('[data-pref=sms_on]').checked, push_on: el.querySelector('[data-pref=push_on]').checked, phone: el.querySelector('#nPhone').value.trim() });
    IN.delegate(el, {
      save: async (b) => { b.disabled = true; try { await IN.api.put('/notification-prefs', read()); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); } finally { b.disabled = false; } },
      'push-on': async (b) => { b.disabled = true; try { await enablePush(d.server.push_public_key); IN.toast(IN.t('Push is on for this device.', 'Arifa zimewashwa kwenye kifaa hiki.')); IN.route(); } catch (e) { b.disabled = false; IN.fail(e); } },
      'push-off': async (b) => { b.disabled = true; try { await disablePush(); IN.toast(IN.t('Push is off for this device.', 'Arifa zimezimwa kwenye kifaa hiki.')); IN.route(); } catch (e) { b.disabled = false; IN.fail(e); } },
      test: async (b) => {
        b.disabled = true;
        try { await IN.api.put('/notification-prefs', read()); const r = await IN.api.post('/notifications/test', { channel: b.dataset.ch.replace('_on', '') }); IN.toast(r.detail, r.ok ? 'ok' : 'warn'); }
        catch (e) { IN.fail(e); } finally { b.disabled = false; }
      },
    });
    if (adminCan) {
      const [dl] = await Promise.all([IN.api.get('/notifications/delivery').catch(() => null)]);
      const sw = (k, label, srv) => `<label class="in-row" style="gap:.5rem;padding:.35rem 0"><input type="checkbox" data-inst="${k}" ${d.institution[k] ? 'checked' : ''} ${srv ? '' : 'disabled'}> <b>${label}</b> ${srv ? '' : NA}</label>`;
      const sum = {}; (dl ? dl.totals : []).forEach((t) => { (sum[t.channel] = sum[t.channel] || { sent: 0, failed: 0, skipped: 0, pending: 0 })[t.status] += t.n; });
      el.querySelector('#nAdmin').innerHTML = `<div class="in-card" style="margin-top:1rem"><h3 style="margin-top:0">${IN.t('For the institution', 'Kwa taasisi')}</h3>
        <p class="in-small in-muted">${IN.t('Switch a channel off for everybody. A channel can only be on when the server has been set up for it (see below).', 'Zima njia kwa kila mtu. Njia inaweza kuwashwa tu seva ikiwa imewekwa kwa ajili yake (angalia hapa chini).')}</p>
        ${sw('email', IN.t('E-mail', 'Barua pepe'), d.server.email)}${sw('sms', 'SMS', d.server.sms)}${sw('push', IN.t('Push', 'Push'), d.server.push)}
        <button class="in-btn primary sm" data-act="save-inst" style="margin-top:.5rem">${IN.t('Save', 'Hifadhi')}</button>
        <h4 style="margin:1.2rem 0 .4rem">${IN.t('Last 7 days', 'Siku 7 zilizopita')}</h4>
        ${Object.keys(sum).length ? `<div class="in-table-wrap"><table class="in-table"><thead><tr><th>${IN.t('Channel', 'Njia')}</th><th>${IN.t('Sent', 'Imetumwa')}</th><th>${IN.t('Waiting', 'Inasubiri')}</th><th>${IN.t('Failed', 'Imeshindwa')}</th><th>${IN.t('Not sent', 'Haikutumwa')}</th></tr></thead><tbody>${Object.entries(sum).map(([c, v]) => `<tr><td>${esc(c)}</td><td>${v.sent}</td><td>${v.pending}</td><td>${v.failed}</td><td>${v.skipped}</td></tr>`).join('')}</tbody></table></div>` : `<div class="in-small in-muted">${IN.t('Nothing has been sent yet.', 'Hakuna kilichotumwa bado.')}</div>`}
        ${dl && dl.reasons.length ? `<div class="in-small" style="margin-top:.6rem"><b>${IN.t('Why some were not sent', 'Kwa nini baadhi hazikutumwa')}</b><ul style="margin:.3rem 0 0 1.1rem">${dl.reasons.map((r) => `<li>${esc(r.channel)}: ${esc(r.detail)} (${r.n})</li>`).join('')}</ul></div>` : ''}
        ${d.server.email && d.server.sms && d.server.push ? '' : `<div class="in-alert info" style="margin-top:1rem"><i class="fa-solid fa-circle-info"></i><div>${IN.t('To set up a channel, the person who deploys the system adds its keys as Worker secrets — see the section "Notification channels" in INSTITUTION_SYSTEM.md. No keys are ever stored in the database or shown here.', 'Ili kuweka njia, mtu anayesimamia mfumo huongeza funguo zake kama Worker secrets — angalia sehemu "Notification channels" kwenye INSTITUTION_SYSTEM.md. Funguo hazihifadhiwi kwenye hifadhidata wala kuonyeshwa hapa.')}</div></div>`}
      </div>`;
      IN.delegate(el.querySelector('#nAdmin'), { 'save-inst': async (b) => { b.disabled = true; try { const v = {}; el.querySelectorAll('[data-inst]').forEach((c) => { if (!c.disabled) v['notify_' + c.dataset.inst] = c.checked ? 1 : 0; }); await IN.api.put('/settings', v); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); } finally { b.disabled = false; } } });
    }
  };

  // =====================================================================================================
  // 4. Student documents
  // =====================================================================================================
  const DOC_LABEL = () => ({ birth_certificate: IN.t('Birth certificate', 'Cheti cha kuzaliwa'), id_document: IN.t('ID document', 'Kitambulisho'), transcript: IN.t('Transcript', 'Nakala ya matokeo'), certificate: IN.t('Certificate', 'Cheti'), medical: IN.t('Medical letter', 'Barua ya matibabu'), recommendation: IN.t('Recommendation', 'Barua ya pendekezo'), application: IN.t('Application form', 'Fomu ya maombi'), other: IN.t('Other', 'Nyingine') });
  const docUrl = (id, dl) => `/api/institution/student-documents/${id}/file?institution_id=${iid()}${dl ? '&download=1' : ''}`;
  IN.studentDocs = async (host, studentId) => {
    const render = async () => {
      let d; try { d = await IN.api.get(`/students/${studentId}/documents`); } catch (e) { host.innerHTML = `<div class="in-small in-muted">${esc(e.message)}</div>`; return; }
      const L = DOC_LABEL(); const manage = d.can_manage;
      host.innerHTML = `<div class="in-row" style="justify-content:space-between;margin-bottom:.6rem"><h3 style="margin:0"><i class="fa-solid fa-paperclip"></i> ${IN.t('Documents', 'Nyaraka')}</h3>${manage ? `<button class="in-btn primary sm" data-act="doc-add"><i class="fa-solid fa-plus"></i> ${IN.t('Attach document', 'Ambatisha nyaraka')}</button>` : ''}</div>
        ${d.documents.length ? `<div class="in-table-wrap"><table class="in-table"><thead><tr><th>${IN.t('Document', 'Nyaraka')}</th><th>${IN.t('Type', 'Aina')}</th><th>${IN.t('Added', 'Imeongezwa')}</th><th></th></tr></thead><tbody>${d.documents.map((x) => `<tr><td><i class="fa-solid ${IN.fileIcon(x.file_name)}"></i> <b>${esc(x.title)}</b><div class="in-small in-muted">${esc(x.file_name)} · ${IN.bytes(x.file_size)}</div></td><td>${esc(L[x.doc_type] || x.doc_type)}</td><td>${IN.date(x.created_at)}</td><td class="in-right"><a class="in-btn ghost sm" href="${docUrl(x.id)}" target="_blank" rel="noopener">${IN.t('Open', 'Fungua')}</a> <a class="in-btn ghost sm" href="${docUrl(x.id, true)}"><i class="fa-solid fa-download"></i></a>${manage ? ` <button class="in-btn danger-ghost sm" data-act="doc-del" data-id="${x.id}" data-title="${esc(x.title)}"><i class="fa-solid fa-trash"></i></button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : `<div class="in-small in-muted">${manage ? IN.t('No documents yet. Attach a birth certificate, ID, transcript or letter.', 'Hakuna nyaraka bado. Ambatisha cheti cha kuzaliwa, kitambulisho, nakala ya matokeo au barua.') : IN.t('No documents have been attached to your record.', 'Hakuna nyaraka zilizoambatishwa kwenye rekodi yako.')}</div>`}
        <p class="in-small in-muted" style="margin:.6rem 0 0"><i class="fa-solid fa-lock"></i> ${IN.t('Private: only the administration and this student can open these files. PDF, Word, Excel, PowerPoint, TXT, PNG or JPG.', 'Siri: ni utawala na mwanafunzi huyu tu wanaoweza kufungua faili hizi. PDF, Word, Excel, PowerPoint, TXT, PNG au JPG.')}</p>`;
      IN.delegate(host, {
        'doc-add': () => IN.formModal({ title: IN.t('Attach a document', 'Ambatisha nyaraka'), submit: IN.t('Upload', 'Pakia'),
          body: `${IN.f.select('doc_type', IN.t('Type', 'Aina'), Object.entries(L), { value: 'other', noBlank: true })}${IN.f.input('title', IN.t('Title', 'Kichwa'), { placeholder: IN.t('e.g. Birth certificate', 'mf. Cheti cha kuzaliwa'), hint: IN.t('Leave empty to use the file name.', 'Acha wazi kutumia jina la faili.') })}
            <div class="in-field"><label for="docFile">${IN.t('File', 'Faili')}<span class="req">*</span></label><input class="in-input" type="file" id="docFile" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.png,.jpg,.jpeg" required></div>`,
          onSubmit: async (v, f) => { const file = f.querySelector('#docFile').files[0]; if (!file) throw new Error(IN.t('Please choose a file.', 'Tafadhali chagua faili.')); const fd = new FormData(); fd.append('file', file); fd.append('title', v.title || ''); fd.append('doc_type', v.doc_type); await IN.api.upload(`/students/${studentId}/documents`, fd); IN.closeModal(); IN.toast(IN.t('Document attached.', 'Nyaraka imeambatishwa.')); render(); } }),
        'doc-del': async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this document?', 'Futa nyaraka hii?'), message: esc(b.dataset.title), confirmText: IN.t('Delete', 'Futa') }))) return; await IN.api.del(`/student-documents/${b.dataset.id}`); IN.toast(IN.t('Deleted.', 'Imefutwa.')); render(); },
      });
    };
    await render();
  };
}(window));
