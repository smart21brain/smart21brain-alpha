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
SELECT (SELECT id FROM courses WHERE slug = 'creative-writing-workshop'), 'Building a Character', 'text', 'A memorable character usually has a clear want, a flaw, and a habit or detail that makes them feel real to the reader.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'creative-writing-workshop');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'creative-writing-workshop'), 'Show, Don''t Tell', 'text', 'Instead of saying a character is sad, describing their slumped shoulders and quiet voice lets the reader feel it for themselves.', 2, 0
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
SELECT (SELECT id FROM courses WHERE slug = 'vocabulary-builders'), 'Prefixes Change Meaning', 'text', 'Adding ''un-'' or ''re-'' to the front of a word changes its meaning — ''happy'' becomes ''unhappy'', ''do'' becomes ''redo''.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'vocabulary-builders');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'vocabulary-builders'), 'Context Clues', 'text', 'Even without knowing a word, the sentences around it often hint at what it means — that hint is called a context clue.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'vocabulary-builders');
