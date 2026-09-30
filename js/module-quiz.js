/* Smart21Brain — module-quiz.js (Phase 8 course engine)
   Drives module-quiz.html: ?course=<slug or id>&module=<module id>.
   Loads the course, finds the named module, fetches its quiz, lets the
   learner submit answers, and reports pass/fail against that module's
   own passing_score. Requires an active enrollment, same as a lesson. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const courseKey = params.get('course');
  const moduleId = params.get('module');

  const els = {
    loading: document.getElementById('mq-loading'),
    blocked: document.getElementById('mq-blocked'),
    blockedMsg: document.getElementById('mq-blocked-msg'),
    blockedCourseLink: document.getElementById('mq-blocked-course-link'),
    notFound: document.getElementById('mq-not-found'),
    content: document.getElementById('mq-content'),
    courseLink: document.getElementById('mq-course-link'),
    badge: document.getElementById('mq-badge'),
    title: document.getElementById('mq-title'),
    subtitle: document.getElementById('mq-subtitle'),
    form: document.getElementById('mq-form'),
    result: document.getElementById('mq-result'),
    submit: document.getElementById('mq-submit'),
    backLink: document.getElementById('mq-back-link'),
  };

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  async function main() {
    if (!courseKey || !moduleId) { hide(els.loading); show(els.notFound); return; }

    let courseData;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseKey)}`, { credentials: 'include' });
      if (res.ok) courseData = await res.json();
    } catch { /* no backend reachable — module quizzes need one, unlike the offline lesson demo */ }

    if (!courseData) { hide(els.loading); show(els.notFound); return; }

    const { course, modules, enrollment } = courseData;
    els.courseLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;
    els.courseLink.textContent = course.title;
    els.blockedCourseLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;
    els.backLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;

    const isActive = enrollment && enrollment.payment_status !== 'pending';
    if (!isActive) {
      hide(els.loading);
      els.blockedMsg.textContent = 'Enroll in this course to unlock its module quizzes.';
      show(els.blocked);
      return;
    }

    const mod = (modules || []).find((m) => String(m.id) === String(moduleId));
    if (!mod || !mod.quiz_id) { hide(els.loading); show(els.notFound); return; }

    let quiz;
    try {
      const res = await fetch(`/api/quizzes/${mod.quiz_id}`, { credentials: 'include' });
      if (res.ok) ({ quiz } = await res.json());
    } catch { /* handled below */ }
    if (!quiz) { hide(els.loading); show(els.notFound); return; }

    hide(els.loading);
    show(els.content);

    document.title = `${mod.title} Quiz — ${course.title} | Smart21Brain`;
    els.badge.textContent = 'Module Quiz';
    els.title.textContent = `${mod.title}: ${quiz.title}`;
    const status = mod.quiz_status;
    els.subtitle.textContent = status && status.best_score_percent != null
      ? `Best attempt so far: ${status.best_score_percent}% — needs ${mod.passing_score}% to pass.`
      : `Needs ${mod.passing_score}% to pass this module.`;

    renderQuiz(quiz, mod, course);
  }

  function renderQuiz(quiz, mod, course) {
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    els.form.innerHTML = questions.map((q, qi) => `
      <fieldset class="s21-card p-3 mb-3">
        <legend class="h6" style="font-size:.95rem">${qi + 1}. ${esc(q.prompt)}</legend>
        ${q.options.map((opt, oi) => `
          <div class="form-check">
            <input class="form-check-input" type="radio" name="q${qi}" id="q${qi}o${oi}" value="${oi}">
            <label class="form-check-label" for="q${qi}o${oi}">${esc(opt)}</label>
          </div>`).join('')}
      </fieldset>
    `).join('');

    els.submit.onclick = async () => {
      const answers = questions.map((q, qi) => {
        const checked = els.form.querySelector(`input[name="q${qi}"]:checked`);
        return checked ? Number(checked.value) : -1;
      });
      if (answers.includes(-1)) {
        els.result.style.display = '';
        els.result.textContent = 'Please answer every question before submitting.';
        return;
      }
      els.submit.disabled = true;
      try {
        const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || 'Could not submit quiz');

        const percent = Math.round((out.score / out.total) * 100);
        const passed = percent >= (mod.passing_score || 70);
        const courseUpdate = (out.courses || []).find((c) => c.course_id === course.id);

        els.result.style.display = '';
        let html = `<strong>Score: ${out.score} / ${out.total} (${percent}%)</strong> — ${passed ? 'passed!' : `needs ${mod.passing_score}% to pass — you can retake it.`}`;
        if (passed && courseUpdate && courseUpdate.course_completed) {
          html += `<div class="mt-2"><i class="fa-solid fa-award" style="color:var(--s21-primary)"></i> That completed the course! <a href="course.html?slug=${encodeURIComponent(course.slug)}">Go see your certificate</a>.</div>`;
        } else if (passed) {
          html += `<div class="mt-2"><a href="course.html?slug=${encodeURIComponent(course.slug)}">Back to course</a></div>`;
        }
        els.result.innerHTML = html;

        questions.forEach((q, qi) => {
          const chosen = els.form.querySelector(`input[name="q${qi}"]:checked`);
          const fs = els.form.querySelectorAll('fieldset')[qi];
          if (fs) fs.style.borderLeft = `4px solid ${chosen && Number(chosen.value) === q.correct_index ? 'var(--s21-primary)' : '#EF476F'}`;
        });
      } catch (err) {
        els.result.style.display = '';
        els.result.textContent = err.message || 'Something went wrong.';
      } finally {
        els.submit.disabled = false;
      }
    };
  }

  main();
})();
