-- Anatomy and Physiology (Medical Level): extension, part 2.
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

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
