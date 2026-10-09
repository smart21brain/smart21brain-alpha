(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.academy = async function (root) {
    const { courses, progress } = await STN.api.get('/courses');
    root.innerHTML = `<div class="stn-grid stn-grid-3" id="stnCourseGrid"></div><div class="mt-3" id="stnCoursePane"></div>`;
    const grid = document.getElementById('stnCourseGrid');
    grid.innerHTML = courses.map((c) => {
      const p = progress[c.id] || { completed_modules: [] };
      const pct = Math.round((p.completed_modules.length / c.modules.length) * 100);
      return `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-open="${c.id}">
        <div class="d-flex justify-content-between"><span class="stn-badge info">${STN.esc(c.category)}</span>${p.certificate_issued ? `<span class="stn-badge ok"><i class="fa-solid fa-award"></i> ${t('stn_acad_certified')}</span>` : ''}</div>
        <div style="font-weight:800" class="mt-2">${STN.esc(c.title)}</div>
        <div class="text-soft" style="font-size:.78rem">${c.modules.length} ${t('stn_acad_modules')} · ${pct}% ${t('stn_acad_complete')}</div>
        <div style="height:6px;border-radius:99px;background:var(--stn-bg-soft);margin-top:.5rem;overflow:hidden"><div style="height:100%;width:${pct}%;background:var(--stn-grad)"></div></div>
      </div>`;
    }).join('');
    grid.querySelectorAll('[data-open]').forEach((card) => card.addEventListener('click', () => openCourse(Number(card.dataset.open))));
  };

  async function openCourse(id) {
    const { course, progress } = await STN.api.get(`/courses/${id}`);
    const box = document.getElementById('stnCoursePane');
    box.innerHTML = `
      <div class="stn-card">
        <div class="stn-card-head"><h3>${STN.esc(course.title)}</h3>${progress.certificate_issued ? `<button class="stn-btn stn-btn-outline stn-btn-sm" id="stnDownloadCert"><i class="fa-solid fa-award"></i> ${t('stn_acad_download_certificate')}</button>` : ''}</div>
        <p class="text-soft">${STN.esc(course.description || '')}</p>
        <div id="stnModuleList"></div>
      </div>`;

    const list = document.getElementById('stnModuleList');
    list.innerHTML = course.modules.map((m, i) => {
      const done = progress.completed_modules.includes(i);
      return `
      <div class="stn-card stn-card-tight mb-2" style="background:var(--stn-bg-soft)">
        <div class="d-flex justify-content-between align-items-center">
          <div style="font-weight:700">${i + 1}. ${STN.esc(m.title)} ${done ? '<i class="fa-solid fa-circle-check text-emerald ms-1"></i>' : ''}</div>
          <button class="stn-btn stn-btn-ghost stn-btn-sm" data-toggle="${i}"><i class="fa-solid fa-chevron-down"></i></button>
        </div>
        <div class="mt-2" id="stnModuleBody-${i}" style="display:none">
          <p class="text-soft" style="font-size:.85rem">${STN.esc(m.notes || '')}</p>
          ${m.video_url ? `<div class="ratio ratio-16x9 mb-2"><iframe src="${STN.esc(m.video_url)}" allowfullscreen></iframe></div>` : ''}
          ${(m.quiz && m.quiz.length) ? renderQuiz(course.id, i, m.quiz) : ''}
          <button class="stn-btn stn-btn-primary stn-btn-sm mt-2" data-complete="${i}" ${done ? 'disabled' : ''}>${done ? t('stn_status_completed') : t('stn_acad_mark_complete')}</button>
        </div>
      </div>`;
    }).join('');

    list.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', () => {
      const body = document.getElementById(`stnModuleBody-${btn.dataset.toggle}`);
      body.style.display = body.style.display === 'none' ? '' : 'none';
    }));
    list.querySelectorAll('[data-complete]').forEach((btn) => btn.addEventListener('click', async () => {
      const idx = Number(btn.dataset.complete);
      const quizScore = readQuizScore(idx, course.modules[idx].quiz);
      const result = await STN.api.post(`/courses/${course.id}/progress`, { module_index: idx, completed: true, quiz_score: quizScore });
      STN.toast(result.certificate_issued ? t('stn_acad_course_complete_cert') : t('stn_acad_module_complete'));
      openCourse(course.id);
    }));

    document.getElementById('stnDownloadCert')?.addEventListener('click', () => downloadCertificate(course));
  }

  function renderQuiz(courseId, moduleIdx, quiz) {
    return `<div class="mt-2" id="stnQuiz-${moduleIdx}">${quiz.map((q, qi) => `
      <div class="mb-2">
        <div style="font-size:.85rem;font-weight:700">${STN.esc(q.q)}</div>
        ${q.options.map((opt, oi) => `<label class="d-flex align-items-center gap-2 text-soft" style="font-size:.82rem"><input type="radio" name="q${moduleIdx}-${qi}" value="${oi}"> ${STN.esc(opt)}</label>`).join('')}
      </div>`).join('')}</div>`;
  }

  function readQuizScore(moduleIdx, quiz) {
    if (!quiz || !quiz.length) return undefined;
    let correct = 0;
    quiz.forEach((q, qi) => {
      const picked = document.querySelector(`input[name="q${moduleIdx}-${qi}"]:checked`);
      if (picked && Number(picked.value) === q.correct) correct++;
    });
    return Math.round((correct / quiz.length) * 100);
  }

  function downloadCertificate(course) {
    const canvas = document.createElement('canvas');
    canvas.width = 1600; canvas.height = 1131;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 1600, 1131);
    grad.addColorStop(0, '#0f172a'); grad.addColorStop(1, '#111c34');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 1600, 1131);
    ctx.strokeStyle = '#10b981'; ctx.lineWidth = 6; ctx.strokeRect(40, 40, 1520, 1051);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#93a1bd'; ctx.font = '28px sans-serif'; ctx.fillText('smart21brain Stationery OS · Academy', 800, 200);
    ctx.fillStyle = '#ffffff'; ctx.font = 'bold 64px sans-serif'; ctx.fillText(t('stn_acad_certificate_title'), 800, 320);
    ctx.fillStyle = '#10b981'; ctx.font = 'bold 46px sans-serif'; ctx.fillText(STN.state.user.name || t('stn_acad_team_member'), 800, 480);
    ctx.fillStyle = '#93a1bd'; ctx.font = '30px sans-serif'; ctx.fillText(t('stn_acad_has_completed'), 800, 540);
    ctx.fillStyle = '#06b6d4'; ctx.font = 'bold 38px sans-serif'; ctx.fillText(course.title, 800, 610);
    ctx.fillStyle = '#93a1bd'; ctx.font = '24px sans-serif'; ctx.fillText(new Date().toLocaleDateString(), 800, 900);
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png'); a.download = `certificate-${course.title.replace(/\s+/g, '-').toLowerCase()}.png`;
    a.click();
  }
})();
