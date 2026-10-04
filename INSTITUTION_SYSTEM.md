# Smart21Institution

An integrated institutional management system for schools, colleges, universities, libraries,
training centres and organisations. It lives inside Smart21Brain next to the School System and
Smart21Shop and follows the same pattern: a Cloudflare Worker (`src/`), a D1 database,
a private R2 bucket for files, and a plain JavaScript front end with no build step.

* Landing page: `institution.html` (linked from the home page and from Earth21)
* Sign in / register: `institution-login.html`
* The app: `institution-app.html` (installable as a PWA)
* Public catalogue (no sign-in): `institution-opac.html?i=<institution-slug>`

> **Honest status.** Everything below marked ✔ is implemented against a real database and was tested
> end to end (see *Testing*). Section 14 lists what is **not** built yet. Nothing is faked.

---

## 1. Architecture

```
Browser (HTML + JS modules, PWA shell)
   │   fetch /api/institution/*  (cookie session, X-Institution-Id header)
   ▼
Cloudflare Worker  src/index.js  ──►  src/handlers/institution/*.js  ──►  src/lib/institution-auth.js
   │                                         (validation, permissions, audit, notifications)
   ├──►  D1 (SQLite)   institution-schema.sql   — every table has institution_id (multi-tenant)
   └──►  R2 bucket MATERIALS  — covers, photos, logos, e-library files, backups (private; random keys)
Cron (daily 02:00 UTC)  →  weekly automatic backup for every institution
```

* **Layers:** public (landing page, OPAC) → authentication (shared Smart21Brain accounts + `ins_members`)
  → administrative (settings, users, permissions, audit, backup) → operational modules.
* **Multi-tenant:** one database serves many institutions. Every query is filtered by
  `institution_id`, taken from the signed-in person's membership, never from the request body.
* **Modules** are independent files that talk only through the database and shared helpers:

| Module | Server (`src/handlers/institution/`) | Screen (`js/institution/`) |
|---|---|---|
| Accounts, settings, roles, announcements, notifications | `core.js` | `admin.js`, `app.js` |
| Library: OPAC, books, copies, lending, reservations, fines | `library.js` | `library.js`, `circulation.js` |
| E-Library (secure files) | `elibrary.js` | `elibrary.js` |
| Students, staff, departments, programmes | `people.js` | `people.js`, `academics.js` |
| Academics: years, terms, courses, enrolment, marks | `academics.js` | `academics.js` |
| Dashboard, search, reports, audit, health | `insights.js` | `dashboard.js`, `reports.js`, `admin.js` |
| Import, backup & restore | `tools.js` | `admin.js` |
| Sample data | `demo.js` | `dashboard.js` |

### Private workspaces & the entry page
* Every administrator who registers gets a **brand-new, empty institution** (their own categories, years, roles, settings). Nobody is added to anyone else's institution automatically.
* `institution-start.html` is neutral by default: it only offers **Sign in** and **Register my institution** and never lists or names any institution.
  An institution's name appears there only when someone opens **that institution's own link** (`institution-start.html?i=<slug>` or `/s/<slug>`), or when the signed-in person already belongs to it.
* `GET /api/institution/public-sites` no longer lists institutions: it returns one institution only when `?i=<slug>` is given.
* The browser's remembered institution (`in-inst-id`) is cleared at every sign-in/registration, and the server ignores any `X-Institution-Id` / `institution_id` that is not one of the person's own memberships.
* Test: `node --no-warnings tests/tenant-isolation.test.mjs`

## 2. Roles and permissions (RBAC)

Roles: Super Administrator, Administrator, Librarian, Staff, Teacher / Lecturer, Student
(Public/Guest is the public catalogue page). **Permissions are data, not code:** each institution can
change them in *Roles & permissions*. The table shows the defaults. The Super Administrator always has
every permission so the owner can never be locked out. Every endpoint checks permissions on the server;
the browser only hides buttons.

| Permission | Super Administrator | Administrator | Librarian | Staff | Teacher / Lecturer | Student |
|---|:-:|:-:|:-:|:-:|:-:|:-:|
| View the library catalogue (staff view) | ✔ | ✔ | ✔ | ✔ | ✔ |  |
| Add, edit, archive & delete books | ✔ | ✔ | ✔ |  |  |  |
| View all loans & reservations | ✔ | ✔ | ✔ |  |  |  |
| Issue, return, renew & reserve books | ✔ | ✔ | ✔ |  |  |  |
| Manage fines (collect, waive) | ✔ | ✔ | ✔ |  |  |  |
| Open digital resources (as allowed by each resource) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Upload, edit & delete digital resources | ✔ | ✔ | ✔ |  |  |  |
| View student records | ✔ | ✔ | ✔ | ✔ | ✔ |  |
| Add, edit & delete student records | ✔ | ✔ |  |  |  |  |
| View staff records | ✔ | ✔ | ✔ | ✔ |  |  |
| Add, edit & delete staff records | ✔ | ✔ |  |  |  |  |
| View courses, enrolment & results | ✔ | ✔ |  | ✔ | ✔ |  |
| Manage programmes, courses & enrolment | ✔ | ✔ |  |  |  |  |
| Enter & change marks (teachers: own courses only) | ✔ | ✔ |  |  | ✔ |  |
| Enter & change marks for any course | ✔ | ✔ |  |  |  |  |
| Post & delete announcements | ✔ | ✔ | ✔ |  |  |  |
| View & export reports | ✔ | ✔ | ✔ | ✔ | ✔ |  |
| Import records from CSV / Excel | ✔ | ✔ | ✔ |  |  |  |
| Manage logins & roles | ✔ | ✔ |  |  |  |  |
| Change institution settings | ✔ | ✔ |  |  |  |  |
| Change what each role can do | ✔ |  |  |  |  |  |
| View the audit log | ✔ | ✔ |  |  |  |  |
| Create, verify & download backups | ✔ |  |  |  |  |  |
| View system health | ✔ | ✔ |  |  |  |  |

Extra rules that are not simple switches:

* **Teachers** only see students enrolled in courses they teach, and may only enter marks for courses
  they are assigned to (unless given *marks for any course*).
* **Students** see only their own loans, fines, results and profile. A student login must be linked to a
  student record (done from the student's page: *Create login*).
* Only a Super Administrator can create, change or restore over another Super Administrator, and an
  institution must always keep at least one active Super Administrator.

## 3. Database (`institution-schema.sql`)

28 tables, all prefixed `ins_`. It reuses the `users` and `sessions` tables of Smart21Brain.

```
ins_institutions 1─* ins_members *─1 users           (a person can belong to several institutions)
ins_institutions 1─* ins_role_permissions, ins_settings
ins_departments 1─* ins_programmes 1─* ins_students
ins_academic_years 1─* ins_terms
ins_courses *─1 ins_programmes;  ins_teaching (course × staff × term)
ins_enrollments (student × course × term) 1─1 ins_results
ins_categories 1─* ins_books 1─* ins_book_copies 1─* ins_loans 1─* ins_fines
ins_books 1─* ins_reservations
ins_resource_categories 1─* ins_resources            (files in R2)
ins_announcements, ins_notifications, ins_audit_logs, ins_imports, ins_backups, ins_login_attempts
```

Primary keys, foreign keys with `ON DELETE` rules, unique constraints (e.g. one accession number per
institution, one ISBN per catalogue), CHECK constraints for every status, indexes on every search/filter
column, `created_at` / `updated_at` timestamps, and **soft deletion** (`deleted_at`) for books, students,
staff, resources and announcements so history is never orphaned. Book availability is never stored — it is
always derived from the `ins_book_copies` rows, so it cannot drift.

## 4. API (all under `/api/institution`, JSON, consistent `{ "error": "…" }` on failure)

`/register /login /logout /context /institutions /lookups` · `/info /settings /permissions /users` ·
`/announcements /notifications` · `/opac /opac/suggest /opac/book/:id /books /copies /categories` ·
`/borrowers /loans (issue, return, renew) /reservations /fines /my-library` ·
`/resources (+ /file /thumb) /resource-categories` · `/students /staff /me /departments /programmes` ·
`/academic-years /terms /courses /teaching /enrollments /results/sheet /me/results` ·
`/dashboard /search /reports/:key /audit /health` · `/import/* /backups/*` · `/demo-data` ·
public, no sign-in: `/public/:slug /public/:slug/books /public/:slug/resources /public/logo/:id`.

All lists support filtering, sorting (where it makes sense) and pagination. Writes require the
same origin (CSRF protection) and are validated on the server.

## 5. Screens and navigation

Sidebar groups (shown according to permissions): **Overview** (Dashboard, Announcements) ·
**Library** (Catalogue, My library, Lending & returns, Manage books, E-Library) ·
**Students & academics** (My profile, My results, Students, Staff, Courses & programmes, Marks & results) ·
**Administration** (Reports, Import, Logins & roles, Settings, Backup & restore, Audit log, System health).
Top bar: global search (press `/`), language (English/Kiswahili), dark mode, notifications.
Sub-pages: Book page, Student page, Categories, Reservations, Fines, Departments & terms, Enrolment,
Roles & permissions, individual reports.

## 6. Security

* Passwords hashed (existing Smart21Brain scheme); sessions are HttpOnly, Secure, SameSite cookies.
* Sign-in throttling: 8 failed attempts per email and 25 per IP in 15 minutes; sign-up throttled per IP.
* Every query parameterised (no SQL injection); all output HTML-escaped (XSS); same-origin check on writes (CSRF).
* File uploads: extension **and file contents** must match (a renamed program is rejected), size limit,
  random storage keys, served with `nosniff` and a sandboxing CSP. E-library files have **no public URL** —
  each read/download is authorised against the access level (public / members / staff) and the
  *allow view* / *allow download* switches. Student photos and covers are only served to people allowed to see them.
* Tenant isolation: tested — a second institution cannot read another's books, students, files or backups.
* Audit log of logins, failures, users, permission changes, books, loans, uploads, marks, settings,
  backups and report exports (user, action, time, module, record, IP, device, result).
* CSV exports neutralise spreadsheet formulas.

## 7. Library details

* **OPAC:** search all fields or one (title, author, ISBN, subject, publisher, category), availability and
  year filters, sort, suggestions, pagination, cover, shelf, copies. Status shown:
  Available / Borrowed / Reserved / Lost / Damaged / Archived / No copies.
* **Lending:** a borrower is blocked when at the loan limit, holding an overdue book, or owing fines.
  Defaults (changeable in Settings): 14 days students, 30 days staff, 3/10 books, 2 renewals of 7 days,
  fine 200/day, lost = price × 1, damaged = flat fee, reservations held 3 days.
* Returning a book creates the fine, frees the copy, and holds it for the next person waiting (with a notification).
* A renewal is refused when the book is overdue, someone is waiting, or the renewal limit is reached.

## 8. Reports

Library inventory, borrowing, returns, overdue, lost & damaged, most used, borrower activity ·
Student list, enrolment by course, academic performance, programme statistics ·
System activity, operational statistics. Each has date/programme/department/status filters where relevant,
and **Print, PDF, Excel and CSV** export.

## 9. Import, backup, restore

* **Import** books, students or staff from CSV or Excel: upload → match columns → server-side validation with a
  row-by-row error report and preview → confirm → import → summary. Invalid rows are never silently imported.
* **Backup:** one JSON file with every record of the institution + checksum. Manual or automatic (weekly, by the daily cron). The latest 10 are kept.
  **Verify** re-reads the stored file and compares the checksum and row counts. **Restore** (Super Administrator only) replaces
  the institution's records after taking a safety backup first. Uploaded files (e-library files, covers, student photos, student documents) are copied next to the backup and put back on restore — see *Backups now include uploaded files* below.

## 10. Deployment

1. Apply the schema (safe to re-run): `wrangler d1 execute smart21brain-db --file=./institution-schema.sql --remote`
2. Make sure the R2 binding `MATERIALS` exists (the School System already uses it).
3. Deploy as usual (`wrangler deploy`). `wrangler.toml` now has a daily cron trigger (`0 2 * * *`) for automatic backups.
4. Open `institution-login.html`, register your institution, then *Dashboard → Load sample data* (optional) to explore.

Secrets/credentials are never in the source; the system only uses the existing bindings (`DB`, `MATERIALS`).

## 11. Disaster recovery

1. Keep at least one downloaded backup off Cloudflare (Backup & restore → download).
2. If records are damaged: Backup & restore → pick the newest backup marked *Passed* → **Restore** (type RESTORE). A safety backup is made first, so the restore itself can be undone.
3. If the whole database is lost: re-apply `schema.sql` and `institution-schema.sql`, register the institution, then upload the downloaded backup through support/ops (restore reads backups stored by the system; re-import from the file if needed).
4. Re-upload e-library files if the R2 bucket was lost (keep originals).

## 12. Testing

* **Automated back-end test (155 checks, all pass):** registration, RBAC for every role, tenant isolation, circulation rules
  (limits, fines, holds, renewals), file-upload validation, public catalogue privacy, import validation, backup/verify/restore,
  all 13 reports, demo data. Run against the real schema with a local SQLite database standing in for D1.
* **Browser walkthrough (headless Chromium):** registration through the real form, 29 screens, issuing a book through the
  UI, catalogue search, global search, dark mode, Kiswahili, mobile width (no horizontal overflow) — no JavaScript errors.

### Manual testing checklist (before go-live)

- [ ] Register an institution; load sample data; open every sidebar item
- [ ] Create a librarian, a teacher (linked to a staff record) and a student (linked to a student record) login and sign in as each
- [ ] Student cannot open Students, Reports, Backups or Audit (they are not shown and the server refuses)
- [ ] Issue → renew → return a book; make one overdue and check the fine; reserve a borrowed book and check the hold
- [ ] Upload a PDF as *Members*, confirm it is not reachable without signing in; mark one *Public* and open it from the public page
- [ ] Teacher enters marks for own course; cannot for another course
- [ ] Import a CSV with one bad row — the bad row is reported and not imported
- [ ] Create a backup, **Verify** it, then restore it on a test institution
- [ ] Phone check: menu, tables (become cards), forms, search
- [ ] Switch to Kiswahili and back; switch dark mode

## 13. Future expansion

New modules (finance/fees, attendance, timetable, examinations, parent portal, HR, hostel, transport, inventory…) each need
only: a schema file with `institution_id` on every table, a handler file using `secure({ perm }, …)`, a screen file registering
`IN.modules.<name>`, new permission keys in `src/lib/institution-auth.js`, and a nav entry. They automatically reuse sign-in,
roles, notifications (`notify()`), audit (`audit()`), search, reports, settings and backups. E-mail, SMS and push channels are built into `notify()` (see *Notification channels* below).

## 14. Not built yet (so nobody is misled)

* No e-mail/OTP verification at registration; password reset for institution logins uses the main Smart21Brain *Forgot password* page.
* Bulk "promote class to next year" and timetables/attendance (planned modules).
* **Camera barcode scanning needs a browser that can read barcodes** (Chrome / Edge on Android and desktop). Safari and Firefox can only read QR codes by camera; there the person can take a photo, type the number, or use a USB scanner.
* **Offline saving covers a defined set of actions**, not everything: returning books, entering marks and saving reading progress are kept on the device and sent later. Issuing a book, renewing, registering, uploads and all administration need a connection, because the server's rules (limits, fines, who is waiting) decide the result.
* E-mail, SMS and push only work after the person who deploys the system adds the provider keys (next section). Until then notices stay in-app, exactly as before.

---

# User guides

## Administrator

1. **First set-up:** Settings → add name, logo, colour, time zone, currency. Departments & terms → add departments, programmes, the academic year and terms. Library rules → loan days, limits, fines. Academic → grading scale.
2. **People:** Import your students/staff/books from a spreadsheet (Import records) or add them one by one. For each person who needs to sign in: *Logins & roles → Add login* (staff, librarians, teachers — link teachers to their staff record) or open a student and press *Create login*.
3. **Permissions:** Logins & roles → Roles & permissions. Tick what each role may do and press Save.
4. **Every week:** check *System health*, *Reports → Overdue*, and make sure a backup shows *Passed*.
5. **Never share** the Super Administrator password; create Administrators for daily work.

## Librarian

* **Add a book:** Manage books → Add book (title and author are required; set the number of copies — copy numbers are created for you). Add a cover if you have one.
* **Issue:** Lending & returns → Issue book → choose the borrower, then the book (or scan/type the copy number).
* **Return:** press *Return* on the loan, or type/scan the copy number in *Quick return*. Choose Damaged or Lost when needed; fines are added automatically. If someone was waiting, the copy is held for them.
* **Overdue:** Lending & returns → *Overdue* tab (borrowers are notified automatically). **Fines:** record payment or waive.
* **Lost/damaged copy:** open the book → the ⋯ menu on the copy.
* **E-Library:** Upload → choose who may open it and whether reading online / downloading is allowed.

## Staff

Open the sidebar items you can see. You can search the catalogue and E-Library, view student and staff records, and run the reports you are allowed to. If something is missing, ask an Administrator — permissions are set per role.

## Teacher / Lecturer

* **Marks & results:** choose your course and term, type marks (0–100), press Save. Grades appear automatically. You can only edit courses you are assigned to.
* **Students:** you see the students enrolled in your courses.
* **Reports:** Student list, Academic performance, Enrolment (for your students/courses).

## Student

* **Sign in** with the email and password the institution gave you.
* **Catalogue:** search and see if a book is available; press *Reserve* when it is out.
* **My library:** books you have, due dates, renew, reservations, fines, history.
* **E-Library:** *Read* online or *Download* (if the institution allowed it).
* **My results:** marks, grades and GPA. **Announcements** and the 🔔 bell show notices and reminders.

---

# Website module (website builder + public site + online applications)

Smart21Institution is now also a **website for the institution**, not only a dashboard.

* **Public website:** `/s/<institution-slug>` (home) and `/s/<slug>/<page>` — served by `institution-site.html`, styled by `css/institution-site.css`, drawn by `js/institution/site-render.js`. Menu with one level of drop-down, theme colours/fonts, English/Kiswahili switch, footer with social links, mobile menu.
* **Website builder (in the app, sidebar → Website):** `js/institution/site-builder.js`
  * *Pages* — each page is a list of **blocks**: banner, text (+picture), cards, numbers, latest news, events, announcements, **live library books** (from the OPAC), **online application form**, contact form, FAQ, gallery, call-to-action, quote, leader message, spacer. Add / reorder / copy / delete blocks, live desktop/mobile preview, drafts vs published.
  * *News & events*, *Pictures* (media library, stored in R2), *Design & settings* (colours, font, corners, header button, footer links, publish switch, public catalogue switch).
  * **Starter website** — one click builds Home, About, Programmes, Library, News & events, Apply, Contact from the institution's own details and programmes.
* **Online registration:** visitors fill the Apply form → *Applications & messages* in the app (new / reviewing / accepted / rejected) → **Enrol as student** creates a real student record (next student number, programme, contact details). Contact-form messages arrive in the same screen. Admins get an in-app notification.
* **Library on the website:** the *Library books* block lists live books with availability; the catalogue link opens `institution-opac.html?i=<slug>` (search, reserve after sign-in).

New files: `institution-site-schema.sql`, `src/handlers/institution/site.js`, `institution-site.html`, `css/institution-site.css`, `js/institution/site-render.js`, `js/institution/site-builder.js`, `tests/site.test.mjs`, `tests/site-render.test.mjs`.
New permissions: `site.manage` (build & publish), `applications.manage` (review applications/messages). Super Administrator and Administrator get them; give them to other roles in *Roles & permissions*.

**Security:** page content is stored as validated JSON and **escaped when drawn** (an editor can never inject a script); links must be https/mailto/tel/`/path`; images must be an uploaded picture or https URL; public forms have a hidden honeypot, 5 submissions/hour per visitor (IP stored only as a hash) and are closed when the site is switched off; every query is filtered by institution.

**Deploy:** `wrangler d1 execute smart21brain-db --file=./institution-site-schema.sql --remote` then `wrangler deploy`. Then: sign in → Website → *Create starter website* → *Design & settings* → switch **Website is live** (and *Public catalogue*).

**Tests:** `node --no-warnings tests/site.test.mjs` (57 checks: permissions, tenant isolation, sanitising, uploads, applications, enrol, limits, routes) and `node --no-warnings tests/site-render.test.mjs` (27 checks: escaping of every block type).

**Not built yet (honest list):** custom domain per institution (sites live under `/s/<slug>`; a domain can be pointed at it with a Cloudflare rule), e-mail/SMS notice to applicants, online payment of application fees, drag-and-drop (blocks move with arrow buttons), multi-language page content (one language per page; the menu/labels switch).


---

## Update: entry page, student self-registration, e-library on the home page, Unsplash design

* **Entry page** `institution-start.html` — the first screen of the system. Two big choices: **Home page** (the website) or **Dashboard** (sign in; if already signed in it says "Continue to your dashboard"). Works with `?i=<slug>`; with one live website it opens that one, with several it shows a list. The PWA start page, the product page buttons and the website's "Dashboard" link all point here.
* **Student self-registration** — block *Student registration* (page `/s/<slug>/register`, also the "Register" button in the menu). One submit creates the **login**, the **student record** (next student number, status active, programme) and the **student membership**, signs the student in, and opens the dashboard. The name is in *Students* immediately, and admins who can manage students get a notification. Protections: honeypot, 4 registrations per connection per hour, passwords checked (8+), duplicate email refused, an admin switch *"Let students register online"* in Website → Design & settings, and everything closes when the website is switched off.
* **Library on the home page** — the *Library* block has two tabs: **Library books (OPAC)** and **E-Library (e-books)**, one search box for both. E-books show Read / Download buttons according to each resource's permissions; "Sign in to read" otherwise. Needs *Public catalogue* on, and e-books set to "public" access.
* **New design blocks** — photo slider (home banner), quick-link buttons, steps, numbers/CTA with photo backgrounds, short page banners, icon cards, fade-in on scroll, back-to-top, mobile menu from 1120px.
* **Starter website (10 pages)** — Home, About ▸ Leadership, Programmes, Admissions ▸ Student registration, Library, News & events, Gallery, Contact. All photos are hotlinked from **Unsplash** (free licence) and can be replaced in the builder. No AI features or AI wording anywhere on the site.
* **Tests** — `node --no-warnings tests/site.test.mjs` (79 checks) and `tests/site-render.test.mjs` (31 checks).

### Dark mode is the default
Every Smart21Institution page opens in **dark mode**: dashboard (`institution-app.html`), sign-in, OPAC, the entry page and the public website. The sun/moon button (dashboard top bar, and the top strip of the website) switches to light and the choice is remembered in the browser (`in-theme`) and shared by all these pages. Browsers that had saved "light" before this update are reset to dark once (`in-theme-v2`); after that their own choice sticks. The website has a full dark palette (cards, forms, menu, modals, e-library), so the Website builder preview also shows it the way visitors see it.

### Entry rule: register / sign in always goes through the entry page
Every button that registers or opens an account (admin or student) first opens `institution-start.html`, which then offers **Continue to student registration / sign in / register your institution** plus the Home page and Dashboard choices (`?go=login | admin-register | register`, optional `&i=<slug>`).
* Product page buttons, the website's "Register" button, quick links, slider and card buttons, the top "Dashboard" link, the dashboard's sign-out and an expired session all point to the entry page.
* Direct links are guarded too: opening `institution-login.html` or a page with the student registration form without having passed the entry page sends the visitor to it first. Passing it is remembered for 30 minutes (`in-gate`), or granted by `?via=start`, so sign-in retries never loop.
* This is a navigation rule, not a security control: sign-in and registration are still protected by the server (passwords, limits, honeypot).
* The Smart21Brain "Log In / Get Started" links in the product page header belong to the main Smart21Brain site and were left as they are.

---

## Student portal: profile, results and "continue reading"

A student who registers on the website (or whose login an administrator creates) signs in and gets a student dashboard.

| Screen | Route | What the student can do |
|---|---|---|
| Dashboard | `#dashboard` | Search books, open E-Library, **Continue reading** (last 3 unfinished books), borrowed books, results, profile |
| My reading | `#my-reading` | Every book they opened: continue at the saved page, update the page, mark finished, remove from the list |
| E-Library | `#elibrary` | **Read** becomes **Continue** at the saved page; the bookmark button saves "the page I am on" |
| My results | `#my-results` | Marks, grades, term averages and GPA (own results only) |
| My profile | `#my-profile` | Edit phone, date of birth, address and guardian details; change photo; change password |

Name, programme, class, status and the sign-in email stay with the administration.

API (all require sign-in and only ever touch the caller's own data): `PUT /api/institution/me/profile`, `POST /api/institution/me/photo`, `POST /api/institution/me/password`, `GET /api/institution/me/reading`, `POST|DELETE /api/institution/me/reading/:resourceId`.

Reading progress is stored per person and book in `ins_reading_progress` (one row per user and resource). The page opens with `#page=N`, which PDF viewers honour; the page number itself is saved by the student with the bookmark button, because a browser tab showing a PDF cannot report which page is visible.

**Deploy:** `wrangler d1 execute smart21brain-db --file=./institution-schema.sql --remote` (safe to re-run; it creates the new table) then `wrangler deploy`.


---

## Notification channels: e-mail, SMS and push

Every notice still appears in the 🔔 bell. When the server has a provider configured, the same notice is also queued (`ins_outbox`) and delivered by e-mail, SMS and/or web push. Code: `src/lib/institution-channels.js` (sending), `src/handlers/institution/channels.js` (settings screen API), `js/institution/extras.js` (screen, push subscription), `institution-sw.js` (shows the push).

**Who decides what is sent** (all must agree, otherwise the row is marked *skipped* with the reason): the server has the provider → the institution switch is on (*Notifications → For the institution*) → the person has not turned the channel off (*Notifications → How I get notified*) → an address exists (e-mail of the login, phone from the student/staff record or the one the person typed, a device that allowed push).

* **SMS costs money**, so by default it is only used for overdue, security and academic notices and for "your reserved book is ready"; the institution switch for SMS is **off until an administrator switches it on**.
* Sending starts right after the request that created the notice and is repeated by the every-minute cron (retries up to 3 times; a device the push service reports as gone is forgotten).
* **Push carries no message text.** The server sends an empty push; the service worker then reads the person's newest unread notice using their own signed-in session. Push endpoints are only accepted from the real push services (Google, Mozilla, Microsoft, Apple).
* Each person can press **Send me a test** per channel (5 per 10 minutes). Administrators see 7-day totals and the reasons for failed or skipped notices.

**Set-up (all secrets; nothing is stored in the code or the database):**

| Channel | Secrets |
|---|---|
| E-mail (Resend) | `RESEND_API_KEY`, `EMAIL_FROM` (`Name <no-reply@your-domain>`; the domain must be verified at Resend) |
| SMS (Africa's Talking) | `AT_API_KEY`, `AT_USERNAME` (use `sandbox` to test), optional `AT_SENDER_ID` |
| SMS (Twilio, alternative) | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM`; optional `SMS_PROVIDER` to choose when both are set |
| Push | run `node scripts/generate-vapid.mjs`, then `wrangler secret put VAPID_PRIVATE_JWK` (paste the JSON), optional `VAPID_SUBJECT` (`mailto:you@your-domain`) |
| All | `SITE_URL` (so e-mails can link to the app), optional `SMS_DEFAULT_COUNTRY_CODE` (default `255`: 0712… becomes +255712…) |

Run `wrangler secret put NAME` for each, then deploy. On iPhone/iPad web push only works after the app is added to the Home Screen.

## Student document attachments

On a student's page (administrators / anyone with *Add, edit & delete student records*): **Attach document** — type (birth certificate, ID, transcript, certificate, medical letter, recommendation, application form, other), title, file. PDF, Word, Excel, PowerPoint, TXT, PNG, JPG; the real file content must match the extension; same size limit as the e-library; up to 20 per student. Files are in the private R2 bucket under random keys with no public URL. **Who can open them:** people with student-management rights, and the student themselves (read only, in *My profile*). Teachers, librarians and other students get "not found". Every upload, opening and deletion is in the audit log. Documents are part of the backup (records and files).

## Camera scanning

A camera button sits beside the copy-number box when issuing a book, and **Quick return** has a camera button that stays open so a pile of books can be returned one after another (each result is listed). Barcodes (Code 128, Code 39, EAN, UPC, ITF…) and QR codes are read with the browser's built-in detector where it exists, otherwise QR codes with the bundled jsQR library. Every scanner window also has *type the code* and *take a photo* as fallbacks, and a USB/Bluetooth scanner that types the code still works as before. The camera needs HTTPS and the person's permission.

## Offline saving

* **Kept on the device and sent later:** returning a book (quick return, scanner and the return window), saving marks, saving reading progress. A small cloud button with a number appears in the top bar while changes wait; it lists them and shows why the server refused any (*Discard* or *Send now*). They are sent automatically when the connection returns (and every minute while online). Each carries a unique operation id, so if the answer was lost on the way the server recognises the repeat and does not apply it twice (`ins_client_ops`, kept 30 days).
* **Last screen kept for reading offline** (per person and institution): library catalogue, my library, my profile, my results, my reading, marks sheet, the lending list, dashboard. Not kept: student documents, backups, settings, audit, people records. Signing out clears them; if changes are still waiting the person is asked first and the waiting changes stay for their next sign-in.
* Everything else needs a connection and says so.

## Backups now include uploaded files

A backup is still one JSON file of records, plus a small manifest, and the uploaded files (student photos, staff photos, book covers, e-library files and thumbnails, student documents) are copied once each into a private folder of the same bucket (`institution/<id>/backup-files/…`). Later backups reuse existing copies and only copy new files (up to 150 per run, so one run stays within Worker limits; the next backup continues). **Verify** checks the records, that every saved file copy still exists, and tells the administrator when a backup is partial or when a file was already missing. **Restore** (Super Administrator) restores the records, then puts back every lost file in batches (the screen keeps going until finished; files that are already in place are never overwritten). Copies no remaining backup refers to are removed when old backups are pruned. Older backups (made before this update) still verify and restore, records only, and leave the documents table untouched.

*Limits, honestly:* the file copies live in the same R2 bucket as the originals, so they protect against deleted/overwritten files and bad restores but **not against losing the whole bucket** — keep an off-site copy of important files too. The backup JSON can still be downloaded; the file copies cannot be downloaded from the screen.

## Deploy this update

1. `wrangler d1 execute smart21brain-db --file=./institution-schema.sql --remote` (safe to re-run; creates 5 new tables).
2. Add the secrets you want from the table above (none are required; without them nothing changes).
3. `wrangler deploy` (the cron now has two triggers: 02:00 daily for backups and every minute for the notification outbox).

## Tests added

`node --no-warnings tests/channels-docs-backup.test.mjs` (95 checks: each channel with a fake network, VAPID signature verified with the public key, escaping, switches, retries, rate limit, documents permissions for every role and another institution, file backup / verify / restore / batching / cleanup / tampered manifest, older backups, offline replay idempotency) and `node --no-warnings tests/offline-queue.test.mjs` (34 checks of the on-device queue and saved screens). The earlier suites still pass (tenant isolation 9, website 81, renderer 31).
