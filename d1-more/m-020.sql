INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, quiz_id, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 2: Skin, bone and muscle'), 'Checkpoint quiz: Skin, bone and muscle', 'quiz', (SELECT id FROM quizzes WHERE title='Module 2 checkpoint quiz: Skin, bone and muscle'), 300, 10, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 3: The nervous system', 3);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Neurons and glia', 'text', '## The neuron
{{anat neuron}}

- **Dendrites** receive; the **soma** integrates; the **axon hillock** is where action potentials start; the **axon** conducts; **terminals** release neurotransmitter.
- **Myelin** insulates the axon; **nodes of Ranvier** are gaps where the signal "jumps" (**saltatory conduction**), making it about 50 times faster.

### Glial cells
| Cell | Location | Job |
|---|---|---|
| Astrocyte | CNS | supports blood-brain barrier, K⁺ buffering, scar |
| Oligodendrocyte | CNS | myelinates several axons |
| Schwann cell | PNS | myelinates one axon segment; helps regeneration |
| Microglia | CNS | resident immune cells |
| Ependymal cell | ventricles | makes and moves CSF |

> Real life: **Multiple sclerosis** is autoimmune loss of CNS myelin (oligodendrocytes). **Guillain-Barré syndrome** damages PNS myelin, causing ascending weakness.
> Try it: Which cell myelinates axons in the brain? || The oligodendrocyte.', 720, 11, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 3: The nervous system'), 'Membrane potentials and the action potential', 'text', '## Resting membrane potential
Neurons rest at about **-70 mV** (inside negative). Three things create it: the Na⁺/K⁺ pump, **K⁺ leak channels** (K⁺ leaves, taking positive charge), and negatively charged proteins trapped inside. The resting membrane is far more permeable to K⁺ than Na⁺, so the potential sits near E_K (about -90 mV).

## The action potential
{{anat actionpotential}}

1. A stimulus depolarises the membrane to **threshold** (about -55 mV).
2. **Voltage-gated Na⁺ channels** open: Na⁺ rushes in (positive feedback).
3. At the peak (+30 mV) Na⁺ channels **inactivate** and **K⁺ channels** open: K⁺ flows out.
4. **Hyperpolarisation**: K⁺ channels close slowly; the pump restores the gradients.

> Key idea: **All-or-none.** If threshold is reached the spike is always the same size. Stronger stimuli give a higher **frequency**, not a bigger spike.

### Refractory periods
- **Absolute**: Na⁺ channels inactivated; no second spike is possible. This makes the signal travel **one way**.
- **Relative**: a stronger-than-normal stimulus can fire it.

> Real life: **Local anaesthetics** (lidocaine) block voltage-gated Na⁺ channels. **Hyperkalaemia** depolarises resting membranes and is dangerous for the heart.
> Try it: What causes the falling phase of the action potential? || Na⁺ channel inactivation and opening of voltage-gated K⁺ channels, so K⁺ leaves.', 1080, 12, 0);
