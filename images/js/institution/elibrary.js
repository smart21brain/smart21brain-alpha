/* E-Library — secure digital resources. Files are never linked directly:
   "Read" and "Download" call an authorised endpoint every time. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;
  const TYPES = [['ebook', IN.t('E-book', 'Kitabu pepe')], ['document', IN.t('Document', 'Hati')], ['journal', IN.t('Journal', 'Jarida')], ['notes', IN.t('Notes', 'Maelezo')], ['research', IN.t('Research', 'Utafiti')], ['publication', IN.t('Institutional publication', 'Chapisho la taasisi')], ['other', IN.t('Other', 'Nyingine')]];
  const LEVELS = [['members', IN.t('Members (signed-in users)', 'Wanachama (waliojiunga)')], ['staff', IN.t('Staff only', 'Wafanyakazi tu')], ['public', IN.t('Public (anyone, no sign-in)', 'Umma (yeyote, bila kujiunga)')]];
  const fileUrl = (id, mode) => `/api/institution/resources/${id}/file?mode=${mode}&institution_id=${IN.state.inst.id}`;


  // ---- reading progress (continue where I stopped) ----
  const viewUrl = (id, page) => fileUrl(id, 'view') + (page > 1 ? '#page=' + page : '');
  const pctOf = (p) => (p && p.total_pages ? Math.min(100, Math.round((p.last_page / p.total_pages) * 100)) : null);
  const progLine = (p) => {
    if (!p) return '';
    const pct = pctOf(p);
    const txt = p.status === 'finished' ? IN.t('Finished', 'Umemaliza') : p.total_pages ? IN.t(`Page ${p.last_page} of ${p.total_pages}`, `Ukurasa ${p.last_page} kati ya ${p.total_pages}`) : IN.t(`Stopped at page ${p.last_page}`, `Uliishia ukurasa ${p.last_page}`);
    return `<div class="in-small in-muted" style="margin-top:.2rem">${p.status === 'finished' ? '<i class="fa-solid fa-circle-check"></i> ' : '<i class="fa-solid fa-bookmark"></i> '}${txt}</div>${pct != null ? IN.progress(p.status === 'finished' ? 100 : pct) : ''}`;
  };
  const trackOpen = (id) => IN.api.post(`/me/reading/${id}`, { open: true }).catch(() => {});
  function trackModal(resId, title, cur, after) {
    cur = cur || {};
    IN.formModal({
      title: IN.t('My reading progress', 'Maendeleo ya usomaji wangu'),
      body: `<p class="in-muted" style="margin-top:0"><b>${esc(title)}</b></p>
        <div class="cols">${IN.f.input('page', IN.t('Page I am on', 'Ukurasa ninaosoma'), { type: 'number', value: cur.last_page || 1, required: true, attr: { min: 1, max: 100000 } })}${IN.f.input('total_pages', IN.t('Total pages (optional)', 'Kurasa zote (si lazima)'), { type: 'number', value: cur.total_pages || '', attr: { min: 1, max: 100000 } })}</div>
        ${IN.f.check('finished', IN.t('I have finished this book', 'Nimemaliza kitabu hiki'), cur.status === 'finished')}`,
      onSubmit: async (d) => {
        const q = await IN.api.queued('POST', `/me/reading/${resId}`, { page: Number(d.page), total_pages: d.total_pages ? Number(d.total_pages) : null, status: d.finished ? 'finished' : 'reading' }, IN.t(`Reading progress: ${title}`, `Maendeleo ya kusoma: ${title}`));
        IN.closeModal(); if (!q.queued) IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); if (after) after();
      },
    });
  }
  IN.readLink = (id, page) => viewUrl(id, page);
  IN.trackOpen = trackOpen;

  function resForm(lk, r = {}, creating = true) {
    return `${IN.f.input('title', IN.t('Title', 'Kichwa'), { required: true, value: r.title })}
      <div class="cols">${IN.f.input('author', IN.t('Author', 'Mwandishi'), { value: r.author })}${IN.f.select('res_type', IN.t('Type', 'Aina'), TYPES, { value: r.res_type || 'document', noBlank: true })}</div>
      <div class="cols">${IN.f.select('category_id', IN.t('Category', 'Jamii'), IN.opts.list(lk.resource_categories), { value: r.category_id })}${IN.f.input('subject', IN.t('Subject', 'Somo'), { value: r.subject })}</div>
      ${IN.f.textarea('description', IN.t('Description', 'Maelezo'), { value: r.description, rows: 3 })}
      ${IN.f.section('fa-lock', IN.t('Who can open it', 'Nani anaweza kuifungua'))}
      ${IN.f.select('access_level', IN.t('Access level', 'Kiwango cha ufikiaji'), LEVELS, { value: r.access_level || 'members', noBlank: true })}
      <div class="in-row" style="gap:1.4rem;flex-wrap:wrap">${IN.f.check('allow_view', IN.t('Allow reading online', 'Ruhusu kusoma mtandaoni'), r.allow_view !== 0)}${IN.f.check('allow_download', IN.t('Allow download', 'Ruhusu kupakua'), r.allow_download !== 0)}</div>
      ${IN.f.section('fa-file-arrow-up', creating ? IN.t('File', 'Faili') : IN.t('Replace file (optional)', 'Badilisha faili (si lazima)'))}
      <div class="in-field" data-field="file"><input class="in-input" type="file" name="file" id="f_file" ${creating ? 'required data-label="' + IN.t('a file', 'faili') + '"' : ''} accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.epub,.txt,.png,.jpg,.jpeg"><span class="hint">${IN.t('PDF, Word, Excel, PowerPoint, EPUB, TXT, PNG or JPG — up to', 'PDF, Word, Excel, PowerPoint, EPUB, TXT, PNG au JPG — hadi')} ${(IN.state.settings && IN.state.settings.max_upload_mb) || 20} MB.</span><span class="err"></span></div>
      <div class="in-field"><label for="f_thumbnail">${IN.t('Thumbnail (optional)', 'Picha ndogo (si lazima)')}</label><input class="in-input" type="file" name="thumbnail" id="f_thumbnail" accept="image/png,image/jpeg,image/webp"></div>`;
  }
  async function submitRes(d, form, id) {
    const fd = new FormData();
    ['title', 'author', 'res_type', 'category_id', 'subject', 'description', 'access_level'].forEach((k) => fd.append(k, d[k] || ''));
    fd.append('allow_view', d.allow_view ? '1' : '0'); fd.append('allow_download', d.allow_download ? '1' : '0');
    const f = form.querySelector('[name=file]').files[0]; if (f) fd.append('file', f);
    const t = form.querySelector('[name=thumbnail]').files[0]; if (t) fd.append('thumbnail', await IN.resizeImage(t, 480));
    return id ? IN.api.upload(`/resources/${id}`, fd) : IN.api.upload('/resources', fd);
  }

  IN.modules.elibrary = async (el) => {
    const lk = await IN.lookups(); const manage = IN.can('resources.manage');
    const st = { q: '', category_id: '', type: '', sort: 'recent', page: 1 };
    el.innerHTML = `${IN.pageHead(IN.t('E-Library', 'Maktaba Mtandao'), IN.t('Digital books, notes, journals and publications.', 'Vitabu pepe, maelezo, majarida na machapisho.'), manage ? `<button class="in-btn ghost" data-act="cats"><i class="fa-solid fa-tags"></i> ${IN.t('Categories', 'Jamii')}</button><button class="in-btn primary" data-act="add"><i class="fa-solid fa-upload"></i> ${IN.t('Upload', 'Pakia')}</button>` : '')}
      <div class="in-card" style="margin-bottom:1rem"><div class="in-toolbar"><input class="in-input" id="eQ" type="search" placeholder="${IN.t('Search title, author, subject…', 'Tafuta kichwa, mwandishi, somo…')}" style="flex:1;min-width:200px">
        <select class="in-select" id="eCat"><option value="">${IN.t('All categories', 'Jamii zote')}</option>${lk.resource_categories.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select>
        <select class="in-select" id="eType"><option value="">${IN.t('All types', 'Aina zote')}</option>${TYPES.map((t) => `<option value="${t[0]}">${t[1]}</option>`).join('')}</select>
        <select class="in-select" id="eSort"><option value="recent">${IN.t('Newest', 'Mpya')}</option><option value="title">${IN.t('Title A–Z', 'Kichwa A–Z')}</option><option value="popular">${IN.t('Most used', 'Zinazotumika zaidi')}</option></select></div></div><div id="eOut"></div>`;
    const out = el.querySelector('#eOut'); let items = []; const prog = {};
    try { (await IN.api.get('/me/reading')).items.forEach((x) => { prog[x.resource_id] = x; }); } catch (e) { /* reading list is optional */ }
    const card = (r) => `<div class="in-res"><div class="thumb"><i class="fa-solid ${IN.fileIcon(r.file_name)}"></i>${r.has_thumb ? `<img src="/api/institution/resources/${r.id}/thumb?institution_id=${IN.state.inst.id}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
      <h4>${esc(r.title)}</h4><div class="in-small in-muted">${esc(r.author || '')}${r.author && r.category ? ' · ' : ''}${esc(r.category || '')}</div>
      <div class="in-row" style="gap:.35rem;flex-wrap:wrap">${IN.chip(r.access_level)}<span class="in-small in-muted">${IN.bytes(r.file_size)}</span>${manage ? `<span class="in-small in-muted"><i class="fa-solid fa-eye"></i> ${r.views} <i class="fa-solid fa-download"></i> ${r.downloads}</span>` : ''}</div>
      ${r.description ? `<div class="in-small in-muted" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(r.description)}</div>` : ''}
      ${progLine(prog[r.id])}
      <div class="in-row" style="margin-top:auto;gap:.4rem;flex-wrap:wrap">${r.allow_view || manage ? `<a class="in-btn primary sm" target="_blank" rel="noopener" data-read="${r.id}" href="${viewUrl(r.id, (prog[r.id] || {}).last_page)}"><i class="fa-solid fa-book-open"></i> ${prog[r.id] && prog[r.id].status !== 'finished' && prog[r.id].last_page > 1 ? IN.t('Continue', 'Endelea') : IN.t('Read', 'Soma')}</a><button class="in-btn ghost sm" data-act="track" data-id="${r.id}" title="${IN.t('Save the page I am on', 'Hifadhi ukurasa ninaosoma')}" aria-label="${IN.t('Save the page I am on', 'Hifadhi ukurasa ninaosoma')}"><i class="fa-solid fa-bookmark"></i></button>` : ''}${r.allow_download || manage ? `<a class="in-btn ghost sm" href="${fileUrl(r.id, 'download')}"><i class="fa-solid fa-download"></i></a>` : ''}
      ${manage ? `<button class="in-btn ghost sm" data-act="edit" data-id="${r.id}" aria-label="${IN.t('Edit', 'Hariri')}"><i class="fa-solid fa-pen"></i></button><button class="in-btn danger-ghost sm" data-act="del" data-id="${r.id}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button>` : ''}</div></div>`;
    const load = async () => {
      const r = await IN.api.get('/resources' + IN.qs({ ...st, limit: 12 })); items = r.resources;
      out.innerHTML = items.length ? `<div class="in-books" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${items.map(card).join('')}</div>${IN.pager(r.page, r.limit, r.total)}`
        : `<div class="in-card">${IN.empty('fa-laptop-file', IN.t('No resources found', 'Hakuna rasilimali'), st.q ? IN.t('Try different words.', 'Jaribu maneno mengine.') : IN.t('Nothing has been uploaded yet.', 'Hakuna kilichopakiwa bado.'), manage ? `<button class="in-btn primary" data-act="add">${IN.t('Upload the first one', 'Pakia ya kwanza')}</button>` : '')}</div>`;
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#eQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    [['#eCat', 'category_id'], ['#eType', 'type'], ['#eSort', 'sort']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; reload(); }));
    el.addEventListener('click', (e) => { const a = e.target.closest('[data-read]'); if (a) trackOpen(a.dataset.read).then((x) => { if (x && x.progress) { prog[x.progress.resource_id] = { ...(prog[x.progress.resource_id] || {}), ...x.progress }; } }); });
    IN.delegate(el, {
      track: (b) => { const r = items.find((x) => x.id === Number(b.dataset.id)); if (r) trackModal(r.id, r.title, prog[r.id], async () => { const x = await IN.api.get('/me/reading'); x.items.forEach((y) => { prog[y.resource_id] = y; }); reload(false); }); },
      page: (b) => { st.page = Number(b.dataset.p); reload(false); },
      add: () => { const m = IN.formModal({ title: IN.t('Upload a resource', 'Pakia rasilimali'), size: 'lg', body: resForm(lk), submit: IN.t('Upload', 'Pakia'), onSubmit: async (d, f) => { await submitRes(d, f); IN.closeModal(); IN.toast(IN.t('Uploaded.', 'Imepakiwa.')); IN.route(); } }); },
      edit: (b) => { const r = items.find((x) => x.id === Number(b.dataset.id)); IN.formModal({ title: IN.t('Edit resource', 'Hariri rasilimali'), size: 'lg', body: resForm(lk, r, false), onSubmit: async (d, f) => { await submitRes(d, f, r.id); IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); reload(false); } }); },
      del: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this resource?', 'Futa rasilimali hii?'), message: IN.t('The file is permanently removed from storage.', 'Faili inaondolewa kabisa kwenye hifadhi.'), confirmText: IN.t('Delete', 'Futa') }))) return; await IN.api.del(`/resources/${b.dataset.id}`); IN.toast(IN.t('Deleted.', 'Imefutwa.')); reload(false); },
      cats: async () => {
        const { categories } = await IN.api.get('/resource-categories');
        const body = () => `<div class="in-list">${categories.map((c) => `<div class="in-spread"><span><b>${esc(c.name)}</b> <span class="in-muted in-small">(${c.items})</span></span><span><button class="in-btn ghost sm" data-ren="${c.id}" data-n="${esc(c.name)}">${IN.t('Rename', 'Badilisha')}</button> <button class="in-btn danger-ghost sm" data-rm="${c.id}"><i class="fa-solid fa-trash"></i></button></span></div>`).join('')}</div><form id="addCat" class="in-row" style="margin-top:1rem"><input class="in-input" name="name" placeholder="${IN.t('New category', 'Jamii mpya')}" required style="flex:1"><button class="in-btn primary" type="submit">${IN.t('Add', 'Ongeza')}</button></form>`;
        const m = IN.modal(IN.t('Resource categories', 'Jamii za rasilimali'), body());
        m.addEventListener('submit', async (e) => { e.preventDefault(); try { await IN.api.post('/resource-categories', { name: e.target.name.value }); await IN.refreshLookups(); IN.closeModal(); IN.route(); } catch (err) { IN.fail(err); } });
        m.addEventListener('click', async (e) => {
          const rn = e.target.closest('[data-ren]'); const rm = e.target.closest('[data-rm]');
          try {
            if (rn) { const n = prompt(IN.t('New name', 'Jina jipya'), rn.dataset.n); if (n) { await IN.api.put(`/resource-categories/${rn.dataset.ren}`, { name: n }); await IN.refreshLookups(); IN.closeModal(); IN.route(); } }
            if (rm) { await IN.api.del(`/resource-categories/${rm.dataset.rm}`); await IN.refreshLookups(); IN.closeModal(); IN.route(); }
          } catch (err) { IN.fail(err); }
        });
      },
    });
    await load();
  };

  // ------------------------------------------------------------ My reading (continue where I stopped)
  IN.modules.myReading = async (el) => {
    const { items } = await IN.api.get('/me/reading');
    const reading = items.filter((x) => x.status !== 'finished'); const done = items.filter((x) => x.status === 'finished');
    const card = (x) => `<div class="in-res"><div class="thumb"><i class="fa-solid ${IN.fileIcon(x.file_name)}"></i>${x.has_thumb ? `<img src="/api/institution/resources/${x.resource_id}/thumb?institution_id=${IN.state.inst.id}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
      <h4>${esc(x.title)}</h4><div class="in-small in-muted">${esc(x.author || '')}</div>${progLine(x)}
      <div class="in-small in-muted">${IN.t('Last opened', 'Ulifunguliwa mwisho')}: ${IN.date(x.last_opened_at)}</div>
      <div class="in-row" style="margin-top:auto;gap:.4rem;flex-wrap:wrap">${x.allow_view || IN.can('resources.manage') ? `<a class="in-btn primary sm" target="_blank" rel="noopener" data-read="${x.resource_id}" href="${viewUrl(x.resource_id, x.last_page)}"><i class="fa-solid fa-book-open"></i> ${x.status !== 'finished' && x.last_page > 1 ? IN.t('Continue', 'Endelea') : IN.t('Read', 'Soma')}</a>` : ''}
        <button class="in-btn ghost sm" data-act="track" data-id="${x.resource_id}"><i class="fa-solid fa-bookmark"></i> ${IN.t('Update page', 'Badilisha ukurasa')}</button>
        <button class="in-btn danger-ghost sm" data-act="rm" data-id="${x.resource_id}" aria-label="${IN.t('Remove from my list', 'Ondoa kwenye orodha yangu')}"><i class="fa-solid fa-xmark"></i></button></div></div>`;
    const grid = (list) => `<div class="in-books" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${list.map(card).join('')}</div>`;
    el.innerHTML = `${IN.pageHead(IN.t('My reading', 'Kusoma kwangu'), IN.t('Pick up each book exactly where you stopped.', 'Endelea na kila kitabu pale ulipoishia.'), `<a class="in-btn primary" href="#elibrary"><i class="fa-solid fa-laptop-file"></i> ${IN.t('Find a book to read', 'Tafuta kitabu cha kusoma')}</a>`)}
      ${items.length ? `${reading.length ? `<h3 style="margin:.2rem 0 .6rem">${IN.t('Currently reading', 'Ninaosoma sasa')}</h3>${grid(reading)}` : ''}${done.length ? `<h3 style="margin:1.4rem 0 .6rem">${IN.t('Finished', 'Nilizomaliza')}</h3>${grid(done)}` : ''}`
        : `<div class="in-card">${IN.empty('fa-book-open-reader', IN.t('Nothing here yet', 'Hakuna bado'), IN.t('Open a book in the E-Library and it will appear here. Use the bookmark button to save the page you are on.', 'Fungua kitabu kwenye Maktaba Mtandao nacho kitaonekana hapa. Tumia kitufe cha alama kuhifadhi ukurasa ulioufikia.'))}</div>`}`;
    el.addEventListener('click', (e) => { const a = e.target.closest('[data-read]'); if (a) trackOpen(a.dataset.read); });
    IN.delegate(el, {
      track: (b) => { const x = items.find((y) => y.resource_id === Number(b.dataset.id)); if (x) trackModal(x.resource_id, x.title, x, () => IN.route()); },
      rm: async (b) => { if (!(await IN.confirm({ title: IN.t('Remove from my list?', 'Ondoa kwenye orodha yangu?'), message: IN.t('Only your reading progress is removed. The book stays in the E-Library.', 'Maendeleo yako ya kusoma tu ndiyo yanaondolewa. Kitabu kinabaki kwenye Maktaba Mtandao.'), confirmText: IN.t('Remove', 'Ondoa') }))) return; await IN.api.del(`/me/reading/${b.dataset.id}`); IN.route(); },
    });
  };
})();
