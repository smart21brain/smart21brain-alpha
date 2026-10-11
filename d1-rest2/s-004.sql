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
SELECT (SELECT id FROM courses WHERE slug = 'algebra-foundations'), 'What Is a Variable?', 'text', 'A variable is a letter, like x or n, that stands in for a number we don''t know yet. It lets us write general rules instead of one example at a time.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'algebra-foundations');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'algebra-foundations'), 'Solving Simple Equations', 'text', 'To solve an equation like x + 5 = 12, we do the same operation to both sides until the variable stands alone — here, subtracting 5 from both sides.', 2, 0
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
SELECT (SELECT id FROM courses WHERE slug = 'solar-system-adventure'), 'Meet the Sun', 'text', 'The Sun is a giant ball of hot gas at the centre of our solar system. Its gravity holds all the planets in orbit around it.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'solar-system-adventure');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'solar-system-adventure'), 'The Rocky Planets', 'text', 'Mercury, Venus, Earth and Mars are called rocky planets because they have solid, rocky surfaces you could stand on.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'solar-system-adventure');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'solar-system-adventure'), 'The Gas Giants', 'text', 'Jupiter, Saturn, Uranus and Neptune are huge planets made mostly of gas, with no solid surface to land on.', 3, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'solar-system-adventure');
