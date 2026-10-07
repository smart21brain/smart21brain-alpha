/* Smart21Brain — certificate.js (Phase 8 course engine)
   Drives certificate.html: ?code=<certificate code>. Public — no sign-in
   required, since the whole point is that anyone holding the code (or a
   shared link) can verify it's real, the same way school-verify.html
   checks a student ID card. Never fabricates a certificate client-side;
   if the API has no matching code, it shows "not found", full stop. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  // ?download=1 — used by the "Download" buttons on the course page and
  // dashboard: open this page and the PDF starts downloading straight away.
  const autoDownload = params.get('download') === '1';

  const els = {
    loading: document.getElementById('cert-loading'),
    notFound: document.getElementById('cert-not-found'),
    content: document.getElementById('cert-content'),
    name: document.getElementById('cert-name'),
    course: document.getElementById('cert-course'),
    date: document.getElementById('cert-date'),
    code: document.getElementById('cert-code'),
    print: document.getElementById('cert-print'),
    download: document.getElementById('cert-download'),
    downloadLabel: document.getElementById('cert-download-label'),
    downloadError: document.getElementById('cert-download-error'),
  };

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
  }

  let busy = false;
  async function downloadPdf(cert) {
    if (busy) return;
    busy = true;
    els.downloadError.style.display = 'none';
    els.download.disabled = true;
    els.downloadLabel.textContent = 'Preparing…';
    try {
      if (!window.S21CertificatePDF) throw new Error('The PDF tools did not load. Check your connection and refresh the page.');
      const bytes = await window.S21CertificatePDF.build({
        name: cert.learner_name,
        course: cert.course_title,
        date: formatDate(cert.issued_at),
        code: cert.code,
        verifyUrl: `${window.location.origin}/certificate.html?code=${encodeURIComponent(cert.code)}`,
      }, { logoBytes: await window.S21CertificatePDF.loadLogo() });
      window.S21CertificatePDF.download(bytes, `Smart21Brain-Certificate-${window.S21CertificatePDF.fileSlug(cert.course_slug || cert.course_title)}.pdf`);
    } catch (err) {
      els.downloadError.textContent = (err && err.message) || 'Could not create the PDF. You can still use Print and choose "Save as PDF".';
      els.downloadError.style.display = '';
    } finally {
      els.download.disabled = false;
      els.downloadLabel.textContent = 'Download PDF';
      busy = false;
    }
  }

  async function main() {
    if (!code) { hide(els.loading); show(els.notFound); return; }

    let data;
    try {
      const res = await fetch(`/api/certificates/${encodeURIComponent(code)}`);
      if (res.ok) data = await res.json();
    } catch { /* handled below */ }

    hide(els.loading);
    if (!data || !data.certificate) { show(els.notFound); return; }

    const cert = data.certificate;
    document.title = `${cert.course_title} certificate — Smart21Brain`;
    els.name.textContent = cert.learner_name;
    els.course.textContent = cert.course_title;
    els.date.textContent = formatDate(cert.issued_at);
    els.code.textContent = cert.code;
    show(els.content);

    els.print.addEventListener('click', () => window.print());
    els.download.addEventListener('click', () => downloadPdf(cert));
    if (autoDownload) downloadPdf(cert);
  }

  main();
})();
