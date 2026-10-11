INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 2: Classical machine learning'), 'Evaluating models', 'text', '## Accuracy is not enough
If only 1% of transactions are fraud, a model that always says "not fraud" is **99% accurate and completely useless**.

{{ai confusion}}

### Key metrics
| Metric | Question it answers |
|---|---|
| Accuracy | what fraction of all predictions were right? |
| **Precision** | when it says "yes", how often is it right? |
| **Recall** | of all real "yes" cases, how many did it catch? |
| **F1 score** | single number balancing precision and recall |

### Which to prioritise?
- **Disease screening**: high **recall** (do not miss cases).
- **Spam filter** (blocking real mail is costly): high **precision**.
- **Regression**: use MAE, RMSE or R² instead.

> Real life: Out of 100 emails flagged as spam, 90 truly are: precision 90%. If there were 120 real spam emails in total and it caught 90, recall is 90/120 = 75%.
> Try it: TP = 40, FP = 10, FN = 20. What are precision and recall? || Precision = 40/50 = 80%; recall = 40/60 = about 67%.', 960, 9, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 2 checkpoint quiz: Classical machine learning', 'Artificial Intelligence', 'Check your understanding of classical machine learning.', '[{"prompt": "Gradient descent updates weights to:", "options": ["Increase the loss", "Reduce the loss", "Add more data", "Remove features"], "correct_index": 1, "explanation": "It steps downhill on the loss."}, {"prompt": "A model with 99% training accuracy and 60% test accuracy is:", "options": ["Underfitting", "Overfitting", "Perfect", "Unbiased"], "correct_index": 1, "explanation": "Large train-test gap means overfitting."}, {"prompt": "Clustering is an example of:", "options": ["Supervised learning", "Unsupervised learning", "Reinforcement learning", "Rule-based AI"], "correct_index": 1, "explanation": "No labels are given."}, {"prompt": "TP 30, FP 10, FN 10. Precision is:", "options": ["50%", "60%", "75%", "90%"], "correct_index": 2, "explanation": "30 / (30 + 10) = 75%."}, {"prompt": "For cancer screening, which metric is most important?", "options": ["Recall", "Precision only", "Training speed", "Number of features"], "correct_index": 0, "explanation": "Missing a real case is the worst error."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 2 checkpoint quiz: Classical machine learning');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 2: Classical machine learning'), 'Checkpoint quiz: Classical machine learning', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 2 checkpoint quiz: Classical machine learning'), 300, 10, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 3: Neural networks and deep learning', 3);
