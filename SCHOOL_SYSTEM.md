# Smart21Brain School System

A multi-tenant school/tuition-center management system built into the
Smart21Brain Cloudflare Worker. Any school can register its own private
workspace and run students, teachers, parents, attendance, fees,
examinations, timetables and reports from it.

## Where things live

```
school-schema.sql            D1 schema for the School System (all sch_* tables)
src/lib/school-auth.js       tenant context, permissions, validation, image upload
src/lib/school-calc.js       pure calculation helpers (grades, fees, attendance %)
src/lib/school-queries.js    shared SQL fragments (fee/attendance columns, class order)
src/handlers/school/         core.js, people.js, academics.js, operations.js,
                              insights.js, demo.js  — the API, grouped by area
school-app.html               the app shell (loads js/school/*.js)
school-login.html             sign in / register a school
school-verify.html            public ID-card QR verification page
school.html                   marketing/landing page for the system
css/school-app.css            all app styling (CSS variables at the top)
js/school/core.js             API client, UI kit (modals, toasts, forms, tables)
js/school/app.js              shell, navigation, router
js/school/*.js                one file per screen (students, fees, exams, …)
videos/school-system-demo.mp4 demo video shown on the home page and school.html
```

## First-time deploy

1. Apply the schema to your D1 database (in addition to `schema.sql`, which
   the rest of the site already needs):
   ```
   wrangler d1 execute smart21brain-db --file=./school-schema.sql --remote
   ```
2. Deploy as usual. `school-schema.sql` is listed in `.assetsignore` so it
   is never served as a public static file — only applied via `wrangler d1
   execute`, the same way `schema.sql` already is.
3. Open `school-login.html`, choose **Register your school**, and you're in.
   Use **Settings → Data & sample data → Load sample data** to explore with
   24 students, 6 teachers, fees, attendance, an examination with results,
   a timetable and announcements already filled in.

## How another school modifies it

- **Branding, grading scale, fee structure, payment methods, roles &
  permissions** are all editable from *Settings* inside the app — no code
  changes needed for a school to make it their own.
- **Code changes** (new report, new field, new screen) only ever touch one
  file per concern: add a route in `src/index.js`, a handler in
  `src/handlers/school/*.js`, and a screen in `js/school/*.js`. There is no
  build step — everything is plain JavaScript loaded directly by
  `school-app.html`.
- **Multi-tenancy** is enforced in `src/lib/school-auth.js` — every
  school-scoped query is filtered by `school_id`, and `secure()` wraps every
  handler with sign-in, tenant and permission checks. A new handler should
  always go through `secure()` rather than reading `env.DB` directly.

## Known limitation to verify after deploying

The video player's chapter list and seek bar rely on HTTP Range requests
(so the browser can jump to a timestamp without downloading the whole
file). Local `wrangler dev` does not return `206 Partial Content` for
static assets, so seeking may not work when testing locally — confirm it
works once deployed, since Cloudflare's production static-asset serving
supports Range requests.

## Download / install the app

The School System is an installable web app (PWA).

```
school-manifest.json     app name, icons, start page (school-app.html)
school-sw.js             tiny service worker, scope "/school-" (never touches /api/*)
js/school-install.js     download buttons + one-time "Download the app" popup
icons/school-*.png       app icons
```

- Any element with the attribute `data-school-install` becomes a download button
  (currently on the home hero, the home School System section, and both CTA rows
  of school.html).
- The popup appears on pages whose `<html>` tag has `data-school-install-popup`
  (school.html, school-login.html, school-app.html). It shows on every visit and after every login; "Not now" only closes it for that visit.
- Chrome/Edge/Android get the native install prompt; iPhone/iPad and Firefox get
  step-by-step instructions. It needs HTTPS (Cloudflare provides this).
