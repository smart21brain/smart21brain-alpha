// Smart21Brain School System — pure calculation helpers.
// No database or request code in here, so every rule (grades, positions,
// divisions, fee balances, attendance %) lives in one testable place and is
// used identically by the dashboard, profiles, reports and report cards.

export const DEFAULT_GRADING_SCALE = [
  { min: 75, grade: 'A', points: 1, remark: 'Excellent' },
  { min: 65, grade: 'B', points: 2, remark: 'Very Good' },
  { min: 45, grade: 'C', points: 3, remark: 'Good' },
  { min: 30, grade: 'D', points: 4, remark: 'Satisfactory' },
  { min: 0,  grade: 'F', points: 5, remark: 'Fail' },
];

// "Division" is optional (used in Tanzanian O-Level style reporting):
// add the points of a student's best N subjects and map the sum to a band.
export const DEFAULT_DIVISION = {
  enabled: true,
  best_of: 7,
  bands: [
    { max: 17, name: 'I' },
    { max: 21, name: 'II' },
    { max: 25, name: 'III' },
    { max: 33, name: 'IV' },
  ],
  fallback: '0',
};

export const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

export function gradeFor(marks, max, scale) {
  const list = [...(scale && scale.length ? scale : DEFAULT_GRADING_SCALE)].sort((a, b) => b.min - a.min);
  const pct = max > 0 ? (marks / max) * 100 : 0;
  const hit = list.find((g) => pct >= g.min) || list[list.length - 1];
  return { grade: hit.grade, points: hit.points, remark: hit.remark, percent: round2(pct) };
}

export function divisionFor(pointsList, cfg) {
  const c = cfg || DEFAULT_DIVISION;
  if (!c.enabled) return null;
  if (pointsList.length < c.best_of) return null; // not enough subjects — "where applicable"
  const best = [...pointsList].sort((a, b) => a - b).slice(0, c.best_of);
  const sum = best.reduce((a, b) => a + b, 0);
  const band = (c.bands || []).find((b) => sum <= b.max);
  return { division: band ? band.name : c.fallback, points: sum };
}

// Competition ranking: 1, 2, 2, 4 …  `items` must already be sorted best-first
// and `key(item)` must return the value that decides ties.
export function assignPositions(items, key) {
  let lastKey = null;
  let lastPos = 0;
  items.forEach((item, i) => {
    const k = key(item);
    if (k !== lastKey) { lastPos = i + 1; lastKey = k; }
    item.position = lastPos;
  });
  return items;
}

// Builds the whole result sheet for one examination.
//  exam      { max_marks }
//  students  [{ id, ... }]                  (students of the exam's class)
//  results   [{ student_id, subject_id, marks }]
//  subjectsById { [id]: { id, name, code } }
export function buildResultSheet({ exam, students, results, subjectsById, scale, divisionCfg }) {
  const byStudent = new Map();
  for (const r of results) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id).push(r);
  }
  const rows = students.map((st) => {
    const list = (byStudent.get(st.id) || []).slice().sort((a, b) =>
      String(subjectsById[a.subject_id]?.name || '').localeCompare(String(subjectsById[b.subject_id]?.name || '')));
    const subjects = list.map((r) => {
      const g = gradeFor(r.marks, exam.max_marks, scale);
      return {
        subject_id: r.subject_id,
        subject: subjectsById[r.subject_id]?.name || 'Subject',
        code: subjectsById[r.subject_id]?.code || '',
        marks: r.marks, grade: g.grade, points: g.points, remarks: g.remark, percent: g.percent,
      };
    });
    const total = round2(subjects.reduce((s, x) => s + x.marks, 0));
    const count = subjects.length;
    const average = count ? round2((total / (count * exam.max_marks)) * 100) : 0;
    const overall = count ? gradeFor(average, 100, scale) : null;
    const div = count ? divisionFor(subjects.map((s) => s.points), divisionCfg) : null;
    return {
      student_id: st.id, subjects, total, subject_count: count, average,
      grade: overall ? overall.grade : '—', remarks: overall ? overall.remark : '',
      division: div ? div.division : null, division_points: div ? div.points : null,
    };
  });
  const ranked = rows.filter((r) => r.subject_count > 0)
    .sort((a, b) => b.average - a.average || b.total - a.total);
  assignPositions(ranked, (r) => `${r.average}|${r.total}`);
  rows.forEach((r) => { if (r.subject_count === 0) r.position = null; });
  return { rows, out_of: ranked.length };
}

export function ordinal(n) {
  if (!n) return '—';
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

// Attendance % counts "late" as attended: present + late out of all marked.
export function attendancePercent(present, absent, late) {
  const total = (present || 0) + (absent || 0) + (late || 0);
  if (!total) return null;
  return round2(((present || 0) + (late || 0)) / total * 100);
}

// Fee summary for one student.
//  items  [{ id, name, fee_type, amount, due_date }]  fees that apply to them
//  paid   total paid in the same academic year
// Payments are applied to the fees in due-date order (oldest first), which is
// how "overdue" is detected: an unpaid slice of a fee whose due date passed.
export function feeSummary(items, paid, today) {
  const total = round2(items.reduce((s, i) => s + Number(i.amount || 0), 0));
  const paidTotal = round2(paid || 0);
  const balance = round2(Math.max(total - paidTotal, 0));
  let remaining = paidTotal;
  let overdueAmount = 0;
  const ordered = [...items].sort((a, b) => String(a.due_date || '9999').localeCompare(String(b.due_date || '9999')));
  const lines = ordered.map((i) => {
    const amt = Number(i.amount || 0);
    const cover = Math.min(remaining, amt);
    remaining = round2(remaining - cover);
    const unpaid = round2(amt - cover);
    const overdue = !!(i.due_date && i.due_date < today && unpaid > 0);
    if (overdue) overdueAmount = round2(overdueAmount + unpaid);
    return { ...i, paid: round2(cover), unpaid, overdue };
  });
  let status = 'pending';
  if (total > 0 && balance <= 0) status = 'paid';
  else if (overdueAmount > 0) status = 'overdue';
  else if (paidTotal > 0) status = 'partial';
  else if (total <= 0) status = 'paid'; // nothing to pay
  return { total, paid: paidTotal, balance, overdue_amount: overdueAmount, status, lines };
}

// Same rule as feeSummary(), but from three totals (used by list pages that
// compute fees inside SQL). Because payments are applied to the oldest due
// fees first, the overdue part is simply max(0, feesAlreadyDue - paid).
export function feeStatusFromTotals(total, paid, due) {
  total = round2(total || 0); paid = round2(paid || 0);
  const balance = round2(Math.max(total - paid, 0));
  const overdue = round2(Math.max((due || 0) - paid, 0));
  let status = 'pending';
  if (total <= 0 || balance <= 0) status = 'paid';
  else if (overdue > 0) status = 'overdue';
  else if (paid > 0) status = 'partial';
  return { total, paid, balance, overdue_amount: overdue, status };
}

export const FEE_STATUS_LABEL = { paid: 'Paid', partial: 'Partially Paid', pending: 'Pending', overdue: 'Overdue' };

export function studentFullName(s) {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(' ');
}

export function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
