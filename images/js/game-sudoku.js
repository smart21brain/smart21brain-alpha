/* Smart21Brain — game-sudoku.js
   A generic Sudoku engine: 4x4 (2x2 boxes) on Easy, 6x6 (3x2 boxes) on
   Medium, 9x9 (3x3 boxes) on Hard. Generates a full solution by
   backtracking, then removes cells to make the puzzle. */
(function () {
  const LEADERBOARD_KEY = 's21-sudoku-scores';
  const LEVELS = {
    easy: { size: 4, boxW: 2, boxH: 2, givens: 10, label: 'Easy · 4×4' },
    medium: { size: 6, boxW: 3, boxH: 2, givens: 20, label: 'Medium · 6×6' },
    hard: { size: 9, boxW: 3, boxH: 3, givens: 32, label: 'Hard · 9×9' },
  };
  let difficulty = 'easy';
  let cfg = LEVELS.easy;
  let solution = [];
  let puzzle = [];
  let fixed = [];
  let selected = null;
  let hintsLeft = 3;
  let mistakes = 0;
  let startTime = 0;
  let timerId = null;
  let solved = false;

  function $(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
  function shuffle(arr) { for (let i = arr.length - 1; i > 0; i--) { const j = randInt(0, i);[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function emptyGrid(n) { return Array.from({ length: n }, () => Array(n).fill(0)); }

  function canPlace(grid, r, c, v, size, boxW, boxH) {
    for (let i = 0; i < size; i++) { if (grid[r][i] === v || grid[i][c] === v) return false; }
    const br = Math.floor(r / boxH) * boxH, bc = Math.floor(c / boxW) * boxW;
    for (let i = br; i < br + boxH; i++) for (let j = bc; j < bc + boxW; j++) if (grid[i][j] === v) return false;
    return true;
  }

  function fillGrid(grid, size, boxW, boxH, pos) {
    if (pos === size * size) return true;
    const r = Math.floor(pos / size), c = pos % size;
    const nums = shuffle(Array.from({ length: size }, (_, i) => i + 1));
    for (const v of nums) {
      if (canPlace(grid, r, c, v, size, boxW, boxH)) {
        grid[r][c] = v;
        if (fillGrid(grid, size, boxW, boxH, pos + 1)) return true;
        grid[r][c] = 0;
      }
    }
    return false;
  }

  function generate() {
    cfg = LEVELS[difficulty];
    const { size, boxW, boxH, givens } = cfg;
    const grid = emptyGrid(size);
    fillGrid(grid, size, boxW, boxH, 0);
    solution = grid.map((row) => row.slice());
    puzzle = grid.map((row) => row.slice());
    const cells = shuffle(Array.from({ length: size * size }, (_, i) => i));
    const toRemove = size * size - givens;
    for (let i = 0; i < toRemove && i < cells.length; i++) {
      const r = Math.floor(cells[i] / size), c = cells[i] % size;
      puzzle[r][c] = 0;
    }
    fixed = puzzle.map((row) => row.map((v) => v !== 0));
  }

  function renderGrid() {
    const el = $('sudoku-grid');
    el.style.gridTemplateColumns = `repeat(${cfg.size}, auto)`;
    el.innerHTML = '';
    for (let r = 0; r < cfg.size; r++) {
      for (let c = 0; c < cfg.size; c++) {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'sudoku-cell';
        if ((c + 1) % cfg.boxW === 0 && c !== cfg.size - 1) btn.classList.add('box-edge-r');
        if ((r + 1) % cfg.boxH === 0 && r !== cfg.size - 1) btn.classList.add('box-edge-b');
        btn.dataset.r = r; btn.dataset.c = c;
        if (fixed[r][c]) { btn.textContent = puzzle[r][c]; btn.classList.add('is-fixed'); btn.disabled = true; }
        else {
          btn.textContent = puzzle[r][c] || '';
          btn.addEventListener('click', () => selectCell(r, c));
        }
        el.appendChild(btn);
      }
    }
  }

  function renderPad() {
    const el = $('sudoku-pad');
    el.innerHTML = '';
    for (let n = 1; n <= cfg.size; n++) {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = n;
      b.addEventListener('click', () => placeNumber(n));
      el.appendChild(b);
    }
    const erase = document.createElement('button');
    erase.type = 'button'; erase.className = 'is-erase';
    erase.innerHTML = '<i class="fa-solid fa-eraser"></i>';
    erase.addEventListener('click', () => placeNumber(0));
    el.appendChild(erase);
  }

  function selectCell(r, c) {
    selected = { r, c };
    document.querySelectorAll('.sudoku-cell').forEach((b) => b.style.boxShadow = '');
    const target = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
    if (target) target.style.boxShadow = '0 0 0 2px var(--s21-secondary) inset';
  }

  function placeNumber(n) {
    if (!selected || solved) return;
    const { r, c } = selected;
    puzzle[r][c] = n;
    const btn = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
    btn.textContent = n || '';
    btn.classList.remove('is-error', 'is-hint');
    if (n && n !== solution[r][c]) { btn.classList.add('is-error'); mistakes += 1; $('sudoku-mistakes').textContent = mistakes; }
    checkWin();
  }

  function useHint() {
    if (!selected || hintsLeft <= 0 || solved) return;
    const { r, c } = selected;
    if (fixed[r][c]) return;
    puzzle[r][c] = solution[r][c];
    const btn = document.querySelector(`.sudoku-cell[data-r="${r}"][data-c="${c}"]`);
    btn.textContent = solution[r][c];
    btn.classList.remove('is-error');
    btn.classList.add('is-hint');
    hintsLeft -= 1;
    $('sudoku-hints').textContent = hintsLeft;
    checkWin();
  }

  function checkWin() {
    for (let r = 0; r < cfg.size; r++) for (let c = 0; c < cfg.size; c++) if (puzzle[r][c] !== solution[r][c]) return false;
    solved = true;
    endGame();
    return true;
  }

  function tick() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    $('sudoku-timer').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }

  function startGame() {
    generate();
    hintsLeft = 3; mistakes = 0; solved = false; selected = null;
    $('sudoku-hints').textContent = hintsLeft;
    $('sudoku-mistakes').textContent = mistakes;
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('sudoku-level-label').textContent = cfg.label;
    renderGrid();
    renderPad();
    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    const secs = Math.floor((Date.now() - startTime) / 1000);
    const tierBonus = { easy: 100, medium: 250, hard: 500 }[difficulty];
    const score = Math.max(20, tierBonus + hintsLeft * 30 - mistakes * 15 - Math.floor(secs / 2));
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = score;
    $('final-time').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    renderLeaderboard();
    window.__s21SudokuScore = score;
  }

  function getLeaderboard() { try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; } }
  function saveScore(name, score) {
    const board = getLeaderboard();
    board.push({ name, score, date: new Date().toISOString() });
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
    if (!$('sudoku-grid')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('sudoku-hint-btn')?.addEventListener('click', useHint);

    document.addEventListener('keydown', (e) => {
      if (!selected || !$('game-play-screen') || $('game-play-screen').classList.contains('d-none')) return;
      if (e.key >= '1' && e.key <= '9') placeNumber(Number(e.key));
      if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') placeNumber(0);
    });

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      const score = window.__s21SudokuScore || 0;
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
