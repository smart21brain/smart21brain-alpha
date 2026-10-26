// Smart21Brain — e-mails for the teacher dashboard.
//
//   * "Email me new student comments"      queueCommentEmail()    called when a student writes a review comment
//   * "Weekly performance summary email"   queueWeeklySummaries()  called by the Monday cron (see src/index.js)
//   * "Send me a test e-mail"              sendTeacherTest()       called from the settings card
//
// Every message is first written to teacher_email_outbox (migrations/phase11-teacher-email.sql) and then sent by
// flushTeacherEmails(), which runs right after a comment is posted and every minute from the cron trigger.
// A row ends up "sent", "failed" or "skipped" with a plain reason, so nothing is lost silently.
//
// Delivery uses the same provider as the rest of the site (Resend): secrets RESEND_API_KEY and EMAIL_FROM.
// SITE_URL (for example https://smart21brain.com) is used for the links inside the e-mails.
//
// Safety rules:
//   - Nothing here may ever make the request that triggered it fail, so every entry point catches its own errors.
//   - The teacher's switch is checked again at the moment of sending, so turning it off takes effect straight away.
//   - Students are shown as "Halima R." (first name and initial), the same as on the dashboard.

import { sendEmail } from './institution-channels.js';
import { quizAverage } from './teacher-stats.js';

const MAX_ATTEMPTS = 3;

export const emailConfigured = (env) => !!(env.RESEND_API_KEY && env.EMAIL_FROM);

// ---- small helpers ---------------------------------------------------------

const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const clip = (s, n) => String(s == null ? '' : s).slice(0, n);
const siteBase = (env) => String(env.SITE_URL || '').replace(/\/$/, '');

function shortName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return 'A student';
  if (parts.length === 1) return parts[0];
  return `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// A short fingerprint, so the same comment is never queued twice.
function fingerprint(str) {
  let h = 5381;
  for (let i = 0; i < str.length; i++) h = ((h << 5) + h + str.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
}

// ISO week label such as "2026-W44" (one weekly summary per teacher per week).
export function isoWeekKey(date) {
  const t = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  return `${t.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

async function settingsFor(env, userId) {
  try {
    const row = await env.DB.prepare('SELECT email_on_comments, weekly_summary_email FROM teacher_settings WHERE user_id = ?').bind(userId).first();
    // same defaults as the dashboard: comments on, weekly summary off
    return { email_on_comments: row ? row.email_on_comments : 1, weekly_summary_email: row ? row.weekly_summary_email : 0 };
  } catch { return { email_on_comments: 1, weekly_summary_email: 0 }; }
}

// Plain-text and HTML versions of one message.
function compose(env, { heading, paragraphs, quote, button }) {
  const base = siteBase(env);
  const link = button && base ? base + button.path : '';
  const settings = base ? `${base}/teachers.html#settings` : '';
  const text = [
    heading, '',
    ...paragraphs,
    ...(quote ? ['', `"${quote}"`] : []),
    ...(link ? ['', `${button.label}: ${link}`] : []),
    '', '— Smart21Brain',
    settings ? `Choose which e-mails you get: ${settings}` : 'You can choose which e-mails you get under Teacher settings on your dashboard.',
  ].join('\n');
  const html = `<div style="font-family:system-ui,Arial,sans-serif;max-width:540px;color:#1f2937">` +
    `<h2 style="margin:0 0 12px;font-size:20px">${esc(heading)}</h2>` +
    paragraphs.map((p) => `<p style="margin:0 0 10px;white-space:pre-line">${esc(p)}</p>`).join('') +
    (quote ? `<blockquote style="margin:12px 0;padding:10px 14px;background:#f3f4f6;border-left:4px solid #6c5ce7;white-space:pre-line">${esc(quote)}</blockquote>` : '') +
    (link ? `<p style="margin:16px 0"><a href="${esc(link)}" style="background:#6c5ce7;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none;display:inline-block">${esc(button.label)}</a></p>` : '') +
    `<p style="margin:18px 0 0;font-size:12px;color:#6b7280">Smart21Brain${settings ? ` · <a href="${esc(settings)}" style="color:#6b7280">Choose which e-mails you get</a>` : ''}</p></div>`;
  return { text, html };
}

async function enqueue(env, { userId, kind, subject, text, html, dedupeKey }) {
  const r = await env.DB.prepare(
    'INSERT OR IGNORE INTO teacher_email_outbox (user_id, kind, subject, body_text, body_html, dedupe_key) VALUES (?, ?, ?, ?, ?, ?)'
  ).bind(userId, kind, clip(subject, 200), text, html || null, dedupeKey || null).run();
  return !!(r.meta && r.meta.changes);
}

// ---- 1. new student comment ------------------------------------------------

export async function queueCommentEmail(env, { course, student, rating, comment }) {
  try {
    if (!comment || !course || !course.instructor_id) return false;
    const teacher = await env.DB.prepare('SELECT id, name, email FROM users WHERE id = ?').bind(course.instructor_id).first();
    if (!teacher || !teacher.email) return false;
    const s = await settingsFor(env, teacher.id);
    if (!s.email_on_comments) return false;

    const who = shortName(student && student.name);
    const stars = `${rating} out of 5 star${rating === 1 ? '' : 's'}`;
    const { text, html } = compose(env, {
      heading: `New review on "${clip(course.title, 80)}"`,
      paragraphs: [`${who} gave your course ${stars} and wrote:`],
      quote: clip(comment, 1000),
      button: { label: 'Read it and reply', path: '/teachers.html#reviews' },
    });
    return await enqueue(env, {
      userId: teacher.id, kind: 'comment',
      subject: `New ${rating}-star review on "${clip(course.title, 80)}"`,
      text, html, dedupeKey: `comment:${course.id}:${student.id}:${rating}:${fingerprint(comment)}`,
    });
  } catch { return false; }
}

// ---- 2. weekly summary -----------------------------------------------------

async function weeklyNumbers(env, user) {
  const sc = user.role === 'admin' ? { sql: '1 = 1', binds: [] } : { sql: 'c.instructor_id = ?', binds: [user.id] };
  const since = "datetime('now', '-7 days')";
  const db = env.DB;
  const safe = async (run, fallback) => { try { return await run(); } catch { return fallback; } };

  const [courses, enrol, done, quiz, reviews, unanswered, attention] = await Promise.all([
    db.prepare(`SELECT COUNT(*) AS n FROM courses c WHERE ${sc.sql}`).bind(...sc.binds).first(),
    db.prepare(
      `SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN e.payment_status = 'paid' THEN c.price END), 0) AS revenue
       FROM course_enrollments e JOIN courses c ON c.id = e.course_id WHERE ${sc.sql} AND e.enrolled_at >= ${since}`
    ).bind(...sc.binds).first(),
    db.prepare(
      `SELECT COUNT(*) AS n FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id JOIN courses c ON c.id = cl.course_id
       WHERE ${sc.sql} AND lp.completed = 1 AND lp.completed_at >= ${since}`
    ).bind(...sc.binds).first(),
    safe(() => quizAverage(db, sc.sql, sc.binds, since), null),
    safe(() => db.prepare(
      `SELECT COUNT(*) AS n, ROUND(AVG(r.rating), 1) AS avg FROM course_reviews r JOIN courses c ON c.id = r.course_id
       WHERE ${sc.sql} AND r.created_at >= ${since}`
    ).bind(...sc.binds).first(), { n: 0, avg: null }),
    safe(() => db.prepare(
      `SELECT COUNT(*) AS n FROM course_reviews r JOIN courses c ON c.id = r.course_id
       WHERE ${sc.sql} AND r.teacher_reply IS NULL AND r.comment IS NOT NULL AND r.comment != ''`
    ).bind(...sc.binds).first(), { n: 0 }),
    // same rule as the dashboard's "needs attention": still working, not paid-pending, quiet for a week
    db.prepare(
      `SELECT COUNT(*) AS n FROM course_enrollments e JOIN courses c ON c.id = e.course_id
       WHERE ${sc.sql} AND e.status != 'completed' AND e.payment_status != 'pending'
         AND COALESCE((SELECT MAX(lp.completed_at) FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id
                        WHERE lp.user_id = e.user_id AND cl.course_id = c.id AND lp.completed = 1), e.enrolled_at) < datetime('now', '-7 days')
         AND NOT ((SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) > 0
                  AND (SELECT COUNT(*) FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id
                        WHERE lp.user_id = e.user_id AND cl.course_id = c.id AND lp.completed = 1)
                      >= (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id))`
    ).bind(...sc.binds).first(),
  ]);
  return {
    courses: courses ? courses.n : 0,
    new_students: enrol ? enrol.n : 0, revenue: enrol ? enrol.revenue : 0,
    lessons_done: done ? done.n : 0, quiz_avg: quiz,
    new_reviews: reviews ? reviews.n : 0, review_avg: reviews ? reviews.avg : null,
    unanswered: unanswered ? unanswered.n : 0, attention: attention ? attention.n : 0,
  };
}

export async function queueWeeklySummaries(env, now = new Date()) {
  let queued = 0;
  try {
    const week = isoWeekKey(now);
    const { results: people } = await env.DB.prepare(
      `SELECT u.id, u.name, u.email, u.role FROM teacher_settings ts JOIN users u ON u.id = ts.user_id
       WHERE ts.weekly_summary_email = 1 AND u.role IN ('teacher', 'admin') AND u.email IS NOT NULL AND u.email != ''`
    ).all();
    for (const p of people) {
      try {
        const n = await weeklyNumbers(env, p);
        if (!n.courses) continue;                      // nothing to report on yet
        const first = String(p.name || '').trim().split(/\s+/)[0] || 'there';
        const lines = [
          `Hello ${first}, here is how your courses did in the last 7 days.`,
          '',
          `New students: ${n.new_students}`,
          `Lessons completed: ${n.lessons_done}`,
          `Average quiz score: ${n.quiz_avg == null ? 'no quiz attempts' : n.quiz_avg + '%'}`,
          `New reviews: ${n.new_reviews}${n.review_avg != null && n.new_reviews ? ` (average ${n.review_avg} stars)` : ''}`,
          `Revenue from paid enrolments: TZS ${Number(n.revenue || 0).toLocaleString('en-US')}`,
          '',
          `Comments waiting for your reply: ${n.unanswered}`,
          `Students who need a nudge (no activity for 7 days): ${n.attention}`,
        ];
        const { text, html } = compose(env, {
          heading: 'Your week on Smart21Brain',
          paragraphs: [lines.join('\n')],
          button: { label: 'Open your dashboard', path: '/teachers.html' },
        });
        const ok = await enqueue(env, {
          userId: p.id, kind: 'weekly',
          subject: `Your week: ${n.new_students} new student${n.new_students === 1 ? '' : 's'}, ${n.lessons_done} lesson${n.lessons_done === 1 ? '' : 's'} completed`,
          text, html, dedupeKey: `weekly:${week}`,
        });
        if (ok) queued++;
      } catch { /* one teacher's problem must not stop the others */ }
    }
  } catch { /* table not created yet, or nobody opted in */ }
  return queued;
}

// ---- 3. sending ------------------------------------------------------------

export async function flushTeacherEmails(env, { limit = 25 } = {}) {
  const out = { sent: 0, failed: 0, skipped: 0 };
  let rows;
  try {
    ({ results: rows } = await env.DB.prepare(
      `SELECT o.id, o.user_id, o.kind, o.subject, o.body_text, o.body_html, o.attempts, u.email
       FROM teacher_email_outbox o JOIN users u ON u.id = o.user_id
       WHERE o.status = 'pending' AND o.attempts < ? ORDER BY o.id LIMIT ?`
    ).bind(MAX_ATTEMPTS, limit).all());
  } catch { return out; }                              // table not created yet

  for (const r of rows) {
    const claim = await env.DB.prepare(`UPDATE teacher_email_outbox SET attempts = attempts + 1 WHERE id = ? AND status = 'pending' AND attempts = ?`)
      .bind(r.id, r.attempts).run();
    if (!claim.meta || !claim.meta.changes) continue;  // another run took it

    let status; let detail = null;
    try {
      const s = await settingsFor(env, r.user_id);
      if (!emailConfigured(env)) { status = 'skipped'; detail = 'E-mail is not set up on the server'; }
      else if (!r.email) { status = 'skipped'; detail = 'No e-mail address on the account'; }
      else if (r.kind === 'comment' && !s.email_on_comments) { status = 'skipped'; detail = 'Turned off by the teacher'; }
      else if (r.kind === 'weekly' && !s.weekly_summary_email) { status = 'skipped'; detail = 'Turned off by the teacher'; }
      else {
        const res = await sendEmail(env, { to: r.email, subject: r.subject, text: r.body_text, html: r.body_html });
        if (res.ok) status = 'sent';
        else { status = res.retry && r.attempts + 1 < MAX_ATTEMPTS ? 'pending' : 'failed'; detail = res.detail || 'Could not send'; }
      }
    } catch { status = r.attempts + 1 < MAX_ATTEMPTS ? 'pending' : 'failed'; detail = 'Unexpected error while sending'; }

    await env.DB.prepare(`UPDATE teacher_email_outbox SET status = ?, detail = ?, sent_at = CASE WHEN ? = 'sent' THEN datetime('now') ELSE sent_at END WHERE id = ?`)
      .bind(status, detail ? clip(detail, 200) : null, status, r.id).run().catch(() => {});
    if (status === 'sent') out.sent++; else if (status === 'skipped') out.skipped++; else if (status === 'failed') out.failed++;
  }
  // keep the table small: finished rows older than 60 days are removed
  if (Math.random() < 0.02) await env.DB.prepare(`DELETE FROM teacher_email_outbox WHERE status != 'pending' AND created_at < datetime('now', '-60 days')`).run().catch(() => {});
  return out;
}

// ---- 4. "Send me a test e-mail" ---------------------------------------------

export async function sendTeacherTest(env, user) {
  if (!emailConfigured(env)) {
    return { ok: false, status: 400, message: 'E-mail is not set up on this site yet. Ask the site administrator to add the e-mail settings (RESEND_API_KEY and EMAIL_FROM). Your choices above are saved and start working once that is done.' };
  }
  if (!user.email) return { ok: false, status: 400, message: 'Your account has no e-mail address. Add one under Manage account.' };

  // at most one test a minute per person
  try {
    const recent = await env.DB.prepare(`SELECT 1 AS x FROM teacher_email_outbox WHERE user_id = ? AND kind = 'test' AND created_at > datetime('now', '-1 minute')`).bind(user.id).first();
    if (recent) return { ok: false, status: 429, message: 'A test e-mail was just sent. Please wait a minute before sending another.' };
  } catch { /* table missing: still allow the test */ }

  const { text, html } = compose(env, {
    heading: 'Test e-mail from Smart21Brain',
    paragraphs: ['If you can read this, e-mail delivery to your account is working.', 'You will get new-comment and weekly-summary e-mails here when those switches are on.'],
    button: { label: 'Open your dashboard', path: '/teachers.html' },
  });
  const res = await sendEmail(env, { to: user.email, subject: 'Test e-mail from Smart21Brain', text, html });
  try {
    await env.DB.prepare(`INSERT INTO teacher_email_outbox (user_id, kind, subject, body_text, status, attempts, detail, sent_at) VALUES (?, 'test', 'Test e-mail from Smart21Brain', ?, ?, 1, ?, CASE WHEN ? = 'sent' THEN datetime('now') END)`)
      .bind(user.id, text, res.ok ? 'sent' : 'failed', res.ok ? null : clip(res.detail, 200), res.ok ? 'sent' : 'failed').run();
  } catch { /* audit row is best-effort */ }
  return res.ok
    ? { ok: true, status: 200, message: `Test e-mail sent to ${user.email}. Check your inbox (and spam folder).` }
    : { ok: false, status: 502, message: `The e-mail service did not accept the message: ${res.detail || 'unknown error'}. Check the e-mail settings on the server.` };
}
