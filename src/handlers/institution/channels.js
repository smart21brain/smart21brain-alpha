// Smart21Institution — notification channels (e-mail / SMS / push): each person's choices, push subscription,
// test messages and the administrator's delivery overview. The sending itself lives in src/lib/institution-channels.js.
import { json } from '../../lib/auth.js';
import { fail, secure, readJson, getSettings, audit } from '../../lib/institution-auth.js';
import { channelStatus, normalisePhone, isAllowedPushEndpoint, sendTestTo } from '../../lib/institution-channels.js';

const flag = (v, def) => (v === undefined || v === null || v === '' ? def : (v === true || v === 1 || v === '1' || v === 'true' ? 1 : 0));

async function myPrefs(env, ctx) {
  const p = await env.DB.prepare('SELECT email_on, sms_on, push_on, phone FROM ins_notification_prefs WHERE institution_id = ? AND user_id = ?').bind(ctx.inst.id, ctx.user.id).first();
  return { email_on: p ? p.email_on : 1, sms_on: p ? p.sms_on : 1, push_on: p ? p.push_on : 1, phone: p ? p.phone || '' : '' };
}

// What can this server send, what has the institution switched on, and what has this person chosen.
export const notificationSettings = secure(async ({ env, ctx }) => {
  const server = channelStatus(env); const s = await getSettings(env, ctx.inst.id);
  const devices = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_push_subscriptions WHERE institution_id = ? AND user_id = ?').bind(ctx.inst.id, ctx.user.id).first();
  return json({
    server: { email: server.email, sms: server.sms, push: server.push, push_public_key: server.push ? server.push_public_key : null },
    institution: { email: !!s.notify_email, sms: !!s.notify_sms, push: !!s.notify_push },
    prefs: await myPrefs(env, ctx),
    has_email: !!ctx.user.email,
    devices: devices.n,
  });
});

export const savePrefs = secure(async ({ request, env, ctx }) => {
  const b = await readJson(request); const cur = await myPrefs(env, ctx);
  let phone = cur.phone;
  if (b.phone !== undefined) {
    const raw = String(b.phone || '').trim();
    if (!raw) phone = '';
    else { phone = normalisePhone(raw, env); if (!phone) fail(400, 'That phone number does not look right. Use the format 0712 345 678 or +255 712 345 678.'); }
  }
  await env.DB.prepare(
    `INSERT INTO ins_notification_prefs (institution_id, user_id, email_on, sms_on, push_on, phone) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(institution_id, user_id) DO UPDATE SET email_on = excluded.email_on, sms_on = excluded.sms_on, push_on = excluded.push_on, phone = excluded.phone, updated_at = datetime('now')`
  ).bind(ctx.inst.id, ctx.user.id, flag(b.email_on, cur.email_on), flag(b.sms_on, cur.sms_on), flag(b.push_on, cur.push_on), phone || null).run();
  return json({ ok: true, prefs: await myPrefs(env, ctx) });
});

export const pushSubscribe = secure(async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const endpoint = String(b.endpoint || '');
  if (!channelStatus(env).push) fail(400, 'Push notifications are not set up on this server yet.');
  if (!isAllowedPushEndpoint(endpoint)) fail(400, 'This browser\'s push service is not supported.');
  await env.DB.prepare(
    `INSERT INTO ins_push_subscriptions (institution_id, user_id, endpoint, user_agent) VALUES (?, ?, ?, ?)
     ON CONFLICT(endpoint) DO UPDATE SET institution_id = excluded.institution_id, user_id = excluded.user_id, user_agent = excluded.user_agent`
  ).bind(ctx.inst.id, ctx.user.id, endpoint, (request.headers.get('User-Agent') || '').slice(0, 200) || null).run();
  return json({ ok: true });
});

export const pushUnsubscribe = secure(async ({ request, env, ctx }) => {
  const b = await readJson(request);
  await env.DB.prepare('DELETE FROM ins_push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(String(b.endpoint || ''), ctx.user.id).run();
  return json({ ok: true });
});

// "Send me a test": one channel, to the caller only, with the real answer from the provider.
export const sendTest = secure(async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const channel = String(b.channel || '');
  if (!['email', 'sms', 'push'].includes(channel)) fail(400, 'Choose e-mail, SMS or push.');
  // Rate limit: 5 tests per person per 10 minutes (stops this being used to spam a phone or inbox).
  const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_audit_logs WHERE institution_id = ? AND user_id = ? AND action = 'notify.test' AND created_at > datetime('now','-10 minutes')`).bind(ctx.inst.id, ctx.user.id).first();
  if (recent.n >= 5) fail(429, 'Please wait a few minutes before sending more tests.');
  const prefs = await myPrefs(env, ctx);
  let phone = prefs.phone;
  if (!phone) {
    const m = await env.DB.prepare(`SELECT COALESCE(s.phone, f.phone) AS phone FROM ins_members m LEFT JOIN ins_students s ON s.id = m.student_id LEFT JOIN ins_staff f ON f.id = m.staff_id WHERE m.institution_id = ? AND m.user_id = ? AND m.active = 1 LIMIT 1`).bind(ctx.inst.id, ctx.user.id).first();
    phone = m ? m.phone : '';
  }
  if (channel === 'push') {
    await env.DB.prepare(`INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, 'system', 'Test notification', 'Push notifications are working on this device.', '#dashboard')`).bind(ctx.inst.id, ctx.user.id).run();
  }
  const r = await sendTestTo(env, { channel, userId: ctx.user.id, instId: ctx.inst.id, email: ctx.user.email, phone, origin: new URL(request.url).origin });
  await audit(env, request, ctx, 'notifications', 'notify.test', 'user', ctx.user.id, `${channel}: ${r.ok ? 'sent' : 'not sent'}`, r.ok ? 'success' : 'failed');
  return json({ ok: r.ok, detail: r.detail });
});

// Administrators: how many notices went out by each channel in the last 7 days, and why some did not.
export const deliveryOverview = secure({ perm: 'settings.manage' }, async ({ env, ctx }) => {
  const { results: totals } = await env.DB.prepare(`SELECT channel, status, COUNT(*) AS n FROM ins_outbox WHERE institution_id = ? AND created_at > datetime('now','-7 days') GROUP BY channel, status`).bind(ctx.inst.id).all();
  const { results: reasons } = await env.DB.prepare(`SELECT channel, status, detail, COUNT(*) AS n FROM ins_outbox WHERE institution_id = ? AND created_at > datetime('now','-7 days') AND status IN ('failed','skipped') AND detail IS NOT NULL GROUP BY channel, status, detail ORDER BY n DESC LIMIT 12`).bind(ctx.inst.id).all();
  const server = channelStatus(env);
  return json({ server: { email: server.email, sms: server.sms, sms_provider: server.sms_provider, push: server.push }, totals, reasons });
});
