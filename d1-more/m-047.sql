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
