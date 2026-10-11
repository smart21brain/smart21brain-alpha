INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'Responsible AI, regulation and the future', 'text', '## Principles most frameworks share
| Principle | Meaning |
|---|---|
| Fairness | do not discriminate unjustly |
| Transparency | explain what the system does and its limits |
| Accountability | a human or organisation is responsible |
| Safety and robustness | works reliably, resists misuse |
| Privacy | protect personal data |
| Human oversight | people can review and override |

### Regulation
Many governments are adopting **risk-based rules**: the higher the potential harm (health, hiring, policing, credit), the stricter the requirements. The EU''s AI Act is a prominent example, and many countries are drafting national AI strategies and data-protection laws.

### Environmental cost
Training and running large models uses significant electricity and water for data centres. More efficient models, smaller specialised models and renewable power reduce the footprint.

### Using AI honestly in school and work
{{flow Ask clearly > Check the answer > Verify with trusted sources > Use it honestly and say when AI helped}}

> Real life: If your teacher or employer sets rules on AI use, follow them and be transparent about how you used it.
> Try it: Name two reasons for human oversight of AI decisions. || To catch errors and bias, and to keep a person accountable and able to override the system.', 960, 27, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 6 checkpoint quiz: AI, society and ethics', 'Artificial Intelligence', 'Check your understanding of ai, society and ethics.', '[{"prompt": "A model with high overall accuracy may still be unfair if:", "options": ["It is large", "It performs much worse for a particular group", "It uses GPUs", "It is open source"], "correct_index": 1, "explanation": "Check results by group."}, {"prompt": "Risk-based AI regulation means:", "options": ["The same rules for everything", "Stricter rules for higher-harm uses", "No rules", "Only voluntary rules"], "correct_index": 1, "explanation": "Higher potential harm, stricter requirements."}, {"prompt": "Which is good practice with AI-generated facts?", "options": ["Trust them fully", "Verify with trusted sources", "Hide that you used AI", "Share them quickly"], "correct_index": 1, "explanation": "Always verify important facts."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 6 checkpoint quiz: AI, society and ethics');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'Checkpoint quiz: AI, society and ethics', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 6 checkpoint quiz: AI, society and ethics'), 300, 28, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 7: Building with AI', 7);
