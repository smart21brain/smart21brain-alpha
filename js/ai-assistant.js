/* Smart21Brain — AI Learning Assistant (UI shell)
   Opens a chat panel. Wire `sendToAssistant()` to a real backend endpoint —
   never call a model API with a secret key from the browser. */
(function () {
  document.addEventListener('DOMContentLoaded', () => {
    const trigger = document.querySelector('[data-ai-trigger]');
    const panel = document.querySelector('#s21-ai-panel');
    if (!trigger || !panel) return;
    trigger.addEventListener('click', () => panel.classList.toggle('open'));
    panel.querySelector('[data-ai-close]')?.addEventListener('click', () => panel.classList.remove('open'));

    const form = panel.querySelector('form');
    const log = panel.querySelector('.ai-log');
    form?.addEventListener('submit', (e) => {
      e.preventDefault();
      const input = form.querySelector('input');
      if (!input.value.trim()) return;
      const question = input.value.trim();
      appendMessage(log, question, 'user');
      input.value = '';
      appendMessage(log, 'Thinking…', 'ai');
      fetch('/api/ai-assistant', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: question }) })
        .then(async (response) => {
          const data = await response.json().catch(() => ({}));
          if (!response.ok) throw new Error(data.error || 'The assistant is unavailable.');
          log.lastElementChild.textContent = data.answer;
        })
        .catch((error) => { log.lastElementChild.textContent = error.message; });
    });
  });

  function appendMessage(log, text, from) {
    if (!log) return;
    const bubble = document.createElement('div');
    bubble.className = `ai-bubble ai-bubble-${from}`;
    bubble.textContent = text;
    log.appendChild(bubble);
    log.scrollTop = log.scrollHeight;
  }
})();
