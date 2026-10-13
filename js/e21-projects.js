/* Electron21 — projects gallery */
(function () {
  'use strict';
  var E = window.E21; if (!E) return;
  var $ = E.$, $$ = E.$$, esc = E.esc;

  var DOM = {
    electronics: { name: 'Electronics', color: 'var(--e-cyan)' },
    computer: { name: 'Computer Eng.', color: 'var(--e-violet)' },
    data: { name: 'Data Science', color: 'var(--e-lime)' },
    engineering: { name: 'Engineering', color: 'var(--e-amber)' }
  };
  var SAFE = 'Use only batteries or a 5 V USB supply. Never work on mains electricity. Ask an adult for help with soldering irons, hot glue and tools, and disconnect power before changing the wiring.';

  var P = [
    { d: 'electronics', t: 'LED Blinker with a 555 Timer', lvl: 'Beginner', time: '1 hour', ic: 'fa-lightbulb', lab: 'circuit', labName: 'Circuit Lab',
      b: 'Build the classic astable oscillator that flashes an LED about 1.5 times a second.',
      parts: ['555 timer IC', 'Resistors: 1 kΩ, 47 kΩ, 330 Ω', 'Capacitors: 10 µF and 100 nF', '1 LED', 'Breadboard, jumper wires', '5–9 V battery pack'],
      steps: ['Place the 555 on the breadboard. Connect pin 1 to GND and pins 4 and 8 to +V.', 'Join pins 2 and 6. Connect the 47 kΩ resistor (R2) between pins 6 and 7, and the 1 kΩ resistor (R1) between pins 7 and 8.', 'Connect the 10 µF capacitor from pins 2/6 to GND. Add the 100 nF capacitor from pin 5 to GND to steady the chip.', 'Wire pin 3 through the 330 Ω resistor to the LED, then to GND.', 'Connect power. The LED should blink. Check the frequency: f ≈ 1.44 ÷ ((R1 + 2·R2) × C) = about 1.5 Hz.', 'Try other values of R2 and C and predict the new frequency before you measure it.'],
      learn: ['How an astable oscillator works', 'Reading a chip pinout', 'RC time constants (τ = R × C)'], safe: true },
    { d: 'electronics', t: 'Automatic Night Light', lvl: 'Beginner', time: '1 hour', ic: 'fa-moon', lab: 'circuit', labName: 'Circuit Lab',
      b: 'A light that switches itself on when the room gets dark, using a light-dependent resistor.',
      parts: ['LDR (light-dependent resistor)', 'NPN transistor (BC547 or 2N2222)', '10 kΩ resistor, 330 Ω resistor', '1 LED', '4.5–6 V battery pack', 'Breadboard and wires'],
      steps: ['Make a voltage divider: connect the 10 kΩ resistor from +V to a middle point, and the LDR from that middle point to GND.', 'In light the LDR resistance is low, so the middle point sits near 0 V. In darkness the LDR resistance rises (hundreds of kΩ) and the middle point voltage climbs toward +V.', 'Connect the middle point to the transistor base. When the voltage rises above about 0.7 V the transistor switches on.', 'Wire the LED and 330 Ω resistor from +V to the transistor collector. Connect the emitter to GND.', 'Cover the LDR with your hand. The LED should switch on. Change the fixed resistor value to adjust how dark it must be.'],
      learn: ['Voltage dividers with sensors', 'Using a transistor as a switch', 'Why LEDs need a series resistor'], safe: true },
    { d: 'electronics', t: 'Door Open Alarm', lvl: 'Beginner', time: '1 hour', ic: 'fa-bell', lab: 'logic', labName: 'Logic Lab',
      b: 'A simple alarm that beeps when a door is opened, built with a micro switch and a buzzer.',
      parts: ['Lever micro switch (with NO/NC contacts)', '5 V active buzzer', '4×AA battery pack (or 5 V USB supply)', 'Slide switch (arm/disarm)', 'Wires, tape or card for mounting'],
      steps: ['Mount the micro switch on the door frame so the closed door presses its lever.', 'Wire the switch using its normally-closed (NC) contact: pressed by the door the contact is open, and when the door opens the contact closes.', 'Connect: battery + → slide switch → micro switch NC → buzzer → battery −.', 'Close the door (silent), then open it: the buzzer sounds. Use the slide switch to arm and disarm.', 'Extension: add an LED in parallel with the buzzer (with a 330 Ω resistor).'],
      learn: ['Normally-open vs normally-closed contacts', 'Series circuits and switches', 'Designing for "fail-safe" behaviour'], safe: true },
    { d: 'electronics', t: 'Solar USB Charger', lvl: 'Intermediate', time: '3 hours', ic: 'fa-solar-panel', lab: 'circuit', labName: 'Circuit Lab',
      b: 'Charge a phone from sunlight using a small solar panel and a 5 V regulator.',
      parts: ['6 V, 2 W solar panel', 'Buck converter module set to 5 V', 'Schottky diode (1N5819)', 'USB-A socket module', 'Small enclosure, wires, heat-shrink'],
      steps: ['Calculate the power: a 2 W panel gives at most about 0.33 A at 6 V in full sun. Expect less on cloudy days.', 'Connect the panel through the Schottky diode (stops reverse current at night) to the buck converter input.', 'Set the converter output to 5.0 V with a multimeter before connecting any device.', 'Connect the output to the USB socket. Mount everything in the enclosure with a gap for the panel cable.', 'Test with a phone in the sun. Measure voltage and current to find the panel power (P = V × I) and calculate its efficiency.'],
      learn: ['Power, voltage and current in real units', 'Why diodes block reverse current', 'Voltage regulation'], safe: true },
    { d: 'electronics', t: 'Water Tank Level Indicator', lvl: 'Intermediate', time: '2 hours', ic: 'fa-water', lab: 'logic', labName: 'Logic Lab',
      b: 'Three LEDs show how full a tank is, using transistors and water-sensing probes.',
      parts: ['3 NPN transistors (BC547)', '3 LEDs (red, yellow, green)', '3 × 330 Ω and 3 × 10 kΩ resistors', 'Stainless screws or wire for probes', '5 V supply (USB or batteries)', 'Plastic bottle to test with'],
      steps: ['Fix three probes at 1/3, 2/3 and full height, plus a common probe at the bottom connected to +5 V.', 'Connect each upper probe through a 10 kΩ resistor to a transistor base.', 'Wire each LED with a 330 Ω resistor between +5 V and its transistor collector. Connect the emitters to GND.', 'When water touches a probe, a tiny current flows through the water to the base and that LED lights up.', 'Test in a bottle of water. Add water slowly and note which LED lights at which level.'],
      learn: ['Using conduction as a sensor', 'Transistor switching', 'Mapping physical levels to signals'], safe: true },

    { d: 'computer', t: '4-bit Adder on a Breadboard', lvl: 'Intermediate', time: '3 hours', ic: 'fa-calculator', lab: 'logic', labName: 'Logic Lab',
      b: 'Add two 4-bit numbers with real logic chips and show the answer on LEDs.',
      parts: ['74LS83 4-bit adder IC (or 7486 XOR + 7408 AND + 7432 OR chips)', '8 DIP switches or jumper wires (inputs)', '5 LEDs with 330 Ω resistors', '5 V supply (4×AA or USB regulator)', 'Breadboard and jumper wires'],
      steps: ['First practise in the Logic Lab: set A and B bits and watch the sum and the carry.', 'Place the adder IC on the breadboard. Connect its power pins (check the datasheet pinout) and tie the carry-in pin to GND.', 'Connect switches to the A inputs and to the B inputs. Use pull-down resistors so an open switch reads 0.', 'Connect the four sum outputs and the carry-out to LEDs through 330 Ω resistors.', 'Set A = 0101 (5) and B = 0011 (3). The LEDs should show 01000 (8). Test an overflow: 1111 + 0001.'],
      learn: ['Binary addition with full adders', 'Carry propagation', 'Reading chip datasheets'], safe: true },
    { d: 'computer', t: 'Traffic Light Controller', lvl: 'Beginner', time: '2 hours', ic: 'fa-traffic-light', lab: 'cpu', labName: 'CPU Emulator',
      b: 'Program a microcontroller to run a three-colour traffic light with a pedestrian button.',
      parts: ['Arduino Uno (or compatible)', 'Red, yellow and green LEDs', '3 × 220 Ω resistors', 'Push button + 10 kΩ resistor', 'Breadboard and jumper wires'],
      steps: ['Connect each LED through a 220 Ω resistor to pins 8, 9, 10 and to GND. Connect the button to pin 2 with a pull-down resistor.', 'Draw the states on paper: GREEN → YELLOW → RED → (RED + YELLOW) → GREEN.', 'Write a state machine: a variable holds the current state, and millis() timing decides when to move on (avoid delay() so the button still works).', 'On a button press, finish the current green period then switch to red for 10 seconds.', 'Test every state. Add a flashing-yellow "night mode" as a challenge.'],
      learn: ['Finite state machines', 'Digital inputs and outputs', 'Non-blocking timing'], safe: true },
    { d: 'computer', t: 'Write a Program for the Mini CPU', lvl: 'Beginner', time: '1 hour', ic: 'fa-microchip', lab: 'cpu', labName: 'CPU Emulator',
      b: 'No parts needed: write assembly language and run it on the in-browser 8-bit CPU.',
      parts: ['Just this page: open the CPU Emulator lab'],
      steps: ['Load the "Multiply (6 × 7)" example and step through it, watching register C grow after each ADD.', 'Change the numbers to compute 9 × 8. Predict the result first.', 'Write a program that computes 5! (120) using a loop and your multiplication loop inside it.', 'Write a program that fills memory 0–9 with the numbers 10, 20, … 100 and then adds them up.', 'Challenge: what happens if you multiply 20 × 20? Look at the carry flag to see why (8-bit overflow).'],
      learn: ['Fetch, decode, execute', 'Registers, flags and memory', 'How loops and conditions become jumps'], safe: false },
    { d: 'computer', t: 'Binary Clock', lvl: 'Intermediate', time: '4 hours', ic: 'fa-clock', lab: 'numbers', labName: 'Number Lab',
      b: 'A clock whose hours, minutes and seconds are shown as rows of glowing binary digits.',
      parts: ['Arduino Nano or Raspberry Pi Pico', 'DS3231 real-time clock module', '3 × 74HC595 shift registers (or LED driver)', '17 LEDs and 330 Ω resistors', 'Breadboard or perfboard, wires'],
      steps: ['Practise in the Number Lab: show 37 minutes as the bits 100101.', 'Wire the DS3231 to the microcontroller over I²C (SDA, SCL, 3.3–5 V, GND).', 'Chain the shift registers and connect the LEDs so each row represents hours, minutes and seconds in binary.', 'Read the time from the RTC every second, split it into tens and units (or use plain binary), and shift the bits out to the LEDs.', 'Add a button to switch between 12 h and 24 h, or between binary and a BCD display.'],
      learn: ['Binary and BCD representation', 'I²C communication', 'Shift registers for more outputs'], safe: true },

    { d: 'data', t: 'Class Results Analyser', lvl: 'Beginner', time: '1 hour', ic: 'fa-table-list', lab: 'data', labName: 'Data Lab',
      b: 'Turn a table of marks into insight: averages, spread, outliers and a histogram.',
      parts: ['A CSV file of anonymous marks (or the sample dataset)', 'The Data Lab on this page'],
      steps: ['Type or paste marks with a header row, such as <code>student,maths,science</code>. Use ID numbers instead of names.', 'Press Analyse. Compare the mean and the median: if they differ a lot, the data is skewed.', 'Look at the histogram. Is it one hill, two hills, or flat? What would each mean for teaching?', 'Check the correlation between subjects. Does a high maths mark tend to go with a high science mark?', 'Write three sentences explaining what you found and one thing the data cannot tell you.'],
      learn: ['Mean, median and standard deviation', 'Reading a histogram', 'Correlation is not causation'], safe: false },
    { d: 'data', t: 'Weather Station Data Logger', lvl: 'Intermediate', time: '4 hours', ic: 'fa-cloud-sun', lab: 'data', labName: 'Data Lab',
      b: 'Build a sensor that records temperature and humidity, then analyse the log.',
      parts: ['ESP32 or Raspberry Pi Pico', 'BME280 or DHT22 sensor', 'microSD module (or serial cable to a computer)', 'Breadboard, wires, USB power', 'Weatherproof box with vents'],
      steps: ['Connect the sensor (I²C for the BME280). Print readings to the serial monitor first.', 'Add a timestamp and write one CSV row per 10 minutes: <code>time,temp_c,humidity</code>.', 'Place the station in the shade, 1.5 m off the ground, away from walls that hold heat.', 'After 24 hours load the CSV into the Data Lab. Plot temperature against hour. Find the hottest hour.', 'Compare with a reading from a trusted thermometer and describe any difference (calibration).'],
      learn: ['Sensors and sampling', 'Cleaning and logging data', 'Why placement affects measurements'], safe: true },
    { d: 'data', t: 'Predict Crop Yield from Rainfall', lvl: 'Intermediate', time: '2 hours', ic: 'fa-seedling', lab: 'data', labName: 'Data Lab',
      b: 'Fit a regression line to rainfall and yield data and use it to make a prediction.',
      parts: ['The "Rainfall vs maize yield" sample dataset (or your own farm records)'],
      steps: ['Open the Data Lab and load the sample dataset. This is illustrative sample data, not real measurements.', 'Choose X = rainfall and Y = yield. Read the slope: how much extra yield for each extra millimetre?', 'Check R². A high value means rainfall explains much of the variation; a low value means other factors matter.', 'Enter a rainfall value into the predictor. Notice the ± typical error.', 'Discuss: why is it unsafe to predict for rainfall far outside your data? What else affects yield (soil, seed, pests, timing)?'],
      learn: ['Linear regression and R²', 'Prediction and error', 'Limits of models'], safe: false },
    { d: 'data', t: 'Study-Habits Survey', lvl: 'Beginner', time: '3 hours', ic: 'fa-clipboard-list', lab: 'data', labName: 'Data Lab',
      b: 'Design a small survey, collect responses fairly, and analyse the results.',
      parts: ['Paper or a form tool', 'The Data Lab', 'Permission from your teacher'],
      steps: ['Decide your question, for example "Does more sleep go with higher test scores?"', 'Write 3–4 questions with numeric answers (hours slept, hours studied, last test score).', 'Ask for answers anonymously and explain how the data will be used. Participation is optional.', 'Enter the data as a CSV and run the Data Lab. Check the correlation table and the scatter plot.', 'Present your findings, including the sample size and any bias (who did you not ask?).'],
      learn: ['Survey design and sampling', 'Ethics and consent in data collection', 'Interpreting correlation'], safe: false },

    { d: 'engineering', t: 'Cardboard Bridge Challenge', lvl: 'Beginner', time: '3 hours', ic: 'fa-bridge', lab: 'data', labName: 'Data Lab',
      b: 'Design, build and test a bridge from cardboard and glue, then improve it using your test data.',
      parts: ['Cardboard or craft sticks', 'Glue or tape', 'Ruler, scissors', 'Small bag and weights (sand or coins)', 'A 40 cm gap between two tables'],
      steps: ['Define the problem: span 40 cm, lightest design that carries the most load.', 'Sketch two designs: a flat beam and a triangular truss. Predict which is stronger and why.', 'Build both. Weigh each bridge.', 'Add load gradually until it fails. Record the failure load and where it broke.', 'Improve the design, retest, and record the strength-to-weight ratio. Plot your results in the Data Lab.'],
      learn: ['The engineering design process', 'Why triangles are strong', 'Testing, measuring and iterating'], safe: false },
    { d: 'engineering', t: 'Smart Irrigation Controller', lvl: 'Advanced', time: '6 hours', ic: 'fa-droplet', lab: 'scope', labName: 'Signal Scope',
      b: 'A microcontroller waters plants only when the soil is dry, saving water.',
      parts: ['ESP32 or Arduino', 'Capacitive soil moisture sensor', '5 V relay module', '5 V mini DC water pump', 'Water tank, tubing', '5 V USB power supply', 'Jumper wires and a waterproof box'],
      steps: ['Read the sensor on an analog pin and print values. Record the reading in dry air and in a glass of water to calibrate.', 'Set a dry threshold and a wet threshold (hysteresis) so the pump does not switch on and off rapidly.', 'Control the relay from a digital pin. Power only the low-voltage 5 V pump through it. Never switch mains with a homemade circuit.', 'Add a maximum pump time (for example 10 s) as a safety limit, then wait before checking again.', 'Log moisture every 15 minutes and analyse it in the Data Lab to see the daily pattern.'],
      learn: ['Closed-loop control and hysteresis', 'Sensor calibration', 'Fail-safe design'], safe: true },
    { d: 'engineering', t: 'Line-Following Robot', lvl: 'Advanced', time: '6 hours', ic: 'fa-robot', lab: 'cpu', labName: 'CPU Emulator',
      b: 'A small robot that follows a black line using infrared sensors and a motor driver.',
      parts: ['Arduino Uno or Nano', '2 × infrared reflectance sensors (TCRT5000)', 'Dual motor driver (TB6612 or L298N)', '2 geared DC motors with wheels, caster wheel, chassis', '4×AA battery pack', 'Black electrical tape and a white board for the track'],
      steps: ['Assemble the chassis, motors and wheels. Mount the sensors at the front, facing down, about 5 mm above the surface.', 'Connect the motor driver to the Arduino and the battery. Test each motor forward and back.', 'Read both sensors. A dark line reflects little infrared, so the reading is low over the line.', 'Write simple control: both on white → forward; left sensor on line → turn left; right sensor on line → turn right.', 'Tune speeds and sensor distance. Challenge: use proportional control for smoother, faster tracking.'],
      learn: ['Sensors, actuators and control loops', 'Bang-bang vs proportional control', 'Debugging a physical system step by step'], safe: true },

    /* ---------------- more electronics ---------------- */
    { d: 'electronics', t: 'Continuity Tester', lvl: 'Beginner', time: '30 minutes', ic: 'fa-plug', lab: 'circuit', labName: 'Circuit Lab',
      b: 'A pocket tester whose LED lights when a wire, switch or fuse is a complete path for current.',
      parts: ['2 × AA battery holder with 2 AA cells (3 V)', '1 red LED', '150 Ω resistor', '2 crocodile-clip leads or test probes', 'Optional: a small box and a push button'],
      steps: ['Work out the resistor. A red LED drops about 2 V, so the resistor must drop the other 1 V. At 10 mA that is 1 V ÷ 0.01 A = 100 Ω. Use 150 Ω for a safe margin (about 7 mA). Check it in the Circuit Lab LED-resistor tab.',
        'Connect the battery + to one end of the 150 Ω resistor. Connect the other end to the long leg (anode) of the LED.',
        'Connect the short leg (cathode) of the LED to test lead A. Connect the battery − to test lead B.',
        'Touch the two leads together. The LED lights because you have closed the circuit. This is called continuity.',
        'Test parts that are not connected to any power: a wire (lights), a switch (lights only when it is on), a good fuse taken out of its holder (lights) and a blown fuse (stays dark).',
        'Turn the LED around. It stays dark, because a diode only lets current flow one way. Challenge: add a push button in series so the tester only works while you press it.'],
      learn: ['What a closed circuit and continuity mean', 'LED polarity (anode and cathode)', 'Choosing a series resistor with Ohm’s law'], safe: true },
    { d: 'electronics', t: 'Touch-Sensitive Switch', lvl: 'Intermediate', time: '1 hour', ic: 'fa-hand-pointer', lab: 'circuit', labName: 'Circuit Lab',
      b: 'Light an LED just by touching two metal contacts, using two transistors to amplify a tiny current through your skin.',
      parts: ['2 NPN transistors (BC547 or 2N2222)', '1 kΩ resistor', '330 Ω resistor', '1 LED', '2 bare metal contacts (two screws or strips of foil)', '4.5–6 V battery pack', 'Breadboard and jumper wires'],
      steps: ['Build a Darlington pair: join the two collectors together, connect the emitter of transistor 1 to the base of transistor 2, and connect the emitter of transistor 2 to GND.',
        'Connect the 330 Ω resistor from +V to the LED anode, and the LED cathode to the joined collectors.',
        'Connect the 1 kΩ resistor from the base of transistor 1 to touch contact B. Connect touch contact A to +V.',
        'Touch both contacts with one finger. A few microamps flow through your skin into the base. The two transistors multiply that current hundreds or thousands of times, enough to light the LED.',
        'Try dry and slightly damp fingers. Damp skin conducts better, so the LED gets brighter. Skin resistance changes a lot from person to person.',
        'Challenge: use the Circuit Lab to estimate the base current if your skin is 500 kΩ at 5 V, then replace the LED with a 5 V buzzer to make a touch alarm.'],
      learn: ['The Darlington pair and current gain', 'Skin resistance as a sensor', 'Why a resistor protects a transistor base'], safe: true },
    { d: 'electronics', t: 'Transistor Flasher', lvl: 'Intermediate', time: '2 hours', ic: 'fa-wave-square', lab: 'scope', labName: 'Signal Scope',
      b: 'Make two LEDs flash in turn using only two transistors, two capacitors and some resistors, with no chip at all.',
      parts: ['2 NPN transistors (BC547 or 2N2222)', '2 × 470 Ω resistors', '2 × 47 kΩ resistors', '2 × 10 µF electrolytic capacitors', '2 LEDs', '5–6 V battery pack', 'Breadboard and jumper wires'],
      steps: ['Connect both emitters to GND.',
        'For each transistor: connect a 470 Ω resistor from +V to an LED anode, and the LED cathode to that transistor’s collector.',
        'Connect a 47 kΩ resistor from +V to the base of each transistor.',
        'Cross-couple the pair: connect a 10 µF capacitor from the collector of transistor 1 to the base of transistor 2, and another from the collector of transistor 2 to the base of transistor 1. The + leg of each capacitor goes to the collector.',
        'Connect the power. The two LEDs flash in turn. When one transistor switches off, its collector rises and pushes the other transistor on through the capacitor. Each side stays on for about 0.69 × R × C = 0.69 × 47 kΩ × 10 µF ≈ 0.3 s, so about 1.5 flashes a second.',
        'Swap the capacitors for 100 µF to slow it down, or 1 µF to make it flicker. Compare your predictions with the waveform in the Signal Scope.',
        'If both LEDs stay on or dim, check the capacitor polarity and that each base resistor goes to +V.'],
      learn: ['Positive feedback and oscillation', 'RC timing (t ≈ 0.69 × R × C)', 'Reading a cross-coupled circuit'], safe: true },
    { d: 'electronics', t: 'Rain Alarm', lvl: 'Intermediate', time: '2 hours', ic: 'fa-cloud-rain', lab: 'circuit', labName: 'Circuit Lab',
      b: 'A sensor strip that sounds a buzzer as soon as raindrops bridge its metal tracks.',
      parts: ['2 NPN transistors (BC547)', '1 kΩ resistor', '5 V active buzzer', 'A piece of stripboard (or two bare wires) for the sensor', '4.5–6 V battery pack', 'Breadboard and jumper wires', 'A plastic box or bag to keep the circuit dry'],
      steps: ['Make the sensor. On the stripboard, connect every other copper strip to +V and the remaining strips to each other, so the two sets sit side by side but do not touch. Dry, the gap between them is an open circuit.',
        'Build a Darlington pair as in the Touch-Sensitive Switch: join the collectors, connect the emitter of transistor 1 to the base of transistor 2, and the emitter of transistor 2 to GND.',
        'Connect the second set of strips through the 1 kΩ resistor to the base of transistor 1.',
        'Connect the buzzer between +V and the joined collectors, with the buzzer + toward +V.',
        'Keep only the sensor outside and the rest of the circuit in a dry box. Drip a little tap water across the strips. Water with minerals in it conducts a tiny current, the transistors amplify it and the buzzer sounds.',
        'Dry the sensor to silence it. Challenge: test tap water, salt water and cooking oil, and rank how well each one triggers the alarm.'],
      learn: ['Using conduction as a sensor', 'Darlington pair amplification', 'Protecting electronics from the weather'], safe: true },

    /* ---------------- more computer engineering ---------------- */
    { d: 'computer', t: '4-bit Binary Counter', lvl: 'Beginner', time: '2 hours', ic: 'fa-hashtag', lab: 'numbers', labName: 'Number Lab',
      b: 'Press a button to count from 0 to 15 and watch the number appear as four glowing binary digits.',
      parts: ['Arduino Uno or Nano with a USB cable', '4 LEDs', '4 × 220 Ω resistors', '1 push button', 'Breadboard and jumper wires'],
      steps: ['Connect four LEDs, each with a 220 Ω resistor in series, from digital pins 2, 3, 4 and 5 to GND. Pin 2 shows the 1s bit, pin 3 the 2s, pin 4 the 4s and pin 5 the 8s.',
        'Connect the push button between pin 7 and GND. You will use the built-in pull-up resistor, so a pressed button reads LOW.',
        'In <code>setup()</code>, set pins 2 to 5 as <code>OUTPUT</code> and pin 7 as <code>INPUT_PULLUP</code>.',
        'Keep a variable called <code>count</code>. Each time the button changes from not pressed to pressed, do <code>count = (count + 1) % 16</code>. Wait about 30 ms after a press so contact bounce is not counted twice.',
        'Show the bits. For each bit b from 0 to 3, call <code>digitalWrite(2 + b, (count &gt;&gt; b) &amp; 1)</code>.',
        'Press the button and check each pattern in the Number Lab: 5 is 0101, 10 is 1010 and 15 is 1111. What happens after 15?',
        'Challenge: add a second button that counts down, or make the counter count by itself once a second.'],
      learn: ['Binary place values (1, 2, 4, 8)', 'Digital inputs and outputs on a microcontroller', 'Button debouncing'], safe: true },
    { d: 'computer', t: 'Find the Biggest Number', lvl: 'Intermediate', time: '1 hour', ic: 'fa-arrow-up-wide-short', lab: 'cpu', labName: 'CPU Emulator',
      b: 'Write a real machine-code program that scans a table in memory and prints the largest value.',
      parts: ['The CPU Emulator on this page (nothing to buy)', 'Pen and paper to trace the registers'],
      steps: ['The plan: keep the biggest number seen so far in register A, then look at every number in a table, one at a time, using a pointer in register D.',
        'Put the data in memory with <code>DB</code> at the end of the program. Those bytes sit in the same memory as the code.',
        'Type this program into the CPU Emulator:<pre>        MOV A, 0        ; biggest so far\n        MOV B, 0        ; how many looked at\n        MOV D, table    ; pointer to the table\nnext:   LOAD C, [D]     ; read one number\n        CMP C, A\n        JC skip         ; C is smaller: keep A\n        MOV A, C        ; C is bigger: remember it\nskip:   INC D\n        INC B\n        CMP B, 6\n        JNZ next\n        OUT A\n        HLT\ntable:  DB 17, 42, 8, 99, 63, 25</pre>',
        'Press Assemble and look at the machine-code listing. The <code>DB</code> bytes at the end are 11 2A 08 63 3F 19, which is 17, 42, 8, 99, 63 and 25 in hex.',
        'Press Step and watch <code>CMP C, A</code> set the carry flag when C is smaller than A. <code>JC skip</code> then jumps over <code>MOV A, C</code>.',
        'Run it. The output should be 99. Change the table and run again. Try one where the biggest number comes first, then last.',
        'Challenge: find the smallest number instead, or count how many numbers are bigger than 50.'],
      learn: ['Loops, pointers and tables in memory', 'Comparing numbers with flags', 'How code and data share memory'] },
    { d: 'computer', t: 'Digital Combination Lock', lvl: 'Intermediate', time: '3 hours', ic: 'fa-lock', lab: 'logic', labName: 'Logic Lab',
      b: 'Build a lock from logic gates that lights an LED only when four switches are set to the secret code.',
      parts: ['74HC04 (six NOT gates)', '74HC08 (four AND gates)', '4 switches or DIP switches', '4 × 10 kΩ resistors (pull-down)', '1 LED and a 330 Ω resistor', '5 V USB supply or 3 × AA batteries', 'Breadboard and jumper wires'],
      steps: ['Choose a code, for example A = 1, B = 0, C = 1, D = 0. The lock should open only when all four switches match.',
        'Write the rule as logic: OPEN = A AND (NOT B) AND C AND (NOT D). Try the gates one at a time in the Logic Lab to see how AND and NOT behave.',
        'Wire each switch between +V and its input, with a 10 kΩ pull-down resistor from the input to GND. An open switch reads 0 and a closed switch reads 1.',
        'Use the 74HC04 for the NOT gates: switch B goes to pin 1 (output on pin 2) and switch D goes to pin 3 (output on pin 4).',
        'Use the 74HC08 for the AND gates. Gate 1: A on pin 1 and NOT B on pin 2, output on pin 3. Gate 2: C on pin 4 and NOT D on pin 5, output on pin 6. Gate 3: connect pin 3 to pin 9 and pin 6 to pin 10, output on pin 8.',
        'Connect pin 14 of both chips to +V and pin 7 to GND. Tie every unused input pin to GND, because floating inputs on CMOS chips pick up noise.',
        'Connect pin 8 of the 74HC08 through the 330 Ω resistor to the LED and then to GND. Set the switches to 1010 and the LED lights. Any other code keeps it dark.',
        'Challenge: change the code by moving the NOT gates to other inputs, or add a second LED that lights when the code is wrong.'],
      learn: ['AND and NOT gates in real chips', 'Turning a rule into a logic expression', 'Pull-down resistors and unused inputs'], safe: true },

    /* ---------------- more data science ---------------- */
    { d: 'data', t: 'Sleep and Test Scores', lvl: 'Beginner', time: '2 hours', ic: 'fa-bed', lab: 'data', labName: 'Data Lab',
      b: 'Collect real pairs of numbers, then use a scatter plot and a line of best fit to see if more sleep goes with better scores.',
      parts: ['A short survey (paper or online) with two questions', 'A text editor or spreadsheet to write a CSV file', 'The Data Lab on this page', 'At least 15 volunteers who agree to take part (no names needed)'],
      steps: ['Write one clear question for each variable: “How many hours did you sleep last night?” and “What was your score in the last test, out of 100?” Ask volunteers to answer without their names.',
        'Collect at least 15 pairs. Type them into a text file with the header line <code>hours,score</code>, then one pair per line.',
        'Open the Data Lab, load the CSV and read the statistics: the mean, median and spread of each column.',
        'Draw the scatter plot with hours on the x axis and score on the y axis. Do the points drift up, drift down, or form a cloud?',
        'Fit the line of best fit. The slope tells you roughly how many marks one extra hour of sleep goes with. The correlation r is close to 1 or −1 when the line fits well and near 0 when it does not.',
        'Write a careful conclusion. A pattern does not prove that sleep causes better scores. A third thing, such as study time or stress, could affect both. Say how you could test cause.',
        'Challenge: remove one unusual point (an outlier) and see how much the slope changes.'],
      learn: ['Scatter plots and the line of best fit', 'Correlation (r) and what it means', 'Correlation is not causation'] },
    { d: 'data', t: 'Heart Rate and Exercise', lvl: 'Beginner', time: '2 hours', ic: 'fa-heart-pulse', lab: 'data', labName: 'Data Lab',
      b: 'Measure pulse before and after exercise on a group of people and compare the results with charts and averages.',
      parts: ['Stopwatch or phone timer', 'A results table and a pen', 'A safe place to exercise', '8–10 volunteers who are well and agree to take part', 'The Data Lab on this page'],
      steps: ['Safety first: only healthy volunteers who agree to take part, light exercise only, and stop anyone who feels dizzy, faint or unwell. Ask an adult if you are unsure.',
        'Measure the resting pulse. The person sits quietly for 2 minutes. Count the beats at the wrist for 30 seconds and double the number.',
        'Ask them to do 1 minute of star jumps or marching on the spot. Straight away, count the pulse for 15 seconds and multiply by 4.',
        'After 3 minutes of rest, measure the pulse again as the recovery value.',
        'Type the results into a CSV with the header <code>person,resting,after,recovery</code>. Use initials or numbers, not names.',
        'Load the file in the Data Lab. Compare the mean of resting and after. Which column varies more from person to person? Draw a chart of the three columns.',
        'Check that your test was fair: same exercise, same duration, same rest time for everyone. Challenge: compare two different exercises on the same people.'],
      learn: ['Mean and spread', 'Fair tests and controlling variables', 'Comparing groups with charts'] },
    { d: 'data', t: 'Data Cleaning Challenge', lvl: 'Intermediate', time: '2 hours', ic: 'fa-broom', lab: 'data', labName: 'Data Lab',
      b: 'Fix a messy table of typos, blanks, duplicates and mixed units before you analyse it, the way real data scientists do.',
      parts: ['A messy CSV that you make yourself (about 20 rows)', 'A text editor', 'The Data Lab on this page'],
      steps: ['Make the messy file. Type about 20 rows such as <code>name,age,height_cm</code> and add mistakes on purpose: a blank age, a height written as 1.62 (metres) among centimetres, “Twelve” instead of 12, a repeated row and one impossible value such as 1620.',
        'Load it in the Data Lab and read the summary. Notice how the mean and the maximum look strange. The bad values spoil them.',
        'Make a list of every problem: which row, what is wrong, and how you will fix it (correct, convert, remove or leave blank).',
        'Fix them in the text file. Rule: never guess silently. Convert 1.62 m to 162 cm, write “Twelve” as 12, delete the duplicate, and mark the impossible value so you can check it with the person who collected it.',
        'Load the cleaned file. Compare the new mean, minimum and maximum with the old ones. How much did each mistake change the answer?',
        'Write a short data diary of every change, so another person could repeat your cleaning and get the same result.'],
      learn: ['Spotting missing, wrong and duplicate data', 'Units and consistent formats', 'Why cleaning comes before analysis'] },

    /* ---------------- more engineering ---------------- */
    { d: 'engineering', t: 'Balloon-Powered Car', lvl: 'Beginner', time: '2 hours', ic: 'fa-car', lab: 'data', labName: 'Data Lab',
      b: 'Build a car pushed by a jet of air from a balloon, then test and improve it like an engineer.',
      parts: ['Cardboard (about 10 cm × 20 cm) for the body', '4 bottle caps for wheels', '2 drinking straws and 2 wooden skewers (axles)', '1 flexible straw and 1 balloon (non-latex if anyone is allergic)', 'Tape and a rubber band', 'Tape measure'],
      steps: ['Tape two straws across the underside of the cardboard, parallel to each other and square to the sides, one near each end.',
        'Slide a skewer through each straw. Ask an adult to trim the skewers and to make a small hole in the centre of each bottle cap. Push a cap onto each end of each axle. The axles must spin freely inside the straws.',
        'Tape the flexible straw to the top of the body, pointing backwards past the rear. Fit the balloon on the other end of the straw and fasten it with a rubber band, tight enough not to leak but not squashing the straw.',
        'Blow up the balloon through the straw, pinch the end, put the car on a smooth floor and let go. The air jets backwards and pushes the car forwards. This is Newton’s third law: every action has an equal and opposite reaction.',
        'Measure how far the car travels in three runs and write down every distance. Use the average, because single runs vary.',
        'Change one thing at a time (wheel size, straw length, weight or amount of air) and measure again. Type the distances into a CSV and compare them in the Data Lab.',
        'Challenge: design the fastest car in your class using fair tests, and explain why it worked.'],
      learn: ['Action and reaction forces', 'Friction and weight', 'Changing one variable at a time'] },
    { d: 'engineering', t: 'Hydraulic Robot Arm', lvl: 'Intermediate', time: '4 hours', ic: 'fa-hand', lab: 'data', labName: 'Data Lab',
      b: 'Move a cardboard arm with water-filled syringes and learn how liquids can carry force.',
      parts: ['Cardboard or thick craft sticks for the arm', '4 plastic syringes (10 mL, no needles) of at least two sizes', '2 pieces of clear tubing that fit the syringes', 'Water with a little food colouring', 'Strong tape and split pins for joints', 'A light object to lift (such as a small cup)', 'Ruler or scale'],
      steps: ['Sketch the arm on paper: a base, one arm segment that lifts, and a gripper or scoop. Mark where each joint turns.',
        'Build the segments from cardboard or sticks. Fasten the joints with split pins so they turn easily.',
        'Make a pair of syringes: fill both with water, join them with a tube and push out every air bubble. Air squashes but water does not. Push one plunger and the other moves.',
        'Fix the output syringe so that its plunger pushes the arm segment. Keep the control syringe at the base where you press it.',
        'Test with a light object. Try a large output syringe with a small control syringe: you push a long way with a small force, and the arm moves a short way with a bigger force. This trade of force for distance is the same idea as a lever.',
        'Add a second pair of syringes to open and close the gripper. Record how much weight the arm can lift for different syringe sizes in the Data Lab.',
        'Keep all the water away from any electrical equipment. Challenge: compare two syringe size ratios and find which lifts the most.'],
      learn: ['Hydraulics and pressure (Pascal’s principle)', 'Force and distance trade-offs', 'Joints, levers and mechanisms'] },
    { d: 'engineering', t: 'Traffic Flow Study', lvl: 'Beginner', time: '3 hours', ic: 'fa-road', lab: 'data', labName: 'Data Lab',
      b: 'Count vehicles at a busy spot, find the rush hour in your data and suggest an improvement an engineer could make.',
      parts: ['Notebook or a printed tally sheet', 'Pen and a watch or phone timer', 'A safe place to observe, with an adult', 'The Data Lab on this page'],
      steps: ['Choose a road or school gate and agree a safe place to stand with an adult. Never stand in the road, and keep clear of driveways and crossings.',
        'Make a tally sheet with a row for each 5-minute block and columns for the types you will count, such as cars, buses and bicycles.',
        'Count for at least 30 minutes, making one tally mark for each vehicle that passes. Repeat at a different time of day.',
        'Type the totals into a CSV with the header <code>time,cars,buses,bikes</code> and load it in the Data Lab.',
        'Find the busiest 5-minute block (the peak) and the mean per block. Draw a chart of cars against time.',
        'Suggest one change an engineer might make, such as a crossing, a bus lane or different signal timing, and say which numbers support your idea.',
        'Challenge: explain what extra data you would need to test whether your change would really help.'],
      learn: ['Collecting data by tally and sampling', 'Finding peaks and averages', 'Using evidence to propose a design'] },
    { d: 'engineering', t: 'Temperature-Controlled Fan', lvl: 'Advanced', time: '5 hours', ic: 'fa-fan', lab: 'scope', labName: 'Signal Scope',
      b: 'Read a temperature sensor with a microcontroller and switch a fan on automatically when it gets warm.',
      parts: ['Arduino Uno or Nano with a USB cable', '10 kΩ NTC thermistor and a 10 kΩ resistor', 'Small 5 V DC fan or motor (under 100 mA)', 'NPN transistor (BC547 or 2N2222)', '1 kΩ resistor for the base', '1N4001 diode', 'Breadboard and jumper wires'],
      steps: ['Build a voltage divider: 5 V, then the 10 kΩ resistor, then the junction (connect this to pin A0), then the thermistor, then GND. As the thermistor warms its resistance falls, so the voltage at A0 changes.',
        'Read the sensor with <code>analogRead(A0)</code> (a number from 0 to 1023) and print it with <code>Serial.println</code>. Warm the thermistor between your fingers. With this wiring the reading falls as it gets hotter.',
        'Add the fan driver: Arduino pin 9, then the 1 kΩ resistor, then the transistor base. Connect the emitter to GND and the collector to one fan wire. Connect the other fan wire to +5 V.',
        'Fit the 1N4001 diode across the fan, with the stripe (cathode) toward +5 V. When a motor switches off it produces a voltage spike, and the diode absorbs it so the transistor survives.',
        'Write the control: if the reading drops below your chosen limit (it is warm), call <code>analogWrite(9, 255)</code> to run the fan. Otherwise call <code>analogWrite(9, 0)</code>.',
        'Make it smoother. Use <code>map()</code> to turn the temperature range into a fan speed from 0 to 255, so the fan speeds up gradually. This is proportional control.',
        'Test with warm air only, for example your hand. Never heat the thermistor with a flame or hot tool. Record the readings and fan speed over time and compare the pattern with the Signal Scope.',
        'Challenge: add a gap between the switch-on and switch-off temperatures (hysteresis) so the fan does not flick on and off around the limit.'],
      learn: ['Sensors, voltage dividers and analogue input', 'Driving a motor with a transistor and a flyback diode', 'Proportional control and hysteresis'], safe: true }
  ];

  /* keep each field together (electronics, computer, data, engineering), in the order written */
  var ORDER = ['electronics', 'computer', 'data', 'engineering'];
  P = P.map(function (p, i) { return [p, i]; }).sort(function (a, b) { return (ORDER.indexOf(a[0].d) - ORDER.indexOf(b[0].d)) || (a[1] - b[1]); }).map(function (x) { return x[0]; });

  var grid = $('#e21-projects'), dlg = $('#e21-dialog'), box = $('#e21-dlg'), cur = 'all', lastBtn = null;

  function render() {
    grid.innerHTML = P.filter(function (p) { return cur === 'all' || p.d === cur; }).map(function (p) {
      var i = P.indexOf(p), c = DOM[p.d].color;
      return '<button type="button" class="e21-proj" style="--c:' + c + '" data-i="' + i + '" aria-haspopup="dialog"><div class="e21-proj-art"><i class="fa-solid ' + p.ic + '" aria-hidden="true"></i></div>' +
        '<div class="e21-proj-body"><div class="e21-tags"><span class="e21-tag lvl">' + p.lvl + '</span><span class="e21-tag"><i class="fa-regular fa-clock"></i> ' + p.time + '</span></div><h3>' + esc(p.t) + '</h3><p>' + esc(p.b) + '</p><div class="e21-tags"><span class="e21-tag">' + DOM[p.d].name + '</span></div></div></button>';
    }).join('');
  }
  function setFilter(f) {
    cur = f;
    $$('#e21-filters .e21-chipbtn').forEach(function (b) { b.setAttribute('aria-pressed', b.dataset.f === f ? 'true' : 'false'); });
    render();
  }
  E.onFilter = setFilter;
  $$('#e21-filters .e21-chipbtn').forEach(function (b) { b.addEventListener('click', function () { setFilter(b.dataset.f); }); });

  function openProject(i, btn) {
    var p = P[i], c = DOM[p.d].color;
    lastBtn = btn || null;
    box.innerHTML = '<div class="e21-dlg-head"><div><h3 id="e21-dlg-title">' + esc(p.t) + '</h3><div class="e21-tags"><span class="e21-tag lvl" style="--c:' + c + '">' + p.lvl + '</span><span class="e21-tag">' + p.time + '</span><span class="e21-tag">' + DOM[p.d].name + '</span></div></div><button type="button" class="e21-x" id="e21-close" aria-label="Close">✕</button></div>' +
      '<div class="e21-dlg-body"><p style="margin:0;color:var(--e-text)">' + esc(p.b) + '</p>' +
      (p.safe ? '<div class="e21-safe"><b>Safety:</b> ' + SAFE + '</div>' : '') +
      '<div><h4>What you will learn</h4><ul>' + p.learn.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4>Parts &amp; tools</h4><ul>' + p.parts.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ul></div>' +
      '<div><h4>Steps</h4><ol>' + p.steps.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ol></div>' +
      '<div class="e21-cta"><button type="button" class="e21-btn solid" id="e21-golab"><i class="fa-solid fa-flask"></i> Try it in the ' + p.labName + '</button><button type="button" class="e21-btn ghost" id="e21-done">Close</button></div></div>';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
    $('#e21-close').addEventListener('click', closeDlg); $('#e21-done').addEventListener('click', closeDlg);
    $('#e21-golab').addEventListener('click', function () { closeDlg(); E.openLab(p.lab, true); });
    dlg.scrollTop = 0; $('.e21-dlg-in', dlg).scrollTop = 0;
  }
  function closeDlg() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); if (lastBtn) lastBtn.focus(); }
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeDlg(); });
  grid.addEventListener('click', function (e) { var b = e.target.closest('.e21-proj'); if (b) openProject(+b.dataset.i, b); });
  render();
})();
