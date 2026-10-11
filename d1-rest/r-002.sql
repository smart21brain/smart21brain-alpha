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
