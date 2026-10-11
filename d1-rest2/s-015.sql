CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

-- Per-teacher preferences (the toggles in the dashboard's Settings card).
CREATE TABLE IF NOT EXISTS teacher_settings (
  user_id                  INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_profile_to_parents  INTEGER NOT NULL DEFAULT 1,
  email_on_comments        INTEGER NOT NULL DEFAULT 1,
  weekly_summary_email     INTEGER NOT NULL DEFAULT 0,
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);

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

-- Artificial Intelligence and Machine Learning in Depth: course, modules, lessons, quizzes and final exam.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-ai-ml-seed.sql
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES ('Computer Studies','computer-studies','fa-solid fa-laptop-code');

INSERT OR IGNORE INTO courses (title, slug, description, thumbnail_url, category_id, level, age_range, language, objectives, requirements, price, is_free, certificate_enabled, published)
VALUES ('Artificial Intelligence and Machine Learning in Depth', 'artificial-intelligence-machine-learning', 'A deeper, hands-on follow-on to Introduction to AI. Seven modules cover data, classical machine learning, neural networks, language models and generative AI, agents and reinforcement learning, ethics and regulation, and building your own project, with 10 new diagrams, a Python example, quizzes and a final exam.', 'images/ai-ml-course.svg', (SELECT id FROM course_categories WHERE slug='computer-studies'), 'advanced', '14+', 'English', '["Explain how machine learning models learn from data and how to evaluate them honestly", "Describe neural networks, CNNs, transformers and large language models", "Recognise overfitting, bias and hallucination and know how to reduce them", "Use a simple Python workflow to train and test a model", "Discuss AI ethics, privacy, regulation and responsible use"]', '["Basic computer skills", "Comfort with simple maths such as averages and percentages"]', 0, 1, 1, 1);
