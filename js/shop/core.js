/* Smart21Shop — client core: API, UI kit, forms, print/PDF.
   Plain JavaScript, no build step — each module in js/shop/ registers a
   screen in SP.modules and is easy for another shop to modify. */
(function (global) {
  'use strict';
  const SP = global.SP || (global.SP = {});
  SP.state = { user: null, shop: null, role: null, perms: [], settings: {}, lookups: null, photoV: Date.now() };
  SP.modules = {};

  // ------------------------------------------------------------ language (English / Kiswahili)
  // Shares the same storage key as the rest of the Smart21Brain site, so a
  // language choice made anywhere (marketing pages or any app) applies here too.
  const LANG_KEY = 's21-lang';
  SP.lang = () => { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } };
  SP.isSw = () => SP.lang() === 'sw';
  SP.setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } };
  SP.toggleLang = () => { SP.setLang(SP.isSw() ? 'en' : 'sw'); location.reload(); };
  // Pick between an English and Swahili string for the current language.
  SP.t = (en, sw) => (SP.isSw() ? sw : en);

  // ------------------------------------------------------------ helpers
  SP.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = SP.esc;
  SP.can = (perm) => SP.state.role === 'owner' || SP.state.perms.includes(perm);
  SP.canAny = (...perms) => perms.some((p) => SP.can(p));
  SP.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  SP.today = () => new Date().toISOString().slice(0, 10);
  SP.money = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${(SP.state.shop && SP.state.shop.currency) || ''}`.trim();
  SP.moneyHtml = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <small>${esc((SP.state.shop && SP.state.shop.currency) || '')}</small>`;
  SP.shopInitials = (s) => String((s && (s.short_name || s.name)) || 'S').slice(0, 2).toUpperCase();
  SP.num = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  SP.date = (d) => {
    if (!d) return '—';
    const dt = new Date(String(d).length <= 10 ? d + 'T00:00:00' : String(d).replace(' ', 'T') + 'Z');
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };
  SP.dateTime = (d) => {
    if (!d) return '—';
    const dt = new Date(String(d).replace(' ', 'T') + 'Z');
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  SP.cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, ' ') : '');
  SP.initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const STATUS_TEXT = { paid: 'Paid', partial: 'Partial', unpaid: 'Unpaid', active: 'Active', inactive: 'Inactive', completed: 'Completed', void: 'Cancelled', retail: 'Retail', wholesale: 'Wholesale', vip: 'VIP', ok: 'In stock', low: 'Low stock', out: 'Out of stock', na: 'Service' };
  const STATUS_TEXT_SW = { paid: 'Imelipwa', partial: 'Sehemu', unpaid: 'Haijalipwa', active: 'Hai', inactive: 'Haifanyi kazi', completed: 'Imekamilika', void: 'Imeghairiwa', retail: 'Rejareja', wholesale: 'Jumla', vip: 'VIP', ok: 'Ipo stoo', low: 'Inapungua', out: 'Imeisha', na: 'Huduma' };
  SP.chip = (status, text) => `<span class="sp-chip ${esc(status)}">${esc(text || (SP.isSw() ? STATUS_TEXT_SW[status] : STATUS_TEXT[status]) || SP.cap(status))}</span>`;
  SP.photoUrl = (kind, id) => `/api/shop/${kind}/${id}/image?shop_id=${SP.state.shop ? SP.state.shop.id : ''}&v=${SP.state.photoV}`;
  SP.logoUrl = (id) => `/api/shop/public/logo/${id || (SP.state.shop && SP.state.shop.id)}?v=${SP.state.photoV}`;
  SP.avatar = (kind, id, name, has, size = '') =>
    `<span class="sp-avatar ${size}">${esc(SP.initials(name))}${has ? `<img src="${SP.photoUrl(kind, id)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  SP.shopLogo = (cls = 'sp-logo') => {
    const s = SP.state.shop || {};
    return `<span class="${cls}" style="position:relative">${esc((s.short_name || 'S').slice(0, 2))}${s.has_logo ? `<img src="${SP.logoUrl(s.id)}" alt="" style="position:absolute;inset:0" onerror="this.remove()">` : ''}</span>`;
  };
  SP.setBrand = (color) => { if (/^#[0-9a-f]{6}$/i.test(color || '')) document.documentElement.style.setProperty('--sp-primary', color); };

  // ------------------------------------------------------------ API
  async function request(method, path, body, isForm) {
    const opts = { method, credentials: 'include', headers: {} };
    if (SP.state.shop) opts.headers['X-Shop-Id'] = String(SP.state.shop.id);
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    let res;
    try { res = await fetch('/api/shop' + path, opts); } catch (e) { throw new Error('Cannot reach the server. Please check your internet connection and try again.'); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401 && !/^\/(login|register-shop)/.test(path)) { if (!/shop-login/.test(location.pathname)) location.href = 'shop-login.html'; throw new Error('Please sign in again.'); }
    if (!res.ok) { const err = new Error((data && data.error) || `Something went wrong (${res.status}).`); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  SP.api = {
    get: (p) => request('GET', p), post: (p, b) => request('POST', p, b || {}), put: (p, b) => request('PUT', p, b || {}),
    del: (p) => request('DELETE', p), upload: (p, fd) => request('POST', p, fd, true),
  };
  SP.qs = (obj) => {
    const q = Object.entries(obj || {}).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return q ? '?' + q : '';
  };

  // Cached lookups (categories, payment methods…) — call SP.refreshLookups() after changing them.
  SP.lookups = async () => SP.state.lookups || SP.refreshLookups();
  SP.refreshLookups = async () => (SP.state.lookups = await SP.api.get('/lookups'));

  // ------------------------------------------------------------ lazy libraries
  const LIBS = {
    chart: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
    // QR tags: drawing a code, and reading one from the camera (kept in the project, no CDN needed).
    qr: '/js/vendor/qrcode.min.js?v=1',
    jsqr: '/js/vendor/jsQR.min.js?v=1',
  };
  const loading = {};
  SP.lib = (name) => {
    const src = LIBS[name];
    if (loading[name]) return loading[name];
    loading[name] = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.onload = resolve;
      s.onerror = () => { delete loading[name]; reject(new Error('Could not load a helper library. Check your internet connection.')); };
      document.head.appendChild(s);
    });
    return loading[name];
  };

  // ------------------------------------------------------------ toast
  SP.toast = (message, type = 'ok') => {
    let stack = document.getElementById('spToasts');
    if (!stack) { stack = document.createElement('div'); stack.id = 'spToasts'; stack.className = 'sp-toasts'; stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    const el = document.createElement('div');
    el.className = `sp-toast ${type === 'ok' ? '' : type}`;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 6500 : 4200);
  };
  SP.fail = (err) => SP.toast(err && err.message ? err.message : String(err), 'error');

  // ------------------------------------------------------------ modal / confirm
  SP.modal = (title, bodyHtml, { size = '', footer = '', onClose } = {}) => {
    SP.closeModal(true);
    const back = document.createElement('div');
    back.className = 'sp-modal-back'; back.id = 'spModal';
    back.innerHTML = `<div class="sp-modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sp-modal-head"><h3>${esc(title)}</h3><button class="sp-icon-btn" data-close aria-label="${SP.t('Close', 'Funga')}"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="sp-modal-body">${bodyHtml}</div>${footer ? `<div class="sp-modal-foot">${footer}</div>` : ''}</div>`;
    back.__onClose = onClose;
    back.addEventListener('mousedown', (e) => { if (e.target === back) SP.closeModal(); });
    back.querySelector('[data-close]').addEventListener('click', () => SP.closeModal());
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    const first = back.querySelector('input:not([type=hidden]),select,textarea');
    if (first && !first.readOnly && window.innerWidth > 640) setTimeout(() => first.focus(), 60);
    return back;
  };
  SP.closeModal = (silent) => {
    const m = document.getElementById('spModal');
    if (m) { m.remove(); if (m.__onClose && !silent) m.__onClose(); }
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') SP.closeModal(); });

  SP.confirm = ({ title = SP.t('Are you sure?', 'Una uhakika?'), message = '', confirmText = SP.t('Yes, continue', 'Ndiyo, endelea'), danger = true, icon }) => new Promise((resolve) => {
    const back = SP.modal(title, `<div><div class="sp-confirm-ico ${danger ? '' : 'info'}"><i class="fa-solid ${icon || (danger ? 'fa-triangle-exclamation' : 'fa-circle-question')}"></i></div><p style="margin:0">${message}</p></div>`, {
      footer: `<button class="sp-btn ghost" data-no>${SP.t('Cancel', 'Ghairi')}</button><button class="sp-btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirmText)}</button>`, onClose: () => resolve(false),
    });
    back.querySelector('[data-no]').addEventListener('click', () => SP.closeModal());
    back.querySelector('[data-yes]').addEventListener('click', () => { back.__onClose = null; SP.closeModal(true); resolve(true); });
    back.querySelector('[data-yes]').focus();
  });

  // Small popup menu anchored to a button: items = [{ label, icon, danger, fn }]
  SP.popMenu = (anchor, items) => {
    document.querySelectorAll('.sp-pop').forEach((n) => n.remove());
    const m = document.createElement('div'); m.className = 'sp-pop'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}"><i class="fa-solid ${it.icon || 'fa-circle'}"></i>${esc(it.label)}</button>`).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(); const w = m.offsetWidth; const h = m.offsetHeight;
    m.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
    m.style.top = `${r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    const close = () => { m.remove(); document.removeEventListener('mousedown', away, true); window.removeEventListener('scroll', close, true); };
    const away = (e) => { if (!m.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('mousedown', away, true), 0); window.addEventListener('scroll', close, true);
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; close(); const it = items[Number(b.dataset.i)]; if (it && it.fn) Promise.resolve(it.fn()).catch(SP.fail); });
  };

  // ------------------------------------------------------------ small UI pieces
  SP.skeleton = (rows = 4) => `<div class="sp-card" aria-busy="true" aria-label="${SP.t('Loading', 'Inapakia')}">${Array.from({ length: rows }, (_, i) => `<div class="sp-skel line" style="width:${90 - i * 9}%"></div>`).join('')}</div>`;
  SP.skeletonPage = () => `<div class="sp-grid stats">${'<div class="sp-card"><div class="sp-skel box"></div></div>'.repeat(4)}</div><div class="sp-grid cols-2" style="margin-top:1.1rem">${'<div class="sp-card"><div class="sp-skel" style="height:220px"></div></div>'.repeat(2)}</div>`;
  SP.empty = (icon, title, text, action = '') => `<div class="sp-empty"><div class="ico"><i class="fa-solid ${icon}"></i></div><h4>${esc(title)}</h4><p>${esc(text)}</p>${action}</div>`;
  SP.errorBox = (err) => `<div class="sp-card">${SP.empty('fa-plug-circle-exclamation', SP.t('We could not load this page', 'Hatukuweza kupakia ukurasa huu'), err && err.message ? err.message : SP.t('Please try again.', 'Tafadhali jaribu tena.'), `<button class="sp-btn primary" onclick="location.reload()">${SP.t('Try again', 'Jaribu tena')}</button>`)}</div>`;
  SP.pageHead = (title, sub, actions = '') => `<div class="sp-page-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="sp-row">${actions}</div></div>`;
  SP.stat = (icon, value, label, sub = '', tone = '') => `<div class="sp-card sp-stat"><div class="ico ${tone}"><i class="fa-solid ${icon}"></i></div><div><div class="val">${value}</div><div class="lbl">${esc(label)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
  SP.progress = (pct, tone = '') => `<div class="sp-progress ${tone}"><span style="width:${Math.max(0, Math.min(100, pct || 0))}%"></span></div>`;

  SP.table = (cols, rows, { empty, cls = '' } = {}) => {
    if (!rows.length) return empty || '';
    return `<div class="sp-table-wrap"><table class="sp-table ${cls}"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${
      rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  SP.pager = (page, limit, total) => {
    const sw = SP.isSw();
    if (total <= limit) return total ? `<div class="sp-pager"><span>${total} ${sw ? 'rekodi' : `record${total === 1 ? '' : 's'}`}</span></div>` : '';
    const pages = Math.ceil(total / limit);
    return `<div class="sp-pager"><span>${sw ? 'Inaonyesha' : 'Showing'} ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} ${sw ? 'kati ya' : 'of'} ${total}</span>
      <span class="sp-row"><button class="sp-btn ghost sm" data-act="page" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> ${sw ? 'Iliyotangulia' : 'Previous'}</button>
      <span>${sw ? 'Ukurasa' : 'Page'} ${page} ${sw ? 'kati ya' : 'of'} ${pages}</span>
      <button class="sp-btn ghost sm" data-act="page" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>${sw ? 'Inayofuata' : 'Next'} <i class="fa-solid fa-chevron-right"></i></button></span></div>`;
  };

  // Click delegation: <button data-act="name"> -> handlers.name(button, event)
  SP.delegate = (root, handlers) => {
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !root.contains(t)) return;
      const fn = handlers[t.dataset.act];
      if (!fn) return;
      e.preventDefault();
      try { await fn(t, e); } catch (err) { SP.fail(err); }
    });
  };

  // ------------------------------------------------------------ form fields
  const attrs = (o) => Object.entries(o || {}).map(([k, v]) => (v === true ? k : v === false || v == null ? '' : `${k}="${esc(v)}"`)).join(' ');
  SP.f = {
    input(name, label, o = {}) {
      const { type = 'text', value = '', required = false, placeholder = '', hint = '', attr = {}, cls = '' } = o;
      return `<div class="sp-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <input class="sp-input" id="f_${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required data-label="' + esc(label) + '"' : ''} ${attrs(attr)}>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    select(name, label, options, o = {}) {
      const { value = '', required = false, placeholder = SP.t('Select…', 'Chagua…'), hint = '', cls = '', attr = {}, noBlank = false } = o;
      const opts = options.map((x) => (Array.isArray(x) ? { v: x[0], l: x[1] } : x));
      return `<div class="sp-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <select class="sp-select" id="f_${name}" name="${name}" ${required ? 'required data-label="' + esc(label) + '"' : ''} ${attrs(attr)}>
        ${noBlank ? '' : `<option value="">${esc(placeholder)}</option>`}${opts.map((x) => `<option value="${esc(x.v)}" ${String(x.v) === String(value) ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</select>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    textarea(name, label, o = {}) {
      const { value = '', required = false, placeholder = '', hint = '', rows = 3, cls = '' } = o;
      return `<div class="sp-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <textarea class="sp-textarea" id="f_${name}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? 'required data-label="' + esc(label) + '"' : ''}>${esc(value)}</textarea>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    check: (name, label, checked = false, value = '1') => `<label class="sp-check"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}> ${label}</label>`,
    section: (icon, title) => `<div class="sp-section-title"><i class="fa-solid ${icon}"></i> ${esc(title)}</div>`,
  };
  SP.opts = {
    categories: (lk) => (lk.categories || []).map((c) => ({ v: c.id, l: c.name })),
    paymentMethods: (lk) => (lk.payment_methods || []).map((m) => [m, m]),
    customerType: [['retail', 'Retail'], ['wholesale', 'Wholesale'], ['vip', 'VIP']],
    gender: [['male', 'Male'], ['female', 'Female']],
    status: [['active', 'Active'], ['inactive', 'Inactive']],
    units: (lk) => (lk.units || ['pcs', 'kg', 'g', 'litre', 'ml', 'metre', 'box', 'pack', 'dozen', 'bottle', 'bag', 'set', 'hour', 'service']).map((u) => [u, u]),
  };

  SP.formData = (form) => {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (k.endsWith('[]')) { const key = k.slice(0, -2); (out[key] = out[key] || []).push(v); } else out[k] = v;
    });
    form.querySelectorAll('input[type=checkbox]').forEach((c) => { if (!c.name.endsWith('[]')) out[c.name] = c.checked; });
    return out;
  };

  // Shows friendly messages under each field; returns true when the form is OK.
  SP.validate = (form) => {
    let firstBad = null;
    form.querySelectorAll('.sp-field').forEach((f) => { f.classList.remove('has-error'); const er = f.querySelector('.err'); if (er) er.textContent = ''; });
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      const wrap = el.closest('.sp-field'); if (!wrap || el.disabled) return;
      const sw = SP.isSw();
      const label = el.dataset.label || (sw ? 'sehemu hii' : 'this field');
      let msg = '';
      const val = el.value.trim();
      if (el.required && !val) msg = sw ? `Tafadhali ${el.tagName === 'SELECT' ? 'chagua' : 'jaza'} ${label.toLowerCase()}.` : (el.tagName === 'SELECT' ? `Please choose ${label.toLowerCase()}.` : `Please enter ${label.toLowerCase()}.`);
      else if (val && el.type === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(val)) msg = sw ? 'Tafadhali weka barua pepe sahihi, mfano name@example.com.' : 'Please enter a valid email address, like name@example.com.';
      else if (val && el.dataset.kind === 'phone' && !/^\+?[0-9][0-9 ()\-]{5,19}$/.test(val)) msg = sw ? 'Tafadhali weka namba sahihi ya simu, mfano +255 712 345 678.' : 'Please enter a valid phone number, like +255 712 345 678.';
      else if (val && el.type === 'number') {
        const n = Number(val);
        if (Number.isNaN(n) || (el.min !== '' && n < Number(el.min))) msg = sw ? `Tafadhali weka namba${el.min !== '' ? ` ya ${el.min} au zaidi` : ''}.` : `Please enter a number${el.min !== '' ? ` of ${el.min} or more` : ''}.`;
        else if (el.max !== '' && n > Number(el.max)) msg = sw ? `Namba haiwezi kuzidi ${el.max}.` : `The number cannot be more than ${el.max}.`;
      } else if (val && el.minLength > 0 && val.length < el.minLength) msg = sw ? `Tafadhali tumia angalau herufi ${el.minLength}.` : `Please use at least ${el.minLength} characters.`;
      if (msg) { wrap.classList.add('has-error'); const er = wrap.querySelector('.err'); if (er) er.textContent = msg; if (!firstBad) firstBad = el; }
    });
    if (firstBad) { firstBad.scrollIntoView({ block: 'center', behavior: 'smooth' }); firstBad.focus({ preventScroll: true }); }
    return !firstBad;
  };

  // Standard modal form: validation, spinner, server error display.
  SP.formModal = ({ title, body, submit = SP.t('Save', 'Hifadhi'), size = '', onSubmit, onOpen, danger = false }) => {
    const back = SP.modal(title, `<form class="sp-form" novalidate id="spForm"><div class="sp-form-error" role="alert"></div>${body}</form>`, {
      size, footer: `<button type="button" class="sp-btn ghost" data-close2>${SP.t('Cancel', 'Ghairi')}</button><button type="submit" form="spForm" class="sp-btn ${danger ? 'danger' : 'primary'}" data-submit>${esc(submit)}</button>`,
    });
    const form = back.querySelector('form');
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    form.querySelectorAll('input[type=tel]').forEach((i) => { i.dataset.kind = 'phone'; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = back.querySelector('[data-submit]'); const errBox = form.querySelector('.sp-form-error');
      errBox.classList.remove('show');
      if (!SP.validate(form)) return;
      const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="sp-spin"></span> ${SP.t('Please wait…', 'Tafadhali subiri…')}`;
      try { await onSubmit(SP.formData(form), form); }
      catch (err) { errBox.textContent = err.message; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'nearest' }); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    });
    if (onOpen) onOpen(form, back);
    return back;
  };

  // Resize a photo in the browser before uploading (saves data on phones).
  SP.resizeImage = (file, max = 640) => new Promise((resolve) => {
    if (!file || !/^image\/(png|jpe?g|webp)$/.test(file.type)) return resolve(file);
    const img = new Image(); const url = URL.createObjectURL(file);
    img.onload = () => {
      const r = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      c.toBlob((b) => { URL.revokeObjectURL(url); resolve(b ? new File([b], 'photo.jpg', { type: 'image/jpeg' }) : file); }, 'image/jpeg', 0.88);
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve(file); };
    img.src = url;
  });
  SP.photoField = (name = 'photo', current = '') => `<div class="sp-photo-drop"><div class="preview" id="spPhotoPreview">${current ? `<img src="${current}" alt="" onerror="this.remove()">` : '<i class="fa-solid fa-camera"></i>'}</div>
    <div><label class="sp-btn ghost sm" for="f_${name}"><i class="fa-solid fa-upload"></i> ${SP.t('Choose photo', 'Chagua picha')}</label><input type="file" id="f_${name}" name="${name}" accept="image/png,image/jpeg,image/webp" class="sp-sr">
    <div class="sp-small sp-muted" style="margin-top:.35rem">${SP.t('PNG, JPG or WEBP, up to 3 MB. Optional.', 'PNG, JPG au WEBP, hadi MB 3. Si lazima.')}</div></div></div>`;
  SP.wirePhotoField = (form, name = 'photo') => {
    const input = form.querySelector(`[name=${name}]`); if (!input) return;
    input.addEventListener('change', () => {
      const f = input.files[0]; const box = form.querySelector('#spPhotoPreview');
      if (f && box) { const fr = new FileReader(); fr.onload = () => { box.innerHTML = `<img src="${fr.result}" alt="">`; }; fr.readAsDataURL(f); }
    });
  };
  SP.uploadPhoto = async (path, form, name = 'photo') => {
    const input = form.querySelector(`[name=${name}]`);
    if (!input || !input.files[0]) return false;
    const fd = new FormData(); fd.append(name, await SP.resizeImage(input.files[0]));
    await SP.api.upload(path, fd); SP.state.photoV = Date.now(); return true;
  };

  // ------------------------------------------------------------ print / PDF / Excel
  SP.print = (html) => {
    let root = document.getElementById('spPrintRoot');
    if (!root) { root = document.createElement('div'); root.id = 'spPrintRoot'; document.body.appendChild(root); }
    root.innerHTML = html;
    const done = () => { root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 150);
  };
  SP.pdf = async (node, filename, { format = 'a4', orientation = 'portrait', margin = 8 } = {}) => {
    await SP.lib('pdf');
    const clone = node.cloneNode(true);
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;background:#fff'; holder.appendChild(clone); document.body.appendChild(holder);
    try {
      await window.html2pdf().set({ margin, filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format, orientation } }).from(clone).save();
    } finally { holder.remove(); }
  };
  SP.xlsx = async (columns, rows, filename, sheet = 'Report') => {
    await SP.lib('xlsx');
    const data = rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key] == null ? '' : r[c.key]])));
    const ws = window.XLSX.utils.json_to_sheet(data); const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 30)); window.XLSX.writeFile(wb, filename);
  };

  SP.err = (e) => SP.fail(e);
})(window);
