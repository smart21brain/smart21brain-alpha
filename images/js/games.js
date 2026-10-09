/* Smart21Brain — games.js
   A self-contained arithmetic game engine shared by Addition Race,
   Multiplication Rush, and future number games. Each game page sets
   `window.S21_GAME_CONFIG` before this script loads to pick the operation
   and leaderboard key — everything else (timer, lives, levels, HUD,
   leaderboard) is shared. */
(function () {
  const LEVEL_UP_EVERY = 5; // correct answers
  const DIFF_RANGE = { easy: 0, medium: 1, hard: 2 };

  function toBinary(n) { return n.toString(2); }

  const OPERATIONS = {
    addition: {
      symbol: '+',
      make(level) {
        const max = 5 + level * 5;
        const a = randInt(1, max);
        const b = randInt(1, max);
        return { a, b, answer: a + b };
      },
    },
    multiplication: {
      symbol: '×',
      make(level) {
        const max = Math.min(2 + level, 12); // caps at ×12 tables
        const a = randInt(1, max);
        const b = randInt(1, 12);
        return { a, b, answer: a * b };
      },
    },
    sequence: {
      symbol: null,
      make(level) {
        const step = randInt(1, 3 + Math.floor(level / 2));
        const start = randInt(1, 10 + level * 2);
        const goUp = Math.random() > 0.3 || level < 2;
        const terms = [];
        let cur = start;
        for (let i = 0; i < 4; i++) {
          terms.push(cur);
          cur = goUp ? cur + step : cur - step;
        }
        return { terms, answer: cur, display: `${terms.join(', ')}, ?` };
      },
    },
    // Mixed +, -, x, ÷ — used by Math Speed Challenge. Difficulty widens the
    // number range and unlocks division/negative-friendly subtraction.
    mixed: {
      symbol: null,
      supportsDifficulty: true,
      make(level, difficulty) {
        const tier = DIFF_RANGE[difficulty] ?? 1;
        const max = [10, 20, 40][tier] + level * 4;
        const opsAvailable = tier === 0 ? ['+', '-'] : tier === 1 ? ['+', '-', '×'] : ['+', '-', '×', '÷'];
        const symbol = opsAvailable[randInt(0, opsAvailable.length - 1)];
        let a = randInt(1, max);
        let b = randInt(1, max);
        let answer;
        if (symbol === '+') answer = a + b;
        else if (symbol === '-') { if (b > a) [a, b] = [b, a]; answer = a - b; }
        else if (symbol === '×') { a = randInt(1, Math.min(12, max)); b = randInt(1, 12); answer = a * b; }
        else { b = randInt(2, Math.min(12, max)); answer = randInt(1, 12); a = b * answer; }
        return { a, b, answer, display: `${a} ${symbol} ${b} = ?` };
      },
    },
    // Binary <-> Decimal, direction picked at random each round — Binary Numbers Challenge.
    binary: {
      symbol: null,
      supportsDifficulty: true,
      make(level, difficulty) {
        const tier = DIFF_RANGE[difficulty] ?? 1;
        const max = [15, 63, 255][tier];
        const n = randInt(0, max);
        const toBin = Math.random() < 0.5;
        return toBin
          ? { n, answer: toBinary(n), display: `Decimal ${n} = ? (write in binary)` }
          : { n, answer: String(n), display: `Binary ${toBinary(n)} = ? (write in decimal)` };
      },
      checkAnswer(raw, problem) { return raw.trim().replace(/^0+(?=\d)/, '') === problem.answer.replace(/^0+(?=\d)/, ''); },
    },
    // Solve for x in simple linear equations — Equation Solver.
    equation: {
      symbol: null,
      supportsDifficulty: true,
      make(level, difficulty) {
        const tier = DIFF_RANGE[difficulty] ?? 1;
        const xMax = [10, 15, 25][tier];
        const x = randInt(1, xMax);
        const a = randInt(2, [4, 6, 9][tier]);
        const bMax = [15, 30, 50][tier];
        const b = randInt(0, bMax);
        const useSubtract = Math.random() < 0.5 && tier > 0;
        const c = useSubtract ? a * x - b : a * x + b;
        const display = useSubtract ? `${a}x − ${b} = ${c}   (find x)` : `${a}x + ${b} = ${c}   (find x)`;
        return { a, b, c, answer: x, display };
      },
    },
    // Exact-division problems — Division Challenge.
    division: {
      symbol: '÷',
      supportsDifficulty: true,
      make(level, difficulty) {
        const tier = DIFF_RANGE[difficulty] ?? 1;
        const bMax = [10, 12, 12][tier];
        const quotMax = [10, 20, 50][tier];
        const b = randInt(2, bMax);
        const answer = randInt(1, quotMax);
        const a = b * answer;
        return { a, b, answer, display: `${a} ÷ ${b} = ?` };
      },
    },
  };

  const config = window.S21_GAME_CONFIG || { operation: 'addition', leaderboardKey: 's21-addition-race-scores' };
  const op = OPERATIONS[config.operation] || OPERATIONS.addition;
  const LEADERBOARD_KEY = config.leaderboardKey;
  const GAME_DURATION = config.duration || 60;
  const LIVES_START = config.lives || 3;
  let difficulty = 'medium';

  let state = null;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function randInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

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

  function renderProblem() {
    if (state.problem.display) {
      $('game-problem').textContent = state.problem.display;
    } else {
      $('game-problem').textContent = `${state.problem.a} ${op.symbol} ${state.problem.b} = ?`;
    }
  }

  function updateHud() {
    $('game-score').textContent = state.score;
    $('game-level').textContent = state.level;
    $('game-timer').textContent = state.timeLeft;
    renderHearts();
  }

  function tick() {
    state.timeLeft -= 1;
    $('game-timer').textContent = state.timeLeft;
    if (state.timeLeft <= 0) endGame();
  }

  function startGame() {
    state = { score: 0, level: 1, lives: LIVES_START, timeLeft: GAME_DURATION, correctStreak: 0, problem: op.make(1, difficulty) };
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    renderProblem();
    const input = $('game-answer-input');
    input.value = '';
    input.focus();
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

  function handleAnswer(e) {
    e.preventDefault();
    if (!state || state.timeLeft <= 0) return;
    const input = $('game-answer-input');
    const raw = input.value;
    const value = op.checkAnswer ? null : parseInt(raw, 10);
    const isCorrect = op.checkAnswer ? op.checkAnswer(raw, state.problem) : value === state.problem.answer;
    const feedback = $('game-feedback');

    if (isCorrect) {
      state.score += 10 * state.level;
      state.correctStreak += 1;
      feedback.textContent = window.S21_t ? window.S21_t('runtime_correct') : 'Correct! ✓';
      feedback.style.color = '#0B6E4F';
      if (state.correctStreak % LEVEL_UP_EVERY === 0) state.level += 1;
    } else {
      state.lives -= 1;
      feedback.textContent = window.S21_t
        ? `${window.S21_t('runtime_not_quite')} ${state.problem.answer}.`
        : `Not quite — it was ${state.problem.answer}.`;
      feedback.style.color = 'var(--s21-accent)';
    }

    input.value = '';
    updateHud();

    if (state.lives <= 0) { endGame(); return; }

    state.problem = op.make(state.level, difficulty);
    renderProblem();
    input.focus();
    setTimeout(() => { if (feedback) feedback.textContent = ''; }, 900);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn')) return; // not on a game page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('game-answer-form')?.addEventListener('submit', handleAnswer);

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
