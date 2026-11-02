// SEO check — per-page tags from the Worker, the live sitemap, and the static pages/sitemap built by scripts/build-seo.mjs.
// Run:  node --no-warnings tests/seo.test.mjs
import { DatabaseSync } from 'node:sqlite';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import worker from '../src/index.js';

const root = new URL('../', import.meta.url);
const raw = new DatabaseSync(':memory:');
raw.exec(readFileSync(new URL('schema.sql', root), 'utf8'));
class Stmt {
  constructor(sql) { this.st = raw.prepare(sql); this.a = []; }
  bind(...a) { this.a = a.map((x) => (x === undefined ? null : x)); return this; }
  async first() { return this.st.get(...this.a) || null; }
  async all() { return { results: this.st.all(...this.a) }; }
  async run() { const r = this.st.run(...this.a); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; }
}
const DB = { prepare: (sql) => new Stmt(sql) };

raw.exec(`INSERT INTO blog_posts (title, slug, excerpt, content, published) VALUES ('Study tips for exams','study-tips','Short, practical tips.','<p>Body</p>',1);
          INSERT INTO blog_posts (title, slug, content, published) VALUES ('Draft post','draft-post','x',0);
          INSERT INTO videos (title, description, source_type, external_url, duration_seconds, published) VALUES ('How volcanoes work','Magma, lava and eruptions.','url','https://www.youtube.com/embed/abc',185,1);
          INSERT INTO books (title, slug, subject, description, pages, published) VALUES ('Tales of the Baobab','baobab-tales','Stories','Folk tales.','[]',1);
          INSERT INTO courses (title, slug, description, published) VALUES ('Live DB Course','live-db-course','Added from the dashboard.',1);
          INSERT INTO courses (title, slug, description, published) VALUES ('Hidden Course','hidden-course','Unpublished.',0);`);

const pageFile = (name) => readFileSync(new URL(name, root), 'utf8');
const ASSETS = {
  fetch: async (req) => {
    const p = new URL(req.url).pathname;
    if (p.endsWith('.html')) return new Response(null, { status: 307, headers: { Location: p.replace(/\.html$/, '') } });
    const f = { '/course': 'course.html', '/lesson': 'lesson.html', '/blog-post': 'blog-post.html', '/video': 'video.html', '/book': 'book.html' }[p];
    if (f) return new Response(pageFile(f), { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8', ETag: '"x"', 'Content-Length': '1' } });
    return new Response('ASSET ' + p);
  },
};
const env = { DB, ASSETS };
let pass = 0, failn = 0;
const ok = (c, m) => { if (c) pass++; else { failn++; console.log('FAIL:', m); } };
const get = (path, method = 'GET') => worker.fetch(new Request('https://smart21brain.com' + path, { method }), env, { waitUntil() {} });
const count = (s, re) => (s.match(re) || []).length;
const ldTypes = (html) => [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1].replace(/\\u003c/g, '<'))['@type']);

// ---- course (built-in catalog)
let r = await get('/course?slug=fractions-made-fun'); let h = await r.text();
ok(r.status === 200, 'course 200');
ok(/<title>Fractions Made Fun – Free Online Course \| Smart21Brain<\/title>/.test(h), 'course title');
ok(count(h, /rel="canonical"/g) === 1 && h.includes('href="https://smart21brain.com/course?slug=fractions-made-fun"'), 'course single canonical');
ok(count(h, /name="robots"/g) === 1 && /index, follow/.test(h), 'course robots index');
ok(ldTypes(h).includes('Course') && ldTypes(h).includes('BreadcrumbList'), 'course JSON-LD');
ok(count(h, /name="description"/g) === 1 && /From halves to adding fractions/.test(h), 'course description from catalog');
ok(count(h, /property="og:title"/g) === 1, 'course og:title once');
ok(!r.headers.get('etag') && !r.headers.get('content-length'), 'stale length/etag dropped');
// ---- course from the database, unpublished, unknown
h = await (await get('/course?slug=live-db-course')).text();
ok(/<title>Live DB Course – Free Online Course/.test(h) && /index, follow/.test(h), 'db course indexed');
h = await (await get('/course?slug=hidden-course')).text();
ok(/noindex/.test(h) && !/<title>Hidden Course/.test(h), 'unpublished course noindex');
h = await (await get('/course?slug=does-not-exist')).text();
ok(/noindex/.test(h) && count(h, /rel="canonical"/g) === 1, 'unknown course noindex, one canonical');
h = await (await get('/course')).text();
ok(/Fractions Made Fun — Course/.test(h) === true || /<title>/.test(h), 'bare /course left alone');
ok(/index, follow/.test(h) && /href="https:\/\/smart21brain.com\/course"/.test(h), 'bare /course keeps generic static tags');
// ---- lessons
h = await (await get('/lesson?id=computer-networks%3A%3A16')).text();
ok(/<title>Subnetting step by step – Computer Networks: From Cables to the Cloud \| Smart21Brain<\/title>|<title>Subnetting step by step \| Smart21Brain<\/title>/.test(h), 'lesson title: ' + (h.match(/<title>.*?<\/title>/) || [])[0]);
ok(ldTypes(h).includes('LearningResource') && h.includes('lesson?id=computer-networks%3A%3A16'), 'lesson JSON-LD + canonical');
h = await (await get('/lesson?id=nope%3A%3A1')).text();
ok(/noindex/.test(h), 'unknown lesson noindex');
// ---- blog / video / book
h = await (await get('/blog-post?slug=study-tips')).text();
ok(/<title>Study tips for exams \| Smart21Brain Blog<\/title>/.test(h) && ldTypes(h).includes('BlogPosting'), 'blog post');
h = await (await get('/blog-post?slug=draft-post')).text();
ok(/noindex/.test(h), 'draft post noindex');
h = await (await get('/video?id=1')).text();
ok(/How volcanoes work – Video/.test(h), 'video title');
const vld = [...h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1])).find((o) => o['@type'] === 'VideoObject');
ok(vld && vld.duration === 'PT3M5S' && vld.embedUrl === 'https://www.youtube.com/embed/abc' && vld.thumbnailUrl.length === 1, 'video JSON-LD: ' + JSON.stringify(vld && vld.duration));
h = await (await get('/book?slug=baobab-tales')).text();
ok(/Tales of the Baobab – Read Online Free/.test(h) && ldTypes(h).includes('Book'), 'book');
// ---- redirect and passthrough and HEAD
r = await get('/course.html?slug=fractions-made-fun');
ok(r.status === 307, 'asset redirect passes through untouched');
r = await get('/about'); ok((await r.text()) === 'ASSET /about', 'other pages pass through');
r = await get('/course?slug=fractions-made-fun', 'HEAD'); ok(r.status === 200 && (await r.text()) === '', 'HEAD works');
// ---- live sitemap
r = await get('/sitemap-live.xml'); h = await r.text();
ok(/xml/.test(r.headers.get('content-type')), 'live sitemap xml');
ok(h.includes('/course?slug=live-db-course') && !h.includes('hidden-course') && !h.includes('fractions-made-fun'), 'live sitemap: db course only, no hidden, no built-in');
ok(h.includes('/blog-post?slug=study-tips') && !h.includes('draft-post') && h.includes('/video?id=1') && h.includes('/book?slug=baobab-tales'), 'live sitemap: posts, videos, books');

// ---- static site: pages, sitemap, robots
const htmlFiles = readdirSync(root).filter((f) => f.endsWith('.html'));
const noindexed = new Set();
for (const f of htmlFiles) {
  const s = pageFile(f);
  if (!s.includes('s21-seo:start')) continue;
  const base = f.replace(/\.html$/, '');
  ok(count(s, /rel="canonical"/g) === 1, f + ': exactly one canonical');
  ok(count(s, /name="robots"/g) === 1, f + ': exactly one robots tag');
  const head = s.slice(0, s.search(/<\/head>/i));
  if (!/name="robots" content="noindex/.test(s)) ok(count(head, /<title>/g) === 1, f + ': one title in <head>');
  const canon = (s.match(/rel="canonical" href="([^"]+)"/) || [])[1];
  ok(canon === (base === 'index' ? 'https://smart21brain.com/' : `https://smart21brain.com/${base}`), f + ': canonical is the clean address (' + canon + ')');
  if (/name="robots" content="noindex/.test(s)) noindexed.add(f);
  else { ok(/property="og:title"/.test(s) && /name="twitter:card"/.test(s), f + ': has Open Graph + Twitter'); ok(/name="description"/.test(s), f + ': has description'); }
}
const sm = readFileSync(new URL('sitemap.xml', root), 'utf8');
const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));
ok(locs.length > 300 && new Set(locs).size === locs.length, 'sitemap has no duplicates (' + locs.length + ')');
ok(locs[0] === 'https://smart21brain.com/', 'home is first in sitemap');
for (const u of locs) {
  const p = new URL(u).pathname;
  const f = (p === '/' ? 'index' : p.slice(1)) + '.html';
  ok(existsSync(new URL(f, root)), 'sitemap URL has a page: ' + u);
  ok(!noindexed.has(f), 'sitemap URL is not noindex: ' + u);
  ok(!u.includes('.html'), 'sitemap URL is clean: ' + u);
}
const robots = readFileSync(new URL('robots.txt', root), 'utf8');
ok(/Sitemap: https:\/\/smart21brain.com\/sitemap.xml/.test(robots) && /Sitemap: https:\/\/smart21brain.com\/sitemap-live.xml/.test(robots) && /Disallow: \/api\//.test(robots), 'robots.txt');
ok(!/Disallow: \/(css|js|images)/.test(robots), 'robots does not block css/js/images');
// ---- homepage must not bounce crawlers to splash/onboarding
ok(/s21-bot-skip/.test(pageFile('index.html')), 'homepage skips the splash gate for crawlers');

console.log(`${pass} passed, ${failn} failed`);
process.exit(failn ? 1 : 0);
