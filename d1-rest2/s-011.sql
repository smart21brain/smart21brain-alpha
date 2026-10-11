INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Citizenship & Community', 'citizenship-community',
  'Citizenship & Community looks at rules, responsibilities and cooperation, helping young learners see how they can contribute to a fair, caring community.',
  (SELECT id FROM course_categories WHERE slug = 'social-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Explain why communities need rules", "Describe rights and responsibilities", "Give examples of good citizenship", "Practice resolving disagreements fairly"]',
  '["None"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'citizenship-community'), 'Why We Need Rules', 'text', 'Rules help people live and work together safely and fairly, whether at home, at school, or in a whole country.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'citizenship-community');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'citizenship-community'), 'Being a Good Citizen', 'text', 'A good citizen helps others, follows fair rules, and speaks up respectfully when something seems unfair.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'citizenship-community');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Art & Drawing Basics', 'art-drawing-basics',
  'Art & Drawing Basics builds confidence with line, shape and colour through simple, guided drawing exercises that anyone can follow with just paper and a pencil.',
  (SELECT id FROM course_categories WHERE slug = 'creative'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Draw basic shapes confidently", "Understand the colour wheel", "Use shading for depth", "Complete a finished drawing"]',
  '["Paper and a pencil or crayons"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'art-drawing-basics'), 'Lines and Shapes', 'text', 'Almost every drawing starts with simple lines and shapes — circles, squares and triangles combine to build more complex pictures.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'art-drawing-basics');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'art-drawing-basics'), 'The Colour Wheel', 'text', 'Primary colours — red, yellow and blue — combine to make every other colour on the colour wheel.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'art-drawing-basics');
