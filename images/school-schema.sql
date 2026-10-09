-- Smart21Brain School System — D1 schema
--
-- Apply on top of schema.sql (it re-uses the `users` and `sessions` tables):
--   wrangler d1 execute smart21brain-db --file=./school-schema.sql --remote
--
-- One database serves MANY schools. Every table below (except the two at the
-- very bottom) carries a school_id, and every query in src/handlers/school/*
-- is filtered by it, so one school can never see another school's data.
-- Safe to run more than once (everything is CREATE ... IF NOT EXISTS).

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Schools, members, roles & permissions, settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_schools (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  name             TEXT NOT NULL,
  short_name       TEXT NOT NULL,
  logo_key         TEXT,                          -- R2 key (MATERIALS bucket)
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  website          TEXT,
  social           TEXT,                          -- JSON: {facebook, instagram, x, youtube, tiktok}
  currency         TEXT NOT NULL DEFAULT 'TZS',
  admission_prefix TEXT NOT NULL,                 -- e.g. "S21" -> S21-2026-0001
  primary_color    TEXT NOT NULL DEFAULT '#0B6E4F',
  receipt_note     TEXT,
  owner_user_id    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A signed-in smart21brain account can belong to several schools; the role
-- is per school. teacher_id / parent_id link a login to the teacher or
-- parent record (used to scope what a teacher / parent may see).
CREATE TABLE IF NOT EXISTS sch_members (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role       TEXT NOT NULL CHECK (role IN ('admin','teacher','receptionist','parent')),
  teacher_id INTEGER,
  parent_id  INTEGER,
  active     INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, user_id)
);
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

-- ---------------------------------------------------------------------
-- Classes, subjects, enrolment
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_classes (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id        INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,                 -- "Form One", "A-Level", "Special Tuition"
  level            TEXT,                          -- "O-Level" / "A-Level" / "Primary" …
  stream           TEXT NOT NULL DEFAULT '',      -- "A", "B", "Science" …
  academic_year_id INTEGER NOT NULL REFERENCES sch_academic_years(id) ON DELETE CASCADE,
  teacher_id       INTEGER REFERENCES sch_teachers(id) ON DELETE SET NULL,  -- class teacher
  max_students     INTEGER NOT NULL DEFAULT 40 CHECK (max_students > 0),
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, name, stream, academic_year_id)
);

CREATE TABLE IF NOT EXISTS sch_subjects (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  name      TEXT NOT NULL,
  code      TEXT NOT NULL,
  status    TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','inactive')),
  UNIQUE (school_id, code)
);

-- Which subjects a class studies and who teaches each one.
CREATE TABLE IF NOT EXISTS sch_class_subjects (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  class_id   INTEGER NOT NULL REFERENCES sch_classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES sch_subjects(id) ON DELETE CASCADE,
  teacher_id INTEGER REFERENCES sch_teachers(id) ON DELETE SET NULL,
  UNIQUE (class_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_sch_cs_teacher ON sch_class_subjects(teacher_id);

CREATE TABLE IF NOT EXISTS sch_enrollments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id        INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  student_id       INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  class_id         INTEGER NOT NULL REFERENCES sch_classes(id) ON DELETE RESTRICT,
  academic_year_id INTEGER NOT NULL REFERENCES sch_academic_years(id) ON DELETE CASCADE,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, academic_year_id)
);
CREATE INDEX IF NOT EXISTS idx_sch_enr_class ON sch_enrollments(class_id);

-- The subjects an individual student takes (a subset of the class subjects).
CREATE TABLE IF NOT EXISTS sch_student_subjects (
  student_id       INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  subject_id       INTEGER NOT NULL REFERENCES sch_subjects(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES sch_academic_years(id) ON DELETE CASCADE,
  school_id        INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  PRIMARY KEY (student_id, subject_id, academic_year_id)
);

-- ---------------------------------------------------------------------
-- Attendance
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_attendance (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  class_id   INTEGER NOT NULL REFERENCES sch_classes(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL DEFAULT 0,           -- 0 = whole-day / general session
  date       TEXT NOT NULL,                        -- YYYY-MM-DD
  status     TEXT NOT NULL CHECK (status IN ('present','absent','late')),
  marked_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, class_id, subject_id, date)
);
CREATE INDEX IF NOT EXISTS idx_sch_att_school_date ON sch_attendance(school_id, date);
CREATE INDEX IF NOT EXISTS idx_sch_att_student ON sch_attendance(student_id, date);

-- ---------------------------------------------------------------------
-- Fees & payments. Totals and balances are always CALCULATED from these
-- two tables (never stored), so they can't drift out of sync.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_fee_structures (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id        INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES sch_academic_years(id) ON DELETE CASCADE,
  class_id         INTEGER REFERENCES sch_classes(id) ON DELETE CASCADE,   -- NULL = every class
  fee_type         TEXT NOT NULL CHECK (fee_type IN ('registration','tuition','examination','other')),
  name             TEXT NOT NULL,
  amount           REAL NOT NULL CHECK (amount >= 0),
  due_date         TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sch_fees_year ON sch_fee_structures(school_id, academic_year_id);

CREATE TABLE IF NOT EXISTS sch_payments (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id        INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  student_id       INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE RESTRICT,
  academic_year_id INTEGER NOT NULL REFERENCES sch_academic_years(id) ON DELETE CASCADE,
  amount           REAL NOT NULL CHECK (amount > 0),
  payment_date     TEXT NOT NULL,
  method           TEXT NOT NULL,                  -- validated against the school's payment-method list
  reference        TEXT,
  received_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT
);
CREATE INDEX IF NOT EXISTS idx_sch_pay_student ON sch_payments(student_id, academic_year_id);
CREATE INDEX IF NOT EXISTS idx_sch_pay_school_date ON sch_payments(school_id, payment_date);

CREATE TABLE IF NOT EXISTS sch_receipts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  payment_id INTEGER NOT NULL UNIQUE REFERENCES sch_payments(id) ON DELETE CASCADE,
  receipt_no TEXT NOT NULL,
  issued_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (school_id, receipt_no)
);

-- ---------------------------------------------------------------------
-- Examinations & results (grades / totals / positions are calculated)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sch_examinations (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id        INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  exam_type        TEXT NOT NULL DEFAULT 'Monthly Test',
  academic_year_id INTEGER NOT NULL REFERENCES sch_academic_years(id) ON DELETE CASCADE,
  term_id          INTEGER REFERENCES sch_terms(id) ON DELETE SET NULL,
  class_id         INTEGER NOT NULL REFERENCES sch_classes(id) ON DELETE CASCADE,
  exam_date        TEXT,
  max_marks        REAL NOT NULL DEFAULT 100 CHECK (max_marks > 0),
  created_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at       TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sch_exams_class ON sch_examinations(school_id, class_id);

CREATE TABLE IF NOT EXISTS sch_results (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id  INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  exam_id    INTEGER NOT NULL REFERENCES sch_examinations(id) ON DELETE CASCADE,
  student_id INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  subject_id INTEGER NOT NULL REFERENCES sch_subjects(id) ON DELETE CASCADE,
  marks      REAL NOT NULL CHECK (marks >= 0),
  entered_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (exam_id, student_id, subject_id)
);
CREATE INDEX IF NOT EXISTS idx_sch_results_student ON sch_results(student_id);

CREATE TABLE IF NOT EXISTS sch_report_comments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  school_id       INTEGER NOT NULL REFERENCES sch_schools(id) ON DELETE CASCADE,
  exam_id         INTEGER NOT NULL REFERENCES sch_examinations(id) ON DELETE CASCADE,
  student_id      INTEGER NOT NULL REFERENCES sch_students(id) ON DELETE CASCADE,
  teacher_comment TEXT,
  remarks         TEXT,
  updated_by      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at      TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (exam_id, student_id)
);

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
