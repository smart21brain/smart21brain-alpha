INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'multiplication-mastery'), 'Why We Multiply', 'text', 'Multiplication is really just fast addition — instead of adding 4+4+4, we say 3 times 4. It saves time when you have lots of equal groups.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'multiplication-mastery');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'multiplication-mastery'), 'Times Tables 2 to 5', 'text', 'Practising the 2, 3, 4 and 5 times tables with simple patterns — the 2s are just doubling, and the 5s always end in 0 or 5.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'multiplication-mastery');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'multiplication-mastery'), 'Multiplying with Arrays', 'text', 'An array is rows and columns of dots or objects. Counting rows times columns is a visual way to see multiplication happening.', 3, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'multiplication-mastery');

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
SELECT (SELECT id FROM courses WHERE slug = 'geometry-explorers'), 'Shapes All Around Us', 'text', 'Every object around you is built from basic shapes — squares, triangles, circles and rectangles. Learning to spot them is the first step in geometry.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'geometry-explorers');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'geometry-explorers'), 'Understanding Angles', 'text', 'An angle measures how much one line turns from another, in degrees. Right angles are exactly 90 degrees, like the corner of a book.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'geometry-explorers');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'geometry-explorers'), 'Perimeter and Area', 'text', 'Perimeter is the distance around a shape''s edge, while area is the space it covers inside. Both are found using simple counting or multiplication.', 3, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'geometry-explorers');
