import { makeDb } from './d1shim.mjs';
const SITE = process.env.SITE_ROOT || new URL('../../', import.meta.url).pathname;
const T = await import(SITE + 'src/handlers/teacher.js');
const Q = await import(SITE + 'src/handlers/quizzes.js');
const F = await import(SITE + 'src/handlers/course-feedback.js');
const C = await import(SITE + 'src/handlers/courses.js');
const E = await import(SITE + 'src/lib/teacher-email.js');

const FILES = ['schema.sql', 'course-engine-schema.sql', 'migrations/phase10-teacher-dashboard.sql', 'migrations/phase11-teacher-email.sql'];
function world({ migrate = FILES } = {}) {
  const db = makeDb(migrate, false); const R = db.raw;
  for (const t of ['teacher_email_outbox','quiz_attempts','lesson_progress','course_reviews','announcements','assignments','course_enrollments','course_lessons','course_modules','courses','course_categories','quizzes','sessions','users']) { try { R.exec('DELETE FROM ' + t); } catch {} }
  const U = R.prepare(`INSERT INTO users (id,name,email,role,password_hash,password_salt) VALUES (?,?,?,?,'x','y')`);
  U.run(1, 'Halima Rashid', 'halima@t.com', 'teacher'); U.run(2, 'Other Teacher', 'other@t.com', 'teacher'); U.run(3, 'Admin A', 'admin@t.com', 'admin');
  U.run(4, 'Amina Juma', 'amina@t.com', 'student'); U.run(5, 'Baraka Msuya', 'b@t.com', 'student'); U.run(7, 'No Mail Teacher', '', 'teacher');
  for (const id of [1, 2, 3, 4, 5, 7]) R.prepare(`INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime('now','+1 day'))`).run('tok' + id, id);
  R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free) VALUES (10,'Fractions "Fun" <b>',  'fractions',1,1,2500,0)`).run();
  R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published) VALUES (12,'Theirs','theirs',2,1)`).run();
  for (let i = 1; i <= 2; i++) R.prepare(`INSERT INTO course_lessons (id,course_id,title,content_type,sort_order) VALUES (?,10,?, 'text', ?)`).run(100 + i, 'L' + i, i);
  R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (4,10,'paid','active',datetime('now','-1 days'))`).run();
  R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (5,10,'paid','active',datetime('now','-30 days'))`).run();
  R.prepare(`INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (4,101,1,datetime('now','-1 days'))`).run();
  return { db, R, env: { DB: db } };
}
// fake e-mail provider
const mails = []; let providerStatus = 200;
globalThis.fetch = async (url, init) => { if (String(url).includes('api.resend.com')) { mails.push({ url: String(url), ...JSON.parse(init.body), auth: init.headers.Authorization }); return new Response('{}', { status: providerStatus }); } return new Response('x', { status: 404 }); };
const configured = (w) => ({ ...w.env, RESEND_API_KEY: 'k', EMAIL_FROM: 'Smart21Brain <no-reply@x.com>', SITE_URL: 'https://smart21brain.com' });
const call = async (fn, env, token, { method = 'GET', body, params = {} } = {}) => {
  const headers = {}; if (token) headers.Cookie = 's21_session=' + token; if (body !== undefined) headers['Content-Type'] = 'application/json';
  const url = new URL('http://localhost/x');
  const res = await fn({ request: new Request(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }), env, params, url });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
let fails = 0; const ok = (c, m, x) => { if (!c) { fails++; console.log('FAIL:', m, x !== undefined ? JSON.stringify(x) : ''); } else console.log('pass:', m); };
const rows = (w) => w.R.prepare('SELECT * FROM teacher_email_outbox ORDER BY id').all();

/* ---------- comment e-mails ---------- */
let w = world(); let env = configured(w); mails.length = 0;
let r = await call(F.submitReview, env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 4, comment: 'Great <script>alert(1)</script> course & fun' } });
ok(r.status === 201, 'review accepted', r);
ok(mails.length === 1 && mails[0].to[0] === 'halima@t.com', 'teacher is e-mailed (default: comments on)', mails.map((m) => m.to));
ok(/4-star review/.test(mails[0].subject), 'subject names the rating', mails[0].subject);
ok(mails[0].text.includes('Amina J.') && !mails[0].text.includes('amina@t.com'), "student shown as 'Amina J.', address not leaked");
ok(!mails[0].html.includes('<script>') && mails[0].html.includes('&lt;script&gt;'), 'XSS: student comment is escaped in the HTML e-mail');
ok(!mails[0].html.includes('<b>') || mails[0].html.includes('&lt;b&gt;'), 'XSS: course title escaped');
ok(mails[0].text.includes('https://smart21brain.com/teachers.html#reviews') && mails[0].text.includes('#settings'), 'links to the reviews tab and to the settings');
ok(mails[0].auth === 'Bearer k', 'sent through the site e-mail provider');
ok(rows(w)[0].status === 'sent' && rows(w)[0].sent_at, 'outbox row marked sent');
await call(F.submitReview, env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 4, comment: 'Great <script>alert(1)</script> course & fun' } });
ok(mails.length === 1 && rows(w).length === 1, 'same comment posted again -> NOT e-mailed twice');
await call(F.submitReview, env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 5, comment: 'Updated: even better' } });
ok(mails.length === 2, 'a changed comment IS e-mailed');
await call(F.submitReview, env, 'tok5', { method: 'POST', params: { id: 10 }, body: { rating: 5 } });
ok(mails.length === 2, 'a star rating without a comment sends nothing');

// not configured: review still works, row explains why nothing was sent
w = world(); mails.length = 0;
r = await call(F.submitReview, w.env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 3, comment: 'ok' } });
ok(r.status === 201 && mails.length === 0, 'without e-mail set up the review still succeeds and nothing is sent');
ok(rows(w)[0].status === 'skipped' && /not set up/.test(rows(w)[0].detail), 'row says "skipped: E-mail is not set up on the server"', rows(w)[0]);

// switch off
w = world(); env = configured(w); mails.length = 0;
w.R.prepare('INSERT INTO teacher_settings (user_id,email_on_comments) VALUES (1,0)').run();
await call(F.submitReview, env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 3, comment: 'ok' } });
ok(mails.length === 0 && rows(w).length === 0, 'switch OFF -> nothing queued, nothing sent');
// switched off after queueing, before sending
w = world(); env = { ...configured(w) }; mails.length = 0;
await E.queueCommentEmail(env, { course: { id: 10, title: 'T', instructor_id: 1 }, student: { id: 4, name: 'Amina Juma' }, rating: 5, comment: 'hi' });
w.R.prepare('INSERT INTO teacher_settings (user_id,email_on_comments) VALUES (1,0)').run();
await E.flushTeacherEmails(env);
ok(mails.length === 0 && rows(w)[0].status === 'skipped' && /Turned off/.test(rows(w)[0].detail), 'switch turned off AFTER queueing is respected at send time', rows(w)[0]);
// teacher without an address
w = world(); env = configured(w); mails.length = 0; w.R.prepare("UPDATE courses SET instructor_id = 7 WHERE id = 10").run();
r = await call(F.submitReview, env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 3, comment: 'ok' } });
ok(r.status === 201 && mails.length === 0, 'teacher with no e-mail address: review fine, nothing sent');

// provider failures
w = world(); env = configured(w); mails.length = 0; providerStatus = 500;
await E.queueCommentEmail(env, { course: { id: 10, title: 'T', instructor_id: 1 }, student: { id: 4, name: 'Amina Juma' }, rating: 5, comment: 'hi' });
for (let i = 0; i < 4; i++) await E.flushTeacherEmails(env);
ok(rows(w)[0].status === 'failed' && rows(w)[0].attempts === 3 && mails.length === 3, 'server error: retried 3 times then marked failed (no endless retries)', { s: rows(w)[0].status, a: rows(w)[0].attempts, m: mails.length });
w = world(); env = configured(w); mails.length = 0; providerStatus = 400;
await E.queueCommentEmail(env, { course: { id: 10, title: 'T', instructor_id: 1 }, student: { id: 4, name: 'Amina Juma' }, rating: 5, comment: 'hi' });
await E.flushTeacherEmails(env); await E.flushTeacherEmails(env);
ok(rows(w)[0].status === 'failed' && mails.length === 1, 'rejected message (400): failed straight away, not retried', { m: mails.length });
providerStatus = 200;
// never leaks the key
ok(!JSON.stringify(rows(w)).includes('"k"') && !/Bearer/.test(JSON.stringify(rows(w))), 'secret key never stored in the outbox');

// migration not run: nothing may break
w = world({ migrate: ['schema.sql', 'course-engine-schema.sql', 'migrations/phase10-teacher-dashboard.sql'] }); env = configured(w); mails.length = 0;
r = await call(F.submitReview, env, 'tok4', { method: 'POST', params: { id: 10 }, body: { rating: 3, comment: 'ok' } });
ok(r.status === 201, 'phase11 migration not applied yet: review still succeeds', r);
ok((await E.flushTeacherEmails(env)).sent === 0 && (await E.queueWeeklySummaries(env)) === 0, 'flush / weekly are harmless without the table');
r = await call(T.sendTestEmail, env, 'tok1', { method: 'POST' }); ok(r.status === 200, 'test e-mail still works without the table (audit row is best-effort)', r);

/* ---------- weekly summary ---------- */
w = world(); env = configured(w); mails.length = 0;
w.R.prepare('INSERT INTO teacher_settings (user_id,weekly_summary_email) VALUES (1,1)').run();
w.R.prepare('INSERT INTO teacher_settings (user_id,weekly_summary_email) VALUES (2,0)').run();
w.R.prepare('INSERT INTO teacher_settings (user_id,weekly_summary_email) VALUES (7,1)').run();   // opted in but no courses and no address
w.R.prepare(`INSERT INTO course_reviews (course_id,user_id,rating,comment,created_at) VALUES (10,4,4,'nice',datetime('now','-2 days'))`).run();
w.R.prepare(`INSERT INTO quizzes (id,title,questions,created_by) VALUES (1,'Q','[]',1)`).run();
w.R.prepare(`UPDATE courses SET final_exam_quiz_id = 1 WHERE id = 10`).run();
w.R.prepare(`INSERT INTO quiz_attempts (user_id,quiz_id,score,total) VALUES (4,1,3,4)`).run();
const monday = new Date('2026-10-26T02:00:00Z');
ok(E.isoWeekKey(monday) === '2026-W44' && E.isoWeekKey(new Date('2027-01-01T00:00:00Z')) === '2026-W53' && E.isoWeekKey(new Date('2026-01-01T00:00:00Z')) === '2026-W01', 'ISO week labels are right');
ok((await E.queueWeeklySummaries(env, monday)) === 1, 'exactly one summary queued (only the opted-in teacher who has courses)');
await E.flushTeacherEmails(env);
ok(mails.length === 1 && mails[0].to[0] === 'halima@t.com', 'summary delivered to the right teacher');
const body = mails[0].text;
ok(/New students: 1/.test(body) && /Lessons completed: 1/.test(body) && /Average quiz score: 75%/.test(body) && /New reviews: 1 \(average 4 stars\)/.test(body), 'numbers are right', body);
ok(/TZS 2,500/.test(body) && /Comments waiting for your reply: 1/.test(body) && /need a nudge[^:]*: 1/.test(body), 'revenue, unanswered comments and inactive students are right (Baraka quiet for 30 days)', body);
ok((await E.queueWeeklySummaries(env, monday)) === 0, 'running the Monday job twice does NOT send a second summary');
ok((await E.queueWeeklySummaries(env, new Date('2026-11-02T02:00:00Z'))) === 1, 'next week gets its own summary');
w.R.prepare('UPDATE teacher_settings SET weekly_summary_email = 0 WHERE user_id = 1').run();
mails.length = 0; await E.flushTeacherEmails(env);
ok(mails.length === 0 && rows(w).filter((x) => x.status === 'skipped').length === 1, 'turned off before sending: skipped');

/* ---------- settings + test e-mail ---------- */
w = world(); env = configured(w);
r = await call(T.getSettings, env, 'tok1'); ok(r.data.email_available === true && r.data.email_address === 'halima@t.com', 'settings tell the page e-mail is available + where it goes', r.data);
r = await call(T.getSettings, w.env, 'tok1'); ok(r.data.email_available === false, 'settings say e-mail is NOT available when the server has no provider');
r = await call(T.sendTestEmail, w.env, 'tok1', { method: 'POST' }); ok(r.status === 400 && /not set up/.test(r.data.message), 'test e-mail without provider: clear explanation', r);
mails.length = 0; r = await call(T.sendTestEmail, env, 'tok1', { method: 'POST' }); ok(r.status === 200 && r.data.ok && mails.length === 1 && mails[0].to[0] === 'halima@t.com', 'test e-mail is sent to the teacher themself', r);
r = await call(T.sendTestEmail, env, 'tok1', { method: 'POST' }); ok(r.status === 429 && mails.length === 1, 'a second test within a minute is refused (no spam)', r.status);
r = await call(T.sendTestEmail, env, 'tok7', { method: 'POST' }); ok(r.status === 400 && /no e-mail address/.test(r.data.message), 'account without an address gets a clear message');
r = await call(T.sendTestEmail, env, 'tok4', { method: 'POST' }); ok(r.status === 403, 'students cannot use it');
r = await call(T.sendTestEmail, env, null, { method: 'POST' }); ok(r.status === 401, 'login required');
w = world(); env = configured(w); providerStatus = 500; r = await call(T.sendTestEmail, env, 'tok1', { method: 'POST' }); providerStatus = 200;
ok(r.status === 502 && /did not accept/.test(r.data.message) && !/Bearer|"k"/.test(r.data.message), 'provider error is explained without leaking secrets', r.data);

/* ---------- show profile to parents ---------- */
w = world(); env = w.env;
let list = (await call(C.listCourses, env, null)).data.courses.find((c) => c.id === 10); ok(list.instructor_name === 'Halima Rashid', 'default: teacher name shown');
w.R.prepare('INSERT INTO teacher_settings (user_id,show_profile_to_parents) VALUES (1,0)').run();
list = (await call(C.listCourses, env, null)).data.courses; ok(list.find((c) => c.id === 10).instructor_name === null && list.find((c) => c.id === 12).instructor_name === 'Other Teacher', 'switch OFF hides this teacher in the catalog (others unaffected)');
let one = (await call(C.getCourse, env, null, { params: { id: 'fractions' } })).data.course; ok(one.instructor_name === null && one.instructor_avatar_key == null, 'switch OFF hides name and photo on the course page');
one = (await call(C.getCourse, env, 'tok4', { params: { id: 'fractions' } })).data.course; ok(one.instructor_name === null, 'also hidden from enrolled students');
one = (await call(C.getCourse, env, 'tok1', { params: { id: 'fractions' } })).data.course; ok(one.instructor_name === 'Halima Rashid', 'the teacher still sees their own name');
one = (await call(C.getCourse, env, 'tok3', { params: { id: 'fractions' } })).data.course; ok(one.instructor_name === 'Halima Rashid', 'admin still sees it');
w = world({ migrate: ['schema.sql', 'course-engine-schema.sql'] }); w.R.exec('DROP TABLE IF EXISTS teacher_settings');
list = await call(C.listCourses, w.env, null); ok(list.status === 200, 'catalog still works if the settings table does not exist', list.status);

/* ---------- quiz editing ---------- */
w = world(); env = w.env;
const good = [{ prompt: '1+1?', options: ['1', '2'], correct_index: 1, explanation: 'two' }];
r = await call(Q.createQuiz, env, 'tok1', { method: 'POST', body: { title: 'Maths', questions: good } }); ok(r.status === 201, 'create valid quiz'); const qid = r.data.id;
const bad = [
  [{ prompt: '', options: ['a', 'b'], correct_index: 0 }, /needs text/], [{ prompt: 'q', options: ['a'], correct_index: 0 }, /two answers/],
  [{ prompt: 'q', options: ['a', ''], correct_index: 0 }, /empty answer/], [{ prompt: 'q', options: ['a', 'b'], correct_index: 2 }, /correct/],
  [{ prompt: 'q', options: ['a', 'b'], correct_index: -1 }, /correct/], [{ prompt: 'q', options: ['a', 'b'], correct_index: '1' }, /correct/],
  [{ prompt: 'q', options: Array(9).fill('x'), correct_index: 0 }, /too many/],
];
for (const [q, re] of bad) { const a = await call(Q.createQuiz, env, 'tok1', { method: 'POST', body: { title: 'x', questions: [q] } }); const b = await call(Q.updateQuiz, env, 'tok1', { method: 'PUT', params: { id: qid }, body: { questions: [q] } }); ok(a.status === 400 && b.status === 400 && re.test(a.data.error), 'rejects (create + edit): ' + a.data.error, [a.status, b.status]); }
r = await call(Q.updateQuiz, env, 'tok1', { method: 'PUT', params: { id: qid }, body: { questions: [] } }); ok(r.status === 400, 'editing to ZERO questions is refused (used to be silently ignored)', r.status);
r = await call(Q.createQuiz, env, 'tok1', { method: 'POST', body: { title: '  ', questions: good } }); ok(r.status === 400, 'blank title refused on create');
r = await call(Q.updateQuiz, env, 'tok1', { method: 'PUT', params: { id: qid }, body: { title: ' ' } }); ok(r.status === 400, 'blank title refused on edit');
const q2 = [{ prompt: 'Capital of Tanzania?', options: ['Dodoma', 'Dar es Salaam', 'Arusha', 'Mwanza', 'Tanga'], correct_index: 0, explanation: 'Dodoma' }, ...good];
r = await call(Q.updateQuiz, env, 'tok1', { method: 'PUT', params: { id: qid }, body: { title: 'Maths v2', subject: '', description: 'd', questions: q2 } }); ok(r.status === 200, 'valid edit saved (5 options allowed)');
const saved = w.R.prepare('SELECT * FROM quizzes WHERE id=?').get(qid); ok(saved.title === 'Maths v2' && saved.subject === '' && JSON.parse(saved.questions).length === 2 && JSON.parse(saved.questions)[0].options.length === 5, 'edit stored title, cleared subject, 2 questions, 5 options');
r = await call(Q.updateQuiz, env, 'tok2', { method: 'PUT', params: { id: qid }, body: { title: 'Hack' } }); ok(r.status === 403, 'another teacher cannot edit it');
w.R.prepare(`INSERT INTO course_lessons (id,course_id,title,content_type,quiz_id,sort_order) VALUES (300,10,'Quiz time','quiz',?,9)`).run(qid);
w.R.prepare(`UPDATE courses SET final_exam_quiz_id=? WHERE id=10`).run(qid);
w.R.prepare(`INSERT INTO quiz_attempts (user_id,quiz_id,score,total) VALUES (4,?,1,2)`).run(qid);
r = await call(T.getMyQuiz, env, 'tok1', { params: { id: qid } });
ok(r.status === 200 && r.data.quiz.questions.length === 2 && r.data.quiz.questions[0].correct_index === 0 && r.data.attempts === 1 && r.data.used_in.lessons === 1 && r.data.used_in.final_exams === 1, 'teacher can load the full quiz + attempts + where it is used', r.data.used_in);
r = await call(T.getMyQuiz, env, 'tok2', { params: { id: qid } }); ok(r.status === 403, "another teacher cannot load it");
r = await call(T.getMyQuiz, env, 'tok3', { params: { id: qid } }); ok(r.status === 200, 'admin can');
r = await call(T.getMyQuiz, env, 'tok4', { params: { id: qid } }); ok(r.status === 403, 'student cannot');
r = await call(T.getMyQuiz, env, 'tok1', { params: { id: 99999 } }); ok(r.status === 404, 'missing quiz -> 404');
r = await call(T.myContent, env, 'tok1'); const mine = r.data.quizzes.find((x) => x.id === qid); ok(mine.used_lessons === 1 && mine.used_exams === 1 && mine.attempts === 1, 'content list carries usage so delete can warn', mine);
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASSED'); process.exitCode = fails ? 1 : 0;
