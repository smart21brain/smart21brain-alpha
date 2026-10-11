INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 3: Meet the components'), 'Switches, sensors and outputs', 'text', '## Switches: the simplest input
| Switch | How it works |
|---|---|
| Push button | Connects only while pressed |
| Toggle / slide | Stays on or off |
| Tilt | Closes when tilted |
| Reed | Closes near a magnet |

## Sensors: parts that feel the world
| Sensor | Senses | Used in |
|---|---|---|
| **LDR** | Light level | Street lights, night lights |
| **Thermistor** | Temperature | Thermometers, fans |
| **Microphone** | Sound | Phones, alarms |
| **PIR** | Movement of warm bodies | Security lights |
| **Ultrasonic** | Distance | Parking sensors, robots |

## Outputs: parts that act
| Output | What it gives |
|---|---|
| LED | Light |
| Buzzer | Beep or tone |
| Speaker | Music and voice |
| DC motor | Spinning |
| Servo | Precise turning angle |
| Relay | Electric switch that controls bigger loads |

> Example: A night light uses an LDR as an input. When it gets dark, the LDR''s resistance rises, a transistor switches on and the LED glows.

{{flow Light sensor > Transistor switch > LED}}

> Remember: Small circuits should not drive big loads directly. Use a transistor or relay in between.

> Try it: What happens to an LDR''s resistance in bright light? || It goes down. More light means lower resistance.', 720, 12, 0);

INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 3: Meet the components'), 'Transistors', 'text', '## The part that changed the world
A **transistor** is a tiny electronic switch and amplifier. Millions of them in a chip make a computer possible.

## Three legs
{{stack Base (B) = control leg | Collector (C) = current in | Emitter (E) = current out}}

A small current into the **base** lets a much bigger current flow from **collector to emitter**.

## As a switch
{{flow Small signal at base > Transistor turns on > Large current flows through the load}}

| Base signal | Transistor | Load (e.g. LED, motor) |
|---|---|---|
| None | Off | Off |
| Small current | On | On |

## As an amplifier
A weak signal (like a microphone) can be made stronger so it can drive a speaker.

## Two common types
- **NPN** (BC547, 2N2222): turns on with a positive signal at the base. Most common for beginners.
- **PNP** (BC557): works with the opposite polarity.

> Careful: Always put a resistor (about 1 k) in series with the base. Without it the transistor can be damaged.

> Tip: To drive a motor, add a diode across the motor. It absorbs voltage spikes that could damage the transistor.

> Try it: What does the transistor do when used as a switch? || It lets a small base current turn a larger collector-emitter current on or off.', 780, 13, 0);
