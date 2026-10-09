/* QR tags: make them, print the labels, scan them, see whether an item is sold.
   - SP.qr.*                helpers used by other screens (POS, sales, products)
   - SP.modules.scan        the "Scan QR" page
   - SP.qr.mountProductCard the QR section on a product's page
   The code rules below mirror src/lib/shop-qr.js — tests/shop-qr.test.mjs checks they agree. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;
  const QR = (SP.qr = {});

  // ------------------------------------------------------------ codes & links
  const CODE_RE = /^[A-HJ-NP-Z2-9]{12}$/;
  // Accepts a full scanned link (…?c=CODE) or a code typed by hand. Returns CODE or null.
  // urlOnly: only the link form — used for hand-held scanners typing into the till's search box,
  // so a 12-digit product barcode can never be mistaken for a QR code.
  QR.extract = (input, { urlOnly = false } = {}) => {
    const raw = String(input == null ? '' : input).trim();
    if (!raw || raw.length > 500) return null;
    let cand = null;
    try { cand = new URL(raw).searchParams.get('c'); } catch (e) { /* not a full link */ }
    if (cand == null) { const m = raw.match(/[?&]c=([^&#\s]+)/i); if (m) cand = m[1]; }
    if (cand == null) { if (urlOnly) return null; cand = raw; }
    cand = cand.toUpperCase().replace(/[\s-]/g, '');
    return CODE_RE.test(cand) ? cand : null;
  };
  QR.link = (code) => `${location.origin}/shop-verify.html?c=${code}`;
  QR.pad = (serial) => String(serial).padStart(4, '0');
  QR.tag = (serial) => `#${QR.pad(serial)}`;

  // Item numbers sold on one product of a sale (for receipts): "#0001, #0002"
  QR.serialsFor = (saleData, productId) =>
    ((saleData && saleData.qr_units) || []).filter((q) => q.product_id === productId).map((q) => QR.tag(q.serial)).join(', ');
  QR.serialsHtml = (saleData, productId) => {
    const s = QR.serialsFor(saleData, productId);
    return s ? `<div class="sp-qr-serials"><i class="fa-solid fa-qrcode"></i> ${esc(s)}</div>` : '';
  };

  QR.statusChip = (status) => {
    const map = {
      in_stock: ['ok', SP.t('Available', 'Ipo')], sold: ['sold', SP.t('Sold', 'Imeuzwa')], disabled: ['disabled', SP.t('Disabled', 'Imezimwa')],
    };
    const [cls, text] = map[status] || ['', status];
    return SP.chip(cls, text);
  };

  // ------------------------------------------------------------ drawing a QR
  QR.svg = async (text) => {
    await SP.lib('qr');
    const q = window.qrcode(0, 'M');           // size picked automatically, medium error correction
    q.addData(text); q.make();
    return q.createSvgTag({ cellSize: 4, margin: 12, scalable: true });   // 3-cell quiet zone
  };

  // ------------------------------------------------------------ labels (print)
  const SIZES = { s: 5, m: 4, l: 3 };
  async function sheetHtml(product, units, size) {
    await SP.lib('qr');
    const shop = (SP.state.shop && (SP.state.shop.short_name || SP.state.shop.name)) || '';
    const labels = [];
    for (const u of units) {
      const svg = await QR.svg(QR.link(u.code));
      labels.push(`<div class="sp-qr-label"><div class="qr">${svg}</div><div class="tx"><span class="shop">${esc(shop)}</span><b class="pn">${esc(product.name)}</b><span class="sn">${QR.tag(u.serial)} · ${esc(u.code)}</span></div></div>`);
    }
    return `<div class="sp-qr-sheet" data-size="${size}" style="--qr-cols:${SIZES[size] || 4}">${labels.join('')}</div>`;
  }

  // Preview + print. units = [{ serial, code }]
  QR.openLabels = async (product, units, { title } = {}) => {
    if (!units.length) { SP.toast(SP.t('There are no QR labels to print.', 'Hakuna lebo za QR za kuchapisha.'), 'warn'); return; }
    let size = 'm';
    const many = units.length;
    const back = SP.modal(title || SP.t(`QR labels — ${product.name}`, `Lebo za QR — ${product.name}`), `
      <div class="sp-spread" style="margin-bottom:.9rem;gap:.8rem;flex-wrap:wrap">
        <span class="sp-small sp-muted">${SP.t(`${many} label${many === 1 ? '' : 's'}. Print on sticker paper, or on plain paper and cut along the dotted lines.`, `Lebo ${many}. Chapisha kwenye karatasi ya stika, au karatasi ya kawaida kisha kata kwa mistari ya nukta.`)}</span>
        <div class="sp-seg" id="qrSize" role="group" aria-label="${SP.t('Label size', 'Ukubwa wa lebo')}"><button data-s="s">${SP.t('Small', 'Ndogo')}</button><button data-s="m" class="on">${SP.t('Medium', 'Kati')}</button><button data-s="l">${SP.t('Large', 'Kubwa')}</button></div>
      </div>
      <div class="sp-qr-preview" id="qrPreview">${SP.skeleton(3)}</div>`, {
      size: 'wide',
      footer: `<button class="sp-btn ghost" data-close2>${SP.t('Close', 'Funga')}</button><button class="sp-btn primary" data-print><i class="fa-solid fa-print"></i> ${SP.t('Print labels', 'Chapisha Lebo')}</button>`,
    });
    const box = back.querySelector('#qrPreview');
    let html = '';
    async function draw() {
      box.style.opacity = '.5';
      try { html = await sheetHtml(product, units, size); box.innerHTML = html; } catch (e) { box.innerHTML = SP.errorBox(e); html = ''; }
      box.style.opacity = '1';
    }
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    back.querySelector('#qrSize').addEventListener('click', (e) => {
      const b = e.target.closest('button'); if (!b) return; size = b.dataset.s;
      back.querySelectorAll('#qrSize button').forEach((x) => x.classList.toggle('on', x === b)); draw();
    });
    back.querySelector('[data-print]').addEventListener('click', () => { if (html) SP.print(html); });
    await draw();
  };

  // One code, big — to show a customer or copy the link.
  QR.openOne = async (product, unit) => {
    const link = QR.link(unit.code);
    const svg = await QR.svg(link);
    const back = SP.modal(`${product.name} ${QR.tag(unit.serial)}`, `
      <div class="sp-qr-one"><div class="qr">${svg}</div>
      <div class="sp-small sp-muted" style="word-break:break-all">${esc(link)}</div>
      <div class="sp-row" style="justify-content:center;margin-top:.8rem"><button class="sp-btn ghost sm" data-copy><i class="fa-regular fa-copy"></i> ${SP.t('Copy link', 'Nakili kiungo')}</button></div></div>`, {
      footer: `<button class="sp-btn ghost" data-close2>${SP.t('Close', 'Funga')}</button><button class="sp-btn primary" data-print><i class="fa-solid fa-print"></i> ${SP.t('Print label', 'Chapisha Lebo')}</button>`,
    });
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    back.querySelector('[data-print]').addEventListener('click', () => { SP.closeModal(); QR.openLabels(product, [unit]); });
    back.querySelector('[data-copy]').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(link); SP.toast(SP.t('Link copied.', 'Kiungo kimenakiliwa.')); }
      catch (e) { SP.toast(link, 'warn'); }
    });
  };

  // ------------------------------------------------------------ scanning (camera / photo / typed)
  function beep() {
    try { if (navigator.vibrate) navigator.vibrate(60); } catch (e) { /* ignore */ }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext; if (!Ctx) return;
      const ctx = beep.ctx || (beep.ctx = new Ctx()); const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine'; o.frequency.value = 880; g.gain.value = 0.08; o.connect(g); g.connect(ctx.destination);
      o.start(); o.stop(ctx.currentTime + 0.09);
    } catch (e) { /* ignore */ }
  }

  // Reads a QR out of a still picture. Uses the browser's own detector when it has one, jsQR otherwise.
  let nativeDetector; // undefined = not asked yet, null = none
  async function getDetector() {
    if (nativeDetector !== undefined) return nativeDetector;
    nativeDetector = null;
    if ('BarcodeDetector' in window) {
      try {
        const formats = await window.BarcodeDetector.getSupportedFormats();
        if (formats.includes('qr_code')) nativeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
      } catch (e) { /* fall back to jsQR */ }
    }
    return nativeDetector;
  }
  async function decodeImageFile(file) {
    const img = await new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file); const im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); resolve(im); };
      im.onerror = () => { URL.revokeObjectURL(url); reject(new Error(SP.t('That file is not a picture we can read.', 'Faili hiyo si picha tunayoweza kusoma.'))); };
      im.src = url;
    });
    const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
    const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const g = c.getContext('2d', { willReadFrequently: true }); g.drawImage(img, 0, 0, c.width, c.height);
    const det = await getDetector();
    if (det) { try { const r = await det.detect(c); if (r[0] && r[0].rawValue) return r[0].rawValue; } catch (e) { /* try jsQR */ } }
    await SP.lib('jsqr');
    const d = g.getImageData(0, 0, c.width, c.height);
    const res = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'attemptBoth' });
    return res ? res.data : null;
  }

  // opts: { title, hint, continuous, onScan(code) }
  //  - continuous=false: the dialog closes on the first valid code, then onScan(code) runs.
  //  - continuous=true : the dialog stays open (till: scan item after item); onScan runs for each code.
  QR.scan = (opts = {}) => {
    const { title = SP.t('Scan QR code', 'Changanua Msimbo wa QR'), hint = '', continuous = false, onScan } = opts;
    const back = SP.modal(title, `
      <div class="sp-scan"><video playsinline muted></video><div class="sp-scan-frame"></div><div class="sp-scan-msg" id="qrMsg"></div></div>
      <p class="sp-small sp-muted" style="margin:.7rem 0 .5rem">${esc(hint || SP.t('Point the camera at the QR label on the item.', 'Elekeza kamera kwenye lebo ya QR iliyo kwenye bidhaa.'))}</p>
      <form class="sp-row" id="qrManual" novalidate>
        <input class="sp-input grow" name="c" placeholder="${SP.t('…or type / paste the code or link', '…au andika / bandika msimbo au kiungo')}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${SP.t('QR code or link', 'Msimbo wa QR au kiungo')}">
        <button class="sp-btn ghost" type="submit">${SP.t('Check', 'Angalia')}</button>
      </form>
      <div style="margin-top:.6rem"><label class="sp-btn ghost sm" for="qrFile"><i class="fa-solid fa-image"></i> ${SP.t('Use a photo instead', 'Tumia picha badala yake')}</label><input type="file" id="qrFile" accept="image/*" capture="environment" class="sp-sr"></div>`, {
      footer: `<button class="sp-btn ghost" data-close2>${SP.t('Close', 'Funga')}</button>`,
      onClose: () => stop(),
    });
    const video = back.querySelector('video'); const msgEl = back.querySelector('#qrMsg');
    let stopped = false; let stream = null; let raf = 0; let busy = false; let lastRun = 0; let lastText = ''; let lastAt = 0; let msgTimer = 0;

    function stop() { stopped = true; cancelAnimationFrame(raf); if (stream) { stream.getTracks().forEach((t) => t.stop()); stream = null; } }
    function msg(text, tone = '') {
      msgEl.textContent = text; msgEl.className = `sp-scan-msg show ${tone}`;
      clearTimeout(msgTimer); msgTimer = setTimeout(() => { msgEl.className = 'sp-scan-msg'; }, 3200);
    }
    async function accept(text, fromCamera) {
      const now = Date.now();
      if (fromCamera && text === lastText && now - lastAt < 2500) return;   // same label still in view
      lastText = text; lastAt = now;
      const code = QR.extract(text);
      if (!code) { msg(SP.t('This is not a Smart21Shop QR code.', 'Huu si msimbo wa QR wa Smart21Shop.'), 'warn'); return; }
      beep();
      if (!continuous) { stop(); SP.closeModal(true); }
      try { if (onScan) await onScan(code); } catch (e) { SP.fail(e); }
    }
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    back.querySelector('#qrManual').addEventListener('submit', async (e) => {
      e.preventDefault(); const inp = e.target.elements.c; const v = inp.value.trim(); if (!v) return;
      if (!QR.extract(v)) { msg(SP.t('That is not a valid code. It has 12 letters and numbers.', 'Msimbo huo si sahihi. Una herufi na namba 12.'), 'warn'); return; }
      inp.value = ''; await accept(v, false);
    });
    back.querySelector('#qrFile').addEventListener('change', async (e) => {
      const f = e.target.files[0]; e.target.value = ''; if (!f) return;
      msg(SP.t('Reading the photo…', 'Inasoma picha…'));
      try {
        const text = await decodeImageFile(f);
        if (!text) { msg(SP.t('No QR code found in that photo. Try again — closer, steady, in good light.', 'Hakuna QR kwenye picha hiyo. Jaribu tena — karibu zaidi, kwa utulivu, mwanga mzuri.'), 'warn'); return; }
        await accept(text, false);
      } catch (err) { msg(err.message, 'warn'); }
    });

    const canvas = document.createElement('canvas'); const g = canvas.getContext('2d', { willReadFrequently: true });
    async function tick() {
      if (stopped) return;
      if (!back.isConnected) { stop(); return; }      // this dialog was replaced by another one → free the camera
      raf = requestAnimationFrame(tick);
      const now = performance.now();
      if (busy || now - lastRun < 120 || video.readyState < 2 || !video.videoWidth) return;
      lastRun = now; busy = true;
      try {
        let text = null; const det = await getDetector();
        if (det) { const r = await det.detect(video); text = r[0] && r[0].rawValue; }
        else {
          const sc = Math.min(1, 640 / Math.max(video.videoWidth, video.videoHeight));
          canvas.width = Math.round(video.videoWidth * sc); canvas.height = Math.round(video.videoHeight * sc);
          g.drawImage(video, 0, 0, canvas.width, canvas.height);
          const d = g.getImageData(0, 0, canvas.width, canvas.height);
          const res = window.jsQR(d.data, d.width, d.height, { inversionAttempts: 'dontInvert' });
          text = res && res.data;
        }
        if (text) await accept(text, true);
      } catch (e) { /* one bad frame is fine */ } finally { busy = false; }
    }
    (async function start() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        msg(SP.t('This browser cannot open the camera here. Use a photo or type the code below.', 'Kivinjari hiki hakiwezi kufungua kamera hapa. Tumia picha au andika msimbo hapa chini.'), 'warn'); return;
      }
      try { stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false }); }
      catch (e) {
        msg(e && e.name === 'NotAllowedError'
          ? SP.t('Camera is blocked. Allow camera access for this site, or use a photo / type the code below.', 'Kamera imezuiwa. Ruhusu kamera kwa tovuti hii, au tumia picha / andika msimbo hapa chini.')
          : SP.t('No camera found. Use a photo or type the code below.', 'Kamera haijapatikana. Tumia picha au andika msimbo hapa chini.'), 'warn');
        return;
      }
      if (stopped || !back.isConnected) { stop(); return; }
      video.srcObject = stream; await video.play().catch(() => {});
      if (!(await getDetector())) { try { await SP.lib('jsqr'); } catch (e) { msg(e.message, 'warn'); return; } }
      tick();
    }());
    return { close: () => { stop(); SP.closeModal(true); } };
  };

  // ------------------------------------------------------------ "Scan QR" page
  const recent = []; // this visit only: { code, name, serial, status, at }
  const remember = (d) => {
    const i = recent.findIndex((r) => r.code === d.unit.code); if (i >= 0) recent.splice(i, 1);
    recent.unshift({ code: d.unit.code, name: d.product.name, serial: d.unit.serial, status: d.unit.status, at: Date.now() });
    recent.length = Math.min(recent.length, 8);
  };
  const STATUS_UI = () => ({
    in_stock: { icon: 'fa-circle-check', tone: 'ok', title: SP.t('Available — not sold yet', 'Ipo — haijauzwa bado') },
    sold: { icon: 'fa-bag-shopping', tone: 'sold', title: SP.t('Already sold', 'Imeshauzwa tayari') },
    disabled: { icon: 'fa-ban', tone: 'bad', title: SP.t('Tag disabled — do not sell', 'Lebo imezimwa — usiuze') },
  });

  function resultHtml(d) {
    const ui = STATUS_UI()[d.unit.status] || STATUS_UI().disabled; const p = d.product; const u = d.unit;
    const rows = [
      [SP.t('Product', 'Bidhaa'), `<a href="#product/${p.id}"><b>${esc(p.name)}</b></a>${p.category_name ? ` <span class="sp-muted">· ${esc(p.category_name)}</span>` : ''}`],
      [SP.t('Item number', 'Namba ya kipande'), `<b>${QR.tag(u.serial)}</b>`],
      [SP.t('Selling price', 'Bei ya Mauzo'), SP.money(p.sell_price)],
    ];
    if (u.status === 'sold') {
      rows.push([SP.t('Sold on', 'Iliuzwa'), SP.dateTime(u.sold_at)]);
      if (d.sale) {
        rows.push([SP.t('Receipt', 'Risiti'), `<a href="#sale/${d.sale.id}"><b>${esc(d.sale.receipt_no)}</b></a>`]);
        rows.push([SP.t('Customer', 'Mteja'), esc(d.sale.customer_name || SP.t('Walk-in customer', 'Mteja wa Papo Hapo'))]);
      }
    }
    const canSell = u.status === 'in_stock' && p.status === 'active' && SP.can('sales.create');
    const acts = [
      canSell ? `<button class="sp-btn primary" data-act="sell" data-code="${u.code}"><i class="fa-solid fa-cash-register"></i> ${SP.t('Sell this item', 'Uza kipande hiki')}</button>` : '',
      SP.can('products.manage') && u.status !== 'sold'
        ? `<button class="sp-btn ghost" data-act="toggle" data-id="${u.id}" data-to="${u.status === 'disabled' ? 'in_stock' : 'disabled'}" data-code="${u.code}"><i class="fa-solid ${u.status === 'disabled' ? 'fa-rotate-left' : 'fa-ban'}"></i> ${u.status === 'disabled' ? SP.t('Enable tag', 'Washa lebo') : SP.t('Disable tag', 'Zima lebo')}</button>` : '',
    ].join('');
    return `<div class="sp-card sp-qr-result ${ui.tone}">
      <div class="sp-qr-verdict"><span class="ico"><i class="fa-solid ${ui.icon}"></i></span><div><h3>${esc(ui.title)}</h3><div class="sp-small sp-muted">${SP.t('Checked just now', 'Imekaguliwa sasa hivi')}</div></div></div>
      <dl class="sp-qr-kv">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v}</dd>`).join('')}</dl>
      ${acts ? `<div class="sp-row" style="margin-top:1rem;gap:.6rem;flex-wrap:wrap">${acts}</div>` : ''}
    </div>`;
  }

  SP.modules.scan = async (el) => {
    el.innerHTML = `${SP.pageHead(SP.t('Scan QR', 'Changanua QR'), SP.t('Check whether an item is still available or already sold', 'Angalia kama bidhaa ipo bado au imeshauzwa'))}
      <div class="sp-grid split">
        <div class="sp-stack">
          <div class="sp-card sp-scan-card">
            <div class="ico"><i class="fa-solid fa-qrcode"></i></div>
            <h3>${SP.t('Scan an item label', 'Changanua lebo ya bidhaa')}</h3>
            <p class="sp-muted" style="margin:.2rem 0 1rem">${SP.t('Use the camera, or type the code printed under the QR.', 'Tumia kamera, au andika msimbo ulioandikwa chini ya QR.')}</p>
            <button class="sp-btn primary lg" data-act="camera"><i class="fa-solid fa-camera"></i> ${SP.t('Scan with camera', 'Changanua kwa kamera')}</button>
            <form class="sp-row" id="scanManual" novalidate style="margin-top:1rem">
              <input class="sp-input grow" name="c" placeholder="${SP.t('Type or paste a code / link', 'Andika au bandika msimbo / kiungo')}" autocomplete="off" autocapitalize="characters" spellcheck="false" aria-label="${SP.t('QR code or link', 'Msimbo wa QR au kiungo')}">
              <button class="sp-btn ghost" type="submit">${SP.t('Check', 'Angalia')}</button>
            </form>
          </div>
          <div id="scanResult"></div>
        </div>
        <div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Recent scans', 'Ulizoskani hivi karibuni')}</h3></div><div id="scanRecent"></div></div>
      </div>`;
    const out = el.querySelector('#scanResult'); const rec = el.querySelector('#scanRecent');
    const drawRecent = () => {
      rec.innerHTML = recent.length
        ? `<div class="sp-list">${recent.map((r) => `<button type="button" class="sp-spread sp-qr-recent" data-act="again" data-code="${r.code}"><span><b>${esc(r.name)}</b> <span class="sp-muted">${QR.tag(r.serial)}</span></span>${QR.statusChip(r.status)}</button>`).join('')}</div>`
        : SP.empty('fa-clock-rotate-left', SP.t('Nothing scanned yet', 'Hujaskani kitu bado'), SP.t('Items you scan will be listed here.', 'Bidhaa utakazoskani zitaorodheshwa hapa.'));
    };
    async function check(code) {
      out.innerHTML = SP.skeleton(3);
      try { const d = await SP.api.get('/qr/lookup' + SP.qs({ code })); remember(d); out.innerHTML = resultHtml(d); drawRecent(); out.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); }
      catch (e) { out.innerHTML = `<div class="sp-card">${SP.empty('fa-circle-xmark', SP.t('Not found', 'Haijapatikana'), e.message)}</div>`; }
    }
    el.querySelector('#scanManual').addEventListener('submit', (e) => {
      e.preventDefault(); const v = e.target.elements.c.value.trim(); if (!v) return;
      const code = QR.extract(v);
      if (!code) { SP.toast(SP.t('That is not a valid code. It has 12 letters and numbers.', 'Msimbo huo si sahihi. Una herufi na namba 12.'), 'warn'); return; }
      e.target.reset(); check(code);
    });
    SP.delegate(el, {
      camera: () => QR.scan({ onScan: check }),
      again: (b) => check(b.dataset.code),
      sell: (b) => { SP.state.pendingQr = b.dataset.code; SP.go('pos'); },
      toggle: async (b) => {
        await SP.api.post(`/qr/${b.dataset.id}/status`, { status: b.dataset.to });
        SP.toast(b.dataset.to === 'disabled' ? SP.t('Tag disabled.', 'Lebo imezimwa.') : SP.t('Tag enabled.', 'Lebo imewashwa.'));
        await check(b.dataset.code);
      },
    });
    drawRecent();
  };

  // ------------------------------------------------------------ QR section on a product's page
  QR.mountProductCard = async (box, p) => {
    const canManage = SP.can('products.manage');
    const st = { status: '', page: 1, limit: 15 };
    const picked = new Map();   // id -> unit, kept while paging
    let data = null;

    async function fetchAll(status) {
      const all = [];
      for (let page = 1; page <= 6; page += 1) {
        const r = await SP.api.get(`/products/${p.id}/qr` + SP.qs({ status, page, limit: 200 }));
        all.push(...r.units); if (all.length >= r.total) break;
      }
      return all.sort((a, b) => a.serial - b.serial);
    }
    async function load() {
      try { data = await SP.api.get(`/products/${p.id}/qr` + SP.qs({ status: st.status, page: st.page, limit: st.limit })); render(); }
      catch (e) { box.innerHTML = SP.errorBox(e); }
    }
    function render() {
      const s = data.summary; const units = data.units;
      const printBtn = s.in_stock || picked.size
        ? `<button class="sp-btn ghost sm" data-act="printAvail"><i class="fa-solid fa-print"></i> ${picked.size ? SP.t(`Print selected (${picked.size})`, `Chapisha zilizochaguliwa (${picked.size})`) : SP.t('Print labels', 'Chapisha lebo')}</button>` : '';
      const genBtn = canManage ? `<button class="sp-btn primary sm" data-act="generate"><i class="fa-solid fa-plus"></i> ${SP.t('Generate', 'Tengeneza')}</button>` : '';
      const head = `<div class="sp-card-head"><h3><i class="fa-solid fa-qrcode" style="color:var(--sp-primary)"></i> ${SP.t('QR codes', 'Misimbo ya QR')}</h3><div class="sp-row">${printBtn}${genBtn}</div></div>`;
      if (!s.total) {
        box.innerHTML = `${head}${SP.empty('fa-qrcode', SP.t('No QR codes yet', 'Hakuna misimbo ya QR bado'),
          SP.t('Give each item its own QR label. Scanning it shows whether that exact item is still available or already sold.', 'Pa kila kipande lebo yake ya QR. Kuiskani kunaonyesha kama kipande hicho hasa bado kipo au kimeshauzwa.'),
          canManage ? `<button class="sp-btn primary" data-act="generate"><i class="fa-solid fa-plus"></i> ${SP.t('Generate QR codes', 'Tengeneza Misimbo ya QR')}</button>` : '')}`;
        return;
      }
      const seg = [['', SP.t('All', 'Zote'), s.total], ['in_stock', SP.t('Available', 'Zipo'), s.in_stock], ['sold', SP.t('Sold', 'Zimeuzwa'), s.sold], ['disabled', SP.t('Disabled', 'Zimezimwa'), s.disabled]];
      const cols = [
        { label: '', render: (u) => `<input type="checkbox" data-pick="${u.id}" ${picked.has(u.id) ? 'checked' : ''} aria-label="${SP.t('Select', 'Chagua')} ${QR.tag(u.serial)}">` },
        { label: SP.t('No.', 'Namba'), render: (u) => `<b>${QR.tag(u.serial)}</b>` },
        { label: SP.t('Code', 'Msimbo'), render: (u) => `<span class="sp-qr-code">${esc(u.code)}</span>` },
        { label: SP.t('Status', 'Hali'), render: (u) => QR.statusChip(u.status) },
        { label: SP.t('Sold', 'Iliuzwa'), render: (u) => u.status === 'sold' ? `${SP.date(u.sold_at)}${u.receipt_no ? ` · <a href="#sale/${u.sale_id}">${esc(u.receipt_no)}</a>` : ''}` : '—' },
        { label: '', cls: 'end', render: (u) => `<div class="sp-actions-cell"><button class="sp-btn ghost sm" data-act="show" data-id="${u.id}" title="${SP.t('Show QR', 'Onyesha QR')}"><i class="fa-solid fa-qrcode"></i></button>${
          canManage && u.status !== 'sold' ? `<button class="sp-btn ghost sm" data-act="toggle" data-id="${u.id}" data-to="${u.status === 'disabled' ? 'in_stock' : 'disabled'}" title="${u.status === 'disabled' ? SP.t('Enable tag', 'Washa lebo') : SP.t('Disable tag', 'Zima lebo')}"><i class="fa-solid ${u.status === 'disabled' ? 'fa-rotate-left' : 'fa-ban'}"></i></button>` : ''}</div>` },
      ];
      box.innerHTML = `${head}
        <div class="sp-row" style="margin:.2rem 0 .8rem;justify-content:space-between;flex-wrap:wrap;gap:.6rem">
          <div class="sp-seg" id="qrSeg">${seg.map(([v, l, n]) => `<button data-v="${v}" class="${st.status === v ? 'on' : ''}">${esc(l)} <small>${n}</small></button>`).join('')}</div>
          <span class="sp-small sp-muted">${s.in_stock ? SP.t(`${s.in_stock} available`, `${s.in_stock} zipo`) : ''}${p.track_stock ? SP.t(` · stock says ${SP.num(p.stock_qty)}`, ` · stoo inasema ${SP.num(p.stock_qty)}`) : ''}</span>
        </div>
        ${SP.table(cols, units, { cls: 'compact', empty: SP.empty('fa-filter', SP.t('Nothing here', 'Hakuna hapa'), '') })}${SP.pager(data.page, data.limit, data.total)}`;
    }

    async function generateDialog() {
      const untagged = p.track_stock ? Math.max(0, Math.round(p.stock_qty - data.summary.in_stock)) : 0;
      SP.formModal({
        title: SP.t(`Generate QR codes — ${p.name}`, `Tengeneza Misimbo ya QR — ${p.name}`), submit: SP.t('Generate', 'Tengeneza'),
        body: `${SP.f.input('count', SP.t('How many items need a label?', 'Vipande vingapi vinahitaji lebo?'), { type: 'number', required: true, value: Math.min(300, untagged || 1), attr: { min: 1, max: 300, step: 1 }, hint: p.track_stock ? SP.t(`Stock says ${SP.num(p.stock_qty)}; ${data.summary.in_stock} already have an available label. Up to 300 at a time.`, `Stoo inasema ${SP.num(p.stock_qty)}; ${data.summary.in_stock} tayari zina lebo. Hadi 300 kwa wakati mmoja.`) : SP.t('Up to 300 at a time.', 'Hadi 300 kwa wakati mmoja.') })}
          <p class="sp-small sp-muted" style="margin:0">${SP.t('Each item gets a different code. You can print the labels straight after.', 'Kila kipande kinapata msimbo tofauti. Unaweza kuchapisha lebo mara baada ya hapo.')}</p>`,
        onSubmit: async (f) => {
          const r = await SP.api.post(`/products/${p.id}/qr`, { count: Number(f.count) });
          SP.closeModal(); SP.toast(SP.t(`${r.units.length} QR codes created.`, `Misimbo ya QR ${r.units.length} imetengenezwa.`));
          st.status = ''; st.page = 1; await load(); QR.openLabels(p, r.units);
        },
      });
    }

    SP.delegate(box, {
      generate: generateDialog,
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      show: (b) => { const u = data.units.find((x) => String(x.id) === b.dataset.id); if (u) QR.openOne(p, u); },
      toggle: async (b) => {
        await SP.api.post(`/qr/${b.dataset.id}/status`, { status: b.dataset.to });
        SP.toast(b.dataset.to === 'disabled' ? SP.t('Tag disabled.', 'Lebo imezimwa.') : SP.t('Tag enabled.', 'Lebo imewashwa.')); await load();
      },
      printAvail: async () => {
        const units = picked.size ? [...picked.values()].sort((a, b) => a.serial - b.serial) : await fetchAll('in_stock');
        QR.openLabels(p, units);
      },
    });
    box.addEventListener('click', (e) => {
      const b = e.target.closest('#qrSeg button'); if (!b) return;
      st.status = b.dataset.v; st.page = 1; load();
    });
    box.addEventListener('change', (e) => {
      const c = e.target.closest('[data-pick]'); if (!c) return;
      const u = data.units.find((x) => String(x.id) === c.dataset.pick); if (!u) return;
      if (c.checked) picked.set(u.id, u); else picked.delete(u.id);
      render();
    });
    box.innerHTML = SP.skeleton(3);
    await load();
  };
})();
