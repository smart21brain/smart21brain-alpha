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
SELECT (SELECT id FROM courses WHERE slug = 'english-reading-adventures'), 'Sounding Out Words', 'text', 'Breaking a word into its individual sounds, then blending them back together, is one of the fastest ways to read a new word.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'english-reading-adventures');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'english-reading-adventures'), 'Reading for Meaning', 'text', 'Good readers pause to ask what just happened in a story and what might happen next — that''s called comprehension.', 2, 0
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
SELECT (SELECT id FROM courses WHERE slug = 'swahili-for-beginners'), 'Greetings: Jambo and Habari', 'text', '''Jambo'' and ''Habari'' are common friendly greetings in Swahili, used throughout the day when meeting someone.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'swahili-for-beginners');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'swahili-for-beginners'), 'Counting in Swahili', 'text', 'Numbers one through ten in Swahili — moja, mbili, tatu and onward — are the foundation for talking about age, time and money.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'swahili-for-beginners');
