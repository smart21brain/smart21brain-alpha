import { getSessionUser, json, unauthorized } from '../lib/auth.js';
import { CATALOG } from '../lib/catalog-index.js';

// XP is a simple, transparent formula (no separate xp table): every quiz
// attempt and game play earns XP, computed on the fly from the activity
// that's already logged. Levels are just XP / 200, rounded down.
// Lessons count too: +10 XP per lesson completed (database courses AND the
// built-in catalog, whose progress is synced to the account) and +50 XP the
// first time a whole course is finished.
const XP_PER_LEVEL = 200;
const QUIZ_XP_BASE = 15;
const QUIZ_XP_ACCURACY_BONUS = 15; // up to +15 for a perfect score
const GAME_XP = 12;
const LESSON_XP = 10;
const COURSE_XP = 50;

// The catalog tables only exist once catalog-progress-schema.sql has been
// applied. Until then this must not break the dashboard — treat as "nothing yet".
async function safely(run, fallback) {
  try { return await run(); } catch { return fallback; }
}

// Computes the current day-streak (consecutive calendar days, ending
// today or yesterday, with at least one quiz attempt or game play) from
// a de-duplicated, descending list of 'YYYY-MM-DD' activity date strings.
function computeStreak(sortedDatesDesc) {
  if (!sortedDatesDesc.length) return 0;
  const oneDay = 24 * 60 * 60 * 1000;
  const today = new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00Z');
  const mostRecent = new Date(sortedDatesDesc[0] + 'T00:00:00Z');
  const gapFromToday = Math.round((today - mostRecent) / oneDay);
  if (gapFromToday > 1) return 0; // streak is broken if nothing since yesterday

  let streak = 1;
  let cursor = mostRecent;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const d = new Date(sortedDatesDesc[i] + 'T00:00:00Z');
    const gap = Math.round((cursor - d) / oneDay);
    if (gap === 1) { streak += 1; cursor = d; }
    else if (gap === 0) { continue; } // same-day duplicate, already deduped but be safe
    else break;
  }
  return streak;
}

export async function getDashboard({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const [
    quizStats, gameStats, recentQuizzes, recentGameActivity, recentGameScores,
    quizAttemptsForXp, gamePlaysForXp, activityDates, mathBadge, scienceBadge, distinctGames,
  ] = await Promise.all([
    env.DB.prepare(
      'SELECT COUNT(*) AS attempts, COALESCE(AVG(score * 1.0 / NULLIF(total, 0)), 0) AS avg_ratio FROM quiz_attempts WHERE user_id = ?'
    ).bind(user.id).first(),
    env.DB.prepare(
      'SELECT COUNT(*) AS plays, COALESCE(MAX(score), 0) AS best_score FROM game_scores WHERE user_id = ?'
    ).bind(user.id).first(),
    env.DB.prepare(
      `SELECT qa.score, qa.total, qa.completed_at, q.title
       FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? ORDER BY qa.completed_at DESC LIMIT 5`
    ).bind(user.id).all(),
    env.DB.prepare(
      'SELECT game_key AS title, score, played_at FROM game_activity WHERE user_id = ? ORDER BY played_at DESC LIMIT 5'
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT gs.score, gs.played_at, g.title
       FROM game_scores gs JOIN games g ON g.id = gs.game_id
       WHERE gs.user_id = ? ORDER BY gs.played_at DESC LIMIT 5`
    ).bind(user.id).all(),
    // Every quiz attempt's score/total, for the XP formula.
    env.DB.prepare('SELECT score, total FROM quiz_attempts WHERE user_id = ?').bind(user.id).all(),
    // Count every logged game play (both the catalog games table and the
    // client-side mini-games activity log) for the XP formula.
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM game_scores WHERE user_id = ?) +
         (SELECT COUNT(*) FROM game_activity WHERE user_id = ?) AS plays`
    ).bind(user.id, user.id).first(),
    // Distinct activity dates (quizzes + both game logs), for the streak.
    env.DB.prepare(
      `SELECT DISTINCT date(d) AS day FROM (
         SELECT completed_at AS d FROM quiz_attempts WHERE user_id = ?
         UNION ALL SELECT played_at AS d FROM game_scores WHERE user_id = ?
         UNION ALL SELECT played_at AS d FROM game_activity WHERE user_id = ?
       ) ORDER BY day DESC`
    ).bind(user.id, user.id, user.id).all(),
    // Badge: passed (>=70%) at least one quiz tagged as a math subject.
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? AND qa.total > 0 AND (qa.score * 1.0 / qa.total) >= 0.7
         AND LOWER(COALESCE(q.subject, '')) LIKE '%math%'`
    ).bind(user.id).first(),
    // Badge: same, for a science-tagged quiz.
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? AND qa.total > 0 AND (qa.score * 1.0 / qa.total) >= 0.7
         AND LOWER(COALESCE(q.subject, '')) LIKE '%science%'`
    ).bind(user.id).first(),
    // Badge: played at least 3 different games (variety, not just repeats).
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT DISTINCT 'g' || game_id AS gkey FROM game_scores WHERE user_id = ?
         UNION SELECT DISTINCT 'a' || game_key AS gkey FROM game_activity WHERE user_id = ?
       )`
    ).bind(user.id, user.id).first(),
  ]);

  // --- Course activity: lessons + finished courses (database courses and the built-in catalog) ---
  const uid = user.id;
  const [dbLessons, catalogLessons, dbCompleted, catalogCompleted] = await Promise.all([
    safely(() => env.DB.prepare('SELECT completed_at FROM lesson_progress WHERE user_id = ? AND completed = 1').bind(uid).all(), { results: [] }),
    safely(() => env.DB.prepare('SELECT completed_at FROM catalog_progress WHERE user_id = ?').bind(uid).all(), { results: [] }),
    safely(() => env.DB.prepare(
      `SELECT cc.slug AS category FROM course_enrollments e
       JOIN courses c ON c.id = e.course_id LEFT JOIN course_categories cc ON cc.id = c.category_id
       WHERE e.user_id = ? AND e.status = 'completed'`
    ).bind(uid).all(), { results: [] }),
    safely(() => env.DB.prepare('SELECT course_slug FROM catalog_enrollments WHERE user_id = ? AND completed_at IS NOT NULL').bind(uid).all(), { results: [] }),
  ]);
  const lessonsCompleted = dbLessons.results.length + catalogLessons.results.length;
  const completedCategories = new Set([
    ...dbCompleted.results.map((r) => r.category),
    ...catalogCompleted.results.map((r) => (CATALOG[r.course_slug] || {}).category),
  ].filter(Boolean));
  const coursesCompleted = dbCompleted.results.length + catalogCompleted.results.length;

  // --- XP & level ---
  let xp = 0;
  for (const attempt of quizAttemptsForXp.results) {
    const ratio = attempt.total > 0 ? attempt.score / attempt.total : 0;
    xp += QUIZ_XP_BASE + Math.round(ratio * QUIZ_XP_ACCURACY_BONUS);
  }
  xp += (gamePlaysForXp.plays || 0) * GAME_XP;
  xp += lessonsCompleted * LESSON_XP + coursesCompleted * COURSE_XP;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  // --- Streak ---
  // A day with a finished lesson keeps the streak alive, just like a quiz or a game does.
  const lessonDays = [...dbLessons.results, ...catalogLessons.results]
    .map((r) => String(r.completed_at || '').slice(0, 10)).filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d));
  const allDays = [...new Set([...activityDates.results.map((r) => r.day), ...lessonDays])].sort().reverse();
  const streakDays = computeStreak(allDays);

  // --- Badges ---
  const quizAttempts = quizStats.attempts || 0;
  // Subject badges are earned by passing a quiz in that subject OR by
  // finishing a whole course in it. The reading / coding / creative badges
  // come from finishing a Languages / Computer Studies / Creative course.
  const badges = {
    math_master: mathBadge.n > 0 || completedCategories.has('mathematics'),
    science_star: scienceBadge.n > 0 || completedCategories.has('science'),
    quiz_champion: quizAttempts >= 10,
    streak_7: streakDays >= 7,
    explorer: distinctGames.n >= 3,
    book_explorer: completedCategories.has('languages'),
    coding_hero: completedCategories.has('computer-studies'),
    creative_star: completedCategories.has('creative'),
  };
  const earnedBadges = Object.keys(badges).filter((k) => badges[k]);

  return json({
    user,
    quiz_attempts: quizAttempts,
    quiz_avg_percent: Math.round((quizStats.avg_ratio || 0) * 100),
    games_played: gameStats.plays,
    best_game_score: gameStats.best_score,
    recent_quizzes: recentQuizzes.results,
    recent_games: [...recentGameActivity.results, ...recentGameScores.results],
    xp,
    lessons_completed: lessonsCompleted,
    courses_completed: coursesCompleted,
    level,
    xp_into_level: xpIntoLevel,
    xp_per_level: XP_PER_LEVEL,
    streak_days: streakDays,
    badges,
    earned_badges: earnedBadges,
    badge_total: Object.keys(badges).length,
  });
}
