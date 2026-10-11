CREATE TABLE IF NOT EXISTS ins_students (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id   INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  student_no       TEXT NOT NULL,               -- library / student ID
  reg_no           TEXT,                        -- registration number
  full_name        TEXT NOT NULL,
  gender           TEXT,
  dob              TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  programme_id     INTEGER REFERENCES ins_programmes(id) ON DELETE SET NULL,
  department_id    INTEGER REFERENCES ins_departments(id) ON DELETE SET NULL,
  class_name       TEXT,
  level            TEXT,                        -- year / level of study
  admission_date   TEXT,
  admission_info   TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','graduated','withdrawn')),
  guardian_name    TEXT,
  guardian_phone   TEXT,
  guardian_relation TEXT,
  photo_key        TEXT,
  notes            TEXT,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, student_no)
);

CREATE INDEX IF NOT EXISTS idx_ins_students_name ON ins_students(institution_id, full_name);

CREATE INDEX IF NOT EXISTS idx_ins_students_prog ON ins_students(institution_id, programme_id);

-- ---------------------------------------------------------------------
-- Academics: courses, teaching assignments, enrolment, results
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_courses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  programme_id   INTEGER REFERENCES ins_programmes(id) ON DELETE SET NULL,
  department_id  INTEGER REFERENCES ins_departments(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,                 -- course or subject name
  credits        REAL,
  level          TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS ins_teaching (          -- teacher assignments
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES ins_courses(id) ON DELETE CASCADE,
  staff_id       INTEGER NOT NULL REFERENCES ins_staff(id) ON DELETE CASCADE,
  term_id        INTEGER REFERENCES ins_terms(id) ON DELETE CASCADE,
  UNIQUE (course_id, staff_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_ins_teaching_staff ON ins_teaching(institution_id, staff_id);

CREATE TABLE IF NOT EXISTS ins_enrollments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES ins_students(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES ins_courses(id) ON DELETE CASCADE,
  term_id        INTEGER NOT NULL REFERENCES ins_terms(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','dropped','completed')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, course_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_ins_enr_course ON ins_enrollments(institution_id, course_id, term_id);

CREATE TABLE IF NOT EXISTS ins_results (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  enrollment_id  INTEGER NOT NULL UNIQUE REFERENCES ins_enrollments(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES ins_students(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES ins_courses(id) ON DELETE CASCADE,
  term_id        INTEGER NOT NULL REFERENCES ins_terms(id) ON DELETE CASCADE,
  marks          REAL NOT NULL,                 -- out of 100
  grade          TEXT NOT NULL,
  points         REAL NOT NULL DEFAULT 0,
  remarks        TEXT,
  entered_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_ins_results_student ON ins_results(institution_id, student_id);

-- ---------------------------------------------------------------------
-- Library: categories, books, physical copies, loans, reservations, fines
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_categories (        -- book categories
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  color          TEXT,
  UNIQUE (institution_id, name)
);
