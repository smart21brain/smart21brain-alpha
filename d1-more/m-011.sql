CREATE TABLE IF NOT EXISTS ins_fines (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  loan_id        INTEGER REFERENCES ins_loans(id) ON DELETE SET NULL,
  borrower_type  TEXT NOT NULL CHECK (borrower_type IN ('student','staff')),
  borrower_id    INTEGER NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('overdue','lost','damaged','other')),
  amount         REAL NOT NULL,
  status         TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','waived')),
  note           TEXT,
  settled_at     TEXT,
  settled_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_fines_borrower ON ins_fines(institution_id, borrower_type, borrower_id, status);

-- ---------------------------------------------------------------------
-- E-Library: digital resources (files live in R2, never at a public URL)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_resource_categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS ins_resources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  author         TEXT,
  description    TEXT,
  category_id    INTEGER REFERENCES ins_resource_categories(id) ON DELETE SET NULL,
  subject        TEXT,
  res_type       TEXT NOT NULL DEFAULT 'document',  -- ebook | document | journal | notes | research | publication | other
  file_key       TEXT NOT NULL,                 -- R2 key, random, only reachable through an authorised endpoint
  file_name      TEXT NOT NULL,
  file_size      INTEGER NOT NULL DEFAULT 0,
  mime           TEXT NOT NULL,
  thumb_key      TEXT,
  access_level   TEXT NOT NULL DEFAULT 'members' CHECK (access_level IN ('public','members','staff')),
  allow_view     INTEGER NOT NULL DEFAULT 1,
  allow_download INTEGER NOT NULL DEFAULT 1,
  views          INTEGER NOT NULL DEFAULT 0,
  downloads      INTEGER NOT NULL DEFAULT 0,
  uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_res_inst ON ins_resources(institution_id, title);

-- ---------------------------------------------------------------------
-- Communication: announcements & notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_announcements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  audience       TEXT NOT NULL DEFAULT 'members' CHECK (audience IN ('public','members','staff','students','teachers')),
  pinned         INTEGER NOT NULL DEFAULT 0,
  expires_on     TEXT,
  author_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_ann_inst ON ins_announcements(institution_id, created_at);

CREATE TABLE IF NOT EXISTS ins_notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL DEFAULT 'system',  -- system | overdue | announcement | academic | admin | security
  title          TEXT NOT NULL,
  message        TEXT,
  link           TEXT,                          -- in-app route, e.g. #loans
  read_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_notif_user ON ins_notifications(institution_id, user_id, read_at, id DESC);

-- ---------------------------------------------------------------------
-- Operations: audit log, imports, backups, login throttling
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_audit_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  module         TEXT,
  action         TEXT NOT NULL,
  entity         TEXT,
  entity_id      INTEGER,
  details        TEXT,
  status         TEXT NOT NULL DEFAULT 'success',   -- success | failed
  ip             TEXT,
  user_agent     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
