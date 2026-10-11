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

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Intro to Coding with Blocks', 'intro-coding-with-blocks',
  'Intro to Coding with Blocks teaches programming logic — sequences, loops and conditionals — using drag-and-drop block coding ideas, no typing required.',
  (SELECT id FROM course_categories WHERE slug = 'computer-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '7-10', 'English',
  '["Understand what an algorithm is", "Use sequences and loops", "Use if/then logic", "Debug a simple program"]',
  '["A computer or tablet for practice (optional)"]',
  0, 1, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'intro-coding-with-blocks'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'What Is Code?' AS title, 'Code is a set of instructions that tells a computer exactly what to do, step by step, in an order it can follow — just like a recipe.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Loops Save Time' AS title, 'A loop repeats a set of instructions instead of writing them over and over. If you want to draw 4 sides of a square, a loop repeats ''move and turn'' four times.' AS body, 2 AS sort_order, 0 AS is_preview
  UNION ALL
  SELECT 'If This, Then That' AS title, 'Conditionals let a program make decisions. ''If it is raining, then bring an umbrella'' is the same logic a program uses to branch between choices.' AS body, 3 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'intro-coding-with-blocks');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Typing & Computer Basics', 'typing-computer-basics',
  'Typing & Computer Basics covers keyboard layout, mouse control, and safe habits for using a computer, giving young learners a confident starting point.',
  (SELECT id FROM course_categories WHERE slug = 'computer-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'beginner', '6-9', 'English',
  '["Identify keyboard and mouse parts", "Practice home-row typing", "Open and save a simple file", "Follow basic online safety rules"]',
  '["Access to any keyboard for practice"]',
  0, 1, 0, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'typing-computer-basics'), title, 'text', body, sort_order, is_preview
FROM (
  SELECT 'Meet the Keyboard' AS title, 'The keyboard''s home row — ASDF and JKL; — is where your fingers rest, letting you reach every other key without looking down.' AS body, 1 AS sort_order, 1 AS is_preview
  UNION ALL
  SELECT 'Staying Safe Online' AS title, 'Never share your full name, address or password with people you meet online, and always ask a trusted adult before downloading anything.' AS body, 2 AS sort_order, 0 AS is_preview
)
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'typing-computer-basics');

INSERT OR IGNORE INTO courses (
  title, slug, description, category_id, instructor_id, level, age_range, language,
  objectives, requirements, price, is_free, certificate_enabled, passing_score, published, created_by
)
SELECT
  'Web Design for Kids', 'web-design-for-kids',
  'Web Design for Kids introduces HTML and CSS basics so students can build and style their own simple web page, learning structure before decoration.',
  (SELECT id FROM course_categories WHERE slug = 'computer-studies'),
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1),
  'intermediate', '10-13', 'English',
  '["Understand what HTML and CSS do", "Structure a page with headings and paragraphs", "Style text and colours with CSS", "Publish a simple page"]',
  '["Comfortable typing", "Basic computer navigation"]',
  7000, 0, 1, 70, 1,
  (SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1)
WHERE EXISTS (SELECT 1 FROM users WHERE role = 'admin');
