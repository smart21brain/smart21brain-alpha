/* Smart21Brain — Global Search
   Client-side demo of suggestions, history & popular searches.
   Replace SAMPLE_INDEX with a real /api/search endpoint later. */
(function () {
  const SAMPLE_INDEX = [
    { title: 'Introduction to Fractions', type: 'Video', href: 'video.html' },
    { title: 'Photosynthesis Explained', type: 'Video', href: 'video.html' },
    { title: 'Coding for Kids: Scratch Basics', type: 'Course', href: 'courses.html' },
    { title: 'The Solar System Storybook', type: 'Book', href: 'book.html' },
    { title: 'Multiplication Race', type: 'Game', href: 'game.html' },
    { title: 'Kiswahili Alphabet Songs', type: 'Kids Video', href: 'kids.html' },
    { title: 'Human Body Quiz', type: 'Quiz', href: 'quiz.html' },
    { title: 'Ms. Amina Hassan — Mathematics', type: 'Teacher', href: 'teachers.html' },
  ];
  const POPULAR = ['fractions', 'solar system', 'coding for kids', 'multiplication', 'kiswahili songs'];
  const HISTORY_KEY = 's21-search-history';

  function getHistory() {
    try { return JSON.parse(localStorage.getItem(HISTORY_KEY)) || []; } catch { return []; }
  }
  function pushHistory(term) {
    const list = getHistory().filter((t) => t.toLowerCase() !== term.toLowerCase());
    list.unshift(term);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(list.slice(0, 6)));
  }

  function renderSuggestions(panel, query) {
    const q = query.trim().toLowerCase();
    let html = '';

    if (q.length > 0) {
      const matches = SAMPLE_INDEX.filter((i) => i.title.toLowerCase().includes(q)).slice(0, 6);
      html += '<div class="s21-search-group"><span>Suggestions</span>';
      html += matches.length
        ? matches.map((m) => `<a href="${m.href}" class="s21-search-item"><i class="fa-regular fa-circle-dot"></i> ${m.title} <em>${m.type}</em></a>`).join('')
        : '<p class="s21-search-empty">No matches yet — try another word.</p>';
      html += '</div>';
    } else {
      const hist = getHistory();
      if (hist.length) {
        html += '<div class="s21-search-group"><span>Recent searches</span>';
        html += hist.map((h) => `<button type="button" class="s21-search-item s21-search-history-item">${h}</button>`).join('');
        html += '</div>';
      }
      html += '<div class="s21-search-group"><span>Popular right now</span>';
      html += POPULAR.map((p) => `<button type="button" class="s21-search-item s21-search-history-item">${p}</button>`).join('');
      html += '</div>';
    }
    panel.innerHTML = html;
    panel.querySelectorAll('.s21-search-history-item').forEach((btn) => {
      btn.addEventListener('click', () => {
        const input = panel.closest('.s21-search-wrap').querySelector('input');
        input.value = btn.textContent;
        renderSuggestions(panel, btn.textContent);
        input.focus();
      });
    });
  }

  async function getMatches(query) {
    try {
      const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error('Search failed');
      return (await response.json()).results || [];
    } catch (error) {
      return SAMPLE_INDEX.filter((item) => item.title.toLowerCase().includes(query.toLowerCase())).slice(0, 6);
    }
  }

  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.s21-search-wrap').forEach((wrap) => {
      const input = wrap.querySelector('input');
      const panel = wrap.querySelector('.s21-search-panel');
      const form = wrap.querySelector('form');
      if (!input || !panel) return;

      input.addEventListener('focus', () => { panel.classList.add('open'); renderSuggestions(panel, input.value); });
      let searchTimer;
      input.addEventListener('input', () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(async () => {
          const query = input.value.trim();
          if (!query) { renderSuggestions(panel, ''); return; }
          const matches = await getMatches(query);
          panel.innerHTML = `<div class="s21-search-group"><span>Suggestions</span>${matches.length ? matches.map((m) => `<a href="${m.href}" class="s21-search-item"><i class="fa-regular fa-circle-dot"></i> ${m.title} <em>${m.type}</em></a>`).join('') : '<p class="s21-search-empty">No matches yet — try another word.</p>'}</div>`;
        }, 180);
      });
      document.addEventListener('click', (e) => { if (!wrap.contains(e.target)) panel.classList.remove('open'); });
      form?.addEventListener('submit', (e) => {
        e.preventDefault();
        if (input.value.trim()) pushHistory(input.value.trim());
        panel.classList.remove('open');
      });
    });
  });
})();
