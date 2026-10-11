INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 6: The respiratory system'), 'Airways and the mechanics of breathing', 'text', '## Anatomy
- **Conducting zone** (no gas exchange): nose, pharynx, larynx, trachea, bronchi, bronchioles (about 150 mL **anatomical dead space**).
- **Respiratory zone**: respiratory bronchioles, alveolar ducts and about **300 million alveoli** (surface about 70 m²).
- The **right main bronchus** is shorter, wider and more vertical, so inhaled objects usually enter the right lung.

## Mechanics
Air moves by **pressure differences** (Boyle''s law: pressure falls when volume rises).
{{flow Diaphragm and external intercostals contract > Thoracic volume rises > Intrapleural pressure becomes more negative > Alveolar pressure falls below atmospheric > Air flows in}}

Quiet **expiration is passive** (elastic recoil); forced expiration uses internal intercostals and abdominal muscles.

### Lung volumes (adult male, approximate)
| Volume | mL |
|---|---|
| Tidal volume (TV) | 500 |
| Inspiratory reserve | 3000 |
| Expiratory reserve | 1100 |
| Residual volume | 1200 |
| Vital capacity (VC) | about 4600 |
| Total lung capacity | about 5800 |

**Minute ventilation** = TV × RR = 500 × 12 = 6 L/min. **Alveolar ventilation** = (TV - dead space) × RR = 350 × 12 = 4.2 L/min.

> Key idea: **Surfactant** (type II pneumocytes) lowers surface tension so alveoli do not collapse. Premature babies lack it, causing respiratory distress syndrome.
> Real life: **Asthma** and **COPD** are obstructive (FEV₁/FVC below 0.7); **pulmonary fibrosis** is restrictive (low volumes, stiff lungs).
> Try it: Why is quiet expiration passive? || The elastic recoil of the lungs and chest wall pushes air out without muscle effort.', 960, 27, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 6: The respiratory system'), 'Gas exchange and ventilation-perfusion', 'text', '## Diffusion across the respiratory membrane
{{anat alveolus}}

Gas moves down its **partial pressure** gradient. Rate follows **Fick''s law**: faster with a larger area and bigger pressure difference, slower with a thicker membrane.

### Partial pressures (mmHg)
| Site | PO₂ | PCO₂ |
|---|---|---|
| Inspired air (dry) | about 150 | about 0 |
| Alveolus | 104 | 40 |
| Arterial blood | about 100 | 40 |
| Venous blood | 40 | 45 |

CO₂ is about 20 times more soluble than O₂, so it diffuses easily even with a small gradient.

## Ventilation-perfusion (V/Q) matching
Efficient gas exchange needs air (**V**) and blood (**Q**) to reach the same alveoli.
{{stack V/Q high: dead space (pulmonary embolism) | V/Q normal about 0.8 | V/Q low: shunt (pneumonia, collapse)}}

Hypoxic **pulmonary vasoconstriction** redirects blood from poorly ventilated alveoli, the opposite of systemic vessels.

> Real life: A **pulmonary embolism** blocks blood flow (high V/Q). **Pneumonia** fills alveoli with fluid (low V/Q): giving oxygen helps partly. A true shunt does not respond fully to oxygen.
> Try it: Which is more soluble in blood, O₂ or CO₂? || CO₂ (about 20 times).', 960, 28, 0);
