/* Dashboard — a different view for every role; plain CSS charts (works offline). */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;
  IN.destroyCharts = () => {};

  const ACTION = { 'user.login': 'signed in', 'user.logout': 'signed out', 'book.create': 'added a book', 'book.update': 'edited a book', 'book.delete': 'deleted a book', 'loan.issue': 'issued a book', 'loan.return': 'received a return',
    'loan.renew': 'renewed a loan', 'loan.lost': 'recorded a lost book', 'file.upload': 'uploaded a file', 'file.delete': 'deleted a file', 'student.create': 'added a student', 'student.update': 'edited a student',
    'results.save': 'saved marks', 'user.create': 'created a login', 'settings.update': 'changed settings', 'backup.create': 'made a backup', 'demo.load': 'loaded sample data' };

  IN.bars = (rows, labelKey, valueKey, fmt) => {
    const max = Math.max(1, ...rows.map((r) => r[valueKey]));
    return `<div class="in-bars" role="img" aria-label="${IN.t('Bar chart', 'Chati ya nguzo')}">${rows.map((r) => `<div class="bar" title="${esc(fmt ? fmt(r) : r[labelKey] + ': ' + r[valueKey])}"><small>${r[valueKey] || ''}</small><span class="fill" style="height:${Math.max(2, (r[valueKey] / max) * 90)}px"></span><small>${esc(String(r[labelKey]).slice(-2))}</small></div>`).join('')}</div>`;
  };
  IN.hbars = (rows, labelKey, valueKey) => {
    const max = Math.max(1, ...rows.map((r) => r[valueKey]));
    return rows.map((r) => `<div class="in-hbar"><span class="in-small" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(r[labelKey])}</span>${IN.progress((r[valueKey] / max) * 100)}<b class="in-small">${r[valueKey]}</b></div>`).join('');
  };

  IN.modules.dashboard = async (el) => {
    const d = await IN.api.get('/dashboard');
    const u = IN.state.user; const hour = new Date().getHours();
    const greet = IN.isSw() ? (hour < 12 ? 'Habari za asubuhi' : hour < 17 ? 'Habari za mchana' : 'Habari za jioni') : (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
    const hero = `<div class="in-hero in-spread" style="margin-bottom:1.2rem"><div><h2>${greet}, ${esc(u.name.split(' ')[0])}!</h2><p>${esc(IN.state.inst.name)} · ${new Date().toLocaleDateString(IN.isSw() ? 'sw' : undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div>
      <a href="#catalogue" class="in-btn" style="position:relative;z-index:1;background:#fff;color:var(--in-primary)"><i class="fa-solid fa-magnifying-glass"></i> ${IN.t('Search the library', 'Tafuta maktabani')}</a></div>`;
    const ann = (list) => `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Announcements', 'Matangazo')}</h3><div class="in-actions"><a href="#announcements" class="in-btn ghost sm">${IN.t('View all', 'Ona yote')}</a></div></div>
      <div class="in-list">${list.length ? list.map((a) => `<div><b>${esc(a.title)}</b><div class="in-small in-muted">${esc(a.body.slice(0, 140))}${a.body.length > 140 ? '…' : ''} · ${IN.date(a.created_at)}</div></div>`).join('') : IN.empty('fa-bullhorn', IN.t('No announcements', 'Hakuna matangazo'), IN.t('Notices from your institution will appear here.', 'Matangazo ya taasisi yako yataonekana hapa.'))}</div></div>`;

    if (d.personal) {         // students: a calm, simple home
      const linked = IN.state.student_id || IN.state.staff_id;
      el.innerHTML = `${hero}<div class="in-grid cols-3" style="margin-bottom:1.2rem">
        <a href="#catalogue" class="in-card in-stat" style="color:inherit"><div class="ico blue"><i class="fa-solid fa-magnifying-glass"></i></div><div><div class="val" style="font-size:1.05rem">${IN.t('Search books', 'Tafuta vitabu')}</div><div class="lbl">${IN.t('Check what is on the shelf', 'Angalia kilichopo rafuni')}</div></div></a>
        ${IN.can('resources.view') ? `<a href="#elibrary" class="in-card in-stat" style="color:inherit"><div class="ico green"><i class="fa-solid fa-laptop-file"></i></div><div><div class="val" style="font-size:1.05rem">${IN.t('E-Library', 'Maktaba Mtandao')}</div><div class="lbl">${IN.t('Read digital resources', 'Soma rasilimali za kidijitali')}</div></div></a>` : ''}
        ${linked ? `<a href="#my-library" class="in-card in-stat" style="color:inherit"><div class="ico amber"><i class="fa-solid fa-book-bookmark"></i></div><div><div class="val" style="font-size:1.05rem">${IN.t('My borrowed books', 'Vitabu nilivyokopa')}</div><div class="lbl">${IN.t('Due dates and history', 'Tarehe za kurudisha na historia')}</div></div></a>` : ''}
        ${IN.state.student_id ? `<a href="#my-results" class="in-card in-stat" style="color:inherit"><div class="ico"><i class="fa-solid fa-square-poll-vertical"></i></div><div><div class="val" style="font-size:1.05rem">${IN.t('My results', 'Matokeo yangu')}</div><div class="lbl">${IN.t('Marks, grades and GPA', 'Alama, madaraja na GPA')}</div></div></a>` : ''}</div>
        ${!linked ? `<div class="in-alert"><i class="fa-solid fa-circle-info"></i><div>${IN.t('Your login is not linked to a student record yet, so borrowing history and results are not shown. Please ask the library desk or administration.', 'Akaunti yako bado haijaunganishwa na rekodi ya mwanafunzi, kwa hiyo historia ya kukopa na matokeo havionyeshwi. Tafadhali muulize msimamizi.')}</div></div>` : ''}
        ${ann(d.announcements || [])}`;
      return;
    }

    const cards = d.cards.map((c) => `<a href="${c.link}" style="color:inherit">${IN.stat(({ students: 'fa-user-graduate', staff: 'fa-chalkboard-user', books: 'fa-book', resources: 'fa-laptop-file', active_loans: 'fa-right-left', overdue: 'fa-clock', due_today: 'fa-calendar-day', reserved: 'fa-bookmark', lost: 'fa-triangle-exclamation', fines: 'fa-coins' })[c.key] || 'fa-circle', c.unit ? IN.moneyHtml(c.value) : IN.num(c.value), IN.t(...(LABELS[c.key] || [c.label, c.label])), c.sub || '', c.tone === 'bad' ? 'red' : c.tone === 'good' ? 'green' : ({ overdue: 'amber', lost: 'red', fines: 'amber', due_today: 'blue' })[c.key] || '')}</a>`).join('');
    const L = d.lists || {};
    el.innerHTML = `${hero}
      ${d.cards.length ? `<div class="in-grid stats" style="margin-bottom:1.2rem">${cards}</div>` : ''}
      ${(d.cards.find((c) => c.key === 'overdue') || {}).value > 0 ? `<div class="in-alert bad" style="margin-bottom:1.2rem"><i class="fa-solid fa-clock"></i><div class="in-spread" style="flex:1"><b>${IN.t(`${d.cards.find((c) => c.key === 'overdue').value} book(s) are overdue`, `Vitabu ${d.cards.find((c) => c.key === 'overdue').value} vimechelewa kurudishwa`)}</b><a class="in-btn danger-ghost sm" href="#loans?filter=overdue">${IN.t('Review', 'Kagua')}</a></div></div>` : ''}
      <div class="in-grid cols-2" style="margin-bottom:1.2rem">
        ${L.loans_trend ? `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Books issued — last 14 days', 'Vitabu vilivyokopeshwa — siku 14')}</h3></div>${IN.bars(L.loans_trend.map((r) => ({ ...r, label: r.date.slice(8) })), 'label', 'count', (r) => `${IN.date(r.date)}: ${r.count}`)}</div>` : ''}
        ${L.most_borrowed ? `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Most borrowed', 'Vinavyokopwa zaidi')}</h3></div>${L.most_borrowed.length ? IN.hbars(L.most_borrowed, 'title', 'times') : IN.empty('fa-book', IN.t('No loans yet', 'Hakuna mikopo bado'), IN.t('Popular books will show here.', 'Vitabu maarufu vitaonekana hapa.'))}</div>` : ''}
        ${L.due_soon ? `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Due or overdue', 'Vinavyotakiwa au vilivyochelewa')}</h3><div class="in-actions"><a href="#loans" class="in-btn ghost sm">${IN.t('View all', 'Ona yote')}</a></div></div><div class="in-list">${L.due_soon.length ? L.due_soon.map((l) => `<div class="in-spread"><div><b>${esc(l.title)}</b><div class="in-small in-muted">${esc(l.borrower_name || '')}</div></div>${IN.chip(l.due_date < d.today ? 'overdue' : l.due_date === d.today ? 'due_today' : 'borrowed', IN.date(l.due_date))}</div>`).join('') : IN.empty('fa-circle-check', IN.t('Nothing due', 'Hakuna vinavyotakiwa'), IN.t('No books are due in the next two days.', 'Hakuna vitabu vinavyotakiwa siku mbili zijazo.'))}</div></div>` : ''}
        ${L.programme_counts && L.programme_counts.length ? `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Active students by programme', 'Wanafunzi kwa programu')}</h3>${d.academic && d.academic.average != null ? `<span class="in-muted in-small">${IN.t('Average mark', 'Wastani wa alama')}: <b>${d.academic.average}</b></span>` : ''}</div>${IN.hbars(L.programme_counts, 'name', 'n')}</div>` : ''}
        ${L.recent_students ? `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Recent registrations', 'Waliosajiliwa hivi karibuni')}</h3></div><div class="in-list">${L.recent_students.length ? L.recent_students.map((s) => `<a href="#student/${s.id}" class="in-spread" style="color:inherit"><b>${esc(s.full_name)}</b><span class="in-small in-muted">${esc(s.student_no)} · ${IN.date(s.created_at)}</span></a>`).join('') : IN.empty('fa-user-graduate', IN.t('No students yet', 'Hakuna wanafunzi bado'), IN.t('Add students or import them from a file.', 'Ongeza wanafunzi au uwalete kutoka kwenye faili.'))}</div></div>` : ''}
        ${L.activity ? `<div class="in-card"><div class="in-card-head"><h3>${IN.t('Recent activity', 'Shughuli za hivi karibuni')}</h3><div class="in-actions"><a href="#audit" class="in-btn ghost sm">${IN.t('View all', 'Ona yote')}</a></div></div><div class="in-list">${L.activity.map((r) => `<div class="in-spread"><div><b>${esc(r.user || IN.t('System', 'Mfumo'))}</b> <span class="in-muted">${esc(ACTION[r.action] || r.action.replace('.', ' → '))}</span>${r.status === 'failed' ? ` ${IN.chip('failed')}` : ''}<div class="in-small in-muted">${esc((r.details || '').slice(0, 80))}</div></div><span class="in-small in-muted in-nowrap">${IN.dateTime(r.created_at)}</span></div>`).join('')}</div></div>` : ''}
        ${ann(d.announcements || [])}
      </div>
      ${d.cards.length === 0 ? '' : ''}`;
    if (IN.can('settings.manage') && d.cards.length && !(d.cards.find((c) => c.key === 'books') || {}).value && !(d.cards.find((c) => c.key === 'students') || {}).value) {
      el.insertAdjacentHTML('beforeend', `<div class="in-card" style="margin-top:1.2rem">${IN.empty('fa-rocket', IN.t('Your institution is ready to set up', 'Taasisi yako iko tayari kusanidiwa'), IN.t('Add your first books and students, import them from a spreadsheet, or load sample data to explore every screen first.', 'Ongeza vitabu na wanafunzi wa kwanza, vilete kutoka kwenye lahajedwali, au pakia data ya mfano ili kuchunguza kila skrini kwanza.'),
        `<div class="in-row" style="justify-content:center;flex-wrap:wrap"><a class="in-btn primary" href="#import">${IN.t('Import records', 'Leta rekodi')}</a><a class="in-btn ghost" href="#books">${IN.t('Add a book', 'Ongeza kitabu')}</a><button class="in-btn ghost" id="inDemo">${IN.t('Load sample data', 'Pakia data ya mfano')}</button></div>`)}</div>`);
      const b = el.querySelector('#inDemo');
      if (b) b.addEventListener('click', async () => { b.disabled = true; try { await IN.api.post('/demo-data'); IN.toast(IN.t('Sample data added.', 'Data ya mfano imeongezwa.')); IN.route(); } catch (e) { IN.fail(e); b.disabled = false; } });
    }
  };
  const LABELS = { students: ['Students', 'Wanafunzi'], staff: ['Staff', 'Wafanyakazi'], books: ['Book titles', 'Vitabu'], resources: ['Digital resources', 'Rasilimali za kidijitali'], active_loans: ['Books on loan', 'Vitabu vilivyokopwa'], overdue: ['Overdue', 'Vilivyochelewa'], due_today: ['Due today', 'Vinavyotakiwa leo'], reserved: ['Reservations', 'Uhifadhi'], lost: ['Lost / damaged copies', 'Nakala zilizopotea / kuharibika'], fines: ['Unpaid fines', 'Faini zisizolipwa'] };
})();
