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

  // Cuts lesson markdown into one section per "## heading". Text before
  // the first heading (if any) becomes an "Overview" step.
  function splitSections(md) {
    const text = String(md || '').replace(/\r/g, '').trim();
    if (!text) return [];
    return text.split(/\n(?=## )/).map((part) => {
      const m = /^##\s+(.+)$/m.exec(part.split('\n')[0]);
      return { name: m ? m[1].replace(/[*_`]/g, '').trim() : 'Overview', md: part.trim() };
    }).filter((sec) => sec.md);
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

    if (quiz && lesson.content_type !== 'quiz') {
      show(els.quizBlock);
      renderQuiz(quiz, lesson, isLocal);
    }

    // The lesson text is cut into sections at each "## heading", one
    // element per section. Showing one at a time is what makes the lesson
    // step-by-step (see initSteps below); a lesson with a single section
    // simply looks as it always did.
    const sections = [];
    els.bodyText.innerHTML = '';
    const bodyMd = lesson.body || (lesson.content_type === 'text' ? 'No content has been added to this lesson yet.' : '');
    splitSections(bodyMd).forEach((sec) => {
      const el = document.createElement('div');
      el.className = 'lesson-step-section';
      if (window.S21Rich) el.innerHTML = window.S21Rich.render(sec.md);
      else { el.style.whiteSpace = 'pre-line'; el.textContent = sec.md; }
      els.bodyText.appendChild(el);
      sections.push({ name: sec.name, el });
    });

    if (previous) { els.prevLink.href = `lesson.html?id=${previous.id}`; els.prevLink.style.visibility = 'visible'; }
    if (next) { els.nextLink.href = `lesson.html?id=${next.id}`; els.nextLink.style.visibility = 'visible'; }
    else { els.nextLink.href = `course.html?slug=${encodeURIComponent(course.slug)}`; els.nextLink.textContent = 'Back to course'; els.nextLink.style.visibility = 'visible'; }

    setCompleteState(completed);
    els.completeBtn.addEventListener('click', () => toggleComplete(!currentCompleted));

    // Mini curriculum sidebar, current lesson highlighted.
    if (isLocal) renderCurriculum(course, data.lessons, lesson.id);
    else loadCurriculum(course, lesson.id);

    let currentCompleted = completed;
    initSteps();
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
          if (nextState && window.S21Progress.stampCompletion) window.S21Progress.stampCompletion(course.slug, lesson_total);
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
        return true;
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
        return true;
      } catch (err) {
        els.completeStatus.textContent = err.message || 'Something went wrong.';
        return false;
      } finally {
        els.completeBtn.disabled = false;
      }
    }

    // ---- Step-by-step player ------------------------------------------
    // Steps, in order: video / resource (if any) -> each text section ->
    // quiz (if any). One step is on screen at a time; Back/Next move
    // between steps, and Next on the last step marks the lesson complete
    // and goes straight on to the next lesson (or back to the course).
    function initSteps() {
      const textBlock = document.getElementById('lesson-text-block');
      const stepper = document.getElementById('lesson-stepper');
      const labelEl = document.getElementById('lesson-step-label');
      const nameEl = document.getElementById('lesson-step-name');
      const trackEl = document.getElementById('lesson-step-track');
      const fillEl = document.getElementById('lesson-step-fill');
      const dotsEl = document.getElementById('lesson-step-dots');
      const shown = (el) => el && el.style.display !== 'none';

      const steps = [];
      if (shown(els.videoBlock)) steps.push({ name: 'Watch the video', block: els.videoBlock });
      if (shown(els.pdfBlock)) steps.push({ name: els.pdfTitle.textContent || 'Resource', block: els.pdfBlock });
      // A lone one-line intro ("Answer every question…") isn't worth a
      // step of its own — show it above the quiz instead.
      const introOnly = sections.length === 1 && shown(els.quizBlock) && sections[0].el.textContent.trim().length < 300;
      if (!introOnly) sections.forEach((sec) => steps.push({ name: sec.name, block: textBlock, child: sec.el }));
      if (shown(els.quizBlock)) steps.push({ name: els.quizTitle.textContent || 'Quiz', block: els.quizBlock, withIntro: introOnly ? sections[0].el : null });
      if (steps.length < 1) return; // nothing to show (should not happen)

      const last = steps.length - 1;
      const visited = new Set([0]);
      const blocks = [els.videoBlock, els.pdfBlock, textBlock, els.quizBlock];
      let cur = 0;
      const afterHref = next ? `lesson.html?id=${encodeURIComponent(next.id)}` : `course.html?slug=${encodeURIComponent(course.slug)}`;

      function paint(scroll) {
        blocks.forEach((b) => { if (b) b.style.display = 'none'; });
        sections.forEach((sec) => { sec.el.style.display = 'none'; });
        const st = steps[cur];
        st.block.style.display = '';
        if (st.child) st.child.style.display = '';
        if (st.withIntro) { textBlock.style.display = ''; st.withIntro.style.display = ''; }

        // A single-step lesson has nothing to step through, so the progress
        // strip stays hidden — but it still gets Complete & continue.
        stepper.style.display = steps.length > 1 ? '' : 'none';
        labelEl.textContent = `Step ${cur + 1} of ${steps.length}`;
        nameEl.textContent = st.name;
        const pct = Math.round(((cur + 1) / steps.length) * 100);
        fillEl.style.width = `${pct}%`;
        trackEl.setAttribute('aria-valuenow', String(pct));
        dotsEl.innerHTML = steps.map((s, i) =>
          `<button type="button" class="lesson-dot ${i === cur ? 'is-current' : (visited.has(i) ? 'is-done' : '')}" data-step="${i}" aria-label="Step ${i + 1}: ${esc(s.name)}"${i === cur ? ' aria-current="step"' : ''}>${i + 1}</button>`
        ).join('');

        // Back / Next buttons
        const hasPrevLesson = !!previous;
        if (cur > 0) {
          els.prevLink.style.visibility = 'visible';
          els.prevLink.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Back';
        } else if (hasPrevLesson) {
          els.prevLink.style.visibility = 'visible';
          els.prevLink.innerHTML = '<i class="fa-solid fa-arrow-left"></i> Previous lesson';
        } else {
          els.prevLink.style.visibility = 'hidden';
        }
        els.nextLink.style.visibility = 'visible';
        els.nextLink.className = 'btn-s21 btn-s21-primary';
        if (cur < last) els.nextLink.innerHTML = 'Next <i class="fa-solid fa-arrow-right"></i>';
        else if (!currentCompleted) els.nextLink.innerHTML = next
          ? '<i class="fa-solid fa-circle-check"></i> Complete &amp; continue'
          : '<i class="fa-solid fa-flag-checkered"></i> Finish course';
        else els.nextLink.innerHTML = next ? 'Next lesson <i class="fa-solid fa-arrow-right"></i>' : 'Back to course';
        els.nextLink.href = cur < last ? '#' : afterHref;

        if (scroll) els.title.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }

      function go(i) {
        cur = Math.max(0, Math.min(last, i));
        visited.add(cur);
        paint(true);
      }

      dotsEl.addEventListener('click', (e) => {
        const b = e.target.closest('[data-step]');
        if (b) go(Number(b.dataset.step));
      });
      els.prevLink.addEventListener('click', (e) => {
        if (cur > 0) { e.preventDefault(); go(cur - 1); }
        // on the first step the link's own href goes to the previous lesson
      });
      els.nextLink.addEventListener('click', async (e) => {
        e.preventDefault();
        if (cur < last) { go(cur + 1); return; }
        if (els.nextLink.dataset.busy) return;
        els.nextLink.dataset.busy = '1';
        els.nextLink.style.opacity = '.7';
        let ok = true;
        if (!currentCompleted) {
          currentCompleted = true;
          ok = await postComplete(true);
          if (!ok) currentCompleted = false;
        }
        if (ok) { window.location.href = afterHref; return; }
        delete els.nextLink.dataset.busy;
        els.nextLink.style.opacity = '';
      });

      paint(false);
    }

    function setCompleteState(isComplete, progress) {
      els.completeBtn.innerHTML = isComplete
        ? '<i class="fa-solid fa-rotate-left"></i> <span>Mark as not complete</span>'
        : '<i class="fa-solid fa-circle-check"></i> <span>Mark as complete</span>';
      els.completeBtn.className = isComplete ? 'btn-s21 btn-s21-outline w-100 justify-content-center mb-1' : 'btn-s21 btn-s21-primary w-100 justify-content-center mb-1';
      if (progress) {
        els.completeStatus.textContent = `${progress.completed_lessons} / ${progress.total_lessons} lessons complete (${progress.progress_percent}%)${progress.course_completed ? ' — course complete! 🎉' : ''}`;
        // The server issues the certificate the moment the course is
        // complete (only when the course has certificates switched on) and
        // returns it here — link straight to it so it can be downloaded.
        if (progress.course_completed && progress.certificate && progress.certificate.code) {
          const code = encodeURIComponent(progress.certificate.code);
          const wrap = document.createElement('div');
          wrap.className = 'mt-2';
          wrap.innerHTML = `<a class="btn-s21 btn-s21-primary w-100 justify-content-center" href="certificate.html?code=${code}&download=1"><i class="fa-solid fa-award"></i> Get your certificate</a>`;
          els.completeStatus.appendChild(wrap);
        } else if (progress.course_completed && course.certificate_enabled && !progress.certificate && isLocal) {
          // Built-in catalog course: the certificate is made on the course page.
          const wrap = document.createElement('div');
          wrap.className = 'mt-2';
          wrap.innerHTML = `<a class="btn-s21 btn-s21-primary w-100 justify-content-center" href="course.html?slug=${encodeURIComponent(course.slug)}#course-certificate-wrap"><i class="fa-solid fa-award"></i> Get your certificate</a>`;
          els.completeStatus.appendChild(wrap);
        }
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
          const ok = chosen && Number(chosen.value) === q.answer;
          if (fs) {
            fs.style.borderLeft = `4px solid ${ok ? 'var(--s21-primary)' : '#EF476F'}`;
            let note = fs.querySelector('.q-why');
            if (!note) { note = document.createElement('div'); note.className = 'q-why text-soft mt-2'; note.style.fontSize = '.85rem'; fs.appendChild(note); }
            note.innerHTML = (ok ? '<strong style="color:var(--s21-primary)">Correct.</strong> ' : '<strong style="color:#EF476F">Not quite.</strong> The answer is <strong>' + esc(q.options[q.answer]) + '</strong>. ') + (q.why ? esc(q.why) : '');
          }
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
    const list = lessons || [];
    const done = list.filter((l) => l.completed).length;
    const pct = list.length ? Math.round((done / list.length) * 100) : 0;
    let lastMod = null;
    const rows = list.map((l, i) => {
      const cur = String(l.id) === String(currentLessonId);
      const head = l.module && l.module !== lastMod ? `<div class="side-mod">${esc(l.module)}</div>` : '';
      lastMod = l.module || lastMod;
      return head + `
      <a href="lesson.html?id=${encodeURIComponent(l.id)}" class="d-flex align-items-center gap-2 py-2 text-reset text-decoration-none ${cur ? 'fw-bold' : ''}" style="font-size:.85rem;${cur ? 'color:var(--s21-primary)' : ''}">
        <i class="fa-solid ${l.completed ? 'fa-circle-check' : (cur ? 'fa-circle-play' : 'fa-circle')}" style="color:${l.completed || cur ? 'var(--s21-primary)' : '#C9CFD6'};font-size:.75rem"></i>
        ${i + 1}. ${esc(l.title)}
      </a>`;
    }).join('');
    els.curriculumList.innerHTML = `<div class="text-soft" style="font-size:.78rem">${done} of ${list.length} lessons done (${pct}%)</div><div class="lesson-progress-bar"><span style="width:${pct}%"></span></div>` + rows;
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
