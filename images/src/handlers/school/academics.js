// School System — classes, subjects, timetable, examinations, results, report cards.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, can, currentYear, getSettings, teacherClassIds, loadStudentForCtx,
} from '../../lib/school-auth.js';
import { CLASS_ORDER } from '../../lib/school-queries.js';
import { buildResultSheet, studentFullName, attendancePercent, ordinal, gradeFor, round2 } from '../../lib/school-calc.js';

const label = (c) => `${c.name}${c.stream ? ' ' + c.stream : ''}`;

// ---------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------
export const listClasses = secure({}, async ({ env, url, ctx }) => {
  const sid = ctx.school.id;
  const where = ['c.school_id = ?']; const binds = [sid];
  const yr = url.searchParams.get('year');
  if (yr) { where.push('c.academic_year_id = ?'); binds.push(V.int(yr, 'Academic year', { min: 1 })); }
  if (ctx.role === 'teacher') {
    const ids = await teacherClassIds(env, ctx);
    if (!ids.length) return json({ classes: [] });
    where.push(`c.id IN (${ids.map(() => '?').join(',')})`); binds.push(...ids);
  }
  const { results } = await env.DB.prepare(
    `SELECT c.*, y.name AS year_name, t.full_name AS teacher_name,
       (SELECT COUNT(*) FROM sch_enrollments e WHERE e.class_id = c.id) AS current_students,
       (SELECT COUNT(*) FROM sch_class_subjects cs WHERE cs.class_id = c.id) AS subject_count,
       (SELECT group_concat(sub.name, ', ') FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id WHERE cs.class_id = c.id) AS subject_names
     FROM sch_classes c JOIN sch_academic_years y ON y.id = c.academic_year_id LEFT JOIN sch_teachers t ON t.id = c.teacher_id
     WHERE ${where.join(' AND ')} ORDER BY y.name DESC, ${CLASS_ORDER}, c.name, c.stream`
  ).bind(...binds).all();
  return json({ classes: results });
});

export const getClass = secure({}, async ({ env, params, ctx }) => {
  const c = await env.DB.prepare(
    `SELECT c.*, t.full_name AS teacher_name FROM sch_classes c LEFT JOIN sch_teachers t ON t.id = c.teacher_id WHERE c.id = ? AND c.school_id = ?`
  ).bind(params.id, ctx.school.id).first();
  if (!c) fail(404, 'Class not found.');
  const { results: subjects } = await env.DB.prepare(
    `SELECT cs.subject_id, sub.name, sub.code, cs.teacher_id, t.full_name AS teacher_name
     FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id LEFT JOIN sch_teachers t ON t.id = cs.teacher_id
     WHERE cs.class_id = ? ORDER BY sub.name`
  ).bind(c.id).all();
  return json({ class: c, subjects });
});

function readClass(b) {
  return {
    name: V.str(b.name, 'Class name', { required: true, max: 60 }),
    level: V.str(b.level, 'Level', { max: 40 }),
    stream: V.str(b.stream, 'Stream', { max: 30 }) || '',
    max_students: V.int(b.max_students, 'Maximum students', { min: 1, max: 500 }) ?? 40,
    status: V.oneOf(b.status, 'Status', ['active', 'inactive'], { def: 'active' }),
  };
}

async function optionalTeacher(env, ctx, id, label = 'Teacher') {
  if (!id) return null;
  const t = await env.DB.prepare('SELECT id FROM sch_teachers WHERE id = ? AND school_id = ?').bind(id, ctx.school.id).first();
  if (!t) fail(400, `${label} was not found.`);
  return t.id;
}

async function saveClassSubjects(env, ctx, classId, list) {
  if (!Array.isArray(list)) return;
  const seen = new Set();
  const stmts = [env.DB.prepare('DELETE FROM sch_class_subjects WHERE class_id = ?').bind(classId)];
  for (const a of list) {
    const subId = V.int(a.subject_id, 'Subject', { required: true, min: 1 });
    if (seen.has(subId)) continue; seen.add(subId);
    const sub = await env.DB.prepare('SELECT id FROM sch_subjects WHERE id = ? AND school_id = ?').bind(subId, ctx.school.id).first();
    if (!sub) fail(400, 'One of the chosen subjects was not found.');
    const tid = await optionalTeacher(env, ctx, a.teacher_id, 'Subject teacher');
    stmts.push(env.DB.prepare('INSERT INTO sch_class_subjects (school_id, class_id, subject_id, teacher_id) VALUES (?, ?, ?, ?)').bind(ctx.school.id, classId, subId, tid));
  }
  await env.DB.batch(stmts);
}

export const createClass = secure({ perm: 'classes.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const c = readClass(b);
  const yearId = b.academic_year_id ? V.int(b.academic_year_id, 'Academic year', { min: 1 }) : (await currentYear(env, ctx.school.id)).id;
  const yr = await env.DB.prepare('SELECT id FROM sch_academic_years WHERE id = ? AND school_id = ?').bind(yearId, ctx.school.id).first();
  if (!yr) fail(400, 'Please choose a valid academic year.');
  const teacherId = await optionalTeacher(env, ctx, b.teacher_id, 'Class teacher');
  const dupe = await env.DB.prepare('SELECT id FROM sch_classes WHERE school_id = ? AND name = ? AND stream = ? AND academic_year_id = ?').bind(ctx.school.id, c.name, c.stream, yearId).first();
  if (dupe) fail(409, `${label(c)} already exists for this academic year.`);
  const r = await env.DB.prepare(
    'INSERT INTO sch_classes (school_id, name, level, stream, academic_year_id, teacher_id, max_students, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(ctx.school.id, c.name, c.level, c.stream, yearId, teacherId, c.max_students, c.status).run();
  await saveClassSubjects(env, ctx, r.meta.last_row_id, b.subjects);
  await audit(env, request, ctx, 'class.create', 'class', r.meta.last_row_id, label(c));
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updateClass = secure({ perm: 'classes.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const cur = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!cur) fail(404, 'Class not found.');
  const c = readClass(b);
  const teacherId = await optionalTeacher(env, ctx, b.teacher_id, 'Class teacher');
  const dupe = await env.DB.prepare('SELECT id FROM sch_classes WHERE school_id = ? AND name = ? AND stream = ? AND academic_year_id = ? AND id != ?')
    .bind(ctx.school.id, c.name, c.stream, cur.academic_year_id, cur.id).first();
  if (dupe) fail(409, `${label(c)} already exists for this academic year.`);
  const enrolled = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_enrollments WHERE class_id = ?').bind(cur.id).first();
  if (c.max_students < enrolled.n) fail(400, `This class already has ${enrolled.n} students, so the maximum cannot be lower than that.`);
  await env.DB.prepare('UPDATE sch_classes SET name = ?, level = ?, stream = ?, teacher_id = ?, max_students = ?, status = ? WHERE id = ?')
    .bind(c.name, c.level, c.stream, teacherId, c.max_students, c.status, cur.id).run();
  await saveClassSubjects(env, ctx, cur.id, b.subjects);
  await audit(env, request, ctx, 'class.update', 'class', cur.id, label(c));
  return json({ ok: true });
});

export const deleteClass = secure({ perm: 'classes.manage' }, async ({ request, env, params, ctx }) => {
  const c = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!c) fail(404, 'Class not found.');
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_enrollments WHERE class_id = ?').bind(c.id).first();
  if (n.n > 0) fail(409, `${label(c)} has ${n.n} student${n.n > 1 ? 's' : ''}. Move them to another class first, or mark the class Inactive instead.`);
  await env.DB.prepare('DELETE FROM sch_classes WHERE id = ?').bind(c.id).run();
  await audit(env, request, ctx, 'class.delete', 'class', c.id, label(c));
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Subjects
// ---------------------------------------------------------------------
export const listSubjects = secure({}, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT sub.*,
       (SELECT group_concat(DISTINCT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END) FROM sch_class_subjects cs JOIN sch_classes c ON c.id = cs.class_id WHERE cs.subject_id = sub.id) AS class_names,
       (SELECT group_concat(DISTINCT t.full_name) FROM sch_class_subjects cs JOIN sch_teachers t ON t.id = cs.teacher_id WHERE cs.subject_id = sub.id) AS teacher_names,
       (SELECT COUNT(*) FROM sch_class_subjects cs WHERE cs.subject_id = sub.id) AS class_count
     FROM sch_subjects sub WHERE sub.school_id = ? ORDER BY sub.name`
  ).bind(ctx.school.id).all();
  const { results: links } = await env.DB.prepare(
    'SELECT class_id, subject_id, teacher_id FROM sch_class_subjects WHERE school_id = ?'
  ).bind(ctx.school.id).all();
  return json({ subjects: results, assignments: links });
});

async function syncSubjectClasses(env, ctx, subjectId, b) {
  if (b.class_ids === undefined) return;
  const ids = V.ids(b.class_ids, 'Classes');
  const teacherId = await optionalTeacher(env, ctx, b.teacher_id, 'Teacher');
  if (ids.length) {
    const { results } = await env.DB.prepare(`SELECT id FROM sch_classes WHERE school_id = ? AND id IN (${ids.map(() => '?').join(',')})`).bind(ctx.school.id, ...ids).all();
    if (results.length !== ids.length) fail(400, 'One of the chosen classes was not found.');
  }
  const stmts = [];
  if (ids.length) stmts.push(env.DB.prepare(`DELETE FROM sch_class_subjects WHERE subject_id = ? AND class_id NOT IN (${ids.map(() => '?').join(',')})`).bind(subjectId, ...ids));
  else stmts.push(env.DB.prepare('DELETE FROM sch_class_subjects WHERE subject_id = ?').bind(subjectId));
  ids.forEach((cid) => stmts.push(env.DB.prepare(
    `INSERT INTO sch_class_subjects (school_id, class_id, subject_id, teacher_id) VALUES (?, ?, ?, ?)
     ON CONFLICT(class_id, subject_id) DO UPDATE SET teacher_id = COALESCE(excluded.teacher_id, sch_class_subjects.teacher_id)`).bind(ctx.school.id, cid, subjectId, teacherId)));
  await env.DB.batch(stmts);
}

export const createSubject = secure({ perm: 'subjects.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Subject name', { required: true, max: 80 });
  const code = V.str(b.code, 'Subject code', { required: true, max: 12 }).toUpperCase();
  const status = V.oneOf(b.status, 'Status', ['active', 'inactive'], { def: 'active' });
  const dupe = await env.DB.prepare('SELECT id FROM sch_subjects WHERE school_id = ? AND code = ?').bind(ctx.school.id, code).first();
  if (dupe) fail(409, `A subject with the code "${code}" already exists.`);
  const r = await env.DB.prepare('INSERT INTO sch_subjects (school_id, name, code, status) VALUES (?, ?, ?, ?)').bind(ctx.school.id, name, code, status).run();
  await syncSubjectClasses(env, ctx, r.meta.last_row_id, b);
  await audit(env, request, ctx, 'subject.create', 'subject', r.meta.last_row_id, `${name} (${code})`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updateSubject = secure({ perm: 'subjects.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const cur = await env.DB.prepare('SELECT * FROM sch_subjects WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!cur) fail(404, 'Subject not found.');
  const name = V.str(b.name, 'Subject name', { required: true, max: 80 });
  const code = V.str(b.code, 'Subject code', { required: true, max: 12 }).toUpperCase();
  const status = V.oneOf(b.status, 'Status', ['active', 'inactive'], { def: 'active' });
  const dupe = await env.DB.prepare('SELECT id FROM sch_subjects WHERE school_id = ? AND code = ? AND id != ?').bind(ctx.school.id, code, cur.id).first();
  if (dupe) fail(409, `A subject with the code "${code}" already exists.`);
  await env.DB.prepare('UPDATE sch_subjects SET name = ?, code = ?, status = ? WHERE id = ?').bind(name, code, status, cur.id).run();
  await syncSubjectClasses(env, ctx, cur.id, b);
  await audit(env, request, ctx, 'subject.update', 'subject', cur.id, `${name} (${code})`);
  return json({ ok: true });
});

export const deleteSubject = secure({ perm: 'subjects.manage' }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare('SELECT * FROM sch_subjects WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!s) fail(404, 'Subject not found.');
  const used = await env.DB.prepare('SELECT (SELECT COUNT(*) FROM sch_results WHERE subject_id = ?1) + (SELECT COUNT(*) FROM sch_attendance WHERE subject_id = ?1) AS n').bind(s.id).first();
  if (used.n > 0) fail(409, `${s.name} already has results or attendance recorded. Mark it Inactive instead of deleting it.`);
  await env.DB.prepare('DELETE FROM sch_subjects WHERE id = ?').bind(s.id).run();
  await audit(env, request, ctx, 'subject.delete', 'subject', s.id, s.name);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Timetable
// ---------------------------------------------------------------------
const TT_SELECT = `SELECT tt.*, c.name AS class_name, c.stream AS class_stream, sub.name AS subject_name, sub.code AS subject_code, t.full_name AS teacher_name
  FROM sch_timetable tt JOIN sch_classes c ON c.id = tt.class_id JOIN sch_subjects sub ON sub.id = tt.subject_id LEFT JOIN sch_teachers t ON t.id = tt.teacher_id`;

export const listTimetable = secure({ parent: true }, async ({ env, url, ctx }) => {
  const where = ['tt.school_id = ?']; const binds = [ctx.school.id];
  let classId = Number(url.searchParams.get('class_id') || 0);
  const teacherId = Number(url.searchParams.get('teacher_id') || 0);
  if (ctx.role === 'parent') {
    const studentId = Number(url.searchParams.get('student_id') || 0);
    if (!studentId) fail(400, 'Please choose a child.');
    const st = await loadStudentForCtx(env, ctx, studentId);
    const enr = await env.DB.prepare('SELECT class_id FROM sch_enrollments WHERE student_id = ? ORDER BY academic_year_id DESC LIMIT 1').bind(st.id).first();
    classId = enr ? enr.class_id : -1;
  }
  if (classId) { where.push('tt.class_id = ?'); binds.push(classId); }
  if (teacherId) { where.push('tt.teacher_id = ?'); binds.push(teacherId); }
  const { results } = await env.DB.prepare(`${TT_SELECT} WHERE ${where.join(' AND ')} ORDER BY tt.day_of_week, tt.start_time`).bind(...binds).all();
  return json({ entries: results });
});

async function readTimetable(env, ctx, b, currentId) {
  const cls = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(V.int(b.class_id, 'Class', { required: true, min: 1 }), ctx.school.id).first();
  if (!cls) fail(400, 'Please choose a valid class.');
  const sub = await env.DB.prepare('SELECT * FROM sch_subjects WHERE id = ? AND school_id = ?').bind(V.int(b.subject_id, 'Subject', { required: true, min: 1 }), ctx.school.id).first();
  if (!sub) fail(400, 'Please choose a valid subject.');
  let teacherId = b.teacher_id ? await optionalTeacher(env, ctx, b.teacher_id) : null;
  if (!teacherId) {
    const cs = await env.DB.prepare('SELECT teacher_id FROM sch_class_subjects WHERE class_id = ? AND subject_id = ?').bind(cls.id, sub.id).first();
    teacherId = cs ? cs.teacher_id : null;
  }
  const day = V.int(b.day_of_week, 'Day', { required: true, min: 1, max: 7 });
  const start = V.time(b.start_time, 'Start time', { required: true });
  const end = V.time(b.end_time, 'End time', { required: true });
  if (end <= start) fail(400, 'The end time must be after the start time.');
  const room = V.str(b.room, 'Room', { max: 40 });

  const overlap = async (col, val, who) => {
    if (!val) return;
    const hit = await env.DB.prepare(
      `SELECT tt.start_time, tt.end_time, c.name AS cn, sub.name AS sn FROM sch_timetable tt JOIN sch_classes c ON c.id = tt.class_id JOIN sch_subjects sub ON sub.id = tt.subject_id
       WHERE tt.school_id = ? AND tt.${col} = ? AND tt.day_of_week = ? AND tt.start_time < ? AND tt.end_time > ? AND tt.id != ? LIMIT 1`
    ).bind(ctx.school.id, val, day, end, start, currentId || 0).first();
    if (hit) fail(409, `Clash: ${who} already has ${hit.sn} (${hit.cn}) from ${hit.start_time} to ${hit.end_time} on that day.`);
  };
  await overlap('class_id', cls.id, `${label(cls)}`);
  await overlap('teacher_id', teacherId, 'This teacher');
  if (room) {
    const hit = await env.DB.prepare(
      `SELECT tt.start_time, tt.end_time FROM sch_timetable tt WHERE tt.school_id = ? AND lower(tt.room) = lower(?) AND tt.day_of_week = ? AND tt.start_time < ? AND tt.end_time > ? AND tt.id != ? LIMIT 1`
    ).bind(ctx.school.id, room, day, end, start, currentId || 0).first();
    if (hit) fail(409, `Clash: room ${room} is already used from ${hit.start_time} to ${hit.end_time} on that day.`);
  }
  return { class_id: cls.id, subject_id: sub.id, teacher_id: teacherId, day_of_week: day, start_time: start, end_time: end, room };
}

export const createTimetable = secure({ perm: 'timetable.manage' }, async ({ request, env, ctx }) => {
  const t = await readTimetable(env, ctx, await readJson(request), null);
  const r = await env.DB.prepare(
    'INSERT INTO sch_timetable (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(ctx.school.id, t.class_id, t.subject_id, t.teacher_id, t.day_of_week, t.start_time, t.end_time, t.room).run();
  await audit(env, request, ctx, 'timetable.create', 'timetable', r.meta.last_row_id, `day ${t.day_of_week} ${t.start_time}-${t.end_time}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updateTimetable = secure({ perm: 'timetable.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT id FROM sch_timetable WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!cur) fail(404, 'Timetable entry not found.');
  const t = await readTimetable(env, ctx, await readJson(request), cur.id);
  await env.DB.prepare(
    'UPDATE sch_timetable SET class_id = ?, subject_id = ?, teacher_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?'
  ).bind(t.class_id, t.subject_id, t.teacher_id, t.day_of_week, t.start_time, t.end_time, t.room, cur.id).run();
  await audit(env, request, ctx, 'timetable.update', 'timetable', cur.id, null);
  return json({ ok: true });
});

export const deleteTimetable = secure({ perm: 'timetable.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM sch_timetable WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, 'Timetable entry not found.');
  await audit(env, request, ctx, 'timetable.delete', 'timetable', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Examinations
// ---------------------------------------------------------------------
async function examForCtx(env, ctx, id) {
  const ex = await env.DB.prepare(
    `SELECT x.*, c.name AS class_name, c.stream AS class_stream, y.name AS year_name, tm.name AS term_name
     FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id JOIN sch_academic_years y ON y.id = x.academic_year_id
     LEFT JOIN sch_terms tm ON tm.id = x.term_id WHERE x.id = ? AND x.school_id = ?`
  ).bind(id, ctx.school.id).first();
  if (!ex) fail(404, 'Examination not found.');
  if (ctx.role === 'teacher' && !(await teacherClassIds(env, ctx)).includes(ex.class_id)) fail(403, 'This examination is for a class that is not yours.');
  return ex;
}

export const listExams = secure({ perm: ['exams.manage', 'results.enter', 'results.view'] }, async ({ env, url, ctx }) => {
  const where = ['x.school_id = ?']; const binds = [ctx.school.id];
  const classId = Number(url.searchParams.get('class_id') || 0);
  if (classId) { where.push('x.class_id = ?'); binds.push(classId); }
  const yearId = Number(url.searchParams.get('year') || 0);
  if (yearId) { where.push('x.academic_year_id = ?'); binds.push(yearId); }
  if (ctx.role === 'teacher') {
    const ids = await teacherClassIds(env, ctx);
    if (!ids.length) return json({ exams: [] });
    where.push(`x.class_id IN (${ids.map(() => '?').join(',')})`); binds.push(...ids);
  }
  const { results } = await env.DB.prepare(
    `SELECT x.*, c.name AS class_name, c.stream AS class_stream, y.name AS year_name, tm.name AS term_name,
       (SELECT COUNT(*) FROM sch_results r WHERE r.exam_id = x.id) AS results_count,
       (SELECT COUNT(DISTINCT r.student_id) FROM sch_results r WHERE r.exam_id = x.id) AS students_marked
     FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id JOIN sch_academic_years y ON y.id = x.academic_year_id
     LEFT JOIN sch_terms tm ON tm.id = x.term_id WHERE ${where.join(' AND ')} ORDER BY COALESCE(x.exam_date, x.created_at) DESC, x.id DESC`
  ).bind(...binds).all();
  return json({ exams: results });
});

export const getExam = secure({ perm: ['exams.manage', 'results.enter', 'results.view'] }, async ({ env, params, ctx }) => {
  const ex = await examForCtx(env, ctx, params.id);
  const { results: subjects } = await env.DB.prepare(
    `SELECT cs.subject_id, sub.name, sub.code, cs.teacher_id, t.full_name AS teacher_name,
       (SELECT COUNT(*) FROM sch_results r WHERE r.exam_id = ? AND r.subject_id = cs.subject_id) AS marks_entered,
       (SELECT COUNT(*) FROM sch_student_subjects ss JOIN sch_enrollments e ON e.student_id = ss.student_id AND e.academic_year_id = ss.academic_year_id
          JOIN sch_students st ON st.id = ss.student_id
          WHERE ss.subject_id = cs.subject_id AND e.class_id = ? AND ss.academic_year_id = ? AND st.status = 'active') AS students_expected
     FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id LEFT JOIN sch_teachers t ON t.id = cs.teacher_id
     WHERE cs.class_id = ? AND sub.status = 'active' ORDER BY sub.name`
  ).bind(ex.id, ex.class_id, ex.academic_year_id, ex.class_id).all();
  const mine = ctx.role === 'teacher' ? await teacherManages(env, ctx, ex.class_id) : null;
  return json({ exam: ex, subjects: subjects.map((s) => ({ ...s, can_enter: can(ctx, 'results.enter') && (ctx.role !== 'teacher' || mine.classTeacher || s.teacher_id === ctx.teacherId) })) });
});

async function teacherManages(env, ctx, classId) {
  const c = await env.DB.prepare('SELECT teacher_id FROM sch_classes WHERE id = ?').bind(classId).first();
  return { classTeacher: !!(c && c.teacher_id && c.teacher_id === ctx.teacherId) };
}

async function readExam(env, ctx, b) {
  const cls = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(V.int(b.class_id, 'Class', { required: true, min: 1 }), ctx.school.id).first();
  if (!cls) fail(400, 'Please choose a valid class.');
  if (ctx.role === 'teacher' && !(await teacherClassIds(env, ctx)).includes(cls.id)) fail(403, 'You can only create examinations for your own classes.');
  let termId = null;
  if (b.term_id) {
    const t = await env.DB.prepare('SELECT id FROM sch_terms WHERE id = ? AND school_id = ?').bind(b.term_id, ctx.school.id).first();
    if (!t) fail(400, 'Please choose a valid term.');
    termId = t.id;
  }
  return {
    name: V.str(b.name, 'Examination name', { required: true, max: 100 }),
    exam_type: V.str(b.exam_type, 'Examination type', { max: 60 }) || 'Monthly Test',
    academic_year_id: cls.academic_year_id, term_id: termId, class_id: cls.id, cls,
    exam_date: V.date(b.exam_date, 'Examination date'),
    max_marks: V.num(b.max_marks, 'Maximum marks', { min: 1, max: 1000 }) ?? 100,
  };
}

export const createExam = secure({ perm: 'exams.manage' }, async ({ request, env, ctx }) => {
  const e = await readExam(env, ctx, await readJson(request));
  const r = await env.DB.prepare(
    `INSERT INTO sch_examinations (school_id, name, exam_type, academic_year_id, term_id, class_id, exam_date, max_marks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.school.id, e.name, e.exam_type, e.academic_year_id, e.term_id, e.class_id, e.exam_date, e.max_marks, ctx.user.id).run();
  // Automation: tell the class's parents & staff about the new examination.
  await env.DB.prepare(
    `INSERT INTO sch_notifications (school_id, title, message, type, audience, class_id, created_by) VALUES (?, ?, ?, 'exam_announcement', 'class', ?, ?)`
  ).bind(ctx.school.id, `Examination: ${e.name}`, `${e.name} (${e.exam_type}) for ${label(e.cls)}${e.exam_date ? ' is scheduled for ' + e.exam_date : ' has been created'}.`, e.class_id, ctx.user.id).run();
  await audit(env, request, ctx, 'exam.create', 'exam', r.meta.last_row_id, `${e.name} — ${label(e.cls)}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updateExam = secure({ perm: 'exams.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await examForCtx(env, ctx, params.id);
  const e = await readExam(env, ctx, { ...(await readJson(request)), class_id: cur.class_id });
  await env.DB.prepare('UPDATE sch_examinations SET name = ?, exam_type = ?, term_id = ?, exam_date = ?, max_marks = ? WHERE id = ?')
    .bind(e.name, e.exam_type, e.term_id, e.exam_date, e.max_marks, cur.id).run();
  await audit(env, request, ctx, 'exam.update', 'exam', cur.id, e.name);
  return json({ ok: true });
});

export const deleteExam = secure({ perm: 'exams.manage' }, async ({ request, env, params, ctx }) => {
  const ex = await examForCtx(env, ctx, params.id);
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_results WHERE exam_id = ?').bind(ex.id).first();
  if (n.n > 0 && ctx.role !== 'admin') fail(409, 'This examination already has marks entered. Only an administrator can delete it.');
  await env.DB.prepare('DELETE FROM sch_examinations WHERE id = ?').bind(ex.id).run();
  await audit(env, request, ctx, 'exam.delete', 'exam', ex.id, `${ex.name} (${n.n} marks removed)`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Results — entry
// ---------------------------------------------------------------------
async function assertCanEnter(env, ctx, ex, subjectId) {
  if (ctx.role === 'teacher') {
    const cs = await env.DB.prepare('SELECT teacher_id FROM sch_class_subjects WHERE class_id = ? AND subject_id = ?').bind(ex.class_id, subjectId).first();
    const m = await teacherManages(env, ctx, ex.class_id);
    if (!m.classTeacher && !(cs && cs.teacher_id === ctx.teacherId)) fail(403, 'You can only enter marks for the subjects you teach.');
  }
}

export const resultEntrySheet = secure({ perm: ['results.enter', 'results.view'] }, async ({ env, url, ctx }) => {
  const ex = await examForCtx(env, ctx, Number(url.searchParams.get('exam_id') || 0));
  const subjectId = V.int(url.searchParams.get('subject_id'), 'Subject', { required: true, min: 1 });
  const sub = await env.DB.prepare(
    'SELECT sub.id, sub.name, sub.code FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id WHERE cs.class_id = ? AND sub.id = ?'
  ).bind(ex.class_id, subjectId).first();
  if (!sub) fail(400, 'This subject is not taught in the examination\'s class.');
  const { results } = await env.DB.prepare(
    `SELECT st.id, st.admission_no, st.first_name, st.middle_name, st.last_name, r.marks
     FROM sch_student_subjects ss JOIN sch_students st ON st.id = ss.student_id
     JOIN sch_enrollments e ON e.student_id = st.id AND e.academic_year_id = ss.academic_year_id
     LEFT JOIN sch_results r ON r.exam_id = ? AND r.student_id = st.id AND r.subject_id = ss.subject_id
     WHERE ss.subject_id = ? AND e.class_id = ? AND ss.academic_year_id = ? AND st.status = 'active' AND st.school_id = ?
     ORDER BY st.first_name COLLATE NOCASE, st.last_name COLLATE NOCASE`
  ).bind(ex.id, subjectId, ex.class_id, ex.academic_year_id, ctx.school.id).all();
  let canEnter = can(ctx, 'results.enter');
  if (canEnter) { try { await assertCanEnter(env, ctx, ex, subjectId); } catch (e) { canEnter = false; } }
  return json({ exam: ex, subject: sub, can_enter: canEnter, students: results.map((s) => ({ id: s.id, admission_no: s.admission_no, full_name: studentFullName(s), marks: s.marks })) });
});

export const saveResults = secure({ perm: 'results.enter' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const ex = await examForCtx(env, ctx, V.int(b.exam_id, 'Examination', { required: true, min: 1 }));
  const subjectId = V.int(b.subject_id, 'Subject', { required: true, min: 1 });
  await assertCanEnter(env, ctx, ex, subjectId);
  if (!Array.isArray(b.marks) || !b.marks.length) fail(400, 'There are no marks to save.');
  const { results: allowed } = await env.DB.prepare(
    `SELECT ss.student_id FROM sch_student_subjects ss JOIN sch_enrollments e ON e.student_id = ss.student_id AND e.academic_year_id = ss.academic_year_id
     WHERE ss.subject_id = ? AND e.class_id = ? AND ss.academic_year_id = ? AND ss.school_id = ?`
  ).bind(subjectId, ex.class_id, ex.academic_year_id, ctx.school.id).all();
  const ok = new Set(allowed.map((r) => r.student_id));
  const stmts = []; let saved = 0; let cleared = 0;
  for (const m of b.marks) {
    const studentId = V.int(m.student_id, 'Student', { required: true, min: 1 });
    if (!ok.has(studentId)) fail(400, 'One of the students does not take this subject in this class.');
    if (m.marks === '' || m.marks == null) {
      stmts.push(env.DB.prepare('DELETE FROM sch_results WHERE exam_id = ? AND student_id = ? AND subject_id = ?').bind(ex.id, studentId, subjectId));
      cleared += 1; continue;
    }
    const marks = V.num(m.marks, 'Marks', { required: true, min: 0, max: ex.max_marks });
    stmts.push(env.DB.prepare(
      `INSERT INTO sch_results (school_id, exam_id, student_id, subject_id, marks, entered_by) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET marks = excluded.marks, entered_by = excluded.entered_by, updated_at = datetime('now')`
    ).bind(ctx.school.id, ex.id, studentId, subjectId, marks, ctx.user.id));
    saved += 1;
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  await audit(env, request, ctx, 'result.enter', 'exam', ex.id, `${ex.name}: ${saved} marks saved, ${cleared} cleared (subject #${subjectId})`);
  return json({ ok: true, saved, cleared });
});

// ---------------------------------------------------------------------
// Results — class sheet, report card, per-student history
// ---------------------------------------------------------------------
export async function loadSheet(env, ctx, ex) {
  const settings = await getSettings(env, ctx.school.id);
  const { results: students } = await env.DB.prepare(
    `SELECT st.id, st.admission_no, st.first_name, st.middle_name, st.last_name, st.gender
     FROM sch_enrollments e JOIN sch_students st ON st.id = e.student_id
     WHERE e.class_id = ? AND e.academic_year_id = ? AND st.school_id = ? ORDER BY st.first_name COLLATE NOCASE, st.last_name COLLATE NOCASE`
  ).bind(ex.class_id, ex.academic_year_id, ctx.school.id).all();
  const { results: marks } = await env.DB.prepare('SELECT student_id, subject_id, marks FROM sch_results WHERE exam_id = ?').bind(ex.id).all();
  const { results: subs } = await env.DB.prepare('SELECT id, name, code FROM sch_subjects WHERE school_id = ?').bind(ctx.school.id).all();
  const subjectsById = Object.fromEntries(subs.map((s) => [s.id, s]));
  const sheet = buildResultSheet({ exam: ex, students, results: marks, subjectsById, scale: settings.grading_scale, divisionCfg: settings.division });
  return { settings, students, sheet, subjectsById };
}

export const examSheet = secure({ perm: 'results.view' }, async ({ env, params, ctx }) => {
  const ex = await examForCtx(env, ctx, params.id);
  const { students, sheet, subjectsById } = await loadSheet(env, ctx, ex);
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  const usedSubjects = [...new Set(sheet.rows.flatMap((r) => r.subjects.map((s) => s.subject_id)))].map((id) => subjectsById[id]).filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
  const rows = sheet.rows.map((r) => ({ ...r, admission_no: byId[r.student_id].admission_no, full_name: studentFullName(byId[r.student_id]), gender: byId[r.student_id].gender }))
    .sort((a, b) => (a.position || 9999) - (b.position || 9999) || a.full_name.localeCompare(b.full_name));
  const scored = sheet.rows.filter((r) => r.subject_count > 0);
  const classAverage = scored.length ? round2(scored.reduce((s, r) => s + r.average, 0) / scored.length) : null;
  return json({ exam: ex, subjects: usedSubjects, rows, out_of: sheet.out_of, class_average: classAverage });
});

async function buildReportCard(env, ctx, ex, studentId) {
  const { settings, students, sheet } = await loadSheet(env, ctx, ex);
  const st = students.find((s) => s.id === studentId);
  if (!st) fail(404, 'This student is not in the examination\'s class.');
  const row = sheet.rows.find((r) => r.student_id === studentId);
  const cm = await env.DB.prepare('SELECT teacher_comment, remarks FROM sch_report_comments WHERE exam_id = ? AND student_id = ?').bind(ex.id, studentId).first();
  const att = await env.DB.prepare(
    `SELECT SUM(status = 'present') AS present, SUM(status = 'absent') AS absent, SUM(status = 'late') AS late FROM sch_attendance WHERE student_id = ?`
  ).bind(studentId).first();
  const scored = sheet.rows.filter((r) => r.subject_count > 0);
  const classAverage = scored.length ? round2(scored.reduce((s, r) => s + r.average, 0) / scored.length) : null;
  const overall = row.subject_count ? gradeFor(row.average, 100, settings.grading_scale) : null;
  const suggested = overall
    ? ({ A: 'Outstanding performance. Keep up the excellent work.', B: 'Very good results. A little more effort will reach the top.', C: 'Good work. Focus on weaker subjects to improve further.', D: 'Fair performance. More revision and practice are needed.' }[overall.grade] || 'Performance is below expectation. Extra support and regular revision are strongly advised.')
    : '';
  const sc = ctx.school;
  return {
    school: { name: sc.name, short_name: sc.short_name, phone: sc.phone, email: sc.email, address: sc.address, website: sc.website, has_logo: !!sc.logo_key, id: sc.id, primary_color: sc.primary_color },
    student: { id: st.id, admission_no: st.admission_no, full_name: studentFullName(st), gender: st.gender },
    exam: { id: ex.id, name: ex.name, exam_type: ex.exam_type, term_name: ex.term_name, year_name: ex.year_name, class_name: label({ name: ex.class_name, stream: ex.class_stream }), exam_date: ex.exam_date, max_marks: ex.max_marks },
    subjects: row.subjects, total: row.total, subject_count: row.subject_count, average: row.average, grade: row.grade, remarks_overall: row.remarks,
    position: row.position, position_label: row.position ? `${ordinal(row.position)} out of ${sheet.out_of}` : '—', out_of: sheet.out_of,
    division: row.division, division_points: row.division_points, class_average: classAverage,
    attendance_percent: att ? attendancePercent(att.present || 0, att.absent || 0, att.late || 0) : null,
    teacher_comment: cm ? cm.teacher_comment : null, academic_remarks: cm && cm.remarks ? cm.remarks : row.remarks, suggested_comment: suggested,
    grading_scale: settings.grading_scale,
  };
}

export const reportCard = secure({ parent: true }, async ({ env, url, ctx }) => {
  if (ctx.role !== 'parent' && !can(ctx, 'results.view')) fail(403, 'You do not have permission to view results.');
  const studentId = V.int(url.searchParams.get('student_id'), 'Student', { required: true, min: 1 });
  await loadStudentForCtx(env, ctx, studentId);
  const ex = await examForCtx(env, ctx, Number(url.searchParams.get('exam_id') || 0));
  return json({ report: await buildReportCard(env, ctx, ex, studentId) });
});

export const saveReportComment = secure({ perm: 'results.enter' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const ex = await examForCtx(env, ctx, V.int(b.exam_id, 'Examination', { required: true, min: 1 }));
  const studentId = V.int(b.student_id, 'Student', { required: true, min: 1 });
  const st = await env.DB.prepare('SELECT id FROM sch_enrollments WHERE student_id = ? AND class_id = ?').bind(studentId, ex.class_id).first();
  if (!st) fail(400, 'This student is not in the examination\'s class.');
  await env.DB.prepare(
    `INSERT INTO sch_report_comments (school_id, exam_id, student_id, teacher_comment, remarks, updated_by) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(exam_id, student_id) DO UPDATE SET teacher_comment = excluded.teacher_comment, remarks = excluded.remarks, updated_by = excluded.updated_by, updated_at = datetime('now')`
  ).bind(ctx.school.id, ex.id, studentId, V.str(b.teacher_comment, 'Teacher comment', { max: 500 }), V.str(b.remarks, 'Remarks', { max: 300 }), ctx.user.id).run();
  await audit(env, request, ctx, 'result.comment', 'exam', ex.id, `student #${studentId}`);
  return json({ ok: true });
});

// GET /students/:id/results — every examination the student has marks in.
export const studentResults = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== 'parent' && !can(ctx, 'results.view')) fail(403, 'You do not have permission to view results.');
  const st = await loadStudentForCtx(env, ctx, params.id);
  const { results: exams } = await env.DB.prepare(
    `SELECT DISTINCT x.* FROM sch_examinations x JOIN sch_results r ON r.exam_id = x.id WHERE r.student_id = ? ORDER BY COALESCE(x.exam_date, x.created_at) DESC, x.id DESC`
  ).bind(st.id).all();
  const out = [];
  for (const ex of exams.slice(0, 12)) {
    const full = { ...ex, class_name: '', class_stream: '' };
    const { sheet } = await loadSheet(env, ctx, full);
    const row = sheet.rows.find((r) => r.student_id === st.id);
    if (!row) continue;
    out.push({
      exam_id: ex.id, exam_name: ex.name, exam_type: ex.exam_type, exam_date: ex.exam_date, max_marks: ex.max_marks,
      subjects: row.subjects, total: row.total, average: row.average, grade: row.grade, division: row.division,
      position: row.position, position_label: row.position ? `${ordinal(row.position)} / ${sheet.out_of}` : '—',
    });
  }
  return json({ results: out });
});
