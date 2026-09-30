import { getSessionUser, json, badRequest, forbidden, unauthorized } from '../lib/auth.js';

export async function sendMessage({ request, env }) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === 'string' ? body.name.trim() : '';
  const email = typeof body?.email === 'string' ? body.email.trim().toLowerCase() : '';
  const subject = typeof body?.subject === 'string' ? body.subject.trim() : '';
  const message = typeof body?.message === 'string' ? body.message.trim() : '';
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !subject || !message) {
    return badRequest('Name, valid email, subject, and message are required.');
  }
  await env.DB.prepare(
    'INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)'
  ).bind(name, email, body.phone?.trim() || null, subject, message).run();
  return json({ sent: true }, { status: 201 });
}

export async function listMessages({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();
  const { results } = await env.DB.prepare(
    'SELECT id, name, email, phone, subject, message, status, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100'
  ).all();
  return json({ messages: results });
}

export async function listSubscribers({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== 'admin') return forbidden();
  const { results } = await env.DB.prepare(
    'SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 1000'
  ).all();
  return json({ subscribers: results });
}