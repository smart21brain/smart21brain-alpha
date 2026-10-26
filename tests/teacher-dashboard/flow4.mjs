import { freshWorld, openDashboard, waitFor, sleep, ok, setVal, click, summary, worker } from './e2e.mjs';
// capture what the server would send through the e-mail provider
const mails = []; const realFetch = globalThis.fetch;
globalThis.fetch = async (url, init) => { if (String(url).includes('api.resend.com')) { mails.push(JSON.parse(init.body)); return new Response('{}', { status: 200 }); } return realFetch(url, init); };

const seed = (R) => {
  R.prepare(`INSERT INTO sessions (token,user_id,expires_at) VALUES ('tok4',4,datetime('now','+1 day'))`).run();
  R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published,price,is_free) VALUES (10,'Fractions','fractions',1,1,0,1)`).run();
  R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status) VALUES (4,10,'paid','active')`).run();
  const qs = JSON.stringify([
    { prompt: 'Capital of "Tanzania"? <img src=x onerror=alert(1)>', options: ['Dodoma', 'Dar', 'Arusha', 'Mwanza', 'Tanga'], correct_index: 0, explanation: 'Dodoma is the capital' },
    { prompt: '1 + 1 = ?', options: ['1', '2'], correct_index: 1, explanation: '' },
    { prompt: 'Pick the odd one', options: ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], correct_index: 7 },
  ]);
  R.prepare(`INSERT INTO quizzes (id,title,subject,description,questions,created_by) VALUES (1,'Geography','Social','desc',?,1)`).run(qs);
  R.prepare(`INSERT INTO quizzes (id,title,questions,created_by) VALUES (2,'Other teachers quiz','[]',2)`).run();
  R.prepare(`INSERT INTO quizzes (id,title,questions,created_by) VALUES (3,'Unused quiz','[{"prompt":"q","options":["a","b"],"correct_index":0}]',1)`).run();
  R.prepare(`UPDATE courses SET final_exam_quiz_id = 1 WHERE id = 10`).run();
  R.prepare(`INSERT INTO course_lessons (id,course_id,title,content_type,quiz_id,sort_order) VALUES (50,10,'Geo quiz','quiz',1,1)`).run();
  R.prepare(`INSERT INTO quiz_attempts (user_id,quiz_id,score,total) VALUES (4,1,2,3)`).run();
};
const configure = (world) => { world.env.RESEND_API_KEY = 'k'; world.env.EMAIL_FROM = 'Smart21Brain <no-reply@x.com>'; world.env.SITE_URL = 'https://smart21brain.com'; };

/* ===== A. e-mail not set up on the server ===== */
let world = freshWorld({ seed }); let ui = await openDashboard(world); let { w, $, $$, log } = ui;
await waitFor(() => /not set up/.test($('#td-email-status').textContent), 'status');
ok(/not set up on this site yet/.test($('#td-email-status').textContent) && /Reviews/.test($('#td-email-status').textContent), 'status tells the truth: e-mail is not set up (and where comments still show)', $('#td-email-status').textContent);
click($('#td-email-test')); await waitFor(() => log.toasts.length, 'toast');
ok(/error/.test(log.toasts.at(-1)) && /not set up/.test(log.toasts.at(-1)) && !$('#td-email-test').disabled, 'test button explains why nothing was sent, then re-enables', log.toasts.at(-1));

/* ===== B. e-mail configured ===== */
world = freshWorld({ seed }); configure(world); mails.length = 0; ui = await openDashboard(world); ({ w, $, $$, log } = ui);
await waitFor(() => /E-mail is on/.test($('#td-email-status').textContent), 'status on');
ok(/halima/.test($('#td-email-status').textContent.toLowerCase()) === false && /h@t\.com/.test($('#td-email-status').textContent), 'status shows the address mail goes to', $('#td-email-status').textContent);
click($('#td-email-test')); await waitFor(() => log.toasts.length, 'toast');
ok(/success/.test(log.toasts.at(-1)) && /h@t\.com/.test(log.toasts.at(-1)) && mails.length === 1 && mails[0].to[0] === 'h@t.com', 'test e-mail really sent to the teacher', [log.toasts.at(-1), mails.length]);
click($('#td-email-test')); await waitFor(() => log.toasts.length === 2, 'second toast');
ok(/error/.test(log.toasts.at(-1)) && /wait a minute/.test(log.toasts.at(-1)) && mails.length === 1, 'second click within a minute is refused', log.toasts.at(-1));

/* ===== C. a student comment travels: browser-less student -> router -> teacher's inbox ===== */
mails.length = 0;
const studentRes = await worker.fetch(new Request('http://localhost/api/courses/10/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 's21_session=tok4' }, body: JSON.stringify({ rating: 5, comment: 'Loved the fractions lessons!' }) }), world.env, { waitUntil() {} });
ok(studentRes.status === 201, 'student review accepted by the real router', studentRes.status);
await waitFor(() => mails.length === 1, 'comment e-mail');
ok(mails[0].to[0] === 'h@t.com' && /5-star/.test(mails[0].subject) && /Amina J\./.test(mails[0].text) && /Loved the fractions/.test(mails[0].text), 'teacher is e-mailed the comment', mails[0].subject);
// the teacher switches comment e-mails off in the UI, then another student comments
const sw = $('[data-td-setting="email_on_comments"]'); ok(sw.checked === true, 'switch shows ON by default');
sw.checked = false; sw.dispatchEvent(new w.Event('change', { bubbles: true }));
await waitFor(() => world.R.prepare('SELECT email_on_comments e FROM teacher_settings').get()?.e === 0, 'saved');
world.R.prepare(`INSERT INTO course_enrollments (user_id,course_id,payment_status,status) VALUES (5,10,'paid','active')`).run();
world.R.prepare(`INSERT INTO sessions (token,user_id,expires_at) VALUES ('tok5',5,datetime('now','+1 day'))`).run();
mails.length = 0;
await worker.fetch(new Request('http://localhost/api/courses/10/reviews', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: 's21_session=tok5' }, body: JSON.stringify({ rating: 4, comment: 'Second comment' }) }), world.env, { waitUntil() {} });
await sleep(300); ok(mails.length === 0, 'after switching OFF in the dashboard, new comments are not e-mailed');

/* ===== D. profile switch controls the public page ===== */
const pub = async () => (await (await worker.fetch(new Request('http://localhost/api/courses/fractions'), world.env, { waitUntil() {} })).json()).course.instructor_name;
ok((await pub()) === 'Halima Rashid', 'public page shows the teacher by default');
const ps = $('[data-td-setting="show_profile_to_parents"]'); ps.checked = false; ps.dispatchEvent(new w.Event('change', { bubbles: true }));
await waitFor(() => world.R.prepare('SELECT show_profile_to_parents p FROM teacher_settings').get()?.p === 0, 'saved');
ok((await pub()) === null, 'switching "Show my profile to parents" OFF hides the name on the public course page');

/* ===== E. settings fail to load: switches are locked, never shown in a wrong position ===== */
world = freshWorld({ seed }); ui = await openDashboard(world, { failPaths: ['/api/teacher/settings'] });
await waitFor(() => /could not be loaded/.test(ui.$('#td-email-status').textContent), 'locked');
await waitFor(() => /settings/.test(ui.$('#td-alert').textContent), 'banner');
ok(ui.$$('[data-td-setting]').every((i) => i.disabled) && /settings/.test(ui.$('#td-alert').textContent), 'switches locked + banner mentions settings', ui.$('#td-alert').textContent);

/* ===== F. quiz editing ===== */
world = freshWorld({ seed }); ui = await openDashboard(world); ({ w, $, $$, log } = ui);
await waitFor(() => $('#td-uploads-body').textContent.includes('Geography'), 'uploads');
const qrow = (t) => $$('#td-uploads-body tr').find((r) => r.textContent.includes(t));
ok(!$('#td-uploads-body').textContent.includes('Other teachers'), "another teacher's quiz is not listed");
ok(qrow('Geography').querySelector('[data-uact="edit"]') && !$$('#td-uploads-body tr').filter((r) => r.dataset.kind !== 'quiz').some((r) => r.querySelector('[data-uact="edit"]')), 'only quizzes get an Edit button');
click(qrow('Geography').querySelector('[data-uact="edit"]'));
await waitFor(() => $('#td-quiz-modal').classList.contains('show') && $$('#qf-questions [data-q]').length === 3, 'edit modal');
ok($('#qf-modal-title').textContent === 'Edit quiz' && $('#qf-save').textContent === 'Save changes', 'window says "Edit quiz" / "Save changes"');
ok($('#qf-title').value === 'Geography' && $('#qf-subject').value === 'Social' && $('#qf-description').value === 'desc', 'title, subject, description pre-filled');
let cards = $$('#qf-questions [data-q]');
ok(cards[0].querySelector('[data-f="prompt"]').value.startsWith('Capital of "Tanzania"?') && cards[0].querySelector('[data-f="prompt"]').value.includes('<img src=x'), 'question text with quotes/HTML is pre-filled safely as plain text');
ok(cards[0].querySelector('img') === null && cards[0].querySelectorAll('[onerror]').length === 0, 'XSS: no live <img>/onerror element created from the question text');
ok(cards[0].querySelectorAll('[data-f="opt"]').length === 5 && cards[0].querySelectorAll('input[type=radio]')[0].checked, 'a 5-answer question keeps all 5 answers; correct one preselected');
ok(cards[1].querySelectorAll('[data-f="opt"]').length === 4 && cards[1].querySelectorAll('input[type=radio]')[1].checked, 'a 2-answer question shows 4 boxes with the right answer preselected');
ok(cards[2].querySelectorAll('[data-f="opt"]').length === 8 && cards[2].querySelectorAll('input[type=radio]')[7].checked && cards[2].querySelector('[data-qact="addopt"]').style.display === 'none', '8-answer question: all kept, "add answer" hidden at the maximum');
ok(cards[0].querySelector('[data-f="explanation"]').value === 'Dodoma is the capital', 'explanation pre-filled');
ok(/final exam of 1 course/.test($('#qf-note').textContent) && /1 attempt has already been recorded/.test($('#qf-note').textContent) && !$('#qf-note').classList.contains('d-none'), 'warns where it is used and that attempts exist', $('#qf-note').textContent);

// edit: change text, change correct answer, add an answer, remove a question
const sf = (el, v) => setVal(el, v);
sf(cards[1].querySelector('[data-f="prompt"]'), '2 + 2 = ?');
sf(cards[1].querySelectorAll('[data-f="opt"]')[0], '3'); sf(cards[1].querySelectorAll('[data-f="opt"]')[1], '4'); sf(cards[1].querySelectorAll('[data-f="opt"]')[2], '5');
cards[1].querySelectorAll('input[type=radio]')[1].checked = true;
click(cards[1].querySelector('[data-qact="addopt"]')); ok(cards[1].querySelectorAll('[data-f="opt"]').length === 5, '"Add another answer" adds a box');
sf(cards[1].querySelectorAll('[data-f="opt"]')[4], '6');
click(cards[2].querySelector('[data-qact="remove"]'));
click($('#qf-save'));
await waitFor(() => !$('#td-quiz-modal').classList.contains('show') && /Quiz updated/.test(log.toasts.at(-1) || ''), 'saved');
let saved = world.R.prepare('SELECT * FROM quizzes WHERE id=1').get(); let sq = JSON.parse(saved.questions);
ok(world.R.prepare('SELECT COUNT(*) n FROM quizzes').get().n === 3, 'editing updated the quiz in place (no copy created)');
ok(sq.length === 2 && sq[1].prompt === '2 + 2 = ?' && sq[1].options.join() === '3,4,5,6' && sq[1].correct_index === 1, 'new text, answers and correct answer stored', sq[1]);
ok(sq[0].options.length === 5 && sq[0].correct_index === 0 && sq[0].explanation === 'Dodoma is the capital', 'untouched question unchanged');
ok(saved.published === 1 && world.R.prepare('SELECT final_exam_quiz_id f FROM courses WHERE id=10').get().f === 1, 'quiz stays published and still the course final exam');
ok(world.R.prepare('SELECT COUNT(*) n FROM quiz_attempts').get().n === 1, 'past attempts kept');
await waitFor(() => /2 Q/.test(qrow('Geography').textContent), 'list refreshed'); ok(true, 'uploads list shows the new question count');

// invalid edits
click(qrow('Geography').querySelector('[data-uact="edit"]')); await waitFor(() => $$('#qf-questions [data-q]').length === 2, 'reopen');
$$('#qf-questions [data-qact="remove"]').forEach(click); click($('#qf-save'));
await waitFor(() => $('#qf-error').textContent, 'err'); ok(/at least one question/.test($('#qf-error').textContent), 'cannot save a quiz with no questions');
click($('#qf-add-q')); const nc = $$('#qf-questions [data-q]')[0]; sf(nc.querySelector('[data-f="prompt"]'), 'Only one answer'); sf(nc.querySelectorAll('[data-f="opt"]')[0], 'x'); click($('#qf-save'));
await waitFor(() => /two answers/.test($('#qf-error').textContent), 'two answers'); ok(true, 'needs at least two answers');
$$('#qf-questions [data-qact="remove"]').forEach(click);

// create after edit must be a clean "create"
click($('[data-td-open="quiz"]')); await waitFor(() => $('#qf-modal-title').textContent === 'Create a quiz', 'create mode');
ok($('#qf-title').value === '' && $$('#qf-questions [data-q]').length === 2 && $('#qf-save').textContent === 'Save quiz' && $('#qf-note').classList.contains('d-none'), 'creating after editing starts clean (no leftovers, no note)');
sf($('#qf-title'), 'Brand new'); const [c1, c2] = $$('#qf-questions [data-q]');
sf(c1.querySelector('[data-f="prompt"]'), 'Q one'); sf(c1.querySelectorAll('[data-f="opt"]')[0], 'a'); sf(c1.querySelectorAll('[data-f="opt"]')[1], 'b');
sf(c2.querySelector('[data-f="prompt"]'), 'Q two'); sf(c2.querySelectorAll('[data-f="opt"]')[0], 'c'); sf(c2.querySelectorAll('[data-f="opt"]')[1], 'd');
click($('#qf-save')); await waitFor(() => world.R.prepare("SELECT COUNT(*) n FROM quizzes WHERE title='Brand new'").get().n === 1, 'created');
ok(world.R.prepare("SELECT title FROM quizzes WHERE id=1").get().title === 'Geography', 'the edited quiz was NOT overwritten by the new one');

// delete warnings
w.__confirmAnswer = false;
click(qrow('Geography').querySelector('[data-uact="del"]')); await sleep(80);
const msg = log.confirms.at(-1) || '';
ok(/lesson/.test(msg) && /final exam of 1 course/.test(msg) && /NO final exam/.test(msg) && /1 attempt/.test(msg), 'deleting a quiz in use warns about lesson, final exam and attempts', msg);
ok(world.R.prepare('SELECT COUNT(*) n FROM quizzes WHERE id=1').get().n === 1, 'declining the warning keeps the quiz');
click(qrow('Unused quiz').querySelector('[data-uact="del"]')); await sleep(80);
ok(/^Delete this quiz\?$/.test(log.confirms.at(-1)), 'an unused quiz gets the simple prompt', log.confirms.at(-1));
w.__confirmAnswer = true;
click(qrow('Geography').querySelector('[data-uact="del"]')); await waitFor(() => !$('#td-uploads-body').textContent.includes('Geography'), 'deleted');
ok(world.R.prepare('SELECT final_exam_quiz_id f FROM courses WHERE id=10').get().f === null, 'confirmed delete removes it (course loses its exam, as the warning said)');
process.exitCode = summary() ? 1 : 0;
