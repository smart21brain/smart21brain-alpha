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
