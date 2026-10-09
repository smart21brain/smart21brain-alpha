(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.customers = async function (root) {
    root.innerHTML = `
      <div class="stn-card mb-3">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <input class="stn-input" style="max-width:280px" id="stnCustSearch" placeholder="${t('stn_cust_search_placeholder')}">
          <button class="stn-btn stn-btn-primary stn-btn-sm ms-auto" id="stnCustAdd"><i class="fa-solid fa-plus"></i> ${t('stn_cust_add_customer')}</button>
        </div>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table" id="stnCustTable">
        <thead><tr><th>${t('stn_inv_name')}</th><th>${t('stn_cust_phone')}</th><th>${t('stn_cust_email')}</th><th>${t('stn_cust_added')}</th><th></th></tr></thead>
        <tbody><tr><td colspan="5" class="text-center py-4"><div class="stn-spin" style="margin:0 auto"></div></td></tr></tbody>
      </table></div></div>
    `;
    document.getElementById('stnCustAdd').addEventListener('click', () => openCustomerModal());
    let debounce;
    document.getElementById('stnCustSearch').addEventListener('input', () => { clearTimeout(debounce); debounce = setTimeout(loadTable, 250); });
    await loadTable();
  };

  async function loadTable() {
    const q = document.getElementById('stnCustSearch').value;
    const { customers } = await STN.api.get(`/customers?q=${encodeURIComponent(q)}`);
    const body = document.querySelector('#stnCustTable tbody');
    body.innerHTML = customers.length ? customers.map((c) => `
      <tr data-open="${c.id}" style="cursor:pointer">
        <td>${STN.esc(c.name)}</td><td>${STN.esc(c.phone || '—')}</td><td>${STN.esc(c.email || '—')}</td>
        <td class="text-soft">${STN.dt(c.created_at)}</td>
        <td class="text-end"><button class="stn-btn stn-btn-ghost stn-btn-sm" data-edit="${c.id}"><i class="fa-solid fa-pen"></i></button></td>
      </tr>`).join('') : `<tr><td colspan="5"><div class="stn-empty"><i class="fa-solid fa-address-book"></i>${t('stn_cust_no_customers_yet')}</div></td></tr>`;

    body.querySelectorAll('[data-open]').forEach((row) => row.addEventListener('click', (e) => {
      if (e.target.closest('[data-edit]')) return;
      openCustomerDetail(Number(row.dataset.open));
    }));
    body.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const c = customers.find((x) => x.id === Number(btn.dataset.edit));
      openCustomerModal(c);
    }));
  }

  function openCustomerModal(customer) {
    const editing = !!customer;
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${editing ? t('stn_edit') : t('stn_add')} ${t('stn_cust_customer_singular')}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="stn-field"><label class="stn-label">${t('stn_inv_name')}</label><input class="stn-input" id="stnCName" value="${STN.esc(customer?.name || '')}"></div>
        <div class="stn-field"><label class="stn-label">${t('stn_cust_phone')}</label><input class="stn-input" id="stnCPhone" value="${STN.esc(customer?.phone || '')}"></div>
        <div class="stn-field"><label class="stn-label">${t('stn_cust_email')}</label><input class="stn-input" id="stnCEmail" value="${STN.esc(customer?.email || '')}"></div>
        <div class="stn-field"><label class="stn-label">${t('stn_cust_notes')}</label><textarea class="stn-textarea" id="stnCNotes" rows="2">${STN.esc(customer?.notes || '')}</textarea></div>
      </div>
      <div class="stn-modal-foot">
        ${editing ? `<button class="stn-btn stn-btn-danger" id="stnCDelete">${t('stn_delete')}</button>` : ''}
        <button class="stn-btn stn-btn-primary" id="stnCSave">${editing ? t('stn_save') : t('stn_add')}</button>
      </div>`);

    document.getElementById('stnCSave').addEventListener('click', async () => {
      const payload = {
        name: document.getElementById('stnCName').value.trim(),
        phone: document.getElementById('stnCPhone').value.trim() || null,
        email: document.getElementById('stnCEmail').value.trim() || null,
        notes: document.getElementById('stnCNotes').value.trim() || null,
      };
      if (!payload.name) return STN.toast(t('stn_cust_name_required'), 'error');
      try {
        if (editing) await STN.api.put(`/customers/${customer.id}`, payload);
        else await STN.api.post('/customers', payload);
        STN.toast(t('stn_saved')); STN.closeModal(); loadTable();
      } catch (err) { STN.toast(err.message, 'error'); }
    });
    document.getElementById('stnCDelete')?.addEventListener('click', async () => {
      if (!confirm(t('stn_cust_delete_confirm'))) return;
      await STN.api.del(`/customers/${customer.id}`);
      STN.closeModal(); loadTable();
    });
  }

  async function openCustomerDetail(id) {
    const { customer, orders } = await STN.api.get(`/customers/${id}`);
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${STN.esc(customer.name)}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <p class="text-soft mb-3">${STN.esc(customer.phone || '')} ${customer.email ? '· ' + STN.esc(customer.email) : ''}</p>
        <h4 class="h6">${t('stn_cust_order_history')}</h4>
        <div class="stn-table-wrap"><table class="stn-table">
          <thead><tr><th>${t('stn_th_order')}</th><th>${t('stn_th_status')}</th><th>${t('stn_th_total')}</th><th>${t('stn_pos_paid')}</th></tr></thead>
          <tbody>${orders.length ? orders.map((o) => `<tr><td>${STN.esc(o.order_no)}</td><td>${o.status}</td><td>${STN.money(o.total_amount)}</td><td>${STN.money(o.paid_amount)}</td></tr>`).join('') : `<tr><td colspan="4" class="text-soft text-center py-3">${t('stn_cust_no_orders_yet')}</td></tr>`}</tbody>
        </table></div>
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-ghost" onclick="STN.closeModal()">${t('stn_close')}</button></div>
    `, { wide: true });
  }
})();
