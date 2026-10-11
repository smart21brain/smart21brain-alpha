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
