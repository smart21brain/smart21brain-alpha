// School System — students, parents/guardians, teachers.
import { json } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, can, likeTerm, paging, chunk, currentYear, getSettings,
  teacherClassIds, parentStudentIds, loadStudentForCtx, storeImage, imageResponse, randomToken,
} from '../../lib/school-auth.js';
import { studentFullName, todayISO, attendancePercent } from '../../lib/school-calc.js';
import {
  feeColumns, feeFromRow, ATTENDANCE_COLUMNS, attendanceFromRow, PARENT_NAME_SQL, PARENT_PHONE_SQL, SQL_FULL_NAME,
} from '../../lib/school-queries.js';
import { createLogin } from './core.js';

const STATUSES = ['active', 'inactive', 'graduated', 'suspended', 'transferred'];

// ---------------------------------------------------------------------
// Students — list
// ---------------------------------------------------------------------
export const listStudents = secure({ perm: 'students.view' }, async ({ env, url, ctx }) => {
  const sid = ctx.school.id;
  const { page, limit, offset } = paging(url, 25, 100);
  const year = url.searchParams.get('year') ? V.int(url.searchParams.get('year'), 'Academic year', { min: 1 }) : (await currentYear(env, sid)).id;
  const where = ['s.school_id = ?'];
  const binds = [sid];
  const q = (url.searchParams.get('q') || '').trim();
  if (q) {
    const like = likeTerm(q);
    where.push(`(${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\' OR s.phone LIKE ? ESCAPE '\\'
      OR EXISTS (SELECT 1 FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id
                 WHERE sp.student_id = s.id AND (p.phone LIKE ? ESCAPE '\\' OR p.full_name LIKE ? ESCAPE '\\')))`);
    binds.push(like, like, like, like, like);
  }
  const classId = Number(url.searchParams.get('class_id') || 0);
  if (classId) { where.push('e.class_id = ?'); binds.push(classId); }
  const gender = url.searchParams.get('gender');
  if (gender) { where.push('s.gender = ?'); binds.push(V.oneOf(gender, 'Gender', ['male', 'female'])); }
  const status = url.searchParams.get('status');
  if (status) { where.push('s.status = ?'); binds.push(V.oneOf(status, 'Status', STATUSES)); }
  if (url.searchParams.get('year') || classId) where.push('e.id IS NOT NULL');

  if (ctx.role === 'teacher') {
    const ids = await teacherClassIds(env, ctx);
    if (!ids.length) return json({ students: [], total: 0, page, limit });
    where.push(`e.class_id IN (${ids.map(() => '?').join(',')})`);
    binds.push(...ids);
  }

  const from = `FROM sch_students s
    LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${year}
    LEFT JOIN sch_classes c ON c.id = e.class_id
    WHERE ${where.join(' AND ')}`;
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first();
  const showFees = can(ctx, 'fees.view');
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.status, s.phone,
            (s.photo_key IS NOT NULL) AS has_photo, c.id AS class_id, c.name AS class_name, c.stream AS class_stream,
            ${PARENT_NAME_SQL} AS parent_name, ${PARENT_PHONE_SQL} AS parent_phone,
            ${ATTENDANCE_COLUMNS}${showFees ? ',' + feeColumns(todayISO()) : ''}
     ${from} ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();

  const students = results.map((r) => {
    const fee = showFees ? feeFromRow(r) : null;
    return {
      id: r.id, admission_no: r.admission_no, full_name: studentFullName(r), first_name: r.first_name, last_name: r.last_name,
      gender: r.gender, status: r.status, phone: r.phone, has_photo: !!r.has_photo,
      class_id: r.class_id, class_name: r.class_name ? `${r.class_name}${r.class_stream ? ' ' + r.class_stream : ''}` : null,
      parent_name: r.parent_name, parent_phone: r.parent_phone,
      attendance_percent: attendanceFromRow(r),
      fee_balance: fee ? fee.balance : null, fee_status: fee ? fee.status : null,
    };
  });
  return json({ students, total: total.n, page, limit });
});

// ---------------------------------------------------------------------
// Students — helpers for create/update
// ---------------------------------------------------------------------
function readStudentFields(b) {
  return {
    first_name: V.str(b.first_name, 'First name', { required: true, max: 60 }),
    middle_name: V.str(b.middle_name, 'Middle name', { max: 60 }),
    last_name: V.str(b.last_name, 'Last name', { required: true, max: 60 }),
    gender: V.oneOf(b.gender, 'Gender', ['male', 'female'], { required: true }),
    date_of_birth: V.date(b.date_of_birth, 'Date of birth'),
    nationality: V.str(b.nationality, 'Nationality', { max: 60 }),
    phone: V.phone(b.phone, 'Student phone number'),
    email: V.email(b.email, 'Student email'),
    address: V.str(b.address, 'Address', { max: 300 }),
    previous_school: V.str(b.previous_school, 'Previous school', { max: 160 }),
    admission_date: V.date(b.admission_date, 'Admission date') || todayISO(),
    status: V.oneOf(b.status, 'Status', STATUSES, { def: 'active' }),
  };
}

async function requireClass(env, ctx, classId) {
  const id = V.int(classId, 'Class', { required: true, min: 1 });
  const c = await env.DB.prepare('SELECT * FROM sch_classes WHERE id = ? AND school_id = ?').bind(id, ctx.school.id).first();
  if (!c) fail(400, 'Please choose a valid class.');
  return c;
}

async function assertRoom(env, cls, yearId, studentId) {
  const n = await env.DB.prepare(
    'SELECT COUNT(*) AS n FROM sch_enrollments WHERE class_id = ? AND academic_year_id = ? AND student_id != ?'
  ).bind(cls.id, yearId, studentId || 0).first();
  if (n.n >= cls.max_students) fail(409, `${cls.name}${cls.stream ? ' ' + cls.stream : ''} is full (${n.n}/${cls.max_students}). Increase the class size or choose another class.`);
}

async function nextAdmissionNo(env, school, admissionDate) {
  const year = String(admissionDate).slice(0, 4);
  const stem = `${school.admission_prefix}-${year}-`;
  const last = await env.DB.prepare(
    `SELECT admission_no FROM sch_students WHERE school_id = ? AND admission_no LIKE ? ORDER BY admission_no DESC LIMIT 1`
  ).bind(school.id, stem + '%').first();
  const seq = last ? (parseInt(last.admission_no.slice(stem.length), 10) || 0) + 1 : 1;
  return stem + String(seq).padStart(4, '0');
}

// Reads the guardians list from the request and saves/looks up parent rows.
// Returns [{ parent_id, relationship, is_primary }]
async function resolveGuardians(env, ctx, list) {
  if (!Array.isArray(list) || !list.length) fail(400, 'Please add at least one parent or guardian.');
  if (list.length > 4) fail(400, 'A student can have up to 4 guardians.');
  const out = [];
  let i = 0;
  for (const g of list) {
    i += 1;
    const relationship = V.str(g.relationship, `Relationship (guardian ${i})`, { max: 40 }) || 'Parent';
    let parentId = null;
    if (g.parent_id) {
      const p = await env.DB.prepare('SELECT id FROM sch_parents WHERE id = ? AND school_id = ?').bind(g.parent_id, ctx.school.id).first();
      if (!p) fail(400, 'One of the selected parents was not found.');
      parentId = p.id;
    } else {
      const fullName = V.str(g.full_name, `Parent/guardian name${list.length > 1 ? ` (guardian ${i})` : ''}`, { required: true, max: 100 });
      const phone = V.phone(g.phone, `Parent/guardian phone${list.length > 1 ? ` (guardian ${i})` : ''}`, { required: true });
      // The same person registering a second child is reused, not duplicated.
      const dupe = await env.DB.prepare(
        'SELECT id FROM sch_parents WHERE school_id = ? AND phone = ? AND lower(full_name) = lower(?)'
      ).bind(ctx.school.id, phone, fullName).first();
      if (dupe) parentId = dupe.id;
      else {
        const r = await env.DB.prepare(
          `INSERT INTO sch_parents (school_id, full_name, phone, alt_phone, email, address, occupation) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(ctx.school.id, fullName, phone, V.phone(g.alt_phone, 'Alternative phone'), V.email(g.email, 'Parent email'),
          V.str(g.address, 'Parent address', { max: 300 }), V.str(g.occupation, 'Occupation', { max: 100 })).run();
        parentId = r.meta.last_row_id;
      }
    }
    if (out.some((o) => o.parent_id === parentId)) continue;
    out.push({ parent_id: parentId, relationship, is_primary: out.length === 0 ? 1 : (g.is_primary ? 1 : 0) });
  }
  return out;
}

async function resolveSubjects(env, ctx, classId, requested) {
  const { results } = await env.DB.prepare(
    `SELECT cs.subject_id FROM sch_class_subjects cs JOIN sch_subjects s ON s.id = cs.subject_id
     WHERE cs.class_id = ? AND cs.school_id = ? AND s.status = 'active'`
  ).bind(classId, ctx.school.id).all();
  const allowed = results.map((r) => r.subject_id);
  if (requested == null) return allowed; // default: every subject of the class
  const ids = V.ids(requested, 'Subjects');
  if (ids.some((id) => !allowed.includes(id))) fail(400, 'One of the chosen subjects is not taught in this class. Assign it to the class first.');
  return ids;
}

// ---------------------------------------------------------------------
// Students — create / read / update
// ---------------------------------------------------------------------
export const createStudent = secure({ perm: 'students.create' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const f = readStudentFields(b);
  const cls = await requireClass(env, ctx, b.class_id);
  const yearId = cls.academic_year_id;
  await assertRoom(env, cls, yearId, null);
  const subjectIds = await resolveSubjects(env, ctx, cls.id, b.subject_ids);
  const guardians = await resolveGuardians(env, ctx, b.guardians);

  let studentId = null; let admissionNo = null;
  for (let attempt = 0; attempt < 4 && !studentId; attempt += 1) {
    admissionNo = await nextAdmissionNo(env, ctx.school, f.admission_date);
    try {
      const r = await env.DB.prepare(
        `INSERT INTO sch_students (school_id, admission_no, first_name, middle_name, last_name, gender, date_of_birth, nationality,
           phone, email, address, previous_school, admission_date, status, verify_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(ctx.school.id, admissionNo, f.first_name, f.middle_name, f.last_name, f.gender, f.date_of_birth, f.nationality,
        f.phone, f.email, f.address, f.previous_school, f.admission_date, f.status, randomToken(16)).run();
      studentId = r.meta.last_row_id;
    } catch (e) {
      if (!/UNIQUE/i.test(String(e))) throw e;
    }
  }
  if (!studentId) fail(500, 'Could not generate an admission number. Please try again.');

  await env.DB.batch([
    env.DB.prepare('INSERT INTO sch_enrollments (school_id, student_id, class_id, academic_year_id) VALUES (?, ?, ?, ?)').bind(ctx.school.id, studentId, cls.id, yearId),
    ...subjectIds.map((sub) => env.DB.prepare(
      'INSERT INTO sch_student_subjects (student_id, subject_id, academic_year_id, school_id) VALUES (?, ?, ?, ?)').bind(studentId, sub, yearId, ctx.school.id)),
    ...guardians.map((g) => env.DB.prepare(
      'INSERT INTO sch_student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, ?)').bind(studentId, g.parent_id, g.relationship, g.is_primary)),
  ]);
  await audit(env, request, ctx, 'student.create', 'student', studentId, `${studentFullName(f)} (${admissionNo}) → ${cls.name}`);
  return json({ ok: true, id: studentId, admission_no: admissionNo, full_name: studentFullName(f) }, { status: 201 });
});

async function studentDetail(env, ctx, st) {
  const year = await currentYear(env, ctx.school.id);
  const enr = await env.DB.prepare(
    `SELECT e.id, e.class_id, e.academic_year_id, c.name AS class_name, c.stream, c.level, y.name AS year_name
     FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id JOIN sch_academic_years y ON y.id = e.academic_year_id
     WHERE e.student_id = ? ORDER BY (e.academic_year_id = ?) DESC, y.name DESC LIMIT 1`
  ).bind(st.id, year.id).first();
  const { results: parents } = await env.DB.prepare(
    `SELECT p.id, p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation, sp.relationship, sp.is_primary
     FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = ? ORDER BY sp.is_primary DESC, p.id`
  ).bind(st.id).all();
  const { results: subjects } = enr ? await env.DB.prepare(
    `SELECT sub.id, sub.name, sub.code, t.full_name AS teacher_name
     FROM sch_student_subjects ss JOIN sch_subjects sub ON sub.id = ss.subject_id
     LEFT JOIN sch_class_subjects cs ON cs.class_id = ? AND cs.subject_id = sub.id
     LEFT JOIN sch_teachers t ON t.id = cs.teacher_id
     WHERE ss.student_id = ? AND ss.academic_year_id = ? ORDER BY sub.name`
  ).bind(enr.class_id, st.id, enr.academic_year_id).all() : { results: [] };
  const { verify_token, photo_key, ...safe } = st;
  return {
    ...safe, full_name: studentFullName(st), has_photo: !!photo_key,
    class: enr ? { id: enr.class_id, name: enr.class_name, stream: enr.stream, level: enr.level, year_id: enr.academic_year_id, year_name: enr.year_name } : null,
    parents: ctx.role === 'parent' ? parents.map(({ id, ...p }) => ({ id, ...p })) : parents,
    subjects,
  };
}

export const getStudent = secure({ perm: undefined, parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== 'parent' && !can(ctx, 'students.view')) fail(403, 'You do not have permission to view students.');
  const st = await loadStudentForCtx(env, ctx, params.id);
  return json({ student: await studentDetail(env, ctx, st) });
});

export const updateStudent = secure({ perm: 'students.edit' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const st = await loadStudentForCtx(env, ctx, params.id);
  const f = readStudentFields({ ...b, admission_date: b.admission_date || st.admission_date });
  const year = await currentYear(env, ctx.school.id);
  const enr = await env.DB.prepare('SELECT * FROM sch_enrollments WHERE student_id = ? AND academic_year_id = ?').bind(st.id, year.id).first();

  const stmts = [env.DB.prepare(
    `UPDATE sch_students SET first_name = ?, middle_name = ?, last_name = ?, gender = ?, date_of_birth = ?, nationality = ?, phone = ?, email = ?,
       address = ?, previous_school = ?, admission_date = ?, status = ? WHERE id = ?`
  ).bind(f.first_name, f.middle_name, f.last_name, f.gender, f.date_of_birth, f.nationality, f.phone, f.email, f.address,
    f.previous_school, f.admission_date, f.status, st.id)];

  if (b.class_id) {
    const cls = await requireClass(env, ctx, b.class_id);
    const changed = !enr || enr.class_id !== cls.id;
    if (changed) await assertRoom(env, cls, cls.academic_year_id, st.id);
    const subjectIds = await resolveSubjects(env, ctx, cls.id, b.subject_ids);
    if (changed) {
      if (enr && enr.academic_year_id === cls.academic_year_id) {
        stmts.push(env.DB.prepare('UPDATE sch_enrollments SET class_id = ? WHERE id = ?').bind(cls.id, enr.id));
      } else {
        stmts.push(env.DB.prepare(`INSERT INTO sch_enrollments (school_id, student_id, class_id, academic_year_id) VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, academic_year_id) DO UPDATE SET class_id = excluded.class_id`).bind(ctx.school.id, st.id, cls.id, cls.academic_year_id));
      }
    }
    if (changed || b.subject_ids !== undefined) {
      stmts.push(env.DB.prepare('DELETE FROM sch_student_subjects WHERE student_id = ? AND academic_year_id = ?').bind(st.id, cls.academic_year_id));
      subjectIds.forEach((sub) => stmts.push(env.DB.prepare(
        'INSERT INTO sch_student_subjects (student_id, subject_id, academic_year_id, school_id) VALUES (?, ?, ?, ?)').bind(st.id, sub, cls.academic_year_id, ctx.school.id)));
    }
  }
  if (b.guardians !== undefined) {
    const guardians = await resolveGuardians(env, ctx, b.guardians);
    stmts.push(env.DB.prepare('DELETE FROM sch_student_parents WHERE student_id = ?').bind(st.id));
    guardians.forEach((g) => stmts.push(env.DB.prepare(
      'INSERT INTO sch_student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, ?)').bind(st.id, g.parent_id, g.relationship, g.is_primary)));
  }
  await env.DB.batch(stmts);
  await audit(env, request, ctx, 'student.update', 'student', st.id, `${studentFullName(f)} (${st.admission_no})`);
  return json({ ok: true });
});

export const setStudentStatus = secure({ perm: 'students.edit' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, 'Status', STATUSES, { required: true });
  const st = await loadStudentForCtx(env, ctx, params.id);
  await env.DB.prepare('UPDATE sch_students SET status = ? WHERE id = ?').bind(status, st.id).run();
  await audit(env, request, ctx, 'student.status', 'student', st.id, `${st.admission_no}: ${st.status} → ${status}`);
  return json({ ok: true });
});

export const deleteStudent = secure({ perm: 'students.delete' }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const pay = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_payments WHERE student_id = ?').bind(st.id).first();
  if (pay.n > 0) fail(409, 'This student has payment records, so they cannot be deleted (this protects your financial records). Deactivate the student instead.');
  await env.DB.prepare('DELETE FROM sch_students WHERE id = ?').bind(st.id).run();
  if (st.photo_key && env.MATERIALS) await env.MATERIALS.delete(st.photo_key).catch(() => {});
  await audit(env, request, ctx, 'student.delete', 'student', st.id, `${studentFullName(st)} (${st.admission_no})`);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------
export const uploadStudentPhoto = secure({ perm: ['students.edit', 'students.create'] }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a photo.');
  const key = await storeImage(env, form.get('photo'), `school/${ctx.school.id}/students/${st.id}`);
  await env.DB.prepare('UPDATE sch_students SET photo_key = ? WHERE id = ?').bind(key, st.id).run();
  if (st.photo_key && env.MATERIALS) await env.MATERIALS.delete(st.photo_key).catch(() => {});
  await audit(env, request, ctx, 'student.photo', 'student', st.id, st.admission_no);
  return json({ ok: true });
});

export const getStudentPhoto = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== 'parent' && !can(ctx, 'students.view')) fail(403, 'No access.');
  const st = await loadStudentForCtx(env, ctx, params.id);
  return imageResponse(env, st.photo_key);
});

// ---------------------------------------------------------------------
// Private notes
// ---------------------------------------------------------------------
export const listNotes = secure({ perm: 'students.notes' }, async ({ env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const { results } = await env.DB.prepare(
    `SELECT n.id, n.note, n.created_at, u.name AS author FROM sch_student_notes n LEFT JOIN users u ON u.id = n.author_user_id
     WHERE n.student_id = ? AND n.school_id = ? ORDER BY n.id DESC`
  ).bind(st.id, ctx.school.id).all();
  return json({ notes: results });
});

export const addNote = secure({ perm: 'students.notes' }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const b = await readJson(request);
  const note = V.str(b.note, 'Note', { required: true, max: 2000 });
  const r = await env.DB.prepare('INSERT INTO sch_student_notes (school_id, student_id, author_user_id, note) VALUES (?, ?, ?, ?)')
    .bind(ctx.school.id, st.id, ctx.user.id, note).run();
  await audit(env, request, ctx, 'student.note', 'student', st.id, 'Private note added');
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const deleteNote = secure({ perm: 'students.notes' }, async ({ request, env, params, ctx }) => {
  const n = await env.DB.prepare('SELECT * FROM sch_student_notes WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!n) fail(404, 'Note not found.');
  if (n.author_user_id !== ctx.user.id && ctx.role !== 'admin') fail(403, 'You can only delete your own notes.');
  await env.DB.prepare('DELETE FROM sch_student_notes WHERE id = ?').bind(n.id).run();
  await audit(env, request, ctx, 'student.note.delete', 'student', n.student_id, 'Note deleted');
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// ID card + public verification
// ---------------------------------------------------------------------
export const idCard = secure({ perm: 'students.view' }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const detail = await studentDetail(env, ctx, st);
  const settings = await getSettings(env, ctx.school.id);
  const origin = new URL(request.url).origin;
  await audit(env, request, ctx, 'student.idcard', 'student', st.id, st.admission_no);
  return json({
    school: { ...ctx.school, logo_key: undefined, has_logo: !!ctx.school.logo_key },
    student: { id: st.id, admission_no: st.admission_no, full_name: detail.full_name, gender: st.gender, has_photo: detail.has_photo },
    class: detail.class,
    id_card_note: settings.id_card_note,
    verify_url: `${origin}/school-verify.html?t=${st.verify_token}`,
  });
});

export async function verifyStudent({ params, env }) {
  const st = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status, s.school_id, sc.name AS school_name, sc.logo_key,
            sc.phone AS school_phone, sc.primary_color,
            (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id
              JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = s.id ORDER BY y.is_current DESC, y.name DESC LIMIT 1) AS class_name,
            (SELECT y.name FROM sch_enrollments e JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = s.id ORDER BY y.is_current DESC, y.name DESC LIMIT 1) AS year_name
     FROM sch_students s JOIN sch_schools sc ON sc.id = s.school_id WHERE s.verify_token = ?`
  ).bind(String(params.token).slice(0, 64)).first();
  if (!st) return json({ valid: false, error: 'This ID card could not be verified.' }, { status: 404 });
  // Deliberately minimal: no photo, phone, address, fees or results.
  return json({
    valid: true, school: { id: st.school_id, name: st.school_name, phone: st.school_phone, has_logo: !!st.logo_key, color: st.primary_color },
    student: { full_name: studentFullName(st), admission_no: st.admission_no, class_name: st.class_name, year_name: st.year_name, status: st.status },
  });
}

// ---------------------------------------------------------------------
// Parents / guardians
// ---------------------------------------------------------------------
export const listParents = secure({ perm: ['parents.manage', 'students.view'] }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 25, 100);
  const q = (url.searchParams.get('q') || '').trim();
  const where = ['p.school_id = ?']; const binds = [ctx.school.id];
  if (q) {
    const like = likeTerm(q);
    where.push(`(p.full_name LIKE ? ESCAPE '\\' OR p.phone LIKE ? ESCAPE '\\' OR p.email LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like);
  }
  if (ctx.role === 'teacher') fail(403, 'Teachers cannot browse the parent list.');
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sch_parents p WHERE ${where.join(' AND ')}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation, p.user_id,
            (SELECT COUNT(*) FROM sch_student_parents sp WHERE sp.parent_id = p.id) AS children_count,
            (SELECT group_concat(s.first_name || ' ' || s.last_name, ', ') FROM sch_student_parents sp JOIN sch_students s ON s.id = sp.student_id WHERE sp.parent_id = p.id) AS children
     FROM sch_parents p WHERE ${where.join(' AND ')} ORDER BY p.full_name COLLATE NOCASE LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ parents: results, total: total.n, page, limit });
});

function readParent(b) {
  return {
    full_name: V.str(b.full_name, 'Full name', { required: true, max: 100 }),
    phone: V.phone(b.phone, 'Phone number', { required: true }),
    alt_phone: V.phone(b.alt_phone, 'Alternative phone'),
    email: V.email(b.email, 'Email'),
    address: V.str(b.address, 'Address', { max: 300 }),
    occupation: V.str(b.occupation, 'Occupation', { max: 100 }),
  };
}

export const createParent = secure({ perm: 'parents.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const p = readParent(b);
  const r = await env.DB.prepare(
    'INSERT INTO sch_parents (school_id, full_name, phone, alt_phone, email, address, occupation) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).bind(ctx.school.id, p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation).run();
  const id = r.meta.last_row_id;
  let login = null;
  if (b.create_login) login = await makeParentLogin(env, ctx, id, p, b.password);
  await audit(env, request, ctx, 'parent.create', 'parent', id, p.full_name);
  return json({ ok: true, id, login }, { status: 201 });
});

async function makeParentLogin(env, ctx, parentId, p, password) {
  if (!p.email) fail(400, 'An email address is needed to give portal access.');
  const { userId, linked } = await createLogin(env, ctx, { name: p.full_name, email: p.email, password, role: 'parent', parentId });
  await env.DB.prepare('UPDATE sch_parents SET user_id = ? WHERE id = ?').bind(userId, parentId).run();
  return { user_id: userId, linked };
}

export const givePortalAccess = secure({ perm: 'parents.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const p = await env.DB.prepare('SELECT * FROM sch_parents WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!p) fail(404, 'Parent not found.');
  if (p.user_id) fail(409, 'This parent already has portal access.');
  const email = V.email(b.email || p.email, 'Email', { required: true });
  if (email !== p.email) await env.DB.prepare('UPDATE sch_parents SET email = ? WHERE id = ?').bind(email, p.id).run();
  const login = await makeParentLogin(env, ctx, p.id, { ...p, email }, b.password);
  await audit(env, request, ctx, 'parent.portal', 'parent', p.id, `Portal access for ${email}`);
  return json({ ok: true, login }, { status: 201 });
});

export const getParent = secure({ perm: ['parents.manage', 'students.view'] }, async ({ env, params, ctx }) => {
  if (ctx.role === 'teacher') fail(403, 'Teachers cannot open parent records.');
  const p = await env.DB.prepare('SELECT * FROM sch_parents WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!p) fail(404, 'Parent not found.');
  const { results: children } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status, sp.relationship,
            (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id
              JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = s.id ORDER BY y.is_current DESC, y.name DESC LIMIT 1) AS class_name
     FROM sch_student_parents sp JOIN sch_students s ON s.id = sp.student_id WHERE sp.parent_id = ? ORDER BY s.first_name`
  ).bind(p.id).all();
  return json({ parent: p, children: children.map((c) => ({ ...c, full_name: studentFullName(c) })) });
});

export const updateParent = secure({ perm: 'parents.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const p = readParent(b);
  const r = await env.DB.prepare(
    'UPDATE sch_parents SET full_name = ?, phone = ?, alt_phone = ?, email = ?, address = ?, occupation = ? WHERE id = ? AND school_id = ?'
  ).bind(p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation, params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, 'Parent not found.');
  await audit(env, request, ctx, 'parent.update', 'parent', Number(params.id), p.full_name);
  return json({ ok: true });
});

export const deleteParent = secure({ perm: 'parents.manage' }, async ({ request, env, params, ctx }) => {
  const p = await env.DB.prepare('SELECT * FROM sch_parents WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!p) fail(404, 'Parent not found.');
  const n = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_student_parents WHERE parent_id = ?').bind(p.id).first();
  if (n.n > 0) fail(409, `${p.full_name} is linked to ${n.n} student${n.n > 1 ? 's' : ''}. Remove the link from the student's profile first.`);
  await env.DB.batch([
    env.DB.prepare('UPDATE sch_members SET active = 0 WHERE parent_id = ? AND school_id = ?').bind(p.id, ctx.school.id),
    env.DB.prepare('DELETE FROM sch_parents WHERE id = ?').bind(p.id),
  ]);
  await audit(env, request, ctx, 'parent.delete', 'parent', p.id, p.full_name);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Teachers
// ---------------------------------------------------------------------
const EMPLOYMENT = ['full_time', 'part_time', 'contract', 'on_leave', 'resigned'];

function readTeacher(b) {
  return {
    full_name: V.str(b.full_name, 'Full name', { required: true, max: 100 }),
    gender: V.oneOf(b.gender, 'Gender', ['male', 'female']),
    phone: V.phone(b.phone, 'Phone number'),
    email: V.email(b.email, 'Email'),
    address: V.str(b.address, 'Address', { max: 300 }),
    employment_status: V.oneOf(b.employment_status, 'Employment status', EMPLOYMENT, { def: 'full_time' }),
  };
}

export const listTeachers = secure({ perm: ['teachers.manage', 'classes.manage', 'students.view'] }, async ({ env, url, ctx }) => {
  const q = (url.searchParams.get('q') || '').trim();
  const where = ['t.school_id = ?']; const binds = [ctx.school.id];
  if (q) { where.push(`(t.full_name LIKE ? ESCAPE '\\' OR t.phone LIKE ? ESCAPE '\\' OR t.email LIKE ? ESCAPE '\\')`); const l = likeTerm(q); binds.push(l, l, l); }
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.full_name, t.gender, t.phone, t.email, t.employment_status, t.user_id, (t.photo_key IS NOT NULL) AS has_photo,
            (SELECT COUNT(DISTINCT x) FROM (SELECT c.id AS x FROM sch_classes c WHERE c.teacher_id = t.id UNION SELECT cs.class_id FROM sch_class_subjects cs WHERE cs.teacher_id = t.id)) AS class_count,
            (SELECT COUNT(DISTINCT cs.subject_id) FROM sch_class_subjects cs WHERE cs.teacher_id = t.id) AS subject_count,
            (SELECT group_concat(DISTINCT s.name) FROM sch_class_subjects cs JOIN sch_subjects s ON s.id = cs.subject_id WHERE cs.teacher_id = t.id) AS subjects
     FROM sch_teachers t WHERE ${where.join(' AND ')} ORDER BY t.full_name COLLATE NOCASE`
  ).bind(...binds).all();
  return json({ teachers: results.map((t) => ({ ...t, has_photo: !!t.has_photo })) });
});

export const createTeacher = secure({ perm: 'teachers.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const t = readTeacher(b);
  const r = await env.DB.prepare(
    `INSERT INTO sch_teachers (school_id, full_name, gender, phone, email, address, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.school.id, t.full_name, t.gender, t.phone, t.email, t.address, t.employment_status).run();
  const id = r.meta.last_row_id;
  let login = null;
  if (b.create_login) login = await makeTeacherLogin(env, ctx, id, t, b.password);
  await audit(env, request, ctx, 'teacher.create', 'teacher', id, t.full_name);
  return json({ ok: true, id, login }, { status: 201 });
});

async function makeTeacherLogin(env, ctx, teacherId, t, password) {
  if (!t.email) fail(400, 'An email address is needed to create a login for the teacher.');
  const { userId, linked } = await createLogin(env, ctx, { name: t.full_name, email: t.email, password, role: 'teacher', teacherId });
  await env.DB.prepare('UPDATE sch_teachers SET user_id = ? WHERE id = ?').bind(userId, teacherId).run();
  return { user_id: userId, linked };
}

export const giveTeacherLogin = secure({ perm: 'teachers.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const t = await env.DB.prepare('SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!t) fail(404, 'Teacher not found.');
  if (t.user_id) fail(409, 'This teacher already has a login.');
  const email = V.email(b.email || t.email, 'Email', { required: true });
  if (email !== t.email) await env.DB.prepare('UPDATE sch_teachers SET email = ? WHERE id = ?').bind(email, t.id).run();
  const login = await makeTeacherLogin(env, ctx, t.id, { ...t, email }, b.password);
  await audit(env, request, ctx, 'teacher.login', 'teacher', t.id, `Login created for ${email}`);
  return json({ ok: true, login }, { status: 201 });
});

export const getTeacher = secure({ perm: ['teachers.manage', 'classes.manage', 'students.view'] }, async ({ env, params, ctx }) => {
  const sid = ctx.school.id;
  const t = await env.DB.prepare('SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?').bind(params.id, sid).first();
  if (!t) fail(404, 'Teacher not found.');
  const { results: classes } = await env.DB.prepare(
    `SELECT c.id, c.name, c.stream, y.name AS year_name, 'Class teacher' AS role FROM sch_classes c JOIN sch_academic_years y ON y.id = c.academic_year_id
     WHERE c.teacher_id = ? AND c.school_id = ? ORDER BY y.name DESC, c.name`
  ).bind(t.id, sid).all();
  const { results: subjects } = await env.DB.prepare(
    `SELECT cs.id, sub.name AS subject, sub.code, c.id AS class_id, c.name AS class_name, c.stream
     FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id JOIN sch_classes c ON c.id = cs.class_id
     WHERE cs.teacher_id = ? AND cs.school_id = ? ORDER BY sub.name, c.name`
  ).bind(t.id, sid).all();
  let attendance = { sessions: 0, last_date: null }; let exams = { results_entered: 0, exams_created: 0, last_entry: null };
  if (t.user_id) {
    attendance = await env.DB.prepare(
      `SELECT COUNT(*) AS sessions, MAX(date) AS last_date FROM (SELECT DISTINCT class_id, subject_id, date FROM sch_attendance WHERE school_id = ? AND marked_by = ?)`
    ).bind(sid, t.user_id).first();
    const r1 = await env.DB.prepare('SELECT COUNT(*) AS n, MAX(updated_at) AS last FROM sch_results WHERE school_id = ? AND entered_by = ?').bind(sid, t.user_id).first();
    const r2 = await env.DB.prepare('SELECT COUNT(*) AS n FROM sch_examinations WHERE school_id = ? AND created_by = ?').bind(sid, t.user_id).first();
    exams = { results_entered: r1.n, exams_created: r2.n, last_entry: r1.last };
  }
  const { user_id, photo_key, ...safe } = t;
  return json({ teacher: { ...safe, has_photo: !!photo_key, has_login: !!user_id }, classes, subjects, attendance, exams });
});

export const updateTeacher = secure({ perm: 'teachers.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const t = readTeacher(b);
  const r = await env.DB.prepare(
    `UPDATE sch_teachers SET full_name = ?, gender = ?, phone = ?, email = ?, address = ?, employment_status = ? WHERE id = ? AND school_id = ?`
  ).bind(t.full_name, t.gender, t.phone, t.email, t.address, t.employment_status, params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, 'Teacher not found.');
  await audit(env, request, ctx, 'teacher.update', 'teacher', Number(params.id), t.full_name);
  return json({ ok: true });
});

export const deleteTeacher = secure({ perm: 'teachers.manage' }, async ({ request, env, params, ctx }) => {
  const t = await env.DB.prepare('SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!t) fail(404, 'Teacher not found.');
  await env.DB.batch([
    env.DB.prepare('UPDATE sch_members SET active = 0, teacher_id = NULL WHERE teacher_id = ? AND school_id = ?').bind(t.id, ctx.school.id),
    env.DB.prepare('DELETE FROM sch_teachers WHERE id = ?').bind(t.id),
  ]);
  if (t.photo_key && env.MATERIALS) await env.MATERIALS.delete(t.photo_key).catch(() => {});
  await audit(env, request, ctx, 'teacher.delete', 'teacher', t.id, t.full_name);
  return json({ ok: true });
});

export const uploadTeacherPhoto = secure({ perm: 'teachers.manage' }, async ({ request, env, params, ctx }) => {
  const t = await env.DB.prepare('SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!t) fail(404, 'Teacher not found.');
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose a photo.');
  const key = await storeImage(env, form.get('photo'), `school/${ctx.school.id}/teachers/${t.id}`);
  await env.DB.prepare('UPDATE sch_teachers SET photo_key = ? WHERE id = ?').bind(key, t.id).run();
  if (t.photo_key && env.MATERIALS) await env.MATERIALS.delete(t.photo_key).catch(() => {});
  return json({ ok: true });
});

export const getTeacherPhoto = secure({ perm: ['teachers.manage', 'classes.manage', 'students.view'] }, async ({ env, params, ctx }) => {
  const t = await env.DB.prepare('SELECT photo_key FROM sch_teachers WHERE id = ? AND school_id = ?').bind(params.id, ctx.school.id).first();
  if (!t) fail(404, 'Not found.');
  return imageResponse(env, t.photo_key);
});
