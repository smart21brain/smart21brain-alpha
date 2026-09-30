(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  function SECTIONS() {
    return [
      ['parts', t('stn_mach_parts'), 'fa-gears'], ['setup', t('stn_mach_setup'), 'fa-toolbox'],
      ['operation', t('stn_mach_operation'), 'fa-play'],
      ['maintenance', t('stn_mach_maintenance'), 'fa-broom'],
      ['troubleshooting', t('stn_mach_troubleshooting'), 'fa-screwdriver-wrench'],
      ['safety', t('stn_mach_safety'), 'fa-triangle-exclamation'],
    ];
  }

  window.STN_MODULES.machines = async function (root) {
    const { machines } = await STN.api.get('/machines');
    root.innerHTML = `
      <div class="stn-grid stn-grid-3" id="stnMachineGrid"></div>
      <div class="mt-3" id="stnMachineDetail"></div>
    `;
    const grid = document.getElementById('stnMachineGrid');
    grid.innerHTML = machines.map((m) => `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-open="${m.id}">
        <i class="fa-solid fa-print text-cyan mb-2" style="font-size:1.2rem"></i>
        <div style="font-weight:800">${STN.esc(m.name)}</div>
        <div class="text-soft" style="font-size:.78rem">${STN.esc(m.category)}</div>
      </div>`).join('');
    grid.querySelectorAll('[data-open]').forEach((card) => card.addEventListener('click', () => showMachine(machines.find((m) => m.id === Number(card.dataset.open)))));
    if (machines.length) showMachine(machines[0]);
  };

  function showMachine(m) {
    const box = document.getElementById('stnMachineDetail');
    const c = m.content;
    box.innerHTML = `
      <div class="stn-card">
        <div class="stn-card-head"><h3>${STN.esc(m.name)}</h3><button class="stn-btn stn-btn-outline stn-btn-sm" id="stnAskChopaMachine"><i class="fa-solid fa-robot"></i> ${t('stn_ask_ai')}</button></div>
        <div class="stn-grid stn-grid-2">
          ${SECTIONS().map(([key, label, icon]) => `
            <div class="stn-card stn-card-tight" style="background:var(--stn-bg-soft)">
              <div style="font-weight:800;font-size:.85rem" class="mb-2"><i class="fa-solid ${icon} text-emerald me-1"></i>${label}</div>
              <ul class="mb-0 text-soft" style="font-size:.82rem;padding-left:1.1rem">${(c[key] || []).map((x) => `<li>${STN.esc(x)}</li>`).join('') || '<li>—</li>'}</ul>
            </div>`).join('')}
          <div class="stn-card stn-card-tight" style="background:var(--stn-bg-soft)">
            <div style="font-weight:800;font-size:.85rem" class="mb-2"><i class="fa-solid fa-code text-emerald me-1"></i>${t('stn_mach_error_codes')}</div>
            ${Object.keys(c.error_codes || {}).length ? `<ul class="mb-0 text-soft" style="font-size:.82rem;padding-left:1.1rem">${Object.entries(c.error_codes).map(([k, v]) => `<li><strong>${STN.esc(k)}</strong> — ${STN.esc(v)}</li>`).join('')}</ul>` : '<div class="text-soft" style="font-size:.82rem">—</div>'}
          </div>
        </div>
      </div>`;
    document.getElementById('stnAskChopaMachine').addEventListener('click', () => {
      location.hash = '#chopaai';
      setTimeout(() => window.STN_chopaPrefill && window.STN_chopaPrefill('machine', m.id, `${t('stn_mach_help_troubleshoot')} ${m.name}.`), 60);
    });
  }
})();
