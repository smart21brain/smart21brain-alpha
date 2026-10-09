/* Smart21Brain — game-crossword.js
   A small crossword puzzle: fill in the grid using the across and down
   clues. Each puzzle's words were checked by hand to confirm every
   intersecting letter matches exactly, so the grid is always solvable. */
(function () {
  const LEADERBOARD_KEY = 's21-crossword-scores';

  const PUZZLES = {
    easy: {
      rows: 3, cols: 3,
      entries: [
        { num: 1, dir: 'across', row: 0, col: 0, word: 'CAT', clue: 'A small furry pet that says meow' },
        { num: 1, dir: 'down', row: 0, col: 0, word: 'COW', clue: 'A farm animal that gives milk' },
        { num: 2, dir: 'down', row: 0, col: 2, word: 'TEN', clue: 'The number after nine' },
        { num: 3, dir: 'across', row: 2, col: 0, word: 'WIN', clue: 'To come first in a game or race' },
      ],
    },
    medium: {
      rows: 3, cols: 6,
      entries: [
        { num: 1, dir: 'across', row: 0, col: 0, word: 'SCHOOL', clue: 'Where you go to learn' },
        { num: 1, dir: 'down', row: 0, col: 0, word: 'SUN', clue: 'It shines in the sky during the day' },
        { num: 2, dir: 'down', row: 0, col: 2, word: 'HAT', clue: 'You wear this on your head' },
        { num: 3, dir: 'across', row: 2, col: 0, word: 'NET', clue: 'Fishermen use this to catch fish' },
      ],
    },
    hard: {
      rows: 4, cols: 6,
      entries: [
        { num: 1, dir: 'across', row: 0, col: 0, word: 'PLANET', clue: 'Earth is one of these in our solar system' },
        { num: 1, dir: 'down', row: 0, col: 0, word: 'PEN', clue: 'You write with this' },
        { num: 2, dir: 'down', row: 0, col: 3, word: 'NEST', clue: 'A bird builds this to lay eggs' },
        { num: 3, dir: 'across', row: 2, col: 0, word: 'NUT', clue: 'A hard-shelled seed, like an almond or a peanut' },
      ],
    },
  };

  let difficulty = 'easy';
  let puzzle = null;
  let grid = []; // grid[r][c] = { letter, entries: [entry,...] } or null (blocked)
  let activeEntry = null;
  let startTime = 0;
  let timerId = null;
  let hintsLeft = 3;
  let solved = false;

  function $(id) { return document.getElementById(id); }
  function cellKey(r, c) { return `${r}-${c}`; }

  function buildGrid() {
    puzzle = PUZZLES[difficulty];
    grid = Array.from({ length: puzzle.rows }, () => Array(puzzle.cols).fill(null));
    puzzle.entries.forEach((e) => {
      for (let i = 0; i < e.word.length; i++) {
        const r = e.row + (e.dir === 'down' ? i : 0);
        const c = e.col + (e.dir === 'across' ? i : 0);
        if (!grid[r][c]) grid[r][c] = { letter: e.word[i], entries: [], input: '' };
        grid[r][c].entries.push(e);
      }
    });
  }

  function entryCells(e) {
    const cells = [];
    for (let i = 0; i < e.word.length; i++) {
      const r = e.row + (e.dir === 'down' ? i : 0);
      const c = e.col + (e.dir === 'across' ? i : 0);
      cells.push([r, c]);
    }
    return cells;
  }

  function renderGrid() {
    const el = $('cw-grid');
    el.style.gridTemplateColumns = `repeat(${puzzle.cols}, auto)`;
    el.innerHTML = '';
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const cell = grid[r][c];
        if (!cell) { el.appendChild(document.createElement('div')).className = 'cw-cell cw-blocked'; continue; }
        const wrap = document.createElement('div');
        wrap.className = 'cw-cell';
        const starter = puzzle.entries.find((e) => e.row === r && e.col === c);
        if (starter) { const num = document.createElement('span'); num.className = 'cw-num'; num.textContent = starter.num; wrap.appendChild(num); }
        const input = document.createElement('input');
        input.maxLength = 1;
        input.dataset.r = r; input.dataset.c = c;
        input.autocomplete = 'off';
        input.addEventListener('focus', () => selectCell(r, c));
        input.addEventListener('input', (e) => handleType(r, c, e.target.value));
        input.addEventListener('keydown', (e) => handleKeydown(r, c, e));
        wrap.appendChild(input);
        el.appendChild(wrap);
      }
    }
  }

  function selectCell(r, c) {
    const cell = grid[r][c];
    if (!cell) return;
    if (activeEntry && cell.entries.includes(activeEntry)) {
      // keep current direction if valid for this cell
    } else {
      activeEntry = cell.entries[0];
    }
    highlightActive();
  }

  function highlightActive() {
    document.querySelectorAll('.cw-cell input').forEach((inp) => inp.classList.remove('is-active-word'));
    if (!activeEntry) return;
    entryCells(activeEntry).forEach(([r, c]) => {
      const inp = document.querySelector(`.cw-cell input[data-r="${r}"][data-c="${c}"]`);
      if (inp) inp.classList.add('is-active-word');
    });
    document.querySelectorAll('.clue-item').forEach((li) => li.classList.toggle('is-active', li.dataset.num === String(activeEntry.num) && li.dataset.dir === activeEntry.dir));
  }

  function handleType(r, c, val) {
    const letter = val.replace(/[^a-zA-Z]/g, '').slice(-1).toUpperCase();
    const input = document.querySelector(`.cw-cell input[data-r="${r}"][data-c="${c}"]`);
    input.value = letter;
    grid[r][c].input = letter;
    if (letter && activeEntry) {
      const cells = entryCells(activeEntry);
      const idx = cells.findIndex(([rr, cc]) => rr === r && cc === c);
      const next = cells[idx + 1];
      if (next) document.querySelector(`.cw-cell input[data-r="${next[0]}"][data-c="${next[1]}"]`)?.focus();
    }
    checkComplete();
  }

  function handleKeydown(r, c, e) {
    if (e.key === 'Backspace' && !e.target.value && activeEntry) {
      const cells = entryCells(activeEntry);
      const idx = cells.findIndex(([rr, cc]) => rr === r && cc === c);
      const prev = cells[idx - 1];
      if (prev) document.querySelector(`.cw-cell input[data-r="${prev[0]}"][data-c="${prev[1]}"]`)?.focus();
    }
    if (e.key === ' ') {
      e.preventDefault();
      const cell = grid[r][c];
      if (cell.entries.length > 1) { activeEntry = cell.entries.find((en) => en !== activeEntry) || activeEntry; highlightActive(); }
    }
  }

  function renderClues() {
    const across = puzzle.entries.filter((e) => e.dir === 'across');
    const down = puzzle.entries.filter((e) => e.dir === 'down');
    const listHtml = (items) => items.map((e) => `<li class="clue-item" data-num="${e.num}" data-dir="${e.dir}"><strong>${e.num}.</strong> ${e.clue} (${e.word.length})</li>`).join('');
    $('cw-across').innerHTML = listHtml(across);
    $('cw-down').innerHTML = listHtml(down);
    document.querySelectorAll('.clue-item').forEach((li) => li.addEventListener('click', () => {
      const entry = puzzle.entries.find((e) => e.num === Number(li.dataset.num) && e.dir === li.dataset.dir);
      activeEntry = entry;
      highlightActive();
      const [r, c] = entryCells(entry)[0];
      document.querySelector(`.cw-cell input[data-r="${r}"][data-c="${c}"]`)?.focus();
    }));
  }

  function checkComplete() {
    for (let r = 0; r < puzzle.rows; r++) {
      for (let c = 0; c < puzzle.cols; c++) {
        const cell = grid[r][c];
        if (cell && cell.input !== cell.letter) return;
      }
    }
    solved = true;
    endGame();
  }

  function useHint() {
    if (hintsLeft <= 0 || !activeEntry) return;
    const cells = entryCells(activeEntry);
    const blank = cells.find(([r, c]) => grid[r][c].input !== grid[r][c].letter);
    if (!blank) return;
    const [r, c] = blank;
    grid[r][c].input = grid[r][c].letter;
    const input = document.querySelector(`.cw-cell input[data-r="${r}"][data-c="${c}"]`);
    input.value = grid[r][c].letter;
    hintsLeft -= 1;
    $('cw-hints').textContent = hintsLeft;
    checkComplete();
  }

  function tick() {
    const secs = Math.floor((Date.now() - startTime) / 1000);
    $('cw-timer').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
  }

  function startGame() {
    difficulty = document.querySelector('.difficulty-btn.is-active')?.dataset.diff || 'easy';
    hintsLeft = 3; solved = false; activeEntry = null;
    buildGrid();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('cw-hints').textContent = hintsLeft;
    renderGrid();
    renderClues();
    startTime = Date.now();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    const secs = Math.floor((Date.now() - startTime) / 1000);
    const tierBonus = { easy: 60, medium: 120, hard: 200 }[difficulty];
    const score = Math.max(10, tierBonus + hintsLeft * 20 - Math.floor(secs / 3));
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = score;
    $('final-time').textContent = `${String(Math.floor(secs / 60)).padStart(2, '0')}:${String(secs % 60).padStart(2, '0')}`;
    window.__s21CrosswordScore = score;
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
    if (!$('cw-grid')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('cw-hint-btn')?.addEventListener('click', useHint);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      const score = window.__s21CrosswordScore || 0;
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
