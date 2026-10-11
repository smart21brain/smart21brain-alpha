INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 3: Meet the components'), 'Inductors, transformers and motors', 'text', '## Electricity and magnetism are partners
When current flows through a wire it creates a magnetic field. Wrap the wire into a coil and the field gets much stronger.

## Inductor
An **inductor** is a coil that stores energy in its magnetic field. It resists sudden changes of current. Unit: **henry (H)**.
Used in radios, filters and power supplies.

## Transformer
Two coils close together on the same iron core.

{{flow AC in on the primary coil > Magnetic field in the core > AC out on the secondary coil}}

| Type | Result |
|---|---|
| Step-down | Lowers voltage (phone chargers: 230 V down to 5 V) |
| Step-up | Raises voltage (power stations send electricity far) |

Transformers only work with **AC**.

## Motors and speakers
A **motor** uses magnetism to spin. A **speaker** uses a coil and magnet to push air and make sound. A **generator** is a motor working in reverse: spin it and it makes electricity.

> Remember: Magnetism turns up in many places: relays, motors, speakers, transformers, hard drives.

> Try it: Which device only works with AC? || The transformer.

## Quiz questions
1. Which part stores charge? Answer: Capacitor. A capacitor stores charge.
2. A transistor''s three legs are... Answer: Base, collector, emitter. The transistor has base, collector and emitter.
3. A step-down transformer... Answer: Lowers voltage. Step-down lowers the voltage.
4. An LDR senses... Answer: Light. LDR means light dependent resistor.
5. What protects the transistor from motor voltage spikes? Answer: A diode across the motor. A flyback diode absorbs spikes.', 600, 14, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), 'Module 4: Reading and building circuits', 4);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 4: Reading and building circuits'), 'Schematics and symbols', 'text', '## The language of electronics
A **schematic** is a drawing that shows how parts connect, using standard symbols. It is like a map. It shows connections, not what the real board looks like.

## Common symbols
| Part | How it looks in a schematic |
|---|---|
| Battery | Long and short parallel lines |
| Resistor | Zigzag line or small box |
| Capacitor | Two parallel lines (one curved if polarised) |
| Diode | Triangle pointing at a bar |
| LED | Diode with two small arrows pointing away |
| Switch | A line with a gap and a small lever |
| Ground | Three shrinking horizontal lines |
| Transistor | Circle with base, collector, emitter lines |

## How to read one
1. Find the power source.
2. Follow the path of current from positive to negative.
3. Name each part by its label (R1, C1, D1, Q1).
4. Note the values (330, 10 uF).
5. Where lines cross with a dot, they connect. Without a dot, they just pass over.

{{flow Find the power > Trace the path > Identify each part > Check the values}}

> Tip: Labels are standard: R = resistor, C = capacitor, D = diode, Q = transistor, S or SW = switch, U = chip.

> Try it: What does D1 usually stand for? || The first diode (or LED) in the circuit.', 600, 15, 0);
