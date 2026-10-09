# Smart21Brain — Frontend

A modern, child-friendly education platform (video hub + digital library +
games + courses + quizzes) built as a static, framework-free frontend
(HTML5, CSS3, Bootstrap 5, vanilla ES6+ JS) that's structured to plug into
a backend later.

## What's built (Phase 1–12) — 31 pages

- **Design system** — `css/style.css` (tokens, typography, buttons, cards,
  navbar, hero, footer, floating actions, AI panel, game HUD, book reader,
  quiz options, auth split-screen, dashboard widgets, pricing cards,
  contact cards, admin sidebar layout, gallery/lightbox, **custom video
  player**), `css/responsive.css`, `css/animations.css`.
- **Marketing/content**: `index.html`, `about.html`, `subjects.html`,
  `kids.html`, `cartoons.html`, `blog.html`, `blog-post.html`,
  `pricing.html`, `contact.html`, `gallery.html` (working lightbox).
- **Learning core**: `courses.html`/`course.html`, `videos.html`/
  `video.html` (working custom player — see below), `library.html`/
  `book.html` (working reader), `games.html`/`game.html` (working Addition
  Race), `quiz.html` (working quiz engine). Filter buttons on `courses.html`,
  `videos.html`, `library.html`, `blog.html` and `gallery.html` are all
  functional (client-side show/hide by category).
- **Accounts**: `login.html`/`register.html`/`forgot-password.html`/
  `reset-password.html`, `profile.html`.
- **Dashboards**: `dashboard.html` (student), `teachers.html`,
  `parents.html`, `admin.html` — all four roles from the brief.
- **JS** — `main.js`, `darkmode.js`, `search.js`, `voice-search.js`,
  `ai-assistant.js`, `auth.js`, `games.js`, `library.js`, `quiz.js`,
  `i18n.js`, **`video.js`** (now a real player, not a stub) — all
  functional. `analytics.js`, `booking.js`, `dashboard.js` remain stubs
  reserved for real backend wiring.
- **SEO/config** — `robots.txt`, `sitemap.xml`, JSON-LD schema.

### First-run flow — onboarding → splash → homepage

Two new pages, both chrome-less (no navbar/footer) and excluded from
search indexing (`noindex` + `robots.txt`):

- **`onboarding.html`** — a 5-step flow: **(1) language** (English/
  Kiswahili), **(2) a guest-or-join fork**, then — only if the person
  chooses to join — **(3) level of education**, **(4) how you heard about
  us**, **(5) goals** (multi-select). Choosing **Guest** on step 2 skips
  straight to the splash screen with no further questions; choosing
  **Join** continues through steps 3–5. The progress bar always shows 5
  segments regardless of path, and Back navigation from step 3 correctly
  returns to the fork (step 2), not back through language again. Answers
  save to `localStorage` (`s21-onboarding-answers`, `s21-onboarded`) —
  picking Kiswahili also sets `s21-lang` so the homepage's language toggle
  (`js/i18n.js`) picks it up automatically. A "Skip for now" link is
  always available as an escape hatch.
- **`splash.html`** — a full-screen branded splash using the uploaded
  mascot artwork (`images/logo/smart21brain-mascot.png`, resized from
  1254px/1MB down to 640px/~320KB for the web), with a fade/scale-in
  animation and a short loading-dots animation, then auto-redirects to
  `index.html` after ~2.2 seconds.

**How the gate works now** (inline blocking script at the very top of
`index.html`'s `<head>`, before any other resource loads): **every fresh
load of `index.html` redirects to `onboarding.html` first** — typing the
URL, a bookmark, a refresh, opening a new tab all trigger it, every time.
The only load of `index.html` that's allowed straight through is the one
immediately following a legitimate `onboarding.html` → `splash.html` →
`index.html` hand-off, tracked by a one-time `sessionStorage` flag
(`s21-from-splash`) that `splash.html` sets right before its own
redirect and that `index.html` deletes the instant it reads it — so it
only ever covers that one transition and can't be reused to skip
onboarding on a later visit. In short: **onboarding always runs when the
site is "started" via `index.html`**, not just on a visitor's first-ever
visit.

The gate is only on `index.html` (the site's actual "start") — direct
links to inner pages like `courses.html` are left alone.

### Real root-cause fix — sidebar columns no longer stretch site-wide

The AOS-opacity fix (below) turned out to only be part of the story — the
overlap kept happening even with animations fully disabled, which meant
there was a second, independent, always-on bug. Found it by auditing
every two-column "main content + sidebar" layout on the site: Bootstrap's
`.row` stretches flex columns to equal height **by default**, and
`.s21-card`'s base CSS sets `height: 100%`. So on every page with a
shorter sidebar next to taller main content — `course.html`, `book.html`,
`video.html`, `game.html`, `game-multiplication.html`, `quiz.html`,
`blog-post.html`, `admin.html`, `dashboard.html`, `parents.html`,
`teachers.html` — the sidebar card(s) were silently inflating to match
the much taller column next to them, well beyond their real content
height. That's not cosmetic slack — it's exactly what produces the kind
of overlap in the screenshots, especially combined with any positioned
element nearby.

Fixed at the actual mechanism, not per-page: every one of those 11 pages'
content+sidebar row now has `align-items-start` added
(`row g-5 align-items-start` / `row g-4 align-items-start`), so columns
size to their own natural content height and never stretch to match a
taller sibling. Then re-scanned the *entire* site programmatically for
any other `col-lg-7/8/9` + `col-lg-3/4/5` row missing the same safeguard
— none found. This is the systemic fix; the earlier `course.html`-only
`.sticky-card` patch is now redundant (harmless, still present) but the
real fix is `align-items-start` applied everywhere the pattern occurs.

Also added a cache-busting version string (`?v=4`) to every page's CSS
`<link>` tags, since repeated fixes not showing up is also consistent
with a browser serving a stale cached copy of `style.css` from an earlier
download — worth ruling out on your end too by re-downloading this latest
zip fresh rather than reusing an already-extracted folder.

### Full bilingual support — English & Kiswahili

`js/i18n.js` was rewritten from a homepage-only demo into a real,
site-wide language system:

- **Every one of the 25 standard pages** now has the language toggle
  button (desktop navbar icon + mobile menu button) and links `i18n.js` —
  previously only `index.html` did.
- **Navbar and footer are fully bilingual on every page** — nav links,
  Log In/Get Started, the footer tagline, all three footer columns
  (Quick Links, Learning, Resources), and the legal links at the bottom.
- **The homepage (`index.html`) is fully translated** — hero (badge,
  headline, subline, lead paragraph, search placeholder, all 3 CTA
  buttons, all 4 stat labels), and every section's eyebrow + heading +
  key paragraph + "view all" link across Subjects, Courses, VideoHub,
  Kids, Library, Games, Continue Learning, Achievements, Teachers,
  Testimonials, Blog, and the Newsletter band.
- **`onboarding.html` is fully translated and switches live** — picking
  Kiswahili on step 1 immediately re-renders the rest of the wizard
  (steps 2–5, button labels) in Kiswahili right away, not just on a
  future page load, via a small `window.S21_applyLang()` hook exposed by
  `i18n.js`.
- **`splash.html`**'s tagline is translated too.
- Added **`data-i18n-html`** as a second attribute alongside `data-i18n`:
  plain `data-i18n` swaps `textContent` (safe for plain strings);
  `data-i18n-html` swaps `innerHTML` for the few strings that need inline
  markup preserved (the homepage hero headline has `<em>` and `<br>` —
  swapping via `textContent` would have permanently destroyed that
  formatting on every language switch, including switching back to
  English).
- The choice persists in `localStorage` (`s21-lang`) and is honored by
  every page automatically on load.

**Every `data-i18n`/`data-i18n-html`/`data-i18n-placeholder` key actually
used anywhere in the 31 HTML files was cross-checked against both
language dictionaries programmatically** — 120 keys used, all 120 present
in both English and Kiswahili, zero missing either direction. Both
`js/i18n.js` and `onboarding.html`'s inline script were also verified to
be syntactically valid JavaScript.

**Scope note:** catalog card content (individual course/video/book titles,
testimonial quotes, blog post bodies, dashboard demo data, etc.) remains
English-only — translating every piece of that placeholder content wasn't
attempted, since it's demo data that would be replaced by a real backend
anyway. What's translated is the site's actual structure and navigation:
everything a visitor sees on every page (nav + footer) plus the full
homepage and the entire first-run onboarding flow.

### Real Google Map — no API key needed

`contact.html`'s map placeholder is now a **working embedded map**, not a
placeholder. Google offers a key-free embed URL format
(`google.com/maps?q=...&output=embed`) alongside the official (API-key-
gated) Maps Embed API — this uses that key-free format, pointed at
"Msasani Peninsula, Dar es Salaam, Tanzania" to match the address already
shown on the page. No account, billing, or API key setup required. A
comment in the HTML shows how to swap it for the official Embed API (with
its own styling controls) if a real API key is ever added later — but the
site doesn't require one to have a functioning map today.

### Round 3: contact.html + profile.html overlap, pricing.html badge, Contact in navbar

The `align-items-start` fix from the previous round used a character-window
regex to scan for unsafe rows, which missed `contact.html` and
`profile.html` because their second sidebar column happened to sit further
into the source than the scan window checked — a real gap in that
verification method, not just those two pages being untouched. Re-did the
audit properly this time using an actual HTML parser (BeautifulSoup) that
inspects every `.row`'s direct children and flags any two-column row with
mismatched `col-lg-*` widths and no `align-items-start`/`align-items-center`
— caught exactly these two, confirmed zero remaining afterward, and will
use the parser-based method (not a regex window) for any future audit of
this kind.

Also found and fixed two more issues while auditing `pricing.html`
specifically (as asked): the "Most Popular" badge on the Premium plan was
positioned above its own card's top edge (`top: -14px`) while its parent
also had `.s21-card`'s inherited `overflow: hidden`, silently clipping the
badge invisible — fixed by giving `.pricing-card` `overflow: visible`. And
the Premium card's `transform: scale(1.04)` emphasis effect grew it
visually without reserving extra grid space, letting it crowd into its
neighbors at narrower widths — removed in favor of border-color + shadow
only, which achieves the same "featured" look with zero overlap risk.

**Contact added to the top navbar** on all 25 standard pages (not the 4
chrome-less auth pages or the onboarding/splash pages, which have no
navbar) — previously it only lived in the footer and the mobile menu.

### Fixed: content "ghosting" and overlapping across screenshots

Multiple screenshots showed text semi-transparently overlapping other
content (e.g. a heading readable *through* the footer below it) on
several different pages. Two opaque HTML elements with solid backgrounds
cannot do that in a real single-frame render — the only way you see both
layers blended like a double exposure is if at least one of them was
still mid-fade (partial opacity) when the screenshot was taken. The
culprit: **every section on the site uses AOS.js scroll-reveal
animations** (`data-aos="fade-up"` etc.), which start elements at
`opacity: 0` and fade them in over 650ms as they scroll into view. Any
screenshot/PDF/"full page" capture tool that grabs the page before that
transition finishes — which is common with automated scroll-and-stitch
capture tools — will catch elements partway through their fade, exactly
producing this ghosted overlap look.

Fixed by neutralizing AOS entirely at the CSS level: `[data-aos] {
opacity: 1 !important; transform: none !important; transition: none
!important; }` in `css/style.css`, so every element is always fully
visible from the moment the page loads, on every page, regardless of
scroll position or how/when a screenshot is taken. AOS's `<script>` tags
and `data-aos` attributes are still present in the markup (harmless,
inert) rather than stripped out everywhere, but the reveal effect itself
is fully disabled site-wide.

(Also caught and fixed in the same pass: the CSS `@import` for Google
Fonts briefly ended up after other rules during this edit, which the CSS
spec requires to be first or the browser silently drops it — corrected
before shipping, and confirmed with a fresh full-site HTML tag-balance
check that nothing else broke.)

### Layout bug fix — sticky sidebar overlapping the footer

A real bug was reported (and reproduced) on `course.html`: the sticky
"enroll" sidebar card was visually overlapping the footer and other
content while scrolling. Root cause: `.s21-card`'s base CSS sets
`height: 100%`, and Bootstrap's `.row` stretches flex columns to equal
height by default — so the sidebar column stretched to match the *much
taller* left column (full course description, chapters, reviews), and
`position: sticky` then kept that oversized box partially pinned on
screen well past where it should have stopped, overlapping content below
it. Fixed with a new reusable `.sticky-card` class (`height: auto;
align-self: flex-start;`) applied to the sidebar, and audited the rest of
the site to confirm this was the only place the same combination
(`.s21-card` + `position: sticky` + a taller sibling column) occurred.

While investigating, a full-site HTML tag-balance validation pass also
caught **two stray extra `</div>` tags** each in `game.html` and
`game-multiplication.html` (leftover from an earlier content edit) —
harmless in most browsers' error-correcting parsers, but incorrect
markup. Both fixed; all 29 pages now pass a strict open/close tag check
with zero errors.

### Dark mode only — toggle removed

The light/dark switcher has been removed entirely (navbar, mobile menu,
and the book reader toolbar) — Smart21Brain now always runs in dark mode.
Every page's `<html>` tag is hardcoded to `data-theme="dark"`, and
`js/darkmode.js` was simplified from a full toggle-with-persistence system
down to a one-line lock: it clears out any stale `s21-theme` value a
returning visitor might have saved in `localStorage` from before, and
forces `data-theme="dark"` regardless of system preference. There is no
remaining UI anywhere on the site to switch back to light mode.

### Real favicon + real icons everywhere (not just the AI feature)

Two gaps fixed across the whole site, not just one page:

1. **`favicon.ico` never actually existed** — every page linked to it, but
   the file itself was missing (browsers were silently failing to load a
   tab icon on all 29 pages). Generated a real one with Pillow from the
   same brain-mark shape used in the navbar logo: `favicon.ico`
   (multi-resolution 16–256px) plus `icons/favicon-32.png`,
   `icons/favicon-16.png`, `icons/apple-touch-icon.png`, and
   `icons/icon-512.png` for PWA/home-screen use. All 29 pages now link all
   three icon variants.
2. **64 emoji-as-icon replaced with real Font Awesome icons.** Game tiles,
   subject/achievement badges, the hero's floating path badges, and the
   quiz result screen were all using raw emoji characters (🔢🔬💻🏆➕✖️🧩🍕🧬
   etc.) as their icon — inconsistent across OS/browsers and out of step
   with the rest of the site, which already used Font Awesome everywhere
   else. Replaced every icon-slot emoji with a semantically matching
   `fa-solid` icon (e.g. 🔬 → `fa-flask`, 💻 → `fa-laptop-code`, 🧬 →
   `fa-dna`) across `index.html`, `games.html`, `game.html`,
   `game-multiplication.html`, `kids.html`, `dashboard.html`,
   `quiz.html`/`quiz.js`, `forgot-password.html`, `reset-password.html`.
   Purely decorative inline text emoji in prose (e.g. the 👋 wave in
   "Welcome back, Amara! 👋") were left alone — those aren't standing in
   for a missing icon, they're just friendly copy.
3. **Fixed a real CSS bug found in the process**: `.game-emoji` was only
   ever defined as `.game-card .game-emoji`, so every standalone use
   outside a `.game-card` (kids-zone tiles, the achievements badge row,
   the homepage games preview) had **no base styling at all** — no fixed
   size, shape, or color, just raw emoji sized to their font. Promoted the
   rule to a real base `.game-emoji` class with proper sizing and
   `color:#fff` so FA icons render consistently everywhere it's used.

### Games — Addition Race + Multiplication Rush

`js/games.js` is now a **shared engine** for arithmetic games, not a
single-purpose script: each game page sets `window.S21_GAME_CONFIG =
{ operation, leaderboardKey }` before the script loads, and the engine
picks the right problem generator (addition or multiplication) while
reusing all the shared HUD/timer/lives/leaderboard logic. `game.html`
(Addition Race) and `game-multiplication.html` (Multiplication Rush, times
tables up to ×12, difficulty ramps with level) are both fully playable.

**Honesty fix:** previously, 15 of the 16 tiles on `games.html` silently
linked to the Addition Race page regardless of their label (e.g. clicking
"Human Body Match" opened an addition quiz) — a real bug. This is now
fixed: only the two built games link anywhere; the other 14 tiles are
visually marked **"Coming soon"** and are non-clickable, so nothing
misleads the visitor about what's actually playable. Adding a third real
game means adding a new operation to `OPERATIONS` in `games.js`, cloning
`game-multiplication.html`, and un-marking its tile on `games.html`.

### Custom video player

`video.html` + `js/video.js` — a real `<video>` element with a fully
custom control layer (native browser controls are hidden): play/pause,
seek bar, volume, mute, playback speed menu (0.5x–2x), captions toggle
(uses the `<track>` element), picture-in-picture, fullscreen, and a
**theater mode** toggle that widens the player. Controls auto-hide after
2.5s of inactivity while playing. Clickable **chapter markers** jump to a
timestamp and highlight as playback passes through them. Keyboard
shortcuts: space (play/pause), ←/→ (seek ±5s), `f` (fullscreen), `m`
(mute). The demo `<source>` is a small public CC0 sample video used only
as a placeholder — swap it for real hosted/CDN video files, and swap the
speed/caption menu for real multi-bitrate sources when you have them.
Every "play" button across the site (VideoHub, homepage, kids zone,
cartoons, dashboards) already links here.

### i18n (English/Kiswahili)

`js/i18n.js` is a small, dependency-free pattern: elements tagged
`data-i18n="key"` get their text swapped from a `STRINGS` dictionary, the
choice persists to `localStorage`, and a `data-lang-toggle` button flips
between languages. **Only the homepage navbar is wired up as a working
example** (click the "SW" pill next to the dark-mode toggle) — extending
this to the rest of the site means adding `data-i18n` attributes to more
elements and more keys to `STRINGS`, which is intentionally left as the
next content-translation pass rather than translating all 27 pages'
copy site-wide in one shot.

### Admin dashboard

`admin.html` follows a sidebar-and-content layout distinct from the other
dashboards (Overview / Users / Content moderation / Payments / Settings).
Content moderation rows have working Approve/Reject buttons (visual only —
wire to a real moderation API); the same `.dash-table`/`.status-chip`
components from `teachers.html` are reused for the users table.

### Working category filters

`courses.html`, `videos.html`, `library.html` and `blog.html` all have
**functional** filter buttons now (previously decorative) — clicking
"Mathematics", "Beginner", etc. actually shows/hides the matching cards
client-side, via a small inline script per page keyed off `data-level`/
`data-category` attributes on each card. `gallery.html`'s filters worked
this way from the start. This is a client-side filter over the static demo
content — a real backend would paginate/filter server-side instead.

### Addition Race — how it works

`js/games.js` drives `game.html`: 60-second timer, 3 lives, score, and a
level that increases every 5 correct answers in a row (which also raises
the difficulty of the numbers generated). Game-over saves a name + score to
a per-device leaderboard in `localStorage` (key `s21-addition-race-scores`).
The HUD/start/play/game-over screen pattern (`#game-start-screen`,
`#game-play-screen`, `#game-over-screen`, `.game-panel`, `.game-hud`) is
reused by `quiz.js` too, and is written to extend to the next games —
swap `newProblem()` for the new game's logic and reuse the rest.

### Book reader — how it works

`js/library.js` powers the reader embedded in `book.html`: page navigation
(buttons + arrow keys), font-size and zoom controls, a bookmark button that
persists the last-read page to `localStorage` per book
(`s21-bookmark-<book-id>`), search-inside-the-book (jumps to the first page
containing the term and highlights it), and a fullscreen toggle. The dark
mode toggle in the reader toolbar reuses the site-wide theme system. Sample
content is a 6-page short story — swap the `PAGES` array for real chapter
text (or paginate a longer text) to reuse this for any book.

### Quiz engine — how it works

`js/quiz.js` powers `quiz.html`: 5 multiple-choice questions, a 20-second
per-question timer, instant right/wrong styling on the options, a plain-
language explanation after every answer, running score, and a results
screen with a score-based message. Swap the `QUESTIONS` array to make a
new quiz (Mathematics Quiz, Science Quiz, etc.) — everything else is reused.

### Course Engine (Phase 8) — Modules, Final Exam, Certificates

The real (backend-wired) course engine, separate from the standalone
`js/quiz.js` demo above, now follows:

```
Course
│
├── Module 1
│   ├── Lesson 1
│   ├── Lesson 2
│   └── Quiz            (a normal `quizzes` row — no separate authoring system)
│
├── Module 2
│   ├── Lesson 3
│   ├── Lesson 4
│   └── Quiz
│
└── Final Exam           (optional; sits above the modules, not inside one)
```

and the completion algorithm:

```
Lessons completed → Required percentage → Final assessment →
Passing score → Course completed → Certificate
```

A course's "units" are its lessons plus one unit per module that has its
own quiz; once enough are done to clear `courses.passing_score` (the
required %), the optional Final Exam unlocks, and clearing
`final_exam_passing_score` on it is what actually completes the course —
issuing a certificate automatically the first time every gate clears. A
course with no final exam completes as soon as the percentage gate is
met, so every course built before Phase 8 keeps working unchanged, and
`module_id` on a lesson is nullable so a course can stay a flat lesson
list forever if that's all it needs.

- **`src/lib/course-engine.js`** — the shared calculation + certificate
  issuance, called from lesson completion and from quiz-attempt
  submission (`src/handlers/course-lessons.js`, `src/handlers/quizzes.js`).
- **`src/handlers/course-modules.js`**, **`src/handlers/certificates.js`**
  — module CRUD, and certificate lookup/public verification.
- **`module-quiz.html`/`js/module-quiz.js`** and **`final-exam.html`/
  `js/final-exam.js`** — the two quiz-taking pages the course page links
  to; the final exam page refuses to render until the API reports
  `progress.final_exam.unlocked`.
- **`certificate.html`/`js/certificate.js`** — a printable certificate,
  and the same page anyone can open with just the code to verify it's
  real (`GET /api/certificates/:code`, public, no sign-in), the same
  pattern `school-verify.html` uses for student ID cards.
- **Demo course**: *Fractions Made Fun* is fully built out end-to-end —
  2 modules with real quizzes + a 5-question final exam — so the engine
  ships with one real, click-through-able example rather than an empty
  skeleton.
- See `course-engine-schema.sql` for the schema and
  `migrations/phase8-course-engine-v2.sql` for upgrading a database that
  was already running before Phase 8 existed.


## Design tokens

| Token | Value | Use |
|---|---|---|
| `--s21-primary` | `#0B6E4F` | Brand green — nav, buttons, links |
| `--s21-secondary` | `#FFD166` | Warm accent — CTAs, kids zone |
| `--s21-accent` | `#EF476F` | Pink accent — AI assistant, CTA band |
| `--s21-bg` / `--s21-text` | `#F8F9FA` / `#222222` | Base surface & text |

Fonts: **Fredoka** (display/headings — rounded, friendly) + **Plus Jakarta
Sans** (body — clean and legible at small sizes). Signature visual: the
hero's hand-drawn **learning path** connecting subject badges, echoing the
gamified course-path idea used throughout (progress bars, streaks, badges).

## Every interior page follows the same recipe

Copy the `<header>` navbar + offcanvas + `<footer>` + floating-action stack
+ AI panel block from `about.html` or `videos.html`, swap the `active` nav
class to the current page, and build the `<main>` content using the
existing component classes (`.s21-card`, `.media-card`, `.book-card`,
`.game-card`, `.subject-card`, `.btn-s21-*`, `.badge-pill`, `.progress-s21`,
etc.) — no new CSS should be needed for most pages.

## Not yet built

Essentially everything from the original brief is now built, including a
real video player. What remains is either a real backend/third-party
integration (can't be completed without your own accounts/keys) or a
deliberate scope decision documented above:

1. Real payment integration (Stripe/PayPal/M-Pesa/Airtel Money/Tigo Pesa —
   server-side only, never client-side secret keys).
2. Live EmailJS + Google Maps on `contact.html` (placeholders + exact
   integration comments are already in place).
3. Full-site i18n copy translation (pattern is built in `js/i18n.js`,
   applied to the homepage navbar as a working example).
4. Wiring `analytics.js`, `booking.js` and `dashboard.js` to a real
   backend — everything currently renders fine with static/demo data.
5. A real moderation/admin API behind `admin.html`'s Approve/Reject
   buttons, and a real content pipeline behind the video player's
   quality-selector menu (currently single-source, single-quality).

## Integrations that need real keys (never hard-code secrets)

EmailJS (contact form), Google Maps (contact page), payment providers
(Stripe/PayPal/M-Pesa/Airtel Money/Tigo Pesa — server-side only), and any
backend for auth, courses, videos, books, games, quizzes, analytics.
