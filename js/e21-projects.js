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
      learn: ['Sensors, actuators and control loops', 'Bang-bang vs proportional control', 'Debugging a physical system step by step'], safe: true }
  ];

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
