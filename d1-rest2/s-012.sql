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
SELECT (SELECT id FROM courses WHERE slug = 'music-theory-for-kids'), 'Rhythm and Beat', 'text', 'A beat is a steady pulse, like a clock ticking, and rhythm is the pattern of long and short sounds placed over that beat.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'music-theory-for-kids');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'music-theory-for-kids'), 'High and Low Notes', 'text', 'Pitch describes how high or low a sound is — a whistle is high-pitched, while a drum is often low-pitched.', 2, 0
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
