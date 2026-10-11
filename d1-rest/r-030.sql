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
