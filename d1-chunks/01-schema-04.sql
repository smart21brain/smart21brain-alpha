-- ---------------------------------------------------------------------
-- Seed: Academy courses
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO stn_courses (id, title, category, description, modules) VALUES
(1, 'Microsoft Word Essentials', 'Word', 'Type, format and print professional documents for customers.',
 '[{"title":"Getting Started with Word","video_url":"","notes":"Interface tour, creating & saving documents, page setup (size, margins, orientation).","quiz":[{"q":"Which tab do you use to change page margins?","options":["Home","Layout","Insert","View"],"correct":1}]},
   {"title":"Formatting Text & Pages","video_url":"","notes":"Fonts, headings, bullet/numbered lists, page borders, headers & footers.","quiz":[{"q":"What is used to number pages automatically?","options":["Header/Footer tool","Spell check","Track changes","Mail merge"],"correct":0}]},
   {"title":"Tables, Images & Printing","video_url":"","notes":"Inserting tables and images, print preview, printing multiple copies for customers.","quiz":[{"q":"Where do you check a document before printing?","options":["Print Preview","Spell Check","Find & Replace","Word Count"],"correct":0}]}]'),
(2, 'Microsoft Excel Essentials', 'Excel', 'Build simple sales sheets, totals and printable reports.', '[{"title":"Cells, Rows & Formulas","video_url":"","notes":"Entering data, basic formulas (SUM, AVERAGE), cell references.","quiz":[{"q":"Which formula adds a range of cells?","options":["=TOTAL()","=SUM()","=ADD()","=PLUS()"],"correct":1}]},{"title":"Formatting & Charts","video_url":"","notes":"Number formats, borders, simple bar/line charts for sales data.","quiz":[{"q":"Which chart type is best to show a sales trend over months?","options":["Pie chart","Line chart","No chart needed","Table only"],"correct":1}]}]'),
(3, 'Photoshop for Print', 'Photoshop', 'Passport photo touch-ups, resizing and print layout basics.', '[{"title":"Canvas, Layers & Resolution","video_url":"","notes":"Setting canvas size in cm/inches at 300 DPI for print.","quiz":[{"q":"What DPI is standard for print-quality passport photos?","options":["72","150","300","600"],"correct":2}]},{"title":"Retouching & Background","video_url":"","notes":"Basic skin retouch, brightness/contrast, background cleanup.","quiz":[{"q":"Which adjustment brightens a dark photo?","options":["Hue/Saturation","Brightness/Contrast","Crop","Blur"],"correct":1}]}]'),
(4, 'Canva for Business', 'Canva', 'Design flyers, posters and social media graphics for customers.', '[{"title":"Templates & Brand Kits","video_url":"","notes":"Choosing templates, using brand colours and fonts consistently.","quiz":[{"q":"What lets you reuse the same colours/fonts across designs?","options":["Brand Kit","Layers panel","Grid view","Comments"],"correct":0}]}]'),
(5, 'Printing Operations', 'Printing', 'Paper types, print settings and finishing (lamination/binding) for customer jobs.', '[{"title":"Paper & Print Settings","video_url":"","notes":"Choosing A4/A3, colour vs black & white, duplex printing.","quiz":[{"q":"What setting prints on both sides of the paper?","options":["Duplex","Draft","Grayscale","Collate"],"correct":0}]}]');

-- ---------------------------------------------------------------------
-- Seed: Online-service requirement checklist templates (as JSON note in
-- a lightweight key/value table so the frontend can bootstrap defaults)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_service_templates (
  service_type TEXT PRIMARY KEY,
  checklist    TEXT NOT NULL                          -- JSON array of requirement strings
);

INSERT OR IGNORE INTO stn_service_templates (service_type, checklist) VALUES
('TRA', '["Valid National ID / Passport copy","TIN certificate (if existing)","Passport-size photo","Business registration certificate (if applicable)","Completed TRA application form"]'),
('BRELA', '["Proposed company/business names (2-3 options)","Copies of ID for all directors/owners","Passport-size photos of directors","Memorandum & Articles of Association (companies)","Registered office address"]'),
('NIDA', '["Birth certificate or age assessment","Parent/guardian ID (for minors)","Passport-size photo","Proof of residence (letter from local leader)"]'),
('Passport', '["National ID (NIDA)","Birth certificate","Passport-size photo (as per passport specs)","Old passport (renewals)","Completed application form"]'),
('Visa', '["Valid passport (6+ months validity)","Visa application form","Passport-size photo (destination country spec)","Invitation letter / travel itinerary","Proof of funds"]'),
('TIN', '["National ID / Passport copy","Business registration certificate (if applicable)","Physical/postal address","Completed TIN application form"]');

CREATE TABLE IF NOT EXISTS course_categories (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  name        TEXT NOT NULL UNIQUE,
  slug        TEXT NOT NULL UNIQUE,
  icon        TEXT DEFAULT 'fa-solid fa-book',           -- Font Awesome class, matches existing badge-pill icons
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Courses
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS courses (
  id                  INTEGER PRIMARY KEY AUTOINCREMENT,
  title               TEXT NOT NULL,
  slug                TEXT NOT NULL UNIQUE,
  description         TEXT,
  thumbnail_url       TEXT,
  category_id         INTEGER REFERENCES course_categories(id) ON DELETE SET NULL,
  instructor_id       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  level               TEXT NOT NULL DEFAULT 'beginner',   -- beginner|intermediate|advanced|all-levels
  age_range           TEXT,                                -- e.g. '7-10'
  language            TEXT DEFAULT 'English',
  objectives          TEXT,                                -- JSON array of strings ("what you'll learn")
  requirements        TEXT,                                -- JSON array of strings
  price               REAL NOT NULL DEFAULT 0,
  is_free             INTEGER NOT NULL DEFAULT 1,           -- 0/1 — kept alongside price for fast filtering
  certificate_enabled INTEGER NOT NULL DEFAULT 0,           -- 0/1 — certificate issued on completion
  passing_score       INTEGER NOT NULL DEFAULT 70,          -- REQUIRED PERCENTAGE: % of the course (lessons + any
                                                             -- module quizzes) that must be completed before the
                                                             -- final exam unlocks, or before the course itself is
                                                             -- marked done when there's no final exam.
  -- PHASE 8 — Final Exam: one optional exam (a normal row in the
  -- existing `quizzes` table) that sits above the modules, not inside
  -- one. It only unlocks once passing_score above is met, and the
  -- learner must clear final_exam_passing_score to complete the course.
  -- See src/lib/course-engine.js for how these two fields gate completion.
  final_exam_quiz_id       INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  final_exam_passing_score INTEGER NOT NULL DEFAULT 70,
  published           INTEGER NOT NULL DEFAULT 1,
  created_by          INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at          TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_courses_category ON courses(category_id);

CREATE INDEX IF NOT EXISTS idx_courses_instructor ON courses(instructor_id);

CREATE INDEX IF NOT EXISTS idx_courses_published ON courses(published);

-- ---------------------------------------------------------------------
-- PHASE 8 — Modules: the layer between a course and its lessons.
--   Course → Module → Lessons + (optional) Module Quiz → ... → Final Exam
-- A module's quiz is just another row in `quizzes`, referenced here —
-- no separate quiz-authoring system needed. passing_score is the %
-- correct required on THAT quiz for the module to count as done.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_modules (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  description    TEXT,
  quiz_id        INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  passing_score  INTEGER NOT NULL DEFAULT 70,        -- % correct required on this module's quiz, if it has one
  sort_order     INTEGER NOT NULL DEFAULT 0,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, title)
);

CREATE INDEX IF NOT EXISTS idx_course_modules_course ON course_modules(course_id);

-- ---------------------------------------------------------------------
-- Lessons — belong to a course (and, from Phase 8 on, usually to one of
-- its modules — module_id is nullable so older/simple courses can keep
-- a flat lesson list with no modules at all). A lesson can point at
-- existing content (a video, a material/PDF, or a quiz) or just carry
-- its own text body — reusing the site's existing content tables
-- instead of duplicating video/PDF storage.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_lessons (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id         INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  module_id         INTEGER REFERENCES course_modules(id) ON DELETE SET NULL, -- PHASE 8: which module (if any)
  title             TEXT NOT NULL,
  content_type      TEXT NOT NULL DEFAULT 'text',   -- text|video|pdf|quiz
  video_id          INTEGER REFERENCES videos(id) ON DELETE SET NULL,
  material_id       INTEGER REFERENCES materials(id) ON DELETE SET NULL,
  quiz_id           INTEGER REFERENCES quizzes(id) ON DELETE SET NULL,
  body              TEXT,                             -- lesson text / instructions
  duration_seconds  INTEGER,
  sort_order        INTEGER NOT NULL DEFAULT 0,
  is_preview        INTEGER NOT NULL DEFAULT 0,        -- 0/1 — viewable without enrolling
  created_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, title)
);

CREATE INDEX IF NOT EXISTS idx_course_lessons_course ON course_lessons(course_id);

CREATE INDEX IF NOT EXISTS idx_course_lessons_module ON course_lessons(module_id);

-- ---------------------------------------------------------------------
-- Enrollments — one row per (user, course). payment_status distinguishes
-- free enrollments from paid ones; 'pending' is used for a paid course
-- until a payment integration (a later phase) confirms it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS course_enrollments (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id       INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  payment_status  TEXT NOT NULL DEFAULT 'free',      -- free|paid|pending
  status          TEXT NOT NULL DEFAULT 'active',    -- active|completed
  enrolled_at     TEXT NOT NULL DEFAULT (datetime('now')),
  completed_at    TEXT,
  UNIQUE(user_id, course_id)
);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_user ON course_enrollments(user_id);

CREATE INDEX IF NOT EXISTS idx_course_enrollments_course ON course_enrollments(course_id);
