/* Smart21Brain — game-chess-puzzle.js
   Find the checkmate in one move. Every puzzle below was generated and
   verified with a real chess engine (python-chess) — each solution move
   is a confirmed, unique checkmate from that position, so there's no
   ambiguity about what counts as "correct". */
(function () {
  const LEADERBOARD_KEY = 's21-chess-puzzle-scores';
  const DURATION = 180;

  const PUZZLES = {"easy": [{"wk": "a2", "bk": "g8", "pieces": [{"type": "R", "sq": "b6"}], "pawns": ["f7", "g7", "h7"], "from": "b6", "to": "b8", "san": "Rb8#"}, {"wk": "c2", "bk": "a8", "pieces": [{"type": "R", "sq": "e3"}], "pawns": ["a7", "b7"], "from": "e3", "to": "e8", "san": "Re8#"}, {"wk": "b6", "bk": "h8", "pieces": [{"type": "R", "sq": "f6"}], "pawns": ["g7", "h7"], "from": "f6", "to": "f8", "san": "Rf8#"}, {"wk": "c3", "bk": "h8", "pieces": [{"type": "R", "sq": "d4"}], "pawns": ["g7", "h7"], "from": "d4", "to": "d8", "san": "Rd8#"}, {"wk": "h6", "bk": "g8", "pieces": [{"type": "Q", "sq": "b5"}], "pawns": [], "from": "b5", "to": "e8", "san": "Qe8#"}], "medium": [{"wk": "a5", "bk": "g8", "pieces": [{"type": "R", "sq": "c4"}, {"type": "R", "sq": "e7"}], "pawns": [], "from": "c4", "to": "c8", "san": "Rc8#"}, {"wk": "c3", "bk": "b8", "pieces": [{"type": "R", "sq": "h7"}, {"type": "R", "sq": "f5"}], "pawns": [], "from": "f5", "to": "f8", "san": "Rf8#"}, {"wk": "d8", "bk": "h8", "pieces": [{"type": "R", "sq": "g2"}, {"type": "R", "sq": "e4"}], "pawns": [], "from": "e4", "to": "h4", "san": "Rh4#"}, {"wk": "h1", "bk": "b8", "pieces": [{"type": "R", "sq": "e7"}, {"type": "R", "sq": "f6"}], "pawns": [], "from": "f6", "to": "f8", "san": "Rf8#"}, {"wk": "f1", "bk": "h1", "pieces": [{"type": "R", "sq": "e5"}, {"type": "B", "sq": "g7"}], "pawns": [], "from": "e5", "to": "h5", "san": "Rh5#"}, {"wk": "c8", "bk": "a8", "pieces": [{"type": "R", "sq": "g2"}, {"type": "B", "sq": "b8"}], "pawns": [], "from": "g2", "to": "a2", "san": "Ra2#"}, {"wk": "a6", "bk": "b8", "pieces": [{"type": "R", "sq": "e5"}, {"type": "B", "sq": "g3"}], "pawns": [], "from": "e5", "to": "e8", "san": "Re8#"}, {"wk": "d4", "bk": "h8", "pieces": [{"type": "Q", "sq": "g3"}, {"type": "R", "sq": "a2"}], "pawns": [], "from": "a2", "to": "h2", "san": "Rh2#"}, {"wk": "b2", "bk": "g8", "pieces": [{"type": "Q", "sq": "f4"}, {"type": "R", "sq": "h7"}], "pawns": [], "from": "f4", "to": "f7", "san": "Qf7#"}, {"wk": "c4", "bk": "a1", "pieces": [{"type": "Q", "sq": "f4"}, {"type": "R", "sq": "b2"}], "pawns": [], "from": "f4", "to": "c1", "san": "Qc1#"}], "hard": [{"wk": "d1", "bk": "h8", "pieces": [{"type": "Q", "sq": "e3"}, {"type": "B", "sq": "c4"}], "pawns": [], "from": "e3", "to": "h6", "san": "Qh6#"}, {"wk": "c5", "bk": "a1", "pieces": [{"type": "Q", "sq": "f3"}, {"type": "B", "sq": "c2"}], "pawns": [], "from": "f3", "to": "a3", "san": "Qa3#"}, {"wk": "d7", "bk": "a8", "pieces": [{"type": "Q", "sq": "b1"}, {"type": "B", "sq": "a6"}], "pawns": [], "from": "b1", "to": "b7", "san": "Qb7#"}, {"wk": "b6", "bk": "b8", "pieces": [{"type": "R", "sq": "f5"}, {"type": "N", "sq": "g8"}], "pawns": [], "from": "f5", "to": "f8", "san": "Rf8#"}]};

  const GLYPH = { K: '♔', Q: '♕', R: '♖', B: '♗', N: '♘', P: '♙', k: '♚' };
  const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

  let difficulty = 'easy';
  let pool = [];
  let puzzle = null;
  let selected = null;
  let score = 0;
  let lives = 3;
  let solved = 0;
  let timeLeft = DURATION;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function refillPool() { pool = shuffle(PUZZLES[difficulty]); }
  function nextPuzzle() {
    if (!pool.length) refillPool();
    puzzle = pool.pop();
    selected = null;
    renderBoard();
    $('chess-hint-text').textContent = '';
  }

  function squareOf(sq) {
    if (puzzle.wk === sq) return 'K';
    if (puzzle.bk === sq) return 'k';
    const p = puzzle.pieces.find((pc) => pc.sq === sq);
    if (p) return p.type;
    if (puzzle.pawns.includes(sq)) return 'p';
    return null;
  }

  function isWhitePiece(code) { return code && code === code.toUpperCase() && code !== 'p'; }

  function renderBoard() {
    const el = $('chess-board');
    el.innerHTML = '';
    for (let rank = 8; rank >= 1; rank--) {
      for (let f = 0; f < 8; f++) {
        const sqName = FILES[f] + rank;
        const isDark = (f + rank) % 2 === 0;
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `chess-sq ${isDark ? 'is-dark' : 'is-light'}`;
        btn.dataset.sq = sqName;
        const code = squareOf(sqName);
        if (code) {
          const glyph = code === 'p' ? '♟' : GLYPH[code];
          btn.innerHTML = `<span class="${isWhitePiece(code) ? 'is-white-piece' : 'is-black-piece'}">${glyph}</span>`;
        }
        if (selected === sqName) btn.classList.add('is-selected');
        btn.addEventListener('click', () => handleSquareClick(sqName));
        el.appendChild(btn);
      }
    }
  }

  function handleSquareClick(sqName) {
    if (!puzzle) return;
    const code = squareOf(sqName);
    if (selected === null) {
      if (code && isWhitePiece(code)) { selected = sqName; renderBoard(); }
      return;
    }
    if (selected === sqName) { selected = null; renderBoard(); return; }
    if (code && isWhitePiece(code)) { selected = sqName; renderBoard(); return; } // switch selection
    attemptMove(selected, sqName);
  }

  function attemptMove(from, to) {
    const correct = from === puzzle.from && to === puzzle.to;
    const feedback = $('chess-feedback');
    if (correct) {
      solved += 1;
      const tierPts = { easy: 15, medium: 25, hard: 40 }[difficulty];
      score += tierPts;
      updateHud();
      feedback.textContent = `Checkmate! ${puzzle.san} ✓`;
      feedback.style.color = '#0B6E4F';
      selected = null;
      setTimeout(() => { feedback.textContent = ''; nextPuzzle(); }, 900);
    } else {
      lives -= 1;
      renderHearts();
      feedback.textContent = 'Not mate — try a different move.';
      feedback.style.color = 'var(--s21-accent)';
      selected = null;
      renderBoard();
      setTimeout(() => { feedback.textContent = ''; }, 900);
      if (lives <= 0) endGame();
    }
  }

  function giveHint() {
    if (!puzzle) return;
    $('chess-hint-text').textContent = `Hint: move the piece on ${puzzle.from}.`;
  }

  function updateHud() { $('game-score').textContent = score; $('chess-solved').textContent = solved; }
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
    score = 0; lives = 3; solved = 0; timeLeft = DURATION;
    refillPool();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    renderHearts();
    $('game-timer').textContent = timeLeft;
    nextPuzzle();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = score;
    $('final-solved').textContent = solved;
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
    if (!$('chess-board')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('chess-hint-btn')?.addEventListener('click', giveHint);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      saveScore(name, score);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, score, { name, difficulty, solved });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.('Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
