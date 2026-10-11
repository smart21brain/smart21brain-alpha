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
