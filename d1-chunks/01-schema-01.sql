-- Smart21Brain — D1 schema
-- Apply with: wrangler d1 execute smart21brain-db --file=./schema.sql (add --remote for production)

PRAGMA foreign_keys = ON;

-- ---------------------------------------------------------------------
-- Accounts & sessions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  name          TEXT NOT NULL,
  email         TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  role          TEXT NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  avatar_key    TEXT,                            -- R2 object key
  created_at    TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS sessions (
  token      TEXT PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id);

CREATE TABLE IF NOT EXISTS login_events (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  ip_address TEXT,
  user_agent TEXT,
  logged_in_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_login_events_user ON login_events(user_id);

CREATE TABLE IF NOT EXISTS oauth_accounts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider      TEXT NOT NULL,
  provider_sub  TEXT NOT NULL,
  created_at    TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(provider, provider_sub)
);

CREATE INDEX IF NOT EXISTS idx_oauth_accounts_user ON oauth_accounts(user_id);

-- ---------------------------------------------------------------------
-- Site settings (admin console toggles) — simple key/value store so new
-- switches can be added without another migration.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS site_settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,                          -- stored as 'true' / 'false'
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO site_settings (key, value) VALUES
('require_content_review', 'true'),
('allow_public_comments', 'false'),
('maintenance_mode', 'false');

-- ---------------------------------------------------------------------
-- Newsletter subscriptions
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS newsletter_subscribers (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  email         TEXT NOT NULL UNIQUE,
  subscribed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_newsletter_subscribers_email ON newsletter_subscribers(email);

-- ---------------------------------------------------------------------
-- Contact messages
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS contact_messages (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  email      TEXT NOT NULL,
  phone      TEXT,
  subject    TEXT NOT NULL,
  message    TEXT NOT NULL,
  status     TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_contact_messages_status ON contact_messages(status);

-- ---------------------------------------------------------------------
-- Games (admin-managed catalog + per-user scores)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS games (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  subject     TEXT,
  description TEXT,
  emoji       TEXT DEFAULT '🎮',
  published   INTEGER NOT NULL DEFAULT 1,        -- 0/1
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS game_scores (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id    INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score      INTEGER NOT NULL DEFAULT 0,
  played_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_scores_user ON game_scores(user_id);

CREATE INDEX IF NOT EXISTS idx_game_scores_game ON game_scores(game_id);

CREATE TABLE IF NOT EXISTS game_activity (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_key   TEXT NOT NULL,
  score      INTEGER NOT NULL DEFAULT 0,
  details    TEXT,
  played_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_game_activity_user ON game_activity(user_id);

CREATE INDEX IF NOT EXISTS idx_game_activity_game ON game_activity(game_key);

-- ---------------------------------------------------------------------
-- Quizzes (admin-managed, with questions stored as JSON) + attempts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS quizzes (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subject     TEXT,
  description TEXT,
  questions   TEXT NOT NULL,                     -- JSON array: [{prompt, options[], correct_index, explanation}]
  published   INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id      INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  quiz_id      INTEGER NOT NULL REFERENCES quizzes(id) ON DELETE CASCADE,
  score        INTEGER NOT NULL DEFAULT 0,
  total        INTEGER NOT NULL DEFAULT 0,
  completed_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_user ON quiz_attempts(user_id);

CREATE INDEX IF NOT EXISTS idx_quiz_attempts_quiz ON quiz_attempts(quiz_id);

-- ---------------------------------------------------------------------
-- Blog posts
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS blog_posts (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  excerpt     TEXT,
  content     TEXT NOT NULL,
  cover_key   TEXT,                              -- R2 object key for cover image
  published   INTEGER NOT NULL DEFAULT 1,
  author_id   INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Learning materials (files live in R2; this row is the catalog entry)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS materials (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  subject     TEXT,
  file_key    TEXT NOT NULL,                     -- R2 object key
  file_type   TEXT,                               -- pdf | image | other
  file_size   INTEGER,
  uploaded_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ---------------------------------------------------------------------
-- Videos (admin-posted). Either an uploaded file (stored in the same
-- MATERIALS R2 bucket, under a videos/ prefix) or a link to an
-- externally-hosted video (YouTube, Vimeo, a CDN, etc).
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS videos (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  title             TEXT NOT NULL,
  subject           TEXT,
  description       TEXT,
  source_type       TEXT NOT NULL DEFAULT 'file',  -- 'file' (R2) | 'url' (external link/embed)
  file_key          TEXT,                           -- R2 object key, when source_type = 'file'
  external_url      TEXT,                           -- link, when source_type = 'url'
  thumbnail_url      TEXT,
  duration_seconds  INTEGER,
  -- Where this video is shown on the site, e.g. ",videohub,kids,".
  -- Stored comma-padded so "LIKE '%,kids,%'" matches whole tags only.
  -- One of: videohub | cartoons | courses | kids (any combination).
  placements        TEXT NOT NULL DEFAULT ',videohub,',
  published         INTEGER NOT NULL DEFAULT 1,      -- 0/1 — only published videos are public
  created_by        INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at        TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_videos_published ON videos(published);

-- Per-user "where did I stop watching" position, so the player can resume
-- and Videos/Dashboard can show a real "Continue Watching" row.
CREATE TABLE IF NOT EXISTS video_progress (
  id                INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id           INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  video_id          INTEGER NOT NULL REFERENCES videos(id) ON DELETE CASCADE,
  position_seconds  INTEGER NOT NULL DEFAULT 0,
  completed         INTEGER NOT NULL DEFAULT 0,           -- 0/1 — watched to (near) the end
  updated_at        TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, video_id)
);

CREATE INDEX IF NOT EXISTS idx_video_progress_user ON video_progress(user_id);

-- ---------------------------------------------------------------------
-- Digital library — admin-managed books (paginated reader content) +
-- per-user reading position, mirroring the quizzes/quiz_attempts shape.
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  title       TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  subject     TEXT,
  description TEXT,
  cover_url   TEXT,
  pages       TEXT NOT NULL,                     -- JSON array: [{heading, text}]
  published   INTEGER NOT NULL DEFAULT 1,
  created_by  INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now')),
  pdf_key     TEXT,                              -- R2 key of an uploaded PDF book
  cover_key   TEXT,                              -- R2 key of an uploaded cover image
  pdf_pages   INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS book_progress (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  book_id     INTEGER NOT NULL REFERENCES books(id) ON DELETE CASCADE,
  page        INTEGER NOT NULL DEFAULT 0,
  updated_at  TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE(user_id, book_id)
);

CREATE INDEX IF NOT EXISTS idx_book_progress_user ON book_progress(user_id);
