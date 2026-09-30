-- =======================================================================
-- COURSE ENGINE — Smart21Brain main-site LMS core
-- courses -> modules -> lessons + quiz, ... -> final exam -> certificate.
-- Apply together with schema.sql (same D1 database) — this file is
-- appended into schema.sql by the build; kept separate here for review.
--
-- PHASE 8 (course_modules, course_lessons.module_id, courses.final_exam_*,
-- certificates) changed two EXISTING tables. A brand-new database created
-- from this file already has those columns baked into the CREATE TABLE
-- statements below. A database that was already running Phase 1-7 needs
-- the one-time migrations/phase8-course-engine-v2.sql run first (plain
-- SQLite has no "ALTER TABLE ... ADD COLUMN IF NOT EXISTS", so that step
-- can't be folded into this idempotent file) — see DEPLOY_CLOUDFLARE.md.
-- =======================================================================

-- ---------------------------------------------------------------------
-- Course categories (admin-manageable)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT DEFAULT 'fa-solid fa-book',           -- Font Awesome class, matches existing badge-pill icons
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  thumbnail_url       TEXT,
  category_id         INTEGER REFERENCES course_categories(id) ON DELETE SET NULL,
  instructor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  level               TEXT NOT NULL DEFAULT 'beginner',   -- beginner|intermediate|advanced|all-levels
  age_range           TEXT,                                -- e.g. '7-10'
  language            TEXT DEFAULT 'English',
  objectives          TEXT,                                -- JSON array of strings ("what you'll learn")
  requirements        TEXT,                                -- JSON array of strings
  price               REAL NOT NULL DEFAULT 0,
  is_free             INTEGER NOT NULL DEFAULT 1,           -- 0/1 — kept alongside price for fast filtering
  certificate_enabled INTEGER NOT NULL DEFAULT 0,           -- 0/1 — certificate issued on completion
  passing_score       INTEGER NOT NULL DEFAULT 70,          -- REQUIRED PERCENTAGE: % of the course (lessons + any
                                                             -- module quizzes) that must be completed before the
                                                             -- final exam unlocks, or before the course itself is
                                                             -- marked done when there's no final exam.
  -- PHASE 8 — Final Exam: one optional exam (a normal row in the
  -- existing `quizzes` table) that sits above the modules, not inside
  -- one. It only unlocks once passing_score above is met, and the
  -- learner must clear final_exam_passing_score to complete the course.
  -- See src/lib/course-engine.js for how these two fields gate completion.
  final_exam_quiz_id       INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  final_exam_passing_score INTEGER NOT NULL DEFAULT 70,
  published           INTEGER NOT NULL DEFAULT 1,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);
CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);
CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);

-- ---------------------------------------------------------------------
-- PHASE 8 — Modules: the layer between a course and its lessons.
--   Course → Module → Lessons + (optional) Module Quiz → ... → Final Exam
-- A module's quiz is just another row in `quizzes`, referenced here —
-- no separate quiz-authoring system needed. passing_score is the %
-- correct required on THAT quiz for the module to count as done.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_modules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  quiz_id        INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  passing_score  INTEGER NOT NULL DEFAULT 70,        -- % correct required on this module's quiz, if it has one
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, title)
);
CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);

-- ---------------------------------------------------------------------
-- Lessons — belong to a course (and, from Phase 8 on, usually to one of
-- its modules — module_id is nullable so older/simple courses can keep
-- a flat lesson list with no modules at all). A lesson can point at
-- existing content (a video, a material/PDF, or a quiz) or just carry
-- its own text body — reusing the site's existing content tables
-- instead of duplicating video/PDF storage.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_lessons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id         INTEGER REFERENCES course_modules(id) ON DELETE SET NULL, -- PHASE 8: which module (if any)
  title             TEXT NOT NULL,
  content_type      TEXT NOT NULL DEFAULT 'text',   -- text|video|pdf|quiz
  video_id          INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  material_id       INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  quiz_id           INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  body              TEXT,                             -- lesson text / instructions
  duration_seconds  INTEGER,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_preview        INTEGER NOT NULL DEFAULT 0,        -- 0/1 — viewable without enrolling
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, title)
);
CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id);
CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);

-- ---------------------------------------------------------------------
-- Enrollments — one row per (user, course). payment_status distinguishes
-- free enrollments from paid ones; 'pending' is used for a paid course
-- until a payment integration (a later phase) confirms it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_enrollments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_status  TEXT NOT NULL DEFAULT 'free',      -- free|paid|pending
  status          TEXT NOT NULL DEFAULT 'active',    -- active|completed
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  UNIQUE(user_id, course_id)
);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);

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

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'The Solar System Adventure', 'solar-system-adventure',
  'The Solar System Adventure takes young learners on a tour past the Sun, all eight planets, and the moons and asteroids in between, building a sense of scale and wonder.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Name the eight planets in order", "Describe what makes each planet unique", "Explain day and night", "Understand what a moon is"]',
  '["Curiosity about space"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'solar-system-adventure'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Meet the Sun' AS title, 'The Sun is a giant ball of hot gas at the centre of our solar system. Its gravity holds all the planets in orbit around it.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'The Rocky Planets' AS title, 'Mercury, Venus, Earth and Mars are called rocky planets because they have solid, rocky surfaces you could stand on.' AS body, 2 AS sort_order, 0 AS is_preview
  UNION ALL
  SELECT 'The Gas Giants' AS title, 'Jupiter, Saturn, Uranus and Neptune are huge planets made mostly of gas, with no solid surface to land on.' AS body, 3 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'solar-system-adventure');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Human Body Explorers', 'human-body-explorers',
  'Human Body Explorers walks through the major body systems — skeletal, muscular, digestive and circulatory — explaining how they work together to keep us alive and moving.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '8-11', 'English',
  '["Name the major body systems", "Explain how the heart pumps blood", "Describe how food is digested", "Understand bones and muscles working together"]',
  '["None \u2014 just curiosity"]',
  6000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'human-body-explorers'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Your Amazing Skeleton' AS title, 'Bones give your body its shape and protect your organs. An adult has 206 bones, but babies are born with even more, some of which fuse together.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'How Your Heart Works' AS title, 'Your heart is a muscle that pumps blood around your body, delivering oxygen to every cell and carrying away waste.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'human-body-explorers');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Plant Life Cycles', 'plant-life-cycles',
  'Plant Life Cycles follows a seed from planting to flowering, with simple experiments kids can try at home using a cup, soil and a sunny windowsill.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Describe the stages of a plant''s life cycle", "Explain what plants need to grow", "Understand pollination simply", "Grow and observe a seed"]',
  '["A small pot or cup and some soil (optional)"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'plant-life-cycles'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'From Seed to Seedling' AS title, 'A seed contains everything a new plant needs to start growing, as long as it gets water, warmth and, later, light.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'What Plants Need to Grow' AS title, 'Plants need sunlight, water, air and nutrients from the soil. Take any one of these away for too long and growth slows or stops.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'plant-life-cycles');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Fun with Chemistry', 'fun-with-chemistry',
  'Fun with Chemistry introduces atoms, elements and simple reactions through safe, describable kitchen-science demonstrations, building toward the periodic table.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'advanced', '11-14', 'English',
  '["Explain atoms, elements and compounds", "Describe solids, liquids and gases changing state", "Understand simple chemical reactions", "Read a basic periodic table"]',
  '["Basic science vocabulary from earlier grades"]',
  9000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fun-with-chemistry'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Atoms and Elements' AS title, 'Everything around you is made of atoms — incredibly tiny building blocks. An element is a substance made of only one type of atom.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'States of Matter' AS title, 'Matter exists as a solid, liquid or gas depending on how tightly its particles are packed and how much they move.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fun-with-chemistry');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Intro to Coding with Blocks', 'intro-coding-with-blocks',
  'Intro to Coding with Blocks teaches programming logic — sequences, loops and conditionals — using drag-and-drop block coding ideas, no typing required.',
  (SELECT id FROM course_categories WHERE slug = 'computer-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Understand what an algorithm is", "Use sequences and loops", "Use if/then logic", "Debug a simple program"]',
  '["A computer or tablet for practice (optional)"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'intro-coding-with-blocks'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'What Is Code?' AS title, 'Code is a set of instructions that tells a computer exactly what to do, step by step, in an order it can follow — just like a recipe.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Loops Save Time' AS title, 'A loop repeats a set of instructions instead of writing them over and over. If you want to draw 4 sides of a square, a loop repeats ''move and turn'' four times.' AS body, 2 AS sort_order, 0 AS is_preview
  UNION ALL
  SELECT 'If This, Then That' AS title, 'Conditionals let a program make decisions. ''If it is raining, then bring an umbrella'' is the same logic a program uses to branch between choices.' AS body, 3 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'intro-coding-with-blocks');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Typing & Computer Basics', 'typing-computer-basics',
  'Typing & Computer Basics covers keyboard layout, mouse control, and safe habits for using a computer, giving young learners a confident starting point.',
  (SELECT id FROM course_categories WHERE slug = 'computer-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Identify keyboard and mouse parts", "Practice home-row typing", "Open and save a simple file", "Follow basic online safety rules"]',
  '["Access to any keyboard for practice"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'typing-computer-basics'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Meet the Keyboard' AS title, 'The keyboard''s home row — ASDF and JKL; — is where your fingers rest, letting you reach every other key without looking down.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Staying Safe Online' AS title, 'Never share your full name, address or password with people you meet online, and always ask a trusted adult before downloading anything.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'typing-computer-basics');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Web Design for Kids', 'web-design-for-kids',
  'Web Design for Kids introduces HTML and CSS basics so students can build and style their own simple web page, learning structure before decoration.',
  (SELECT id FROM course_categories WHERE slug = 'computer-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '10-13', 'English',
  '["Understand what HTML and CSS do", "Structure a page with headings and paragraphs", "Style text and colours with CSS", "Publish a simple page"]',
  '["Comfortable typing", "Basic computer navigation"]',
  7000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'web-design-for-kids'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'HTML Builds the Page' AS title, 'HTML uses tags like headings and paragraphs to give a web page its structure, the same way a skeleton gives your body its shape.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'CSS Adds the Style' AS title, 'CSS controls how a page looks — colours, fonts and spacing — separately from the HTML that controls what the page contains.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'web-design-for-kids');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'English Reading Adventures', 'english-reading-adventures',
  'English Reading Adventures builds phonics and comprehension through short, engaging stories, with simple questions after each one to check understanding.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Sound out unfamiliar words", "Build reading fluency", "Answer simple comprehension questions", "Grow reading vocabulary"]',
  '["Knows the alphabet"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'english-reading-adventures'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Sounding Out Words' AS title, 'Breaking a word into its individual sounds, then blending them back together, is one of the fastest ways to read a new word.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Reading for Meaning' AS title, 'Good readers pause to ask what just happened in a story and what might happen next — that''s called comprehension.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'english-reading-adventures');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Swahili for Beginners', 'swahili-for-beginners',
  'Swahili for Beginners teaches everyday greetings, numbers and simple sentences, giving learners a warm, practical start with East Africa''s widely spoken language.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', 'all', 'English',
  '["Greet people politely in Swahili", "Count from one to twenty", "Introduce yourself and your family", "Use common everyday phrases"]',
  '["None \u2014 beginners welcome"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'swahili-for-beginners'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Greetings: Jambo and Habari' AS title, '''Jambo'' and ''Habari'' are common friendly greetings in Swahili, used throughout the day when meeting someone.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Counting in Swahili' AS title, 'Numbers one through ten in Swahili — moja, mbili, tatu and onward — are the foundation for talking about age, time and money.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'swahili-for-beginners');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Creative Writing Workshop', 'creative-writing-workshop',
  'Creative Writing Workshop guides students through building characters, settings and plots, turning a blank page into a finished short story.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '9-12', 'English',
  '["Develop a story character", "Describe a setting vividly", "Structure a beginning, middle and end", "Edit their own writing"]',
  '["Comfortable writing full sentences"]',
  6000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'creative-writing-workshop'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Building a Character' AS title, 'A memorable character usually has a clear want, a flaw, and a habit or detail that makes them feel real to the reader.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Show, Don''t Tell' AS title, 'Instead of saying a character is sad, describing their slumped shoulders and quiet voice lets the reader feel it for themselves.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'creative-writing-workshop');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Vocabulary Builders', 'vocabulary-builders',
  'Vocabulary Builders grows word power through roots, prefixes and suffixes, so students can decode unfamiliar words instead of just memorising lists.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'all-levels', '8-14', 'English',
  '["Recognise common prefixes and suffixes", "Use context clues for new words", "Build a personal word bank", "Use new words in writing"]',
  '["Basic reading fluency"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'vocabulary-builders'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Prefixes Change Meaning' AS title, 'Adding ''un-'' or ''re-'' to the front of a word changes its meaning — ''happy'' becomes ''unhappy'', ''do'' becomes ''redo''.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Context Clues' AS title, 'Even without knowing a word, the sentences around it often hint at what it means — that hint is called a context clue.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'vocabulary-builders');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'World Geography Explorers', 'world-geography-explorers',
  'World Geography Explorers tours the seven continents and major oceans, building map-reading skills and curiosity about people and places far and near.',
  (SELECT id FROM course_categories WHERE slug = 'social-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Name the seven continents and five oceans", "Read a simple map and compass rose", "Compare climates around the world", "Locate Tanzania on a map"]',
  '["None \u2014 beginners welcome"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'world-geography-explorers'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Seven Continents' AS title, 'The world is divided into seven continents: Africa, Asia, Europe, North America, South America, Australia and Antarctica.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Reading a Map' AS title, 'A map''s compass rose shows north, south, east and west, helping you figure out direction and find your way around.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'world-geography-explorers');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'African History Highlights', 'african-history-highlights',
  'African History Highlights surveys great kingdoms, trade routes and independence movements across the continent, told through short, story-driven lessons.',
  (SELECT id FROM course_categories WHERE slug = 'social-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '9-13', 'English',
  '["Describe a major historic African kingdom", "Explain the importance of trade routes", "Understand the path to independence", "Connect history to today"]',
  '["Basic reading level for this age group"]',
  6000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'african-history-highlights'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Great African Kingdoms' AS title, 'Kingdoms such as Mali, Great Zimbabwe and Aksum grew wealthy and powerful through trade, farming and skilled craftsmanship long before European contact.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Trade Across the Continent' AS title, 'Trade routes carried gold, salt, ivory and spices across Africa and beyond, connecting distant communities and spreading ideas.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'african-history-highlights');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Citizenship & Community', 'citizenship-community',
  'Citizenship & Community looks at rules, responsibilities and cooperation, helping young learners see how they can contribute to a fair, caring community.',
  (SELECT id FROM course_categories WHERE slug = 'social-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Explain why communities need rules", "Describe rights and responsibilities", "Give examples of good citizenship", "Practice resolving disagreements fairly"]',
  '["None"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'citizenship-community'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Why We Need Rules' AS title, 'Rules help people live and work together safely and fairly, whether at home, at school, or in a whole country.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Being a Good Citizen' AS title, 'A good citizen helps others, follows fair rules, and speaks up respectfully when something seems unfair.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'citizenship-community');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Art & Drawing Basics', 'art-drawing-basics',
  'Art & Drawing Basics builds confidence with line, shape and colour through simple, guided drawing exercises that anyone can follow with just paper and a pencil.',
  (SELECT id FROM course_categories WHERE slug = 'creative'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Draw basic shapes confidently", "Understand the colour wheel", "Use shading for depth", "Complete a finished drawing"]',
  '["Paper and a pencil or crayons"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'art-drawing-basics'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Lines and Shapes' AS title, 'Almost every drawing starts with simple lines and shapes — circles, squares and triangles combine to build more complex pictures.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'The Colour Wheel' AS title, 'Primary colours — red, yellow and blue — combine to make every other colour on the colour wheel.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'art-drawing-basics');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Music Theory for Kids', 'music-theory-for-kids',
  'Music Theory for Kids introduces rhythm, pitch and simple notation, giving young musicians a foundation whether they play an instrument or just love to sing.',
  (SELECT id FROM course_categories WHERE slug = 'creative'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '8-12', 'English',
  '["Clap and count basic rhythms", "Recognise high and low pitch", "Read simple musical notation", "Identify beat and tempo"]',
  '["No instrument required"]',
  7000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'music-theory-for-kids'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Rhythm and Beat' AS title, 'A beat is a steady pulse, like a clock ticking, and rhythm is the pattern of long and short sounds placed over that beat.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'High and Low Notes' AS title, 'Pitch describes how high or low a sound is — a whistle is high-pitched, while a drum is often low-pitched.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'music-theory-for-kids');

-- =======================================================================
-- PHASE 8 — Course Engine v2 demo: "Fractions Made Fun" rebuilt as the
-- full Module → Lessons + Quiz → ... → Final Exam → Certificate shape,
-- so the new engine has one real, click-through-able example instead of
-- shipping as an empty skeleton. Every other seeded course above is left
-- as a flat lesson list — module_id stays NULL for them, which the
-- course engine treats as perfectly valid (see src/lib/course-engine.js).
-- Guarded with WHERE NOT EXISTS on title, since quizzes has no unique
-- constraint to lean on for INSERT OR IGNORE the way the tables above do.
-- =======================================================================

INSERT INTO quizzes (title, subject, description, questions, published, created_by)
SELECT
  'Fractions Made Fun — Module 1 Quiz', 'Mathematics',
  'Checks the basics: what a fraction is, and comparing simple fractions.',
  '[
    {"prompt":"In the fraction 3/4, what does the 4 tell you?","options":["How many parts you have","How many equal parts the whole is split into","The size of each part in centimetres","Nothing important"],"correct_index":1,"explanation":"The bottom number (denominator) tells you how many equal parts the whole is divided into."},
    {"prompt":"Which is bigger, 3/8 or 5/8?","options":["3/8","5/8","They are equal","Cannot tell"],"correct_index":1,"explanation":"Same denominator, so compare the numerators — 5 is bigger than 3, so 5/8 is bigger."},
    {"prompt":"What is a quarter of a whole?","options":["Splitting it into 2 equal parts","Splitting it into 3 equal parts","Splitting it into 4 equal parts","Splitting it into 8 equal parts"],"correct_index":2,"explanation":"A quarter means dividing the whole into 4 equal parts and taking one."}
  ]',
  1, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Fractions Made Fun — Module 1 Quiz');

INSERT INTO quizzes (title, subject, description, questions, published, created_by)
SELECT
  'Fractions Made Fun — Module 2 Quiz', 'Mathematics',
  'Checks equivalent fractions, adding simple fractions, and spotting fractions in real life.',
  '[
    {"prompt":"Which fraction is equivalent to 1/2?","options":["1/3","2/4","3/8","1/5"],"correct_index":1,"explanation":"2/4 simplifies to 1/2 — both represent the same amount, just cut into more, smaller pieces."},
    {"prompt":"What is 1/4 + 2/4?","options":["1/4","2/4","3/4","3/8"],"correct_index":2,"explanation":"Same denominator, so add the numerators: 1 + 2 = 3, giving 3/4."},
    {"prompt":"Which of these is an example of a fraction in real life?","options":["Counting to ten","Sharing a pizza into equal slices","Naming a colour","Reading the time on a digital clock"],"correct_index":1,"explanation":"Cutting a pizza into equal slices is a everyday fraction — each slice is a fraction of the whole pizza."}
  ]',
  1, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Fractions Made Fun — Module 2 Quiz');

INSERT INTO quizzes (title, subject, description, questions, published, created_by)
SELECT
  'Fractions Made Fun — Final Exam', 'Mathematics',
  'Covers everything in Fractions Made Fun — comparing, equivalence and simple addition.',
  '[
    {"prompt":"What does the top number of a fraction (the numerator) tell you?","options":["How many equal parts the whole is split into","How many of those parts you have","The name of the fraction","Nothing important"],"correct_index":1,"explanation":"The numerator counts how many of the equal parts you actually have."},
    {"prompt":"Which is bigger: 2/5 or 4/5?","options":["2/5","4/5","They are equal","Cannot tell"],"correct_index":1,"explanation":"Same denominator, so the fraction with the bigger numerator — 4/5 — is bigger."},
    {"prompt":"Which fraction is equivalent to 2/4?","options":["1/2","1/3","3/4","1/8"],"correct_index":0,"explanation":"2/4 simplifies to 1/2 — cutting something in half is the same whether you call it 1/2 or 2/4."},
    {"prompt":"What is 2/6 + 3/6?","options":["5/6","5/12","1/6","6/6"],"correct_index":0,"explanation":"Same denominator, so add the numerators: 2 + 3 = 5, giving 5/6."},
    {"prompt":"You cut a cake into 8 equal slices and eat 3. What fraction did you eat?","options":["3/5","3/8","8/3","5/8"],"correct_index":1,"explanation":"You ate 3 of the 8 equal slices, so that''s 3/8 of the cake."}
  ]',
  1, (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin')
  AND NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Fractions Made Fun — Final Exam');

INSERT OR IGNORE INTO course_modules (course_id, title, description, quiz_id, passing_score, sort_order)
SELECT
  (SELECT id FROM courses WHERE slug = 'fractions-made-fun'),
  'Module 1: Fraction Basics',
  'What a fraction is, and how to compare simple fractions.',
  (SELECT id FROM quizzes WHERE title = 'Fractions Made Fun — Module 1 Quiz'),
  70, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun')
  AND EXISTS (SELECT 1 FROM quizzes WHERE title = 'Fractions Made Fun — Module 1 Quiz');

INSERT OR IGNORE INTO course_modules (course_id, title, description, quiz_id, passing_score, sort_order)
SELECT
  (SELECT id FROM courses WHERE slug = 'fractions-made-fun'),
  'Module 2: Fractions in Action',
  'Equivalent fractions, adding simple fractions, and where fractions turn up in everyday life.',
  (SELECT id FROM quizzes WHERE title = 'Fractions Made Fun — Module 2 Quiz'),
  70, 2
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun')
  AND EXISTS (SELECT 1 FROM quizzes WHERE title = 'Fractions Made Fun — Module 2 Quiz');

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
