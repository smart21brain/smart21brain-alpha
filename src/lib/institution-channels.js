// Smart21Institution — notification channels: e-mail, SMS and web push.
//
// How it fits together
//   notify()  (institution-auth.js)  writes the in-app notification AND, when at least one channel is
//   configured on the server, one row per channel in ins_outbox.
//   flushOutbox()  (here) is called right after the request that created the notice (ctx.waitUntil) and by the
//   cron trigger every few minutes. It decides, per row, whether the notice may really be sent:
//        server provider configured  →  institution switch on  →  person's own switch on  →  address available
//   and marks the row sent / failed / skipped (with a plain reason) so nothing is lost silently.
//
// Providers (all optional; set them as Worker secrets, nothing is stored in the code):
//   E-mail   Resend (https://resend.com)           RESEND_API_KEY, EMAIL_FROM  ("Name <no-reply@your-domain>")
//   SMS      Africa's Talking                      AT_API_KEY, AT_USERNAME, [AT_SENDER_ID]
//            or Twilio                             TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_FROM
//            SMS_DEFAULT_COUNTRY_CODE  (digits, default "255") turns 0712… into +255712…
//   Push     Web Push with VAPID                   VAPID_PRIVATE_JWK  (run: node scripts/generate-vapid.mjs), [VAPID_SUBJECT]
//   Links    SITE_URL  (e.g. https://smart21brain.com) is used for the "Open" link inside e-mails.
//
// Web push is sent WITHOUT a payload (a "tickle"): the service worker wakes up and reads the newest
// notification from the signed-in session. That keeps message text out of the push service entirely
// and avoids payload encryption.

// Set by notify() when a notice was queued, read by secure() to start delivery after the response.
export const outboxState = { dirty: false };

const MAX_ATTEMPTS = 3;
const SMS_KINDS = new Set(['overdue', 'security', 'academic']);   // others only if notify() asks for sms
const PUSH_HOSTS = [/(^|\.)googleapis\.com$/, /(^|\.)push\.services\.mozilla\.com$/, /(^|\.)notify\.windows\.com$/, /(^|\.)push\.apple\.com$/];

// ---------------------------------------------------------------- small helpers
const b64u = (buf) => { let s = ''; new Uint8Array(buf).forEach((c) => { s += String.fromCharCode(c); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const b64uToBytes = (str) => { const p = String(str).replace(/-/g, '+').replace(/_/g, '/'); const bin = atob(p + '='.repeat((4 - (p.length % 4)) % 4)); return Uint8Array.from(bin, (c) => c.charCodeAt(0)); };
const textB64u = (t) => b64u(new TextEncoder().encode(t));
const escHtml = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const timeout = (ms = 8000) => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined);

function vapidJwk(env) {
  try {
    const j = typeof env.VAPID_PRIVATE_JWK === 'string' ? JSON.parse(env.VAPID_PRIVATE_JWK) : env.VAPID_PRIVATE_JWK;
    return j && j.kty === 'EC' && j.crv === 'P-256' && j.d && j.x && j.y ? j : null;
  } catch (e) { return null; }
}
export const vapidPublicKey = (env) => { const j = vapidJwk(env); return j ? b64u(new Uint8Array([4, ...b64uToBytes(j.x), ...b64uToBytes(j.y)])) : null; };

export function smsProvider(env) {
  const want = String(env.SMS_PROVIDER || '').toLowerCase();
  const at = !!(env.AT_API_KEY && env.AT_USERNAME);
  const tw = !!(env.TWILIO_ACCOUNT_SID && env.TWILIO_AUTH_TOKEN && env.TWILIO_FROM);
  if (want === 'twilio' && tw) return 'twilio';
  if (want === 'africastalking' && at) return 'africastalking';
  return at ? 'africastalking' : tw ? 'twilio' : null;
}

// What this server can actually send (never reveals any secret).
export function channelStatus(env) {
  return {
    email: !!(env.RESEND_API_KEY && env.EMAIL_FROM),
    sms: !!smsProvider(env),
    sms_provider: smsProvider(env),
    push: !!vapidJwk(env),
    push_public_key: vapidPublicKey(env),
  };
}
export const channelsConfigured = (env) => { const s = channelStatus(env); return s.email || s.sms || s.push; };

export function normalisePhone(raw, env = {}) {
  let p = String(raw || '').replace(/[\s().-]/g, '');
  if (!p) return null;
  if (p.startsWith('00')) p = '+' + p.slice(2);
  if (p.startsWith('0')) p = '+' + String(env.SMS_DEFAULT_COUNTRY_CODE || '255').replace(/\D/g, '') + p.slice(1);
  if (!p.startsWith('+') && /^\d{11,15}$/.test(p)) p = '+' + p;       // 2557… without the plus
  return /^\+\d{8,15}$/.test(p) ? p : null;
}

export const isAllowedPushEndpoint = (endpoint) => {
  try { const u = new URL(endpoint); return u.protocol === 'https:' && endpoint.length <= 1000 && PUSH_HOSTS.some((re) => re.test(u.hostname)); } catch (e) { return false; }
};

// ---------------------------------------------------------------- senders (each returns { ok, retry, detail })
async function sendEmail(env, { to, subject, text, html }) {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST', signal: timeout(),
      headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: env.EMAIL_FROM, to: [to], subject, text, html }),
    });
    if (res.ok) return { ok: true };
    return { ok: false, retry: res.status === 429 || res.status >= 500, detail: `E-mail service answered ${res.status}` };
  } catch (e) { return { ok: false, retry: true, detail: 'E-mail service could not be reached' }; }
}

async function sendSms(env, { to, text }) {
  const provider = smsProvider(env);
  try {
    if (provider === 'africastalking') {
      const host = env.AT_USERNAME === 'sandbox' ? 'api.sandbox.africastalking.com' : 'api.africastalking.com';
      const form = new URLSearchParams({ username: env.AT_USERNAME, to, message: text });
      if (env.AT_SENDER_ID) form.set('from', env.AT_SENDER_ID);
      const res = await fetch(`https://${host}/version1/messaging`, { method: 'POST', signal: timeout(), headers: { apiKey: env.AT_API_KEY, Accept: 'application/json', 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
      if (!res.ok) return { ok: false, retry: res.status === 429 || res.status >= 500, detail: `SMS service answered ${res.status}` };
      const data = await res.json().catch(() => null);
      const r = data && data.SMSMessageData && data.SMSMessageData.Recipients && data.SMSMessageData.Recipients[0];
      return r && (r.statusCode === 101 || r.status === 'Success') ? { ok: true } : { ok: false, retry: false, detail: `SMS not accepted${r && r.status ? ': ' + r.status : ''}` };
    }
    if (provider === 'twilio') {
      const form = new URLSearchParams({ To: to, From: env.TWILIO_FROM, Body: text });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${encodeURIComponent(env.TWILIO_ACCOUNT_SID)}/Messages.json`, { method: 'POST', signal: timeout(), headers: { Authorization: 'Basic ' + btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`), 'Content-Type': 'application/x-www-form-urlencoded' }, body: form });
      return res.ok ? { ok: true } : { ok: false, retry: res.status === 429 || res.status >= 500, detail: `SMS service answered ${res.status}` };
    }
    return { ok: false, retry: false, detail: 'SMS is not configured' };
  } catch (e) { return { ok: false, retry: true, detail: 'SMS service could not be reached' }; }
}

let vapidKeyCache = { sig: '', key: null };
async function vapidSigningKey(env) {
  const jwk = vapidJwk(env); const sig = jwk.d + jwk.x;
  if (vapidKeyCache.sig !== sig) vapidKeyCache = { sig, key: await crypto.subtle.importKey('jwk', { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, d: jwk.d, ext: true }, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']) };
  return vapidKeyCache.key;
}
export async function vapidAuthHeader(env, endpoint) {
  const claims = { aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: env.VAPID_SUBJECT || 'mailto:admin@example.com' };
  const unsigned = `${textB64u(JSON.stringify({ typ: 'JWT', alg: 'ES256' }))}.${textB64u(JSON.stringify(claims))}`;
  const sig = await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, await vapidSigningKey(env), new TextEncoder().encode(unsigned));   // raw r||s, as JWT wants
  return `vapid t=${unsigned}.${b64u(sig)}, k=${vapidPublicKey(env)}`;
}

async function sendPush(env, endpoint) {
  if (!isAllowedPushEndpoint(endpoint)) return { ok: false, retry: false, gone: true, detail: 'Unsupported push address' };
  try {
    const res = await fetch(endpoint, { method: 'POST', signal: timeout(), headers: { Authorization: await vapidAuthHeader(env, endpoint), TTL: '86400', Urgency: 'normal', 'Content-Length': '0' } });
    if (res.ok) return { ok: true };
    if (res.status === 404 || res.status === 410) return { ok: false, retry: false, gone: true, detail: 'Device unsubscribed' };
    return { ok: false, retry: res.status === 429 || res.status >= 500, detail: `Push service answered ${res.status}` };
  } catch (e) { return { ok: false, retry: true, detail: 'Push service could not be reached' }; }
}

// ---------------------------------------------------------------- the outbox
// Called by notify(): queue one row per channel the server could use. Whether a row is really sent is decided later.
export async function queueChannels(env, instId, userId, notificationId, kind, wantSms) {
  const s = channelStatus(env);
  const rows = [];
  if (s.email) rows.push('email');
  if (s.sms && (wantSms === true || (wantSms !== false && SMS_KINDS.has(kind)))) rows.push('sms');
  if (s.push) rows.push('push');
  if (!rows.length) return false;
  await env.DB.batch(rows.map((c) => env.DB.prepare('INSERT INTO ins_outbox (institution_id, notification_id, user_id, channel) VALUES (?, ?, ?, ?)').bind(instId, notificationId, userId, c)));
  return true;
}

async function instSwitches(env, cache, instId) {
  if (cache.has(instId)) return cache.get(instId);
  const { results } = await env.DB.prepare(`SELECT key, value FROM ins_settings WHERE institution_id = ? AND key IN ('notify_email','notify_sms','notify_push')`).bind(instId).all();
  const raw = {}; results.forEach((r) => { raw[r.key] = String(r.value).replace(/"/g, ''); });
  const inst = await env.DB.prepare('SELECT name, short_name FROM ins_institutions WHERE id = ?').bind(instId).first();
  const v = { email: raw.notify_email === undefined ? 1 : Number(raw.notify_email), sms: raw.notify_sms === undefined ? 0 : Number(raw.notify_sms), push: raw.notify_push === undefined ? 1 : Number(raw.notify_push), name: (inst && inst.name) || 'Smart21Institution' };
  cache.set(instId, v); return v;
}

async function phoneFor(env, instId, userId, prefs) {
  if (prefs && prefs.phone) return normalisePhone(prefs.phone, env);
  const m = await env.DB.prepare(
    `SELECT COALESCE(s.phone, f.phone) AS phone FROM ins_members m LEFT JOIN ins_students s ON s.id = m.student_id LEFT JOIN ins_staff f ON f.id = m.staff_id
     WHERE m.institution_id = ? AND m.user_id = ? AND m.active = 1 LIMIT 1`).bind(instId, userId).first();
  return m && m.phone ? normalisePhone(m.phone, env) : null;
}

const skip = (id, why) => ({ id, status: 'skipped', detail: why });

// Sends what is waiting. Safe to call at any time and from several places at once (each row is claimed first).
export async function flushOutbox(env, { limit = 25, origin } = {}) {
  if (!channelsConfigured(env)) return { sent: 0, failed: 0, skipped: 0 };
  const { results: rows } = await env.DB.prepare(
    `SELECT o.id, o.institution_id, o.user_id, o.channel, o.attempts, n.title, n.message, n.link, n.kind, u.email, u.name AS user_name
     FROM ins_outbox o JOIN ins_notifications n ON n.id = o.notification_id JOIN users u ON u.id = o.user_id
     WHERE o.status = 'pending' AND o.attempts < ? ORDER BY o.id LIMIT ?`).bind(MAX_ATTEMPTS, limit).all();
  const out = { sent: 0, failed: 0, skipped: 0 }; const cache = new Map();
  const base = String(origin || env.SITE_URL || '').replace(/\/$/, '');

  for (const r of rows) {
    const claim = await env.DB.prepare(`UPDATE ins_outbox SET attempts = attempts + 1 WHERE id = ? AND status = 'pending' AND attempts = ?`).bind(r.id, r.attempts).run();
    if (!claim.meta || !claim.meta.changes) continue;                              // another flush took it
    let result;
    try {
      const sw = await instSwitches(env, cache, r.institution_id);
      const prefs = await env.DB.prepare('SELECT email_on, sms_on, push_on, phone FROM ins_notification_prefs WHERE institution_id = ? AND user_id = ?').bind(r.institution_id, r.user_id).first();
      const st = channelStatus(env);
      if (!sw[r.channel]) result = skip(r.id, 'Turned off by the institution');
      else if (prefs && prefs[r.channel + '_on'] === 0) result = skip(r.id, 'Turned off by the person');
      else if (r.channel === 'email') {
        if (!st.email) result = skip(r.id, 'E-mail is not configured on the server');
        else if (!r.email) result = skip(r.id, 'No e-mail address');
        else {
          const link = base && r.link ? `${base}/institution-app.html${r.link}` : '';
          const text = `${r.message || ''}${link ? `\n\nOpen: ${link}` : ''}\n\n— ${sw.name}\nYou can turn e-mails off in My profile → Notifications.`;
          const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:520px"><h2 style="margin:0 0 8px">${escHtml(r.title)}</h2><p style="white-space:pre-line">${escHtml(r.message || '')}</p>${link ? `<p><a href="${escHtml(link)}" style="background:#0F766E;color:#fff;padding:10px 16px;border-radius:8px;text-decoration:none">Open</a></p>` : ''}<p style="color:#666;font-size:12px">${escHtml(sw.name)} · You can turn e-mails off in My profile → Notifications.</p></div>`;
          result = { id: r.id, ...(await sendEmail(env, { to: r.email, subject: `${r.title} — ${sw.name}`.slice(0, 200), text, html })) };
        }
      } else if (r.channel === 'sms') {
        if (!st.sms) result = skip(r.id, 'SMS is not configured on the server');
        else {
          const phone = await phoneFor(env, r.institution_id, r.user_id, prefs);
          if (!phone) result = skip(r.id, 'No valid phone number');
          else result = { id: r.id, ...(await sendSms(env, { to: phone, text: `${sw.name}: ${r.title}. ${r.message || ''}`.slice(0, 300) })) };
        }
      } else {
        if (!st.push) result = skip(r.id, 'Push is not configured on the server');
        else {
          const { results: subs } = await env.DB.prepare('SELECT id, endpoint FROM ins_push_subscriptions WHERE institution_id = ? AND user_id = ?').bind(r.institution_id, r.user_id).all();
          if (!subs.length) result = skip(r.id, 'No device has allowed push');
          else {
            let anyOk = false; let retry = false; let last = '';
            for (const sub of subs) {
              const p = await sendPush(env, sub.endpoint);
              if (p.ok) { anyOk = true; await env.DB.prepare(`UPDATE ins_push_subscriptions SET last_ok_at = datetime('now') WHERE id = ?`).bind(sub.id).run(); }
              else { if (p.gone) await env.DB.prepare('DELETE FROM ins_push_subscriptions WHERE id = ?').bind(sub.id).run(); if (p.retry) retry = true; last = p.detail || last; }
            }
            result = anyOk ? { id: r.id, ok: true } : { id: r.id, ok: false, retry, detail: last || 'No device could be reached' };
          }
        }
      }
    } catch (e) { result = { id: r.id, ok: false, retry: true, detail: 'Unexpected error while sending' }; }

    let status; let detail = result.detail || null;
    if (result.status === 'skipped') status = 'skipped';
    else if (result.ok) status = 'sent';
    else status = result.retry && r.attempts + 1 < MAX_ATTEMPTS ? 'pending' : 'failed';
    await env.DB.prepare(`UPDATE ins_outbox SET status = ?, detail = ?, sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END WHERE id = ?`).bind(status, detail ? String(detail).slice(0, 200) : null, status, r.id).run();
    if (status === 'sent') out.sent++; else if (status === 'skipped') out.skipped++; else if (status === 'failed') out.failed++;
  }
  // keep the queue small: finished rows older than 30 days are removed
  if (Math.random() < 0.02) {
    await env.DB.prepare(`DELETE FROM ins_outbox WHERE status != 'pending' AND created_at < datetime('now','-30 days')`).run().catch(() => {});
    await env.DB.prepare(`DELETE FROM ins_client_ops WHERE created_at < datetime('now','-30 days')`).run().catch(() => {});   // offline-replay memory
  }
  return out;
}

// For "Send me a test" in the settings screen: sends straight to the caller on one channel and reports exactly what happened.
export async function sendTestTo(env, { channel, userId, instId, email, phone, origin }) {
  const st = channelStatus(env);
  if (channel === 'email') {
    if (!st.email) return { ok: false, detail: 'E-mail is not set up on the server yet (RESEND_API_KEY and EMAIL_FROM).' };
    if (!email) return { ok: false, detail: 'Your login has no e-mail address.' };
    const r = await sendEmail(env, { to: email, subject: 'Test message — Smart21Institution', text: 'This is a test e-mail. Notifications by e-mail are working.', html: '<p>This is a test e-mail. Notifications by e-mail are working.</p>' });
    return { ok: r.ok, detail: r.ok ? `Sent to ${email}.` : r.detail };
  }
  if (channel === 'sms') {
    if (!st.sms) return { ok: false, detail: 'SMS is not set up on the server yet (Africa\'s Talking or Twilio keys).' };
    const p = normalisePhone(phone, env);
    if (!p) return { ok: false, detail: 'Add a valid phone number first (for example 0712 345 678).' };
    const r = await sendSms(env, { to: p, text: 'Smart21Institution test message. SMS notifications are working.' });
    return { ok: r.ok, detail: r.ok ? `Sent to ${p}.` : r.detail };
  }
  if (channel === 'push') {
    if (!st.push) return { ok: false, detail: 'Push is not set up on the server yet (VAPID_PRIVATE_JWK).' };
    const { results: subs } = await env.DB.prepare('SELECT id, endpoint FROM ins_push_subscriptions WHERE institution_id = ? AND user_id = ?').bind(instId, userId).all();
    if (!subs.length) return { ok: false, detail: 'This device has not allowed push yet. Press "Turn on push on this device" first.' };
    let ok = 0;
    for (const s of subs) { const r = await sendPush(env, s.endpoint); if (r.ok) ok++; else if (r.gone) await env.DB.prepare('DELETE FROM ins_push_subscriptions WHERE id = ?').bind(s.id).run(); }
    return { ok: ok > 0, detail: ok ? `Sent to ${ok} device${ok === 1 ? '' : 's'}.` : 'No device could be reached.' };
  }
  return { ok: false, detail: 'Unknown channel.' };
}
