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
