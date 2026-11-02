# Smart21Brain — SEO guide

## What was changed in this update
**Fixed (these were blocking Google):**
- The homepage sent every first-time visitor, including Googlebot, to `splash.html` and then `onboarding.html`. Crawlers now skip that gate and read the real homepage. Normal visitors still get the splash.
- `sitemap.xml` listed 26 pages and used `.html` addresses that redirect. It now lists 355 clean URLs: all public pages, all games, every course and every lesson.
- Every course, lesson, blog post, video and book is one HTML file filled in by JavaScript, so Google saw the same title for all of them. The Worker (`src/lib/seo.js`) now gives each item its own title, description, canonical URL, social tags and structured data (Course, LearningResource, BlogPosting, VideoObject, Book).
- `/sitemap-live.xml` (new) lists courses, posts, videos and books that teachers/admins add in the database, so new content is discovered without editing files.
- Canonical URLs now use the address Cloudflare really serves (`/about`, not `/about.html`).
- Open Graph and Twitter tags added to every public page (before: 9 of 129). New share image `images/og-image.png`.
- Private pages (dashboards, logins, certificates, apps) are `noindex`; `robots.txt` blocks `/api/` and private screens.
- Homepage: new title and description, plus structured data for the organisation and a site search box.
- Long titles and descriptions that Google would cut off were shortened (Smart21Code's title was 141 characters).

**Speed (also a ranking factor):**
- All icons and favicons were the same 1.8 MB, 1254 px logo (the 16 px favicon was 1.8 MB). They are now real sizes (0.7 KB to 40 KB). Pages that showed the logo used the 1.8 MB file; they now use a 68 KB copy.

## Deploy
Deploy as usual (`wrangler deploy`). Nothing else to configure.

## Do this once, after deploying (about 15 minutes)
1. Open Google Search Console and add `smart21brain.com` (the verification file `google23bbb4e40b6ca5e1.html` is already in the project).
2. Sitemaps → submit `sitemap.xml` and `sitemap-live.xml`.
3. URL Inspection → paste `https://smart21brain.com/` → Request indexing. Do the same for `/courses`, `/games`, `/videos`.
4. Check `https://smart21brain.com/robots.txt` and both sitemaps open in a browser.
5. Test one course page at search.google.com/test/rich-results.
6. Confirm the social links in the homepage data are real accounts: facebook.com/smart21brain, instagram.com/smart21brain, youtube.com/@smart21brain (they are listed in `scripts/build-seo.mjs`, function `sameAsFromHome`).

## Keeping it working
- After adding pages, games or built-in courses: `node scripts/build-seo.mjs` (safe to repeat), then `node --no-warnings tests/seo.test.mjs`.
- Titles and descriptions: edit them in the page's `<title>` and `<meta name="description">`, then run the build. Keep titles under about 65 characters and descriptions under about 160.

## What moves rankings from here (not something code alone can do)
- Search for "Smart21Brain" should reach the top within days to weeks of indexing. Broad searches such as "free online courses" are very competitive and take months of steady work. Nobody can promise a position.
- Backlinks: get links from schools, education blogs, directories and your own social profiles.
- Content: publish blog posts and course text that answer what people actually search for (English and Kiswahili). Each course and lesson with real text is a page that can rank.
- Speed: the background videos (`games-hero-scrub.mp4` 6.5 MB, `game-bg.mp4` 5.7 MB, `splash-intro.mp4` 2.7 MB) are heavy; compress them or load them only on desktop.
- Optional later: internal links still point to `about.html`-style addresses, which redirect to `/about`. Changing them to clean links saves one redirect per click.
