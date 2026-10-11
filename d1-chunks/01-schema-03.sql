CREATE INDEX IF NOT EXISTS idx_stn_expenses_business ON stn_expenses(business_id, created_at);

-- ---------------------------------------------------------------------
-- Photo Studio: country-specific print presets
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_photo_presets (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id   INTEGER REFERENCES stn_businesses(id) ON DELETE CASCADE, -- NULL = global default preset
  country       TEXT NOT NULL,
  name          TEXT NOT NULL,
  width_mm      REAL NOT NULL,
  height_mm     REAL NOT NULL,
  dpi           INTEGER NOT NULL DEFAULT 300,
  face_min_pct  REAL NOT NULL DEFAULT 50,             -- min face-height as % of photo height
  face_max_pct  REAL NOT NULL DEFAULT 69,
  bg_color      TEXT NOT NULL DEFAULT '#FFFFFF',
  notes         TEXT,
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_photo_presets_business ON stn_photo_presets(business_id);

-- ---------------------------------------------------------------------
-- Online Services: guided checklist tracker (no direct gov integration)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_online_services (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id  INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  customer_id  INTEGER REFERENCES stn_customers(id) ON DELETE SET NULL,
  service_type TEXT NOT NULL,                         -- TRA|BRELA|NIDA|Passport|Visa|TIN
  checklist    TEXT NOT NULL DEFAULT '[]',             -- JSON [{label, done}]
  status       TEXT NOT NULL DEFAULT 'In Progress',    -- In Progress|Awaiting Customer|Submitted|Done
  fee          REAL NOT NULL DEFAULT 0,
  notes        TEXT,
  created_by   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at   TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_online_services_business ON stn_online_services(business_id);

-- ---------------------------------------------------------------------
-- Machine Center: reference content (Owner/Manager editable)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_machines (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER REFERENCES stn_businesses(id) ON DELETE CASCADE, -- NULL = global library
  name        TEXT NOT NULL,
  category    TEXT NOT NULL,                           -- Printer|Photocopier|Camera|Laminator|Binding|Cutter
  content     TEXT NOT NULL DEFAULT '{}',               -- JSON {parts,setup,operation,maintenance,troubleshooting,error_codes,safety}
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Academy LMS
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_courses (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  category    TEXT NOT NULL,                           -- Word|Excel|Photoshop|Canva|Printing
  description TEXT,
  modules     TEXT NOT NULL DEFAULT '[]',               -- JSON [{title,video_url,notes,quiz:[{q,options,correct}]}]
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS stn_course_progress (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id          INTEGER NOT NULL REFERENCES stn_courses(id) ON DELETE CASCADE,
  user_id            INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  completed_modules  TEXT NOT NULL DEFAULT '[]',        -- JSON array of module indices
  quiz_scores        TEXT NOT NULL DEFAULT '{}',        -- JSON {moduleIndex: score}
  certificate_issued INTEGER NOT NULL DEFAULT 0,
  updated_at         TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, user_id)
);

-- ---------------------------------------------------------------------
-- Notifications, audit log
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS stn_notifications (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  title       TEXT NOT NULL,
  message     TEXT NOT NULL,
  level       TEXT NOT NULL DEFAULT 'info',             -- info|warning|danger
  is_read     INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_notifications_business ON stn_notifications(business_id, is_read);

CREATE TABLE IF NOT EXISTS stn_audit_log (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  business_id INTEGER NOT NULL REFERENCES stn_businesses(id) ON DELETE CASCADE,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  details     TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_stn_audit_business ON stn_audit_log(business_id, created_at);

-- ---------------------------------------------------------------------
-- Seed: global photo presets (TZ, US, UK/Schengen) — business_id NULL
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO stn_photo_presets (id, business_id, country, name, width_mm, height_mm, dpi, face_min_pct, face_max_pct, bg_color, notes) VALUES
  (1, NULL, 'TZ', 'Tanzania Passport/ID 4x5', 40, 50, 300, 70, 80, '#FFFFFF', 'Standard 4x5 cm Tanzanian passport & NIDA photo'),
  (2, NULL, 'US', 'US Visa/Passport 2x2in', 50.8, 50.8, 300, 50, 69, '#FFFFFF', '2x2 inch (51x51mm), head 1in–1 3/8in from chin to crown'),
  (3, NULL, 'UK/SCHENGEN', 'UK/Schengen Visa 35x45', 35, 45, 300, 70, 80, '#FFFFFF', 'Head height 32-36mm from chin to crown'),
  (4, NULL, 'KE', 'Kenya Passport 51x51', 51, 51, 300, 70, 80, '#FFFFFF', 'Kenyan passport photo standard'),
  (5, NULL, 'UG', 'Uganda Passport 51x51', 51, 51, 300, 70, 80, '#FFFFFF', 'Ugandan passport photo standard');

-- ---------------------------------------------------------------------
-- Seed: global machine library
-- ---------------------------------------------------------------------
INSERT OR IGNORE INTO stn_machines (id, business_id, name, category, content) VALUES
(1, NULL, 'Laser Printer / Photocopier', 'Printer', '{"parts":["Paper tray","Toner cartridge","Drum unit","Fuser unit","Control panel","Scanner glass/ADF"],"setup":["Unbox and remove shipping locks","Install toner & drum unit","Load paper tray (A4/A3)","Connect power and USB/network cable","Install drivers and run test page"],"operation":["Load originals on glass or ADF for copying","Select paper size/tray and copy count","Use control panel to print, copy, scan or fax","Collect output from the output tray"],"maintenance":["Clean scanner glass weekly with a soft cloth","Replace toner when print is faded","Clean paper rollers monthly to avoid jams","Run built-in cleaning cycle for print heads (inkjet)"],"troubleshooting":["Paper jam: open all covers, remove paper in the direction of the paper path","Faded print: shake/replace toner cartridge","Lines on copies: clean scanner glass and mirrors","Not printing: check USB/network cable and driver install"],"error_codes":{"E1":"Paper jam","E2":"Toner low/empty","E3":"Drum unit fault","E5":"Fuser unit overheating"},"safety":["Turn off and unplug before opening the fuser area (hot)","Do not touch the drum surface with bare hands","Keep toner away from children and open flames","Use only manufacturer-approved consumables"]}'),
(2, NULL, 'Digital Camera / Studio Lighting', 'Camera', '{"parts":["Camera body","Lens","Tripod","Softbox lighting","Backdrop (blue/white/grey)"],"setup":["Mount camera on tripod at subject eye level","Position backdrop 1-1.5m behind subject","Set up two softboxes at 45° on each side","Set white balance using a grey card"],"operation":["Frame subject with head and shoulders visible","Ensure even lighting with no harsh shadows","Take photo in RAW/JPEG at highest resolution","Transfer to computer via card reader/USB"],"maintenance":["Clean lens with a microfiber cloth and blower","Store camera in a dry bag with silica gel","Check and charge batteries after each use"],"troubleshooting":["Blurry photos: check focus mode and hand shake","Shadows on backdrop: move subject further from backdrop","Colour cast: re-set white balance"],"error_codes":{},"safety":["Do not point flash directly into eyes at close range","Handle lighting stands carefully to avoid tipping"]}'),
(3, NULL, 'Laminator', 'Laminator', '{"parts":["Heating rollers","Feed tray","Thickness/temperature dial","Power switch","Pouch"],"setup":["Place on a flat, stable surface","Set temperature dial to match pouch thickness","Allow 3-5 minutes to warm up (ready light on)"],"operation":["Insert document centred inside laminating pouch","Feed sealed-edge first, straight into the machine","Guide gently as rollers pull the pouch through","Let cool flat before trimming edges"],"maintenance":["Run a cleaning sheet through monthly","Wipe rollers with a lint-free cloth when machine is off and cool","Keep away from dust and moisture"],"troubleshooting":["Cloudy lamination: temperature too low, increase and retry","Pouch jams: temperature too high or fed crooked","Bubbles: document was not centred or pouch was damp"],"error_codes":{},"safety":["Rollers are hot — never insert fingers","Unplug when not in use for extended periods"]}'),
(4, NULL, 'Comb/Spiral Binding Machine', 'Binding', '{"parts":["Punching lever","Die pins","Binding cradle","Comb/coil size guide"],"setup":["Confirm paper size and align punch guide","Set punch depth for the paper stack thickness"],"operation":["Punch pages in stacks of 15-20 sheets","Open plastic comb or feed coil onto the cradle pins","Slide punched pages onto open comb/coil","Close comb or spin coil closed, then trim ends"],"maintenance":["Empty paper-chad tray regularly","Lubricate the punch mechanism per manufacturer guide"],"troubleshooting":["Uneven holes: check paper is square against the guide","Punch jams: reduce sheet count per punch"],"error_codes":{},"safety":["Keep fingers clear of the punch head","Do not exceed the rated sheet count per punch"]}'),
(5, NULL, 'Guillotine / Paper Cutter', 'Cutter', '{"parts":["Cutting blade","Paper clamp","Measuring guide","Safety guard"],"setup":["Check blade is sharp and guard is functional","Align the measuring guide to the desired size"],"operation":["Square the paper stack against the back guide","Lower the clamp to hold paper firmly","Pull the blade down in one smooth motion","Raise blade and clamp fully before removing paper"],"maintenance":["Sharpen or replace blade when cuts become ragged","Keep the cutting surface clean and dry"],"troubleshooting":["Uneven cuts: paper not squared or blade dull","Blade sticks: check for paper debris in the track"],"error_codes":{},"safety":["Never place hands under the blade","Always engage the safety guard/lock after use","Keep away from children"]}');
