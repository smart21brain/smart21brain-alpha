/* Smart21Brain — certificate-pdf.js
   Builds the downloadable certificate as a real, vector A4-landscape PDF
   using the vendored pdf-lib (js/vendor/pdf-lib.min.js) and, optionally,
   the vendored QR generator (js/vendor/qrcode.min.js). No network calls to
   third parties and no screenshotting of the page, so the file is always
   crisp and looks the same on every device.

   Usage (browser):
     const bytes = await S21CertificatePDF.build({
       name, course, date, code, verifyUrl
     });
     S21CertificatePDF.download(bytes, 'Smart21Brain-Certificate.pdf');

   Only data that came back from /api/certificates/:code should ever be
   passed in — this file draws what it is given and invents nothing. */
(function (root) {
  const GREEN = [0.043, 0.431, 0.310];   // #0B6E4F  (--s21-primary)
  const GOLD = [0.788, 0.635, 0.153];    // #C9A227
  const INK = [0.12, 0.14, 0.17];
  const SOFT = [0.42, 0.45, 0.50];
  const PAPER = [1, 0.992, 0.969];

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

  async function build(data, opts) {
    const { PDFDocument, StandardFonts, rgb } = lib();
    opts = opts || {};

    const pdf = await PDFDocument.create();
    pdf.setTitle(`${data.course} — Certificate of Completion`);
    pdf.setAuthor('Smart21Brain');
    pdf.setSubject(`Certificate ${data.code}`);
    const page = pdf.addPage([W, H]);

    const serifBold = await pdf.embedFont(StandardFonts.TimesRomanBold);
    const serifItalic = await pdf.embedFont(StandardFonts.TimesRomanItalic);
    const sans = await pdf.embedFont(StandardFonts.Helvetica);
    const sansBold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const mono = await pdf.embedFont(StandardFonts.Courier);
    const c = (a) => rgb(a[0], a[1], a[2]);

    const centerText = (text, y, font, size, color) => {
      const w = font.widthOfTextAtSize(text, size);
      page.drawText(text, { x: (W - w) / 2, y, size, font, color: c(color) });
    };
    // Letter-spaced caps for the small headings.
    const spaced = (text, y, font, size, color, spacing) => {
      const chars = [...text];
      const total = chars.reduce((s, ch) => s + font.widthOfTextAtSize(ch, size) + spacing, -spacing);
      let x = (W - total) / 2;
      for (const ch of chars) {
        page.drawText(ch, { x, y, size, font, color: c(color) });
        x += font.widthOfTextAtSize(ch, size) + spacing;
      }
    };

    // ---- paper + borders -------------------------------------------------
    page.drawRectangle({ x: 0, y: 0, width: W, height: H, color: c(PAPER) });
    page.drawRectangle({ x: 20, y: 20, width: W - 40, height: H - 40, borderColor: c(GREEN), borderWidth: 3 });
    page.drawRectangle({ x: 30, y: 30, width: W - 60, height: H - 60, borderColor: c(GOLD), borderWidth: 1 });
    // Corner accents
    for (const [cx, cy] of [[30, 30], [W - 30, 30], [30, H - 30], [W - 30, H - 30]]) {
      page.drawRectangle({ x: cx - 5, y: cy - 5, width: 10, height: 10, color: c(GOLD) });
    }

    // ---- logo + brand ----------------------------------------------------
    let y = H - 62;
    if (opts.logoBytes) {
      try {
        const img = await pdf.embedPng(opts.logoBytes);
        const lh = 52;
        const lw = (img.width / img.height) * lh;
        page.drawImage(img, { x: (W - lw) / 2, y: y - lh + 14, width: lw, height: lh });
        y -= lh;
      } catch { /* logo is decoration — skip it if it can't be embedded */ }
    }
    centerText('Smart21Brain', y - 18, serifBold, 24, GREEN);
    spaced('CERTIFICATE OF COMPLETION', y - 42, sansBold, 11, SOFT, 3);

    // ---- body ------------------------------------------------------------
    centerText('This certifies that', y - 82, serifItalic, 15, SOFT);

    const name = safe(serifBold, data.name);
    const nameSize = fitSize(serifBold, name, 640, 44, 20);
    const nameY = y - 128;
    centerText(name, nameY, serifBold, nameSize, INK);
    const nameW = Math.min(serifBold.widthOfTextAtSize(name, nameSize) + 60, 700);
    page.drawLine({
      start: { x: (W - nameW) / 2, y: nameY - 10 }, end: { x: (W + nameW) / 2, y: nameY - 10 },
      thickness: 1, color: c(GOLD),
    });

    centerText('has successfully completed the course', nameY - 40, serifItalic, 15, SOFT);

    const course = safe(sansBold, data.course);
    let cSize = 26;
    let lines = wrap(sansBold, course, cSize, 640);
    while (lines.length > 2 && cSize > 14) { cSize -= 2; lines = wrap(sansBold, course, cSize, 640); }
    let cy = nameY - 78;
    for (const ln of lines.slice(0, 2)) {
      centerText(ln, cy, sansBold, cSize, GREEN);
      cy -= cSize + 6;
    }

    // ---- footer: date | signature | QR ------------------------------------
    const baseY = 78;
    page.drawText('ISSUED', { x: 80, y: baseY + 34, size: 8, font: sansBold, color: c(SOFT) });
    page.drawText(safe(sansBold, data.date), { x: 80, y: baseY + 16, size: 13, font: sansBold, color: c(INK) });
    page.drawText('CERTIFICATE CODE', { x: 80, y: baseY - 4, size: 8, font: sansBold, color: c(SOFT) });
    page.drawText(safe(mono, data.code), { x: 80, y: baseY - 20, size: 12, font: mono, color: c(INK) });

    const sigW = 170;
    page.drawLine({
      start: { x: (W - sigW) / 2, y: baseY + 20 }, end: { x: (W + sigW) / 2, y: baseY + 20 },
      thickness: 0.8, color: c(SOFT),
    });
    centerText('Smart21Brain Academy', baseY + 4, sansBold, 10, INK);
    centerText('Authorised signature', baseY - 8, sans, 8, SOFT);

    // QR code — vector squares, so it stays sharp at any zoom / print size.
    const qrSize = 78;
    const qrX = W - 80 - qrSize;
    const qrY = baseY - 22;
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
      const size = fitSize(sans, shown, W - 120, 8, 5);
      centerText(safe(sans, shown), 40, sans, size, SOFT);
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

  root.S21CertificatePDF = { build, download };
})(typeof window !== 'undefined' ? window : globalThis);
