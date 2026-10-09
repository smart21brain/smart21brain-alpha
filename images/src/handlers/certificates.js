import { getSessionUser, json, unauthorized, notFound } from '../lib/auth.js';

// GET /api/courses/:id/certificate — the signed-in user's own certificate
// for one course, if they've earned it. Used by the course page to show
// a "View certificate" link once completion clears every gate.
export async function myCertificate({ request, params, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const cert = await env.DB.prepare(
    `SELECT cert.code, cert.issued_at, c.title AS course_title, c.slug AS course_slug
     FROM certificates cert JOIN courses c ON c.id = cert.course_id
     WHERE cert.user_id = ? AND cert.course_id = ?`
  ).bind(user.id, params.id).first();

  if (!cert) return notFound('No certificate earned for this course yet.');
  return json({ certificate: { ...cert, learner_name: user.name } });
}

// GET /api/certificates/my — every certificate the signed-in user has
// earned, newest first, for a "My Certificates" list.
export async function myCertificates({ request, env }) {
  const user = await getSessionUser(request, env.DB);
  if (!user) return unauthorized();

  const { results } = await env.DB.prepare(
    `SELECT cert.code, cert.issued_at, c.id AS course_id, c.title AS course_title, c.slug AS course_slug, c.thumbnail_url
     FROM certificates cert JOIN courses c ON c.id = cert.course_id
     WHERE cert.user_id = ? ORDER BY cert.issued_at DESC`
  ).bind(user.id).all();

  return json({ certificates: results });
}

// GET /api/certificates/:code — public verification, no sign-in needed:
// anyone holding a printed certificate (or scanning its QR code) can
// confirm it's real, the same way school-verify.html checks a student
// ID card. Deliberately returns only what's printed on the certificate
// itself — never the learner's email or other account details.
export async function verifyCertificate({ params, env }) {
  const cert = await env.DB.prepare(
    `SELECT cert.code, cert.issued_at, u.name AS learner_name, c.title AS course_title, c.slug AS course_slug
     FROM certificates cert
     JOIN users u ON u.id = cert.user_id
     JOIN courses c ON c.id = cert.course_id
     WHERE cert.code = ?`
  ).bind(params.code).first();

  if (!cert) return notFound('No certificate found with that code.');
  return json({ valid: true, certificate: cert });
}
