-- ---------------------------------------------------------------------
-- Timetable
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_timetable (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id   INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  class_id    INTEGER NOT NULL REFERENCES sch_classes(id) ON DELETE CASCADE,
  subject_id  INTEGER NOT NULL REFERENCES sch_subjects(id) ON DELETE CASCADE,
  teacher_id  INTEGER REFERENCES sch_teachers(id) ON DELETE SET NULL,
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),  -- 1 = Monday
  start_time  TEXT NOT NULL,
  end_time    TEXT NOT NULL,
  room        TEXT,
  CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_sch_tt_class ON sch_timetable(school_id, class_id, day_of_week);

-- ---------------------------------------------------------------------
-- Notifications, audit log, login throttling
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  title      TEXT NOT NULL,
  message    TEXT NOT NULL,
  type       TEXT NOT NULL DEFAULT 'general'
             CHECK (type IN ('fee_reminder','attendance_warning','exam_announcement','class_announcement','general')),
  audience   TEXT NOT NULL DEFAULT 'all' CHECK (audience IN ('all','teachers','parents','class','student')),
  class_id   INTEGER REFERENCES sch_classes(id) ON DELETE CASCADE,
  student_id INTEGER REFERENCES sch_students(id) ON DELETE CASCADE,
  created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sch_notif_school ON sch_notifications(school_id, created_at);

CREATE TABLE IF NOT EXISTS sch_notification_reads (
  notification_id INTEGER NOT NULL REFERENCES sch_notifications(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  read_at         TEXT NOT NULL DEFAULT (datetime('now')),
  PRIMARY KEY (notification_id, user_id)
);

CREATE TABLE IF NOT EXISTS sch_audit_logs (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action     TEXT NOT NULL,                        -- "student.create", "payment.create", "user.login" …
  entity     TEXT,
  entity_id  INTEGER,
  details    TEXT,
  ip         TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sch_audit_school ON sch_audit_logs(school_id, created_at);

-- Failed/successful sign-ins, used for rate limiting (not tied to a school).
CREATE TABLE IF NOT EXISTS sch_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT,
  ip         TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sch_login_email ON sch_login_attempts(email, created_at);

CREATE INDEX IF NOT EXISTS idx_sch_login_ip ON sch_login_attempts(ip, created_at);

-- ---------------------------------------------------------------------
-- Institutions, members, roles & permissions, settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_institutions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,          -- public address: institution-opac.html?i=<slug>
  inst_type      TEXT NOT NULL DEFAULT 'school',-- school | college | university | library | training_center | organization
  about          TEXT,
  logo_key       TEXT,                          -- R2 key (MATERIALS bucket)
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  website        TEXT,
  currency       TEXT NOT NULL DEFAULT 'TZS',   -- used for library fines
  primary_color  TEXT NOT NULL DEFAULT '#0F766E',
  utc_offset_min INTEGER NOT NULL DEFAULT 180,  -- time zone, minutes from UTC (180 = East Africa)
  is_public      INTEGER NOT NULL DEFAULT 1,    -- 1 = public catalogue / announcements are visible without signing in
  owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
