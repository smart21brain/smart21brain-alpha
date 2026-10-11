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
