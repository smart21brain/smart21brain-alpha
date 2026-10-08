/* Smart21Brain — progress-sync.js
   Keeps a signed-in learner's built-in-course progress in step with their
   ACCOUNT (/api/progress/catalog), so it follows them to another phone or
   laptop and counts toward XP, streak, level and badges on the dashboard.

   The browser copy (js/course-progress.js) stays the working copy: lessons
   keep working offline and for signed-out visitors. This script
     1. on every page load: pulls the account's copy and merges it in, and
        pushes anything this browser has that the account doesn't;
     2. after every change (a lesson ticked, a course joined): pushes right
        away (keepalive, so it survives the page navigating on).

   Merge rules:
   - per course, the newer updated_at wins;
   - progress saved before updated_at existed ("legacy") is UNIONED with the
     account's copy, so nothing is ever lost on first sync;
   - if this browser's saved progress belongs to a different account than the
     one now signed in (shared computer), it is replaced by the signed-in
     learner's own progress instead of being mixed into it.
   Signed-out visitors are untouched: nothing is sent anywhere.

   window.S21ProgressSync.ready resolves when the first sync is finished. */
(function () {
  const P = window.S21Progress;
  if (!P || !P.all || !P.replace) return;

  const API = '/api/progress/catalog';
  const OWNER_KEY = 's21.courseProgress.owner';
  const RELOAD_PAGES = /\/(course|lesson|course-complete)\.html$/;
  let signedIn = null; // null = not known yet

  const stamp = (s) => Number(s && s.updated_at) || 0;
  const sig = (s) => JSON.stringify([(s && s.completed || []).slice().sort(), s && s.completed_at || null]);

  async function call(method, body, keepalive) {
    try {
      const res = await fetch(API, {
        method, credentials: 'include', keepalive: !!keepalive,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
      if (res.status === 401 || res.status === 403) { signedIn = false; return null; }
      if (!res.ok) return null;
      signedIn = true;
      return await res.json();
    } catch { return null; } // offline / no backend: keep working locally
  }

  function unionState(a, b) {
    const completed = Array.from(new Set([...(a.completed || []), ...(b.completed || [])]));
    const times = Object.assign({}, b.times || {}, a.times || {});
    const enrolled = [a.enrolled_at, b.enrolled_at].filter(Boolean);
    return {
      enrolled_at: enrolled.length ? Math.min(...enrolled) : Date.now(),
      updated_at: Date.now(), completed, times, completed_at: a.completed_at || b.completed_at || null,
    };
  }

  // Adopt the account's copy wherever it is newer. Returns true if anything changed locally.
  function adopt(server) {
    let changed = false;
    const local = P.all();
    Object.keys(server || {}).forEach((slug) => {
      const l = local[slug], r = server[slug];
      if (!l || (l.updated_at && stamp(r) > stamp(l))) {
        if (!l || sig(l) !== sig(r)) changed = true;
        P.replace(slug, r);
      }
    });
    return changed;
  }

  async function initialSync() {
    const first = await call('GET');
    if (!first) return { changed: false };
    let server = first.courses || {};
    let changed = false;

    // Shared computer: someone else's saved progress must not leak into this account.
    let owner = null;
    try { owner = localStorage.getItem(OWNER_KEY); } catch { /* ignore */ }
    if (owner && String(owner) !== String(first.user_id)) {
      if (Object.keys(P.all()).length) changed = true;
      P.replaceAll({});
    }
    try { localStorage.setItem(OWNER_KEY, String(first.user_id)); } catch { /* ignore */ }

    const local = P.all();
    const toPush = {};
    Object.keys(local).forEach((slug) => {
      const l = local[slug], r = server[slug];
      if (!r) { toPush[slug] = Object.assign({ updated_at: Date.now() }, l); }
      else if (!l.updated_at) {                       // legacy local data: never lose either side
        const merged = unionState(l, r);
        if (sig(l) !== sig(merged)) changed = true;
        P.replace(slug, merged); toPush[slug] = merged;
      } else if (stamp(l) > stamp(r)) toPush[slug] = l; // this browser is newer
    });
    // anything the account has that this browser lacks / has older
    if (adopt(server)) changed = true;

    if (Object.keys(toPush).length) {
      Object.keys(toPush).forEach((slug) => P.replace(slug, toPush[slug])); // keep the stamp we are sending
      const back = await call('POST', { courses: toPush });
      if (back && back.courses && adopt(back.courses)) changed = true;
    }
    return { changed };
  }

  const ready = initialSync().then((r) => {
    try { window.dispatchEvent(new CustomEvent('s21:progress-synced', { detail: r })); } catch { /* ignore */ }
    // Progress that arrived from another device: pages that already drew themselves redraw once.
    if (r.changed && RELOAD_PAGES.test(window.location.pathname)) {
      const key = `s21.syncReload:${window.location.pathname}${window.location.search}`;
      try { if (!sessionStorage.getItem(key)) { sessionStorage.setItem(key, '1'); window.location.reload(); } } catch { /* ignore */ }
    }
    return r;
  }).catch(() => ({ changed: false }));

  // A lesson was ticked / a course joined: push it now (keepalive survives navigation).
  window.addEventListener('s21:progress-changed', (e) => {
    const slug = e.detail && e.detail.slug;
    const st = slug && P.all()[slug];
    if (!st || signedIn === false) return; // signed out: nothing leaves the browser
    call('POST', { courses: { [slug]: st } }, true);
  });

  window.S21ProgressSync = { ready };
})();
