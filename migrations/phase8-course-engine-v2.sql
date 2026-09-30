-- =======================================================================
-- PHASE 8 upgrade migration — run ONCE against a database that was set
-- up before Phase 8 existed (i.e. `courses`/`course_lessons` don't yet
-- have the columns below). Brand-new databases don't need this file at
-- all — schema.sql already creates everything with these columns in
-- place.
--
--   wrangler d1 execute smart21brain-db --file=./migrations/phase8-course-engine-v2.sql --remote
--
-- After this runs once, re-running schema.sql (or course-engine-schema.sql)
-- is safe as usual and will load the Phase 8 seed data — the "Fractions
-- Made Fun" course rebuilt with modules, module quizzes and a final exam.
--
-- Do NOT run this a second time: plain SQLite has no
-- "ALTER TABLE ... ADD COLUMN IF NOT EXISTS", so re-running it will fail
-- with "duplicate column name" on the ALTER TABLE lines below. If you're
-- not sure whether it already ran, check first:
--   wrangler d1 execute smart21brain-db --remote \
--     --command "SELECT final_exam_quiz_id FROM courses LIMIT 1"
-- If that succeeds (even with a NULL result) instead of erroring on an
-- unknown column, this migration has already been applied.
-- =======================================================================

CREATE TABLE IF NOT EXISTS course_modules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  quiz_id        INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  passing_score  INTEGER NOT NULL DEFAULT 70,
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, title)
);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);

ALTER TABLE course_lessons ADD COLUMN module_id INTEGER REFERENCES course_modules(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);

ALTER TABLE courses ADD COLUMN final_exam_quiz_id INTEGER REFERENCES quizzes(id) ON DELETE SET NULL;
ALTER TABLE courses ADD COLUMN final_exam_passing_score INTEGER NOT NULL DEFAULT 70;

CREATE TABLE IF NOT EXISTS certificates (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  code        TEXT NOT NULL UNIQUE,
  issued_at   TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_certificates_user ON certificates(user_id);
CREATE INDEX IF NOT EXISTS idx_certificates_code ON certificates(code);
