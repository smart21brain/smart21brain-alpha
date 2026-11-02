import { hashPassword, createSession, sessionCookie, json, badRequest, unauthorized } from '../lib/auth.js';

let cachedKeys = null;
let cachedKeysExpires = 0;

function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}

async function googleClaims(token, clientId) {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (header.alg !== 'RS256' || !header.kid || !payload.sub || payload.iss !== 'https://accounts.google.com' || payload.aud !== clientId) return null;
  if (!payload.email || payload.email_verified !== true || payload.exp * 1000 <= Date.now()) return null;

  if (!cachedKeys || cachedKeysExpires < Date.now()) {
    const response = await fetch('https://www.googleapis.com/oauth2/v3/certs');
    if (!response.ok) return null;
    cachedKeys = await response.json();
    cachedKeysExpires = Date.now() + 60 * 60 * 1000;
  }
  const jwk = cachedKeys.keys.find((key) => key.kid === header.kid);
  if (!jwk) return null;
  const cryptoKey = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']
  );
  const valid = await crypto.subtle.verify(
    'RSASSA-PKCS1-v1_5', cryptoKey, decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  return valid ? payload : null;
}

export async function config({ env }) {
  return json({ clientId: env.GOOGLE_CLIENT_ID || '' });
}

// Find (or create) the account for a verified Google identity and start a session.
async function completeGoogleSignIn(request, env, claims) {
  let account = await env.DB.prepare(
    'SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_sub = ?'
  ).bind('google', claims.sub).first();
  let isNewUser = false;
  let user;

  if (account) {
    user = await env.DB.prepare('SELECT id, name, email, role, avatar_key FROM users WHERE id = ?').bind(account.user_id).first();
  } else {
    user = await env.DB.prepare('SELECT id, name, email, role, avatar_key FROM users WHERE email = ?').bind(claims.email.toLowerCase()).first();
    if (!user) {
      const randomPassword = crypto.randomUUID();
      const { hash, salt } = await hashPassword(randomPassword);
      const result = await env.DB.prepare(
        'INSERT INTO users (name, email, password_hash, password_salt, role, avatar_key) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(claims.name || claims.email.split('@')[0], claims.email.toLowerCase(), hash, salt, 'user', claims.picture || null).run();
      user = { id: result.meta.last_row_id, name: claims.name || claims.email.split('@')[0], email: claims.email.toLowerCase(), role: 'user', avatar_key: claims.picture || null };
      isNewUser = true;
    }
    await env.DB.prepare(
      'INSERT INTO oauth_accounts (user_id, provider, provider_sub) VALUES (?, ?, ?)'
    ).bind(user.id, 'google', claims.sub).run();
  }

  const { token: sessionToken, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    'INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)'
  ).bind(user.id, request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || null, request.headers.get('User-Agent') || null).run();
  return { user, isNewUser, cookie: sessionCookie(sessionToken, expires) };
}

// POST /api/auth/google  (JSON {credential}) — used by the script-based flow.
export async function signIn({ request, env }) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.credential === 'string' ? body.credential : '';
  const clientId = env.GOOGLE_CLIENT_ID || '';
  if (!token || !clientId) return badRequest('Google sign-in is not configured.');

  let claims;
  try { claims = await googleClaims(token, clientId); } catch (error) { claims = null; }
  if (!claims) return unauthorized('Google sign-in could not be verified.');

  const { user, isNewUser, cookie } = await completeGoogleSignIn(request, env, claims);
  return json({ user, isNewUser }, { headers: { 'Set-Cookie': cookie } });
}

function redirectTo(location, cookie) {
  const headers = new Headers({ Location: location });
  if (cookie) headers.append('Set-Cookie', cookie);
  return new Response(null, { status: 303, headers });
}

function getCookieValue(request, name) {
  const match = (request.headers.get('Cookie') || '').match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : '';
}

// POST /api/auth/google/redirect — Google posts the sign-in here (form data) after the
// full-page "Choose an account" screen, then we send the browser on to the site.
export async function redirectSignIn({ request, env }) {
  const fail = () => redirectTo('/login.html?google_error=1');
  const clientId = env.GOOGLE_CLIENT_ID || '';
  if (!clientId) return fail();

  let form;
  try { form = await request.formData(); } catch (error) { return fail(); }
  const token = String(form.get('credential') || '');
  const csrfBody = String(form.get('g_csrf_token') || '');
  const csrfCookie = getCookieValue(request, 'g_csrf_token');
  // Google's double-submit check: the cookie and the form value must match.
  if (!token || !csrfBody || !csrfCookie || csrfBody !== csrfCookie) return fail();

  let claims;
  try { claims = await googleClaims(token, clientId); } catch (error) { claims = null; }
  if (!claims) return fail();

  const { isNewUser, cookie } = await completeGoogleSignIn(request, env, claims);
  return redirectTo(`/auth-complete.html?new=${isNewUser ? 1 : 0}`, cookie);
}
