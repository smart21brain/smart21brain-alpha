/* Smart21Brain — game-tictactoe.js
   Tic-Tac-Toe vs the computer. Easy = random moves, Medium = blocks/wins
   when it can (else random), Hard = unbeatable minimax. Win streak across
   rounds is the score saved to the leaderboard. */
(function () {
  const LEADERBOARD_KEY = 's21-tic-tac-toe-scores';
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let difficulty = 'medium';
  let board = Array(9).fill(null);
  let humanMark = 'X';
  let aiMark = 'O';
  let streak = 0;
  let over = false;

  function $(id) { return document.getElementById(id); }

  function winner(b) {
    for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { mark: b[a], line: [a, c, d] };
    if (b.every((v) => v)) return { mark: 'draw', line: [] };
    return null;
  }

  function emptyCells(b) { return b.map((v, i) => (v ? null : i)).filter((v) => v !== null); }

  function minimax(b, mark) {
    const w = winner(b);
    if (w) { if (w.mark === aiMark) return { score: 10 }; if (w.mark === humanMark) return { score: -10 }; return { score: 0 }; }
    const moves = emptyCells(b).map((idx) => {
      const nb = b.slice(); nb[idx] = mark;
      const result = minimax(nb, mark === aiMark ? humanMark : aiMark);
      return { idx, score: result.score };
    });
    if (mark === aiMark) return moves.reduce((best, m) => (m.score > best.score ? m : best));
    return moves.reduce((best, m) => (m.score < best.score ? m : best));
  }

  function aiMove() {
    const empties = emptyCells(board);
    if (!empties.length) return;
    if (difficulty === 'easy') {
      board[empties[Math.floor(Math.random() * empties.length)]] = aiMark;
    } else if (difficulty === 'medium') {
      // Win if possible, else block, else random.
      for (const idx of empties) { const nb = board.slice(); nb[idx] = aiMark; if (winner(nb)?.mark === aiMark) { board[idx] = aiMark; return render(); } }
      for (const idx of empties) { const nb = board.slice(); nb[idx] = humanMark; if (winner(nb)?.mark === humanMark) { board[idx] = aiMark; return render(); } }
      board[empties[Math.floor(Math.random() * empties.length)]] = aiMark;
    } else {
      const best = minimax(board, aiMark);
      board[best.idx] = aiMark;
    }
    render();
  }

  function render() {
    const w = winner(board);
    document.querySelectorAll('.ttt-cell').forEach((btn, i) => {
      btn.textContent = board[i] || '';
      btn.classList.toggle('is-x', board[i] === 'X');
      btn.classList.toggle('is-o', board[i] === 'O');
      btn.classList.toggle('is-win', !!(w && w.line.includes(i)));
      btn.disabled = !!board[i] || over;
    });
    if (w) { over = true; setTimeout(() => finishRound(w), 550); }
  }

  function handleClick(i) {
    if (over || board[i] || i === undefined) return;
    board[i] = humanMark;
    render();
    if (!over) setTimeout(aiMove, 380);
  }

  function finishRound(w) {
    const status = $('ttt-status');
    if (w.mark === 'draw') { status.textContent = "It's a draw — try again!"; endSession(`Draw. Final streak: ${streak}`); }
    else if (w.mark === humanMark) { streak += 1; status.textContent = `You win! 🎉 Streak: ${streak}`; $('ttt-streak').textContent = streak; setTimeout(newRound, 1100); }
    else { status.textContent = 'Robo wins this one!'; endSession(`Robo won. Final streak: ${streak}`); }
  }

  function newRound() {
    board = Array(9).fill(null);
    over = false;
    render();
    $('ttt-status').textContent = humanMark === 'X' ? 'Your move (X)' : 'Robo moves first…';
    if (humanMark === 'O') setTimeout(aiMove, 400);
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

  function startGame() {
    streak = 0;
    humanMark = document.querySelector('input[name="ttt-first"]:checked')?.value === 'ai' ? 'O' : 'X';
    aiMark = humanMark === 'X' ? 'O' : 'X';
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('ttt-streak').textContent = streak;
    buildGrid();
    newRound();
  }

  function buildGrid() {
    const el = $('ttt-grid');
    el.innerHTML = '';
    for (let i = 0; i < 9; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'ttt-cell';
      b.addEventListener('click', () => handleClick(i));
      el.appendChild(b);
    }
  }

  function getLeaderboard() { try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; } }
  function saveScore(name, score) {
    const board2 = getLeaderboard();
    board2.push({ name, score, date: new Date().toISOString() });
    board2.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board2.slice(0, 8)));
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
    if (!$('ttt-grid')) return;

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
