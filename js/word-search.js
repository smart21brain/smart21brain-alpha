/* Smart21Brain — word-search.js
   A classic word-search grid. Each page sets
   `window.S21_WORDSEARCH_CONFIG = { leaderboardKey, size, words: {en:[...], sw:[...]} }`
   before this script loads. Words are placed horizontally, vertically or
   diagonally at game start; the visitor taps/clicks the first and last
   letter of a word to select it. */
(function () {
  const config = window.S21_WORDSEARCH_CONFIG || { leaderboardKey: 's21-wordsearch-scores', size: 10, words: { en: [], sw: [] } };
  const SIZE = config.size || 10;
  const LEADERBOARD_KEY = config.leaderboardKey;

  const DIRS = [
    { dr: 0, dc: 1 }, { dr: 1, dc: 0 }, { dr: 1, dc: 1 }, { dr: 1, dc: -1 },
  ];

  let grid = [];
  let placements = []; // { word, cells: [[r,c],...] }
  let foundWords = new Set();
  let selecting = false;
  let selStart = null;
  let seconds = 0;
  let timerId = null;
  let currentWords = [];

  function $(id) { return document.getElementById(id); }
  function getLang() { try { return localStorage.getItem('s21-lang') || 'en'; } catch (e) { return 'en'; } }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function randInt(n) { return Math.floor(Math.random() * n); }

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }
  function saveScore(name, time) {
    const board = getLeaderboard();
    board.push({ name, time, date: new Date().toISOString() });
    board.sort((a, b) => a.time - b.time);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 8)));
  }
  function renderLeaderboard() {
    const el = $('game-leaderboard');
    if (!el) return;
    const board = getLeaderboard();
    if (!board.length) {
      el.innerHTML = `<p class="text-soft" style="font-size:.85rem">${window.S21_t ? window.S21_t('runtime_no_scores_yet') : 'No scores yet — be the first!'}</p>`;
      return;
    }
    el.innerHTML = board.map((entry, i) => `
      <div class="d-flex align-items-center justify-content-between py-2 ${i < board.length - 1 ? 'border-bottom' : ''}">
        <span><strong>#${i + 1}</strong> ${escapeHtml(entry.name)}</span>
        <span class="badge-pill">${entry.time}s</span>
      </div>
    `).join('');
  }

  function buildGrid(words) {
    const g = Array.from({ length: SIZE }, () => Array(SIZE).fill(''));
    const placed = [];
    words.forEach((word) => {
      const w = word.toUpperCase().replace(/[^A-Z]/g, '');
      if (!w) return;
      let ok = false;
      for (let attempt = 0; attempt < 60 && !ok; attempt++) {
        const dir = DIRS[randInt(DIRS.length)];
        const maxR = dir.dr >= 0 ? SIZE - (dir.dr * (w.length - 1)) : SIZE;
        const maxC = dir.dc >= 0 ? SIZE - (dir.dc * (w.length - 1)) : SIZE;
        const minR = dir.dr < 0 ? -dir.dr * (w.length - 1) : 0;
        const minC = dir.dc < 0 ? -dir.dc * (w.length - 1) : 0;
        if (maxR <= minR || maxC <= minC) continue;
        const r0 = minR + randInt(maxR - minR);
        const c0 = minC + randInt(maxC - minC);
        const cells = [];
        let fits = true;
        for (let i = 0; i < w.length; i++) {
          const r = r0 + dir.dr * i, c = c0 + dir.dc * i;
          if (r < 0 || r >= SIZE || c < 0 || c >= SIZE) { fits = false; break; }
          if (g[r][c] && g[r][c] !== w[i]) { fits = false; break; }
          cells.push([r, c]);
        }
        if (fits) {
          cells.forEach(([r, c], i) => { g[r][c] = w[i]; });
          placed.push({ word: w, cells });
          ok = true;
        }
      }
    });
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
      if (!g[r][c]) g[r][c] = letters[randInt(letters.length)];
    }
    return { grid: g, placed };
  }

  function renderGrid() {
    const el = $('ws-grid');
    el.style.gridTemplateColumns = `repeat(${SIZE}, 34px)`;
    el.innerHTML = '';
    for (let r = 0; r < SIZE; r++) {
      for (let c = 0; c < SIZE; c++) {
        const cell = document.createElement('div');
        cell.className = 'ws-cell';
        cell.textContent = grid[r][c];
        cell.dataset.r = r; cell.dataset.c = c;
        el.appendChild(cell);
      }
    }
    el.querySelectorAll('.ws-cell').forEach((cell) => {
      cell.addEventListener('mousedown', () => onCellDown(cell));
      cell.addEventListener('mouseenter', () => { if (selecting) previewSelection(cell); });
      cell.addEventListener('mouseup', () => onCellUp(cell));
      cell.addEventListener('touchstart', (e) => { e.preventDefault(); onCellDown(cell); }, { passive: false });
      cell.addEventListener('touchend', (e) => {
        e.preventDefault();
        const t = e.changedTouches[0];
        const target = document.elementFromPoint(t.clientX, t.clientY);
        if (target && target.classList.contains('ws-cell')) onCellUp(target); else onCellUp(cell);
      }, { passive: false });
    });
  }

  function cellsBetween(r0, c0, r1, c1) {
    const dr = Math.sign(r1 - r0), dc = Math.sign(c1 - c0);
    if (!(dr === 0 || dc === 0 || Math.abs(r1 - r0) === Math.abs(c1 - c0))) return null;
    const len = Math.max(Math.abs(r1 - r0), Math.abs(c1 - c0)) + 1;
    const cells = [];
    for (let i = 0; i < len; i++) cells.push([r0 + dr * i, c0 + dc * i]);
    return cells;
  }

  function clearPreview() {
    document.querySelectorAll('.ws-cell.is-selected').forEach((c) => c.classList.remove('is-selected'));
  }

  function previewSelection(cell) {
    if (!selStart) return;
    const r1 = parseInt(cell.dataset.r, 10), c1 = parseInt(cell.dataset.c, 10);
    const cells = cellsBetween(selStart.r, selStart.c, r1, c1);
    clearPreview();
    if (!cells) return;
    cells.forEach(([r, c]) => {
      document.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`)?.classList.add('is-selected');
    });
  }

  function onCellDown(cell) {
    selecting = true;
    selStart = { r: parseInt(cell.dataset.r, 10), c: parseInt(cell.dataset.c, 10) };
    clearPreview();
    cell.classList.add('is-selected');
  }

  function onCellUp(cell) {
    if (!selecting || !selStart) return;
    const r1 = parseInt(cell.dataset.r, 10), c1 = parseInt(cell.dataset.c, 10);
    const cells = cellsBetween(selStart.r, selStart.c, r1, c1);
    selecting = false;
    clearPreview();
    if (!cells) { selStart = null; return; }

    const forward = cells.map(([r, c]) => grid[r][c]).join('');
    const backward = forward.split('').reverse().join('');
    const match = placements.find((p) => !foundWords.has(p.word) &&
      (p.word === forward || p.word === backward) &&
      sameCellSet(p.cells, cells));

    if (match) {
      foundWords.add(match.word);
      cells.forEach(([r, c]) => document.querySelector(`.ws-cell[data-r="${r}"][data-c="${c}"]`)?.classList.add('is-found'));
      renderWordList();
      if (foundWords.size === placements.length) endGame();
    }
    selStart = null;
  }

  function sameCellSet(a, b) {
    if (a.length !== b.length) return false;
    const key = (arr) => arr.map((p) => p.join(',')).sort().join('|');
    return key(a) === key(b);
  }

  function renderWordList() {
    const lang = getLang();
    const el = $('ws-wordlist');
    el.innerHTML = currentWords.map((w, i) => {
      const displayWord = w;
      const upper = w.toUpperCase().replace(/[^A-Z]/g, '');
      const found = foundWords.has(upper);
      return `<span class="${found ? 'is-found' : ''}">${escapeHtml(displayWord)}</span>`;
    }).join('');
  }

  function tick() { seconds += 1; $('ws-time').textContent = seconds; }

  function startGame() {
    const lang = getLang();
    currentWords = (config.words[lang] || config.words.en).slice(0, 6);
    const built = buildGrid(currentWords);
    grid = built.grid;
    placements = built.placed;
    foundWords = new Set();
    seconds = 0;

    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('ws-time').textContent = seconds;
    renderGrid();
    renderWordList();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = seconds;
    renderLeaderboard();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('ws-grid')) return; // not on a word-search page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, seconds);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, seconds, { name, time: seconds });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    document.addEventListener('mouseup', () => { selecting = false; });

    renderLeaderboard();
  });
})();
