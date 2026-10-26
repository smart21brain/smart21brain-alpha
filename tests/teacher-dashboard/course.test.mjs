import { makeDb } from './d1shim.mjs';
const SITE = process.env.SITE_ROOT || new URL('../../', import.meta.url).pathname;
const C = await import(SITE + 'src/handlers/courses.js');
const L = await import(SITE + 'src/handlers/course-lessons.js');
const M = await import(SITE + 'src/handlers/course-modules.js');
const db = makeDb(['schema.sql', 'course-engine-schema.sql', 'migrations/phase10-teacher-dashboard.sql'], false);
const R = db.raw; const exec = (s, ...b) => R.prepare(s).run(...b);
for (const t of ['quiz_attempts','lesson_progress','course_reviews','announcements','assignments','course_enrollments','course_lessons','course_modules','courses','course_categories','quizzes','sessions','users']) { try { R.exec('DELETE FROM '+t); } catch {} }
for (const [id, name, role] of [[1,'T1','teacher'],[2,'T2','teacher'],[4,'Stu','student']]) exec(`INSERT INTO users (id,name,email,role,password_hash,password_salt) VALUES (?,?,?,?,'x','y')`, id, name, `u${id}@t.com`, role);
for (const id of [1,2,4]) exec(`INSERT INTO sessions (token,user_id,expires_at) VALUES (?,?,datetime('now','+1 day'))`, 'tok' + id, id);
exec(`INSERT INTO course_categories (id,name,slug) VALUES (1,'Maths','maths')`);
const env = { DB: db };
const call = async (fn, token, { method = 'GET', body, params = {} } = {}) => {
  const headers = {}; if (token) headers.Cookie = 's21_session=' + token; if (body !== undefined) headers['Content-Type'] = 'application/json';
  const url = new URL('http://localhost/x');
  try {
    const res = await fn({ request: new Request(url, { method, headers, body: body !== undefined ? JSON.stringify(body) : undefined }), env, params, url });
    let data = null; try { data = await res.json(); } catch {}
    return { status: res.status, data };
  } catch (e) { return { status: 'THROW', data: String(e.message) }; }
};
let fails = 0; const ok = (c, m, x) => { if (!c) { fails++; console.log('FAIL:', m, x !== undefined ? JSON.stringify(x) : ''); } else console.log('pass:', m); };

let r = await call(C.createCourse, 'tok1', { method: 'POST', body: { title: 'Algebra', category_id: 1, age_range: '10-12', price: -500, passing_score: 250, final_exam_passing_score: 'abc', published: false } });
ok(r.status === 201, 'create course', r); const cid = r.data.id;
let row = R.prepare('SELECT * FROM courses WHERE id=?').get(cid);
ok(row.price === 0 && row.is_free === 1, 'negative price clamped to 0 / free', [row.price, row.is_free]);
ok(row.passing_score === 100 && row.final_exam_passing_score === 70, 'percent values clamped', [row.passing_score, row.final_exam_passing_score]);
ok(row.published === 0, 'created as draft');
r = await call(C.createCourse, 'tok4', { method: 'POST', body: { title: 'x' } }); ok(r.status === 403, 'student cannot create course', r.status);

r = await call(C.updateCourse, 'tok1', { method: 'PUT', params: { id: cid }, body: { category_id: null, age_range: null, title: 'Algebra 2' } });
row = R.prepare('SELECT * FROM courses WHERE id=?').get(cid);
ok(r.status === 200 && row.category_id === null && row.age_range === null && row.title === 'Algebra 2', 'update can CLEAR category and age range', row);
r = await call(C.updateCourse, 'tok1', { method: 'PUT', params: { id: cid }, body: { published: true } });
row = R.prepare('SELECT * FROM courses WHERE id=?').get(cid);
ok(row.published === 1 && row.title === 'Algebra 2', 'publish toggle keeps other fields', row.title);
r = await call(C.updateCourse, 'tok1', { method: 'PUT', params: { id: cid }, body: { title: '   ' } }); ok(r.status === 400, 'blank title rejected', r.status);
r = await call(C.updateCourse, 'tok2', { method: 'PUT', params: { id: cid }, body: { title: 'Hacked' } }); ok(r.status === 403, "other teacher cannot edit", r.status);
r = await call(C.updateCourse, 'tok1', { method: 'PUT', params: { id: cid }, body: { final_exam_passing_score: 85, price: 2500 } });
row = R.prepare('SELECT * FROM courses WHERE id=?').get(cid); ok(row.final_exam_passing_score === 85 && row.price === 2500 && row.is_free === 0, 'exam pass mark + paid price saved', row);

// modules
r = await call(M.createModule, 'tok1', { method: 'POST', params: { id: cid }, body: { title: 'Week 1' } }); ok(r.status === 201, 'module created', r); const m1 = r.data.id;
r = await call(M.createModule, 'tok1', { method: 'POST', params: { id: cid }, body: { title: 'Week 1' } }); ok(r.status === 400 && /module/.test(r.data.error), 'duplicate module name -> friendly 400', r);
r = await call(M.createModule, 'tok1', { method: 'POST', params: { id: cid }, body: { title: 'Week 2' } }); const m2 = r.data.id;
r = await call(M.updateModule, 'tok1', { method: 'PUT', params: { moduleId: m2 }, body: { title: 'Week 1' } }); ok(r.status === 400, 'rename to duplicate -> 400', r.status);
r = await call(M.updateModule, 'tok1', { method: 'PUT', params: { moduleId: m2 }, body: { title: 'Week Two' } }); ok(r.status === 200, 'rename module', r.status);
r = await call(M.updateModule, 'tok1', { method: 'PUT', params: { moduleId: m2 }, body: { title: ' ' } }); ok(r.status === 400, 'blank module name rejected');
r = await call(M.updateModule, 'tok2', { method: 'PUT', params: { moduleId: m2 }, body: { title: 'Hack' } }); ok(r.status === 403, 'other teacher cannot rename module');

// lessons
const ids = [];
for (const t of ['A', 'B', 'C']) { r = await call(L.createLesson, 'tok1', { method: 'POST', params: { id: cid }, body: { title: t, content_type: 'text', body: 'x', module_id: m1 } }); ids.push(r.data.id); }
r = await call(L.createLesson, 'tok1', { method: 'POST', params: { id: cid }, body: { title: 'A', content_type: 'text', body: 'x' } }); ok(r.status === 400 && /already has a lesson/.test(r.data.error), 'duplicate lesson title -> friendly 400', r);
await call(L.deleteLesson, 'tok1', { method: 'DELETE', params: { id: cid, lessonId: ids[1] } });
r = await call(L.createLesson, 'tok1', { method: 'POST', params: { id: cid }, body: { title: 'D', content_type: 'text', body: 'x' } });
const orders = R.prepare('SELECT sort_order FROM course_lessons WHERE course_id=? ORDER BY sort_order').all(cid).map((x) => x.sort_order);
ok(new Set(orders).size === orders.length, 'no duplicate sort_order after a delete in the middle', orders);
r = await call(L.updateLesson, 'tok1', { method: 'PUT', params: { id: cid, lessonId: ids[0] }, body: { title: 'C' } }); ok(r.status === 400, 'rename lesson to existing title -> 400', r.status);
r = await call(L.updateLesson, 'tok1', { method: 'PUT', params: { id: cid, lessonId: ids[0] }, body: { title: 'A edited', body: 'new text', module_id: m2, is_preview: true, duration_seconds: 300 } });
row = R.prepare('SELECT * FROM course_lessons WHERE id=?').get(ids[0]); ok(r.status === 200 && row.title === 'A edited' && row.module_id === m2 && row.is_preview === 1, 'edit lesson + move to another module', row);
r = await call(L.updateLesson, 'tok1', { method: 'PUT', params: { id: cid, lessonId: ids[0] }, body: { module_id: null } }); row = R.prepare('SELECT module_id FROM course_lessons WHERE id=?').get(ids[0]); ok(row.module_id === null, 'lesson can be ungrouped');
r = await call(L.updateLesson, 'tok1', { method: 'PUT', params: { id: cid, lessonId: ids[0] }, body: { title: '' } }); ok(r.status === 400, 'blank lesson title rejected');
r = await call(L.updateLesson, 'tok2', { method: 'PUT', params: { id: cid, lessonId: ids[0] }, body: { title: 'x' } }); ok(r.status === 403, 'other teacher cannot edit lesson');
r = await call(M.deleteModule, 'tok1', { method: 'DELETE', params: { moduleId: m1 } }); ok(r.status === 200, 'module delete', r.status);
ok(R.prepare('SELECT COUNT(*) n FROM course_lessons WHERE course_id=? AND module_id IS NOT NULL AND module_id=?').get(cid, m1).n === 0, 'lessons ungrouped after module delete');

// delete a course that has everything attached
exec(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status) VALUES (4,?, 'paid','active')`, cid);
exec(`INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (4,?,1,datetime('now'))`, ids[0]);
exec(`INSERT INTO course_reviews (course_id,user_id,rating,comment) VALUES (?,4,5,'ok')`, cid);
exec(`INSERT INTO assignments (course_id,teacher_id,title) VALUES (?,1,'HW')`, cid);
exec(`INSERT INTO announcements (teacher_id,course_id,body) VALUES (1,?,'hi')`, cid);
r = await call(C.deleteCourse, 'tok2', { method: 'DELETE', params: { id: cid } }); ok(r.status === 403, 'other teacher cannot delete course');
r = await call(C.deleteCourse, 'tok1', { method: 'DELETE', params: { id: cid } });
ok(r.status === 200, 'delete course with enrollments, progress, reviews, assignments, announcements', r);
for (const t of ['course_lessons','course_modules','course_enrollments','course_reviews','assignments','announcements']) ok(R.prepare(`SELECT COUNT(*) n FROM ${t}`).get().n === 0, `no orphan rows left in ${t}`);
console.log(fails ? `\n${fails} FAILURE(S)` : '\nALL PASSED');
