// Smart21Brain — shared auth helpers for Cloudflare Pages Functions.
// Uses Web Crypto (available in the Workers runtime) — no npm deps needed.

const PBKDF2_ITERATIONS = 100000;
const SESSION_DAYS = 30;

function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function fromHex(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  return bytes;
}

export async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt, iterations: PBKDF2_ITERATIONS, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}

export async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === hashHex;
}

function randomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function createSession(db, userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  await db.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)')
    .bind(token, userId, expires).run();
  return { token, expires };
}

export function sessionCookie(token, expires) {
  const expiresStr = new Date(expires).toUTCString();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresStr}`;
}

export function clearSessionCookie() {
  return 's21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0';
}

function getCookie(request, name) {
  const header = request.headers.get('Cookie') || '';
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}

// Looks up the session cookie and returns the user row, or null.
export async function getSessionUser(request, db) {
  const token = getCookie(request, 's21_session');
  if (!token) return null;
  const session = await db.prepare(
    'SELECT * FROM sessions WHERE token = ? AND expires_at > datetime(\'now\')'
  ).bind(token).first();
  if (!session) return null;
  const user = await db.prepare(
    'SELECT id, name, email, role, avatar_key, created_at FROM users WHERE id = ?'
  ).bind(session.user_id).first();
  return user || null;
}

export function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init.headers || {}) },
  });
}

export function badRequest(message) {
  return json({ error: message }, { status: 400 });
}
export function unauthorized(message = 'Not signed in') {
  return json({ error: message }, { status: 401 });
}
export function forbidden(message = 'Admins only') {
  return json({ error: message }, { status: 403 });
}
export function notFound(message = 'Not found') {
  return json({ error: message }, { status: 404 });
}

export function slugify(text) {
  return text.toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || `item-${Date.now()}`;
}
