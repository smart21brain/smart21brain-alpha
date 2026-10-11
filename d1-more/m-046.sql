INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Logic gates', 'text', '## Gates make decisions
A **logic gate** takes one or more 1/0 inputs and gives one 1/0 output.

| Gate | Rule | Real idea |
|---|---|---|
| **AND** | Output 1 only if both inputs are 1 | Two keys must both be turned |
| **OR** | Output 1 if any input is 1 | Either of two doorbells rings |
| **NOT** | Flips the input | Opposite switch |
| **NAND** | NOT AND | Opposite of AND |
| **NOR** | NOT OR | Opposite of OR |
| **XOR** | Output 1 if inputs differ | Two-way light switch |

## Truth tables
| A | B | AND | OR | XOR |
|---|---|---|---|---|
| 0 | 0 | 0 | 0 | 0 |
| 0 | 1 | 0 | 1 | 1 |
| 1 | 0 | 0 | 1 | 1 |
| 1 | 1 | 1 | 1 | 0 |

{{flow Sensor A + Sensor B > AND gate > Alarm sounds}}

> Example: A safe alarm that sounds only when the door is open AND it is night uses an AND gate.

Chips such as the 74HC08 (AND), 74HC32 (OR) and 74HC04 (NOT) hold several gates each. All the logic inside a computer is built from these.

> Try it: When is an OR gate output 1? || When at least one input is 1.

## Quiz questions
1. An AND gate gives 1 when... Answer: Both inputs are 1. AND needs both inputs high.
2. A NOT gate... Answer: Flips the input. NOT inverts.
3. Binary 0101 equals... Answer: 5. 4 + 1 = 5.
4. Eight bits make a... Answer: Byte. 8 bits is a byte.', 720, 20, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Integrated circuits and the 555 timer', 'text', '## Chips: whole circuits in one package
An **integrated circuit (IC)** packs many transistors, resistors and capacitors onto a tiny piece of silicon. It looks like a black box with metal legs.

## Reading a chip
- Pin 1 is next to the **notch or dot**.
- Pins count anticlockwise from pin 1.
- Always check the datasheet for pin roles and power limits.

{{mind IC families | Logic chips (74HC) | Timer (555) | Op-amps (LM358) | Microcontrollers | Memory chips}}

## The famous 555 timer
The 555 is a cheap 8-pin chip that makes pulses and timing.

| Mode | What it does | Example use |
|---|---|---|
| **Astable** | Keeps switching on and off | Flashing lights, tones |
| **Monostable** | One pulse after a trigger | Timer, delay |

The speed depends on resistors and a capacitor: bigger values give slower flashing.

{{cycle Capacitor charges > Reaches the upper limit > Output flips > Capacitor discharges > Reaches the lower limit}}

> Tip: A 555 with two resistors and a capacitor makes a classic LED flasher. Add a speaker for a siren.

> Careful: Insert chips the right way round. A backwards chip can be destroyed in seconds.

> Try it: Where is pin 1 on a chip? || Next to the notch or dot, and pins count anticlockwise.', 720, 21, 0);
