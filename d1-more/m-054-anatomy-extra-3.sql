-- Anatomy and Physiology (Medical Level): extension, part 3.
-- Safe to run more than once (INSERT OR IGNORE / NOT EXISTS). Never deletes anything.

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
