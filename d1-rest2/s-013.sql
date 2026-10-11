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
