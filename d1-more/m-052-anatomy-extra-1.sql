-- Anatomy and Physiology (Medical Level): extension, part 1.
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

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
