INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), 'Module 10: Putting it all together', 10);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='anatomy-physiology-medical'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='anatomy-physiology-medical') AND title='Module 10: Putting it all together'), 'Clinical integration: three cases', 'text', '## How to think like a clinician
Disease is a **failure of a normal mechanism**. Name the mechanism and the rest follows. Use this routine: **What is normal? What changed? Which organs compensate? What goes wrong if compensation fails?**

### Case 1: Blood loss
A man loses 1.5 L of blood after trauma.
{{flow Venous return falls > SV and BP fall > Baroreceptors fire less > Sympathetic surge and vagal withdrawal > HR up, vasoconstriction > Kidney: renin, ADH, aldosterone conserve volume}}
He is pale, cold and tachycardic (sympathetic), passes little urine (renal conservation) and has a low-normal BP at first. Late shock means compensation has failed.

### Case 2: Diabetic ketoacidosis
No insulin means glucose cannot enter cells and the liver makes **ketones**.
- Hyperglycaemia exceeds the renal threshold, so **osmotic diuresis** causes dehydration.
- Ketones are acids: **metabolic acidosis** with deep fast breathing (**Kussmaul**) to blow off CO₂.
- Insulin lack moves K⁺ out of cells: plasma K⁺ may look high even though total K⁺ is low.

### Case 3: Opioid overdose
Opioids depress the medullary respiratory centres. Ventilation falls, so **PaCO₂ rises** (respiratory acidosis) and **PaO₂ falls**. Pupils constrict (parasympathetic). **Naloxone** blocks the receptors.

### Study strategy
- Draw each system as a **flow**: structure, signal, effect, feedback.
- Link every drug to the mechanism it changes.
- Practise explaining one pathway out loud in under two minutes.

> Try it: In Case 1, why does urine output fall? || Reduced renal perfusion plus renin-angiotensin-aldosterone and ADH activation conserve salt and water.', 1200, 45, 0);
