/* Smart21Brain — Dashboard sidebar / in-page section navigation.
   Used by admin.html, teachers.html, parents.html, dashboard.html and
   profile.html. Any nav container marked with [data-section-nav] that
   holds <a href="#some-id"> links gets:
     1. Smooth scrolling to the target section when clicked (instead of
        the browser's instant jump), with the URL hash updated.
     2. "active" class kept in sync with whichever section is currently
        in view while the user scrolls (scrollspy), including when the
        same links are duplicated in a desktop sidebar and a mobile
        offcanvas menu.
*/
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const allLinks = Array.from(document.querySelectorAll('[data-section-nav] a[href^="#"]'));
    if (!allLinks.length) return;

    function setActiveByHash(hash) {
      allLinks.forEach((l) => {
        l.classList.toggle('active', l.getAttribute('href') === hash);
      });
    }

    // Smooth-scroll on click.
    allLinks.forEach((link) => {
      link.addEventListener('click', (e) => {
        const hash = link.getAttribute('href');
        const id = hash.slice(1);
        const target = id ? document.getElementById(id) : null;
        if (target) {
          e.preventDefault();
          const top = target.getBoundingClientRect().top + window.pageYOffset - 84;
          window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
          if (history.pushState) history.pushState(null, '', hash);
          setActiveByHash(hash);
        }
      });
    });

    // Scrollspy: highlight whichever linked section is most visible.
    const sectionIds = Array.from(
      new Set(allLinks.map((l) => l.getAttribute('href')).filter((h) => h && h.length > 1))
    ).map((h) => h.slice(1));
    const sections = sectionIds.map((id) => document.getElementById(id)).filter(Boolean);

    if (sections.length && 'IntersectionObserver' in window) {
      const spy = new IntersectionObserver(
        (entries) => {
          let bestId = null;
          let bestRatio = 0;
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
              bestRatio = entry.intersectionRatio;
              bestId = entry.target.id;
            }
          });
          if (bestId) setActiveByHash('#' + bestId);
        },
        { rootMargin: '-90px 0px -55% 0px', threshold: [0, 0.25, 0.5, 0.75, 1] }
      );
      sections.forEach((sec) => spy.observe(sec));
    }

    // Honor a hash already in the URL on load (e.g. a shared/bookmarked link).
    if (location.hash && allLinks.some((l) => l.getAttribute('href') === location.hash)) {
      setActiveByHash(location.hash);
      const target = document.getElementById(location.hash.slice(1));
      if (target) {
        setTimeout(() => {
          const top = target.getBoundingClientRect().top + window.pageYOffset - 84;
          window.scrollTo({ top: Math.max(top, 0), behavior: 'auto' });
        }, 60);
      }
    }
  });
})();
