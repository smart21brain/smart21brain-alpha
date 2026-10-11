INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), 'What is a Fraction?', 'text', 'A fraction shows a part of a whole. The top number (numerator) tells us how many parts we have, and the bottom number (denominator) tells us how many equal parts the whole is split into.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), 'Halves and Quarters', 'text', 'A half means splitting something into 2 equal parts. A quarter means splitting it into 4 equal parts. Try cutting a piece of paper in half, then in half again — that''s a quarter!', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), 'Comparing Fractions', 'text', 'When two fractions share the same denominator, the one with the bigger numerator is bigger. Picture two pizzas cut into the same number of slices — whoever has more slices has more pizza.', 3, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), 'Equivalent Fractions', 'text', 'Different fractions can represent the same amount — for example 1/2 is the same amount as 2/4. We call these equivalent fractions.', 4, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), 'Adding Simple Fractions', 'text', 'To add fractions that share a denominator, add the numerators and keep the denominator the same. For example, 1/4 + 2/4 = 3/4.', 5, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fractions-made-fun');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fractions-made-fun'), 'Fractions in Real Life', 'text', 'Fractions are everywhere — in cooking recipes, sharing snacks, and telling time. Look around you right now: can you spot something split into equal parts?', 6, 0
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
