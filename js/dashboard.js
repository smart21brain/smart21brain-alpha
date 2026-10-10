/* Smart21Brain — dashboard.js
   Loads the signed-in user's real stats from /api/dashboard and applies
   them to the welcome banner (photo + name), the quiz/game stat cards,
   and a "Recent activity" list built from their actual quiz attempts and
   game plays.

   Courses come from TWO places and the dashboard shows both:
   - the database (/api/courses/my) for courses run by the backend, and
   - this browser's saved progress (js/course-progress.js) for the built-in
     catalog courses, which keep enrolment + lesson progress on the device.
   Before this, only the first was read, so a learner could finish a whole
   course and the dashboard still showed zero. Streaks / XP / badges still
   come from the backend only. */
(function () {
  // S21_t hands back the raw key when a string is missing, so treat that as
  // "not translated" and use the English fallback instead of showing the key.
  function t(key, fallback) {
    try { if (window.S21_t) { const v = window.S21_t(key); if (v && v !== key) return v; } } catch { /* fall through */ }
    return fallback;
  }
  function fill(str, vars) { return String(str).replace(/\{(\w+)\}/g, (m, k) => (vars[k] == null ? m : vars[k])); }

  function escapeHtml(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // Lightweight "time ago" label, consistent with the style used elsewhere
  // on the site (e.g. "2 hours ago" on admin.html).
  function timeAgo(isoString) {
    const then = new Date(isoString).getTime();
    if (!isoString || Number.isNaN(then)) return '';
    const diffMs = Date.now() - then;
    const mins = Math.max(0, Math.round(diffMs / 60000));
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.round(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(then).toLocaleDateString();
  }

  /* ---------- courses saved in this browser (built-in catalog) ---------- */
  function localCourses() {
    const P = window.S21Progress, C = window.S21Courses;
    if (!P || !C || !P.all) return [];
    const states = P.all();
    const out = [];
    Object.keys(states).forEach((slug) => {
      const course = C.findBySlug(slug);
      if (!course) return;
      const lessons = course.lessons || [];
      const prog = P.progress(slug, lessons.length);
      const done = new Set(P.completedIds(slug));
      const next = lessons.find((l) => !done.has(String(l.id)));
      out.push({
        local: true, slug, title: course.title, thumbnail_url: course.thumbnail_url, category_slug: course.category_slug, category_name: course.category_name,
        progress_percent: prog.progress_percent, status: prog.course_completed ? 'completed' : 'active',
        certificate_enabled: !!course.certificate_enabled, completed_at: P.completedAt ? P.completedAt(slug) : null,
        next_lesson: next ? { id: next.id, title: next.title } : null,
        lessons, times: states[slug].times || {},
      });
    });
    return out;
  }

  let serverCourses = null;   // null until /api/courses/my answers (or fails)
  function allCourses() {
    const server = serverCourses || [];
    const seen = new Set(server.map((c) => c.slug));
    return server.concat(localCourses().filter((c) => !seen.has(c.slug)));
  }

  function courseHref(c) {
    if (c.local && c.status === 'completed') return `course-complete.html?slug=${encodeURIComponent(c.slug)}`;
    if (c.local && c.next_lesson) return `lesson.html?id=${encodeURIComponent(c.next_lesson.id)}`;
    return `course.html?slug=${encodeURIComponent(c.slug)}`;
  }

  /* Weekly goal: lessons finished in the last 7 days (goal: 5), from this browser's progress. */
  const WEEKLY_GOAL = 5;
  function renderWeeklyGoal() {
    const bar = document.getElementById('dash-weekly-bar');
    if (!bar) return;
    const since = Date.now() - 7 * 24 * 3600 * 1000;
    let n = 0;
    localCourses().forEach((c) => Object.keys(c.times).forEach((id) => { if (new Date(c.times[id]).getTime() >= since) n += 1; }));
    const pct = Math.min(100, Math.round((n / WEEKLY_GOAL) * 100));
    bar.style.width = `${pct}%`;
    document.getElementById('dash-weekly-label').textContent = fill(t('dash_weekly_lessons', '{n} / {goal} lessons'), { n: Math.min(n, WEEKLY_GOAL), goal: WEEKLY_GOAL });
    document.getElementById('dash-weekly-pct').textContent = `${pct}%`;
  }

  function refreshCourseViews() {
    renderWeeklyGoal();
    const courses = allCourses();
    const statEl = document.getElementById('dash-stat-courses');
    if (statEl) statEl.textContent = courses.filter((c) => c.status !== 'completed').length;
    renderContinueLearning(courses);
    renderNotifications(courses);
    renderRecommended(courses);
    renderRecentActivity(lastDashboardData);
  }

  let lastDashboardData = null;

  function renderRecentActivity(data) {
    lastDashboardData = data || lastDashboardData;
    data = data || {};
    const list = document.getElementById('dash-recent-activity-list');
    if (!list) return;

    const lessonEvents = [];
    localCourses().forEach((c) => {
      const byId = new Map(c.lessons.map((l) => [String(l.id), l]));
      Object.keys(c.times).forEach((id) => {
        const lesson = byId.get(id);
        if (lesson) lessonEvents.push({
          icon: 'fa-book-open',
          label: `${t('dash_act_lesson', 'Completed lesson')}: ${escapeHtml(lesson.title)}`,
          detail: c.title, when: c.times[id],
        });
      });
    });

    const quizEvents = (data.recent_quizzes || []).map((q) => ({
      icon: 'fa-circle-question',
      label: `${t('dash_completed_quiz', 'Completed quiz')}: ${escapeHtml(q.title)}`,
      detail: q.total ? `${q.score}/${q.total}` : '',
      when: q.completed_at,
    }));
    const gameEvents = (data.recent_games || []).map((g) => ({
      icon: 'fa-gamepad',
      label: `${t('dash_played_game', 'Played')} ${escapeHtml(g.title || 'a game')}`,
      detail: typeof g.score === 'number' ? `${g.score} pts` : '',
      when: g.played_at,
    }));

    const events = [...lessonEvents, ...quizEvents, ...gameEvents]
      .filter((e) => e.when)
      .sort((a, b) => new Date(b.when) - new Date(a.when))
      .slice(0, 5);

    if (!events.length) return; // leave the "nothing yet" placeholder in place

    list.innerHTML = events.map((e) => `
      <li class="d-flex gap-2">
        <i class="fa-solid ${e.icon} text-soft mt-1"></i>
        <span>${e.label}${e.detail ? ` — <span class="text-soft">${escapeHtml(e.detail)}</span>` : ''}
          <span class="text-soft d-block" style="font-size:.75rem">${escapeHtml(timeAgo(e.when))}</span>
        </span>
      </li>
    `).join('');
  }

  function renderContinueLearning(courses) {
    const wrap = document.getElementById('dash-continue-learning-list');
    if (!wrap) return;

    if (!courses.length) {
      wrap.innerHTML = `<div class="col-12"><p class="text-soft" style="font-size:.85rem">${escapeHtml(t('dash_no_courses_yet', "You haven't enrolled in a course yet."))} <a href="courses.html">${escapeHtml(t('dash_browse_courses', 'Browse courses'))}</a></p></div>`;
      return;
    }

    // courses still in progress first, finished ones after
    const ordered = courses.slice().sort((a, b) => (a.status === 'completed') - (b.status === 'completed'));
    const thumbFallback = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=200&q=70&auto=format&fit=crop';
    wrap.innerHTML = ordered.slice(0, 6).map((c) => {
      let sub;
      if (c.payment_status === 'pending') sub = t('dash_payment_pending', 'Payment pending');
      else if (c.status === 'completed') sub = `<i class="fa-solid fa-circle-check" style="color:var(--s21-primary)"></i> ${escapeHtml(t('dash_course_done', 'Completed'))}${c.local && c.certificate_enabled ? ` · ${escapeHtml(t('dash_get_certificate', 'Get certificate'))}` : ''}`;
      else sub = `${c.progress_percent}% ${escapeHtml(t('dash_complete_word', 'complete'))}${c.next_lesson ? ` · ${escapeHtml(t('dash_next_lesson', 'Next'))}: ${escapeHtml(c.next_lesson.title)}` : ''}`;
      return `
      <div class="col-md-6" data-aos="fade-up">
        <a href="${courseHref(c)}" class="text-reset text-decoration-none">
          <div class="s21-card p-3 d-flex gap-3 align-items-center">
            <img src="${escapeHtml(c.thumbnail_url || thumbFallback)}" alt="" width="70" height="70" style="border-radius:12px;object-fit:cover" loading="lazy">
            <div class="flex-grow-1" style="min-width:0">
              <h3 class="h6 mb-1">${escapeHtml(c.title)}</h3>
              <div class="progress-s21 mb-1"><span style="width:${Number(c.progress_percent) || 0}%"></span></div>
              <span class="text-soft" style="font-size:.76rem">${sub}</span>
            </div>
          </div>
        </a>
      </div>`;
    }).join('');
  }

  /* Notifications built from what the learner is really doing. */
  function renderNotifications(courses) {
    const list = document.getElementById('dash-notifications-list');
    if (!list) return;
    const items = [];
    courses.filter((c) => c.status === 'completed' && c.local && c.certificate_enabled).slice(0, 2).forEach((c) => {
      items.push({ icon: 'fa-award', href: `course-complete.html?slug=${encodeURIComponent(c.slug)}`,
        text: fill(t('dash_notif_finished', 'You finished {course} — get your certificate'), { course: c.title }) });
    });
    courses.filter((c) => c.status !== 'completed' && c.payment_status !== 'pending').slice(0, 2).forEach((c) => {
      items.push({ icon: 'fa-circle-play', href: courseHref(c),
        text: fill(t('dash_notif_continue', 'Continue {course} — {pct}% complete'), { course: c.title, pct: c.progress_percent }) });
    });
    // Announcements teachers post for the courses this learner is enrolled in.
    fetch('/api/announcements', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { announcements: [] }))
      .catch(() => ({ announcements: [] }))
      .then((d) => {
        const ann = (d.announcements || []).slice(0, 3).map((a) => ({
          icon: 'fa-bullhorn',
          href: a.course_slug ? `course.html?slug=${encodeURIComponent(a.course_slug)}` : '#',
          text: `${a.teacher_name || 'Your teacher'}${a.course_title ? ' (' + a.course_title + ')' : ''}: ${a.body}`,
        }));
        paintNotifications(list, ann.concat(items));
      });
  }

  function paintNotifications(list, items) {
    if (!items.length) return; // keep the "no notifications yet" line
    list.innerHTML = items.map((n) => `
      <li class="d-flex gap-2"><i class="fa-solid ${n.icon} mt-1" style="color:var(--s21-accent)"></i>
        <a href="${n.href}" class="text-reset">${escapeHtml(n.text)}</a></li>`).join('');
  }

  /* "Recommended for you": courses from the catalog the learner hasn't started. */
  function renderRecommended(courses) {
    const row = document.getElementById('dash-recommended-list');
    const C = window.S21Courses;
    if (!row || !C) return; // keep the static suggestions if the catalog isn't there
    const taken = new Set(courses.map((c) => c.slug));
    let pool = C.all.filter((c) => !taken.has(c.slug));
    if (!pool.length) { row.innerHTML = ''; return; }
    // same subject as what they studied most recently comes first
    const recent = courses.find((c) => c.category_slug);
    if (recent) pool.sort((a, b) => (b.category_slug === recent.category_slug) - (a.category_slug === recent.category_slug));
    row.innerHTML = pool.slice(0, 3).map((c, i) => `
      <div class="col-md-4" data-aos="fade-up" data-aos-delay="${i * 60}">
        <a href="course.html?slug=${encodeURIComponent(c.slug)}" class="text-reset text-decoration-none">
          <div class="s21-card media-card">
            <div class="thumb-wrap"><img src="${escapeHtml(c.thumbnail_url)}" alt="" loading="lazy"><span class="cat-badge">${escapeHtml(c.category_name || '')}</span></div>
            <div class="body"><h3 class="h6 mb-0">${escapeHtml(c.title)}</h3></div>
          </div>
        </a>
      </div>`).join('');
  }

  // Real certificates from /api/certificates/my — one row per course the
  // learner has completed, each with View and Download. Never shows demo
  // data: with none earned yet it says so and points at the course catalog.
  function renderCertificates(list, failed) {
    const box = document.getElementById('dash-certificates-list');
    if (!box) return;
    const serverSlugs = new Set(list.map((c) => c.course_slug).filter(Boolean));
    // finished built-in courses: their certificate is made on the course-complete page
    const locals = localCourses().filter((c) => c.status === 'completed' && c.certificate_enabled && !serverSlugs.has(c.slug));
    if (!list.length && !locals.length) {
      box.innerHTML = failed
        ? escapeHtml(t('dash_cert_load_failed', "Couldn't load your certificates."))
        : `<p class="mb-2">${escapeHtml(t('dash_cert_empty', 'Finish a course to earn your first certificate.'))}</p>
        <a href="courses.html" class="btn-s21 btn-s21-outline w-100 justify-content-center" style="font-size:.82rem">${escapeHtml(t('dash_cert_browse', 'Browse courses'))}</a>`;
      return;
    }
    const fmt = (v) => {
      const d = v ? new Date(String(v).includes('T') ? v : String(v).replace(' ', 'T') + 'Z') : null;
      return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';
    };
    const row = (title, sub, actions) => `
        <div class="d-flex align-items-center gap-3 mb-3">
          <i class="fa-solid fa-certificate fa-lg" style="color:var(--s21-secondary-dark)"></i>
          <div class="flex-grow-1" style="min-width:0">
            <div class="fw-bold" style="font-size:.85rem">${escapeHtml(title)}</div>
            <div class="text-soft" style="font-size:.76rem">${sub}</div>
          </div>
          <div class="d-flex gap-1 flex-shrink-0">${actions}</div>
        </div>`;
    const serverRows = list.map((c) => {
      const code = encodeURIComponent(c.code);
      return row(c.course_title, `${escapeHtml(t('dash_cert_issued', 'Issued'))} ${escapeHtml(fmt(c.issued_at))}`,
        `<a class="btn-s21 btn-s21-primary" style="padding:.3rem .65rem;font-size:.75rem" href="certificate.html?code=${code}&download=1" title="${escapeHtml(t('dash_cert_download', 'Download'))}" aria-label="${escapeHtml(t('dash_cert_download', 'Download'))}: ${escapeHtml(c.course_title)}"><i class="fa-solid fa-download"></i></a>
         <a class="btn-s21 btn-s21-outline" style="padding:.3rem .65rem;font-size:.75rem" href="certificate.html?code=${code}">${escapeHtml(t('dash_cert_view', 'View'))}</a>`);
    });
    const localRows = locals.map((c) => row(c.title, `${escapeHtml(t('dash_course_done', 'Completed'))} ${escapeHtml(fmt(c.completed_at))} · ${escapeHtml(t('dash_cert_on_device', 'saved on this device'))}`,
      `<a class="btn-s21 btn-s21-primary" style="padding:.3rem .65rem;font-size:.75rem" href="course-complete.html?slug=${encodeURIComponent(c.slug)}">${escapeHtml(t('dash_get_certificate', 'Get certificate'))}</a>`));
    box.innerHTML = serverRows.concat(localRows).join('');
  }

  function loadCertificates() {
    const box = document.getElementById('dash-certificates-list');
    if (!box) return;
    renderCertificates([], false); // show browser-saved certificates straight away
    fetch('/api/certificates/my', { credentials: 'include' })
      .then((res) => {
        if (res.ok) return res.json();
        // not signed in / no backend: nothing to show, which is not an error
        if (res.status === 401 || res.status === 403 || res.status === 404) return { certificates: [] };
        throw new Error('status ' + res.status);
      })
      .then((data) => renderCertificates((data && data.certificates) || [], false))
      .catch(() => renderCertificates([], true));
  }

  document.addEventListener('DOMContentLoaded', () => {
    loadCertificates();
    const avatarImg = document.getElementById('dash-avatar-img');
    const heading = document.getElementById('dash-welcome-heading');

    // Show what this browser already knows right away, then add the database courses.
    refreshCourseViews();
    fetch('/api/courses/my', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => { serverCourses = (data && data.courses) || []; })
      .catch(() => { serverCourses = []; })
      .then(refreshCourseViews);

    // XP / streak / badges are counted on the server, so let this browser's lessons
    // reach the account first (it waits at most 4 s, then shows whatever it has).
    const sync = window.S21ProgressSync;
    const afterSync = sync
      ? Promise.race([sync.ready, new Promise((resolve) => setTimeout(resolve, 4000))])
      : Promise.resolve();
    // progress that arrived from another device -> redraw the course views
    window.addEventListener('s21:progress-synced', (e) => {
      if (e.detail && e.detail.changed) { refreshCourseViews(); loadCertificates(); }
    });

    afterSync
      .then(() => fetch('/api/dashboard', { credentials: 'include' }))
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!data || !data.user) return; // guest, or session expired — keep demo defaults

        const user = data.user;
        if (avatarImg && user.avatar_key) {
          avatarImg.src = `/api/avatar/${encodeURIComponent(user.id)}`;
        }
        if (avatarImg && user.name) {
          avatarImg.alt = `${user.name}'s profile picture`;
        }
        if (heading && user.name) {
          heading.textContent = `Welcome back, ${user.name}! 👋`;
        }

        const quizzesEl = document.getElementById('dash-stat-quizzes');
        const gamesEl = document.getElementById('dash-stat-games');
        const avgEl = document.getElementById('dash-stat-quiz-avg');
        if (quizzesEl) quizzesEl.textContent = data.quiz_attempts ?? 0;
        if (gamesEl) gamesEl.textContent = data.games_played ?? 0;
        if (avgEl) avgEl.textContent = `${data.quiz_avg_percent ?? 0}%`;

        renderRecentActivity(data);

        // Streak
        const streakEl = document.getElementById('dash-streak-label');
        if (streakEl) {
          streakEl.textContent = data.streak_days > 0
            ? `${data.streak_days}-${t('dash_day_streak', 'day streak')}`
            : t('dash_no_streak_yet', 'No streak yet');
        }

        // Level / XP
        const levelEl = document.getElementById('dash-level-label');
        if (levelEl) {
          levelEl.textContent = `${t('dash_level_word', 'Level')} ${data.level} · ${data.xp} XP`;
        }
        const perLevel = data.xp_per_level || 200;
        const intoLevel = data.xp_into_level || 0;
        const progressLabel = document.getElementById('dash-level-progress-label');
        if (progressLabel) {
          progressLabel.textContent = `${intoLevel} / ${perLevel} ${t('dash_xp_to_next_level', 'XP to next level')}`;
        }
        const progressBar = document.getElementById('dash-level-progress-bar');
        if (progressBar) {
          progressBar.style.width = `${Math.min(100, Math.round((intoLevel / perLevel) * 100))}%`;
        }

        // Badges
        const badges = data.badges || {};
        document.querySelectorAll('[data-badge-id]').forEach((el) => {
          const earned = !!badges[el.dataset.badgeId];
          el.classList.toggle('locked', !earned);
        });
        const badgesCountEl = document.getElementById('dash-badges-count');
        if (badgesCountEl) {
          badgesCountEl.textContent = `${data.earned_badges?.length ?? 0} ${t('dash_of', 'of')} ${data.badge_total ?? 8} ${t('dash_earned_word', 'earned')}`;
        }
      })
      .catch(() => { /* not signed in, or offline — keep the defaults */ });
  });
})();
