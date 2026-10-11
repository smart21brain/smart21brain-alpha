INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 1: Foundations of AI'), 'Data: the fuel of AI', 'text', '## What a dataset looks like
Each row is an **example**; each column is a **feature** (an input measurement); the **label** is the answer to predict.
| Size (m²) | Bedrooms | Distance to town (km) | Price (label) |
|---|---|---|---|
| 60 | 2 | 3 | 85 000 |
| 95 | 3 | 5 | 130 000 |
| 40 | 1 | 1 | 70 000 |

### Quality beats quantity
Garbage in, garbage out: wrong labels, missing values, duplicates and unrepresentative samples all damage a model. Typical cleaning: remove duplicates, handle missing values, scale numbers to similar ranges, convert categories to numbers.

### Splitting the data
{{ai split}}

### Common data problems
- **Sampling bias**: the data does not represent the people the model will serve.
- **Label noise**: some answers are wrong.
- **Data leakage**: information from the answer sneaks into the inputs, so the model looks brilliant in testing but fails in real life.
- **Imbalance**: 99% of examples in one class (fraud is rare).

> Real life: A crop-disease app trained only on photos from one region may fail on leaves, soil and lighting from another country.
> Try it: Why must the test set stay hidden during training? || So the final score measures performance on truly unseen data, not memorisation.', 960, 3, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 1 checkpoint quiz: Foundations of AI', 'Artificial Intelligence', 'Check your understanding of foundations of ai.', '[{"prompt": "Which describes narrow AI?", "options": ["Human-level skill at everything", "Very good at one specific task", "Always conscious", "Needs no data"], "correct_index": 1, "explanation": "All current AI is narrow."}, {"prompt": "Machine learning differs from rule-based programming because it:", "options": ["Needs no computer", "Learns rules from examples", "Never makes mistakes", "Only works on images"], "correct_index": 1, "explanation": "It infers patterns from data."}, {"prompt": "Which type uses rewards from trial and error?", "options": ["Supervised", "Unsupervised", "Reinforcement", "Rule-based"], "correct_index": 2, "explanation": "Reinforcement learning."}, {"prompt": "In a dataset, the label is:", "options": ["An input column", "The answer to predict", "A duplicate row", "The file name"], "correct_index": 1, "explanation": "The target value the model predicts."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 1 checkpoint quiz: Foundations of AI');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 1: Foundations of AI'), 'Checkpoint quiz: Foundations of AI', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 1 checkpoint quiz: Foundations of AI'), 300, 4, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 2: Classical machine learning', 2);
