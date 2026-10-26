// Numbers shared by the teacher dashboard overview and the weekly summary e-mail,
// so both always agree.

// Average quiz score (0-100) over a period, across every quiz used in the teacher's courses
// (lesson quizzes, module quizzes and final exams), counting only students enrolled in those courses.
//   sc     = SQL fragment limiting `courses c` to the courses the person may see (e.g. "c.instructor_id = ?")
//   binds  = the values for that fragment
//   since  = SQL expression for the start of the period, e.g. "datetime('now', 'start of month')"
export async function quizAverage(db, sc, binds, since) {
  const row = await db.prepare(
    `SELECT AVG(qa.score * 100.0 / NULLIF(qa.total, 0)) AS avg
     FROM quiz_attempts qa
     WHERE qa.completed_at >= ${since}
       AND qa.user_id IN (
         SELECT e.user_id FROM course_enrollments e JOIN courses c ON c.id = e.course_id WHERE ${sc}
       )
       AND qa.quiz_id IN (
         SELECT cl.quiz_id FROM course_lessons cl JOIN courses c ON c.id = cl.course_id WHERE cl.quiz_id IS NOT NULL AND ${sc}
         UNION SELECT cm.quiz_id FROM course_modules cm JOIN courses c ON c.id = cm.course_id WHERE cm.quiz_id IS NOT NULL AND ${sc}
         UNION SELECT c.final_exam_quiz_id FROM courses c WHERE c.final_exam_quiz_id IS NOT NULL AND ${sc}
       )`
  ).bind(...binds, ...binds, ...binds, ...binds).first();
  return row && row.avg != null ? Math.round(row.avg) : null;
}
