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
