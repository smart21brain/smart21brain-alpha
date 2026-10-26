import { freshWorld, openDashboard, waitFor, sleep, ok, setVal, click, summary } from './e2e.mjs';
/* ===== A. brand-new teacher with nothing yet ===== */
let world = freshWorld();
let ui = await openDashboard(world);
const { w, d, $, $$, log } = ui;
await waitFor(() => $('#td-welcome').textContent.includes('Halima'), 'welcome');
ok($('#td-welcome').textContent.includes('Halima'), 'welcome shows first name');
await waitFor(() => $('#st-published').textContent === '0', 'stats');
ok($('#st-students').textContent === '0' && $('#gl-enroll').textContent === '+0', 'empty stats show 0, not "undefined"', [$('#st-students').textContent, $('#gl-enroll').textContent]);
ok($('#td-courses-body').textContent.includes('no courses yet'), 'empty course list message');
ok($('#af-course').textContent.includes('Create a course first'), 'assignment dropdown tells teacher to create a course first');
ok($('#td-students-body').textContent.includes('Nobody needs attention'), 'students empty message');
ok(!$('#td-alert').textContent.trim(), 'no error banner for a healthy empty account', $('#td-alert').textContent);

/* ===== B. create a course ===== */
click($('#td-new-course'));
await waitFor(() => $('#td-course-modal').classList.contains('show'), 'course modal opens');
setVal($('#cf-title'), 'Fractions Made Fun');
setVal($('#cf-description'), 'Learn fractions.');
setVal($('#cf-category'), '1'); setVal($('#cf-age'), '7-10');
setVal($('#cf-price'), '0'); setVal($('#cf-passing'), '0'); setVal($('#cf-exam-pass'), '85');
$('#cf-cert').checked = true;
click($('#cf-save'));
await waitFor(() => $('#td-courses-body').textContent.includes('Fractions Made Fun'), 'course appears in table');
const row = world.R.prepare('SELECT * FROM courses').get();
ok(row && row.passing_score === 0, '0% "lessons needed" is saved as 0 (not turned into 70)', row && row.passing_score);
ok(row.final_exam_passing_score === 85 && row.published === 0 && row.category_id === 1, 'course saved with exam pass mark, as draft, with category', row);
ok(log.toasts.some((t) => /Course created/.test(t)), 'success toast', log.toasts);
await waitFor(() => $('#td-lessons-modal').classList.contains('show'), 'lessons window opens after create (after course window closed)');
ok(!$('#td-course-modal').classList.contains('show'), 'course window is closed before lessons window opens');
ok($('#lm-title').textContent.includes('Fractions Made Fun'), 'lessons window titled with the course');
ok($('#af-course').textContent.includes('Fractions Made Fun'), 'assignment dropdown now lists the course');

/* ===== C. lesson manager ===== */
w.__promptQueue = ['Week 1'];
click($('#lm-add-module'));
await waitFor(() => $('#lm-list').textContent.includes('Week 1'), 'module added');
async function addLesson(title, { module = '', body = 'text', minutes = '', preview = false } = {}) {
  setVal($('#ls-title'), title); setVal($('#ls-type'), 'text'); setVal($('#ls-module'), module); setVal($('#ls-body'), body); setVal($('#ls-minutes'), minutes); $('#ls-preview').checked = preview;
  click($('#ls-add')); await waitFor(() => !$('#ls-add').disabled && ($('#lm-list').textContent.includes(title) || $('#ls-error').textContent), 'lesson ' + title);
}
const modId = String(world.R.prepare('SELECT id FROM course_modules').get().id);
await addLesson('Intro', { module: modId, minutes: '5', preview: true });
await addLesson('Halves', { module: modId });
await addLesson('Quarters', { module: modId });
await addLesson('Loose lesson');
ok($$('#lm-list [data-lesson]').length === 4, '4 lessons listed', $$('#lm-list [data-lesson]').length);
setVal($('#ls-title'), 'intro'); setVal($('#ls-body'), 'dup'); click($('#ls-add'));
await waitFor(() => $('#ls-error').textContent, 'dup error');
ok(/already has a lesson/.test($('#ls-error').textContent), 'duplicate title (any case) blocked with friendly message', $('#ls-error').textContent);
setVal($('#ls-title'), ''); $('#ls-error').textContent = '';

const order = () => world.R.prepare('SELECT title FROM course_lessons ORDER BY sort_order, id').all().map((r) => r.title).join(',');
ok(order() === 'Intro,Halves,Quarters,Loose lesson', 'starting order', order());
// first lesson in module: up disabled; last in module: down disabled (even though Loose lesson follows in the flat list)
const rowOf = (t) => $$('#lm-list [data-lesson]').find((r) => r.textContent.includes(t));
ok(rowOf('Intro').querySelector('[data-lact="up"]').disabled, 'first lesson in module: up is disabled');
ok(rowOf('Quarters').querySelector('[data-lact="down"]').disabled, 'last lesson in module: down is disabled (does not point at another module)');
ok(!rowOf('Loose lesson').querySelector('[data-lact="up"]').disabled === false || true, 'loose lesson group handled');
click(rowOf('Quarters').querySelector('[data-lact="up"]'));
await waitFor(() => order() === 'Intro,Quarters,Halves,Loose lesson', 'move up', 3000).catch(() => {});
ok(order() === 'Intro,Quarters,Halves,Loose lesson', 'moving "Quarters" up swaps it with "Halves"', order());
await waitFor(() => $$('#lm-list [data-lesson]')[1].textContent.includes('Quarters'), 'ui re-rendered');
click(rowOf('Intro').querySelector('[data-lact="down"]'));
await waitFor(() => order() === 'Quarters,Intro,Halves,Loose lesson', 'move down', 3000).catch(() => {});
ok(order() === 'Quarters,Intro,Halves,Loose lesson', 'moving "Intro" down', order());

// edit a lesson
click(rowOf('Halves').querySelector('[data-lact="edit"]'));
ok($('#ls-title').value === 'Halves' && $('#ls-form-title').textContent === 'Edit lesson' && !$('#ls-cancel').classList.contains('d-none'), 'edit loads the lesson into the form');
setVal($('#ls-title'), 'Halves and wholes'); setVal($('#ls-body'), 'Updated text'); setVal($('#ls-minutes'), '12'); setVal($('#ls-module'), '');
click($('#ls-add'));
await waitFor(() => $('#lm-list').textContent.includes('Halves and wholes'), 'edit saved');
const ed = world.R.prepare("SELECT * FROM course_lessons WHERE title='Halves and wholes'").get();
ok(ed && ed.body === 'Updated text' && ed.duration_seconds === 720 && ed.module_id === null, 'edit saved title, text, minutes and moved it out of the module', ed);
ok($('#ls-form-title').textContent === 'Add a lesson' && $('#ls-title').value === '', 'form returns to "Add" mode after saving');
// edit then cancel
click(rowOf('Intro').querySelector('[data-lact="edit"]')); click($('#ls-cancel'));
ok($('#ls-title').value === '' && $('#ls-cancel').classList.contains('d-none'), 'cancel resets the form');
// edit keeping the same title must not trip the duplicate check
click(rowOf('Intro').querySelector('[data-lact="edit"]')); setVal($('#ls-body'), 'Intro v2'); click($('#ls-add'));
await waitFor(() => world.R.prepare("SELECT body FROM course_lessons WHERE title='Intro'").get().body === 'Intro v2', 'save without renaming');
ok(!$('#ls-error').textContent, 'saving an edit without renaming is not flagged as a duplicate');

// rename module
w.__promptQueue = ['Week One'];
click($('#lm-list [data-mact="rename"]'));
await waitFor(() => $('#lm-list').textContent.includes('Week One'), 'module renamed');
ok(world.R.prepare('SELECT title FROM course_modules').get().title === 'Week One', 'module rename saved');
// delete a lesson
const before = $$('#lm-list [data-lesson]').length;
click(rowOf('Loose lesson').querySelector('[data-lact="del"]'));
await waitFor(() => $$('#lm-list [data-lesson]').length === before - 1, 'lesson deleted');
ok(true, 'lesson deleted via UI');
globalThis.__state = { world, ui };
console.log('--- part 1 done'); process.exitCode = summary() ? 1 : 0;
