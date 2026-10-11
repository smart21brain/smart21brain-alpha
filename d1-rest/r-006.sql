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
