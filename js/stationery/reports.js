(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.reports = async function (root) {
    root.innerHTML = `
      <div class="stn-tabs">
        <div class="stn-tab active" data-range="daily">${t('stn_rep_daily')}</div>
        <div class="stn-tab" data-range="weekly">${t('stn_rep_weekly')}</div>
        <div class="stn-tab" data-range="monthly">${t('stn_rep_monthly')}</div>
      </div>
      <div id="stnReportPane"></div>
    `;
    document.querySelectorAll('#stnContent .stn-tab').forEach((tab) => tab.addEventListener('click', () => {
      document.querySelectorAll('#stnContent .stn-tab').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      load(tab.dataset.range);
    }));
    load('daily');
  };

  async function load(range) {
    const pane = document.getElementById('stnReportPane');
    pane.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';
    const r = await STN.api.get(`/reports?range=${range}`);
    pane.innerHTML = `
      <div class="stn-grid stn-grid-4 mb-3">
        <div class="stn-stat"><div class="label">${t('stn_rep_income')}</div><div class="value text-emerald">${STN.money(r.income)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_fin_expenses')}</div><div class="value text-red">${STN.money(r.expenses)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_rep_profit')}</div><div class="value text-cyan">${STN.money(r.profit)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_th_order')}</div><div class="value">${r.orders_count}</div></div>
      </div>
      <div class="stn-grid" style="grid-template-columns: 1.3fr 1fr">
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_rep_top_services')}</h3></div>
          <div class="stn-table-wrap"><table class="stn-table">
            <thead><tr><th>${t('stn_pos_services')}</th><th>${t('stn_rep_qty_sold')}</th><th class="text-end">${t('stn_rep_revenue')}</th></tr></thead>
            <tbody>${r.top_services.length ? r.top_services.map((s) => `<tr><td>${STN.esc(s.description)}</td><td>${s.total_qty}</td><td class="text-end">${STN.money(s.revenue)}</td></tr>`).join('') : `<tr><td colspan="3" class="text-soft text-center py-3">${t('stn_rep_no_sales_period')}</td></tr>`}</tbody>
          </table></div>
        </div>
        <div class="stn-card">
          <div class="stn-card-head"><h3>${t('stn_rep_by_payment_method')}</h3></div>
          ${r.by_method.length ? r.by_method.map((m) => `
            <div class="d-flex justify-content-between mb-2"><span class="text-soft text-capitalize">${STN.esc(m.method)}</span><strong>${STN.money(m.total)}</strong></div>`).join('') : `<div class="stn-empty"><i class="fa-solid fa-wallet"></i>${t('stn_rep_no_payments_yet')}</div>`}
          <div class="stn-card-head mt-3"><h3>${t('stn_rep_by_operator')}</h3></div>
          ${r.by_operator.length ? r.by_operator.map((o) => `
            <div class="d-flex justify-content-between mb-2"><span class="text-soft">${STN.esc(o.operator_name || t('stn_rep_unassigned'))}</span><span>${o.orders_handled} ${t('stn_rep_orders_lc')} · ${STN.money(o.revenue)}</span></div>`).join('') : ''}
        </div>
      </div>
    `;
  }
})();
