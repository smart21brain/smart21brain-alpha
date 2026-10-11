INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Vocabulary Builders', 'vocabulary-builders',
  'Vocabulary Builders grows word power through roots, prefixes and suffixes, so students can decode unfamiliar words instead of just memorising lists.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'all-levels', '8-14', 'English',
  '["Recognise common prefixes and suffixes", "Use context clues for new words", "Build a personal word bank", "Use new words in writing"]',
  '["Basic reading fluency"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'vocabulary-builders'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Prefixes Change Meaning' AS title, 'Adding ''un-'' or ''re-'' to the front of a word changes its meaning — ''happy'' becomes ''unhappy'', ''do'' becomes ''redo''.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Context Clues' AS title, 'Even without knowing a word, the sentences around it often hint at what it means — that hint is called a context clue.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'vocabulary-builders');

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
SELECT (SELECT id FROM courses WHERE slug = 'world-geography-explorers'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Seven Continents' AS title, 'The world is divided into seven continents: Africa, Asia, Europe, North America, South America, Australia and Antarctica.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Reading a Map' AS title, 'A map''s compass rose shows north, south, east and west, helping you figure out direction and find your way around.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'world-geography-explorers');
