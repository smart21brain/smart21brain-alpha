INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 4: Reading and building circuits'), 'Measuring with a multimeter', 'text', '## Your best friend for finding faults
A **multimeter** measures voltage, current and resistance.

## Settings
| Symbol | Measures | Connect |
|---|---|---|
| V with a straight line | DC voltage | **In parallel** across the part |
| V with a wave | AC voltage | In parallel (mains: experts only) |
| A | Current | **In series**, break the circuit |
| Ohm sign | Resistance | Part removed from circuit, power off |
| Diode symbol | Tests diodes | Power off |
| Beep symbol | Continuity | Beeps if the path is complete |

## Measure DC voltage
1. Red probe in the V socket, black in COM.
2. Dial to DC voltage, pick a range higher than expected.
3. Touch the probes across the battery. Red on +, black on -.

## Continuity test
Power off, probe each end of a wire. A beep means it is a good connection. Great for finding broken wires and bad joints.

{{flow Is there power? > Is the voltage correct? > Is the path continuous? > Is the part good?}}

> Careful: Never measure resistance in a powered circuit. Never measure current with the probes across a battery.

> Tip: The most common circuit faults are loose wires, backwards parts and flat batteries. Check these first.

> Try it: Is voltage measured in series or in parallel? || In parallel, across the part.

## Quiz questions
1. On a schematic, R1 means... Answer: The first resistor. R is the label for resistors.
2. To measure voltage, connect the meter... Answer: In parallel across the part. Voltage is measured across a part, in parallel.
3. A good solder joint is... Answer: Shiny and cone shaped. Good joints are shiny and neat.
4. The LED does not light. A common cause is... Answer: LED fitted backwards. LEDs only work in one direction.', 720, 18, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), 'Module 5: Digital electronics and projects', 5);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Analog vs digital and binary', 'text', '## Two ways to carry information
| Analog | Digital |
|---|---|
| Smoothly changing values | Only two states: ON or OFF |
| Old vinyl records, mercury thermometers | Computers, phones, calculators |
| Can pick up noise | Resists noise, easy to copy |

Digital circuits use **1 (high, about 5 V)** and **0 (low, 0 V)**.

## Binary numbers
Computers count using only 0 and 1. Each place is a power of 2.

| Place value | 8 | 4 | 2 | 1 |
|---|---|---|---|---|
| Binary 1011 | 1 | 0 | 1 | 1 |

1011 = 8 + 0 + 2 + 1 = **11**

> Example: Binary 0110 = 0 + 4 + 2 + 0 = **6**.

| Decimal | Binary |
|---|---|
| 0 | 0000 |
| 1 | 0001 |
| 2 | 0010 |
| 3 | 0011 |
| 4 | 0100 |
| 5 | 0101 |

A single binary digit is a **bit**. Eight bits make a **byte**.

> Remember: Every picture, song and message on your phone is stored as bits.

> Try it: What is binary 1001 in decimal? || 8 + 0 + 0 + 1 = 9.', 660, 19, 0);
