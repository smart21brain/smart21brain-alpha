(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  const roleName = (r) => t('stn_role_' + r) || r;
  const roleDesc = (r) => (['owner', 'manager', 'operator', 'designer', 'accountant'].includes(r) ? t('stn_emp_desc_' + r) : '');

  window.STN_MODULES.employees = async function (root) {
    if (!STN.can('manage_staff')) {
      root.innerHTML = `<div class="stn-empty"><i class="fa-solid fa-lock"></i>${t('stn_emp_only_owner_manager')}</div>`;
      return;
    }
    root.innerHTML = `
      <div class="stn-card mb-3">
        <div class="stn-card-head"><h3>${t('stn_emp_add_employee')}</h3></div>
        <div class="d-flex flex-wrap gap-2">
          <input class="stn-input" style="max-width:260px" id="stnEmpEmail" placeholder="${t('stn_emp_email_placeholder')}">
          <select class="stn-select" style="max-width:180px" id="stnEmpRole">
            <option value="manager">${roleName('manager')}</option><option value="operator" selected>${roleName('operator')}</option>
            <option value="designer">${roleName('designer')}</option><option value="accountant">${roleName('accountant')}</option>
          </select>
          <button class="stn-btn stn-btn-primary" id="stnEmpAdd"><i class="fa-solid fa-user-plus"></i> ${t('stn_add')}</button>
        </div>
        <p class="text-soft mt-2 mb-0" style="font-size:.78rem">${t('stn_emp_must_have_account')}</p>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table">
        <thead><tr><th>${t('stn_inv_name')}</th><th>${t('stn_cust_email')}</th><th>${t('stn_emp_role')}</th><th>${t('stn_th_status')}</th><th></th></tr></thead>
        <tbody id="stnEmpBody"></tbody>
      </table></div></div>
    `;
    document.getElementById('stnEmpAdd').addEventListener('click', addEmployee);
    await loadStaff();
  };

  async function loadStaff() {
    const { staff } = await STN.api.get('/staff');
    const body = document.getElementById('stnEmpBody');
    body.innerHTML = staff.map((s) => `
      <tr>
        <td>${STN.esc(s.name)}</td>
        <td class="text-soft">${STN.esc(s.email)}</td>
        <td>
          <select class="stn-select" style="width:150px" data-role="${s.id}" ${s.role === 'owner' ? 'disabled' : ''}>
            ${['owner', 'manager', 'operator', 'designer', 'accountant'].map((r) => `<option value="${r}" ${r === s.role ? 'selected' : ''} ${r === 'owner' ? 'disabled' : ''}>${roleName(r)}</option>`).join('')}
          </select>
          <div class="text-soft" style="font-size:.7rem;max-width:220px">${roleDesc(s.role)}</div>
        </td>
        <td><span class="stn-badge ${s.active ? 'ok' : 'danger'}">${s.active ? t('stn_emp_active') : t('stn_emp_disabled')}</span></td>
        <td class="text-end">${s.role !== 'owner' ? `<button class="stn-btn stn-btn-ghost stn-btn-sm" data-toggle="${s.id}" data-active="${s.active}"><i class="fa-solid ${s.active ? 'fa-user-slash' : 'fa-user-check'}"></i></button>` : ''}</td>
      </tr>`).join('');

    body.querySelectorAll('[data-role]').forEach((sel) => sel.addEventListener('change', async () => {
      try {
        await STN.api.put(`/staff/${sel.dataset.role}`, { role: sel.value });
        STN.toast(t('stn_emp_role_updated'));
        loadStaff();
      } catch (err) { STN.toast(err.message, 'error'); }
    }));
    body.querySelectorAll('[data-toggle]').forEach((btn) => btn.addEventListener('click', async () => {
      const active = btn.dataset.active === '1' || btn.dataset.active === 'true';
      await STN.api.put(`/staff/${btn.dataset.toggle}`, { active: !active });
      loadStaff();
    }));
  }

  async function addEmployee() {
    const email = document.getElementById('stnEmpEmail').value.trim();
    const role = document.getElementById('stnEmpRole').value;
    if (!email) return STN.toast(t('stn_emp_enter_email'), 'error');
    try {
      await STN.api.post('/staff', { email, role });
      STN.toast(t('stn_emp_added'));
      document.getElementById('stnEmpEmail').value = '';
      loadStaff();
    } catch (err) { STN.toast(err.message, 'error'); }
  }
})();
