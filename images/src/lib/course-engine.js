// PHASE 8 — Course Engine v2
//
// Shared logic for the completion algorithm used everywhere a course's
// progress needs computing or a certificate might be issued:
//
//   Lessons completed -> Required percentage -> Final assessment ->
//   Passing score -> Course completed -> Certificate
//
// A course's "completable units" are its lessons (lesson_progress) plus
// one unit per module that has its own quiz (course_modules.quiz_id,
// graded via the existing quiz_attempts table — a module quiz is a
// normal quiz, not a separate grading system). Once enough of those
// units are done to clear the course's required percentage
// (courses.passing_score), the optional Final Exam
// (courses.final_exam_quiz_id) unlocks; clearing its
// final_exam_passing_score is what actually completes the course. A
// course with no final exam completes as soon as the percentage gate
// is met — this keeps every pre-Phase-8 course working unchanged.

export function randomCertCode(bytes = 8) {
  return [...crypto.getRandomValues(new Uint8Array(bytes))]
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
}

// Best-ever score (0-100) a user has on a given quiz, or null if they've
// never attempted it.
async function bestQuizPercent(env, userId, quizId) {
  if (!userId || !quizId) return null;
  const row = await env.DB.prepare(
    'SELECT MAX(CAST(score AS REAL) / NULLIF(total, 0)) AS best FROM quiz_attempts WHERE user_id = ? AND quiz_id = ?'
  ).bind(userId, quizId).first();
  return row?.best != null ? Math.round(row.best * 100) : null;
}

// Pure calculation — no writes. `course` needs at least: id, passing_score,
// final_exam_quiz_id, final_exam_passing_score, certificate_enabled.
// `userId` may be null (an anonymous visitor previewing a course page);
// in that case every "done"/"passed" field comes back false/null.
export async function getCourseProgress(env, userId, course) {
  const { results: modules } = await env.DB.prepare(
    'SELECT id, title, description, quiz_id, passing_score, sort_order FROM course_modules WHERE course_id = ? ORDER BY sort_order ASC, id ASC'
  ).bind(course.id).all();

  const { results: lessons } = await env.DB.prepare(
    'SELECT id, module_id FROM course_lessons WHERE course_id = ?'
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
  const percent = totalUnits > 0 ? Math.round((completedUnits / totalUnits) * 100) : 0;
  const requiredPercent = course.passing_score ?? 70;
  const lessonsRequirementMet = percent >= requiredPercent;

  let finalExam = null;
  let finalExamPassed = true; // trivially true when the course has no final exam
  if (course.final_exam_quiz_id) {
    const bestPercent = userId ? await bestQuizPercent(env, userId, course.final_exam_quiz_id) : null;
    finalExamPassed = bestPercent != null && bestPercent >= course.final_exam_passing_score;
    finalExam = {
      quiz_id: course.final_exam_quiz_id,
      passing_score: course.final_exam_passing_score,
      best_score_percent: bestPercent,
      passed: finalExamPassed,
      unlocked: lessonsRequirementMet,
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
    course_completed: courseCompleted,
  };
}

// Writes: call after anything that could change completion — a lesson
// toggled, or a module-quiz/final-exam attempt submitted. Updates the
// enrollment's status and issues a certificate the first time a course
// is completed. Safe to call repeatedly: issuing is idempotent (one
// certificate per user+course, kept even if progress later dips below
// the threshold again — a certificate once earned isn't taken back).
export async function syncCourseCompletion(env, userId, course) {
  const progress = await getCourseProgress(env, userId, course);

  const enrollment = await env.DB.prepare(
    'SELECT * FROM course_enrollments WHERE user_id = ? AND course_id = ?'
  ).bind(userId, course.id).first();

  if (enrollment) {
    if (progress.course_completed && enrollment.status !== 'completed') {
      await env.DB.prepare(
        "UPDATE course_enrollments SET status = 'completed', completed_at = datetime('now') WHERE id = ?"
      ).bind(enrollment.id).run();
    } else if (!progress.course_completed && enrollment.status === 'completed') {
      await env.DB.prepare(
        "UPDATE course_enrollments SET status = 'active', completed_at = NULL WHERE id = ?"
      ).bind(enrollment.id).run();
    }
  }

  let certificate = await env.DB.prepare(
    'SELECT code, issued_at FROM certificates WHERE user_id = ? AND course_id = ?'
  ).bind(userId, course.id).first();

  if (progress.course_completed && course.certificate_enabled && !certificate) {
    const code = randomCertCode();
    await env.DB.prepare(
      'INSERT INTO certificates (user_id, course_id, code) VALUES (?, ?, ?)'
    ).bind(userId, course.id, code).run();
    certificate = { code, issued_at: new Date().toISOString() };
  }

  return { ...progress, certificate };
}

// After a quiz attempt is graded, find every course this quiz is a
// gate for (its module quiz, or its final exam — normally just one)
// and resync completion for the user who took it. Returns a small
// summary per affected course, or [] if the quiz isn't part of any
// course's structure (an ordinary standalone site quiz).
export async function syncCoursesForQuiz(env, userId, quizId) {
  const { results: courseRows } = await env.DB.prepare(
    `SELECT DISTINCT c.* FROM courses c
     LEFT JOIN course_modules m ON m.course_id = c.id AND m.quiz_id = ?
     WHERE c.final_exam_quiz_id = ? OR m.id IS NOT NULL`
  ).bind(quizId, quizId).all();

  const results = [];
  for (const course of courseRows) {
    const enrolled = await env.DB.prepare(
      'SELECT 1 FROM course_enrollments WHERE user_id = ? AND course_id = ?'
    ).bind(userId, course.id).first();
    if (!enrolled) continue;
    const progress = await syncCourseCompletion(env, userId, course);
    results.push({ course_id: course.id, course_title: course.title, course_slug: course.slug, ...progress });
  }
  return results;
}
