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
