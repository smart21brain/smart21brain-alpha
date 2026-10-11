UPDATE course_lessons SET module_id = (
  SELECT m.id FROM course_modules m
  JOIN courses c ON c.id = m.course_id
  WHERE c.slug = 'fractions-made-fun' AND m.title = 'Module 1: Fraction Basics'
)
WHERE course_id = (SELECT id FROM courses WHERE slug = 'fractions-made-fun')
  AND title IN ('What is a Fraction?', 'Halves and Quarters', 'Comparing Fractions');

UPDATE course_lessons SET module_id = (
  SELECT m.id FROM course_modules m
  JOIN courses c ON c.id = m.course_id
  WHERE c.slug = 'fractions-made-fun' AND m.title = 'Module 2: Fractions in Action'
)
WHERE course_id = (SELECT id FROM courses WHERE slug = 'fractions-made-fun')
  AND title IN ('Equivalent Fractions', 'Adding Simple Fractions', 'Fractions in Real Life');

UPDATE courses SET
  final_exam_quiz_id = (SELECT id FROM quizzes WHERE title = 'Fractions Made Fun — Final Exam'),
  final_exam_passing_score = 70
WHERE slug = 'fractions-made-fun'
  AND EXISTS (SELECT 1 FROM quizzes WHERE title = 'Fractions Made Fun — Final Exam');

-- Account-level progress for the built-in course catalog (see catalog-progress-schema.sql)
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

-- ---------------------------------------------------------------------
-- Phase 10: Teacher dashboard (reviews, announcements, assignments, settings)
-- Same content as migrations/phase10-teacher-dashboard.sql
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating         INTEGER NOT NULL,                 -- 1..5
  comment        TEXT,
  teacher_reply  TEXT,
  replied_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id);

-- Announcements posted by a teacher. course_id NULL = every student enrolled
-- in any of that teacher's courses.
CREATE TABLE IF NOT EXISTS announcements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON announcements(teacher_id);

CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);

-- Assignments attached to a course (visible to enrolled students).
CREATE TABLE IF NOT EXISTS assignments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  instructions  TEXT,
  due_date      TEXT,                               -- YYYY-MM-DD, optional
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
