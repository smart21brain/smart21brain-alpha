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
