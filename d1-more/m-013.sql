CREATE TABLE IF NOT EXISTS ins_outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id  INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  notification_id INTEGER REFERENCES ins_notifications(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('email','sms','push')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  detail          TEXT,                                   -- why it was skipped / the last error (never a secret)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at         TEXT
);

CREATE INDEX IF NOT EXISTS idx_ins_outbox_pending ON ins_outbox(status, id);

CREATE INDEX IF NOT EXISTS idx_ins_outbox_inst ON ins_outbox(institution_id, id DESC);

-- ---------------------------------------------------------------------
-- Student document attachments (files live in the private R2 bucket under random keys)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_student_documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES ins_students(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  doc_type       TEXT NOT NULL DEFAULT 'other' CHECK (doc_type IN ('birth_certificate','id_document','transcript','certificate','medical','recommendation','application','other')),
  file_key       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  mime           TEXT NOT NULL,
  file_size      INTEGER NOT NULL DEFAULT 0,
  uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);

CREATE INDEX IF NOT EXISTS idx_ins_stdoc_student ON ins_student_documents(institution_id, student_id, deleted_at);

-- ---------------------------------------------------------------------
-- Offline work: changes typed while offline are replayed later. The server remembers each
-- client operation id so a replay that already succeeded is never applied twice.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_client_ops (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  op_id          TEXT NOT NULL,
  status         INTEGER NOT NULL,
  body           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, user_id, op_id)
);

-- Smart21Institution — Website module (website builder + public site + online applications)
-- Safe to re-run:  wrangler d1 execute smart21brain-db --file=./institution-site-schema.sql --remote
-- Every table has institution_id (multi-tenant), exactly like the rest of the system.

CREATE TABLE IF NOT EXISTS ins_site_config (
  institution_id INTEGER PRIMARY KEY REFERENCES ins_institutions(id) ON DELETE CASCADE,
  enabled        INTEGER NOT NULL DEFAULT 0,        -- 0 = site not published yet
  theme          TEXT NOT NULL DEFAULT '{}',        -- JSON: primary, accent, font, radius
  header         TEXT NOT NULL DEFAULT '{}',        -- JSON: topbar_text, show_apply, apply_label, apply_link
  footer         TEXT NOT NULL DEFAULT '{}',        -- JSON: text, links[], socials[]
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ins_site_pages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  slug           TEXT NOT NULL,                     -- 'home' is the front page
  title          TEXT NOT NULL,
  seo_description TEXT,
  blocks         TEXT NOT NULL DEFAULT '[]',        -- JSON array of content blocks (validated on save)
  parent_id      INTEGER REFERENCES ins_site_pages(id) ON DELETE SET NULL,   -- one level of drop-down menu
  show_in_menu   INTEGER NOT NULL DEFAULT 1,
  menu_order     INTEGER NOT NULL DEFAULT 100,
  published      INTEGER NOT NULL DEFAULT 0,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_ins_site_pages_inst ON ins_site_pages(institution_id, published, menu_order);

CREATE TABLE IF NOT EXISTS ins_site_media (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  file_key       TEXT NOT NULL,                     -- R2 key (random)
  alt            TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);
