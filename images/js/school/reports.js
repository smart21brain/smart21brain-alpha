/* Reports centre: choose a report, filter, search, print, export PDF / Excel. */
(function () {
  'use strict';
  const SC = window.SC; const esc = SC.esc;

  SC.modules.reports = async (el) => {
    const [{ groups }, lk, { exams }] = await Promise.all([SC.api.get('/reports'), SC.lookups(), SC.api.get('/exams').catch(() => ({ exams: [] }))]);
    const monthStart = SC.today().slice(0, 8) + '01';
    let current = null; let report = null; let student = null; let term = '';
    const rowsFiltered = () => { const t = term.toLowerCase(); return t ? report.rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(t))) : report.rows; };
    const flat = groups.flatMap((g) => g.items.map((i) => ({ ...i, group: g.group })));

    el.innerHTML = `${SC.pageHead(SC.t('Reports', 'Ripoti'), SC.t('Pick a report, set the filters, then print or export it', 'Chagua ripoti, weka vichujio, kisha ichapishe au uihamishe'))}
      <div class="sc-grid" style="grid-template-columns:280px minmax(0,1fr);align-items:start" id="repGrid">
        <div class="sc-card" style="padding:.7rem">${groups.map((g) => `<div class="sc-nav-group" style="padding-top:.6rem">${esc(g.group)}</div>${g.items.map((i) => `<a href="#reports" class="sc-rep-link" data-act="pick" data-key="${i.key}" style="display:block;padding:.5rem .7rem;border-radius:10px;font-weight:600;color:var(--sc-text)">${esc(i.label)}</a>`).join('')}`).join('')}</div>
        <div id="repMain"><div class="sc-card">${SC.empty('fa-chart-pie', SC.t('Choose a report', 'Chagua Ripoti'), SC.t('Pick a report from the list to get started.', 'Chagua ripoti kutoka orodhani kuanza.'))}</div></div></div>`;
    const style = document.createElement('style'); style.textContent = '.sc-rep-link:hover,.sc-rep-link.on{background:var(--sc-primary-100)!important;color:var(--sc-primary)!important}@media(max-width:900px){#repGrid{grid-template-columns:1fr!important}}'; el.prepend(style);
    const main = el.querySelector('#repMain');

    function filterField(f) {
      switch (f) {
        case 'from': return SC.f.input('from', SC.t('From', 'Kuanzia'), { type: 'date', value: monthStart });
        case 'to': return SC.f.input('to', SC.t('To', 'Hadi'), { type: 'date', value: SC.today() });
        case 'date': return SC.f.input('date', SC.t('Date', 'Tarehe'), { type: 'date', value: SC.today() });
        case 'month': return SC.f.input('month', SC.t('Month', 'Mwezi'), { type: 'month', value: SC.today().slice(0, 7) });
        case 'class_id': return SC.f.select('class_id', SC.t('Class', 'Darasa'), SC.opts.classes(lk, false), { placeholder: current.filters.includes('class_id') && ['attendance.class'].includes(current.key) ? SC.t('Choose a class', 'Chagua darasa') : SC.t('All classes', 'Madarasa yote'), required: current.key === 'attendance.class' });
        case 'status': return SC.f.select('status', SC.t('Status', 'Hali'), SC.opts.status, { placeholder: SC.t('Any status', 'Hali yoyote') });
        case 'method': return SC.f.select('method', SC.t('Payment method', 'Njia ya Malipo'), (SC.state.settings.payment_methods || []).map((m) => [m, m]), { placeholder: SC.t('All methods', 'Njia zote') });
        case 'exam_id': return SC.f.select('exam_id', SC.t('Examination', 'Mtihani'), exams.map((e) => ({ v: e.id, l: `${e.name} — ${SC.classLabel({ name: e.class_name, stream: e.class_stream })}` })), { placeholder: current.key === 'academic.exam_results' ? SC.t('Choose an examination', 'Chagua mtihani') : SC.t('All examinations', 'Mitihani yote'), required: current.key === 'academic.exam_results' });
        case 'student_id': return `<div class="sc-field"><label for="rsQ">${SC.t('Student', 'Mwanafunzi')} <span class="req">*</span></label><input class="sc-input" id="rsQ" type="search" placeholder="${SC.t('Type name or ID…', 'Andika jina au namba…')}" autocomplete="off"><div id="rsRes" class="sc-list"></div><div id="rsPicked" class="sc-small"></div></div>`;
        default: return '';
      }
    }

    function showForm() {
      const filters = current.filters;
      main.innerHTML = `<div class="sc-card"><div class="sc-card-head"><div><h3>${esc(current.label)}</h3><span class="sc-muted sc-small">${esc(current.group)}</span></div></div>
        <form class="sc-form" id="repForm" novalidate><div class="cols-3">${filters.map(filterField).join('')}</div><div class="sc-row"><button class="sc-btn primary" type="submit"><i class="fa-solid fa-play"></i> ${SC.t('Show report', 'Onyesha Ripoti')}</button></div></form></div><div id="repOut"></div>`;
      student = null;
      const form = main.querySelector('#repForm');
      const q = form.querySelector('#rsQ');
      if (q) {
        const run = SC.debounce(async () => {
          const term = q.value.trim(); const box = form.querySelector('#rsRes'); if (term.length < 2) { box.innerHTML = ''; return; }
          let d; try { d = await SC.api.get('/fees/overview' + SC.qs({ q: term, limit: 6 })).catch(() => SC.api.get('/students' + SC.qs({ q: term, limit: 6 }))); } catch (e) { return; }
          const list = d.students.map((s) => ({ id: s.student_id || s.id, name: s.full_name, adm: s.admission_no }));
          box.innerHTML = list.map((s) => `<div class="sc-spread"><span>${esc(s.name)} <span class="sc-muted sc-small">${esc(s.adm)}</span></span><button type="button" class="sc-btn primary sm" data-pick="${s.id}" data-n="${esc(s.name)}">${SC.t('Choose', 'Chagua')}</button></div>`).join('') || `<div class="sc-muted sc-small">${SC.t('No student found.', 'Hakuna mwanafunzi aliyepatikana.')}</div>`;
        }, 250);
        q.addEventListener('input', run);
        form.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (!b) return; student = b.dataset.pick; form.querySelector('#rsPicked').innerHTML = `<span class="sc-chip ok"><i class="fa-solid fa-check"></i> ${esc(b.dataset.n)}</span>`; form.querySelector('#rsRes').innerHTML = ''; });
      }
      form.addEventListener('submit', async (e) => {
        e.preventDefault(); if (!SC.validate(form)) return;
        if (filters.includes('student_id') && !student) return SC.toast(SC.t('Please choose a student first.', 'Tafadhali chagua mwanafunzi kwanza.'), 'warn');
        const params = SC.formData(form); delete params.rsQ; if (student) params.student_id = student;
        const out = main.querySelector('#repOut'); out.innerHTML = SC.skeleton(6);
        try { report = (await SC.api.get(`/reports/${current.key}` + SC.qs(params))).report; drawReport(out); } catch (err) { out.innerHTML = SC.errorBox(err); }
      });
    }

    function drawReport(out) {
      term = '';
      const sw = SC.isSw();
      const render = () => {
        const rows = rowsFiltered();
        out.querySelector('#repTable').innerHTML = SC.table(report.columns.map((c) => ({ label: c.label, cls: c.align === 'end' ? 'end' : '', render: (r) => esc(r[c.key] == null ? '' : r[c.key]) })), rows, { cls: 'compact', empty: SC.empty('fa-table', SC.t('No records', 'Hakuna kumbukumbu'), SC.t('Nothing matches this report and filter.', 'Hakuna kinacholingana na ripoti na kichujio hiki.')) });
        out.querySelector('#repCount').textContent = sw ? `Safu ${rows.length}` : `${rows.length} row${rows.length === 1 ? '' : 's'}`;
      };
      out.innerHTML = `<div class="sc-card" style="margin-top:1.1rem"><div class="sc-card-head"><div><h3>${esc(report.title)}</h3><div class="sc-row" style="gap:.4rem;margin-top:.3rem">${(report.summary || []).map((s) => `<span class="sc-chip info">${esc(s)}</span>`).join('')}<span class="sc-chip" id="repCount"></span></div></div>
        <div class="sc-actions"><input class="sc-input" id="repSearch" type="search" placeholder="${SC.t('Search in results…', 'Tafuta katika matokeo…')}" style="min-width:200px"><button class="sc-btn ghost sm" data-act="print"><i class="fa-solid fa-print"></i> ${SC.t('Print', 'Chapisha')}</button><button class="sc-btn ghost sm" data-act="pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button><button class="sc-btn ghost sm" data-act="xlsx"><i class="fa-solid fa-file-excel"></i> Excel</button></div></div><div id="repTable"></div></div>`;
      render();
      out.querySelector('#repSearch').addEventListener('input', SC.debounce((e) => { term = e.target.value.trim(); render(); }, 150));
    }

    const docHtml = () => `<div class="sc-doc" style="padding:14px;font-size:12px;--doc-color:${SC.state.school.primary_color}"><h2 style="margin:0;color:#111">${esc(SC.state.school.name)}</h2><h3 style="margin:4px 0;color:${SC.state.school.primary_color}">${esc(report.title)}</h3><div style="color:#666;font-size:11px;margin-bottom:8px">${SC.t(`Generated ${new Date().toLocaleString()}`, `Imetengenezwa ${new Date().toLocaleString()}`)} ${(report.summary || []).length ? ' · ' + esc(report.summary.join(' · ')) : ''}</div>
        <table style="width:100%;border-collapse:collapse"><thead><tr>${report.columns.map((c) => `<th style="border:1px solid #bbb;background:#eee;padding:5px;text-align:${c.align === 'end' ? 'right' : 'left'}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rowsFiltered().map((r) => `<tr>${report.columns.map((c) => `<td style="border:1px solid #ddd;padding:5px;text-align:${c.align === 'end' ? 'right' : 'left'}">${esc(r[c.key] == null ? '' : r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    const fname = () => report.title.replace(/[\\/:*?"<>|\s]+/g, '-');
    const outHandlers = {
      print: () => SC.print(docHtml()),
      pdf: async (b) => { b.disabled = true; try { const h = document.createElement('div'); h.innerHTML = docHtml(); await SC.pdf(h.firstElementChild, `${fname()}.pdf`, { format: 'a4', orientation: report.columns.length > 7 ? 'landscape' : 'portrait', margin: 8 }); SC.toast(SC.t('PDF downloaded.', 'PDF imepakuliwa.')); } catch (err) { SC.fail(err); } b.disabled = false; },
      xlsx: async (b) => { b.disabled = true; try { await SC.xlsx(report.columns, rowsFiltered(), `${fname()}.xlsx`, report.title); SC.toast(SC.t('Excel file downloaded.', 'Faili la Excel limepakuliwa.')); } catch (err) { SC.fail(err); } b.disabled = false; },
    };

    SC.delegate(el, {
      pick: (b) => { current = flat.find((i) => i.key === b.dataset.key); el.querySelectorAll('.sc-rep-link').forEach((a) => a.classList.toggle('on', a === b)); showForm(); },
      ...outHandlers,
    });
  };
})();
