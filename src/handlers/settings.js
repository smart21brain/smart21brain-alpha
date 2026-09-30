import { getSessionUser, json, badRequest, unauthorized, forbidden } from '../lib/auth.js';

// Keys the admin console is allowed to read/write. Keeping an allowlist
// here (rather than trusting arbitrary keys from the client) means a
// stray request body can't create junk rows in site_settings.
const KNOWN_KEYS = ['require_content_review', 'allow_public_comments', 'maintenance_mode'];

// Public: anything that needs to know if maintenance mode is on, etc.,
// without requiring an admin session (e.g. a future maintenance banner).
export async function getSettings({ env }) {
  const { results } = await env.DB.prepare('SELECT key, value FROM site_settings').all();
  const settings = {};
  for (const key of KNOWN_KEYS) settings[key] = false; // sane defaults if a row is ever missing
  for (const row of results) settings[row.key] = row.value === 'true';
  return json({ settings });
}

// Admin only: flip one or more settings. Body: { key: boolean, ... }
export async function updateSettings({ request, env }) {
  const admin = await getSessionUser(request, env.DB);
  if (!admin) return unauthorized();
  if (admin.role !== 'admin') return forbidden();

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') return badRequest('Expected a JSON object of settings.');

  const entries = Object.entries(body).filter(([key]) => KNOWN_KEYS.includes(key));
  if (entries.length === 0) {
    return badRequest(`No recognized settings in request. Known keys: ${KNOWN_KEYS.join(', ')}`);
  }

  for (const [key, value] of entries) {
    await env.DB.prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) " +
      'ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at'
    ).bind(key, value ? 'true' : 'false').run();
  }

  return json({ ok: true });
}
