INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'The Solar System Adventure', 'solar-system-adventure',
  'The Solar System Adventure takes young learners on a tour past the Sun, all eight planets, and the moons and asteroids in between, building a sense of scale and wonder.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Name the eight planets in order", "Describe what makes each planet unique", "Explain day and night", "Understand what a moon is"]',
  '["Curiosity about space"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'solar-system-adventure'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Meet the Sun' AS title, 'The Sun is a giant ball of hot gas at the centre of our solar system. Its gravity holds all the planets in orbit around it.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'The Rocky Planets' AS title, 'Mercury, Venus, Earth and Mars are called rocky planets because they have solid, rocky surfaces you could stand on.' AS body, 2 AS sort_order, 0 AS is_preview
  UNION ALL
  SELECT 'The Gas Giants' AS title, 'Jupiter, Saturn, Uranus and Neptune are huge planets made mostly of gas, with no solid surface to land on.' AS body, 3 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'solar-system-adventure');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Human Body Explorers', 'human-body-explorers',
  'Human Body Explorers walks through the major body systems — skeletal, muscular, digestive and circulatory — explaining how they work together to keep us alive and moving.',
  (SELECT id FROM course_categories WHERE slug = 'science'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '8-11', 'English',
  '["Name the major body systems", "Explain how the heart pumps blood", "Describe how food is digested", "Understand bones and muscles working together"]',
  '["None \u2014 just curiosity"]',
  6000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'human-body-explorers'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Your Amazing Skeleton' AS title, 'Bones give your body its shape and protect your organs. An adult has 206 bones, but babies are born with even more, some of which fuse together.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'How Your Heart Works' AS title, 'Your heart is a muscle that pumps blood around your body, delivering oxygen to every cell and carrying away waste.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'human-body-explorers');
