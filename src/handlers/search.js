import { json, badRequest } from '../lib/auth.js';

export async function search({ url, env }) {
  const query = (url.searchParams.get('q') || '').trim();
  if (query.length < 2) return badRequest('Search query must contain at least 2 characters.');
  const pattern = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
  const [games, quizzes, posts, materials] = await Promise.all([
    env.DB.prepare("SELECT id, title, subject AS detail, 'Game' AS type FROM games WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT id, title, subject AS detail, 'Quiz' AS type FROM quizzes WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT slug AS id, title, excerpt AS detail, 'Blog' AS type FROM blog_posts WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT id, title, subject AS detail, 'Material' AS type FROM materials WHERE title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\' LIMIT 8").bind(pattern, pattern).all(),
  ]);
  const results = [
    ...games.results.map((item) => ({ ...item, href: `game.html?id=${item.id}` })),
    ...quizzes.results.map((item) => ({ ...item, href: `quiz.html?id=${item.id}` })),
    ...posts.results.map((item) => ({ ...item, href: `blog-post.html?slug=${encodeURIComponent(item.id)}` })),
    ...materials.results.map((item) => ({ ...item, href: `library.html?id=${item.id}` })),
  ];
  return json({ results });
}