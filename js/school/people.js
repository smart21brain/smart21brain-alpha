/* Teachers and parents / guardians. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const EMP = () => [['full_time', SC.t('Full-time', 'Muda Kamili')], ['part_time', SC.t('Part-time', 'Muda Mfupi')], ['contract', SC.t('Contract', 'Mkataba')], ['on_leave', SC.t('On leave', 'Likizo')], ['resigned', SC.t('Resigned', 'Amejiuzulu')]];
  const empChip = (v) => SC.chip(v === 'resigned' ? 'inactive' : v === 'on_leave' ? 'warn' : 'active', (EMP().find((x) => x[0] === v) || [0, v])[1]);

  // =============================================================== teachers
  function teacherModal(t, done) {
    const isEdit = !!t;
    SC.formModal({
      title: isEdit ? SC.t('Edit teacher', 'Hariri Mwalimu') : SC.t('Add teacher', 'Ongeza Mwalimu'), size: 'wide', submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Add teacher', 'Ongeza Mwalimu'),
      body: `<div class="cols">${SC.f.input('full_name', SC.t('Full name', 'Jina Kamili'), { required: true, value: t ? t.full_name : '', placeholder: SC.t('e.g. Mr. John Mushi', 'mfano: Bw. John Mushi') })}${SC.f.select('gender', SC.t('Gender', 'Jinsia'), SC.opts.gender, { value: t ? t.gender || '' : '' })}</div>
        <div class="cols">${SC.f.input('phone', SC.t('Phone number', 'Namba ya Simu'), { type: 'tel', value: t ? t.phone || '' : '', placeholder: '+255 …' })}${SC.f.input('email', SC.t('Email', 'Barua pepe'), { type: 'email', value: t ? t.email || '' : '' })}</div>
        <div class="cols">${SC.f.input('address', SC.t('Address', 'Anwani'), { value: t ? t.address || '' : '' })}${SC.f.select('employment_status', SC.t('Employment status', 'Hali ya Ajira'), EMP(), { value: t ? t.employment_status : 'full_time', noBlank: true })}</div>
        <div class="sc-field"><label>${SC.t('Photo', 'Picha')}</label>${SC.photoField('photo', t && t.has_photo ? SC.photoUrl('teachers', t.id) : '')}</div>
        ${isEdit ? '' : `<div class="sc-card flat" style="background:var(--sc-primary-50)">${SC.f.check('create_login', SC.t('<b>Give this teacher a login</b> so they can take attendance and enter marks', '<b>Mpe mwalimu huyu akaunti</b> ili aweze kuchukua mahudhurio na kuingiza alama'))}
          <div id="loginBox" class="sc-hide" style="margin-top:.8rem">${SC.f.input('password', SC.t('Temporary password', 'Nenosiri la Muda'), { type: 'text', placeholder: SC.t('At least 8 characters', 'Angalau herufi 8'), hint: SC.t('Share it with the teacher. If they already have a Smart21Brain account, leave this empty and they keep their own password. The email above is their username.', 'Mshirikishe mwalimu. Ikiwa tayari ana akaunti ya Smart21Brain, acha hii wazi na atabaki na nenosiri lake mwenyewe. Barua pepe iliyo hapo juu ni jina lake la mtumiaji.') })}</div></div>`}`,
      onOpen: (form) => {
        SC.wirePhotoField(form);
        const cb = form.querySelector('[name=create_login]');
        if (cb) cb.addEventListener('change', () => form.querySelector('#loginBox').classList.toggle('sc-hide', !cb.checked));
      },
      onSubmit: async (f, form) => {
        if (f.create_login && !f.email) throw new Error(SC.t('An email address is needed to create a login for the teacher.', 'Barua pepe inahitajika kuunda akaunti ya mwalimu.'));
        const body = { full_name: f.full_name, gender: f.gender, phone: f.phone, email: f.email, address: f.address, employment_status: f.employment_status, create_login: !!f.create_login, password: f.password };
        const r = isEdit ? await SC.api.put(`/teachers/${t.id}`, body) : await SC.api.post('/teachers', body);
        try { await SC.uploadPhoto(`/teachers/${isEdit ? t.id : r.id}/photo`, form); } catch (e) { SC.toast(SC.t(`Saved, but the photo was not uploaded: ${e.message}`, `Imehifadhiwa, lakini picha haikupakiwa: ${e.message}`), 'warn'); }
        SC.closeModal(); await SC.refreshLookups(); SC.toast(isEdit ? SC.t('Teacher updated successfully.', 'Mwalimu amesasishwa kwa mafanikio.') : SC.t('Teacher added successfully.', 'Mwalimu ameongezwa kwa mafanikio.')); done(r);
      },
    });
  }

  SC.modules.teachers = async (el, args) => {
    const st = { q: '' };
    el.innerHTML = `${SC.pageHead(SC.t('Teachers', 'Walimu'), SC.t('Your teaching staff, their classes and subjects', 'Wafanyakazi wako wa ualimu, madarasa na masomo yao'), SC.can('teachers.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Add Teacher', 'Ongeza Mwalimu')}</button>` : '')}
      <div class="sc-card"><div class="sc-toolbar"><input class="sc-input grow" id="tQ" type="search" placeholder="${SC.t('Search by name, phone or email…', 'Tafuta kwa jina, simu au barua pepe…')}"></div><div id="tList">${SC.skeleton(5)}</div></div>`;
    const box = el.querySelector('#tList');
    async function load() {
      const { teachers } = await SC.api.get('/teachers' + SC.qs(st));
      box.innerHTML = SC.table([
        { label: SC.t('Teacher', 'Mwalimu'), render: (t) => `<a href="#teacher/${t.id}" class="sc-person">${SC.avatar('teachers', t.id, t.full_name, t.has_photo)}<span class="nm" style="color:var(--sc-text)">${esc(t.full_name)}</span></a>` },
        { label: SC.t('Contact', 'Mawasiliano'), render: (t) => `${esc(t.phone || '—')}<div class="sc-small sc-muted">${esc(t.email || '')}</div>` },
        { label: SC.t('Subjects', 'Masomo'), render: (t) => `<span class="sc-small sc-wrap">${esc(t.subjects ? t.subjects.split(',').slice(0, 3).join(', ') + (t.subjects.split(',').length > 3 ? '…' : '') : '—')}</span>` },
        { label: SC.t('Classes', 'Madarasa'), render: (t) => t.class_count },
        { label: SC.t('Status', 'Hali'), render: (t) => empChip(t.employment_status) },
        { label: SC.t('Login', 'Akaunti'), render: (t) => (t.user_id ? SC.chip('active', SC.t('Has login', 'Ana Akaunti')) : `<span class="sc-muted sc-small">${SC.t('No login', 'Hakuna Akaunti')}</span>`) },
        { label: '', cls: 'end', render: (t) => `<div class="sc-actions-cell"><a class="sc-btn ghost sm" href="#teacher/${t.id}"><i class="fa-solid fa-eye"></i></a>${SC.can('teachers.manage') ? `<button class="sc-btn ghost sm" data-act="edit" data-id="${t.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${t.id}" data-name="${esc(t.full_name)}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>` },
      ], teachers, { empty: SC.empty('fa-chalkboard-user', st.q ? SC.t('No teacher found', 'Hakuna mwalimu aliyepatikana') : SC.t('No teachers yet', 'Hakuna walimu bado'), st.q ? SC.t('Try a different name.', 'Jaribu jina tofauti.') : SC.t('Add your first teacher to assign classes and subjects.', 'Ongeza mwalimu wako wa kwanza kupanga madarasa na masomo.'), !st.q && SC.can('teachers.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Add Teacher', 'Ongeza Mwalimu')}</button>` : '') });
      box._data = teachers;
    }
    el.querySelector('#tQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); load().catch(SC.fail); }, 250));
    SC.delegate(el, {
      add: () => teacherModal(null, () => load()),
      edit: async (b) => { const { teacher } = await SC.api.get(`/teachers/${b.dataset.id}`); teacherModal(teacher, () => load()); },
      del: async (b) => {
        if (!(await SC.confirm({ title: SC.t('Delete this teacher?', 'Futa mwalimu huyu?'), message: SC.t(`<b>${esc(b.dataset.name)}</b> will be removed and their login switched off. Classes and subjects they taught will have no teacher until you assign a new one.`, `<b>${esc(b.dataset.name)}</b> ataondolewa na akaunti yake itazimwa. Madarasa na masomo aliyofundisha hayatakuwa na mwalimu hadi umpange mpya.`), confirmText: SC.t('Yes, delete teacher', 'Ndiyo, futa mwalimu') }))) return;
        await SC.api.del(`/teachers/${b.dataset.id}`); await SC.refreshLookups(); SC.toast(SC.t('Teacher deleted.', 'Mwalimu amefutwa.')); load();
      },
    });
    await load();
    if (args[0] === 'new' && SC.can('teachers.manage')) { history.replaceState(null, '', '#teachers'); SC.after(() => teacherModal(null, () => load())); }
  };

  SC.modules.teacher = async (el, args) => {
    const d = await SC.api.get(`/teachers/${args[0]}`); const t = d.teacher;
    SC.setTitle(t.full_name, SC.t('Teacher profile', 'Wasifu wa Mwalimu'));
    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread"><div class="sc-row" style="gap:1.2rem">${SC.avatar('teachers', t.id, t.full_name, t.has_photo, 'lg')}<div><h2 style="font-size:1.4rem">${esc(t.full_name)}</h2><div class="sc-row" style="margin:.4rem 0">${empChip(t.employment_status)}${t.has_login ? SC.chip('active', SC.t('Has login', 'Ana Akaunti')) : SC.chip('inactive', SC.t('No login', 'Hakuna Akaunti'))}</div><div class="sc-muted sc-small">${esc([t.phone, t.email].filter(Boolean).join(' · ') || SC.t('No contact details', 'Hakuna taarifa za mawasiliano'))}</div></div></div>
      <div class="sc-row"><a class="sc-btn ghost sm" href="#teachers"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>${SC.can('teachers.manage') ? `${t.has_login ? '' : `<button class="sc-btn soft sm" data-act="login"><i class="fa-solid fa-key"></i> ${SC.t('Give login', 'Mpe Akaunti')}</button>`}<button class="sc-btn primary sm" data-act="edit"><i class="fa-solid fa-pen"></i> ${SC.t('Edit', 'Hariri')}</button>` : ''}</div></div></div>
      <div class="sc-grid stats" style="margin-bottom:1.1rem">${SC.stat('fa-school', new Set([...d.classes.map((c) => c.id), ...d.subjects.map((x) => x.class_id)]).size, SC.t('Assigned classes', 'Madarasa Aliyopangwa'))}${SC.stat('fa-book-open', new Set(d.subjects.map((x) => x.subject)).size, SC.t('Assigned subjects', 'Masomo Aliyopangwa'), '', 'blue')}${SC.stat('fa-clipboard-user', d.attendance.sessions || 0, SC.t('Attendance sessions taken', 'Vipindi vya Mahudhurio Alivyochukua'), d.attendance.last_date ? SC.t('Last: ', 'Mwisho: ') + SC.date(d.attendance.last_date) : SC.t('None yet', 'Bado hakuna'), 'green')}${SC.stat('fa-file-pen', d.exams.results_entered || 0, SC.t('Marks entered', 'Alama Alizoingiza'), SC.t(`${d.exams.exams_created || 0} examinations created`, `Mitihani ${d.exams.exams_created || 0} imeundwa`), 'amber')}</div>
      <div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Class teacher of', 'Mwalimu wa Darasa la')}</h3></div>${SC.table([{ label: SC.t('Class', 'Darasa'), render: (c) => `<b>${esc(SC.classLabel(c))}</b>` }, { label: SC.t('Year', 'Mwaka'), render: (c) => esc(c.year_name) }], d.classes, { empty: SC.empty('fa-school', SC.t('Not a class teacher', 'Si mwalimu wa darasa'), SC.t('Assign a class teacher in Classes.', 'Panga mwalimu wa darasa kwenye Madarasa.')) })}</div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Subjects taught', 'Masomo Anayofundisha')}</h3></div>${SC.table([{ label: SC.t('Subject', 'Somo'), render: (x) => `<b>${esc(x.subject)}</b>` }, { label: SC.t('Class', 'Darasa'), render: (x) => esc(SC.classLabel({ name: x.class_name, stream: x.stream })) }], d.subjects, { empty: SC.empty('fa-book-open', SC.t('No subjects assigned', 'Hakuna masomo yaliyopangwa'), SC.t('Assign this teacher to subjects in Classes.', 'Mpange mwalimu huyu masomo kwenye Madarasa.')) })}</div></div>`;
    SC.delegate(el, {
      edit: () => teacherModal({ ...t, id: t.id }, () => SC.route()),
      login: () => SC.formModal({ title: SC.t(`Give ${t.full_name} a login`, `Mpe ${t.full_name} Akaunti`), submit: SC.t('Create login', 'Unda Akaunti'), body: `${SC.f.input('email', SC.t('Email (username)', 'Barua pepe (jina la mtumiaji)'), { type: 'email', required: true, value: t.email || '' })}${SC.f.input('password', SC.t('Temporary password', 'Nenosiri la Muda'), { placeholder: SC.t('At least 8 characters', 'Angalau herufi 8'), hint: SC.t('Leave empty only if they already have a Smart21Brain account.', 'Acha wazi tu ikiwa tayari ana akaunti ya Smart21Brain.') })}`,
        onSubmit: async (f) => { await SC.api.post(`/teachers/${t.id}/login`, f); SC.closeModal(); SC.toast(SC.t('Login created. Share the email and password with the teacher.', 'Akaunti imeundwa. Mshirikishe mwalimu barua pepe na nenosiri.')); SC.route(); } }),
    });
  };

  // =============================================================== parents
  function parentModal(p, done) {
    const isEdit = !!p;
    SC.formModal({
      title: isEdit ? SC.t('Edit parent / guardian', 'Hariri Mzazi / Mlezi') : SC.t('Register parent / guardian', 'Sajili Mzazi / Mlezi'), size: 'wide', submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Register parent', 'Sajili Mzazi'),
      body: `<div class="cols">${SC.f.input('full_name', SC.t('Full name', 'Jina Kamili'), { required: true, value: p ? p.full_name : '' })}${SC.f.input('occupation', SC.t('Occupation', 'Kazi'), { value: p ? p.occupation || '' : '' })}</div>
        <div class="cols">${SC.f.input('phone', SC.t('Phone number', 'Namba ya Simu'), { type: 'tel', required: true, value: p ? p.phone : '', placeholder: '+255 …' })}${SC.f.input('alt_phone', SC.t('Alternative phone', 'Simu Nyingine'), { type: 'tel', value: p ? p.alt_phone || '' : '' })}</div>
        <div class="cols">${SC.f.input('email', SC.t('Email', 'Barua pepe'), { type: 'email', value: p ? p.email || '' : '' })}${SC.f.input('address', SC.t('Address', 'Anwani'), { value: p ? p.address || '' : '' })}</div>
        ${isEdit ? '' : `<div class="sc-card flat" style="background:var(--sc-primary-50)">${SC.f.check('create_login', SC.t('<b>Give this parent portal access</b> to see attendance, fees and results', '<b>Mpe mzazi huyu ufikiaji wa akaunti</b> kuona mahudhurio, ada na matokeo'))}<div id="loginBox" class="sc-hide" style="margin-top:.8rem">${SC.f.input('password', SC.t('Temporary password', 'Nenosiri la Muda'), { placeholder: SC.t('At least 8 characters', 'Angalau herufi 8'), hint: SC.t('The email above is their username. Leave empty if they already have a Smart21Brain account.', 'Barua pepe iliyo hapo juu ni jina lake la mtumiaji. Acha wazi ikiwa tayari ana akaunti ya Smart21Brain.') })}</div></div>`}
        <p class="sc-small sc-muted" style="margin:0">${SC.t('Link this parent to their children by choosing them when you register or edit a student.', 'Unganisha mzazi huyu na watoto wake kwa kumchagua unaposajili au kuhariri mwanafunzi.')}</p>`,
      onOpen: (form) => { const cb = form.querySelector('[name=create_login]'); if (cb) cb.addEventListener('change', () => form.querySelector('#loginBox').classList.toggle('sc-hide', !cb.checked)); },
      onSubmit: async (f) => {
        if (f.create_login && !f.email) throw new Error(SC.t('An email address is needed to give portal access.', 'Barua pepe inahitajika kutoa ufikiaji wa akaunti.'));
        const body = { ...f, create_login: !!f.create_login };
        const r = isEdit ? await SC.api.put(`/parents/${p.id}`, body) : await SC.api.post('/parents', body);
        SC.closeModal(); SC.toast(isEdit ? SC.t('Parent updated successfully.', 'Mzazi amesasishwa kwa mafanikio.') : SC.t('Parent registered successfully.', 'Mzazi amesajiliwa kwa mafanikio.')); done(r);
      },
    });
  }

  SC.modules.parents = async (el, args) => {
    const st = { q: '', page: 1, limit: 20 };
    el.innerHTML = `${SC.pageHead(SC.t('Parents & Guardians', 'Wazazi na Walezi'), SC.t('Every parent and the children linked to them', 'Kila mzazi na watoto walioungwanishwa naye'), SC.can('parents.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Register Parent', 'Sajili Mzazi')}</button>` : '')}
      <div class="sc-card"><div class="sc-toolbar"><input class="sc-input grow" id="pQ" type="search" placeholder="${SC.t('Search by name, phone or email…', 'Tafuta kwa jina, simu au barua pepe…')}"></div><div id="pList">${SC.skeleton(5)}</div></div>`;
    const box = el.querySelector('#pList');
    async function load() {
      const d = await SC.api.get('/parents' + SC.qs(st));
      box.innerHTML = SC.table([
        { label: SC.t('Parent / guardian', 'Mzazi / Mlezi'), render: (p) => `<a href="#parent/${p.id}" class="sc-person"><span class="sc-avatar">${esc(SC.initials(p.full_name))}</span><span><span class="nm" style="color:var(--sc-text)">${esc(p.full_name)}</span><div class="sb sc-muted">${esc(p.occupation || '')}</div></span></a>` },
        { label: SC.t('Phone', 'Simu'), render: (p) => `${esc(p.phone)}<div class="sc-small sc-muted">${esc(p.alt_phone || '')}</div>` },
        { label: SC.t('Email', 'Barua pepe'), render: (p) => esc(p.email || '—') },
        { label: SC.t('Children', 'Watoto'), render: (p) => p.children_count ? `<b>${p.children_count}</b> <span class="sc-small sc-muted">${esc((p.children || '').slice(0, 60))}</span>` : `<span class="sc-muted">${SC.t('None', 'Hakuna')}</span>` },
        { label: SC.t('Portal', 'Akaunti'), render: (p) => (p.user_id ? SC.chip('active', SC.t('Has access', 'Ana Ufikiaji')) : `<span class="sc-muted sc-small">${SC.t('No access', 'Hakuna Ufikiaji')}</span>`) },
        { label: '', cls: 'end', render: (p) => `<div class="sc-actions-cell"><a class="sc-btn ghost sm" href="#parent/${p.id}"><i class="fa-solid fa-eye"></i></a>${SC.can('parents.manage') ? `<button class="sc-btn ghost sm" data-act="edit" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${p.id}" data-name="${esc(p.full_name)}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>` },
      ], d.parents, { empty: SC.empty('fa-people-roof', st.q ? SC.t('No parent found', 'Hakuna mzazi aliyepatikana') : SC.t('No parents yet', 'Hakuna wazazi bado'), st.q ? SC.t('Try a different name or phone number.', 'Jaribu jina au namba ya simu tofauti.') : SC.t('Parents are added automatically when you register a student, or you can add one here.', 'Wazazi wanaongezwa kiotomatiki unaposajili mwanafunzi, au unaweza kuongeza mmoja hapa.')) }) + SC.pager(d.page, d.limit, d.total);
      box._rows = d.parents;
    }
    el.querySelector('#pQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load().catch(SC.fail); }, 250));
    SC.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      add: () => parentModal(null, () => load()),
      edit: (b) => parentModal(box._rows.find((x) => String(x.id) === b.dataset.id), () => load()),
      del: async (b) => {
        if (!(await SC.confirm({ title: SC.t('Delete this parent?', 'Futa mzazi huyu?'), message: SC.t(`<b>${esc(b.dataset.name)}</b> will be removed. A parent who still has children linked cannot be deleted.`, `<b>${esc(b.dataset.name)}</b> ataondolewa. Mzazi mwenye watoto walioungwanishwa bado hawezi kufutwa.`), confirmText: SC.t('Yes, delete', 'Ndiyo, futa') }))) return;
        await SC.api.del(`/parents/${b.dataset.id}`); SC.toast(SC.t('Parent deleted.', 'Mzazi amefutwa.')); load();
      },
    });
    await load();
    if (args[0] === 'new' && SC.can('parents.manage')) { history.replaceState(null, '', '#parents'); SC.after(() => parentModal(null, () => load())); }
  };

  SC.modules.parent = async (el, args) => {
    const { parent: p, children } = await SC.api.get(`/parents/${args[0]}`);
    SC.setTitle(p.full_name, SC.t('Parent / guardian', 'Mzazi / Mlezi'));
    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread"><div class="sc-row" style="gap:1.2rem"><span class="sc-avatar lg">${esc(SC.initials(p.full_name))}</span><div><h2 style="font-size:1.4rem">${esc(p.full_name)}</h2><div class="sc-row" style="margin:.4rem 0">${p.user_id ? SC.chip('active', SC.t('Portal access', 'Ufikiaji wa Akaunti')) : SC.chip('inactive', SC.t('No portal access', 'Hakuna Ufikiaji wa Akaunti'))}</div><div class="sc-muted sc-small">${esc(p.occupation || '')}</div></div></div>
      <div class="sc-row"><a class="sc-btn ghost sm" href="#parents"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>${SC.can('parents.manage') ? `${p.user_id ? '' : `<button class="sc-btn soft sm" data-act="portal"><i class="fa-solid fa-key"></i> ${SC.t('Give portal access', 'Mpe Ufikiaji wa Akaunti')}</button>`}<button class="sc-btn primary sm" data-act="edit"><i class="fa-solid fa-pen"></i> ${SC.t('Edit', 'Hariri')}</button>` : ''}</div></div></div>
      <div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Contact details', 'Taarifa za Mawasiliano')}</h3></div><dl class="sc-kv"><dt>${SC.t('Phone', 'Simu')}</dt><dd><a href="tel:${esc(p.phone)}">${esc(p.phone)}</a></dd><dt>${SC.t('Alternative', 'Nyingine')}</dt><dd>${esc(p.alt_phone || '—')}</dd><dt>${SC.t('Email', 'Barua pepe')}</dt><dd>${esc(p.email || '—')}</dd><dt>${SC.t('Address', 'Anwani')}</dt><dd>${esc(p.address || '—')}</dd></dl></div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Children', 'Watoto')} (${children.length})</h3></div>${children.length ? `<div class="sc-list">${children.map((c) => `<a href="#student/${c.id}" class="sc-spread" style="color:var(--sc-text)"><div class="sc-person">${SC.avatar('students', c.id, c.full_name, false)}<div><div class="nm">${esc(c.full_name)}</div><div class="sb sc-muted">${esc(c.class_name || SC.t('No class', 'Hakuna darasa'))} · ${esc(c.relationship)}</div></div></div>${SC.chip(c.status)}</a>`).join('')}</div>` : SC.empty('fa-child', SC.t('No children linked', 'Hakuna watoto walioungwanishwa'), SC.t('Choose this parent when registering a student.', 'Chagua mzazi huyu unaposajili mwanafunzi.'))}</div></div>`;
    SC.delegate(el, {
      edit: () => parentModal(p, () => SC.route()),
      portal: () => SC.formModal({ title: SC.t(`Portal access for ${p.full_name}`, `Ufikiaji wa Akaunti kwa ${p.full_name}`), submit: SC.t('Give access', 'Toa Ufikiaji'), body: `${SC.f.input('email', SC.t('Email (username)', 'Barua pepe (jina la mtumiaji)'), { type: 'email', required: true, value: p.email || '' })}${SC.f.input('password', SC.t('Temporary password', 'Nenosiri la Muda'), { placeholder: SC.t('At least 8 characters', 'Angalau herufi 8'), hint: SC.t('Leave empty only if they already have a Smart21Brain account.', 'Acha wazi tu ikiwa tayari ana akaunti ya Smart21Brain.') })}`,
        onSubmit: async (f) => { await SC.api.post(`/parents/${p.id}/portal`, f); SC.closeModal(); SC.toast(SC.t('Portal access created. Share the email and password with the parent.', 'Ufikiaji wa akaunti umeundwa. Mshirikishe mzazi barua pepe na nenosiri.')); SC.route(); } }),
    });
  };
})();
