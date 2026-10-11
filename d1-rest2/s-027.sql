INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 5: Reinforcement learning and agents'), 'Robotics, vision and AI in the physical world', 'text', '## Sensing and acting
Robots and smart devices combine **perception** (cameras, lidar, microphones), **decision-making** (planning, learned policies) and **control** (motors, actuators).

| Field | AI role |
|---|---|
| Self-driving | detect lanes, vehicles, pedestrians; plan a safe path |
| Agriculture | drone images show crop stress and pests; precision spraying |
| Healthcare | image analysis, triage support, drug discovery |
| Manufacturing | quality inspection, predictive maintenance |
| Energy | forecast demand and optimise grids |

### Edge AI
Small models run directly on a phone or sensor ("on the edge"), which works without internet, protects privacy and responds fast. This matters where connectivity is limited.

> Real life: A phone app can identify a maize leaf disease offline from a photo, helping a farmer decide on treatment the same day.
> Try it: What is an advantage of edge AI? || It runs locally: works offline, keeps data private and responds quickly.', 720, 23, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 5 checkpoint quiz: Reinforcement learning and agents', 'Artificial Intelligence', 'Check your understanding of reinforcement learning and agents.', '[{"prompt": "In reinforcement learning, the agent is trained using:", "options": ["Labels", "Rewards", "Clusters", "Duplicates"], "correct_index": 1, "explanation": "Rewards from the environment."}, {"prompt": "Prompt injection means:", "options": ["Faster prompts", "Hidden instructions in outside content that try to steer the AI", "A GPU upgrade", "A data-cleaning step"], "correct_index": 1, "explanation": "Treat external content as data."}, {"prompt": "Edge AI runs:", "options": ["Only in distant data centres", "On the local device", "Only on satellites", "Without any model"], "correct_index": 1, "explanation": "On the device itself."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 5 checkpoint quiz: Reinforcement learning and agents');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 5: Reinforcement learning and agents'), 'Checkpoint quiz: Reinforcement learning and agents', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 5 checkpoint quiz: Reinforcement learning and agents'), 300, 24, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 6: AI, society and ethics', 6);
