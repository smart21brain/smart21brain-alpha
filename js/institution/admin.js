/* Administration — announcements, import, logins, permissions, settings, backup, audit, health. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;

  // ------------------------------------------------------------ Announcements
  IN.modules.announcements = async (el) => {
    const manage = IN.can('announcements.manage'); const { announcements } = await IN.api.get('/announcements');
    const AUD = [['members', IN.t('Everyone signed in', 'Wote waliojiunga')], ['students', IN.t('Students', 'Wanafunzi')], ['teachers', IN.t('Teachers', 'Walimu')], ['staff', IN.t('All staff', 'Wafanyakazi wote')], ['public', IN.t('Public (visible on the public page)', 'Umma (inaonekana kwenye ukurasa wa umma)')]];
    el.innerHTML = `${IN.pageHead(IN.t('Announcements', 'Matangazo'), IN.t('News and notices for your institution.', 'Habari na matangazo ya taasisi yako.'), manage ? `<button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('New announcement', 'Tangazo jipya')}</button>` : '')}
      <div class="in-stack">${announcements.length ? announcements.map((a) => `<div class="in-card"><div class="in-spread"><h3>${a.pinned ? '<i class="fa-solid fa-thumbtack" style="color:var(--in-primary)"></i> ' : ''}${esc(a.title)}</h3>${manage ? `<button class="in-btn danger-ghost sm" data-act="del" data-id="${a.id}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button>` : ''}</div>
        <p style="white-space:pre-wrap;margin:.5rem 0">${esc(a.body)}</p><div class="in-small in-muted">${esc(a.author || '')} · ${IN.date(a.created_at)} · ${IN.chip(a.audience === 'students' || a.audience === 'teachers' ? 'members' : a.audience, AUD.find((x) => x[0] === a.audience)?.[1])}${a.expires_on ? ` · ${IN.t('until', 'hadi')} ${IN.date(a.expires_on)}` : ''}</div></div>`).join('') : `<div class="in-card">${IN.empty('fa-bullhorn', IN.t('No announcements', 'Hakuna matangazo'), IN.t('Notices will appear here.', 'Matangazo yataonekana hapa.'), manage ? `<button class="in-btn primary" data-act="add">${IN.t('Post the first one', 'Weka la kwanza')}</button>` : '')}</div>`}</div>`;
    IN.delegate(el, {
      add: () => IN.formModal({ title: IN.t('New announcement', 'Tangazo jipya'), submit: IN.t('Post', 'Chapisha'), body: `${IN.f.input('title', IN.t('Title', 'Kichwa'), { required: true })}${IN.f.textarea('body', IN.t('Message', 'Ujumbe'), { required: true, rows: 5 })}<div class="cols">${IN.f.select('audience', IN.t('Who can see it', 'Nani anaweza kuliona'), AUD, { value: 'members', noBlank: true })}${IN.f.input('expires_on', IN.t('Hide after (optional)', 'Ficha baada ya (si lazima)'), { type: 'date' })}</div>${IN.f.check('pinned', IN.t('Pin to the top', 'Weka juu'))}`,
        onSubmit: async (d) => { await IN.api.post('/announcements', d); IN.closeModal(); IN.toast(IN.t('Posted. People were notified.', 'Limechapishwa. Watu wamearifiwa.')); IN.route(); } }),
      del: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this announcement?', 'Futa tangazo hili?'), message: '' }))) return; await IN.api.del(`/announcements/${b.dataset.id}`); IN.route(); },
    });
  };

  // ------------------------------------------------------------ Import wizard
  function parseCsv(text) {
    const rows = []; let row = []; let cur = ''; let q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) { if (c === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true; else if (c === ',' || c === ';' || c === '\t') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.some((x) => x.trim() !== '')) rows.push(row); row = []; }
      else cur += c;
    }
    row.push(cur); if (row.some((x) => x.trim() !== '')) rows.push(row);
    return rows;
  }
  async function readFileRows(file) {
    if (/\.(xlsx|xls)$/i.test(file.name)) { await IN.lib('xlsx'); const wb = window.XLSX.read(await file.arrayBuffer(), { type: 'array', cellDates: false }); return window.XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, raw: false, defval: '' }); }
    return parseCsv((await file.text()).replace(/^\uFEFF/, ''));
  }
  const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

  IN.modules.import = async (el) => {
    const meta = await IN.api.get('/import/fields'); const hist = await IN.api.get('/import/history');
    const KINDS = [['books', IN.t('Books / catalogue', 'Vitabu / katalogi')], ['students', IN.t('Students', 'Wanafunzi')], ['staff', IN.t('Staff', 'Wafanyakazi')]];
    const S = { kind: IN.hashQuery().get('type') || 'books', header: [], data: [], filename: '', map: {}, step: 1, val: null };
    const STEPS = [IN.t('Upload', 'Pakia'), IN.t('Match columns', 'Linganisha safu'), IN.t('Check', 'Kagua'), IN.t('Import', 'Leta'), IN.t('Summary', 'Muhtasari')];
    const stepsBar = () => `<div class="in-steps">${STEPS.map((s, i) => `<span class="${S.step === i + 1 ? 'on' : S.step > i + 1 ? 'done' : ''}">${i + 1}. ${s}</span>`).join('')}</div>`;
    const mappedRows = () => S.data.map((r) => { const o = {}; Object.entries(S.map).forEach(([field, idx]) => { if (idx !== '' && idx != null) o[field] = String(r[idx] == null ? '' : r[idx]).trim(); }); return o; });
    const chunks = (arr, n) => { const o = []; for (let i = 0; i < arr.length; i += n) o.push(arr.slice(i, i + n)); return o; };
    const draw = () => {
      const fields = meta.fields[S.kind];
      let body = '';
      if (S.step === 1) body = `<div class="in-card">${IN.f.select('kind', IN.t('What are you importing?', 'Unaleta nini?'), KINDS, { value: S.kind, noBlank: true })}
        <div class="in-field"><label for="impFile">${IN.t('Choose a CSV or Excel file', 'Chagua faili ya CSV au Excel')}</label><input class="in-input" type="file" id="impFile" accept=".csv,.txt,.xlsx,.xls"><span class="hint">${IN.t('The first row must contain column names. Up to 5,000 rows.', 'Safu ya kwanza iwe na majina ya safu. Hadi safu 5,000.')}</span></div>
        <div class="in-small in-muted">${IN.t('Columns you can import:', 'Safu unazoweza kuleta:')} ${fields.map((f) => `${esc(f.label)}${f.required ? '*' : ''}`).join(', ')}</div></div>`;
      if (S.step === 2) body = `<div class="in-card"><p class="in-muted">${IN.t(`${S.data.length} rows found in "${esc(S.filename)}". Tell us which column holds what. We matched what we could.`, `Safu ${S.data.length} zimepatikana kwenye "${esc(S.filename)}". Tuambie safu ipi ina nini. Tumelinganisha tulichoweza.`)}</p>
        ${fields.map((f) => `<div class="in-maprow"><label><b>${esc(f.label)}</b>${f.required ? ' <span class="req" style="color:var(--in-danger)">*</span>' : ''}</label><select class="in-select" data-map="${f.key}"><option value="">${IN.t('— skip —', '— ruka —')}</option>${S.header.map((h, i) => `<option value="${i}" ${String(S.map[f.key]) === String(i) ? 'selected' : ''}>${esc(h || IN.t('(blank)', '(tupu)'))}</option>`).join('')}</select></div>`).join('')}
        <div class="in-row" style="margin-top:1rem"><button class="in-btn ghost" data-act="back">${IN.t('Back', 'Rudi')}</button><button class="in-btn primary" data-act="check">${IN.t('Check my data', 'Kagua data yangu')}</button></div></div>`;
      if (S.step === 3 && S.val) {
        const v = S.val;
        body = `<div class="in-card"><div class="in-grid cols-3" style="margin-bottom:1rem">${IN.stat('fa-list', v.total, IN.t('Rows', 'Safu'))}${IN.stat('fa-circle-check', v.valid, IN.t('Ready to import', 'Tayari'), '', 'green')}${IN.stat('fa-circle-exclamation', v.invalid, IN.t('Have problems', 'Zina matatizo'), '', v.invalid ? 'red' : 'green')}</div>
          ${v.invalid ? `<h4>${IN.t('Problems found', 'Matatizo yaliyopatikana')}</h4><div class="in-errlist">${v.errors.map((e) => `<div><b>${IN.t('Row', 'Safu')} ${e.row + 1}:</b> ${esc(e.errors.join(' '))}</div>`).join('')}${v.invalid > v.errors.length ? `<div>…</div>` : ''}</div>` : `<div class="in-alert ok"><i class="fa-solid fa-circle-check"></i><div>${IN.t('No problems found.', 'Hakuna matatizo yaliyopatikana.')}</div></div>`}
          <h4 style="margin-top:1rem">${IN.t('Preview (first rows)', 'Hakiki (safu za kwanza)')}</h4>${IN.table([{ label: '', render: (r) => r.ok ? '<i class="fa-solid fa-circle-check" style="color:var(--in-ok)"></i>' : '<i class="fa-solid fa-circle-xmark" style="color:var(--in-danger)"></i>' }, ...fields.filter((f) => S.map[f.key] !== '' && S.map[f.key] != null).slice(0, 6).map((f) => ({ label: f.label, render: (r) => esc(r[f.key] || '') }))], v.preview)}
          <div class="in-row" style="margin-top:1rem;flex-wrap:wrap"><button class="in-btn ghost" data-act="back">${IN.t('Back', 'Rudi')}</button>${v.valid ? `<button class="in-btn primary" data-act="commit" ${v.invalid ? 'data-skip="1"' : ''}><i class="fa-solid fa-file-import"></i> ${v.invalid ? IN.t(`Import the ${v.valid} good rows, skip the rest`, `Leta safu ${v.valid} nzuri, ruka zingine`) : IN.t(`Import ${v.valid} rows`, `Leta safu ${v.valid}`)}</button>` : ''}</div></div>`;
      }
      if (S.step === 4) body = `<div class="in-card">${IN.empty('fa-spinner fa-spin', IN.t('Importing…', 'Inaleta…'), IN.t('Please keep this page open.', 'Tafadhali acha ukurasa huu wazi.'))}</div>`;
      if (S.step === 5) { const r = S.result; body = `<div class="in-card"><div class="in-grid cols-3" style="margin-bottom:1rem">${IN.stat('fa-circle-check', r.imported, IN.t('Imported', 'Zimeletwa'), '', 'green')}${IN.stat('fa-forward', r.skipped, IN.t('Skipped', 'Zimerukwa'), '', r.skipped ? 'amber' : '')}${IN.stat('fa-list', r.total, IN.t('Rows in file', 'Safu kwenye faili'))}</div>${r.errors.length ? `<h4>${IN.t('Rows that were not imported', 'Safu ambazo hazikuletwa')}</h4><div class="in-errlist">${r.errors.map((e) => `<div><b>${IN.t('Row', 'Safu')} ${e.row + 1}:</b> ${esc(e.errors.join(' '))}</div>`).join('')}</div>` : ''}<div class="in-row" style="margin-top:1rem"><a class="in-btn primary" href="#${S.kind === 'books' ? 'books' : S.kind === 'students' ? 'students' : 'staff'}">${IN.t('View records', 'Ona rekodi')}</a><button class="in-btn ghost" data-act="again">${IN.t('Import another file', 'Leta faili nyingine')}</button></div></div>`; }
      el.querySelector('#impBody').innerHTML = stepsBar() + body;
      const k = el.querySelector('[name=kind]'); if (k) k.addEventListener('change', (e) => { S.kind = e.target.value; draw(); });
      const ff = el.querySelector('#impFile');
      if (ff) ff.addEventListener('change', async () => {
        const f = ff.files[0]; if (!f) return;
        try {
          const rows = await readFileRows(f);
          if (rows.length < 2) throw new Error(IN.t('The file needs a header row and at least one data row.', 'Faili inahitaji safu ya vichwa na angalau safu moja ya data.'));
          if (rows.length > 5001) throw new Error(IN.t('This file has more than 5,000 rows. Please split it into smaller files.', 'Faili hii ina zaidi ya safu 5,000. Tafadhali igawe.'));
          S.header = rows[0].map((h) => String(h).trim()); S.data = rows.slice(1); S.filename = f.name; S.map = {};
          meta.fields[S.kind].forEach((fl) => { const i = S.header.findIndex((h) => norm(h) === norm(fl.label) || norm(h) === norm(fl.key)); if (i >= 0) S.map[fl.key] = i; });
          S.step = 2; draw();
        } catch (e) { IN.fail(e); }
      });
      el.querySelectorAll('[data-map]').forEach((s) => s.addEventListener('change', () => { S.map[s.dataset.map] = s.value; }));
    };
    el.innerHTML = `${IN.pageHead(IN.t('Import records', 'Leta rekodi'), IN.t('Move your existing paper or spreadsheet records into the system safely. Nothing is saved until you confirm.', 'Hamisha rekodi zako za karatasi au lahajedwali kwa usalama. Hakuna kinachohifadhiwa hadi uthibitishe.'))}<div id="impBody"></div>
      ${hist.imports.length ? `<div class="in-card" style="margin-top:1rem"><div class="in-card-head"><h3>${IN.t('Recent imports', 'Uletaji wa hivi karibuni')}</h3></div>${IN.table([{ label: IN.t('When', 'Lini'), render: (h) => IN.dateTime(h.created_at) }, { label: IN.t('Type', 'Aina'), render: (h) => IN.cap(h.kind) }, { label: IN.t('File', 'Faili'), render: (h) => esc(h.filename || '—') }, { label: IN.t('Imported', 'Zimeletwa'), render: (h) => `${h.imported_rows}/${h.total_rows}` }, { label: IN.t('By', 'Na'), render: (h) => esc(h.user || '—') }], hist.imports)}</div>` : ''}`;
    IN.delegate(el, {
      back: () => { S.step = Math.max(1, S.step - 1); draw(); },
      again: () => IN.route(),
      check: async (b) => {
        const miss = meta.fields[S.kind].filter((f) => f.required && (S.map[f.key] === '' || S.map[f.key] == null));
        if (miss.length) return IN.toast(IN.t(`Please match the required column: ${miss.map((m) => m.label).join(', ')}.`, `Tafadhali linganisha safu inayohitajika: ${miss.map((m) => m.label).join(', ')}.`), 'error');
        b.disabled = true; b.textContent = IN.t('Checking…', 'Inakagua…');
        try {
          const all = mappedRows(); const agg = { total: 0, valid: 0, invalid: 0, errors: [], preview: [] }; let off = 0;
          for (const part of chunks(all, 500)) {
            const r = await IN.api.post('/import/validate', { kind: S.kind, rows: part });
            agg.total += r.total; agg.valid += r.valid; agg.invalid += r.invalid; agg.errors.push(...r.errors.map((e) => ({ ...e, row: e.row + off }))); if (!agg.preview.length) agg.preview = r.preview; off += part.length;
          }
          agg.errors = agg.errors.slice(0, 200); S.val = agg; S.step = 3; draw();
        } catch (e) { IN.fail(e); b.disabled = false; b.textContent = IN.t('Check my data', 'Kagua data yangu'); }
      },
      commit: async (b) => {
        S.step = 4; draw();
        try {
          const all = mappedRows(); const res = { total: 0, imported: 0, skipped: 0, errors: [] }; let off = 0;
          for (const part of chunks(all, 500)) {
            const r = await IN.api.post('/import/commit', { kind: S.kind, rows: part, skip_invalid: true, filename: S.filename });
            res.total += r.total; res.imported += r.imported; res.skipped += r.skipped; res.errors.push(...r.errors.map((e) => ({ ...e, row: e.row + off }))); off += part.length;
          }
          res.errors = res.errors.slice(0, 200); S.result = res; S.step = 5; await IN.refreshLookups(); draw();
        } catch (e) { IN.fail(e); S.step = 3; draw(); }
      },
    });
    draw();
  };

  // ------------------------------------------------------------ Logins & roles
  IN.modules.users = async (el) => {
    const d = await IN.api.get('/users');
    el.innerHTML = `${IN.pageHead(IN.t('Logins & roles', 'Akaunti na majukumu'), IN.t('Who can sign in, and what each role may do.', 'Nani anaweza kuingia, na kila jukumu linaruhusiwa nini.'), `<a class="in-btn ghost" href="#permissions"><i class="fa-solid fa-user-shield"></i> ${IN.t('Roles & permissions', 'Majukumu na ruhusa')}</a><button class="in-btn primary" data-act="add"><i class="fa-solid fa-plus"></i> ${IN.t('Add login', 'Ongeza akaunti')}</button>`)}
      <div class="in-card">${IN.table([{ label: IN.t('Person', 'Mtu'), render: (u) => `<b>${esc(u.name)}</b><div class="in-small in-muted">${esc(u.email)}</div>` }, { label: IN.t('Role', 'Jukumu'), render: (u) => esc(d.labels[u.role]) }, { label: IN.t('Linked record', 'Rekodi'), render: (u) => u.student_id ? IN.t('Student', 'Mwanafunzi') : u.staff_id ? IN.t('Staff', 'Mfanyakazi') : '—' }, { label: IN.t('Last sign-in', 'Aliingia mwisho'), render: (u) => u.last_login ? IN.dateTime(u.last_login) : IN.t('Never', 'Hajawahi') }, { label: IN.t('Status', 'Hali'), render: (u) => IN.chip(u.active ? 'active' : 'inactive', u.active ? undefined : IN.t('Switched off', 'Imezimwa')) },
        { label: '', cls: 'in-right', render: (u) => `<button class="in-btn ghost sm" data-act="edit" data-id="${u.id}">${IN.t('Manage', 'Simamia')}</button>` }], d.users)}</div>`;
    const roleOpts = d.roles.filter((r) => r !== 'super_admin' || IN.state.role === 'super_admin').map((r) => [r, d.labels[r]]);
    IN.delegate(el, {
      add: async () => {
        const [{ staff }] = await Promise.all([IN.can('staff.view') ? IN.api.get('/staff' + IN.qs({ limit: 100 })) : { staff: [] }]);
        IN.formModal({ title: IN.t('Add a login', 'Ongeza akaunti'), body: `${IN.f.input('name', IN.t('Full name', 'Jina kamili'), { required: true })}${IN.f.input('email', 'Email', { type: 'email', required: true })}${IN.f.select('role', IN.t('Role', 'Jukumu'), roleOpts, { value: 'staff', noBlank: true })}${IN.f.input('password', IN.t('Temporary password', 'Nenosiri la muda'), { required: true, attr: { minlength: 8 }, hint: IN.t('At least 8 characters. Ignored if this person already has an account — they keep their own password.', 'Angalau herufi 8. Haitumiki kama mtu ana akaunti tayari.') })}
          ${staff.length ? IN.f.select('staff_id', IN.t('Link to staff record (teachers need this to enter marks)', 'Unganisha na rekodi ya mfanyakazi (walimu wanahitaji hii kuingiza alama)'), staff.map((s) => ({ v: s.id, l: `${s.full_name} (${s.staff_no})` }))) : ''}<p class="in-small in-muted">${IN.t('For student logins, open the student record and choose "Create login".', 'Kwa akaunti za wanafunzi, fungua rekodi ya mwanafunzi na uchague "Tengeneza akaunti".')}</p>`,
          onSubmit: async (v) => { if (v.role === 'student') throw new Error(IN.t('Create student logins from the student record.', 'Tengeneza akaunti za wanafunzi kutoka kwenye rekodi ya mwanafunzi.')); await IN.api.post('/users', { ...v, staff_id: v.staff_id || undefined }); IN.closeModal(); IN.toast(IN.t('Login created.', 'Akaunti imetengenezwa.')); IN.route(); } });
      },
      edit: (b) => { const u = d.users.find((x) => x.id === Number(b.dataset.id));
        IN.formModal({ title: u.name, body: `${IN.f.select('role', IN.t('Role', 'Jukumu'), roleOpts, { value: u.role, noBlank: true })}${IN.f.check('active', IN.t('Can sign in', 'Anaweza kuingia'), !!u.active)}${IN.f.input('new_password', IN.t('Reset password (optional)', 'Weka nenosiri jipya (si lazima)'), { attr: { minlength: 8, autocomplete: 'new-password' }, hint: IN.t('Signs them out everywhere.', 'Itamtoa kila mahali.') })}`,
          onSubmit: async (v) => { await IN.api.put(`/users/${u.id}`, { role: v.role, active: v.active, new_password: v.new_password || undefined }); IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); IN.route(); } }); },
    });
  };

  // ------------------------------------------------------------ Permissions matrix
  IN.modules.permissions = async (el) => {
    const d = await IN.api.get('/permissions'); const edit = IN.can('permissions.manage');
    const roles = d.roles; const groups = [...new Set(d.catalogue.map((p) => p.group))];
    const GL = { Library: IN.t('Library', 'Maktaba'), 'E-Library': IN.t('E-Library', 'Maktaba Mtandao'), People: IN.t('People', 'Watu'), Academics: IN.t('Academics', 'Masomo'), System: IN.t('System', 'Mfumo') };
    el.innerHTML = `${IN.pageHead(IN.t('Roles & permissions', 'Majukumu na ruhusa'), IN.t('Decide what each role can do. Changes apply the next time a person opens a page.', 'Amua kila jukumu linaweza kufanya nini. Mabadiliko yanatumika mtu anapofungua ukurasa.'), `<a class="in-btn ghost" href="#users"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Logins', 'Akaunti')}</a>${edit ? `<button class="in-btn primary" id="pmSave"><i class="fa-solid fa-floppy-disk"></i> ${IN.t('Save changes', 'Hifadhi')}</button>` : ''}`)}
      <div class="in-card"><div class="in-table-wrap"><table class="in-matrix"><thead><tr><th>${IN.t('Permission', 'Ruhusa')}</th>${roles.map((r) => `<th>${esc(d.labels[r])}</th>`).join('')}</tr></thead><tbody>${groups.map((g) => `<tr class="grp"><td colspan="${roles.length + 1}">${esc(GL[g] || g)}</td></tr>${d.catalogue.filter((p) => p.group === g).map((p) => `<tr><td>${esc(p.label)}</td>${roles.map((r) => `<td><input type="checkbox" data-role="${r}" data-perm="${p.key}" ${(d.matrix[r] || []).includes(p.key) ? 'checked' : ''} ${r === 'super_admin' || !edit ? 'disabled' : ''} aria-label="${esc(d.labels[r])}: ${esc(p.label)}"></td>`).join('')}</tr>`).join('')}`).join('')}</tbody></table></div>
      <p class="in-small in-muted" style="margin-top:.8rem">${IN.t('The Super Administrator always has every permission, so you can never lock yourself out.', 'Msimamizi Mkuu ana ruhusa zote kila wakati, kwa hiyo hawezi kujifungia nje.')}</p></div>`;
    const save = el.querySelector('#pmSave');
    if (save) save.addEventListener('click', async () => {
      save.disabled = true;
      try { for (const r of roles.filter((x) => x !== 'super_admin')) { const perms = [...el.querySelectorAll(`[data-role="${r}"]:checked`)].map((c) => c.dataset.perm); await IN.api.put('/permissions', { role: r, permissions: perms }); } IN.toast(IN.t('Permissions saved.', 'Ruhusa zimehifadhiwa.')); } catch (e) { IN.fail(e); } save.disabled = false;
    });
  };

  // ------------------------------------------------------------ Settings
  IN.modules.settings = async (el) => {
    const d = await IN.api.get('/info'); const i = d.institution; const s = d.settings; let tab = 'inst';
    const TYPES = d.types.map((t) => [t, IN.cap(t)]);
    const TZ = [[-300, 'UTC−5'], [0, 'UTC'], [60, 'UTC+1'], [120, 'UTC+2 (Cairo, Johannesburg)'], [180, 'UTC+3 (East Africa — Dodoma, Nairobi)'], [240, 'UTC+4'], [330, 'UTC+5:30'], [480, 'UTC+8']];
    const pane = () => {
      if (tab === 'inst') return `<form class="in-form" id="fInst" novalidate><div class="in-form-error" role="alert"></div>
        <div class="in-row" style="gap:1rem;margin-bottom:.5rem">${IN.instLogo('in-logo')}<div><label class="in-btn ghost sm" for="logoFile"><i class="fa-solid fa-upload"></i> ${IN.t('Change logo', 'Badilisha nembo')}</label><input id="logoFile" type="file" accept="image/png,image/jpeg,image/webp" class="in-sr"></div></div>
        ${IN.f.input('name', IN.t('Institution name', 'Jina la taasisi'), { required: true, value: i.name })}<div class="cols">${IN.f.input('short_name', IN.t('Short name', 'Jina fupi'), { required: true, value: i.short_name, attr: { maxlength: 8 } })}${IN.f.select('inst_type', IN.t('Type', 'Aina'), TYPES, { value: i.inst_type, noBlank: true })}</div>
        ${IN.f.textarea('about', IN.t('About (shown on the public page)', 'Kuhusu (inaonekana kwenye ukurasa wa umma)'), { value: i.about, rows: 3 })}<div class="cols">${IN.f.input('phone', IN.t('Phone', 'Simu'), { type: 'tel', value: i.phone })}${IN.f.input('email', 'Email', { type: 'email', value: i.email })}</div>
        <div class="cols">${IN.f.input('address', IN.t('Address', 'Anwani'), { value: i.address })}${IN.f.input('website', IN.t('Website', 'Tovuti'), { value: i.website })}</div>
        <div class="cols-3 cols">${IN.f.input('currency', IN.t('Currency', 'Sarafu'), { required: true, value: i.currency, attr: { maxlength: 6 } })}${IN.f.input('primary_color', IN.t('Brand colour', 'Rangi ya chapa'), { type: 'color', value: i.primary_color })}${IN.f.select('utc_offset_min', IN.t('Time zone', 'Saa za eneo'), TZ, { value: i.utc_offset_min, noBlank: true })}</div>
        ${IN.f.check('is_public', IN.t('Show the public catalogue and public announcements to anyone (no sign-in)', 'Onyesha katalogi ya umma na matangazo ya umma kwa yeyote (bila kujiunga)'), !!i.is_public)}
        <div class="in-small in-muted">${IN.t('Public page:', 'Ukurasa wa umma:')} <a href="institution-opac.html?i=${esc(i.slug)}" target="_blank" rel="noopener">${location.origin}/institution-opac.html?i=${esc(i.slug)}</a></div>
        <button class="in-btn primary" type="submit">${IN.t('Save', 'Hifadhi')}</button></form>`;
      if (tab === 'lib') return `<form class="in-form" id="fLib" novalidate><div class="in-form-error" role="alert"></div>${IN.f.section('fa-calendar', IN.t('Borrowing periods & limits', 'Muda na vikomo vya kukopa'))}
        <div class="cols">${IN.f.input('loan_days_student', IN.t('Loan days — students', 'Siku za kukopa — wanafunzi'), { type: 'number', value: s.loan_days_student, attr: { min: 1 } })}${IN.f.input('loan_days_staff', IN.t('Loan days — staff', 'Siku za kukopa — wafanyakazi'), { type: 'number', value: s.loan_days_staff, attr: { min: 1 } })}</div>
        <div class="cols">${IN.f.input('max_loans_student', IN.t('Max books — students', 'Vitabu juu — wanafunzi'), { type: 'number', value: s.max_loans_student, attr: { min: 1 } })}${IN.f.input('max_loans_staff', IN.t('Max books — staff', 'Vitabu juu — wafanyakazi'), { type: 'number', value: s.max_loans_staff, attr: { min: 1 } })}</div>
        <div class="cols-3 cols">${IN.f.input('max_renewals', IN.t('Renewals allowed', 'Mara za kuongeza'), { type: 'number', value: s.max_renewals, attr: { min: 0 } })}${IN.f.input('renewal_days', IN.t('Days added per renewal', 'Siku kwa kila kuongeza'), { type: 'number', value: s.renewal_days, attr: { min: 1 } })}${IN.f.input('reservation_hold_days', IN.t('Days a reserved book is held', 'Siku kitabu kinahifadhiwa'), { type: 'number', value: s.reservation_hold_days, attr: { min: 1 } })}</div>
        ${IN.f.section('fa-coins', `${IN.t('Fines', 'Faini')} (${esc(i.currency)})`)}<div class="cols-3 cols">${IN.f.input('fine_per_day', IN.t('Per day overdue', 'Kwa siku ya kuchelewa'), { type: 'number', value: s.fine_per_day, attr: { min: 0, step: 'any' } })}${IN.f.input('lost_fine_multiplier', IN.t('Lost book: × price', 'Kitabu kilichopotea: × bei'), { type: 'number', value: s.lost_fine_multiplier, attr: { min: 0, step: 'any' } })}${IN.f.input('damaged_fine', IN.t('Damaged book (flat)', 'Kitabu kilichoharibika'), { type: 'number', value: s.damaged_fine, attr: { min: 0, step: 'any' } })}</div>
        <button class="in-btn primary" type="submit">${IN.t('Save', 'Hifadhi')}</button></form>`;
      return `<form class="in-form" id="fAcad" novalidate><div class="in-form-error" role="alert"></div>${IN.f.section('fa-square-poll-vertical', IN.t('Grading scale', 'Mfumo wa madaraja'))}<div id="gsRows">${s.grading_scale.map((g) => gradeRow(g)).join('')}</div><button type="button" class="in-btn ghost sm" id="gsAdd"><i class="fa-solid fa-plus"></i> ${IN.t('Add grade', 'Ongeza daraja')}</button><p class="in-small in-muted">${IN.t('A mark gets the highest grade whose minimum it reaches. One grade must start at 0.', 'Alama hupata daraja la juu ambalo imefikia kiwango chake. Daraja moja lazima lianze 0.')}</p>
        ${IN.f.section('fa-hashtag', IN.t('Numbering & uploads', 'Namba na upakiaji'))}<div class="cols-3 cols">${IN.f.input('student_prefix', IN.t('Student ID prefix', 'Kiambishi cha namba ya mwanafunzi'), { value: s.student_prefix, attr: { maxlength: 8 } })}${IN.f.input('staff_prefix', IN.t('Staff prefix', 'Kiambishi cha wafanyakazi'), { value: s.staff_prefix, attr: { maxlength: 8 } })}${IN.f.input('accession_prefix', IN.t('Copy number prefix', 'Kiambishi cha nakala'), { value: s.accession_prefix, attr: { maxlength: 8 } })}</div>
        ${IN.f.input('max_upload_mb', IN.t('Largest upload (MB, up to 25)', 'Upakiaji mkubwa zaidi (MB, hadi 25)'), { type: 'number', value: s.max_upload_mb, attr: { min: 1, max: 25 } })}<button class="in-btn primary" type="submit">${IN.t('Save', 'Hifadhi')}</button></form>`;
    };
    const gradeRow = (g = {}) => `<div class="in-row gs" style="gap:.5rem;margin-bottom:.4rem"><input class="in-input" data-g="min" type="number" min="0" max="100" value="${g.min ?? ''}" placeholder="${IN.t('From marks', 'Kuanzia alama')}" style="width:110px" aria-label="${IN.t('Minimum marks', 'Alama za chini')}"><input class="in-input" data-g="grade" value="${esc(g.grade || '')}" placeholder="${IN.t('Grade', 'Daraja')}" maxlength="4" style="width:90px" aria-label="${IN.t('Grade', 'Daraja')}"><input class="in-input" data-g="points" type="number" min="0" step="any" value="${g.points ?? ''}" placeholder="${IN.t('Points', 'Pointi')}" style="width:90px" aria-label="${IN.t('Points', 'Pointi')}"><button type="button" class="in-btn danger-ghost sm" data-rmg aria-label="${IN.t('Remove', 'Ondoa')}"><i class="fa-solid fa-xmark"></i></button></div>`;
    const draw = () => {
      el.querySelector('#stPane').innerHTML = pane();
      const wire = (id, fn) => { const f = el.querySelector(id); if (!f) return; f.addEventListener('submit', async (e) => { e.preventDefault(); const err = f.querySelector('.in-form-error'); err.classList.remove('show'); if (!IN.validate(f)) return; try { await fn(IN.formData(f), f); } catch (x) { err.textContent = x.message; err.classList.add('show'); } }); };
      wire('#fInst', async (v) => { await IN.api.put('/info', { ...v, is_public: !!v.is_public, utc_offset_min: Number(v.utc_offset_min) }); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); location.reload(); });
      wire('#fLib', async (v) => { await IN.api.put('/settings', v); Object.assign(s, Object.fromEntries(Object.entries(v).map(([k, x]) => [k, Number(x)]))); IN.toast(IN.t('Library rules saved.', 'Sheria za maktaba zimehifadhiwa.')); });
      wire('#fAcad', async (v, f) => { const scale = [...f.querySelectorAll('.gs')].map((r) => ({ min: Number(r.querySelector('[data-g=min]').value), grade: r.querySelector('[data-g=grade]').value.trim(), points: Number(r.querySelector('[data-g=points]').value || 0) })).filter((g) => g.grade); await IN.api.put('/settings', { ...v, grading_scale: scale }); const ns = await IN.api.get('/info'); Object.assign(s, ns.settings); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); });
      const lf = el.querySelector('#logoFile'); if (lf) lf.addEventListener('change', async () => { if (!lf.files[0]) return; try { const fd = new FormData(); fd.append('logo', await IN.resizeImage(lf.files[0], 512)); await IN.api.upload('/info/logo', fd); IN.toast(IN.t('Logo updated.', 'Nembo imesasishwa.')); location.reload(); } catch (e) { IN.fail(e); } });
      const ga = el.querySelector('#gsAdd'); if (ga) ga.addEventListener('click', () => el.querySelector('#gsRows').insertAdjacentHTML('beforeend', gradeRow()));
      el.querySelectorAll('[data-rmg]').forEach(() => {}); const rows = el.querySelector('#gsRows'); if (rows) rows.addEventListener('click', (e) => { const b = e.target.closest('[data-rmg]'); if (b) b.closest('.gs').remove(); });
    };
    el.innerHTML = `${IN.pageHead(IN.t('Settings', 'Mipangilio'), IN.t('Nothing here is fixed in the code — change it to suit your institution.', 'Hakuna kitu hapa kilichofungwa kwenye msimbo — kibadilishe kulingana na taasisi yako.'), `<a class="in-btn ghost" href="#structure"><i class="fa-solid fa-sitemap"></i> ${IN.t('Departments & terms', 'Idara na mihula')}</a><a class="in-btn ghost" href="#permissions"><i class="fa-solid fa-user-shield"></i> ${IN.t('Roles & permissions', 'Majukumu na ruhusa')}</a>`)}
      <div class="in-card"><div class="in-tabs">${[['inst', IN.t('Institution', 'Taasisi')], ['lib', IN.t('Library rules', 'Sheria za maktaba')], ['acad', IN.t('Academic & numbering', 'Masomo na namba')]].map(([k, l]) => `<button class="${tab === k ? 'on' : ''}" data-act="tab" data-k="${k}">${l}</button>`).join('')}</div><div id="stPane"></div></div>`;
    IN.delegate(el, { tab: (b) => { tab = b.dataset.k; el.querySelectorAll('[data-act=tab]').forEach((x) => x.classList.toggle('on', x === b)); draw(); } });
    draw();
  };

  // ------------------------------------------------------------ Backup & restore
  IN.modules.backup = async (el) => {
    const d = await IN.api.get('/backups'); const sup = IN.state.role === 'super_admin';
    el.innerHTML = `${IN.pageHead(IN.t('Backup & restore', 'Hifadhi nakala na kurejesha'), IN.t('A backup is a complete copy of your records (books, students, results, loans…). Digital files are stored separately and are not inside the backup.', 'Nakala ya hifadhi ni nakala kamili ya rekodi zako (vitabu, wanafunzi, matokeo, mikopo…). Faili za kidijitali zimehifadhiwa kando na hazimo ndani ya nakala.'), `<button class="in-btn primary" data-act="make"><i class="fa-solid fa-cloud-arrow-up"></i> ${IN.t('Back up now', 'Hifadhi sasa')}</button>`)}
      <div class="in-alert info" style="margin-bottom:1rem"><i class="fa-solid fa-clock-rotate-left"></i><div>${IN.t(`A backup is also made automatically each week. The latest ${d.keep} are kept. Always press "Verify" to prove a backup can be restored.`, `Nakala hufanywa kiotomatiki kila wiki. ${d.keep} za hivi karibuni huhifadhiwa. Bonyeza "Thibitisha" kuhakikisha nakala inaweza kurejeshwa.`)}</div></div>
      <div class="in-card">${IN.table([{ label: IN.t('Created', 'Imetengenezwa'), render: (b) => `${IN.dateTime(b.created_at)}<div class="in-small in-muted">${esc(b.created_by || IN.t('Automatic', 'Kiotomatiki'))}</div>` }, { label: IN.t('Size', 'Ukubwa'), render: (b) => IN.bytes(b.size_bytes) }, { label: IN.t('Records', 'Rekodi'), render: (b) => Object.values(b.row_counts).reduce((a, c) => a + c, 0) },
        { label: IN.t('Verified', 'Imethibitishwa'), render: (b) => b.verified_ok == null ? `<span class="in-muted">${IN.t('Not yet', 'Bado')}</span>` : b.verified_ok ? IN.chip('success', IN.t('Passed', 'Imepita')) + `<div class="in-small in-muted">${IN.dateTime(b.verified_at)}</div>` : IN.chip('failed', IN.t('Failed', 'Imeshindwa')) },
        { label: '', cls: 'in-right', render: (b) => `<button class="in-btn ghost sm" data-act="verify" data-id="${b.id}">${IN.t('Verify', 'Thibitisha')}</button> <a class="in-btn ghost sm" href="/api/institution/backups/${b.id}/download?institution_id=${IN.state.inst.id}"><i class="fa-solid fa-download"></i></a> ${sup ? `<button class="in-btn ghost sm" data-act="restore" data-id="${b.id}">${IN.t('Restore', 'Rejesha')}</button>` : ''} <button class="in-btn danger-ghost sm" data-act="del" data-id="${b.id}"><i class="fa-solid fa-trash"></i></button>` }], d.backups, { empty: IN.empty('fa-cloud', IN.t('No backups yet', 'Hakuna nakala bado'), IN.t('Create your first backup now.', 'Tengeneza nakala yako ya kwanza sasa.')) })}</div>`;
    IN.delegate(el, {
      make: async (b) => { b.disabled = true; try { await IN.api.post('/backups'); IN.toast(IN.t('Backup created.', 'Nakala imetengenezwa.')); IN.route(); } catch (e) { b.disabled = false; throw e; } },
      verify: async (b) => { b.disabled = true; try { const r = await IN.api.post(`/backups/${b.dataset.id}/verify`); IN.toast(r.detail, r.ok ? 'ok' : 'error'); IN.route(); } catch (e) { b.disabled = false; throw e; } },
      del: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this backup?', 'Futa nakala hii?'), message: '' }))) return; await IN.api.del(`/backups/${b.dataset.id}`); IN.route(); },
      restore: (b) => IN.formModal({ title: IN.t('Restore this backup', 'Rejesha nakala hii'), danger: true, submit: IN.t('Restore now', 'Rejesha sasa'),
        body: `<div class="in-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div><b>${IN.t('This replaces all current records', 'Hii inabadilisha rekodi zote za sasa')}</b><br>${IN.t('Books, students, loans, results and other records will go back to how they were in this backup. A safety backup of the current data is made first, so you can undo it.', 'Vitabu, wanafunzi, mikopo, matokeo na rekodi nyingine zitarudi kama zilivyokuwa kwenye nakala hii. Nakala ya usalama ya data ya sasa hufanywa kwanza, ili uweze kutengua.')}</div></div>${IN.f.input('confirm', IN.t('Type RESTORE to confirm', 'Andika RESTORE kuthibitisha'), { required: true })}`,
        onSubmit: async (v) => { const r = await IN.api.post(`/backups/${b.dataset.id}/restore`, { confirm: v.confirm }); IN.closeModal(); IN.toast(IN.t(`Restored ${r.restored} records.`, `Rekodi ${r.restored} zimerejeshwa.`)); IN.route(); } }),
    });
  };

  // ------------------------------------------------------------ Audit log
  IN.modules.audit = async (el) => {
    const st = { module: '', status: '', q: '', from: '', to: '', page: 1 };
    el.innerHTML = `${IN.pageHead(IN.t('Audit log', 'Kumbukumbu za ukaguzi'), IN.t('Who did what, and when. Entries cannot be edited or deleted.', 'Nani alifanya nini, na lini. Kumbukumbu haziwezi kuhaririwa wala kufutwa.'))}<div class="in-card"><div class="in-toolbar"><input class="in-input" id="aQ" type="search" placeholder="${IN.t('Search action or details…', 'Tafuta kitendo au maelezo…')}" style="flex:1;min-width:180px"><select class="in-select" id="aMod"><option value="">${IN.t('All modules', 'Moduli zote')}</option></select><select class="in-select" id="aSt"><option value="">${IN.t('Any result', 'Matokeo yoyote')}</option><option value="success">${IN.t('Success', 'Imefanikiwa')}</option><option value="failed">${IN.t('Failed', 'Imeshindwa')}</option></select><input class="in-input" id="aFrom" type="date" aria-label="${IN.t('From', 'Kuanzia')}"><input class="in-input" id="aTo" type="date" aria-label="${IN.t('To', 'Hadi')}"></div><div id="aOut"></div></div>`;
    const out = el.querySelector('#aOut'); let modsDone = false;
    const load = async () => {
      const r = await IN.api.get('/audit' + IN.qs({ ...st, limit: 30 }));
      if (!modsDone) { el.querySelector('#aMod').insertAdjacentHTML('beforeend', r.modules.map((m) => `<option value="${esc(m)}">${esc(IN.cap(m))}</option>`).join('')); modsDone = true; }
      out.innerHTML = r.logs.length ? IN.table([{ label: IN.t('When', 'Lini'), render: (l) => IN.dateTime(l.created_at) }, { label: IN.t('User', 'Mtumiaji'), render: (l) => esc(l.user || IN.t('System', 'Mfumo')) }, { label: IN.t('Module', 'Moduli'), render: (l) => esc(IN.cap(l.module || '')) }, { label: IN.t('Action', 'Kitendo'), render: (l) => `<b>${esc(l.action)}</b>` }, { label: IN.t('Details', 'Maelezo'), render: (l) => `<span class="in-small">${esc((l.details || '').slice(0, 120))}</span>` }, { label: IN.t('Result', 'Matokeo'), render: (l) => IN.chip(l.status) }, { label: 'IP', render: (l) => `<span class="in-small in-muted">${esc(l.ip || '')}</span>` }], r.logs) + IN.pager(r.page, r.limit, r.total) : IN.empty('fa-shield-halved', IN.t('Nothing found', 'Hakuna kilichopatikana'), IN.t('Try other filters.', 'Jaribu vichujio vingine.'));
    };
    const reload = (r = true) => { if (r) st.page = 1; load().catch((e) => { out.innerHTML = IN.errorBox(e); }); };
    el.querySelector('#aQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); reload(); }, 300));
    [['#aMod', 'module'], ['#aSt', 'status'], ['#aFrom', 'from'], ['#aTo', 'to']].forEach(([id, k]) => el.querySelector(id).addEventListener('change', (e) => { st[k] = e.target.value; reload(); }));
    IN.delegate(el, { page: (b) => { st.page = Number(b.dataset.p); reload(false); } });
    await load();
  };

  // ------------------------------------------------------------ System health
  IN.modules.health = async (el) => {
    const d = await IN.api.get('/health');
    el.innerHTML = `${IN.pageHead(IN.t('System health', 'Afya ya mfumo'), IN.t('A plain-language check of the things that keep the system running.', 'Ukaguzi kwa lugha rahisi wa vitu vinavyoendesha mfumo.'), `<button class="in-btn ghost" onclick="IN.route()"><i class="fa-solid fa-rotate"></i> ${IN.t('Refresh', 'Onyesha upya')}</button>`)}
      <div class="in-alert ${d.all_ok ? 'ok' : ''}" style="margin-bottom:1rem"><i class="fa-solid ${d.all_ok ? 'fa-circle-check' : 'fa-triangle-exclamation'}"></i><div><b>${d.all_ok ? IN.t('Everything looks healthy.', 'Kila kitu kinaonekana vizuri.') : IN.t('Something needs attention.', 'Kuna kinachohitaji kuangaliwa.')}</b></div></div>
      <div class="in-grid cols-2"><div class="in-card">${d.checks.map((c) => `<div class="in-check-row"><span class="dot ${c.ok ? 'ok' : c.warn ? 'warn' : 'bad'}"><i class="fa-solid ${c.ok ? 'fa-check' : 'fa-exclamation'}"></i></span><div><b>${esc(c.label)}</b><div class="in-small in-muted">${esc(c.detail)}</div></div></div>`).join('')}</div>
        <div class="in-stack">${IN.stat('fa-hard-drive', `${d.storage.mb} MB`, IN.t('Digital files stored', 'Faili za kidijitali'), IN.t(`${d.storage.files} file(s)`, `Faili ${d.storage.files}`))}${IN.stat('fa-right-left', IN.num(d.loans_recorded), IN.t('Loans recorded', 'Mikopo iliyorekodiwa'))}${IN.stat('fa-clock', d.last_activity ? IN.dateTime(d.last_activity) : '—', IN.t('Last activity', 'Shughuli ya mwisho'))}</div></div>`;
  };
})();
