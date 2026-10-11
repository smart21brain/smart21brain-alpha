INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 4: The endocrine system'), 'The hypothalamus and pituitary', 'text', '## The command centre
The **hypothalamus** links the nervous and endocrine systems and controls the **pituitary**.

- **Posterior pituitary** (neural): stores and releases **ADH** and **oxytocin**, made in the hypothalamus and sent down axons.
- **Anterior pituitary** (glandular): makes its own hormones under control of hypothalamic releasing hormones via a portal blood supply.

### Anterior pituitary hormones ("FLAT PeG")
| Hormone | Target | Effect |
|---|---|---|
| **F**SH, **L**H | gonads | gametes, sex steroids |
| **A**CTH | adrenal cortex | cortisol |
| **T**SH | thyroid | T3 and T4 |
| **Pr**olactin | breast | milk production |
| **G**H | liver, bone, muscle | IGF-1, growth, glucose ↑ |

### Axes
{{flow Hypothalamus (CRH, TRH, GnRH) > Anterior pituitary (ACTH, TSH, FSH/LH) > Target gland (adrenal, thyroid, gonads) > Hormone feeds back to hypothalamus and pituitary}}

> Real life: A pituitary tumour pressing on the **optic chiasm** causes **bitemporal hemianopia** (loss of the outer half of vision in both eyes). **Diabetes insipidus** is too little ADH (or kidney resistance): large volumes of dilute urine.
> Try it: Which pituitary hormone stimulates the adrenal cortex? || ACTH.', 840, 18, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 4: The endocrine system'), 'Thyroid, adrenal and pancreas', 'text', '## Thyroid
Follicular cells make **T4 and T3** (need iodine) which set **basal metabolic rate**. TSH drives them; high T3/T4 shut TSH off.
- **Hyperthyroidism** (Graves''): weight loss, tachycardia, heat intolerance, tremor.
- **Hypothyroidism**: weight gain, bradycardia, cold intolerance, fatigue.

## Adrenal gland
| Zone | Hormone | Controlled by | Effect |
|---|---|---|---|
| Cortex: glomerulosa | aldosterone | angiotensin II, K⁺ | Na⁺ and water retained, K⁺ lost |
| Cortex: fasciculata | cortisol | ACTH | glucose ↑, anti-inflammatory, stress response |
| Cortex: reticularis | androgens | ACTH | sex-hormone precursors |
| Medulla | adrenaline, noradrenaline | sympathetic nerves | fight or flight |

## Blood glucose regulation
Beta cells of the **islets of Langerhans** release **insulin** when glucose rises. Alpha cells release **glucagon** when it falls.
{{flow Eat a meal > Glucose rises > Beta cells release insulin > Cells take up glucose, liver stores glycogen > Glucose falls to about 5 mmol/L}}

| | Insulin | Glucagon |
|---|---|---|
| Stimulus | high glucose, amino acids | low glucose |
| Liver | glycogen synthesis | glycogenolysis, gluconeogenesis |
| Fat/muscle | uptake of glucose (GLUT4) | no effect on glucose uptake |
| Blood glucose | falls | rises |

> Real life: **Type 1 diabetes** is autoimmune loss of beta cells (absolute insulin lack, risk of ketoacidosis). **Type 2** is insulin resistance with relative deficiency. Chronic high glucose damages small and large vessels.
> Try it: Which hormone raises blood glucose by breaking down glycogen? || Glucagon (also adrenaline and cortisol).', 1080, 19, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 4 checkpoint quiz: The endocrine system', 'Anatomy and Physiology', 'Check your understanding of the endocrine system.', '[{"prompt": "Which hormone class acts on intracellular receptors?", "options": ["Peptides", "Steroids", "Catecholamines at the cell surface", "Insulin"], "correct_index": 1, "explanation": "Steroids (and thyroid hormones) cross the membrane."}, {"prompt": "ADH is released from the:", "options": ["Anterior pituitary", "Posterior pituitary", "Adrenal cortex", "Thyroid"], "correct_index": 1, "explanation": "It is made in the hypothalamus and released from the posterior pituitary."}, {"prompt": "Aldosterone causes:", "options": ["Na⁺ loss", "K⁺ retention", "Na⁺ retention and K⁺ loss", "Glucose release"], "correct_index": 2, "explanation": "It acts on principal cells of the collecting duct."}, {"prompt": "A fall in blood glucose directly stimulates:", "options": ["Insulin", "Glucagon", "Calcitonin", "TSH"], "correct_index": 1, "explanation": "Alpha cells release glucagon."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 4 checkpoint quiz: The endocrine system');
