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

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'What is a Fraction?' AS title,
    'A fraction shows a part of a whole. The top number (numerator) tells us how many parts we have, and the bottom number (denominator) tells us how many equal parts the whole is split into.' AS body,
    1 AS sort_order, 1 AS is_preview
  UNION ALL SELECT 'Halves and Quarters',
    'A half means splitting something into 2 equal parts. A quarter means splitting it into 4 equal parts. Try cutting a piece of paper in half, then in half again — that''s a quarter!',
    2, 0
  UNION ALL SELECT 'Comparing Fractions',
    'When two fractions share the same denominator, the one with the bigger numerator is bigger. Picture two pizzas cut into the same number of slices — whoever has more slices has more pizza.',
    3, 0
  UNION ALL SELECT 'Equivalent Fractions',
    'Different fractions can represent the same amount — for example 1/2 is the same amount as 2/4. We call these equivalent fractions.',
    4, 0
  UNION ALL SELECT 'Adding Simple Fractions',
    'To add fractions that share a denominator, add the numerators and keep the denominator the same. For example, 1/4 + 2/4 = 3/4.',
    5, 0
  UNION ALL SELECT 'Fractions in Real Life',
    'Fractions are everywhere — in cooking recipes, sharing snacks, and telling time. Look around you right now: can you spot something split into equal parts?',
    6, 0
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');

-- ---------------------------------------------------------------------
-- Additional catalog seed — a broader spread of courses across every
-- category and level so the catalog page (courses.html) has plenty to
-- show out of the box instead of a near-empty grid.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Multiplication Mastery', 'multiplication-mastery',
  'Multiplication Mastery turns times tables into a game. Kids build speed and confidence through short daily drills, visual grouping tricks, and real-world word problems.',
  (SELECT id FROM course_categories WHERE slug = 'mathematics'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Recall times tables up to 12", "Use grouping and arrays to multiply", "Solve multiplication word problems", "Spot multiplication patterns"]',
  '["Comfortable counting to 100", "A notebook and pencil"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'multiplication-mastery'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Why We Multiply' AS title, 'Multiplication is really just fast addition — instead of adding 4+4+4, we say 3 times 4. It saves time when you have lots of equal groups.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Times Tables 2 to 5' AS title, 'Practising the 2, 3, 4 and 5 times tables with simple patterns — the 2s are just doubling, and the 5s always end in 0 or 5.' AS body, 2 AS sort_order, 0 AS is_preview
  UNION ALL
  SELECT 'Multiplying with Arrays' AS title, 'An array is rows and columns of dots or objects. Counting rows times columns is a visual way to see multiplication happening.' AS body, 3 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'multiplication-mastery');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Geometry Explorers', 'geometry-explorers',
  'Geometry Explorers gets hands-on with shapes, angles and symmetry, using everyday objects to make abstract ideas concrete before moving to formal definitions.',
  (SELECT id FROM course_categories WHERE slug = 'mathematics'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '9-12', 'English',
  '["Identify and classify 2D and 3D shapes", "Measure and estimate angles", "Recognise lines of symmetry", "Calculate perimeter and area"]',
  '["Basic addition and multiplication", "A ruler and protractor"]',
  8000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'geometry-explorers'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Shapes All Around Us' AS title, 'Every object around you is built from basic shapes — squares, triangles, circles and rectangles. Learning to spot them is the first step in geometry.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Understanding Angles' AS title, 'An angle measures how much one line turns from another, in degrees. Right angles are exactly 90 degrees, like the corner of a book.' AS body, 2 AS sort_order, 0 AS is_preview
  UNION ALL
  SELECT 'Perimeter and Area' AS title, 'Perimeter is the distance around a shape''s edge, while area is the space it covers inside. Both are found using simple counting or multiplication.' AS body, 3 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'geometry-explorers');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Algebra Foundations', 'algebra-foundations',
  'Algebra Foundations introduces variables and equations step by step, showing students that algebra is just a toolkit for describing patterns with letters instead of only numbers.',
  (SELECT id FROM course_categories WHERE slug = 'mathematics'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'advanced', '11-14', 'English',
  '["Understand variables and expressions", "Solve one-step and two-step equations", "Simplify algebraic expressions", "Apply algebra to real problems"]',
  '["Confident with the four operations", "Fractions and decimals basics"]',
  10000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'algebra-foundations'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'What Is a Variable?' AS title, 'A variable is a letter, like x or n, that stands in for a number we don''t know yet. It lets us write general rules instead of one example at a time.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Solving Simple Equations' AS title, 'To solve an equation like x + 5 = 12, we do the same operation to both sides until the variable stands alone — here, subtracting 5 from both sides.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'algebra-foundations');
