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
SELECT (SELECT id FROM courses WHERE slug = 'typing-computer-basics'), 'Meet the Keyboard', 'text', 'The keyboard''s home row — ASDF and JKL; — is where your fingers rest, letting you reach every other key without looking down.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'typing-computer-basics');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'typing-computer-basics'), 'Staying Safe Online', 'text', 'Never share your full name, address or password with people you meet online, and always ask a trusted adult before downloading anything.', 2, 0
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

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'web-design-for-kids'), 'HTML Builds the Page', 'text', 'HTML uses tags like headings and paragraphs to give a web page its structure, the same way a skeleton gives your body its shape.', 1, 1
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'web-design-for-kids');

INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT (SELECT id FROM courses WHERE slug = 'web-design-for-kids'), 'CSS Adds the Style', 'text', 'CSS controls how a page looks — colours, fonts and spacing — separately from the HTML that controls what the page contains.', 2, 0
WHERE EXISTS (SELECT 1 FROM courses WHERE slug = 'web-design-for-kids');
