/* Smart21Brain — game-clock-challenge.js
   An analog clock face is drawn with SVG at a random time. Read the hands
   and pick the correct time from four options. Difficulty controls the
   minute increments used (5-minute steps on Easy, 1-minute on Hard). */
(function () {
  const LEADERBOARD_KEY = 's21-clock-challenge-scores';
  const DURATION = 60;
  const STEP = { easy: 5, medium: 5, hard: 1 };

  let difficulty = 'easy';
  let hour = 0, minute = 0;
  let score = 0;
  let lives = 3;
  let timeLeft = DURATION;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }
  function pad(n) { return String(n).padStart(2, '0'); }
  function fmt(h, m) { const h12 = h % 12 === 0 ? 12 : h % 12; return `${h12}:${pad(m)}`; }

  function drawClock(h, m) {
    const cx = 100, cy = 100, r = 90;
    const minuteAngle = m * 6; // 360/60
    const hourAngle = (h % 12) * 30 + m * 0.5; // 360/12 + drift
    const minuteHand = handLine(cx, cy, minuteAngle, 68, 3);
    const hourHand = handLine(cx, cy, hourAngle, 46, 5);
    let ticks = '';
    for (let i = 0; i < 12; i++) {
      const a = (i * 30 - 90) * Math.PI / 180;
      const x1 = cx + Math.cos(a) * (r - 6), y1 = cy + Math.sin(a) * (r - 6);
      const x2 = cx + Math.cos(a) * (r - 14), y2 = cy + Math.sin(a) * (r - 14);
      ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="#fff" stroke-width="3" stroke-linecap="round"/>`;
    }
    $('clock-svg').innerHTML = `
      <circle cx="${cx}" cy="${cy}" r="${r}" fill="rgba(255,255,255,.12)" stroke="#fff" stroke-width="3"/>
      ${ticks}
      ${minuteHand}
      ${hourHand}
      <circle cx="${cx}" cy="${cy}" r="5" fill="var(--s21-secondary)"/>
    `;
  }

  function handLine(cx, cy, angleDeg, length, width) {
    const a = (angleDeg - 90) * Math.PI / 180;
    const x = cx + Math.cos(a) * length, y = cy + Math.sin(a) * length;
    return `<line x1="${cx}" y1="${cy}" x2="${x.toFixed(1)}" y2="${y.toFixed(1)}" stroke="#fff" stroke-width="${width}" stroke-linecap="round"/>`;
  }

  function nextClock() {
    const step = STEP[difficulty];
    hour = Math.floor(Math.random() * 12) + 1;
    minute = Math.floor(Math.random() * (60 / step)) * step;
    drawClock(hour, minute);

    const correct = fmt(hour, minute);
    const options = new Set([correct]);
    while (options.size < 4) {
      const dh = (hour + Math.floor(Math.random() * 12)) % 12 || 12;
      const dm = Math.floor(Math.random() * (60 / step)) * step;
      options.add(fmt(dh, dm));
    }
    const choices = shuffle([...options]);
    $('game-choices').innerHTML = choices.map((c, i) => `<button type="button" class="quiz-choice-btn" data-idx="${i}">${c}</button>`).join('');
    document.querySelectorAll('#game-choices .quiz-choice-btn').forEach((btn) => btn.addEventListener('click', () => handleAnswer(choices[Number(btn.dataset.idx)], correct)));
  }

  function handleAnswer(chosen, correct) {
    document.querySelectorAll('#game-choices .quiz-choice-btn').forEach((b) => { b.disabled = true; });
    const feedback = $('game-feedback');
    if (chosen === correct) {
      score += 10;
      $('game-score').textContent = score;
      feedback.textContent = 'Correct! ✓';
      feedback.style.color = '#0B6E4F';
    } else {
      lives -= 1;
      renderHearts();
      feedback.textContent = `It was ${correct}.`;
      feedback.style.color = 'var(--s21-accent)';
    }
    setTimeout(() => {
      feedback.textContent = '';
      if (lives <= 0) { endGame(); return; }
      nextClock();
    }, 900);
  }

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
    score = 0; lives = 3; timeLeft = DURATION;
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('game-score').textContent = score;
    $('game-timer').textContent = timeLeft;
    renderHearts();
    nextClock();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = score;
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
    if (!$('clock-svg')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
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
