/* Smart21Brain — sentence-builder.js
   Tap word chips into the target box in the right order to rebuild a
   sentence. Each page sets `window.S21_SENTENCE_CONFIG = { leaderboardKey,
   sentences: { en: ['A cat sat on the mat', ...], sw: [...] } }` before
   this script loads. */
(function () {
  const config = window.S21_SENTENCE_CONFIG || { leaderboardKey: 's21-sentence-scores', sentences: { en: [], sw: [] } };
  const LEADERBOARD_KEY = config.leaderboardKey;
  const ROUNDS = 5;

  let queue = [];
  let roundIdx = 0;
  let target = [];
  let bank = [];
  let score = 0;
  let seconds = 0;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function getLang() { try { return localStorage.getItem('s21-lang') || 'en'; } catch (e) { return 'en'; } }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str; return d.innerHTML; }
  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

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
        <span class="badge-pill">${entry.score} pts</span>
      </div>
    `).join('');
  }

  function tick() { seconds += 1; $('sb-time').textContent = seconds; }

  function renderRound() {
    $('sb-progress').textContent = `${roundIdx + 1} / ${ROUNDS}`;
    renderBoxes();
  }

  function renderBoxes() {
    const targetEl = $('sb-target');
    const bankEl = $('sb-bank');
    targetEl.innerHTML = target.map((w, i) => `<button type="button" class="sb-chip" data-target-idx="${i}">${escapeHtml(w)}</button>`).join('');
    bankEl.innerHTML = bank.map((w, i) => `<button type="button" class="sb-chip" data-bank-idx="${i}">${escapeHtml(w)}</button>`).join('');
    targetEl.querySelectorAll('[data-target-idx]').forEach((btn) => {
      btn.addEventListener('click', () => moveToBank(parseInt(btn.dataset.targetIdx, 10)));
    });
    bankEl.querySelectorAll('[data-bank-idx]').forEach((btn) => {
      btn.addEventListener('click', () => moveToTarget(parseInt(btn.dataset.bankIdx, 10)));
    });
  }

  function moveToTarget(bankIdx) {
    const word = bank[bankIdx];
    bank.splice(bankIdx, 1);
    target.push(word);
    renderBoxes();
    checkComplete();
  }

  function moveToBank(targetIdx) {
    const word = target[targetIdx];
    target.splice(targetIdx, 1);
    bank.push(word);
    renderBoxes();
  }

  function checkComplete() {
    if (target.length !== queue[roundIdx].words.length) return;
    const built = target.join(' ');
    const feedback = $('sb-feedback');
    if (built.toLowerCase() === queue[roundIdx].answer.toLowerCase()) {
      score += 20;
      $('sb-score').textContent = score;
      feedback.textContent = window.S21_t ? window.S21_t('runtime_correct') : 'Correct! ✓';
      feedback.style.color = '#B7F5D8';
      setTimeout(() => {
        feedback.textContent = '';
        roundIdx += 1;
        if (roundIdx >= ROUNDS) { endGame(); return; }
        setupRound();
      }, 1100);
    } else {
      feedback.textContent = '';
      feedback.style.color = 'var(--s21-accent)';
      setTimeout(() => {
        const wrongOrder = target.join(' ');
        bank = shuffle(queue[roundIdx].words.slice());
        target = [];
        renderBoxes();
      }, 700);
    }
  }

  function setupRound() {
    const words = queue[roundIdx].words;
    bank = shuffle(words.slice());
    target = [];
    renderRound();
  }

  function startGame() {
    const lang = getLang();
    const pool = shuffle(config.sentences[lang] || config.sentences.en);
    queue = pool.slice(0, ROUNDS).map((s) => ({ answer: s, words: s.split(' ') }));
    roundIdx = 0;
    score = 0;
    seconds = 0;

    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('sb-score').textContent = score;
    $('sb-time').textContent = seconds;
    setupRound();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = score;
    $('final-level').textContent = seconds;
    renderLeaderboard();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('sb-target')) return; // not on a sentence-builder page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, score);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, score, { name });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
