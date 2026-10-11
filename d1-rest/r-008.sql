INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Swahili for Beginners', 'swahili-for-beginners',
  'Swahili for Beginners teaches everyday greetings, numbers and simple sentences, giving learners a warm, practical start with East Africa''s widely spoken language.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', 'all', 'English',
  '["Greet people politely in Swahili", "Count from one to twenty", "Introduce yourself and your family", "Use common everyday phrases"]',
  '["None \u2014 beginners welcome"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'swahili-for-beginners'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Greetings: Jambo and Habari' AS title, '''Jambo'' and ''Habari'' are common friendly greetings in Swahili, used throughout the day when meeting someone.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Counting in Swahili' AS title, 'Numbers one through ten in Swahili — moja, mbili, tatu and onward — are the foundation for talking about age, time and money.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'swahili-for-beginners');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Creative Writing Workshop', 'creative-writing-workshop',
  'Creative Writing Workshop guides students through building characters, settings and plots, turning a blank page into a finished short story.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '9-12', 'English',
  '["Develop a story character", "Describe a setting vividly", "Structure a beginning, middle and end", "Edit their own writing"]',
  '["Comfortable writing full sentences"]',
  6000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'creative-writing-workshop'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Building a Character' AS title, 'A memorable character usually has a clear want, a flaw, and a habit or detail that makes them feel real to the reader.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Show, Don''t Tell' AS title, 'Instead of saying a character is sad, describing their slumped shoulders and quiet voice lets the reader feel it for themselves.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'creative-writing-workshop');
