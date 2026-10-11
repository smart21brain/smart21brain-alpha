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
SELECT (SELECT id FROM courses WHERE slug = 'human-body-explorers'), 'Your Amazing Skeleton', 'text', 'Bones give your body its shape and protect your organs. An adult has 206 bones, but babies are born with even more, some of which fuse together.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'human-body-explorers');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'human-body-explorers'), 'How Your Heart Works', 'text', 'Your heart is a muscle that pumps blood around your body, delivering oxygen to every cell and carrying away waste.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'human-body-explorers');

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
SELECT (SELECT id FROM courses WHERE slug = 'plant-life-cycles'), 'From Seed to Seedling', 'text', 'A seed contains everything a new plant needs to start growing, as long as it gets water, warmth and, later, light.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'plant-life-cycles');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'plant-life-cycles'), 'What Plants Need to Grow', 'text', 'Plants need sunlight, water, air and nutrients from the soil. Take any one of these away for too long and growth slows or stops.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'plant-life-cycles');
