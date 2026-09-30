/* Smart21Brain — certificate.js (Phase 8 course engine)
   Drives certificate.html: ?code=<certificate code>. Public — no sign-in
   required, since the whole point is that anyone holding the code (or a
   shared link) can verify it's real, the same way school-verify.html
   checks a student ID card. Never fabricates a certificate client-side;
   if the API has no matching code, it shows "not found", full stop. */
(function () {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');

  const els = {
    loading: document.getElementById('cert-loading'),
    notFound: document.getElementById('cert-not-found'),
    content: document.getElementById('cert-content'),
    name: document.getElementById('cert-name'),
    course: document.getElementById('cert-course'),
    date: document.getElementById('cert-date'),
    code: document.getElementById('cert-code'),
    print: document.getElementById('cert-print'),
  };

  function show(el) { if (el) el.style.display = ''; }
  function hide(el) { if (el) el.style.display = 'none'; }

  function formatDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso.includes('T') ? iso : `${iso.replace(' ', 'T')}Z`);
    if (Number.isNaN(d.getTime())) return iso;
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
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
  }

  main();
})();
