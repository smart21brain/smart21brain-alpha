/* Smart21Brain — game-factor-finder.js
   A target number appears along with a grid of numbers — tap every number
   that is a factor of the target before your mistakes or time run out. */
(function () {
  const LEADERBOARD_KEY = 's21-factor-finder-scores';
  const DURATION = 75;
  const LEVELS = {
    easy: { min: 12, max: 40, gridMax: 20, size: 4 },
    medium: { min: 24, max: 80, gridMax: 40, size: 5 },
    hard: { min: 48, max: 150, gridMax: 60, size: 6 },
  };

  let difficulty = 'easy';
  let cfg = LEVELS.easy;
  let target = 0;
  let grid = [];
  let factorCells = new Set();
  let foundCells = new Set();
  let score = 0;
  let lives = 3;
  let timeLeft = DURATION;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function factorsOf(n) {
    const fs = [];
    for (let i = 1; i <= n; i++) if (n % i === 0) fs.push(i);
    return fs;
  }

  function newRound() {
    cfg = LEVELS[difficulty];
    target = randInt(cfg.min, cfg.max);
    const factors = factorsOf(target).filter((f) => f <= cfg.gridMax);
    const total = cfg.size * cfg.size;
    const nonFactors = [];
    while (nonFactors.length < total - factors.length) {
      const n = randInt(1, cfg.gridMax);
      if (target % n !== 0) nonFactors.push(n);
    }
    const cells = shuffleArr([...factors, ...nonFactors]).slice(0, total);
    grid = cells;
    factorCells = new Set(grid.map((n, i) => (target % n === 0 ? i : -1)).filter((i) => i !== -1));
    foundCells = new Set();
    $('ff-target').textContent = target;
    renderGrid();
  }

  function shuffleArr(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function renderGrid() {
    const el = $('ff-grid');
    el.style.gridTemplateColumns = `repeat(${cfg.size}, auto)`;
    el.innerHTML = grid.map((n, i) => `<button type="button" class="prime-cell" data-i="${i}">${n}</button>`).join('');
    el.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => tryCell(Number(btn.dataset.i))));
    $('ff-found').textContent = foundCells.size;
    $('ff-total').textContent = factorCells.size;
  }

  function tryCell(i) {
    if (foundCells.has(i)) return;
    const btn = document.querySelector(`.prime-cell[data-i="${i}"]`);
    if (factorCells.has(i)) {
      foundCells.add(i);
      btn.classList.add('is-found');
      btn.disabled = true;
      score += 10;
      $('game-score').textContent = score;
      $('ff-found').textContent = foundCells.size;
      if (foundCells.size === factorCells.size) setTimeout(newRound, 500);
    } else {
      lives -= 1;
      btn.classList.add('is-wrong');
      setTimeout(() => btn.classList.remove('is-wrong'), 350);
      renderHearts();
      if (lives <= 0) endGame();
    }
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
    $('game-score').textContent = score;
    $('game-timer').textContent = timeLeft;
    renderHearts();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    newRound();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
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
    if (!$('ff-grid')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

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
