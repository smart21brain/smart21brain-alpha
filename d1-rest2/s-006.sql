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
SELECT (SELECT id FROM courses WHERE slug = 'fun-with-chemistry'), 'Atoms and Elements', 'text', 'Everything around you is made of atoms — incredibly tiny building blocks. An element is a substance made of only one type of atom.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fun-with-chemistry');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fun-with-chemistry'), 'States of Matter', 'text', 'Matter exists as a solid, liquid or gas depending on how tightly its particles are packed and how much they move.', 2, 0
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
SELECT (SELECT id FROM courses WHERE slug = 'intro-coding-with-blocks'), 'What Is Code?', 'text', 'Code is a set of instructions that tells a computer exactly what to do, step by step, in an order it can follow — just like a recipe.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'intro-coding-with-blocks');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'intro-coding-with-blocks'), 'Loops Save Time', 'text', 'A loop repeats a set of instructions instead of writing them over and over. If you want to draw 4 sides of a square, a loop repeats ''move and turn'' four times.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'intro-coding-with-blocks');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'intro-coding-with-blocks'), 'If This, Then That', 'text', 'Conditionals let a program make decisions. ''If it is raining, then bring an umbrella'' is the same logic a program uses to branch between choices.', 3, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'intro-coding-with-blocks');
