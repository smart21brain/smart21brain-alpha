INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'web-design-for-kids'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'HTML Builds the Page' AS title, 'HTML uses tags like headings and paragraphs to give a web page its structure, the same way a skeleton gives your body its shape.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'CSS Adds the Style' AS title, 'CSS controls how a page looks — colours, fonts and spacing — separately from the HTML that controls what the page contains.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'web-design-for-kids');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'English Reading Adventures', 'english-reading-adventures',
  'English Reading Adventures builds phonics and comprehension through short, engaging stories, with simple questions after each one to check understanding.',
  (SELECT id FROM course_categories WHERE slug = 'languages'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Sound out unfamiliar words", "Build reading fluency", "Answer simple comprehension questions", "Grow reading vocabulary"]',
  '["Knows the alphabet"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'english-reading-adventures'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Sounding Out Words' AS title, 'Breaking a word into its individual sounds, then blending them back together, is one of the fastest ways to read a new word.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Reading for Meaning' AS title, 'Good readers pause to ask what just happened in a story and what might happen next — that''s called comprehension.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'english-reading-adventures');

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
SELECT (SELECT id FROM courses WHERE slug = 'african-history-highlights'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Great African Kingdoms' AS title, 'Kingdoms such as Mali, Great Zimbabwe and Aksum grew wealthy and powerful through trade, farming and skilled craftsmanship long before European contact.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Trade Across the Continent' AS title, 'Trade routes carried gold, salt, ivory and spices across Africa and beyond, connecting distant communities and spreading ideas.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'african-history-highlights');

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
