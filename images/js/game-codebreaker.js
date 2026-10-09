/* Smart21Brain — game-codebreaker.js
   Mastermind-style code breaking: crack a secret sequence of colours
   using black-peg / white-peg feedback within a limited number of tries.
   Difficulty controls code length, colour count and tries. */
(function () {
  const LEADERBOARD_KEY = 's21-code-breaker-scores';
  const COLORS = ['#EF476F', '#3A86FF', '#FFD166', '#06A77D', '#7B61FF', '#FF9F1C'];
  const LEVELS = {
    easy: { length: 3, colors: 4, tries: 10 },
    medium: { length: 4, colors: 5, tries: 10 },
    hard: { length: 5, colors: 6, tries: 8 },
  };
  let difficulty = 'easy';
  let cfg = LEVELS.easy;
  let secret = [];
  let current = [];
  let history = [];
  let triesLeft = 0;
  let finished = false;

  function $(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function newSecret() {
    cfg = LEVELS[difficulty];
    secret = Array.from({ length: cfg.length }, () => randInt(0, cfg.colors - 1));
    current = [];
    history = [];
    triesLeft = cfg.tries;
    finished = false;
  }

  function renderPalette() {
    const el = $('cb-palette');
    el.innerHTML = '';
    for (let i = 0; i < cfg.colors; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cb-color-btn'; b.style.background = COLORS[i];
      b.setAttribute('aria-label', `Colour ${i + 1}`);
      b.addEventListener('click', () => addPeg(i));
      el.appendChild(b);
    }
  }

  function renderCurrent() {
    const el = $('cb-current');
    el.innerHTML = '';
    for (let i = 0; i < cfg.length; i++) {
      const slot = document.createElement('div');
      slot.className = 'cb-slot';
      if (current[i] !== undefined) { slot.style.background = COLORS[current[i]]; slot.style.borderStyle = 'solid'; }
      el.appendChild(slot);
    }
  }

  function addPeg(colorIdx) {
    if (finished || current.length >= cfg.length) return;
    current.push(colorIdx);
    renderCurrent();
    if (current.length === cfg.length) $('cb-submit-btn').disabled = false;
  }

  function undoPeg() {
    if (finished) return;
    current.pop();
    renderCurrent();
    $('cb-submit-btn').disabled = current.length !== cfg.length;
  }

  function scoreGuess(guess) {
    let black = 0;
    const secretLeft = [];
    const guessLeft = [];
    for (let i = 0; i < cfg.length; i++) {
      if (guess[i] === secret[i]) black += 1;
      else { secretLeft.push(secret[i]); guessLeft.push(guess[i]); }
    }
    let white = 0;
    const used = Array(secretLeft.length).fill(false);
    guessLeft.forEach((g) => {
      const idx = secretLeft.findIndex((s, i) => s === g && !used[i]);
      if (idx !== -1) { used[idx] = true; white += 1; }
    });
    return { black, white };
  }

  function renderHistory() {
    const el = $('cb-history');
    el.innerHTML = history.map(({ guess, black, white }) => `
      <div class="cb-guess-row">
        <div class="cb-pegs">${guess.map((c) => `<span class="cb-peg" style="background:${COLORS[c]}"></span>`).join('')}</div>
        <div class="cb-feedback">${Array.from({ length: cfg.length }).map((_, i) => {
          if (i < black) return '<span class="black"></span>';
          if (i < black + white) return '<span class="white"></span>';
          return '<span></span>';
        }).join('')}</div>
      </div>
    `).join('');
  }

  function submitGuess() {
    if (current.length !== cfg.length || finished) return;
    const { black, white } = scoreGuess(current);
    history.push({ guess: current.slice(), black, white });
    triesLeft -= 1;
    $('cb-tries-left').textContent = triesLeft;
    renderHistory();

    if (black === cfg.length) { finished = true; endGame(true); return; }
    if (triesLeft <= 0) { finished = true; endGame(false); return; }
    current = [];
    renderCurrent();
    $('cb-submit-btn').disabled = true;
  }

  function startGame() {
    newSecret();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('cb-tries-left').textContent = triesLeft;
    $('cb-code-length').textContent = cfg.length;
    renderPalette();
    renderCurrent();
    renderHistory();
    $('cb-submit-btn').disabled = true;
  }

  function endGame(won) {
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    const tierBonus = { easy: 80, medium: 150, hard: 260 }[difficulty];
    const score = won ? Math.max(20, tierBonus + (history.length ? (cfg.tries - history.length) * 25 : 0)) : 0;
    $('cb-result-title').textContent = won ? 'Code cracked! 🎉' : 'Out of tries!';
    $('cb-result-msg').innerHTML = won
      ? `You broke the code in <strong>${history.length}</strong> tries.`
      : `The secret code was: <span class="cb-pegs" style="display:inline-flex;gap:.3rem;vertical-align:middle">${secret.map((c) => `<span class="cb-peg" style="background:${COLORS[c]}"></span>`).join('')}</span>`;
    $('final-score').textContent = score;
    window.__s21CodeBreakerScore = score;
    renderLeaderboard();
    if (!won) $('game-save-score-form')?.classList.add('d-none');
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
    if (!$('cb-palette')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('cb-submit-btn')?.addEventListener('click', submitGuess);
    $('cb-undo-btn')?.addEventListener('click', undoPeg);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      const score = window.__s21CodeBreakerScore || 0;
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
