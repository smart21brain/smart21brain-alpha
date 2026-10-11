INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Electronics for Beginners final quiz', 'text', '## Final quiz
Answer every question, then mark the lesson complete.

## Quiz questions
1. Which is the correct form of Ohm''s law? Answer: V = I x R. Voltage equals current times resistance.
2. A resistor marked Red, Red, Brown is... Answer: 220 ohms. 2, 2, then one zero = 220 ohms.
3. In a parallel circuit, each branch has... Answer: The same voltage. Parallel branches share the same voltage.
4. What does an electrolytic capacitor have that a ceramic one usually does not? Answer: Polarity. Electrolytic capacitors have + and - legs.
5. A 9 V battery, 2 V LED and 20 mA need about what resistor? Answer: 350 ohms. (9 - 2) / 0.02 = 350 ohms.
6. Which part acts as a small electronic switch or amplifier? Answer: Transistor. Transistors switch and amplify.
7. Which gate gives 1 only when both inputs are 1? Answer: AND. AND needs both inputs high.
8. How should a multimeter measure voltage? Answer: In parallel across the part. Voltage is measured across the part.
9. The safest power source for beginner practice is... Answer: A battery of 9 V or less. Keep to low-voltage batteries.', 0, 24, 0);

-- =======================================================================
-- Smart21Brain — COURSE SEED / REPAIR
--
-- Run this against your D1 database to make the real courses appear on
-- courses.html and make "Enroll free" work end to end.
--
--   npx wrangler d1 execute smart21brain-db --remote --file=./course-seed.sql
--
-- Safe to run more than once: it only inserts what's missing and updates
-- cover images. It never deletes a course, a lesson, an enrollment, or a
-- learner's progress.
--
-- The 20 courses and their lessons are defined in schema.sql. If you have
-- never applied schema.sql to the remote database, apply that first:
--
--   npx wrangler d1 execute smart21brain-db --remote --file=./schema.sql
-- =======================================================================

-- ---------------------------------------------------------------------
-- 1. Categories the catalog filters depend on.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES
('Mathematics',      'mathematics',      'fa-solid fa-calculator'),
('Science',          'science',          'fa-solid fa-flask'),
('Computer Studies', 'computer-studies', 'fa-solid fa-laptop-code'),
('Languages',        'languages',        'fa-solid fa-language'),
('Social Studies',   'social-studies',   'fa-solid fa-earth-africa'),
('Creative',         'creative',         'fa-solid fa-palette');

-- ---------------------------------------------------------------------
-- 2. Make sure every seeded course is published and visible.
--    listCourses() filters on published = 1, so an unpublished course
--    silently disappears from the catalog.
-- ---------------------------------------------------------------------
UPDATE courses SET published = 1 WHERE published IS NULL OR published = 0;

-- ---------------------------------------------------------------------
-- 3. Attach a cover image to each course. Without this, every card on
--    courses.html falls back to the same generic placeholder photo.
--    Swap any URL below for your own R2 image if you prefer — see
--    section 5 for how to serve images from your own bucket.
-- ---------------------------------------------------------------------
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1635070041078-e363dbe005cb?w=900&q=75&auto=format&fit=crop' WHERE slug = 'fractions-made-fun'         AND (thumbnail_url IS NULL OR thumbnail_url = '');

UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1596495578065-6e0763fa1178?w=900&q=75&auto=format&fit=crop' WHERE slug = 'multiplication-mastery'     AND (thumbnail_url IS NULL OR thumbnail_url = '');

UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1509228468518-180dd4864904?w=900&q=75&auto=format&fit=crop' WHERE slug = 'geometry-explorers'         AND (thumbnail_url IS NULL OR thumbnail_url = '');

UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1634128221889-82ed6efebfc3?w=900&q=75&auto=format&fit=crop' WHERE slug = 'algebra-foundations'        AND (thumbnail_url IS NULL OR thumbnail_url = '');

UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1711560217836-f42ac4a11a4f?w=900&q=75&auto=format&fit=crop' WHERE slug = 'solar-system-adventure'     AND (thumbnail_url IS NULL OR thumbnail_url = '');
