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
