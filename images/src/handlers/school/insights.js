// School System — dashboards, reports, notifications, audit log, global search, parent portal.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, can, likeTerm, paging, currentYear, getSettings, teacherClassIds, parentStudentIds,
} from '../../lib/school-auth.js';
import { studentFullName, todayISO, round2, attendancePercent, feeStatusFromTotals, gradeFor, ordinal } from '../../lib/school-calc.js';
import { feeColumns, feeFromRow, monthRange, weekRange, SQL_FULL_NAME, CLASS_ORDER } from '../../lib/school-queries.js';
import { absenceAlerts, financeRows } from './operations.js';
import { loadSheet } from './academics.js';

const classLabel = (c) => `${c.name}${c.stream ? ' ' + c.stream : ''}`;

// ---------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------
async function attRange(env, sid, from, to, classIds) {
  const where = ['school_id = ?', 'date >= ?', 'date <= ?']; const binds = [sid, from, to];
  if (classIds) { if (!classIds.length) return { present: 0, absent: 0, late: 0, percent: null }; where.push(`class_id IN (${classIds.map(() => '?').join(',')})`); binds.push(...classIds); }
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(status = 'present'), 0) AS present, COALESCE(SUM(status = 'absent'), 0) AS absent, COALESCE(SUM(status = 'late'), 0) AS late FROM sch_attendance WHERE ${where.join(' AND ')}`
  ).bind(...binds).first();
  return { ...r, percent: attendancePercent(r.present, r.absent, r.late) };
}

export const dashboard = secure({}, async ({ env, ctx }) => {
  const sid = ctx.school.id; const today = todayISO();
  const year = await currentYear(env, sid).catch(() => null);
  const isTeacher = ctx.role === 'teacher';
  const classIds = isTeacher ? await teacherClassIds(env, ctx) : null;
  const out = { role: ctx.role, year: year ? year.name : null, today };
  const one = (sql, ...b) => env.DB.prepare(sql).bind(...b).first();
  const many = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);

  const inClasses = classIds ? `AND e.class_id IN (${classIds.length ? classIds.join(',') : '0'})` : '';
  if (can(ctx, 'students.view')) {
    const yid = year ? year.id : 0;
    const totals = await one(
      `SELECT COUNT(*) AS total, COALESCE(SUM(s.status = 'active'), 0) AS active,
              COALESCE(SUM(s.admission_date >= date('now', '-30 days')), 0) AS new_students,
              COALESCE(SUM(s.gender = 'male'), 0) AS male, COALESCE(SUM(s.gender = 'female'), 0) AS female
       FROM sch_students s ${classIds || true ? `LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${yid}` : ''}
       WHERE s.school_id = ? ${isTeacher ? 'AND e.class_id IS NOT NULL ' + inClasses : ''}`, sid);
    out.students = totals;
  }
  if (ctx.role === 'admin' || can(ctx, 'teachers.manage')) {
    out.teachers = (await one(`SELECT COUNT(*) AS total, COALESCE(SUM(employment_status != 'resigned'), 0) AS active FROM sch_teachers WHERE school_id = ?`, sid));
  }
  if (can(ctx, 'attendance.view') || can(ctx, 'attendance.take')) {
    const [ms, me] = monthRange(today); const [ws, we] = weekRange(today);
    const [d, w, m] = await Promise.all([attRange(env, sid, today, today, classIds), attRange(env, sid, ws, we, classIds), attRange(env, sid, ms, me, classIds)]);
    out.attendance = { today: d, week: w, month: m };
    const alerts = await absenceAlerts(env, ctx, { classIds, limit: 8 });
    out.absence_alerts = alerts.alerts; out.absence_threshold = alerts.threshold;
  }
  if (can(ctx, 'fees.view') && year) {
    const rows = await financeRows(env, ctx, {});
    const counts = { paid: 0, partial: 0, pending: 0, overdue: 0 };
    let outstanding = 0; let withBalance = 0; let overdueAmt = 0; let pendingAmt = 0; let partialAmt = 0; let expected = 0; let paidSum = 0;
    rows.forEach((r) => {
      counts[r.status] += 1; expected += r.total; paidSum += r.paid; outstanding += r.balance;
      if (r.balance > 0) withBalance += 1;
      if (r.status === 'overdue') overdueAmt += r.balance; if (r.status === 'pending') pendingAmt += r.balance; if (r.status === 'partial') partialAmt += r.balance;
    });
    const monthly = await many(
      `SELECT substr(payment_date, 1, 7) AS month, SUM(amount) AS total FROM sch_payments WHERE school_id = ? AND academic_year_id = ? GROUP BY substr(payment_date, 1, 7) ORDER BY month DESC LIMIT 6`, sid, year.id);
    const todayPay = await one('SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n FROM sch_payments WHERE school_id = ? AND payment_date = ?', sid, today);
    out.fees = {
      collected: round2(paidSum), expected: round2(expected), outstanding: round2(outstanding), students_with_balance: withBalance, counts,
      amounts: { paid: round2(paidSum), pending: round2(pendingAmt + partialAmt), overdue: round2(overdueAmt) },
      monthly: monthly.reverse(), today: { total: round2(todayPay.total), count: todayPay.n }, currency: ctx.school.currency,
    };
  }
  if (can(ctx, 'results.view') && year) {
    const clsFilter = classIds ? `AND x.class_id IN (${classIds.length ? classIds.join(',') : '0'})` : '';
    const [byClass, bySubject, byExam] = await Promise.all([
      many(`SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END AS label, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average
            FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_classes c ON c.id = x.class_id
            WHERE r.school_id = ? AND x.academic_year_id = ? ${clsFilter} GROUP BY c.id ORDER BY ${CLASS_ORDER}, c.name`, sid, year.id),
      many(`SELECT sub.name AS label, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average
            FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_subjects sub ON sub.id = r.subject_id
            WHERE r.school_id = ? AND x.academic_year_id = ? ${clsFilter} GROUP BY sub.id ORDER BY average DESC`, sid, year.id),
      many(`SELECT x.name || ' · ' || c.name AS label, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average
            FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_classes c ON c.id = x.class_id
            WHERE r.school_id = ? AND x.academic_year_id = ? ${clsFilter} GROUP BY x.id ORDER BY COALESCE(x.exam_date, x.created_at) DESC LIMIT 8`, sid, year.id),
    ]);
    out.performance = { by_class: byClass, by_subject: bySubject, by_exam: byExam.reverse() };
  }
  if (isTeacher) {
    const dow = ((new Date().getUTCDay() + 6) % 7) + 1;
    out.my_classes = classIds.length ? await many(
      `SELECT c.id, c.name, c.stream, (SELECT COUNT(*) FROM sch_enrollments e WHERE e.class_id = c.id) AS students FROM sch_classes c WHERE c.id IN (${classIds.join(',')}) ORDER BY c.name`) : [];
    out.today_timetable = ctx.teacherId ? await many(
      `SELECT tt.start_time, tt.end_time, tt.room, sub.name AS subject, c.name AS class_name, c.stream FROM sch_timetable tt JOIN sch_subjects sub ON sub.id = tt.subject_id
       JOIN sch_classes c ON c.id = tt.class_id WHERE tt.school_id = ? AND tt.teacher_id = ? AND tt.day_of_week = ? ORDER BY tt.start_time`, sid, ctx.teacherId, dow) : [];
  }
  if (can(ctx, 'audit.view')) {
    out.recent_activity = await many(
      `SELECT a.action, a.details, a.created_at, u.name AS user_name FROM sch_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.school_id = ? ORDER BY a.id DESC LIMIT 8`, sid);
  }
  return json(out);
});

// ---------------------------------------------------------------------
// Parent portal
// ---------------------------------------------------------------------
export const portal = secure({ parent: true, roles: ['parent'] }, async ({ env, ctx }) => {
  const ids = await parentStudentIds(env, ctx);
  const year = await currentYear(env, ctx.school.id).catch(() => null);
  if (!ids.length) return json({ children: [], parent_name: ctx.user.name });
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.status, (s.photo_key IS NOT NULL) AS has_photo,
            e.class_id, c.name AS class_name, c.stream, ${feeColumns(todayISO())},
            (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'present') AS att_present,
            (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'absent') AS att_absent,
            (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'late') AS att_late
     FROM sch_students s LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${year ? year.id : 0}
     LEFT JOIN sch_classes c ON c.id = e.class_id WHERE s.id IN (${ids.map(() => '?').join(',')}) AND s.school_id = ? ORDER BY s.first_name`
  ).bind(...ids, ctx.school.id).all();
  const children = [];
  for (const r of results) {
    const fee = feeFromRow(r);
    let latest = null;
    const ex = await env.DB.prepare(
      `SELECT x.* FROM sch_examinations x JOIN sch_results rs ON rs.exam_id = x.id WHERE rs.student_id = ? ORDER BY COALESCE(x.exam_date, x.created_at) DESC, x.id DESC LIMIT 1`
    ).bind(r.id).first();
    if (ex) {
      const { sheet } = await loadSheet(env, ctx, ex);
      const row = sheet.rows.find((x) => x.student_id === r.id);
      if (row && row.subject_count) latest = { exam_id: ex.id, exam_name: ex.name, average: row.average, grade: row.grade, position: row.position, out_of: sheet.out_of, position_label: `${ordinal(row.position)} / ${sheet.out_of}` };
    }
    children.push({
      id: r.id, admission_no: r.admission_no, full_name: studentFullName(r), gender: r.gender, status: r.status, has_photo: !!r.has_photo,
      class_name: r.class_name ? classLabel({ name: r.class_name, stream: r.stream }) : null,
      attendance_percent: attendancePercent(r.att_present, r.att_absent, r.att_late), attendance: { present: r.att_present, absent: r.att_absent, late: r.att_late },
      fee: { total: fee.total, paid: fee.paid, balance: fee.balance, status: fee.status }, latest_result: latest,
    });
  }
  return json({ children, parent_name: ctx.user.name, currency: ctx.school.currency });
});

// ---------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------
async function visibilityClause(env, ctx) {
  if (can(ctx, 'announcements.manage')) return { sql: '1 = 1', binds: [] };
  if (ctx.role === 'teacher') {
    const ids = await teacherClassIds(env, ctx);
    return { sql: `(n.audience IN ('all','teachers') OR (n.audience = 'class' AND n.class_id IN (${ids.length ? ids.join(',') : '0'})))`, binds: [] };
  }
  if (ctx.role === 'parent') {
    const kids = await parentStudentIds(env, ctx);
    const kidList = kids.length ? kids.join(',') : '0';
    return {
      sql: `(n.audience IN ('all','parents') OR (n.audience = 'student' AND n.student_id IN (${kidList}))
             OR (n.audience = 'class' AND n.class_id IN (SELECT class_id FROM sch_enrollments WHERE student_id IN (${kidList}))))`, binds: [],
    };
  }
  return { sql: `n.audience = 'all'`, binds: [] };
}

export const listNotifications = secure({ parent: true }, async ({ env, url, ctx }) => {
  const vis = await visibilityClause(env, ctx);
  const { page, limit, offset } = paging(url, 30, 100);
  const where = ['n.school_id = ?', vis.sql]; const binds = [ctx.school.id, ...vis.binds];
  const type = url.searchParams.get('type');
  if (type) { where.push('n.type = ?'); binds.push(type); }
  const { results } = await env.DB.prepare(
    `SELECT n.id, n.title, n.message, n.type, n.audience, n.class_id, n.student_id, n.created_at, (nr.user_id IS NOT NULL) AS is_read, u.name AS created_by_name,
            c.name AS class_name, c.stream AS class_stream, s.first_name AS student_first, s.last_name AS student_last
     FROM sch_notifications n LEFT JOIN sch_notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
     LEFT JOIN users u ON u.id = n.created_by LEFT JOIN sch_classes c ON c.id = n.class_id LEFT JOIN sch_students s ON s.id = n.student_id
     WHERE ${where.join(' AND ')} ORDER BY n.id DESC LIMIT ? OFFSET ?`
  ).bind(ctx.user.id, ...binds, limit, offset).all();
  const unread = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sch_notifications n WHERE n.school_id = ? AND ${vis.sql} AND NOT EXISTS (SELECT 1 FROM sch_notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = ?)`
  ).bind(ctx.school.id, ctx.user.id).first();
  return json({
    notifications: results.map((r) => ({ ...r, is_read: !!r.is_read, class_label: r.class_name ? classLabel({ name: r.class_name, stream: r.class_stream }) : null, student_name: r.student_first ? `${r.student_first} ${r.student_last}` : null })),
    unread: unread.n,
  });
});

export const createNotification = secure({ perm: 'announcements.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const title = V.str(b.title, 'Title', { required: true, max: 120 });
  const message = V.str(b.message, 'Message', { required: true, max: 2000 });
  const type = V.oneOf(b.type, 'Type', ['fee_reminder', 'attendance_warning', 'exam_announcement', 'class_announcement', 'general'], { def: 'general' });
  const audience = V.oneOf(b.audience, 'Send to', ['all', 'teachers', 'parents', 'class', 'student'], { required: true });
  let classId = null; let studentId = null;
  if (audience === 'class') {
    const c = await env.DB.prepare('SELECT id FROM sch_classes WHERE id = ? AND school_id = ?').bind(V.int(b.class_id, 'Class', { required: true, min: 1 }), ctx.school.id).first();
    if (!c) fail(400, 'Please choose a valid class.');
    classId = c.id;
  }
  if (audience === 'student') {
    const s = await env.DB.prepare('SELECT id FROM sch_students WHERE id = ? AND school_id = ?').bind(V.int(b.student_id, 'Student', { required: true, min: 1 }), ctx.school.id).first();
    if (!s) fail(400, 'Please choose a valid student.');
    studentId = s.id;
  }
  const r = await env.DB.prepare(
    'INSERT INTO sch_notifications (school_id, title, message, type, audience, class_id, student_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(ctx.school.id, title, message, type, audience, classId, studentId, ctx.user.id).run();
  await audit(env, request, ctx, 'notification.create', 'notification', r.meta.last_row_id, `${type} → ${audience}: ${title}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const markRead = secure({ parent: true }, async ({ env, params, ctx }) => {
  const vis = await visibilityClause(env, ctx);
  const n = await env.DB.prepare(`SELECT n.id FROM sch_notifications n WHERE n.id = ? AND n.school_id = ? AND ${vis.sql}`).bind(params.id, ctx.school.id).first();
  if (n) await env.DB.prepare('INSERT OR IGNORE INTO sch_notification_reads (notification_id, user_id) VALUES (?, ?)').bind(n.id, ctx.user.id).run();
  return json({ ok: true });
});

export const markAllRead = secure({ parent: true }, async ({ env, ctx }) => {
  const vis = await visibilityClause(env, ctx);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO sch_notification_reads (notification_id, user_id) SELECT n.id, ? FROM sch_notifications n WHERE n.school_id = ? AND ${vis.sql}`
  ).bind(ctx.user.id, ctx.school.id).run();
  return json({ ok: true });
});

export const deleteNotification = secure({ perm: 'announcements.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM sch_notifications WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, 'Notification not found.');
  await audit(env, request, ctx, 'notification.delete', 'notification', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Audit log
// ---------------------------------------------------------------------
export const listAudit = secure({ perm: 'audit.view' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 50, 200);
  const where = ['a.school_id = ?']; const binds = [ctx.school.id];
  const userId = Number(url.searchParams.get('user_id') || 0);
  if (userId) { where.push('a.user_id = ?'); binds.push(userId); }
  const action = (url.searchParams.get('action') || '').trim();
  if (action) { where.push(`a.action LIKE ? ESCAPE '\\'`); binds.push(likeTerm(action).slice(1)); }
  const from = V.date(url.searchParams.get('from'), 'From'); const to = V.date(url.searchParams.get('to'), 'To');
  if (from) { where.push('date(a.created_at) >= ?'); binds.push(from); }
  if (to) { where.push('date(a.created_at) <= ?'); binds.push(to); }
  const q = (url.searchParams.get('q') || '').trim();
  if (q) { where.push(`(a.details LIKE ? ESCAPE '\\' OR a.action LIKE ? ESCAPE '\\')`); const l = likeTerm(q); binds.push(l, l); }
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sch_audit_logs a WHERE ${where.join(' AND ')}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.ip, a.user_agent, a.created_at, u.name AS user_name, u.email AS user_email
     FROM sch_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE ${where.join(' AND ')} ORDER BY a.id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  const { results: users } = await env.DB.prepare(
    'SELECT u.id, u.name FROM sch_members m JOIN users u ON u.id = m.user_id WHERE m.school_id = ? ORDER BY u.name'
  ).bind(ctx.school.id).all();
  return json({ logs: results, total: total.n, page, limit, users });
});

// ---------------------------------------------------------------------
// Global search
// ---------------------------------------------------------------------
export const search = secure({}, async ({ env, url, ctx }) => {
  const q = (url.searchParams.get('q') || '').trim();
  if (q.length < 2) return json({ results: {} });
  const like = likeTerm(q); const sid = ctx.school.id;
  const out = {};
  const tasks = [];
  if (can(ctx, 'students.view')) {
    let scope = ''; let year = 0;
    if (ctx.role === 'teacher') {
      const ids = await teacherClassIds(env, ctx);
      year = (await currentYear(env, sid)).id;
      scope = `AND s.id IN (SELECT student_id FROM sch_enrollments WHERE academic_year_id = ${year} AND class_id IN (${ids.length ? ids.join(',') : '0'}))`;
    }
    tasks.push(env.DB.prepare(
      `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status FROM sch_students s
       WHERE s.school_id = ? ${scope} AND (${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\' OR s.phone LIKE ? ESCAPE '\\')
       ORDER BY s.first_name LIMIT 6`).bind(sid, like, like, like).all()
      .then((r) => { out.students = r.results.map((s) => ({ id: s.id, title: studentFullName(s), sub: `${s.admission_no} · ${s.status}`, route: `student/${s.id}` })); }));
  }
  if (can(ctx, 'teachers.manage') || ctx.role === 'admin') {
    tasks.push(env.DB.prepare(`SELECT id, full_name, phone, email FROM sch_teachers WHERE school_id = ? AND (full_name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') LIMIT 5`).bind(sid, like, like, like).all()
      .then((r) => { out.teachers = r.results.map((t) => ({ id: t.id, title: t.full_name, sub: t.email || t.phone || 'Teacher', route: `teacher/${t.id}` })); }));
  }
  if (can(ctx, 'parents.manage')) {
    tasks.push(env.DB.prepare(`SELECT id, full_name, phone FROM sch_parents WHERE school_id = ? AND (full_name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') LIMIT 5`).bind(sid, like, like, like).all()
      .then((r) => { out.parents = r.results.map((p) => ({ id: p.id, title: p.full_name, sub: p.phone, route: `parent/${p.id}` })); }));
  }
  if (can(ctx, 'fees.view')) {
    tasks.push(env.DB.prepare(
      `SELECT p.id, p.amount, p.payment_date, r.receipt_no, s.first_name, s.last_name FROM sch_payments p JOIN sch_students s ON s.id = p.student_id LEFT JOIN sch_receipts r ON r.payment_id = p.id
       WHERE p.school_id = ? AND (r.receipt_no LIKE ? ESCAPE '\\' OR p.reference LIKE ? ESCAPE '\\' OR ${SQL_FULL_NAME} LIKE ? ESCAPE '\\') ORDER BY p.id DESC LIMIT 5`).bind(sid, like, like, like).all()
      .then((r) => { out.payments = r.results.map((p) => ({ id: p.id, title: `${p.receipt_no || 'Payment'} — ${p.first_name} ${p.last_name}`, sub: `${p.amount.toLocaleString()} ${ctx.school.currency} · ${p.payment_date}`, route: `receipt/${p.id}` })); }));
  }
  tasks.push(env.DB.prepare(`SELECT id, name, stream FROM sch_classes WHERE school_id = ? AND (name LIKE ? ESCAPE '\\' OR stream LIKE ? ESCAPE '\\') LIMIT 5`).bind(sid, like, like).all()
    .then((r) => { out.classes = r.results.map((c) => ({ id: c.id, title: classLabel(c), sub: 'Class', route: 'classes' })); }));
  if (can(ctx, 'results.view')) {
    tasks.push(env.DB.prepare(`SELECT x.id, x.name, c.name AS class_name FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id WHERE x.school_id = ? AND (x.name LIKE ? ESCAPE '\\' OR x.exam_type LIKE ? ESCAPE '\\') ORDER BY x.id DESC LIMIT 5`).bind(sid, like, like).all()
      .then((r) => { out.results = r.results.map((x) => ({ id: x.id, title: x.name, sub: `Results · ${x.class_name}`, route: `results/${x.id}` })); }));
  }
  await Promise.all(tasks);
  return json({ results: out });
});

// ---------------------------------------------------------------------
// Reports
// ---------------------------------------------------------------------
export const REPORT_CATALOGUE = [
  { group: 'Student Reports', group_key: 'students', items: [
    { key: 'students.list', label: 'Student list', filters: ['class_id', 'status'] },
    { key: 'students.new_admissions', label: 'New admissions', filters: ['from', 'to'] },
    { key: 'students.active', label: 'Active students', filters: ['class_id'] },
    { key: 'students.inactive', label: 'Inactive students', filters: ['class_id'] },
    { key: 'students.by_class', label: 'Students by class', filters: [] },
    { key: 'students.by_gender', label: 'Students by gender', filters: [] },
  ] },
  { group: 'Attendance Reports', group_key: 'attendance', items: [
    { key: 'attendance.daily', label: 'Daily attendance', filters: ['date'] },
    { key: 'attendance.monthly', label: 'Monthly attendance', filters: ['month'] },
    { key: 'attendance.student', label: 'Student attendance', filters: ['student_id', 'from', 'to'] },
    { key: 'attendance.class', label: 'Class attendance', filters: ['class_id', 'from', 'to'] },
    { key: 'attendance.absence', label: 'Absence report', filters: ['from', 'to'] },
  ] },
  { group: 'Financial Reports', group_key: 'finance', items: [
    { key: 'finance.daily', label: 'Daily collections', filters: ['date'] },
    { key: 'finance.monthly', label: 'Monthly collections', filters: ['month'] },
    { key: 'finance.outstanding', label: 'Outstanding balances', filters: ['class_id'] },
    { key: 'finance.payments', label: 'Payment history', filters: ['from', 'to', 'method'] },
    { key: 'finance.statement', label: 'Student fee statement', filters: ['student_id'] },
  ] },
  { group: 'Academic Reports', group_key: 'academic', items: [
    { key: 'academic.exam_results', label: 'Examination results', filters: ['exam_id'] },
    { key: 'academic.class_performance', label: 'Class performance', filters: ['class_id'] },
    { key: 'academic.subject_performance', label: 'Subject performance', filters: ['exam_id', 'class_id'] },
    { key: 'academic.student_performance', label: 'Student performance', filters: ['student_id'] },
  ] },
];

const genderLabel = (g) => (g === 'male' ? 'Male' : g === 'female' ? 'Female' : '');
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : '');

async function buildReport(env, ctx, key, q, year) {
  const sid = ctx.school.id; const cur = ctx.school.currency;
  const all = (sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results);
  const today = todayISO();
  const from = V.date(q.from, 'From date') || `${today.slice(0, 4)}-01-01`;
  const to = V.date(q.to, 'To date') || today;
  const classId = Number(q.class_id || 0);
  const studentBase = `FROM sch_students s LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${year.id} LEFT JOIN sch_classes c ON c.id = e.class_id WHERE s.school_id = ?`;
  const studentCols = `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.status, s.phone, s.admission_date, c.name AS cn, c.stream AS cs,
     (SELECT p.full_name FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_name,
     (SELECT p.phone FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_phone`;
  const studentColumns = [
    { key: 'admission_no', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'gender', label: 'Gender' }, { key: 'class', label: 'Class' },
    { key: 'parent', label: 'Parent / Guardian' }, { key: 'phone', label: 'Phone' }, { key: 'admission_date', label: 'Admitted' }, { key: 'status', label: 'Status' },
  ];
  const studentRow = (r) => ({ admission_no: r.admission_no, name: studentFullName(r), gender: genderLabel(r.gender), class: r.cn ? classLabel({ name: r.cn, stream: r.cs }) : '—', parent: r.parent_name || '—', phone: r.parent_phone || r.phone || '—', admission_date: r.admission_date, status: cap(r.status) });

  switch (key) {
    case 'students.list': case 'students.active': case 'students.inactive': case 'students.new_admissions': {
      const where = []; const binds = [sid];
      if (classId) { where.push('AND e.class_id = ?'); binds.push(classId); }
      if (key === 'students.active') where.push(`AND s.status = 'active'`);
      if (key === 'students.inactive') where.push(`AND s.status != 'active'`);
      if (key === 'students.list' && q.status) { where.push('AND s.status = ?'); binds.push(V.oneOf(q.status, 'Status', ['active', 'inactive', 'graduated', 'suspended', 'transferred'])); }
      if (key === 'students.new_admissions') { where.push('AND s.admission_date >= ? AND s.admission_date <= ?'); binds.push(from, to); }
      const rows = await all(`${studentCols} ${studentBase} ${where.join(' ')} ORDER BY s.first_name COLLATE NOCASE LIMIT 5000`, ...binds);
      const titles = { 'students.list': 'Student list', 'students.active': 'Active students', 'students.inactive': 'Inactive students', 'students.new_admissions': `New admissions (${from} to ${to})` };
      return { title: titles[key], columns: studentColumns, rows: rows.map(studentRow), summary: [`${rows.length} student${rows.length === 1 ? '' : 's'}`] };
    }
    case 'students.by_class': {
      const rows = await all(
        `SELECT c.name, c.stream, c.max_students, COALESCE(SUM(s.gender = 'male'), 0) AS male, COALESCE(SUM(s.gender = 'female'), 0) AS female, COUNT(s.id) AS total
         FROM sch_classes c LEFT JOIN sch_enrollments e ON e.class_id = c.id LEFT JOIN sch_students s ON s.id = e.student_id WHERE c.school_id = ? AND c.academic_year_id = ? GROUP BY c.id ORDER BY ${CLASS_ORDER}, c.name, c.stream`, sid, year.id);
      return { title: 'Students by class', columns: [{ key: 'class', label: 'Class' }, { key: 'male', label: 'Male', align: 'end' }, { key: 'female', label: 'Female', align: 'end' }, { key: 'total', label: 'Total', align: 'end' }, { key: 'capacity', label: 'Capacity', align: 'end' }],
        rows: rows.map((r) => ({ class: classLabel(r), male: r.male, female: r.female, total: r.total, capacity: r.max_students })), summary: [`${rows.reduce((s, r) => s + r.total, 0)} students in ${rows.length} classes`] };
    }
    case 'students.by_gender': {
      const rows = await all(`SELECT gender, COUNT(*) AS n FROM sch_students WHERE school_id = ? AND status = 'active' GROUP BY gender`, sid);
      const total = rows.reduce((s, r) => s + r.n, 0);
      return { title: 'Active students by gender', columns: [{ key: 'gender', label: 'Gender' }, { key: 'count', label: 'Students', align: 'end' }, { key: 'percent', label: 'Share', align: 'end' }],
        rows: rows.map((r) => ({ gender: genderLabel(r.gender), count: r.n, percent: total ? `${round2(r.n / total * 100)}%` : '—' })), summary: [`${total} active students`] };
    }
    case 'attendance.daily': case 'attendance.monthly': {
      const daily = key === 'attendance.daily';
      const date = V.date(q.date, 'Date') || today;
      const [a, b] = daily ? [date, date] : monthRange(`${(q.month || today.slice(0, 7))}-01`);
      const rows = await all(
        `SELECT c.name, c.stream, COALESCE(SUM(a.status = 'present'), 0) AS present, COALESCE(SUM(a.status = 'absent'), 0) AS absent, COALESCE(SUM(a.status = 'late'), 0) AS late
         FROM sch_classes c LEFT JOIN sch_attendance a ON a.class_id = c.id AND a.date >= ? AND a.date <= ? WHERE c.school_id = ? AND c.academic_year_id = ? GROUP BY c.id ORDER BY ${CLASS_ORDER}, c.name, c.stream`, a, b, sid, year.id);
      return { title: daily ? `Daily attendance — ${date}` : `Monthly attendance — ${a.slice(0, 7)}`,
        columns: [{ key: 'class', label: 'Class' }, { key: 'present', label: 'Present', align: 'end' }, { key: 'absent', label: 'Absent', align: 'end' }, { key: 'late', label: 'Late', align: 'end' }, { key: 'percent', label: 'Attendance %', align: 'end' }],
        rows: rows.map((r) => { const p = attendancePercent(r.present, r.absent, r.late); return { class: classLabel(r), present: r.present, absent: r.absent, late: r.late, percent: p == null ? '—' : `${p}%` }; }) };
    }
    case 'attendance.student': {
      const st = await env.DB.prepare('SELECT * FROM sch_students WHERE id = ? AND school_id = ?').bind(V.int(q.student_id, 'Student', { required: true, min: 1 }), sid).first();
      if (!st) fail(404, 'Student not found.');
      const rows = await all(`SELECT a.date, a.status, sub.name AS subject, c.name AS cn, c.stream AS cs FROM sch_attendance a JOIN sch_classes c ON c.id = a.class_id LEFT JOIN sch_subjects sub ON sub.id = a.subject_id WHERE a.student_id = ? AND a.date >= ? AND a.date <= ? ORDER BY a.date DESC`, st.id, from, to);
      const cnt = { present: 0, absent: 0, late: 0 }; rows.forEach((r) => { cnt[r.status] += 1; });
      return { title: `Attendance — ${studentFullName(st)} (${from} to ${to})`, columns: [{ key: 'date', label: 'Date' }, { key: 'class', label: 'Class' }, { key: 'subject', label: 'Session' }, { key: 'status', label: 'Status' }],
        rows: rows.map((r) => ({ date: r.date, class: classLabel({ name: r.cn, stream: r.cs }), subject: r.subject || 'Whole day', status: cap(r.status) })),
        summary: [`Present ${cnt.present}`, `Absent ${cnt.absent}`, `Late ${cnt.late}`, `Attendance ${attendancePercent(cnt.present, cnt.absent, cnt.late) ?? '—'}%`] };
    }
    case 'attendance.class': {
      const c = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(V.int(q.class_id, 'Class', { required: true, min: 1 }), sid).first();
      if (!c) fail(404, 'Class not found.');
      const rows = await all(
        `SELECT s.first_name, s.middle_name, s.last_name, s.admission_no, COALESCE(SUM(a.status = 'present'), 0) AS present, COALESCE(SUM(a.status = 'absent'), 0) AS absent, COALESCE(SUM(a.status = 'late'), 0) AS late
         FROM sch_enrollments e JOIN sch_students s ON s.id = e.student_id LEFT JOIN sch_attendance a ON a.student_id = s.id AND a.class_id = e.class_id AND a.date >= ? AND a.date <= ?
         WHERE e.class_id = ? GROUP BY s.id ORDER BY s.first_name COLLATE NOCASE`, from, to, c.id);
      return { title: `Class attendance — ${classLabel(c)} (${from} to ${to})`, columns: [{ key: 'admission_no', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'present', label: 'Present', align: 'end' }, { key: 'absent', label: 'Absent', align: 'end' }, { key: 'late', label: 'Late', align: 'end' }, { key: 'percent', label: 'Attendance %', align: 'end' }],
        rows: rows.map((r) => { const p = attendancePercent(r.present, r.absent, r.late); return { admission_no: r.admission_no, name: studentFullName(r), present: r.present, absent: r.absent, late: r.late, percent: p == null ? '—' : `${p}%` }; }) };
    }
    case 'attendance.absence': {
      const rows = await all(
        `SELECT s.first_name, s.middle_name, s.last_name, s.admission_no, COUNT(*) AS missed, MAX(a.date) AS last_absent,
           (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id WHERE e.student_id = s.id ORDER BY e.academic_year_id DESC LIMIT 1) AS class_name
         FROM sch_attendance a JOIN sch_students s ON s.id = a.student_id WHERE a.school_id = ? AND a.status = 'absent' AND a.date >= ? AND a.date <= ? GROUP BY s.id ORDER BY missed DESC LIMIT 1000`, sid, from, to);
      return { title: `Absence report (${from} to ${to})`, columns: [{ key: 'admission_no', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'class', label: 'Class' }, { key: 'missed', label: 'Sessions missed', align: 'end' }, { key: 'last', label: 'Last absent' }],
        rows: rows.map((r) => ({ admission_no: r.admission_no, name: studentFullName(r), class: r.class_name || '—', missed: r.missed, last: r.last_absent })) };
    }
    case 'finance.daily': case 'finance.payments': case 'finance.monthly': {
      const date = V.date(q.date, 'Date') || today;
      const [a, b] = key === 'finance.daily' ? [date, date] : key === 'finance.monthly' ? monthRange(`${(q.month || today.slice(0, 7))}-01`) : [from, to];
      const binds = [sid, a, b]; let extra = '';
      if (q.method) { extra = ' AND lower(p.method) = lower(?)'; binds.push(q.method); }
      const rows = await all(
        `SELECT p.payment_date, p.amount, p.method, p.reference, r.receipt_no, u.name AS received_by, s.first_name, s.middle_name, s.last_name, s.admission_no
         FROM sch_payments p JOIN sch_students s ON s.id = p.student_id LEFT JOIN sch_receipts r ON r.payment_id = p.id LEFT JOIN users u ON u.id = p.received_by
         WHERE p.school_id = ? AND p.payment_date >= ? AND p.payment_date <= ? ${extra} ORDER BY p.payment_date DESC, p.id DESC LIMIT 5000`, ...binds);
      const total = rows.reduce((s, r) => s + r.amount, 0);
      const titles = { 'finance.daily': `Daily collections — ${date}`, 'finance.monthly': `Monthly collections — ${a.slice(0, 7)}`, 'finance.payments': `Payment history (${a} to ${b})` };
      return { title: titles[key], columns: [{ key: 'date', label: 'Date' }, { key: 'receipt', label: 'Receipt' }, { key: 'student', label: 'Student' }, { key: 'admission_no', label: 'Student ID' }, { key: 'method', label: 'Method' }, { key: 'reference', label: 'Reference' }, { key: 'received_by', label: 'Received by' }, { key: 'amount', label: `Amount (${cur})`, align: 'end' }],
        rows: rows.map((r) => ({ date: r.payment_date, receipt: r.receipt_no, student: studentFullName(r), admission_no: r.admission_no, method: r.method, reference: r.reference || '—', received_by: r.received_by || '—', amount: r.amount.toLocaleString() })),
        summary: [`${rows.length} payment${rows.length === 1 ? '' : 's'}`, `Total ${total.toLocaleString()} ${cur}`] };
    }
    case 'finance.outstanding': {
      const rows = (await financeRows(env, ctx, { yearId: year.id, classId })).filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance);
      const total = rows.reduce((s, r) => s + r.balance, 0);
      return { title: 'Outstanding fee balances', columns: [{ key: 'admission_no', label: 'Student ID' }, { key: 'name', label: 'Name' }, { key: 'class', label: 'Class' }, { key: 'parent', label: 'Parent' }, { key: 'phone', label: 'Phone' }, { key: 'total', label: 'Total fees', align: 'end' }, { key: 'paid', label: 'Paid', align: 'end' }, { key: 'balance', label: 'Balance', align: 'end' }, { key: 'status', label: 'Status' }],
        rows: rows.map((r) => ({ admission_no: r.admission_no, name: r.full_name, class: r.class_name, parent: r.parent_name || '—', phone: r.parent_phone || '—', total: r.total.toLocaleString(), paid: r.paid.toLocaleString(), balance: r.balance.toLocaleString(), status: cap(r.status === 'partial' ? 'partially paid' : r.status) })),
        summary: [`${rows.length} students owe fees`, `Outstanding ${total.toLocaleString()} ${cur}`] };
    }
    case 'finance.statement': {
      const st = await env.DB.prepare('SELECT * FROM sch_students WHERE id = ? AND school_id = ?').bind(V.int(q.student_id, 'Student', { required: true, min: 1 }), sid).first();
      if (!st) fail(404, 'Student not found.');
      const enr = await env.DB.prepare('SELECT * FROM sch_enrollments WHERE student_id = ? AND academic_year_id = ?').bind(st.id, year.id).first();
      const items = enr ? await all('SELECT name, amount, due_date FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ? AND (class_id IS NULL OR class_id = ?) ORDER BY due_date IS NULL, due_date', sid, year.id, enr.class_id) : [];
      const pays = await all('SELECT p.payment_date, p.amount, p.method, p.reference, r.receipt_no FROM sch_payments p LEFT JOIN sch_receipts r ON r.payment_id = p.id WHERE p.student_id = ? AND p.academic_year_id = ? ORDER BY p.payment_date, p.id', st.id, year.id);
      const rows = [
        ...items.map((i) => ({ date: i.due_date || '—', description: `Fee: ${i.name}`, ref: '', charge: i.amount.toLocaleString(), payment: '' })),
        ...pays.map((p) => ({ date: p.payment_date, description: `Payment (${p.method})`, ref: p.receipt_no || p.reference || '', charge: '', payment: p.amount.toLocaleString() })),
      ];
      const total = items.reduce((s, i) => s + i.amount, 0); const paid = pays.reduce((s, p) => s + p.amount, 0);
      return { title: `Fee statement — ${studentFullName(st)} (${st.admission_no})`, columns: [{ key: 'date', label: 'Date' }, { key: 'description', label: 'Description' }, { key: 'ref', label: 'Receipt / Ref' }, { key: 'charge', label: `Charged (${cur})`, align: 'end' }, { key: 'payment', label: `Paid (${cur})`, align: 'end' }],
        rows, summary: [`Total fees ${total.toLocaleString()}`, `Paid ${paid.toLocaleString()}`, `Balance ${Math.max(total - paid, 0).toLocaleString()} ${cur}`] };
    }
    case 'academic.exam_results': {
      const ex = await env.DB.prepare('SELECT x.*, c.name AS cn, c.stream AS cs FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id WHERE x.id = ? AND x.school_id = ?').bind(V.int(q.exam_id, 'Examination', { required: true, min: 1 }), sid).first();
      if (!ex) fail(404, 'Examination not found.');
      const { students, sheet, subjectsById } = await loadSheet(env, ctx, ex);
      const byId = Object.fromEntries(students.map((s) => [s.id, s]));
      const used = [...new Set(sheet.rows.flatMap((r) => r.subjects.map((s) => s.subject_id)))].map((id) => subjectsById[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
      const rows = sheet.rows.filter((r) => r.subject_count).sort((a, b) => a.position - b.position).map((r) => {
        const row = { position: r.position, admission_no: byId[r.student_id].admission_no, name: studentFullName(byId[r.student_id]) };
        used.forEach((s) => { const m = r.subjects.find((x) => x.subject_id === s.id); row[`s${s.id}`] = m ? m.marks : '—'; });
        return { ...row, total: r.total, average: `${r.average}%`, grade: r.grade, division: r.division || '—' };
      });
      return { title: `${ex.name} — ${classLabel({ name: ex.cn, stream: ex.cs })}`, columns: [{ key: 'position', label: 'Pos' }, { key: 'admission_no', label: 'Student ID' }, { key: 'name', label: 'Name' }, ...used.map((s) => ({ key: `s${s.id}`, label: s.code || s.name, align: 'end' })), { key: 'total', label: 'Total', align: 'end' }, { key: 'average', label: 'Average', align: 'end' }, { key: 'grade', label: 'Grade' }, { key: 'division', label: 'Div' }], rows, summary: [`${rows.length} students ranked`] };
    }
    case 'academic.class_performance': {
      const rows = await all(
        `SELECT x.name AS exam, x.exam_date, c.name AS cn, c.stream AS cs, COUNT(DISTINCT r.student_id) AS students, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average,
                ROUND(MAX(r.marks * 100.0 / x.max_marks), 1) AS highest, ROUND(MIN(r.marks * 100.0 / x.max_marks), 1) AS lowest
         FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_classes c ON c.id = x.class_id
         WHERE r.school_id = ? AND x.academic_year_id = ? ${classId ? 'AND c.id = ' + classId : ''} GROUP BY x.id ORDER BY COALESCE(x.exam_date, x.created_at) DESC`, sid, year.id);
      return { title: 'Class performance', columns: [{ key: 'class', label: 'Class' }, { key: 'exam', label: 'Examination' }, { key: 'date', label: 'Date' }, { key: 'students', label: 'Students', align: 'end' }, { key: 'average', label: 'Average %', align: 'end' }, { key: 'highest', label: 'Highest %', align: 'end' }, { key: 'lowest', label: 'Lowest %', align: 'end' }],
        rows: rows.map((r) => ({ class: classLabel({ name: r.cn, stream: r.cs }), exam: r.exam, date: r.exam_date || '—', students: r.students, average: r.average, highest: r.highest, lowest: r.lowest })) };
    }
    case 'academic.subject_performance': {
      const where = ['r.school_id = ?', 'x.academic_year_id = ?']; const binds = [sid, year.id];
      if (q.exam_id) { where.push('x.id = ?'); binds.push(Number(q.exam_id)); }
      if (classId) { where.push('x.class_id = ?'); binds.push(classId); }
      const settings = await getSettings(env, sid);
      const asc = [...settings.grading_scale].sort((a, b) => a.min - b.min);
      const passMark = asc.length > 1 ? asc[1].min : 30;
      const rows = await all(
        `SELECT sub.name, COUNT(*) AS entries, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average, ROUND(MAX(r.marks * 100.0 / x.max_marks), 1) AS highest, ROUND(MIN(r.marks * 100.0 / x.max_marks), 1) AS lowest,
                ROUND(100.0 * SUM(r.marks * 100.0 / x.max_marks >= ${Number(passMark)}) / COUNT(*), 1) AS pass_rate
         FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_subjects sub ON sub.id = r.subject_id WHERE ${where.join(' AND ')} GROUP BY sub.id ORDER BY average DESC`, ...binds);
      return { title: 'Subject performance', columns: [{ key: 'subject', label: 'Subject' }, { key: 'entries', label: 'Results', align: 'end' }, { key: 'average', label: 'Average %', align: 'end' }, { key: 'highest', label: 'Highest %', align: 'end' }, { key: 'lowest', label: 'Lowest %', align: 'end' }, { key: 'pass', label: 'Pass rate %', align: 'end' }],
        rows: rows.map((r) => ({ subject: r.name, entries: r.entries, average: r.average, highest: r.highest, lowest: r.lowest, pass: r.pass_rate })), summary: [`Pass mark ${passMark}%`] };
    }
    case 'academic.student_performance': {
      const st = await env.DB.prepare('SELECT * FROM sch_students WHERE id = ? AND school_id = ?').bind(V.int(q.student_id, 'Student', { required: true, min: 1 }), sid).first();
      if (!st) fail(404, 'Student not found.');
      const exams = await all(`SELECT DISTINCT x.* FROM sch_examinations x JOIN sch_results r ON r.exam_id = x.id WHERE r.student_id = ? ORDER BY COALESCE(x.exam_date, x.created_at)`, st.id);
      const rows = [];
      for (const ex of exams) {
        const { sheet } = await loadSheet(env, ctx, ex);
        const r = sheet.rows.find((x) => x.student_id === st.id);
        if (r && r.subject_count) rows.push({ exam: ex.name, date: ex.exam_date || '—', subjects: r.subject_count, total: r.total, average: `${r.average}%`, grade: r.grade, position: `${ordinal(r.position)} / ${sheet.out_of}`, division: r.division || '—' });
      }
      return { title: `Student performance — ${studentFullName(st)}`, columns: [{ key: 'exam', label: 'Examination' }, { key: 'date', label: 'Date' }, { key: 'subjects', label: 'Subjects', align: 'end' }, { key: 'total', label: 'Total', align: 'end' }, { key: 'average', label: 'Average', align: 'end' }, { key: 'grade', label: 'Grade' }, { key: 'position', label: 'Position' }, { key: 'division', label: 'Div' }], rows };
    }
    default:
      fail(404, 'Unknown report.');
  }
}

export const reportCatalogue = secure({ perm: 'reports.view' }, async ({ ctx }) => {
  if (ctx.role === 'teacher') fail(403, 'Reports are available to administrators and office staff.');
  const groups = REPORT_CATALOGUE.filter((g) => ctx.role !== 'receptionist' || ['students', 'finance'].includes(g.group_key));
  return json({ groups });
});

export const runReport = secure({ perm: 'reports.view' }, async ({ request, env, params, url, ctx }) => {
  if (ctx.role === 'teacher') fail(403, 'Reports are available to administrators and office staff.');
  const group = params.key.split('.')[0];
  if (ctx.role === 'receptionist' && !['students', 'finance'].includes(group)) fail(403, 'Your role can view student and finance reports only.');
  const year = await currentYear(env, ctx.school.id);
  const q = Object.fromEntries(url.searchParams.entries());
  const report = await buildReport(env, ctx, params.key, q, year);
  await audit(env, request, ctx, 'report.run', 'report', null, params.key);
  return json({ report: { ...report, school: ctx.school.name, generated_at: new Date().toISOString(), key: params.key } });
});
