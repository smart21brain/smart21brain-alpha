UPDATE courses SET final_exam_quiz_id = (SELECT id FROM quizzes WHERE title = 'Anatomy and Physiology (Medical Level) final exam'), final_exam_passing_score = 70 WHERE slug = 'anatomy-physiology-medical';

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
