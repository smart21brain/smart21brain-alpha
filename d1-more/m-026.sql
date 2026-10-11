INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Blood and haemostasis', 'text', '## Composition
| Component | Normal | Job |
|---|---|---|
| Plasma (55%) | water, proteins (albumin), electrolytes | transport, oncotic pressure |
| Red cells | 4.5-5.5 × 10¹²/L, live about 120 days | O₂ and CO₂ transport (haemoglobin) |
| White cells | 4-11 × 10⁹/L | defence |
| Platelets | 150-400 × 10⁹/L | clotting |
Haematocrit is about 40-50% (men) and 36-44% (women). All cells come from **haematopoietic stem cells** in red marrow; **erythropoietin** (kidney) drives red cell production when oxygen is low.

## Haemostasis in three steps
{{flow Vessel injury > Vasoconstriction > Platelet plug (adhesion via von Willebrand factor, aggregation) > Coagulation cascade makes fibrin mesh > Clot > Fibrinolysis by plasmin}}

### Coagulation
- **Extrinsic** pathway (tissue factor, factor VII) and **intrinsic** pathway (factor XII) both activate **factor X**.
- Common pathway: X → **thrombin** (IIa) → fibrinogen becomes **fibrin**.
- **Vitamin K** is needed for factors II, VII, IX, X.

| Drug | Mechanism | Monitor |
|---|---|---|
| Warfarin | blocks vitamin K recycling | INR |
| Heparin | boosts antithrombin | aPTT |
| Aspirin | blocks platelet thromboxane | none routinely |

> Real life: **Haemophilia A** is factor VIII deficiency (X-linked). Anaemia is low haemoglobin: iron deficiency gives small (microcytic) red cells.
> Try it: Which vitamin is needed to make clotting factors II, VII, IX and X? || Vitamin K.', 960, 25, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 5 checkpoint quiz: The cardiovascular system', 'Anatomy and Physiology', 'Check your understanding of the cardiovascular system.', '[{"prompt": "Which valve is between the right ventricle and pulmonary artery?", "options": ["Tricuspid", "Mitral", "Pulmonary", "Aortic"], "correct_index": 2, "explanation": "Pulmonary (semilunar) valve."}, {"prompt": "The normal delay of the impulse occurs in the:", "options": ["SA node", "AV node", "Purkinje fibres", "Bundle branches"], "correct_index": 1, "explanation": "AV node."}, {"prompt": "HR 75/min and SV 80 mL gives a cardiac output of:", "options": ["4 L/min", "5 L/min", "6 L/min", "7.5 L/min"], "correct_index": 2, "explanation": "75 × 80 = 6000 mL/min."}, {"prompt": "Which vessels are the main site of resistance?", "options": ["Aorta", "Arterioles", "Capillaries", "Veins"], "correct_index": 1, "explanation": "Arterioles."}, {"prompt": "Warfarin is monitored using:", "options": ["aPTT", "INR", "Platelet count", "D-dimer"], "correct_index": 1, "explanation": "INR (prothrombin time)."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 5 checkpoint quiz: The cardiovascular system');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Checkpoint quiz: The cardiovascular system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 5 checkpoint quiz: The cardiovascular system'), 300, 26, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 6: The respiratory system', 6);
