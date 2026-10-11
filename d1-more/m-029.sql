INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 6: The respiratory system'), 'Checkpoint quiz: The respiratory system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 6 checkpoint quiz: The respiratory system'), 300, 31, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 7: The renal system', 7);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'The kidney and the nephron', 'text', '## Anatomy
Two kidneys sit **retroperitoneally** at T12-L3. They receive about **20-25% of cardiac output** (about 1.2 L/min). Urine flows: **renal pelvis, ureter, bladder, urethra**.

Each kidney has about **1 million nephrons**, the functional units: **renal corpuscle** (glomerulus and Bowman''s capsule) and **tubule**.

{{anat nephron}}

### Functions
Regulate water and electrolytes, excrete waste (urea, creatinine, drugs), control acid-base balance, make **erythropoietin**, activate **vitamin D**, release **renin**.

### The filtration barrier
Fenestrated capillary endothelium, **basement membrane** (negatively charged) and **podocytes** (filtration slits). It blocks cells and most proteins, so urine normally has almost no protein.

> Real life: **Glomerulonephritis** damages the barrier. Large protein loss (**nephrotic syndrome**: oedema, low albumin) or blood in urine (**nephritic syndrome**) are two classic patterns.
> Try it: Which cells form the final layer of the filtration barrier? || Podocytes (foot processes with filtration slits).', 960, 32, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'Glomerular filtration and GFR', 'text', '## Filtration
Blood pressure in the glomerulus pushes fluid into Bowman''s space.

### Starling forces (mmHg, approximate)
| Force | Value | Direction |
|---|---|---|
| Glomerular capillary hydrostatic pressure | 55 | out (favours filtration) |
| Bowman''s space hydrostatic pressure | 15 | in (opposes) |
| Glomerular oncotic pressure | 30 | in (opposes) |
| **Net filtration pressure** | **about 10** | out |

**GFR** is about **125 mL/min** (180 L/day). More than 99% is reabsorbed, so urine is about 1-2 L/day.

### Autoregulation
Within a wide pressure range (about 80-180 mmHg) the kidney keeps GFR steady by the **myogenic response** and **tubuloglomerular feedback** (macula densa sensing NaCl delivery).

### Clearance
{{stack Clearance = (Urine conc × urine flow) / Plasma conc | Inulin clearance = GFR | Creatinine clearance ≈ GFR}}

Substances freely filtered and neither reabsorbed nor secreted (inulin) measure GFR. Creatinine is used clinically; **eGFR** is estimated from serum creatinine, age and sex.

> Real life: **Chronic kidney disease** staging uses eGFR. In **dehydration** or NSAID use, afferent arteriole constriction lowers GFR (acute kidney injury).
> Try it: If GFR is 125 mL/min, how much filtrate forms per day? || 125 × 1440 = 180 000 mL = 180 L.', 960, 33, 0);
