INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Plant Life Cycles', 'plant-life-cycles',
  'Plant Life Cycles follows a seed from planting to flowering, with simple experiments kids can try at home using a cup, soil and a sunny windowsill.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Describe the stages of a plant''s life cycle", "Explain what plants need to grow", "Understand pollination simply", "Grow and observe a seed"]',
  '["A small pot or cup and some soil (optional)"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'plant-life-cycles'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'From Seed to Seedling' AS title, 'A seed contains everything a new plant needs to start growing, as long as it gets water, warmth and, later, light.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'What Plants Need to Grow' AS title, 'Plants need sunlight, water, air and nutrients from the soil. Take any one of these away for too long and growth slows or stops.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'plant-life-cycles');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Fun with Chemistry', 'fun-with-chemistry',
  'Fun with Chemistry introduces atoms, elements and simple reactions through safe, describable kitchen-science demonstrations, building toward the periodic table.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'advanced', '11-14', 'English',
  '["Explain atoms, elements and compounds", "Describe solids, liquids and gases changing state", "Understand simple chemical reactions", "Read a basic periodic table"]',
  '["Basic science vocabulary from earlier grades"]',
  9000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'fun-with-chemistry'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Atoms and Elements' AS title, 'Everything around you is made of atoms — incredibly tiny building blocks. An element is a substance made of only one type of atom.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'States of Matter' AS title, 'Matter exists as a solid, liquid or gas depending on how tightly its particles are packed and how much they move.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'fun-with-chemistry');
