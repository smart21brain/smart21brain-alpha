/* Reports — run, filter, print, PDF, Excel and CSV. */
(function () {
  'use strict';
  const IN = window.IN; const esc = IN.esc;
  const ICON = { inventory: 'fa-boxes-stacked', borrowing: 'fa-right-left', returns: 'fa-rotate-left', overdue: 'fa-clock', lost_damaged: 'fa-triangle-exclamation', most_used: 'fa-fire', user_activity: 'fa-users', student_list: 'fa-user-graduate', enrollment: 'fa-clipboard-list', performance: 'fa-chart-line', programme_stats: 'fa-diagram-project', system_activity: 'fa-shield-halved', resource_stats: 'fa-gauge' };
  const TITLE_SW = { inventory: 'Orodha ya vitabu', borrowing: 'Historia ya kukopa', returns: 'Vilivyorudishwa', overdue: 'Vilivyochelewa', lost_damaged: 'Vilivyopotea na kuharibika', most_used: 'Vinavyotumika zaidi', user_activity: 'Shughuli za wakopaji', student_list: 'Orodha ya wanafunzi', enrollment: 'Usajili kwa kozi', performance: 'Matokeo ya masomo', programme_stats: 'Takwimu za programu', system_activity: 'Shughuli za mfumo', resource_stats: 'Takwimu za rasilimali' };

  IN.modules.reports = async (el, parts) => {
    const { reports } = await IN.api.get('/reports'); const lk = await IN.lookups();
    const key = parts[0] || '';
    if (!reports.length) { el.innerHTML = `${IN.pageHead(IN.t('Reports', 'Ripoti'), '')}<div class="in-card">${IN.empty('fa-lock', IN.t('No reports available', 'Hakuna ripoti zinazopatikana'), IN.t('Your role does not include reports. Ask an Administrator if you need one.', 'Jukumu lako halijumuishi ripoti. Muulize Msimamizi ukihitaji.'))}</div>`; return; }
    if (!key) {
      el.innerHTML = `${IN.pageHead(IN.t('Reports', 'Ripoti'), IN.t('Choose a report. Every report can be filtered, printed and exported.', 'Chagua ripoti. Kila ripoti inaweza kuchujwa, kuchapishwa na kuhamishwa.'))}
        <div class="in-grid cols-3">${reports.map((r) => `<a class="in-card in-stat" href="#reports/${r.key}" style="color:inherit"><div class="ico"><i class="fa-solid ${ICON[r.key] || 'fa-file'}"></i></div><div><div class="val" style="font-size:1rem">${esc(IN.isSw() ? TITLE_SW[r.key] || r.title : r.title)}</div><div class="lbl">${r.filters.length ? IN.t('Filters: ', 'Vichujio: ') + r.filters.map((f) => f.replace('_id', '').replace('_', ' ')).join(', ') : IN.t('No filters', 'Hakuna vichujio')}</div></div></a>`).join('')}</div>`;
      return;
    }
    const meta = reports.find((r) => r.key === key);
    if (!meta) { el.innerHTML = `<div class="in-card">${IN.empty('fa-lock', IN.t('Report not available', 'Ripoti haipatikani'), IN.t('You do not have permission to open this report.', 'Huna ruhusa ya kufungua ripoti hii.'))}</div>`; return; }
    const title = IN.isSw() ? TITLE_SW[key] || meta.title : meta.title;
    IN.setTitle(title);
    const q = {}; const today = IN.today();
    const filterHtml = {
      from: IN.f.input('from', IN.t('From', 'Kuanzia'), { type: 'date' }), to: IN.f.input('to', IN.t('To', 'Hadi'), { type: 'date', value: '' }),
      category_id: IN.f.select('category_id', IN.t('Category', 'Jamii'), IN.opts.list(lk.categories)), programme_id: IN.f.select('programme_id', IN.t('Programme', 'Programu'), IN.opts.list(lk.programmes)),
      department_id: IN.f.select('department_id', IN.t('Department', 'Idara'), IN.opts.list(lk.departments)), status: IN.f.select('status', IN.t('Status', 'Hali'), IN.opts.studentStatus),
      term_id: IN.f.select('term_id', IN.t('Term', 'Muhula'), lk.terms.map((t) => { const y = lk.academic_years.find((a) => a.id === t.academic_year_id); return { v: t.id, l: `${y ? y.name + ' · ' : ''}${t.name}` }; })),
    };
    el.innerHTML = `${IN.pageHead(title, IN.t('Generated from live records.', 'Imetengenezwa kutoka rekodi za sasa.'), `<a class="in-btn ghost" href="#reports"><i class="fa-solid fa-arrow-left"></i> ${IN.t('All reports', 'Ripoti zote')}</a>`)}
      ${meta.filters.length ? `<div class="in-card" style="margin-bottom:1rem"><form id="rpF" class="in-toolbar" style="align-items:flex-end">${meta.filters.map((f) => filterHtml[f]).join('')}<button class="in-btn primary" type="submit"><i class="fa-solid fa-filter"></i> ${IN.t('Apply', 'Tekeleza')}</button></form></div>` : ''}
      <div class="in-card"><div class="in-row" style="margin-bottom:.8rem;flex-wrap:wrap" id="rpActs"></div><div id="rpOut">${IN.skeleton(4)}</div></div>`;
    let rep = null;
    const run = async () => {
      const out = el.querySelector('#rpOut');
      try {
        rep = await IN.api.get(`/reports/${key}` + IN.qs(q));
        const sum = rep.summary ? `<div class="in-row" style="gap:.6rem;flex-wrap:wrap;margin-bottom:.8rem">${Object.entries(rep.summary).map(([k, v]) => `<span class="in-chip info">${esc(k)}: <b>${esc(v)}</b></span>`).join('')}</div>` : '';
        out.innerHTML = sum + (rep.rows.length ? IN.table(rep.columns.map((c) => ({ label: c.label, render: (r) => esc(r[c.key] == null ? '' : r[c.key]) })), rep.rows.slice(0, 500)) + (rep.rows.length > 500 ? `<div class="in-small in-muted" style="margin-top:.5rem">${IN.t(`Showing the first 500 of ${rep.rows.length} rows. Export to see them all.`, `Inaonyesha safu 500 za kwanza kati ya ${rep.rows.length}. Hamisha kuona zote.`)}</div>` : '') : IN.empty('fa-file-circle-xmark', IN.t('No data for this report', 'Hakuna data kwa ripoti hii'), IN.t('Try a wider date range or fewer filters.', 'Jaribu muda mpana zaidi au vichujio vichache.')));
        el.querySelector('#rpActs').innerHTML = rep.rows.length ? `<button class="in-btn ghost sm" data-act="print"><i class="fa-solid fa-print"></i> ${IN.t('Print', 'Chapisha')}</button><button class="in-btn ghost sm" data-act="pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button><button class="in-btn ghost sm" data-act="xlsx"><i class="fa-solid fa-file-excel"></i> Excel</button><a class="in-btn ghost sm" href="/api/institution/reports/${key}${IN.qs({ ...q, format: 'csv', institution_id: IN.state.inst.id })}"><i class="fa-solid fa-file-csv"></i> CSV</a><span class="in-muted in-small" style="margin-left:auto">${rep.rows.length} ${IN.t('rows', 'safu')}</span>` : '';
      } catch (e) { out.innerHTML = IN.errorBox(e); }
    };
    const printable = () => {
      const i = IN.state.inst; const head = `<h2>${esc(i.name)} — ${esc(title)}</h2><div class="meta">${IN.t('Generated', 'Imetengenezwa')} ${new Date().toLocaleString()}${rep.summary ? ' · ' + Object.entries(rep.summary).map(([k, v]) => `${esc(k)}: ${esc(v)}`).join(' · ') : ''}</div>`;
      return head + `<table><thead><tr>${rep.columns.map((c) => `<th>${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${rep.rows.map((r) => `<tr>${rep.columns.map((c) => `<td>${esc(r[c.key] == null ? '' : r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
    };
    const f = el.querySelector('#rpF');
    if (f) f.addEventListener('submit', (e) => { e.preventDefault(); Object.keys(q).forEach((k) => delete q[k]); Object.entries(IN.formData(f)).forEach(([k, v]) => { if (v) q[k] = v; }); run(); });
    IN.delegate(el, {
      print: () => IN.print(printable()),
      pdf: async (b) => { b.disabled = true; try { const d = document.createElement('div'); d.style.cssText = 'padding:12px;font-family:sans-serif;color:#000;background:#fff'; d.innerHTML = `<style>table{width:100%;border-collapse:collapse;font-size:10px}th,td{border:1px solid #999;padding:3px 5px;text-align:left}h2{font-size:15px;margin:0 0 4px}.meta{color:#555;font-size:10px;margin-bottom:8px}</style>${printable()}`; await IN.pdf(d, `${key}-${today}.pdf`, { orientation: rep.columns.length > 6 ? 'landscape' : 'portrait' }); } finally { b.disabled = false; } },
      xlsx: async () => { await IN.xlsx(rep.columns, rep.rows, `${key}-${today}.xlsx`, title); },
    });
    await run();
  };
})();
