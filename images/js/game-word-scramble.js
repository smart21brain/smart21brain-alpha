/* Smart21Brain — game-word-scramble.js
   Unscramble the letters to spell the word before time runs out. Tap
   letter tiles to build your answer; tap an answer tile to put it back. */
(function () {
  const LEADERBOARD_KEY = 's21-word-scramble-scores';
  const DURATION = 90;

  const BANK = {
    easy: [
      ['cat', 'Animal'], ['dog', 'Animal'], ['sun', 'Sky'], ['pen', 'School'], ['bag', 'School'],
      ['book', 'School'], ['fish', 'Animal'], ['milk', 'Food'], ['rain', 'Weather'], ['tree', 'Nature'],
      ['moon', 'Sky'], ['star', 'Sky'], ['leaf', 'Nature'], ['ball', 'Toy'], ['blue', 'Colour'],
    ],
    medium: [
      ['orange', 'Fruit'], ['school', 'Place'], ['pencil', 'School'], ['garden', 'Place'], ['yellow', 'Colour'],
      ['planet', 'Science'], ['insect', 'Science'], ['bridge', 'Place'], ['forest', 'Nature'], ['rocket', 'Science'],
      ['guitar', 'Music'], ['friend', 'People'], ['market', 'Place'], ['island', 'Geography'], ['museum', 'Place'],
    ],
    hard: [
      ['elephant', 'Animal'], ['dinosaur', 'Science'], ['mountain', 'Geography'], ['computer', 'Technology'],
      ['triangle', 'Maths'], ['calendar', 'Time'], ['hospital', 'Place'], ['umbrella', 'Object'],
      ['keyboard', 'Technology'], ['language', 'School'], ['exercise', 'Health'], ['continent', 'Geography'],
      ['chemistry', 'Science'], ['adventure', 'Story'], ['astronaut', 'Science'],
    ],
  };

  let difficulty = 'easy';
  let pool = [];
  let currentWord = '';
  let currentClue = '';
  let letters = [];
  let answerIdx = [];
  let score = 0;
  let streak = 0;
  let solved = 0;
  let timeLeft = DURATION;
  let timerId = null;

  function $(id) { return document.getElementById(id); }
  function shuffle(arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; }

  function refillPool() { pool = shuffle(BANK[difficulty]); }

  function nextWord() {
    if (!pool.length) refillPool();
    const [word, clue] = pool.pop();
    currentWord = word;
    currentClue = clue;
    let shuffled = word.split('');
    do { shuffled = shuffle(shuffled); } while (shuffled.join('') === word);
    letters = shuffled;
    answerIdx = [];
    renderWord();
  }

  function renderWord() {
    $('scramble-clue').textContent = `Category: ${currentClue} · ${currentWord.length} letters`;
    const bank = $('scramble-letters');
    bank.innerHTML = letters.map((ch, i) => `<button type="button" class="scramble-letter-btn" data-i="${i}" ${answerIdx.includes(i) ? 'disabled' : ''}>${ch.toUpperCase()}</button>`).join('');
    bank.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => pickLetter(Number(btn.dataset.i))));

    const ans = $('scramble-answer');
    ans.innerHTML = answerIdx.map((i, pos) => `<button type="button" class="scramble-letter-btn" data-pos="${pos}">${letters[i].toUpperCase()}</button>`).join('');
    ans.querySelectorAll('button').forEach((btn) => btn.addEventListener('click', () => removeLetter(Number(btn.dataset.pos))));
  }

  function pickLetter(i) {
    if (answerIdx.includes(i)) return;
    answerIdx.push(i);
    renderWord();
    if (answerIdx.length === letters.length) checkAnswer();
  }

  function removeLetter(pos) {
    answerIdx.splice(pos, 1);
    renderWord();
  }

  function checkAnswer() {
    const attempt = answerIdx.map((i) => letters[i]).join('');
    const feedback = $('scramble-feedback');
    if (attempt === currentWord) {
      streak += 1; solved += 1;
      score += 10 + streak * 2;
      feedback.textContent = 'Correct! ✓';
      feedback.style.color = '#0B6E4F';
      updateHud();
      setTimeout(() => { feedback.textContent = ''; nextWord(); }, 700);
    } else {
      streak = 0;
      feedback.textContent = 'Not quite — try again!';
      feedback.style.color = 'var(--s21-accent)';
      updateHud();
      setTimeout(() => { answerIdx = []; feedback.textContent = ''; renderWord(); }, 700);
    }
  }

  function skipWord() {
    streak = 0;
    updateHud();
    nextWord();
  }

  function updateHud() {
    $('game-score').textContent = score;
    $('scramble-solved').textContent = solved;
    $('scramble-streak').textContent = streak;
  }

  function tick() {
    timeLeft -= 1;
    $('game-timer').textContent = timeLeft;
    if (timeLeft <= 0) endGame();
  }

  function startGame() {
    difficulty = document.querySelector('.difficulty-btn.is-active')?.dataset.diff || 'easy';
    score = 0; streak = 0; solved = 0; timeLeft = DURATION;
    refillPool();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    $('game-timer').textContent = timeLeft;
    nextWord();
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
    if (!$('scramble-letters')) return;

    document.querySelectorAll('.difficulty-btn[data-diff]').forEach((btn) => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.difficulty-btn[data-diff]').forEach((b) => b.classList.toggle('is-active', b === btn));
      });
    });

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);
    $('scramble-skip-btn')?.addEventListener('click', skipWord);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || 'Anonymous';
      saveScore(name, score);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, score, { name, solved });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.('Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    renderLeaderboard();
  });
})();
