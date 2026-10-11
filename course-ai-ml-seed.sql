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
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 3: Neural networks and deep learning'), 'Sequences and the road to transformers', 'text', '## Data with order
Text, speech, music and sensor streams depend on order. **Recurrent neural networks (RNNs)** and **LSTMs** read one step at a time and carry a memory forward.

### Their limits
- Slow: each step waits for the previous one.
- They forget distant context in long sequences.

### The attention idea
Instead of squeezing everything through one memory, let the model **look back at any earlier part and decide which parts matter**. This is **attention**, and it is the key to the transformer (next module).

| Model | Reads | Strength | Weakness |
|---|---|---|---|
| RNN / LSTM | step by step | simple sequences | slow, forgets |
| **Transformer** | whole sequence at once | long-range context, parallel training | memory cost grows with length |

> Try it: What problem does attention solve? || It lets the model focus on the relevant parts of a long input instead of relying on one fading memory.', 840, 14, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 3 checkpoint quiz: Neural networks and deep learning', 'Artificial Intelligence', 'Check your understanding of neural networks and deep learning.', '[{"prompt": "Why do networks use non-linear activation functions?", "options": ["To make them smaller", "To learn complex, curved patterns", "To avoid using data", "To remove bias"], "correct_index": 1, "explanation": "Without them layers collapse into a linear function."}, {"prompt": "Backpropagation is used to:", "options": ["Collect data", "Compute gradients for all weights", "Choose the dataset", "Display results"], "correct_index": 1, "explanation": "It applies the chain rule layer by layer."}, {"prompt": "A CNN is best suited to:", "options": ["Images", "Spreadsheets only", "Passwords", "Sorting numbers"], "correct_index": 0, "explanation": "It detects local visual patterns."}, {"prompt": "Transfer learning means:", "options": ["Copying a dataset", "Reusing a pre-trained model for a new task", "Training with no data", "Transferring files"], "correct_index": 1, "explanation": "Start from learned features and fine-tune."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 3 checkpoint quiz: Neural networks and deep learning');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 3: Neural networks and deep learning'), 'Checkpoint quiz: Neural networks and deep learning', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 3 checkpoint quiz: Neural networks and deep learning'), 300, 15, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 4: Language models and generative AI', 4);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 4: Language models and generative AI'), 'How computers read language', 'text', '## From text to numbers
Computers handle numbers, so language must be converted.
{{flow Raw text > Tokens (words or word pieces) > Token IDs > Embeddings (vectors of numbers)}}

### Tokens
Models split text into **tokens**, often word pieces. "unbelievable" may become "un", "believ", "able". Cost, speed and limits are all counted in tokens.

### Embeddings
An **embedding** is a list of numbers that places a word (or sentence) as a point in space so that **similar meanings are close together**. This is how search can find "car" results when you type "automobile".

| Task | Example |
|---|---|
| Classification | is this review positive or negative? |
| Translation | English to Swahili |
| Summarisation | long report to key points |
| Question answering | find an answer in a document |
| Generation | write the next words |

> Real life: Swahili and other lower-resource languages have far less training text than English, so models are often weaker in them. Community-built datasets are one way to close the gap.
> Try it: What is an embedding? || A list of numbers representing a word or text so that similar meanings are close together.', 840, 16, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 4: Language models and generative AI'), 'Transformers and attention', 'text', '## The architecture behind modern AI
The **transformer** (introduced in 2017) reads all tokens at once and uses **self-attention** to let each token look at every other token to decide what matters.

{{ai llm}}

### Self-attention in one sentence
In "The animal did not cross the road because **it** was tired", attention helps the model connect **it** to **animal**, not **road**.

### Key terms
| Term | Meaning |
|---|---|
| **Parameters** | the learned weights (billions in large models) |
| **Context window** | the maximum tokens the model can consider at once |
| **Layer** | one block of attention + feed-forward processing |
| **Decoder-only model** | generates text one token at a time (GPT-style) |

### Generation is a loop
The model predicts a probability for every possible next token, one is chosen (the **temperature** setting controls randomness: low = predictable, high = more varied), it is appended, and the process repeats.

> Key idea: A language model is trained to **predict the next token**. Fluent, useful behaviour emerges from doing this at huge scale, but it is still statistical pattern prediction.
> Try it: What does a higher temperature do? || It makes the model''s token choices more random and varied.', 1080, 17, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 4: Language models and generative AI'), 'Large language models in practice', 'text', '## How an LLM is built
{{flow Pre-training: predict next token on huge text > Fine-tuning on example conversations > Alignment (for example human feedback, RLHF) > Deployment with safety filters and tools}}

- **Pre-training** gives general knowledge and language skill.
- **Instruction fine-tuning** teaches it to follow requests.
- **RLHF** (reinforcement learning from human feedback) uses human preferences to make answers more helpful and safe.

### Strengths and limits
| Good at | Weak at |
|---|---|
| drafting, summarising, translating, explaining | exact arithmetic without tools |
| coding help | knowing events after its training data |
| brainstorming, tutoring | being reliably truthful |

### Hallucination
An LLM can produce **confident, fluent, wrong** statements, including invented references. It predicts plausible text; it does not check facts.

### Making LLMs more reliable
| Technique | How it helps |
|---|---|
| **Retrieval-augmented generation (RAG)** | fetch trusted documents first and answer from them |
| **Tool use** | calculator, search or database for exact answers |
| **Clear prompts and examples** | reduce ambiguity |
| **Human review** | check important outputs |

> Careful: Never paste private, confidential or personal data into an AI tool unless you know how it is stored and used.
> Try it: Why can an LLM state false facts confidently? || It generates the most plausible-sounding text, with no built-in fact-checking.', 1200, 18, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 4: Language models and generative AI'), 'Generative AI beyond text', 'text', '## Creating images, audio and video
| Approach | Idea | Used for |
|---|---|---|
| **Diffusion models** | learn to remove noise step by step, so starting from random noise they "denoise" into an image that fits a prompt | image and video generation |
| **GANs** | a generator tries to fool a discriminator; both improve | realistic faces, style transfer |
| **Autoregressive models** | predict the next piece (token, audio sample) | text, speech, music |
| **Multimodal models** | process text, images and audio together | describe a photo, answer questions about a chart |

### Risks of synthetic media
- **Deepfakes** (fake video or voice) can spread misinformation or enable fraud.
- **Copyright and consent** questions about training data and styles.
- Content provenance tools and **watermarking** help, but are not foolproof.

> Real life: Always verify surprising audio or video through a second trusted source before sharing or sending money.
> Try it: In a diffusion model, what is the basic generation process? || Starting from random noise and removing noise step by step guided by the prompt.', 960, 19, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 4 checkpoint quiz: Language models and generative AI', 'Artificial Intelligence', 'Check your understanding of language models and generative ai.', '[{"prompt": "A token is:", "options": ["A password", "A piece of text (word or word part) the model processes", "A GPU", "A type of image"], "correct_index": 1, "explanation": "Models read text as tokens."}, {"prompt": "Self-attention lets a model:", "options": ["Ignore context", "Weigh how relevant each token is to others", "Delete data", "Run offline"], "correct_index": 1, "explanation": "Each token attends to others."}, {"prompt": "RAG improves reliability by:", "options": ["Making answers longer", "Retrieving trusted documents to answer from", "Removing the model", "Raising temperature"], "correct_index": 1, "explanation": "It grounds answers in sources."}, {"prompt": "A hallucination is:", "options": ["A slow response", "A confident but false output", "An image filter", "A training step"], "correct_index": 1, "explanation": "Fluent but wrong content."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 4 checkpoint quiz: Language models and generative AI');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 4: Language models and generative AI'), 'Checkpoint quiz: Language models and generative AI', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 4 checkpoint quiz: Language models and generative AI'), 300, 20, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 5: Reinforcement learning and agents', 5);
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
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 5: Reinforcement learning and agents'), 'Robotics, vision and AI in the physical world', 'text', '## Sensing and acting
Robots and smart devices combine **perception** (cameras, lidar, microphones), **decision-making** (planning, learned policies) and **control** (motors, actuators).

| Field | AI role |
|---|---|
| Self-driving | detect lanes, vehicles, pedestrians; plan a safe path |
| Agriculture | drone images show crop stress and pests; precision spraying |
| Healthcare | image analysis, triage support, drug discovery |
| Manufacturing | quality inspection, predictive maintenance |
| Energy | forecast demand and optimise grids |

### Edge AI
Small models run directly on a phone or sensor ("on the edge"), which works without internet, protects privacy and responds fast. This matters where connectivity is limited.

> Real life: A phone app can identify a maize leaf disease offline from a photo, helping a farmer decide on treatment the same day.
> Try it: What is an advantage of edge AI? || It runs locally: works offline, keeps data private and responds quickly.', 720, 23, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'AI Module 5 checkpoint quiz: Reinforcement learning and agents', 'Artificial Intelligence', 'Check your understanding of reinforcement learning and agents.', '[{"prompt": "In reinforcement learning, the agent is trained using:", "options": ["Labels", "Rewards", "Clusters", "Duplicates"], "correct_index": 1, "explanation": "Rewards from the environment."}, {"prompt": "Prompt injection means:", "options": ["Faster prompts", "Hidden instructions in outside content that try to steer the AI", "A GPU upgrade", "A data-cleaning step"], "correct_index": 1, "explanation": "Treat external content as data."}, {"prompt": "Edge AI runs:", "options": ["Only in distant data centres", "On the local device", "Only on satellites", "Without any model"], "correct_index": 1, "explanation": "On the device itself."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'AI Module 5 checkpoint quiz: Reinforcement learning and agents');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 5: Reinforcement learning and agents'), 'Checkpoint quiz: Reinforcement learning and agents', 'quiz', (SELECT id FROM quizzes WHERE title='AI Module 5 checkpoint quiz: Reinforcement learning and agents'), 300, 24, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), 'Module 6: AI, society and ethics', 6);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'AI in everyday life and work', 'text', '## Already around you
| Area | Examples |
|---|---|
| Phone | face unlock, predictive text, voice assistants, camera enhancement |
| Health | scan reading, symptom checkers, drug discovery |
| Education | adaptive practice, tutoring, translation |
| Finance | fraud detection, credit scoring, mobile-money security |
| Farming | crop monitoring, weather and market forecasts |
| Government | document processing, planning, language services |

### Work will change
AI tends to **automate tasks** more than whole jobs. Roles shift: routine tasks reduce, while skills like judgement, communication, creativity, domain knowledge and AI literacy grow in value.

> Key idea: People who **understand AI and can supervise it** are better placed than people who either ignore it or trust it blindly.
> Try it: Does AI usually replace whole jobs or tasks within jobs? || Mostly tasks within jobs, which changes how jobs are done.', 720, 25, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'Bias, fairness and privacy', 'text', '## Where bias comes from
AI learns from human data, so it can copy and amplify human bias.
{{flow Biased or unrepresentative data > Model learns the pattern > Unequal errors or decisions > Real harm to some groups}}

| Source | Example |
|---|---|
| Historical bias | a hiring model trained on past hires favours the group hired before (a reported case led one company to drop its recruiting tool) |
| Representation bias | face systems tested mainly on lighter skin perform worse on darker skin (shown in published audits) |
| Measurement bias | using arrests as a proxy for crime reflects policing patterns |

### Reducing bias
Audit performance **by group**, collect representative data, involve affected communities, document limits, keep humans able to appeal decisions.

### Privacy and security
- Models can memorise and leak training data.
- **Adversarial examples**: tiny changes make a model misclassify.
- **Data protection**: collect only what is needed, get consent, secure it, follow local law.

> Careful: A model that is 95% accurate overall can still be much worse for a small group. Always check results **for each group**.
> Try it: Why can a model be unfair even if nobody intended it? || Because it learns patterns from data that already contain historical or sampling bias.', 960, 26, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='artificial-intelligence-machine-learning') AND title='Module 6: AI, society and ethics'), 'Responsible AI, regulation and the future', 'text', '## Principles most frameworks share
| Principle | Meaning |
|---|---|
| Fairness | do not discriminate unjustly |
| Transparency | explain what the system does and its limits |
| Accountability | a human or organisation is responsible |
| Safety and robustness | works reliably, resists misuse |
| Privacy | protect personal data |
| Human oversight | people can review and override |

### Regulation
Many governments are adopting **risk-based rules**: the higher the potential harm (health, hiring, policing, credit), the stricter the requirements. The EU''s AI Act is a prominent example, and many countries are drafting national AI strategies and data-protection laws.

### Environmental cost
Training and running large models uses significant electricity and water for data centres. More efficient models, smaller specialised models and renewable power reduce the footprint.

### Using AI honestly in school and work
{{flow Ask clearly > Check the answer > Verify with trusted sources > Use it honestly and say when AI helped}}

> Real life: If your teacher or employer sets rules on AI use, follow them and be transparent about how you used it.
> Try it: Name two reasons for human oversight of AI decisions. || To catch errors and bias, and to keep a person accountable and able to override the system.', 960, 27, 0);
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
