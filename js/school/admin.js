/* Users, Settings (center info, academic, financial, roles & permissions, data) and Audit Logs. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  // =============================================================== users
  const ROLE_TEXT = () => ({ admin: SC.t('Administrator', 'Msimamizi'), teacher: SC.t('Teacher', 'Mwalimu'), receptionist: SC.t('Receptionist', 'Mpokezi'), parent: SC.t('Parent', 'Mzazi') });

  async function userModal(u, done) {
    const lk = await SC.lookups(); const isEdit = !!u; const RT = ROLE_TEXT();
    SC.formModal({
      title: isEdit ? SC.t(`Edit ${u.name}`, `Hariri ${u.name}`) : SC.t('Add user', 'Ongeza Mtumiaji'), submit: isEdit ? SC.t('Save changes', 'Hifadhi Mabadiliko') : SC.t('Add user', 'Ongeza Mtumiaji'),
      body: isEdit ? `<div class="sc-alert info"><i class="fa-solid fa-envelope"></i><div>${esc(u.email)}</div></div>
          ${u.role === 'parent' ? '' : SC.f.select('role', SC.t('Role', 'Jukumu'), ['admin', 'teacher', 'receptionist'].map((r) => [r, RT[r]]), { value: u.role, required: true, noBlank: true })}
          ${SC.f.select('active', SC.t('Account status', 'Hali ya Akaunti'), [[1, SC.t('Active — can sign in', 'Hai — anaweza kuingia')], [0, SC.t('Inactive — cannot sign in', 'Haifanyi kazi — hawezi kuingia')]], { value: u.active ? 1 : 0, noBlank: true })}
          ${SC.f.input('new_password', SC.t('Reset password (optional)', 'Weka Upya Nenosiri (si lazima)'), { placeholder: SC.t('Leave empty to keep the current password', 'Acha wazi kubaki na nenosiri la sasa'), hint: SC.t('At least 8 characters. The person will be signed out everywhere.', 'Angalau herufi 8. Mtu ataondolewa kwenye akaunti kila mahali.') })}`
        : `<div class="cols">${SC.f.input('name', SC.t('Full name', 'Jina Kamili'), { required: true })}${SC.f.input('email', SC.t('Email (username)', 'Barua pepe (jina la mtumiaji)'), { type: 'email', required: true })}</div>
          <div class="cols">${SC.f.select('role', SC.t('Role', 'Jukumu'), ['admin', 'teacher', 'receptionist'].map((r) => [r, RT[r]]), { value: 'receptionist', required: true, noBlank: true })}${SC.f.input('password', SC.t('Temporary password', 'Nenosiri la Muda'), { placeholder: SC.t('At least 8 characters', 'Angalau herufi 8'), hint: SC.t('Leave empty only if they already have a Smart21Brain account.', 'Acha wazi tu ikiwa tayari ana akaunti ya Smart21Brain.') })}</div>
          <div id="tBox" class="sc-hide">${SC.f.select('teacher_id', SC.t('Link to teacher record', 'Unganisha na Rekodi ya Mwalimu'), SC.opts.teachers(lk), { placeholder: SC.t('Create a new teacher record', 'Unda rekodi mpya ya mwalimu'), hint: SC.t('Teachers only see the classes they teach.', 'Walimu wanaona madarasa wanayofundisha tu.') })}</div>
          <div class="sc-alert"><i class="fa-solid fa-circle-info"></i><div>${SC.t('Administrators can do everything. You can change what teachers and receptionists may do in <a href="#settings">Settings → Roles & Permissions</a>.', 'Wasimamizi wanaweza kufanya kila kitu. Unaweza kubadilisha kile ambacho walimu na wapokezi wanaweza kufanya kupitia <a href="#settings">Mipangilio → Majukumu na Ruhusa</a>.')}</div></div>`,
      onOpen: (form) => { const r = form.querySelector('[name=role]'); const t = form.querySelector('#tBox'); if (r && t) r.addEventListener('change', () => t.classList.toggle('sc-hide', r.value !== 'teacher')); },
      onSubmit: async (f) => {
        if (isEdit) await SC.api.put(`/users/${u.id}`, { role: f.role, active: f.active === '1' || f.active === 1, new_password: f.new_password || undefined });
        else { const r = await SC.api.post('/users', f); if (r.linked) SC.toast(SC.t('This person already had an account, so they were added to your school with their existing password.', 'Mtu huyu tayari alikuwa na akaunti, hivyo ameongezwa shuleni kwako na nenosiri lake la awali.'), 'warn'); }
        SC.closeModal(); SC.toast(isEdit ? SC.t('User updated successfully.', 'Mtumiaji amesasishwa kwa mafanikio.') : SC.t('User added successfully.', 'Mtumiaji ameongezwa kwa mafanikio.')); done();
      },
    });
  }

  SC.modules.users = async (el) => {
    let users = [];
    async function load() {
      users = (await SC.api.get('/users')).users; const RT = ROLE_TEXT();
      el.innerHTML = `${SC.pageHead(SC.t('Users', 'Watumiaji'), SC.t('People who can sign in to your school system', 'Watu wanaoweza kuingia kwenye mfumo wa shule yako'), `<button class="sc-btn primary" data-act="add"><i class="fa-solid fa-user-plus"></i> ${SC.t('Add User', 'Ongeza Mtumiaji')}</button>`)}
        <div class="sc-card">${SC.table([
          { label: SC.t('User', 'Mtumiaji'), render: (u) => `<div class="sc-person"><span class="sc-avatar">${esc(SC.initials(u.name))}</span><span><span class="nm">${esc(u.name)}</span><div class="sb sc-muted">${esc(u.email)}</div></span></div>` },
          { label: SC.t('Role', 'Jukumu'), render: (u) => `<span class="sc-chip info">${esc(RT[u.role])}</span>` },
          { label: SC.t('Linked to', 'Imeunganishwa na'), render: (u) => esc(u.teacher_name || u.parent_name || '—') },
          { label: SC.t('Last sign in', 'Kuingia Mwisho'), render: (u) => (u.last_login ? SC.dateTime(u.last_login) : `<span class="sc-muted">${SC.t('Never', 'Kamwe')}</span>`) },
          { label: SC.t('Status', 'Hali'), render: (u) => SC.chip(u.active ? 'active' : 'inactive') },
          { label: '', cls: 'end', render: (u) => `<button class="sc-btn ghost sm" data-act="edit" data-id="${u.id}"><i class="fa-solid fa-pen"></i> ${SC.t('Edit', 'Hariri')}</button>` },
        ], users)}</div>`;
    }
    SC.delegate(el, { add: () => userModal(null, load), edit: (b) => userModal(users.find((u) => String(u.id) === b.dataset.id), load) });
    await load();
  };

  // =============================================================== settings
  const TABS = () => [['center', SC.t('Center information', 'Taarifa za Kituo'), 'fa-school'], ['academic', SC.t('Academic', 'Kitaaluma'), 'fa-graduation-cap'], ['financial', SC.t('Financial', 'Kifedha'), 'fa-coins'], ['roles', SC.t('Roles & permissions', 'Majukumu na Ruhusa'), 'fa-user-shield'], ['data', SC.t('Data & sample data', 'Data na Data ya Mfano'), 'fa-database']];

  SC.modules.settings = async (el) => {
    let tab = 'center'; const TABLIST = TABS();
    el.innerHTML = `${SC.pageHead(SC.t('Settings', 'Mipangilio'), SC.t('Make the system fit your school', 'Fanya mfumo ufae shule yako'))}<div class="sc-tabs" id="setTabs">${TABLIST.map(([k, l, i]) => `<button data-tab="${k}" class="${k === tab ? 'on' : ''}"><i class="fa-solid ${i}"></i> ${l}</button>`).join('')}</div><div id="setBody">${SC.skeleton(6)}</div>`;
    const body = el.querySelector('#setBody');
    const views = { center: centerTab, academic: academicTab, financial: financialTab, roles: rolesTab, data: dataTab };
    async function open(k) { tab = k; el.querySelectorAll('#setTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === k)); body.innerHTML = SC.skeleton(6); try { await views[k](body); } catch (e) { body.innerHTML = SC.errorBox(e); } }
    el.querySelector('#setTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (b) open(b.dataset.tab); });
    SC.after(() => open('center'));
  };

  async function centerTab(body) {
    const { school: s } = await SC.api.get('/school-info'); const soc = s.social || {};
    body.innerHTML = `<form class="sc-stack" id="cForm" novalidate><div class="sc-form-error" role="alert"></div>
      <div class="sc-card sc-form">${SC.f.section('fa-school', SC.t('Center information', 'Taarifa za Kituo'))}
        <div class="sc-photo-drop"><div class="preview" id="scPhotoPreview" style="width:96px;height:96px;position:relative"><i class="fa-solid fa-image"></i>${s.logo_key ? `<img src="${SC.logoUrl(s.id)}" alt="" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;background:#fff" onerror="this.remove()">` : ''}</div><div><label class="sc-btn ghost sm" for="f_logo"><i class="fa-solid fa-upload"></i> ${SC.t('Change logo', 'Badilisha Nembo')}</label><input id="f_logo" name="logo" type="file" accept="image/png,image/jpeg,image/webp" class="sc-sr"><div class="sc-small sc-muted" style="margin-top:.35rem">${SC.t('Shown on the sidebar, receipts, ID cards and report cards. PNG / JPG, square works best.', 'Inaonekana kwenye menyu, risiti, vitambulisho na ripoti za matokeo. PNG / JPG, mraba ni bora zaidi.')}</div></div></div>
        <div class="cols">${SC.f.input('name', SC.t('School / center name', 'Jina la Shule / Kituo'), { required: true, value: s.name })}${SC.f.input('short_name', SC.t('Short name', 'Jina Fupi'), { required: true, value: s.short_name, attr: { maxlength: 8 }, hint: SC.t('Like CTC or S21 — used as a logo placeholder.', 'Kama CTC au S21 — inatumika kama nembo ya muda.') })}</div>
        <div class="cols-3">${SC.f.input('phone', SC.t('Phone', 'Simu'), { type: 'tel', value: s.phone || '' })}${SC.f.input('email', SC.t('Email', 'Barua pepe'), { type: 'email', value: s.email || '' })}${SC.f.input('website', SC.t('Website', 'Tovuti'), { value: s.website || '', placeholder: 'https://…' })}</div>
        ${SC.f.input('address', SC.t('Address', 'Anwani'), { value: s.address || '' })}
        <div class="cols-3">${SC.f.input('admission_prefix', SC.t('Student ID prefix', 'Kiambishi cha Namba ya Mwanafunzi'), { required: true, value: s.admission_prefix, attr: { maxlength: 8 }, hint: SC.t(`Next student: ${s.admission_prefix}-${new Date().getFullYear()}-0001`, `Mwanafunzi ajaye: ${s.admission_prefix}-${new Date().getFullYear()}-0001`) })}${SC.f.input('currency', SC.t('Currency code', 'Nambari ya Sarafu'), { required: true, value: s.currency, attr: { maxlength: 6 }, hint: 'TZS, KES, UGX, USD…' })}<div class="sc-field"><label for="f_primary_color">${SC.t('Brand colour', 'Rangi ya Chapa')}</label><input class="sc-input" style="padding:.2rem;height:42px" id="f_primary_color" type="color" name="primary_color" value="${esc(s.primary_color || '#0B6E4F')}"></div></div>
        ${SC.f.input('receipt_note', SC.t('Receipt note', 'Maelezo ya Risiti'), { value: s.receipt_note || '' })}</div>
      <div class="sc-card sc-form">${SC.f.section('fa-share-nodes', SC.t('Social media', 'Mitandao ya Kijamii'))}<div class="cols-3">${['facebook', 'instagram', 'x', 'youtube', 'tiktok'].map((k) => SC.f.input(`social_${k}`, SC.cap(k === 'x' ? 'X (Twitter)' : k), { value: soc[k] || '', placeholder: SC.t('Link or @handle', 'Kiungo au @jina') })).join('')}</div></div>
      <div class="sc-row" style="justify-content:flex-end"><button class="sc-btn primary lg" type="submit"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save settings', 'Hifadhi Mipangilio')}</button></div></form>`;
    const form = body.querySelector('#cForm');
    form.querySelector('[name=phone]').dataset.kind = 'phone';
    SC.wirePhotoField(form, 'logo');
    form.querySelector('[name=primary_color]').addEventListener('input', (e) => SC.setBrand(e.target.value));
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); const err = form.querySelector('.sc-form-error'); err.classList.remove('show');
      if (!SC.validate(form)) return;
      const f = SC.formData(form);
      try {
        await SC.api.put('/school-info', { name: f.name, short_name: f.short_name, admission_prefix: f.admission_prefix, phone: f.phone, email: f.email, address: f.address, website: f.website, currency: f.currency, primary_color: f.primary_color, receipt_note: f.receipt_note, social: Object.fromEntries(['facebook', 'instagram', 'x', 'youtube', 'tiktok'].map((k) => [k, f[`social_${k}`]])) });
        await SC.uploadPhoto('/school-info/logo', form, 'logo');
        SC.toast(SC.t('Settings saved. Reloading…', 'Mipangilio imehifadhiwa. Inapakia upya…')); setTimeout(() => location.reload(), 700);
      } catch (ex) { err.textContent = ex.message; err.classList.add('show'); err.scrollIntoView({ block: 'center' }); }
    });
  }

  async function academicTab(body) {
    const [{ years, terms }, info] = await Promise.all([SC.api.get('/academic-years'), SC.api.get('/school-info')]);
    const st = info.settings; const div = st.division;
    const scale = st.grading_scale.map((g) => ({ ...g }));
    const draw = () => {
      body.innerHTML = `<div class="sc-grid cols-2">
        <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Academic years', 'Miaka ya Masomo')}</h3><div class="sc-actions"><button class="sc-btn primary sm" data-act="addyear"><i class="fa-solid fa-plus"></i> ${SC.t('Add year', 'Ongeza Mwaka')}</button></div></div>${SC.table([{ label: SC.t('Year', 'Mwaka'), render: (y) => `<b>${esc(y.name)}</b> ${y.is_current ? SC.chip('active', SC.t('Current', 'Sasa')) : ''}` }, { label: SC.t('Dates', 'Tarehe'), render: (y) => `${y.start_date ? SC.date(y.start_date) : '—'} → ${y.end_date ? SC.date(y.end_date) : '—'}` }, { label: '', cls: 'end', render: (y) => `<div class="sc-actions-cell">${y.is_current ? '' : `<button class="sc-btn soft sm" data-act="curyear" data-id="${y.id}">${SC.t('Make current', 'Fanya Iwe ya Sasa')}</button>`}<button class="sc-btn ghost sm" data-act="edityear" data-id="${y.id}"><i class="fa-solid fa-pen"></i></button>${y.is_current ? '' : `<button class="sc-btn danger-ghost sm" data-act="delyear" data-id="${y.id}"><i class="fa-solid fa-trash"></i></button>`}</div>` }], years)}
          <p class="sc-small sc-muted" style="margin:.8rem 0 0">${SC.t('Create classes for a new year in <a href="#classes">Classes</a>, then register students into them.', 'Unda madarasa ya mwaka mpya kupitia <a href="#classes">Madarasa</a>, kisha sajili wanafunzi ndani yake.')}</p></div>
        <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Terms', 'Mihula')}</h3><div class="sc-actions"><button class="sc-btn primary sm" data-act="addterm"><i class="fa-solid fa-plus"></i> ${SC.t('Add term', 'Ongeza Muhula')}</button></div></div>${SC.table([{ label: SC.t('Term', 'Muhula'), render: (t) => `<b>${esc(t.name)}</b>` }, { label: '', cls: 'end', render: (t) => `<div class="sc-actions-cell"><button class="sc-btn ghost sm" data-act="editterm" data-id="${t.id}"><i class="fa-solid fa-pen"></i></button><button class="sc-btn danger-ghost sm" data-act="delterm" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button></div>` }], terms, { empty: SC.empty('fa-calendar', SC.t('No terms', 'Hakuna mihula'), SC.t('Add Term 1, Term 2…', 'Ongeza Muhula wa 1, Muhula wa 2…')) })}
          <div class="sc-row" style="margin-top:1rem"><a class="sc-btn ghost sm" href="#classes"><i class="fa-solid fa-school"></i> ${SC.t('Manage classes', 'Simamia Madarasa')}</a><a class="sc-btn ghost sm" href="#subjects"><i class="fa-solid fa-book-open"></i> ${SC.t('Manage subjects', 'Simamia Masomo')}</a></div></div></div>
      <div class="sc-card" style="margin-top:1.1rem"><div class="sc-card-head"><h3>${SC.t('Grading scale', 'Kipimo cha Madaraja')}</h3><div class="sc-actions"><button class="sc-btn ghost sm" data-act="addgrade"><i class="fa-solid fa-plus"></i> ${SC.t('Add grade', 'Ongeza Daraja')}</button></div></div>
        <p class="sc-muted sc-small" style="margin-top:0">${SC.t('A mark is turned into a percentage and matched to the highest row whose minimum it reaches. Change this to match your school or country.', 'Alama inabadilishwa kuwa asilimia na kulinganishwa na safu ya juu zaidi ambayo kiwango chake cha chini kinafikia. Badilisha hii kufanana na shule au nchi yako.')}</p>
        <div class="sc-table-wrap"><table class="sc-table compact" style="min-width:520px"><thead><tr><th>${SC.t('Minimum %', 'Kiwango cha Chini %')}</th><th>${SC.t('Grade', 'Daraja')}</th><th>${SC.t('Points', 'Pointi')}</th><th>${SC.t('Remark', 'Maoni')}</th><th></th></tr></thead><tbody>${scale.map((g, i) => `<tr><td><input class="sc-input gs" data-i="${i}" data-k="min" type="number" min="0" max="100" value="${g.min}" style="width:90px"></td><td><input class="sc-input gs" data-i="${i}" data-k="grade" value="${esc(g.grade)}" maxlength="4" style="width:80px"></td><td><input class="sc-input gs" data-i="${i}" data-k="points" type="number" min="0" value="${g.points}" style="width:80px"></td><td><input class="sc-input gs" data-i="${i}" data-k="remark" value="${esc(g.remark || '')}"></td><td><button class="sc-btn danger-ghost sm" data-act="delgrade" data-i="${i}"><i class="fa-solid fa-xmark"></i></button></td></tr>`).join('')}</tbody></table></div>
        <div class="sc-card flat" style="background:var(--sc-surface-2);margin-top:1rem"><div class="sc-form">${SC.f.check('div_enabled', SC.t('<b>Show Division on results</b> (best subjects by points, common for O-Level)', '<b>Onyesha Divisheni kwenye matokeo</b> (masomo bora kwa pointi, kawaida kwa O-Level)'), div.enabled)}
          <div class="cols-3">${SC.f.input('div_best', SC.t('Number of best subjects', 'Idadi ya Masomo Bora'), { type: 'number', value: div.best_of, attr: { min: 1, max: 20 } })}${SC.f.input('div_bands', SC.t('Division bands (max points → name)', 'Mipaka ya Divisheni (pointi za juu → jina)'), { value: div.bands.map((b) => `${b.max}:${b.name}`).join(', '), hint: SC.t('Example: 17:I, 21:II, 25:III, 33:IV', 'Mfano: 17:I, 21:II, 25:III, 33:IV') })}${SC.f.input('div_fallback', SC.t('Otherwise', 'Vinginevyo'), { value: div.fallback })}</div></div></div>
        <div class="sc-row" style="margin-top:1rem;justify-content:space-between"><div class="sc-field" style="flex-direction:row;align-items:center;gap:.7rem"><label style="margin:0" for="absThr">${SC.t('Alert admin after this many absences in a month:', 'Arifu msimamizi baada ya kutokuhudhuria mara hizi kwa mwezi:')}</label><input class="sc-input" id="absThr" type="number" min="1" max="31" value="${st.absence_alert_threshold}" style="width:80px"></div><button class="sc-btn primary" data-act="savegrade"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save grading & alerts', 'Hifadhi Madaraja na Tahadhari')}</button></div></div>`;
    };
    draw();
    const yearModal = (y) => SC.formModal({ title: y ? SC.t('Edit academic year', 'Hariri Mwaka wa Masomo') : SC.t('Add academic year', 'Ongeza Mwaka wa Masomo'), submit: SC.t('Save', 'Hifadhi'), body: `${SC.f.input('name', SC.t('Name', 'Jina'), { required: true, value: y ? y.name : '', placeholder: SC.t('e.g. 2027 or 2026/2027', 'mfano: 2027 au 2026/2027') })}<div class="cols">${SC.f.input('start_date', SC.t('Starts', 'Inaanza'), { type: 'date', value: y ? y.start_date || '' : '' })}${SC.f.input('end_date', SC.t('Ends', 'Inaisha'), { type: 'date', value: y ? y.end_date || '' : '' })}</div>${y ? '' : SC.f.check('is_current', SC.t('Make this the current academic year', 'Fanya huu uwe mwaka wa sasa wa masomo'))}`,
      onSubmit: async (f) => { if (y) await SC.api.put(`/academic-years/${y.id}`, f); else await SC.api.post('/academic-years', f); SC.closeModal(); await SC.refreshLookups(); SC.toast(SC.t('Academic year saved.', 'Mwaka wa masomo umehifadhiwa.')); await academicTab(body); } });
    const termModal = (t) => SC.formModal({ title: t ? SC.t('Edit term', 'Hariri Muhula') : SC.t('Add term', 'Ongeza Muhula'), submit: SC.t('Save', 'Hifadhi'), body: `${SC.f.input('name', SC.t('Term name', 'Jina la Muhula'), { required: true, value: t ? t.name : '', placeholder: SC.t('e.g. Term 3', 'mfano: Muhula wa 3') })}${SC.f.input('sort_order', SC.t('Order', 'Mpangilio'), { type: 'number', value: t ? t.sort_order : terms.length + 1, attr: { min: 0 } })}`,
      onSubmit: async (f) => { const b = { name: f.name, sort_order: Number(f.sort_order) }; if (t) await SC.api.put(`/terms/${t.id}`, b); else await SC.api.post('/terms', b); SC.closeModal(); await SC.refreshLookups(); SC.toast(SC.t('Term saved.', 'Muhula umehifadhiwa.')); await academicTab(body); } });
    const snap = () => body.querySelectorAll('.gs').forEach((i) => { scale[i.dataset.i][i.dataset.k] = i.dataset.k === 'grade' || i.dataset.k === 'remark' ? i.value : Number(i.value); });
    SC.delegate(body, {
      addyear: () => yearModal(null), edityear: (b) => yearModal(years.find((y) => String(y.id) === b.dataset.id)),
      curyear: async (b) => { const y = years.find((x) => String(x.id) === b.dataset.id); await SC.api.put(`/academic-years/${y.id}`, { name: y.name, start_date: y.start_date, end_date: y.end_date, is_current: true }); await SC.refreshLookups(); SC.toast(SC.t(`${y.name} is now the current academic year.`, `${y.name} sasa ni mwaka wa sasa wa masomo.`)); location.reload(); },
      delyear: async (b) => { if (!(await SC.confirm({ title: SC.t('Delete this academic year?', 'Futa mwaka huu wa masomo?'), message: SC.t('Only years without classes, students or payments can be deleted.', 'Miaka isiyo na madarasa, wanafunzi au malipo tu inaweza kufutwa.'), confirmText: SC.t('Yes, delete', 'Ndiyo, futa') }))) return; await SC.api.del(`/academic-years/${b.dataset.id}`); await SC.refreshLookups(); SC.toast(SC.t('Academic year deleted.', 'Mwaka wa masomo umefutwa.')); academicTab(body); },
      addterm: () => termModal(null), editterm: (b) => termModal(terms.find((t) => String(t.id) === b.dataset.id)),
      delterm: async (b) => { if (!(await SC.confirm({ title: SC.t('Delete this term?', 'Futa muhula huu?'), message: SC.t('Examinations that used it will simply show no term.', 'Mitihani iliyoitumia itaonyesha tu hakuna muhula.'), confirmText: SC.t('Yes, delete', 'Ndiyo, futa') }))) return; await SC.api.del(`/terms/${b.dataset.id}`); await SC.refreshLookups(); SC.toast(SC.t('Term deleted.', 'Muhula umefutwa.')); academicTab(body); },
      addgrade: () => { snap(); scale.push({ min: 0, grade: '', points: 0, remark: '' }); draw(); }, delgrade: (b) => { snap(); scale.splice(Number(b.dataset.i), 1); draw(); },
      savegrade: async () => {
        snap();
        const bands = body.querySelector('#f_div_bands').value.split(',').map((x) => x.trim()).filter(Boolean).map((x) => { const [max, name] = x.split(':'); return { max: Number(max), name: (name || '').trim() }; });
        if (bands.some((x) => Number.isNaN(x.max) || !x.name)) throw new Error(SC.t('Division bands must look like 17:I, 21:II, 25:III', 'Mipaka ya divisheni lazima ionekane kama 17:I, 21:II, 25:III'));
        await SC.api.put('/settings', { grading_scale: scale, division: { enabled: body.querySelector('[name=div_enabled]').checked, best_of: Number(body.querySelector('#f_div_best').value), bands, fallback: body.querySelector('#f_div_fallback').value }, absence_alert_threshold: Number(body.querySelector('#absThr').value) });
        await SC.refreshLookups(); SC.toast(SC.t('Grading scale and alerts saved.', 'Kipimo cha madaraja na tahadhari zimehifadhiwa.')); setTimeout(() => location.reload(), 600);
      },
    });
  }

  async function financialTab(body) {
    const { settings: st } = await SC.api.get('/school-info');
    let methods = [...st.payment_methods];
    const draw = () => {
      body.innerHTML = `<div class="sc-grid cols-2"><div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Payment methods', 'Njia za Malipo')}</h3></div><div class="sc-row" style="gap:.5rem;margin-bottom:1rem">${methods.map((m, i) => `<span class="sc-chip info" style="font-size:.85rem;padding:.35rem .7rem">${esc(m)} <a href="#" data-act="delm" data-i="${i}" style="color:inherit" title="${SC.t('Remove', 'Ondoa')}"><i class="fa-solid fa-xmark"></i></a></span>`).join('')}</div>
          <div class="sc-row"><input class="sc-input" id="newMethod" placeholder="${SC.t('e.g. Cheque, M-Pesa, Tigo Pesa…', 'mfano: Hundi, M-Pesa, Tigo Pesa…')}" style="flex:1"><button class="sc-btn ghost" data-act="addm"><i class="fa-solid fa-plus"></i> ${SC.t('Add', 'Ongeza')}</button></div>
          <p class="sc-small sc-muted">${SC.t('Reference numbers are required for every method except Cash and Other.', 'Namba za kumbukumbu zinahitajika kwa kila njia isipokuwa Fedha Taslimu na Nyingine.')}</p></div>
        <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Receipts & ID cards', 'Risiti na Vitambulisho')}</h3></div><form class="sc-form" id="rForm" novalidate>${SC.f.input('receipt_prefix', SC.t('Receipt number prefix', 'Kiambishi cha Namba ya Risiti'), { value: st.receipt_prefix, attr: { maxlength: 8 }, hint: SC.t(`Example: ${st.receipt_prefix}-${new Date().getFullYear()}-000001`, `Mfano: ${st.receipt_prefix}-${new Date().getFullYear()}-000001`) })}${SC.f.textarea('receipt_footer', SC.t('Receipt footer message', 'Ujumbe wa Chini wa Risiti'), { value: st.receipt_footer, rows: 2 })}${SC.f.textarea('id_card_note', SC.t('Text on the back of the ID card', 'Maandishi Nyuma ya Kitambulisho'), { value: st.id_card_note, rows: 2 })}</form></div></div>
        <div class="sc-row" style="margin-top:1.1rem;justify-content:space-between"><a class="sc-btn ghost" href="#fees"><i class="fa-solid fa-list-check"></i> ${SC.t('Edit the fee structure', 'Hariri Muundo wa Ada')}</a><button class="sc-btn primary" data-act="savefin"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save financial settings', 'Hifadhi Mipangilio ya Kifedha')}</button></div>`;
    };
    draw();
    SC.delegate(body, {
      delm: (b) => { if (methods.length <= 1) return SC.toast(SC.t('Keep at least one payment method.', 'Weka angalau njia moja ya malipo.'), 'warn'); methods.splice(Number(b.dataset.i), 1); draw(); },
      addm: () => { const v = body.querySelector('#newMethod').value.trim(); if (!v) return; if (methods.some((m) => m.toLowerCase() === v.toLowerCase())) return SC.toast(SC.t('That method already exists.', 'Njia hiyo tayari ipo.'), 'warn'); methods.push(v); draw(); },
      savefin: async () => { const f = SC.formData(body.querySelector('#rForm')); await SC.api.put('/settings', { payment_methods: methods, receipt_prefix: f.receipt_prefix, receipt_footer: f.receipt_footer, id_card_note: f.id_card_note }); SC.state.settings.payment_methods = methods; SC.toast(SC.t('Financial settings saved.', 'Mipangilio ya kifedha imehifadhiwa.')); },
    });
  }

  async function rolesTab(body) {
    const d = await SC.api.get('/permissions');
    const matrix = { teacher: new Set(d.matrix.teacher), receptionist: new Set(d.matrix.receptionist) };
    const groups = [...new Set(d.catalogue.map((p) => p.group))];
    body.innerHTML = `<div class="sc-card"><div class="sc-card-head"><h3>${SC.t('What can each role do?', 'Kila jukumu linaweza kufanya nini?')}</h3><div class="sc-actions"><button class="sc-btn ghost sm" data-act="defaults"><i class="fa-solid fa-rotate-left"></i> ${SC.t('Reset to defaults', 'Rejesha Chaguo-msingi')}</button><button class="sc-btn primary sm" data-act="saveperms"><i class="fa-solid fa-floppy-disk"></i> ${SC.t('Save permissions', 'Hifadhi Ruhusa')}</button></div></div>
      <div class="sc-alert info" style="margin-bottom:1rem"><i class="fa-solid fa-circle-info"></i><div>${SC.t('Administrators always have every permission. Teachers only ever see students and classes they teach. Parents only see their own children.', 'Wasimamizi daima wana ruhusa zote. Walimu wanaona tu wanafunzi na madarasa wanayofundisha. Wazazi wanaona tu watoto wao wenyewe.')}</div></div>
      <div class="sc-table-wrap"><table class="sc-table sc-perm-table" style="min-width:560px"><thead><tr><th>${SC.t('Permission', 'Ruhusa')}</th><th>${SC.t('Administrator', 'Msimamizi')}</th><th>${SC.t('Teacher', 'Mwalimu')}</th><th>${SC.t('Receptionist', 'Mpokezi')}</th></tr></thead><tbody>${groups.map((g) => `<tr><td colspan="4" style="background:var(--sc-primary-50);font-weight:800;color:var(--sc-primary)">${esc(g)}</td></tr>${d.catalogue.filter((p) => p.group === g).map((p) => `<tr><td>${esc(p.label)}</td><td><input type="checkbox" checked disabled aria-label="${SC.t('Administrator', 'Msimamizi')} ${esc(p.label)}"></td>${['teacher', 'receptionist'].map((r) => `<td><input type="checkbox" data-role="${r}" data-perm="${p.key}" ${matrix[r].has(p.key) ? 'checked' : ''} aria-label="${r} ${esc(p.label)}"></td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div></div>`;
    body.addEventListener('change', (e) => { const c = e.target.closest('[data-perm]'); if (!c) return; matrix[c.dataset.role][c.checked ? 'add' : 'delete'](c.dataset.perm); });
    SC.delegate(body, {
      defaults: async () => { if (!(await SC.confirm({ title: SC.t('Reset permissions?', 'Rejesha ruhusa?'), message: SC.t('Teacher and receptionist permissions go back to the recommended defaults.', 'Ruhusa za walimu na wapokezi zitarejea kwenye chaguo-msingi zilizopendekezwa.'), confirmText: SC.t('Yes, reset', 'Ndiyo, rejesha'), danger: false, icon: 'fa-rotate-left' }))) return; for (const r of ['teacher', 'receptionist']) await SC.api.put('/permissions', { role: r, permissions: d.defaults[r] }); SC.toast(SC.t('Permissions reset to defaults.', 'Ruhusa zimerejeshwa kwenye chaguo-msingi.')); rolesTab(body); },
      saveperms: async () => { for (const r of ['teacher', 'receptionist']) await SC.api.put('/permissions', { role: r, permissions: [...matrix[r]] }); SC.toast(SC.t('Permissions saved. They apply the next time each person opens a page.', 'Ruhusa zimehifadhiwa. Zitaanza kutumika mara mtu atakapofungua ukurasa ujao.')); },
    });
  }

  async function dataTab(body) {
    body.innerHTML = `<div class="sc-grid cols-2"><div class="sc-card sc-stack"><h3><i class="fa-solid fa-wand-magic-sparkles" style="color:var(--sc-primary)"></i> ${SC.t('Try it with sample data', 'Jaribu na Data ya Mfano')}</h3><p class="sc-muted" style="margin:0">${SC.t('Fills an <b>empty</b> school with 24 students, 6 teachers, fees, payments, attendance, an examination with results, a timetable and announcements — so you can explore every screen and chart before entering your own data.', 'Inajaza shule <b>tupu</b> na wanafunzi 24, walimu 6, ada, malipo, mahudhurio, mtihani wenye matokeo, ratiba na matangazo — ili uweze kuchunguza kila ukurasa na chati kabla ya kuweka data yako mwenyewe.')}</p><div><button class="sc-btn primary" data-act="demo"><i class="fa-solid fa-play"></i> ${SC.t('Load sample data', 'Pakia Data ya Mfano')}</button></div></div>
      <div class="sc-card sc-stack" style="border-color:var(--sc-danger-bg)"><h3 style="color:var(--sc-danger)"><i class="fa-solid fa-triangle-exclamation"></i> ${SC.t('Erase all school data', 'Futa Data Yote ya Shule')}</h3><p class="sc-muted" style="margin:0">${SC.t('Removes every student, parent, teacher, payment, attendance record, examination, timetable entry and announcement so you can start fresh. Your school settings, classes, subjects, staff logins and permissions are kept. <b>This cannot be undone.</b>', 'Inaondoa kila mwanafunzi, mzazi, mwalimu, malipo, kumbukumbu za mahudhurio, mtihani, kipengele cha ratiba na tangazo ili uweze kuanza upya. Mipangilio ya shule yako, madarasa, masomo, akaunti za wafanyakazi na ruhusa zitabaki. <b>Hili haliwezi kutenduliwa.</b>')}</p><div><button class="sc-btn danger" data-act="reset"><i class="fa-solid fa-trash"></i> ${SC.t('Erase all data…', 'Futa Data Yote…')}</button></div></div></div>`;
    SC.delegate(body, {
      demo: async (b) => { b.disabled = true; b.innerHTML = `<span class="sc-spin"></span> ${SC.t('Loading sample data…', 'Inapakia data ya mfano…')}`; try { await SC.api.post('/demo-data'); SC.toast(SC.t('Sample data loaded. Explore the Dashboard!', 'Data ya mfano imepakiwa. Chunguza Dashibodi!')); setTimeout(() => { location.hash = 'dashboard'; location.reload(); }, 700); } catch (e) { SC.fail(e); b.disabled = false; b.innerHTML = `<i class="fa-solid fa-play"></i> ${SC.t('Load sample data', 'Pakia Data ya Mfano')}`; } },
      reset: () => SC.formModal({ title: SC.t('Erase all school data', 'Futa Data Yote ya Shule'), danger: true, submit: SC.t('Erase everything', 'Futa Kila Kitu'), body: `<div class="sc-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div>${SC.t('This permanently deletes all students, payments, results and attendance. Download any reports you need first.', 'Hii inafuta kabisa wanafunzi wote, malipo, matokeo na mahudhurio. Pakua ripoti zozote unazohitaji kwanza.')}</div></div>${SC.f.input('confirm', SC.t(`Type the school name to confirm: ${SC.state.school.name}`, `Andika jina la shule kuthibitisha: ${SC.state.school.name}`), { required: true })}`,
        onSubmit: async (f) => { await SC.api.post('/reset-data', { confirm: f.confirm }); SC.closeModal(); SC.toast(SC.t('All school data erased.', 'Data yote ya shule imefutwa.')); setTimeout(() => location.reload(), 700); } }),
    });
  }

  // =============================================================== audit log
  function device(ua) {
    if (!ua) return '';
    const os = /Windows/.test(ua) ? 'Windows' : /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iOS' : /Mac OS/.test(ua) ? 'macOS' : /Linux/.test(ua) ? 'Linux' : '';
    const br = /Edg\//.test(ua) ? 'Edge' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : '';
    return [br, os].filter(Boolean).join(' on ') || ua.slice(0, 30);
  }
  SC.modules.audit = async (el) => {
    const st = { q: '', user_id: '', action: '', from: '', to: '', page: 1, limit: 30 };
    let users = [];
    async function load() {
      const d = await SC.api.get('/audit' + SC.qs(st)); users = d.users;
      el.querySelector('#auBody').innerHTML = SC.table([
        { label: SC.t('Date', 'Tarehe'), render: (l) => SC.date(l.created_at) }, { label: SC.t('Time', 'Muda'), render: (l) => (l.created_at || '').slice(11, 16) },
        { label: SC.t('User', 'Mtumiaji'), render: (l) => `<b>${esc(l.user_name || SC.t('System', 'Mfumo'))}</b><div class="sc-small sc-muted">${esc(l.user_email || '')}</div>` },
        { label: SC.t('Action', 'Kitendo'), render: (l) => `<span class="sc-chip info">${esc(l.action)}</span>` }, { label: SC.t('Details', 'Maelezo'), render: (l) => `<span class="sc-small sc-wrap">${esc(l.details || '')}</span>` },
        { label: SC.t('IP / device', 'IP / Kifaa'), render: (l) => `<span class="sc-small">${esc(l.ip || '—')}<br><span class="sc-muted">${esc(device(l.user_agent))}</span></span>` },
      ], d.logs, { cls: 'compact', empty: SC.empty('fa-shield-halved', SC.t('No activity found', 'Hakuna shughuli iliyopatikana'), SC.t('Try clearing the filters.', 'Jaribu kufuta vichujio.')) }) + SC.pager(d.page, d.limit, d.total);
      const sel = el.querySelector('#auUser'); if (sel && sel.options.length <= 1) sel.innerHTML += users.map((u) => `<option value="${u.id}">${esc(u.name)}</option>`).join('');
    }
    el.innerHTML = `${SC.pageHead(SC.t('Audit logs', 'Kumbukumbu za Ukaguzi'), SC.t('Who did what, and when — logins, registrations, payments, results and more', 'Nani alifanya nini, na lini — kuingia, usajili, malipo, matokeo na zaidi'))}<div class="sc-card"><div class="sc-toolbar"><input class="sc-input grow" id="auQ" type="search" placeholder="${SC.t('Search details or action…', 'Tafuta maelezo au kitendo…')}"><select class="sc-select" id="auUser"><option value="">${SC.t('All users', 'Watumiaji wote')}</option></select>
      <select class="sc-select" id="auAct"><option value="">${SC.t('All actions', 'Vitendo vyote')}</option>${[['user.login', SC.t('Sign-ins', 'Kuingia')], ['student.create', SC.t('Student registration', 'Usajili wa Mwanafunzi')], ['student.update', SC.t('Student updates', 'Masasisho ya Mwanafunzi')], ['student.delete', SC.t('Student deletion', 'Ufutaji wa Mwanafunzi')], ['payment.create', SC.t('Payments created', 'Malipo Yaliyotengenezwa')], ['payment.update', SC.t('Payments updated', 'Malipo Yaliyosasishwa')], ['result.enter', SC.t('Results entered', 'Matokeo Yaliyoingizwa')], ['attendance.save', SC.t('Attendance', 'Mahudhurio')], ['settings.', SC.t('Settings', 'Mipangilio')]].map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <input class="sc-input" id="auF" type="date" aria-label="${SC.t('From', 'Kuanzia')}"><input class="sc-input" id="auT" type="date" aria-label="${SC.t('To', 'Hadi')}"></div><div id="auBody">${SC.skeleton(6)}</div></div>`;
    el.querySelector('#auQ').addEventListener('input', SC.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    [['#auUser', 'user_id'], ['#auAct', 'action'], ['#auF', 'from'], ['#auT', 'to']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; st.page = 1; load(); }));
    SC.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); load(); } });
    await load();
  };
})();
