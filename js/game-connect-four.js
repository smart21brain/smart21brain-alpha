/* Smart21Brain — game-connect-four.js
   Classic Connect Four vs the computer. Easy = mostly random (blocks an
   immediate loss/takes an immediate win). Medium/Hard use depth-limited
   minimax with alpha-beta pruning over a heuristic window evaluation. */
(function () {
  const LEADERBOARD_KEY = 's21-connect-four-scores';
  const ROWS = 6, COLS = 7;
  const HUMAN = 1, AI = 2;
  const DEPTH = { easy: 1, medium: 3, hard: 5 };

  let difficulty = 'medium';
  let board = [];
  let over = false;
  let streak = 0;

  function $(id) { return document.getElementById(id); }
  function idx(r, c) { return r * COLS + c; }
  function emptyBoard() { return Array(ROWS * COLS).fill(0); }
  function validCols(b) { const cols = []; for (let c = 0; c < COLS; c++) if (b[idx(0, c)] === 0) cols.push(c); return cols; }
  function dropRow(b, c) { for (let r = ROWS - 1; r >= 0; r--) if (b[idx(r, c)] === 0) return r; return -1; }

  function checkWinAt(b, player) {
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) if ([0, 1, 2, 3].every((i) => b[idx(r, c + i)] === player)) return [idx(r, c), idx(r, c + 1), idx(r, c + 2), idx(r, c + 3)];
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++) if ([0, 1, 2, 3].every((i) => b[idx(r + i, c)] === player)) return [idx(r, c), idx(r + 1, c), idx(r + 2, c), idx(r + 3, c)];
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) if ([0, 1, 2, 3].every((i) => b[idx(r + i, c + i)] === player)) return [idx(r, c), idx(r + 1, c + 1), idx(r + 2, c + 2), idx(r + 3, c + 3)];
    for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) if ([0, 1, 2, 3].every((i) => b[idx(r - i, c + i)] === player)) return [idx(r, c), idx(r - 1, c + 1), idx(r - 2, c + 2), idx(r - 3, c + 3)];
    return null;
  }

  function evalWindow(w) {
    const ai = w.filter((v) => v === AI).length;
    const hu = w.filter((v) => v === HUMAN).length;
    const empty = w.filter((v) => v === 0).length;
    if (ai === 4) return 100000;
    if (ai === 3 && empty === 1) return 100;
    if (ai === 2 && empty === 2) return 10;
    if (hu === 3 && empty === 1) return -120;
    if (hu === 2 && empty === 2) return -8;
    return 0;
  }

  function evaluate(b) {
    let score = 0;
    for (let r = 0; r < ROWS; r++) if (b[idx(r, 3)] === AI) score += 6;
    for (let r = 0; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) score += evalWindow([0, 1, 2, 3].map((i) => b[idx(r, c + i)]));
    for (let c = 0; c < COLS; c++) for (let r = 0; r <= ROWS - 4; r++) score += evalWindow([0, 1, 2, 3].map((i) => b[idx(r + i, c)]));
    for (let r = 0; r <= ROWS - 4; r++) for (let c = 0; c <= COLS - 4; c++) score += evalWindow([0, 1, 2, 3].map((i) => b[idx(r + i, c + i)]));
    for (let r = 3; r < ROWS; r++) for (let c = 0; c <= COLS - 4; c++) score += evalWindow([0, 1, 2, 3].map((i) => b[idx(r - i, c + i)]));
    return score;
  }

  function minimax(b, depth, alpha, beta, maximizing) {
    const cols = validCols(b);
    if (checkWinAt(b, AI)) return { score: 1000000 + depth };
    if (checkWinAt(b, HUMAN)) return { score: -1000000 - depth };
    if (!cols.length) return { score: 0 };
    if (depth === 0) return { score: evaluate(b) };

    if (maximizing) {
      let best = { score: -Infinity, col: cols[0] };
      for (const c of cols) {
        const r = dropRow(b, c); b[idx(r, c)] = AI;
        const res = minimax(b, depth - 1, alpha, beta, false);
        b[idx(r, c)] = 0;
        if (res.score > best.score) best = { score: res.score, col: c };
        alpha = Math.max(alpha, best.score);
        if (alpha >= beta) break;
      }
      return best;
    }
    let best = { score: Infinity, col: cols[0] };
    for (const c of cols) {
      const r = dropRow(b, c); b[idx(r, c)] = HUMAN;
      const res = minimax(b, depth - 1, alpha, beta, true);
      b[idx(r, c)] = 0;
      if (res.score < best.score) best = { score: res.score, col: c };
      beta = Math.min(beta, best.score);
      if (alpha >= beta) break;
    }
    return best;
  }

  function aiChooseCol() {
    const cols = validCols(board);
    if (difficulty === 'easy') {
      for (const c of cols) { const r = dropRow(board, c); board[idx(r, c)] = AI; if (checkWinAt(board, AI)) { board[idx(r, c)] = 0; return c; } board[idx(r, c)] = 0; }
      for (const c of cols) { const r = dropRow(board, c); board[idx(r, c)] = HUMAN; if (checkWinAt(board, HUMAN)) { board[idx(r, c)] = 0; return c; } board[idx(r, c)] = 0; }
      return cols[Math.floor(Math.random() * cols.length)];
    }
    return minimax(board, DEPTH[difficulty], -Infinity, Infinity, true).col;
  }

  function render(winLine) {
    document.querySelectorAll('.c4-cell').forEach((btn, i) => {
      btn.classList.remove('is-r', 'is-y', 'is-win');
      if (board[i] === HUMAN) btn.classList.add('is-r');
      if (board[i] === AI) btn.classList.add('is-y');
      if (winLine && winLine.includes(i)) btn.classList.add('is-win');
      btn.disabled = over;
    });
  }

  function humanMove(col) {
    if (over) return;
    const r = dropRow(board, col);
    if (r < 0) return;
    board[idx(r, col)] = HUMAN;
    const win = checkWinAt(board, HUMAN);
    render(win);
    if (win) return finishRound('you');
    if (!validCols(board).length) return finishRound('draw');
    $('c4-status').textContent = "Robo is thinking…";
    over = true; // lock input while AI "thinks"
    setTimeout(() => {
      over = false;
      const aiCol = aiChooseCol();
      const ar = dropRow(board, aiCol);
      board[idx(ar, aiCol)] = AI;
      const aiWin = checkWinAt(board, AI);
      render(aiWin);
      if (aiWin) return finishRound('robo');
      if (!validCols(board).length) return finishRound('draw');
      $('c4-status').textContent = 'Your move — drop a piece!';
    }, 420);
  }

  function finishRound(who) {
    over = true;
    render(who === 'you' ? checkWinAt(board, HUMAN) : who === 'robo' ? checkWinAt(board, AI) : null);
    const status = $('c4-status');
    if (who === 'you') { streak += 1; status.textContent = `You win! 🎉 Streak: ${streak}`; $('c4-streak').textContent = streak; setTimeout(newRound, 1200); }
    else if (who === 'draw') { status.textContent = "It's a draw!"; endSession(`Draw. Final streak: ${streak}`); }
    else { status.textContent = 'Robo connects four!'; endSession(`Robo won. Final streak: ${streak}`); }
  }

  function newRound() {
    board = emptyBoard();
    over = false;
    render(null);
    $('c4-status').textContent = 'Your move — drop a piece!';
  }

  function endSession(msg) {
    setTimeout(() => {
      $('game-play-screen').classList.add('d-none');
      $('game-over-screen').classList.remove('d-none');
      $('final-score').textContent = streak;
      $('final-msg').textContent = msg;
      $('game-save-score-form')?.classList.remove('d-none');
      $('game-saved-msg')?.classList.add('d-none');
      renderLeaderboard();
    }, 900);
  }

  function buildGrid() {
    const el = $('c4-board');
    el.innerHTML = '';
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'c4-cell';
      b.addEventListener('click', () => humanMove(c));
      el.appendChild(b);
    }
  }

  function startGame() {
    streak = 0;
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('c4-streak').textContent = streak;
    buildGrid();
    newRound();
  }

  function getLeaderboard() { try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; } }
  function saveScore(name, score) {
    const b2 = getLeaderboard();
    b2.push({ name, score, date: new Date().toISOString() });
    b2.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(b2.slice(0, 8)));
  }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function renderLeaderboard() {
    const el = $('game-leaderboard');
    if (!el) return;
    const b = getLeaderboard();
    if (!b.length) { el.innerHTML = `<p class="text-soft" style="font-size:.85rem">No scores yet — be the first!</p>`; return; }
    el.innerHTML = b.map((entry, i) => `
      <div class="d-flex align-items-center justify-content-between py-2 ${i < b.length - 1 ? 'border-bottom' : ''}">
        <span><strong>#${i + 1}</strong> ${escapeHtml(entry.name)}</span>
        <span class="badge-pill">Streak ${entry.score}</span>
      </div>`).join('');
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('c4-board')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      saveScore(name, streak);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, streak, { name, difficulty });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.('Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
