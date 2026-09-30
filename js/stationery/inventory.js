(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  window.STN_MODULES.inventory = async function (root) {
    root.innerHTML = `
      <div class="stn-card mb-3">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <input class="stn-input" style="max-width:260px" id="stnInvSearch" placeholder="${t('stn_inv_search_placeholder')}">
          <label class="d-flex align-items-center gap-2 text-soft" style="font-size:.82rem"><input type="checkbox" id="stnInvLowOnly"> ${t('stn_inv_low_stock_only')}</label>
          <button class="stn-btn stn-btn-primary stn-btn-sm ms-auto" id="stnInvAdd" ${STN.can('manage_inventory') ? '' : 'disabled'}><i class="fa-solid fa-plus"></i> ${t('stn_inv_add_item')}</button>
        </div>
      </div>
      <div class="stn-card"><div class="stn-table-wrap"><table class="stn-table" id="stnInvTable">
        <thead><tr><th>${t('stn_th_item')}</th><th>${t('stn_th_category')}</th><th>${t('stn_th_qty')}</th><th>${t('stn_th_reorder_at')}</th><th>${t('stn_th_cost')}</th><th>${t('stn_th_barcode')}</th><th></th></tr></thead>
        <tbody><tr><td colspan="7" class="text-center py-4"><div class="stn-spin" style="margin:0 auto"></div></td></tr></tbody>
      </table></div></div>
    `;
    document.getElementById('stnInvAdd').addEventListener('click', () => openItemModal());
    document.getElementById('stnInvSearch').addEventListener('input', loadTable);
    document.getElementById('stnInvLowOnly').addEventListener('change', loadTable);
    await loadTable();
  };

  async function loadTable() {
    const lowOnly = document.getElementById('stnInvLowOnly').checked;
    const q = (document.getElementById('stnInvSearch').value || '').toLowerCase();
    const { items } = await STN.api.get(`/inventory${lowOnly ? '?low=1' : ''}`);
    const filtered = items.filter((i) => !q || i.name.toLowerCase().includes(q) || i.category.toLowerCase().includes(q));
    const body = document.querySelector('#stnInvTable tbody');
    body.innerHTML = filtered.length ? filtered.map((i) => {
      const low = i.quantity <= i.reorder_level;
      return `<tr>
        <td>${STN.esc(i.name)}</td>
        <td><span class="stn-badge">${STN.esc(i.category)}</span></td>
        <td class="${low ? 'text-amber' : ''}">${i.quantity} ${STN.esc(i.unit)} ${low ? '<i class="fa-solid fa-triangle-exclamation"></i>' : ''}</td>
        <td>${i.reorder_level}</td>
        <td>${STN.money(i.cost_price)}</td>
        <td class="text-soft">${STN.esc(i.barcode || '—')}</td>
        <td class="text-end">
          <button class="stn-btn stn-btn-ghost stn-btn-sm" data-adjust="${i.id}"><i class="fa-solid fa-arrows-up-down"></i></button>
          <button class="stn-btn stn-btn-ghost stn-btn-sm" data-edit="${i.id}"><i class="fa-solid fa-pen"></i></button>
        </td>
      </tr>`;
    }).join('') : `<tr><td colspan="7"><div class="stn-empty"><i class="fa-solid fa-boxes-stacked"></i>${t('stn_inv_no_items_yet')}</div></td></tr>`;

    body.querySelectorAll('[data-edit]').forEach((btn) => btn.addEventListener('click', () => {
      const item = items.find((i) => i.id === Number(btn.dataset.edit));
      openItemModal(item);
    }));
    body.querySelectorAll('[data-adjust]').forEach((btn) => btn.addEventListener('click', () => {
      const item = items.find((i) => i.id === Number(btn.dataset.adjust));
      openAdjustModal(item);
    }));
  }

  function openItemModal(item) {
    const editing = !!item;
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${editing ? t('stn_edit') : t('stn_add')} ${t('stn_inv_item_singular')}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <div class="stn-field"><label class="stn-label">${t('stn_inv_name')}</label><input class="stn-input" id="stnItemName" value="${STN.esc(item?.name || '')}"></div>
        <div class="stn-grid stn-grid-2">
          <div class="stn-field"><label class="stn-label">${t('stn_th_category')}</label><input class="stn-input" id="stnItemCat" value="${STN.esc(item?.category || 'Paper')}"></div>
          <div class="stn-field"><label class="stn-label">${t('stn_th_unit')}</label><input class="stn-input" id="stnItemUnit" value="${STN.esc(item?.unit || 'pcs')}"></div>
        </div>
        <div class="stn-grid stn-grid-2">
          ${!editing ? `<div class="stn-field"><label class="stn-label">${t('stn_inv_starting_qty')}</label><input class="stn-input" type="number" id="stnItemQty" value="0"></div>` : ''}
          <div class="stn-field"><label class="stn-label">${t('stn_inv_reorder_level')}</label><input class="stn-input" type="number" id="stnItemReorder" value="${item?.reorder_level ?? 5}"></div>
        </div>
        <div class="stn-grid stn-grid-2">
          <div class="stn-field"><label class="stn-label">${t('stn_inv_cost_price')}</label><input class="stn-input" type="number" id="stnItemCost" value="${item?.cost_price ?? 0}"></div>
          <div class="stn-field"><label class="stn-label">${t('stn_inv_barcode_optional')}</label><input class="stn-input" id="stnItemBarcode" value="${STN.esc(item?.barcode || '')}"></div>
        </div>
      </div>
      <div class="stn-modal-foot">
        ${editing ? `<button class="stn-btn stn-btn-danger" id="stnItemDelete">${t('stn_delete')}</button>` : ''}
        <button class="stn-btn stn-btn-primary" id="stnItemSave">${editing ? t('stn_save') : t('stn_inv_add_item')}</button>
      </div>
    `);

    document.getElementById('stnItemSave').addEventListener('click', async () => {
      const payload = {
        name: document.getElementById('stnItemName').value.trim(),
        category: document.getElementById('stnItemCat').value.trim(),
        unit: document.getElementById('stnItemUnit').value.trim(),
        reorder_level: Number(document.getElementById('stnItemReorder').value),
        cost_price: Number(document.getElementById('stnItemCost').value),
        barcode: document.getElementById('stnItemBarcode').value.trim() || null,
      };
      if (!payload.name) return STN.toast(t('stn_inv_name_required'), 'error');
      try {
        if (editing) await STN.api.put(`/inventory/${item.id}`, payload);
        else await STN.api.post('/inventory', { ...payload, quantity: Number(document.getElementById('stnItemQty').value) });
        STN.toast(t('stn_saved'));
        STN.closeModal();
        loadTable();
        STN.refreshLowStockBadge?.();
      } catch (err) { STN.toast(err.message, 'error'); }
    });
    document.getElementById('stnItemDelete')?.addEventListener('click', async () => {
      if (!confirm(t('stn_inv_delete_confirm'))) return;
      await STN.api.del(`/inventory/${item.id}`);
      STN.closeModal(); loadTable();
    });
  }

  function openAdjustModal(item) {
    STN.openModal(`
      <div class="stn-modal-head"><h3 class="mb-0">${t('stn_inv_adjust_stock')} — ${STN.esc(item.name)}</h3><button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button></div>
      <div class="stn-modal-body">
        <p class="text-soft">${t('stn_inv_current')}: <strong>${item.quantity} ${STN.esc(item.unit)}</strong></p>
        <div class="stn-field">
          <label class="stn-label">${t('stn_inv_reason')}</label>
          <select class="stn-select" id="stnAdjReason"><option value="purchase">${t('stn_inv_reason_purchase')}</option><option value="waste">${t('stn_inv_reason_waste')}</option><option value="adjustment">${t('stn_inv_reason_correction')}</option></select>
        </div>
        <div class="stn-field"><label class="stn-label">${t('stn_inv_change_amount')}</label><input class="stn-input" type="number" id="stnAdjQty" value="1"></div>
      </div>
      <div class="stn-modal-foot"><button class="stn-btn stn-btn-primary" id="stnAdjSave">${t('stn_inv_apply')}</button></div>
    `);
    document.getElementById('stnAdjSave').addEventListener('click', async () => {
      const reason = document.getElementById('stnAdjReason').value;
      let change = Number(document.getElementById('stnAdjQty').value);
      if (reason === 'waste' && change > 0) change = -change;
      try {
        await STN.api.post(`/inventory/${item.id}/adjust`, { change_qty: change, reason });
        STN.toast(t('stn_inv_stock_updated'));
        STN.closeModal(); loadTable();
        STN.refreshLowStockBadge?.();
      } catch (err) { STN.toast(err.message, 'error'); }
    });
  }
})();
