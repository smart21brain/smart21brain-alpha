var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
var __esm = (fn, res, err) => function __init() {
  if (err) throw err[0];
  try {
    return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
  } catch (e) {
    throw err = [e], e;
  }
};
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};

// src/lib/auth.js
function toHex(buffer) {
  return [...new Uint8Array(buffer)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromHex(hex2) {
  const bytes = new Uint8Array(hex2.length / 2);
  for (let i = 0; i < bytes.length; i++) bytes[i] = parseInt(hex2.substr(i * 2, 2), 16);
  return bytes;
}
async function hashPassword(password, saltHex) {
  const salt = saltHex ? fromHex(saltHex) : crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
  return { hash: toHex(bits), salt: toHex(salt) };
}
async function verifyPassword(password, hashHex, saltHex) {
  const { hash } = await hashPassword(password, saltHex);
  return hash === hashHex;
}
function randomToken() {
  return toHex(crypto.getRandomValues(new Uint8Array(32)));
}
async function createSession(db, userId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1e3).toISOString();
  await db.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expires).run();
  return { token, expires };
}
function sessionCookie(token, expires) {
  const expiresStr = new Date(expires).toUTCString();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Expires=${expiresStr}`;
}
function clearSessionCookie() {
  return "s21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0";
}
function getCookie(request, name) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? match[1] : null;
}
async function getSessionUser(request, db) {
  const token = getCookie(request, "s21_session");
  if (!token) return null;
  const session = await db.prepare(
    "SELECT * FROM sessions WHERE token = ? AND expires_at > datetime('now')"
  ).bind(token).first();
  if (!session) return null;
  const user = await db.prepare(
    "SELECT id, name, email, role, avatar_key, created_at FROM users WHERE id = ?"
  ).bind(session.user_id).first();
  return user || null;
}
function json(data, init = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: { "Content-Type": "application/json", ...init.headers || {} }
  });
}
function badRequest(message) {
  return json({ error: message }, { status: 400 });
}
function unauthorized(message = "Not signed in") {
  return json({ error: message }, { status: 401 });
}
function forbidden(message = "Admins only") {
  return json({ error: message }, { status: 403 });
}
function notFound(message = "Not found") {
  return json({ error: message }, { status: 404 });
}
function slugify(text) {
  return text.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80) || `item-${Date.now()}`;
}
var PBKDF2_ITERATIONS, SESSION_DAYS;
var init_auth = __esm({
  "src/lib/auth.js"() {
    PBKDF2_ITERATIONS = 1e5;
    SESSION_DAYS = 30;
    __name(toHex, "toHex");
    __name(fromHex, "fromHex");
    __name(hashPassword, "hashPassword");
    __name(verifyPassword, "verifyPassword");
    __name(randomToken, "randomToken");
    __name(createSession, "createSession");
    __name(sessionCookie, "sessionCookie");
    __name(clearSessionCookie, "clearSessionCookie");
    __name(getCookie, "getCookie");
    __name(getSessionUser, "getSessionUser");
    __name(json, "json");
    __name(badRequest, "badRequest");
    __name(unauthorized, "unauthorized");
    __name(forbidden, "forbidden");
    __name(notFound, "notFound");
    __name(slugify, "slugify");
  }
});

// src/lib/school-calc.js
function gradeFor(marks, max, scale) {
  const list = [...scale && scale.length ? scale : DEFAULT_GRADING_SCALE].sort((a, b) => b.min - a.min);
  const pct = max > 0 ? marks / max * 100 : 0;
  const hit = list.find((g) => pct >= g.min) || list[list.length - 1];
  return { grade: hit.grade, points: hit.points, remark: hit.remark, percent: round2(pct) };
}
function divisionFor(pointsList, cfg) {
  const c = cfg || DEFAULT_DIVISION;
  if (!c.enabled) return null;
  if (pointsList.length < c.best_of) return null;
  const best = [...pointsList].sort((a, b) => a - b).slice(0, c.best_of);
  const sum = best.reduce((a, b) => a + b, 0);
  const band = (c.bands || []).find((b) => sum <= b.max);
  return { division: band ? band.name : c.fallback, points: sum };
}
function assignPositions(items, key) {
  let lastKey = null;
  let lastPos = 0;
  items.forEach((item, i) => {
    const k = key(item);
    if (k !== lastKey) {
      lastPos = i + 1;
      lastKey = k;
    }
    item.position = lastPos;
  });
  return items;
}
function buildResultSheet({ exam, students, results, subjectsById, scale, divisionCfg }) {
  const byStudent = /* @__PURE__ */ new Map();
  for (const r of results) {
    if (!byStudent.has(r.student_id)) byStudent.set(r.student_id, []);
    byStudent.get(r.student_id).push(r);
  }
  const rows = students.map((st) => {
    const list = (byStudent.get(st.id) || []).slice().sort((a, b) => String(subjectsById[a.subject_id]?.name || "").localeCompare(String(subjectsById[b.subject_id]?.name || "")));
    const subjects = list.map((r) => {
      const g = gradeFor(r.marks, exam.max_marks, scale);
      return {
        subject_id: r.subject_id,
        subject: subjectsById[r.subject_id]?.name || "Subject",
        code: subjectsById[r.subject_id]?.code || "",
        marks: r.marks,
        grade: g.grade,
        points: g.points,
        remarks: g.remark,
        percent: g.percent
      };
    });
    const total = round2(subjects.reduce((s, x) => s + x.marks, 0));
    const count = subjects.length;
    const average = count ? round2(total / (count * exam.max_marks) * 100) : 0;
    const overall = count ? gradeFor(average, 100, scale) : null;
    const div = count ? divisionFor(subjects.map((s) => s.points), divisionCfg) : null;
    return {
      student_id: st.id,
      subjects,
      total,
      subject_count: count,
      average,
      grade: overall ? overall.grade : "\u2014",
      remarks: overall ? overall.remark : "",
      division: div ? div.division : null,
      division_points: div ? div.points : null
    };
  });
  const ranked = rows.filter((r) => r.subject_count > 0).sort((a, b) => b.average - a.average || b.total - a.total);
  assignPositions(ranked, (r) => `${r.average}|${r.total}`);
  rows.forEach((r) => {
    if (r.subject_count === 0) r.position = null;
  });
  return { rows, out_of: ranked.length };
}
function ordinal(n2) {
  if (!n2) return "\u2014";
  const s = ["th", "st", "nd", "rd"];
  const v = n2 % 100;
  return n2 + (s[(v - 20) % 10] || s[v] || s[0]);
}
function attendancePercent(present, absent, late) {
  const total = (present || 0) + (absent || 0) + (late || 0);
  if (!total) return null;
  return round2(((present || 0) + (late || 0)) / total * 100);
}
function feeSummary(items, paid, today) {
  const total = round2(items.reduce((s, i) => s + Number(i.amount || 0), 0));
  const paidTotal = round2(paid || 0);
  const balance = round2(Math.max(total - paidTotal, 0));
  let remaining = paidTotal;
  let overdueAmount = 0;
  const ordered = [...items].sort((a, b) => String(a.due_date || "9999").localeCompare(String(b.due_date || "9999")));
  const lines = ordered.map((i) => {
    const amt = Number(i.amount || 0);
    const cover = Math.min(remaining, amt);
    remaining = round2(remaining - cover);
    const unpaid = round2(amt - cover);
    const overdue = !!(i.due_date && i.due_date < today && unpaid > 0);
    if (overdue) overdueAmount = round2(overdueAmount + unpaid);
    return { ...i, paid: round2(cover), unpaid, overdue };
  });
  let status = "pending";
  if (total > 0 && balance <= 0) status = "paid";
  else if (overdueAmount > 0) status = "overdue";
  else if (paidTotal > 0) status = "partial";
  else if (total <= 0) status = "paid";
  return { total, paid: paidTotal, balance, overdue_amount: overdueAmount, status, lines };
}
function feeStatusFromTotals(total, paid, due) {
  total = round2(total || 0);
  paid = round2(paid || 0);
  const balance = round2(Math.max(total - paid, 0));
  const overdue = round2(Math.max((due || 0) - paid, 0));
  let status = "pending";
  if (total <= 0 || balance <= 0) status = "paid";
  else if (overdue > 0) status = "overdue";
  else if (paid > 0) status = "partial";
  return { total, paid, balance, overdue_amount: overdue, status };
}
function studentFullName(s) {
  return [s.first_name, s.middle_name, s.last_name].filter(Boolean).join(" ");
}
function todayISO() {
  return (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
}
var DEFAULT_GRADING_SCALE, DEFAULT_DIVISION, round2;
var init_school_calc = __esm({
  "src/lib/school-calc.js"() {
    DEFAULT_GRADING_SCALE = [
      { min: 75, grade: "A", points: 1, remark: "Excellent" },
      { min: 65, grade: "B", points: 2, remark: "Very Good" },
      { min: 45, grade: "C", points: 3, remark: "Good" },
      { min: 30, grade: "D", points: 4, remark: "Satisfactory" },
      { min: 0, grade: "F", points: 5, remark: "Fail" }
    ];
    DEFAULT_DIVISION = {
      enabled: true,
      best_of: 7,
      bands: [
        { max: 17, name: "I" },
        { max: 21, name: "II" },
        { max: 25, name: "III" },
        { max: 33, name: "IV" }
      ],
      fallback: "0"
    };
    round2 = /* @__PURE__ */ __name((n2) => Math.round((Number(n2) + Number.EPSILON) * 100) / 100, "round2");
    __name(gradeFor, "gradeFor");
    __name(divisionFor, "divisionFor");
    __name(assignPositions, "assignPositions");
    __name(buildResultSheet, "buildResultSheet");
    __name(ordinal, "ordinal");
    __name(attendancePercent, "attendancePercent");
    __name(feeSummary, "feeSummary");
    __name(feeStatusFromTotals, "feeStatusFromTotals");
    __name(studentFullName, "studentFullName");
    __name(todayISO, "todayISO");
  }
});

// src/lib/school-auth.js
async function getSchoolContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: json({ error: "Please sign in to continue.", code: "unauthorized" }, { status: 401 }) };
  const url = new URL(request.url);
  const wanted = Number(request.headers.get("X-School-Id") || url.searchParams.get("school_id") || 0);
  const sql = `SELECT m.id AS member_id, m.role, m.teacher_id, m.parent_id, s.*
               FROM sch_members m JOIN sch_schools s ON s.id = m.school_id
               WHERE m.user_id = ? AND m.active = 1 ${wanted ? "AND m.school_id = ?" : ""}
               ORDER BY m.id ASC LIMIT 1`;
  let row = await (wanted ? env.DB.prepare(sql).bind(user.id, wanted) : env.DB.prepare(sql).bind(user.id)).first();
  if (!row && wanted) {
    row = await env.DB.prepare(sql.replace("AND m.school_id = ?", "")).bind(user.id).first();
  }
  const ctx = { user, school: null, role: null, perms: /* @__PURE__ */ new Set(), teacherId: null, parentId: null, _cache: {} };
  if (!row) return ctx;
  ctx.school = {
    id: row.id,
    name: row.name,
    short_name: row.short_name,
    logo_key: row.logo_key,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    social: safeJson(row.social, {}),
    currency: row.currency,
    admission_prefix: row.admission_prefix,
    primary_color: row.primary_color,
    receipt_note: row.receipt_note
  };
  ctx.role = row.role;
  ctx.teacherId = row.teacher_id || null;
  ctx.parentId = row.parent_id || null;
  if (ctx.role === "admin") {
    ALL_PERMISSION_KEYS.forEach((k) => ctx.perms.add(k));
  } else {
    const { results } = await env.DB.prepare(
      "SELECT permission FROM sch_role_permissions WHERE school_id = ? AND role = ?"
    ).bind(ctx.school.id, ctx.role).all();
    results.forEach((r) => ctx.perms.add(r.permission));
  }
  return ctx;
}
function secure(opts, fn) {
  if (typeof opts === "function") {
    fn = opts;
    opts = {};
  }
  return async ({ request, env, params, url }) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
      const ctx = await getSchoolContext(request, env);
      if (ctx.error) return ctx.error;
      if (!ctx.school) {
        if (opts.school === false) return await fn({ request, env, params, url, ctx });
        return json({ error: "You are not part of a school yet.", code: "no_school" }, { status: 403 });
      }
      if (ctx.role === "parent" && !opts.parent) fail(403, "This area is not available to parents.");
      if (opts.roles && !opts.roles.includes(ctx.role)) fail(403, "You do not have access to this.");
      if (opts.perm) {
        const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
        if (!list.some((p) => can2(ctx, p))) fail(403, "You do not have permission to do this. Ask your school administrator.");
      }
      return await fn({ request, env, params, url, ctx });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
function errorResponse(e) {
  if (e instanceof HttpError) {
    return json({ error: e.message, ...e.extra || {} }, { status: e.status });
  }
  console.error(e);
  return json({ error: "Something went wrong on our side. Please try again.", detail: String(e && e.message || e) }, { status: 500 });
}
function assertSameOrigin(request) {
  const origin = request.headers.get("Origin");
  if (!origin) return;
  let ok = false;
  try {
    ok = new URL(origin).host === new URL(request.url).host;
  } catch (e) {
    ok = false;
  }
  if (!ok) fail(403, "Blocked: this request came from another website.");
}
async function readJson(request) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") fail(400, "The request was not understood (invalid data).");
  return body;
}
async function teacherClassIds(env, ctx) {
  if (ctx._cache.tclasses) return ctx._cache.tclasses;
  if (!ctx.teacherId) return ctx._cache.tclasses = [];
  const { results } = await env.DB.prepare(
    `SELECT id FROM sch_classes WHERE school_id = ? AND teacher_id = ?
     UNION SELECT class_id FROM sch_class_subjects WHERE school_id = ? AND teacher_id = ?`
  ).bind(ctx.school.id, ctx.teacherId, ctx.school.id, ctx.teacherId).all();
  return ctx._cache.tclasses = results.map((r) => r.id);
}
async function parentStudentIds(env, ctx) {
  if (ctx._cache.pstudents) return ctx._cache.pstudents;
  if (!ctx.parentId) return ctx._cache.pstudents = [];
  const { results } = await env.DB.prepare(
    `SELECT sp.student_id FROM sch_student_parents sp JOIN sch_students s ON s.id = sp.student_id
     WHERE sp.parent_id = ? AND s.school_id = ?`
  ).bind(ctx.parentId, ctx.school.id).all();
  return ctx._cache.pstudents = results.map((r) => r.student_id);
}
async function loadStudentForCtx(env, ctx, studentId) {
  const st = await env.DB.prepare("SELECT * FROM sch_students WHERE id = ? AND school_id = ?").bind(studentId, ctx.school.id).first();
  if (!st) fail(404, "Student not found.");
  if (ctx.role === "parent") {
    if (!(await parentStudentIds(env, ctx)).includes(st.id)) fail(403, "You can only see your own children.");
  } else if (ctx.role === "teacher") {
    const cls = await env.DB.prepare(
      `SELECT class_id FROM sch_enrollments WHERE student_id = ? AND academic_year_id = (SELECT id FROM sch_academic_years WHERE school_id = ? AND is_current = 1)`
    ).bind(st.id, ctx.school.id).first();
    const allowed = await teacherClassIds(env, ctx);
    if (!cls || !allowed.includes(cls.class_id)) fail(403, "This student is not in one of your classes.");
  }
  return st;
}
function safeJson(text, fallback) {
  if (text == null || text === "") return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    return fallback;
  }
}
async function getSettings2(env, schoolId) {
  const { results } = await env.DB.prepare("SELECT key, value FROM sch_settings WHERE school_id = ?").bind(schoolId).all();
  const raw = {};
  results.forEach((r) => {
    raw[r.key] = safeJson(r.value, r.value);
  });
  return {
    payment_methods: Array.isArray(raw.payment_methods) && raw.payment_methods.length ? raw.payment_methods : DEFAULT_PAYMENT_METHODS,
    grading_scale: Array.isArray(raw.grading_scale) && raw.grading_scale.length ? raw.grading_scale : DEFAULT_GRADING_SCALE,
    division: raw.division && typeof raw.division === "object" ? { ...DEFAULT_DIVISION, ...raw.division } : DEFAULT_DIVISION,
    absence_alert_threshold: Number(raw.absence_alert_threshold) > 0 ? Number(raw.absence_alert_threshold) : 3,
    receipt_footer: typeof raw.receipt_footer === "string" ? raw.receipt_footer : "Thank you for your payment. Fees paid are not refundable.",
    receipt_prefix: typeof raw.receipt_prefix === "string" && raw.receipt_prefix ? raw.receipt_prefix : "RCT",
    id_card_note: typeof raw.id_card_note === "string" ? raw.id_card_note : "If found, please return to the school office."
  };
}
async function saveSetting(env, schoolId, key, value) {
  await env.DB.prepare(
    `INSERT INTO sch_settings (school_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(school_id, key) DO UPDATE SET value = excluded.value`
  ).bind(schoolId, key, JSON.stringify(value)).run();
}
async function currentYear(env, schoolId) {
  const y = await env.DB.prepare("SELECT * FROM sch_academic_years WHERE school_id = ? AND is_current = 1").bind(schoolId).first();
  if (y) return y;
  const any = await env.DB.prepare("SELECT * FROM sch_academic_years WHERE school_id = ? ORDER BY id DESC LIMIT 1").bind(schoolId).first();
  if (!any) fail(400, "No academic year is set up yet. Add one in Settings \u2192 Academic Settings.");
  return any;
}
async function audit(env, request, ctx, action, entity, entityId, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO sch_audit_logs (school_id, user_id, action, entity, entity_id, details, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ctx.school.id,
      ctx.user ? ctx.user.id : null,
      action,
      entity || null,
      entityId || null,
      details == null ? null : String(typeof details === "string" ? details : JSON.stringify(details)).slice(0, 1e3),
      request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null,
      (request.headers.get("User-Agent") || "").slice(0, 250) || null
    ).run();
  } catch (e) {
  }
}
function likeTerm(q) {
  return `%${String(q || "").trim().replace(/[\\%_]/g, (c) => "\\" + c)}%`;
}
function chunk(arr, size = 80) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
function paging(url, def = 25, max = 100) {
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1", 10) || 1);
  const limit = Math.min(max, Math.max(1, parseInt(url.searchParams.get("limit") || String(def), 10) || def));
  return { page, limit, offset: (page - 1) * limit };
}
function sniffImage(bytes) {
  if (bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71) return "image/png";
  if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return "image/jpeg";
  if (bytes[0] === 82 && bytes[1] === 73 && bytes[2] === 70 && bytes[3] === 70 && bytes[8] === 87 && bytes[9] === 69) return "image/webp";
  return null;
}
async function storeImage(env, file, keyPrefix) {
  if (!env.MATERIALS) fail(500, "File storage is not configured.");
  if (!file || typeof file === "string" || !file.size) fail(400, "Please choose an image file.");
  if (file.size > MAX_IMAGE_BYTES) fail(400, "The image is too large (3 MB maximum).");
  const buf = await file.arrayBuffer();
  const real = sniffImage(new Uint8Array(buf.slice(0, 16)));
  if (!real || !IMAGE_TYPES[real]) fail(400, "Only PNG, JPG or WEBP images are allowed.");
  const key = `${keyPrefix}-${crypto.randomUUID()}.${IMAGE_TYPES[real]}`;
  await env.MATERIALS.put(key, buf, { httpMetadata: { contentType: real } });
  return key;
}
async function imageResponse(env, key) {
  if (!key || !env.MATERIALS) return new Response("Not found", { status: 404 });
  const obj = await env.MATERIALS.get(key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata && obj.httpMetadata.contentType || "image/jpeg",
      "Cache-Control": "private, max-age=300",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
function randomToken2(bytes = 12) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("");
}
var HttpError, fail, ROLES2, PERMISSIONS2, ALL_PERMISSION_KEYS, DEFAULT_ROLE_PERMISSIONS, DEFAULT_PAYMENT_METHODS, can2, isBlank, V, IMAGE_TYPES, MAX_IMAGE_BYTES;
var init_school_auth = __esm({
  "src/lib/school-auth.js"() {
    init_auth();
    init_school_calc();
    HttpError = class extends Error {
      static {
        __name(this, "HttpError");
      }
      constructor(status, message, extra) {
        super(message);
        this.status = status;
        this.extra = extra || null;
      }
    };
    fail = /* @__PURE__ */ __name((status, message, extra) => {
      throw new HttpError(status, message, extra);
    }, "fail");
    ROLES2 = ["admin", "teacher", "receptionist", "parent"];
    PERMISSIONS2 = [
      { group: "Students", key: "students.view", label: "View students" },
      { group: "Students", key: "students.create", label: "Register students" },
      { group: "Students", key: "students.edit", label: "Edit students & change status" },
      { group: "Students", key: "students.delete", label: "Delete students" },
      { group: "Students", key: "students.notes", label: "Add private notes about students" },
      { group: "People", key: "parents.manage", label: "Manage parents / guardians" },
      { group: "People", key: "teachers.manage", label: "Manage teachers" },
      { group: "Academics", key: "classes.manage", label: "Manage classes" },
      { group: "Academics", key: "subjects.manage", label: "Manage subjects" },
      { group: "Academics", key: "timetable.manage", label: "Manage timetable" },
      { group: "Attendance", key: "attendance.take", label: "Take attendance" },
      { group: "Attendance", key: "attendance.view", label: "View attendance" },
      { group: "Fees", key: "fees.view", label: "View fees & payments" },
      { group: "Fees", key: "fees.record", label: "Record payments & print receipts" },
      { group: "Fees", key: "fees.manage", label: "Manage fee structures & edit payments" },
      { group: "Exams", key: "exams.manage", label: "Create examinations" },
      { group: "Exams", key: "results.enter", label: "Enter examination marks" },
      { group: "Exams", key: "results.view", label: "View results & report cards" },
      { group: "System", key: "announcements.manage", label: "Send announcements" },
      { group: "System", key: "reports.view", label: "View reports" },
      { group: "System", key: "users.manage", label: "Manage users" },
      { group: "System", key: "settings.manage", label: "Change system settings" },
      { group: "System", key: "audit.view", label: "View audit logs" }
    ];
    ALL_PERMISSION_KEYS = PERMISSIONS2.map((p) => p.key);
    DEFAULT_ROLE_PERMISSIONS = {
      admin: ALL_PERMISSION_KEYS,
      teacher: ["students.view", "students.notes", "attendance.take", "attendance.view", "exams.manage", "results.enter", "results.view"],
      receptionist: ["students.view", "students.create", "students.edit", "parents.manage", "fees.view", "fees.record", "reports.view"],
      parent: []
    };
    DEFAULT_PAYMENT_METHODS = ["Cash", "Bank", "Mobile Money", "Card", "Other"];
    __name(getSchoolContext, "getSchoolContext");
    can2 = /* @__PURE__ */ __name((ctx, perm) => ctx.role === "admin" || ctx.perms.has(perm), "can");
    __name(secure, "secure");
    __name(errorResponse, "errorResponse");
    __name(assertSameOrigin, "assertSameOrigin");
    __name(readJson, "readJson");
    __name(teacherClassIds, "teacherClassIds");
    __name(parentStudentIds, "parentStudentIds");
    __name(loadStudentForCtx, "loadStudentForCtx");
    __name(safeJson, "safeJson");
    __name(getSettings2, "getSettings");
    __name(saveSetting, "saveSetting");
    __name(currentYear, "currentYear");
    __name(audit, "audit");
    isBlank = /* @__PURE__ */ __name((v) => v == null || typeof v === "string" && v.trim() === "", "isBlank");
    V = {
      str(val, label2, { required = false, max = 200, min = 0 } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const s = String(val).trim();
        if (s.length < min) fail(400, `${label2} must be at least ${min} characters.`);
        if (s.length > max) fail(400, `${label2} is too long (maximum ${max} characters).`);
        return s;
      },
      oneOf(val, label2, list, { required = false, def = null } = {}) {
        if (isBlank(val)) {
          if (required && def == null) fail(400, `${label2} is required.`);
          return def;
        }
        const s = String(val).trim().toLowerCase();
        if (!list.includes(s)) fail(400, `${label2} must be one of: ${list.join(", ")}.`);
        return s;
      },
      date(val, label2, { required = false } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const s = String(val).trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(s) || Number.isNaN(Date.parse(s + "T00:00:00Z"))) fail(400, `${label2} must be a valid date (YYYY-MM-DD).`);
        return s;
      },
      time(val, label2, { required = false } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const s = String(val).trim();
        if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(s)) fail(400, `${label2} must be a time like 08:00.`);
        return s;
      },
      int(val, label2, { required = false, min = -Infinity, max = Infinity } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const n2 = Number(val);
        if (!Number.isInteger(n2) || n2 < min || n2 > max) fail(400, `${label2} must be a whole number${min > -Infinity ? ` from ${min}` : ""}${max < Infinity ? ` to ${max}` : ""}.`);
        return n2;
      },
      num(val, label2, { required = false, min = -Infinity, max = Infinity } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const n2 = Number(val);
        if (!Number.isFinite(n2) || n2 < min || n2 > max) fail(400, `${label2} must be a number${min > -Infinity ? ` of at least ${min}` : ""}${max < Infinity ? ` and at most ${max}` : ""}.`);
        return n2;
      },
      email(val, label2, { required = false } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const s = String(val).trim().toLowerCase();
        if (s.length > 160 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s)) fail(400, `${label2} must be a valid email address.`);
        return s;
      },
      phone(val, label2, { required = false } = {}) {
        if (isBlank(val)) {
          if (required) fail(400, `${label2} is required.`);
          return null;
        }
        const s = String(val).trim();
        if (!/^\+?[0-9][0-9 ()\-]{5,19}$/.test(s)) fail(400, `${label2} must be a valid phone number.`);
        return s;
      },
      password(val, label2 = "Password") {
        const s = String(val || "");
        if (s.length < 8) fail(400, `${label2} must be at least 8 characters.`);
        if (s.length > 200) fail(400, `${label2} is too long.`);
        return s;
      },
      color(val, label2 = "Colour") {
        if (isBlank(val)) return null;
        const s = String(val).trim();
        if (!/^#[0-9a-fA-F]{6}$/.test(s)) fail(400, `${label2} must look like #0B6E4F.`);
        return s;
      },
      ids(val, label2) {
        if (val == null) return [];
        if (!Array.isArray(val)) fail(400, `${label2} must be a list.`);
        const out = [...new Set(val.map((x) => Number(x)))];
        if (out.some((n2) => !Number.isInteger(n2) || n2 <= 0)) fail(400, `${label2} contains an invalid item.`);
        if (out.length > 200) fail(400, `${label2} has too many items.`);
        return out;
      }
    };
    __name(likeTerm, "likeTerm");
    __name(chunk, "chunk");
    __name(paging, "paging");
    IMAGE_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
    MAX_IMAGE_BYTES = 3 * 1024 * 1024;
    __name(sniffImage, "sniffImage");
    __name(storeImage, "storeImage");
    __name(imageResponse, "imageResponse");
    __name(randomToken2, "randomToken");
  }
});

// src/lib/institution-auth.js
var institution_auth_exports = {};
__export(institution_auth_exports, {
  ALL_PERMISSION_KEYS: () => ALL_PERMISSION_KEYS3,
  DEFAULT_GRADING: () => DEFAULT_GRADING,
  DEFAULT_ROLE_PERMISSIONS: () => DEFAULT_ROLE_PERMISSIONS3,
  DEFAULT_SETTINGS: () => DEFAULT_SETTINGS,
  HttpError: () => HttpError,
  PERMISSIONS: () => PERMISSIONS4,
  ROLES: () => ROLES4,
  ROLE_LABELS: () => ROLE_LABELS,
  V: () => V,
  addDays: () => addDays3,
  assertSameOrigin: () => assertSameOrigin,
  audit: () => audit3,
  can: () => can4,
  chunk: () => chunk,
  daysBetween: () => daysBetween,
  errorResponse: () => errorResponse,
  fail: () => fail,
  getInstContext: () => getInstContext,
  getSettings: () => getSettings4,
  gradeFor: () => gradeFor2,
  imageResponse: () => imageResponse,
  likeTerm: () => likeTerm,
  localToday: () => localToday,
  nextNumber: () => nextNumber,
  notify: () => notify2,
  paging: () => paging,
  randomToken: () => randomToken2,
  readJson: () => readJson,
  round2: () => round23,
  safeJson: () => safeJson,
  saveSetting: () => saveSetting3,
  secure: () => secure3,
  slugify: () => slugify2,
  storeImage: () => storeImage,
  userIdForBorrower: () => userIdForBorrower
});
function gradeFor2(marks, scale) {
  const list = (Array.isArray(scale) && scale.length ? scale : DEFAULT_GRADING).slice().sort((a, b) => b.min - a.min);
  return list.find((g) => marks >= g.min) || list[list.length - 1];
}
async function getInstContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: json({ error: "Please sign in to continue.", code: "unauthorized" }, { status: 401 }) };
  const url = new URL(request.url);
  const wanted = Number(request.headers.get("X-Institution-Id") || url.searchParams.get("institution_id") || 0);
  const sql = `SELECT m.id AS member_id, m.role, m.student_id AS m_student_id, m.staff_id AS m_staff_id, i.*
               FROM ins_members m JOIN ins_institutions i ON i.id = m.institution_id
               WHERE m.user_id = ? AND m.active = 1 ${wanted ? "AND m.institution_id = ?" : ""}
               ORDER BY m.id ASC LIMIT 1`;
  let row = await (wanted ? env.DB.prepare(sql).bind(user.id, wanted) : env.DB.prepare(sql).bind(user.id)).first();
  if (!row && wanted) row = await env.DB.prepare(sql.replace("AND m.institution_id = ?", "")).bind(user.id).first();
  const ctx = { user, inst: null, role: null, perms: /* @__PURE__ */ new Set(), off: 180, studentId: null, staffId: null };
  if (!row) return ctx;
  ctx.inst = {
    id: row.id,
    name: row.name,
    short_name: row.short_name,
    slug: row.slug,
    inst_type: row.inst_type,
    about: row.about,
    logo_key: row.logo_key,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    currency: row.currency,
    primary_color: row.primary_color,
    utc_offset_min: Number.isInteger(row.utc_offset_min) ? row.utc_offset_min : 180,
    is_public: row.is_public
  };
  ctx.off = ctx.inst.utc_offset_min;
  ctx.role = row.role;
  ctx.studentId = row.m_student_id || null;
  ctx.staffId = row.m_staff_id || null;
  if (ctx.role === "super_admin") {
    ALL_PERMISSION_KEYS3.forEach((k) => ctx.perms.add(k));
  } else {
    const { results } = await env.DB.prepare(
      "SELECT permission FROM ins_role_permissions WHERE institution_id = ? AND role = ?"
    ).bind(ctx.inst.id, ctx.role).all();
    results.forEach((r) => ctx.perms.add(r.permission));
  }
  return ctx;
}
function secure3(opts, fn) {
  if (typeof opts === "function") {
    fn = opts;
    opts = {};
  }
  return async ({ request, env, params, url }) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
      const ctx = await getInstContext(request, env);
      if (ctx.error) return ctx.error;
      if (!ctx.inst) {
        if (opts.inst === false) return await fn({ request, env, params, url, ctx });
        return json({ error: "You are not part of an institution yet.", code: "no_institution" }, { status: 403 });
      }
      if (opts.roles && !opts.roles.includes(ctx.role)) fail(403, "You do not have permission to perform this action.");
      if (opts.perm) {
        const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
        if (!list.some((p) => can4(ctx, p))) fail(403, "You do not have permission to perform this action.");
      }
      return await fn({ request, env, params, url, ctx });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
async function getSettings4(env, instId) {
  const { results } = await env.DB.prepare("SELECT key, value FROM ins_settings WHERE institution_id = ?").bind(instId).all();
  const raw = {};
  results.forEach((r) => {
    raw[r.key] = safeJson(r.value, r.value);
  });
  const out = { ...DEFAULT_SETTINGS };
  for (const k of Object.keys(DEFAULT_SETTINGS)) {
    if (raw[k] === void 0 || raw[k] === null) continue;
    if (k === "grading_scale") {
      if (Array.isArray(raw[k]) && raw[k].length) out[k] = raw[k];
    } else if (typeof DEFAULT_SETTINGS[k] === "number") {
      if (Number.isFinite(Number(raw[k]))) out[k] = Number(raw[k]);
    } else if (typeof raw[k] === "string" && raw[k]) out[k] = raw[k];
  }
  return out;
}
async function saveSetting3(env, instId, key, value) {
  await env.DB.prepare(
    `INSERT INTO ins_settings (institution_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(institution_id, key) DO UPDATE SET value = excluded.value`
  ).bind(instId, key, JSON.stringify(value)).run();
}
async function audit3(env, request, ctx, module, action, entity, entityId, details, status = "success") {
  try {
    await env.DB.prepare(
      `INSERT INTO ins_audit_logs (institution_id, user_id, module, action, entity, entity_id, details, status, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ctx.inst.id,
      ctx.user ? ctx.user.id : null,
      module || null,
      action,
      entity || null,
      entityId || null,
      details == null ? null : String(typeof details === "string" ? details : JSON.stringify(details)).slice(0, 1e3),
      status,
      request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null,
      (request.headers.get("User-Agent") || "").slice(0, 250) || null
    ).run();
  } catch (e) {
  }
}
async function notify2(env, instId, userId, kind, title, message, link) {
  try {
    await env.DB.prepare(
      "INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, ?, ?, ?, ?)"
    ).bind(instId, userId, kind, String(title).slice(0, 160), message ? String(message).slice(0, 500) : null, link || null).run();
  } catch (e) {
  }
}
async function userIdForBorrower(env, instId, type, id) {
  const col = type === "student" ? "student_id" : "staff_id";
  const r = await env.DB.prepare(`SELECT user_id FROM ins_members WHERE institution_id = ? AND ${col} = ? AND active = 1 LIMIT 1`).bind(instId, id).first();
  return r ? r.user_id : null;
}
async function nextNumber(env, instId, table, col, prefix, padTo = 4) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE institution_id = ?`).bind(instId).first();
  let n2 = (r?.n || 0) + 1;
  for (let i = 0; i < 50; i++, n2++) {
    const no = `${prefix}-${String(n2).padStart(padTo, "0")}`;
    const hit = await env.DB.prepare(`SELECT 1 AS x FROM ${table} WHERE institution_id = ? AND ${col} = ?`).bind(instId, no).first();
    if (!hit) return no;
  }
  return `${prefix}-${Date.now()}`;
}
var ROLES4, ROLE_LABELS, PERMISSIONS4, ALL_PERMISSION_KEYS3, ADMIN_PERMS, DEFAULT_ROLE_PERMISSIONS3, round23, DEFAULT_GRADING, can4, DEFAULT_SETTINGS, localToday, addDays3, daysBetween, slugify2;
var init_institution_auth = __esm({
  "src/lib/institution-auth.js"() {
    init_auth();
    init_school_auth();
    ROLES4 = ["super_admin", "admin", "librarian", "staff", "teacher", "student"];
    ROLE_LABELS = {
      super_admin: "Super Administrator",
      admin: "Administrator",
      librarian: "Librarian",
      staff: "Staff",
      teacher: "Teacher / Lecturer",
      student: "Student"
    };
    PERMISSIONS4 = [
      { group: "Library", key: "books.view", label: "View the library catalogue (staff view)" },
      { group: "Library", key: "books.manage", label: "Add, edit, archive & delete books" },
      { group: "Library", key: "loans.view", label: "View all loans & reservations" },
      { group: "Library", key: "loans.manage", label: "Issue, return, renew & reserve books" },
      { group: "Library", key: "fines.manage", label: "Manage fines (collect, waive)" },
      { group: "E-Library", key: "resources.view", label: "Open digital resources (as allowed by each resource)" },
      { group: "E-Library", key: "resources.manage", label: "Upload, edit & delete digital resources" },
      { group: "People", key: "students.view", label: "View student records" },
      { group: "People", key: "students.manage", label: "Add, edit & delete student records" },
      { group: "People", key: "staff.view", label: "View staff records" },
      { group: "People", key: "staff.manage", label: "Add, edit & delete staff records" },
      { group: "Academics", key: "academics.view", label: "View courses, enrolment & results" },
      { group: "Academics", key: "academics.manage", label: "Manage programmes, courses & enrolment" },
      { group: "Academics", key: "results.enter", label: "Enter & change marks (teachers: own courses only)" },
      { group: "Academics", key: "results.all", label: "Enter & change marks for any course" },
      { group: "System", key: "announcements.manage", label: "Post & delete announcements" },
      { group: "Website", key: "site.manage", label: "Build & publish the institution website (pages, news, design)" },
      { group: "Website", key: "applications.manage", label: "Review online applications & website messages" },
      { group: "System", key: "reports.view", label: "View & export reports" },
      { group: "System", key: "import.manage", label: "Import records from CSV / Excel" },
      { group: "System", key: "users.manage", label: "Manage logins & roles" },
      { group: "System", key: "settings.manage", label: "Change institution settings" },
      { group: "System", key: "permissions.manage", label: "Change what each role can do" },
      { group: "System", key: "audit.view", label: "View the audit log" },
      { group: "System", key: "backup.manage", label: "Create, verify & download backups" },
      { group: "System", key: "health.view", label: "View system health" }
    ];
    ALL_PERMISSION_KEYS3 = PERMISSIONS4.map((p) => p.key);
    ADMIN_PERMS = ALL_PERMISSION_KEYS3.filter((k) => !["permissions.manage", "backup.manage"].includes(k));
    DEFAULT_ROLE_PERMISSIONS3 = {
      super_admin: ALL_PERMISSION_KEYS3,
      admin: ADMIN_PERMS,
      librarian: [
        "books.view",
        "books.manage",
        "loans.view",
        "loans.manage",
        "fines.manage",
        "resources.view",
        "resources.manage",
        "students.view",
        "staff.view",
        "announcements.manage",
        "reports.view",
        "import.manage"
      ],
      staff: ["books.view", "resources.view", "students.view", "staff.view", "academics.view", "reports.view"],
      teacher: ["books.view", "resources.view", "students.view", "academics.view", "results.enter", "reports.view"],
      student: ["resources.view"]
    };
    round23 = /* @__PURE__ */ __name((n2) => Math.round((Number(n2) + Number.EPSILON) * 100) / 100, "round2");
    DEFAULT_GRADING = [
      { min: 80, grade: "A", points: 5 },
      { min: 70, grade: "B", points: 4 },
      { min: 60, grade: "C", points: 3 },
      { min: 50, grade: "D", points: 2 },
      { min: 40, grade: "E", points: 1 },
      { min: 0, grade: "F", points: 0 }
    ];
    __name(gradeFor2, "gradeFor");
    __name(getInstContext, "getInstContext");
    can4 = /* @__PURE__ */ __name((ctx, perm) => ctx.role === "super_admin" || ctx.perms.has(perm), "can");
    __name(secure3, "secure");
    DEFAULT_SETTINGS = {
      loan_days_student: 14,
      loan_days_staff: 30,
      max_loans_student: 3,
      max_loans_staff: 10,
      max_renewals: 2,
      renewal_days: 7,
      fine_per_day: 200,
      lost_fine_multiplier: 1,
      damaged_fine: 2e3,
      reservation_hold_days: 3,
      student_prefix: "STU",
      staff_prefix: "STF",
      accession_prefix: "ACC",
      grading_scale: DEFAULT_GRADING,
      max_upload_mb: 20
    };
    __name(getSettings4, "getSettings");
    __name(saveSetting3, "saveSetting");
    localToday = /* @__PURE__ */ __name((off) => new Date(Date.now() + (Number(off) | 0) * 6e4).toISOString().slice(0, 10), "localToday");
    addDays3 = /* @__PURE__ */ __name((ymd, n2) => new Date(Date.parse(ymd + "T00:00:00Z") + n2 * 864e5).toISOString().slice(0, 10), "addDays");
    daysBetween = /* @__PURE__ */ __name((fromYmd, toYmd) => Math.round((Date.parse(toYmd + "T00:00:00Z") - Date.parse(fromYmd + "T00:00:00Z")) / 864e5), "daysBetween");
    __name(audit3, "audit");
    __name(notify2, "notify");
    __name(userIdForBorrower, "userIdForBorrower");
    __name(nextNumber, "nextNumber");
    slugify2 = /* @__PURE__ */ __name((text) => String(text).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40) || "institution", "slugify");
  }
});

// src/router.js
var Router = class {
  static {
    __name(this, "Router");
  }
  constructor() {
    this.routes = [];
  }
  add(method, path, handler) {
    const keys = [];
    const pattern = new RegExp(
      "^" + path.split("/").map((seg) => {
        if (seg.startsWith(":")) {
          keys.push(seg.slice(1));
          return "([^/]+)";
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      }).join("/") + "$"
    );
    this.routes.push({ method, pattern, keys, handler });
    return this;
  }
  get(path, handler) {
    return this.add("GET", path, handler);
  }
  post(path, handler) {
    return this.add("POST", path, handler);
  }
  put(path, handler) {
    return this.add("PUT", path, handler);
  }
  delete(path, handler) {
    return this.add("DELETE", path, handler);
  }
  // Returns a Response, or null if no route matched (caller should fall
  // through to static asset serving / 404).
  async handle(request, env, ctx) {
    const url = new URL(request.url);
    for (const route of this.routes) {
      if (route.method !== request.method) continue;
      const match = route.pattern.exec(url.pathname);
      if (!match) continue;
      const params = {};
      route.keys.forEach((key, i) => {
        params[key] = decodeURIComponent(match[i + 1]);
      });
      return route.handler({ request, env, ctx, params, url });
    }
    return null;
  }
};

// src/handlers/auth.js
init_auth();
var AVATAR_TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
var MAX_AVATAR_BYTES = 5 * 1024 * 1024;
var ALLOWED_ROLES = ["user", "teacher", "parent", "admin"];
async function register({ request, env }) {
  const contentType = request.headers.get("Content-Type") || "";
  let name, email, password, role, adminCode, avatarFile = null;
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    if (!form) return badRequest("Could not read the submitted form.");
    name = form.get("name");
    email = form.get("email");
    password = form.get("password");
    role = form.get("role");
    adminCode = form.get("admin_code");
    const file = form.get("avatar");
    if (file && typeof file !== "string" && file.size > 0) avatarFile = file;
  } else {
    const body = await request.json().catch(() => null);
    name = body?.name;
    email = body?.email;
    password = body?.password;
    role = body?.role;
    adminCode = body?.admin_code;
  }
  if (!name || !email || !password) {
    return badRequest("Name, email and password are required.");
  }
  email = String(email).trim().toLowerCase();
  if (String(password).length < 8) return badRequest("Password must be at least 8 characters.");
  role = String(role || "user").toLowerCase();
  if (!ALLOWED_ROLES.includes(role)) role = "user";
  if (role === "admin") {
    if (!env.ADMIN_SIGNUP_CODE || String(adminCode || "") !== env.ADMIN_SIGNUP_CODE) {
      return badRequest("A valid admin invite code is required to create an admin account.");
    }
  }
  if (avatarFile) {
    if (!AVATAR_TYPES[avatarFile.type]) {
      return badRequest("Profile photo must be a PNG, JPG, WEBP or GIF image.");
    }
    if (avatarFile.size > MAX_AVATAR_BYTES) {
      return badRequest("Profile photo is too large (5MB max).");
    }
  }
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  if (existing) return badRequest("An account with that email already exists.");
  const { hash, salt } = await hashPassword(password);
  const cleanName = String(name).trim();
  const result = await env.DB.prepare(
    "INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)"
  ).bind(cleanName, email, hash, salt, role).run();
  const userId = result.meta.last_row_id;
  let avatarKey = null;
  if (avatarFile) {
    avatarKey = `avatars/${userId}-${crypto.randomUUID()}.${AVATAR_TYPES[avatarFile.type]}`;
    await env.MATERIALS.put(avatarKey, await avatarFile.arrayBuffer(), {
      httpMetadata: { contentType: avatarFile.type }
    });
    await env.DB.prepare("UPDATE users SET avatar_key = ? WHERE id = ?").bind(avatarKey, userId).run();
  }
  const { token, expires } = await createSession(env.DB, userId);
  return json(
    { user: { id: userId, name: cleanName, email, role, avatar_key: avatarKey } },
    { status: 201, headers: { "Set-Cookie": sessionCookie(token, expires) } }
  );
}
__name(register, "register");
async function login({ request, env }) {
  const body = await request.json().catch(() => null);
  if (!body || !body.email || !body.password) return badRequest("Email and password are required.");
  const email = String(body.email).trim().toLowerCase();
  const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
  if (!user) return unauthorized("Incorrect email or password.");
  const valid = await verifyPassword(body.password, user.password_hash, user.password_salt);
  if (!valid) return unauthorized("Incorrect email or password.");
  const { token, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    "INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)"
  ).bind(
    user.id,
    request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null,
    request.headers.get("User-Agent") || null
  ).run();
  return json(
    { user: { id: user.id, name: user.name, email: user.email, role: user.role, avatar_key: user.avatar_key } },
    { headers: { "Set-Cookie": sessionCookie(token, expires) } }
  );
}
__name(login, "login");
async function logout({ request, env }) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match[1]).run();
  return json({ ok: true }, { headers: { "Set-Cookie": clearSessionCookie() } });
}
__name(logout, "logout");
async function me({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  return json({ user: user || null });
}
__name(me, "me");

// src/handlers/games.js
init_auth();
async function listGames({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM games WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ games: results });
}
__name(listGames, "listGames");
async function createGame({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest("Title is required.");
  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO games (title, slug, subject, description, emoji, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    slug,
    body.subject || null,
    body.description || null,
    body.emoji || "\u{1F3AE}",
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(createGame, "createGame");
async function getGame({ params, env }) {
  const game = await env.DB.prepare("SELECT * FROM games WHERE id = ?").bind(params.id).first();
  if (!game) return notFound();
  return json({ game });
}
__name(getGame, "getGame");
async function updateGame({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE games SET title = ?, subject = ?, description = ?, emoji = ?, published = ? WHERE id = ?`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    body.emoji || "\u{1F3AE}",
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(updateGame, "updateGame");
async function deleteGame({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM games WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteGame, "deleteGame");
async function submitGameScore({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const score = Number(body?.score);
  if (!Number.isFinite(score)) return badRequest("A numeric score is required.");
  await env.DB.prepare(
    "INSERT INTO game_scores (user_id, game_id, score) VALUES (?, ?, ?)"
  ).bind(user.id, params.id, score).run();
  return json({ ok: true }, { status: 201 });
}
__name(submitGameScore, "submitGameScore");

// src/handlers/quizzes.js
init_auth();

// src/lib/course-engine.js
function randomCertCode(bytes = 8) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))].map((b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
}
__name(randomCertCode, "randomCertCode");
async function bestQuizPercent(env, userId, quizId) {
  if (!userId || !quizId) return null;
  const row = await env.DB.prepare(
    "SELECT MAX(CAST(score AS REAL) / NULLIF(total, 0)) AS best FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?"
  ).bind(userId, quizId).first();
  return row?.best != null ? Math.round(row.best * 100) : null;
}
__name(bestQuizPercent, "bestQuizPercent");
async function getCourseProgress(env, userId, course) {
  const { results: modules } = await env.DB.prepare(
    "SELECT id, title, description, quiz_id, passing_score, sort_order FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC"
  ).bind(course.id).all();
  const { results: lessons } = await env.DB.prepare(
    "SELECT id, module_id FROM course_lessons WHERE course_id = ?"
  ).bind(course.id).all();
  const totalLessons = lessons.length;
  const modulesWithQuiz = modules.filter((m) => m.quiz_id);
  let completedLessons = 0;
  const moduleStatus = {};
  if (userId) {
    const { results: doneRows } = await env.DB.prepare(
      `SELECT lp.lesson_id FROM lesson_progress lp
       JOIN course_lessons cl ON cl.id = lp.lesson_id
       WHERE lp.user_id = ? AND cl.course_id = ? AND lp.completed = 1`
    ).bind(userId, course.id).all();
    completedLessons = doneRows.length;
    for (const m of modulesWithQuiz) {
      const bestPercent = await bestQuizPercent(env, userId, m.quiz_id);
      const passed = bestPercent != null && bestPercent >= (m.passing_score || 70);
      moduleStatus[m.id] = { best_score_percent: bestPercent, passing_score: m.passing_score, passed };
    }
  } else {
    for (const m of modulesWithQuiz) {
      moduleStatus[m.id] = { best_score_percent: null, passing_score: m.passing_score, passed: false };
    }
  }
  const modulesPassed = Object.values(moduleStatus).filter((s) => s.passed).length;
  const totalUnits = totalLessons + modulesWithQuiz.length;
  const completedUnits = completedLessons + modulesPassed;
  const percent = totalUnits > 0 ? Math.round(completedUnits / totalUnits * 100) : 0;
  const requiredPercent = course.passing_score ?? 70;
  const lessonsRequirementMet = percent >= requiredPercent;
  let finalExam = null;
  let finalExamPassed = true;
  if (course.final_exam_quiz_id) {
    const bestPercent = userId ? await bestQuizPercent(env, userId, course.final_exam_quiz_id) : null;
    finalExamPassed = bestPercent != null && bestPercent >= course.final_exam_passing_score;
    finalExam = {
      quiz_id: course.final_exam_quiz_id,
      passing_score: course.final_exam_passing_score,
      best_score_percent: bestPercent,
      passed: finalExamPassed,
      unlocked: lessonsRequirementMet
    };
  }
  const courseCompleted = lessonsRequirementMet && finalExamPassed;
  return {
    modules,
    module_status: moduleStatus,
    total_lessons: totalLessons,
    completed_lessons: completedLessons,
    progress_percent: percent,
    required_percent: requiredPercent,
    lessons_requirement_met: lessonsRequirementMet,
    final_exam: finalExam,
    course_completed: courseCompleted
  };
}
__name(getCourseProgress, "getCourseProgress");
async function syncCourseCompletion(env, userId, course) {
  const progress = await getCourseProgress(env, userId, course);
  const enrollment = await env.DB.prepare(
    "SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?"
  ).bind(userId, course.id).first();
  if (enrollment) {
    if (progress.course_completed && enrollment.status !== "completed") {
      await env.DB.prepare(
        "UPDATE course_enrollments SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
      ).bind(enrollment.id).run();
    } else if (!progress.course_completed && enrollment.status === "completed") {
      await env.DB.prepare(
        "UPDATE course_enrollments SET status = 'active', completed_at = NULL WHERE id = ?"
      ).bind(enrollment.id).run();
    }
  }
  let certificate = await env.DB.prepare(
    "SELECT code, issued_at FROM certificates WHERE user_id = ? AND course_id = ?"
  ).bind(userId, course.id).first();
  if (progress.course_completed && course.certificate_enabled && !certificate) {
    const code = randomCertCode();
    await env.DB.prepare(
      "INSERT INTO certificates (user_id, course_id, code) VALUES (?, ?, ?)"
    ).bind(userId, course.id, code).run();
    certificate = { code, issued_at: (/* @__PURE__ */ new Date()).toISOString() };
  }
  return { ...progress, certificate };
}
__name(syncCourseCompletion, "syncCourseCompletion");
async function syncCoursesForQuiz(env, userId, quizId) {
  const { results: courseRows } = await env.DB.prepare(
    `SELECT DISTINCT c.* FROM courses c
     LEFT JOIN course_modules m ON m.course_id = c.id AND m.quiz_id = ?
     WHERE c.final_exam_quiz_id = ? OR m.id IS NOT NULL`
  ).bind(quizId, quizId).all();
  const results = [];
  for (const course of courseRows) {
    const enrolled = await env.DB.prepare(
      "SELECT 1 FROM course_enrollments WHERE user_id = ? AND course_id = ?"
    ).bind(userId, course.id).first();
    if (!enrolled) continue;
    const progress = await syncCourseCompletion(env, userId, course);
    results.push({ course_id: course.id, course_title: course.title, course_slug: course.slug, ...progress });
  }
  return results;
}
__name(syncCoursesForQuiz, "syncCoursesForQuiz");

// src/handlers/quizzes.js
async function listQuizzes({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, subject, description, published, created_at FROM quizzes WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ quizzes: results });
}
__name(listQuizzes, "listQuizzes");
async function createQuiz({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !Array.isArray(body.questions) || body.questions.length === 0) {
    return badRequest("Title and at least one question are required.");
  }
  for (const q of body.questions) {
    if (!q.prompt || !Array.isArray(q.options) || typeof q.correct_index !== "number") {
      return badRequest("Each question needs a prompt, options[], and correct_index.");
    }
  }
  const result = await env.DB.prepare(
    `INSERT INTO quizzes (title, subject, description, questions, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    JSON.stringify(body.questions),
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createQuiz, "createQuiz");
async function getQuiz({ params, env }) {
  const quiz = await env.DB.prepare("SELECT * FROM quizzes WHERE id = ?").bind(params.id).first();
  if (!quiz) return notFound();
  quiz.questions = JSON.parse(quiz.questions);
  return json({ quiz });
}
__name(getQuiz, "getQuiz");
async function updateQuiz({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE quizzes SET title = ?, subject = ?, description = ?, questions = ?, published = ? WHERE id = ?`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    JSON.stringify(body.questions || []),
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(updateQuiz, "updateQuiz");
async function deleteQuiz({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM quizzes WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteQuiz, "deleteQuiz");
async function submitQuizAttempt({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const quiz = await env.DB.prepare("SELECT questions FROM quizzes WHERE id = ?").bind(params.id).first();
  if (!quiz) return notFound();
  const body = await request.json().catch(() => null);
  if (!body || !Array.isArray(body.answers)) return badRequest("answers[] is required.");
  const questions = JSON.parse(quiz.questions);
  let score = 0;
  questions.forEach((q, i) => {
    if (body.answers[i] === q.correct_index) score++;
  });
  await env.DB.prepare(
    "INSERT INTO quiz_attempts (user_id, quiz_id, score, total) VALUES (?, ?, ?, ?)"
  ).bind(user.id, params.id, score, questions.length).run();
  const courses = await syncCoursesForQuiz(env, user.id, Number(params.id));
  return json({ score, total: questions.length, courses }, { status: 201 });
}
__name(submitQuizAttempt, "submitQuizAttempt");

// src/handlers/blog.js
init_auth();
async function listPosts({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, slug, excerpt, cover_key, created_at FROM blog_posts WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ posts: results });
}
__name(listPosts, "listPosts");
async function createPost({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.content) return badRequest("Title and content are required.");
  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO blog_posts (title, slug, excerpt, content, cover_key, published, author_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    slug,
    body.excerpt || null,
    body.content,
    body.cover_key || null,
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(createPost, "createPost");
async function getPost({ params, env }) {
  const post = await env.DB.prepare("SELECT * FROM blog_posts WHERE slug = ?").bind(params.slug).first();
  if (!post) return notFound();
  return json({ post });
}
__name(getPost, "getPost");
async function updatePost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE blog_posts SET title = ?, excerpt = ?, content = ?, cover_key = ?, published = ? WHERE slug = ?`
  ).bind(
    body.title,
    body.excerpt || null,
    body.content,
    body.cover_key || null,
    body.published === false ? 0 : 1,
    params.slug
  ).run();
  return json({ ok: true });
}
__name(updatePost, "updatePost");
async function deletePost({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM blog_posts WHERE slug = ?").bind(params.slug).run();
  return json({ ok: true });
}
__name(deletePost, "deletePost");

// src/handlers/materials.js
init_auth();
async function listMaterials({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT id, title, subject, file_type, file_size, created_at FROM materials ORDER BY created_at DESC"
  ).all();
  return json({ materials: results });
}
__name(listMaterials, "listMaterials");
async function uploadMaterial({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const title = form?.get("title");
  if (!form || !file || typeof file === "string" || !title) {
    return badRequest("title and file are required (multipart/form-data).");
  }
  const allowed = ["application/pdf", "image/png", "image/jpeg", "image/webp", "image/gif"];
  if (!allowed.includes(file.type)) {
    return badRequest("Only PDF or image files (png/jpg/webp/gif) are allowed.");
  }
  const MAX_BYTES2 = 25 * 1024 * 1024;
  if (file.size > MAX_BYTES2) return badRequest("File is too large (25MB max).");
  const key = `materials/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  await env.MATERIALS.put(key, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });
  const fileType = file.type === "application/pdf" ? "pdf" : "image";
  const result = await env.DB.prepare(
    `INSERT INTO materials (title, subject, file_key, file_type, file_size, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(title, form.get("subject") || null, key, fileType, file.size, user.id).run();
  return json({ id: result.meta.last_row_id, file_key: key }, { status: 201 });
}
__name(uploadMaterial, "uploadMaterial");
async function getMaterial({ params, env }) {
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(params.id).first();
  if (!material) return notFound();
  const object = await env.MATERIALS.get(material.file_key);
  if (!object) return notFound("File missing from storage.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Content-Disposition", `inline; filename="${material.title}"`);
  return new Response(object.body, { headers });
}
__name(getMaterial, "getMaterial");
async function deleteMaterial({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const material = await env.DB.prepare("SELECT * FROM materials WHERE id = ?").bind(params.id).first();
  if (!material) return notFound();
  await env.MATERIALS.delete(material.file_key);
  await env.DB.prepare("DELETE FROM materials WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteMaterial, "deleteMaterial");

// src/handlers/courses.js
init_auth();
function canManage(user, course) {
  if (!user) return false;
  if (user.role === "admin") return true;
  return user.role === "teacher" && course.instructor_id === user.id;
}
__name(canManage, "canManage");
async function listCategories({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM course_categories ORDER BY name ASC"
  ).all();
  return json({ categories: results });
}
__name(listCategories, "listCategories");
async function createCategory({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.name) return badRequest("name is required.");
  const slug = slugify(body.slug || body.name);
  const result = await env.DB.prepare(
    "INSERT INTO course_categories (name, slug, icon) VALUES (?, ?, ?)"
  ).bind(body.name, slug, body.icon || "fa-solid fa-book").run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(createCategory, "createCategory");
async function deleteCategory({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM course_categories WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteCategory, "deleteCategory");
function parseJsonArray(text) {
  try {
    const v = JSON.parse(text || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}
__name(parseJsonArray, "parseJsonArray");
async function listCourses({ request, env, url }) {
  const params = url.searchParams;
  const clauses = ["c.published = 1"];
  const binds = [];
  const category = params.get("category");
  if (category) {
    clauses.push("cat.slug = ?");
    binds.push(category);
  }
  const level = params.get("level");
  if (level && level !== "all") {
    clauses.push("c.level = ?");
    binds.push(level);
  }
  const instructor = params.get("instructor");
  if (instructor) {
    clauses.push("c.instructor_id = ?");
    binds.push(instructor);
  }
  const free = params.get("free");
  if (free === "true") clauses.push("c.is_free = 1");
  if (free === "false") clauses.push("c.is_free = 0");
  const q = params.get("q");
  if (q) {
    clauses.push("(c.title LIKE ? OR c.description LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`);
  }
  const sort = params.get("sort") === "title" ? "c.title ASC" : "c.created_at DESC";
  const { results } = await env.DB.prepare(
    `SELECT c.*, cat.name AS category_name, cat.slug AS category_slug,
            u.name AS instructor_name,
            (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS lesson_count,
            (SELECT COUNT(*) FROM course_enrollments WHERE course_id = c.id) AS enrolled_count
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.instructor_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY ${sort}`
  ).bind(...binds).all();
  return json({ courses: results.map((c) => ({ ...c, objectives: parseJsonArray(c.objectives), requirements: parseJsonArray(c.requirements) })) });
}
__name(listCourses, "listCourses");
async function createCourse({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin" && user.role !== "teacher") return forbidden("Admins or teachers only.");
  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest("title is required.");
  const instructorId = user.role === "teacher" ? user.id : body.instructor_id || user.id;
  const price = Number(body.price) || 0;
  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO courses (
      title, slug, description, thumbnail_url, category_id, instructor_id, level, age_range,
      language, objectives, requirements, price, is_free, certificate_enabled, passing_score,
      final_exam_quiz_id, final_exam_passing_score, published, created_by
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    slug,
    body.description || null,
    body.thumbnail_url || null,
    body.category_id || null,
    instructorId,
    body.level || "beginner",
    body.age_range || null,
    body.language || "English",
    JSON.stringify(Array.isArray(body.objectives) ? body.objectives : []),
    JSON.stringify(Array.isArray(body.requirements) ? body.requirements : []),
    price,
    price > 0 ? 0 : 1,
    body.certificate_enabled ? 1 : 0,
    Number(body.passing_score) || 70,
    body.final_exam_quiz_id || null,
    Number(body.final_exam_passing_score) || 70,
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(createCourse, "createCourse");
async function getCourse({ request, params, env }) {
  const key = params.id;
  const isNumeric = /^\d+$/.test(key);
  const course = await env.DB.prepare(
    `SELECT c.*, cat.name AS category_name, cat.slug AS category_slug, u.name AS instructor_name, u.avatar_key AS instructor_avatar_key
     FROM courses c
     LEFT JOIN course_categories cat ON cat.id = c.category_id
     LEFT JOIN users u ON u.id = c.instructor_id
     WHERE c.${isNumeric ? "id" : "slug"} = ?`
  ).bind(key).first();
  if (!course) return notFound();
  const user = await getSessionUser(request, env.DB);
  const isManager = user && (user.role === "admin" || user.role === "teacher" && course.instructor_id === user.id);
  if (!course.published && !isManager) return notFound();
  course.objectives = parseJsonArray(course.objectives);
  course.requirements = parseJsonArray(course.requirements);
  const { results: lessons } = await env.DB.prepare(
    "SELECT id, module_id, title, content_type, duration_seconds, sort_order, is_preview FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC"
  ).bind(course.id).all();
  let enrollment = null;
  let progress = null;
  if (user) {
    enrollment = await env.DB.prepare(
      "SELECT payment_status, status, enrolled_at, completed_at FROM course_enrollments WHERE user_id = ? AND course_id = ?"
    ).bind(user.id, course.id).first();
    if (enrollment) {
      const { results: done } = await env.DB.prepare(
        `SELECT lp.lesson_id FROM lesson_progress lp
         JOIN course_lessons cl ON cl.id = lp.lesson_id
         WHERE lp.user_id = ? AND cl.course_id = ? AND lp.completed = 1`
      ).bind(user.id, course.id).all();
      const completedIds = new Set(done.map((r) => r.lesson_id));
      lessons.forEach((l) => {
        l.completed = completedIds.has(l.id);
      });
      progress = await getCourseProgress(env, user.id, course);
    }
  }
  const { results: moduleRows } = await env.DB.prepare(
    "SELECT id, title, description, quiz_id, passing_score, sort_order FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC"
  ).bind(course.id).all();
  const modules = moduleRows.map((m) => ({
    ...m,
    lessons: lessons.filter((l) => l.module_id === m.id),
    quiz_status: progress?.module_status?.[m.id] || null
  }));
  const ungroupedLessons = lessons.filter((l) => !l.module_id);
  const reviewCount = 0;
  return json({
    course,
    lessons,
    modules,
    ungrouped_lessons: ungroupedLessons,
    enrollment,
    progress,
    review_count: reviewCount
  });
}
__name(getCourse, "getCourse");
async function updateCourse({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(params.id).first();
  if (!course) return notFound();
  if (!canManage(user, course)) return forbidden();
  const body = await request.json().catch(() => ({}));
  const price = body.price != null ? Number(body.price) : course.price;
  await env.DB.prepare(
    `UPDATE courses SET title = ?, description = ?, thumbnail_url = ?, category_id = ?, level = ?,
      age_range = ?, language = ?, objectives = ?, requirements = ?, price = ?, is_free = ?,
      certificate_enabled = ?, passing_score = ?, final_exam_quiz_id = ?, final_exam_passing_score = ?,
      published = ? WHERE id = ?`
  ).bind(
    body.title ?? course.title,
    body.description ?? course.description,
    body.thumbnail_url ?? course.thumbnail_url,
    body.category_id ?? course.category_id,
    body.level ?? course.level,
    body.age_range ?? course.age_range,
    body.language ?? course.language,
    JSON.stringify(Array.isArray(body.objectives) ? body.objectives : parseJsonArray(course.objectives)),
    JSON.stringify(Array.isArray(body.requirements) ? body.requirements : parseJsonArray(course.requirements)),
    price,
    price > 0 ? 0 : 1,
    body.certificate_enabled != null ? body.certificate_enabled ? 1 : 0 : course.certificate_enabled,
    body.passing_score != null ? Number(body.passing_score) : course.passing_score,
    body.final_exam_quiz_id !== void 0 ? body.final_exam_quiz_id : course.final_exam_quiz_id,
    body.final_exam_passing_score != null ? Number(body.final_exam_passing_score) : course.final_exam_passing_score,
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(updateCourse, "updateCourse");
async function deleteCourse({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(params.id).first();
  if (!course) return notFound();
  if (!canManage(user, course)) return forbidden();
  await env.DB.prepare("DELETE FROM courses WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteCourse, "deleteCourse");
async function enrollCourse({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(params.id).first();
  if (!course) return notFound();
  const existing = await env.DB.prepare(
    "SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?"
  ).bind(user.id, course.id).first();
  if (existing) return json({ enrollment: existing, already_enrolled: true });
  const paymentStatus = course.is_free ? "free" : "pending";
  await env.DB.prepare(
    "INSERT INTO course_enrollments (user_id, course_id, payment_status, status) VALUES (?, ?, ?, ?)"
  ).bind(user.id, course.id, paymentStatus, "active").run();
  return json({
    enrolled: true,
    payment_status: paymentStatus,
    message: paymentStatus === "pending" ? "Enrollment recorded \u2014 this is a paid course and payment collection isn't wired up yet. Contact us to confirm payment and unlock lessons." : "Enrolled! You can start learning right away."
  }, { status: 201 });
}
__name(enrollCourse, "enrollCourse");
async function myCourses({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.title, c.slug, c.thumbnail_url, c.level,
            e.payment_status, e.status, e.enrolled_at, e.completed_at,
            (SELECT COUNT(*) FROM course_lessons WHERE course_id = c.id) AS total_lessons,
            (SELECT COUNT(*) FROM lesson_progress lp JOIN course_lessons cl ON cl.id = lp.lesson_id
               WHERE lp.user_id = ? AND cl.course_id = c.id AND lp.completed = 1) AS completed_lessons,
            (SELECT code FROM certificates WHERE user_id = ? AND course_id = c.id) AS certificate_code
     FROM course_enrollments e
     JOIN courses c ON c.id = e.course_id
     WHERE e.user_id = ?
     ORDER BY e.enrolled_at DESC`
  ).bind(user.id, user.id, user.id).all();
  const courses = results.map((c) => ({
    ...c,
    progress_percent: c.total_lessons > 0 ? Math.round(c.completed_lessons / c.total_lessons * 100) : 0
  }));
  return json({ courses });
}
__name(myCourses, "myCourses");

// src/handlers/course-lessons.js
init_auth();
async function canManageCourse(env, user, courseId) {
  if (!user) return false;
  if (user.role === "admin") return true;
  if (user.role !== "teacher") return false;
  const course = await env.DB.prepare("SELECT instructor_id FROM courses WHERE id = ?").bind(courseId).first();
  return !!course && course.instructor_id === user.id;
}
__name(canManageCourse, "canManageCourse");
async function listLessons({ params, env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC"
  ).bind(params.id).all();
  return json({ lessons: results });
}
__name(listLessons, "listLessons");
async function createLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!await canManageCourse(env, user, params.id)) return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest("title is required.");
  const contentType = ["text", "video", "pdf", "quiz"].includes(body.content_type) ? body.content_type : "text";
  const { count } = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM course_lessons WHERE course_id = ?"
  ).bind(params.id).first();
  const result = await env.DB.prepare(
    `INSERT INTO course_lessons (course_id, module_id, title, content_type, video_id, material_id, quiz_id, body, duration_seconds, sort_order, is_preview)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    params.id,
    body.module_id || null,
    body.title,
    contentType,
    body.video_id || null,
    body.material_id || null,
    body.quiz_id || null,
    body.body || null,
    body.duration_seconds || null,
    Number.isFinite(body.sort_order) ? body.sort_order : count + 1,
    body.is_preview ? 1 : 0
  ).run();
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createLesson, "createLesson");
async function updateLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const lesson = await env.DB.prepare("SELECT * FROM course_lessons WHERE id = ?").bind(params.lessonId).first();
  if (!lesson) return notFound();
  if (!await canManageCourse(env, user, lesson.course_id)) return forbidden();
  const body = await request.json().catch(() => ({}));
  const contentType = ["text", "video", "pdf", "quiz"].includes(body.content_type) ? body.content_type : lesson.content_type;
  await env.DB.prepare(
    `UPDATE course_lessons SET module_id = ?, title = ?, content_type = ?, video_id = ?, material_id = ?, quiz_id = ?,
      body = ?, duration_seconds = ?, sort_order = ?, is_preview = ? WHERE id = ?`
  ).bind(
    body.module_id !== void 0 ? body.module_id : lesson.module_id,
    body.title ?? lesson.title,
    contentType,
    body.video_id ?? lesson.video_id,
    body.material_id ?? lesson.material_id,
    body.quiz_id ?? lesson.quiz_id,
    body.body ?? lesson.body,
    body.duration_seconds ?? lesson.duration_seconds,
    body.sort_order ?? lesson.sort_order,
    body.is_preview != null ? body.is_preview ? 1 : 0 : lesson.is_preview,
    params.lessonId
  ).run();
  return json({ ok: true });
}
__name(updateLesson, "updateLesson");
async function deleteLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const lesson = await env.DB.prepare("SELECT * FROM course_lessons WHERE id = ?").bind(params.lessonId).first();
  if (!lesson) return notFound();
  if (!await canManageCourse(env, user, lesson.course_id)) return forbidden();
  await env.DB.prepare("DELETE FROM course_lessons WHERE id = ?").bind(params.lessonId).run();
  return json({ ok: true });
}
__name(deleteLesson, "deleteLesson");
async function getLesson({ request, params, env }) {
  const lesson = await env.DB.prepare("SELECT * FROM course_lessons WHERE id = ?").bind(params.id).first();
  if (!lesson) return notFound();
  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(lesson.course_id).first();
  if (!course) return notFound();
  const user = await getSessionUser(request, env.DB);
  const manager = await canManageCourse(env, user, course.id);
  if (!lesson.is_preview && !manager) {
    if (!user) return unauthorized("Sign in and enroll to view this lesson.");
    const enrolled = await env.DB.prepare(
      "SELECT 1 FROM course_enrollments WHERE user_id = ? AND course_id = ? AND payment_status != 'pending'"
    ).bind(user.id, course.id).first();
    if (!enrolled) return forbidden("Enroll in this course to view this lesson.");
  }
  let video = null, material = null, quiz = null;
  if (lesson.video_id) video = await env.DB.prepare("SELECT id, title, external_url, file_key, source_type, thumbnail_url FROM videos WHERE id = ?").bind(lesson.video_id).first();
  if (lesson.material_id) material = await env.DB.prepare("SELECT id, title, file_key, file_type FROM materials WHERE id = ?").bind(lesson.material_id).first();
  if (lesson.quiz_id) {
    quiz = await env.DB.prepare("SELECT id, title, questions FROM quizzes WHERE id = ?").bind(lesson.quiz_id).first();
    if (quiz) {
      try {
        quiz.questions = JSON.parse(quiz.questions);
      } catch {
        quiz.questions = [];
      }
    }
  }
  const { results: siblings } = await env.DB.prepare(
    "SELECT id, title, sort_order FROM course_lessons WHERE course_id = ? ORDER BY sort_order ASC, id ASC"
  ).bind(course.id).all();
  const idx = siblings.findIndex((s) => s.id === lesson.id);
  const previous = idx > 0 ? siblings[idx - 1] : null;
  const next = idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1] : null;
  let completed = false;
  if (user) {
    const row = await env.DB.prepare(
      "SELECT completed FROM lesson_progress WHERE user_id = ? AND lesson_id = ?"
    ).bind(user.id, lesson.id).first();
    completed = !!row?.completed;
  }
  return json({
    lesson,
    video,
    material,
    quiz,
    completed,
    course: { id: course.id, title: course.title, slug: course.slug, certificate_enabled: !!course.certificate_enabled, passing_score: course.passing_score },
    previous,
    next,
    lesson_index: idx + 1,
    lesson_total: siblings.length
  });
}
__name(getLesson, "getLesson");
async function completeLesson({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const lesson = await env.DB.prepare("SELECT * FROM course_lessons WHERE id = ?").bind(params.id).first();
  if (!lesson) return notFound();
  const enrollment = await env.DB.prepare(
    "SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?"
  ).bind(user.id, lesson.course_id).first();
  if (!enrollment) return forbidden("Enroll in this course first.");
  const body = await request.json().catch(() => ({}));
  const completed = body.completed !== false;
  await env.DB.prepare(
    `INSERT INTO lesson_progress (user_id, lesson_id, completed, completed_at)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(user_id, lesson_id) DO UPDATE SET completed = excluded.completed, completed_at = excluded.completed_at`
  ).bind(user.id, lesson.id, completed ? 1 : 0, completed ? (/* @__PURE__ */ new Date()).toISOString() : null).run();
  const course = await env.DB.prepare("SELECT * FROM courses WHERE id = ?").bind(lesson.course_id).first();
  const progress = await syncCourseCompletion(env, user.id, course);
  return json({
    ok: true,
    completed,
    progress_percent: progress.progress_percent,
    completed_lessons: progress.completed_lessons,
    total_lessons: progress.total_lessons,
    required_percent: progress.required_percent,
    lessons_requirement_met: progress.lessons_requirement_met,
    final_exam: progress.final_exam,
    course_completed: progress.course_completed,
    certificate: progress.certificate
  });
}
__name(completeLesson, "completeLesson");

// src/handlers/course-modules.js
init_auth();
async function listModules({ params, env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC"
  ).bind(params.id).all();
  return json({ modules: results });
}
__name(listModules, "listModules");
async function createModule({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!await canManageCourse(env, user, params.id)) return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title) return badRequest("title is required.");
  const { count } = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM course_modules WHERE course_id = ?"
  ).bind(params.id).first();
  const result = await env.DB.prepare(
    `INSERT INTO course_modules (course_id, title, description, quiz_id, passing_score, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(
    params.id,
    body.title,
    body.description || null,
    body.quiz_id || null,
    Number.isFinite(body.passing_score) ? body.passing_score : 70,
    Number.isFinite(body.sort_order) ? body.sort_order : count + 1
  ).run();
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createModule, "createModule");
async function updateModule({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const module_ = await env.DB.prepare("SELECT * FROM course_modules WHERE id = ?").bind(params.moduleId).first();
  if (!module_) return notFound();
  if (!await canManageCourse(env, user, module_.course_id)) return forbidden();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE course_modules SET title = ?, description = ?, quiz_id = ?, passing_score = ?, sort_order = ? WHERE id = ?`
  ).bind(
    body.title ?? module_.title,
    body.description ?? module_.description,
    body.quiz_id !== void 0 ? body.quiz_id : module_.quiz_id,
    body.passing_score ?? module_.passing_score,
    body.sort_order ?? module_.sort_order,
    params.moduleId
  ).run();
  return json({ ok: true });
}
__name(updateModule, "updateModule");
async function deleteModule({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const module_ = await env.DB.prepare("SELECT * FROM course_modules WHERE id = ?").bind(params.moduleId).first();
  if (!module_) return notFound();
  if (!await canManageCourse(env, user, module_.course_id)) return forbidden();
  await env.DB.prepare("UPDATE course_lessons SET module_id = NULL WHERE module_id = ?").bind(params.moduleId).run();
  await env.DB.prepare("DELETE FROM course_modules WHERE id = ?").bind(params.moduleId).run();
  return json({ ok: true });
}
__name(deleteModule, "deleteModule");

// src/handlers/certificates.js
init_auth();
async function myCertificate({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const cert = await env.DB.prepare(
    `SELECT cert.code, cert.issued_at, c.title AS course_title, c.slug AS course_slug
     FROM certificates cert JOIN courses c ON c.id = cert.course_id
     WHERE cert.user_id = ? AND cert.course_id = ?`
  ).bind(user.id, params.id).first();
  if (!cert) return notFound("No certificate earned for this course yet.");
  return json({ certificate: { ...cert, learner_name: user.name } });
}
__name(myCertificate, "myCertificate");
async function myCertificates({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const { results } = await env.DB.prepare(
    `SELECT cert.code, cert.issued_at, c.id AS course_id, c.title AS course_title, c.slug AS course_slug, c.thumbnail_url
     FROM certificates cert JOIN courses c ON c.id = cert.course_id
     WHERE cert.user_id = ? ORDER BY cert.issued_at DESC`
  ).bind(user.id).all();
  return json({ certificates: results });
}
__name(myCertificates, "myCertificates");
async function verifyCertificate({ params, env }) {
  const cert = await env.DB.prepare(
    `SELECT cert.code, cert.issued_at, u.name AS learner_name, c.title AS course_title, c.slug AS course_slug
     FROM certificates cert
     JOIN users u ON u.id = cert.user_id
     JOIN courses c ON c.id = cert.course_id
     WHERE cert.code = ?`
  ).bind(params.code).first();
  if (!cert) return notFound("No certificate found with that code.");
  return json({ valid: true, certificate: cert });
}
__name(verifyCertificate, "verifyCertificate");

// src/handlers/videos.js
init_auth();
var MAX_VIDEO_BYTES = 100 * 1024 * 1024;
var ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/ogg"];
var ALLOWED_PLACEMENTS = ["videohub", "cartoons", "courses", "kids"];
function normalizePlacements(input) {
  const list = Array.isArray(input) ? input : String(input || "").split(",");
  const clean2 = [...new Set(list.map((p) => String(p).trim().toLowerCase()).filter((p) => ALLOWED_PLACEMENTS.includes(p)))];
  if (!clean2.length) clean2.push("videohub");
  return `,${clean2.join(",")},`;
}
__name(normalizePlacements, "normalizePlacements");
function withSrc(v) {
  return {
    ...v,
    src: v.source_type === "url" ? v.external_url : `/api/videos/${v.id}/stream`,
    placements: (v.placements || ",videohub,").split(",").filter(Boolean)
  };
}
__name(withSrc, "withSrc");
async function listVideos({ url, env }) {
  const placement = url.searchParams.get("placement");
  let query = `SELECT id, title, subject, description, source_type, external_url, thumbnail_url,
                      duration_seconds, placements, created_at
               FROM videos WHERE published = 1`;
  const binds = [];
  if (placement && ALLOWED_PLACEMENTS.includes(placement)) {
    query += " AND placements LIKE ?";
    binds.push(`%,${placement},%`);
  }
  query += " ORDER BY created_at DESC";
  const { results } = await env.DB.prepare(query).bind(...binds).all();
  return json({ videos: results.map(withSrc) });
}
__name(listVideos, "listVideos");
async function getVideo({ params, env }) {
  const video = await env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(params.id).first();
  if (!video) return notFound();
  return json({ video: withSrc(video) });
}
__name(getVideo, "getVideo");
async function createVideo({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData().catch(() => null);
    const file = form?.get("file");
    const title = form?.get("title");
    if (!form || !file || typeof file === "string" || !title) {
      return badRequest("title and file are required (multipart/form-data).");
    }
    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      return badRequest("Only MP4, WebM or OGG video files are allowed.");
    }
    if (file.size > MAX_VIDEO_BYTES) {
      return badRequest('File is too large (100MB max) \u2014 use "External URL" for bigger files.');
    }
    const key = `videos/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
    await env.MATERIALS.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type }
    });
    const result2 = await env.DB.prepare(
      `INSERT INTO videos (title, subject, description, source_type, file_key, thumbnail_url, placements, published, created_by)
       VALUES (?, ?, ?, 'file', ?, ?, ?, ?, ?)`
    ).bind(
      title,
      form.get("subject") || null,
      form.get("description") || null,
      key,
      form.get("thumbnail_url") || null,
      normalizePlacements(form.getAll("placements")),
      form.get("published") === "false" ? 0 : 1,
      user.id
    ).run();
    return json({ id: result2.meta.last_row_id }, { status: 201 });
  }
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !body.external_url) {
    return badRequest("title and external_url are required.");
  }
  try {
    new URL(body.external_url);
  } catch {
    return badRequest("external_url must be a valid URL.");
  }
  const result = await env.DB.prepare(
    `INSERT INTO videos (title, subject, description, source_type, external_url, thumbnail_url, placements, published, created_by)
     VALUES (?, ?, ?, 'url', ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    body.subject || null,
    body.description || null,
    body.external_url,
    body.thumbnail_url || null,
    normalizePlacements(body.placements),
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createVideo, "createVideo");
async function updateVideo({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const video = await env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(params.id).first();
  if (!video) return notFound();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE videos SET title = ?, subject = ?, description = ?, placements = ?, published = ? WHERE id = ?`
  ).bind(
    body.title ?? video.title,
    body.subject ?? video.subject,
    body.description ?? video.description,
    body.placements ? normalizePlacements(body.placements) : video.placements,
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(updateVideo, "updateVideo");
async function deleteVideo({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const video = await env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(params.id).first();
  if (!video) return notFound();
  if (video.source_type === "file" && video.file_key) {
    await env.MATERIALS.delete(video.file_key);
  }
  await env.DB.prepare("DELETE FROM videos WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteVideo, "deleteVideo");
async function streamVideo({ request, params, env }) {
  const video = await env.DB.prepare("SELECT * FROM videos WHERE id = ?").bind(params.id).first();
  if (!video || video.source_type !== "file" || !video.file_key) return notFound();
  const rangeHeader = request.headers.get("Range");
  const range = rangeHeader ? parseRange(rangeHeader) : void 0;
  const object = await env.MATERIALS.get(video.file_key, range ? { range } : void 0);
  if (!object) return notFound("File missing from storage.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Accept-Ranges", "bytes");
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  if (range && object.range) {
    const { offset, length } = object.range;
    headers.set("Content-Range", `bytes ${offset}-${offset + length - 1}/${object.size}`);
    return new Response(object.body, { status: 206, headers });
  }
  return new Response(object.body, { headers });
}
__name(streamVideo, "streamVideo");
var COMPLETION_RATIO = 0.92;
async function getProgress({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const row = await env.DB.prepare(
    "SELECT position_seconds, completed, updated_at FROM video_progress WHERE user_id = ? AND video_id = ?"
  ).bind(user.id, params.id).first();
  return json({
    position_seconds: row ? row.position_seconds : 0,
    completed: row ? !!row.completed : false
  });
}
__name(getProgress, "getProgress");
async function saveProgress({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const video = await env.DB.prepare("SELECT duration_seconds FROM videos WHERE id = ?").bind(params.id).first();
  if (!video) return notFound();
  const body = await request.json().catch(() => null);
  const position = Number(body?.position_seconds);
  if (!Number.isFinite(position) || position < 0) return badRequest("A non-negative position_seconds is required.");
  const duration = Number(video.duration_seconds) || 0;
  const completed = duration > 0 && position >= duration * COMPLETION_RATIO ? 1 : 0;
  await env.DB.prepare(
    `INSERT INTO video_progress (user_id, video_id, position_seconds, completed, updated_at)
     VALUES (?, ?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, video_id) DO UPDATE SET
       position_seconds = excluded.position_seconds,
       completed = MAX(video_progress.completed, excluded.completed),
       updated_at = excluded.updated_at`
  ).bind(user.id, params.id, Math.floor(position), completed).run();
  return json({ ok: true, completed: !!completed });
}
__name(saveProgress, "saveProgress");
async function continueWatching({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const { results } = await env.DB.prepare(
    `SELECT v.id, v.title, v.subject, v.thumbnail_url, v.duration_seconds,
            p.position_seconds, p.updated_at
     FROM video_progress p
     JOIN videos v ON v.id = p.video_id
     WHERE p.user_id = ? AND p.completed = 0 AND v.published = 1
     ORDER BY p.updated_at DESC
     LIMIT 8`
  ).bind(user.id).all();
  return json({ videos: results });
}
__name(continueWatching, "continueWatching");
function parseRange(rangeHeader) {
  const match = /bytes=(\d+)-(\d*)/.exec(rangeHeader);
  if (!match) return void 0;
  const start = Number(match[1]);
  const end = match[2] ? Number(match[2]) : void 0;
  return end !== void 0 ? { offset: start, length: end - start + 1 } : { offset: start };
}
__name(parseRange, "parseRange");

// src/handlers/books.js
init_auth();
function withPageCount(book) {
  let pageCount = 0;
  try {
    pageCount = JSON.parse(book.pages).length;
  } catch {
  }
  const { pages, ...rest } = book;
  return { ...rest, page_count: pageCount };
}
__name(withPageCount, "withPageCount");
async function listBooks({ env }) {
  const { results } = await env.DB.prepare(
    "SELECT * FROM books WHERE published = 1 ORDER BY created_at DESC"
  ).all();
  return json({ books: results.map(withPageCount) });
}
__name(listBooks, "listBooks");
async function createBook({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || !body.title || !Array.isArray(body.pages) || body.pages.length === 0) {
    return badRequest("Title and at least one page are required.");
  }
  for (const p of body.pages) {
    if (typeof p.text !== "string" || !p.text.trim()) {
      return badRequest('Each page needs at least a "text" field.');
    }
  }
  const slug = slugify(body.slug || body.title);
  const result = await env.DB.prepare(
    `INSERT INTO books (title, slug, subject, description, cover_url, pages, published, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    body.title,
    slug,
    body.subject || null,
    body.description || null,
    body.cover_url || null,
    JSON.stringify(body.pages),
    body.published === false ? 0 : 1,
    user.id
  ).run();
  return json({ id: result.meta.last_row_id, slug }, { status: 201 });
}
__name(createBook, "createBook");
async function getBook({ params, env }) {
  const key = params.id;
  const isNumeric = /^\d+$/.test(key);
  const book = await env.DB.prepare(
    isNumeric ? "SELECT * FROM books WHERE id = ?" : "SELECT * FROM books WHERE slug = ?"
  ).bind(key).first();
  if (!book) return notFound();
  book.pages = JSON.parse(book.pages);
  return json({ book });
}
__name(getBook, "getBook");
async function updateBook({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const book = await env.DB.prepare("SELECT * FROM books WHERE id = ?").bind(params.id).first();
  if (!book) return notFound();
  const body = await request.json().catch(() => ({}));
  await env.DB.prepare(
    `UPDATE books SET title = ?, subject = ?, description = ?, cover_url = ?, pages = ?, published = ? WHERE id = ?`
  ).bind(
    body.title ?? book.title,
    body.subject ?? book.subject,
    body.description ?? book.description,
    body.cover_url ?? book.cover_url,
    body.pages ? JSON.stringify(body.pages) : book.pages,
    body.published === false ? 0 : 1,
    params.id
  ).run();
  return json({ ok: true });
}
__name(updateBook, "updateBook");
async function deleteBook({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  await env.DB.prepare("DELETE FROM books WHERE id = ?").bind(params.id).run();
  return json({ ok: true });
}
__name(deleteBook, "deleteBook");
async function getProgress2({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const row = await env.DB.prepare(
    "SELECT page, updated_at FROM book_progress WHERE user_id = ? AND book_id = ?"
  ).bind(user.id, params.id).first();
  return json({ page: row ? row.page : null, updated_at: row ? row.updated_at : null });
}
__name(getProgress2, "getProgress");
async function saveProgress2({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const page = Number(body?.page);
  if (!Number.isFinite(page) || page < 0) return badRequest("A non-negative page number is required.");
  await env.DB.prepare(
    `INSERT INTO book_progress (user_id, book_id, page, updated_at) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(user_id, book_id) DO UPDATE SET page = excluded.page, updated_at = excluded.updated_at`
  ).bind(user.id, params.id, page).run();
  return json({ ok: true });
}
__name(saveProgress2, "saveProgress");

// src/handlers/users.js
init_auth();
var ALLOWED_ROLES2 = ["user", "teacher", "parent", "admin"];
async function listUsers({ request, env }) {
  const admin = await getSessionUser(request, env.DB);
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden();
  const { results } = await env.DB.prepare(
    "SELECT id, name, email, role, created_at FROM users ORDER BY created_at DESC"
  ).all();
  return json({ users: results });
}
__name(listUsers, "listUsers");
async function updateUserRole({ request, params, env }) {
  const admin = await getSessionUser(request, env.DB);
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden();
  const targetId = Number(params.id);
  if (targetId === admin.id) {
    return badRequest("You can't change your own role. Ask another admin to do it.");
  }
  const body = await request.json().catch(() => null);
  const role = String(body?.role || "").toLowerCase();
  if (!ALLOWED_ROLES2.includes(role)) {
    return badRequest(`role must be one of: ${ALLOWED_ROLES2.join(", ")}`);
  }
  const target = await env.DB.prepare("SELECT id FROM users WHERE id = ?").bind(targetId).first();
  if (!target) return notFound();
  await env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(role, targetId).run();
  return json({ ok: true });
}
__name(updateUserRole, "updateUserRole");

// src/handlers/dashboard.js
init_auth();
var XP_PER_LEVEL = 200;
var QUIZ_XP_BASE = 15;
var QUIZ_XP_ACCURACY_BONUS = 15;
var GAME_XP = 12;
function computeStreak(sortedDatesDesc) {
  if (!sortedDatesDesc.length) return 0;
  const oneDay = 24 * 60 * 60 * 1e3;
  const today = /* @__PURE__ */ new Date((/* @__PURE__ */ new Date()).toISOString().slice(0, 10) + "T00:00:00Z");
  const mostRecent = /* @__PURE__ */ new Date(sortedDatesDesc[0] + "T00:00:00Z");
  const gapFromToday = Math.round((today - mostRecent) / oneDay);
  if (gapFromToday > 1) return 0;
  let streak = 1;
  let cursor = mostRecent;
  for (let i = 1; i < sortedDatesDesc.length; i++) {
    const d = /* @__PURE__ */ new Date(sortedDatesDesc[i] + "T00:00:00Z");
    const gap = Math.round((cursor - d) / oneDay);
    if (gap === 1) {
      streak += 1;
      cursor = d;
    } else if (gap === 0) {
      continue;
    } else break;
  }
  return streak;
}
__name(computeStreak, "computeStreak");
async function getDashboard({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const [
    quizStats,
    gameStats,
    recentQuizzes,
    recentGameActivity,
    recentGameScores,
    quizAttemptsForXp,
    gamePlaysForXp,
    activityDates,
    mathBadge,
    scienceBadge,
    distinctGames
  ] = await Promise.all([
    env.DB.prepare(
      "SELECT COUNT(*) AS attempts, COALESCE(AVG(score * 1.0 / NULLIF(total, 0)), 0) AS avg_ratio FROM quiz_attempts WHERE user_id = ?"
    ).bind(user.id).first(),
    env.DB.prepare(
      "SELECT COUNT(*) AS plays, COALESCE(MAX(score), 0) AS best_score FROM game_scores WHERE user_id = ?"
    ).bind(user.id).first(),
    env.DB.prepare(
      `SELECT qa.score, qa.total, qa.completed_at, q.title
       FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? ORDER BY qa.completed_at DESC LIMIT 5`
    ).bind(user.id).all(),
    env.DB.prepare(
      "SELECT game_key AS title, score, played_at FROM game_activity WHERE user_id = ? ORDER BY played_at DESC LIMIT 5"
    ).bind(user.id).all(),
    env.DB.prepare(
      `SELECT gs.score, gs.played_at, g.title
       FROM game_scores gs JOIN games g ON g.id = gs.game_id
       WHERE gs.user_id = ? ORDER BY gs.played_at DESC LIMIT 5`
    ).bind(user.id).all(),
    // Every quiz attempt's score/total, for the XP formula.
    env.DB.prepare("SELECT score, total FROM quiz_attempts WHERE user_id = ?").bind(user.id).all(),
    // Count every logged game play (both the catalog games table and the
    // client-side mini-games activity log) for the XP formula.
    env.DB.prepare(
      `SELECT
         (SELECT COUNT(*) FROM game_scores WHERE user_id = ?) +
         (SELECT COUNT(*) FROM game_activity WHERE user_id = ?) AS plays`
    ).bind(user.id, user.id).first(),
    // Distinct activity dates (quizzes + both game logs), for the streak.
    env.DB.prepare(
      `SELECT DISTINCT date(d) AS day FROM (
         SELECT completed_at AS d FROM quiz_attempts WHERE user_id = ?
         UNION ALL SELECT played_at AS d FROM game_scores WHERE user_id = ?
         UNION ALL SELECT played_at AS d FROM game_activity WHERE user_id = ?
       ) ORDER BY day DESC`
    ).bind(user.id, user.id, user.id).all(),
    // Badge: passed (>=70%) at least one quiz tagged as a math subject.
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? AND qa.total > 0 AND (qa.score * 1.0 / qa.total) >= 0.7
         AND LOWER(COALESCE(q.subject, '')) LIKE '%math%'`
    ).bind(user.id).first(),
    // Badge: same, for a science-tagged quiz.
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM quiz_attempts qa JOIN quizzes q ON q.id = qa.quiz_id
       WHERE qa.user_id = ? AND qa.total > 0 AND (qa.score * 1.0 / qa.total) >= 0.7
         AND LOWER(COALESCE(q.subject, '')) LIKE '%science%'`
    ).bind(user.id).first(),
    // Badge: played at least 3 different games (variety, not just repeats).
    env.DB.prepare(
      `SELECT COUNT(*) AS n FROM (
         SELECT DISTINCT 'g' || game_id AS gkey FROM game_scores WHERE user_id = ?
         UNION SELECT DISTINCT 'a' || game_key AS gkey FROM game_activity WHERE user_id = ?
       )`
    ).bind(user.id, user.id).first()
  ]);
  let xp = 0;
  for (const attempt of quizAttemptsForXp.results) {
    const ratio = attempt.total > 0 ? attempt.score / attempt.total : 0;
    xp += QUIZ_XP_BASE + Math.round(ratio * QUIZ_XP_ACCURACY_BONUS);
  }
  xp += (gamePlaysForXp.plays || 0) * GAME_XP;
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const xpIntoLevel = xp % XP_PER_LEVEL;
  const streakDays = computeStreak(activityDates.results.map((r) => r.day));
  const quizAttempts = quizStats.attempts || 0;
  const badges = {
    math_master: mathBadge.n > 0,
    science_star: scienceBadge.n > 0,
    quiz_champion: quizAttempts >= 10,
    streak_7: streakDays >= 7,
    explorer: distinctGames.n >= 3,
    // Not tracked by the backend yet — always locked until a reading /
    // coding / creative-work activity log exists.
    book_explorer: false,
    coding_hero: false,
    creative_star: false
  };
  const earnedBadges = Object.keys(badges).filter((k) => badges[k]);
  return json({
    user,
    quiz_attempts: quizAttempts,
    quiz_avg_percent: Math.round((quizStats.avg_ratio || 0) * 100),
    games_played: gameStats.plays,
    best_game_score: gameStats.best_score,
    recent_quizzes: recentQuizzes.results,
    recent_games: [...recentGameActivity.results, ...recentGameScores.results],
    xp,
    level,
    xp_into_level: xpIntoLevel,
    xp_per_level: XP_PER_LEVEL,
    streak_days: streakDays,
    badges,
    earned_badges: earnedBadges,
    badge_total: Object.keys(badges).length
  });
}
__name(getDashboard, "getDashboard");

// src/handlers/newsletter.js
init_auth();
async function subscribe({ request, env }) {
  const body = await request.json().catch(() => null);
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return badRequest("A valid email address is required.");
  }
  await env.DB.prepare(
    "INSERT OR IGNORE INTO newsletter_subscribers (email) VALUES (?)"
  ).bind(email).run();
  return json({ subscribed: true });
}
__name(subscribe, "subscribe");

// src/handlers/contact.js
init_auth();
async function sendMessage({ request, env }) {
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  const subject = typeof body?.subject === "string" ? body.subject.trim() : "";
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email) || !subject || !message) {
    return badRequest("Name, valid email, subject, and message are required.");
  }
  await env.DB.prepare(
    "INSERT INTO contact_messages (name, email, phone, subject, message) VALUES (?, ?, ?, ?, ?)"
  ).bind(name, email, body.phone?.trim() || null, subject, message).run();
  return json({ sent: true }, { status: 201 });
}
__name(sendMessage, "sendMessage");
async function listMessages({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { results } = await env.DB.prepare(
    "SELECT id, name, email, phone, subject, message, status, created_at FROM contact_messages ORDER BY created_at DESC LIMIT 100"
  ).all();
  return json({ messages: results });
}
__name(listMessages, "listMessages");
async function listSubscribers({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();
  const { results } = await env.DB.prepare(
    "SELECT id, email, subscribed_at FROM newsletter_subscribers ORDER BY subscribed_at DESC LIMIT 1000"
  ).all();
  return json({ subscribers: results });
}
__name(listSubscribers, "listSubscribers");

// src/handlers/search.js
init_auth();
async function search({ url, env }) {
  const query = (url.searchParams.get("q") || "").trim();
  if (query.length < 2) return badRequest("Search query must contain at least 2 characters.");
  const pattern = `%${query.replace(/[\\%_]/g, "\\$&")}%`;
  const [games, quizzes, posts, materials] = await Promise.all([
    env.DB.prepare("SELECT id, title, subject AS detail, 'Game' AS type FROM games WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT id, title, subject AS detail, 'Quiz' AS type FROM quizzes WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT slug AS id, title, excerpt AS detail, 'Blog' AS type FROM blog_posts WHERE published = 1 AND (title LIKE ? ESCAPE '\\' OR excerpt LIKE ? ESCAPE '\\') LIMIT 8").bind(pattern, pattern).all(),
    env.DB.prepare("SELECT id, title, subject AS detail, 'Material' AS type FROM materials WHERE title LIKE ? ESCAPE '\\' OR subject LIKE ? ESCAPE '\\' LIMIT 8").bind(pattern, pattern).all()
  ]);
  const results = [
    ...games.results.map((item) => ({ ...item, href: `game.html?id=${item.id}` })),
    ...quizzes.results.map((item) => ({ ...item, href: `quiz.html?id=${item.id}` })),
    ...posts.results.map((item) => ({ ...item, href: `blog-post.html?slug=${encodeURIComponent(item.id)}` })),
    ...materials.results.map((item) => ({ ...item, href: `library.html?id=${item.id}` }))
  ];
  return json({ results });
}
__name(search, "search");

// src/handlers/assistant.js
init_auth();
var DEFAULT_MODEL = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
async function ask({ request, env }) {
  const body = await request.json().catch(() => null);
  const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
  if (!prompt || prompt.length > 1e3) return badRequest("A question up to 1,000 characters is required.");
  if (!env.AI || typeof env.AI.run !== "function") return json({ error: "AI service is not configured." }, { status: 503 });
  try {
    const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL, {
      messages: [
        { role: "system", content: "You are Smart21Brain Study Buddy. Give concise, age-appropriate educational help. Do not claim to replace a teacher." },
        { role: "user", content: prompt }
      ]
    });
    return json({ answer: result.response || "I could not generate an answer right now." });
  } catch (err) {
    return json({ error: "The assistant is temporarily unavailable. Please try again in a moment." }, { status: 502 });
  }
}
__name(ask, "ask");

// src/handlers/account.js
init_auth();
var AVATAR_TYPES2 = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };
var MAX_AVATAR_BYTES2 = 5 * 1024 * 1024;
async function currentUser(request, env) {
  return getSessionUser(request, env.DB);
}
__name(currentUser, "currentUser");
async function updateProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const name = typeof body?.name === "string" ? body.name.trim() : "";
  const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!name || !/^\S+@\S+\.\S+$/.test(email)) return badRequest("Name and a valid email are required.");
  const duplicate = await env.DB.prepare("SELECT id FROM users WHERE email = ? AND id != ?").bind(email, user.id).first();
  if (duplicate) return badRequest("That email address is already in use.");
  await env.DB.prepare("UPDATE users SET name = ?, email = ? WHERE id = ?").bind(name, email, user.id).run();
  return json({ user: { ...user, name, email } });
}
__name(updateProfile, "updateProfile");
async function updatePassword({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  if (!body?.currentPassword || typeof body.newPassword !== "string" || body.newPassword.length < 8) {
    return badRequest("Current password and a new password of at least 8 characters are required.");
  }
  const stored = await env.DB.prepare("SELECT password_hash, password_salt FROM users WHERE id = ?").bind(user.id).first();
  if (!stored || !await verifyPassword(body.currentPassword, stored.password_hash, stored.password_salt)) {
    return badRequest("Current password is incorrect.");
  }
  const { hash, salt } = await hashPassword(body.newPassword);
  await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, user.id).run();
  return json({ updated: true });
}
__name(updatePassword, "updatePassword");
async function getProfile({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  return json({ user });
}
__name(getProfile, "getProfile");
async function getAvatar({ params, env }) {
  const user = await env.DB.prepare("SELECT avatar_key FROM users WHERE id = ?").bind(params.id).first();
  if (!user || !user.avatar_key) return notFound();
  const object = await env.MATERIALS.get(user.avatar_key);
  if (!object) return notFound("Avatar file missing from storage.");
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "public, max-age=3600");
  return new Response(object.body, { headers });
}
__name(getAvatar, "getAvatar");
async function updateAvatar({ request, env }) {
  const user = await currentUser(request, env);
  if (!user) return unauthorized();
  const contentType = request.headers.get("Content-Type") || "";
  if (!contentType.includes("multipart/form-data")) {
    return badRequest('Expected multipart/form-data with an "avatar" file.');
  }
  const form = await request.formData().catch(() => null);
  const file = form?.get("avatar");
  if (!form || !file || typeof file === "string" || file.size === 0) {
    return badRequest("An image file is required.");
  }
  if (!AVATAR_TYPES2[file.type]) {
    return badRequest("Profile photo must be a PNG, JPG, WEBP or GIF image.");
  }
  if (file.size > MAX_AVATAR_BYTES2) {
    return badRequest("Profile photo is too large (5MB max).");
  }
  const previousKey = user.avatar_key;
  const newKey = `avatars/${user.id}-${crypto.randomUUID()}.${AVATAR_TYPES2[file.type]}`;
  await env.MATERIALS.put(newKey, await file.arrayBuffer(), {
    httpMetadata: { contentType: file.type }
  });
  await env.DB.prepare("UPDATE users SET avatar_key = ? WHERE id = ?").bind(newKey, user.id).run();
  if (previousKey) {
    await env.MATERIALS.delete(previousKey).catch(() => {
    });
  }
  return json({ user: { ...user, avatar_key: newKey } });
}
__name(updateAvatar, "updateAvatar");

// src/handlers/activity.js
init_auth();
async function submitGameScore2({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  const body = await request.json().catch(() => null);
  const gameKey = typeof body?.gameKey === "string" ? body.gameKey.trim().slice(0, 80) : "";
  const score = Number(body?.score);
  if (!gameKey || !Number.isFinite(score) || score < 0) return badRequest("A game key and non-negative score are required.");
  await env.DB.prepare(
    "INSERT INTO game_activity (user_id, game_key, score, details) VALUES (?, ?, ?, ?)"
  ).bind(user.id, gameKey, score, JSON.stringify(body.details || {})).run();
  return json({ recorded: true }, { status: 201 });
}
__name(submitGameScore2, "submitGameScore");

// src/handlers/google.js
init_auth();
var cachedKeys = null;
var cachedKeysExpires = 0;
function decodeBase64Url(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(value.length / 4) * 4, "=");
  const binary = atob(normalized);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
__name(decodeBase64Url, "decodeBase64Url");
async function googleClaims(token, clientId) {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const header = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[0])));
  const payload = JSON.parse(new TextDecoder().decode(decodeBase64Url(parts[1])));
  if (header.alg !== "RS256" || !header.kid || !payload.sub || payload.iss !== "https://accounts.google.com" || payload.aud !== clientId) return null;
  if (!payload.email || payload.email_verified !== true || payload.exp * 1e3 <= Date.now()) return null;
  if (!cachedKeys || cachedKeysExpires < Date.now()) {
    const response = await fetch("https://www.googleapis.com/oauth2/v3/certs");
    if (!response.ok) return null;
    cachedKeys = await response.json();
    cachedKeysExpires = Date.now() + 60 * 60 * 1e3;
  }
  const jwk = cachedKeys.keys.find((key) => key.kid === header.kid);
  if (!jwk) return null;
  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"]
  );
  const valid = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    cryptoKey,
    decodeBase64Url(parts[2]),
    new TextEncoder().encode(`${parts[0]}.${parts[1]}`)
  );
  return valid ? payload : null;
}
__name(googleClaims, "googleClaims");
async function config({ env }) {
  return json({ clientId: env.GOOGLE_CLIENT_ID || "" });
}
__name(config, "config");
async function signIn({ request, env }) {
  const body = await request.json().catch(() => null);
  const token = typeof body?.credential === "string" ? body.credential : "";
  const clientId = env.GOOGLE_CLIENT_ID || "";
  if (!token || !clientId) return badRequest("Google sign-in is not configured.");
  let claims;
  try {
    claims = await googleClaims(token, clientId);
  } catch (error) {
    claims = null;
  }
  if (!claims) return unauthorized("Google sign-in could not be verified.");
  let account = await env.DB.prepare(
    "SELECT user_id FROM oauth_accounts WHERE provider = ? AND provider_sub = ?"
  ).bind("google", claims.sub).first();
  let isNewUser = false;
  let user;
  if (account) {
    user = await env.DB.prepare("SELECT id, name, email, role, avatar_key FROM users WHERE id = ?").bind(account.user_id).first();
  } else {
    user = await env.DB.prepare("SELECT id, name, email, role, avatar_key FROM users WHERE email = ?").bind(claims.email.toLowerCase()).first();
    if (!user) {
      const randomPassword = crypto.randomUUID();
      const { hash, salt } = await hashPassword(randomPassword);
      const result = await env.DB.prepare(
        "INSERT INTO users (name, email, password_hash, password_salt, role, avatar_key) VALUES (?, ?, ?, ?, ?, ?)"
      ).bind(claims.name || claims.email.split("@")[0], claims.email.toLowerCase(), hash, salt, "user", claims.picture || null).run();
      user = { id: result.meta.last_row_id, name: claims.name || claims.email.split("@")[0], email: claims.email.toLowerCase(), role: "user", avatar_key: claims.picture || null };
      isNewUser = true;
    }
    await env.DB.prepare(
      "INSERT INTO oauth_accounts (user_id, provider, provider_sub) VALUES (?, ?, ?)"
    ).bind(user.id, "google", claims.sub).run();
  }
  const { token: sessionToken, expires } = await createSession(env.DB, user.id);
  await env.DB.prepare(
    "INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)"
  ).bind(user.id, request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null, request.headers.get("User-Agent") || null).run();
  return json({ user, isNewUser }, { headers: { "Set-Cookie": sessionCookie(sessionToken, expires) } });
}
__name(signIn, "signIn");

// src/handlers/stats.js
init_auth();
var VIDEO_LESSONS_PUBLISHED = 8;
var DIGITAL_BOOKS_PUBLISHED = 8;
async function getPublicStats({ env }) {
  const [{ learners }, { attempts }] = await Promise.all([
    env.DB.prepare("SELECT COUNT(*) AS learners FROM users WHERE role != 'admin'").first(),
    env.DB.prepare("SELECT COUNT(*) AS attempts FROM quiz_attempts").first()
  ]);
  return json({
    active_learners: learners || 0,
    video_lessons: VIDEO_LESSONS_PUBLISHED,
    digital_books: DIGITAL_BOOKS_PUBLISHED,
    quizzes_completed: attempts || 0
  });
}
__name(getPublicStats, "getPublicStats");

// src/handlers/settings.js
init_auth();
var KNOWN_KEYS = ["require_content_review", "allow_public_comments", "maintenance_mode"];
async function getSettings({ env }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM site_settings").all();
  const settings = {};
  for (const key of KNOWN_KEYS) settings[key] = false;
  for (const row of results) settings[row.key] = row.value === "true";
  return json({ settings });
}
__name(getSettings, "getSettings");
async function updateSettings({ request, env }) {
  const admin = await getSessionUser(request, env.DB);
  if (!admin) return unauthorized();
  if (admin.role !== "admin") return forbidden();
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("Expected a JSON object of settings.");
  const entries = Object.entries(body).filter(([key]) => KNOWN_KEYS.includes(key));
  if (entries.length === 0) {
    return badRequest(`No recognized settings in request. Known keys: ${KNOWN_KEYS.join(", ")}`);
  }
  for (const [key, value] of entries) {
    await env.DB.prepare(
      "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, datetime('now')) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at"
    ).bind(key, value ? "true" : "false").run();
  }
  return json({ ok: true });
}
__name(updateSettings, "updateSettings");

// src/index.js
init_auth();

// src/handlers/stationery/business.js
init_auth();

// src/lib/stationery-auth.js
init_auth();
var ROLES = ["owner", "manager", "operator", "designer", "accountant"];
var PERMISSIONS = {
  manage_staff: ["owner", "manager"],
  manage_pricing: ["owner", "manager"],
  manage_business: ["owner"],
  manage_finance: ["owner", "manager", "accountant"],
  manage_inventory: ["owner", "manager", "operator"],
  view_reports: ["owner", "manager", "accountant"],
  manage_orders: ["owner", "manager", "operator", "designer"],
  manage_design: ["owner", "manager", "designer", "operator"],
  manage_backup: ["owner"]
};
function can(role, permission) {
  const allowed = PERMISSIONS[permission];
  return !allowed || allowed.includes(role);
}
__name(can, "can");
async function getStationeryContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: unauthorized() };
  const url = new URL(request.url);
  const requestedBusinessId = url.searchParams.get("business_id");
  let staff = null;
  if (requestedBusinessId) {
    staff = await env.DB.prepare(
      `SELECT s.*, b.name AS business_name, b.currency, b.receipt_note, b.phone AS business_phone, b.address AS business_address
       FROM stn_staff s JOIN stn_businesses b ON b.id = s.business_id
       WHERE s.user_id = ? AND s.business_id = ? AND s.active = 1`
    ).bind(user.id, requestedBusinessId).first();
  } else {
    staff = await env.DB.prepare(
      `SELECT s.*, b.name AS business_name, b.currency, b.receipt_note, b.phone AS business_phone, b.address AS business_address
       FROM stn_staff s JOIN stn_businesses b ON b.id = s.business_id
       WHERE s.user_id = ? AND s.active = 1 ORDER BY s.id ASC LIMIT 1`
    ).bind(user.id).first();
  }
  if (!staff) {
    const provisioned = await provisionBusiness(env, user);
    staff = provisioned;
  }
  const branch = await env.DB.prepare(
    "SELECT id FROM stn_branches WHERE business_id = ? ORDER BY is_main DESC, id ASC LIMIT 1"
  ).bind(staff.business_id).first();
  return {
    user,
    business: {
      id: staff.business_id,
      name: staff.business_name,
      currency: staff.currency,
      receipt_note: staff.receipt_note,
      phone: staff.business_phone,
      address: staff.business_address
    },
    role: staff.role,
    branchId: staff.branch_id || branch?.id || null
  };
}
__name(getStationeryContext, "getStationeryContext");
async function provisionBusiness(env, user) {
  const bizResult = await env.DB.prepare(
    `INSERT INTO stn_businesses (name, owner_user_id, currency) VALUES (?, ?, 'TZS')`
  ).bind(`${user.name || "My"}'s Stationery Shop`, user.id).run();
  const businessId = bizResult.meta.last_row_id;
  const branchResult = await env.DB.prepare(
    `INSERT INTO stn_branches (business_id, name, is_main) VALUES (?, 'Main Branch', 1)`
  ).bind(businessId).run();
  const branchId = branchResult.meta.last_row_id;
  await env.DB.prepare(
    `INSERT INTO stn_staff (business_id, branch_id, user_id, role) VALUES (?, ?, ?, 'owner')`
  ).bind(businessId, branchId, user.id).run();
  const defaultServices = [
    ["Photocopy Black & White", "Copying", "page", 100],
    ["Photocopy Colour", "Copying", "page", 500],
    ["Passport Photo", "Photo Studio", "set", 2e3],
    ["Scanning", "Digital", "page", 500],
    ["Lamination", "Finishing", "sheet", 1e3],
    ["Binding", "Finishing", "book", 2e3],
    ["Printing Black & White", "Printing", "page", 100],
    ["Printing Colour", "Printing", "page", 500]
  ];
  for (const [name, category, unit, price] of defaultServices) {
    await env.DB.prepare(
      `INSERT INTO stn_services (business_id, name, category, unit, unit_price) VALUES (?, ?, ?, ?, ?)`
    ).bind(businessId, name, category, unit, price).run();
  }
  const defaultInventory = [
    ["A4 Paper", "Paper", "ream", 20, 5, 8e3],
    ["A3 Paper", "Paper", "ream", 5, 2, 15e3],
    ["Photo Paper (Glossy)", "Paper", "pack", 10, 3, 12e3],
    ["Black Toner", "Ink/Toner", "cartridge", 2, 1, 6e4],
    ["Colour Toner Set", "Ink/Toner", "set", 1, 1, 15e4],
    ["Binding Covers (Clear)", "Finishing", "pcs", 50, 10, 300],
    ["Laminating Pouches A4", "Finishing", "pcs", 100, 20, 200]
  ];
  for (const [name, category, unit, qty, reorder, cost] of defaultInventory) {
    await env.DB.prepare(
      `INSERT INTO stn_inventory_items (business_id, branch_id, name, category, unit, quantity, reorder_level, cost_price)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(businessId, branchId, name, category, unit, qty, reorder, cost).run();
  }
  await logAudit(env, businessId, user.id, "business.provisioned", `${user.name} created a new stationery business`);
  return {
    business_id: businessId,
    branch_id: branchId,
    role: "owner",
    business_name: `${user.name || "My"}'s Stationery Shop`,
    currency: "TZS",
    receipt_note: "Asante kwa kutuchagua! / Thank you for your business!",
    business_phone: null,
    business_address: null
  };
}
__name(provisionBusiness, "provisionBusiness");
async function requirePermission(ctx, permission) {
  if (!can(ctx.role, permission)) {
    return forbidden(`This action needs the ${PERMISSIONS[permission].join(" or ")} role.`);
  }
  return null;
}
__name(requirePermission, "requirePermission");
async function logAudit(env, businessId, userId, action, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO stn_audit_log (business_id, user_id, action, details) VALUES (?, ?, ?, ?)`
    ).bind(businessId, userId || null, action, details || null).run();
  } catch (e) {
  }
}
__name(logAudit, "logAudit");
async function notify(env, businessId, title, message, level = "info") {
  await env.DB.prepare(
    `INSERT INTO stn_notifications (business_id, title, message, level) VALUES (?, ?, ?, ?)`
  ).bind(businessId, title, message, level).run();
}
__name(notify, "notify");
async function nextOrderNo(env, businessId) {
  const { count } = await env.DB.prepare(
    "SELECT COUNT(*) AS count FROM stn_orders WHERE business_id = ?"
  ).bind(businessId).first();
  const seq = (count || 0) + 1;
  const y = (/* @__PURE__ */ new Date()).getFullYear();
  return `ORD-${y}-${String(seq).padStart(5, "0")}`;
}
__name(nextOrderNo, "nextOrderNo");

// src/handlers/stationery/business.js
async function getContext({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results: memberships } = await env.DB.prepare(
    `SELECT b.id, b.name, s.role FROM stn_staff s JOIN stn_businesses b ON b.id = s.business_id
     WHERE s.user_id = ? AND s.active = 1 ORDER BY b.id ASC`
  ).bind(ctx.user.id).all();
  return json({
    user: { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email },
    business: ctx.business,
    role: ctx.role,
    branch_id: ctx.branchId,
    memberships
  });
}
__name(getContext, "getContext");
async function updateBusiness({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_business");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");
  const { name, currency, phone, address, receipt_note } = body;
  await env.DB.prepare(
    `UPDATE stn_businesses SET
      name = COALESCE(?, name), currency = COALESCE(?, currency),
      phone = COALESCE(?, phone), address = COALESCE(?, address),
      receipt_note = COALESCE(?, receipt_note)
     WHERE id = ?`
  ).bind(name || null, currency || null, phone || null, address || null, receipt_note || null, ctx.business.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "business.updated", JSON.stringify(body));
  return json({ ok: true });
}
__name(updateBusiness, "updateBusiness");
async function listStaff({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.role, s.active, s.created_at, u.id AS user_id, u.name, u.email
     FROM stn_staff s JOIN users u ON u.id = s.user_id
     WHERE s.business_id = ? ORDER BY s.created_at ASC`
  ).bind(ctx.business.id).all();
  return json({ staff: results, roles: ROLES });
}
__name(listStaff, "listStaff");
async function addStaff({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_staff");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const email = String(body?.email || "").trim().toLowerCase();
  const role = String(body?.role || "").trim().toLowerCase();
  if (!email || !ROLES.includes(role)) {
    return badRequest(`email and a valid role (${ROLES.join(", ")}) are required.`);
  }
  const person = await env.DB.prepare("SELECT id, name, email FROM users WHERE email = ?").bind(email).first();
  if (!person) {
    return badRequest("No smart21brain account found for that email yet \u2014 ask them to register first, then add them here.");
  }
  const existing = await env.DB.prepare(
    "SELECT id FROM stn_staff WHERE business_id = ? AND user_id = ?"
  ).bind(ctx.business.id, person.id).first();
  if (existing) {
    await env.DB.prepare("UPDATE stn_staff SET role = ?, active = 1 WHERE id = ?").bind(role, existing.id).run();
  } else {
    await env.DB.prepare(
      "INSERT INTO stn_staff (business_id, branch_id, user_id, role) VALUES (?, ?, ?, ?)"
    ).bind(ctx.business.id, ctx.branchId, person.id, role).run();
  }
  await logAudit(env, ctx.business.id, ctx.user.id, "staff.added", `${person.email} as ${role}`);
  return json({ ok: true, staff: { user_id: person.id, name: person.name, email: person.email, role } }, { status: 201 });
}
__name(addStaff, "addStaff");
async function updateStaffRole({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_staff");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const role = String(body?.role || "").trim().toLowerCase();
  const active = body?.active;
  if (role && !ROLES.includes(role)) return badRequest(`role must be one of: ${ROLES.join(", ")}`);
  const staff = await env.DB.prepare("SELECT * FROM stn_staff WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!staff) return notFound();
  if (staff.role === "owner" && staff.user_id !== ctx.user.id) {
    return badRequest("The owner's role can't be changed here.");
  }
  await env.DB.prepare(
    "UPDATE stn_staff SET role = COALESCE(?, role), active = COALESCE(?, active) WHERE id = ?"
  ).bind(role || null, typeof active === "boolean" ? active ? 1 : 0 : null, staff.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "staff.updated", `staff #${staff.id} -> ${role || staff.role}`);
  return json({ ok: true });
}
__name(updateStaffRole, "updateStaffRole");

// src/handlers/stationery/customers.js
init_auth();
async function listCustomers({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const q = (url.searchParams.get("q") || "").trim();
  let stmt, binds;
  if (q) {
    stmt = `SELECT * FROM stn_customers WHERE business_id = ? AND (name LIKE ? OR phone LIKE ? OR email LIKE ?) ORDER BY created_at DESC LIMIT 200`;
    binds = [ctx.business.id, `%${q}%`, `%${q}%`, `%${q}%`];
  } else {
    stmt = `SELECT * FROM stn_customers WHERE business_id = ? ORDER BY created_at DESC LIMIT 200`;
    binds = [ctx.business.id];
  }
  const { results } = await env.DB.prepare(stmt).bind(...binds).all();
  return json({ customers: results });
}
__name(listCustomers, "listCustomers");
async function createCustomer({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return badRequest("Customer name is required.");
  const result = await env.DB.prepare(
    `INSERT INTO stn_customers (business_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, name, body.phone || null, body.email || null, body.notes || null).run();
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createCustomer, "createCustomer");
async function getCustomer({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const customer = await env.DB.prepare("SELECT * FROM stn_customers WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!customer) return notFound();
  const { results: orders } = await env.DB.prepare(
    `SELECT id, order_no, status, payment_status, total_amount, paid_amount, created_at
     FROM stn_orders WHERE customer_id = ? ORDER BY created_at DESC LIMIT 50`
  ).bind(customer.id).all();
  return json({ customer, orders });
}
__name(getCustomer, "getCustomer");
async function updateCustomer({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");
  const customer = await env.DB.prepare("SELECT id FROM stn_customers WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!customer) return notFound();
  await env.DB.prepare(
    `UPDATE stn_customers SET name = COALESCE(?, name), phone = COALESCE(?, phone),
      email = COALESCE(?, email), notes = COALESCE(?, notes) WHERE id = ?`
  ).bind(body.name || null, body.phone || null, body.email || null, body.notes || null, customer.id).run();
  return json({ ok: true });
}
__name(updateCustomer, "updateCustomer");
async function deleteCustomer({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const customer = await env.DB.prepare("SELECT id FROM stn_customers WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!customer) return notFound();
  await env.DB.prepare("DELETE FROM stn_customers WHERE id = ?").bind(customer.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "customer.deleted", `#${customer.id}`);
  return json({ ok: true });
}
__name(deleteCustomer, "deleteCustomer");

// src/handlers/stationery/services.js
init_auth();
async function listServices({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const activeOnly = url.searchParams.get("active") !== "0";
  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_services WHERE business_id = ? ${activeOnly ? "AND active = 1" : ""} ORDER BY category, name`
  ).bind(ctx.business.id).all();
  return json({ services: results });
}
__name(listServices, "listServices");
async function createService({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_pricing");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  const unit_price = Number(body?.unit_price);
  if (!name || !Number.isFinite(unit_price) || unit_price < 0) {
    return badRequest("name and a non-negative unit_price are required.");
  }
  const result = await env.DB.prepare(
    `INSERT INTO stn_services (business_id, name, category, unit, unit_price, cost_price, inventory_item_id, deduct_qty, active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)`
  ).bind(
    ctx.business.id,
    name,
    body.category || "Printing",
    body.unit || "unit",
    unit_price,
    Number(body.cost_price) || 0,
    body.inventory_item_id || null,
    Number(body.deduct_qty) || 0
  ).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "service.created", name);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createService, "createService");
async function updateService({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_pricing");
  if (denied) return denied;
  const service = await env.DB.prepare("SELECT id FROM stn_services WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!service) return notFound();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");
  await env.DB.prepare(
    `UPDATE stn_services SET
      name = COALESCE(?, name), category = COALESCE(?, category), unit = COALESCE(?, unit),
      unit_price = COALESCE(?, unit_price), cost_price = COALESCE(?, cost_price),
      inventory_item_id = ?, deduct_qty = COALESCE(?, deduct_qty),
      active = COALESCE(?, active)
     WHERE id = ?`
  ).bind(
    body.name || null,
    body.category || null,
    body.unit || null,
    body.unit_price !== void 0 ? Number(body.unit_price) : null,
    body.cost_price !== void 0 ? Number(body.cost_price) : null,
    body.inventory_item_id !== void 0 ? body.inventory_item_id : service.inventory_item_id,
    body.deduct_qty !== void 0 ? Number(body.deduct_qty) : null,
    typeof body.active === "boolean" ? body.active ? 1 : 0 : null,
    service.id
  ).run();
  return json({ ok: true });
}
__name(updateService, "updateService");
async function deleteService({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_pricing");
  if (denied) return denied;
  const service = await env.DB.prepare("SELECT id FROM stn_services WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!service) return notFound();
  await env.DB.prepare("UPDATE stn_services SET active = 0 WHERE id = ?").bind(service.id).run();
  return json({ ok: true });
}
__name(deleteService, "deleteService");

// src/handlers/stationery/inventory.js
init_auth();
async function listInventory({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const lowOnly = url.searchParams.get("low") === "1";
  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_inventory_items WHERE business_id = ?
     ${lowOnly ? "AND quantity <= reorder_level" : ""} ORDER BY category, name`
  ).bind(ctx.business.id).all();
  return json({ items: results });
}
__name(listInventory, "listInventory");
async function createItem({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_inventory");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return badRequest("Item name is required.");
  const result = await env.DB.prepare(
    `INSERT INTO stn_inventory_items (business_id, branch_id, name, category, unit, quantity, reorder_level, cost_price, barcode)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    ctx.business.id,
    ctx.branchId,
    name,
    body.category || "General",
    body.unit || "pcs",
    Number(body.quantity) || 0,
    Number(body.reorder_level) || 5,
    Number(body.cost_price) || 0,
    body.barcode || null
  ).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "inventory.created", name);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createItem, "createItem");
async function updateItem({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_inventory");
  if (denied) return denied;
  const item = await env.DB.prepare("SELECT id FROM stn_inventory_items WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!item) return notFound();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");
  await env.DB.prepare(
    `UPDATE stn_inventory_items SET
      name = COALESCE(?, name), category = COALESCE(?, category), unit = COALESCE(?, unit),
      reorder_level = COALESCE(?, reorder_level), cost_price = COALESCE(?, cost_price), barcode = COALESCE(?, barcode)
     WHERE id = ?`
  ).bind(
    body.name || null,
    body.category || null,
    body.unit || null,
    body.reorder_level !== void 0 ? Number(body.reorder_level) : null,
    body.cost_price !== void 0 ? Number(body.cost_price) : null,
    body.barcode || null,
    item.id
  ).run();
  return json({ ok: true });
}
__name(updateItem, "updateItem");
async function adjustStock({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_inventory");
  if (denied) return denied;
  const item = await env.DB.prepare("SELECT * FROM stn_inventory_items WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!item) return notFound();
  const body = await request.json().catch(() => null);
  const change = Number(body?.change_qty);
  if (!Number.isFinite(change) || change === 0) return badRequest("change_qty must be a non-zero number.");
  const reason = ["purchase", "adjustment", "waste"].includes(body?.reason) ? body.reason : "adjustment";
  const newQty = item.quantity + change;
  if (newQty < 0) return badRequest("That would take stock below zero.");
  await env.DB.batch([
    env.DB.prepare("UPDATE stn_inventory_items SET quantity = ? WHERE id = ?").bind(newQty, item.id),
    env.DB.prepare(
      `INSERT INTO stn_stock_movements (business_id, item_id, change_qty, reason, created_by) VALUES (?, ?, ?, ?, ?)`
    ).bind(ctx.business.id, item.id, change, reason, ctx.user.id)
  ]);
  if (newQty <= item.reorder_level) {
    await notify(env, ctx.business.id, "Low stock", `${item.name} is now at ${newQty} ${item.unit} (reorder level ${item.reorder_level}).`, "warning");
  }
  return json({ ok: true, quantity: newQty });
}
__name(adjustStock, "adjustStock");
async function stockHistory({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results } = await env.DB.prepare(
    `SELECT m.*, u.name AS created_by_name FROM stn_stock_movements m
     LEFT JOIN users u ON u.id = m.created_by
     WHERE m.item_id = ? AND m.business_id = ? ORDER BY m.created_at DESC LIMIT 100`
  ).bind(params.id, ctx.business.id).all();
  return json({ movements: results });
}
__name(stockHistory, "stockHistory");
async function deleteItem({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_inventory");
  if (denied) return denied;
  const item = await env.DB.prepare("SELECT id FROM stn_inventory_items WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!item) return notFound();
  await env.DB.prepare("DELETE FROM stn_inventory_items WHERE id = ?").bind(item.id).run();
  return json({ ok: true });
}
__name(deleteItem, "deleteItem");

// src/handlers/stationery/orders.js
init_auth();
var STATUSES = ["Received", "Processing", "Ready", "Completed", "Cancelled"];
var METHODS = ["mpesa", "tigopesa", "cash", "bank", "credit"];
async function listOrders({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const status = url.searchParams.get("status");
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const q = (url.searchParams.get("q") || "").trim();
  const clauses = ["o.business_id = ?"];
  const binds = [ctx.business.id];
  if (status && STATUSES.includes(status)) {
    clauses.push("o.status = ?");
    binds.push(status);
  }
  if (from) {
    clauses.push("date(o.created_at) >= date(?)");
    binds.push(from);
  }
  if (to) {
    clauses.push("date(o.created_at) <= date(?)");
    binds.push(to);
  }
  if (q) {
    clauses.push("(o.order_no LIKE ? OR c.name LIKE ? OR c.phone LIKE ?)");
    binds.push(`%${q}%`, `%${q}%`, `%${q}%`);
  }
  const { results } = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, u.name AS operator_name
     FROM stn_orders o
     LEFT JOIN stn_customers c ON c.id = o.customer_id
     LEFT JOIN users u ON u.id = o.operator_id
     WHERE ${clauses.join(" AND ")}
     ORDER BY o.created_at DESC LIMIT 200`
  ).bind(...binds).all();
  return json({ orders: results });
}
__name(listOrders, "listOrders");
async function getOrder({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const order = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone, c.email AS customer_email
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.id = ? AND o.business_id = ?`
  ).bind(params.id, ctx.business.id).first();
  if (!order) return notFound();
  const { results: items } = await env.DB.prepare(
    "SELECT * FROM stn_order_items WHERE order_id = ?"
  ).bind(order.id).all();
  const { results: payments } = await env.DB.prepare(
    "SELECT * FROM stn_payments WHERE order_id = ? ORDER BY created_at ASC"
  ).bind(order.id).all();
  return json({ order, items, payments, business: ctx.business });
}
__name(getOrder, "getOrder");
async function createOrder({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_orders");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items : [];
  if (!items.length) return badRequest("At least one order item is required.");
  let customerId = body.customer_id || null;
  if (!customerId && body.customer_name) {
    const created = await env.DB.prepare(
      "INSERT INTO stn_customers (business_id, name, phone) VALUES (?, ?, ?)"
    ).bind(ctx.business.id, body.customer_name.trim(), body.customer_phone || null).run();
    customerId = created.meta.last_row_id;
  }
  const resolvedItems = [];
  let subtotal = 0;
  for (const raw of items) {
    const qty = Number(raw.qty) || 1;
    let unitPrice = Number(raw.unit_price) || 0;
    let description = raw.description || "Item";
    let serviceId = raw.service_id || null;
    let inventoryItemId = null;
    let deductQty = 0;
    if (serviceId) {
      const service = await env.DB.prepare("SELECT * FROM stn_services WHERE id = ? AND business_id = ?").bind(serviceId, ctx.business.id).first();
      if (!service) return badRequest(`Service #${serviceId} not found.`);
      unitPrice = service.unit_price;
      description = raw.description || service.name;
      inventoryItemId = service.inventory_item_id;
      deductQty = service.deduct_qty;
    }
    const totalPrice = qty * unitPrice;
    subtotal += totalPrice;
    resolvedItems.push({ serviceId, description, qty, unitPrice, totalPrice, fileKey: raw.file_key || null, inventoryItemId, deductQty });
  }
  const discount = Number(body.discount) || 0;
  const total = Math.max(0, subtotal - discount);
  const orderNo = await nextOrderNo(env, ctx.business.id);
  const orderResult = await env.DB.prepare(
    `INSERT INTO stn_orders (business_id, branch_id, order_no, customer_id, operator_id, status, subtotal, discount, total_amount, notes, created_by)
     VALUES (?, ?, ?, ?, ?, 'Received', ?, ?, ?, ?, ?)`
  ).bind(
    ctx.business.id,
    ctx.branchId,
    orderNo,
    customerId,
    body.operator_id || ctx.user.id,
    subtotal,
    discount,
    total,
    body.notes || null,
    ctx.user.id
  ).run();
  const orderId = orderResult.meta.last_row_id;
  for (const it of resolvedItems) {
    await env.DB.prepare(
      `INSERT INTO stn_order_items (order_id, service_id, description, qty, unit_price, total_price, file_key)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).bind(orderId, it.serviceId, it.description, it.qty, it.unitPrice, it.totalPrice, it.fileKey).run();
    if (it.inventoryItemId && it.deductQty) {
      const amountToDeduct = it.qty * it.deductQty;
      const invItem = await env.DB.prepare("SELECT * FROM stn_inventory_items WHERE id = ?").bind(it.inventoryItemId).first();
      if (invItem) {
        const newQty = Math.max(0, invItem.quantity - amountToDeduct);
        await env.DB.prepare("UPDATE stn_inventory_items SET quantity = ? WHERE id = ?").bind(newQty, invItem.id).run();
        await env.DB.prepare(
          `INSERT INTO stn_stock_movements (business_id, item_id, change_qty, reason, ref_order_id, created_by)
           VALUES (?, ?, ?, 'sale', ?, ?)`
        ).bind(ctx.business.id, invItem.id, -amountToDeduct, orderId, ctx.user.id).run();
        if (newQty <= invItem.reorder_level) {
          await notify(env, ctx.business.id, "Low stock", `${invItem.name} is now at ${newQty} ${invItem.unit}.`, "warning");
        }
      }
    }
  }
  if (body.payment && Number(body.payment.amount) > 0) {
    await recordPaymentInternal(env, ctx, orderId, Number(body.payment.amount), body.payment.method, body.payment.reference);
  }
  await logAudit(env, ctx.business.id, ctx.user.id, "order.created", orderNo);
  return json({ id: orderId, order_no: orderNo, total_amount: total }, { status: 201 });
}
__name(createOrder, "createOrder");
async function updateOrderStatus({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_orders");
  if (denied) return denied;
  const order = await env.DB.prepare("SELECT * FROM stn_orders WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!order) return notFound();
  const body = await request.json().catch(() => null);
  const status = body?.status;
  if (!STATUSES.includes(status)) return badRequest(`status must be one of: ${STATUSES.join(", ")}`);
  await env.DB.prepare(
    `UPDATE stn_orders SET status = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(status, order.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "order.status", `${order.order_no} -> ${status}`);
  return json({ ok: true });
}
__name(updateOrderStatus, "updateOrderStatus");
async function recordPaymentInternal(env, ctx, orderId, amount, method, reference) {
  await env.DB.prepare(
    `INSERT INTO stn_payments (business_id, order_id, amount, method, reference, received_by) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, orderId, amount, METHODS.includes(method) ? method : "cash", reference || null, ctx.user.id).run();
  const order = await env.DB.prepare("SELECT total_amount, paid_amount FROM stn_orders WHERE id = ?").bind(orderId).first();
  const newPaid = order.paid_amount + amount;
  const paymentStatus = newPaid >= order.total_amount ? "Paid" : newPaid > 0 ? "Partial" : "Unpaid";
  await env.DB.prepare(
    `UPDATE stn_orders SET paid_amount = ?, payment_status = ?, payment_method = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(newPaid, paymentStatus, method || "cash", orderId).run();
  return { newPaid, paymentStatus };
}
__name(recordPaymentInternal, "recordPaymentInternal");
async function addPayment({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_orders");
  if (denied) return denied;
  const order = await env.DB.prepare("SELECT * FROM stn_orders WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!order) return notFound();
  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return badRequest("A positive amount is required.");
  const result = await recordPaymentInternal(env, ctx, order.id, amount, body.method, body.reference);
  await logAudit(env, ctx.business.id, ctx.user.id, "payment.recorded", `${order.order_no}: ${amount}`);
  return json({ ok: true, ...result }, { status: 201 });
}
__name(addPayment, "addPayment");
async function getReceipt({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const order = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.id = ? AND o.business_id = ?`
  ).bind(params.id, ctx.business.id).first();
  if (!order) return notFound();
  const { results: items } = await env.DB.prepare("SELECT * FROM stn_order_items WHERE order_id = ?").bind(order.id).all();
  const { results: payments } = await env.DB.prepare("SELECT * FROM stn_payments WHERE order_id = ?").bind(order.id).all();
  return json({ order, items, payments, business: ctx.business });
}
__name(getReceipt, "getReceipt");

// src/handlers/stationery/finance.js
init_auth();
async function listExpenses({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const clauses = ["business_id = ?"];
  const binds = [ctx.business.id];
  if (from) {
    clauses.push("date(created_at) >= date(?)");
    binds.push(from);
  }
  if (to) {
    clauses.push("date(created_at) <= date(?)");
    binds.push(to);
  }
  const { results } = await env.DB.prepare(
    `SELECT e.*, u.name AS created_by_name FROM stn_expenses e LEFT JOIN users u ON u.id = e.created_by
     WHERE ${clauses.join(" AND ")} ORDER BY e.created_at DESC LIMIT 300`
  ).bind(...binds).all();
  return json({ expenses: results });
}
__name(listExpenses, "listExpenses");
async function createExpense({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_finance");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const amount = Number(body?.amount);
  if (!Number.isFinite(amount) || amount <= 0) return badRequest("A positive amount is required.");
  const result = await env.DB.prepare(
    `INSERT INTO stn_expenses (business_id, branch_id, category, description, amount, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, ctx.branchId, body.category || "General", body.description || null, amount, ctx.user.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "expense.created", `${body.category || "General"}: ${amount}`);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createExpense, "createExpense");
async function deleteExpense({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_finance");
  if (denied) return denied;
  const expense = await env.DB.prepare("SELECT id FROM stn_expenses WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!expense) return notFound();
  await env.DB.prepare("DELETE FROM stn_expenses WHERE id = ?").bind(expense.id).run();
  return json({ ok: true });
}
__name(deleteExpense, "deleteExpense");
async function cashbook({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const from = url.searchParams.get("from") || "1970-01-01";
  const to = url.searchParams.get("to") || "2999-12-31";
  const { results: incoming } = await env.DB.prepare(
    `SELECT p.id, p.created_at, p.amount, p.method, o.order_no, c.name AS customer_name
     FROM stn_payments p JOIN stn_orders o ON o.id = p.order_id LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE p.business_id = ? AND date(p.created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).all();
  const { results: outgoing } = await env.DB.prepare(
    `SELECT id, created_at, amount, category, description FROM stn_expenses
     WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).all();
  const entries = [
    ...incoming.map((p) => ({ type: "in", date: p.created_at, amount: p.amount, label: `${p.order_no} \u2014 ${p.customer_name || "Walk-in"} (${p.method})` })),
    ...outgoing.map((e) => ({ type: "out", date: e.created_at, amount: e.amount, label: `${e.category}${e.description ? ": " + e.description : ""}` }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));
  const totalIn = incoming.reduce((s, p) => s + p.amount, 0);
  const totalOut = outgoing.reduce((s, e) => s + e.amount, 0);
  return json({ entries, totalIn, totalOut, balance: totalIn - totalOut });
}
__name(cashbook, "cashbook");
async function debts({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results } = await env.DB.prepare(
    `SELECT o.id, o.order_no, o.total_amount, o.paid_amount, (o.total_amount - o.paid_amount) AS balance,
            c.name AS customer_name, c.phone AS customer_phone, o.created_at
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.business_id = ? AND o.payment_status IN ('Unpaid','Partial') AND o.status != 'Cancelled'
     ORDER BY o.created_at DESC`
  ).bind(ctx.business.id).all();
  const totalOwed = results.reduce((s, r) => s + r.balance, 0);
  return json({ debts: results, totalOwed });
}
__name(debts, "debts");
async function summary({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const from = url.searchParams.get("from") || "1970-01-01";
  const to = url.searchParams.get("to") || "2999-12-31";
  const income = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_payments WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).first();
  const expenseTotal = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_expenses WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?)`
  ).bind(ctx.business.id, from, to).first();
  const orderCount = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM stn_orders WHERE business_id = ? AND date(created_at) BETWEEN date(?) AND date(?) AND status != 'Cancelled'`
  ).bind(ctx.business.id, from, to).first();
  return json({
    income: income.total,
    expenses: expenseTotal.total,
    profit: income.total - expenseTotal.total,
    orders: orderCount.count
  });
}
__name(summary, "summary");

// src/handlers/stationery/dashboard.js
init_auth();
async function getDashboard2({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const bizId = ctx.business.id;
  const today = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS sales FROM stn_payments WHERE business_id = ? AND date(created_at) = date('now')`
  ).bind(bizId).first();
  const ordersToday = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM stn_orders WHERE business_id = ? AND date(created_at) = date('now') AND status != 'Cancelled'`
  ).bind(bizId).first();
  const expensesToday = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_expenses WHERE business_id = ? AND date(created_at) = date('now')`
  ).bind(bizId).first();
  const lowStock = await env.DB.prepare(
    `SELECT COUNT(*) AS count FROM stn_inventory_items WHERE business_id = ? AND quantity <= reorder_level`
  ).bind(bizId).first();
  const { results: last7 } = await env.DB.prepare(
    `SELECT date(created_at) AS day, COALESCE(SUM(amount),0) AS total
     FROM stn_payments WHERE business_id = ? AND date(created_at) >= date('now','-6 days')
     GROUP BY day ORDER BY day ASC`
  ).bind(bizId).all();
  const salesGraph = [];
  for (let i = 6; i >= 0; i--) {
    const day = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const found = last7.find((r) => r.day === day);
    salesGraph.push({ day, total: found ? found.total : 0 });
  }
  const { results: recentOrders } = await env.DB.prepare(
    `SELECT o.id, o.order_no, o.status, o.payment_status, o.total_amount, c.name AS customer_name, o.created_at
     FROM stn_orders o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE o.business_id = ? ORDER BY o.created_at DESC LIMIT 8`
  ).bind(bizId).all();
  const { results: lowStockItems } = await env.DB.prepare(
    `SELECT name, quantity, unit, reorder_level FROM stn_inventory_items WHERE business_id = ? AND quantity <= reorder_level LIMIT 5`
  ).bind(bizId).all();
  const stats = {
    sales_today: today.sales,
    orders_today: ordersToday.count,
    expenses_today: expensesToday.total,
    profit_today: today.sales - expensesToday.total,
    low_stock_count: lowStock.count,
    currency: ctx.business.currency,
    sales_graph: salesGraph,
    recent_orders: recentOrders,
    low_stock_items: lowStockItems
  };
  stats.ai_insight = await buildInsight(env, stats);
  return json(stats);
}
__name(getDashboard2, "getDashboard");
async function buildInsight(env, stats) {
  const fallback = stats.low_stock_count > 0 ? `Heads up: ${stats.low_stock_count} item(s) are low on stock \u2014 restock soon to avoid turning away jobs.` : stats.sales_today > 0 ? `Good pace today \u2014 ${stats.orders_today} order(s) and ${stats.sales_today.toLocaleString()} ${stats.currency} collected so far.` : `No sales recorded yet today \u2014 keep the counter staffed and check pending orders.`;
  if (!env.AI || typeof env.AI.run !== "function") return fallback;
  try {
    const prompt = `Business snapshot for today: sales=${stats.sales_today} ${stats.currency}, orders=${stats.orders_today}, expenses=${stats.expenses_today} ${stats.currency}, low-stock items=${stats.low_stock_count}. In one short, friendly sentence, give the shop owner a useful business insight or tip based on these numbers. No greeting, no markdown.`;
    const result = await env.AI.run(env.AI_MODEL || "@cf/meta/llama-3.3-70b-instruct-fp8-fast", {
      messages: [
        { role: "system", content: "You are Smart21brain AI, a concise business assistant for a stationery/printing shop." },
        { role: "user", content: prompt }
      ]
    });
    return (result?.response || "").trim() || fallback;
  } catch (e) {
    return fallback;
  }
}
__name(buildInsight, "buildInsight");

// src/handlers/stationery/reports.js
init_auth();
var RANGE_SQL = {
  daily: "date(created_at) = date('now')",
  weekly: "date(created_at) >= date('now','-6 days')",
  monthly: "strftime('%Y-%m', created_at) = strftime('%Y-%m','now')"
};
async function getReport({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const range = url.searchParams.get("range");
  const dateFilter = RANGE_SQL[range] || RANGE_SQL.daily;
  const bizId = ctx.business.id;
  const income = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_payments WHERE business_id = ? AND ${dateFilter}`
  ).bind(bizId).first();
  const expenses = await env.DB.prepare(
    `SELECT COALESCE(SUM(amount),0) AS total FROM stn_expenses WHERE business_id = ? AND ${dateFilter}`
  ).bind(bizId).first();
  const orders = await env.DB.prepare(
    `SELECT COUNT(*) AS count, COALESCE(SUM(total_amount),0) AS value FROM stn_orders
     WHERE business_id = ? AND status != 'Cancelled' AND ${dateFilter}`
  ).bind(bizId).first();
  const { results: topServices } = await env.DB.prepare(
    `SELECT oi.description, COUNT(*) AS times_sold, SUM(oi.qty) AS total_qty, SUM(oi.total_price) AS revenue
     FROM stn_order_items oi JOIN stn_orders o ON o.id = oi.order_id
     WHERE o.business_id = ? AND o.status != 'Cancelled' AND ${dateFilter.replace(/created_at/g, "o.created_at")}
     GROUP BY oi.description ORDER BY revenue DESC LIMIT 10`
  ).bind(bizId).all();
  const { results: byMethod } = await env.DB.prepare(
    `SELECT method, COALESCE(SUM(amount),0) AS total FROM stn_payments
     WHERE business_id = ? AND ${dateFilter} GROUP BY method`
  ).bind(bizId).all();
  const { results: byOperator } = await env.DB.prepare(
    `SELECT u.name AS operator_name, COUNT(*) AS orders_handled, COALESCE(SUM(o.total_amount),0) AS revenue
     FROM stn_orders o LEFT JOIN users u ON u.id = o.operator_id
     WHERE o.business_id = ? AND o.status != 'Cancelled' AND ${dateFilter}
     GROUP BY o.operator_id ORDER BY revenue DESC`
  ).bind(bizId).all();
  return json({
    range: range || "daily",
    income: income.total,
    expenses: expenses.total,
    profit: income.total - expenses.total,
    orders_count: orders.count,
    orders_value: orders.value,
    top_services: topServices,
    by_method: byMethod,
    by_operator: byOperator
  });
}
__name(getReport, "getReport");

// src/handlers/stationery/photostudio.js
init_auth();
async function listPresets({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_photo_presets WHERE business_id IS NULL OR business_id = ? ORDER BY country, name`
  ).bind(ctx.business.id).all();
  return json({ presets: results });
}
__name(listPresets, "listPresets");
async function createPreset({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_pricing");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const { country, name, width_mm, height_mm } = body || {};
  if (!country || !name || !Number(width_mm) || !Number(height_mm)) {
    return badRequest("country, name, width_mm and height_mm are required.");
  }
  const result = await env.DB.prepare(
    `INSERT INTO stn_photo_presets (business_id, country, name, width_mm, height_mm, dpi, face_min_pct, face_max_pct, bg_color, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    ctx.business.id,
    country,
    name,
    Number(width_mm),
    Number(height_mm),
    Number(body.dpi) || 300,
    Number(body.face_min_pct) || 50,
    Number(body.face_max_pct) || 69,
    body.bg_color || "#FFFFFF",
    body.notes || null
  ).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "preset.created", `${country} ${name}`);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createPreset, "createPreset");
async function deletePreset({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_pricing");
  if (denied) return denied;
  const preset = await env.DB.prepare("SELECT id FROM stn_photo_presets WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!preset) return notFound("Preset not found, or it is a global preset that cannot be deleted here.");
  await env.DB.prepare("DELETE FROM stn_photo_presets WHERE id = ?").bind(preset.id).run();
  return json({ ok: true });
}
__name(deletePreset, "deletePreset");

// src/handlers/stationery/files.js
init_auth();
var MAX_BYTES = 40 * 1024 * 1024;
var ALLOWED_PREFIXES = ["photostudio", "documents", "jobs", "logos"];
async function uploadFile({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  if (!env.STATIONERY_FILES) return json({ error: "Storage is not configured. Ask an admin to bind the STATIONERY_FILES R2 bucket." }, { status: 503 });
  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  const folder = ALLOWED_PREFIXES.includes(form?.get("folder")) ? form.get("folder") : "documents";
  if (!form || !file || typeof file === "string") return badRequest("file is required (multipart/form-data).");
  if (file.size > MAX_BYTES) return badRequest("File is too large (40MB max).");
  const key = `stationery/${ctx.business.id}/${folder}/${Date.now()}-${crypto.randomUUID()}-${file.name.replace(/[^\w.\-]/g, "_")}`;
  await env.STATIONERY_FILES.put(key, await file.arrayBuffer(), { httpMetadata: { contentType: file.type || "application/octet-stream" } });
  return json({ key, name: file.name, size: file.size, type: file.type }, { status: 201 });
}
__name(uploadFile, "uploadFile");
async function getFile({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();
  if (!env.STATIONERY_FILES) return notFound("Storage is not configured.");
  const key = params.key;
  if (!key.startsWith("stationery/")) return badRequest("Invalid file key.");
  const object = await env.STATIONERY_FILES.get(key);
  if (!object) return notFound();
  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("Cache-Control", "private, max-age=3600");
  return new Response(object.body, { headers });
}
__name(getFile, "getFile");
async function deleteFile({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  if (!env.STATIONERY_FILES) return json({ ok: true });
  const key = params.key;
  if (!key.startsWith(`stationery/${ctx.business.id}/`)) return badRequest("Invalid file key.");
  await env.STATIONERY_FILES.delete(key);
  return json({ ok: true });
}
__name(deleteFile, "deleteFile");

// src/handlers/stationery/onlineservices.js
init_auth();
var TYPES = ["TRA", "BRELA", "NIDA", "Passport", "Visa", "TIN"];
async function getTemplates({ env }) {
  const { results } = await env.DB.prepare("SELECT * FROM stn_service_templates").all();
  const templates = {};
  for (const row of results) templates[row.service_type] = JSON.parse(row.checklist);
  return json({ types: TYPES, templates });
}
__name(getTemplates, "getTemplates");
async function listRequests({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const status = url.searchParams.get("status");
  const clauses = ["o.business_id = ?"];
  const binds = [ctx.business.id];
  if (status) {
    clauses.push("o.status = ?");
    binds.push(status);
  }
  const { results } = await env.DB.prepare(
    `SELECT o.*, c.name AS customer_name, c.phone AS customer_phone
     FROM stn_online_services o LEFT JOIN stn_customers c ON c.id = o.customer_id
     WHERE ${clauses.join(" AND ")} ORDER BY o.created_at DESC`
  ).bind(...binds).all();
  return json({ requests: results.map((r) => ({ ...r, checklist: JSON.parse(r.checklist) })) });
}
__name(listRequests, "listRequests");
async function createRequest({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const body = await request.json().catch(() => null);
  const serviceType = body?.service_type;
  if (!TYPES.includes(serviceType)) return badRequest(`service_type must be one of: ${TYPES.join(", ")}`);
  let customerId = body.customer_id || null;
  if (!customerId && body.customer_name) {
    const created = await env.DB.prepare("INSERT INTO stn_customers (business_id, name, phone) VALUES (?, ?, ?)").bind(ctx.business.id, body.customer_name.trim(), body.customer_phone || null).run();
    customerId = created.meta.last_row_id;
  }
  let checklist = body.checklist;
  if (!Array.isArray(checklist)) {
    const template = await env.DB.prepare("SELECT checklist FROM stn_service_templates WHERE service_type = ?").bind(serviceType).first();
    const items = template ? JSON.parse(template.checklist) : [];
    checklist = items.map((label2) => ({ label: label2, done: false }));
  }
  const result = await env.DB.prepare(
    `INSERT INTO stn_online_services (business_id, customer_id, service_type, checklist, fee, notes, created_by)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.business.id, customerId, serviceType, JSON.stringify(checklist), Number(body.fee) || 0, body.notes || null, ctx.user.id).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "onlineservice.created", serviceType);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createRequest, "createRequest");
async function updateRequest({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const reqRow = await env.DB.prepare("SELECT * FROM stn_online_services WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!reqRow) return notFound();
  const body = await request.json().catch(() => null);
  if (!body) return badRequest("Invalid JSON body.");
  const checklist = Array.isArray(body.checklist) ? body.checklist : JSON.parse(reqRow.checklist);
  const status = body.status || reqRow.status;
  await env.DB.prepare(
    `UPDATE stn_online_services SET checklist = ?, status = ?, notes = COALESCE(?, notes), fee = COALESCE(?, fee), updated_at = datetime('now')
     WHERE id = ?`
  ).bind(JSON.stringify(checklist), status, body.notes || null, body.fee !== void 0 ? Number(body.fee) : null, reqRow.id).run();
  return json({ ok: true });
}
__name(updateRequest, "updateRequest");

// src/handlers/stationery/machines.js
init_auth();
async function listMachines({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_machines WHERE business_id IS NULL OR business_id = ? ORDER BY category, name`
  ).bind(ctx.business.id).all();
  return json({ machines: results.map((m) => ({ ...m, content: JSON.parse(m.content) })) });
}
__name(listMachines, "listMachines");
async function createMachine({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_business");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  const name = String(body?.name || "").trim();
  if (!name) return badRequest("Machine name is required.");
  const content = {
    parts: body.content?.parts || [],
    setup: body.content?.setup || [],
    operation: body.content?.operation || [],
    maintenance: body.content?.maintenance || [],
    troubleshooting: body.content?.troubleshooting || [],
    error_codes: body.content?.error_codes || {},
    safety: body.content?.safety || []
  };
  const result = await env.DB.prepare(
    `INSERT INTO stn_machines (business_id, name, category, content) VALUES (?, ?, ?, ?)`
  ).bind(ctx.business.id, name, body.category || "Printer", JSON.stringify(content)).run();
  await logAudit(env, ctx.business.id, ctx.user.id, "machine.created", name);
  return json({ id: result.meta.last_row_id }, { status: 201 });
}
__name(createMachine, "createMachine");
async function deleteMachine({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_business");
  if (denied) return denied;
  const machine = await env.DB.prepare("SELECT id FROM stn_machines WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).first();
  if (!machine) return notFound("Only shop-specific machines can be removed here.");
  await env.DB.prepare("DELETE FROM stn_machines WHERE id = ?").bind(machine.id).run();
  return json({ ok: true });
}
__name(deleteMachine, "deleteMachine");

// src/handlers/stationery/academy.js
init_auth();
async function listCourses2({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const { results: courses } = await env.DB.prepare("SELECT * FROM stn_courses ORDER BY category, title").all();
  const { results: progress } = await env.DB.prepare(
    "SELECT * FROM stn_course_progress WHERE user_id = ?"
  ).bind(ctx.user.id).all();
  const progressByCourse = Object.fromEntries(progress.map((p) => [p.course_id, {
    completed_modules: JSON.parse(p.completed_modules),
    quiz_scores: JSON.parse(p.quiz_scores),
    certificate_issued: !!p.certificate_issued
  }]));
  return json({
    courses: courses.map((c) => ({ ...c, modules: JSON.parse(c.modules) })),
    progress: progressByCourse
  });
}
__name(listCourses2, "listCourses");
async function getCourse2({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const course = await env.DB.prepare("SELECT * FROM stn_courses WHERE id = ?").bind(params.id).first();
  if (!course) return notFound();
  const progress = await env.DB.prepare(
    "SELECT * FROM stn_course_progress WHERE course_id = ? AND user_id = ?"
  ).bind(course.id, ctx.user.id).first();
  return json({
    course: { ...course, modules: JSON.parse(course.modules) },
    progress: progress ? {
      completed_modules: JSON.parse(progress.completed_modules),
      quiz_scores: JSON.parse(progress.quiz_scores),
      certificate_issued: !!progress.certificate_issued
    } : { completed_modules: [], quiz_scores: {}, certificate_issued: false }
  });
}
__name(getCourse2, "getCourse");
async function updateProgress({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const course = await env.DB.prepare("SELECT * FROM stn_courses WHERE id = ?").bind(params.id).first();
  if (!course) return notFound();
  const body = await request.json().catch(() => null);
  const moduleIndex = Number(body?.module_index);
  const modules = JSON.parse(course.modules);
  if (!Number.isInteger(moduleIndex) || moduleIndex < 0 || moduleIndex >= modules.length) {
    return badRequest("A valid module_index is required.");
  }
  let progress = await env.DB.prepare(
    "SELECT * FROM stn_course_progress WHERE course_id = ? AND user_id = ?"
  ).bind(course.id, ctx.user.id).first();
  const completedModules = new Set(progress ? JSON.parse(progress.completed_modules) : []);
  const quizScores = progress ? JSON.parse(progress.quiz_scores) : {};
  if (body.completed) completedModules.add(moduleIndex);
  if (typeof body.quiz_score === "number") quizScores[moduleIndex] = body.quiz_score;
  const certificateEligible = completedModules.size >= modules.length;
  if (progress) {
    await env.DB.prepare(
      `UPDATE stn_course_progress SET completed_modules = ?, quiz_scores = ?, certificate_issued = ?, updated_at = datetime('now') WHERE id = ?`
    ).bind(JSON.stringify([...completedModules]), JSON.stringify(quizScores), certificateEligible ? 1 : 0, progress.id).run();
  } else {
    await env.DB.prepare(
      `INSERT INTO stn_course_progress (course_id, user_id, completed_modules, quiz_scores, certificate_issued) VALUES (?, ?, ?, ?, ?)`
    ).bind(course.id, ctx.user.id, JSON.stringify([...completedModules]), JSON.stringify(quizScores), certificateEligible ? 1 : 0).run();
  }
  return json({ ok: true, certificate_issued: certificateEligible, completed_modules: [...completedModules] });
}
__name(updateProgress, "updateProgress");

// src/handlers/stationery/chopaai.js
init_auth();
var SYSTEM_BASE = `You are Smart21brain AI, the in-app assistant for a Tanzanian/East-African stationery, printing and photo-studio shop running on smart21brain Stationery OS. Be concise, practical and friendly. Reply in the same language the operator writes in (English or Kiswahili). Never claim to submit anything to a government system \u2014 you only guide the operator through paperwork.`;
var DEFAULT_MODEL2 = "@cf/meta/llama-3.3-70b-instruct-fp8-fast";
async function runModel(env, systemPrompt, userPrompt) {
  if (!env.AI || typeof env.AI.run !== "function") {
    return "AI service is not configured for this deployment yet \u2014 ask an admin to enable the Workers AI binding.";
  }
  try {
    const result = await env.AI.run(env.AI_MODEL || DEFAULT_MODEL2, {
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ]
    });
    return result?.response?.trim() || "I could not generate a useful answer just now \u2014 please try rephrasing.";
  } catch (err) {
    return "The assistant is temporarily unavailable \u2014 please try again in a moment.";
  }
}
__name(runModel, "runModel");
async function ask2({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const body = await request.json().catch(() => null);
  const mode = body?.mode || "general";
  const prompt = String(body?.prompt || "").trim();
  if (!prompt || prompt.length > 1500) return badRequest("A question up to 1,500 characters is required.");
  let systemPrompt = SYSTEM_BASE;
  if (mode === "machine" && body.machine_id) {
    const machine = await env.DB.prepare(
      "SELECT * FROM stn_machines WHERE id = ? AND (business_id IS NULL OR business_id = ?)"
    ).bind(body.machine_id, ctx.business.id).first();
    if (machine) {
      systemPrompt += `
The operator is troubleshooting this machine: ${machine.name} (${machine.category}). Reference manual: ${machine.content}. Give a short step-by-step fix, and mention safety warnings if relevant.`;
    }
  }
  if (mode === "photo") {
    const { results: presets } = await env.DB.prepare(
      "SELECT country, name, width_mm, height_mm, dpi, face_min_pct, face_max_pct FROM stn_photo_presets WHERE business_id IS NULL OR business_id = ?"
    ).bind(ctx.business.id).all();
    systemPrompt += `
Help the operator take a compliant passport/ID photo. Available print presets: ${JSON.stringify(presets)}. Give clear, ordered steps (pose, lighting, background, cropping) for the country they mention.`;
  }
  if (mode === "business") {
    const stats = await env.DB.prepare(
      `SELECT
        (SELECT COALESCE(SUM(amount),0) FROM stn_payments WHERE business_id = ? AND date(created_at) = date('now')) AS sales_today,
        (SELECT COALESCE(SUM(amount),0) FROM stn_expenses WHERE business_id = ? AND date(created_at) = date('now')) AS expenses_today,
        (SELECT COUNT(*) FROM stn_orders WHERE business_id = ? AND date(created_at) = date('now')) AS orders_today,
        (SELECT COUNT(*) FROM stn_inventory_items WHERE business_id = ? AND quantity <= reorder_level) AS low_stock`
    ).bind(ctx.business.id, ctx.business.id, ctx.business.id, ctx.business.id).first();
    systemPrompt += `
Today's real numbers for this shop: ${JSON.stringify(stats)} (currency ${ctx.business.currency}). Ground your business advice in these numbers.`;
  }
  if (mode === "sales_summary") {
    const week = await env.DB.prepare(
      `SELECT COALESCE(SUM(amount),0) AS total, COUNT(*) AS count FROM stn_payments WHERE business_id = ? AND date(created_at) >= date('now','-6 days')`
    ).bind(ctx.business.id).first();
    const { results: topServices } = await env.DB.prepare(
      `SELECT oi.description, SUM(oi.total_price) AS revenue FROM stn_order_items oi JOIN stn_orders o ON o.id = oi.order_id
       WHERE o.business_id = ? AND date(o.created_at) >= date('now','-6 days') GROUP BY oi.description ORDER BY revenue DESC LIMIT 5`
    ).bind(ctx.business.id).all();
    systemPrompt += `
Last 7 days: ${JSON.stringify(week)} ${ctx.business.currency}, top services: ${JSON.stringify(topServices)}. Write a short sales summary the owner can read in 10 seconds.`;
  }
  const answer = await runModel(env, systemPrompt, prompt);
  return json({ answer, mode });
}
__name(ask2, "ask");

// src/handlers/stationery/security.js
init_auth();
async function listNotifications({ request, env, url }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const unreadOnly = url.searchParams.get("unread") === "1";
  const { results } = await env.DB.prepare(
    `SELECT * FROM stn_notifications WHERE business_id = ? ${unreadOnly ? "AND is_read = 0" : ""} ORDER BY created_at DESC LIMIT 50`
  ).bind(ctx.business.id).all();
  return json({ notifications: results });
}
__name(listNotifications, "listNotifications");
async function markRead({ request, params, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  await env.DB.prepare("UPDATE stn_notifications SET is_read = 1 WHERE id = ? AND business_id = ?").bind(params.id, ctx.business.id).run();
  return json({ ok: true });
}
__name(markRead, "markRead");
async function markAllRead({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  await env.DB.prepare("UPDATE stn_notifications SET is_read = 1 WHERE business_id = ?").bind(ctx.business.id).run();
  return json({ ok: true });
}
__name(markAllRead, "markAllRead");
async function listAuditLog({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_backup");
  if (denied) return denied;
  const { results } = await env.DB.prepare(
    `SELECT a.*, u.name AS user_name FROM stn_audit_log a LEFT JOIN users u ON u.id = a.user_id
     WHERE a.business_id = ? ORDER BY a.created_at DESC LIMIT 300`
  ).bind(ctx.business.id).all();
  return json({ log: results });
}
__name(listAuditLog, "listAuditLog");
async function exportBackup({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_backup");
  if (denied) return denied;
  const bizId = ctx.business.id;
  const tables = [
    "stn_customers",
    "stn_services",
    "stn_inventory_items",
    "stn_orders",
    "stn_order_items",
    "stn_payments",
    "stn_expenses",
    "stn_online_services"
  ];
  const data = { business: ctx.business, exported_at: (/* @__PURE__ */ new Date()).toISOString() };
  for (const table of tables) {
    if (table === "stn_order_items") {
      const { results } = await env.DB.prepare(
        `SELECT oi.* FROM stn_order_items oi JOIN stn_orders o ON o.id = oi.order_id WHERE o.business_id = ?`
      ).bind(bizId).all();
      data[table] = results;
    } else {
      const { results } = await env.DB.prepare(`SELECT * FROM ${table} WHERE business_id = ?`).bind(bizId).all();
      data[table] = results;
    }
  }
  await logAudit(env, bizId, ctx.user.id, "backup.exported", `${tables.length} tables`);
  return json(data);
}
__name(exportBackup, "exportBackup");
async function restoreBackup({ request, env }) {
  const ctx = await getStationeryContext(request, env);
  if (ctx.error) return ctx.error;
  const denied = await requirePermission(ctx, "manage_backup");
  if (denied) return denied;
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") return badRequest("A decrypted backup JSON body is required.");
  let restoredCustomers = 0, restoredServices = 0, restoredInventory = 0;
  for (const c of body.stn_customers || []) {
    await env.DB.prepare("INSERT INTO stn_customers (business_id, name, phone, email, notes) VALUES (?, ?, ?, ?, ?)").bind(ctx.business.id, c.name, c.phone || null, c.email || null, c.notes || null).run();
    restoredCustomers++;
  }
  for (const s of body.stn_services || []) {
    await env.DB.prepare("INSERT INTO stn_services (business_id, name, category, unit, unit_price, cost_price) VALUES (?, ?, ?, ?, ?, ?)").bind(ctx.business.id, s.name, s.category, s.unit, s.unit_price, s.cost_price || 0).run();
    restoredServices++;
  }
  for (const i of body.stn_inventory_items || []) {
    await env.DB.prepare("INSERT INTO stn_inventory_items (business_id, branch_id, name, category, unit, quantity, reorder_level, cost_price) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(ctx.business.id, ctx.branchId, i.name, i.category, i.unit, i.quantity || 0, i.reorder_level || 5, i.cost_price || 0).run();
    restoredInventory++;
  }
  await logAudit(env, ctx.business.id, ctx.user.id, "backup.restored", `${restoredCustomers} customers, ${restoredServices} services, ${restoredInventory} inventory items`);
  return json({ ok: true, restoredCustomers, restoredServices, restoredInventory });
}
__name(restoreBackup, "restoreBackup");

// src/handlers/school/core.js
init_auth();
init_school_auth();

// src/lib/school-queries.js
init_school_calc();
function feeColumns(today = todayISO()) {
  const t = String(today).replace(/[^0-9-]/g, "");
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
__name(feeColumns, "feeColumns");
var ATTENDANCE_COLUMNS = `
    (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'present') AS att_present,
    (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'absent') AS att_absent,
    (SELECT COUNT(*) FROM sch_attendance a WHERE a.student_id = s.id AND a.status = 'late') AS att_late`;
function feeFromRow(row) {
  return feeStatusFromTotals(row.fee_total, row.fee_paid, row.fee_due);
}
__name(feeFromRow, "feeFromRow");
function attendanceFromRow(row) {
  return attendancePercent(row.att_present, row.att_absent, row.att_late);
}
__name(attendanceFromRow, "attendanceFromRow");
var PARENT_NAME_SQL = `(SELECT p.full_name FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id
   WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC, p.id LIMIT 1)`;
var PARENT_PHONE_SQL = `(SELECT p.phone FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id
   WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC, p.id LIMIT 1)`;
var SQL_FULL_NAME = `(s.first_name || ' ' || COALESCE(s.middle_name || ' ', '') || s.last_name)`;
function weekRange(dateStr) {
  const d = /* @__PURE__ */ new Date(dateStr + "T00:00:00Z");
  const day = (d.getUTCDay() + 6) % 7;
  const start = new Date(d.getTime() - day * 864e5);
  const end = new Date(start.getTime() + 6 * 864e5);
  return [start.toISOString().slice(0, 10), end.toISOString().slice(0, 10)];
}
__name(weekRange, "weekRange");
function monthRange(dateStr) {
  const [y, m] = dateStr.split("-").map(Number);
  const first = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
  return [first, last];
}
__name(monthRange, "monthRange");
var CLASS_ORDER = `CASE c.name WHEN 'Form One' THEN 1 WHEN 'Form Two' THEN 2 WHEN 'Form Three' THEN 3 WHEN 'Form Four' THEN 4 WHEN 'Form Five' THEN 5 WHEN 'Form Six' THEN 6
  WHEN 'Standard One' THEN 1 WHEN 'Standard Two' THEN 2 WHEN 'Standard Three' THEN 3 WHEN 'Standard Four' THEN 4 WHEN 'Standard Five' THEN 5 WHEN 'Standard Six' THEN 6 WHEN 'Standard Seven' THEN 7 ELSE 50 END`;

// src/handlers/school/core.js
function makeShort(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const stop = /* @__PURE__ */ new Set(["of", "the", "and", "school", "schools", "academy", "college", "centre", "center"]);
  let letters = words.filter((w) => !stop.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join("");
  if (letters.length < 2) letters = String(name).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  return (letters || "SCH").slice(0, 5);
}
__name(makeShort, "makeShort");
var STARTER_CLASSES = [
  ["Form One", "O-Level"],
  ["Form Two", "O-Level"],
  ["Form Three", "O-Level"],
  ["Form Four", "O-Level"],
  ["Form Five", "A-Level"],
  ["Form Six", "A-Level"]
];
var STARTER_SUBJECTS = [
  ["Mathematics", "MATH"],
  ["Physics", "PHY"],
  ["Chemistry", "CHEM"],
  ["Biology", "BIO"],
  ["English", "ENG"],
  ["Kiswahili", "KISW"],
  ["Geography", "GEO"],
  ["History", "HIST"],
  ["Computer Science", "CS"]
];
async function provisionSchool(env, user, info) {
  const name = info.name;
  const short = makeShort(name);
  const ins = await env.DB.prepare(
    `INSERT INTO sch_schools (name, short_name, admission_prefix, phone, email, address, owner_user_id, receipt_note)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    name,
    short,
    short,
    info.phone || null,
    info.email || null,
    info.address || null,
    user.id,
    "Thank you for your payment."
  ).run();
  const schoolId = ins.meta.last_row_id;
  const year = (/* @__PURE__ */ new Date()).getUTCFullYear();
  const y = await env.DB.prepare(
    `INSERT INTO sch_academic_years (school_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 1)`
  ).bind(schoolId, String(year), `${year}-01-01`, `${year}-12-31`).run();
  const yearId = y.meta.last_row_id;
  const stmts = [];
  ["Term 1", "Term 2"].forEach((t, i) => stmts.push(
    env.DB.prepare("INSERT INTO sch_terms (school_id, name, sort_order) VALUES (?, ?, ?)").bind(schoolId, t, i + 1)
  ));
  STARTER_CLASSES.forEach(([n2, level]) => stmts.push(
    env.DB.prepare(`INSERT INTO sch_classes (school_id, name, level, stream, academic_year_id, max_students) VALUES (?, ?, ?, '', ?, 40)`).bind(schoolId, n2, level, yearId)
  ));
  STARTER_SUBJECTS.forEach(([n2, code]) => stmts.push(
    env.DB.prepare("INSERT INTO sch_subjects (school_id, name, code) VALUES (?, ?, ?)").bind(schoolId, n2, code)
  ));
  stmts.push(env.DB.prepare("INSERT INTO sch_members (school_id, user_id, role) VALUES (?, ?, ?)").bind(schoolId, user.id, "admin"));
  for (const role of ["teacher", "receptionist"]) {
    for (const p of DEFAULT_ROLE_PERMISSIONS[role]) {
      stmts.push(env.DB.prepare("INSERT INTO sch_role_permissions (school_id, role, permission) VALUES (?, ?, ?)").bind(schoolId, role, p));
    }
  }
  await env.DB.batch(stmts);
  const { results: classes } = await env.DB.prepare("SELECT id FROM sch_classes WHERE school_id = ?").bind(schoolId).all();
  const { results: subjects } = await env.DB.prepare("SELECT id FROM sch_subjects WHERE school_id = ?").bind(schoolId).all();
  const links = [];
  for (const c of classes) for (const s of subjects) {
    links.push(env.DB.prepare("INSERT INTO sch_class_subjects (school_id, class_id, subject_id) VALUES (?, ?, ?)").bind(schoolId, c.id, s.id));
  }
  await env.DB.batch(links);
  await env.DB.batch([
    env.DB.prepare(`INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount) VALUES (?, ?, NULL, 'registration', 'Registration fee', 20000)`).bind(schoolId, yearId),
    env.DB.prepare(`INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount) VALUES (?, ?, NULL, 'tuition', 'Tuition fee', 300000)`).bind(schoolId, yearId),
    env.DB.prepare(`INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount) VALUES (?, ?, NULL, 'examination', 'Examination fee', 30000)`).bind(schoolId, yearId)
  ]);
  return schoolId;
}
__name(provisionSchool, "provisionSchool");
async function startSession(env, userId, remember) {
  const token = randomToken2(32);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expires).run();
  const cookie = `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` + (remember ? `; Expires=${new Date(expires).toUTCString()}` : "");
  return cookie;
}
__name(startSession, "startSession");
var clientIp = /* @__PURE__ */ __name((request) => request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null, "clientIp");
async function tooManyAttempts(env, email, ip) {
  const a = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sch_login_attempts WHERE success = 0 AND email = ? AND created_at > datetime('now','-15 minutes')`
  ).bind(email).first();
  if ((a?.n || 0) >= 8) return true;
  if (ip) {
    const b = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sch_login_attempts WHERE success = 0 AND ip = ? AND created_at > datetime('now','-15 minutes')`
    ).bind(ip).first();
    if ((b?.n || 0) >= 25) return true;
  }
  return false;
}
__name(tooManyAttempts, "tooManyAttempts");
async function registerSchool({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const schoolName = V.str(body.school_name, "School name", { required: true, max: 120, min: 2 });
    const name = V.str(body.name, "Your name", { required: true, max: 100 });
    const email = V.email(body.email, "Email", { required: true });
    const password = V.password(body.password);
    const phone = V.phone(body.phone, "Phone number");
    const ip = clientIp(request);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM sch_login_attempts WHERE ip = ? AND email = '(signup)' AND created_at > datetime('now','-1 hour')`
    ).bind(ip).first();
    if (ip && (recent?.n || 0) >= 10) fail(429, "Too many sign-ups from this connection. Please try again later.");
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (exists) fail(409, "An account with this email already exists. Please sign in instead, then create your school.");
    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare(
      "INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)"
    ).bind(name, email, hash, salt, "user").run();
    const user = { id: u.meta.last_row_id, name, email };
    const schoolId = await provisionSchool(env, user, { name: schoolName, phone, email });
    await env.DB.prepare(`INSERT INTO sch_login_attempts (email, ip, success) VALUES ('(signup)', ?, 1)`).bind(ip).run();
    const cookie = await startSession(env, user.id, true);
    const ctx = { school: { id: schoolId }, user };
    await audit(env, request, ctx, "school.create", "school", schoolId, `School "${schoolName}" created`);
    return json({ ok: true, school_id: schoolId }, { status: 201, headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(registerSchool, "registerSchool");
var createSchool = secure({ school: false }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const schoolName = V.str(body.school_name, "School name", { required: true, max: 120, min: 2 });
  const phone = V.phone(body.phone, "Phone number");
  const owned = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_schools WHERE owner_user_id = ?").bind(ctx.user.id).first();
  if ((owned?.n || 0) >= 5) fail(400, "You already own 5 schools. Please contact support for more.");
  const schoolId = await provisionSchool(env, ctx.user, { name: schoolName, phone, email: ctx.user.email });
  await audit(env, request, { school: { id: schoolId }, user: ctx.user }, "school.create", "school", schoolId, `School "${schoolName}" created`);
  return json({ ok: true, school_id: schoolId }, { status: 201 });
});
async function login2({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = V.str(body.email, "Email", { required: true, max: 160 }).toLowerCase();
    const password = String(body.password || "");
    if (!password) fail(400, "Password is required.");
    const ip = clientIp(request);
    if (await tooManyAttempts(env, email, ip)) {
      fail(429, 'Too many failed sign-in attempts. Please wait 15 minutes and try again, or use "Forgot password".');
    }
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    const ok = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;
    await env.DB.prepare("INSERT INTO sch_login_attempts (email, ip, success) VALUES (?, ?, ?)").bind(email, ip, ok ? 1 : 0).run();
    if (!ok) fail(401, "Incorrect email or password.");
    const cookie = await startSession(env, user.id, !!body.remember);
    await env.DB.prepare("INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)").bind(user.id, ip, request.headers.get("User-Agent") || null).run();
    const { results: ms } = await env.DB.prepare(
      "SELECT school_id, role FROM sch_members WHERE user_id = ? AND active = 1 ORDER BY id"
    ).bind(user.id).all();
    for (const m of ms) {
      await audit(env, request, { school: { id: m.school_id }, user }, "user.login", "user", user.id, `Signed in as ${m.role}`);
    }
    return json({ ok: true, has_school: ms.length > 0, role: ms[0] ? ms[0].role : null }, { headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(login2, "login");
async function logout2({ request, env }) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match[1]).run();
  return json({ ok: true }, { headers: { "Set-Cookie": "s21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } });
}
__name(logout2, "logout");
async function context({ request, env }) {
  try {
    const ctx = await getSchoolContext(request, env);
    if (ctx.error) return ctx.error;
    const { results: memberships } = await env.DB.prepare(
      `SELECT s.id, s.name, m.role FROM sch_members m JOIN sch_schools s ON s.id = m.school_id
       WHERE m.user_id = ? AND m.active = 1 ORDER BY m.id`
    ).bind(ctx.user.id).all();
    const user = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    if (!ctx.school) return json({ user, school: null, memberships });
    const [settings, year] = await Promise.all([getSettings2(env, ctx.school.id), currentYear(env, ctx.school.id).catch(() => null)]);
    return json({
      user,
      school: { ...ctx.school, logo_key: void 0, has_logo: !!ctx.school.logo_key },
      role: ctx.role,
      permissions: [...ctx.perms],
      teacher_id: ctx.teacherId,
      parent_id: ctx.parentId,
      memberships,
      settings: { payment_methods: settings.payment_methods, division_enabled: !!settings.division.enabled },
      current_year: year ? { id: year.id, name: year.name } : null
    });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(context, "context");
var lookups = secure({ parent: true }, async ({ env, ctx }) => {
  const sid = ctx.school.id;
  const q = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results), "q");
  const [years, terms, classes, subjects, teachers, settings] = await Promise.all([
    q("SELECT * FROM sch_academic_years WHERE school_id = ? ORDER BY name DESC", sid),
    q("SELECT * FROM sch_terms WHERE school_id = ? ORDER BY sort_order, id", sid),
    q(`SELECT c.id, c.name, c.stream, c.level, c.academic_year_id, c.max_students, c.status, c.teacher_id
       FROM sch_classes c WHERE c.school_id = ? ORDER BY ${CLASS_ORDER}, c.name, c.stream`, sid),
    q("SELECT id, name, code, status FROM sch_subjects WHERE school_id = ? ORDER BY name", sid),
    ctx.role === "parent" ? Promise.resolve([]) : q("SELECT id, full_name, employment_status FROM sch_teachers WHERE school_id = ? ORDER BY full_name", sid),
    getSettings2(env, sid)
  ]);
  return json({ years, terms, classes, subjects, teachers, payment_methods: settings.payment_methods, grading_scale: settings.grading_scale });
});
var getSchoolInfo = secure({ perm: "settings.manage" }, async ({ env, ctx }) => {
  const settings = await getSettings2(env, ctx.school.id);
  return json({ school: ctx.school, settings });
});
var updateSchoolInfo = secure({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "School name", { required: true, max: 120, min: 2 });
  const shortName = V.str(b.short_name, "Short name", { required: true, max: 8 }).toUpperCase();
  const prefix = V.str(b.admission_prefix, "Admission number prefix", { required: true, max: 8 }).toUpperCase();
  if (!/^[A-Z0-9]+$/.test(prefix)) fail(400, "Admission prefix can only contain letters and numbers.");
  const social = {};
  for (const k of ["facebook", "instagram", "x", "youtube", "tiktok"]) {
    const v = V.str(b.social && b.social[k], k, { max: 200 });
    if (v) social[k] = v;
  }
  await env.DB.prepare(
    `UPDATE sch_schools SET name = ?, short_name = ?, admission_prefix = ?, phone = ?, email = ?, address = ?, website = ?,
       social = ?, currency = ?, primary_color = COALESCE(?, primary_color), receipt_note = ? WHERE id = ?`
  ).bind(
    name,
    shortName,
    prefix,
    V.phone(b.phone, "Phone"),
    V.email(b.email, "Email"),
    V.str(b.address, "Address", { max: 300 }),
    V.str(b.website, "Website", { max: 200 }),
    JSON.stringify(social),
    V.str(b.currency, "Currency", { max: 6, required: true }).toUpperCase(),
    V.color(b.primary_color, "Brand colour"),
    V.str(b.receipt_note, "Receipt note", { max: 300 }),
    ctx.school.id
  ).run();
  await audit(env, request, ctx, "settings.school", "school", ctx.school.id, "School information updated");
  return json({ ok: true });
});
var uploadLogo = secure({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a logo image.");
  const key = await storeImage(env, form.get("logo"), `school/${ctx.school.id}/logo`);
  const old = ctx.school.logo_key;
  await env.DB.prepare("UPDATE sch_schools SET logo_key = ? WHERE id = ?").bind(key, ctx.school.id).run();
  if (old && env.MATERIALS) await env.MATERIALS.delete(old).catch(() => {
  });
  await audit(env, request, ctx, "settings.logo", "school", ctx.school.id, "Logo changed");
  return json({ ok: true });
});
async function publicLogo({ params, env }) {
  const s = await env.DB.prepare("SELECT logo_key FROM sch_schools WHERE id = ?").bind(params.id).first();
  if (!s || !s.logo_key) return new Response("Not found", { status: 404 });
  return imageResponse(env, s.logo_key);
}
__name(publicLogo, "publicLogo");
var saveSettings = secure({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const sid = ctx.school.id;
  if (b.payment_methods !== void 0) {
    if (!Array.isArray(b.payment_methods) || !b.payment_methods.length) fail(400, "Add at least one payment method.");
    const list = [...new Set(b.payment_methods.map((m) => V.str(m, "Payment method", { required: true, max: 40 })))];
    await saveSetting(env, sid, "payment_methods", list);
  }
  if (b.grading_scale !== void 0) {
    if (!Array.isArray(b.grading_scale) || b.grading_scale.length < 2) fail(400, "The grading scale needs at least two grades.");
    const scale = b.grading_scale.map((g) => ({
      min: V.num(g.min, "Minimum %", { required: true, min: 0, max: 100 }),
      grade: V.str(g.grade, "Grade", { required: true, max: 4 }),
      points: V.num(g.points, "Points", { required: true, min: 0, max: 20 }),
      remark: V.str(g.remark, "Remark", { max: 40 }) || ""
    })).sort((x, y) => y.min - x.min);
    if (scale[scale.length - 1].min !== 0) fail(400, "The lowest grade must start at 0%.");
    await saveSetting(env, sid, "grading_scale", scale);
  }
  if (b.division !== void 0) {
    const d = b.division || {};
    const bands = (d.bands || []).map((x) => ({ max: V.num(x.max, "Division points", { required: true, min: 0 }), name: V.str(x.name, "Division name", { required: true, max: 6 }) })).sort((x, y) => x.max - y.max);
    await saveSetting(env, sid, "division", {
      enabled: !!d.enabled,
      best_of: V.int(d.best_of, "Best subjects", { required: true, min: 1, max: 20 }),
      bands,
      fallback: V.str(d.fallback, "Fallback division", { max: 6 }) || "0"
    });
  }
  if (b.absence_alert_threshold !== void 0) {
    await saveSetting(env, sid, "absence_alert_threshold", V.int(b.absence_alert_threshold, "Absence alert", { required: true, min: 1, max: 31 }));
  }
  for (const k of ["receipt_footer", "receipt_prefix", "id_card_note"]) {
    if (b[k] !== void 0) {
      const val = V.str(b[k], k, { max: 300 }) || "";
      if (k === "receipt_prefix" && !/^[A-Za-z0-9]{1,8}$/.test(val)) fail(400, "Receipt prefix must be 1\u20138 letters or numbers.");
      await saveSetting(env, sid, k, k === "receipt_prefix" ? val.toUpperCase() : val);
    }
  }
  await audit(env, request, ctx, "settings.update", "settings", null, Object.keys(b).join(", "));
  return json({ ok: true, settings: await getSettings2(env, sid) });
});
var listYears = secure({ parent: true }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare("SELECT * FROM sch_academic_years WHERE school_id = ? ORDER BY name DESC").bind(ctx.school.id).all();
  const { results: terms } = await env.DB.prepare("SELECT * FROM sch_terms WHERE school_id = ? ORDER BY sort_order, id").bind(ctx.school.id).all();
  return json({ years: results, terms });
});
var saveYear = secure({ perm: "settings.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Academic year", { required: true, max: 20 });
  const start = V.date(b.start_date, "Start date");
  const end = V.date(b.end_date, "End date");
  if (start && end && end < start) fail(400, "The end date cannot be before the start date.");
  const sid = ctx.school.id;
  let id = params.id ? Number(params.id) : null;
  const clash = await env.DB.prepare("SELECT id FROM sch_academic_years WHERE school_id = ? AND name = ? AND id != ?").bind(sid, name, id || 0).first();
  if (clash) fail(409, `An academic year called "${name}" already exists.`);
  if (id) {
    const own2 = await env.DB.prepare("SELECT id FROM sch_academic_years WHERE id = ? AND school_id = ?").bind(id, sid).first();
    if (!own2) fail(404, "Academic year not found.");
    await env.DB.prepare("UPDATE sch_academic_years SET name = ?, start_date = ?, end_date = ? WHERE id = ?").bind(name, start, end, id).run();
  } else {
    const r = await env.DB.prepare("INSERT INTO sch_academic_years (school_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 0)").bind(sid, name, start, end).run();
    id = r.meta.last_row_id;
  }
  if (b.is_current) {
    await env.DB.batch([
      env.DB.prepare("UPDATE sch_academic_years SET is_current = 0 WHERE school_id = ?").bind(sid),
      env.DB.prepare("UPDATE sch_academic_years SET is_current = 1 WHERE id = ?").bind(id)
    ]);
  }
  await audit(env, request, ctx, "settings.year", "academic_year", id, name);
  return json({ ok: true, id }, { status: params.id ? 200 : 201 });
});
var deleteYear = secure({ perm: "settings.manage" }, async ({ request, env, params, ctx }) => {
  const sid = ctx.school.id;
  const y = await env.DB.prepare("SELECT * FROM sch_academic_years WHERE id = ? AND school_id = ?").bind(params.id, sid).first();
  if (!y) fail(404, "Academic year not found.");
  if (y.is_current) fail(400, "You cannot delete the current academic year. Make another year current first.");
  const used = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM sch_classes WHERE academic_year_id = ?1) + (SELECT COUNT(*) FROM sch_enrollments WHERE academic_year_id = ?1) +
            (SELECT COUNT(*) FROM sch_payments WHERE academic_year_id = ?1) AS n`
  ).bind(y.id).first();
  if (used.n > 0) fail(409, "This academic year already has classes, students or payments and cannot be deleted.");
  await env.DB.prepare("DELETE FROM sch_academic_years WHERE id = ?").bind(y.id).run();
  await audit(env, request, ctx, "settings.year.delete", "academic_year", y.id, y.name);
  return json({ ok: true });
});
var saveTerm = secure({ perm: "settings.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Term name", { required: true, max: 40 });
  const order = V.int(b.sort_order, "Order", { min: 0, max: 50 }) ?? 0;
  const sid = ctx.school.id;
  const clash = await env.DB.prepare("SELECT id FROM sch_terms WHERE school_id = ? AND name = ? AND id != ?").bind(sid, name, params.id || 0).first();
  if (clash) fail(409, `A term called "${name}" already exists.`);
  if (params.id) {
    const r2 = await env.DB.prepare("UPDATE sch_terms SET name = ?, sort_order = ? WHERE id = ? AND school_id = ?").bind(name, order, params.id, sid).run();
    if (!r2.meta.changes) fail(404, "Term not found.");
    return json({ ok: true });
  }
  const r = await env.DB.prepare("INSERT INTO sch_terms (school_id, name, sort_order) VALUES (?, ?, ?)").bind(sid, name, order).run();
  await audit(env, request, ctx, "settings.term", "term", r.meta.last_row_id, name);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var deleteTerm = secure({ perm: "settings.manage" }, async ({ env, params, ctx }) => {
  await env.DB.prepare("DELETE FROM sch_terms WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).run();
  return json({ ok: true });
});
var getPermissions = secure({ perm: ["settings.manage", "users.manage"] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare("SELECT role, permission FROM sch_role_permissions WHERE school_id = ?").bind(ctx.school.id).all();
  const matrix = { admin: ALL_PERMISSION_KEYS, teacher: [], receptionist: [] };
  results.forEach((r) => {
    if (matrix[r.role]) matrix[r.role].push(r.permission);
  });
  return json({ catalogue: PERMISSIONS2, matrix, defaults: DEFAULT_ROLE_PERMISSIONS });
});
var savePermissions = secure({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const role = V.oneOf(b.role, "Role", ["teacher", "receptionist"], { required: true });
  const perms = [...new Set((b.permissions || []).map(String))];
  if (perms.some((p) => !ALL_PERMISSION_KEYS.includes(p))) fail(400, "Unknown permission in the list.");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sch_role_permissions WHERE school_id = ? AND role = ?").bind(ctx.school.id, role),
    ...perms.map((p) => env.DB.prepare("INSERT INTO sch_role_permissions (school_id, role, permission) VALUES (?, ?, ?)").bind(ctx.school.id, role, p))
  ]);
  await audit(env, request, ctx, "settings.permissions", "role", null, `${role}: ${perms.length} permissions`);
  return json({ ok: true });
});
var listUsers2 = secure({ perm: "users.manage" }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.role, m.active, m.created_at, m.teacher_id, m.parent_id, u.id AS user_id, u.name, u.email,
            t.full_name AS teacher_name, p.full_name AS parent_name,
            (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login
     FROM sch_members m JOIN users u ON u.id = m.user_id
     LEFT JOIN sch_teachers t ON t.id = m.teacher_id
     LEFT JOIN sch_parents p ON p.id = m.parent_id
     WHERE m.school_id = ? ORDER BY m.role, u.name`
  ).bind(ctx.school.id).all();
  return json({ users: results });
});
async function createLogin(env, ctx, { name, email, password, role, teacherId = null, parentId = null }) {
  const existing = await env.DB.prepare("SELECT id, name FROM users WHERE email = ?").bind(email).first();
  let userId;
  let linked = false;
  if (existing) {
    userId = existing.id;
    linked = true;
    const m = await env.DB.prepare("SELECT id FROM sch_members WHERE school_id = ? AND user_id = ?").bind(ctx.school.id, userId).first();
    if (m) fail(409, "This person already has a login for your school.");
  } else {
    const { hash, salt } = await hashPassword(V.password(password, "Temporary password"));
    const r = await env.DB.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)").bind(name, email, hash, salt, "user").run();
    userId = r.meta.last_row_id;
  }
  await env.DB.prepare("INSERT INTO sch_members (school_id, user_id, role, teacher_id, parent_id) VALUES (?, ?, ?, ?, ?)").bind(ctx.school.id, userId, role, teacherId, parentId).run();
  return { userId, linked };
}
__name(createLogin, "createLogin");
var addUser = secure({ perm: "users.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Full name", { required: true, max: 100 });
  const email = V.email(b.email, "Email", { required: true });
  const role = V.oneOf(b.role, "Role", ["admin", "teacher", "receptionist"], { required: true });
  let teacherId = null;
  if (role === "teacher") {
    if (b.teacher_id) {
      const t = await env.DB.prepare("SELECT id FROM sch_teachers WHERE id = ? AND school_id = ?").bind(b.teacher_id, ctx.school.id).first();
      if (!t) fail(400, "That teacher record was not found.");
      teacherId = t.id;
    } else {
      const t = await env.DB.prepare("INSERT INTO sch_teachers (school_id, full_name, email) VALUES (?, ?, ?)").bind(ctx.school.id, name, email).run();
      teacherId = t.meta.last_row_id;
    }
  }
  const { userId, linked } = await createLogin(env, ctx, { name, email, password: b.password, role, teacherId });
  if (teacherId) await env.DB.prepare("UPDATE sch_teachers SET user_id = ? WHERE id = ?").bind(userId, teacherId).run();
  await audit(env, request, ctx, "user.create", "user", userId, `${email} as ${role}`);
  return json({ ok: true, user_id: userId, linked }, { status: 201 });
});
var updateUser = secure({ perm: "users.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const m = await env.DB.prepare("SELECT * FROM sch_members WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!m) fail(404, "User not found.");
  const role = b.role !== void 0 ? V.oneOf(b.role, "Role", ROLES2.filter((r) => r !== "parent"), { required: true }) : m.role;
  const active = b.active === void 0 ? m.active : b.active ? 1 : 0;
  if (m.role === "parent") {
    if (b.role !== void 0 && role !== "parent") fail(400, "Parent logins cannot be changed into staff logins.");
  }
  if (m.role === "admin" && (role !== "admin" || !active)) {
    const others = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sch_members WHERE school_id = ? AND role = 'admin' AND active = 1 AND id != ?`).bind(ctx.school.id, m.id).first();
    if (!others.n) fail(400, "Your school needs at least one active administrator.");
  }
  await env.DB.prepare("UPDATE sch_members SET role = ?, active = ? WHERE id = ?").bind(m.role === "parent" ? "parent" : role, active, m.id).run();
  if (b.new_password) {
    const other = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_members WHERE user_id = ? AND school_id != ?").bind(m.user_id, ctx.school.id).first();
    if (other.n) fail(400, "This person also belongs to another school, so only they can change their password.");
    const { hash, salt } = await hashPassword(V.password(b.new_password, "New password"));
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, m.user_id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(m.user_id)
    ]);
  }
  await audit(env, request, ctx, "user.update", "user", m.user_id, `${m.role}\u2192${role}, active=${active}${b.new_password ? ", password reset" : ""}`);
  return json({ ok: true });
});

// src/handlers/school/people.js
init_auth();
init_school_auth();
init_school_calc();
var STATUSES2 = ["active", "inactive", "graduated", "suspended", "transferred"];
var listStudents = secure({ perm: "students.view" }, async ({ env, url, ctx }) => {
  const sid = ctx.school.id;
  const { page, limit, offset } = paging(url, 25, 100);
  const year = url.searchParams.get("year") ? V.int(url.searchParams.get("year"), "Academic year", { min: 1 }) : (await currentYear(env, sid)).id;
  const where = ["s.school_id = ?"];
  const binds = [sid];
  const q = (url.searchParams.get("q") || "").trim();
  if (q) {
    const like = likeTerm(q);
    where.push(`(${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\' OR s.phone LIKE ? ESCAPE '\\'
      OR EXISTS (SELECT 1 FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id
                 WHERE sp.student_id = s.id AND (p.phone LIKE ? ESCAPE '\\' OR p.full_name LIKE ? ESCAPE '\\')))`);
    binds.push(like, like, like, like, like);
  }
  const classId = Number(url.searchParams.get("class_id") || 0);
  if (classId) {
    where.push("e.class_id = ?");
    binds.push(classId);
  }
  const gender = url.searchParams.get("gender");
  if (gender) {
    where.push("s.gender = ?");
    binds.push(V.oneOf(gender, "Gender", ["male", "female"]));
  }
  const status = url.searchParams.get("status");
  if (status) {
    where.push("s.status = ?");
    binds.push(V.oneOf(status, "Status", STATUSES2));
  }
  if (url.searchParams.get("year") || classId) where.push("e.id IS NOT NULL");
  if (ctx.role === "teacher") {
    const ids = await teacherClassIds(env, ctx);
    if (!ids.length) return json({ students: [], total: 0, page, limit });
    where.push(`e.class_id IN (${ids.map(() => "?").join(",")})`);
    binds.push(...ids);
  }
  const from = `FROM sch_students s
    LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${year}
    LEFT JOIN sch_classes c ON c.id = e.class_id
    WHERE ${where.join(" AND ")}`;
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first();
  const showFees = can2(ctx, "fees.view");
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.status, s.phone,
            (s.photo_key IS NOT NULL) AS has_photo, c.id AS class_id, c.name AS class_name, c.stream AS class_stream,
            ${PARENT_NAME_SQL} AS parent_name, ${PARENT_PHONE_SQL} AS parent_phone,
            ${ATTENDANCE_COLUMNS}${showFees ? "," + feeColumns(todayISO()) : ""}
     ${from} ORDER BY s.last_name COLLATE NOCASE, s.first_name COLLATE NOCASE LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  const students = results.map((r) => {
    const fee = showFees ? feeFromRow(r) : null;
    return {
      id: r.id,
      admission_no: r.admission_no,
      full_name: studentFullName(r),
      first_name: r.first_name,
      last_name: r.last_name,
      gender: r.gender,
      status: r.status,
      phone: r.phone,
      has_photo: !!r.has_photo,
      class_id: r.class_id,
      class_name: r.class_name ? `${r.class_name}${r.class_stream ? " " + r.class_stream : ""}` : null,
      parent_name: r.parent_name,
      parent_phone: r.parent_phone,
      attendance_percent: attendanceFromRow(r),
      fee_balance: fee ? fee.balance : null,
      fee_status: fee ? fee.status : null
    };
  });
  return json({ students, total: total.n, page, limit });
});
function readStudentFields(b) {
  return {
    first_name: V.str(b.first_name, "First name", { required: true, max: 60 }),
    middle_name: V.str(b.middle_name, "Middle name", { max: 60 }),
    last_name: V.str(b.last_name, "Last name", { required: true, max: 60 }),
    gender: V.oneOf(b.gender, "Gender", ["male", "female"], { required: true }),
    date_of_birth: V.date(b.date_of_birth, "Date of birth"),
    nationality: V.str(b.nationality, "Nationality", { max: 60 }),
    phone: V.phone(b.phone, "Student phone number"),
    email: V.email(b.email, "Student email"),
    address: V.str(b.address, "Address", { max: 300 }),
    previous_school: V.str(b.previous_school, "Previous school", { max: 160 }),
    admission_date: V.date(b.admission_date, "Admission date") || todayISO(),
    status: V.oneOf(b.status, "Status", STATUSES2, { def: "active" })
  };
}
__name(readStudentFields, "readStudentFields");
async function requireClass(env, ctx, classId) {
  const id = V.int(classId, "Class", { required: true, min: 1 });
  const c = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(id, ctx.school.id).first();
  if (!c) fail(400, "Please choose a valid class.");
  return c;
}
__name(requireClass, "requireClass");
async function assertRoom(env, cls, yearId, studentId) {
  const n2 = await env.DB.prepare(
    "SELECT COUNT(*) AS n FROM sch_enrollments WHERE class_id = ? AND academic_year_id = ? AND student_id != ?"
  ).bind(cls.id, yearId, studentId || 0).first();
  if (n2.n >= cls.max_students) fail(409, `${cls.name}${cls.stream ? " " + cls.stream : ""} is full (${n2.n}/${cls.max_students}). Increase the class size or choose another class.`);
}
__name(assertRoom, "assertRoom");
async function nextAdmissionNo(env, school, admissionDate) {
  const year = String(admissionDate).slice(0, 4);
  const stem = `${school.admission_prefix}-${year}-`;
  const last = await env.DB.prepare(
    `SELECT admission_no FROM sch_students WHERE school_id = ? AND admission_no LIKE ? ORDER BY admission_no DESC LIMIT 1`
  ).bind(school.id, stem + "%").first();
  const seq = last ? (parseInt(last.admission_no.slice(stem.length), 10) || 0) + 1 : 1;
  return stem + String(seq).padStart(4, "0");
}
__name(nextAdmissionNo, "nextAdmissionNo");
async function resolveGuardians(env, ctx, list) {
  if (!Array.isArray(list) || !list.length) fail(400, "Please add at least one parent or guardian.");
  if (list.length > 4) fail(400, "A student can have up to 4 guardians.");
  const out = [];
  let i = 0;
  for (const g of list) {
    i += 1;
    const relationship = V.str(g.relationship, `Relationship (guardian ${i})`, { max: 40 }) || "Parent";
    let parentId = null;
    if (g.parent_id) {
      const p = await env.DB.prepare("SELECT id FROM sch_parents WHERE id = ? AND school_id = ?").bind(g.parent_id, ctx.school.id).first();
      if (!p) fail(400, "One of the selected parents was not found.");
      parentId = p.id;
    } else {
      const fullName = V.str(g.full_name, `Parent/guardian name${list.length > 1 ? ` (guardian ${i})` : ""}`, { required: true, max: 100 });
      const phone = V.phone(g.phone, `Parent/guardian phone${list.length > 1 ? ` (guardian ${i})` : ""}`, { required: true });
      const dupe = await env.DB.prepare(
        "SELECT id FROM sch_parents WHERE school_id = ? AND phone = ? AND lower(full_name) = lower(?)"
      ).bind(ctx.school.id, phone, fullName).first();
      if (dupe) parentId = dupe.id;
      else {
        const r = await env.DB.prepare(
          `INSERT INTO sch_parents (school_id, full_name, phone, alt_phone, email, address, occupation) VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).bind(
          ctx.school.id,
          fullName,
          phone,
          V.phone(g.alt_phone, "Alternative phone"),
          V.email(g.email, "Parent email"),
          V.str(g.address, "Parent address", { max: 300 }),
          V.str(g.occupation, "Occupation", { max: 100 })
        ).run();
        parentId = r.meta.last_row_id;
      }
    }
    if (out.some((o) => o.parent_id === parentId)) continue;
    out.push({ parent_id: parentId, relationship, is_primary: out.length === 0 ? 1 : g.is_primary ? 1 : 0 });
  }
  return out;
}
__name(resolveGuardians, "resolveGuardians");
async function resolveSubjects(env, ctx, classId, requested) {
  const { results } = await env.DB.prepare(
    `SELECT cs.subject_id FROM sch_class_subjects cs JOIN sch_subjects s ON s.id = cs.subject_id
     WHERE cs.class_id = ? AND cs.school_id = ? AND s.status = 'active'`
  ).bind(classId, ctx.school.id).all();
  const allowed = results.map((r) => r.subject_id);
  if (requested == null) return allowed;
  const ids = V.ids(requested, "Subjects");
  if (ids.some((id) => !allowed.includes(id))) fail(400, "One of the chosen subjects is not taught in this class. Assign it to the class first.");
  return ids;
}
__name(resolveSubjects, "resolveSubjects");
var createStudent = secure({ perm: "students.create" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const f = readStudentFields(b);
  const cls = await requireClass(env, ctx, b.class_id);
  const yearId = cls.academic_year_id;
  await assertRoom(env, cls, yearId, null);
  const subjectIds = await resolveSubjects(env, ctx, cls.id, b.subject_ids);
  const guardians = await resolveGuardians(env, ctx, b.guardians);
  let studentId = null;
  let admissionNo = null;
  for (let attempt = 0; attempt < 4 && !studentId; attempt += 1) {
    admissionNo = await nextAdmissionNo(env, ctx.school, f.admission_date);
    try {
      const r = await env.DB.prepare(
        `INSERT INTO sch_students (school_id, admission_no, first_name, middle_name, last_name, gender, date_of_birth, nationality,
           phone, email, address, previous_school, admission_date, status, verify_token)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        ctx.school.id,
        admissionNo,
        f.first_name,
        f.middle_name,
        f.last_name,
        f.gender,
        f.date_of_birth,
        f.nationality,
        f.phone,
        f.email,
        f.address,
        f.previous_school,
        f.admission_date,
        f.status,
        randomToken2(16)
      ).run();
      studentId = r.meta.last_row_id;
    } catch (e) {
      if (!/UNIQUE/i.test(String(e))) throw e;
    }
  }
  if (!studentId) fail(500, "Could not generate an admission number. Please try again.");
  await env.DB.batch([
    env.DB.prepare("INSERT INTO sch_enrollments (school_id, student_id, class_id, academic_year_id) VALUES (?, ?, ?, ?)").bind(ctx.school.id, studentId, cls.id, yearId),
    ...subjectIds.map((sub) => env.DB.prepare(
      "INSERT INTO sch_student_subjects (student_id, subject_id, academic_year_id, school_id) VALUES (?, ?, ?, ?)"
    ).bind(studentId, sub, yearId, ctx.school.id)),
    ...guardians.map((g) => env.DB.prepare(
      "INSERT INTO sch_student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, ?)"
    ).bind(studentId, g.parent_id, g.relationship, g.is_primary))
  ]);
  await audit(env, request, ctx, "student.create", "student", studentId, `${studentFullName(f)} (${admissionNo}) \u2192 ${cls.name}`);
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
    ...safe,
    full_name: studentFullName(st),
    has_photo: !!photo_key,
    class: enr ? { id: enr.class_id, name: enr.class_name, stream: enr.stream, level: enr.level, year_id: enr.academic_year_id, year_name: enr.year_name } : null,
    parents: ctx.role === "parent" ? parents.map(({ id, ...p }) => ({ id, ...p })) : parents,
    subjects
  };
}
__name(studentDetail, "studentDetail");
var getStudent = secure({ perm: void 0, parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== "parent" && !can2(ctx, "students.view")) fail(403, "You do not have permission to view students.");
  const st = await loadStudentForCtx(env, ctx, params.id);
  return json({ student: await studentDetail(env, ctx, st) });
});
var updateStudent = secure({ perm: "students.edit" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const st = await loadStudentForCtx(env, ctx, params.id);
  const f = readStudentFields({ ...b, admission_date: b.admission_date || st.admission_date });
  const year = await currentYear(env, ctx.school.id);
  const enr = await env.DB.prepare("SELECT * FROM sch_enrollments WHERE student_id = ? AND academic_year_id = ?").bind(st.id, year.id).first();
  const stmts = [env.DB.prepare(
    `UPDATE sch_students SET first_name = ?, middle_name = ?, last_name = ?, gender = ?, date_of_birth = ?, nationality = ?, phone = ?, email = ?,
       address = ?, previous_school = ?, admission_date = ?, status = ? WHERE id = ?`
  ).bind(
    f.first_name,
    f.middle_name,
    f.last_name,
    f.gender,
    f.date_of_birth,
    f.nationality,
    f.phone,
    f.email,
    f.address,
    f.previous_school,
    f.admission_date,
    f.status,
    st.id
  )];
  if (b.class_id) {
    const cls = await requireClass(env, ctx, b.class_id);
    const changed = !enr || enr.class_id !== cls.id;
    if (changed) await assertRoom(env, cls, cls.academic_year_id, st.id);
    const subjectIds = await resolveSubjects(env, ctx, cls.id, b.subject_ids);
    if (changed) {
      if (enr && enr.academic_year_id === cls.academic_year_id) {
        stmts.push(env.DB.prepare("UPDATE sch_enrollments SET class_id = ? WHERE id = ?").bind(cls.id, enr.id));
      } else {
        stmts.push(env.DB.prepare(`INSERT INTO sch_enrollments (school_id, student_id, class_id, academic_year_id) VALUES (?, ?, ?, ?)
          ON CONFLICT(student_id, academic_year_id) DO UPDATE SET class_id = excluded.class_id`).bind(ctx.school.id, st.id, cls.id, cls.academic_year_id));
      }
    }
    if (changed || b.subject_ids !== void 0) {
      stmts.push(env.DB.prepare("DELETE FROM sch_student_subjects WHERE student_id = ? AND academic_year_id = ?").bind(st.id, cls.academic_year_id));
      subjectIds.forEach((sub) => stmts.push(env.DB.prepare(
        "INSERT INTO sch_student_subjects (student_id, subject_id, academic_year_id, school_id) VALUES (?, ?, ?, ?)"
      ).bind(st.id, sub, cls.academic_year_id, ctx.school.id)));
    }
  }
  if (b.guardians !== void 0) {
    const guardians = await resolveGuardians(env, ctx, b.guardians);
    stmts.push(env.DB.prepare("DELETE FROM sch_student_parents WHERE student_id = ?").bind(st.id));
    guardians.forEach((g) => stmts.push(env.DB.prepare(
      "INSERT INTO sch_student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, ?)"
    ).bind(st.id, g.parent_id, g.relationship, g.is_primary)));
  }
  await env.DB.batch(stmts);
  await audit(env, request, ctx, "student.update", "student", st.id, `${studentFullName(f)} (${st.admission_no})`);
  return json({ ok: true });
});
var setStudentStatus = secure({ perm: "students.edit" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, "Status", STATUSES2, { required: true });
  const st = await loadStudentForCtx(env, ctx, params.id);
  await env.DB.prepare("UPDATE sch_students SET status = ? WHERE id = ?").bind(status, st.id).run();
  await audit(env, request, ctx, "student.status", "student", st.id, `${st.admission_no}: ${st.status} \u2192 ${status}`);
  return json({ ok: true });
});
var deleteStudent = secure({ perm: "students.delete" }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const pay = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_payments WHERE student_id = ?").bind(st.id).first();
  if (pay.n > 0) fail(409, "This student has payment records, so they cannot be deleted (this protects your financial records). Deactivate the student instead.");
  await env.DB.prepare("DELETE FROM sch_students WHERE id = ?").bind(st.id).run();
  if (st.photo_key && env.MATERIALS) await env.MATERIALS.delete(st.photo_key).catch(() => {
  });
  await audit(env, request, ctx, "student.delete", "student", st.id, `${studentFullName(st)} (${st.admission_no})`);
  return json({ ok: true });
});
var uploadStudentPhoto = secure({ perm: ["students.edit", "students.create"] }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a photo.");
  const key = await storeImage(env, form.get("photo"), `school/${ctx.school.id}/students/${st.id}`);
  await env.DB.prepare("UPDATE sch_students SET photo_key = ? WHERE id = ?").bind(key, st.id).run();
  if (st.photo_key && env.MATERIALS) await env.MATERIALS.delete(st.photo_key).catch(() => {
  });
  await audit(env, request, ctx, "student.photo", "student", st.id, st.admission_no);
  return json({ ok: true });
});
var getStudentPhoto = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== "parent" && !can2(ctx, "students.view")) fail(403, "No access.");
  const st = await loadStudentForCtx(env, ctx, params.id);
  return imageResponse(env, st.photo_key);
});
var listNotes = secure({ perm: "students.notes" }, async ({ env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const { results } = await env.DB.prepare(
    `SELECT n.id, n.note, n.created_at, u.name AS author FROM sch_student_notes n LEFT JOIN users u ON u.id = n.author_user_id
     WHERE n.student_id = ? AND n.school_id = ? ORDER BY n.id DESC`
  ).bind(st.id, ctx.school.id).all();
  return json({ notes: results });
});
var addNote = secure({ perm: "students.notes" }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const b = await readJson(request);
  const note = V.str(b.note, "Note", { required: true, max: 2e3 });
  const r = await env.DB.prepare("INSERT INTO sch_student_notes (school_id, student_id, author_user_id, note) VALUES (?, ?, ?, ?)").bind(ctx.school.id, st.id, ctx.user.id, note).run();
  await audit(env, request, ctx, "student.note", "student", st.id, "Private note added");
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var deleteNote = secure({ perm: "students.notes" }, async ({ request, env, params, ctx }) => {
  const n2 = await env.DB.prepare("SELECT * FROM sch_student_notes WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!n2) fail(404, "Note not found.");
  if (n2.author_user_id !== ctx.user.id && ctx.role !== "admin") fail(403, "You can only delete your own notes.");
  await env.DB.prepare("DELETE FROM sch_student_notes WHERE id = ?").bind(n2.id).run();
  await audit(env, request, ctx, "student.note.delete", "student", n2.student_id, "Note deleted");
  return json({ ok: true });
});
var idCard = secure({ perm: "students.view" }, async ({ request, env, params, ctx }) => {
  const st = await loadStudentForCtx(env, ctx, params.id);
  const detail = await studentDetail(env, ctx, st);
  const settings = await getSettings2(env, ctx.school.id);
  const origin = new URL(request.url).origin;
  await audit(env, request, ctx, "student.idcard", "student", st.id, st.admission_no);
  return json({
    school: { ...ctx.school, logo_key: void 0, has_logo: !!ctx.school.logo_key },
    student: { id: st.id, admission_no: st.admission_no, full_name: detail.full_name, gender: st.gender, has_photo: detail.has_photo },
    class: detail.class,
    id_card_note: settings.id_card_note,
    verify_url: `${origin}/school-verify.html?t=${st.verify_token}`
  });
});
async function verifyStudent({ params, env }) {
  const st = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status, s.school_id, sc.name AS school_name, sc.logo_key,
            sc.phone AS school_phone, sc.primary_color,
            (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id
              JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = s.id ORDER BY y.is_current DESC, y.name DESC LIMIT 1) AS class_name,
            (SELECT y.name FROM sch_enrollments e JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = s.id ORDER BY y.is_current DESC, y.name DESC LIMIT 1) AS year_name
     FROM sch_students s JOIN sch_schools sc ON sc.id = s.school_id WHERE s.verify_token = ?`
  ).bind(String(params.token).slice(0, 64)).first();
  if (!st) return json({ valid: false, error: "This ID card could not be verified." }, { status: 404 });
  return json({
    valid: true,
    school: { id: st.school_id, name: st.school_name, phone: st.school_phone, has_logo: !!st.logo_key, color: st.primary_color },
    student: { full_name: studentFullName(st), admission_no: st.admission_no, class_name: st.class_name, year_name: st.year_name, status: st.status }
  });
}
__name(verifyStudent, "verifyStudent");
var listParents = secure({ perm: ["parents.manage", "students.view"] }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 25, 100);
  const q = (url.searchParams.get("q") || "").trim();
  const where = ["p.school_id = ?"];
  const binds = [ctx.school.id];
  if (q) {
    const like = likeTerm(q);
    where.push(`(p.full_name LIKE ? ESCAPE '\\' OR p.phone LIKE ? ESCAPE '\\' OR p.email LIKE ? ESCAPE '\\')`);
    binds.push(like, like, like);
  }
  if (ctx.role === "teacher") fail(403, "Teachers cannot browse the parent list.");
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sch_parents p WHERE ${where.join(" AND ")}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation, p.user_id,
            (SELECT COUNT(*) FROM sch_student_parents sp WHERE sp.parent_id = p.id) AS children_count,
            (SELECT group_concat(s.first_name || ' ' || s.last_name, ', ') FROM sch_student_parents sp JOIN sch_students s ON s.id = sp.student_id WHERE sp.parent_id = p.id) AS children
     FROM sch_parents p WHERE ${where.join(" AND ")} ORDER BY p.full_name COLLATE NOCASE LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ parents: results, total: total.n, page, limit });
});
function readParent(b) {
  return {
    full_name: V.str(b.full_name, "Full name", { required: true, max: 100 }),
    phone: V.phone(b.phone, "Phone number", { required: true }),
    alt_phone: V.phone(b.alt_phone, "Alternative phone"),
    email: V.email(b.email, "Email"),
    address: V.str(b.address, "Address", { max: 300 }),
    occupation: V.str(b.occupation, "Occupation", { max: 100 })
  };
}
__name(readParent, "readParent");
var createParent = secure({ perm: "parents.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const p = readParent(b);
  const r = await env.DB.prepare(
    "INSERT INTO sch_parents (school_id, full_name, phone, alt_phone, email, address, occupation) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(ctx.school.id, p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation).run();
  const id = r.meta.last_row_id;
  let login5 = null;
  if (b.create_login) login5 = await makeParentLogin(env, ctx, id, p, b.password);
  await audit(env, request, ctx, "parent.create", "parent", id, p.full_name);
  return json({ ok: true, id, login: login5 }, { status: 201 });
});
async function makeParentLogin(env, ctx, parentId, p, password) {
  if (!p.email) fail(400, "An email address is needed to give portal access.");
  const { userId, linked } = await createLogin(env, ctx, { name: p.full_name, email: p.email, password, role: "parent", parentId });
  await env.DB.prepare("UPDATE sch_parents SET user_id = ? WHERE id = ?").bind(userId, parentId).run();
  return { user_id: userId, linked };
}
__name(makeParentLogin, "makeParentLogin");
var givePortalAccess = secure({ perm: "parents.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const p = await env.DB.prepare("SELECT * FROM sch_parents WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!p) fail(404, "Parent not found.");
  if (p.user_id) fail(409, "This parent already has portal access.");
  const email = V.email(b.email || p.email, "Email", { required: true });
  if (email !== p.email) await env.DB.prepare("UPDATE sch_parents SET email = ? WHERE id = ?").bind(email, p.id).run();
  const login5 = await makeParentLogin(env, ctx, p.id, { ...p, email }, b.password);
  await audit(env, request, ctx, "parent.portal", "parent", p.id, `Portal access for ${email}`);
  return json({ ok: true, login: login5 }, { status: 201 });
});
var getParent = secure({ perm: ["parents.manage", "students.view"] }, async ({ env, params, ctx }) => {
  if (ctx.role === "teacher") fail(403, "Teachers cannot open parent records.");
  const p = await env.DB.prepare("SELECT * FROM sch_parents WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!p) fail(404, "Parent not found.");
  const { results: children } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status, sp.relationship,
            (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id
              JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = s.id ORDER BY y.is_current DESC, y.name DESC LIMIT 1) AS class_name
     FROM sch_student_parents sp JOIN sch_students s ON s.id = sp.student_id WHERE sp.parent_id = ? ORDER BY s.first_name`
  ).bind(p.id).all();
  return json({ parent: p, children: children.map((c) => ({ ...c, full_name: studentFullName(c) })) });
});
var updateParent = secure({ perm: "parents.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const p = readParent(b);
  const r = await env.DB.prepare(
    "UPDATE sch_parents SET full_name = ?, phone = ?, alt_phone = ?, email = ?, address = ?, occupation = ? WHERE id = ? AND school_id = ?"
  ).bind(p.full_name, p.phone, p.alt_phone, p.email, p.address, p.occupation, params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, "Parent not found.");
  await audit(env, request, ctx, "parent.update", "parent", Number(params.id), p.full_name);
  return json({ ok: true });
});
var deleteParent = secure({ perm: "parents.manage" }, async ({ request, env, params, ctx }) => {
  const p = await env.DB.prepare("SELECT * FROM sch_parents WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!p) fail(404, "Parent not found.");
  const n2 = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_student_parents WHERE parent_id = ?").bind(p.id).first();
  if (n2.n > 0) fail(409, `${p.full_name} is linked to ${n2.n} student${n2.n > 1 ? "s" : ""}. Remove the link from the student's profile first.`);
  await env.DB.batch([
    env.DB.prepare("UPDATE sch_members SET active = 0 WHERE parent_id = ? AND school_id = ?").bind(p.id, ctx.school.id),
    env.DB.prepare("DELETE FROM sch_parents WHERE id = ?").bind(p.id)
  ]);
  await audit(env, request, ctx, "parent.delete", "parent", p.id, p.full_name);
  return json({ ok: true });
});
var EMPLOYMENT = ["full_time", "part_time", "contract", "on_leave", "resigned"];
function readTeacher(b) {
  return {
    full_name: V.str(b.full_name, "Full name", { required: true, max: 100 }),
    gender: V.oneOf(b.gender, "Gender", ["male", "female"]),
    phone: V.phone(b.phone, "Phone number"),
    email: V.email(b.email, "Email"),
    address: V.str(b.address, "Address", { max: 300 }),
    employment_status: V.oneOf(b.employment_status, "Employment status", EMPLOYMENT, { def: "full_time" })
  };
}
__name(readTeacher, "readTeacher");
var listTeachers = secure({ perm: ["teachers.manage", "classes.manage", "students.view"] }, async ({ env, url, ctx }) => {
  const q = (url.searchParams.get("q") || "").trim();
  const where = ["t.school_id = ?"];
  const binds = [ctx.school.id];
  if (q) {
    where.push(`(t.full_name LIKE ? ESCAPE '\\' OR t.phone LIKE ? ESCAPE '\\' OR t.email LIKE ? ESCAPE '\\')`);
    const l = likeTerm(q);
    binds.push(l, l, l);
  }
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.full_name, t.gender, t.phone, t.email, t.employment_status, t.user_id, (t.photo_key IS NOT NULL) AS has_photo,
            (SELECT COUNT(DISTINCT x) FROM (SELECT c.id AS x FROM sch_classes c WHERE c.teacher_id = t.id UNION SELECT cs.class_id FROM sch_class_subjects cs WHERE cs.teacher_id = t.id)) AS class_count,
            (SELECT COUNT(DISTINCT cs.subject_id) FROM sch_class_subjects cs WHERE cs.teacher_id = t.id) AS subject_count,
            (SELECT group_concat(DISTINCT s.name) FROM sch_class_subjects cs JOIN sch_subjects s ON s.id = cs.subject_id WHERE cs.teacher_id = t.id) AS subjects
     FROM sch_teachers t WHERE ${where.join(" AND ")} ORDER BY t.full_name COLLATE NOCASE`
  ).bind(...binds).all();
  return json({ teachers: results.map((t) => ({ ...t, has_photo: !!t.has_photo })) });
});
var createTeacher = secure({ perm: "teachers.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const t = readTeacher(b);
  const r = await env.DB.prepare(
    `INSERT INTO sch_teachers (school_id, full_name, gender, phone, email, address, employment_status) VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.school.id, t.full_name, t.gender, t.phone, t.email, t.address, t.employment_status).run();
  const id = r.meta.last_row_id;
  let login5 = null;
  if (b.create_login) login5 = await makeTeacherLogin(env, ctx, id, t, b.password);
  await audit(env, request, ctx, "teacher.create", "teacher", id, t.full_name);
  return json({ ok: true, id, login: login5 }, { status: 201 });
});
async function makeTeacherLogin(env, ctx, teacherId, t, password) {
  if (!t.email) fail(400, "An email address is needed to create a login for the teacher.");
  const { userId, linked } = await createLogin(env, ctx, { name: t.full_name, email: t.email, password, role: "teacher", teacherId });
  await env.DB.prepare("UPDATE sch_teachers SET user_id = ? WHERE id = ?").bind(userId, teacherId).run();
  return { user_id: userId, linked };
}
__name(makeTeacherLogin, "makeTeacherLogin");
var giveTeacherLogin = secure({ perm: "teachers.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const t = await env.DB.prepare("SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!t) fail(404, "Teacher not found.");
  if (t.user_id) fail(409, "This teacher already has a login.");
  const email = V.email(b.email || t.email, "Email", { required: true });
  if (email !== t.email) await env.DB.prepare("UPDATE sch_teachers SET email = ? WHERE id = ?").bind(email, t.id).run();
  const login5 = await makeTeacherLogin(env, ctx, t.id, { ...t, email }, b.password);
  await audit(env, request, ctx, "teacher.login", "teacher", t.id, `Login created for ${email}`);
  return json({ ok: true, login: login5 }, { status: 201 });
});
var getTeacher = secure({ perm: ["teachers.manage", "classes.manage", "students.view"] }, async ({ env, params, ctx }) => {
  const sid = ctx.school.id;
  const t = await env.DB.prepare("SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?").bind(params.id, sid).first();
  if (!t) fail(404, "Teacher not found.");
  const { results: classes } = await env.DB.prepare(
    `SELECT c.id, c.name, c.stream, y.name AS year_name, 'Class teacher' AS role FROM sch_classes c JOIN sch_academic_years y ON y.id = c.academic_year_id
     WHERE c.teacher_id = ? AND c.school_id = ? ORDER BY y.name DESC, c.name`
  ).bind(t.id, sid).all();
  const { results: subjects } = await env.DB.prepare(
    `SELECT cs.id, sub.name AS subject, sub.code, c.id AS class_id, c.name AS class_name, c.stream
     FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id JOIN sch_classes c ON c.id = cs.class_id
     WHERE cs.teacher_id = ? AND cs.school_id = ? ORDER BY sub.name, c.name`
  ).bind(t.id, sid).all();
  let attendance = { sessions: 0, last_date: null };
  let exams = { results_entered: 0, exams_created: 0, last_entry: null };
  if (t.user_id) {
    attendance = await env.DB.prepare(
      `SELECT COUNT(*) AS sessions, MAX(date) AS last_date FROM (SELECT DISTINCT class_id, subject_id, date FROM sch_attendance WHERE school_id = ? AND marked_by = ?)`
    ).bind(sid, t.user_id).first();
    const r1 = await env.DB.prepare("SELECT COUNT(*) AS n, MAX(updated_at) AS last FROM sch_results WHERE school_id = ? AND entered_by = ?").bind(sid, t.user_id).first();
    const r2 = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_examinations WHERE school_id = ? AND created_by = ?").bind(sid, t.user_id).first();
    exams = { results_entered: r1.n, exams_created: r2.n, last_entry: r1.last };
  }
  const { user_id, photo_key, ...safe } = t;
  return json({ teacher: { ...safe, has_photo: !!photo_key, has_login: !!user_id }, classes, subjects, attendance, exams });
});
var updateTeacher = secure({ perm: "teachers.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const t = readTeacher(b);
  const r = await env.DB.prepare(
    `UPDATE sch_teachers SET full_name = ?, gender = ?, phone = ?, email = ?, address = ?, employment_status = ? WHERE id = ? AND school_id = ?`
  ).bind(t.full_name, t.gender, t.phone, t.email, t.address, t.employment_status, params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, "Teacher not found.");
  await audit(env, request, ctx, "teacher.update", "teacher", Number(params.id), t.full_name);
  return json({ ok: true });
});
var deleteTeacher = secure({ perm: "teachers.manage" }, async ({ request, env, params, ctx }) => {
  const t = await env.DB.prepare("SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!t) fail(404, "Teacher not found.");
  await env.DB.batch([
    env.DB.prepare("UPDATE sch_members SET active = 0, teacher_id = NULL WHERE teacher_id = ? AND school_id = ?").bind(t.id, ctx.school.id),
    env.DB.prepare("DELETE FROM sch_teachers WHERE id = ?").bind(t.id)
  ]);
  if (t.photo_key && env.MATERIALS) await env.MATERIALS.delete(t.photo_key).catch(() => {
  });
  await audit(env, request, ctx, "teacher.delete", "teacher", t.id, t.full_name);
  return json({ ok: true });
});
var uploadTeacherPhoto = secure({ perm: "teachers.manage" }, async ({ request, env, params, ctx }) => {
  const t = await env.DB.prepare("SELECT * FROM sch_teachers WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!t) fail(404, "Teacher not found.");
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a photo.");
  const key = await storeImage(env, form.get("photo"), `school/${ctx.school.id}/teachers/${t.id}`);
  await env.DB.prepare("UPDATE sch_teachers SET photo_key = ? WHERE id = ?").bind(key, t.id).run();
  if (t.photo_key && env.MATERIALS) await env.MATERIALS.delete(t.photo_key).catch(() => {
  });
  return json({ ok: true });
});
var getTeacherPhoto = secure({ perm: ["teachers.manage", "classes.manage", "students.view"] }, async ({ env, params, ctx }) => {
  const t = await env.DB.prepare("SELECT photo_key FROM sch_teachers WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!t) fail(404, "Not found.");
  return imageResponse(env, t.photo_key);
});

// src/handlers/school/academics.js
init_auth();
init_school_auth();
init_school_calc();
var label = /* @__PURE__ */ __name((c) => `${c.name}${c.stream ? " " + c.stream : ""}`, "label");
var listClasses = secure({}, async ({ env, url, ctx }) => {
  const sid = ctx.school.id;
  const where = ["c.school_id = ?"];
  const binds = [sid];
  const yr = url.searchParams.get("year");
  if (yr) {
    where.push("c.academic_year_id = ?");
    binds.push(V.int(yr, "Academic year", { min: 1 }));
  }
  if (ctx.role === "teacher") {
    const ids = await teacherClassIds(env, ctx);
    if (!ids.length) return json({ classes: [] });
    where.push(`c.id IN (${ids.map(() => "?").join(",")})`);
    binds.push(...ids);
  }
  const { results } = await env.DB.prepare(
    `SELECT c.*, y.name AS year_name, t.full_name AS teacher_name,
       (SELECT COUNT(*) FROM sch_enrollments e WHERE e.class_id = c.id) AS current_students,
       (SELECT COUNT(*) FROM sch_class_subjects cs WHERE cs.class_id = c.id) AS subject_count,
       (SELECT group_concat(sub.name, ', ') FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id WHERE cs.class_id = c.id) AS subject_names
     FROM sch_classes c JOIN sch_academic_years y ON y.id = c.academic_year_id LEFT JOIN sch_teachers t ON t.id = c.teacher_id
     WHERE ${where.join(" AND ")} ORDER BY y.name DESC, ${CLASS_ORDER}, c.name, c.stream`
  ).bind(...binds).all();
  return json({ classes: results });
});
var getClass = secure({}, async ({ env, params, ctx }) => {
  const c = await env.DB.prepare(
    `SELECT c.*, t.full_name AS teacher_name FROM sch_classes c LEFT JOIN sch_teachers t ON t.id = c.teacher_id WHERE c.id = ? AND c.school_id = ?`
  ).bind(params.id, ctx.school.id).first();
  if (!c) fail(404, "Class not found.");
  const { results: subjects } = await env.DB.prepare(
    `SELECT cs.subject_id, sub.name, sub.code, cs.teacher_id, t.full_name AS teacher_name
     FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id LEFT JOIN sch_teachers t ON t.id = cs.teacher_id
     WHERE cs.class_id = ? ORDER BY sub.name`
  ).bind(c.id).all();
  return json({ class: c, subjects });
});
function readClass(b) {
  return {
    name: V.str(b.name, "Class name", { required: true, max: 60 }),
    level: V.str(b.level, "Level", { max: 40 }),
    stream: V.str(b.stream, "Stream", { max: 30 }) || "",
    max_students: V.int(b.max_students, "Maximum students", { min: 1, max: 500 }) ?? 40,
    status: V.oneOf(b.status, "Status", ["active", "inactive"], { def: "active" })
  };
}
__name(readClass, "readClass");
async function optionalTeacher(env, ctx, id, label2 = "Teacher") {
  if (!id) return null;
  const t = await env.DB.prepare("SELECT id FROM sch_teachers WHERE id = ? AND school_id = ?").bind(id, ctx.school.id).first();
  if (!t) fail(400, `${label2} was not found.`);
  return t.id;
}
__name(optionalTeacher, "optionalTeacher");
async function saveClassSubjects(env, ctx, classId, list) {
  if (!Array.isArray(list)) return;
  const seen = /* @__PURE__ */ new Set();
  const stmts = [env.DB.prepare("DELETE FROM sch_class_subjects WHERE class_id = ?").bind(classId)];
  for (const a of list) {
    const subId = V.int(a.subject_id, "Subject", { required: true, min: 1 });
    if (seen.has(subId)) continue;
    seen.add(subId);
    const sub = await env.DB.prepare("SELECT id FROM sch_subjects WHERE id = ? AND school_id = ?").bind(subId, ctx.school.id).first();
    if (!sub) fail(400, "One of the chosen subjects was not found.");
    const tid = await optionalTeacher(env, ctx, a.teacher_id, "Subject teacher");
    stmts.push(env.DB.prepare("INSERT INTO sch_class_subjects (school_id, class_id, subject_id, teacher_id) VALUES (?, ?, ?, ?)").bind(ctx.school.id, classId, subId, tid));
  }
  await env.DB.batch(stmts);
}
__name(saveClassSubjects, "saveClassSubjects");
var createClass = secure({ perm: "classes.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const c = readClass(b);
  const yearId = b.academic_year_id ? V.int(b.academic_year_id, "Academic year", { min: 1 }) : (await currentYear(env, ctx.school.id)).id;
  const yr = await env.DB.prepare("SELECT id FROM sch_academic_years WHERE id = ? AND school_id = ?").bind(yearId, ctx.school.id).first();
  if (!yr) fail(400, "Please choose a valid academic year.");
  const teacherId = await optionalTeacher(env, ctx, b.teacher_id, "Class teacher");
  const dupe = await env.DB.prepare("SELECT id FROM sch_classes WHERE school_id = ? AND name = ? AND stream = ? AND academic_year_id = ?").bind(ctx.school.id, c.name, c.stream, yearId).first();
  if (dupe) fail(409, `${label(c)} already exists for this academic year.`);
  const r = await env.DB.prepare(
    "INSERT INTO sch_classes (school_id, name, level, stream, academic_year_id, teacher_id, max_students, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(ctx.school.id, c.name, c.level, c.stream, yearId, teacherId, c.max_students, c.status).run();
  await saveClassSubjects(env, ctx, r.meta.last_row_id, b.subjects);
  await audit(env, request, ctx, "class.create", "class", r.meta.last_row_id, label(c));
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updateClass = secure({ perm: "classes.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const cur = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!cur) fail(404, "Class not found.");
  const c = readClass(b);
  const teacherId = await optionalTeacher(env, ctx, b.teacher_id, "Class teacher");
  const dupe = await env.DB.prepare("SELECT id FROM sch_classes WHERE school_id = ? AND name = ? AND stream = ? AND academic_year_id = ? AND id != ?").bind(ctx.school.id, c.name, c.stream, cur.academic_year_id, cur.id).first();
  if (dupe) fail(409, `${label(c)} already exists for this academic year.`);
  const enrolled = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_enrollments WHERE class_id = ?").bind(cur.id).first();
  if (c.max_students < enrolled.n) fail(400, `This class already has ${enrolled.n} students, so the maximum cannot be lower than that.`);
  await env.DB.prepare("UPDATE sch_classes SET name = ?, level = ?, stream = ?, teacher_id = ?, max_students = ?, status = ? WHERE id = ?").bind(c.name, c.level, c.stream, teacherId, c.max_students, c.status, cur.id).run();
  await saveClassSubjects(env, ctx, cur.id, b.subjects);
  await audit(env, request, ctx, "class.update", "class", cur.id, label(c));
  return json({ ok: true });
});
var deleteClass = secure({ perm: "classes.manage" }, async ({ request, env, params, ctx }) => {
  const c = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!c) fail(404, "Class not found.");
  const n2 = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_enrollments WHERE class_id = ?").bind(c.id).first();
  if (n2.n > 0) fail(409, `${label(c)} has ${n2.n} student${n2.n > 1 ? "s" : ""}. Move them to another class first, or mark the class Inactive instead.`);
  await env.DB.prepare("DELETE FROM sch_classes WHERE id = ?").bind(c.id).run();
  await audit(env, request, ctx, "class.delete", "class", c.id, label(c));
  return json({ ok: true });
});
var listSubjects = secure({}, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT sub.*,
       (SELECT group_concat(DISTINCT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END) FROM sch_class_subjects cs JOIN sch_classes c ON c.id = cs.class_id WHERE cs.subject_id = sub.id) AS class_names,
       (SELECT group_concat(DISTINCT t.full_name) FROM sch_class_subjects cs JOIN sch_teachers t ON t.id = cs.teacher_id WHERE cs.subject_id = sub.id) AS teacher_names,
       (SELECT COUNT(*) FROM sch_class_subjects cs WHERE cs.subject_id = sub.id) AS class_count
     FROM sch_subjects sub WHERE sub.school_id = ? ORDER BY sub.name`
  ).bind(ctx.school.id).all();
  const { results: links } = await env.DB.prepare(
    "SELECT class_id, subject_id, teacher_id FROM sch_class_subjects WHERE school_id = ?"
  ).bind(ctx.school.id).all();
  return json({ subjects: results, assignments: links });
});
async function syncSubjectClasses(env, ctx, subjectId, b) {
  if (b.class_ids === void 0) return;
  const ids = V.ids(b.class_ids, "Classes");
  const teacherId = await optionalTeacher(env, ctx, b.teacher_id, "Teacher");
  if (ids.length) {
    const { results } = await env.DB.prepare(`SELECT id FROM sch_classes WHERE school_id = ? AND id IN (${ids.map(() => "?").join(",")})`).bind(ctx.school.id, ...ids).all();
    if (results.length !== ids.length) fail(400, "One of the chosen classes was not found.");
  }
  const stmts = [];
  if (ids.length) stmts.push(env.DB.prepare(`DELETE FROM sch_class_subjects WHERE subject_id = ? AND class_id NOT IN (${ids.map(() => "?").join(",")})`).bind(subjectId, ...ids));
  else stmts.push(env.DB.prepare("DELETE FROM sch_class_subjects WHERE subject_id = ?").bind(subjectId));
  ids.forEach((cid) => stmts.push(env.DB.prepare(
    `INSERT INTO sch_class_subjects (school_id, class_id, subject_id, teacher_id) VALUES (?, ?, ?, ?)
     ON CONFLICT(class_id, subject_id) DO UPDATE SET teacher_id = COALESCE(excluded.teacher_id, sch_class_subjects.teacher_id)`
  ).bind(ctx.school.id, cid, subjectId, teacherId)));
  await env.DB.batch(stmts);
}
__name(syncSubjectClasses, "syncSubjectClasses");
var createSubject = secure({ perm: "subjects.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Subject name", { required: true, max: 80 });
  const code = V.str(b.code, "Subject code", { required: true, max: 12 }).toUpperCase();
  const status = V.oneOf(b.status, "Status", ["active", "inactive"], { def: "active" });
  const dupe = await env.DB.prepare("SELECT id FROM sch_subjects WHERE school_id = ? AND code = ?").bind(ctx.school.id, code).first();
  if (dupe) fail(409, `A subject with the code "${code}" already exists.`);
  const r = await env.DB.prepare("INSERT INTO sch_subjects (school_id, name, code, status) VALUES (?, ?, ?, ?)").bind(ctx.school.id, name, code, status).run();
  await syncSubjectClasses(env, ctx, r.meta.last_row_id, b);
  await audit(env, request, ctx, "subject.create", "subject", r.meta.last_row_id, `${name} (${code})`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updateSubject = secure({ perm: "subjects.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const cur = await env.DB.prepare("SELECT * FROM sch_subjects WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!cur) fail(404, "Subject not found.");
  const name = V.str(b.name, "Subject name", { required: true, max: 80 });
  const code = V.str(b.code, "Subject code", { required: true, max: 12 }).toUpperCase();
  const status = V.oneOf(b.status, "Status", ["active", "inactive"], { def: "active" });
  const dupe = await env.DB.prepare("SELECT id FROM sch_subjects WHERE school_id = ? AND code = ? AND id != ?").bind(ctx.school.id, code, cur.id).first();
  if (dupe) fail(409, `A subject with the code "${code}" already exists.`);
  await env.DB.prepare("UPDATE sch_subjects SET name = ?, code = ?, status = ? WHERE id = ?").bind(name, code, status, cur.id).run();
  await syncSubjectClasses(env, ctx, cur.id, b);
  await audit(env, request, ctx, "subject.update", "subject", cur.id, `${name} (${code})`);
  return json({ ok: true });
});
var deleteSubject = secure({ perm: "subjects.manage" }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare("SELECT * FROM sch_subjects WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!s) fail(404, "Subject not found.");
  const used = await env.DB.prepare("SELECT (SELECT COUNT(*) FROM sch_results WHERE subject_id = ?1) + (SELECT COUNT(*) FROM sch_attendance WHERE subject_id = ?1) AS n").bind(s.id).first();
  if (used.n > 0) fail(409, `${s.name} already has results or attendance recorded. Mark it Inactive instead of deleting it.`);
  await env.DB.prepare("DELETE FROM sch_subjects WHERE id = ?").bind(s.id).run();
  await audit(env, request, ctx, "subject.delete", "subject", s.id, s.name);
  return json({ ok: true });
});
var TT_SELECT = `SELECT tt.*, c.name AS class_name, c.stream AS class_stream, sub.name AS subject_name, sub.code AS subject_code, t.full_name AS teacher_name
  FROM sch_timetable tt JOIN sch_classes c ON c.id = tt.class_id JOIN sch_subjects sub ON sub.id = tt.subject_id LEFT JOIN sch_teachers t ON t.id = tt.teacher_id`;
var listTimetable = secure({ parent: true }, async ({ env, url, ctx }) => {
  const where = ["tt.school_id = ?"];
  const binds = [ctx.school.id];
  let classId = Number(url.searchParams.get("class_id") || 0);
  const teacherId = Number(url.searchParams.get("teacher_id") || 0);
  if (ctx.role === "parent") {
    const studentId = Number(url.searchParams.get("student_id") || 0);
    if (!studentId) fail(400, "Please choose a child.");
    const st = await loadStudentForCtx(env, ctx, studentId);
    const enr = await env.DB.prepare("SELECT class_id FROM sch_enrollments WHERE student_id = ? ORDER BY academic_year_id DESC LIMIT 1").bind(st.id).first();
    classId = enr ? enr.class_id : -1;
  }
  if (classId) {
    where.push("tt.class_id = ?");
    binds.push(classId);
  }
  if (teacherId) {
    where.push("tt.teacher_id = ?");
    binds.push(teacherId);
  }
  const { results } = await env.DB.prepare(`${TT_SELECT} WHERE ${where.join(" AND ")} ORDER BY tt.day_of_week, tt.start_time`).bind(...binds).all();
  return json({ entries: results });
});
async function readTimetable(env, ctx, b, currentId) {
  const cls = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(V.int(b.class_id, "Class", { required: true, min: 1 }), ctx.school.id).first();
  if (!cls) fail(400, "Please choose a valid class.");
  const sub = await env.DB.prepare("SELECT * FROM sch_subjects WHERE id = ? AND school_id = ?").bind(V.int(b.subject_id, "Subject", { required: true, min: 1 }), ctx.school.id).first();
  if (!sub) fail(400, "Please choose a valid subject.");
  let teacherId = b.teacher_id ? await optionalTeacher(env, ctx, b.teacher_id) : null;
  if (!teacherId) {
    const cs = await env.DB.prepare("SELECT teacher_id FROM sch_class_subjects WHERE class_id = ? AND subject_id = ?").bind(cls.id, sub.id).first();
    teacherId = cs ? cs.teacher_id : null;
  }
  const day = V.int(b.day_of_week, "Day", { required: true, min: 1, max: 7 });
  const start = V.time(b.start_time, "Start time", { required: true });
  const end = V.time(b.end_time, "End time", { required: true });
  if (end <= start) fail(400, "The end time must be after the start time.");
  const room = V.str(b.room, "Room", { max: 40 });
  const overlap = /* @__PURE__ */ __name(async (col, val, who) => {
    if (!val) return;
    const hit = await env.DB.prepare(
      `SELECT tt.start_time, tt.end_time, c.name AS cn, sub.name AS sn FROM sch_timetable tt JOIN sch_classes c ON c.id = tt.class_id JOIN sch_subjects sub ON sub.id = tt.subject_id
       WHERE tt.school_id = ? AND tt.${col} = ? AND tt.day_of_week = ? AND tt.start_time < ? AND tt.end_time > ? AND tt.id != ? LIMIT 1`
    ).bind(ctx.school.id, val, day, end, start, currentId || 0).first();
    if (hit) fail(409, `Clash: ${who} already has ${hit.sn} (${hit.cn}) from ${hit.start_time} to ${hit.end_time} on that day.`);
  }, "overlap");
  await overlap("class_id", cls.id, `${label(cls)}`);
  await overlap("teacher_id", teacherId, "This teacher");
  if (room) {
    const hit = await env.DB.prepare(
      `SELECT tt.start_time, tt.end_time FROM sch_timetable tt WHERE tt.school_id = ? AND lower(tt.room) = lower(?) AND tt.day_of_week = ? AND tt.start_time < ? AND tt.end_time > ? AND tt.id != ? LIMIT 1`
    ).bind(ctx.school.id, room, day, end, start, currentId || 0).first();
    if (hit) fail(409, `Clash: room ${room} is already used from ${hit.start_time} to ${hit.end_time} on that day.`);
  }
  return { class_id: cls.id, subject_id: sub.id, teacher_id: teacherId, day_of_week: day, start_time: start, end_time: end, room };
}
__name(readTimetable, "readTimetable");
var createTimetable = secure({ perm: "timetable.manage" }, async ({ request, env, ctx }) => {
  const t = await readTimetable(env, ctx, await readJson(request), null);
  const r = await env.DB.prepare(
    "INSERT INTO sch_timetable (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(ctx.school.id, t.class_id, t.subject_id, t.teacher_id, t.day_of_week, t.start_time, t.end_time, t.room).run();
  await audit(env, request, ctx, "timetable.create", "timetable", r.meta.last_row_id, `day ${t.day_of_week} ${t.start_time}-${t.end_time}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updateTimetable = secure({ perm: "timetable.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT id FROM sch_timetable WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!cur) fail(404, "Timetable entry not found.");
  const t = await readTimetable(env, ctx, await readJson(request), cur.id);
  await env.DB.prepare(
    "UPDATE sch_timetable SET class_id = ?, subject_id = ?, teacher_id = ?, day_of_week = ?, start_time = ?, end_time = ?, room = ? WHERE id = ?"
  ).bind(t.class_id, t.subject_id, t.teacher_id, t.day_of_week, t.start_time, t.end_time, t.room, cur.id).run();
  await audit(env, request, ctx, "timetable.update", "timetable", cur.id, null);
  return json({ ok: true });
});
var deleteTimetable = secure({ perm: "timetable.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM sch_timetable WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, "Timetable entry not found.");
  await audit(env, request, ctx, "timetable.delete", "timetable", Number(params.id), null);
  return json({ ok: true });
});
async function examForCtx(env, ctx, id) {
  const ex = await env.DB.prepare(
    `SELECT x.*, c.name AS class_name, c.stream AS class_stream, y.name AS year_name, tm.name AS term_name
     FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id JOIN sch_academic_years y ON y.id = x.academic_year_id
     LEFT JOIN sch_terms tm ON tm.id = x.term_id WHERE x.id = ? AND x.school_id = ?`
  ).bind(id, ctx.school.id).first();
  if (!ex) fail(404, "Examination not found.");
  if (ctx.role === "teacher" && !(await teacherClassIds(env, ctx)).includes(ex.class_id)) fail(403, "This examination is for a class that is not yours.");
  return ex;
}
__name(examForCtx, "examForCtx");
var listExams = secure({ perm: ["exams.manage", "results.enter", "results.view"] }, async ({ env, url, ctx }) => {
  const where = ["x.school_id = ?"];
  const binds = [ctx.school.id];
  const classId = Number(url.searchParams.get("class_id") || 0);
  if (classId) {
    where.push("x.class_id = ?");
    binds.push(classId);
  }
  const yearId = Number(url.searchParams.get("year") || 0);
  if (yearId) {
    where.push("x.academic_year_id = ?");
    binds.push(yearId);
  }
  if (ctx.role === "teacher") {
    const ids = await teacherClassIds(env, ctx);
    if (!ids.length) return json({ exams: [] });
    where.push(`x.class_id IN (${ids.map(() => "?").join(",")})`);
    binds.push(...ids);
  }
  const { results } = await env.DB.prepare(
    `SELECT x.*, c.name AS class_name, c.stream AS class_stream, y.name AS year_name, tm.name AS term_name,
       (SELECT COUNT(*) FROM sch_results r WHERE r.exam_id = x.id) AS results_count,
       (SELECT COUNT(DISTINCT r.student_id) FROM sch_results r WHERE r.exam_id = x.id) AS students_marked
     FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id JOIN sch_academic_years y ON y.id = x.academic_year_id
     LEFT JOIN sch_terms tm ON tm.id = x.term_id WHERE ${where.join(" AND ")} ORDER BY COALESCE(x.exam_date, x.created_at) DESC, x.id DESC`
  ).bind(...binds).all();
  return json({ exams: results });
});
var getExam = secure({ perm: ["exams.manage", "results.enter", "results.view"] }, async ({ env, params, ctx }) => {
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
  const mine = ctx.role === "teacher" ? await teacherManages(env, ctx, ex.class_id) : null;
  return json({ exam: ex, subjects: subjects.map((s) => ({ ...s, can_enter: can2(ctx, "results.enter") && (ctx.role !== "teacher" || mine.classTeacher || s.teacher_id === ctx.teacherId) })) });
});
async function teacherManages(env, ctx, classId) {
  const c = await env.DB.prepare("SELECT teacher_id FROM sch_classes WHERE id = ?").bind(classId).first();
  return { classTeacher: !!(c && c.teacher_id && c.teacher_id === ctx.teacherId) };
}
__name(teacherManages, "teacherManages");
async function readExam(env, ctx, b) {
  const cls = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(V.int(b.class_id, "Class", { required: true, min: 1 }), ctx.school.id).first();
  if (!cls) fail(400, "Please choose a valid class.");
  if (ctx.role === "teacher" && !(await teacherClassIds(env, ctx)).includes(cls.id)) fail(403, "You can only create examinations for your own classes.");
  let termId = null;
  if (b.term_id) {
    const t = await env.DB.prepare("SELECT id FROM sch_terms WHERE id = ? AND school_id = ?").bind(b.term_id, ctx.school.id).first();
    if (!t) fail(400, "Please choose a valid term.");
    termId = t.id;
  }
  return {
    name: V.str(b.name, "Examination name", { required: true, max: 100 }),
    exam_type: V.str(b.exam_type, "Examination type", { max: 60 }) || "Monthly Test",
    academic_year_id: cls.academic_year_id,
    term_id: termId,
    class_id: cls.id,
    cls,
    exam_date: V.date(b.exam_date, "Examination date"),
    max_marks: V.num(b.max_marks, "Maximum marks", { min: 1, max: 1e3 }) ?? 100
  };
}
__name(readExam, "readExam");
var createExam = secure({ perm: "exams.manage" }, async ({ request, env, ctx }) => {
  const e = await readExam(env, ctx, await readJson(request));
  const r = await env.DB.prepare(
    `INSERT INTO sch_examinations (school_id, name, exam_type, academic_year_id, term_id, class_id, exam_date, max_marks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.school.id, e.name, e.exam_type, e.academic_year_id, e.term_id, e.class_id, e.exam_date, e.max_marks, ctx.user.id).run();
  await env.DB.prepare(
    `INSERT INTO sch_notifications (school_id, title, message, type, audience, class_id, created_by) VALUES (?, ?, ?, 'exam_announcement', 'class', ?, ?)`
  ).bind(ctx.school.id, `Examination: ${e.name}`, `${e.name} (${e.exam_type}) for ${label(e.cls)}${e.exam_date ? " is scheduled for " + e.exam_date : " has been created"}.`, e.class_id, ctx.user.id).run();
  await audit(env, request, ctx, "exam.create", "exam", r.meta.last_row_id, `${e.name} \u2014 ${label(e.cls)}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updateExam = secure({ perm: "exams.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await examForCtx(env, ctx, params.id);
  const e = await readExam(env, ctx, { ...await readJson(request), class_id: cur.class_id });
  await env.DB.prepare("UPDATE sch_examinations SET name = ?, exam_type = ?, term_id = ?, exam_date = ?, max_marks = ? WHERE id = ?").bind(e.name, e.exam_type, e.term_id, e.exam_date, e.max_marks, cur.id).run();
  await audit(env, request, ctx, "exam.update", "exam", cur.id, e.name);
  return json({ ok: true });
});
var deleteExam = secure({ perm: "exams.manage" }, async ({ request, env, params, ctx }) => {
  const ex = await examForCtx(env, ctx, params.id);
  const n2 = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_results WHERE exam_id = ?").bind(ex.id).first();
  if (n2.n > 0 && ctx.role !== "admin") fail(409, "This examination already has marks entered. Only an administrator can delete it.");
  await env.DB.prepare("DELETE FROM sch_examinations WHERE id = ?").bind(ex.id).run();
  await audit(env, request, ctx, "exam.delete", "exam", ex.id, `${ex.name} (${n2.n} marks removed)`);
  return json({ ok: true });
});
async function assertCanEnter(env, ctx, ex, subjectId) {
  if (ctx.role === "teacher") {
    const cs = await env.DB.prepare("SELECT teacher_id FROM sch_class_subjects WHERE class_id = ? AND subject_id = ?").bind(ex.class_id, subjectId).first();
    const m = await teacherManages(env, ctx, ex.class_id);
    if (!m.classTeacher && !(cs && cs.teacher_id === ctx.teacherId)) fail(403, "You can only enter marks for the subjects you teach.");
  }
}
__name(assertCanEnter, "assertCanEnter");
var resultEntrySheet = secure({ perm: ["results.enter", "results.view"] }, async ({ env, url, ctx }) => {
  const ex = await examForCtx(env, ctx, Number(url.searchParams.get("exam_id") || 0));
  const subjectId = V.int(url.searchParams.get("subject_id"), "Subject", { required: true, min: 1 });
  const sub = await env.DB.prepare(
    "SELECT sub.id, sub.name, sub.code FROM sch_class_subjects cs JOIN sch_subjects sub ON sub.id = cs.subject_id WHERE cs.class_id = ? AND sub.id = ?"
  ).bind(ex.class_id, subjectId).first();
  if (!sub) fail(400, "This subject is not taught in the examination's class.");
  const { results } = await env.DB.prepare(
    `SELECT st.id, st.admission_no, st.first_name, st.middle_name, st.last_name, r.marks
     FROM sch_student_subjects ss JOIN sch_students st ON st.id = ss.student_id
     JOIN sch_enrollments e ON e.student_id = st.id AND e.academic_year_id = ss.academic_year_id
     LEFT JOIN sch_results r ON r.exam_id = ? AND r.student_id = st.id AND r.subject_id = ss.subject_id
     WHERE ss.subject_id = ? AND e.class_id = ? AND ss.academic_year_id = ? AND st.status = 'active' AND st.school_id = ?
     ORDER BY st.first_name COLLATE NOCASE, st.last_name COLLATE NOCASE`
  ).bind(ex.id, subjectId, ex.class_id, ex.academic_year_id, ctx.school.id).all();
  let canEnter = can2(ctx, "results.enter");
  if (canEnter) {
    try {
      await assertCanEnter(env, ctx, ex, subjectId);
    } catch (e) {
      canEnter = false;
    }
  }
  return json({ exam: ex, subject: sub, can_enter: canEnter, students: results.map((s) => ({ id: s.id, admission_no: s.admission_no, full_name: studentFullName(s), marks: s.marks })) });
});
var saveResults = secure({ perm: "results.enter" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const ex = await examForCtx(env, ctx, V.int(b.exam_id, "Examination", { required: true, min: 1 }));
  const subjectId = V.int(b.subject_id, "Subject", { required: true, min: 1 });
  await assertCanEnter(env, ctx, ex, subjectId);
  if (!Array.isArray(b.marks) || !b.marks.length) fail(400, "There are no marks to save.");
  const { results: allowed } = await env.DB.prepare(
    `SELECT ss.student_id FROM sch_student_subjects ss JOIN sch_enrollments e ON e.student_id = ss.student_id AND e.academic_year_id = ss.academic_year_id
     WHERE ss.subject_id = ? AND e.class_id = ? AND ss.academic_year_id = ? AND ss.school_id = ?`
  ).bind(subjectId, ex.class_id, ex.academic_year_id, ctx.school.id).all();
  const ok = new Set(allowed.map((r) => r.student_id));
  const stmts = [];
  let saved = 0;
  let cleared = 0;
  for (const m of b.marks) {
    const studentId = V.int(m.student_id, "Student", { required: true, min: 1 });
    if (!ok.has(studentId)) fail(400, "One of the students does not take this subject in this class.");
    if (m.marks === "" || m.marks == null) {
      stmts.push(env.DB.prepare("DELETE FROM sch_results WHERE exam_id = ? AND student_id = ? AND subject_id = ?").bind(ex.id, studentId, subjectId));
      cleared += 1;
      continue;
    }
    const marks = V.num(m.marks, "Marks", { required: true, min: 0, max: ex.max_marks });
    stmts.push(env.DB.prepare(
      `INSERT INTO sch_results (school_id, exam_id, student_id, subject_id, marks, entered_by) VALUES (?, ?, ?, ?, ?, ?)
       ON CONFLICT(exam_id, student_id, subject_id) DO UPDATE SET marks = excluded.marks, entered_by = excluded.entered_by, updated_at = datetime('now')`
    ).bind(ctx.school.id, ex.id, studentId, subjectId, marks, ctx.user.id));
    saved += 1;
  }
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  await audit(env, request, ctx, "result.enter", "exam", ex.id, `${ex.name}: ${saved} marks saved, ${cleared} cleared (subject #${subjectId})`);
  return json({ ok: true, saved, cleared });
});
async function loadSheet(env, ctx, ex) {
  const settings = await getSettings2(env, ctx.school.id);
  const { results: students } = await env.DB.prepare(
    `SELECT st.id, st.admission_no, st.first_name, st.middle_name, st.last_name, st.gender
     FROM sch_enrollments e JOIN sch_students st ON st.id = e.student_id
     WHERE e.class_id = ? AND e.academic_year_id = ? AND st.school_id = ? ORDER BY st.first_name COLLATE NOCASE, st.last_name COLLATE NOCASE`
  ).bind(ex.class_id, ex.academic_year_id, ctx.school.id).all();
  const { results: marks } = await env.DB.prepare("SELECT student_id, subject_id, marks FROM sch_results WHERE exam_id = ?").bind(ex.id).all();
  const { results: subs } = await env.DB.prepare("SELECT id, name, code FROM sch_subjects WHERE school_id = ?").bind(ctx.school.id).all();
  const subjectsById = Object.fromEntries(subs.map((s) => [s.id, s]));
  const sheet = buildResultSheet({ exam: ex, students, results: marks, subjectsById, scale: settings.grading_scale, divisionCfg: settings.division });
  return { settings, students, sheet, subjectsById };
}
__name(loadSheet, "loadSheet");
var examSheet = secure({ perm: "results.view" }, async ({ env, params, ctx }) => {
  const ex = await examForCtx(env, ctx, params.id);
  const { students, sheet, subjectsById } = await loadSheet(env, ctx, ex);
  const byId = Object.fromEntries(students.map((s) => [s.id, s]));
  const usedSubjects = [...new Set(sheet.rows.flatMap((r) => r.subjects.map((s) => s.subject_id)))].map((id) => subjectsById[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
  const rows = sheet.rows.map((r) => ({ ...r, admission_no: byId[r.student_id].admission_no, full_name: studentFullName(byId[r.student_id]), gender: byId[r.student_id].gender })).sort((a, b) => (a.position || 9999) - (b.position || 9999) || a.full_name.localeCompare(b.full_name));
  const scored = sheet.rows.filter((r) => r.subject_count > 0);
  const classAverage = scored.length ? round2(scored.reduce((s, r) => s + r.average, 0) / scored.length) : null;
  return json({ exam: ex, subjects: usedSubjects, rows, out_of: sheet.out_of, class_average: classAverage });
});
async function buildReportCard(env, ctx, ex, studentId) {
  const { settings, students, sheet } = await loadSheet(env, ctx, ex);
  const st = students.find((s) => s.id === studentId);
  if (!st) fail(404, "This student is not in the examination's class.");
  const row = sheet.rows.find((r) => r.student_id === studentId);
  const cm = await env.DB.prepare("SELECT teacher_comment, remarks FROM sch_report_comments WHERE exam_id = ? AND student_id = ?").bind(ex.id, studentId).first();
  const att = await env.DB.prepare(
    `SELECT SUM(status = 'present') AS present, SUM(status = 'absent') AS absent, SUM(status = 'late') AS late FROM sch_attendance WHERE student_id = ?`
  ).bind(studentId).first();
  const scored = sheet.rows.filter((r) => r.subject_count > 0);
  const classAverage = scored.length ? round2(scored.reduce((s, r) => s + r.average, 0) / scored.length) : null;
  const overall = row.subject_count ? gradeFor(row.average, 100, settings.grading_scale) : null;
  const suggested = overall ? { A: "Outstanding performance. Keep up the excellent work.", B: "Very good results. A little more effort will reach the top.", C: "Good work. Focus on weaker subjects to improve further.", D: "Fair performance. More revision and practice are needed." }[overall.grade] || "Performance is below expectation. Extra support and regular revision are strongly advised." : "";
  const sc = ctx.school;
  return {
    school: { name: sc.name, short_name: sc.short_name, phone: sc.phone, email: sc.email, address: sc.address, website: sc.website, has_logo: !!sc.logo_key, id: sc.id, primary_color: sc.primary_color },
    student: { id: st.id, admission_no: st.admission_no, full_name: studentFullName(st), gender: st.gender },
    exam: { id: ex.id, name: ex.name, exam_type: ex.exam_type, term_name: ex.term_name, year_name: ex.year_name, class_name: label({ name: ex.class_name, stream: ex.class_stream }), exam_date: ex.exam_date, max_marks: ex.max_marks },
    subjects: row.subjects,
    total: row.total,
    subject_count: row.subject_count,
    average: row.average,
    grade: row.grade,
    remarks_overall: row.remarks,
    position: row.position,
    position_label: row.position ? `${ordinal(row.position)} out of ${sheet.out_of}` : "\u2014",
    out_of: sheet.out_of,
    division: row.division,
    division_points: row.division_points,
    class_average: classAverage,
    attendance_percent: att ? attendancePercent(att.present || 0, att.absent || 0, att.late || 0) : null,
    teacher_comment: cm ? cm.teacher_comment : null,
    academic_remarks: cm && cm.remarks ? cm.remarks : row.remarks,
    suggested_comment: suggested,
    grading_scale: settings.grading_scale
  };
}
__name(buildReportCard, "buildReportCard");
var reportCard = secure({ parent: true }, async ({ env, url, ctx }) => {
  if (ctx.role !== "parent" && !can2(ctx, "results.view")) fail(403, "You do not have permission to view results.");
  const studentId = V.int(url.searchParams.get("student_id"), "Student", { required: true, min: 1 });
  await loadStudentForCtx(env, ctx, studentId);
  const ex = await examForCtx(env, ctx, Number(url.searchParams.get("exam_id") || 0));
  return json({ report: await buildReportCard(env, ctx, ex, studentId) });
});
var saveReportComment = secure({ perm: "results.enter" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const ex = await examForCtx(env, ctx, V.int(b.exam_id, "Examination", { required: true, min: 1 }));
  const studentId = V.int(b.student_id, "Student", { required: true, min: 1 });
  const st = await env.DB.prepare("SELECT id FROM sch_enrollments WHERE student_id = ? AND class_id = ?").bind(studentId, ex.class_id).first();
  if (!st) fail(400, "This student is not in the examination's class.");
  await env.DB.prepare(
    `INSERT INTO sch_report_comments (school_id, exam_id, student_id, teacher_comment, remarks, updated_by) VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(exam_id, student_id) DO UPDATE SET teacher_comment = excluded.teacher_comment, remarks = excluded.remarks, updated_by = excluded.updated_by, updated_at = datetime('now')`
  ).bind(ctx.school.id, ex.id, studentId, V.str(b.teacher_comment, "Teacher comment", { max: 500 }), V.str(b.remarks, "Remarks", { max: 300 }), ctx.user.id).run();
  await audit(env, request, ctx, "result.comment", "exam", ex.id, `student #${studentId}`);
  return json({ ok: true });
});
var studentResults = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== "parent" && !can2(ctx, "results.view")) fail(403, "You do not have permission to view results.");
  const st = await loadStudentForCtx(env, ctx, params.id);
  const { results: exams } = await env.DB.prepare(
    `SELECT DISTINCT x.* FROM sch_examinations x JOIN sch_results r ON r.exam_id = x.id WHERE r.student_id = ? ORDER BY COALESCE(x.exam_date, x.created_at) DESC, x.id DESC`
  ).bind(st.id).all();
  const out = [];
  for (const ex of exams.slice(0, 12)) {
    const full = { ...ex, class_name: "", class_stream: "" };
    const { sheet } = await loadSheet(env, ctx, full);
    const row = sheet.rows.find((r) => r.student_id === st.id);
    if (!row) continue;
    out.push({
      exam_id: ex.id,
      exam_name: ex.name,
      exam_type: ex.exam_type,
      exam_date: ex.exam_date,
      max_marks: ex.max_marks,
      subjects: row.subjects,
      total: row.total,
      average: row.average,
      grade: row.grade,
      division: row.division,
      position: row.position,
      position_label: row.position ? `${ordinal(row.position)} / ${sheet.out_of}` : "\u2014"
    });
  }
  return json({ results: out });
});

// src/handlers/school/operations.js
init_auth();
init_school_auth();
init_school_calc();
var classLabel = /* @__PURE__ */ __name((c) => `${c.name}${c.stream ? " " + c.stream : ""}`, "classLabel");
async function classForAttendance(env, ctx, classId) {
  const c = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(classId, ctx.school.id).first();
  if (!c) fail(404, "Class not found.");
  if (ctx.role === "teacher" && !(await teacherClassIds(env, ctx)).includes(c.id)) fail(403, "This is not one of your classes.");
  return c;
}
__name(classForAttendance, "classForAttendance");
var attendanceSheet = secure({ perm: ["attendance.take", "attendance.view"] }, async ({ env, url, ctx }) => {
  const cls = await classForAttendance(env, ctx, V.int(url.searchParams.get("class_id"), "Class", { required: true, min: 1 }));
  const date = V.date(url.searchParams.get("date"), "Date") || todayISO();
  const subjectId = Number(url.searchParams.get("subject_id") || 0);
  const subjectJoin = subjectId ? "JOIN sch_student_subjects ss ON ss.student_id = st.id AND ss.subject_id = ? AND ss.academic_year_id = e.academic_year_id" : "";
  const binds = subjectId ? [subjectId] : [];
  const { results } = await env.DB.prepare(
    `SELECT st.id, st.admission_no, st.first_name, st.middle_name, st.last_name, a.status
     FROM sch_enrollments e JOIN sch_students st ON st.id = e.student_id ${subjectJoin}
     LEFT JOIN sch_attendance a ON a.student_id = st.id AND a.class_id = e.class_id AND a.subject_id = ${subjectId ? subjectId : 0} AND a.date = '${date}'
     WHERE e.class_id = ? AND e.academic_year_id = ? AND st.status = 'active' AND st.school_id = ?
     ORDER BY st.first_name COLLATE NOCASE, st.last_name COLLATE NOCASE`
  ).bind(...binds, cls.id, cls.academic_year_id, ctx.school.id).all();
  return json({
    class: { id: cls.id, name: classLabel(cls) },
    date,
    subject_id: subjectId || null,
    students: results.map((s) => ({ id: s.id, admission_no: s.admission_no, full_name: studentFullName(s), status: s.status || null })),
    already_saved: results.some((s) => s.status),
    can_take: can2(ctx, "attendance.take")
  });
});
var saveAttendance = secure({ perm: "attendance.take" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const cls = await classForAttendance(env, ctx, V.int(b.class_id, "Class", { required: true, min: 1 }));
  const date = V.date(b.date, "Date", { required: true });
  if (date > todayISO()) fail(400, "You cannot record attendance for a future date.");
  const subjectId = b.subject_id ? V.int(b.subject_id, "Subject", { min: 1 }) : 0;
  if (subjectId) {
    const ok2 = await env.DB.prepare("SELECT 1 AS x FROM sch_class_subjects WHERE class_id = ? AND subject_id = ?").bind(cls.id, subjectId).first();
    if (!ok2) fail(400, "That subject is not taught in this class.");
  }
  if (!Array.isArray(b.records) || !b.records.length) fail(400, "There is no attendance to save.");
  const { results: enrolled } = await env.DB.prepare(
    "SELECT student_id FROM sch_enrollments WHERE class_id = ? AND academic_year_id = ?"
  ).bind(cls.id, cls.academic_year_id).all();
  const ok = new Set(enrolled.map((r) => r.student_id));
  const counts = { present: 0, absent: 0, late: 0 };
  const stmts = b.records.map((r) => {
    const studentId = V.int(r.student_id, "Student", { required: true, min: 1 });
    if (!ok.has(studentId)) fail(400, "One of the students is not in this class.");
    const status = V.oneOf(r.status, "Attendance status", ["present", "absent", "late"], { required: true });
    counts[status] += 1;
    return env.DB.prepare(
      `INSERT INTO sch_attendance (school_id, student_id, class_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(student_id, class_id, subject_id, date) DO UPDATE SET status = excluded.status, marked_by = excluded.marked_by, updated_at = datetime('now')`
    ).bind(ctx.school.id, studentId, cls.id, subjectId, date, status, ctx.user.id);
  });
  for (let i = 0; i < stmts.length; i += 90) await env.DB.batch(stmts.slice(i, i + 90));
  await audit(env, request, ctx, "attendance.save", "class", cls.id, `${classLabel(cls)} ${date}: ${counts.present} present, ${counts.absent} absent, ${counts.late} late`);
  return json({ ok: true, ...counts });
});
async function attendanceCounts(env, ctx, from, to, { classIds = null, classId = null } = {}) {
  const where = ["a.school_id = ?", "a.date >= ?", "a.date <= ?"];
  const binds = [ctx.school.id, from, to];
  if (classId) {
    where.push("a.class_id = ?");
    binds.push(classId);
  }
  if (classIds) {
    if (!classIds.length) return { present: 0, absent: 0, late: 0, percent: null };
    where.push(`a.class_id IN (${classIds.map(() => "?").join(",")})`);
    binds.push(...classIds);
  }
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(a.status = 'present'), 0) AS present, COALESCE(SUM(a.status = 'absent'), 0) AS absent, COALESCE(SUM(a.status = 'late'), 0) AS late
     FROM sch_attendance a WHERE ${where.join(" AND ")}`
  ).bind(...binds).first();
  return { ...r, percent: attendancePercent(r.present, r.absent, r.late) };
}
__name(attendanceCounts, "attendanceCounts");
var attendanceSummary = secure({ perm: ["attendance.view", "attendance.take", "reports.view"] }, async ({ env, url, ctx }) => {
  const date = V.date(url.searchParams.get("date"), "Date") || todayISO();
  const classId = Number(url.searchParams.get("class_id") || 0) || null;
  const classIds = ctx.role === "teacher" ? await teacherClassIds(env, ctx) : null;
  const [ws, we] = weekRange(date);
  const [ms, me2] = monthRange(date);
  const opt = { classIds, classId };
  const [day, week, month] = await Promise.all([
    attendanceCounts(env, ctx, date, date, opt),
    attendanceCounts(env, ctx, ws, we, opt),
    attendanceCounts(env, ctx, ms, me2, opt)
  ]);
  const where = ["a.school_id = ?", "a.date >= date(?, '-13 days')", "a.date <= ?"];
  const binds = [ctx.school.id, date, date];
  if (classId) {
    where.push("a.class_id = ?");
    binds.push(classId);
  }
  if (classIds) {
    if (!classIds.length) where.push("1 = 0");
    else {
      where.push(`a.class_id IN (${classIds.map(() => "?").join(",")})`);
      binds.push(...classIds);
    }
  }
  const { results: daily } = await env.DB.prepare(
    `SELECT a.date, SUM(a.status = 'present') AS present, SUM(a.status = 'absent') AS absent, SUM(a.status = 'late') AS late
     FROM sch_attendance a WHERE ${where.join(" AND ")} GROUP BY a.date ORDER BY a.date`
  ).bind(...binds).all();
  return json({ date, day, week, month, daily });
});
async function absenceAlerts(env, ctx, { date = todayISO(), classIds = null, limit = 20 } = {}) {
  const settings = await getSettings2(env, ctx.school.id);
  const [ms, me2] = monthRange(date);
  const where = [`a.school_id = ?`, `a.status = 'absent'`, `a.date >= ?`, `a.date <= ?`];
  const binds = [ctx.school.id, ms, me2];
  if (classIds) {
    if (!classIds.length) return { threshold: settings.absence_alert_threshold, alerts: [] };
    where.push(`a.class_id IN (${classIds.map(() => "?").join(",")})`);
    binds.push(...classIds);
  }
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.first_name, s.middle_name, s.last_name, s.admission_no, COUNT(*) AS missed,
            (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id
              WHERE e.student_id = s.id ORDER BY e.academic_year_id DESC LIMIT 1) AS class_name
     FROM sch_attendance a JOIN sch_students s ON s.id = a.student_id
     WHERE ${where.join(" AND ")} AND s.status = 'active' GROUP BY s.id HAVING COUNT(*) >= ? ORDER BY missed DESC, s.first_name LIMIT ?`
  ).bind(...binds, settings.absence_alert_threshold, limit).all();
  return {
    threshold: settings.absence_alert_threshold,
    alerts: results.map((r) => ({
      student_id: r.id,
      full_name: studentFullName(r),
      admission_no: r.admission_no,
      class_name: r.class_name,
      missed: r.missed,
      message: `${r.first_name} has missed ${r.missed} session${r.missed > 1 ? "s" : ""} this month.`
    }))
  };
}
__name(absenceAlerts, "absenceAlerts");
var attendanceAlerts = secure({ perm: ["attendance.view", "attendance.take"] }, async ({ env, ctx }) => {
  const classIds = ctx.role === "teacher" ? await teacherClassIds(env, ctx) : null;
  return json(await absenceAlerts(env, ctx, { classIds, limit: 50 }));
});
var studentAttendance = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== "parent" && !can2(ctx, "attendance.view") && !can2(ctx, "students.view")) fail(403, "You do not have permission to view attendance.");
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
var FEE_TYPES = ["registration", "tuition", "examination", "other"];
var listFeeStructures = secure({ perm: "fees.view" }, async ({ env, url, ctx }) => {
  const yearId = Number(url.searchParams.get("year") || 0) || (await currentYear(env, ctx.school.id)).id;
  const { results } = await env.DB.prepare(
    `SELECT f.*, c.name AS class_name, c.stream AS class_stream FROM sch_fee_structures f LEFT JOIN sch_classes c ON c.id = f.class_id
     WHERE f.school_id = ? AND f.academic_year_id = ? ORDER BY f.due_date IS NULL, f.due_date, f.id`
  ).bind(ctx.school.id, yearId).all();
  return json({ year_id: yearId, structures: results });
});
async function readFee(env, ctx, b) {
  let classId = null;
  if (b.class_id) {
    const c = await env.DB.prepare("SELECT id, academic_year_id FROM sch_classes WHERE id = ? AND school_id = ?").bind(b.class_id, ctx.school.id).first();
    if (!c) fail(400, "Please choose a valid class.");
    classId = c.id;
  }
  const yearId = b.academic_year_id ? V.int(b.academic_year_id, "Academic year", { min: 1 }) : (await currentYear(env, ctx.school.id)).id;
  const y = await env.DB.prepare("SELECT id FROM sch_academic_years WHERE id = ? AND school_id = ?").bind(yearId, ctx.school.id).first();
  if (!y) fail(400, "Please choose a valid academic year.");
  return {
    academic_year_id: yearId,
    class_id: classId,
    fee_type: V.oneOf(b.fee_type, "Fee type", FEE_TYPES, { required: true }),
    name: V.str(b.name, "Fee name", { required: true, max: 80 }),
    amount: round2(V.num(b.amount, "Amount", { required: true, min: 0, max: 1e9 })),
    due_date: V.date(b.due_date, "Due date")
  };
}
__name(readFee, "readFee");
var createFeeStructure = secure({ perm: "fees.manage" }, async ({ request, env, ctx }) => {
  const f = await readFee(env, ctx, await readJson(request));
  const r = await env.DB.prepare(
    "INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount, due_date) VALUES (?, ?, ?, ?, ?, ?, ?)"
  ).bind(ctx.school.id, f.academic_year_id, f.class_id, f.fee_type, f.name, f.amount, f.due_date).run();
  await audit(env, request, ctx, "fee.create", "fee_structure", r.meta.last_row_id, `${f.name}: ${f.amount}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updateFeeStructure = secure({ perm: "fees.manage" }, async ({ request, env, params, ctx }) => {
  const f = await readFee(env, ctx, await readJson(request));
  const r = await env.DB.prepare(
    "UPDATE sch_fee_structures SET class_id = ?, fee_type = ?, name = ?, amount = ?, due_date = ? WHERE id = ? AND school_id = ?"
  ).bind(f.class_id, f.fee_type, f.name, f.amount, f.due_date, params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, "Fee not found.");
  await audit(env, request, ctx, "fee.update", "fee_structure", Number(params.id), `${f.name}: ${f.amount}`);
  return json({ ok: true });
});
var deleteFeeStructure = secure({ perm: "fees.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM sch_fee_structures WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, "Fee not found.");
  await audit(env, request, ctx, "fee.delete", "fee_structure", Number(params.id), null);
  return json({ ok: true });
});
async function financeRows(env, ctx, { yearId, classId = 0, q = "" } = {}) {
  const year = yearId || (await currentYear(env, ctx.school.id)).id;
  const where = ["s.school_id = ?"];
  const binds = [ctx.school.id];
  if (classId) {
    where.push("e.class_id = ?");
    binds.push(classId);
  }
  if (q) {
    const l = likeTerm(q);
    where.push(`(${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\')`);
    binds.push(l, l);
  }
  const { results } = await env.DB.prepare(
    `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status, c.name AS class_name, c.stream AS class_stream, e.class_id,
       (SELECT p.full_name FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_name,
       (SELECT p.phone FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_phone,
       ${feeColumns(todayISO())}
     FROM sch_students s JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${Number(year)}
     JOIN sch_classes c ON c.id = e.class_id WHERE ${where.join(" AND ")} ORDER BY s.first_name COLLATE NOCASE, s.last_name COLLATE NOCASE`
  ).bind(...binds).all();
  return results.map((r) => ({
    student_id: r.id,
    admission_no: r.admission_no,
    full_name: studentFullName(r),
    status: r.status,
    class_name: classLabel({ name: r.class_name, stream: r.class_stream }),
    class_id: r.class_id,
    parent_name: r.parent_name,
    parent_phone: r.parent_phone,
    ...feeFromRow(r)
  }));
}
__name(financeRows, "financeRows");
var feesOverview = secure({ perm: "fees.view" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 25, 100);
  const status = url.searchParams.get("status");
  if (status) V.oneOf(status, "Status", ["paid", "partial", "pending", "overdue"]);
  const rows = await financeRows(env, ctx, { classId: Number(url.searchParams.get("class_id") || 0), q: (url.searchParams.get("q") || "").trim() });
  const counts = { paid: 0, partial: 0, pending: 0, overdue: 0 };
  let sumTotal = 0;
  let sumPaid = 0;
  let sumBalance = 0;
  rows.forEach((r) => {
    counts[r.status] += 1;
    sumTotal += r.total;
    sumPaid += r.paid;
    sumBalance += r.balance;
  });
  const summary2 = { total_fees: round2(sumTotal), total_paid: round2(sumPaid), outstanding: round2(sumBalance), counts };
  const filtered = status ? rows.filter((r) => r.status === status) : rows;
  return json({ students: filtered.slice(offset, offset + limit), total: filtered.length, page, limit, summary: summary2 });
});
var studentFees = secure({ parent: true }, async ({ env, params, ctx }) => {
  if (ctx.role !== "parent" && !can2(ctx, "fees.view")) fail(403, "You do not have permission to view fees.");
  const st = await loadStudentForCtx(env, ctx, params.id);
  const enr = await env.DB.prepare(
    "SELECT e.* FROM sch_enrollments e JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = ? ORDER BY y.is_current DESC, y.name DESC LIMIT 1"
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
  const summary2 = feeSummary(items, paid, todayISO());
  return json({ enrolled: true, summary: summary2, items: summary2.lines, payments });
});
async function nextReceiptNo(env, ctx, prefix, date) {
  const year = String(date).slice(0, 4);
  const stem = `${prefix}-${year}-`;
  const last = await env.DB.prepare("SELECT receipt_no FROM sch_receipts WHERE school_id = ? AND receipt_no LIKE ? ORDER BY receipt_no DESC LIMIT 1").bind(ctx.school.id, stem + "%").first();
  const seq = last ? (parseInt(last.receipt_no.slice(stem.length), 10) || 0) + 1 : 1;
  return stem + String(seq).padStart(6, "0");
}
__name(nextReceiptNo, "nextReceiptNo");
async function studentBalance(env, ctx, studentId, yearId, excludePaymentId = 0) {
  const { results: items } = await env.DB.prepare(
    `SELECT id, name, fee_type, amount, due_date FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ?
     AND (class_id IS NULL OR class_id = (SELECT class_id FROM sch_enrollments WHERE student_id = ? AND academic_year_id = ?))`
  ).bind(ctx.school.id, yearId, studentId, yearId).all();
  const paid = await env.DB.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM sch_payments WHERE student_id = ? AND academic_year_id = ? AND id != ?").bind(studentId, yearId, excludePaymentId).first();
  return { summary: feeSummary(items, paid.n, todayISO()), paidBefore: paid.n };
}
__name(studentBalance, "studentBalance");
function cleanMethod(value, methods) {
  const m = V.str(value, "Payment method", { required: true, max: 40 });
  const hit = methods.find((x) => x.toLowerCase() === m.toLowerCase());
  if (!hit) fail(400, `Payment method must be one of: ${methods.join(", ")}.`);
  return hit;
}
__name(cleanMethod, "cleanMethod");
var needsReference = /* @__PURE__ */ __name((method) => !["cash", "other"].includes(method.toLowerCase()), "needsReference");
var recordPayment = secure({ perm: "fees.record" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const st = await loadStudentForCtx(env, ctx, V.int(b.student_id, "Student", { required: true, min: 1 }));
  const settings = await getSettings2(env, ctx.school.id);
  const amount = round2(V.num(b.amount, "Amount", { required: true, min: 0.01, max: 1e9 }));
  const date = V.date(b.payment_date, "Payment date") || todayISO();
  if (date > todayISO()) fail(400, "The payment date cannot be in the future.");
  const method = cleanMethod(b.method, settings.payment_methods);
  const reference = V.str(b.reference, "Reference number", { max: 80 });
  if (needsReference(method) && !reference) fail(400, `A reference / transaction number is required for ${method} payments.`);
  if (reference) {
    const dupe = await env.DB.prepare("SELECT id FROM sch_payments WHERE school_id = ? AND lower(reference) = lower(?) AND lower(method) = lower(?)").bind(ctx.school.id, reference, method).first();
    if (dupe) fail(409, `A ${method} payment with reference ${reference} has already been recorded.`);
  }
  const enr = await env.DB.prepare(
    "SELECT e.* FROM sch_enrollments e JOIN sch_academic_years y ON y.id = e.academic_year_id WHERE e.student_id = ? ORDER BY y.is_current DESC, y.name DESC LIMIT 1"
  ).bind(st.id).first();
  if (!enr) fail(400, "This student is not enrolled in a class yet.");
  const { summary: summary2 } = await studentBalance(env, ctx, st.id, enr.academic_year_id);
  if (summary2.total <= 0) fail(400, "No fees have been set for this student's class. Add a fee structure first.");
  if (amount > summary2.balance + 1e-3) fail(400, `The amount is more than the outstanding balance (${summary2.balance.toLocaleString()} ${ctx.school.currency}). Enter ${summary2.balance.toLocaleString()} or less.`);
  let paymentId = null;
  let receiptNo = null;
  for (let attempt = 0; attempt < 4 && !paymentId; attempt += 1) {
    receiptNo = await nextReceiptNo(env, ctx, settings.receipt_prefix, date);
    const ins = await env.DB.prepare(
      `INSERT INTO sch_payments (school_id, student_id, academic_year_id, amount, payment_date, method, reference, received_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(ctx.school.id, st.id, enr.academic_year_id, amount, date, method, reference, ctx.user.id, V.str(b.notes, "Notes", { max: 300 })).run();
    const pid = ins.meta.last_row_id;
    try {
      await env.DB.prepare("INSERT INTO sch_receipts (school_id, payment_id, receipt_no) VALUES (?, ?, ?)").bind(ctx.school.id, pid, receiptNo).run();
      paymentId = pid;
    } catch (e) {
      await env.DB.prepare("DELETE FROM sch_payments WHERE id = ?").bind(pid).run();
      if (!/UNIQUE/i.test(String(e))) throw e;
    }
  }
  if (!paymentId) fail(500, "Could not create a receipt number. Please try again.");
  const balance = round2(summary2.balance - amount);
  await env.DB.prepare(
    `INSERT INTO sch_notifications (school_id, title, message, type, audience, student_id, created_by) VALUES (?, ?, ?, 'general', 'student', ?, ?)`
  ).bind(ctx.school.id, "Payment received", `We received ${ctx.school.currency} ${amount.toLocaleString()} for ${studentFullName(st)} on ${date} (receipt ${receiptNo}). Remaining balance: ${ctx.school.currency} ${balance.toLocaleString()}.`, st.id, ctx.user.id).run();
  await audit(env, request, ctx, "payment.create", "payment", paymentId, `${studentFullName(st)}: ${amount} via ${method} (${receiptNo})`);
  return json({ ok: true, id: paymentId, receipt_no: receiptNo, balance }, { status: 201 });
});
var listPayments = secure({ perm: "fees.view" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 25, 100);
  const where = ["p.school_id = ?"];
  const binds = [ctx.school.id];
  const studentId = Number(url.searchParams.get("student_id") || 0);
  if (studentId) {
    where.push("p.student_id = ?");
    binds.push(studentId);
  }
  const from = V.date(url.searchParams.get("from"), "From");
  const to = V.date(url.searchParams.get("to"), "To");
  if (from) {
    where.push("p.payment_date >= ?");
    binds.push(from);
  }
  if (to) {
    where.push("p.payment_date <= ?");
    binds.push(to);
  }
  const method = url.searchParams.get("method");
  if (method) {
    where.push("lower(p.method) = lower(?)");
    binds.push(method);
  }
  const q = (url.searchParams.get("q") || "").trim();
  if (q) {
    const l = likeTerm(q);
    where.push(`(${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\' OR r.receipt_no LIKE ? ESCAPE '\\' OR p.reference LIKE ? ESCAPE '\\')`);
    binds.push(l, l, l, l);
  }
  const base = `FROM sch_payments p JOIN sch_students s ON s.id = p.student_id LEFT JOIN sch_receipts r ON r.payment_id = p.id LEFT JOIN users u ON u.id = p.received_by WHERE ${where.join(" AND ")}`;
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(p.amount), 0) AS sum ${base}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.amount, p.payment_date, p.method, p.reference, p.notes, p.created_at, r.receipt_no, u.name AS received_by_name,
            s.id AS student_id, s.admission_no, s.first_name, s.middle_name, s.last_name ${base} ORDER BY p.payment_date DESC, p.id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  return json({ payments: results.map((r) => ({ ...r, student_name: studentFullName(r) })), total: total.n, sum: round2(total.sum), page, limit });
});
var getReceipt2 = secure({ parent: true }, async ({ request, env, params, ctx }) => {
  const p = await env.DB.prepare(
    `SELECT p.*, r.receipt_no, r.issued_at, u.name AS received_by_name FROM sch_payments p LEFT JOIN sch_receipts r ON r.payment_id = p.id
     LEFT JOIN users u ON u.id = p.received_by WHERE p.id = ? AND p.school_id = ?`
  ).bind(params.id, ctx.school.id).first();
  if (!p) fail(404, "Payment not found.");
  if (ctx.role !== "parent" && !can2(ctx, "fees.view") && !can2(ctx, "fees.record")) fail(403, "You do not have permission to view receipts.");
  const st = await loadStudentForCtx(env, ctx, p.student_id);
  const enr = await env.DB.prepare(
    `SELECT c.name, c.stream FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id WHERE e.student_id = ? AND e.academic_year_id = ?`
  ).bind(st.id, p.academic_year_id).first();
  const upTo = await env.DB.prepare("SELECT COALESCE(SUM(amount), 0) AS n FROM sch_payments WHERE student_id = ? AND academic_year_id = ? AND id <= ?").bind(st.id, p.academic_year_id, p.id).first();
  const { summary: summary2 } = await studentBalance(env, ctx, st.id, p.academic_year_id, 0);
  const settings = await getSettings2(env, ctx.school.id);
  const sc = ctx.school;
  await audit(env, request, ctx, "receipt.view", "payment", p.id, p.receipt_no);
  return json({
    receipt: {
      receipt_no: p.receipt_no,
      issued_at: p.issued_at,
      payment_date: p.payment_date,
      amount: p.amount,
      method: p.method,
      reference: p.reference,
      notes: p.notes,
      received_by: p.received_by_name,
      currency: sc.currency,
      total_fees: summary2.total,
      paid_to_date: round2(upTo.n),
      balance: round2(Math.max(summary2.total - upTo.n, 0)),
      footer: settings.receipt_footer,
      student: { id: st.id, name: studentFullName(st), admission_no: st.admission_no, class_name: enr ? classLabel(enr) : "\u2014" },
      school: { id: sc.id, name: sc.name, short_name: sc.short_name, phone: sc.phone, email: sc.email, address: sc.address, has_logo: !!sc.logo_key, primary_color: sc.primary_color }
    }
  });
});
var updatePayment = secure({ perm: "fees.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const p = await env.DB.prepare("SELECT * FROM sch_payments WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).first();
  if (!p) fail(404, "Payment not found.");
  const settings = await getSettings2(env, ctx.school.id);
  const amount = round2(V.num(b.amount ?? p.amount, "Amount", { required: true, min: 0.01, max: 1e9 }));
  const date = V.date(b.payment_date ?? p.payment_date, "Payment date", { required: true });
  if (date > todayISO()) fail(400, "The payment date cannot be in the future.");
  const method = cleanMethod(b.method ?? p.method, settings.payment_methods);
  const reference = V.str(b.reference !== void 0 ? b.reference : p.reference, "Reference number", { max: 80 });
  if (needsReference(method) && !reference) fail(400, `A reference / transaction number is required for ${method} payments.`);
  const { summary: summary2 } = await studentBalance(env, ctx, p.student_id, p.academic_year_id, p.id);
  if (amount > summary2.balance + 1e-3) fail(400, `That amount is more than the student's outstanding balance without this payment (${summary2.balance.toLocaleString()}).`);
  await env.DB.prepare(
    `UPDATE sch_payments SET amount = ?, payment_date = ?, method = ?, reference = ?, notes = ?, updated_at = datetime('now') WHERE id = ?`
  ).bind(amount, date, method, reference, b.notes !== void 0 ? V.str(b.notes, "Notes", { max: 300 }) : p.notes, p.id).run();
  await audit(env, request, ctx, "payment.update", "payment", p.id, `amount ${p.amount}\u2192${amount}, method ${p.method}\u2192${method}`);
  return json({ ok: true });
});
var sendFeeReminders = secure({ perm: ["fees.manage", "announcements.manage"] }, async ({ request, env, ctx }) => {
  const rows = (await financeRows(env, ctx, {})).filter((r) => r.status === "overdue");
  let sent = 0;
  for (const r of rows) {
    const recent = await env.DB.prepare(
      `SELECT id FROM sch_notifications WHERE school_id = ? AND student_id = ? AND type = 'fee_reminder' AND created_at > datetime('now', '-7 days') LIMIT 1`
    ).bind(ctx.school.id, r.student_id).first();
    if (recent) continue;
    await env.DB.prepare(
      `INSERT INTO sch_notifications (school_id, title, message, type, audience, student_id, created_by) VALUES (?, ?, ?, 'fee_reminder', 'student', ?, ?)`
    ).bind(ctx.school.id, "Fee reminder", `Dear parent/guardian, ${r.full_name} has an overdue fee balance of ${ctx.school.currency} ${r.balance.toLocaleString()}. Please make a payment as soon as possible.`, r.student_id, ctx.user.id).run();
    sent += 1;
  }
  await audit(env, request, ctx, "fee.reminders", "notification", null, `${sent} reminders sent (${rows.length} overdue)`);
  return json({ ok: true, sent, overdue: rows.length });
});

// src/handlers/school/insights.js
init_auth();
init_school_auth();
init_school_calc();
var classLabel2 = /* @__PURE__ */ __name((c) => `${c.name}${c.stream ? " " + c.stream : ""}`, "classLabel");
async function attRange(env, sid, from, to, classIds) {
  const where = ["school_id = ?", "date >= ?", "date <= ?"];
  const binds = [sid, from, to];
  if (classIds) {
    if (!classIds.length) return { present: 0, absent: 0, late: 0, percent: null };
    where.push(`class_id IN (${classIds.map(() => "?").join(",")})`);
    binds.push(...classIds);
  }
  const r = await env.DB.prepare(
    `SELECT COALESCE(SUM(status = 'present'), 0) AS present, COALESCE(SUM(status = 'absent'), 0) AS absent, COALESCE(SUM(status = 'late'), 0) AS late FROM sch_attendance WHERE ${where.join(" AND ")}`
  ).bind(...binds).first();
  return { ...r, percent: attendancePercent(r.present, r.absent, r.late) };
}
__name(attRange, "attRange");
var dashboard = secure({}, async ({ env, ctx }) => {
  const sid = ctx.school.id;
  const today = todayISO();
  const year = await currentYear(env, sid).catch(() => null);
  const isTeacher = ctx.role === "teacher";
  const classIds = isTeacher ? await teacherClassIds(env, ctx) : null;
  const out = { role: ctx.role, year: year ? year.name : null, today };
  const one2 = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(...b).first(), "one");
  const many = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results), "many");
  const inClasses = classIds ? `AND e.class_id IN (${classIds.length ? classIds.join(",") : "0"})` : "";
  if (can2(ctx, "students.view")) {
    const yid = year ? year.id : 0;
    const totals = await one2(
      `SELECT COUNT(*) AS total, COALESCE(SUM(s.status = 'active'), 0) AS active,
              COALESCE(SUM(s.admission_date >= date('now', '-30 days')), 0) AS new_students,
              COALESCE(SUM(s.gender = 'male'), 0) AS male, COALESCE(SUM(s.gender = 'female'), 0) AS female
       FROM sch_students s ${classIds || true ? `LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${yid}` : ""}
       WHERE s.school_id = ? ${isTeacher ? "AND e.class_id IS NOT NULL " + inClasses : ""}`,
      sid
    );
    out.students = totals;
  }
  if (ctx.role === "admin" || can2(ctx, "teachers.manage")) {
    out.teachers = await one2(`SELECT COUNT(*) AS total, COALESCE(SUM(employment_status != 'resigned'), 0) AS active FROM sch_teachers WHERE school_id = ?`, sid);
  }
  if (can2(ctx, "attendance.view") || can2(ctx, "attendance.take")) {
    const [ms, me2] = monthRange(today);
    const [ws, we] = weekRange(today);
    const [d, w, m] = await Promise.all([attRange(env, sid, today, today, classIds), attRange(env, sid, ws, we, classIds), attRange(env, sid, ms, me2, classIds)]);
    out.attendance = { today: d, week: w, month: m };
    const alerts2 = await absenceAlerts(env, ctx, { classIds, limit: 8 });
    out.absence_alerts = alerts2.alerts;
    out.absence_threshold = alerts2.threshold;
  }
  if (can2(ctx, "fees.view") && year) {
    const rows = await financeRows(env, ctx, {});
    const counts = { paid: 0, partial: 0, pending: 0, overdue: 0 };
    let outstanding = 0;
    let withBalance = 0;
    let overdueAmt = 0;
    let pendingAmt = 0;
    let partialAmt = 0;
    let expected = 0;
    let paidSum = 0;
    rows.forEach((r) => {
      counts[r.status] += 1;
      expected += r.total;
      paidSum += r.paid;
      outstanding += r.balance;
      if (r.balance > 0) withBalance += 1;
      if (r.status === "overdue") overdueAmt += r.balance;
      if (r.status === "pending") pendingAmt += r.balance;
      if (r.status === "partial") partialAmt += r.balance;
    });
    const monthly = await many(
      `SELECT substr(payment_date, 1, 7) AS month, SUM(amount) AS total FROM sch_payments WHERE school_id = ? AND academic_year_id = ? GROUP BY substr(payment_date, 1, 7) ORDER BY month DESC LIMIT 6`,
      sid,
      year.id
    );
    const todayPay = await one2("SELECT COALESCE(SUM(amount), 0) AS total, COUNT(*) AS n FROM sch_payments WHERE school_id = ? AND payment_date = ?", sid, today);
    out.fees = {
      collected: round2(paidSum),
      expected: round2(expected),
      outstanding: round2(outstanding),
      students_with_balance: withBalance,
      counts,
      amounts: { paid: round2(paidSum), pending: round2(pendingAmt + partialAmt), overdue: round2(overdueAmt) },
      monthly: monthly.reverse(),
      today: { total: round2(todayPay.total), count: todayPay.n },
      currency: ctx.school.currency
    };
  }
  if (can2(ctx, "results.view") && year) {
    const clsFilter = classIds ? `AND x.class_id IN (${classIds.length ? classIds.join(",") : "0"})` : "";
    const [byClass, bySubject, byExam] = await Promise.all([
      many(`SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END AS label, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average
            FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_classes c ON c.id = x.class_id
            WHERE r.school_id = ? AND x.academic_year_id = ? ${clsFilter} GROUP BY c.id ORDER BY ${CLASS_ORDER}, c.name`, sid, year.id),
      many(`SELECT sub.name AS label, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average
            FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_subjects sub ON sub.id = r.subject_id
            WHERE r.school_id = ? AND x.academic_year_id = ? ${clsFilter} GROUP BY sub.id ORDER BY average DESC`, sid, year.id),
      many(`SELECT x.name || ' \xB7 ' || c.name AS label, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average
            FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_classes c ON c.id = x.class_id
            WHERE r.school_id = ? AND x.academic_year_id = ? ${clsFilter} GROUP BY x.id ORDER BY COALESCE(x.exam_date, x.created_at) DESC LIMIT 8`, sid, year.id)
    ]);
    out.performance = { by_class: byClass, by_subject: bySubject, by_exam: byExam.reverse() };
  }
  if (isTeacher) {
    const dow = ((/* @__PURE__ */ new Date()).getUTCDay() + 6) % 7 + 1;
    out.my_classes = classIds.length ? await many(
      `SELECT c.id, c.name, c.stream, (SELECT COUNT(*) FROM sch_enrollments e WHERE e.class_id = c.id) AS students FROM sch_classes c WHERE c.id IN (${classIds.join(",")}) ORDER BY c.name`
    ) : [];
    out.today_timetable = ctx.teacherId ? await many(
      `SELECT tt.start_time, tt.end_time, tt.room, sub.name AS subject, c.name AS class_name, c.stream FROM sch_timetable tt JOIN sch_subjects sub ON sub.id = tt.subject_id
       JOIN sch_classes c ON c.id = tt.class_id WHERE tt.school_id = ? AND tt.teacher_id = ? AND tt.day_of_week = ? ORDER BY tt.start_time`,
      sid,
      ctx.teacherId,
      dow
    ) : [];
  }
  if (can2(ctx, "audit.view")) {
    out.recent_activity = await many(
      `SELECT a.action, a.details, a.created_at, u.name AS user_name FROM sch_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.school_id = ? ORDER BY a.id DESC LIMIT 8`,
      sid
    );
  }
  return json(out);
});
var portal = secure({ parent: true, roles: ["parent"] }, async ({ env, ctx }) => {
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
     LEFT JOIN sch_classes c ON c.id = e.class_id WHERE s.id IN (${ids.map(() => "?").join(",")}) AND s.school_id = ? ORDER BY s.first_name`
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
      id: r.id,
      admission_no: r.admission_no,
      full_name: studentFullName(r),
      gender: r.gender,
      status: r.status,
      has_photo: !!r.has_photo,
      class_name: r.class_name ? classLabel2({ name: r.class_name, stream: r.stream }) : null,
      attendance_percent: attendancePercent(r.att_present, r.att_absent, r.att_late),
      attendance: { present: r.att_present, absent: r.att_absent, late: r.att_late },
      fee: { total: fee.total, paid: fee.paid, balance: fee.balance, status: fee.status },
      latest_result: latest
    });
  }
  return json({ children, parent_name: ctx.user.name, currency: ctx.school.currency });
});
async function visibilityClause(env, ctx) {
  if (can2(ctx, "announcements.manage")) return { sql: "1 = 1", binds: [] };
  if (ctx.role === "teacher") {
    const ids = await teacherClassIds(env, ctx);
    return { sql: `(n.audience IN ('all','teachers') OR (n.audience = 'class' AND n.class_id IN (${ids.length ? ids.join(",") : "0"})))`, binds: [] };
  }
  if (ctx.role === "parent") {
    const kids = await parentStudentIds(env, ctx);
    const kidList = kids.length ? kids.join(",") : "0";
    return {
      sql: `(n.audience IN ('all','parents') OR (n.audience = 'student' AND n.student_id IN (${kidList}))
             OR (n.audience = 'class' AND n.class_id IN (SELECT class_id FROM sch_enrollments WHERE student_id IN (${kidList}))))`,
      binds: []
    };
  }
  return { sql: `n.audience = 'all'`, binds: [] };
}
__name(visibilityClause, "visibilityClause");
var listNotifications2 = secure({ parent: true }, async ({ env, url, ctx }) => {
  const vis = await visibilityClause(env, ctx);
  const { page, limit, offset } = paging(url, 30, 100);
  const where = ["n.school_id = ?", vis.sql];
  const binds = [ctx.school.id, ...vis.binds];
  const type = url.searchParams.get("type");
  if (type) {
    where.push("n.type = ?");
    binds.push(type);
  }
  const { results } = await env.DB.prepare(
    `SELECT n.id, n.title, n.message, n.type, n.audience, n.class_id, n.student_id, n.created_at, (nr.user_id IS NOT NULL) AS is_read, u.name AS created_by_name,
            c.name AS class_name, c.stream AS class_stream, s.first_name AS student_first, s.last_name AS student_last
     FROM sch_notifications n LEFT JOIN sch_notification_reads nr ON nr.notification_id = n.id AND nr.user_id = ?
     LEFT JOIN users u ON u.id = n.created_by LEFT JOIN sch_classes c ON c.id = n.class_id LEFT JOIN sch_students s ON s.id = n.student_id
     WHERE ${where.join(" AND ")} ORDER BY n.id DESC LIMIT ? OFFSET ?`
  ).bind(ctx.user.id, ...binds, limit, offset).all();
  const unread = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM sch_notifications n WHERE n.school_id = ? AND ${vis.sql} AND NOT EXISTS (SELECT 1 FROM sch_notification_reads nr WHERE nr.notification_id = n.id AND nr.user_id = ?)`
  ).bind(ctx.school.id, ctx.user.id).first();
  return json({
    notifications: results.map((r) => ({ ...r, is_read: !!r.is_read, class_label: r.class_name ? classLabel2({ name: r.class_name, stream: r.class_stream }) : null, student_name: r.student_first ? `${r.student_first} ${r.student_last}` : null })),
    unread: unread.n
  });
});
var createNotification = secure({ perm: "announcements.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const title = V.str(b.title, "Title", { required: true, max: 120 });
  const message = V.str(b.message, "Message", { required: true, max: 2e3 });
  const type = V.oneOf(b.type, "Type", ["fee_reminder", "attendance_warning", "exam_announcement", "class_announcement", "general"], { def: "general" });
  const audience = V.oneOf(b.audience, "Send to", ["all", "teachers", "parents", "class", "student"], { required: true });
  let classId = null;
  let studentId = null;
  if (audience === "class") {
    const c = await env.DB.prepare("SELECT id FROM sch_classes WHERE id = ? AND school_id = ?").bind(V.int(b.class_id, "Class", { required: true, min: 1 }), ctx.school.id).first();
    if (!c) fail(400, "Please choose a valid class.");
    classId = c.id;
  }
  if (audience === "student") {
    const s = await env.DB.prepare("SELECT id FROM sch_students WHERE id = ? AND school_id = ?").bind(V.int(b.student_id, "Student", { required: true, min: 1 }), ctx.school.id).first();
    if (!s) fail(400, "Please choose a valid student.");
    studentId = s.id;
  }
  const r = await env.DB.prepare(
    "INSERT INTO sch_notifications (school_id, title, message, type, audience, class_id, student_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(ctx.school.id, title, message, type, audience, classId, studentId, ctx.user.id).run();
  await audit(env, request, ctx, "notification.create", "notification", r.meta.last_row_id, `${type} \u2192 ${audience}: ${title}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var markRead2 = secure({ parent: true }, async ({ env, params, ctx }) => {
  const vis = await visibilityClause(env, ctx);
  const n2 = await env.DB.prepare(`SELECT n.id FROM sch_notifications n WHERE n.id = ? AND n.school_id = ? AND ${vis.sql}`).bind(params.id, ctx.school.id).first();
  if (n2) await env.DB.prepare("INSERT OR IGNORE INTO sch_notification_reads (notification_id, user_id) VALUES (?, ?)").bind(n2.id, ctx.user.id).run();
  return json({ ok: true });
});
var markAllRead2 = secure({ parent: true }, async ({ env, ctx }) => {
  const vis = await visibilityClause(env, ctx);
  await env.DB.prepare(
    `INSERT OR IGNORE INTO sch_notification_reads (notification_id, user_id) SELECT n.id, ? FROM sch_notifications n WHERE n.school_id = ? AND ${vis.sql}`
  ).bind(ctx.user.id, ctx.school.id).run();
  return json({ ok: true });
});
var deleteNotification = secure({ perm: "announcements.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM sch_notifications WHERE id = ? AND school_id = ?").bind(params.id, ctx.school.id).run();
  if (!r.meta.changes) fail(404, "Notification not found.");
  await audit(env, request, ctx, "notification.delete", "notification", Number(params.id), null);
  return json({ ok: true });
});
var listAudit = secure({ perm: "audit.view" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 50, 200);
  const where = ["a.school_id = ?"];
  const binds = [ctx.school.id];
  const userId = Number(url.searchParams.get("user_id") || 0);
  if (userId) {
    where.push("a.user_id = ?");
    binds.push(userId);
  }
  const action = (url.searchParams.get("action") || "").trim();
  if (action) {
    where.push(`a.action LIKE ? ESCAPE '\\'`);
    binds.push(likeTerm(action).slice(1));
  }
  const from = V.date(url.searchParams.get("from"), "From");
  const to = V.date(url.searchParams.get("to"), "To");
  if (from) {
    where.push("date(a.created_at) >= ?");
    binds.push(from);
  }
  if (to) {
    where.push("date(a.created_at) <= ?");
    binds.push(to);
  }
  const q = (url.searchParams.get("q") || "").trim();
  if (q) {
    where.push(`(a.details LIKE ? ESCAPE '\\' OR a.action LIKE ? ESCAPE '\\')`);
    const l = likeTerm(q);
    binds.push(l, l);
  }
  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM sch_audit_logs a WHERE ${where.join(" AND ")}`).bind(...binds).first();
  const { results } = await env.DB.prepare(
    `SELECT a.id, a.action, a.entity, a.entity_id, a.details, a.ip, a.user_agent, a.created_at, u.name AS user_name, u.email AS user_email
     FROM sch_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE ${where.join(" AND ")} ORDER BY a.id DESC LIMIT ? OFFSET ?`
  ).bind(...binds, limit, offset).all();
  const { results: users } = await env.DB.prepare(
    "SELECT u.id, u.name FROM sch_members m JOIN users u ON u.id = m.user_id WHERE m.school_id = ? ORDER BY u.name"
  ).bind(ctx.school.id).all();
  return json({ logs: results, total: total.n, page, limit, users });
});
var search2 = secure({}, async ({ env, url, ctx }) => {
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ results: {} });
  const like = likeTerm(q);
  const sid = ctx.school.id;
  const out = {};
  const tasks = [];
  if (can2(ctx, "students.view")) {
    let scope = "";
    let year = 0;
    if (ctx.role === "teacher") {
      const ids = await teacherClassIds(env, ctx);
      year = (await currentYear(env, sid)).id;
      scope = `AND s.id IN (SELECT student_id FROM sch_enrollments WHERE academic_year_id = ${year} AND class_id IN (${ids.length ? ids.join(",") : "0"}))`;
    }
    tasks.push(env.DB.prepare(
      `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.status FROM sch_students s
       WHERE s.school_id = ? ${scope} AND (${SQL_FULL_NAME} LIKE ? ESCAPE '\\' OR s.admission_no LIKE ? ESCAPE '\\' OR s.phone LIKE ? ESCAPE '\\')
       ORDER BY s.first_name LIMIT 6`
    ).bind(sid, like, like, like).all().then((r) => {
      out.students = r.results.map((s) => ({ id: s.id, title: studentFullName(s), sub: `${s.admission_no} \xB7 ${s.status}`, route: `student/${s.id}` }));
    }));
  }
  if (can2(ctx, "teachers.manage") || ctx.role === "admin") {
    tasks.push(env.DB.prepare(`SELECT id, full_name, phone, email FROM sch_teachers WHERE school_id = ? AND (full_name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') LIMIT 5`).bind(sid, like, like, like).all().then((r) => {
      out.teachers = r.results.map((t) => ({ id: t.id, title: t.full_name, sub: t.email || t.phone || "Teacher", route: `teacher/${t.id}` }));
    }));
  }
  if (can2(ctx, "parents.manage")) {
    tasks.push(env.DB.prepare(`SELECT id, full_name, phone FROM sch_parents WHERE school_id = ? AND (full_name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR email LIKE ? ESCAPE '\\') LIMIT 5`).bind(sid, like, like, like).all().then((r) => {
      out.parents = r.results.map((p) => ({ id: p.id, title: p.full_name, sub: p.phone, route: `parent/${p.id}` }));
    }));
  }
  if (can2(ctx, "fees.view")) {
    tasks.push(env.DB.prepare(
      `SELECT p.id, p.amount, p.payment_date, r.receipt_no, s.first_name, s.last_name FROM sch_payments p JOIN sch_students s ON s.id = p.student_id LEFT JOIN sch_receipts r ON r.payment_id = p.id
       WHERE p.school_id = ? AND (r.receipt_no LIKE ? ESCAPE '\\' OR p.reference LIKE ? ESCAPE '\\' OR ${SQL_FULL_NAME} LIKE ? ESCAPE '\\') ORDER BY p.id DESC LIMIT 5`
    ).bind(sid, like, like, like).all().then((r) => {
      out.payments = r.results.map((p) => ({ id: p.id, title: `${p.receipt_no || "Payment"} \u2014 ${p.first_name} ${p.last_name}`, sub: `${p.amount.toLocaleString()} ${ctx.school.currency} \xB7 ${p.payment_date}`, route: `receipt/${p.id}` }));
    }));
  }
  tasks.push(env.DB.prepare(`SELECT id, name, stream FROM sch_classes WHERE school_id = ? AND (name LIKE ? ESCAPE '\\' OR stream LIKE ? ESCAPE '\\') LIMIT 5`).bind(sid, like, like).all().then((r) => {
    out.classes = r.results.map((c) => ({ id: c.id, title: classLabel2(c), sub: "Class", route: "classes" }));
  }));
  if (can2(ctx, "results.view")) {
    tasks.push(env.DB.prepare(`SELECT x.id, x.name, c.name AS class_name FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id WHERE x.school_id = ? AND (x.name LIKE ? ESCAPE '\\' OR x.exam_type LIKE ? ESCAPE '\\') ORDER BY x.id DESC LIMIT 5`).bind(sid, like, like).all().then((r) => {
      out.results = r.results.map((x) => ({ id: x.id, title: x.name, sub: `Results \xB7 ${x.class_name}`, route: `results/${x.id}` }));
    }));
  }
  await Promise.all(tasks);
  return json({ results: out });
});
var REPORT_CATALOGUE = [
  { group: "Student Reports", group_key: "students", items: [
    { key: "students.list", label: "Student list", filters: ["class_id", "status"] },
    { key: "students.new_admissions", label: "New admissions", filters: ["from", "to"] },
    { key: "students.active", label: "Active students", filters: ["class_id"] },
    { key: "students.inactive", label: "Inactive students", filters: ["class_id"] },
    { key: "students.by_class", label: "Students by class", filters: [] },
    { key: "students.by_gender", label: "Students by gender", filters: [] }
  ] },
  { group: "Attendance Reports", group_key: "attendance", items: [
    { key: "attendance.daily", label: "Daily attendance", filters: ["date"] },
    { key: "attendance.monthly", label: "Monthly attendance", filters: ["month"] },
    { key: "attendance.student", label: "Student attendance", filters: ["student_id", "from", "to"] },
    { key: "attendance.class", label: "Class attendance", filters: ["class_id", "from", "to"] },
    { key: "attendance.absence", label: "Absence report", filters: ["from", "to"] }
  ] },
  { group: "Financial Reports", group_key: "finance", items: [
    { key: "finance.daily", label: "Daily collections", filters: ["date"] },
    { key: "finance.monthly", label: "Monthly collections", filters: ["month"] },
    { key: "finance.outstanding", label: "Outstanding balances", filters: ["class_id"] },
    { key: "finance.payments", label: "Payment history", filters: ["from", "to", "method"] },
    { key: "finance.statement", label: "Student fee statement", filters: ["student_id"] }
  ] },
  { group: "Academic Reports", group_key: "academic", items: [
    { key: "academic.exam_results", label: "Examination results", filters: ["exam_id"] },
    { key: "academic.class_performance", label: "Class performance", filters: ["class_id"] },
    { key: "academic.subject_performance", label: "Subject performance", filters: ["exam_id", "class_id"] },
    { key: "academic.student_performance", label: "Student performance", filters: ["student_id"] }
  ] }
];
var genderLabel = /* @__PURE__ */ __name((g) => g === "male" ? "Male" : g === "female" ? "Female" : "", "genderLabel");
var cap = /* @__PURE__ */ __name((s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : "", "cap");
async function buildReport(env, ctx, key, q, year) {
  const sid = ctx.school.id;
  const cur = ctx.school.currency;
  const all2 = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results), "all");
  const today = todayISO();
  const from = V.date(q.from, "From date") || `${today.slice(0, 4)}-01-01`;
  const to = V.date(q.to, "To date") || today;
  const classId = Number(q.class_id || 0);
  const studentBase = `FROM sch_students s LEFT JOIN sch_enrollments e ON e.student_id = s.id AND e.academic_year_id = ${year.id} LEFT JOIN sch_classes c ON c.id = e.class_id WHERE s.school_id = ?`;
  const studentCols = `SELECT s.id, s.admission_no, s.first_name, s.middle_name, s.last_name, s.gender, s.status, s.phone, s.admission_date, c.name AS cn, c.stream AS cs,
     (SELECT p.full_name FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_name,
     (SELECT p.phone FROM sch_student_parents sp JOIN sch_parents p ON p.id = sp.parent_id WHERE sp.student_id = s.id ORDER BY sp.is_primary DESC LIMIT 1) AS parent_phone`;
  const studentColumns = [
    { key: "admission_no", label: "Student ID" },
    { key: "name", label: "Name" },
    { key: "gender", label: "Gender" },
    { key: "class", label: "Class" },
    { key: "parent", label: "Parent / Guardian" },
    { key: "phone", label: "Phone" },
    { key: "admission_date", label: "Admitted" },
    { key: "status", label: "Status" }
  ];
  const studentRow = /* @__PURE__ */ __name((r) => ({ admission_no: r.admission_no, name: studentFullName(r), gender: genderLabel(r.gender), class: r.cn ? classLabel2({ name: r.cn, stream: r.cs }) : "\u2014", parent: r.parent_name || "\u2014", phone: r.parent_phone || r.phone || "\u2014", admission_date: r.admission_date, status: cap(r.status) }), "studentRow");
  switch (key) {
    case "students.list":
    case "students.active":
    case "students.inactive":
    case "students.new_admissions": {
      const where = [];
      const binds = [sid];
      if (classId) {
        where.push("AND e.class_id = ?");
        binds.push(classId);
      }
      if (key === "students.active") where.push(`AND s.status = 'active'`);
      if (key === "students.inactive") where.push(`AND s.status != 'active'`);
      if (key === "students.list" && q.status) {
        where.push("AND s.status = ?");
        binds.push(V.oneOf(q.status, "Status", ["active", "inactive", "graduated", "suspended", "transferred"]));
      }
      if (key === "students.new_admissions") {
        where.push("AND s.admission_date >= ? AND s.admission_date <= ?");
        binds.push(from, to);
      }
      const rows = await all2(`${studentCols} ${studentBase} ${where.join(" ")} ORDER BY s.first_name COLLATE NOCASE LIMIT 5000`, ...binds);
      const titles = { "students.list": "Student list", "students.active": "Active students", "students.inactive": "Inactive students", "students.new_admissions": `New admissions (${from} to ${to})` };
      return { title: titles[key], columns: studentColumns, rows: rows.map(studentRow), summary: [`${rows.length} student${rows.length === 1 ? "" : "s"}`] };
    }
    case "students.by_class": {
      const rows = await all2(
        `SELECT c.name, c.stream, c.max_students, COALESCE(SUM(s.gender = 'male'), 0) AS male, COALESCE(SUM(s.gender = 'female'), 0) AS female, COUNT(s.id) AS total
         FROM sch_classes c LEFT JOIN sch_enrollments e ON e.class_id = c.id LEFT JOIN sch_students s ON s.id = e.student_id WHERE c.school_id = ? AND c.academic_year_id = ? GROUP BY c.id ORDER BY ${CLASS_ORDER}, c.name, c.stream`,
        sid,
        year.id
      );
      return {
        title: "Students by class",
        columns: [{ key: "class", label: "Class" }, { key: "male", label: "Male", align: "end" }, { key: "female", label: "Female", align: "end" }, { key: "total", label: "Total", align: "end" }, { key: "capacity", label: "Capacity", align: "end" }],
        rows: rows.map((r) => ({ class: classLabel2(r), male: r.male, female: r.female, total: r.total, capacity: r.max_students })),
        summary: [`${rows.reduce((s, r) => s + r.total, 0)} students in ${rows.length} classes`]
      };
    }
    case "students.by_gender": {
      const rows = await all2(`SELECT gender, COUNT(*) AS n FROM sch_students WHERE school_id = ? AND status = 'active' GROUP BY gender`, sid);
      const total = rows.reduce((s, r) => s + r.n, 0);
      return {
        title: "Active students by gender",
        columns: [{ key: "gender", label: "Gender" }, { key: "count", label: "Students", align: "end" }, { key: "percent", label: "Share", align: "end" }],
        rows: rows.map((r) => ({ gender: genderLabel(r.gender), count: r.n, percent: total ? `${round2(r.n / total * 100)}%` : "\u2014" })),
        summary: [`${total} active students`]
      };
    }
    case "attendance.daily":
    case "attendance.monthly": {
      const daily = key === "attendance.daily";
      const date = V.date(q.date, "Date") || today;
      const [a, b] = daily ? [date, date] : monthRange(`${q.month || today.slice(0, 7)}-01`);
      const rows = await all2(
        `SELECT c.name, c.stream, COALESCE(SUM(a.status = 'present'), 0) AS present, COALESCE(SUM(a.status = 'absent'), 0) AS absent, COALESCE(SUM(a.status = 'late'), 0) AS late
         FROM sch_classes c LEFT JOIN sch_attendance a ON a.class_id = c.id AND a.date >= ? AND a.date <= ? WHERE c.school_id = ? AND c.academic_year_id = ? GROUP BY c.id ORDER BY ${CLASS_ORDER}, c.name, c.stream`,
        a,
        b,
        sid,
        year.id
      );
      return {
        title: daily ? `Daily attendance \u2014 ${date}` : `Monthly attendance \u2014 ${a.slice(0, 7)}`,
        columns: [{ key: "class", label: "Class" }, { key: "present", label: "Present", align: "end" }, { key: "absent", label: "Absent", align: "end" }, { key: "late", label: "Late", align: "end" }, { key: "percent", label: "Attendance %", align: "end" }],
        rows: rows.map((r) => {
          const p = attendancePercent(r.present, r.absent, r.late);
          return { class: classLabel2(r), present: r.present, absent: r.absent, late: r.late, percent: p == null ? "\u2014" : `${p}%` };
        })
      };
    }
    case "attendance.student": {
      const st = await env.DB.prepare("SELECT * FROM sch_students WHERE id = ? AND school_id = ?").bind(V.int(q.student_id, "Student", { required: true, min: 1 }), sid).first();
      if (!st) fail(404, "Student not found.");
      const rows = await all2(`SELECT a.date, a.status, sub.name AS subject, c.name AS cn, c.stream AS cs FROM sch_attendance a JOIN sch_classes c ON c.id = a.class_id LEFT JOIN sch_subjects sub ON sub.id = a.subject_id WHERE a.student_id = ? AND a.date >= ? AND a.date <= ? ORDER BY a.date DESC`, st.id, from, to);
      const cnt = { present: 0, absent: 0, late: 0 };
      rows.forEach((r) => {
        cnt[r.status] += 1;
      });
      return {
        title: `Attendance \u2014 ${studentFullName(st)} (${from} to ${to})`,
        columns: [{ key: "date", label: "Date" }, { key: "class", label: "Class" }, { key: "subject", label: "Session" }, { key: "status", label: "Status" }],
        rows: rows.map((r) => ({ date: r.date, class: classLabel2({ name: r.cn, stream: r.cs }), subject: r.subject || "Whole day", status: cap(r.status) })),
        summary: [`Present ${cnt.present}`, `Absent ${cnt.absent}`, `Late ${cnt.late}`, `Attendance ${attendancePercent(cnt.present, cnt.absent, cnt.late) ?? "\u2014"}%`]
      };
    }
    case "attendance.class": {
      const c = await env.DB.prepare("SELECT * FROM sch_classes WHERE id = ? AND school_id = ?").bind(V.int(q.class_id, "Class", { required: true, min: 1 }), sid).first();
      if (!c) fail(404, "Class not found.");
      const rows = await all2(
        `SELECT s.first_name, s.middle_name, s.last_name, s.admission_no, COALESCE(SUM(a.status = 'present'), 0) AS present, COALESCE(SUM(a.status = 'absent'), 0) AS absent, COALESCE(SUM(a.status = 'late'), 0) AS late
         FROM sch_enrollments e JOIN sch_students s ON s.id = e.student_id LEFT JOIN sch_attendance a ON a.student_id = s.id AND a.class_id = e.class_id AND a.date >= ? AND a.date <= ?
         WHERE e.class_id = ? GROUP BY s.id ORDER BY s.first_name COLLATE NOCASE`,
        from,
        to,
        c.id
      );
      return {
        title: `Class attendance \u2014 ${classLabel2(c)} (${from} to ${to})`,
        columns: [{ key: "admission_no", label: "Student ID" }, { key: "name", label: "Name" }, { key: "present", label: "Present", align: "end" }, { key: "absent", label: "Absent", align: "end" }, { key: "late", label: "Late", align: "end" }, { key: "percent", label: "Attendance %", align: "end" }],
        rows: rows.map((r) => {
          const p = attendancePercent(r.present, r.absent, r.late);
          return { admission_no: r.admission_no, name: studentFullName(r), present: r.present, absent: r.absent, late: r.late, percent: p == null ? "\u2014" : `${p}%` };
        })
      };
    }
    case "attendance.absence": {
      const rows = await all2(
        `SELECT s.first_name, s.middle_name, s.last_name, s.admission_no, COUNT(*) AS missed, MAX(a.date) AS last_absent,
           (SELECT c.name || CASE WHEN c.stream != '' THEN ' ' || c.stream ELSE '' END FROM sch_enrollments e JOIN sch_classes c ON c.id = e.class_id WHERE e.student_id = s.id ORDER BY e.academic_year_id DESC LIMIT 1) AS class_name
         FROM sch_attendance a JOIN sch_students s ON s.id = a.student_id WHERE a.school_id = ? AND a.status = 'absent' AND a.date >= ? AND a.date <= ? GROUP BY s.id ORDER BY missed DESC LIMIT 1000`,
        sid,
        from,
        to
      );
      return {
        title: `Absence report (${from} to ${to})`,
        columns: [{ key: "admission_no", label: "Student ID" }, { key: "name", label: "Name" }, { key: "class", label: "Class" }, { key: "missed", label: "Sessions missed", align: "end" }, { key: "last", label: "Last absent" }],
        rows: rows.map((r) => ({ admission_no: r.admission_no, name: studentFullName(r), class: r.class_name || "\u2014", missed: r.missed, last: r.last_absent }))
      };
    }
    case "finance.daily":
    case "finance.payments":
    case "finance.monthly": {
      const date = V.date(q.date, "Date") || today;
      const [a, b] = key === "finance.daily" ? [date, date] : key === "finance.monthly" ? monthRange(`${q.month || today.slice(0, 7)}-01`) : [from, to];
      const binds = [sid, a, b];
      let extra = "";
      if (q.method) {
        extra = " AND lower(p.method) = lower(?)";
        binds.push(q.method);
      }
      const rows = await all2(
        `SELECT p.payment_date, p.amount, p.method, p.reference, r.receipt_no, u.name AS received_by, s.first_name, s.middle_name, s.last_name, s.admission_no
         FROM sch_payments p JOIN sch_students s ON s.id = p.student_id LEFT JOIN sch_receipts r ON r.payment_id = p.id LEFT JOIN users u ON u.id = p.received_by
         WHERE p.school_id = ? AND p.payment_date >= ? AND p.payment_date <= ? ${extra} ORDER BY p.payment_date DESC, p.id DESC LIMIT 5000`,
        ...binds
      );
      const total = rows.reduce((s, r) => s + r.amount, 0);
      const titles = { "finance.daily": `Daily collections \u2014 ${date}`, "finance.monthly": `Monthly collections \u2014 ${a.slice(0, 7)}`, "finance.payments": `Payment history (${a} to ${b})` };
      return {
        title: titles[key],
        columns: [{ key: "date", label: "Date" }, { key: "receipt", label: "Receipt" }, { key: "student", label: "Student" }, { key: "admission_no", label: "Student ID" }, { key: "method", label: "Method" }, { key: "reference", label: "Reference" }, { key: "received_by", label: "Received by" }, { key: "amount", label: `Amount (${cur})`, align: "end" }],
        rows: rows.map((r) => ({ date: r.payment_date, receipt: r.receipt_no, student: studentFullName(r), admission_no: r.admission_no, method: r.method, reference: r.reference || "\u2014", received_by: r.received_by || "\u2014", amount: r.amount.toLocaleString() })),
        summary: [`${rows.length} payment${rows.length === 1 ? "" : "s"}`, `Total ${total.toLocaleString()} ${cur}`]
      };
    }
    case "finance.outstanding": {
      const rows = (await financeRows(env, ctx, { yearId: year.id, classId })).filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance);
      const total = rows.reduce((s, r) => s + r.balance, 0);
      return {
        title: "Outstanding fee balances",
        columns: [{ key: "admission_no", label: "Student ID" }, { key: "name", label: "Name" }, { key: "class", label: "Class" }, { key: "parent", label: "Parent" }, { key: "phone", label: "Phone" }, { key: "total", label: "Total fees", align: "end" }, { key: "paid", label: "Paid", align: "end" }, { key: "balance", label: "Balance", align: "end" }, { key: "status", label: "Status" }],
        rows: rows.map((r) => ({ admission_no: r.admission_no, name: r.full_name, class: r.class_name, parent: r.parent_name || "\u2014", phone: r.parent_phone || "\u2014", total: r.total.toLocaleString(), paid: r.paid.toLocaleString(), balance: r.balance.toLocaleString(), status: cap(r.status === "partial" ? "partially paid" : r.status) })),
        summary: [`${rows.length} students owe fees`, `Outstanding ${total.toLocaleString()} ${cur}`]
      };
    }
    case "finance.statement": {
      const st = await env.DB.prepare("SELECT * FROM sch_students WHERE id = ? AND school_id = ?").bind(V.int(q.student_id, "Student", { required: true, min: 1 }), sid).first();
      if (!st) fail(404, "Student not found.");
      const enr = await env.DB.prepare("SELECT * FROM sch_enrollments WHERE student_id = ? AND academic_year_id = ?").bind(st.id, year.id).first();
      const items = enr ? await all2("SELECT name, amount, due_date FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ? AND (class_id IS NULL OR class_id = ?) ORDER BY due_date IS NULL, due_date", sid, year.id, enr.class_id) : [];
      const pays = await all2("SELECT p.payment_date, p.amount, p.method, p.reference, r.receipt_no FROM sch_payments p LEFT JOIN sch_receipts r ON r.payment_id = p.id WHERE p.student_id = ? AND p.academic_year_id = ? ORDER BY p.payment_date, p.id", st.id, year.id);
      const rows = [
        ...items.map((i) => ({ date: i.due_date || "\u2014", description: `Fee: ${i.name}`, ref: "", charge: i.amount.toLocaleString(), payment: "" })),
        ...pays.map((p) => ({ date: p.payment_date, description: `Payment (${p.method})`, ref: p.receipt_no || p.reference || "", charge: "", payment: p.amount.toLocaleString() }))
      ];
      const total = items.reduce((s, i) => s + i.amount, 0);
      const paid = pays.reduce((s, p) => s + p.amount, 0);
      return {
        title: `Fee statement \u2014 ${studentFullName(st)} (${st.admission_no})`,
        columns: [{ key: "date", label: "Date" }, { key: "description", label: "Description" }, { key: "ref", label: "Receipt / Ref" }, { key: "charge", label: `Charged (${cur})`, align: "end" }, { key: "payment", label: `Paid (${cur})`, align: "end" }],
        rows,
        summary: [`Total fees ${total.toLocaleString()}`, `Paid ${paid.toLocaleString()}`, `Balance ${Math.max(total - paid, 0).toLocaleString()} ${cur}`]
      };
    }
    case "academic.exam_results": {
      const ex = await env.DB.prepare("SELECT x.*, c.name AS cn, c.stream AS cs FROM sch_examinations x JOIN sch_classes c ON c.id = x.class_id WHERE x.id = ? AND x.school_id = ?").bind(V.int(q.exam_id, "Examination", { required: true, min: 1 }), sid).first();
      if (!ex) fail(404, "Examination not found.");
      const { students, sheet, subjectsById } = await loadSheet(env, ctx, ex);
      const byId = Object.fromEntries(students.map((s) => [s.id, s]));
      const used = [...new Set(sheet.rows.flatMap((r) => r.subjects.map((s) => s.subject_id)))].map((id) => subjectsById[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name));
      const rows = sheet.rows.filter((r) => r.subject_count).sort((a, b) => a.position - b.position).map((r) => {
        const row = { position: r.position, admission_no: byId[r.student_id].admission_no, name: studentFullName(byId[r.student_id]) };
        used.forEach((s) => {
          const m = r.subjects.find((x) => x.subject_id === s.id);
          row[`s${s.id}`] = m ? m.marks : "\u2014";
        });
        return { ...row, total: r.total, average: `${r.average}%`, grade: r.grade, division: r.division || "\u2014" };
      });
      return { title: `${ex.name} \u2014 ${classLabel2({ name: ex.cn, stream: ex.cs })}`, columns: [{ key: "position", label: "Pos" }, { key: "admission_no", label: "Student ID" }, { key: "name", label: "Name" }, ...used.map((s) => ({ key: `s${s.id}`, label: s.code || s.name, align: "end" })), { key: "total", label: "Total", align: "end" }, { key: "average", label: "Average", align: "end" }, { key: "grade", label: "Grade" }, { key: "division", label: "Div" }], rows, summary: [`${rows.length} students ranked`] };
    }
    case "academic.class_performance": {
      const rows = await all2(
        `SELECT x.name AS exam, x.exam_date, c.name AS cn, c.stream AS cs, COUNT(DISTINCT r.student_id) AS students, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average,
                ROUND(MAX(r.marks * 100.0 / x.max_marks), 1) AS highest, ROUND(MIN(r.marks * 100.0 / x.max_marks), 1) AS lowest
         FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_classes c ON c.id = x.class_id
         WHERE r.school_id = ? AND x.academic_year_id = ? ${classId ? "AND c.id = " + classId : ""} GROUP BY x.id ORDER BY COALESCE(x.exam_date, x.created_at) DESC`,
        sid,
        year.id
      );
      return {
        title: "Class performance",
        columns: [{ key: "class", label: "Class" }, { key: "exam", label: "Examination" }, { key: "date", label: "Date" }, { key: "students", label: "Students", align: "end" }, { key: "average", label: "Average %", align: "end" }, { key: "highest", label: "Highest %", align: "end" }, { key: "lowest", label: "Lowest %", align: "end" }],
        rows: rows.map((r) => ({ class: classLabel2({ name: r.cn, stream: r.cs }), exam: r.exam, date: r.exam_date || "\u2014", students: r.students, average: r.average, highest: r.highest, lowest: r.lowest }))
      };
    }
    case "academic.subject_performance": {
      const where = ["r.school_id = ?", "x.academic_year_id = ?"];
      const binds = [sid, year.id];
      if (q.exam_id) {
        where.push("x.id = ?");
        binds.push(Number(q.exam_id));
      }
      if (classId) {
        where.push("x.class_id = ?");
        binds.push(classId);
      }
      const settings = await getSettings2(env, sid);
      const asc = [...settings.grading_scale].sort((a, b) => a.min - b.min);
      const passMark = asc.length > 1 ? asc[1].min : 30;
      const rows = await all2(
        `SELECT sub.name, COUNT(*) AS entries, ROUND(AVG(r.marks * 100.0 / x.max_marks), 1) AS average, ROUND(MAX(r.marks * 100.0 / x.max_marks), 1) AS highest, ROUND(MIN(r.marks * 100.0 / x.max_marks), 1) AS lowest,
                ROUND(100.0 * SUM(r.marks * 100.0 / x.max_marks >= ${Number(passMark)}) / COUNT(*), 1) AS pass_rate
         FROM sch_results r JOIN sch_examinations x ON x.id = r.exam_id JOIN sch_subjects sub ON sub.id = r.subject_id WHERE ${where.join(" AND ")} GROUP BY sub.id ORDER BY average DESC`,
        ...binds
      );
      return {
        title: "Subject performance",
        columns: [{ key: "subject", label: "Subject" }, { key: "entries", label: "Results", align: "end" }, { key: "average", label: "Average %", align: "end" }, { key: "highest", label: "Highest %", align: "end" }, { key: "lowest", label: "Lowest %", align: "end" }, { key: "pass", label: "Pass rate %", align: "end" }],
        rows: rows.map((r) => ({ subject: r.name, entries: r.entries, average: r.average, highest: r.highest, lowest: r.lowest, pass: r.pass_rate })),
        summary: [`Pass mark ${passMark}%`]
      };
    }
    case "academic.student_performance": {
      const st = await env.DB.prepare("SELECT * FROM sch_students WHERE id = ? AND school_id = ?").bind(V.int(q.student_id, "Student", { required: true, min: 1 }), sid).first();
      if (!st) fail(404, "Student not found.");
      const exams = await all2(`SELECT DISTINCT x.* FROM sch_examinations x JOIN sch_results r ON r.exam_id = x.id WHERE r.student_id = ? ORDER BY COALESCE(x.exam_date, x.created_at)`, st.id);
      const rows = [];
      for (const ex of exams) {
        const { sheet } = await loadSheet(env, ctx, ex);
        const r = sheet.rows.find((x) => x.student_id === st.id);
        if (r && r.subject_count) rows.push({ exam: ex.name, date: ex.exam_date || "\u2014", subjects: r.subject_count, total: r.total, average: `${r.average}%`, grade: r.grade, position: `${ordinal(r.position)} / ${sheet.out_of}`, division: r.division || "\u2014" });
      }
      return { title: `Student performance \u2014 ${studentFullName(st)}`, columns: [{ key: "exam", label: "Examination" }, { key: "date", label: "Date" }, { key: "subjects", label: "Subjects", align: "end" }, { key: "total", label: "Total", align: "end" }, { key: "average", label: "Average", align: "end" }, { key: "grade", label: "Grade" }, { key: "position", label: "Position" }, { key: "division", label: "Div" }], rows };
    }
    default:
      fail(404, "Unknown report.");
  }
}
__name(buildReport, "buildReport");
var reportCatalogue = secure({ perm: "reports.view" }, async ({ ctx }) => {
  if (ctx.role === "teacher") fail(403, "Reports are available to administrators and office staff.");
  const groups = REPORT_CATALOGUE.filter((g) => ctx.role !== "receptionist" || ["students", "finance"].includes(g.group_key));
  return json({ groups });
});
var runReport = secure({ perm: "reports.view" }, async ({ request, env, params, url, ctx }) => {
  if (ctx.role === "teacher") fail(403, "Reports are available to administrators and office staff.");
  const group = params.key.split(".")[0];
  if (ctx.role === "receptionist" && !["students", "finance"].includes(group)) fail(403, "Your role can view student and finance reports only.");
  const year = await currentYear(env, ctx.school.id);
  const q = Object.fromEntries(url.searchParams.entries());
  const report = await buildReport(env, ctx, params.key, q, year);
  await audit(env, request, ctx, "report.run", "report", null, params.key);
  return json({ report: { ...report, school: ctx.school.name, generated_at: (/* @__PURE__ */ new Date()).toISOString(), key: params.key } });
});

// src/handlers/school/demo.js
init_auth();
init_school_auth();
var TEACHERS = [
  ["Mr. Joseph Mushi", "male", "Mathematics"],
  ["Ms. Neema Kileo", "female", "English"],
  ["Mr. Hassan Bakari", "male", "Physics"],
  ["Mrs. Grace Mwakyusa", "female", "Biology"],
  ["Mr. Peter Lyimo", "male", "Geography"],
  ["Ms. Amina Salum", "female", "Kiswahili"]
];
var FIRST_F = ["Asha", "Neema", "Zawadi", "Rehema", "Furaha", "Happiness", "Mwanaidi", "Upendo", "Witness", "Esther", "Salma", "Agnes"];
var FIRST_M = ["Peter", "Juma", "Daniel", "Baraka", "Emmanuel", "Kelvin", "Ibrahim", "Godfrey", "Rashid", "Elias", "Hamisi", "Moses"];
var LAST = ["Michael", "Mushi", "Kimaro", "Mwakasege", "Massawe", "Ngowi", "Shayo", "Mrema", "Kessy", "Msuya", "Swai", "Mollel", "Lema", "Mtui", "Urio", "Temba", "Minja", "Mosha", "Kavishe", "Tarimo", "Nnko", "Kweka", "Marealle", "Mallya"];
var ADDRESSES = ["Msasani, Dar es Salaam", "Mikocheni, Dar es Salaam", "Mbezi Beach, Dar es Salaam", "Kinondoni, Dar es Salaam", "Sinza, Dar es Salaam", "Kijitonyama, Dar es Salaam"];
var JOBS = ["Teacher", "Businessman", "Nurse", "Engineer", "Accountant", "Shop owner", "Driver", "Banker"];
function rng(seed) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}
__name(rng, "rng");
var iso = /* @__PURE__ */ __name((d) => d.toISOString().slice(0, 10), "iso");
var addDays = /* @__PURE__ */ __name((n2) => iso(new Date(Date.now() + n2 * 864e5)), "addDays");
async function runBatches(env, stmts) {
  for (const part of chunk(stmts, 90)) await env.DB.batch(part);
}
__name(runBatches, "runBatches");
var loadDemoData = secure({ perm: "settings.manage", roles: ["admin"] }, async ({ request, env, ctx }) => {
  const sid = ctx.school.id;
  const existing = await env.DB.prepare("SELECT COUNT(*) AS n FROM sch_students WHERE school_id = ?").bind(sid).first();
  if (existing.n > 0) fail(409, "Sample data can only be added to a school that has no students yet.");
  const year = await currentYear(env, sid);
  const yr = Number(String(year.name).slice(0, 4)) || (/* @__PURE__ */ new Date()).getUTCFullYear();
  const { results: classRows } = await env.DB.prepare(
    `SELECT id, name FROM sch_classes WHERE school_id = ? AND academic_year_id = ? AND name IN ('Form One','Form Two','Form Three') ORDER BY name`
  ).bind(sid, year.id).all();
  const byName = Object.fromEntries(classRows.map((c) => [c.name, c.id]));
  const classes = ["Form One", "Form Two", "Form Three"].map((n3) => ({ name: n3, id: byName[n3] })).filter((c) => c.id);
  if (!classes.length) fail(400, "The sample data needs the classes Form One, Form Two and Form Three. Add them first, then try again.");
  const { results: subs } = await env.DB.prepare("SELECT id, code FROM sch_subjects WHERE school_id = ? AND status = ? ORDER BY id").bind(sid, "active").all();
  if (subs.length < 5) fail(400, "The sample data needs at least 5 subjects.");
  const subjectIds = subs.map((s) => s.id);
  const rand = rng(2026);
  await runBatches(env, TEACHERS.map(([name, gender], i) => env.DB.prepare(
    `INSERT INTO sch_teachers (school_id, full_name, gender, phone, email, address, employment_status) VALUES (?, ?, ?, ?, ?, ?, 'full_time')`
  ).bind(sid, name, gender, `+25575500${1e3 + i}`, `teacher${i + 1}@example.com`, ADDRESSES[i % ADDRESSES.length])));
  const { results: tRows } = await env.DB.prepare("SELECT id FROM sch_teachers WHERE school_id = ? ORDER BY id").bind(sid).all();
  const T = tRows.map((t) => t.id);
  const stmts = [];
  classes.forEach((c, k) => {
    stmts.push(env.DB.prepare("UPDATE sch_classes SET teacher_id = ? WHERE id = ?").bind(T[k % T.length], c.id));
    subjectIds.forEach((sub, i) => stmts.push(env.DB.prepare("UPDATE sch_class_subjects SET teacher_id = ? WHERE class_id = ? AND subject_id = ?").bind(T[(i + k * 2) % T.length], c.id, sub)));
  });
  await runBatches(env, stmts);
  const perClass = 8;
  const total = classes.length * perClass;
  const students = [];
  for (let i = 0; i < total; i += 1) {
    const female = i % 2 === 0;
    const first = (female ? FIRST_F : FIRST_M)[Math.floor(i / 2) % 12];
    students.push({
      i,
      first,
      last: LAST[i % LAST.length],
      gender: female ? "female" : "male",
      cls: classes[Math.floor(i / perClass)],
      admission: `${ctx.school.admission_prefix}-${yr}-${String(i + 1).padStart(4, "0")}`,
      dob: `${yr - (12 + Math.floor(i / perClass) + i % 2)}-${String(1 + i % 12).padStart(2, "0")}-${String(3 + i % 20).padStart(2, "0")}`,
      status: i === 19 ? "inactive" : "active"
    });
  }
  const siblings = { 8: 0, 16: 1, 17: 9, 10: 2 };
  const parentOf = {};
  const parents = [];
  students.forEach((s) => {
    const share = siblings[s.i];
    if (share !== void 0) {
      parentOf[s.i] = parentOf[share];
      return;
    }
    const p = { name: `${s.i % 3 === 0 ? "Mr." : "Mrs."} ${s.i % 2 === 0 ? FIRST_M[(s.i + 3) % 12] : FIRST_F[(s.i + 5) % 12]} ${s.last}`, phone: `+2557${1e3 + s.i * 37}${String(100 + s.i).slice(-3)}`.slice(0, 13), idx: parents.length };
    parents.push(p);
    parentOf[s.i] = p.idx;
  });
  await runBatches(env, parents.map((p, n3) => env.DB.prepare(
    `INSERT INTO sch_parents (school_id, full_name, phone, alt_phone, email, address, occupation) VALUES (?, ?, ?, NULL, ?, ?, ?)`
  ).bind(sid, p.name, p.phone, `parent${n3 + 1}@example.com`, ADDRESSES[n3 % ADDRESSES.length], JOBS[n3 % JOBS.length])));
  const { results: pRows } = await env.DB.prepare("SELECT id FROM sch_parents WHERE school_id = ? ORDER BY id").bind(sid).all();
  parents.forEach((p, n3) => {
    p.id = pRows[n3].id;
  });
  await runBatches(env, students.map((s) => env.DB.prepare(
    `INSERT INTO sch_students (school_id, admission_no, first_name, last_name, gender, date_of_birth, nationality, address, previous_school, admission_date, status, verify_token)
     VALUES (?, ?, ?, ?, ?, ?, 'Tanzanian', ?, ?, ?, ?, ?)`
  ).bind(sid, s.admission, s.first, s.last, s.gender, s.dob, ADDRESSES[s.i % ADDRESSES.length], s.i % 3 === 0 ? "Mwenge Primary School" : null, s.i % 4 === 0 ? addDays(-(4 + s.i)) : `${yr}-01-${String(6 + s.i % 10).padStart(2, "0")}`, s.status, randomToken2(16))));
  const { results: sRows } = await env.DB.prepare("SELECT id, admission_no FROM sch_students WHERE school_id = ?").bind(sid).all();
  const sid2id = Object.fromEntries(sRows.map((r) => [r.admission_no, r.id]));
  students.forEach((s) => {
    s.id = sid2id[s.admission];
  });
  const link = [];
  students.forEach((s) => {
    link.push(env.DB.prepare("INSERT INTO sch_enrollments (school_id, student_id, class_id, academic_year_id) VALUES (?, ?, ?, ?)").bind(sid, s.id, s.cls.id, year.id));
    link.push(env.DB.prepare("INSERT INTO sch_student_parents (student_id, parent_id, relationship, is_primary) VALUES (?, ?, ?, 1)").bind(s.id, parents[parentOf[s.i]].id, s.i % 3 === 0 ? "Father" : "Mother"));
    subjectIds.forEach((sub) => link.push(env.DB.prepare("INSERT INTO sch_student_subjects (student_id, subject_id, academic_year_id, school_id) VALUES (?, ?, ?, ?)").bind(s.id, sub, year.id, sid)));
  });
  await runBatches(env, link);
  await env.DB.prepare("DELETE FROM sch_fee_structures WHERE school_id = ? AND academic_year_id = ?").bind(sid, year.id).run();
  const fees = [["registration", "Registration fee", 2e4, -120], ["tuition", "Tuition \u2014 Term 1", 15e4, -60], ["tuition", "Tuition \u2014 Term 2", 15e4, 45], ["examination", "Examination fee", 3e4, 15]];
  await runBatches(env, fees.map(([type, name, amount, off]) => env.DB.prepare(
    "INSERT INTO sch_fee_structures (school_id, academic_year_id, class_id, fee_type, name, amount, due_date) VALUES (?, ?, NULL, ?, ?, ?, ?)"
  ).bind(sid, year.id, type, name, amount, addDays(off))));
  const plans = [[25e4, 1e5], [17e4], [2e4], [], [1e5], [2e5]];
  const methods = ["Bank", "Mobile Money", "Cash"];
  const pay = [];
  const rec = [];
  let n2 = 0;
  students.forEach((s) => {
    (plans[s.i % 6] || []).forEach((amt, k) => {
      n2 += 1;
      const method = methods[(s.i + k) % 3];
      const ref = `DEMO${String(n2).padStart(4, "0")}`;
      const date = addDays(-(80 - (s.i * 3 + k * 9) % 70));
      pay.push(env.DB.prepare(
        "INSERT INTO sch_payments (school_id, student_id, academic_year_id, amount, payment_date, method, reference, received_by, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
      ).bind(sid, s.id, year.id, amt, date, method, ref, ctx.user.id, "Sample payment"));
      rec.push(env.DB.prepare(`INSERT INTO sch_receipts (school_id, payment_id, receipt_no) VALUES (?, (SELECT id FROM sch_payments WHERE school_id = ? AND reference = ?), ?)`).bind(sid, sid, ref, `RCT-${yr}-${String(n2).padStart(6, "0")}`));
    });
  });
  await runBatches(env, pay);
  await runBatches(env, rec);
  const att = [];
  for (let d = 14; d >= 0; d -= 1) {
    const dt = new Date(Date.now() - d * 864e5);
    const dow = dt.getUTCDay();
    if (dow === 0 || dow === 6) continue;
    const date = iso(dt);
    students.filter((s) => s.status === "active").forEach((s) => {
      const r = rand();
      let status = "present";
      if (s.i === 4 || s.i === 13) status = r < 0.45 ? "absent" : "present";
      else if (r > 0.94) status = "absent";
      else if (r > 0.89) status = "late";
      att.push(env.DB.prepare(
        `INSERT INTO sch_attendance (school_id, student_id, class_id, subject_id, date, status, marked_by) VALUES (?, ?, ?, 0, ?, ?, ?)`
      ).bind(sid, s.id, s.cls.id, date, status, ctx.user.id));
    });
  }
  await runBatches(env, att);
  const { results: terms } = await env.DB.prepare("SELECT id FROM sch_terms WHERE school_id = ? ORDER BY sort_order LIMIT 1").bind(sid).all();
  const termId = terms[0] ? terms[0].id : null;
  const examDefs = classes.map((c) => ({ c, name: "Midterm Examination", type: "Midterm Examination", off: -20, subjects: subjectIds }));
  examDefs.push({ c: classes[0], name: "Monthly Test \u2014 August", type: "Monthly Test", off: -45, subjects: subjectIds.slice(0, 5) });
  await runBatches(env, examDefs.map((e) => env.DB.prepare(
    `INSERT INTO sch_examinations (school_id, name, exam_type, academic_year_id, term_id, class_id, exam_date, max_marks, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, 100, ?)`
  ).bind(sid, e.name, e.type, year.id, termId, e.c.id, addDays(e.off), ctx.user.id)));
  const { results: exRows } = await env.DB.prepare("SELECT id, class_id, name FROM sch_examinations WHERE school_id = ? ORDER BY id").bind(sid).all();
  const resStmts = [];
  exRows.forEach((ex, idx) => {
    const def = examDefs[idx];
    students.filter((s) => s.cls.id === ex.class_id && s.status === "active").forEach((s) => {
      const strength = 0.35 + rand() * 0.55;
      def.subjects.forEach((sub) => {
        const marks = Math.max(8, Math.min(98, Math.round(strength * 100 + (rand() - 0.5) * 30)));
        resStmts.push(env.DB.prepare("INSERT INTO sch_results (school_id, exam_id, student_id, subject_id, marks, entered_by) VALUES (?, ?, ?, ?, ?, ?)").bind(sid, ex.id, s.id, sub, marks, ctx.user.id));
      });
    });
  });
  await runBatches(env, resStmts);
  await runBatches(env, exRows.slice(0, 1).flatMap((ex) => students.filter((s) => s.cls.id === ex.class_id).slice(0, 3).map((s) => env.DB.prepare(
    `INSERT INTO sch_report_comments (school_id, exam_id, student_id, teacher_comment, remarks, updated_by) VALUES (?, ?, ?, ?, ?, ?)`
  ).bind(sid, ex.id, s.id, "A hardworking student who participates well in class. Keep it up.", null, ctx.user.id))));
  const slots = [["08:00", "10:00"], ["10:30", "12:30"], ["13:30", "15:30"]];
  const { results: csRows } = await env.DB.prepare("SELECT class_id, subject_id, teacher_id FROM sch_class_subjects WHERE school_id = ?").bind(sid).all();
  const busy = /* @__PURE__ */ new Set();
  const tt = [];
  classes.forEach((c, k) => {
    for (let d = 1; d <= 5; d += 1) {
      slots.forEach(([a, b], si) => {
        const list = subjectIds.slice();
        const start = (d * 3 + si + k * 4) % list.length;
        for (let tries = 0; tries < list.length; tries += 1) {
          const sub = list[(start + tries) % list.length];
          const cs = csRows.find((x) => x.class_id === c.id && x.subject_id === sub);
          const key = `${d}|${si}|${cs && cs.teacher_id}`;
          if (cs && cs.teacher_id && busy.has(key)) continue;
          if (cs && cs.teacher_id) busy.add(key);
          tt.push(env.DB.prepare(`INSERT INTO sch_timetable (school_id, class_id, subject_id, teacher_id, day_of_week, start_time, end_time, room) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).bind(sid, c.id, sub, cs ? cs.teacher_id : null, d, a, b, `Room ${k + 1}`));
          break;
        }
      });
    }
  });
  await runBatches(env, tt);
  await runBatches(env, [
    env.DB.prepare(`INSERT INTO sch_notifications (school_id, title, message, type, audience, created_by) VALUES (?, ?, ?, 'general', 'all', ?)`).bind(sid, "Welcome to the new term", "Classes resume on Monday at 08:00. Please make sure all fees are up to date.", ctx.user.id),
    env.DB.prepare(`INSERT INTO sch_notifications (school_id, title, message, type, audience, created_by) VALUES (?, ?, ?, 'general', 'parents', ?)`).bind(sid, "Parents' meeting", "There will be a parents' meeting this Saturday at 10:00 in the main hall.", ctx.user.id)
  ]);
  await audit(env, request, ctx, "demo.load", "school", sid, `${students.length} students, ${T.length} teachers`);
  return json({ ok: true, students: students.length, teachers: T.length, parents: parents.length }, { status: 201 });
});
var resetSchoolData = secure({ perm: "settings.manage", roles: ["admin"] }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  if (String(b.confirm || "").trim() !== ctx.school.name) fail(400, "To confirm, type the exact name of your school.");
  const sid = ctx.school.id;
  const { results: photos } = await env.DB.prepare(
    `SELECT photo_key AS k FROM sch_students WHERE school_id = ? AND photo_key IS NOT NULL UNION SELECT photo_key FROM sch_teachers WHERE school_id = ? AND photo_key IS NOT NULL`
  ).bind(sid, sid).all();
  await env.DB.batch([
    env.DB.prepare("DELETE FROM sch_payments WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_notifications WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_examinations WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_timetable WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_attendance WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_students WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_parents WHERE school_id = ?").bind(sid),
    env.DB.prepare(`UPDATE sch_members SET active = 0, teacher_id = NULL WHERE school_id = ? AND role = 'teacher'`).bind(sid),
    env.DB.prepare(`DELETE FROM sch_members WHERE school_id = ? AND role = 'parent'`).bind(sid),
    env.DB.prepare("DELETE FROM sch_teachers WHERE school_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM sch_fee_structures WHERE school_id = ?").bind(sid)
  ]);
  if (env.MATERIALS) for (const p of photos.slice(0, 300)) await env.MATERIALS.delete(p.k).catch(() => {
  });
  await audit(env, request, ctx, "school.reset", "school", sid, "All students, staff records, fees, attendance, exams and payments erased");
  return json({ ok: true });
});

// src/handlers/shop/core.js
init_auth();

// src/lib/shop-auth.js
init_auth();
init_school_auth();
var ROLES3 = ["owner", "manager", "cashier"];
var PERMISSIONS3 = [
  { group: "Customers", key: "customers.view", label: "View customers" },
  { group: "Customers", key: "customers.create", label: "Save new customers" },
  { group: "Customers", key: "customers.edit", label: "Edit customers" },
  { group: "Customers", key: "customers.delete", label: "Delete customers" },
  { group: "Customers", key: "customers.notes", label: "Add private notes about customers" },
  { group: "Products", key: "products.view", label: "View products & stock" },
  { group: "Products", key: "products.manage", label: "Add, edit & delete products" },
  { group: "Products", key: "stock.adjust", label: "Receive & adjust stock" },
  { group: "Sales", key: "sales.create", label: "Make sales (Point of Sale)" },
  { group: "Sales", key: "sales.view", label: "View all sales & receipts" },
  { group: "Sales", key: "sales.discount", label: "Give discounts & change prices at the till" },
  { group: "Sales", key: "sales.void", label: "Cancel (void) sales" },
  { group: "Money", key: "payments.record", label: "Receive customer payments" },
  { group: "Money", key: "expenses.manage", label: "Record & view expenses" },
  { group: "Money", key: "profit.view", label: "See cost prices & profit" },
  { group: "System", key: "reports.view", label: "View reports" },
  { group: "System", key: "users.manage", label: "Manage staff logins" },
  { group: "System", key: "settings.manage", label: "Change shop settings" },
  { group: "System", key: "audit.view", label: "View activity log" }
];
var ALL_PERMISSION_KEYS2 = PERMISSIONS3.map((p) => p.key);
var DEFAULT_ROLE_PERMISSIONS2 = {
  owner: ALL_PERMISSION_KEYS2,
  manager: ALL_PERMISSION_KEYS2.filter((k) => !["users.manage", "settings.manage"].includes(k)),
  cashier: ["customers.view", "customers.create", "products.view", "sales.create", "sales.view", "payments.record"]
};
var DEFAULT_PAYMENT_METHODS2 = ["Cash", "Mobile Money", "Bank", "Card", "Other"];
var round22 = /* @__PURE__ */ __name((n2) => Math.round((Number(n2) + Number.EPSILON) * 100) / 100, "round2");
async function getShopContext(request, env) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return { error: json({ error: "Please sign in to continue.", code: "unauthorized" }, { status: 401 }) };
  const url = new URL(request.url);
  const wanted = Number(request.headers.get("X-Shop-Id") || url.searchParams.get("shop_id") || 0);
  const sql = `SELECT m.id AS member_id, m.role, s.*
               FROM shp_members m JOIN shp_shops s ON s.id = m.shop_id
               WHERE m.user_id = ? AND m.active = 1 ${wanted ? "AND m.shop_id = ?" : ""}
               ORDER BY m.id ASC LIMIT 1`;
  let row = await (wanted ? env.DB.prepare(sql).bind(user.id, wanted) : env.DB.prepare(sql).bind(user.id)).first();
  if (!row && wanted) {
    row = await env.DB.prepare(sql.replace("AND m.shop_id = ?", "")).bind(user.id).first();
  }
  const ctx = { user, shop: null, role: null, perms: /* @__PURE__ */ new Set(), off: 180, _cache: {} };
  if (!row) return ctx;
  ctx.shop = {
    id: row.id,
    name: row.name,
    short_name: row.short_name,
    logo_key: row.logo_key,
    phone: row.phone,
    email: row.email,
    address: row.address,
    website: row.website,
    tax_no: row.tax_no,
    currency: row.currency,
    primary_color: row.primary_color,
    tax_rate: Number(row.tax_rate) || 0,
    utc_offset_min: Number.isInteger(row.utc_offset_min) ? row.utc_offset_min : 180,
    receipt_note: row.receipt_note
  };
  ctx.off = ctx.shop.utc_offset_min;
  ctx.role = row.role;
  if (ctx.role === "owner") {
    ALL_PERMISSION_KEYS2.forEach((k) => ctx.perms.add(k));
  } else {
    const { results } = await env.DB.prepare(
      "SELECT permission FROM shp_role_permissions WHERE shop_id = ? AND role = ?"
    ).bind(ctx.shop.id, ctx.role).all();
    results.forEach((r) => ctx.perms.add(r.permission));
  }
  return ctx;
}
__name(getShopContext, "getShopContext");
var can3 = /* @__PURE__ */ __name((ctx, perm) => ctx.role === "owner" || ctx.perms.has(perm), "can");
function secure2(opts, fn) {
  if (typeof opts === "function") {
    fn = opts;
    opts = {};
  }
  return async ({ request, env, params, url }) => {
    try {
      if (!["GET", "HEAD", "OPTIONS"].includes(request.method)) assertSameOrigin(request);
      const ctx = await getShopContext(request, env);
      if (ctx.error) return ctx.error;
      if (!ctx.shop) {
        if (opts.shop === false) return await fn({ request, env, params, url, ctx });
        return json({ error: "You are not part of a shop yet.", code: "no_shop" }, { status: 403 });
      }
      if (opts.roles && !opts.roles.includes(ctx.role)) fail(403, "You do not have access to this.");
      if (opts.perm) {
        const list = Array.isArray(opts.perm) ? opts.perm : [opts.perm];
        if (!list.some((p) => can3(ctx, p))) fail(403, "You do not have permission to do this. Ask the shop owner.");
      }
      return await fn({ request, env, params, url, ctx });
    } catch (e) {
      return errorResponse(e);
    }
  };
}
__name(secure2, "secure");
async function getSettings3(env, shopId) {
  const { results } = await env.DB.prepare("SELECT key, value FROM shp_settings WHERE shop_id = ?").bind(shopId).all();
  const raw = {};
  results.forEach((r) => {
    raw[r.key] = safeJson(r.value, r.value);
  });
  return {
    payment_methods: Array.isArray(raw.payment_methods) && raw.payment_methods.length ? raw.payment_methods : DEFAULT_PAYMENT_METHODS2,
    receipt_footer: typeof raw.receipt_footer === "string" ? raw.receipt_footer : "Thank you for shopping with us!",
    receipt_prefix: typeof raw.receipt_prefix === "string" && raw.receipt_prefix ? raw.receipt_prefix : "RCT",
    customer_prefix: typeof raw.customer_prefix === "string" && raw.customer_prefix ? raw.customer_prefix : "C",
    // How many currency units a customer must spend to earn 1 loyalty point (0 = loyalty is off).
    loyalty_rate: Number(raw.loyalty_rate) > 0 ? Number(raw.loyalty_rate) : 0,
    allow_negative_stock: raw.allow_negative_stock === true,
    expense_categories: Array.isArray(raw.expense_categories) && raw.expense_categories.length ? raw.expense_categories : ["Rent", "Electricity & water", "Transport", "Salaries", "Stock purchase", "Marketing", "Repairs", "Other"]
  };
}
__name(getSettings3, "getSettings");
async function saveSetting2(env, shopId, key, value) {
  await env.DB.prepare(
    `INSERT INTO shp_settings (shop_id, key, value) VALUES (?, ?, ?)
     ON CONFLICT(shop_id, key) DO UPDATE SET value = excluded.value`
  ).bind(shopId, key, JSON.stringify(value)).run();
}
__name(saveSetting2, "saveSetting");
var offsetMin = /* @__PURE__ */ __name((ctx) => Number.isInteger(ctx.off) ? ctx.off : 180, "offsetMin");
var localDate = /* @__PURE__ */ __name((col, off) => `date(${col}, '${Number(off) | 0} minutes')`, "localDate");
var shopToday = /* @__PURE__ */ __name((off) => new Date(Date.now() + (Number(off) | 0) * 6e4).toISOString().slice(0, 10), "shopToday");
var addDays2 = /* @__PURE__ */ __name((ymd, n2) => new Date(Date.parse(ymd + "T00:00:00Z") + n2 * 864e5).toISOString().slice(0, 10), "addDays");
async function audit2(env, request, ctx, action, entity, entityId, details) {
  try {
    await env.DB.prepare(
      `INSERT INTO shp_audit_logs (shop_id, user_id, action, entity, entity_id, details, ip, user_agent)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      ctx.shop.id,
      ctx.user ? ctx.user.id : null,
      action,
      entity || null,
      entityId || null,
      details == null ? null : String(typeof details === "string" ? details : JSON.stringify(details)).slice(0, 1e3),
      request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null,
      (request.headers.get("User-Agent") || "").slice(0, 250) || null
    ).run();
  } catch (e) {
  }
}
__name(audit2, "audit");
function formatReceiptNo(prefix, seq) {
  return `${prefix}-${String(seq).padStart(6, "0")}`;
}
__name(formatReceiptNo, "formatReceiptNo");

// src/handlers/shop/core.js
function makeShort2(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const stop = /* @__PURE__ */ new Set(["of", "the", "and", "shop", "store", "stores", "supermarket", "ltd", "limited", "company", "co"]);
  let letters = words.filter((w) => !stop.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join("");
  if (letters.length < 2) letters = String(name).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  return (letters || "SHP").slice(0, 5);
}
__name(makeShort2, "makeShort");
var STARTER_CATEGORIES = [
  ["General", "#6366F1"],
  ["Food & Drinks", "#F59E0B"],
  ["Household", "#10B981"],
  ["Electronics", "#3B82F6"],
  ["Clothing", "#EC4899"],
  ["Services", "#8B5CF6"]
];
async function provisionShop(env, user, info) {
  const short = makeShort2(info.name);
  const ins = await env.DB.prepare(
    `INSERT INTO shp_shops (name, short_name, phone, email, address, owner_user_id, receipt_note)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).bind(info.name, short, info.phone || null, info.email || null, info.address || null, user.id, "Thank you for shopping with us!").run();
  const shopId = ins.meta.last_row_id;
  const stmts = [];
  STARTER_CATEGORIES.forEach(([n2, color]) => stmts.push(
    env.DB.prepare("INSERT INTO shp_categories (shop_id, name, color) VALUES (?, ?, ?)").bind(shopId, n2, color)
  ));
  stmts.push(env.DB.prepare("INSERT INTO shp_members (shop_id, user_id, role) VALUES (?, ?, ?)").bind(shopId, user.id, "owner"));
  for (const role of ["manager", "cashier"]) {
    for (const p of DEFAULT_ROLE_PERMISSIONS2[role]) {
      stmts.push(env.DB.prepare("INSERT INTO shp_role_permissions (shop_id, role, permission) VALUES (?, ?, ?)").bind(shopId, role, p));
    }
  }
  await env.DB.batch(stmts);
  return shopId;
}
__name(provisionShop, "provisionShop");
async function startSession2(env, userId, remember) {
  const token = randomToken2(32);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expires).run();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` + (remember ? `; Expires=${new Date(expires).toUTCString()}` : "");
}
__name(startSession2, "startSession");
var clientIp2 = /* @__PURE__ */ __name((request) => request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null, "clientIp");
async function tooManyAttempts2(env, email, ip) {
  const a = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM shp_login_attempts WHERE success = 0 AND email = ? AND created_at > datetime('now','-15 minutes')`
  ).bind(email).first();
  if ((a?.n || 0) >= 8) return true;
  if (ip) {
    const b = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM shp_login_attempts WHERE success = 0 AND ip = ? AND created_at > datetime('now','-15 minutes')`
    ).bind(ip).first();
    if ((b?.n || 0) >= 25) return true;
  }
  return false;
}
__name(tooManyAttempts2, "tooManyAttempts");
async function registerShop({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const shopName = V.str(body.shop_name, "Shop name", { required: true, max: 120, min: 2 });
    const name = V.str(body.name, "Your name", { required: true, max: 100 });
    const email = V.email(body.email, "Email", { required: true });
    const password = V.password(body.password);
    const phone = V.phone(body.phone, "Phone number");
    const ip = clientIp2(request);
    const recent = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM shp_login_attempts WHERE ip = ? AND email = '(signup)' AND created_at > datetime('now','-1 hour')`
    ).bind(ip).first();
    if (ip && (recent?.n || 0) >= 10) fail(429, "Too many sign-ups from this connection. Please try again later.");
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (exists) fail(409, "An account with this email already exists. Please sign in instead, then create your shop.");
    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)").bind(name, email, hash, salt, "user").run();
    const user = { id: u.meta.last_row_id, name, email };
    const shopId = await provisionShop(env, user, { name: shopName, phone, email });
    await env.DB.prepare(`INSERT INTO shp_login_attempts (email, ip, success) VALUES ('(signup)', ?, 1)`).bind(ip).run();
    const cookie = await startSession2(env, user.id, true);
    await audit2(env, request, { shop: { id: shopId }, user }, "shop.create", "shop", shopId, `Shop "${shopName}" created`);
    return json({ ok: true, shop_id: shopId }, { status: 201, headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(registerShop, "registerShop");
var createShop = secure2({ shop: false }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const shopName = V.str(body.shop_name, "Shop name", { required: true, max: 120, min: 2 });
  const phone = V.phone(body.phone, "Phone number");
  const owned = await env.DB.prepare("SELECT COUNT(*) AS n FROM shp_shops WHERE owner_user_id = ?").bind(ctx.user.id).first();
  if ((owned?.n || 0) >= 5) fail(400, "You already own 5 shops. Please contact support for more.");
  const shopId = await provisionShop(env, ctx.user, { name: shopName, phone, email: ctx.user.email });
  await audit2(env, request, { shop: { id: shopId }, user: ctx.user }, "shop.create", "shop", shopId, `Shop "${shopName}" created`);
  return json({ ok: true, shop_id: shopId }, { status: 201 });
});
async function login3({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = V.str(body.email, "Email", { required: true, max: 160 }).toLowerCase();
    const password = String(body.password || "");
    if (!password) fail(400, "Password is required.");
    const ip = clientIp2(request);
    if (await tooManyAttempts2(env, email, ip)) {
      fail(429, 'Too many failed sign-in attempts. Please wait 15 minutes and try again, or use "Forgot password".');
    }
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    const ok = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;
    await env.DB.prepare("INSERT INTO shp_login_attempts (email, ip, success) VALUES (?, ?, ?)").bind(email, ip, ok ? 1 : 0).run();
    if (!ok) fail(401, "Incorrect email or password.");
    const cookie = await startSession2(env, user.id, !!body.remember);
    await env.DB.prepare("INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)").bind(user.id, ip, request.headers.get("User-Agent") || null).run();
    const { results: ms } = await env.DB.prepare("SELECT shop_id, role FROM shp_members WHERE user_id = ? AND active = 1 ORDER BY id").bind(user.id).all();
    for (const m of ms) {
      await audit2(env, request, { shop: { id: m.shop_id }, user }, "user.login", "user", user.id, `Signed in as ${m.role}`);
    }
    return json({ ok: true, has_shop: ms.length > 0, role: ms[0] ? ms[0].role : null }, { headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(login3, "login");
async function logout3({ request, env }) {
  const header = request.headers.get("Cookie") || "";
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match[1]).run();
  return json({ ok: true }, { headers: { "Set-Cookie": "s21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } });
}
__name(logout3, "logout");
async function context2({ request, env }) {
  try {
    const ctx = await getShopContext(request, env);
    if (ctx.error) return ctx.error;
    const { results: memberships } = await env.DB.prepare(
      `SELECT s.id, s.name, m.role FROM shp_members m JOIN shp_shops s ON s.id = m.shop_id
       WHERE m.user_id = ? AND m.active = 1 ORDER BY m.id`
    ).bind(ctx.user.id).all();
    const user = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    if (!ctx.shop) return json({ user, shop: null, memberships });
    const settings = await getSettings3(env, ctx.shop.id);
    return json({
      user,
      shop: { ...ctx.shop, logo_key: void 0, has_logo: !!ctx.shop.logo_key },
      role: ctx.role,
      permissions: [...ctx.perms],
      memberships,
      settings: {
        payment_methods: settings.payment_methods,
        loyalty_rate: settings.loyalty_rate,
        allow_negative_stock: settings.allow_negative_stock,
        expense_categories: settings.expense_categories
      }
    });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(context2, "context");
var lookups2 = secure2(async ({ env, ctx }) => {
  const sid = ctx.shop.id;
  const [cats, settings] = await Promise.all([
    env.DB.prepare("SELECT id, name, color FROM shp_categories WHERE shop_id = ? ORDER BY name").bind(sid).all().then((r) => r.results),
    getSettings3(env, sid)
  ]);
  return json({ categories: cats, payment_methods: settings.payment_methods });
});
var getShopInfo = secure2({ perm: "settings.manage" }, async ({ env, ctx }) => {
  const settings = await getSettings3(env, ctx.shop.id);
  return json({ shop: ctx.shop, settings });
});
var updateShopInfo = secure2({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Shop name", { required: true, max: 120, min: 2 });
  const shortName = V.str(b.short_name, "Short name", { required: true, max: 8 }).toUpperCase();
  const taxRate = V.num(b.tax_rate, "VAT rate", { min: 0, max: 100 }) ?? 0;
  const off = V.int(b.utc_offset_min, "Time zone", { min: -720, max: 840 });
  await env.DB.prepare(
    `UPDATE shp_shops SET name = ?, short_name = ?, phone = ?, email = ?, address = ?, website = ?, tax_no = ?,
       currency = ?, primary_color = COALESCE(?, primary_color), tax_rate = ?, utc_offset_min = COALESCE(?, utc_offset_min), receipt_note = ?
     WHERE id = ?`
  ).bind(
    name,
    shortName,
    V.phone(b.phone, "Phone"),
    V.email(b.email, "Email"),
    V.str(b.address, "Address", { max: 300 }),
    V.str(b.website, "Website", { max: 200 }),
    V.str(b.tax_no, "Tax number (TIN)", { max: 40 }),
    V.str(b.currency, "Currency", { max: 6, required: true }).toUpperCase(),
    V.color(b.primary_color, "Brand colour"),
    taxRate,
    off,
    V.str(b.receipt_note, "Receipt note", { max: 300 }),
    ctx.shop.id
  ).run();
  await audit2(env, request, ctx, "settings.shop", "shop", ctx.shop.id, "Shop information updated");
  return json({ ok: true });
});
var uploadLogo2 = secure2({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a logo image.");
  const key = await storeImage(env, form.get("logo"), `shop/${ctx.shop.id}/logo`);
  const old = ctx.shop.logo_key;
  await env.DB.prepare("UPDATE shp_shops SET logo_key = ? WHERE id = ?").bind(key, ctx.shop.id).run();
  if (old && env.MATERIALS) await env.MATERIALS.delete(old).catch(() => {
  });
  await audit2(env, request, ctx, "settings.logo", "shop", ctx.shop.id, "Logo changed");
  return json({ ok: true });
});
async function publicLogo2({ params, env }) {
  const s = await env.DB.prepare("SELECT logo_key FROM shp_shops WHERE id = ?").bind(params.id).first();
  if (!s || !s.logo_key) return new Response("Not found", { status: 404 });
  return imageResponse(env, s.logo_key);
}
__name(publicLogo2, "publicLogo");
var saveSettings2 = secure2({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const sid = ctx.shop.id;
  if (b.payment_methods !== void 0) {
    if (!Array.isArray(b.payment_methods) || !b.payment_methods.length) fail(400, "Add at least one payment method.");
    const list = [...new Set(b.payment_methods.map((m) => V.str(m, "Payment method", { required: true, max: 40 })))];
    await saveSetting2(env, sid, "payment_methods", list);
  }
  if (b.expense_categories !== void 0) {
    if (!Array.isArray(b.expense_categories) || !b.expense_categories.length) fail(400, "Add at least one expense category.");
    await saveSetting2(env, sid, "expense_categories", [...new Set(b.expense_categories.map((m) => V.str(m, "Expense category", { required: true, max: 40 })))]);
  }
  if (b.loyalty_rate !== void 0) {
    await saveSetting2(env, sid, "loyalty_rate", V.num(b.loyalty_rate, "Loyalty rate", { min: 0, max: 1e8 }) ?? 0);
  }
  if (b.allow_negative_stock !== void 0) await saveSetting2(env, sid, "allow_negative_stock", !!b.allow_negative_stock);
  for (const k of ["receipt_footer", "receipt_prefix", "customer_prefix"]) {
    if (b[k] !== void 0) {
      const val = V.str(b[k], k, { max: 300 }) || "";
      if ((k === "receipt_prefix" || k === "customer_prefix") && !/^[A-Za-z0-9]{1,8}$/.test(val)) fail(400, "Prefixes must be 1\u20138 letters or numbers.");
      await saveSetting2(env, sid, k, k.endsWith("prefix") ? val.toUpperCase() : val);
    }
  }
  await audit2(env, request, ctx, "settings.update", "settings", null, Object.keys(b).join(", "));
  return json({ ok: true, settings: await getSettings3(env, sid) });
});
var getPermissions2 = secure2({ perm: ["settings.manage", "users.manage"] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare("SELECT role, permission FROM shp_role_permissions WHERE shop_id = ?").bind(ctx.shop.id).all();
  const matrix = { owner: ALL_PERMISSION_KEYS2, manager: [], cashier: [] };
  results.forEach((r) => {
    if (matrix[r.role]) matrix[r.role].push(r.permission);
  });
  return json({ catalogue: PERMISSIONS3, matrix, defaults: DEFAULT_ROLE_PERMISSIONS2 });
});
var savePermissions2 = secure2({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const role = V.oneOf(b.role, "Role", ["manager", "cashier"], { required: true });
  const perms = [...new Set((b.permissions || []).map(String))];
  if (perms.some((p) => !ALL_PERMISSION_KEYS2.includes(p))) fail(400, "Unknown permission in the list.");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM shp_role_permissions WHERE shop_id = ? AND role = ?").bind(ctx.shop.id, role),
    ...perms.map((p) => env.DB.prepare("INSERT INTO shp_role_permissions (shop_id, role, permission) VALUES (?, ?, ?)").bind(ctx.shop.id, role, p))
  ]);
  await audit2(env, request, ctx, "settings.permissions", "role", null, `${role}: ${perms.length} permissions`);
  return json({ ok: true });
});
var listUsers3 = secure2({ perm: "users.manage" }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.role, m.active, m.created_at, u.id AS user_id, u.name, u.email,
            (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login
     FROM shp_members m JOIN users u ON u.id = m.user_id
     WHERE m.shop_id = ? ORDER BY CASE m.role WHEN 'owner' THEN 0 WHEN 'manager' THEN 1 ELSE 2 END, u.name`
  ).bind(ctx.shop.id).all();
  return json({ users: results });
});
var addUser2 = secure2({ perm: "users.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Full name", { required: true, max: 100 });
  const email = V.email(b.email, "Email", { required: true });
  const role = V.oneOf(b.role, "Role", ROLES3, { required: true });
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  let userId;
  let linked = false;
  if (existing) {
    userId = existing.id;
    linked = true;
    const m = await env.DB.prepare("SELECT id FROM shp_members WHERE shop_id = ? AND user_id = ?").bind(ctx.shop.id, userId).first();
    if (m) fail(409, "This person already has a login for your shop.");
  } else {
    const { hash, salt } = await hashPassword(V.password(b.password, "Temporary password"));
    const r = await env.DB.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)").bind(name, email, hash, salt, "user").run();
    userId = r.meta.last_row_id;
  }
  await env.DB.prepare("INSERT INTO shp_members (shop_id, user_id, role) VALUES (?, ?, ?)").bind(ctx.shop.id, userId, role).run();
  await audit2(env, request, ctx, "user.create", "user", userId, `${email} as ${role}`);
  return json({ ok: true, user_id: userId, linked }, { status: 201 });
});
var updateUser2 = secure2({ perm: "users.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const m = await env.DB.prepare("SELECT * FROM shp_members WHERE id = ? AND shop_id = ?").bind(params.id, ctx.shop.id).first();
  if (!m) fail(404, "User not found.");
  const role = b.role !== void 0 ? V.oneOf(b.role, "Role", ROLES3, { required: true }) : m.role;
  const active = b.active === void 0 ? m.active : b.active ? 1 : 0;
  if (m.role === "owner" && (role !== "owner" || !active)) {
    const others = await env.DB.prepare(`SELECT COUNT(*) AS n FROM shp_members WHERE shop_id = ? AND role = 'owner' AND active = 1 AND id != ?`).bind(ctx.shop.id, m.id).first();
    if (!others.n) fail(400, "Your shop needs at least one active owner.");
  }
  await env.DB.prepare("UPDATE shp_members SET role = ?, active = ? WHERE id = ?").bind(role, active, m.id).run();
  if (b.new_password) {
    const other = await env.DB.prepare("SELECT COUNT(*) AS n FROM shp_members WHERE user_id = ? AND shop_id != ?").bind(m.user_id, ctx.shop.id).first();
    if (other.n) fail(400, "This person also belongs to another shop, so only they can change their password.");
    const { hash, salt } = await hashPassword(V.password(b.new_password, "New password"));
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, m.user_id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(m.user_id)
    ]);
  }
  await audit2(env, request, ctx, "user.update", "user", m.user_id, `${m.role}\u2192${role}, active=${active}${b.new_password ? ", password reset" : ""}`);
  return json({ ok: true });
});

// src/handlers/shop/customers.js
init_auth();
var PHONE_KEY_SQL = /* @__PURE__ */ __name((col) => `REPLACE(REPLACE(REPLACE(REPLACE(${col}, ' ', ''), '-', ''), '(', ''), ')', '')`, "PHONE_KEY_SQL");
var phoneKey = /* @__PURE__ */ __name((p) => p ? String(p).replace(/[\s\-()]/g, "") : null, "phoneKey");
var TYPES2 = ["retail", "wholesale", "vip"];
var CUSTOMER_STATS_JOIN = `LEFT JOIN (
    SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent, SUM(balance) AS balance, MAX(created_at) AS last_purchase
    FROM shp_sales WHERE shop_id = ?1 AND status = 'completed' AND customer_id IS NOT NULL GROUP BY customer_id
  ) st ON st.customer_id = c.id`;
function readCustomer(b) {
  const gender = V.oneOf(b.gender, "Gender", ["male", "female"], { def: null });
  return {
    full_name: V.str(b.full_name, "Customer name", { required: true, max: 120, min: 2 }),
    phone: V.phone(b.phone, "Phone number"),
    alt_phone: V.phone(b.alt_phone, "Second phone number"),
    email: V.email(b.email, "Email"),
    address: V.str(b.address, "Address", { max: 300 }),
    city: V.str(b.city, "City / area", { max: 80 }),
    company: V.str(b.company, "Company", { max: 120 }),
    customer_type: V.oneOf(b.customer_type, "Customer type", TYPES2, { def: "retail" }),
    gender,
    birthday: V.date(b.birthday, "Birthday"),
    credit_limit: V.num(b.credit_limit, "Credit limit", { min: 0, max: 1e12 }) ?? 0,
    notes: V.str(b.notes, "Notes", { max: 1e3 })
  };
}
__name(readCustomer, "readCustomer");
async function assertPhoneFree(env, shopId, phone, exceptId = 0) {
  const key = phoneKey(phone);
  if (!key) return;
  const dup = await env.DB.prepare(
    `SELECT id, full_name, customer_no FROM shp_customers WHERE shop_id = ? AND ${PHONE_KEY_SQL("phone")} = ? AND id != ? LIMIT 1`
  ).bind(shopId, key, exceptId).first();
  if (dup) throw new HttpError(409, `${dup.full_name} (${dup.customer_no}) is already saved with this phone number.`, { existing_id: dup.id });
}
__name(assertPhoneFree, "assertPhoneFree");
async function loadCustomer(env, ctx, id) {
  const c = await env.DB.prepare("SELECT * FROM shp_customers WHERE id = ? AND shop_id = ?").bind(id, ctx.shop.id).first();
  if (!c) fail(404, "Customer not found.");
  return c;
}
__name(loadCustomer, "loadCustomer");
var listCustomers2 = secure2({ perm: "customers.view" }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id;
  const sp = url.searchParams;
  const all2 = sp.get("all") === "1";
  const { page, limit, offset } = all2 ? { page: 1, limit: 5e3, offset: 0 } : paging(url, 20, 100);
  const where = ["c.shop_id = ?1"];
  const binds = [sid];
  const add = /* @__PURE__ */ __name((sql, ...v) => {
    let i = binds.length;
    where.push(sql.replace(/\?/g, () => `?${++i}`));
    binds.push(...v);
  }, "add");
  const q = (sp.get("q") || "").trim();
  if (q) {
    const like = likeTerm(q);
    add(`(c.full_name LIKE ? ESCAPE '\\' OR c.phone LIKE ? ESCAPE '\\' OR c.alt_phone LIKE ? ESCAPE '\\' OR c.email LIKE ? ESCAPE '\\' OR c.customer_no LIKE ? ESCAPE '\\' OR c.company LIKE ? ESCAPE '\\')`, like, like, like, like, like, like);
  }
  if (sp.get("status")) add("c.status = ?", V.oneOf(sp.get("status"), "Status", ["active", "inactive"]));
  if (sp.get("type")) add("c.customer_type = ?", V.oneOf(sp.get("type"), "Type", TYPES2));
  if (sp.get("owing") === "1") where.push("COALESCE(st.balance, 0) > 0.004");
  const SORTS = {
    name: "c.full_name COLLATE NOCASE ASC",
    recent: "c.id DESC",
    spent: "COALESCE(st.spent, 0) DESC",
    balance: "COALESCE(st.balance, 0) DESC",
    last: "st.last_purchase DESC, c.id DESC"
  };
  const order = SORTS[sp.get("sort")] || SORTS.recent;
  const base = `FROM shp_customers c ${CUSTOMER_STATS_JOIN} WHERE ${where.join(" AND ")}`;
  const [{ results }, count, summary2] = await Promise.all([
    env.DB.prepare(`SELECT c.*, COALESCE(st.orders, 0) AS orders, COALESCE(st.spent, 0) AS spent, COALESCE(st.balance, 0) AS balance, st.last_purchase
      ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN c.status = 'active' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN COALESCE(st.balance, 0) > 0.004 THEN 1 ELSE 0 END) AS owing_count,
              COALESCE(SUM(CASE WHEN COALESCE(st.balance, 0) > 0.004 THEN st.balance ELSE 0 END), 0) AS owing_total,
              SUM(CASE WHEN c.created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS new_30d
       FROM shp_customers c ${CUSTOMER_STATS_JOIN} WHERE c.shop_id = ?1`
    ).bind(sid).first()
  ]);
  return json({ customers: results, total: count.n, page, limit, summary: summary2 });
});
var createCustomer2 = secure2({ perm: "customers.create" }, async ({ request, env, ctx }) => {
  const b = readCustomer(await readJson(request));
  const sid = ctx.shop.id;
  await assertPhoneFree(env, sid, b.phone);
  const settings = await getSettings3(env, sid);
  const prefix = settings.customer_prefix;
  const r = await env.DB.prepare(
    `INSERT INTO shp_customers (shop_id, seq, customer_no, full_name, phone, alt_phone, email, address, city, company,
        customer_type, gender, birthday, credit_limit, notes, created_by)
     SELECT ?1, n.seq, ?2 || '-' || substr('0000' || n.seq, -4, 4), ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15
     FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM shp_customers WHERE shop_id = ?1) n`
  ).bind(
    sid,
    prefix,
    b.full_name,
    b.phone,
    b.alt_phone,
    b.email,
    b.address,
    b.city,
    b.company,
    b.customer_type,
    b.gender,
    b.birthday,
    b.credit_limit,
    b.notes,
    ctx.user.id
  ).run();
  const id = r.meta.last_row_id;
  const row = await env.DB.prepare("SELECT * FROM shp_customers WHERE id = ?").bind(id).first();
  await audit2(env, request, ctx, "customer.create", "customer", id, `${row.full_name} (${row.customer_no})`);
  return json({ ok: true, id, customer: row }, { status: 201 });
});
var updateCustomer2 = secure2({ perm: "customers.edit" }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = readCustomer(await readJson(request));
  await assertPhoneFree(env, ctx.shop.id, b.phone, c.id);
  await env.DB.prepare(
    `UPDATE shp_customers SET full_name = ?, phone = ?, alt_phone = ?, email = ?, address = ?, city = ?, company = ?,
       customer_type = ?, gender = ?, birthday = ?, credit_limit = ?, notes = ?, updated_at = datetime('now')
     WHERE id = ? AND shop_id = ?`
  ).bind(
    b.full_name,
    b.phone,
    b.alt_phone,
    b.email,
    b.address,
    b.city,
    b.company,
    b.customer_type,
    b.gender,
    b.birthday,
    b.credit_limit,
    b.notes,
    c.id,
    ctx.shop.id
  ).run();
  await env.DB.prepare("UPDATE shp_sales SET customer_name = ?, customer_phone = ? WHERE customer_id = ? AND shop_id = ?").bind(b.full_name, b.phone, c.id, ctx.shop.id).run();
  await audit2(env, request, ctx, "customer.update", "customer", c.id, b.full_name);
  return json({ ok: true });
});
var setCustomerStatus = secure2({ perm: "customers.edit" }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = await readJson(request);
  const status = V.oneOf(b.status, "Status", ["active", "inactive"], { required: true });
  await env.DB.prepare(`UPDATE shp_customers SET status = ?, updated_at = datetime('now') WHERE id = ?`).bind(status, c.id).run();
  await audit2(env, request, ctx, "customer.status", "customer", c.id, `${c.full_name} \u2192 ${status}`);
  return json({ ok: true });
});
var deleteCustomer2 = secure2({ perm: "customers.delete" }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM shp_sales WHERE customer_id = ? AND shop_id = ?").bind(c.id, ctx.shop.id).first();
  if (used.n > 0) fail(409, "This customer has purchase history, so they cannot be deleted. Mark them Inactive instead \u2014 their records are kept.");
  await env.DB.prepare("DELETE FROM shp_customers WHERE id = ? AND shop_id = ?").bind(c.id, ctx.shop.id).run();
  await audit2(env, request, ctx, "customer.delete", "customer", c.id, `${c.full_name} (${c.customer_no})`);
  return json({ ok: true });
});
var getCustomer2 = secure2({ perm: "customers.view" }, async ({ env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const sid = ctx.shop.id;
  const seeSales = can3(ctx, "sales.view");
  const q = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results), "q");
  const [stats, sales, top, payments, notes] = await Promise.all([
    env.DB.prepare(
      `SELECT COUNT(*) AS orders, COALESCE(SUM(total), 0) AS spent, COALESCE(SUM(balance), 0) AS balance,
              MAX(created_at) AS last_purchase, MIN(created_at) AS first_purchase, COALESCE(AVG(total), 0) AS avg_order
       FROM shp_sales WHERE shop_id = ? AND customer_id = ? AND status = 'completed'`
    ).bind(sid, c.id).first(),
    seeSales ? q(`SELECT id, receipt_no, total, paid, balance, payment_status, status, created_at FROM shp_sales
                  WHERE shop_id = ? AND customer_id = ? ORDER BY id DESC LIMIT 15`, sid, c.id) : Promise.resolve([]),
    seeSales ? q(`SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS amount FROM shp_sale_items i
                  JOIN shp_sales s ON s.id = i.sale_id WHERE s.shop_id = ? AND s.customer_id = ? AND s.status = 'completed'
                  GROUP BY i.name ORDER BY amount DESC LIMIT 5`, sid, c.id) : Promise.resolve([]),
    can3(ctx, "payments.record") || seeSales ? q(`SELECT p.id, p.amount, p.method, p.reference, p.created_at, s.receipt_no FROM shp_payments p
                  JOIN shp_sales s ON s.id = p.sale_id WHERE p.shop_id = ? AND p.customer_id = ? AND s.status = 'completed'
                  ORDER BY p.id DESC LIMIT 10`, sid, c.id) : Promise.resolve([]),
    can3(ctx, "customers.notes") ? q(`SELECT n.id, n.note, n.created_at, u.name AS user_name FROM shp_customer_notes n
                  LEFT JOIN users u ON u.id = n.user_id WHERE n.shop_id = ? AND n.customer_id = ? ORDER BY n.id DESC LIMIT 50`, sid, c.id) : Promise.resolve([])
  ]);
  return json({ customer: c, stats, sales, top_products: top, payments, notes });
});
var addNote2 = secure2({ perm: "customers.notes" }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = await readJson(request);
  const note = V.str(b.note, "Note", { required: true, max: 1e3 });
  const r = await env.DB.prepare("INSERT INTO shp_customer_notes (shop_id, customer_id, user_id, note) VALUES (?, ?, ?, ?)").bind(ctx.shop.id, c.id, ctx.user.id, note).run();
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var deleteNote2 = secure2({ perm: "customers.notes" }, async ({ env, params, ctx }) => {
  await env.DB.prepare("DELETE FROM shp_customer_notes WHERE id = ? AND shop_id = ?").bind(params.id, ctx.shop.id).run();
  return json({ ok: true });
});
var statement = secure2({ perm: ["customers.view", "sales.view"] }, async ({ env, params, url, ctx }) => {
  if (!can3(ctx, "customers.view")) fail(403, "You do not have permission to do this. Ask the shop owner.");
  const c = await loadCustomer(env, ctx, params.id);
  const sid = ctx.shop.id;
  const [{ results: sales }, { results: pays }] = await Promise.all([
    env.DB.prepare(`SELECT id, receipt_no, total, created_at FROM shp_sales WHERE shop_id = ? AND customer_id = ? AND status = 'completed'`).bind(sid, c.id).all(),
    env.DB.prepare(`SELECT p.id, p.amount, p.method, p.reference, p.created_at, s.receipt_no FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id
                    WHERE p.shop_id = ? AND p.customer_id = ? AND s.status = 'completed'`).bind(sid, c.id).all()
  ]);
  const entries = [
    ...sales.map((s) => ({ date: s.created_at, kind: "sale", ref: s.receipt_no, sale_id: s.id, debit: s.total, credit: 0, sort: 0, id: s.id })),
    ...pays.map((p) => ({ date: p.created_at, kind: "payment", ref: p.receipt_no, sale_id: null, method: p.method, debit: 0, credit: p.amount, sort: 1, id: p.id }))
  ].sort((a, b) => a.date < b.date ? -1 : a.date > b.date ? 1 : a.sort - b.sort || a.id - b.id);
  let bal = 0;
  entries.forEach((e) => {
    bal = round22(bal + e.debit - e.credit);
    e.balance = bal;
  });
  const from = url.searchParams.get("from");
  const to = url.searchParams.get("to");
  const shown = entries.filter((e) => (!from || e.date.slice(0, 10) >= from) && (!to || e.date.slice(0, 10) <= to));
  return json({ customer: c, entries: shown.reverse(), balance: bal });
});
var receivePayment = secure2({ perm: "payments.record" }, async ({ request, env, params, ctx }) => {
  const c = await loadCustomer(env, ctx, params.id);
  const b = await readJson(request);
  const settings = await getSettings3(env, ctx.shop.id);
  const amount = round22(V.num(b.amount, "Amount", { required: true, min: 0.01, max: 1e12 }));
  const method = V.str(b.method, "Payment method", { required: true, max: 40 });
  if (!settings.payment_methods.includes(method)) fail(400, "Please choose one of the shop's payment methods.");
  const reference = V.str(b.reference, "Reference", { max: 80 });
  const note = V.str(b.note, "Note", { max: 200 });
  const { results: open } = await env.DB.prepare(
    `SELECT id, receipt_no, total, paid, balance FROM shp_sales
     WHERE shop_id = ? AND customer_id = ? AND status = 'completed' AND balance > 0.004 ORDER BY created_at, id`
  ).bind(ctx.shop.id, c.id).all();
  const owed = round22(open.reduce((s, x) => s + x.balance, 0));
  if (!open.length) fail(400, "This customer does not owe anything.");
  if (amount > owed + 4e-3) fail(400, `This customer owes only ${owed.toLocaleString("en-US", { maximumFractionDigits: 2 })}. Please enter that amount or less.`);
  let left = amount;
  const allocations = [];
  const stmts = [];
  for (const s of open) {
    if (left <= 4e-3) break;
    const pay = round22(Math.min(left, s.balance));
    left = round22(left - pay);
    const newPaid = round22(s.paid + pay);
    const newBal = Math.max(0, round22(s.total - newPaid));
    const status = newBal <= 4e-3 ? "paid" : "partial";
    stmts.push(
      env.DB.prepare("INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, reference, note, received_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(ctx.shop.id, s.id, c.id, pay, method, reference, note, ctx.user.id),
      env.DB.prepare("UPDATE shp_sales SET paid = ?, balance = ?, payment_status = ? WHERE id = ? AND shop_id = ?").bind(newPaid, newBal, status, s.id, ctx.shop.id)
    );
    allocations.push({ sale_id: s.id, receipt_no: s.receipt_no, amount: pay, settled: status === "paid" });
  }
  await env.DB.batch(stmts);
  await audit2(env, request, ctx, "payment.customer", "customer", c.id, `${amount} from ${c.full_name} via ${method}`);
  return json({ ok: true, allocations, remaining: round22(owed - amount), paid: amount });
});

// src/handlers/shop/products.js
init_auth();
var UNITS = ["pcs", "kg", "g", "litre", "ml", "metre", "box", "pack", "dozen", "bottle", "bag", "set", "hour", "service"];
var hideCost = /* @__PURE__ */ __name((ctx, row) => {
  if (can3(ctx, "profit.view")) return row;
  const { cost_price, ...rest } = row;
  return rest;
}, "hideCost");
var withFlags = /* @__PURE__ */ __name((p) => ({
  ...p,
  has_image: !!p.image_key,
  image_key: void 0,
  stock_state: !p.track_stock ? "na" : p.stock_qty <= 0 ? "out" : p.stock_qty <= p.reorder_level ? "low" : "ok"
}), "withFlags");
async function loadProduct(env, ctx, id) {
  const p = await env.DB.prepare("SELECT * FROM shp_products WHERE id = ? AND shop_id = ?").bind(id, ctx.shop.id).first();
  if (!p) fail(404, "Product not found.");
  return p;
}
__name(loadProduct, "loadProduct");
async function checkCategory(env, ctx, id) {
  if (id == null || id === "") return null;
  const c = await env.DB.prepare("SELECT id FROM shp_categories WHERE id = ? AND shop_id = ?").bind(id, ctx.shop.id).first();
  if (!c) fail(400, "That category was not found.");
  return c.id;
}
__name(checkCategory, "checkCategory");
async function assertUnique(env, ctx, field, value, label2, exceptId = 0) {
  if (!value) return;
  const dup = await env.DB.prepare(`SELECT id, name FROM shp_products WHERE shop_id = ? AND ${field} = ? AND id != ? LIMIT 1`).bind(ctx.shop.id, value, exceptId).first();
  if (dup) throw new HttpError(409, `${label2} "${value}" is already used by "${dup.name}".`);
}
__name(assertUnique, "assertUnique");
var listCategories2 = secure2({ perm: ["products.view", "sales.create"] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, c.color, (SELECT COUNT(*) FROM shp_products p WHERE p.category_id = c.id) AS products
     FROM shp_categories c WHERE c.shop_id = ? ORDER BY c.name`
  ).bind(ctx.shop.id).all();
  return json({ categories: results });
});
var saveCategory = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Category name", { required: true, max: 60 });
  const color = V.color(b.color, "Colour");
  const sid = ctx.shop.id;
  const clash = await env.DB.prepare("SELECT id FROM shp_categories WHERE shop_id = ? AND name = ? COLLATE NOCASE AND id != ?").bind(sid, name, params.id || 0).first();
  if (clash) fail(409, `A category called "${name}" already exists.`);
  if (params.id) {
    const r2 = await env.DB.prepare("UPDATE shp_categories SET name = ?, color = ? WHERE id = ? AND shop_id = ?").bind(name, color, params.id, sid).run();
    if (!r2.meta.changes) fail(404, "Category not found.");
    return json({ ok: true });
  }
  const r = await env.DB.prepare("INSERT INTO shp_categories (shop_id, name, color) VALUES (?, ?, ?)").bind(sid, name, color).run();
  await audit2(env, request, ctx, "category.create", "category", r.meta.last_row_id, name);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var deleteCategory2 = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const c = await env.DB.prepare("SELECT * FROM shp_categories WHERE id = ? AND shop_id = ?").bind(params.id, ctx.shop.id).first();
  if (!c) fail(404, "Category not found.");
  await env.DB.prepare("DELETE FROM shp_categories WHERE id = ? AND shop_id = ?").bind(c.id, ctx.shop.id).run();
  await audit2(env, request, ctx, "category.delete", "category", c.id, c.name);
  return json({ ok: true });
});
var listProducts = secure2({ perm: ["products.view", "sales.create"] }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id;
  const sp = url.searchParams;
  const all2 = sp.get("all") === "1";
  const { page, limit, offset } = all2 ? { page: 1, limit: 5e3, offset: 0 } : paging(url, 24, 200);
  const where = ["p.shop_id = ?1"];
  const binds = [sid];
  const add = /* @__PURE__ */ __name((sql, ...v) => {
    let i = binds.length;
    where.push(sql.replace(/\?/g, () => `?${++i}`));
    binds.push(...v);
  }, "add");
  const q = (sp.get("q") || "").trim();
  if (q) {
    const l = likeTerm(q);
    add(`(p.name LIKE ? ESCAPE '\\' OR p.sku LIKE ? ESCAPE '\\' OR p.barcode LIKE ? ESCAPE '\\')`, l, l, l);
  }
  if (sp.get("barcode")) add("(p.barcode = ? OR p.sku = ?)", sp.get("barcode").trim(), sp.get("barcode").trim());
  if (sp.get("category_id")) add("p.category_id = ?", Number(sp.get("category_id")) || 0);
  if (sp.get("status")) add("p.status = ?", V.oneOf(sp.get("status"), "Status", ["active", "inactive"]));
  const stock = sp.get("stock");
  if (stock === "out") where.push("p.track_stock = 1 AND p.stock_qty <= 0");
  else if (stock === "low") where.push("p.track_stock = 1 AND p.stock_qty > 0 AND p.stock_qty <= p.reorder_level");
  else if (stock === "attention") where.push("p.track_stock = 1 AND p.stock_qty <= p.reorder_level");
  else if (stock === "in") where.push("(p.track_stock = 0 OR p.stock_qty > 0)");
  const SORTS = { name: "p.name COLLATE NOCASE ASC", recent: "p.id DESC", stock: "p.stock_qty ASC, p.name", price: "p.sell_price DESC" };
  const order = SORTS[sp.get("sort")] || SORTS.name;
  const base = `FROM shp_products p LEFT JOIN shp_categories c ON c.id = p.category_id WHERE ${where.join(" AND ")}`;
  const [{ results }, count, summary2] = await Promise.all([
    env.DB.prepare(`SELECT p.*, c.name AS category_name, c.color AS category_color ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
    env.DB.prepare(
      `SELECT COUNT(*) AS total, SUM(CASE WHEN status = 'active' THEN 1 ELSE 0 END) AS active,
              SUM(CASE WHEN track_stock = 1 AND stock_qty <= 0 THEN 1 ELSE 0 END) AS out_count,
              SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) AS low_count,
              COALESCE(SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 THEN stock_qty * cost_price ELSE 0 END), 0) AS stock_cost,
              COALESCE(SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 THEN stock_qty * sell_price ELSE 0 END), 0) AS stock_retail
       FROM shp_products WHERE shop_id = ?`
    ).bind(sid).first()
  ]);
  if (!can3(ctx, "profit.view")) {
    delete summary2.stock_cost;
  }
  return json({ products: results.map((p) => hideCost(ctx, withFlags(p))), total: count.n, page, limit, summary: summary2, units: UNITS });
});
function readProduct(b, ctx, existing) {
  const track = b.track_stock === void 0 ? existing ? existing.track_stock : 1 : b.track_stock === false || b.track_stock === 0 || b.track_stock === "0" ? 0 : 1;
  const canCost = can3(ctx, "profit.view");
  return {
    name: V.str(b.name, "Product name", { required: true, max: 160 }),
    sku: V.str(b.sku, "SKU / code", { max: 60 }),
    barcode: V.str(b.barcode, "Barcode", { max: 60 }),
    category_id: b.category_id === "" ? null : b.category_id,
    unit: (V.str(b.unit, "Unit", { max: 20 }) || "pcs").toLowerCase(),
    cost_price: b.cost_price === void 0 || !canCost ? existing ? existing.cost_price : 0 : V.num(b.cost_price, "Cost price", { min: 0, max: 1e12 }) ?? 0,
    sell_price: V.num(b.sell_price, "Selling price", { required: true, min: 0, max: 1e12 }),
    reorder_level: V.num(b.reorder_level, "Low-stock level", { min: 0, max: 1e9 }) ?? 0,
    track_stock: track,
    status: V.oneOf(b.status, "Status", ["active", "inactive"], { def: existing ? existing.status : "active" }),
    description: V.str(b.description, "Description", { max: 600 })
  };
}
__name(readProduct, "readProduct");
var createProduct = secure2({ perm: "products.manage" }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const p = readProduct(body, ctx, null);
  const sid = ctx.shop.id;
  p.category_id = await checkCategory(env, ctx, p.category_id);
  await assertUnique(env, ctx, "sku", p.sku, "The code");
  await assertUnique(env, ctx, "barcode", p.barcode, "The barcode");
  const opening = p.track_stock ? V.num(body.opening_stock, "Opening stock", { min: 0, max: 1e9 }) ?? 0 : 0;
  const r = await env.DB.prepare(
    `INSERT INTO shp_products (shop_id, category_id, name, sku, barcode, unit, cost_price, sell_price, stock_qty, reorder_level, track_stock, status, description)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(sid, p.category_id, p.name, p.sku, p.barcode, p.unit, p.cost_price, p.sell_price, opening, p.reorder_level, p.track_stock, p.status, p.description).run();
  const id = r.meta.last_row_id;
  if (opening > 0) {
    await env.DB.prepare(`INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, user_id) VALUES (?, ?, 'opening', ?, ?, 'Opening stock', ?)`).bind(sid, id, opening, opening, ctx.user.id).run();
  }
  await audit2(env, request, ctx, "product.create", "product", id, p.name);
  return json({ ok: true, id }, { status: 201 });
});
var getProduct = secure2({ perm: ["products.view", "sales.create"] }, async ({ env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const cat = p.category_id ? await env.DB.prepare("SELECT name, color FROM shp_categories WHERE id = ?").bind(p.category_id).first() : null;
  const sold = await env.DB.prepare(
    `SELECT COALESCE(SUM(i.qty), 0) AS qty, COALESCE(SUM(i.line_total), 0) AS revenue, COALESCE(SUM(i.line_total - i.cost_price * i.qty), 0) AS profit
     FROM shp_sale_items i JOIN shp_sales s ON s.id = i.sale_id WHERE i.product_id = ? AND s.shop_id = ? AND s.status = 'completed'`
  ).bind(p.id, ctx.shop.id).first();
  if (!can3(ctx, "profit.view")) delete sold.profit;
  return json({ product: hideCost(ctx, withFlags({ ...p, category_name: cat && cat.name, category_color: cat && cat.color })), sold });
});
var updateProduct = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const existing = await loadProduct(env, ctx, params.id);
  const p = readProduct(await readJson(request), ctx, existing);
  p.category_id = await checkCategory(env, ctx, p.category_id);
  await assertUnique(env, ctx, "sku", p.sku, "The code", existing.id);
  await assertUnique(env, ctx, "barcode", p.barcode, "The barcode", existing.id);
  await env.DB.prepare(
    `UPDATE shp_products SET category_id = ?, name = ?, sku = ?, barcode = ?, unit = ?, cost_price = ?, sell_price = ?, reorder_level = ?,
       track_stock = ?, status = ?, description = ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`
  ).bind(p.category_id, p.name, p.sku, p.barcode, p.unit, p.cost_price, p.sell_price, p.reorder_level, p.track_stock, p.status, p.description, existing.id, ctx.shop.id).run();
  await audit2(env, request, ctx, "product.update", "product", existing.id, p.name);
  return json({ ok: true });
});
var deleteProduct = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM shp_sale_items WHERE product_id = ? AND shop_id = ?").bind(p.id, ctx.shop.id).first();
  if (used.n > 0) fail(409, "This product has already been sold, so it cannot be deleted. Mark it Inactive instead \u2014 it will disappear from the till but your sales history stays correct.");
  await env.DB.prepare("DELETE FROM shp_products WHERE id = ? AND shop_id = ?").bind(p.id, ctx.shop.id).run();
  if (p.image_key && env.MATERIALS) await env.MATERIALS.delete(p.image_key).catch(() => {
  });
  await audit2(env, request, ctx, "product.delete", "product", p.id, p.name);
  return json({ ok: true });
});
var uploadProductImage = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a photo.");
  const key = await storeImage(env, form.get("photo"), `shop/${ctx.shop.id}/product-${p.id}`);
  await env.DB.prepare(`UPDATE shp_products SET image_key = ?, updated_at = datetime('now') WHERE id = ?`).bind(key, p.id).run();
  if (p.image_key && env.MATERIALS) await env.MATERIALS.delete(p.image_key).catch(() => {
  });
  return json({ ok: true });
});
var getProductImage = secure2({ perm: ["products.view", "sales.create"] }, async ({ env, params, ctx }) => {
  const p = await env.DB.prepare("SELECT image_key FROM shp_products WHERE id = ? AND shop_id = ?").bind(params.id, ctx.shop.id).first();
  if (!p || !p.image_key) return new Response("Not found", { status: 404 });
  return imageResponse(env, p.image_key);
});
var STOCK_TYPES = { purchase: 1, return: 1, damage: -1, count: 0 };
var adjustStock2 = secure2({ perm: "stock.adjust" }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  if (!p.track_stock) fail(400, "This item is not tracked in stock (it is a service).");
  const b = await readJson(request);
  const type = V.oneOf(b.type, "Stock action", Object.keys(STOCK_TYPES), { required: true });
  const qty = V.num(b.qty, type === "count" ? "Counted quantity" : "Quantity", { required: true, min: type === "count" ? 0 : 1e-3, max: 1e9 });
  const note = V.str(b.note, "Note", { max: 200 });
  const settings = await getSettings3(env, ctx.shop.id);
  let change = type === "count" ? round22(qty - p.stock_qty) : round22(STOCK_TYPES[type] * qty);
  if (change === 0) fail(400, "That is already the quantity in stock \u2014 nothing to change.");
  if (p.stock_qty + change < 0 && !settings.allow_negative_stock) fail(400, `You only have ${p.stock_qty} ${p.unit} in stock, so you cannot remove ${Math.abs(change)}.`);
  const moveType = type === "count" ? "adjust" : type;
  const stmts = [
    env.DB.prepare(`UPDATE shp_products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`).bind(change, p.id, ctx.shop.id)
  ];
  if (type === "purchase" && can3(ctx, "profit.view") && b.cost_price !== void 0 && b.cost_price !== "") {
    stmts.push(env.DB.prepare("UPDATE shp_products SET cost_price = ? WHERE id = ? AND shop_id = ?").bind(V.num(b.cost_price, "Cost price", { min: 0, max: 1e12 }), p.id, ctx.shop.id));
  }
  stmts.push(env.DB.prepare(
    `INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, user_id)
     VALUES (?, ?, ?, ?, (SELECT stock_qty FROM shp_products WHERE id = ?), ?, ?)`
  ).bind(ctx.shop.id, p.id, moveType, change, p.id, note, ctx.user.id));
  await env.DB.batch(stmts);
  const fresh = await env.DB.prepare("SELECT stock_qty FROM shp_products WHERE id = ?").bind(p.id).first();
  await audit2(env, request, ctx, "stock.adjust", "product", p.id, `${p.name}: ${change > 0 ? "+" : ""}${change} (${type})`);
  return json({ ok: true, stock_qty: fresh.stock_qty, change });
});
var stockHistory2 = secure2({ perm: "products.view" }, async ({ env, params, ctx }) => {
  const p = await loadProduct(env, ctx, params.id);
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.type, m.qty_change, m.balance_after, m.note, m.sale_id, m.created_at, u.name AS user_name, s.receipt_no
     FROM shp_stock_moves m LEFT JOIN users u ON u.id = m.user_id LEFT JOIN shp_sales s ON s.id = m.sale_id
     WHERE m.product_id = ? AND m.shop_id = ? ORDER BY m.id DESC LIMIT 100`
  ).bind(p.id, ctx.shop.id).all();
  return json({ product: { id: p.id, name: p.name, unit: p.unit, stock_qty: p.stock_qty }, moves: results });
});

// src/handlers/shop/sales.js
init_auth();

// src/lib/shop-qr.js
var QR_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
var QR_CODE_LEN = 12;
var QR_CODE_RE = /^[A-HJ-NP-Z2-9]{12}$/;
var QR_MAX_PER_BATCH = 300;
function newQrCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(QR_CODE_LEN));
  let s = "";
  for (const b of bytes) s += QR_ALPHABET[b & 31];
  return s;
}
__name(newQrCode, "newQrCode");
function newQrCodes(n2) {
  const set = /* @__PURE__ */ new Set();
  while (set.size < n2) set.add(newQrCode());
  return [...set];
}
__name(newQrCodes, "newQrCodes");
function extractQrCode(input, { urlOnly = false } = {}) {
  const raw = String(input == null ? "" : input).trim();
  if (!raw || raw.length > 500) return null;
  let cand = null;
  try {
    cand = new URL(raw).searchParams.get("c");
  } catch (e) {
  }
  if (cand == null) {
    const m = raw.match(/[?&]c=([^&#\s]+)/i);
    if (m) cand = m[1];
  }
  if (cand == null) {
    if (urlOnly) return null;
    cand = raw;
  }
  cand = cand.toUpperCase().replace(/[\s-]/g, "");
  return QR_CODE_RE.test(cand) ? cand : null;
}
__name(extractQrCode, "extractQrCode");
function cleanQrList(list, max = 200) {
  if (list == null) return { codes: [] };
  if (!Array.isArray(list)) return { error: "QR codes must be sent as a list." };
  if (list.length > max) return { error: `Too many QR codes at once (${max} maximum).` };
  const seen = /* @__PURE__ */ new Set();
  for (const item of list) {
    const c = extractQrCode(item);
    if (!c) return { error: "One of the QR codes is not valid. Please scan it again." };
    if (seen.has(c)) return { error: "The same item was scanned twice." };
    seen.add(c);
  }
  return { codes: [...seen] };
}
__name(cleanQrList, "cleanQrList");

// src/handlers/shop/sales.js
async function loadSaleData(env, ctx, id) {
  const sale = await env.DB.prepare(
    `SELECT s.*, u.name AS sold_by_name, vu.name AS voided_by_name FROM shp_sales s
     LEFT JOIN users u ON u.id = s.sold_by LEFT JOIN users vu ON vu.id = s.voided_by
     WHERE s.id = ? AND s.shop_id = ?`
  ).bind(id, ctx.shop.id).first();
  if (!sale) fail(404, "Sale not found.");
  const [{ results: items }, { results: payments }, settings] = await Promise.all([
    env.DB.prepare("SELECT id, product_id, name, unit, qty, unit_price, cost_price, line_total FROM shp_sale_items WHERE sale_id = ? ORDER BY id").bind(sale.id).all(),
    env.DB.prepare(
      `SELECT p.id, p.amount, p.method, p.reference, p.note, p.created_at, u.name AS user_name FROM shp_payments p
       LEFT JOIN users u ON u.id = p.received_by WHERE p.sale_id = ? ORDER BY p.id`
    ).bind(sale.id).all(),
    getSettings3(env, ctx.shop.id)
  ]);
  const { results: qrUnits } = await env.DB.prepare(
    "SELECT product_id, serial FROM shp_qr_codes WHERE sale_id = ? AND shop_id = ? ORDER BY product_id, serial"
  ).bind(sale.id, ctx.shop.id).all();
  const profit = can3(ctx, "profit.view");
  const cust = sale.customer_id ? await env.DB.prepare("SELECT id, customer_no, full_name, phone, loyalty_points FROM shp_customers WHERE id = ?").bind(sale.customer_id).first() : null;
  if (!profit) {
    delete sale.cost_total;
    items.forEach((i) => {
      delete i.cost_price;
    });
  }
  return {
    sale,
    items,
    payments,
    customer: cust,
    qr_units: qrUnits,
    shop: {
      id: ctx.shop.id,
      name: ctx.shop.name,
      phone: ctx.shop.phone,
      email: ctx.shop.email,
      address: ctx.shop.address,
      tax_no: ctx.shop.tax_no,
      currency: ctx.shop.currency,
      has_logo: !!ctx.shop.logo_key,
      primary_color: ctx.shop.primary_color,
      tax_rate: ctx.shop.tax_rate,
      receipt_note: ctx.shop.receipt_note
    },
    receipt_footer: settings.receipt_footer
  };
}
__name(loadSaleData, "loadSaleData");
var createSale = secure2({ perm: "sales.create" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const sid = ctx.shop.id;
  const settings = await getSettings3(env, sid);
  const canDiscount = can3(ctx, "sales.discount");
  if (!Array.isArray(b.items) || !b.items.length) fail(400, "Add at least one item to the sale.");
  if (b.items.length > 100) fail(400, "Too many different items in one sale (100 maximum).");
  const ids = [...new Set(b.items.filter((i) => i.product_id).map((i) => Number(i.product_id)))];
  if (ids.some((n2) => !Number.isInteger(n2) || n2 <= 0)) fail(400, "One of the items is not valid. Please refresh the till.");
  const byId = /* @__PURE__ */ new Map();
  if (ids.length) {
    const { results } = await env.DB.prepare(`SELECT * FROM shp_products WHERE shop_id = ? AND id IN (${ids.map(() => "?").join(",")})`).bind(sid, ...ids).all();
    results.forEach((p) => byId.set(p.id, p));
  }
  const lines = [];
  const need = /* @__PURE__ */ new Map();
  const qrWanted = [];
  for (const it of b.items) {
    const qty = V.num(it.qty, "Quantity", { required: true, min: 1e-3, max: 1e7 });
    if (it.qr_codes !== void 0 && it.qr_codes !== null && !(Array.isArray(it.qr_codes) && !it.qr_codes.length)) {
      if (!it.product_id) fail(400, "QR codes can only be used on products from the product list.");
      const clean2 = cleanQrList(it.qr_codes);
      if (clean2.error) fail(400, clean2.error);
      if (clean2.codes.length > qty + 1e-4) fail(400, "More QR-tagged items were scanned than the quantity being sold.");
      clean2.codes.forEach((code) => qrWanted.push({ code, product_id: Number(it.product_id) }));
    }
    if (it.product_id) {
      const p = byId.get(Number(it.product_id));
      if (!p) fail(400, "One of the products no longer exists. Please refresh the till.");
      if (p.status !== "active") fail(400, `"${p.name}" is inactive and cannot be sold.`);
      let price = p.sell_price;
      if (it.unit_price !== void 0 && it.unit_price !== null && it.unit_price !== "" && Math.abs(Number(it.unit_price) - p.sell_price) > 4e-3) {
        if (!canDiscount) fail(403, "You do not have permission to change prices at the till.");
        price = V.num(it.unit_price, "Price", { min: 0, max: 1e12 });
      }
      lines.push({ product: p, product_id: p.id, name: p.name, unit: p.unit, qty, price, cost: p.cost_price, line: round22(qty * price) });
      if (p.track_stock) need.set(p.id, round22((need.get(p.id) || 0) + qty));
    } else {
      if (!canDiscount) fail(403, "You can only sell items from the product list.");
      const price = V.num(it.unit_price, "Price", { required: true, min: 0, max: 1e12 });
      lines.push({ product: null, product_id: null, name: V.str(it.name, "Item name", { required: true, max: 160 }), unit: "pcs", qty, price, cost: 0, line: round22(qty * price) });
    }
  }
  if (!settings.allow_negative_stock) {
    for (const [pid, q] of need) {
      const p = byId.get(pid);
      if (q > p.stock_qty + 1e-4) fail(400, `Not enough stock for "${p.name}" \u2014 only ${p.stock_qty} ${p.unit} left.`);
    }
  }
  const qrCodes = qrWanted.map((x) => x.code);
  if (new Set(qrCodes).size !== qrCodes.length) fail(400, "The same item was scanned twice.");
  if (qrCodes.length > 500) fail(400, "Too many QR-tagged items in one sale (500 maximum).");
  if (qrCodes.length) {
    const { results: found } = await env.DB.prepare(
      `SELECT q.code, q.serial, q.status, q.product_id, p.name FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id
       WHERE q.shop_id = ?1 AND q.code IN (SELECT value FROM json_each(?2))`
    ).bind(sid, JSON.stringify(qrCodes)).all();
    const byCode = new Map(found.map((f) => [f.code, f]));
    for (const w of qrWanted) {
      const f = byCode.get(w.code);
      if (!f) fail(400, "One of the scanned QR codes was not found in this shop.");
      if (f.product_id !== w.product_id) fail(400, `QR code #${f.serial} belongs to "${f.name}", not to the item it was added to.`);
      if (f.status === "sold") fail(409, `"${f.name}" #${f.serial} has already been sold.`);
      if (f.status === "disabled") fail(400, `"${f.name}" #${f.serial} is disabled and cannot be sold.`);
    }
  }
  const subtotal = round22(lines.reduce((s, l) => s + l.line, 0));
  const discount = round22(V.num(b.discount, "Discount", { min: 0, max: 1e12 }) ?? 0);
  if (discount > 0 && !canDiscount) fail(403, "You do not have permission to give discounts.");
  if (discount > subtotal + 4e-3) fail(400, "The discount cannot be more than the sale total.");
  const taxable = round22(subtotal - discount);
  const tax = ctx.shop.tax_rate > 0 ? round22(taxable * ctx.shop.tax_rate / 100) : 0;
  const total = round22(taxable + tax);
  const pays = [];
  for (const p of Array.isArray(b.payments) ? b.payments : []) {
    const amount = round22(V.num(p.amount, "Payment amount", { required: true, min: 0.01, max: 1e12 }));
    const method = V.str(p.method, "Payment method", { required: true, max: 40 });
    if (!settings.payment_methods.includes(method)) fail(400, "Please choose one of the shop's payment methods.");
    pays.push({ amount, method, reference: V.str(p.reference, "Reference", { max: 80 }) });
  }
  const paid = round22(pays.reduce((s, p) => s + p.amount, 0));
  if (paid > total + 4e-3) fail(400, "The payment is more than the sale total. Enter only the amount that covers the sale (give change separately).");
  const balance = Math.max(0, round22(total - paid));
  const payStatus = balance <= 4e-3 ? "paid" : paid > 0 ? "partial" : "unpaid";
  let customer = null;
  if (b.customer_id) {
    customer = await env.DB.prepare("SELECT * FROM shp_customers WHERE id = ? AND shop_id = ?").bind(b.customer_id, sid).first();
    if (!customer) fail(400, "That customer was not found.");
    if (customer.status !== "active") fail(400, `${customer.full_name} is marked Inactive. Activate the customer first.`);
  }
  const dueDate = V.date(b.due_date, "Due date");
  if (balance > 4e-3) {
    if (!customer) fail(400, "Choose or save a customer before selling on credit (someone has to owe the balance).");
    if (customer.credit_limit > 0) {
      const owed = await env.DB.prepare(`SELECT COALESCE(SUM(balance), 0) AS n FROM shp_sales WHERE shop_id = ? AND customer_id = ? AND status = 'completed'`).bind(sid, customer.id).first();
      if (round22(owed.n + balance) > customer.credit_limit + 4e-3) {
        fail(400, `This would take ${customer.full_name} over their credit limit of ${customer.credit_limit.toLocaleString("en-US")} (they already owe ${round22(owed.n).toLocaleString("en-US")}).`);
      }
    }
  }
  const costTotal = round22(lines.reduce((s, l) => s + l.cost * l.qty, 0));
  const customerName = customer ? customer.full_name : V.str(b.customer_name, "Customer name", { max: 120 }) || "Walk-in customer";
  const ins = await env.DB.prepare(
    `INSERT INTO shp_sales (shop_id, seq, receipt_no, customer_id, customer_name, customer_phone, subtotal, discount, tax, total, paid, balance,
        cost_total, payment_status, due_date, note, sold_by)
     SELECT ?1, n.seq, ?2 || '-' || substr('000000' || n.seq, -6, 6), ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16
     FROM (SELECT COALESCE(MAX(seq), 0) + 1 AS seq FROM shp_sales WHERE shop_id = ?1) n`
  ).bind(
    sid,
    settings.receipt_prefix,
    customer ? customer.id : null,
    customerName,
    customer ? customer.phone : null,
    subtotal,
    discount,
    tax,
    total,
    paid,
    balance,
    costTotal,
    payStatus,
    balance > 4e-3 ? dueDate : null,
    V.str(b.note, "Note", { max: 300 }),
    ctx.user.id
  ).run();
  const saleId = ins.meta.last_row_id;
  const releaseQr = /* @__PURE__ */ __name(() => env.DB.prepare(
    `UPDATE shp_qr_codes SET status = 'in_stock', sale_id = NULL, sold_at = NULL WHERE sale_id = ? AND shop_id = ?`
  ).bind(saleId, sid).run().catch(() => {
  }), "releaseQr");
  if (qrCodes.length) {
    const claim = await env.DB.prepare(
      `UPDATE shp_qr_codes SET status = 'sold', sale_id = ?1, sold_at = datetime('now')
       WHERE shop_id = ?2 AND status = 'in_stock' AND code IN (SELECT value FROM json_each(?3))`
    ).bind(saleId, sid, JSON.stringify(qrCodes)).run();
    if (claim.meta.changes !== qrCodes.length) {
      await releaseQr();
      await env.DB.prepare("DELETE FROM shp_sales WHERE id = ?").bind(saleId).run().catch(() => {
      });
      fail(409, "One of the scanned items was just sold by someone else. Please scan it again.");
    }
  }
  const stmts = [];
  for (const l of lines) {
    stmts.push(env.DB.prepare("INSERT INTO shp_sale_items (shop_id, sale_id, product_id, name, unit, qty, unit_price, cost_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(sid, saleId, l.product_id, l.name, l.unit, l.qty, l.price, l.cost, l.line));
  }
  for (const [pid, q] of need) {
    stmts.push(
      env.DB.prepare(`UPDATE shp_products SET stock_qty = stock_qty - ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`).bind(q, pid, sid),
      env.DB.prepare(`INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, sale_id, user_id)
                      VALUES (?, ?, 'sale', ?, (SELECT stock_qty FROM shp_products WHERE id = ?), ?, ?)`).bind(sid, pid, -q, pid, saleId, ctx.user.id)
    );
  }
  for (const p of pays) {
    stmts.push(env.DB.prepare("INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, reference, received_by) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(sid, saleId, customer ? customer.id : null, p.amount, p.method, p.reference, ctx.user.id));
  }
  if (customer && settings.loyalty_rate > 0) {
    const pts = Math.floor(total / settings.loyalty_rate);
    if (pts > 0) stmts.push(env.DB.prepare("UPDATE shp_customers SET loyalty_points = loyalty_points + ? WHERE id = ?").bind(pts, customer.id));
  }
  try {
    await env.DB.batch(stmts);
  } catch (e) {
    await releaseQr();
    await env.DB.prepare("DELETE FROM shp_sales WHERE id = ?").bind(saleId).run().catch(() => {
    });
    throw e;
  }
  const data = await loadSaleData(env, ctx, saleId);
  await audit2(env, request, ctx, "sale.create", "sale", saleId, `${data.sale.receipt_no} \u2014 ${total}${balance > 4e-3 ? ` (owing ${balance})` : ""}${qrCodes.length ? ` \xB7 ${qrCodes.length} QR item(s)` : ""}`);
  return json({ ok: true, id: saleId, ...data }, { status: 201 });
});
var listSales = secure2({ perm: "sales.view" }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id;
  const off = offsetMin(ctx);
  const sp = url.searchParams;
  const { page, limit, offset } = sp.get("all") === "1" ? { page: 1, limit: 5e3, offset: 0 } : paging(url, 20, 100);
  const where = ["s.shop_id = ?1"];
  const binds = [sid];
  const add = /* @__PURE__ */ __name((sql, ...v) => {
    let i = binds.length;
    where.push(sql.replace(/\?/g, () => `?${++i}`));
    binds.push(...v);
  }, "add");
  const q = (sp.get("q") || "").trim();
  if (q) {
    const l = likeTerm(q);
    add(`(s.receipt_no LIKE ? ESCAPE '\\' OR s.customer_name LIKE ? ESCAPE '\\' OR s.customer_phone LIKE ? ESCAPE '\\')`, l, l, l);
  }
  if (sp.get("from")) add(`${localDate("s.created_at", off)} >= ?`, V.date(sp.get("from"), "From date"));
  if (sp.get("to")) add(`${localDate("s.created_at", off)} <= ?`, V.date(sp.get("to"), "To date"));
  if (sp.get("status")) add("s.status = ?", V.oneOf(sp.get("status"), "Status", ["completed", "void"]));
  if (sp.get("payment_status")) add("s.payment_status = ?", V.oneOf(sp.get("payment_status"), "Payment status", ["paid", "partial", "unpaid"]));
  if (sp.get("customer_id")) add("s.customer_id = ?", Number(sp.get("customer_id")) || 0);
  if (sp.get("owing") === "1") where.push(`s.status = 'completed' AND s.balance > 0.004`);
  const base = `FROM shp_sales s WHERE ${where.join(" AND ")}`;
  const [{ results }, sum] = await Promise.all([
    env.DB.prepare(`SELECT s.id, s.receipt_no, s.customer_id, s.customer_name, s.customer_phone, s.subtotal, s.discount, s.tax, s.total, s.paid, s.balance,
        s.payment_status, s.status, s.due_date, s.created_at, s.cost_total, (SELECT COUNT(*) FROM shp_sale_items i WHERE i.sale_id = s.id) AS item_count,
        (SELECT name FROM users WHERE id = s.sold_by) AS sold_by_name
      ${base} ORDER BY s.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.total END), 0) AS total,
        COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.paid END), 0) AS paid, COALESCE(SUM(CASE WHEN s.status = 'completed' THEN s.balance END), 0) AS balance
      ${base}`).bind(...binds).first()
  ]);
  if (!can3(ctx, "profit.view")) results.forEach((r) => {
    delete r.cost_total;
  });
  return json({ sales: results, total: sum.n, page, limit, summary: { count: sum.n, total: sum.total, paid: sum.paid, balance: sum.balance } });
});
var getSale = secure2({ perm: "sales.view" }, async ({ env, params, ctx }) => json(await loadSaleData(env, ctx, params.id)));
var addPayment2 = secure2({ perm: "payments.record" }, async ({ request, env, params, ctx }) => {
  const sale = await env.DB.prepare("SELECT * FROM shp_sales WHERE id = ? AND shop_id = ?").bind(params.id, ctx.shop.id).first();
  if (!sale) fail(404, "Sale not found.");
  if (sale.status !== "completed") fail(400, "This sale was cancelled, so it cannot take payments.");
  if (sale.balance <= 4e-3) fail(400, "This sale is already fully paid.");
  const b = await readJson(request);
  const settings = await getSettings3(env, ctx.shop.id);
  const amount = round22(V.num(b.amount, "Amount", { required: true, min: 0.01, max: 1e12 }));
  if (amount > sale.balance + 4e-3) fail(400, `Only ${sale.balance.toLocaleString("en-US", { maximumFractionDigits: 2 })} is still owed on this sale.`);
  const method = V.str(b.method, "Payment method", { required: true, max: 40 });
  if (!settings.payment_methods.includes(method)) fail(400, "Please choose one of the shop's payment methods.");
  const newPaid = round22(sale.paid + amount);
  const newBal = Math.max(0, round22(sale.total - newPaid));
  await env.DB.batch([
    env.DB.prepare("INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, reference, note, received_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(ctx.shop.id, sale.id, sale.customer_id, amount, method, V.str(b.reference, "Reference", { max: 80 }), V.str(b.note, "Note", { max: 200 }), ctx.user.id),
    env.DB.prepare("UPDATE shp_sales SET paid = ?, balance = ?, payment_status = ? WHERE id = ?").bind(newPaid, newBal, newBal <= 4e-3 ? "paid" : "partial", sale.id)
  ]);
  await audit2(env, request, ctx, "payment.create", "sale", sale.id, `${sale.receipt_no}: ${amount} via ${method}`);
  return json({ ok: true, paid: newPaid, balance: newBal });
});
var voidSale = secure2({ perm: "sales.void" }, async ({ request, env, params, ctx }) => {
  const sid = ctx.shop.id;
  const sale = await env.DB.prepare("SELECT * FROM shp_sales WHERE id = ? AND shop_id = ?").bind(params.id, sid).first();
  if (!sale) fail(404, "Sale not found.");
  if (sale.status === "void") fail(400, "This sale is already cancelled.");
  const b = await readJson(request);
  const reason = V.str(b.reason, "Reason", { required: true, max: 200, min: 3 });
  const settings = await getSettings3(env, sid);
  const { results: items } = await env.DB.prepare(
    `SELECT i.product_id, SUM(i.qty) AS qty FROM shp_sale_items i JOIN shp_products p ON p.id = i.product_id
     WHERE i.sale_id = ? AND p.track_stock = 1 GROUP BY i.product_id`
  ).bind(sale.id).all();
  const stmts = [
    env.DB.prepare(`UPDATE shp_sales SET status = 'void', void_reason = ?, voided_by = ?, voided_at = datetime('now') WHERE id = ?`).bind(reason, ctx.user.id, sale.id),
    // QR-tagged pieces on this sale go back on the shelf (scanning them says "not sold" again).
    env.DB.prepare(`UPDATE shp_qr_codes SET status = 'in_stock', sale_id = NULL, sold_at = NULL WHERE sale_id = ? AND shop_id = ?`).bind(sale.id, sid)
  ];
  for (const it of items) {
    stmts.push(
      env.DB.prepare(`UPDATE shp_products SET stock_qty = stock_qty + ?, updated_at = datetime('now') WHERE id = ? AND shop_id = ?`).bind(it.qty, it.product_id, sid),
      env.DB.prepare(`INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, sale_id, user_id)
                      VALUES (?, ?, 'void', ?, (SELECT stock_qty FROM shp_products WHERE id = ?), ?, ?, ?)`).bind(sid, it.product_id, it.qty, it.product_id, `Sale ${sale.receipt_no} cancelled`, sale.id, ctx.user.id)
    );
  }
  if (sale.customer_id && settings.loyalty_rate > 0) {
    const pts = Math.floor(sale.total / settings.loyalty_rate);
    if (pts > 0) stmts.push(env.DB.prepare("UPDATE shp_customers SET loyalty_points = MAX(0, loyalty_points - ?) WHERE id = ?").bind(pts, sale.customer_id));
  }
  await env.DB.batch(stmts);
  await audit2(env, request, ctx, "sale.void", "sale", sale.id, `${sale.receipt_no} cancelled: ${reason}`);
  return json({ ok: true, refund: sale.paid });
});

// src/handlers/shop/expenses.js
init_auth();
var listExpenses2 = secure2({ perm: "expenses.manage" }, async ({ env, url, ctx }) => {
  const sid = ctx.shop.id;
  const sp = url.searchParams;
  const { page, limit, offset } = sp.get("all") === "1" ? { page: 1, limit: 5e3, offset: 0 } : paging(url, 20, 100);
  const where = ["shop_id = ?1"];
  const binds = [sid];
  const add = /* @__PURE__ */ __name((sql, v) => {
    where.push(sql.replace("?", `?${binds.length + 1}`));
    binds.push(v);
  }, "add");
  if (sp.get("from")) add("expense_date >= ?", V.date(sp.get("from"), "From date"));
  if (sp.get("to")) add("expense_date <= ?", V.date(sp.get("to"), "To date"));
  if (sp.get("category")) add("category = ?", sp.get("category"));
  const q = (sp.get("q") || "").trim();
  if (q) {
    const l = likeTerm(q);
    where.push(`(description LIKE ?${binds.length + 1} ESCAPE '\\' OR category LIKE ?${binds.length + 1} ESCAPE '\\')`);
    binds.push(l);
  }
  const base = `FROM shp_expenses WHERE ${where.join(" AND ")}`;
  const [{ results }, sum, byCat] = await Promise.all([
    env.DB.prepare(`SELECT e.*, (SELECT name FROM users WHERE id = e.created_by) AS user_name ${base.replace("FROM shp_expenses", "FROM shp_expenses e")} ORDER BY expense_date DESC, id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(amount), 0) AS total ${base}`).bind(...binds).first(),
    env.DB.prepare(`SELECT category, SUM(amount) AS total ${base} GROUP BY category ORDER BY total DESC`).bind(...binds).all()
  ]);
  const settings = await getSettings3(env, sid);
  return json({ expenses: results, total: sum.n, page, limit, summary: { count: sum.n, total: sum.total, by_category: byCat.results }, categories: settings.expense_categories });
});
var createExpense2 = secure2({ perm: "expenses.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const settings = await getSettings3(env, ctx.shop.id);
  const method = V.str(b.method, "Payment method", { max: 40 });
  if (method && !settings.payment_methods.includes(method)) fail(400, "Please choose one of the shop's payment methods.");
  const date = V.date(b.expense_date, "Date") || shopToday(offsetMin(ctx));
  const r = await env.DB.prepare("INSERT INTO shp_expenses (shop_id, category, description, amount, expense_date, method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(
    ctx.shop.id,
    V.str(b.category, "Category", { required: true, max: 60 }),
    V.str(b.description, "Description", { max: 300 }),
    round22(V.num(b.amount, "Amount", { required: true, min: 0.01, max: 1e12 })),
    date,
    method,
    ctx.user.id
  ).run();
  await audit2(env, request, ctx, "expense.create", "expense", r.meta.last_row_id, `${b.category}: ${b.amount}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var deleteExpense2 = secure2({ perm: "expenses.manage" }, async ({ request, env, params, ctx }) => {
  const e = await env.DB.prepare("SELECT * FROM shp_expenses WHERE id = ? AND shop_id = ?").bind(params.id, ctx.shop.id).first();
  if (!e) fail(404, "Expense not found.");
  await env.DB.prepare("DELETE FROM shp_expenses WHERE id = ?").bind(e.id).run();
  await audit2(env, request, ctx, "expense.delete", "expense", e.id, `${e.category}: ${e.amount}`);
  return json({ ok: true });
});

// src/handlers/shop/insights.js
init_auth();
var all = /* @__PURE__ */ __name((env, sql, ...b) => env.DB.prepare(sql).bind(...b).all().then((r) => r.results), "all");
var one = /* @__PURE__ */ __name((env, sql, ...b) => env.DB.prepare(sql).bind(...b).first(), "one");
var dashboard2 = secure2(async ({ env, ctx }) => {
  const sid = ctx.shop.id;
  const off = offsetMin(ctx);
  const today = shopToday(off);
  const monthStart = today.slice(0, 8) + "01";
  const from14 = addDays2(today, -13);
  const from30 = addDays2(today, -29);
  const D = localDate("s.created_at", off);
  const seeSales = can3(ctx, "sales.view") || can3(ctx, "sales.create");
  const seeProfit = can3(ctx, "profit.view");
  const out = { today, currency: ctx.shop.currency };
  const jobs = [];
  if (seeSales) {
    jobs.push(one(env, `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(cost_total), 0) AS cost, COALESCE(SUM(balance), 0) AS credit
                        FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} = ?`, sid, today).then((r) => {
      out.today_sales = { count: r.count, total: r.total, credit: r.credit, profit: seeProfit ? round22(r.total - r.cost) : void 0 };
    }));
    jobs.push(one(env, `SELECT COALESCE(SUM(p.amount), 0) AS n FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id
                        WHERE p.shop_id = ? AND s.status = 'completed' AND ${localDate("p.created_at", off)} = ?`, sid, today).then((r) => {
      out.received_today = r.n;
    }));
    jobs.push(one(env, `SELECT COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(total - tax), 0) AS net, COALESCE(SUM(cost_total), 0) AS cost
                        FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ?`, sid, monthStart).then((r) => {
      out.month_sales = { count: r.count, total: r.total, profit: seeProfit ? round22(r.net - r.cost) : void 0 };
    }));
    jobs.push(all(env, `SELECT ${D} AS date, COUNT(*) AS count, COALESCE(SUM(total), 0) AS total, COALESCE(SUM(total - tax - cost_total), 0) AS profit
                        FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ? GROUP BY 1`, sid, from14).then((rows) => {
      const map = new Map(rows.map((r) => [r.date, r]));
      out.daily = Array.from({ length: 14 }, (_, i) => {
        const d = addDays2(from14, i);
        const r = map.get(d);
        return { date: d, count: r ? r.count : 0, total: r ? r.total : 0, profit: seeProfit ? r ? round22(r.profit) : 0 : void 0 };
      });
    }));
    jobs.push(all(env, `SELECT p.method, SUM(p.amount) AS total FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id
                        WHERE p.shop_id = ? AND s.status = 'completed' AND ${localDate("p.created_at", off)} >= ? GROUP BY p.method ORDER BY total DESC`, sid, monthStart).then((r) => {
      out.by_method = r;
    }));
    jobs.push(all(env, `SELECT i.name, SUM(i.qty) AS qty, SUM(i.line_total) AS revenue FROM shp_sale_items i JOIN shp_sales s ON s.id = i.sale_id
                        WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ? GROUP BY i.product_id, i.name ORDER BY revenue DESC LIMIT 6`, sid, from30).then((r) => {
      out.top_products = r;
    }));
    if (can3(ctx, "sales.view")) {
      jobs.push(all(env, `SELECT s.id, s.receipt_no, s.customer_name, s.total, s.balance, s.payment_status, s.status, s.created_at FROM shp_sales s
                          WHERE s.shop_id = ? ORDER BY s.id DESC LIMIT 7`, sid).then((r) => {
        out.recent_sales = r;
      }));
    }
  }
  if (can3(ctx, "customers.view")) {
    jobs.push(one(env, `SELECT COUNT(*) AS total, SUM(CASE WHEN created_at >= datetime('now', '-30 days') THEN 1 ELSE 0 END) AS new_30d FROM shp_customers WHERE shop_id = ?`, sid).then((r) => {
      out.customers = { total: r.total, new_30d: r.new_30d || 0 };
    }));
    jobs.push(one(env, `SELECT COUNT(DISTINCT customer_id) AS n, COALESCE(SUM(balance), 0) AS total FROM shp_sales WHERE shop_id = ? AND status = 'completed' AND balance > 0.004 AND customer_id IS NOT NULL`, sid).then((r) => {
      out.debts = { count: r.n, total: r.total };
    }));
    if (seeSales) {
      jobs.push(all(env, `SELECT c.id, c.full_name, COUNT(*) AS orders, SUM(s.total) AS spent FROM shp_sales s JOIN shp_customers c ON c.id = s.customer_id
                          WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} >= ? GROUP BY c.id ORDER BY spent DESC LIMIT 5`, sid, from30).then((r) => {
        out.top_customers = r;
      }));
    }
  }
  if (can3(ctx, "products.view")) {
    jobs.push(one(env, `SELECT COUNT(*) AS total, SUM(CASE WHEN track_stock = 1 AND stock_qty <= 0 THEN 1 ELSE 0 END) AS out_count,
                        SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) AS low_count,
                        COALESCE(SUM(CASE WHEN track_stock = 1 AND stock_qty > 0 THEN stock_qty * cost_price END), 0) AS stock_cost
                        FROM shp_products WHERE shop_id = ? AND status = 'active'`, sid).then((r) => {
      out.inventory = { total: r.total, out: r.out_count || 0, low: r.low_count || 0, stock_cost: seeProfit ? r.stock_cost : void 0 };
    }));
    jobs.push(all(env, `SELECT id, name, unit, stock_qty, reorder_level FROM shp_products WHERE shop_id = ? AND status = 'active' AND track_stock = 1 AND stock_qty <= reorder_level
                        ORDER BY stock_qty ASC LIMIT 6`, sid).then((r) => {
      out.low_stock = r;
    }));
  }
  if (can3(ctx, "expenses.manage")) {
    jobs.push(one(env, `SELECT COALESCE(SUM(amount), 0) AS n FROM shp_expenses WHERE shop_id = ? AND expense_date >= ?`, sid, monthStart).then((r) => {
      out.month_expenses = r.n;
    }));
  }
  if (can3(ctx, "audit.view")) {
    jobs.push(all(env, `SELECT l.action, l.details, l.created_at, u.name AS user_name FROM shp_audit_logs l LEFT JOIN users u ON u.id = l.user_id
                        WHERE l.shop_id = ? AND l.action != 'user.login' ORDER BY l.id DESC LIMIT 7`, sid).then((r) => {
      out.recent_activity = r;
    }));
  }
  await Promise.all(jobs);
  if (seeProfit && out.month_sales && out.month_expenses != null) out.month_net_profit = round22(out.month_sales.profit - out.month_expenses);
  return json(out);
});
var alerts = secure2(async ({ env, ctx }) => {
  const sid = ctx.shop.id;
  const today = shopToday(offsetMin(ctx));
  const list = [];
  if (can3(ctx, "products.view")) {
    const r = await one(env, `SELECT SUM(CASE WHEN stock_qty <= 0 THEN 1 ELSE 0 END) AS out_count,
        SUM(CASE WHEN stock_qty > 0 AND stock_qty <= reorder_level THEN 1 ELSE 0 END) AS low_count
        FROM shp_products WHERE shop_id = ? AND status = 'active' AND track_stock = 1`, sid);
    if (r.out_count) list.push({ type: "stock_out", icon: "fa-box-open", tone: "bad", title: `${r.out_count} product${r.out_count === 1 ? " is" : "s are"} out of stock`, message: "Restock before customers ask for them.", route: "products?stock=out" });
    if (r.low_count) list.push({ type: "stock_low", icon: "fa-triangle-exclamation", tone: "warn", title: `${r.low_count} product${r.low_count === 1 ? " is" : "s are"} running low`, message: "Below the low-stock level you set.", route: "products?stock=low" });
  }
  if (can3(ctx, "customers.view")) {
    const d = await one(env, `SELECT COUNT(DISTINCT customer_id) AS n, COALESCE(SUM(balance), 0) AS total,
        COUNT(DISTINCT CASE WHEN due_date IS NOT NULL AND due_date < ? THEN customer_id END) AS late
        FROM shp_sales WHERE shop_id = ? AND status = 'completed' AND balance > 0.004 AND customer_id IS NOT NULL`, today, sid);
    if (d.late) list.push({ type: "debt_late", icon: "fa-clock", tone: "bad", title: `${d.late} customer${d.late === 1 ? " has" : "s have"} passed their payment date`, message: "Follow up on overdue balances.", route: "debts" });
    else if (d.n) list.push({ type: "debt", icon: "fa-hand-holding-dollar", tone: "info", title: `${d.n} customer${d.n === 1 ? " owes" : "s owe"} you money`, message: `${round22(d.total).toLocaleString("en-US")} ${ctx.shop.currency} in unpaid balances.`, route: "debts" });
  }
  return json({ alerts: list, count: list.length });
});
var search3 = secure2(async ({ env, url, ctx }) => {
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ results: {} });
  const like = likeTerm(q);
  const sid = ctx.shop.id;
  const results = {};
  const jobs = [];
  if (can3(ctx, "customers.view")) {
    jobs.push(all(env, `SELECT id, full_name, customer_no, phone FROM shp_customers WHERE shop_id = ? AND (full_name LIKE ? ESCAPE '\\' OR phone LIKE ? ESCAPE '\\' OR customer_no LIKE ? ESCAPE '\\' OR company LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 6`, sid, like, like, like, like).then((r) => {
      results.customers = r.map((c) => ({ title: c.full_name, sub: `${c.customer_no}${c.phone ? " \xB7 " + c.phone : ""}`, route: `customer/${c.id}` }));
    }));
  }
  if (can3(ctx, "products.view")) {
    jobs.push(all(env, `SELECT id, name, sku, sell_price FROM shp_products WHERE shop_id = ? AND (name LIKE ? ESCAPE '\\' OR sku LIKE ? ESCAPE '\\' OR barcode LIKE ? ESCAPE '\\') ORDER BY name LIMIT 6`, sid, like, like, like).then((r) => {
      results.products = r.map((p) => ({ title: p.name, sub: `${p.sku || "No code"} \xB7 ${p.sell_price.toLocaleString("en-US")} ${ctx.shop.currency}`, route: `products/${p.id}` }));
    }));
  }
  if (can3(ctx, "sales.view")) {
    jobs.push(all(env, `SELECT id, receipt_no, customer_name, total FROM shp_sales WHERE shop_id = ? AND (receipt_no LIKE ? ESCAPE '\\' OR customer_name LIKE ? ESCAPE '\\') ORDER BY id DESC LIMIT 6`, sid, like, like).then((r) => {
      results.sales = r.map((s) => ({ title: s.receipt_no, sub: `${s.customer_name || "Walk-in"} \xB7 ${s.total.toLocaleString("en-US")} ${ctx.shop.currency}`, route: `sales/${s.id}` }));
    }));
  }
  await Promise.all(jobs);
  return json({ results });
});
var listAudit2 = secure2({ perm: "audit.view" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 30, 100);
  const sp = url.searchParams;
  const where = ["l.shop_id = ?1"];
  const binds = [ctx.shop.id];
  if (sp.get("q")) {
    const l = likeTerm(sp.get("q"));
    where.push(`(l.action LIKE ?2 ESCAPE '\\' OR l.details LIKE ?2 ESCAPE '\\' OR u.name LIKE ?2 ESCAPE '\\')`);
    binds.push(l);
  }
  const base = `FROM shp_audit_logs l LEFT JOIN users u ON u.id = l.user_id WHERE ${where.join(" AND ")}`;
  const [logs, n2] = await Promise.all([
    all(env, `SELECT l.id, l.action, l.entity, l.entity_id, l.details, l.ip, l.created_at, u.name AS user_name ${base} ORDER BY l.id DESC LIMIT ${limit} OFFSET ${offset}`, ...binds),
    one(env, `SELECT COUNT(*) AS n ${base}`, ...binds)
  ]);
  return json({ logs, total: n2.n, page, limit });
});
var REPORT_CATALOGUE2 = [
  { group: "Sales", items: [
    { key: "sales.daily", label: "Daily sales", filters: ["from", "to"] },
    { key: "sales.products", label: "Sales by product", filters: ["from", "to", "category_id"] },
    { key: "sales.customers", label: "Sales by customer", filters: ["from", "to"] },
    { key: "sales.cashiers", label: "Sales by staff member", filters: ["from", "to"] },
    { key: "sales.receipts", label: "All receipts", filters: ["from", "to", "status"] }
  ] },
  { group: "Customers", items: [
    { key: "customers.all", label: "Customer list", filters: [] },
    { key: "customers.debtors", label: "Customers who owe money", filters: [] },
    { key: "customers.top", label: "Top customers", filters: ["from", "to"] },
    { key: "customers.new", label: "New customers", filters: ["from", "to"] }
  ] },
  { group: "Stock", items: [
    { key: "inventory.stock", label: "Stock levels & value", filters: ["category_id"] },
    { key: "inventory.low", label: "Low & out of stock", filters: [] },
    { key: "inventory.movements", label: "Stock movements", filters: ["from", "to"] }
  ] },
  { group: "Money", items: [
    { key: "finance.profit", label: "Profit & loss", filters: ["from", "to"], needs: "profit.view" },
    { key: "finance.payments", label: "Money received", filters: ["from", "to", "method"] },
    { key: "finance.expenses", label: "Expenses", filters: ["from", "to"], needs: "expenses.manage" }
  ] }
];
var reportCatalogue2 = secure2({ perm: "reports.view" }, async ({ ctx }) => {
  const groups = REPORT_CATALOGUE2.map((g) => ({ ...g, items: g.items.filter((i) => !i.needs || can3(ctx, i.needs)) })).filter((g) => g.items.length);
  return json({ groups });
});
var money = /* @__PURE__ */ __name((label2, key) => ({ key, label: label2, type: "money", align: "end" }), "money");
var num = /* @__PURE__ */ __name((label2, key) => ({ key, label: label2, type: "number", align: "end" }), "num");
async function buildReport2(env, ctx, key, q) {
  const sid = ctx.shop.id;
  const off = offsetMin(ctx);
  const profit = can3(ctx, "profit.view");
  const today = shopToday(off);
  const from = V.date(q.from, "From date") || today.slice(0, 8) + "01";
  const to = V.date(q.to, "To date") || today;
  if (to < from) fail(400, "The end date cannot be before the start date.");
  const D = localDate("s.created_at", off);
  const range = `${from} \u2192 ${to}`;
  const def = REPORT_CATALOGUE2.flatMap((g) => g.items).find((i) => i.key === key);
  if (!def) fail(404, "Unknown report.");
  if (def.needs && !can3(ctx, def.needs)) fail(403, "You do not have permission to open this report.");
  switch (key) {
    case "sales.daily": {
      const rows = await all(env, `SELECT ${D} AS date, COUNT(*) AS receipts, COALESCE(SUM(s.subtotal), 0) AS subtotal, COALESCE(SUM(s.discount), 0) AS discount, COALESCE(SUM(s.tax), 0) AS tax,
          COALESCE(SUM(s.total), 0) AS total, COALESCE(SUM(s.paid), 0) AS paid, COALESCE(SUM(s.balance), 0) AS balance, COALESCE(SUM(s.total - s.tax - s.cost_total), 0) AS profit
          FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ? GROUP BY 1 ORDER BY 1 DESC`, sid, from, to);
      const t = rows.reduce((a, r) => ({ n: a.n + r.receipts, total: a.total + r.total, profit: a.profit + r.profit }), { n: 0, total: 0, profit: 0 });
      return {
        title: `Daily sales (${range})`,
        summary: [`${t.n} receipts`, `Total sales ${round22(t.total).toLocaleString("en-US")} ${ctx.shop.currency}`, ...profit ? [`Profit ${round22(t.profit).toLocaleString("en-US")} ${ctx.shop.currency}`] : []],
        columns: [{ key: "date", label: "Date", type: "date" }, num("Receipts", "receipts"), money("Sales", "subtotal"), money("Discounts", "discount"), money("VAT", "tax"), money("Total", "total"), money("Paid", "paid"), money("Owing", "balance"), ...profit ? [money("Profit", "profit")] : []],
        rows: rows.map((r) => ({ ...r, profit: round22(r.profit) }))
      };
    }
    case "sales.products": {
      const cat = q.category_id ? Number(q.category_id) : 0;
      const rows = await all(env, `SELECT i.name AS product, COALESCE(c.name, '\u2014') AS category, SUM(i.qty) AS qty, SUM(i.line_total) AS revenue, SUM(i.line_total - i.cost_price * i.qty) AS profit
          FROM shp_sale_items i JOIN shp_sales s ON s.id = i.sale_id LEFT JOIN shp_products p ON p.id = i.product_id LEFT JOIN shp_categories c ON c.id = p.category_id
          WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ? ${cat ? "AND p.category_id = ?" : ""}
          GROUP BY COALESCE(i.product_id, i.name), i.name ORDER BY revenue DESC`, sid, from, to, ...cat ? [cat] : []);
      return {
        title: `Sales by product (${range})`,
        summary: [`${rows.length} products sold`],
        columns: [{ key: "product", label: "Product" }, { key: "category", label: "Category" }, num("Quantity sold", "qty"), money("Revenue", "revenue"), ...profit ? [money("Profit", "profit")] : []],
        rows: rows.map((r) => ({ ...r, profit: round22(r.profit) }))
      };
    }
    case "sales.customers":
    case "customers.top": {
      const rows = await all(env, `SELECT c.customer_no, c.full_name AS customer, c.phone, COUNT(*) AS orders, SUM(s.total) AS spent, SUM(s.balance) AS balance, MAX(s.created_at) AS last_purchase
          FROM shp_sales s JOIN shp_customers c ON c.id = s.customer_id WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ?
          GROUP BY c.id ORDER BY spent DESC ${key === "customers.top" ? "LIMIT 50" : ""}`, sid, from, to);
      return {
        title: `${key === "customers.top" ? "Top customers" : "Sales by customer"} (${range})`,
        summary: [`${rows.length} customers`],
        columns: [{ key: "customer_no", label: "No." }, { key: "customer", label: "Customer" }, { key: "phone", label: "Phone" }, num("Purchases", "orders"), money("Total spent", "spent"), money("Owing", "balance"), { key: "last_purchase", label: "Last purchase", type: "date" }],
        rows
      };
    }
    case "sales.cashiers": {
      const rows = await all(env, `SELECT COALESCE(u.name, 'Unknown') AS staff, COUNT(*) AS receipts, SUM(s.total) AS total, SUM(s.discount) AS discount
          FROM shp_sales s LEFT JOIN users u ON u.id = s.sold_by WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ? GROUP BY s.sold_by ORDER BY total DESC`, sid, from, to);
      return { title: `Sales by staff member (${range})`, summary: [`${rows.length} staff`], columns: [{ key: "staff", label: "Staff member" }, num("Receipts", "receipts"), money("Total sales", "total"), money("Discounts given", "discount")], rows };
    }
    case "sales.receipts": {
      const st = q.status === "void" ? "void" : q.status === "completed" ? "completed" : "";
      const rows = await all(env, `SELECT s.receipt_no, s.created_at AS date, s.customer_name AS customer, s.total, s.paid, s.balance, s.payment_status, s.status, COALESCE(u.name, '') AS staff
          FROM shp_sales s LEFT JOIN users u ON u.id = s.sold_by WHERE s.shop_id = ? AND ${D} BETWEEN ? AND ? ${st ? "AND s.status = ?" : ""} ORDER BY s.id DESC`, sid, from, to, ...st ? [st] : []);
      return { title: `All receipts (${range})`, summary: [`${rows.length} receipts`], columns: [{ key: "receipt_no", label: "Receipt" }, { key: "date", label: "Date", type: "datetime" }, { key: "customer", label: "Customer" }, money("Total", "total"), money("Paid", "paid"), money("Owing", "balance"), { key: "payment_status", label: "Payment" }, { key: "status", label: "Status" }, { key: "staff", label: "Sold by" }], rows };
    }
    case "customers.all": {
      const rows = await all(env, `SELECT c.customer_no, c.full_name AS name, c.phone, c.email, c.customer_type AS type, c.city, c.status, c.created_at AS joined,
          COALESCE(st.orders, 0) AS orders, COALESCE(st.spent, 0) AS spent, COALESCE(st.balance, 0) AS balance
          FROM shp_customers c LEFT JOIN (SELECT customer_id, COUNT(*) AS orders, SUM(total) AS spent, SUM(balance) AS balance FROM shp_sales WHERE shop_id = ?1 AND status = 'completed' GROUP BY customer_id) st ON st.customer_id = c.id
          WHERE c.shop_id = ?1 ORDER BY c.full_name COLLATE NOCASE`, sid);
      return { title: "Customer list", summary: [`${rows.length} customers`], columns: [{ key: "customer_no", label: "No." }, { key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "email", label: "Email" }, { key: "type", label: "Type" }, { key: "city", label: "City" }, num("Purchases", "orders"), money("Total spent", "spent"), money("Owing", "balance"), { key: "status", label: "Status" }, { key: "joined", label: "Saved on", type: "date" }], rows };
    }
    case "customers.debtors": {
      const rows = await all(env, `SELECT c.customer_no, c.full_name AS name, c.phone, SUM(s.balance) AS owed, COUNT(*) AS open_sales, MIN(s.created_at) AS oldest, MIN(s.due_date) AS due
          FROM shp_sales s JOIN shp_customers c ON c.id = s.customer_id WHERE s.shop_id = ? AND s.status = 'completed' AND s.balance > 0.004 GROUP BY c.id ORDER BY owed DESC`, sid);
      const total = rows.reduce((s, r) => s + r.owed, 0);
      return { title: "Customers who owe money", summary: [`${rows.length} customers`, `Total owed ${round22(total).toLocaleString("en-US")} ${ctx.shop.currency}`], columns: [{ key: "customer_no", label: "No." }, { key: "name", label: "Customer" }, { key: "phone", label: "Phone" }, money("Owes", "owed"), num("Unpaid sales", "open_sales"), { key: "oldest", label: "Oldest unpaid", type: "date" }, { key: "due", label: "Pay by", type: "date" }], rows };
    }
    case "customers.new": {
      const rows = await all(env, `SELECT customer_no, full_name AS name, phone, customer_type AS type, city, created_at AS joined FROM shp_customers
          WHERE shop_id = ? AND ${localDate("created_at", off)} BETWEEN ? AND ? ORDER BY id DESC`, sid, from, to);
      return { title: `New customers (${range})`, summary: [`${rows.length} customers saved`], columns: [{ key: "customer_no", label: "No." }, { key: "name", label: "Name" }, { key: "phone", label: "Phone" }, { key: "type", label: "Type" }, { key: "city", label: "City" }, { key: "joined", label: "Saved on", type: "date" }], rows };
    }
    case "inventory.stock": {
      const cat = q.category_id ? Number(q.category_id) : 0;
      const rows = await all(env, `SELECT p.name AS product, COALESCE(c.name, '\u2014') AS category, p.unit, p.stock_qty AS qty, p.reorder_level AS reorder, p.cost_price AS cost, p.sell_price AS price,
          CASE WHEN p.stock_qty > 0 THEN p.stock_qty * p.cost_price ELSE 0 END AS cost_value, CASE WHEN p.stock_qty > 0 THEN p.stock_qty * p.sell_price ELSE 0 END AS retail_value,
          CASE WHEN p.track_stock = 0 THEN 'Service' WHEN p.stock_qty <= 0 THEN 'Out of stock' WHEN p.stock_qty <= p.reorder_level THEN 'Low' ELSE 'OK' END AS state
          FROM shp_products p LEFT JOIN shp_categories c ON c.id = p.category_id WHERE p.shop_id = ? AND p.status = 'active' AND p.track_stock = 1 ${cat ? "AND p.category_id = ?" : ""} ORDER BY p.name COLLATE NOCASE`, sid, ...cat ? [cat] : []);
      const cv = rows.reduce((s, r) => s + r.cost_value, 0);
      const rv = rows.reduce((s, r) => s + r.retail_value, 0);
      return {
        title: "Stock levels & value",
        summary: [`${rows.length} products`, ...profit ? [`Stock cost ${round22(cv).toLocaleString("en-US")} ${ctx.shop.currency}`] : [], `Retail value ${round22(rv).toLocaleString("en-US")} ${ctx.shop.currency}`],
        columns: [{ key: "product", label: "Product" }, { key: "category", label: "Category" }, { key: "unit", label: "Unit" }, num("In stock", "qty"), num("Low level", "reorder"), ...profit ? [money("Cost price", "cost"), money("Cost value", "cost_value")] : [], money("Selling price", "price"), money("Retail value", "retail_value"), { key: "state", label: "State" }],
        rows: rows.map((r) => {
          if (!profit) {
            delete r.cost;
            delete r.cost_value;
          }
          return r;
        })
      };
    }
    case "inventory.low": {
      const rows = await all(env, `SELECT p.name AS product, COALESCE(c.name, '\u2014') AS category, p.unit, p.stock_qty AS qty, p.reorder_level AS reorder,
          CASE WHEN p.stock_qty <= 0 THEN 'Out of stock' ELSE 'Low' END AS state FROM shp_products p LEFT JOIN shp_categories c ON c.id = p.category_id
          WHERE p.shop_id = ? AND p.status = 'active' AND p.track_stock = 1 AND p.stock_qty <= p.reorder_level ORDER BY p.stock_qty ASC, p.name`, sid);
      return { title: "Low & out of stock", summary: [`${rows.length} products need restocking`], columns: [{ key: "product", label: "Product" }, { key: "category", label: "Category" }, { key: "unit", label: "Unit" }, num("In stock", "qty"), num("Low level", "reorder"), { key: "state", label: "State" }], rows };
    }
    case "inventory.movements": {
      const rows = await all(env, `SELECT m.created_at AS date, p.name AS product, m.type, m.qty_change AS change, m.balance_after AS balance, COALESCE(u.name, '') AS staff, COALESCE(m.note, '') AS note
          FROM shp_stock_moves m JOIN shp_products p ON p.id = m.product_id LEFT JOIN users u ON u.id = m.user_id
          WHERE m.shop_id = ? AND ${localDate("m.created_at", off)} BETWEEN ? AND ? ORDER BY m.id DESC LIMIT 2000`, sid, from, to);
      return { title: `Stock movements (${range})`, summary: [`${rows.length} movements`], columns: [{ key: "date", label: "Date", type: "datetime" }, { key: "product", label: "Product" }, { key: "type", label: "Type" }, num("Change", "change"), num("Balance", "balance"), { key: "staff", label: "By" }, { key: "note", label: "Note" }], rows };
    }
    case "finance.profit": {
      const s = await one(env, `SELECT COALESCE(SUM(s.subtotal), 0) AS gross, COALESCE(SUM(s.discount), 0) AS discount, COALESCE(SUM(s.tax), 0) AS tax, COALESCE(SUM(s.cost_total), 0) AS cost, COUNT(*) AS n
          FROM shp_sales s WHERE s.shop_id = ? AND s.status = 'completed' AND ${D} BETWEEN ? AND ?`, sid, from, to);
      const e = await one(env, `SELECT COALESCE(SUM(amount), 0) AS n FROM shp_expenses WHERE shop_id = ? AND expense_date BETWEEN ? AND ?`, sid, from, to);
      const net = round22(s.gross - s.discount);
      const gp = round22(net - s.cost);
      const np = round22(gp - e.n);
      const rows = [
        { line: "Gross sales", amount: round22(s.gross), note: `${s.n} receipts` },
        { line: "Less: discounts given", amount: -round22(s.discount), note: "" },
        { line: "Net sales", amount: net, note: "Before VAT" },
        { line: "Less: cost of goods sold", amount: -round22(s.cost), note: "What the items cost you" },
        { line: "Gross profit", amount: gp, note: net > 0 ? `${round22(gp / net * 100)}% margin` : "" },
        { line: "Less: expenses", amount: -round22(e.n), note: "Rent, transport, salaries\u2026" },
        { line: "Net profit", amount: np, note: np < 0 ? "A loss for this period" : "" },
        { line: "VAT collected (not income)", amount: round22(s.tax), note: "Owed to the tax authority" }
      ];
      return { title: `Profit & loss (${range})`, summary: [`Net profit ${np.toLocaleString("en-US")} ${ctx.shop.currency}`], columns: [{ key: "line", label: "Item" }, money("Amount", "amount"), { key: "note", label: "Note" }], rows };
    }
    case "finance.payments": {
      const method = q.method ? String(q.method) : "";
      const rows = await all(env, `SELECT p.created_at AS date, s.receipt_no, s.customer_name AS customer, p.method, p.amount, COALESCE(p.reference, '') AS reference, COALESCE(u.name, '') AS staff
          FROM shp_payments p JOIN shp_sales s ON s.id = p.sale_id LEFT JOIN users u ON u.id = p.received_by
          WHERE p.shop_id = ? AND s.status = 'completed' AND ${localDate("p.created_at", off)} BETWEEN ? AND ? ${method ? "AND p.method = ?" : ""} ORDER BY p.id DESC`, sid, from, to, ...method ? [method] : []);
      const total = rows.reduce((a, r) => a + r.amount, 0);
      const byM = {};
      rows.forEach((r) => {
        byM[r.method] = (byM[r.method] || 0) + r.amount;
      });
      return {
        title: `Money received (${range})`,
        summary: [`Total ${round22(total).toLocaleString("en-US")} ${ctx.shop.currency}`, ...Object.entries(byM).map(([m, v]) => `${m}: ${round22(v).toLocaleString("en-US")}`)],
        columns: [{ key: "date", label: "Date", type: "datetime" }, { key: "receipt_no", label: "Receipt" }, { key: "customer", label: "Customer" }, { key: "method", label: "Method" }, money("Amount", "amount"), { key: "reference", label: "Reference" }, { key: "staff", label: "Received by" }],
        rows
      };
    }
    case "finance.expenses": {
      const rows = await all(env, `SELECT expense_date AS date, category, COALESCE(description, '') AS description, COALESCE(method, '') AS method, amount FROM shp_expenses
          WHERE shop_id = ? AND expense_date BETWEEN ? AND ? ORDER BY expense_date DESC, id DESC`, sid, from, to);
      const total = rows.reduce((a, r) => a + r.amount, 0);
      return { title: `Expenses (${range})`, summary: [`${rows.length} expenses`, `Total ${round22(total).toLocaleString("en-US")} ${ctx.shop.currency}`], columns: [{ key: "date", label: "Date", type: "date" }, { key: "category", label: "Category" }, { key: "description", label: "Description" }, { key: "method", label: "Paid with" }, money("Amount", "amount")], rows };
    }
    default:
      fail(404, "Unknown report.");
  }
}
__name(buildReport2, "buildReport");
var runReport2 = secure2({ perm: "reports.view" }, async ({ request, env, params, url, ctx }) => {
  const q = Object.fromEntries(url.searchParams.entries());
  const report = await buildReport2(env, ctx, params.key, q);
  await audit2(env, request, ctx, "report.run", "report", null, params.key);
  return json({ report: { ...report, shop: ctx.shop.name, currency: ctx.shop.currency, generated_at: (/* @__PURE__ */ new Date()).toISOString(), key: params.key } });
});

// src/handlers/shop/demo.js
init_auth();
function rng2(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
__name(rng2, "rng");
var PRODUCTS = [
  ["Rice (1 kg)", "Food & Drinks", "kg", 2300, 2800, 180, 30],
  ["Sugar (1 kg)", "Food & Drinks", "kg", 2600, 3200, 140, 25],
  ["Cooking oil (1 L)", "Food & Drinks", "litre", 5200, 6e3, 90, 20],
  ["Wheat flour (2 kg)", "Food & Drinks", "pcs", 4400, 5200, 70, 15],
  ["Bottled water (500 ml)", "Food & Drinks", "bottle", 450, 800, 240, 48],
  ["Soda (350 ml)", "Food & Drinks", "bottle", 550, 1e3, 200, 48],
  ["Bread (loaf)", "Food & Drinks", "pcs", 1800, 2300, 50, 12],
  ["Eggs (tray of 30)", "Food & Drinks", "pcs", 9500, 11500, 30, 6],
  ["Fresh milk (500 ml)", "Food & Drinks", "pcs", 1100, 1500, 60, 12],
  ["Tea leaves (250 g)", "Food & Drinks", "pack", 1500, 2e3, 55, 10],
  ["Laundry soap (bar)", "Household", "pcs", 1400, 1900, 100, 20],
  ["Washing powder (1 kg)", "Household", "pack", 4200, 5e3, 60, 12],
  ["Toothpaste", "Household", "pcs", 1700, 2400, 70, 15],
  ["Toilet paper (4 rolls)", "Household", "pack", 2800, 3600, 65, 12],
  ["Dish washing liquid", "Household", "bottle", 2400, 3200, 40, 8],
  ["Candles (pack of 6)", "Household", "pack", 1800, 2500, 45, 10],
  ["Phone charger", "Electronics", "pcs", 4500, 8e3, 25, 5],
  ["Earphones", "Electronics", "pcs", 3500, 7e3, 30, 6],
  ["USB flash drive 16 GB", "Electronics", "pcs", 9e3, 14e3, 20, 4],
  ["Torch (rechargeable)", "Electronics", "pcs", 7500, 12e3, 14, 4],
  ["Batteries AA (4 pack)", "Electronics", "pack", 2200, 3500, 50, 10],
  ["Cotton T-shirt", "Clothing", "pcs", 6500, 12e3, 36, 8],
  ["School socks (pair)", "Clothing", "pcs", 1200, 2500, 60, 12],
  ["Kitenge fabric (2 m)", "Clothing", "pcs", 12e3, 2e4, 18, 4],
  ["Exercise book", "General", "pcs", 700, 1200, 150, 30],
  ["Ball pen (blue)", "General", "pcs", 250, 500, 220, 40],
  ["Padlock", "General", "pcs", 3200, 5500, 22, 5],
  ["Phone airtime voucher", "Services", "service", 0, 0, 0, 0],
  ["Photocopy (per page)", "Services", "service", 0, 100, 0, 0],
  ["Delivery within town", "Services", "service", 0, 3e3, 0, 0]
];
var CATEGORY_COLORS = { "Food & Drinks": "#F59E0B", Household: "#10B981", Electronics: "#3B82F6", Clothing: "#EC4899", General: "#6366F1", Services: "#8B5CF6" };
var CUSTOMERS = [
  ["Amina Juma", "female", "retail", "Kariakoo", 0],
  ["John Mushi", "male", "retail", "Sinza", 0],
  ["Neema Mwakyusa", "female", "vip", "Mikocheni", 5e5],
  ["Hassan Ally", "male", "wholesale", "Kariakoo", 2e6],
  ["Grace Kimaro", "female", "retail", "Mbezi", 0],
  ["Baraka Lyimo", "male", "retail", "Ubungo", 1e5],
  ["Fatuma Said", "female", "retail", "Temeke", 0],
  ["Peter Mollel", "male", "wholesale", "Tegeta", 15e5],
  ["Rehema Mrema", "female", "vip", "Msasani", 8e5],
  ["Daudi Kessy", "male", "retail", "Kinondoni", 0],
  ["Zawadi Komba", "female", "retail", "Mwenge", 15e4],
  ["Emmanuel Shayo", "male", "retail", "Kimara", 0],
  ["Halima Bakari", "female", "retail", "Magomeni", 0],
  ["Joseph Mwita", "male", "wholesale", "Gongo la Mboto", 1e6],
  ["Upendo Massawe", "female", "retail", "Mbagala", 0],
  ["Salum Omary", "male", "retail", "Buguruni", 1e5],
  ["Mariam Chuwa", "female", "vip", "Oysterbay", 1e6],
  ["Frank Temba", "male", "retail", "Ilala", 0],
  ["Joyce Ndunguru", "female", "retail", "Ubungo", 0],
  ["Rashidi Mfaume", "male", "retail", "Kigamboni", 0],
  ["Esther Kileo", "female", "retail", "Sinza", 8e4],
  ["Kelvin Msigwa", "male", "retail", "Mikocheni", 0],
  ["Tumaini Lema", "female", "wholesale", "Kariakoo", 12e5],
  ["Issa Mtemvu", "male", "retail", "Tabata", 0]
];
var EXPENSES = [
  ["Rent", "Monthly shop rent", 3e5],
  ["Electricity & water", "LUKU token and water bill", 85e3],
  ["Transport", "Stock delivery from Kariakoo", 4e4],
  ["Salaries", "Shop assistant wages", 25e4],
  ["Marketing", "Flyers and social media promotion", 25e3],
  ["Repairs", "Fix shelf and door lock", 3e4],
  ["Transport", "Fuel for deliveries", 35e3],
  ["Other", "Cleaning supplies", 12e3],
  ["Electricity & water", "Water bill", 18e3],
  ["Marketing", "Shop signboard repaint", 45e3]
];
var pad = /* @__PURE__ */ __name((n2) => String(n2).padStart(2, "0"), "pad");
var loadDemoData2 = secure2({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const sid = ctx.shop.id;
  const off = offsetMin(ctx);
  const busy = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM shp_customers WHERE shop_id = ?1) + (SELECT COUNT(*) FROM shp_products WHERE shop_id = ?1) + (SELECT COUNT(*) FROM shp_sales WHERE shop_id = ?1) AS n`
  ).bind(sid).first();
  if (busy.n > 0) fail(409, 'Sample data can only be added to an empty shop. Use "Reset shop data" first if you want to start over.');
  const settings = await getSettings3(env, sid);
  const rand = rng2(21);
  const pick = /* @__PURE__ */ __name((arr) => arr[Math.floor(rand() * arr.length)], "pick");
  const today = shopToday(off);
  await env.DB.batch(Object.entries(CATEGORY_COLORS).map(([n2, c]) => env.DB.prepare("INSERT OR IGNORE INTO shp_categories (shop_id, name, color) VALUES (?, ?, ?)").bind(sid, n2, c)));
  const { results: cats } = await env.DB.prepare("SELECT id, name FROM shp_categories WHERE shop_id = ?").bind(sid).all();
  const catId = new Map(cats.map((c) => [c.name, c.id]));
  const base = await env.DB.prepare(
    `SELECT (SELECT COALESCE(MAX(id), 0) FROM shp_customers) AS c, (SELECT COALESCE(MAX(id), 0) FROM shp_products) AS p, (SELECT COALESCE(MAX(id), 0) FROM shp_sales) AS s`
  ).first();
  const products = PRODUCTS.map((p, i) => ({
    id: base.p + i + 1,
    name: p[0],
    cat: p[1],
    unit: p[2],
    cost: p[3],
    price: p[4],
    stock: Math.round(p[5] * 1.6),
    low: p[6],
    track: p[2] === "service" ? 0 : 1,
    opening: Math.round(p[5] * 1.6)
  }));
  const customers = CUSTOMERS.map((c, i) => ({
    id: base.c + i + 1,
    seq: i + 1,
    name: c[0],
    gender: c[1],
    type: c[2],
    city: c[3],
    limit: c[4],
    phone: `+255 ${pick([71, 74, 75, 76, 65, 67, 68, 69])}${Math.floor(1e6 + rand() * 8999999)}`
  }));
  const sales = [];
  for (let n2 = 0; n2 < 150; n2++) {
    const daysAgo = Math.floor(Math.pow(rand(), 1.15) * 30);
    const day = addDays2(today, -daysAgo);
    const hh = 8 + Math.floor(rand() * 12);
    const mm = Math.floor(rand() * 60);
    const localMs = Date.parse(`${day}T${pad(hh)}:${pad(mm)}:00Z`) - off * 6e4;
    if (localMs > Date.now()) {
      n2--;
      continue;
    }
    sales.push({ ms: localMs, day, customer: rand() < 0.62 ? pick(customers) : null });
  }
  sales.sort((a, b) => a.ms - b.ms);
  const saleRows = [];
  const itemRows = [];
  const payRows = [];
  const moveRows = [];
  const toSql = /* @__PURE__ */ __name((ms) => new Date(ms).toISOString().slice(0, 19).replace("T", " "), "toSql");
  sales.forEach((s, idx) => {
    const id = base.s + idx + 1;
    const nLines = 1 + Math.floor(rand() * 4);
    const used = /* @__PURE__ */ new Set();
    let subtotal = 0;
    let cost = 0;
    for (let k = 0; k < nLines; k++) {
      const p = pick(products);
      if (used.has(p.id)) continue;
      let qty = p.unit === "service" ? 1 + Math.floor(rand() * 3) : 1 + Math.floor(rand() * 4);
      if (p.name.startsWith("Photocopy")) qty = 5 + Math.floor(rand() * 30);
      let price = p.price;
      if (p.name.startsWith("Phone airtime")) {
        price = [1e3, 2e3, 5e3, 1e4][Math.floor(rand() * 4)];
        qty = 1;
      }
      if (p.track && p.stock < qty) continue;
      used.add(p.id);
      const line = round22(qty * price);
      subtotal += line;
      cost += qty * p.cost;
      itemRows.push({ sale: id, p, qty, price, line });
      if (p.track) {
        p.stock = round22(p.stock - qty);
        moveRows.push({ product: p.id, change: -qty, balance: p.stock, sale: id, at: s.ms });
      }
    }
    if (!itemRows.some((r) => r.sale === id)) {
      const p = products[4];
      itemRows.push({ sale: id, p, qty: 1, price: p.price, line: p.price });
      subtotal += p.price;
      cost += p.cost;
      p.stock -= 1;
      moveRows.push({ product: p.id, change: -1, balance: p.stock, sale: id, at: s.ms });
    }
    const discount = rand() < 0.07 ? Math.round(subtotal * 0.05 / 100) * 100 : 0;
    const total = round22(subtotal - discount);
    let paid = total;
    const method = /* @__PURE__ */ __name(() => pick(["Cash", "Cash", "Cash", "Mobile Money", "Mobile Money", "Bank"]), "method");
    const pays = [];
    if (s.customer && rand() < 0.36) {
      const r = rand();
      paid = r < 0.45 ? 0 : Math.round(total * (0.3 + rand() * 0.4) / 100) * 100;
      if (paid > 0) pays.push({ amount: paid, method: method(), at: s.ms });
      if (rand() < 0.4) {
        const later = s.ms + (1 + Math.floor(rand() * 9)) * 864e5;
        if (later < Date.now()) {
          const extra = round22(Math.min(total - paid, Math.round((total - paid) * (0.5 + rand() * 0.5) / 100) * 100 || total - paid));
          if (extra > 0) {
            pays.push({ amount: extra, method: method(), at: later });
            paid = round22(paid + extra);
          }
        }
      }
    } else {
      pays.push({ amount: total, method: method(), at: s.ms });
    }
    const balance = Math.max(0, round22(total - paid));
    saleRows.push({ id, seq: idx + 1, ms: s.ms, customer: s.customer, subtotal: round22(subtotal), discount, total, paid, balance, cost: round22(cost), status: balance <= 4e-3 ? "paid" : paid > 0 ? "partial" : "unpaid", due: balance > 0 ? addDays2(s.day, 14) : null });
    pays.forEach((p) => payRows.push({ sale: id, customer: s.customer, ...p }));
  });
  const tweak = /* @__PURE__ */ __name((name, to, note, type) => {
    const p = products.find((x) => x.name.startsWith(name));
    if (!p) return;
    const change = round22(to - p.stock);
    p.stock = to;
    moveRows.push({ product: p.id, change, balance: to, sale: null, at: Date.now(), note, type });
  }, "tweak");
  tweak("Cooking oil", 4, "Stock count", "adjust");
  tweak("Earphones", 0, "Damaged in storage", "damage");
  tweak("Eggs", 3, "Stock count", "adjust");
  tweak("Bread", 5, "Sold out this morning", "adjust");
  const stmts = [];
  products.forEach((p) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_products (id, shop_id, category_id, name, sku, unit, cost_price, sell_price, stock_qty, reorder_level, track_stock, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', '-31 days'))`
  ).bind(p.id, sid, catId.get(p.cat) || null, p.name, `SKU-${String(p.id - base.p).padStart(3, "0")}`, p.unit, p.cost, p.price, p.stock, p.low, p.track)));
  products.filter((p) => p.track).forEach((p) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, user_id, created_at) VALUES (?, ?, 'opening', ?, ?, 'Opening stock', ?, datetime('now', '-31 days'))`
  ).bind(sid, p.id, p.opening, p.opening, ctx.user.id)));
  customers.forEach((c) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_customers (id, shop_id, seq, customer_no, full_name, phone, city, customer_type, gender, credit_limit, created_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))`
  ).bind(c.id, sid, c.seq, `${settings.customer_prefix}-${String(c.seq).padStart(4, "0")}`, c.name, c.phone, c.city, c.type, c.gender, c.limit, ctx.user.id, `-${30 - c.seq % 28} days`)));
  saleRows.forEach((s) => stmts.push(env.DB.prepare(
    `INSERT INTO shp_sales (id, shop_id, seq, receipt_no, customer_id, customer_name, customer_phone, subtotal, discount, tax, total, paid, balance, cost_total, payment_status, due_date, sold_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    s.id,
    sid,
    s.seq,
    formatReceiptNo(settings.receipt_prefix, s.seq),
    s.customer ? s.customer.id : null,
    s.customer ? s.customer.name : "Walk-in customer",
    s.customer ? s.customer.phone : null,
    s.subtotal,
    s.discount,
    s.total,
    s.paid,
    s.balance,
    s.cost,
    s.status,
    s.due,
    ctx.user.id,
    toSql(s.ms)
  )));
  itemRows.forEach((i) => stmts.push(env.DB.prepare("INSERT INTO shp_sale_items (shop_id, sale_id, product_id, name, unit, qty, unit_price, cost_price, line_total) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(sid, i.sale, i.p.id, i.p.name, i.p.unit, i.qty, i.price, i.p.cost, i.line)));
  payRows.forEach((p) => stmts.push(env.DB.prepare("INSERT INTO shp_payments (shop_id, sale_id, customer_id, amount, method, received_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(sid, p.sale, p.customer ? p.customer.id : null, p.amount, p.method, ctx.user.id, toSql(p.at))));
  moveRows.forEach((m) => stmts.push(env.DB.prepare("INSERT INTO shp_stock_moves (shop_id, product_id, type, qty_change, balance_after, note, sale_id, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(sid, m.product, m.type || "sale", m.change, m.balance, m.note || null, m.sale, ctx.user.id, toSql(m.at))));
  EXPENSES.forEach((e, i) => stmts.push(env.DB.prepare("INSERT INTO shp_expenses (shop_id, category, description, amount, expense_date, method, created_by) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(sid, e[0], e[1], e[2], addDays2(today, -Math.floor(i * 2.8) - 1), i % 3 === 0 ? "Bank" : "Cash", ctx.user.id)));
  const notes = [[customers[3], "Buys in bulk every Monday. Prefers delivery to the shop door."], [customers[2], "VIP \u2014 always give first choice of new stock."], [customers[5], "Pays balances at month end."]];
  notes.forEach(([c, t]) => stmts.push(env.DB.prepare("INSERT INTO shp_customer_notes (shop_id, customer_id, user_id, note) VALUES (?, ?, ?, ?)").bind(sid, c.id, ctx.user.id, t)));
  for (const part of chunk(stmts, 80)) await env.DB.batch(part);
  await audit2(env, request, ctx, "demo.load", "shop", sid, `${customers.length} customers, ${products.length} products, ${saleRows.length} sales`);
  return json({ ok: true, customers: customers.length, products: products.length, sales: saleRows.length }, { status: 201 });
});
var resetShopData = secure2({ roles: ["owner"], perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  if (String(b.confirm || "").trim().toUpperCase() !== "RESET") fail(400, "Type RESET to confirm.");
  const sid = ctx.shop.id;
  await env.DB.batch([
    env.DB.prepare("DELETE FROM shp_qr_codes WHERE shop_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM shp_sales WHERE shop_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM shp_stock_moves WHERE shop_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM shp_customer_notes WHERE shop_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM shp_customers WHERE shop_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM shp_products WHERE shop_id = ?").bind(sid),
    env.DB.prepare("DELETE FROM shp_expenses WHERE shop_id = ?").bind(sid)
  ]);
  await audit2(env, request, ctx, "shop.reset", "shop", sid, "All customers, products, sales and expenses deleted");
  return json({ ok: true });
});

// src/handlers/shop/qr.js
init_auth();
var STATUSES3 = ["in_stock", "sold", "disabled"];
async function loadProduct2(env, ctx, id) {
  const p = await env.DB.prepare("SELECT id, name, unit, sell_price, track_stock, stock_qty, status FROM shp_products WHERE id = ? AND shop_id = ?").bind(id, ctx.shop.id).first();
  if (!p) fail(404, "Product not found.");
  return p;
}
__name(loadProduct2, "loadProduct");
async function summaryFor(env, productId) {
  const { results } = await env.DB.prepare("SELECT status, COUNT(*) AS n FROM shp_qr_codes WHERE product_id = ? GROUP BY status").bind(productId).all();
  const s = { in_stock: 0, sold: 0, disabled: 0, total: 0 };
  results.forEach((r) => {
    s[r.status] = r.n;
    s.total += r.n;
  });
  return s;
}
__name(summaryFor, "summaryFor");
var listProductQr = secure2({ perm: "products.view" }, async ({ env, params, url, ctx }) => {
  const p = await loadProduct2(env, ctx, params.id);
  const { page, limit, offset } = paging(url, 30, 200);
  const status = url.searchParams.get("status");
  const where = ["q.product_id = ?1", "q.shop_id = ?2"];
  const binds = [p.id, ctx.shop.id];
  if (status) {
    where.push("q.status = ?3");
    binds.push(V.oneOf(status, "Status", STATUSES3));
  }
  const base = `FROM shp_qr_codes q LEFT JOIN shp_sales s ON s.id = q.sale_id WHERE ${where.join(" AND ")}`;
  const [{ results }, count, summary2] = await Promise.all([
    env.DB.prepare(`SELECT q.id, q.code, q.serial, q.status, q.sale_id, q.sold_at, q.created_at, s.receipt_no
                    ${base} ORDER BY q.serial DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first(),
    summaryFor(env, p.id)
  ]);
  if (!can3(ctx, "sales.view")) results.forEach((r) => {
    r.sale_id = null;
    r.receipt_no = null;
  });
  return json({ product: p, units: results, total: count.n, page, limit, summary: summary2 });
});
var generateProductQr = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const p = await loadProduct2(env, ctx, params.id);
  const b = await readJson(request);
  const count = V.int(b.count, "Number of QR codes", { required: true, min: 1, max: QR_MAX_PER_BATCH });
  let base = 0;
  let lastErr = null;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const top = await env.DB.prepare("SELECT COALESCE(MAX(serial), 0) AS n FROM shp_qr_codes WHERE product_id = ?").bind(p.id).first();
    base = top.n;
    try {
      await env.DB.prepare(
        `INSERT INTO shp_qr_codes (shop_id, product_id, code, serial, created_by)
         SELECT ?1, ?2, j.value, ?3 + j.key + 1, ?4 FROM json_each(?5) j`
      ).bind(ctx.shop.id, p.id, base, ctx.user.id, JSON.stringify(newQrCodes(count))).run();
      lastErr = null;
      break;
    } catch (e) {
      if (!/UNIQUE/i.test(String(e && e.message))) throw e;
      lastErr = e;
    }
  }
  if (lastErr) throw new HttpError(409, "Another person was creating QR codes at the same time. Please try again.");
  const { results } = await env.DB.prepare(
    `SELECT id, code, serial, status, sale_id, sold_at, created_at FROM shp_qr_codes WHERE product_id = ? AND serial > ? ORDER BY serial`
  ).bind(p.id, base).all();
  await audit2(env, request, ctx, "qr.generate", "product", p.id, `${p.name}: ${results.length} QR codes (#${base + 1}\u2013#${base + results.length})`);
  return json({ ok: true, units: results, summary: await summaryFor(env, p.id) }, { status: 201 });
});
var lookupQr = secure2({ perm: ["products.view", "sales.create"] }, async ({ env, url, ctx }) => {
  const code = extractQrCode(url.searchParams.get("code"));
  if (!code) fail(400, "That does not look like a Smart21Shop QR code.");
  const u = await env.DB.prepare(
    `SELECT q.id, q.code, q.serial, q.status, q.sold_at, q.created_at, q.sale_id,
            p.id AS product_id, p.name, p.unit, p.sell_price, p.status AS product_status, p.track_stock, p.stock_qty, p.image_key,
            c.name AS category_name
     FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id LEFT JOIN shp_categories c ON c.id = p.category_id
     WHERE q.code = ? AND q.shop_id = ?`
  ).bind(code, ctx.shop.id).first();
  if (!u) fail(404, "This QR code was not found in your shop.");
  let sale = null;
  if (u.status === "sold" && u.sale_id && can3(ctx, "sales.view")) {
    sale = await env.DB.prepare("SELECT id, receipt_no, customer_name, total, created_at FROM shp_sales WHERE id = ? AND shop_id = ?").bind(u.sale_id, ctx.shop.id).first();
  }
  return json({
    unit: { id: u.id, code: u.code, serial: u.serial, status: u.status, sold_at: u.sold_at, created_at: u.created_at },
    product: {
      id: u.product_id,
      name: u.name,
      unit: u.unit,
      sell_price: u.sell_price,
      status: u.product_status,
      track_stock: u.track_stock,
      stock_qty: u.stock_qty,
      category_name: u.category_name,
      has_image: !!u.image_key
    },
    sale
  });
});
var setQrStatus = secure2({ perm: "products.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, "Status", ["in_stock", "disabled"], { required: true });
  const u = await env.DB.prepare(
    `SELECT q.id, q.serial, q.status, p.name FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id WHERE q.id = ? AND q.shop_id = ?`
  ).bind(params.id, ctx.shop.id).first();
  if (!u) fail(404, "QR code not found.");
  if (u.status === "sold") fail(400, "This item has already been sold. Cancel the sale first if it came back.");
  if (u.status === status) return json({ ok: true, status });
  await env.DB.prepare("UPDATE shp_qr_codes SET status = ? WHERE id = ? AND shop_id = ? AND status != 'sold'").bind(status, u.id, ctx.shop.id).run();
  await audit2(env, request, ctx, status === "disabled" ? "qr.disable" : "qr.enable", "product", null, `${u.name} #${u.serial}`);
  return json({ ok: true, status });
});
async function publicQr({ params, env }) {
  const noStore = { "Cache-Control": "no-store" };
  try {
    const code = String(params.code || "").toUpperCase();
    if (!QR_CODE_RE.test(code)) return json({ valid: false, error: "This QR code could not be verified." }, { status: 404, headers: noStore });
    const r = await env.DB.prepare(
      `SELECT q.serial, q.status, q.sold_at, p.name AS product_name, p.sell_price, p.status AS product_status, c.name AS category_name,
              s.id AS shop_id, s.name AS shop_name, s.phone, s.logo_key, s.primary_color, s.currency, s.utc_offset_min
       FROM shp_qr_codes q JOIN shp_products p ON p.id = q.product_id JOIN shp_shops s ON s.id = q.shop_id
       LEFT JOIN shp_categories c ON c.id = p.category_id WHERE q.code = ?`
    ).bind(code).first();
    if (!r) return json({ valid: false, error: "This QR code could not be verified." }, { status: 404, headers: noStore });
    const available = r.status === "in_stock" && r.product_status === "active";
    let soldOn = null;
    if (r.status === "sold" && r.sold_at) {
      const off = Number.isInteger(r.utc_offset_min) ? r.utc_offset_min : 180;
      soldOn = new Date(Date.parse(String(r.sold_at).replace(" ", "T") + "Z") + off * 6e4).toISOString().slice(0, 10);
    }
    return json({
      valid: true,
      shop: { id: r.shop_id, name: r.shop_name, phone: r.phone, has_logo: !!r.logo_key, color: r.primary_color, currency: r.currency },
      product: { name: r.product_name, category: r.category_name },
      item: {
        serial: r.serial,
        status: r.status === "sold" ? "sold" : available ? "available" : "unavailable",
        sold_on: soldOn,
        price: available ? r.sell_price : null
      }
    }, { headers: noStore });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicQr, "publicQr");

// src/handlers/institution/core.js
init_auth();
init_institution_auth();
var TYPES3 = ["school", "college", "university", "library", "training_center", "organization"];
function makeShort3(name) {
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, " ").split(/\s+/).filter(Boolean);
  const stop = /* @__PURE__ */ new Set(["of", "the", "and", "school", "college", "university", "ltd", "limited", "centre", "center", "library"]);
  let letters = words.filter((w) => !stop.has(w.toLowerCase())).map((w) => w[0].toUpperCase()).join("");
  if (letters.length < 2) letters = String(name).replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase();
  return (letters || "INS").slice(0, 5);
}
__name(makeShort3, "makeShort");
async function uniqueSlug(env, name) {
  let base = slugify2(name);
  if (["logo", "public"].includes(base)) base += "-institution";
  for (let i = 0; i < 30; i++) {
    const s = i === 0 ? base : `${base}-${i + 1}`;
    const hit = await env.DB.prepare("SELECT 1 AS x FROM ins_institutions WHERE slug = ?").bind(s).first();
    if (!hit) return s;
  }
  return `${base}-${randomToken2(3)}`;
}
__name(uniqueSlug, "uniqueSlug");
var STARTER_CATEGORIES2 = ["General", "Fiction", "Science", "Mathematics", "History & Geography", "Languages", "Technology", "Reference"];
var STARTER_RESOURCE_CATEGORIES = ["E-books", "Notes & Handouts", "Journals", "Research", "Institutional publications"];
async function provisionInstitution(env, user, info) {
  const slug = await uniqueSlug(env, info.name);
  const ins = await env.DB.prepare(
    `INSERT INTO ins_institutions (name, short_name, slug, inst_type, phone, email, address, owner_user_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(info.name, makeShort3(info.name), slug, info.inst_type || "school", info.phone || null, info.email || null, info.address || null, user.id).run();
  const id = ins.meta.last_row_id;
  const year = (/* @__PURE__ */ new Date()).getUTCFullYear();
  const stmts = [];
  STARTER_CATEGORIES2.forEach((n2) => stmts.push(env.DB.prepare("INSERT INTO ins_categories (institution_id, name) VALUES (?, ?)").bind(id, n2)));
  STARTER_RESOURCE_CATEGORIES.forEach((n2) => stmts.push(env.DB.prepare("INSERT INTO ins_resource_categories (institution_id, name) VALUES (?, ?)").bind(id, n2)));
  stmts.push(env.DB.prepare("INSERT INTO ins_members (institution_id, user_id, role) VALUES (?, ?, ?)").bind(id, user.id, "super_admin"));
  for (const role of ROLES4.filter((r) => r !== "super_admin")) {
    for (const p of DEFAULT_ROLE_PERMISSIONS3[role]) {
      stmts.push(env.DB.prepare("INSERT INTO ins_role_permissions (institution_id, role, permission) VALUES (?, ?, ?)").bind(id, role, p));
    }
  }
  stmts.push(env.DB.prepare("INSERT INTO ins_academic_years (institution_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, 1)").bind(id, `${year}/${year + 1}`, `${year}-01-01`, `${year}-12-31`));
  await env.DB.batch(stmts);
  const ay = await env.DB.prepare("SELECT id FROM ins_academic_years WHERE institution_id = ? LIMIT 1").bind(id).first();
  await env.DB.batch([
    env.DB.prepare("INSERT INTO ins_terms (institution_id, academic_year_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, 1)").bind(id, ay.id, "Semester 1", `${year}-01-01`, `${year}-06-30`),
    env.DB.prepare("INSERT INTO ins_terms (institution_id, academic_year_id, name, start_date, end_date, is_current) VALUES (?, ?, ?, ?, ?, 0)").bind(id, ay.id, "Semester 2", `${year}-07-01`, `${year}-12-31`)
  ]);
  return id;
}
__name(provisionInstitution, "provisionInstitution");
async function startSession3(env, userId, remember) {
  const token = randomToken2(32);
  const days = remember ? 30 : 1;
  const expires = new Date(Date.now() + days * 864e5).toISOString();
  await env.DB.prepare("INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)").bind(token, userId, expires).run();
  return `s21_session=${token}; Path=/; HttpOnly; Secure; SameSite=Lax` + (remember ? `; Expires=${new Date(expires).toUTCString()}` : "");
}
__name(startSession3, "startSession");
var clientIp3 = /* @__PURE__ */ __name((request) => request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || null, "clientIp");
async function tooManyAttempts3(env, email, ip) {
  const a = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE success = 0 AND email = ? AND created_at > datetime('now','-15 minutes')`).bind(email).first();
  if ((a?.n || 0) >= 8) return true;
  if (ip) {
    const b = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE success = 0 AND ip = ? AND created_at > datetime('now','-15 minutes')`).bind(ip).first();
    if ((b?.n || 0) >= 25) return true;
  }
  return false;
}
__name(tooManyAttempts3, "tooManyAttempts");
async function registerInstitution({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const instName = V.str(body.institution_name, "Institution name", { required: true, max: 140, min: 2 });
    const type = V.oneOf(body.inst_type, "Institution type", TYPES3, { def: "school" });
    const name = V.str(body.name, "Your name", { required: true, max: 100 });
    const email = V.email(body.email, "Email", { required: true });
    const password = V.password(body.password);
    const phone = V.phone(body.phone, "Phone number");
    const ip = clientIp3(request);
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE ip = ? AND email = '(signup)' AND created_at > datetime('now','-1 hour')`).bind(ip).first();
    if (ip && (recent?.n || 0) >= 10) fail(429, "Too many sign-ups from this connection. Please try again later.");
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (exists) fail(409, "An account with this email already exists. Please sign in instead, then create your institution.");
    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)").bind(name, email, hash, salt, "user").run();
    const user = { id: u.meta.last_row_id, name, email };
    const id = await provisionInstitution(env, user, { name: instName, inst_type: type, phone, email });
    await env.DB.prepare(`INSERT INTO ins_login_attempts (email, ip, success) VALUES ('(signup)', ?, 1)`).bind(ip).run();
    const cookie = await startSession3(env, user.id, true);
    await audit3(env, request, { inst: { id }, user }, "system", "institution.create", "institution", id, `Institution "${instName}" created`);
    return json({ ok: true, institution_id: id }, { status: 201, headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(registerInstitution, "registerInstitution");
var createInstitution = secure3({ inst: false }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.institution_name, "Institution name", { required: true, max: 140, min: 2 });
  const type = V.oneOf(b.inst_type, "Institution type", TYPES3, { def: "school" });
  const owned = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_institutions WHERE owner_user_id = ?").bind(ctx.user.id).first();
  if ((owned?.n || 0) >= 5) fail(400, "You already own 5 institutions. Please contact support for more.");
  const id = await provisionInstitution(env, ctx.user, { name, inst_type: type, phone: V.phone(b.phone, "Phone number"), email: ctx.user.email });
  await audit3(env, request, { inst: { id }, user: ctx.user }, "system", "institution.create", "institution", id, `Institution "${name}" created`);
  return json({ ok: true, institution_id: id }, { status: 201 });
});
async function login4({ request, env }) {
  try {
    assertSameOrigin(request);
    const body = await readJson(request);
    const email = V.str(body.email, "Email", { required: true, max: 160 }).toLowerCase();
    const password = String(body.password || "");
    if (!password) fail(400, "Password is required.");
    const ip = clientIp3(request);
    if (await tooManyAttempts3(env, email, ip)) fail(429, 'Too many failed sign-in attempts. Please wait 15 minutes and try again, or use "Forgot password".');
    const user = await env.DB.prepare("SELECT * FROM users WHERE email = ?").bind(email).first();
    const ok = user ? await verifyPassword(password, user.password_hash, user.password_salt) : false;
    await env.DB.prepare("INSERT INTO ins_login_attempts (email, ip, success) VALUES (?, ?, ?)").bind(email, ip, ok ? 1 : 0).run();
    if (!ok) {
      if (user) {
        const { results: ms2 } = await env.DB.prepare("SELECT institution_id FROM ins_members WHERE user_id = ?").bind(user.id).all();
        for (const m of ms2) await audit3(env, request, { inst: { id: m.institution_id }, user }, "auth", "user.login", "user", user.id, "Wrong password", "failed");
      }
      fail(401, "Incorrect email or password.");
    }
    const cookie = await startSession3(env, user.id, !!body.remember);
    await env.DB.prepare("INSERT INTO login_events (user_id, ip_address, user_agent) VALUES (?, ?, ?)").bind(user.id, ip, request.headers.get("User-Agent") || null).run();
    const { results: ms } = await env.DB.prepare("SELECT institution_id, role FROM ins_members WHERE user_id = ? AND active = 1 ORDER BY id").bind(user.id).all();
    for (const m of ms) await audit3(env, request, { inst: { id: m.institution_id }, user }, "auth", "user.login", "user", user.id, `Signed in as ${m.role}`);
    return json({ ok: true, has_institution: ms.length > 0, role: ms[0] ? ms[0].role : null }, { headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(login4, "login");
async function logout4({ request, env }) {
  try {
    const ctx = await getInstContext(request, env);
    if (ctx && ctx.inst) await audit3(env, request, ctx, "auth", "user.logout", "user", ctx.user.id, "Signed out");
  } catch (e) {
  }
  const header = request.headers.get("Cookie") || "";
  const match = header.match(/(?:^|;\s*)s21_session=([^;]+)/);
  if (match) await env.DB.prepare("DELETE FROM sessions WHERE token = ?").bind(match[1]).run();
  return json({ ok: true }, { headers: { "Set-Cookie": "s21_session=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0" } });
}
__name(logout4, "logout");
async function context3({ request, env }) {
  try {
    const ctx = await getInstContext(request, env);
    if (ctx.error) return ctx.error;
    const { results: memberships } = await env.DB.prepare(
      `SELECT i.id, i.name, m.role FROM ins_members m JOIN ins_institutions i ON i.id = m.institution_id
       WHERE m.user_id = ? AND m.active = 1 ORDER BY m.id`
    ).bind(ctx.user.id).all();
    const user = { id: ctx.user.id, name: ctx.user.name, email: ctx.user.email };
    if (!ctx.inst) return json({ user, institution: null, memberships });
    const settings = await getSettings4(env, ctx.inst.id);
    return json({
      user,
      institution: { ...ctx.inst, logo_key: void 0, has_logo: !!ctx.inst.logo_key },
      role: ctx.role,
      role_label: ROLE_LABELS[ctx.role],
      permissions: [...ctx.perms],
      memberships,
      student_id: ctx.studentId,
      staff_id: ctx.staffId,
      settings: { loan_days_student: settings.loan_days_student, max_renewals: settings.max_renewals, max_upload_mb: settings.max_upload_mb }
    });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(context3, "context");
var lookups3 = secure3(async ({ env, ctx }) => {
  const id = ctx.inst.id;
  const q = /* @__PURE__ */ __name((sql) => env.DB.prepare(sql).bind(id).all().then((r) => r.results), "q");
  const [departments, programmes, categories, resourceCategories, years, terms] = await Promise.all([
    q("SELECT id, name, code FROM ins_departments WHERE institution_id = ? AND active = 1 ORDER BY name"),
    q("SELECT id, name, code, department_id, level FROM ins_programmes WHERE institution_id = ? AND active = 1 ORDER BY name"),
    q("SELECT id, name FROM ins_categories WHERE institution_id = ? ORDER BY name"),
    q("SELECT id, name FROM ins_resource_categories WHERE institution_id = ? ORDER BY name"),
    q("SELECT id, name, is_current FROM ins_academic_years WHERE institution_id = ? ORDER BY name DESC"),
    q("SELECT id, name, academic_year_id, is_current FROM ins_terms WHERE institution_id = ? ORDER BY id DESC")
  ]);
  return json({ departments, programmes, categories, resource_categories: resourceCategories, academic_years: years, terms });
});
var getInstInfo = secure3({ perm: "settings.manage" }, async ({ env, ctx }) => {
  const settings = await getSettings4(env, ctx.inst.id);
  return json({ institution: ctx.inst, settings, types: TYPES3 });
});
var updateInstInfo = secure3({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Institution name", { required: true, max: 140, min: 2 });
  const short = V.str(b.short_name, "Short name", { required: true, max: 8 }).toUpperCase();
  const off = V.int(b.utc_offset_min, "Time zone", { min: -720, max: 840 });
  await env.DB.prepare(
    `UPDATE ins_institutions SET name = ?, short_name = ?, inst_type = ?, about = ?, phone = ?, email = ?, address = ?, website = ?,
       currency = ?, primary_color = COALESCE(?, primary_color), utc_offset_min = COALESCE(?, utc_offset_min), is_public = ? WHERE id = ?`
  ).bind(
    name,
    short,
    V.oneOf(b.inst_type, "Institution type", TYPES3, { def: ctx.inst.inst_type }),
    V.str(b.about, "About", { max: 800 }),
    V.phone(b.phone, "Phone"),
    V.email(b.email, "Email"),
    V.str(b.address, "Address", { max: 300 }),
    V.str(b.website, "Website", { max: 200 }),
    V.str(b.currency, "Currency", { max: 6, required: true }).toUpperCase(),
    V.color(b.primary_color, "Brand colour"),
    off,
    b.is_public ? 1 : 0,
    ctx.inst.id
  ).run();
  await audit3(env, request, ctx, "settings", "settings.institution", "institution", ctx.inst.id, "Institution information updated");
  return json({ ok: true });
});
var uploadLogo3 = secure3({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a logo image.");
  const key = await storeImage(env, form.get("logo"), `institution/${ctx.inst.id}/logo`);
  const old = ctx.inst.logo_key;
  await env.DB.prepare("UPDATE ins_institutions SET logo_key = ? WHERE id = ?").bind(key, ctx.inst.id).run();
  if (old && env.MATERIALS) await env.MATERIALS.delete(old).catch(() => {
  });
  await audit3(env, request, ctx, "settings", "settings.logo", "institution", ctx.inst.id, "Logo changed");
  return json({ ok: true });
});
async function publicLogo3({ params, env }) {
  const s = await env.DB.prepare("SELECT logo_key FROM ins_institutions WHERE id = ?").bind(params.id).first();
  if (!s || !s.logo_key) return new Response("Not found", { status: 404 });
  return imageResponse(env, s.logo_key);
}
__name(publicLogo3, "publicLogo");
var NUM_SETTINGS = {
  loan_days_student: [1, 365],
  loan_days_staff: [1, 365],
  max_loans_student: [1, 100],
  max_loans_staff: [1, 100],
  max_renewals: [0, 20],
  renewal_days: [1, 120],
  fine_per_day: [0, 1e9],
  lost_fine_multiplier: [0, 20],
  damaged_fine: [0, 1e9],
  reservation_hold_days: [1, 30],
  max_upload_mb: [1, 25]
};
var saveSettings3 = secure3({ perm: "settings.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const id = ctx.inst.id;
  for (const [k, [lo, hi]] of Object.entries(NUM_SETTINGS)) {
    if (b[k] !== void 0) await saveSetting3(env, id, k, V.num(b[k], k, { min: lo, max: hi, required: true }));
  }
  for (const k of ["student_prefix", "staff_prefix", "accession_prefix"]) {
    if (b[k] !== void 0) {
      const val = String(b[k] || "").trim();
      if (!/^[A-Za-z0-9]{1,8}$/.test(val)) fail(400, "Prefixes must be 1\u20138 letters or numbers.");
      await saveSetting3(env, id, k, val.toUpperCase());
    }
  }
  if (b.grading_scale !== void 0) {
    if (!Array.isArray(b.grading_scale) || b.grading_scale.length < 2 || b.grading_scale.length > 12) fail(400, "Add between 2 and 12 grades.");
    const scale = b.grading_scale.map((g) => ({ min: V.num(g.min, "Minimum marks", { required: true, min: 0, max: 100 }), grade: V.str(g.grade, "Grade", { required: true, max: 4 }), points: V.num(g.points, "Points", { min: 0, max: 100 }) ?? 0 }));
    if (!scale.some((g) => g.min === 0)) fail(400, "One grade must start at 0 marks so every mark has a grade.");
    await saveSetting3(env, id, "grading_scale", scale);
  }
  await audit3(env, request, ctx, "settings", "settings.update", "settings", null, Object.keys(b).join(", "));
  return json({ ok: true, settings: await getSettings4(env, id) });
});
var getPermissions3 = secure3({ perm: ["permissions.manage", "users.manage", "settings.manage"] }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare("SELECT role, permission FROM ins_role_permissions WHERE institution_id = ?").bind(ctx.inst.id).all();
  const matrix = { super_admin: ALL_PERMISSION_KEYS3 };
  ROLES4.filter((r) => r !== "super_admin").forEach((r) => {
    matrix[r] = [];
  });
  results.forEach((r) => {
    if (matrix[r.role]) matrix[r.role].push(r.permission);
  });
  return json({ catalogue: PERMISSIONS4, matrix, defaults: DEFAULT_ROLE_PERMISSIONS3, roles: ROLES4, labels: ROLE_LABELS });
});
var savePermissions3 = secure3({ perm: "permissions.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const role = V.oneOf(b.role, "Role", ROLES4.filter((r) => r !== "super_admin"), { required: true });
  const perms = [...new Set((b.permissions || []).map(String))];
  if (perms.some((p) => !ALL_PERMISSION_KEYS3.includes(p))) fail(400, "Unknown permission in the list.");
  await env.DB.batch([
    env.DB.prepare("DELETE FROM ins_role_permissions WHERE institution_id = ? AND role = ?").bind(ctx.inst.id, role),
    ...perms.map((p) => env.DB.prepare("INSERT INTO ins_role_permissions (institution_id, role, permission) VALUES (?, ?, ?)").bind(ctx.inst.id, role, p))
  ]);
  await audit3(env, request, ctx, "settings", "permissions.change", "role", null, `${role}: ${perms.length} permissions`);
  return json({ ok: true });
});
var listUsers4 = secure3({ perm: "users.manage" }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT m.id, m.role, m.active, m.student_id, m.staff_id, m.created_at, u.id AS user_id, u.name, u.email,
            (SELECT MAX(logged_in_at) FROM login_events le WHERE le.user_id = u.id) AS last_login
     FROM ins_members m JOIN users u ON u.id = m.user_id WHERE m.institution_id = ?
     ORDER BY CASE m.role WHEN 'super_admin' THEN 0 WHEN 'admin' THEN 1 ELSE 2 END, u.name`
  ).bind(ctx.inst.id).all();
  return json({ users: results, roles: ROLES4, labels: ROLE_LABELS });
});
var addUser3 = secure3({ perm: "users.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Full name", { required: true, max: 100 });
  const email = V.email(b.email, "Email", { required: true });
  const role = V.oneOf(b.role, "Role", ROLES4, { required: true });
  if (role === "super_admin" && ctx.role !== "super_admin") fail(403, "Only a Super Administrator can create another Super Administrator.");
  const studentId = V.int(b.student_id, "Student", { min: 1 });
  const staffId = V.int(b.staff_id, "Staff record", { min: 1 });
  if (role === "student") {
    if (!studentId) fail(400, "Choose which student record this login belongs to.");
    const s = await env.DB.prepare("SELECT id FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(studentId, ctx.inst.id).first();
    if (!s) fail(404, "The student record could not be found.");
  }
  if (staffId) {
    const s = await env.DB.prepare("SELECT id FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(staffId, ctx.inst.id).first();
    if (!s) fail(404, "The staff record could not be found.");
  }
  const existing = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
  let userId;
  let linked = false;
  if (existing) {
    userId = existing.id;
    linked = true;
    const m = await env.DB.prepare("SELECT id FROM ins_members WHERE institution_id = ? AND user_id = ?").bind(ctx.inst.id, userId).first();
    if (m) fail(409, "This person already has a login here.");
  } else {
    const { hash, salt } = await hashPassword(V.password(b.password, "Temporary password"));
    const r = await env.DB.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)").bind(name, email, hash, salt, "user").run();
    userId = r.meta.last_row_id;
  }
  await env.DB.prepare("INSERT INTO ins_members (institution_id, user_id, role, student_id, staff_id) VALUES (?, ?, ?, ?, ?)").bind(ctx.inst.id, userId, role, role === "student" ? studentId : null, role === "student" ? null : staffId).run();
  await audit3(env, request, ctx, "users", "user.create", "user", userId, `${email} as ${role}`);
  return json({ ok: true, user_id: userId, linked }, { status: 201 });
});
var updateUser3 = secure3({ perm: "users.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const m = await env.DB.prepare("SELECT * FROM ins_members WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (!m) fail(404, "User not found.");
  const role = b.role !== void 0 ? V.oneOf(b.role, "Role", ROLES4, { required: true }) : m.role;
  const active = b.active === void 0 ? m.active : b.active ? 1 : 0;
  if ((role === "super_admin" || m.role === "super_admin") && ctx.role !== "super_admin") fail(403, "Only a Super Administrator can change a Super Administrator.");
  if (m.role === "super_admin" && (role !== "super_admin" || !active)) {
    const others = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_members WHERE institution_id = ? AND role = 'super_admin' AND active = 1 AND id != ?`).bind(ctx.inst.id, m.id).first();
    if (!others.n) fail(400, "Your institution needs at least one active Super Administrator.");
  }
  if (m.user_id === ctx.user.id && !active) fail(400, "You cannot switch off your own login.");
  await env.DB.prepare("UPDATE ins_members SET role = ?, active = ? WHERE id = ?").bind(role, active, m.id).run();
  if (b.new_password) {
    const other = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_members WHERE user_id = ? AND institution_id != ?").bind(m.user_id, ctx.inst.id).first();
    if (other.n) fail(400, "This person also belongs to another institution, so only they can change their password.");
    const { hash, salt } = await hashPassword(V.password(b.new_password, "New password"));
    await env.DB.batch([
      env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, m.user_id),
      env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(m.user_id)
    ]);
  }
  await audit3(env, request, ctx, "users", m.role !== role ? "permissions.role_change" : "user.update", "user", m.user_id, `${m.role}\u2192${role}, active=${active}${b.new_password ? ", password reset" : ""}`);
  return json({ ok: true });
});
var AUDIENCES = ["public", "members", "staff", "students", "teachers"];
function audienceVisible(role) {
  if (["super_admin", "admin"].includes(role)) return AUDIENCES;
  if (role === "student") return ["public", "members", "students"];
  if (role === "teacher") return ["public", "members", "staff", "teachers"];
  return ["public", "members", "staff"];
}
__name(audienceVisible, "audienceVisible");
var listAnnouncements = secure3(async ({ env, url, ctx }) => {
  const today = localToday(ctx.off);
  const manage = can4(ctx, "announcements.manage");
  const vis = manage ? AUDIENCES : audienceVisible(ctx.role);
  const { page, limit, offset } = paging(url, 20, 50);
  const where = `institution_id = ? AND deleted_at IS NULL AND audience IN (${vis.map(() => "?").join(",")})${manage ? "" : " AND (expires_on IS NULL OR expires_on >= ?)"}`;
  const binds = [ctx.inst.id, ...vis, ...manage ? [] : [today]];
  const [{ results }, total] = await Promise.all([
    env.DB.prepare(`SELECT a.*, u.name AS author FROM ins_announcements a LEFT JOIN users u ON u.id = a.author_id WHERE ${where.replace(/institution_id/g, "a.institution_id").replace(/deleted_at/g, "a.deleted_at").replace(/audience/g, "a.audience").replace(/expires_on/g, "a.expires_on")} ORDER BY a.pinned DESC, a.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_announcements WHERE ${where}`).bind(...binds).first()
  ]);
  return json({ announcements: results, total: total.n, page, limit, today });
});
var createAnnouncement = secure3({ perm: "announcements.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const title = V.str(b.title, "Title", { required: true, max: 160, min: 3 });
  const body = V.str(b.body, "Message", { required: true, max: 4e3, min: 3 });
  const audience = V.oneOf(b.audience, "Audience", AUDIENCES, { def: "members" });
  const r = await env.DB.prepare("INSERT INTO ins_announcements (institution_id, title, body, audience, pinned, expires_on, author_id) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ctx.inst.id, title, body, audience, b.pinned ? 1 : 0, V.date(b.expires_on, "Expiry date"), ctx.user.id).run();
  const id = r.meta.last_row_id;
  if (audience !== "public") {
    const roles = { members: ROLES4, staff: ["super_admin", "admin", "librarian", "staff", "teacher"], students: ["student", "super_admin", "admin"], teachers: ["teacher", "super_admin", "admin"] }[audience];
    const { results } = await env.DB.prepare(`SELECT user_id FROM ins_members WHERE institution_id = ? AND active = 1 AND role IN (${roles.map(() => "?").join(",")}) LIMIT 500`).bind(ctx.inst.id, ...roles).all();
    for (const m of results) if (m.user_id !== ctx.user.id) await notify2(env, ctx.inst.id, m.user_id, "announcement", title, body.slice(0, 200), "#announcements");
  }
  await audit3(env, request, ctx, "announcements", "announcement.create", "announcement", id, title);
  return json({ ok: true, id }, { status: 201 });
});
var deleteAnnouncement = secure3({ perm: "announcements.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare(`UPDATE ins_announcements SET deleted_at = datetime('now') WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`).bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "The announcement could not be found.");
  await audit3(env, request, ctx, "announcements", "announcement.delete", "announcement", Number(params.id), null);
  return json({ ok: true });
});
var listNotifications3 = secure3(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare("SELECT id, kind, title, message, link, read_at, created_at FROM ins_notifications WHERE institution_id = ? AND user_id = ? ORDER BY id DESC LIMIT 40").bind(ctx.inst.id, ctx.user.id).all();
  const unread = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_notifications WHERE institution_id = ? AND user_id = ? AND read_at IS NULL").bind(ctx.inst.id, ctx.user.id).first();
  return json({ notifications: results, unread: unread.n });
});
var readNotifications = secure3(async ({ request, env, ctx }) => {
  const b = await request.json().catch(() => ({}));
  if (b && b.id) await env.DB.prepare(`UPDATE ins_notifications SET read_at = datetime('now') WHERE id = ? AND user_id = ? AND institution_id = ?`).bind(Number(b.id), ctx.user.id, ctx.inst.id).run();
  else await env.DB.prepare(`UPDATE ins_notifications SET read_at = datetime('now') WHERE user_id = ? AND institution_id = ? AND read_at IS NULL`).bind(ctx.user.id, ctx.inst.id).run();
  return json({ ok: true });
});
async function publicInfo({ params, env }) {
  const i = await env.DB.prepare("SELECT id, name, short_name, slug, inst_type, about, phone, email, address, website, primary_color, is_public, logo_key FROM ins_institutions WHERE slug = ?").bind(params.slug).first();
  if (!i) return json({ error: "This institution could not be found." }, { status: 404 });
  if (!i.is_public) return json({ error: "This institution has not made its catalogue public.", private: true, name: i.name }, { status: 403 });
  const today = localToday(180);
  const { results } = await env.DB.prepare(
    `SELECT id, title, body, created_at FROM ins_announcements WHERE institution_id = ? AND audience = 'public' AND deleted_at IS NULL AND (expires_on IS NULL OR expires_on >= ?) ORDER BY pinned DESC, id DESC LIMIT 10`
  ).bind(i.id, today).all();
  const counts = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM ins_books WHERE institution_id = ?1 AND deleted_at IS NULL AND archived = 0) AS books,
     (SELECT COUNT(*) FROM ins_resources WHERE institution_id = ?1 AND deleted_at IS NULL AND access_level = 'public') AS resources`).bind(i.id).first();
  const { logo_key, ...rest } = i;
  return json({ institution: { ...rest, has_logo: !!logo_key }, announcements: results, counts });
}
__name(publicInfo, "publicInfo");

// src/handlers/institution/library.js
init_auth();
init_institution_auth();
var COPY_STATS_JOIN = `LEFT JOIN (
    SELECT book_id, COUNT(*) AS total, SUM(status = 'available') AS avail, SUM(status = 'borrowed') AS borrowed,
           SUM(status = 'reserved') AS reserved, SUM(status = 'lost') AS lost, SUM(status = 'damaged') AS damaged, SUM(status = 'archived') AS archived
    FROM ins_book_copies WHERE institution_id = ?1 GROUP BY book_id
  ) cc ON cc.book_id = b.id`;
function availabilityOf(b) {
  const n2 = /* @__PURE__ */ __name((k) => Number(b[k] || 0), "n");
  if (b.archived) return "archived";
  if (n2("avail") > 0) return "available";
  if (n2("reserved") > 0) return "reserved";
  if (n2("borrowed") > 0) return "borrowed";
  if (n2("damaged") > 0) return "damaged";
  if (n2("lost") > 0) return "lost";
  if (n2("archived") > 0) return "archived";
  return "unavailable";
}
__name(availabilityOf, "availabilityOf");
function shapeBook(b, { staff = false } = {}) {
  const out = {
    id: b.id,
    isbn: b.isbn,
    title: b.title,
    author: b.author,
    publisher: b.publisher,
    pub_year: b.pub_year,
    edition: b.edition,
    category_id: b.category_id,
    category: b.category,
    subject: b.subject,
    language: b.language,
    description: b.description,
    shelf: b.shelf,
    classification_no: b.classification_no,
    has_cover: !!b.cover_key,
    archived: !!b.archived,
    copies: Number(b.total || 0),
    available: Number(b.avail || 0),
    borrowed: Number(b.borrowed || 0),
    reserved: Number(b.reserved || 0),
    lost: Number(b.lost || 0),
    damaged: Number(b.damaged || 0),
    archived_copies: Number(b.archived_copies ?? b.archived_c ?? 0),
    status: availabilityOf({ ...b, archived: b.archived })
  };
  if (staff) Object.assign(out, { acquisition_date: b.acquisition_date, acquisition_source: b.acquisition_source, price: b.price, notes: b.notes, created_at: b.created_at });
  return out;
}
__name(shapeBook, "shapeBook");
async function searchBooks(env, instId, url, { staff }) {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 12, 60);
  const where = ["b.institution_id = ?1", "b.deleted_at IS NULL"];
  const binds = [instId];
  const add = /* @__PURE__ */ __name((sql, ...v) => {
    let i = binds.length;
    where.push(sql.replace(/\?/g, () => `?${++i}`));
    binds.push(...v);
  }, "add");
  const q = (sp.get("q") || "").trim();
  const field = sp.get("field") || "all";
  if (q) {
    const like = likeTerm(q);
    const cols = {
      title: ["b.title"],
      author: ["b.author"],
      isbn: ["b.isbn"],
      publisher: ["b.publisher"],
      subject: ["b.subject"],
      category: ["cat.name"],
      all: ["b.title", "b.author", "b.isbn", "b.publisher", "b.subject", "cat.name", "b.classification_no"]
    }[field] || ["b.title"];
    if (field === "isbn") {
      const digits = q.replace(/[\s-]/g, "");
      add(`REPLACE(b.isbn, '-', '') LIKE ? ESCAPE '\\'`, likeTerm(digits));
    } else add(`(${cols.map((c) => `${c} LIKE ? ESCAPE '\\'`).join(" OR ")})`, ...cols.map(() => like));
  }
  if (sp.get("category_id")) add("b.category_id = ?", V.int(sp.get("category_id"), "Category", { min: 1 }));
  if (sp.get("language")) add("b.language = ? COLLATE NOCASE", V.str(sp.get("language"), "Language", { max: 40 }));
  if (sp.get("year_from")) add("b.pub_year >= ?", V.int(sp.get("year_from"), "Year from", { min: 0, max: 3e3 }));
  if (sp.get("year_to")) add("b.pub_year <= ?", V.int(sp.get("year_to"), "Year to", { min: 0, max: 3e3 }));
  if (!staff) where.push("b.archived = 0");
  else if (sp.get("archived") === "1") where.push("b.archived = 1");
  else if (sp.get("archived") !== "all") where.push("b.archived = 0");
  const st = sp.get("status");
  if (st) {
    const cond = {
      available: "COALESCE(cc.avail,0) > 0",
      reserved: "COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) > 0",
      borrowed: "COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) = 0 AND COALESCE(cc.borrowed,0) > 0",
      damaged: "COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) = 0 AND COALESCE(cc.borrowed,0) = 0 AND COALESCE(cc.damaged,0) > 0",
      lost: "COALESCE(cc.avail,0) = 0 AND COALESCE(cc.reserved,0) = 0 AND COALESCE(cc.borrowed,0) = 0 AND COALESCE(cc.damaged,0) = 0 AND COALESCE(cc.lost,0) > 0"
    }[st];
    if (!cond) fail(400, "Unknown availability filter.");
    where.push(cond);
  }
  const SORTS = { title: "b.title COLLATE NOCASE ASC", author: "b.author COLLATE NOCASE ASC", year: "b.pub_year DESC", year_asc: "b.pub_year ASC", recent: "b.id DESC" };
  const order = SORTS[sp.get("sort")] || SORTS.title;
  const base = `FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN} WHERE ${where.join(" AND ")}`;
  const [{ results }, count] = await Promise.all([
    env.DB.prepare(`SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first()
  ]);
  return { books: results.map((b) => shapeBook({ ...b, archived: b.archived }, { staff })), total: count.n, page, limit };
}
__name(searchBooks, "searchBooks");
var opac = secure3(async ({ env, url, ctx }) => {
  const r = await searchBooks(env, ctx.inst.id, url, { staff: can4(ctx, "books.manage") || can4(ctx, "books.view") });
  return json(r);
});
var opacBook = secure3(async ({ env, params, ctx }) => {
  const b = await env.DB.prepare(
    `SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c
     FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN}
     WHERE b.id = ?2 AND b.institution_id = ?1 AND b.deleted_at IS NULL AND b.archived = 0`
  ).bind(ctx.inst.id, params.id).first();
  if (!b) fail(404, "The book could not be found.");
  return json({ book: shapeBook(b) });
});
var suggest = secure3(async ({ env, url, ctx }) => {
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ suggestions: [] });
  const like = likeTerm(q);
  const { results } = await env.DB.prepare(
    `SELECT id, title, author FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND archived = 0 AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\') ORDER BY title LIMIT 6`
  ).bind(ctx.inst.id, like, like).all();
  return json({ suggestions: results });
});
async function loadInstBySlug(env, slug) {
  const i = await env.DB.prepare("SELECT id, is_public FROM ins_institutions WHERE slug = ?").bind(slug).first();
  if (!i) fail(404, "This institution could not be found.");
  if (!i.is_public) fail(403, "This institution has not made its catalogue public.");
  return i;
}
__name(loadInstBySlug, "loadInstBySlug");
async function publicOpac({ params, env, url }) {
  try {
    const i = await loadInstBySlug(env, params.slug);
    const r = await searchBooks(env, i.id, url, { staff: false });
    return json(r);
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicOpac, "publicOpac");
async function publicBook({ params, env }) {
  try {
    const i = await loadInstBySlug(env, params.slug);
    const b = await env.DB.prepare(
      `SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c
       FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN}
       WHERE b.id = ?2 AND b.institution_id = ?1 AND b.deleted_at IS NULL AND b.archived = 0`
    ).bind(i.id, params.id).first();
    if (!b) fail(404, "This book could not be found.");
    return json({ book: shapeBook(b) });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicBook, "publicBook");
async function publicResources({ params, env, url }) {
  try {
    const i = await loadInstBySlug(env, params.slug);
    const { page, limit, offset } = paging(url, 12, 50);
    const q = (url.searchParams.get("q") || "").trim();
    const like = likeTerm(q);
    const w = q ? `AND (r.title LIKE ? ESCAPE '\\' OR r.author LIKE ? ESCAPE '\\' OR r.subject LIKE ? ESCAPE '\\')` : "";
    const binds = q ? [i.id, like, like, like] : [i.id];
    const [{ results }, n2] = await Promise.all([
      env.DB.prepare(`SELECT r.id, r.title, r.author, r.description, r.res_type, r.allow_view, r.allow_download, r.file_size, c.name AS category FROM ins_resources r LEFT JOIN ins_resource_categories c ON c.id = r.category_id
        WHERE r.institution_id = ? AND r.deleted_at IS NULL AND r.access_level = 'public' ${w} ORDER BY r.title LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
      env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_resources r WHERE r.institution_id = ? AND r.deleted_at IS NULL AND r.access_level = 'public' ${w}`).bind(...binds).first()
    ]);
    return json({ resources: results, total: n2.n, page, limit });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicResources, "publicResources");
async function bookCover({ request, env, params }) {
  try {
    const b = await env.DB.prepare("SELECT b.cover_key, b.institution_id, i.is_public FROM ins_books b JOIN ins_institutions i ON i.id = b.institution_id WHERE b.id = ? AND b.deleted_at IS NULL").bind(params.id).first();
    if (!b || !b.cover_key) return new Response("Not found", { status: 404 });
    if (!b.is_public) {
      const ctx = await getInstContext(request, env);
      if (ctx.error || !ctx.inst || ctx.inst.id !== b.institution_id) return new Response("Not found", { status: 404 });
    }
    return imageResponse(env, b.cover_key);
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
__name(bookCover, "bookCover");
function cleanIsbn(v) {
  if (v == null || String(v).trim() === "") return null;
  const s = String(v).replace(/[\s-]/g, "").toUpperCase();
  if (!/^(\d{9}[\dX]|\d{13})$/.test(s)) fail(400, "ISBN must be 10 or 13 digits (hyphens are fine).");
  return s;
}
__name(cleanIsbn, "cleanIsbn");
function readBook(b) {
  const year = V.int(b.pub_year, "Publication year", { min: 1e3, max: (/* @__PURE__ */ new Date()).getUTCFullYear() + 1 });
  return {
    isbn: cleanIsbn(b.isbn),
    title: V.str(b.title, "Title", { required: true, max: 250, min: 1 }),
    author: V.str(b.author, "Author", { required: true, max: 200 }),
    publisher: V.str(b.publisher, "Publisher", { max: 160 }),
    pub_year: year,
    edition: V.str(b.edition, "Edition", { max: 60 }),
    category_id: V.int(b.category_id, "Category", { min: 1 }),
    subject: V.str(b.subject, "Subject", { max: 160 }),
    language: V.str(b.language, "Language", { max: 40 }),
    description: V.str(b.description, "Description", { max: 2e3 }),
    shelf: V.str(b.shelf, "Shelf / location", { max: 60 }),
    classification_no: V.str(b.classification_no, "Classification number", { max: 60 }),
    acquisition_date: V.date(b.acquisition_date, "Acquisition date"),
    acquisition_source: V.str(b.acquisition_source, "Acquisition source", { max: 160 }),
    price: V.num(b.price, "Price", { min: 0, max: 1e9 }),
    notes: V.str(b.notes, "Notes", { max: 1e3 })
  };
}
__name(readBook, "readBook");
async function assertCategory(env, instId, id) {
  if (!id) return;
  const c = await env.DB.prepare("SELECT id FROM ins_categories WHERE id = ? AND institution_id = ?").bind(id, instId).first();
  if (!c) fail(400, "That category does not exist.");
}
__name(assertCategory, "assertCategory");
async function allocAccessions(env, instId, prefix, n2) {
  const r = await env.DB.prepare(
    `SELECT COALESCE(MAX(CAST(SUBSTR(accession_no, ?) AS INTEGER)), 0) AS m FROM ins_book_copies WHERE institution_id = ? AND accession_no LIKE ?`
  ).bind(prefix.length + 2, instId, `${prefix}-%`).first();
  const start = (r?.m || 0) + 1;
  return Array.from({ length: n2 }, (_, i) => `${prefix}-${String(start + i).padStart(5, "0")}`);
}
__name(allocAccessions, "allocAccessions");
async function addCopies(env, ctx, bookId, n2, { status = "available" } = {}) {
  const settings = await getSettings4(env, ctx.inst.id);
  const nos = await allocAccessions(env, ctx.inst.id, settings.accession_prefix, n2);
  await env.DB.batch(nos.map((no) => env.DB.prepare("INSERT INTO ins_book_copies (institution_id, book_id, accession_no, barcode, status) VALUES (?, ?, ?, ?, ?)").bind(ctx.inst.id, bookId, no, no, status)));
  return nos;
}
__name(addCopies, "addCopies");
var getBook2 = secure3({ perm: ["books.view", "books.manage"] }, async ({ env, params, ctx }) => {
  const b = await env.DB.prepare(
    `SELECT b.*, cat.name AS category, cc.total, cc.avail, cc.borrowed, cc.reserved, cc.lost, cc.damaged, cc.archived AS archived_c
     FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id ${COPY_STATS_JOIN}
     WHERE b.id = ?2 AND b.institution_id = ?1 AND b.deleted_at IS NULL`
  ).bind(ctx.inst.id, params.id).first();
  if (!b) fail(404, "The book could not be found.");
  const [copies, loans, resv] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.accession_no, c.barcode, c.status, c.note,
        (SELECT l.due_date FROM ins_loans l WHERE l.copy_id = c.id AND l.status = 'borrowed' LIMIT 1) AS due_date,
        (SELECT l.id FROM ins_loans l WHERE l.copy_id = c.id AND l.status = 'borrowed' LIMIT 1) AS loan_id
      FROM ins_book_copies c WHERE c.book_id = ? AND c.institution_id = ? ORDER BY c.accession_no`).bind(b.id, ctx.inst.id).all().then((r) => r.results),
    env.DB.prepare(`SELECT l.id, l.issued_on, l.due_date, l.returned_on, l.status, l.borrower_type, l.borrower_id,
        CASE l.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = l.borrower_id) END AS borrower_name,
        c.accession_no FROM ins_loans l JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.book_id = ? AND l.institution_id = ? ORDER BY l.id DESC LIMIT 15`).bind(b.id, ctx.inst.id).all().then((r) => r.results),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_reservations WHERE book_id = ? AND institution_id = ? AND status IN ('waiting','ready')`).bind(b.id, ctx.inst.id).first()
  ]);
  return json({ book: shapeBook(b, { staff: true }), copy_list: copies, history: loans, reservations: resv.n });
});
var createBook2 = secure3({ perm: "books.manage" }, async ({ request, env, ctx }) => {
  const body = await readJson(request);
  const b = readBook(body);
  const copies = V.int(body.copies ?? 1, "Number of copies", { min: 1, max: 200 });
  await assertCategory(env, ctx.inst.id, b.category_id);
  if (b.isbn) {
    const dup = await env.DB.prepare("SELECT id, title FROM ins_books WHERE institution_id = ? AND isbn = ? AND deleted_at IS NULL").bind(ctx.inst.id, b.isbn).first();
    if (dup) throw new HttpError(409, `"${dup.title}" is already in the catalogue with this ISBN. Open it and add copies instead.`, { existing_id: dup.id });
  }
  const r = await env.DB.prepare(
    `INSERT INTO ins_books (institution_id, isbn, title, author, publisher, pub_year, edition, category_id, subject, language, description, shelf, classification_no, acquisition_date, acquisition_source, price, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, b.isbn, b.title, b.author, b.publisher, b.pub_year, b.edition, b.category_id, b.subject, b.language, b.description, b.shelf, b.classification_no, b.acquisition_date, b.acquisition_source, b.price, b.notes).run();
  const id = r.meta.last_row_id;
  const nos = await addCopies(env, ctx, id, copies);
  await audit3(env, request, ctx, "library", "book.create", "book", id, `${b.title} (${copies} cop${copies === 1 ? "y" : "ies"})`);
  return json({ ok: true, id, accession_nos: nos }, { status: 201 });
});
var updateBook2 = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT id FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The book could not be found.");
  const b = readBook(await readJson(request));
  await assertCategory(env, ctx.inst.id, b.category_id);
  if (b.isbn) {
    const dup = await env.DB.prepare("SELECT id, title FROM ins_books WHERE institution_id = ? AND isbn = ? AND id != ? AND deleted_at IS NULL").bind(ctx.inst.id, b.isbn, cur.id).first();
    if (dup) throw new HttpError(409, `"${dup.title}" already uses this ISBN.`, { existing_id: dup.id });
  }
  await env.DB.prepare(
    `UPDATE ins_books SET isbn=?, title=?, author=?, publisher=?, pub_year=?, edition=?, category_id=?, subject=?, language=?, description=?, shelf=?, classification_no=?,
       acquisition_date=?, acquisition_source=?, price=?, notes=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(
    b.isbn,
    b.title,
    b.author,
    b.publisher,
    b.pub_year,
    b.edition,
    b.category_id,
    b.subject,
    b.language,
    b.description,
    b.shelf,
    b.classification_no,
    b.acquisition_date,
    b.acquisition_source,
    b.price,
    b.notes,
    cur.id,
    ctx.inst.id
  ).run();
  await audit3(env, request, ctx, "library", "book.update", "book", cur.id, b.title);
  return json({ ok: true });
});
var archiveBook = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const r = await env.DB.prepare(`UPDATE ins_books SET archived = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`).bind(b.archived ? 1 : 0, params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "The book could not be found.");
  await audit3(env, request, ctx, "library", b.archived ? "book.archive" : "book.restore", "book", Number(params.id), null);
  return json({ ok: true });
});
var deleteBook2 = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const b = await env.DB.prepare("SELECT id, title FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!b) fail(404, "The book could not be found.");
  const active = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE book_id = ? AND status = 'borrowed'`).bind(b.id).first();
  if (active.n) fail(409, "This book still has copies on loan. Return them first, or archive the book instead.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE ins_books SET deleted_at = datetime('now') WHERE id = ?`).bind(b.id),
    env.DB.prepare(`UPDATE ins_reservations SET status = 'cancelled' WHERE book_id = ? AND status IN ('waiting','ready')`).bind(b.id)
  ]);
  await audit3(env, request, ctx, "library", "book.delete", "book", b.id, b.title);
  return json({ ok: true });
});
var uploadCover = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const b = await env.DB.prepare("SELECT id, cover_key FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!b) fail(404, "The book could not be found.");
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a cover image.");
  const key = await storeImage(env, form.get("cover"), `institution/${ctx.inst.id}/cover`);
  await env.DB.prepare(`UPDATE ins_books SET cover_key = ?, updated_at = datetime('now') WHERE id = ?`).bind(key, b.id).run();
  if (b.cover_key && env.MATERIALS) await env.MATERIALS.delete(b.cover_key).catch(() => {
  });
  await audit3(env, request, ctx, "library", "book.cover", "book", b.id, null);
  return json({ ok: true });
});
var addBookCopies = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const b = await env.DB.prepare("SELECT id, title FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!b) fail(404, "The book could not be found.");
  const n2 = V.int((await readJson(request)).count, "Number of copies", { required: true, min: 1, max: 200 });
  const nos = await addCopies(env, ctx, b.id, n2);
  await audit3(env, request, ctx, "library", "copy.add", "book", b.id, `${n2} copies added to ${b.title}`);
  return json({ ok: true, accession_nos: nos }, { status: 201 });
});
var setCopyStatus = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, "Status", ["available", "lost", "damaged", "archived"], { required: true });
  const c = await env.DB.prepare("SELECT * FROM ins_book_copies WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (!c) fail(404, "The copy could not be found.");
  if (c.status === "borrowed") fail(409, "This copy is on loan. Return it first.");
  if (c.status === "reserved" && status !== "available") {
    await env.DB.prepare(`UPDATE ins_reservations SET status = 'waiting', copy_id = NULL, hold_until = NULL WHERE copy_id = ? AND status = 'ready'`).bind(c.id).run();
  }
  await env.DB.prepare("UPDATE ins_book_copies SET status = ?, note = ? WHERE id = ?").bind(status, V.str(b.note, "Note", { max: 200 }), c.id).run();
  if (status === "available") await holdForWaiting(env, ctx, c.book_id, c.id);
  await audit3(env, request, ctx, "library", `copy.${status}`, "copy", c.id, c.accession_no);
  return json({ ok: true });
});
var listCategories3 = secure3(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, (SELECT COUNT(*) FROM ins_books b WHERE b.category_id = c.id AND b.deleted_at IS NULL) AS books FROM ins_categories c WHERE c.institution_id = ? ORDER BY c.name`
  ).bind(ctx.inst.id).all();
  return json({ categories: results });
});
var saveCategory2 = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const name = V.str((await readJson(request)).name, "Category name", { required: true, max: 60, min: 2 });
  const dup = await env.DB.prepare("SELECT id FROM ins_categories WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?").bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, "A category with this name already exists.");
  if (params.id) {
    const r = await env.DB.prepare("UPDATE ins_categories SET name = ? WHERE id = ? AND institution_id = ?").bind(name, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, "Category not found.");
  } else await env.DB.prepare("INSERT INTO ins_categories (institution_id, name) VALUES (?, ?)").bind(ctx.inst.id, name).run();
  await audit3(env, request, ctx, "library", "category.save", "category", Number(params.id) || null, name);
  return json({ ok: true });
});
var deleteCategory3 = secure3({ perm: "books.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM ins_categories WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Category not found.");
  await audit3(env, request, ctx, "library", "category.delete", "category", Number(params.id), null);
  return json({ ok: true });
});
async function loadBorrower(env, instId, type, id) {
  if (type === "student") {
    const s2 = await env.DB.prepare("SELECT id, student_no AS no, full_name, status FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(id, instId).first();
    if (!s2) fail(404, "The student record could not be found.");
    if (s2.status !== "active") fail(409, `${s2.full_name} is ${s2.status} and cannot borrow books.`);
    return s2;
  }
  const s = await env.DB.prepare("SELECT id, staff_no AS no, full_name, status FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(id, instId).first();
  if (!s) fail(404, "The staff record could not be found.");
  if (s.status === "left") fail(409, `${s.full_name} has left and cannot borrow books.`);
  return s;
}
__name(loadBorrower, "loadBorrower");
var searchBorrowers = secure3({ perm: ["loans.manage", "loans.view"] }, async ({ env, url, ctx }) => {
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ borrowers: [] });
  const like = likeTerm(q);
  const [st, sf] = await Promise.all([
    env.DB.prepare(`SELECT id, student_no AS no, full_name, class_name AS sub, status FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR student_no LIKE ? ESCAPE '\\' OR reg_no LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 8`).bind(ctx.inst.id, like, like, like).all(),
    env.DB.prepare(`SELECT id, staff_no AS no, full_name, position AS sub, status FROM ins_staff WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR staff_no LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 6`).bind(ctx.inst.id, like, like).all()
  ]);
  return json({ borrowers: [...st.results.map((r) => ({ ...r, type: "student" })), ...sf.results.map((r) => ({ ...r, type: "staff" }))] });
});
async function holdForWaiting(env, ctx, bookId, copyId) {
  const next = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE institution_id = ? AND book_id = ? AND status = 'waiting' ORDER BY id LIMIT 1`).bind(ctx.inst.id, bookId).first();
  if (!next) return false;
  const settings = await getSettings4(env, ctx.inst.id);
  const until = addDays3(localToday(ctx.off), settings.reservation_hold_days);
  const r = await env.DB.prepare(`UPDATE ins_book_copies SET status = 'reserved' WHERE id = ? AND status = 'available'`).bind(copyId).run();
  if (!r.meta.changes) return false;
  await env.DB.prepare(`UPDATE ins_reservations SET status = 'ready', copy_id = ?, hold_until = ? WHERE id = ?`).bind(copyId, until, next.id).run();
  const book = await env.DB.prepare("SELECT title FROM ins_books WHERE id = ?").bind(bookId).first();
  const uid = await userIdForBorrower(env, ctx.inst.id, next.borrower_type, next.borrower_id);
  if (uid) await notify2(env, ctx.inst.id, uid, "system", "Your reserved book is ready", `"${book?.title}" is waiting for you until ${until}.`, "#my-library");
  return true;
}
__name(holdForWaiting, "holdForWaiting");
async function sweep(env, ctx) {
  const today = localToday(ctx.off);
  const { results: expired } = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE institution_id = ? AND status = 'ready' AND hold_until < ?`).bind(ctx.inst.id, today).all();
  for (const r of expired) {
    await env.DB.prepare(`UPDATE ins_reservations SET status = 'expired' WHERE id = ?`).bind(r.id).run();
    if (r.copy_id) {
      await env.DB.prepare(`UPDATE ins_book_copies SET status = 'available' WHERE id = ? AND status = 'reserved'`).bind(r.copy_id).run();
      await holdForWaiting(env, ctx, r.book_id, r.copy_id);
    }
  }
  const { results: late } = await env.DB.prepare(
    `SELECT l.id, l.borrower_type, l.borrower_id, l.due_date, b.title FROM ins_loans l JOIN ins_books b ON b.id = l.book_id
     WHERE l.institution_id = ? AND l.status = 'borrowed' AND l.due_date < ? AND (l.overdue_notified_on IS NULL OR l.overdue_notified_on < ?) LIMIT 100`
  ).bind(ctx.inst.id, today, addDays3(today, -6)).all();
  for (const l of late) {
    const uid = await userIdForBorrower(env, ctx.inst.id, l.borrower_type, l.borrower_id);
    if (uid) await notify2(env, ctx.inst.id, uid, "overdue", "A book is overdue", `"${l.title}" was due on ${l.due_date}. Please return it to avoid more fines.`, "#my-library");
    await env.DB.prepare("UPDATE ins_loans SET overdue_notified_on = ? WHERE id = ?").bind(today, l.id).run();
  }
}
__name(sweep, "sweep");
var LOAN_SELECT = `SELECT l.id, l.book_id, l.copy_id, l.borrower_type, l.borrower_id, l.issued_on, l.due_date, l.returned_on, l.renewals, l.status, l.return_condition,
    b.title, b.author, c.accession_no,
    CASE l.borrower_type WHEN 'student' THEN s.full_name ELSE f.full_name END AS borrower_name,
    CASE l.borrower_type WHEN 'student' THEN s.student_no ELSE f.staff_no END AS borrower_no
  FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id
  LEFT JOIN ins_students s ON l.borrower_type = 'student' AND s.id = l.borrower_id
  LEFT JOIN ins_staff f ON l.borrower_type = 'staff' AND f.id = l.borrower_id`;
function decorateLoan(l, today, finePerDay) {
  const late = l.status === "borrowed" && l.due_date < today ? daysBetween(l.due_date, today) : 0;
  return { ...l, days_overdue: late, overdue: late > 0, due_today: l.status === "borrowed" && l.due_date === today, accrued_fine: round23(late * finePerDay) };
}
__name(decorateLoan, "decorateLoan");
var listLoans = secure3({ perm: "loans.view" }, async ({ env, url, ctx }) => {
  await sweep(env, ctx);
  const sp = url.searchParams;
  const today = localToday(ctx.off);
  const { page, limit, offset } = paging(url, 20, 100);
  const where = ["l.institution_id = ?1"];
  const binds = [ctx.inst.id];
  const add = /* @__PURE__ */ __name((sql, ...v) => {
    let i = binds.length;
    where.push(sql.replace(/\?/g, () => `?${++i}`));
    binds.push(...v);
  }, "add");
  const f = sp.get("filter") || "active";
  if (f === "active") where.push(`l.status = 'borrowed'`);
  else if (f === "overdue") add(`l.status = 'borrowed' AND l.due_date < ?`, today);
  else if (f === "due_today") add(`l.status = 'borrowed' AND l.due_date = ?`, today);
  else if (f === "returned") where.push(`l.status = 'returned'`);
  else if (f === "lost") where.push(`l.status = 'lost'`);
  else if (f !== "all") fail(400, "Unknown loan filter.");
  const q = (sp.get("q") || "").trim();
  if (q) {
    const like = likeTerm(q);
    add(`(b.title LIKE ? ESCAPE '\\' OR c.accession_no LIKE ? ESCAPE '\\' OR s.full_name LIKE ? ESCAPE '\\' OR f.full_name LIKE ? ESCAPE '\\' OR s.student_no LIKE ? ESCAPE '\\')`, like, like, like, like, like);
  }
  if (sp.get("borrower_id") && sp.get("borrower_type")) add("l.borrower_type = ? AND l.borrower_id = ?", V.oneOf(sp.get("borrower_type"), "Borrower type", ["student", "staff"], { required: true }), V.int(sp.get("borrower_id"), "Borrower", { min: 1 }));
  const settings = await getSettings4(env, ctx.inst.id);
  const from = `FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id LEFT JOIN ins_students s ON l.borrower_type = 'student' AND s.id = l.borrower_id LEFT JOIN ins_staff f ON l.borrower_type = 'staff' AND f.id = l.borrower_id WHERE ${where.join(" AND ")}`;
  const [{ results }, n2] = await Promise.all([
    env.DB.prepare(`${LOAN_SELECT} WHERE ${where.join(" AND ")} ORDER BY ${f === "returned" ? "l.returned_on DESC, l.id DESC" : "l.due_date ASC, l.id DESC"} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first()
  ]);
  return json({ loans: results.map((l) => decorateLoan(l, today, settings.fine_per_day)), total: n2.n, page, limit, today });
});
async function openLoansOf(env, instId, type, id) {
  const { results } = await env.DB.prepare(`SELECT id, book_id, due_date FROM ins_loans WHERE institution_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'borrowed'`).bind(instId, type, id).all();
  return results;
}
__name(openLoansOf, "openLoansOf");
var issueBook = secure3({ perm: "loans.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const type = V.oneOf(b.borrower_type, "Borrower type", ["student", "staff"], { required: true });
  const borrower = await loadBorrower(env, ctx.inst.id, type, V.int(b.borrower_id, "Borrower", { required: true, min: 1 }));
  const settings = await getSettings4(env, ctx.inst.id);
  const today = localToday(ctx.off);
  let copy;
  if (b.accession_no) {
    const code = String(b.accession_no).trim();
    copy = await env.DB.prepare("SELECT * FROM ins_book_copies WHERE institution_id = ? AND (accession_no = ? COLLATE NOCASE OR barcode = ? COLLATE NOCASE)").bind(ctx.inst.id, code, code).first();
    if (!copy) fail(404, `No copy found with the number "${code}".`);
  } else if (b.copy_id) {
    copy = await env.DB.prepare("SELECT * FROM ins_book_copies WHERE id = ? AND institution_id = ?").bind(V.int(b.copy_id, "Copy", { min: 1 }), ctx.inst.id).first();
    if (!copy) fail(404, "The copy could not be found.");
  } else if (b.book_id) {
    const bid2 = V.int(b.book_id, "Book", { required: true, min: 1 });
    copy = await env.DB.prepare(`SELECT c.* FROM ins_book_copies c WHERE c.book_id = ? AND c.institution_id = ? AND c.status = 'available' ORDER BY c.id LIMIT 1`).bind(bid2, ctx.inst.id).first();
    if (!copy) {
      copy = await env.DB.prepare(`SELECT c.* FROM ins_book_copies c JOIN ins_reservations r ON r.copy_id = c.id AND r.status = 'ready' AND r.borrower_type = ? AND r.borrower_id = ? WHERE c.book_id = ? AND c.institution_id = ? LIMIT 1`).bind(type, borrower.id, bid2, ctx.inst.id).first();
    }
    if (!copy) fail(409, "This book is currently unavailable.");
  } else fail(400, "Choose a book or enter a copy number.");
  const book = await env.DB.prepare("SELECT id, title, archived, deleted_at FROM ins_books WHERE id = ? AND institution_id = ?").bind(copy.book_id, ctx.inst.id).first();
  if (!book || book.deleted_at) fail(404, "The book could not be found.");
  if (book.archived) fail(409, "This book is archived and cannot be lent.");
  let heldFor = null;
  if (copy.status === "reserved") {
    heldFor = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE copy_id = ? AND status = 'ready'`).bind(copy.id).first();
    if (!heldFor || heldFor.borrower_type !== type || heldFor.borrower_id !== borrower.id) fail(409, "This copy is reserved for another borrower.");
  } else if (copy.status !== "available") fail(409, `This copy is ${copy.status} and cannot be issued.`);
  const open = await openLoansOf(env, ctx.inst.id, type, borrower.id);
  const max = type === "student" ? settings.max_loans_student : settings.max_loans_staff;
  if (open.length >= max) fail(409, `${borrower.full_name} already has ${open.length} books (the limit is ${max}). A book must be returned first.`);
  if (open.some((l) => l.due_date < today)) fail(409, `${borrower.full_name} has an overdue book. It must be returned before borrowing another.`);
  if (open.some((l) => l.book_id === book.id)) fail(409, `${borrower.full_name} already has a copy of this book.`);
  const unpaid = await env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS t FROM ins_fines WHERE institution_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'unpaid'`).bind(ctx.inst.id, type, borrower.id).first();
  if (unpaid.t > 0) fail(409, `${borrower.full_name} has unpaid fines of ${round23(unpaid.t)} ${ctx.inst.currency}. Please settle them first.`);
  const claim = await env.DB.prepare(`UPDATE ins_book_copies SET status = 'borrowed' WHERE id = ? AND status IN ('available','reserved')`).bind(copy.id).run();
  if (!claim.meta.changes) fail(409, "This copy was just issued to someone else.");
  const days = V.int(b.days, "Loan days", { min: 1, max: 365 }) || (type === "student" ? settings.loan_days_student : settings.loan_days_staff);
  const due = addDays3(today, days);
  const ins = await env.DB.prepare(
    `INSERT INTO ins_loans (institution_id, copy_id, book_id, borrower_type, borrower_id, issued_on, due_date, issued_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, copy.id, book.id, type, borrower.id, today, due, ctx.user.id).run();
  if (heldFor) await env.DB.prepare(`UPDATE ins_reservations SET status = 'fulfilled' WHERE id = ?`).bind(heldFor.id).run();
  else await env.DB.prepare(`UPDATE ins_reservations SET status = 'fulfilled' WHERE institution_id = ? AND book_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'waiting'`).bind(ctx.inst.id, book.id, type, borrower.id).run();
  const uid = await userIdForBorrower(env, ctx.inst.id, type, borrower.id);
  if (uid) await notify2(env, ctx.inst.id, uid, "system", "Book issued", `"${book.title}" is due on ${due}.`, "#my-library");
  await audit3(env, request, ctx, "library", "loan.issue", "loan", ins.meta.last_row_id, `${book.title} \u2192 ${borrower.full_name}, due ${due}`);
  return json({ ok: true, loan_id: ins.meta.last_row_id, due_date: due, borrower: borrower.full_name, title: book.title }, { status: 201 });
});
var returnBook = secure3({ perm: "loans.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const condition = V.oneOf(b.condition, "Condition", ["good", "damaged", "lost"], { def: "good" });
  let loan;
  if (b.loan_id) loan = await env.DB.prepare(`SELECT * FROM ins_loans WHERE id = ? AND institution_id = ? AND status = 'borrowed'`).bind(V.int(b.loan_id, "Loan", { min: 1 }), ctx.inst.id).first();
  else if (b.accession_no) {
    const code = String(b.accession_no).trim();
    loan = await env.DB.prepare(`SELECT l.* FROM ins_loans l JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.institution_id = ? AND l.status = 'borrowed' AND (c.accession_no = ? COLLATE NOCASE OR c.barcode = ? COLLATE NOCASE)`).bind(ctx.inst.id, code, code).first();
  } else fail(400, "Choose the loan or enter the copy number.");
  if (!loan) fail(404, "No active loan was found for this book.");
  const settings = await getSettings4(env, ctx.inst.id);
  const today = localToday(ctx.off);
  const book = await env.DB.prepare("SELECT id, title, price FROM ins_books WHERE id = ?").bind(loan.book_id).first();
  const lateDays = loan.due_date < today ? daysBetween(loan.due_date, today) : 0;
  const fines = [];
  if (lateDays > 0 && settings.fine_per_day > 0) fines.push({ reason: "overdue", amount: round23(lateDays * settings.fine_per_day), note: `${lateDays} day(s) late` });
  if (condition === "lost") fines.push({ reason: "lost", amount: round23(book.price > 0 ? book.price * settings.lost_fine_multiplier : settings.damaged_fine), note: "Lost book" });
  if (condition === "damaged" && settings.damaged_fine > 0) fines.push({ reason: "damaged", amount: round23(settings.damaged_fine), note: "Damaged on return" });
  const stmts = [
    env.DB.prepare(`UPDATE ins_loans SET status = ?, returned_on = ?, return_condition = ?, returned_by = ? WHERE id = ?`).bind(condition === "lost" ? "lost" : "returned", today, condition, ctx.user.id, loan.id),
    env.DB.prepare(`UPDATE ins_book_copies SET status = ? WHERE id = ?`).bind(condition === "good" ? "available" : condition, loan.copy_id),
    ...fines.filter((x) => x.amount > 0).map((x) => env.DB.prepare(`INSERT INTO ins_fines (institution_id, loan_id, borrower_type, borrower_id, reason, amount, note) VALUES (?, ?, ?, ?, ?, ?, ?)`).bind(ctx.inst.id, loan.id, loan.borrower_type, loan.borrower_id, x.reason, x.amount, x.note))
  ];
  await env.DB.batch(stmts);
  let heldForNext = false;
  if (condition === "good") heldForNext = await holdForWaiting(env, ctx, loan.book_id, loan.copy_id);
  const total = round23(fines.reduce((s, x) => s + x.amount, 0));
  const uid = await userIdForBorrower(env, ctx.inst.id, loan.borrower_type, loan.borrower_id);
  if (uid && total > 0) await notify2(env, ctx.inst.id, uid, "overdue", "A fine was added", `${total} ${ctx.inst.currency} for "${book.title}".`, "#my-library");
  await audit3(env, request, ctx, "library", condition === "lost" ? "loan.lost" : "loan.return", "loan", loan.id, `${book.title}, ${condition}${total ? `, fine ${total}` : ""}`);
  return json({ ok: true, fine: total, days_late: lateDays, held_for_next: heldForNext, title: book.title });
});
var renewLoan = secure3(async ({ request, env, params, ctx }) => {
  const loan = await env.DB.prepare(`SELECT * FROM ins_loans WHERE id = ? AND institution_id = ? AND status = 'borrowed'`).bind(params.id, ctx.inst.id).first();
  if (!loan) fail(404, "No active loan was found.");
  const own2 = loan.borrower_type === "student" && ctx.studentId === loan.borrower_id || loan.borrower_type === "staff" && ctx.staffId === loan.borrower_id;
  if (!can4(ctx, "loans.manage") && !own2) fail(403, "You do not have permission to perform this action.");
  const settings = await getSettings4(env, ctx.inst.id);
  const today = localToday(ctx.off);
  if (loan.renewals >= settings.max_renewals) fail(409, `This book has already been renewed ${loan.renewals} time(s), which is the limit.`);
  if (loan.due_date < today) fail(409, "This book is overdue. Please return it instead of renewing.");
  const waiting = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_reservations WHERE book_id = ? AND status IN ('waiting','ready')`).bind(loan.book_id).first();
  if (waiting.n) fail(409, "Someone is waiting for this book, so it cannot be renewed.");
  const due = addDays3(loan.due_date, settings.renewal_days);
  await env.DB.prepare("UPDATE ins_loans SET due_date = ?, renewals = renewals + 1 WHERE id = ?").bind(due, loan.id).run();
  await audit3(env, request, ctx, "library", "loan.renew", "loan", loan.id, `new due ${due}`);
  return json({ ok: true, due_date: due });
});
var listReservations = secure3({ perm: "loans.view" }, async ({ env, url, ctx }) => {
  await sweep(env, ctx);
  const st = url.searchParams.get("status") || "open";
  const cond = st === "open" ? `r.status IN ('waiting','ready')` : st === "all" ? "1=1" : `r.status = '${V.oneOf(st, "Status", ["waiting", "ready", "fulfilled", "cancelled", "expired"], { required: true })}'`;
  const { results } = await env.DB.prepare(
    `SELECT r.id, r.book_id, r.borrower_type, r.borrower_id, r.status, r.hold_until, r.created_at, b.title, b.author, c.accession_no,
       CASE r.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = r.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = r.borrower_id) END AS borrower_name
     FROM ins_reservations r JOIN ins_books b ON b.id = r.book_id LEFT JOIN ins_book_copies c ON c.id = r.copy_id
     WHERE r.institution_id = ? AND ${cond} ORDER BY r.id DESC LIMIT 100`
  ).bind(ctx.inst.id).all();
  return json({ reservations: results });
});
var createReservation = secure3(async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const bookId = V.int(b.book_id, "Book", { required: true, min: 1 });
  let type;
  let bid2;
  if (can4(ctx, "loans.manage") && b.borrower_id) {
    type = V.oneOf(b.borrower_type, "Borrower type", ["student", "staff"], { required: true });
    bid2 = V.int(b.borrower_id, "Borrower", { required: true, min: 1 });
  } else if (ctx.studentId) {
    type = "student";
    bid2 = ctx.studentId;
  } else if (ctx.staffId) {
    type = "staff";
    bid2 = ctx.staffId;
  } else fail(403, "Your login is not linked to a student or staff record, so you cannot reserve books. Please ask the librarian.");
  const borrower = await loadBorrower(env, ctx.inst.id, type, bid2);
  const book = await env.DB.prepare(`SELECT id, title FROM ins_books WHERE id = ? AND institution_id = ? AND deleted_at IS NULL AND archived = 0`).bind(bookId, ctx.inst.id).first();
  if (!book) fail(404, "The book could not be found.");
  const stats = await env.DB.prepare(`SELECT COUNT(*) AS total, SUM(status = 'available') AS avail FROM ins_book_copies WHERE book_id = ? AND institution_id = ? AND status != 'archived'`).bind(book.id, ctx.inst.id).first();
  if (!stats.total) fail(409, "This book is currently unavailable.");
  if (stats.avail > 0) fail(409, "This book is available on the shelf right now \u2014 no reservation is needed.");
  const loan = await env.DB.prepare(`SELECT id FROM ins_loans WHERE book_id = ? AND borrower_type = ? AND borrower_id = ? AND status = 'borrowed'`).bind(book.id, type, borrower.id).first();
  if (loan) fail(409, "This borrower already has this book.");
  const dup = await env.DB.prepare(`SELECT id FROM ins_reservations WHERE book_id = ? AND borrower_type = ? AND borrower_id = ? AND status IN ('waiting','ready')`).bind(book.id, type, borrower.id).first();
  if (dup) fail(409, "There is already a reservation for this book.");
  const r = await env.DB.prepare(`INSERT INTO ins_reservations (institution_id, book_id, borrower_type, borrower_id) VALUES (?, ?, ?, ?)`).bind(ctx.inst.id, book.id, type, borrower.id).run();
  await audit3(env, request, ctx, "library", "reservation.create", "reservation", r.meta.last_row_id, `${book.title} for ${borrower.full_name}`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var cancelReservation = secure3(async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare(`SELECT * FROM ins_reservations WHERE id = ? AND institution_id = ? AND status IN ('waiting','ready')`).bind(params.id, ctx.inst.id).first();
  if (!r) fail(404, "The reservation could not be found.");
  const own2 = r.borrower_type === "student" && ctx.studentId === r.borrower_id || r.borrower_type === "staff" && ctx.staffId === r.borrower_id;
  if (!can4(ctx, "loans.manage") && !own2) fail(403, "You do not have permission to perform this action.");
  await env.DB.prepare(`UPDATE ins_reservations SET status = 'cancelled' WHERE id = ?`).bind(r.id).run();
  if (r.status === "ready" && r.copy_id) {
    await env.DB.prepare(`UPDATE ins_book_copies SET status = 'available' WHERE id = ? AND status = 'reserved'`).bind(r.copy_id).run();
    await holdForWaiting(env, ctx, r.book_id, r.copy_id);
  }
  await audit3(env, request, ctx, "library", "reservation.cancel", "reservation", r.id, null);
  return json({ ok: true });
});
var listFines = secure3({ perm: ["fines.manage", "loans.view"] }, async ({ env, url, ctx }) => {
  const st = url.searchParams.get("status") || "unpaid";
  const cond = st === "all" ? "1=1" : `f.status = '${V.oneOf(st, "Status", ["unpaid", "paid", "waived"], { required: true })}'`;
  const { results } = await env.DB.prepare(
    `SELECT f.id, f.loan_id, f.borrower_type, f.borrower_id, f.reason, f.amount, f.status, f.note, f.created_at, f.settled_at,
       CASE f.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = f.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = f.borrower_id) END AS borrower_name,
       (SELECT b.title FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.id = f.loan_id) AS title
     FROM ins_fines f WHERE f.institution_id = ? AND ${cond} ORDER BY f.id DESC LIMIT 200`
  ).bind(ctx.inst.id).all();
  const totals = await env.DB.prepare(`SELECT COALESCE(SUM(CASE WHEN status='unpaid' THEN amount END),0) AS unpaid, COALESCE(SUM(CASE WHEN status='paid' THEN amount END),0) AS paid, COALESCE(SUM(CASE WHEN status='waived' THEN amount END),0) AS waived FROM ins_fines WHERE institution_id = ?`).bind(ctx.inst.id).first();
  return json({ fines: results, totals });
});
var settleFine = secure3({ perm: "fines.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const status = V.oneOf(b.status, "Action", ["paid", "waived"], { required: true });
  const r = await env.DB.prepare(`UPDATE ins_fines SET status = ?, settled_at = datetime('now'), settled_by = ? WHERE id = ? AND institution_id = ? AND status = 'unpaid'`).bind(status, ctx.user.id, params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "This fine could not be found or is already settled.");
  await audit3(env, request, ctx, "library", `fine.${status}`, "fine", Number(params.id), null);
  return json({ ok: true });
});
var myLibrary = secure3(async ({ env, ctx }) => {
  const type = ctx.studentId ? "student" : ctx.staffId ? "staff" : null;
  const id = ctx.studentId || ctx.staffId;
  if (!type) return json({ linked: false, loans: [], reservations: [], fines: [], history: [] });
  await sweep(env, ctx);
  const today = localToday(ctx.off);
  const settings = await getSettings4(env, ctx.inst.id);
  const [{ results: loans }, { results: hist }, { results: resv }, { results: fines }] = await Promise.all([
    env.DB.prepare(`${LOAN_SELECT} WHERE l.institution_id = ? AND l.borrower_type = ? AND l.borrower_id = ? AND l.status = 'borrowed' ORDER BY l.due_date`).bind(ctx.inst.id, type, id).all(),
    env.DB.prepare(`${LOAN_SELECT} WHERE l.institution_id = ? AND l.borrower_type = ? AND l.borrower_id = ? AND l.status != 'borrowed' ORDER BY l.id DESC LIMIT 50`).bind(ctx.inst.id, type, id).all(),
    env.DB.prepare(`SELECT r.id, r.status, r.hold_until, r.created_at, b.title, b.author FROM ins_reservations r JOIN ins_books b ON b.id = r.book_id WHERE r.institution_id = ? AND r.borrower_type = ? AND r.borrower_id = ? AND r.status IN ('waiting','ready') ORDER BY r.id DESC`).bind(ctx.inst.id, type, id).all(),
    env.DB.prepare(`SELECT id, reason, amount, status, note, created_at FROM ins_fines WHERE institution_id = ? AND borrower_type = ? AND borrower_id = ? ORDER BY id DESC LIMIT 50`).bind(ctx.inst.id, type, id).all()
  ]);
  return json({ linked: true, type, loans: loans.map((l) => decorateLoan(l, today, settings.fine_per_day)), history: hist, reservations: resv, fines, today });
});

// src/handlers/institution/elibrary.js
init_auth();
init_institution_auth();
var TYPES4 = ["ebook", "document", "journal", "notes", "research", "publication", "other"];
var LEVELS = ["public", "members", "staff"];
var isPK = /* @__PURE__ */ __name((b) => b[0] === 80 && b[1] === 75 && (b[2] === 3 || b[2] === 5), "isPK");
var isOle = /* @__PURE__ */ __name((b) => b[0] === 208 && b[1] === 207 && b[2] === 17 && b[3] === 224, "isOle");
var isText = /* @__PURE__ */ __name((b) => {
  for (let i = 0; i < b.length; i++) if (b[i] === 0) return false;
  return true;
}, "isText");
var FILE_TYPES = {
  pdf: { mime: "application/pdf", ok: /* @__PURE__ */ __name((b) => b[0] === 37 && b[1] === 80 && b[2] === 68 && b[3] === 70, "ok"), inline: true },
  epub: { mime: "application/epub+zip", ok: isPK },
  docx: { mime: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", ok: isPK },
  xlsx: { mime: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", ok: isPK },
  pptx: { mime: "application/vnd.openxmlformats-officedocument.presentationml.presentation", ok: isPK },
  doc: { mime: "application/msword", ok: isOle },
  xls: { mime: "application/vnd.ms-excel", ok: isOle },
  ppt: { mime: "application/vnd.ms-powerpoint", ok: isOle },
  txt: { mime: "text/plain; charset=utf-8", ok: isText, inline: true },
  png: { mime: "image/png", ok: /* @__PURE__ */ __name((b) => b[0] === 137 && b[1] === 80 && b[2] === 78 && b[3] === 71, "ok"), inline: true },
  jpg: { mime: "image/jpeg", ok: /* @__PURE__ */ __name((b) => b[0] === 255 && b[1] === 216 && b[2] === 255, "ok"), inline: true },
  jpeg: { mime: "image/jpeg", ok: /* @__PURE__ */ __name((b) => b[0] === 255 && b[1] === 216 && b[2] === 255, "ok"), inline: true }
};
async function readUpload(env, ctx, file) {
  if (!env.MATERIALS) fail(500, "File storage is not configured.");
  if (!file || typeof file === "string" || !file.size) fail(400, "Please choose a file to upload.");
  const settings = await getSettings4(env, ctx.inst.id);
  const maxMb = Math.min(25, settings.max_upload_mb || 20);
  if (file.size > maxMb * 1024 * 1024) fail(400, `The file is too large (${maxMb} MB maximum).`);
  const name = String(file.name || "file").replace(/[^\w.\- ()]/g, "_").slice(0, 120);
  const ext = (name.split(".").pop() || "").toLowerCase();
  const def = FILE_TYPES[ext];
  if (!def) fail(400, "The file type is not supported. Use PDF, Word, Excel, PowerPoint, EPUB, TXT, PNG or JPG.");
  const buf = await file.arrayBuffer();
  if (!def.ok(new Uint8Array(buf.slice(0, 4096)))) fail(400, "The file type is not supported (the file content does not match its extension).");
  const key = `institution/${ctx.inst.id}/resources/${crypto.randomUUID()}.${ext}`;
  await env.MATERIALS.put(key, buf, { httpMetadata: { contentType: def.mime } });
  return { key, name, size: file.size, mime: def.mime };
}
__name(readUpload, "readUpload");
function readMeta(b) {
  return {
    title: V.str(b.title, "Title", { required: true, max: 250, min: 2 }),
    author: V.str(b.author, "Author", { max: 200 }),
    description: V.str(b.description, "Description", { max: 2e3 }),
    category_id: V.int(b.category_id, "Category", { min: 1 }),
    subject: V.str(b.subject, "Subject", { max: 160 }),
    res_type: V.oneOf(b.res_type, "Type", TYPES4, { def: "document" }),
    access_level: V.oneOf(b.access_level, "Access level", LEVELS, { def: "members" }),
    allow_view: b.allow_view === void 0 || b.allow_view === "" ? 1 : String(b.allow_view) === "0" || b.allow_view === false ? 0 : 1,
    allow_download: b.allow_download === void 0 || b.allow_download === "" ? 1 : String(b.allow_download) === "0" || b.allow_download === false ? 0 : 1
  };
}
__name(readMeta, "readMeta");
async function assertResCategory(env, instId, id) {
  if (!id) return;
  const c = await env.DB.prepare("SELECT id FROM ins_resource_categories WHERE id = ? AND institution_id = ?").bind(id, instId).first();
  if (!c) fail(400, "That category does not exist.");
}
__name(assertResCategory, "assertResCategory");
var visibleLevels = /* @__PURE__ */ __name((ctx) => can4(ctx, "resources.manage") || ctx.role !== "student" ? LEVELS : ["public", "members"], "visibleLevels");
var levelAllowed = /* @__PURE__ */ __name((ctx, level) => level === "public" || (can4(ctx, "resources.view") || can4(ctx, "resources.manage")) && visibleLevels(ctx).includes(level), "levelAllowed");
var listCols = `r.id, r.title, r.author, r.description, r.subject, r.res_type, r.access_level, r.allow_view, r.allow_download, r.file_name, r.file_size, r.mime,
  r.views, r.downloads, r.created_at, r.category_id, (r.thumb_key IS NOT NULL) AS has_thumb, c.name AS category`;
var listResources = secure3({ perm: ["resources.view", "resources.manage"] }, async ({ env, url, ctx }) => {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 12, 60);
  const lv = visibleLevels(ctx);
  const where = [`r.institution_id = ?1`, "r.deleted_at IS NULL", `r.access_level IN (${lv.map((_, i) => `?${i + 2}`).join(",")})`];
  const binds = [ctx.inst.id, ...lv];
  const add = /* @__PURE__ */ __name((sql, v) => {
    where.push(sql.replace("?", `?${binds.length + 1}`));
    binds.push(v);
  }, "add");
  const q = (sp.get("q") || "").trim();
  if (q) {
    const like = likeTerm(q);
    where.push(`(r.title LIKE ?${binds.length + 1} ESCAPE '\\' OR r.author LIKE ?${binds.length + 1} ESCAPE '\\' OR r.subject LIKE ?${binds.length + 1} ESCAPE '\\' OR r.description LIKE ?${binds.length + 1} ESCAPE '\\')`);
    binds.push(like);
  }
  if (sp.get("category_id")) add("r.category_id = ?", V.int(sp.get("category_id"), "Category", { min: 1 }));
  if (sp.get("type")) add("r.res_type = ?", V.oneOf(sp.get("type"), "Type", TYPES4, { required: true }));
  const SORTS = { title: "r.title COLLATE NOCASE", recent: "r.id DESC", popular: "r.views + r.downloads DESC" };
  const order = SORTS[sp.get("sort")] || SORTS.recent;
  const base = `FROM ins_resources r LEFT JOIN ins_resource_categories c ON c.id = r.category_id WHERE ${where.join(" AND ")}`;
  const [{ results }, n2] = await Promise.all([
    env.DB.prepare(`SELECT ${listCols} ${base} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${base}`).bind(...binds).first()
  ]);
  return json({ resources: results, total: n2.n, page, limit });
});
var uploadResource = secure3({ perm: "resources.manage" }, async ({ request, env, ctx }) => {
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a file to upload.");
  const meta = readMeta(Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string")));
  await assertResCategory(env, ctx.inst.id, meta.category_id);
  const up = await readUpload(env, ctx, form.get("file"));
  let thumb = null;
  const t = form.get("thumbnail");
  if (t && typeof t !== "string" && t.size) {
    try {
      thumb = await storeImage(env, t, `institution/${ctx.inst.id}/thumb`);
    } catch (e) {
      await env.MATERIALS.delete(up.key).catch(() => {
      });
      throw e;
    }
  }
  const r = await env.DB.prepare(
    `INSERT INTO ins_resources (institution_id, title, author, description, category_id, subject, res_type, file_key, file_name, file_size, mime, thumb_key, access_level, allow_view, allow_download, uploaded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, meta.title, meta.author, meta.description, meta.category_id, meta.subject, meta.res_type, up.key, up.name, up.size, up.mime, thumb, meta.access_level, meta.allow_view, meta.allow_download, ctx.user.id).run();
  await audit3(env, request, ctx, "elibrary", "file.upload", "resource", r.meta.last_row_id, `${meta.title} (${up.name})`);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updateResource = secure3({ perm: "resources.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT * FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The resource could not be found.");
  const ct = request.headers.get("Content-Type") || "";
  let fields;
  let form = null;
  if (ct.includes("multipart/form-data")) {
    form = await request.formData();
    fields = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string"));
  } else fields = await readJson(request);
  const meta = readMeta(fields);
  await assertResCategory(env, ctx.inst.id, meta.category_id);
  let file = { key: cur.file_key, name: cur.file_name, size: cur.file_size, mime: cur.mime };
  const f = form && form.get("file");
  if (f && typeof f !== "string" && f.size) file = await readUpload(env, ctx, f);
  let thumb = cur.thumb_key;
  const t = form && form.get("thumbnail");
  if (t && typeof t !== "string" && t.size) thumb = await storeImage(env, t, `institution/${ctx.inst.id}/thumb`);
  await env.DB.prepare(
    `UPDATE ins_resources SET title=?, author=?, description=?, category_id=?, subject=?, res_type=?, access_level=?, allow_view=?, allow_download=?,
       file_key=?, file_name=?, file_size=?, mime=?, thumb_key=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(
    meta.title,
    meta.author,
    meta.description,
    meta.category_id,
    meta.subject,
    meta.res_type,
    meta.access_level,
    meta.allow_view,
    meta.allow_download,
    file.key,
    file.name,
    file.size,
    file.mime,
    thumb,
    cur.id,
    ctx.inst.id
  ).run();
  if (file.key !== cur.file_key && env.MATERIALS) await env.MATERIALS.delete(cur.file_key).catch(() => {
  });
  if (thumb !== cur.thumb_key && cur.thumb_key && env.MATERIALS) await env.MATERIALS.delete(cur.thumb_key).catch(() => {
  });
  await audit3(env, request, ctx, "elibrary", file.key !== cur.file_key ? "file.replace" : "file.update", "resource", cur.id, meta.title);
  return json({ ok: true });
});
var deleteResource = secure3({ perm: "resources.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT * FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The resource could not be found.");
  await env.DB.prepare(`UPDATE ins_resources SET deleted_at = datetime('now') WHERE id = ?`).bind(cur.id).run();
  if (env.MATERIALS) {
    await env.MATERIALS.delete(cur.file_key).catch(() => {
    });
    if (cur.thumb_key) await env.MATERIALS.delete(cur.thumb_key).catch(() => {
    });
  }
  await audit3(env, request, ctx, "elibrary", "file.delete", "resource", cur.id, cur.title);
  return json({ ok: true });
});
var listResourceCategories = secure3(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT c.id, c.name, (SELECT COUNT(*) FROM ins_resources r WHERE r.category_id = c.id AND r.deleted_at IS NULL) AS items FROM ins_resource_categories c WHERE c.institution_id = ? ORDER BY c.name`
  ).bind(ctx.inst.id).all();
  return json({ categories: results });
});
var saveResourceCategory = secure3({ perm: "resources.manage" }, async ({ request, env, params, ctx }) => {
  const name = V.str((await readJson(request)).name, "Category name", { required: true, max: 60, min: 2 });
  const dup = await env.DB.prepare("SELECT id FROM ins_resource_categories WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?").bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, "A category with this name already exists.");
  if (params.id) {
    const r = await env.DB.prepare("UPDATE ins_resource_categories SET name = ? WHERE id = ? AND institution_id = ?").bind(name, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, "Category not found.");
  } else await env.DB.prepare("INSERT INTO ins_resource_categories (institution_id, name) VALUES (?, ?)").bind(ctx.inst.id, name).run();
  await audit3(env, request, ctx, "elibrary", "category.save", "category", Number(params.id) || null, name);
  return json({ ok: true });
});
var deleteResourceCategory = secure3({ perm: "resources.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM ins_resource_categories WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Category not found.");
  await audit3(env, request, ctx, "elibrary", "category.delete", "category", Number(params.id), null);
  return json({ ok: true });
});
function fileResponse(obj, r, mode) {
  const def = FILE_TYPES[(r.file_name.split(".").pop() || "").toLowerCase()] || {};
  const inline = mode === "view" && def.inline;
  const safeName = r.file_name.replace(/[^\w.\- ()]/g, "_");
  return new Response(obj.body, {
    headers: {
      "Content-Type": r.mime,
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${safeName}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": "sandbox; default-src 'none'; style-src 'unsafe-inline'; img-src data:; object-src 'self'",
      "Referrer-Policy": "no-referrer"
    }
  });
}
__name(fileResponse, "fileResponse");
async function serve(env, request, r, mode, ctx) {
  const manager = ctx && can4(ctx, "resources.manage");
  if (!manager) {
    if (mode === "download" && !r.allow_download) fail(403, "Downloading is not allowed for this resource.");
    if (mode === "view" && !r.allow_view) fail(403, "Viewing online is not allowed for this resource.");
  }
  const obj = env.MATERIALS ? await env.MATERIALS.get(r.file_key) : null;
  if (!obj) fail(404, "The file could not be found. Please tell the librarian.");
  await env.DB.prepare(`UPDATE ins_resources SET ${mode === "view" ? "views" : "downloads"} = ${mode === "view" ? "views" : "downloads"} + 1 WHERE id = ?`).bind(r.id).run();
  if (ctx) await audit3(env, request, ctx, "elibrary", mode === "view" ? "file.view" : "file.download", "resource", r.id, r.title);
  return fileResponse(obj, r, mode);
}
__name(serve, "serve");
async function resourceFile({ request, env, params, url }) {
  try {
    const ctx = await getInstContext(request, env);
    if (ctx.error) return ctx.error;
    if (!ctx.inst) fail(403, "You are not part of an institution yet.");
    const r = await env.DB.prepare("SELECT * FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
    if (!r || !levelAllowed(ctx, r.access_level)) fail(404, "The resource could not be found.");
    const mode = url.searchParams.get("mode") === "view" ? "view" : "download";
    return await serve(env, request, r, mode, ctx);
  } catch (e) {
    return errorResponse(e);
  }
}
__name(resourceFile, "resourceFile");
async function publicResourceFile({ request, env, params, url }) {
  try {
    const r = await env.DB.prepare(
      `SELECT r.* FROM ins_resources r JOIN ins_institutions i ON i.id = r.institution_id
       WHERE r.id = ? AND i.slug = ? AND i.is_public = 1 AND r.access_level = 'public' AND r.deleted_at IS NULL`
    ).bind(params.id, params.slug).first();
    if (!r) fail(404, "The resource could not be found.");
    const mode = url.searchParams.get("mode") === "view" ? "view" : "download";
    return await serve(env, request, r, mode, null);
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicResourceFile, "publicResourceFile");
async function resourceThumb({ request, env, params }) {
  try {
    const r = await env.DB.prepare(
      `SELECT r.thumb_key, r.institution_id, r.access_level, i.is_public FROM ins_resources r JOIN ins_institutions i ON i.id = r.institution_id WHERE r.id = ? AND r.deleted_at IS NULL`
    ).bind(params.id).first();
    if (!r || !r.thumb_key) return new Response("Not found", { status: 404 });
    if (!(r.access_level === "public" && r.is_public)) {
      const ctx = await getInstContext(request, env);
      if (ctx.error || !ctx.inst || ctx.inst.id !== r.institution_id || !levelAllowed(ctx, r.access_level)) return new Response("Not found", { status: 404 });
    }
    return imageResponse(env, r.thumb_key);
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}
__name(resourceThumb, "resourceThumb");
var pageNo = /* @__PURE__ */ __name((v, label2) => {
  if (v == null || v === "") return null;
  const n2 = Math.floor(Number(v));
  if (!Number.isFinite(n2) || n2 < 1 || n2 > 1e5) fail(400, `${label2} must be a number from 1 to 100000.`);
  return n2;
}, "pageNo");
var READ_PERM = ["resources.view", "resources.manage"];
var myReading = secure3({ perm: READ_PERM }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT p.resource_id, p.last_page, p.total_pages, p.status, p.opened_count, p.last_opened_at, r.title, r.author, r.file_name, r.access_level, r.allow_view, (r.thumb_key IS NOT NULL) AS has_thumb
     FROM ins_reading_progress p JOIN ins_resources r ON r.id = p.resource_id AND r.institution_id = p.institution_id
     WHERE p.institution_id = ? AND p.user_id = ? AND r.deleted_at IS NULL ORDER BY p.last_opened_at DESC LIMIT 100`
  ).bind(ctx.inst.id, ctx.user.id).all();
  return json({ items: results.filter((r) => levelAllowed(ctx, r.access_level)) });
});
var saveReading = secure3({ perm: READ_PERM }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const r = await env.DB.prepare("SELECT id, access_level FROM ins_resources WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(Number(params.id), ctx.inst.id).first();
  if (!r || !levelAllowed(ctx, r.access_level)) fail(404, "The resource could not be found.");
  const page = pageNo(b.page, "Page");
  const total = pageNo(b.total_pages, "Total pages");
  if (page && total && page > total) fail(400, "The page you are on cannot be more than the total number of pages.");
  const status = b.status == null ? null : ["reading", "finished"].includes(b.status) ? b.status : fail(400, "Status must be reading or finished.");
  const open = b.open ? 1 : 0;
  await env.DB.prepare(
    `INSERT INTO ins_reading_progress (institution_id, user_id, resource_id, last_page, total_pages, status, opened_count)
     VALUES (?1, ?2, ?3, COALESCE(?4, 1), ?5, COALESCE(?6, 'reading'), ?7)
     ON CONFLICT(user_id, resource_id) DO UPDATE SET
       last_page = COALESCE(?4, last_page), total_pages = COALESCE(?5, total_pages), status = COALESCE(?6, status),
       opened_count = opened_count + ?7, last_opened_at = datetime('now'), updated_at = datetime('now')`
  ).bind(ctx.inst.id, ctx.user.id, r.id, page, total, status, open).run();
  const row = await env.DB.prepare("SELECT resource_id, last_page, total_pages, status, opened_count, last_opened_at FROM ins_reading_progress WHERE user_id = ? AND resource_id = ?").bind(ctx.user.id, r.id).first();
  return json({ ok: true, progress: row });
});
var deleteReading = secure3({ perm: READ_PERM }, async ({ env, params, ctx }) => {
  await env.DB.prepare("DELETE FROM ins_reading_progress WHERE user_id = ? AND resource_id = ? AND institution_id = ?").bind(ctx.user.id, Number(params.id), ctx.inst.id).run();
  return json({ ok: true });
});

// src/handlers/institution/people.js
init_auth();
init_institution_auth();
async function teacherStudentScope(env, ctx) {
  if (ctx.role !== "teacher") return null;
  if (!ctx.staffId) return { sql: "1 = 0", binds: [] };
  return { sql: `s.id IN (SELECT e.student_id FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id AND t.institution_id = e.institution_id WHERE t.staff_id = ? AND e.institution_id = ?)`, binds: [ctx.staffId, ctx.inst.id] };
}
__name(teacherStudentScope, "teacherStudentScope");
var STUDENT_STATUS = ["active", "suspended", "graduated", "withdrawn"];
var STAFF_STATUS = ["active", "on_leave", "left"];
var GENDERS = ["male", "female", "other"];
async function fk(env, table, instId, id, label2) {
  if (!id) return;
  const r = await env.DB.prepare(`SELECT id FROM ${table} WHERE id = ? AND institution_id = ?`).bind(id, instId).first();
  if (!r) fail(400, `That ${label2} does not exist.`);
}
__name(fk, "fk");
var STUDENT_LIST = `SELECT s.id, s.student_no, s.reg_no, s.full_name, s.gender, s.phone, s.email, s.class_name, s.level, s.status, (s.photo_key IS NOT NULL) AS has_photo,
  p.name AS programme, d.name AS department, s.programme_id, s.department_id
  FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id`;
var listStudents2 = secure3({ perm: "students.view" }, async ({ env, url, ctx }) => {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 20, 100);
  const where = ["s.institution_id = ?1", "s.deleted_at IS NULL"];
  const binds = [ctx.inst.id];
  const add = /* @__PURE__ */ __name((sql, ...v) => {
    let i = binds.length;
    where.push(sql.replace(/\?/g, () => `?${++i}`));
    binds.push(...v);
  }, "add");
  const q = (sp.get("q") || "").trim();
  if (q) {
    const like = likeTerm(q);
    add(`(s.full_name LIKE ? ESCAPE '\\' OR s.student_no LIKE ? ESCAPE '\\' OR s.reg_no LIKE ? ESCAPE '\\' OR s.phone LIKE ? ESCAPE '\\' OR s.email LIKE ? ESCAPE '\\')`, like, like, like, like, like);
  }
  if (sp.get("programme_id")) add("s.programme_id = ?", V.int(sp.get("programme_id"), "Programme", { min: 1 }));
  if (sp.get("department_id")) add("s.department_id = ?", V.int(sp.get("department_id"), "Department", { min: 1 }));
  if (sp.get("status")) add("s.status = ?", V.oneOf(sp.get("status"), "Status", STUDENT_STATUS, { required: true }));
  if (sp.get("class_name")) add("s.class_name = ?", V.str(sp.get("class_name"), "Class", { max: 60 }));
  const scope = await teacherStudentScope(env, ctx);
  if (scope) add(scope.sql, ...scope.binds);
  const SORTS = { name: "s.full_name COLLATE NOCASE", no: "s.student_no", recent: "s.id DESC" };
  const order = SORTS[sp.get("sort")] || SORTS.name;
  const from = `FROM ins_students s WHERE ${where.join(" AND ")}`;
  const [{ results }, n2] = await Promise.all([
    env.DB.prepare(`${STUDENT_LIST} WHERE ${where.join(" AND ")} ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first()
  ]);
  return json({ students: results, total: n2.n, page, limit });
});
async function studentSummary(env, instId, id) {
  const [loans, fines, academic] = await Promise.all([
    env.DB.prepare(`SELECT (SELECT COUNT(*) FROM ins_loans WHERE institution_id = ?1 AND borrower_type = 'student' AND borrower_id = ?2 AND status = 'borrowed') AS active,
      (SELECT COUNT(*) FROM ins_loans WHERE institution_id = ?1 AND borrower_type = 'student' AND borrower_id = ?2) AS total`).bind(instId, id).first(),
    env.DB.prepare(`SELECT COALESCE(SUM(amount),0) AS unpaid FROM ins_fines WHERE institution_id = ? AND borrower_type = 'student' AND borrower_id = ? AND status = 'unpaid'`).bind(instId, id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n, AVG(marks) AS avg_marks, AVG(points) AS avg_points FROM ins_results WHERE institution_id = ? AND student_id = ?`).bind(instId, id).first()
  ]);
  return { loans_active: loans.active, loans_total: loans.total, fines_unpaid: round23(fines.unpaid), results_count: academic.n, avg_marks: academic.avg_marks == null ? null : round23(academic.avg_marks), gpa: academic.avg_points == null ? null : round23(academic.avg_points) };
}
__name(studentSummary, "studentSummary");
var getStudent2 = secure3({ perm: "students.view" }, async ({ env, params, ctx }) => {
  const scope = await teacherStudentScope(env, ctx);
  const extra = scope ? ` AND ${scope.sql}` : "";
  const s = await env.DB.prepare(`SELECT s.*, p.name AS programme, d.name AS department FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id
    WHERE s.id = ? AND s.institution_id = ? AND s.deleted_at IS NULL${extra}`).bind(params.id, ctx.inst.id, ...scope ? scope.binds : []).first();
  if (!s) fail(404, "The student record could not be found.");
  const { photo_key, deleted_at, ...rest } = s;
  return json({ student: { ...rest, has_photo: !!photo_key }, summary: await studentSummary(env, ctx.inst.id, s.id) });
});
function readStudent(b) {
  return {
    student_no: V.str(b.student_no, "Student ID", { max: 40 }),
    reg_no: V.str(b.reg_no, "Registration number", { max: 40 }),
    full_name: V.str(b.full_name, "Full name", { required: true, max: 120, min: 2 }),
    gender: V.oneOf(b.gender, "Gender", GENDERS),
    dob: V.date(b.dob, "Date of birth"),
    phone: V.phone(b.phone, "Phone number"),
    email: V.email(b.email, "Email"),
    address: V.str(b.address, "Address", { max: 300 }),
    programme_id: V.int(b.programme_id, "Programme", { min: 1 }),
    department_id: V.int(b.department_id, "Department", { min: 1 }),
    class_name: V.str(b.class_name, "Class", { max: 60 }),
    level: V.str(b.level, "Year / level", { max: 40 }),
    admission_date: V.date(b.admission_date, "Admission date"),
    admission_info: V.str(b.admission_info, "Admission information", { max: 500 }),
    status: V.oneOf(b.status, "Status", STUDENT_STATUS, { def: "active" }),
    guardian_name: V.str(b.guardian_name, "Guardian name", { max: 120 }),
    guardian_phone: V.phone(b.guardian_phone, "Guardian phone"),
    guardian_relation: V.str(b.guardian_relation, "Guardian relationship", { max: 60 }),
    notes: V.str(b.notes, "Notes", { max: 1e3 })
  };
}
__name(readStudent, "readStudent");
async function uniqueStudentNo(env, instId, no, selfId) {
  const dup = await env.DB.prepare("SELECT id, full_name FROM ins_students WHERE institution_id = ? AND student_no = ? COLLATE NOCASE AND id != ?").bind(instId, no, selfId || 0).first();
  if (dup) fail(409, `Student ID ${no} is already used by ${dup.full_name}.`);
}
__name(uniqueStudentNo, "uniqueStudentNo");
async function insertStudent(env, ctx, s) {
  const settings = await getSettings4(env, ctx.inst.id);
  const no = s.student_no || await nextNumber(env, ctx.inst.id, "ins_students", "student_no", settings.student_prefix);
  await uniqueStudentNo(env, ctx.inst.id, no);
  const r = await env.DB.prepare(
    `INSERT INTO ins_students (institution_id, student_no, reg_no, full_name, gender, dob, phone, email, address, programme_id, department_id, class_name, level, admission_date, admission_info, status, guardian_name, guardian_phone, guardian_relation, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(ctx.inst.id, no, s.reg_no, s.full_name, s.gender, s.dob, s.phone, s.email, s.address, s.programme_id, s.department_id, s.class_name, s.level, s.admission_date, s.admission_info, s.status, s.guardian_name, s.guardian_phone, s.guardian_relation, s.notes).run();
  return { id: r.meta.last_row_id, student_no: no };
}
__name(insertStudent, "insertStudent");
var createStudent2 = secure3({ perm: "students.manage" }, async ({ request, env, ctx }) => {
  const s = readStudent(await readJson(request));
  await fk(env, "ins_programmes", ctx.inst.id, s.programme_id, "programme");
  await fk(env, "ins_departments", ctx.inst.id, s.department_id, "department");
  const r = await insertStudent(env, ctx, s);
  await audit3(env, request, ctx, "students", "student.create", "student", r.id, `${s.full_name} (${r.student_no})`);
  return json({ ok: true, ...r }, { status: 201 });
});
var updateStudent2 = secure3({ perm: "students.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT id, student_no FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The student record could not be found.");
  const s = readStudent(await readJson(request));
  await fk(env, "ins_programmes", ctx.inst.id, s.programme_id, "programme");
  await fk(env, "ins_departments", ctx.inst.id, s.department_id, "department");
  const no = s.student_no || cur.student_no;
  await uniqueStudentNo(env, ctx.inst.id, no, cur.id);
  await env.DB.prepare(
    `UPDATE ins_students SET student_no=?, reg_no=?, full_name=?, gender=?, dob=?, phone=?, email=?, address=?, programme_id=?, department_id=?, class_name=?, level=?, admission_date=?, admission_info=?,
       status=?, guardian_name=?, guardian_phone=?, guardian_relation=?, notes=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(no, s.reg_no, s.full_name, s.gender, s.dob, s.phone, s.email, s.address, s.programme_id, s.department_id, s.class_name, s.level, s.admission_date, s.admission_info, s.status, s.guardian_name, s.guardian_phone, s.guardian_relation, s.notes, cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "students", "student.update", "student", cur.id, s.full_name);
  return json({ ok: true });
});
var deleteStudent2 = secure3({ perm: "students.manage" }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare("SELECT id, full_name, photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, "The student record could not be found.");
  const loans = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE borrower_type = 'student' AND borrower_id = ? AND status = 'borrowed'`).bind(s.id).first();
  if (loans.n) fail(409, "This student still has books on loan. Return them first.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE ins_students SET deleted_at = datetime('now'), status = 'withdrawn' WHERE id = ?`).bind(s.id),
    env.DB.prepare(`UPDATE ins_members SET active = 0 WHERE student_id = ? AND institution_id = ?`).bind(s.id, ctx.inst.id),
    env.DB.prepare(`UPDATE ins_reservations SET status = 'cancelled' WHERE borrower_type = 'student' AND borrower_id = ? AND status IN ('waiting','ready')`).bind(s.id)
  ]);
  await audit3(env, request, ctx, "students", "student.delete", "student", s.id, s.full_name);
  return json({ ok: true });
});
var uploadStudentPhoto2 = secure3({ perm: "students.manage" }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare("SELECT id, photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, "The student record could not be found.");
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a photo.");
  const key = await storeImage(env, form.get("photo"), `institution/${ctx.inst.id}/student`);
  await env.DB.prepare("UPDATE ins_students SET photo_key = ? WHERE id = ?").bind(key, s.id).run();
  if (s.photo_key && env.MATERIALS) await env.MATERIALS.delete(s.photo_key).catch(() => {
  });
  await audit3(env, request, ctx, "students", "student.photo", "student", s.id, null);
  return json({ ok: true });
});
async function studentPhoto({ request, env, params }) {
  const ctx = await getInstContext(request, env);
  if (ctx.error || !ctx.inst) return new Response("Not found", { status: 404 });
  if (!(can4(ctx, "students.view") || ctx.studentId === Number(params.id))) return new Response("Not found", { status: 404 });
  const s = await env.DB.prepare("SELECT photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  return s && s.photo_key ? imageResponse(env, s.photo_key) : new Response("Not found", { status: 404 });
}
__name(studentPhoto, "studentPhoto");
var listStaff2 = secure3({ perm: "staff.view" }, async ({ env, url, ctx }) => {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 20, 100);
  const where = ["f.institution_id = ?1", "f.deleted_at IS NULL"];
  const binds = [ctx.inst.id];
  const q = (sp.get("q") || "").trim();
  if (q) {
    const like = likeTerm(q);
    where.push(`(f.full_name LIKE ?2 ESCAPE '\\' OR f.staff_no LIKE ?2 ESCAPE '\\' OR f.position LIKE ?2 ESCAPE '\\')`);
    binds.push(like);
  }
  if (sp.get("department_id")) {
    where.push(`f.department_id = ?${binds.length + 1}`);
    binds.push(V.int(sp.get("department_id"), "Department", { min: 1 }));
  }
  if (sp.get("status")) {
    where.push(`f.status = ?${binds.length + 1}`);
    binds.push(V.oneOf(sp.get("status"), "Status", STAFF_STATUS, { required: true }));
  }
  const from = `FROM ins_staff f LEFT JOIN ins_departments d ON d.id = f.department_id WHERE ${where.join(" AND ")}`;
  const [{ results }, n2] = await Promise.all([
    env.DB.prepare(`SELECT f.id, f.staff_no, f.full_name, f.gender, f.phone, f.email, f.position, f.status, f.department_id, d.name AS department, (f.photo_key IS NOT NULL) AS has_photo ${from} ORDER BY f.full_name COLLATE NOCASE LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first()
  ]);
  return json({ staff: results, total: n2.n, page, limit });
});
var getStaff = secure3({ perm: "staff.view" }, async ({ env, params, ctx }) => {
  const f = await env.DB.prepare(`SELECT f.*, d.name AS department FROM ins_staff f LEFT JOIN ins_departments d ON d.id = f.department_id WHERE f.id = ? AND f.institution_id = ? AND f.deleted_at IS NULL`).bind(params.id, ctx.inst.id).first();
  if (!f) fail(404, "The staff record could not be found.");
  const { photo_key, deleted_at, ...rest } = f;
  const courses = await env.DB.prepare(`SELECT c.code, c.name, t.name AS term FROM ins_teaching x JOIN ins_courses c ON c.id = x.course_id LEFT JOIN ins_terms t ON t.id = x.term_id WHERE x.staff_id = ? AND x.institution_id = ?`).bind(f.id, ctx.inst.id).all();
  return json({ staff: { ...rest, has_photo: !!photo_key }, courses: courses.results });
});
function readStaff(b) {
  return {
    staff_no: V.str(b.staff_no, "Staff number", { max: 40 }),
    full_name: V.str(b.full_name, "Full name", { required: true, max: 120, min: 2 }),
    gender: V.oneOf(b.gender, "Gender", GENDERS),
    phone: V.phone(b.phone, "Phone number"),
    email: V.email(b.email, "Email"),
    position: V.str(b.position, "Position", { max: 100 }),
    department_id: V.int(b.department_id, "Department", { min: 1 }),
    hired_on: V.date(b.hired_on, "Hire date"),
    status: V.oneOf(b.status, "Status", STAFF_STATUS, { def: "active" }),
    notes: V.str(b.notes, "Notes", { max: 1e3 })
  };
}
__name(readStaff, "readStaff");
async function insertStaff(env, ctx, s) {
  const settings = await getSettings4(env, ctx.inst.id);
  const no = s.staff_no || await nextNumber(env, ctx.inst.id, "ins_staff", "staff_no", settings.staff_prefix);
  const dup = await env.DB.prepare("SELECT full_name FROM ins_staff WHERE institution_id = ? AND staff_no = ? COLLATE NOCASE").bind(ctx.inst.id, no).first();
  if (dup) fail(409, `Staff number ${no} is already used by ${dup.full_name}.`);
  const r = await env.DB.prepare(`INSERT INTO ins_staff (institution_id, staff_no, full_name, gender, phone, email, position, department_id, hired_on, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(ctx.inst.id, no, s.full_name, s.gender, s.phone, s.email, s.position, s.department_id, s.hired_on, s.status, s.notes).run();
  return { id: r.meta.last_row_id, staff_no: no };
}
__name(insertStaff, "insertStaff");
var createStaff = secure3({ perm: "staff.manage" }, async ({ request, env, ctx }) => {
  const s = readStaff(await readJson(request));
  await fk(env, "ins_departments", ctx.inst.id, s.department_id, "department");
  const r = await insertStaff(env, ctx, s);
  await audit3(env, request, ctx, "staff", "staff.create", "staff", r.id, `${s.full_name} (${r.staff_no})`);
  return json({ ok: true, ...r }, { status: 201 });
});
var updateStaff = secure3({ perm: "staff.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT id, staff_no FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The staff record could not be found.");
  const s = readStaff(await readJson(request));
  await fk(env, "ins_departments", ctx.inst.id, s.department_id, "department");
  const no = s.staff_no || cur.staff_no;
  const dup = await env.DB.prepare("SELECT full_name FROM ins_staff WHERE institution_id = ? AND staff_no = ? COLLATE NOCASE AND id != ?").bind(ctx.inst.id, no, cur.id).first();
  if (dup) fail(409, `Staff number ${no} is already used by ${dup.full_name}.`);
  await env.DB.prepare(`UPDATE ins_staff SET staff_no=?, full_name=?, gender=?, phone=?, email=?, position=?, department_id=?, hired_on=?, status=?, notes=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`).bind(no, s.full_name, s.gender, s.phone, s.email, s.position, s.department_id, s.hired_on, s.status, s.notes, cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "staff", "staff.update", "staff", cur.id, s.full_name);
  return json({ ok: true });
});
var deleteStaff = secure3({ perm: "staff.manage" }, async ({ request, env, params, ctx }) => {
  const s = await env.DB.prepare("SELECT id, full_name FROM ins_staff WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, "The staff record could not be found.");
  const loans = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE borrower_type = 'staff' AND borrower_id = ? AND status = 'borrowed'`).bind(s.id).first();
  if (loans.n) fail(409, "This staff member still has books on loan. Return them first.");
  await env.DB.batch([
    env.DB.prepare(`UPDATE ins_staff SET deleted_at = datetime('now'), status = 'left' WHERE id = ?`).bind(s.id),
    env.DB.prepare(`UPDATE ins_members SET active = 0 WHERE staff_id = ? AND institution_id = ? AND role != 'super_admin'`).bind(s.id, ctx.inst.id),
    env.DB.prepare(`DELETE FROM ins_teaching WHERE staff_id = ?`).bind(s.id)
  ]);
  await audit3(env, request, ctx, "staff", "staff.delete", "staff", s.id, s.full_name);
  return json({ ok: true });
});
var listDepartments = secure3(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT d.id, d.name, d.code, d.head_name, d.active,
       (SELECT COUNT(*) FROM ins_students s WHERE s.department_id = d.id AND s.deleted_at IS NULL) AS students,
       (SELECT COUNT(*) FROM ins_staff f WHERE f.department_id = d.id AND f.deleted_at IS NULL) AS staff
     FROM ins_departments d WHERE d.institution_id = ? ORDER BY d.name`
  ).bind(ctx.inst.id).all();
  return json({ departments: results });
});
var saveDepartment = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Department name", { required: true, max: 100, min: 2 });
  const dup = await env.DB.prepare("SELECT id FROM ins_departments WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?").bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, "A department with this name already exists.");
  const vals = [name, V.str(b.code, "Code", { max: 20 }), V.str(b.head_name, "Head of department", { max: 100 }), b.active === false || b.active === 0 ? 0 : 1];
  if (params.id) {
    const r = await env.DB.prepare("UPDATE ins_departments SET name = ?, code = ?, head_name = ?, active = ? WHERE id = ? AND institution_id = ?").bind(...vals, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, "Department not found.");
  } else await env.DB.prepare("INSERT INTO ins_departments (institution_id, name, code, head_name, active) VALUES (?, ?, ?, ?, ?)").bind(ctx.inst.id, ...vals).run();
  await audit3(env, request, ctx, "academics", "department.save", "department", Number(params.id) || null, name);
  return json({ ok: true });
});
var deleteDepartment = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM ins_departments WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Department not found.");
  await audit3(env, request, ctx, "academics", "department.delete", "department", Number(params.id), null);
  return json({ ok: true });
});
var listProgrammes = secure3(async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    `SELECT p.id, p.name, p.code, p.level, p.duration_years, p.active, p.department_id, d.name AS department,
       (SELECT COUNT(*) FROM ins_students s WHERE s.programme_id = p.id AND s.deleted_at IS NULL) AS students
     FROM ins_programmes p LEFT JOIN ins_departments d ON d.id = p.department_id WHERE p.institution_id = ? ORDER BY p.name`
  ).bind(ctx.inst.id).all();
  return json({ programmes: results });
});
var saveProgramme = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Programme name", { required: true, max: 120, min: 2 });
  const dept = V.int(b.department_id, "Department", { min: 1 });
  await fk(env, "ins_departments", ctx.inst.id, dept, "department");
  const dup = await env.DB.prepare("SELECT id FROM ins_programmes WHERE institution_id = ? AND name = ? COLLATE NOCASE AND id != ?").bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, "A programme with this name already exists.");
  const vals = [dept, name, V.str(b.code, "Code", { max: 20 }), V.str(b.level, "Level", { max: 40 }), V.num(b.duration_years, "Duration", { min: 0.1, max: 12 }), b.active === false || b.active === 0 ? 0 : 1];
  if (params.id) {
    const r = await env.DB.prepare("UPDATE ins_programmes SET department_id = ?, name = ?, code = ?, level = ?, duration_years = ?, active = ? WHERE id = ? AND institution_id = ?").bind(...vals, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, "Programme not found.");
  } else await env.DB.prepare("INSERT INTO ins_programmes (institution_id, department_id, name, code, level, duration_years, active) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ctx.inst.id, ...vals).run();
  await audit3(env, request, ctx, "academics", "programme.save", "programme", Number(params.id) || null, name);
  return json({ ok: true });
});
var deleteProgramme = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM ins_programmes WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Programme not found.");
  await audit3(env, request, ctx, "academics", "programme.delete", "programme", Number(params.id), null);
  return json({ ok: true });
});
var myProfile = secure3(async ({ env, ctx }) => {
  if (ctx.studentId) {
    const s = await env.DB.prepare(`SELECT s.id, s.student_no, s.reg_no, s.full_name, s.gender, s.dob, s.address, s.guardian_name, s.guardian_phone, s.guardian_relation, s.phone, s.email, s.class_name, s.level, s.status, s.admission_date, (s.photo_key IS NOT NULL) AS has_photo, p.name AS programme, d.name AS department
      FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id WHERE s.id = ? AND s.institution_id = ? AND s.deleted_at IS NULL`).bind(ctx.studentId, ctx.inst.id).first();
    return json({ linked: !!s, type: "student", profile: s || null, summary: s ? await studentSummary(env, ctx.inst.id, s.id) : null });
  }
  if (ctx.staffId) {
    const f = await env.DB.prepare(`SELECT f.id, f.staff_no, f.full_name, f.phone, f.email, f.position, d.name AS department FROM ins_staff f LEFT JOIN ins_departments d ON d.id = f.department_id WHERE f.id = ? AND f.institution_id = ? AND f.deleted_at IS NULL`).bind(ctx.staffId, ctx.inst.id).first();
    return json({ linked: !!f, type: "staff", profile: f || null });
  }
  return json({ linked: false, profile: null });
});
var updateMyProfile = secure3(async ({ request, env, ctx }) => {
  if (!ctx.studentId) fail(403, "Only students with a linked student record can edit their profile here.");
  const cur = await env.DB.prepare("SELECT id, full_name FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(ctx.studentId, ctx.inst.id).first();
  if (!cur) fail(404, "Your student record could not be found.");
  const b = await readJson(request);
  const p = {
    phone: V.phone(b.phone, "Phone number"),
    dob: V.date(b.dob, "Date of birth"),
    address: V.str(b.address, "Address", { max: 300 }),
    guardian_name: V.str(b.guardian_name, "Guardian name", { max: 120 }),
    guardian_phone: V.phone(b.guardian_phone, "Guardian phone"),
    guardian_relation: V.str(b.guardian_relation, "Guardian relationship", { max: 60 })
  };
  await env.DB.prepare(
    `UPDATE ins_students SET phone=?, dob=?, address=?, guardian_name=?, guardian_phone=?, guardian_relation=?, updated_at=datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(p.phone, p.dob, p.address, p.guardian_name, p.guardian_phone, p.guardian_relation, cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "students", "profile.update", "student", cur.id, cur.full_name);
  return json({ ok: true });
});
var uploadMyPhoto = secure3(async ({ request, env, ctx }) => {
  if (!ctx.studentId) fail(403, "Only students with a linked student record can change their photo here.");
  const s = await env.DB.prepare("SELECT id, photo_key FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(ctx.studentId, ctx.inst.id).first();
  if (!s) fail(404, "Your student record could not be found.");
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose a photo.");
  const key = await storeImage(env, form.get("photo"), `institution/${ctx.inst.id}/student`);
  await env.DB.prepare("UPDATE ins_students SET photo_key = ?, updated_at = datetime('now') WHERE id = ?").bind(key, s.id).run();
  if (s.photo_key && env.MATERIALS) await env.MATERIALS.delete(s.photo_key).catch(() => {
  });
  await audit3(env, request, ctx, "students", "student.photo", "student", s.id, "own photo");
  return json({ ok: true });
});
var changeMyPassword = secure3(async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const u = await env.DB.prepare("SELECT id, password_hash, password_salt FROM users WHERE id = ?").bind(ctx.user.id).first();
  const ok = u && await verifyPassword(String(b.current_password || ""), u.password_hash, u.password_salt);
  if (!ok) fail(400, "Your current password is not correct.");
  const pw = V.password(b.new_password, "New password");
  if (pw === String(b.current_password)) fail(400, "Please choose a password that is different from the current one.");
  const { hash, salt } = await hashPassword(pw);
  await env.DB.prepare("UPDATE users SET password_hash = ?, password_salt = ? WHERE id = ?").bind(hash, salt, u.id).run();
  await audit3(env, request, ctx, "auth", "user.password", "user", u.id, null);
  return json({ ok: true });
});

// src/handlers/institution/academics.js
init_auth();
init_institution_auth();
async function own(env, table, instId, id, label2) {
  const r = await env.DB.prepare(`SELECT * FROM ${table} WHERE id = ? AND institution_id = ?`).bind(id, instId).first();
  if (!r) fail(404, `That ${label2} could not be found.`);
  return r;
}
__name(own, "own");
var listYears2 = secure3(async ({ env, ctx }) => {
  const [y, t] = await Promise.all([
    env.DB.prepare("SELECT * FROM ins_academic_years WHERE institution_id = ? ORDER BY name DESC").bind(ctx.inst.id).all(),
    env.DB.prepare("SELECT * FROM ins_terms WHERE institution_id = ? ORDER BY academic_year_id DESC, start_date, id").bind(ctx.inst.id).all()
  ]);
  return json({ years: y.results, terms: t.results });
});
var saveYear2 = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const name = V.str(b.name, "Academic year", { required: true, max: 30 });
  const start = V.date(b.start_date, "Start date");
  const end = V.date(b.end_date, "End date");
  if (start && end && end < start) fail(400, "The end date must be after the start date.");
  const dup = await env.DB.prepare("SELECT id FROM ins_academic_years WHERE institution_id = ? AND name = ? AND id != ?").bind(ctx.inst.id, name, Number(params.id) || 0).first();
  if (dup) fail(409, "This academic year already exists.");
  let id = Number(params.id) || null;
  if (id) {
    await own(env, "ins_academic_years", ctx.inst.id, id, "academic year");
    await env.DB.prepare("UPDATE ins_academic_years SET name = ?, start_date = ?, end_date = ? WHERE id = ?").bind(name, start, end, id).run();
  } else id = (await env.DB.prepare("INSERT INTO ins_academic_years (institution_id, name, start_date, end_date) VALUES (?, ?, ?, ?)").bind(ctx.inst.id, name, start, end).run()).meta.last_row_id;
  if (b.is_current) await env.DB.batch([
    env.DB.prepare("UPDATE ins_academic_years SET is_current = 0 WHERE institution_id = ?").bind(ctx.inst.id),
    env.DB.prepare("UPDATE ins_academic_years SET is_current = 1 WHERE id = ?").bind(id)
  ]);
  await audit3(env, request, ctx, "academics", "year.save", "academic_year", id, name);
  return json({ ok: true, id });
});
var saveTerm2 = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const yearId = V.int(b.academic_year_id, "Academic year", { required: true, min: 1 });
  await own(env, "ins_academic_years", ctx.inst.id, yearId, "academic year");
  const name = V.str(b.name, "Term name", { required: true, max: 40 });
  const start = V.date(b.start_date, "Start date");
  const end = V.date(b.end_date, "End date");
  if (start && end && end < start) fail(400, "The end date must be after the start date.");
  const dup = await env.DB.prepare("SELECT id FROM ins_terms WHERE institution_id = ? AND academic_year_id = ? AND name = ? AND id != ?").bind(ctx.inst.id, yearId, name, Number(params.id) || 0).first();
  if (dup) fail(409, "This term already exists in that year.");
  let id = Number(params.id) || null;
  if (id) {
    await own(env, "ins_terms", ctx.inst.id, id, "term");
    await env.DB.prepare("UPDATE ins_terms SET academic_year_id = ?, name = ?, start_date = ?, end_date = ? WHERE id = ?").bind(yearId, name, start, end, id).run();
  } else id = (await env.DB.prepare("INSERT INTO ins_terms (institution_id, academic_year_id, name, start_date, end_date) VALUES (?, ?, ?, ?, ?)").bind(ctx.inst.id, yearId, name, start, end).run()).meta.last_row_id;
  if (b.is_current) await env.DB.batch([
    env.DB.prepare("UPDATE ins_terms SET is_current = 0 WHERE institution_id = ?").bind(ctx.inst.id),
    env.DB.prepare("UPDATE ins_terms SET is_current = 1 WHERE id = ?").bind(id)
  ]);
  await audit3(env, request, ctx, "academics", "term.save", "term", id, name);
  return json({ ok: true, id });
});
var deleteTerm2 = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_enrollments WHERE term_id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (used.n) fail(409, "This term already has enrolments and results, so it cannot be deleted.");
  const r = await env.DB.prepare("DELETE FROM ins_terms WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Term not found.");
  await audit3(env, request, ctx, "academics", "term.delete", "term", Number(params.id), null);
  return json({ ok: true });
});
var listCourses3 = secure3({ perm: ["academics.view", "academics.manage"] }, async ({ env, url, ctx }) => {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 30, 100);
  const where = ["c.institution_id = ?1"];
  const binds = [ctx.inst.id];
  const q = (sp.get("q") || "").trim();
  if (q) {
    where.push(`(c.name LIKE ?${binds.length + 1} ESCAPE '\\' OR c.code LIKE ?${binds.length + 1} ESCAPE '\\')`);
    binds.push(likeTerm(q));
  }
  if (sp.get("programme_id")) {
    where.push(`c.programme_id = ?${binds.length + 1}`);
    binds.push(V.int(sp.get("programme_id"), "Programme", { min: 1 }));
  }
  if (ctx.role === "teacher" && sp.get("mine") === "1") {
    where.push(`c.id IN (SELECT course_id FROM ins_teaching WHERE staff_id = ?${binds.length + 1})`);
    binds.push(ctx.staffId || 0);
  }
  const from = `FROM ins_courses c LEFT JOIN ins_programmes p ON p.id = c.programme_id LEFT JOIN ins_departments d ON d.id = c.department_id WHERE ${where.join(" AND ")}`;
  const [{ results }, n2] = await Promise.all([
    env.DB.prepare(`SELECT c.id, c.code, c.name, c.credits, c.level, c.active, c.programme_id, c.department_id, p.name AS programme, d.name AS department,
      (SELECT GROUP_CONCAT(DISTINCT f.full_name) FROM ins_teaching t JOIN ins_staff f ON f.id = t.staff_id WHERE t.course_id = c.id) AS teachers
      ${from} ORDER BY c.code LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first()
  ]);
  return json({ courses: results, total: n2.n, page, limit });
});
var saveCourse = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const code = V.str(b.code, "Course code", { required: true, max: 20 }).toUpperCase();
  const name = V.str(b.name, "Course name", { required: true, max: 140, min: 2 });
  const prog = V.int(b.programme_id, "Programme", { min: 1 });
  const dept = V.int(b.department_id, "Department", { min: 1 });
  if (prog) await own(env, "ins_programmes", ctx.inst.id, prog, "programme");
  if (dept) await own(env, "ins_departments", ctx.inst.id, dept, "department");
  const dup = await env.DB.prepare("SELECT id FROM ins_courses WHERE institution_id = ? AND code = ? COLLATE NOCASE AND id != ?").bind(ctx.inst.id, code, Number(params.id) || 0).first();
  if (dup) fail(409, `The course code ${code} is already used.`);
  const vals = [prog, dept, code, name, V.num(b.credits, "Credits", { min: 0, max: 100 }), V.str(b.level, "Level", { max: 40 }), b.active === false || b.active === 0 ? 0 : 1];
  if (params.id) {
    const r = await env.DB.prepare("UPDATE ins_courses SET programme_id = ?, department_id = ?, code = ?, name = ?, credits = ?, level = ?, active = ? WHERE id = ? AND institution_id = ?").bind(...vals, params.id, ctx.inst.id).run();
    if (!r.meta.changes) fail(404, "Course not found.");
  } else await env.DB.prepare("INSERT INTO ins_courses (institution_id, programme_id, department_id, code, name, credits, level, active) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(ctx.inst.id, ...vals).run();
  await audit3(env, request, ctx, "academics", "course.save", "course", Number(params.id) || null, `${code} ${name}`);
  return json({ ok: true });
});
var deleteCourse2 = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const used = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_enrollments WHERE course_id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (used.n) fail(409, "Students are enrolled in this course, so it cannot be deleted. Mark it inactive instead.");
  const r = await env.DB.prepare("DELETE FROM ins_courses WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Course not found.");
  await audit3(env, request, ctx, "academics", "course.delete", "course", Number(params.id), null);
  return json({ ok: true });
});
var listTeaching = secure3({ perm: ["academics.view", "academics.manage"] }, async ({ env, url, ctx }) => {
  const course = url.searchParams.get("course_id");
  const { results } = await env.DB.prepare(
    `SELECT t.id, t.course_id, t.staff_id, t.term_id, c.code, c.name AS course, f.full_name AS teacher, tm.name AS term
     FROM ins_teaching t JOIN ins_courses c ON c.id = t.course_id JOIN ins_staff f ON f.id = t.staff_id LEFT JOIN ins_terms tm ON tm.id = t.term_id
     WHERE t.institution_id = ?${course ? " AND t.course_id = ?" : ""} ORDER BY c.code, f.full_name`
  ).bind(...course ? [ctx.inst.id, Number(course)] : [ctx.inst.id]).all();
  return json({ teaching: results });
});
var assignTeacher = secure3({ perm: "academics.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const course = V.int(b.course_id, "Course", { required: true, min: 1 });
  const staff = V.int(b.staff_id, "Teacher", { required: true, min: 1 });
  const term = V.int(b.term_id, "Term", { min: 1 });
  await own(env, "ins_courses", ctx.inst.id, course, "course");
  const f = await own(env, "ins_staff", ctx.inst.id, staff, "teacher");
  if (term) await own(env, "ins_terms", ctx.inst.id, term, "term");
  const dup = await env.DB.prepare("SELECT id FROM ins_teaching WHERE course_id = ? AND staff_id = ? AND COALESCE(term_id,0) = ?").bind(course, staff, term || 0).first();
  if (dup) fail(409, "This teacher is already assigned to that course.");
  const r = await env.DB.prepare("INSERT INTO ins_teaching (institution_id, course_id, staff_id, term_id) VALUES (?, ?, ?, ?)").bind(ctx.inst.id, course, staff, term).run();
  await audit3(env, request, ctx, "academics", "teaching.assign", "course", course, f.full_name);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var removeTeacher = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM ins_teaching WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "Assignment not found.");
  await audit3(env, request, ctx, "academics", "teaching.remove", "teaching", Number(params.id), null);
  return json({ ok: true });
});
var listEnrollments = secure3({ perm: ["academics.view", "academics.manage"] }, async ({ env, url, ctx }) => {
  const course = V.int(url.searchParams.get("course_id"), "Course", { required: true, min: 1 });
  const term = V.int(url.searchParams.get("term_id"), "Term", { required: true, min: 1 });
  const { results } = await env.DB.prepare(
    `SELECT e.id, e.student_id, e.status, s.student_no, s.full_name, s.class_name, r.marks, r.grade
     FROM ins_enrollments e JOIN ins_students s ON s.id = e.student_id LEFT JOIN ins_results r ON r.enrollment_id = e.id
     WHERE e.institution_id = ? AND e.course_id = ? AND e.term_id = ? AND s.deleted_at IS NULL ORDER BY s.full_name COLLATE NOCASE`
  ).bind(ctx.inst.id, course, term).all();
  return json({ enrollments: results });
});
var enroll = secure3({ perm: "academics.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const course = V.int(b.course_id, "Course", { required: true, min: 1 });
  const term = V.int(b.term_id, "Term", { required: true, min: 1 });
  const c = await own(env, "ins_courses", ctx.inst.id, course, "course");
  await own(env, "ins_terms", ctx.inst.id, term, "term");
  let ids = V.ids(b.student_ids, "Students");
  if (b.programme_id || b.class_name) {
    const w = ["institution_id = ?1", "deleted_at IS NULL", `status = 'active'`];
    const bind = [ctx.inst.id];
    if (b.programme_id) {
      w.push(`programme_id = ?${bind.length + 1}`);
      bind.push(V.int(b.programme_id, "Programme", { min: 1 }));
    }
    if (b.class_name) {
      w.push(`class_name = ?${bind.length + 1}`);
      bind.push(V.str(b.class_name, "Class", { max: 60 }));
    }
    const { results } = await env.DB.prepare(`SELECT id FROM ins_students WHERE ${w.join(" AND ")} LIMIT 500`).bind(...bind).all();
    ids = [.../* @__PURE__ */ new Set([...ids, ...results.map((r) => r.id)])];
  }
  if (!ids.length) fail(400, "Choose at least one student.");
  const valid = /* @__PURE__ */ new Set();
  for (const part of chunk(ids, 80)) {
    const { results } = await env.DB.prepare(`SELECT id FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND id IN (${part.map(() => "?").join(",")})`).bind(ctx.inst.id, ...part).all();
    results.forEach((r) => valid.add(r.id));
  }
  const stmts = [...valid].map((sid) => env.DB.prepare(`INSERT OR IGNORE INTO ins_enrollments (institution_id, student_id, course_id, term_id) VALUES (?, ?, ?, ?)`).bind(ctx.inst.id, sid, course, term));
  for (const part of chunk(stmts, 90)) await env.DB.batch(part);
  await audit3(env, request, ctx, "academics", "enrollment.add", "course", course, `${valid.size} student(s) in ${c.code}`);
  return json({ ok: true, enrolled: valid.size, skipped: ids.length - valid.size });
});
var unenroll = secure3({ perm: "academics.manage" }, async ({ request, env, params, ctx }) => {
  const e = await env.DB.prepare("SELECT id FROM ins_enrollments WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (!e) fail(404, "Enrolment not found.");
  const res = await env.DB.prepare("SELECT id FROM ins_results WHERE enrollment_id = ?").bind(e.id).first();
  if (res) await env.DB.prepare(`UPDATE ins_enrollments SET status = 'dropped' WHERE id = ?`).bind(e.id).run();
  else await env.DB.prepare("DELETE FROM ins_enrollments WHERE id = ?").bind(e.id).run();
  await audit3(env, request, ctx, "academics", "enrollment.remove", "enrollment", e.id, res ? "marked dropped (has results)" : "removed");
  return json({ ok: true, kept: !!res });
});
async function assertCanMark(env, ctx, courseId) {
  if (can4(ctx, "results.all")) return;
  if (!can4(ctx, "results.enter")) fail(403, "You do not have permission to perform this action.");
  if (!ctx.staffId) fail(403, "Your login is not linked to a staff record, so you cannot enter marks. Please ask an administrator.");
  const t = await env.DB.prepare("SELECT id FROM ins_teaching WHERE institution_id = ? AND course_id = ? AND staff_id = ? LIMIT 1").bind(ctx.inst.id, courseId, ctx.staffId).first();
  if (!t) fail(403, "You can only enter marks for the courses you teach.");
}
__name(assertCanMark, "assertCanMark");
var resultSheet = secure3({ perm: ["academics.view", "results.enter", "results.all"] }, async ({ env, url, ctx }) => {
  const course = V.int(url.searchParams.get("course_id"), "Course", { required: true, min: 1 });
  const term = V.int(url.searchParams.get("term_id"), "Term", { required: true, min: 1 });
  const c = await own(env, "ins_courses", ctx.inst.id, course, "course");
  const { results } = await env.DB.prepare(
    `SELECT e.id AS enrollment_id, s.id AS student_id, s.student_no, s.full_name, r.marks, r.grade, r.remarks
     FROM ins_enrollments e JOIN ins_students s ON s.id = e.student_id LEFT JOIN ins_results r ON r.enrollment_id = e.id
     WHERE e.institution_id = ? AND e.course_id = ? AND e.term_id = ? AND e.status != 'dropped' AND s.deleted_at IS NULL ORDER BY s.full_name COLLATE NOCASE`
  ).bind(ctx.inst.id, course, term).all();
  let editable = true;
  try {
    await assertCanMark(env, ctx, course);
  } catch (e) {
    editable = false;
  }
  const marked = results.filter((r) => r.marks != null);
  return json({ course: { id: c.id, code: c.code, name: c.name }, rows: results, editable, stats: { students: results.length, marked: marked.length, average: marked.length ? round23(marked.reduce((s, r) => s + r.marks, 0) / marked.length) : null } });
});
var saveResults2 = secure3({ perm: ["results.enter", "results.all"] }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const course = V.int(b.course_id, "Course", { required: true, min: 1 });
  const term = V.int(b.term_id, "Term", { required: true, min: 1 });
  await assertCanMark(env, ctx, course);
  const c = await own(env, "ins_courses", ctx.inst.id, course, "course");
  if (!Array.isArray(b.rows) || !b.rows.length) fail(400, "There are no marks to save.");
  if (b.rows.length > 500) fail(400, "Too many rows in one save (500 maximum).");
  const settings = await getSettings4(env, ctx.inst.id);
  const ids = b.rows.map((r) => V.int(r.enrollment_id, "Enrolment", { required: true, min: 1 }));
  const valid = /* @__PURE__ */ new Map();
  for (const part of chunk(ids, 80)) {
    const { results } = await env.DB.prepare(`SELECT id, student_id FROM ins_enrollments WHERE institution_id = ? AND course_id = ? AND term_id = ? AND id IN (${part.map(() => "?").join(",")})`).bind(ctx.inst.id, course, term, ...part).all();
    results.forEach((r) => valid.set(r.id, r.student_id));
  }
  const stmts = [];
  const changed = [];
  b.rows.forEach((r, i) => {
    const eid = ids[i];
    if (!valid.has(eid)) fail(400, "One of the students is not enrolled in this course for this term.");
    if (r.marks === "" || r.marks == null) {
      stmts.push(env.DB.prepare("DELETE FROM ins_results WHERE enrollment_id = ?").bind(eid));
      return;
    }
    const marks = V.num(r.marks, "Marks", { required: true, min: 0, max: 100 });
    const g = gradeFor2(marks, settings.grading_scale);
    stmts.push(env.DB.prepare(
      `INSERT INTO ins_results (institution_id, enrollment_id, student_id, course_id, term_id, marks, grade, points, remarks, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(enrollment_id) DO UPDATE SET marks = excluded.marks, grade = excluded.grade, points = excluded.points, remarks = excluded.remarks, entered_by = excluded.entered_by, updated_at = datetime('now')`
    ).bind(ctx.inst.id, eid, valid.get(eid), course, term, marks, g.grade, g.points, V.str(r.remarks, "Remarks", { max: 200 }), ctx.user.id));
    changed.push(valid.get(eid));
  });
  for (const part of chunk(stmts, 90)) await env.DB.batch(part);
  for (const sid of [...new Set(changed)].slice(0, 200)) {
    const uid = await userIdForBorrower(env, ctx.inst.id, "student", sid);
    if (uid) await notify2(env, ctx.inst.id, uid, "academic", "Results updated", `New marks were recorded for ${c.code} ${c.name}.`, "#my-results");
  }
  await audit3(env, request, ctx, "academics", "results.save", "course", course, `${c.code}: ${changed.length} mark(s)`);
  return json({ ok: true, saved: changed.length });
});
async function transcript(env, instId, studentId) {
  const { results } = await env.DB.prepare(
    `SELECT r.marks, r.grade, r.points, r.remarks, c.code, c.name AS course, c.credits, t.id AS term_id, t.name AS term, y.name AS year
     FROM ins_results r JOIN ins_courses c ON c.id = r.course_id JOIN ins_terms t ON t.id = r.term_id JOIN ins_academic_years y ON y.id = t.academic_year_id
     WHERE r.institution_id = ? AND r.student_id = ? ORDER BY y.name, t.start_date, t.id, c.code`
  ).bind(instId, studentId).all();
  const terms = /* @__PURE__ */ new Map();
  for (const r of results) {
    const k = r.term_id;
    if (!terms.has(k)) terms.set(k, { term: `${r.year} \xB7 ${r.term}`, rows: [] });
    terms.get(k).rows.push(r);
  }
  const out = [...terms.values()].map((t) => ({
    ...t,
    average: round23(t.rows.reduce((s, r) => s + r.marks, 0) / t.rows.length),
    gpa: round23(t.rows.reduce((s, r) => s + r.points * (r.credits || 1), 0) / t.rows.reduce((s, r) => s + (r.credits || 1), 0))
  }));
  const all2 = results.length ? round23(results.reduce((s, r) => s + r.points * (r.credits || 1), 0) / results.reduce((s, r) => s + (r.credits || 1), 0)) : null;
  return { terms: out, cumulative_gpa: all2, subjects: results.length };
}
__name(transcript, "transcript");
var studentResults2 = secure3({ perm: "academics.view" }, async ({ env, params, ctx }) => {
  const s = await env.DB.prepare("SELECT id, student_no, full_name FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!s) fail(404, "The student record could not be found.");
  if (ctx.role === "teacher") {
    const ok = ctx.staffId && await env.DB.prepare(`SELECT 1 AS x FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id WHERE e.student_id = ? AND t.staff_id = ? AND e.institution_id = ? LIMIT 1`).bind(s.id, ctx.staffId, ctx.inst.id).first();
    if (!ok) fail(404, "The student record could not be found.");
  }
  return json({ student: s, ...await transcript(env, ctx.inst.id, s.id) });
});
var myResults = secure3(async ({ env, ctx }) => {
  if (!ctx.studentId) return json({ linked: false, terms: [], cumulative_gpa: null });
  const s = await env.DB.prepare("SELECT id, student_no, full_name FROM ins_students WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(ctx.studentId, ctx.inst.id).first();
  if (!s) return json({ linked: false, terms: [], cumulative_gpa: null });
  return json({ linked: true, student: s, ...await transcript(env, ctx.inst.id, s.id) });
});

// src/handlers/institution/insights.js
init_auth();
init_institution_auth();
var n = /* @__PURE__ */ __name((v) => Number(v || 0), "n");
var dashboard3 = secure3(async ({ env, ctx }) => {
  const id = ctx.inst.id;
  const today = localToday(ctx.off);
  const one2 = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(id, ...b).first(), "one");
  const all2 = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(id, ...b).all().then((r) => r.results), "all");
  const out = { role: ctx.role, today, cards: [], lists: {} };
  const staffView = can4(ctx, "books.view") || can4(ctx, "students.view") || can4(ctx, "loans.view");
  if (!staffView) {
    const a = await all2(`SELECT title, body, created_at FROM ins_announcements WHERE institution_id = ? AND deleted_at IS NULL AND audience IN ('public','members','students') AND (expires_on IS NULL OR expires_on >= ?) ORDER BY pinned DESC, id DESC LIMIT 5`, today);
    out.announcements = a;
    out.personal = true;
    return json(out);
  }
  await sweep(env, ctx);
  const [books, copies, res, stu, stf, loans, resv, fines, recentStudents] = await Promise.all([
    one2(`SELECT COUNT(*) AS n FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND archived = 0`),
    one2(`SELECT COUNT(*) AS total, SUM(status='available') AS avail, SUM(status='lost') AS lost, SUM(status='damaged') AS damaged FROM ins_book_copies WHERE institution_id = ?`),
    one2(`SELECT COUNT(*) AS n FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL`),
    one2(`SELECT COUNT(*) AS n, SUM(status='active') AS active FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL`),
    one2(`SELECT COUNT(*) AS n FROM ins_staff WHERE institution_id = ? AND deleted_at IS NULL AND status != 'left'`),
    one2(`SELECT COUNT(*) AS active, SUM(due_date < ?2) AS overdue, SUM(due_date = ?2) AS due_today, COUNT(DISTINCT borrower_type || borrower_id) AS borrowers FROM ins_loans WHERE institution_id = ?1 AND status = 'borrowed'`, today),
    one2(`SELECT COUNT(*) AS n FROM ins_reservations WHERE institution_id = ? AND status IN ('waiting','ready')`),
    one2(`SELECT COALESCE(SUM(amount),0) AS t FROM ins_fines WHERE institution_id = ? AND status = 'unpaid'`),
    all2(`SELECT id, full_name, student_no, created_at FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT 5`)
  ]);
  out.cards = [
    { key: "students", label: "Students", value: n(stu.n), sub: `${n(stu.active)} active`, link: "#students", perm: "students.view" },
    { key: "staff", label: "Staff", value: n(stf.n), link: "#staff", perm: "staff.view" },
    { key: "books", label: "Book titles", value: n(books.n), sub: `${n(copies.avail)} of ${n(copies.total)} copies on the shelf`, link: "#books", perm: "books.view" },
    { key: "resources", label: "Digital resources", value: n(res.n), link: "#elibrary", perm: "resources.view" },
    { key: "active_loans", label: "Books on loan", value: n(loans.active), sub: `${n(loans.borrowers)} borrower(s)`, link: "#loans", perm: "loans.view" },
    { key: "overdue", label: "Overdue", value: n(loans.overdue), tone: n(loans.overdue) ? "bad" : "good", link: "#loans?filter=overdue", perm: "loans.view" },
    { key: "due_today", label: "Due today", value: n(loans.due_today), link: "#loans?filter=due_today", perm: "loans.view" },
    { key: "reserved", label: "Reservations", value: n(resv.n), link: "#reservations", perm: "loans.view" },
    { key: "lost", label: "Lost / damaged copies", value: n(copies.lost) + n(copies.damaged), sub: `${n(copies.lost)} lost \xB7 ${n(copies.damaged)} damaged`, link: "#books", perm: "books.view" },
    { key: "fines", label: "Unpaid fines", value: round23(fines.t), unit: ctx.inst.currency, link: "#fines", perm: "loans.view" }
  ].filter((c) => can4(ctx, c.perm));
  if (can4(ctx, "loans.view")) {
    out.lists.most_borrowed = await all2(`SELECT b.id, b.title, b.author, COUNT(*) AS times FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.institution_id = ? GROUP BY b.id ORDER BY times DESC, b.title LIMIT 5`);
    out.lists.due_soon = await all2(`SELECT l.id, l.due_date, b.title, CASE l.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = l.borrower_id) END AS borrower_name
      FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.institution_id = ? AND l.status = 'borrowed' AND l.due_date <= ? ORDER BY l.due_date LIMIT 6`, addDays3(today, 2));
    const since = addDays3(today, -13);
    const days = await all2(`SELECT issued_on AS d, COUNT(*) AS n FROM ins_loans WHERE institution_id = ? AND issued_on >= ? GROUP BY issued_on`, since);
    const map = new Map(days.map((r) => [r.d, r.n]));
    out.lists.loans_trend = Array.from({ length: 14 }, (_, i) => {
      const d = addDays3(since, i);
      return { date: d, count: map.get(d) || 0 };
    });
  }
  if (can4(ctx, "students.view")) out.lists.recent_students = recentStudents;
  if (can4(ctx, "audit.view")) out.lists.activity = await all2(`SELECT a.action, a.module, a.details, a.status, a.created_at, u.name AS user FROM ins_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.institution_id = ? ORDER BY a.id DESC LIMIT 8`);
  if (can4(ctx, "academics.view")) {
    out.lists.programme_counts = await all2(`SELECT COALESCE(p.name,'No programme') AS name, COUNT(*) AS n FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id WHERE s.institution_id = ? AND s.deleted_at IS NULL AND s.status = 'active' GROUP BY p.id ORDER BY n DESC LIMIT 6`);
    const acad = await one2(`SELECT AVG(marks) AS avg, COUNT(*) AS n FROM ins_results WHERE institution_id = ?`);
    out.academic = { average: acad.avg == null ? null : round23(acad.avg), results: n(acad.n) };
  }
  out.announcements = await all2(`SELECT title, body, created_at FROM ins_announcements WHERE institution_id = ? AND deleted_at IS NULL AND (expires_on IS NULL OR expires_on >= ?) ORDER BY pinned DESC, id DESC LIMIT 3`, today);
  return json(out);
});
var globalSearch = secure3(async ({ env, url, ctx }) => {
  const q = (url.searchParams.get("q") || "").trim();
  if (q.length < 2) return json({ q, groups: [] });
  const like = likeTerm(q);
  const id = ctx.inst.id;
  const groups = [];
  const jobs = [];
  const add = /* @__PURE__ */ __name((perm, key, label2, sql, binds, map) => {
    if (can4(ctx, perm)) jobs.push(env.DB.prepare(sql).bind(id, ...binds).all().then((r) => {
      if (r.results.length) groups.push({ key, label: label2, items: r.results.map(map) });
    }));
  }, "add");
  add(
    "books.view",
    "books",
    "Books",
    `SELECT id, title, author, isbn FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\' OR isbn LIKE ? ESCAPE '\\') ORDER BY title LIMIT 5`,
    [like, like, like],
    (r) => ({ title: r.title, sub: r.author, link: `#books?open=${r.id}` })
  );
  add(
    "resources.view",
    "resources",
    "Digital resources",
    `SELECT id, title, author FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL AND access_level IN ('public','members'${ctx.role === "student" ? "" : ",'staff'"}) AND (title LIKE ? ESCAPE '\\' OR author LIKE ? ESCAPE '\\') ORDER BY title LIMIT 5`,
    [like, like],
    (r) => ({ title: r.title, sub: r.author, link: "#elibrary" })
  );
  add(
    "students.view",
    "students",
    "Students",
    `SELECT id, full_name, student_no FROM ins_students s WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR student_no LIKE ? ESCAPE '\\' OR reg_no LIKE ? ESCAPE '\\')
      ${ctx.role === "teacher" ? `AND s.id IN (SELECT e.student_id FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id WHERE t.staff_id = ${Number(ctx.staffId) || 0})` : ""} ORDER BY full_name LIMIT 5`,
    [like, like, like],
    (r) => ({ title: r.full_name, sub: r.student_no, link: `#students?open=${r.id}` })
  );
  add(
    "staff.view",
    "staff",
    "Staff",
    `SELECT id, full_name, staff_no, position FROM ins_staff WHERE institution_id = ? AND deleted_at IS NULL AND (full_name LIKE ? ESCAPE '\\' OR staff_no LIKE ? ESCAPE '\\') ORDER BY full_name LIMIT 5`,
    [like, like],
    (r) => ({ title: r.full_name, sub: r.position || r.staff_no, link: `#staff?open=${r.id}` })
  );
  add(
    "academics.view",
    "courses",
    "Courses",
    `SELECT id, code, name FROM ins_courses WHERE institution_id = ? AND (name LIKE ? ESCAPE '\\' OR code LIKE ? ESCAPE '\\') ORDER BY code LIMIT 5`,
    [like, like],
    (r) => ({ title: `${r.code} \xB7 ${r.name}`, sub: "Course", link: "#courses" })
  );
  add("reports.view", "reports", "Reports", `SELECT ?1 AS x WHERE ('inventory borrowing overdue students activity lost damaged most used enrollment performance' LIKE ?2 ESCAPE '\\')`, [like], () => ({ title: "Reports", sub: "Open the reports centre", link: "#reports" }));
  await Promise.all(jobs);
  const order = ["books", "resources", "students", "staff", "courses", "reports"];
  groups.sort((a, b) => order.indexOf(a.key) - order.indexOf(b.key));
  return json({ q, groups, total: groups.reduce((s, g) => s + g.items.length, 0) });
});
var csvCell = /* @__PURE__ */ __name((v) => {
  const s = v == null ? "" : String(v);
  return /[",\n\r]/.test(s) || /^[=+\-@]/.test(s) ? `"${(/^[=+\-@]/.test(s) ? "'" + s : s).replace(/"/g, '""')}"` : s;
}, "csvCell");
var toCsv = /* @__PURE__ */ __name((cols, rows) => "\uFEFF" + [cols.map((c) => csvCell(c.label)).join(","), ...rows.map((r) => cols.map((c) => csvCell(r[c.key])).join(","))].join("\r\n"), "toCsv");
var REPORTS = {
  inventory: { title: "Library inventory", perm: "reports.view", filters: ["category_id"] },
  borrowing: { title: "Borrowing history", perm: "reports.view", filters: ["from", "to"] },
  returns: { title: "Returns", perm: "reports.view", filters: ["from", "to"] },
  overdue: { title: "Overdue resources", perm: "reports.view", filters: [] },
  lost_damaged: { title: "Lost & damaged resources", perm: "reports.view", filters: [] },
  most_used: { title: "Most-used resources", perm: "reports.view", filters: ["from", "to"] },
  user_activity: { title: "Borrower activity", perm: "reports.view", filters: ["from", "to"] },
  student_list: { title: "Student list", perm: "students.view", filters: ["programme_id", "department_id", "status"] },
  enrollment: { title: "Enrolment by course", perm: "academics.view", filters: ["term_id"] },
  performance: { title: "Academic performance", perm: "academics.view", filters: ["term_id", "programme_id"] },
  programme_stats: { title: "Programme statistics", perm: "academics.view", filters: [] },
  system_activity: { title: "System activity", perm: "audit.view", filters: ["from", "to"] },
  resource_stats: { title: "Operational & resource statistics", perm: "reports.view", filters: [] }
};
var reportCatalogue3 = secure3(async ({ ctx }) => json({
  reports: Object.entries(REPORTS).filter(([, r]) => can4(ctx, r.perm)).map(([key, r]) => ({ key, title: r.title, filters: r.filters }))
}));
async function buildReport3(env, ctx, key, sp) {
  const id = ctx.inst.id;
  const today = localToday(ctx.off);
  const settings = await getSettings4(env, id);
  const from = V.date(sp.get("from"), "From date");
  const to = V.date(sp.get("to"), "To date");
  const intP = /* @__PURE__ */ __name((k) => V.int(sp.get(k), k, { min: 1 }), "intP");
  const run = /* @__PURE__ */ __name((sql, ...b) => env.DB.prepare(sql).bind(id, ...b).all().then((r) => r.results), "run");
  const who = `CASE l.borrower_type WHEN 'student' THEN (SELECT full_name FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT full_name FROM ins_staff WHERE id = l.borrower_id) END`;
  const whoNo = `CASE l.borrower_type WHEN 'student' THEN (SELECT student_no FROM ins_students WHERE id = l.borrower_id) ELSE (SELECT staff_no FROM ins_staff WHERE id = l.borrower_id) END`;
  const dateSql = /* @__PURE__ */ __name((col) => ({ sql: `${from ? ` AND ${col} >= ?` : ""}${to ? ` AND ${col} <= ?` : ""}`, binds: [from, to].filter(Boolean) }), "dateSql");
  let cols;
  let rows;
  let summary2 = null;
  switch (key) {
    case "inventory": {
      const cat = intP("category_id");
      rows = await run(`SELECT b.title, b.author, b.isbn, cat.name AS category, b.shelf, b.classification_no, b.publisher, b.pub_year, COUNT(c.id) AS copies, COALESCE(SUM(c.status='available'),0) AS available,
        COALESCE(SUM(c.status='borrowed'),0) AS borrowed, COALESCE(SUM(c.status='lost'),0) AS lost, COALESCE(SUM(c.status='damaged'),0) AS damaged
        FROM ins_books b LEFT JOIN ins_categories cat ON cat.id = b.category_id LEFT JOIN ins_book_copies c ON c.book_id = b.id
        WHERE b.institution_id = ? AND b.deleted_at IS NULL AND b.archived = 0${cat ? " AND b.category_id = ?" : ""} GROUP BY b.id ORDER BY b.title`, ...cat ? [cat] : []);
      cols = [["title", "Title"], ["author", "Author"], ["isbn", "ISBN"], ["category", "Category"], ["shelf", "Shelf"], ["copies", "Copies"], ["available", "Available"], ["borrowed", "Borrowed"], ["lost", "Lost"], ["damaged", "Damaged"]];
      summary2 = { "Titles": rows.length, "Copies": rows.reduce((s, r) => s + r.copies, 0), "Available": rows.reduce((s, r) => s + r.available, 0) };
      break;
    }
    case "borrowing": {
      const d = dateSql("l.issued_on");
      rows = await run(`SELECT l.issued_on, l.due_date, l.returned_on, l.status, b.title, c.accession_no, ${who} AS borrower, l.borrower_type AS type FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.institution_id = ?${d.sql} ORDER BY l.issued_on DESC, l.id DESC LIMIT 5000`, ...d.binds);
      cols = [["issued_on", "Issued"], ["title", "Title"], ["accession_no", "Copy"], ["borrower", "Borrower"], ["type", "Type"], ["due_date", "Due"], ["returned_on", "Returned"], ["status", "Status"]];
      summary2 = { "Loans": rows.length, "Still out": rows.filter((r) => r.status === "borrowed").length };
      break;
    }
    case "returns": {
      const d = dateSql("l.returned_on");
      rows = await run(`SELECT l.returned_on, l.due_date, l.return_condition AS condition, b.title, ${who} AS borrower, COALESCE((SELECT SUM(amount) FROM ins_fines f WHERE f.loan_id = l.id),0) AS fines FROM ins_loans l JOIN ins_books b ON b.id = l.book_id WHERE l.institution_id = ? AND l.returned_on IS NOT NULL${d.sql} ORDER BY l.returned_on DESC LIMIT 5000`, ...d.binds);
      cols = [["returned_on", "Returned"], ["title", "Title"], ["borrower", "Borrower"], ["due_date", "Was due"], ["condition", "Condition"], ["fines", `Fines (${ctx.inst.currency})`]];
      summary2 = { "Returns": rows.length, [`Fines (${ctx.inst.currency})`]: round23(rows.reduce((s, r) => s + r.fines, 0)) };
      break;
    }
    case "overdue": {
      rows = (await run(`SELECT l.due_date, b.title, c.accession_no, ${who} AS borrower, ${whoNo} AS borrower_no, l.borrower_type AS type FROM ins_loans l JOIN ins_books b ON b.id = l.book_id JOIN ins_book_copies c ON c.id = l.copy_id WHERE l.institution_id = ? AND l.status = 'borrowed' AND l.due_date < ? ORDER BY l.due_date`, today)).map((r) => ({ ...r, days_overdue: daysBetween(r.due_date, today), fine: round23(daysBetween(r.due_date, today) * settings.fine_per_day) }));
      cols = [["title", "Title"], ["accession_no", "Copy"], ["borrower", "Borrower"], ["borrower_no", "ID"], ["due_date", "Due"], ["days_overdue", "Days overdue"], ["fine", `Fine so far (${ctx.inst.currency})`]];
      summary2 = { "Overdue books": rows.length, [`Fines so far (${ctx.inst.currency})`]: round23(rows.reduce((s, r) => s + r.fine, 0)) };
      break;
    }
    case "lost_damaged": {
      rows = await run(`SELECT c.status, c.accession_no, b.title, b.author, b.price, c.note FROM ins_book_copies c JOIN ins_books b ON b.id = c.book_id WHERE c.institution_id = ? AND c.status IN ('lost','damaged') AND b.deleted_at IS NULL ORDER BY c.status, b.title`);
      cols = [["status", "Status"], ["title", "Title"], ["author", "Author"], ["accession_no", "Copy"], ["price", "Value"], ["note", "Note"]];
      summary2 = { Lost: rows.filter((r) => r.status === "lost").length, Damaged: rows.filter((r) => r.status === "damaged").length };
      break;
    }
    case "most_used": {
      const d = dateSql("l.issued_on");
      rows = await run(`SELECT b.title, b.author, cat.name AS category, COUNT(*) AS times FROM ins_loans l JOIN ins_books b ON b.id = l.book_id LEFT JOIN ins_categories cat ON cat.id = b.category_id WHERE l.institution_id = ?${d.sql} GROUP BY b.id ORDER BY times DESC, b.title LIMIT 100`, ...d.binds);
      const dig = await run(`SELECT title, author, (views + downloads) AS times FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL AND (views + downloads) > 0 ORDER BY times DESC LIMIT 20`);
      rows = [...rows.map((r) => ({ ...r, kind: "Book" })), ...dig.map((r) => ({ ...r, category: "Digital", kind: "Digital" }))].sort((a, b) => b.times - a.times);
      cols = [["title", "Title"], ["author", "Author"], ["kind", "Kind"], ["category", "Category"], ["times", "Loans / views"]];
      break;
    }
    case "user_activity": {
      const d = dateSql("l.issued_on");
      rows = await run(`SELECT ${who} AS borrower, ${whoNo} AS borrower_no, l.borrower_type AS type, COUNT(*) AS loans, SUM(l.status='borrowed') AS on_loan, COALESCE((SELECT SUM(amount) FROM ins_fines f WHERE f.borrower_type = l.borrower_type AND f.borrower_id = l.borrower_id AND f.status = 'unpaid'),0) AS unpaid
        FROM ins_loans l WHERE l.institution_id = ?${d.sql} GROUP BY l.borrower_type, l.borrower_id ORDER BY loans DESC LIMIT 500`, ...d.binds);
      cols = [["borrower", "Borrower"], ["borrower_no", "ID"], ["type", "Type"], ["loans", "Loans"], ["on_loan", "On loan now"], ["unpaid", `Unpaid fines (${ctx.inst.currency})`]];
      break;
    }
    case "student_list": {
      const w = [];
      const b = [];
      if (intP("programme_id")) {
        w.push("s.programme_id = ?");
        b.push(intP("programme_id"));
      }
      if (intP("department_id")) {
        w.push("s.department_id = ?");
        b.push(intP("department_id"));
      }
      if (sp.get("status")) {
        w.push("s.status = ?");
        b.push(V.oneOf(sp.get("status"), "Status", ["active", "suspended", "graduated", "withdrawn"], { required: true }));
      }
      if (ctx.role === "teacher") {
        w.push(`s.id IN (SELECT e.student_id FROM ins_enrollments e JOIN ins_teaching t ON t.course_id = e.course_id WHERE t.staff_id = ?)`);
        b.push(ctx.staffId || 0);
      }
      rows = await run(`SELECT s.student_no, s.reg_no, s.full_name, s.gender, p.name AS programme, d.name AS department, s.class_name, s.level, s.status, s.phone FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = s.department_id
        WHERE s.institution_id = ? AND s.deleted_at IS NULL${w.length ? " AND " + w.join(" AND ") : ""} ORDER BY s.full_name COLLATE NOCASE LIMIT 5000`, ...b);
      cols = [["student_no", "Student ID"], ["full_name", "Name"], ["gender", "Gender"], ["programme", "Programme"], ["department", "Department"], ["class_name", "Class"], ["level", "Level"], ["status", "Status"], ["phone", "Phone"]];
      summary2 = { Students: rows.length };
      break;
    }
    case "enrollment": {
      const term = intP("term_id");
      rows = await run(`SELECT c.code, c.name, t.name AS term, COUNT(e.id) AS enrolled, SUM(r.id IS NOT NULL) AS marked FROM ins_enrollments e JOIN ins_courses c ON c.id = e.course_id JOIN ins_terms t ON t.id = e.term_id LEFT JOIN ins_results r ON r.enrollment_id = e.id
        WHERE e.institution_id = ? AND e.status != 'dropped'${term ? " AND e.term_id = ?" : ""} GROUP BY e.course_id, e.term_id ORDER BY c.code`, ...term ? [term] : []);
      cols = [["code", "Code"], ["name", "Course"], ["term", "Term"], ["enrolled", "Enrolled"], ["marked", "Marks entered"]];
      break;
    }
    case "performance": {
      const term = intP("term_id");
      const prog = intP("programme_id");
      rows = await run(`SELECT c.code, c.name, COUNT(*) AS students, ROUND(AVG(r.marks),1) AS average, MAX(r.marks) AS highest, MIN(r.marks) AS lowest, ROUND(100.0 * SUM(r.marks >= 40) / COUNT(*), 0) AS pass_rate
        FROM ins_results r JOIN ins_courses c ON c.id = r.course_id WHERE r.institution_id = ?${term ? " AND r.term_id = ?" : ""}${prog ? " AND c.programme_id = ?" : ""} GROUP BY c.id ORDER BY c.code`, ...[term, prog].filter(Boolean));
      cols = [["code", "Code"], ["name", "Course"], ["students", "Students"], ["average", "Average"], ["highest", "Highest"], ["lowest", "Lowest"], ["pass_rate", "Pass rate %"]];
      break;
    }
    case "programme_stats": {
      rows = await run(`SELECT COALESCE(p.name,'(No programme)') AS programme, d.name AS department, COUNT(*) AS students, SUM(s.status='active') AS active, SUM(s.status='graduated') AS graduated, SUM(s.gender='female') AS female, SUM(s.gender='male') AS male
        FROM ins_students s LEFT JOIN ins_programmes p ON p.id = s.programme_id LEFT JOIN ins_departments d ON d.id = p.department_id WHERE s.institution_id = ? AND s.deleted_at IS NULL GROUP BY p.id ORDER BY students DESC`);
      cols = [["programme", "Programme"], ["department", "Department"], ["students", "Students"], ["active", "Active"], ["graduated", "Graduated"], ["female", "Female"], ["male", "Male"]];
      break;
    }
    case "system_activity": {
      const d = dateSql("substr(a.created_at,1,10)");
      rows = await run(`SELECT a.created_at, u.name AS user, a.module, a.action, a.entity, a.details, a.status FROM ins_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE a.institution_id = ?${d.sql} ORDER BY a.id DESC LIMIT 2000`, ...d.binds);
      cols = [["created_at", "When (UTC)"], ["user", "User"], ["module", "Module"], ["action", "Action"], ["details", "Details"], ["status", "Result"]];
      break;
    }
    case "resource_stats": {
      const r = (await run(`SELECT (SELECT COUNT(*) FROM ins_books WHERE institution_id = ?1 AND deleted_at IS NULL) AS titles, (SELECT COUNT(*) FROM ins_book_copies WHERE institution_id = ?1) AS copies,
        (SELECT COUNT(*) FROM ins_resources WHERE institution_id = ?1 AND deleted_at IS NULL) AS digital, (SELECT COALESCE(SUM(file_size),0) FROM ins_resources WHERE institution_id = ?1 AND deleted_at IS NULL) AS bytes,
        (SELECT COUNT(*) FROM ins_students WHERE institution_id = ?1 AND deleted_at IS NULL) AS students, (SELECT COUNT(*) FROM ins_staff WHERE institution_id = ?1 AND deleted_at IS NULL) AS staff,
        (SELECT COUNT(*) FROM ins_loans WHERE institution_id = ?1) AS loans, (SELECT COUNT(*) FROM ins_courses WHERE institution_id = ?1) AS courses`))[0];
      rows = [["Book titles", r.titles], ["Physical copies", r.copies], ["Digital resources", r.digital], ["Digital storage (MB)", round23(r.bytes / 1048576)], ["Students", r.students], ["Staff", r.staff], ["Courses", r.courses], ["Loans recorded", r.loans]].map(([k, v]) => ({ item: k, value: v }));
      cols = [["item", "Item"], ["value", "Value"]];
      break;
    }
    default:
      fail(404, "That report does not exist.");
  }
  return { key, title: REPORTS[key].title, columns: cols.map(([k, l]) => ({ key: k, label: l })), rows, summary: summary2, generated: (/* @__PURE__ */ new Date()).toISOString(), currency: ctx.inst.currency };
}
__name(buildReport3, "buildReport");
var runReport3 = secure3(async ({ request, env, params, url, ctx }) => {
  const def = REPORTS[params.key];
  if (!def) fail(404, "That report does not exist.");
  if (!can4(ctx, def.perm)) fail(403, "You do not have permission to perform this action.");
  const rep = await buildReport3(env, ctx, params.key, url.searchParams);
  if (url.searchParams.get("format") === "csv") {
    const { audit: audit4 } = await Promise.resolve().then(() => (init_institution_auth(), institution_auth_exports));
    await audit4(env, request, ctx, "reports", "report.export", "report", null, `${def.title} (CSV)`);
    return new Response(toCsv(rep.columns, rep.rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="${params.key}-${localToday(ctx.off)}.csv"`, "Cache-Control": "no-store" } });
  }
  return json(rep);
});
var auditLog = secure3({ perm: "audit.view" }, async ({ env, url, ctx }) => {
  const sp = url.searchParams;
  const { page, limit, offset } = paging(url, 30, 100);
  const where = ["a.institution_id = ?1"];
  const binds = [ctx.inst.id];
  const add = /* @__PURE__ */ __name((sql, v) => {
    where.push(sql.replace("?", `?${binds.length + 1}`));
    binds.push(v);
  }, "add");
  if (sp.get("module")) add("a.module = ?", V.str(sp.get("module"), "Module", { max: 30 }));
  if (sp.get("status")) add("a.status = ?", V.oneOf(sp.get("status"), "Result", ["success", "failed"], { required: true }));
  if (sp.get("user_id")) add("a.user_id = ?", V.int(sp.get("user_id"), "User", { min: 1 }));
  if (sp.get("q")) add(`(a.action LIKE ? ESCAPE '\\' OR a.details LIKE ?1 ESCAPE '\\')`.replace("?1", `?${binds.length + 1}`), likeTerm(sp.get("q")));
  if (sp.get("from")) add("substr(a.created_at,1,10) >= ?", V.date(sp.get("from"), "From"));
  if (sp.get("to")) add("substr(a.created_at,1,10) <= ?", V.date(sp.get("to"), "To"));
  const from = `FROM ins_audit_logs a LEFT JOIN users u ON u.id = a.user_id WHERE ${where.join(" AND ")}`;
  const [{ results }, c, mods] = await Promise.all([
    env.DB.prepare(`SELECT a.id, a.created_at, a.module, a.action, a.entity, a.entity_id, a.details, a.status, a.ip, a.user_agent, u.name AS user ${from} ORDER BY a.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n ${from}`).bind(...binds).first(),
    env.DB.prepare("SELECT DISTINCT module FROM ins_audit_logs WHERE institution_id = ? AND module IS NOT NULL ORDER BY module").bind(ctx.inst.id).all()
  ]);
  return json({ logs: results, total: c.n, page, limit, modules: mods.results.map((m) => m.module) });
});
var health = secure3({ perm: "health.view" }, async ({ env, ctx }) => {
  const id = ctx.inst.id;
  const checks = [];
  const t0 = Date.now();
  let dbOk = true;
  try {
    await env.DB.prepare("SELECT 1").first();
  } catch (e) {
    dbOk = false;
  }
  checks.push({ key: "database", label: "Database", ok: dbOk, detail: dbOk ? `Responding (${Date.now() - t0} ms)` : "Not responding \u2014 please contact your technical administrator." });
  const storageOk = !!env.MATERIALS;
  checks.push({ key: "storage", label: "File storage", ok: storageOk, detail: storageOk ? "Connected" : "Not configured \u2014 uploads and backups will not work." });
  const [files, err, logins, lastBackup, loans, last] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(file_size),0) AS bytes FROM ins_resources WHERE institution_id = ? AND deleted_at IS NULL`).bind(id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_audit_logs WHERE institution_id = ? AND status = 'failed' AND created_at > datetime('now','-1 day')`).bind(id).first(),
    env.DB.prepare(`SELECT SUM(a.action = 'user.login' AND a.status = 'success') AS ok, SUM(a.action = 'user.login' AND a.status = 'failed') AS bad FROM ins_audit_logs a WHERE a.institution_id = ? AND a.created_at > datetime('now','-1 day')`).bind(id).first(),
    env.DB.prepare("SELECT created_at, verified_ok FROM ins_backups WHERE institution_id = ? ORDER BY id DESC LIMIT 1").bind(id).first(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_loans WHERE institution_id = ?`).bind(id).first(),
    env.DB.prepare("SELECT created_at FROM ins_audit_logs WHERE institution_id = ? ORDER BY id DESC LIMIT 1").bind(id).first()
  ]);
  const ageDays = lastBackup ? (Date.now() - Date.parse(lastBackup.created_at.replace(" ", "T") + "Z")) / 864e5 : null;
  checks.push({
    key: "backup",
    label: "Backups",
    ok: ageDays != null && ageDays <= 7,
    warn: ageDays == null || ageDays > 7,
    detail: ageDays == null ? "No backup yet. Create one in Backup & restore." : ageDays > 7 ? `The last backup is ${Math.floor(ageDays)} days old. Please create a new one.` : `Last backup ${ageDays < 1 ? "today" : Math.floor(ageDays) + " day(s) ago"}${lastBackup.verified_ok === 0 ? " \u2014 FAILED verification!" : ""}`
  });
  checks.push({ key: "errors", label: "Failed actions (24 h)", ok: n(err.n) < 10, detail: `${n(err.n)} failed action(s) in the last 24 hours` });
  checks.push({ key: "auth", label: "Sign-ins (24 h)", ok: n(logins.bad) < 20, detail: `${n(logins.ok)} successful, ${n(logins.bad)} failed` });
  checks.push({ key: "api", label: "Service", ok: true, detail: "Running" });
  return json({ checks, storage: { files: files.n, mb: round23(files.bytes / 1048576) }, loans_recorded: loans.n, last_activity: last ? last.created_at : null, all_ok: checks.every((c) => c.ok) });
});

// src/handlers/institution/tools.js
init_auth();
init_institution_auth();
var MAX_IMPORT_ROWS = 500;
var norm = /* @__PURE__ */ __name((s) => String(s == null ? "" : s).trim().toLowerCase(), "norm");
var IMPORT_FIELDS = {
  books: [
    ["title", "Title", 1],
    ["author", "Author", 1],
    ["isbn", "ISBN"],
    ["publisher", "Publisher"],
    ["pub_year", "Publication year"],
    ["edition", "Edition"],
    ["category", "Category"],
    ["subject", "Subject"],
    ["language", "Language"],
    ["copies", "Number of copies"],
    ["shelf", "Shelf / location"],
    ["classification_no", "Classification number"],
    ["description", "Description"],
    ["price", "Price"],
    ["acquisition_date", "Acquisition date"],
    ["acquisition_source", "Acquisition source"],
    ["notes", "Notes"]
  ],
  students: [
    ["full_name", "Full name", 1],
    ["student_no", "Student ID"],
    ["reg_no", "Registration number"],
    ["gender", "Gender"],
    ["dob", "Date of birth"],
    ["phone", "Phone"],
    ["email", "Email"],
    ["address", "Address"],
    ["programme", "Programme"],
    ["department", "Department"],
    ["class_name", "Class"],
    ["level", "Year / level"],
    ["admission_date", "Admission date"],
    ["status", "Status"],
    ["guardian_name", "Guardian name"],
    ["guardian_phone", "Guardian phone"],
    ["guardian_relation", "Guardian relationship"]
  ],
  staff: [["full_name", "Full name", 1], ["staff_no", "Staff number"], ["gender", "Gender"], ["phone", "Phone"], ["email", "Email"], ["position", "Position"], ["department", "Department"], ["hired_on", "Hire date"], ["status", "Status"]]
};
var importFields = secure3({ perm: "import.manage" }, async () => json({
  fields: Object.fromEntries(Object.entries(IMPORT_FIELDS).map(([k, v]) => [k, v.map(([key, label2, req]) => ({ key, label: label2, required: !!req }))])),
  max_rows: MAX_IMPORT_ROWS
}));
async function lookupMaps(env, instId) {
  const q = /* @__PURE__ */ __name((sql) => env.DB.prepare(sql).bind(instId).all().then((r) => r.results), "q");
  const [cats, progs, depts, isbns, studentNos, staffNos] = await Promise.all([
    q("SELECT id, name FROM ins_categories WHERE institution_id = ?"),
    q("SELECT id, name FROM ins_programmes WHERE institution_id = ?"),
    q("SELECT id, name FROM ins_departments WHERE institution_id = ?"),
    q(`SELECT isbn FROM ins_books WHERE institution_id = ? AND deleted_at IS NULL AND isbn IS NOT NULL`),
    q("SELECT student_no FROM ins_students WHERE institution_id = ?"),
    q("SELECT staff_no FROM ins_staff WHERE institution_id = ?")
  ]);
  const by = /* @__PURE__ */ __name((list) => new Map(list.map((r) => [norm(r.name), r.id])), "by");
  return { cats: by(cats), progs: by(progs), depts: by(depts), isbns: new Set(isbns.map((r) => r.isbn)), studentNos: new Set(studentNos.map((r) => norm(r.student_no))), staffNos: new Set(staffNos.map((r) => norm(r.staff_no))) };
}
__name(lookupMaps, "lookupMaps");
function validateRows(kind, rows, maps) {
  const seenIsbn = /* @__PURE__ */ new Set();
  const seenNo = /* @__PURE__ */ new Set();
  const out = [];
  rows.forEach((raw, i) => {
    const errors = [];
    let data = null;
    try {
      if (kind === "books") {
        const r = { ...raw };
        if (r.category) {
          const id = maps.cats.get(norm(r.category));
          r.category_id = id || null;
        }
        data = readBook(r);
        data.category_name = r.category ? String(r.category).trim() : null;
        data.copies = V.int(raw.copies === "" || raw.copies == null ? 1 : raw.copies, "Number of copies", { min: 1, max: 200 });
        if (data.isbn) {
          if (maps.isbns.has(data.isbn)) errors.push("This ISBN is already in the catalogue.");
          else if (seenIsbn.has(data.isbn)) errors.push("This ISBN appears twice in the file.");
          seenIsbn.add(data.isbn);
        }
      } else if (kind === "students") {
        const r = { ...raw };
        if (r.programme) {
          const id = maps.progs.get(norm(r.programme));
          if (!id) errors.push(`Programme "${r.programme}" does not exist. Create it first in Settings.`);
          r.programme_id = id || null;
        }
        if (r.department) {
          const id = maps.depts.get(norm(r.department));
          if (!id) errors.push(`Department "${r.department}" does not exist. Create it first in Settings.`);
          r.department_id = id || null;
        }
        if (r.gender) r.gender = norm(r.gender).replace(/^m$/, "male").replace(/^f$/, "female");
        data = readStudent(r);
        if (data.student_no) {
          const k = norm(data.student_no);
          if (maps.studentNos.has(k)) errors.push(`Student ID ${data.student_no} already exists.`);
          else if (seenNo.has(k)) errors.push(`Student ID ${data.student_no} appears twice in the file.`);
          seenNo.add(k);
        }
      } else {
        const r = { ...raw };
        if (r.department) {
          const id = maps.depts.get(norm(r.department));
          if (!id) errors.push(`Department "${r.department}" does not exist. Create it first in Settings.`);
          r.department_id = id || null;
        }
        if (r.gender) r.gender = norm(r.gender).replace(/^m$/, "male").replace(/^f$/, "female");
        data = readStaff(r);
        if (data.staff_no) {
          const k = norm(data.staff_no);
          if (maps.staffNos.has(k)) errors.push(`Staff number ${data.staff_no} already exists.`);
          else if (seenNo.has(k)) errors.push(`Staff number ${data.staff_no} appears twice in the file.`);
          seenNo.add(k);
        }
      }
    } catch (e) {
      errors.push(e instanceof HttpError ? e.message : "This row could not be read.");
    }
    out.push({ row: i + 1, data: errors.length ? null : data, errors });
  });
  return out;
}
__name(validateRows, "validateRows");
function readImportBody(b) {
  const kind = V.oneOf(b.kind, "Import type", ["books", "students", "staff"], { required: true });
  if (!Array.isArray(b.rows) || !b.rows.length) fail(400, "The file has no rows to import.");
  if (b.rows.length > MAX_IMPORT_ROWS) fail(400, `Please import at most ${MAX_IMPORT_ROWS} rows at a time. Split the file and import it in parts.`);
  const allowed = new Set(IMPORT_FIELDS[kind].map((f) => f[0]));
  const rows = b.rows.map((r) => {
    const o = {};
    for (const k of Object.keys(r || {})) if (allowed.has(k)) o[k] = r[k] == null ? "" : String(r[k]);
    return o;
  });
  return { kind, rows, filename: V.str(b.filename, "File name", { max: 120 }) };
}
__name(readImportBody, "readImportBody");
var importValidate = secure3({ perm: "import.manage" }, async ({ env, request, ctx }) => {
  const { kind, rows } = readImportBody(await readJson(request));
  const res = validateRows(kind, rows, await lookupMaps(env, ctx.inst.id));
  const bad = res.filter((r) => r.errors.length);
  const preview = res.slice(0, 8).map((r) => ({ row: r.row, ok: !r.errors.length, ...rows[r.row - 1] }));
  return json({ total: rows.length, valid: rows.length - bad.length, invalid: bad.length, errors: bad.slice(0, 200).map((r) => ({ row: r.row, errors: r.errors })), preview });
});
var importCommit = secure3({ perm: "import.manage" }, async ({ env, request, ctx }) => {
  const b = await readJson(request);
  const { kind, rows, filename } = readImportBody(b);
  const maps = await lookupMaps(env, ctx.inst.id);
  const res = validateRows(kind, rows, maps);
  const bad = res.filter((r) => r.errors.length);
  if (bad.length && !b.skip_invalid) fail(400, `${bad.length} row(s) have errors. Fix them, or choose to skip the invalid rows.`);
  let done = 0;
  const failed = [];
  for (const r of res.filter((x) => !x.errors.length)) {
    try {
      if (kind === "books") {
        const d = r.data;
        let catId = d.category_id;
        if (!catId && d.category_name) {
          await env.DB.prepare("INSERT OR IGNORE INTO ins_categories (institution_id, name) VALUES (?, ?)").bind(ctx.inst.id, d.category_name).run();
          const c = await env.DB.prepare("SELECT id FROM ins_categories WHERE institution_id = ? AND name = ? COLLATE NOCASE").bind(ctx.inst.id, d.category_name).first();
          catId = c ? c.id : null;
        }
        const ins = await env.DB.prepare(
          `INSERT INTO ins_books (institution_id, isbn, title, author, publisher, pub_year, edition, category_id, subject, language, description, shelf, classification_no, acquisition_date, acquisition_source, price, notes)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        ).bind(ctx.inst.id, d.isbn, d.title, d.author, d.publisher, d.pub_year, d.edition, catId, d.subject, d.language, d.description, d.shelf, d.classification_no, d.acquisition_date, d.acquisition_source, d.price, d.notes).run();
        await addCopies(env, ctx, ins.meta.last_row_id, d.copies);
      } else if (kind === "students") await insertStudent(env, ctx, r.data);
      else await insertStaff(env, ctx, r.data);
      done++;
    } catch (e) {
      failed.push({ row: r.row, errors: [e instanceof HttpError ? e.message : "Could not be saved."] });
    }
  }
  const skipped = rows.length - done;
  await env.DB.prepare("INSERT INTO ins_imports (institution_id, kind, filename, total_rows, imported_rows, skipped_rows, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(ctx.inst.id, kind, filename, rows.length, done, skipped, ctx.user.id).run();
  await audit3(env, request, ctx, "import", `import.${kind}`, "import", null, `${done} imported, ${skipped} skipped (${filename || "file"})`);
  return json({ ok: true, total: rows.length, imported: done, skipped, errors: [...bad.map((r) => ({ row: r.row, errors: r.errors })), ...failed].slice(0, 200) });
});
var importHistory = secure3({ perm: "import.manage" }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(`SELECT i.id, i.kind, i.filename, i.total_rows, i.imported_rows, i.skipped_rows, i.created_at, u.name AS user FROM ins_imports i LEFT JOIN users u ON u.id = i.user_id WHERE i.institution_id = ? ORDER BY i.id DESC LIMIT 20`).bind(ctx.inst.id).all();
  return json({ imports: results });
});
var BACKUP_TABLES = [
  "ins_departments",
  "ins_programmes",
  "ins_academic_years",
  "ins_terms",
  "ins_staff",
  "ins_students",
  "ins_courses",
  "ins_teaching",
  "ins_enrollments",
  "ins_results",
  "ins_categories",
  "ins_books",
  "ins_book_copies",
  "ins_loans",
  "ins_reservations",
  "ins_fines",
  "ins_resource_categories",
  "ins_resources",
  "ins_announcements"
];
var MAX_ROWS_PER_TABLE = 5e4;
var KEEP_BACKUPS = 10;
var hex = /* @__PURE__ */ __name((buf) => [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join(""), "hex");
async function sha256(text) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}
__name(sha256, "sha256");
async function createBackup(env, instId, userId) {
  if (!env.MATERIALS) fail(500, "File storage is not configured, so backups cannot be saved.");
  const data = {};
  const counts = {};
  for (const t of BACKUP_TABLES) {
    const { results } = await env.DB.prepare(`SELECT * FROM ${t} WHERE institution_id = ? LIMIT ${MAX_ROWS_PER_TABLE + 1}`).bind(instId).all();
    if (results.length > MAX_ROWS_PER_TABLE) fail(413, "This institution is too large for a one-file backup. Please contact support.");
    data[t] = results;
    counts[t] = results.length;
  }
  const inst = await env.DB.prepare("SELECT name, short_name, slug, inst_type, currency FROM ins_institutions WHERE id = ?").bind(instId).first();
  const { results: settings } = await env.DB.prepare("SELECT key, value FROM ins_settings WHERE institution_id = ?").bind(instId).all();
  const { results: perms } = await env.DB.prepare("SELECT role, permission FROM ins_role_permissions WHERE institution_id = ?").bind(instId).all();
  const payload = JSON.stringify({ app: "Smart21Institution", format: 1, created: (/* @__PURE__ */ new Date()).toISOString(), institution: inst, tables: data, settings, role_permissions: perms });
  const checksum = await sha256(payload);
  const key = `institution/${instId}/backups/${(/* @__PURE__ */ new Date()).toISOString().replace(/[:.]/g, "-")}-${randomToken2(4)}.json`;
  await env.MATERIALS.put(key, payload, { httpMetadata: { contentType: "application/json" } });
  const r = await env.DB.prepare("INSERT INTO ins_backups (institution_id, file_key, size_bytes, row_counts, checksum, created_by) VALUES (?, ?, ?, ?, ?, ?)").bind(instId, key, payload.length, JSON.stringify(counts), checksum, userId || null).run();
  const { results: old } = await env.DB.prepare("SELECT id, file_key FROM ins_backups WHERE institution_id = ? ORDER BY id DESC LIMIT -1 OFFSET ?").bind(instId, KEEP_BACKUPS).all();
  for (const o of old) {
    await env.MATERIALS.delete(o.file_key).catch(() => {
    });
    await env.DB.prepare("DELETE FROM ins_backups WHERE id = ?").bind(o.id).run();
  }
  return { id: r.meta.last_row_id, size_bytes: payload.length, counts };
}
__name(createBackup, "createBackup");
async function runScheduledBackups(env) {
  const { results } = await env.DB.prepare(
    `SELECT i.id FROM ins_institutions i WHERE COALESCE((SELECT MAX(created_at) FROM ins_backups b WHERE b.institution_id = i.id), '2000-01-01') < datetime('now','-7 days') LIMIT 20`
  ).all();
  for (const i of results) {
    try {
      await createBackup(env, i.id, null);
      await env.DB.prepare(`INSERT INTO ins_audit_logs (institution_id, module, action, details) VALUES (?, 'backup', 'backup.scheduled', 'Weekly automatic backup')`).bind(i.id).run();
    } catch (e) {
      await env.DB.prepare(`INSERT INTO ins_audit_logs (institution_id, module, action, details, status) VALUES (?, 'backup', 'backup.scheduled', 'Automatic backup failed', 'failed')`).bind(i.id).run().catch(() => {
      });
    }
  }
}
__name(runScheduledBackups, "runScheduledBackups");
var listBackups = secure3({ perm: "backup.manage" }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(`SELECT b.id, b.size_bytes, b.row_counts, b.checksum, b.verified_at, b.verified_ok, b.created_at, u.name AS created_by FROM ins_backups b LEFT JOIN users u ON u.id = b.created_by WHERE b.institution_id = ? ORDER BY b.id DESC`).bind(ctx.inst.id).all();
  return json({ backups: results.map((b) => ({ ...b, row_counts: JSON.parse(b.row_counts || "{}"), checksum: b.checksum.slice(0, 12) })), keep: KEEP_BACKUPS });
});
var makeBackup = secure3({ perm: "backup.manage" }, async ({ request, env, ctx }) => {
  const r = await createBackup(env, ctx.inst.id, ctx.user.id);
  await audit3(env, request, ctx, "backup", "backup.create", "backup", r.id, `${Math.round(r.size_bytes / 1024)} KB`);
  return json({ ok: true, ...r }, { status: 201 });
});
async function loadBackupFile(env, ctx, id) {
  const b = await env.DB.prepare("SELECT * FROM ins_backups WHERE id = ? AND institution_id = ?").bind(id, ctx.inst.id).first();
  if (!b) fail(404, "The backup could not be found.");
  const obj = env.MATERIALS ? await env.MATERIALS.get(b.file_key) : null;
  return { b, obj };
}
__name(loadBackupFile, "loadBackupFile");
var verifyBackup = secure3({ perm: "backup.manage" }, async ({ request, env, params, ctx }) => {
  const { b, obj } = await loadBackupFile(env, ctx, params.id);
  let ok = false;
  let detail = "The backup file is missing from storage.";
  if (obj) {
    const text = await obj.text();
    if (await sha256(text) !== b.checksum) detail = "The file does not match its checksum \u2014 it may be damaged.";
    else {
      try {
        const parsed = JSON.parse(text);
        const want = JSON.parse(b.row_counts || "{}");
        const mismatch = BACKUP_TABLES.filter((t) => (parsed.tables?.[t]?.length ?? -1) !== want[t]);
        ok = !mismatch.length;
        detail = ok ? "The file is complete and readable. It can be restored." : `Row counts differ for: ${mismatch.join(", ")}.`;
      } catch (e) {
        detail = "The file could not be read.";
      }
    }
  }
  await env.DB.prepare(`UPDATE ins_backups SET verified_at = datetime('now'), verified_ok = ? WHERE id = ?`).bind(ok ? 1 : 0, b.id).run();
  await audit3(env, request, ctx, "backup", "backup.verify", "backup", b.id, detail, ok ? "success" : "failed");
  return json({ ok, detail });
});
var downloadBackup = secure3({ perm: "backup.manage" }, async ({ request, env, params, ctx }) => {
  const { b, obj } = await loadBackupFile(env, ctx, params.id);
  if (!obj) fail(404, "The backup file is missing from storage.");
  await audit3(env, request, ctx, "backup", "backup.download", "backup", b.id, null);
  return new Response(obj.body, { headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="${ctx.inst.slug}-backup-${b.created_at.slice(0, 10)}.json"`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } });
});
var deleteBackup = secure3({ perm: "backup.manage" }, async ({ request, env, params, ctx }) => {
  const { b } = await loadBackupFile(env, ctx, params.id);
  if (env.MATERIALS) await env.MATERIALS.delete(b.file_key).catch(() => {
  });
  await env.DB.prepare("DELETE FROM ins_backups WHERE id = ?").bind(b.id).run();
  await audit3(env, request, ctx, "backup", "backup.delete", "backup", b.id, null);
  return json({ ok: true });
});
var restoreBackup2 = secure3({ perm: "backup.manage", roles: ["super_admin"] }, async ({ request, env, params, ctx }) => {
  const body = await readJson(request);
  if (String(body.confirm || "").trim() !== "RESTORE") fail(400, "Type RESTORE to confirm.");
  const { b, obj } = await loadBackupFile(env, ctx, params.id);
  if (!obj) fail(404, "The backup file is missing from storage.");
  const text = await obj.text();
  if (await sha256(text) !== b.checksum) fail(409, "This backup failed its integrity check and cannot be restored.");
  const parsed = JSON.parse(text);
  if (parsed.app !== "Smart21Institution" || !parsed.tables) fail(409, "This is not a valid Smart21Institution backup.");
  const cols = {};
  for (const t of BACKUP_TABLES) {
    const { results } = await env.DB.prepare(`PRAGMA table_info(${t})`).all();
    cols[t] = new Set(results.map((c) => c.name));
  }
  const safety = await createBackup(env, ctx.inst.id, ctx.user.id);
  for (const t of [...BACKUP_TABLES].reverse()) await env.DB.prepare(`DELETE FROM ${t} WHERE institution_id = ?`).bind(ctx.inst.id).run();
  let restored = 0;
  for (const t of BACKUP_TABLES) {
    const stmts = [];
    for (const row of parsed.tables[t] || []) {
      const keys = Object.keys(row).filter((k) => cols[t].has(k) && k !== "institution_id");
      stmts.push(env.DB.prepare(`INSERT INTO ${t} (institution_id, ${keys.join(", ")}) VALUES (?${keys.map(() => ", ?").join("")})`).bind(ctx.inst.id, ...keys.map((k) => row[k])));
    }
    for (const part of chunk(stmts, 90)) await env.DB.batch(part);
    restored += stmts.length;
  }
  await audit3(env, request, ctx, "backup", "backup.restore", "backup", b.id, `${restored} records restored; safety backup #${safety.id}`);
  return json({ ok: true, restored, safety_backup_id: safety.id });
});

// src/handlers/institution/demo.js
init_auth();
init_institution_auth();
var NAMES = [
  "Amina Juma",
  "Baraka Mushi",
  "Catherine Mollel",
  "Daudi Kessy",
  "Esther Mwakyusa",
  "Faraja Lyimo",
  "George Massawe",
  "Halima Said",
  "Isaac Mrema",
  "Joyce Kimaro",
  "Khamis Ally",
  "Lilian Shayo",
  "Musa Mwita",
  "Neema Kisanga",
  "Omari Bakari",
  "Pendo Mtui",
  "Rashid Hamisi",
  "Salma Nyerere",
  "Tumaini Mallya",
  "Upendo Swai"
];
var BOOKS = [
  ["Things Fall Apart", "Chinua Achebe", "Fiction", 1958],
  ["Introduction to Algorithms", "Thomas H. Cormen", "Technology", 2009],
  ["A Brief History of Time", "Stephen Hawking", "Science", 1988],
  ["Kiswahili Sanifu", "TUKI", "Languages", 2004],
  ["Calculus: Early Transcendentals", "James Stewart", "Mathematics", 2015],
  ["Half of a Yellow Sun", "Chimamanda Ngozi Adichie", "Fiction", 2006],
  ["Africa: A Biography of the Continent", "John Reader", "History & Geography", 1997],
  ["Clean Code", "Robert C. Martin", "Technology", 2008],
  ["Principles of Economics", "N. Gregory Mankiw", "General", 2020],
  ["The Selfish Gene", "Richard Dawkins", "Science", 1976],
  ["Linear Algebra Done Right", "Sheldon Axler", "Mathematics", 2015],
  ["Oxford Dictionary of English", "Oxford University Press", "Reference", 2010]
];
var loadDemoData3 = secure3({ perm: "settings.manage", roles: ["super_admin", "admin"] }, async ({ request, env, ctx }) => {
  const id = ctx.inst.id;
  const used = await env.DB.prepare(`SELECT (SELECT COUNT(*) FROM ins_books WHERE institution_id = ?1) + (SELECT COUNT(*) FROM ins_students WHERE institution_id = ?1) + (SELECT COUNT(*) FROM ins_staff WHERE institution_id = ?1) AS n`).bind(id).first();
  if (used.n) fail(409, "Sample data can only be added to an empty institution.");
  const today = localToday(ctx.off);
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO ins_departments (institution_id, name, code) VALUES (?, ?, ?)").bind(id, "Sciences", "SCI"),
    env.DB.prepare("INSERT OR IGNORE INTO ins_departments (institution_id, name, code) VALUES (?, ?, ?)").bind(id, "Humanities", "HUM")
  ]);
  const dep = Object.fromEntries((await env.DB.prepare("SELECT id, code FROM ins_departments WHERE institution_id = ?").bind(id).all()).results.map((d) => [d.code, d.id]));
  await env.DB.batch([
    env.DB.prepare("INSERT OR IGNORE INTO ins_programmes (institution_id, department_id, name, code, level, duration_years) VALUES (?, ?, ?, ?, ?, ?)").bind(id, dep.SCI, "Computer Science", "CS", "Diploma", 3),
    env.DB.prepare("INSERT OR IGNORE INTO ins_programmes (institution_id, department_id, name, code, level, duration_years) VALUES (?, ?, ?, ?, ?, ?)").bind(id, dep.HUM, "Languages & Literature", "LL", "Diploma", 3)
  ]);
  const prog = Object.fromEntries((await env.DB.prepare("SELECT id, code FROM ins_programmes WHERE institution_id = ?").bind(id).all()).results.map((p) => [p.code, p.id]));
  const staffRows = [["Dr. Grace Mushi", "Lecturer", "SCI"], ["Mr. Peter Kweka", "Lecturer", "HUM"], ["Ms. Zawadi Komba", "Librarian", "HUM"]];
  await env.DB.batch(staffRows.map(([n3, p, d], i) => env.DB.prepare("INSERT INTO ins_staff (institution_id, staff_no, full_name, position, department_id, status) VALUES (?, ?, ?, ?, ?, ?)").bind(id, `STF-${String(i + 1).padStart(4, "0")}`, n3, p, dep[d], "active")));
  const staff = (await env.DB.prepare("SELECT id FROM ins_staff WHERE institution_id = ? ORDER BY id").bind(id).all()).results;
  await env.DB.batch(NAMES.map((n3, i) => env.DB.prepare(
    `INSERT INTO ins_students (institution_id, student_no, reg_no, full_name, gender, programme_id, department_id, class_name, level, admission_date, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')`
  ).bind(id, `STU-${String(i + 1).padStart(4, "0")}`, `REG/${(/* @__PURE__ */ new Date()).getUTCFullYear()}/${String(i + 1).padStart(3, "0")}`, n3, i % 2 ? "male" : "female", i % 3 ? prog.CS : prog.LL, i % 3 ? dep.SCI : dep.HUM, i % 2 ? "Year 1 A" : "Year 1 B", "Year 1", `${(/* @__PURE__ */ new Date()).getUTCFullYear()}-01-15`)));
  const students = (await env.DB.prepare("SELECT id FROM ins_students WHERE institution_id = ? ORDER BY id").bind(id).all()).results;
  const cs = [["CS101", "Introduction to Programming", prog.CS, dep.SCI], ["CS102", "Discrete Mathematics", prog.CS, dep.SCI], ["LL101", "Kiswahili Literature", prog.LL, dep.HUM], ["LL102", "English Composition", prog.LL, dep.HUM]];
  await env.DB.batch(cs.map(([c, n3, p, d]) => env.DB.prepare("INSERT INTO ins_courses (institution_id, programme_id, department_id, code, name, credits) VALUES (?, ?, ?, ?, ?, 3)").bind(id, p, d, c, n3)));
  const courses = (await env.DB.prepare("SELECT id, code FROM ins_courses WHERE institution_id = ? ORDER BY id").bind(id).all()).results;
  const term = await env.DB.prepare("SELECT id FROM ins_terms WHERE institution_id = ? AND is_current = 1").bind(id).first();
  if (term) {
    await env.DB.batch(courses.map((c, i) => env.DB.prepare("INSERT INTO ins_teaching (institution_id, course_id, staff_id, term_id) VALUES (?, ?, ?, ?)").bind(id, c.id, staff[i < 2 ? 0 : 1].id, term.id)));
    const enr = [];
    students.forEach((s, i) => courses.forEach((c) => {
      if (c.code.startsWith("CS") && i % 3 || c.code.startsWith("LL") && !(i % 3)) enr.push([s.id, c.id]);
    }));
    for (const part of chunk(enr, 90)) await env.DB.batch(part.map(([s, c]) => env.DB.prepare("INSERT INTO ins_enrollments (institution_id, student_id, course_id, term_id) VALUES (?, ?, ?, ?)").bind(id, s, c, term.id)));
    const { results: e } = await env.DB.prepare("SELECT id, student_id, course_id FROM ins_enrollments WHERE institution_id = ?").bind(id).all();
    for (const part of chunk(e, 90)) await env.DB.batch(part.map((r) => {
      const marks = 35 + (r.id * 37 + r.student_id * 11) % 62;
      const g = gradeFor2(marks, DEFAULT_GRADING);
      return env.DB.prepare("INSERT INTO ins_results (institution_id, enrollment_id, student_id, course_id, term_id, marks, grade, points, entered_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, r.id, r.student_id, r.course_id, term.id, marks, g.grade, g.points, ctx.user.id);
    }));
  }
  const cats = Object.fromEntries((await env.DB.prepare("SELECT id, name FROM ins_categories WHERE institution_id = ?").bind(id).all()).results.map((c) => [c.name, c.id]));
  await env.DB.batch(BOOKS.map(([t, a, c, y], i) => env.DB.prepare(
    `INSERT INTO ins_books (institution_id, isbn, title, author, pub_year, category_id, shelf, language, description) VALUES (?, ?, ?, ?, ?, ?, ?, 'English', ?)`
  ).bind(id, `97800000${String(1e4 + i)}`.slice(0, 13), t, a, y, cats[c] || null, `${c.slice(0, 1)}-${i % 4 + 1}`, "Sample record added with the demo data.")));
  const books = (await env.DB.prepare("SELECT id FROM ins_books WHERE institution_id = ? ORDER BY id").bind(id).all()).results;
  const copyStmts = [];
  let n2 = 0;
  books.forEach((b, i) => {
    for (let c = 0; c < i % 3 + 1; c++) {
      n2++;
      const no = `ACC-${String(n2).padStart(5, "0")}`;
      copyStmts.push(env.DB.prepare("INSERT INTO ins_book_copies (institution_id, book_id, accession_no, barcode) VALUES (?, ?, ?, ?)").bind(id, b.id, no, no));
    }
  });
  for (const part of chunk(copyStmts, 90)) await env.DB.batch(part);
  const copies = (await env.DB.prepare("SELECT id, book_id FROM ins_book_copies WHERE institution_id = ? ORDER BY id").bind(id).all()).results;
  const first = /* @__PURE__ */ __name((bookIdx) => copies.find((c) => c.book_id === books[bookIdx].id), "first");
  const loanPlan = [[0, 0, addDays3(today, -3), addDays3(today, 11), "borrowed"], [1, 1, addDays3(today, -20), addDays3(today, -6), "borrowed"], [2, 3, addDays3(today, -1), addDays3(today, 13), "borrowed"], [3, 4, addDays3(today, -30), addDays3(today, -16), "returned"]];
  for (const [sIdx, bIdx, issued, due, status] of loanPlan) {
    const copy = first(bIdx);
    if (!copy) continue;
    await env.DB.prepare(`INSERT INTO ins_loans (institution_id, copy_id, book_id, borrower_type, borrower_id, issued_on, due_date, returned_on, status, return_condition, issued_by) VALUES (?, ?, ?, 'student', ?, ?, ?, ?, ?, ?, ?)`).bind(id, copy.id, copy.book_id, students[sIdx].id, issued, due, status === "returned" ? addDays3(today, -18) : null, status, status === "returned" ? "good" : null, ctx.user.id).run();
    if (status === "borrowed") await env.DB.prepare(`UPDATE ins_book_copies SET status = 'borrowed' WHERE id = ?`).bind(copy.id).run();
  }
  await env.DB.prepare("INSERT INTO ins_announcements (institution_id, title, body, audience, pinned, author_id) VALUES (?, ?, ?, ?, 1, ?)").bind(id, "Welcome to the new library system", "Search the catalogue, reserve books and read digital resources online. Ask the library desk if you need help.", "public", ctx.user.id).run();
  await audit3(env, request, ctx, "system", "demo.load", "institution", id, "Sample data loaded");
  return json({ ok: true, students: students.length, books: books.length });
});

// src/handlers/institution/site.js
init_auth();
init_institution_auth();
var BLOCK_TYPES = [
  "hero",
  "text",
  "cards",
  "stats",
  "news",
  "events",
  "announcements",
  "library",
  "apply",
  "register",
  "contact",
  "faq",
  "gallery",
  "cta",
  "quote",
  "leader",
  "spacer",
  "slider",
  "quicklinks",
  "steps"
];
var MAX_BLOCKS = 60;
var MAX_PAGE_BYTES = 200 * 1024;
function safeLink(v) {
  const s = String(v == null ? "" : v).trim().slice(0, 500);
  if (!s) return "";
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  if (s.startsWith("#") || s.startsWith("/") && !s.startsWith("//")) return s;
  return "";
}
__name(safeLink, "safeLink");
function safeImage(v) {
  const s = String(v == null ? "" : v).trim().slice(0, 500);
  if (/^m:\d{1,10}$/.test(s)) return s;
  if (/^https:\/\//i.test(s)) return s;
  return "";
}
__name(safeImage, "safeImage");
var ICON_KEY = /^icon$/i;
var LINK_KEY = /(link|url|href)$/i;
var IMAGE_KEY = /^(image|logo|photo|img|bg)$/i;
function clean(v, depth = 0, key = "") {
  if (typeof v === "string") {
    if (ICON_KEY.test(key)) return /^fa-[a-z0-9-]{2,40}$/.test(v) ? v : "";
    if (IMAGE_KEY.test(key)) return safeImage(v);
    if (LINK_KEY.test(key)) return safeLink(v);
    return v.slice(0, 5e3);
  }
  if (typeof v === "number") return Number.isFinite(v) ? v : 0;
  if (typeof v === "boolean") return v;
  if (Array.isArray(v)) return depth > 3 ? [] : v.slice(0, 40).map((x) => clean(x, depth + 1, key));
  if (v && typeof v === "object") {
    if (depth > 3) return {};
    const o = {};
    for (const [k, val] of Object.entries(v).slice(0, 40)) {
      if (!/^[a-z_][a-z0-9_]{0,30}$/i.test(k)) continue;
      o[k] = clean(val, depth + 1, k);
    }
    return o;
  }
  return null;
}
__name(clean, "clean");
function cleanBlocks(input) {
  if (!Array.isArray(input)) fail(400, "Page content must be a list of blocks.");
  if (input.length > MAX_BLOCKS) fail(400, `A page can have at most ${MAX_BLOCKS} blocks.`);
  const out = [];
  for (const b of input) {
    if (!b || typeof b !== "object" || !BLOCK_TYPES.includes(b.type)) continue;
    const c = clean(b, 0, "");
    c.type = b.type;
    c.id = String(b.id || "").replace(/[^a-z0-9_-]/gi, "").slice(0, 20) || Math.random().toString(36).slice(2, 9);
    out.push(c);
  }
  const text = JSON.stringify(out);
  if (text.length > MAX_PAGE_BYTES) fail(400, "This page is too large. Remove some content or split it into two pages.");
  return out;
}
__name(cleanBlocks, "cleanBlocks");
var parse = /* @__PURE__ */ __name((s, def) => {
  try {
    const v = JSON.parse(s);
    return v && typeof v === "object" ? v : def;
  } catch (e) {
    return def;
  }
}, "parse");
async function publicInstitution(env, slug) {
  const i = await env.DB.prepare(
    "SELECT id, name, short_name, slug, inst_type, about, phone, email, address, website, primary_color, is_public, logo_key FROM ins_institutions WHERE slug = ?"
  ).bind(slug).first();
  if (!i) fail(404, "This website could not be found.");
  return i;
}
__name(publicInstitution, "publicInstitution");
async function publicSite(env, slug) {
  const i = await publicInstitution(env, slug);
  const cfg = await env.DB.prepare("SELECT * FROM ins_site_config WHERE institution_id = ?").bind(i.id).first();
  if (!cfg || !cfg.enabled) fail(404, "This website has not been published yet.");
  return { i, cfg };
}
__name(publicSite, "publicSite");
async function ipHash(request) {
  const ip = request.headers.get("CF-Connecting-IP") || request.headers.get("X-Forwarded-For") || "unknown";
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode("s21site:" + ip));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, "0")).join("");
}
__name(ipHash, "ipHash");
var todayUtc = /* @__PURE__ */ __name(() => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "todayUtc");
function menuTree(rows) {
  const items = rows.filter((r) => r.show_in_menu).map((r) => ({ id: r.id, slug: r.slug, title: r.title, parent_id: r.parent_id, order: r.menu_order, children: [] }));
  const byId = new Map(items.map((x) => [x.id, x]));
  const top = [];
  for (const it of items) {
    const p = it.parent_id && byId.get(it.parent_id);
    if (p && !p.parent_id) p.children.push(it);
    else top.push(it);
  }
  const sort = /* @__PURE__ */ __name((a, b) => a.order - b.order || a.title.localeCompare(b.title), "sort");
  top.sort(sort);
  top.forEach((t) => t.children.sort(sort));
  return top.map(({ id, slug, title, children }) => ({ slug, title, children: children.map((c) => ({ slug: c.slug, title: c.title })) }));
}
__name(menuTree, "menuTree");
async function publicSiteBundle({ params, env, url }) {
  try {
    const { i, cfg } = await publicSite(env, params.slug);
    const { results: pages } = await env.DB.prepare(
      "SELECT id, slug, title, parent_id, show_in_menu, menu_order FROM ins_site_pages WHERE institution_id = ? AND published = 1 AND deleted_at IS NULL"
    ).bind(i.id).all();
    const want = (url.searchParams.get("page") || "home").toLowerCase();
    const page = await env.DB.prepare(
      "SELECT slug, title, seo_description, blocks FROM ins_site_pages WHERE institution_id = ? AND slug = ? AND published = 1 AND deleted_at IS NULL"
    ).bind(i.id, want).first();
    const programmes = (await env.DB.prepare("SELECT id, name FROM ins_programmes WHERE institution_id = ? AND active = 1 ORDER BY name LIMIT 100").bind(i.id).all()).results;
    const { logo_key, ...inst } = i;
    return json({
      institution: { ...inst, has_logo: !!logo_key },
      theme: parse(cfg.theme, {}),
      header: parse(cfg.header, {}),
      footer: parse(cfg.footer, {}),
      menu: menuTree(pages),
      programmes,
      page: page ? { slug: page.slug, title: page.title, seo_description: page.seo_description, blocks: parse(page.blocks, []) } : null
    }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicSiteBundle, "publicSiteBundle");
async function publicPosts({ params, env, url }) {
  try {
    const { i } = await publicSite(env, params.slug);
    const kind = url.searchParams.get("kind") === "event" ? "event" : "news";
    const { page, limit, offset } = paging(url, 9, 30);
    const id = Number(url.searchParams.get("id") || 0);
    if (id) {
      const p = await env.DB.prepare(`SELECT id, kind, title, summary, body, image_id, location, starts_on, ends_on, published_on FROM ins_site_posts WHERE id = ? AND institution_id = ? AND published = 1 AND deleted_at IS NULL`).bind(id, i.id).first();
      if (!p) fail(404, "This item could not be found.");
      return json({ post: p });
    }
    const order = kind === "event" ? "starts_on DESC, id DESC" : "published_on DESC, id DESC";
    const [{ results }, total] = await Promise.all([
      env.DB.prepare(`SELECT id, kind, title, summary, image_id, location, starts_on, ends_on, published_on FROM ins_site_posts WHERE institution_id = ? AND kind = ? AND published = 1 AND deleted_at IS NULL ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(i.id, kind).all(),
      env.DB.prepare("SELECT COUNT(*) AS n FROM ins_site_posts WHERE institution_id = ? AND kind = ? AND published = 1 AND deleted_at IS NULL").bind(i.id, kind).first()
    ]);
    return json({ posts: results, total: total.n, page, limit }, { headers: { "Cache-Control": "public, max-age=60" } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicPosts, "publicPosts");
async function publicMedia({ params, env }) {
  const m = await env.DB.prepare(
    `SELECT m.file_key FROM ins_site_media m JOIN ins_institutions i ON i.id = m.institution_id
      JOIN ins_site_config c ON c.institution_id = i.id
      WHERE m.id = ? AND i.slug = ? AND c.enabled = 1 AND m.deleted_at IS NULL`
  ).bind(params.id, params.slug).first();
  if (!m || !env.MATERIALS) return new Response("Not found", { status: 404 });
  const obj = await env.MATERIALS.get(m.file_key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, {
    headers: {
      "Content-Type": obj.httpMetadata && obj.httpMetadata.contentType || "image/jpeg",
      "Cache-Control": "public, max-age=3600",
      "X-Content-Type-Options": "nosniff"
    }
  });
}
__name(publicMedia, "publicMedia");
async function throttle(env, table, instId, hash, max) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE institution_id = ? AND ip_hash = ? AND created_at >= datetime('now', '-1 hour')`).bind(instId, hash).first();
  if ((r?.n || 0) >= max) fail(429, "Too many submissions from this device. Please try again later.");
}
__name(throttle, "throttle");
async function publicApply({ request, env, params }) {
  try {
    assertSameOrigin(request);
    const { i } = await publicSite(env, params.slug);
    const b = await readJson(request);
    if (b.website) return json({ ok: true });
    const hash = await ipHash(request);
    await throttle(env, "ins_applications", i.id, hash, 5);
    const first = V.str(b.first_name, "First name", { required: true, max: 60 });
    const last = V.str(b.last_name, "Last name", { required: true, max: 60 });
    const email = V.email(b.email, "Email", { required: true });
    const phone = V.str(b.phone, "Phone number", { required: true, max: 24, min: 6 });
    if (!/^\+?[0-9][0-9 ()\-]{5,23}$/.test(phone)) fail(400, "Please enter a valid phone number, like +255 712 345 678.");
    let programmeId = null;
    let label2 = V.str(b.programme_label, "Programme", { max: 160 });
    if (b.programme_id) {
      const p = await env.DB.prepare("SELECT id, name FROM ins_programmes WHERE id = ? AND institution_id = ? AND active = 1").bind(Number(b.programme_id), i.id).first();
      if (!p) fail(400, "Please choose a programme from the list.");
      programmeId = p.id;
      label2 = p.name;
    }
    const dup = await env.DB.prepare(`SELECT id FROM ins_applications WHERE institution_id = ? AND lower(email) = ? AND COALESCE(programme_label, '') = ? AND created_at >= datetime('now', '-1 day')`).bind(i.id, email, label2 || "").first();
    if (dup) return json({ ok: true, duplicate: true });
    const r = await env.DB.prepare(
      `INSERT INTO ins_applications (institution_id, programme_id, programme_label, first_name, middle_name, last_name, gender, email, phone, address, organisation, job_title, message, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
      i.id,
      programmeId,
      label2,
      first,
      V.str(b.middle_name, "Middle name", { max: 60 }),
      last,
      V.oneOf(b.gender, "Gender", ["male", "female"]),
      email,
      phone,
      V.str(b.address, "Address", { max: 200 }),
      V.str(b.organisation, "Institution / organisation", { max: 160 }),
      V.str(b.job_title, "Job title", { max: 120 }),
      V.str(b.message, "Message", { max: 1500 }),
      hash
    ).run();
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT m.user_id FROM ins_members m WHERE m.institution_id = ? AND m.active = 1 AND (m.role = 'super_admin' OR EXISTS (SELECT 1 FROM ins_role_permissions rp WHERE rp.institution_id = m.institution_id AND rp.role = m.role AND rp.permission = 'applications.manage')) LIMIT 20`
    ).bind(i.id).all();
    for (const m of results) {
      await env.DB.prepare(`INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, 'application', ?, ?, '#applications')`).bind(i.id, m.user_id, "New application", `${first} ${last}${label2 ? " \u2014 " + label2 : ""}`.slice(0, 200)).run().catch(() => {
      });
    }
    return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicApply, "publicApply");
async function publicContact({ request, env, params }) {
  try {
    assertSameOrigin(request);
    const { i } = await publicSite(env, params.slug);
    const b = await readJson(request);
    if (b.website) return json({ ok: true });
    const hash = await ipHash(request);
    await throttle(env, "ins_contact_messages", i.id, hash, 5);
    const message = V.str(b.message, "Message", { required: true, max: 2e3, min: 3 });
    await env.DB.prepare("INSERT INTO ins_contact_messages (institution_id, name, email, phone, subject, message, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)").bind(i.id, V.str(b.name, "Name", { max: 120 }), V.email(b.email, "Email"), V.str(b.phone, "Phone", { max: 24 }), V.str(b.subject, "Subject", { max: 160 }), message, hash).run();
    return json({ ok: true }, { status: 201 });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicContact, "publicContact");
async function ensureConfig(env, instId) {
  await env.DB.prepare("INSERT OR IGNORE INTO ins_site_config (institution_id) VALUES (?)").bind(instId).run();
  return env.DB.prepare("SELECT * FROM ins_site_config WHERE institution_id = ?").bind(instId).first();
}
__name(ensureConfig, "ensureConfig");
var FONTS = ["sans", "serif", "rounded"];
var getSiteConfig = secure3({ perm: "site.manage" }, async ({ env, ctx }) => {
  const c = await ensureConfig(env, ctx.inst.id);
  const pages = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_site_pages WHERE institution_id = ? AND deleted_at IS NULL").bind(ctx.inst.id).first();
  return json({
    enabled: !!c.enabled,
    theme: parse(c.theme, {}),
    header: parse(c.header, {}),
    footer: parse(c.footer, {}),
    catalogue_public: !!ctx.inst.is_public,
    slug: ctx.inst.slug,
    primary_color: ctx.inst.primary_color,
    page_count: pages.n
  });
});
var saveSiteConfig = secure3({ perm: "site.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const cur = await ensureConfig(env, ctx.inst.id);
  const th = b.theme || {};
  const hd = b.header || {};
  const ft = b.footer || {};
  const theme = b.theme !== void 0 ? {
    primary: V.color(th.primary, "Main colour") || void 0,
    accent: V.color(th.accent, "Accent colour") || void 0,
    font: V.oneOf(th.font, "Font style", FONTS, { def: "sans" }),
    radius: V.oneOf(th.radius, "Corners", ["sharp", "soft", "round"], { def: "soft" })
  } : parse(cur.theme, {});
  const header = b.header !== void 0 ? {
    topbar_text: V.str(hd.topbar_text, "Top bar text", { max: 200 }) || "",
    show_apply: !!hd.show_apply,
    apply_label: V.str(hd.apply_label, "Apply button text", { max: 30 }) || "",
    apply_link: safeLink(hd.apply_link),
    show_library: hd.show_library !== false,
    allow_register: hd.allow_register !== false
  } : parse(cur.header, {});
  const footer = b.footer !== void 0 ? {
    text: V.str(ft.text, "Footer text", { max: 400 }) || "",
    links: (Array.isArray(ft.links) ? ft.links : []).slice(0, 12).map((l) => ({ label: String(l.label || "").slice(0, 60), link: safeLink(l.link) })).filter((l) => l.label && l.link),
    socials: (Array.isArray(ft.socials) ? ft.socials : []).slice(0, 8).map((l) => ({ kind: V.oneOf(l.kind, "Social network", ["facebook", "instagram", "x", "youtube", "linkedin", "whatsapp", "tiktok"], { def: "facebook" }), url: safeLink(l.url) })).filter((l) => l.url)
  } : parse(cur.footer, {});
  const enabled = b.enabled !== void 0 ? b.enabled ? 1 : 0 : cur.enabled;
  if (enabled && !cur.enabled) {
    const home = await env.DB.prepare(`SELECT 1 AS x FROM ins_site_pages WHERE institution_id = ? AND slug = 'home' AND published = 1 AND deleted_at IS NULL`).bind(ctx.inst.id).first();
    if (!home) fail(400, 'Publish a "home" page before turning the website on.');
  }
  await env.DB.prepare(`UPDATE ins_site_config SET enabled = ?, theme = ?, header = ?, footer = ?, updated_at = datetime('now') WHERE institution_id = ?`).bind(enabled, JSON.stringify(theme), JSON.stringify(header), JSON.stringify(footer), ctx.inst.id).run();
  if (b.catalogue_public !== void 0) await env.DB.prepare("UPDATE ins_institutions SET is_public = ? WHERE id = ?").bind(b.catalogue_public ? 1 : 0, ctx.inst.id).run();
  await audit3(env, request, ctx, "website", "site.settings", "site", ctx.inst.id, enabled ? "Website on" : "Website off");
  return json({ ok: true });
});
var SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
var RESERVED = ["api", "admin", "login", "assets", "static"];
var listPages = secure3({ perm: "site.manage" }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    "SELECT id, slug, title, parent_id, show_in_menu, menu_order, published, updated_at FROM ins_site_pages WHERE institution_id = ? AND deleted_at IS NULL ORDER BY menu_order, title"
  ).bind(ctx.inst.id).all();
  return json({ pages: results });
});
var getPage = secure3({ perm: "site.manage" }, async ({ env, params, ctx }) => {
  const p = await env.DB.prepare("SELECT * FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!p) fail(404, "The page could not be found.");
  return json({ page: { ...p, blocks: parse(p.blocks, []) } });
});
async function pageFields(env, ctx, b, current) {
  const title = V.str(b.title, "Page title", { required: true, max: 120, min: 2 });
  let slug = current ? current.slug : String(b.slug || "").trim().toLowerCase();
  if (!current || b.slug && b.slug !== current.slug && current.slug !== "home") slug = String(b.slug || "").trim().toLowerCase();
  if (!SLUG.test(slug) || slug.length > 40) fail(400, 'The web address must use small letters, numbers and dashes only, like "about-us".');
  if (RESERVED.includes(slug)) fail(400, "That web address is reserved. Please choose another.");
  const dup = await env.DB.prepare("SELECT id FROM ins_site_pages WHERE institution_id = ? AND slug = ? AND deleted_at IS NULL AND id != ?").bind(ctx.inst.id, slug, current ? current.id : 0).first();
  if (dup) fail(409, "Another page already uses this web address.");
  let parentId = null;
  if (b.parent_id) {
    const par = await env.DB.prepare("SELECT id, parent_id FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(Number(b.parent_id), ctx.inst.id).first();
    if (!par || par.parent_id || current && par.id === current.id) fail(400, "Choose a main menu page as the parent (menus have one level of drop-down).");
    parentId = par.id;
  }
  if (slug === "home") parentId = null;
  return {
    title,
    slug,
    parentId,
    seo: V.str(b.seo_description, "Search description", { max: 300 }),
    show: slug === "home" ? 1 : b.show_in_menu === false ? 0 : 1,
    order: V.int(b.menu_order, "Menu order", { min: 0, max: 999 }) ?? 100,
    published: b.published ? 1 : 0
  };
}
__name(pageFields, "pageFields");
var createPage = secure3({ perm: "site.manage" }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const f = await pageFields(env, ctx, b, null);
  const blocks = cleanBlocks(b.blocks || []);
  const r = await env.DB.prepare(
    "INSERT INTO ins_site_pages (institution_id, slug, title, seo_description, blocks, parent_id, show_in_menu, menu_order, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)"
  ).bind(ctx.inst.id, f.slug, f.title, f.seo, JSON.stringify(blocks), f.parentId, f.show, f.order, f.published).run();
  await audit3(env, request, ctx, "website", "page.create", "page", r.meta.last_row_id, f.slug);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updatePage = secure3({ perm: "site.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT * FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The page could not be found.");
  const b = await readJson(request);
  const f = await pageFields(env, ctx, b, cur);
  if (cur.slug === "home" && !f.published) fail(400, "The home page must stay published.");
  const blocks = b.blocks !== void 0 ? cleanBlocks(b.blocks) : parse(cur.blocks, []);
  await env.DB.prepare(
    `UPDATE ins_site_pages SET slug = ?, title = ?, seo_description = ?, blocks = ?, parent_id = ?, show_in_menu = ?, menu_order = ?, published = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(f.slug, f.title, f.seo, JSON.stringify(blocks), f.parentId, f.show, f.order, f.published, cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "website", "page.update", "page", cur.id, f.slug);
  return json({ ok: true });
});
var deletePage = secure3({ perm: "site.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT id, slug FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The page could not be found.");
  if (cur.slug === "home") fail(400, "The home page cannot be deleted.");
  await env.DB.prepare(`UPDATE ins_site_pages SET deleted_at = datetime('now'), published = 0 WHERE id = ?`).bind(cur.id).run();
  await env.DB.prepare("UPDATE ins_site_pages SET parent_id = NULL WHERE parent_id = ? AND institution_id = ?").bind(cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "website", "page.delete", "page", cur.id, cur.slug);
  return json({ ok: true });
});
var listMedia = secure3({ perm: "site.manage" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 24, 60);
  const [{ results }, total] = await Promise.all([
    env.DB.prepare("SELECT id, alt, created_at FROM ins_site_media WHERE institution_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT ? OFFSET ?").bind(ctx.inst.id, limit, offset).all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM ins_site_media WHERE institution_id = ? AND deleted_at IS NULL").bind(ctx.inst.id).first()
  ]);
  return json({ media: results, total: total.n, page, limit });
});
var uploadMedia = secure3({ perm: "site.manage" }, async ({ request, env, ctx }) => {
  const cnt = await env.DB.prepare("SELECT COUNT(*) AS n FROM ins_site_media WHERE institution_id = ? AND deleted_at IS NULL").bind(ctx.inst.id).first();
  if (cnt.n >= 300) fail(400, "The media library is full (300 images). Delete some images first.");
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, "Please choose an image.");
  const key = await storeImage(env, form.get("image"), `institution/${ctx.inst.id}/site`);
  const r = await env.DB.prepare("INSERT INTO ins_site_media (institution_id, file_key, alt) VALUES (?, ?, ?)").bind(ctx.inst.id, key, V.str(form.get("alt"), "Description", { max: 200 })).run();
  await audit3(env, request, ctx, "website", "media.upload", "media", r.meta.last_row_id, null);
  return json({ ok: true, id: r.meta.last_row_id, ref: `m:${r.meta.last_row_id}` }, { status: 201 });
});
var mediaFile = secure3({ perm: "site.manage" }, async ({ env, params, ctx }) => {
  const m = await env.DB.prepare("SELECT file_key FROM ins_site_media WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!m || !env.MATERIALS) return new Response("Not found", { status: 404 });
  const obj = await env.MATERIALS.get(m.file_key);
  if (!obj) return new Response("Not found", { status: 404 });
  return new Response(obj.body, { headers: { "Content-Type": obj.httpMetadata && obj.httpMetadata.contentType || "image/jpeg", "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
});
var deleteMedia = secure3({ perm: "site.manage" }, async ({ request, env, params, ctx }) => {
  const m = await env.DB.prepare("SELECT id, file_key FROM ins_site_media WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!m) fail(404, "The image could not be found.");
  await env.DB.prepare(`UPDATE ins_site_media SET deleted_at = datetime('now') WHERE id = ?`).bind(m.id).run();
  if (env.MATERIALS) await env.MATERIALS.delete(m.file_key).catch(() => {
  });
  await audit3(env, request, ctx, "website", "media.delete", "media", m.id, null);
  return json({ ok: true });
});
var listAdminPosts = secure3({ perm: "site.manage" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 20, 50);
  const kind = ["news", "event"].includes(url.searchParams.get("kind")) ? url.searchParams.get("kind") : null;
  const where = `institution_id = ? AND deleted_at IS NULL${kind ? " AND kind = ?" : ""}`;
  const binds = kind ? [ctx.inst.id, kind] : [ctx.inst.id];
  const [{ results }, total] = await Promise.all([
    env.DB.prepare(`SELECT id, kind, title, summary, image_id, location, starts_on, ends_on, published, published_on FROM ins_site_posts WHERE ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_site_posts WHERE ${where}`).bind(...binds).first()
  ]);
  return json({ posts: results, total: total.n, page, limit });
});
var getAdminPost = secure3({ perm: "site.manage" }, async ({ env, params, ctx }) => {
  const p = await env.DB.prepare("SELECT * FROM ins_site_posts WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!p) fail(404, "The item could not be found.");
  return json({ post: p });
});
async function postFields(env, ctx, b) {
  const kind = V.oneOf(b.kind, "Type", ["news", "event"], { def: "news" });
  let imageId = null;
  if (b.image_id) {
    const m = await env.DB.prepare("SELECT id FROM ins_site_media WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(Number(b.image_id), ctx.inst.id).first();
    if (!m) fail(400, "That image is not in your media library.");
    imageId = m.id;
  }
  return {
    kind,
    imageId,
    title: V.str(b.title, "Title", { required: true, max: 160, min: 3 }),
    summary: V.str(b.summary, "Short summary", { max: 300 }),
    body: V.str(b.body, "Full text", { max: 2e4 }),
    location: V.str(b.location, "Place", { max: 160 }),
    starts: V.date(b.starts_on, "Start date"),
    ends: V.date(b.ends_on, "End date"),
    published: b.published === false ? 0 : 1,
    on: V.date(b.published_on, "Publish date") || todayUtc()
  };
}
__name(postFields, "postFields");
var createPost2 = secure3({ perm: "site.manage" }, async ({ request, env, ctx }) => {
  const f = await postFields(env, ctx, await readJson(request));
  const r = await env.DB.prepare("INSERT INTO ins_site_posts (institution_id, kind, title, summary, body, image_id, location, starts_on, ends_on, published, published_on, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(ctx.inst.id, f.kind, f.title, f.summary, f.body, f.imageId, f.location, f.starts, f.ends, f.published, f.on, ctx.user.id).run();
  await audit3(env, request, ctx, "website", "post.create", "post", r.meta.last_row_id, f.title);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});
var updatePost2 = secure3({ perm: "site.manage" }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare("SELECT id FROM ins_site_posts WHERE id = ? AND institution_id = ? AND deleted_at IS NULL").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The item could not be found.");
  const f = await postFields(env, ctx, await readJson(request));
  await env.DB.prepare(`UPDATE ins_site_posts SET kind = ?, title = ?, summary = ?, body = ?, image_id = ?, location = ?, starts_on = ?, ends_on = ?, published = ?, published_on = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`).bind(f.kind, f.title, f.summary, f.body, f.imageId, f.location, f.starts, f.ends, f.published, f.on, cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "website", "post.update", "post", cur.id, f.title);
  return json({ ok: true });
});
var deletePost2 = secure3({ perm: "site.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare(`UPDATE ins_site_posts SET deleted_at = datetime('now') WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`).bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "The item could not be found.");
  await audit3(env, request, ctx, "website", "post.delete", "post", Number(params.id), null);
  return json({ ok: true });
});
var APP_STATUS = ["new", "reviewing", "accepted", "rejected", "enrolled"];
var listApplications = secure3({ perm: "applications.manage" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 20, 100);
  const status = url.searchParams.get("status");
  const q = (url.searchParams.get("q") || "").trim();
  let where = "a.institution_id = ?";
  const binds = [ctx.inst.id];
  if (APP_STATUS.includes(status)) {
    where += " AND a.status = ?";
    binds.push(status);
  }
  if (q) {
    const like = likeTerm(q);
    where += ` AND (a.first_name LIKE ? ESCAPE '\\' OR a.last_name LIKE ? ESCAPE '\\' OR a.email LIKE ? ESCAPE '\\' OR a.phone LIKE ? ESCAPE '\\')`;
    binds.push(like, like, like, like);
  }
  const [{ results }, total, counts] = await Promise.all([
    env.DB.prepare(`SELECT a.id, a.first_name, a.middle_name, a.last_name, a.gender, a.email, a.phone, a.address, a.organisation, a.job_title, a.message, a.status, a.admin_note, a.programme_id, a.programme_label, a.student_id, a.created_at FROM ins_applications a WHERE ${where} ORDER BY a.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_applications a WHERE ${where}`).bind(...binds).first(),
    env.DB.prepare("SELECT status, COUNT(*) AS n FROM ins_applications WHERE institution_id = ? GROUP BY status").bind(ctx.inst.id).all()
  ]);
  return json({ applications: results, total: total.n, page, limit, counts: Object.fromEntries(counts.results.map((c) => [c.status, c.n])) });
});
var updateApplication = secure3({ perm: "applications.manage" }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const cur = await env.DB.prepare("SELECT id, status, student_id FROM ins_applications WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, "The application could not be found.");
  const status = V.oneOf(b.status, "Status", APP_STATUS, { def: cur.status });
  if (status === "enrolled" && !cur.student_id) fail(400, 'Use "Enrol as student" to create the student record.');
  await env.DB.prepare(`UPDATE ins_applications SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`).bind(status, V.str(b.admin_note, "Note", { max: 600 }), cur.id, ctx.inst.id).run();
  await audit3(env, request, ctx, "website", "application.update", "application", cur.id, status);
  return json({ ok: true });
});
var enrolApplication = secure3({ perm: ["applications.manage"] }, async ({ request, env, params, ctx }) => {
  if (!(ctx.role === "super_admin" || ctx.perms.has("students.manage"))) fail(403, "You need the permission to add student records to enrol an applicant.");
  const a = await env.DB.prepare("SELECT * FROM ins_applications WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).first();
  if (!a) fail(404, "The application could not be found.");
  if (a.student_id) fail(409, "This applicant is already a student.");
  const dup = await env.DB.prepare("SELECT id, student_no FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND lower(email) = ?").bind(ctx.inst.id, a.email.toLowerCase()).first();
  if (dup) fail(409, `A student with this email already exists (${dup.student_no}).`);
  const full = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(" ");
  const s = await insertStudent(env, ctx, {
    student_no: null,
    reg_no: null,
    full_name: full,
    gender: a.gender,
    dob: null,
    phone: a.phone,
    email: a.email,
    address: a.address,
    programme_id: a.programme_id,
    department_id: null,
    class_name: null,
    level: null,
    admission_date: todayUtc(),
    admission_info: `Online application #${a.id}${a.programme_label ? " \u2014 " + a.programme_label : ""}`,
    status: "active",
    guardian_name: null,
    guardian_phone: null,
    guardian_relation: null,
    notes: [a.organisation, a.job_title].filter(Boolean).join(" \xB7 ") || null
  });
  await env.DB.prepare(`UPDATE ins_applications SET status = 'enrolled', student_id = ?, updated_at = datetime('now') WHERE id = ?`).bind(s.id, a.id).run();
  await audit3(env, request, ctx, "website", "application.enrol", "application", a.id, s.student_no);
  return json({ ok: true, student_id: s.id, student_no: s.student_no });
});
var deleteApplication = secure3({ perm: "applications.manage" }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare("DELETE FROM ins_applications WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, "The application could not be found.");
  await audit3(env, request, ctx, "website", "application.delete", "application", Number(params.id), null);
  return json({ ok: true });
});
var listMessages2 = secure3({ perm: "applications.manage" }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 20, 100);
  const [{ results }, total, unread] = await Promise.all([
    env.DB.prepare("SELECT id, name, email, phone, subject, message, read_at, created_at FROM ins_contact_messages WHERE institution_id = ? ORDER BY id DESC LIMIT ? OFFSET ?").bind(ctx.inst.id, limit, offset).all(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM ins_contact_messages WHERE institution_id = ?").bind(ctx.inst.id).first(),
    env.DB.prepare("SELECT COUNT(*) AS n FROM ins_contact_messages WHERE institution_id = ? AND read_at IS NULL").bind(ctx.inst.id).first()
  ]);
  return json({ messages: results, total: total.n, unread: unread.n, page, limit });
});
var markMessage = secure3({ perm: "applications.manage" }, async ({ request, env, params, ctx }) => {
  const b = await request.json().catch(() => ({}));
  await env.DB.prepare(`UPDATE ins_contact_messages SET read_at = ${b.unread ? "NULL" : "datetime('now')"} WHERE id = ? AND institution_id = ?`).bind(params.id, ctx.inst.id).run();
  return json({ ok: true });
});
var deleteMessage = secure3({ perm: "applications.manage" }, async ({ params, env, ctx }) => {
  await env.DB.prepare("DELETE FROM ins_contact_messages WHERE id = ? AND institution_id = ?").bind(params.id, ctx.inst.id).run();
  return json({ ok: true });
});
async function publicRegisterStudent({ request, env, params }) {
  try {
    assertSameOrigin(request);
    const { i, cfg } = await publicSite(env, params.slug);
    if (parse(cfg.header, {}).allow_register === false) fail(403, "Online registration is closed at the moment. Please contact the institution.");
    const b = await readJson(request);
    if (b.website) return json({ ok: true });
    const ip = clientIp3(request);
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE ip = ? AND email = '(student-signup)' AND created_at > datetime('now','-1 hour')`).bind(ip).first();
    if (ip && (recent?.n || 0) >= 4) fail(429, "Too many registrations from this connection. Please try again later.");
    const first = V.str(b.first_name, "First name", { required: true, max: 60 });
    const last = V.str(b.last_name, "Last name", { required: true, max: 60 });
    const middle = V.str(b.middle_name, "Middle name", { max: 60 });
    const email = V.email(b.email, "Email", { required: true });
    const phone = V.str(b.phone, "Phone number", { required: true, max: 24, min: 6 });
    if (!/^\+?[0-9][0-9 ()\-]{5,23}$/.test(phone)) fail(400, "Please enter a valid phone number, like +255 712 345 678.");
    const password = V.password(b.password);
    if (b.password_confirm !== void 0 && b.password_confirm !== b.password) fail(400, "The two passwords do not match.");
    const gender = V.oneOf(b.gender, "Gender", ["male", "female"]);
    let programmeId = null;
    if (b.programme_id) {
      const p = await env.DB.prepare("SELECT id FROM ins_programmes WHERE id = ? AND institution_id = ? AND active = 1").bind(Number(b.programme_id), i.id).first();
      if (!p) fail(400, "Please choose a programme from the list.");
      programmeId = p.id;
    }
    const exists = await env.DB.prepare("SELECT id FROM users WHERE email = ?").bind(email).first();
    if (exists) fail(409, "This email is already registered. Please sign in instead.");
    const dupStudent = await env.DB.prepare("SELECT id FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND lower(email) = ?").bind(i.id, email).first();
    if (dupStudent) fail(409, "A student with this email already exists. Please ask the institution to create your login.");
    const fullName = [first, middle, last].filter(Boolean).join(" ");
    const ctx = { inst: { id: i.id } };
    const stu = await insertStudent(env, ctx, {
      student_no: null,
      reg_no: null,
      full_name: fullName,
      gender,
      dob: null,
      phone,
      email,
      address: null,
      programme_id: programmeId,
      department_id: null,
      class_name: null,
      level: null,
      admission_date: todayUtc(),
      admission_info: "Online registration (website)",
      status: "active",
      guardian_name: null,
      guardian_phone: null,
      guardian_relation: null,
      notes: null
    });
    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare("INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)").bind(fullName, email, hash, salt, "user").run();
    const userId = u.meta.last_row_id;
    await env.DB.prepare("INSERT INTO ins_members (institution_id, user_id, role, student_id) VALUES (?, ?, 'student', ?)").bind(i.id, userId, stu.id).run();
    await env.DB.prepare(`INSERT INTO ins_login_attempts (email, ip, success) VALUES ('(student-signup)', ?, 1)`).bind(ip).run();
    await audit3(env, request, { inst: { id: i.id }, user: { id: userId } }, "students", "student.register", "student", stu.id, `${fullName} (${stu.student_no}) registered online`);
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT m.user_id FROM ins_members m WHERE m.institution_id = ? AND m.active = 1 AND m.role != 'student' AND (m.role = 'super_admin' OR EXISTS (SELECT 1 FROM ins_role_permissions rp WHERE rp.institution_id = m.institution_id AND rp.role = m.role AND rp.permission = 'students.manage')) LIMIT 20`
    ).bind(i.id).all();
    for (const m of results) {
      await env.DB.prepare(`INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, 'admin', ?, ?, '#students')`).bind(i.id, m.user_id, "New student registered", `${fullName} (${stu.student_no})`).run().catch(() => {
      });
    }
    const cookie = await startSession3(env, userId, true);
    return json({ ok: true, student_no: stu.student_no, name: fullName }, { status: 201, headers: { "Set-Cookie": cookie } });
  } catch (e) {
    return errorResponse(e);
  }
}
__name(publicRegisterStudent, "publicRegisterStudent");
async function publicSites({ env, url }) {
  const want = String(url && url.searchParams.get("i") || "").trim().slice(0, 60);
  if (!want || !/^[a-z0-9-]+$/i.test(want)) {
    return json({ sites: [] }, { headers: { "Cache-Control": "no-store" } });
  }
  const { results } = await env.DB.prepare(
    `SELECT i.id, i.name, i.slug, i.inst_type FROM ins_institutions i JOIN ins_site_config c ON c.institution_id = i.id
     WHERE c.enabled = 1 AND (i.slug = ?1 OR CAST(i.id AS TEXT) = ?1) LIMIT 1`
  ).bind(want).all();
  return json({ sites: results }, { headers: { "Cache-Control": "no-store" } });
}
__name(publicSites, "publicSites");
var bid = /* @__PURE__ */ __name(() => Math.random().toString(36).slice(2, 9), "bid");
var U = /* @__PURE__ */ __name((id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`, "U");
var PH = {
  graduation: "1523050854058-8df90110c9f1",
  library: "1481627834876-b7833e8f5570",
  campus: "1541339907198-e08756dedf3f",
  students: "1523240795612-9a054b0db644",
  study: "1522202176988-66273c2fd55f",
  lecture: "1524178232363-1fb2b075b655",
  classroom: "1427504494785-3a9ca7044f45",
  laptop: "1513258496099-48168024aec0",
  reading: "1456513080510-7bf3a84b82f8",
  hall: "1507842217343-583bb7270b66",
  books: "1497633762265-9d179a990aa6",
  tower: "1562774053-701939374585",
  code: "1517694712202-14dd9538aa97",
  business: "1454165804606-c3d57bc86b40",
  learning: "1503676260728-1c00da094a0b",
  health: "1576091160399-112ba8d25d1d"
};
var PROG_PICS = [PH.code, PH.business, PH.learning, PH.health, PH.study, PH.lecture];
var createStarter = secure3({ perm: "site.manage" }, async ({ request, env, ctx }) => {
  const i = ctx.inst;
  const sw = (await request.json().catch(() => ({}))).lang === "sw";
  const t = /* @__PURE__ */ __name((en, s) => sw ? s : en, "t");
  const base = "/s/" + i.slug;
  const progs = (await env.DB.prepare("SELECT name, level, duration_years FROM ins_programmes WHERE institution_id = ? AND active = 1 ORDER BY name LIMIT 12").bind(i.id).all()).results;
  const progCards = (progs.length ? progs : [{ name: t("Your first programme", "Programu yako ya kwanza") }]).map((p, n2) => ({
    title: p.name,
    image: U(PROG_PICS[n2 % PROG_PICS.length], 900),
    text: [p.level, p.duration_years ? `${p.duration_years} ${t("year(s)", "mwaka/miaka")}` : ""].filter(Boolean).join(" \xB7 ") || t("Describe this programme here.", "Eleza programu hii hapa."),
    link: base + "/register",
    link_label: t("Register", "Jisajili")
  }));
  const about = i.about || t(`${i.name} is committed to quality teaching, strong values and a modern learning environment where every student can succeed.`, `${i.name} imejikita katika ufundishaji bora, maadili thabiti na mazingira ya kisasa ya kujifunzia ambapo kila mwanafunzi anaweza kufanikiwa.`);
  const pages = [
    { slug: "home", title: t("Home", "Mwanzo"), order: 0, blocks: [
      { type: "slider", interval: 6, height: "tall", items: [
        { image: U(PH.graduation), title: t(`Welcome to ${i.name}`, `Karibu ${i.name}`), subtitle: about.slice(0, 180), button_label: t("Register as a student", "Jisajili kama mwanafunzi"), button_link: base + "/register" },
        { image: U(PH.library), title: t("A modern library and e-library", "Maktaba ya kisasa na maktaba mtandao"), subtitle: t("Search the catalogue, read e-books and reserve books from anywhere.", "Tafuta katalogi, soma vitabu vya kidijitali na hifadhi vitabu ukiwa popote."), button_label: t("Browse the library", "Tazama maktaba"), button_link: base + "/library" },
        { image: U(PH.campus), title: t("Learn. Lead. Succeed.", "Jifunze. Ongoza. Fanikiwa."), subtitle: t("Qualified teachers, practical learning and a supportive community.", "Walimu wenye sifa, mafunzo kwa vitendo na jamii inayosaidiana."), button_label: t("See our programmes", "Tazama programu zetu"), button_link: base + "/programmes" }
      ] },
      { type: "quicklinks", items: [
        { icon: "fa-user-plus", title: t("Student registration", "Usajili wa mwanafunzi"), text: t("Create your account in one minute.", "Fungua akaunti yako kwa dakika moja."), link: base + "/register" },
        { icon: "fa-book", title: t("Library catalogue", "Katalogi ya maktaba"), text: t("Search every book we hold.", "Tafuta kila kitabu tulichonacho."), link: base + "/library" },
        { icon: "fa-laptop", title: t("E-Library", "Maktaba mtandao"), text: t("Read and download e-books.", "Soma na pakua vitabu vya kidijitali."), link: base + "/library#ebooks" },
        { icon: "fa-gauge", title: t("Student dashboard", "Dashibodi ya mwanafunzi"), text: t("Sign in to your records.", "Ingia kwenye rekodi zako."), link: "/institution-start.html?i=" + i.slug }
      ] },
      { type: "text", heading: t(`About ${i.name}`, `Kuhusu ${i.name}`), body: about + "\n\n" + t("- Experienced and caring teachers\n- Modern library with digital resources\n- Student records and results available online", "- Walimu wenye uzoefu na kujali\n- Maktaba ya kisasa yenye rasilimali za kidijitali\n- Rekodi na matokeo ya wanafunzi yanapatikana mtandaoni"), image: U(PH.students, 1100), layout: "right" },
      { type: "cards", heading: t("Our programmes", "Programu zetu"), intro: t("Choose the programme that fits your future.", "Chagua programu inayofaa mustakabali wako."), columns: "3", items: progCards.slice(0, 6) },
      { type: "stats", image: U(PH.tower), items: [{ value: "1,000+", label: t("Students", "Wanafunzi") }, { value: "60+", label: t("Teachers & staff", "Walimu na wafanyakazi") }, { value: "10,000+", label: t("Library books", "Vitabu vya maktaba") }, { value: "500+", label: t("E-books & notes", "Vitabu na notisi za kidijitali") }] },
      { type: "library", heading: t("Library & E-Library", "Maktaba na Maktaba Mtandao"), mode: "both", limit: 8, show_search: true },
      { type: "steps", heading: t("How to join us", "Jinsi ya kujiunga nasi"), items: [
        { title: t("Create your account", "Fungua akaunti"), text: t("Fill in the short registration form.", "Jaza fomu fupi ya usajili.") },
        { title: t("Get your student number", "Pata namba yako"), text: t("You receive your student number immediately.", "Unapata namba yako ya mwanafunzi papo hapo.") },
        { title: t("Open your dashboard", "Fungua dashibodi yako"), text: t("See your records, results and library.", "Angalia rekodi, matokeo na maktaba yako.") }
      ] },
      { type: "news", heading: t("Latest news", "Habari mpya"), limit: 3 },
      { type: "events", heading: t("Upcoming events", "Matukio yajayo"), limit: 3 },
      { type: "gallery", heading: t("Life at our institution", "Maisha ya chuoni"), items: [PH.classroom, PH.lecture, PH.laptop, PH.reading, PH.hall, PH.books].map((x) => ({ image: U(x, 800), caption: "" })) },
      { type: "cta", image: U(PH.students), heading: t("Ready to start your journey?", "Uko tayari kuanza safari yako?"), text: t("Register today and get access to your student dashboard, the library and e-library.", "Jisajili leo upate dashibodi ya mwanafunzi, maktaba na maktaba mtandao."), button_label: t("Register now", "Jisajili sasa"), button_link: base + "/register" }
    ] },
    { slug: "about", title: t("About us", "Kuhusu sisi"), order: 10, blocks: [
      { type: "hero", title: t("About us", "Kuhusu sisi"), subtitle: t("Who we are and what we stand for", "Sisi ni nani na tunasimamia nini"), image: U(PH.campus), height: "short" },
      { type: "text", heading: t("Our story", "Historia yetu"), body: about + "\n\n" + t("Write when the institution started, how it has grown and what makes it special.", "Andika taasisi ilianza lini, imekua vipi na kinachoifanya kuwa ya kipekee."), image: U(PH.hall, 1100), layout: "left" },
      { type: "cards", heading: t("Vision, mission and values", "Dira, dhima na maadili"), columns: "3", items: [{ icon: "fa-eye", title: t("Vision", "Dira"), text: t("Write your vision.", "Andika dira yako.") }, { icon: "fa-bullseye", title: t("Mission", "Dhima"), text: t("Write your mission.", "Andika dhima yako.") }, { icon: "fa-heart", title: t("Values", "Maadili"), text: t("Write your core values.", "Andika maadili yako.") }] }
    ] },
    { slug: "leadership", title: t("Leadership", "Uongozi"), order: 11, parent: "about", blocks: [
      { type: "hero", title: t("Our leadership", "Uongozi wetu"), subtitle: "", image: U(PH.lecture), height: "short" },
      { type: "leader", name: t("Name of the Principal", "Jina la Mkuu wa Taasisi"), role: t("Principal", "Mkuu wa Taasisi"), message: t("Write a short welcome message here. Add the Principal's photo with the Choose button.", "Andika ujumbe mfupi wa kukaribisha hapa. Ongeza picha ya Mkuu wa Taasisi kwa kitufe cha Chagua.") }
    ] },
    { slug: "programmes", title: t("Programmes", "Programu"), order: 20, blocks: [
      { type: "hero", title: t("Programmes and courses", "Programu na kozi"), subtitle: t("Find the right programme for you", "Pata programu sahihi kwako"), image: U(PH.study), height: "short" },
      { type: "cards", heading: "", columns: "3", items: progCards }
    ] },
    { slug: "admissions", title: t("Admissions", "Udahili"), order: 30, blocks: [
      { type: "hero", title: t("Admissions", "Udahili"), subtitle: t("Joining us is simple", "Kujiunga nasi ni rahisi"), image: U(PH.students), height: "short" },
      { type: "steps", heading: t("How to register", "Jinsi ya kujisajili"), items: [
        { title: t("Choose a programme", "Chagua programu"), text: t("See the Programmes page.", "Tazama ukurasa wa Programu.") },
        { title: t("Register online", "Jisajili mtandaoni"), text: t("Fill in the registration form.", "Jaza fomu ya usajili.") },
        { title: t("Start learning", "Anza kujifunza"), text: t("Your dashboard is ready immediately.", "Dashibodi yako iko tayari mara moja.") }
      ] },
      { type: "faq", heading: t("Common questions", "Maswali ya mara kwa mara"), items: [{ q: t("Who can register?", "Nani anaweza kujisajili?"), a: t("Write the entry requirements here.", "Andika vigezo vya kujiunga hapa.") }, { q: t("How much are the fees?", "Ada ni kiasi gani?"), a: t("Write the fees here.", "Andika ada hapa.") }, { q: t("When does the next intake start?", "Muhula ujao unaanza lini?"), a: t("Write the dates here.", "Andika tarehe hapa.") }] },
      { type: "cta", image: U(PH.graduation), heading: t("Register as a student", "Jisajili kama mwanafunzi"), text: "", button_label: t("Register now", "Jisajili sasa"), button_link: base + "/register" }
    ] },
    { slug: "register", title: t("Student registration", "Usajili wa mwanafunzi"), order: 31, parent: "admissions", blocks: [
      {
        type: "register",
        heading: t("Student registration", "Usajili wa mwanafunzi"),
        intro: t("Create your account. Your name appears in the institution dashboard straight away and you can sign in immediately.", "Fungua akaunti yako. Jina lako litaonekana kwenye dashibodi ya taasisi mara moja na unaweza kuingia papo hapo."),
        image: U(PH.study, 1e3),
        benefits_text: t("Instant student number\nYour own dashboard\nAccess to the library catalogue\nRead e-books online", "Namba ya mwanafunzi papo hapo\nDashibodi yako mwenyewe\nKatalogi ya maktaba\nSoma vitabu vya kidijitali"),
        success: t("Welcome! Your account is ready.", "Karibu! Akaunti yako iko tayari.")
      }
    ] },
    { slug: "library", title: t("Library", "Maktaba"), order: 40, blocks: [
      { type: "hero", title: t("Library & E-Library", "Maktaba na Maktaba Mtandao"), subtitle: t("Search our catalogue, read e-books and discover new knowledge.", "Tafuta katalogi yetu, soma vitabu vya kidijitali na gundua maarifa mapya."), image: U(PH.library), height: "short" },
      { type: "library", heading: "", mode: "both", limit: 16, show_search: true }
    ] },
    { slug: "news", title: t("News & events", "Habari na matukio"), order: 50, blocks: [
      { type: "hero", title: t("News & events", "Habari na matukio"), subtitle: "", image: U(PH.hall), height: "short" },
      { type: "news", heading: t("News", "Habari"), limit: 9 },
      { type: "events", heading: t("Events", "Matukio"), limit: 9 },
      { type: "announcements", heading: t("Announcements", "Matangazo"), limit: 5 }
    ] },
    { slug: "gallery", title: t("Gallery", "Picha"), order: 60, blocks: [
      { type: "hero", title: t("Gallery", "Picha"), subtitle: "", image: U(PH.classroom), height: "short" },
      { type: "gallery", heading: "", items: [PH.classroom, PH.lecture, PH.laptop, PH.reading, PH.hall, PH.books, PH.students, PH.study, PH.campus].map((x) => ({ image: U(x, 800), caption: "" })) }
    ] },
    { slug: "contact", title: t("Contact us", "Wasiliana nasi"), order: 70, blocks: [
      { type: "hero", title: t("Contact us", "Wasiliana nasi"), subtitle: t("We would love to hear from you", "Tungependa kusikia kutoka kwako"), image: U(PH.hall), height: "short" },
      { type: "contact", heading: "", intro: "", map_link: "" }
    ] }
  ];
  let created = 0;
  const ids = {};
  for (const p of pages) {
    const exists = await env.DB.prepare("SELECT id FROM ins_site_pages WHERE institution_id = ? AND slug = ? AND deleted_at IS NULL").bind(i.id, p.slug).first();
    if (exists) {
      ids[p.slug] = exists.id;
      continue;
    }
    const parentId = p.parent ? ids[p.parent] || null : null;
    const r = await env.DB.prepare("INSERT INTO ins_site_pages (institution_id, slug, title, blocks, parent_id, show_in_menu, menu_order, published) VALUES (?, ?, ?, ?, ?, 1, ?, 1)").bind(i.id, p.slug, p.title, JSON.stringify(cleanBlocks(p.blocks.map((b) => ({ ...b, id: bid() })))), parentId, p.order).run();
    ids[p.slug] = r.meta.last_row_id;
    created++;
  }
  const cfg = await ensureConfig(env, i.id);
  const header = parse(cfg.header, {});
  if (!header.apply_link) {
    Object.assign(header, { show_apply: true, apply_label: t("Register", "Jisajili"), apply_link: base + "/register", allow_register: true });
    await env.DB.prepare("UPDATE ins_site_config SET header = ? WHERE institution_id = ?").bind(JSON.stringify(header), i.id).run();
  }
  await audit3(env, request, ctx, "website", "site.starter", "site", i.id, `${created} pages`);
  return json({ ok: true, created });
});

// src/index.js
var router = new Router();
router.post("/api/auth/register", register);
router.post("/api/auth/login", login);
router.post("/api/auth/logout", logout);
router.get("/api/auth/me", me);
router.post("/api/newsletter/subscribe", subscribe);
router.post("/api/contact", sendMessage);
router.get("/api/contact", listMessages);
router.get("/api/newsletter/subscribers", listSubscribers);
router.get("/api/search", search);
router.post("/api/ai-assistant", ask);
router.get("/api/stats", getPublicStats);
router.put("/api/account/profile", updateProfile);
router.get("/api/account/profile", getProfile);
router.put("/api/account/password", updatePassword);
router.get("/api/avatar/:id", getAvatar);
router.post("/api/account/avatar", updateAvatar);
router.post("/api/activity/game-score", submitGameScore2);
router.get("/api/auth/google/config", config);
router.post("/api/auth/google", signIn);
router.get("/api/games", listGames);
router.post("/api/games", createGame);
router.get("/api/games/:id", getGame);
router.put("/api/games/:id", updateGame);
router.delete("/api/games/:id", deleteGame);
router.post("/api/games/:id/score", submitGameScore);
router.get("/api/quizzes", listQuizzes);
router.post("/api/quizzes", createQuiz);
router.get("/api/quizzes/:id", getQuiz);
router.put("/api/quizzes/:id", updateQuiz);
router.delete("/api/quizzes/:id", deleteQuiz);
router.post("/api/quizzes/:id/attempt", submitQuizAttempt);
router.get("/api/blog", listPosts);
router.post("/api/blog", createPost);
router.get("/api/blog/:slug", getPost);
router.put("/api/blog/:slug", updatePost);
router.delete("/api/blog/:slug", deletePost);
router.get("/api/course-categories", listCategories);
router.post("/api/course-categories", createCategory);
router.delete("/api/course-categories/:id", deleteCategory);
router.get("/api/courses", listCourses);
router.post("/api/courses", createCourse);
router.get("/api/courses/my", myCourses);
router.get("/api/courses/:id", getCourse);
router.put("/api/courses/:id", updateCourse);
router.delete("/api/courses/:id", deleteCourse);
router.post("/api/courses/:id/enroll", enrollCourse);
router.get("/api/courses/:id/lessons", listLessons);
router.post("/api/courses/:id/lessons", createLesson);
router.put("/api/courses/:id/lessons/:lessonId", updateLesson);
router.delete("/api/courses/:id/lessons/:lessonId", deleteLesson);
router.get("/api/lessons/:id", getLesson);
router.post("/api/lessons/:id/complete", completeLesson);
router.get("/api/courses/:id/modules", listModules);
router.post("/api/courses/:id/modules", createModule);
router.put("/api/course-modules/:moduleId", updateModule);
router.delete("/api/course-modules/:moduleId", deleteModule);
router.get("/api/courses/:id/certificate", myCertificate);
router.get("/api/certificates/my", myCertificates);
router.get("/api/certificates/:code", verifyCertificate);
router.get("/api/materials", listMaterials);
router.post("/api/materials", uploadMaterial);
router.get("/api/materials/:id", getMaterial);
router.delete("/api/materials/:id", deleteMaterial);
router.get("/api/videos", listVideos);
router.post("/api/videos", createVideo);
router.get("/api/videos/continue-watching", continueWatching);
router.get("/api/videos/:id", getVideo);
router.put("/api/videos/:id", updateVideo);
router.delete("/api/videos/:id", deleteVideo);
router.get("/api/videos/:id/stream", streamVideo);
router.get("/api/videos/:id/progress", getProgress);
router.put("/api/videos/:id/progress", saveProgress);
router.get("/api/books", listBooks);
router.post("/api/books", createBook);
router.get("/api/books/:id", getBook);
router.put("/api/books/:id", updateBook);
router.delete("/api/books/:id", deleteBook);
router.get("/api/books/:id/progress", getProgress2);
router.put("/api/books/:id/progress", saveProgress2);
router.get("/api/users", listUsers);
router.put("/api/users/:id/role", updateUserRole);
router.get("/api/dashboard", getDashboard);
router.get("/api/settings", getSettings);
router.put("/api/settings", updateSettings);
router.get("/api/stationery/context", getContext);
router.put("/api/stationery/business", updateBusiness);
router.get("/api/stationery/staff", listStaff);
router.post("/api/stationery/staff", addStaff);
router.put("/api/stationery/staff/:id", updateStaffRole);
router.get("/api/stationery/customers", listCustomers);
router.post("/api/stationery/customers", createCustomer);
router.get("/api/stationery/customers/:id", getCustomer);
router.put("/api/stationery/customers/:id", updateCustomer);
router.delete("/api/stationery/customers/:id", deleteCustomer);
router.get("/api/stationery/services", listServices);
router.post("/api/stationery/services", createService);
router.put("/api/stationery/services/:id", updateService);
router.delete("/api/stationery/services/:id", deleteService);
router.get("/api/stationery/inventory", listInventory);
router.post("/api/stationery/inventory", createItem);
router.put("/api/stationery/inventory/:id", updateItem);
router.delete("/api/stationery/inventory/:id", deleteItem);
router.post("/api/stationery/inventory/:id/adjust", adjustStock);
router.get("/api/stationery/inventory/:id/history", stockHistory);
router.get("/api/stationery/orders", listOrders);
router.post("/api/stationery/orders", createOrder);
router.get("/api/stationery/orders/:id", getOrder);
router.put("/api/stationery/orders/:id/status", updateOrderStatus);
router.post("/api/stationery/orders/:id/payments", addPayment);
router.get("/api/stationery/orders/:id/receipt", getReceipt);
router.get("/api/stationery/finance/expenses", listExpenses);
router.post("/api/stationery/finance/expenses", createExpense);
router.delete("/api/stationery/finance/expenses/:id", deleteExpense);
router.get("/api/stationery/finance/cashbook", cashbook);
router.get("/api/stationery/finance/debts", debts);
router.get("/api/stationery/finance/summary", summary);
router.get("/api/stationery/dashboard", getDashboard2);
router.get("/api/stationery/reports", getReport);
router.get("/api/stationery/photo-presets", listPresets);
router.post("/api/stationery/photo-presets", createPreset);
router.delete("/api/stationery/photo-presets/:id", deletePreset);
router.post("/api/stationery/files", uploadFile);
router.get("/api/stationery/files/:key", getFile);
router.delete("/api/stationery/files/:key", deleteFile);
router.get("/api/stationery/online-services/templates", getTemplates);
router.get("/api/stationery/online-services", listRequests);
router.post("/api/stationery/online-services", createRequest);
router.put("/api/stationery/online-services/:id", updateRequest);
router.get("/api/stationery/machines", listMachines);
router.post("/api/stationery/machines", createMachine);
router.delete("/api/stationery/machines/:id", deleteMachine);
router.get("/api/stationery/courses", listCourses2);
router.get("/api/stationery/courses/:id", getCourse2);
router.post("/api/stationery/courses/:id/progress", updateProgress);
router.post("/api/stationery/chopaai", ask2);
router.get("/api/stationery/notifications", listNotifications);
router.put("/api/stationery/notifications/:id/read", markRead);
router.put("/api/stationery/notifications/read-all", markAllRead);
router.get("/api/stationery/audit-log", listAuditLog);
router.get("/api/stationery/backup/export", exportBackup);
router.post("/api/stationery/backup/restore", restoreBackup);
router.post("/api/school/register-school", registerSchool);
router.post("/api/school/login", login2);
router.post("/api/school/logout", logout2);
router.get("/api/school/context", context);
router.post("/api/school/schools", createSchool);
router.get("/api/school/lookups", lookups);
router.get("/api/school/public/logo/:id", publicLogo);
router.get("/api/school/verify/:token", verifyStudent);
router.get("/api/school/school-info", getSchoolInfo);
router.put("/api/school/school-info", updateSchoolInfo);
router.post("/api/school/school-info/logo", uploadLogo);
router.put("/api/school/settings", saveSettings);
router.get("/api/school/academic-years", listYears);
router.post("/api/school/academic-years", saveYear);
router.put("/api/school/academic-years/:id", saveYear);
router.delete("/api/school/academic-years/:id", deleteYear);
router.post("/api/school/terms", saveTerm);
router.put("/api/school/terms/:id", saveTerm);
router.delete("/api/school/terms/:id", deleteTerm);
router.get("/api/school/permissions", getPermissions);
router.put("/api/school/permissions", savePermissions);
router.get("/api/school/users", listUsers2);
router.post("/api/school/users", addUser);
router.put("/api/school/users/:id", updateUser);
router.post("/api/school/demo-data", loadDemoData);
router.post("/api/school/reset-data", resetSchoolData);
router.get("/api/school/students", listStudents);
router.post("/api/school/students", createStudent);
router.get("/api/school/students/:id", getStudent);
router.put("/api/school/students/:id", updateStudent);
router.delete("/api/school/students/:id", deleteStudent);
router.put("/api/school/students/:id/status", setStudentStatus);
router.post("/api/school/students/:id/photo", uploadStudentPhoto);
router.get("/api/school/students/:id/photo", getStudentPhoto);
router.get("/api/school/students/:id/notes", listNotes);
router.post("/api/school/students/:id/notes", addNote);
router.delete("/api/school/notes/:id", deleteNote);
router.get("/api/school/students/:id/id-card", idCard);
router.get("/api/school/students/:id/attendance", studentAttendance);
router.get("/api/school/students/:id/fees", studentFees);
router.get("/api/school/students/:id/results", studentResults);
router.get("/api/school/parents", listParents);
router.post("/api/school/parents", createParent);
router.get("/api/school/parents/:id", getParent);
router.put("/api/school/parents/:id", updateParent);
router.delete("/api/school/parents/:id", deleteParent);
router.post("/api/school/parents/:id/portal", givePortalAccess);
router.get("/api/school/teachers", listTeachers);
router.post("/api/school/teachers", createTeacher);
router.get("/api/school/teachers/:id", getTeacher);
router.put("/api/school/teachers/:id", updateTeacher);
router.delete("/api/school/teachers/:id", deleteTeacher);
router.post("/api/school/teachers/:id/login", giveTeacherLogin);
router.post("/api/school/teachers/:id/photo", uploadTeacherPhoto);
router.get("/api/school/teachers/:id/photo", getTeacherPhoto);
router.get("/api/school/classes", listClasses);
router.post("/api/school/classes", createClass);
router.get("/api/school/classes/:id", getClass);
router.put("/api/school/classes/:id", updateClass);
router.delete("/api/school/classes/:id", deleteClass);
router.get("/api/school/subjects", listSubjects);
router.post("/api/school/subjects", createSubject);
router.put("/api/school/subjects/:id", updateSubject);
router.delete("/api/school/subjects/:id", deleteSubject);
router.get("/api/school/timetable", listTimetable);
router.post("/api/school/timetable", createTimetable);
router.put("/api/school/timetable/:id", updateTimetable);
router.delete("/api/school/timetable/:id", deleteTimetable);
router.get("/api/school/attendance/sheet", attendanceSheet);
router.get("/api/school/attendance/summary", attendanceSummary);
router.get("/api/school/attendance/alerts", attendanceAlerts);
router.post("/api/school/attendance", saveAttendance);
router.get("/api/school/fees/structures", listFeeStructures);
router.post("/api/school/fees/structures", createFeeStructure);
router.put("/api/school/fees/structures/:id", updateFeeStructure);
router.delete("/api/school/fees/structures/:id", deleteFeeStructure);
router.get("/api/school/fees/overview", feesOverview);
router.post("/api/school/fees/reminders", sendFeeReminders);
router.get("/api/school/payments", listPayments);
router.post("/api/school/payments", recordPayment);
router.get("/api/school/payments/:id/receipt", getReceipt2);
router.put("/api/school/payments/:id", updatePayment);
router.get("/api/school/exams", listExams);
router.post("/api/school/exams", createExam);
router.get("/api/school/exams/:id", getExam);
router.put("/api/school/exams/:id", updateExam);
router.delete("/api/school/exams/:id", deleteExam);
router.get("/api/school/exams/:id/sheet", examSheet);
router.get("/api/school/results/entry", resultEntrySheet);
router.post("/api/school/results", saveResults);
router.get("/api/school/report-card", reportCard);
router.put("/api/school/report-card/comment", saveReportComment);
router.get("/api/school/dashboard", dashboard);
router.get("/api/school/portal", portal);
router.get("/api/school/notifications", listNotifications2);
router.post("/api/school/notifications", createNotification);
router.put("/api/school/notifications/read-all", markAllRead2);
router.put("/api/school/notifications/:id/read", markRead2);
router.delete("/api/school/notifications/:id", deleteNotification);
router.get("/api/school/reports", reportCatalogue);
router.get("/api/school/reports/:key", runReport);
router.get("/api/school/audit", listAudit);
router.get("/api/school/search", search2);
router.post("/api/shop/register-shop", registerShop);
router.post("/api/shop/login", login3);
router.post("/api/shop/logout", logout3);
router.get("/api/shop/context", context2);
router.post("/api/shop/shops", createShop);
router.get("/api/shop/lookups", lookups2);
router.get("/api/shop/public/logo/:id", publicLogo2);
router.get("/api/shop/public/qr/:code", publicQr);
router.get("/api/shop/shop-info", getShopInfo);
router.put("/api/shop/shop-info", updateShopInfo);
router.post("/api/shop/shop-info/logo", uploadLogo2);
router.put("/api/shop/settings", saveSettings2);
router.get("/api/shop/permissions", getPermissions2);
router.put("/api/shop/permissions", savePermissions2);
router.get("/api/shop/users", listUsers3);
router.post("/api/shop/users", addUser2);
router.put("/api/shop/users/:id", updateUser2);
router.post("/api/shop/demo-data", loadDemoData2);
router.post("/api/shop/reset-data", resetShopData);
router.get("/api/shop/customers", listCustomers2);
router.post("/api/shop/customers", createCustomer2);
router.get("/api/shop/customers/:id", getCustomer2);
router.put("/api/shop/customers/:id", updateCustomer2);
router.delete("/api/shop/customers/:id", deleteCustomer2);
router.put("/api/shop/customers/:id/status", setCustomerStatus);
router.post("/api/shop/customers/:id/notes", addNote2);
router.delete("/api/shop/customer-notes/:id", deleteNote2);
router.get("/api/shop/customers/:id/statement", statement);
router.post("/api/shop/customers/:id/payments", receivePayment);
router.get("/api/shop/categories", listCategories2);
router.post("/api/shop/categories", saveCategory);
router.put("/api/shop/categories/:id", saveCategory);
router.delete("/api/shop/categories/:id", deleteCategory2);
router.get("/api/shop/products", listProducts);
router.post("/api/shop/products", createProduct);
router.get("/api/shop/products/:id", getProduct);
router.put("/api/shop/products/:id", updateProduct);
router.delete("/api/shop/products/:id", deleteProduct);
router.post("/api/shop/products/:id/image", uploadProductImage);
router.get("/api/shop/products/:id/image", getProductImage);
router.post("/api/shop/products/:id/stock", adjustStock2);
router.get("/api/shop/products/:id/history", stockHistory2);
router.get("/api/shop/products/:id/qr", listProductQr);
router.post("/api/shop/products/:id/qr", generateProductQr);
router.get("/api/shop/qr/lookup", lookupQr);
router.post("/api/shop/qr/:id/status", setQrStatus);
router.get("/api/shop/sales", listSales);
router.post("/api/shop/sales", createSale);
router.get("/api/shop/sales/:id", getSale);
router.post("/api/shop/sales/:id/payments", addPayment2);
router.post("/api/shop/sales/:id/void", voidSale);
router.get("/api/shop/expenses", listExpenses2);
router.post("/api/shop/expenses", createExpense2);
router.delete("/api/shop/expenses/:id", deleteExpense2);
router.get("/api/shop/dashboard", dashboard2);
router.get("/api/shop/alerts", alerts);
router.get("/api/shop/search", search3);
router.get("/api/shop/reports", reportCatalogue2);
router.get("/api/shop/reports/:key", runReport2);
router.get("/api/shop/audit", listAudit2);
router.post("/api/institution/register", registerInstitution);
router.post("/api/institution/login", login4);
router.post("/api/institution/logout", logout4);
router.get("/api/institution/context", context3);
router.post("/api/institution/institutions", createInstitution);
router.get("/api/institution/lookups", lookups3);
router.get("/api/institution/public/logo/:id", publicLogo3);
router.get("/api/institution/public/:slug", publicInfo);
router.get("/api/institution/public/:slug/books", publicOpac);
router.get("/api/institution/public/:slug/books/:id", publicBook);
router.get("/api/institution/public/:slug/resources", publicResources);
router.get("/api/institution/public/:slug/resources/:id/file", publicResourceFile);
router.get("/api/institution/public/:slug/site", publicSiteBundle);
router.get("/api/institution/public/:slug/posts", publicPosts);
router.get("/api/institution/public/:slug/media/:id", publicMedia);
router.post("/api/institution/public/:slug/apply", publicApply);
router.post("/api/institution/public/:slug/contact", publicContact);
router.post("/api/institution/public/:slug/register", publicRegisterStudent);
router.get("/api/institution/public-sites", publicSites);
router.get("/api/institution/site/config", getSiteConfig);
router.put("/api/institution/site/config", saveSiteConfig);
router.post("/api/institution/site/starter", createStarter);
router.get("/api/institution/site/pages", listPages);
router.post("/api/institution/site/pages", createPage);
router.get("/api/institution/site/pages/:id", getPage);
router.put("/api/institution/site/pages/:id", updatePage);
router.delete("/api/institution/site/pages/:id", deletePage);
router.get("/api/institution/site/media", listMedia);
router.post("/api/institution/site/media", uploadMedia);
router.get("/api/institution/site/media/:id/file", mediaFile);
router.delete("/api/institution/site/media/:id", deleteMedia);
router.get("/api/institution/site/posts", listAdminPosts);
router.post("/api/institution/site/posts", createPost2);
router.get("/api/institution/site/posts/:id", getAdminPost);
router.put("/api/institution/site/posts/:id", updatePost2);
router.delete("/api/institution/site/posts/:id", deletePost2);
router.get("/api/institution/applications", listApplications);
router.put("/api/institution/applications/:id", updateApplication);
router.post("/api/institution/applications/:id/enrol", enrolApplication);
router.delete("/api/institution/applications/:id", deleteApplication);
router.get("/api/institution/site-messages", listMessages2);
router.put("/api/institution/site-messages/:id", markMessage);
router.delete("/api/institution/site-messages/:id", deleteMessage);
router.get("/api/institution/info", getInstInfo);
router.put("/api/institution/info", updateInstInfo);
router.post("/api/institution/info/logo", uploadLogo3);
router.put("/api/institution/settings", saveSettings3);
router.get("/api/institution/permissions", getPermissions3);
router.put("/api/institution/permissions", savePermissions3);
router.get("/api/institution/users", listUsers4);
router.post("/api/institution/users", addUser3);
router.put("/api/institution/users/:id", updateUser3);
router.post("/api/institution/demo-data", loadDemoData3);
router.get("/api/institution/announcements", listAnnouncements);
router.post("/api/institution/announcements", createAnnouncement);
router.delete("/api/institution/announcements/:id", deleteAnnouncement);
router.get("/api/institution/notifications", listNotifications3);
router.post("/api/institution/notifications/read", readNotifications);
router.get("/api/institution/opac", opac);
router.get("/api/institution/opac/suggest", suggest);
router.get("/api/institution/opac/book/:id", opacBook);
router.get("/api/institution/books/:id", getBook2);
router.post("/api/institution/books", createBook2);
router.put("/api/institution/books/:id", updateBook2);
router.delete("/api/institution/books/:id", deleteBook2);
router.post("/api/institution/books/:id/archive", archiveBook);
router.post("/api/institution/books/:id/cover", uploadCover);
router.get("/api/institution/books/:id/cover", bookCover);
router.post("/api/institution/books/:id/copies", addBookCopies);
router.put("/api/institution/copies/:id", setCopyStatus);
router.get("/api/institution/categories", listCategories3);
router.post("/api/institution/categories", saveCategory2);
router.put("/api/institution/categories/:id", saveCategory2);
router.delete("/api/institution/categories/:id", deleteCategory3);
router.get("/api/institution/borrowers", searchBorrowers);
router.get("/api/institution/loans", listLoans);
router.post("/api/institution/loans/issue", issueBook);
router.post("/api/institution/loans/return", returnBook);
router.post("/api/institution/loans/:id/renew", renewLoan);
router.get("/api/institution/reservations", listReservations);
router.post("/api/institution/reservations", createReservation);
router.delete("/api/institution/reservations/:id", cancelReservation);
router.get("/api/institution/fines", listFines);
router.post("/api/institution/fines/:id/settle", settleFine);
router.get("/api/institution/my-library", myLibrary);
router.get("/api/institution/resources", listResources);
router.post("/api/institution/resources", uploadResource);
router.put("/api/institution/resources/:id", updateResource);
router.post("/api/institution/resources/:id", updateResource);
router.delete("/api/institution/resources/:id", deleteResource);
router.get("/api/institution/resources/:id/file", resourceFile);
router.get("/api/institution/resources/:id/thumb", resourceThumb);
router.get("/api/institution/resource-categories", listResourceCategories);
router.post("/api/institution/resource-categories", saveResourceCategory);
router.put("/api/institution/resource-categories/:id", saveResourceCategory);
router.delete("/api/institution/resource-categories/:id", deleteResourceCategory);
router.get("/api/institution/students", listStudents2);
router.post("/api/institution/students", createStudent2);
router.get("/api/institution/students/:id", getStudent2);
router.put("/api/institution/students/:id", updateStudent2);
router.delete("/api/institution/students/:id", deleteStudent2);
router.post("/api/institution/students/:id/photo", uploadStudentPhoto2);
router.get("/api/institution/students/:id/photo", studentPhoto);
router.get("/api/institution/students/:id/results", studentResults2);
router.get("/api/institution/staff", listStaff2);
router.post("/api/institution/staff", createStaff);
router.get("/api/institution/staff/:id", getStaff);
router.put("/api/institution/staff/:id", updateStaff);
router.delete("/api/institution/staff/:id", deleteStaff);
router.get("/api/institution/me", myProfile);
router.get("/api/institution/me/results", myResults);
router.put("/api/institution/me/profile", updateMyProfile);
router.post("/api/institution/me/photo", uploadMyPhoto);
router.post("/api/institution/me/password", changeMyPassword);
router.get("/api/institution/me/reading", myReading);
router.post("/api/institution/me/reading/:id", saveReading);
router.delete("/api/institution/me/reading/:id", deleteReading);
router.get("/api/institution/departments", listDepartments);
router.post("/api/institution/departments", saveDepartment);
router.put("/api/institution/departments/:id", saveDepartment);
router.delete("/api/institution/departments/:id", deleteDepartment);
router.get("/api/institution/programmes", listProgrammes);
router.post("/api/institution/programmes", saveProgramme);
router.put("/api/institution/programmes/:id", saveProgramme);
router.delete("/api/institution/programmes/:id", deleteProgramme);
router.get("/api/institution/academic-years", listYears2);
router.post("/api/institution/academic-years", saveYear2);
router.put("/api/institution/academic-years/:id", saveYear2);
router.post("/api/institution/terms", saveTerm2);
router.put("/api/institution/terms/:id", saveTerm2);
router.delete("/api/institution/terms/:id", deleteTerm2);
router.get("/api/institution/courses", listCourses3);
router.post("/api/institution/courses", saveCourse);
router.put("/api/institution/courses/:id", saveCourse);
router.delete("/api/institution/courses/:id", deleteCourse2);
router.get("/api/institution/teaching", listTeaching);
router.post("/api/institution/teaching", assignTeacher);
router.delete("/api/institution/teaching/:id", removeTeacher);
router.get("/api/institution/enrollments", listEnrollments);
router.post("/api/institution/enrollments", enroll);
router.delete("/api/institution/enrollments/:id", unenroll);
router.get("/api/institution/results/sheet", resultSheet);
router.post("/api/institution/results/sheet", saveResults2);
router.get("/api/institution/dashboard", dashboard3);
router.get("/api/institution/search", globalSearch);
router.get("/api/institution/reports", reportCatalogue3);
router.get("/api/institution/reports/:key", runReport3);
router.get("/api/institution/audit", auditLog);
router.get("/api/institution/health", health);
router.get("/api/institution/import/fields", importFields);
router.post("/api/institution/import/validate", importValidate);
router.post("/api/institution/import/commit", importCommit);
router.get("/api/institution/import/history", importHistory);
router.get("/api/institution/backups", listBackups);
router.post("/api/institution/backups", makeBackup);
router.post("/api/institution/backups/:id/verify", verifyBackup);
router.get("/api/institution/backups/:id/download", downloadBackup);
router.post("/api/institution/backups/:id/restore", restoreBackup2);
router.delete("/api/institution/backups/:id", deleteBackup);
var index_default = {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const normalizedPath = url.pathname.replace(/\/+$/, "") || "/";
    const protectedPages = {
      "/dashboard.html": ["user", "admin"],
      "/dashboard": ["user", "admin"],
      "/admin.html": ["admin"],
      "/admin": ["admin"],
      "/teachers.html": ["teacher", "admin"],
      "/teachers": ["teacher", "admin"],
      "/parents.html": ["parent", "admin"],
      "/parents": ["parent", "admin"],
      "/profile.html": ["user", "admin", "teacher", "parent"],
      "/profile": ["user", "admin", "teacher", "parent"],
      // Stationery OS is a separate, role-scoped app (Owner/Manager/
      // Operator/Designer/Accountant) layered on top of *any* signed-in
      // smart21brain account — see src/lib/stationery-auth.js.
      "/stationery-app.html": ["user", "admin", "teacher", "parent"],
      "/stationery-app": ["user", "admin", "teacher", "parent"],
      // School System: any signed-in account may open the app; what they see
      // inside is decided per school (role + permissions) by /api/school/*.
      "/school-app.html": ["user", "admin", "teacher", "parent"],
      "/school-app": ["user", "admin", "teacher", "parent"],
      // Smart21Shop: same idea — any signed-in account may open the app; what
      // they can do inside is decided per shop (role + permissions) by /api/shop/*.
      "/shop-app.html": ["user", "admin", "teacher", "parent"],
      "/shop-app": ["user", "admin", "teacher", "parent"],
      // Smart21Institution: same model — any signed-in account may open the app;
      // what they can do inside is decided per institution by /api/institution/*.
      "/institution-app.html": ["user", "admin", "teacher", "parent"],
      "/institution-app": ["user", "admin", "teacher", "parent"]
    };
    const allowedRoles = protectedPages[normalizedPath];
    if (allowedRoles) {
      const user = await getSessionUser(request, env.DB);
      if (!user) {
        const loginPage = normalizedPath.startsWith("/school-") ? "/school-login.html" : normalizedPath.startsWith("/shop-") ? "/shop-login.html" : normalizedPath.startsWith("/institution-") ? "/institution-login.html" : "/login.html";
        return Response.redirect(new URL(loginPage, request.url), 302);
      }
      if (!allowedRoles.includes(user.role)) {
        const roleHome = {
          admin: "/admin.html",
          teacher: "/teachers.html",
          parent: "/parents.html",
          user: "/dashboard.html"
        };
        return Response.redirect(new URL(roleHome[user.role] || "/dashboard.html", request.url), 302);
      }
    }
    if (url.pathname.startsWith("/api/")) {
      try {
        const response = await router.handle(request, env, ctx);
        if (response) return response;
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: "Server error", detail: String(err) }), {
          status: 500,
          headers: { "Content-Type": "application/json" }
        });
      }
    }
    if (/^\/s\/[a-z0-9-]{1,40}(\/[a-z0-9-]{1,40})?\/?$/i.test(url.pathname) && request.method === "GET") {
      return env.ASSETS.fetch(new Request(new URL("/institution-site", request.url), request));
    }
    return env.ASSETS.fetch(request);
  },
  // Daily cron (see [triggers] in wrangler.toml): Smart21Institution weekly automatic backups.
  async scheduled(event, env, ctx) {
    ctx.waitUntil(runScheduledBackups(env));
  }
};
export {
  index_default as default
};
//# sourceMappingURL=index.js.map
