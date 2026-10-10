/* Smart21Brain — teacher-dashboard.js
   Drives teachers.html with REAL data from the Worker/D1 backend:
   stats, courses, students, reviews, announcements, assignments, settings,
   plus the forms that create courses, lessons, videos, resources and quizzes.
   Everything a teacher publishes here shows up on courses.html / course.html /
   dashboard.html because it is written to the same database. */
(function () {
  'use strict';

  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function toast(msg, type) {
    if (window.S21_toast) window.S21_toast(esc(msg), { type: type || 'success' });
  }
  function fmtMoney(n) { return 'TZS ' + Number(n || 0).toLocaleString(); }
  function fmtDate(s) {
    if (!s) return '';
    var d = new Date(String(s).replace(' ', 'T') + (String(s).indexOf('Z') > -1 ? '' : 'Z'));
    return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function ago(days) {
    if (days == null) return '—';
    if (days <= 0) return 'Today';
    if (days === 1) return 'Yesterday';
    return days + ' days ago';
  }
  function stars(n) {
    var out = '';
    for (var i = 1; i <= 5; i++) out += '<i class="fa-' + (i <= Math.round(n) ? 'solid' : 'regular') + ' fa-star" style="color:var(--s21-secondary-dark);font-size:.75rem"></i>';
    return out;
  }
  function modal(id) { return bootstrap.Modal.getOrCreateInstance(document.getElementById(id)); }
  function show(el, on) { if (el) el.classList.toggle('d-none', !on); }
  function setErr(id, msg) { var el = document.getElementById(id); if (!el) return; el.textContent = msg || ''; show(el, !!msg); }

  /* ---------- API ---------- */
  function api(path, opts) {
    opts = opts || {};
    var init = { method: opts.method || 'GET', credentials: 'include', headers: {} };
    if (opts.json !== undefined) { init.headers['Content-Type'] = 'application/json'; init.body = JSON.stringify(opts.json); }
    if (opts.form) init.body = opts.form;
    return fetch(path, init).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        if (res.status === 401) { window.location.href = 'login.html'; throw new Error('Please sign in'); }
        if (!res.ok) throw new Error(data.error || ('Request failed (' + res.status + ')'));
        return data;
      });
    });
  }
  // multipart upload with a real progress bar
  function upload(path, form, bar) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', path);
      xhr.withCredentials = true;
      if (bar && xhr.upload) {
        show(bar, true);
        xhr.upload.onprogress = function (e) { if (e.lengthComputable) bar.firstElementChild.style.width = Math.round(e.loaded / e.total * 100) + '%'; };
      }
      xhr.onload = function () {
        var data = {}; try { data = JSON.parse(xhr.responseText); } catch (e) { /* ignore */ }
        if (xhr.status >= 200 && xhr.status < 300) resolve(data); else reject(new Error(data.error || ('Upload failed (' + xhr.status + ')')));
      };
      xhr.onerror = function () { reject(new Error('Network error during upload')); };
      xhr.send(form);
    });
  }

  /* ---------- state ---------- */
  var state = { user: null, courses: [], categories: [], content: { videos: [], materials: [], quizzes: [] }, allStudents: false, editingCourseId: null, lessonCourse: null, modules: [], lessons: [] };

  /* ---------- welcome + overview ---------- */
  function renderWelcome() {
    var u = state.user; if (!u) return;
    var first = String(u.name || '').split(/\s+/)[0] || 'there';
    $('#td-welcome').textContent = 'Welcome back, ' + first + ' 👋';
    $('#td-role').textContent = u.role === 'admin' ? 'Admin view — all courses' : 'Teacher';
    if (u.avatar_key) $('#td-avatar').src = '/api/avatar/' + u.id;
  }

  function loadOverview() {
    return api('/api/teacher/overview').then(function (o) {
      $('#st-published').textContent = o.published_courses;
      $('#st-drafts').textContent = o.draft_courses ? o.draft_courses + ' draft' + (o.draft_courses === 1 ? '' : 's') : '';
      $('#st-students').textContent = o.enrolled_students;
      $('#st-rating').textContent = o.average_rating != null ? o.average_rating : '—';
      $('#st-reviews').textContent = o.review_count ? o.review_count + ' review' + (o.review_count === 1 ? '' : 's') : 'No reviews yet';
      $('#st-revenue').textContent = fmtMoney(o.revenue_this_month);
      $('#st-pending').textContent = o.pending_payments ? o.pending_payments + ' payment' + (o.pending_payments === 1 ? '' : 's') + ' awaiting confirmation' : '';
      $('#gl-enroll').textContent = '+' + o.new_enrollments;
      $('#gl-lessons').textContent = Number(o.lessons_completed).toLocaleString();
      $('#gl-quiz').textContent = o.avg_quiz_score != null ? o.avg_quiz_score + '%' : '—';
      $('#gl-comments').textContent = o.comments_to_answer;
      $('#td-student-count').textContent = o.enrolled_students + ' student' + (o.enrolled_students === 1 ? '' : 's');
    });
  }

  /* ---------- courses ---------- */
  function statusChip(c) {
    return c.published ? '<span class="status-chip active">Published</span>' : '<span class="status-chip pending">Draft</span>';
  }
  function renderCourses() {
    var body = $('#td-courses-body');
    if (!state.courses.length) {
      body.innerHTML = '<tr><td colspan="5" class="text-soft">You have no courses yet. Click <strong>Create new course</strong> to start.</td></tr>';
      return;
    }
    body.innerHTML = state.courses.map(function (c) {
      var thumb = c.thumbnail_url ? '<img src="' + esc(c.thumbnail_url) + '" width="40" height="40" style="border-radius:8px;object-fit:cover" alt="" loading="lazy">'
        : '<span class="d-inline-flex align-items-center justify-content-center" style="width:40px;height:40px;border-radius:8px;background:var(--s21-primary-light);color:var(--s21-primary)"><i class="fa-solid fa-book-open"></i></span>';
      return '<tr data-course="' + c.id + '">' +
        '<td><div class="d-flex align-items-center gap-2">' + thumb + '<div><div class="fw-bold" style="font-size:.88rem">' + esc(c.title) + '</div>' +
        '<div class="text-soft" style="font-size:.74rem">' + c.lesson_count + ' lesson' + (c.lesson_count === 1 ? '' : 's') + (c.category_name ? ' · ' + esc(c.category_name) : '') + (c.is_free ? ' · Free' : ' · ' + fmtMoney(c.price)) + '</div></div></div></td>' +
        '<td>' + (c.student_count || '—') + '</td>' +
        '<td>' + (c.avg_rating ? '<i class="fa-solid fa-star" style="color:var(--s21-secondary-dark)"></i> ' + c.avg_rating + ' <span class="text-soft" style="font-size:.74rem">(' + c.review_count + ')</span>' : '—') + '</td>' +
        '<td>' + statusChip(c) + '</td>' +
        '<td class="text-end text-nowrap">' +
          '<button class="btn btn-sm btn-outline-secondary me-1" data-act="lessons" title="Lessons"><i class="fa-solid fa-list"></i></button>' +
          '<button class="btn btn-sm btn-outline-secondary me-1" data-act="edit" title="Edit"><i class="fa-solid fa-pen"></i></button>' +
          '<button class="btn btn-sm btn-outline-secondary me-1" data-act="toggle" title="' + (c.published ? 'Unpublish' : 'Publish') + '"><i class="fa-solid ' + (c.published ? 'fa-eye-slash' : 'fa-eye') + '"></i></button>' +
          '<a class="btn btn-sm btn-outline-secondary me-1" href="course.html?slug=' + encodeURIComponent(c.slug) + '" target="_blank" rel="noopener" title="View on website"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>' +
          '<button class="btn btn-sm btn-outline-danger" data-act="delete" title="Delete"><i class="fa-solid fa-trash"></i></button>' +
        '</td></tr>';
    }).join('');
    fillCourseSelects();
  }
  function loadCourses() {
    return api('/api/teacher/courses').then(function (d) { state.courses = d.courses || []; renderCourses(); });
  }
  function fillCourseSelects() {
    var opts = state.courses.map(function (c) { return '<option value="' + c.id + '">' + esc(c.title) + '</option>'; }).join('');
    $('#td-ann-course').innerHTML = '<option value="">All my students</option>' + opts;
    $('#af-course').innerHTML = opts || '<option value="">Create a course first</option>';
  }

  function loadCategories() {
    return fetch('/api/course-categories').then(function (r) { return r.json(); }).then(function (d) {
      state.categories = d.categories || [];
      $('#cf-category').innerHTML = '<option value="">— none —</option>' + state.categories.map(function (c) { return '<option value="' + c.id + '">' + esc(c.name) + '</option>'; }).join('');
    }).catch(function () { /* optional */ });
  }

  function openCourseModal(course) {
    state.editingCourseId = course ? course.id : null;
    $('#td-course-modal-title').textContent = course ? 'Edit course' : 'New course';
    $('#cf-title').value = course ? course.title : '';
    $('#cf-description').value = course ? (course.description || '') : '';
    $('#cf-category').value = course && course.category_id ? course.category_id : '';
    $('#cf-level').value = course ? course.level : 'beginner';
    $('#cf-age').value = course ? (course.age_range || '') : '';
    $('#cf-language').value = course ? (course.language || 'English') : 'English';
    $('#cf-price').value = course ? course.price : 0;
    $('#cf-objectives').value = course ? (course.objectives || []).join('\n') : '';
    $('#cf-requirements').value = course ? (course.requirements || []).join('\n') : '';
    $('#cf-passing').value = course ? course.passing_score : 70;
    $('#cf-exam-pass').value = 70;
    $('#cf-cert').checked = course ? !!course.certificate_enabled : false;
    $('#cf-published').checked = course ? !!course.published : false;
    $('#cf-thumb-file').value = '';
    var prev = $('#cf-thumb-preview');
    prev.dataset.url = course && course.thumbnail_url ? course.thumbnail_url : '';
    prev.src = prev.dataset.url; prev.style.display = prev.dataset.url ? '' : 'none';
    var exam = $('#cf-final-exam');
    exam.innerHTML = '<option value="">— none —</option>' + state.content.quizzes.map(function (q) { return '<option value="' + q.id + '">' + esc(q.title) + '</option>'; }).join('');
    exam.value = course && course.final_exam_quiz_id ? course.final_exam_quiz_id : '';
    setErr('cf-error', '');
    modal('td-course-modal').show();
  }

  function lines(v) { return String(v || '').split('\n').map(function (s) { return s.trim(); }).filter(Boolean); }

  function saveCourse() {
    var title = $('#cf-title').value.trim();
    if (!title) return setErr('cf-error', 'Give the course a title.');
    var btn = $('#cf-save'); btn.disabled = true;
    var file = $('#cf-thumb-file').files[0];
    var getThumb = file
      ? (function () { var f = new FormData(); f.append('file', file); return api('/api/teacher/thumbnail', { method: 'POST', form: f }).then(function (r) { return r.url; }); })()
      : Promise.resolve($('#cf-thumb-preview').dataset.url || null);
    getThumb.then(function (thumb) {
      var body = {
        title: title, description: $('#cf-description').value.trim(),
        category_id: $('#cf-category').value ? Number($('#cf-category').value) : null,
        level: $('#cf-level').value, age_range: $('#cf-age').value.trim() || null,
        language: $('#cf-language').value.trim() || 'English',
        price: Number($('#cf-price').value) || 0, thumbnail_url: thumb,
        objectives: lines($('#cf-objectives').value), requirements: lines($('#cf-requirements').value),
        certificate_enabled: $('#cf-cert').checked, passing_score: Number($('#cf-passing').value) || 70,
        final_exam_quiz_id: $('#cf-final-exam').value ? Number($('#cf-final-exam').value) : null,
        final_exam_passing_score: Number($('#cf-exam-pass').value) || 70,
        published: $('#cf-published').checked,
      };
      var id = state.editingCourseId;
      return api(id ? '/api/courses/' + id : '/api/courses', { method: id ? 'PUT' : 'POST', json: body }).then(function (r) { return { id: id || r.id, created: !id }; });
    }).then(function (r) {
      modal('td-course-modal').hide();
      toast(r.created ? 'Course created' : 'Course saved');
      return Promise.all([loadCourses(), loadOverview()]).then(function () {
        if (r.created) openLessons(r.id); // go straight to adding lessons
      });
    }).catch(function (e) { setErr('cf-error', e.message); }).then(function () { btn.disabled = false; });
  }

  function togglePublish(course) {
    api('/api/courses/' + course.id, { method: 'PUT', json: { published: !course.published } })
      .then(function () { toast(course.published ? 'Course unpublished' : 'Course published'); return Promise.all([loadCourses(), loadOverview()]); })
      .catch(function (e) { toast(e.message, 'error'); });
  }
  function deleteCourse(course) {
    if (!confirm('Delete "' + course.title + '"? This also removes its lessons and student progress. This cannot be undone.')) return;
    api('/api/courses/' + course.id, { method: 'DELETE' })
      .then(function () { toast('Course deleted'); return Promise.all([loadCourses(), loadOverview(), loadStudents()]); })
      .catch(function (e) { toast(e.message, 'error'); });
  }

  /* ---------- lessons manager ---------- */
  function openLessons(courseId) {
    var course = state.courses.filter(function (c) { return c.id === courseId; })[0];
    if (!course) return;
    state.lessonCourse = course;
    $('#lm-title').textContent = 'Lessons — ' + course.title;
    setErr('ls-error', '');
    ['ls-title', 'ls-body', 'ls-minutes'].forEach(function (id) { $('#' + id).value = ''; });
    $('#ls-type').value = 'text'; $('#ls-preview').checked = false;
    syncLessonFields(); fillLessonSelects();
    modal('td-lessons-modal').show();
    reloadLessons();
  }
  function syncLessonFields() {
    var t = $('#ls-type').value;
    $$('.ls-field').forEach(function (el) { show(el, el.dataset.for === t); });
    var hint = '';
    if (t === 'video' && !state.content.videos.length) hint = 'No videos yet — close this window and use “Upload a video” first.';
    if (t === 'pdf' && !state.content.materials.length) hint = 'No resources yet — use “Upload a book/resource” first.';
    if (t === 'quiz' && !state.content.quizzes.length) hint = 'No quizzes yet — use “Create a quiz” first.';
    $('#ls-hint').textContent = hint;
  }
  function fillLessonSelects() {
    $('#ls-video').innerHTML = '<option value="">Choose a video…</option>' + state.content.videos.map(function (v) { return '<option value="' + v.id + '">' + esc(v.title) + '</option>'; }).join('');
    $('#ls-material').innerHTML = '<option value="">Choose a resource…</option>' + state.content.materials.map(function (m) { return '<option value="' + m.id + '">' + esc(m.title) + ' (' + esc(m.file_type) + ')</option>'; }).join('');
    $('#ls-quiz').innerHTML = '<option value="">Choose a quiz…</option>' + state.content.quizzes.map(function (q) { return '<option value="' + q.id + '">' + esc(q.title) + ' (' + q.question_count + ' Q)</option>'; }).join('');
  }
  function reloadLessons() {
    var id = state.lessonCourse.id;
    return Promise.all([api('/api/courses/' + id + '/lessons'), api('/api/courses/' + id + '/modules')]).then(function (r) {
      state.lessons = r[0].lessons || []; state.modules = r[1].modules || [];
      $('#ls-module').innerHTML = '<option value="">No module</option>' + state.modules.map(function (m) { return '<option value="' + m.id + '">' + esc(m.title) + '</option>'; }).join('');
      renderLessons();
    });
  }
  var TYPE_ICON = { text: 'fa-book-open', video: 'fa-circle-play', pdf: 'fa-file-pdf', quiz: 'fa-circle-question' };
  function lessonRow(l, idx, total) {
    return '<div class="d-flex align-items-center gap-2 py-2 border-bottom" data-lesson="' + l.id + '">' +
      '<i class="fa-solid ' + (TYPE_ICON[l.content_type] || 'fa-book-open') + '" style="color:var(--s21-primary);width:18px"></i>' +
      '<div class="flex-grow-1" style="min-width:0"><div class="fw-bold text-truncate" style="font-size:.85rem">' + esc(l.title) + '</div>' +
      '<div class="text-soft" style="font-size:.72rem">' + esc(l.content_type) + (l.duration_seconds ? ' · ' + Math.round(l.duration_seconds / 60) + ' min' : '') + (l.is_preview ? ' · free preview' : '') + '</div></div>' +
      '<button class="btn btn-sm btn-outline-secondary" data-lact="up" ' + (idx === 0 ? 'disabled' : '') + ' aria-label="Move up"><i class="fa-solid fa-arrow-up"></i></button>' +
      '<button class="btn btn-sm btn-outline-secondary" data-lact="down" ' + (idx === total - 1 ? 'disabled' : '') + ' aria-label="Move down"><i class="fa-solid fa-arrow-down"></i></button>' +
      '<button class="btn btn-sm btn-outline-danger" data-lact="del" aria-label="Delete lesson"><i class="fa-solid fa-trash"></i></button></div>';
  }
  function renderLessons() {
    var box = $('#lm-list');
    if (!state.lessons.length && !state.modules.length) { box.innerHTML = '<p class="text-soft" style="font-size:.85rem">No lessons yet. Add your first lesson on the right.</p>'; return; }
    var html = '';
    var total = state.lessons.length;
    var idxOf = {}; state.lessons.forEach(function (l, i) { idxOf[l.id] = i; });
    state.modules.forEach(function (m) {
      var ls = state.lessons.filter(function (l) { return l.module_id === m.id; });
      html += '<div class="mt-3 mb-1 d-flex justify-content-between align-items-center"><div class="fw-bold" style="font-size:.85rem"><i class="fa-solid fa-layer-group me-1"></i>' + esc(m.title) + '</div>' +
        '<button class="btn btn-sm btn-link text-danger p-0" data-mact="del" data-module="' + m.id + '">Remove module</button></div>' +
        (ls.length ? ls.map(function (l) { return lessonRow(l, idxOf[l.id], total); }).join('') : '<div class="text-soft" style="font-size:.78rem">No lessons in this module yet.</div>');
    });
    var loose = state.lessons.filter(function (l) { return !l.module_id; });
    if (loose.length) html += (state.modules.length ? '<div class="mt-3 mb-1 fw-bold" style="font-size:.85rem">Other lessons</div>' : '') + loose.map(function (l) { return lessonRow(l, idxOf[l.id], total); }).join('');
    box.innerHTML = html;
  }
  function addLesson() {
    var c = state.lessonCourse, type = $('#ls-type').value, title = $('#ls-title').value.trim();
    if (!title) return setErr('ls-error', 'Give the lesson a title.');
    if (state.lessons.some(function (l) { return l.title.toLowerCase() === title.toLowerCase(); })) return setErr('ls-error', 'This course already has a lesson with that title.');
    var body = { title: title, content_type: type, module_id: $('#ls-module').value ? Number($('#ls-module').value) : null, is_preview: $('#ls-preview').checked };
    var mins = Number($('#ls-minutes').value); if (mins > 0) body.duration_seconds = Math.round(mins * 60);
    if (type === 'video') { if (!$('#ls-video').value) return setErr('ls-error', 'Choose a video.'); body.video_id = Number($('#ls-video').value); }
    if (type === 'pdf') { if (!$('#ls-material').value) return setErr('ls-error', 'Choose a resource.'); body.material_id = Number($('#ls-material').value); }
    if (type === 'quiz') { if (!$('#ls-quiz').value) return setErr('ls-error', 'Choose a quiz.'); body.quiz_id = Number($('#ls-quiz').value); }
    if (type === 'text') { body.body = $('#ls-body').value.trim(); if (!body.body) return setErr('ls-error', 'Write the lesson text.'); }
    setErr('ls-error', '');
    var btn = $('#ls-add'); btn.disabled = true;
    api('/api/courses/' + c.id + '/lessons', { method: 'POST', json: body }).then(function () {
      ['ls-title', 'ls-body', 'ls-minutes'].forEach(function (id) { $('#' + id).value = ''; });
      toast('Lesson added'); return Promise.all([reloadLessons(), loadCourses()]);
    }).catch(function (e) { setErr('ls-error', e.message); }).then(function () { btn.disabled = false; });
  }
  function moveLesson(id, dir) {
    var i = state.lessons.findIndex(function (l) { return l.id === id; }), j = i + dir;
    if (i < 0 || j < 0 || j >= state.lessons.length) return;
    var arr = state.lessons.slice(); var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    var jobs = [];
    arr.forEach(function (l, k) { if (l.sort_order !== k + 1) jobs.push(api('/api/courses/' + state.lessonCourse.id + '/lessons/' + l.id, { method: 'PUT', json: { sort_order: k + 1 } })); });
    Promise.all(jobs).then(reloadLessons).catch(function (e) { toast(e.message, 'error'); });
  }

  /* ---------- students ---------- */
  function loadStudents() {
    var url = '/api/teacher/students' + (state.allStudents ? '' : '?attention=1');
    $('#td-students-title').textContent = state.allStudents ? 'All students' : 'Students needing attention';
    $('#td-students-toggle').textContent = state.allStudents ? 'Show only students needing attention' : 'View all students';
    return api(url).then(function (d) {
      var body = $('#td-students-body');
      if (!d.students.length) { body.innerHTML = '<tr><td colspan="4" class="text-soft">' + (state.allStudents ? 'No students have enrolled in your courses yet.' : 'Nobody needs attention right now — everyone is active. 🎉') + '</td></tr>'; return; }
      body.innerHTML = d.students.map(function (s) {
        var av = s.avatar_url ? '<img src="' + esc(s.avatar_url) + '" width="32" height="32" class="rounded-circle" style="object-fit:cover" alt="">' : '<span class="rounded-circle d-inline-flex align-items-center justify-content-center" style="width:32px;height:32px;background:var(--s21-primary-light);color:var(--s21-primary);font-weight:700;font-size:.8rem">' + esc(s.name.charAt(0)) + '</span>';
        var warn = s.progress_percent < 50;
        return '<tr><td><div class="d-flex align-items-center gap-2">' + av + '<span>' + esc(s.name) + '</span></div></td>' +
          '<td>' + esc(s.course_title) + (s.payment_status === 'pending' ? ' <span class="status-chip pending">Payment pending</span>' : '') + '</td>' +
          '<td style="min-width:120px"><div class="progress-s21"><span style="width:' + s.progress_percent + '%;' + (warn ? 'background:var(--s21-accent)' : '') + '"></span></div><div class="text-soft" style="font-size:.72rem">' + s.completed_lessons + '/' + s.total_lessons + ' lessons</div></td>' +
          '<td>' + ago(s.days_inactive) + '</td></tr>';
      }).join('');
    }).catch(function (e) { $('#td-students-body').innerHTML = '<tr><td colspan="4" class="text-danger">' + esc(e.message) + '</td></tr>'; });
  }

  /* ---------- reviews ---------- */
  function loadReviews() {
    return api('/api/teacher/reviews').then(function (d) {
      var box = $('#td-reviews-list');
      if (!d.reviews.length) { box.innerHTML = '<p class="text-soft mb-0" style="font-size:.85rem">No reviews yet. When students rate your courses, they appear here.</p>'; return; }
      box.innerHTML = d.reviews.map(function (r) {
        var av = r.avatar_url ? '<img src="' + esc(r.avatar_url) + '" width="40" height="40" class="rounded-circle" style="object-fit:cover" alt="">' : '<span class="rounded-circle d-inline-flex align-items-center justify-content-center flex-shrink-0" style="width:40px;height:40px;background:var(--s21-primary-light);color:var(--s21-primary);font-weight:700">' + esc(r.student_name.charAt(0)) + '</span>';
        return '<div class="d-flex gap-3 mb-3" data-review="' + r.id + '">' + av + '<div class="flex-grow-1">' +
          '<div class="fw-bold" style="font-size:.88rem">' + esc(r.student_name) + ' <span class="text-soft fw-normal" style="font-size:.78rem">on ' + esc(r.course_title) + '</span></div>' +
          '<div>' + stars(r.rating) + '</div>' +
          (r.comment ? '<p class="mb-1 text-soft" style="font-size:.85rem">' + esc(r.comment) + '</p>' : '') +
          (r.teacher_reply ? '<div class="p-2 mt-1" style="background:var(--s21-primary-light);border-radius:8px;font-size:.82rem"><strong>Your reply:</strong> ' + esc(r.teacher_reply) + '</div>'
            : (r.comment ? '<button class="btn btn-sm btn-link p-0" data-ract="reply">Reply</button>' : '')) +
          '</div></div>';
      }).join('');
    }).catch(function () { $('#td-reviews-list').innerHTML = '<p class="text-soft mb-0" style="font-size:.85rem">Reviews are not available yet.</p>'; });
  }
  function openReplyBox(row) {
    if ($('.td-reply-box', row)) return;
    var box = document.createElement('div'); box.className = 'td-reply-box mt-1';
    box.innerHTML = '<textarea class="form-control s21-input mb-2" rows="2" maxlength="1000" placeholder="Write a reply…"></textarea><button class="btn-s21 btn-s21-primary" style="font-size:.8rem;padding:.35rem .9rem" data-ract="send">Send reply</button>';
    $('[data-ract="reply"]', row).replaceWith(box);
    $('textarea', box).focus();
  }

  /* ---------- announcements ---------- */
  function loadAnnouncements() {
    return api('/api/teacher/announcements').then(function (d) {
      var box = $('#td-ann-list');
      if (!d.announcements.length) { box.innerHTML = ''; return; }
      box.innerHTML = '<div class="fw-bold mb-2" style="font-size:.78rem;text-transform:uppercase;letter-spacing:.05em">Recent</div>' + d.announcements.slice(0, 5).map(function (a) {
        return '<div class="d-flex gap-2 mb-2" data-ann="' + a.id + '"><div class="flex-grow-1"><div class="text-soft" style="font-size:.72rem">' + fmtDate(a.created_at) + ' · ' + (a.course_title ? esc(a.course_title) : 'All my students') + '</div><div>' + esc(a.body) + '</div></div>' +
          '<button class="btn btn-sm btn-link text-danger p-0" data-aact="del" aria-label="Delete announcement"><i class="fa-solid fa-xmark"></i></button></div>';
      }).join('');
    }).catch(function () { /* section optional until migration is applied */ });
  }
  function postAnnouncement() {
    var text = $('#td-ann-text').value.trim();
    if (!text) return toast('Write an announcement first.', 'error');
    var btn = $('#td-ann-post'); btn.disabled = true;
    api('/api/teacher/announcements', { method: 'POST', json: { body: text, course_id: $('#td-ann-course').value || null } })
      .then(function () { $('#td-ann-text').value = ''; toast('Announcement posted'); return loadAnnouncements(); })
      .catch(function (e) { toast(e.message, 'error'); }).then(function () { btn.disabled = false; });
  }

  /* ---------- assignments ---------- */
  function loadAssignments() {
    return api('/api/teacher/assignments').then(function (d) {
      var box = $('#td-assignments-list');
      if (!d.assignments.length) { box.innerHTML = '<p class="text-soft mb-0" style="font-size:.85rem">No assignments yet.</p>'; return; }
      box.innerHTML = d.assignments.map(function (a) {
        return '<div class="d-flex gap-2 py-2 border-bottom" data-asg="' + a.id + '"><div class="flex-grow-1"><div class="fw-bold" style="font-size:.88rem">' + esc(a.title) + '</div>' +
          '<div class="text-soft" style="font-size:.76rem">' + esc(a.course_title) + (a.due_date ? ' · due ' + esc(a.due_date) : '') + '</div>' +
          (a.instructions ? '<div class="text-soft" style="font-size:.82rem">' + esc(a.instructions.slice(0, 160)) + (a.instructions.length > 160 ? '…' : '') + '</div>' : '') + '</div>' +
          '<button class="btn btn-sm btn-outline-danger align-self-start" data-sact="del" aria-label="Delete assignment"><i class="fa-solid fa-trash"></i></button></div>';
      }).join('');
    }).catch(function () { $('#td-assignments-list').innerHTML = '<p class="text-soft mb-0" style="font-size:.85rem">Assignments are not available yet.</p>'; });
  }
  function saveAssignment() {
    var title = $('#af-title').value.trim();
    if (!$('#af-course').value) return setErr('af-error', 'Create a course first.');
    if (!title) return setErr('af-error', 'Give the assignment a title.');
    var btn = $('#af-save'); btn.disabled = true;
    api('/api/teacher/assignments', { method: 'POST', json: { course_id: Number($('#af-course').value), title: title, instructions: $('#af-instructions').value.trim(), due_date: $('#af-due').value || null } })
      .then(function () { modal('td-assignment-modal').hide(); toast('Assignment created'); return loadAssignments(); })
      .catch(function (e) { setErr('af-error', e.message); }).then(function () { btn.disabled = false; });
  }

  /* ---------- uploads (videos / resources / quizzes) ---------- */
  function loadContent() {
    return api('/api/teacher/content').then(function (d) { state.content = d; renderUploads(); });
  }
  function renderUploads() {
    var rows = [];
    state.content.videos.forEach(function (v) { rows.push({ t: 'video', icon: 'fa-clapperboard', label: 'Video', id: v.id, title: v.title, at: v.created_at }); });
    state.content.materials.forEach(function (m) { rows.push({ t: 'material', icon: 'fa-file-pdf', label: 'Resource', id: m.id, title: m.title, at: m.created_at }); });
    state.content.quizzes.forEach(function (q) { rows.push({ t: 'quiz', icon: 'fa-circle-question', label: 'Quiz · ' + q.question_count + ' Q', id: q.id, title: q.title, at: q.created_at }); });
    rows.sort(function (a, b) { return String(b.at).localeCompare(String(a.at)); });
    var body = $('#td-uploads-body');
    if (!rows.length) { body.innerHTML = '<tr><td colspan="4" class="text-soft">Nothing uploaded yet. Use the quick actions to add videos, resources and quizzes.</td></tr>'; return; }
    body.innerHTML = rows.map(function (r) {
      return '<tr data-kind="' + r.t + '" data-id="' + r.id + '"><td><i class="fa-solid ' + r.icon + ' me-2" style="color:var(--s21-primary)"></i>' + esc(r.title) + '</td><td class="text-soft">' + esc(r.label) + '</td><td class="text-soft">' + fmtDate(r.at) + '</td>' +
        '<td class="text-end"><button class="btn btn-sm btn-outline-danger" data-uact="del" aria-label="Delete"><i class="fa-solid fa-trash"></i></button></td></tr>';
    }).join('');
  }
  function deleteUpload(kind, id) {
    var path = kind === 'video' ? '/api/videos/' : kind === 'material' ? '/api/materials/' : '/api/quizzes/';
    if (!confirm('Delete this ' + (kind === 'material' ? 'resource' : kind) + '? Lessons that use it will lose their content.')) return;
    api(path + id, { method: 'DELETE' }).then(function () { toast('Deleted'); return loadContent(); }).catch(function (e) { toast(e.message, 'error'); });
  }

  function saveVideo() {
    var title = $('#vf-title').value.trim();
    if (!title) return setErr('vf-error', 'Give the video a title.');
    var src = (document.querySelector('input[name="vf-source"]:checked') || {}).value;
    var places = ['courses']; if ($('#vf-pl-videohub').checked) places.push('videohub'); if ($('#vf-pl-kids').checked) places.push('kids');
    var btn = $('#vf-save'); btn.disabled = true; setErr('vf-error', '');
    var p;
    if (src === 'url') {
      var u = $('#vf-url').value.trim();
      if (!u) { btn.disabled = false; return setErr('vf-error', 'Paste the video link.'); }
      p = api('/api/videos', { method: 'POST', json: { title: title, subject: $('#vf-subject').value.trim(), description: $('#vf-description').value.trim(), external_url: u, placements: places, published: true } });
    } else {
      var f = $('#vf-file').files[0];
      if (!f) { btn.disabled = false; return setErr('vf-error', 'Choose a video file.'); }
      var form = new FormData();
      form.append('title', title); form.append('subject', $('#vf-subject').value.trim()); form.append('description', $('#vf-description').value.trim());
      places.forEach(function (pl) { form.append('placements', pl); }); form.append('published', 'true'); form.append('file', f);
      p = upload('/api/videos', form, $('#vf-progress'));
    }
    p.then(function () { modal('td-video-modal').hide(); toast('Video uploaded'); return loadContent(); })
      .catch(function (e) { setErr('vf-error', e.message); })
      .then(function () { btn.disabled = false; show($('#vf-progress'), false); });
  }
  function saveResource() {
    var title = $('#rf-title').value.trim(), f = $('#rf-file').files[0];
    if (!title) return setErr('rf-error', 'Give the resource a title.');
    if (!f) return setErr('rf-error', 'Choose a PDF or image.');
    var form = new FormData(); form.append('title', title); form.append('subject', $('#rf-subject').value.trim()); form.append('file', f);
    var btn = $('#rf-save'); btn.disabled = true; setErr('rf-error', '');
    upload('/api/materials', form, $('#rf-progress')).then(function () { modal('td-resource-modal').hide(); toast('Resource uploaded'); return loadContent(); })
      .catch(function (e) { setErr('rf-error', e.message); }).then(function () { btn.disabled = false; show($('#rf-progress'), false); });
  }

  /* quiz builder */
  var qCount = 0;
  function addQuestion() {
    qCount++; var n = qCount;
    var div = document.createElement('div'); div.className = 's21-card p-3'; div.dataset.q = n;
    div.innerHTML = '<div class="d-flex justify-content-between mb-2"><strong style="font-size:.85rem">Question</strong><button type="button" class="btn btn-sm btn-link text-danger p-0" data-qact="remove">Remove</button></div>' +
      '<input class="form-control s21-input mb-2" data-f="prompt" placeholder="Type the question">' +
      [0, 1, 2, 3].map(function (i) { return '<div class="d-flex align-items-center gap-2 mb-1"><input type="radio" name="qc' + n + '" value="' + i + '" ' + (i === 0 ? 'checked' : '') + ' aria-label="Correct answer ' + (i + 1) + '"><input class="form-control s21-input" data-f="opt" placeholder="Answer ' + (i + 1) + (i < 2 ? '' : ' (optional)') + '"></div>'; }).join('') +
      '<input class="form-control s21-input mt-2" data-f="explanation" placeholder="Explanation shown after answering (optional)">' +
      '<div class="text-soft mt-1" style="font-size:.72rem">Select the radio button next to the correct answer.</div>';
    $('#qf-questions').appendChild(div);
  }
  function openQuizModal() {
    ['qf-title', 'qf-subject', 'qf-description'].forEach(function (id) { $('#' + id).value = ''; });
    $('#qf-questions').innerHTML = ''; qCount = 0; addQuestion(); addQuestion(); setErr('qf-error', '');
    modal('td-quiz-modal').show();
  }
  function saveQuiz() {
    var title = $('#qf-title').value.trim();
    if (!title) return setErr('qf-error', 'Give the quiz a title.');
    var questions = [];
    var cards = $$('#qf-questions [data-q]');
    for (var k = 0; k < cards.length; k++) {
      var card = cards[k];
      var prompt = $('[data-f="prompt"]', card).value.trim();
      var raw = $$('[data-f="opt"]', card).map(function (i) { return i.value.trim(); });
      var chosen = Number((card.querySelector('input[type=radio]:checked') || {}).value || 0);
      // keep the correct index pointing at the right answer after dropping empty options
      var options = [], correct = 0;
      raw.forEach(function (o, idx) { if (o) { if (idx === chosen) correct = options.length; options.push(o); } });
      if (!prompt) return setErr('qf-error', 'Question ' + (k + 1) + ' needs text.');
      if (options.length < 2) return setErr('qf-error', 'Question ' + (k + 1) + ' needs at least two answers.');
      if (!raw[chosen]) return setErr('qf-error', 'Question ' + (k + 1) + ': the correct answer you selected is empty.');
      questions.push({ prompt: prompt, options: options, correct_index: correct, explanation: $('[data-f="explanation"]', card).value.trim() });
    }
    if (!questions.length) return setErr('qf-error', 'Add at least one question.');
    var btn = $('#qf-save'); btn.disabled = true; setErr('qf-error', '');
    api('/api/quizzes', { method: 'POST', json: { title: title, subject: $('#qf-subject').value.trim(), description: $('#qf-description').value.trim(), questions: questions, published: true } })
      .then(function () { modal('td-quiz-modal').hide(); toast('Quiz saved'); return loadContent(); })
      .catch(function (e) { setErr('qf-error', e.message); }).then(function () { btn.disabled = false; });
  }

  /* ---------- settings ---------- */
  function loadSettings() {
    return api('/api/teacher/settings').then(function (d) {
      $$('[data-td-setting]').forEach(function (i) { i.checked = !!d.settings[i.dataset.tdSetting]; });
    }).catch(function () { /* defaults stay */ });
  }

  /* ---------- wiring ---------- */
  function wire() {
    $('#td-new-course').addEventListener('click', function () { openCourseModal(null); });
    $$('[data-td-new-course]').forEach(function (b) { b.addEventListener('click', function () { openCourseModal(null); }); });
    $('#cf-save').addEventListener('click', saveCourse);
    $('#cf-thumb-file').addEventListener('change', function () {
      var f = this.files[0], prev = $('#cf-thumb-preview');
      if (f) { prev.src = URL.createObjectURL(f); prev.style.display = ''; }
    });

    $('#td-courses-body').addEventListener('click', function (e) {
      var btn = e.target.closest('[data-act]'); if (!btn) return;
      var id = Number(btn.closest('tr').dataset.course);
      var course = state.courses.filter(function (c) { return c.id === id; })[0]; if (!course) return;
      var a = btn.dataset.act;
      if (a === 'edit') openCourseModal(course);
      if (a === 'lessons') openLessons(id);
      if (a === 'toggle') togglePublish(course);
      if (a === 'delete') deleteCourse(course);
    });

    $('#ls-type').addEventListener('change', syncLessonFields);
    $('#ls-add').addEventListener('click', addLesson);
    $('#lm-add-module').addEventListener('click', function () {
      var t = prompt('Module name (e.g. "Week 1 — Halves and quarters")'); if (!t || !t.trim()) return;
      api('/api/courses/' + state.lessonCourse.id + '/modules', { method: 'POST', json: { title: t.trim() } }).then(reloadLessons).catch(function (e) { toast(e.message, 'error'); });
    });
    $('#lm-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-lact]');
      if (b) {
        var id = Number(b.closest('[data-lesson]').dataset.lesson);
        if (b.dataset.lact === 'up') moveLesson(id, -1);
        if (b.dataset.lact === 'down') moveLesson(id, 1);
        if (b.dataset.lact === 'del') {
          if (!confirm('Delete this lesson?')) return;
          api('/api/courses/' + state.lessonCourse.id + '/lessons/' + id, { method: 'DELETE' }).then(function () { return Promise.all([reloadLessons(), loadCourses()]); }).catch(function (er) { toast(er.message, 'error'); });
        }
        return;
      }
      var m = e.target.closest('[data-mact]');
      if (m && confirm('Remove this module? Its lessons are kept but become ungrouped.')) {
        api('/api/course-modules/' + m.dataset.module, { method: 'DELETE' }).then(reloadLessons).catch(function (er) { toast(er.message, 'error'); });
      }
    });

    $('#td-students-toggle').addEventListener('click', function () { state.allStudents = !state.allStudents; loadStudents(); });

    $('#td-reviews-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-ract]'); if (!b) return;
      var row = b.closest('[data-review]');
      if (b.dataset.ract === 'reply') return openReplyBox(row);
      if (b.dataset.ract === 'send') {
        var text = $('textarea', row).value.trim(); if (!text) return;
        b.disabled = true;
        api('/api/teacher/reviews/' + row.dataset.review + '/reply', { method: 'POST', json: { reply: text } })
          .then(function () { toast('Reply sent'); return Promise.all([loadReviews(), loadOverview()]); })
          .catch(function (er) { toast(er.message, 'error'); b.disabled = false; });
      }
    });

    $('#td-ann-post').addEventListener('click', postAnnouncement);
    $('#td-ann-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-aact]'); if (!b) return;
      api('/api/teacher/announcements/' + b.closest('[data-ann]').dataset.ann, { method: 'DELETE' }).then(loadAnnouncements).catch(function (er) { toast(er.message, 'error'); });
    });

    $('#td-assignments-list').addEventListener('click', function (e) {
      var b = e.target.closest('[data-sact]'); if (!b || !confirm('Delete this assignment?')) return;
      api('/api/teacher/assignments/' + b.closest('[data-asg]').dataset.asg, { method: 'DELETE' }).then(loadAssignments).catch(function (er) { toast(er.message, 'error'); });
    });
    $('#af-save').addEventListener('click', saveAssignment);

    $('#td-uploads-body').addEventListener('click', function (e) {
      var b = e.target.closest('[data-uact]'); if (!b) return;
      var tr = b.closest('tr'); deleteUpload(tr.dataset.kind, tr.dataset.id);
    });

    $$('[data-td-open]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.tdOpen;
        if (k === 'video') { ['vf-title', 'vf-subject', 'vf-description', 'vf-url'].forEach(function (id) { $('#' + id).value = ''; }); $('#vf-file').value = ''; setErr('vf-error', ''); modal('td-video-modal').show(); }
        if (k === 'resource') { ['rf-title', 'rf-subject'].forEach(function (id) { $('#' + id).value = ''; }); $('#rf-file').value = ''; setErr('rf-error', ''); modal('td-resource-modal').show(); }
        if (k === 'quiz') openQuizModal();
        if (k === 'assignment') { ['af-title', 'af-instructions', 'af-due'].forEach(function (id) { $('#' + id).value = ''; }); setErr('af-error', ''); fillCourseSelects(); modal('td-assignment-modal').show(); }
      });
    });
    $$('input[name="vf-source"]').forEach(function (r) {
      r.addEventListener('change', function () {
        var isUrl = r.value === 'url' && r.checked;
        show($('#vf-url'), isUrl); show($('#vf-file'), !isUrl);
        $('#vf-hint').textContent = isUrl ? 'Paste a YouTube, Vimeo or direct video link.' : 'MP4, WebM or OGG, up to 100MB. For bigger videos, use a link.';
      });
    });
    $('#vf-save').addEventListener('click', saveVideo);
    $('#rf-save').addEventListener('click', saveResource);
    $('#qf-add-q').addEventListener('click', addQuestion);
    $('#qf-questions').addEventListener('click', function (e) { var b = e.target.closest('[data-qact="remove"]'); if (b) b.closest('[data-q]').remove(); });
    $('#qf-save').addEventListener('click', saveQuiz);

    $$('[data-td-setting]').forEach(function (i) {
      i.addEventListener('change', function () {
        var body = {}; body[i.dataset.tdSetting] = i.checked;
        api('/api/teacher/settings', { method: 'PUT', json: body }).then(function () { toast('Setting saved'); })
          .catch(function (e) { i.checked = !i.checked; toast(e.message, 'error'); });
      });
    });
  }

  /* ---------- boot ---------- */
  function showAlert(msg) { var a = $('#td-alert'); a.textContent = msg; show(a, true); }

  function init() {
    if (!$('#td-root') || !window.bootstrap) return;
    wire();
    api('/api/auth/me').then(function (d) {
      state.user = d.user || d;
      if (!state.user || (state.user.role !== 'teacher' && state.user.role !== 'admin')) { showAlert('This dashboard is for teacher accounts. Sign in with a teacher account to continue.'); return; }
      renderWelcome();
      // content first, because the course form and lesson picker use it
      return Promise.all([loadCategories(), loadContent().catch(function () {})]).then(function () {
        return Promise.all([
          loadOverview(), loadCourses(), loadStudents(), loadReviews(), loadAnnouncements(), loadAssignments(), loadSettings(),
        ].map(function (p) { return p.catch(function (e) { console.warn('[teacher-dashboard]', e); }); }));
      });
    }).catch(function (e) { showAlert('Could not load your dashboard: ' + e.message); });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
