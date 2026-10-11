INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'Tissues and homeostasis', 'text', '## The four tissue types
| Tissue | Job | Examples |
|---|---|---|
| Epithelial | covers surfaces, lines cavities, forms glands | skin, gut lining, alveoli |
| Connective | supports, connects, stores | bone, blood, cartilage, fat, tendons |
| Muscle | contracts | skeletal, cardiac, smooth |
| Nervous | communicates with electrical signals | neurons, glia |

> Key idea: Epithelia are named by **layers** (simple, stratified) and **shape** (squamous, cuboidal, columnar). Simple squamous suits gas exchange (alveoli); stratified squamous suits protection (skin, oesophagus).

## Homeostasis
**Homeostasis** is keeping the internal environment within narrow limits (temperature 37 °C, pH 7.4, glucose about 5 mmol/L).

### Negative feedback
The response **reverses** the change. This is how almost everything is regulated.
{{cycle Stimulus: body temperature rises > Sensor: skin and hypothalamus > Control centre: hypothalamus > Effector: sweating, vasodilation > Temperature falls}}

### Positive feedback
The response **amplifies** the change until an endpoint. Examples: **labour** (stretch of the cervix, oxytocin, stronger contractions), **blood clotting** and the **upstroke of the action potential**.

> Real life: **Fever** is not failure of homeostasis; the hypothalamic set point is raised by pyrogens. **Heat stroke** is failure of the negative feedback loop.
> Try it: Is oxytocin release during labour positive or negative feedback? || Positive feedback: contractions cause more oxytocin, which causes more contractions, until delivery.', 840, 4, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 1 checkpoint quiz: Foundations of the human body', 'Anatomy and Physiology', 'Check your understanding of foundations of the human body.', '[{"prompt": "Which plane divides the body into superior and inferior parts?", "options": ["Sagittal", "Coronal", "Transverse", "Oblique"], "correct_index": 2, "explanation": "The transverse (axial) plane is horizontal, giving superior and inferior parts."}, {"prompt": "The kidneys are best described as:", "options": ["Intraperitoneal", "Retroperitoneal", "Within the pleural cavity", "Within the mediastinum"], "correct_index": 1, "explanation": "They lie behind the peritoneum."}, {"prompt": "The Na⁺/K⁺ pump moves:", "options": ["2 Na⁺ out, 3 K⁺ in", "3 Na⁺ out, 2 K⁺ in", "3 Na⁺ in, 2 K⁺ out", "Na⁺ and K⁺ in the same direction"], "correct_index": 1, "explanation": "3 Na⁺ out and 2 K⁺ in per ATP."}, {"prompt": "Which of these is positive feedback?", "options": ["Baroreceptor reflex", "Shivering in the cold", "Oxytocin during labour", "Insulin lowering glucose"], "correct_index": 2, "explanation": "Oxytocin and contractions reinforce each other until delivery."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 1 checkpoint quiz: Foundations of the human body');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'Checkpoint quiz: Foundations of the human body', 'quiz', (SELECT id FROM quizzes WHERE title='Module 1 checkpoint quiz: Foundations of the human body'), 300, 5, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 2: Skin, bone and muscle', 2);
