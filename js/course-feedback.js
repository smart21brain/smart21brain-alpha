/* Smart21Brain — course-feedback.js
   Reviews + teacher announcements/assignments on course.html, backed by
   /api/courses/:id/reviews and /api/courses/:id/updates (real database). */
(function () {
  'use strict';
  var params = new URLSearchParams(location.search);
  var key = params.get('slug') || params.get('id');
  if (!key || !document.getElementById('course-reviews-wrap')) return;

  function $(id) { return document.getElementById(id); }
  function esc(s) { var d = document.createElement('div'); d.textContent = s == null ? '' : String(s); return d.innerHTML; }
  function stars(n) { var o = ''; for (var i = 1; i <= 5; i++) o += '<i class="fa-' + (i <= Math.round(n) ? 'solid' : 'regular') + ' fa-star" style="color:var(--s21-secondary-dark);font-size:.8rem"></i>'; return o; }
  function date(s) { var d = new Date(String(s).replace(' ', 'T') + 'Z'); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }); }
  var id = encodeURIComponent(key), picked = 0;

  function drawPicker() {
    $('course-review-stars').innerHTML = [1, 2, 3, 4, 5].map(function (n) {
      return '<button type="button" class="btn p-0 me-1" data-star="' + n + '" role="radio" aria-checked="' + (n === picked) + '" aria-label="' + n + ' star' + (n > 1 ? 's' : '') + '"><i class="fa-' + (n <= picked ? 'solid' : 'regular') + ' fa-star" style="color:var(--s21-secondary-dark);font-size:1.4rem"></i></button>';
    }).join('');
  }

  function loadReviews() {
    fetch('/api/courses/' + id + '/reviews', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d) return;
      // Show the section if there is something to read, or the learner can add to it.
      if (!d.reviews.length && !d.can_review) return;
      $('course-reviews-wrap').style.display = '';
      $('course-reviews-summary').textContent = d.summary.count ? '· ' + d.summary.avg + ' average from ' + d.summary.count + ' review' + (d.summary.count === 1 ? '' : 's') : '';
      $('course-reviews-list').innerHTML = d.reviews.length ? d.reviews.map(function (r) {
        return '<div class="mb-3"><div class="fw-bold" style="font-size:.88rem">' + esc(r.name) + ' <span class="text-soft fw-normal" style="font-size:.74rem">' + date(r.created_at) + '</span></div><div>' + stars(r.rating) + '</div>' +
          (r.comment ? '<p class="mb-1 text-soft" style="font-size:.85rem">' + esc(r.comment) + '</p>' : '') +
          (r.teacher_reply ? '<div class="p-2" style="background:var(--s21-primary-light);border-radius:8px;font-size:.82rem"><strong>Teacher:</strong> ' + esc(r.teacher_reply) + '</div>' : '') + '</div>';
      }).join('') : '<p class="text-soft mb-0" style="font-size:.85rem">No reviews yet — be the first.</p>';
      if (d.can_review) {
        $('course-review-form').style.display = '';
        if (d.mine) { picked = d.mine.rating; $('course-review-text').value = d.mine.comment || ''; $('course-review-send').textContent = 'Update review'; }
        drawPicker();
      }
    }).catch(function () { /* section simply stays hidden */ });
  }

  function loadUpdates() {
    fetch('/api/courses/' + id + '/updates', { credentials: 'include' }).then(function (r) { return r.ok ? r.json() : null; }).then(function (d) {
      if (!d || (!d.announcements.length && !d.assignments.length)) return;
      var html = '';
      if (d.assignments.length) html += '<div class="fw-bold mb-2" style="font-size:.85rem"><i class="fa-solid fa-list-check me-1"></i>Assignments</div>' + d.assignments.map(function (a) {
        return '<div class="mb-3"><div class="fw-bold" style="font-size:.88rem">' + esc(a.title) + (a.due_date ? ' <span class="status-chip pending">Due ' + esc(a.due_date) + '</span>' : '') + '</div>' +
          (a.instructions ? '<div class="text-soft" style="font-size:.84rem;white-space:pre-wrap">' + esc(a.instructions) + '</div>' : '') + '</div>';
      }).join('');
      if (d.announcements.length) html += '<div class="fw-bold mb-2 mt-2" style="font-size:.85rem"><i class="fa-solid fa-bell me-1"></i>Announcements</div>' + d.announcements.map(function (a) {
        return '<div class="mb-2" style="font-size:.86rem"><span class="text-soft" style="font-size:.74rem">' + date(a.created_at) + ' · ' + esc(a.teacher_name) + '</span><div>' + esc(a.body) + '</div></div>';
      }).join('');
      $('course-updates').innerHTML = html; $('course-updates-wrap').style.display = '';
    }).catch(function () { /* hidden */ });
  }

  document.addEventListener('click', function (e) {
    var b = e.target.closest('[data-star]'); if (!b) return;
    picked = Number(b.dataset.star); drawPicker();
  });
  var send = $('course-review-send');
  if (send) send.addEventListener('click', function () {
    var msg = $('course-review-msg');
    if (!picked) { msg.textContent = 'Choose a star rating first.'; return; }
    send.disabled = true; msg.textContent = '';
    fetch('/api/courses/' + id + '/reviews', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ rating: picked, comment: $('course-review-text').value.trim() }) })
      .then(function (r) { return r.json().then(function (d) { if (!r.ok) throw new Error(d.error || 'Could not save'); }); })
      .then(function () { msg.textContent = 'Thanks for your review!'; loadReviews(); })
      .catch(function (er) { msg.textContent = er.message; })
      .then(function () { send.disabled = false; });
  });

  loadReviews(); loadUpdates();
})();
