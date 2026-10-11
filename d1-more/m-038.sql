INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 1: Welcome to electronics'), 'Your starter toolkit', 'text', '## Tools every beginner needs
| Tool | What it is for |
|---|---|
| **Breadboard** | Build circuits without soldering |
| **Jumper wires** | Connect parts on the breadboard |
| **Battery pack or 9 V battery with clip** | Safe power |
| **Multimeter** | Measure voltage, current, resistance |
| **Wire cutters / strippers** | Prepare wire |
| **Small pliers** | Bend and hold small legs |
| **Soldering iron and solder** | Make permanent joints (later lesson) |

## Starter parts kit
- Resistors (100, 220, 330, 1k, 10k ohm)
- LEDs (red, green, yellow)
- Push buttons and a slide switch
- A capacitor or two (10 uF, 100 uF)
- A diode (1N4007) and a transistor (2N2222 or BC547)
- A small buzzer and a small motor

> Tip: Keep parts sorted in a small box with compartments. Label the resistor bags, because their colours are easy to confuse.

> Remember: Good habits matter more than fancy tools. Keep your workspace dry, tidy and well lit.

> Try it: Which tool lets you build a circuit without soldering? || The breadboard.', 540, 4, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), 'Module 2: The laws of the circuit', 2);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 2: The laws of the circuit'), 'Ohm''s law', 'text', '## The most important rule in electronics
In 1827 Georg Ohm discovered that voltage, current and resistance are linked.

## **V = I x R**
- **V** = voltage in volts
- **I** = current in amps
- **R** = resistance in ohms

{{stack V (top) | I x R (bottom, multiply)}}

The triangle trick: cover the one you want and read the rest.
- Find V: I times R
- Find I: V divided by R
- Find R: V divided by I

## Worked example 1
> Example: A 9 V battery is connected across a 900 ohm resistor. How much current flows? I = V / R = 9 / 900 = **0.01 A** (10 milliamps).

## Worked example 2
> Example: A resistor has 0.02 A flowing and 6 V across it. R = V / I = 6 / 0.02 = **300 ohms**.

## What it tells us
| If you... | Then current... |
|---|---|
| Raise the voltage | Goes up |
| Raise the resistance | Goes down |
| Lower the resistance | Goes up |

## Handy small units
| Unit | Meaning |
|---|---|
| mA (milliamp) | one thousandth of an amp |
| kilo-ohm (k) | 1,000 ohms |
| mega-ohm (M) | 1,000,000 ohms |

> Tip: Always change units to amps, volts and ohms before calculating. 20 mA = 0.02 A.

> Try it: A 12 V supply drives a 4 ohm lamp. What is the current? || I = 12 / 4 = 3 A.
> Try it: 5 V across a 1 k resistor. Current? || 1 k = 1000 ohms, so I = 5 / 1000 = 0.005 A = 5 mA.

## Quiz questions
1. Which is Ohm''s law? Answer: V = I x R. Voltage equals current times resistance.
2. 9 V across 3 ohms gives what current? Answer: 3 A. I = 9 / 3 = 3 A.
3. If resistance doubles and voltage stays the same, current... Answer: Halves. I = V / R, so doubling R halves I.
4. 2 mA equals how many amps? Answer: 0.002 A. Milli means one thousandth, so 2 mA = 0.002 A.', 780, 5, 0);
