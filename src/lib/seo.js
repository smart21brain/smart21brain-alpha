// Smart21Brain — per-page SEO for pages that show different content per ?slug= / ?id=.
//
// course.html, lesson.html, blog-post.html, video.html and book.html are one HTML file that the browser
// fills in with JavaScript. Google may not wait for that, and would otherwise see the same title and
// description for every course, lesson, post and video. So the Worker rewrites the <head> of those
// pages on the way out: unique <title>, description, canonical URL, Open Graph / Twitter tags and
// JSON-LD structured data for the exact item being requested. The page body is untouched.
//
// Also serves /sitemap-live.xml: courses, blog posts, videos and books that live in the database
// (the built-in catalog is already listed in the static sitemap.xml built by scripts/build-seo.mjs).
import { COURSES, LESSONS } from './seo-catalog.js';

const ORIGIN = 'https://smart21brain.com';
const OG_IMAGE = `${ORIGIN}/images/og-image.png`;
const LOGO = `${ORIGIN}/images/logo/smart21brain-logo-512.png`;
const PUBLISHER = { '@type': 'Organization', name: 'Smart21Brain', url: `${ORIGIN}/`, logo: { '@type': 'ImageObject', url: LOGO } };
const ROBOTS_INDEX = 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';

const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const plain = (s) => String(s || '').replace(/<[^>]*>/g, ' ').replace(/[#*_`>[\]]+/g, ' ').replace(/\s+/g, ' ').trim();
const clip = (s, n) => {
  s = plain(s);
  if (s.length <= n) return s;
  const cut = s.slice(0, n - 1);
  return `${cut.slice(0, Math.max(cut.lastIndexOf(' '), n - 25))}…`;
};
const abs = (u) => (!u ? OG_IMAGE : /^https?:\/\//i.test(u) ? u : `${ORIGIN}${u.startsWith('/') ? '' : '/'}${u}`);
const isoDate = (d) => (d ? `${String(d).replace(' ', 'T').replace(/Z$/, '')}Z` : undefined);
const isoDuration = (sec) => {
  sec = Math.round(Number(sec) || 0);
  if (!sec) return undefined;
  const h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60), s = sec % 60;
  return `PT${h ? `${h}H` : ''}${m ? `${m}M` : ''}${s || (!h && !m) ? `${s}S` : ''}`;
};
const titleWith = (name, suffix) => {
  const full = `${name}${suffix}`;
  return full.length <= 70 ? full : `${clip(name, 55)} | Smart21Brain`;
};
const crumbs = (items) => ({
  '@context': 'https://schema.org', '@type': 'BreadcrumbList',
  itemListElement: items.map(([name, url], i) => ({ '@type': 'ListItem', position: i + 1, name, item: url })),
});

// ------------------------------------------------------------------ builders
// Each returns { title, description, canonical, image, type, robots, jsonld[] } or null (leave page as is).

function courseInfo(slug, row) {
  const b = COURSES[slug];
  if (b) return { name: b.t, desc: b.d, level: b.lv, lang: b.lang, free: b.free, img: b.img, age: b.age, cat: b.cat };
  if (row) return { name: row.title, desc: row.description, level: row.level, lang: row.language || 'English', free: !!row.is_free, img: row.thumbnail_url, age: row.age_range, cat: '' };
  return null;
}

async function courseMeta(url, env) {
  const slug = url.searchParams.get('slug') || url.searchParams.get('id');
  if (!slug) return null; // bare /course: keep the static generic tags
  let row = null;
  if (!COURSES[slug] && env.DB) {
    row = await env.DB.prepare('SELECT title, description, thumbnail_url, level, language, is_free, age_range FROM courses WHERE slug = ? AND published = 1').bind(slug).first();
  }
  const c = courseInfo(slug, row);
  const canonical = `${ORIGIN}/course?slug=${encodeURIComponent(slug)}`;
  if (!c) return { robots: 'noindex, follow', canonical, notFound: true };
  const description = clip(c.desc, 155) || `${c.name}: a course on Smart21Brain with lessons, examples and quizzes.`;
  return {
    title: titleWith(c.name, c.free ? ' – Free Online Course | Smart21Brain' : ' – Online Course | Smart21Brain'),
    description, canonical, image: abs(c.img), type: 'website',
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'Course', name: c.name, description: plain(c.desc) || description,
        url: canonical, provider: { '@type': 'Organization', name: 'Smart21Brain', sameAs: `${ORIGIN}/` },
        inLanguage: c.lang === 'Kiswahili' ? 'sw' : 'en', educationalLevel: c.level || undefined,
        isAccessibleForFree: c.free, image: abs(c.img),
        ...(c.cat ? { about: c.cat } : {}),
      },
      crumbs([['Home', `${ORIGIN}/`], ['Courses', `${ORIGIN}/courses`], [c.name, canonical]]),
    ],
  };
}

async function lessonMeta(url) {
  const id = url.searchParams.get('id');
  if (!id) return null;
  const canonical = `${ORIGIN}/lesson?id=${encodeURIComponent(id)}`;
  const l = LESSONS[id];
  const course = l && COURSES[l.c];
  if (!l || !course) return { robots: 'noindex, follow', canonical, notFound: true };
  const n = id.split('::')[1] || '';
  const description = clip(`${l.t}: lesson ${n} of the free ${course.t} course on Smart21Brain${l.m ? ` (${l.m})` : ''}. Clear explanations, examples and quizzes.`, 158);
  const courseUrl = `${ORIGIN}/course?slug=${encodeURIComponent(l.c)}`;
  return {
    title: titleWith(l.t, ` – ${course.t} | Smart21Brain`), description, canonical, image: abs(course.img), type: 'article',
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'LearningResource', name: l.t, description, url: canonical,
        isAccessibleForFree: true, inLanguage: course.lang === 'Kiswahili' ? 'sw' : 'en',
        educationalLevel: course.lv || undefined, learningResourceType: 'lesson',
        isPartOf: { '@type': 'Course', name: course.t, url: courseUrl }, provider: PUBLISHER,
      },
      crumbs([['Home', `${ORIGIN}/`], ['Courses', `${ORIGIN}/courses`], [course.t, courseUrl], [l.t, canonical]]),
    ],
  };
}

async function blogMeta(url, env) {
  const slug = url.searchParams.get('slug');
  if (!slug || !env.DB) return null; // no slug: static demo article keeps the generic tags
  const canonical = `${ORIGIN}/blog-post?slug=${encodeURIComponent(slug)}`;
  const p = await env.DB.prepare('SELECT title, excerpt, content, created_at FROM blog_posts WHERE slug = ? AND published = 1').bind(slug).first();
  if (!p) return { robots: 'noindex, follow', canonical, notFound: true };
  const description = clip(p.excerpt || p.content, 155) || p.title;
  return {
    title: titleWith(p.title, ' | Smart21Brain Blog'), description, canonical, image: OG_IMAGE, type: 'article',
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'BlogPosting', headline: clip(p.title, 110), description, image: [OG_IMAGE],
        datePublished: isoDate(p.created_at), dateModified: isoDate(p.created_at), mainEntityOfPage: canonical,
        author: { '@type': 'Organization', name: 'Smart21Brain', url: `${ORIGIN}/` }, publisher: PUBLISHER,
      },
      crumbs([['Home', `${ORIGIN}/`], ['Blog', `${ORIGIN}/blog`], [p.title, canonical]]),
    ],
  };
}

async function videoMeta(url, env) {
  const id = url.searchParams.get('id');
  if (!id || !env.DB) return null;
  const canonical = `${ORIGIN}/video?id=${encodeURIComponent(id)}`;
  const v = await env.DB.prepare('SELECT id, title, description, subject, thumbnail_url, duration_seconds, created_at, source_type, external_url FROM videos WHERE id = ? AND published = 1').bind(id).first();
  if (!v) return { robots: 'noindex, follow', canonical, notFound: true };
  const description = clip(v.description, 155) || `Watch ${v.title}${v.subject ? ` — ${v.subject}` : ''} on Smart21Brain VideoHub.`;
  const thumb = abs(v.thumbnail_url);
  const video = {
    '@context': 'https://schema.org', '@type': 'VideoObject', name: v.title, description, thumbnailUrl: [thumb],
    uploadDate: isoDate(v.created_at), duration: isoDuration(v.duration_seconds), isFamilyFriendly: true,
    publisher: PUBLISHER, url: canonical,
  };
  if (v.source_type === 'url' && v.external_url) video.embedUrl = v.external_url;
  else video.contentUrl = `${ORIGIN}/api/videos/${v.id}/stream`;
  return {
    title: titleWith(v.title, ' – Video | Smart21Brain'), description, canonical, image: thumb, type: 'video.other',
    jsonld: [video, crumbs([['Home', `${ORIGIN}/`], ['Videos', `${ORIGIN}/videos`], [v.title, canonical]])],
  };
}

async function bookMeta(url, env) {
  const slug = url.searchParams.get('slug');
  if (!slug || !env.DB) return null;
  const canonical = `${ORIGIN}/book?slug=${encodeURIComponent(slug)}`;
  const b = await env.DB.prepare('SELECT title, subject, description, cover_url, created_at FROM books WHERE slug = ? AND published = 1').bind(slug).first();
  if (!b) return { robots: 'noindex, follow', canonical, notFound: true };
  const description = clip(b.description, 155) || `Read ${b.title}${b.subject ? ` (${b.subject})` : ''} online for free on the Smart21Brain digital library.`;
  return {
    title: titleWith(b.title, ' – Read Online Free | Smart21Brain'), description, canonical, image: abs(b.cover_url), type: 'book',
    jsonld: [
      {
        '@context': 'https://schema.org', '@type': 'Book', name: b.title, description, image: abs(b.cover_url), url: canonical,
        isAccessibleForFree: true, genre: b.subject || undefined, publisher: PUBLISHER,
      },
      crumbs([['Home', `${ORIGIN}/`], ['Library', `${ORIGIN}/library`], [b.title, canonical]]),
    ],
  };
}

const HANDLERS = { '/course': courseMeta, '/lesson': lessonMeta, '/blog-post': blogMeta, '/video': videoMeta, '/book': bookMeta };

// ------------------------------------------------------------------ rewriting
const stripTags = (html) => html
  .replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, '')
  .replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi, '')
  .replace(/<meta\b[^>]*\bproperty=["']og:(?:title|description|url|image|type)["'][^>]*>\s*/gi, '')
  .replace(/<meta\b[^>]*\bname=["']twitter:(?:title|description|image)["'][^>]*>\s*/gi, '');

export function applyMeta(html, m) {
  html = stripTags(html);
  const tags = [`<link rel="canonical" href="${esc(m.canonical)}">`, `<meta name="robots" content="${m.robots || ROBOTS_INDEX}">`];
  if (!m.notFound) {
    html = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${esc(m.title)}</title>`);
    if (/<meta\s+name="description"/i.test(html)) html = html.replace(/<meta\s+name="description"\s+content="[^"]*"\s*>/i, `<meta name="description" content="${esc(m.description)}">`);
    else tags.push(`<meta name="description" content="${esc(m.description)}">`);
    tags.push(
      `<meta property="og:type" content="${m.type || 'website'}">`,
      `<meta property="og:title" content="${esc(m.title)}">`,
      `<meta property="og:description" content="${esc(m.description)}">`,
      `<meta property="og:url" content="${esc(m.canonical)}">`,
      `<meta property="og:image" content="${esc(m.image || OG_IMAGE)}">`,
      '<meta name="twitter:card" content="summary_large_image">',
      `<meta name="twitter:title" content="${esc(m.title)}">`,
      `<meta name="twitter:description" content="${esc(m.description)}">`,
      `<meta name="twitter:image" content="${esc(m.image || OG_IMAGE)}">`,
    );
    for (const obj of m.jsonld || []) tags.push(`<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`);
  }
  const block = tags.join('\n');
  return /<!-- s21-seo:end -->/.test(html) ? html.replace('<!-- s21-seo:end -->', `${block}\n<!-- s21-seo:end -->`) : html.replace(/<\/head>/i, `${block}\n</head>`);
}

// Returns a Response for the five dynamic pages, or null for every other request.
export async function seoPage(request, env) {
  if (request.method !== 'GET' && request.method !== 'HEAD') return null;
  const url = new URL(request.url);
  const handler = HANDLERS[url.pathname.replace(/\/+$/, '').replace(/\.html$/, '')];
  if (!handler) return null;

  const res = await env.ASSETS.fetch(request);
  if (res.status !== 200 || !/text\/html/i.test(res.headers.get('content-type') || '')) return res; // redirects etc. pass straight through
  let meta = null;
  try { meta = await handler(url, env); } catch (e) { /* database hiccup: serve the page with its generic tags */ }
  if (!meta) return res;

  const headers = new Headers(res.headers);
  headers.delete('content-length');
  headers.delete('etag');
  const body = applyMeta(await res.text(), meta);
  return new Response(request.method === 'HEAD' ? null : body, { status: 200, headers });
}

// ------------------------------------------------------------- live sitemap
export async function liveSitemap(env) {
  const urls = [];
  const grab = async (sql, make) => {
    try {
      const { results } = await env.DB.prepare(sql).all();
      for (const r of results || []) { const u = make(r); if (u) urls.push(u); }
    } catch (e) { /* table missing or database unavailable: skip this group */ }
  };
  if (env.DB) {
    await grab('SELECT slug FROM courses WHERE published = 1 ORDER BY id LIMIT 5000', (r) => (COURSES[r.slug] ? null : `${ORIGIN}/course?slug=${encodeURIComponent(r.slug)}`));
    await grab('SELECT slug FROM blog_posts WHERE published = 1 ORDER BY created_at DESC LIMIT 5000', (r) => `${ORIGIN}/blog-post?slug=${encodeURIComponent(r.slug)}`);
    await grab('SELECT id FROM videos WHERE published = 1 ORDER BY created_at DESC LIMIT 5000', (r) => `${ORIGIN}/video?id=${encodeURIComponent(r.id)}`);
    await grab('SELECT slug FROM books WHERE published = 1 ORDER BY id LIMIT 5000', (r) => `${ORIGIN}/book?slug=${encodeURIComponent(r.slug)}`);
  }
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((u) => `  <url><loc>${u.replace(/&/g, '&amp;')}</loc></url>`).join('\n')}\n</urlset>\n`;
  return new Response(xml, { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': 'public, max-age=3600' } });
}
