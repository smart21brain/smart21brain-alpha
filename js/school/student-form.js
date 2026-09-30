/* Student registration / edit form (includes parent-guardian picker and success screen). */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const RELATIONS = () => [SC.t('Father', 'Baba'), SC.t('Mother', 'Mama'), SC.t('Guardian', 'Mlezi'), SC.t('Grandparent', 'Babu / Bibi'), SC.t('Uncle / Aunt', 'Mjomba / Shangazi'), SC.t('Sibling', 'Ndugu'), SC.t('Other', 'Nyingine')];

  SC.modules.studentForm = async (el, editId) => {
    if (editId ? !SC.can('students.edit') : !SC.can('students.create')) { el.innerHTML = `<div class="sc-card">${SC.empty('fa-lock', SC.t('Not allowed', 'Haijaruhusiwa'), SC.t('You do not have permission to do this. Ask your school administrator.', 'Huna ruhusa ya kufanya hivi. Muulize msimamizi wa shule yako.'))}</div>`; return; }
    const lk = await SC.lookups();
    const isEdit = !!editId;
    let s = null;
    if (isEdit) s = (await SC.api.get(`/students/${editId}`)).student;
    SC.setTitle(isEdit ? SC.t(`Edit ${s.full_name}`, `Hariri ${s.full_name}`) : SC.t('Register Student', 'Sajili Mwanafunzi'), isEdit ? s.admission_no : SC.t('Fill in the form — fields marked * are required', 'Jaza fomu — sehemu zenye * zinahitajika'));

    // guardians state (kept in memory; snapshot() copies current form values back)
    let guardians = isEdit
      ? s.parents.map((p) => ({ parent_id: p.id, label: `${p.full_name} · ${p.phone}`, relationship: p.relationship }))
      : [{ full_name: '', phone: '', alt_phone: '', email: '', address: '', occupation: '', relationship: 'Father' }];
    let selectedSubjects = isEdit ? s.subjects.map((x) => x.id) : null;

    const classOpts = SC.opts.classes(lk, true);
    const curClass = s && s.class ? s.class.id : '';
    el.innerHTML = `${SC.pageHead(isEdit ? SC.t('Edit student', 'Hariri Mwanafunzi') : SC.t('Register a new student', 'Sajili Mwanafunzi Mpya'), isEdit ? SC.t("Update the student's details", 'Sasisha taarifa za mwanafunzi') : SC.t('A Student ID is created automatically when you save.', 'Namba ya mwanafunzi inatengenezwa kiotomatiki unapohifadhi.'), `<a class="sc-btn ghost" href="#${isEdit ? 'student/' + editId : 'students'}"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>`)}
      <div id="formArea"><form class="sc-stack" id="stForm" novalidate>
        <div class="sc-form-error" role="alert"></div>
        <div class="sc-card sc-form">${SC.f.section('fa-user', SC.t('Personal information', 'Taarifa Binafsi'))}
          <div class="cols">${SC.f.input('adm', SC.t('Student ID / Admission number', 'Namba ya Mwanafunzi / Usajili'), { value: isEdit ? s.admission_no : '', attr: { readonly: true }, hint: isEdit ? '' : SC.t('Created automatically when you save.', 'Inatengenezwa kiotomatiki unapohifadhi.'), placeholder: SC.t('Automatic', 'Kiotomatiki') })}${SC.f.select('gender', SC.t('Gender', 'Jinsia'), SC.opts.gender, { required: true, value: s ? s.gender : '' })}</div>
          <div class="cols-3">${SC.f.input('first_name', SC.t('First name', 'Jina la Kwanza'), { required: true, value: s ? s.first_name : '', attr: { maxlength: 60, autocomplete: 'off' } })}${SC.f.input('middle_name', SC.t('Middle name', 'Jina la Kati'), { value: s ? s.middle_name || '' : '' })}${SC.f.input('last_name', SC.t('Last name', 'Jina la Mwisho'), { required: true, value: s ? s.last_name : '' })}</div>
          <div class="cols-3">${SC.f.input('date_of_birth', SC.t('Date of birth', 'Tarehe ya Kuzaliwa'), { type: 'date', value: s ? s.date_of_birth || '' : '', attr: { max: SC.today() } })}${SC.f.input('nationality', SC.t('Nationality', 'Taifa'), { value: s ? s.nationality || '' : 'Tanzanian' })}${SC.f.input('phone', SC.t('Phone number', 'Namba ya Simu'), { type: 'tel', value: s ? s.phone || '' : '', placeholder: SC.t('Optional', 'Si lazima') })}</div>
          <div class="cols">${SC.f.input('email', SC.t('Email', 'Barua pepe'), { type: 'email', value: s ? s.email || '' : '', placeholder: SC.t('Optional', 'Si lazima') })}${SC.f.input('address', SC.t('Address', 'Anwani'), { value: s ? s.address || '' : '' })}</div>
          <div class="sc-field"><label>${SC.t('Student photo', 'Picha ya Mwanafunzi')}</label>${SC.photoField('photo', isEdit && s.has_photo ? SC.photoUrl('students', s.id) : '')}</div></div>

        <div class="sc-card sc-form">${SC.f.section('fa-graduation-cap', SC.t('Academic information', 'Taarifa za Kitaaluma'))}
          <div class="cols-3">${SC.f.select('class_id', SC.t('Class', 'Darasa'), classOpts, { required: true, value: curClass, placeholder: SC.t('Choose a class', 'Chagua darasa') })}${SC.f.input('stream', SC.t('Stream', 'Mkondo'), { attr: { readonly: true }, placeholder: SC.t('From the class', 'Kutoka darasani') })}${SC.f.input('year', SC.t('Academic year', 'Mwaka wa Masomo'), { attr: { readonly: true }, value: s && s.class ? s.class.year_name : '', placeholder: SC.t('From the class', 'Kutoka darasani') })}</div>
          <div class="sc-field"><label>${SC.t('Subjects', 'Masomo')}</label><div id="subjBox" class="sc-row" style="gap:.5rem 1.2rem"><span class="sc-muted sc-small">${SC.t('Choose a class to see its subjects.', 'Chagua darasa kuona masomo yake.')}</span></div><span class="hint">${SC.t('All subjects of the class are selected by default. Untick the ones this student does not take.', 'Masomo yote ya darasa yamechaguliwa kwa kawaida. Ondoa yale ambayo mwanafunzi huyu hasomi.')}</span></div>
          <div class="cols-3">${SC.f.input('admission_date', SC.t('Admission date', 'Tarehe ya Kujiunga'), { type: 'date', value: s ? s.admission_date : SC.today(), attr: { max: SC.today() } })}${SC.f.select('status', SC.t('Student status', 'Hali ya Mwanafunzi'), SC.opts.status, { value: s ? s.status : 'active', noBlank: true })}${SC.f.input('previous_school', SC.t('Previous school', 'Shule ya Awali'), { value: s ? s.previous_school || '' : '', placeholder: SC.t('Optional', 'Si lazima') })}</div></div>

        <div class="sc-card sc-form"><div class="sc-spread">${SC.f.section('fa-people-roof', SC.t('Parent / guardian information', 'Taarifa za Mzazi / Mlezi'))}<span class="sc-small sc-muted">${SC.t('One parent can have many children — pick an existing parent for brothers and sisters.', 'Mzazi mmoja anaweza kuwa na watoto wengi — chagua mzazi aliyepo kwa ndugu.')}</span></div>
          <div id="gBox" class="sc-stack"></div>
          <div class="sc-row"><button type="button" class="sc-btn ghost sm" data-act="gnew"><i class="fa-solid fa-plus"></i> ${SC.t('Add another guardian', 'Ongeza Mlezi Mwingine')}</button><button type="button" class="sc-btn soft sm" data-act="gfind"><i class="fa-solid fa-magnifying-glass"></i> ${SC.t('Choose an existing parent', 'Chagua Mzazi Aliyepo')}</button></div></div>

        <div class="sc-row" style="justify-content:flex-end;position:sticky;bottom:0;padding:.8rem 0;background:linear-gradient(0deg,var(--sc-bg) 60%,transparent)">
          <a class="sc-btn ghost" href="#${isEdit ? 'student/' + editId : 'students'}">${SC.t('Cancel', 'Ghairi')}</a><button type="submit" class="sc-btn primary lg" id="saveBtn"><i class="fa-solid fa-floppy-disk"></i> ${isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Register student', 'Sajili Mwanafunzi')}</button></div>
      </form></div>`;

    const form = el.querySelector('#stForm');
    SC.wirePhotoField(form);
    form.querySelectorAll('input[type=tel]').forEach((i) => { i.dataset.kind = 'phone'; });

    // ---------- subjects by class
    async function loadSubjects(classId, keep) {
      const box = form.querySelector('#subjBox'); const cls = lk.classes.find((c) => String(c.id) === String(classId));
      form.querySelector('[name=stream]').value = cls ? cls.stream || '—' : '';
      const yr = cls && (lk.years || []).find((y) => y.id === cls.academic_year_id); form.querySelector('[name=year]').value = yr ? yr.name : '';
      if (!classId) { box.innerHTML = `<span class="sc-muted sc-small">${SC.t('Choose a class to see its subjects.', 'Chagua darasa kuona masomo yake.')}</span>`; return; }
      box.innerHTML = '<span class="sc-spin"></span>';
      const d = await SC.api.get(`/classes/${classId}`);
      const active = d.subjects.filter((x) => (lk.subjects.find((z) => z.id === x.subject_id) || {}).status !== 'inactive');
      if (!active.length) { box.innerHTML = `<span class="sc-alert" style="width:100%"><i class="fa-solid fa-circle-info"></i><span>${SC.t('This class has no subjects yet. Add subjects to the class in <a href="#classes">Classes</a>.', 'Darasa hili halina masomo bado. Ongeza masomo darasani kupitia <a href="#classes">Madarasa</a>.')}</span></span>`; return; }
      box.innerHTML = active.map((x) => SC.f.check('subject_ids[]', esc(x.name), keep ? (selectedSubjects || []).includes(x.subject_id) : true, x.subject_id)).join('');
    }
    form.querySelector('[name=class_id]').addEventListener('change', (e) => { selectedSubjects = null; loadSubjects(e.target.value, false).catch(SC.fail); });
    if (curClass) loadSubjects(curClass, true).catch(SC.fail);

    // ---------- guardians
    const gBox = form.querySelector('#gBox');
    const snapshot = () => {
      guardians = guardians.map((g, i) => {
        if (g.parent_id) { const r = form.querySelector(`[name=g${i}_relationship]`); return { ...g, relationship: r ? r.value : g.relationship }; }
        const v = (k) => { const n = form.querySelector(`[name=g${i}_${k}]`); return n ? n.value : ''; };
        return { full_name: v('full_name'), phone: v('phone'), alt_phone: v('alt_phone'), email: v('email'), address: v('address'), occupation: v('occupation'), relationship: v('relationship') };
      });
    };
    const relSelect = (i, val) => SC.f.select(`g${i}_relationship`, SC.t('Relationship', 'Uhusiano'), RELATIONS().map((r) => [r, r]), { value: RELATIONS().includes(val) ? val : 'Guardian', noBlank: true, required: true });
    function renderGuardians() {
      gBox.innerHTML = guardians.map((g, i) => g.parent_id
        ? `<div class="sc-card flat sc-form" style="background:var(--sc-primary-50)"><div class="sc-spread"><div class="sc-person"><span class="sc-avatar">${esc(SC.initials(g.label))}</span><div><div class="nm">${esc(g.label)}</div><div class="sb sc-muted">${SC.t('Existing parent', 'Mzazi Aliyepo')}${i === 0 ? SC.t(' · primary contact', ' · mawasiliano makuu') : ''}</div></div></div>${guardians.length > 1 ? `<button type="button" class="sc-btn danger-ghost sm" data-act="gdel" data-i="${i}"><i class="fa-solid fa-xmark"></i> ${SC.t('Remove', 'Ondoa')}</button>` : ''}</div><div class="cols">${relSelect(i, g.relationship)}</div></div>`
        : `<div class="sc-card flat sc-form" style="background:var(--sc-surface-2)"><div class="sc-spread"><b>${i === 0 ? SC.t('Primary parent / guardian', 'Mzazi / Mlezi Mkuu') : SC.t('Additional guardian', 'Mlezi wa Ziada')}</b>${guardians.length > 1 ? `<button type="button" class="sc-btn danger-ghost sm" data-act="gdel" data-i="${i}"><i class="fa-solid fa-xmark"></i> ${SC.t('Remove', 'Ondoa')}</button>` : ''}</div>
          <div class="cols">${SC.f.input(`g${i}_full_name`, SC.t('Parent / guardian name', 'Jina la Mzazi / Mlezi'), { required: true, value: g.full_name })}${relSelect(i, g.relationship)}</div>
          <div class="cols">${SC.f.input(`g${i}_phone`, SC.t('Phone number', 'Namba ya Simu'), { type: 'tel', required: true, value: g.phone, placeholder: '+255 …', attr: { 'data-kind': 'phone' } })}${SC.f.input(`g${i}_alt_phone`, SC.t('Alternative phone', 'Simu Nyingine'), { type: 'tel', value: g.alt_phone, attr: { 'data-kind': 'phone' } })}</div>
          <div class="cols">${SC.f.input(`g${i}_email`, SC.t('Email', 'Barua pepe'), { type: 'email', value: g.email, placeholder: SC.t('Optional', 'Si lazima') })}${SC.f.input(`g${i}_occupation`, SC.t('Occupation', 'Kazi'), { value: g.occupation })}</div>
          ${SC.f.input(`g${i}_address`, SC.t('Address', 'Anwani'), { value: g.address })}</div>`).join('');
    }
    renderGuardians();

    const pickExisting = () => {
      const back = SC.modal(SC.t('Choose an existing parent', 'Chagua Mzazi Aliyepo'), `<input class="sc-input" id="pQ" type="search" placeholder="${SC.t('Type a name or phone number…', 'Andika jina au namba ya simu…')}" autocomplete="off"><div id="pRes" style="margin-top:.8rem" class="sc-list"><div class="sc-muted sc-small">${SC.t('Start typing to search…', 'Anza kuandika kutafuta…')}</div></div>`);
      const run = SC.debounce(async () => {
        const q = back.querySelector('#pQ').value.trim(); const box = back.querySelector('#pRes');
        if (q.length < 2) { box.innerHTML = `<div class="sc-muted sc-small">${SC.t('Type at least 2 letters.', 'Andika angalau herufi 2.')}</div>`; return; }
        try {
          const d = await SC.api.get('/parents' + SC.qs({ q, limit: 8 }));
          box.innerHTML = d.parents.length ? d.parents.map((p) => `<div class="sc-spread"><div><b>${esc(p.full_name)}</b><div class="sc-small sc-muted">${esc(p.phone)}${p.children ? SC.t(' · Children: ', ' · Watoto: ') + esc(p.children) : ''}</div></div><button class="sc-btn primary sm" data-pick="${p.id}" data-label="${esc(p.full_name)} · ${esc(p.phone)}">${SC.t('Choose', 'Chagua')}</button></div>`).join('') : `<div class="sc-muted">${SC.t("No parent found. Close this window and fill in the new parent's details instead.", 'Hakuna mzazi aliyepatikana. Funga dirisha hili na ujaze taarifa za mzazi mpya badala yake.')}</div>`;
        } catch (e) { box.innerHTML = `<div class="sc-form-error show">${esc(e.message)}</div>`; }
      }, 250);
      back.querySelector('#pQ').addEventListener('input', run);
      back.addEventListener('click', (e) => {
        const b = e.target.closest('[data-pick]'); if (!b) return;
        snapshot();
        if (guardians.some((g) => String(g.parent_id) === b.dataset.pick)) { SC.toast(SC.t('This parent is already added.', 'Mzazi huyu tayari ameongezwa.'), 'warn'); return; }
        // replace an untouched blank first guardian, otherwise append
        if (guardians.length === 1 && !guardians[0].parent_id && !guardians[0].full_name && !guardians[0].phone) guardians = [];
        guardians.push({ parent_id: Number(b.dataset.pick), label: b.dataset.label, relationship: 'Guardian' });
        SC.closeModal(); renderGuardians();
      });
    };
    SC.delegate(form, {
      gnew: () => { if (guardians.length >= 4) return SC.toast(SC.t('A student can have up to 4 guardians.', 'Mwanafunzi anaweza kuwa na walezi hadi 4.'), 'warn'); snapshot(); guardians.push({ full_name: '', phone: '', alt_phone: '', email: '', address: '', occupation: '', relationship: 'Mother' }); renderGuardians(); },
      gfind: pickExisting,
      gdel: (b) => { snapshot(); guardians.splice(Number(b.dataset.i), 1); renderGuardians(); },
    });

    // ---------- submit
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const errBox = form.querySelector('.sc-form-error'); errBox.classList.remove('show');
      if (!SC.validate(form)) return SC.toast(SC.t('Please fix the highlighted fields.', 'Tafadhali rekebisha sehemu zilizoangaziwa.'), 'warn');
      snapshot();
      const f = SC.formData(form);
      const payload = {
        first_name: f.first_name, middle_name: f.middle_name, last_name: f.last_name, gender: f.gender, date_of_birth: f.date_of_birth, nationality: f.nationality, phone: f.phone, email: f.email, address: f.address,
        previous_school: f.previous_school, admission_date: f.admission_date, status: f.status, class_id: f.class_id, subject_ids: (f.subject_ids || []).map(Number),
        guardians: guardians.map((g, i) => ({ ...g, is_primary: i === 0 })),
      };
      if (!payload.subject_ids.length && form.querySelector('#subjBox input')) { errBox.textContent = SC.t('Please choose at least one subject for this student.', 'Tafadhali chagua angalau somo moja kwa mwanafunzi huyu.'); errBox.classList.add('show'); errBox.scrollIntoView({ block: 'center' }); return; }
      const btn = form.querySelector('#saveBtn'); const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = `<span class="sc-spin"></span> ${SC.t('Saving…', 'Inahifadhi…')}`;
      try {
        const res = isEdit ? await SC.api.put(`/students/${editId}`, payload) : await SC.api.post('/students', payload);
        const id = isEdit ? editId : res.id;
        let photoOk = true;
        try { await SC.uploadPhoto(`/students/${id}/photo`, form); } catch (pe) { photoOk = false; SC.toast(SC.t(`Saved, but the photo was not uploaded: ${pe.message}`, `Imehifadhiwa, lakini picha haikupakiwa: ${pe.message}`), 'warn'); }
        if (isEdit) { SC.toast(SC.t('Student updated successfully.', 'Mwanafunzi amesasishwa kwa mafanikio.')); location.hash = `student/${id}`; return; }
        success(el, res, photoOk);
      } catch (err) {
        errBox.textContent = err.message; errBox.classList.add('show'); errBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
        btn.disabled = false; btn.innerHTML = label;
      }
    });
  };

  function success(el, res) {
    SC.toast(SC.t('Student registered successfully.', 'Mwanafunzi amesajiliwa kwa mafanikio.'));
    el.querySelector('#formArea').innerHTML = `<div class="sc-card sc-center" style="max-width:560px;margin:2rem auto;padding:2.2rem 1.4rem"><div class="sc-empty" style="padding:0 0 1rem"><div class="ico" style="background:var(--sc-ok-bg);color:var(--sc-ok)"><i class="fa-solid fa-circle-check"></i></div><h4 style="font-size:1.35rem">${SC.t('Student registered successfully.', 'Mwanafunzi amesajiliwa kwa mafanikio.')}</h4><p style="margin:0 auto">${SC.t(`${esc(res.full_name)} has been added to the school.`, `${esc(res.full_name)} ameongezwa shuleni.`)}</p></div>
      <div style="background:var(--sc-primary-50);border-radius:16px;padding:1rem;margin:.4rem 0 1.4rem"><div class="sc-muted sc-small">${SC.t('Student ID', 'Namba ya Mwanafunzi')}</div><div style="font-family:var(--sc-font-display);font-size:1.7rem;font-weight:700;color:var(--sc-primary)">${esc(res.admission_no)}</div></div>
      <div class="sc-row" style="justify-content:center"><a class="sc-btn primary" href="#student/${res.id}"><i class="fa-solid fa-eye"></i> ${SC.t('View Student', 'Ona Mwanafunzi')}</a><button class="sc-btn ghost" data-act="idc"><i class="fa-solid fa-id-card"></i> ${SC.t('Print ID Card', 'Chapisha Kitambulisho')}</button><a class="sc-btn ghost" href="#student/new" data-act="again"><i class="fa-solid fa-user-plus"></i> ${SC.t('Register Another Student', 'Sajili Mwanafunzi Mwingine')}</a></div></div>`;
    SC.delegate(el, { idc: () => SC.idCardModal(res.id), again: () => { location.hash = 'student/new'; SC.route(); } });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
})();
