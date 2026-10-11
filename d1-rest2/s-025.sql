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
