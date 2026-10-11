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
