// School System — "Load sample data" (so a new school can explore a working
// system in one click) and "Erase all data" (so they can then start for real).
import { json } from '../../lib/auth.js';
import { fail, secure, readJson, audit, currentYear, randomToken, chunk } from '../../lib/school-auth.js';

const TEACHERS = [
  ['Mr. Joseph Mushi', 'male', 'Mathematics'], ['Ms. Neema Kileo', 'female', 'English'], ['Mr. Hassan Bakari', 'male', 'Physics'],
  ['Mrs. Grace Mwakyusa', 'female', 'Biology'], ['Mr. Peter Lyimo', 'male', 'Geography'], ['Ms. Amina Salum', 'female', 'Kiswahili'],
];
const FIRST_F = ['Asha', 'Neema', 'Zawadi', 'Rehema', 'Furaha', 'Happiness', 'Mwanaidi', 'Upendo', 'Witness', 'Esther', 'Salma', 'Agnes'];
const FIRST_M = ['Peter', 'Juma', 'Daniel', 'Baraka', 'Emmanuel', 'Kelvin', 'Ibrahim', 'Godfrey', 'Rashid', 'Elias', 'Hamisi', 'Moses'];
const LAST = ['Michael', 'Mushi', 'Kimaro', 'Mwakasege', 'Massawe', 'Ngowi', 'Shayo', 'Mrema', 'Kessy', 'Msuya', 'Swai', 'Mollel', 'Lema', 'Mtui', 'Urio', 'Temba', 'Minja', 'Mosha', 'Kavishe', 'Tarimo', 'Nnko', 'Kweka', 'Marealle', 'Mallya'];
const ADDRESSES = ['Msasani, Dar es Salaam', 'Mikocheni, Dar es Salaam', 'Mbezi Beach, Dar es Salaam', 'Kinondoni, Dar es Salaam', 'Sinza, Dar es Salaam', 'Kijitonyama, Dar es Salaam'];
const JOBS = ['Teacher', 'Businessman', 'Nurse', 'Engineer', 'Accountant', 'Shop owner', 'Driver', 'Banker'];

// small deterministic random generator so every demo looks the same
function rng(seed) { let s = seed; return () => { s = (s * 1664525 + 1013904223) % 4294967296; return s / 4294967296; }; }
const iso = (d) => d.toISOString().slice(0, 10);
const addDays = (n) => iso(new Date(Date.now() + n * 86400000));

async function runBatches(env, stmts) {
  for (const part of chunk(stmts, 90)) await env.DB.batch(part);
}

export const loadDemoData = secure({ perm: 'settings.manage', roles: ['admin'] }, async ({ request, env, ctx }) => {
  const sid = ctx.school.id;
  const existing = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_students WHERE school_id = ?').bind(sid).first();
  if (existing.n > 0) fail(409, 'Sample data can only be added to a school that has no students yet.');
  const year = await currentYear(env, sid);
  const yr = Number(String(year.name).slice(0, 4)) || new Date().getUTCFullYear();

  const { results: classRows } = await env.DB.prepare(
    `SELECT id, name FROM sch_classes WHERE school_id = ? AND academic_year_id = ? AND name IN ('Form One','Form Two','Form Three') ORDER BY name`
  ).bind(sid, year.id).all();
  const byName = Object.fromEntries(classRows.map((c) => [c.name, c.id]));
  const classes = ['Form One', 'Form Two', 'Form Three'].map((n) => ({ name: n, id: byName[n] })).filter((c) => c.id);
  if (!classes.length) fail(400, 'The sample data needs the classes Form One, Form Two and Form Three. Add them first, then try again.');
  const { results: subs } = await env.DB.prepare('SELECT id, code FROM sch_subjects WHERE school_id = ? AND status = ? ORDER BY id').bind(sid, 'active').all();
  if (subs.length < 5) fail(400, 'The sample data needs at least 5 subjects.');
  const subjectIds = subs.map((s) => s.id);
  const rand = rng(2026);

  // ---- teachers, class teachers, subject teachers ----
  await runBatches(env, TEACHERS.map(([name, gender], i) => env.DB.prepare(
    `INSERT INTO sch_teachers (school_id, full_name, gender, phone, email, address, employment_status) VALUES (?, ?, ?, ?, ?, ?, 'full_time')`
  ).bind(sid, name, gender, `+25575500${1000 + i}`, `teacher${i + 1}@example.com`, ADDRESSES[i % ADDRESSES.length])));
  const { results: tRows } = await env.DB.prepare('SELECT id FROM sch_teachers WHERE school_id = ? ORDER BY id').bind(sid).all();
  const T = tRows.map((t) => t.id);
  const stmts = [];
  classes.forEach((c, k) => {
    stmts.push(env.DB.prepare('UPDATE sch_classes SET teacher_id = ? WHERE id = ?').bind(T[k % T.length], c.id));
    subjectIds.forEach((sub, i) => stmts.push(env.DB.prepare('UPDATE sch_class_subjects SET teacher_id = ? WHERE class_id = ? AND subject_id = ?').bind(T[(i + k * 2) % T.length], c.id, sub)));
  });
  await runBatches(env, stmts);

  // ---- students & parents ----
  const perClass = 8; const total = classes.length * perClass;
  const students = [];
  for (let i = 0; i < total; i += 1) {
    const female = i % 2 === 0;
    const first = (female ? FIRST_F : FIRST_M)[Math.floor(i / 2) % 12];
    students.push({
      i, first, last: LAST[i % LAST.length], gender: female ? 'female' : 'male', cls: classes[Math.floor(i / perClass)],
      admission: `${ctx.school.admission_prefix}-${yr}-${String(i + 1).padStart(4, '0')}`,
      dob: `${yr - (12 + Math.floor(i / perClass) + (i % 2))}-${String(1 + (i % 12)).padStart(2, '0')}-${String(3 + (i % 20)).padStart(2, '0')}`,
      status: i === 19 ? 'inactive' : 'active',
    });
  }
  const siblings = { 8: 0, 16: 1, 17: 9, 10: 2 }; // student index -> index of the sibling they share a parent with
  const parentOf = {}; const parents = [];
  students.forEach((s) => {
    const share = siblings[s.i];
    if (share !== undefined) { parentOf[s.i] = parentOf[share]; return; }
    const p = { name: `${s.i % 3 === 0 ? 'Mr.' : 'Mrs.'} ${s.i % 2 === 0 ? FIRST_M[(s.i + 3) % 12] : FIRST_F[(s.i + 5) % 12]} ${s.last}`, phone: `+2557${1000 + s.i * 37}${String(100 + s.i).slice(-3)}`.slice(0, 13), idx: parents.length };
    parents.push(p); parentOf[s.i] = p.idx;
  });
  await runBatches(env, parents.map((p, n) => env.DB.prepare(
    `INSERT INTO sch_parents (school_id, full_name, phone, alt_phone, email, address, occupation) VALUES (?, ?, ?, NULL, ?, ?, ?)`
  ).bind(sid, p.name, p.phone, `parent${n + 1}@example.com`, ADDRESSES[n % ADDRESSES.length], JOBS[n % JOBS.length])));
  const { results: pRows } = await env.DB.prepare('SELECT id FROM sch_parents WHERE school_id = ? ORDER BY id').bind(sid).all();
  parents.forEach((p, n) => { p.id = pRows[n].id; });

  await runBatches(env, students.map((s) => env.DB.prepare(
    `INSERT INTO sch_students (school_id, admission_no, first_name, last_name, gender, date_of_birth, nationality, address, previous_school, admission_date, status, verify_token)
     VALUES (?, ?, ?, ?, ?, ?, 'Tanzanian', ?, ?, ?, ?, ?)`
  ).bind(sid, s.admission, s.first, s.last, s.gender, s.dob, ADDRESSES[s.i % ADDRESSES.length], s.i % 3 === 0 ? 'Mwenge Primary School' : null, (s.i % 4 === 0 ? addDays(-(4 + s.i)) : `${yr}-01-${String(6 + (s.i % 10)).padStart(2, '0')}`), s.status, randomToken(16))));
  const { results: sRows } = await env.DB.prepare('SELECT id, admission_no FROM sch_students WHERE school_id = ?').bind(sid).all();
  const sid2id = Object.fromEntries(sRows.map((r) => [r.admission_no, r.id]));
  students.forEach((s) => { s.id = sid2id[s.admission]; });

  const link = [];
  students.forEach((s) => {
    link.push(env.DB.prepare('INSERT INTO sch_enrollments (school_id, student_id, class_id, academic_year_id) VALUES (?, ?, ?, ?)').bind(sid, s.id, s.cls.id, year.id));
    link.push(env.DB.prepare('INSERT INTO sch_student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, 1)')
      .bind(s.id, parents[parentOf[s.i]].id, s.i % 3 === 0 ? 'Father' : 'Mother'));
    subjectIds.forEach((sub) => link.push(env.DB.prepare('INSERT INTO sch_student_subjects (student_id, subject_id, academic_year_id, school_id) VALUES (?, ?, ?, ?)').bind(s.id, sub, year.id, sid)));
  });
  await runBatches(env, link);

  // ---- fees (dates relative to today so the demo shows paid / partial / overdue) ----
  await env.DB.prepare('DELETE FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ?').bind(sid, year.id).run();
  const fees = [['registration', 'Registration fee', 20000, -120], ['tuition', 'Tuition — Term 1', 150000, -60], ['tuition', 'Tuition — Term 2', 150000, 45], ['examination', 'Examination fee', 30000, 15]];
  await runBatches(env, fees.map(([type, name, amount, off]) => env.DB.prepare(
    'INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount, due_date) VALUES (?, ?, NULL, ?, ?, ?, ?)').bind(sid, year.id, type, name, amount, addDays(off))));

  const plans = [[250000, 100000], [170000], [20000], [], [100000], [200000]];
  const methods = ['Bank', 'Mobile Money', 'Cash'];
  const pay = []; const rec = []; let n = 0;
  students.forEach((s) => {
    (plans[s.i % 6] || []).forEach((amt, k) => {
      n += 1;
      const method = methods[(s.i + k) % 3]; const ref = `DEMO${String(n).padStart(4, '0')}`;
      const date = addDays(-(80 - ((s.i * 3 + k * 9) % 70)));
      pay.push(env.DB.prepare(
        'INSERT INTO sch_payments (school_id, student_id, academic_year_id, amount, payment_date, method, reference, received_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)')
        .bind(sid, s.id, year.id, amt, date, method, ref, ctx.user.id, 'Sample payment'));
      rec.push(env.DB.prepare(`INSERT INTO sch_receipts (school_id, payment_id, receipt_no) VALUES (?, (SELECT id FROM sch_payments WHERE school_id = ? AND reference = ?), ?)`)
        .bind(sid, sid, ref, `RCT-${yr}-${String(n).padStart(6, '0')}`));
    });
  });
  await runBatches(env, pay); await runBatches(env, rec);

  // ---- attendance: last 14 days, weekdays only ----
  const att = [];
  for (let d = 14; d >= 0; d -= 1) {
    const dt = new Date(Date.now() - d * 86400000); const dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const date = iso(dt);
    students.filter((s) => s.status === 'active').forEach((s) => {
      const r = rand(); let status = 'present';
      if (s.i === 4 || s.i === 13) status = r < 0.45 ? 'absent' : 'present'; // two students with repeated absences
      else if (r > 0.94) status = 'absent'; else if (r > 0.89) status = 'late';
      att.push(env.DB.prepare(
        `INSERT INTO sch_attendance (school_id, student_id, class_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, 0, ?, ?, ?)`).bind(sid, s.id, s.cls.id, date, status, ctx.user.id));
    });
  }
  await runBatches(env, att);

  // ---- examinations & results ----
  const { results: terms } = await env.DB.prepare('SELECT id FROM sch_terms WHERE school_id = ? ORDER BY sort_order LIMIT 1').bind(sid).all();
  const termId = terms[0] ? terms[0].id : null;
  const examDefs = classes.map((c) => ({ c, name: 'Midterm Examination', type: 'Midterm Examination', off: -20, subjects: subjectIds }));
  examDefs.push({ c: classes[0], name: 'Monthly Test — August', type: 'Monthly Test', off: -45, subjects: subjectIds.slice(0, 5) });
  await runBatches(env, examDefs.map((e) => env.DB.prepare(
    `INSERT INTO sch_examinations (school_id, name, exam_type, academic_year_id, term_id, class_id, exam_date, max_marks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 100, ?)`)
    .bind(sid, e.name, e.type, year.id, termId, e.c.id, addDays(e.off), ctx.user.id)));
  const { results: exRows } = await env.DB.prepare('SELECT id, class_id, name FROM sch_examinations WHERE school_id = ? ORDER BY id').bind(sid).all();
  const resStmts = [];
  exRows.forEach((ex, idx) => {
    const def = examDefs[idx];
    students.filter((s) => s.cls.id === ex.class_id && s.status === 'active').forEach((s) => {
      const strength = 0.35 + rand() * 0.55; // each student has an overall level
      def.subjects.forEach((sub) => {
        const marks = Math.max(8, Math.min(98, Math.round(strength * 100 + (rand() - 0.5) * 30)));
        resStmts.push(env.DB.prepare('INSERT INTO sch_results (school_id, exam_id, student_id, subject_id, marks, entered_by) VALUES (?, ?, ?, ?, ?, ?)').bind(sid, ex.id, s.id, sub, marks, ctx.user.id));
      });
    });
  });
  await runBatches(env, resStmts);
  await runBatches(env, exRows.slice(0, 1).flatMap((ex) => students.filter((s) => s.cls.id === ex.class_id).slice(0, 3).map((s) => env.DB.prepare(
    `INSERT INTO sch_report_comments (school_id, exam_id, student_id, teacher_comment, remarks, updated_by) VALUES (?, ?, ?, ?, ?, ?)`)
    .bind(sid, ex.id, s.id, 'A hardworking student who participates well in class. Keep it up.', null, ctx.user.id))));

  // ---- timetable (no teacher / room clashes) ----
  const slots = [['08:00', '10:00'], ['10:30', '12:30'], ['13:30', '15:30']];
  const { results: csRows } = await env.DB.prepare('SELECT class_id, subject_id, teacher_id FROM sch_class_subjects WHERE school_id = ?').bind(sid).all();
  const busy = new Set(); const tt = [];
  classes.forEach((c, k) => {
    for (let d = 1; d <= 5; d += 1) {
      slots.forEach(([a, b], si) => {
        const list = subjectIds.slice(); const start = (d * 3 + si + k * 4) % list.length;
        for (let tries = 0; tries < list.length; tries += 1) {
          const sub = list[(start + tries) % list.length];
          const cs = csRows.find((x) => x.class_id === c.id && x.subject_id === sub);
          const key = `${d}|${si}|${cs && cs.teacher_id}`;
          if (cs && cs.teacher_id && busy.has(key)) continue;
          if (cs && cs.teacher_id) busy.add(key);
          tt.push(env.DB.prepare(`INSERT INTO sch_timetable (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(sid, c.id, sub, cs ? cs.teacher_id : null, d, a, b, `Room ${k + 1}`));
          break;
        }
      });
    }
  });
  await runBatches(env, tt);

  // ---- announcements ----
  await runBatches(env, [
    env.DB.prepare(`INSERT INTO sch_notifications (school_id, title, message, type, audience, created_by) VALUES (?, ?, ?, 'general', 'all', ?)`)
      .bind(sid, 'Welcome to the new term', 'Classes resume on Monday at 08:00. Please make sure all fees are up to date.', ctx.user.id),
    env.DB.prepare(`INSERT INTO sch_notifications (school_id, title, message, type, audience, created_by) VALUES (?, ?, ?, 'general', 'parents', ?)`)
      .bind(sid, "Parents' meeting", "There will be a parents' meeting this Saturday at 10:00 in the main hall.", ctx.user.id),
  ]);
  await audit(env, request, ctx, 'demo.load', 'school', sid, `${students.length} students, ${T.length} teachers`);
  return json({ ok: true, students: students.length, teachers: T.length, parents: parents.length }, { status: 201 });
});

export const resetSchoolData = secure({ perm: 'settings.manage', roles: ['admin'] }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  if (String(b.confirm || '').trim() !== ctx.school.name) fail(400, 'To confirm, type the exact name of your school.');
  const sid = ctx.school.id;
  const { results: photos } = await env.DB.prepare(
    `SELECT photo_key AS k FROM sch_students WHERE school_id = ? AND photo_key IS NOT NULL UNION SELECT photo_key FROM sch_teachers WHERE school_id = ? AND photo_key IS NOT NULL`
  ).bind(sid, sid).all();
  await env.DB.batch([
    env.DB.prepare('DELETE FROM sch_payments WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_notifications WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_examinations WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_timetable WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_attendance WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_students WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_parents WHERE school_id = ?').bind(sid),
    env.DB.prepare(`UPDATE sch_members SET active = 0, teacher_id = NULL WHERE school_id = ? AND role = 'teacher'`).bind(sid),
    env.DB.prepare(`DELETE FROM sch_members WHERE school_id = ? AND role = 'parent'`).bind(sid),
    env.DB.prepare('DELETE FROM sch_teachers WHERE school_id = ?').bind(sid),
    env.DB.prepare('DELETE FROM sch_fee_structures WHERE school_id = ?').bind(sid),
  ]);
  if (env.MATERIALS) for (const p of photos.slice(0, 300)) await env.MATERIALS.delete(p.k).catch(() => {});
  await audit(env, request, ctx, 'school.reset', 'school', sid, 'All students, staff records, fees, attendance, exams and payments erased');
  return json({ ok: true });
});
