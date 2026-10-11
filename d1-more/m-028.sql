INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 6: The respiratory system'), 'Oxygen and carbon dioxide transport', 'text', '## Oxygen carriage
- **98.5%** bound to **haemoglobin** (Hb), 1.5% dissolved.
- Each Hb carries 4 O₂; **1 g Hb holds about 1.34 mL O₂**.
- **O₂ content** ≈ (1.34 × Hb × SaO₂) + (0.003 × PaO₂). With Hb 15 g/dL and SaO₂ 98%: about **20 mL/100 mL**.

{{anat oxyhb}}

The curve is **S-shaped** (cooperative binding): the top is flat (safe margin if PO₂ drops a little) and the steep middle lets tissues unload lots of O₂ with a small PO₂ fall.

> Key idea: **Right shift** (↑CO₂, ↑H⁺, ↑temperature, ↑2,3-BPG) means Hb gives up O₂ more easily; this happens in exercising muscle (the **Bohr effect**). Fetal Hb and CO shift it left.

### Carbon monoxide
CO binds Hb about **200 times** more tightly than O₂. SaO₂ may read normal on a pulse oximeter while the patient is seriously hypoxic.

## CO₂ carriage
| Form | Share |
|---|---|
| Bicarbonate (via carbonic anhydrase in red cells) | about 70% |
| Carbaminohaemoglobin | about 20% |
| Dissolved | about 10% |

CO₂ + H₂O ⇌ H₂CO₃ ⇌ H⁺ + HCO₃⁻

> Real life: **Anaemia** lowers O₂ content but leaves PaO₂ and SaO₂ normal. **Cyanide** poisons mitochondria, so tissues cannot use O₂ even though delivery is fine.
> Try it: Why is a pulse oximeter unreliable in carbon monoxide poisoning? || It cannot tell carboxyhaemoglobin from oxyhaemoglobin, so it reads falsely normal.', 960, 29, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 6: The respiratory system'), 'Control of breathing and acid-base balance', 'text', '## Controlling breathing
- **Medullary respiratory centres** (dorsal and ventral groups) set the basic rhythm; the **pons** smooths it.
- **Central chemoreceptors** (medulla) respond to rising **CSF H⁺ from CO₂**: the most important drive.
- **Peripheral chemoreceptors** (carotid and aortic bodies) respond to low **PO₂** (below about 60 mmHg), high CO₂ and low pH.

> Real life: In **chronic CO₂ retainers (some COPD patients)** central chemoreceptors adapt; hypoxia becomes the main drive, so high-flow oxygen can reduce breathing. Titrate oxygen to a target saturation.

## Acid-base balance
{{stack pH = 6.1 + log [HCO₃⁻] / (0.03 × PCO₂) | Lungs control PCO₂ (minutes) | Kidneys control HCO₃⁻ (days)}}

| Parameter | Normal |
|---|---|
| pH | 7.35-7.45 |
| PaCO₂ | 35-45 mmHg |
| HCO₃⁻ | 22-26 mmol/L |

| Disorder | pH | Primary change | Compensation | Cause |
|---|---|---|---|---|
| Respiratory acidosis | ↓ | PCO₂ ↑ | kidneys retain HCO₃⁻ | COPD, opioids |
| Respiratory alkalosis | ↑ | PCO₂ ↓ | kidneys excrete HCO₃⁻ | hyperventilation, anxiety |
| Metabolic acidosis | ↓ | HCO₃⁻ ↓ | lungs hyperventilate (Kussmaul) | DKA, renal failure, diarrhoea |
| Metabolic alkalosis | ↑ | HCO₃⁻ ↑ | lungs hypoventilate | vomiting, diuretics |

> Try it: pH 7.25, PCO₂ 30, HCO₃⁻ 12. Name the disorder. || Metabolic acidosis with respiratory compensation (low PCO₂).', 1080, 30, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 6 checkpoint quiz: The respiratory system', 'Anatomy and Physiology', 'Check your understanding of the respiratory system.', '[{"prompt": "Normal tidal volume is about:", "options": ["150 mL", "500 mL", "1200 mL", "3000 mL"], "correct_index": 1, "explanation": "About 500 mL at rest."}, {"prompt": "Surfactant is made by:", "options": ["Type I pneumocytes", "Type II pneumocytes", "Goblet cells", "Macrophages"], "correct_index": 1, "explanation": "Type II pneumocytes."}, {"prompt": "A right shift of the O₂-Hb curve is caused by:", "options": ["↓CO₂", "↑H⁺", "↓Temperature", "Fetal Hb"], "correct_index": 1, "explanation": "Raised H⁺ (acidosis) shifts it right."}, {"prompt": "The bulk of CO₂ is carried as:", "options": ["Dissolved gas", "Carbaminohaemoglobin", "Bicarbonate", "Carbonic acid"], "correct_index": 2, "explanation": "About 70% as bicarbonate."}, {"prompt": "pH 7.5, PCO₂ 28, HCO₃⁻ 22 suggests:", "options": ["Respiratory alkalosis", "Metabolic alkalosis", "Respiratory acidosis", "Metabolic acidosis"], "correct_index": 0, "explanation": "High pH with low PCO₂."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 6 checkpoint quiz: The respiratory system');
