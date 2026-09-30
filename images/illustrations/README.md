# AI Illustration Set — 20 pieces

This folder is where the 20-piece "premium 3D educational technology"
illustration set goes. The site is already wired to pick each one up
automatically — drop a file in with the exact name below and refresh the
page; nothing else needs to change.

**I can't generate these myself** — this environment doesn't have an
image-generation tool available, so the actual rendering has to happen in
whatever tool you use (Midjourney, DALL·E, Ideogram, etc.) using the master
style + per-scene prompts below. Once you have a PNG, save it here with the
matching filename (1600×900 or larger, 16:9, PNG or JPG — just fix the
extension in the filename to match what you save).

## Master style prefix

Prepend this to every one of the 20 prompts below:

> Premium realistic 3D educational technology illustration for one unified
> modern education website, consistent visual identity across the entire
> website, sophisticated 3D UI/UX design, realistic physical objects
> combined with floating digital interface elements, rounded glassmorphism
> cards, soft bevelled edges, elegant blue, purple, cyan and subtle pink
> gradients, realistic glass and polished materials, cinematic studio
> lighting, soft shadows, subtle reflections, clean organized composition,
> professional SaaS dashboard aesthetic, futuristic but believable,
> high-end commercial 3D render, strong depth and dimensionality, minimal
> text, no unnecessary words, no watermark, no logos, no stock-photo
> appearance, ultra detailed, 4K quality, 16:9 aspect ratio.

## Consistency line

Append this to every one of the 20 prompts too, so they read as one series
instead of 20 unrelated renders:

> This image must look like part of the same visual series as the other
> education website illustrations: identical rendering quality, identical
> color language, identical rounded UI design system, consistent lighting,
> consistent glassmorphism treatment, consistent blue-purple-cyan gradient
> palette, consistent realistic 3D materials and consistent premium
> educational technology aesthetic.

## The 20 scenes

| # | Filename | Scene | Used on | Wired now? |
|---|----------|-------|---------|:---:|
| 01 | `01-online-learning-platform.png` | Central laptop, floating course cards, lesson modules, progress indicators, certificates | `index.html` hero | ✅ |
| 02 | `02-student-dashboard.png` | Courses in progress, grades, assignments, attendance around a desktop screen | `dashboard.html` welcome banner | ✅ |
| 03 | `03-virtual-classroom.png` | Teacher presenting to video panels, floating whiteboard, chat panel | — | — |
| 04 | `04-digital-library.png` | Glowing tablet, floating book covers, search/categories/bookmarks | `library.html` | — |
| 05 | `05-online-courses.png` | Floating course cards around a laptop — math, science, programming, business, languages | `courses.html` hero | ✅ |
| 06 | `06-elearning-video.png` | Video lesson interface, timeline, chapters, subtitles, progress | `video.html` / `course.html` | — |
| 07 | `07-online-examination.png` | Digital test on a laptop, countdown timer, answer cards | `quiz.html` | — |
| 08 | `08-student-assessment.png` | Grades, performance charts, achievement badges | `profile.html` | — |
| 09 | `09-certificates-achievements.png` | Graduation certificate, badge, medal, graduation cap | `profile.html` achievements section | — |
| 10 | `10-teacher-dashboard.png` | Students, classes, grading, attendance, lesson planning | `teachers.html` welcome banner | ✅ |
| 11 | `11-course-creation.png` | Course builder: video editor, slides, quiz builder, timeline | — (no instructor-tools page yet) | — |
| 12 | `12-education-analytics.png` | Performance, completion, attendance, engagement charts | `admin.html` | — |
| 13 | `13-ai-learning-assistant.png` | Friendly AI interface, Q&A cards, personalized recommendations | — | — |
| 14 | `14-coding-education.png` | Code editor, terminal, debugging interface, coding exercises | `subjects.html` (Computer Studies) | — |
| 15 | `15-mathematics-learning.png` | Equations, geometric shapes, graphs, calculator | `subjects.html` (Mathematics) | — |
| 16 | `16-science-education.png` | Microscope, test tubes, molecular models, lab charts | `subjects.html` (Science) | — |
| 17 | `17-language-learning.png` | Vocabulary lessons, pronunciation UI, conversation cards | `subjects.html` (Languages) | — |
| 18 | `18-educational-community.png` | Student avatars, discussion panels, group projects, video calls | `parents.html` or `blog.html` | — |
| 19 | `19-learning-progress.png` | Glowing progression pathway, milestones, achievement badges | `index.html` (secondary section) | — |
| 20 | `20-graduation-success.png` | Graduate beside a dashboard, diploma, success stats | `pricing.html` final CTA | — |

Rows marked ✅ are already wired into the site (they render the on-brand
gradient placeholder until you drop the real file in — nothing looks
broken in the meantime). The rest are documented here so you (or I, in a
future session) can wire them into their target page the same way once
they exist — the pattern is always:

```html
<div class="ai-illustration" data-illustration="05-online-courses" data-illustration-alt="Description for screen readers">
  <div class="ai-illustration-placeholder">
    <i class="fa-solid fa-graduation-cap"></i>
    <span>Online Courses</span>
  </div>
</div>
```
