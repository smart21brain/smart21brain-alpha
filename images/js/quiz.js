/* Smart21Brain — quiz.js
   A self-contained multiple-choice quiz engine with instant feedback,
   explanations, a timer per question, and a results screen. */
(function () {
  const DEMO_QUESTIONS = [
    {
      question: 'Which planet is known as the Red Planet?',
      options: ['Venus', 'Mars', 'Jupiter', 'Saturn'],
      correct: 1,
      explanation: 'Mars looks red because its surface is covered in iron oxide — the same thing that makes rust red.',
    },
    {
      question: 'What is 7 × 8?',
      options: ['54', '56', '64', '48'],
      correct: 1,
      explanation: '7 × 8 = 56. A quick trick: 7 × 8 is the same as 7 × 4, doubled — 28 × 2 = 56.',
    },
    {
      question: 'Which organ pumps blood around the human body?',
      options: ['Lungs', 'Liver', 'Heart', 'Kidneys'],
      correct: 2,
      explanation: 'The heart is a muscle that beats around 100,000 times a day, pushing blood through your whole body.',
    },
    {
      question: 'What do plants need, along with water and sunlight, to make their own food?',
      options: ['Oxygen', 'Carbon dioxide', 'Nitrogen', 'Helium'],
      correct: 1,
      explanation: 'Plants take in carbon dioxide and, using sunlight, turn it into food through photosynthesis — releasing oxygen as a result.',
    },
    {
      question: 'Which of these is the capital of Tanzania\'s official seat of government?',
      options: ['Dar es Salaam', 'Dodoma', 'Arusha', 'Mwanza'],
      correct: 1,
      explanation: 'Dodoma is Tanzania\'s official capital, while Dar es Salaam remains the largest city and main commercial hub.',
    },
  ];

  let QUESTIONS = DEMO_QUESTIONS;
  let liveQuizId = null;

  const QUESTION_TIME = 20; // seconds
  let current = 0;
  let score = 0;
  let answered = false;
  let timerId = null;
  let timeLeft = QUESTION_TIME;
  const answers = [];

  function $(id) { return document.getElementById(id); }
  const letters = ['A', 'B', 'C', 'D'];

  function renderProgress() {
    const track = $('quiz-progress-track');
    if (!track) return;
    track.innerHTML = QUESTIONS.map((_, i) => {
      const cls = i < current ? 'done' : i === current ? 'current' : '';
      return `<span class="${cls}"></span>`;
    }).join('');
  }

  function renderQuestion() {
    answered = false;
    timeLeft = QUESTION_TIME;
    const q = QUESTIONS[current];
    $('quiz-question-count').textContent = `Question ${current + 1} of ${QUESTIONS.length}`;
    $('quiz-question-text').textContent = q.question;
    $('quiz-score').textContent = score;
    $('quiz-timer').textContent = timeLeft;
    $('quiz-explanation').classList.add('d-none');
    $('quiz-next-btn').classList.add('d-none');
    renderProgress();

    const optionsEl = $('quiz-options');
    optionsEl.innerHTML = q.options.map((opt, i) => `
      <button type="button" class="quiz-option" data-index="${i}">
        <span class="opt-letter">${letters[i]}</span> <span>${opt}</span>
      </button>
    `).join('');

    optionsEl.querySelectorAll('.quiz-option').forEach((btn) => {
      btn.addEventListener('click', () => selectAnswer(parseInt(btn.dataset.index, 10)));
    });

    clearInterval(timerId);
    timerId = setInterval(() => {
      timeLeft -= 1;
      $('quiz-timer').textContent = timeLeft;
      if (timeLeft <= 0) selectAnswer(-1); // time's up = no answer
    }, 1000);
  }

  function selectAnswer(index) {
    if (answered) return;
    answered = true;
    clearInterval(timerId);
    const q = QUESTIONS[current];
    const isCorrect = index === q.correct;
    if (isCorrect) score += 1;
    answers.push({ index, isCorrect });

    $('quiz-options').querySelectorAll('.quiz-option').forEach((btn, i) => {
      btn.disabled = true;
      if (i === q.correct) btn.classList.add('is-correct');
      else if (i === index) btn.classList.add('is-wrong');
    });

    $('quiz-score').textContent = score;
    const explEl = $('quiz-explanation');
    explEl.classList.remove('d-none');
    explEl.querySelector('.expl-icon').innerHTML = isCorrect
      ? '<i class="fa-solid fa-circle-check" style="color:#0B6E4F"></i>'
      : '<i class="fa-solid fa-circle-info" style="color:var(--s21-accent)"></i>';
    explEl.querySelector('.expl-text').textContent = q.explanation;
    $('quiz-next-btn').classList.remove('d-none');
    $('quiz-next-btn').textContent = current === QUESTIONS.length - 1 ? 'See results' : 'Next question';
  }

  function nextQuestion() {
    current += 1;
    if (current >= QUESTIONS.length) { showResults(); return; }
    renderQuestion();
  }

  function showResults() {
    clearInterval(timerId);
    $('quiz-play-screen').classList.add('d-none');
    $('quiz-results-screen').classList.remove('d-none');
    const pct = Math.round((score / QUESTIONS.length) * 100);
    $('quiz-final-score').textContent = `${score} / ${QUESTIONS.length}`;
    $('quiz-final-pct').textContent = `${pct}%`;

    if (liveQuizId && window.S21_submitQuizAttempt) {
      window.S21_submitQuizAttempt(liveQuizId, answers.map((a) => a.index));
    }

    let message, icon;
    if (pct === 100) { message = 'Perfect score — Quiz Champion!'; icon = 'fa-trophy'; }
    else if (pct >= 60) { message = 'Nice work — you know your stuff!'; icon = 'fa-star'; }
    else { message = 'Good try — a quick review and you\'ve got this.'; icon = 'fa-book'; }
    $('quiz-result-message').textContent = message;
    $('quiz-result-emoji').innerHTML = `<i class="fa-solid ${icon}"></i>`;
  }

  function restart() {
    current = 0; score = 0; answered = false; answers.length = 0;
    $('quiz-results-screen').classList.add('d-none');
    $('quiz-start-screen').classList.add('d-none');
    $('quiz-play-screen').classList.remove('d-none');
    renderQuestion();
  }

  document.addEventListener('DOMContentLoaded', async () => {
    if (!$('quiz-start-btn')) return; // not on the quiz page

    if (window.S21_loadLiveQuiz) {
      const live = await window.S21_loadLiveQuiz();
      if (live && live.questions.length > 0) {
        QUESTIONS = live.questions;
        liveQuizId = live.id;
      }
    }

    $('quiz-start-btn').addEventListener('click', () => {
      $('quiz-start-screen').classList.add('d-none');
      $('quiz-play-screen').classList.remove('d-none');
      renderQuestion();
    });
    $('quiz-next-btn').addEventListener('click', nextQuestion);
    $('quiz-retry-btn').addEventListener('click', restart);
  });
})();
