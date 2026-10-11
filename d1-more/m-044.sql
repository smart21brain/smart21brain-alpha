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
