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
