import { getSessionUser, json, badRequest, unauthorized } from '../lib/auth.js';

export async function submitGameScore({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const gameKey = typeof body?.gameKey === 'string' ? body.gameKey.trim().slice(0, 80) : '';
  const score = Number(body?.score);
  if (!gameKey || !Number.isFinite(score) || score < 0) return badRequest('A game key and non-negative score are required.');
  await env.DB.prepare(
    'INSERT INTO game_activity (user_id, game_key, score, details) VALUES (?, ?, ?, ?)'
  ).bind(user.id, gameKey, score, JSON.stringify(body.details || {})).run();
  return json({ recorded: true }, { status: 201 });
}