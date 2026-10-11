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
