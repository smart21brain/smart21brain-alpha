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
