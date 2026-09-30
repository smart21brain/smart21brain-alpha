// Smart21Shop — QR tag helpers (pure functions, no database access).
//
// Every physical item that gets a QR label owns ONE random code. The QR
// image holds a link to the public check page, e.g.
//   https://<your-site>/shop-verify.html?c=K7M2QXW9PT4B
// so an ordinary phone camera can open it, and the in-app scanner reads the
// same link. The code is random (not a counter) so nobody can guess the next
// one and look other items up.

// 32 characters, no I/O, so `& 31` maps a random byte to a character without bias.
export const QR_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export const QR_CODE_LEN = 12;                       // 32^12 ≈ 1.2e18 combinations
export const QR_CODE_RE = /^[A-HJ-NP-Z2-9]{12}$/;
export const QR_MAX_PER_BATCH = 300;

export function newQrCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(QR_CODE_LEN));
  let s = '';
  for (const b of bytes) s += QR_ALPHABET[b & 31];
  return s;
}

// n distinct codes.
export function newQrCodes(n) {
  const set = new Set();
  while (set.size < n) set.add(newQrCode());
  return [...set];
}

// Accepts a full link (…?c=CODE) or a bare code (typed by hand). Returns the
// normalised CODE, or null when the text is not one of ours.
//   urlOnly: only accept the link form. The till uses this for hand-held
//   scanners that "type" what they read into the search box — a 12-digit
//   product barcode must never be mistaken for a QR code.
export function extractQrCode(input, { urlOnly = false } = {}) {
  const raw = String(input == null ? '' : input).trim();
  if (!raw || raw.length > 500) return null;
  let cand = null;
  try { cand = new URL(raw).searchParams.get('c'); } catch (e) { /* not a full link */ }
  if (cand == null) {
    const m = raw.match(/[?&]c=([^&#\s]+)/i);       // "shop-verify.html?c=CODE" without the site name
    if (m) cand = m[1];
  }
  if (cand == null) {
    if (urlOnly) return null;
    cand = raw;
  }
  cand = cand.toUpperCase().replace(/[\s-]/g, '');
  return QR_CODE_RE.test(cand) ? cand : null;
}

// Unique, normalised codes from a list the browser sent.
// Returns { codes } when fine, or { error } with a message for the user.
export function cleanQrList(list, max = 200) {
  if (list == null) return { codes: [] };
  if (!Array.isArray(list)) return { error: 'QR codes must be sent as a list.' };
  if (list.length > max) return { error: `Too many QR codes at once (${max} maximum).` };
  const seen = new Set();
  for (const item of list) {
    const c = extractQrCode(item);
    if (!c) return { error: 'One of the QR codes is not valid. Please scan it again.' };
    if (seen.has(c)) return { error: 'The same item was scanned twice.' };
    seen.add(c);
  }
  return { codes: [...seen] };
}
