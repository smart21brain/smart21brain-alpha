-- Smart21Brain — e-mail for the teacher dashboard (run once; safe to run again).
--   npx wrangler d1 execute smart21brain-db --remote --file=./migrations/phase11-teacher-email.sql
--
-- What it powers (Teacher settings on teachers.html):
--   "Email me new student comments"        -> one e-mail when a student writes a review comment
--   "Weekly performance summary email"     -> one e-mail every Monday morning
--   "Send me a test e-mail"                -> a one-off check that delivery works
-- Nothing is sent until e-mail is set up on the server (secrets RESEND_API_KEY and EMAIL_FROM, see wrangler.toml).
-- Every message is written here first, so you can see exactly what was sent, skipped or failed.

CREATE TABLE IF NOT EXISTS teacher_email_outbox (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL CHECK (kind IN ('comment', 'weekly', 'test')),
  subject     TEXT NOT NULL,
  body_text   TEXT NOT NULL,
  body_html   TEXT,
  dedupe_key  TEXT,                                   -- stops the same message being queued twice
  status      TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  attempts    INTEGER NOT NULL DEFAULT 0,
  detail      TEXT,                                   -- why it was skipped / the last error (never a secret)
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at     TEXT
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_teacher_email_dedupe  ON teacher_email_outbox(user_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX        IF NOT EXISTS idx_teacher_email_pending ON teacher_email_outbox(status, id);
