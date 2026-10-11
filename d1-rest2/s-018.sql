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
