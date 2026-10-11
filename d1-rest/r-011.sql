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
SELECT (SELECT id FROM courses WHERE slug = 'art-drawing-basics'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Lines and Shapes' AS title, 'Almost every drawing starts with simple lines and shapes — circles, squares and triangles combine to build more complex pictures.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'The Colour Wheel' AS title, 'Primary colours — red, yellow and blue — combine to make every other colour on the colour wheel.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'art-drawing-basics');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Music Theory for Kids', 'music-theory-for-kids',
  'Music Theory for Kids introduces rhythm, pitch and simple notation, giving young musicians a foundation whether they play an instrument or just love to sing.',
  (SELECT id FROM course_categories WHERE slug = 'creative'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '8-12', 'English',
  '["Clap and count basic rhythms", "Recognise high and low pitch", "Read simple musical notation", "Identify beat and tempo"]',
  '["No instrument required"]',
  7000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'music-theory-for-kids'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Rhythm and Beat' AS title, 'A beat is a steady pulse, like a clock ticking, and rhythm is the pattern of long and short sounds placed over that beat.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'High and Low Notes' AS title, 'Pitch describes how high or low a sound is — a whistle is high-pitched, while a drum is often low-pitched.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'music-theory-for-kids');
