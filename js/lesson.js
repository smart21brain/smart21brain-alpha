/* Smart21Brain — lesson.js
   Drives lesson.html: loads a single lesson (?id=) via /api/lessons/:id,
   renders it by content_type (text/video/pdf/quiz), lets the learner mark
   it complete, and wires Previous/Next navigation across the course's
   curriculum. Enforces nothing client-side that the API doesn't already
   enforce — a locked lesson simply won't load. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const lessonId = params.get('id');

  const els = {
    loading: document.getElementById('lesson-loading'),
    blocked: document.getElementById('lesson-blocked'),
    blockedMsg: document.getElementById('lesson-blocked-msg'),
    blockedCourseLink: document.getElementById('lesson-blocked-course-link'),
    notFound: document.getElementById('lesson-not-found'),
    content: document.getElementById('lesson-content'),
    courseCrumbLink: document.getElementById('lesson-course-crumb-link'),
    crumb: document.getElementById('lesson-crumb'),
    position: document.getElementById('lesson-position'),
    title: document.getElementById('lesson-title'),
    videoBlock: document.getElementById('lesson-video-block'),
    videoThumb: document.getElementById('lesson-video-thumb'),
    videoLink: document.getElementById('lesson-video-link'),
    videoCta: document.getElementById('lesson-video-cta'),
    pdfBlock: document.getElementById('lesson-pdf-block'),
    pdfTitle: document.getElementById('lesson-pdf-title'),
    pdfLink: document.getElementById('lesson-pdf-link'),
    bodyText: document.getElementById('lesson-body-text'),
    quizBlock: document.getElementById('lesson-quiz-block'),
    quizTitle: document.getElementById('lesson-quiz-title'),
    quizForm: document.getElementById('lesson-quiz-form'),
    quizResult: document.getElementById('lesson-quiz-result'),
    quizSubmit: document.getElementById('lesson-quiz-submit'),
    prevLink: document.getElementById('lesson-prev-link'),
    nextLink: document.getElementById('lesson-next-link'),
    completeBtn: document.getElementById('lesson-complete-btn'),
    completeStatus: document.getElementById('lesson-complete-status'),
    curriculumTitle: document.getElementById('lesson-curriculum-title'),
    curriculumList: document.getElementById('lesson-curriculum-list'),
  };

  function esc(s) { const d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }

  /* Builds the same shape the API would return, from the built-in catalog. */
  function localLesson(id) {
    if (!window.S21Courses) return null;
    const slug = String(id).split('::')[0];
    const course = window.S21Courses.findBySlug(slug);
    if (!course) return null;
    const P = window.S21Progress;
    const lessons = P ? P.applyTo(slug, course.lessons) : course.lessons;
    const idx = lessons.findIndex((l) => String(l.id) === String(id));
    if (idx === -1) return null;
    const lesson = lessons[idx];
    return {
      lesson,
      video: null,
      material: null,
      quiz: lesson.quiz ? Object.assign({ id: lesson.id }, lesson.quiz) : null,
      completed: !!lesson.completed,
      course,
      previous: idx > 0 ? lessons[idx - 1] : null,
      next: idx < lessons.length - 1 ? lessons[idx + 1] : null,
      lesson_index: idx + 1,
      lesson_total: lessons.length,
      local: true,
      lessons,
    };
  }

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  async function main() {
    if (!lessonId) { hide(els.loading); show(els.notFound); return; }

    let data;
    try {
      const res = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}`, { credentials: 'include' });
      if (res.status === 401 || res.status === 403) {
        const out = await res.json().catch(() => ({}));
        hide(els.loading);
        els.blockedMsg.textContent = out.error || 'Enroll in this course to unlock this lesson.';
        show(els.blocked);
        return;
      }
      if (res.ok) data = await res.json();
    } catch { /* fall through to the built-in catalog */ }

    if (!data) data = localLesson(lessonId);
    if (!data) { hide(els.loading); show(els.notFound); return; }

    hide(els.loading);
    show(els.content);
    render(data);
  }

  function render(data) {
    const { lesson, video, material, quiz, completed, course, previous, next, lesson_index, lesson_total } = data;
    const isLocal = !!data.local;

    document.title = `${lesson.title} — ${course.title} | Smart21Brain`;
    els.courseCrumbLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;
    els.courseCrumbLink.textContent = course.title;
    els.crumb.textContent = lesson.title;
    els.position.textContent = `Lesson ${lesson_index} of ${lesson_total}`;
    els.title.textContent = lesson.title;
    els.blockedCourseLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`;

    if (lesson.content_type === 'video' && video) {
      show(els.videoBlock);
      const thumb = video.thumbnail_url || 'https://images.unsplash.com/photo-1509869175650-a1d97972541a?w=1200&q=75&auto=format&fit=crop';
      els.videoThumb.src = thumb;
      els.videoThumb.alt = video.title || lesson.title;
      const href = `video.html?id=${video.id}`;
      els.videoLink.href = href;
      els.videoCta.href = href;
    } else if (lesson.content_type === 'pdf' && material) {
      show(els.pdfBlock);
      els.pdfTitle.textContent = material.title || 'Resource';
      els.pdfLink.href = `/api/materials/${material.id}`;
    } else if (lesson.content_type === 'quiz' && quiz) {
      show(els.quizBlock);
      renderQuiz(quiz, lesson, isLocal);
    }

    if (lesson.body) {
      els.bodyText.textContent = lesson.body;
    } else if (lesson.content_type === 'text') {
      els.bodyText.textContent = 'No content has been added to this lesson yet.';
    }

    if (previous) { els.prevLink.href = `lesson.html?id=${previous.id}`; els.prevLink.style.visibility = 'visible'; }
    if (next) { els.nextLink.href = `lesson.html?id=${next.id}`; els.nextLink.style.visibility = 'visible'; }
    else { els.nextLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`; els.nextLink.textContent = 'Back to course'; els.nextLink.style.visibility = 'visible'; }

    setCompleteState(completed);
    els.completeBtn.addEventListener('click', () => toggleComplete(!completed));

    // Mini curriculum sidebar, current lesson highlighted.
    if (isLocal) renderCurriculum(course, data.lessons, lesson.id);
    else loadCurriculum(course, lesson.id);

    let currentCompleted = completed;
    function toggleComplete(next) {
      currentCompleted = next;
      postComplete(next);
    }

    async function postComplete(nextState) {
      els.completeBtn.disabled = true;
      if (isLocal) {
        // Progress is stored in this browser — no server call, no server error.
        if (window.S21Progress) {
          window.S21Progress.setComplete(course.slug, lesson.id, nextState);
          setCompleteState(nextState, window.S21Progress.progress(course.slug, lesson_total));
          if (data.lessons) {
            const row = data.lessons.find((l) => String(l.id) === String(lesson.id));
            if (row) row.completed = nextState;
            renderCurriculum(course, data.lessons, lesson.id);
          }
        } else {
          setCompleteState(nextState);
        }
        els.completeBtn.disabled = false;
        return;
      }
      try {
        const res = await fetch(`/api/lessons/${lesson.id}/complete`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: nextState }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || 'Could not update progress');
        setCompleteState(nextState, out);
      } catch (err) {
        els.completeStatus.textContent = err.message || 'Something went wrong.';
      } finally {
        els.completeBtn.disabled = false;
      }
    }

    function setCompleteState(isComplete, progress) {
      els.completeBtn.innerHTML = isComplete
        ? '<i class="fa-solid fa-rotate-left"></i> <span>Mark as not complete</span>'
        : '<i class="fa-solid fa-circle-check"></i> <span>Mark as complete</span>';
      els.completeBtn.className = isComplete ? 'btn-s21 btn-s21-outline w-100 justify-content-center mb-1' : 'btn-s21 btn-s21-primary w-100 justify-content-center mb-1';
      if (progress) {
        els.completeStatus.textContent = `${progress.completed_lessons} / ${progress.total_lessons} lessons complete (${progress.progress_percent}%)${progress.course_completed ? ' — course complete! 🎉' : ''}`;
      }
    }
  }

  function renderQuiz(quiz, lesson, isLocal) {
    els.quizTitle.textContent = quiz.title;
    const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
    els.quizForm.innerHTML = questions.map((q, qi) => `
      <fieldset class="s21-card p-3 mb-3">
        <legend class="h6" style="font-size:.95rem">${qi + 1}. ${esc(q.prompt)}</legend>
        ${q.options.map((opt, oi) => `
          <div class="form-check">
            <input class="form-check-input" type="radio" name="q${qi}" id="q${qi}o${oi}" value="${oi}">
            <label class="form-check-label" for="q${qi}o${oi}">${esc(opt)}</label>
          </div>`).join('')}
      </fieldset>
    `).join('');

    els.quizSubmit.onclick = async () => {
      const answers = questions.map((q, qi) => {
        const checked = els.quizForm.querySelector(`input[name="q${qi}"]:checked`);
        return checked ? Number(checked.value) : -1;
      });
      if (answers.includes(-1)) {
        els.quizResult.style.display = '';
        els.quizResult.textContent = 'Please answer every question before submitting.';
        return;
      }
      els.quizSubmit.disabled = true;
      if (isLocal) {
        // Mark it locally — the correct answers ship with the catalog.
        const total = questions.length;
        const score = questions.reduce((n, q, qi) => n + (answers[qi] === q.answer ? 1 : 0), 0);
        els.quizResult.style.display = '';
        els.quizResult.innerHTML = `<strong>Score: ${score} / ${total}</strong> — ` +
          (score === total ? 'perfect! You can mark this lesson complete.' : 'review the lessons and try again, or mark this lesson complete.');
        questions.forEach((q, qi) => {
          const chosen = els.quizForm.querySelector(`input[name="q${qi}"]:checked`);
          const fs = els.quizForm.querySelectorAll('fieldset')[qi];
          if (fs) fs.style.borderLeft = `4px solid ${chosen && Number(chosen.value) === q.answer ? 'var(--s21-primary)' : '#EF476F'}`;
        });
        els.quizSubmit.disabled = false;
        return;
      }
      try {
        const res = await fetch(`/api/quizzes/${quiz.id}/attempt`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers }),
        });
        const out = await res.json();
        if (!res.ok) throw new Error(out.error || 'Could not submit quiz');
        els.quizResult.style.display = '';
        els.quizResult.innerHTML = `<strong>Score: ${out.score} / ${out.total}</strong> — you can mark this lesson complete now.`;
      } catch (err) {
        els.quizResult.style.display = '';
        els.quizResult.textContent = err.message || 'Something went wrong.';
      } finally {
        els.quizSubmit.disabled = false;
      }
    };
  }

  function renderCurriculum(course, lessons, currentLessonId) {
    els.curriculumTitle.textContent = course.title;
    els.curriculumList.innerHTML = (lessons || []).map((l) => `
      <a href="lesson.html?id=${encodeURIComponent(l.id)}" class="d-flex align-items-center gap-2 py-2 text-reset text-decoration-none ${String(l.id) === String(currentLessonId) ? 'fw-bold' : ''}" style="font-size:.85rem;${String(l.id) === String(currentLessonId) ? 'color:var(--s21-primary)' : ''}">
        <i class="fa-solid ${l.completed ? 'fa-circle-check' : 'fa-circle'}" style="color:${l.completed ? 'var(--s21-primary)' : '#C9CFD6'};font-size:.7rem"></i>
        ${esc(l.title)}
      </a>
    `).join('');
  }

  async function loadCurriculum(course, currentLessonId) {
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(course.slug)}`, { credentials: 'include' });
      if (!res.ok) return;
      const { lessons } = await res.json();
      els.curriculumTitle.textContent = course.title;
      els.curriculumList.innerHTML = lessons.map((l) => `
        <a href="lesson.html?id=${l.id}" class="d-flex align-items-center gap-2 py-2 text-reset text-decoration-none ${l.id === currentLessonId ? 'fw-bold' : ''}" style="font-size:.85rem;${l.id === currentLessonId ? 'color:var(--s21-primary)' : ''}">
          <i class="fa-solid ${l.completed ? 'fa-circle-check' : 'fa-circle'}" style="color:${l.completed ? 'var(--s21-primary)' : '#C9CFD6'};font-size:.7rem"></i>
          ${esc(l.title)}
        </a>
      `).join('');
    } catch { /* curriculum sidebar is a nice-to-have, safe to skip on failure */ }
  }

  main();
})();
