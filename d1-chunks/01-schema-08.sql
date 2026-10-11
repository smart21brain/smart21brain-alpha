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
