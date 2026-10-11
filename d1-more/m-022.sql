INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 3 checkpoint quiz: The nervous system', 'Anatomy and Physiology', 'Check your understanding of the nervous system.', '[{"prompt": "Saltatory conduction occurs at:", "options": ["Dendrites", "Nodes of Ranvier", "Synaptic cleft", "The soma"], "correct_index": 1, "explanation": "The action potential jumps between nodes."}, {"prompt": "The absolute refractory period is due to:", "options": ["K⁺ channel opening", "Na⁺ channel inactivation", "Calcium entry", "Reuptake"], "correct_index": 1, "explanation": "Inactivated Na⁺ channels cannot reopen immediately."}, {"prompt": "Loss of dopamine neurons in the substantia nigra causes:", "options": ["Alzheimer''s disease", "Parkinson''s disease", "Myasthenia gravis", "Epilepsy"], "correct_index": 1, "explanation": "Parkinson''s disease."}, {"prompt": "Pain and temperature travel in the:", "options": ["Dorsal columns", "Spinothalamic tract", "Corticospinal tract", "Spinocerebellar tract"], "correct_index": 1, "explanation": "Spinothalamic tract."}, {"prompt": "The main parasympathetic nerve is the:", "options": ["Phrenic", "Vagus", "Sciatic", "Radial"], "correct_index": 1, "explanation": "Vagus (CN X)."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 3 checkpoint quiz: The nervous system');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Checkpoint quiz: The nervous system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 3 checkpoint quiz: The nervous system'), 300, 16, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 4: The endocrine system', 4);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 4: The endocrine system'), 'Hormones and how they signal', 'text', '## Chemical messengers
A **hormone** is released into blood and acts on distant target cells that have the right **receptor**.

### Three chemical classes
| Class | Examples | Receptor | Notes |
|---|---|---|---|
| Peptide / protein | insulin, GH, ADH, oxytocin | cell surface (second messengers: cAMP, IP₃) | water-soluble, travel free, fast |
| Steroid | cortisol, aldosterone, oestrogen, testosterone | inside the cell, change gene expression | lipid-soluble, carried on proteins, slower, longer |
| Amine | adrenaline, thyroid hormones (T3, T4) | adrenaline: surface; thyroid: nuclear | thyroid acts like a steroid |

### Control by feedback
Most hormones are controlled by **negative feedback**: the product switches off its own release.
{{cycle Low blood Ca²⁺ > Parathyroid releases PTH > Bone, kidney and gut raise Ca²⁺ > Blood Ca²⁺ rises > PTH release switches off}}

> Key idea: A hormone''s effect depends on its **receptor**. The same hormone can do different things in different tissues (adrenaline dilates muscle vessels but constricts skin vessels).

> Real life: **Cushing''s syndrome** is too much cortisol; **Addison''s disease** is too little. Both can be traced to which part of the feedback loop has failed.
> Try it: Why can steroid hormones act slowly but for a long time? || They alter gene transcription and are carried bound to proteins in blood.', 720, 17, 0);
