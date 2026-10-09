/* Smart21Brain — game-story-builder.js
   Tap the scrambled sentences in the right order to rebuild a short story
   from beginning to end. */
(function () {
  const LEADERBOARD_KEY = 's21-story-builder-scores';

  const STORIES = {
    easy: [
      { title: 'A Day at the Market', sentences: [
        'Amina woke up early on Saturday morning.',
        'She took a basket and walked to the market.',
        'She bought tomatoes, onions and rice.',
        'Amina walked back home with her full basket.',
        'That evening, her family enjoyed a delicious dinner.',
      ] },
      { title: 'The Lost Puppy', sentences: [
        'A small puppy wandered away from its home.',
        'A kind girl named Zawadi found the puppy in the street.',
        'Zawadi asked her neighbours if they knew the puppy.',
        'An old man recognised the puppy as his own.',
        'The puppy happily ran back home with its owner.',
      ] },
    ],
    medium: [
      { title: 'The School Football Match', sentences: [
        'The two school teams arrived early to warm up for the big match.',
        'The referee blew the whistle and the game began.',
        'In the second half, Juma scored a brilliant winning goal.',
        'The crowd cheered loudly as the final whistle blew.',
        'The winning team celebrated together and thanked their supporters.',
      ] },
      { title: 'Planting a Garden', sentences: [
        'Grandma decided it was time to plant a new vegetable garden.',
        'First, she dug up the soil and removed all the weeds.',
        'Next, she planted seeds for tomatoes, spinach and carrots.',
        'Every morning, she watered the young plants carefully.',
        'After a few weeks, tiny green shoots began to appear.',
      ] },
    ],
    hard: [
      { title: 'The Science Fair Project', sentences: [
        'Neema had two months to prepare her project for the school science fair.',
        'She decided to research how plants grow differently in sunlight versus shade.',
        'For several weeks, she carefully measured and recorded her plants\' growth.',
        'She organised her results into clear charts and a written report.',
        'On the day of the fair, Neema confidently presented her findings to the judges.',
        'To her delight, her hard work earned her first place in her category.',
      ] },
      { title: 'The Journey to the Coast', sentences: [
        'The family packed their bags the night before their long journey to the coast.',
        'They left home before sunrise to avoid the midday traffic and heat.',
        'Along the way, they stopped at a small village to buy fresh fruit.',
        'By early afternoon, they finally caught their first glimpse of the ocean.',
        'They spent the rest of the day swimming and building sandcastles on the beach.',
        'As the sun set, they sat together and watched the waves roll in.',
      ] },
    ],
  };

  let difficulty = 'easy';
  let pool = [];
  let story = null;
  let order = []; // shuffled indices into story.sentences
  let placed = []; // indices (into order) the player has placed, in click order
  let score = 0;
  let solved = 0;
  let mistakes = 0;

  function $(id) { return document.getElementById(id); }
  function shuffle(a) { const arr = a.slice(); for (let i = arr.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[arr[i], arr[j]] = [arr[j], arr[i]]; } return arr; }

  function refillPool() { pool = shuffle(STORIES[difficulty]); }

  function nextStory() {
    if (!pool.length) refillPool();
    story = pool.pop();
    let idxs;
    do { idxs = shuffle(story.sentences.map((_, i) => i)); } while (idxs.every((v, i) => v === i));
    order = idxs;
    placed = [];
    $('story-title').textContent = story.title;
    render();
  }

  function render() {
    const bank = $('story-bank');
    bank.innerHTML = order.map((sentIdx, pos) => {
      const used = placed.includes(pos);
      return `<button type="button" class="story-sentence-btn" data-pos="${pos}" ${used ? 'disabled' : ''}>${story.sentences[sentIdx]}</button>`;
    }).join('');
    bank.querySelectorAll('button:not(:disabled)').forEach((btn) => btn.addEventListener('click', () => pick(Number(btn.dataset.pos))));

    const answer = $('story-answer');
    answer.innerHTML = placed.map((pos, i) => `<div class="story-answer-line"><span class="story-num">${i + 1}.</span> ${story.sentences[order[pos]]}</div>`).join('');
  }

  function pick(pos) {
    placed.push(pos);
    const correctSoFar = placed.every((p, i) => order[p] === i);
    render();
    if (placed.length === story.sentences.length) {
      if (correctSoFar) {
        solved += 1;
        score += 20;
        $('game-score').textContent = score;
        $('story-solved').textContent = solved;
        $('story-feedback').textContent = 'Great story! ✓';
        $('story-feedback').style.color = '#0B6E4F';
        setTimeout(() => { $('story-feedback').textContent = ''; nextStory(); }, 1100);
      } else {
        mistakes += 1;
        $('story-feedback').textContent = 'Not quite the right order — try again!';
        $('story-feedback').style.color = 'var(--s21-accent)';
        setTimeout(() => { placed = []; $('story-feedback').textContent = ''; render(); }, 1100);
        if (mistakes >= 3) endGame();
      }
    }
  }

  function startGame() {
    difficulty = document.querySelector('.difficulty-btn.is-active')?.dataset.diff || 'easy';
    score = 0; solved = 0; mistakes = 0;
    refillPool();
    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    $('game-score').textContent = score;
    $('story-solved').textContent = solved;
    nextStory();
  }

  function endGame() {
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
    if (!$('story-bank')) return;

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
