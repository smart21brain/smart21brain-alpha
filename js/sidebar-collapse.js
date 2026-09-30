/* Smart21Brain — dashboard sidebar collapse/expand toggle.
   Used by admin.html, dashboard.html, teachers.html and parents.html.
   Click the [data-sidebar-toggle] button to switch the .admin-sidebar
   between its full width (icons + labels) and a narrow icon-only rail
   (labels fade out via opacity/pointer-events, width eases via CSS
   transition) — the same expand/collapse effect as the reference
   sidebar. The toggle button's own icon flips between "collapse"
   (angles pointing left) and "expand" (angles pointing right) so it's
   obvious which way a click will go, instead of a static bars icon
   that never changes. State is remembered across dashboard pages via
   localStorage. */
(function () {
  const STORAGE_KEY = 's21_admin_sidebar_collapsed';

  document.addEventListener('DOMContentLoaded', () => {
    const sidebars = Array.from(document.querySelectorAll('.admin-sidebar'));
    if (!sidebars.length) return;

    let collapsed = false;
    try { collapsed = localStorage.getItem(STORAGE_KEY) === '1'; } catch (e) { /* ignore */ }

    const apply = (isCollapsed) => {
      sidebars.forEach((sidebar) => {
        sidebar.classList.toggle('is-collapsed', isCollapsed);
        const btn = sidebar.querySelector('[data-sidebar-toggle]');
        if (btn) {
          btn.setAttribute('aria-expanded', String(!isCollapsed));
          const icon = btn.querySelector('i');
          if (icon) {
            icon.className = isCollapsed ? 'fa-solid fa-angles-right' : 'fa-solid fa-angles-left';
          }
        }
      });
    };

    apply(collapsed);

    document.querySelectorAll('[data-sidebar-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => {
        collapsed = !collapsed;
        apply(collapsed);
        try { localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0'); } catch (e) { /* ignore */ }
      });
    });
  });
})();
