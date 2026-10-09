// Smart21Brain School System — shared SQL fragments so that the student list,
// dashboard, fee screens and reports all calculate money and attendance the
// same way.
import { feeStatusFromTotals, attendancePercent, todayISO } from './school-calc.js';

// Adds fee_total / fee_due / fee_paid columns. Requires aliases:
//   s = sch_students, e = sch_enrollments (the year being looked at)
export function feeColumns(today = todayISO()) {
  const t = String(today).replace(/[^0-9-]/g, '');
  return `
    (SELECT COALESCE(SUM(f.amount), 0) FROM sch_fee_structures f
       WHERE f.school_id = s.school_id AND f.academic_year_id = e.academic_year_id
         AND (f.class_id IS NULL OR f.class_id = e.class_id)) AS fee_total,
    (SELECT COALESCE(SUM(f.amount), 0) FROM sch_fee_structures f
       WHERE f.school_id = s.school_id AND f.academic_year_id = e.academic_year_id
         AND (f.class_id IS NULL OR f.class_id = e.class_id)
         AND f.due_date IS NOT NULL AND f.due_date < '${t}') AS fee_due,
    (SELECT COALESCE(SUM(p.amount), 0) FROM sch_payments p
       WHERE p.student_id = s.id AND p.academic_year_id = e.academic_year_id) AS fee_paid`;
}

// Adds att_present / att_absent / att_late columns (needs alias s).
export const ATTENDANCE_COLUMNS = `
    (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'present') AS att_present,
    (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'absent') AS att_absent,
    (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'late') AS att_late`;

export function feeFromRow(row) {
  return feeStatusFromTotals(row.fee_total, row.fee_paid, row.fee_due);
}
export function attendanceFromRow(row) {
  return attendancePercent(row.att_present, row.att_absent, row.att_late);
}

export const PARENT_NAME_SQL = `(SELECT p.full_name FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id
   WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC, p.id LIMIT 1)`;
export const PARENT_PHONE_SQL = `(SELECT p.phone FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id
   WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC, p.id LIMIT 1)`;

export const SQL_FULL_NAME = `(s.first_name || ' ' || COALESCE(s.middle_name || ' ', '') || s.last_name)`;

// Monday-start week containing `dateStr`
export function weekRange(dateStr) {
  const d = new Date(dateStr + 'T00:00:00Z');
  const day = (d.getUTCDay() + 6) % 7;
  const start = new Date(d.getTime() - day * 86400000);
  const end = new Date(start.getTime() + 6 * 86400000);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}
export function monthRange(dateStr) {
  const [y, m] = dateStr.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [first, last];
}

// Sensible class order (Form One … Form Six, then the rest alphabetically).
export const CLASS_ORDER = `CASE c.name WHEN 'Form One' THEN 1 WHEN 'Form Two' THEN 2 WHEN 'Form Three' THEN 3 WHEN 'Form Four' THEN 4 WHEN 'Form Five' THEN 5 WHEN 'Form Six' THEN 6
  WHEN 'Standard One' THEN 1 WHEN 'Standard Two' THEN 2 WHEN 'Standard Three' THEN 3 WHEN 'Standard Four' THEN 4 WHEN 'Standard Five' THEN 5 WHEN 'Standard Six' THEN 6 WHEN 'Standard Seven' THEN 7 ELSE 50 END`;
