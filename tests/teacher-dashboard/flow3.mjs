import { freshWorld, openDashboard, waitFor, sleep, ok, setVal, click, summary } from './e2e.mjs';
const seed = (R) => { R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published) VALUES (10,'Mine','m',1,1)`).run(); R.prepare(`INSERT INTO courses (id,title,slug,instructor_id,published) VALUES (12,'Theirs','t',2,1)`).run(); };

// 1. a student account
let world = freshWorld({ seed }); world.R.prepare("UPDATE users SET role='student' WHERE id=1").run();
let ui = await openDashboard(world);
await waitFor(() => !ui.$('#td-alert').classList.contains('d-none'), 'banner');
ok(/teacher accounts/.test(ui.$('#td-alert').textContent), 'student sees a clear "teacher accounts only" message');
ok(ui.$('#td-courses-body').textContent.includes('Loading'), 'and no teacher data is loaded for a student');

// 2. logged out
world = freshWorld({ seed }); ui = await openDashboard(world, { withToken: false });
await waitFor(() => !ui.$('#td-alert').classList.contains('d-none'), 'banner');
ok(/sign in/i.test(ui.$('#td-alert').textContent), 'logged-out visitor is told to sign in', ui.$('#td-alert').textContent);

// 3. Bootstrap blocked
world = freshWorld({ seed }); ui = await openDashboard(world, { noBootstrap: true });
await waitFor(() => !ui.$('#td-alert').classList.contains('d-none'), 'banner');
ok(/refresh/.test(ui.$('#td-alert').textContent), 'if a script is blocked the page says so instead of silently doing nothing', ui.$('#td-alert').textContent);

// 4. some sections' APIs are down: each explains itself in place, the rest keeps working
world = freshWorld({ seed }); ui = await openDashboard(world, { failPaths: ['/api/teacher/reviews', '/api/teacher/assignments', '/api/teacher/students'] });
await waitFor(() => ui.$('#td-courses-body').querySelectorAll('tr[data-course]').length && /not available/.test(ui.$('#td-reviews-list').textContent) && /not available/.test(ui.$('#td-assignments-list').textContent) && /boom/.test(ui.$('#td-students-body').textContent), 'in-place messages');
ok(ui.$('#td-courses-body').textContent.includes('Mine') && ui.$('#st-published').textContent === '1', 'courses and stats still load when other sections fail');
ok(/not available/.test(ui.$('#td-reviews-list').textContent) && /not available/.test(ui.$('#td-assignments-list').textContent), 'failing reviews/assignments each explain themselves in place');
ok(/boom/.test(ui.$('#td-students-body').textContent), 'students table shows the server error text');

// 5. overview itself failing
world = freshWorld({ seed }); ui = await openDashboard(world, { failPaths: ['/api/teacher/overview'] });
await waitFor(() => !ui.$('#td-alert').classList.contains('d-none'), 'banner');
ok(/overview/.test(ui.$('#td-alert').textContent), 'a failed overview is reported to the teacher', ui.$('#td-alert').textContent);

// 6. network drops while the teacher is working
world = freshWorld({ seed }); let down = false; ui = await openDashboard(world, { offline: () => down });
await waitFor(() => ui.$('#td-courses-body').querySelectorAll('tr[data-course]').length, 'courses');
down = true;
click(ui.$('#td-courses-body tr[data-course="10"] [data-act="toggle"]'));
await waitFor(() => ui.log.toasts.length, 'toast');
ok(/internet connection/.test(ui.log.toasts.at(-1)) && !/Failed to fetch/.test(ui.log.toasts.at(-1)), 'network loss shows a friendly message (not "Failed to fetch")', ui.log.toasts.at(-1));
click(ui.$('#td-new-course')); await waitFor(() => ui.$('#td-course-modal').classList.contains('show'), 'modal');
setVal(ui.$('#cf-title'), 'Offline course'); click(ui.$('#cf-save'));
await waitFor(() => ui.$('#cf-error').textContent, 'form error');
ok(/internet connection/.test(ui.$('#cf-error').textContent) && !ui.$('#cf-save').disabled, 'saving offline shows the error inside the form and re-enables Save', ui.$('#cf-error').textContent);
down = false; click(ui.$('#cf-save')); await waitFor(() => ui.$('#td-courses-body').textContent.includes('Offline course'), 'retry works');
ok(true, 'after reconnecting, Save works without reloading the page');

// 7. upload guards (no network wasted)
click(ui.$('[data-td-open="video"]')); await waitFor(() => ui.$('#td-video-modal').classList.contains('show'), 'video modal');
setVal(ui.$('#vf-title'), 'Big'); const big = new ui.w.File([new Uint8Array(10)], 'big.mp4', { type: 'video/mp4' }); Object.defineProperty(big, 'size', { value: 150 * 1024 * 1024 });
Object.defineProperty(ui.$('#vf-file'), 'files', { value: [big], configurable: true });
click(ui.$('#vf-save')); await sleep(50);
ok(/over 100MB/.test(ui.$('#vf-error').textContent) && !ui.$('#vf-save').disabled, 'a 150MB video is refused immediately with advice, Save stays usable', ui.$('#vf-error').textContent);
click(ui.$('[data-td-open="resource"]')); await waitFor(() => ui.$('#td-resource-modal').classList.contains('show'), 'resource modal');
setVal(ui.$('#rf-title'), 'Doc'); const exe = new ui.w.File(['x'], 'setup.exe', { type: 'application/x-msdownload' });
Object.defineProperty(ui.$('#rf-file'), 'files', { value: [exe], configurable: true });
click(ui.$('#rf-save')); await sleep(50);
ok(/Only PDF/.test(ui.$('#rf-error').textContent), 'an .exe is refused as a resource', ui.$('#rf-error').textContent);

// 8. admin sees everything
world = freshWorld({ seed }); world.R.prepare("UPDATE users SET role='admin' WHERE id=1").run();
ui = await openDashboard(world); await waitFor(() => ui.$('#td-courses-body').querySelectorAll('tr[data-course]').length === 2, 'admin courses');
ok(/Admin view/.test(ui.$('#td-role').textContent), 'admin banner');
// 9. no leftover template markers
ok(!/\bundefined\b|\bNaN\b|\[object/.test(ui.d.querySelector('#td-root').textContent), 'no "undefined" / NaN / [object] text anywhere on the page', (ui.d.querySelector('#td-root').textContent.match(/.{20}(undefined|NaN|\[object).{20}/) || [])[0]);
process.exitCode = summary() ? 1 : 0;
