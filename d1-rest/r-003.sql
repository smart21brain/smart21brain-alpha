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
