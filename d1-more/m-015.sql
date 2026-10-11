INSERT OR IGNORE INTO courses (title, slug, description, thumbnail_url, category_id, level, age_range, language, objectives, requirements, price, is_free, certificate_enabled, published)
VALUES ('Anatomy and Physiology (Medical Level)', 'anatomy-physiology-medical', 'A complete first-year medical-level course in human anatomy and physiology. Ten modules cover the body plan, the cell, skin, bone and muscle, the nervous and endocrine systems, the cardiovascular, respiratory, renal, digestive, immune and reproductive systems, with 15 labelled diagrams, clinical correlations, quizzes and a final exam.', 'images/anatomy-physiology-course.svg', (SELECT id FROM course_categories WHERE slug='medicine-health'), 'advanced', '16+', 'English', '["Describe the structure of every major organ system using correct anatomical terminology", "Explain the physiology behind nerve signals, muscle contraction, circulation, breathing and kidney function", "Read and interpret normal ECG, lung volume and acid-base data", "Link normal mechanisms to common diseases and drug actions", "Use diagrams and clinical cases to reason like a medical student"]', '["Secondary-school biology and chemistry", "Willingness to draw and explain diagrams from memory"]', 0, 1, 1, 1);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 1: Foundations of the human body', 1);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'The language of anatomy', 'text', '## Why a shared language matters
Medicine runs on precise words. "Above the heart" means nothing; **superior to the heart** means one thing to every clinician in the world.

### Levels of organisation
{{flow Chemicals > Cells > Tissues > Organs > Organ systems > Organism}}

### Anatomical position
The body stands upright, facing forward, feet together, arms at the sides with palms facing **forward**. Every directional term assumes this position, even if the patient is lying down.

### Directional terms
| Term | Meaning | Example |
|---|---|---|
| Superior / Inferior | toward the head / toward the feet | The heart is superior to the diaphragm |
| Anterior (ventral) / Posterior (dorsal) | front / back | The sternum is anterior to the heart |
| Medial / Lateral | toward / away from the midline | The ulna is medial to the radius |
| Proximal / Distal | nearer to / farther from the attachment (limbs) | The elbow is proximal to the wrist |
| Superficial / Deep | nearer to / farther from the surface | Skin is superficial to muscle |

### Planes of section
{{anat planes}}

- **Sagittal**: left and right parts (a *midsagittal* cut gives equal halves).
- **Coronal (frontal)**: anterior and posterior parts.
- **Transverse (axial)**: superior and inferior parts. CT scans are usually shown as transverse slices.

> Real life: A CT slice is viewed as if you are standing at the patient''s feet looking up. The patient''s **right is on the left of the image**.
> Try it: A cut that separates the body into front and back halves is in which plane? || The coronal (frontal) plane.', 720, 1, 1);
