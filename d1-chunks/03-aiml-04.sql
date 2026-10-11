INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 4: Language models and generative AI'), 'Checkpoint quiz: Language models and generative AI', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 4 checkpoint quiz: Language models and generative AI'), 300, 20, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 5: Reinforcement learning and agents', 5);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 5: Reinforcement learning and agents'), 'Reinforcement learning', 'text', '## Learning by trial and error
An **agent** takes **actions** in an **environment**, receives a **reward**, and learns a **policy** (a strategy) that maximises total reward over time.

{{ai rl}}

### Key ideas
| Term | Meaning |
|---|---|
| State | the current situation |
| Action | what the agent can do |
| Reward | feedback signal (+ good, - bad) |
| Policy | rule mapping states to actions |
| Exploration vs exploitation | try new things vs use what already works |

### Where it is used
Game-playing (Go, chess), robot control, recommendation tuning, data-centre cooling, and aligning language models with human preferences (RLHF).

> Careful: Agents find loopholes. A cleaning robot rewarded for "no visible mess" might hide mess instead of removing it. Designing the reward carefully is hard.
> Try it: What is the exploration-exploitation trade-off? || Balancing trying new actions to learn more against using the best-known action to earn reward.', 840, 21, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 5: Reinforcement learning and agents'), 'AI agents and tools', 'text', '## From answering to acting
An **AI agent** uses a model to pursue a goal by planning steps and using **tools** (search, code, calendars, databases).
{{flow Goal > Plan the next step > Call a tool > Read the result > Decide: done or repeat}}

### Where agents help
- researching and summarising sources
- writing and testing code
- processing forms and routine office work

### Where they need care
| Risk | Safeguard |
|---|---|
| Wrong actions with real effects | limit permissions; require human approval for irreversible steps |
| Errors compounding over many steps | log actions; check intermediate results |
| Prompt injection (hidden instructions in a web page or file) | treat outside content as data, not commands |

> Key idea: The more an AI can **do**, the more important it is to control **what it is allowed to do** and to keep a human in the loop for important decisions.
> Try it: Why should agents ask approval before irreversible actions? || Mistakes can''t be undone, and errors may compound across steps.', 840, 22, 0);

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

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'AI in everyday life and work', 'text', '## Already around you
| Area | Examples |
|---|---|
| Phone | face unlock, predictive text, voice assistants, camera enhancement |
| Health | scan reading, symptom checkers, drug discovery |
| Education | adaptive practice, tutoring, translation |
| Finance | fraud detection, credit scoring, mobile-money security |
| Farming | crop monitoring, weather and market forecasts |
| Government | document processing, planning, language services |

### Work will change
AI tends to **automate tasks** more than whole jobs. Roles shift: routine tasks reduce, while skills like judgement, communication, creativity, domain knowledge and AI literacy grow in value.

> Key idea: People who **understand AI and can supervise it** are better placed than people who either ignore it or trust it blindly.
> Try it: Does AI usually replace whole jobs or tasks within jobs? || Mostly tasks within jobs, which changes how jobs are done.', 720, 25, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'Bias, fairness and privacy', 'text', '## Where bias comes from
AI learns from human data, so it can copy and amplify human bias.
{{flow Biased or unrepresentative data > Model learns the pattern > Unequal errors or decisions > Real harm to some groups}}

| Source | Example |
|---|---|
| Historical bias | a hiring model trained on past hires favours the group hired before (a reported case led one company to drop its recruiting tool) |
| Representation bias | face systems tested mainly on lighter skin perform worse on darker skin (shown in published audits) |
| Measurement bias | using arrests as a proxy for crime reflects policing patterns |

### Reducing bias
Audit performance **by group**, collect representative data, involve affected communities, document limits, keep humans able to appeal decisions.

### Privacy and security
- Models can memorise and leak training data.
- **Adversarial examples**: tiny changes make a model misclassify.
- **Data protection**: collect only what is needed, get consent, secure it, follow local law.

> Careful: A model that is 95% accurate overall can still be much worse for a small group. Always check results **for each group**.
> Try it: Why can a model be unfair even if nobody intended it? || Because it learns patterns from data that already contain historical or sampling bias.', 960, 26, 0);

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
