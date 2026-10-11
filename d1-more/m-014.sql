CREATE INDEX IF NOT EXISTS idx_ins_site_media_inst ON ins_site_media(institution_id, deleted_at);

CREATE TABLE IF NOT EXISTS ins_site_posts (          -- news, events
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL DEFAULT 'news' CHECK (kind IN ('news','event')),
  title          TEXT NOT NULL,
  summary        TEXT,
  body           TEXT,
  image_id       INTEGER REFERENCES ins_site_media(id) ON DELETE SET NULL,
  location       TEXT,
  starts_on      TEXT,                              -- events: YYYY-MM-DD
  ends_on        TEXT,
  published      INTEGER NOT NULL DEFAULT 1,
  published_on   TEXT NOT NULL DEFAULT (date('now')),
  author_id      INTEGER,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_site_posts_inst ON ins_site_posts(institution_id, kind, published, published_on);

CREATE TABLE IF NOT EXISTS ins_applications (        -- online registration / application form
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  programme_id   INTEGER REFERENCES ins_programmes(id) ON DELETE SET NULL,
  programme_label TEXT,                             -- free-text choice when the site lists programmes by name
  first_name     TEXT NOT NULL,
  middle_name    TEXT,
  last_name      TEXT NOT NULL,
  gender         TEXT,
  email          TEXT NOT NULL,
  phone          TEXT NOT NULL,
  address        TEXT,
  organisation   TEXT,
  job_title      TEXT,
  message        TEXT,
  status         TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new','reviewing','accepted','rejected','enrolled')),
  admin_note     TEXT,
  student_id     INTEGER REFERENCES ins_students(id) ON DELETE SET NULL,   -- set when converted to a student record
  ip_hash        TEXT,                              -- hashed, used only to slow down spam
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_applications_inst ON ins_applications(institution_id, status, id);

CREATE INDEX IF NOT EXISTS idx_ins_applications_ip ON ins_applications(institution_id, ip_hash, created_at);

CREATE TABLE IF NOT EXISTS ins_contact_messages (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT,
  email          TEXT,
  phone          TEXT,
  subject        TEXT,
  message        TEXT NOT NULL,
  read_at        TEXT,
  ip_hash        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_contact_inst ON ins_contact_messages(institution_id, read_at, id);

-- Existing institutions: give the Administrator role the two new permissions
-- (new institutions get them automatically from the permission catalogue).
INSERT OR IGNORE INTO ins_role_permissions (institution_id, role, permission)
  SELECT id, 'admin', 'site.manage' FROM ins_institutions;

INSERT OR IGNORE INTO ins_role_permissions (institution_id, role, permission)
  SELECT id, 'admin', 'applications.manage' FROM ins_institutions;

-- Anatomy and Physiology (Medical Level): course, modules, lessons, quizzes and final exam.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-anatomy-physiology-seed.sql
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES ('Medicine & Health','medicine-health','fa-solid fa-stethoscope');
