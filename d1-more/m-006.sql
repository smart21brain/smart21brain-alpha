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
