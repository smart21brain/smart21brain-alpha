INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'World Geography Explorers', 'world-geography-explorers',
  'World Geography Explorers tours the seven continents and major oceans, building map-reading skills and curiosity about people and places far and near.',
  (SELECT id FROM course_categories WHERE slug = 'social-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Name the seven continents and five oceans", "Read a simple map and compass rose", "Compare climates around the world", "Locate Tanzania on a map"]',
  '["None \u2014 beginners welcome"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'world-geography-explorers'), 'Seven Continents', 'text', 'The world is divided into seven continents: Africa, Asia, Europe, North America, South America, Australia and Antarctica.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'world-geography-explorers');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'world-geography-explorers'), 'Reading a Map', 'text', 'A map''s compass rose shows north, south, east and west, helping you figure out direction and find your way around.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'world-geography-explorers');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'African History Highlights', 'african-history-highlights',
  'African History Highlights surveys great kingdoms, trade routes and independence movements across the continent, told through short, story-driven lessons.',
  (SELECT id FROM course_categories WHERE slug = 'social-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '9-13', 'English',
  '["Describe a major historic African kingdom", "Explain the importance of trade routes", "Understand the path to independence", "Connect history to today"]',
  '["Basic reading level for this age group"]',
  6000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'african-history-highlights'), 'Great African Kingdoms', 'text', 'Kingdoms such as Mali, Great Zimbabwe and Aksum grew wealthy and powerful through trade, farming and skilled craftsmanship long before European contact.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'african-history-highlights');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'african-history-highlights'), 'Trade Across the Continent', 'text', 'Trade routes carried gold, salt, ivory and spices across Africa and beyond, connecting distant communities and spreading ideas.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'african-history-highlights');
