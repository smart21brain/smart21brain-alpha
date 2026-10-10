-- Phase 10: Teacher dashboard (real data)
-- Adds course reviews, teacher announcements, assignments and teacher settings.
-- Safe to run more than once (everything is IF NOT EXISTS).
-- Run once on an existing database:
--   wrangler d1 execute smart21brain-db --remote --file=./migrations/phase10-teacher-dashboard.sql

-- Student reviews of a course (one per student per course). The teacher can
-- reply once; the reply is shown under the review on the course page.
CREATE TABLE IF NOT EXISTS course_reviews (
  id             INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id      INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  user_id        INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  rating         INTEGER NOT NULL,                 -- 1..5
  comment        TEXT,
  teacher_reply  TEXT,
  replied_at     TEXT,
  created_at     TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(course_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_course_reviews_course ON course_reviews(course_id);

-- Announcements posted by a teacher. course_id NULL = every student enrolled
-- in any of that teacher's courses.
CREATE TABLE IF NOT EXISTS announcements (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  teacher_id  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id   INTEGER REFERENCES courses(id) ON DELETE CASCADE,
  title       TEXT,
  body        TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_announcements_teacher ON announcements(teacher_id);
CREATE INDEX IF NOT EXISTS idx_announcements_course ON announcements(course_id);

-- Assignments attached to a course (visible to enrolled students).
CREATE TABLE IF NOT EXISTS assignments (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  course_id     INTEGER NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  teacher_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  instructions  TEXT,
  due_date      TEXT,                               -- YYYY-MM-DD, optional
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_assignments_course ON assignments(course_id);

-- Per-teacher preferences (the toggles in the dashboard's Settings card).
CREATE TABLE IF NOT EXISTS teacher_settings (
  user_id                  INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  show_profile_to_parents  INTEGER NOT NULL DEFAULT 1,
  email_on_comments        INTEGER NOT NULL DEFAULT 1,
  weekly_summary_email     INTEGER NOT NULL DEFAULT 0,
  updated_at               TEXT NOT NULL DEFAULT (datetime('now'))
);
