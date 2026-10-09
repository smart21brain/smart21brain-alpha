(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.finance = async function (root) {
    root.innerHTML = `
      <div class="stn-tabs">
        <div class="stn-tab active" data-tab="cashbook">${t('stn_fin_cashbook')}</div>
        <div class="stn-tab" data-tab="expenses">${t('stn_fin_expenses')}</div>
        <div class="stn-tab" data-tab="debts">${t('stn_fin_debts_credit')}</div>
      </div>
      <div id="stnFinancePane"></div>
    `;
    document.querySelectorAll('#stnContent .stn-tab').forEach((tab) => tab.addEventListener('click', () => {
      document.querySelectorAll('#stnContent .stn-tab').forEach((x) => x.classList.remove('active'));
      tab.classList.add('active');
      renderPane(tab.dataset.tab);
    }));
    renderPane('cashbook');
  };

  async function renderPane(tab) {
    const pane = document.getElementById('stnFinancePane');
    pane.innerHTML = '<div class="stn-loading"><div class="stn-spin"></div></div>';
    if (tab === 'cashbook') return renderCashbook(pane);
    if (tab === 'expenses') return renderExpenses(pane);
    if (tab === 'debts') return renderDebts(pane);
  }

  async function renderCashbook(pane) {
    const { entries, totalIn, totalOut, balance } = await STN.api.get('/finance/cashbook');
    pane.innerHTML = `
      <div class="stn-grid stn-grid-3 mb-3">
        <div class="stn-stat"><div class="label">${t('stn_fin_money_in')}</div><div class="value text-emerald">${STN.money(totalIn)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_fin_money_out')}</div><div class="value text-red">${STN.money(totalOut)}</div></div>
        <div class="stn-stat"><div class="label">${t('stn_pos_balance')}</div><div class="value text-cyan">${STN.money(balance)}</div></div>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>${t('stn_pos_date')}</th><th>${t('stn_fin_description')}</th><th class="text-end">${t('stn_th_amount')}</th></tr></thead>
        <tbody>${entries.length ? entries.map((e) => `
          <tr><td class="text-soft">${STN.dt(e.date)}</td><td>${STN.esc(e.label)}</td>
          <td class="text-end ${e.type === 'in' ? 'text-emerald' : 'text-red'}">${e.type === 'in' ? '+' : '-'}${STN.money(e.amount)}</td></tr>`).join('') : `<tr><td colspan="3" class="text-soft text-center py-3">${t('stn_fin_no_transactions_yet')}</td></tr>`}</tbody>
      </table></div></div>
    `;
  }

  async function renderExpenses(pane) {
    const { expenses } = await STN.api.get('/finance/expenses');
    pane.innerHTML = `
      <div class="d-flex justify-content-end mb-3">
        <button class="stn-btn stn-btn-primary stn-btn-sm" id="stnExpAdd" ${STN.can('manage_finance') ? '' : 'disabled'}><i class="fa-solid fa-plus"></i> ${t('stn_fin_add_expense')}</button>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>${t('stn_pos_date')}</th><th>${t('stn_th_category')}</th><th>${t('stn_fin_description')}</th><th class="text-end">${t('stn_th_amount')}</th><th></th></tr></thead>
        <tbody>${expenses.length ? expenses.map((e) => `
          <tr><td class="text-soft">${STN.dt(e.created_at)}</td><td><span class="stn-badge">${STN.esc(e.category)}</span></td><td>${STN.esc(e.description || '—')}</td>
          <td class="text-end text-red">${STN.money(e.amount)}</td>
          <td class="text-end"><button class="stn-btn stn-btn-ghost stn-btn-sm" data-del="${e.id}"><i class="fa-solid fa-trash"></i></button></td></tr>`).join('') : `<tr><td colspan="5" class="text-soft text-center py-3">${t('stn_fin_no_expenses_yet')}</td></tr>`}</tbody>
      </table></div></div>
    `;
    document.getElementById('stnExpAdd').addEventListener('click', () => {
      STN.openModal(`
        <div class="stn-modal-head"><h3 class="mb-0">${t('stn_fin_add_expense')}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="stn-modal-body">
          <div class="stn-field"><label class="stn-label">${t('stn_th_category')}</label><input class="stn-input" id="stnExpCat" value="General"></div>
          <div class="stn-field"><label class="stn-label">${t('stn_fin_description')}</label><input class="stn-input" id="stnExpDesc"></div>
          <div class="stn-field"><label class="stn-label">${t('stn_th_amount')}</label><input class="stn-input" type="number" id="stnExpAmt"></div>
        </div>
        <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnExpSave">${t('stn_save')}</button></div>
      `);
      document.getElementById('stnExpSave').addEventListener('click', async () => {
        const amount = Number(document.getElementById('stnExpAmt').value);
        if (!amount || amount <= 0) return STN.toast(t('stn_pos_enter_valid_amount'), 'error');
        try {
          await STN.api.post('/finance/expenses', { category: document.getElementById('stnExpCat').value, description: document.getElementById('stnExpDesc').value, amount });
          STN.toast(t('stn_fin_expense_added')); STN.closeModal(); renderPane('expenses');
        } catch (err) { STN.toast(err.message, 'error'); }
      });
    });
    pane.querySelectorAll('[data-del]').forEach((btn) => btn.addEventListener('click', async () => {
      if (!confirm(t('stn_fin_delete_expense_confirm'))) return;
      await STN.api.del(`/finance/expenses/${btn.dataset.del}`);
      renderPane('expenses');
    }));
  }

  async function renderDebts(pane) {
    const { debts, totalOwed } = await STN.api.get('/finance/debts');
    pane.innerHTML = `
      <div class="stn-stat mb-3" style="max-width:260px"><div class="label">${t('stn_fin_total_owed')}</div><div class="value text-amber">${STN.money(totalOwed)}</div></div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>${t('stn_th_order')}</th><th>${t('stn_th_customer')}</th><th>${t('stn_th_total')}</th><th>${t('stn_pos_paid')}</th><th class="text-end">${t('stn_pos_balance')}</th></tr></thead>
        <tbody>${debts.length ? debts.map((d) => `
          <tr><td>${STN.esc(d.order_no)}</td><td>${STN.esc(d.customer_name || t('stn_walk_in'))} ${d.customer_phone ? `<div class="text-soft" style="font-size:.74rem">${STN.esc(d.customer_phone)}</div>` : ''}</td>
          <td>${STN.money(d.total_amount)}</td><td>${STN.money(d.paid_amount)}</td>
          <td class="text-end text-amber">${STN.money(d.balance)}</td></tr>`).join('') : `<tr><td colspan="5" class="text-soft text-center py-3">${t('stn_fin_no_outstanding')}</td></tr>`}</tbody>
      </table></div></div>
    `;
  }
})();
