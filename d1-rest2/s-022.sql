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
