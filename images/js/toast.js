/* Smart21Brain — toast.js
   A small, dependency-free toast notification helper used across the
   site for quick, non-blocking feedback (favourites, saved settings,
   redirect confirmations, etc.) — separate from the longer-form inline
   confirmations already used for things like game leaderboard saves.

   Usage: window.S21_toast('Saved!', { type: 'success', icon: 'fa-check' })
   type: 'success' (default) | 'info' | 'error'
   Respects prefers-reduced-motion automatically via the CSS animations. */
(function () {
  let stack = null;

  function ensureStack() {
    if (stack) return stack;
    stack = document.createElement('div');
    stack.className = 's21-toast-stack';
    stack.setAttribute('aria-live', 'polite');
    stack.setAttribute('aria-atomic', 'true');
    document.body.appendChild(stack);
    return stack;
  }

  const ICONS = { success: 'fa-check', info: 'fa-circle-info', error: 'fa-triangle-exclamation' };

  window.S21_toast = function (message, opts) {
    opts = opts || {};
    const type = opts.type || 'success';
    const icon = opts.icon || ICONS[type] || ICONS.success;
    const duration = opts.duration || 3200;

    const el = document.createElement('div');
    el.className = `s21-toast is-${type}`;
    el.innerHTML = `<span class="s21-toast-icon"><i class="fa-solid ${icon}"></i></span><span>${message}</span>`;

    ensureStack().appendChild(el);

    const remove = () => {
      el.classList.add('is-leaving');
      setTimeout(() => el.remove(), 320);
    };
    const timer = setTimeout(remove, duration);
    el.addEventListener('click', () => { clearTimeout(timer); remove(); });

    return el;
  };
})();
