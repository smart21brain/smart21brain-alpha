INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 3: Meet the components'), 'Capacitors', 'text', '## A tiny rechargeable store
A **capacitor** stores electric charge for a short time, like a small water tank that fills and empties quickly.

- Unit: **farad (F)**. Real values are small: microfarad (uF), nanofarad (nF), picofarad (pF).
- Two types you will meet:
  - **Electrolytic:** big values, has a **polarity**. The stripe marks the negative leg.
  - **Ceramic:** small, no polarity.

{{flow Battery charges the capacitor > Capacitor holds charge > Capacitor releases it to the circuit}}

## What capacitors are used for
| Use | How |
|---|---|
| **Smoothing** | Evens out ripples in power supplies |
| **Timing** | Charge slowly through a resistor to set a delay |
| **Filtering** | Block DC, pass changing signals (audio, radio) |
| **Flash** | Camera flash stores charge and dumps it fast |

> Careful: An electrolytic capacitor connected backwards can pop or even burst. Always match the stripe to the negative side.

> Careful: Large capacitors can hold a charge after the power is off. Do not open power supplies or old TVs.

> Remember: A capacitor blocks steady DC once charged, but lets changing signals pass.

> Try it: Which capacitor type has a polarity? || The electrolytic one.', 660, 10, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 3: Meet the components'), 'Diodes and LEDs', 'text', '## One-way street for current
A **diode** lets current flow in one direction only. Its symbol is a triangle pointing in the direction of current, with a bar.

{{flow Anode (+) > Diode > Cathode (-, striped end)}}

## Uses
- Protect circuits from a battery connected the wrong way
- Turn AC into DC (rectifier)

## LED: light emitting diode
An **LED** is a diode that lights up. The **longer leg** is the anode (+), the shorter leg is the cathode (-).

> Careful: An LED needs a resistor. Without it too much current flows and the LED burns out in a second.

## Choosing the LED resistor
**R = (Supply voltage - LED voltage) / LED current**

| LED colour | Typical voltage drop |
|---|---|
| Red | about 2 V |
| Green / Yellow | about 2.1 V |
| Blue / White | about 3 V |

> Example: A 9 V battery, a red LED (2 V) and 20 mA (0.02 A). R = (9 - 2) / 0.02 = 7 / 0.02 = **350 ohms**. Use the next standard value up, 390 ohms.

> Example: A 5 V supply, a red LED, 10 mA. R = (5 - 2) / 0.01 = **300 ohms**. 330 ohms is a good pick.

> Tip: A dim LED is often better than a dead one. When unsure, use 330 ohms to 1 k with 5 V.

> Try it: A 5 V supply and a green LED (2 V) at 15 mA. Resistor? || (5 - 2) / 0.015 = 200 ohms. Use 220 ohms.

## Quiz questions
1. A diode lets current flow... Answer: One way only. A diode is a one-way valve for current.
2. Which LED leg is the anode (+)? Answer: The longer leg. The longer leg is positive.
3. Why use a resistor with an LED? Answer: To limit current and prevent burnout. The resistor limits current.
4. 5 V, red LED (2 V), 10 mA. Resistor needed is about... Answer: 300 ohms. (5 - 2) / 0.01 = 300 ohms.', 780, 11, 0);
