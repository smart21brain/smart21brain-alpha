/* Sales: list of receipts, sale detail/receipt, add payment, void, customer debts list. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  SP.modules.sales = async (el) => {
    const q0 = new URLSearchParams(location.hash.split('?')[1] || '');
    const st = { page: 1, limit: 20, q: '', status: '', payment_status: q0.get('payment_status') || '', from: '', to: '', owing: q0.get('owing') || '' };
    el.innerHTML = `${SP.pageHead(SP.t('Sales', 'Mauzo'), SP.t('Every receipt, credit sale and cancellation', 'Kila risiti, mauzo ya mkopo na ughairi'), SP.can('sales.create') ? `<a href="#pos" class="sp-btn primary"><i class="fa-solid fa-cash-register"></i> ${SP.t('New Sale', 'Mauzo Mapya')}</a>` : '')}
      <div class="sp-grid stats" id="saleSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card">
        <div class="sp-toolbar">
          <input class="sp-input grow" id="fQ" type="search" placeholder="${SP.t('Search receipt no. or customer…', 'Tafuta namba ya risiti au mteja…')}">
          <input class="sp-input" id="fFrom" type="date" aria-label="${SP.t('From date', 'Kuanzia tarehe')}"><input class="sp-input" id="fTo" type="date" aria-label="${SP.t('To date', 'Hadi tarehe')}">
          <select class="sp-select" id="fPay" aria-label="${SP.t('Payment status', 'Hali ya malipo')}"><option value="">${SP.t('Any payment', 'Malipo yoyote')}</option><option value="paid">${SP.t('Paid', 'Imelipwa')}</option><option value="partial">${SP.t('Partial', 'Sehemu')}</option><option value="unpaid">${SP.t('Unpaid', 'Haijalipwa')}</option></select>
          <select class="sp-select" id="fStatus" aria-label="${SP.t('Status', 'Hali')}"><option value="">${SP.t('Any status', 'Hali yoyote')}</option><option value="completed">${SP.t('Completed', 'Imekamilika')}</option><option value="void">${SP.t('Cancelled', 'Imeghairiwa')}</option></select>
          <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> ${SP.t('Clear', 'Futa')}</button>
        </div>
        <div id="saleList">${SP.skeleton(6)}</div>
      </div>`;
    if (st.payment_status) el.querySelector('#fPay').value = st.payment_status;

    const listEl = el.querySelector('#saleList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SP.api.get('/sales' + SP.qs(st));
        el.querySelector('#saleSummary').innerHTML = [
          SP.stat('fa-receipt', SP.num(d.summary.count), SP.t('Sales', 'Mauzo'), ''),
          SP.stat('fa-sack-dollar', SP.moneyHtml(d.summary.total), SP.t('Total', 'Jumla'), '', 'blue'),
          SP.stat('fa-money-bill-wave', SP.moneyHtml(d.summary.paid), SP.t('Received', 'Ililipwa'), '', 'green'),
          SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.summary.balance), SP.t('Owing', 'Deni'), '', d.summary.balance > 0 ? 'amber' : ''),
        ].join('');
        const cols = [
          { label: SP.t('Receipt', 'Risiti'), render: (s) => `<a href="#sale/${s.id}"><b>${esc(s.receipt_no)}</b></a>` },
          { label: SP.t('Customer', 'Mteja'), render: (s) => esc(s.customer_name || SP.t('Walk-in customer', 'Mteja wa Papo Hapo')) },
          { label: SP.t('Date', 'Tarehe'), render: (s) => SP.dateTime(s.created_at) },
          { label: SP.t('Items', 'Bidhaa'), cls: 'end', render: (s) => s.item_count },
          { label: SP.t('Total', 'Jumla'), cls: 'end', render: (s) => SP.money(s.total) },
          { label: SP.t('Balance', 'Deni'), cls: 'end', render: (s) => s.balance > 0.004 ? `<b style="color:var(--sp-danger)">${SP.money(s.balance)}</b>` : '—' },
          { label: SP.t('Status', 'Hali'), render: (s) => s.status === 'void' ? SP.chip('void') : SP.chip(s.payment_status) },
          { label: '', cls: 'end', render: (s) => `<a class="sp-btn ghost sm" href="#sale/${s.id}"><i class="fa-solid fa-eye"></i></a>` },
        ];
        listEl.innerHTML = SP.table(cols, d.sales, { empty: SP.empty('fa-receipt', SP.t('No sales found', 'Hakuna mauzo yaliyopatikana'), SP.t('Try different filters, or make your first sale.', 'Jaribu vichujio tofauti, au fanya mauzo yako ya kwanza.')) }) + SP.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SP.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key, ev = 'change') => el.querySelector(id).addEventListener(ev, (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fFrom', 'from'); bind('#fTo', 'to'); bind('#fPay', 'payment_status'); bind('#fStatus', 'status');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', status: '', payment_status: '', from: '', to: '', owing: '', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });
    SP.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); } });
    await load();
  };

  // =============================================================== detail
  SP.modules.sale = async (el, parts) => {
    const d = await SP.api.get(`/sales/${parts[0]}`);
    render(el, d);
  };
  function render(el, d) {
    const { sale, items, payments, customer, shop } = d;
    const canPay = SP.can('payments.record') && sale.status === 'completed' && sale.balance > 0.004;
    const canVoid = SP.can('sales.void') && sale.status === 'completed';
    el.innerHTML = `${SP.pageHead(sale.receipt_no, SP.t(`${SP.dateTime(sale.created_at)} · Sold by ${esc(sale.sold_by_name || '—')}`, `${SP.dateTime(sale.created_at)} · Aliuza ${esc(sale.sold_by_name || '—')}`),
      `<button class="sp-btn ghost" data-act="print"><i class="fa-solid fa-print"></i> ${SP.t('Print', 'Chapisha')}</button>${canPay ? `<button class="sp-btn primary" data-act="pay"><i class="fa-solid fa-hand-holding-dollar"></i> ${SP.t('Add Payment', 'Ongeza Malipo')}</button>` : ''}${canVoid ? `<button class="sp-btn danger-ghost" data-act="void"><i class="fa-solid fa-ban"></i> ${SP.t('Cancel Sale', 'Ghairi Mauzo')}</button>` : ''}<a class="sp-btn ghost" href="#sales"><i class="fa-solid fa-arrow-left"></i> ${SP.t('Back', 'Rudi')}</a>`)}
      ${sale.status === 'void' ? `<div class="sp-alert bad"><i class="fa-solid fa-ban"></i><div><b>${SP.t('This sale was cancelled.', 'Mauzo haya yaliaghairiwa.')}</b> ${esc(sale.void_reason || '')} ${sale.voided_by_name ? SP.t(`— by ${esc(sale.voided_by_name)}`, `— na ${esc(sale.voided_by_name)}`) : ''}</div></div>` : ''}
      <div class="sp-grid split">
        <div class="sp-stack">
          <div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Items', 'Bidhaa')}</h3></div>${SP.table([
            { label: SP.t('Item', 'Bidhaa') }, { label: SP.t('Qty', 'Idadi'), cls: 'end' }, { label: SP.t('Unit price', 'Bei ya Kipande'), cls: 'end' }, { label: SP.t('Amount', 'Kiasi'), cls: 'end' },
          ].map((c, i) => ({ ...c, render: [(x) => esc(x.name) + SP.qr.serialsHtml(d, x.product_id), (x) => SP.num(x.qty) + ' ' + esc(x.unit || ''), (x) => SP.money(x.unit_price), (x) => SP.money(x.line_total)][i] })), items)}
            <div class="sp-cart-row total" style="border-top:1px solid var(--sp-border);padding-top:.6rem;margin-top:.4rem"><span>${SP.t('Subtotal', 'Jumla Ndogo')}</span><span>${SP.money(sale.subtotal)}</span></div>
            ${sale.discount ? `<div class="sp-cart-row"><span>${SP.t('Discount', 'Punguzo')}</span><span>-${SP.money(sale.discount)}</span></div>` : ''}
            ${sale.tax ? `<div class="sp-cart-row"><span>${SP.t('VAT', 'Kodi')}</span><span>${SP.money(sale.tax)}</span></div>` : ''}
            <div class="sp-cart-row total"><span>${SP.t('Total', 'Jumla')}</span><span>${SP.money(sale.total)}</span></div>
            <div class="sp-cart-row"><span>${SP.t('Paid', 'Ililipwa')}</span><span>${SP.money(sale.paid)}</span></div>
            ${sale.balance > 0.004 ? `<div class="sp-cart-row"><span>${SP.t('Balance', 'Deni')}</span><span style="color:var(--sp-danger);font-weight:800">${SP.money(sale.balance)}</span></div>` : ''}
          </div>
          <div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Payments', 'Malipo')}</h3></div><div class="sp-list">${payments.length ? payments.map((p) => `<div class="sp-spread"><div><b>${SP.money(p.amount)}</b><div class="sp-small sp-muted">${esc(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''} · ${esc(p.user_name || '')}</div></div><span class="sp-small sp-muted">${SP.dateTime(p.created_at)}</span></div>`).join('') : SP.empty('fa-money-bill', SP.t('No payments recorded', 'Hakuna malipo yaliyorekodiwa'), '')}</div></div>
        </div>
        <div class="sp-stack">
          <div class="sp-card"><h3 style="margin-bottom:.6rem">${SP.t('Customer', 'Mteja')}</h3>${customer ? `<a href="#customer/${customer.id}" class="sp-person" style="color:inherit"><span class="sp-avatar">${esc(SP.initials(customer.full_name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(customer.full_name)}</span><div class="sb">${esc(customer.customer_no)}${customer.phone ? ' · ' + esc(customer.phone) : ''}</div></span></a>` : `<p class="sp-muted" style="margin:0">${esc(sale.customer_name || SP.t('Walk-in customer', 'Mteja wa Papo Hapo'))}</p>`}</div>
          ${sale.note ? `<div class="sp-card"><h3 style="margin-bottom:.5rem">${SP.t('Note', 'Maelezo')}</h3><p style="margin:0">${esc(sale.note)}</p></div>` : ''}
          <div class="sp-doc-stage" style="--doc-color:${shop.primary_color}">${SP.receiptHtml(d)}</div>
        </div>
      </div>`;
    SP.delegate(el, {
      print: () => SP.print(`<div style="--doc-color:${shop.primary_color}">${SP.receiptHtml(d)}</div>`),
      pay: () => {
        SP.lookups().then((lk) => SP.formModal({
          title: SP.t('Add payment', 'Ongeza Malipo'), submit: SP.t('Record payment', 'Rekodi Malipo'),
          body: `<p class="sp-muted sp-small" style="margin-top:0">${SP.t('Balance owed', 'Deni Lililobaki')}: <b>${SP.money(sale.balance)}</b></p>${SP.f.input('amount', SP.t('Amount', 'Kiasi'), { type: 'number', required: true, value: sale.balance, attr: { min: 0.01, max: sale.balance, step: '0.01' } })}${SP.f.select('method', SP.t('Payment method', 'Njia ya malipo'), SP.opts.paymentMethods(lk), { required: true })}${SP.f.input('reference', SP.t('Reference (optional)', 'Kumbukumbu (si lazima)'), {})}`,
          onSubmit: async (data) => { await SP.api.post(`/sales/${sale.id}/payments`, data); SP.closeModal(); SP.toast(SP.t('Payment recorded.', 'Malipo yamerekodiwa.')); SP.go(`sale/${sale.id}`); },
        }));
      },
      void: () => {
        SP.formModal({ title: SP.t('Cancel this sale?', 'Ghairi mauzo haya?'), submit: SP.t('Cancel Sale', 'Ghairi Mauzo'), danger: true,
          body: `<div class="sp-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div>${SP.t("This will restore any stock taken and remove the amount from the customer's balance. This cannot be undone.", 'Hii itarudisha bidhaa yoyote iliyochukuliwa na kuondoa kiasi kutoka deni la mteja. Hili haliwezi kutenduliwa.')}</div></div>${SP.f.textarea('reason', SP.t('Reason', 'Sababu'), { required: true, rows: 2, placeholder: SP.t('e.g. Customer changed their mind', 'mfano: Mteja alibadilisha mawazo') })}`,
          onSubmit: async (data) => { await SP.api.post(`/sales/${sale.id}/void`, data); SP.closeModal(); SP.toast(SP.t('Sale cancelled.', 'Mauzo yameghairiwa.')); SP.go(`sale/${sale.id}`); },
        });
      },
    });
  }

  // =============================================================== debts
  SP.modules.debts = async (el) => {
    const st = { page: 1, limit: 20, sort: 'balance', owing: '1' };
    el.innerHTML = `${SP.pageHead(SP.t('Customer Debts', 'Madeni ya Wateja'), SP.t('Everyone who currently owes your shop money', 'Kila mtu anayedaiwa na duka lako sasa'))}
      <div class="sp-grid stats" id="debtSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card"><div class="sp-toolbar"><input class="sp-input grow" id="fQ" type="search" placeholder="${SP.t('Search customer…', 'Tafuta mteja…')}"></div><div id="debtList">${SP.skeleton(6)}</div></div>`;
    const listEl = el.querySelector('#debtList');
    async function load() {
      const d = await SP.api.get('/customers' + SP.qs(st));
      el.querySelector('#debtSummary').innerHTML = [
        SP.stat('fa-users', SP.num(d.summary.owing_count), SP.t('Customers Owing', 'Wateja Wanaodaiwa'), ''),
        SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.summary.owing_total), SP.t('Total Owed', 'Jumla Wanachodaiwa'), '', 'amber'),
      ].join('');
      listEl.innerHTML = SP.table([
        { label: SP.t('Customer', 'Mteja'), render: (c) => `<a href="#customer/${c.id}" class="sp-person" style="color:inherit"><span class="sp-avatar">${esc(SP.initials(c.full_name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(c.full_name)}</span><div class="sb">${esc(c.phone || '')}</div></span></a>` },
        { label: SP.t('Owes', 'Anadaiwa'), cls: 'end', render: (c) => `<b style="color:var(--sp-danger)">${SP.money(c.balance)}</b>` },
        { label: SP.t('Last purchase', 'Ununuzi wa Mwisho'), render: (c) => SP.date(c.last_purchase) },
        { label: '', cls: 'end', render: (c) => SP.can('payments.record') ? `<button class="sp-btn primary sm" data-act="pay" data-id="${c.id}" data-bal="${c.balance}" data-name="${esc(c.full_name)}">${SP.t('Receive Payment', 'Pokea Malipo')}</button>` : `<a class="sp-btn ghost sm" href="#customer/${c.id}">${SP.t('View', 'Ona')}</a>` },
      ], d.customers, { empty: SP.empty('fa-face-smile', SP.t('No one owes you anything', 'Hakuna anayekudaiwa chochote'), SP.t('All customer balances are settled.', 'Madeni yote ya wateja yamemalizika.')) }) + SP.pager(d.page, d.limit, d.total);
    }
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    SP.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); }, pay: (b) => SP.openReceivePayment({ id: b.dataset.id, full_name: b.dataset.name }, Number(b.dataset.bal), load) });
    await load();
  };
})();
