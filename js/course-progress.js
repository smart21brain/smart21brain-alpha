/* Smart21Brain — course-progress.js
   Enrollment and lesson progress kept in the browser (localStorage) for when
   the site runs without a backend. This is what makes "Enroll free" and
   "Mark as complete" work on a static deployment instead of hitting
   /api/... and failing with a server error.

   When a real API is added later, course-detail.js / lesson.js prefer the
   server response and this store is simply not consulted.

   Signed-in learners: js/progress-sync.js mirrors this store to their account
   (/api/progress/catalog) so it follows them to other devices and counts
   toward XP / streak / badges. Every change made here is stamped with
   updated_at and announced with a 's21:progress-changed' event so the sync
   can push it straight away.
*/
(function () {
  const KEY = 's21.courseProgress.v1';

  function readAll() {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; }
    catch { return {}; }
  }
  function writeAll(data) {
    try { localStorage.setItem(KEY, JSON.stringify(data)); return true; }
    catch { return false; }
  }

  function courseState(slug) {
    const all = readAll();
    return all[slug] || null;
  }

  function isEnrolled(slug) {
    return !!courseState(slug);
  }

  function changed(slug) {
    try { window.dispatchEvent(new CustomEvent('s21:progress-changed', { detail: { slug } })); } catch { /* old browser */ }
  }

  function enroll(slug) {
    const all = readAll();
    const isNew = !all[slug];
    if (isNew) { all[slug] = { enrolled_at: Date.now(), updated_at: Date.now(), completed: [] }; writeAll(all); changed(slug); }
    return all[slug];
  }

  function completedIds(slug) {
    const st = courseState(slug);
    return st && Array.isArray(st.completed) ? st.completed : [];
  }

  function isComplete(slug, lessonId) {
    return completedIds(slug).indexOf(String(lessonId)) !== -1;
  }

  function setComplete(slug, lessonId, done) {
    const all = readAll();
    if (!all[slug]) all[slug] = { enrolled_at: Date.now(), completed: [] };
    const list = new Set(all[slug].completed || []);
    if (done) list.add(String(lessonId)); else list.delete(String(lessonId));
    all[slug].completed = Array.from(list);
    // remember WHEN each lesson was finished (the dashboard's activity feed uses it)
    const times = all[slug].times || {};
    if (done) { if (!times[String(lessonId)]) times[String(lessonId)] = new Date().toISOString(); }
    else delete times[String(lessonId)];
    all[slug].times = times;
    all[slug].updated_at = Date.now();
    writeAll(all);
    changed(slug);
    return all[slug].completed;
  }

  /* Returns { completed_lessons, total_lessons, progress_percent, course_completed } */
  function progress(slug, totalLessons) {
    const done = completedIds(slug).length;
    const total = totalLessons || 0;
    const pct = total > 0 ? Math.round((done / total) * 100) : 0;
    return {
      completed_lessons: done,
      total_lessons: total,
      progress_percent: pct,
      course_completed: total > 0 && done >= total,
    };
  }

  /* Stamps a catalog lesson array with this browser's completion state. */
  function applyTo(slug, lessons) {
    const done = completedIds(slug);
    return (lessons || []).map((l) =>
      Object.assign({}, l, { completed: done.indexOf(String(l.id)) !== -1 })
    );
  }

  /* Records the day a course was first completed on this device, so a
     certificate can show the real date rather than today's. Never
     un-records it — like the server, a certificate once earned stays. */
  function stampCompletion(slug, totalLessons) {
    const all = readAll();
    const st = all[slug];
    if (!st || !totalLessons) return null;
    if (!st.completed_at && (st.completed || []).length >= totalLessons) {
      st.completed_at = new Date().toISOString();
      writeAll(all);
    }
    return st.completed_at || null;
  }

  function completedAt(slug) {
    const st = courseState(slug);
    return (st && st.completed_at) || null;
  }

  /* Used by progress-sync.js only: adopt the account's copy without announcing a change. */
  function replace(slug, state) {
    const all = readAll();
    all[slug] = state;
    writeAll(all);
  }
  function replaceAll(states) { writeAll(states || {}); }

  window.S21Progress = {
    replace, replaceAll,
    isEnrolled, enroll, isComplete, setComplete, progress, applyTo, completedIds,
    stampCompletion, completedAt, all: readAll,
  };
})();
