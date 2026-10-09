/* Examinations, marks entry, class results and student report cards. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const EXAM_TYPES = ['Monthly Test', 'Midterm Examination', 'Terminal Examination', 'Mock Examination', 'Annual Examination', 'Quiz'];
  const docColor = () => `--doc-color:${SC.state.school.primary_color || '#0B6E4F'}`;
  const clsOf = (e) => SC.classLabel({ name: e.class_name, stream: e.class_stream });

  async function examModal(ex, done) {
    const lk = await SC.lookups(); const isEdit = !!ex;
    let classes = SC.opts.classes(lk, true);
    if (SC.state.role === 'teacher') { const mine = await SC.api.get('/classes'); classes = mine.classes.filter((c) => c.status === 'active').map((c) => ({ v: c.id, l: SC.classLabel(c) })); }
    SC.formModal({
      title: isEdit ? SC.t('Edit examination', 'Hariri Mtihani') : SC.t('Create examination', 'Unda Mtihani'), size: 'wide', submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Create examination', 'Unda Mtihani'),
      body: `<div class="cols">${SC.f.input('name', SC.t('Examination name', 'Jina la Mtihani'), { required: true, value: ex ? ex.name : '', placeholder: SC.t('e.g. Midterm Examination — Term 1', 'mfano: Mtihani wa Katikati — Muhula wa 1') })}${SC.f.input('exam_type', SC.t('Type', 'Aina'), { value: ex ? ex.exam_type : 'Monthly Test', attr: { list: 'examTypes' } })}<datalist id="examTypes">${EXAM_TYPES.map((t) => `<option value="${t}">`).join('')}</datalist></div>
        <div class="cols-3">${isEdit ? SC.f.input('cls', SC.t('Class', 'Darasa'), { value: clsOf(ex), attr: { readonly: true } }) : SC.f.select('class_id', SC.t('Class', 'Darasa'), classes, { required: true, placeholder: SC.t('Choose a class', 'Chagua darasa') })}${SC.f.select('term_id', SC.t('Term', 'Muhula'), SC.opts.terms(lk), { value: ex ? ex.term_id || '' : '', placeholder: SC.t('No term', 'Hakuna muhula') })}${SC.f.input('exam_date', SC.t('Date', 'Tarehe'), { type: 'date', value: ex ? ex.exam_date || '' : SC.today() })}</div>
        <div class="cols">${SC.f.input('max_marks', SC.t('Maximum marks per subject', 'Alama za Juu kwa Kila Somo'), { type: 'number', required: true, value: ex ? ex.max_marks : 100, attr: { min: 1, max: 1000 }, hint: SC.t('Grades are worked out as a percentage of this number.', 'Madaraja yanahesabiwa kama asilimia ya namba hii.') })}${isEdit ? SC.f.input('yr', SC.t('Academic year', 'Mwaka wa Masomo'), { value: ex.year_name, attr: { readonly: true } }) : ''}</div>
        ${isEdit ? '' : `<p class="sc-small sc-muted" style="margin:0">${SC.t('Parents and teachers of the class are notified automatically when you create the examination.', 'Wazazi na walimu wa darasa wataarifiwa kiotomatiki unapounda mtihani.')}</p>`}`,
      onSubmit: async (f) => {
        const body = { name: f.name, exam_type: f.exam_type, class_id: isEdit ? ex.class_id : f.class_id, term_id: f.term_id || null, exam_date: f.exam_date || null, max_marks: Number(f.max_marks) };
        const r = isEdit ? await SC.api.put(`/exams/${ex.id}`, body) : await SC.api.post('/exams', body);
        SC.closeModal(); SC.toast(isEdit ? SC.t('Examination updated successfully.', 'Mtihani umesasishwa kwa mafanikio.') : SC.t('Examination created successfully.', 'Mtihani umeundwa kwa mafanikio.')); done(r);
      },
    });
  }

  SC.modules.exams = async (el, args) => {
    const st = { class_id: '' }; const lk = await SC.lookups();
    async function load() {
      const { exams } = await SC.api.get('/exams' + SC.qs(st));
      el.innerHTML = `${SC.pageHead(SC.t('Examinations', 'Mitihani'), SC.t('Create examinations and enter marks', 'Unda mitihani na uingize alama'), SC.can('exams.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Create Examination', 'Unda Mtihani')}</button>` : '')}
        <div class="sc-card"><div class="sc-toolbar"><select class="sc-select" id="eClass"><option value="">${SC.t('All classes', 'Madarasa yote')}</option>${SC.opts.classes(lk, false).map((o) => `<option value="${o.v}" ${String(o.v) === String(st.class_id) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></div>
        ${SC.table([
          { label: SC.t('Examination', 'Mtihani'), render: (e) => `<a href="#exam/${e.id}"><b>${esc(e.name)}</b></a><div class="sc-small sc-muted">${esc(e.exam_type)}</div>` }, { label: SC.t('Class', 'Darasa'), render: (e) => esc(clsOf(e)) },
          { label: SC.t('Term', 'Muhula'), render: (e) => esc(e.term_name || '—') }, { label: SC.t('Date', 'Tarehe'), render: (e) => SC.date(e.exam_date) }, { label: SC.t('Max marks', 'Alama za Juu'), cls: 'end', render: (e) => e.max_marks },
          { label: SC.t('Marks entered', 'Alama Zilizoingizwa'), render: (e) => e.results_count ? `<span class="sc-chip ok">${SC.t(`${e.students_marked} student${e.students_marked === 1 ? '' : 's'}`, `Wanafunzi ${e.students_marked}`)}</span>` : `<span class="sc-chip">${SC.t('Not started', 'Bado Haijaanza')}</span>` },
          { label: '', cls: 'end', render: (e) => `<div class="sc-actions-cell"><a class="sc-btn soft sm" href="#exam/${e.id}"><i class="fa-solid fa-pen-to-square"></i> ${SC.can('results.enter') ? SC.t('Enter marks', 'Ingiza Alama') : SC.t('Open', 'Fungua')}</a>${SC.can('results.view') ? `<a class="sc-btn ghost sm" href="#results/${e.id}"><i class="fa-solid fa-ranking-star"></i> ${SC.t('Results', 'Matokeo')}</a>` : ''}${SC.can('exams.manage') ? `<button class="sc-btn ghost sm" data-act="edit" data-id="${e.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${e.id}" data-name="${esc(e.name)}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>` },
        ], exams, { empty: SC.empty('fa-file-pen', SC.t('No examinations yet', 'Hakuna mitihani bado'), SC.t('Create your first examination, then enter marks for each subject.', 'Unda mtihani wako wa kwanza, kisha ingiza alama kwa kila somo.'), SC.can('exams.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Create Examination', 'Unda Mtihani')}</button>` : '') })}</div>`;
      el._exams = exams;
      el.querySelector('#eClass').addEventListener('change', (e) => { st.class_id = e.target.value; load(); });
    }
    SC.delegate(el, {
      add: () => examModal(null, () => load()),
      edit: (b) => examModal(el._exams.find((e) => String(e.id) === b.dataset.id), () => load()),
      del: async (b) => { if (!(await SC.confirm({ title: SC.t('Delete this examination?', 'Futa mtihani huu?'), message: SC.t(`<b>${esc(b.dataset.name)}</b> and every mark entered for it will be deleted.`, `<b>${esc(b.dataset.name)}</b> na kila alama iliyoingizwa kwa ajili yake itafutwa.`), confirmText: SC.t('Yes, delete', 'Ndiyo, futa') }))) return; await SC.api.del(`/exams/${b.dataset.id}`); SC.toast(SC.t('Examination deleted.', 'Mtihani umefutwa.')); load(); },
    });
    await load();
    if (args[0] === 'new' && SC.can('exams.manage')) { history.replaceState(null, '', '#exams'); SC.after(() => examModal(null, () => load())); }
  };

  // ------------------------------------------------------------ one exam: subjects & progress
  SC.modules.exam = async (el, args) => {
    const { exam: ex, subjects } = await SC.api.get(`/exams/${args[0]}`);
    SC.setTitle(ex.name, `${clsOf(ex)} · ${ex.exam_type}`);
    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread"><div><h2 style="font-size:1.35rem">${esc(ex.name)}</h2><div class="sc-row" style="margin-top:.4rem"><span class="sc-chip"><i class="fa-solid fa-school"></i> ${esc(clsOf(ex))}</span><span class="sc-chip">${esc(ex.term_name || SC.t('No term', 'Hakuna muhula'))}</span><span class="sc-chip">${SC.date(ex.exam_date)}</span><span class="sc-chip">${SC.t('Max', 'Juu')} ${ex.max_marks}</span></div></div>
      <div class="sc-row"><a class="sc-btn ghost sm" href="#exams"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>${SC.can('results.view') ? `<a class="sc-btn primary sm" href="#results/${ex.id}"><i class="fa-solid fa-ranking-star"></i> ${SC.t('View class results', 'Ona Matokeo ya Darasa')}</a>` : ''}</div></div></div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Subjects — enter marks for each', 'Masomo — ingiza alama kwa kila somo')}</h3></div>${SC.table([
        { label: SC.t('Subject', 'Somo'), render: (s) => `<b>${esc(s.name)}</b> <span class="sc-muted sc-small">${esc(s.code)}</span>` }, { label: SC.t('Teacher', 'Mwalimu'), render: (s) => esc(s.teacher_name || '—') },
        { label: SC.t('Progress', 'Maendeleo'), render: (s) => { const p = s.students_expected ? Math.round(s.marks_entered / s.students_expected * 100) : 0; return `<div style="min-width:140px"><div class="sc-small">${SC.t(`${s.marks_entered} of ${s.students_expected} students`, `Wanafunzi ${s.marks_entered} kati ya ${s.students_expected}`)}</div>${SC.progress(p, p >= 100 ? '' : p > 0 ? 'warn' : 'bad')}</div>`; } },
        { label: '', cls: 'end', render: (s) => s.can_enter ? `<a class="sc-btn primary sm" href="#marks/${ex.id}/${s.subject_id}"><i class="fa-solid fa-pen-to-square"></i> ${s.marks_entered ? SC.t('Edit marks', 'Hariri Alama') : SC.t('Enter marks', 'Ingiza Alama')}</a>` : `<a class="sc-btn ghost sm" href="#marks/${ex.id}/${s.subject_id}">${SC.t('View marks', 'Ona Alama')}</a>` },
      ], subjects, { empty: SC.empty('fa-book-open', SC.t('This class has no subjects', 'Darasa hili halina masomo'), SC.t('Add subjects to the class in Classes, then enter marks.', 'Ongeza masomo kwenye darasa kupitia Madarasa, kisha ingiza alama.')) })}</div>`;
  };

  // ------------------------------------------------------------ marks entry
  SC.modules.marks = async (el, args) => {
    const d = await SC.api.get(`/results/entry?exam_id=${args[0]}&subject_id=${args[1]}`);
    const ex = d.exam; const scale = [...((await SC.lookups()).grading_scale || [])].sort((a, b) => b.min - a.min);
    SC.setTitle(SC.t(`Marks — ${d.subject.name}`, `Alama — ${d.subject.name}`), `${ex.name} · ${clsOf(ex)}`);
    const gradeOf = (m) => { if (m === '' || m == null || Number.isNaN(Number(m))) return ''; const pct = Number(m) / ex.max_marks * 100; const g = scale.find((x) => pct >= x.min) || scale[scale.length - 1]; return g ? g.grade : ''; };
    el.innerHTML = `${SC.pageHead(SC.t(`${d.subject.name} marks`, `Alama za ${d.subject.name}`), SC.t(`${ex.name} · ${clsOf(ex)} · out of ${ex.max_marks}`, `${ex.name} · ${clsOf(ex)} · kati ya ${ex.max_marks}`), `<a class="sc-btn ghost" href="#exam/${ex.id}"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>`)}
      <div class="sc-card">${d.students.length ? `${d.can_enter ? `<div class="sc-alert info" style="margin-bottom:1rem"><i class="fa-solid fa-keyboard"></i><div>${SC.t("Type each student's marks and press <b>Enter</b> to jump to the next one. Leave a box empty if the student was absent. Grades are worked out automatically.", 'Andika alama za kila mwanafunzi kisha bonyeza <b>Enter</b> kwenda kwa anayefuata. Acha kisanduku wazi ikiwa mwanafunzi hakuwepo. Madaraja yanahesabiwa kiotomatiki.')}</div></div>` : `<div class="sc-alert" style="margin-bottom:1rem"><i class="fa-solid fa-eye"></i><div>${SC.t('You can view these marks but not change them.', 'Unaweza kuona alama hizi lakini huwezi kuzibadilisha.')}</div></div>`}
        ${SC.table([{ label: '#', render: (s) => d.students.indexOf(s) + 1 }, { label: SC.t('Student', 'Mwanafunzi'), render: (s) => `<div class="sc-person">${SC.avatar('students', s.id, s.full_name, false)}<span><span class="nm">${esc(s.full_name)}</span><div class="sb sc-muted">${esc(s.admission_no)}</div></span></div>` },
          { label: SC.t(`Marks (0–${ex.max_marks})`, `Alama (0–${ex.max_marks})`), render: (s) => d.can_enter ? `<input class="sc-input mk" type="number" min="0" max="${ex.max_marks}" step="0.5" inputmode="decimal" style="width:110px" data-sid="${s.id}" value="${s.marks == null ? '' : s.marks}" aria-label="${SC.t('Marks for', 'Alama za')} ${esc(s.full_name)}">` : `<b>${s.marks == null ? '—' : s.marks}</b>` },
          { label: SC.t('Grade', 'Daraja'), render: (s) => `<b class="gr" data-sid="${s.id}">${esc(gradeOf(s.marks))}</b>` }], d.students, { cls: 'compact' })}
        ${d.can_enter ? `<div class="sc-row" style="justify-content:flex-end;margin-top:1rem"><button class="sc-btn primary lg" data-act="save"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save marks', 'Hifadhi Alama')}</button></div>` : ''}` : SC.empty('fa-user-slash', SC.t('No students take this subject', 'Hakuna wanafunzi wanaosoma somo hili'), SC.t('Students must be registered in this class with this subject.', 'Wanafunzi lazima wasajiliwe darasani hapa na somo hili.'))}</div>`;
    const inputs = () => [...el.querySelectorAll('.mk')];
    el.addEventListener('input', (e) => {
      const i = e.target.closest('.mk'); if (!i) return;
      const v = i.value; const bad = v !== '' && (Number(v) < 0 || Number(v) > ex.max_marks);
      i.style.borderColor = bad ? 'var(--sc-danger)' : ''; el.querySelector(`.gr[data-sid="${i.dataset.sid}"]`).textContent = bad ? '!' : gradeOf(v);
    });
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.classList.contains('mk')) { e.preventDefault(); const all = inputs(); const n = all[all.indexOf(e.target) + 1]; if (n) { n.focus(); n.select(); } } });
    SC.delegate(el, {
      save: async (b) => {
        const marks = inputs().map((i) => ({ student_id: Number(i.dataset.sid), marks: i.value }));
        const bad = inputs().find((i) => i.value !== '' && (Number(i.value) < 0 || Number(i.value) > ex.max_marks));
        if (bad) { bad.focus(); return SC.toast(SC.t(`Marks must be between 0 and ${ex.max_marks}.`, `Alama lazima ziwe kati ya 0 na ${ex.max_marks}.`), 'error'); }
        b.disabled = true; b.innerHTML = `<span class="sc-spin"></span> ${SC.t('Saving…', 'Inahifadhi…')}`;
        try { const r = await SC.api.post('/results', { exam_id: ex.id, subject_id: Number(args[1]), marks }); SC.toast(SC.t(`Marks saved for ${r.saved} student${r.saved === 1 ? '' : 's'}.`, `Alama zimehifadhiwa kwa wanafunzi ${r.saved}.`)); } catch (err) { SC.fail(err); }
        b.disabled = false; b.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save marks', 'Hifadhi Alama')}`;
      },
    });
  };

  // ------------------------------------------------------------ results
  SC.modules.results = async (el, args) => {
    if (!args[0]) {
      const { exams } = await SC.api.get('/exams');
      el.innerHTML = `${SC.pageHead(SC.t('Results', 'Matokeo'), SC.t('Choose an examination to see the class results and print report cards', 'Chagua mtihani kuona matokeo ya darasa na kuchapisha ripoti za matokeo'))}<div class="sc-grid" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">${exams.map((e) => `<a class="sc-card sc-stack" href="#results/${e.id}" style="gap:.5rem;color:var(--sc-text)"><div class="sc-spread"><b style="font-size:1.05rem">${esc(e.name)}</b>${e.results_count ? SC.chip('ok', SC.t('Marks in', 'Alama Zimeingizwa')) : SC.chip('pending', SC.t('No marks', 'Hakuna Alama'))}</div><div class="sc-muted sc-small">${esc(clsOf(e))} · ${esc(e.exam_type)}</div><div class="sc-small">${SC.date(e.exam_date)} · ${SC.t(`${e.students_marked} student${e.students_marked === 1 ? '' : 's'} marked`, `Wanafunzi ${e.students_marked} wamewekwa alama`)}</div></a>`).join('') || `<div class="sc-card" style="grid-column:1/-1">${SC.empty('fa-ranking-star', SC.t('No examinations yet', 'Hakuna mitihani bado'), SC.t('Create an examination and enter marks first.', 'Unda mtihani na uingize alama kwanza.'))}</div>`}</div>`;
      return;
    }
    const d = await SC.api.get(`/exams/${args[0]}/sheet`); const ex = d.exam;
    SC.setTitle(SC.t(`Results — ${ex.name}`, `Matokeo — ${ex.name}`), clsOf(ex));
    const cols = [{ key: 'position', label: SC.t('Pos', 'Nafasi') }, { key: 'admission_no', label: SC.t('Student ID', 'Namba ya Mwanafunzi') }, { key: 'name', label: SC.t('Name', 'Jina') }, ...d.subjects.map((s) => ({ key: 's' + s.id, label: s.code || s.name, align: 'end' })), { key: 'total', label: SC.t('Total', 'Jumla'), align: 'end' }, { key: 'average', label: SC.t('Average %', 'Wastani %'), align: 'end' }, { key: 'grade', label: SC.t('Grade', 'Daraja') }, { key: 'division', label: SC.t('Division', 'Divisheni') }];
    const rowsData = d.rows.map((r) => { const o = { position: r.position || '—', admission_no: r.admission_no, name: r.full_name, total: r.total, average: r.average, grade: r.grade, division: r.division || '—' }; d.subjects.forEach((s) => { const m = r.subjects.find((x) => x.subject_id === s.id); o['s' + s.id] = m ? m.marks : '—'; }); return o; });
    el.innerHTML = `${SC.pageHead(ex.name, SC.t(`${clsOf(ex)} · ${ex.exam_type} · ${d.out_of} student${d.out_of === 1 ? '' : 's'} ranked${d.class_average != null ? ' · Class average ' + d.class_average + '%' : ''}`, `${clsOf(ex)} · ${ex.exam_type} · Wanafunzi ${d.out_of} wamepangiwa nafasi${d.class_average != null ? ' · Wastani wa Darasa ' + d.class_average + '%' : ''}`), `<a class="sc-btn ghost" href="#results"><i class="fa-solid fa-arrow-left"></i> ${SC.t('All results', 'Matokeo Yote')}</a>${SC.can('results.enter') ? `<a class="sc-btn ghost" href="#exam/${ex.id}"><i class="fa-solid fa-pen-to-square"></i> ${SC.t('Enter marks', 'Ingiza Alama')}</a>` : ''}<button class="sc-btn ghost" data-act="xlsx"><i class="fa-solid fa-file-excel"></i> Excel</button><button class="sc-btn primary" data-act="print"><i class="fa-solid fa-print"></i> ${SC.t('Print', 'Chapisha')}</button>`)}
      <div class="sc-card">${d.rows.some((r) => r.subject_count) ? SC.table([
        { label: SC.t('Pos', 'Nafasi'), render: (r) => `<b>${r.position || '—'}</b>` }, { label: SC.t('Student', 'Mwanafunzi'), render: (r) => `<div class="sc-person">${SC.avatar('students', r.student_id, r.full_name, false)}<span><span class="nm">${esc(r.full_name)}</span><div class="sb sc-muted">${esc(r.admission_no)}</div></span></div>` },
        ...d.subjects.map((s) => ({ label: s.code || s.name, cls: 'end', render: (r) => { const m = r.subjects.find((x) => x.subject_id === s.id); return m ? `${m.marks} <span class="sc-muted sc-small">${esc(m.grade)}</span>` : '<span class="sc-muted">—</span>'; } })),
        { label: SC.t('Total', 'Jumla'), cls: 'end', render: (r) => `<b>${SC.num(r.total)}</b>` }, { label: SC.t('Average', 'Wastani'), cls: 'end', render: (r) => r.subject_count ? `${r.average}%` : '—' }, { label: SC.t('Grade', 'Daraja'), render: (r) => r.subject_count ? `<span class="sc-chip ${r.grade === 'F' ? 'bad' : r.grade === 'A' ? 'ok' : 'info'}">${esc(r.grade)}</span>` : '—' },
        ...(SC.state.settings.division_enabled ? [{ label: SC.t('Div', 'Div'), render: (r) => esc(r.division || '—') }] : []),
        { label: '', cls: 'end', render: (r) => r.subject_count ? `<a class="sc-btn soft sm" href="#reportcard/${ex.id}/${r.student_id}"><i class="fa-solid fa-file-lines"></i> ${SC.t('Report card', 'Ripoti ya Matokeo')}</a>` : '' },
      ], d.rows, { cls: 'compact' }) : SC.empty('fa-file-circle-question', SC.t('No marks entered yet', 'Hakuna alama zilizoingizwa bado'), SC.t('Enter marks for at least one subject to see the ranking.', 'Ingiza alama za angalau somo moja kuona nafasi.'), SC.can('results.enter') ? `<a class="sc-btn primary" href="#exam/${ex.id}">${SC.t('Enter marks', 'Ingiza Alama')}</a>` : '')}</div>`;
    SC.delegate(el, {
      xlsx: () => SC.xlsx(cols, rowsData, `${ex.name}-${clsOf(ex)}.xlsx`.replace(/[\\/:*?"<>|]/g, '-'), 'Results'),
      print: () => SC.print(`<div class="sc-doc" style="${docColor()};padding:12px"><h2 style="color:#111">${esc(SC.state.school.name)}</h2><h3 style="color:#111;margin:4px 0 12px">${esc(ex.name)} — ${esc(clsOf(ex))}</h3><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>${cols.map((c) => `<th style="border:1px solid #bbb;padding:5px;background:#eee;text-align:${c.align === 'end' ? 'right' : 'left'}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rowsData.map((r) => `<tr>${cols.map((c) => `<td style="border:1px solid #ddd;padding:5px;text-align:${c.align === 'end' ? 'right' : 'left'}">${esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`),
    });
  };

  // ------------------------------------------------------------ report card
  function reportHtml(r) {
    const s = r.school;
    return `<div class="sc-doc sc-report" style="${docColor()}"><div class="hd"><span class="lg">${esc(SC.schoolInitials(s))}${s.has_logo ? `<img src="${SC.logoUrl(s.id)}" alt="" onerror="this.remove()">` : ''}</span><div><h2 style="margin:0">${esc(s.name)}</h2><p>${esc([s.address, s.phone, s.email, s.website].filter(Boolean).join(' · '))}</p></div></div>
      <div class="ttl"><b>${SC.t('Student report card', 'Ripoti ya Matokeo ya Mwanafunzi')}</b><span style="font-size:12px;color:#555">${esc(r.exam.name)} · ${esc(r.exam.term_name || '')} ${esc(r.exam.year_name || '')}</span></div>
      <div class="info"><div><span>${SC.t('Student', 'Mwanafunzi')}</span><b>${esc(r.student.full_name)}</b></div><div><span>${SC.t('Student ID', 'Namba ya Mwanafunzi')}</span><b>${esc(r.student.admission_no)}</b></div><div><span>${SC.t('Class', 'Darasa')}</span><b>${esc(r.exam.class_name)}</b></div><div><span>${SC.t('Examination', 'Mtihani')}</span><b>${esc(r.exam.exam_type)}</b></div><div><span>${SC.t('Gender', 'Jinsia')}</span><b>${esc(SC.cap(r.student.gender))}</b></div><div><span>${SC.t('Date', 'Tarehe')}</span><b>${SC.date(r.exam.exam_date)}</b></div></div>
      <table><thead><tr><th>${SC.t('Subject', 'Somo')}</th><th class="num">${SC.t('Marks', 'Alama')}</th><th class="num">${SC.t('Grade', 'Daraja')}</th><th>${SC.t('Remarks', 'Maoni')}</th></tr></thead><tbody>${r.subjects.map((x) => `<tr><td>${esc(x.subject)}</td><td class="num">${x.marks} / ${r.exam.max_marks}</td><td class="num"><b>${esc(x.grade)}</b></td><td>${esc(x.remarks)}</td></tr>`).join('')}</tbody></table>
      <div class="totals"><div><b>${SC.num(r.total)}</b><span>${SC.t('Total marks', 'Jumla ya Alama')}</span></div><div><b>${r.average}%</b><span>${SC.t('Average', 'Wastani')}</span></div><div><b>${esc(r.grade)}</b><span>${SC.t('Grade', 'Daraja')}</span></div><div><b>${esc(r.position_label)}</b><span>${SC.t('Position', 'Nafasi')}</span></div></div>
      ${r.division ? `<div style="font-size:13px;margin-bottom:6px"><b>${SC.t('Division', 'Divisheni')} ${esc(r.division)}</b> <span style="color:#666">(${r.division_points} ${SC.t('points', 'pointi')})</span></div>` : ''}${r.attendance_percent != null ? `<div style="font-size:12px;color:#555">${SC.t('Attendance', 'Mahudhurio')}: ${r.attendance_percent}% · ${SC.t('Class average', 'Wastani wa Darasa')}: ${r.class_average != null ? r.class_average + '%' : '—'}</div>` : ''}
      <div class="cm"><b>${SC.t("Teacher's comments", 'Maoni ya Mwalimu')}</b>${esc(r.teacher_comment || r.suggested_comment || '')}</div><div class="cm" style="min-height:40px"><b>${SC.t('Academic remarks', 'Maoni ya Kitaaluma')}</b>${esc(r.academic_remarks || '')}</div>
      <div class="sign"><div>${SC.t('Class teacher', 'Mwalimu wa Darasa')}</div><div>${SC.t('Head of school', 'Mkuu wa Shule')}</div><div>${SC.t('Parent / guardian', 'Mzazi / Mlezi')}</div></div>
      <div class="scale">${SC.t('Grading', 'Upangaji wa Madaraja')}: ${r.grading_scale.map((g) => `${esc(g.grade)} (${g.min}%+ ${esc(g.remark)})`).join(' · ')}</div></div>`;
  }

  SC.modules.reportcard = async (el, args) => {
    const d = await SC.api.get(`/report-card?exam_id=${args[0]}&student_id=${args[1]}`); const r = d.report;
    SC.setTitle(SC.t('Report card', 'Ripoti ya Matokeo'), `${r.student.full_name} · ${r.exam.name}`);
    const canComment = SC.can('results.enter') && !SC.isParent();
    const back = SC.isParent() ? `#student/${r.student.id}` : `#results/${r.exam.id}`;
    el.innerHTML = `${SC.pageHead(SC.t('Report card', 'Ripoti ya Matokeo'), `${r.student.full_name} · ${r.exam.name}`, `<a class="sc-btn ghost" href="${back}"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a><button class="sc-btn ghost" data-act="pdf"><i class="fa-solid fa-file-pdf"></i> ${SC.t('Download PDF', 'Pakua PDF')}</button><button class="sc-btn primary" data-act="print"><i class="fa-solid fa-print"></i> ${SC.t('Print', 'Chapisha')}</button>`)}
      ${canComment ? `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-card-head"><h3>${SC.t("Teacher's comment & remarks", 'Maoni na Ushauri wa Mwalimu')}</h3></div><form class="sc-form" id="cmForm" novalidate><div class="cols">${SC.f.textarea('teacher_comment', SC.t("Teacher's comment", 'Maoni ya Mwalimu'), { value: r.teacher_comment || r.suggested_comment || '', rows: 3, hint: SC.t('We suggested a comment from the grade — edit it as you like.', 'Tumependekeza maoni kutoka daraja — yahariri utakavyo.') })}${SC.f.textarea('remarks', SC.t('Academic remarks', 'Maoni ya Kitaaluma'), { value: r.academic_remarks || '', rows: 3 })}</div><div><button class="sc-btn primary sm" type="submit"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save comments', 'Hifadhi Maoni')}</button></div></form></div>` : ''}
      <div class="sc-card"><div class="sc-doc-stage" id="rcStage">${reportHtml(r)}</div></div>`;
    const stage = el.querySelector('#rcStage');
    const form = el.querySelector('#cmForm');
    if (form) form.addEventListener('submit', async (e) => {
      e.preventDefault();
      try { const v = SC.formData(form); await SC.api.put('/report-card/comment', { exam_id: r.exam.id, student_id: r.student.id, ...v }); r.teacher_comment = v.teacher_comment; r.academic_remarks = v.remarks; stage.innerHTML = reportHtml(r); SC.toast(SC.t('Comments saved.', 'Maoni yamehifadhiwa.')); } catch (err) { SC.fail(err); }
    });
    SC.delegate(el, {
      print: () => SC.print(`<div style="display:flex;justify-content:center">${reportHtml(r)}</div>`),
      pdf: async (b) => { b.disabled = true; try { await SC.pdf(stage.querySelector('.sc-report'), `Report-card-${r.student.admission_no}-${r.exam.name}.pdf`.replace(/[\\/:*?"<>|\s]+/g, '-'), { format: 'a4', margin: 8 }); SC.toast(SC.t('Report card downloaded.', 'Ripoti ya matokeo imepakuliwa.')); } catch (err) { SC.fail(err); } b.disabled = false; },
    });
  };
})();
