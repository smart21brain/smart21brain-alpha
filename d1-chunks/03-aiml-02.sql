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

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 3: Neural networks and deep learning'), 'The artificial neuron', 'text', '## A tiny decision unit
An artificial neuron multiplies each input by a **weight**, adds them up with a **bias**, and passes the result through an **activation function**.

{{ai perceptron}}

### Activation functions
| Function | Output | Used for |
|---|---|---|
| **ReLU** max(0, x) | 0 or positive | most hidden layers |
| **Sigmoid** | 0 to 1 | probability of one class |
| **Tanh** | -1 to 1 | older networks, some recurrent models |
| **Softmax** | probabilities that sum to 1 | choosing one of many classes |

> Key idea: Without a non-linear activation, stacking layers would still be one big straight-line function. Activations let networks learn **curved, complex patterns**.
> Try it: What does a weight control in a neuron? || How strongly its input influences the neuron''s output.', 840, 11, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 3: Neural networks and deep learning'), 'Layers, backpropagation and training', 'text', '## Stacking neurons
{{ai neuralnet}}

Early layers detect simple features (edges), later layers combine them (shapes, then objects). **Deep learning** simply means many layers.

### How a network learns
{{flow Forward pass: make a prediction > Compare with the truth: compute the loss > Backpropagation: find each weight''s share of the error > Update all weights with gradient descent > Repeat for many batches}}

- **Backpropagation** applies the chain rule of calculus to work out how the loss changes with every weight.
- An **epoch** is one full pass through the training data; a **batch** is a small chunk processed at once.
- **Optimisers** such as SGD and **Adam** decide how the weights are updated.

### Training checklist
| Item | Why it matters |
|---|---|
| Normalise inputs | faster, stabler training |
| Monitor validation loss | detect overfitting |
| Tune learning rate | the most important setting |
| Use a GPU | matrix maths runs in parallel |

> Real life: Training a large model can mean billions of weights and weeks on thousands of GPUs, which is why compute cost matters.
> Try it: What does backpropagation compute? || The gradient of the loss with respect to every weight, so each can be updated.', 1080, 12, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 3: Neural networks and deep learning'), 'Convolutional networks and images', 'text', '## Why images need a special design
A photo has millions of pixels. A **convolutional neural network (CNN)** slides small **filters** across the image to detect local patterns, using the same filter everywhere (far fewer weights than a fully connected layer).

{{flow Pixels > Convolution: detect edges > Pooling: shrink, keep strong signals > Deeper convolutions: shapes and parts > Dense layer + softmax: class probabilities}}

### What each stage learns
| Layer depth | Typical features |
|---|---|
| First | edges, colours, corners |
| Middle | textures, eyes, wheels |
| Deep | whole objects, faces |

### Applications
Medical imaging (spotting tumours), reading plant diseases from leaf photos, face unlock, reading number plates, self-driving perception.

> Key idea: **Transfer learning** reuses a network pre-trained on millions of images and only retrains the last layers, so useful models need far less data and compute.
> Real life: A clinic can adapt a pre-trained model to its own X-rays with a few thousand labelled images.
> Try it: Why do CNNs reuse the same filter across the whole image? || Patterns like edges can appear anywhere, and sharing weights cuts parameters and speeds learning.', 960, 13, 0);
