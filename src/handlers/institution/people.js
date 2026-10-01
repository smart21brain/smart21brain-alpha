// Smart21Institution — students, staff, departments and programmes.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, getSettings, likeTerm, paging, can, nextNumber, storeImage, imageResponse, getInstContext, round2,
} from '../../lib/institution-auth.js';

// A teacher only sees students enrolled in courses they teach.
async function teacherStudentScope(env, ctx) {
  if (ctx.role !== 'teacher') return null;
  if (!ctx.staffId) return { sql: '1 = 0', binds: [] };
  return { sql: `s.id IN (SELECT e.student_id FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id AND t.institution_id = e.institution_id WHERE t.staff_id = ? AND e.institution_id = ?)`, binds: [ctx.staffId, ctx.inst.id] };
}

const STUDENT_STATUS = ['active', 'suspended', 'graduated', 'withdrawn'];
const STAFF_STATUS = ['active', 'on_leave', 'left'];
const GENDERS = ['male', 'female', 'other'];

async function fk(env, table, instId, id, label) {
  if (!id) return;
  const r = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ? AND institution_id = ?`).bind(id, instId).first();
  if (!r) fail(400, `That ${label} does not exist.`);
}

// ---------------------------------------------------------------------
// Students
// ---------------------------------------------------------------------
const STUDENT_LIST = `SELECT s.id, s.student_no, s.reg_no, s.full_name, s.gender, s.phone, s.email, s.class_name, s.level, s.status, (s.photo_key IS NOT NULL) AS has_photo,
  p.name AS programme, d.name AS department, s.programme_id, s.department_id
  FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id`;

export const listStudents = secure({ perm: 'students.view' }, async ({ env, url, ctx }) => {
  const sp = url.searchParams; const { page, limit, offset } = paging(url, 20, 100);
  const where = ['s.institution_id = ?1', 's.deleted_at IS NULL']; const binds = [ctx.inst.id];
  const add = (sql, ...v) => { let i = binds.length; where.push(sql.replace(/\?/g, () => `?${++i}`)); binds.push(...v); };
  const q = (sp.get('q') || '').trim();
  if (q) { const like = likeTerm(q); add(`(s.full_name LIKE ? ESCAPE '\\' OR s.student_no LIKE ? ESCAPE '\\' OR s.reg_no LIKE ? ESCAPE '\\' OR s.phone LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\')`, like, like, like, like, like); }
  if (sp.get('programme_id')) add('s.programme_id = ?', V.int(sp.get('programme_id'), 'Programme', { min: 1 }));
  if (sp.get('department_id')) add('s.department_id = ?', V.int(sp.get('department_id'), 'Department', { min: 1 }));
  if (sp.get('status')) add('s.status = ?', V.oneOf(sp.get('status'), 'Status', STUDENT_STATUS, { required: true }));
  if (sp.get('class_name')) add('s.class_name = ?', V.str(sp.get('class_name'), 'Class', { max: 60 }));
  const scope = await teacherStudentScope(env, ctx);
  if (scope) add(scope.sql, ...scope.binds);
  const SORTS = { name: 's.full_name COLLATE NOCASE', no: 's.student_no', recent: 's.id DESC' };
  const order = SORTS[sp.get('sort')] || SORTS.name;
  const from = `FROM ins_students s WHERE ${where.join(' AND ')}`;
  const [{ results }, n] = await Promise.all([
    env.DB.prepare(`${STUDENT_LIST} WHERE ${where.join(' AND ')} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first(),
  ]);
  return json({ students: results, total: n.n, page, limit });
});

async function studentSummary(env, instId, id) {
  const [loans, fines, academic] = await Promise.all([
    env.DB.prepare(`SELECT (SELECT COUNT(*) FROM ins_loans WHERE institution_id = ?1 AND borrower_type = 'student' AND borrower_id = ?2 AND status = 'borrowed') AS active,
      (SELECT COUNT(*) FROM ins_loans WHERE institution_id = ?1 AND borrower_type = 'student' AND borrower_id = ?2) AS total`).bind(instId, id).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS unpaid FROM ins_fines WHERE institution_id = ? AND borrower_type = 'student' AND borrower_id = ? AND status = 'unpaid'`).bind(instId, id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n, AVG(marks) AS avg_marks, AVG(points) AS avg_points FROM ins_results WHERE institution_id = ? AND student_id = ?`).bind(instId, id).first(),
  ]);
  return { loans_active: loans.active, loans_total: loans.total, fines_unpaid: round2(fines.unpaid), results_count: academic.n, avg_marks: academic.avg_marks == null ? null : round2(academic.avg_marks), gpa: academic.avg_points == null ? null : round2(academic.avg_points) };
}

export const getStudent = secure({ perm: 'students.view' }, async ({ env, params, ctx }) => {
  const scope = await teacherStudentScope(env, ctx);
  const extra = scope ? ` AND ${scope.sql}` : '';
  const s = await env.DB.prepare(`SELECT s.*, p.name AS programme, d.name AS department FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id
    WHERE s.id = ? AND s.institution_id = ? AND s.deleted_at IS NULL${extra}`).bind(params.id, ctx.inst.id, ...(scope ? scope.binds : [])).first();
  if (!s) fail(404, 'The student record could not be found.');
  const { photo_key, deleted_at, ...rest } = s;
  return json({ student: { ...rest, has_photo: !!photo_key }, summary: await studentSummary(env, ctx.inst.id, s.id) });
});

export function readStudent(b) {
  return {
    student_no: V.str(b.student_no, 'Student ID', { max: 40 }),
    reg_no: V.str(b.reg_no, 'Registration number', { max: 40 }),
    full_name: V.str(b.full_name, 'Full name', { required: true, max: 120, min: 2 }),
    gender: V.oneOf(b.gender, 'Gender', GENDERS),
    dob: V.date(b.dob, 'Date of birth'),
    phone: V.phone(b.phone, 'Phone number'),
    email: V.email(b.email, 'Email'),
    address: V.str(b.address, 'Address', { max: 300 }),
    programme_id: V.int(b.programme_id, 'Programme', { min: 1 }),
    department_id: V.int(b.department_id, 'Department', { min: 1 }),
    class_name: V.str(b.class_name, 'Class', { max: 60 }),
    level: V.str(b.level, 'Year / level', { max: 40 }),
    admission_date: V.date(b.admission_date, 'Admission date'),
    admission_info: V.str(b.admission_info, 'Admission information', { max: 500 }),
    status: V.oneOf(b.status, 'Status', STUDENT_STATUS, { def: 'active' }),
    guardian_name: V.str(b.guardian_name, 'Guardian name', { max: 120 }),
    guardian_phone: V.phone(b.guardian_phone, 'Guardian phone'),
    guardian_relation: V.str(b.guardian_relation, 'Guardian relationship', { max: 60 }),
    notes: V.str(b.notes, 'Notes', { max: 1000 }),
  };
}

async function uniqueStudentNo(env, instId, no, selfId) {
  const dup = await env.DB.prepare('SELECT id, full_name FROM ins_students WHERE institution_id = ? AND student_no = ? COLLATE NOCASE AND id != ?').bind(instId, no, selfId || 0).first();
  if (dup) fail(409, `Student ID ${no} is already used by ${dup.full_name}.`);
}

export async function insertStudent(env, ctx, s) {
  const settings = await getSettings(env, ctx.inst.id);
  const no = s.student_no || await nextNumber(env, ctx.inst.id, 'ins_students', 'student_no', settings.student_prefix);
  await uniqueStudentNo(env, ctx.inst.id, no);
  const r = await env.DB.prepare(
    `INSERT INTO ins_students (institution_id, student_no, reg_no, full_name, gender, dob, phone, email, address, programme_id, department_id, class_name, level, admission_date, admission_info, status, guardian_name, guardian_phone, guardian_relation, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, no, s.reg_no, s.full_name, s.gender, s.dob, s.phone, s.email, s.address, s.programme_id, s.department_id, s.class_name, s.level, s.admission_date, s.admission_info, s.status, s.guardian_name, s.guardian_phone, s.guardian_relation, s.notes).run();
  return { id: r.meta.last_row_id, student_no: no };
}

export const createStudent = secure({ perm: 'students.manage' }, async ({ request, env, ctx }) => {
  const s = readStudent(await readJson(request));
  await fk(env, 'ins_programmes', ctx.inst.id, s.programme_id, 'programme'); await fk(env, 'ins_departments', ctx.inst.id, s.department_id, 'department');
  const r = await insertStudent(env, ctx, s);
  await audit(env, request, ctx, 'students', 'student.create', 'student', r.id, `${s.full_name} (${r.student_no})`);
  return json({ ok: true, ...r }, { status: 201 });
});

export const updateStudent = secure({ perm: 'students.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT id, student_no FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The student record could not be found.');
  const s = readStudent(await readJson(request));
  await fk(env, 'ins_programmes', ctx.inst.id, s.programme_id, 'programme'); await fk(env, 'ins_departments', ctx.inst.id, s.department_id, 'department');
  const no = s.student_no || cur.student_no;
  await uniqueStudentNo(env, ctx.inst.id, no, cur.id);
  await env.DB.prepare(
    `UPDATE ins_students SET student_no=?, reg_no=?, full_name=?, gender=?, dob=?, phone=?, email=?, address=?, programme_id=?, department_id=?, class_name=?, level=?, admission_date=?, admission_info=?,
       status=?, guardian_name=?, guardian_phone=?, guardian_relation=?, notes=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(no, s.reg_no, s.full_name, s.gender, s.dob, s.phone, s.email, s.address, s.programme_id, s.department_id, s.class_name, s.level, s.admission_date, s.admission_info, s.status, s.guardian_name, s.guardian_phone, s.guardian_relation, s.notes, cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'students', 'student.update', 'student', cur.id, s.full_name);
  return json({ ok: true });
});

export const deleteStudent = secure({ perm: 'students.manage' }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare('SELECT id, full_name, photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, 'The student record could not be found.');
  const loans = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE borrower_type = 'student' AND borrower_id = ? AND status = 'borrowed'`).bind(s.id).first();
  if (loans.n) fail(409, 'This student still has books on loan. Return them first.');
  await env.DB.batch([
    env.DB.prepare(`UPDATE ins_students SET deleted_at = datetime('now'), status = 'withdrawn' WHERE id = ?`).bind(s.id),
    env.DB.prepare(`UPDATE ins_members SET active = 0 WHERE student_id = ? AND institution_id = ?`).bind(s.id, ctx.inst.id),
    env.DB.prepare(`UPDATE ins_reservations SET status = 'cancelled' WHERE borrower_type = 'student' AND borrower_id = ? AND status IN ('waiting','ready')`).bind(s.id),
  ]);
  await audit(env, request, ctx, 'students', 'student.delete', 'student', s.id, s.full_name);
  return json({ ok: true });
});

export const uploadStudentPhoto = secure({ perm: 'students.manage' }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare('SELECT id, photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, 'The student record could not be found.');
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a photo.');
  const key = await storeImage(env, form.get('photo'), `institution/${ctx.inst.id}/student`);
  await env.DB.prepare('UPDATE ins_students SET photo_key = ? WHERE id = ?').bind(key, s.id).run();
  if (s.photo_key && env.MATERIALS) await env.MATERIALS.delete(s.photo_key).catch(() => {});
  await audit(env, request, ctx, 'students', 'student.photo', 'student', s.id, null);
  return json({ ok: true });
});

// A photo may be seen by people with student rights, or by the student themselves.
export async function studentPhoto({ request, env, params }) {
  const ctx = await getInstContext(request, env);
  if (ctx.error || !ctx.inst) return new Response('Not found', { status: 404 });
  if (!(can(ctx, 'students.view') || ctx.studentId === Number(params.id))) return new Response('Not found', { status: 404 });
  const s = await env.DB.prepare('SELECT photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  return s && s.photo_key ? imageResponse(env, s.photo_key) : new Response('Not found', { status: 404 });
}

// ---------------------------------------------------------------------
// Staff
// ---------------------------------------------------------------------
export const listStaff = secure({ perm: 'staff.view' }, async ({ env, url, ctx }) => {
  const sp = url.searchParams; const { page, limit, offset } = paging(url, 20, 100);
  const where = ['f.institution_id = ?1', 'f.deleted_at IS NULL']; const binds = [ctx.inst.id];
  const q = (sp.get('q') || '').trim();
  if (q) { const like = likeTerm(q); where.push(`(f.full_name LIKE ?2 ESCAPE '\\' OR f.staff_no LIKE ?2 ESCAPE '\\' OR f.position LIKE ?2 ESCAPE '\\')`); binds.push(like); }
  if (sp.get('department_id')) { where.push(`f.department_id = ?${binds.length + 1}`); binds.push(V.int(sp.get('department_id'), 'Department', { min: 1 })); }
  if (sp.get('status')) { where.push(`f.status = ?${binds.length + 1}`); binds.push(V.oneOf(sp.get('status'), 'Status', STAFF_STATUS, { required: true })); }
  const from = `FROM ins_staff f LEFT JOIN ins_departments d ON d.id = f.department_id WHERE ${where.join(' AND ')}`;
  const [{ results }, n] = await Promise.all([
    env.DB.prepare(`SELECT f.id, f.staff_no, f.full_name, f.gender, f.phone, f.email, f.position, f.status, f.department_id, d.name AS department, (f.photo_key IS NOT NULL) AS has_photo ${from} ORDER BY f.full_name COLLATE NOCASE LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first(),
  ]);
  return json({ staff: results, total: n.n, page, limit });
});

export const getStaff = secure({ perm: 'staff.view' }, async ({ env, params, ctx }) => {
  const f = await env.DB.prepare(`SELECT f.*, d.name AS department FROM ins_staff f LEFT JOIN ins_departments d ON d.id = f.department_id WHERE f.id = ? AND f.institution_id = ? AND f.deleted_at IS NULL`).bind(params.id, ctx.inst.id).first();
  if (!f) fail(404, 'The staff record could not be found.');
  const { photo_key, deleted_at, ...rest } = f;
  const courses = await env.DB.prepare(`SELECT c.code, c.name, t.name AS term FROM ins_teaching x JOIN ins_courses c ON c.id = x.course_id LEFT JOIN ins_terms t ON t.id = x.term_id WHERE x.staff_id = ? AND x.institution_id = ?`).bind(f.id, ctx.inst.id).all();
  return json({ staff: { ...rest, has_photo: !!photo_key }, courses: courses.results });
});

export function readStaff(b) {
  return {
    staff_no: V.str(b.staff_no, 'Staff number', { max: 40 }),
    full_name: V.str(b.full_name, 'Full name', { required: true, max: 120, min: 2 }),
    gender: V.oneOf(b.gender, 'Gender', GENDERS),
    phone: V.phone(b.phone, 'Phone number'), email: V.email(b.email, 'Email'),
    position: V.str(b.position, 'Position', { max: 100 }),
    department_id: V.int(b.department_id, 'Department', { min: 1 }),
    hired_on: V.date(b.hired_on, 'Hire date'),
    status: V.oneOf(b.status, 'Status', STAFF_STATUS, { def: 'active' }),
    notes: V.str(b.notes, 'Notes', { max: 1000 }),
  };
}

export async function insertStaff(env, ctx, s) {
  const settings = await getSettings(env, ctx.inst.id);
  const no = s.staff_no || await nextNumber(env, ctx.inst.id, 'ins_staff', 'staff_no', settings.staff_prefix);
  const dup = await env.DB.prepare('SELECT full_name FROM ins_staff WHERE institution_id = ? AND staff_no = ? COLLATE NOCASE').bind(ctx.inst.id, no).first();
  if (dup) fail(409, `Staff number ${no} is already used by ${dup.full_name}.`);
  const r = await env.DB.prepare(`INSERT INTO ins_staff (institution_id, staff_no, full_name, gender, phone, email, position, department_id, hired_on, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .bind(ctx.inst.id, no, s.full_name, s.gender, s.phone, s.email, s.position, s.department_id, s.hired_on, s.status, s.notes).run();
  return { id: r.meta.last_row_id, staff_no: no };
}

export const createStaff = secure({ perm: 'staff.manage' }, async ({ request, env, ctx }) => {
  const s = readStaff(await readJson(request));
  await fk(env, 'ins_departments', ctx.inst.id, s.department_id, 'department');
  const r = await insertStaff(env, ctx, s);
  await audit(env, request, ctx, 'staff', 'staff.create', 'staff', r.id, `${s.full_name} (${r.staff_no})`);
  return json({ ok: true, ...r }, { status: 201 });
});

export const updateStaff = secure({ perm: 'staff.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT id, staff_no FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The staff record could not be found.');
  const s = readStaff(await readJson(request));
  await fk(env, 'ins_departments', ctx.inst.id, s.department_id, 'department');
  const no = s.staff_no || cur.staff_no;
  const dup = await env.DB.prepare('SELECT full_name FROM ins_staff WHERE institution_id = ? AND staff_no = ? COLLATE NOCASE AND id != ?').bind(ctx.inst.id, no, cur.id).first();
  if (dup) fail(409, `Staff number ${no} is already used by ${dup.full_name}.`);
  await env.DB.prepare(`UPDATE ins_staff SET staff_no=?, full_name=?, gender=?, phone=?, email=?, position=?, department_id=?, hired_on=?, status=?, notes=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`)
    .bind(no, s.full_name, s.gender, s.phone, s.email, s.position, s.department_id, s.hired_on, s.status, s.notes, cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'staff', 'staff.update', 'staff', cur.id, s.full_name);
  return json({ ok: true });
});

export const deleteStaff = secure({ perm: 'staff.manage' }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare('SELECT id, full_name FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, 'The staff record could not be found.');
  const loans = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE borrower_type = 'staff' AND borrower_id = ? AND status = 'borrowed'`).bind(s.id).first();
  if (loans.n) fail(409, 'This staff member still has books on loan. Return them first.');
  await env.DB.batch([
    env.DB.prepare(`UPDATE ins_staff SET deleted_at = datetime('now'), status = 'left' WHERE id = ?`).bind(s.id),
    env.DB.prepare(`UPDATE ins_members SET active = 0 WHERE staff_id = ? AND institution_id = ? AND role != 'super_admin'`).bind(s.id, ctx.inst.id),
    env.DB.prepare(`DELETE FROM ins_teaching WHERE staff_id = ?`).bind(s.id),
  ]);
  await audit(env, request, ctx, 'staff', 'staff.delete', 'staff', s.id, s.full_name);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Departments & programmes
// ---------------------------------------------------------------------
export const listDepartments = secure(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.name, d.code, d.head_name, d.active,
       (SELECT COUNT(*) FROM ins_students s WHERE s.department_id = d.id AND s.deleted_at IS NULL) AS students,
       (SELECT COUNT(*) FROM ins_staff f WHERE f.department_id = d.id AND f.deleted_at IS NULL) AS staff
     FROM ins_departments d WHERE d.institution_id = ? ORDER BY d.name`).bind(ctx.inst.id).all();
  return json({ departments: results });
});

export const saveDepartment = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Department name', { required: true, max: 100, min: 2 });
  const dup = await env.DB.prepare('SELECT id FROM ins_departments WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?').bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, 'A department with this name already exists.');
  const vals = [name, V.str(b.code, 'Code', { max: 20 }), V.str(b.head_name, 'Head of department', { max: 100 }), b.active === false || b.active === 0 ? 0 : 1];
  if (params.id) {
    const r = await env.DB.prepare('UPDATE ins_departments SET name = ?, code = ?, head_name = ?, active = ? WHERE id = ? AND institution_id = ?').bind(...vals, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, 'Department not found.');
  } else await env.DB.prepare('INSERT INTO ins_departments (institution_id, name, code, head_name, active) VALUES (?, ?, ?, ?, ?)').bind(ctx.inst.id, ...vals).run();
  await audit(env, request, ctx, 'academics', 'department.save', 'department', Number(params.id) || null, name);
  return json({ ok: true });
});

export const deleteDepartment = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM ins_departments WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Department not found.');
  await audit(env, request, ctx, 'academics', 'department.delete', 'department', Number(params.id), null);
  return json({ ok: true });
});

export const listProgrammes = secure(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.name, p.code, p.level, p.duration_years, p.active, p.department_id, d.name AS department,
       (SELECT COUNT(*) FROM ins_students s WHERE s.programme_id = p.id AND s.deleted_at IS NULL) AS students
     FROM ins_programmes p LEFT JOIN ins_departments d ON d.id = p.department_id WHERE p.institution_id = ? ORDER BY p.name`).bind(ctx.inst.id).all();
  return json({ programmes: results });
});

export const saveProgramme = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, 'Programme name', { required: true, max: 120, min: 2 });
  const dept = V.int(b.department_id, 'Department', { min: 1 });
  await fk(env, 'ins_departments', ctx.inst.id, dept, 'department');
  const dup = await env.DB.prepare('SELECT id FROM ins_programmes WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?').bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, 'A programme with this name already exists.');
  const vals = [dept, name, V.str(b.code, 'Code', { max: 20 }), V.str(b.level, 'Level', { max: 40 }), V.num(b.duration_years, 'Duration', { min: 0.1, max: 12 }), b.active === false || b.active === 0 ? 0 : 1];
  if (params.id) {
    const r = await env.DB.prepare('UPDATE ins_programmes SET department_id = ?, name = ?, code = ?, level = ?, duration_years = ?, active = ? WHERE id = ? AND institution_id = ?').bind(...vals, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, 'Programme not found.');
  } else await env.DB.prepare('INSERT INTO ins_programmes (institution_id, department_id, name, code, level, duration_years, active) VALUES (?, ?, ?, ?, ?, ?, ?)').bind(ctx.inst.id, ...vals).run();
  await audit(env, request, ctx, 'academics', 'programme.save', 'programme', Number(params.id) || null, name);
  return json({ ok: true });
});

export const deleteProgramme = secure({ perm: 'academics.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM ins_programmes WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'Programme not found.');
  await audit(env, request, ctx, 'academics', 'programme.delete', 'programme', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// "My profile" for students (and linked staff)
// ---------------------------------------------------------------------
export const myProfile = secure(async ({ env, ctx }) => {
  if (ctx.studentId) {
    const s = await env.DB.prepare(`SELECT s.id, s.student_no, s.reg_no, s.full_name, s.gender, s.phone, s.email, s.class_name, s.level, s.status, s.admission_date, (s.photo_key IS NOT NULL) AS has_photo, p.name AS programme, d.name AS department
      FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id WHERE s.id = ? AND s.institution_id = ? AND s.deleted_at IS NULL`).bind(ctx.studentId, ctx.inst.id).first();
    return json({ linked: !!s, type: 'student', profile: s || null, summary: s ? await studentSummary(env, ctx.inst.id, s.id) : null });
  }
  if (ctx.staffId) {
    const f = await env.DB.prepare(`SELECT f.id, f.staff_no, f.full_name, f.phone, f.email, f.position, d.name AS department FROM ins_staff f LEFT JOIN ins_departments d ON d.id = f.department_id WHERE f.id = ? AND f.institution_id = ? AND f.deleted_at IS NULL`).bind(ctx.staffId, ctx.inst.id).first();
    return json({ linked: !!f, type: 'staff', profile: f || null });
  }
  return json({ linked: false, profile: null });
});
