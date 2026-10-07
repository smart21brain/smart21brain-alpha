/* Smart21Brain — certificate-pdf.js
   Builds the downloadable certificate as a real, vector A4-landscape PDF
   using the vendored pdf-lib (js/vendor/pdf-lib.min.js) and, optionally,
   the vendored QR generator (js/vendor/qrcode.min.js). No network calls to
   third parties and no screenshotting of the page, so the file is always
   crisp and looks the same on every device.

   Design: gold frame on warm cream paper, the round S21 logo at the top,
   a gold seal with ribbons, and (for server-issued certificates) a QR code
   that opens the public verification page.

   Usage (browser):
     const bytes = await S21CertificatePDF.build(
       { name, course, date, code, verifyUrl },
       { logoBytes: await S21CertificatePDF.loadLogo() });
     S21CertificatePDF.download(bytes, 'Smart21Brain-Certificate.pdf');

   Only data that came back from /api/certificates/:code (or the learner's
   own saved progress) should ever be passed in — this file draws what it
   is given and invents nothing. */
(function (root) {
  const LOGO_URL = 'images/logo/s21-certificate-logo.png';

  // Gold palette
  const GOLD_DARK = [0.604, 0.455, 0.063];   // #9A7410
  const GOLD = [0.831, 0.686, 0.216];        // #D4AF37
  const GOLD_LIGHT = [0.945, 0.863, 0.541];  // #F1DC8A
  const GOLD_PALE = [0.980, 0.941, 0.800];   // #FAF0CC
  const INK = [0.231, 0.165, 0.043];         // #3B2A0B  deep brown-black
  const SOFT = [0.478, 0.416, 0.271];        // #7A6A45
  const PAPER = [1, 0.976, 0.890];           // #FFF9E3

  const W = 841.89, H = 595.28; // A4 landscape, points

  function lib() {
    const L = root.PDFLib;
    if (!L) throw new Error('PDF library failed to load.');
    return L;
  }

  // Standard PDF fonts only cover Latin-1 ("WinAnsi"). Swahili and English
  // names are fine; anything outside that range is swapped for "?" rather
  // than crashing the whole download.
  function safe(font, text) {
    let out = '';
    for (const ch of String(text == null ? '' : text)) {
      try { font.encodeText(ch); out += ch; } catch { out += '?'; }
    }
    return out;
  }

  function fitSize(font, text, maxWidth, start, min) {
    let size = start;
    while (size > min && font.widthOfTextAtSize(text, size) > maxWidth) size -= 1;
    return size;
  }

  function wrap(font, text, size, maxWidth) {
    const words = text.split(/\s+/).filter(Boolean);
    const lines = [];
    let line = '';
    for (const w of words) {
      const trial = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(trial, size) <= maxWidth || !line) line = trial;
      else { lines.push(line); line = w; }
    }
    if (line) lines.push(line);
    return lines;
  }

  async function loadLogo() {
    try {
      const res = await fetch(LOGO_URL);
      if (!res.ok) return null;
      return new Uint8Array(await res.arrayBuffer());
    } catch { return null; }
  }

  async function build(data, opts) {
    const { PDFDocument, StandardFonts, rgb } = lib();
    opts = opts || {};

    const pdf = await PDFDocument.create();
    pdf.setTitle(`${data.course} — Certificate of Completion`);
    pdf.setAuthor('Smart21Brain');
    pdf.setSubject(data.code ? `Certificate ${data.code}` : 'Certificate of completion');
    const page = pdf.addPage([W, H]);

    const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const serifBoldItalic = await pdf.embedFont(StandardFonts.TimesRomanBoldItalic);
    const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
    const sans = await pdf.embedFont(StandardFonts.Helvetica);
    const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const mono = await pdf.embedFont(StandardFonts.Courier);
    const c = (a) => rgb(a[0], a[1], a[2]);

    const centerText = (text, y, font, size, color) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (W - w) / 2, y, size, font, color: c(color) });
    };
    // Letter-spaced text, centred on x (default: the page centre).
    const spaced = (text, y, font, size, color, spacing, cx) => {
      const chars = [...text];
      const total = chars.reduce((s, ch) => s + font.widthOfTextAtSize(ch, size) + spacing, -spacing);
      let x = (cx == null ? W / 2 : cx) - total / 2;
      for (const ch of chars) {
        page.drawText(ch, { x, y, size, font, color: c(color) });
        x += font.widthOfTextAtSize(ch, size) + spacing;
      }
      return total;
    };
    const frame = (inset, color, width, opacity) => page.drawRectangle({
      x: inset, y: inset, width: W - 2 * inset, height: H - 2 * inset,
      borderColor: c(color), borderWidth: width, opacity: 0, borderOpacity: opacity == null ? 1 : opacity,
    });
    const diamond = (x, y, s, color) => page.drawSvgPath(`M 0 ${-s} L ${s} 0 L 0 ${s} L ${-s} 0 Z`, { x, y, color: c(color) });

    // ---- paper -------------------------------------------------------------
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c(PAPER) });
    // Faint guilloche rings behind the text give the paper a security-print feel.
    for (let r = 70; r <= 330; r += 16) {
      page.drawCircle({
        x: W / 2, y: H / 2 - 10, size: r,
        borderColor: c(GOLD_LIGHT), borderWidth: 0.5, borderOpacity: 0.45, opacity: 0,
      });
    }

    // ---- gold frame --------------------------------------------------------
    frame(20, GOLD, 10);               // the gold band
    frame(15, GOLD_DARK, 1);           // dark pinstripe, outside
    frame(25, GOLD_DARK, 1);           // dark pinstripe, inside
    frame(20, GOLD_LIGHT, 3, 0.9);     // highlight stripe along the band
    frame(36, GOLD, 0.9);              // thin inner keyline
    frame(41, GOLD_LIGHT, 0.6);
    for (const [cx, cy] of [[36, 36], [W - 36, 36], [36, H - 36], [W - 36, H - 36]]) {
      diamond(cx, cy, 7, GOLD_DARK);
      diamond(cx, cy, 4, GOLD_LIGHT);
    }

    // ---- logo --------------------------------------------------------------
    const logoSize = 78;
    const logoY = H - 134;
    let drewLogo = false;
    if (opts.logoBytes) {
      try {
        const img = await pdf.embedPng(opts.logoBytes);
        // gold ring behind the round logo
        page.drawCircle({ x: W / 2, y: logoY + logoSize / 2, size: logoSize / 2 + 4, color: c(GOLD) });
        page.drawCircle({ x: W / 2, y: logoY + logoSize / 2, size: logoSize / 2 + 1.5, color: c(GOLD_LIGHT) });
        page.drawImage(img, { x: (W - logoSize) / 2, y: logoY, width: logoSize, height: logoSize });
        drewLogo = true;
      } catch { /* logo is decoration — skip it if it can't be embedded */ }
    }
    if (!drewLogo) centerText('Smart21Brain', logoY + 30, serifBold, 26, GOLD_DARK);

    // ---- title -------------------------------------------------------------
    spaced('CERTIFICATE', 436, serifBold, 36, GOLD_DARK, 9);
    const subW = spaced('OF COMPLETION', 414, sansBold, 11, SOFT, 5);
    for (const dir of [-1, 1]) {
      const x0 = W / 2 + dir * (subW / 2 + 14);
      page.drawLine({ start: { x: x0, y: 418 }, end: { x: x0 + dir * 70, y: 418 }, thickness: 0.8, color: c(GOLD) });
      diamond(x0 + dir * 78, 418, 2.6, GOLD);
    }

    // ---- body --------------------------------------------------------------
    centerText('This certifies that', 382, serifItalic, 15, SOFT);

    const name = safe(serifBoldItalic, data.name);
    const nameSize = fitSize(serifBoldItalic, name, 640, 46, 20);
    const nameY = 334;
    centerText(name, nameY, serifBoldItalic, nameSize, INK);
    const nameW = Math.min(serifBoldItalic.widthOfTextAtSize(name, nameSize) + 70, 700);
    page.drawLine({
      start: { x: (W - nameW) / 2, y: nameY - 12 }, end: { x: (W + nameW) / 2, y: nameY - 12 },
      thickness: 1.4, color: c(GOLD),
    });
    page.drawLine({
      start: { x: (W - nameW) / 2 + 24, y: nameY - 16 }, end: { x: (W + nameW) / 2 - 24, y: nameY - 16 },
      thickness: 0.5, color: c(GOLD_DARK),
    });

    centerText('has successfully completed the course', nameY - 44, serifItalic, 15, SOFT);

    const course = safe(sansBold, data.course);
    let cSize = 25;
    let lines = wrap(sansBold, course, cSize, 640);
    while (lines.length > 2 && cSize > 14) { cSize -= 2; lines = wrap(sansBold, course, cSize, 640); }
    let cy = nameY - 84;
    for (const ln of lines.slice(0, 2)) {
      centerText(ln, cy, sansBold, cSize, GOLD_DARK);
      cy -= cSize + 6;
    }

    // ---- footer: date + code | seal | QR ------------------------------------
    const baseY = 100;
    page.drawText('ISSUED', { x: 84, y: baseY + 36, size: 8, font: sansBold, color: c(SOFT) });
    page.drawText(safe(sansBold, data.date), { x: 84, y: baseY + 18, size: 13, font: sansBold, color: c(INK) });
    if (data.code) {
      page.drawText('CERTIFICATE CODE', { x: 84, y: baseY - 4, size: 8, font: sansBold, color: c(SOFT) });
      page.drawText(safe(mono, data.code), { x: 84, y: baseY - 20, size: 12, font: mono, color: c(INK) });
    }

    // Seal with ribbons (ribbons first so the disc sits on top of them)
    const sx = W / 2, sy = baseY + 22, sr = 33;
    page.drawSvgPath('M 0 0 L 24 0 L 24 46 L 12 36 L 0 46 Z', { x: sx - 30, y: sy - 18, color: c(GOLD_DARK) });
    page.drawSvgPath('M 0 0 L 24 0 L 24 46 L 12 36 L 0 46 Z', { x: sx + 6, y: sy - 18, color: c(GOLD) });
    for (let i = 0; i < 28; i += 1) {
      const a = (i / 28) * Math.PI * 2;
      page.drawCircle({ x: sx + Math.cos(a) * (sr - 1), y: sy + Math.sin(a) * (sr - 1), size: 5, color: c(GOLD) });
    }
    page.drawCircle({ x: sx, y: sy, size: sr - 2, color: c(GOLD) });
    page.drawCircle({ x: sx, y: sy, size: sr - 6, color: c(GOLD_LIGHT) });
    page.drawCircle({ x: sx, y: sy, size: sr - 8, color: c(GOLD), borderColor: c(GOLD_DARK), borderWidth: 1 });
    // five-point star
    const star = [];
    for (let i = 0; i < 10; i += 1) {
      const a = Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? 14 : 6;
      star.push(`${(Math.cos(a) * rr).toFixed(2)} ${(-Math.sin(a) * rr).toFixed(2)}`);
    }
    page.drawSvgPath(`M ${star.join(' L ')} Z`, { x: sx, y: sy + 3, color: c(GOLD_PALE) });
    const s21w = sansBold.widthOfTextAtSize('S21', 8);
    page.drawText('S21', { x: sx - s21w / 2, y: sy - 17, size: 8, font: sansBold, color: c(INK) });

    // QR code — vector squares, so it stays sharp at any zoom / print size.
    const qrSize = 78;
    const qrX = W - 84 - qrSize;
    const qrY = baseY - 14;
    const qrLib = root.qrcode;
    if (qrLib && data.verifyUrl) {
      try {
        const qr = qrLib(0, 'M');
        qr.addData(data.verifyUrl);
        qr.make();
        const n = qr.getModuleCount();
        const cell = qrSize / n;
        for (let r = 0; r < n; r += 1) {
          for (let col = 0; col < n; col += 1) {
            if (qr.isDark(r, col)) {
              page.drawRectangle({
                x: qrX + col * cell, y: qrY + qrSize - (r + 1) * cell,
                width: cell + 0.15, height: cell + 0.15, color: c(INK),
              });
            }
          }
        }
        const lab = 'Scan to verify';
        const lw2 = sans.widthOfTextAtSize(lab, 8);
        page.drawText(lab, { x: qrX + (qrSize - lw2) / 2, y: qrY - 11, size: 8, font: sans, color: c(SOFT) });
      } catch { /* QR is a convenience; the printed code still verifies */ }
    }

    if (data.verifyUrl) {
      const shown = data.verifyUrl.replace(/^https?:\/\//, '');
      const size = fitSize(sans, shown, W - 200, 8, 5);
      centerText(safe(sans, shown), 47, sans, size, SOFT);
    } else if (data.note) {
      // No server record to point at (course completed from progress saved
      // on this device) — say so on the certificate instead of implying
      // it can be checked online.
      centerText(safe(sans, data.note), 47, sans, 8, SOFT);
    }

    return pdf.save();
  }

  function download(bytes, filename) {
    const blob = new Blob([bytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function fileSlug(text) {
    return String(text || 'course').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || 'course';
  }

  root.S21CertificatePDF = { build, download, loadLogo, fileSlug };
})(typeof window !== 'undefined' ? window : globalThis);
