# Teacher dashboard tests

These tests run the REAL code: the real Worker router and handlers on a real SQLite database
(built from schema.sql, course-engine-schema.sql and migrations/phase10-teacher-dashboard.sql),
and the real teachers.html + js/teacher-dashboard.js in a simulated browser (jsdom + real Bootstrap).

    cd tests/teacher-dashboard
    npm install
    npm test          (needs Node 22 or newer)

- teacher.test.mjs, course.test.mjs: API tests (permissions, scoping, validation, deleting a course cleanly).
- email-quiz.test.mjs: teacher e-mails (comment, weekly summary, test button, retries, a missing migration), the profile switch, and quiz validation and editing. A fake e-mail provider records what would be sent.
- flow1/2/3/4.mjs: end-to-end screens (empty account, lessons, students, reviews, uploads, failures, e-mail settings, quiz editing).
