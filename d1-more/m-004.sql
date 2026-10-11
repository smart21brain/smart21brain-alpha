CREATE INDEX IF NOT EXISTS idx_sch_members_user ON sch_members(user_id);

-- Each school can change what each role is allowed to do (Settings -> Roles).
CREATE TABLE IF NOT EXISTS sch_role_permissions (
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  role       TEXT NOT NULL,
  permission TEXT NOT NULL,
  PRIMARY KEY (school_id, role, permission)
);

-- Free-form per-school settings (payment methods, grading scale, thresholds…)
CREATE TABLE IF NOT EXISTS sch_settings (
  school_id INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  key       TEXT NOT NULL,
  value     TEXT,
  PRIMARY KEY (school_id, key)
);

CREATE TABLE IF NOT EXISTS sch_academic_years (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,                      -- "2026" or "2026/2027"
  start_date TEXT,
  end_date   TEXT,
  is_current INTEGER NOT NULL DEFAULT 0,
  UNIQUE (school_id, name)
);

CREATE TABLE IF NOT EXISTS sch_terms (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,                      -- "Term 1"
  sort_order INTEGER NOT NULL DEFAULT 0,
  UNIQUE (school_id, name)
);

-- ---------------------------------------------------------------------
-- People
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_teachers (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id         INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  user_id           INTEGER REFERENCES users(id) ON DELETE SET NULL,
  full_name         TEXT NOT NULL,
  gender            TEXT CHECK (gender IN ('male','female')),
  phone             TEXT,
  email             TEXT,
  address           TEXT,
  photo_key         TEXT,
  employment_status TEXT NOT NULL DEFAULT 'full_time'
                    CHECK (employment_status IN ('full_time','part_time','contract','on_leave','resigned')),
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sch_teachers_school ON sch_teachers(school_id);

CREATE TABLE IF NOT EXISTS sch_parents (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  full_name  TEXT NOT NULL,
  phone      TEXT NOT NULL,
  alt_phone  TEXT,
  email      TEXT,
  address    TEXT,
  occupation TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sch_parents_school ON sch_parents(school_id);

CREATE INDEX IF NOT EXISTS idx_sch_parents_phone ON sch_parents(school_id, phone);

CREATE TABLE IF NOT EXISTS sch_students (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id      INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  admission_no   TEXT NOT NULL,
  first_name     TEXT NOT NULL,
  middle_name    TEXT,
  last_name      TEXT NOT NULL,
  gender         TEXT NOT NULL CHECK (gender IN ('male','female')),
  date_of_birth  TEXT,
  photo_key      TEXT,
  nationality    TEXT,
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  previous_school TEXT,
  admission_date TEXT NOT NULL,
  status         TEXT NOT NULL DEFAULT 'active'
                 CHECK (status IN ('active','inactive','graduated','suspended','transferred')),
  verify_token   TEXT NOT NULL UNIQUE,           -- the QR code on the ID card points at this
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, admission_no)
);

CREATE INDEX IF NOT EXISTS idx_sch_students_school_status ON sch_students(school_id, status);

CREATE INDEX IF NOT EXISTS idx_sch_students_name ON sch_students(school_id, last_name, first_name);

-- One parent can have many students, one student can have many guardians.
CREATE TABLE IF NOT EXISTS sch_student_parents (
  student_id   INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  parent_id    INTEGER NOT NULL REFERENCES sch_parents(id) ON DELETE CASCADE,
  relationship TEXT NOT NULL DEFAULT 'Parent',
  is_primary   INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (student_id, parent_id)
);

CREATE INDEX IF NOT EXISTS idx_sch_sp_parent ON sch_student_parents(parent_id);

CREATE TABLE IF NOT EXISTS sch_student_notes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id      INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  author_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  note           TEXT NOT NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sch_notes_student ON sch_student_notes(student_id);
