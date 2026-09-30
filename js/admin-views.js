/* Smart21Brain — Admin dashboard view switcher.
   The admin sidebar links (desktop + mobile) used to just smooth-scroll
   down one long page. This makes each sidebar button open its own
   screen instead: only the matching panel is shown, everything else is
   hidden, and the page heading updates to match. */
(function () {
  const TITLES = {
    overview: 'Platform overview',
    analytics: 'Analytics',
    users: 'Users',
    moderation: 'Content moderation',
    payments: 'Payments & subscriptions',
    settings: 'Platform settings',
    'content-manager': 'Content management',
  };

  document.addEventListener('DOMContentLoaded', () => {
    const views = Array.from(document.querySelectorAll('.admin-view[data-view]'));
    if (!views.length) return;

    const navLinks = Array.from(document.querySelectorAll('[data-admin-view-nav] a[href^="#"]'));
    const titleEl = document.getElementById('admin-view-title');

    function showView(id) {
      const target = views.find((v) => v.dataset.view === id) || views[0];
      const resolvedId = target.dataset.view;

      views.forEach((v) => v.classList.toggle('d-none', v !== target));

      navLinks.forEach((l) => {
        l.classList.toggle('active', l.getAttribute('href') === '#' + resolvedId);
      });

      if (titleEl && TITLES[resolvedId]) titleEl.textContent = TITLES[resolvedId];

      if (history.replaceState) history.replaceState(null, '', '#' + resolvedId);

      // Jump the freshly-opened screen into view without a long scroll animation.
      const content = document.querySelector('.admin-content');
      if (content) content.scrollIntoView({ behavior: 'auto', block: 'start' });
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    navLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const id = link.getAttribute('href').slice(1);
        if (!views.some((v) => v.dataset.view === id)) return;
        e.preventDefault();
        showView(id);
      });
    });

    const initial = location.hash ? location.hash.slice(1) : '';
    showView(views.some((v) => v.dataset.view === initial) ? initial : 'overview');
  });
})();
