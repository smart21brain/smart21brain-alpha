/* Circulation — lending & returns, reservations, fines, and "My library". */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;

  // A small type-ahead picker: returns { el, value() }. search(q) -> [{ id, label, sub, ...extra }]
  function picker(name, label, search, { required = true } = {}) {
    const wrap = document.createElement('div'); wrap.className = 'in-field'; wrap.dataset.field = name; wrap.style.position = 'relative';
    wrap.innerHTML = `<label for="p_${name}">${esc(label)}${required ? '<span class="req">*</span>' : ''}</label><input class="in-input" id="p_${name}" autocomplete="off" placeholder="${IN.t('Type at least 2 letters…', 'Andika herufi 2 au zaidi…')}"><div class="in-suggest in-hide"></div><div class="in-small in-muted in-hide" data-chosen></div><span class="err"></span>`;
    const input = wrap.querySelector('input'); const box = wrap.querySelector('.in-suggest'); const chosen = wrap.querySelector('[data-chosen]');
    let pick = null; let items = [];
    const set = (it) => { pick = it; chosen.innerHTML = it ? `<i class="fa-solid fa-circle-check" style="color:var(--in-ok)"></i> ${esc(it.label)} <span class="in-muted">${esc(it.sub || '')}</span>` : ''; chosen.classList.toggle('in-hide', !it); box.classList.add('in-hide'); if (it) input.value = it.label; };
    input.addEventListener('input', IN.debounce(async () => {
      pick = null; chosen.classList.add('in-hide');
      const q = input.value.trim(); if (q.length < 2) { box.classList.add('in-hide'); return; }
      try { items = await search(q); box.innerHTML = items.length ? items.map((it, i) => `<button type="button" data-i="${i}">${esc(it.label)}<small>${esc(it.sub || '')}</small></button>`).join('') : `<div class="in-small in-muted" style="padding:.6rem .8rem">${IN.t('No match found.', 'Hakuna kilichopatikana.')}</div>`; box.classList.remove('in-hide'); } catch (e) { box.classList.add('in-hide'); }
    }, 250));
    box.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) set(items[Number(b.dataset.i)]); });
    return { el: wrap, value: () => pick, set };
  }
  const borrowerSearch = async (q) => (await IN.api.get('/borrowers' + IN.qs({ q }))).borrowers.map((b) => ({ id: b.id, type: b.type, label: b.full_name, sub: `${b.no}${b.sub ? ' · ' + b.sub : ''} · ${b.type === 'student' ? IN.t('Student', 'Mwanafunzi') : IN.t('Staff', 'Mfanyakazi')}${b.status !== 'active' && b.type === 'student' ? ' · ' + b.status : ''}` }));
  const bookSearch = async (q) => (await IN.api.get('/opac' + IN.qs({ q, limit: 8 }))).books.map((b) => ({ id: b.id, label: b.title, sub: `${b.author} · ${b.available}/${b.copies} ${IN.t('on shelf', 'rafuni')}` }));
  IN.pickers = { picker, borrowerSearch, bookSearch };

  // ------------------------------------------------------------ Issue
  function issueModal(prefillBook) {
    const body = document.createElement('div');
    const bp = picker('borrower', IN.t('Borrower', 'Anayekopa'), borrowerSearch);
    const kp = picker('book', IN.t('Book (search by title)', 'Kitabu (tafuta kwa kichwa)'), bookSearch, { required: false });
    body.append(bp.el, kp.el);
    body.insertAdjacentHTML('beforeend', `<div class="in-small in-muted" style="margin:-.3rem 0 .6rem">${IN.t('— or —', '— au —')}</div>${IN.f.input('accession_no', IN.t('Copy number / barcode', 'Namba ya nakala / barcode'), { placeholder: 'ACC-00012', hint: IN.t('Scan or type it if you have the book in your hand.', 'Changanua au andika ukiwa na kitabu mkononi.') })}
      ${IN.f.input('days', IN.t('Loan period (days)', 'Siku za kukopa'), { type: 'number', attr: { min: 1, max: 365 }, hint: IN.t('Leave empty to use the default for this borrower.', 'Acha wazi kutumia chaguo-msingi.') })}`);
    const m = IN.formModal({ title: IN.t('Issue a book', 'Kopesha kitabu'), body: '<div id="issueHost"></div>', submit: IN.t('Issue book', 'Kopesha kitabu'),
      onSubmit: async (d) => {
        const b = bp.value(); if (!b) throw new Error(IN.t('Please choose the borrower from the list.', 'Tafadhali chagua anayekopa kutoka kwenye orodha.'));
        const k = kp.value(); const acc = (d.accession_no || '').trim();
        if (!k && !acc) throw new Error(IN.t('Choose a book, or enter the copy number.', 'Chagua kitabu, au andika namba ya nakala.'));
        const r = await IN.api.post('/loans/issue', { borrower_type: b.type, borrower_id: b.id, book_id: acc ? undefined : k.id, accession_no: acc || undefined, days: d.days || undefined });
        IN.closeModal(); IN.toast(IN.t(`Issued to ${r.borrower}. Due ${IN.date(r.due_date)}.`, `Imekopeshwa kwa ${r.borrower}. Rudisha ${IN.date(r.due_date)}.`)); IN.route();
      } });
    m.querySelector('#issueHost').replaceWith(...body.childNodes);
    if (IN.attachScan) IN.attachScan(m.querySelector('[name=accession_no]'), { title: IN.t('Scan the book', 'Changanua kitabu') });
    if (prefillBook) { IN.api.get(`/books/${prefillBook}`).then((r) => kp.set({ id: r.book.id, label: r.book.title, sub: r.book.author })).catch(() => {}); }
  }

  // ------------------------------------------------------------ Return
  function returnModal(loan, after) {
    IN.formModal({ title: IN.t('Receive a return', 'Pokea kitabu kilichorudishwa'), submit: IN.t('Confirm return', 'Thibitisha'),
      body: `<p><b>${esc(loan.title)}</b><br><span class="in-muted">${esc(loan.borrower_name)} · ${esc(loan.accession_no)}</span></p>
        ${loan.overdue ? `<div class="in-alert bad" style="margin-bottom:.8rem"><i class="fa-solid fa-clock"></i><div>${IN.t(`${loan.days_overdue} day(s) overdue. A fine will be added.`, `Imechelewa siku ${loan.days_overdue}. Faini itaongezwa.`)}</div></div>` : ''}
        ${IN.f.select('condition', IN.t('Condition of the book', 'Hali ya kitabu'), [['good', IN.t('Good', 'Nzuri')], ['damaged', IN.t('Damaged (fine applies)', 'Imeharibika (faini)')], ['lost', IN.t('Lost (fine applies)', 'Imepotea (faini)')]], { value: 'good', noBlank: true })}`,
      onSubmit: async (d) => {
        const r = await IN.api.queued('POST', '/loans/return', { loan_id: loan.id, condition: d.condition }, IN.t(`Return: ${loan.title} (${loan.borrower_name})`, `Kurudisha: ${loan.title} (${loan.borrower_name})`));
        if (r.queued) { IN.closeModal(); after(); return; }
        IN.closeModal(); IN.toast(r.fine ? IN.t(`Returned. Fine of ${IN.money(r.fine)} added.`, `Imerudishwa. Faini ya ${IN.money(r.fine)} imeongezwa.`) : IN.t('Returned.', 'Imerudishwa.'), r.fine ? 'warn' : 'ok');
        if (r.held_for_next) IN.toast(IN.t('This copy is now held for the next person waiting.', 'Nakala hii imehifadhiwa kwa anayefuata.'), 'warn');
        after();
      } });
  }

  // ------------------------------------------------------------ Loans screen
  IN.modules.loans = async (el) => {
    const q0 = IN.hashQuery();
    const st = { filter: q0.get('filter') || 'active', q: '', page: 1 };
    const manage = IN.can('loans.manage');
    const TABS = [['active', IN.t('On loan', 'Vilivyokopwa')], ['overdue', IN.t('Overdue', 'Vilivyochelewa')], ['due_today', IN.t('Due today', 'Leo')], ['returned', IN.t('Returned', 'Vilivyorudishwa')], ['lost', IN.t('Lost', 'Vilivyopotea')], ['all', IN.t('All', 'Vyote')]];
    el.innerHTML = `${IN.pageHead(IN.t('Lending & returns', 'Kukopesha na kurudisha'), IN.t('Issue books, receive returns and keep track of what is due.', 'Kopesha vitabu, pokea vilivyorudishwa na fuatilia vinavyotakiwa.'),
      `<a class="in-btn ghost" href="#reservations"><i class="fa-solid fa-bookmark"></i> ${IN.t('Reservations', 'Uhifadhi')}</a><a class="in-btn ghost" href="#fines"><i class="fa-solid fa-coins"></i> ${IN.t('Fines', 'Faini')}</a>${manage ? `<button class="in-btn primary" data-act="issue"><i class="fa-solid fa-hand-holding"></i> ${IN.t('Issue book', 'Kopesha kitabu')}</button>` : ''}`)}
      ${manage ? `<div class="in-card" style="margin-bottom:1rem"><form class="in-toolbar" id="quickReturn"><i class="fa-solid fa-barcode in-muted"></i><input class="in-input" id="qrCode" placeholder="${IN.t('Quick return: scan or type the copy number, then press Enter', 'Kurudisha haraka: changanua au andika namba ya nakala, kisha bonyeza Enter')}" style="flex:1" autocomplete="off"><button class="in-btn ghost" type="submit">${IN.t('Return', 'Rudisha')}</button></form></div>` : ''}
      <div class="in-card"><div class="in-tabs" role="tablist">${TABS.map(([k, l]) => `<button class="${st.filter === k ? 'on' : ''}" data-act="tab" data-k="${k}" role="tab">${l}</button>`).join('')}</div>
      <div class="in-toolbar"><input class="in-input" id="lQ" type="search" placeholder="${IN.t('Search title, borrower, copy number…', 'Tafuta kichwa, aliyekopa, namba ya nakala…')}" style="flex:1"></div><div id="lOut"></div></div>`;
    const out = el.querySelector('#lOut'); let rows = [];
    const load = async () => {
      const r = await IN.api.get('/loans' + IN.qs({ ...st, limit: 20 })); rows = r.loans;
      out.innerHTML = rows.length ? IN.table([
        { label: IN.t('Book', 'Kitabu'), render: (l) => `<a href="#book/${l.book_id}" class="in-strong">${esc(l.title)}</a><div class="in-small in-muted">${esc(l.accession_no)}</div>` },
        { label: IN.t('Borrower', 'Aliyekopa'), render: (l) => `${esc(l.borrower_name || '—')}<div class="in-small in-muted">${esc(l.borrower_no || '')}</div>` },
        { label: IN.t('Issued', 'Alikopa'), render: (l) => IN.date(l.issued_on) },
        { label: IN.t('Due', 'Rudisha'), render: (l) => IN.date(l.due_date) },
        { label: IN.t('Status', 'Hali'), render: (l) => l.status === 'borrowed' ? (l.overdue ? IN.chip('overdue', IN.t(`${l.days_overdue}d overdue`, `Siku ${l.days_overdue}`)) + `<div class="in-small in-muted">${IN.money(l.accrued_fine)}</div>` : l.due_today ? IN.chip('due_today') : IN.chip('borrowed')) : IN.chip(l.status) },
        { label: '', cls: 'in-right', render: (l) => l.status === 'borrowed' && manage ? `<button class="in-btn ghost sm" data-act="renew" data-id="${l.id}">${IN.t('Renew', 'Ongeza muda')}</button> <button class="in-btn primary sm" data-act="return" data-id="${l.id}">${IN.t('Return', 'Rudisha')}</button>` : '' },
      ], rows) + IN.pager(r.page, r.limit, r.total) : IN.empty('fa-right-left', IN.t('No loans here', 'Hakuna mikopo hapa'), st.filter === 'overdue' ? IN.t('Nothing is overdue. 🎉', 'Hakuna kilichochelewa. 🎉') : IN.t('Nothing matches this view.', 'Hakuna kinacholingana na mwonekano huu.'));
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#lQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    const qr = el.querySelector('#quickReturn');
    if (qr && IN.attachScan) IN.attachScan(el.querySelector('#qrCode'), { continuous: true, title: IN.t('Scan books to return', 'Changanua vitabu vya kurudisha'),
      onCode: async (code) => { const r = await IN.api.queued('POST', '/loans/return', { accession_no: code, condition: 'good' }, IN.t(`Return: copy ${code}`, `Kurudisha: nakala ${code}`)); reload(false); return r.queued ? IN.t(`${code} — saved on this device, will be sent when online`, `${code} — imehifadhiwa kwenye kifaa, itatumwa mtandaoni`) : `"${r.title}" ${IN.t('returned', 'imerudishwa')}${r.fine ? ' · ' + IN.t('fine', 'faini') + ' ' + IN.money(r.fine) : ''}`; } });
    if (qr) qr.addEventListener('submit', async (e) => {
      e.preventDefault(); const code = el.querySelector('#qrCode').value.trim(); if (!code) return;
      try { const r = await IN.api.queued('POST', '/loans/return', { accession_no: code, condition: 'good' }, IN.t(`Return: copy ${code}`, `Kurudisha: nakala ${code}`)); el.querySelector('#qrCode').value = ''; if (r.queued) return; IN.toast(IN.t(`"${r.title}" returned.${r.fine ? ' Fine: ' + IN.money(r.fine) : ''}`, `"${r.title}" imerudishwa.${r.fine ? ' Faini: ' + IN.money(r.fine) : ''}`), r.fine ? 'warn' : 'ok'); reload(false); } catch (err) { IN.fail(err); }
    });
    IN.delegate(el, {
      tab: (b) => { st.filter = b.dataset.k; el.querySelectorAll('[data-act=tab]').forEach((x) => x.classList.toggle('on', x === b)); reload(); },
      page: (b) => { st.page = Number(b.dataset.p); reload(false); },
      issue: () => issueModal(),
      return: (b) => returnModal(rows.find((l) => l.id === Number(b.dataset.id)), () => reload(false)),
      renew: async (b) => { const r = await IN.api.post(`/loans/${b.dataset.id}/renew`); IN.toast(IN.t(`Renewed. New due date: ${IN.date(r.due_date)}.`, `Imeongezwa. Tarehe mpya: ${IN.date(r.due_date)}.`)); reload(false); },
    });
    await load();
    if (q0.get('issue') && manage) issueModal(q0.get('issue'));
  };

  // ------------------------------------------------------------ Reservations
  IN.modules.reservations = async (el) => {
    const manage = IN.can('loans.manage');
    const { reservations } = await IN.api.get('/reservations');
    el.innerHTML = `${IN.pageHead(IN.t('Reservations', 'Uhifadhi'), IN.t('People waiting for a book, in the order they asked.', 'Watu wanaosubiri kitabu, kwa mpangilio waliouomba.'), `<a class="in-btn ghost" href="#loans"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Back', 'Rudi')}</a>${manage ? `<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('New reservation', 'Uhifadhi mpya')}</button>` : ''}`)}
      <div class="in-card">${IN.table([{ label: IN.t('Book', 'Kitabu'), render: (r) => `<b>${esc(r.title)}</b><div class="in-small in-muted">${esc(r.author)}</div>` }, { label: IN.t('For', 'Kwa'), render: (r) => esc(r.borrower_name || '—') }, { label: IN.t('Asked', 'Aliomba'), render: (r) => IN.date(r.created_at) },
        { label: IN.t('Status', 'Hali'), render: (r) => IN.chip(r.status) + (r.status === 'ready' ? `<div class="in-small in-muted">${IN.t('Hold until', 'Hadi')} ${IN.date(r.hold_until)} · ${esc(r.accession_no || '')}</div>` : '') },
        { label: '', cls: 'in-right', render: (r) => manage ? `<button class="in-btn danger-ghost sm" data-act="cancel" data-id="${r.id}">${IN.t('Cancel', 'Ghairi')}</button>` : '' }], reservations, { empty: IN.empty('fa-bookmark', IN.t('No open reservations', 'Hakuna uhifadhi'), IN.t('When a book is out, borrowers can reserve it here.', 'Kitabu kikiwa nje, wakopaji wanaweza kukihifadhi hapa.')) })}</div>`;
    IN.delegate(el, {
      cancel: async (b) => { if (!(await IN.confirm({ title: IN.t('Cancel this reservation?', 'Ghairi uhifadhi huu?'), message: '', confirmText: IN.t('Cancel reservation', 'Ghairi uhifadhi') }))) return; await IN.api.del(`/reservations/${b.dataset.id}`); IN.route(); },
      add: () => { const bp = picker('borrower', IN.t('Borrower', 'Anayekopa'), borrowerSearch); const kp = picker('book', IN.t('Book', 'Kitabu'), bookSearch);
        const m = IN.formModal({ title: IN.t('New reservation', 'Uhifadhi mpya'), body: '<div id="rsHost"></div>', onSubmit: async () => { const b = bp.value(); const k = kp.value(); if (!b || !k) throw new Error(IN.t('Choose both a borrower and a book from the lists.', 'Chagua anayekopa na kitabu kutoka kwenye orodha.')); await IN.api.post('/reservations', { borrower_type: b.type, borrower_id: b.id, book_id: k.id }); IN.closeModal(); IN.toast(IN.t('Reservation saved.', 'Uhifadhi umehifadhiwa.')); IN.route(); } });
        m.querySelector('#rsHost').replaceWith(bp.el, kp.el); },
    });
  };

  // ------------------------------------------------------------ Fines
  IN.modules.fines = async (el) => {
    const manage = IN.can('fines.manage'); let status = 'unpaid';
    el.innerHTML = `${IN.pageHead(IN.t('Fines', 'Faini'), IN.t('Late, lost and damaged book charges.', 'Faini za kuchelewa, kupotea na kuharibika.'), `<a class="in-btn ghost" href="#loans"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Back', 'Rudi')}</a>`)}<div id="fnStats"></div><div class="in-card"><div class="in-tabs">${['unpaid', 'paid', 'waived', 'all'].map((k) => `<button class="${k === status ? 'on' : ''}" data-act="tab" data-k="${k}">${IN.t(...({ unpaid: ['Unpaid', 'Zisizolipwa'], paid: ['Paid', 'Zilizolipwa'], waived: ['Waived', 'Zilizosamehewa'], all: ['All', 'Zote'] })[k])}</button>`).join('')}</div><div id="fnOut"></div></div>`;
    const load = async () => {
      const r = await IN.api.get('/fines' + IN.qs({ status }));
      el.querySelector('#fnStats').innerHTML = `<div class="in-grid cols-3" style="margin-bottom:1rem">${IN.stat('fa-coins', IN.moneyHtml(r.totals.unpaid), IN.t('Unpaid', 'Zisizolipwa'), '', r.totals.unpaid ? 'amber' : 'green')}${IN.stat('fa-circle-check', IN.moneyHtml(r.totals.paid), IN.t('Collected', 'Zilizokusanywa'), '', 'green')}${IN.stat('fa-hand-holding-heart', IN.moneyHtml(r.totals.waived), IN.t('Waived', 'Zilizosamehewa'))}</div>`;
      el.querySelector('#fnOut').innerHTML = IN.table([{ label: IN.t('Borrower', 'Aliyekopa'), render: (f) => esc(f.borrower_name || '—') }, { label: IN.t('Reason', 'Sababu'), render: (f) => `${IN.cap(f.reason)}${f.title ? `<div class="in-small in-muted">${esc(f.title)}</div>` : ''}${f.note ? `<div class="in-small in-muted">${esc(f.note)}</div>` : ''}` },
        { label: IN.t('Amount', 'Kiasi'), cls: 'in-right', render: (f) => IN.money(f.amount) }, { label: IN.t('Date', 'Tarehe'), render: (f) => IN.date(f.created_at) }, { label: IN.t('Status', 'Hali'), render: (f) => IN.chip(f.status) },
        { label: '', cls: 'in-right', render: (f) => f.status === 'unpaid' && manage ? `<button class="in-btn primary sm" data-act="pay" data-id="${f.id}">${IN.t('Mark paid', 'Weka imelipwa')}</button> <button class="in-btn ghost sm" data-act="waive" data-id="${f.id}">${IN.t('Waive', 'Samehe')}</button>` : '' }], r.fines, { empty: IN.empty('fa-coins', IN.t('No fines', 'Hakuna faini'), IN.t('Nothing to show here.', 'Hakuna cha kuonyesha hapa.')) });
    };
    IN.delegate(el, {
      tab: (b) => { status = b.dataset.k; el.querySelectorAll('[data-act=tab]').forEach((x) => x.classList.toggle('on', x === b)); load(); },
      pay: async (b) => { await IN.api.post(`/fines/${b.dataset.id}/settle`, { status: 'paid' }); IN.toast(IN.t('Payment recorded.', 'Malipo yamerekodiwa.')); load(); },
      waive: async (b) => { if (!(await IN.confirm({ title: IN.t('Waive this fine?', 'Samehe faini hii?'), message: IN.t('The borrower will no longer owe it.', 'Aliyekopa hatadaiwa tena.'), danger: false, confirmText: IN.t('Waive', 'Samehe') }))) return; await IN.api.post(`/fines/${b.dataset.id}/settle`, { status: 'waived' }); load(); },
    });
    await load();
  };

  // ------------------------------------------------------------ My library
  IN.modules.myLibrary = async (el) => {
    const d = await IN.api.get('/my-library');
    if (!d.linked) { el.innerHTML = `<div class="in-card">${IN.empty('fa-link-slash', IN.t('Your login is not linked yet', 'Akaunti yako haijaunganishwa bado'), IN.t('Ask the library desk to link your login to your student or staff record.', 'Mwombe msimamizi aunganishe akaunti yako na rekodi yako.'))}</div>`; return; }
    const unpaid = d.fines.filter((f) => f.status === 'unpaid').reduce((s, f) => s + f.amount, 0);
    el.innerHTML = `${IN.pageHead(IN.t('My library', 'Maktaba yangu'), IN.t('Your books, reservations and fines.', 'Vitabu vyako, uhifadhi na faini.'), `<a class="in-btn primary" href="#catalogue"><i class="fa-solid fa-magnifying-glass"></i> ${IN.t('Find a book', 'Tafuta kitabu')}</a>`)}
      ${unpaid ? `<div class="in-alert bad" style="margin-bottom:1rem"><i class="fa-solid fa-coins"></i><div><b>${IN.t(`You owe ${IN.money(unpaid)} in fines.`, `Unadaiwa faini ${IN.money(unpaid)}.`)}</b> ${IN.t('Please pay at the library desk to borrow again.', 'Tafadhali lipa dawati la maktaba ili kukopa tena.')}</div></div>` : ''}
      <div class="in-card" style="margin-bottom:1rem"><div class="in-card-head"><h3>${IN.t('Books I have', 'Vitabu nilivyonavyo')}</h3></div>${IN.table([{ label: IN.t('Book', 'Kitabu'), render: (l) => `<b>${esc(l.title)}</b><div class="in-small in-muted">${esc(l.author)}</div>` }, { label: IN.t('Due', 'Rudisha'), render: (l) => IN.date(l.due_date) }, { label: IN.t('Status', 'Hali'), render: (l) => l.overdue ? IN.chip('overdue', IN.t(`${l.days_overdue}d overdue`, `Siku ${l.days_overdue}`)) : l.due_today ? IN.chip('due_today') : IN.chip('borrowed') },
        { label: '', cls: 'in-right', render: (l) => `<button class="in-btn ghost sm" data-act="renew" data-id="${l.id}" ${l.overdue ? 'disabled' : ''}>${IN.t('Renew', 'Ongeza muda')}</button>` }], d.loans, { empty: IN.empty('fa-book', IN.t('No borrowed books', 'Hakuna vitabu ulivyokopa'), IN.t('Books you borrow will show here with their due dates.', 'Vitabu utakavyokopa vitaonekana hapa pamoja na tarehe za kurudisha.')) })}</div>
      ${d.reservations.length ? `<div class="in-card" style="margin-bottom:1rem"><div class="in-card-head"><h3>${IN.t('My reservations', 'Uhifadhi wangu')}</h3></div>${IN.table([{ label: IN.t('Book', 'Kitabu'), render: (r) => esc(r.title) }, { label: IN.t('Status', 'Hali'), render: (r) => IN.chip(r.status) + (r.status === 'ready' ? ` <span class="in-small in-muted">${IN.t('collect by', 'chukua kabla ya')} ${IN.date(r.hold_until)}</span>` : '') }, { label: '', cls: 'in-right', render: (r) => `<button class="in-btn danger-ghost sm" data-act="cancel" data-id="${r.id}">${IN.t('Cancel', 'Ghairi')}</button>` }], d.reservations)}</div>` : ''}
      <div class="in-card"><div class="in-card-head"><h3>${IN.t('Borrowing history', 'Historia ya kukopa')}</h3></div>${IN.table([{ label: IN.t('Book', 'Kitabu'), render: (l) => esc(l.title) }, { label: IN.t('Issued', 'Alikopa'), render: (l) => IN.date(l.issued_on) }, { label: IN.t('Returned', 'Alirudisha'), render: (l) => l.returned_on ? IN.date(l.returned_on) : '—' }, { label: IN.t('Status', 'Hali'), render: (l) => IN.chip(l.status) }], d.history, { empty: IN.empty('fa-clock-rotate-left', IN.t('No history yet', 'Hakuna historia bado'), '') })}</div>`;
    IN.delegate(el, {
      renew: async (b) => { const r = await IN.api.post(`/loans/${b.dataset.id}/renew`); IN.toast(IN.t(`Renewed. New due date: ${IN.date(r.due_date)}.`, `Imeongezwa. Tarehe mpya: ${IN.date(r.due_date)}.`)); IN.route(); },
      cancel: async (b) => { await IN.api.del(`/reservations/${b.dataset.id}`); IN.route(); },
    });
  };
})();
