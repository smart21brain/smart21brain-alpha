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
