/* Smart21Brain — game-checkers.js
   Standard American checkers (8x8, men + kings, mandatory captures with
   multi-jump chains). Easy AI picks randomly among legal moves, Medium
   is a 1-ply greedy evaluator, Hard is a depth-3 minimax with alpha-beta
   pruning over a simple material + advancement heuristic. */
(function () {
  const LEADERBOARD_KEY = 's21-checkers-scores';
  const HUMAN = 'H', AI = 'A';
  const AI_DEPTH = { easy: 0, medium: 2, hard: 5 };

  let difficulty = 'medium';
  let board = [];
  let turn = HUMAN;
  let selected = null;
  let legalForSelected = [];
  let over = false;
  let streak = 0;

  function $(id) { return document.getElementById(id); }
  function idx(r, c) { return r * 8 + c; }
  function inBounds(r, c) { return r >= 0 && r < 8 && c >= 0 && c < 8; }

  function initialBoard() {
    const b = Array(64).fill(null);
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        if ((r + c) % 2 !== 1) continue; // only dark squares are playable
        if (r <= 2) b[idx(r, c)] = { side: AI, king: false };
        else if (r >= 5) b[idx(r, c)] = { side: HUMAN, king: false };
      }
    }
    return b;
  }

  function jumpDirs(side, king) {
    if (king) return [[-1, -1], [-1, 1], [1, -1], [1, 1]];
    return side === HUMAN ? [[-1, -1], [-1, 1]] : [[1, -1], [1, 1]];
  }

  function findJumpChains(b, startIdx, side, king) {
    const results = [];
    function recurse(curIdx, capturedSet, path) {
      const r = Math.floor(curIdx / 8), c = curIdx % 8;
      let found = false;
      for (const [dr, dc] of jumpDirs(side, king)) {
        const midR = r + dr, midC = c + dc, landR = r + 2 * dr, landC = c + 2 * dc;
        if (!inBounds(landR, landC)) continue;
        const midIdx = idx(midR, midC), landIdx = idx(landR, landC);
        const midPiece = b[midIdx];
        if (midPiece && midPiece.side !== side && !capturedSet.has(midIdx) && !b[landIdx] && landIdx !== startIdx) {
          found = true;
          recurse(landIdx, new Set([...capturedSet, midIdx]), [...path, landIdx]);
        }
      }
      if (!found && path.length > 1) results.push({ from: startIdx, to: curIdx, captured: [...capturedSet], path });
    }
    recurse(startIdx, new Set(), [startIdx]);
    return results;
  }

  function allCaptureMoves(b, side) {
    let moves = [];
    for (let i = 0; i < 64; i++) { const p = b[i]; if (p && p.side === side) moves = moves.concat(findJumpChains(b, i, side, p.king)); }
    return moves;
  }
  function allSimpleMoves(b, side) {
    const moves = [];
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (p && p.side === side) {
        const r = Math.floor(i / 8), c = i % 8;
        for (const [dr, dc] of jumpDirs(side, p.king)) {
          const nr = r + dr, nc = c + dc;
          if (inBounds(nr, nc) && !b[idx(nr, nc)]) moves.push({ from: i, to: idx(nr, nc), captured: [] });
        }
      }
    }
    return moves;
  }
  function legalMoves(b, side) {
    const caps = allCaptureMoves(b, side);
    return caps.length ? caps : allSimpleMoves(b, side);
  }

  function applyMove(b, move, side) {
    const nb = b.slice();
    const piece = nb[move.from];
    nb[move.from] = null;
    move.captured.forEach((ci) => { nb[ci] = null; });
    const toR = Math.floor(move.to / 8);
    let king = piece.king;
    if (!king) { if (side === HUMAN && toR === 0) king = true; if (side === AI && toR === 7) king = true; }
    nb[move.to] = { side, king };
    return nb;
  }

  function evaluate(b) {
    let score = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p) continue;
      const r = Math.floor(i / 8);
      let val = p.king ? 5 : 3;
      if (!p.king) val += (p.side === AI ? r : (7 - r)) * 0.1;
      score += p.side === AI ? val : -val;
    }
    return score;
  }

  function minimaxCk(b, depth, side, alpha, beta) {
    const moves = legalMoves(b, side);
    if (moves.length === 0) return { score: side === AI ? -1000 : 1000 };
    if (depth === 0) return { score: evaluate(b) };
    const maximizing = side === AI;
    let best = { score: maximizing ? -Infinity : Infinity, move: moves[0] };
    for (const m of moves) {
      const nb = applyMove(b, m, side);
      const res = minimaxCk(nb, depth - 1, side === AI ? HUMAN : AI, alpha, beta);
      if (maximizing) { if (res.score > best.score) best = { score: res.score, move: m }; alpha = Math.max(alpha, best.score); }
      else { if (res.score < best.score) best = { score: res.score, move: m }; beta = Math.min(beta, best.score); }
      if (alpha >= beta) break;
    }
    return best;
  }

  function aiChooseMove() {
    const moves = legalMoves(board, AI);
    if (!moves.length) return null;
    if (difficulty === 'easy') return moves[Math.floor(Math.random() * moves.length)];
    return minimaxCk(board, AI_DEPTH[difficulty], AI, -Infinity, Infinity).move;
  }

  function render() {
    document.querySelectorAll('.ck-sq').forEach((el) => {
      const i = Number(el.dataset.i);
      const p = board[i];
      el.innerHTML = '';
      el.classList.remove('is-selected', 'is-target');
      if (p) {
        const piece = document.createElement('div');
        piece.className = `ck-piece ${p.side === HUMAN ? 'is-human' : 'is-ai'} ${p.king ? 'is-king' : ''}`;
        if (p.king) piece.innerHTML = '<i class="fa-solid fa-crown"></i>';
        el.appendChild(piece);
      }
      if (selected === i) el.classList.add('is-selected');
      if (legalForSelected.some((m) => m.to === i)) el.classList.add('is-target');
    });
  }

  function pieceCount(side) { return board.filter((p) => p && p.side === side).length; }

  function handleSquareClick(i) {
    if (over || turn !== HUMAN) return;
    const p = board[i];
    const captureMoves = allCaptureMoves(board, HUMAN);
    const mustCapture = captureMoves.length > 0;

    if (selected === null) {
      if (p && p.side === HUMAN) {
        const moves = mustCapture ? captureMoves.filter((m) => m.from === i) : allSimpleMoves(board, HUMAN).filter((m) => m.from === i);
        if (moves.length) { selected = i; legalForSelected = moves; render(); }
      }
      return;
    }
    const chosen = legalForSelected.find((m) => m.to === i);
    if (chosen) { makeMove(chosen); return; }
    if (p && p.side === HUMAN) {
      const moves = mustCapture ? captureMoves.filter((m) => m.from === i) : allSimpleMoves(board, HUMAN).filter((m) => m.from === i);
      selected = moves.length ? i : null;
      legalForSelected = moves;
      render();
      return;
    }
    selected = null; legalForSelected = []; render();
  }

  function makeMove(move) {
    board = applyMove(board, move, HUMAN);
    selected = null; legalForSelected = [];
    render();
    checkGameEnd(AI, () => { turn = AI; $('ck-status').textContent = 'Robo is thinking…'; setTimeout(aiTurn, 450); });
  }

  function aiTurn() {
    const move = aiChooseMove();
    if (!move) { finishRound('you'); return; }
    board = applyMove(board, move, AI);
    render();
    checkGameEnd(HUMAN, () => { turn = HUMAN; $('ck-status').textContent = 'Your move!'; });
  }

  function checkGameEnd(nextSide, onContinue) {
    if (pieceCount(HUMAN) === 0 || (nextSide === HUMAN && legalMoves(board, HUMAN).length === 0)) { finishRound('robo'); return; }
    if (pieceCount(AI) === 0 || (nextSide === AI && legalMoves(board, AI).length === 0)) { finishRound('you'); return; }
    onContinue();
  }

  function finishRound(who) {
    over = true;
    const status = $('ck-status');
    if (who === 'you') { streak += 1; status.textContent = `You win! 🎉 Streak: ${streak}`; $('ck-streak').textContent = streak; setTimeout(newRound, 1300); }
    else { status.textContent = 'Robo wins this one!'; endSession(`Robo won. Final streak: ${streak}`); }
  }

  function newRound() {
    board = initialBoard();
    turn = HUMAN; selected = null; legalForSelected = []; over = false;
    render();
    $('ck-status').textContent = 'Your move!';
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
    const el = $('ck-board');
    el.innerHTML = '';
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const sq = document.createElement('button');
        sq.type = 'button';
        sq.className = `ck-sq ${(r + c) % 2 === 1 ? 'is-dark' : 'is-light'}`;
        sq.dataset.i = idx(r, c);
        if ((r + c) % 2 === 1) sq.addEventListener('click', () => handleSquareClick(idx(r, c)));
        el.appendChild(sq);
      }
    }
  }

  function startGame() {
    streak = 0;
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('ck-streak').textContent = streak;
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
    if (!$('ck-board')) return;

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
