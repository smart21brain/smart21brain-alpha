/* Smart21Brain — games-hero.js
   Powers the Games hub hero: a mouse-scrubbed mascot sprite flipbook,
   a typewriter line, and a delayed fade-in for the action pills.

   The mascot is a 5x5 sprite sheet (25 frames) rather than a video:
   background-video seeking — especially on an alpha/transparent
   WebM — is unreliable across browsers (Safari has no VP9-alpha
   support at all, and even Chromium can fail to honour currentTime
   seeks on alpha video). Swapping background-position on a plain
   PNG sprite has none of those failure modes and needs no
   "is it ready yet" handshake at all. */
(function () {
  const hero = document.getElementById('gamesHero');
  if (!hero) return;

  /* ---------- Mouse-scrub sprite, eased with requestAnimationFrame ---------- */
  const sprite = document.getElementById('gamesHeroSprite');
  const figure = document.querySelector('.s21hero-video__figure');
  if (sprite && figure) {
    const COLS = 5;
    const ROWS = 5;
    const TOTAL = COLS * ROWS;
    const SENSITIVITY = 0.8;
    const EASE = 0.14;

    let prevX = null;
    let targetFrame = 0;
    let renderedFrame = 0;
    let lastDrawn = -1;

    const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

    const draw = (idx) => {
      if (idx === lastDrawn) return;
      lastDrawn = idx;
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = COLS > 1 ? (col / (COLS - 1)) * 100 : 0;
      const y = ROWS > 1 ? (row / (ROWS - 1)) * 100 : 0;
      sprite.style.backgroundPosition = x + '% ' + y + '%';
    };

    const loop = () => {
      renderedFrame += (targetFrame - renderedFrame) * EASE;
      if (Math.abs(targetFrame - renderedFrame) < 0.02) renderedFrame = targetFrame;
      draw(Math.round(clamp(renderedFrame, 0, TOTAL - 1)));
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);

    const scrub = (clientX) => {
      if (prevX === null) { prevX = clientX; return; }
      const delta = clientX - prevX;
      prevX = clientX;
      const offset = (delta / window.innerWidth) * SENSITIVITY * (TOTAL - 1);
      targetFrame = clamp(targetFrame + offset, 0, TOTAL - 1);
    };

    figure.addEventListener('mousemove', (e) => scrub(e.clientX));
    figure.addEventListener('mouseleave', () => { prevX = null; });
    figure.addEventListener('touchstart', (e) => {
      if (e.touches[0]) prevX = e.touches[0].clientX;
    }, { passive: true });
    figure.addEventListener('touchmove', (e) => {
      if (e.touches[0]) scrub(e.touches[0].clientX);
    }, { passive: true });
  }

  /* ---------- Typewriter ---------- */
  const typeTarget = document.getElementById('gamesHeroTypeText');
  const cursor = document.getElementById('gamesHeroCursor');
  if (typeTarget) {
    const text = typeTarget.getAttribute('data-text') || '';
    const speed = 38;
    const startDelay = 600;
    let i = 0;

    setTimeout(() => {
      const tick = () => {
        i += 1;
        typeTarget.textContent = text.slice(0, i);
        if (i < text.length) {
          setTimeout(tick, speed);
        } else if (cursor) {
          cursor.classList.add('is-done');
        }
      };
      tick();
    }, startDelay);
  }

  /* ---------- Pills fade-in (independent of typewriter) ---------- */
  const pills = document.getElementById('gamesHeroPills');
  if (pills) {
    setTimeout(() => pills.classList.add('is-visible'), 400);
  }

  /* ---------- Copy email ---------- */
  const copyBtn = document.getElementById('gamesHeroCopyEmail');
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const email = copyBtn.getAttribute('data-email') || '';
      const done = () => {
        if (window.S21_toast) window.S21_toast('Email copied!', { type: 'success', icon: 'fa-copy' });
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(done).catch(done);
      } else {
        done();
      }
    });
  }
})();
