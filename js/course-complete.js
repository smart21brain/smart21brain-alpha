/* Smart21Brain — course-complete.js
   Drives course-complete.html?slug=<course>: the page learners land on the
   moment they finish a course. Shows the golden certificate (downloadable
   PDF), the courses they could take next, and a button into the dashboard.

   Truthfulness rules, same as the rest of the course engine:
   - The page only celebrates a course that is really complete (server
     progress, or — for built-in catalog courses — progress saved on this
     device). Otherwise it says the course isn't finished yet.
   - A server certificate is shown exactly as issued (code, date, name come
     from /api/certificates/:code). A built-in-catalog course has nothing
     on the server, so its certificate carries no code/QR and says so. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get('slug') || params.get('course');
  const NAME_KEY = 's21.learnerName';

  const $ = (id) => document.getElementById(id);
  const esc = (v) => String(v == null ? '' : v).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const t = (key, fallback) => {
    try { if (typeof window.S21_t === 'function') { const v = window.S21_t(key); if (v && v !== key) return v; } } catch { /* fall through */ }
    return fallback;
  };
  const show = (el) => { if (el) el.style.display = ''; };
  const hide = (el) => { if (el) el.style.display = 'none'; };
  const fmtDate = (value) => {
    let d = value ? new Date(String(value).includes('T') ? value : `${String(value).replace(' ', 'T')}Z`) : new Date();
    if (Number.isNaN(d.getTime())) d = new Date();
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  };

  /* ---------- load the course + the learner's real progress ---------- */
  async function loadState() {
    // 1) the real backend
    try {
      const res = await fetch(`/api/courses/${encodeURIComponent(slug)}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        if (data && data.course) {
          const p = data.progress || null;
          return {
            local: false, course: data.course,
            complete: !!(p && p.course_completed),
            done: p ? p.completed_lessons : 0, total: p ? p.total_lessons : 0,
            certificate: p && p.certificate ? p.certificate : null,
          };
        }
      }
    } catch { /* backend unreachable — fall back to the bundled catalog */ }
    // 2) the bundled catalog (progress lives in this browser)
    const course = window.S21Courses && window.S21Courses.findBySlug(slug);
    if (!course) return null;
    const total = (course.lessons || []).length;
    const prog = window.S21Progress ? window.S21Progress.progress(course.slug, total) : { course_completed: false, completed_lessons: 0 };
    return {
      local: true, course, complete: !!prog.course_completed,
      done: prog.completed_lessons || 0, total, certificate: null,
    };
  }

  /* ---------- confetti (gold, green and pink; skipped for reduced motion) ---------- */
  function confetti() {
    const canvas = $('cc-confetti');
    if (!canvas || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const fit = () => { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; };
    fit();
    const colors = ['#F5D76E', '#D4AF37', '#FFFFFF', '#06A77D', '#EF476F', '#3A86FF'];
    const pieces = Array.from({ length: 130 }, () => ({
      x: Math.random() * canvas.width, y: -20 - Math.random() * canvas.height * 0.6,
      w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, vy: 1.6 + Math.random() * 2.6,
      vx: -1 + Math.random() * 2, rot: Math.random() * 6, vr: -0.15 + Math.random() * 0.3,
      color: colors[(Math.random() * colors.length) | 0],
    }));
    const start = performance.now();
    (function tick(now) {
      const elapsed = now - start;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pieces.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.rot += p.vr;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.globalAlpha = Math.max(0, 1 - elapsed / 6500);
        ctx.fillStyle = p.color; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); ctx.restore();
      });
      if (elapsed < 6500) requestAnimationFrame(tick); else ctx.clearRect(0, 0, canvas.width, canvas.height);
    })(start);
  }

  /* ---------- certificate section ---------- */
  function setGreeting(name) {
    const first = String(name || '').trim().split(/\s+/)[0];
    $('cc-heading').textContent = first
      ? t('cc_congrats_name', 'Congratulations, {name}!').replace('{name}', first)
      : t('cc_congrats', 'Congratulations!');
  }

  async function renderCertificate(state) {
    const section = $('cc-certificate');
    const { course } = state;
    if (!state.local && !state.certificate) {
      // Course is complete but certificates are switched off for it.
      section.innerHTML = `<div class="container" style="max-width:640px"><div class="s21-card p-4 text-center"><p class="mb-0 text-soft">${esc(t('cc_no_cert', 'This course does not include a certificate.'))}</p></div></div>`;
      show(section);
      return false;
    }
    $('cc-course').textContent = course.title;
    const dl = $('cc-download'), err = $('cc-error'), nameInput = $('cc-name-input');
    let certData; // what the PDF will be built from

    if (state.certificate) {
      // ---- server-issued: show exactly what was issued ----
      let cert = { learner_name: '', issued_at: null, code: state.certificate.code, course_title: course.title, course_slug: course.slug };
      try {
        const res = await fetch(`/api/certificates/${encodeURIComponent(state.certificate.code)}`);
        if (res.ok) { const d = await res.json(); if (d && d.certificate) cert = d.certificate; }
      } catch { /* keep the minimal record */ }
      $('cc-name').textContent = cert.learner_name || '—';
      $('cc-date').textContent = fmtDate(cert.issued_at);
      $('cc-code').textContent = cert.code;
      setGreeting(cert.learner_name);
      hide($('cc-name-field'));
      const view = $('cc-view');
      view.href = `certificate.html?code=${encodeURIComponent(cert.code)}`;
      show(view);
      certData = () => ({
        name: cert.learner_name, course: cert.course_title, date: fmtDate(cert.issued_at), code: cert.code,
        verifyUrl: `${window.location.origin}/certificate.html?code=${encodeURIComponent(cert.code)}`,
      });
    } else {
      // ---- built-in catalog course: made on this device ----
      let saved = '';
      try { saved = localStorage.getItem(NAME_KEY) || ''; } catch { /* ignore */ }
      const doneAt = window.S21Progress && window.S21Progress.stampCompletion
        ? window.S21Progress.stampCompletion(course.slug, state.total) : null;
      const dateText = fmtDate(doneAt);
      nameInput.value = saved;
      const paint = () => {
        const name = nameInput.value.trim();
        $('cc-name').textContent = name || '—';
        setGreeting(name);
      };
      paint();
      nameInput.addEventListener('input', paint);
      $('cc-date').textContent = dateText;
      hide($('cc-code-wrap'));
      show($('cc-local-note'));
      show($('cc-name-field'));
      if (!saved) {
        fetch('/api/dashboard', { credentials: 'include' })
          .then((r) => (r.ok ? r.json() : null))
          .then((d) => { if (d && d.user && d.user.name && !nameInput.value) { nameInput.value = d.user.name; paint(); } })
          .catch(() => {});
      }
      certData = () => ({
        name: nameInput.value.trim(), course: course.title, date: dateText, code: null, verifyUrl: null,
        note: 'Completion recorded on this device — not verifiable online.',
      });
    }

    let busy = false;
    dl.addEventListener('click', async () => {
      if (busy) return;
      err.style.display = 'none';
      const data = certData();
      if (!data.name) { err.textContent = t('cc_type_name', 'Please type your name first.'); err.style.display = ''; nameInput.focus(); return; }
      if (state.local) { try { localStorage.setItem(NAME_KEY, data.name); } catch { /* ignore */ } }
      busy = true; dl.disabled = true;
      const label = dl.querySelector('span'); const old = label.textContent; label.textContent = t('cc_preparing', 'Preparing…');
      try {
        if (!window.S21CertificatePDF) throw new Error('The PDF tools did not load. Check your connection and refresh the page.');
        const bytes = await window.S21CertificatePDF.build(data, { logoBytes: await window.S21CertificatePDF.loadLogo() });
        window.S21CertificatePDF.download(bytes, `Smart21Brain-Certificate-${window.S21CertificatePDF.fileSlug(course.slug || course.title)}.pdf`);
      } catch (e) {
        err.textContent = (e && e.message) || 'Could not create the PDF.'; err.style.display = '';
      } finally { busy = false; dl.disabled = false; label.textContent = old; }
    });
    show(section);
    return true;
  }

  /* ---------- upcoming courses ---------- */
  async function renderUpcoming(state) {
    let list = null;
    try {
      const res = await fetch('/api/courses', { credentials: 'include' });
      if (res.ok) { const d = await res.json(); if (d && Array.isArray(d.courses)) list = d.courses; }
    } catch { /* fall back below */ }
    if (!list && window.S21Courses) list = window.S21Courses.all;
    list = (list || []).filter((c) => {
      if (c.slug === state.course.slug) return false;
      const lc = window.S21Courses && window.S21Courses.findBySlug(c.slug);
      if (lc && window.S21Progress && window.S21Progress.progress(c.slug, (lc.lessons || []).length).course_completed) return false;
      return true;
    });
    // same subject first, then the rest
    const cat = state.course.category_slug;
    list.sort((a, b) => (b.category_slug === cat) - (a.category_slug === cat));
    list = list.slice(0, 3);

    const box = $('cc-courses');
    if (!list.length) {
      box.innerHTML = `<div class="col-12"><p class="text-soft text-center mb-0">${esc(t('cc_empty_courses', 'You have completed everything we have for now — new courses are coming soon!'))}</p></div>`;
      return;
    }
    box.innerHTML = list.map((c) => {
      const meta = [c.level, c.age_range ? `${t('cc_ages', 'Ages')} ${c.age_range}` : ''].filter(Boolean).join(' · ');
      const price = c.is_free || !c.price ? t('cc_free', 'Free') : `TSh ${Number(c.price).toLocaleString()}`;
      return `<div class="col-md-6 col-lg-4"><article class="s21-card cc-course-card">
        ${c.thumbnail_url ? `<img class="cc-thumb" src="${esc(c.thumbnail_url)}" alt="" loading="lazy" width="640" height="360">` : '<div class="cc-thumb"></div>'}
        <div class="cc-body">
          ${c.category_name ? `<span class="cc-chip">${esc(c.category_name)}</span>` : ''}
          <h3 class="h6 mb-0">${esc(c.title)}</h3>
          <div class="text-soft" style="font-size:.8rem">${esc(meta)}</div>
          <div class="d-flex align-items-center justify-content-between mt-auto pt-2">
            <strong style="font-size:.85rem;color:var(--s21-primary)">${esc(price)}</strong>
            <a class="btn-s21 btn-s21-primary" style="padding:.4rem .95rem;font-size:.8rem" href="course.html?slug=${encodeURIComponent(c.slug)}">${esc(t('cc_view_course', 'View course'))}</a>
          </div>
        </div></article></div>`;
    }).join('');
    box.querySelectorAll('img.cc-thumb').forEach((img) => img.addEventListener('error', () => {
      const ph = document.createElement('div'); ph.className = 'cc-thumb'; img.replaceWith(ph);
    }));
  }

  async function main() {
    if (!slug) { hide($('cc-loading')); show($('cc-notfound')); return; }
    const state = await loadState();
    hide($('cc-loading'));
    if (!state) { show($('cc-notfound')); return; }

    document.title = `${state.course.title} — ${t('cc_title', 'Course complete')} | Smart21Brain`;
    if (!state.complete) {
      $('cc-notdone-progress').textContent = state.total ? `${state.done} / ${state.total}` : '';
      $('cc-notdone-link').href = `course.html?slug=${encodeURIComponent(state.course.slug)}`;
      show($('cc-notdone'));
      return;
    }
    $('cc-course-name').textContent = state.course.title;
    show($('cc-main'));
    confetti();
    const hasCert = await renderCertificate(state);
    $('cc-btn-cert').style.display = hasCert ? '' : 'none';
    renderUpcoming(state);
  }

  main();
})();
