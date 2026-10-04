/* Academics — departments, programmes, years & terms, courses, enrolment, marks, results. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;
  const termLabel = (lk, t) => { const y = lk.academic_years.find((a) => a.id === t.academic_year_id); return `${y ? y.name + ' · ' : ''}${t.name}`; };
  const termOpts = (lk) => lk.terms.map((t) => ({ v: t.id, l: termLabel(lk, t) }));
  const curTerm = (lk) => (lk.terms.find((t) => t.is_current) || lk.terms[0] || {}).id || '';

  // ------------------------------------------------------------ Departments, programmes, years & terms
  IN.modules.structure = async (el) => {
    const manage = IN.can('academics.manage'); let tab = 'dept';
    const [{ departments }, { programmes }, ay] = await Promise.all([IN.api.get('/departments'), IN.api.get('/programmes'), IN.api.get('/academic-years')]);
    const lk = await IN.lookups();
    const draw = () => {
      const body = tab === 'dept' ? IN.table([{ label: IN.t('Department', 'Idara'), render: (d) => `<b>${esc(d.name)}</b>${d.code ? ` <span class="in-muted in-small">${esc(d.code)}</span>` : ''}` }, { label: IN.t('Head', 'Mkuu'), render: (d) => esc(d.head_name || '—') }, { label: IN.t('Students', 'Wanafunzi'), key: 'students' }, { label: IN.t('Staff', 'Wafanyakazi'), key: 'staff' },
        { label: '', cls: 'in-right', render: (d) => manage ? `<button class="in-btn ghost sm" data-act="editDept" data-id="${d.id}">${IN.t('Edit', 'Hariri')}</button> <button class="in-btn danger-ghost sm" data-act="delDept" data-id="${d.id}"><i class="fa-solid fa-trash"></i></button>` : '' }], departments, { empty: IN.empty('fa-sitemap', IN.t('No departments yet', 'Hakuna idara bado'), IN.t('Departments group your programmes and staff.', 'Idara hukusanya programu na wafanyakazi.')) })
        : tab === 'prog' ? IN.table([{ label: IN.t('Programme', 'Programu'), render: (p) => `<b>${esc(p.name)}</b>${p.code ? ` <span class="in-muted in-small">${esc(p.code)}</span>` : ''}` }, { label: IN.t('Department', 'Idara'), render: (p) => esc(p.department || '—') }, { label: IN.t('Level', 'Ngazi'), render: (p) => esc(p.level || '—') }, { label: IN.t('Years', 'Miaka'), render: (p) => p.duration_years || '—' }, { label: IN.t('Students', 'Wanafunzi'), key: 'students' },
          { label: '', cls: 'in-right', render: (p) => manage ? `<button class="in-btn ghost sm" data-act="editProg" data-id="${p.id}">${IN.t('Edit', 'Hariri')}</button> <button class="in-btn danger-ghost sm" data-act="delProg" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>` : '' }], programmes, { empty: IN.empty('fa-diagram-project', IN.t('No programmes yet', 'Hakuna programu bado'), '') })
        : `${ay.years.map((y) => `<div style="margin-bottom:1rem"><div class="in-spread"><h4>${esc(y.name)} ${y.is_current ? IN.chip('active', IN.t('Current', 'Wa sasa')) : ''}</h4>${manage ? `<span><button class="in-btn ghost sm" data-act="editYear" data-id="${y.id}">${IN.t('Edit', 'Hariri')}</button> <button class="in-btn ghost sm" data-act="addTerm" data-id="${y.id}"><i class="fa-solid fa-plus"></i> ${IN.t('Term', 'Muhula')}</button></span>` : ''}</div><div class="in-small in-muted">${y.start_date ? IN.date(y.start_date) : ''} ${y.end_date ? '→ ' + IN.date(y.end_date) : ''}</div>
          <div class="in-list">${ay.terms.filter((t) => t.academic_year_id === y.id).map((t) => `<div class="in-spread"><span>${esc(t.name)} ${t.is_current ? IN.chip('active', IN.t('Current', 'Wa sasa')) : ''} <span class="in-small in-muted">${t.start_date ? IN.date(t.start_date) : ''}${t.end_date ? ' → ' + IN.date(t.end_date) : ''}</span></span>${manage ? `<span><button class="in-btn ghost sm" data-act="editTerm" data-id="${t.id}">${IN.t('Edit', 'Hariri')}</button> <button class="in-btn danger-ghost sm" data-act="delTerm" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button></span>` : ''}</div>`).join('') || `<div class="in-small in-muted">${IN.t('No terms yet.', 'Hakuna mihula bado.')}</div>`}</div></div>`).join('')}`;
      el.querySelector('#stBody').innerHTML = body;
    };
    el.innerHTML = `${IN.pageHead(IN.t('Structure', 'Muundo'), IN.t('Departments, programmes, academic years and terms.', 'Idara, programu, miaka ya masomo na mihula.'), `<a class="in-btn ghost" href="#courses"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Courses', 'Kozi')}</a>${manage ? `<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add', 'Ongeza')}</button>` : ''}`)}
      <div class="in-card"><div class="in-tabs">${[['dept', IN.t('Departments', 'Idara')], ['prog', IN.t('Programmes', 'Programu')], ['year', IN.t('Years & terms', 'Miaka na mihula')]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${l}</button>`).join('')}</div><div id="stBody"></div></div>`;
    const refresh = async () => { IN.route(); };
    const deptForm = (d = {}) => IN.formModal({ title: d.id ? IN.t('Edit department', 'Hariri idara') : IN.t('Add department', 'Ongeza idara'), body: `${IN.f.input('name', IN.t('Name', 'Jina'), { required: true, value: d.name })}<div class="cols">${IN.f.input('code', IN.t('Code', 'Msimbo'), { value: d.code })}${IN.f.input('head_name', IN.t('Head of department', 'Mkuu wa idara'), { value: d.head_name })}</div>`, onSubmit: async (v) => { d.id ? await IN.api.put(`/departments/${d.id}`, v) : await IN.api.post('/departments', v); await IN.refreshLookups(); IN.closeModal(); refresh(); } });
    const progForm = (p = {}) => IN.formModal({ title: p.id ? IN.t('Edit programme', 'Hariri programu') : IN.t('Add programme', 'Ongeza programu'), body: `${IN.f.input('name', IN.t('Name', 'Jina'), { required: true, value: p.name })}<div class="cols">${IN.f.input('code', IN.t('Code', 'Msimbo'), { value: p.code })}${IN.f.select('department_id', IN.t('Department', 'Idara'), IN.opts.list(departments), { value: p.department_id })}</div><div class="cols">${IN.f.input('level', IN.t('Level', 'Ngazi'), { value: p.level, placeholder: 'Diploma / Degree / Form 1–4' })}${IN.f.input('duration_years', IN.t('Duration (years)', 'Muda (miaka)'), { type: 'number', value: p.duration_years, attr: { step: '0.5', min: 0.5 } })}</div>`, onSubmit: async (v) => { p.id ? await IN.api.put(`/programmes/${p.id}`, v) : await IN.api.post('/programmes', v); await IN.refreshLookups(); IN.closeModal(); refresh(); } });
    const yearForm = (y = {}) => IN.formModal({ title: y.id ? IN.t('Edit academic year', 'Hariri mwaka wa masomo') : IN.t('Add academic year', 'Ongeza mwaka wa masomo'), body: `${IN.f.input('name', IN.t('Name', 'Jina'), { required: true, value: y.name, placeholder: '2026/2027' })}<div class="cols">${IN.f.input('start_date', IN.t('Starts', 'Unaanza'), { type: 'date', value: y.start_date })}${IN.f.input('end_date', IN.t('Ends', 'Unaisha'), { type: 'date', value: y.end_date })}</div>${IN.f.check('is_current', IN.t('This is the current year', 'Huu ni mwaka wa sasa'), !!y.is_current)}`, onSubmit: async (v) => { y.id ? await IN.api.put(`/academic-years/${y.id}`, v) : await IN.api.post('/academic-years', v); await IN.refreshLookups(); IN.closeModal(); refresh(); } });
    const termForm = (t = {}, yearId) => IN.formModal({ title: t.id ? IN.t('Edit term', 'Hariri muhula') : IN.t('Add term', 'Ongeza muhula'), body: `${IN.f.input('name', IN.t('Name', 'Jina'), { required: true, value: t.name, placeholder: 'Semester 1' })}<div class="cols">${IN.f.input('start_date', IN.t('Starts', 'Unaanza'), { type: 'date', value: t.start_date })}${IN.f.input('end_date', IN.t('Ends', 'Unaisha'), { type: 'date', value: t.end_date })}</div>${IN.f.check('is_current', IN.t('This is the current term', 'Huu ni muhula wa sasa'), !!t.is_current)}`, onSubmit: async (v) => { const body = { ...v, academic_year_id: t.academic_year_id || yearId }; t.id ? await IN.api.put(`/terms/${t.id}`, body) : await IN.api.post('/terms', body); await IN.refreshLookups(); IN.closeModal(); refresh(); } });
    const del = (title, path) => async () => { if (!(await IN.confirm({ title, message: IN.t('This cannot be undone.', 'Hii haiwezi kutenduliwa.') }))) return; await IN.api.del(path); await IN.refreshLookups(); refresh(); };
    IN.delegate(el, {
      tab: (b) => { tab = b.dataset.k; el.querySelectorAll('[data-act=tab]').forEach((x) => x.classList.toggle('on', x === b)); draw(); },
      add: () => (tab === 'dept' ? deptForm() : tab === 'prog' ? progForm() : yearForm()),
      editDept: (b) => deptForm(departments.find((d) => d.id === Number(b.dataset.id))), delDept: (b) => del(IN.t('Delete this department?', 'Futa idara hii?'), `/departments/${b.dataset.id}`)(),
      editProg: (b) => progForm(programmes.find((p) => p.id === Number(b.dataset.id))), delProg: (b) => del(IN.t('Delete this programme?', 'Futa programu hii?'), `/programmes/${b.dataset.id}`)(),
      editYear: (b) => yearForm(ay.years.find((y) => y.id === Number(b.dataset.id))), addTerm: (b) => termForm({}, Number(b.dataset.id)),
      editTerm: (b) => termForm(ay.terms.find((t) => t.id === Number(b.dataset.id))), delTerm: (b) => del(IN.t('Delete this term?', 'Futa muhula huu?'), `/terms/${b.dataset.id}`)(),
    });
    draw();
  };

  // ------------------------------------------------------------ Courses (+ teachers)
  IN.modules.courses = async (el) => {
    const lk = await IN.lookups(); const manage = IN.can('academics.manage'); const st = { q: '', programme_id: '', page: 1 };
    el.innerHTML = `${IN.pageHead(IN.t('Courses & programmes', 'Kozi na programu'), IN.t('Courses or subjects, who teaches them, and who is enrolled.', 'Kozi au masomo, nani anayefundisha, na nani amesajiliwa.'), `<a class="in-btn ghost" href="#structure"><i class="fa-solid fa-sitemap"></i> ${IN.t('Departments & terms', 'Idara na mihula')}</a><a class="in-btn ghost" href="#enrol"><i class="fa-solid fa-user-plus"></i> ${IN.t('Enrolment', 'Usajili')}</a>${manage ? `<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add course', 'Ongeza kozi')}</button>` : ''}`)}
      <div class="in-card"><div class="in-toolbar"><input class="in-input" id="cQ" type="search" placeholder="${IN.t('Search code or name…', 'Tafuta msimbo au jina…')}" style="flex:1;min-width:200px"><select class="in-select" id="cProg"><option value="">${IN.t('All programmes', 'Programu zote')}</option>${lk.programmes.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select></div><div id="cOut"></div></div>`;
    const out = el.querySelector('#cOut'); let rows = [];
    const form = (c = {}) => `<div class="cols">${IN.f.input('code', IN.t('Course code', 'Msimbo wa kozi'), { required: true, value: c.code })}${IN.f.input('name', IN.t('Course / subject name', 'Jina la kozi / somo'), { required: true, value: c.name })}</div><div class="cols">${IN.f.select('programme_id', IN.t('Programme', 'Programu'), IN.opts.list(lk.programmes), { value: c.programme_id })}${IN.f.select('department_id', IN.t('Department', 'Idara'), IN.opts.list(lk.departments), { value: c.department_id })}</div><div class="cols">${IN.f.input('credits', IN.t('Credits', 'Vipimo (credits)'), { type: 'number', value: c.credits, attr: { min: 0, step: '0.5' } })}${IN.f.input('level', IN.t('Level / year', 'Ngazi / mwaka'), { value: c.level })}</div>`;
    const load = async () => {
      const r = await IN.api.get('/courses' + IN.qs({ ...st, limit: 30 })); rows = r.courses;
      out.innerHTML = rows.length ? IN.table([{ label: IN.t('Course', 'Kozi'), render: (c) => `<b>${esc(c.code)}</b> · ${esc(c.name)}` }, { label: IN.t('Programme', 'Programu'), render: (c) => esc(c.programme || '—') }, { label: IN.t('Credits', 'Credits'), render: (c) => c.credits ?? '—' }, { label: IN.t('Teachers', 'Walimu'), render: (c) => esc(c.teachers || '—') },
        { label: '', cls: 'in-right', render: (c) => manage ? `<button class="in-btn ghost sm" data-act="teachers" data-id="${c.id}"><i class="fa-solid fa-chalkboard-user"></i> ${IN.t('Teachers', 'Walimu')}</button> <button class="in-btn ghost sm" data-act="edit" data-id="${c.id}">${IN.t('Edit', 'Hariri')}</button> <button class="in-btn danger-ghost sm" data-act="del" data-id="${c.id}"><i class="fa-solid fa-trash"></i></button>` : '' }], rows) + IN.pager(r.page, r.limit, r.total)
        : IN.empty('fa-book-open-reader', IN.t('No courses yet', 'Hakuna kozi bado'), IN.t('Add the courses or subjects you teach.', 'Ongeza kozi au masomo mnayofundisha.'), manage ? `<button class="in-btn primary" data-act="add">${IN.t('Add course', 'Ongeza kozi')}</button>` : '');
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#cQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    el.querySelector('#cProg').addEventListener('change', (e) => { st.programme_id = e.target.value; reload(); });
    IN.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); reload(false); },
      add: () => IN.formModal({ title: IN.t('Add course', 'Ongeza kozi'), body: form(), onSubmit: async (d) => { await IN.api.post('/courses', d); IN.closeModal(); IN.toast(IN.t('Course saved.', 'Kozi imehifadhiwa.')); reload(false); } }),
      edit: (b) => { const c = rows.find((x) => x.id === Number(b.dataset.id)); IN.formModal({ title: IN.t('Edit course', 'Hariri kozi'), body: form(c), onSubmit: async (d) => { await IN.api.put(`/courses/${c.id}`, d); IN.closeModal(); reload(false); } }); },
      del: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this course?', 'Futa kozi hii?'), message: IN.t('Courses with enrolled students cannot be deleted.', 'Kozi zenye wanafunzi waliosajiliwa haziwezi kufutwa.') }))) return; await IN.api.del(`/courses/${b.dataset.id}`); reload(false); },
      teachers: async (b) => {
        const c = rows.find((x) => x.id === Number(b.dataset.id)); const { staff } = await IN.api.get('/staff' + IN.qs({ limit: 100, status: 'active' }));
        const draw = async () => { const { teaching } = await IN.api.get('/teaching' + IN.qs({ course_id: c.id })); return `<div class="in-list">${teaching.length ? teaching.map((t) => `<div class="in-spread"><span><b>${esc(t.teacher)}</b> <span class="in-small in-muted">${esc(t.term || IN.t('All terms', 'Mihula yote'))}</span></span><button class="in-btn danger-ghost sm" data-rm="${t.id}"><i class="fa-solid fa-xmark"></i></button></div>`).join('') : `<div class="in-muted in-small">${IN.t('No teacher assigned yet.', 'Hakuna mwalimu aliyepangiwa bado.')}</div>`}</div>`; };
        const m = IN.modal(`${c.code} — ${IN.t('Teachers', 'Walimu')}`, `<div id="tList">${await draw()}</div><form id="tAdd" class="in-row" style="margin-top:1rem;gap:.5rem;flex-wrap:wrap"><select class="in-select" name="staff_id" required style="flex:1;min-width:160px"><option value="">${IN.t('Choose teacher…', 'Chagua mwalimu…')}</option>${staff.map((s) => `<option value="${s.id}">${esc(s.full_name)}</option>`).join('')}</select><select class="in-select" name="term_id"><option value="">${IN.t('All terms', 'Mihula yote')}</option>${termOpts(lk).map((t) => `<option value="${t.v}">${esc(t.l)}</option>`).join('')}</select><button class="in-btn primary" type="submit">${IN.t('Assign', 'Panga')}</button></form>`);
        m.addEventListener('submit', async (e) => { e.preventDefault(); try { await IN.api.post('/teaching', { course_id: c.id, staff_id: Number(e.target.staff_id.value), term_id: e.target.term_id.value ? Number(e.target.term_id.value) : null }); m.querySelector('#tList').innerHTML = await draw(); e.target.reset(); reload(false); } catch (err) { IN.fail(err); } });
        m.addEventListener('click', async (e) => { const r = e.target.closest('[data-rm]'); if (!r) return; try { await IN.api.del(`/teaching/${r.dataset.rm}`); m.querySelector('#tList').innerHTML = await draw(); reload(false); } catch (err) { IN.fail(err); } });
      },
    });
    await load();
  };

  // ------------------------------------------------------------ Enrolment
  IN.modules.enrol = async (el) => {
    const lk = await IN.lookups(); const manage = IN.can('academics.manage');
    const { courses } = await IN.api.get('/courses' + IN.qs({ limit: 100 }));
    const st = { course_id: '', term_id: curTerm(lk) };
    el.innerHTML = `${IN.pageHead(IN.t('Enrolment', 'Usajili'), IN.t('Choose a course and term to see or change who is enrolled.', 'Chagua kozi na muhula kuona au kubadilisha waliosajiliwa.'), `<a class="in-btn ghost" href="#courses"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Courses', 'Kozi')}</a>`)}
      <div class="in-card"><div class="in-toolbar">${IN.f.select('course_id', IN.t('Course', 'Kozi'), courses.map((c) => ({ v: c.id, l: `${c.code} · ${c.name}` })), { cls: '' })}${IN.f.select('term_id', IN.t('Term', 'Muhula'), termOpts(lk), { value: st.term_id, noBlank: true })}${manage ? `<button class="in-btn primary" id="enAdd" disabled><i class="fa-solid fa-user-plus"></i> ${IN.t('Enrol students', 'Sajili wanafunzi')}</button>` : ''}</div><div id="enOut">${IN.empty('fa-hand-pointer', IN.t('Choose a course', 'Chagua kozi'), '')}</div></div>`;
    const out = el.querySelector('#enOut'); const add = el.querySelector('#enAdd');
    const load = async () => {
      if (!st.course_id || !st.term_id) { out.innerHTML = IN.empty('fa-hand-pointer', IN.t('Choose a course', 'Chagua kozi'), ''); if (add) add.disabled = true; return; }
      if (add) add.disabled = false;
      const { enrollments } = await IN.api.get('/enrollments' + IN.qs(st));
      out.innerHTML = IN.table([{ label: IN.t('Student', 'Mwanafunzi'), render: (e) => `<b>${esc(e.full_name)}</b><div class="in-small in-muted">${esc(e.student_no)}</div>` }, { label: IN.t('Class', 'Darasa'), render: (e) => esc(e.class_name || '—') }, { label: IN.t('Marks', 'Alama'), cls: 'in-center', render: (e) => e.marks == null ? '—' : e.marks }, { label: IN.t('Grade', 'Daraja'), cls: 'in-center', render: (e) => e.grade ? `<span class="in-grade">${esc(e.grade)}</span>` : '—' }, { label: IN.t('Status', 'Hali'), render: (e) => IN.chip(e.status) },
        { label: '', cls: 'in-right', render: (e) => manage && e.status !== 'dropped' ? `<button class="in-btn danger-ghost sm" data-act="rm" data-id="${e.id}">${IN.t('Remove', 'Ondoa')}</button>` : '' }], enrollments, { empty: IN.empty('fa-user-plus', IN.t('Nobody enrolled yet', 'Hakuna aliyesajiliwa bado'), IN.t('Use "Enrol students" to add a whole programme or class at once.', 'Tumia "Sajili wanafunzi" kuongeza programu au darasa lote kwa mara moja.')) }) + `<div class="in-small in-muted" style="margin-top:.5rem">${enrollments.length} ${IN.t('student(s)', 'mwanafunzi')}</div>`;
    };
    el.querySelector('[name=course_id]').addEventListener('change', (e) => { st.course_id = e.target.value; load().catch(IN.fail); });
    el.querySelector('[name=term_id]').addEventListener('change', (e) => { st.term_id = e.target.value; load().catch(IN.fail); });
    IN.delegate(el, {
      rm: async (b) => { const r = await IN.api.del(`/enrollments/${b.dataset.id}`); IN.toast(r.kept ? IN.t('Marked as dropped (results are kept).', 'Ameandikwa ameacha (matokeo yanabaki).') : IN.t('Removed.', 'Ameondolewa.')); load(); },
    });
    if (add) add.addEventListener('click', () => IN.formModal({ title: IN.t('Enrol students', 'Sajili wanafunzi'), submit: IN.t('Enrol', 'Sajili'), body: `<p class="in-muted in-small">${IN.t('Enrol every active student of a programme or class. Choose one or both filters.', 'Sajili kila mwanafunzi hai wa programu au darasa. Chagua kichujio kimoja au vyote.')}</p>${IN.f.select('programme_id', IN.t('Programme', 'Programu'), IN.opts.list(lk.programmes))}${IN.f.input('class_name', IN.t('Class (exact name)', 'Darasa (jina kamili)'), { placeholder: 'Year 1 A' })}`,
      onSubmit: async (d) => { if (!d.programme_id && !d.class_name) throw new Error(IN.t('Choose a programme or enter a class.', 'Chagua programu au andika darasa.')); const r = await IN.api.post('/enrollments', { course_id: Number(st.course_id), term_id: Number(st.term_id), programme_id: d.programme_id || undefined, class_name: d.class_name || undefined }); IN.closeModal(); IN.toast(IN.t(`${r.enrolled} student(s) enrolled.`, `Wanafunzi ${r.enrolled} wamesajiliwa.`)); load(); } }));
  };

  // ------------------------------------------------------------ Marks entry
  IN.modules.results = async (el) => {
    const lk = await IN.lookups();
    const { courses } = await IN.api.get('/courses' + IN.qs({ limit: 100, mine: IN.state.role === 'teacher' ? 1 : '' }));
    const st = { course_id: '', term_id: curTerm(lk) };
    el.innerHTML = `${IN.pageHead(IN.t('Marks & results', 'Alama na matokeo'), IN.t('Enter marks out of 100. Grades are worked out automatically from your grading scale.', 'Ingiza alama kati ya 100. Madaraja hukokotolewa kiotomatiki.'))}
      <div class="in-card"><div class="in-toolbar">${IN.f.select('course_id', IN.t('Course', 'Kozi'), courses.map((c) => ({ v: c.id, l: `${c.code} · ${c.name}` })))}${IN.f.select('term_id', IN.t('Term', 'Muhula'), termOpts(lk), { value: st.term_id, noBlank: true })}</div><div id="rsOut">${IN.empty('fa-hand-pointer', IN.t('Choose a course', 'Chagua kozi'), courses.length ? '' : IN.t('No courses are assigned to you yet.', 'Hujapangiwa kozi bado.'))}</div></div>`;
    const out = el.querySelector('#rsOut');
    const load = async () => {
      if (!st.course_id || !st.term_id) return;
      const d = await IN.api.get('/results/sheet' + IN.qs(st));
      out.innerHTML = `<div class="in-spread" style="margin:.4rem 0 .8rem"><span class="in-muted in-small">${d.stats.marked}/${d.stats.students} ${IN.t('marked', 'zimeingizwa')}${d.stats.average != null ? ` · ${IN.t('average', 'wastani')} ${d.stats.average}` : ''}</span>${d.editable && d.rows.length ? `<button class="in-btn primary" id="rsSave"><i class="fa-solid fa-floppy-disk"></i> ${IN.t('Save marks', 'Hifadhi alama')}</button>` : ''}</div>
        ${d.rows.length ? `<form id="rsForm">${IN.table([{ label: IN.t('Student', 'Mwanafunzi'), render: (r) => `<b>${esc(r.full_name)}</b><div class="in-small in-muted">${esc(r.student_no)}</div>` }, { label: IN.t('Marks (0–100)', 'Alama (0–100)'), cls: 'in-center', render: (r) => d.editable ? `<input class="in-input in-marks" type="number" min="0" max="100" step="0.5" inputmode="decimal" data-eid="${r.enrollment_id}" value="${r.marks ?? ''}" aria-label="${IN.t('Marks for', 'Alama za')} ${esc(r.full_name)}">` : (r.marks ?? '—') }, { label: IN.t('Grade', 'Daraja'), cls: 'in-center', render: (r) => r.grade ? `<span class="in-grade">${esc(r.grade)}</span>` : '—' }, { label: IN.t('Remarks', 'Maoni'), render: (r) => d.editable ? `<input class="in-input" data-rem="${r.enrollment_id}" value="${esc(r.remarks || '')}" maxlength="200">` : esc(r.remarks || '') }], d.rows)}</form>`
          : IN.empty('fa-users', IN.t('Nobody is enrolled', 'Hakuna aliyesajiliwa'), IN.t('Enrol students in this course for this term first.', 'Sajili wanafunzi kwenye kozi hii kwa muhula huu kwanza.'), IN.can('academics.manage') ? `<a class="in-btn primary" href="#enrol">${IN.t('Go to enrolment', 'Nenda kwenye usajili')}</a>` : '')}
        ${!d.editable ? `<div class="in-alert info" style="margin-top:.8rem"><i class="fa-solid fa-lock"></i><div>${IN.t('You can view these results but not change them.', 'Unaweza kuona matokeo haya lakini huwezi kuyabadilisha.')}</div></div>` : ''}`;
      const save = out.querySelector('#rsSave');
      if (save) save.addEventListener('click', async () => {
        const rows = [...out.querySelectorAll('[data-eid]')].map((i) => ({ enrollment_id: Number(i.dataset.eid), marks: i.value, remarks: (out.querySelector(`[data-rem="${i.dataset.eid}"]`) || {}).value || '' }));
        const bad = rows.find((r) => r.marks !== '' && (Number(r.marks) < 0 || Number(r.marks) > 100 || Number.isNaN(Number(r.marks))));
        if (bad) return IN.toast(IN.t('Marks must be between 0 and 100.', 'Alama lazima ziwe kati ya 0 na 100.'), 'error');
        save.disabled = true;
        try { const r = await IN.api.queued('POST', '/results/sheet', { course_id: Number(st.course_id), term_id: Number(st.term_id), rows }, IN.t(`Marks: ${rows.length} student(s)`, `Alama: wanafunzi ${rows.length}`)); if (r.queued) { save.disabled = false; return; } IN.toast(IN.t(`${r.saved} mark(s) saved.`, `Alama ${r.saved} zimehifadhiwa.`)); await load(); } catch (e) { IN.fail(e); save.disabled = false; }
      });
    };
    el.querySelector('[name=course_id]').addEventListener('change', (e) => { st.course_id = e.target.value; load().catch(IN.fail); });
    el.querySelector('[name=term_id]').addEventListener('change', (e) => { st.term_id = e.target.value; load().catch(IN.fail); });
  };

  // ------------------------------------------------------------ My results (student)
  IN.modules.myResults = async (el) => {
    const d = await IN.api.get('/me/results');
    if (!d.linked) { el.innerHTML = `<div class="in-card">${IN.empty('fa-link-slash', IN.t('No record linked', 'Hakuna rekodi iliyounganishwa'), IN.t('Ask the administration to link your login to your student record.', 'Mwombe msimamizi aunganishe akaunti yako na rekodi yako.'))}</div>`; return; }
    el.innerHTML = `${IN.pageHead(IN.t('My results', 'Matokeo yangu'), d.student.full_name)}${d.cumulative_gpa != null ? `<div class="in-grid cols-3" style="margin-bottom:1rem">${IN.stat('fa-graduation-cap', d.cumulative_gpa, IN.t('Cumulative GPA', 'GPA ya jumla'))}${IN.stat('fa-book', d.subjects, IN.t('Courses graded', 'Kozi zilizopimwa'))}</div>` : ''}
      ${d.terms.length ? d.terms.map((t) => `<div class="in-card" style="margin-bottom:1rem"><div class="in-card-head"><h3>${esc(t.term)}</h3><span class="in-muted in-small">${IN.t('Average', 'Wastani')} ${t.average} · GPA ${t.gpa}</span></div>${IN.table([{ label: IN.t('Course', 'Kozi'), render: (r) => `${esc(r.code)} · ${esc(r.course)}` }, { label: IN.t('Marks', 'Alama'), cls: 'in-center', key: 'marks' }, { label: IN.t('Grade', 'Daraja'), cls: 'in-center', render: (r) => `<span class="in-grade">${esc(r.grade)}</span>` }, { label: IN.t('Remarks', 'Maoni'), render: (r) => esc(r.remarks || '') }], t.rows)}</div>`).join('') : `<div class="in-card">${IN.empty('fa-square-poll-vertical', IN.t('No results yet', 'Hakuna matokeo bado'), IN.t('Your marks will appear here when your teachers publish them.', 'Alama zako zitaonekana hapa walimu wako wakizichapisha.'))}</div>`}`;
  };
})();
