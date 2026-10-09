/* Daily attendance: take attendance, view summaries and repeated-absence alerts. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  SC.modules.attendance = async (el) => {
    const { classes } = await SC.api.get('/classes');
    const active = classes.filter((c) => c.status === 'active');
    const canTake = SC.can('attendance.take');
    const firstWith = active.find((c) => c.current_students > 0) || active[0];
    const st = { class_id: firstWith ? firstWith.id : '', date: SC.today(), subject_id: '' };
    let sheet = null; let marks = {};

    const [sum, alerts] = await Promise.all([SC.api.get('/attendance/summary').catch(() => null), SC.api.get('/attendance/alerts').catch(() => null)]);
    const card = (label, r, icon) => SC.stat(icon, r && r.percent != null ? `${r.percent}%` : '—', label, r && r.percent != null ? SC.t(`${r.present} present · ${r.absent} absent · ${r.late} late`, `Yupo ${r.present} · Hayupo ${r.absent} · Amechelewa ${r.late}`) : SC.t('No attendance recorded', 'Hakuna mahudhurio yaliyorekodiwa'), r && r.percent != null && r.percent < 75 ? 'red' : 'green');

    el.innerHTML = `${SC.pageHead(SC.t('Attendance', 'Mahudhurio'), canTake ? SC.t('Choose a date and class, mark each student, then save', 'Chagua tarehe na darasa, weka alama kwa kila mwanafunzi, kisha hifadhi') : SC.t('View attendance records', 'Ona kumbukumbu za mahudhurio'))}
      ${sum ? `<div class="sc-grid stats" style="margin-bottom:1.1rem">${card(SC.t('Today', 'Leo'), sum.day, 'fa-calendar-day')}${card(SC.t('This week', 'Wiki hii'), sum.week, 'fa-calendar-week')}${card(SC.t('This month', 'Mwezi huu'), sum.month, 'fa-calendar')}</div>` : ''}
      ${alerts && alerts.alerts.length ? `<div class="sc-alert" style="margin-bottom:1.1rem"><i class="fa-solid fa-user-clock"></i><div><b>${SC.t('Repeated absences this month', 'Kutokuhudhuria Mara kwa Mara Mwezi Huu')}</b> ${SC.t(`(${alerts.threshold}+ sessions)`, `(vipindi ${alerts.threshold}+)`)}<ul style="margin:.4rem 0 0;padding-left:1.1rem">${alerts.alerts.slice(0, 6).map((a) => `<li>${esc(a.message)} <span class="sc-muted">${esc(a.class_name || '')}</span> <a href="#student/${a.student_id}">${SC.t('View', 'Ona')}</a></li>`).join('')}</ul></div></div>` : ''}
      <div class="sc-card"><div class="sc-toolbar">
        <div class="sc-field"><label for="aDate">${SC.t('Date', 'Tarehe')}</label><input class="sc-input" id="aDate" type="date" value="${st.date}" max="${SC.today()}"></div>
        <div class="sc-field"><label for="aClass">${SC.t('Class', 'Darasa')}</label><select class="sc-select" id="aClass">${active.map((c) => `<option value="${c.id}" ${String(c.id) === String(st.class_id) ? 'selected' : ''}>${esc(SC.classLabel(c))} (${c.current_students})</option>`).join('') || `<option value="">${SC.t('No classes', 'Hakuna madarasa')}</option>`}</select></div>
        <div class="sc-field"><label for="aSubj">${SC.t('Subject / session', 'Somo / Kipindi')}</label><select class="sc-select" id="aSubj"><option value="">${SC.t('Whole day (general)', 'Siku Nzima (jumla)')}</option></select></div></div>
        <div id="aSheet">${active.length ? SC.skeleton(6) : SC.empty('fa-school', SC.t('No classes to show', 'Hakuna madarasa ya kuonyesha'), SC.state.role === 'teacher' ? SC.t('You have not been assigned to a class yet. Ask your administrator.', 'Bado hujapangwa darasa. Muulize msimamizi wako.') : SC.t('Create a class first.', 'Unda darasa kwanza.'))}</div></div>`;

    const q = (s) => el.querySelector(s);
    async function loadSubjects() {
      const sel = q('#aSubj'); sel.innerHTML = `<option value="">${SC.t('Whole day (general)', 'Siku Nzima (jumla)')}</option>`; st.subject_id = '';
      if (!st.class_id) return;
      try { const d = await SC.api.get(`/classes/${st.class_id}`); sel.innerHTML += d.subjects.map((s) => `<option value="${s.subject_id}">${esc(s.name)}</option>`).join(''); } catch (e) { /* optional */ }
    }
    async function loadSheet() {
      const box = q('#aSheet'); if (!st.class_id) return;
      box.innerHTML = SC.skeleton(6);
      try {
        sheet = await SC.api.get('/attendance/sheet' + SC.qs({ class_id: st.class_id, date: st.date, subject_id: st.subject_id }));
      } catch (e) { box.innerHTML = SC.errorBox(e); return; }
      marks = Object.fromEntries(sheet.students.map((s) => [s.id, s.status]));
      draw();
    }
    function counts() { const c = { present: 0, absent: 0, late: 0, none: 0 }; sheet.students.forEach((s) => { c[marks[s.id] || 'none'] += 1; }); return c; }
    function draw() {
      const box = q('#aSheet'); const editable = sheet.can_take;
      if (!sheet.students.length) { box.innerHTML = SC.empty('fa-user-slash', SC.t('No students in this class', 'Hakuna wanafunzi darasani hapa'), SC.t('Register students into this class, then come back to take attendance.', 'Sajili wanafunzi darasani hapa, kisha urudi kuchukua mahudhurio.')); return; }
      const c = counts();
      box.innerHTML = `<div class="sc-spread" style="margin-bottom:.9rem"><div class="sc-row" style="gap:.5rem"><span class="sc-chip present">${SC.t('Present', 'Yupo')} <b id="cP">${c.present}</b></span><span class="sc-chip absent">${SC.t('Absent', 'Hayupo')} <b id="cA">${c.absent}</b></span><span class="sc-chip late">${SC.t('Late', 'Amechelewa')} <b id="cL">${c.late}</b></span><span class="sc-chip">${SC.t('Not marked', 'Hajawekwa Alama')} <b id="cN">${c.none}</b></span>${sheet.already_saved ? `<span class="sc-chip info"><i class="fa-solid fa-circle-info"></i> ${SC.t('Already saved — changes will update it', 'Tayari imehifadhiwa — mabadiliko yataisasisha')}</span>` : ''}</div>
        ${editable ? `<div class="sc-row"><button class="sc-btn ghost sm" data-act="allp"><i class="fa-solid fa-check-double"></i> ${SC.t('Mark all present', 'Weka Wote Wapo')}</button><button class="sc-btn ghost sm" data-act="alla"><i class="fa-solid fa-xmark"></i> ${SC.t('Mark all absent', 'Weka Wote Hawapo')}</button></div>` : ''}</div>
        ${SC.table([
          { label: '#', render: (s) => sheet.students.indexOf(s) + 1 },
          { label: SC.t('Student', 'Mwanafunzi'), render: (s) => `<div class="sc-person">${SC.avatar('students', s.id, s.full_name, false)}<span class="nm">${esc(s.full_name)}</span></div>` },
          { label: SC.t('Student ID', 'Namba ya Mwanafunzi'), render: (s) => esc(s.admission_no) },
          { label: SC.t('Attendance', 'Mahudhurio'), render: (s) => editable ? `<div class="sc-seg" data-sid="${s.id}">${['present', 'absent', 'late'].map((k) => `<button type="button" class="${k} ${marks[s.id] === k ? 'on' : ''}" data-act="mark" data-sid="${s.id}" data-k="${k}">${SC.isSw() ? { present: 'Yupo', absent: 'Hayupo', late: 'Amechelewa' }[k] : SC.cap(k)}</button>`).join('')}</div>` : (marks[s.id] ? SC.chip(marks[s.id]) : `<span class="sc-muted">${SC.t('Not marked', 'Hajawekwa Alama')}</span>`) },
        ], sheet.students, { cls: 'compact' })}
        ${editable ? `<div class="sc-row" style="justify-content:flex-end;margin-top:1rem"><button class="sc-btn primary lg" data-act="save"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save attendance', 'Hifadhi Mahudhurio')}</button></div>` : ''}`;
    }
    const refreshCounters = () => { const c = counts(); q('#cP').textContent = c.present; q('#cA').textContent = c.absent; q('#cL').textContent = c.late; q('#cN').textContent = c.none; };

    SC.delegate(el, {
      mark: (b) => {
        marks[b.dataset.sid] = b.dataset.k;
        b.closest('.sc-seg').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); refreshCounters();
      },
      allp: () => { sheet.students.forEach((s) => { marks[s.id] = 'present'; }); draw(); },
      alla: async () => {
        if (!(await SC.confirm({ title: SC.t('Mark everyone absent?', 'Weka kila mtu hayupo?'), message: SC.t('All students in this list will be set to Absent. You can still change individual students before saving.', 'Wanafunzi wote kwenye orodha hii watawekwa Hawapo. Bado unaweza kubadilisha wanafunzi binafsi kabla ya kuhifadhi.'), confirmText: SC.t('Yes, mark all absent', 'Ndiyo, weka wote hawapo'), danger: false, icon: 'fa-user-xmark' }))) return;
        sheet.students.forEach((s) => { marks[s.id] = 'absent'; }); draw();
      },
      save: async (b) => {
        const records = sheet.students.filter((s) => marks[s.id]).map((s) => ({ student_id: s.id, status: marks[s.id] }));
        const missing = sheet.students.length - records.length;
        if (!records.length) return SC.toast(SC.t('Please mark at least one student first.', 'Tafadhali weka alama kwa angalau mwanafunzi mmoja kwanza.'), 'warn');
        if (missing && !(await SC.confirm({ title: SC.t('Some students are not marked', 'Baadhi ya wanafunzi hawajawekwa alama'), message: SC.t(`${missing} student${missing === 1 ? ' is' : 's are'} not marked and will be skipped. Save anyway?`, `Wanafunzi ${missing} hawajawekwa alama na wataruka. Hifadhi hata hivyo?`), confirmText: SC.t('Save anyway', 'Hifadhi hata hivyo'), danger: false, icon: 'fa-floppy-disk' }))) return;
        b.disabled = true; b.innerHTML = `<span class="sc-spin"></span> ${SC.t('Saving…', 'Inahifadhi…')}`;
        try { const r = await SC.api.post('/attendance', { class_id: Number(st.class_id), date: st.date, subject_id: st.subject_id ? Number(st.subject_id) : null, records });
          SC.toast(SC.t(`Attendance saved. ${r.present} present, ${r.absent} absent, ${r.late} late.`, `Mahudhurio yamehifadhiwa. Yupo ${r.present}, Hayupo ${r.absent}, Amechelewa ${r.late}.`)); sheet.already_saved = true; draw(); }
        catch (e) { SC.fail(e); b.disabled = false; b.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save attendance', 'Hifadhi Mahudhurio')}`; }
      },
    });
    q('#aDate').addEventListener('change', (e) => { if (e.target.value > SC.today()) { e.target.value = SC.today(); SC.toast(SC.t('You cannot take attendance for a future date.', 'Huwezi kuchukua mahudhurio ya tarehe ijayo.'), 'warn'); } st.date = e.target.value || SC.today(); loadSheet(); });
    q('#aClass').addEventListener('change', async (e) => { st.class_id = e.target.value; await loadSubjects(); loadSheet(); });
    q('#aSubj').addEventListener('change', (e) => { st.subject_id = e.target.value; loadSheet(); });
    if (active.length) { await loadSubjects(); await loadSheet(); }
  };
})();
