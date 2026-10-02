/* Smart21Institution — client core: API, UI kit, forms, print/PDF.
   Plain JavaScript, no build step — each module in js/institution/ registers a
   screen in IN.modules and is easy for another institution to modify. */
(function (global) {
  'use strict';
  const IN = global.IN || (global.IN = {});
  IN.state = { user: null, inst: null, role: null, perms: [], settings: {}, lookups: null, photoV: Date.now() };
  IN.modules = {};

  // ------------------------------------------------------------ language (English / Kiswahili)
  // Shares the same storage key as the rest of the Smart21Brain site, so a
  // language choice made anywhere (marketing pages or any app) applies here too.
  const LANG_KEY = 's21-lang';
  IN.lang = () => { try { return localStorage.getItem(LANG_KEY) || 'en'; } catch (e) { return 'en'; } };
  IN.isSw = () => IN.lang() === 'sw';
  IN.setLang = (l) => { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* ignore */ } };
  IN.toggleLang = () => { IN.setLang(IN.isSw() ? 'en' : 'sw'); location.reload(); };
  // Pick between an English and Swahili string for the current language.
  IN.t = (en, sw) => (IN.isSw() ? sw : en);

  // ------------------------------------------------------------ helpers
  IN.esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const esc = IN.esc;
  IN.can = (perm) => IN.state.role === 'super_admin' || IN.state.perms.includes(perm);
  IN.canAny = (...perms) => perms.some((p) => IN.can(p));
  IN.debounce = (fn, ms = 250) => { let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); }; };
  IN.today = () => new Date().toISOString().slice(0, 10);
  IN.money = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} ${(IN.state.inst && IN.state.inst.currency) || ''}`.trim();
  IN.moneyHtml = (n) => `${Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })} <small>${esc((IN.state.inst && IN.state.inst.currency) || '')}</small>`;
  IN.instInitials = (s) => String((s && (s.short_name || s.name)) || 'S').slice(0, 2).toUpperCase();
  IN.num = (n) => Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  IN.date = (d) => {
    if (!d) return '—';
    const dt = new Date(String(d).length <= 10 ? d + 'T00:00:00' : String(d).replace(' ', 'T') + 'Z');
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(undefined, { day: '2-digit', month: 'short', year: 'numeric' });
  };
  IN.dateTime = (d) => {
    if (!d) return '—';
    const dt = new Date(String(d).replace(' ', 'T') + 'Z');
    return Number.isNaN(dt.getTime()) ? d : dt.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  IN.cap = (s) => (s ? String(s).charAt(0).toUpperCase() + String(s).slice(1).replace(/_/g, ' ') : '');
  IN.initials = (name) => String(name || '?').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase();
  const STATUS_TEXT = { available: 'Available', borrowed: 'Borrowed', reserved: 'Reserved', lost: 'Lost', damaged: 'Damaged', archived: 'Archived', unavailable: 'No copies', active: 'Active', suspended: 'Suspended', graduated: 'Graduated', withdrawn: 'Withdrawn', on_leave: 'On leave', left: 'Left', returned: 'Returned', overdue: 'Overdue', due_today: 'Due today', unpaid: 'Unpaid', paid: 'Paid', waived: 'Waived', waiting: 'Waiting', ready: 'Ready to collect', fulfilled: 'Fulfilled', cancelled: 'Cancelled', expired: 'Expired', public: 'Public', members: 'Members', staff: 'Staff only', success: 'Success', failed: 'Failed', enrolled: 'Enrolled', dropped: 'Dropped', completed: 'Completed' };
  const STATUS_TEXT_SW = { available: 'Ipo', borrowed: 'Imekopwa', reserved: 'Imehifadhiwa', lost: 'Imepotea', damaged: 'Imeharibika', archived: 'Imehifadhiwa kumbukumbu', unavailable: 'Hakuna nakala', active: 'Hai', suspended: 'Amesimamishwa', graduated: 'Amehitimu', withdrawn: 'Ameacha', on_leave: 'Likizo', left: 'Ameondoka', returned: 'Imerudishwa', overdue: 'Imechelewa', due_today: 'Leo', unpaid: 'Haijalipwa', paid: 'Imelipwa', waived: 'Imesamehewa', waiting: 'Inasubiri', ready: 'Tayari kuchukuliwa', fulfilled: 'Imekamilika', cancelled: 'Imeghairiwa', expired: 'Imeisha muda', public: 'Umma', members: 'Wanachama', staff: 'Wafanyakazi tu', success: 'Imefanikiwa', failed: 'Imeshindwa', enrolled: 'Amesajiliwa', dropped: 'Ameacha', completed: 'Imekamilika' };
  IN.chip = (status, text) => `<span class="in-chip ${esc(status)}">${esc(text || (IN.isSw() ? STATUS_TEXT_SW[status] : STATUS_TEXT[status]) || IN.cap(status))}</span>`;
  IN.photoUrl = (kind, id) => `/api/institution/${kind === 'book' ? 'books' : kind + 's'}/${id}/${kind === 'book' ? 'cover' : 'photo'}?institution_id=${IN.state.inst ? IN.state.inst.id : ''}&v=${IN.state.photoV}`;
  IN.logoUrl = (id) => `/api/institution/public/logo/${id || (IN.state.inst && IN.state.inst.id)}?v=${IN.state.photoV}`;
  IN.avatar = (kind, id, name, has, size = '') =>
    `<span class="in-avatar ${size}">${esc(IN.initials(name))}${has ? `<img src="${IN.photoUrl(kind, id)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  IN.instLogo = (cls = 'in-logo') => {
    const s = IN.state.inst || {};
    return `<span class="${cls}" style="position:relative">${esc((s.short_name || 'S').slice(0, 2))}${s.has_logo ? `<img src="${IN.logoUrl(s.id)}" alt="" style="position:absolute;inset:0" onerror="this.remove()">` : ''}</span>`;
  };
  IN.setBrand = (color) => { if (/^#[0-9a-f]{6}$/i.test(color || '')) document.documentElement.style.setProperty('--in-primary', color); };

  IN.plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
  IN.bytes = (n) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : n >= 1024 ? `${Math.round(n / 1024)} KB` : `${n} B`);
  IN.icons = { pdf: 'fa-file-pdf', docx: 'fa-file-word', doc: 'fa-file-word', xlsx: 'fa-file-excel', xls: 'fa-file-excel', pptx: 'fa-file-powerpoint', ppt: 'fa-file-powerpoint', epub: 'fa-book-open', txt: 'fa-file-lines', png: 'fa-file-image', jpg: 'fa-file-image', jpeg: 'fa-file-image' };
  IN.fileIcon = (name) => IN.icons[String(name || '').split('.').pop().toLowerCase()] || 'fa-file';

  // ------------------------------------------------------------ API
  async function request(method, path, body, isForm) {
    const opts = { method, credentials: 'include', headers: {} };
    if (IN.state.inst) opts.headers['X-Institution-Id'] = String(IN.state.inst.id);
    if (body !== undefined) {
      if (isForm) opts.body = body;
      else { opts.headers['Content-Type'] = 'application/json'; opts.body = JSON.stringify(body); }
    }
    let res;
    try { res = await fetch('/api/institution' + path, opts); } catch (e) { throw new Error('Cannot reach the server. Please check your internet connection and try again.'); }
    let data = null;
    try { data = await res.json(); } catch (e) { /* not JSON */ }
    if (res.status === 401 && !/^\/(login|register)/.test(path)) { if (!/institution-(login|start)/.test(location.pathname)) location.href = 'institution-start.html?go=login'; throw new Error('Please sign in again.'); }
    if (!res.ok) { const err = new Error((data && data.error) || `Something went wrong (${res.status}).`); err.status = res.status; err.data = data; throw err; }
    return data;
  }
  IN.api = {
    get: (p) => request('GET', p), post: (p, b) => request('POST', p, b || {}), put: (p, b) => request('PUT', p, b || {}),
    del: (p) => request('DELETE', p), upload: (p, fd) => request('POST', p, fd, true),
  };
  IN.qs = (obj) => {
    const q = Object.entries(obj || {}).filter(([, v]) => v !== '' && v != null && v !== false).map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`).join('&');
    return q ? '?' + q : '';
  };

  // Cached lookups (categories, payment methods…) — call IN.refreshLookups() after changing them.
  IN.lookups = async () => IN.state.lookups || IN.refreshLookups();
  IN.refreshLookups = async () => (IN.state.lookups = await IN.api.get('/lookups'));

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
  IN.lib = (name) => {
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
  IN.toast = (message, type = 'ok') => {
    let stack = document.getElementById('inToasts');
    if (!stack) { stack = document.createElement('div'); stack.id = 'inToasts'; stack.className = 'in-toasts'; stack.setAttribute('role', 'status'); stack.setAttribute('aria-live', 'polite'); document.body.appendChild(stack); }
    const icon = type === 'error' ? 'fa-circle-exclamation' : type === 'warn' ? 'fa-triangle-exclamation' : 'fa-circle-check';
    const el = document.createElement('div');
    el.className = `in-toast ${type === 'ok' ? '' : type}`;
    el.innerHTML = `<i class="fa-solid ${icon}"></i><span>${esc(message)}</span>`;
    stack.appendChild(el);
    setTimeout(() => { el.style.transition = 'opacity .3s'; el.style.opacity = '0'; setTimeout(() => el.remove(), 300); }, type === 'error' ? 6500 : 4200);
  };
  IN.fail = (err) => IN.toast(err && err.message ? err.message : String(err), 'error');

  // ------------------------------------------------------------ modal / confirm
  IN.modal = (title, bodyHtml, { size = '', footer = '', onClose } = {}) => {
    IN.closeModal(true);
    const back = document.createElement('div');
    back.className = 'in-modal-back'; back.id = 'inModal';
    back.innerHTML = `<div class="in-modal ${size}" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <div class="in-modal-head"><h3>${esc(title)}</h3><button class="in-icon-btn" data-close aria-label="${IN.t('Close', 'Funga')}"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="in-modal-body">${bodyHtml}</div>${footer ? `<div class="in-modal-foot">${footer}</div>` : ''}</div>`;
    back.__onClose = onClose;
    back.addEventListener('mousedown', (e) => { if (e.target === back) IN.closeModal(); });
    back.querySelector('[data-close]').addEventListener('click', () => IN.closeModal());
    document.body.appendChild(back);
    document.body.style.overflow = 'hidden';
    const first = back.querySelector('input:not([type=hidden]),select,textarea');
    if (first && !first.readOnly && window.innerWidth > 640) setTimeout(() => first.focus(), 60);
    return back;
  };
  IN.closeModal = (silent) => {
    const m = document.getElementById('inModal');
    if (m) { m.remove(); if (m.__onClose && !silent) m.__onClose(); }
    document.body.style.overflow = '';
  };
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') IN.closeModal(); });

  IN.confirm = ({ title = IN.t('Are you sure?', 'Una uhakika?'), message = '', confirmText = IN.t('Yes, continue', 'Ndiyo, endelea'), danger = true, icon }) => new Promise((resolve) => {
    const back = IN.modal(title, `<div><div class="in-confirm-ico ${danger ? '' : 'info'}"><i class="fa-solid ${icon || (danger ? 'fa-triangle-exclamation' : 'fa-circle-question')}"></i></div><p style="margin:0">${message}</p></div>`, {
      footer: `<button class="in-btn ghost" data-no>${IN.t('Cancel', 'Ghairi')}</button><button class="in-btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(confirmText)}</button>`, onClose: () => resolve(false),
    });
    back.querySelector('[data-no]').addEventListener('click', () => IN.closeModal());
    back.querySelector('[data-yes]').addEventListener('click', () => { back.__onClose = null; IN.closeModal(true); resolve(true); });
    back.querySelector('[data-yes]').focus();
  });

  // Small popup menu anchored to a button: items = [{ label, icon, danger, fn }]
  IN.popMenu = (anchor, items) => {
    document.querySelectorAll('.in-pop').forEach((n) => n.remove());
    const m = document.createElement('div'); m.className = 'in-pop'; m.setAttribute('role', 'menu');
    m.innerHTML = items.map((it, i) => `<button type="button" role="menuitem" data-i="${i}" class="${it.danger ? 'danger' : ''}"><i class="fa-solid ${it.icon || 'fa-circle'}"></i>${esc(it.label)}</button>`).join('');
    document.body.appendChild(m);
    const r = anchor.getBoundingClientRect(); const w = m.offsetWidth; const h = m.offsetHeight;
    m.style.left = `${Math.max(8, Math.min(window.innerWidth - w - 8, r.right - w))}px`;
    m.style.top = `${r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6}px`;
    const close = () => { m.remove(); document.removeEventListener('mousedown', away, true); window.removeEventListener('scroll', close, true); };
    const away = (e) => { if (!m.contains(e.target)) close(); };
    setTimeout(() => document.addEventListener('mousedown', away, true), 0); window.addEventListener('scroll', close, true);
    m.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; close(); const it = items[Number(b.dataset.i)]; if (it && it.fn) Promise.resolve(it.fn()).catch(IN.fail); });
  };

  // ------------------------------------------------------------ small UI pieces
  IN.skeleton = (rows = 4) => `<div class="in-card" aria-busy="true" aria-label="${IN.t('Loading', 'Inapakia')}">${Array.from({ length: rows }, (_, i) => `<div class="in-skel line" style="width:${90 - i * 9}%"></div>`).join('')}</div>`;
  IN.skeletonPage = () => `<div class="in-grid stats">${'<div class="in-card"><div class="in-skel box"></div></div>'.repeat(4)}</div><div class="in-grid cols-2" style="margin-top:1.1rem">${'<div class="in-card"><div class="in-skel" style="height:220px"></div></div>'.repeat(2)}</div>`;
  IN.empty = (icon, title, text, action = '') => `<div class="in-empty"><div class="ico"><i class="fa-solid ${icon}"></i></div><h4>${esc(title)}</h4><p>${esc(text)}</p>${action}</div>`;
  IN.errorBox = (err) => `<div class="in-card">${IN.empty('fa-plug-circle-exclamation', IN.t('We could not load this page', 'Hatukuweza kupakia ukurasa huu'), err && err.message ? err.message : IN.t('Please try again.', 'Tafadhali jaribu tena.'), `<button class="in-btn primary" onclick="location.reload()">${IN.t('Try again', 'Jaribu tena')}</button>`)}</div>`;
  IN.pageHead = (title, sub, actions = '') => `<div class="in-page-head"><div><h2>${esc(title)}</h2>${sub ? `<p>${esc(sub)}</p>` : ''}</div><div class="in-row">${actions}</div></div>`;
  IN.stat = (icon, value, label, sub = '', tone = '') => `<div class="in-card in-stat"><div class="ico ${tone}"><i class="fa-solid ${icon}"></i></div><div><div class="val">${value}</div><div class="lbl">${esc(label)}</div>${sub ? `<div class="sub">${sub}</div>` : ''}</div></div>`;
  IN.progress = (pct, tone = '') => `<div class="in-progress ${tone}"><span style="width:${Math.max(0, Math.min(100, pct || 0))}%"></span></div>`;

  IN.table = (cols, rows, { empty, cls = '' } = {}) => {
    if (!rows.length) return empty || '';
    return `<div class="in-table-wrap"><table class="in-table in-stack-m ${cls}"><thead><tr>${cols.map((c) => `<th class="${c.cls || ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${
      rows.map((r) => `<tr>${cols.map((c) => `<td class="${c.cls || ''}" data-label="${esc(c.label)}">${c.render ? c.render(r) : esc(r[c.key] == null ? '' : r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  };
  IN.pager = (page, limit, total) => {
    const sw = IN.isSw();
    if (total <= limit) return total ? `<div class="in-pager"><span>${total} ${sw ? 'rekodi' : `record${total === 1 ? '' : 's'}`}</span></div>` : '';
    const pages = Math.ceil(total / limit);
    return `<div class="in-pager"><span>${sw ? 'Inaonyesha' : 'Showing'} ${(page - 1) * limit + 1}–${Math.min(page * limit, total)} ${sw ? 'kati ya' : 'of'} ${total}</span>
      <span class="in-row"><button class="in-btn ghost sm" data-act="page" data-p="${page - 1}" ${page <= 1 ? 'disabled' : ''}><i class="fa-solid fa-chevron-left"></i> ${sw ? 'Iliyotangulia' : 'Previous'}</button>
      <span>${sw ? 'Ukurasa' : 'Page'} ${page} ${sw ? 'kati ya' : 'of'} ${pages}</span>
      <button class="in-btn ghost sm" data-act="page" data-p="${page + 1}" ${page >= pages ? 'disabled' : ''}>${sw ? 'Inayofuata' : 'Next'} <i class="fa-solid fa-chevron-right"></i></button></span></div>`;
  };

  // Click delegation: <button data-act="name"> -> handlers.name(button, event)
  IN.delegate = (root, handlers) => {
    root.addEventListener('click', async (e) => {
      const t = e.target.closest('[data-act]');
      if (!t || !root.contains(t)) return;
      const fn = handlers[t.dataset.act];
      if (!fn) return;
      e.preventDefault();
      try { await fn(t, e); } catch (err) { IN.fail(err); }
    });
  };

  // ------------------------------------------------------------ form fields
  const attrs = (o) => Object.entries(o || {}).map(([k, v]) => (v === true ? k : v === false || v == null ? '' : `${k}="${esc(v)}"`)).join(' ');
  IN.f = {
    input(name, label, o = {}) {
      const { type = 'text', value = '', required = false, placeholder = '', hint = '', attr = {}, cls = '' } = o;
      return `<div class="in-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <input class="in-input" id="f_${name}" name="${name}" type="${type}" value="${esc(value)}" placeholder="${esc(placeholder)}" ${required ? 'required data-label="' + esc(label) + '"' : ''} ${attrs(attr)}>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    select(name, label, options, o = {}) {
      const { value = '', required = false, placeholder = IN.t('Select…', 'Chagua…'), hint = '', cls = '', attr = {}, noBlank = false } = o;
      const opts = options.map((x) => (Array.isArray(x) ? { v: x[0], l: x[1] } : x));
      return `<div class="in-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <select class="in-select" id="f_${name}" name="${name}" ${required ? 'required data-label="' + esc(label) + '"' : ''} ${attrs(attr)}>
        ${noBlank ? '' : `<option value="">${esc(placeholder)}</option>`}${opts.map((x) => `<option value="${esc(x.v)}" ${String(x.v) === String(value) ? 'selected' : ''}>${esc(x.l)}</option>`).join('')}</select>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    textarea(name, label, o = {}) {
      const { value = '', required = false, placeholder = '', hint = '', rows = 3, cls = '' } = o;
      return `<div class="in-field ${cls}" data-field="${name}"><label for="f_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label>
        <textarea class="in-textarea" id="f_${name}" name="${name}" rows="${rows}" placeholder="${esc(placeholder)}" ${required ? 'required data-label="' + esc(label) + '"' : ''}>${esc(value)}</textarea>
        ${hint ? `<span class="hint">${esc(hint)}</span>` : ''}<span class="err"></span></div>`;
    },
    check: (name, label, checked = false, value = '1') => `<label class="in-check"><input type="checkbox" name="${name}" value="${esc(value)}" ${checked ? 'checked' : ''}> ${label}</label>`,
    section: (icon, title) => `<div class="in-section-title"><i class="fa-solid ${icon}"></i> ${esc(title)}</div>`,
  };
  IN.opts = {
    gender: [['male', 'Male'], ['female', 'Female']],
    studentStatus: [['active', 'Active'], ['suspended', 'Suspended'], ['graduated', 'Graduated'], ['withdrawn', 'Withdrawn']],
    staffStatus: [['active', 'Active'], ['on_leave', 'On leave'], ['left', 'Left']],
    list: (rows, label = 'name') => (rows || []).map((r) => ({ v: r.id, l: r[label] })),
  };

  IN.formData = (form) => {
    const out = {};
    new FormData(form).forEach((v, k) => {
      if (k.endsWith('[]')) { const key = k.slice(0, -2); (out[key] = out[key] || []).push(v); } else out[k] = v;
    });
    form.querySelectorAll('input[type=checkbox]').forEach((c) => { if (!c.name.endsWith('[]')) out[c.name] = c.checked; });
    return out;
  };

  // Shows friendly messages under each field; returns true when the form is OK.
  IN.validate = (form) => {
    let firstBad = null;
    form.querySelectorAll('.in-field').forEach((f) => { f.classList.remove('has-error'); const er = f.querySelector('.err'); if (er) er.textContent = ''; });
    form.querySelectorAll('input, select, textarea').forEach((el) => {
      const wrap = el.closest('.in-field'); if (!wrap || el.disabled) return;
      const sw = IN.isSw();
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
  IN.formModal = ({ title, body, submit = IN.t('Save', 'Hifadhi'), size = '', onSubmit, onOpen, danger = false }) => {
    const back = IN.modal(title, `<form class="in-form" novalidate id="inForm"><div class="in-form-error" role="alert"></div>${body}</form>`, {
      size, footer: `<button type="button" class="in-btn ghost" data-close2>${IN.t('Cancel', 'Ghairi')}</button><button type="submit" form="inForm" class="in-btn ${danger ? 'danger' : 'primary'}" data-submit>${esc(submit)}</button>`,
    });
    const form = back.querySelector('form');
    back.querySelector('[data-close2]').addEventListener('click', () => IN.closeModal());
    form.querySelectorAll('input[type=tel]').forEach((i) => { i.dataset.kind = 'phone'; });
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = back.querySelector('[data-submit]'); const errBox = form.querySelector('.in-form-error');
      errBox.classList.remove('show');
      if (!IN.validate(form)) return;
      const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="in-spin"></span> ${IN.t('Please wait…', 'Tafadhali subiri…')}`;
      try { await onSubmit(IN.formData(form), form); }
      catch (err) { errBox.textContent = err.message; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'nearest' }); }
      finally { btn.disabled = false; btn.innerHTML = label; }
    });
    if (onOpen) onOpen(form, back);
    return back;
  };

  // Resize a photo in the browser before uploading (saves data on phones).
  IN.resizeImage = (file, max = 640) => new Promise((resolve) => {
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
  IN.photoField = (name = 'photo', current = '') => `<div class="in-photo-drop"><div class="preview" id="inPhotoPreview">${current ? `<img src="${current}" alt="" onerror="this.remove()">` : '<i class="fa-solid fa-camera"></i>'}</div>
    <div><label class="in-btn ghost sm" for="f_${name}"><i class="fa-solid fa-upload"></i> ${IN.t('Choose photo', 'Chagua picha')}</label><input type="file" id="f_${name}" name="${name}" accept="image/png,image/jpeg,image/webp" class="in-sr">
    <div class="in-small in-muted" style="margin-top:.35rem">${IN.t('PNG, JPG or WEBP, up to 3 MB. Optional.', 'PNG, JPG au WEBP, hadi MB 3. Si lazima.')}</div></div></div>`;
  IN.wirePhotoField = (form, name = 'photo') => {
    const input = form.querySelector(`[name=${name}]`); if (!input) return;
    input.addEventListener('change', () => {
      const f = input.files[0]; const box = form.querySelector('#inPhotoPreview');
      if (f && box) { const fr = new FileReader(); fr.onload = () => { box.innerHTML = `<img src="${fr.result}" alt="">`; }; fr.readAsDataURL(f); }
    });
  };
  IN.uploadPhoto = async (path, form, name = 'photo') => {
    const input = form.querySelector(`[name=${name}]`);
    if (!input || !input.files[0]) return false;
    const fd = new FormData(); fd.append(name, await IN.resizeImage(input.files[0]));
    await IN.api.upload(path, fd); IN.state.photoV = Date.now(); return true;
  };

  // ------------------------------------------------------------ print / PDF / Excel
  IN.print = (html) => {
    let root = document.getElementById('inPrintRoot');
    if (!root) { root = document.createElement('div'); root.id = 'inPrintRoot'; document.body.appendChild(root); }
    root.innerHTML = html;
    const done = () => { root.innerHTML = ''; window.removeEventListener('afterprint', done); };
    window.addEventListener('afterprint', done);
    setTimeout(() => window.print(), 150);
  };
  IN.pdf = async (node, filename, { format = 'a4', orientation = 'portrait', margin = 8 } = {}) => {
    await IN.lib('pdf');
    const clone = node.cloneNode(true);
    const holder = document.createElement('div'); holder.style.cssText = 'position:fixed;left:-99999px;top:0;background:#fff'; holder.appendChild(clone); document.body.appendChild(holder);
    try {
      await window.html2pdf().set({ margin, filename, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' }, jsPDF: { unit: 'mm', format, orientation } }).from(clone).save();
    } finally { holder.remove(); }
  };
  IN.xlsx = async (columns, rows, filename, sheet = 'Report') => {
    await IN.lib('xlsx');
    const data = rows.map((r) => Object.fromEntries(columns.map((c) => [c.label, r[c.key] == null ? '' : r[c.key]])));
    const ws = window.XLSX.utils.json_to_sheet(data); const wb = window.XLSX.utils.book_new();
    window.XLSX.utils.book_append_sheet(wb, ws, sheet.slice(0, 30)); window.XLSX.writeFile(wb, filename);
  };

  IN.err = (e) => IN.fail(e);
})(window);
