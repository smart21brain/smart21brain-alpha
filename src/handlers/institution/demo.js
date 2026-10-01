// Smart21Institution — optional sample data so a new institution can try every screen.
// Only allowed while the institution is still empty (no books, students or staff).
import { json } from '../../lib/auth.js';
import { fail, secure, audit, localToday, addDays, gradeFor, DEFAULT_GRADING, chunk } from '../../lib/institution-auth.js';

const NAMES = ['Amina Juma', 'Baraka Mushi', 'Catherine Mollel', 'Daudi Kessy', 'Esther Mwakyusa', 'Faraja Lyimo', 'George Massawe', 'Halima Said', 'Isaac Mrema', 'Joyce Kimaro',
  'Khamis Ally', 'Lilian Shayo', 'Musa Mwita', 'Neema Kisanga', 'Omari Bakari', 'Pendo Mtui', 'Rashid Hamisi', 'Salma Nyerere', 'Tumaini Mallya', 'Upendo Swai'];
const BOOKS = [
  ['Things Fall Apart', 'Chinua Achebe', 'Fiction', 1958], ['Introduction to Algorithms', 'Thomas H. Cormen', 'Technology', 2009], ['A Brief History of Time', 'Stephen Hawking', 'Science', 1988],
  ['Kiswahili Sanifu', 'TUKI', 'Languages', 2004], ['Calculus: Early Transcendentals', 'James Stewart', 'Mathematics', 2015], ['Half of a Yellow Sun', 'Chimamanda Ngozi Adichie', 'Fiction', 2006],
  ['Africa: A Biography of the Continent', 'John Reader', 'History & Geography', 1997], ['Clean Code', 'Robert C. Martin', 'Technology', 2008], ['Principles of Economics', 'N. Gregory Mankiw', 'General', 2020],
  ['The Selfish Gene', 'Richard Dawkins', 'Science', 1976], ['Linear Algebra Done Right', 'Sheldon Axler', 'Mathematics', 2015], ['Oxford Dictionary of English', 'Oxford University Press', 'Reference', 2010],
];

export const loadDemoData = secure({ perm: 'settings.manage', roles: ['super_admin', 'admin'] }, async ({ request, env, ctx }) => {
  const id = ctx.inst.id;
  const used = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM ins_books WHERE institution_id = ?1) + (SELECT COUNT(*) FROM ins_students WHERE institution_id = ?1) + (SELECT COUNT(*) FROM ins_staff WHERE institution_id = ?1) AS n`).bind(id).first();
  if (used.n) fail(409, 'Sample data can only be added to an empty institution.');
  const today = localToday(ctx.off);

  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO ins_departments (institution_id, name, code) VALUES (?, ?, ?)').bind(id, 'Sciences', 'SCI'),
    env.DB.prepare('INSERT OR IGNORE INTO ins_departments (institution_id, name, code) VALUES (?, ?, ?)').bind(id, 'Humanities', 'HUM'),
  ]);
  const dep = Object.fromEntries((await env.DB.prepare('SELECT id, code FROM ins_departments WHERE institution_id = ?').bind(id).all()).results.map((d) => [d.code, d.id]));
  await env.DB.batch([
    env.DB.prepare('INSERT OR IGNORE INTO ins_programmes (institution_id, department_id, name, code, level, duration_years) VALUES (?, ?, ?, ?, ?, ?)').bind(id, dep.SCI, 'Computer Science', 'CS', 'Diploma', 3),
    env.DB.prepare('INSERT OR IGNORE INTO ins_programmes (institution_id, department_id, name, code, level, duration_years) VALUES (?, ?, ?, ?, ?, ?)').bind(id, dep.HUM, 'Languages & Literature', 'LL', 'Diploma', 3),
  ]);
  const prog = Object.fromEntries((await env.DB.prepare('SELECT id, code FROM ins_programmes WHERE institution_id = ?').bind(id).all()).results.map((p) => [p.code, p.id]));

  // staff
  const staffRows = [['Dr. Grace Mushi', 'Lecturer', 'SCI'], ['Mr. Peter Kweka', 'Lecturer', 'HUM'], ['Ms. Zawadi Komba', 'Librarian', 'HUM']];
  await env.DB.batch(staffRows.map(([n, p, d], i) => env.DB.prepare('INSERT INTO ins_staff (institution_id, staff_no, full_name, position, department_id, status) VALUES (?, ?, ?, ?, ?, ?)').bind(id, `STF-${String(i + 1).padStart(4, '0')}`, n, p, dep[d], 'active')));
  const staff = (await env.DB.prepare('SELECT id FROM ins_staff WHERE institution_id = ? ORDER BY id').bind(id).all()).results;

  // students
  await env.DB.batch(NAMES.map((n, i) => env.DB.prepare(
    `INSERT INTO ins_students (institution_id, student_no, reg_no, full_name, gender, programme_id, department_id, class_name, level, admission_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).bind(id, `STU-${String(i + 1).padStart(4, '0')}`, `REG/${new Date().getUTCFullYear()}/${String(i + 1).padStart(3, '0')}`, n, i % 2 ? 'male' : 'female', i % 3 ? prog.CS : prog.LL, i % 3 ? dep.SCI : dep.HUM, i % 2 ? 'Year 1 A' : 'Year 1 B', 'Year 1', `${new Date().getUTCFullYear()}-01-15`)));
  const students = (await env.DB.prepare('SELECT id FROM ins_students WHERE institution_id = ? ORDER BY id').bind(id).all()).results;

  // courses, teaching, enrolment, marks
  const cs = [['CS101', 'Introduction to Programming', prog.CS, dep.SCI], ['CS102', 'Discrete Mathematics', prog.CS, dep.SCI], ['LL101', 'Kiswahili Literature', prog.LL, dep.HUM], ['LL102', 'English Composition', prog.LL, dep.HUM]];
  await env.DB.batch(cs.map(([c, n, p, d]) => env.DB.prepare('INSERT INTO ins_courses (institution_id, programme_id, department_id, code, name, credits) VALUES (?, ?, ?, ?, ?, 3)').bind(id, p, d, c, n)));
  const courses = (await env.DB.prepare('SELECT id, code FROM ins_courses WHERE institution_id = ? ORDER BY id').bind(id).all()).results;
  const term = await env.DB.prepare('SELECT id FROM ins_terms WHERE institution_id = ? AND is_current = 1').bind(id).first();
  if (term) {
    await env.DB.batch(courses.map((c, i) => env.DB.prepare('INSERT INTO ins_teaching (institution_id, course_id, staff_id, term_id) VALUES (?, ?, ?, ?)').bind(id, c.id, staff[i < 2 ? 0 : 1].id, term.id)));
    const enr = [];
    students.forEach((s, i) => courses.forEach((c) => { if ((c.code.startsWith('CS') && i % 3) || (c.code.startsWith('LL') && !(i % 3))) enr.push([s.id, c.id]); }));
    for (const part of chunk(enr, 90)) await env.DB.batch(part.map(([s, c]) => env.DB.prepare('INSERT INTO ins_enrollments (institution_id, student_id, course_id, term_id) VALUES (?, ?, ?, ?)').bind(id, s, c, term.id)));
    const { results: e } = await env.DB.prepare('SELECT id, student_id, course_id FROM ins_enrollments WHERE institution_id = ?').bind(id).all();
    for (const part of chunk(e, 90)) await env.DB.batch(part.map((r) => {
      const marks = 35 + ((r.id * 37 + r.student_id * 11) % 62); const g = gradeFor(marks, DEFAULT_GRADING);
      return env.DB.prepare('INSERT INTO ins_results (institution_id, enrollment_id, student_id, course_id, term_id, marks, grade, points, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)').bind(id, r.id, r.student_id, r.course_id, term.id, marks, g.grade, g.points, ctx.user.id);
    }));
  }

  // library
  const cats = Object.fromEntries((await env.DB.prepare('SELECT id, name FROM ins_categories WHERE institution_id = ?').bind(id).all()).results.map((c) => [c.name, c.id]));
  await env.DB.batch(BOOKS.map(([t, a, c, y], i) => env.DB.prepare(
    `INSERT INTO ins_books (institution_id, isbn, title, author, pub_year, category_id, shelf, language, description) VALUES (?, ?, ?, ?, ?, ?, ?, 'English', ?)`
  ).bind(id, `97800000${String(10000 + i)}`.slice(0, 13), t, a, y, cats[c] || null, `${c.slice(0, 1)}-${(i % 4) + 1}`, 'Sample record added with the demo data.')));
  const books = (await env.DB.prepare('SELECT id FROM ins_books WHERE institution_id = ? ORDER BY id').bind(id).all()).results;
  const copyStmts = []; let n = 0;
  books.forEach((b, i) => { for (let c = 0; c < (i % 3) + 1; c++) { n++; const no = `ACC-${String(n).padStart(5, '0')}`; copyStmts.push(env.DB.prepare('INSERT INTO ins_book_copies (institution_id, book_id, accession_no, barcode) VALUES (?, ?, ?, ?)').bind(id, b.id, no, no)); } });
  for (const part of chunk(copyStmts, 90)) await env.DB.batch(part);
  const copies = (await env.DB.prepare('SELECT id, book_id FROM ins_book_copies WHERE institution_id = ? ORDER BY id').bind(id).all()).results;

  // a few loans: two current, one overdue, one returned
  const first = (bookIdx) => copies.find((c) => c.book_id === books[bookIdx].id);
  const loanPlan = [[0, 0, addDays(today, -3), addDays(today, 11), 'borrowed'], [1, 1, addDays(today, -20), addDays(today, -6), 'borrowed'], [2, 3, addDays(today, -1), addDays(today, 13), 'borrowed'], [3, 4, addDays(today, -30), addDays(today, -16), 'returned']];
  for (const [sIdx, bIdx, issued, due, status] of loanPlan) {
    const copy = first(bIdx); if (!copy) continue;
    await env.DB.prepare(`INSERT INTO ins_loans (institution_id, copy_id, book_id, borrower_type, borrower_id, issued_on, due_date, returned_on, status, return_condition, issued_by) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?)`)
      .bind(id, copy.id, copy.book_id, students[sIdx].id, issued, due, status === 'returned' ? addDays(today, -18) : null, status, status === 'returned' ? 'good' : null, ctx.user.id).run();
    if (status === 'borrowed') await env.DB.prepare(`UPDATE ins_book_copies SET status = 'borrowed' WHERE id = ?`).bind(copy.id).run();
  }
  await env.DB.prepare('INSERT INTO ins_announcements (institution_id, title, body, audience, pinned, author_id) VALUES (?, ?, ?, ?, 1, ?)')
    .bind(id, 'Welcome to the new library system', 'Search the catalogue, reserve books and read digital resources online. Ask the library desk if you need help.', 'public', ctx.user.id).run();

  await audit(env, request, ctx, 'system', 'demo.load', 'institution', id, 'Sample data loaded');
  return json({ ok: true, students: students.length, books: books.length });
});
