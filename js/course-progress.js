/* Smart21Brain — course-progress.js
   Enrollment and lesson progress kept in the browser (localStorage) for when
   the site runs without a backend. This is what makes "Enroll free" and
   "Mark as complete" work on a static deployment instead of hitting
   /api/... and failing with a server error.

   When a real API is added later, course-detail.js / lesson.js prefer the
   server response and this store is simply not consulted.
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

  function enroll(slug) {
    const all = readAll();
    if (!all[slug]) all[slug] = { enrolled_at: Date.now(), completed: [] };
    writeAll(all);
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
    writeAll(all);
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

  window.S21Progress = {
    isEnrolled, enroll, isComplete, setComplete, progress, applyTo, completedIds,
  };
})();
