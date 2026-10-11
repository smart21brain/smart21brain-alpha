INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 2: Classical machine learning'), 'Clustering and finding structure', 'text', '## Learning without labels
**Unsupervised learning** looks for structure when no answers are given.

{{ai cluster}}

### K-means in four steps
{{flow Pick K and place K centres > Assign each point to the nearest centre > Move each centre to the mean of its points > Repeat until nothing changes}}

### Other unsupervised ideas
- **Dimensionality reduction (PCA)**: compress many features into a few that keep most of the information, handy for plotting and speed.
- **Anomaly detection**: flag points that do not fit, such as a fraudulent transaction.
- **Association rules**: "people who buy bread often buy butter".

> Real life: A shop groups customers by buying habits to design offers; a bank flags unusual card activity without having labelled every fraud case.
> Careful: You choose K. Different K values give different groups, so check that the groups are meaningful, not just mathematically neat.
> Try it: Does clustering need labelled data? || No, it finds groups from the inputs alone.', 840, 7, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 2: Classical machine learning'), 'Overfitting and generalisation', 'text', '## The central problem of ML
A model must perform well on **new** data, not just the data it was trained on.

{{ai overfit}}

| Problem | Symptom | Cause | Fix |
|---|---|---|---|
| **Underfitting** | poor on train AND test | model too simple | more features or a more flexible model |
| **Overfitting** | great on train, poor on test | model memorised noise | more data, simpler model, regularisation, early stopping |

### Bias-variance trade-off
**Bias** is error from over-simple assumptions; **variance** is error from being too sensitive to the training sample. Making a model more complex lowers bias but raises variance.

### Tools to fight overfitting
- **Cross-validation**: train and test on several different splits.
- **Regularisation** (L1/L2): penalise very large weights.
- **Dropout** (neural nets): randomly switch units off during training.
- **Early stopping**: stop when validation loss starts rising.
- **More and better data**.

> Key idea: Judge a model only by its score on **data it has never seen**.
> Try it: A model scores 99% on training data and 62% on test data. What is wrong? || Overfitting: it memorised the training set instead of learning general patterns.', 960, 8, 0);
