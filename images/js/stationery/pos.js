(function () {
  'use strict';
  const STN = window.STN;
  const t = (k) => (window.S21_t ? window.S21_t(k) : k);
  window.STN_MODULES = window.STN_MODULES || {};

  const STATUS_BADGE = { Received: 'info', Processing: 'warn', Ready: 'ok', Completed: 'ok', Cancelled: 'danger' };
  const STATUS_KEY = {
    Received: 'stn_status_received', Processing: 'stn_status_processing', Ready: 'stn_status_ready',
    Completed: 'stn_status_completed', Cancelled: 'stn_status_cancelled',
  };
  function statusLabel(s) { return STATUS_KEY[s] ? t(STATUS_KEY[s]) : s; }
  const PAY_BADGE = { Paid: 'ok', Partial: 'warn', Unpaid: 'danger' };
  const PAY_KEY = { Paid: 'stn_pay_paid', Partial: 'stn_pay_partial', Unpaid: 'stn_pay_unpaid' };
  function payLabel(s) { return PAY_KEY[s] ? t(PAY_KEY[s]) : s; }
  function methods() {
    return [
      { v: 'cash', l: t('stn_method_cash') }, { v: 'mpesa', l: 'M-Pesa' }, { v: 'tigopesa', l: 'TigoPesa' },
      { v: 'bank', l: t('stn_method_bank') }, { v: 'credit', l: t('stn_method_credit') },
    ];
  }

  // ================= POS (new order) =================
  let cart = [];
  let allServices = [];

  window.STN_MODULES.pos = async function (root) {
    cart = [];
    const { services } = await STN.api.get('/services');
    allServices = services;
    render(root);
  };

  function categories() {
    return [...new Set(allServices.map((s) => s.category))];
  }

  function render(root) {
    const cats = categories();
    const METHODS = methods();
    root.innerHTML = `
      <div class="stn-grid" style="grid-template-columns: 1.5fr 1fr; align-items:flex-start">
        <div class="stn-card">
          <div class="stn-card-head">
            <h3>${t('stn_pos_services')}</h3>
            <input class="stn-input" style="max-width:220px" id="stnPosSearch" placeholder="${t('stn_pos_search_services')}">
          </div>
          <div class="stn-tabs" id="stnPosCats">
            <div class="stn-tab active" data-cat="">${t('stn_all')}</div>
            ${cats.map((c) => `<div class="stn-tab" data-cat="${STN.esc(c)}">${STN.esc(c)}</div>`).join('')}
          </div>
          <div class="stn-grid stn-grid-3" id="stnPosGrid"></div>
        </div>

        <div class="stn-card">
          <div class="stn-card-head"><h3><i class="fa-solid fa-cart-shopping me-1"></i>${t('stn_pos_cart')}</h3><button class="stn-btn stn-btn-ghost stn-btn-sm" id="stnClearCart">${t('stn_clear')}</button></div>
          <div id="stnCartItems"></div>
          <hr style="border-color:var(--s21-border)">
          <div class="stn-field">
            <label class="stn-label">${t('stn_th_customer')}</label>
            <input class="stn-input" id="stnCustomerName" placeholder="${t('stn_pos_customer_placeholder')}">
            <input class="stn-input mt-2" id="stnCustomerPhone" placeholder="${t('stn_pos_phone_placeholder')}">
          </div>
          <div class="stn-field">
            <label class="stn-label">${t('stn_pos_discount')} (${(STN.state.business || {}).currency || ''})</label>
            <input class="stn-input" id="stnDiscount" type="number" min="0" value="0">
          </div>
          <div class="d-flex justify-content-between mb-1"><span class="text-soft">${t('stn_subtotal')}</span><strong id="stnSubtotal">0</strong></div>
          <div class="d-flex justify-content-between mb-3"><span class="text-soft">${t('stn_pos_total_due')}</span><strong class="text-emerald" id="stnTotal" style="font-size:1.2rem">0</strong></div>
          <div class="stn-field">
            <label class="stn-label">${t('stn_pos_payment_method')}</label>
            <select class="stn-select" id="stnPayMethod">${METHODS.map((m) => `<option value="${m.v}">${m.l}</option>`).join('')}</select>
          </div>
          <div class="stn-field">
            <label class="stn-label">${t('stn_pos_amount_paid_now')}</label>
            <input class="stn-input" id="stnPayAmount" type="number" min="0" value="0">
          </div>
          <button class="stn-btn stn-btn-primary w-100" id="stnCheckout"><i class="fa-solid fa-receipt"></i> ${t('stn_pos_complete_order')}</button>
        </div>
      </div>
    `;

    renderGrid('');
    renderCart();

    document.getElementById('stnPosSearch').addEventListener('input', (e) => renderGrid('', e.target.value));
    document.querySelectorAll('#stnPosCats .stn-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        document.querySelectorAll('#stnPosCats .stn-tab').forEach((t) => t.classList.remove('active'));
        tab.classList.add('active');
        renderGrid(tab.dataset.cat, document.getElementById('stnPosSearch').value);
      });
    });
    document.getElementById('stnClearCart').addEventListener('click', () => { cart = []; renderCart(); });
    document.getElementById('stnDiscount').addEventListener('input', updateTotals);
    document.getElementById('stnCheckout').addEventListener('click', checkout);
  }

  function renderGrid(cat, q) {
    const grid = document.getElementById('stnPosGrid');
    const query = (q || '').toLowerCase();
    const list = allServices.filter((s) => (!cat || s.category === cat) && (!query || s.name.toLowerCase().includes(query)));
    grid.innerHTML = list.length ? list.map((s) => `
      <div class="stn-card stn-card-tight" style="cursor:pointer" data-add="${s.id}">
        <div style="font-weight:700;font-size:.9rem">${STN.esc(s.name)}</div>
        <div class="text-soft" style="font-size:.76rem">${STN.esc(s.category)} · ${t('stn_pos_per')} ${STN.esc(s.unit)}</div>
        <div class="text-emerald mt-1" style="font-weight:800">${STN.money(s.unit_price)}</div>
      </div>`).join('') : `<div class="stn-empty"><i class="fa-solid fa-magnifying-glass"></i>${t('stn_pos_no_services_match')}</div>`;

    grid.querySelectorAll('[data-add]').forEach((el) => {
      el.addEventListener('click', () => addToCart(Number(el.dataset.add)));
    });
  }

  function addToCart(serviceId) {
    const service = allServices.find((s) => s.id === serviceId);
    if (!service) return;
    const existing = cart.find((c) => c.service_id === serviceId);
    if (existing) existing.qty += 1;
    else cart.push({ service_id: serviceId, description: service.name, unit_price: service.unit_price, qty: 1 });
    renderCart();
  }

  function renderCart() {
    const box = document.getElementById('stnCartItems');
    box.innerHTML = cart.length ? cart.map((c, i) => `
      <div class="d-flex align-items-center gap-2 mb-2">
        <div class="flex-grow-1">
          <div style="font-size:.85rem;font-weight:700">${STN.esc(c.description)}</div>
          <div class="text-soft" style="font-size:.74rem">${STN.money(c.unit_price)} ${t('stn_pos_each')}</div>
        </div>
        <input type="number" min="1" value="${c.qty}" class="stn-input" style="width:64px" data-qty="${i}">
        <button class="stn-icon-btn" data-remove="${i}"><i class="fa-solid fa-trash text-red"></i></button>
      </div>`).join('') : `<div class="stn-empty" style="padding:1.2rem"><i class="fa-solid fa-cart-shopping"></i>${t('stn_pos_cart_empty')}</div>`;

    box.querySelectorAll('[data-qty]').forEach((input) => {
      input.addEventListener('input', () => { cart[Number(input.dataset.qty)].qty = Math.max(1, Number(input.value) || 1); updateTotals(); });
    });
    box.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', () => { cart.splice(Number(btn.dataset.remove), 1); renderCart(); });
    });
    updateTotals();
  }

  function updateTotals() {
    const subtotal = cart.reduce((s, c) => s + c.qty * c.unit_price, 0);
    const discount = Number(document.getElementById('stnDiscount')?.value) || 0;
    const total = Math.max(0, subtotal - discount);
    const subtotalEl = document.getElementById('stnSubtotal');
    const totalEl = document.getElementById('stnTotal');
    if (subtotalEl) subtotalEl.textContent = STN.money(subtotal);
    if (totalEl) totalEl.textContent = STN.money(total);
    const payAmount = document.getElementById('stnPayAmount');
    if (payAmount && Number(payAmount.value) === 0) payAmount.value = total || 0;
  }

  async function checkout() {
    if (!cart.length) { STN.toast(t('stn_pos_add_service_first'), 'error'); return; }
    const btn = document.getElementById('stnCheckout');
    btn.disabled = true;
    try {
      const payload = {
        items: cart.map((c) => ({ service_id: c.service_id, qty: c.qty })),
        customer_name: document.getElementById('stnCustomerName').value.trim() || undefined,
        customer_phone: document.getElementById('stnCustomerPhone').value.trim() || undefined,
        discount: Number(document.getElementById('stnDiscount').value) || 0,
      };
      const payAmount = Number(document.getElementById('stnPayAmount').value) || 0;
      if (payAmount > 0) payload.payment = { amount: payAmount, method: document.getElementById('stnPayMethod').value };

      const result = await STN.api.post('/orders', payload);
      STN.toast(`${t('stn_pos_order')} ${result.order_no} ${t('stn_pos_created')}`);
      cart = [];
      renderCart();
      document.getElementById('stnCustomerName').value = '';
      document.getElementById('stnCustomerPhone').value = '';
      document.getElementById('stnPayAmount').value = 0;
      await openOrderDetail(result.id, { showReceipt: true });
      STN.refreshLowStockBadge?.();
    } catch (err) {
      STN.toast(err.message, 'error');
    } finally {
      btn.disabled = false;
    }
  }

  // ================= Orders board =================
  window.STN_MODULES.orders = async function (root) {
    root.innerHTML = `
      <div class="stn-card mb-3">
        <div class="d-flex flex-wrap gap-2 align-items-center">
          <input class="stn-input" style="max-width:240px" id="stnOrderSearch" placeholder="${t('stn_orders_search_placeholder')}">
          <input class="stn-input" type="date" style="max-width:170px" id="stnOrderFrom">
          <input class="stn-input" type="date" style="max-width:170px" id="stnOrderTo">
          <button class="stn-btn stn-btn-outline stn-btn-sm" id="stnOrderFilter"><i class="fa-solid fa-filter"></i> ${t('stn_filter')}</button>
          <a href="#pos" class="stn-btn stn-btn-primary stn-btn-sm ms-auto"><i class="fa-solid fa-plus"></i> ${t('stn_orders_new_order')}</a>
        </div>
      </div>
      <div class="stn-board" id="stnBoard"></div>
    `;
    await loadBoard();
    document.getElementById('stnOrderFilter').addEventListener('click', loadBoard);
  };

  async function loadBoard() {
    const q = document.getElementById('stnOrderSearch')?.value || '';
    const from = document.getElementById('stnOrderFrom')?.value || '';
    const to = document.getElementById('stnOrderTo')?.value || '';
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (from) params.set('from', from);
    if (to) params.set('to', to);

    const { orders } = await STN.api.get(`/orders?${params.toString()}`);
    const columns = ['Received', 'Processing', 'Ready', 'Completed'];
    const board = document.getElementById('stnBoard');
    board.innerHTML = columns.map((status) => {
      const items = orders.filter((o) => o.status === status);
      return `
        <div class="stn-board-col">
          <div class="stn-board-col-head"><span>${statusLabel(status)}</span><span>${items.length}</span></div>
          ${items.map((o) => `
            <div class="stn-order-card" data-order="${o.id}">
              <div class="no">${STN.esc(o.order_no)}</div>
              <div class="meta">${STN.esc(o.customer_name || t('stn_walk_in'))}</div>
              <div class="d-flex justify-content-between align-items-center mt-1">
                <span class="stn-badge ${PAY_BADGE[o.payment_status]}">${payLabel(o.payment_status)}</span>
                <strong style="font-size:.82rem">${STN.money(o.total_amount)}</strong>
              </div>
            </div>`).join('') || `<div class="text-soft" style="font-size:.8rem;padding:.5rem">${t('stn_orders_nothing_here')}</div>`}
        </div>`;
    }).join('');

    board.querySelectorAll('[data-order]').forEach((el) => {
      el.addEventListener('click', () => openOrderDetail(Number(el.dataset.order)));
    });
  }

  // ================= Order detail / receipt =================
  async function openOrderDetail(orderId, opts) {
    const { order, items, payments, business } = await STN.api.get(`/orders/${orderId}`);
    const balance = order.total_amount - order.paid_amount;
    const statuses = ['Received', 'Processing', 'Ready', 'Completed', 'Cancelled'];
    const METHODS = methods();

    STN.openModal(`
      <div class="stn-modal-head">
        <div><h3 class="mb-0">${STN.esc(order.order_no)}</h3><div class="text-soft" style="font-size:.78rem">${STN.dt(order.created_at)}</div></div>
        <button class="stn-icon-btn" onclick="STN.closeModal()"><i class="fa-solid fa-xmark"></i></button>
      </div>
      <div class="stn-modal-body">
        <div class="d-flex flex-wrap gap-2 mb-3">
          <span class="stn-badge ${STATUS_BADGE[order.status]}">${statusLabel(order.status)}</span>
          <span class="stn-badge ${PAY_BADGE[order.payment_status]}">${payLabel(order.payment_status)}</span>
        </div>
        <p class="mb-2"><strong>${STN.esc(order.customer_name || t('stn_pos_walk_in_customer'))}</strong> ${order.customer_phone ? `· ${STN.esc(order.customer_phone)}` : ''}</p>

        <div class="stn-table-wrap mb-3">
          <table class="stn-table">
            <thead><tr><th>${t('stn_th_item')}</th><th>${t('stn_th_qty')}</th><th>${t('stn_th_unit')}</th><th>${t('stn_th_total')}</th></tr></thead>
            <tbody>${items.map((i) => `<tr><td>${STN.esc(i.description)}</td><td>${i.qty}</td><td>${STN.money(i.unit_price)}</td><td>${STN.money(i.total_price)}</td></tr>`).join('')}</tbody>
          </table>
        </div>

        <div class="d-flex justify-content-between"><span class="text-soft">${t('stn_subtotal')}</span><span>${STN.money(order.subtotal)}</span></div>
        <div class="d-flex justify-content-between"><span class="text-soft">${t('stn_pos_discount')}</span><span>-${STN.money(order.discount)}</span></div>
        <div class="d-flex justify-content-between"><span class="text-soft">${t('stn_pos_paid')}</span><span>${STN.money(order.paid_amount)}</span></div>
        <div class="d-flex justify-content-between mb-3"><strong>${t('stn_pos_balance')}</strong><strong class="${balance > 0 ? 'text-amber' : 'text-emerald'}">${STN.money(balance)}</strong></div>

        <div class="stn-field">
          <label class="stn-label">${t('stn_pos_update_status')}</label>
          <div class="d-flex flex-wrap gap-2">
            ${statuses.map((s) => `<button class="stn-btn stn-btn-sm ${s === order.status ? 'stn-btn-primary' : 'stn-btn-outline'}" data-status="${s}">${statusLabel(s)}</button>`).join('')}
          </div>
        </div>

        ${balance > 0 ? `
        <div class="stn-field">
          <label class="stn-label">${t('stn_pos_record_payment')}</label>
          <div class="d-flex gap-2">
            <input class="stn-input" id="stnPayAmt" type="number" min="1" max="${balance}" value="${balance}">
            <select class="stn-select" id="stnPayMeth" style="max-width:160px">${METHODS.map((m) => `<option value="${m.v}">${m.l}</option>`).join('')}</select>
            <button class="stn-btn stn-btn-primary stn-btn-sm" id="stnAddPayment">${t('stn_add')}</button>
          </div>
        </div>` : ''}
      </div>
      <div class="stn-modal-foot">
        <button class="stn-btn stn-btn-outline" id="stnPrintReceipt"><i class="fa-solid fa-print"></i> ${t('stn_pos_receipt')}</button>
        <button class="stn-btn stn-btn-ghost" onclick="STN.closeModal()">${t('stn_close')}</button>
      </div>
    `, { wide: true });

    document.querySelectorAll('[data-status]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await STN.api.put(`/orders/${order.id}/status`, { status: btn.dataset.status });
        STN.toast(t('stn_pos_order_status_updated'));
        STN.closeModal();
        openOrderDetail(order.id);
        if (location.hash === '#orders') loadBoard();
      });
    });
    document.getElementById('stnAddPayment')?.addEventListener('click', async () => {
      const amount = Number(document.getElementById('stnPayAmt').value);
      const method = document.getElementById('stnPayMeth').value;
      if (!amount || amount <= 0) return STN.toast(t('stn_pos_enter_valid_amount'), 'error');
      try {
        await STN.api.post(`/orders/${order.id}/payments`, { amount, method });
        STN.toast(t('stn_pos_payment_recorded'));
        STN.closeModal();
        openOrderDetail(order.id);
      } catch (err) { STN.toast(err.message, 'error'); }
    });
    document.getElementById('stnPrintReceipt').addEventListener('click', () => printReceipt(order, items, payments, business));

    if (opts && opts.showReceipt) printReceipt(order, items, payments, business);
  }
  window.STN_openOrderDetail = openOrderDetail;

  function printReceipt(order, items, payments, business) {
    const win = window.open('', '_blank', 'width=420,height=640');
    win.document.write(`
      <html><head><title>${order.order_no}</title>
      <style>
        body{font-family:'Courier New',monospace;padding:16px;color:#0f172a}
        .c{text-align:center} hr{border-top:1px dashed #64748b}
        table{width:100%;border-collapse:collapse;font-size:12px} td{padding:2px 0}
        .right{text-align:right}
      </style></head><body>
      <div class="c"><strong>${STN.esc(business.name)}</strong><br>${STN.esc(business.phone || '')}<br>${STN.esc(business.address || '')}</div>
      <hr>
      <div>${t('stn_pos_order')}: <strong>${STN.esc(order.order_no)}</strong><br>${t('stn_pos_date')}: ${STN.dt(order.created_at)}<br>${t('stn_th_customer')}: ${STN.esc(order.customer_name || t('stn_walk_in'))}</div>
      <hr>
      <table>${items.map((i) => `<tr><td>${STN.esc(i.description)} x${i.qty}</td><td class="right">${STN.money(i.total_price)}</td></tr>`).join('')}</table>
      <hr>
      <table>
        <tr><td>${t('stn_subtotal')}</td><td class="right">${STN.money(order.subtotal)}</td></tr>
        <tr><td>${t('stn_pos_discount')}</td><td class="right">-${STN.money(order.discount)}</td></tr>
        <tr><td><strong>${t('stn_th_total')}</strong></td><td class="right"><strong>${STN.money(order.total_amount)}</strong></td></tr>
        <tr><td>${t('stn_pos_paid')}</td><td class="right">${STN.money(order.paid_amount)}</td></tr>
        <tr><td>${t('stn_pos_balance')}</td><td class="right">${STN.money(order.total_amount - order.paid_amount)}</td></tr>
      </table>
      <hr>
      <div class="c">${STN.esc(business.receipt_note || t('stn_pos_thank_you'))}</div>
      </body></html>`);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 300);
  }
})();
