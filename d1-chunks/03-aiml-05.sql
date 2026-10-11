INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 6 checkpoint quiz: AI, society and ethics', 'Artificial Intelligence', 'Check your understanding of ai, society and ethics.', '[{"prompt": "A model with high overall accuracy may still be unfair if:", "options": ["It is large", "It performs much worse for a particular group", "It uses GPUs", "It is open source"], "correct_index": 1, "explanation": "Check results by group."}, {"prompt": "Risk-based AI regulation means:", "options": ["The same rules for everything", "Stricter rules for higher-harm uses", "No rules", "Only voluntary rules"], "correct_index": 1, "explanation": "Higher potential harm, stricter requirements."}, {"prompt": "Which is good practice with AI-generated facts?", "options": ["Trust them fully", "Verify with trusted sources", "Hide that you used AI", "Share them quickly"], "correct_index": 1, "explanation": "Always verify important facts."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 6 checkpoint quiz: AI, society and ethics');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'Checkpoint quiz: AI, society and ethics', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 6 checkpoint quiz: AI, society and ethics'), 300, 28, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 7: Building with AI', 7);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 7: Building with AI'), 'A first machine learning project in Python', 'text', '## The standard workflow
{{flow Define the problem > Collect and clean data > Split train and test > Train a model > Evaluate on the test set > Improve and deploy}}

### Example: classify iris flowers with scikit-learn
```
from sklearn.datasets import load_iris
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y)

model = RandomForestClassifier(n_estimators=100, random_state=42)
model.fit(X_train, y_train)

pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, pred))
print(classification_report(y_test, pred))
```

### What each part does
| Line | Purpose |
|---|---|
| `train_test_split` | keeps a hidden test set |
| `fit` | learns from the training data |
| `predict` | makes predictions on unseen data |
| `accuracy_score` | measures the result |

> Tip: Always start with a **simple baseline** (for example always predicting the most common class). A complex model must beat it to be worth using.
> Try it: Why use random_state? || It makes the random split repeatable so results can be reproduced.', 1200, 29, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 7: Building with AI'), 'Prompting and working with AI assistants', 'text', '## Better prompts, better answers
A good prompt gives **role, task, context, format and constraints**.

| Weak prompt | Strong prompt |
|---|---|
| "Explain photosynthesis" | "Explain photosynthesis to a 14-year-old in 150 words, with one everyday analogy and three bullet-point key terms" |
| "Fix my code" | "This Python function should return the average but crashes on an empty list. Here is the code and the error. Suggest a fix and explain why" |

### Useful patterns
- **Give examples** of the output you want (few-shot prompting).
- **Ask for steps** when reasoning matters.
- **Provide the source text** you want it to use, to reduce guessing.
- **Iterate**: refine the prompt based on the result.
- **Ask it to check itself**, then verify independently.

> Key idea: Treat AI as a **fast, fallible assistant**. You stay responsible for checking facts, calculations and anything that matters.
> Try it: Rewrite "write about climate change" into a stronger prompt. || For example: "Write a 200-word explanation of how greenhouse gases cause climate change for Form 2 students, with two local examples and a short summary line.', 840, 30, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 7: Building with AI'), 'Capstone: plan your own AI project', 'text', '## Choose a problem worth solving
Good beginner projects are small, have available data and a clear success measure.

| Idea | Type | Data |
|---|---|---|
| Predict exam scores from study hours | regression | survey table |
| Classify plant leaf health | image classification | phone photos |
| Group customers or products | clustering | shop records |
| Sentiment of student feedback | text classification | short comments |

### Project checklist
{{flow Problem statement > Data source and consent > Baseline > Model > Evaluation (include per-group checks) > Limits and ethics > Present results}}

1. **State the goal** in one sentence and how success is measured.
2. **Collect or find data**, with permission, and record where it came from.
3. **Clean and split** it; keep a test set untouched.
4. **Build a baseline**, then try one or two models.
5. **Evaluate** with suitable metrics and look at mistakes.
6. **Document limits**: who could the model fail, and what harm could result?
7. **Explain** your findings to someone who is not an expert.

> Real life: A school club can build a simple leaf-disease classifier with a free notebook platform and a few hundred labelled photos, then report where it fails.
> Try it: Why include a baseline in every project? || It shows whether the model adds real value over a trivial approach.', 1200, 31, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Artificial Intelligence and Machine Learning in Depth final exam', 'Artificial Intelligence', 'Twenty questions across the whole course. You need 70% to complete it.', '[{"prompt": "Which statement about today''s AI is true?", "options": ["It is general intelligence", "It is narrow: strong at specific tasks", "It understands like a human", "It needs no data"], "correct_index": 1, "explanation": "All current AI is narrow."}, {"prompt": "Supervised learning requires:", "options": ["Labelled examples", "Only rewards", "No data", "A robot"], "correct_index": 0, "explanation": "Inputs paired with correct answers."}, {"prompt": "Which splits data for honest evaluation?", "options": ["Train / validation / test", "Only train", "Only test", "Random deletion"], "correct_index": 0, "explanation": "Hold-out data measures real performance."}, {"prompt": "Gradient descent adjusts weights to:", "options": ["Raise loss", "Lower loss", "Add features", "Delete rows"], "correct_index": 1, "explanation": "Steps downhill on the loss."}, {"prompt": "A model is great on training data but poor on new data. This is:", "options": ["Underfitting", "Overfitting", "Clustering", "Normalisation"], "correct_index": 1, "explanation": "It memorised noise."}, {"prompt": "Which algorithm groups data without labels?", "options": ["k-means", "Logistic regression", "Random forest (classifier)", "Linear regression"], "correct_index": 0, "explanation": "K-means clusters unlabelled data."}, {"prompt": "TP 45, FP 5, FN 15. Recall is:", "options": ["75%", "80%", "90%", "95%"], "correct_index": 0, "explanation": "45 / (45 + 15) = 75%."}, {"prompt": "For a very rare disease, accuracy can mislead because:", "options": ["It is slow", "A model that always says no is still highly accurate", "It uses labels", "It needs GPUs"], "correct_index": 1, "explanation": "Class imbalance hides failures."}, {"prompt": "The role of an activation function is to:", "options": ["Store data", "Add non-linearity", "Delete weights", "Split data"], "correct_index": 1, "explanation": "Lets networks learn curved patterns."}, {"prompt": "Backpropagation computes:", "options": ["Gradients of the loss for each weight", "New data", "Embeddings", "The test set"], "correct_index": 0, "explanation": "Via the chain rule."}, {"prompt": "CNNs are especially effective for:", "options": ["Image data", "Passwords", "Sorting", "Email headers only"], "correct_index": 0, "explanation": "They detect local visual patterns."}, {"prompt": "Transfer learning is useful because it:", "options": ["Needs no model", "Reuses pre-trained knowledge with less data", "Removes bias", "Avoids evaluation"], "correct_index": 1, "explanation": "Start from learned features."}, {"prompt": "An embedding places similar meanings:", "options": ["Far apart", "Close together", "At random", "Only in images"], "correct_index": 1, "explanation": "Similar items are nearby vectors."}, {"prompt": "The transformer''s key mechanism is:", "options": ["Self-attention", "Clustering", "Gradient boosting", "Dropout only"], "correct_index": 0, "explanation": "Tokens attend to each other."}, {"prompt": "Which reduces hallucinations?", "options": ["Retrieval of trusted sources (RAG)", "Higher temperature", "Hiding sources", "Shorter prompts only"], "correct_index": 0, "explanation": "Grounding answers in documents."}, {"prompt": "In reinforcement learning the agent learns from:", "options": ["Rewards", "Labels", "Clusters", "Embeddings"], "correct_index": 0, "explanation": "Reward feedback over time."}, {"prompt": "Prompt injection is a risk because:", "options": ["AI is slow", "Outside content may contain instructions that steer the AI", "Models forget", "GPUs overheat"], "correct_index": 1, "explanation": "Treat external content as data."}, {"prompt": "A fair evaluation of bias should:", "options": ["Check performance by group", "Use only overall accuracy", "Ignore context", "Remove testing"], "correct_index": 0, "explanation": "Group-level results reveal gaps."}, {"prompt": "Which is the best habit when using an AI assistant for facts?", "options": ["Verify with trusted sources", "Trust it blindly", "Never use it", "Hide its use"], "correct_index": 0, "explanation": "You remain responsible for accuracy."}, {"prompt": "A sensible first step in any ML project is to:", "options": ["Build a baseline", "Deploy at once", "Skip the test set", "Use the biggest model"], "correct_index": 0, "explanation": "A baseline shows if the model adds value."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Artificial Intelligence and Machine Learning in Depth final exam');

UPDATE courses SET final_exam_quiz_id = (SELECT id FROM quizzes WHERE title = 'Artificial Intelligence and Machine Learning in Depth final exam'), final_exam_passing_score = 70 WHERE slug = 'artificial-intelligence-machine-learning';
