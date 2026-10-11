INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'The cardiac cycle and cardiac output', 'text', '## One heartbeat
{{cycle Ventricular filling (diastole) > Isovolumetric contraction > Ejection (systole) > Isovolumetric relaxation}}

- **Diastole**: AV valves open, ventricles fill (atrial contraction adds the final 20%).
- **Isovolumetric contraction**: all valves closed, pressure rises (S1).
- **Ejection**: pressure exceeds the aorta, aortic valve opens, blood leaves.
- **Isovolumetric relaxation**: pressure falls, aortic valve closes (S2).

## Cardiac output
{{stack Cardiac output (CO) = HR × SV | Stroke volume = EDV - ESV | Ejection fraction = SV / EDV}}

Typical: HR 70 × SV 70 mL = about **5 L/min**. Typical EDV 120 mL, ESV 50 mL, so **EF about 58%**.

### What controls stroke volume?
- **Preload**: end-diastolic stretch. **Frank-Starling law**: more filling gives a stronger beat (up to a limit).
- **Afterload**: pressure the ventricle must beat against (aortic pressure).
- **Contractility**: strength at a given preload (sympathetic stimulation, calcium).

> Real life: In **heart failure with reduced EF** (below about 40%), contractility is poor. **Aortic stenosis** raises afterload; **hypertension** also raises afterload over years, thickening the ventricle.
> Try it: HR is 80/min and SV is 60 mL. What is the cardiac output? || 80 × 60 = 4800 mL/min = 4.8 L/min.', 1080, 23, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 5: The cardiovascular system'), 'Blood vessels, blood pressure and circulation', 'text', '## The circuit
{{anat circulation}}

### Vessel types
| Vessel | Wall | Role |
|---|---|---|
| Elastic arteries (aorta) | lots of elastin | recoil keeps flow going in diastole |
| Arterioles | thick smooth muscle | **resistance vessels**: control blood pressure and local flow |
| Capillaries | one cell thick | exchange of gases, nutrients, waste |
| Veins | thin, valves | **capacitance vessels**: hold about 65% of blood volume |

### Blood pressure
{{stack MAP = CO × TPR | MAP ≈ diastolic + one third of pulse pressure | Normal about 120/80 mmHg, MAP about 93}}

**Baroreceptor reflex** (carotid sinus and aortic arch): a fall in pressure causes less firing to the medulla, which increases sympathetic output and decreases vagal output, so HR, contractility and vasoconstriction rise and pressure is restored.

### Capillary exchange (Starling forces)
Hydrostatic pressure pushes fluid **out** at the arteriolar end; oncotic pressure (plasma proteins) pulls fluid **back** at the venous end. Excess is returned by **lymphatics**.

> Real life: **Oedema** results from raised capillary pressure (heart failure), low albumin (liver or kidney disease), leaky capillaries (inflammation) or lymphatic block.
> Try it: Which vessels contribute most to total peripheral resistance? || Arterioles.', 1080, 24, 0);
