import { json, badRequest } from '../lib/auth.js';

export async function subscribe({ request, env }) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest('A valid email address is required.');
  }

  await env.DB.prepare(
    'INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)'
  ).bind(email).run();

  return json({ subscribed: true });
}