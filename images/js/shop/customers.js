/* Customers: search & control page, profile, save/edit form, notes, statement, debt payments. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  function customerForm(c = {}) {
    return `${SP.f.input('full_name', SP.t('Full name', 'Jina kamili'), { required: true, value: c.full_name, placeholder: SP.t('e.g. Amina Juma', 'mfano: Amina Juma') })}
      <div class="cols">${SP.f.input('phone', SP.t('Phone number', 'Namba ya simu'), { type: 'tel', value: c.phone, placeholder: '+255 712 345 678' })}${SP.f.input('alt_phone', SP.t('Second phone (optional)', 'Simu ya pili (si lazima)'), { type: 'tel', value: c.alt_phone })}</div>
      <div class="cols">${SP.f.input('email', SP.t('Email (optional)', 'Barua pepe (si lazima)'), { type: 'email', value: c.email })}${SP.f.input('city', SP.t('City / area', 'Mji / eneo'), { value: c.city })}</div>
      <div class="cols">${SP.f.select('customer_type', SP.t('Customer type', 'Aina ya mteja'), SP.opts.customerType, { value: c.customer_type || 'retail', noBlank: true })}${SP.f.select('gender', SP.t('Gender (optional)', 'Jinsia (si lazima)'), SP.opts.gender, { value: c.gender })}</div>
      <div class="cols">${SP.f.input('company', SP.t('Company (optional)', 'Kampuni (si lazima)'), { value: c.company })}${SP.f.input('credit_limit', SP.t('Credit limit', 'Kikomo cha mkopo'), { type: 'number', value: c.credit_limit || 0, hint: SP.t('0 = no limit on buying on credit', '0 = hakuna kikomo cha kununua kwa mkopo'), attr: { min: 0, step: '0.01' } })}</div>
      ${SP.f.textarea('address', SP.t('Address (optional)', 'Anwani (si lazima)'), { value: c.address, rows: 2 })}
      ${SP.f.textarea('notes', SP.t('Notes (optional)', 'Maelezo (si lazima)'), { value: c.notes, rows: 2, hint: SP.t('Visible to staff on the customer profile', 'Yanaonekana kwa wafanyakazi kwenye wasifu wa mteja') })}`;
  }

  function openCustomerForm(existing, onSaved) {
    SP.formModal({
      title: existing ? SP.t('Edit customer', 'Hariri Mteja') : SP.t('Save new customer', 'Hifadhi Mteja Mpya'), submit: existing ? SP.t('Save changes', 'Hifadhi Mabadiliko') : SP.t('Save customer', 'Hifadhi Mteja'), size: 'wide', body: customerForm(existing || {}),
      onSubmit: async (data) => {
        const r = existing ? await SP.api.put(`/customers/${existing.id}`, data) : await SP.api.post('/customers', data);
        SP.closeModal(); SP.toast(existing ? SP.t('Customer updated.', 'Mteja amesasishwa.') : SP.t('Customer saved.', 'Mteja amehifadhiwa.')); if (onSaved) onSaved(r);
      },
    });
  }
  SP.openCustomerForm = openCustomerForm;

  // =============================================================== list
  SP.modules.customers = async (el) => {
    const st = { page: 1, limit: 20, q: '', status: '', type: '', owing: '', sort: 'recent' };
    el.innerHTML = `${SP.pageHead(SP.t('Customers', 'Wateja'), SP.t('Search, save and manage every customer', 'Tafuta, hifadhi na simamia kila mteja'), SP.can('customers.create') ? `<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-user-plus"></i> ${SP.t('Save Customer', 'Hifadhi Mteja')}</button>` : '')}
      <div class="sp-grid stats" id="custSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card">
        <div class="sp-toolbar">
          <input class="sp-input grow" id="fQ" type="search" placeholder="${SP.t('Search by name, phone or customer number…', 'Tafuta kwa jina, simu au namba ya mteja…')}" aria-label="${SP.t('Search customers', 'Tafuta wateja')}">
          <select class="sp-select" id="fType" aria-label="${SP.t('Type', 'Aina')}"><option value="">${SP.t('Any type', 'Aina yoyote')}</option>${SP.opts.customerType.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sp-select" id="fStatus" aria-label="${SP.t('Status', 'Hali')}"><option value="">${SP.t('Any status', 'Hali yoyote')}</option>${SP.opts.status.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sp-select" id="fOwing" aria-label="${SP.t('Owing', 'Anayedaiwa')}"><option value="">${SP.t('All customers', 'Wateja wote')}</option><option value="1">${SP.t('Owing money', 'Anayedaiwa Pesa')}</option></select>
          <select class="sp-select" id="fSort" aria-label="${SP.t('Sort by', 'Panga kwa')}"><option value="recent">${SP.t('Most recent', 'Za hivi karibuni')}</option><option value="name">${SP.t('Name (A–Z)', 'Jina (A–Z)')}</option><option value="spent">${SP.t('Highest spender', 'Anayenunua Zaidi')}</option><option value="balance">${SP.t('Highest balance', 'Deni Kubwa Zaidi')}</option></select>
          <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> ${SP.t('Clear', 'Futa')}</button>
        </div>
        <div id="custList">${SP.skeleton(6)}</div>
      </div>`;

    const listEl = el.querySelector('#custList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SP.api.get('/customers' + SP.qs({ ...st }));
        el.querySelector('#custSummary').innerHTML = [
          SP.stat('fa-users', SP.num(d.summary.total), SP.t('Customers', 'Wateja'), SP.t(`${d.summary.new_30d} new in 30 days`, `Wapya ${d.summary.new_30d} ndani ya siku 30`)),
          SP.stat('fa-user-check', SP.num(d.summary.active), SP.t('Active', 'Hai'), '', 'green'),
          SP.stat('fa-hand-holding-dollar', SP.num(d.summary.owing_count), SP.t('Owe Money', 'Wanaodaiwa'), SP.moneyHtml(d.summary.owing_total), d.summary.owing_count ? 'amber' : ''),
        ].join('');
        const cols = [
          { label: SP.t('Customer', 'Mteja'), render: (c) => `<a href="#customer/${c.id}" class="sp-person"><span class="sp-avatar">${esc(SP.initials(c.full_name))}</span><span><span class="nm" style="color:var(--sp-text)">${esc(c.full_name)}</span><div class="sb">${esc(c.customer_no)}</div></span></a>` },
          { label: SP.t('Phone', 'Simu'), render: (c) => esc(c.phone || '—') },
          { label: SP.t('Type', 'Aina'), render: (c) => SP.chip(c.customer_type) },
          { label: SP.t('Orders', 'Oda'), cls: 'end', render: (c) => SP.num(c.orders) },
          { label: SP.t('Total spent', 'Jumla Alizotumia'), cls: 'end', render: (c) => SP.money(c.spent) },
          { label: SP.t('Owing', 'Anadaiwa'), cls: 'end', render: (c) => c.balance > 0.004 ? `<b style="color:var(--sp-danger)">${SP.money(c.balance)}</b>` : '<span class="sp-muted">—</span>' },
          { label: SP.t('Status', 'Hali'), render: (c) => SP.chip(c.status) },
          { label: SP.t('Actions', 'Vitendo'), cls: 'end', render: (c) => `<div class="sp-actions-cell"><a class="sp-btn ghost sm" href="#customer/${c.id}" title="${SP.t('View profile', 'Ona wasifu')}"><i class="fa-solid fa-eye"></i></a><button class="sp-btn ghost sm" data-act="menu" data-id="${c.id}" title="${SP.t('More', 'Zaidi')}"><i class="fa-solid fa-ellipsis"></i></button></div>` },
        ];
        const empty = st.q || st.status || st.type || st.owing
          ? SP.empty('fa-magnifying-glass', SP.t('No customers match your search', 'Hakuna mteja anayelingana na utafutaji wako'), SP.t('Try a different name or clear the filters.', 'Jaribu jina tofauti au futa vichujio.'))
          : SP.empty('fa-users', SP.t('No customers yet', 'Hakuna wateja bado'), SP.t('Save your first customer to get started.', 'Hifadhi mteja wako wa kwanza kuanza.'), SP.can('customers.create') ? `<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-user-plus"></i> ${SP.t('Save Customer', 'Hifadhi Mteja')}</button>` : '');
        listEl._rows = d.customers;
        listEl.innerHTML = SP.table(cols, d.customers, { empty }) + SP.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SP.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key, ev = 'change') => el.querySelector(id).addEventListener(ev, (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fType', 'type'); bind('#fStatus', 'status'); bind('#fOwing', 'owing'); bind('#fSort', 'sort');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', status: '', type: '', owing: '', sort: 'recent', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    const toggle = async (row) => {
      const active = row.status === 'active';
      const ok = await SP.confirm({ title: active ? SP.t('Deactivate this customer?', 'Zima mteja huyu?') : SP.t('Activate this customer?', 'Washa mteja huyu?'), message: active ? SP.t(`<b>${esc(row.full_name)}</b> will be marked Inactive. Their history is kept, and you can activate them again any time.`, `<b>${esc(row.full_name)}</b> atawekwa Hazifanyi kazi. Historia yake itabaki, na unaweza kumwasha tena wakati wowote.`) : SP.t(`<b>${esc(row.full_name)}</b> will be marked Active again.`, `<b>${esc(row.full_name)}</b> atawekwa Hai tena.`), confirmText: active ? SP.t('Yes, deactivate', 'Ndiyo, zima') : SP.t('Yes, activate', 'Ndiyo, washa'), danger: active });
      if (!ok) return;
      await SP.api.put(`/customers/${row.id}/status`, { status: active ? 'inactive' : 'active' });
      SP.toast(active ? SP.t('Customer deactivated.', 'Mteja amezimwa.') : SP.t('Customer activated.', 'Mteja amewashwa.')); load();
    };
    const remove = async (row) => {
      const ok = await SP.confirm({ title: SP.t('Delete this customer?', 'Futa mteja huyu?'), message: SP.t(`<b>${esc(row.full_name)}</b> will be permanently deleted. This cannot be undone.`, `<b>${esc(row.full_name)}</b> atafutwa kabisa. Hili haliwezi kutenduliwa.`) });
      if (!ok) return;
      try { await SP.api.del(`/customers/${row.id}`); SP.toast(SP.t('Customer deleted.', 'Mteja amefutwa.')); load(); } catch (e) { SP.fail(e); }
    };
    SP.delegate(el, {
      new: () => openCustomerForm(null, () => load()),
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      menu: (b) => {
        const row = listEl._rows.find((x) => String(x.id) === b.dataset.id); if (!row) return;
        SP.popMenu(b, [
          { label: SP.t('View profile', 'Ona wasifu'), icon: 'fa-eye', fn: () => SP.go(`customer/${row.id}`) },
          ...(SP.can('customers.edit') ? [{ label: SP.t('Edit', 'Hariri'), icon: 'fa-pen', fn: () => openCustomerForm(row, () => load()) }, { label: row.status === 'active' ? SP.t('Deactivate', 'Zima') : SP.t('Activate', 'Washa'), icon: row.status === 'active' ? 'fa-user-slash' : 'fa-user-check', fn: () => toggle(row) }] : []),
          ...(SP.can('customers.delete') ? [{ label: SP.t('Delete', 'Futa'), icon: 'fa-trash', danger: true, fn: () => remove(row) }] : []),
        ]);
      },
    });
    await load();
  };

  // =============================================================== profile
  SP.modules.customer = async (el, parts) => {
    const id = parts[0];
    const d = await SP.api.get(`/customers/${id}`);
    const c = d.customer;
    const canEdit = SP.can('customers.edit'); const seeNotes = SP.can('customers.notes'); const seePay = SP.can('payments.record');

    el.innerHTML = `${SP.pageHead(c.full_name, `${c.customer_no} · ${SP.cap(c.customer_type)}${c.city ? ' · ' + esc(c.city) : ''}`,
      `${canEdit ? `<button class="sp-btn ghost" data-act="edit"><i class="fa-solid fa-pen"></i> ${SP.t('Edit', 'Hariri')}</button>` : ''}${seePay && d.stats.balance > 0.004 ? `<button class="sp-btn primary" data-act="pay"><i class="fa-solid fa-hand-holding-dollar"></i> ${SP.t('Receive Payment', 'Pokea Malipo')}</button>` : ''}<a class="sp-btn ghost" href="#customers"><i class="fa-solid fa-arrow-left"></i> ${SP.t('Back', 'Rudi')}</a>`)}
      <div class="sp-grid stats" style="margin-bottom:1.1rem">
        ${SP.stat('fa-receipt', SP.num(d.stats.orders), SP.t('Orders', 'Oda'), d.stats.last_purchase ? SP.t(`Last: ${SP.date(d.stats.last_purchase)}`, `Mwisho: ${SP.date(d.stats.last_purchase)}`) : SP.t('No purchases yet', 'Hakuna manunuzi bado'))}
        ${SP.stat('fa-sack-dollar', SP.moneyHtml(d.stats.spent), SP.t('Total Spent', 'Jumla Aliyotumia'), d.stats.orders ? SP.t(`Avg. ${SP.money(d.stats.avg_order)}`, `Wastani ${SP.money(d.stats.avg_order)}`) : '', 'green')}
        ${SP.stat('fa-hand-holding-dollar', SP.moneyHtml(d.stats.balance), SP.t('Currently Owes', 'Anadaiwa Sasa'), c.credit_limit > 0 ? SP.t(`Limit ${SP.money(c.credit_limit)}`, `Kikomo ${SP.money(c.credit_limit)}`) : SP.t('No credit limit', 'Hakuna kikomo cha mkopo'), d.stats.balance > 0.004 ? 'amber' : '')}
        ${c.loyalty_points ? SP.stat('fa-star', SP.num(c.loyalty_points), SP.t('Loyalty Points', 'Pointi za Uaminifu'), '', 'blue') : SP.stat('fa-circle-check', SP.cap(c.status), SP.t('Status', 'Hali'), '', c.status === 'active' ? 'green' : '')}
      </div>
      <div class="sp-grid split">
        <div class="sp-stack">
          <div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Recent sales', 'Mauzo ya Hivi Karibuni')}</h3><div class="sp-actions"><a href="#customer/${c.id}/statement" class="sp-btn ghost sm">${SP.t('Full statement', 'Taarifa Kamili')}</a></div></div>
            <div id="custSales">${d.sales && d.sales.length ? SP.table([
              { label: SP.t('Receipt', 'Risiti'), render: (s) => `<a href="#sale/${s.id}">${esc(s.receipt_no)}</a>` }, { label: SP.t('Date', 'Tarehe'), render: (s) => SP.date(s.created_at) },
              { label: SP.t('Total', 'Jumla'), cls: 'end', render: (s) => SP.money(s.total) }, { label: SP.t('Balance', 'Deni'), cls: 'end', render: (s) => s.balance > 0.004 ? SP.money(s.balance) : '—' },
              { label: SP.t('Status', 'Hali'), render: (s) => SP.chip(s.status === 'void' ? 'void' : s.payment_status) },
            ], d.sales) : SP.empty('fa-receipt', SP.t('No sales yet', 'Hakuna mauzo bado'), SP.t('Sales to this customer will show here.', 'Mauzo kwa mteja huyu yataonekana hapa.'))}</div></div>
          ${d.top_products && d.top_products.length ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Frequently bought', 'Anachonunua Mara kwa Mara')}</h3></div><div class="sp-list">${d.top_products.map((p) => `<div class="sp-spread"><b>${esc(p.name)}</b><span class="sp-muted sp-small">${SP.t(`${SP.num(p.qty)} units · ${SP.money(p.amount)}`, `Vipande ${SP.num(p.qty)} · ${SP.money(p.amount)}`)}</span></div>`).join('')}</div></div>` : ''}
          ${seeNotes ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Notes', 'Maelezo')}</h3></div><div id="custNotes"><form class="sp-row" id="noteForm" style="margin-bottom:.8rem"><input class="sp-input grow" name="note" placeholder="${SP.t('Add a note about this customer…', 'Ongeza maelezo kuhusu mteja huyu…')}" maxlength="1000"><button class="sp-btn primary sm" type="submit">${SP.t('Add', 'Ongeza')}</button></form><div class="sp-list">${d.notes.length ? d.notes.map(noteRow).join('') : `<p class="sp-muted sp-small">${SP.t('No notes yet.', 'Hakuna maelezo bado.')}</p>`}</div></div></div>` : ''}
        </div>
        <div class="sp-stack">
          <div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Contact', 'Mawasiliano')}</h3></div><dl class="sp-kv">
            <dt>${SP.t('Phone', 'Simu')}</dt><dd>${esc(c.phone || '—')}</dd>${c.alt_phone ? `<dt>${SP.t('Second phone', 'Simu ya pili')}</dt><dd>${esc(c.alt_phone)}</dd>` : ''}
            <dt>${SP.t('Email', 'Barua pepe')}</dt><dd>${esc(c.email || '—')}</dd><dt>${SP.t('Address', 'Anwani')}</dt><dd>${esc(c.address || c.city || '—')}</dd>
            ${c.company ? `<dt>${SP.t('Company', 'Kampuni')}</dt><dd>${esc(c.company)}</dd>` : ''}<dt>${SP.t('Saved', 'Imehifadhiwa')}</dt><dd>${SP.date(c.created_at)}</dd></dl>${c.notes ? `<p class="sp-small sp-muted" style="margin:.6rem 0 0;border-top:1px solid var(--sp-border);padding-top:.6rem">${esc(c.notes)}</p>` : ''}</div>
          ${d.payments && d.payments.length ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Recent payments', 'Malipo ya Hivi Karibuni')}</h3></div><div class="sp-list">${d.payments.map((p) => `<div class="sp-spread"><div><b>${SP.money(p.amount)}</b><div class="sp-small sp-muted">${esc(p.method)}${p.reference ? ' · ' + esc(p.reference) : ''}</div></div><span class="sp-small sp-muted">${SP.date(p.created_at)}</span></div>`).join('')}</div></div>` : ''}
        </div>
      </div>`;

    if (seeNotes) {
      el.querySelector('#noteForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const input = e.target.note; const note = input.value.trim(); if (!note) return;
        const btn = e.target.querySelector('button'); btn.disabled = true;
        try { await SP.api.post(`/customers/${c.id}/notes`, { note }); SP.go(`customer/${c.id}`); } catch (err) { SP.fail(err); btn.disabled = false; }
      });
    }
    SP.delegate(el, {
      edit: () => SP.openCustomerForm(c, () => SP.go(`customer/${c.id}`)),
      pay: () => openReceivePayment(c, d.stats.balance, () => SP.go(`customer/${c.id}`)),
      'note-del': async (b) => { const ok = await SP.confirm({ title: SP.t('Delete this note?', 'Futa maelezo haya?'), danger: true }); if (!ok) return; await SP.api.del(`/customer-notes/${b.dataset.id}`); SP.go(`customer/${c.id}`); },
    });
  };

  function noteRow(n) {
    return `<div class="sp-spread"><div><span>${esc(n.note)}</span><div class="sp-small sp-muted">${esc(n.user_name || SP.t('Staff', 'Mfanyakazi'))} · ${SP.dateTime(n.created_at)}</div></div>${SP.can('customers.notes') ? `<button class="sp-icon-btn" style="width:30px;height:30px" data-act="note-del" data-id="${n.id}" title="${SP.t('Delete', 'Futa')}"><i class="fa-solid fa-xmark"></i></button>` : ''}</div>`;
  }

  function openReceivePayment(c, owed, onDone) {
    SP.lookups().then((lk) => {
      SP.formModal({
        title: SP.t(`Receive payment — ${c.full_name}`, `Pokea Malipo — ${c.full_name}`), submit: SP.t('Record payment', 'Rekodi Malipo'),
        body: `<div class="sp-alert info"><i class="fa-solid fa-circle-info"></i><div>${SP.t(`Currently owes <b>${SP.money(owed)}</b>. The payment will be applied to the oldest unpaid sales first.`, `Anadaiwa sasa <b>${SP.money(owed)}</b>. Malipo yatawekwa kwenye mauzo ya zamani zaidi yasiyolipwa kwanza.`)}</div></div>
          ${SP.f.input('amount', SP.t('Amount received', 'Kiasi kilichopokelewa'), { type: 'number', required: true, value: owed, attr: { min: 0.01, max: owed, step: '0.01' } })}
          ${SP.f.select('method', SP.t('Payment method', 'Njia ya malipo'), SP.opts.paymentMethods(lk), { required: true })}
          ${SP.f.input('reference', SP.t('Reference (optional)', 'Kumbukumbu (si lazima)'), { placeholder: SP.t('Transaction ID, cheque no…', 'Namba ya muamala, hundi…') })}`,
        onSubmit: async (data) => { const r = await SP.api.post(`/customers/${c.id}/payments`, data); SP.closeModal(); SP.toast(SP.t(`Payment recorded. ${r.remaining > 0.004 ? SP.money(r.remaining) + ' still owed.' : 'Fully paid.'}`, `Malipo yamerekodiwa. ${r.remaining > 0.004 ? SP.money(r.remaining) + ' bado inadaiwa.' : 'Imelipwa kikamilifu.'}`)); if (onDone) onDone(); },
      });
    });
  }
  SP.openReceivePayment = openReceivePayment;

  // =============================================================== statement
  // customer/:id/statement uses the same 'customer' route/module — branch on the extra segment.
  const origCustomer = SP.modules.customer;
  SP.modules.customer = async (el, parts, seg) => {
    if (parts[1] === 'statement') return renderStatement(el, parts[0]);
    return origCustomer(el, parts, seg);
  };

  async function renderStatement(el, id) {
    const d = await SP.api.get(`/customers/${id}/statement`);
    const c = d.customer;
    el.innerHTML = `${SP.pageHead(SP.t(`Statement — ${c.full_name}`, `Taarifa — ${c.full_name}`), c.customer_no, `<button class="sp-btn ghost" data-act="print"><i class="fa-solid fa-print"></i> ${SP.t('Print', 'Chapisha')}</button><a class="sp-btn ghost" href="#customer/${c.id}"><i class="fa-solid fa-arrow-left"></i> ${SP.t('Back', 'Rudi')}</a>`)}
      <div class="sp-card" id="stmtCard">
        <div class="sp-spread" style="margin-bottom:1rem"><div><b>${SP.t('Balance owed', 'Deni Lililobaki')}</b></div><div style="font-size:1.3rem;font-weight:800;color:${d.balance > 0.004 ? 'var(--sp-danger)' : 'var(--sp-ok)'}">${SP.money(d.balance)}</div></div>
        ${d.entries.length ? SP.table([
          { label: SP.t('Date', 'Tarehe'), render: (r) => SP.date(r.date) }, { label: SP.t('Reference', 'Kumbukumbu'), render: (r) => esc(r.ref) }, { label: SP.t('Type', 'Aina'), render: (r) => r.kind === 'sale' ? SP.t('Sale', 'Mauzo') : SP.t(`Payment (${esc(r.method || '')})`, `Malipo (${esc(r.method || '')})`) },
          { label: SP.t('Sale amount', 'Kiasi cha Mauzo'), cls: 'end', render: (r) => r.debit ? SP.money(r.debit) : '' }, { label: SP.t('Paid', 'Ililipwa'), cls: 'end', render: (r) => r.credit ? SP.money(r.credit) : '' }, { label: SP.t('Balance', 'Deni'), cls: 'end', render: (r) => SP.money(r.balance) },
        ], d.entries) : SP.empty('fa-file-invoice', SP.t('Nothing yet', 'Bado hakuna kitu'), SP.t('Sales and payments will appear here.', 'Mauzo na malipo yataonekana hapa.'))}
      </div>`;
    SP.delegate(el, { print: () => SP.print(`<div class="sp-doc"><h2>${esc(SP.state.shop.name)}</h2><h3>${SP.t(`Statement — ${esc(c.full_name)}`, `Taarifa — ${esc(c.full_name)}`)}</h3>${el.querySelector('#stmtCard').innerHTML}</div>`) });
  }
})();
