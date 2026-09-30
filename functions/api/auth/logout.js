import { clearSessionCookie, json } from '../../_lib/auth.js';

export async function onRequestPost({ request, env }) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) {
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(match[1]).run();
  }
  return json({ ok: true }, { headers: { 'Set-Cookie': clearSessionCookie() } });
}
