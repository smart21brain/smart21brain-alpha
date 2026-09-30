/* smart21brain Stationery OS — core client helpers: API, toast, modal. */
(function (global) {
  'use strict';

  const STN = global.STN || (global.STN = {});
  STN.state = { user: null, business: null, role: null, branchId: null, memberships: [] };

  function businessQuery() {
    return STN.state.business ? `business_id=${STN.state.business.id}` : '';
  }

  async function request(method, path, body, isForm) {
    const sep = path.includes('?') ? '&' : '?';
    const bq = businessQuery();
    const url = `/api/stationery${path}${bq ? sep + bq : ''}`;
    const opts = { method, credentials: 'include', headers: {} };
    if (body !== undefined) {
      if (isForm) {
        opts.body = body;
      } else {
        opts.headers['Content-Type'] = 'application/json';
        opts.body = JSON.stringify(body);
      }
    }
    const res = await fetch(url, opts);
    let data = null;
    try { data = await res.json(); } catch (e) { /* non-JSON (e.g. file) */ }
    if (!res.ok) {
      const message = (data && data.error) || `${(window.S21_t ? window.S21_t('stn_request_failed') : 'Request failed')} (${res.status})`;
      throw new Error(message);
    }
    return data;
  }

  STN.api = {
    get: (path) => request('GET', path),
    post: (path, body) => request('POST', path, body || {}),
    put: (path, body) => request('PUT', path, body || {}),
    del: (path) => request('DELETE', path),
    upload: (path, formData) => request('POST', path, formData, true),
  };

  // ---------------- Lazy script loading ----------------
  // Heavy tool libraries (PDF/photo export) are NOT loaded on every page
  // view — only the module that actually needs one pulls it in, on
  // first use, and only once.
  STN.loadScripts = function (urls) {
    return Promise.all(urls.map((src) => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) return resolve();
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error((window.S21_t ? window.S21_t('stn_failed_to_load') : 'Failed to load') + ' ' + src));
      document.body.appendChild(s);
    })));
  };

  // ---------------- Toast ----------------
  STN.toast = function (message, type) {
    let stack = document.getElementById('stnToastStack');
    if (!stack) {
      stack = document.createElement('div');
      stack.id = 'stnToastStack';
      stack.className = 'stn-toast-stack';
      document.body.appendChild(stack);
    }
    const el = document.createElement('div');
    el.className = `stn-toast ${type || ''}`;
    el.textContent = message;
    stack.appendChild(el);
    setTimeout(() => el.remove(), 4200);
  };

  // ---------------- Modal ----------------
  STN.openModal = function (innerHtml, opts) {
    STN.closeModal();
    const backdrop = document.createElement('div');
    backdrop.className = 'stn-modal-backdrop';
    backdrop.id = 'stnModalBackdrop';
    backdrop.innerHTML = `<div class="stn-modal ${opts && opts.wide ? 'wide' : ''}">${innerHtml}</div>`;
    backdrop.addEventListener('mousedown', (e) => { if (e.target === backdrop) STN.closeModal(); });
    document.body.appendChild(backdrop);
    return backdrop;
  };
  STN.closeModal = function () {
    const el = document.getElementById('stnModalBackdrop');
    if (el) el.remove();
  };

  // ---------------- Formatting ----------------
  STN.money = function (n) {
    const currency = (STN.state.business && STN.state.business.currency) || 'TZS';
    const v = Number(n) || 0;
    return `${v.toLocaleString(undefined, { maximumFractionDigits: 0 })} ${currency}`;
  };
  STN.dt = function (iso) {
    if (!iso) return '—';
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    return d.toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
  };
  STN.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  };
  STN.can = function (permission) {
    const map = {
      manage_staff: ['owner', 'manager'],
      manage_pricing: ['owner', 'manager'],
      manage_business: ['owner'],
      manage_finance: ['owner', 'manager', 'accountant'],
      manage_inventory: ['owner', 'manager', 'operator'],
      view_reports: ['owner', 'manager', 'accountant'],
      manage_orders: ['owner', 'manager', 'operator', 'designer'],
      manage_design: ['owner', 'manager', 'designer', 'operator'],
      manage_backup: ['owner'],
    };
    const allowed = map[permission];
    return !allowed || allowed.includes(STN.state.role);
  };
})(window);
