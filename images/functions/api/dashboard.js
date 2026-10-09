import { getSessionUser, json, unauthorized } from '../_lib/auth.js';

export async function onRequestGet({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const [quizStats, gameStats, recentQuizzes, recentGames] = await Promise.all([
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
      `SELECT gs.score, gs.played_at, g.title
       FROM game_scores gs JOIN games g ON g.id = gs.game_id
       WHERE gs.user_id = ? ORDER BY gs.played_at DESC LIMIT 5`
    ).bind(user.id).all(),
  ]);

  return json({
    user,
    quiz_attempts: quizStats.attempts,
    quiz_avg_percent: Math.round((quizStats.avg_ratio || 0) * 100),
    games_played: gameStats.plays,
    best_game_score: gameStats.best_score,
    recent_quizzes: recentQuizzes.results,
    recent_games: recentGames.results,
  });
}
