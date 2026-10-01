/* E-Library — secure digital resources. Files are never linked directly:
   "Read" and "Download" call an authorised endpoint every time. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;
  const TYPES = [['ebook', IN.t('E-book', 'Kitabu pepe')], ['document', IN.t('Document', 'Hati')], ['journal', IN.t('Journal', 'Jarida')], ['notes', IN.t('Notes', 'Maelezo')], ['research', IN.t('Research', 'Utafiti')], ['publication', IN.t('Institutional publication', 'Chapisho la taasisi')], ['other', IN.t('Other', 'Nyingine')]];
  const LEVELS = [['members', IN.t('Members (signed-in users)', 'Wanachama (waliojiunga)')], ['staff', IN.t('Staff only', 'Wafanyakazi tu')], ['public', IN.t('Public (anyone, no sign-in)', 'Umma (yeyote, bila kujiunga)')]];
  const fileUrl = (id, mode) => `/api/institution/resources/${id}/file?mode=${mode}&institution_id=${IN.state.inst.id}`;

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
    const out = el.querySelector('#eOut'); let items = [];
    const card = (r) => `<div class="in-res"><div class="thumb"><i class="fa-solid ${IN.fileIcon(r.file_name)}"></i>${r.has_thumb ? `<img src="/api/institution/resources/${r.id}/thumb?institution_id=${IN.state.inst.id}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>
      <h4>${esc(r.title)}</h4><div class="in-small in-muted">${esc(r.author || '')}${r.author && r.category ? ' · ' : ''}${esc(r.category || '')}</div>
      <div class="in-row" style="gap:.35rem;flex-wrap:wrap">${IN.chip(r.access_level)}<span class="in-small in-muted">${IN.bytes(r.file_size)}</span>${manage ? `<span class="in-small in-muted"><i class="fa-solid fa-eye"></i> ${r.views} <i class="fa-solid fa-download"></i> ${r.downloads}</span>` : ''}</div>
      ${r.description ? `<div class="in-small in-muted" style="overflow:hidden;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical">${esc(r.description)}</div>` : ''}
      <div class="in-row" style="margin-top:auto;gap:.4rem;flex-wrap:wrap">${r.allow_view || manage ? `<a class="in-btn primary sm" target="_blank" rel="noopener" href="${fileUrl(r.id, 'view')}"><i class="fa-solid fa-book-open"></i> ${IN.t('Read', 'Soma')}</a>` : ''}${r.allow_download || manage ? `<a class="in-btn ghost sm" href="${fileUrl(r.id, 'download')}"><i class="fa-solid fa-download"></i></a>` : ''}
      ${manage ? `<button class="in-btn ghost sm" data-act="edit" data-id="${r.id}" aria-label="${IN.t('Edit', 'Hariri')}"><i class="fa-solid fa-pen"></i></button><button class="in-btn danger-ghost sm" data-act="del" data-id="${r.id}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button>` : ''}</div></div>`;
    const load = async () => {
      const r = await IN.api.get('/resources' + IN.qs({ ...st, limit: 12 })); items = r.resources;
      out.innerHTML = items.length ? `<div class="in-books" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${items.map(card).join('')}</div>${IN.pager(r.page, r.limit, r.total)}`
        : `<div class="in-card">${IN.empty('fa-laptop-file', IN.t('No resources found', 'Hakuna rasilimali'), st.q ? IN.t('Try different words.', 'Jaribu maneno mengine.') : IN.t('Nothing has been uploaded yet.', 'Hakuna kilichopakiwa bado.'), manage ? `<button class="in-btn primary" data-act="add">${IN.t('Upload the first one', 'Pakia ya kwanza')}</button>` : '')}</div>`;
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#eQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    [['#eCat', 'category_id'], ['#eType', 'type'], ['#eSort', 'sort']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; reload(); }));
    IN.delegate(el, {
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
})();
