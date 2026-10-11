INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 8: The digestive system'), 'Liver, pancreas, bile and metabolism', 'text', '## The liver
Receives **75% of its blood from the portal vein** (nutrient-rich) and 25% from the hepatic artery. Hepatocytes:
- store glycogen, release glucose, make glucose (gluconeogenesis)
- make **albumin and clotting factors**, **bile**, cholesterol
- detoxify drugs (cytochrome P450), convert ammonia to **urea**
- process **bilirubin**

### Bilirubin
{{flow Old red cells broken down in spleen > Haem becomes unconjugated bilirubin > Liver conjugates it > Bile into gut > Stercobilin (brown stools), urobilinogen (urine)}}

> Real life: **Jaundice** types: pre-hepatic (haemolysis: unconjugated), hepatic (hepatitis) and post-hepatic/obstructive (conjugated; pale stools, dark urine).

## Pancreas
Exocrine: enzymes (amylase, lipase, trypsinogen) and bicarbonate. Endocrine: islets (insulin, glucagon). **Trypsinogen** is activated only in the duodenum, so the pancreas does not digest itself (premature activation causes pancreatitis).

## Fed and fasted states
| State | Dominant hormone | Liver | Fat |
|---|---|---|---|
| Fed | insulin | glycogen and fat made | stored |
| Fasting | glucagon | glycogenolysis, then gluconeogenesis | lipolysis, ketones |

> Try it: Why are stools pale in obstructive jaundice? || Bile pigment (stercobilin) cannot reach the gut.', 1080, 39, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 8 checkpoint quiz: The digestive system', 'Anatomy and Physiology', 'Check your understanding of the digestive system.', '[{"prompt": "Vitamin B₁₂ is absorbed in the:", "options": ["Duodenum", "Jejunum", "Terminal ileum", "Colon"], "correct_index": 2, "explanation": "Terminal ileum with intrinsic factor."}, {"prompt": "Which hormone makes the gallbladder contract?", "options": ["Gastrin", "CCK", "Secretin", "Insulin"], "correct_index": 1, "explanation": "Cholecystokinin."}, {"prompt": "Dietary fat enters the body mainly via:", "options": ["Portal vein", "Lacteals", "Hepatic artery", "Bile duct"], "correct_index": 1, "explanation": "Chylomicrons enter lymphatic lacteals."}, {"prompt": "The portal vein supplies the liver with about:", "options": ["25% of its blood", "50%", "75%", "100%"], "correct_index": 2, "explanation": "About 75%."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 8 checkpoint quiz: The digestive system');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 8: The digestive system'), 'Checkpoint quiz: The digestive system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 8 checkpoint quiz: The digestive system'), 300, 40, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 9: Defence and reproduction', 9);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'The lymphatic system and innate immunity', 'text', '## Lymphatic system
Returns about **3 L of fluid a day** to the blood, absorbs fat (lacteals) and houses immune cells. Lymph passes through **lymph nodes**, which filter it. Primary organs: bone marrow and thymus. Secondary: nodes, spleen, MALT.

## Innate immunity (fast, non-specific)
{{stack Barriers: skin, mucus, stomach acid, lysozyme | Cells: neutrophils, macrophages, NK cells | Chemicals: complement, interferons, fever}}

### Inflammation
Tissue damage releases histamine and cytokines: **vasodilation** (redness, heat), **increased permeability** (swelling), **chemotaxis** of neutrophils, then macrophages clear debris. The cardinal signs: rubor, calor, tumor, dolor and loss of function.

> Real life: **Neutrophils** are the first responders in bacterial infection (a raised neutrophil count suggests it); **eosinophils** respond to parasites and allergy. **Complement** punches holes in bacteria and tags them for phagocytosis.
> Try it: Which cell is the most numerous white cell and first to arrive? || The neutrophil.', 840, 41, 0);
