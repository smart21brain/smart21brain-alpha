-- ---------------------------------------------------------------------
-- Per-lesson completion, for progress bars + course completion checks
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lesson_progress (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  lesson_id     INTEGER NOT NULL REFERENCES course_lessons(id) ON DELETE CASCADE,
  completed     INTEGER NOT NULL DEFAULT 0,
  completed_at  TEXT,
  UNIQUE(user_id, lesson_id)
);

CREATE INDEX IF NOT EXISTS idx_lesson_progress_user ON lesson_progress(user_id);

-- ---------------------------------------------------------------------
-- PHASE 8 — Certificates. Issued automatically (see
-- src/lib/course-engine.js) the moment a learner clears every gate in
-- the completion algorithm on a course with certificate_enabled = 1.
-- `code` is the short public verification code printed/QR'd on the
-- certificate — anyone with it can confirm it's real via
-- GET /api/certificates/:code, the same pattern school-verify.html
-- already uses for student ID cards. One certificate per (user, course).
-- ---------------------------------------------------------------------
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

-- ---------------------------------------------------------------------
-- Seed categories matching what the site already advertises on
-- courses.html/subjects.html, so the catalog filters have real options.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES
('Mathematics', 'mathematics', 'fa-solid fa-calculator'),
('Science', 'science', 'fa-solid fa-flask'),
('Computer Studies', 'computer-studies', 'fa-solid fa-laptop-code'),
('Languages', 'languages', 'fa-solid fa-language'),
('Social Studies', 'social-studies', 'fa-solid fa-earth-africa'),
('Creative', 'creative', 'fa-solid fa-palette');

-- ---------------------------------------------------------------------
-- Seed one real, complete course (mirrors the demo content that used to
-- be hard-coded on course.html) so the catalog isn't empty on first
-- deploy and the whole flow — catalog, enroll, lessons, progress — is
-- testable immediately.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Fractions Made Fun', 'fractions-made-fun',
  'Fractions Made Fun breaks one of the trickiest primary-maths topics into small, visual steps. Each lesson pairs a short explanation with a hands-on example.',
  (SELECT id FROM course_categories WHERE slug = 'mathematics'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Compare and order fractions confidently","Add and subtract simple fractions","Convert fractions to decimals","Spot fractions in everyday life"]',
  '["No prior fraction knowledge needed","A notebook and pencil"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');
