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
