-- Anatomy and Physiology (Medical Level): course, modules, lessons, quizzes and final exam.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-anatomy-physiology-seed.sql
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES ('Medicine & Health','medicine-health','fa-solid fa-stethoscope');

INSERT OR IGNORE INTO courses (title, slug, description, thumbnail_url, category_id, level, age_range, language, objectives, requirements, price, is_free, certificate_enabled, published)
VALUES ('Anatomy and Physiology (Medical Level)', 'anatomy-physiology-medical', 'A complete first-year medical-level course in human anatomy and physiology. Ten modules cover the body plan, the cell, skin, bone and muscle, the nervous and endocrine systems, the cardiovascular, respiratory, renal, digestive, immune and reproductive systems, with 15 labelled diagrams, clinical correlations, quizzes and a final exam.', 'images/anatomy-physiology-course.svg', (SELECT id FROM course_categories WHERE slug='medicine-health'), 'advanced', '16+', 'English', '["Describe the structure of every major organ system using correct anatomical terminology", "Explain the physiology behind nerve signals, muscle contraction, circulation, breathing and kidney function", "Read and interpret normal ECG, lung volume and acid-base data", "Link normal mechanisms to common diseases and drug actions", "Use diagrams and clinical cases to reason like a medical student"]', '["Secondary-school biology and chemistry", "Willingness to draw and explain diagrams from memory"]', 0, 1, 1, 1);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 1: Foundations of the human body', 1);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'The language of anatomy', 'text', '## Why a shared language matters
Medicine runs on precise words. "Above the heart" means nothing; **superior to the heart** means one thing to every clinician in the world.

### Levels of organisation
{{flow Chemicals > Cells > Tissues > Organs > Organ systems > Organism}}

### Anatomical position
The body stands upright, facing forward, feet together, arms at the sides with palms facing **forward**. Every directional term assumes this position, even if the patient is lying down.

### Directional terms
| Term | Meaning | Example |
|---|---|---|
| Superior / Inferior | toward the head / toward the feet | The heart is superior to the diaphragm |
| Anterior (ventral) / Posterior (dorsal) | front / back | The sternum is anterior to the heart |
| Medial / Lateral | toward / away from the midline | The ulna is medial to the radius |
| Proximal / Distal | nearer to / farther from the attachment (limbs) | The elbow is proximal to the wrist |
| Superficial / Deep | nearer to / farther from the surface | Skin is superficial to muscle |

### Planes of section
{{anat planes}}

- **Sagittal**: left and right parts (a *midsagittal* cut gives equal halves).
- **Coronal (frontal)**: anterior and posterior parts.
- **Transverse (axial)**: superior and inferior parts. CT scans are usually shown as transverse slices.

> Real life: A CT slice is viewed as if you are standing at the patient''s feet looking up. The patient''s **right is on the left of the image**.
> Try it: A cut that separates the body into front and back halves is in which plane? || The coronal (frontal) plane.', 720, 1, 1);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'Body cavities and serous membranes', 'text', '## Two major cavities
{{anat cavities}}

- **Dorsal cavity**: cranial cavity (brain) and vertebral canal (spinal cord).
- **Ventral cavity**: thoracic cavity and abdominopelvic cavity, separated by the **diaphragm**.

### Thoracic cavity
It contains two **pleural cavities** (lungs) and the **mediastinum** (heart in its pericardial sac, great vessels, trachea, oesophagus, thymus).

### Serous membranes
Each organ is wrapped in a thin double layer with a film of fluid between the layers, so organs can move without friction.
| Membrane | Visceral layer covers | Parietal layer lines |
|---|---|---|
| Pleura | lung | thoracic wall |
| Pericardium | heart | pericardial sac |
| Peritoneum | abdominal organs | abdominal wall |

> Key idea: Organs are **intraperitoneal** (wrapped by peritoneum, e.g. stomach, liver) or **retroperitoneal** (behind it, e.g. kidneys, pancreas, aorta). Remember it as SAD PUCKER: Suprarenal glands, Aorta/IVC, Duodenum (2nd to 4th parts), Pancreas, Ureters, Colon (ascending and descending), Kidneys, Esophagus, Rectum.

> Real life: In **pneumothorax**, air enters the pleural cavity and the lung collapses. In **pericardial tamponade**, fluid fills the pericardial sac and compresses the heart, so it cannot fill.
> Try it: Which membrane directly covers the surface of the lung? || The visceral pleura.', 720, 2, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'The cell and membrane transport', 'text', '## The cell in one picture
Every cell has a **plasma membrane**, a **nucleus** (DNA, gene control), **mitochondria** (ATP by oxidative phosphorylation), **rough ER** (protein synthesis), **smooth ER** (lipids, detoxification), **Golgi** (modify and package), **lysosomes** (digestion) and a **cytoskeleton** (shape, transport, division).

### The membrane
{{anat membrane}}

The **phospholipid bilayer** is a barrier to water-soluble substances. Proteins form channels, carriers, receptors and pumps.

### Ways to cross
| Process | Energy? | Direction | Example |
|---|---|---|---|
| Simple diffusion | No | down gradient | O₂, CO₂, steroids |
| Facilitated diffusion | No | down gradient | glucose via GLUT4 |
| Primary active transport | ATP | against gradient | Na⁺/K⁺-ATPase |
| Secondary active transport | indirect (uses Na⁺ gradient) | against gradient | SGLT2 in the kidney |
| Endocytosis / exocytosis | ATP | bulk | neurotransmitter release |

> Key idea: The **Na⁺/K⁺ pump** moves **3 Na⁺ out and 2 K⁺ in** per ATP. It creates the gradients that power nerve signals, muscle contraction and nutrient absorption.

### Osmosis and tonicity
Water moves toward the side with more solute. A cell in **isotonic** fluid (0.9% saline) keeps its size, in **hypotonic** fluid it swells, in **hypertonic** fluid it shrinks.

> Real life: Giving a patient pure water intravenously would burst red blood cells. This is why IV fluids are isotonic.
> Try it: Which ion is mainly INSIDE cells and which OUTSIDE? || K⁺ is high inside; Na⁺ (and Cl⁻, Ca²⁺) are high outside.', 960, 3, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'Tissues and homeostasis', 'text', '## The four tissue types
| Tissue | Job | Examples |
|---|---|---|
| Epithelial | covers surfaces, lines cavities, forms glands | skin, gut lining, alveoli |
| Connective | supports, connects, stores | bone, blood, cartilage, fat, tendons |
| Muscle | contracts | skeletal, cardiac, smooth |
| Nervous | communicates with electrical signals | neurons, glia |

> Key idea: Epithelia are named by **layers** (simple, stratified) and **shape** (squamous, cuboidal, columnar). Simple squamous suits gas exchange (alveoli); stratified squamous suits protection (skin, oesophagus).

## Homeostasis
**Homeostasis** is keeping the internal environment within narrow limits (temperature 37 °C, pH 7.4, glucose about 5 mmol/L).

### Negative feedback
The response **reverses** the change. This is how almost everything is regulated.
{{cycle Stimulus: body temperature rises > Sensor: skin and hypothalamus > Control centre: hypothalamus > Effector: sweating, vasodilation > Temperature falls}}

### Positive feedback
The response **amplifies** the change until an endpoint. Examples: **labour** (stretch of the cervix, oxytocin, stronger contractions), **blood clotting** and the **upstroke of the action potential**.

> Real life: **Fever** is not failure of homeostasis; the hypothalamic set point is raised by pyrogens. **Heat stroke** is failure of the negative feedback loop.
> Try it: Is oxytocin release during labour positive or negative feedback? || Positive feedback: contractions cause more oxytocin, which causes more contractions, until delivery.', 840, 4, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 1 checkpoint quiz: Foundations of the human body', 'Anatomy and Physiology', 'Check your understanding of foundations of the human body.', '[{"prompt": "Which plane divides the body into superior and inferior parts?", "options": ["Sagittal", "Coronal", "Transverse", "Oblique"], "correct_index": 2, "explanation": "The transverse (axial) plane is horizontal, giving superior and inferior parts."}, {"prompt": "The kidneys are best described as:", "options": ["Intraperitoneal", "Retroperitoneal", "Within the pleural cavity", "Within the mediastinum"], "correct_index": 1, "explanation": "They lie behind the peritoneum."}, {"prompt": "The Na⁺/K⁺ pump moves:", "options": ["2 Na⁺ out, 3 K⁺ in", "3 Na⁺ out, 2 K⁺ in", "3 Na⁺ in, 2 K⁺ out", "Na⁺ and K⁺ in the same direction"], "correct_index": 1, "explanation": "3 Na⁺ out and 2 K⁺ in per ATP."}, {"prompt": "Which of these is positive feedback?", "options": ["Baroreceptor reflex", "Shivering in the cold", "Oxytocin during labour", "Insulin lowering glucose"], "correct_index": 2, "explanation": "Oxytocin and contractions reinforce each other until delivery."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 1 checkpoint quiz: Foundations of the human body');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 1: Foundations of the human body'), 'Checkpoint quiz: Foundations of the human body', 'quiz', (SELECT id FROM quizzes WHERE title='Module 1 checkpoint quiz: Foundations of the human body'), 300, 5, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 2: Skin, bone and muscle', 2);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 2: Skin, bone and muscle'), 'The skin (integumentary system)', 'text', '## Three layers
{{stack Epidermis (keratinised stratified squamous) | Dermis (collagen, vessels, nerves, glands) | Hypodermis (fat, insulation)}}

### Epidermis (outer to inner)
Stratum **corneum** (dead keratinised cells), **lucidum** (thick skin only), **granulosum**, **spinosum**, **basale** (stem cells and **melanocytes**). A cell takes about 4 weeks to travel from basale to the surface.

### Dermis
**Papillary layer** (loose, capillaries, touch receptors, fingerprints) and **reticular layer** (dense collagen, sweat and sebaceous glands, hair follicles).

### Functions
Protection (barrier, UV), thermoregulation (sweat, blood flow), sensation, **vitamin D synthesis**, water-loss prevention.

### Burns
| Depth | Layers involved | Feel |
|---|---|---|
| Superficial (1st degree) | epidermis | red, painful, no blisters |
| Partial thickness (2nd) | into dermis | blisters, very painful |
| Full thickness (3rd) | through dermis | white or charred, painless (nerves destroyed) |

> Real life: Burn size is estimated by the **rule of nines**. Fluid loss from large burns causes hypovolaemic shock, so early IV fluids are vital.
> Try it: Which cells give skin its colour and where are they? || Melanocytes, in the stratum basale.', 720, 6, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 2: Skin, bone and muscle'), 'Bone: structure, growth and calcium', 'text', '## Why bone is clever
Bone is **living tissue**: a hard mineral (calcium hydroxyapatite) for strength plus collagen for flexibility. It is also the body''s **calcium store**.

### Structure of a long bone
**Diaphysis** (shaft, medullary cavity), **epiphyses** (ends, covered by articular cartilage), **metaphysis** (contains the **growth plate** in children), **periosteum** (outer covering) and **endosteum** (inner lining).
Compact bone is built from **osteons** (Haversian systems). Spongy (trabecular) bone holds red marrow.

### The three bone cells
| Cell | Job |
|---|---|
| Osteoblast | builds new bone matrix |
| Osteocyte | mature cell; senses stress, maintains bone |
| Osteoclast | resorbs bone, releasing Ca²⁺ |

### Calcium control
{{flow Plasma Ca²⁺ falls > Parathyroid glands release PTH > PTH activates osteoclasts, kidney keeps Ca²⁺, makes active vitamin D > Plasma Ca²⁺ rises > PTH switches off}}

**Calcitonin** (thyroid) lowers Ca²⁺ but is minor in adults.

### Ossification and healing
**Intramembranous**: flat skull bones form directly. **Endochondral**: most bones form from a cartilage model. Fractures heal through haematoma, soft callus, hard callus and remodelling.

> Real life: **Osteoporosis** is bone resorption outpacing formation (post-menopausal oestrogen loss). **Rickets/osteomalacia** come from vitamin D deficiency, so new bone does not mineralise.
> Try it: Which cell removes bone? || The osteoclast.', 960, 7, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 2: Skin, bone and muscle'), 'Joints', 'text', '## Classifying joints
| Type | Movement | Example |
|---|---|---|
| Fibrous | almost none | skull sutures |
| Cartilaginous | slight | intervertebral discs, pubic symphysis |
| Synovial | free | knee, hip, shoulder |

### Synovial joint anatomy
A **joint capsule** encloses a cavity filled with **synovial fluid** (secreted by the synovial membrane) which lubricates and nourishes the **articular cartilage**. Ligaments connect bone to bone; **bursae** cushion friction points.

{{mind Synovial joint | Articular cartilage | Synovial fluid | Capsule | Ligaments | Bursae}}

### Types of synovial joint
- **Ball and socket**: hip, shoulder (widest range).
- **Hinge**: elbow, knee (flexion and extension).
- **Pivot**: atlas on axis (rotation of the head).
- **Gliding, saddle, condyloid**: wrist, thumb base, knuckles.

> Real life: **Osteoarthritis** is wear of articular cartilage. **Rheumatoid arthritis** is an autoimmune attack on the synovial membrane. The anterior cruciate ligament (ACL) stops the tibia sliding forward on the femur.
> Try it: Which fluid lubricates a synovial joint? || Synovial fluid.', 600, 8, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 2: Skin, bone and muscle'), 'Skeletal muscle and the sliding filament', 'text', '## From muscle to molecule
Muscle, fascicle, **muscle fibre** (one multinucleate cell), **myofibril**, **sarcomere**, the repeating contractile unit between two **Z lines**.

{{anat sarcomere}}

### Sliding filament theory
Myosin heads pull thin actin filaments toward the M line. Filaments do not shorten; they **slide**.

### Excitation to contraction
{{flow Motor neuron fires > ACh released at the neuromuscular junction > Muscle action potential spreads down T-tubules > Ca²⁺ released from sarcoplasmic reticulum > Ca²⁺ binds troponin, tropomyosin moves > Myosin binds actin, power stroke (ATP) > Ca²⁺ pumped back, muscle relaxes}}

### Cross-bridge cycle
Myosin binds actin, **power stroke**, **ATP binds** so myosin releases, ATP is hydrolysed so the head re-cocks. **No ATP = no release = rigor mortis.**

### Fibre types
| | Type I (slow oxidative) | Type IIa | Type IIx (fast glycolytic) |
|---|---|---|---|
| Speed | slow | fast | fastest |
| Fatigue | resistant | moderate | fatigues quickly |
| Fuel | oxidative | both | glycolysis |
| Example | postural, marathon | | sprint |

> Key idea: A **motor unit** is one motor neuron plus all the fibres it supplies. Force increases by **recruiting** more units (size principle: small units first).

> Real life: In **myasthenia gravis**, antibodies block acetylcholine receptors, causing fatigable weakness. **Botulinum toxin** blocks ACh release.
> Try it: What does Ca²⁺ bind to in skeletal muscle to start contraction? || Troponin C, which moves tropomyosin off the myosin-binding sites on actin.', 1200, 9, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 2 checkpoint quiz: Skin, bone and muscle', 'Anatomy and Physiology', 'Check your understanding of skin, bone and muscle.', '[{"prompt": "Which cell type resorbs bone?", "options": ["Osteoblast", "Osteocyte", "Osteoclast", "Chondrocyte"], "correct_index": 2, "explanation": "Osteoclasts break down bone matrix."}, {"prompt": "PTH raises plasma calcium by all of these EXCEPT:", "options": ["Activating osteoclasts", "Reducing renal Ca²⁺ loss", "Increasing active vitamin D", "Depositing calcium in bone"], "correct_index": 3, "explanation": "PTH mobilises calcium from bone; it does not deposit it."}, {"prompt": "During contraction the sarcomere shows:", "options": ["Shorter thick filaments", "Shorter A band", "Shorter I band and H zone", "Longer Z-to-Z distance"], "correct_index": 2, "explanation": "Filaments slide; A band length stays constant."}, {"prompt": "Rigor mortis occurs because:", "options": ["Ca²⁺ rises", "No ATP to detach myosin from actin", "Too much ACh", "Troponin breaks"], "correct_index": 1, "explanation": "ATP is needed for detachment."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 2 checkpoint quiz: Skin, bone and muscle');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 2: Skin, bone and muscle'), 'Checkpoint quiz: Skin, bone and muscle', 'quiz', (SELECT id FROM quizzes WHERE title='Module 2 checkpoint quiz: Skin, bone and muscle'), 300, 10, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 3: The nervous system', 3);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Neurons and glia', 'text', '## The neuron
{{anat neuron}}

- **Dendrites** receive; the **soma** integrates; the **axon hillock** is where action potentials start; the **axon** conducts; **terminals** release neurotransmitter.
- **Myelin** insulates the axon; **nodes of Ranvier** are gaps where the signal "jumps" (**saltatory conduction**), making it about 50 times faster.

### Glial cells
| Cell | Location | Job |
|---|---|---|
| Astrocyte | CNS | supports blood-brain barrier, K⁺ buffering, scar |
| Oligodendrocyte | CNS | myelinates several axons |
| Schwann cell | PNS | myelinates one axon segment; helps regeneration |
| Microglia | CNS | resident immune cells |
| Ependymal cell | ventricles | makes and moves CSF |

> Real life: **Multiple sclerosis** is autoimmune loss of CNS myelin (oligodendrocytes). **Guillain-Barré syndrome** damages PNS myelin, causing ascending weakness.
> Try it: Which cell myelinates axons in the brain? || The oligodendrocyte.', 720, 11, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Membrane potentials and the action potential', 'text', '## Resting membrane potential
Neurons rest at about **-70 mV** (inside negative). Three things create it: the Na⁺/K⁺ pump, **K⁺ leak channels** (K⁺ leaves, taking positive charge), and negatively charged proteins trapped inside. The resting membrane is far more permeable to K⁺ than Na⁺, so the potential sits near E_K (about -90 mV).

## The action potential
{{anat actionpotential}}

1. A stimulus depolarises the membrane to **threshold** (about -55 mV).
2. **Voltage-gated Na⁺ channels** open: Na⁺ rushes in (positive feedback).
3. At the peak (+30 mV) Na⁺ channels **inactivate** and **K⁺ channels** open: K⁺ flows out.
4. **Hyperpolarisation**: K⁺ channels close slowly; the pump restores the gradients.

> Key idea: **All-or-none.** If threshold is reached the spike is always the same size. Stronger stimuli give a higher **frequency**, not a bigger spike.

### Refractory periods
- **Absolute**: Na⁺ channels inactivated; no second spike is possible. This makes the signal travel **one way**.
- **Relative**: a stronger-than-normal stimulus can fire it.

> Real life: **Local anaesthetics** (lidocaine) block voltage-gated Na⁺ channels. **Hyperkalaemia** depolarises resting membranes and is dangerous for the heart.
> Try it: What causes the falling phase of the action potential? || Na⁺ channel inactivation and opening of voltage-gated K⁺ channels, so K⁺ leaves.', 1080, 12, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Synapses and neurotransmitters', 'text', '## The chemical synapse
{{anat synapse}}

### Effect on the next cell
- **EPSP** (excitatory): Na⁺ in, depolarises, closer to threshold (glutamate).
- **IPSP** (inhibitory): Cl⁻ in or K⁺ out, hyperpolarises (GABA, glycine).
- A neuron adds up (**summates**) thousands of inputs; if the total reaches threshold at the hillock it fires.

### Key neurotransmitters
| Transmitter | Main role | Clinical link |
|---|---|---|
| Acetylcholine | neuromuscular junction, parasympathetic, memory | myasthenia gravis; Alzheimer''s treatment (cholinesterase inhibitors) |
| Glutamate | main CNS excitatory | stroke excitotoxicity |
| GABA | main CNS inhibitory | benzodiazepines enhance GABA-A |
| Dopamine | movement, reward | Parkinson''s (loss in substantia nigra) |
| Serotonin | mood, sleep | SSRIs |
| Noradrenaline | sympathetic, alertness | beta-blockers act at its receptors |

> Key idea: Transmitter action is ended by **reuptake**, **enzymatic breakdown** (acetylcholinesterase) or diffusion. Many drugs act by blocking one of these steps.
> Try it: Name the main inhibitory transmitter in the brain. || GABA.', 840, 13, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'The central nervous system', 'text', '## Brain organisation
| Region | Main functions |
|---|---|
| Frontal lobe | planning, personality, voluntary movement (motor cortex), speech production (Broca''s) |
| Parietal lobe | somatosensory cortex, spatial awareness |
| Temporal lobe | hearing, memory, speech comprehension (Wernicke''s) |
| Occipital lobe | vision |
| Cerebellum | coordination, balance, motor learning |
| Basal ganglia | initiation and smoothing of movement |
| Thalamus | relay station for sensation |
| Hypothalamus | homeostasis, hormones, temperature, hunger |
| Brainstem (midbrain, pons, medulla) | breathing, heart rate, consciousness, cranial nerves |

### Major spinal tracts
- **Dorsal columns**: fine touch, vibration, proprioception (cross in the medulla).
- **Spinothalamic**: pain and temperature (cross in the spinal cord).
- **Corticospinal**: voluntary movement (cross in the medulla).

> Real life: A **left-hemisphere stroke** causes **right-sided** weakness and may cause aphasia, because motor fibres cross.

### Protection
Skull, **meninges** (dura, arachnoid, pia), **CSF** (made by choroid plexus, about 500 mL/day, total volume about 150 mL) and the **blood-brain barrier**.

> Real life: Blood supply is via the internal carotid and vertebral arteries joined at the **circle of Willis**. A lumbar puncture samples CSF below the end of the spinal cord (L3-L4), which avoids cord injury.
> Try it: Which tract carries pain and temperature? || The spinothalamic tract.', 1080, 14, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Peripheral and autonomic nervous system, reflexes', 'text', '## Reflex arc
{{anat reflex}}

The **knee-jerk (stretch) reflex** is monosynaptic: sensory neuron synapses directly on the motor neuron. Most reflexes also involve interneurons.

## The autonomic nervous system (ANS)
Controls involuntary effectors: heart, smooth muscle and glands.
| | Sympathetic ("fight or flight") | Parasympathetic ("rest and digest") |
|---|---|---|
| Origin | thoracolumbar (T1-L2) | craniosacral (CN III, VII, IX, X; S2-S4) |
| Pre-ganglionic fibre | short, ACh | long, ACh |
| Post-ganglionic fibre | long, **noradrenaline** | short, **ACh** |
| Heart | rate and force ↑ | rate ↓ |
| Pupil | dilates | constricts |
| Gut | motility ↓ | motility ↑ |
| Airways | dilate (β₂) | constrict |

> Key idea: The **vagus nerve (CN X)** carries most parasympathetic outflow. Sweat glands are sympathetic but use ACh, an exception to the rule.

> Real life: **Salbutamol** is a β₂-agonist that opens airways in asthma; **atropine** blocks muscarinic receptors to raise a slow heart rate.
> Try it: Which neurotransmitter do post-ganglionic sympathetic fibres release? || Noradrenaline (except to sweat glands, which get ACh).', 960, 15, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 3 checkpoint quiz: The nervous system', 'Anatomy and Physiology', 'Check your understanding of the nervous system.', '[{"prompt": "Saltatory conduction occurs at:", "options": ["Dendrites", "Nodes of Ranvier", "Synaptic cleft", "The soma"], "correct_index": 1, "explanation": "The action potential jumps between nodes."}, {"prompt": "The absolute refractory period is due to:", "options": ["K⁺ channel opening", "Na⁺ channel inactivation", "Calcium entry", "Reuptake"], "correct_index": 1, "explanation": "Inactivated Na⁺ channels cannot reopen immediately."}, {"prompt": "Loss of dopamine neurons in the substantia nigra causes:", "options": ["Alzheimer''s disease", "Parkinson''s disease", "Myasthenia gravis", "Epilepsy"], "correct_index": 1, "explanation": "Parkinson''s disease."}, {"prompt": "Pain and temperature travel in the:", "options": ["Dorsal columns", "Spinothalamic tract", "Corticospinal tract", "Spinocerebellar tract"], "correct_index": 1, "explanation": "Spinothalamic tract."}, {"prompt": "The main parasympathetic nerve is the:", "options": ["Phrenic", "Vagus", "Sciatic", "Radial"], "correct_index": 1, "explanation": "Vagus (CN X)."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 3 checkpoint quiz: The nervous system');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Checkpoint quiz: The nervous system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 3 checkpoint quiz: The nervous system'), 300, 16, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 4: The endocrine system', 4);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 4: The endocrine system'), 'Hormones and how they signal', 'text', '## Chemical messengers
A **hormone** is released into blood and acts on distant target cells that have the right **receptor**.

### Three chemical classes
| Class | Examples | Receptor | Notes |
|---|---|---|---|
| Peptide / protein | insulin, GH, ADH, oxytocin | cell surface (second messengers: cAMP, IP₃) | water-soluble, travel free, fast |
| Steroid | cortisol, aldosterone, oestrogen, testosterone | inside the cell, change gene expression | lipid-soluble, carried on proteins, slower, longer |
| Amine | adrenaline, thyroid hormones (T3, T4) | adrenaline: surface; thyroid: nuclear | thyroid acts like a steroid |

### Control by feedback
Most hormones are controlled by **negative feedback**: the product switches off its own release.
{{cycle Low blood Ca²⁺ > Parathyroid releases PTH > Bone, kidney and gut raise Ca²⁺ > Blood Ca²⁺ rises > PTH release switches off}}

> Key idea: A hormone''s effect depends on its **receptor**. The same hormone can do different things in different tissues (adrenaline dilates muscle vessels but constricts skin vessels).

> Real life: **Cushing''s syndrome** is too much cortisol; **Addison''s disease** is too little. Both can be traced to which part of the feedback loop has failed.
> Try it: Why can steroid hormones act slowly but for a long time? || They alter gene transcription and are carried bound to proteins in blood.', 720, 17, 0);
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
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'The cardiac cycle and cardiac output', 'text', '## One heartbeat
{{cycle Ventricular filling (diastole) > Isovolumetric contraction > Ejection (systole) > Isovolumetric relaxation}}

- **Diastole**: AV valves open, ventricles fill (atrial contraction adds the final 20%).
- **Isovolumetric contraction**: all valves closed, pressure rises (S1).
- **Ejection**: pressure exceeds the aorta, aortic valve opens, blood leaves.
- **Isovolumetric relaxation**: pressure falls, aortic valve closes (S2).

## Cardiac output
{{stack Cardiac output (CO) = HR × SV | Stroke volume = EDV - ESV | Ejection fraction = SV / EDV}}

Typical: HR 70 × SV 70 mL = about **5 L/min**. Typical EDV 120 mL, ESV 50 mL, so **EF about 58%**.

### What controls stroke volume?
- **Preload**: end-diastolic stretch. **Frank-Starling law**: more filling gives a stronger beat (up to a limit).
- **Afterload**: pressure the ventricle must beat against (aortic pressure).
- **Contractility**: strength at a given preload (sympathetic stimulation, calcium).

> Real life: In **heart failure with reduced EF** (below about 40%), contractility is poor. **Aortic stenosis** raises afterload; **hypertension** also raises afterload over years, thickening the ventricle.
> Try it: HR is 80/min and SV is 60 mL. What is the cardiac output? || 80 × 60 = 4800 mL/min = 4.8 L/min.', 1080, 23, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Blood vessels, blood pressure and circulation', 'text', '## The circuit
{{anat circulation}}

### Vessel types
| Vessel | Wall | Role |
|---|---|---|
| Elastic arteries (aorta) | lots of elastin | recoil keeps flow going in diastole |
| Arterioles | thick smooth muscle | **resistance vessels**: control blood pressure and local flow |
| Capillaries | one cell thick | exchange of gases, nutrients, waste |
| Veins | thin, valves | **capacitance vessels**: hold about 65% of blood volume |

### Blood pressure
{{stack MAP = CO × TPR | MAP ≈ diastolic + one third of pulse pressure | Normal about 120/80 mmHg, MAP about 93}}

**Baroreceptor reflex** (carotid sinus and aortic arch): a fall in pressure causes less firing to the medulla, which increases sympathetic output and decreases vagal output, so HR, contractility and vasoconstriction rise and pressure is restored.

### Capillary exchange (Starling forces)
Hydrostatic pressure pushes fluid **out** at the arteriolar end; oncotic pressure (plasma proteins) pulls fluid **back** at the venous end. Excess is returned by **lymphatics**.

> Real life: **Oedema** results from raised capillary pressure (heart failure), low albumin (liver or kidney disease), leaky capillaries (inflammation) or lymphatic block.
> Try it: Which vessels contribute most to total peripheral resistance? || Arterioles.', 1080, 24, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Blood and haemostasis', 'text', '## Composition
| Component | Normal | Job |
|---|---|---|
| Plasma (55%) | water, proteins (albumin), electrolytes | transport, oncotic pressure |
| Red cells | 4.5-5.5 × 10¹²/L, live about 120 days | O₂ and CO₂ transport (haemoglobin) |
| White cells | 4-11 × 10⁹/L | defence |
| Platelets | 150-400 × 10⁹/L | clotting |
Haematocrit is about 40-50% (men) and 36-44% (women). All cells come from **haematopoietic stem cells** in red marrow; **erythropoietin** (kidney) drives red cell production when oxygen is low.

## Haemostasis in three steps
{{flow Vessel injury > Vasoconstriction > Platelet plug (adhesion via von Willebrand factor, aggregation) > Coagulation cascade makes fibrin mesh > Clot > Fibrinolysis by plasmin}}

### Coagulation
- **Extrinsic** pathway (tissue factor, factor VII) and **intrinsic** pathway (factor XII) both activate **factor X**.
- Common pathway: X → **thrombin** (IIa) → fibrinogen becomes **fibrin**.
- **Vitamin K** is needed for factors II, VII, IX, X.

| Drug | Mechanism | Monitor |
|---|---|---|
| Warfarin | blocks vitamin K recycling | INR |
| Heparin | boosts antithrombin | aPTT |
| Aspirin | blocks platelet thromboxane | none routinely |

> Real life: **Haemophilia A** is factor VIII deficiency (X-linked). Anaemia is low haemoglobin: iron deficiency gives small (microcytic) red cells.
> Try it: Which vitamin is needed to make clotting factors II, VII, IX and X? || Vitamin K.', 960, 25, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 5 checkpoint quiz: The cardiovascular system', 'Anatomy and Physiology', 'Check your understanding of the cardiovascular system.', '[{"prompt": "Which valve is between the right ventricle and pulmonary artery?", "options": ["Tricuspid", "Mitral", "Pulmonary", "Aortic"], "correct_index": 2, "explanation": "Pulmonary (semilunar) valve."}, {"prompt": "The normal delay of the impulse occurs in the:", "options": ["SA node", "AV node", "Purkinje fibres", "Bundle branches"], "correct_index": 1, "explanation": "AV node."}, {"prompt": "HR 75/min and SV 80 mL gives a cardiac output of:", "options": ["4 L/min", "5 L/min", "6 L/min", "7.5 L/min"], "correct_index": 2, "explanation": "75 × 80 = 6000 mL/min."}, {"prompt": "Which vessels are the main site of resistance?", "options": ["Aorta", "Arterioles", "Capillaries", "Veins"], "correct_index": 1, "explanation": "Arterioles."}, {"prompt": "Warfarin is monitored using:", "options": ["aPTT", "INR", "Platelet count", "D-dimer"], "correct_index": 1, "explanation": "INR (prothrombin time)."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 5 checkpoint quiz: The cardiovascular system');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Checkpoint quiz: The cardiovascular system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 5 checkpoint quiz: The cardiovascular system'), 300, 26, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 6: The respiratory system', 6);
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

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 6: The respiratory system'), 'Checkpoint quiz: The respiratory system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 6 checkpoint quiz: The respiratory system'), 300, 31, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 7: The renal system', 7);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'The kidney and the nephron', 'text', '## Anatomy
Two kidneys sit **retroperitoneally** at T12-L3. They receive about **20-25% of cardiac output** (about 1.2 L/min). Urine flows: **renal pelvis, ureter, bladder, urethra**.

Each kidney has about **1 million nephrons**, the functional units: **renal corpuscle** (glomerulus and Bowman''s capsule) and **tubule**.

{{anat nephron}}

### Functions
Regulate water and electrolytes, excrete waste (urea, creatinine, drugs), control acid-base balance, make **erythropoietin**, activate **vitamin D**, release **renin**.

### The filtration barrier
Fenestrated capillary endothelium, **basement membrane** (negatively charged) and **podocytes** (filtration slits). It blocks cells and most proteins, so urine normally has almost no protein.

> Real life: **Glomerulonephritis** damages the barrier. Large protein loss (**nephrotic syndrome**: oedema, low albumin) or blood in urine (**nephritic syndrome**) are two classic patterns.
> Try it: Which cells form the final layer of the filtration barrier? || Podocytes (foot processes with filtration slits).', 960, 32, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'Glomerular filtration and GFR', 'text', '## Filtration
Blood pressure in the glomerulus pushes fluid into Bowman''s space.

### Starling forces (mmHg, approximate)
| Force | Value | Direction |
|---|---|---|
| Glomerular capillary hydrostatic pressure | 55 | out (favours filtration) |
| Bowman''s space hydrostatic pressure | 15 | in (opposes) |
| Glomerular oncotic pressure | 30 | in (opposes) |
| **Net filtration pressure** | **about 10** | out |

**GFR** is about **125 mL/min** (180 L/day). More than 99% is reabsorbed, so urine is about 1-2 L/day.

### Autoregulation
Within a wide pressure range (about 80-180 mmHg) the kidney keeps GFR steady by the **myogenic response** and **tubuloglomerular feedback** (macula densa sensing NaCl delivery).

### Clearance
{{stack Clearance = (Urine conc × urine flow) / Plasma conc | Inulin clearance = GFR | Creatinine clearance ≈ GFR}}

Substances freely filtered and neither reabsorbed nor secreted (inulin) measure GFR. Creatinine is used clinically; **eGFR** is estimated from serum creatinine, age and sex.

> Real life: **Chronic kidney disease** staging uses eGFR. In **dehydration** or NSAID use, afferent arteriole constriction lowers GFR (acute kidney injury).
> Try it: If GFR is 125 mL/min, how much filtrate forms per day? || 125 × 1440 = 180 000 mL = 180 L.', 960, 33, 0);
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

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 7: The renal system'), 'Checkpoint quiz: The renal system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 7 checkpoint quiz: The renal system'), 300, 36, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 8: The digestive system', 8);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 8: The digestive system'), 'Organisation of the gut', 'text', '## The tract
{{anat gi}}

### Wall layers (from lumen outward)
**Mucosa** (epithelium, lamina propria, muscularis mucosae), **submucosa** (contains the **submucosal plexus**), **muscularis externa** (circular and longitudinal; **myenteric plexus**) and **serosa**.

The **enteric nervous system** (the "gut brain") controls motility and secretion on its own, modified by the vagus and sympathetic nerves.

### Motility
- **Peristalsis**: propulsive waves.
- **Segmentation**: mixing in the small intestine.
- **Migrating motor complex**: housekeeping wave between meals.

### Regulating hormones
| Hormone | From | Effect |
|---|---|---|
| Gastrin | stomach G cells | acid secretion ↑ |
| Secretin | duodenum | pancreatic HCO₃⁻ ↑ |
| CCK | duodenum | gallbladder contracts, pancreatic enzymes ↑ |
| Ghrelin | stomach | hunger |

> Real life: **Hirschsprung disease** is absence of enteric ganglia in the distal bowel: it cannot relax, causing obstruction in a newborn.
> Try it: Which plexus lies between the two muscle layers? || The myenteric (Auerbach''s) plexus.', 840, 37, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 8: The digestive system'), 'Digestion and absorption', 'text', '## Digestion by region
| Site | Secretion | Action |
|---|---|---|
| Mouth | salivary amylase | starch begins |
| Stomach | HCl (parietal), pepsin (chief), intrinsic factor, mucus | protein begins; kills microbes; IF for vitamin B₁₂ |
| Small intestine | pancreatic amylase, lipase, proteases; bile; brush border enzymes | most digestion |
| Large intestine | none significant | water and electrolytes absorbed; bacteria make vitamin K |

### Absorption
The **duodenum and jejunum** absorb most nutrients; the **terminal ileum** absorbs **vitamin B₁₂ and bile salts**. The surface area is enormously increased by folds, villi and microvilli.

{{flow Carbohydrate > Monosaccharides absorbed by SGLT1 and GLUT > Portal vein > Liver}}

| Nutrient | Broken into | Route to blood |
|---|---|---|
| Carbohydrate | glucose, galactose, fructose | portal vein |
| Protein | amino acids, small peptides | portal vein |
| Fat | fatty acids and monoglycerides, **micelles**, rebuilt as **chylomicrons** | **lymphatics** (lacteals), then blood |

> Key idea: Fat is the exception: chylomicrons are too large for capillaries, so they enter **lacteals** and bypass the liver at first.

> Real life: **Coeliac disease** flattens villi (gluten reaction), causing malabsorption. Removal of the terminal ileum causes B₁₂ deficiency. **Lactose intolerance** is lactase deficiency.
> Try it: Where is vitamin B₁₂ absorbed? || The terminal ileum, bound to intrinsic factor from the stomach.', 1080, 38, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 8: The digestive system'), 'Liver, pancreas, bile and metabolism', 'text', '## The liver
Receives **75% of its blood from the portal vein** (nutrient-rich) and 25% from the hepatic artery. Hepatocytes:
- store glycogen, release glucose, make glucose (gluconeogenesis)
- make **albumin and clotting factors**, **bile**, cholesterol
- detoxify drugs (cytochrome P450), convert ammonia to **urea**
- process **bilirubin**

### Bilirubin
{{flow Old red cells broken down in spleen > Haem becomes unconjugated bilirubin > Liver conjugates it > Bile into gut > Stercobilin (brown stools), urobilinogen (urine)}}

> Real life: **Jaundice** types: pre-hepatic (haemolysis: unconjugated), hepatic (hepatitis) and post-hepatic/obstructive (conjugated; pale stools, dark urine).

## Pancreas
Exocrine: enzymes (amylase, lipase, trypsinogen) and bicarbonate. Endocrine: islets (insulin, glucagon). **Trypsinogen** is activated only in the duodenum, so the pancreas does not digest itself (premature activation causes pancreatitis).

## Fed and fasted states
| State | Dominant hormone | Liver | Fat |
|---|---|---|---|
| Fed | insulin | glycogen and fat made | stored |
| Fasting | glucagon | glycogenolysis, then gluconeogenesis | lipolysis, ketones |

> Try it: Why are stools pale in obstructive jaundice? || Bile pigment (stercobilin) cannot reach the gut.', 1080, 39, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 8 checkpoint quiz: The digestive system', 'Anatomy and Physiology', 'Check your understanding of the digestive system.', '[{"prompt": "Vitamin B₁₂ is absorbed in the:", "options": ["Duodenum", "Jejunum", "Terminal ileum", "Colon"], "correct_index": 2, "explanation": "Terminal ileum with intrinsic factor."}, {"prompt": "Which hormone makes the gallbladder contract?", "options": ["Gastrin", "CCK", "Secretin", "Insulin"], "correct_index": 1, "explanation": "Cholecystokinin."}, {"prompt": "Dietary fat enters the body mainly via:", "options": ["Portal vein", "Lacteals", "Hepatic artery", "Bile duct"], "correct_index": 1, "explanation": "Chylomicrons enter lymphatic lacteals."}, {"prompt": "The portal vein supplies the liver with about:", "options": ["25% of its blood", "50%", "75%", "100%"], "correct_index": 2, "explanation": "About 75%."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 8 checkpoint quiz: The digestive system');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 8: The digestive system'), 'Checkpoint quiz: The digestive system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 8 checkpoint quiz: The digestive system'), 300, 40, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 9: Defence and reproduction', 9);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'The lymphatic system and innate immunity', 'text', '## Lymphatic system
Returns about **3 L of fluid a day** to the blood, absorbs fat (lacteals) and houses immune cells. Lymph passes through **lymph nodes**, which filter it. Primary organs: bone marrow and thymus. Secondary: nodes, spleen, MALT.

## Innate immunity (fast, non-specific)
{{stack Barriers: skin, mucus, stomach acid, lysozyme | Cells: neutrophils, macrophages, NK cells | Chemicals: complement, interferons, fever}}

### Inflammation
Tissue damage releases histamine and cytokines: **vasodilation** (redness, heat), **increased permeability** (swelling), **chemotaxis** of neutrophils, then macrophages clear debris. The cardinal signs: rubor, calor, tumor, dolor and loss of function.

> Real life: **Neutrophils** are the first responders in bacterial infection (a raised neutrophil count suggests it); **eosinophils** respond to parasites and allergy. **Complement** punches holes in bacteria and tags them for phagocytosis.
> Try it: Which cell is the most numerous white cell and first to arrive? || The neutrophil.', 840, 41, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'Adaptive immunity', 'text', '## Specific and with memory
{{flow Antigen engulfed by dendritic cell > Antigen shown on MHC to helper T cell > T cell activated > B cells make antibody; cytotoxic T cells kill infected cells > Memory cells remain}}

| Cell | Role |
|---|---|
| Helper T (CD4⁺) | coordinates the response with cytokines (the target of HIV) |
| Cytotoxic T (CD8⁺) | kills infected or cancerous cells (needs MHC I) |
| B cell / plasma cell | makes antibodies |
| Memory cells | rapid second response |

### Antibody classes
| Class | Notes |
|---|---|
| IgM | first response, large |
| IgG | main blood antibody; crosses the placenta |
| IgA | mucosal surfaces, breast milk |
| IgE | allergy, parasites (mast cells) |

### Vaccination
Exposes the immune system to an antigen without disease, creating **memory**, so a real infection meets a rapid IgG response.

> Real life: **Type I hypersensitivity** (anaphylaxis) is IgE-mediated mast cell degranulation; adrenaline is the emergency treatment. **Autoimmunity** is failure of self-tolerance (type 1 diabetes, rheumatoid arthritis).
> Try it: Which antibody crosses the placenta? || IgG.', 960, 42, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'Reproduction and the hormonal axis', 'text', '## The HPG axis
{{flow Hypothalamus releases GnRH > Anterior pituitary releases FSH and LH > Gonads make sex steroids and gametes > Oestrogen, progesterone, testosterone feed back}}

### Male
**Testes**: Sertoli cells (support sperm, inhibin; respond to FSH) and Leydig cells (**testosterone**, respond to LH). **Spermatogenesis** takes about 74 days in the seminiferous tubules.

### Female: the menstrual cycle (about 28 days)
{{timeline Day 1-5 Menstruation | Day 6-13 Follicular phase (FSH, rising oestrogen) | Day 14 LH surge and ovulation | Day 15-28 Luteal phase (progesterone) | Fall in hormones, menstruation}}

- **Follicular phase**: FSH grows a follicle; oestrogen thickens the endometrium.
- **Ovulation**: high oestrogen triggers a **positive feedback LH surge**.
- **Luteal phase**: the corpus luteum makes **progesterone** to prepare the endometrium.

### Pregnancy
The embryo''s trophoblast releases **hCG**, which keeps the corpus luteum making progesterone until the **placenta** takes over (about week 10). hCG is what pregnancy tests detect.

> Real life: Combined oral contraceptives use oestrogen and progestogen to suppress the FSH/LH surge and prevent ovulation.
> Try it: What triggers ovulation? || A surge of LH caused by a positive feedback effect of high oestrogen.', 1080, 43, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 9 checkpoint quiz: Defence and reproduction', 'Anatomy and Physiology', 'Check your understanding of defence and reproduction.', '[{"prompt": "Which cell is the main target of HIV?", "options": ["Cytotoxic T cell", "Helper T cell", "B cell", "Neutrophil"], "correct_index": 1, "explanation": "CD4⁺ helper T cells."}, {"prompt": "Which antibody is most abundant in blood and crosses the placenta?", "options": ["IgA", "IgE", "IgG", "IgM"], "correct_index": 2, "explanation": "IgG."}, {"prompt": "The LH surge is triggered by:", "options": ["Falling oestrogen", "High oestrogen", "High progesterone", "hCG"], "correct_index": 1, "explanation": "Positive feedback from high oestrogen."}, {"prompt": "Which hormone does a pregnancy test detect?", "options": ["FSH", "hCG", "Progesterone", "LH"], "correct_index": 1, "explanation": "Human chorionic gonadotrophin."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 9 checkpoint quiz: Defence and reproduction');

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 9: Defence and reproduction'), 'Checkpoint quiz: Defence and reproduction', 'quiz', (SELECT id FROM quizzes WHERE title='Module 9 checkpoint quiz: Defence and reproduction'), 300, 44, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 10: Putting it all together', 10);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 10: Putting it all together'), 'Clinical integration: three cases', 'text', '## How to think like a clinician
Disease is a **failure of a normal mechanism**. Name the mechanism and the rest follows. Use this routine: **What is normal? What changed? Which organs compensate? What goes wrong if compensation fails?**

### Case 1: Blood loss
A man loses 1.5 L of blood after trauma.
{{flow Venous return falls > SV and BP fall > Baroreceptors fire less > Sympathetic surge and vagal withdrawal > HR up, vasoconstriction > Kidney: renin, ADH, aldosterone conserve volume}}
He is pale, cold and tachycardic (sympathetic), passes little urine (renal conservation) and has a low-normal BP at first. Late shock means compensation has failed.

### Case 2: Diabetic ketoacidosis
No insulin means glucose cannot enter cells and the liver makes **ketones**.
- Hyperglycaemia exceeds the renal threshold, so **osmotic diuresis** causes dehydration.
- Ketones are acids: **metabolic acidosis** with deep fast breathing (**Kussmaul**) to blow off CO₂.
- Insulin lack moves K⁺ out of cells: plasma K⁺ may look high even though total K⁺ is low.

### Case 3: Opioid overdose
Opioids depress the medullary respiratory centres. Ventilation falls, so **PaCO₂ rises** (respiratory acidosis) and **PaO₂ falls**. Pupils constrict (parasympathetic). **Naloxone** blocks the receptors.

### Study strategy
- Draw each system as a **flow**: structure, signal, effect, feedback.
- Link every drug to the mechanism it changes.
- Practise explaining one pathway out loud in under two minutes.

> Try it: In Case 1, why does urine output fall? || Reduced renal perfusion plus renin-angiotensin-aldosterone and ADH activation conserve salt and water.', 1200, 45, 0);

INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Anatomy and Physiology (Medical Level) final exam', 'Anatomy and Physiology', 'Twenty questions across every system. You need 70% to complete the course.', '[{"prompt": "A patient has a tension pneumothorax. Which structure has air collected in it?", "options": ["Pericardial cavity", "Pleural cavity", "Peritoneal cavity", "Mediastinum"], "correct_index": 1, "explanation": "Air enters the pleural cavity, collapsing the lung."}, {"prompt": "Which ion movement causes the rising phase of the action potential?", "options": ["K⁺ efflux", "Na⁺ influx", "Cl⁻ influx", "Ca²⁺ efflux"], "correct_index": 1, "explanation": "Voltage-gated Na⁺ channels open and Na⁺ rushes in."}, {"prompt": "In skeletal muscle, calcium binds to:", "options": ["Tropomyosin", "Troponin C", "Myosin heavy chain", "Actin directly"], "correct_index": 1, "explanation": "Troponin C moves tropomyosin off actin."}, {"prompt": "Which tract carries fine touch and proprioception?", "options": ["Spinothalamic", "Dorsal columns", "Corticospinal", "Rubrospinal"], "correct_index": 1, "explanation": "The dorsal column-medial lemniscus pathway."}, {"prompt": "A pituitary tumour compresses the optic chiasm. What visual loss results?", "options": ["Homonymous hemianopia", "Bitemporal hemianopia", "Central scotoma", "Blindness in one eye"], "correct_index": 1, "explanation": "Crossing nasal fibres are compressed: bitemporal hemianopia."}, {"prompt": "Which hormone lowers blood glucose?", "options": ["Glucagon", "Cortisol", "Insulin", "Adrenaline"], "correct_index": 2, "explanation": "Insulin."}, {"prompt": "Which structure is the normal pacemaker of the heart?", "options": ["AV node", "SA node", "Bundle of His", "Purkinje fibres"], "correct_index": 1, "explanation": "The SA node depolarises fastest."}, {"prompt": "A patient has HR 90/min and SV 70 mL. Cardiac output is:", "options": ["4.2 L/min", "5.4 L/min", "6.3 L/min", "7.0 L/min"], "correct_index": 2, "explanation": "90 × 70 = 6300 mL/min."}, {"prompt": "Which change shifts the O₂-Hb curve to the right?", "options": ["Alkalosis", "Hypothermia", "Raised 2,3-BPG", "Fetal haemoglobin"], "correct_index": 2, "explanation": "2,3-BPG, H⁺, CO₂ and temperature shift it right."}, {"prompt": "pH 7.28, PCO₂ 65 mmHg, HCO₃⁻ 29. This is:", "options": ["Metabolic acidosis", "Respiratory acidosis", "Respiratory alkalosis", "Metabolic alkalosis"], "correct_index": 1, "explanation": "Low pH with high PCO₂: respiratory acidosis (with early renal compensation)."}, {"prompt": "Which segment of the nephron is the main site of glucose reabsorption?", "options": ["Proximal tubule", "Loop of Henle", "Distal tubule", "Collecting duct"], "correct_index": 0, "explanation": "SGLT2 and SGLT1 in the proximal tubule."}, {"prompt": "ADH increases water reabsorption by inserting:", "options": ["SGLT2", "Aquaporin-2", "NKCC2", "ENaC"], "correct_index": 1, "explanation": "Aquaporin-2 in the collecting duct."}, {"prompt": "A man on an ACE inhibitor develops a dry cough. The cause is:", "options": ["Angiotensin II", "Bradykinin accumulation", "Renin", "Aldosterone"], "correct_index": 1, "explanation": "ACE also breaks down bradykinin."}, {"prompt": "Fat absorbed from the gut first travels via:", "options": ["Portal vein", "Lacteals (lymph)", "Hepatic artery", "Bile duct"], "correct_index": 1, "explanation": "Chylomicrons enter lacteals."}, {"prompt": "Conjugated hyperbilirubinaemia with pale stools suggests:", "options": ["Haemolysis", "Obstructive jaundice", "Gilbert syndrome", "Anaemia"], "correct_index": 1, "explanation": "Bile cannot reach the gut: post-hepatic obstruction."}, {"prompt": "Which immune cell is depleted in HIV?", "options": ["CD8⁺ T cells", "CD4⁺ T cells", "Plasma cells", "Neutrophils"], "correct_index": 1, "explanation": "CD4⁺ helper T cells."}, {"prompt": "The LH surge that causes ovulation results from:", "options": ["Negative feedback of oestrogen", "Positive feedback of oestrogen", "Progesterone peak", "hCG"], "correct_index": 1, "explanation": "High oestrogen switches to positive feedback."}, {"prompt": "Which finding is expected in early haemorrhagic shock?", "options": ["Bradycardia", "Tachycardia and vasoconstriction", "Warm flushed skin", "High urine output"], "correct_index": 1, "explanation": "Sympathetic activation compensates."}, {"prompt": "Which of these is a retroperitoneal organ?", "options": ["Stomach", "Spleen", "Kidney", "Liver"], "correct_index": 2, "explanation": "The kidney."}, {"prompt": "In diabetic ketoacidosis, the breathing pattern (Kussmaul) is a compensation for:", "options": ["Respiratory alkalosis", "Metabolic acidosis", "Hypoxia from pneumonia", "Anxiety"], "correct_index": 1, "explanation": "The lungs blow off CO₂ to raise pH."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Anatomy and Physiology (Medical Level) final exam');

UPDATE courses SET final_exam_quiz_id = (SELECT id FROM quizzes WHERE title = 'Anatomy and Physiology (Medical Level) final exam'), final_exam_passing_score = 70 WHERE slug = 'anatomy-physiology-medical';
