/* Smart21Brain — Voice Search
   Uses the browser SpeechRecognition API where supported. */
(function () {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('[data-voice-search]').forEach((btn) => {
      if (!SpeechRecognition) { btn.style.display = 'none'; return; }
      btn.addEventListener('click', () => {
        const wrap = btn.closest('.s21-search-wrap');
        const input = wrap?.querySelector('input');
        if (!input) return;
        const recognition = new SpeechRecognition();
        recognition.lang = document.documentElement.lang === 'sw' ? 'sw-TZ' : 'en-US';
        recognition.interimResults = false;
        btn.classList.add('listening');
        recognition.start();
        recognition.onresult = (event) => {
          input.value = event.results[0][0].transcript;
          input.dispatchEvent(new Event('input'));
        };
        recognition.onend = () => btn.classList.remove('listening');
        recognition.onerror = () => btn.classList.remove('listening');
      });
    });
  });
})();
