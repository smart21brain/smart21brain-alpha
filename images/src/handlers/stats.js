import { json } from '../lib/auth.js';

// Public, unauthenticated homepage statistics. Every number here is either
// queried live from the database or counted from the actual content
// published on the site — never an invented marketing figure.
//
// - active_learners: real count of registered accounts (excludes the
//   internal admin seed account).
// - quizzes_completed: real count of quiz attempts ever submitted.
// - video_lessons / digital_books: the actual number of lesson/book
//   entries currently published in the VideoHub and Library pages.
//   There's no separate videos/books table in the schema — these pages
//   are a fixed curated set — so the true count is hardcoded here to
//   match what's really on the site, rather than a rounder, bigger,
//   made-up number.
const VIDEO_LESSONS_PUBLISHED = 8;
const DIGITAL_BOOKS_PUBLISHED = 8;

export async function getPublicStats({ env }) {
  const [{ learners }, { attempts }] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS learners FROM users WHERE role != 'admin'").first(),
    env.DB.prepare('SELECT COUNT(*) AS attempts FROM quiz_attempts').first(),
  ]);

  return json({
    active_learners: learners || 0,
    video_lessons: VIDEO_LESSONS_PUBLISHED,
    digital_books: DIGITAL_BOOKS_PUBLISHED,
    quizzes_completed: attempts || 0,
  });
}
