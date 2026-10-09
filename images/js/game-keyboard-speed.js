/* Smart21Brain — game-keyboard-speed.js
   A typing speed test: type the shown sentence as fast and accurately as
   you can. Reports words-per-minute (WPM) and accuracy when you finish or
   time runs out. */
(function () {
  const LEADERBOARD_KEY = 's21-keyboard-speed-scores';
  const DURATION = 60;

  const SENTENCES = {
    easy: [
      'The cat sat on the mat.',
      'I like to read books.',
      'The sun is very bright today.',
      'She has a red bag.',
      'We play in the park.',
      'My dog can run fast.',
    ],
    medium: [
      'Smart21Brain helps students learn new things every day.',
      'Practice makes progress, even when it feels difficult at first.',
      'The library was quiet except for the sound of turning pages.',
      'Typing quickly is a skill that improves the more you practise.',
      'Our teacher asked us to finish the assignment before Friday.',
      'Tanzania is home to Mount Kilimanjaro, the tallest peak in Africa.',
    ],
    hard: [
      'Consistent practice and careful attention to accuracy will improve your typing speed over time.',
      'The rapid growth of technology has changed the way students learn and collaborate around the world.',
      'A balanced diet, regular exercise, and enough sleep all contribute to staying healthy and focused.',
      'Scientists continue to study the deep ocean, discovering species that live in extreme conditions.',
      'Effective communication requires both careful listening and clear, thoughtful responses.',
      'The history of mathematics stretches back thousands of years, across many different civilisations.',
    ],
  };

  let difficulty = 'easy';
  let target = '';
  let startedTyping = false;
  let startTime = 0;
  let timeLeft = DURATION;
  let timerId = null;
  let bestWpm = 0;
  let totalChars = 0;
  let correctChars = 0;
  let sentencesDone = 0;

  function $(id) { return document.getElementById(id); }

  function pickSentence() {
    const pool = SENTENCES[difficulty];
    target = pool[Math.floor(Math.random() * pool.length)];
  }

  function renderTarget(typed) {
    const el = $('kb-target');
    el.innerHTML = target.split('').map((ch, i) => {
      let cls = '';
      if (i < typed.length) cls = typed[i] === ch ? 'is-correct' : 'is-wrong';
      else if (i === typed.length) cls = 'is-current';
      return `<span class="${cls}">${ch === ' ' ? '&nbsp;' : ch}</span>`;
    }).join('');
  }

  function handleInput() {
    const input = $('kb-input');
    const typed = input.value;
    if (!startedTyping && typed.length > 0) { startedTyping = true; }
    renderTarget(typed);

    if (typed === target) {
      let correctInSentence = 0;
      for (let i = 0; i < target.length; i++) if (typed[i] === target[i]) correctInSentence++;
      correctChars += correctInSentence;
      totalChars += target.length;
      sentencesDone += 1;
      $('kb-sentences').textContent = sentencesDone;
      input.value = '';
      pickSentence();
      renderTarget('');
      updateWpm();
    }
  }

  function updateWpm() {
    if (!startTime) return;
    const elapsedMin = Math.max(0.02, (Date.now() - startTime) / 60000);
    const wpm = Math.round((correctChars / 5) / elapsedMin);
    bestWpm = wpm;
    $('kb-wpm').textContent = wpm;
    const accuracy = totalChars > 0 ? Math.round((correctChars / totalChars) * 100) : 100;
    $('kb-accuracy').textContent = `${accuracy}%`;
  }

  function tick() {
    timeLeft -= 1;
    $('game-timer').textContent = timeLeft;
    if (startedTyping) updateWpm();
    if (timeLeft <= 0) endGame();
  }

  function startGame() {
    difficulty = document.querySelector('.difficulty-btn.is-active')?.dataset.diff || 'easy';
    startedTyping = false; startTime = 0; timeLeft = DURATION;
    totalChars = 0; correctChars = 0; sentencesDone = 0; bestWpm = 0;
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('game-timer').textContent = timeLeft;
    $('kb-wpm').textContent = 0;
    $('kb-accuracy').textContent = '100%';
    $('kb-sentences').textContent = 0;
    pickSentence();
    renderTarget('');
    $('kb-input').value = '';
    $('kb-input').disabled = false;
    $('kb-input').focus();
    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('kb-input').disabled = true;
    updateWpm();
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-wpm').textContent = bestWpm;
    $('final-accuracy').textContent = totalChars > 0 ? `${Math.round((correctChars / totalChars) * 100)}%` : '100%';
    $('final-sentences').textContent = sentencesDone;
    window.__s21KeyboardScore = bestWpm;
    renderLeaderboard();
  }

  function getLeaderboard() { try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; } }
  function saveScore(name, s) {
    const board = getLeaderboard();
    board.push({ name, score: s, date: new Date().toISOString() });
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 8)));
  }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function renderLeaderboard() {
    const el = $('game-leaderboard');
    if (!el) return;
    const board = getLeaderboard();
    if (!board.length) { el.innerHTML = `<p class="text-soft" style="font-size:.85rem">No scores yet — be the first!</p>`; return; }
    el.innerHTML = board.map((entry, i) => `
      <div class="d-flex align-items-center justify-content-between py-2 ${i < board.length - 1 ? 'border-bottom' : ''}">
        <span><strong>#${i + 1}</strong> ${escapeHtml(entry.name)}</span>
        <span class="badge-pill">${entry.score} WPM</span>
      </div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('kb-target')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('kb-input')?.addEventListener('input', handleInput);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      const score = window.__s21KeyboardScore || 0;
      saveScore(name, score);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, score, { name, difficulty });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.('Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
