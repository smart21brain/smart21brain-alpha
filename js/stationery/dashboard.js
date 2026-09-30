(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  function sparkline(points) {
    const w = 100, h = 32;
    const max = Math.max(1, ...points.map((p) => p.total));
    const step = w / Math.max(1, points.length - 1);
    const path = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${(i * step).toFixed(1)},${(h - (p.total / max) * h).toFixed(1)}`).join(' ');
    return `<svg viewBox="0 0 ${w} ${h}" style="width:100%;height:56px" preserveAspectRatio="none">
      <path d="${path}" fill="none" stroke="url(#stnGrad)" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
      <defs><linearGradient id="stnGrad" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#10b981"/><stop offset="1" stop-color="#06b6d4"/></linearGradient></defs>
    </svg>`;
  }

  const STATUS_BADGE = {
    Received: 'info', Processing: 'warn', Ready: 'ok', Completed: 'ok', Cancelled: 'danger',
  };
  const STATUS_KEY = {
    Received: 'stn_status_received', Processing: 'stn_status_processing', Ready: 'stn_status_ready',
    Completed: 'stn_status_completed', Cancelled: 'stn_status_cancelled',
  };
  function statusLabel(s) { return STATUS_KEY[s] ? t(STATUS_KEY[s]) : s; }

  window.STN_MODULES.dashboard = async function (root) {
    const stats = await STN.api.get('/dashboard');
    STN.refreshLowStockBadge?.();

    root.innerHTML = `
      <div class="stn-grid stn-grid-4 mb-3">
        <div class="stn-stat"><div class="label">${t('stn_dash_sales_today')}</div><div class="value text-emerald">${STN.money(stats.sales_today)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_dash_orders_today')}</div><div class="value">${stats.orders_today}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_dash_profit_today')}</div><div class="value text-cyan">${STN.money(stats.profit_today)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_dash_low_stock')}</div><div class="value ${stats.low_stock_count ? 'text-amber' : ''}">${stats.low_stock_count}</div></div>
      </div>

      <div class="stn-grid" style="grid-template-columns: 2fr 1fr">
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_dash_sales_last_7_days')}</h3></div>
          ${sparkline(stats.sales_graph)}
          <div class="d-flex justify-content-between text-soft mt-2" style="font-size:.72rem">
            ${stats.sales_graph.map((p) => `<span>${p.day.slice(5)}</span>`).join('')}
          </div>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3><i class="fa-solid fa-robot text-cyan me-1"></i>${t('stn_dash_ai_insight')}</h3></div>
          <p class="text-soft mb-0" style="font-size:.88rem">${STN.esc(stats.ai_insight)}</p>
        </div>
      </div>

      <div class="stn-grid mt-3" style="grid-template-columns: 1.4fr 1fr">
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_dash_recent_orders')}</h3><a href="#orders" class="stn-btn stn-btn-ghost stn-btn-sm">${t('stn_view_all')}</a></div>
          <div class="stn-table-wrap">
            <table class="stn-table">
              <thead><tr><th>${t('stn_th_order')}</th><th>${t('stn_th_customer')}</th><th>${t('stn_th_status')}</th><th>${t('stn_th_total')}</th></tr></thead>
              <tbody>
                ${stats.recent_orders.length ? stats.recent_orders.map((o) => `
                  <tr>
                    <td>${STN.esc(o.order_no)}</td>
                    <td>${STN.esc(o.customer_name || t('stn_walk_in'))}</td>
                    <td><span class="stn-badge ${STATUS_BADGE[o.status] || ''}">${statusLabel(o.status)}</span></td>
                    <td>${STN.money(o.total_amount)}</td>
                  </tr>`).join('') : `<tr><td colspan="4" class="text-soft text-center py-3">${t('stn_dash_no_orders_yet')}</td></tr>`}
              </tbody>
            </table>
          </div>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_dash_low_stock')}</h3><a href="#inventory" class="stn-btn stn-btn-ghost stn-btn-sm">${t('stn_manage')}</a></div>
          ${stats.low_stock_items.length ? stats.low_stock_items.map((i) => `
            <div class="stn-checklist-item">
              <i class="fa-solid fa-triangle-exclamation text-amber"></i>
              <div><div class="label">${STN.esc(i.name)}</div><div class="text-soft" style="font-size:.78rem">${i.quantity} ${STN.esc(i.unit)} ${t('stn_left_reorder_at')} ${i.reorder_level})</div></div>
            </div>`).join('') : `<div class="stn-empty"><i class="fa-solid fa-boxes-stacked"></i>${t('stn_dash_stock_healthy')}</div>`}
        </div>
      </div>
    `;
  };
})();
