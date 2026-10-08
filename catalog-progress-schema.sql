-- =======================================================================
-- Smart21Brain — account-level progress for the BUILT-IN course catalog
--
-- Built-in courses (js/courses-data.js) used to keep enrolment and lesson
-- progress only in the learner's browser. These two tables store the same
-- progress against the learner's ACCOUNT so it follows them to another
-- phone/laptop, and so the dashboard's XP, streak, level and badges can
-- count it. Safe to run more than once.
--
--   npx wrangler d1 execute smart21brain-db --remote --file=./catalog-progress-schema.sql
--
-- (schema.sql contains the same statements, so a brand-new database gets
--  them automatically.)
-- =======================================================================
CREATE TABLE IF NOT EXISTS catalog_enrollments (
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_slug  TEXT    NOT NULL,
  enrolled_at  INTEGER NOT NULL,              -- ms since epoch, as the browser records it
  updated_at   INTEGER NOT NULL,              -- ms since epoch; newest write wins when devices disagree
  completed_at TEXT,                          -- set once every lesson is done; never cleared (like a certificate)
  PRIMARY KEY (user_id, course_slug)
);

CREATE TABLE IF NOT EXISTS catalog_progress (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_slug  TEXT    NOT NULL,
  lesson_id    TEXT    NOT NULL,              -- e.g. 'fractions-made-fun::3'
  completed_at TEXT    NOT NULL,              -- ISO timestamp
  UNIQUE (user_id, lesson_id)
);
CREATE INDEX IF NOT EXISTS idx_catalog_progress_user ON catalog_progress(user_id);
