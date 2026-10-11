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
