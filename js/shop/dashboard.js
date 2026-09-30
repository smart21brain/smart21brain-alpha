/* Dashboard — today's numbers, trends, alerts, top products/customers. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  const charts = [];
  SP.chart = async (canvas, config) => {
    await SP.lib('chart');
    const css = getComputedStyle(document.documentElement);
    const Chart = window.Chart;
    Chart.defaults.font.family = css.getPropertyValue('--sp-font').trim() || 'sans-serif';
    Chart.defaults.color = css.getPropertyValue('--sp-muted').trim() || '#666';
    Chart.defaults.borderColor = css.getPropertyValue('--sp-border').trim() || '#eee';
    const c = new Chart(canvas, config); charts.push(c); return c;
  };
  SP.destroyCharts = () => { while (charts.length) { try { charts.pop().destroy(); } catch (e) { /* gone */ } } };
  const palette = () => {
    const p = getComputedStyle(document.documentElement).getPropertyValue('--sp-primary').trim() || '#4F46E5';
    return { primary: p, blue: '#2F6FEB', amber: '#F59E0B', red: '#E5484D', pink: '#D6479F', teal: '#10805C', grey: '#9AA3AF' };
  };

  SP.modules.dashboard = async (el) => {
    const d = await SP.api.get('/dashboard');
    SP.destroyCharts();
    const sw = SP.isSw();
    const u = SP.state.user; const hour = new Date().getHours();
    const greet = sw ? (hour < 12 ? 'Habari za asubuhi' : hour < 17 ? 'Habari za mchana' : 'Habari za jioni')
                      : (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
    const stats = [];
    if (d.today_sales) {
      stats.push(SP.stat('fa-receipt', SP.num(d.today_sales.count), SP.t("Today's Sales", 'Mauzo ya Leo'), SP.moneyHtml(d.today_sales.total), 'blue'));
      stats.push(SP.stat('fa-sack-dollar', SP.moneyHtml(d.received_today), SP.t('Received Today', 'Zilizopokelewa Leo'), '', 'green'));
      if (d.today_sales.credit > 0) stats.push(SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.today_sales.credit), SP.t('Sold On Credit Today', 'Mauzo ya Mkopo Leo'), '', 'amber'));
      if (d.today_sales.profit !== undefined) stats.push(SP.stat('fa-chart-line', SP.moneyHtml(d.today_sales.profit), SP.t("Today's Profit", 'Faida ya Leo'), '', d.today_sales.profit < 0 ? 'red' : 'green'));
    }
    if (d.month_sales) stats.push(SP.stat('fa-calendar-days', SP.moneyHtml(d.month_sales.total), SP.t('Sales This Month', 'Mauzo ya Mwezi Huu'), `${SP.num(d.month_sales.count)} ${SP.t('receipts', 'risiti')}`, 'blue'));
    if (d.customers) stats.push(SP.stat('fa-users', SP.num(d.customers.total), SP.t('Customers', 'Wateja'), SP.t(`${d.customers.new_30d} new in 30 days`, `Wapya ${d.customers.new_30d} ndani ya siku 30`)));
    if (d.debts && d.debts.count) stats.push(SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.debts.total), SP.t('Owed By Customers', 'Wanachodaiwa Wateja'), sw ? `Wateja ${d.debts.count}` : `${d.debts.count} customer${d.debts.count === 1 ? '' : 's'}`, 'amber'));
    if (d.inventory) stats.push(SP.stat('fa-boxes-stacked', SP.num(d.inventory.total), SP.t('Active Products', 'Bidhaa Hai'), d.inventory.out || d.inventory.low ? (sw ? `${d.inventory.out} zimeisha · ${d.inventory.low} zinapungua` : `${d.inventory.out} out · ${d.inventory.low} low`) : SP.t('Stock levels healthy', 'Bidhaa zipo za kutosha'), d.inventory.out ? 'red' : d.inventory.low ? 'amber' : 'green'));
    if (d.month_net_profit !== undefined) stats.push(SP.stat('fa-scale-balanced', SP.moneyHtml(d.month_net_profit), SP.t('Net Profit This Month', 'Faida Halisi ya Mwezi Huu'), SP.t('After expenses', 'Baada ya matumizi'), d.month_net_profit < 0 ? 'red' : 'green'));

    el.innerHTML = `
      <div class="sp-hero sp-spread" style="margin-bottom:1.2rem"><div><h2>${greet}, ${esc(u.name.split(' ')[0])}!</h2><p>${esc(SP.state.shop.name)} · ${new Date().toLocaleDateString(sw ? 'sw' : undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>${SP.can('sales.create') ? `<a href="#pos" class="sp-btn" style="position:relative;z-index:1;background:#fff;color:var(--sp-primary)"><i class="fa-solid fa-cash-register"></i> ${SP.t('New sale', 'Mauzo mapya')}</a>` : ''}</div>
      ${stats.length ? `<div class="sp-grid stats" style="margin-bottom:1.2rem">${stats.join('')}</div>` : ''}
      ${alertsHtml(d)}
      <div class="sp-grid cols-2" style="margin-bottom:1.2rem">
        ${d.daily ? `<div class="sp-card" style="grid-column:1/-1"><div class="sp-card-head"><h3>${SP.t('Sales — last 14 days', 'Mauzo — siku 14 zilizopita')}</h3></div><div class="sp-chart-box"><canvas id="chDaily"></canvas></div></div>` : ''}
        ${d.by_method && d.by_method.length ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Payments by method', 'Malipo kwa aina')}</h3><span class="sp-muted sp-small">${SP.t('This month', 'Mwezi huu')}</span></div><div class="sp-chart-box"><canvas id="chMethod"></canvas></div></div>` : ''}
        ${d.top_products && d.top_products.length ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Top products (30 days)', 'Bidhaa Bora (siku 30)')}</h3></div><div class="sp-list">${d.top_products.map((p) => `<div class="sp-spread"><b>${esc(p.name)}</b><span class="sp-muted sp-small">${SP.t(`${SP.num(p.qty)} sold · ${SP.money(p.revenue)}`, `${SP.num(p.qty)} zimeuzwa · ${SP.money(p.revenue)}`)}</span></div>`).join('')}</div></div>` : ''}
      </div>
      <div class="sp-grid cols-2">
        ${d.recent_sales ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Recent sales', 'Mauzo ya Hivi Karibuni')}</h3><div class="sp-actions"><a href="#sales" class="sp-btn ghost sm">${SP.t('View all', 'Ona zote')}</a></div></div><div class="sp-list">${d.recent_sales.length ? d.recent_sales.map((s) => `<a href="#sale/${s.id}" class="sp-spread" style="color:inherit"><div><b>${esc(s.receipt_no)}</b><div class="sp-small sp-muted">${esc(s.customer_name || SP.t('Walk-in customer', 'Mteja wa Papo Hapo'))}</div></div><div style="text-align:right"><b>${SP.money(s.total)}</b><div>${SP.chip(s.status === 'void' ? 'void' : s.payment_status)}</div></div></a>`).join('') : SP.empty('fa-receipt', SP.t('No sales yet', 'Hakuna mauzo bado'), SP.t('Sales will appear here as you make them.', 'Mauzo yataonekana hapa unapoyafanya.'))}</div></div>` : ''}
        ${d.top_customers && d.top_customers.length ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Top customers (30 days)', 'Wateja Bora (siku 30)')}</h3></div><div class="sp-list">${d.top_customers.map((c) => `<a href="#customer/${c.id}" class="sp-spread" style="color:inherit"><b>${esc(c.full_name)}</b><span class="sp-muted sp-small">${SP.t(`${c.orders} orders · ${SP.money(c.spent)}`, `Oda ${c.orders} · ${SP.money(c.spent)}`)}</span></a>`).join('')}</div></div>` : ''}
        ${d.low_stock && d.low_stock.length ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Needs restocking', 'Zinahitaji Kuongezwa')}</h3><div class="sp-actions"><a href="#products?stock=low" class="sp-btn ghost sm">${SP.t('View all', 'Ona zote')}</a></div></div><div class="sp-list">${d.low_stock.map((p) => `<a href="#product/${p.id}" class="sp-spread" style="color:inherit"><b>${esc(p.name)}</b><span>${SP.chip(p.stock_qty <= 0 ? 'out' : 'low', SP.t(`${p.stock_qty} ${p.unit} left`, `${p.stock_qty} ${p.unit} zimebaki`))}</span></a>`).join('')}</div></div>` : ''}
        ${d.recent_activity ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Recent activity', 'Shughuli za Hivi Karibuni')}</h3>${SP.can('audit.view') ? `<div class="sp-actions"><a href="#audit" class="sp-btn ghost sm">${SP.t('View all', 'Ona zote')}</a></div>` : ''}</div><div class="sp-list">${d.recent_activity.length ? d.recent_activity.map((r) => `<div class="sp-spread"><div><b>${esc(r.user_name || SP.t('System', 'Mfumo'))}</b> <span class="sp-muted">${esc(actionText(r.action))}</span><div class="sp-small sp-muted">${esc((r.details || '').slice(0, 90))}</div></div><span class="sp-small sp-muted sp-nowrap">${SP.dateTime(r.created_at)}</span></div>`).join('') : SP.empty('fa-clock-rotate-left', SP.t('Nothing yet', 'Bado hakuna kitu'), SP.t('Activity will appear here.', 'Shughuli zitaonekana hapa.'))}</div></div>` : ''}
      </div>`;

    SP.after(() => drawCharts(el, d));
  };

  function actionText(a) {
    const sw = SP.isSw();
    const map = sw
      ? { 'user.login': 'aliingia', 'sale.create': 'alifanya mauzo', 'sale.void': 'aliaghairi mauzo', 'payment.create': 'alirekodi malipo', 'payment.customer': 'alipokea malipo ya mteja', 'customer.create': 'alihifadhi mteja', 'customer.update': 'alisasisha mteja', 'product.create': 'aliongeza bidhaa', 'product.update': 'alisasisha bidhaa', 'stock.adjust': 'alirekebisha bidhaa stoo', 'expense.create': 'alirekodi matumizi', 'shop.create': 'alifungua duka', 'demo.load': 'alipakia mfano wa data' }
      : { 'user.login': 'signed in', 'sale.create': 'made a sale', 'sale.void': 'cancelled a sale', 'payment.create': 'recorded a payment', 'payment.customer': 'received a customer payment', 'customer.create': 'saved a customer', 'customer.update': 'updated a customer', 'product.create': 'added a product', 'product.update': 'updated a product', 'stock.adjust': 'adjusted stock', 'expense.create': 'recorded an expense', 'shop.create': 'created the shop', 'demo.load': 'loaded sample data' };
    return map[a] || a.replace('.', ' → ');
  }

  function alertsHtml(d) {
    const sw = SP.isSw();
    const out = [];
    if (d.inventory && d.inventory.out) out.push(`<div class="sp-alert bad"><i class="fa-solid fa-box-open"></i><div class="sp-spread" style="flex:1"><div><b>${sw ? `Bidhaa ${d.inventory.out} zimeisha stoo` : `${d.inventory.out} product${d.inventory.out === 1 ? ' is' : 's are'} out of stock`}</b></div><a class="sp-btn danger-ghost sm" href="#products?stock=out">${SP.t('Restock', 'Ongeza Bidhaa')}</a></div></div>`);
    else if (d.inventory && d.inventory.low) out.push(`<div class="sp-alert"><i class="fa-solid fa-triangle-exclamation"></i><div class="sp-spread" style="flex:1"><div><b>${sw ? `Bidhaa ${d.inventory.low} zinapungua` : `${d.inventory.low} product${d.inventory.low === 1 ? ' is' : 's are'} running low`}</b></div><a class="sp-btn ghost sm" href="#products?stock=low">${SP.t('View', 'Ona')}</a></div></div>`);
    return out.length ? `<div class="sp-stack" style="margin-bottom:1.2rem">${out.join('')}</div>` : '';
  }

  async function drawCharts(el, d) {
    const c = palette();
    const q = (id) => el.querySelector('#' + id);
    try {
      if (d.daily && q('chDaily')) {
        SP.chart(q('chDaily'), { type: 'line', data: { labels: d.daily.map((r) => SP.date(r.date)), datasets: [{ label: 'Sales', data: d.daily.map((r) => r.total), borderColor: c.primary, backgroundColor: c.primary + '22', fill: true, tension: .35 }] },
          options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } } });
      }
      if (d.by_method && d.by_method.length && q('chMethod')) {
        const cols = [c.primary, c.blue, c.amber, c.teal, c.pink, c.grey];
        SP.chart(q('chMethod'), { type: 'doughnut', data: { labels: d.by_method.map((m) => m.method), datasets: [{ data: d.by_method.map((m) => m.total), backgroundColor: d.by_method.map((_, i) => cols[i % cols.length]), borderWidth: 0 }] },
          options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' } } } });
      }
    } catch (e) { /* Chart.js failed to load (offline) — the page still works without the charts */ }
  }
})();
