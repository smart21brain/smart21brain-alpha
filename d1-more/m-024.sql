INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 4: The endocrine system'), 'Checkpoint quiz: The endocrine system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 4 checkpoint quiz: The endocrine system'), 300, 20, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 5: The cardiovascular system', 5);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Heart anatomy and the path of blood', 'text', '## Four chambers, two pumps
The **right heart** pumps blood to the lungs (pulmonary circuit); the **left heart** pumps blood to the body (systemic circuit).

{{anat heart}}

### Valves
| Valve | Between | Heard as |
|---|---|---|
| Tricuspid | RA and RV | S1 (with mitral) |
| Pulmonary | RV and pulmonary artery | S2 (with aortic) |
| Mitral (bicuspid) | LA and LV | S1 |
| Aortic | LV and aorta | S2 |

> Key idea: The **left ventricle wall is about three times thicker** than the right because it pumps against a much higher pressure (systemic about 120/80 mmHg, pulmonary about 25/8 mmHg).

### Wall layers
**Endocardium** (inner), **myocardium** (muscle), **epicardium** (outer, part of the pericardium).

### Coronary circulation
The heart muscle is fed by the **left and right coronary arteries**, which arise from the aortic root. The **left anterior descending (LAD)** supplies the front of the left ventricle and septum. The **left ventricle is perfused mainly during diastole**, because systolic contraction squeezes its vessels shut.

> Real life: **Myocardial infarction** is death of heart muscle after coronary occlusion. Occlusion of the LAD ("widow-maker") causes a large anterior infarct.
> Try it: Which valve lies between the left atrium and left ventricle? || The mitral (bicuspid) valve.', 1080, 21, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Cardiac conduction and the ECG', 'text', '## Electrical pathway
{{flow SA node (pacemaker, about 70/min) > Atria contract > AV node (delay about 0.1 s) > Bundle of His > Left and right bundle branches > Purkinje fibres > Ventricles contract}}

- The **SA node** has the fastest spontaneous depolarisation, so it sets the rhythm. The **AV node** delays impulses so the atria finish emptying before the ventricles contract.
- Heart rate is controlled by the ANS: **vagus slows**, **sympathetic speeds up**.

## Reading the ECG
{{anat ecg}}

| Wave / interval | Represents | Normal |
|---|---|---|
| P wave | atrial depolarisation | upright in lead II |
| PR interval | AV nodal delay | 0.12-0.20 s |
| QRS complex | ventricular depolarisation | under 0.12 s |
| ST segment | ventricles fully depolarised | isoelectric |
| T wave | ventricular repolarisation | upright |

> Real life: **ST elevation** suggests acute coronary occlusion (STEMI). **Atrial fibrillation** has no distinct P waves and an irregularly irregular rhythm. **Complete heart block** shows P waves and QRS complexes that march independently.
> Try it: Why does the AV node delay conduction? || To let the ventricles fill fully from the contracting atria before they contract.', 960, 22, 0);
