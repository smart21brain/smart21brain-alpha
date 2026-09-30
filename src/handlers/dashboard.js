import { getSessionUser, json, unauthorized } from '../lib/auth.js';

// XP is a simple, transparent formula (no separate xp table): every quiz
// attempt and game play earns XP, computed on the fly from the activity
// that's already logged. Levels are just XP / 200, rounded down.
const XP_PER_LEVEL = 200;
const QUIZ_XP_BASE = 15;
const QUIZ_XP_ACCURACY_BONUS = 15; // up to +15 for a perfect score
const GAME_XP = 12;

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

  // --- XP & level ---
  let xp = 0;
  for (const attempt of quizAttemptsForXp.results) {
    const ratio = attempt.total > 0 ? attempt.score / attempt.total : 0;
    xp += QUIZ_XP_BASE + Math.round(ratio * QUIZ_XP_ACCURACY_BONUS);
  }
  xp += (gamePlaysForXp.plays || 0) * GAME_XP;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;

  // --- Streak ---
  const streakDays = computeStreak(activityDates.results.map((r) => r.day));

  // --- Badges ---
  const quizAttempts = quizStats.attempts || 0;
  const badges = {
    math_master: mathBadge.n > 0,
    science_star: scienceBadge.n > 0,
    quiz_champion: quizAttempts >= 10,
    streak_7: streakDays >= 7,
    explorer: distinctGames.n >= 3,
    // Not tracked by the backend yet — always locked until a reading /
    // coding / creative-work activity log exists.
    book_explorer: false,
    coding_hero: false,
    creative_star: false,
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
    level,
    xp_into_level: xpIntoLevel,
    xp_per_level: XP_PER_LEVEL,
    streak_days: streakDays,
    badges,
    earned_badges: earnedBadges,
    badge_total: Object.keys(badges).length,
  });
}
