// Smart21Institution — academics: years & terms, courses, teaching assignments,
// enrolment, marks/results and student academic records.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, notify, getSettings, gradeFor, round2, likeTerm, paging, can, userIdForBorrower, chunk,
} from '../../lib/institution-auth.js';

async function own(env, table, instId, id, label) {
  const r = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND institution_id = ?`).bind(id, instId).first();
  if (!r) fail(404, `That ${label} could not be found.`);
  return r;
}

// ---------------------------------------------------------------------
// Academic years & terms
// ---------------------------------------------------------------------
export const listYears = secure(async ({ env, ctx }) => {
  const [y, t] = await Promise.all([
    env.DB.prepare('SELECT * FROM ins_academic_years WHERE institution_id = ? ORDER BY name DESC').bind(ctx.inst.id).all(),
    env.DB.prepare('SELECT * FROM ins_terms WHERE institution_id = ? ORDER BY academic_year_id DESC, start_date, id').bind(ctx.inst.id).all(),
  ]);
  return json({ years: y.results, terms: t.results });
});

export const saveYear = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Academic year', { required: true, max: 30 });
  const start = V.date(b.start_date, 'Start date'); const end = V.date(b.end_date, 'End date');
  if (start && end && end < start) fail(400, 'The end date must be after the start date.');
  const dup = await env.DB.prepare('SELECT id FROM ins_academic_years WHERE institution_id = ? AND name = ? AND id != ?').bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, 'This academic year already exists.');
  let id = Number(params.id) || null;
  if (id) { await own(env, 'ins_academic_years', ctx.inst.id, id, 'academic year'); await env.DB.prepare('UPDATE ins_academic_years SET name = ?, start_date = ?, end_date = ? WHERE id = ?').bind(name, start, end, id).run(); }
  else id = (await env.DB.prepare('INSERT INTO ins_academic_years (institution_id, name, start_date, end_date) VALUES (?, ?, ?, ?)').bind(ctx.inst.id, name, start, end).run()).meta.last_row_id;
  if (b.is_current) await env.DB.batch([
    env.DB.prepare('UPDATE ins_academic_years SET is_current = 0 WHERE institution_id = ?').bind(ctx.inst.id),
    env.DB.prepare('UPDATE ins_academic_years SET is_current = 1 WHERE id = ?').bind(id),
  ]);
  await audit(env, request, ctx, 'academics', 'year.save', 'academic_year', id, name);
  return json({ ok: true, id });
});

export const saveTerm = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const yearId = V.int(b.academic_year_id, 'Academic year', { required: true, min: 1 });
  await own(env, 'ins_academic_years', ctx.inst.id, yearId, 'academic year');
  const name = V.str(b.name, 'Term name', { required: true, max: 40 });
  const start = V.date(b.start_date, 'Start date'); const end = V.date(b.end_date, 'End date');
  if (start && end && end < start) fail(400, 'The end date must be after the start date.');
  const dup = await env.DB.prepare('SELECT id FROM ins_terms WHERE institution_id = ? AND academic_year_id = ? AND name = ? AND id != ?').bind(ctx.inst.id, yearId, name, Number(params.id) || 0).first();
  if (dup) fail(409, 'This term already exists in that year.');
  let id = Number(params.id) || null;
  if (id) { await own(env, 'ins_terms', ctx.inst.id, id, 'term'); await env.DB.prepare('UPDATE ins_terms SET academic_year_id = ?, name = ?, start_date = ?, end_date = ? WHERE id = ?').bind(yearId, name, start, end, id).run(); }
  else id = (await env.DB.prepare('INSERT INTO ins_terms (institution_id, academic_year_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)').bind(ctx.inst.id, yearId, name, start, end).run()).meta.last_row_id;
  if (b.is_current) await env.DB.batch([
    env.DB.prepare('UPDATE ins_terms SET is_current = 0 WHERE institution_id = ?').bind(ctx.inst.id),
    env.DB.prepare('UPDATE ins_terms SET is_current = 1 WHERE id = ?').bind(id),
  ]);
  await audit(env, request, ctx, 'academics', 'term.save', 'term', id, name);
  return json({ ok: true, id });
});

export const deleteTerm = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_enrollments WHERE term_id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (used.n) fail(409, 'This term already has enrolments and results, so it cannot be deleted.');
  const r = await env.DB.prepare('DELETE FROM ins_terms WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Term not found.');
  await audit(env, request, ctx, 'academics', 'term.delete', 'term', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Courses / subjects
// ---------------------------------------------------------------------
export const listCourses = secure({ perm: ['academics.view', 'academics.manage'] }, async ({ env, url, ctx }) => {
  const sp = url.searchParams; const { page, limit, offset } = paging(url, 30, 100);
  const where = ['c.institution_id = ?1']; const binds = [ctx.inst.id];
  const q = (sp.get('q') || '').trim();
  if (q) { where.push(`(c.name LIKE ?${binds.length + 1} ESCAPE '\\' OR c.code LIKE ?${binds.length + 1} ESCAPE '\\')`); binds.push(likeTerm(q)); }
  if (sp.get('programme_id')) { where.push(`c.programme_id = ?${binds.length + 1}`); binds.push(V.int(sp.get('programme_id'), 'Programme', { min: 1 })); }
  if (ctx.role === 'teacher' && sp.get('mine') === '1') { where.push(`c.id IN (SELECT course_id FROM ins_teaching WHERE staff_id = ?${binds.length + 1})`); binds.push(ctx.staffId || 0); }
  const from = `FROM ins_courses c LEFT JOIN ins_programmes p ON p.id = c.programme_id LEFT JOIN ins_departments d ON d.id = c.department_id WHERE ${where.join(' AND ')}`;
  const [{ results }, n] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.code, c.name, c.credits, c.level, c.active, c.programme_id, c.department_id, p.name AS programme, d.name AS department,
      (SELECT GROUP_CONCAT(DISTINCT f.full_name) FROM ins_teaching t JOIN ins_staff f ON f.id = t.staff_id WHERE t.course_id = c.id) AS teachers
      ${from} ORDER BY c.code LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first(),
  ]);
  return json({ courses: results, total: n.n, page, limit });
});

export const saveCourse = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const code = V.str(b.code, 'Course code', { required: true, max: 20 }).toUpperCase();
  const name = V.str(b.name, 'Course name', { required: true, max: 140, min: 2 });
  const prog = V.int(b.programme_id, 'Programme', { min: 1 }); const dept = V.int(b.department_id, 'Department', { min: 1 });
  if (prog) await own(env, 'ins_programmes', ctx.inst.id, prog, 'programme');
  if (dept) await own(env, 'ins_departments', ctx.inst.id, dept, 'department');
  const dup = await env.DB.prepare('SELECT id FROM ins_courses WHERE institution_id = ? AND code = ? COLLATE NOCASE AND id != ?').bind(ctx.inst.id, code, Number(params.id) || 0).first();
  if (dup) fail(409, `The course code ${code} is already used.`);
  const vals = [prog, dept, code, name, V.num(b.credits, 'Credits', { min: 0, max: 100 }), V.str(b.level, 'Level', { max: 40 }), b.active === false || b.active === 0 ? 0 : 1];
  if (params.id) {
    const r = await env.DB.prepare('UPDATE ins_courses SET programme_id = ?, department_id = ?, code = ?, name = ?, credits = ?, level = ?, active = ? WHERE id = ? AND institution_id = ?').bind(...vals, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, 'Course not found.');
  } else await env.DB.prepare('INSERT INTO ins_courses (institution_id, programme_id, department_id, code, name, credits, level, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').bind(ctx.inst.id, ...vals).run();
  await audit(env, request, ctx, 'academics', 'course.save', 'course', Number(params.id) || null, `${code} ${name}`);
  return json({ ok: true });
});

export const deleteCourse = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const used = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_enrollments WHERE course_id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (used.n) fail(409, 'Students are enrolled in this course, so it cannot be deleted. Mark it inactive instead.');
  const r = await env.DB.prepare('DELETE FROM ins_courses WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Course not found.');
  await audit(env, request, ctx, 'academics', 'course.delete', 'course', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Teacher assignments
// ---------------------------------------------------------------------
export const listTeaching = secure({ perm: ['academics.view', 'academics.manage'] }, async ({ env, url, ctx }) => {
  const course = url.searchParams.get('course_id');
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.course_id, t.staff_id, t.term_id, c.code, c.name AS course, f.full_name AS teacher, tm.name AS term
     FROM ins_teaching t JOIN ins_courses c ON c.id = t.course_id JOIN ins_staff f ON f.id = t.staff_id LEFT JOIN ins_terms tm ON tm.id = t.term_id
     WHERE t.institution_id = ?${course ? ' AND t.course_id = ?' : ''} ORDER BY c.code, f.full_name`).bind(...(course ? [ctx.inst.id, Number(course)] : [ctx.inst.id])).all();
  return json({ teaching: results });
});

export const assignTeacher = secure({ perm: 'academics.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const course = V.int(b.course_id, 'Course', { required: true, min: 1 }); const staff = V.int(b.staff_id, 'Teacher', { required: true, min: 1 });
  const term = V.int(b.term_id, 'Term', { min: 1 });
  await own(env, 'ins_courses', ctx.inst.id, course, 'course'); const f = await own(env, 'ins_staff', ctx.inst.id, staff, 'teacher');
  if (term) await own(env, 'ins_terms', ctx.inst.id, term, 'term');
  const dup = await env.DB.prepare('SELECT id FROM ins_teaching WHERE course_id = ? AND staff_id = ? AND COALESCE(term_id,0) = ?').bind(course, staff, term || 0).first();
  if (dup) fail(409, 'This teacher is already assigned to that course.');
  const r = await env.DB.prepare('INSERT INTO ins_teaching (institution_id, course_id, staff_id, term_id) VALUES (?, ?, ?, ?)').bind(ctx.inst.id, course, staff, term).run();
  await audit(env, request, ctx, 'academics', 'teaching.assign', 'course', course, f.full_name);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const removeTeacher = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM ins_teaching WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Assignment not found.');
  await audit(env, request, ctx, 'academics', 'teaching.remove', 'teaching', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Enrolment
// ---------------------------------------------------------------------
export const listEnrollments = secure({ perm: ['academics.view', 'academics.manage'] }, async ({ env, url, ctx }) => {
  const course = V.int(url.searchParams.get('course_id'), 'Course', { required: true, min: 1 }); const term = V.int(url.searchParams.get('term_id'), 'Term', { required: true, min: 1 });
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.student_id, e.status, s.student_no, s.full_name, s.class_name, r.marks, r.grade
     FROM ins_enrollments e JOIN ins_students s ON s.id = e.student_id LEFT JOIN ins_results r ON r.enrollment_id = e.id
     WHERE e.institution_id = ? AND e.course_id = ? AND e.term_id = ? AND s.deleted_at IS NULL ORDER BY s.full_name COLLATE NOCASE`).bind(ctx.inst.id, course, term).all();
  return json({ enrollments: results });
});

export const enroll = secure({ perm: 'academics.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const course = V.int(b.course_id, 'Course', { required: true, min: 1 }); const term = V.int(b.term_id, 'Term', { required: true, min: 1 });
  const c = await own(env, 'ins_courses', ctx.inst.id, course, 'course'); await own(env, 'ins_terms', ctx.inst.id, term, 'term');
  let ids = V.ids(b.student_ids, 'Students');
  if (b.programme_id || b.class_name) {     // enrol a whole programme / class at once
    const w = ['institution_id = ?1', 'deleted_at IS NULL', `status = 'active'`]; const bind = [ctx.inst.id];
    if (b.programme_id) { w.push(`programme_id = ?${bind.length + 1}`); bind.push(V.int(b.programme_id, 'Programme', { min: 1 })); }
    if (b.class_name) { w.push(`class_name = ?${bind.length + 1}`); bind.push(V.str(b.class_name, 'Class', { max: 60 })); }
    const { results } = await env.DB.prepare(`SELECT id FROM ins_students WHERE ${w.join(' AND ')} LIMIT 500`).bind(...bind).all();
    ids = [...new Set([...ids, ...results.map((r) => r.id)])];
  }
  if (!ids.length) fail(400, 'Choose at least one student.');
  // only students of this institution
  const valid = new Set();
  for (const part of chunk(ids, 80)) {
    const { results } = await env.DB.prepare(`SELECT id FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND id IN (${part.map(() => '?').join(',')})`).bind(ctx.inst.id, ...part).all();
    results.forEach((r) => valid.add(r.id));
  }
  const stmts = [...valid].map((sid) => env.DB.prepare(`INSERT OR IGNORE INTO ins_enrollments (institution_id, student_id, course_id, term_id) VALUES (?, ?, ?, ?)`).bind(ctx.inst.id, sid, course, term));
  for (const part of chunk(stmts, 90)) await env.DB.batch(part);
  await audit(env, request, ctx, 'academics', 'enrollment.add', 'course', course, `${valid.size} student(s) in ${c.code}`);
  return json({ ok: true, enrolled: valid.size, skipped: ids.length - valid.size });
});

export const unenroll = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const e = await env.DB.prepare('SELECT id FROM ins_enrollments WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (!e) fail(404, 'Enrolment not found.');
  const res = await env.DB.prepare('SELECT id FROM ins_results WHERE enrollment_id = ?').bind(e.id).first();
  if (res) await env.DB.prepare(`UPDATE ins_enrollments SET status = 'dropped' WHERE id = ?`).bind(e.id).run();   // keep the academic record
  else await env.DB.prepare('DELETE FROM ins_enrollments WHERE id = ?').bind(e.id).run();
  await audit(env, request, ctx, 'academics', 'enrollment.remove', 'enrollment', e.id, res ? 'marked dropped (has results)' : 'removed');
  return json({ ok: true, kept: !!res });
});

// ---------------------------------------------------------------------
// Marks / results
// ---------------------------------------------------------------------
async function assertCanMark(env, ctx, courseId) {
  if (can(ctx, 'results.all')) return;
  if (!can(ctx, 'results.enter')) fail(403, 'You do not have permission to perform this action.');
  if (!ctx.staffId) fail(403, 'Your login is not linked to a staff record, so you cannot enter marks. Please ask an administrator.');
  const t = await env.DB.prepare('SELECT id FROM ins_teaching WHERE institution_id = ? AND course_id = ? AND staff_id = ? LIMIT 1').bind(ctx.inst.id, courseId, ctx.staffId).first();
  if (!t) fail(403, 'You can only enter marks for the courses you teach.');
}

export const resultSheet = secure({ perm: ['academics.view', 'results.enter', 'results.all'] }, async ({ env, url, ctx }) => {
  const course = V.int(url.searchParams.get('course_id'), 'Course', { required: true, min: 1 }); const term = V.int(url.searchParams.get('term_id'), 'Term', { required: true, min: 1 });
  const c = await own(env, 'ins_courses', ctx.inst.id, course, 'course');
  const { results } = await env.DB.prepare(
    `SELECT e.id AS enrollment_id, s.id AS student_id, s.student_no, s.full_name, r.marks, r.grade, r.remarks
     FROM ins_enrollments e JOIN ins_students s ON s.id = e.student_id LEFT JOIN ins_results r ON r.enrollment_id = e.id
     WHERE e.institution_id = ? AND e.course_id = ? AND e.term_id = ? AND e.status != 'dropped' AND s.deleted_at IS NULL ORDER BY s.full_name COLLATE NOCASE`).bind(ctx.inst.id, course, term).all();
  let editable = true;
  try { await assertCanMark(env, ctx, course); } catch (e) { editable = false; }
  const marked = results.filter((r) => r.marks != null);
  return json({ course: { id: c.id, code: c.code, name: c.name }, rows: results, editable, stats: { students: results.length, marked: marked.length, average: marked.length ? round2(marked.reduce((s, r) => s + r.marks, 0) / marked.length) : null } });
});

export const saveResults = secure({ perm: ['results.enter', 'results.all'] }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const course = V.int(b.course_id, 'Course', { required: true, min: 1 }); const term = V.int(b.term_id, 'Term', { required: true, min: 1 });
  await assertCanMark(env, ctx, course);
  const c = await own(env, 'ins_courses', ctx.inst.id, course, 'course');
  if (!Array.isArray(b.rows) || !b.rows.length) fail(400, 'There are no marks to save.');
  if (b.rows.length > 500) fail(400, 'Too many rows in one save (500 maximum).');
  const settings = await getSettings(env, ctx.inst.id);
  const ids = b.rows.map((r) => V.int(r.enrollment_id, 'Enrolment', { required: true, min: 1 }));
  const valid = new Map();
  for (const part of chunk(ids, 80)) {
    const { results } = await env.DB.prepare(`SELECT id, student_id FROM ins_enrollments WHERE institution_id = ? AND course_id = ? AND term_id = ? AND id IN (${part.map(() => '?').join(',')})`).bind(ctx.inst.id, course, term, ...part).all();
    results.forEach((r) => valid.set(r.id, r.student_id));
  }
  const stmts = []; const changed = [];
  b.rows.forEach((r, i) => {
    const eid = ids[i];
    if (!valid.has(eid)) fail(400, 'One of the students is not enrolled in this course for this term.');
    if (r.marks === '' || r.marks == null) { stmts.push(env.DB.prepare('DELETE FROM ins_results WHERE enrollment_id = ?').bind(eid)); return; }
    const marks = V.num(r.marks, 'Marks', { required: true, min: 0, max: 100 });
    const g = gradeFor(marks, settings.grading_scale);
    stmts.push(env.DB.prepare(
      `INSERT INTO ins_results (institution_id, enrollment_id, student_id, course_id, term_id, marks, grade, points, remarks, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(enrollment_id) DO UPDATE SET marks = excluded.marks, grade = excluded.grade, points = excluded.points, remarks = excluded.remarks, entered_by = excluded.entered_by, updated_at = datetime('now')`
    ).bind(ctx.inst.id, eid, valid.get(eid), course, term, marks, g.grade, g.points, V.str(r.remarks, 'Remarks', { max: 200 }), ctx.user.id));
    changed.push(valid.get(eid));
  });
  for (const part of chunk(stmts, 90)) await env.DB.batch(part);
  for (const sid of [...new Set(changed)].slice(0, 200)) {
    const uid = await userIdForBorrower(env, ctx.inst.id, 'student', sid);
    if (uid) await notify(env, ctx.inst.id, uid, 'academic', 'Results updated', `New marks were recorded for ${c.code} ${c.name}.`, '#my-results');
  }
  await audit(env, request, ctx, 'academics', 'results.save', 'course', course, `${c.code}: ${changed.length} mark(s)`);
  return json({ ok: true, saved: changed.length });
});

// Transcript: results by term, with term averages and overall GPA
async function transcript(env, instId, studentId) {
  const { results } = await env.DB.prepare(
    `SELECT r.marks, r.grade, r.points, r.remarks, c.code, c.name AS course, c.credits, t.id AS term_id, t.name AS term, y.name AS year
     FROM ins_results r JOIN ins_courses c ON c.id = r.course_id JOIN ins_terms t ON t.id = r.term_id JOIN ins_academic_years y ON y.id = t.academic_year_id
     WHERE r.institution_id = ? AND r.student_id = ? ORDER BY y.name, t.start_date, t.id, c.code`).bind(instId, studentId).all();
  const terms = new Map();
  for (const r of results) {
    const k = r.term_id; if (!terms.has(k)) terms.set(k, { term: `${r.year} · ${r.term}`, rows: [] }); terms.get(k).rows.push(r);
  }
  const out = [...terms.values()].map((t) => ({
    ...t, average: round2(t.rows.reduce((s, r) => s + r.marks, 0) / t.rows.length),
    gpa: round2(t.rows.reduce((s, r) => s + r.points * (r.credits || 1), 0) / t.rows.reduce((s, r) => s + (r.credits || 1), 0)),
  }));
  const all = results.length ? round2(results.reduce((s, r) => s + r.points * (r.credits || 1), 0) / results.reduce((s, r) => s + (r.credits || 1), 0)) : null;
  return { terms: out, cumulative_gpa: all, subjects: results.length };
}

export const studentResults = secure({ perm: 'academics.view' }, async ({ env, params, ctx }) => {
  const s = await env.DB.prepare('SELECT id, student_no, full_name FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, 'The student record could not be found.');
  if (ctx.role === 'teacher') {
    const ok = ctx.staffId && await env.DB.prepare(`SELECT 1 AS x FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id WHERE e.student_id = ? AND t.staff_id = ? AND e.institution_id = ? LIMIT 1`).bind(s.id, ctx.staffId, ctx.inst.id).first();
    if (!ok) fail(404, 'The student record could not be found.');
  }
  return json({ student: s, ...(await transcript(env, ctx.inst.id, s.id)) });
});

export const myResults = secure(async ({ env, ctx }) => {
  if (!ctx.studentId) return json({ linked: false, terms: [], cumulative_gpa: null });
  const s = await env.DB.prepare('SELECT id, student_no, full_name FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(ctx.studentId, ctx.inst.id).first();
  if (!s) return json({ linked: false, terms: [], cumulative_gpa: null });
  return json({ linked: true, student: s, ...(await transcript(env, ctx.inst.id, s.id)) });
});
