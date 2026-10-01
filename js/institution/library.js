/* Library — OPAC catalogue, book management, book page, categories. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;

  const coverHtml = (b, big) => `<span class="cover">${esc((b.title || '?').trim().charAt(0).toUpperCase())}${b.has_cover ? `<img src="${IN.photoUrl('book', b.id)}" alt="${esc(IN.t('Cover of', 'Jalada la'))} ${esc(b.title)}" loading="lazy" onerror="this.remove()">` : ''}</span>`;
  IN.coverHtml = coverHtml;
  const statusChip = (b) => IN.chip(b.status, b.status === 'available' ? IN.t(`Available (${b.available}/${b.copies})`, `Ipo (${b.available}/${b.copies})`) : undefined);

  function bookCard(b, staff) {
    return `<button class="in-book" data-act="open" data-id="${b.id}" aria-label="${esc(b.title)}">${coverHtml(b)}<span class="meta"><h4>${esc(b.title)}</h4><span class="by">${esc(b.author)}${b.pub_year ? ' · ' + b.pub_year : ''}</span>
      <span class="by">${esc(b.category || '')}${b.shelf ? ` · ${IN.t('Shelf', 'Rafu')} ${esc(b.shelf)}` : ''}</span><span class="foot">${statusChip(b)}${b.reserved ? '' : ''}</span></span></button>`;
  }
  IN.bookCard = bookCard;

  // ------------------------------------------------------------ OPAC detail popup
  async function openDetail(id, { staff } = {}) {
    let book;
    try {
      book = (await IN.api.get(IN.can('books.view') ? `/books/${id}` : `/opac/book/${id}`)).book;
    } catch (e) { return IN.fail(e); }
    if (!book) return IN.toast(IN.t('This book could not be found.', 'Kitabu hiki hakipatikani.'), 'error');
    const canReserve = !book.available && book.copies && (IN.state.student_id || IN.state.staff_id);
    const body = `<div class="in-book-hero">${coverHtml(book)}<div style="min-width:0"><h3 style="margin-bottom:.2rem">${esc(book.title)}</h3><div class="in-muted">${esc(book.author)}</div><div style="margin:.6rem 0">${statusChip(book)}</div>
      <dl class="in-kv"><dt>${IN.t('Category', 'Jamii')}</dt><dd>${esc(book.category || '—')}</dd><dt>${IN.t('Subject', 'Somo')}</dt><dd>${esc(book.subject || '—')}</dd><dt>${IN.t('Publisher', 'Mchapishaji')}</dt><dd>${esc(book.publisher || '—')}${book.pub_year ? ', ' + book.pub_year : ''}${book.edition ? ' · ' + esc(book.edition) : ''}</dd>
      <dt>ISBN</dt><dd>${esc(book.isbn || '—')}</dd><dt>${IN.t('Language', 'Lugha')}</dt><dd>${esc(book.language || '—')}</dd><dt>${IN.t('Location', 'Mahali')}</dt><dd>${esc(book.shelf || '—')}${book.classification_no ? ` · ${esc(book.classification_no)}` : ''}</dd>
      <dt>${IN.t('Copies', 'Nakala')}</dt><dd>${IN.t(`${book.available} available · ${book.borrowed} borrowed · ${book.reserved} reserved`, `${book.available} zipo · ${book.borrowed} zimekopwa · ${book.reserved} zimehifadhiwa`)}${book.lost || book.damaged ? ` · ${book.lost} ${IN.t('lost', 'zimepotea')} · ${book.damaged} ${IN.t('damaged', 'zimeharibika')}` : ''}</dd></dl></div></div>
      ${book.description ? `<p style="margin-top:1rem">${esc(book.description)}</p>` : ''}`;
    const back = IN.modal(book.title, body, { size: 'lg', footer: `${IN.can('books.manage') ? `<a class="in-btn ghost" href="#book/${book.id}" data-close3>${IN.t('Manage', 'Simamia')}</a>` : ''}${canReserve ? `<button class="in-btn primary" data-reserve><i class="fa-solid fa-bookmark"></i> ${IN.t('Reserve this book', 'Hifadhi kitabu hiki')}</button>` : ''}<button class="in-btn ghost" data-x>${IN.t('Close', 'Funga')}</button>` });
    back.querySelector('[data-x]').addEventListener('click', () => IN.closeModal());
    const mg = back.querySelector('[data-close3]'); if (mg) mg.addEventListener('click', () => IN.closeModal());
    const rb = back.querySelector('[data-reserve]');
    if (rb) rb.addEventListener('click', async () => {
      rb.disabled = true;
      try { await IN.api.post('/reservations', { book_id: book.id }); IN.closeModal(); IN.toast(IN.t('Reserved. You will be notified when it is ready.', 'Imehifadhiwa. Utaarifiwa ikiwa tayari.')); }
      catch (e) { IN.fail(e); rb.disabled = false; }
    });
  }
  IN.openBook = openDetail;

  // ------------------------------------------------------------ Catalogue (OPAC)
  IN.modules.catalogue = async (el) => {
    const lk = await IN.lookups();
    const st = { q: '', field: 'all', status: '', category_id: '', sort: 'title', page: 1, year_from: '', year_to: '', language: '', adv: false };
    const fields = [['all', IN.t('Everything', 'Kila kitu')], ['title', IN.t('Title', 'Kichwa')], ['author', IN.t('Author', 'Mwandishi')], ['isbn', 'ISBN'], ['subject', IN.t('Subject', 'Somo')], ['publisher', IN.t('Publisher', 'Mchapishaji')], ['category', IN.t('Category', 'Jamii')]];
    el.innerHTML = `${IN.pageHead(IN.t('Library catalogue', 'Katalogi ya maktaba'), IN.t('Search every book and see at once if it is on the shelf.', 'Tafuta kitabu chochote na uone mara moja kama kipo rafuni.'))}
      <div class="in-card" style="margin-bottom:1rem"><div class="in-toolbar" style="position:relative">
        <select class="in-select" id="cField" aria-label="${IN.t('Search in', 'Tafuta katika')}" style="max-width:150px">${fields.map((f) => `<option value="${f[0]}">${f[1]}</option>`).join('')}</select>
        <div style="position:relative;flex:1;min-width:200px"><input class="in-input" id="cQ" type="search" placeholder="${IN.t('Title, author, ISBN, subject…', 'Kichwa, mwandishi, ISBN, somo…')}" autocomplete="off"><div class="in-suggest in-hide" id="cSug"></div></div>
        <select class="in-select" id="cStatus" aria-label="${IN.t('Availability', 'Upatikanaji')}"><option value="">${IN.t('Any availability', 'Upatikanaji wowote')}</option>${['available', 'borrowed', 'reserved', 'damaged', 'lost'].map((s) => `<option value="${s}">${IN.t(...({ available: ['Available', 'Zipo'], borrowed: ['Borrowed', 'Zimekopwa'], reserved: ['Reserved', 'Zimehifadhiwa'], damaged: ['Damaged', 'Zimeharibika'], lost: ['Lost', 'Zimepotea'] })[s])}</option>`).join('')}</select>
        <select class="in-select" id="cCat" aria-label="${IN.t('Category', 'Jamii')}"><option value="">${IN.t('All categories', 'Jamii zote')}</option>${lk.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <select class="in-select" id="cSort" aria-label="${IN.t('Sort', 'Panga')}"><option value="title">${IN.t('Title A–Z', 'Kichwa A–Z')}</option><option value="author">${IN.t('Author A–Z', 'Mwandishi A–Z')}</option><option value="year">${IN.t('Newest first', 'Mpya kwanza')}</option><option value="year_asc">${IN.t('Oldest first', 'Kongwe kwanza')}</option><option value="recent">${IN.t('Recently added', 'Zilizoongezwa karibuni')}</option></select>
        <button class="in-btn ghost" id="cAdv"><i class="fa-solid fa-sliders"></i> ${IN.t('Advanced', 'Kina')}</button></div>
        <div class="in-adv in-hide" id="cAdvBox"><div class="in-field"><label for="cYf">${IN.t('Published from', 'Ilichapishwa kuanzia')}</label><input class="in-input" id="cYf" type="number" min="1000" max="3000" placeholder="1990"></div><div class="in-field"><label for="cYt">${IN.t('Published up to', 'Hadi mwaka')}</label><input class="in-input" id="cYt" type="number" min="1000" max="3000" placeholder="2026"></div><div class="in-field"><label for="cLang">${IN.t('Language', 'Lugha')}</label><input class="in-input" id="cLang" placeholder="English"></div></div></div>
      <div id="cOut"></div>`;
    const out = el.querySelector('#cOut');
    const load = async () => {
      out.innerHTML = IN.skeleton(3);
      const r = await IN.api.get('/opac' + IN.qs({ ...st, adv: '', limit: 12 }));
      out.innerHTML = r.books.length ? `<div class="in-books">${r.books.map((b) => bookCard(b)).join('')}</div>${IN.pager(r.page, r.limit, r.total)}`
        : `<div class="in-card">${IN.empty('fa-book-open', IN.t('No books found', 'Hakuna vitabu vilivyopatikana'), st.q ? IN.t(`Nothing matches "${st.q}". Try fewer words, check the spelling, or search "Everything".`, `Hakuna kinacholingana na "${st.q}". Jaribu maneno machache, hakiki tahajia, au tafuta "Kila kitu".`) : IN.t('No books have been added yet.', 'Hakuna vitabu vilivyoongezwa bado.'), st.q || st.status || st.category_id ? `<button class="in-btn ghost" data-act="clear">${IN.t('Clear filters', 'Futa vichujio')}</button>` : '')}</div>`;
    };
    const reload = (resetPage = true) => { if (resetPage) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    const bind = (id, key, ev = 'change') => el.querySelector(id).addEventListener(ev, (e) => { st[key] = e.target.value; reload(); });
    bind('#cField', 'field'); bind('#cStatus', 'status'); bind('#cCat', 'category_id'); bind('#cSort', 'sort'); bind('#cYf', 'year_from'); bind('#cYt', 'year_to');
    el.querySelector('#cLang').addEventListener('input', IN.debounce((e) => { st.language = e.target.value.trim(); reload(); }, 350));
    const q = el.querySelector('#cQ'); const sug = el.querySelector('#cSug');
    q.addEventListener('input', IN.debounce(async () => {
      st.q = q.value.trim(); reload();
      if (st.q.length < 2) { sug.classList.add('in-hide'); return; }
      try { const { suggestions } = await IN.api.get('/opac/suggest' + IN.qs({ q: st.q })); sug.innerHTML = suggestions.map((s) => `<button type="button" data-t="${esc(s.title)}">${esc(s.title)}<small>${esc(s.author)}</small></button>`).join(''); sug.classList.toggle('in-hide', !suggestions.length); } catch (e) { /* suggestions are optional */ }
    }, 280));
    sug.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) { q.value = b.dataset.t; st.q = b.dataset.t; st.field = 'title'; el.querySelector('#cField').value = 'title'; sug.classList.add('in-hide'); reload(); } });
    document.addEventListener('click', (e) => { if (!e.target.closest('#cSug') && e.target !== q) sug.classList.add('in-hide'); });
    el.querySelector('#cAdv').addEventListener('click', () => el.querySelector('#cAdvBox').classList.toggle('in-hide'));
    IN.delegate(el, {
      open: (b) => openDetail(b.dataset.id),
      page: (b) => { st.page = Number(b.dataset.p); reload(false); window.scrollTo({ top: 0, behavior: 'smooth' }); },
      clear: () => { Object.assign(st, { q: '', status: '', category_id: '', year_from: '', year_to: '', language: '' }); IN.route(); },
    });
    await load();
  };

  // ------------------------------------------------------------ Book form
  function bookForm(lk, b = {}, creating = true) {
    return `${IN.f.section('fa-book', IN.t('Book details', 'Maelezo ya kitabu'))}
      <div class="cols">${IN.f.input('title', IN.t('Title', 'Kichwa'), { required: true, value: b.title, attr: { maxlength: 250 } })}${IN.f.input('author', IN.t('Author', 'Mwandishi'), { required: true, value: b.author, attr: { maxlength: 200 } })}</div>
      <div class="cols">${IN.f.input('isbn', 'ISBN', { value: b.isbn, hint: IN.t('10 or 13 digits', 'Tarakimu 10 au 13') })}${IN.f.select('category_id', IN.t('Category', 'Jamii'), IN.opts.list(lk.categories), { value: b.category_id })}</div>
      <div class="cols-3 cols">${IN.f.input('publisher', IN.t('Publisher', 'Mchapishaji'), { value: b.publisher })}${IN.f.input('pub_year', IN.t('Year', 'Mwaka'), { type: 'number', value: b.pub_year, attr: { min: 1000, max: new Date().getFullYear() + 1 } })}${IN.f.input('edition', IN.t('Edition', 'Toleo'), { value: b.edition })}</div>
      <div class="cols">${IN.f.input('subject', IN.t('Subject', 'Somo'), { value: b.subject })}${IN.f.input('language', IN.t('Language', 'Lugha'), { value: b.language, placeholder: 'English' })}</div>
      ${IN.f.section('fa-location-dot', IN.t('Cataloguing & location', 'Uorodheshaji na mahali'))}
      <div class="cols-3 cols">${IN.f.input('shelf', IN.t('Shelf / location', 'Rafu / mahali'), { value: b.shelf })}${IN.f.input('classification_no', IN.t('Classification no.', 'Namba ya uainishaji'), { value: b.classification_no, hint: 'Dewey / call number' })}${creating ? IN.f.input('copies', IN.t('Number of copies', 'Idadi ya nakala'), { type: 'number', value: 1, required: true, attr: { min: 1, max: 200 } }) : ''}</div>
      ${IN.f.textarea('description', IN.t('Description', 'Maelezo'), { value: b.description, rows: 3 })}
      ${IN.f.section('fa-receipt', IN.t('Acquisition', 'Upatikanaji'))}
      <div class="cols-3 cols">${IN.f.input('acquisition_date', IN.t('Date acquired', 'Tarehe'), { type: 'date', value: b.acquisition_date })}${IN.f.input('acquisition_source', IN.t('Source', 'Chanzo'), { value: b.acquisition_source })}${IN.f.input('price', IN.t('Price / value', 'Bei / thamani'), { type: 'number', value: b.price, attr: { min: 0, step: 'any' } })}</div>
      ${IN.f.textarea('notes', IN.t('Notes', 'Maelezo ya ndani'), { value: b.notes, rows: 2 })}
      ${IN.f.section('fa-image', IN.t('Cover (optional)', 'Jalada (si lazima)'))}${IN.photoField('cover')}`;
  }
  async function saveBook(data, form, id) {
    const payload = { ...data }; delete payload.cover;
    const r = id ? await IN.api.put(`/books/${id}`, payload) : await IN.api.post('/books', payload);
    const bid = id || r.id;
    try { await IN.uploadPhoto(`/books/${bid}/cover`, form, 'cover'); } catch (e) { IN.toast(IN.t('The book was saved, but the cover could not be uploaded: ', 'Kitabu kimehifadhiwa, lakini jalada halikupakiwa: ') + e.message, 'warn'); }
    return { ...r, id: bid };
  }

  // ------------------------------------------------------------ Manage books
  IN.modules.books = async (el) => {
    const lk = await IN.lookups();
    const st = { q: '', category_id: '', status: '', archived: '0', sort: 'title', page: 1 };
    const canManage = IN.can('books.manage');
    el.innerHTML = `${IN.pageHead(IN.t('Manage books', 'Simamia vitabu'), IN.t('Add, catalogue and organise the collection.', 'Ongeza, orodhesha na panga mkusanyiko.'),
      `${canManage ? `<a class="in-btn ghost" href="#categories"><i class="fa-solid fa-tags"></i> ${IN.t('Categories', 'Jamii')}</a>${IN.can('import.manage') ? `<a class="in-btn ghost" href="#import?type=books"><i class="fa-solid fa-file-import"></i> ${IN.t('Import', 'Leta')}</a>` : ''}<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add book', 'Ongeza kitabu')}</button>` : ''}`)}
      <div class="in-card"><div class="in-toolbar"><input class="in-input" id="bQ" type="search" placeholder="${IN.t('Search title, author, ISBN…', 'Tafuta kichwa, mwandishi, ISBN…')}" style="flex:1;min-width:200px">
      <select class="in-select" id="bCat"><option value="">${IN.t('All categories', 'Jamii zote')}</option>${lk.categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
      <select class="in-select" id="bSt"><option value="">${IN.t('Any status', 'Hali yoyote')}</option>${['available', 'borrowed', 'reserved', 'damaged', 'lost'].map((s) => `<option value="${s}">${IN.cap(s)}</option>`).join('')}</select>
      <select class="in-select" id="bArch"><option value="0">${IN.t('Active books', 'Vitabu hai')}</option><option value="1">${IN.t('Archived', 'Vilivyohifadhiwa')}</option><option value="all">${IN.t('All', 'Vyote')}</option></select></div><div id="bOut"></div></div>`;
    const out = el.querySelector('#bOut');
    const load = async () => {
      const r = await IN.api.get('/opac' + IN.qs({ ...st, limit: 20 }));
      out.innerHTML = r.books.length ? IN.table([
        { label: IN.t('Title', 'Kichwa'), render: (b) => `<a href="#book/${b.id}" class="in-strong">${esc(b.title)}</a><div class="in-small in-muted">${esc(b.author)}</div>` },
        { label: 'ISBN', render: (b) => esc(b.isbn || '—') }, { label: IN.t('Category', 'Jamii'), render: (b) => esc(b.category || '—') }, { label: IN.t('Shelf', 'Rafu'), render: (b) => esc(b.shelf || '—') },
        { label: IN.t('Copies', 'Nakala'), cls: 'in-center', render: (b) => `${b.available}/${b.copies}` }, { label: IN.t('Status', 'Hali'), render: (b) => IN.chip(b.status) },
        { label: '', cls: 'in-right', render: (b) => `<a class="in-btn ghost sm" href="#book/${b.id}">${IN.t('Open', 'Fungua')}</a>` },
      ], r.books) + IN.pager(r.page, r.limit, r.total)
        : IN.empty('fa-book', IN.t('No books found', 'Hakuna vitabu'), IN.t('Add your first book, or import a list from a spreadsheet.', 'Ongeza kitabu chako cha kwanza, au leta orodha kutoka kwenye lahajedwali.'), canManage ? `<button class="in-btn primary" data-act="add">${IN.t('Add book', 'Ongeza kitabu')}</button>` : '');
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#bQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    [['#bCat', 'category_id'], ['#bSt', 'status'], ['#bArch', 'archived']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; reload(); }));
    IN.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); reload(false); },
      add: () => IN.formModal({ title: IN.t('Add a book', 'Ongeza kitabu'), size: 'lg', body: bookForm(lk), submit: IN.t('Add book', 'Ongeza kitabu'),
        onOpen: (f) => IN.wirePhotoField(f, 'cover'),
        onSubmit: async (d, f) => { const r = await saveBook(d, f); IN.closeModal(); IN.toast(IN.t('Book added.', 'Kitabu kimeongezwa.')); IN.go(`book/${r.id}`); } }),
    });
    await load();
  };

  // ------------------------------------------------------------ One book (staff)
  IN.modules.book = async (el, [id]) => {
    const lk = await IN.lookups();
    const d = await IN.api.get(`/books/${id}`); const b = d.book; const manage = IN.can('books.manage');
    IN.setTitle(b.title, b.author);
    const copyActions = (c) => manage && !['borrowed'].includes(c.status) ? `<button class="in-btn ghost sm" data-act="copyMenu" data-id="${c.id}" data-st="${c.status}" aria-label="${IN.t('Change status', 'Badilisha hali')}"><i class="fa-solid fa-ellipsis"></i></button>` : '';
    el.innerHTML = `${IN.pageHead(b.title, `${b.author}${b.pub_year ? ' · ' + b.pub_year : ''}`, `<a class="in-btn ghost" href="#books"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Back', 'Rudi')}</a>
      ${IN.can('loans.manage') && b.available ? `<a class="in-btn primary" href="#loans?issue=${b.id}"><i class="fa-solid fa-hand-holding"></i> ${IN.t('Issue', 'Kopesha')}</a>` : ''}
      ${manage ? `<button class="in-btn ghost" data-act="edit"><i class="fa-solid fa-pen"></i> ${IN.t('Edit', 'Hariri')}</button><button class="in-btn ghost" data-act="archive">${b.archived ? IN.t('Restore', 'Rejesha') : IN.t('Archive', 'Hifadhi kumbukumbu')}</button><button class="in-btn danger-ghost" data-act="del"><i class="fa-solid fa-trash"></i></button>` : ''}`)}
      <div class="in-grid split" style="grid-template-columns:minmax(0,1fr) minmax(0,1.3fr)">
        <div class="in-card"><div class="in-book-hero">${coverHtml(b)}<div>${statusChip(b)}${b.archived ? ' ' + IN.chip('archived') : ''}
          <dl class="in-kv" style="margin-top:.7rem"><dt>ISBN</dt><dd>${esc(b.isbn || '—')}</dd><dt>${IN.t('Category', 'Jamii')}</dt><dd>${esc(b.category || '—')}</dd><dt>${IN.t('Publisher', 'Mchapishaji')}</dt><dd>${esc(b.publisher || '—')}</dd><dt>${IN.t('Shelf', 'Rafu')}</dt><dd>${esc(b.shelf || '—')}</dd><dt>${IN.t('Class no.', 'Namba ya darasa')}</dt><dd>${esc(b.classification_no || '—')}</dd><dt>${IN.t('Price', 'Bei')}</dt><dd>${b.price != null ? IN.money(b.price) : '—'}</dd><dt>${IN.t('Reservations', 'Uhifadhi')}</dt><dd>${d.reservations}</dd></dl></div></div>
          ${b.description ? `<p style="margin-top:.8rem">${esc(b.description)}</p>` : ''}${b.notes ? `<p class="in-small in-muted">${esc(b.notes)}</p>` : ''}</div>
        <div class="in-card"><div class="in-card-head"><h3>${IN.t('Copies', 'Nakala')} (${d.copy_list.length})</h3>${manage ? `<div class="in-actions"><button class="in-btn ghost sm" data-act="addCopies"><i class="fa-solid fa-plus"></i> ${IN.t('Add copies', 'Ongeza nakala')}</button></div>` : ''}</div>
          ${IN.table([{ label: IN.t('Accession no.', 'Namba ya nakala'), key: 'accession_no' }, { label: IN.t('Status', 'Hali'), render: (c) => IN.chip(c.status) }, { label: IN.t('Due', 'Rudisha'), render: (c) => c.due_date ? IN.date(c.due_date) : '—' }, { label: '', cls: 'in-right', render: copyActions }], d.copy_list, { empty: IN.empty('fa-copy', IN.t('No copies', 'Hakuna nakala'), '') })}</div></div>
      <div class="in-card" style="margin-top:1.1rem"><div class="in-card-head"><h3>${IN.t('Borrowing history', 'Historia ya kukopa')}</h3></div>
        ${IN.table([{ label: IN.t('Borrower', 'Aliyekopa'), render: (h) => esc(h.borrower_name || '—') }, { label: IN.t('Copy', 'Nakala'), key: 'accession_no' }, { label: IN.t('Issued', 'Alikopa'), render: (h) => IN.date(h.issued_on) }, { label: IN.t('Due', 'Rudisha'), render: (h) => IN.date(h.due_date) }, { label: IN.t('Returned', 'Alirudisha'), render: (h) => h.returned_on ? IN.date(h.returned_on) : '—' }, { label: IN.t('Status', 'Hali'), render: (h) => IN.chip(h.status) }], d.history,
          { empty: IN.empty('fa-clock-rotate-left', IN.t('Never borrowed', 'Haijawahi kukopwa'), IN.t('Loans of this book will be listed here.', 'Mikopo ya kitabu hiki itaorodheshwa hapa.')) })}</div>`;
    IN.delegate(el, {
      edit: () => IN.formModal({ title: IN.t('Edit book', 'Hariri kitabu'), size: 'lg', body: bookForm(lk, b, false), onOpen: (f) => IN.wirePhotoField(f, 'cover'),
        onSubmit: async (data, f) => { await saveBook(data, f, b.id); IN.closeModal(); IN.toast(IN.t('Book updated.', 'Kitabu kimesasishwa.')); IN.route(); } }),
      archive: async () => { await IN.api.post(`/books/${b.id}/archive`, { archived: !b.archived }); IN.toast(b.archived ? IN.t('Book restored.', 'Kitabu kimerejeshwa.') : IN.t('Book archived.', 'Kitabu kimehifadhiwa kumbukumbu.')); IN.route(); },
      del: async () => { if (!(await IN.confirm({ title: IN.t('Delete this book?', 'Futa kitabu hiki?'), message: IN.t('It will be removed from the catalogue. Past loans stay in the records. Archive it instead if you may need it again.', 'Kitaondolewa kwenye katalogi. Mikopo ya zamani inabaki kwenye rekodi. Kihifadhi kumbukumbu badala yake ukiweza kukihitaji tena.'), confirmText: IN.t('Delete', 'Futa') }))) return; await IN.api.del(`/books/${b.id}`); IN.toast(IN.t('Book deleted.', 'Kitabu kimefutwa.')); IN.go('books'); },
      addCopies: () => IN.formModal({ title: IN.t('Add copies', 'Ongeza nakala'), body: IN.f.input('count', IN.t('How many copies?', 'Nakala ngapi?'), { type: 'number', value: 1, required: true, attr: { min: 1, max: 200 } }) + `<p class="in-small in-muted">${IN.t('Accession numbers are created automatically.', 'Namba za nakala hutengenezwa kiotomatiki.')}</p>`,
        onSubmit: async (d) => { const r = await IN.api.post(`/books/${b.id}/copies`, { count: Number(d.count) }); IN.closeModal(); IN.toast(IN.t(`${r.accession_nos.length} copies added.`, `Nakala ${r.accession_nos.length} zimeongezwa.`)); IN.route(); } }),
      copyMenu: (btn) => {
        const cid = btn.dataset.id; const cur = btn.dataset.st; const set = (status) => async () => { await IN.api.put(`/copies/${cid}`, { status }); IN.toast(IN.t('Copy updated.', 'Nakala imesasishwa.')); IN.route(); };
        IN.popMenu(btn, [['available', 'fa-circle-check', IN.t('Mark available', 'Weka inapatikana')], ['damaged', 'fa-heart-crack', IN.t('Mark damaged', 'Weka imeharibika')], ['lost', 'fa-circle-question', IN.t('Mark lost', 'Weka imepotea')], ['archived', 'fa-box-archive', IN.t('Withdraw (archive)', 'Ondoa (hifadhi)')]].filter((x) => x[0] !== cur).map(([s, i, l]) => ({ label: l, icon: i, fn: set(s) })));
      },
    });
  };

  // ------------------------------------------------------------ Categories
  IN.modules.categories = async (el) => {
    const { categories } = await IN.api.get('/categories'); const manage = IN.can('books.manage');
    el.innerHTML = `${IN.pageHead(IN.t('Book categories', 'Jamii za vitabu'), IN.t('Group books so they are easy to find.', 'Kundi vitabu ili vipatikane kwa urahisi.'), `<a class="in-btn ghost" href="#books"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Back', 'Rudi')}</a>${manage ? `<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add category', 'Ongeza jamii')}</button>` : ''}`)}
      <div class="in-card">${IN.table([{ label: IN.t('Category', 'Jamii'), render: (c) => `<b>${esc(c.name)}</b>` }, { label: IN.t('Books', 'Vitabu'), key: 'books' }, { label: '', cls: 'in-right', render: (c) => manage ? `<button class="in-btn ghost sm" data-act="edit" data-id="${c.id}" data-n="${esc(c.name)}">${IN.t('Rename', 'Badilisha jina')}</button> <button class="in-btn danger-ghost sm" data-act="del" data-id="${c.id}" data-n="${esc(c.name)}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button>` : '' }], categories, { empty: IN.empty('fa-tags', IN.t('No categories', 'Hakuna jamii'), '') })}</div>`;
    const form = (title, name, id) => IN.formModal({ title, body: IN.f.input('name', IN.t('Category name', 'Jina la jamii'), { required: true, value: name, attr: { maxlength: 60 } }), onSubmit: async (d) => { id ? await IN.api.put(`/categories/${id}`, d) : await IN.api.post('/categories', d); await IN.refreshLookups(); IN.closeModal(); IN.route(); } });
    IN.delegate(el, {
      add: () => form(IN.t('Add category', 'Ongeza jamii'), '', null), edit: (b) => form(IN.t('Rename category', 'Badilisha jina la jamii'), b.dataset.n, b.dataset.id),
      del: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete category?', 'Futa jamii?'), message: IN.t(`Books in "${esc(b.dataset.n)}" will become uncategorised.`, `Vitabu vilivyo kwenye "${esc(b.dataset.n)}" havitakuwa na jamii.`) }))) return; await IN.api.del(`/categories/${b.dataset.id}`); await IN.refreshLookups(); IN.route(); },
    });
  };
})();
