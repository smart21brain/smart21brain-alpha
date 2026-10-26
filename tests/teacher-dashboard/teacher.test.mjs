import { makeDb } from './d1shim.mjs';
const SITE = process.env.SITE_ROOT || new URL('../../', import.meta.url).pathname;
const T = await import(SITE + 'src/handlers/teacher.js');
const db = makeDb(['schema.sql', 'course-engine-schema.sql', 'migrations/phase10-teacher-dashboard.sql'], false);
const R = db.raw;
const exec = (s, ...b) => R.prepare(s).run(...b);
for (const t of ['quiz_attempts','lesson_progress','course_reviews','announcements','assignments','course_enrollments','course_lessons','course_modules','courses','course_categories','quizzes','videos','materials','sessions','users']) { try { R.exec('DELETE FROM '+t); } catch (e) {} }
// users
for (const [id, name, role] of [[1,'Teacher One','teacher'],[2,'Teacher Two','teacher'],[3,'Admin A','admin'],[4,'Amina Juma','student'],[5,'Baraka Msuya','student'],[6,'Chausiku','student'],[7,'Empty Teacher','teacher']])
  exec(`INSERT INTO users (id,name,email,role,password_hash,password_salt) VALUES (?,?,?,?,'x','y')`, id, name, `u${id}@t.com`, role);
for (const id of [1,2,3,4,7]) exec(`INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime('now','+1 day'))`, 'tok' + id, id);
exec(`INSERT INTO course_categories (id,name,slug) VALUES (1,'Maths','maths')`);
// courses: 10,11 teacher1 ; 12 teacher2
exec(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free,category_id,objectives,final_exam_passing_score) VALUES (10,'Fractions','fractions',1,1,0,1,1,'["a","b"]',85)`);
exec(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free) VALUES (11,'Draft Course','draft',1,0,5000,0)`);
exec(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free) VALUES (12,'Other Teacher','other',2,1,0,1)`);
for (let i = 1; i <= 4; i++) exec(`INSERT INTO course_lessons (id,course_id,title,content_type,sort_order) VALUES (?,?,?,?,?)`, 100 + i, 10, 'L' + i, 'text', i);
exec(`INSERT INTO course_lessons (id,course_id,title,content_type,sort_order) VALUES (200,12,'X','text',1)`);
exec(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (4,10,'paid','active',datetime('now','-20 days'))`);
exec(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (5,10,'paid','active',datetime('now','-1 days'))`);
exec(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (6,11,'pending','active',datetime('now','-2 days'))`);
exec(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (4,12,'paid','active',datetime('now','-2 days'))`);
exec(`INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (5,101,1,datetime('now'))`);
exec(`INSERT INTO course_reviews (course_id,user_id,rating,comment) VALUES (10,4,5,'Great!')`);
exec(`INSERT INTO course_reviews (course_id,user_id,rating,comment) VALUES (12,4,1,'other teachers review')`);
exec(`INSERT INTO quizzes (id,title,questions,created_by) VALUES (1,'Q1','[{"prompt":"p","options":["a","b"],"correct_index":0}]',1)`);
exec(`INSERT INTO quizzes (id,title,questions,created_by) VALUES (2,'Q2 other','[]',2)`);
exec('UPDATE courses SET final_exam_quiz_id=1 WHERE id=10'); exec('INSERT INTO quiz_attempts (user_id,quiz_id,score,total) VALUES (3,1,0,4)'); exec(`INSERT INTO quiz_attempts (user_id,quiz_id,score,total) VALUES (4,1,3,4)`);

const env = { DB: db };
const call = async (fn, token, { method = 'GET', body, params = {}, path = '/x' } = {}) => {
  const headers = {}; if (token) headers.Cookie = 's21_session=' + token;
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const url = new URL('http://localhost' + path);
  const request = new Request(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined });
  const res = await fn({ request, env, params, url });
  let data = null; try { data = await res.json(); } catch {}
  return { status: res.status, data };
};
let fails = 0;
const ok = (cond, msg, extra) => { if (!cond) { fails++; console.log('FAIL:', msg, extra !== undefined ? JSON.stringify(extra) : ''); } else console.log('pass:', msg); };

let r = await call(T.overview, 'tok1');
ok(r.status === 200 && r.data.published_courses === 1 && r.data.draft_courses === 1, 'overview counts own courses', r.data);
ok(r.data.enrolled_students === 3, 'overview students = 3 (4,5,6) not the other teacher\'s', r.data.enrolled_students);
ok(r.data.review_count === 1 && r.data.average_rating === 5, 'overview only own reviews', r.data);
ok(r.data.avg_quiz_score === 75, 'quiz avg', r.data.avg_quiz_score);
r = await call(T.overview, 'tok7');
ok(r.status === 200 && r.data.published_courses === 0 && r.data.enrolled_students === 0, 'overview works with zero courses', r.data);
r = await call(T.overview, null); ok(r.status === 401, 'overview needs login', r.status);
r = await call(T.overview, 'tok4'); ok(r.status === 403, 'students are blocked', r.status);
r = await call(T.overview, 'tok3'); ok(r.status === 200 && r.data.published_courses === 2, 'admin sees all', r.data.published_courses);

r = await call(T.listMyCourses, 'tok1');
ok(r.data.courses.length === 2, 'my courses = 2', r.data.courses.length);
const c10 = r.data.courses.find((c) => c.id === 10);
ok(c10 && c10.final_exam_passing_score === 85, 'courses list returns final_exam_passing_score (so edit does not reset it)', c10 && c10.final_exam_passing_score);
ok(c10 && Array.isArray(c10.objectives) && c10.objectives.length === 2, 'objectives parsed');
r = await call(T.listMyCourses, 'tok7'); ok(r.status === 200 && r.data.courses.length === 0, 'empty course list ok');

r = await call(T.listStudents, 'tok1', { path: '/x?attention=1' });
ok(r.status === 200, 'students attention ok', r.status);
r = await call(T.listStudents, 'tok1', { path: '/x' });
ok(r.data.students.length === 3, 'students all = 3', r.data.students.length);
ok(r.data.students.every((s) => s.course_id !== 12), 'no student rows from other teachers');
const amina = r.data.students.find((s) => s.name.startsWith('Amina') && s.course_id === 10);
ok(amina && amina.needs_attention === true && amina.days_inactive >= 19, 'inactive student flagged', amina);
ok(r.data.students.find((s) => s.course_id === 11).needs_attention === false, 'pending-payment student not flagged');

r = await call(T.listReviews, 'tok1'); ok(r.data.reviews.length === 1 && r.data.reviews[0].student_name === 'Amina J.', 'reviews scoped + short name', r.data.reviews.map((x) => x.student_name));
const rid = r.data.reviews[0].id;
r = await call(T.replyToReview, 'tok2', { method: 'POST', params: { id: rid }, body: { reply: 'hi' } }); ok(r.status === 403, 'other teacher cannot reply', r.status);
r = await call(T.replyToReview, 'tok1', { method: 'POST', params: { id: rid }, body: { reply: '' } }); ok(r.status === 400, 'empty reply rejected', r.status);
r = await call(T.replyToReview, 'tok1', { method: 'POST', params: { id: rid }, body: { reply: 'Thank you!' } }); ok(r.status === 200, 'reply saved', r);
r = await call(T.replyToReview, 'tok1', { method: 'POST', params: { id: 9999 }, body: { reply: 'x' } }); ok(r.status === 404, 'reply to missing review 404', r.status);

r = await call(T.createAnnouncement, 'tok1', { method: 'POST', body: { body: 'Class moved', course_id: 10 } }); ok(r.status === 201, 'announce create', r);
const annId = r.data.id;
r = await call(T.createAnnouncement, 'tok1', { method: 'POST', body: { body: 'x', course_id: 12 } }); ok(r.status === 403, 'announce to foreign course blocked', r.status);
r = await call(T.createAnnouncement, 'tok1', { method: 'POST', body: { body: '   ' } }); ok(r.status === 400, 'blank announcement blocked', r.status);
r = await call(T.listAnnouncements, 'tok1'); ok(r.data.announcements.length === 1 && r.data.announcements[0].course_title === 'Fractions', 'announcement list', r.data);
r = await call(T.deleteAnnouncement, 'tok2', { method: 'DELETE', params: { id: annId } }); ok(r.status === 403, 'foreign announcement delete blocked', r.status);
r = await call(T.deleteAnnouncement, 'tok1', { method: 'DELETE', params: { id: annId } }); ok(r.status === 200, 'announcement deleted', r.status);

r = await call(T.createAssignment, 'tok1', { method: 'POST', body: { course_id: 10, title: 'HW1', due_date: '2026-11-30', instructions: 'Do it' } }); ok(r.status === 201, 'assignment create', r);
const asgId = r.data.id;
r = await call(T.createAssignment, 'tok1', { method: 'POST', body: { course_id: 10, title: 'HW', due_date: '30/11/2026' } }); ok(r.status === 400, 'bad due date blocked', r.status);
r = await call(T.createAssignment, 'tok1', { method: 'POST', body: { course_id: 12, title: 'HW' } }); ok(r.status === 403, 'foreign course assignment blocked', r.status);
r = await call(T.listAssignments, 'tok1'); ok(r.data.assignments.length === 1, 'assignment list', r.data);
r = await call(T.deleteAssignment, 'tok2', { method: 'DELETE', params: { id: asgId } }); ok(r.status === 403, 'foreign assignment delete blocked', r.status);
r = await call(T.deleteAssignment, 'tok1', { method: 'DELETE', params: { id: asgId } }); ok(r.status === 200, 'assignment deleted');

r = await call(T.getSettings, 'tok1'); ok(r.data.settings.email_on_comments === true && r.data.settings.weekly_summary_email === false, 'settings defaults', r.data);
r = await call(T.updateSettings, 'tok1', { method: 'PUT', body: { weekly_summary_email: true } }); ok(r.status === 200, 'settings update');
r = await call(T.getSettings, 'tok1'); ok(r.data.settings.weekly_summary_email === true && r.data.settings.email_on_comments === true, 'settings persisted without clobbering others', r.data);

r = await call(T.myContent, 'tok1'); ok(r.status === 200 && r.data.quizzes.length === 1 && r.data.quizzes[0].question_count === 1, 'my content scoped', r.data.quizzes);
r = await call(T.myContent, 'tok3'); ok(r.data.quizzes.length === 2, 'admin sees all content');
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASSED');
