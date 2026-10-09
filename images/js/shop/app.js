/* Smart21Shop — app shell, navigation and router. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc; const sw = SP.isSw();

  // route segment -> { module, nav (sidebar item to highlight), title }
  const ROUTES = {
    dashboard: { mod: 'dashboard', nav: 'dashboard', title: SP.t('Dashboard', 'Dashibodi') },
    pos: { mod: 'pos', nav: 'pos', title: SP.t('New Sale', 'Mauzo Mapya') },
    sales: { mod: 'sales', nav: 'sales', title: SP.t('Sales', 'Mauzo') },
    sale: { mod: 'sale', nav: 'sales', title: SP.t('Sale', 'Mauzo') },
    debts: { mod: 'debts', nav: 'debts', title: SP.t('Customer Debts', 'Madeni ya Wateja') },
    customers: { mod: 'customers', nav: 'customers', title: SP.t('Customers', 'Wateja') },
    customer: { mod: 'customer', nav: 'customers', title: SP.t('Customer', 'Mteja') },
    scan: { mod: 'scan', nav: 'scan', title: SP.t('Scan QR', 'Changanua QR') },
    products: { mod: 'products', nav: 'products', title: SP.t('Products', 'Bidhaa') },
    product: { mod: 'product', nav: 'products', title: SP.t('Product', 'Bidhaa') },
    categories: { mod: 'categories', nav: 'products', title: SP.t('Categories', 'Jamii') },
    expenses: { mod: 'expenses', nav: 'expenses', title: SP.t('Expenses', 'Matumizi') },
    reports: { mod: 'reports', nav: 'reports', title: SP.t('Reports', 'Ripoti') },
    users: { mod: 'users', nav: 'users', title: SP.t('Staff', 'Wafanyakazi') },
    settings: { mod: 'settings', nav: 'settings', title: SP.t('Settings', 'Mipangilio') },
    audit: { mod: 'audit', nav: 'audit', title: SP.t('Activity Log', 'Kumbukumbu za Shughuli') },
  };

  function navItems() {
    const c = SP.can;
    return [
      { group: SP.t('Overview', 'Muhtasari'), items: [
        { r: 'dashboard', i: 'fa-gauge-high', l: SP.t('Dashboard', 'Dashibodi'), show: true },
        { r: 'pos', i: 'fa-cash-register', l: SP.t('New Sale', 'Mauzo Mapya'), show: c('sales.create') },
      ] },
      { group: SP.t('Sales', 'Mauzo'), items: [
        { r: 'sales', i: 'fa-receipt', l: SP.t('Sales', 'Mauzo'), show: c('sales.view') },
        { r: 'debts', i: 'fa-hand-holding-dollar', l: SP.t('Customer Debts', 'Madeni ya Wateja'), show: c('customers.view') },
      ] },
      { group: SP.t('Customers & Stock', 'Wateja na Bidhaa'), items: [
        { r: 'customers', i: 'fa-users', l: SP.t('Customers', 'Wateja'), show: c('customers.view') },
        { r: 'products', i: 'fa-boxes-stacked', l: SP.t('Products', 'Bidhaa'), show: c('products.view') },
        { r: 'scan', i: 'fa-qrcode', l: SP.t('Scan QR', 'Changanua QR'), show: c('products.view') || c('sales.create') },
      ] },
      { group: SP.t('Finance', 'Fedha'), items: [
        { r: 'expenses', i: 'fa-money-bill-wave', l: SP.t('Expenses', 'Matumizi'), show: c('expenses.manage') },
      ] },
      { group: SP.t('System', 'Mfumo'), items: [
        { r: 'reports', i: 'fa-chart-pie', l: SP.t('Reports', 'Ripoti'), show: c('reports.view') },
        { r: 'users', i: 'fa-user-gear', l: SP.t('Staff', 'Wafanyakazi'), show: c('users.manage') },
        { r: 'settings', i: 'fa-sliders', l: SP.t('Settings', 'Mipangilio'), show: c('settings.manage') },
        { r: 'audit', i: 'fa-shield-halved', l: SP.t('Activity Log', 'Kumbukumbu za Shughuli'), show: c('audit.view') },
      ] },
    ].map((g) => ({ ...g, items: g.items.filter((i) => i.show) })).filter((g) => g.items.length);
  }

  // Shows the language you'd switch TO, same convention as the rest of the site.
  const langToggleBtn = () => `<button class="sp-icon-btn" id="spLangToggle" aria-label="${SP.t('Switch language', 'Badilisha lugha')}" title="${SP.t('Switch language', 'Badilisha lugha')}" style="font-weight:800;font-size:.72rem">${sw ? 'EN' : 'SW'}</button>`;

  SP.setTitle = (title, sub) => {
    const t = document.getElementById('spTitle'); if (t) t.textContent = title;
    const s = document.getElementById('spSub'); if (s) s.textContent = sub || (SP.state.shop ? SP.state.shop.name : '');
    document.title = `${title} · ${SP.state.shop ? SP.state.shop.name : 'Smart21Shop'}`;
  };
  // Modules call SP.after(fn) to run code once their HTML is on the page (charts…).
  SP.after = (fn) => { if (SP._building) (SP._after = SP._after || []).push(fn); else setTimeout(fn, 0); };
  SP.go = (hash) => { if (location.hash === '#' + hash) route(); else location.hash = hash; };

  function shell() {
    const s = SP.state.shop;
    document.body.classList.add('sp-body');
    document.body.innerHTML = `
      <div class="sp-shell">
        <div class="sp-backdrop" id="spBackdrop"></div>
        <aside class="sp-sidebar" id="spSidebar" aria-label="Main navigation">
          <div class="sp-brand">${SP.shopLogo()}<div><div class="sp-brand-name">${esc(s.name)}</div><div class="sp-brand-sub">Smart21Shop</div></div></div>
          <nav class="sp-nav" id="spNav">${navItems().map((g) => `<div class="sp-nav-group">${g.group}</div>${g.items.map((i) => `<a href="#${i.r}" data-nav="${i.r}"><i class="fa-solid ${i.i}"></i><span>${i.l}</span>${i.badge ? '<span class="sp-badge-dot sp-hide" id="spNavBadge">0</span>' : ''}</a>`).join('')}`).join('')}</nav>
          <div class="sp-sidebar-foot">
            <div class="sp-me">${SP.avatar('x', 0, SP.state.user.name, false)}<div style="min-width:0"><div class="sp-me-name">${esc(SP.state.user.name)}</div><span class="sp-role-pill">${esc(SP.state.role)}</span></div></div>
            ${SP.state.memberships.length > 1 ? `<select class="sp-select" id="spSwitch" aria-label="${SP.t('Switch shop', 'Badilisha duka')}">${SP.state.memberships.map((m) => `<option value="${m.id}" ${m.id === s.id ? 'selected' : ''}>${esc(m.name)}</option>`).join('')}</select>` : ''}
            <button class="sp-btn ghost sm block" id="spLogout"><i class="fa-solid fa-right-from-bracket"></i> ${SP.t('Sign out', 'Toka')}</button>
          </div>
        </aside>
        <div class="sp-main">
          <header class="sp-topbar">
            <button class="sp-icon-btn sp-menu-btn" id="spMenu" aria-label="${SP.t('Open menu', 'Fungua menyu')}"><i class="fa-solid fa-bars"></i></button>
            <div><div class="sp-title" id="spTitle">${SP.t('Dashboard', 'Dashibodi')}</div><div class="sp-sub" id="spSub">${esc(s.name)}</div></div>
            <div class="sp-search"><i class="fa-solid fa-magnifying-glass"></i>
              <input type="search" id="spSearch" placeholder="${SP.t('Search customers, products, receipts…', 'Tafuta wateja, bidhaa, risiti…')}" autocomplete="off" aria-label="${SP.t('Global search', 'Tafuta kila kitu')}"><div class="sp-search-panel" id="spSearchPanel"></div></div>
            <div class="sp-top-actions" style="position:relative">
              ${langToggleBtn()}
              <button class="sp-icon-btn" id="spTheme" aria-label="${SP.t('Toggle dark mode', 'Badilisha mwonekano')}" title="${SP.t('Dark / light mode', 'Mwonekano mweusi / mweupe')}"><i class="fa-solid fa-moon"></i></button>
              <button class="sp-icon-btn" id="spBell" aria-label="${SP.t('Alerts', 'Arifa')}"><i class="fa-solid fa-bell"></i><span class="sp-badge-dot sp-hide" id="spBellBadge">0</span></button>
              <div class="sp-search-panel" id="spBellPanel" style="left:auto;right:0;width:min(380px,92vw);top:calc(100% + 8px)"></div>
            </div>
            ${SP.can('sales.create') ? `<a href="#pos" class="sp-btn primary" style="margin-left:.4rem"><i class="fa-solid fa-cash-register"></i> <span class="sp-hide-sm">${SP.t('New sale', 'Mauzo mapya')}</span></a>` : ''}
          </header>
          <main class="sp-content" id="spContent" tabindex="-1"></main>
        </div>
      </div>`;

    const side = document.getElementById('spSidebar'); const back = document.getElementById('spBackdrop');
    const toggle = (open) => { side.classList.toggle('open', open); back.classList.toggle('show', open); };
    document.getElementById('spMenu').addEventListener('click', () => toggle(!side.classList.contains('open')));
    back.addEventListener('click', () => toggle(false));
    document.getElementById('spNav').addEventListener('click', () => toggle(false));
    document.getElementById('spLogout').addEventListener('click', async () => { await SP.api.post('/logout').catch(() => {}); localStorage.removeItem('sp-shop-id'); location.href = 'shop-login.html'; });
    document.getElementById('spLangToggle').addEventListener('click', () => SP.toggleLang());
    const sw = document.getElementById('spSwitch');
    if (sw) sw.addEventListener('change', () => { localStorage.setItem('sp-shop-id', sw.value); location.hash = 'dashboard'; location.reload(); });
    document.getElementById('spTheme').addEventListener('click', () => {
      const dark = document.documentElement.dataset.theme !== 'dark';
      document.documentElement.dataset.theme = dark ? 'dark' : 'light'; localStorage.setItem('sp-theme', dark ? 'dark' : 'light');
      document.dispatchEvent(new Event('sp-theme'));
    });
    wireSearch(); wireBell();
  }

  // ---------------------------------------------------------- global search
  function wireSearch() {
    const input = document.getElementById('spSearch'); if (!input) return;
    const panel = document.getElementById('spSearchPanel');
    const GROUPS = { customers: SP.t('Customers', 'Wateja'), products: SP.t('Products', 'Bidhaa'), sales: SP.t('Sales', 'Mauzo') };
    const run = SP.debounce(async () => {
      const q = input.value.trim();
      if (q.length < 2) { panel.classList.remove('open'); return; }
      panel.innerHTML = `<div class="sp-search-group">${SP.t('Searching…', 'Inatafuta…')}</div>`; panel.classList.add('open');
      try {
        const { results } = await SP.api.get('/search' + SP.qs({ q }));
        const html = Object.entries(GROUPS).filter(([k]) => results[k] && results[k].length).map(([k, label]) =>
          `<div class="sp-search-group">${label}</div>${results[k].map((r) => `<a class="sp-search-item" href="#${r.route}" tabindex="0"><b>${esc(r.title)}</b><small>${esc(r.sub)}</small></a>`).join('')}`).join('');
        panel.innerHTML = html || `<div class="sp-search-group" style="text-transform:none;letter-spacing:0;font-size:.85rem">${SP.t(`No results for "${esc(q)}".`, `Hakuna matokeo ya "${esc(q)}".`)}</div>`;
      } catch (e) { panel.innerHTML = `<div class="sp-search-group">${esc(e.message)}</div>`; }
    }, 250);
    input.addEventListener('input', run);
    input.addEventListener('focus', () => { if (panel.innerHTML) panel.classList.add('open'); });
    document.addEventListener('click', (e) => { if (!e.target.closest('.sp-search')) panel.classList.remove('open'); });
    panel.addEventListener('click', (e) => { if (e.target.closest('.sp-search-item')) { panel.classList.remove('open'); input.value = ''; } });
    document.addEventListener('keydown', (e) => { if ((e.key === '/' && !/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName))) { e.preventDefault(); input.focus(); } });
  }

  // ---------------------------------------------------------- alerts bell
  async function refreshBadge() {
    try {
      const { count } = await SP.api.get('/alerts');
      SP.state.alertCount = count;
      [['spBellBadge'], ['spNavBadge']].forEach(([id]) => { const b = document.getElementById(id); if (b) { b.textContent = count > 99 ? '99+' : count; b.classList.toggle('sp-hide', !count); } });
    } catch (e) { /* silent */ }
  }
  SP.refreshBadge = refreshBadge;
  function wireBell() {
    const bell = document.getElementById('spBell'); const panel = document.getElementById('spBellPanel');
    bell.addEventListener('click', async (e) => {
      e.stopPropagation();
      if (panel.classList.contains('open')) { panel.classList.remove('open'); return; }
      panel.innerHTML = `<div class="sp-search-group">${SP.t('Loading…', 'Inapakia…')}</div>`; panel.classList.add('open');
      try {
        const { alerts } = await SP.api.get('/alerts');
        panel.innerHTML = `<div class="sp-search-group">${SP.t('Alerts', 'Arifa')}</div>${alerts.length ? alerts.map((a) => `<a class="sp-search-item" href="#${a.route}"><b><i class="fa-solid ${a.icon}" style="color:var(--sp-${a.tone === 'bad' ? 'danger' : a.tone === 'warn' ? 'warn' : 'info'})"></i> ${esc(a.title)}</b><small>${esc(a.message)}</small></a>`).join('') : `<div class="sp-search-item sp-muted">${SP.t('You are all caught up.', 'Umekamilisha kila kitu.')}</div>`}`;
      } catch (err) { panel.innerHTML = `<div class="sp-search-group">${esc(err.message)}</div>`; }
    });
    document.addEventListener('click', (e) => { if (!e.target.closest('#spBellPanel') && !e.target.closest('#spBell')) panel.classList.remove('open'); });
    panel.addEventListener('click', () => panel.classList.remove('open'));
  }

  // ---------------------------------------------------------- router
  async function route() {
    const parts = (location.hash || '#dashboard').replace(/^#\/?/, '').split('/').filter(Boolean);
    let seg = parts[0] || 'dashboard';
    let def = ROUTES[seg];
    if (!def) { seg = 'dashboard'; def = ROUTES[seg]; }
    document.querySelectorAll('#spNav a').forEach((a) => a.classList.toggle('active', a.dataset.nav === def.nav));
    SP.setTitle(def.title);
    const el = document.getElementById('spContent');
    const mod = SP.modules[def.mod];
    if (SP.destroyCharts) SP.destroyCharts();
    el.innerHTML = SP.skeletonPage();
    window.scrollTo({ top: 0 });
    if (!mod) { el.innerHTML = SP.errorBox(new Error(SP.t('This screen is not available.', 'Ukurasa huu haupatikani.'))); return; }
    const token = (route.token = (route.token || 0) + 1);
    try {
      const fresh = document.createElement('div');
      SP._after = []; SP._building = true;
      try { await mod(fresh, parts.slice(1), seg); } finally { SP._building = false; }
      if (token !== route.token) return; // user already navigated elsewhere
      el.replaceChildren(fresh);
      el.focus({ preventScroll: true });
      const jobs = SP._after; SP._after = [];
      jobs.forEach((fn) => { try { fn(); } catch (e) { console.error(e); } });
    } catch (err) {
      if (token === route.token) el.innerHTML = SP.errorBox(err);
    }
  }
  SP.route = route;

  // ---------------------------------------------------------- start
  function onboarding(ctx) {
    document.body.classList.add('sp-body');
    document.body.innerHTML = `<div class="sp-auth"><div class="sp-auth-art"><div class="sp-row" style="justify-content:space-between;align-items:center"><div class="sp-row"><span class="sp-logo"><i class="fa-solid fa-shop"></i></span><b style="font-family:var(--sp-font-display);font-size:1.2rem">Smart21Shop</b></div>${langToggleBtn()}</div>
      <div><h1>${SP.t('Welcome', 'Karibu')}, ${esc(ctx.user.name.split(' ')[0])} 👋</h1><p>${SP.t('Set up your shop in less than a minute. You will get a ready-made starter with categories and roles that you can change any time.', 'Sanidi duka lako kwa chini ya dakika moja. Utapata mwanzo tayari wenye jamii za bidhaa na majukumu unayoweza kubadilisha wakati wowote.')}</p></div><div></div></div>
      <div class="sp-auth-form"><div class="sp-auth-box"><div class="sp-card">
      <h3 style="margin-bottom:.3rem">${SP.t('Create your shop', 'Fungua duka lako')}</h3><p class="sp-muted" style="margin-top:0">${SP.t('This becomes the shop you manage. Staff you add will only see this shop.', 'Hili litakuwa duka utakalosimamia. Wafanyakazi utakaoongeza wataona duka hili tu.')}</p>
      <form class="sp-form" id="spSetup" novalidate><div class="sp-form-error" role="alert"></div>
      ${SP.f.input('shop_name', SP.t('Shop name', 'Jina la duka'), { required: true, placeholder: SP.t('e.g. Mama Neema Store', 'mfano: Duka la Mama Neema') })}
      ${SP.f.input('phone', SP.t('Shop phone (optional)', 'Simu ya duka (si lazima)'), { type: 'tel', placeholder: '+255 712 345 678' })}
      <button class="sp-btn primary block lg" type="submit">${SP.t('Create my shop', 'Fungua duka langu')}</button></form>
      <p class="sp-small" style="margin:.4rem 0 0"><a href="#" id="spOut">${SP.t('Sign out', 'Toka')}</a></p></div></div></div></div>`;
    document.querySelector('#spSetup [name=phone]').dataset.kind = 'phone';
    document.getElementById('spOut').addEventListener('click', async (e) => { e.preventDefault(); await SP.api.post('/logout').catch(() => {}); location.href = 'shop-login.html'; });
    const langBtn = document.getElementById('spLangToggle'); if (langBtn) langBtn.addEventListener('click', () => SP.toggleLang());
    const form = document.getElementById('spSetup');
    const createLabel = SP.t('Create my shop', 'Fungua duka langu');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SP.validate(form)) return;
      const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = `<span class="sp-spin"></span> ${SP.t('Setting up…', 'Inasanidi…')}`;
      try { const d = await SP.api.post('/shops', SP.formData(form)); localStorage.setItem('sp-shop-id', d.shop_id); location.reload(); }
      catch (err) { const b = form.querySelector('.sp-form-error'); b.textContent = err.message; b.classList.add('show'); btn.disabled = false; btn.textContent = createLabel; }
    });
  }

  async function start() {
    document.body.classList.add('sp-body');
    document.body.innerHTML = '<div style="min-height:100vh;display:grid;place-items:center"><span class="sp-spin" style="width:36px;height:36px"></span></div>';
    const saved = Number(localStorage.getItem('sp-shop-id') || 0);
    if (saved) SP.state.shop = { id: saved };
    let ctx;
    try { ctx = await SP.api.get('/context'); } catch (e) { document.body.innerHTML = `<div class="sp-verify-box sp-card">${SP.errorBox(e)}</div>`; return; }
    SP.state.shop = null;
    if (!ctx.shop) return onboarding(ctx);
    Object.assign(SP.state, { user: ctx.user, shop: ctx.shop, role: ctx.role, perms: ctx.permissions, settings: ctx.settings, memberships: ctx.memberships });
    localStorage.setItem('sp-shop-id', ctx.shop.id);
    SP.setBrand(ctx.shop.primary_color);
    shell();
    SP.lookups().catch(() => {});
    refreshBadge(); setInterval(refreshBadge, 90000);
    window.addEventListener('hashchange', route);
    route();
  }
  document.addEventListener('DOMContentLoaded', start);
})();
