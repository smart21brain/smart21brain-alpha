/* Smart21Brain — logic-maze.js
   A small grid maze: use the arrow buttons to guide the player (🧑) to
   the goal (🏁) while avoiding walls. Several hand-designed levels get
   harder as you go. No bilingual text is rendered inside the maze itself
   (it's all symbols), so no language config is needed here. */
(function () {
  const config = window.S21_MAZE_CONFIG || { leaderboardKey: 's21-maze-scores' };
  const LEADERBOARD_KEY = config.leaderboardKey;

  // 0 = open, 1 = wall. Each maze is a square grid of strings.
  const LEVELS = [
    [
      '000000',
      '011101',
      '010001',
      '010111',
      '000001',
      '111001',
    ],
    [
      '0000000',
      '0111010',
      '0001010',
      '0101010',
      '0101000',
      '0101110',
      '0000000',
    ],
    [
      '00000000',
      '01110100',
      '01000100',
      '01011100',
      '00010000',
      '11010111',
      '00010000',
      '01111000',
    ],
  ];

  let levelIdx = 0;
  let grid = [];
  let size = 0;
  let player = { r: 0, c: 0 };
  let goal = { r: 0, c: 0 };
  let seconds = 0;
  let moves = 0;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }
  function saveScore(name, s, t) {
    const board = getLeaderboard();
    board.push({ name, moves: s, time: t, date: new Date().toISOString() });
    board.sort((a, b) => a.moves - b.moves || a.time - b.time);
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
        <span class="badge-pill">${entry.moves} moves</span>
      </div>
    `).join('');
  }

  function loadLevel(idx) {
    const rows = LEVELS[idx % LEVELS.length];
    size = rows.length;
    grid = rows.map((row) => row.split('').map(Number));
    player = { r: 0, c: 0 };
    goal = { r: size - 1, c: size - 1 };
    // ensure start/goal are open
    grid[player.r][player.c] = 0;
    grid[goal.r][goal.c] = 0;
  }

  function renderMaze() {
    const el = $('maze-grid');
    el.style.gridTemplateColumns = `repeat(${size}, 38px)`;
    el.innerHTML = '';
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const cell = document.createElement('div');
        cell.className = 'maze-cell';
        if (grid[r][c] === 1) cell.classList.add('is-wall');
        if (r === goal.r && c === goal.c) { cell.classList.add('is-goal'); cell.textContent = '🏁'; }
        if (r === player.r && c === player.c) { cell.classList.add('is-player'); cell.textContent = '🧑'; }
        el.appendChild(cell);
      }
    }
    $('maze-level').textContent = levelIdx + 1;
    $('maze-moves').textContent = moves;
  }

  function tryMove(dr, dc) {
    const nr = player.r + dr, nc = player.c + dc;
    if (nr < 0 || nr >= size || nc < 0 || nc >= size) return;
    if (grid[nr][nc] === 1) return;
    player = { r: nr, c: nc };
    moves += 1;
    renderMaze();
    if (player.r === goal.r && player.c === goal.c) {
      if (levelIdx + 1 < LEVELS.length) {
        setTimeout(() => { levelIdx += 1; loadLevel(levelIdx); renderMaze(); }, 500);
      } else {
        setTimeout(endGame, 400);
      }
    }
  }

  function tick() { seconds += 1; $('maze-time').textContent = seconds; }

  function startGame() {
    levelIdx = 0;
    moves = 0;
    seconds = 0;
    loadLevel(levelIdx);
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('maze-time').textContent = seconds;
    renderMaze();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = moves;
    $('final-level').textContent = seconds;
    renderLeaderboard();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('maze-grid')) return; // not on a logic-maze page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('maze-up')?.addEventListener('click', () => tryMove(-1, 0));
    $('maze-down')?.addEventListener('click', () => tryMove(1, 0));
    $('maze-left')?.addEventListener('click', () => tryMove(0, -1));
    $('maze-right')?.addEventListener('click', () => tryMove(0, 1));

    document.addEventListener('keydown', (e) => {
      if (!$('game-play-screen') || $('game-play-screen').classList.contains('d-none')) return;
      if (e.key === 'ArrowUp') tryMove(-1, 0);
      if (e.key === 'ArrowDown') tryMove(1, 0);
      if (e.key === 'ArrowLeft') tryMove(0, -1);
      if (e.key === 'ArrowRight') tryMove(0, 1);
    });

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, moves, seconds);
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
        window.S21_recordGameScore?.(LEADERBOARD_KEY, moves, { name, time: seconds });
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
