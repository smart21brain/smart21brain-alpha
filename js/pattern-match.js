/* Smart21Brain — pattern-match.js
   A classic Simon-says style sequence-memory game: watch the pad light up
   in a growing pattern, then repeat it back. No page config needed beyond
   the leaderboard key on window.S21_PATTERN_CONFIG. */
(function () {
  const config = window.S21_PATTERN_CONFIG || { leaderboardKey: 's21-pattern-scores' };
  const LEADERBOARD_KEY = config.leaderboardKey;
  const PAD_SIZE = 4;

  let sequence = [];
  let playerIdx = 0;
  let round = 0;
  let accepting = false;

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }
  function saveScore(name, s) {
    const board = getLeaderboard();
    board.push({ name, score: s, date: new Date().toISOString() });
    board.sort((a, b) => b.score - a.score);
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
        <span class="badge-pill">${entry.score === 1 ? 'Round 1' : 'Round ' + entry.score}</span>
      </div>
    `).join('');
  }

  function pad() { return document.querySelectorAll('.pattern-pad-btn'); }

  function lightUp(idx, duration) {
    return new Promise((resolve) => {
      const btn = pad()[idx];
      btn.classList.add('is-lit');
      setTimeout(() => { btn.classList.remove('is-lit'); resolve(); }, duration);
    });
  }

  async function playSequence() {
    accepting = false;
    $('pattern-status').textContent = window.S21_t ? window.S21_t('runtime_watch') : 'Watch…';
    await new Promise((r) => setTimeout(r, 500));
    for (let i = 0; i < sequence.length; i++) {
      await lightUp(sequence[i], 420);
      await new Promise((r) => setTimeout(r, 180));
    }
    playerIdx = 0;
    accepting = true;
    $('pattern-status').textContent = window.S21_t ? window.S21_t('runtime_your_turn') : 'Your turn';
  }

  function nextRound() {
    round += 1;
    sequence.push(Math.floor(Math.random() * PAD_SIZE));
    $('pattern-round').textContent = round;
    playSequence();
  }

  function handlePress(idx) {
    if (!accepting) return;
    lightUp(idx, 220);
    if (sequence[playerIdx] === idx) {
      playerIdx += 1;
      if (playerIdx === sequence.length) {
        accepting = false;
        $('pattern-status').textContent = 'Nice! Get ready…';
        setTimeout(nextRound, 900);
      }
    } else {
      accepting = false;
      endGame();
    }
  }

  function startGame() {
    sequence = [];
    round = 0;
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    nextRound();
  }

  function endGame() {
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = round;
    renderLeaderboard();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('pattern-round')) return; // not on a pattern-match page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    pad().forEach((btn, i) => btn.addEventListener('click', () => handlePress(i)));

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, round);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, round, { name, round });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
