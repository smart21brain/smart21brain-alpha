(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  const STATUS_BADGE = { 'In Progress': 'info', 'Awaiting Customer': 'warn', 'Submitted': 'ok', 'Done': 'ok' };
  const STATUS_KEY = {
    'In Progress': 'stn_os_status_in_progress', 'Awaiting Customer': 'stn_os_status_awaiting_customer',
    'Submitted': 'stn_os_status_submitted', 'Done': 'stn_os_status_done',
  };
  function statusLabel(s) { return STATUS_KEY[s] ? t(STATUS_KEY[s]) : s; }

  window.STN_MODULES.onlineservices = async function (root) {
    const [{ requests }, { types, templates }] = await Promise.all([
      STN.api.get('/online-services'),
      STN.api.get('/online-services/templates'),
    ]);

    root.innerHTML = `
      <div class="stn-card mb-3">
        <p class="text-soft mb-3" style="font-size:.85rem"><i class="fa-solid fa-circle-info text-cyan me-1"></i>${t('stn_os_intro')}</p>
        <button class="stn-btn stn-btn-primary stn-btn-sm" id="stnOsAdd"><i class="fa-solid fa-plus"></i> ${t('stn_os_new_request')}</button>
      </div>
      <div class="stn-grid stn-grid-3" id="stnOsGrid"></div>
    `;
    renderGrid(requests);
    document.getElementById('stnOsAdd').addEventListener('click', () => openNewModal(types, templates));
  };

  function renderGrid(requests) {
    const grid = document.getElementById('stnOsGrid');
    grid.innerHTML = requests.length ? requests.map((r) => {
      const done = r.checklist.filter((c) => c.done).length;
      return `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-open="${r.id}">
        <div class="d-flex justify-content-between align-items-start">
          <div><div style="font-weight:800">${STN.esc(r.service_type)}</div><div class="text-soft" style="font-size:.78rem">${STN.esc(r.customer_name || t('stn_walk_in'))}</div></div>
          <span class="stn-badge ${STATUS_BADGE[r.status] || ''}">${statusLabel(r.status)}</span>
        </div>
        <div class="text-soft mt-2" style="font-size:.78rem">${done}/${r.checklist.length} ${t('stn_os_requirements_ready')}</div>
      </div>`;
    }).join('') : `<div class="stn-empty"><i class="fa-solid fa-passport"></i>${t('stn_os_no_requests_yet')}</div>`;

    grid.querySelectorAll('[data-open]').forEach((card) => card.addEventListener('click', () => openDetail(Number(card.dataset.open))));
  }

  async function reload() {
    const { requests } = await STN.api.get('/online-services');
    renderGrid(requests);
  }

  function openNewModal(types, templates) {
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${t('stn_os_new_request_title')}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="stn-field"><label class="stn-label">${t('stn_os_service_type')}</label>
          <select class="stn-select" id="stnOsType">${types.map((ty) => `<option value="${ty}">${ty}</option>`).join('')}</select>
        </div>
        <div class="stn-field"><label class="stn-label">${t('stn_os_customer_name')}</label><input class="stn-input" id="stnOsCustomer"></div>
        <div class="stn-field"><label class="stn-label">${t('stn_cust_phone')}</label><input class="stn-input" id="stnOsPhone"></div>
        <div class="stn-field"><label class="stn-label">${t('stn_os_service_fee')}</label><input class="stn-input" type="number" id="stnOsFee" value="0"></div>
        <div id="stnOsChecklistPreview" class="text-soft" style="font-size:.8rem"></div>
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnOsSave">${t('stn_os_create')}</button></div>
    `);
    function updatePreview() {
      const type = document.getElementById('stnOsType').value;
      document.getElementById('stnOsChecklistPreview').innerHTML = `${t('stn_os_default_checklist')}:<ul class="mt-1">${(templates[type] || []).map((l) => `<li>${STN.esc(l)}</li>`).join('')}</ul>`;
    }
    document.getElementById('stnOsType').addEventListener('change', updatePreview);
    updatePreview();

    document.getElementById('stnOsSave').addEventListener('click', async () => {
      try {
        await STN.api.post('/online-services', {
          service_type: document.getElementById('stnOsType').value,
          customer_name: document.getElementById('stnOsCustomer').value.trim() || undefined,
          customer_phone: document.getElementById('stnOsPhone').value.trim() || undefined,
          fee: Number(document.getElementById('stnOsFee').value) || 0,
        });
        STN.toast(t('stn_os_request_created')); STN.closeModal(); reload();
      } catch (err) { STN.toast(err.message, 'error'); }
    });
  }

  async function openDetail(id) {
    const { requests } = await STN.api.get('/online-services');
    const r = requests.find((x) => x.id === id);
    if (!r) return;
    const statuses = ['In Progress', 'Awaiting Customer', 'Submitted', 'Done'];

    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${STN.esc(r.service_type)} — ${STN.esc(r.customer_name || t('stn_walk_in'))}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="d-flex flex-wrap gap-2 mb-3">${statuses.map((s) => `<button class="stn-btn stn-btn-sm ${s === r.status ? 'stn-btn-primary' : 'stn-btn-outline'}" data-status="${s}">${statusLabel(s)}</button>`).join('')}</div>
        <div id="stnOsChecklist">${r.checklist.map((c, i) => `
          <div class="stn-checklist-item ${c.done ? 'done' : ''}">
            <input type="checkbox" data-idx="${i}" ${c.done ? 'checked' : ''}>
            <div class="label">${STN.esc(c.label)}</div>
          </div>`).join('')}</div>
        <div class="stn-field mt-3"><label class="stn-label">${t('stn_cust_notes')}</label><textarea class="stn-textarea" id="stnOsNotes" rows="3">${STN.esc(r.notes || '')}</textarea></div>
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnOsSaveDetail">${t('stn_save')}</button></div>
    `, { wide: true });

    let checklist = JSON.parse(JSON.stringify(r.checklist));
    let status = r.status;
    document.querySelectorAll('[data-status]').forEach((btn) => btn.addEventListener('click', () => {
      status = btn.dataset.status;
      document.querySelectorAll('[data-status]').forEach((b) => b.classList.remove('stn-btn-primary'));
      btn.classList.add('stn-btn-primary');
    }));
    document.querySelectorAll('#stnOsChecklist input[type=checkbox]').forEach((cb) => cb.addEventListener('change', () => {
      checklist[Number(cb.dataset.idx)].done = cb.checked;
    }));
    document.getElementById('stnOsSaveDetail').addEventListener('click', async () => {
      await STN.api.put(`/online-services/${r.id}`, { checklist, status, notes: document.getElementById('stnOsNotes').value });
      STN.toast(t('stn_saved')); STN.closeModal(); reload();
    });
  }
})();
