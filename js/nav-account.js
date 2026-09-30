/* Smart21Brain — nav-account.js
   Runs on every page. Checks whether a session cookie is active and, if
   so, swaps the guest "Log In / Get Started" nav buttons for a single
   account icon (the user's uploaded photo, or their initials as a
   fallback) that links to profile.html. Guests are left untouched —
   the Log In / Get Started buttons keep working exactly as before. */
(function () {
  function initials(name) {
    const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
    if (!parts.length) return '?';
    return (parts[0][0] + (parts[1] ? parts[1][0] : '')).toUpperCase();
  }

  function escapeAttr(str) {
    return String(str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  }

  function photoOrInitials(user) {
    if (user.avatar_key) {
      return `<img src="/api/avatar/${encodeURIComponent(user.id)}" alt="" class="nav-account-photo">`;
    }
    return `<span class="nav-account-initials">${initials(user.name)}</span>`;
  }

  function desktopMarkup(user) {
    const label = escapeAttr(user.name || user.email || 'My account');
    return `<a href="profile.html" class="nav-account-link" aria-label="${label}" title="${label}">${photoOrInitials(user)}</a>`;
  }

  function mobileMarkup(user) {
    const label = escapeAttr(user.name || user.email || 'My account');
    return `<a href="profile.html" class="nav-account-link nav-account-link-wide w-100">${photoOrInitials(user)} <span class="nav-account-name">${label}</span></a>`;
  }

  function applyUser(user) {
    document.querySelectorAll('[data-guest-nav="desktop"]').forEach((el) => {
      el.innerHTML = desktopMarkup(user);
    });
    document.querySelectorAll('[data-guest-nav="mobile"]').forEach((el) => {
      el.innerHTML = mobileMarkup(user);
    });
    // Logged-in users get a shortcut: the site logo (top navbar) takes them
    // straight to their own dashboard instead of the homepage, on every page.
    const dashboardByRole = {
      admin: 'admin.html',
      teacher: 'teachers.html',
      parent: 'parents.html',
      user: 'dashboard.html',
    };
    const role = String(user.role || 'user').toLowerCase();
    const dashboardHref = dashboardByRole[role] || 'dashboard.html';
    document.querySelectorAll('header a.s21-logo[href]').forEach((el) => {
      el.setAttribute('href', dashboardHref);
    });
  }

  function init() {
    fetch('/api/auth/me', { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : { user: null }))
      .then((data) => { if (data && data.user) applyUser(data.user); })
      .catch(() => { /* guest, or offline — leave the default buttons alone */ });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
