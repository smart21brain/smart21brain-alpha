INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 1: Foundations of AI', 1);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 1: Foundations of AI'), 'What is AI? A short history', 'text', '## Machines that perform "intelligent" tasks
**Artificial intelligence (AI)** is the field of building computer systems that perform tasks that normally need human intelligence: recognising speech, translating, planning, spotting patterns, making decisions.

### A short timeline
{{timeline 1950: Turing proposes the imitation game | 1956: "AI" named at the Dartmouth workshop | 1997: Deep Blue beats the chess champion | 2012: deep networks win ImageNet | 2016: AlphaGo beats a Go champion | 2017: the transformer is introduced | 2022: chatbots reach the public}}

### Narrow AI vs general AI
| Type | Meaning | Today |
|---|---|---|
| Narrow AI | very good at one task (translate, detect fraud, play Go) | everything that exists |
| General AI (AGI) | human-level skill across many tasks | not achieved; debated |

> Key idea: Every AI system you can use today is **narrow**, even when a chatbot feels broad. It is strong where its training data and design cover the task, and unreliable elsewhere.
> Real life: Spam filters, navigation apps, face unlock and voice assistants are all narrow AI.
> Try it: Is a chess engine narrow AI or general AI? || Narrow AI: superhuman at chess but useless at anything else.', 840, 1, 1);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 1: Foundations of AI'), 'AI, machine learning and deep learning', 'text', '## Nested ideas
{{stack Artificial intelligence: any technique that makes machines act intelligently | Machine learning: systems that learn patterns from data | Deep learning: machine learning with many-layered neural networks | Generative AI: models that create text, images, audio or code}}

### Rules vs learning
Old-style AI used **hand-written rules** ("if the email contains X, mark spam"). **Machine learning** instead gives the computer examples and lets it find the rules itself.
{{flow Data + answers > Learning algorithm > Model (the learned rules) > New data in, prediction out}}

### Three ways machines learn
| Type | Data given | Goal | Example |
|---|---|---|---|
| **Supervised** | inputs with correct labels | predict the label | spam or not spam, house price |
| **Unsupervised** | inputs only | find structure | customer groups |
| **Reinforcement** | rewards from trial and error | maximise reward | game-playing, robot control |

> Real life: **Self-supervised** learning (the basis of language models) creates its own labels from the data, such as predicting the next word.
> Try it: Predicting house prices from past sales is which type of learning? || Supervised learning (regression), because the sale prices are known labels.', 840, 2, 0);
