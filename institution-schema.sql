-- Smart21Institution — D1 schema
--
-- Apply on top of schema.sql (it re-uses the `users` and `sessions` tables):
--   wrangler d1 execute smart21brain-db --file=./institution-schema.sql --remote
--
-- One database serves MANY institutions (schools, colleges, universities,
-- libraries, training centres…). Every table below carries an
-- institution_id and every query in src/handlers/institution/* is filtered
-- by it, so one institution can never see another institution's data.
-- Safe to run more than once (everything is CREATE ... IF NOT EXISTS).
--
-- Soft deletion: books, students, staff, resources and announcements carry a
-- deleted_at column. "Deleting" them in the app only stamps that column, so a
-- record can be recovered and loan/academic history is never orphaned.

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Institutions, members, roles & permissions, settings
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_institutions (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  name           TEXT NOT NULL,
  short_name     TEXT NOT NULL,
  slug           TEXT NOT NULL UNIQUE,          -- public address: institution-opac.html?i=<slug>
  inst_type      TEXT NOT NULL DEFAULT 'school',-- school | college | university | library | training_center | organization
  about          TEXT,
  logo_key       TEXT,                          -- R2 key (MATERIALS bucket)
  phone          TEXT,
  email          TEXT,
  address        TEXT,
  website        TEXT,
  currency       TEXT NOT NULL DEFAULT 'TZS',   -- used for library fines
  primary_color  TEXT NOT NULL DEFAULT '#0F766E',
  utc_offset_min INTEGER NOT NULL DEFAULT 180,  -- time zone, minutes from UTC (180 = East Africa)
  is_public      INTEGER NOT NULL DEFAULT 1,    -- 1 = public catalogue / announcements are visible without signing in
  owner_user_id  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

-- A signed-in smart21brain account can belong to several institutions; the role is per institution.
CREATE TABLE IF NOT EXISTS ins_members (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role           TEXT NOT NULL CHECK (role IN ('super_admin','admin','librarian','staff','teacher','student')),
  student_id     INTEGER,                       -- set for role = student (links the login to a student record)
  staff_id       INTEGER,                       -- set for teacher / librarian / staff logins linked to a staff record
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_ins_members_user ON ins_members(user_id);

-- Every institution can change what each role may do (Settings -> Roles & permissions).
CREATE TABLE IF NOT EXISTS ins_role_permissions (
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  role           TEXT NOT NULL,
  permission     TEXT NOT NULL,
  PRIMARY KEY (institution_id, role, permission)
);

CREATE TABLE IF NOT EXISTS ins_settings (
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  key            TEXT NOT NULL,
  value          TEXT,
  PRIMARY KEY (institution_id, key)
);

-- ---------------------------------------------------------------------
-- Organisation: departments, programmes, academic years, terms
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_departments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  code           TEXT,
  head_name      TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS ins_programmes (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  department_id  INTEGER REFERENCES ins_departments(id) ON DELETE SET NULL,
  name           TEXT NOT NULL,
  code           TEXT,
  level          TEXT,                          -- Certificate / Diploma / Degree / Form 1-4 …
  duration_years REAL,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS ins_academic_years (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,                 -- e.g. 2026/2027
  start_date     TEXT,
  end_date       TEXT,
  is_current     INTEGER NOT NULL DEFAULT 0,
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS ins_terms (            -- semesters / terms
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id   INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  academic_year_id INTEGER NOT NULL REFERENCES ins_academic_years(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,               -- Semester 1, Term 2 …
  start_date       TEXT,
  end_date         TEXT,
  is_current       INTEGER NOT NULL DEFAULT 0,
  UNIQUE (institution_id, academic_year_id, name)
);

-- ---------------------------------------------------------------------
-- People: staff and students
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_staff (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  staff_no       TEXT NOT NULL,
  full_name      TEXT NOT NULL,
  gender         TEXT,
  phone          TEXT,
  email          TEXT,
  position       TEXT,
  department_id  INTEGER REFERENCES ins_departments(id) ON DELETE SET NULL,
  hired_on       TEXT,
  status         TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','on_leave','left')),
  photo_key      TEXT,
  notes          TEXT,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, staff_no)
);
CREATE INDEX IF NOT EXISTS idx_ins_staff_name ON ins_staff(institution_id, full_name);

CREATE TABLE IF NOT EXISTS ins_students (
  id               INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id   INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  student_no       TEXT NOT NULL,               -- library / student ID
  reg_no           TEXT,                        -- registration number
  full_name        TEXT NOT NULL,
  gender           TEXT,
  dob              TEXT,
  phone            TEXT,
  email            TEXT,
  address          TEXT,
  programme_id     INTEGER REFERENCES ins_programmes(id) ON DELETE SET NULL,
  department_id    INTEGER REFERENCES ins_departments(id) ON DELETE SET NULL,
  class_name       TEXT,
  level            TEXT,                        -- year / level of study
  admission_date   TEXT,
  admission_info   TEXT,
  status           TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','graduated','withdrawn')),
  guardian_name    TEXT,
  guardian_phone   TEXT,
  guardian_relation TEXT,
  photo_key        TEXT,
  notes            TEXT,
  deleted_at       TEXT,
  created_at       TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at       TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, student_no)
);
CREATE INDEX IF NOT EXISTS idx_ins_students_name ON ins_students(institution_id, full_name);
CREATE INDEX IF NOT EXISTS idx_ins_students_prog ON ins_students(institution_id, programme_id);

-- ---------------------------------------------------------------------
-- Academics: courses, teaching assignments, enrolment, results
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_courses (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  programme_id   INTEGER REFERENCES ins_programmes(id) ON DELETE SET NULL,
  department_id  INTEGER REFERENCES ins_departments(id) ON DELETE SET NULL,
  code           TEXT NOT NULL,
  name           TEXT NOT NULL,                 -- course or subject name
  credits        REAL,
  level          TEXT,
  active         INTEGER NOT NULL DEFAULT 1,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, code)
);

CREATE TABLE IF NOT EXISTS ins_teaching (          -- teacher assignments
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES ins_courses(id) ON DELETE CASCADE,
  staff_id       INTEGER NOT NULL REFERENCES ins_staff(id) ON DELETE CASCADE,
  term_id        INTEGER REFERENCES ins_terms(id) ON DELETE CASCADE,
  UNIQUE (course_id, staff_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_ins_teaching_staff ON ins_teaching(institution_id, staff_id);

CREATE TABLE IF NOT EXISTS ins_enrollments (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES ins_students(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES ins_courses(id) ON DELETE CASCADE,
  term_id        INTEGER NOT NULL REFERENCES ins_terms(id) ON DELETE CASCADE,
  status         TEXT NOT NULL DEFAULT 'enrolled' CHECK (status IN ('enrolled','dropped','completed')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (student_id, course_id, term_id)
);
CREATE INDEX IF NOT EXISTS idx_ins_enr_course ON ins_enrollments(institution_id, course_id, term_id);

CREATE TABLE IF NOT EXISTS ins_results (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  enrollment_id  INTEGER NOT NULL UNIQUE REFERENCES ins_enrollments(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES ins_students(id) ON DELETE CASCADE,
  course_id      INTEGER NOT NULL REFERENCES ins_courses(id) ON DELETE CASCADE,
  term_id        INTEGER NOT NULL REFERENCES ins_terms(id) ON DELETE CASCADE,
  marks          REAL NOT NULL,                 -- out of 100
  grade          TEXT NOT NULL,
  points         REAL NOT NULL DEFAULT 0,
  remarks        TEXT,
  entered_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_results_student ON ins_results(institution_id, student_id);

-- ---------------------------------------------------------------------
-- Library: categories, books, physical copies, loans, reservations, fines
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_categories (        -- book categories
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  color          TEXT,
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS ins_books (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id     INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  isbn               TEXT,
  title              TEXT NOT NULL,
  author             TEXT NOT NULL,
  publisher          TEXT,
  pub_year           INTEGER,
  edition            TEXT,
  category_id        INTEGER REFERENCES ins_categories(id) ON DELETE SET NULL,
  subject            TEXT,
  language           TEXT,
  description        TEXT,
  shelf              TEXT,                       -- shelf / location
  classification_no  TEXT,                       -- Dewey / call number
  cover_key          TEXT,                       -- R2 key
  acquisition_date   TEXT,
  acquisition_source TEXT,
  price              REAL,
  notes              TEXT,
  archived           INTEGER NOT NULL DEFAULT 0,
  deleted_at         TEXT,
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at         TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_books_title  ON ins_books(institution_id, title);
CREATE INDEX IF NOT EXISTS idx_ins_books_author ON ins_books(institution_id, author);
CREATE INDEX IF NOT EXISTS idx_ins_books_isbn   ON ins_books(institution_id, isbn);
CREATE INDEX IF NOT EXISTS idx_ins_books_cat    ON ins_books(institution_id, category_id);

-- One row per physical copy; availability is always derived from these rows.
CREATE TABLE IF NOT EXISTS ins_book_copies (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  book_id        INTEGER NOT NULL REFERENCES ins_books(id) ON DELETE CASCADE,
  accession_no   TEXT NOT NULL,
  barcode        TEXT,
  status         TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available','borrowed','reserved','lost','damaged','archived')),
  note           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, accession_no)
);
CREATE INDEX IF NOT EXISTS idx_ins_copies_book    ON ins_book_copies(book_id, status);
CREATE INDEX IF NOT EXISTS idx_ins_copies_barcode ON ins_book_copies(institution_id, barcode);

CREATE TABLE IF NOT EXISTS ins_loans (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id    INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  copy_id           INTEGER NOT NULL REFERENCES ins_book_copies(id) ON DELETE CASCADE,
  book_id           INTEGER NOT NULL REFERENCES ins_books(id) ON DELETE CASCADE,
  borrower_type     TEXT NOT NULL CHECK (borrower_type IN ('student','staff')),
  borrower_id       INTEGER NOT NULL,
  issued_on         TEXT NOT NULL,                -- local calendar date, YYYY-MM-DD
  due_date          TEXT NOT NULL,
  returned_on       TEXT,
  renewals          INTEGER NOT NULL DEFAULT 0,
  status            TEXT NOT NULL DEFAULT 'borrowed' CHECK (status IN ('borrowed','returned','lost')),
  return_condition  TEXT CHECK (return_condition IN ('good','damaged','lost')),
  issued_by         INTEGER REFERENCES users(id) ON DELETE SET NULL,
  returned_by       INTEGER REFERENCES users(id) ON DELETE SET NULL,
  overdue_notified_on TEXT,
  notes             TEXT,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_loans_status   ON ins_loans(institution_id, status, due_date);
CREATE INDEX IF NOT EXISTS idx_ins_loans_borrower ON ins_loans(institution_id, borrower_type, borrower_id);
CREATE INDEX IF NOT EXISTS idx_ins_loans_book     ON ins_loans(book_id);
CREATE INDEX IF NOT EXISTS idx_ins_loans_copy     ON ins_loans(copy_id, status);

CREATE TABLE IF NOT EXISTS ins_reservations (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  book_id        INTEGER NOT NULL REFERENCES ins_books(id) ON DELETE CASCADE,
  borrower_type  TEXT NOT NULL CHECK (borrower_type IN ('student','staff')),
  borrower_id    INTEGER NOT NULL,
  status         TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','ready','fulfilled','cancelled','expired')),
  copy_id        INTEGER REFERENCES ins_book_copies(id) ON DELETE SET NULL,   -- the copy held once status = ready
  hold_until     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_resv_book     ON ins_reservations(institution_id, book_id, status);
CREATE INDEX IF NOT EXISTS idx_ins_resv_borrower ON ins_reservations(institution_id, borrower_type, borrower_id);

CREATE TABLE IF NOT EXISTS ins_fines (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  loan_id        INTEGER REFERENCES ins_loans(id) ON DELETE SET NULL,
  borrower_type  TEXT NOT NULL CHECK (borrower_type IN ('student','staff')),
  borrower_id    INTEGER NOT NULL,
  reason         TEXT NOT NULL CHECK (reason IN ('overdue','lost','damaged','other')),
  amount         REAL NOT NULL,
  status         TEXT NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid','paid','waived')),
  note           TEXT,
  settled_at     TEXT,
  settled_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_fines_borrower ON ins_fines(institution_id, borrower_type, borrower_id, status);

-- ---------------------------------------------------------------------
-- E-Library: digital resources (files live in R2, never at a public URL)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_resource_categories (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  name           TEXT NOT NULL,
  UNIQUE (institution_id, name)
);

CREATE TABLE IF NOT EXISTS ins_resources (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  author         TEXT,
  description    TEXT,
  category_id    INTEGER REFERENCES ins_resource_categories(id) ON DELETE SET NULL,
  subject        TEXT,
  res_type       TEXT NOT NULL DEFAULT 'document',  -- ebook | document | journal | notes | research | publication | other
  file_key       TEXT NOT NULL,                 -- R2 key, random, only reachable through an authorised endpoint
  file_name      TEXT NOT NULL,
  file_size      INTEGER NOT NULL DEFAULT 0,
  mime           TEXT NOT NULL,
  thumb_key      TEXT,
  access_level   TEXT NOT NULL DEFAULT 'members' CHECK (access_level IN ('public','members','staff')),
  allow_view     INTEGER NOT NULL DEFAULT 1,
  allow_download INTEGER NOT NULL DEFAULT 1,
  views          INTEGER NOT NULL DEFAULT 0,
  downloads      INTEGER NOT NULL DEFAULT 0,
  uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_res_inst ON ins_resources(institution_id, title);

-- ---------------------------------------------------------------------
-- Communication: announcements & notifications
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_announcements (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  body           TEXT NOT NULL,
  audience       TEXT NOT NULL DEFAULT 'members' CHECK (audience IN ('public','members','staff','students','teachers')),
  pinned         INTEGER NOT NULL DEFAULT 0,
  expires_on     TEXT,
  author_id      INTEGER REFERENCES users(id) ON DELETE SET NULL,
  deleted_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_ann_inst ON ins_announcements(institution_id, created_at);

CREATE TABLE IF NOT EXISTS ins_notifications (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL DEFAULT 'system',  -- system | overdue | announcement | academic | admin | security
  title          TEXT NOT NULL,
  message        TEXT,
  link           TEXT,                          -- in-app route, e.g. #loans
  read_at        TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_notif_user ON ins_notifications(institution_id, user_id, read_at, id DESC);

-- ---------------------------------------------------------------------
-- Operations: audit log, imports, backups, login throttling
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_audit_logs (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  module         TEXT,
  action         TEXT NOT NULL,
  entity         TEXT,
  entity_id      INTEGER,
  details        TEXT,
  status         TEXT NOT NULL DEFAULT 'success',   -- success | failed
  ip             TEXT,
  user_agent     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_audit_inst ON ins_audit_logs(institution_id, id DESC);

CREATE TABLE IF NOT EXISTS ins_imports (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  kind           TEXT NOT NULL,                 -- books | students | staff
  filename       TEXT,
  total_rows     INTEGER NOT NULL DEFAULT 0,
  imported_rows  INTEGER NOT NULL DEFAULT 0,
  skipped_rows   INTEGER NOT NULL DEFAULT 0,
  user_id        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ins_backups (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  file_key       TEXT NOT NULL,                 -- R2 key of the JSON export
  size_bytes     INTEGER NOT NULL DEFAULT 0,
  row_counts     TEXT,                          -- JSON: rows per table at backup time
  checksum       TEXT NOT NULL,                 -- SHA-256 of the file, re-checked by "Verify"
  verified_at    TEXT,
  verified_ok    INTEGER,
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS ins_login_attempts (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT NOT NULL,
  ip         TEXT,
  success    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ins_attempts_email ON ins_login_attempts(email, created_at);
CREATE INDEX IF NOT EXISTS idx_ins_attempts_ip    ON ins_login_attempts(ip, created_at);

-- ---------------------------------------------------------------------
-- Reading progress (students and staff can continue a book where they stopped)
-- Safe to re-run.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_reading_progress (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  resource_id    INTEGER NOT NULL REFERENCES ins_resources(id) ON DELETE CASCADE,
  last_page      INTEGER NOT NULL DEFAULT 1 CHECK (last_page BETWEEN 1 AND 100000),
  total_pages    INTEGER CHECK (total_pages IS NULL OR total_pages BETWEEN 1 AND 100000),
  status         TEXT NOT NULL DEFAULT 'reading' CHECK (status IN ('reading','finished')),
  opened_count   INTEGER NOT NULL DEFAULT 0,
  last_opened_at TEXT NOT NULL DEFAULT (datetime('now')),
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (user_id, resource_id)
);
CREATE INDEX IF NOT EXISTS idx_ins_reading_user ON ins_reading_progress(institution_id, user_id, last_opened_at DESC);

-- ---------------------------------------------------------------------
-- Notification channels (email / SMS / web push) — every statement is safe to re-run.
-- ins_notifications stays the in-app inbox; ins_outbox is the delivery queue behind it.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_notification_prefs (      -- one row per person who changed their choices
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  email_on       INTEGER NOT NULL DEFAULT 1 CHECK (email_on IN (0,1)),
  sms_on         INTEGER NOT NULL DEFAULT 1 CHECK (sms_on IN (0,1)),
  push_on        INTEGER NOT NULL DEFAULT 1 CHECK (push_on IN (0,1)),
  phone          TEXT,                                    -- number for SMS if the person has no student/staff record phone
  updated_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, user_id)
);

CREATE TABLE IF NOT EXISTS ins_push_subscriptions (      -- one row per browser/phone that allowed push
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  endpoint       TEXT NOT NULL UNIQUE,
  user_agent     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  last_ok_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_ins_push_user ON ins_push_subscriptions(institution_id, user_id);

CREATE TABLE IF NOT EXISTS ins_outbox (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id  INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  notification_id INTEGER REFERENCES ins_notifications(id) ON DELETE CASCADE,
  user_id         INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  channel         TEXT NOT NULL CHECK (channel IN ('email','sms','push')),
  status          TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','skipped')),
  attempts        INTEGER NOT NULL DEFAULT 0,
  detail          TEXT,                                   -- why it was skipped / the last error (never a secret)
  created_at      TEXT NOT NULL DEFAULT (datetime('now')),
  sent_at         TEXT
);
CREATE INDEX IF NOT EXISTS idx_ins_outbox_pending ON ins_outbox(status, id);
CREATE INDEX IF NOT EXISTS idx_ins_outbox_inst ON ins_outbox(institution_id, id DESC);

-- ---------------------------------------------------------------------
-- Student document attachments (files live in the private R2 bucket under random keys)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_student_documents (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  student_id     INTEGER NOT NULL REFERENCES ins_students(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  doc_type       TEXT NOT NULL DEFAULT 'other' CHECK (doc_type IN ('birth_certificate','id_document','transcript','certificate','medical','recommendation','application','other')),
  file_key       TEXT NOT NULL,
  file_name      TEXT NOT NULL,
  mime           TEXT NOT NULL,
  file_size      INTEGER NOT NULL DEFAULT 0,
  uploaded_by    INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  deleted_at     TEXT
);
CREATE INDEX IF NOT EXISTS idx_ins_stdoc_student ON ins_student_documents(institution_id, student_id, deleted_at);

-- ---------------------------------------------------------------------
-- Offline work: changes typed while offline are replayed later. The server remembers each
-- client operation id so a replay that already succeeded is never applied twice.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ins_client_ops (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  institution_id INTEGER NOT NULL REFERENCES ins_institutions(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  op_id          TEXT NOT NULL,
  status         INTEGER NOT NULL,
  body           TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (institution_id, user_id, op_id)
);
