-- Human Anatomy and Physiology for Medical Students: adds the course, modules and lessons to D1.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-anatomy-physiology-seed.sql
-- Safe to run more than once (INSERT OR IGNORE). Never deletes anything.
-- The course is added as a DRAFT (published = 0). Review it, then publish it:
--   npx wrangler d1 execute smart21brain-db --remote --command "UPDATE courses SET published=1 WHERE slug='human-anatomy-physiology-medicine'"

INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES ('Medicine & Health','medicine-health','fa-solid fa-stethoscope');

INSERT OR IGNORE INTO courses (title, slug, description, thumbnail_url, category_id, level, age_range, language, objectives, requirements, price, is_free, certificate_enabled, published)
VALUES ('Human Anatomy and Physiology for Medical Students', 'human-anatomy-physiology-medicine', 'A complete first-year medical course in human anatomy and physiology: 9 modules and 27 lessons from anatomical terms and homeostasis through the musculoskeletal, nervous, cardiovascular, respiratory, renal, digestive, endocrine, reproductive and immune systems, ending with an integrated clinical case. Every lesson has diagrams, clinical correlations, practice questions and a quiz, plus a final exam.', NULL, (SELECT id FROM course_categories WHERE slug='medicine-health'), 'advanced', '18+', 'English', '["Use anatomical terminology, planes and body cavities correctly", "Explain homeostasis, feedback loops, membrane transport and the basic tissues", "Describe the structure and physiology of the musculoskeletal and nervous systems", "Trace blood through the heart, interpret the cardiac cycle and ECG, and explain blood pressure control", "Explain lung mechanics, gas exchange, oxygen transport and the control of breathing", "Describe nephron function, fluid balance and acid-base disorders", "Explain digestion, liver function, metabolism and the fed and fasting states", "Describe endocrine axes, the menstrual cycle and the immune response", "Integrate several organ systems in a clinical case such as haemorrhagic shock"]', '["Basic biology and chemistry (secondary school level)", "Willingness to learn medical terminology", "An anatomy atlas is helpful for revision but not required"]', 0, 1, 1, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 1: Foundations of the human body', 1);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 1: Foundations of the human body'), 'Levels of organisation and anatomical language', 'text', '## From atoms to the whole person
The body is built in layers. Each layer is made from the one below it, and disease can begin at any layer.

{{flow Chemical level > Cell > Tissue > Organ > Organ system > Whole organism}}

| Level | Example |
|---|---|
| Chemical | Water, ions, proteins, DNA |
| Cell | Cardiac myocyte, neuron, hepatocyte |
| Tissue | Cardiac muscle tissue |
| Organ | The heart |
| Organ system | Cardiovascular system |

## The anatomical position
All descriptions assume the body is upright, facing forward, arms at the sides, palms and feet pointing forward. **Left and right always mean the patient''s left and right**, never the examiner''s.

## Directional terms
| Term | Meaning | Example |
|---|---|---|
| Superior / inferior | Toward the head / toward the feet | The heart is superior to the diaphragm |
| Anterior / posterior | Front / back | The sternum is anterior to the heart |
| Medial / lateral | Toward / away from the midline | The radius is lateral to the ulna |
| Proximal / distal | Nearer / farther from the attachment point | The elbow is proximal to the wrist |
| Superficial / deep | Nearer / farther from the surface | Skin is superficial to muscle |

## The three cardinal planes
{{stack Sagittal plane: separates left from right | Coronal (frontal) plane: separates front from back | Transverse (axial) plane: separates top from bottom}}

> Real life: A transverse CT slice is viewed as if looking up from the patient''s feet, so the patient''s right side appears on the left of the image.

## Body cavities
{{mind Body cavities | Cranial: brain | Vertebral canal: spinal cord | Thoracic: lungs, heart, mediastinum | Abdominal: stomach, liver, intestines | Pelvic: bladder, rectum, reproductive organs}}

Clinicians divide the abdomen into four quadrants (right upper, left upper, right lower, left lower) to localise pain and findings.

> Real life: Pain settling in the right lower quadrant is a classic presentation of appendicitis.

> Try it: Which term describes a structure lying closer to the skin than the muscle beneath it? || Superficial.

## Quiz questions
1. In the anatomical position the palms face... Answer: Forward (anteriorly). The standard position has palms and feet pointing forward.
2. A plane that divides the body into left and right parts is the... Answer: Sagittal plane. The coronal plane divides front from back and the transverse plane divides top from bottom.
3. The elbow relative to the wrist is... Answer: Proximal. The elbow is nearer to the trunk than the wrist.', 900, 1, 1);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 1: Foundations of the human body'), 'Homeostasis and feedback control', 'text', '## Keeping the internal environment steady
**Homeostasis** is the maintenance of a relatively constant internal environment (temperature, pH, glucose, osmolality, blood pressure) despite changes outside and inside the body. Cells only work well inside a narrow range.

## The control loop
Every homeostatic loop has the same three parts.
{{cycle Stimulus changes a variable > Receptor detects the change > Control centre compares with set point > Effector acts > Variable returns toward set point}}

| Component | Example: body temperature |
|---|---|
| Variable | Core temperature, about 37 degrees C |
| Receptor | Thermoreceptors in skin and hypothalamus |
| Control centre | Hypothalamus |
| Effector | Sweat glands, skin blood vessels, skeletal muscle |

## Negative feedback
The response **opposes** the change. It is the most common mechanism and keeps variables stable.
{{flow Body temperature rises > Hypothalamus senses it > Sweating and skin vasodilation > Heat is lost > Temperature falls}}

Other examples: baroreceptor control of blood pressure, insulin lowering blood glucose, PTH and calcium.

## Positive feedback
The response **amplifies** the change until an endpoint is reached. It is rarer and usually short-lived.
{{flow Cervix is stretched > Oxytocin released > Uterine contraction strengthens > More cervical stretch > Delivery ends the loop}}

Other examples: the clotting cascade, the LH surge before ovulation, the upstroke of the nerve action potential.

> Key idea: Negative feedback stabilises. Positive feedback drives a process to completion. A positive loop that never ends, such as a fever spiral or septic shock, is dangerous.

## When homeostasis fails
Disease can be viewed as a failure of control: the set point is wrong, a receptor or effector fails, or the stress is too large.

> Real life: In type 1 diabetes the effector (insulin) is missing, so negative feedback cannot bring blood glucose down.

> Try it: Is the rise in oxytocin during labour negative or positive feedback? || Positive feedback, because the response increases the stimulus.

## Quiz questions
1. Which is the control centre for body temperature? Answer: The hypothalamus. It compares core temperature with the set point.
2. Negative feedback is characterised by... Answer: A response that opposes the original change. This keeps the variable near its set point.
3. Which is an example of positive feedback? Answer: Platelet activation and clotting. Each step amplifies the next until the clot forms.', 900, 2, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 1: Foundations of the human body'), 'Cells, membrane transport and tissues', 'text', '## The cell membrane
The plasma membrane is a **phospholipid bilayer** with embedded proteins and cholesterol. It is selectively permeable: small non-polar molecules (O2, CO2) cross freely, while ions and glucose need channels or carriers.

## Moving substances across the membrane
{{mind Membrane transport | Simple diffusion: down a gradient, no energy | Facilitated diffusion: carrier or channel, no energy | Osmosis: water moves toward higher solute | Primary active transport: uses ATP | Secondary active transport: uses an ion gradient}}

> Key idea: The **Na+/K+ ATPase** pumps 3 Na+ out and 2 K+ in using ATP. It sets up the ion gradients that make nerve and muscle excitability, and much of renal transport, possible.

## Key organelles and their roles
| Organelle | Function | Clinical link |
|---|---|---|
| Nucleus | DNA storage, transcription | Cancer: DNA damage |
| Mitochondria | ATP production | Mitochondrial disease |
| Rough ER / Golgi | Protein synthesis and processing | Secretory cells are rich in both |
| Lysosome | Digestion of waste | Lysosomal storage diseases |
| Smooth ER | Lipid synthesis, detoxification, Ca2+ store | Hepatocytes, muscle (SR) |

## The four basic tissue types
{{stack Epithelial: covers surfaces and lines cavities | Connective: supports, connects, protects | Muscle: contracts to produce movement | Nervous: transmits electrical signals}}

## Epithelium: shape and layers decide function
| Type | Location | Function |
|---|---|---|
| Simple squamous | Alveoli, capillaries | Fast diffusion |
| Simple cuboidal | Kidney tubules | Secretion, absorption |
| Simple columnar | Small intestine | Absorption |
| Pseudostratified ciliated | Trachea | Moves mucus |
| Stratified squamous | Skin, oesophagus | Protection from wear |
| Transitional | Bladder | Stretches |

> Real life: Chronic smoking can change tracheal ciliated epithelium into stratified squamous epithelium (metaplasia), which protects better but cannot clear mucus.

> Try it: Which epithelium would you expect lining the alveoli, and why? || Simple squamous, because a single thin layer allows rapid gas diffusion.

## Quiz questions
1. How many Na+ and K+ ions move per cycle of the Na+/K+ ATPase? Answer: 3 Na+ out and 2 K+ in. This creates an electrochemical gradient.
2. Which epithelium lines the small intestine? Answer: Simple columnar. It is specialised for absorption.
3. Osmosis is the movement of... Answer: Water across a membrane toward higher solute concentration. Water follows solute.', 1200, 3, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 2: The musculoskeletal system', 2);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 2: The musculoskeletal system'), 'Bone: structure, growth and remodelling', 'text', '## The skeleton in numbers
The adult skeleton has **206 bones**: 80 in the axial skeleton (skull, vertebral column, ribs, sternum) and 126 in the appendicular skeleton (limbs and girdles).

{{chart Axial:80 Appendicular:126}}

## Structure of a long bone
{{stack Epiphysis: ends, spongy bone, articular cartilage | Metaphysis: growth plate region in children | Diaphysis: shaft of compact bone | Medullary cavity: bone marrow}}

- **Compact bone** is made of osteons (Haversian systems) for strength.
- **Spongy (trabecular) bone** is a light lattice that houses red marrow and resists stress from many directions.
- The **periosteum** covers the outside and carries blood vessels and nerves.

## Bone cells
| Cell | Role |
|---|---|
| Osteoblast | Builds new bone matrix |
| Osteocyte | Mature cell that maintains bone |
| Osteoclast | Breaks down (resorbs) bone |

Bone is about 65% mineral (hydroxyapatite, a calcium phosphate) and 35% organic matrix (mainly collagen). Collagen gives flexibility; mineral gives hardness.

## How bones form
{{flow Mesenchyme or cartilage model > Ossification centres appear > Bone matrix laid down > Growth plate lengthens bone > Plate closes in adolescence}}

Flat bones form by **intramembranous ossification**; long bones form by **endochondral ossification** from a cartilage model.

## Remodelling and calcium
Bone is renewed throughout life. PTH increases osteoclast activity to raise blood calcium, while weight-bearing exercise and vitamin D support bone formation.

> Real life: In osteoporosis, resorption outpaces formation, bone density falls and fractures of the hip, wrist and vertebrae become common.

## Fracture healing
{{timeline Haematoma forms | Soft callus of fibrocartilage | Hard callus of woven bone | Remodelling to lamellar bone}}

> Try it: Which cell removes bone, and which hormone stimulates it indirectly to raise calcium? || The osteoclast; parathyroid hormone (PTH).

## Quiz questions
1. How many bones are in the adult skeleton? Answer: 206. There are 80 axial and 126 appendicular bones.
2. Which cells resorb bone? Answer: Osteoclasts. Osteoblasts build bone.
3. Long bones grow in length at the... Answer: Epiphyseal (growth) plate. It closes after puberty.', 1000, 4, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 2: The musculoskeletal system'), 'Joints and movement', 'text', '## Classifying joints
Joints are classified by the tissue joining the bones, which also predicts how much they move.
{{mind Joint types | Fibrous: skull sutures, almost no movement | Cartilaginous: intervertebral discs, pubic symphysis, little movement | Synovial: free movement, most limb joints}}

## Anatomy of a synovial joint
{{stack Articular cartilage covers bone ends | Joint capsule with synovial membrane | Synovial fluid lubricates and nourishes cartilage | Ligaments stabilise the joint}}

## Types of synovial joint
| Type | Movement | Example |
|---|---|---|
| Hinge | Flexion and extension | Elbow, knee |
| Ball and socket | All directions | Shoulder, hip |
| Pivot | Rotation | Atlas and axis (turning the head) |
| Saddle | Two axes | Thumb carpometacarpal |
| Plane | Gliding | Intercarpal joints |
| Condyloid | Two axes, no rotation | Wrist |

## Movements to know
- **Flexion / extension:** decrease / increase the angle of a joint.
- **Abduction / adduction:** away from / toward the midline.
- **Medial / lateral rotation:** turning the limb inward / outward.
- **Pronation / supination:** forearm palm down / palm up.
- **Dorsiflexion / plantarflexion:** ankle up / down.
- **Inversion / eversion:** sole of the foot inward / outward.

## Mobility versus stability
> Key idea: The more mobile a joint, the less stable it tends to be. The **shoulder** is the most mobile joint and the most commonly dislocated. The **hip** is deep and strongly supported, so it is stable but less mobile.

> Real life: Anterior shoulder dislocation is the most common type. The axillary nerve lies close to the joint, so its function (sensation over the lateral upper arm, deltoid power) is checked after a dislocation.

> Try it: Which type of joint is the knee mainly classed as? || A hinge-type synovial joint (a modified hinge that also allows slight rotation).

## Quiz questions
1. Which type of joint allows the greatest range of movement? Answer: Ball and socket. The shoulder and hip are examples.
2. Synovial fluid mainly... Answer: Lubricates and nourishes articular cartilage. Cartilage has no blood supply of its own.
3. Pronation of the forearm turns the palm... Answer: Downward (posteriorly in anatomical terms). Supination turns it upward.', 900, 5, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 2: The musculoskeletal system'), 'Muscle physiology and contraction', 'text', '## Skeletal muscle structure
{{stack Whole muscle | Fascicle (bundle of fibres) | Muscle fibre (one multinucleate cell) | Myofibril | Sarcomere: the contractile unit}}

A **sarcomere** runs from one Z line to the next. **Thin filaments** (actin) attach to the Z line. **Thick filaments** (myosin) lie in the centre.

## Excitation to contraction
{{flow Motor neuron action potential > ACh released at neuromuscular junction > End-plate potential triggers a muscle action potential > T-tubules signal the sarcoplasmic reticulum > Ca2+ released into the cytoplasm > Ca2+ binds troponin C and tropomyosin moves off actin > Cross-bridges form and filaments slide}}

## The cross-bridge cycle
{{cycle Myosin head binds actin > Power stroke pulls actin inward > ATP binds and head detaches > ATP is hydrolysed and head recocks}}

> Key idea: ATP is needed to **release** the myosin head, not only to move it. Without ATP the heads stay bound, which explains **rigor mortis**.

During contraction the sarcomere shortens: the I band and H zone narrow, while the A band stays the same length. Relaxation occurs when the SERCA pump returns Ca2+ to the sarcoplasmic reticulum.

## Fibre types
| Type | Speed | Metabolism | Use |
|---|---|---|---|
| Type I | Slow | Oxidative, fatigue resistant | Posture, endurance |
| Type IIa | Fast | Oxidative and glycolytic | Mixed activity |
| Type IIx | Fast | Glycolytic, tires quickly | Sprinting, power |

## Three muscle types compared
| Feature | Skeletal | Cardiac | Smooth |
|---|---|---|---|
| Control | Voluntary | Involuntary | Involuntary |
| Striated | Yes | Yes | No |
| Ca2+ trigger | Troponin | Troponin | Calmodulin |
| Special feature | Neuromuscular junction | Intercalated discs, long plateau | Slow, sustained tone |

> Real life: In **myasthenia gravis**, antibodies attack nicotinic ACh receptors at the neuromuscular junction, causing fatigable weakness (droopy eyelids, double vision). Treatment includes acetylcholinesterase inhibitors.

> Try it: What happens to the I band during contraction? || It becomes shorter as thin filaments slide over thick filaments.

## Quiz questions
1. Which ion binds troponin C to start contraction? Answer: Calcium (Ca2+). It moves tropomyosin and exposes myosin-binding sites on actin.
2. What causes rigor mortis? Answer: Lack of ATP, so myosin heads cannot detach. ATP is required for detachment.
3. Which fibre type is best suited to endurance? Answer: Type I. It is oxidative and resists fatigue.', 1300, 6, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 3: The nervous system', 3);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 3: The nervous system'), 'Organisation of the nervous system and the neuron', 'text', '## Divisions of the nervous system
{{mind Nervous system | Central (CNS): brain and spinal cord | Peripheral (PNS): nerves and ganglia | Somatic: voluntary control of skeletal muscle | Autonomic: involuntary control of viscera | Afferent (sensory) vs efferent (motor)}}

## The neuron
A neuron has **dendrites** (receive input), a **cell body** (integrates and houses the nucleus), and an **axon** (conducts output). The axon ends at terminals that release neurotransmitter.

{{flow Dendrites receive signals > Cell body integrates > Axon hillock reaches threshold > Action potential travels down axon > Terminal releases neurotransmitter}}

## Supporting cells (glia)
| Cell | Role |
|---|---|
| Astrocyte | Supports the blood-brain barrier, buffers K+ and neurotransmitter |
| Oligodendrocyte | Myelinates CNS axons |
| Schwann cell | Myelinates PNS axons |
| Microglia | Immune cells of the CNS |
| Ependymal cell | Lines ventricles, helps make CSF |

## Resting membrane potential
Inside a resting neuron is about **-70 mV** relative to outside. It is set mainly by the Na+/K+ ATPase and by K+ leak channels, because the membrane is far more permeable to K+ than to Na+ at rest.

{{stack Outside: high Na+, high Cl- | Membrane: K+ leak channels and Na+/K+ pump | Inside: high K+, large negative proteins}}

## Myelin and speed
Myelin insulates the axon so that the action potential jumps between **nodes of Ranvier** (saltatory conduction), which is faster and uses less energy.

> Real life: In **multiple sclerosis** the immune system damages CNS myelin, slowing conduction and causing visual loss, weakness and sensory symptoms. In **Guillain-Barre syndrome** peripheral myelin is attacked, causing ascending weakness.

> Try it: Which cell myelinates axons in the CNS? || The oligodendrocyte.

## Quiz questions
1. The resting membrane potential of a typical neuron is about... Answer: -70 mV. It is determined chiefly by K+ permeability and the Na+/K+ pump.
2. Which cells form myelin in the peripheral nervous system? Answer: Schwann cells. Oligodendrocytes do this in the CNS.
3. Saltatory conduction means the impulse... Answer: Jumps between nodes of Ranvier. This speeds conduction.', 1000, 7, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 3: The nervous system'), 'The action potential and the synapse', 'text', '## Phases of the action potential
{{timeline Resting at about -70 mV | Stimulus reaches threshold at about -55 mV | Voltage-gated Na+ channels open: rapid depolarisation | Na+ channels inactivate and K+ channels open: repolarisation | Brief hyperpolarisation before return to rest}}

> Key idea: The action potential is **all-or-none**. Stronger stimuli produce a higher **frequency** of action potentials, not bigger ones.

## Refractory periods
- **Absolute refractory period:** Na+ channels are inactivated, so no second action potential is possible. This makes the impulse travel in one direction.
- **Relative refractory period:** a stronger stimulus is needed, because K+ channels are still open.

## Synaptic transmission
{{flow Action potential reaches terminal > Voltage-gated Ca2+ channels open > Vesicles fuse and release neurotransmitter > Neurotransmitter binds postsynaptic receptors > Postsynaptic potential > Transmitter is removed}}

Transmitter is removed by reuptake, enzymatic breakdown or diffusion. Most fast synapses use **EPSPs** (excitatory, depolarising) and **IPSPs** (inhibitory, hyperpolarising), which sum at the axon hillock.

## Key neurotransmitters
| Transmitter | Main roles |
|---|---|
| Acetylcholine | Neuromuscular junction, parasympathetic system |
| Noradrenaline | Sympathetic system, alertness |
| Dopamine | Movement, reward |
| Serotonin | Mood, sleep |
| Glutamate | Main excitatory transmitter of the CNS |
| GABA | Main inhibitory transmitter of the CNS |

## Drugs and toxins that act here
> Real life: **Local anaesthetics** (lidocaine) block voltage-gated Na+ channels so action potentials cannot form. **Botulinum toxin** blocks ACh release, causing paralysis. **Benzodiazepines** enhance GABA action. **Parkinson disease** involves loss of dopamine neurons in the substantia nigra.

> Try it: Why can an action potential not travel backward? || The part of the axon just behind is in its absolute refractory period.

## Quiz questions
1. Which ion causes the rapid depolarisation phase? Answer: Sodium (Na+). Voltage-gated Na+ channels open at threshold.
2. Which ion entry triggers transmitter release at the terminal? Answer: Calcium (Ca2+). Voltage-gated Ca2+ channels open when the impulse arrives.
3. Lidocaine works by blocking... Answer: Voltage-gated Na+ channels. No action potential means no pain signal.', 1200, 8, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 3: The nervous system'), 'Brain, spinal cord and the autonomic nervous system', 'text', '## Regions of the brain
{{mind Brain | Frontal lobe: movement, planning, speech (Broca) | Parietal lobe: touch, spatial awareness | Temporal lobe: hearing, memory, language comprehension (Wernicke) | Occipital lobe: vision | Cerebellum: coordination and balance | Brainstem: breathing, heart rate, consciousness}}

## Spinal cord pathways
| Pathway | Carries | Crosses (decussates) |
|---|---|---|
| Dorsal column | Fine touch, vibration, proprioception | In the medulla |
| Spinothalamic | Pain, temperature | In the spinal cord, near its entry level |
| Corticospinal | Voluntary movement | In the medulla (pyramids) |

> Key idea: Because of these crossings, a **cortical stroke** causes weakness on the **opposite** side of the body, while **cerebellar** damage causes problems on the **same** side.

## The reflex arc
{{flow Receptor > Sensory neuron > Spinal cord integration > Motor neuron > Effector muscle}}

The knee-jerk (patellar) reflex is **monosynaptic** (spinal levels L3 and L4). It tests the integrity of the whole loop.

## Autonomic nervous system
| Feature | Sympathetic | Parasympathetic |
|---|---|---|
| Nickname | Fight or flight | Rest and digest |
| Outflow | Thoracolumbar (T1 to L2) | Cranial nerves III, VII, IX, X and sacral S2 to S4 |
| Transmitter at target | Noradrenaline (ACh at sweat glands) | Acetylcholine |
| Heart | Rate and force increase | Rate decreases (vagus) |
| Pupil | Dilates | Constricts |
| Bronchi | Dilate | Constrict |
| Gut | Slowed | Stimulated |

## Blood supply and stroke
The brain is supplied by the two carotid arteries and the two vertebral arteries, joined by the **circle of Willis**. The brain uses about 20% of resting cardiac output and has almost no energy reserve.

> Real life: A **middle cerebral artery** stroke causes weakness and sensory loss of the opposite face and arm, and speech problems if the dominant hemisphere is affected. Early treatment, within hours, can save brain tissue.

> Try it: A patient has right-sided arm weakness and cannot speak. Which side of the brain is probably affected? || The left (dominant) hemisphere, because motor pathways cross.

## Quiz questions
1. Which pathway carries pain and temperature? Answer: The spinothalamic tract. It crosses at the spinal level.
2. Parasympathetic stimulation of the heart through the vagus nerve... Answer: Slows the heart rate. This is mediated by acetylcholine.
3. Cerebellar lesions cause signs on which side? Answer: The same (ipsilateral) side. Cerebellar pathways cross twice.', 1400, 9, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 4: Cardiovascular system and blood', 4);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 4: Cardiovascular system and blood'), 'The heart: structure and blood flow', 'text', '## Position and layers
The heart lies in the **middle mediastinum**, behind the sternum, tilted so that the apex points to the left. It sits in the **pericardium** and its wall has three layers: **epicardium**, **myocardium** (the muscle) and **endocardium**.

## Chambers and valves
| Structure | Key facts |
|---|---|
| Right atrium | Receives deoxygenated blood from the SVC, IVC and coronary sinus |
| Tricuspid valve | Between right atrium and right ventricle |
| Right ventricle | Pumps to the lungs; thin wall, low pressure |
| Pulmonary valve | Into the pulmonary trunk |
| Left atrium | Receives oxygenated blood from four pulmonary veins |
| Mitral (bicuspid) valve | Between left atrium and left ventricle |
| Left ventricle | Pumps to the body; thick wall, high pressure |
| Aortic valve | Into the aorta |

## The path of blood
Right side (to the lungs):
{{flow Body (venous blood) > Right atrium > Tricuspid valve > Right ventricle > Pulmonary valve > Pulmonary arteries > Lungs}}

Left side (to the body):
{{flow Lungs > Pulmonary veins > Left atrium > Mitral valve > Left ventricle > Aortic valve > Aorta and body}}

> Key idea: The heart is **two pumps in series**: the right side drives the pulmonary circulation and the left side drives the systemic circulation. Both pump the **same output** every minute.

## Coronary circulation
The heart muscle is fed by the coronary arteries, which arise from the aortic root just above the aortic valve.
{{stack Left main coronary artery | Left anterior descending (LAD): front of the left ventricle and septum | Circumflex: side and back of the left ventricle | Right coronary artery: right heart, SA node, AV node}}

The left ventricle is perfused mainly during **diastole**, because in systole the contracting muscle squeezes its own vessels.

> Real life: Blockage of a coronary artery causes **myocardial infarction**. A blocked LAD is often called the ''widow-maker'' because it supplies a large part of the left ventricle.

## Valve disease in brief
- **Stenosis:** valve does not open fully, so the chamber behind it works harder.
- **Regurgitation:** valve does not close fully, so blood leaks backward.

> Try it: Which valve lies between the left atrium and left ventricle? || The mitral (bicuspid) valve.

## Quiz questions
1. Which chamber has the thickest wall? Answer: The left ventricle. It pumps against high systemic pressure.
2. Blood from the lungs returns to the... Answer: Left atrium, via the pulmonary veins. This blood is oxygenated.
3. When is the left ventricle mainly perfused by the coronary arteries? Answer: During diastole. Systolic contraction compresses the vessels.', 1100, 10, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 4: Cardiovascular system and blood'), 'The cardiac cycle, conduction and the ECG', 'text', '## The conduction system
The heart generates its own rhythm. The **SA node** (sinoatrial) is the natural pacemaker.
{{flow SA node starts the impulse > Atria contract > AV node delays by about 0.1 s > Bundle of His > Left and right bundle branches > Purkinje fibres > Ventricles contract}}

The **AV node delay** lets the ventricles fill before they contract.

## The ECG
| Wave or interval | Represents |
|---|---|
| P wave | Atrial depolarisation |
| PR interval (120 to 200 ms) | Conduction through the AV node |
| QRS complex (under 120 ms) | Ventricular depolarisation |
| ST segment | Ventricles fully depolarised |
| T wave | Ventricular repolarisation |

> Real life: ST elevation in several leads suggests an acute myocardial infarction caused by full artery blockage. An absent P wave with an irregularly irregular rhythm suggests **atrial fibrillation**.

## The cardiac cycle
{{cycle Ventricular filling (diastole) > Atrial systole tops up filling > Isovolumetric contraction > Ejection (systole) > Isovolumetric relaxation}}

**Heart sounds:** S1 (''lub'') is closure of the mitral and tricuspid valves at the start of systole. S2 (''dub'') is closure of the aortic and pulmonary valves at the start of diastole.

## Cardiac output
CO = heart rate x stroke volume. At rest: 70 beats per minute x 70 mL = about **5 L per minute**.
- **EDV** about 120 mL, **ESV** about 50 mL, so **SV** about 70 mL.
- **Ejection fraction** = SV / EDV, normally over 55%.

{{mind What changes stroke volume | Preload: filling of the ventricle | Afterload: resistance the ventricle pumps against | Contractility: strength of contraction}}

> Key idea: **Frank-Starling law:** the more the ventricle fills (preload), the stronger the next contraction, so the heart automatically matches output to venous return.

## Cardiac muscle action potential
It has a long **plateau** because Ca2+ enters through L-type channels. The long refractory period prevents tetanus, so the heart can always relax and refill.

> Try it: A patient has stroke volume 60 mL and heart rate 80 per minute. What is cardiac output? || 60 x 80 = 4800 mL per minute, about 4.8 L per minute.

## Quiz questions
1. Which structure is the normal pacemaker of the heart? Answer: The SA node. It has the fastest spontaneous depolarisation.
2. The QRS complex represents... Answer: Ventricular depolarisation. The T wave is ventricular repolarisation.
3. Cardiac output equals... Answer: Heart rate x stroke volume. At rest this is about 5 L per minute.', 1400, 11, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 4: Cardiovascular system and blood'), 'Blood vessels, blood pressure and capillary exchange', 'text', '## Types of vessel
| Vessel | Main role |
|---|---|
| Aorta and large arteries | Elastic recoil keeps flow going in diastole |
| Arterioles | **Resistance vessels**: the main control of blood pressure and regional flow |
| Capillaries | Exchange of gases, nutrients and fluid |
| Veins | **Capacitance vessels**: hold about 60% to 65% of blood volume |

## Blood pressure
{{stack Blood pressure = cardiac output x total peripheral resistance | Mean arterial pressure = diastolic + one third of pulse pressure | Example 120/80: MAP is about 93 mmHg}}

Pulse pressure is systolic minus diastolic (here 40 mmHg).

## The baroreceptor reflex
{{flow Blood pressure falls > Carotid sinus and aortic arch stretch less > Fewer signals to the medulla > Sympathetic activity rises and vagal activity falls > Heart rate, contractility and vasoconstriction increase > Pressure recovers}}

This reflex acts within seconds. The kidneys (RAAS, ADH) control blood volume over hours to days.

> Real life: **Orthostatic hypotension** (dizziness on standing) occurs when this reflex is too slow, for example after dehydration or with some medicines.

## Capillary exchange: Starling forces
Fluid leaves the arterial end of a capillary because hydrostatic pressure (about 35 mmHg) exceeds the oncotic pressure of plasma proteins (about 25 mmHg). It returns at the venous end, where hydrostatic pressure has fallen (about 15 mmHg). Lymphatics return the remainder.

{{mind Causes of oedema | Raised venous pressure: heart failure | Low plasma albumin: liver or kidney disease | Increased permeability: inflammation | Lymphatic blockage}}

> Try it: Why does low plasma albumin cause swelling? || Less oncotic pressure pulls fluid back into the capillary, so fluid stays in the tissue.

## Quiz questions
1. Which vessels contribute most to total peripheral resistance? Answer: Arterioles. Small changes in their radius change resistance greatly.
2. MAP for a blood pressure of 120/80 is about... Answer: 93 mmHg. 80 + (40 / 3).
3. Which factor holds fluid in the capillary? Answer: Plasma oncotic pressure. It is mainly due to albumin.', 1300, 12, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 4: Cardiovascular system and blood'), 'Blood and haemostasis', 'text', '## Components of blood
Blood is about 7% of body weight (around 5 L). It is plasma plus cells.

| Component | Normal range (adult) | Function |
|---|---|---|
| Red cells (RBC) | About 4.5 to 5.5 x 10^12 per L | Carry oxygen on haemoglobin |
| White cells (WBC) | 4 to 11 x 10^9 per L | Defence |
| Platelets | 150 to 400 x 10^9 per L | Clotting |
| Haemoglobin | 13 to 17 g/dL (men), 12 to 15 g/dL (women) | Oxygen carrying |
| Haematocrit | About 40 to 50% (men), 36 to 46% (women) | Fraction of red cells |

## The life of a red cell
{{flow Kidney releases erythropoietin when oxygen is low > Marrow makes red cells > Cells circulate about 120 days > Spleen removes old cells > Haem becomes bilirubin and iron is recycled}}

> Real life: In **chronic kidney disease** erythropoietin falls, causing anaemia. In **iron deficiency**, red cells are small and pale (microcytic, hypochromic).

## White cell types
{{mind White cells | Neutrophil: first responder to bacteria | Lymphocyte: T, B and NK cells | Monocyte: becomes macrophage | Eosinophil: parasites and allergy | Basophil: allergy and histamine}}

## Haemostasis: stopping bleeding
{{timeline Vasoconstriction of the injured vessel | Platelet plug forms: adhesion, activation, aggregation | Coagulation cascade makes thrombin | Fibrinogen becomes fibrin and the clot stabilises | Fibrinolysis by plasmin removes the clot later}}

- **Extrinsic pathway:** tissue factor and factor VII, fast, tested by PT/INR.
- **Intrinsic pathway:** factors XII, XI, IX, VIII, tested by aPTT.
- Both meet at **factor X**, then thrombin converts fibrinogen to fibrin.
- Factors II, VII, IX and X need **vitamin K**, which warfarin blocks.

## Blood groups
| Group | Antigens on cells | Antibodies in plasma |
|---|---|---|
| A | A | Anti-B |
| B | B | Anti-A |
| AB | A and B | None |
| O | None | Anti-A and anti-B |

Group O red cells can be given to anyone in an emergency; group AB people can receive any ABO group. **Rhesus** (RhD) matters in pregnancy: an RhD-negative mother can make antibodies against an RhD-positive fetus.

> Try it: Why does warfarin increase the INR? || It reduces the vitamin K-dependent clotting factors, so clotting takes longer.

## Quiz questions
1. Which hormone stimulates red cell production? Answer: Erythropoietin. It is made mainly by the kidneys in response to low oxygen.
2. Which clotting factors depend on vitamin K? Answer: II, VII, IX and X. Warfarin interferes with their activation.
3. Which blood group is the universal red cell donor? Answer: O negative. It lacks A, B and RhD antigens.', 1200, 13, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 5: The respiratory system', 5);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 5: The respiratory system'), 'Anatomy of the airways and lungs', 'text', '## The airway from nose to alveolus
{{flow Nose and mouth > Pharynx > Larynx > Trachea > Bronchi (main, lobar, segmental) > Bronchioles (terminal, then respiratory) > Alveoli}}

- **Upper tract:** nose, pharynx, larynx. Warms, humidifies and filters air.
- **Trachea:** about 10 to 12 cm with C-shaped cartilage rings, dividing at the **carina** (around the T4 to T5 level) into the right and left main bronchi.
- The **right main bronchus** is wider, shorter and more vertical, so inhaled objects and aspirated material enter it more often.

## Conducting zone and respiratory zone
{{stack Conducting zone: nose to terminal bronchioles, no gas exchange (about 150 mL dead space) | Respiratory zone: respiratory bronchioles to alveoli, gas exchange}}

Bronchi contain cartilage; **bronchioles** do not, and they rely on smooth muscle tone and lung traction to stay open.

## The alveolus
An adult has about 300 million alveoli, giving a surface area near 70 square metres.
| Cell | Function |
|---|---|
| Type I pneumocyte | Thin flat cell for gas exchange (about 95% of the surface) |
| Type II pneumocyte | Makes **surfactant**, repairs the epithelium |
| Alveolar macrophage | Removes particles and microbes |

The **blood-gas barrier** is only about 0.5 micrometres thick: alveolar epithelium, fused basement membrane and capillary endothelium.

## Lungs and pleura
The right lung has **three lobes**; the left lung has **two** (plus the lingula) because of the cardiac notch. Each lung is covered by visceral pleura, and the chest wall is lined by parietal pleura. A thin film of fluid between them couples the lung to the chest wall.

> Real life: In a **pneumothorax** air enters the pleural space, the lung recoils and collapses, causing sudden pleuritic chest pain and breathlessness.

> Try it: Where do you expect a swallowed peanut to lodge more often, in the right or left main bronchus, and why? || The right, because that bronchus is wider, shorter and more vertical.

## Quiz questions
1. Which cell produces surfactant? Answer: The type II pneumocyte. Surfactant lowers alveolar surface tension.
2. Why does an inhaled foreign body more often enter the right main bronchus? Answer: It is wider, shorter and more vertical. The left bronchus is narrower and more angled.
3. How many lobes does the left lung have? Answer: Two. The right lung has three.', 1000, 14, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 5: The respiratory system'), 'Mechanics of breathing and lung volumes', 'text', '## Boyle''s law drives breathing
Gas pressure falls when volume rises. The chest changes volume, which changes pressure, which moves air.

{{flow Diaphragm contracts and external intercostals lift the ribs > Thoracic volume rises > Alveolar pressure falls below atmospheric > Air flows in}}

Quiet **expiration is passive**, from elastic recoil. Forced expiration uses abdominal and internal intercostal muscles. The diaphragm is supplied by the **phrenic nerve** (C3, C4, C5).

## Compliance and surfactant
**Compliance** is how easily the lungs stretch. **Surfactant** lowers surface tension, so alveoli do not collapse at the end of expiration and the work of breathing is lower.

> Real life: Premature infants may lack surfactant and develop **respiratory distress syndrome**. Giving maternal corticosteroids before preterm birth speeds surfactant production.

## Lung volumes
{{chart TV:500 IRV:3000 ERV:1100 RV:1200}}

| Term | Typical adult value |
|---|---|
| Tidal volume (TV) | 500 mL |
| Inspiratory reserve (IRV) | 3000 mL |
| Expiratory reserve (ERV) | 1100 mL |
| Residual volume (RV) | 1200 mL |
| Vital capacity (VC) | TV + IRV + ERV = about 4600 mL |
| Total lung capacity (TLC) | About 5800 mL |

**Minute ventilation** = respiratory rate x tidal volume = 12 x 500 = 6 L per minute. **Alveolar ventilation** subtracts dead space: 12 x (500 - 150) = 4.2 L per minute.

> Key idea: Shallow rapid breathing wastes more of each breath in dead space, so it is less efficient than slow deep breathing.

## Spirometry patterns
| Pattern | FEV1/FVC | FVC | Examples |
|---|---|---|---|
| Obstructive | Low (under 0.7) | Normal or low | Asthma, COPD |
| Restrictive | Normal or high | Low | Pulmonary fibrosis, chest wall disease |

> Try it: What is the alveolar ventilation if respiratory rate is 15 and tidal volume is 400 mL (dead space 150 mL)? || 15 x (400 - 150) = 3750 mL per minute.

## Quiz questions
1. Which muscle is the main muscle of quiet inspiration? Answer: The diaphragm. It is supplied by the phrenic nerve.
2. In obstructive lung disease the FEV1/FVC ratio is... Answer: Reduced. Airflow is limited, so FEV1 falls more than FVC.
3. Surfactant acts by... Answer: Reducing alveolar surface tension. This prevents collapse and eases inflation.', 1200, 15, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 5: The respiratory system'), 'Gas exchange, oxygen transport and control of breathing', 'text', '## Gas pressures
| Location | PO2 (mmHg) | PCO2 (mmHg) |
|---|---|---|
| Inspired air (humidified) | About 150 | 0 |
| Alveolus | About 104 | 40 |
| Arterial blood | About 100 | 40 |
| Mixed venous blood | About 40 | 45 |

Gases move by diffusion down their partial pressure gradients. Diffusion is faster with a larger area, a bigger gradient and a thinner barrier. CO2 diffuses about 20 times more readily than O2.

## Oxygen transport
Most O2 (about 98.5%) is carried on haemoglobin, each gram binding about 1.34 mL. **Oxygen content** = (1.34 x Hb x SaO2) + (0.003 x PaO2).
Example: Hb 15 g/dL, saturation 98% gives about 19.7 mL of O2 per dL of blood.

## The oxygen-haemoglobin dissociation curve
The curve is **sigmoid** because binding to haemoglobin is cooperative.
{{mind Right shift: lower affinity, easier unloading | Raised CO2 | Raised H+ (lower pH) | Raised temperature | Raised 2,3-BPG}}

A **left shift** (higher affinity) occurs with fetal haemoglobin, carbon monoxide, alkalosis and cold.

> Real life: **Carbon monoxide** binds haemoglobin about 200 times more strongly than oxygen and shifts the curve left. Pulse oximetry can look normal, yet tissues are starved of oxygen.

## Carbon dioxide transport
{{chart Bicarbonate:70 Carbamino:23 Dissolved:7}}
In red cells, carbonic anhydrase converts CO2 and water to carbonic acid, which splits into H+ and bicarbonate. Bicarbonate leaves the cell in exchange for chloride (the **chloride shift**).

## Matching ventilation and perfusion (V/Q)
The ideal V/Q ratio is about 0.8. **Shunt** (perfusion without ventilation, e.g. pneumonia) lowers it. **Dead space** (ventilation without perfusion, e.g. pulmonary embolism) raises it.

## Control of breathing
{{flow Chemoreceptors sense PCO2, H+ and PO2 > Medullary respiratory centres integrate > Phrenic and intercostal nerves fire > Ventilation changes}}

- **Central chemoreceptors** (medulla) respond mainly to the H+ produced from CO2. CO2 is the main day-to-day driver of breathing.
- **Peripheral chemoreceptors** (carotid and aortic bodies) respond to low PO2 (below about 60 mmHg), high CO2 and low pH.

> Try it: Which shifts the O2 curve to the right during exercise? || Raised CO2, H+, temperature and 2,3-BPG, so muscles receive more oxygen.

## Quiz questions
1. Most CO2 is carried in blood as... Answer: Bicarbonate. About 70% is carried this way.
2. A right shift of the O2 dissociation curve means... Answer: Lower haemoglobin affinity for O2, so more is unloaded to tissues. It is caused by raised CO2, H+, temperature or 2,3-BPG.
3. Which receptors mainly drive breathing at rest? Answer: Central chemoreceptors responding to CO2 (H+). Peripheral chemoreceptors are mainly triggered by low O2.', 1500, 16, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 6: Renal system, fluids and acid-base balance', 6);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 6: Renal system, fluids and acid-base balance'), 'Kidney anatomy and the nephron', 'text', '## Position and blood supply
The kidneys lie **retroperitoneally** at roughly T12 to L3, the right slightly lower because of the liver. They receive about **20% to 25% of cardiac output** (about 1.1 L per minute).

{{flow Renal artery > Interlobar and arcuate arteries > Afferent arteriole > Glomerulus > Efferent arteriole > Peritubular capillaries and vasa recta > Renal vein}}

## Internal structure
{{stack Capsule | Cortex: glomeruli and convoluted tubules | Medulla: renal pyramids with loops of Henle and collecting ducts | Calyces and pelvis collect urine | Ureter to the bladder}}

## The nephron
Each kidney has about one million nephrons.
{{flow Glomerulus and Bowman capsule > Proximal convoluted tubule > Loop of Henle > Distal convoluted tubule > Collecting duct}}

## The filtration barrier
Three layers separate blood from the urinary space: **fenestrated endothelium**, the **glomerular basement membrane** (negatively charged) and **podocyte** slit diaphragms. Water and small solutes pass; blood cells and most proteins (including albumin, which is negatively charged) do not.

> Real life: Damage to this barrier causes **proteinuria**. Heavy proteinuria with low albumin and oedema is the nephrotic syndrome.

## The juxtaglomerular apparatus
{{mind Juxtaglomerular apparatus | Macula densa: senses NaCl in the distal tubule | Juxtaglomerular cells: release renin | Afferent arteriole: senses stretch (pressure)}}

It links filtration to renin release and tubuloglomerular feedback, helping keep GFR steady.

> Try it: Which structure is the main source of renin? || The juxtaglomerular cells of the afferent arteriole.

## Quiz questions
1. What percentage of cardiac output goes to the kidneys? Answer: About 20% to 25%. They are among the most highly perfused organs.
2. Which cells release renin? Answer: Juxtaglomerular cells. They sense low pressure and sympathetic input.
3. Which of these normally does NOT cross the filtration barrier? Answer: Albumin. It is large and negatively charged.', 1100, 17, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 6: Renal system, fluids and acid-base balance'), 'Filtration, reabsorption and secretion', 'text', '## Glomerular filtration
**GFR** is the volume filtered per minute: about **125 mL per minute** (about 180 L per day). Nearly all of it is reabsorbed, leaving about 1.5 L of urine.

Net filtration pressure is the balance of forces:
{{stack Glomerular hydrostatic pressure about 55 mmHg pushes fluid out | Bowman capsule pressure about 15 mmHg opposes | Plasma oncotic pressure about 30 mmHg opposes | Net filtration pressure about 10 mmHg}}

GFR is held steady when mean arterial pressure is between roughly 80 and 180 mmHg by **autoregulation** (myogenic response and tubuloglomerular feedback).

> Real life: Creatinine is made at a steady rate and is filtered with little tubular handling, so serum creatinine and the **eGFR** estimate kidney function. **Chronic kidney disease** is defined by an eGFR below 60 mL/min/1.73 m2 for 3 months or more (or other markers of kidney damage).

## What each segment does
| Segment | Main handling | Drug target |
|---|---|---|
| Proximal tubule | Reabsorbs about 65% of Na+ and water, all glucose and amino acids, most bicarbonate | SGLT2 inhibitors, acetazolamide |
| Loop of Henle | Descending limb permeable to water; thick ascending limb reabsorbs about 25% of Na+ (NKCC2) | Loop diuretics (furosemide) |
| Distal tubule | Reabsorbs Na+ via NCC; Ca2+ reabsorption regulated by PTH | Thiazide diuretics |
| Collecting duct | Fine control: aldosterone (Na+ in, K+ out) and ADH (water) | Spironolactone, amiloride |

> Key idea: The **countercurrent mechanism** builds a concentration gradient in the medulla (up to about 1200 mOsm/kg). With **ADH**, the collecting duct inserts aquaporin-2 channels and water is drawn out into this gradient, producing concentrated urine.

## Glucose and the renal threshold
Glucose is fully reabsorbed until its transport maximum is exceeded. When plasma glucose passes about 10 mmol/L (180 mg/dL) it appears in urine, which draws water out and causes polyuria in uncontrolled diabetes.

{{flow Filtration at the glomerulus > Reabsorption in the tubule > Secretion into the tubule > Excretion in urine}}

## Hormones on the nephron
{{mind Hormonal control | ADH: water reabsorption (V2 receptors, aquaporin-2) | Aldosterone: Na+ reabsorption, K+ secretion | ANP: opposes Na+ and water retention | PTH: Ca2+ reabsorption, less phosphate reabsorption}}

> Try it: Why do loop diuretics produce a strong diuresis? || They block NKCC2 in the thick ascending limb, which reabsorbs about 25% of filtered Na+ and also weakens the medullary gradient.

## Quiz questions
1. Normal GFR is about... Answer: 125 mL per minute. This is about 180 L per day.
2. Which segment reabsorbs the largest share of filtered sodium and water? Answer: The proximal convoluted tubule. It handles about 65%.
3. ADH makes the collecting duct more permeable to water by... Answer: Inserting aquaporin-2 channels. This lets water follow the medullary gradient.', 1500, 18, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 6: Renal system, fluids and acid-base balance'), 'Fluid, electrolytes and acid-base balance', 'text', '## Body water compartments
Total body water is about **60% of body weight in men** (about 50% in women). For a 70 kg man: 42 L.

{{chart ICF:28 Interstitial:10.5 Plasma:3.5}}

| Compartment | Share of total body water | Dominant ion |
|---|---|---|
| Intracellular (ICF) | About two thirds | K+ (about 150 mmol/L) |
| Extracellular (ECF) | About one third (plasma plus interstitial) | Na+ (about 140 mmol/L) |

## Controlling volume: the RAAS
{{flow Low blood pressure or sodium > Kidney releases renin > Angiotensinogen becomes angiotensin I > ACE in the lungs makes angiotensin II > Vasoconstriction, aldosterone release and thirst > Na+ and water retained and pressure rises}}

> Real life: **ACE inhibitors** and **angiotensin receptor blockers** lower blood pressure and protect the heart and kidney in heart failure and diabetes. They can raise serum K+, so potassium is monitored.

## Controlling osmolality: ADH
Plasma osmolality is held near 285 to 295 mOsm/kg. Osmoreceptors in the hypothalamus detect a rise, causing thirst and ADH release.

> Real life: **Diabetes insipidus** (no ADH or no response) causes large volumes of dilute urine and high plasma sodium. **SIADH** (too much ADH) causes water retention and low plasma sodium.

## Acid-base balance
Blood pH is held at **7.35 to 7.45**. The bicarbonate buffer system is central:
{{stack pH is set by the ratio of bicarbonate to CO2 | Normal PaCO2 35 to 45 mmHg | Normal HCO3- 22 to 26 mmol/L}}

- The **lungs** adjust CO2 within minutes.
- The **kidneys** adjust H+ excretion and bicarbonate regeneration over hours to days.

## Four simple disorders
| Disorder | Primary change | Compensation | Common cause |
|---|---|---|---|
| Respiratory acidosis | CO2 high | Kidneys retain bicarbonate | COPD, opioid overdose |
| Respiratory alkalosis | CO2 low | Kidneys excrete bicarbonate | Hyperventilation, anxiety |
| Metabolic acidosis | Bicarbonate low | Lungs blow off CO2 (deep breathing) | Diabetic ketoacidosis, lactic acidosis, renal failure |
| Metabolic alkalosis | Bicarbonate high | Lungs retain CO2 | Vomiting, diuretics |

The **anion gap** = Na+ minus (Cl- plus HCO3-), normally about 8 to 12. A high gap suggests added acids (ketones, lactate).

> Try it: A patient in diabetic ketoacidosis breathes deeply and quickly. Why? || The lungs compensate for metabolic acidosis by blowing off CO2 to raise pH (Kussmaul breathing).

## Quiz questions
1. Which hormone increases sodium reabsorption in the collecting duct? Answer: Aldosterone. It is released in response to angiotensin II and high potassium.
2. Which is the main extracellular cation? Answer: Sodium. Potassium is the main intracellular cation.
3. Vomiting a lot of stomach acid leads to... Answer: Metabolic alkalosis. H+ and chloride are lost, so bicarbonate rises.', 1600, 19, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 7: Digestion, liver and metabolism', 7);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 7: Digestion, liver and metabolism'), 'The gastrointestinal tract: structure and digestion', 'text', '## The path of food
{{flow Mouth > Oesophagus > Stomach > Duodenum > Jejunum and ileum > Colon > Rectum and anus}}

## The four layers of the gut wall
{{stack Mucosa: epithelium, lamina propria, muscularis mucosae | Submucosa: vessels and Meissner plexus | Muscularis externa: circular and longitudinal muscle with the myenteric (Auerbach) plexus | Serosa or adventitia}}

The enteric nervous system in the wall controls motility and secretion largely by itself, modified by the vagus and sympathetic nerves.

## The stomach
| Cell | Secretes | Role |
|---|---|---|
| Parietal | HCl and intrinsic factor | Acid for digestion and killing microbes; intrinsic factor for vitamin B12 absorption |
| Chief | Pepsinogen | Becomes pepsin in acid; digests protein |
| Mucous neck | Mucus and bicarbonate | Protects the lining |
| G cell | Gastrin | Stimulates acid secretion |
| ECL cell | Histamine | Stimulates parietal cells (H2 receptors) |

> Real life: **Proton pump inhibitors** block the H+/K+ ATPase of parietal cells and reduce acid. **Pernicious anaemia** results from loss of intrinsic factor, causing vitamin B12 deficiency.

## Digestion and absorption in the small intestine
The small intestine (about 6 m) is folded into villi covered with microvilli, giving a huge absorptive area.
| Nutrient | Enzymes | Absorbed as |
|---|---|---|
| Carbohydrate | Salivary and pancreatic amylase, brush-border enzymes (lactase, sucrase, maltase) | Glucose, galactose (SGLT1) and fructose (GLUT5) |
| Protein | Pepsin, pancreatic trypsin and chymotrypsin, peptidases | Amino acids, di- and tripeptides |
| Fat | Pancreatic lipase with bile salts | Micelles, then chylomicrons into lymph (lacteals) |

> Key idea: Fats are the exception: after absorption they travel in **lymph** and reach the blood through the thoracic duct, not directly via the portal vein.

## The large intestine
It absorbs water and electrolytes, hosts the gut microbiome (which makes some vitamin K) and stores faeces until defecation.

> Try it: Which vitamin needs intrinsic factor for absorption, and where is it absorbed? || Vitamin B12, in the terminal ileum.

## Quiz questions
1. Which cell secretes intrinsic factor? Answer: The parietal cell. It also secretes hydrochloric acid.
2. Fat absorbed in the intestine first enters the... Answer: Lymphatic vessels (lacteals) as chylomicrons. They later reach the blood.
3. Where is vitamin B12 absorbed? Answer: The terminal ileum. It requires intrinsic factor.', 1300, 20, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 7: Digestion, liver and metabolism'), 'Liver, pancreas, bile and gut hormones', 'text', '## The liver
The liver weighs about 1.5 kg and receives a **dual blood supply**: about 75% from the **hepatic portal vein** (nutrient-rich blood from the gut) and about 25% from the hepatic artery.

{{mind Liver functions | Metabolism of carbohydrate, fat and protein | Bile production | Detoxification of drugs and toxins | Synthesis of albumin and clotting factors | Storage of glycogen, iron, vitamins A, D and B12 | Urea formation from ammonia}}

## Bile and the enterohepatic circulation
Bile (bile acids, cholesterol, phospholipids, bilirubin) is made by hepatocytes, stored and concentrated in the gallbladder and released into the duodenum to emulsify fat. About 95% of bile acids are reabsorbed in the ileum and returned to the liver.

## Bilirubin pathway
{{flow Haem from old red cells > Unconjugated bilirubin carried on albumin > Liver conjugates it > Excreted in bile > Gut bacteria make urobilinogen > Stercobilin gives stool its brown colour}}

| Jaundice type | Problem | Typical findings |
|---|---|---|
| Pre-hepatic | Excess haemolysis | Unconjugated bilirubin high |
| Hepatic | Liver cell injury (hepatitis, cirrhosis) | Mixed pattern |
| Post-hepatic (obstructive) | Bile duct blocked (stone, tumour) | Pale stools, dark urine, itching |

## The pancreas
- **Exocrine:** acinar cells make digestive enzymes (amylase, lipase, proteases); duct cells add bicarbonate to neutralise stomach acid.
- **Endocrine (islets):** alpha cells make glucagon, beta cells make insulin, delta cells make somatostatin.

> Real life: Gallstones that block the common bile duct or the pancreatic duct cause **biliary colic**, jaundice or **acute pancreatitis**.

## Gut hormones
| Hormone | Released by | Trigger | Action |
|---|---|---|---|
| Gastrin | G cells | Food, stretch, protein | Increases stomach acid |
| Cholecystokinin (CCK) | I cells | Fat and protein in duodenum | Gallbladder contracts; pancreatic enzymes released |
| Secretin | S cells | Acid in duodenum | Pancreas releases bicarbonate |
| GIP | K cells | Glucose and fat | Boosts insulin release |

> Try it: Acid arrives in the duodenum. Which hormone is released, and what is the effect? || Secretin, which makes the pancreas release bicarbonate to neutralise the acid.

## Quiz questions
1. Which vessel brings most blood to the liver? Answer: The hepatic portal vein. It carries nutrients absorbed from the gut.
2. Obstructive jaundice typically produces... Answer: Pale stools and dark urine. Conjugated bilirubin cannot reach the gut and spills into the blood and urine.
3. CCK is released in response to... Answer: Fat and protein in the duodenum. It contracts the gallbladder.', 1300, 21, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 7: Digestion, liver and metabolism'), 'Energy metabolism and the fed and fasting states', 'text', '## Making ATP from glucose
{{flow Glucose > Glycolysis in the cytoplasm: net 2 ATP > Pyruvate > Acetyl-CoA > Krebs cycle in the mitochondrial matrix > Electron transport chain on the inner membrane > About 30 to 32 ATP in total}}

| Stage | Where | Main output |
|---|---|---|
| Glycolysis | Cytoplasm | 2 ATP, 2 NADH, 2 pyruvate |
| Pyruvate to acetyl-CoA | Mitochondrion | NADH, CO2 |
| Krebs cycle | Mitochondrial matrix | NADH, FADH2, CO2 |
| Oxidative phosphorylation | Inner mitochondrial membrane | Most of the ATP; needs O2 |

Without oxygen, glycolysis continues but pyruvate becomes **lactate**, yielding only 2 ATP per glucose.

> Real life: In severe shock or sepsis, tissues without oxygen make lactate and a **lactic acidosis** develops.

## Energy content of foods
{{chart Fat:9 Alcohol:7 Carbohydrate:4 Protein:4}}
(kcal per gram.) Basal metabolic rate is roughly 1 kcal per kg per hour, so about 1700 kcal per day for a 70 kg adult.

## Fed state: insulin dominates
{{stack Insulin rises after a meal | Glucose uptake by muscle and fat through GLUT4 | Glycogen synthesis and fat storage | Protein synthesis}}

## Fasting state: glucagon and other hormones dominate
{{timeline Hours 0 to 4: absorbed nutrients used | Hours 4 to 24: liver glycogen breakdown (glycogenolysis) | Day 1 onwards: gluconeogenesis from lactate, amino acids and glycerol | Days 2 to 3 onwards: fat breakdown and ketone production | Prolonged fasting: the brain uses ketones for much of its energy}}

> Key idea: **Muscle glycogen** is used only by the muscle itself, because muscle lacks glucose-6-phosphatase and cannot release free glucose into the blood. Liver glycogen maintains blood glucose.

## Diabetes in physiological terms
- **Type 1:** autoimmune loss of beta cells, so there is absolute insulin deficiency. Without insulin the body behaves as if starving: unrestrained lipolysis and ketone production can cause **diabetic ketoacidosis**.
- **Type 2:** insulin resistance with a relative deficiency of insulin, strongly linked to obesity.

> Try it: Why can athletes not rely on muscle glycogen to maintain blood glucose? || Muscle cells lack glucose-6-phosphatase, so they cannot release glucose into the blood.

## Quiz questions
1. Where does the Krebs cycle take place? Answer: The mitochondrial matrix. It generates NADH and FADH2.
2. During an overnight fast, blood glucose is first maintained by... Answer: Liver glycogenolysis. Gluconeogenesis takes over as glycogen runs down.
3. Which tissue cannot release glucose from its glycogen store to the blood? Answer: Skeletal muscle. It lacks glucose-6-phosphatase.', 1400, 22, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 8: Endocrine and reproductive systems', 8);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 8: Endocrine and reproductive systems'), 'Hormones and the hypothalamic-pituitary axis', 'text', '## Types of hormone
| Class | Examples | Receptor and speed |
|---|---|---|
| Peptides and proteins | Insulin, GH, ADH | Cell surface receptor, second messengers, fast |
| Steroids | Cortisol, aldosterone, oestrogen, testosterone | Intracellular receptor, changes gene expression, slower |
| Thyroid hormones | T3, T4 | Intracellular receptor, slow and long-lasting |
| Amines | Adrenaline, noradrenaline | Cell surface receptors, very fast |

## The pituitary gland
The **hypothalamus** controls the pituitary. It acts on the **anterior pituitary** through releasing hormones carried in the **hypophyseal portal system**, and it makes **ADH and oxytocin**, which are released directly from the **posterior pituitary**.

{{stack Hypothalamus: TRH, CRH, GnRH, GHRH, somatostatin, dopamine | Anterior pituitary: GH, prolactin, ACTH, TSH, FSH, LH | Target glands: thyroid, adrenal cortex, gonads | Hormone output feeds back to hypothalamus and pituitary}}

## Axes and their targets
| Pituitary hormone | Target and effect |
|---|---|
| ACTH | Adrenal cortex: cortisol |
| TSH | Thyroid: T3 and T4 |
| FSH and LH | Gonads: gametes and sex hormones |
| GH | Liver (IGF-1), growth, metabolism |
| Prolactin | Breast: milk synthesis; inhibited by dopamine |
| ADH | Kidney: water retention |
| Oxytocin | Uterine contraction, milk ejection |

## Negative feedback: the long loop
{{flow Hypothalamus releases TRH > Pituitary releases TSH > Thyroid releases T3 and T4 > High T3 and T4 suppress the hypothalamus and pituitary}}

> Key idea: In primary gland failure, the pituitary hormone is **high** (loss of feedback). In pituitary failure, both pituitary and gland hormones are **low**. Measuring both tells you where the problem is.

## Clinical examples
> Real life: A pituitary adenoma secreting growth hormone causes **acromegaly** in adults (enlarged hands, feet and jaw). A prolactin-secreting adenoma causes milk production and menstrual disturbance, and is treated with dopamine agonists.

> Try it: A patient has low T4 and a very high TSH. Is the problem in the thyroid or the pituitary? || The thyroid (primary hypothyroidism), because the pituitary is responding appropriately with more TSH.

## Quiz questions
1. Which hormones are released from the posterior pituitary? Answer: ADH and oxytocin. They are made in the hypothalamus.
2. Which hormone stimulates the adrenal cortex to release cortisol? Answer: ACTH. It comes from the anterior pituitary.
3. In primary hypothyroidism, TSH is... Answer: High. Low T4 removes negative feedback.', 1200, 23, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 8: Endocrine and reproductive systems'), 'Thyroid, adrenal, calcium and glucose control', 'text', '## Thyroid
Follicular cells take up iodide and make thyroglobulin; T4 is the main output and is converted to the more active **T3** in tissues. Thyroid hormones raise metabolic rate, heart rate and are essential for brain development in the fetus and child.

| Condition | Cause (example) | Features |
|---|---|---|
| Hypothyroidism | Autoimmune thyroiditis (Hashimoto) | Fatigue, weight gain, cold intolerance, slow heart rate, high TSH |
| Hyperthyroidism | Graves disease (antibody stimulates the TSH receptor) | Weight loss, heat intolerance, palpitations, tremor, low TSH |

## Adrenal gland
{{stack Zona glomerulosa: aldosterone (salt) | Zona fasciculata: cortisol (sugar) | Zona reticularis: androgens (sex) | Medulla: adrenaline and noradrenaline}}

**Cortisol** follows a daily rhythm (peak in the morning). It raises blood glucose, supports blood pressure and suppresses inflammation.

| Condition | Features |
|---|---|
| Cushing syndrome (excess cortisol) | Central obesity, moon face, purple striae, hypertension, high glucose |
| Addison disease (cortisol and aldosterone deficiency) | Fatigue, low blood pressure, low sodium, high potassium, skin pigmentation |

> Real life: Patients on long-term steroid tablets must not stop them suddenly. The adrenal glands are suppressed, and an **adrenal crisis** can follow.

## Calcium balance
{{flow Blood calcium falls > Parathyroid glands release PTH > Bone resorption rises and kidney retains Ca2+ > Kidney makes active vitamin D > Gut absorbs more Ca2+ > Calcium returns toward normal}}

Normal total calcium is about 2.2 to 2.6 mmol/L. **Vitamin D** is made in the skin by UVB, hydroxylated in the liver and then in the kidney to active calcitriol.

> Real life: Low calcium causes **tetany**, tingling around the mouth and cramps. Tapping over the facial nerve can produce twitching (Chvostek sign).

## Glucose control
{{mind Hormones and glucose | Insulin lowers blood glucose | Glucagon raises it | Cortisol raises it | Adrenaline raises it | Growth hormone raises it}}

Insulin is the only hormone that lowers blood glucose, while several raise it. This is why hypoglycaemia is more dangerous and must be treated fast.

> Try it: Which hormone from the adrenal cortex retains sodium and lowers potassium? || Aldosterone.

## Quiz questions
1. Which hormone is the main active thyroid hormone at tissue level? Answer: T3. T4 is converted to T3 in the tissues.
2. Addison disease causes which electrolyte pattern? Answer: Low sodium and high potassium. Aldosterone is deficient.
3. PTH raises blood calcium by... Answer: Increasing bone resorption, kidney reabsorption and vitamin D activation. These all increase calcium availability.', 1500, 24, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 8: Endocrine and reproductive systems'), 'The reproductive system and the menstrual cycle', 'text', '## Male reproductive physiology
{{flow Hypothalamus releases GnRH > Pituitary releases LH and FSH > LH makes Leydig cells produce testosterone > FSH supports Sertoli cells and spermatogenesis}}

- **Seminiferous tubules** make sperm over about 64 to 74 days. **Sertoli cells** nourish developing sperm and form the blood-testis barrier.
- Testes sit outside the body because sperm production needs a temperature a few degrees below core.
- Sperm mature in the epididymis and are carried by the vas deferens. The seminal vesicles, prostate and bulbourethral glands add the fluid of semen.

## The menstrual cycle (28-day example)
{{timeline Days 1 to 5: menstruation as the endometrium sheds | Days 1 to 13: follicular phase, FSH grows follicles, oestrogen rises, endometrium proliferates | Around day 14: LH surge triggers ovulation | Days 15 to 28: luteal phase, corpus luteum makes progesterone, endometrium becomes secretory | Fall in progesterone if no pregnancy: menstruation again}}

| Hormone | Source | Main effect |
|---|---|---|
| FSH | Anterior pituitary | Recruits and grows follicles |
| Oestrogen | Granulosa cells of the follicle | Rebuilds endometrium; triggers the LH surge |
| LH | Anterior pituitary | Ovulation; maintains corpus luteum |
| Progesterone | Corpus luteum | Prepares and maintains the endometrium |

> Key idea: Oestrogen is normally **negative feedback** to the pituitary, but a sustained high level around mid-cycle produces **positive feedback** and the LH surge.

## Fertilisation and early pregnancy
{{flow Ovulation > Fertilisation in the ampulla of the uterine tube > Cleavage and blastocyst > Implantation about 6 to 7 days after fertilisation > hCG from the trophoblast keeps the corpus luteum active > Placenta takes over hormone production at about 8 to 12 weeks}}

**hCG** is detected by pregnancy tests. After birth, **prolactin** drives milk production and **oxytocin** drives milk ejection (let-down).

> Real life: The combined oral contraceptive supplies oestrogen and progestogen. Their negative feedback suppresses FSH and LH, so no follicle matures and ovulation does not occur.

> Try it: What triggers ovulation? || A surge of LH caused by the sustained high oestrogen level from the mature follicle.

## Quiz questions
1. Which cells in the testis produce testosterone? Answer: Leydig cells. They respond to LH.
2. Ovulation is triggered by... Answer: A surge of LH. High oestrogen gives positive feedback.
3. Which hormone keeps the corpus luteum active in early pregnancy? Answer: hCG. It is secreted by the trophoblast.', 1400, 25, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), 'Module 9: Immunity and integration', 9);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 9: Immunity and integration'), 'The immune system', 'text', '## Two lines of defence
{{mind Immunity | Barriers: skin, mucus, cilia, stomach acid, lysozyme | Innate immunity: fast, non-specific | Adaptive immunity: slower, specific, with memory | Lymphoid organs: marrow, thymus, spleen, lymph nodes}}

## Innate immunity
Key players are **neutrophils** and **macrophages** (phagocytes), **NK cells**, the **complement** system and inflammation.
{{flow Tissue injury or microbe > Macrophages release cytokines > Vasodilation and more permeable vessels > Neutrophils arrive from blood > Microbe is engulfed and killed}}

The five cardinal signs of inflammation are redness, heat, swelling, pain and loss of function.

> Real life: **Fever** occurs when cytokines (IL-1, IL-6, TNF) cause the hypothalamus to raise its temperature set point via prostaglandin E2. Paracetamol and NSAIDs reduce prostaglandin production and lower the set point.

## Adaptive immunity
| Cell | Role |
|---|---|
| Dendritic cell and macrophage | Present antigen on MHC molecules |
| CD4 helper T cell | Recognises MHC II; coordinates other immune cells |
| CD8 cytotoxic T cell | Recognises MHC I; kills infected cells |
| B cell and plasma cell | Make antibodies |
| Memory cells | Faster, stronger response on re-exposure |

{{flow Antigen presented to helper T cell > B cell activated > Plasma cells make antibodies > Antibodies neutralise and mark microbes > Memory B cells remain}}

| Antibody | Key feature |
|---|---|
| IgM | First made, strong complement activation |
| IgG | Most abundant; crosses the placenta |
| IgA | In secretions, tears, milk and gut |
| IgE | Allergy and parasites |

> Key idea: **Vaccines** train adaptive immunity without disease: the first exposure makes a slow primary response, and later exposure gives a fast, large secondary response.

## When immunity goes wrong
| Hypersensitivity type | Mechanism | Example |
|---|---|---|
| Type I | IgE on mast cells | Anaphylaxis, hay fever |
| Type II | Antibody against cell surface antigens | Haemolytic transfusion reaction, Graves disease |
| Type III | Immune complexes | Lupus |
| Type IV | T cell mediated, delayed | Contact dermatitis, tuberculin test |

> Real life: **HIV** infects CD4 T cells. As their number falls, the immune system loses coordination and opportunistic infections appear.

> Try it: Which immunoglobulin crosses the placenta to protect the newborn? || IgG.

## Quiz questions
1. Which cell type presents antigen to CD4 helper T cells on MHC II? Answer: Antigen-presenting cells such as dendritic cells. They link innate and adaptive immunity.
2. Which antibody class is mainly involved in allergy? Answer: IgE. It binds mast cells.
3. HIV mainly depletes which cells? Answer: CD4 T cells. This weakens coordination of the immune response.', 1400, 26, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 9: Immunity and integration'), 'Putting it together: haemorrhagic shock', 'text', '## A case
A 28-year-old man arrives after a stab wound to the thigh. He is pale, anxious and sweating. Pulse 115 per minute, blood pressure 110/85, respiratory rate 24, cool hands and low urine output.

Estimated blood loss is about 1.2 L, roughly 25% of his blood volume. Every system you have studied is now involved.

## Step 1: the cardiovascular fall
{{flow Blood loss > Venous return falls > Preload and stroke volume fall > Cardiac output falls > Mean arterial pressure falls}}

## Step 2: the body fights back
{{cycle Baroreceptors fire less > Sympathetic surge: heart rate, contractility and vasoconstriction rise > Adrenaline released > Renin, angiotensin II, aldosterone and ADH released > Kidneys conserve salt and water > Fluid shifts from tissues into capillaries}}

| System | Response | Sign at the bedside |
|---|---|---|
| Nervous | Sympathetic outflow | Anxiety, sweating, pale cool skin |
| Cardiac | Higher rate and contractility | Fast pulse |
| Vascular | Arteriolar and venous constriction | Cold peripheries, narrow pulse pressure |
| Renal | RAAS and ADH | Low urine output |
| Respiratory | Hypoperfusion and acidosis | Fast breathing |
| Endocrine | Cortisol, glucagon | High blood glucose |

## Step 3: decompensation
If bleeding continues, compensation fails. Tissues without oxygen make lactate, causing **metabolic acidosis**. Cell membranes and the Na+/K+ pump fail, vessels dilate and the heart is starved of oxygen.

| Class | Blood loss | Typical findings |
|---|---|---|
| I | Under 15% (up to about 750 mL) | Often normal; mild anxiety |
| II | 15% to 30% (750 to 1500 mL) | Fast pulse, fast breathing, narrow pulse pressure, blood pressure still normal |
| III | 30% to 40% (1500 to 2000 mL) | Low blood pressure, confusion, very low urine output |
| IV | Over 40% (over 2000 mL) | Lethargy, collapse, immediate threat to life |

Our patient fits **class II**: compensation is working, and the blood pressure is still normal.

> Key idea: **Blood pressure falls late** in young healthy people because of strong compensation. A fast pulse, fast breathing and a narrow pulse pressure are the earlier warnings.

## Step 4: treatment follows from physiology
- **Stop the bleeding** (pressure, surgery): treat the cause.
- **Restore volume** with blood products to raise preload and oxygen-carrying capacity.
- **Keep warm and oxygenated**, because hypothermia, acidosis and clotting failure worsen each other.

> Try it: Why is crystalloid alone a poor choice for major haemorrhage? || It restores volume but carries no oxygen and no clotting factors, and large amounts dilute them further.

## Quiz questions
1. Which sign usually appears early in haemorrhage? Answer: A fast pulse. The sympathetic system compensates for falling stroke volume.
2. Why do the kidneys produce little urine in shock? Answer: Falling perfusion and high ADH, aldosterone and sympathetic activity conserve fluid. This is a protective response.
3. Why does lactic acidosis develop? Answer: Tissues without enough oxygen switch to anaerobic metabolism. Pyruvate becomes lactate.', 1500, 27, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='human-anatomy-physiology-medicine') AND title='Module 9: Immunity and integration'), 'Anatomy and Physiology final exam', 'text', '## Final exam
Answer every question, then mark the lesson complete.

## Quiz questions
1. In the anatomical position, which term describes the elbow relative to the wrist? Answer: Proximal. It is nearer to the trunk.
2. Which type of feedback drives the LH surge before ovulation? Answer: Positive feedback. Sustained high oestrogen increases LH release.
3. What is the role of ATP in the cross-bridge cycle that is lost in rigor mortis? Answer: It detaches the myosin head from actin. Without ATP the heads stay bound.
4. Which ion influx starts neurotransmitter release at a nerve terminal? Answer: Calcium (Ca2+). It triggers vesicle fusion.
5. Which pathway carries pain and temperature from the body to the brain? Answer: The spinothalamic tract. It crosses in the spinal cord.
6. What does the QRS complex on an ECG represent? Answer: Ventricular depolarisation. The T wave is repolarisation.
7. What is the mean arterial pressure for a blood pressure of 120/80? Answer: About 93 mmHg. MAP = diastolic + one third of pulse pressure.
8. Which finding best matches an obstructive spirometry pattern? Answer: FEV1/FVC below 0.7. Airflow is limited.
9. Which of these shifts the oxygen dissociation curve to the right? Answer: Raised CO2, H+ and temperature. They lower affinity so more O2 is released.
10. Where does the largest share of sodium reabsorption occur in the nephron? Answer: The proximal convoluted tubule. About 65% is reabsorbed there.
11. A patient with vomiting for several days is most likely to develop which acid-base disorder? Answer: Metabolic alkalosis. Gastric acid and chloride are lost.
12. Which cell secretes intrinsic factor? Answer: The gastric parietal cell. It is needed to absorb vitamin B12.
13. Which tissue cannot release glucose from its glycogen into the blood? Answer: Skeletal muscle. It lacks glucose-6-phosphatase.
14. A patient has a low T4 and a high TSH. Where is the problem? Answer: The thyroid gland. The pituitary is responding appropriately.
15. Which immunoglobulin can cross the placenta? Answer: IgG. It gives the newborn passive immunity.
16. In early haemorrhagic shock in a young adult, which sign is most reliable? Answer: A fast pulse with fast breathing. Blood pressure falls late.', 0, 28, 0);
