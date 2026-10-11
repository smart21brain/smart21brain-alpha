INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'Tubular transport and urine concentration', 'text', '## Segment by segment
| Segment | Main job |
|---|---|
| Proximal tubule | reabsorbs about 65% of Na⁺ and water, **all glucose and amino acids**, most HCO₃⁻ |
| Descending limb | water leaves (osmosis) |
| Thick ascending limb | Na⁺ K⁺ 2Cl⁻ (NKCC2) out, impermeable to water: **dilutes** urine |
| Distal tubule | Na⁺ Cl⁻ in; Ca²⁺ via **PTH** |
| Collecting duct | water (**ADH**), Na⁺ (**aldosterone**), K⁺ secretion, acid secretion |

### Glucose handling
SGLT2 in the proximal tubule reabsorbs glucose up to a **transport maximum**. If plasma glucose exceeds about **10 mmol/L (renal threshold)**, glucose appears in urine (glycosuria) in uncontrolled diabetes. SGLT2 inhibitors deliberately cause glycosuria.

## Concentrating the urine
The **loop of Henle** is a **countercurrent multiplier**: salt pumped out of the thick ascending limb builds a medullary gradient up to about **1200 mOsm/L**. The **vasa recta** preserve it. With **ADH**, collecting duct **aquaporin-2** lets water follow the gradient, giving concentrated urine.

> Real life: **Loop diuretics** (furosemide) block NKCC2, abolishing the gradient: large urine volume. **Thiazides** block the distal NaCl co-transporter. **Spironolactone** blocks aldosterone.
> Try it: Which hormone inserts aquaporin-2 channels into the collecting duct? || ADH (vasopressin).', 1080, 34, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'Fluid, electrolytes and the RAAS', 'text', '## Body water
Total body water is about 60% of body weight: about **two thirds intracellular** and **one third extracellular** (of which one quarter is plasma).

## The renin-angiotensin-aldosterone system
{{flow Low BP or low Na⁺ delivery > Juxtaglomerular cells release renin > Angiotensinogen becomes angiotensin I > ACE (lung) makes angiotensin II > Vasoconstriction, aldosterone, ADH, thirst > BP and volume restored}}

| Hormone | Acts on | Effect |
|---|---|---|
| Angiotensin II | arterioles | vasoconstriction |
| Aldosterone | collecting duct | Na⁺ and water retained, K⁺ lost |
| ADH | collecting duct | water retained |
| ANP (from stretched atria) | kidney | Na⁺ and water excreted |

> Key idea: ACE inhibitors and ARBs lower blood pressure by blocking this system; a typical side effect is **hyperkalaemia** (less aldosterone) and, for ACE inhibitors, dry cough (bradykinin).

### Potassium
Plasma K⁺ is held at 3.5-5.0 mmol/L. **Hyperkalaemia** causes peaked T waves and arrhythmias; **hypokalaemia** causes weakness and flat T waves.

### Micturition
Bladder filling stretches the wall; the **parasympathetic (S2-S4) detrusor** contracts and the internal sphincter relaxes; the **external sphincter** is voluntary (somatic).

> Try it: Where is renin made? || Juxtaglomerular cells of the afferent arteriole.', 1080, 35, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 7 checkpoint quiz: The renal system', 'Anatomy and Physiology', 'Check your understanding of the renal system.', '[{"prompt": "GFR in a healthy adult is about:", "options": ["25 mL/min", "60 mL/min", "125 mL/min", "500 mL/min"], "correct_index": 2, "explanation": "About 125 mL/min."}, {"prompt": "Most Na⁺ and water are reabsorbed in the:", "options": ["Proximal tubule", "Loop of Henle", "Distal tubule", "Collecting duct"], "correct_index": 0, "explanation": "About 65% in the proximal tubule."}, {"prompt": "Furosemide blocks:", "options": ["NKCC2", "ENaC", "Aquaporin-2", "SGLT2"], "correct_index": 0, "explanation": "The Na⁺ K⁺ 2Cl⁻ transporter in the thick ascending limb."}, {"prompt": "Angiotensin II causes:", "options": ["Vasodilation", "Aldosterone release", "Natriuresis", "Lower thirst"], "correct_index": 1, "explanation": "It stimulates aldosterone and vasoconstriction."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 7 checkpoint quiz: The renal system');
