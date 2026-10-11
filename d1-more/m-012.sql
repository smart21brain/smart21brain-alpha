CREATE INDEX IF NOT EXISTS idx_ins_audit_inst ON ins_audit_logs(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ins_imports (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,                 -- books | students | staff
  filename       TEXT,
  total_rows     INTEGER NOT NULL DEFAULT 0,
  imported_rows  INTEGER NOT NULL DEFAULT 0,
  skipped_rows   INTEGER NOT NULL DEFAULT 0,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ins_backups (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  file_key       TEXT NOT NULL,                 -- R2 key of the JSON export
  size_bytes     INTEGER NOT NULL DEFAULT 0,
  row_counts     TEXT,                          -- JSON: rows per table at backup time
  checksum       TEXT NOT NULL,                 -- SHA-256 of the file, re-checked by "Verify"
  verified_at    TEXT,
  verified_ok    INTEGER,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ins_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip         TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_attempts_email ON ins_login_attempts(email, created_at);

CREATE INDEX IF NOT EXISTS idx_ins_attempts_ip    ON ins_login_attempts(ip, created_at);

-- ---------------------------------------------------------------------
-- Reading progress (students and staff can continue a book where they stopped)
-- Safe to re-run.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_reading_progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id    INTEGER NOT NULL REFERENCES ins_resources(id) ON DELETE CASCADE,
  last_page      INTEGER NOT NULL DEFAULT 1 CHECK (last_page BETWEEN 1 AND 100000),
  total_pages    INTEGER CHECK (total_pages IS NULL OR total_pages BETWEEN 1 AND 100000),
  status         TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('reading','finished')),
  opened_count   INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, resource_id)
);

CREATE INDEX IF NOT EXISTS idx_ins_reading_user ON ins_reading_progress(institution_id, user_id, last_opened_at DESC);

-- ---------------------------------------------------------------------
-- Notification channels (email / SMS / web push) — every statement is safe to re-run.
-- ins_notifications stays the in-app inbox; ins_outbox is the delivery queue behind it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_notification_prefs (      -- one row per person who changed their choices
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_on       INTEGER NOT NULL DEFAULT 1 CHECK (email_on IN (0,1)),
  sms_on         INTEGER NOT NULL DEFAULT 1 CHECK (sms_on IN (0,1)),
  push_on        INTEGER NOT NULL DEFAULT 1 CHECK (push_on IN (0,1)),
  phone          TEXT,                                    -- number for SMS if the person has no student/staff record phone
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, user_id)
);

CREATE TABLE IF NOT EXISTS ins_push_subscriptions (      -- one row per browser/phone that allowed push
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint       TEXT NOT NULL UNIQUE,
  user_agent     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_ok_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_ins_push_user ON ins_push_subscriptions(institution_id, user_id);
