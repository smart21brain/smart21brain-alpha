// Smart21Institution — dashboard, global search, reports (JSON / CSV), audit log, system health.
import { json } from '../../lib/auth.js';
import {
  fail, secure, V, likeTerm, paging, can, localToday, addDays, daysBetween, round2, getSettings, errorResponse,
} from '../../lib/institution-auth.js';
import { sweep } from './library.js';

const n = (v) => Number(v || 0);

// ---------------------------------------------------------------------
// Dashboard — different for every role
// ---------------------------------------------------------------------
export const dashboard = secure(async ({ env, ctx }) => {
  const id = ctx.inst.id; const today = localToday(ctx.off);
  const one = (sql, ...b) => env.DB.prepare(sql).bind(id, ...b).first();
  const all = (sql, ...b) => env.DB.prepare(sql).bind(id, ...b).all().then((r) => r.results);
  const out = { role: ctx.role, today, cards: [], lists: {} };

  const staffView = can(ctx, 'books.view') || can(ctx, 'students.view') || can(ctx, 'loans.view');
  if (!staffView) {           // student (or linked person): their own summary
    const a = await all(`SELECT title, body, created_at FROM ins_announcements WHERE institution_id = ? AND deleted_at IS NULL AND audience IN ('public','members','students') AND (expires_on IS NULL OR expires_on >= ?) ORDER BY pinned DESC, id DESC LIMIT 5`, today);
    out.announcements = a; out.personal = true;
    return json(out);
  }
  await sweep(env, ctx);

  const [books, copies, res, stu, stf, loans, resv, fines, recentStudents] = await Promise.all([
    one(`SELECT COUNT(*) AS n FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND archived = 0`),
    one(`SELECT COUNT(*) AS total, SUM(status='available') AS avail, SUM(status='lost') AS lost, SUM(status='damaged') AS damaged FROM ins_book_copies WHERE institution_id = ?`),
    one(`SELECT COUNT(*) AS n FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL`),
    one(`SELECT COUNT(*) AS n, SUM(status='active') AS active FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL`),
    one(`SELECT COUNT(*) AS n FROM ins_staff WHERE institution_id = ? AND deleted_at IS NULL AND status != 'left'`),
    one(`SELECT COUNT(*) AS active, SUM(due_date < ?2) AS overdue, SUM(due_date = ?2) AS due_today, COUNT(DISTINCT borrower_type || borrower_id) AS borrowers FROM ins_loans WHERE institution_id = ?1 AND status = 'borrowed'`, today),
    one(`SELECT COUNT(*) AS n FROM ins_reservations WHERE institution_id = ? AND status IN ('waiting','ready')`),
    one(`SELECT COALESCE(SUM(amount),0) AS t FROM ins_fines WHERE institution_id = ? AND status = 'unpaid'`),
    all(`SELECT id, full_name, student_no, created_at FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 5`),
  ]);
  out.cards = [
    { key: 'students', label: 'Students', value: n(stu.n), sub: `${n(stu.active)} active`, link: '#students', perm: 'students.view' },
    { key: 'staff', label: 'Staff', value: n(stf.n), link: '#staff', perm: 'staff.view' },
    { key: 'books', label: 'Book titles', value: n(books.n), sub: `${n(copies.avail)} of ${n(copies.total)} copies on the shelf`, link: '#books', perm: 'books.view' },
    { key: 'resources', label: 'Digital resources', value: n(res.n), link: '#elibrary', perm: 'resources.view' },
    { key: 'active_loans', label: 'Books on loan', value: n(loans.active), sub: `${n(loans.borrowers)} borrower(s)`, link: '#loans', perm: 'loans.view' },
    { key: 'overdue', label: 'Overdue', value: n(loans.overdue), tone: n(loans.overdue) ? 'bad' : 'good', link: '#loans?filter=overdue', perm: 'loans.view' },
    { key: 'due_today', label: 'Due today', value: n(loans.due_today), link: '#loans?filter=due_today', perm: 'loans.view' },
    { key: 'reserved', label: 'Reservations', value: n(resv.n), link: '#reservations', perm: 'loans.view' },
    { key: 'lost', label: 'Lost / damaged copies', value: n(copies.lost) + n(copies.damaged), sub: `${n(copies.lost)} lost · ${n(copies.damaged)} damaged`, link: '#books', perm: 'books.view' },
    { key: 'fines', label: 'Unpaid fines', value: round2(fines.t), unit: ctx.inst.currency, link: '#fines', perm: 'loans.view' },
  ].filter((c) => can(ctx, c.perm));

  if (can(ctx, 'loans.view')) {
    out.lists.most_borrowed = await all(`SELECT b.id, b.title, b.author, COUNT(*) AS times FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.institution_id = ? GROUP BY b.id ORDER BY times DESC, b.title LIMIT 5`);
    out.lists.due_soon = await all(`SELECT l.id, l.due_date, b.title, CASE l.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = l.borrower_id) END AS borrower_name
      FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.institution_id = ? AND l.status = 'borrowed' AND l.due_date <= ? ORDER BY l.due_date LIMIT 6`, addDays(today, 2));
    // loans issued per day, last 14 days
    const since = addDays(today, -13);
    const days = await all(`SELECT issued_on AS d, COUNT(*) AS n FROM ins_loans WHERE institution_id = ? AND issued_on >= ? GROUP BY issued_on`, since);
    const map = new Map(days.map((r) => [r.d, r.n]));
    out.lists.loans_trend = Array.from({ length: 14 }, (_, i) => { const d = addDays(since, i); return { date: d, count: map.get(d) || 0 }; });
  }
  if (can(ctx, 'students.view')) out.lists.recent_students = recentStudents;
  if (can(ctx, 'audit.view')) out.lists.activity = await all(`SELECT a.action, a.module, a.details, a.status, a.created_at, u.name AS user FROM ins_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.institution_id = ? ORDER BY a.id DESC LIMIT 8`);
  if (can(ctx, 'academics.view')) {
    out.lists.programme_counts = await all(`SELECT COALESCE(p.name,'No programme') AS name, COUNT(*) AS n FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id WHERE s.institution_id = ? AND s.deleted_at IS NULL AND s.status = 'active' GROUP BY p.id ORDER BY n DESC LIMIT 6`);
    const acad = await one(`SELECT AVG(marks) AS avg, COUNT(*) AS n FROM ins_results WHERE institution_id = ?`);
    out.academic = { average: acad.avg == null ? null : round2(acad.avg), results: n(acad.n) };
  }
  out.announcements = await all(`SELECT title, body, created_at FROM ins_announcements WHERE institution_id = ? AND deleted_at IS NULL AND (expires_on IS NULL OR expires_on >= ?) ORDER BY pinned DESC, id DESC LIMIT 3`, today);
  return json(out);
});

// ---------------------------------------------------------------------
// Global search — only over the things the person is allowed to see
// ---------------------------------------------------------------------
export const globalSearch = secure(async ({ env, url, ctx }) => {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ q, groups: [] });
  const like = likeTerm(q); const id = ctx.inst.id; const groups = [];
  const jobs = [];
  const add = (perm, key, label, sql, binds, map) => { if (can(ctx, perm)) jobs.push(env.DB.prepare(sql).bind(id, ...binds).all().then((r) => { if (r.results.length) groups.push({ key, label, items: r.results.map(map) }); })); };
  add('books.view', 'books', 'Books', `SELECT id, title, author, isbn FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR isbn LIKE ? ESCAPE '\\') ORDER BY title LIMIT 5`, [like, like, like],
    (r) => ({ title: r.title, sub: r.author, link: `#books?open=${r.id}` }));
  add('resources.view', 'resources', 'Digital resources', `SELECT id, title, author FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL AND access_level IN ('public','members'${ctx.role === 'student' ? '' : ",'staff'"}) AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\') ORDER BY title LIMIT 5`, [like, like],
    (r) => ({ title: r.title, sub: r.author, link: '#elibrary' }));
  add('students.view', 'students', 'Students', `SELECT id, full_name, student_no FROM ins_students s WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR student_no LIKE ? ESCAPE '\\' OR reg_no LIKE ? ESCAPE '\\')
      ${ctx.role === 'teacher' ? `AND s.id IN (SELECT e.student_id FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id WHERE t.staff_id = ${Number(ctx.staffId) || 0})` : ''} ORDER BY full_name LIMIT 5`, [like, like, like],
    (r) => ({ title: r.full_name, sub: r.student_no, link: `#students?open=${r.id}` }));
  add('staff.view', 'staff', 'Staff', `SELECT id, full_name, staff_no, position FROM ins_staff WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR staff_no LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 5`, [like, like],
    (r) => ({ title: r.full_name, sub: r.position || r.staff_no, link: `#staff?open=${r.id}` }));
  add('academics.view', 'courses', 'Courses', `SELECT id, code, name FROM ins_courses WHERE institution_id = ? AND (name LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\') ORDER BY code LIMIT 5`, [like, like],
    (r) => ({ title: `${r.code} · ${r.name}`, sub: 'Course', link: '#courses' }));
  add('reports.view', 'reports', 'Reports', `SELECT ?1 AS x WHERE ('inventory borrowing overdue students activity lost damaged most used enrollment performance' LIKE ?2 ESCAPE '\\')`, [like], () => ({ title: 'Reports', sub: 'Open the reports centre', link: '#reports' }));
  await Promise.all(jobs);
  const order = ['books', 'resources', 'students', 'staff', 'courses', 'reports'];
  groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return json({ q, groups, total: groups.reduce((s, g) => s + g.items.length, 0) });
});

// ---------------------------------------------------------------------
// Reports — JSON for the screen, CSV for Excel, print view in the browser
// ---------------------------------------------------------------------
const csvCell = (v) => { const s = v == null ? '' : String(v); return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"` : s; };
const toCsv = (cols, rows) => '\uFEFF' + [cols.map((c) => csvCell(c.label)).join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c.key])).join(','))].join('\r\n');

const REPORTS = {
  inventory: { title: 'Library inventory', perm: 'reports.view', filters: ['category_id'] },
  borrowing: { title: 'Borrowing history', perm: 'reports.view', filters: ['from', 'to'] },
  returns: { title: 'Returns', perm: 'reports.view', filters: ['from', 'to'] },
  overdue: { title: 'Overdue resources', perm: 'reports.view', filters: [] },
  lost_damaged: { title: 'Lost & damaged resources', perm: 'reports.view', filters: [] },
  most_used: { title: 'Most-used resources', perm: 'reports.view', filters: ['from', 'to'] },
  user_activity: { title: 'Borrower activity', perm: 'reports.view', filters: ['from', 'to'] },
  student_list: { title: 'Student list', perm: 'students.view', filters: ['programme_id', 'department_id', 'status'] },
  enrollment: { title: 'Enrolment by course', perm: 'academics.view', filters: ['term_id'] },
  performance: { title: 'Academic performance', perm: 'academics.view', filters: ['term_id', 'programme_id'] },
  programme_stats: { title: 'Programme statistics', perm: 'academics.view', filters: [] },
  system_activity: { title: 'System activity', perm: 'audit.view', filters: ['from', 'to'] },
  resource_stats: { title: 'Operational & resource statistics', perm: 'reports.view', filters: [] },
};

export const reportCatalogue = secure(async ({ ctx }) => json({
  reports: Object.entries(REPORTS).filter(([, r]) => can(ctx, r.perm)).map(([key, r]) => ({ key, title: r.title, filters: r.filters })),
}));

async function buildReport(env, ctx, key, sp) {
  const id = ctx.inst.id; const today = localToday(ctx.off); const settings = await getSettings(env, id);
  const from = V.date(sp.get('from'), 'From date'); const to = V.date(sp.get('to'), 'To date');
  const intP = (k) => V.int(sp.get(k), k, { min: 1 });
  const run = (sql, ...b) => env.DB.prepare(sql).bind(id, ...b).all().then((r) => r.results);
  const who = `CASE l.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = l.borrower_id) END`;
  const whoNo = `CASE l.borrower_type WHEN 'student' THEN (SELECT student_no FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT staff_no FROM ins_staff WHERE id = l.borrower_id) END`;
  const dateSql = (col) => ({ sql: `${from ? ` AND ${col} >= ?` : ''}${to ? ` AND ${col} <= ?` : ''}`, binds: [from, to].filter(Boolean) });
  let cols; let rows; let summary = null;

  switch (key) {
    case 'inventory': {
      const cat = intP('category_id');
      rows = await run(`SELECT b.title, b.author, b.isbn, cat.name AS category, b.shelf, b.classification_no, b.publisher, b.pub_year, COUNT(c.id) AS copies, COALESCE(SUM(c.status='available'),0) AS available,
        COALESCE(SUM(c.status='borrowed'),0) AS borrowed, COALESCE(SUM(c.status='lost'),0) AS lost, COALESCE(SUM(c.status='damaged'),0) AS damaged
        FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id LEFT JOIN ins_book_copies c ON c.book_id = b.id
        WHERE b.institution_id = ? AND b.deleted_at IS NULL AND b.archived = 0${cat ? ' AND b.category_id = ?' : ''} GROUP BY b.id ORDER BY b.title`, ...(cat ? [cat] : []));
      cols = [['title', 'Title'], ['author', 'Author'], ['isbn', 'ISBN'], ['category', 'Category'], ['shelf', 'Shelf'], ['copies', 'Copies'], ['available', 'Available'], ['borrowed', 'Borrowed'], ['lost', 'Lost'], ['damaged', 'Damaged']];
      summary = { 'Titles': rows.length, 'Copies': rows.reduce((s, r) => s + r.copies, 0), 'Available': rows.reduce((s, r) => s + r.available, 0) }; break;
    }
    case 'borrowing': {
      const d = dateSql('l.issued_on');
      rows = await run(`SELECT l.issued_on, l.due_date, l.returned_on, l.status, b.title, c.accession_no, ${who} AS borrower, l.borrower_type AS type FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.institution_id = ?${d.sql} ORDER BY l.issued_on DESC, l.id DESC LIMIT 5000`, ...d.binds);
      cols = [['issued_on', 'Issued'], ['title', 'Title'], ['accession_no', 'Copy'], ['borrower', 'Borrower'], ['type', 'Type'], ['due_date', 'Due'], ['returned_on', 'Returned'], ['status', 'Status']];
      summary = { 'Loans': rows.length, 'Still out': rows.filter((r) => r.status === 'borrowed').length }; break;
    }
    case 'returns': {
      const d = dateSql('l.returned_on');
      rows = await run(`SELECT l.returned_on, l.due_date, l.return_condition AS condition, b.title, ${who} AS borrower, COALESCE((SELECT SUM(amount) FROM ins_fines f WHERE f.loan_id = l.id),0) AS fines FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.institution_id = ? AND l.returned_on IS NOT NULL${d.sql} ORDER BY l.returned_on DESC LIMIT 5000`, ...d.binds);
      cols = [['returned_on', 'Returned'], ['title', 'Title'], ['borrower', 'Borrower'], ['due_date', 'Was due'], ['condition', 'Condition'], ['fines', `Fines (${ctx.inst.currency})`]];
      summary = { 'Returns': rows.length, [`Fines (${ctx.inst.currency})`]: round2(rows.reduce((s, r) => s + r.fines, 0)) }; break;
    }
    case 'overdue': {
      rows = (await run(`SELECT l.due_date, b.title, c.accession_no, ${who} AS borrower, ${whoNo} AS borrower_no, l.borrower_type AS type FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.institution_id = ? AND l.status = 'borrowed' AND l.due_date < ? ORDER BY l.due_date`, today))
        .map((r) => ({ ...r, days_overdue: daysBetween(r.due_date, today), fine: round2(daysBetween(r.due_date, today) * settings.fine_per_day) }));
      cols = [['title', 'Title'], ['accession_no', 'Copy'], ['borrower', 'Borrower'], ['borrower_no', 'ID'], ['due_date', 'Due'], ['days_overdue', 'Days overdue'], ['fine', `Fine so far (${ctx.inst.currency})`]];
      summary = { 'Overdue books': rows.length, [`Fines so far (${ctx.inst.currency})`]: round2(rows.reduce((s, r) => s + r.fine, 0)) }; break;
    }
    case 'lost_damaged': {
      rows = await run(`SELECT c.status, c.accession_no, b.title, b.author, b.price, c.note FROM ins_book_copies c JOIN ins_books b ON b.id = c.book_id WHERE c.institution_id = ? AND c.status IN ('lost','damaged') AND b.deleted_at IS NULL ORDER BY c.status, b.title`);
      cols = [['status', 'Status'], ['title', 'Title'], ['author', 'Author'], ['accession_no', 'Copy'], ['price', 'Value'], ['note', 'Note']];
      summary = { Lost: rows.filter((r) => r.status === 'lost').length, Damaged: rows.filter((r) => r.status === 'damaged').length }; break;
    }
    case 'most_used': {
      const d = dateSql('l.issued_on');
      rows = await run(`SELECT b.title, b.author, cat.name AS category, COUNT(*) AS times FROM ins_loans l JOIN ins_books b ON b.id = l.book_id LEFT JOIN ins_categories cat ON cat.id = b.category_id WHERE l.institution_id = ?${d.sql} GROUP BY b.id ORDER BY times DESC, b.title LIMIT 100`, ...d.binds);
      const dig = await run(`SELECT title, author, (views + downloads) AS times FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL AND (views + downloads) > 0 ORDER BY times DESC LIMIT 20`);
      rows = [...rows.map((r) => ({ ...r, kind: 'Book' })), ...dig.map((r) => ({ ...r, category: 'Digital', kind: 'Digital' }))].sort((a, b) => b.times - a.times);
      cols = [['title', 'Title'], ['author', 'Author'], ['kind', 'Kind'], ['category', 'Category'], ['times', 'Loans / views']]; break;
    }
    case 'user_activity': {
      const d = dateSql('l.issued_on');
      rows = await run(`SELECT ${who} AS borrower, ${whoNo} AS borrower_no, l.borrower_type AS type, COUNT(*) AS loans, SUM(l.status='borrowed') AS on_loan, COALESCE((SELECT SUM(amount) FROM ins_fines f WHERE f.borrower_type = l.borrower_type AND f.borrower_id = l.borrower_id AND f.status = 'unpaid'),0) AS unpaid
        FROM ins_loans l WHERE l.institution_id = ?${d.sql} GROUP BY l.borrower_type, l.borrower_id ORDER BY loans DESC LIMIT 500`, ...d.binds);
      cols = [['borrower', 'Borrower'], ['borrower_no', 'ID'], ['type', 'Type'], ['loans', 'Loans'], ['on_loan', 'On loan now'], ['unpaid', `Unpaid fines (${ctx.inst.currency})`]]; break;
    }
    case 'student_list': {
      const w = []; const b = [];
      if (intP('programme_id')) { w.push('s.programme_id = ?'); b.push(intP('programme_id')); }
      if (intP('department_id')) { w.push('s.department_id = ?'); b.push(intP('department_id')); }
      if (sp.get('status')) { w.push('s.status = ?'); b.push(V.oneOf(sp.get('status'), 'Status', ['active', 'suspended', 'graduated', 'withdrawn'], { required: true })); }
      if (ctx.role === 'teacher') { w.push(`s.id IN (SELECT e.student_id FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id WHERE t.staff_id = ?)`); b.push(ctx.staffId || 0); }
      rows = await run(`SELECT s.student_no, s.reg_no, s.full_name, s.gender, p.name AS programme, d.name AS department, s.class_name, s.level, s.status, s.phone FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id
        WHERE s.institution_id = ? AND s.deleted_at IS NULL${w.length ? ' AND ' + w.join(' AND ') : ''} ORDER BY s.full_name COLLATE NOCASE LIMIT 5000`, ...b);
      cols = [['student_no', 'Student ID'], ['full_name', 'Name'], ['gender', 'Gender'], ['programme', 'Programme'], ['department', 'Department'], ['class_name', 'Class'], ['level', 'Level'], ['status', 'Status'], ['phone', 'Phone']];
      summary = { Students: rows.length }; break;
    }
    case 'enrollment': {
      const term = intP('term_id');
      rows = await run(`SELECT c.code, c.name, t.name AS term, COUNT(e.id) AS enrolled, SUM(r.id IS NOT NULL) AS marked FROM ins_enrollments e JOIN ins_courses c ON c.id = e.course_id JOIN ins_terms t ON t.id = e.term_id LEFT JOIN ins_results r ON r.enrollment_id = e.id
        WHERE e.institution_id = ? AND e.status != 'dropped'${term ? ' AND e.term_id = ?' : ''} GROUP BY e.course_id, e.term_id ORDER BY c.code`, ...(term ? [term] : []));
      cols = [['code', 'Code'], ['name', 'Course'], ['term', 'Term'], ['enrolled', 'Enrolled'], ['marked', 'Marks entered']]; break;
    }
    case 'performance': {
      const term = intP('term_id'); const prog = intP('programme_id');
      rows = await run(`SELECT c.code, c.name, COUNT(*) AS students, ROUND(AVG(r.marks),1) AS average, MAX(r.marks) AS highest, MIN(r.marks) AS lowest, ROUND(100.0 * SUM(r.marks >= 40) / COUNT(*), 0) AS pass_rate
        FROM ins_results r JOIN ins_courses c ON c.id = r.course_id WHERE r.institution_id = ?${term ? ' AND r.term_id = ?' : ''}${prog ? ' AND c.programme_id = ?' : ''} GROUP BY c.id ORDER BY c.code`, ...[term, prog].filter(Boolean));
      cols = [['code', 'Code'], ['name', 'Course'], ['students', 'Students'], ['average', 'Average'], ['highest', 'Highest'], ['lowest', 'Lowest'], ['pass_rate', 'Pass rate %']]; break;
    }
    case 'programme_stats': {
      rows = await run(`SELECT COALESCE(p.name,'(No programme)') AS programme, d.name AS department, COUNT(*) AS students, SUM(s.status='active') AS active, SUM(s.status='graduated') AS graduated, SUM(s.gender='female') AS female, SUM(s.gender='male') AS male
        FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = p.department_id WHERE s.institution_id = ? AND s.deleted_at IS NULL GROUP BY p.id ORDER BY students DESC`);
      cols = [['programme', 'Programme'], ['department', 'Department'], ['students', 'Students'], ['active', 'Active'], ['graduated', 'Graduated'], ['female', 'Female'], ['male', 'Male']]; break;
    }
    case 'system_activity': {
      const d = dateSql('substr(a.created_at,1,10)');
      rows = await run(`SELECT a.created_at, u.name AS user, a.module, a.action, a.entity, a.details, a.status FROM ins_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.institution_id = ?${d.sql} ORDER BY a.id DESC LIMIT 2000`, ...d.binds);
      cols = [['created_at', 'When (UTC)'], ['user', 'User'], ['module', 'Module'], ['action', 'Action'], ['details', 'Details'], ['status', 'Result']]; break;
    }
    case 'resource_stats': {
      const r = (await run(`SELECT (SELECT COUNT(*) FROM ins_books WHERE institution_id = ?1 AND deleted_at IS NULL) AS titles, (SELECT COUNT(*) FROM ins_book_copies WHERE institution_id = ?1) AS copies,
        (SELECT COUNT(*) FROM ins_resources WHERE institution_id = ?1 AND deleted_at IS NULL) AS digital, (SELECT COALESCE(SUM(file_size),0) FROM ins_resources WHERE institution_id = ?1 AND deleted_at IS NULL) AS bytes,
        (SELECT COUNT(*) FROM ins_students WHERE institution_id = ?1 AND deleted_at IS NULL) AS students, (SELECT COUNT(*) FROM ins_staff WHERE institution_id = ?1 AND deleted_at IS NULL) AS staff,
        (SELECT COUNT(*) FROM ins_loans WHERE institution_id = ?1) AS loans, (SELECT COUNT(*) FROM ins_courses WHERE institution_id = ?1) AS courses`))[0];
      rows = [['Book titles', r.titles], ['Physical copies', r.copies], ['Digital resources', r.digital], ['Digital storage (MB)', round2(r.bytes / 1048576)], ['Students', r.students], ['Staff', r.staff], ['Courses', r.courses], ['Loans recorded', r.loans]].map(([k, v]) => ({ item: k, value: v }));
      cols = [['item', 'Item'], ['value', 'Value']]; break;
    }
    default: fail(404, 'That report does not exist.');
  }
  return { key, title: REPORTS[key].title, columns: cols.map(([k, l]) => ({ key: k, label: l })), rows, summary, generated: new Date().toISOString(), currency: ctx.inst.currency };
}

export const runReport = secure(async ({ request, env, params, url, ctx }) => {
  const def = REPORTS[params.key];
  if (!def) fail(404, 'That report does not exist.');
  if (!can(ctx, def.perm)) fail(403, 'You do not have permission to perform this action.');
  const rep = await buildReport(env, ctx, params.key, url.searchParams);
  if (url.searchParams.get('format') === 'csv') {
    const { audit } = await import('../../lib/institution-auth.js');
    await audit(env, request, ctx, 'reports', 'report.export', 'report', null, `${def.title} (CSV)`);
    return new Response(toCsv(rep.columns, rep.rows), { headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${params.key}-${localToday(ctx.off)}.csv"`, 'Cache-Control': 'no-store' } });
  }
  return json(rep);
});

// ---------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------
export const auditLog = secure({ perm: 'audit.view' }, async ({ env, url, ctx }) => {
  const sp = url.searchParams; const { page, limit, offset } = paging(url, 30, 100);
  const where = ['a.institution_id = ?1']; const binds = [ctx.inst.id];
  const add = (sql, v) => { where.push(sql.replace('?', `?${binds.length + 1}`)); binds.push(v); };
  if (sp.get('module')) add('a.module = ?', V.str(sp.get('module'), 'Module', { max: 30 }));
  if (sp.get('status')) add('a.status = ?', V.oneOf(sp.get('status'), 'Result', ['success', 'failed'], { required: true }));
  if (sp.get('user_id')) add('a.user_id = ?', V.int(sp.get('user_id'), 'User', { min: 1 }));
  if (sp.get('q')) add(`(a.action LIKE ? ESCAPE '\\' OR a.details LIKE ?1 ESCAPE '\\')`.replace('?1', `?${binds.length + 1}`), likeTerm(sp.get('q')));
  if (sp.get('from')) add('substr(a.created_at,1,10) >= ?', V.date(sp.get('from'), 'From'));
  if (sp.get('to')) add('substr(a.created_at,1,10) <= ?', V.date(sp.get('to'), 'To'));
  const from = `FROM ins_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE ${where.join(' AND ')}`;
  const [{ results }, c, mods] = await Promise.all([
    env.DB.prepare(`SELECT a.id, a.created_at, a.module, a.action, a.entity, a.entity_id, a.details, a.status, a.ip, a.user_agent, u.name AS user ${from} ORDER BY a.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first(),
    env.DB.prepare('SELECT DISTINCT module FROM ins_audit_logs WHERE institution_id = ? AND module IS NOT NULL ORDER BY module').bind(ctx.inst.id).all(),
  ]);
  return json({ logs: results, total: c.n, page, limit, modules: mods.results.map((m) => m.module) });
});

// ---------------------------------------------------------------------
// System health — readable status, never raw errors
// ---------------------------------------------------------------------
export const health = secure({ perm: 'health.view' }, async ({ env, ctx }) => {
  const id = ctx.inst.id; const checks = [];
  const t0 = Date.now();
  let dbOk = true; try { await env.DB.prepare('SELECT 1').first(); } catch (e) { dbOk = false; }
  checks.push({ key: 'database', label: 'Database', ok: dbOk, detail: dbOk ? `Responding (${Date.now() - t0} ms)` : 'Not responding — please contact your technical administrator.' });
  const storageOk = !!env.MATERIALS;
  checks.push({ key: 'storage', label: 'File storage', ok: storageOk, detail: storageOk ? 'Connected' : 'Not configured — uploads and backups will not work.' });
  const [files, err, logins, lastBackup, loans, last] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(file_size),0) AS bytes FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL`).bind(id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_audit_logs WHERE institution_id = ? AND status = 'failed' AND created_at > datetime('now','-1 day')`).bind(id).first(),
    env.DB.prepare(`SELECT SUM(a.action = 'user.login' AND a.status = 'success') AS ok, SUM(a.action = 'user.login' AND a.status = 'failed') AS bad FROM ins_audit_logs a WHERE a.institution_id = ? AND a.created_at > datetime('now','-1 day')`).bind(id).first(),
    env.DB.prepare('SELECT created_at, verified_ok FROM ins_backups WHERE institution_id = ? ORDER BY id DESC LIMIT 1').bind(id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE institution_id = ?`).bind(id).first(),
    env.DB.prepare('SELECT created_at FROM ins_audit_logs WHERE institution_id = ? ORDER BY id DESC LIMIT 1').bind(id).first(),
  ]);
  const ageDays = lastBackup ? (Date.now() - Date.parse(lastBackup.created_at.replace(' ', 'T') + 'Z')) / 86400000 : null;
  checks.push({ key: 'backup', label: 'Backups', ok: ageDays != null && ageDays <= 7, warn: ageDays == null || ageDays > 7,
    detail: ageDays == null ? 'No backup yet. Create one in Backup & restore.' : ageDays > 7 ? `The last backup is ${Math.floor(ageDays)} days old. Please create a new one.` : `Last backup ${ageDays < 1 ? 'today' : Math.floor(ageDays) + ' day(s) ago'}${lastBackup.verified_ok === 0 ? ' — FAILED verification!' : ''}` });
  checks.push({ key: 'errors', label: 'Failed actions (24 h)', ok: n(err.n) < 10, detail: `${n(err.n)} failed action(s) in the last 24 hours` });
  checks.push({ key: 'auth', label: 'Sign-ins (24 h)', ok: n(logins.bad) < 20, detail: `${n(logins.ok)} successful, ${n(logins.bad)} failed` });
  checks.push({ key: 'api', label: 'Service', ok: true, detail: 'Running' });
  return json({ checks, storage: { files: files.n, mb: round2(files.bytes / 1048576) }, loans_recorded: loans.n, last_activity: last ? last.created_at : null, all_ok: checks.every((c) => c.ok) });
});
