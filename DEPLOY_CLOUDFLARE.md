# Deploying Smart21Brain to a Cloudflare Worker (with D1 + R2)

This site runs as a single **Cloudflare Worker** (`src/index.js`) that
serves the static site *and* handles the `/api/*` routes, backed by a
**D1** database (accounts, games, quizzes, blog, progress) and an **R2**
bucket (uploaded learning materials — PDFs/images).

I can't run these commands for you from here (no access to your
Cloudflare account or its API from this environment), but every command
below is copy-pasteable — run them from your terminal, inside this
`smart21brain/` folder.

## 0. Prerequisites

```bash
npm install -g wrangler
wrangler login          # opens a browser to authorize your Cloudflare account
```

## 1. Create the D1 database

```bash
wrangler d1 create smart21brain-db
```

This prints a `database_id` — copy it into `wrangler.toml`, replacing
`REPLACE_WITH_YOUR_D1_DATABASE_ID`.

Then apply the schema (creates tables + a seed admin account, including
all Stationery OS tables and seed data — presets, machine library,
academy courses, service requirement templates):

```bash
wrangler d1 execute smart21brain-db --file=./schema.sql --remote
```

> **Upgrading a database created before Phase 8?** `schema.sql` now
> expects `course_modules`/`certificates` tables and a couple of new
> columns on `courses`/`course_lessons` that a pre-Phase-8 database
> won't have yet. Run the one-time migration below *once*, first —
> plain SQLite has no `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, so
> this step can't be folded into the safely-re-runnable `schema.sql`:
>
> ```bash
> wrangler d1 execute smart21brain-db --file=./migrations/phase8-course-engine-v2.sql --remote
> ```
>
> After that, `schema.sql` (or `course-engine-schema.sql`) can be
> re-run as usual to pick up new seed data. A brand-new database
> created from this repo already has everything and doesn't need it.

### Learner progress that follows the account (built-in courses)

The built-in course catalog (`js/courses-data.js`) used to keep a learner's
enrolment and lesson progress only in their browser. Two small tables now
store it against the **account**, so it appears on any phone/laptop they sign
in on, and the dashboard's **XP, level, streak and badges** count it
(+10 XP per lesson, +50 XP the first time a course is finished; a day with a
finished lesson keeps the streak alive; finishing a Mathematics / Science /
Languages / Computer Studies / Creative course unlocks that subject's badge).

An existing database needs this one extra step (safe to re-run; brand-new
databases already get it from `schema.sql`):

```bash
wrangler d1 execute smart21brain-db --file=./catalog-progress-schema.sql --remote
```

Until it is run the site keeps working exactly as before — the dashboard just
doesn't count built-in lessons yet and nothing is synced.

If you add or remove a built-in course or lesson in `js/courses-data.js`,
refresh the server's small copy of its shape and redeploy:

```bash
node scripts/gen-catalog-index.mjs
```

Server tests (real SQLite built from `schema.sql`): `node --test tests/catalog-progress.test.mjs`

## 2. Create the R2 buckets

```bash
wrangler r2 bucket create smart21brain-materials
wrangler r2 bucket create smart21brain-stationery-files
```

The binding names (`MATERIALS`, `STATIONERY_FILES`) are already set in
`wrangler.toml` — no further config needed unless you rename a bucket.
`STATIONERY_FILES` is optional: the Photo Studio and PDF/Image tools
work entirely client-side without it — it only backs the future
"documents vault" upload endpoints (`/api/stationery/files`).

## 3. Deploy the Worker

From inside `smart21brain/`:

```bash
wrangler deploy
```

Wrangler reads `wrangler.toml`, bundles `src/index.js`, uploads every
static file in this folder (except what's listed in `.assetsignore`) as
Worker assets, and wires up the `DB` and `MATERIALS` bindings.

Your site will be live at `https://smart21brain.<your-subdomain>.workers.dev`
(or a custom domain, if you attach one in the Cloudflare dashboard under
Workers & Pages → smart21brain → Triggers → Custom Domains).

## 4. Log in as admin

- Go to `/login.html`
- Email: `admin@smart21brain.com`
- Password: `ChangeMe123!`
- **Change this password immediately** — there's no "change password" API
  yet, so for now the fastest way is:
  ```bash
  wrangler d1 execute smart21brain-db --remote --command \
    "DELETE FROM users WHERE email = 'admin@smart21brain.com';"
  ```
  then register a brand-new account normally through `/register.html`,
  and promote it to admin:
  ```bash
  wrangler d1 execute smart21brain-db --remote --command \
    "UPDATE users SET role = 'admin' WHERE email = 'you@yourdomain.com';"
  ```

## 5. Local development

```bash
wrangler dev
```

This runs the whole site + API locally with local D1/R2 emulation (data
won't touch production until you deploy or run commands with `--remote`).

## 6. What's wired up

| Area | Status |
|---|---|
| Register / Login / Logout | ✅ real, backed by D1 (`/api/auth/*`) |
| Admin: add/manage games, quizzes, blog posts | ✅ `admin.html` → list, create, delete all working |
| Admin: upload learning materials | ✅ `admin.html` → `/api/materials` (stored in R2) |
| Public pages reading live data | ✅ `games.html`, `quiz.html`, `blog.html`, `blog-post.html`, `dashboard.html` all pull from the API, with graceful fallback to demo content if the API isn't reachable |
| Dashboard stats | ✅ real name, real avg quiz score, real recent activity |
| **Stationery OS** (`stationery-app.html`) | ✅ full Universal Order Engine — POS, orders, inventory, customers, finance, reports, employees/roles, all backed by D1 (`/api/stationery/*`) |
| Stationery OS: Photo Studio, PDF/Image Tools | ✅ real, 100% client-side (canvas + pdf-lib/pdf.js/Tesseract.js) — no server processing needed |
| Stationery OS: Smart21brain AI, Online Services, Machine Center, Academy | ✅ real — Smart21brain AI via Workers AI; the rest backed by D1 |

## Project layout

```
smart21brain/
├── wrangler.toml         ← Worker config (D1 + R2 bindings, assets dir)
├── schema.sql             ← D1 schema + seed admin
├── .assetsignore          ← excludes src/, config, docs from static upload
├── src/
│   ├── index.js            ← Worker entry: routes /api/*, else serves assets
│   ├── router.js           ← tiny path/method router
│   ├── lib/auth.js         ← password hashing, sessions, cookies, helpers
│   ├── lib/stationery-auth.js ← Stationery OS: business/role context, permissions, audit log
│   ├── handlers/           ← one file per resource (auth, games, quizzes, blog, materials, dashboard)
│   └── handlers/stationery/  ← Stationery OS: business, customers, services, inventory, orders,
│                               finance, dashboard, reports, photostudio, files, onlineservices,
│                               machines, academy, chopaai, security
├── index.html, *.html      ← the static site (served as Worker assets)
├── stationery.html          ← Stationery OS marketing/overview page
├── stationery-app.html      ← Stationery OS app shell (the actual working app, login-gated)
├── stationery-manifest.json, stationery-sw.js ← Stationery OS PWA manifest + service worker
├── css/, js/, images/      ← static assets
├── js/stationery/           ← Stationery OS frontend modules (one file per screen)
├── css/stationery-app.css   ← Stationery OS design system (dark slate + emerald/cyan)
```

## API reference (all under `/api`)

- `POST /api/auth/register` `{name, email, password}`
- `POST /api/auth/login` `{email, password}`
- `POST /api/auth/logout`
- `GET  /api/auth/me`
- `GET  /api/games` · `POST /api/games` (admin) · `GET/PUT/DELETE /api/games/:id`
- `POST /api/games/:id/score` `{score}` (signed-in user)
- `GET  /api/quizzes` · `POST /api/quizzes` (admin) · `GET/PUT/DELETE /api/quizzes/:id`
- `POST /api/quizzes/:id/attempt` `{answers: [index, index, ...]}`
- `GET  /api/blog` · `POST /api/blog` (admin) · `GET/PUT/DELETE /api/blog/:slug`
- `GET  /api/materials` · `POST /api/materials` (admin, multipart file upload)
- `GET  /api/materials/:id` (streams the file) · `DELETE /api/materials/:id` (admin)
- `GET  /api/dashboard` (signed-in user's stats)

### Course Engine (Phase 8): `Course -> Module -> Lessons + Quiz -> ... -> Final Exam -> Certificate`

- `GET  /api/courses` · `POST /api/courses` (admin/teacher) — list/create
- `GET  /api/courses/:idOrSlug` — course + curriculum (`modules` nested with their `lessons` and
  quiz pass/fail, plus `ungrouped_lessons` for courses with no modules) +, if signed in and
  enrolled, `progress` (the full completion algorithm: lesson %, required %, final exam gate,
  `course_completed`, `certificate`)
- `PUT/DELETE /api/courses/:id` (admin/teacher who owns it)
- `POST /api/courses/:id/enroll` · `GET /api/courses/my` (signed-in user's enrollments)
- `GET  /api/courses/:id/modules` · `POST /api/courses/:id/modules` (admin/teacher)
- `PUT/DELETE /api/course-modules/:moduleId` (admin/teacher) — deleting a module ungroups its
  lessons rather than deleting them
- `GET  /api/courses/:id/lessons` · `POST /api/courses/:id/lessons` (admin/teacher, accepts
  `module_id` to place it in a module, or omit for an ungrouped lesson)
- `PUT/DELETE /api/courses/:id/lessons/:lessonId` (admin/teacher)
- `GET  /api/lessons/:id` (a single lesson's content) · `POST /api/lessons/:id/complete`
  `{completed}` — recomputes the whole completion algorithm and issues a certificate the moment
  every gate clears
- `POST /api/quizzes/:id/attempt` — same endpoint used for every quiz on the site; when the quiz
  is a module quiz or a course's final exam, the response's `courses[]` array reports the
  updated progress/completion for that course too
- `GET  /api/courses/:id/certificate` (signed-in learner's own certificate for that course)
- `GET  /api/certificates/my` (signed-in learner's certificates, newest first)
- `GET  /api/certificates/:code` — public, no sign-in required: verifies a certificate code the
  same way `school-verify.html` verifies a student ID card

### Stationery OS (all under `/api/stationery`, any signed-in user — role checked per action)

- `GET  /context` — current business, role, memberships (auto-provisions a starter business on first visit)
- `PUT  /business` (owner) · `GET/POST /staff` · `PUT /staff/:id` (owner/manager)
- `GET/POST /customers` · `GET/PUT/DELETE /customers/:id`
- `GET/POST /services` · `PUT/DELETE /services/:id` (pricing system)
- `GET/POST /inventory` · `PUT/DELETE /inventory/:id` · `POST /inventory/:id/adjust` · `GET /inventory/:id/history`
- `GET/POST /orders` · `GET /orders/:id` · `PUT /orders/:id/status` · `POST /orders/:id/payments` · `GET /orders/:id/receipt`
- `GET/POST /finance/expenses` · `DELETE /finance/expenses/:id` · `GET /finance/cashbook` · `GET /finance/debts` · `GET /finance/summary`
- `GET  /dashboard` · `GET /reports?range=daily|weekly|monthly`
- `GET/POST /photo-presets` · `DELETE /photo-presets/:id`
- `POST /files` (multipart upload to R2) · `GET/DELETE /files/:key`
- `GET  /online-services/templates` · `GET/POST /online-services` · `PUT /online-services/:id`
- `GET/POST /machines` · `DELETE /machines/:id`
- `GET  /courses` · `GET /courses/:id` · `POST /courses/:id/progress`
- `POST /chopaai` `{prompt, mode}` — mode: general|machine|photo|business|sales_summary
- `GET  /notifications` · `PUT /notifications/:id/read` · `PUT /notifications/read-all`
- `GET  /audit-log` (owner) · `GET /backup/export` (owner) · `POST /backup/restore` (owner)

## Smart21Institution (library, e-library, students, academics)

```bash
# 1. add its tables (safe to run more than once)
wrangler d1 execute smart21brain-db --file=./institution-schema.sql --remote
# 2. deploy — wrangler.toml now includes a daily cron ([triggers]) that makes weekly automatic backups
wrangler deploy
```

It uses the same `DB` and `MATERIALS` (R2) bindings as the School System. Full documentation, manuals and the
testing checklist are in `INSTITUTION_SYSTEM.md`.

## Teacher dashboard (Phase 10)

`teachers.html` now runs on real data (stats, courses, students, reviews,
announcements, assignments, uploads). Run this migration **once** on your
existing database before deploying:

```
wrangler d1 execute smart21brain-db --remote --file=./migrations/phase10-teacher-dashboard.sql
```

Then add the teacher e-mail queue (needed for the "Email me" switches in Teacher settings; safe to run again):

```
wrangler d1 execute smart21brain-db --remote --file=./migrations/phase11-teacher-email.sql
```

Fresh installs get the same tables from `schema.sql`. Until the migration is
run the site keeps working; reviews, announcements, assignments and settings
just show as empty.

Teachers can now upload videos, resources (PDF/image) and quizzes, and
create/publish courses. They can only edit or delete what they created;
admins can edit everything.

## Anatomy and Physiology (Medical Level) course

Adds a 10-module medical-level course (36 lessons, 9 checkpoint quizzes and a
20-question final exam) with 15 built-in anatomy diagrams (`{{anat heart}}`,
`{{anat nephron}}`, ... see the cheat-sheet at the top of `js/lesson-rich.js`).
Run once after deploying:

```
npx wrangler d1 execute smart21brain-db --remote --file=./course-anatomy-physiology-seed.sql
```

Safe to run again; it never deletes anything. Deploy the updated
`js/lesson-rich.js` and `images/anatomy-physiology-course.svg` with it.

## Artificial Intelligence and Machine Learning in Depth course

A deeper follow-on to the short "Introduction to AI" course: 7 modules, 25
lessons, 6 checkpoint quizzes and a 20-question final exam, with 10 new AI
diagrams (`{{ai neuralnet}}`, `{{ai llm}}`, ... see `js/lesson-rich.js`).
Run once after deploying:

```
npx wrangler d1 execute smart21brain-db --remote --file=./course-ai-ml-seed.sql
```

Safe to run again. Deploy the updated `js/lesson-rich.js` and
`images/ai-ml-course.svg` with it.

## More Anatomy and Physiology (modules 11 to 14)

Extends the Anatomy and Physiology course with four new modules: **The special senses** (eye, ear, taste, smell, touch), **The musculoskeletal system in detail** (axial and appendicular skeleton, joints, muscles, fractures), **Cells, genes and development** (histology, genetics, embryology) and **Metabolism, clinical skills and pharmacology** (energy metabolism, vital signs and lab values, medical terminology, drug basics). That is 14 lessons, 4 checkpoint quizzes and a 15-question extension exam, and it also refreshes the course description and "what you will learn" list. Run once, after `course-anatomy-physiology-seed.sql`:

```
npx wrangler d1 execute smart21brain-db --remote --file=./course-anatomy-physiology-extra-seed.sql
```

Safe to run again; it never deletes anything. If the single file is too large for your plan, run the four small files `d1-more/m-052-anatomy-extra-1.sql` to `m-055-anatomy-extra-4.sql` in order instead (`run-more.bat` already does this). Deploy the updated `js/lesson-rich.js` with it: it now supports `*italic*` text.

## Computer Networks and Korean for Beginners courses

Two new built-in courses in `js/courses-data.js` (no database step needed):

- **Computer Networks: From Cables to the Cloud** (`computer-networks`): 7 modules, 27 lessons, 6 module quizzes and a 15-question final test.
- **Korean for Beginners** (`korean-for-beginners`): 4 modules, 17 lessons, 3 quizzes and a 12-question final test, starting with Hangul.

Covers are `images/courses/computer-networks.svg` and `images/courses/korean-for-beginners.svg`. After adding or editing built-in courses run `node scripts/gen-catalog-index.mjs` and `node scripts/gen-search-index.mjs`.

## Course information

`course.html` now shows a **Course at a glance** panel (modules, lessons, quizzes, study time, level, ages, language, final exam, certificate, price), **Who this course is for**, a **Course outline** and a **FAQ**. Everything is worked out from the course's own data, so it also works for database courses. A built-in course can add its own `audience`, `includes` and `faq` lists in `js/courses-data.js`. The course cards on `courses.html` now also show a short description and a "Certificate included" tag.

## Teacher dashboard fixes (teachers.html)

Deploy the whole project (the script versions were bumped so browsers load the new files). The dashboard expects `migrations/phase10-teacher-dashboard.sql` (reviews, announcements, assignments, settings) and, for e-mail, `migrations/phase11-teacher-email.sql` to have been run once.

Fixed:
- Editing a course no longer resets its **final exam pass mark** to 70 (the course list did not return it). A "lessons needed" of 0 is also kept as 0.
- A course's **category, age range and thumbnail can now be cleared**; the update used to ignore an empty value. Blank titles, negative prices and percentages outside 0 to 100 are refused by the server.
- **Duplicate lesson or module titles** now give a clear message instead of a server error, and new lessons/modules can no longer get the same sort number after something is deleted.
- **Reordering lessons** works inside each module (the arrows used to appear to do nothing at the edge of a module).
- The lessons window no longer opens on top of the closing course window, and no longer flashes the previous course's lessons.
- With **zero courses** the assignment, announcement and student dropdowns now stay correct.
- The "average quiz score" only counts students enrolled in your courses.
- Clear messages instead of silence when a script is blocked, the network drops, a section cannot load, or a non-teacher opens the page. Large or wrong-type uploads are refused before the upload starts.

Added:
- **Edit a lesson** (text, type, module, minutes, free preview) and **rename a module**.
- **Search students by name and filter by course**.
- A warning before publishing a course that has no lessons; readable assignment due dates with an "Overdue" tag.
- Every form field now has a proper label for screen readers.


Automated checks live in `tests/teacher-dashboard/` (`npm install` then `npm test`).


## Teacher e-mails, quiz editing and the "profile" switch

Teacher settings now do what they say:

- **Email me new student comments**: when a student writes a review comment, the teacher gets one e-mail (student shown as "Amina J.", with a link to the Reviews tab). The same comment is never e-mailed twice.
- **Weekly performance summary email**: every Monday at 02:00 UTC (05:00 in Tanzania) each opted-in teacher gets new students, lessons completed, average quiz score, new reviews, revenue, comments waiting and students who need a nudge. One summary per teacher per week.
- **Send me a test e-mail**: a button that checks delivery and explains exactly what is wrong if it fails.
- **Show my profile to parents**: when off, the teacher's name and photo are hidden on the public course list and course pages (the teacher and admins still see them).

E-mail uses the same provider as the rest of the site. Add the secrets once (see `wrangler.toml`): `RESEND_API_KEY`, `EMAIL_FROM` and `SITE_URL`. Until then nothing is sent and the Settings card says so; the messages are still recorded and marked "skipped" so nothing is lost silently. Run `migrations/phase11-teacher-email.sql` first. The queue is `teacher_email_outbox`; to see what happened:

```
wrangler d1 execute smart21brain-db --remote --command "SELECT kind, status, detail, created_at FROM teacher_email_outbox ORDER BY id DESC LIMIT 20"
```

Quizzes can now be **edited** from the dashboard (pencil button in "My uploads"): change questions, answers (2 to 8 per question), the correct answer and explanations. The window warns when the quiz is used in lessons or as a final exam, or when students have already taken it (their past scores are kept). Deleting a quiz, video or resource that is in use now warns first. The server also checks every quiz it saves (no empty answers, the correct answer must exist, at most 100 questions).

Known limitation, unchanged: student quiz pages read the questions, including the correct answers, from the public `GET /api/quizzes/:id`, because their results screens need them. A technical student could read the answers that way. Hiding them would need the student pages to ask the server to mark each answer; tell us if you want that.

## Electron21 page

`electron21.html` (with `css/electron21.css` and `js/e21-*.js`) is the new hub for
electronics, computer engineering, data science and engineering. It replaces
"Levels" in the top navigation on every page (levels.html still exists and is
reachable from the footer and home page). Static files only: nothing to run in
the database. Seven labs run fully in the browser (logic, circuit, signal scope,
8-bit CPU emulator, number systems, data/CSV, resistor colour code).
`css/style.css` was bumped to `?v=20` on all pages for the nav fit changes.
