/* Classes, subjects and timetable. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const CLASS_SUGGESTIONS = ['Form One', 'Form Two', 'Form Three', 'Form Four', 'Form Five', 'Form Six', 'O-Level', 'A-Level', 'Primary', 'Special Tuition'];
  const LEVELS = ['O-Level', 'A-Level', 'Primary', 'Special Tuition'];
  const DAYS = () => (SC.isSw() ? ['Jumatatu', 'Jumanne', 'Jumatano', 'Alhamisi', 'Ijumaa', 'Jumamosi', 'Jumapili'] : ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']);

  // =============================================================== classes
  async function classModal(c, done) {
    const lk = await SC.lookups(); const isEdit = !!c;
    let cur = { subjects: [] };
    if (isEdit) cur = await SC.api.get(`/classes/${c.id}`);
    const chosen = new Map(cur.subjects.map((x) => [x.subject_id, x.teacher_id]));
    const teacherOpts = (val) => `<option value="">${SC.t('No teacher yet', 'Bado hakuna mwalimu')}</option>${SC.opts.teachers(lk).map((t) => `<option value="${t.v}" ${String(t.v) === String(val) ? 'selected' : ''}>${esc(t.l)}</option>`).join('')}`;
    SC.formModal({
      title: isEdit ? SC.t(`Edit ${SC.classLabel(c)}`, `Hariri ${SC.classLabel(c)}`) : SC.t('Create class', 'Unda Darasa'), size: 'wide', submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Create class', 'Unda Darasa'),
      body: `<div class="cols">${SC.f.input('name', SC.t('Class name', 'Jina la Darasa'), { required: true, value: c ? c.name : '', placeholder: SC.t('e.g. Form One or Special Tuition', 'mfano: Kidato cha Kwanza au Masomo Maalum'), attr: { list: 'clsSug' } })}<datalist id="clsSug">${CLASS_SUGGESTIONS.map((x) => `<option value="${x}">`).join('')}</datalist>${SC.f.input('level', SC.t('Level', 'Kiwango'), { value: c ? c.level || '' : 'O-Level', attr: { list: 'lvlSug' } })}<datalist id="lvlSug">${LEVELS.map((x) => `<option value="${x}">`).join('')}</datalist></div>
        <div class="cols-3">${SC.f.input('stream', SC.t('Stream', 'Mkondo'), { value: c ? c.stream || '' : '', placeholder: 'A, B, Science…', hint: SC.t('Optional', 'Si lazima') })}${isEdit ? SC.f.input('year', SC.t('Academic year', 'Mwaka wa Masomo'), { value: c.year_name, attr: { readonly: true } }) : SC.f.select('academic_year_id', SC.t('Academic year', 'Mwaka wa Masomo'), SC.opts.years(lk), { required: true, value: (lk.years.find((y) => y.is_current) || {}).id, noBlank: true })}${SC.f.input('max_students', SC.t('Maximum students', 'Idadi ya Juu ya Wanafunzi'), { type: 'number', required: true, value: c ? c.max_students : 40, attr: { min: 1, max: 500 } })}</div>
        <div class="cols">${SC.f.select('teacher_id', SC.t('Class teacher', 'Mwalimu wa Darasa'), SC.opts.teachers(lk), { value: c ? c.teacher_id || '' : '', placeholder: SC.t('No class teacher yet', 'Bado hakuna mwalimu wa darasa') })}${SC.f.select('status', SC.t('Status', 'Hali'), [['active', SC.t('Active', 'Hai')], ['inactive', SC.t('Inactive', 'Haifanyi kazi')]], { value: c ? c.status : 'active', noBlank: true })}</div>
        <div class="sc-field"><label>${SC.t('Subjects taught in this class and who teaches them', 'Masomo yanayofundishwa darasani hapa na wanaofundisha')}</label>
          <div class="sc-table-wrap" style="max-height:280px;overflow:auto;border:1px solid var(--sc-border)"><table class="sc-table compact" style="min-width:420px"><tbody>${lk.subjects.filter((s) => s.status === 'active' || chosen.has(s.id)).map((s) => `<tr><td style="width:40px"><input type="checkbox" class="subjChk" data-id="${s.id}" ${chosen.has(s.id) ? 'checked' : ''} style="width:18px;height:18px;accent-color:var(--sc-primary)" aria-label="${esc(s.name)}"></td><td><b>${esc(s.name)}</b> <span class="sc-muted sc-small">${esc(s.code)}</span></td><td><select class="sc-select subjTeacher" data-id="${s.id}" aria-label="${SC.t('Teacher for', 'Mwalimu wa')} ${esc(s.name)}">${teacherOpts(chosen.get(s.id))}</select></td></tr>`).join('') || `<tr><td class="sc-muted">${SC.t('Add subjects first in the Subjects page.', 'Ongeza masomo kwanza kwenye ukurasa wa Masomo.')}</td></tr>`}</tbody></table></div></div>`,
      onSubmit: async (f, form) => {
        const subjects = [...form.querySelectorAll('.subjChk:checked')].map((chk) => ({ subject_id: Number(chk.dataset.id), teacher_id: Number(form.querySelector(`.subjTeacher[data-id="${chk.dataset.id}"]`).value) || null }));
        const body = { name: f.name, level: f.level, stream: f.stream, max_students: Number(f.max_students), teacher_id: f.teacher_id || null, status: f.status, academic_year_id: f.academic_year_id, subjects };
        if (isEdit) await SC.api.put(`/classes/${c.id}`, body); else await SC.api.post('/classes', body);
        SC.closeModal(); await SC.refreshLookups(); SC.toast(isEdit ? SC.t('Class updated successfully.', 'Darasa limesasishwa kwa mafanikio.') : SC.t('Class created successfully.', 'Darasa limeundwa kwa mafanikio.')); done();
      },
    });
  }

  SC.modules.classes = async (el) => {
    async function load() {
      const { classes } = await SC.api.get('/classes');
      const lk = await SC.refreshLookups();
      const years = [...new Set(classes.map((c) => c.year_name))];
      el.innerHTML = `${SC.pageHead(SC.t('Classes', 'Madarasa'), SC.state.role === 'teacher' ? SC.t('Classes you teach', 'Madarasa unayofundisha') : SC.t('Create classes, choose class teachers and set the subjects each class studies', 'Unda madarasa, chagua walimu wa madarasa na weka masomo kila darasa linasoma'), SC.can('classes.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Create Class', 'Unda Darasa')}</button>` : '')}
        ${classes.length ? years.map((y) => `<h3 style="margin:1.2rem 0 .7rem;font-size:1rem">${SC.t('Academic year', 'Mwaka wa Masomo')} ${esc(y)}</h3><div class="sc-grid" style="grid-template-columns:repeat(auto-fill,minmax(290px,1fr))">${classes.filter((c) => c.year_name === y).map((c) => {
          const pct = Math.round((c.current_students / c.max_students) * 100);
          return `<div class="sc-card sc-stack" style="gap:.8rem"><div class="sc-spread"><div><h3 style="font-size:1.1rem">${esc(SC.classLabel(c))}</h3><span class="sc-muted sc-small">${esc(c.level || '')}</span></div>${SC.chip(c.status)}</div>
            <div class="sc-small"><i class="fa-solid fa-chalkboard-user sc-muted"></i> ${esc(c.teacher_name || SC.t('No class teacher', 'Hakuna mwalimu wa darasa'))}</div>
            <div><div class="sc-spread sc-small"><span>${SC.t('Students', 'Wanafunzi')}</span><b>${c.current_students} / ${c.max_students}</b></div>${SC.progress(pct, pct >= 100 ? 'bad' : pct >= 85 ? 'warn' : '')}</div>
            <div class="sc-small sc-muted" title="${esc(c.subject_names || '')}"><i class="fa-solid fa-book-open"></i> ${SC.t(`${c.subject_count} subject${c.subject_count === 1 ? '' : 's'}`, `Masomo ${c.subject_count}`)}${c.subject_names ? ': ' + esc(c.subject_names.slice(0, 70)) + (c.subject_names.length > 70 ? '…' : '') : ''}</div>
            ${SC.can('classes.manage') ? `<div class="sc-row" style="margin-top:auto"><button class="sc-btn ghost sm" data-act="edit" data-id="${c.id}"><i class="fa-solid fa-pen"></i> ${SC.t('Edit', 'Hariri')}</button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${c.id}" data-name="${esc(SC.classLabel(c))}"><i class="fa-solid fa-trash"></i></button></div>` : ''}</div>`;
        }).join('')}</div>`).join('') : `<div class="sc-card">${SC.empty('fa-school', SC.t('No classes yet', 'Hakuna madarasa bado'), SC.t('Create your first class, for example Form One or Special Tuition.', 'Unda darasa lako la kwanza, kwa mfano Kidato cha Kwanza au Masomo Maalum.'), SC.can('classes.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Create Class', 'Unda Darasa')}</button>` : '')}</div>`}`;
      el._classes = classes;
    }
    SC.delegate(el, {
      add: () => classModal(null, load),
      edit: (b) => classModal(el._classes.find((c) => String(c.id) === b.dataset.id), load),
      del: async (b) => {
        if (!(await SC.confirm({ title: SC.t('Delete this class?', 'Futa darasa hili?'), message: SC.t(`<b>${esc(b.dataset.name)}</b> will be deleted. A class that still has students cannot be deleted — move the students first, or mark the class Inactive.`, `<b>${esc(b.dataset.name)}</b> litafutwa. Darasa lenye wanafunzi bado haliwezi kufutwa — hamisha wanafunzi kwanza, au weka darasa Haifanyi kazi.`), confirmText: SC.t('Yes, delete class', 'Ndiyo, futa darasa') }))) return;
        await SC.api.del(`/classes/${b.dataset.id}`); await SC.refreshLookups(); SC.toast(SC.t('Class deleted.', 'Darasa limefutwa.')); load();
      },
    });
    await load();
  };

  // =============================================================== subjects
  async function subjectModal(sub, assignments, done) {
    const lk = await SC.lookups(); const isEdit = !!sub;
    const mine = new Set(assignments.filter((a) => sub && a.subject_id === sub.id).map((a) => a.class_id));
    SC.formModal({
      title: isEdit ? SC.t(`Edit ${sub.name}`, `Hariri ${sub.name}`) : SC.t('Create subject', 'Unda Somo'), submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Create subject', 'Unda Somo'),
      body: `<div class="cols">${SC.f.input('name', SC.t('Subject name', 'Jina la Somo'), { required: true, value: sub ? sub.name : '', placeholder: SC.t('e.g. Mathematics', 'mfano: Hisabati') })}${SC.f.input('code', SC.t('Subject code', 'Msimbo wa Somo'), { required: true, value: sub ? sub.code : '', placeholder: 'e.g. MATH', attr: { maxlength: 12, style: 'text-transform:uppercase' } })}</div>
        <div class="cols">${SC.f.select('teacher_id', SC.t('Teacher', 'Mwalimu'), SC.opts.teachers(lk), { placeholder: SC.t('No teacher yet', 'Bado hakuna mwalimu'), hint: SC.t('Applies to the classes ticked below.', 'Inatumika kwa madarasa yaliyotiwa alama hapo chini.') })}${SC.f.select('status', SC.t('Status', 'Hali'), [['active', SC.t('Active', 'Hai')], ['inactive', SC.t('Inactive', 'Haifanyi kazi')]], { value: sub ? sub.status : 'active', noBlank: true })}</div>
        <div class="sc-field"><label>${SC.t('Classes that study this subject', 'Madarasa yanayosoma somo hili')}</label><div class="sc-row" style="gap:.5rem 1.2rem">${SC.opts.classes(lk, false).map((o) => SC.f.check('class_ids[]', esc(o.l), mine.has(o.v), o.v)).join('') || `<span class="sc-muted sc-small">${SC.t('Create classes first.', 'Unda madarasa kwanza.')}</span>`}</div></div>`,
      onSubmit: async (f) => {
        const body = { name: f.name, code: f.code, status: f.status, teacher_id: f.teacher_id || null, class_ids: (f.class_ids || []).map(Number) };
        if (isEdit) await SC.api.put(`/subjects/${sub.id}`, body); else await SC.api.post('/subjects', body);
        SC.closeModal(); await SC.refreshLookups(); SC.toast(isEdit ? SC.t('Subject updated successfully.', 'Somo limesasishwa kwa mafanikio.') : SC.t('Subject created successfully.', 'Somo limeundwa kwa mafanikio.')); done();
      },
    });
  }

  SC.modules.subjects = async (el) => {
    let data;
    async function load() {
      data = await SC.api.get('/subjects');
      el.innerHTML = `${SC.pageHead(SC.t('Subjects', 'Masomo'), SC.t('The subjects your school teaches', 'Masomo ambayo shule yako inafundisha'), SC.can('subjects.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Create Subject', 'Unda Somo')}</button>` : '')}
        <div class="sc-card">${SC.table([
          { label: SC.t('Subject', 'Somo'), render: (s) => `<b>${esc(s.name)}</b>` }, { label: SC.t('Code', 'Msimbo'), render: (s) => `<span class="sc-chip">${esc(s.code)}</span>` },
          { label: SC.t('Classes', 'Madarasa'), render: (s) => `<span class="sc-small sc-wrap">${esc(s.class_names ? s.class_names.split(',').slice(0, 4).join(', ') + (s.class_names.split(',').length > 4 ? '…' : '') : '—')}</span>` },
          { label: SC.t('Teachers', 'Walimu'), render: (s) => `<span class="sc-small sc-wrap">${esc(s.teacher_names ? s.teacher_names.split(',').slice(0, 3).join(', ') : '—')}</span>` },
          { label: SC.t('Status', 'Hali'), render: (s) => SC.chip(s.status) },
          ...(SC.can('subjects.manage') ? [{ label: '', cls: 'end', render: (s) => `<div class="sc-actions-cell"><button class="sc-btn ghost sm" data-act="edit" data-id="${s.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="del" data-id="${s.id}" data-name="${esc(s.name)}"><i class="fa-solid fa-trash"></i></button></div>` }] : []),
        ], data.subjects, { empty: SC.empty('fa-book-open', SC.t('No subjects yet', 'Hakuna masomo bado'), SC.t('Create subjects such as Mathematics or English.', 'Unda masomo kama Hisabati au Kiingereza.'), SC.can('subjects.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Create Subject', 'Unda Somo')}</button>` : '') })}</div>`;
      el._data = data;
    }
    SC.delegate(el, {
      add: () => subjectModal(null, data.assignments, load),
      edit: (b) => subjectModal(data.subjects.find((s) => String(s.id) === b.dataset.id), data.assignments, load),
      del: async (b) => {
        if (!(await SC.confirm({ title: SC.t('Delete this subject?', 'Futa somo hili?'), message: SC.t(`<b>${esc(b.dataset.name)}</b> will be deleted. A subject that already has results or attendance cannot be deleted — mark it Inactive instead.`, `<b>${esc(b.dataset.name)}</b> litafutwa. Somo lenye matokeo au mahudhurio tayari haliwezi kufutwa — liweke Haifanyi kazi badala yake.`), confirmText: SC.t('Yes, delete subject', 'Ndiyo, futa somo') }))) return;
        await SC.api.del(`/subjects/${b.dataset.id}`); await SC.refreshLookups(); SC.toast(SC.t('Subject deleted.', 'Somo limefutwa.')); load();
      },
    });
    await load();
  };

  // =============================================================== timetable
  SC.timetableGrid = (entries, { canEdit = false } = {}) => {
    if (!entries.length) return SC.empty('fa-calendar-xmark', SC.t('No lessons scheduled', 'Hakuna masomo yaliyopangwa'), SC.t('The timetable is empty for this selection.', 'Ratiba ni tupu kwa uchaguzi huu.'));
    const cols = DAYS().slice(0, 6).map((d, i) => ({ d, i: i + 1 }));
    return `<div class="sc-table-wrap"><div class="sc-tt">${cols.map(({ d, i }) => `<div class="sc-tt-day"><h4>${d}</h4>${entries.filter((e) => e.day_of_week === i).map((e) => `<div class="sc-tt-slot c${e.subject_id % 5}"><div class="tm">${e.start_time}–${e.end_time}</div><div class="sj">${esc(e.subject_name)}</div><div class="mt">${esc([SC.classLabel({ name: e.class_name, stream: e.class_stream }), e.teacher_name, e.room].filter(Boolean).join(' · '))}</div>${canEdit ? `<div class="ed"><button class="sc-btn ghost sm" data-act="ttedit" data-id="${e.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="ttdel" data-id="${e.id}"><i class="fa-solid fa-trash"></i></button></div>` : ''}</div>`).join('') || '<div class="sc-muted sc-small">—</div>'}</div>`).join('')}</div></div>`;
  };

  async function slotModal(entry, defaults, done) {
    const lk = await SC.lookups(); const isEdit = !!entry;
    SC.formModal({
      title: isEdit ? SC.t('Edit lesson', 'Hariri Somo') : SC.t('Add lesson', 'Ongeza Somo'), submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Add to timetable', 'Ongeza kwenye Ratiba'),
      body: `<div class="cols">${SC.f.select('class_id', SC.t('Class', 'Darasa'), SC.opts.classes(lk, true), { required: true, value: entry ? entry.class_id : defaults.class_id })}${SC.f.select('subject_id', SC.t('Subject', 'Somo'), SC.opts.subjects(lk), { required: true, value: entry ? entry.subject_id : '' })}</div>
        <div class="cols">${SC.f.select('teacher_id', SC.t('Teacher', 'Mwalimu'), SC.opts.teachers(lk), { value: entry ? entry.teacher_id || '' : '', placeholder: SC.t("Use the subject's teacher", 'Tumia mwalimu wa somo') })}${SC.f.input('room', SC.t('Room', 'Chumba'), { value: entry ? entry.room || '' : '', placeholder: SC.t('e.g. Room 3', 'mfano: Chumba 3') })}</div>
        <div class="cols-3">${SC.f.select('day_of_week', SC.t('Day', 'Siku'), DAYS().map((d, i) => [i + 1, d]), { required: true, value: entry ? entry.day_of_week : 1, noBlank: true })}${SC.f.input('start_time', SC.t('Start time', 'Muda wa Kuanza'), { type: 'time', required: true, value: entry ? entry.start_time : '08:00' })}${SC.f.input('end_time', SC.t('End time', 'Muda wa Kuisha'), { type: 'time', required: true, value: entry ? entry.end_time : '10:00' })}</div>
        <p class="sc-small sc-muted" style="margin:0">${SC.t('The system warns you if the class, the teacher or the room is already booked at that time.', 'Mfumo utakuonya kama darasa, mwalimu au chumba tayari kimepangwa wakati huo.')}</p>`,
      onSubmit: async (f) => {
        if (f.end_time <= f.start_time) throw new Error(SC.t('The end time must be after the start time.', 'Muda wa kuisha lazima uwe baada ya muda wa kuanza.'));
        const body = { ...f, teacher_id: f.teacher_id || null };
        if (isEdit) await SC.api.put(`/timetable/${entry.id}`, body); else await SC.api.post('/timetable', body);
        SC.closeModal(); SC.toast(isEdit ? SC.t('Lesson updated.', 'Somo limesasishwa.') : SC.t('Lesson added to the timetable.', 'Somo limeongezwa kwenye ratiba.')); done();
      },
    });
  }

  SC.modules.timetable = async (el) => {
    const lk = await SC.lookups(); const parent = SC.isParent();
    if (parent) {
      const { children } = await SC.api.get('/portal');
      if (!children.length) { el.innerHTML = `<div class="sc-card">${SC.empty('fa-child', SC.t('No children linked', 'Hakuna watoto walioungwanishwa'), SC.t('Ask the school to link your children.', 'Muombe shule kuunganisha watoto wako.'))}</div>`; return; }
      let sel = children[0].id;
      const draw = async () => {
        const d = await SC.api.get(`/timetable?student_id=${sel}`);
        el.innerHTML = `${SC.pageHead(SC.t('Timetable', 'Ratiba'), SC.t('Weekly lessons', 'Masomo ya Wiki'))}<div class="sc-toolbar">${children.length > 1 ? `<select class="sc-select" id="kidSel">${children.map((c) => `<option value="${c.id}" ${c.id === sel ? 'selected' : ''}>${esc(c.full_name)}</option>`).join('')}</select>` : ''}</div><div class="sc-card">${SC.timetableGrid(d.entries)}</div>`;
        const s = el.querySelector('#kidSel'); if (s) s.addEventListener('change', () => { sel = Number(s.value); draw(); });
      };
      return draw();
    }
    const st = { class_id: SC.state.role === 'teacher' ? '' : (SC.opts.classes(lk, true)[0] || {}).v || '', teacher_id: SC.state.role === 'teacher' ? SC.state.teacherId || '' : '' };
    async function load() {
      const d = await SC.api.get('/timetable' + SC.qs(st));
      el.innerHTML = `${SC.pageHead(SC.t('Timetable', 'Ratiba'), SC.t('Weekly lessons by class or teacher', 'Masomo ya wiki kwa darasa au mwalimu'), SC.can('timetable.manage') ? `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${SC.t('Add Lesson', 'Ongeza Somo')}</button>` : '')}
        <div class="sc-card"><div class="sc-toolbar"><select class="sc-select" id="ttClass" aria-label="${SC.t('Class', 'Darasa')}"><option value="">${SC.t('All classes', 'Madarasa yote')}</option>${SC.opts.classes(lk, false).map((o) => `<option value="${o.v}" ${String(o.v) === String(st.class_id) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select>
          <select class="sc-select" id="ttTeacher" aria-label="${SC.t('Teacher', 'Mwalimu')}"><option value="">${SC.t('All teachers', 'Walimu wote')}</option>${SC.opts.teachers(lk).map((o) => `<option value="${o.v}" ${String(o.v) === String(st.teacher_id) ? 'selected' : ''}>${esc(o.l)}</option>`).join('')}</select></div>
          ${SC.timetableGrid(d.entries, { canEdit: SC.can('timetable.manage') })}</div>`;
      el._entries = d.entries;
      el.querySelector('#ttClass').addEventListener('change', (e) => { st.class_id = e.target.value; load(); });
      el.querySelector('#ttTeacher').addEventListener('change', (e) => { st.teacher_id = e.target.value; load(); });
    }
    SC.delegate(el, {
      add: () => slotModal(null, { class_id: st.class_id }, load),
      ttedit: (b) => slotModal(el._entries.find((x) => String(x.id) === b.dataset.id), {}, load),
      ttdel: async (b) => { if (!(await SC.confirm({ title: SC.t('Remove this lesson?', 'Ondoa somo hili?'), message: SC.t('The lesson will be removed from the timetable.', 'Somo litaondolewa kwenye ratiba.'), confirmText: SC.t('Yes, remove', 'Ndiyo, ondoa') }))) return; await SC.api.del(`/timetable/${b.dataset.id}`); SC.toast(SC.t('Lesson removed.', 'Somo limeondolewa.')); load(); },
    });
    await load();
  };
})();
