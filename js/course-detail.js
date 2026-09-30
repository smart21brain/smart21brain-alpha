/* Smart21Brain — course-detail.js
   Loads a single course (by ?slug= or ?id=) on course.html and renders
   real data: description, objectives, curriculum, enrollment state and
   progress. No demo content — if a course has no data for a section,
   that section is hidden rather than filled with placeholders. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const key = params.get('slug') || params.get('id');

  const els = {
    crumb: document.getElementById('course-crumb'),
    badge: document.getElementById('course-badge'),
    badgeText: document.getElementById('course-badge-text'),
    title: document.getElementById('course-title'),
    tagline: document.getElementById('course-tagline'),
    metaRow: document.getElementById('course-meta-row'),
    heroImg: document.getElementById('course-hero-img'),
    description: document.getElementById('course-description'),
    objectivesWrap: document.getElementById('course-objectives-wrap'),
    objectives: document.getElementById('course-objectives'),
    requirementsWrap: document.getElementById('course-requirements-wrap'),
    requirements: document.getElementById('course-requirements'),
    curriculum: document.getElementById('course-curriculum'),
    finalExamWrap: document.getElementById('course-final-exam-wrap'),
    finalExam: document.getElementById('course-final-exam'),
    certificateWrap: document.getElementById('course-certificate-wrap'),
    certificate: document.getElementById('course-certificate'),
    progressBlock: document.getElementById('course-progress-block'),
    progressBar: document.getElementById('course-progress-bar'),
    progressPct: document.getElementById('course-progress-pct'),
    progressCount: document.getElementById('course-progress-count'),
    progressGate: document.getElementById('course-progress-gate'),
    priceBlock: document.getElementById('course-price-block'),
    priceLabel: document.getElementById('course-price-label'),
    enrollFeedback: document.getElementById('course-enroll-feedback'),
    ctaBtn: document.getElementById('course-cta-btn'),
    includes: document.getElementById('course-includes'),
    instructorDivider: document.getElementById('course-instructor-divider'),
    instructorWrap: document.getElementById('course-instructor-wrap'),
    instructorAvatar: document.getElementById('course-instructor-avatar'),
    instructorName: document.getElementById('course-instructor-name'),
    contentSection: document.getElementById('course-content-section'),
    notFound: document.getElementById('course-not-found'),
  };

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  const LEVEL_LABELS = { beginner: 'Beginner', intermediate: 'Intermediate', advanced: 'Advanced', 'all-levels': 'All levels' };

  function metaSpan(icon, text) {
    return `<span><i class="fa-solid ${icon}"></i> <span>${esc(text)}</span></span>`;
  }

  function lessonIcon(l) {
    if (l.completed) return { bg: 'var(--s21-primary-light)', color: 'var(--s21-primary)', inner: '<i class="fa-solid fa-check"></i>' };
    const icons = { video: 'fa-circle-play', pdf: 'fa-file-pdf', quiz: 'fa-circle-question', text: 'fa-book-open' };
    return { bg: '#F1F3F5', color: '#8A93A0', inner: `<i class="fa-solid ${icons[l.content_type] || 'fa-book-open'}"></i>` };
  }

  function lessonRow(l, i, total, enrolled) {
    const icon = lessonIcon(l);
    const canOpen = enrolled || l.is_preview;
    const durationLabel = l.duration_seconds
      ? `${Math.floor(l.duration_seconds / 60)}:${String(l.duration_seconds % 60).padStart(2, '0')}`
      : (l.content_type === 'quiz' ? 'Quiz' : l.content_type.charAt(0).toUpperCase() + l.content_type.slice(1));
    const action = canOpen
      ? `<a href="lesson.html?id=${l.id}" class="btn-s21 ${l.completed ? '' : 'btn-s21-outline'}" style="padding:.4rem .9rem;font-size:.78rem">${l.completed ? 'Review' : 'Start'}</a>`
      : `<span class="text-soft" style="font-size:.78rem"><i class="fa-solid fa-lock"></i> Locked</span>`;
    return `
      <div class="d-flex align-items-center gap-3 p-3 ${i < total - 1 ? 'border-bottom' : ''}">
        <span class="d-flex align-items-center justify-content-center" style="width:34px;height:34px;border-radius:50%;background:${icon.bg};color:${icon.color};font-size:.85rem;flex-shrink:0">${l.completed ? icon.inner : (i + 1)}</span>
        <div class="flex-grow-1">
          <div class="fw-bold" style="font-size:.92rem">${esc(l.title)}</div>
          <div class="text-soft" style="font-size:.78rem">${esc(durationLabel)}${l.is_preview ? ' · Free preview' : ''}</div>
        </div>
        ${action}
      </div>`;
  }

  // Module's own quiz row, styled like a lesson row but linking to the
  // dedicated module-quiz page and showing pass/fail once attempted.
  function moduleQuizRow(mod, enrolled, isLast) {
    const status = mod.quiz_status;
    const passed = !!(status && status.passed);
    const attempted = status && status.best_score_percent != null;
    const icon = passed
      ? { bg: 'var(--s21-primary-light)', color: 'var(--s21-primary)', inner: '<i class="fa-solid fa-check"></i>' }
      : { bg: '#F1F3F5', color: '#8A93A0', inner: '<i class="fa-solid fa-circle-question"></i>' };
    const sub = passed
      ? `Passed · ${status.best_score_percent}%`
      : attempted
        ? `Best attempt ${status.best_score_percent}% · needs ${status.passing_score}%`
        : `Quiz · needs ${mod.passing_score}% to pass`;
    const action = enrolled
      ? `<a href="module-quiz.html?module=${mod.id}" class="btn-s21 ${passed ? '' : 'btn-s21-outline'}" style="padding:.4rem .9rem;font-size:.78rem">${passed ? 'Review' : (attempted ? 'Retake' : 'Take quiz')}</a>`
      : `<span class="text-soft" style="font-size:.78rem"><i class="fa-solid fa-lock"></i> Locked</span>`;
    return `
      <div class="d-flex align-items-center gap-3 p-3 ${isLast ? '' : 'border-bottom'}" style="background:rgba(0,0,0,.015)">
        <span class="d-flex align-items-center justify-content-center" style="width:34px;height:34px;border-radius:50%;background:${icon.bg};color:${icon.color};font-size:.85rem;flex-shrink:0">${icon.inner}</span>
        <div class="flex-grow-1">
          <div class="fw-bold" style="font-size:.92rem">${esc(mod.title)} Quiz</div>
          <div class="text-soft" style="font-size:.78rem">${esc(sub)}</div>
        </div>
        ${action}
      </div>`;
  }

  // PHASE 8: renders Module -> Lessons (+ Quiz) blocks, followed by any
  // ungrouped lessons (older/simpler courses with no modules at all —
  // rendered exactly as before, flat).
  function renderCurriculum(modules, ungroupedLessons, enrolled) {
    const totalItems = modules.reduce((n, m) => n + m.lessons.length + (m.quiz_id ? 1 : 0), 0) + ungroupedLessons.length;
    if (!totalItems) {
      els.curriculum.innerHTML = '<div class="p-3 text-soft" style="font-size:.85rem">Lessons are being prepared for this course.</div>';
      return;
    }

    const blocks = [];

    modules.forEach((mod, mi) => {
      const rows = mod.lessons.map((l, i) => lessonRow(l, i, mod.lessons.length + (mod.quiz_id ? 1 : 0), enrolled)).join('');
      const quizRow = mod.quiz_id ? moduleQuizRow(mod, enrolled, true) : '';
      blocks.push(`
        <div class="${mi < modules.length - 1 || ungroupedLessons.length ? 'border-bottom' : ''}">
          <div class="p-3 fw-bold" style="font-size:.85rem;background:#FAFBFC">Module ${mi + 1}: ${esc(mod.title.replace(/^module\s*\d+\s*:\s*/i, ''))}</div>
          ${rows}${quizRow}
        </div>`);
    });

    if (ungroupedLessons.length) {
      blocks.push(ungroupedLessons.map((l, i) => lessonRow(l, i, ungroupedLessons.length, enrolled)).join(''));
    }

    els.curriculum.innerHTML = blocks.join('');
  }

  // PHASE 8: Final Exam card — locked until the required lesson
  // percentage is met, then a take/retake button, then a pass banner.
  function renderFinalExam(finalExam, enrolled) {
    if (!finalExam) { els.finalExamWrap.style.display = 'none'; return; }
    els.finalExamWrap.style.display = '';

    if (!enrolled) {
      els.finalExam.innerHTML = `<div class="text-soft" style="font-size:.85rem"><i class="fa-solid fa-lock"></i> Enroll and complete the course content to unlock the final exam.</div>`;
      return;
    }
    if (finalExam.passed) {
      els.finalExam.innerHTML = `
        <div class="d-flex align-items-center gap-3">
          <span class="d-flex align-items-center justify-content-center flex-shrink-0" style="width:44px;height:44px;border-radius:50%;background:var(--s21-primary-light);color:var(--s21-primary)"><i class="fa-solid fa-check fa-lg"></i></span>
          <div class="flex-grow-1">
            <div class="fw-bold">Passed — ${finalExam.best_score_percent}%</div>
            <div class="text-soft" style="font-size:.82rem">Needed ${finalExam.passing_score}% to pass.</div>
          </div>
          <a href="final-exam.html?course=${encodeURIComponent(els.crumb.dataset.courseKey || '')}" class="btn-s21 btn-s21-outline" style="padding:.5rem 1rem;font-size:.82rem">Review</a>
        </div>`;
      return;
    }
    if (!finalExam.unlocked) {
      els.finalExam.innerHTML = `<div class="text-soft" style="font-size:.85rem"><i class="fa-solid fa-lock"></i> Complete more of the course content to unlock the final exam.</div>`;
      return;
    }
    const attemptedLine = finalExam.best_score_percent != null
      ? `<div class="text-soft" style="font-size:.82rem">Best attempt so far: ${finalExam.best_score_percent}% — needs ${finalExam.passing_score}% to pass.</div>`
      : `<div class="text-soft" style="font-size:.82rem">Needs ${finalExam.passing_score}% to pass and complete the course.</div>`;
    els.finalExam.innerHTML = `
      <div class="d-flex align-items-center justify-content-between gap-3 flex-wrap">
        <div>
          <div class="fw-bold mb-1">Ready when you are</div>
          ${attemptedLine}
        </div>
        <a href="final-exam.html?course=${encodeURIComponent(els.crumb.dataset.courseKey || '')}" class="btn-s21 btn-s21-primary" style="padding:.6rem 1.1rem;font-size:.85rem">${finalExam.best_score_percent != null ? 'Retake exam' : 'Take final exam'}</a>
      </div>`;
  }

  // PHASE 8: shown once a certificate has actually been issued — never
  // fabricated client-side, always reflects a real row from the API.
  function renderCertificate(certificate, courseTitle) {
    if (!certificate) { els.certificateWrap.style.display = 'none'; return; }
    els.certificateWrap.style.display = '';
    els.certificate.innerHTML = `
      <span class="d-flex align-items-center justify-content-center flex-shrink-0" style="width:52px;height:52px;border-radius:50%;background:var(--s21-primary-light);color:var(--s21-primary)"><i class="fa-solid fa-award fa-lg"></i></span>
      <div class="flex-grow-1">
        <div class="fw-bold">You earned a certificate!</div>
        <div class="text-soft" style="font-size:.82rem">${esc(courseTitle)} — code ${esc(certificate.code)}</div>
      </div>
      <a href="certificate.html?code=${encodeURIComponent(certificate.code)}" class="btn-s21 btn-s21-primary" style="padding:.55rem 1.1rem;font-size:.85rem">View certificate</a>`;
  }

  async function main() {
    if (!key) { els.notFound.style.display = ''; return; }

    let data;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(key)}`, { credentials: 'include' });
      if (res.ok) data = await res.json();
    } catch { /* fall through to the built-in catalog */ }

    if (!data) {
      const local = window.S21Courses && window.S21Courses.findBySlug(key);
      if (!local) { els.notFound.style.display = ''; return; }
      const P = window.S21Progress;
      const lessonList = P ? P.applyTo(local.slug, local.lessons) : (local.lessons || []);
      data = {
        course: local,
        lessons: lessonList,
        enrollment: (P && P.isEnrolled(local.slug)) ? { payment_status: 'active' } : null,
        local: true,
      };
    }
    const isLocal = !!data.local;

    const { course, lessons, enrollment } = data;
    const modules = data.modules || [];
    const ungroupedLessons = data.ungrouped_lessons || (modules.length ? [] : lessons);
    const progress = data.progress || null;
    els.contentSection.style.display = '';
    els.crumb.dataset.courseKey = course.slug || course.id || key;

    document.title = `${course.title} — Smart21Brain`;
    els.crumb.textContent = course.title;
    els.badgeText.textContent = `${course.category_name || 'Course'} · ${LEVEL_LABELS[course.level] || course.level}`;
    els.title.textContent = course.title;
    els.tagline.textContent = course.description || '';
    els.description.textContent = course.description || 'No description yet.';
    if (course.thumbnail_url) els.heroImg.src = course.thumbnail_url;
    els.heroImg.alt = course.title;

    const metaBits = [];
    metaBits.push(metaSpan('fa-regular fa-clock', `${lessons.length} lesson${lessons.length === 1 ? '' : 's'}`));
    if (course.age_range) metaBits.push(metaSpan('fa-child', `Ages ${course.age_range}`));
    if (course.language) metaBits.push(metaSpan('fa-language', course.language));
    els.metaRow.innerHTML = metaBits.join('');

    if (course.objectives && course.objectives.length) {
      els.objectives.innerHTML = course.objectives.map((o) =>
        `<div class="col-md-6"><i class="fa-solid fa-circle-check" style="color:var(--s21-primary)"></i> <span>${esc(o)}</span></div>`
      ).join('');
    } else {
      els.objectivesWrap.style.display = 'none';
    }

    if (course.requirements && course.requirements.length) {
      els.requirements.innerHTML = course.requirements.map((r) => `<li>${esc(r)}</li>`).join('');
    } else {
      els.requirementsWrap.style.display = 'none';
    }

    const isEnrolled = !!enrollment;
    const isActive = isEnrolled && enrollment.payment_status !== 'pending';
    renderCurriculum(modules, ungroupedLessons, isActive);

    // Sidebar: progress (if actively enrolled) or price (if not)
    if (isActive) {
      let pct, doneCount, totalCount;
      if (progress) {
        pct = progress.progress_percent;
        doneCount = progress.completed_lessons;
        totalCount = progress.total_lessons;
      } else {
        totalCount = lessons.length;
        doneCount = lessons.filter((l) => l.completed).length;
        pct = totalCount > 0 ? Math.round((doneCount / totalCount) * 100) : 0;
      }
      els.progressBlock.style.display = '';
      els.progressBar.style.width = `${pct}%`;
      els.progressPct.textContent = `${pct}% complete`;
      els.progressCount.textContent = `${doneCount} / ${totalCount} lessons`;

      if (progress && progress.final_exam) {
        els.progressGate.style.display = '';
        els.progressGate.textContent = progress.lessons_requirement_met
          ? (progress.final_exam.passed ? 'Course completed — final exam passed.' : `Final exam unlocked — needs ${progress.final_exam.passing_score}% to pass.`)
          : `Reach ${progress.required_percent}% to unlock the final exam.`;
      } else {
        els.progressGate.style.display = 'none';
      }

      renderFinalExam(progress ? progress.final_exam : null, true);
      renderCertificate(progress ? progress.certificate : null, course.title);
    } else {
      els.priceBlock.style.display = '';
      els.priceLabel.textContent = course.is_free ? 'Free' : `TZS ${Number(course.price).toLocaleString()}`;
      renderFinalExam(null, false);
      renderCertificate(null, course.title);
    }

    // Includes list — built from what's actually true about this course.
    const includes = [];
    includes.push(`<li><i class="fa-solid fa-clapperboard text-soft me-2"></i> ${lessons.length} lesson${lessons.length === 1 ? '' : 's'}</li>`);
    if (course.certificate_enabled) includes.push('<li><i class="fa-solid fa-award text-soft me-2"></i> Certificate on completion</li>');
    includes.push('<li><i class="fa-solid fa-infinity text-soft me-2"></i> Lifetime access</li>');
    els.includes.innerHTML = includes.join('');

    if (course.instructor_name) {
      els.instructorDivider.style.display = '';
      els.instructorWrap.style.display = '';
      els.instructorName.textContent = course.instructor_name;
      if (course.instructor_avatar_key) els.instructorAvatar.src = `/api/avatar/${encodeURIComponent(course.instructor_id)}`;
      else els.instructorAvatar.style.display = 'none';
    }

    setupCta(course, lessons, enrollment, isLocal);
  }

  function setupCta(course, lessons, enrollment, isLocal) {
    const btn = els.ctaBtn;
    btn.disabled = false;

    async function whoAmI() {
      try {
        const res = await fetch('/api/auth/me', { credentials: 'include' });
        return res.ok ? (await res.json()).user : null;
      } catch { return null; }
    }

    if (enrollment && enrollment.payment_status !== 'pending') {
      // Already enrolled — CTA jumps into the first not-yet-completed lesson.
      const next = lessons.find((l) => !l.completed) || lessons[0];
      btn.innerHTML = '<i class="fa-solid fa-play"></i> <span>Continue learning</span>';
      btn.onclick = () => { if (next) window.location.href = `lesson.html?id=${next.id}`; };
      return;
    }

    if (enrollment && enrollment.payment_status === 'pending') {
      // Paid course, payment not done yet — send them straight to Pricing
      // to complete it, instead of a dead-end "contact us" message.
      btn.innerHTML = '<i class="fa-solid fa-credit-card"></i> <span>Complete payment</span>';
      btn.disabled = false;
      els.enrollFeedback.style.display = '';
      els.enrollFeedback.textContent = 'This is a paid course — complete payment on the Pricing page to unlock it.';
      btn.onclick = () => { window.location.href = 'pricing.html'; };
      return;
    }

    btn.innerHTML = course.is_free
      ? '<i class="fa-solid fa-play"></i> <span>Enroll free</span>'
      : `<i class="fa-solid fa-cart-shopping"></i> <span>Enroll — TZS ${Number(course.price).toLocaleString()}</span>`;

    // Paid course, not yet enrolled: skip straight to Pricing for payment —
    // no pending-enrollment/"contact us" detour.
    if (!course.is_free) {
      btn.onclick = () => { window.location.href = 'pricing.html'; };
      return;
    }

    btn.onclick = async () => {
      // No backend: enroll in this browser so the lessons unlock right away.
      if (isLocal) {
        if (window.S21Progress) window.S21Progress.enroll(course.slug);
        const first = lessons[0];
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.textContent = 'You\'re enrolled — opening the first lesson…';
        if (first) setTimeout(() => { window.location.href = `lesson.html?id=${encodeURIComponent(first.id)}`; }, 700);
        else setTimeout(() => window.location.reload(), 700);
        return;
      }

      const user = await whoAmI();
      if (!user) {
        // Enrolling needs an account — come straight back here afterwards.
        const back = encodeURIComponent(window.location.pathname + window.location.search);
        window.location.href = `login.html?next=${back}`;
        return;
      }
      const courseKey = course.id || course.slug;
      if (!courseKey) {
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.textContent = 'This course isn\'t available yet — please try again later.';
        return;
      }
      btn.disabled = true;
      const originalHtml = btn.innerHTML;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>Enrolling…</span>';
      try {
        const res = await fetch(`/api/courses/${encodeURIComponent(courseKey)}/enroll`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' });
        const out = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(out.error || 'Could not enroll');
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.textContent = out.message || 'Enrolled!';
        const first = lessons[0];
        setTimeout(() => { window.location.href = `lesson.html?id=${encodeURIComponent(first.id)}`; }, 600);
      } catch (err) {
        btn.disabled = false;
        btn.innerHTML = originalHtml;
        els.enrollFeedback.style.display = '';
        els.enrollFeedback.textContent = err.message || 'Something went wrong — please try again.';
      }
    };
  }

  main();
})();
