/* Smart21Brain — final-exam.js (Phase 8 course engine)
   Drives final-exam.html: ?course=<slug or id>. The last gate in the
   completion algorithm — Lessons completed -> Required percentage ->
   Final assessment -> Passing score -> Course completed -> Certificate.
   Refuses to render the exam at all until progress.final_exam.unlocked
   is true, mirroring what the API itself enforces server-side. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const courseKey = params.get('course');

  const els = {
    loading: document.getElementById('fe-loading'),
    blocked: document.getElementById('fe-blocked'),
    blockedTitle: document.getElementById('fe-blocked-title'),
    blockedMsg: document.getElementById('fe-blocked-msg'),
    blockedCourseLink: document.getElementById('fe-blocked-course-link'),
    notFound: document.getElementById('fe-not-found'),
    content: document.getElementById('fe-content'),
    courseLink: document.getElementById('fe-course-link'),
    title: document.getElementById('fe-title'),
    subtitle: document.getElementById('fe-subtitle'),
    form: document.getElementById('fe-form'),
    result: document.getElementById('fe-result'),
    submit: document.getElementById('fe-submit'),
    backLink: document.getElementById('fe-back-link'),
  };

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  async function main() {
    if (!courseKey) { hide(els.loading); show(els.notFound); return; }

    let courseData;
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(courseKey)}`, { credentials: 'include' });
      if (res.ok) courseData = await res.json();
    } catch { /* final exams need a backend, unlike the offline lesson demo */ }

    if (!courseData) { hide(els.loading); show(els.notFound); return; }

    const { course, enrollment, progress } = courseData;
    els.courseLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;
    els.courseLink.textContent = course.title;
    els.blockedCourseLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;
    els.backLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;

    if (!course.final_exam_quiz_id) { hide(els.loading); show(els.notFound); return; }

    const isActive = enrollment && enrollment.payment_status !== 'pending';
    if (!isActive) {
      hide(els.loading);
      els.blockedTitle.textContent = 'You need to enroll first';
      els.blockedMsg.textContent = 'Enroll in this course to work toward the final exam.';
      show(els.blocked);
      return;
    }

    const finalExam = progress && progress.final_exam;
    if (!finalExam || !finalExam.unlocked) {
      hide(els.loading);
      els.blockedTitle.textContent = 'Not unlocked yet';
      els.blockedMsg.textContent = progress
        ? `Reach ${progress.required_percent}% course completion to unlock the final exam (you're at ${progress.progress_percent}%).`
        : 'Complete more of the course content to unlock the final exam.';
      show(els.blocked);
      return;
    }

    let quiz;
    try {
      const res = await fetch(`/api/quizzes/${course.final_exam_quiz_id}`, { credentials: 'include' });
      if (res.ok) ({ quiz } = await res.json());
    } catch { /* handled below */ }
    if (!quiz) { hide(els.loading); show(els.notFound); return; }

    hide(els.loading);
    show(els.content);

    document.title = `${quiz.title} — ${course.title} | Smart21Brain`;
    els.title.textContent = quiz.title;
    els.subtitle.textContent = finalExam.best_score_percent != null
      ? `Best attempt so far: ${finalExam.best_score_percent}% — needs ${finalExam.passing_score}% to pass and complete the course.`
      : `Needs ${finalExam.passing_score}% to pass and complete the course.`;

    renderQuiz(quiz, finalExam, course);
  }

  function renderQuiz(quiz, finalExam, course) {
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
        const passed = percent >= finalExam.passing_score;
        const courseUpdate = (out.courses || []).find((c) => c.course_id === course.id);

        els.result.style.display = '';
        let html = `<strong>Score: ${out.score} / ${out.total} (${percent}%)</strong> — ${passed ? 'passed!' : `needs ${finalExam.passing_score}% to pass — you can retake it.`}`;
        if (passed && courseUpdate && courseUpdate.course_completed) {
          html += `<div class="mt-2"><i class="fa-solid fa-award" style="color:var(--s21-primary)"></i> Course completed! <a href="course.html?slug=${encodeURIComponent(course.slug)}">Go see your certificate</a>.</div>`;
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
