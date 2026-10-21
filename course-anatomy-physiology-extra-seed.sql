-- Anatomy and Physiology (Medical Level): 4 extra modules (11 to 14) with 14 lessons, 4 checkpoint quizzes and an extension exam.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-anatomy-physiology-extra-seed.sql
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.
-- Needs course-anatomy-physiology-seed.sql to have been run first.

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 11: The special senses', 11);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 11: The special senses'), 'The eye and vision', 'text', '{{photo eye}}
## Structure: three layers
| Layer | Parts | Job |
|---|---|---|
| **Fibrous (outer)** | Sclera, **cornea** | Protection and shape; the cornea gives about two thirds of the eye''s focusing power |
| **Vascular (middle)** | **Choroid**, ciliary body, **iris** | Blood supply, lens control, pupil size |
| **Neural (inner)** | **Retina** | Detects light |

The **lens** sits behind the iris and is held by **suspensory ligaments** attached to the **ciliary muscle**. The **aqueous humour** (front) is made by the ciliary body and drains through the **canal of Schlemm**. The **vitreous humour** fills the large rear chamber.

### Focusing: accommodation
{{flow Near object > Ciliary muscle contracts > Suspensory ligaments slacken > Lens rounds up > Greater refraction > Image focused on the retina}}
For distant objects the ciliary muscle relaxes and the lens flattens. With age the lens stiffens (**presbyopia**), so near reading becomes hard.

### Pupil reflexes
Bright light: **parasympathetic** (CN III) constricts the pupil (miosis). Dim light or fear: **sympathetic** dilates it (mydriasis).

## The retina and phototransduction
| Cell | Number | Role |
|---|---|---|
| **Rods** | about 120 million | Dim light, black and white, periphery; contain rhodopsin |
| **Cones** | about 6 million | Bright light, colour (three types: red, green, blue), sharp detail; concentrated in the **fovea** |

In darkness photoreceptors are depolarised and release glutamate continuously. **Light** converts retinal in rhodopsin, activating **transducin** and **phosphodiesterase**, so cGMP falls, channels close and the cell **hyperpolarises**. Light therefore *reduces* neurotransmitter release.

{{flow Photoreceptor > Bipolar cell > Ganglion cell > Optic nerve (CN II) > Optic chiasm > Lateral geniculate nucleus > Occipital cortex}}

At the **optic chiasm** fibres from the **nasal** half of each retina cross, so the right visual cortex sees the **left** visual field.

### Common conditions
| Condition | Problem | Correction or treatment |
|---|---|---|
| **Myopia** | Eyeball too long; distant objects blurred | Concave lens |
| **Hypermetropia** | Eyeball too short; near objects blurred | Convex lens |
| **Cataract** | Lens becomes cloudy | Lens replacement surgery |
| **Glaucoma** | Raised intraocular pressure damages the optic nerve | Drops that lower pressure, laser or surgery |
| **Night blindness** | Vitamin A deficiency affects rhodopsin | Vitamin A |

> Real life: Colour blindness (usually red-green) is **X-linked recessive**, so it is more common in men.
> Try it: Which cells are responsible for colour vision and sharp detail? || Cones, concentrated in the fovea.', 1080, 46, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 11: The special senses'), 'The ear: hearing and balance', 'text', '{{photo ear}}
## Three parts of the ear
| Part | Structures | Job |
|---|---|---|
| **Outer** | Pinna, external auditory canal, **tympanic membrane** | Collects sound |
| **Middle** | Ossicles (**malleus, incus, stapes**), **Eustachian tube** | Amplifies and equalises pressure |
| **Inner** | **Cochlea**, vestibule, **semicircular canals** | Hearing and balance |

### How we hear
{{flow Sound waves > Tympanic membrane vibrates > Malleus > Incus > Stapes at the oval window > Perilymph waves in the cochlea > Basilar membrane moves > Hair cells bend > Cochlear nerve (CN VIII) > Auditory cortex}}

The ossicles raise pressure about **20 times** because the eardrum is much larger than the oval window. **High pitches** vibrate the base of the basilar membrane, **low pitches** the apex.

### Balance
| Structure | Detects |
|---|---|
| **Utricle and saccule** (otolith organs) | Linear acceleration and head tilt |
| **Three semicircular canals** | Rotation in three planes |

Hair cells bend and signal through CN VIII to the **vestibular nuclei** and **cerebellum**, which coordinate eye movement (the **vestibulo-ocular reflex**) and posture.

### Clinical links
| Condition | Key point |
|---|---|
| **Conductive hearing loss** | Problem in the outer or middle ear (wax, otitis media, otosclerosis) |
| **Sensorineural hearing loss** | Hair cells or nerve damaged (noise, ageing, some drugs) |
| **BPPV** | Dislodged otoliths cause brief spinning with head movement |
| **Otitis media** | Middle ear infection, common in children because the Eustachian tube is short and horizontal |

> Tip: The **Rinne** and **Weber** tuning-fork tests tell conductive from sensorineural loss.
> Try it: Which three bones transmit sound across the middle ear? || Malleus, incus and stapes.', 1080, 47, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 11: The special senses'), 'Taste, smell and general sensation', 'text', '## Chemical senses
| Sense | Receptors | Nerve | Notes |
|---|---|---|---|
| **Smell** | Olfactory neurons in the roof of the nasal cavity | CN I | The only sense that reaches the cortex without passing through the thalamus first; strongly linked to memory and emotion |
| **Taste** | Taste buds on papillae of the tongue | CN VII (front two thirds), CN IX (back third), CN X | Five basic tastes: **sweet, sour, salty, bitter, umami** |

Most of what we call "flavour" is smell. A blocked nose dulls taste.

## Somatosensation
| Receptor | Detects | Adapts |
|---|---|---|
| **Free nerve endings** | Pain, temperature | Slowly or not at all |
| **Meissner''s corpuscle** | Light touch | Rapidly |
| **Pacinian corpuscle** | Deep pressure, vibration | Rapidly |
| **Merkel cells** | Sustained touch, texture | Slowly |
| **Ruffini endings** | Skin stretch | Slowly |
| **Muscle spindle / Golgi tendon organ** | Muscle length / tension (proprioception) | - |

{{flow Stimulus > Receptor potential > Action potentials > Spinal cord > Thalamus > Somatosensory cortex}}

### Pain
- **Fast pain** (sharp): myelinated A-delta fibres. **Slow pain** (dull, burning): unmyelinated C fibres.
- **Referred pain**: visceral pain felt in a skin area that shares the same spinal segment, for example heart attack pain in the left arm and jaw.
- The **gate control theory** explains why rubbing a bruise helps: touch fibres inhibit pain transmission in the spinal cord.

> Real life: Opioids act on receptors in the descending pain pathway. Paracetamol and NSAIDs reduce prostaglandins at the site of injury.
> Try it: Why does pain from a heart attack appear in the arm? || Referred pain: heart and arm afferents enter the same spinal segments (T1 to T4).', 900, 48, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 11 checkpoint quiz: The special senses', 'Anatomy and Physiology', 'Check your understanding of this module.', '[{"prompt":"Which structure gives most of the eye''s refractive power?","options":["Lens","Cornea","Vitreous humour","Iris"],"correct_index":1,"explanation":"The cornea provides about two thirds of focusing power."},{"prompt":"When you look at a near object, the ciliary muscle...","options":["Relaxes and the lens flattens","Contracts and the lens becomes rounder","Contracts and the lens flattens","Relaxes and the lens rounds"],"correct_index":1,"explanation":"Contraction slackens the suspensory ligaments so the lens rounds up."},{"prompt":"In the dark, photoreceptors are...","options":["Hyperpolarised and silent","Depolarised and releasing glutamate","Dead","Firing action potentials"],"correct_index":1,"explanation":"Light causes hyperpolarisation and less glutamate release."},{"prompt":"Which bone of the middle ear sits at the oval window?","options":["Malleus","Incus","Stapes","Cochlea"],"correct_index":2,"explanation":"The stapes footplate fits the oval window."},{"prompt":"Which nerve carries hearing and balance information?","options":["CN VII","CN VIII","CN IX","CN X"],"correct_index":1,"explanation":"The vestibulocochlear nerve is CN VIII."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 11 checkpoint quiz: The special senses');
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 11: The special senses'), 'Checkpoint quiz: The special senses', 'quiz', (SELECT id FROM quizzes WHERE title='Module 11 checkpoint quiz: The special senses'), 300, 49, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 12: The musculoskeletal system in detail', 12);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 12: The musculoskeletal system in detail'), 'The axial skeleton', 'text', '{{photo skeleton}}
The skeleton has **206 bones**: **80 axial** (skull, vertebral column, thorax) and **126 appendicular** (limbs and girdles).

## The skull
| Group | Bones |
|---|---|
| **Cranium** (8) | Frontal, 2 parietal, 2 temporal, occipital, sphenoid, ethmoid |
| **Face** (14) | 2 maxillae, mandible, 2 zygomatic, 2 nasal, 2 lacrimal, 2 palatine, 2 inferior nasal conchae, vomer |

The **foramen magnum** (occipital bone) lets the spinal cord pass. Sutures (coronal, sagittal, lambdoid) join skull bones. In infants, soft **fontanelles** allow growth and birth.

## The vertebral column
{{stack Cervical C1 to C7 (7) | Thoracic T1 to T12 (12) | Lumbar L1 to L5 (5) | Sacrum (5 fused) | Coccyx (4 fused)}}
There are **33 vertebrae** (24 mobile). The spine has four curves: cervical and lumbar curve forwards (**lordosis**); thoracic and sacral curve backwards (**kyphosis**).

| Vertebra | Special feature |
|---|---|
| **Atlas (C1)** | No body; carries the skull ("yes" nod) |
| **Axis (C2)** | Has the **dens** (odontoid peg); allows the "no" rotation |
| **Thoracic** | Articular facets for ribs |
| **Lumbar** | Large bodies for weight-bearing |

**Intervertebral discs** have a gelatinous **nucleus pulposus** inside a tough **annulus fibrosus**. A **herniated disc** presses on a nerve root, causing sciatica when L4 to S3 roots are affected.

## The thoracic cage
{{photo ribcage}}
12 pairs of ribs: **true** (1 to 7, attach directly to the sternum), **false** (8 to 10, join the costal cartilage above), **floating** (11 and 12). The **sternum** has a manubrium, body and xiphoid process. The **sternal angle** (at the level of rib 2 and T4/T5) is a key landmark for counting ribs.

> Real life: A **lumbar puncture** is done between L3 and L4 or L4 and L5, below the end of the spinal cord (L1 to L2), so the cord is not damaged.
> Try it: How many cervical vertebrae are there? || Seven (C1 to C7).', 1080, 50, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 12: The musculoskeletal system in detail'), 'The appendicular skeleton and joints', 'text', '## Girdles and limbs
| Region | Bones |
|---|---|
| **Pectoral girdle** | Clavicle, scapula |
| **Upper limb** | Humerus, radius, ulna, 8 carpals, 5 metacarpals, 14 phalanges |
| **Pelvic girdle** | Hip bone (ilium, ischium, pubis) fused with the sacrum |
| **Lower limb** | Femur, patella, tibia, fibula, 7 tarsals, 5 metatarsals, 14 phalanges |

The **radius** is lateral (thumb side) and the **tibia** is medial and weight-bearing.

## Key joints
| Joint | Type | Movements | Clinical note |
|---|---|---|---|
| **Shoulder** (glenohumeral) | Ball and socket | All planes; widest range | Most commonly dislocated joint (anteriorly) |
| **Elbow** | Hinge | Flexion, extension | Supracondylar fracture can damage the brachial artery |
| **Hip** | Deep ball and socket | Stable with wide movement | Neck of femur fractures common in older women |
| **Knee** | Modified hinge | Flexion, extension, slight rotation | ACL, PCL, menisci, collateral ligaments |
| **Ankle** | Hinge | Dorsiflexion, plantarflexion | Lateral sprain is the commonest ankle injury |

### The knee in detail
- **ACL** stops the tibia sliding forwards. **PCL** stops it sliding backwards.
- **Medial and lateral menisci** are C-shaped cartilage shock absorbers.
- The "unhappy triad" is ACL, MCL and medial meniscus injury.

### Movements to know
| Term | Meaning |
|---|---|
| Flexion / extension | Decrease / increase the angle |
| Abduction / adduction | Away from / towards the midline |
| Medial / lateral rotation | Turning inwards / outwards |
| Pronation / supination | Palm down / palm up |
| Dorsiflexion / plantarflexion | Foot up / foot down |

> Careful: A hip fracture is a surgical emergency in older people because of the risk of avascular necrosis of the femoral head.
> Try it: Which ligament stops the tibia from sliding forwards on the femur? || The anterior cruciate ligament (ACL).', 1080, 51, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 12: The musculoskeletal system in detail'), 'Major muscle groups and their actions', 'text', '{{photo muscles}}
## Muscles at a glance
| Region | Muscle | Main action | Nerve |
|---|---|---|---|
| Shoulder | **Deltoid** | Abducts the arm | Axillary |
| Chest | **Pectoralis major** | Adducts and medially rotates the arm | Pectoral nerves |
| Back | **Latissimus dorsi**, **trapezius** | Extends and adducts the arm; moves the scapula | Thoracodorsal; accessory (CN XI) |
| Upper arm | **Biceps brachii** | Flexes elbow, supinates | Musculocutaneous |
| Upper arm | **Triceps brachii** | Extends elbow | Radial |
| Abdomen | **Rectus abdominis**, obliques | Flex the trunk, compress abdomen | Intercostal and iliohypogastric |
| Hip | **Gluteus maximus** | Extends the hip | Inferior gluteal |
| Hip | **Gluteus medius** | Abducts the hip, keeps pelvis level | Superior gluteal |
| Thigh (front) | **Quadriceps** | Extends the knee | Femoral |
| Thigh (back) | **Hamstrings** | Flex the knee, extend the hip | Sciatic |
| Leg (back) | **Gastrocnemius, soleus** | Plantarflex the foot | Tibial |
| Leg (front) | **Tibialis anterior** | Dorsiflexes the foot | Deep peroneal |

### How muscles work together
- **Agonist**: the prime mover (biceps in elbow flexion).
- **Antagonist**: opposes it (triceps).
- **Synergists** assist; **fixators** steady the origin.
- Muscles pull on bones across joints acting as **levers**. Most limb muscles are **third-class levers** (effort between joint and load), favouring speed over force.

{{flow Motor neuron fires > Acetylcholine at the neuromuscular junction > End-plate potential > Calcium released > Cross-bridges cycle > Muscle shortens}}

### Clinical links
| Sign | Nerve injured |
|---|---|
| Wrist drop | Radial nerve |
| "Claw hand" | Ulnar nerve |
| Carpal tunnel syndrome | Median nerve at the wrist |
| Foot drop | Common peroneal (fibular) nerve |
| Trendelenburg sign (pelvis drops on the opposite side) | Superior gluteal nerve or gluteus medius weakness |

> Try it: A patient cannot dorsiflex the foot and has a "slapping" gait. Which nerve is injured? || The common peroneal (fibular) nerve, causing foot drop.', 1080, 52, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 12: The musculoskeletal system in detail'), 'Fractures, healing and bone disease', 'text', '## Types of fracture
| Type | Description |
|---|---|
| **Simple (closed)** | Skin intact |
| **Compound (open)** | Bone breaks through skin; infection risk |
| **Transverse** | Straight across the shaft |
| **Oblique / spiral** | Angled / twisting injury |
| **Comminuted** | Several fragments |
| **Greenstick** | Incomplete break in a child''s soft bone |
| **Stress** | Hairline crack from repeated loading |
| **Pathological** | Break in weakened bone (osteoporosis, tumour) |

## How a fracture heals
{{flow Haematoma forms > Soft callus (cartilage and fibrous tissue) > Hard callus (woven bone) > Remodelling into lamellar bone}}
Healing takes about **6 to 12 weeks** for many bones. It is slowed by smoking, poor blood supply, infection, diabetes, malnutrition and movement at the fracture.

Treatment principles: **reduce** (realign), **hold** (cast, splint, plates, screws, rods) and **rehabilitate**.

## Common bone diseases
| Disease | Mechanism | Features |
|---|---|---|
| **Osteoporosis** | Bone resorption exceeds formation; low bone mass | Fragility fractures of wrist, hip, spine; common after menopause (low oestrogen) |
| **Osteomalacia / rickets** | Vitamin D deficiency; poor mineralisation | Soft bones, bowed legs in children |
| **Paget''s disease** | Excessive, disorganised remodelling | Thickened painful bones |
| **Osteomyelitis** | Bone infection (often *Staphylococcus aureus*) | Fever, pain, swelling |
| **Osteoarthritis** | Wear of joint cartilage | Pain worse on use; knees, hips |
| **Rheumatoid arthritis** | Autoimmune synovitis | Morning stiffness, symmetrical small-joint swelling |

> Real life: Weight-bearing exercise, calcium, vitamin D and stopping smoking all help build and protect bone.
> Try it: Why are children more likely to get greenstick fractures? || Their bones contain more flexible organic material, so they bend and crack on one side instead of snapping.', 900, 53, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 12 checkpoint quiz: The musculoskeletal system', 'Anatomy and Physiology', 'Check your understanding of this module.', '[{"prompt":"How many bones are in the adult skeleton?","options":["106","206","306","156"],"correct_index":1,"explanation":"There are 206 bones, 80 axial and 126 appendicular."},{"prompt":"Which vertebra has the dens?","options":["Atlas","Axis","C7","L5"],"correct_index":1,"explanation":"The axis (C2) has the dens, around which the atlas rotates."},{"prompt":"A lumbar puncture is done below L2 because...","options":["The spine is wider there","The spinal cord ends at about L1 to L2","Bone is softer there","It avoids the discs"],"correct_index":1,"explanation":"The cord ends at L1 to L2, so a needle below it is safe."},{"prompt":"Foot drop suggests injury to which nerve?","options":["Tibial","Femoral","Common peroneal","Sciatic root S3"],"correct_index":2,"explanation":"The common peroneal nerve supplies the dorsiflexors."},{"prompt":"Which ligament stops anterior sliding of the tibia?","options":["PCL","MCL","ACL","LCL"],"correct_index":2,"explanation":"The ACL prevents the tibia sliding forwards."},{"prompt":"Which condition is caused by vitamin D deficiency in children?","options":["Osteoporosis","Paget''s disease","Rickets","Osteoarthritis"],"correct_index":2,"explanation":"Poor mineralisation causes soft, bowed bones."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 12 checkpoint quiz: The musculoskeletal system');
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 12: The musculoskeletal system in detail'), 'Checkpoint quiz: The musculoskeletal system', 'quiz', (SELECT id FROM quizzes WHERE title='Module 12 checkpoint quiz: The musculoskeletal system'), 300, 54, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 13: Cells, genes and development', 13);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 13: Cells, genes and development'), 'Histology: the four tissue types in detail', 'text', '## Epithelial tissue
Epithelia cover surfaces and line cavities, sit on a **basement membrane** and have no blood vessels. They are named by **layers** and **cell shape**.
| Type | Where | Function |
|---|---|---|
| Simple squamous | Alveoli, capillary walls | Diffusion |
| Simple cuboidal | Kidney tubules, glands | Secretion and absorption |
| Simple columnar | Stomach, intestine | Absorption and secretion (often with microvilli) |
| Pseudostratified ciliated columnar | Trachea | Moves mucus |
| Stratified squamous | Skin (keratinised), oesophagus, mouth | Protection from abrasion |
| Transitional | Bladder, ureters | Stretches |

## Connective tissue
Cells in an extracellular **matrix** of fibres and ground substance.
| Type | Example | Key feature |
|---|---|---|
| Loose (areolar) | Under skin and around organs | Packing, holds fluid |
| Dense regular | Tendons, ligaments | Parallel collagen, strong in one direction |
| Adipose | Under skin, around kidneys | Energy store and insulation |
| Cartilage | Hyaline (joints, trachea), elastic (ear), fibrocartilage (discs, menisci) | Avascular, heals slowly |
| Bone | Skeleton | Mineralised matrix, osteocytes |
| Blood | Vessels | Fluid matrix (plasma) |

## Muscle tissue
| Type | Appearance | Control | Where |
|---|---|---|---|
| **Skeletal** | Striated, multinucleate | Voluntary | Attached to bones |
| **Cardiac** | Striated, branched, **intercalated discs** | Involuntary | Heart |
| **Smooth** | Non-striated, spindle-shaped | Involuntary | Gut, vessels, bladder |

## Nervous tissue
**Neurons** conduct signals and **glia** support them (astrocytes, oligodendrocytes, microglia, Schwann cells).

### Repair
{{flow Injury > Inflammation > Granulation tissue > Collagen scar > Remodelling}}
Epithelia and bone regenerate well; cardiac muscle and neurons have very limited ability, so they heal mostly by **scarring**.

> Try it: Which tissue lines the bladder and allows it to stretch? || Transitional epithelium.', 1080, 55, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 13: Cells, genes and development'), 'DNA, genes and inheritance', 'text', '## From DNA to protein
DNA is a double helix of nucleotides (bases **A, T, C, G**). A **gene** is a stretch of DNA that codes for a product.
{{flow DNA in the nucleus > Transcription > mRNA > Translation at a ribosome > Polypeptide chain > Functional protein}}
Each three-base **codon** codes for an amino acid. There are **46 chromosomes** in human cells: **22 pairs of autosomes** and 1 pair of sex chromosomes (XX female, XY male). **Mitosis** makes identical cells for growth and repair. **Meiosis** makes gametes with 23 chromosomes.

## Mendelian inheritance
| Pattern | How it works | Examples |
|---|---|---|
| **Autosomal dominant** | One copy of the allele is enough; affected parents often have affected children | Huntington''s disease, Marfan syndrome |
| **Autosomal recessive** | Two copies are needed; carriers are healthy | Cystic fibrosis, sickle cell disease |
| **X-linked recessive** | Gene on the X; more men affected, passed through carrier mothers | Haemophilia A, colour blindness |
| **Mitochondrial** | Passed only by the mother | Some neuropathies |

### Punnett square: two carriers (Aa x Aa)
| | **A** | **a** |
|---|---|---|
| **A** | AA | Aa |
| **a** | Aa | aa |
Each child has a **25 percent** chance of being affected (aa), **50 percent** of being a carrier (Aa) and 25 percent of being unaffected (AA).

### Chromosome disorders
| Condition | Cause |
|---|---|
| Down syndrome | Trisomy 21 |
| Turner syndrome | 45,X (one X) |
| Klinefelter syndrome | 47,XXY |

> Real life: **Sickle cell disease** (HbSS) is common in parts of Africa because carriers (HbAS) are partly protected against malaria.
> Try it: Two healthy carriers of an autosomal recessive disease have a child. What is the chance it is affected? || 25 percent (1 in 4).', 1080, 56, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 13: Cells, genes and development'), 'Embryology: from fertilisation to birth', 'text', '## The first weeks
{{timeline Day 0: Fertilisation in the uterine tube | Day 1 to 3: Cleavage to a morula | Day 5 to 6: Blastocyst reaches the uterus | Day 6 to 10: Implantation | Week 3: Gastrulation, three germ layers | Weeks 3 to 8: Organogenesis | Week 9 to birth: Foetal growth}}

### The three germ layers
| Layer | Gives rise to |
|---|---|
| **Ectoderm** | Skin, hair, nails, nervous system |
| **Mesoderm** | Muscle, bone, heart, blood, kidneys, reproductive organs |
| **Endoderm** | Lining of gut and lungs, liver, pancreas, thyroid |

The **neural tube** forms in weeks 3 to 4. If it fails to close, **spina bifida** or anencephaly results, which is why **folic acid** is advised before and during early pregnancy.

## The placenta
The placenta exchanges oxygen, nutrients and waste between mother and foetus without mixing their blood. It also makes **hCG** (maintains the corpus luteum early), then **progesterone and oestrogen**. The **umbilical cord** has **two arteries** (deoxygenated blood to the placenta) and **one vein** (oxygenated blood to the foetus).

## Foetal circulation
{{flow Placenta > Umbilical vein > Ductus venosus > Inferior vena cava > Right atrium > Foramen ovale > Left atrium > Aorta > Body}}
The lungs are fluid-filled and bypassed.
| Foetal shunt | Bypasses | After birth |
|---|---|---|
| **Foramen ovale** | Lungs (right to left atrium) | Closes, leaving the fossa ovalis |
| **Ductus arteriosus** | Lungs (pulmonary artery to aorta) | Becomes the ligamentum arteriosum |
| **Ductus venosus** | Liver | Becomes the ligamentum venosum |

At birth the first breath expands the lungs, pulmonary resistance falls and pressure in the left atrium rises, closing the foramen ovale. A persistent ductus arteriosus can be closed with indometacin or surgery.

> Try it: How many vessels are in a normal umbilical cord, and which carries oxygenated blood? || Three: two arteries and one vein; the vein carries oxygenated blood to the foetus.', 1080, 57, 0);
INSERT INTO quizzes (title, subject, description, questions, published)
SELECT 'Module 13 checkpoint quiz: Cells, genes and development', 'Anatomy and Physiology', 'Check your understanding of this module.', '[{"prompt":"Which tissue lines the trachea?","options":["Simple squamous","Pseudostratified ciliated columnar","Transitional","Stratified squamous"],"correct_index":1,"explanation":"This epithelium has cilia that move mucus upward."},{"prompt":"Which tissue has intercalated discs?","options":["Skeletal muscle","Smooth muscle","Cardiac muscle","Nervous tissue"],"correct_index":2,"explanation":"Intercalated discs connect cardiac muscle cells."},{"prompt":"Two carriers of an autosomal recessive condition have a child. The chance it is a carrier is...","options":["25 percent","50 percent","75 percent","100 percent"],"correct_index":1,"explanation":"Aa x Aa gives 25 percent AA, 50 percent Aa, 25 percent aa."},{"prompt":"Down syndrome is caused by...","options":["Monosomy X","Trisomy 21","Trisomy 18","A mitochondrial gene"],"correct_index":1,"explanation":"An extra copy of chromosome 21."},{"prompt":"Which germ layer forms the nervous system?","options":["Mesoderm","Endoderm","Ectoderm","Trophoblast"],"correct_index":2,"explanation":"The neural tube arises from ectoderm."},{"prompt":"Which foetal shunt becomes the ligamentum arteriosum?","options":["Foramen ovale","Ductus venosus","Ductus arteriosus","Umbilical vein"],"correct_index":2,"explanation":"The ductus arteriosus closes and becomes the ligamentum arteriosum."}]', 1
WHERE NOT EXISTS (SELECT 1 FROM quizzes WHERE title = 'Module 13 checkpoint quiz: Cells, genes and development');
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 13: Cells, genes and development'), 'Checkpoint quiz: Cells, genes and development', 'quiz', (SELECT id FROM quizzes WHERE title='Module 13 checkpoint quiz: Cells, genes and development'), 300, 58, 0);

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
