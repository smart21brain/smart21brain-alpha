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
