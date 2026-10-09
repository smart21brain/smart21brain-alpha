/* Smart21Brain — quiz-game.js
   A shared timed multiple-choice game engine used by the knowledge games:
   Animal Kingdom, Plant Life Cycle, Solar System Quiz, Spelling Bee,
   Vocabulary Builder and Brain Teasers. Each page sets
   `window.S21_QUIZ_CONFIG = { leaderboardKey, questions: [...] }` before
   this script loads. Each question is bilingual:
     { en: { q, options }, sw: { q, options }, correct: <index> }
   Timer/lives/level/leaderboard mechanics mirror games.js so every game
   on the site feels consistent. */
(function () {
  const GAME_DURATION = 60;
  const LIVES_START = 3;
  const LEVEL_UP_EVERY = 3;

  const config = window.S21_QUIZ_CONFIG || { leaderboardKey: 's21-quiz-scores', questions: [] };
  const LEADERBOARD_KEY = config.leaderboardKey;

  let state = null;
  let timerId = null;
  let order = [];
  let orderIdx = 0;

  function $(id) { return document.getElementById(id); }
  function getLang() { try { return localStorage.getItem('s21-lang') || 'en'; } catch (e) { return 'en'; } }
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
  function saveScore(name, score) {
    const board = getLeaderboard();
    board.push({ name, score, date: new Date().toISOString() });
    board.sort((a, b) => b.score - a.score);
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(board.slice(0, 8)));
  }
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
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

  function renderHearts() {
    const el = $('game-lives');
    if (!el) return;
    el.innerHTML = Array.from({ length: LIVES_START }).map((_, i) =>
      `<i class="fa-solid fa-heart" style="color:${i < state.lives ? 'var(--s21-accent)' : '#E3E6EA'};margin-right:.2rem"></i>`
    ).join('');
  }

  function updateHud() {
    $('game-score').textContent = state.score;
    $('game-level').textContent = state.level;
    $('game-timer').textContent = state.timeLeft;
    renderHearts();
  }

  function nextQuestion() {
    if (orderIdx >= order.length) { order = shuffle(config.questions.map((_, i) => i)); orderIdx = 0; }
    return config.questions[order[orderIdx++]];
  }

  function renderQuestion() {
    const lang = getLang();
    const q = state.question;
    const localized = q[lang] || q.en;
    $('game-problem').textContent = localized.q;
    const choicesEl = $('quiz-choices');
    choicesEl.innerHTML = localized.options.map((opt, i) =>
      `<button type="button" class="quiz-choice-btn" data-choice="${i}">${escapeHtml(opt)}</button>`
    ).join('');
    choicesEl.querySelectorAll('[data-choice]').forEach((btn) => {
      btn.addEventListener('click', () => handleChoice(parseInt(btn.dataset.choice, 10)));
    });
  }

  function tick() {
    state.timeLeft -= 1;
    $('game-timer').textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }

  function startGame() {
    order = shuffle(config.questions.map((_, i) => i));
    orderIdx = 0;
    state = { score: 0, level: 1, lives: LIVES_START, timeLeft: GAME_DURATION, correctStreak: 0, question: nextQuestion() };
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    renderQuestion();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = state.score;
    $('final-level').textContent = state.level;
    renderLeaderboard();
  }

  function handleChoice(choiceIdx) {
    if (!state || state.timeLeft <= 0) return;
    const buttons = document.querySelectorAll('#quiz-choices [data-choice]');
    buttons.forEach((b) => { b.disabled = true; });
    const correctIdx = state.question.correct;
    const feedback = $('game-feedback');

    if (choiceIdx === correctIdx) {
      state.score += 10 * state.level;
      state.correctStreak += 1;
      buttons[choiceIdx]?.classList.add('is-correct');
      feedback.textContent = window.S21_t ? window.S21_t('runtime_correct') : 'Correct! ✓';
      feedback.style.color = '#B7F5D8';
      if (state.correctStreak % LEVEL_UP_EVERY === 0) state.level += 1;
    } else {
      state.lives -= 1;
      buttons[choiceIdx]?.classList.add('is-wrong');
      buttons[correctIdx]?.classList.add('is-correct');
      feedback.textContent = '';
    }

    updateHud();

    setTimeout(() => {
      if (state.lives <= 0) { endGame(); return; }
      state.question = nextQuestion();
      renderQuestion();
      if (feedback) feedback.textContent = '';
    }, 900);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('quiz-choices')) return; // not on a quiz-game page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, state.score);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, state.score, { name, level: state.level });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    // Re-render the live question in the new language when the visitor
    // toggles languages mid-game, without resetting their progress.
    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => { if (state && state.timeLeft > 0) setTimeout(renderQuestion, 0); });
    });

    renderLeaderboard();
  });
})();
