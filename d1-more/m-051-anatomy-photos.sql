-- Anatomy and Physiology (Medical Level): real labelled anatomy pictures.
--
-- Adds the new {{photo ...}} pictures to the lessons they belong in, and points
-- the old drawn organ diagrams at the pictures. Safe to run more than once.
--
--   wrangler d1 execute smart21brain-db --file=./d1-more/m-051-anatomy-photos.sql --remote
--
-- Needs these files deployed first: images/anatomy/*.jpg, js/anatomy-photos.js,
-- js/anatomy-viewer.js, css/anatomy-viewer.css, js/lesson-rich.js and lesson.html.

-- Module 2: skin, bone and muscle
UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo skin}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'The skin (integumentary system)' AND body NOT LIKE '%{{photo skin}}%';

UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo skeleton}}' || char(10) || '{{photo ribcage}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Bone: structure, growth and calcium' AND body NOT LIKE '%{{photo skeleton}}%' AND body NOT LIKE '%{{photo ribcage}}%';

UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo muscles}}' || char(10) || '{{photo torso}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Skeletal muscle and the sliding filament' AND body NOT LIKE '%{{photo muscles}}%' AND body NOT LIKE '%{{photo torso}}%';

-- Module 3: nervous system
UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo brain}}' || char(10) || '{{photo nervous}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'The central nervous system' AND body NOT LIKE '%{{photo brain}}%' AND body NOT LIKE '%{{photo nervous}}%';

UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo nerves}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Peripheral and autonomic nervous system, reflexes' AND body NOT LIKE '%{{photo nerves}}%';

UPDATE course_lessons
SET body = body || char(10) || char(10) || '### Special senses: the eye and the ear' || char(10) || 'The eye and the ear are sense organs. The **retina** turns light into nerve signals and the **cochlea** turns sound vibrations into nerve signals. The signals travel to the brain along cranial nerves: the **optic nerve** from the eye and the **cochlear (vestibulocochlear) nerve** from the ear.' || char(10) || '{{photo eye}}' || char(10) || '{{photo ear}}'
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Peripheral and autonomic nervous system, reflexes' AND body NOT LIKE '%{{photo eye}}%';

-- Module 4: endocrine system
UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo endocrine}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Hormones and how they signal' AND body NOT LIKE '%{{photo endocrine}}%';

-- Module 5: cardiovascular system (the drawn diagrams become pictures)
UPDATE course_lessons
SET body = replace(body, '{{anat heart}}', '{{photo heart}}')
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Heart anatomy and the path of blood';

UPDATE course_lessons
SET body = replace(body, '{{anat circulation}}', '{{photo capillaries}}')
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Blood vessels, blood pressure and circulation';

-- Module 6: respiratory system
UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo respiratory}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Airways and the mechanics of breathing' AND body NOT LIKE '%{{photo respiratory}}%';

UPDATE course_lessons
SET body = replace(body, '{{anat alveolus}}', '{{photo lungs}}')
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Gas exchange and ventilation-perfusion';

-- Module 7: renal system
UPDATE course_lessons
SET body = replace(body, '{{anat nephron}}', '{{photo urinary}}')
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'The kidney and the nephron';

-- Module 8: digestive system
UPDATE course_lessons
SET body = replace(body, '{{anat gi}}', '{{photo digestive}}')
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Organisation of the gut';

-- Module 9: defence and reproduction
UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo lymphatic}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'The lymphatic system and innate immunity' AND body NOT LIKE '%{{photo lymphatic}}%';

UPDATE course_lessons
SET body = substr(body, 1, instr(body, char(10))) || '{{photo female}}' || char(10) || '{{photo male}}' || char(10) || '' || substr(body, instr(body, char(10)) + 1)
WHERE course_id = (SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title = 'Reproduction and the hormonal axis' AND body NOT LIKE '%{{photo female}}%' AND body NOT LIKE '%{{photo male}}%';
