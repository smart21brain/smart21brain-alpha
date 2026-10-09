/* Dashboard (admin / receptionist / teacher) and the parent portal home. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  // ---- tiny Chart.js wrapper -------------------------------------------------
  const charts = [];
  SC.chart = async (canvas, config) => {
    await SC.lib('chart');
    const css = getComputedStyle(document.documentElement);
    const Chart = window.Chart;
    Chart.defaults.font.family = css.getPropertyValue('--sc-font').trim() || 'sans-serif';
    Chart.defaults.color = css.getPropertyValue('--sc-muted').trim() || '#666';
    Chart.defaults.borderColor = css.getPropertyValue('--sc-border').trim() || '#eee';
    const c = new Chart(canvas, config); charts.push(c); return c;
  };
  SC.destroyCharts = () => { while (charts.length) { try { charts.pop().destroy(); } catch (e) { /* gone */ } } };
  const palette = () => {
    const p = getComputedStyle(document.documentElement).getPropertyValue('--sc-primary').trim() || '#0B6E4F';
    return { primary: p, blue: '#2F6FEB', amber: '#F5A524', red: '#E5484D', pink: '#D6479F', teal: '#12A67A', grey: '#9AA8A1' };
  };

  const QUICK = () => [
    { perm: 'students.create', icon: 'fa-user-plus', label: SC.t('Register Student', 'Sajili Mwanafunzi'), go: 'student/new' },
    { perm: 'teachers.manage', icon: 'fa-chalkboard-user', label: SC.t('Add Teacher', 'Ongeza Mwalimu'), go: 'teachers/new' },
    { perm: 'fees.record', icon: 'fa-hand-holding-dollar', label: SC.t('Record Payment', 'Rekodi Malipo'), go: 'fees/pay' },
    { perm: 'attendance.take', icon: 'fa-clipboard-user', label: SC.t('Take Attendance', 'Chukua Mahudhurio'), go: 'attendance' },
    { perm: 'results.enter', icon: 'fa-pen-to-square', label: SC.t('Enter Results', 'Ingiza Matokeo'), go: 'exams' },
    { perm: 'exams.manage', icon: 'fa-file-circle-plus', label: SC.t('Create Examination', 'Unda Mtihani'), go: 'exams/new' },
    { perm: 'announcements.manage', icon: 'fa-bullhorn', label: SC.t('Create Announcement', 'Unda Tangazo'), go: 'notifications/new' },
  ];

  SC.modules.dashboard = async (el) => {
    const d = await SC.api.get('/dashboard');
    SC.destroyCharts();
    const sw = SC.isSw();
    const u = SC.state.user; const hour = new Date().getHours();
    const greet = sw ? (hour < 12 ? 'Habari za asubuhi' : hour < 17 ? 'Habari za mchana' : 'Habari za jioni')
                      : (hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening');
    const quick = QUICK().filter((q) => SC.can(q.perm));
    const s = d.students; const f = d.fees; const a = d.attendance;
    const stats = [];
    if (s) {
      stats.push(SC.stat('fa-user-graduate', SC.num(s.total), SC.t('Total Students', 'Jumla ya Wanafunzi'), SC.t(`${s.male} male · ${s.female} female`, `Wavulana ${s.male} · Wasichana ${s.female}`)));
      stats.push(SC.stat('fa-user-check', SC.num(s.active), SC.t('Active Students', 'Wanafunzi Hai'), '', 'green'));
      stats.push(SC.stat('fa-user-plus', SC.num(s.new_students), SC.t('New Students', 'Wanafunzi Wapya'), SC.t('Joined in the last 30 days', 'Wamejiunga ndani ya siku 30 zilizopita'), 'blue'));
    }
    if (d.teachers) stats.push(SC.stat('fa-chalkboard-user', SC.num(d.teachers.total), SC.t('Total Teachers', 'Jumla ya Walimu'), SC.t(`${d.teachers.active} currently working`, `${d.teachers.active} wanafanya kazi sasa`), 'blue'));
    if (a) stats.push(SC.stat('fa-clipboard-check', a.today.percent == null ? '—' : `${a.today.percent}%`, SC.t("Today's Attendance", 'Mahudhurio ya Leo'), a.today.percent == null ? SC.t('Not taken yet today', 'Bado hayajachukuliwa leo') : SC.t(`${a.today.present} present · ${a.today.absent} absent · ${a.today.late} late`, `Yupo ${a.today.present} · Hayupo ${a.today.absent} · Amechelewa ${a.today.late}`), a.today.percent != null && a.today.percent < 75 ? 'red' : 'green'));
    if (f) {
      stats.push(SC.stat('fa-user-clock', SC.num(f.students_with_balance), SC.t('Students with Fee Balance', 'Wanafunzi wenye Deni la Ada'), SC.t(`${f.counts.overdue} overdue`, `Zimechelewa ${f.counts.overdue}`), 'amber'));
      stats.push(SC.stat('fa-sack-dollar', SC.moneyHtml(f.collected), SC.t('Total Fees Collected', 'Jumla ya Ada Zilizokusanywa'), SC.t(`Today: ${SC.money(f.today.total)}`, `Leo: ${SC.money(f.today.total)}`), 'green'));
      stats.push(SC.stat('fa-file-invoice-dollar', SC.moneyHtml(f.outstanding), SC.t('Outstanding Fees', 'Ada Zinazodaiwa'), SC.t(`of ${SC.money(f.expected)} expected`, `kati ya ${SC.money(f.expected)} zinazotarajiwa`), 'red'));
    }

    el.innerHTML = `
      <div class="sc-hero sc-spread" style="margin-bottom:1.2rem"><div><h2>${greet}, ${esc(u.name.split(' ')[0])}!</h2><p>${esc(SC.state.school.name)} · ${SC.t('Academic year', 'Mwaka wa Masomo')} ${esc(d.year || '—')} · ${new Date().toLocaleDateString(sw ? 'sw' : undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</p></div></div>
      ${quick.length ? `<div class="sc-quick" style="margin-bottom:1.2rem">${quick.map((q) => `<a href="#${q.go}"><i class="fa-solid ${q.icon}"></i>${q.label}</a>`).join('')}</div>` : ''}
      ${stats.length ? `<div class="sc-grid stats" style="margin-bottom:1.2rem">${stats.join('')}</div>` : ''}
      ${alertsHtml(d)}
      ${d.my_classes ? teacherHtml(d) : ''}
      <div class="sc-grid cols-2" id="chartGrid" style="margin-bottom:1.2rem">
        ${s ? `<div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Student statistics', 'Takwimu za Wanafunzi')}</h3></div><div class="sc-chart-box"><canvas id="chGender"></canvas></div></div>` : ''}
        ${a ? `<div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Attendance', 'Mahudhurio')}</h3><span class="sc-muted sc-small">${SC.t('Today · This week · This month', 'Leo · Wiki hii · Mwezi huu')}</span></div><div class="sc-chart-box"><canvas id="chAtt"></canvas></div></div>` : ''}
        ${f ? `<div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Payments', 'Malipo')}</h3><span class="sc-muted sc-small">${SC.t('Students by payment status', 'Wanafunzi kwa hali ya malipo')}</span></div><div class="sc-chart-box"><canvas id="chPay"></canvas></div></div>
        <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Fees collected per month', 'Ada Zilizokusanywa kwa Mwezi')}</h3></div><div class="sc-chart-box"><canvas id="chMonth"></canvas></div></div>` : ''}
        ${d.performance ? `<div class="sc-card" style="grid-column:1/-1"><div class="sc-card-head"><h3>${SC.t('Academic performance', 'Ufaulu wa Kitaaluma')}</h3><div class="sc-actions"><div class="sc-seg" id="perfTabs"><button class="on" data-k="by_class">${SC.t('By class', 'Kwa Darasa')}</button><button data-k="by_subject">${SC.t('By subject', 'Kwa Somo')}</button><button data-k="by_exam">${SC.t('By examination', 'Kwa Mtihani')}</button></div></div></div><div class="sc-chart-box" style="height:300px"><canvas id="chPerf"></canvas></div><p class="sc-muted sc-small" style="margin:.6rem 0 0" id="perfNote"></p></div>` : ''}
      </div>
      <div class="sc-grid cols-2">
        ${d.recent_activity ? `<div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Recent activity', 'Shughuli za Hivi Karibuni')}</h3>${SC.can('audit.view') ? `<div class="sc-actions"><a href="#audit" class="sc-btn ghost sm">${SC.t('View all', 'Ona zote')}</a></div>` : ''}</div><div class="sc-list">${d.recent_activity.map((r) => `<div class="sc-spread"><div><b>${esc(r.user_name || SC.t('System', 'Mfumo'))}</b> <span class="sc-muted">${esc(actionText(r.action))}</span><div class="sc-small sc-muted">${esc((r.details || '').slice(0, 90))}</div></div><span class="sc-small sc-muted sc-nowrap">${SC.dateTime(r.created_at)}</span></div>`).join('') || SC.empty('fa-clock-rotate-left', SC.t('Nothing yet', 'Bado hakuna kitu'), SC.t('Activity will appear here.', 'Shughuli zitaonekana hapa.'))}</div></div>` : ''}
        <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('Latest announcements', 'Matangazo ya Hivi Karibuni')}</h3><div class="sc-actions"><a href="#notifications" class="sc-btn ghost sm">${SC.t('Open', 'Fungua')}</a></div></div><div id="dashNotes">${SC.skeleton(3)}</div></div>
      </div>`;

    el.addEventListener('click', async (e) => {
      const b = e.target.closest('[data-act="reminders"]'); if (!b) return;
      const ok = await SC.confirm({ title: SC.t('Send fee reminders?', 'Tuma vikumbusho vya ada?'), message: SC.t('Parents of every student with overdue fees will get a fee reminder in their portal. Students reminded in the last 7 days are skipped.', 'Wazazi wa kila mwanafunzi mwenye deni lililochelewa watapata kikumbusho cha ada kwenye akaunti yao. Wanafunzi waliokumbushwa ndani ya siku 7 zilizopita wataruka.'), confirmText: SC.t('Send reminders', 'Tuma Vikumbusho'), danger: false, icon: 'fa-paper-plane' });
      if (!ok) return;
      try { const r = await SC.api.post('/fees/reminders'); SC.toast(SC.t(`${r.sent} reminder${r.sent === 1 ? '' : 's'} sent.`, `Vikumbusho ${r.sent} vimetumwa.`)); } catch (err) { SC.fail(err); }
    });

    SC.api.get('/notifications?limit=4').then(({ notifications }) => {
      const box = el.querySelector('#dashNotes'); if (!box) return;
      box.innerHTML = notifications.length ? `<div class="sc-list">${notifications.map(noticeRow).join('')}</div>` : SC.empty('fa-bell-slash', SC.t('No announcements yet', 'Hakuna matangazo bado'), SC.t('Announcements sent to you will show here.', 'Matangazo yaliyotumwa kwako yataonekana hapa.'));
    }).catch(() => {});

    SC.after(() => drawCharts(el, d));
  };

  function actionText(a) {
    const sw = SC.isSw();
    const map = sw
      ? { 'user.login': 'aliingia', 'student.create': 'alisajili mwanafunzi', 'student.update': 'alisasisha mwanafunzi', 'student.delete': 'alifuta mwanafunzi', 'payment.create': 'alirekodi malipo', 'payment.update': 'alisasisha malipo', 'result.enter': 'aliingiza matokeo', 'attendance.save': 'alihifadhi mahudhurio', 'exam.create': 'aliunda mtihani', 'school.create': 'alifungua shule', 'demo.load': 'alipakia mfano wa data' }
      : { 'user.login': 'signed in', 'student.create': 'registered a student', 'student.update': 'updated a student', 'student.delete': 'deleted a student', 'payment.create': 'recorded a payment', 'payment.update': 'updated a payment', 'result.enter': 'entered results', 'attendance.save': 'saved attendance', 'exam.create': 'created an examination', 'school.create': 'created the school', 'demo.load': 'loaded sample data' };
    return map[a] || a.replace('.', ' → ');
  }
  SC.noticeIcon = (t) => ({ fee_reminder: 'fa-coins', attendance_warning: 'fa-user-clock', exam_announcement: 'fa-file-pen', class_announcement: 'fa-school', general: 'fa-bullhorn' }[t] || 'fa-bell');
  function noticeRow(n) {
    return `<div class="sc-notice-row ${n.is_read ? '' : 'unread'}"><div class="ico"><i class="fa-solid ${SC.noticeIcon(n.type)}"></i></div><div><b>${esc(n.title)}</b><div class="sc-small sc-muted">${esc(n.message.slice(0, 120))}${n.message.length > 120 ? '…' : ''}</div><div class="sc-small sc-muted">${SC.dateTime(n.created_at)}</div></div></div>`;
  }
  SC.noticeRow = noticeRow;

  function alertsHtml(d) {
    const out = [];
    if (d.absence_alerts && d.absence_alerts.length) {
      out.push(`<div class="sc-alert"><i class="fa-solid fa-user-clock"></i><div><b>${SC.t('Attendance alert', 'Tahadhari ya Mahudhurio')}</b> — ${SC.t(`repeated absences this month (${d.absence_threshold}+ sessions)`, `kutokuhudhuria mara kwa mara mwezi huu (vipindi ${d.absence_threshold}+)`)}:<ul style="margin:.4rem 0 0;padding-left:1.1rem">${d.absence_alerts.slice(0, 5).map((x) => `<li>${esc(x.message)} <a href="#student/${x.student_id}">${SC.t('View', 'Ona')}</a></li>`).join('')}</ul></div></div>`);
    }
    if (d.fees && d.fees.counts.overdue > 0) {
      out.push(`<div class="sc-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div class="sc-spread" style="flex:1"><div><b>${SC.t(`${d.fees.counts.overdue} student${d.fees.counts.overdue === 1 ? ' has' : 's have'} overdue fees`, `Wanafunzi ${d.fees.counts.overdue} wana ada zilizochelewa`)}</b> ${SC.t('totalling', 'jumla ya')} ${SC.money(d.fees.amounts.overdue)}.</div>${SC.can('fees.manage') || SC.can('announcements.manage') ? `<button class="sc-btn danger-ghost sm" data-act="reminders"><i class="fa-solid fa-paper-plane"></i> ${SC.t('Send fee reminders', 'Tuma Vikumbusho vya Ada')}</button>` : ''}<a class="sc-btn ghost sm" href="#fees">${SC.t('See who', 'Ona ni nani')}</a></div></div>`);
    }
    return out.length ? `<div class="sc-stack" style="margin-bottom:1.2rem">${out.join('')}</div>` : '';
  }

  function teacherHtml(d) {
    return `<div class="sc-grid cols-2" style="margin-bottom:1.2rem">
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t('My classes', 'Madarasa Yangu')}</h3></div>${d.my_classes.length ? `<div class="sc-list">${d.my_classes.map((c) => `<div class="sc-spread"><div><b>${esc(SC.classLabel(c))}</b><div class="sc-small sc-muted">${SC.t(`${c.students} students`, `Wanafunzi ${c.students}`)}</div></div><a class="sc-btn soft sm" href="#attendance">${SC.t('Take attendance', 'Chukua Mahudhurio')}</a></div>`).join('')}</div>` : SC.empty('fa-school', SC.t('No classes yet', 'Hakuna madarasa bado'), SC.t('Ask your administrator to assign you to a class or subject.', 'Muombe msimamizi wako akupange darasa au somo.'))}</div>
      <div class="sc-card"><div class="sc-card-head"><h3>${SC.t("Today's lessons", 'Masomo ya Leo')}</h3></div>${d.today_timetable.length ? `<div class="sc-list">${d.today_timetable.map((t) => `<div class="sc-spread"><div><b>${esc(t.subject)}</b><div class="sc-small sc-muted">${esc(SC.classLabel(t))}${t.room ? ' · ' + esc(t.room) : ''}</div></div><span class="sc-chip info">${t.start_time}–${t.end_time}</span></div>`).join('')}</div>` : SC.empty('fa-mug-hot', SC.t('No lessons today', 'Hakuna masomo leo'), SC.t('Enjoy the free day, or check the timetable.', 'Furahia siku ya mapumziko, au angalia ratiba.'))}</div></div>`;
  }

  async function drawCharts(el, d) {
    const c = palette(); const sw = SC.isSw();
    const q = (id) => el.querySelector('#' + id);
    try {
      if (d.students && q('chGender')) {
        SC.chart(q('chGender'), { type: 'doughnut', data: { labels: [SC.t('Male', 'Wavulana'), SC.t('Female', 'Wasichana')], datasets: [{ data: [d.students.male, d.students.female], backgroundColor: [c.blue, c.pink], borderWidth: 0 }] },
          options: { maintainAspectRatio: false, cutout: '68%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (x) => SC.t(` ${x.label}: ${x.raw} students`, ` ${x.label}: wanafunzi ${x.raw}`) } } } },
          plugins: [{ id: 'center', afterDraw(ch) { const { ctx, chartArea: ca } = ch; ctx.save(); ctx.textAlign = 'center'; ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--sc-text'); ctx.font = '700 26px Poppins, sans-serif'; ctx.fillText(d.students.total, (ca.left + ca.right) / 2, (ca.top + ca.bottom) / 2 + 4); ctx.font = '12px Inter, sans-serif'; ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--sc-muted'); ctx.fillText(SC.t('students', 'wanafunzi'), (ca.left + ca.right) / 2, (ca.top + ca.bottom) / 2 + 22); ctx.restore(); } }] });
      }
      if (d.attendance && q('chAtt')) {
        const a = d.attendance; const rows = [a.today, a.week, a.month];
        SC.chart(q('chAtt'), { type: 'bar', data: { labels: [SC.t('Today', 'Leo'), SC.t('This week', 'Wiki hii'), SC.t('This month', 'Mwezi huu')], datasets: [
          { label: SC.t('Present', 'Waliohudhuria'), data: rows.map((r) => r.present), backgroundColor: c.teal, borderRadius: 6 }, { label: SC.t('Late', 'Waliochelewa'), data: rows.map((r) => r.late), backgroundColor: c.amber, borderRadius: 6 }, { label: SC.t('Absent', 'Wasiohudhuria'), data: rows.map((r) => r.absent), backgroundColor: c.red, borderRadius: 6 }] },
          options: { maintainAspectRatio: false, scales: { x: { stacked: true, grid: { display: false } }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { footer: (items) => { const r = rows[items[0].dataIndex]; return r.percent == null ? '' : SC.t(`Attendance: ${r.percent}%`, `Mahudhurio: ${r.percent}%`); } } } } } });
      }
      if (d.fees && q('chPay')) {
        const k = d.fees.counts;
        SC.chart(q('chPay'), { type: 'doughnut', data: { labels: [SC.t('Paid', 'Imelipwa'), SC.t('Partially paid', 'Imelipwa Sehemu'), SC.t('Pending', 'Inasubiri'), SC.t('Overdue', 'Imechelewa')], datasets: [{ data: [k.paid, k.partial, k.pending, k.overdue], backgroundColor: [c.teal, c.amber, c.grey, c.red], borderWidth: 0 }] },
          options: { maintainAspectRatio: false, cutout: '62%', plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: (x) => SC.t(` ${x.label}: ${x.raw} students`, ` ${x.label}: wanafunzi ${x.raw}`) } } } } });
        SC.chart(q('chMonth'), { type: 'bar', data: { labels: d.fees.monthly.map((m) => m.month), datasets: [{ label: SC.t(`Collected (${SC.state.school.currency})`, `Zilizokusanywa (${SC.state.school.currency})`), data: d.fees.monthly.map((m) => m.total), backgroundColor: c.primary, borderRadius: 8 }] },
          options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { beginAtZero: true } } } });
      }
      if (d.performance && q('chPerf')) {
        let chart = null;
        const draw = (k) => {
          const rows = d.performance[k]; const note = q('perfNote');
          if (note) note.textContent = rows.length ? SC.t('Average score (%) across all marks entered this academic year.', 'Wastani wa alama (%) kutoka alama zote zilizoingizwa mwaka huu wa masomo.') : SC.t('No marks have been entered yet. Results will appear here after teachers enter marks.', 'Hakuna alama zilizoingizwa bado. Matokeo yataonekana hapa baada ya walimu kuingiza alama.');
          if (chart) chart.destroy();
          SC.chart(q('chPerf'), { type: 'bar', data: { labels: rows.map((r) => r.label), datasets: [{ label: SC.t('Average %', 'Wastani %'), data: rows.map((r) => r.average), backgroundColor: rows.map((r) => (r.average >= 65 ? c.teal : r.average >= 45 ? c.amber : c.red)), borderRadius: 8 }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, max: 100 }, x: { grid: { display: false } } } } }).then((ch) => { chart = ch; });
        };
        draw('by_class');
        q('perfTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; q('perfTabs').querySelectorAll('button').forEach((x) => x.classList.toggle('on', x === b)); draw(b.dataset.k); });
      }
    } catch (e) { const g = el.querySelector('#chartGrid'); if (g) g.insertAdjacentHTML('afterbegin', `<div class="sc-alert info" style="grid-column:1/-1"><i class="fa-solid fa-chart-simple"></i><div>${SC.t(`Charts could not be loaded (${esc(e.message)}). The numbers above are still correct.`, `Chati hazikuweza kupakiwa (${esc(e.message)}). Namba zilizo hapo juu bado ni sahihi.`)}</div></div>`); }
  }

  // ---------------------------------------------------------------- parent portal
  SC.modules.portal = async (el) => {
    const d = await SC.api.get('/portal');
    if (!d.children.length) { el.innerHTML = `<div class="sc-card">${SC.empty('fa-child', SC.t('No children linked yet', 'Hakuna watoto walioungwanishwa bado'), SC.t('Please ask the school office to link your children to your account.', 'Tafadhali muombe ofisi ya shule kuunganisha watoto wako kwenye akaunti yako.'))}</div>`; return; }
    SC.setTitle(SC.t('My Children', 'Watoto Wangu'), SC.t(`Welcome, ${d.parent_name}`, `Karibu, ${d.parent_name}`));
    el.innerHTML = `<div class="sc-hero" style="margin-bottom:1.2rem"><h2>${SC.t('Hello', 'Habari')}, ${esc(d.parent_name.split(' ')[0])}</h2><p>${SC.t(`Follow attendance, fees and results for ${d.children.length === 1 ? 'your child' : 'your children'} in one place.`, `Fuatilia mahudhurio, ada na matokeo ya ${d.children.length === 1 ? 'mtoto wako' : 'watoto wako'} mahali pamoja.`)}</p></div>
      <div class="sc-kids">${d.children.map((c) => `
        <div class="sc-card sc-stack" style="gap:.9rem"><div class="sc-person">${SC.avatar('students', c.id, c.full_name, c.has_photo, 'md')}<div style="min-width:0"><div class="nm" style="font-weight:800;font-size:1.05rem">${esc(c.full_name)}</div><div class="sb sc-muted">${esc(c.class_name || SC.t('No class', 'Hakuna darasa'))} · ${esc(c.admission_no)}</div></div><span style="margin-left:auto">${SC.chip(c.status)}</span></div>
          <div><div class="sc-spread sc-small"><b>${SC.t('Attendance', 'Mahudhurio')}</b><span>${SC.pct(c.attendance_percent)}</span></div>${SC.progress(c.attendance_percent || 0, SC.pctTone(c.attendance_percent))}</div>
          <div class="sc-spread"><div><div class="sc-small sc-muted">${SC.t('Fee balance', 'Deni la Ada')}</div><b>${SC.money(c.fee.balance)}</b></div>${SC.chip(c.fee.status)}</div>
          ${c.latest_result ? `<div class="sc-spread"><div><div class="sc-small sc-muted">${SC.t('Latest result', 'Matokeo ya Mwisho')} — ${esc(c.latest_result.exam_name)}</div><b>${SC.t(`Average ${c.latest_result.average}% · Grade ${esc(c.latest_result.grade)}`, `Wastani ${c.latest_result.average}% · Daraja ${esc(c.latest_result.grade)}`)}</b></div><span class="sc-chip info">${esc(c.latest_result.position_label)}</span></div>` : `<div class="sc-small sc-muted">${SC.t('No results published yet.', 'Hakuna matokeo yaliyochapishwa bado.')}</div>`}
          <a class="sc-btn primary block" href="#student/${c.id}">${SC.t('Open full profile', 'Fungua Wasifu Kamili')} <i class="fa-solid fa-arrow-right"></i></a></div>`).join('')}</div>
      <div class="sc-card" style="margin-top:1.2rem"><div class="sc-card-head"><h3>${SC.t('Announcements', 'Matangazo')}</h3><div class="sc-actions"><a class="sc-btn ghost sm" href="#notifications">${SC.t('See all', 'Ona zote')}</a></div></div><div id="pNotes">${SC.skeleton(3)}</div></div>`;
    SC.api.get('/notifications?limit=4').then(({ notifications }) => {
      const b = el.querySelector('#pNotes'); if (b) b.innerHTML = notifications.length ? `<div class="sc-list">${notifications.map(noticeRow).join('')}</div>` : SC.empty('fa-bell-slash', SC.t('No announcements yet', 'Hakuna matangazo bado'), SC.t('Important messages from the school will appear here.', 'Ujumbe muhimu kutoka shule utaonekana hapa.'));
    });
  };
})();
