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
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?w=900&q=75&auto=format&fit=crop'  WHERE slug = 'human-body-explorers'       AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1466692476868-aef1dfb1e735?w=900&q=75&auto=format&fit=crop' WHERE slug = 'plant-life-cycles'          AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1532634922-8fe0b757fb13?w=900&q=75&auto=format&fit=crop'  WHERE slug = 'fun-with-chemistry'         AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=900&q=75&auto=format&fit=crop' WHERE slug = 'intro-coding-with-blocks'   AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=900&q=75&auto=format&fit=crop' WHERE slug = 'typing-computer-basics'     AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=900&q=75&auto=format&fit=crop' WHERE slug = 'web-design-for-kids'        AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=900&q=75&auto=format&fit=crop' WHERE slug = 'english-reading-adventures' AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=900&q=75&auto=format&fit=crop' WHERE slug = 'swahili-for-beginners'      AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1455390582262-044cdead277a?w=900&q=75&auto=format&fit=crop' WHERE slug = 'creative-writing-workshop'  AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?w=900&q=75&auto=format&fit=crop' WHERE slug = 'vocabulary-builders'        AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?w=900&q=75&auto=format&fit=crop' WHERE slug = 'world-geography-explorers'  AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1447069387593-a5de0862481e?w=900&q=75&auto=format&fit=crop' WHERE slug = 'african-history-highlights' AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=900&q=75&auto=format&fit=crop' WHERE slug = 'citizenship-community'      AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=900&q=75&auto=format&fit=crop' WHERE slug = 'art-drawing-basics'         AND (thumbnail_url IS NULL OR thumbnail_url = '');
UPDATE courses SET thumbnail_url = 'https://images.unsplash.com/photo-1507838153414-b4b713384a76?w=900&q=75&auto=format&fit=crop' WHERE slug = 'music-theory-for-kids'      AND (thumbnail_url IS NULL OR thumbnail_url = '');

-- ---------------------------------------------------------------------
-- 4. Every course needs at least one lesson, otherwise enrolling lands
--    the learner on an empty curriculum. This adds a welcome lesson only
--    to courses that currently have none.
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO course_lessons (course_id, title, content_type, body, sort_order, is_preview)
SELECT c.id,
       'Welcome & How This Course Works',
       'text',
       'Welcome to ' || c.title || '. Work through the lessons in order and mark each one complete as you go — your progress bar updates automatically. You can come back at any time and pick up where you left off.',
       0,
       1
FROM courses c
WHERE NOT EXISTS (SELECT 1 FROM course_lessons l WHERE l.course_id = c.id);

-- ---------------------------------------------------------------------
-- 5. ATTACHING YOUR OWN FILES FROM R2 (the smart21brain-materials bucket)
--
-- Files you upload through the admin panel land in R2 and get a row in
-- the `materials` table. A lesson serves one of those files by pointing
-- at it with material_id — the learner then downloads it through
-- /api/materials/<id>, which streams it straight out of your bucket.
--
-- To turn an uploaded PDF into a lesson, fill in the three values and
-- run the statement:
--
--   INSERT INTO course_lessons
--     (course_id, title, content_type, material_id, sort_order, is_preview)
--   SELECT
--     (SELECT id FROM courses   WHERE slug  = 'fractions-made-fun'),
--     'Fractions Workbook (PDF)',
--     'pdf',
--     (SELECT id FROM materials WHERE title = 'Fractions Workbook'),
--     10,
--     0;
--
-- Same idea for a video lesson, using the videos table:
--
--   INSERT INTO course_lessons
--     (course_id, title, content_type, video_id, sort_order, is_preview)
--   SELECT
--     (SELECT id FROM courses WHERE slug  = 'fractions-made-fun'),
--     'Fractions Explained (Video)',
--     'video',
--     (SELECT id FROM videos  WHERE title = 'Fractions Explained'),
--     11,
--     0;
--
-- And for a quiz lesson, using a quiz you built in the admin panel:
--
--   INSERT INTO course_lessons
--     (course_id, title, content_type, quiz_id, sort_order, is_preview)
--   SELECT
--     (SELECT id FROM courses WHERE slug  = 'fractions-made-fun'),
--     'End-of-Course Quiz',
--     'quiz',
--     (SELECT id FROM quizzes WHERE title = 'Fractions Quiz'),
--     12,
--     0;
--
-- To use an R2 image as a course cover instead of an Unsplash URL,
-- upload it as a material and point the course at it:
--
--   UPDATE courses
--      SET thumbnail_url = '/api/materials/' ||
--          (SELECT id FROM materials WHERE title = 'Fractions Cover')
--    WHERE slug = 'fractions-made-fun';
-- ---------------------------------------------------------------------

-- ---------------------------------------------------------------------
-- 6. Check what you ended up with.
-- ---------------------------------------------------------------------
SELECT c.id,
       c.slug,
       c.title,
       c.published,
       c.is_free,
       c.price,
       (SELECT COUNT(*) FROM course_lessons l WHERE l.course_id = c.id) AS lessons
FROM courses c
ORDER BY c.id;
