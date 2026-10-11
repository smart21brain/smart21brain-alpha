-- Artificial Intelligence and Machine Learning in Depth: course, modules, lessons, quizzes and final exam.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-ai-ml-seed.sql
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES ('Computer Studies','computer-studies','fa-solid fa-laptop-code');

INSERT OR IGNORE INTO courses (title, slug, description, thumbnail_url, category_id, level, age_range, language, objectives, requirements, price, is_free, certificate_enabled, published)
VALUES ('Artificial Intelligence and Machine Learning in Depth', 'artificial-intelligence-machine-learning', 'A deeper, hands-on follow-on to Introduction to AI. Seven modules cover data, classical machine learning, neural networks, language models and generative AI, agents and reinforcement learning, ethics and regulation, and building your own project, with 10 new diagrams, a Python example, quizzes and a final exam.', 'images/ai-ml-course.svg', (SELECT id FROM course_categories WHERE slug='computer-studies'), 'advanced', '14+', 'English', '["Explain how machine learning models learn from data and how to evaluate them honestly", "Describe neural networks, CNNs, transformers and large language models", "Recognise overfitting, bias and hallucination and know how to reduce them", "Use a simple Python workflow to train and test a model", "Discuss AI ethics, privacy, regulation and responsible use"]', '["Basic computer skills", "Comfort with simple maths such as averages and percentages"]', 0, 1, 1, 1);

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

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 2: Classical machine learning'), 'Regression and gradient descent', 'text', '## Predicting a number
**Linear regression** fits a straight line: **ŷ = w·x + b**. The model must find the best weight **w** and bias **b**.

### Measuring error with a loss function
**Mean squared error (MSE)** averages the squared gaps between predictions and truth. Smaller is better. Training means **minimising the loss**.

### Gradient descent
Imagine standing on a hill in fog and walking downhill by feeling the slope.
{{ai gradient}}

1. Start with random weights.
2. Compute the loss and the **gradient** (slope) for each weight.
3. Move each weight a small step **downhill**.
4. Repeat until the loss stops falling.

| Setting | Effect |
|---|---|
| Learning rate too high | overshoots, loss jumps around |
| Learning rate too low | very slow training |
| Just right | steady fall to a minimum |

> Key idea: Nearly all modern AI, from a tiny regression to a giant language model, is trained by **gradient descent** variants.
> Try it: In gradient descent, which way does a weight move? || In the direction that reduces the loss, opposite to the gradient.', 1080, 5, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 2: Classical machine learning'), 'Classification', 'text', '## Predicting a category
**Classification** assigns an input to a class: spam or not, tumour benign or malignant, digit 0-9.

{{ai classify}}

### Common algorithms
| Algorithm | Idea | Good for |
|---|---|---|
| **Logistic regression** | squashes a weighted sum into a probability between 0 and 1 | simple, interpretable baseline |
| **k-nearest neighbours** | look at the k closest training examples and vote | small datasets, no training step |
| **Decision tree** | a flowchart of yes/no questions | easy to explain |
| **Random forest** | many trees voting together | strong general performance |
| **Support vector machine** | finds the widest-margin boundary | medium-sized data |

### Probabilities, not certainties
Most classifiers output a probability (for example 0.87 spam). A **threshold** (often 0.5) converts it to a decision. Changing the threshold trades one kind of error for another.

> Real life: A cancer screening model may use a **low threshold** so it misses fewer cases (accepting more false alarms), because a missed cancer is worse than an extra check.
> Try it: What does a decision tree model look like? || A flowchart of yes/no questions on the features, ending in a predicted class.', 960, 6, 0);
