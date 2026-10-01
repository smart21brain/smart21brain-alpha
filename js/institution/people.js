/* Students, staff, and "My profile". */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;

  function studentForm(lk, s = {}) {
    return `${IN.f.section('fa-user', IN.t('Personal details', 'Taarifa binafsi'))}
      <div class="cols">${IN.f.input('full_name', IN.t('Full name', 'Jina kamili'), { required: true, value: s.full_name })}${IN.f.select('gender', IN.t('Gender', 'Jinsia'), IN.opts.gender, { value: s.gender })}</div>
      <div class="cols-3 cols">${IN.f.input('student_no', IN.t('Student ID', 'Namba ya mwanafunzi'), { value: s.student_no, hint: IN.t('Leave empty to create automatically', 'Acha wazi kuunda kiotomatiki') })}${IN.f.input('reg_no', IN.t('Registration no.', 'Namba ya usajili'), { value: s.reg_no })}${IN.f.input('dob', IN.t('Date of birth', 'Tarehe ya kuzaliwa'), { type: 'date', value: s.dob })}</div>
      <div class="cols">${IN.f.input('phone', IN.t('Phone', 'Simu'), { type: 'tel', value: s.phone })}${IN.f.input('email', 'Email', { type: 'email', value: s.email })}</div>
      ${IN.f.input('address', IN.t('Address', 'Anwani'), { value: s.address })}
      ${IN.f.section('fa-graduation-cap', IN.t('Studies', 'Masomo'))}
      <div class="cols">${IN.f.select('programme_id', IN.t('Programme', 'Programu'), IN.opts.list(lk.programmes), { value: s.programme_id })}${IN.f.select('department_id', IN.t('Department', 'Idara'), IN.opts.list(lk.departments), { value: s.department_id })}</div>
      <div class="cols-3 cols">${IN.f.input('class_name', IN.t('Class', 'Darasa'), { value: s.class_name })}${IN.f.input('level', IN.t('Year / level', 'Mwaka / ngazi'), { value: s.level })}${IN.f.select('status', IN.t('Status', 'Hali'), IN.opts.studentStatus, { value: s.status || 'active', noBlank: true })}</div>
      <div class="cols">${IN.f.input('admission_date', IN.t('Admission date', 'Tarehe ya kujiunga'), { type: 'date', value: s.admission_date })}${IN.f.input('admission_info', IN.t('Admission info', 'Taarifa za udahili'), { value: s.admission_info })}</div>
      ${IN.f.section('fa-people-roof', IN.t('Guardian / emergency contact', 'Mlezi / mawasiliano ya dharura'))}
      <div class="cols-3 cols">${IN.f.input('guardian_name', IN.t('Name', 'Jina'), { value: s.guardian_name })}${IN.f.input('guardian_phone', IN.t('Phone', 'Simu'), { type: 'tel', value: s.guardian_phone })}${IN.f.input('guardian_relation', IN.t('Relationship', 'Uhusiano'), { value: s.guardian_relation })}</div>
      ${IN.f.textarea('notes', IN.t('Notes', 'Maelezo'), { value: s.notes, rows: 2 })}
      ${IN.f.section('fa-camera', IN.t('Photo (optional)', 'Picha (si lazima)'))}${IN.photoField('photo', s.has_photo ? IN.photoUrl('student', s.id) : '')}`;
  }
  const saveStudent = async (d, f, id) => {
    const p = { ...d }; delete p.photo; const r = id ? await IN.api.put(`/students/${id}`, p) : await IN.api.post('/students', p);
    try { await IN.uploadPhoto(`/students/${id || r.id}/photo`, f); } catch (e) { IN.toast(IN.t('Saved, but the photo could not be uploaded: ', 'Imehifadhiwa, lakini picha haikupakiwa: ') + e.message, 'warn'); }
    return { ...r, id: id || r.id };
  };

  IN.modules.students = async (el, parts) => {
    const lk = await IN.lookups(); const manage = IN.can('students.manage'); const hq = IN.hashQuery();
    const st = { q: '', programme_id: '', department_id: '', status: '', sort: 'name', page: 1 };
    el.innerHTML = `${IN.pageHead(IN.t('Students', 'Wanafunzi'), IN.t('Every student record in one place.', 'Rekodi za wanafunzi wote mahali pamoja.'), manage ? `${IN.can('import.manage') ? `<a class="in-btn ghost" href="#import?type=students"><i class="fa-solid fa-file-import"></i> ${IN.t('Import', 'Leta')}</a>` : ''}<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add student', 'Ongeza mwanafunzi')}</button>` : '')}
      <div class="in-card"><div class="in-toolbar"><input class="in-input" id="sQ" type="search" placeholder="${IN.t('Search name, ID, phone…', 'Tafuta jina, namba, simu…')}" style="flex:1;min-width:200px">
        <select class="in-select" id="sProg"><option value="">${IN.t('All programmes', 'Programu zote')}</option>${lk.programmes.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
        <select class="in-select" id="sDept"><option value="">${IN.t('All departments', 'Idara zote')}</option>${lk.departments.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select>
        <select class="in-select" id="sSt"><option value="">${IN.t('Any status', 'Hali yoyote')}</option>${IN.opts.studentStatus.map((s) => `<option value="${s[0]}">${s[1]}</option>`).join('')}</select></div><div id="sOut"></div></div>`;
    const out = el.querySelector('#sOut');
    const load = async () => {
      const r = await IN.api.get('/students' + IN.qs({ ...st, limit: 20 }));
      out.innerHTML = r.students.length ? IN.table([
        { label: IN.t('Student', 'Mwanafunzi'), render: (s) => `<a href="#student/${s.id}" class="in-row" style="gap:.6rem;color:inherit">${IN.avatar('student', s.id, s.full_name, s.has_photo)}<span><b>${esc(s.full_name)}</b><div class="in-small in-muted">${esc(s.student_no)}</div></span></a>` },
        { label: IN.t('Programme', 'Programu'), render: (s) => esc(s.programme || '—') }, { label: IN.t('Class', 'Darasa'), render: (s) => esc(s.class_name || '—') },
        { label: IN.t('Phone', 'Simu'), render: (s) => esc(s.phone || '—') }, { label: IN.t('Status', 'Hali'), render: (s) => IN.chip(s.status) },
        { label: '', cls: 'in-right', render: (s) => `<a class="in-btn ghost sm" href="#student/${s.id}">${IN.t('Open', 'Fungua')}</a>` },
      ], r.students) + IN.pager(r.page, r.limit, r.total) : IN.empty('fa-user-graduate', IN.t('No students found', 'Hakuna wanafunzi'), st.q ? IN.t('Try a different name or ID.', 'Jaribu jina au namba nyingine.') : IN.t('Add a student, or import a list from a spreadsheet.', 'Ongeza mwanafunzi, au leta orodha kutoka kwenye lahajedwali.'), manage ? `<button class="in-btn primary" data-act="add">${IN.t('Add student', 'Ongeza mwanafunzi')}</button>` : '');
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#sQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    [['#sProg', 'programme_id'], ['#sDept', 'department_id'], ['#sSt', 'status']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; reload(); }));
    IN.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); reload(false); },
      add: () => IN.formModal({ title: IN.t('Add a student', 'Ongeza mwanafunzi'), size: 'lg', body: studentForm(lk), onOpen: (f) => IN.wirePhotoField(f), onSubmit: async (d, f) => { const r = await saveStudent(d, f); IN.closeModal(); IN.toast(IN.t(`Student saved (${r.student_no}).`, `Mwanafunzi amehifadhiwa (${r.student_no}).`)); IN.go(`student/${r.id}`); } }),
    });
    await load();
    if (hq.get('open')) IN.go(`student/${hq.get('open')}`);
  };

  // `#students?open=ID` links from global search
  IN.modules.student = async (el, [id]) => {
    const lk = await IN.lookups(); const manage = IN.can('students.manage');
    const d = await IN.api.get(`/students/${id}`); const s = d.student; const sum = d.summary;
    IN.setTitle(s.full_name, s.student_no);
    let res = null; if (IN.can('academics.view')) { try { res = await IN.api.get(`/students/${id}/results`); } catch (e) { res = null; } }
    let loans = []; if (IN.can('loans.view')) { try { loans = (await IN.api.get('/loans' + IN.qs({ filter: 'all', borrower_type: 'student', borrower_id: id, limit: 10 }))).loans; } catch (e) { loans = []; } }
    el.innerHTML = `${IN.pageHead(s.full_name, `${s.student_no}${s.reg_no ? ' · ' + s.reg_no : ''}`, `<a class="in-btn ghost" href="#students"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Back', 'Rudi')}</a>${IN.can('users.manage') ? `<button class="in-btn ghost" data-act="login"><i class="fa-solid fa-key"></i> ${IN.t('Create login', 'Tengeneza akaunti')}</button>` : ''}${manage ? `<button class="in-btn ghost" data-act="edit"><i class="fa-solid fa-pen"></i> ${IN.t('Edit', 'Hariri')}</button><button class="in-btn danger-ghost" data-act="del"><i class="fa-solid fa-trash"></i></button>` : ''}`)}
      <div class="in-grid cols-3" style="margin-bottom:1.1rem">${IN.stat('fa-book', sum.loans_active, IN.t('Books on loan', 'Vitabu alivyokopa'), IN.t(`${sum.loans_total} borrowed in total`, `${sum.loans_total} jumla`))}${IN.stat('fa-coins', IN.moneyHtml(sum.fines_unpaid), IN.t('Unpaid fines', 'Faini'), '', sum.fines_unpaid ? 'amber' : 'green')}${IN.stat('fa-graduation-cap', sum.gpa == null ? '—' : sum.gpa, 'GPA', sum.avg_marks == null ? IN.t('No results yet', 'Hakuna matokeo') : IN.t(`Average mark ${sum.avg_marks}`, `Wastani ${sum.avg_marks}`))}</div>
      <div class="in-grid cols-2"><div class="in-card"><div class="in-row" style="gap:1rem;margin-bottom:.8rem">${IN.avatar('student', s.id, s.full_name, s.has_photo, 'lg')}<div>${IN.chip(s.status)}<div class="in-muted in-small" style="margin-top:.3rem">${esc(s.programme || '')}${s.department ? ' · ' + esc(s.department) : ''}</div></div></div>
        <dl class="in-kv"><dt>${IN.t('Gender', 'Jinsia')}</dt><dd>${esc(IN.cap(s.gender) || '—')}</dd><dt>${IN.t('Date of birth', 'Kuzaliwa')}</dt><dd>${s.dob ? IN.date(s.dob) : '—'}</dd><dt>${IN.t('Phone', 'Simu')}</dt><dd>${esc(s.phone || '—')}</dd><dt>Email</dt><dd>${esc(s.email || '—')}</dd><dt>${IN.t('Address', 'Anwani')}</dt><dd>${esc(s.address || '—')}</dd>
        <dt>${IN.t('Class / level', 'Darasa / ngazi')}</dt><dd>${esc(s.class_name || '—')}${s.level ? ' · ' + esc(s.level) : ''}</dd><dt>${IN.t('Admitted', 'Alijiunga')}</dt><dd>${s.admission_date ? IN.date(s.admission_date) : '—'}</dd>
        <dt>${IN.t('Guardian', 'Mlezi')}</dt><dd>${esc(s.guardian_name || '—')}${s.guardian_relation ? ` (${esc(s.guardian_relation)})` : ''}${s.guardian_phone ? ' · ' + esc(s.guardian_phone) : ''}</dd></dl>${s.notes ? `<p class="in-small in-muted">${esc(s.notes)}</p>` : ''}</div>
        <div class="in-card"><div class="in-card-head"><h3>${IN.t('Academic record', 'Rekodi ya masomo')}</h3></div>${res && res.terms.length ? res.terms.map((t) => `<div style="margin-bottom:.8rem"><div class="in-spread"><b>${esc(t.term)}</b><span class="in-small in-muted">${IN.t('Average', 'Wastani')} ${t.average} · GPA ${t.gpa}</span></div>${IN.table([{ label: IN.t('Course', 'Kozi'), render: (r) => `${esc(r.code)} · ${esc(r.course)}` }, { label: IN.t('Marks', 'Alama'), cls: 'in-center', key: 'marks' }, { label: IN.t('Grade', 'Daraja'), cls: 'in-center', render: (r) => `<span class="in-grade">${esc(r.grade)}</span>` }], t.rows)}</div>`).join('') : IN.empty('fa-square-poll-vertical', IN.t('No results yet', 'Hakuna matokeo'), IN.t('Marks appear here once teachers enter them.', 'Alama zitaonekana hapa walimu wakiziingiza.'))}</div></div>
      ${IN.can('loans.view') ? `<div class="in-card" style="margin-top:1.1rem"><div class="in-card-head"><h3>${IN.t('Library history', 'Historia ya maktaba')}</h3></div>${IN.table([{ label: IN.t('Book', 'Kitabu'), render: (l) => esc(l.title) }, { label: IN.t('Issued', 'Alikopa'), render: (l) => IN.date(l.issued_on) }, { label: IN.t('Due', 'Rudisha'), render: (l) => IN.date(l.due_date) }, { label: IN.t('Status', 'Hali'), render: (l) => l.overdue ? IN.chip('overdue') : IN.chip(l.status) }], loans, { empty: IN.empty('fa-book', IN.t('No loans', 'Hakuna mikopo'), '') })}</div>` : ''}`;
    IN.delegate(el, {
      edit: () => IN.formModal({ title: IN.t('Edit student', 'Hariri mwanafunzi'), size: 'lg', body: studentForm(lk, s), onOpen: (f) => IN.wirePhotoField(f), onSubmit: async (data, f) => { await saveStudent(data, f, s.id); IN.state.photoV = Date.now(); IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); IN.route(); } }),
      del: async () => { if (!(await IN.confirm({ title: IN.t('Delete this student?', 'Futa mwanafunzi huyu?'), message: IN.t('The record is removed from lists and their login is switched off. Results and loan history are kept.', 'Rekodi inaondolewa kwenye orodha na akaunti yake inazimwa. Matokeo na historia ya mikopo vinabaki.'), confirmText: IN.t('Delete', 'Futa') }))) return; await IN.api.del(`/students/${s.id}`); IN.toast(IN.t('Student deleted.', 'Mwanafunzi amefutwa.')); IN.go('students'); },
      login: () => IN.formModal({ title: IN.t('Create a login for this student', 'Tengeneza akaunti ya mwanafunzi huyu'), submit: IN.t('Create login', 'Tengeneza'), body: `${IN.f.input('email', 'Email', { type: 'email', required: true, value: s.email })}${IN.f.input('password', IN.t('Temporary password', 'Nenosiri la muda'), { required: true, attr: { minlength: 8 }, hint: IN.t('At least 8 characters. Ask the student to keep it private.', 'Angalau herufi 8.') })}`,
        onSubmit: async (d) => { await IN.api.post('/users', { name: s.full_name, email: d.email, password: d.password, role: 'student', student_id: s.id }); IN.closeModal(); IN.toast(IN.t('Login created.', 'Akaunti imetengenezwa.')); } }),
    });
  };

  // ------------------------------------------------------------ Staff
  IN.modules.staff = async (el) => {
    const lk = await IN.lookups(); const manage = IN.can('staff.manage'); const st = { q: '', department_id: '', status: '', page: 1 };
    const form = (s = {}) => `<div class="cols">${IN.f.input('full_name', IN.t('Full name', 'Jina kamili'), { required: true, value: s.full_name })}${IN.f.select('gender', IN.t('Gender', 'Jinsia'), IN.opts.gender, { value: s.gender })}</div>
      <div class="cols">${IN.f.input('staff_no', IN.t('Staff number', 'Namba ya mfanyakazi'), { value: s.staff_no, hint: IN.t('Leave empty to create automatically', 'Acha wazi kuunda kiotomatiki') })}${IN.f.input('position', IN.t('Position', 'Cheo'), { value: s.position })}</div>
      <div class="cols">${IN.f.input('phone', IN.t('Phone', 'Simu'), { type: 'tel', value: s.phone })}${IN.f.input('email', 'Email', { type: 'email', value: s.email })}</div>
      <div class="cols-3 cols">${IN.f.select('department_id', IN.t('Department', 'Idara'), IN.opts.list(lk.departments), { value: s.department_id })}${IN.f.input('hired_on', IN.t('Hired on', 'Ameajiriwa'), { type: 'date', value: s.hired_on })}${IN.f.select('status', IN.t('Status', 'Hali'), IN.opts.staffStatus, { value: s.status || 'active', noBlank: true })}</div>${IN.f.textarea('notes', IN.t('Notes', 'Maelezo'), { value: s.notes, rows: 2 })}`;
    el.innerHTML = `${IN.pageHead(IN.t('Staff', 'Wafanyakazi'), IN.t('Teachers, librarians and other staff.', 'Walimu, wasimamizi wa maktaba na wafanyakazi wengine.'), manage ? `${IN.can('import.manage') ? `<a class="in-btn ghost" href="#import?type=staff"><i class="fa-solid fa-file-import"></i> ${IN.t('Import', 'Leta')}</a>` : ''}<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add staff', 'Ongeza mfanyakazi')}</button>` : '')}
      <div class="in-card"><div class="in-toolbar"><input class="in-input" id="fQ" type="search" placeholder="${IN.t('Search name, number, position…', 'Tafuta jina, namba, cheo…')}" style="flex:1;min-width:200px"><select class="in-select" id="fDept"><option value="">${IN.t('All departments', 'Idara zote')}</option>${lk.departments.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div id="fOut"></div></div>`;
    const out = el.querySelector('#fOut'); let rows = [];
    const load = async () => {
      const r = await IN.api.get('/staff' + IN.qs({ ...st, limit: 20 })); rows = r.staff;
      out.innerHTML = rows.length ? IN.table([{ label: IN.t('Name', 'Jina'), render: (s) => `<b>${esc(s.full_name)}</b><div class="in-small in-muted">${esc(s.staff_no)}</div>` }, { label: IN.t('Position', 'Cheo'), render: (s) => esc(s.position || '—') }, { label: IN.t('Department', 'Idara'), render: (s) => esc(s.department || '—') }, { label: IN.t('Phone', 'Simu'), render: (s) => esc(s.phone || '—') }, { label: IN.t('Status', 'Hali'), render: (s) => IN.chip(s.status) },
        { label: '', cls: 'in-right', render: (s) => manage ? `<button class="in-btn ghost sm" data-act="edit" data-id="${s.id}">${IN.t('Edit', 'Hariri')}</button> <button class="in-btn danger-ghost sm" data-act="del" data-id="${s.id}"><i class="fa-solid fa-trash"></i></button>` : '' }], rows) + IN.pager(r.page, r.limit, r.total)
        : IN.empty('fa-chalkboard-user', IN.t('No staff found', 'Hakuna wafanyakazi'), IN.t('Add staff so they can be assigned courses and given logins.', 'Ongeza wafanyakazi ili wapewe kozi na akaunti.'), manage ? `<button class="in-btn primary" data-act="add">${IN.t('Add staff', 'Ongeza mfanyakazi')}</button>` : '');
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#fQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    el.querySelector('#fDept').addEventListener('change', (e) => { st.department_id = e.target.value; reload(); });
    IN.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); reload(false); },
      add: () => IN.formModal({ title: IN.t('Add staff', 'Ongeza mfanyakazi'), size: 'lg', body: form(), onSubmit: async (d) => { await IN.api.post('/staff', d); IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); reload(false); } }),
      edit: async (b) => { const s = (await IN.api.get(`/staff/${b.dataset.id}`)).staff; IN.formModal({ title: IN.t('Edit staff', 'Hariri mfanyakazi'), size: 'lg', body: form(s), onSubmit: async (d) => { await IN.api.put(`/staff/${s.id}`, d); IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); reload(false); } }); },
      del: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this staff record?', 'Futa rekodi hii?'), message: IN.t('Their login is switched off and teaching assignments are removed.', 'Akaunti yake inazimwa na kozi alizopewa zinaondolewa.'), confirmText: IN.t('Delete', 'Futa') }))) return; await IN.api.del(`/staff/${b.dataset.id}`); IN.toast(IN.t('Deleted.', 'Imefutwa.')); reload(false); },
    });
    await load();
    const o = IN.hashQuery().get('open'); if (o) { const s = (await IN.api.get(`/staff/${o}`)).staff; el.querySelector('#fQ').value = s.full_name; st.q = s.full_name; reload(); }
  };

  // ------------------------------------------------------------ My profile
  IN.modules.myProfile = async (el) => {
    const d = await IN.api.get('/me');
    if (!d.linked) { el.innerHTML = `<div class="in-card">${IN.empty('fa-link-slash', IN.t('No record linked', 'Hakuna rekodi iliyounganishwa'), IN.t('Ask the administration to link your login to your student record.', 'Mwombe msimamizi aunganishe akaunti yako na rekodi yako.'))}</div>`; return; }
    const p = d.profile; const s = d.summary;
    el.innerHTML = `${IN.pageHead(IN.t('My profile', 'Wasifu wangu'), IN.t('Your details as the institution has them.', 'Taarifa zako jinsi taasisi inavyozihifadhi.'))}
      <div class="in-grid cols-2"><div class="in-card"><div class="in-row" style="gap:1rem;margin-bottom:.8rem">${IN.avatar('student', p.id, p.full_name, p.has_photo, 'lg')}<div><h3>${esc(p.full_name)}</h3>${IN.chip(p.status)}</div></div>
        <dl class="in-kv"><dt>${IN.t('Student ID', 'Namba')}</dt><dd>${esc(p.student_no)}</dd><dt>${IN.t('Registration no.', 'Namba ya usajili')}</dt><dd>${esc(p.reg_no || '—')}</dd><dt>${IN.t('Programme', 'Programu')}</dt><dd>${esc(p.programme || '—')}</dd><dt>${IN.t('Department', 'Idara')}</dt><dd>${esc(p.department || '—')}</dd><dt>${IN.t('Class / level', 'Darasa / ngazi')}</dt><dd>${esc(p.class_name || '—')}${p.level ? ' · ' + esc(p.level) : ''}</dd><dt>${IN.t('Phone', 'Simu')}</dt><dd>${esc(p.phone || '—')}</dd><dt>Email</dt><dd>${esc(p.email || '—')}</dd></dl>
        <p class="in-small in-muted">${IN.t('To correct any detail, please ask the administration office.', 'Kusahihisha taarifa yoyote, tafadhali wasiliana na ofisi ya utawala.')}</p></div>
        <div class="in-stack">${s ? `${IN.stat('fa-book', s.loans_active, IN.t('Books I have', 'Vitabu nilivyonavyo'))}${IN.stat('fa-graduation-cap', s.gpa == null ? '—' : s.gpa, 'GPA')}${s.fines_unpaid ? IN.stat('fa-coins', IN.moneyHtml(s.fines_unpaid), IN.t('Unpaid fines', 'Faini'), '', 'amber') : ''}` : ''}</div></div>`;
  };
})();
