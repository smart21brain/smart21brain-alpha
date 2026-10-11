INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 2: The laws of the circuit'), 'Resistors and the colour code', 'text', '## What a resistor does
A **resistor** limits current. It protects delicate parts such as LEDs and sets the right voltage in many circuits. Its symbol is a zigzag or a small rectangle.

## Reading the colour bands
Most small resistors have 4 coloured bands.

| Colour | Digit | Colour | Digit |
|---|---|---|---|
| Black | 0 | Green | 5 |
| Brown | 1 | Blue | 6 |
| Red | 2 | Violet | 7 |
| Orange | 3 | Grey | 8 |
| Yellow | 4 | White | 9 |

- **Band 1:** first digit
- **Band 2:** second digit
- **Band 3:** multiplier (how many zeros to add)
- **Band 4:** tolerance (gold = 5%, silver = 10%)

> Example: Brown, Black, Red, Gold. 1, 0, then 2 zeros: **1,000 ohms = 1 k**, 5% tolerance.
> Example: Red, Red, Brown, Gold. 2, 2, then 1 zero: **220 ohms**.

## Types of resistor
- **Fixed:** one value, e.g. 330 ohms
- **Variable (potentiometer):** turn a knob to change the value, like a volume control
- **LDR:** resistance changes with light
- **Thermistor:** resistance changes with temperature

> Tip: Confirm any resistor with a multimeter in resistance mode. Remove it from the circuit first.

> Try it: Orange, Orange, Brown. What value? || 3, 3, then 1 zero = 330 ohms.

## Quiz questions
1. What does a resistor do? Answer: Limits current. Resistors limit current.
2. Brown, Black, Orange means... Answer: 10 k ohms. 1, 0 then 3 zeros = 10,000 ohms = 10 k.
3. A volume knob is usually a... Answer: Potentiometer. A potentiometer is a variable resistor.', 720, 6, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 2: The laws of the circuit'), 'Series circuits', 'text', '## One path only
In a **series** circuit parts are joined one after the other in a single loop.

{{flow Battery > Resistor 1 > Resistor 2 > Back to battery}}

## Rules of a series circuit
| Quantity | Rule |
|---|---|
| **Current** | The same everywhere in the loop |
| **Resistance** | Add them up: R total = R1 + R2 + R3 |
| **Voltage** | Shared. The drops add up to the battery voltage |

> Example: A 9 V battery with 100 ohm and 200 ohm resistors in series. R total = 300 ohms. Current = 9 / 300 = 0.03 A. Voltage across the 100 ohm = 0.03 x 100 = 3 V. Across the 200 ohm = 6 V. 3 + 6 = 9 V.

## Real life
- Old Christmas lights: one bulb fails and the whole string goes dark.
- Batteries in a torch are placed in series to add voltage. Two 1.5 V batteries give 3 V.

> Remember: In series, a break anywhere stops everything.

> Try it: Resistors of 50, 70 and 80 ohms are in series. What is the total? || 50 + 70 + 80 = 200 ohms.', 660, 7, 0);
