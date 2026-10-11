INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'Adaptive immunity', 'text', '## Specific and with memory
{{flow Antigen engulfed by dendritic cell > Antigen shown on MHC to helper T cell > T cell activated > B cells make antibody; cytotoxic T cells kill infected cells > Memory cells remain}}

| Cell | Role |
|---|---|
| Helper T (CD4⁺) | coordinates the response with cytokines (the target of HIV) |
| Cytotoxic T (CD8⁺) | kills infected or cancerous cells (needs MHC I) |
| B cell / plasma cell | makes antibodies |
| Memory cells | rapid second response |

### Antibody classes
| Class | Notes |
|---|---|
| IgM | first response, large |
| IgG | main blood antibody; crosses the placenta |
| IgA | mucosal surfaces, breast milk |
| IgE | allergy, parasites (mast cells) |

### Vaccination
Exposes the immune system to an antigen without disease, creating **memory**, so a real infection meets a rapid IgG response.

> Real life: **Type I hypersensitivity** (anaphylaxis) is IgE-mediated mast cell degranulation; adrenaline is the emergency treatment. **Autoimmunity** is failure of self-tolerance (type 1 diabetes, rheumatoid arthritis).
> Try it: Which antibody crosses the placenta? || IgG.', 960, 42, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'Reproduction and the hormonal axis', 'text', '## The HPG axis
{{flow Hypothalamus releases GnRH > Anterior pituitary releases FSH and LH > Gonads make sex steroids and gametes > Oestrogen, progesterone, testosterone feed back}}

### Male
**Testes**: Sertoli cells (support sperm, inhibin; respond to FSH) and Leydig cells (**testosterone**, respond to LH). **Spermatogenesis** takes about 74 days in the seminiferous tubules.

### Female: the menstrual cycle (about 28 days)
{{timeline Day 1-5 Menstruation | Day 6-13 Follicular phase (FSH, rising oestrogen) | Day 14 LH surge and ovulation | Day 15-28 Luteal phase (progesterone) | Fall in hormones, menstruation}}

- **Follicular phase**: FSH grows a follicle; oestrogen thickens the endometrium.
- **Ovulation**: high oestrogen triggers a **positive feedback LH surge**.
- **Luteal phase**: the corpus luteum makes **progesterone** to prepare the endometrium.

### Pregnancy
The embryo''s trophoblast releases **hCG**, which keeps the corpus luteum making progesterone until the **placenta** takes over (about week 10). hCG is what pregnancy tests detect.

> Real life: Combined oral contraceptives use oestrogen and progestogen to suppress the FSH/LH surge and prevent ovulation.
> Try it: What triggers ovulation? || A surge of LH caused by a positive feedback effect of high oestrogen.', 1080, 43, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 9 checkpoint quiz: Defence and reproduction', 'Anatomy and Physiology', 'Check your understanding of defence and reproduction.', '[{"prompt": "Which cell is the main target of HIV?", "options": ["Cytotoxic T cell", "Helper T cell", "B cell", "Neutrophil"], "correct_index": 1, "explanation": "CD4⁺ helper T cells."}, {"prompt": "Which antibody is most abundant in blood and crosses the placenta?", "options": ["IgA", "IgE", "IgG", "IgM"], "correct_index": 2, "explanation": "IgG."}, {"prompt": "The LH surge is triggered by:", "options": ["Falling oestrogen", "High oestrogen", "High progesterone", "hCG"], "correct_index": 1, "explanation": "Positive feedback from high oestrogen."}, {"prompt": "Which hormone does a pregnancy test detect?", "options": ["FSH", "hCG", "Progesterone", "LH"], "correct_index": 1, "explanation": "Human chorionic gonadotrophin."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 9 checkpoint quiz: Defence and reproduction');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'Checkpoint quiz: Defence and reproduction', 'quiz', (SELECT id FROM quizzes WHERE title='Module 9 checkpoint quiz: Defence and reproduction'), 300, 44, 0);
