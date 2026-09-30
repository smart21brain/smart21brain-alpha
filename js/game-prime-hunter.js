/* Smart21Brain — game-prime-hunter.js
   A grid of numbers appears — tap every prime number before your mistakes
   or time run out. A fresh grid loads each time you clear one. */
(function () {
  const LEADERBOARD_KEY = 's21-prime-hunter-scores';
  const DURATION = 75;
  const LEVELS = {
    easy: { max: 50, size: 4 },
    medium: { max: 150, size: 5 },
    hard: { max: 400, size: 6 },
  };

  let difficulty = 'easy';
  let cfg = LEVELS.easy;
  let grid = [];
  let primeCells = new Set();
  let foundCells = new Set();
  let score = 0;
  let lives = 3;
  let timeLeft = DURATION;
  let timerId = null;

  function $(id) { return document.getElementById(id); }

  function isPrime(n) {
    if (n < 2) return false;
    if (n % 2 === 0) return n === 2;
    for (let i = 3; i * i <= n; i += 2) if (n % i === 0) return false;
    return true;
  }

  function newGrid() {
    cfg = LEVELS[difficulty];
    const total = cfg.size * cfg.size;
    grid = Array.from({ length: total }, () => Math.floor(Math.random() * cfg.max) + 1);
    primeCells = new Set(grid.map((n, i) => (isPrime(n) ? i : -1)).filter((i) => i !== -1));
    // Guarantee at least 2 primes in the grid so the round is always winnable.
    while (primeCells.size < 2) {
      const i = Math.floor(Math.random() * total);
      const n = [2, 3, 5, 7, 11, 13][Math.floor(Math.random() * 6)];
      grid[i] = n;
      primeCells.add(i);
    }
    foundCells = new Set();
    renderGrid();
  }

  function renderGrid() {
    const el = $('prime-grid');
    el.style.gridTemplateColumns = `repeat(${cfg.size}, auto)`;
    el.innerHTML = grid.map((n, i) => `<button type="button" class="prime-cell" data-i="${i}">${n}</button>`).join('');
    el.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => tryCell(Number(btn.dataset.i))));
    $('prime-found').textContent = foundCells.size;
    $('prime-total').textContent = primeCells.size;
  }

  function tryCell(i) {
    if (foundCells.has(i)) return;
    const btn = document.querySelector(`.prime-cell[data-i="${i}"]`);
    if (primeCells.has(i)) {
      foundCells.add(i);
      btn.classList.add('is-found');
      btn.disabled = true;
      score += 10;
      $('game-score').textContent = score;
      $('prime-found').textContent = foundCells.size;
      if (foundCells.size === primeCells.size) setTimeout(newGrid, 450);
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
    newGrid();
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
    if (!$('prime-grid')) return;

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
