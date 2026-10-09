/* Smart21Brain — game-spot-difference.js
   Two emoji grids look identical but a handful of cells differ. Find every
   difference on the right-hand grid before your mistakes or time run out. */
(function () {
  const LEADERBOARD_KEY = 's21-spot-difference-scores';
  const DURATION = 90;
  const THEMES = [
    ['🐵', '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨'],
    ['🍎', '🍌', '🍇', '🍉', '🍊', '🍓', '🍍', '🥝', '🍑', '🍒'],
    ['📚', '✏️', '🖊️', '📏', '📐', '🎒', '📎', '🖇️', '📌', '✂️'],
    ['⚽', '🏀', '🏈', '🎾', '🏐', '🏓', '🥎', '🏸', '⚾', '🥏'],
    ['🚗', '🚕', '🚙', '🚌', '🚓', '🚑', '🚒', '🚜', '🚲', '✈️'],
  ];
  const LEVELS = { easy: { size: 4, diffs: 4 }, medium: { size: 5, diffs: 5 }, hard: { size: 6, diffs: 6 } };

  let difficulty = 'easy';
  let cfg = LEVELS.easy;
  let leftGrid = [];
  let rightGrid = [];
  let diffCells = new Set();
  let foundCells = new Set();
  let score = 0;
  let lives = 3;
  let timeLeft = DURATION;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function pickTheme() { return THEMES[Math.floor(Math.random() * THEMES.length)]; }

  function newScene() {
    cfg = LEVELS[difficulty];
    const theme = pickTheme();
    const total = cfg.size * cfg.size;
    leftGrid = Array.from({ length: total }, () => theme[Math.floor(Math.random() * theme.length)]);
    rightGrid = leftGrid.slice();
    diffCells = new Set();
    foundCells = new Set();
    const positions = shuffle(Array.from({ length: total }, (_, i) => i));
    for (const pos of positions) {
      if (diffCells.size >= cfg.diffs) break;
      const alt = theme.filter((e) => e !== leftGrid[pos]);
      rightGrid[pos] = alt[Math.floor(Math.random() * alt.length)];
      diffCells.add(pos);
    }
    renderGrids();
  }

  function renderGrids() {
    const left = $('sd-left'); const right = $('sd-right');
    left.style.gridTemplateColumns = `repeat(${cfg.size}, auto)`;
    right.style.gridTemplateColumns = `repeat(${cfg.size}, auto)`;
    left.innerHTML = leftGrid.map((e) => `<div class="sd-cell">${e}</div>`).join('');
    right.innerHTML = rightGrid.map((e, i) => `<button type="button" class="sd-cell" data-i="${i}">${e}</button>`).join('');
    right.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => tryCell(Number(btn.dataset.i))));
    $('sd-found').textContent = foundCells.size;
    $('sd-total').textContent = cfg.diffs;
  }

  function tryCell(i) {
    if (foundCells.has(i)) return;
    const btn = document.querySelector(`.sd-cell[data-i="${i}"]`);
    if (diffCells.has(i)) {
      foundCells.add(i);
      btn.classList.add('is-found');
      btn.disabled = true;
      score += 10;
      $('game-score').textContent = score;
      $('sd-found').textContent = foundCells.size;
      if (foundCells.size === cfg.diffs) setTimeout(newScene, 500);
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
    newScene();
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
    if (!$('sd-left')) return;

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
