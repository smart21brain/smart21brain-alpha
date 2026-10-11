INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 2: The laws of the circuit'), 'Parallel circuits', 'text', '## Many paths
In a **parallel** circuit parts are on separate branches, all joined to the same two points.

{{mind Battery | Branch 1: lamp | Branch 2: lamp | Branch 3: buzzer}}

## Rules of a parallel circuit
| Quantity | Rule |
|---|---|
| **Voltage** | The same across every branch |
| **Current** | Splits between the branches, then adds back together |
| **Resistance** | Total is smaller than the smallest branch |

For two resistors: R total = (R1 x R2) / (R1 + R2)

> Example: 100 ohms in parallel with 100 ohms. (100 x 100) / 200 = **50 ohms**. Equal resistors in parallel: divide by how many there are.

## Real life
House wiring is parallel. Each light and socket gets full voltage, and switching one off does not turn the others off.

| Feature | Series | Parallel |
|---|---|---|
| Paths | One | Several |
| If one part breaks | All stop | Others keep working |
| Voltage | Shared | Same across each |
| Current | Same | Splits |

> Tip: Batteries in parallel keep the voltage but last longer.

> Try it: Two 200 ohm resistors in parallel. Total? || 200 / 2 = 100 ohms.

## Quiz questions
1. In a series circuit, the current is... Answer: The same everywhere. There is only one path, so the same current flows through every part.
2. Which wiring do houses use? Answer: Parallel. Parallel lets each device get full voltage.
3. Three 10 ohm resistors in series total... Answer: 30 ohms. Add them: 10 + 10 + 10 = 30.
4. Two equal resistors in parallel give a total that is... Answer: Half of one. Equal resistors in parallel: divide by the number of them.', 660, 8, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 2: The laws of the circuit'), 'Power, energy and batteries', 'text', '## Power
**Power** is how fast electrical energy is used. It is measured in **watts (W)**.

## **P = V x I**
> Example: A 6 V motor draws 0.5 A. Power = 6 x 0.5 = **3 W**.

Combining with Ohm''s law gives two more forms: P = I x I x R and P = V x V / R.

## Why power matters
Resistors turn power into heat. A small 1/4 watt resistor can only handle 0.25 W before it overheats.

> Example: 9 V across a 330 ohm resistor. I = 9/330 = 0.027 A. P = 9 x 0.027 = 0.245 W. Just under the limit, so use a 1/2 W resistor to be safe.

## Batteries
| Type | Voltage per cell | Notes |
|---|---|---|
| Alkaline AA/AAA | 1.5 V | Single use, cheap |
| 9 V block | 9 V | Small projects |
| NiMH rechargeable | 1.2 V | Rechargeable AA |
| Lithium-ion | 3.7 V | Phones, power banks |
| Lead-acid | 2 V per cell (12 V pack) | Cars, solar systems |

**Capacity** is given in mAh. A 2000 mAh battery can give 2000 mA for one hour or 200 mA for ten hours (roughly).

> Tip: Run time in hours is about capacity (mAh) divided by the current (mA).

> Try it: A 12 V lamp draws 2 A. How much power? || 12 x 2 = 24 W.
> Try it: A 1000 mAh battery powers a 100 mA circuit. About how long? || 1000 / 100 = 10 hours.', 660, 9, 0);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), 'Module 3: Meet the components', 3);
