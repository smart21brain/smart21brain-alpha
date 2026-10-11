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
