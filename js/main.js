/* Smart21Brain — Main JS
   Global behaviours shared across every page. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {

    const pagePath = (new URL(window.location.href).pathname || '/').replace(/\/+$/, '') || '/';
    const roleProtectedPages = {
      '/dashboard.html': ['user', 'admin', 'teacher', 'parent'],
      '/dashboard': ['user', 'admin', 'teacher', 'parent'],
      '/admin.html': ['admin'],
      '/admin': ['admin'],
      '/teachers.html': ['teacher', 'admin'],
      '/teachers': ['teacher', 'admin'],
      '/parents.html': ['parent', 'admin'],
      '/parents': ['parent', 'admin'],
      '/profile.html': ['user', 'admin', 'teacher', 'parent'],
      '/profile': ['user', 'admin', 'teacher', 'parent'],
    };

    function applyRoleVisibility(user) {
      const allowedRoles = new Set(user ? [String(user.role || '').toLowerCase()] : []);
      if (user && user.role === 'admin') {
        allowedRoles.add('teacher');
        allowedRoles.add('parent');
        allowedRoles.add('user');
      }

      document.querySelectorAll('[data-role-access]').forEach((el) => {
        const roles = (el.getAttribute('data-role-access') || '').split(',').map((r) => r.trim().toLowerCase()).filter(Boolean);
        const show = !!user && roles.some((role) => allowedRoles.has(role));
        el.style.display = show ? '' : 'none';
      });

      document.querySelectorAll('[data-role]').forEach((el) => {
        const role = (el.getAttribute('data-role') || '').trim().toLowerCase();
        if (!role) return;
        const show = !!user && (role === 'admin' ? user.role === 'admin' : role === user.role || (user.role === 'admin' && ['teacher', 'parent', 'user'].includes(role)));
        if (!show) el.style.display = 'none';
      });
    }

    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        const user = data && data.user ? data.user : null;

        if (pagePath === '/login' || pagePath === '/login.html') {
          if (user) {
            window.S21_toast?.('You are already signed in. Redirecting to your dashboard…');
            setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
          }
          return;
        }

        applyRoleVisibility(user);

        const allowedRoles = roleProtectedPages[pagePath];
        if (!allowedRoles) return;
        if (!user) {
          window.S21_toast?.('Please log in to access this page.');
          setTimeout(() => { window.location.href = 'login.html'; }, 600);
          return;
        }
        if (!allowedRoles.includes(user.role)) {
          window.S21_toast?.('You do not have access to this page.');
          setTimeout(() => { window.location.href = 'dashboard.html'; }, 600);
        }
      })
      .catch(() => {
        applyRoleVisibility(null);
        if (pagePath !== '/login' && pagePath !== '/login.html') {
          window.location.href = 'login.html';
        }
      });

    /* AOS animations */
    if (window.AOS) {
      AOS.init({ duration: 650, once: true, offset: 60, easing: 'ease-out-cubic' });
    }

    /* Ask guests before starting a game so signed-in players keep a direct path. */
    const gameStartButton = document.getElementById('game-start-btn');
    if (gameStartButton) {
      let gameStartConfirmed = false;
      const gameAccessModal = document.createElement('div');
      gameAccessModal.className = 'game-access-modal';
      gameAccessModal.setAttribute('aria-hidden', 'true');
      gameAccessModal.innerHTML = `
        <div class="game-access-dialog" role="dialog" aria-modal="true" aria-labelledby="game-access-title">
          <button type="button" class="game-access-close" aria-label="Close">&times;</button>
          <div class="game-access-icon"><i class="fa-solid fa-gamepad"></i></div>
          <h2 id="game-access-title">Ready to play?</h2>
          <p>Continue as a guest to start playing, or log in to save scores and unlock more features.</p>
          <div class="game-access-actions">
            <button type="button" class="btn-s21 btn-s21-secondary" data-game-guest>Continue as Guest</button>
            <a class="btn-s21 btn-s21-primary" href="login.html">Log In</a>
          </div>
        </div>`;
      document.body.appendChild(gameAccessModal);

      const closeGameAccessModal = () => {
        gameAccessModal.classList.remove('is-open');
        gameAccessModal.setAttribute('aria-hidden', 'true');
      };
      gameAccessModal.querySelector('.game-access-close').addEventListener('click', closeGameAccessModal);
      gameAccessModal.addEventListener('click', (event) => {
        if (event.target === gameAccessModal) closeGameAccessModal();
      });
      gameAccessModal.querySelector('[data-game-guest]').addEventListener('click', () => {
        closeGameAccessModal();
        gameStartConfirmed = true;
        gameStartButton.click();
      });

      gameStartButton.addEventListener('click', async (event) => {
        if (gameStartConfirmed) {
          gameStartConfirmed = false;
          return;
        }
        event.preventDefault();
        event.stopImmediatePropagation();
        try {
          const response = await fetch('/api/auth/me', { credentials: 'include' });
          const data = await response.json().catch(() => ({}));
          if (data?.user) {
            gameStartConfirmed = true;
            gameStartButton.click();
            return;
          }
        } catch (error) {
          // A failed session check should still allow guest play.
        }
        gameAccessModal.classList.add('is-open');
        gameAccessModal.setAttribute('aria-hidden', 'false');
        gameAccessModal.querySelector('[data-game-guest]').focus();
      }, true);
    }

    /* Fixed navbar: keep it pinned to the top and never hide it on
       scroll. We just measure its real height so the page content
       below gets pushed down by exactly that much (no gap, no overlap),
       and re-measure whenever the layout might change size. */
    const navbar = document.querySelector('.s21-navbar');
    const backToTop = document.querySelector('.fab.top');
    const syncNavbarHeight = () => {
      if (!navbar) return;
      document.documentElement.style.setProperty('--s21-navbar-h', `${navbar.offsetHeight}px`);
    };
    if (navbar) {
      syncNavbarHeight();
      window.addEventListener('resize', syncNavbarHeight);
      window.addEventListener('load', syncNavbarHeight);
      if (window.ResizeObserver) new ResizeObserver(syncNavbarHeight).observe(navbar);
    }
    const updateScrollActions = () => {
      const y = window.scrollY;
      if (navbar) navbar.style.boxShadow = y > 12 ? '0 6px 20px rgba(0,0,0,.08)' : 'none';
      if (backToTop) backToTop.classList.toggle('show', y > 200);
    };
    window.addEventListener('scroll', updateScrollActions, { passive: true });
    updateScrollActions();

    backToTop?.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));

    /* Animated counters (data-count="1200") */
    const counters = document.querySelectorAll('[data-count]');
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.count, 10);
        const duration = 1200;
        const start = performance.now();
        function tick(now) {
          const progress = Math.min((now - start) / duration, 1);
          el.textContent = Math.floor(progress * target).toLocaleString();
          if (progress < 1) requestAnimationFrame(tick);
          else el.textContent = target.toLocaleString() + (el.dataset.suffix || '');
        }
        requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.4 });
    counters.forEach((c) => counterObserver.observe(c));

    /* Favorites (heart buttons) — persisted to localStorage */
    const FAV_KEY = 's21-favorites';
    const getFavs = () => { try { return JSON.parse(localStorage.getItem(FAV_KEY)) || []; } catch { return []; } };
    function favToast(added) {
      const key = added ? 'runtime_added_to_favorites_toast' : 'runtime_removed_from_favorites_toast';
      const fallback = added ? 'Added to favourites.' : 'Removed from favourites.';
      window.S21_toast?.(window.S21_t ? window.S21_t(key) : fallback, { icon: added ? 'fa-heart' : 'fa-heart-crack' });
    }
    document.querySelectorAll('[data-fav-id]').forEach((btn) => {
      const id = btn.dataset.favId;
      if (getFavs().includes(id)) btn.classList.add('is-fav');
      btn.addEventListener('click', () => {
        let favs = getFavs();
        let added;
        if (favs.includes(id)) { favs = favs.filter((f) => f !== id); btn.classList.remove('is-fav'); added = false; }
        else { favs.push(id); btn.classList.add('is-fav'); added = true; }
        localStorage.setItem(FAV_KEY, JSON.stringify(favs));
        btn.classList.remove('is-popping');
        void btn.offsetWidth; // restart the pop animation even on rapid re-clicks
        btn.classList.add('is-popping');
        favToast(added);
      });
    });

    /* Scroll-to-reader button (book.html) */
    document.getElementById('reader-scroll-btn')?.addEventListener('click', () => {
      document.getElementById('reader-scroll-target')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    /* Contact form */
    document.getElementById('contact-form')?.addEventListener('submit', function (e) {
      if (!this.checkValidity()) { this.classList.add('was-validated'); return; }
      e.preventDefault();
      const status = document.getElementById('contact-form-status');
      const btn = this.querySelector('button[type="submit"]');
      const original = btn.innerHTML;
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Sending…';
      fetch('/api/contact', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: document.getElementById('contact-name').value,
          email: document.getElementById('contact-email').value,
          phone: document.getElementById('contact-phone').value,
          subject: document.getElementById('contact-subject').value,
          message: document.getElementById('contact-message').value,
        }),
      }).then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result.error || 'Could not send your message.');
        status.textContent = 'Thanks. Your message has been sent.';
        this.reset();
        this.classList.remove('was-validated');
      }).catch((error) => { status.textContent = error.message; })
        .finally(() => { btn.disabled = false; btn.innerHTML = original; });
    });

    /* Newsletter subscription */
    document.querySelectorAll('.newsletter-form').forEach((form) => {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!form.checkValidity()) { form.classList.add('was-validated'); return; }
        const input = form.querySelector('input[type="email"]');
        const btn = form.querySelector('button[type="submit"]');
        const original = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        try {
          const response = await fetch('/api/newsletter/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: input.value }),
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(result.error || 'Subscription failed.');
          btn.innerHTML = '<i class="fa-solid fa-check"></i>';
          form.reset();
          form.classList.remove('was-validated');
          if (window.S21_toast) window.S21_toast('You are subscribed. Welcome to the Smart21Brain newsletter!');
        } catch (error) {
          btn.innerHTML = original;
          if (window.S21_toast) window.S21_toast(error.message || 'Could not subscribe. Please try again.');
        } finally {
          btn.disabled = false;
          if (btn.innerHTML.includes('fa-check')) {
            setTimeout(() => { btn.innerHTML = original; }, 1800);
          }
        }
      });
    });

  });
})();
