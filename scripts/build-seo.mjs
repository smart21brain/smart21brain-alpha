// Smart21Brain SEO builder.
// Run from the project folder after adding/changing pages, games or courses:
//
//     node scripts/build-seo.mjs
//
// It is safe to run again and again (idempotent). It:
//   1. adds/refreshes a managed SEO block in the <head> of every public page
//      (canonical URL, robots, Open Graph, Twitter card, icons, JSON-LD);
//   2. marks private pages (dashboards, logins, certificates...) noindex;
//   3. writes sitemap.xml (all public pages, games, built-in courses, lessons);
//   4. writes robots.txt;
//   5. writes src/lib/seo-catalog.js, which the Worker uses to give every
//      course / lesson its own title, description and structured data.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ORIGIN = 'https://smart21brain.com';
const OG_IMAGE = `${ORIGIN}/images/og-image.png`;
const LOGO = `${ORIGIN}/images/logo/smart21brain-logo-512.png`;
const read = (f) => fs.readFileSync(path.join(root, f), 'utf8');
const write = (f, s) => fs.writeFileSync(path.join(root, f), s);

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const decode = (s) => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;|&apos;/g, "'").replace(/&nbsp;/g, ' ').replace(/&mdash;/g, '—').replace(/&middot;/g, '·');
const ld = (obj) => `<script type="application/ld+json">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// ---------------------------------------------------------------- page rules
// Private / app pages: never show these in Google.
const NOINDEX_NOFOLLOW = new Set([
  'admin', 'dashboard', 'profile', 'teachers', 'parents', 'onboarding', 'splash', 'welcome', 'certificate',
  'final-exam', 'module-quiz', 'course-complete', 'institution-app', 'school-app', 'shop-app', 'stationery-app',
  'school-verify', 'shop-verify', 'institution-start', '_bar_test',
]);
// Utility pages: keep out of Google but let crawlers follow their links.
const NOINDEX_FOLLOW = new Set([
  'login', 'register', 'forgot-password', 'reset-password', 'search', 'school-login', 'shop-login', 'institution-login',
]);
// Never touched (verification file / tenant website shell).
const SKIP = new Set(['google23bbb4e40b6ca5e1', 'institution-site']);
// Pages whose real content depends on ?slug= / ?id= — the Worker fills in their SEO per item.
const DYNAMIC = new Set(['course', 'lesson', 'blog-post', 'video', 'book']);
// Dynamic pages that are only useful with a parameter: keep them out of the sitemap.
const NOT_IN_SITEMAP = new Set([...DYNAMIC]);

const files = fs.readdirSync(root).filter((f) => f.endsWith('.html')).sort();
const baseOf = (f) => f.replace(/\.html$/, '');
const cleanPath = (base) => (base === 'index' ? '/' : `/${base}`);

// ------------------------------------------------------------ course catalog
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(read('js/courses-data.js'), sandbox);
const courses = sandbox.window.S21Courses.all;

// ------------------------------------------------------------- head patching
const START = '<!-- s21-seo:start -->';
const END = '<!-- s21-seo:end -->';
const report = { patched: 0, noindex: 0, titleLong: [], descLong: [], descShort: [] };

function robotsContent(base) {
  if (NOINDEX_NOFOLLOW.has(base)) return 'noindex, nofollow';
  if (NOINDEX_FOLLOW.has(base)) return 'noindex, follow';
  return 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1';
}

function pageName(title) {
  const stripped = title.replace(/\s*\|\s*Smart21Brain.*$/i, '').replace(/\s*[—–]\s*Smart21Brain\s*$/i, '');
  return stripped.split(/\s+[—–]\s+/)[0].trim() || stripped;
}

function patchHome(src) {
  // 1) Search-engine crawlers must see the real homepage, not be bounced to splash/onboarding.
  if (!src.includes('s21-bot-skip')) {
    src = src.replace(
      /(\(function \(\) \{\s*)(try \{\s*var arrivingFromSplash)/,
      `$1// s21-bot-skip: crawlers (Googlebot, Bingbot...) must read the real homepage, never splash/onboarding.\n    try { if (/bot|crawl|spider|slurp|mediapartners|bingpreview|lighthouse|pagespeed|facebookexternalhit|twitterbot|linkedinbot|whatsapp/i.test(navigator.userAgent || '')) return; } catch (e) {}\n    $2`
    );
  }
  // 2) Search-friendly title and description.
  const title = 'Smart21Brain – Free Online Courses, Videos & Learning Games';
  const desc = 'Free online learning for every level, nursery to university: courses, video lessons, a digital library, educational games and quizzes on Smart21Brain.';
  src = src.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  src = src.replace(/<meta\s+name="description"\s+content="[^"]*"\s*>/i, `<meta name="description" content="${desc}">`);
  // 3) The old Organization JSON-LD is replaced by the richer one in the managed block.
  src = src.replace(/<script type="application\/ld\+json">\s*\{\s*"@context": "https:\/\/schema\.org",\s*"@type": "Organization"[\s\S]*?<\/script>\s*/i, '');
  return src;
}

function sameAsFromHome() {
  return ['https://facebook.com/smart21brain', 'https://instagram.com/smart21brain', 'https://youtube.com/@smart21brain'];
}

function buildBlock(base, src, addIcons) {
  const canonical = `${ORIGIN}${cleanPath(base)}`;
  const title = decode((src.match(/<title>([\s\S]*?)<\/title>/i) || [])[1] || 'Smart21Brain').replace(/\s+/g, ' ').trim();
  const desc = decode((src.match(/<meta\s+name="description"\s+content="([^"]*)"/i) || [])[1] || '').replace(/\s+/g, ' ').trim();
  const lines = [START];
  lines.push(`<link rel="canonical" href="${canonical}">`);
  lines.push(`<meta name="robots" content="${robotsContent(base)}">`);
  const indexable = !NOINDEX_NOFOLLOW.has(base) && !NOINDEX_FOLLOW.has(base);
  if (indexable) {
    lines.push('<meta property="og:site_name" content="Smart21Brain">');
    lines.push('<meta property="og:locale" content="en_US">');
    lines.push(`<meta property="og:type" content="${base === 'blog-post' ? 'article' : 'website'}">`);
    lines.push(`<meta property="og:title" content="${esc(title)}">`);
    if (desc) lines.push(`<meta property="og:description" content="${esc(desc)}">`);
    lines.push(`<meta property="og:url" content="${canonical}">`);
    lines.push(`<meta property="og:image" content="${OG_IMAGE}">`);
    lines.push('<meta property="og:image:width" content="1200">');
    lines.push('<meta property="og:image:height" content="630">');
    lines.push('<meta property="og:image:alt" content="Smart21Brain — Learn, Watch, Read &amp; Play">');
    lines.push('<meta name="twitter:card" content="summary_large_image">');
    lines.push(`<meta name="twitter:title" content="${esc(title)}">`);
    if (desc) lines.push(`<meta name="twitter:description" content="${esc(desc)}">`);
    lines.push(`<meta name="twitter:image" content="${OG_IMAGE}">`);
  }
  if (addIcons) {
    lines.push('<link rel="icon" href="/favicon.ico" sizes="48x48">');
    lines.push('<link rel="icon" type="image/png" sizes="32x32" href="/icons/favicon-32.png">');
    lines.push('<link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png">');
    lines.push('<link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png">');
  }
  if (indexable && base === 'index') {
    lines.push(ld({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'EducationalOrganization', '@id': `${ORIGIN}/#organization`, name: 'Smart21Brain',
          alternateName: ['Smart21 Brain', 'Smart 21 Brain'], url: `${ORIGIN}/`,
          logo: { '@type': 'ImageObject', url: LOGO, width: 512, height: 512 },
          image: OG_IMAGE, description: desc, sameAs: sameAsFromHome(),
        },
        {
          '@type': 'WebSite', '@id': `${ORIGIN}/#website`, url: `${ORIGIN}/`, name: 'Smart21Brain',
          alternateName: 'Smart21Brain.com', inLanguage: ['en', 'sw'], publisher: { '@id': `${ORIGIN}/#organization` },
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${ORIGIN}/search?q={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        },
      ],
    }));
  } else if (indexable && !DYNAMIC.has(base) && !/BreadcrumbList/.test(src)) {
    const crumbs = [{ n: 'Home', u: `${ORIGIN}/` }];
    if (/^game-/.test(base)) crumbs.push({ n: 'Games', u: `${ORIGIN}/games` });
    crumbs.push({ n: pageName(title), u: canonical });
    lines.push(ld({
      '@context': 'https://schema.org', '@type': 'BreadcrumbList',
      itemListElement: crumbs.map((c, i) => ({ '@type': 'ListItem', position: i + 1, name: c.n, item: c.u })),
    }));
  }
  lines.push(END);
  return { block: lines.join('\n'), title, desc };
}

for (const f of files) {
  const base = baseOf(f);
  if (SKIP.has(base)) continue;
  let src = read(f);
  const before = src;
  if (base === 'index') src = patchHome(src);

  // remove the previous managed block, then every older duplicate tag
  src = src.replace(new RegExp(`\\s*${START}[\\s\\S]*?${END}`, 'g'), '');
  src = src.replace(/<link\b[^>]*\brel=["']canonical["'][^>]*>\s*/gi, '');
  src = src.replace(/<meta\b[^>]*\bproperty=["']og:[^"']*["'][^>]*>\s*/gi, '');
  src = src.replace(/<meta\b[^>]*\bname=["']twitter:[^"']*["'][^>]*>\s*/gi, '');
  src = src.replace(/<meta\b[^>]*\bname=["']robots["'][^>]*>\s*/gi, '');
  {
    src = src.replace(/<link\b[^>]*\brel=["'](?:shortcut )?(?:icon|apple-touch-icon)["'][^>]*>\s*/gi, (tag) => (/coool\.png/.test(tag) ? '' : tag));
  }
  // Add the Smart21Brain icons unless the page has its own (the School / Shop / Institution apps do).
  const hasOwnIcons = /<link\b[^>]*\brel=["'](?:shortcut )?(?:icon|apple-touch-icon)["']/i.test(src);
  const { block, title, desc } = buildBlock(base, src, !hasOwnIcons);
  if (!/<\/head>/i.test(src)) continue;
  src = src.replace(/<\/head>/i, `${block}\n</head>`);
  if (src !== before) { write(f, src); report.patched++; }
  if (NOINDEX_NOFOLLOW.has(base) || NOINDEX_FOLLOW.has(base)) { report.noindex++; continue; }
  if (title.length > 70) report.titleLong.push(`${f} (${title.length})`);
  if (desc.length > 165) report.descLong.push(`${f} (${desc.length})`);
  if (desc && desc.length < 70) report.descShort.push(`${f} (${desc.length})`);
}

// ------------------------------------------------------------------- sitemap
const urls = [];
const addUrl = (loc) => urls.push(`  <url><loc>${loc.replace(/&/g, '&amp;')}</loc></url>`);
const pageBases = files.map(baseOf).filter((b) =>
  !SKIP.has(b) && !NOINDEX_NOFOLLOW.has(b) && !NOINDEX_FOLLOW.has(b) && !NOT_IN_SITEMAP.has(b));
// home first, then the main hubs, then everything else
const HUBS = ['index', 'courses', 'videos', 'library', 'games', 'smart21code', 'subjects', 'levels', 'ai', 'electron21', 'system21', 'computer21'];
const ordered = [...HUBS.filter((b) => pageBases.includes(b)), ...pageBases.filter((b) => !HUBS.includes(b))];
for (const b of ordered) addUrl(`${ORIGIN}${b === 'index' ? '/' : cleanPath(b)}`);
for (const c of courses) {
  addUrl(`${ORIGIN}/course?slug=${encodeURIComponent(c.slug)}`);
}
let lessonCount = 0;
const catalog = { courses: {}, lessons: {} };
for (const c of courses) {
  catalog.courses[c.slug] = {
    t: c.title, d: c.description || '', cat: c.category_name || '', lv: c.level || '', age: c.age_range || '',
    lang: c.language || 'English', free: c.is_free !== false, img: c.thumbnail_url || '', n: (c.lessons || []).length,
  };
  for (const l of c.lessons || []) {
    catalog.lessons[l.id] = { t: l.title, m: l.module || '', c: c.slug };
    addUrl(`${ORIGIN}/lesson?id=${encodeURIComponent(l.id)}`);
    lessonCount++;
  }
}
write('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`);

write('src/lib/seo-catalog.js', `// GENERATED by scripts/build-seo.mjs — do not edit by hand.\n// Built-in course/lesson metadata used by src/lib/seo.js.\nexport const COURSES = ${JSON.stringify(catalog.courses)};\nexport const LESSONS = ${JSON.stringify(catalog.lessons)};\n`);

// -------------------------------------------------------------------- robots
write('robots.txt', `# Smart21Brain — robots.txt
User-agent: *
Allow: /

# Private areas and app screens (not useful in search results)
Disallow: /api/
Disallow: /admin
Disallow: /dashboard
Disallow: /profile
Disallow: /teachers
Disallow: /parents
Disallow: /onboarding
Disallow: /splash
Disallow: /welcome
Disallow: /certificate
Disallow: /final-exam
Disallow: /module-quiz
Disallow: /course-complete
Disallow: /school-app
Disallow: /shop-app
Disallow: /institution-app
Disallow: /stationery-app
Disallow: /_bar_test

Sitemap: ${ORIGIN}/sitemap.xml
Sitemap: ${ORIGIN}/sitemap-live.xml
`);

console.log(`SEO build done.
  pages patched:        ${report.patched}
  noindex (private):    ${report.noindex}
  sitemap URLs:         ${urls.length} (${pageBases.length} pages, ${courses.length} courses, ${lessonCount} lessons)
  titles over 70 chars: ${report.titleLong.join(', ') || 'none'}
  descriptions >165:    ${report.descLong.join(', ') || 'none'}
  descriptions <70:     ${report.descShort.join(', ') || 'none'}`);
