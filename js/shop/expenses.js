/* Expenses — rent, transport, salaries… feeds the profit & loss report. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  SP.modules.expenses = async (el) => {
    const st = { page: 1, limit: 20, q: '', from: '', to: '', category: '' };
    const settings = SP.state.settings;
    el.innerHTML = `${SP.pageHead(SP.t('Expenses', 'Matumizi'), SP.t('Rent, transport, salaries and everything else it costs to run the shop', 'Kodi, usafiri, mishahara na gharama zingine za kuendesha duka'), SP.can('expenses.manage') ? `<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> ${SP.t('Add Expense', 'Ongeza Matumizi')}</button>` : '')}
      <div class="sp-grid stats" id="expSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card"><div class="sp-toolbar">
        <input class="sp-input grow" id="fQ" type="search" placeholder="${SP.t('Search description or category…', 'Tafuta maelezo au jamii…')}">
        <input class="sp-input" id="fFrom" type="date" aria-label="${SP.t('From', 'Kuanzia')}"><input class="sp-input" id="fTo" type="date" aria-label="${SP.t('To', 'Hadi')}">
        <select class="sp-select" id="fCat" aria-label="${SP.t('Category', 'Jamii')}"><option value="">${SP.t('All categories', 'Jamii zote')}</option>${(settings.expense_categories || []).map((c) => `<option>${esc(c)}</option>`).join('')}</select>
        <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> ${SP.t('Clear', 'Futa')}</button>
      </div><div id="expList">${SP.skeleton(6)}</div></div>`;

    const listEl = el.querySelector('#expList');
    async function load() {
      const d = await SP.api.get('/expenses' + SP.qs(st));
      el.querySelector('#expSummary').innerHTML = [
        SP.stat('fa-money-bill-wave', SP.moneyHtml(d.summary.total), SP.t('Total', 'Jumla'), SP.t(`${d.summary.count} expenses`, `Matumizi ${d.summary.count}`), 'amber'),
        ...(d.summary.by_category || []).slice(0, 3).map((c) => SP.stat('fa-tag', SP.moneyHtml(c.total), c.category)),
      ].join('');
      listEl.innerHTML = SP.table([
        { label: SP.t('Date', 'Tarehe'), render: (e) => SP.date(e.expense_date) }, { label: SP.t('Category', 'Jamii'), render: (e) => SP.chip('info', e.category) },
        { label: SP.t('Description', 'Maelezo'), render: (e) => esc(e.description || '—') }, { label: SP.t('Paid with', 'Ililipwa kwa'), render: (e) => esc(e.method || '—') },
        { label: SP.t('Amount', 'Kiasi'), cls: 'end', render: (e) => SP.money(e.amount) },
        { label: '', cls: 'end', render: (e) => SP.can('expenses.manage') ? `<button class="sp-icon-btn" style="width:30px;height:30px" data-act="del" data-id="${e.id}" title="${SP.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button>` : '' },
      ], d.expenses, { empty: SP.empty('fa-money-bill-wave', SP.t('No expenses recorded', 'Hakuna matumizi yaliyorekodiwa'), SP.t('Add rent, transport, salaries and other costs to see your real profit.', 'Ongeza kodi, usafiri, mishahara na gharama zingine kuona faida yako halisi.')) }) + SP.pager(d.page, d.limit, d.total);
    }
    const bind = (id, key) => el.querySelector(id).addEventListener('change', (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fFrom', 'from'); bind('#fTo', 'to'); bind('#fCat', 'category');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', from: '', to: '', category: '', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    SP.delegate(el, {
      new: () => SP.formModal({ title: SP.t('Add expense', 'Ongeza Matumizi'), submit: SP.t('Save expense', 'Hifadhi Matumizi'),
        body: `<div class="cols">${SP.f.select('category', SP.t('Category', 'Jamii'), (settings.expense_categories || []).map((c) => [c, c]), { required: true })}${SP.f.input('amount', SP.t('Amount', 'Kiasi'), { type: 'number', required: true, attr: { min: 0.01, step: '0.01' } })}</div>
          <div class="cols">${SP.f.input('expense_date', SP.t('Date', 'Tarehe'), { type: 'date', value: SP.today() })}${SP.f.select('method', SP.t('Paid with (optional)', 'Ililipwa kwa (si lazima)'), SP.opts.paymentMethods({ payment_methods: settings.payment_methods }), {})}</div>
          ${SP.f.textarea('description', SP.t('Description (optional)', 'Maelezo (si lazima)'), { rows: 2 })}`,
        onSubmit: async (data) => { await SP.api.post('/expenses', data); SP.closeModal(); SP.toast(SP.t('Expense recorded.', 'Matumizi yamerekodiwa.')); load(); } }),
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      del: async (b) => { const ok = await SP.confirm({ title: SP.t('Delete this expense?', 'Futa matumizi haya?') }); if (!ok) return; await SP.api.del(`/expenses/${b.dataset.id}`); SP.toast(SP.t('Expense deleted.', 'Matumizi yamefutwa.')); load(); },
    });
    await load();
  };
})();
