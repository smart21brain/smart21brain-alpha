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

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'citizenship-community'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Why We Need Rules' AS title, 'Rules help people live and work together safely and fairly, whether at home, at school, or in a whole country.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Being a Good Citizen' AS title, 'A good citizen helps others, follows fair rules, and speaks up respectfully when something seems unfair.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'citizenship-community');
