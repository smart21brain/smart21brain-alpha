/* Notifications / announcements. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;
  const TYPES = () => [['general', SC.t('General announcement', 'Tangazo la Jumla')], ['fee_reminder', SC.t('Fee reminder', 'Kikumbusho cha Ada')], ['attendance_warning', SC.t('Attendance warning', 'Onyo la Mahudhurio')], ['exam_announcement', SC.t('Examination announcement', 'Tangazo la Mtihani')], ['class_announcement', SC.t('Class announcement', 'Tangazo la Darasa')]];
  const AUD = () => [['all', SC.t('Everyone (all students, parents and staff)', 'Kila mtu (wanafunzi wote, wazazi na wafanyakazi)')], ['parents', SC.t('All parents', 'Wazazi Wote')], ['teachers', SC.t('All teachers', 'Walimu Wote')], ['class', SC.t('A specific class', 'Darasa Mahususi')], ['student', SC.t('A specific student', 'Mwanafunzi Mahususi')]];
  const typeText = (t) => (TYPES().find((x) => x[0] === t) || [0, SC.cap(t)])[1];

  async function composeModal(done) {
    const lk = await SC.lookups(); let student = null;
    const back = SC.formModal({
      title: SC.t('Create announcement', 'Unda Tangazo'), size: 'wide', submit: SC.t('Send notification', 'Tuma Arifa'),
      body: `<div class="cols">${SC.f.select('type', SC.t('Type', 'Aina'), TYPES(), { required: true, value: 'general', noBlank: true })}${SC.f.select('audience', SC.t('Send to', 'Tuma kwa'), AUD(), { required: true, value: 'all', noBlank: true })}</div>
        <div id="audClass" class="sc-hide">${SC.f.select('class_id', SC.t('Class', 'Darasa'), SC.opts.classes(lk, false), { placeholder: SC.t('Choose a class', 'Chagua darasa') })}</div>
        <div id="audStudent" class="sc-hide"><div class="sc-field"><label for="nsQ">${SC.t('Student', 'Mwanafunzi')}</label><input class="sc-input" id="nsQ" type="search" placeholder="${SC.t("Type the student's name or ID…", 'Andika jina la mwanafunzi au namba…')}" autocomplete="off"><div id="nsRes" class="sc-list"></div><div id="nsPicked" class="sc-small" style="margin-top:.4rem"></div></div></div>
        ${SC.f.input('title', SC.t('Title', 'Kichwa'), { required: true, attr: { maxlength: 120 }, placeholder: SC.t('e.g. Parents meeting on Saturday', 'mfano: Mkutano wa wazazi Jumamosi') })}${SC.f.textarea('message', SC.t('Message', 'Ujumbe'), { required: true, rows: 5, placeholder: SC.t('Write the message people will read…', 'Andika ujumbe ambao watu watasoma…') })}`,
      onOpen: (form) => {
        const aud = form.querySelector('[name=audience]');
        aud.addEventListener('change', () => { form.querySelector('#audClass').classList.toggle('sc-hide', aud.value !== 'class'); form.querySelector('#audStudent').classList.toggle('sc-hide', aud.value !== 'student'); });
        const run = SC.debounce(async () => {
          const q = form.querySelector('#nsQ').value.trim(); const box = form.querySelector('#nsRes'); if (q.length < 2) { box.innerHTML = ''; return; }
          let d; try { d = await SC.api.get('/students' + SC.qs({ q, limit: 5 })); } catch (e) { box.innerHTML = `<div class="sc-form-error show">${esc(e.message)}</div>`; return; }
          box.innerHTML = d.students.map((s) => `<div class="sc-spread"><span>${esc(s.full_name)} <span class="sc-muted sc-small">${esc(s.admission_no)}</span></span><button type="button" class="sc-btn primary sm" data-pick="${s.id}" data-n="${esc(s.full_name)}">${SC.t('Choose', 'Chagua')}</button></div>`).join('') || `<div class="sc-muted sc-small">${SC.t('No student found.', 'Hakuna mwanafunzi aliyepatikana.')}</div>`;
        }, 250);
        form.querySelector('#nsQ').addEventListener('input', run);
        form.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; student = Number(b.dataset.pick); form.querySelector('#nsPicked').innerHTML = `<span class="sc-chip ok"><i class="fa-solid fa-check"></i> ${esc(b.dataset.n)}</span>`; form.querySelector('#nsRes').innerHTML = ''; });
      },
      onSubmit: async (f) => {
        if (f.audience === 'class' && !f.class_id) throw new Error(SC.t('Please choose the class to notify.', 'Tafadhali chagua darasa la kuarifu.'));
        if (f.audience === 'student' && !student) throw new Error(SC.t('Please choose the student to notify.', 'Tafadhali chagua mwanafunzi wa kuarifu.'));
        await SC.api.post('/notifications', { ...f, student_id: student });
        SC.closeModal(); SC.toast(SC.t('Notification sent successfully.', 'Arifa imetumwa kwa mafanikio.')); done();
      },
    });
    return back;
  }

  SC.modules.notifications = async (el, args) => {
    const st = { type: '' }; const canSend = SC.can('announcements.manage');
    async function load() {
      const d = await SC.api.get('/notifications' + SC.qs({ type: st.type, limit: 50 }));
      el.innerHTML = `${SC.pageHead(SC.t('Notifications', 'Arifa'), SC.isParent() ? SC.t('Messages from the school', 'Ujumbe kutoka Shule') : SC.t('Announcements and alerts', 'Matangazo na Tahadhari'), `${d.unread ? `<button class="sc-btn ghost" data-act="readall"><i class="fa-solid fa-check-double"></i> ${SC.t('Mark all as read', 'Weka Zote Kama Zimesomwa')}</button>` : ''}${canSend ? `<button class="sc-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> ${SC.t('Create Announcement', 'Unda Tangazo')}</button>` : ''}`)}
        <div class="sc-card"><div class="sc-toolbar"><select class="sc-select" id="nType"><option value="">${SC.t('All types', 'Aina zote')}</option>${TYPES().map(([v, l]) => `<option value="${v}" ${st.type === v ? 'selected' : ''}>${l}</option>`).join('')}</select><span class="sc-muted sc-small">${SC.t(`${d.unread} unread`, `${d.unread} hazijasomwa`)}</span></div>
        ${d.notifications.length ? `<div class="sc-list">${d.notifications.map((n) => `<div class="sc-notice-row ${n.is_read ? '' : 'unread'}"><div class="ico"><i class="fa-solid ${SC.noticeIcon(n.type)}"></i></div><div style="flex:1;min-width:0"><div class="sc-spread"><b>${esc(n.title)}</b><span class="sc-small sc-muted sc-nowrap">${SC.dateTime(n.created_at)}</span></div>
          <div class="sc-row" style="gap:.4rem;margin:.2rem 0"><span class="sc-chip info">${esc(typeText(n.type))}</span><span class="sc-chip">${esc(n.audience === 'class' ? SC.t('Class: ', 'Darasa: ') + (n.class_label || '') : n.audience === 'student' ? SC.t('Student: ', 'Mwanafunzi: ') + (n.student_name || '') : SC.cap(n.audience))}</span></div>
          <div style="white-space:pre-wrap">${esc(n.message)}</div><div class="sc-row" style="margin-top:.4rem">${n.is_read ? '' : `<button class="sc-btn ghost sm" data-act="read" data-id="${n.id}"><i class="fa-solid fa-check"></i> ${SC.t('Mark as read', 'Weka Kama Imesomwa')}</button>`}${canSend ? `<button class="sc-btn danger-ghost sm" data-act="del" data-id="${n.id}"><i class="fa-solid fa-trash"></i></button>` : ''}</div></div></div>`).join('')}</div>` : SC.empty('fa-bell-slash', SC.t('No notifications', 'Hakuna arifa'), SC.t('When the school sends a message it will show up here.', 'Shule itakapotuma ujumbe utaonekana hapa.'), canSend ? `<button class="sc-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> ${SC.t('Create Announcement', 'Unda Tangazo')}</button>` : '')}</div>`;
      el.querySelector('#nType').addEventListener('change', (e) => { st.type = e.target.value; load(); });
      SC.refreshBadge();
    }
    SC.delegate(el, {
      new: () => composeModal(load),
      read: async (b) => { await SC.api.put(`/notifications/${b.dataset.id}/read`); load(); },
      readall: async () => { await SC.api.put('/notifications/read-all'); load(); },
      del: async (b) => { if (!(await SC.confirm({ title: SC.t('Delete this notification?', 'Futa arifa hii?'), message: SC.t('It will disappear for everyone who received it.', 'Itatoweka kwa kila aliyeipokea.'), confirmText: SC.t('Yes, delete', 'Ndiyo, futa') }))) return; await SC.api.del(`/notifications/${b.dataset.id}`); SC.toast(SC.t('Notification deleted.', 'Arifa imefutwa.')); load(); },
    });
    await load();
    if (args[0] === 'new' && canSend) { history.replaceState(null, '', '#notifications'); SC.after(() => composeModal(load)); }
  };
})();
