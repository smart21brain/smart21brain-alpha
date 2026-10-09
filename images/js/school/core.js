/* Smart21Brain School System — client core: API, UI kit, forms, print/PDF.
   Plain JavaScript, no build step — each module in js/school/ registers a
   screen in SC.modules and is easy for another school to modify. */
(function (global) {
  'use strict';
  const SC = global.SC || (global.SC = {});
  SC.state = { user: null, school: null, role: null, perms: [], settings: {}, lookups: null, photoV: Date.now() };
  SC.modules = {};

  // ------------------------------------------------------------ language (English / Kiswahili)
  const LANG_KEY = 's21-lang';
  SC.lang = () => { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } };
  SC.isSw = () => SC.lang() === 'sw';
  SC.setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } };
  SC.toggleLang = () => { SC.setLang(SC.isSw() ? 'en' : 'sw'); location.reload(); };
  SC.t = (en, sw) => (SC.isSw() ? sw : en);

  // ------------------------------------------------------------ helpers
  SC.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = SC.esc;
  SC.can = (perm) => SC.state.role === 'admin' || SC.state.perms.includes(perm);
  SC.canAny = (...perms) => perms.some((p) => SC.can(p));
  SC.isParent = () => SC.state.role === 'parent';
  SC.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  SC.today = () => new Date().toISOString().slice(0, 10);
  SC.money = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${(SC.state.school && SC.state.school.currency) || ''}`.trim();
  SC.moneyHtml = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <small>${esc((SC.state.school && SC.state.school.currency) || '')}</small>`;
  SC.schoolInitials = (s) => String((s && (s.short_name || s.name)) || 'S').slice(0, 2).toUpperCase();
  SC.num = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  SC.date = (d) => {
    if (!d) return '—';
    const dt = new Date(String(d).length <= 10 ? d + 'T00:00:00' : String(d).replace(' ', 'T') + 'Z');
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };
  SC.dateTime = (d) => {
    if (!d) return '—';
    const dt = new Date(String(d).replace(' ', 'T') + 'Z');
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  SC.cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, ' ') : '');
  SC.initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  SC.classLabel = (c) => (c ? `${c.name || c.class_name}${(c.stream || c.class_stream) ? ' ' + (c.stream || c.class_stream) : ''}` : '—');
  const STATUS_TEXT = { paid: 'Paid', partial: 'Partially Paid', pending: 'Pending', overdue: 'Overdue', active: 'Active', inactive: 'Inactive', graduated: 'Graduated', suspended: 'Suspended', transferred: 'Transferred', present: 'Present', absent: 'Absent', late: 'Late' };
  const STATUS_TEXT_SW = { paid: 'Imelipwa', partial: 'Imelipwa Sehemu', pending: 'Inasubiri', overdue: 'Imechelewa', active: 'Hai', inactive: 'Haifanyi kazi', graduated: 'Amehitimu', suspended: 'Amesimamishwa', transferred: 'Amehamishwa', present: 'Yupo', absent: 'Hayupo', late: 'Amechelewa' };
  SC.chip = (status, text) => `<span class="sc-chip ${esc(status)}">${esc(text || (SC.isSw() ? STATUS_TEXT_SW[status] : STATUS_TEXT[status]) || SC.cap(status))}</span>`;
  SC.photoUrl = (kind, id) => `/api/school/${kind}/${id}/photo?school_id=${SC.state.school ? SC.state.school.id : ''}&v=${SC.state.photoV}`;
  SC.logoUrl = (id) => `/api/school/public/logo/${id || (SC.state.school && SC.state.school.id)}?v=${SC.state.photoV}`;
  SC.avatar = (kind, id, name, has, size = '') =>
    `<span class="sc-avatar ${size}">${esc(SC.initials(name))}${has ? `<img src="${SC.photoUrl(kind, id)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  SC.schoolLogo = (cls = 'sc-logo') => {
    const s = SC.state.school || {};
    return `<span class="${cls}" style="position:relative">${esc((s.short_name || 'S').slice(0, 2))}${s.has_logo ? `<img src="${SC.logoUrl(s.id)}" alt="" style="position:absolute;inset:0" onerror="this.remove()">` : ''}</span>`;
  };
  SC.setBrand = (color) => { if (/^#[0-9a-f]{6}$/i.test(color || '')) document.documentElement.style.setProperty('--sc-primary', color); };

  // ------------------------------------------------------------ API
  async function request(method, path, body, isForm) {
    const opts = { method, credentials: 'include', headers: {} };
    if (SC.state.school) opts.headers['X-School-Id'] = String(SC.state.school.id);
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    let res;
    try { res = await fetch('/api/school' + path, opts); } catch (e) { throw new Error(SC.t('Cannot reach the server. Please check your internet connection and try again.', 'Haiwezekani kufikia seva. Tafadhali angalia mtandao wako na ujaribu tena.')); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401 && !/^\/(login|register-school|verify)/.test(path)) { if (!/school-login/.test(location.pathname)) location.href = 'school-login.html'; throw new Error(SC.t('Please sign in again.', 'Tafadhali ingia tena.')); }
    if (!res.ok) { const err = new Error((data && data.error) || SC.t(`Something went wrong (${res.status}).`, `Hitilafu imetokea (${res.status}).`)); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  SC.api = {
    get: (p) => request('GET', p), post: (p, b) => request('POST', p, b || {}), put: (p, b) => request('PUT', p, b || {}),
    del: (p) => request('DELETE', p), upload: (p, fd) => request('POST', p, fd, true),
  };
  SC.qs = (obj) => {
    const q = Object.entries(obj || {}).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return q ? '?' + q : '';
  };

  // Cached lookups (classes, subjects, teachers, years, terms…) — call SC.refreshLookups() after changing them.
  SC.lookups = async () => SC.state.lookups || SC.refreshLookups();
  SC.refreshLookups = async () => (SC.state.lookups = await SC.api.get('/lookups'));

  // ------------------------------------------------------------ lazy libraries
  const LIBS = {
    chart: 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.min.js',
    qr: 'https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js',
    pdf: 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js',
    xlsx: 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  };
  const loading = {};
  SC.lib = (name) => {
    const src = LIBS[name];
    if (loading[name]) return loading[name];
    loading[name] = new Promise((resolve, reject) => {
      const s = document.createElement('script'); s.src = src; s.onload = resolve;
      s.onerror = () => { delete loading[name]; reject(new Error(SC.t('Could not load a helper library. Check your internet connection.', 'Imeshindwa kupakia maktaba msaidizi. Angalia mtandao wako.'))); };
      document.head.appendChild(s);
    });
    return loading[name];
  };

  // ------------------------------------------------------------ toast
  SC.toast = (message, type = 'ok') => {
    let stack = document.getElementById('scToasts');
    if (!stack) { stack = document.createElement('div'); stack.id = 'scToasts'; stack.className = 'sc-toasts'; stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    const el = document.createElement('div');
    el.className = `sc-toast ${type === 'ok' ? '' : type}`;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 6500 : 4200);
  };
  SC.fail = (err) => SC.toast(err && err.message ? err.message : String(err), 'error');

  // ------------------------------------------------------------ modal / confirm
  SC.modal = (title, bodyHtml, { size = '', footer = '', onClose } = {}) => {
    SC.closeModal(true);
    const back = document.createElement('div');
    back.className = 'sc-modal-back'; back.id = 'scModal';
    back.innerHTML = `<div class="sc-modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="sc-modal-head"><h3>${esc(title)}</h3><button class="sc-icon-btn" data-close aria-label="${SC.t('Close', 'Funga')}"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="sc-modal-body">${bodyHtml}</div>${footer ? `<div class="sc-modal-foot">${footer}</div>` : ''}</div>`;
    back.__onClose = onClose;
    back.addEventListener('mousedown', (e) => { if (e.target === back) SC.closeModal(); });
    back.querySelector('[data-close]').addEventListener('click', () => SC.closeModal());
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    const first = back.querySelector('input:not([type=hidden]),select,textarea');
    if (first && !first.readOnly && window.innerWidth > 640) setTimeout(() => first.focus(), 60);
    return back;
  };
  SC.closeModal = (silent) => {
    const m = document.getElementById('scModal');
    if (m) { m.remove(); if (m.__onClose && !silent) m.__onClose(); }
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') SC.closeModal(); });

  SC.confirm = ({ title = SC.t('Are you sure?', 'Una uhakika?'), message = '', confirmText = SC.t('Yes, continue', 'Ndiyo, endelea'), danger = true, icon }) => new Promise((resolve) => {
    const back = SC.modal(title, `<div><div class="sc-confirm-ico ${danger ? '' : 'info'}"><i class="fa-solid ${icon || (danger ? 'fa-triangle-exclamation' : 'fa-circle-question')}"></i></div><p style="margin:0">${message}</p></div>`, {
      footer: `<button class="sc-btn ghost" data-no>${SC.t('Cancel', 'Ghairi')}</button><button class="sc-btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirmText)}</button>`, onClose: () => resolve(false),
    });
    back.querySelector('[data-no]').addEventListener('click', () => SC.closeModal());
    back.querySelector('[data-yes]').addEventListener('click', () => { back.__onClose = null; SC.closeModal(true); resolve(true); });
    back.querySelector('[data-yes]').focus();
  });

  // Small popup menu anchored to a button: items = [{ label, icon, danger, fn }]
  SC.popMenu = (anchor, items) => {
    document.querySelectorAll('.sc-pop').forEach((n) => n.remove());
    const m = document.createElement('div'); m.className = 'sc-pop'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}"><i class="fa-solid ${it.icon || 'fa-circle'}"></i>${esc(it.label)}</button>`).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(); const w = m.offsetWidth; const h = m.offsetHeight;
    m.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
    m.style.top = `${r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    const close = () => { m.remove(); document.removeEventListener('mousedown', away, true); window.removeEventListener('scroll', close, true); };
    const away = (e) => { if (!m.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('mousedown', away, true), 0); window.addEventListener('scroll', close, true);
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; close(); const it = items[Number(b.dataset.i)]; if (it && it.fn) Promise.resolve(it.fn()).catch(SC.fail); });
  };

  // ------------------------------------------------------------ small UI pieces
  SC.skeleton = (rows = 4) => `<div class="sc-card" aria-busy="true" aria-label="${SC.t('Loading', 'Inapakia')}">${Array.from({ length: rows }, (_, i) => `<div class="sc-skel line" style="width:${90 - i * 9}%"></div>`).join('')}</div>`;
  SC.skeletonPage = () => `<div class="sc-grid stats">${'<div class="sc-card"><div class="sc-skel box"></div></div>'.repeat(4)}</div><div class="sc-grid cols-2" style="margin-top:1.1rem">${'<div class="sc-card"><div class="sc-skel" style="height:220px"></div></div>'.repeat(2)}</div>`;
  SC.empty = (icon, title, text, action = '') => `<div class="sc-empty"><div class="ico"><i class="fa-solid ${icon}"></i></div><h4>${esc(title)}</h4><p>${esc(text)}</p>${action}</div>`;
  SC.errorBox = (err) => `<div class="sc-card">${SC.empty('fa-plug-circle-exclamation', SC.t('We could not load this page', 'Hatukuweza kupakia ukurasa huu'), err && err.message ? err.message : SC.t('Please try again.', 'Tafadhali jaribu tena.'), `<button class="sc-btn primary" onclick="location.reload()">${SC.t('Try again', 'Jaribu tena')}</button>`)}</div>`;
  SC.pageHead = (title, sub, actions = '') => `<div class="sc-page-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="sc-row">${actions}</div></div>`;
  SC.stat = (icon, value, label, sub = '', tone = '') => `<div class="sc-card sc-stat"><div class="ico ${tone}"><i class="fa-solid ${icon}"></i></div><div><div class="val">${value}</div><div class="lbl">${esc(label)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
  SC.progress = (pct, tone = '') => `<div class="sc-progress ${tone}"><span style="width:${Math.max(0, Math.min(100, pct || 0))}%"></span></div>`;
  SC.pct = (n) => (n == null ? '—' : `${n}%`);
  SC.pctTone = (n) => (n == null ? '' : n >= 85 ? '' : n >= 70 ? 'warn' : 'bad');

  SC.table = (cols, rows, { empty, cls = '' } = {}) => {
    if (!rows.length) return empty || '';
    return `<div class="sc-table-wrap"><table class="sc-table ${cls}"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${
      rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.cls || ''}">${c.render ? c.render(r) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  SC.pager = (page, limit, total) => {
    const sw = SC.isSw();
    if (total <= limit) return total ? `<div class="sc-pager"><span>${total} ${sw ? 'rekodi' : `record${total === 1 ? '' : 's'}`}</span></div>` : '';
    const pages = Math.ceil(total / limit);
    return `<div class="sc-pager"><span>${sw ? 'Inaonyesha' : 'Showing'} ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} ${sw ? 'kati ya' : 'of'} ${total}</span>
      <span class="sc-row"><button class="sc-btn ghost sm" data-act="page" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> ${sw ? 'Iliyotangulia' : 'Previous'}</button>
      <span>${sw ? 'Ukurasa' : 'Page'} ${page} ${sw ? 'kati ya' : 'of'} ${pages}</span>
      <button class="sc-btn ghost sm" data-act="page" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>${sw ? 'Inayofuata' : 'Next'} <i class="fa-solid fa-chevron-right"></i></button></span></div>`;
  };

  // Click delegation: <button data-act="name"> -> handlers.name(button, event)
  SC.delegate = (root, handlers) => {
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !root.contains(t)) return;
      const fn = handlers[t.dataset.act];
      if (!fn) return;
      e.preventDefault();
      try { await fn(t, e); } catch (err) { SC.fail(err); }
    });
  };

  // ------------------------------------------------------------ form fields
  const attrs = (o) => Object.entries(o || {}).map(([k, v]) => (v === true ? k : v === false || v == null ? '' : `${k}="${esc(v)}"`)).join(' ');
  SC.f = {
    input(name, label, o = {}) {
      const { type = 'text', value = '', required = false, placeholder = '', hint = '', attr = {}, cls = '' } = o;
      return `<div class="sc-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <input class="sc-input" id="f_${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required data-label="' + esc(label) + '"' : ''} ${attrs(attr)}>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    select(name, label, options, o = {}) {
      const { value = '', required = false, placeholder = SC.t('Select…', 'Chagua…'), hint = '', cls = '', attr = {}, noBlank = false } = o;
      const opts = options.map((x) => (Array.isArray(x) ? { v: x[0], l: x[1] } : x));
      return `<div class="sc-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <select class="sc-select" id="f_${name}" name="${name}" ${required ? 'required data-label="' + esc(label) + '"' : ''} ${attrs(attr)}>
        ${noBlank ? '' : `<option value="">${esc(placeholder)}</option>`}${opts.map((x) => `<option value="${esc(x.v)}" ${String(x.v) === String(value) ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</select>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    textarea(name, label, o = {}) {
      const { value = '', required = false, placeholder = '', hint = '', rows = 3, cls = '' } = o;
      return `<div class="sc-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <textarea class="sc-textarea" id="f_${name}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? 'required data-label="' + esc(label) + '"' : ''}>${esc(value)}</textarea>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    check: (name, label, checked = false, value = '1') => `<label class="sc-check"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}> ${label}</label>`,
    section: (icon, title) => `<div class="sc-section-title"><i class="fa-solid ${icon}"></i> ${esc(title)}</div>`,
  };
  SC.opts = {
    classes: (lk, onlyActive = true) => (lk.classes || []).filter((c) => !onlyActive || c.status === 'active').map((c) => ({ v: c.id, l: SC.classLabel(c) })),
    subjects: (lk) => (lk.subjects || []).filter((s) => s.status === 'active').map((s) => ({ v: s.id, l: s.name })),
    teachers: (lk) => (lk.teachers || []).map((t) => ({ v: t.id, l: t.full_name })),
    years: (lk) => (lk.years || []).map((y) => ({ v: y.id, l: y.name + (y.is_current ? SC.t(' (current)', ' (sasa)') : '') })),
    terms: (lk) => (lk.terms || []).map((t) => ({ v: t.id, l: t.name })),
    gender: [['male', SC.t('Male', 'Mwanaume')], ['female', SC.t('Female', 'Mwanamke')]],
    status: [['active', SC.t('Active', 'Hai')], ['inactive', SC.t('Inactive', 'Haifanyi kazi')], ['graduated', SC.t('Graduated', 'Amehitimu')], ['suspended', SC.t('Suspended', 'Amesimamishwa')], ['transferred', SC.t('Transferred', 'Amehamishwa')]],
  };

  SC.formData = (form) => {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (k.endsWith('[]')) { const key = k.slice(0, -2); (out[key] = out[key] || []).push(v); } else out[k] = v;
    });
    form.querySelectorAll('input[type=checkbox]').forEach((c) => { if (!c.name.endsWith('[]')) out[c.name] = c.checked; });
    return out;
  };

  // Shows friendly messages under each field; returns true when the form is OK.
  SC.validate = (form) => {
    let firstBad = null;
    form.querySelectorAll('.sc-field').forEach((f) => { f.classList.remove('has-error'); const er = f.querySelector('.err'); if (er) er.textContent = ''; });
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      const wrap = el.closest('.sc-field'); if (!wrap || el.disabled) return;
      const sw = SC.isSw();
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
  SC.formModal = ({ title, body, submit = SC.t('Save', 'Hifadhi'), size = '', onSubmit, onOpen, danger = false }) => {
    const back = SC.modal(title, `<form class="sc-form" novalidate id="scForm"><div class="sc-form-error" role="alert"></div>${body}</form>`, {
      size, footer: `<button type="button" class="sc-btn ghost" data-close2>${SC.t('Cancel', 'Ghairi')}</button><button type="submit" form="scForm" class="sc-btn ${danger ? 'danger' : 'primary'}" data-submit>${esc(submit)}</button>`,
    });
    const form = back.querySelector('form');
    back.querySelector('[data-close2]').addEventListener('click', () => SC.closeModal());
    form.querySelectorAll('input[type=tel]').forEach((i) => { i.dataset.kind = 'phone'; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = back.querySelector('[data-submit]'); const errBox = form.querySelector('.sc-form-error');
      errBox.classList.remove('show');
      if (!SC.validate(form)) return;
      const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="sc-spin"></span> ${SC.t('Please wait…', 'Tafadhali subiri…')}`;
      try { await onSubmit(SC.formData(form), form); }
      catch (err) { errBox.textContent = err.message; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'nearest' }); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    });
    if (onOpen) onOpen(form, back);
    return back;
  };

  // Resize a photo in the browser before uploading (saves data on phones).
  SC.resizeImage = (file, max = 640) => new Promise((resolve) => {
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
  SC.photoField = (name = 'photo', current = '') => `<div class="sc-photo-drop"><div class="preview" id="scPhotoPreview">${current ? `<img src="${current}" alt="" onerror="this.remove()">` : '<i class="fa-solid fa-camera"></i>'}</div>
    <div><label class="sc-btn ghost sm" for="f_${name}"><i class="fa-solid fa-upload"></i> ${SC.t('Choose photo', 'Chagua picha')}</label><input type="file" id="f_${name}" name="${name}" accept="image/png,image/jpeg,image/webp" class="sc-sr">
    <div class="sc-small sc-muted" style="margin-top:.35rem">${SC.t('PNG, JPG or WEBP, up to 3 MB. Optional.', 'PNG, JPG au WEBP, hadi MB 3. Si lazima.')}</div></div></div>`;
  SC.wirePhotoField = (form, name = 'photo') => {
    const input = form.querySelector(`[name=${name}]`); if (!input) return;
    input.addEventListener('change', () => {
      const f = input.files[0]; const box = form.querySelector('#scPhotoPreview');
      if (f && box) { const fr = new FileReader(); fr.onload = () => { box.innerHTML = `<img src="${fr.result}" alt="">`; }; fr.readAsDataURL(f); }
    });
  };
  SC.uploadPhoto = async (path, form, name = 'photo') => {
    const input = form.querySelector(`[name=${name}]`);
    if (!input || !input.files[0]) return false;
    const fd = new FormData(); fd.append(name, await SC.resizeImage(input.files[0]));
    await SC.api.upload(path, fd); SC.state.photoV = Date.now(); return true;
  };

  // ------------------------------------------------------------ print / PDF / Excel
  SC.print = (html) => {
    let root = document.getElementById('scPrintRoot');
    if (!root) { root = document.createElement('div'); root.id = 'scPrintRoot'; document.body.appendChild(root); }
    root.innerHTML = html;
    const done = () => { root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 150);
  };
  SC.pdf = async (node, filename, { format = 'a4', orientation = 'portrait', margin = 8 } = {}) => {
    await SC.lib('pdf');
    const clone = node.cloneNode(true);
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;background:#fff'; holder.appendChild(clone); document.body.appendChild(holder);
    try {
      await window.html2pdf().set({ margin, filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format, orientation } }).from(clone).save();
    } finally { holder.remove(); }
  };
  SC.xlsx = async (columns, rows, filename, sheet = 'Report') => {
    await SC.lib('xlsx');
    const data = rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key] == null ? '' : r[c.key]])));
    const ws = window.XLSX.utils.json_to_sheet(data); const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 30)); window.XLSX.writeFile(wb, filename);
  };
  SC.qrInto = async (el, text, size = 96) => { await SC.lib('qr'); el.innerHTML = ''; new window.QRCode(el, { text, width: size, height: size, correctLevel: window.QRCode.CorrectLevel.M }); };

  SC.err = (e) => SC.fail(e);
})(window);
