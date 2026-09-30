/* Smart21Brain — quiz-engine.js
   A reusable timed, multiple-choice quiz engine (score, level, lives,
   streak, difficulty, leaderboard). Each quiz page sets
   `window.S21_QUIZ_CONFIG` before this script loads:
     {
       leaderboardKey: 'string',
       duration: 60,               // seconds, optional
       lives: 3,                   // optional
       generateQuestion(level, difficulty) => { prompt, choices: [4 strings], correctIndex }
     }
   Markup contract (same ids across every quiz page):
   #game-start-screen #game-play-screen #game-over-screen #game-start-btn
   #game-restart-btn #game-score #game-level #game-timer #game-lives
   #game-question #game-choices #game-feedback #final-score #final-level
   #game-leaderboard #game-save-score-form #game-player-name #game-saved-msg
   Optional: .difficulty-btn[data-diff] buttons on the start screen. */
(function () {
  const config = window.S21_QUIZ_CONFIG;
  if (!config || !config.generateQuestion) return;

  const LEVEL_UP_EVERY = 4;
  const GAME_DURATION = config.duration || 60;
  const LIVES_START = config.lives || 3;
  const LEADERBOARD_KEY = config.leaderboardKey;
  let difficulty = 'medium';

  let state = null;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function escapeHtml(str) { const d = document.createElement('div'); d.textContent = str == null ? '' : String(str); return d.innerHTML; }

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }
  function saveScore(name, score) {
    const board = getLeaderboard();
    board.push({ name, score, date: new Date().toISOString() });
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
    if ($('game-timer')) $('game-timer').textContent = state.timeLeft;
    renderHearts();
  }

  function tick() {
    state.timeLeft -= 1;
    if ($('game-timer')) $('game-timer').textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }

  function renderQuestion() {
    $('game-question').textContent = state.question.prompt;
    const wrap = $('game-choices');
    wrap.innerHTML = state.question.choices.map((choice, i) => `
      <button type="button" class="quiz-choice-btn" data-idx="${i}">${escapeHtml(choice)}</button>
    `).join('');
    wrap.querySelectorAll('.quiz-choice-btn').forEach((btn) => btn.addEventListener('click', () => handleAnswer(Number(btn.dataset.idx))));
  }

  function nextQuestion() {
    state.question = config.generateQuestion(state.level, difficulty);
    renderQuestion();
  }

  function startGame() {
    state = { score: 0, level: 1, lives: LIVES_START, timeLeft: GAME_DURATION, correctStreak: 0, question: null };
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    nextQuestion();
    clearInterval(timerId);
    if (GAME_DURATION) timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = state.score;
    if ($('final-level')) $('final-level').textContent = state.level;
    renderLeaderboard();
  }

  function handleAnswer(idx) {
    if (!state) return;
    const wrap = $('game-choices');
    const buttons = wrap.querySelectorAll('.quiz-choice-btn');
    buttons.forEach((b) => { b.disabled = true; });
    const feedback = $('game-feedback');
    const correct = idx === state.question.correctIndex;

    buttons[state.question.correctIndex]?.classList.add('is-correct');
    if (!correct) buttons[idx]?.classList.add('is-wrong');

    if (correct) {
      state.score += 10 * state.level;
      state.correctStreak += 1;
      if (feedback) { feedback.textContent = window.S21_t ? window.S21_t('runtime_correct') : 'Correct! ✓'; feedback.style.color = '#0B6E4F'; }
      if (state.correctStreak % LEVEL_UP_EVERY === 0) state.level += 1;
    } else {
      state.lives -= 1;
      if (feedback) { feedback.textContent = ''; feedback.style.color = 'var(--s21-accent)'; }
    }
    updateHud();

    setTimeout(() => {
      if (feedback) feedback.textContent = '';
      if (state.lives <= 0) { endGame(); return; }
      nextQuestion();
    }, 850);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('game-choices')) return; // not on a quiz-engine page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    const diffBtns = document.querySelectorAll('.difficulty-btn[data-diff]');
    if (diffBtns.length) {
      diffBtns.forEach((btn) => btn.addEventListener('click', () => {
        difficulty = btn.dataset.diff;
        diffBtns.forEach((b) => b.classList.toggle('is-active', b === btn));
      }));
    }

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

    renderLeaderboard();
  });
})();
