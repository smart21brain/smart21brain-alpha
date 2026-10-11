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
