import { getSessionUser, json, badRequest, unauthorized } from '../../../_lib/auth.js';

export async function onRequestPost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const body = await request.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isFinite(score)) return badRequest('A numeric score is required.');

  await env.DB.prepare(
    'INSERT INTO game_scores (user_id, game_id, score) VALUES (?, ?, ?)'
  ).bind(user.id, params.id, score).run();

  return json({ ok: true }, { status: 201 });
}
