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
