/* smart21brain Stationery OS — app shell: sidebar, routing, top bar. */
(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);

  const NAV = [
    { group: 'stn_nav_group_overview', items: [
      { route: 'dashboard', icon: 'fa-gauge-high', label: 'stn_nav_dashboard' },
    ]},
    { group: 'stn_nav_group_business', items: [
      { route: 'pos', icon: 'fa-cash-register', label: 'stn_nav_pos' },
      { route: 'orders', icon: 'fa-receipt', label: 'stn_nav_orders' },
      { route: 'customers', icon: 'fa-address-book', label: 'stn_nav_customers' },
      { route: 'inventory', icon: 'fa-boxes-stacked', label: 'stn_nav_inventory' },
      { route: 'finance', icon: 'fa-sack-dollar', label: 'stn_nav_finance' },
      { route: 'reports', icon: 'fa-chart-line', label: 'stn_nav_reports' },
    ]},
    { group: 'stn_nav_group_print_design', items: [
      { route: 'photostudio', icon: 'fa-camera-retro', label: 'stn_nav_photostudio' },
      { route: 'pdftools', icon: 'fa-file-pdf', label: 'stn_nav_pdftools' },
    ]},
    { group: 'stn_nav_group_services', items: [
      { route: 'onlineservices', icon: 'fa-passport', label: 'stn_nav_onlineservices' },
      { route: 'machines', icon: 'fa-print', label: 'stn_nav_machines' },
      { route: 'academy', icon: 'fa-graduation-cap', label: 'stn_nav_academy' },
      { route: 'chopaai', icon: 'fa-robot', label: 'stn_nav_chopaai' },
    ]},
    { group: 'stn_nav_group_admin', items: [
      { route: 'employees', icon: 'fa-users-gear', label: 'stn_nav_employees' },
      { route: 'settings', icon: 'fa-sliders', label: 'stn_nav_settings' },
      { route: 'security', icon: 'fa-shield-halved', label: 'stn_nav_security' },
    ]},
  ];

  function currentLang() { try { return localStorage.getItem('s21-lang') || 'en'; } catch (e) { return 'en'; } }

  function sidebarHtml() {
    const langLabel = currentLang() === 'en' ? 'Kiswahili' : 'English';
    const groups = NAV.map((g) => `
      <div class="stn-nav-group">
        <div class="stn-nav-label">${t(g.group)}</div>
        ${g.items.map((item) => `
          <div class="stn-nav-link" data-route="${item.route}">
            <i class="fa-solid ${item.icon}"></i> <span>${t(item.label)}</span>
            ${item.route === 'inventory' ? '<span class="badge-dot" id="stnLowStockBadge" style="display:none">0</span>' : ''}
          </div>`).join('')}
      </div>`).join('');

    return `
      <div class="stn-sidebar-brand">
        <div class="mark">S21</div>
        <div class="name">Stationery OS<small>smart21brain</small></div>
      </div>
      <div class="stn-nav">${groups}</div>
      <div class="stn-sidebar-foot">
        <div class="d-flex align-items-center flex-wrap gap-2 mb-2">
          <span class="stn-role-pill" id="stnRolePill">${t('stn_role_owner')}</span>
        </div>
        <select class="stn-select" id="stnBusinessSwitcher" style="font-size:.78rem"></select>
        <a href="stationery.html" class="stn-btn stn-btn-ghost stn-btn-sm w-100 mt-2"><i class="fa-solid fa-arrow-left"></i> <span class="stn-back-text">${t('stn_back_to_site')}</span></a>
      </div>`;
  }

  function topbarHtml() {
    const langLabel = currentLang() === 'en' ? 'Kiswahili' : 'English';
    return `
      <button class="stn-icon-btn stn-menu-toggle" id="stnMenuToggle"><i class="fa-solid fa-bars"></i></button>
      <div>
        <h1 id="stnPageTitle">${t('stn_nav_dashboard')}</h1>
        <div class="stn-sub" id="stnBusinessName">—</div>
      </div>
      <div class="ms-auto d-flex align-items-center gap-2">
        <button class="stn-btn stn-btn-ghost stn-btn-sm" id="stnLangToggle" title="${t('stn_switch_language')}"><i class="fa-solid fa-language"></i> <span id="stnLangToggleLabel">${langLabel}</span></button>
        <button class="stn-icon-btn" id="stnNotifBtn" title="${t('stn_notifications')}">
          <i class="fa-solid fa-bell"></i>
          <span class="badge-dot" id="stnNotifBadge" style="display:none;position:absolute;top:-4px;right:-4px"></span>
        </button>
        <button class="stn-icon-btn" id="stnChopaBtn" title="${t('stn_ask_ai')}"><i class="fa-solid fa-robot"></i></button>
      </div>`;
  }

  function buildShell() {
    document.body.classList.add('stn-app');
    document.body.classList.remove('stn-lock');
    document.body.innerHTML = `
      <div class="stn-shell">
        <div class="stn-sidebar-backdrop" id="stnSidebarBackdrop"></div>
        <aside class="stn-sidebar" id="stnSidebar">${sidebarHtml()}</aside>
        <div class="stn-main">
          <header class="stn-topbar">${topbarHtml()}</header>
          <main class="stn-content" id="stnContent">
            <div class="stn-loading"><div class="stn-spin"></div></div>
          </main>
        </div>
      </div>`;

    const sidebar = document.getElementById('stnSidebar');
    const backdrop = document.getElementById('stnSidebarBackdrop');
    const toggle = document.getElementById('stnMenuToggle');
    const mq = window.matchMedia('(max-width: 991px)');
    const DESK_KEY = 'stn-sidebar-collapsed';
    let deskCollapsed = false;
    try { deskCollapsed = localStorage.getItem(DESK_KEY) === '1'; } catch (e) { /* ignore */ }
    let mobileOpen = false;

    // Hamburger toggles between full sidebar and an icons-only rail.
    const applySidebar = () => {
      const mobile = mq.matches;
      const rail = mobile ? !mobileOpen : deskCollapsed;
      sidebar.classList.toggle('rail', rail);
      sidebar.classList.toggle('open', mobile && mobileOpen);
      backdrop.classList.toggle('show', mobile && mobileOpen);
      document.body.classList.toggle('stn-desk-collapsed', !mobile && deskCollapsed);
      document.body.classList.toggle('stn-lock', mobile && mobileOpen);
      toggle.setAttribute('aria-expanded', rail ? 'false' : 'true');
    };
    toggle.setAttribute('aria-label', 'Menu');
    toggle.addEventListener('click', () => {
      if (mq.matches) mobileOpen = !mobileOpen;
      else {
        deskCollapsed = !deskCollapsed;
        try { localStorage.setItem(DESK_KEY, deskCollapsed ? '1' : '0'); } catch (e) { /* ignore */ }
      }
      applySidebar();
    });
    backdrop.addEventListener('click', () => { mobileOpen = false; applySidebar(); });
    STN.closeDrawer = () => { mobileOpen = false; applySidebar(); };
    if (STN._sbListener) mq.removeEventListener('change', STN._sbListener);
    STN._sbListener = () => { mobileOpen = false; applySidebar(); };
    mq.addEventListener('change', STN._sbListener);
    // Tooltips so icon-only items are still identifiable.
    document.querySelectorAll('.stn-nav-link').forEach((el) => { el.title = (el.querySelector('span') || el).textContent.trim(); });
    applySidebar();
    document.querySelectorAll('.stn-nav-link').forEach((el) => {
      el.addEventListener('click', () => { location.hash = '#' + el.dataset.route; STN.closeDrawer(); });
    });
    document.getElementById('stnNotifBtn').addEventListener('click', showNotifications);
    document.getElementById('stnChopaBtn').addEventListener('click', () => { location.hash = '#chopaai'; });
    document.getElementById('stnBusinessSwitcher').addEventListener('change', async (e) => {
      const id = Number(e.target.value);
      const membership = STN.state.memberships.find((m) => m.id === id);
      if (!membership) return;
      STN.state.business = { ...STN.state.business, id: membership.id, name: membership.name };
      STN.state.role = membership.role;
      await loadContext(id);
      route();
    });
    document.getElementById('stnLangToggle')?.addEventListener('click', () => {
      const current = (function () { try { return localStorage.getItem('s21-lang') || 'en'; } catch (e) { return 'en'; } })();
      const next = current === 'en' ? 'sw' : 'en';
      try { localStorage.setItem('s21-lang', next); } catch (e) { /* ignore */ }
      if (window.S21_applyLang) window.S21_applyLang(next);
      const hash = location.hash;
      buildShell();
      if (STN.state && STN.state.business) document.getElementById('stnBusinessName').textContent = STN.state.business.name;
      if (STN.state && STN.state.role) document.getElementById('stnRolePill').innerHTML = `<i class="fa-solid fa-user-shield"></i> ${t('stn_role_' + STN.state.role) || STN.state.role}`;
      applyRoleVisibility();
      refreshNotifBadge();
      refreshLowStockBadge();
      route();
    });
  }

  function routeTitleKey(hash) {
    if (hash === 'pos') return 'stn_title_pos';
    if (hash === 'onlineservices') return 'stn_title_onlineservices';
    const map = {
      dashboard: 'stn_nav_dashboard', orders: 'stn_nav_orders', customers: 'stn_nav_customers',
      inventory: 'stn_nav_inventory', finance: 'stn_nav_finance', reports: 'stn_nav_reports',
      photostudio: 'stn_nav_photostudio', pdftools: 'stn_nav_pdftools', machines: 'stn_nav_machines',
      academy: 'stn_nav_academy', chopaai: 'stn_nav_chopaai', employees: 'stn_nav_employees',
      settings: 'stn_nav_settings', security: 'stn_nav_security',
    };
    return map[hash];
  }

  async function route() {
    const hash = (location.hash || '#dashboard').replace('#', '');
    document.querySelectorAll('.stn-nav-link').forEach((el) => el.classList.toggle('active', el.dataset.route === hash));
    const titleKey = routeTitleKey(hash);
    document.getElementById('stnPageTitle').textContent = titleKey ? t(titleKey) : 'Stationery OS';

    const content = document.getElementById('stnContent');
    content.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';

    const renderer = window.STN_MODULES && window.STN_MODULES[hash];
    if (!renderer) { content.innerHTML = `<div class="stn-empty"><i class="fa-solid fa-triangle-exclamation"></i>${t('stn_module_not_found')}</div>`; return; }
    try {
      await renderer(content);
    } catch (err) {
      content.innerHTML = `<div class="stn-card"><p class="text-red mb-0"><i class="fa-solid fa-circle-exclamation me-2"></i>${STN.esc(err.message)}</p></div>`;
    }
  }

  async function loadContext(businessId) {
    const ctx = await STN.api.get(businessId ? `/context?business_id=${businessId}` : '/context');
    STN.state.user = ctx.user;
    STN.state.business = ctx.business;
    STN.state.role = ctx.role;
    STN.state.branchId = ctx.branch_id;
    STN.state.memberships = ctx.memberships;

    document.getElementById('stnBusinessName').textContent = ctx.business.name;
    document.getElementById('stnRolePill').innerHTML = `<i class="fa-solid fa-user-shield"></i> ${t('stn_role_' + ctx.role) || ctx.role}`;
    const switcher = document.getElementById('stnBusinessSwitcher');
    switcher.innerHTML = ctx.memberships.map((m) => `<option value="${m.id}" ${m.id === ctx.business.id ? 'selected' : ''}>${STN.esc(m.name)} (${t('stn_role_' + m.role) || m.role})</option>`).join('');

    applyRoleVisibility();
    refreshNotifBadge();
    refreshLowStockBadge();
  }

  function applyRoleVisibility() {
    const restricted = { employees: 'manage_staff', settings: 'manage_pricing', security: 'manage_backup' };
    document.querySelectorAll('.stn-nav-link').forEach((el) => {
      const perm = restricted[el.dataset.route];
      el.style.display = (!perm || STN.can(perm)) ? '' : 'none';
    });
  }

  async function refreshNotifBadge() {
    try {
      const { notifications } = await STN.api.get('/notifications?unread=1');
      const badge = document.getElementById('stnNotifBadge');
      if (notifications.length) { badge.style.display = 'flex'; badge.textContent = notifications.length; }
      else badge.style.display = 'none';
    } catch (e) { /* ignore */ }
  }

  async function refreshLowStockBadge() {
    try {
      const { items } = await STN.api.get('/inventory?low=1');
      const badge = document.getElementById('stnLowStockBadge');
      if (badge) {
        if (items.length) { badge.style.display = 'flex'; badge.textContent = items.length; }
        else badge.style.display = 'none';
      }
    } catch (e) { /* ignore */ }
  }
  STN.refreshLowStockBadge = refreshLowStockBadge;
  STN.refreshNotifBadge = refreshNotifBadge;

  async function showNotifications() {
    const { notifications } = await STN.api.get('/notifications');
    const rows = notifications.length ? notifications.map((n) => `
      <div class="stn-checklist-item ${n.is_read ? 'done' : ''}">
        <i class="fa-solid ${n.level === 'warning' ? 'fa-triangle-exclamation text-amber' : n.level === 'danger' ? 'fa-circle-exclamation text-red' : 'fa-circle-info text-cyan'}"></i>
        <div><div class="label">${STN.esc(n.title)}</div><div class="text-soft" style="font-size:.78rem">${STN.esc(n.message)}</div></div>
      </div>`).join('') : `<div class="stn-empty"><i class="fa-solid fa-bell-slash"></i>${t('stn_no_notifications_yet')}</div>`;

    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${t('stn_notifications')}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">${rows}</div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-outline stn-btn-sm" id="stnMarkAllRead">${t('stn_mark_all_read')}</button></div>
    `);
    document.getElementById('stnMarkAllRead')?.addEventListener('click', async () => {
      await STN.api.put('/notifications/read-all');
      refreshNotifBadge();
      STN.closeModal();
    });
  }

  async function init() {
    buildShell();
    try {
      await loadContext();
    } catch (err) {
      document.getElementById('stnContent').innerHTML = `<div class="stn-card"><p class="text-red mb-0">${STN.esc(err.message)}</p></div>`;
      return;
    }
    window.addEventListener('hashchange', route);
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && STN.closeDrawer) STN.closeDrawer(); });
    route();
  }

  document.addEventListener('DOMContentLoaded', init);
})();
