-- Anatomy and Physiology (Medical Level): extension, part 4.
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 14: Metabolism, clinical skills and pharmacology', 14);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 14: Metabolism, clinical skills and pharmacology'), 'Energy metabolism', 'text', '## ATP is the currency
Cells run on **ATP**. Glucose is broken down in three stages.
{{flow Glucose > Glycolysis (cytoplasm) > Pyruvate > Acetyl-CoA > Krebs cycle (mitochondrial matrix) > Electron transport chain > ATP, CO2 and water}}
| Stage | Where | Oxygen? | Net ATP per glucose |
|---|---|---|---|
| **Glycolysis** | Cytoplasm | No | 2 |
| **Krebs cycle** | Mitochondrial matrix | Indirectly | 2 (and NADH, FADH2) |
| **Oxidative phosphorylation** | Inner mitochondrial membrane | Yes | about 26 to 28 |
| **Total (aerobic)** | | | about **30 to 32** |

Without oxygen, pyruvate becomes **lactate** and only 2 ATP per glucose are made. Raised lactate with poor perfusion causes **lactic acidosis**.

## Fed and fasted states
| State | Hormone | Liver and tissues do |
|---|---|---|
| **Fed** | **Insulin** | Store glucose as **glycogen**, make fat, take up glucose |
| **Fasting** | **Glucagon**, adrenaline, cortisol | Break down glycogen (**glycogenolysis**), make new glucose (**gluconeogenesis**), release fatty acids |
| **Prolonged starvation** | Low insulin | **Ketone bodies** from fat fuel the brain |

The brain normally uses **glucose** and needs a constant supply.

## Energy and nutrients
| Nutrient | Energy | Role |
|---|---|---|
| Carbohydrate | 4 kcal/g | Main fuel |
| Protein | 4 kcal/g | Repair and enzymes |
| Fat | 9 kcal/g | Energy store, cell membranes |
| Vitamins and minerals | none | Co-factors, bone, blood (for example iron and B12 for red cells) |

> Real life: In type 1 diabetes there is no insulin, so cells starve despite high blood glucose, and the liver makes ketones (diabetic ketoacidosis).
> Try it: Roughly how much ATP does one glucose give with oxygen? || About 30 to 32.', 1080, 59, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 14: Metabolism, clinical skills and pharmacology'), 'Vital signs and normal reference values', 'text', '## Vital signs (healthy adult)
| Measurement | Normal range |
|---|---|
| **Heart rate** | 60 to 100 beats/min |
| **Respiratory rate** | 12 to 20 breaths/min |
| **Blood pressure** | below 120/80 mmHg (hypertension from 140/90 on repeated readings) |
| **Temperature** | about 36.1 to 37.2 C |
| **Oxygen saturation (SpO2)** | 95 to 100 percent |

## Common laboratory values (adult, approximate)
Ranges vary between laboratories, so always use the range printed on the report.
| Test | Typical range |
|---|---|
| Haemoglobin | Men 13 to 17 g/dL; women 12 to 15 g/dL |
| White cell count | 4 to 11 x 10^9/L |
| Platelets | 150 to 400 x 10^9/L |
| Sodium | 135 to 145 mmol/L |
| Potassium | 3.5 to 5.0 mmol/L |
| Fasting glucose | 3.9 to 5.6 mmol/L (70 to 100 mg/dL) |
| Creatinine | about 60 to 110 micromol/L |
| Arterial pH | 7.35 to 7.45 |
| PaCO2 | 4.7 to 6.0 kPa (35 to 45 mmHg) |
| PaO2 | 10 to 13 kPa (75 to 100 mmHg) |

### Reading an acid-base result
{{flow Check pH > Check PaCO2 > Check bicarbonate > Name the disorder > Look for compensation}}
| pH | PaCO2 | HCO3 | Disorder |
|---|---|---|---|
| Low | High | Normal or high | **Respiratory acidosis** |
| Low | Low or normal | Low | **Metabolic acidosis** |
| High | Low | Normal or low | **Respiratory alkalosis** |
| High | Normal or high | High | **Metabolic alkalosis** |

> Careful: These numbers are for learning. Real patients are judged by their own situation, age and trends, not one value.
> Try it: A patient has pH 7.28, low bicarbonate and a low PaCO2. What is the disorder? || Metabolic acidosis with respiratory compensation (fast, deep breathing).', 900, 60, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 14: Metabolism, clinical skills and pharmacology'), 'Medical terminology: decode any word', 'text', '## Build words from parts
Most medical terms have a **prefix**, a **root** and a **suffix**. Learn the parts and you can decode thousands of words.

### Roots (the organ)
| Root | Meaning | Root | Meaning |
|---|---|---|---|
| **cardi-** | heart | **nephr- / ren-** | kidney |
| **pulmo- / pneumo-** | lung | **hepat-** | liver |
| **gastr-** | stomach | **neur-** | nerve |
| **cephal-** | head | **oste-** | bone |
| **derm-** | skin | **haem-** | blood |

### Prefixes
| Prefix | Meaning | Prefix | Meaning |
|---|---|---|---|
| **a- / an-** | without | **hyper-** | above, too much |
| **brady-** | slow | **hypo-** | below, too little |
| **tachy-** | fast | **dys-** | difficult, abnormal |
| **poly-** | many | **peri-** | around |
| **olig-** | few | **intra-** | within |

### Suffixes
| Suffix | Meaning | Example |
|---|---|---|
| **-itis** | inflammation | **hepatitis** = liver inflammation |
| **-ectomy** | surgical removal | **appendectomy** |
| **-otomy** | cutting into | **tracheotomy** |
| **-ostomy** | making an opening | **colostomy** |
| **-plasty** | repair | **rhinoplasty** |
| **-pathy** | disease | **neuropathy** |
| **-emia** | in the blood | **anaemia** |
| **-algia** | pain | **neuralgia** |
| **-scopy** | looking inside | **endoscopy** |

### Decode these
- **Tachycardia** = tachy (fast) + cardi (heart) + ia: a fast heart rate.
- **Hypoglycaemia** = hypo (low) + glyc (sugar) + aemia (blood): low blood sugar.
- **Dysphagia** = dys (difficult) + phagia (swallowing).
- **Nephrectomy** = nephr (kidney) + ectomy: removal of a kidney.
- **Oliguria** = olig (few) + uria (urine): low urine output.

> Tip: Break any new word into parts first, then check the meaning in a dictionary.
> Try it: What does "hyperkalaemia" mean? || Too much (hyper) potassium (kal) in the blood (aemia).', 900, 61, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 14: Metabolism, clinical skills and pharmacology'), 'Pharmacology basics', 'text', '## Pharmacokinetics: what the body does to the drug
{{flow Absorption > Distribution > Metabolism (mostly liver) > Excretion (mostly kidney)}}
| Step | Key points |
|---|---|
| **Absorption** | Route matters: IV is 100 percent available; oral drugs may undergo **first-pass metabolism** in the liver |
| **Distribution** | Blood flow, protein binding and lipid solubility decide where a drug goes |
| **Metabolism** | Liver **cytochrome P450** enzymes; some drugs speed up or block them |
| **Excretion** | Kidney filtration and secretion; dose must be reduced in kidney disease |

The **half-life** is the time for the drug level to fall by half. After about **5 half-lives** a drug is almost cleared, and a regular dose reaches a steady state in about 5 half-lives.

## Pharmacodynamics: what the drug does to the body
Drugs mostly act on **receptors**.
| Term | Meaning |
|---|---|
| **Agonist** | Activates a receptor (salbutamol on beta-2) |
| **Antagonist** | Blocks a receptor (propranolol on beta receptors, naloxone on opioid receptors) |
| **Enzyme inhibitor** | Blocks an enzyme (ACE inhibitors, statins, aspirin on COX) |
| **Ion channel blocker** | Changes electrical activity (calcium channel blockers) |

### Linking drugs to physiology
| Problem | Drug idea | Mechanism |
|---|---|---|
| High blood pressure | ACE inhibitor | Less angiotensin II, less vasoconstriction and aldosterone |
| Asthma attack | Salbutamol | Beta-2 agonist relaxes bronchial smooth muscle |
| Heart rate too fast | Beta blocker | Blocks sympathetic beta-1 effects on the heart |
| Fluid overload | Loop diuretic (furosemide) | Blocks Na-K-2Cl in the loop of Henle |
| Type 1 diabetes | Insulin | Replaces missing hormone |
| Pain and fever | Paracetamol, NSAIDs | Reduce prostaglandin effects |

### Safety
- Right patient, right drug, right dose, right route, right time.
- **Therapeutic index**: the gap between a useful dose and a toxic dose. Drugs with a narrow index (digoxin, warfarin, lithium) need blood tests.
- Always check **allergies**, other medicines, pregnancy and kidney and liver function.

> Careful: This course teaches how drugs link to physiology. It is not a prescribing guide. Doses must come from a current formulary or a qualified clinician.
> Try it: Why must some drug doses be lowered in kidney disease? || The kidney excretes the drug, so it builds up and can reach toxic levels.', 1080, 62, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 14 checkpoint quiz: Metabolism and clinical skills', 'Anatomy and Physiology', 'Check your understanding of this module.', '[{"prompt":"Where does most ATP in aerobic respiration form?","options":["Cytoplasm","Krebs cycle","Inner mitochondrial membrane","Nucleus"],"correct_index":2,"explanation":"Oxidative phosphorylation on the inner mitochondrial membrane."},{"prompt":"Which hormone dominates in the fed state?","options":["Glucagon","Cortisol","Insulin","Adrenaline"],"correct_index":2,"explanation":"Insulin promotes glucose uptake and storage."},{"prompt":"A normal resting adult heart rate is...","options":["30 to 50","60 to 100","100 to 140","120 to 160"],"correct_index":1,"explanation":"Normal is 60 to 100 beats per minute."},{"prompt":"pH 7.30, PaCO2 high. This is...","options":["Metabolic alkalosis","Respiratory acidosis","Respiratory alkalosis","Normal"],"correct_index":1,"explanation":"Low pH with raised CO2 is respiratory acidosis."},{"prompt":"What does the suffix -ectomy mean?","options":["Inflammation","Pain","Surgical removal","Looking inside"],"correct_index":2,"explanation":"Appendectomy is removal of the appendix."},{"prompt":"Which drug class lowers blood pressure by reducing angiotensin II?","options":["Beta-2 agonists","Loop diuretics","ACE inhibitors","Opioids"],"correct_index":2,"explanation":"ACE inhibitors block formation of angiotensin II."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 14 checkpoint quiz: Metabolism and clinical skills');
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 14: Metabolism, clinical skills and pharmacology'), 'Checkpoint quiz: Metabolism and clinical skills', 'quiz', (SELECT id FROM quizzes WHERE title='Module 14 checkpoint quiz: Metabolism and clinical skills'), 300, 63, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Anatomy and Physiology extension exam', 'Anatomy and Physiology', 'Fifteen questions across the new modules. Practice for the extension content.', '[{"prompt":"Which cell type is used for colour vision?","options":["Rods","Cones","Ganglion cells","Horizontal cells"],"correct_index":1,"explanation":"Cones, concentrated at the fovea, detect colour."},{"prompt":"Which structure converts sound vibrations into nerve signals?","options":["Tympanic membrane","Stapes","Hair cells of the cochlea","Semicircular canals"],"correct_index":2,"explanation":"Hair cells on the basilar membrane transduce vibration."},{"prompt":"How many thoracic vertebrae are there?","options":["7","12","5","9"],"correct_index":1,"explanation":"There are 12 thoracic vertebrae, each with ribs."},{"prompt":"Which muscle abducts the arm?","options":["Biceps","Pectoralis major","Deltoid","Triceps"],"correct_index":2,"explanation":"The deltoid abducts the arm and is supplied by the axillary nerve."},{"prompt":"Which nerve is compressed in carpal tunnel syndrome?","options":["Ulnar","Radial","Median","Musculocutaneous"],"correct_index":2,"explanation":"The median nerve passes through the carpal tunnel."},{"prompt":"Bone infection is called...","options":["Osteoporosis","Osteomyelitis","Osteoarthritis","Osteomalacia"],"correct_index":1,"explanation":"Osteomyelitis is infection of bone."},{"prompt":"Which tissue repairs by scar formation because it hardly regenerates?","options":["Epithelium","Bone","Cardiac muscle","Blood"],"correct_index":2,"explanation":"Cardiac muscle cells have very limited ability to divide."},{"prompt":"A woman with a family history of haemophilia A is a carrier. What is the chance that her son is affected?","options":["0 percent","50 percent","75 percent","100 percent"],"correct_index":1,"explanation":"X-linked recessive: each son has a 50 percent chance of receiving the affected X."},{"prompt":"Which germ layer forms the liver lining and gut?","options":["Ectoderm","Mesoderm","Endoderm","Neural crest"],"correct_index":2,"explanation":"Endoderm forms the lining of the gut and its glands."},{"prompt":"Which foetal vessel carries oxygenated blood?","options":["Umbilical arteries","Ductus arteriosus","Umbilical vein","Pulmonary vein"],"correct_index":2,"explanation":"The single umbilical vein brings oxygenated blood from the placenta."},{"prompt":"Which part of the cell makes the most ATP?","options":["Ribosome","Golgi apparatus","Mitochondrion","Lysosome"],"correct_index":2,"explanation":"Mitochondria carry out oxidative phosphorylation."},{"prompt":"Fasting blood glucose of 4.5 mmol/L is...","options":["Low","Normal","High","Diabetic"],"correct_index":1,"explanation":"The normal fasting range is about 3.9 to 5.6 mmol/L."},{"prompt":"What is the root meaning of \"nephr-\"?","options":["Liver","Lung","Kidney","Nerve"],"correct_index":2,"explanation":"Nephr- means kidney."},{"prompt":"What is a drug with a narrow therapeutic index?","options":["One that needs no blood tests","One where the toxic dose is close to the useful dose","One that works quickly","One that is cheap"],"correct_index":1,"explanation":"Examples: digoxin, warfarin, lithium."},{"prompt":"Which type of hearing loss is caused by wax or middle ear fluid?","options":["Sensorineural","Conductive","Central","Psychogenic"],"correct_index":1,"explanation":"Problems in the outer or middle ear cause conductive loss."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Anatomy and Physiology extension exam');
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 14: Metabolism, clinical skills and pharmacology'), 'Anatomy and Physiology extension exam', 'quiz', (SELECT id FROM quizzes WHERE title='Anatomy and Physiology extension exam'), 300, 64, 0);

UPDATE courses SET description = 'A complete medical-level course in human anatomy and physiology. Fourteen modules cover the body plan, the cell, skin, bone and muscle, the nervous and endocrine systems, the cardiovascular, respiratory, renal, digestive, immune and reproductive systems, then go deeper into the special senses (eye and ear), the skeleton, joints and muscles in detail, histology, genetics and embryology, metabolism, vital signs and lab values, medical terminology and basic pharmacology. Labelled anatomy pictures you can tap, diagrams, clinical correlations, quizzes and a final exam.', objectives = '["Describe the structure of every major organ system using correct anatomical terminology","Explain the physiology behind nerve signals, muscle contraction, circulation, breathing and kidney function","Explain how the eye and ear detect light and sound and how balance is controlled","Name the bones, major joints and muscle groups, and link nerve injuries to clinical signs","Recognise the four tissue types, basic genetics and the stages of embryonic and foetal development","Read normal vital signs, blood values and acid-base results","Decode medical terminology and link common drugs to the mechanisms they change","Use diagrams, labelled pictures and clinical cases to reason like a medical student"]', requirements = '["Secondary-school biology and chemistry","Willingness to draw and explain diagrams from memory","A notebook for medical vocabulary"]' WHERE slug = 'anatomy-physiology-medical';
