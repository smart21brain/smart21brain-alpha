-- Electronics for Beginners: adds the course, modules and lessons to D1.
-- Run: npx wrangler d1 execute smart21brain-db --remote --file=./course-electronics-seed.sql
-- Safe to run more than once (INSERT OR IGNORE). Never deletes anything.

INSERT OR IGNORE INTO course_categories (name, slug, icon) VALUES ('Science','science','fa-solid fa-flask');

INSERT OR IGNORE INTO courses (title, slug, description, thumbnail_url, category_id, level, age_range, language, objectives, requirements, price, is_free, certificate_enabled, published)
VALUES ('Electronics for Beginners', 'electronics-for-beginners', 'Learn all the basics of electronics from scratch: voltage, current and resistance, Ohm''s law, resistors, capacitors, diodes, LEDs, transistors, schematics, breadboards, soldering, multimeters, logic gates, the 555 timer and Arduino, with diagrams, worked examples, quizzes and mini projects.', 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&q=75&auto=format&fit=crop', (SELECT id FROM course_categories WHERE slug='science'), 'beginner', '10+', 'English', '["Explain voltage, current and resistance with simple pictures", "Use Ohm''s law and power formulas to solve circuit problems", "Recognise resistors, capacitors, diodes, LEDs and transistors and know what they do", "Read circuit diagrams and build circuits on a breadboard", "Solder safely and test circuits with a multimeter", "Understand binary, logic gates, the 555 timer and Arduino basics", "Complete simple electronics projects and troubleshoot faults"]', '["Basic arithmetic (add, subtract, multiply, divide)", "Curiosity. No tools are needed to start", "A basic parts kit helps for the hands-on lessons"]', 0, 1, 1, 1);

INSERT OR IGNORE INTO course_modules (course_id, title, sort_order) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), 'Module 1: Welcome to electronics', 1);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 1: Welcome to electronics'), 'What is electronics?', 'text', '## Electricity and electronics
**Electricity** is the flow of tiny charged particles called electrons through a material. **Electronics** is using that flow, in small and carefully controlled amounts, to do useful jobs: carry sound, show pictures, count, sense and make decisions.

> Real life: A torch just uses electricity to make light. A phone uses electronics: it senses your touch, thinks about it and changes the screen.

{{mind Electronics around us | Phone | Radio | Solar lights | Computer | Car dashboard | Hospital machines}}

## Three jobs every electronic device does
{{flow Input > Process > Output}}

| Part | Job | Examples |
|---|---|---|
| **Input** | Collects information | Button, microphone, light sensor |
| **Process** | Decides what to do | Transistors, chips, microcontroller |
| **Output** | Does something | LED, speaker, motor, screen |

## What you will learn in this course
- How electricity behaves (voltage, current, resistance)
- What the common parts do and how to recognise them
- How to read circuit diagrams and build real circuits
- Digital logic, chips and a first look at Arduino

> Tip: You do not need to be good at maths. If you can add, subtract, multiply and divide, you can learn electronics.

> Try it: Pick a doorbell. What is the input, the process and the output? || Input: the button. Process: the circuit that decides to sound. Output: the bell or speaker.

## Quiz questions
1. Electronics is best described as... Answer: Using small, controlled electric flow to do useful jobs. Electronics controls small electric flows to sense, decide and act.
2. A light sensor in a street lamp is an... Answer: Input. Sensors collect information, so they are inputs.
3. A speaker in a radio is an... Answer: Output. A speaker turns the signal into sound, which is an output.', 480, 1, 1);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 1: Welcome to electronics'), 'Electricity basics: charge, current and voltage', 'text', '## Everything is made of atoms
Atoms have a centre and tiny **electrons** moving around it. In metals some electrons can drift from atom to atom. When many drift in the same direction, we have an **electric current**.

## The water pipe idea
Think of a pipe carrying water from a tank.

{{stack Water tank (high up) = Battery | Water pressure = Voltage | Water flowing = Current | Narrow pipe = Resistance}}

| Quantity | Meaning | Unit | Symbol |
|---|---|---|---|
| **Voltage** | The push that moves electrons | Volt | V |
| **Current** | How many electrons flow each second | Ampere (amp) | A |
| **Resistance** | How much the path resists the flow | Ohm | R or the sign for ohm |

> Remember: Voltage is the push. Current is the flow. Resistance is the squeeze.

## Everyday voltages
- AA battery: **1.5 V**
- Phone charger output: **5 V**
- Car battery: **12 V**
- Wall socket at home: **230 V** (dangerous!)

## DC and AC
- **DC (direct current)** flows one way. Batteries and solar panels give DC.
- **AC (alternating current)** switches direction many times a second. Wall sockets give AC.

> Careful: Never experiment with wall-socket electricity. All the practice in this course uses safe batteries of 9 V or less.

> Try it: A 9 V battery is stronger or weaker than a 1.5 V battery in terms of push? || Stronger. Voltage is the push, and 9 V pushes harder than 1.5 V.

## Quiz questions
1. What is voltage? Answer: The push that moves electrons. Voltage is the electrical push.
2. What is the unit of current? Answer: Ampere. Current is measured in amperes (amps).
3. Which gives DC? Answer: A battery. Batteries give direct current.
4. In the water idea, a narrow pipe is like... Answer: Resistance. A narrow pipe resists flow like a resistor.', 720, 2, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 1: Welcome to electronics'), 'Conductors, insulators and staying safe', 'text', '## Who lets electricity through?
| Type | What it does | Examples |
|---|---|---|
| **Conductor** | Lets current flow easily | Copper, aluminium, silver, gold, salty water |
| **Insulator** | Blocks current | Plastic, rubber, glass, dry wood |
| **Semiconductor** | In between, can be controlled | Silicon, germanium |

Wires are copper (conductor) wrapped in plastic (insulator). Semiconductors are the secret behind diodes, transistors and chips.

## The complete circuit rule
Current only flows if there is a **closed loop** from the battery, through the parts and back to the battery.

{{cycle Battery positive > Wire > Component > Wire > Battery negative}}

If the loop is broken (an open circuit), nothing flows. A switch simply opens or closes the loop.

## Safety rules
1. Use only batteries (9 V or less) while learning.
2. Never touch mains electricity, plugs or inside a TV or phone charger.
3. Never short a battery by joining its two ends with only a wire. It gets very hot.
4. Keep water away from circuits and power.
5. Disconnect power before changing a circuit.
6. Wear eye protection when cutting wire legs or soldering.

> Careful: Never charge or puncture a lithium battery without a proper charger. They can catch fire.

> Try it: Why is the plastic around a wire important? || Plastic is an insulator. It stops current escaping and protects you from shocks and short circuits.', 600, 3, 0);
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
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 4: Reading and building circuits'), 'Breadboards and your first circuit', 'text', '## What is a breadboard?
A breadboard lets you push parts in without soldering. Rows of holes are joined underneath.

{{stack Power rails (red + and blue -) run along the long edges | Rows of 5 holes are joined across each side | A centre gap separates the two sides for chips}}

## Your first circuit: an LED light
**Parts:** 9 V battery with clip, 390 ohm resistor, red LED, 2 jumper wires.

1. Place the LED with the long leg in one row and the short leg in another.
2. Put the resistor from the long leg''s row to a free row.
3. Connect the battery positive (red) wire to the resistor''s free row.
4. Connect the battery negative (black) wire to the LED''s short leg row.
5. The LED lights. If not, flip the LED around.

{{flow Battery plus > Resistor > LED long leg > LED short leg > Battery minus}}

## Add a switch
Put a push button in the loop between the battery and the resistor. Press it and the LED glows.

> Tip: Use red wires for positive and black for negative. It makes debugging much easier.

## Troubleshooting
| Problem | Likely cause |
|---|---|
| LED will not light | LED backwards, loose wire, flat battery |
| LED is very dim | Resistor too large |
| Resistor hot | Short circuit or too little resistance |

> Try it: The LED does not light. What do you try first? || Flip the LED around, then check all connections and the battery.', 780, 16, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 4: Reading and building circuits'), 'Soldering and circuit boards', 'text', '## Making permanent connections
**Soldering** melts a metal alloy (solder) to join parts to a board. A good joint is shiny, shaped like a small cone and conducts well.

## Equipment
- Soldering iron (about 350 C)
- Solder wire (lead-free preferred)
- Stand and damp sponge or brass wool
- Perfboard (stripboard) or PCB
- Wire cutters
- Fume fan and eye protection

## Steps for a good joint
{{flow Heat pad and leg together > Add solder to the joint > Remove solder > Remove iron > Let it cool}}

1. Push the component leg through the board.
2. Touch the iron to both the pad and the leg for 2 seconds.
3. Feed solder to the joint, not the iron tip.
4. Remove the solder, then the iron.
5. Do not move it for 3 seconds. Trim the leg.

| Bad joint | Problem |
|---|---|
| Dull and grainy | Moved while cooling (cold joint) |
| Big blob | Too much solder |
| Solder bridge | Touches the next pad (short circuit) |

## PCB: Printed Circuit Board
A PCB has copper tracks that connect the parts. Phones and computers are made this way. You can order custom PCBs online once you design them.

> Careful: The iron is very hot. Always place it in the stand, work in a ventilated space and wash your hands afterward.

> Try it: Where should the solder be fed? || Onto the joint where the pad and leg meet, not onto the iron tip.', 720, 17, 0);
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
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Microcontrollers and Arduino', 'text', '## A small computer on a chip
A **microcontroller** is a tiny computer that reads inputs, runs your program and controls outputs. It is inside washing machines, remote controls, toys, cars and more.

## Arduino
**Arduino** is a friendly board with a microcontroller, USB port and pins. You write code on a computer, upload it, and the board runs it.

{{flow Write code > Upload through USB > Board reads inputs > Board controls outputs}}

## Parts of the Arduino Uno
| Part | Job |
|---|---|
| USB port | Power and upload code |
| Digital pins | Read buttons and switch LEDs (on/off) |
| Analog pins | Read sensors that vary smoothly |
| 5V and GND | Power for your parts |

## First program: blink an LED
```
void setup() {
  pinMode(13, OUTPUT);
}
void loop() {
  digitalWrite(13, HIGH);
  delay(1000);
  digitalWrite(13, LOW);
  delay(1000);
}
```
`setup` runs once. `loop` runs forever. The LED turns on for one second, then off for one second.

> Tip: Put an LED and a 330 ohm resistor on pin 13 and the ground pin to see it blink. The Uno also has a small built-in LED on that pin.

## What you can build next
- Temperature display
- Automatic night light with an LDR
- Distance alarm with an ultrasonic sensor
- Simple robot car

> Try it: What does delay(1000) do? || It waits for 1000 milliseconds, which is 1 second.', 780, 22, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Mini projects to build', 'text', '## Time to make things
Pick a project, gather the parts and test each step. Mistakes are part of learning.

## Project 1: Torch with a switch (easy)
- **Parts:** battery, switch, resistor, LED
- **Skill:** series circuit, LED resistor
{{flow Battery > Switch > Resistor > LED > Battery}}

## Project 2: Automatic night light (medium)
- **Parts:** LDR, 10 k resistor, NPN transistor, 1 k resistor, LED, 330 ohm resistor
- **Skill:** sensor and transistor switch
{{flow Light level drops > LDR resistance rises > Transistor turns on > LED lights}}

## Project 3: Siren with a 555 (medium)
- **Parts:** 555, two resistors, capacitors, speaker
- **Skill:** astable timer

## Project 4: Blinking pattern with Arduino (medium)
- **Parts:** Arduino, three LEDs, three resistors
- **Skill:** code and outputs

## Project 5: Smart plant helper (advanced)
- **Parts:** Arduino, soil moisture sensor, LED or buzzer
- **Skill:** sensors and decisions

{{timeline Torch | Night light | 555 siren | Arduino blink | Plant helper}}

## Tips for success
1. Draw the circuit first.
2. Build a small piece at a time.
3. Test with a multimeter as you go.
4. Keep notes of what worked.
5. Ask a teacher or an adult if unsure.

> Remember: Making, testing, fixing and trying again is exactly how real engineers work.

> Try it: Which project teaches sensors and a transistor switch? || The automatic night light.', 780, 23, 0);
INSERT OR IGNORE INTO course_lessons (course_id, module_id, title, content_type, body, duration_seconds, sort_order, is_preview) VALUES ((SELECT id FROM courses WHERE slug='electronics-for-beginners'), (SELECT id FROM course_modules WHERE course_id=(SELECT id FROM courses WHERE slug='electronics-for-beginners') AND title='Module 5: Digital electronics and projects'), 'Electronics for Beginners final quiz', 'text', '## Final quiz
Answer every question, then mark the lesson complete.

## Quiz questions
1. Which is the correct form of Ohm''s law? Answer: V = I x R. Voltage equals current times resistance.
2. A resistor marked Red, Red, Brown is... Answer: 220 ohms. 2, 2, then one zero = 220 ohms.
3. In a parallel circuit, each branch has... Answer: The same voltage. Parallel branches share the same voltage.
4. What does an electrolytic capacitor have that a ceramic one usually does not? Answer: Polarity. Electrolytic capacitors have + and - legs.
5. A 9 V battery, 2 V LED and 20 mA need about what resistor? Answer: 350 ohms. (9 - 2) / 0.02 = 350 ohms.
6. Which part acts as a small electronic switch or amplifier? Answer: Transistor. Transistors switch and amplify.
7. Which gate gives 1 only when both inputs are 1? Answer: AND. AND needs both inputs high.
8. How should a multimeter measure voltage? Answer: In parallel across the part. Voltage is measured across the part.
9. The safest power source for beginner practice is... Answer: A battery of 9 V or less. Keep to low-voltage batteries.', 0, 24, 0);
