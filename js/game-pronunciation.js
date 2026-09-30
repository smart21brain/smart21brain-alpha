/* Smart21Brain — game-pronunciation.js
   The browser speaks a word aloud using the built-in Web Speech API
   (speechSynthesis) — no network or microphone needed. Listen, then pick
   the correctly spelled word from the options. */
(function () {
  const LEADERBOARD_KEY = 's21-pronunciation-scores';
  const DURATION = 60;

  const WORDS = {
    easy: ['cat', 'dog', 'sun', 'book', 'tree', 'fish', 'milk', 'star', 'ball', 'moon'],
    medium: ['elephant', 'umbrella', 'mountain', 'kitchen', 'science', 'library', 'weather', 'holiday', 'bicycle', 'journey'],
    hard: ['pronunciation', 'necessary', 'mischievous', 'refrigerator', 'temperature', 'vocabulary', 'rhythm', 'February', 'restaurant', 'psychology'],
  };

  let difficulty = 'easy';
  let pool = [];
  let current = '';
  let score = 0;
  let lives = 3;
  let timeLeft = DURATION;
  let timerId = null;
  let speechAvailable = 'speechSynthesis' in window;

  function $(id) { return document.getElementById(id); }
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function speak(word) {
    if (!speechAvailable) return;
    try {
      window.speechSynthesis.cancel();
      const utter = new SpeechSynthesisUtterance(word);
      utter.rate = 0.85;
      utter.lang = 'en-US';
      window.speechSynthesis.speak(utter);
    } catch { /* speech not available — the word is still shown as text on repeat */ }
  }

  function makeDistractor(word) {
    // Swap two adjacent letters, or change one letter, to create a plausible wrong spelling.
    const chars = word.split('');
    if (chars.length > 3 && Math.random() < 0.5) {
      const i = 1 + Math.floor(Math.random() * (chars.length - 2));
      [chars[i], chars[i + 1]] = [chars[i + 1], chars[i]];
    } else {
      const i = Math.floor(Math.random() * chars.length);
      const letters = 'abcdefghijklmnopqrstuvwxyz';
      let repl;
      do { repl = letters[Math.floor(Math.random() * letters.length)]; } while (repl === chars[i]);
      chars[i] = repl;
    }
    return chars.join('');
  }

  function refillPool() { pool = shuffle(WORDS[difficulty]); }

  function nextWord() {
    if (!pool.length) refillPool();
    current = pool.pop();
    const wrongs = new Set();
    while (wrongs.size < 3) { const d = makeDistractor(current); if (d !== current) wrongs.add(d); }
    const choices = shuffle([current, ...wrongs]);
    $('game-choices').innerHTML = choices.map((c, i) => `<button type="button" class="quiz-choice-btn" data-idx="${i}">${c}</button>`).join('');
    document.querySelectorAll('#game-choices .quiz-choice-btn').forEach((btn) => btn.addEventListener('click', () => handleAnswer(btn, choices[Number(btn.dataset.idx)])));
    $('pron-replay-btn').disabled = !speechAvailable;
    speak(current);
  }

  function handleAnswer(btn, chosen) {
    const buttons = document.querySelectorAll('#game-choices .quiz-choice-btn');
    buttons.forEach((b) => { b.disabled = true; });
    const feedback = $('game-feedback');
    if (chosen === current) {
      score += 10;
      $('game-score').textContent = score;
      feedback.textContent = 'Correct! ✓';
      feedback.style.color = '#0B6E4F';
    } else {
      lives -= 1;
      renderHearts();
      feedback.textContent = `The word was "${current}".`;
      feedback.style.color = 'var(--s21-accent)';
    }
    setTimeout(() => {
      feedback.textContent = '';
      if (lives <= 0) { endGame(); return; }
      nextWord();
    }, 1000);
  }

  function renderHearts() {
    $('game-lives').innerHTML = Array.from({ length: 3 }).map((_, i) =>
      `<i class="fa-solid fa-heart" style="color:${i < lives ? 'var(--s21-accent)' : '#E3E6EA'};margin-right:.2rem"></i>`
    ).join('');
  }

  function tick() {
    timeLeft -= 1;
    $('game-timer').textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }

  function startGame() {
    difficulty = document.querySelector('.difficulty-btn.is-active')?.dataset.diff || 'easy';
    score = 0; lives = 3; timeLeft = DURATION;
    refillPool();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('game-score').textContent = score;
    $('game-timer').textContent = timeLeft;
    renderHearts();
    if (!speechAvailable) $('pron-no-speech').classList.remove('d-none');
    nextWord();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    window.speechSynthesis?.cancel();
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = score;
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
        <span class="badge-pill">${entry.score} pts</span>
      </div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('pron-replay-btn')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('pron-replay-btn').addEventListener('click', () => speak(current));

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
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
