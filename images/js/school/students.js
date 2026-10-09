/* Students: search & control page, detailed profile, ID card, printable profile. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  // =============================================================== list
  SC.modules.students = async (el) => {
    const lk = await SC.lookups();
    const showFees = SC.can('fees.view');
    const st = { page: 1, limit: 20, q: '', class_id: '', gender: '', status: '', year: '' };

    el.innerHTML = `${SC.pageHead(SC.t('Students', 'Wanafunzi'), SC.state.role === 'teacher' ? SC.t('Students in your classes', 'Wanafunzi katika madarasa yako') : SC.t('Search, filter and manage every student', 'Tafuta, chuja na simamia kila mwanafunzi'), SC.can('students.create') ? `<a class="sc-btn primary" href="#student/new"><i class="fa-solid fa-user-plus"></i> ${SC.t('Register Student', 'Sajili Mwanafunzi')}</a>` : '')}
      <div class="sc-card">
        <div class="sc-toolbar">
          <input class="sc-input grow" id="fQ" type="search" placeholder="${SC.t('Search by name, student ID or phone…', 'Tafuta kwa jina, namba ya mwanafunzi au simu…')}" aria-label="${SC.t('Search students', 'Tafuta wanafunzi')}">
          <select class="sc-select" id="fClass" aria-label="${SC.t('Class', 'Darasa')}"><option value="">${SC.t('All classes', 'Madarasa yote')}</option>${SC.opts.classes(lk, false).map((o) => `<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select>
          <select class="sc-select" id="fGender" aria-label="${SC.t('Gender', 'Jinsia')}"><option value="">${SC.t('Any gender', 'Jinsia yoyote')}</option><option value="male">${SC.t('Male', 'Mwanaume')}</option><option value="female">${SC.t('Female', 'Mwanamke')}</option></select>
          <select class="sc-select" id="fStatus" aria-label="${SC.t('Status', 'Hali')}"><option value="">${SC.t('Any status', 'Hali yoyote')}</option>${SC.opts.status.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sc-select" id="fYear" aria-label="${SC.t('Academic year', 'Mwaka wa Masomo')}"><option value="">${SC.t('Current year', 'Mwaka wa Sasa')}</option>${SC.opts.years(lk).map((o) => `<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select>
          <button class="sc-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> ${SC.t('Clear', 'Futa')}</button>
        </div>
        <div id="stList">${SC.skeleton(6)}</div>
      </div>`;

    const listEl = el.querySelector('#stList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SC.api.get('/students' + SC.qs({ ...st }));
        const cols = [
          { label: SC.t('Student', 'Mwanafunzi'), render: (s) => `<a href="#student/${s.id}" class="sc-person">${SC.avatar('students', s.id, s.full_name, s.has_photo)}<span><span class="nm" style="color:var(--sc-text)">${esc(s.full_name)}</span></span></a>` },
          { label: SC.t('Student ID', 'Namba ya Mwanafunzi'), render: (s) => `<span class="sc-nowrap">${esc(s.admission_no)}</span>` },
          { label: SC.t('Gender', 'Jinsia'), render: (s) => SC.cap(s.gender) },
          { label: SC.t('Class', 'Darasa'), render: (s) => esc(s.class_name || '—') },
          { label: SC.t('Parent', 'Mzazi'), render: (s) => s.parent_name ? `${esc(s.parent_name)}<div class="sc-small sc-muted">${esc(s.parent_phone || '')}</div>` : '—' },
          { label: SC.t('Attendance', 'Mahudhurio'), render: (s) => s.attendance_percent == null ? '<span class="sc-muted">—</span>' : `<div style="min-width:90px"><b>${s.attendance_percent}%</b>${SC.progress(s.attendance_percent, SC.pctTone(s.attendance_percent))}</div>` },
          ...(showFees ? [{ label: SC.t('Fee balance', 'Deni la Ada'), render: (s) => s.fee_status ? `<b>${SC.num(s.fee_balance)}</b><div>${SC.chip(s.fee_status)}</div>` : '<span class="sc-muted">—</span>' }] : []),
          { label: SC.t('Status', 'Hali'), render: (s) => SC.chip(s.status) },
          { label: SC.t('Actions', 'Vitendo'), cls: 'end', render: (s) => `<div class="sc-actions-cell"><a class="sc-btn ghost sm" href="#student/${s.id}" title="${SC.t('View profile', 'Ona wasifu')}"><i class="fa-solid fa-eye"></i></a>${SC.can('students.edit') ? `<a class="sc-btn ghost sm" href="#student/${s.id}/edit" title="${SC.t('Edit', 'Hariri')}"><i class="fa-solid fa-pen"></i></a>` : ''}<button class="sc-btn ghost sm" data-act="menu" data-id="${s.id}" title="${SC.t('More actions', 'Vitendo zaidi')}" aria-label="${SC.t('More actions', 'Vitendo zaidi')}"><i class="fa-solid fa-ellipsis-vertical"></i></button></div>` },
        ];
        const empty = st.q || st.class_id || st.gender || st.status || st.year
          ? SC.empty('fa-magnifying-glass', SC.t('No students match your search', 'Hakuna mwanafunzi anayelingana na utafutaji wako'), SC.t('Try a different name or clear the filters.', 'Jaribu jina tofauti au futa vichujio.'))
          : SC.empty('fa-user-graduate', SC.t('No students yet', 'Hakuna wanafunzi bado'), SC.t('Register your first student to get started.', 'Sajili mwanafunzi wako wa kwanza kuanza.'), SC.can('students.create') ? `<a class="sc-btn primary" href="#student/new"><i class="fa-solid fa-user-plus"></i> ${SC.t('Register Student', 'Sajili Mwanafunzi')}</a>` : '');
        listEl._rows = d.students;
        listEl.innerHTML = SC.table(cols, d.students, { empty }) + SC.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SC.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key, ev = 'change') => el.querySelector(id).addEventListener(ev, (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fClass', 'class_id'); bind('#fGender', 'gender'); bind('#fStatus', 'status'); bind('#fYear', 'year');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', class_id: '', gender: '', status: '', year: '', page: 1 }); el.querySelectorAll('.sc-toolbar input,.sc-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    const toggle = async (row) => {
      const active = row.status === 'active';
      const ok = await SC.confirm({ title: active ? SC.t('Deactivate this student?', 'Zima mwanafunzi huyu?') : SC.t('Activate this student?', 'Washa mwanafunzi huyu?'), message: active ? SC.t(`<b>${esc(row.full_name)}</b> will be marked Inactive. Their records, fees and results are kept, and you can activate them again any time.`, `<b>${esc(row.full_name)}</b> atawekwa Hazifanyi kazi. Kumbukumbu zake, ada na matokeo yatabaki, na unaweza kumwasha tena wakati wowote.`) : SC.t(`<b>${esc(row.full_name)}</b> will be marked Active again.`, `<b>${esc(row.full_name)}</b> atawekwa Hai tena.`), confirmText: active ? SC.t('Yes, deactivate', 'Ndiyo, zima') : SC.t('Yes, activate', 'Ndiyo, washa'), danger: active, icon: active ? 'fa-user-slash' : 'fa-user-check' });
      if (!ok) return;
      await SC.api.put(`/students/${row.id}/status`, { status: active ? 'inactive' : 'active' });
      SC.toast(active ? SC.t('Student deactivated.', 'Mwanafunzi amezimwa.') : SC.t('Student activated.', 'Mwanafunzi amewashwa.')); load();
    };
    const remove = async (row) => {
      const ok = await SC.confirm({ title: SC.t('Delete this student?', 'Futa mwanafunzi huyu?'), message: SC.t(`<b>${esc(row.full_name)}</b> and all their attendance, marks and notes will be permanently deleted. This cannot be undone.<br><br><span class="sc-muted">Tip: if you only want to stop them attending, use <b>Deactivate</b> instead.</span>`, `<b>${esc(row.full_name)}</b> na mahudhurio yake yote, alama na maelezo yatafutwa kabisa. Hili haliwezi kutenduliwa.<br><br><span class="sc-muted">Kidokezo: ikiwa unataka tu kumsimamisha kuhudhuria, tumia <b>Zima</b> badala yake.</span>`), confirmText: SC.t('Yes, delete permanently', 'Ndiyo, futa kabisa') });
      if (!ok) return;
      await SC.api.del(`/students/${row.id}`); SC.toast(SC.t('Student deleted.', 'Mwanafunzi amefutwa.')); load();
    };
    SC.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      menu: (b) => {
        const row = listEl._rows.find((x) => String(x.id) === b.dataset.id); if (!row) return;
        SC.popMenu(b, [
          { label: SC.t('Print profile', 'Chapisha Wasifu'), icon: 'fa-print', fn: () => SC.printStudentProfile(row.id) },
          { label: SC.t('Generate ID card', 'Tengeneza Kitambulisho'), icon: 'fa-id-card', fn: () => SC.idCardModal(row.id) },
          ...(SC.can('students.edit') ? [{ label: row.status === 'active' ? SC.t('Deactivate', 'Zima') : SC.t('Activate', 'Washa'), icon: row.status === 'active' ? 'fa-user-slash' : 'fa-user-check', fn: () => toggle(row) }] : []),
          ...(SC.can('students.delete') ? [{ label: SC.t('Delete', 'Futa'), icon: 'fa-trash', danger: true, fn: () => remove(row) }] : []),
        ]);
      },
    });
    await load();
  };

  // =============================================================== ID card
  const docColor = () => `--doc-color:${SC.state.school.primary_color || '#0B6E4F'}`;
  SC.idCardModal = async (id) => {
    const d = await SC.api.get(`/students/${id}/id-card`);
    const s = d.school; const st = d.student;
    const logo = `<span class="lg">${esc((s.short_name || 'S').slice(0, 2))}${s.has_logo ? `<img src="${SC.logoUrl(s.id)}" alt="" onerror="this.remove()">` : ''}</span>`;
    const year = d.class ? d.class.year_name : '';
    const cards = `<div class="sc-idcards" id="idCards" style="${docColor()}">
      <div class="sc-idcard sc-doc-card"><div class="top">${logo}<div><b>${esc(s.name)}</b><small>${SC.t('Student identity card', 'Kitambulisho cha Mwanafunzi')}</small></div></div>
        <div class="body"><div class="ph">${esc(SC.initials(st.full_name))}${st.has_photo ? `<img src="${SC.photoUrl('students', st.id)}" alt="" onerror="this.remove()">` : ''}</div>
          <div><div class="nm">${esc(st.full_name)}</div>
            <div class="row"><span>${SC.t('Student ID', 'Namba ya Mwanafunzi')}</span><b>${esc(st.admission_no)}</b></div>
            <div class="row"><span>${SC.t('Class', 'Darasa')}</span><b>${esc(d.class ? SC.classLabel(d.class) : '—')}</b></div>
            <div class="row"><span>${SC.t('Year', 'Mwaka')}</span><b>${esc(year || '—')}</b></div>
            <div class="row"><span>${SC.t('Gender', 'Jinsia')}</span><b>${esc(SC.cap(st.gender))}</b></div></div></div>
        <div class="foot"><span>${esc(s.phone ? SC.t('Tel: ', 'Simu: ') + s.phone : '')}</span><span>${esc(s.website || '')}</span></div></div>
      <div class="sc-idcard back sc-doc-card"><div class="qr"><div id="idQr"></div></div><p>${SC.t('Scan to verify this student.', 'Changanua kuthibitisha mwanafunzi huyu.')}<br>${esc(d.id_card_note || '')}</p>
        <div class="bar">${esc(s.name)}${s.phone ? ' · ' + esc(s.phone) : ''}${s.address ? ' · ' + esc(s.address) : ''}</div></div></div>`;
    const back = SC.modal(SC.t(`ID card — ${st.full_name}`, `Kitambulisho — ${st.full_name}`), `<div class="sc-doc-stage">${cards}</div><p class="sc-small sc-muted sc-center" style="margin:.4rem 0 0">${SC.t('Print on card paper (85.6 × 54 mm) or on A4 and cut out.', 'Chapisha kwenye karatasi ya kadi (85.6 × 54 mm) au A4 kisha ukate.')}</p>`, {
      size: 'wide', footer: `<button class="sc-btn ghost" data-close2>${SC.t('Close', 'Funga')}</button><button class="sc-btn ghost" data-pdf><i class="fa-solid fa-file-pdf"></i> ${SC.t('Download PDF', 'Pakua PDF')}</button><button class="sc-btn primary" data-print><i class="fa-solid fa-print"></i> ${SC.t('Print', 'Chapisha')}</button>`,
    });
    back.querySelector('[data-close2]').onclick = () => SC.closeModal();
    const qrBox = back.querySelector('#idQr');
    try {
      await SC.qrInto(qrBox, d.verify_url, 104);
      const cv = qrBox.querySelector('canvas'); if (cv) qrBox.innerHTML = `<img src="${cv.toDataURL('image/png')}" width="104" height="104" alt="QR code">`;
    } catch (e) { qrBox.innerHTML = `<span class="sc-small sc-muted">${SC.t('QR code unavailable offline', 'Msimbo wa QR haupatikani nje ya mtandao')}</span>`; }
    back.querySelector('[data-print]').onclick = () => SC.print(`<div style="${docColor()}">${back.querySelector('#idCards').outerHTML}</div>`);
    back.querySelector('[data-pdf]').onclick = async (e) => {
      const b = e.currentTarget; b.disabled = true;
      try {
        const wrap = document.createElement('div'); wrap.style.cssText = `${docColor()};display:flex;flex-direction:column;gap:12px;padding:12px;width:348px;background:#fff`; wrap.innerHTML = back.querySelector('#idCards').innerHTML;
        await SC.pdf(wrap, `ID-card-${st.admission_no}.pdf`, { format: 'a5', orientation: 'portrait', margin: 10 });
        SC.toast(SC.t('ID card downloaded.', 'Kitambulisho kimepakuliwa.'));
      } catch (err) { SC.fail(err); } finally { b.disabled = false; }
    };
  };

  // =============================================================== printable profile
  SC.printStudentProfile = async (id) => {
    const { student: s } = await SC.api.get(`/students/${id}`);
    const sc = SC.state.school;
    const rows = (pairs) => pairs.map(([k, v]) => `<tr><td style="color:#666;width:170px;padding:6px 0;border-bottom:1px solid #eee">${esc(k)}</td><td style="padding:6px 0;border-bottom:1px solid #eee;font-weight:600">${esc(v || '—')}</td></tr>`).join('');
    SC.print(`<div class="sc-doc" style="${docColor()};padding:24px;max-width:780px;margin:auto;font-size:14px">
      <div style="display:flex;gap:14px;align-items:center;border-bottom:4px solid ${sc.primary_color};padding-bottom:12px"><div><h2 style="margin:0;color:#111">${esc(sc.name)}</h2><div style="color:#555;font-size:12px">${esc([sc.address, sc.phone, sc.email].filter(Boolean).join(' · '))}</div></div></div>
      <h3 style="margin:16px 0 4px;color:${sc.primary_color}">${SC.t('Student profile', 'Wasifu wa Mwanafunzi')}</h3>
      <div style="display:flex;gap:16px;align-items:flex-start"><div style="width:96px;height:116px;border:1px solid #ccc;border-radius:8px;overflow:hidden;display:grid;place-items:center;font-size:30px;font-weight:800;color:${sc.primary_color}">${s.has_photo ? `<img src="${SC.photoUrl('students', s.id)}" style="width:100%;height:100%;object-fit:cover">` : esc(SC.initials(s.full_name))}</div>
      <table style="flex:1;border-collapse:collapse">${rows([[SC.t('Full name', 'Jina Kamili'), s.full_name], [SC.t('Student ID', 'Namba ya Mwanafunzi'), s.admission_no], [SC.t('Gender', 'Jinsia'), SC.cap(s.gender)], [SC.t('Date of birth', 'Tarehe ya Kuzaliwa'), s.date_of_birth ? SC.date(s.date_of_birth) : ''], [SC.t('Class', 'Darasa'), s.class ? SC.classLabel(s.class) : ''], [SC.t('Academic year', 'Mwaka wa Masomo'), s.class && s.class.year_name], [SC.t('Admission date', 'Tarehe ya Kujiunga'), SC.date(s.admission_date)], [SC.t('Status', 'Hali'), SC.cap(s.status)]])}</table></div>
      <h4 style="margin:18px 0 4px">${SC.t('Contact & background', 'Mawasiliano na Historia')}</h4><table style="width:100%;border-collapse:collapse">${rows([[SC.t('Nationality', 'Taifa'), s.nationality], [SC.t('Phone', 'Simu'), s.phone], [SC.t('Email', 'Barua pepe'), s.email], [SC.t('Address', 'Anwani'), s.address], [SC.t('Previous school', 'Shule ya Awali'), s.previous_school]])}</table>
      <h4 style="margin:18px 0 4px">${SC.t('Parent / guardian', 'Mzazi / Mlezi')}</h4><table style="width:100%;border-collapse:collapse">${s.parents.map((p) => rows([[`${p.relationship}`, `${p.full_name} — ${p.phone}${p.alt_phone ? ' / ' + p.alt_phone : ''}`]])).join('')}</table>
      <h4 style="margin:18px 0 4px">${SC.t('Subjects', 'Masomo')}</h4><div>${s.subjects.map((x) => esc(x.name)).join(', ') || '—'}</div>
      <p style="margin-top:26px;font-size:11px;color:#777">${SC.t(`Printed on ${new Date().toLocaleString()} from ${esc(sc.name)} School System.`, `Imechapishwa ${new Date().toLocaleString()} kutoka Mfumo wa Shule ya ${esc(sc.name)}.`)}</p></div>`);
  };

  // =============================================================== profile
  SC.modules.student = async (el, args) => {
    if (args[0] === 'new') return SC.modules.studentForm(el, null);
    if (args[1] === 'edit') return SC.modules.studentForm(el, args[0]);
    const id = args[0];
    const { student: s } = await SC.api.get(`/students/${id}`);
    SC.setTitle(s.full_name, `${s.admission_no} · ${s.class ? SC.classLabel(s.class) : SC.t('No class', 'Hakuna darasa')}`);
    const parent = SC.isParent();
    const tabs = [['overview', SC.t('Overview', 'Muhtasari'), true], ['attendance', SC.t('Attendance', 'Mahudhurio'), true], ['fees', SC.t('Fees', 'Ada'), parent || SC.can('fees.view')], ['results', SC.t('Results', 'Matokeo'), parent || SC.can('results.view')],
      ['subjects', SC.t('Subjects', 'Masomo'), true], ['guardian', SC.t('Parent / Guardian', 'Mzazi / Mlezi'), true], ['timetable', SC.t('Timetable', 'Ratiba'), parent], ['notes', SC.t('Notes', 'Maelezo'), !parent && SC.can('students.notes')]].filter((t) => t[2]);
    const canEdit = SC.can('students.edit');

    el.innerHTML = `<div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-spread" style="align-items:flex-start;gap:1.2rem">
        <div class="sc-row" style="gap:1.2rem;flex-wrap:nowrap;min-width:0">${SC.avatar('students', s.id, s.full_name, s.has_photo, 'lg')}
          <div style="min-width:0"><h2 style="font-size:1.4rem">${esc(s.full_name)}</h2>
            <div class="sc-row" style="margin:.4rem 0;gap:.5rem">${SC.chip(s.status)}<span class="sc-chip"><i class="fa-solid fa-hashtag"></i> ${esc(s.admission_no)}</span><span class="sc-chip"><i class="fa-solid ${s.gender === 'male' ? 'fa-mars' : 'fa-venus'}"></i> ${SC.cap(s.gender)}</span></div>
            <div class="sc-muted sc-small"><i class="fa-solid fa-school"></i> ${esc(s.class ? SC.classLabel(s.class) : SC.t('Not in a class', 'Hana darasa'))} &nbsp; <i class="fa-solid fa-calendar-check"></i> ${SC.t('Admitted', 'Alijiunga')} ${SC.date(s.admission_date)}</div></div></div>
        <div class="sc-row">${!parent && SC.can('students.view') ? `<button class="sc-btn ghost sm" data-act="idcard"><i class="fa-solid fa-id-card"></i> ${SC.t('ID card', 'Kitambulisho')}</button><button class="sc-btn ghost sm" data-act="print"><i class="fa-solid fa-print"></i> ${SC.t('Print', 'Chapisha')}</button>` : ''}
          ${canEdit ? `<a class="sc-btn primary sm" href="#student/${s.id}/edit"><i class="fa-solid fa-pen"></i> ${SC.t('Edit', 'Hariri')}</a>` : ''}
          ${parent ? `<a class="sc-btn ghost sm" href="#home"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>` : `<a class="sc-btn ghost sm" href="#students"><i class="fa-solid fa-arrow-left"></i> ${SC.t('Back', 'Rudi')}</a>`}</div></div></div>
      <div class="sc-tabs" id="pTabs" role="tablist">${tabs.map(([k, l], i) => `<button role="tab" data-tab="${k}" class="${i === 0 ? 'on' : ''}">${l}</button>`).join('')}</div><div id="pBody"></div>`;

    const body = el.querySelector('#pBody');
    const views = {
      overview: () => overview(s, body), attendance: () => attendanceTab(s, body), fees: () => feesTab(s, body), results: () => resultsTab(s, body),
      subjects: () => subjectsTab(s, body), guardian: () => guardianTab(s, body), timetable: () => timetableTab(s, body), notes: () => notesTab(s, body),
    };
    async function open(k) {
      el.querySelectorAll('#pTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === k));
      SC.destroyCharts && SC.destroyCharts();
      body.innerHTML = SC.skeleton(5);
      try { await views[k](); } catch (e) { body.innerHTML = SC.errorBox(e); }
      history.replaceState(null, '', `#student/${s.id}`);
    }
    el.querySelector('#pTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) open(b.dataset.tab); });
    SC.delegate(el, { idcard: () => SC.idCardModal(s.id), print: () => SC.printStudentProfile(s.id) });
    SC.profileOpen = open;
    SC.after(() => open('overview'));
  };

  const kv = (pairs) => `<dl class="sc-kv">${pairs.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${v == null || v === '' ? '—' : v}</dd>`).join('')}</dl>`;
  const age = (dob) => { if (!dob) return ''; const d = new Date(dob); const y = Math.floor((Date.now() - d.getTime()) / 31557600000); return Number.isFinite(y) ? SC.t(` (${y} years)`, ` (miaka ${y})`) : ''; };

  async function overview(s, body) {
    const parent = SC.isParent();
    const [att, fees, res] = await Promise.all([
      SC.api.get(`/students/${s.id}/attendance`).catch(() => null),
      (parent || SC.can('fees.view')) ? SC.api.get(`/students/${s.id}/fees`).catch(() => null) : null,
      (parent || SC.can('results.view')) ? SC.api.get(`/students/${s.id}/results`).catch(() => null) : null,
    ]);
    const kpis = [];
    if (att) kpis.push(SC.stat('fa-clipboard-check', SC.pct(att.summary.percent), SC.t('Attendance', 'Mahudhurio'), SC.t(`${att.summary.present} present · ${att.summary.absent} absent · ${att.summary.late} late`, `Yupo ${att.summary.present} · Hayupo ${att.summary.absent} · Amechelewa ${att.summary.late}`), att.summary.percent != null && att.summary.percent < 75 ? 'red' : 'green'));
    if (fees && fees.enrolled) kpis.push(SC.stat('fa-coins', SC.moneyHtml(fees.summary.balance), SC.t('Fee balance', 'Deni la Ada'), SC.t(`${SC.chip(fees.summary.status)} paid ${SC.money(fees.summary.paid)}`, `${SC.chip(fees.summary.status)} imelipwa ${SC.money(fees.summary.paid)}`), fees.summary.status === 'overdue' ? 'red' : 'amber'));
    if (res && res.results.length) { const r = res.results[0]; kpis.push(SC.stat('fa-ranking-star', `${r.average}%`, SC.t(`Latest: ${r.exam_name}`, `Mwisho: ${r.exam_name}`), SC.t(`Grade ${r.grade} · Position ${r.position_label}`, `Daraja ${r.grade} · Nafasi ${r.position_label}`), 'blue')); }
    body.innerHTML = `${kpis.length ? `<div class="sc-grid stats" style="margin-bottom:1.1rem">${kpis.join('')}</div>` : ''}
      <div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Personal information', 'Taarifa Binafsi')}</h3></div>${kv([[SC.t('Full name', 'Jina Kamili'), esc(s.full_name)], [SC.t('Student ID', 'Namba ya Mwanafunzi'), esc(s.admission_no)], [SC.t('Gender', 'Jinsia'), SC.cap(s.gender)], [SC.t('Date of birth', 'Tarehe ya Kuzaliwa'), s.date_of_birth ? SC.date(s.date_of_birth) + age(s.date_of_birth) : ''], [SC.t('Nationality', 'Taifa'), esc(s.nationality)], [SC.t('Phone', 'Simu'), esc(s.phone)], [SC.t('Email', 'Barua pepe'), esc(s.email)], [SC.t('Address', 'Anwani'), esc(s.address)]])}</div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Academic information', 'Taarifa za Kitaaluma')}</h3></div>${kv([[SC.t('Class', 'Darasa'), esc(s.class ? SC.classLabel(s.class) : '')], [SC.t('Level', 'Kiwango'), esc(s.class && s.class.level)], [SC.t('Academic year', 'Mwaka wa Masomo'), esc(s.class && s.class.year_name)], [SC.t('Admission date', 'Tarehe ya Kujiunga'), SC.date(s.admission_date)], [SC.t('Previous school', 'Shule ya Awali'), esc(s.previous_school)], [SC.t('Status', 'Hali'), SC.chip(s.status)], [SC.t('Subjects', 'Masomo'), s.subjects.length ? SC.t(`${s.subjects.length} registered`, `${s.subjects.length} yamesajiliwa`) : '']])}</div></div>`;
  }

  async function attendanceTab(s, body) {
    const d = await SC.api.get(`/students/${s.id}/attendance`); const m = d.summary;
    body.innerHTML = `<div class="sc-grid stats" style="margin-bottom:1.1rem">${SC.stat('fa-circle-check', m.present, SC.t('Present', 'Yupo'), '', 'green')}${SC.stat('fa-circle-xmark', m.absent, SC.t('Absent', 'Hayupo'), '', 'red')}${SC.stat('fa-clock', m.late, SC.t('Late', 'Amechelewa'), '', 'amber')}${SC.stat('fa-percent', SC.pct(m.percent), SC.t('Attendance percentage', 'Asilimia ya Mahudhurio'), SC.t('Late counts as attended', 'Kuchelewa kunahesabiwa kama kuhudhuria'))}</div>
      <div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Attendance chart', 'Chati ya Mahudhurio')}</h3></div>${d.monthly.length ? '<div class="sc-chart-box"><canvas id="attChart"></canvas></div>' : SC.empty('fa-chart-column', SC.t('No attendance recorded yet', 'Hakuna mahudhurio yaliyorekodiwa bado'), SC.t('The chart will appear after the first attendance is taken.', 'Chati itaonekana baada ya mahudhurio ya kwanza kuchukuliwa.'))}</div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Recent sessions', 'Vipindi vya Hivi Karibuni')}</h3></div>${d.history.length ? `<div class="sc-table-wrap" style="max-height:290px;overflow:auto">${SC.table([{ label: SC.t('Date', 'Tarehe'), render: (r) => SC.date(r.date) }, { label: SC.t('Session', 'Kipindi'), render: (r) => esc(r.subject || SC.t('Whole day', 'Siku Nzima')) }, { label: SC.t('Status', 'Hali'), render: (r) => SC.chip(r.status) }], d.history, { cls: 'compact' })}</div>` : SC.empty('fa-calendar-xmark', SC.t('Nothing yet', 'Bado hakuna kitu'), SC.t('No sessions have been recorded.', 'Hakuna vipindi vilivyorekodiwa.'))}</div></div>`;
    if (d.monthly.length) SC.after(async () => {
      const cv = body.querySelector('#attChart'); if (!cv) return;
      SC.chart(cv, { type: 'bar', data: { labels: d.monthly.map((x) => x.month), datasets: [{ label: SC.t('Present', 'Yupo'), data: d.monthly.map((x) => x.present), backgroundColor: '#12A67A', borderRadius: 6 }, { label: SC.t('Late', 'Amechelewa'), data: d.monthly.map((x) => x.late), backgroundColor: '#F5A524', borderRadius: 6 }, { label: SC.t('Absent', 'Hayupo'), data: d.monthly.map((x) => x.absent), backgroundColor: '#E5484D', borderRadius: 6 }] }, options: { maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'bottom' } } } });
    });
  }

  async function feesTab(s, body) {
    const d = await SC.api.get(`/students/${s.id}/fees`);
    if (!d.enrolled) { body.innerHTML = `<div class="sc-card">${SC.empty('fa-school-circle-xmark', SC.t('Not enrolled', 'Hajajiunga'), SC.t('This student is not in a class yet, so no fees apply.', 'Mwanafunzi huyu hayupo darasani bado, hivyo hakuna ada zinazotumika.'))}</div>`; return; }
    const m = d.summary;
    body.innerHTML = `<div class="sc-grid stats" style="margin-bottom:1.1rem">${SC.stat('fa-file-invoice-dollar', SC.moneyHtml(m.total), SC.t('Total fees', 'Jumla ya Ada'))}${SC.stat('fa-hand-holding-dollar', SC.moneyHtml(m.paid), SC.t('Amount paid', 'Kiasi Kilicholipwa'), '', 'green')}${SC.stat('fa-scale-unbalanced', SC.moneyHtml(m.balance), SC.t('Balance', 'Deni'), SC.chip(m.status), m.status === 'overdue' ? 'red' : 'amber')}</div>
      <div class="sc-card" style="margin-bottom:1.1rem"><div class="sc-card-head"><h3>${SC.t('Fee structure', 'Muundo wa Ada')}</h3></div>${SC.table([{ label: SC.t('Fee', 'Ada'), render: (r) => esc(r.name) }, { label: SC.t('Type', 'Aina'), render: (r) => SC.cap(r.fee_type) }, { label: SC.t('Due date', 'Tarehe ya Mwisho'), render: (r) => r.due_date ? SC.date(r.due_date) : '—' }, { label: SC.t('Amount', 'Kiasi'), cls: 'end', render: (r) => SC.num(r.amount) }, { label: SC.t('Paid', 'Ililipwa'), cls: 'end', render: (r) => SC.num(r.paid) }, { label: SC.t('Status', 'Hali'), render: (r) => r.unpaid <= 0 ? SC.chip('paid') : r.overdue ? SC.chip('overdue') : r.paid > 0 ? SC.chip('partial') : SC.chip('pending') }], d.items, { empty: SC.empty('fa-receipt', SC.t('No fees set', 'Hakuna ada zilizowekwa'), SC.t('No fees have been set for this class yet.', 'Hakuna ada zilizowekwa kwa darasa hili bado.')) })}</div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Payment history', 'Historia ya Malipo')}</h3><div class="sc-actions">${SC.can('fees.record') && m.balance > 0 ? `<button class="sc-btn primary sm" data-act="pay"><i class="fa-solid fa-plus"></i> ${SC.t('Record payment', 'Rekodi Malipo')}</button>` : ''}</div></div>
      ${SC.table([{ label: SC.t('Date', 'Tarehe'), render: (r) => SC.date(r.payment_date) }, { label: SC.t('Receipt', 'Risiti'), render: (r) => esc(r.receipt_no || '—') }, { label: SC.t('Method', 'Njia'), render: (r) => esc(r.method) }, { label: SC.t('Reference', 'Kumbukumbu'), render: (r) => esc(r.reference || '—') }, { label: SC.t('Received by', 'Alipokelewa na'), render: (r) => esc(r.received_by_name || '—') }, { label: SC.t('Amount', 'Kiasi'), cls: 'end', render: (r) => `<b>${SC.num(r.amount)}</b>` }, { label: '', cls: 'end', render: (r) => `<button class="sc-btn ghost sm" data-act="receipt" data-id="${r.id}"><i class="fa-solid fa-receipt"></i> ${SC.t('Receipt', 'Risiti')}</button>` }], d.payments, { empty: SC.empty('fa-money-bill-wave', SC.t('No payments yet', 'Hakuna malipo bado'), SC.t('Payments will be listed here with their receipts.', 'Malipo yataorodheshwa hapa pamoja na risiti zake.')) })}</div>`;
    SC.delegate(body, {
      pay: () => SC.payModal({ studentId: s.id, onDone: () => SC.profileOpen('fees') }),
      receipt: (b) => SC.receiptModal(b.dataset.id),
    });
  }

  async function resultsTab(s, body) {
    const d = await SC.api.get(`/students/${s.id}/results`);
    if (!d.results.length) { body.innerHTML = `<div class="sc-card">${SC.empty('fa-file-circle-question', SC.t('No results yet', 'Hakuna matokeo bado'), SC.t('Results appear here after teachers enter marks.', 'Matokeo yataonekana hapa baada ya walimu kuingiza alama.'))}</div>`; return; }
    body.innerHTML = `<div class="sc-stack">${d.results.map((r) => `<div class="sc-card"><div class="sc-card-head"><div><h3>${esc(r.exam_name)}</h3><span class="sc-muted sc-small">${esc(r.exam_type)}${r.exam_date ? ' · ' + SC.date(r.exam_date) : ''}</span></div>
        <div class="sc-actions"><span class="sc-chip info">${SC.t('Position', 'Nafasi')} ${esc(r.position_label)}</span><a class="sc-btn primary sm" href="#reportcard/${r.exam_id}/${s.id}"><i class="fa-solid fa-file-lines"></i> ${SC.t('Report card', 'Ripoti ya Matokeo')}</a></div></div>
        ${SC.table([{ label: SC.t('Subject', 'Somo'), render: (x) => esc(x.subject) }, { label: SC.t('Marks', 'Alama'), cls: 'end', render: (x) => `${x.marks}/${r.max_marks}` }, { label: SC.t('Grade', 'Daraja'), render: (x) => `<b>${esc(x.grade)}</b>` }, { label: SC.t('Remarks', 'Maoni'), render: (x) => esc(x.remarks) }], r.subjects, { cls: 'compact' })}
        <div class="sc-row" style="margin-top:.9rem;gap:1.4rem"><span>${SC.t('Total', 'Jumla')} <b>${SC.num(r.total)}</b></span><span>${SC.t('Average', 'Wastani')} <b>${r.average}%</b></span><span>${SC.t('Grade', 'Daraja')} <b>${esc(r.grade)}</b></span>${r.division ? `<span>${SC.t('Division', 'Divisheni')} <b>${esc(r.division)}</b></span>` : ''}</div></div>`).join('')}</div>`;
  }

  async function subjectsTab(s, body) {
    body.innerHTML = `<div class="sc-card">${SC.table([{ label: SC.t('Subject', 'Somo'), render: (x) => `<b>${esc(x.name)}</b>` }, { label: SC.t('Code', 'Msimbo'), render: (x) => esc(x.code) }, { label: SC.t('Teacher', 'Mwalimu'), render: (x) => esc(x.teacher_name || '—') }], s.subjects, { empty: SC.empty('fa-book', SC.t('No subjects registered', 'Hakuna masomo yaliyosajiliwa'), SC.t('Edit the student to choose subjects.', 'Hariri mwanafunzi kuchagua masomo.')) })}</div>`;
  }

  async function guardianTab(s, body) {
    body.innerHTML = `<div class="sc-grid cols-2">${s.parents.map((p) => `<div class="sc-card"><div class="sc-card-head"><div class="sc-person"><span class="sc-avatar md">${esc(SC.initials(p.full_name))}</span><div><div class="nm" style="font-weight:800">${esc(p.full_name)}</div><span class="sc-chip">${esc(p.relationship)}${p.is_primary ? SC.t(' · Primary', ' · Mkuu') : ''}</span></div></div>${SC.can('parents.manage') && !SC.isParent() ? `<div class="sc-actions"><a class="sc-btn ghost sm" href="#parent/${p.id}">${SC.t('Open', 'Fungua')}</a></div>` : ''}</div>
      ${kv([[SC.t('Phone', 'Simu'), p.phone ? `<a href="tel:${esc(p.phone)}">${esc(p.phone)}</a>` : ''], [SC.t('Alternative phone', 'Simu Nyingine'), esc(p.alt_phone)], [SC.t('Email', 'Barua pepe'), esc(p.email)], [SC.t('Address', 'Anwani'), esc(p.address)], [SC.t('Occupation', 'Kazi'), esc(p.occupation)]])}</div>`).join('') || SC.empty('fa-people-roof', SC.t('No guardian', 'Hakuna mlezi'), SC.t('No parent or guardian is linked to this student.', 'Hakuna mzazi au mlezi aliyeunganishwa na mwanafunzi huyu.'))}</div>`;
  }

  async function timetableTab(s, body) {
    const d = await SC.api.get(`/timetable?student_id=${s.id}`);
    body.innerHTML = `<div class="sc-card">${SC.timetableGrid(d.entries, { canEdit: false })}</div>`;
  }

  async function notesTab(s, body) {
    const load = async () => {
      const { notes } = await SC.api.get(`/students/${s.id}/notes`);
      body.innerHTML = `<div class="sc-grid split"><div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Private notes', 'Maelezo Binafsi')}</h3><span class="sc-chip"><i class="fa-solid fa-lock"></i> ${SC.t('Staff only — parents cannot see these', 'Wafanyakazi pekee — wazazi hawawezi kuona haya')}</span></div>
        ${notes.length ? `<div class="sc-list">${notes.map((n) => `<div><div class="sc-spread"><b>${esc(n.author || SC.t('Staff', 'Mfanyakazi'))}</b><span class="sc-small sc-muted">${SC.dateTime(n.created_at)}</span></div><div style="white-space:pre-wrap">${esc(n.note)}</div>${SC.state.role === 'admin' ? `<button class="sc-btn ghost sm" style="margin-top:.4rem" data-act="delnote" data-id="${n.id}"><i class="fa-solid fa-trash"></i> ${SC.t('Delete', 'Futa')}</button>` : ''}</div>`).join('')}</div>` : SC.empty('fa-note-sticky', SC.t('No notes yet', 'Hakuna maelezo bado'), SC.t('Add a note about behaviour, health or progress.', 'Ongeza maelezo kuhusu tabia, afya au maendeleo.'))}</div>
        <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Add a note', 'Ongeza Maelezo')}</h3></div><form class="sc-form" id="noteForm" novalidate>${SC.f.textarea('note', SC.t('Note', 'Maelezo'), { required: true, rows: 5, placeholder: SC.t('e.g. Needs extra help with Kiswahili; parent informed.', 'mfano: Anahitaji msaada wa ziada katika Kiswahili; mzazi amejulishwa.') })}<button class="sc-btn primary" type="submit">${SC.t('Save note', 'Hifadhi Maelezo')}</button></form></div></div>`;
      const form = body.querySelector('#noteForm');
      form.addEventListener('submit', async (e) => { e.preventDefault(); if (!SC.validate(form)) return; try { await SC.api.post(`/students/${s.id}/notes`, SC.formData(form)); SC.toast(SC.t('Note saved.', 'Maelezo yamehifadhiwa.')); load(); } catch (err) { SC.fail(err); } });
    };
    await load();
    SC.delegate(body, { delnote: async (b) => { if (await SC.confirm({ title: SC.t('Delete this note?', 'Futa maelezo haya?'), message: SC.t('This note will be removed permanently.', 'Maelezo haya yataondolewa kabisa.') })) { await SC.api.del(`/notes/${b.dataset.id}`); SC.toast(SC.t('Note deleted.', 'Maelezo yamefutwa.')); load(); } } });
  }
})();
