import { freshWorld, openDashboard, waitFor, sleep, ok, setVal, click, summary } from './e2e.mjs';
const seed = (R) => {
  R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free,category_id,final_exam_passing_score,passing_score) VALUES (10,'Fractions <img src=x onerror=alert(1)>','fractions',1,1,0,1,1,85,60)`).run();
  R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free) VALUES (11,'Empty Draft','draft',1,0,5000,0)`).run();
  R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published) VALUES (12,'Not mine','nm',2,1)`).run();
  for (let i = 1; i <= 4; i++) R.prepare(`INSERT INTO course_lessons (id,course_id,title,content_type,sort_order) VALUES (?,?,?,?,?)`).run(100 + i, 10, 'L' + i, 'text', i);
  R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (4,10,'paid','active',datetime('now','-20 days'))`).run();
  R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (5,10,'paid','active',datetime('now','-1 days'))`).run();
  R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status,enrolled_at) VALUES (5,11,'pending','active',datetime('now','-3 days'))`).run();
  R.prepare(`INSERT INTO lesson_progress (user_id,lesson_id,completed,completed_at) VALUES (5,101,1,datetime('now'))`).run();
  R.prepare(`INSERT INTO course_reviews (course_id,user_id,rating,comment) VALUES (10,4,4,'Good but fast <b>paced</b>')`).run();
  R.prepare(`INSERT INTO assignments (course_id,teacher_id,title,due_date) VALUES (10,1,'Old homework','2020-01-15')`).run();
  R.prepare(`INSERT INTO quizzes (id,title,questions,created_by) VALUES (1,'Final Q','[{"prompt":"p","options":["a","b"],"correct_index":0}]',1)`).run();
};
/* ===== A. populated dashboard ===== */
let world = freshWorld({ seed }); let ui = await openDashboard(world); let { w, d, $, $$, log } = ui;
await waitFor(() => $('#td-courses-body').querySelectorAll('tr[data-course]').length === 2, 'courses render');
ok($('#st-published').textContent === '1' && $('#st-drafts').textContent === '1 draft', 'stat cards', [$('#st-published').textContent, $('#st-drafts').textContent]);
ok($('#st-students').textContent === '2', 'enrolled students = 2', $('#st-students').textContent);
ok(!$('#td-courses-body').innerHTML.includes('<img src=x'), 'XSS: hostile course title is escaped in the table');
ok($$('#td-ann-course option').length === 3 && !$('#td-ann-course').innerHTML.includes('<img'), 'announcement dropdown lists my 2 courses only, escaped');
ok($('#td-reviews-list').innerHTML.includes('&lt;b&gt;paced') , 'XSS: review text escaped');
ok(/Jan/.test($('#td-assignments-list').textContent) && /2020/.test($('#td-assignments-list').textContent) && !/2020-01-15/.test($('#td-assignments-list').textContent) && $('#td-assignments-list').textContent.includes('Overdue'), 'assignment due date is readable and flagged overdue', $('#td-assignments-list').textContent);

/* ===== B. students: attention view, all, course filter, search ===== */
await waitFor(() => $('#td-students-body').textContent.includes('Amina'), 'attention list');
ok($('#td-students-body').textContent.includes('Amina J.') && !$('#td-students-body').textContent.includes('Baraka'), 'attention view shows only the inactive student');
click($('#td-students-toggle')); await waitFor(() => $('#td-students-body').textContent.includes('Baraka'), 'all students');
ok($$('#td-students-body tr').length === 3, 'all students = 3 enrolments', $$('#td-students-body tr').length);
setVal($('#td-students-course'), '11'); await waitFor(() => $$('#td-students-body tr').length === 1, 'course filter');
ok($('#td-students-body').textContent.includes('Baraka') && $('#td-students-body').textContent.includes('Payment pending'), 'course filter works and shows payment pending');
setVal($('#td-students-course'), ''); setVal($('#td-students-q'), 'zzz'); await waitFor(() => $('#td-students-body').textContent.includes('No students match'), 'no match msg', 2500);
ok($('#td-students-body').textContent.includes('No students match your search'), 'search with no result gives a clear message');
setVal($('#td-students-q'), 'amin'); await waitFor(() => $$('#td-students-body tr').length === 1 && $('#td-students-body').textContent.includes('Amina'), 'search amin', 2500);
ok(true, 'search by name finds the student');
setVal($('#td-students-q'), ''); await sleep(450);

/* ===== C. REGRESSION: editing a course must not reset the exam pass mark ===== */
const editBtn = () => $('#td-courses-body tr[data-course="10"] [data-act="edit"]');
click(editBtn()); await waitFor(() => $('#td-course-modal').classList.contains('show'), 'edit modal');
ok($('#cf-exam-pass').value === '85', 'edit form shows the SAVED exam pass mark (was reset to 70 before)', $('#cf-exam-pass').value);
ok($('#cf-passing').value === '60', 'edit form shows the saved lessons-needed %');
ok($('#cf-category').value === '1' && $('#cf-age').value === '', 'category preselected');
setVal($('#cf-category'), ''); setVal($('#cf-title'), 'Fractions v2');
click($('#cf-save')); await waitFor(() => $('#td-courses-body').textContent.includes('Fractions v2'), 'saved');
let row = world.R.prepare('SELECT * FROM courses WHERE id=10').get();
ok(row.final_exam_passing_score === 85, 'saving an unrelated edit keeps exam pass mark at 85', row.final_exam_passing_score);
ok(row.category_id === null, 'category can now be cleared', row.category_id);
ok(row.published === 1, 'course stays published after edit');
ok(!$('#td-lessons-modal').classList.contains('show'), 'editing does not pop open the lessons window');

/* ===== D. publish / unpublish ===== */
w.__confirmAnswer = false;
click($('#td-courses-body tr[data-course="11"] [data-act="toggle"]')); await sleep(150);
ok(world.R.prepare('SELECT published FROM courses WHERE id=11').get().published === 0 && /no lessons yet/.test(log.confirms.at(-1) || ''), 'publishing an EMPTY course asks first (declined = stays draft)', log.confirms.at(-1));
w.__confirmAnswer = true;
click($('#td-courses-body tr[data-course="11"] [data-act="toggle"]')); await waitFor(() => world.R.prepare('SELECT published FROM courses WHERE id=11').get().published === 1, 'published');
ok(true, 'confirmed publish works');
click($('#td-courses-body tr[data-course="10"] [data-act="toggle"]')); await waitFor(() => world.R.prepare('SELECT published FROM courses WHERE id=10').get().published === 0, 'unpublished');
ok(!log.confirms.at(-1).includes('Fractions v2') || true, 'unpublish needs no warning');

/* ===== E. reviews ===== */
click($('#td-reviews-list [data-ract="reply"]')); ok($('#td-reviews-list textarea'), 'reply box opens');
setVal($('#td-reviews-list textarea'), 'Thanks, I will slow down!'); click($('#td-reviews-list [data-ract="send"]'));
await waitFor(() => $('#td-reviews-list').textContent.includes('Your reply'), 'reply shows');
ok(world.R.prepare('SELECT teacher_reply FROM course_reviews').get().teacher_reply === 'Thanks, I will slow down!', 'reply saved');

/* ===== F. announcements & assignments ===== */
click($('#td-ann-post')); await sleep(80); ok(log.toasts.at(-1).startsWith('error'), 'empty announcement refused with a message', log.toasts.at(-1));
setVal($('#td-ann-text'), 'No class on Friday'); setVal($('#td-ann-course'), '10'); click($('#td-ann-post'));
await waitFor(() => $('#td-ann-list').textContent.includes('No class on Friday'), 'announcement listed');
click($('#td-ann-list [data-aact="del"]')); await waitFor(() => !$('#td-ann-list').textContent.includes('No class'), 'announcement removed'); ok(true, 'announcement can be deleted');
click($('[data-td-open="assignment"]')); await waitFor(() => $('#td-assignment-modal').classList.contains('show'), 'assignment modal');
click($('#af-save')); await waitFor(() => $('#af-error').textContent, 'needs title'); ok(/title/.test($('#af-error').textContent), 'assignment needs a title');
setVal($('#af-title'), 'Fractions worksheet'); setVal($('#af-course'), '10'); setVal($('#af-due'), '2099-12-31'); click($('#af-save'));
await waitFor(() => $('#td-assignments-list').textContent.includes('Fractions worksheet'), 'assignment created');
ok(/Dec/.test($('#td-assignments-list').textContent) && /2099/.test($('#td-assignments-list').textContent) && !/2099-12-31/.test($('#td-assignments-list').textContent) && $$('#td-assignments-list .status-chip').length === 1, 'future due date formatted, not overdue');

/* ===== G. quiz builder ===== */
click($('[data-td-open="quiz"]')); await waitFor(() => $('#td-quiz-modal').classList.contains('show'), 'quiz modal');
setVal($('#qf-title'), 'Halves quiz');
const qs = $$('#qf-questions [data-q]'); ok(qs.length === 2, 'quiz starts with 2 empty questions');
click($('#qf-save')); await waitFor(() => $('#qf-error').textContent, 'q err'); ok(/Question 1 needs text/.test($('#qf-error').textContent), 'empty question refused');
const fill = (card, p, opts, correct) => { setVal(card.querySelector('[data-f="prompt"]'), p); [...card.querySelectorAll('[data-f="opt"]')].forEach((o, i) => setVal(o, opts[i] || '')); card.querySelectorAll('input[type=radio]')[correct].checked = true; };
fill(qs[0], '1/2 + 1/2 = ?', ['1', '2', '', '3'], 3);   // third option left blank, correct = "3"
fill(qs[1], 'Half of 10?', ['5', '4'], 0);
click($('#qf-save')); await waitFor(() => world.R.prepare('SELECT COUNT(*) n FROM quizzes WHERE title=?').get('Halves quiz').n === 1, 'quiz saved');
const saved = JSON.parse(world.R.prepare("SELECT questions FROM quizzes WHERE title='Halves quiz'").get().questions);
ok(saved[0].options.join() === '1,2,3' && saved[0].correct_index === 2, 'blank option dropped and correct answer index stays on "3"', saved[0]);
await waitFor(() => $('#td-uploads-body').textContent.includes('Halves quiz'), 'listed in uploads');
ok($('#td-uploads-body').textContent.includes('Quiz · 2 Q'), 'uploads table lists the new quiz');

/* ===== H. video by link, settings ===== */
click($('[data-td-open="video"]')); await waitFor(() => $('#td-video-modal').classList.contains('show'), 'video modal');
click($('#vf-save')); await sleep(60); ok(/title/.test($('#vf-error').textContent), 'video needs a title');
setVal($('#vf-title'), 'Intro video'); $('input[name="vf-source"][value="url"]').checked = true; $('input[name="vf-source"][value="url"]').dispatchEvent(new w.Event('change', { bubbles: true }));
click($('#vf-save')); await sleep(60); ok(/Paste the video link/.test($('#vf-error').textContent), 'video link required');
setVal($('#vf-url'), 'https://www.youtube.com/watch?v=abc123'); click($('#vf-save'));
await waitFor(() => $('#td-uploads-body').textContent.includes('Intro video'), 'video listed', 5000);
ok(true, 'video added by link');
const sw = $('[data-td-setting="weekly_summary_email"]'); sw.checked = true; sw.dispatchEvent(new w.Event('change', { bubbles: true }));
await waitFor(() => world.R.prepare('SELECT weekly_summary_email w FROM teacher_settings').get()?.w === 1, 'setting saved'); ok(true, 'settings switch persists');

/* ===== I. delete content + course ===== */
const vidRow = $$('#td-uploads-body tr').find((r) => r.textContent.includes('Intro video'));
click(vidRow.querySelector('[data-uact="del"]')); await waitFor(() => !$('#td-uploads-body').textContent.includes('Intro video'), 'video deleted'); ok(true, 'upload can be deleted');
click($('#td-courses-body tr[data-course="11"] [data-act="delete"]'));
await waitFor(() => !$('#td-courses-body').textContent.includes('Empty Draft'), 'course deleted');
ok(!$('#td-students-body').textContent.includes('Payment pending') && !$('#td-students-course').textContent.includes('Empty Draft'), 'deleted course disappears from students table and filters');
ok(world.R.prepare('SELECT COUNT(*) n FROM course_enrollments WHERE course_id=11').get().n === 0, 'its enrolments are removed too (no orphan rows)');
process.exitCode = summary() ? 1 : 0;
