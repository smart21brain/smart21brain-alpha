// School System — attendance, fee structures, payments and receipts.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, can, likeTerm, paging, currentYear, getSettings, teacherClassIds, loadStudentForCtx,
} from '../../lib/school-auth.js';
import { attendancePercent, feeSummary, feeStatusFromTotals, studentFullName, todayISO, round2 } from '../../lib/school-calc.js';
import { feeColumns, feeFromRow, weekRange, monthRange, SQL_FULL_NAME } from '../../lib/school-queries.js';

const classLabel = (c) => `${c.name}${c.stream ? ' ' + c.stream : ''}`;

// ---------------------------------------------------------------------
// Attendance
// ---------------------------------------------------------------------
async function classForAttendance(env, ctx, classId) {
  const c = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(classId, ctx.school.id).first();
  if (!c) fail(404, 'Class not found.');
  if (ctx.role === 'teacher' && !(await teacherClassIds(env, ctx)).includes(c.id)) fail(403, 'This is not one of your classes.');
  return c;
}

export const attendanceSheet = secure({ perm: ['attendance.take', 'attendance.view'] }, async ({ env, url, ctx }) => {
  const cls = await classForAttendance(env, ctx, V.int(url.searchParams.get('class_id'), 'Class', { required: true, min: 1 }));
  const date = V.date(url.searchParams.get('date'), 'Date') || todayISO();
  const subjectId = Number(url.searchParams.get('subject_id') || 0);
  const subjectJoin = subjectId
    ? 'JOIN sch_student_subjects ss ON ss.student_id = st.id AND ss.subject_id = ? AND ss.academic_year_id = e.academic_year_id' : '';
  const binds = subjectId ? [subjectId] : [];
  const { results } = await env.DB.prepare(
    `SELECT st.id, st.admission_no, st.first_name, st.middle_name, st.last_name, a.status
     FROM sch_enrollments e JOIN sch_students st ON st.id = e.student_id ${subjectJoin}
     LEFT JOIN sch_attendance a ON a.student_id = st.id AND a.class_id = e.class_id AND a.subject_id = ${subjectId ? subjectId : 0} AND a.date = '${date}'
     WHERE e.class_id = ? AND e.academic_year_id = ? AND st.status = 'active' AND st.school_id = ?
     ORDER BY st.first_name COLLATE NOCASE, st.last_name COLLATE NOCASE`
  ).bind(...binds, cls.id, cls.academic_year_id, ctx.school.id).all();
  return json({
    class: { id: cls.id, name: classLabel(cls) }, date, subject_id: subjectId || null,
    students: results.map((s) => ({ id: s.id, admission_no: s.admission_no, full_name: studentFullName(s), status: s.status || null })),
    already_saved: results.some((s) => s.status),
    can_take: can(ctx, 'attendance.take'),
  });
});

export const saveAttendance = secure({ perm: 'attendance.take' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const cls = await classForAttendance(env, ctx, V.int(b.class_id, 'Class', { required: true, min: 1 }));
  const date = V.date(b.date, 'Date', { required: true });
  if (date > todayISO()) fail(400, 'You cannot record attendance for a future date.');
  const subjectId = b.subject_id ? V.int(b.subject_id, 'Subject', { min: 1 }) : 0;
  if (subjectId) {
    const ok = await env.DB.prepare('SELECT 1 AS x FROM sch_class_subjects WHERE class_id = ? AND subject_id = ?').bind(cls.id, subjectId).first();
    if (!ok) fail(400, 'That subject is not taught in this class.');
  }
  if (!Array.isArray(b.records) || !b.records.length) fail(400, 'There is no attendance to save.');
  const { results: enrolled } = await env.DB.prepare(
    'SELECT student_id FROM sch_enrollments WHERE class_id = ? AND academic_year_id = ?'
  ).bind(cls.id, cls.academic_year_id).all();
  const ok = new Set(enrolled.map((r) => r.student_id));
  const counts = { present: 0, absent: 0, late: 0 };
  const stmts = b.records.map((r) => {
    const studentId = V.int(r.student_id, 'Student', { required: true, min: 1 });
    if (!ok.has(studentId)) fail(400, 'One of the students is not in this class.');
    const status = V.oneOf(r.status, 'Attendance status', ['present', 'absent', 'late'], { required: true });
    counts[status] += 1;
    return env.DB.prepare(
      `INSERT INTO sch_attendance (school_id, student_id, class_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, class_id, subject_id, date) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, updated_at = datetime('now')`
    ).bind(ctx.school.id, studentId, cls.id, subjectId, date, status, ctx.user.id);
  });
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  await audit(env, request, ctx, 'attendance.save', 'class', cls.id, `${classLabel(cls)} ${date}: ${counts.present} present, ${counts.absent} absent, ${counts.late} late`);
  return json({ ok: true, ...counts });
});

// Counts for a date range, optionally for one class or student.
async function attendanceCounts(env, ctx, from, to, { classIds = null, classId = null } = {}) {
  const where = ['a.school_id = ?', 'a.date >= ?', 'a.date <= ?']; const binds = [ctx.school.id, from, to];
  if (classId) { where.push('a.class_id = ?'); binds.push(classId); }
  if (classIds) {
    if (!classIds.length) return { present: 0, absent: 0, late: 0, percent: null };
    where.push(`a.class_id IN (${classIds.map(() => '?').join(',')})`); binds.push(...classIds);
  }
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(a.status = 'present'), 0) AS present, COALESCE(SUM(a.status = 'absent'), 0) AS absent, COALESCE(SUM(a.status = 'late'), 0) AS late
     FROM sch_attendance a WHERE ${where.join(' AND ')}`
  ).bind(...binds).first();
  return { ...r, percent: attendancePercent(r.present, r.absent, r.late) };
}

export const attendanceSummary = secure({ perm: ['attendance.view', 'attendance.take', 'reports.view'] }, async ({ env, url, ctx }) => {
  const date = V.date(url.searchParams.get('date'), 'Date') || todayISO();
  const classId = Number(url.searchParams.get('class_id') || 0) || null;
  const classIds = ctx.role === 'teacher' ? await teacherClassIds(env, ctx) : null;
  const [ws, we] = weekRange(date); const [ms, me] = monthRange(date);
  const opt = { classIds, classId };
  const [day, week, month] = await Promise.all([
    attendanceCounts(env, ctx, date, date, opt), attendanceCounts(env, ctx, ws, we, opt), attendanceCounts(env, ctx, ms, me, opt),
  ]);
  const where = ['a.school_id = ?', 'a.date >= date(?, \'-13 days\')', 'a.date <= ?']; const binds = [ctx.school.id, date, date];
  if (classId) { where.push('a.class_id = ?'); binds.push(classId); }
  if (classIds) { if (!classIds.length) where.push('1 = 0'); else { where.push(`a.class_id IN (${classIds.map(() => '?').join(',')})`); binds.push(...classIds); } }
  const { results: daily } = await env.DB.prepare(
    `SELECT a.date, SUM(a.status = 'present') AS present, SUM(a.status = 'absent') AS absent, SUM(a.status = 'late') AS late
     FROM sch_attendance a WHERE ${where.join(' AND ')} GROUP BY a.date ORDER BY a.date`
  ).bind(...binds).all();
  return json({ date, day, week, month, daily });
});

// Repeated absences: e.g. "John has missed 4 sessions this month."
export async function absenceAlerts(env, ctx, { date = todayISO(), classIds = null, limit = 20 } = {}) {
  const settings = await getSettings(env, ctx.school.id);
  const [ms, me] = monthRange(date);
  const where = [`a.school_id = ?`, `a.status = 'absent'`, `a.date >= ?`, `a.date <= ?`]; const binds = [ctx.school.id, ms, me];
  if (classIds) { if (!classIds.length) return { threshold: settings.absence_alert_threshold, alerts: [] }; where.push(`a.class_id IN (${classIds.map(() => '?').join(',')})`); binds.push(...classIds); }
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.first_name, s.middle_name, s.last_name, s.admission_no, COUNT(*) AS missed,
            (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id
              WHERE e.student_id = s.id ORDER BY e.academic_year_id DESC LIMIT 1) AS class_name
     FROM sch_attendance a JOIN sch_students s ON s.id = a.student_id
     WHERE ${where.join(' AND ')} AND s.status = 'active' GROUP BY s.id HAVING COUNT(*) >= ? ORDER BY missed DESC, s.first_name LIMIT ?`
  ).bind(...binds, settings.absence_alert_threshold, limit).all();
  return {
    threshold: settings.absence_alert_threshold,
    alerts: results.map((r) => ({
      student_id: r.id, full_name: studentFullName(r), admission_no: r.admission_no, class_name: r.class_name, missed: r.missed,
      message: `${r.first_name} has missed ${r.missed} session${r.missed > 1 ? 's' : ''} this month.`,
    })),
  };
}

export const attendanceAlerts = secure({ perm: ['attendance.view', 'attendance.take'] }, async ({ env, ctx }) => {
  const classIds = ctx.role === 'teacher' ? await teacherClassIds(env, ctx) : null;
  return json(await absenceAlerts(env, ctx, { classIds, limit: 50 }));
});

export const studentAttendance = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== 'parent' && !can(ctx, 'attendance.view') && !can(ctx, 'students.view')) fail(403, 'You do not have permission to view attendance.');
  const st = await loadStudentForCtx(env, ctx, params.id);
  const totals = await env.DB.prepare(
    `SELECT COALESCE(SUM(status = 'present'), 0) AS present, COALESCE(SUM(status = 'absent'), 0) AS absent, COALESCE(SUM(status = 'late'), 0) AS late FROM sch_attendance WHERE student_id = ?`
  ).bind(st.id).first();
  const { results: monthly } = await env.DB.prepare(
    `SELECT substr(date, 1, 7) AS month, SUM(status = 'present') AS present, SUM(status = 'absent') AS absent, SUM(status = 'late') AS late
     FROM sch_attendance WHERE student_id = ? GROUP BY substr(date, 1, 7) ORDER BY month DESC LIMIT 6`
  ).bind(st.id).all();
  const { results: history } = await env.DB.prepare(
    `SELECT a.date, a.status, sub.name AS subject FROM sch_attendance a LEFT JOIN sch_subjects sub ON sub.id = a.subject_id
     WHERE a.student_id = ? ORDER BY a.date DESC, a.id DESC LIMIT 40`
  ).bind(st.id).all();
  return json({ summary: { ...totals, percent: attendancePercent(totals.present, totals.absent, totals.late) }, monthly: monthly.reverse(), history });
});

// ---------------------------------------------------------------------
// Fee structures
// ---------------------------------------------------------------------
const FEE_TYPES = ['registration', 'tuition', 'examination', 'other'];

export const listFeeStructures = secure({ perm: 'fees.view' }, async ({ env, url, ctx }) => {
  const yearId = Number(url.searchParams.get('year') || 0) || (await currentYear(env, ctx.school.id)).id;
  const { results } = await env.DB.prepare(
    `SELECT f.*, c.name AS class_name, c.stream AS class_stream FROM sch_fee_structures f LEFT JOIN sch_classes c ON c.id = f.class_id
     WHERE f.school_id = ? AND f.academic_year_id = ? ORDER BY f.due_date IS NULL, f.due_date, f.id`
  ).bind(ctx.school.id, yearId).all();
  return json({ year_id: yearId, structures: results });
});

async function readFee(env, ctx, b) {
  let classId = null;
  if (b.class_id) {
    const c = await env.DB.prepare('SELECT id, academic_year_id FROM sch_classes WHERE id = ? AND school_id = ?').bind(b.class_id, ctx.school.id).first();
    if (!c) fail(400, 'Please choose a valid class.');
    classId = c.id;
  }
  const yearId = b.academic_year_id ? V.int(b.academic_year_id, 'Academic year', { min: 1 }) : (await currentYear(env, ctx.school.id)).id;
  const y = await env.DB.prepare('SELECT id FROM sch_academic_years WHERE id = ? AND school_id = ?').bind(yearId, ctx.school.id).first();
  if (!y) fail(400, 'Please choose a valid academic year.');
  return {
    academic_year_id: yearId, class_id: classId,
    fee_type: V.oneOf(b.fee_type, 'Fee type', FEE_TYPES, { required: true }),
    name: V.str(b.name, 'Fee name', { required: true, max: 80 }),
    amount: round2(V.num(b.amount, 'Amount', { required: true, min: 0, max: 1e9 })),
    due_date: V.date(b.due_date, 'Due date'),
  };
}

export const createFeeStructure = secure({ perm: 'fees.manage' }, async ({ request, env, ctx }) => {
  const f = await readFee(env, ctx, await readJson(request));
  const r = await env.DB.prepare(
    'INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(ctx.school.id, f.academic_year_id, f.class_id, f.fee_type, f.name, f.amount, f.due_date).run();
  await audit(env, request, ctx, 'fee.create', 'fee_structure', r.meta.last_row_id, `${f.name}: ${f.amount}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updateFeeStructure = secure({ perm: 'fees.manage' }, async ({ request, env, params, ctx }) => {
  const f = await readFee(env, ctx, await readJson(request));
  const r = await env.DB.prepare(
    'UPDATE sch_fee_structures SET class_id = ?, fee_type = ?, name = ?, amount = ?, due_date = ? WHERE id = ? AND school_id = ?'
  ).bind(f.class_id, f.fee_type, f.name, f.amount, f.due_date, params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, 'Fee not found.');
  await audit(env, request, ctx, 'fee.update', 'fee_structure', Number(params.id), `${f.name}: ${f.amount}`);
  return json({ ok: true });
});

export const deleteFeeStructure = secure({ perm: 'fees.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM sch_fee_structures WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, 'Fee not found.');
  await audit(env, request, ctx, 'fee.delete', 'fee_structure', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Fees overview + a student's fee statement
// ---------------------------------------------------------------------
export async function financeRows(env, ctx, { yearId, classId = 0, q = '' } = {}) {
  const year = yearId || (await currentYear(env, ctx.school.id)).id;
  const where = ['s.school_id = ?']; const binds = [ctx.school.id];
  if (classId) { where.push('e.class_id = ?'); binds.push(classId); }
  if (q) { const l = likeTerm(q); where.push(`(${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\')`); binds.push(l, l); }
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status, c.name AS class_name, c.stream AS class_stream, e.class_id,
       (SELECT p.full_name FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_name,
       (SELECT p.phone FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_phone,
       ${feeColumns(todayISO())}
     FROM sch_students s JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${Number(year)}
     JOIN sch_classes c ON c.id = e.class_id WHERE ${where.join(' AND ')} ORDER BY s.first_name COLLATE NOCASE, s.last_name COLLATE NOCASE`
  ).bind(...binds).all();
  return results.map((r) => ({
    student_id: r.id, admission_no: r.admission_no, full_name: studentFullName(r), status: r.status,
    class_name: classLabel({ name: r.class_name, stream: r.class_stream }), class_id: r.class_id,
    parent_name: r.parent_name, parent_phone: r.parent_phone, ...feeFromRow(r),
  }));
}

export const feesOverview = secure({ perm: 'fees.view' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 25, 100);
  const status = url.searchParams.get('status');
  if (status) V.oneOf(status, 'Status', ['paid', 'partial', 'pending', 'overdue']);
  const rows = await financeRows(env, ctx, { classId: Number(url.searchParams.get('class_id') || 0), q: (url.searchParams.get('q') || '').trim() });
  const counts = { paid: 0, partial: 0, pending: 0, overdue: 0 };
  let sumTotal = 0; let sumPaid = 0; let sumBalance = 0;
  rows.forEach((r) => { counts[r.status] += 1; sumTotal += r.total; sumPaid += r.paid; sumBalance += r.balance; });
  const summary = { total_fees: round2(sumTotal), total_paid: round2(sumPaid), outstanding: round2(sumBalance), counts };
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  return json({ students: filtered.slice(offset, offset + limit), total: filtered.length, page, limit, summary });
});

export const studentFees = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== 'parent' && !can(ctx, 'fees.view')) fail(403, 'You do not have permission to view fees.');
  const st = await loadStudentForCtx(env, ctx, params.id);
  const enr = await env.DB.prepare(
    'SELECT e.* FROM sch_enrollments e JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = ? ORDER BY y.is_current DESC, y.name DESC LIMIT 1'
  ).bind(st.id).first();
  if (!enr) return json({ enrolled: false, summary: feeSummary([], 0, todayISO()), items: [], payments: [] });
  const { results: items } = await env.DB.prepare(
    `SELECT id, name, fee_type, amount, due_date FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ? AND (class_id IS NULL OR class_id = ?)`
  ).bind(ctx.school.id, enr.academic_year_id, enr.class_id).all();
  const { results: payments } = await env.DB.prepare(
    `SELECT p.id, p.amount, p.payment_date, p.method, p.reference, p.notes, r.receipt_no, u.name AS received_by_name
     FROM sch_payments p LEFT JOIN sch_receipts r ON r.payment_id = p.id LEFT JOIN users u ON u.id = p.received_by
     WHERE p.student_id = ? AND p.academic_year_id = ? ORDER BY p.payment_date DESC, p.id DESC`
  ).bind(st.id, enr.academic_year_id).all();
  const paid = payments.reduce((s, p) => s + p.amount, 0);
  const summary = feeSummary(items, paid, todayISO());
  return json({ enrolled: true, summary, items: summary.lines, payments });
});

// ---------------------------------------------------------------------
// Payments & receipts
// ---------------------------------------------------------------------
async function nextReceiptNo(env, ctx, prefix, date) {
  const year = String(date).slice(0, 4);
  const stem = `${prefix}-${year}-`;
  const last = await env.DB.prepare('SELECT receipt_no FROM sch_receipts WHERE school_id = ? AND receipt_no LIKE ? ORDER BY receipt_no DESC LIMIT 1')
    .bind(ctx.school.id, stem + '%').first();
  const seq = last ? (parseInt(last.receipt_no.slice(stem.length), 10) || 0) + 1 : 1;
  return stem + String(seq).padStart(6, '0');
}

async function studentBalance(env, ctx, studentId, yearId, excludePaymentId = 0) {
  const { results: items } = await env.DB.prepare(
    `SELECT id, name, fee_type, amount, due_date FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ?
     AND (class_id IS NULL OR class_id = (SELECT class_id FROM sch_enrollments WHERE student_id = ? AND academic_year_id = ?))`
  ).bind(ctx.school.id, yearId, studentId, yearId).all();
  const paid = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM sch_payments WHERE student_id = ? AND academic_year_id = ? AND id != ?')
    .bind(studentId, yearId, excludePaymentId).first();
  return { summary: feeSummary(items, paid.n, todayISO()), paidBefore: paid.n };
}

function cleanMethod(value, methods) {
  const m = V.str(value, 'Payment method', { required: true, max: 40 });
  const hit = methods.find((x) => x.toLowerCase() === m.toLowerCase());
  if (!hit) fail(400, `Payment method must be one of: ${methods.join(', ')}.`);
  return hit;
}
const needsReference = (method) => !['cash', 'other'].includes(method.toLowerCase());

export const recordPayment = secure({ perm: 'fees.record' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const st = await loadStudentForCtx(env, ctx, V.int(b.student_id, 'Student', { required: true, min: 1 }));
  const settings = await getSettings(env, ctx.school.id);
  const amount = round2(V.num(b.amount, 'Amount', { required: true, min: 0.01, max: 1e9 }));
  const date = V.date(b.payment_date, 'Payment date') || todayISO();
  if (date > todayISO()) fail(400, 'The payment date cannot be in the future.');
  const method = cleanMethod(b.method, settings.payment_methods);
  const reference = V.str(b.reference, 'Reference number', { max: 80 });
  if (needsReference(method) && !reference) fail(400, `A reference / transaction number is required for ${method} payments.`);
  if (reference) {
    const dupe = await env.DB.prepare('SELECT id FROM sch_payments WHERE school_id = ? AND lower(reference) = lower(?) AND lower(method) = lower(?)').bind(ctx.school.id, reference, method).first();
    if (dupe) fail(409, `A ${method} payment with reference ${reference} has already been recorded.`);
  }
  const enr = await env.DB.prepare(
    'SELECT e.* FROM sch_enrollments e JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = ? ORDER BY y.is_current DESC, y.name DESC LIMIT 1'
  ).bind(st.id).first();
  if (!enr) fail(400, 'This student is not enrolled in a class yet.');
  const { summary } = await studentBalance(env, ctx, st.id, enr.academic_year_id);
  if (summary.total <= 0) fail(400, 'No fees have been set for this student\'s class. Add a fee structure first.');
  if (amount > summary.balance + 0.001) fail(400, `The amount is more than the outstanding balance (${summary.balance.toLocaleString()} ${ctx.school.currency}). Enter ${summary.balance.toLocaleString()} or less.`);

  let paymentId = null; let receiptNo = null;
  for (let attempt = 0; attempt < 4 && !paymentId; attempt += 1) {
    receiptNo = await nextReceiptNo(env, ctx, settings.receipt_prefix, date);
    const ins = await env.DB.prepare(
      `INSERT INTO sch_payments (school_id, student_id, academic_year_id, amount, payment_date, method, reference, received_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(ctx.school.id, st.id, enr.academic_year_id, amount, date, method, reference, ctx.user.id, V.str(b.notes, 'Notes', { max: 300 })).run();
    const pid = ins.meta.last_row_id;
    try {
      await env.DB.prepare('INSERT INTO sch_receipts (school_id, payment_id, receipt_no) VALUES (?, ?, ?)').bind(ctx.school.id, pid, receiptNo).run();
      paymentId = pid;
    } catch (e) {
      await env.DB.prepare('DELETE FROM sch_payments WHERE id = ?').bind(pid).run();
      if (!/UNIQUE/i.test(String(e))) throw e;
    }
  }
  if (!paymentId) fail(500, 'Could not create a receipt number. Please try again.');

  const balance = round2(summary.balance - amount);
  await env.DB.prepare(
    `INSERT INTO sch_notifications (school_id, title, message, type, audience, student_id, created_by) VALUES (?, ?, ?, 'general', 'student', ?, ?)`
  ).bind(ctx.school.id, 'Payment received', `We received ${ctx.school.currency} ${amount.toLocaleString()} for ${studentFullName(st)} on ${date} (receipt ${receiptNo}). Remaining balance: ${ctx.school.currency} ${balance.toLocaleString()}.`, st.id, ctx.user.id).run();
  await audit(env, request, ctx, 'payment.create', 'payment', paymentId, `${studentFullName(st)}: ${amount} via ${method} (${receiptNo})`);
  return json({ ok: true, id: paymentId, receipt_no: receiptNo, balance }, { status: 201 });
});

export const listPayments = secure({ perm: 'fees.view' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 25, 100);
  const where = ['p.school_id = ?']; const binds = [ctx.school.id];
  const studentId = Number(url.searchParams.get('student_id') || 0);
  if (studentId) { where.push('p.student_id = ?'); binds.push(studentId); }
  const from = V.date(url.searchParams.get('from'), 'From'); const to = V.date(url.searchParams.get('to'), 'To');
  if (from) { where.push('p.payment_date >= ?'); binds.push(from); }
  if (to) { where.push('p.payment_date <= ?'); binds.push(to); }
  const method = url.searchParams.get('method');
  if (method) { where.push('lower(p.method) = lower(?)'); binds.push(method); }
  const q = (url.searchParams.get('q') || '').trim();
  if (q) { const l = likeTerm(q); where.push(`(${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\' OR r.receipt_no LIKE ? ESCAPE '\\' OR p.reference LIKE ? ESCAPE '\\')`); binds.push(l, l, l, l); }
  const base = `FROM sch_payments p JOIN sch_students s ON s.id = p.student_id LEFT JOIN sch_receipts r ON r.payment_id = p.id LEFT JOIN users u ON u.id = p.received_by WHERE ${where.join(' AND ')}`;
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(p.amount), 0) AS sum ${base}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.amount, p.payment_date, p.method, p.reference, p.notes, p.created_at, r.receipt_no, u.name AS received_by_name,
            s.id AS student_id, s.admission_no, s.first_name, s.middle_name, s.last_name ${base} ORDER BY p.payment_date DESC, p.id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ payments: results.map((r) => ({ ...r, student_name: studentFullName(r) })), total: total.n, sum: round2(total.sum), page, limit });
});

export const getReceipt = secure({ parent: true }, async ({ request, env, params, ctx }) => {
  const p = await env.DB.prepare(
    `SELECT p.*, r.receipt_no, r.issued_at, u.name AS received_by_name FROM sch_payments p LEFT JOIN sch_receipts r ON r.payment_id = p.id
     LEFT JOIN users u ON u.id = p.received_by WHERE p.id = ? AND p.school_id = ?`
  ).bind(params.id, ctx.school.id).first();
  if (!p) fail(404, 'Payment not found.');
  if (ctx.role !== 'parent' && !can(ctx, 'fees.view') && !can(ctx, 'fees.record')) fail(403, 'You do not have permission to view receipts.');
  const st = await loadStudentForCtx(env, ctx, p.student_id);
  const enr = await env.DB.prepare(
    `SELECT c.name, c.stream FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id WHERE e.student_id = ? AND e.academic_year_id = ?`
  ).bind(st.id, p.academic_year_id).first();
  // Balance as at this payment = total fees − everything paid up to and including it.
  const upTo = await env.DB.prepare('SELECT COALESCE(SUM(amount), 0) AS n FROM sch_payments WHERE student_id = ? AND academic_year_id = ? AND id <= ?').bind(st.id, p.academic_year_id, p.id).first();
  const { summary } = await studentBalance(env, ctx, st.id, p.academic_year_id, 0);
  const settings = await getSettings(env, ctx.school.id);
  const sc = ctx.school;
  await audit(env, request, ctx, 'receipt.view', 'payment', p.id, p.receipt_no);
  return json({
    receipt: {
      receipt_no: p.receipt_no, issued_at: p.issued_at, payment_date: p.payment_date, amount: p.amount, method: p.method, reference: p.reference,
      notes: p.notes, received_by: p.received_by_name, currency: sc.currency,
      total_fees: summary.total, paid_to_date: round2(upTo.n), balance: round2(Math.max(summary.total - upTo.n, 0)),
      footer: settings.receipt_footer,
      student: { id: st.id, name: studentFullName(st), admission_no: st.admission_no, class_name: enr ? classLabel(enr) : '—' },
      school: { id: sc.id, name: sc.name, short_name: sc.short_name, phone: sc.phone, email: sc.email, address: sc.address, has_logo: !!sc.logo_key, primary_color: sc.primary_color },
    },
  });
});

export const updatePayment = secure({ perm: 'fees.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const p = await env.DB.prepare('SELECT * FROM sch_payments WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!p) fail(404, 'Payment not found.');
  const settings = await getSettings(env, ctx.school.id);
  const amount = round2(V.num(b.amount ?? p.amount, 'Amount', { required: true, min: 0.01, max: 1e9 }));
  const date = V.date(b.payment_date ?? p.payment_date, 'Payment date', { required: true });
  if (date > todayISO()) fail(400, 'The payment date cannot be in the future.');
  const method = cleanMethod(b.method ?? p.method, settings.payment_methods);
  const reference = V.str(b.reference !== undefined ? b.reference : p.reference, 'Reference number', { max: 80 });
  if (needsReference(method) && !reference) fail(400, `A reference / transaction number is required for ${method} payments.`);
  const { summary } = await studentBalance(env, ctx, p.student_id, p.academic_year_id, p.id);
  if (amount > summary.balance + 0.001) fail(400, `That amount is more than the student's outstanding balance without this payment (${summary.balance.toLocaleString()}).`);
  await env.DB.prepare(
    `UPDATE sch_payments SET amount = ?, payment_date = ?, method = ?, reference = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(amount, date, method, reference, b.notes !== undefined ? V.str(b.notes, 'Notes', { max: 300 }) : p.notes, p.id).run();
  await audit(env, request, ctx, 'payment.update', 'payment', p.id, `amount ${p.amount}→${amount}, method ${p.method}→${method}`);
  return json({ ok: true });
});

// Automation: send a fee reminder to every student whose fees are overdue.
export const sendFeeReminders = secure({ perm: ['fees.manage', 'announcements.manage'] }, async ({ request, env, ctx }) => {
  const rows = (await financeRows(env, ctx, {})).filter((r) => r.status === 'overdue');
  let sent = 0;
  for (const r of rows) {
    const recent = await env.DB.prepare(
      `SELECT id FROM sch_notifications WHERE school_id = ? AND student_id = ? AND type = 'fee_reminder' AND created_at > datetime('now', '-7 days') LIMIT 1`
    ).bind(ctx.school.id, r.student_id).first();
    if (recent) continue;
    await env.DB.prepare(
      `INSERT INTO sch_notifications (school_id, title, message, type, audience, student_id, created_by) VALUES (?, ?, ?, 'fee_reminder', 'student', ?, ?)`
    ).bind(ctx.school.id, 'Fee reminder', `Dear parent/guardian, ${r.full_name} has an overdue fee balance of ${ctx.school.currency} ${r.balance.toLocaleString()}. Please make a payment as soon as possible.`, r.student_id, ctx.user.id).run();
    sent += 1;
  }
  await audit(env, request, ctx, 'fee.reminders', 'notification', null, `${sent} reminders sent (${rows.length} overdue)`);
  return json({ ok: true, sent, overdue: rows.length });
});
