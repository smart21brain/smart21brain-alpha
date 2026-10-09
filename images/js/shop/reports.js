/* Reports — catalogue of ready-made reports; each renders as a table you can export. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  SP.modules.reports = async (el) => {
    const { groups } = await SP.api.get('/reports');
    el.innerHTML = `${SP.pageHead(SP.t('Reports', 'Ripoti'), SP.t('Pick a report, adjust the dates, then export or print it', 'Chagua ripoti, badilisha tarehe, kisha ihamishe au uichapishe'))}
      <div class="sp-grid cols-2" id="reportPicker">${groups.map((g) => `<div class="sp-card"><h3 style="margin-bottom:.7rem">${esc(g.group)}</h3><div class="sp-list">${g.items.map((i) => `<button type="button" class="sp-spread" data-key="${i.key}" data-filters='${JSON.stringify(i.filters)}' style="width:100%;text-align:left;border:0;background:none;padding:.55rem 0;cursor:pointer;color:inherit"><span>${esc(i.label)}</span><i class="fa-solid fa-chevron-right sp-muted"></i></button>`).join('')}</div></div>`).join('') || SP.empty('fa-chart-pie', SP.t('No reports available', 'Hakuna ripoti zinazopatikana'), '')}</div>
      <div id="reportView"></div>`;
    const lk = await SP.lookups();
    el.addEventListener('click', (e) => { const b = e.target.closest('[data-key]'); if (!b) return; openReport(el, b.dataset.key, JSON.parse(b.dataset.filters), lk); });
  };

  async function openReport(el, key, filters, lk) {
    const view = el.querySelector('#reportView');
    view.scrollIntoView({ behavior: 'smooth', block: 'start' });
    const today = SP.today(); const monthStart = today.slice(0, 8) + '01';
    const st = { from: monthStart, to: today, category_id: '', status: '', method: '' };
    const filterHtml = filters.map((f) => {
      if (f === 'from') return `<label>${SP.t('From', 'Kuanzia')} <input class="sp-input" type="date" name="from" value="${st.from}"></label>`;
      if (f === 'to') return `<label>${SP.t('To', 'Hadi')} <input class="sp-input" type="date" name="to" value="${st.to}"></label>`;
      if (f === 'category_id') return `<label>${SP.t('Category', 'Jamii')} <select class="sp-select" name="category_id"><option value="">${SP.t('All', 'Zote')}</option>${SP.opts.categories(lk).map((o) => `<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select></label>`;
      if (f === 'status') return `<label>${SP.t('Status', 'Hali')} <select class="sp-select" name="status"><option value="">${SP.t('All', 'Zote')}</option><option value="completed">${SP.t('Completed', 'Imekamilika')}</option><option value="void">${SP.t('Cancelled', 'Imeghairiwa')}</option></select></label>`;
      if (f === 'method') return `<label>${SP.t('Method', 'Njia')} <select class="sp-select" name="method"><option value="">${SP.t('All', 'Zote')}</option>${(lk.payment_methods || []).map((m) => `<option>${esc(m)}</option>`).join('')}</select></label>`;
      return '';
    }).join('');
    view.innerHTML = `<div class="sp-card" style="margin-top:1.1rem"><form class="sp-toolbar" id="repFilters">${filterHtml}<button class="sp-btn primary sm" type="submit"><i class="fa-solid fa-arrows-rotate"></i> ${SP.t('Run', 'Endesha')}</button></form><div id="repOut">${SP.skeleton(5)}</div></div>`;
    const form = view.querySelector('#repFilters');
    async function run() {
      Object.assign(st, SP.formData(form));
      const out = view.querySelector('#repOut'); out.innerHTML = SP.skeleton(5);
      try {
        const { report } = await SP.api.get(`/reports/${key}` + SP.qs(st));
        renderReport(out, report);
      } catch (e) { out.innerHTML = SP.errorBox(e); }
    }
    form.addEventListener('submit', (e) => { e.preventDefault(); run(); });
    await run();
  }

  function renderReport(out, report) {
    out.innerHTML = `
      <div class="sp-spread" style="margin:1rem 0 .6rem;flex-wrap:wrap;gap:.6rem">
        <div><h3 style="margin:0">${esc(report.title)}</h3><p class="sp-small sp-muted" style="margin:.2rem 0 0">${report.summary.map(esc).join(' · ')}</p></div>
        <div class="sp-row"><button class="sp-btn ghost sm" data-act="print"><i class="fa-solid fa-print"></i> ${SP.t('Print', 'Chapisha')}</button><button class="sp-btn ghost sm" data-act="pdf"><i class="fa-solid fa-file-pdf"></i> PDF</button><button class="sp-btn ghost sm" data-act="xlsx"><i class="fa-solid fa-file-excel"></i> Excel</button></div>
      </div>
      <div id="repDoc">${SP.table(report.columns.map((c) => ({ label: c.label, cls: c.align === 'end' ? 'end' : '', render: (r) => c.type === 'money' ? SP.money(r[c.key]) : c.type === 'date' ? SP.date(r[c.key]) : c.type === 'datetime' ? SP.dateTime(r[c.key]) : SP.esc(r[c.key]) })), report.rows, { empty: SP.empty('fa-inbox', SP.t('No data for this period', 'Hakuna data ya kipindi hiki'), SP.t('Try a wider date range.', 'Jaribu wigo mpana wa tarehe.')) })}</div>`;

    const docHtml = () => `<div class="sp-doc sp-report" style="--doc-color:${SP.state.shop.primary_color}"><div class="hd">${SP.shopLogo('lg')}<div><h2>${esc(SP.state.shop.name)}</h2><p>${esc(SP.state.shop.address || '')}${SP.state.shop.phone ? ' · ' + esc(SP.state.shop.phone) : ''}</p></div></div>
      <div class="ttl"><b>${esc(report.title)}</b><span class="sp-small sp-muted">${SP.t(`Generated ${SP.dateTime(report.generated_at)}`, `Imetengenezwa ${SP.dateTime(report.generated_at)}`)}${report.summary.length ? ' · ' + report.summary.map(esc).join(' · ') : ''}</span></div>
      <table><thead><tr>${report.columns.map((c) => `<th class="${c.align === 'end' ? 'num' : ''}">${esc(c.label)}</th>`).join('')}</tr></thead><tbody>${report.rows.map((r) => `<tr>${report.columns.map((c) => `<td class="${c.align === 'end' ? 'num' : ''}">${c.type === 'money' ? SP.num(r[c.key]) : c.type === 'date' ? SP.date(r[c.key]) : c.type === 'datetime' ? SP.dateTime(r[c.key]) : esc(r[c.key])}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

    out.querySelector('[data-act=print]').addEventListener('click', () => SP.print(docHtml()));
    out.querySelector('[data-act=pdf]').addEventListener('click', async (e) => {
      const btn = e.currentTarget; const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span>';
      const holder = document.createElement('div'); holder.innerHTML = docHtml();
      try { await SP.pdf(holder.firstElementChild, `${report.key || 'report'}.pdf`, { orientation: report.columns.length > 6 ? 'landscape' : 'portrait' }); } catch (err) { SP.fail(err); } finally { btn.disabled = false; btn.innerHTML = label; }
    });
    out.querySelector('[data-act=xlsx]').addEventListener('click', async (e) => {
      const btn = e.currentTarget; const label = btn.innerHTML; btn.disabled = true; btn.innerHTML = '<span class="sp-spin"></span>';
      try { await SP.xlsx(report.columns, report.rows, `${(report.title || 'report').replace(/[^a-z0-9]+/gi, '-')}.xlsx`, report.title); } catch (err) { SP.fail(err); } finally { btn.disabled = false; btn.innerHTML = label; }
    });
  }
})();
