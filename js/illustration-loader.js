/* Smart21Brain — AI Illustration Loader
   Looks for every [data-illustration] element, tries to load the matching
   file from images/illustrations/<name>.png, and fades it in if found.
   If the file doesn't exist yet (the 20-piece set hasn't been generated
   and dropped in yet — see images/illustrations/README.md), the element
   just keeps showing its on-brand gradient placeholder. No errors, no
   broken-image icons, and nothing to update in the HTML later — drop the
   PNG in and refresh. */
(function () {
  function loadOne(el) {
    var name = el.getAttribute('data-illustration');
    if (!name) return;
    var src = 'images/illustrations/' + name + '.png';
    var probe = new Image();
    probe.onload = function () {
      var img = document.createElement('img');
      img.src = src;
      img.alt = el.getAttribute('data-illustration-alt') || '';
      img.loading = 'lazy';
      el.appendChild(img);
      // Force reflow so the opacity transition actually plays.
      void img.offsetWidth;
      el.classList.add('loaded');
    };
    probe.onerror = function () { /* keep placeholder — file not generated yet */ };
    probe.src = src;
  }

  function init() {
    document.querySelectorAll('[data-illustration]').forEach(loadOne);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
