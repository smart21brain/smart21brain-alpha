/* Smart21Brain — memory-game.js
   A shared flip-and-match memory game engine used by Memory Cards,
   Fractions Match and Human Body Match. Each page sets
   `window.S21_MEMORY_CONFIG = { leaderboardKey, pairs: [...] }` before
   this script loads. Each pair is bilingual:
     { id, en: 'label', sw: 'label', emoji: '🦁' (optional) }
   Two cards share the same `id` and must be flipped one after another to
   match. Score is based on fewer moves and less time — lower is better,
   so the leaderboard here shows moves instead of points. */
(function () {
  const config = window.S21_MEMORY_CONFIG || { leaderboardKey: 's21-memory-scores', pairs: [] };
  const LEADERBOARD_KEY = config.leaderboardKey;

  let cards = [];
  let flipped = [];
  let matchedCount = 0;
  let moves = 0;
  let seconds = 0;
  let timerId = null;
  let lock = false;

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
  function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function getLeaderboard() {
    try { return JSON.parse(localStorage.getItem(LEADERBOARD_KEY)) || []; } catch { return []; }
  }
  function saveScore(name, movesTaken, time) {
    const board = getLeaderboard();
    board.push({ name, moves: movesTaken, time, date: new Date().toISOString() });
    board.sort((a, b) => a.moves - b.moves || a.time - b.time);
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
        <span class="badge-pill">${entry.moves} moves · ${entry.time}s</span>
      </div>
    `).join('');
  }

  function label(card) {
    if (card.emoji) return card.emoji;
    const lang = getLang();
    return card[lang] || card.en;
  }

  function buildCards(pairs) {
    const cards = [];
    pairs.forEach((p) => {
      if (p.emoji) {
        cards.push({ id: p.id, emoji: p.emoji });
        cards.push({ id: p.id, emoji: p.emoji });
      } else if (p.a && p.b) {
        cards.push({ id: p.id, en: p.a.en, sw: p.a.sw });
        cards.push({ id: p.id, en: p.b.en, sw: p.b.sw });
      } else {
        cards.push({ id: p.id, en: p.en, sw: p.sw });
        cards.push({ id: p.id, en: p.en, sw: p.sw });
      }
    });
    return cards;
  }

  function renderGrid() {
    const grid = $('memory-grid');
    grid.innerHTML = cards.map((card, i) => `
      <div class="memory-card" data-idx="${i}">
        <div class="memory-card-inner">
          <div class="memory-card-face memory-card-front"><i class="fa-solid fa-question"></i></div>
          <div class="memory-card-face memory-card-back">${escapeHtml(label(card))}</div>
        </div>
      </div>
    `).join('');
    grid.querySelectorAll('.memory-card').forEach((el) => {
      el.addEventListener('click', () => handleFlip(parseInt(el.dataset.idx, 10)));
    });
  }

  function refreshLabelsOnly() {
    // Re-render text for already-revealed/matched cards when the visitor
    // toggles language mid-game, without disturbing flip state.
    document.querySelectorAll('.memory-card').forEach((el) => {
      const idx = parseInt(el.dataset.idx, 10);
      const back = el.querySelector('.memory-card-back');
      if (back) back.textContent = label(cards[idx]);
    });
  }

  function updateHud() {
    $('memory-moves').textContent = moves;
    $('memory-time').textContent = seconds;
  }

  function tick() { seconds += 1; $('memory-time').textContent = seconds; }

  function handleFlip(idx) {
    if (lock) return;
    const el = document.querySelector(`.memory-card[data-idx="${idx}"]`);
    if (!el || el.classList.contains('is-flipped') || el.classList.contains('is-matched')) return;

    el.classList.add('is-flipped');
    flipped.push(idx);

    if (flipped.length === 2) {
      moves += 1;
      updateHud();
      lock = true;
      const [a, b] = flipped;
      if (cards[a].id === cards[b].id) {
        setTimeout(() => {
          document.querySelector(`.memory-card[data-idx="${a}"]`)?.classList.add('is-matched');
          document.querySelector(`.memory-card[data-idx="${b}"]`)?.classList.add('is-matched');
          flipped = [];
          lock = false;
          matchedCount += 1;
          if (matchedCount === cards.length / 2) endGame();
        }, 500);
      } else {
        setTimeout(() => {
          document.querySelector(`.memory-card[data-idx="${a}"]`)?.classList.remove('is-flipped');
          document.querySelector(`.memory-card[data-idx="${b}"]`)?.classList.remove('is-flipped');
          flipped = [];
          lock = false;
        }, 800);
      }
    }
  }

  function startGame() {
    const doubled = shuffle(buildCards(config.pairs));
    cards = doubled;
    flipped = [];
    matchedCount = 0;
    moves = 0;
    seconds = 0;
    lock = false;

    $('game-start-screen').classList.add('d-none');
    $('game-over-screen').classList.add('d-none');
    $('game-play-screen').classList.remove('d-none');
    $('game-save-score-form')?.classList.remove('d-none');
    $('game-saved-msg')?.classList.add('d-none');
    updateHud();
    renderGrid();
    clearInterval(timerId);
    timerId = setInterval(tick, 1000);
  }

  function endGame() {
    clearInterval(timerId);
    $('game-play-screen').classList.add('d-none');
    $('game-over-screen').classList.remove('d-none');
    $('final-score').textContent = moves;
    $('final-level').textContent = seconds;
    renderLeaderboard();
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (!$('game-start-btn') || !$('memory-grid')) return; // not on a memory-game page

    $('game-start-btn').addEventListener('click', startGame);
    $('game-restart-btn')?.addEventListener('click', startGame);

    $('game-save-score-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      const nameInput = $('game-player-name');
      const name = nameInput.value.trim() || (window.S21_t ? window.S21_t('runtime_anonymous') : 'Anonymous');
      saveScore(name, moves, seconds);
      window.S21_recordGameScore?.(LEADERBOARD_KEY, moves, { name, time: seconds });
      nameInput.value = '';
      renderLeaderboard();
      $('game-save-score-form').classList.add('d-none');
      $('game-saved-msg').classList.remove('d-none');
      window.S21_toast?.(window.S21_t ? window.S21_t('runtime_score_saved_toast') : 'Score saved to the leaderboard!', { icon: 'fa-trophy' });
    });

    document.querySelectorAll('[data-lang-toggle]').forEach((btn) => {
      btn.addEventListener('click', () => setTimeout(refreshLabelsOnly, 0));
    });

    renderLeaderboard();
  });
})();
