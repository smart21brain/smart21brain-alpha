/* Products: catalogue, categories, save/edit form, photo, stock adjustments & history. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  function productForm(p = {}, lk) {
    return `<div class="cols">${SP.f.input('name', SP.t('Product name', 'Jina la bidhaa'), { required: true, value: p.name, placeholder: SP.t('e.g. Rice 1kg', 'mfano: Mchele 1kg') })}${SP.f.select('category_id', SP.t('Category', 'Jamii'), SP.opts.categories(lk), { value: p.category_id })}</div>
      <div class="cols-3">${SP.f.input('sku', SP.t('Code / SKU (optional)', 'Nambari (si lazima)'), { value: p.sku })}${SP.f.input('barcode', SP.t('Barcode (optional)', 'Bakodi (si lazima)'), { value: p.barcode })}${SP.f.select('unit', SP.t('Unit', 'Kipimo'), SP.opts.units(lk), { value: p.unit || 'pcs', noBlank: true })}</div>
      <div class="cols-3">${SP.can('profit.view') ? SP.f.input('cost_price', SP.t('Cost price', 'Bei ya Ununuzi'), { type: 'number', value: p.cost_price ?? 0, attr: { min: 0, step: '0.01' } }) : ''}${SP.f.input('sell_price', SP.t('Selling price', 'Bei ya Mauzo'), { type: 'number', required: true, value: p.sell_price ?? '', attr: { min: 0, step: '0.01' } })}${SP.f.input('reorder_level', SP.t('Low-stock level', 'Kiwango cha Kupungua'), { type: 'number', value: p.reorder_level ?? 0, hint: SP.t('Get warned below this', 'Utaarifiwa chini ya hiki'), attr: { min: 0, step: '0.01' } })}</div>
      ${!p.id ? `<div class="cols">${SP.f.check('track_stock', SP.t('Track stock for this item', 'Fuatilia bidhaa hii stoo'), p.track_stock !== 0, '1')}${SP.f.input('opening_stock', SP.t('Opening stock', 'Bidhaa za Awali'), { type: 'number', value: 0, attr: { min: 0, step: '0.01' } })}</div>` : SP.f.check('track_stock', SP.t('Track stock for this item', 'Fuatilia bidhaa hii stoo'), !!p.track_stock, '1')}
      ${SP.f.select('status', SP.t('Status', 'Hali'), SP.opts.status, { value: p.status || 'active', noBlank: true })}
      ${SP.f.textarea('description', SP.t('Description (optional)', 'Maelezo (si lazima)'), { value: p.description, rows: 2 })}`;
  }

  function openProductForm(existing, onSaved) {
    SP.lookups().then((lk) => {
      SP.formModal({
        title: existing ? SP.t('Edit product', 'Hariri Bidhaa') : SP.t('Add product', 'Ongeza Bidhaa'), submit: existing ? SP.t('Save changes', 'Hifadhi Mabadiliko') : SP.t('Add product', 'Ongeza Bidhaa'), size: 'wide', body: productForm(existing || {}, lk),
        onSubmit: async (data) => {
          const r = existing ? await SP.api.put(`/products/${existing.id}`, data) : await SP.api.post('/products', data);
          SP.closeModal(); SP.toast(existing ? SP.t('Product updated.', 'Bidhaa imesasishwa.') : SP.t('Product added.', 'Bidhaa imeongezwa.')); if (onSaved) onSaved(r);
        },
      });
    });
  }
  SP.openProductForm = openProductForm;

  function openStockAdjust(p, onDone) {
    const back = SP.modal(SP.t(`Adjust stock — ${p.name}`, `Rekebisha Stoo — ${p.name}`), `<div class="sp-seg" id="adjType" style="margin-bottom:1rem"><button class="on" data-t="purchase">${SP.t('Receive stock', 'Pokea Bidhaa')}</button><button data-t="count">${SP.t('Stock count', 'Hesabu ya Stoo')}</button><button data-t="damage">${SP.t('Damaged / lost', 'Imeharibika / Imepotea')}</button></div>
      <form class="sp-form" id="adjForm" novalidate><div class="sp-form-error" role="alert"></div>
      <p class="sp-small sp-muted" style="margin:0">${SP.t('Currently in stock', 'Zilizopo stoo sasa')}: <b>${p.stock_qty} ${esc(p.unit)}</b></p>
      ${SP.f.input('qty', SP.t('Quantity', 'Idadi'), { type: 'number', required: true, attr: { min: 0, step: '0.01' } })}
      ${SP.can('profit.view') ? SP.f.input('cost_price', SP.t('New cost price (optional)', 'Bei mpya ya ununuzi (si lazima)'), { type: 'number', placeholder: String(p.cost_price), attr: { min: 0, step: '0.01' } }) : ''}
      ${SP.f.input('note', SP.t('Note (optional)', 'Maelezo (si lazima)'), { placeholder: SP.t('e.g. delivery from supplier', 'mfano: usafirishaji kutoka kwa muuzaji') })}
      </form>`, { footer: `<button class="sp-btn ghost" data-close2>${SP.t('Cancel', 'Ghairi')}</button><button class="sp-btn primary" form="adjForm" type="submit">${SP.t('Save', 'Hifadhi')}</button>` });
    back.querySelector('[data-close2]').addEventListener('click', () => SP.closeModal());
    let type = 'purchase';
    back.querySelector('#adjType').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; type = b.dataset.t; back.querySelectorAll('#adjType button').forEach((x) => x.classList.toggle('on', x === b)); const qtyLabel = back.querySelector('label[for=f_qty]'); qtyLabel.innerHTML = (type === 'count' ? SP.t('Counted quantity (new total)', 'Idadi Iliyohesabiwa (jumla mpya)') : SP.t('Quantity', 'Idadi')) + '<span class="req">*</span>'; });
    const form = back.querySelector('#adjForm');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SP.validate(form)) return;
      const btn = form.querySelector('button[type=submit]') || back.querySelector('[form=adjForm]');
      const errBox = form.querySelector('.sp-form-error'); errBox.classList.remove('show');
      try { const r = await SP.api.post(`/products/${p.id}/stock`, { ...SP.formData(form), type }); SP.closeModal(); SP.toast(SP.t(`Stock updated — now ${r.stock_qty} ${p.unit}.`, `Stoo imesasishwa — sasa ${r.stock_qty} ${p.unit}.`)); if (onDone) onDone(); }
      catch (err) { errBox.textContent = err.message; errBox.classList.add('show'); }
    });
  }

  // =============================================================== list
  SP.modules.products = async (el, parts, seg) => {
    const q0 = new URLSearchParams(location.hash.split('?')[1] || '');
    const lk = await SP.lookups();
    const showCost = SP.can('profit.view');
    const st = { page: 1, limit: 24, q: '', category_id: '', status: '', stock: q0.get('stock') || '', sort: 'name' };
    el.innerHTML = `${SP.pageHead(SP.t('Products', 'Bidhaa'), SP.t('Catalogue, pricing and stock', 'Orodha, bei na stoo'), `${SP.can('products.manage') ? `<button class="sp-btn ghost" data-act="cats"><i class="fa-solid fa-tags"></i> ${SP.t('Categories', 'Jamii')}</button><button class="sp-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> ${SP.t('Add Product', 'Ongeza Bidhaa')}</button>` : ''}`)}
      <div class="sp-grid stats" id="prodSummary" style="margin-bottom:1.1rem">${SP.skeleton(1)}</div>
      <div class="sp-card">
        <div class="sp-toolbar">
          <input class="sp-input grow" id="fQ" type="search" placeholder="${SP.t('Search by name, code or barcode…', 'Tafuta kwa jina, nambari au bakodi…')}" aria-label="${SP.t('Search products', 'Tafuta bidhaa')}">
          <select class="sp-select" id="fCat" aria-label="${SP.t('Category', 'Jamii')}"><option value="">${SP.t('All categories', 'Jamii zote')}</option>${SP.opts.categories(lk).map((o) => `<option value="${o.v}">${esc(o.l)}</option>`).join('')}</select>
          <select class="sp-select" id="fStock" aria-label="${SP.t('Stock', 'Stoo')}"><option value="">${SP.t('Any stock', 'Stoo yoyote')}</option><option value="in">${SP.t('In stock', 'Ipo stoo')}</option><option value="low">${SP.t('Low stock', 'Inapungua')}</option><option value="out">${SP.t('Out of stock', 'Imeisha')}</option></select>
          <select class="sp-select" id="fStatus" aria-label="${SP.t('Status', 'Hali')}"><option value="">${SP.t('Any status', 'Hali yoyote')}</option>${SP.opts.status.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
          <select class="sp-select" id="fSort" aria-label="${SP.t('Sort', 'Panga')}"><option value="name">${SP.t('Name (A–Z)', 'Jina (A–Z)')}</option><option value="recent">${SP.t('Most recent', 'Za hivi karibuni')}</option><option value="stock">${SP.t('Lowest stock', 'Stoo Ndogo Zaidi')}</option><option value="price">${SP.t('Highest price', 'Bei Kubwa Zaidi')}</option></select>
          <button class="sp-btn ghost sm" id="fClear"><i class="fa-solid fa-rotate-left"></i> ${SP.t('Clear', 'Futa')}</button>
        </div>
        <div id="prodList">${SP.skeleton(6)}</div>
      </div>`;
    if (st.stock) el.querySelector('#fStock').value = st.stock;

    const listEl = el.querySelector('#prodList');
    async function load() {
      listEl.style.opacity = '.6';
      try {
        const d = await SP.api.get('/products' + SP.qs({ ...st }));
        const s = d.summary;
        el.querySelector('#prodSummary').innerHTML = [
          SP.stat('fa-boxes-stacked', SP.num(s.total), SP.t('Products', 'Bidhaa'), SP.t(`${s.active} active`, `Hai ${s.active}`)),
          SP.stat('fa-box-open', SP.num(s.out_count), SP.t('Out of Stock', 'Zimeisha Stoo'), '', s.out_count ? 'red' : 'green'),
          SP.stat('fa-triangle-exclamation', SP.num(s.low_count), SP.t('Low Stock', 'Zinapungua'), '', s.low_count ? 'amber' : 'green'),
          showCost ? SP.stat('fa-warehouse', SP.moneyHtml(s.stock_cost), SP.t('Stock Value (Cost)', 'Thamani ya Stoo (Ununuzi)'), '', 'blue') : SP.stat('fa-tags', SP.moneyHtml(s.stock_retail), SP.t('Stock Value (Retail)', 'Thamani ya Stoo (Rejareja)'), '', 'blue'),
        ].join('');
        const cols = [
          { label: SP.t('Product', 'Bidhaa'), render: (p) => `<a href="#product/${p.id}" class="sp-person" style="color:inherit"><span class="sp-avatar">${p.has_image ? `<img src="/api/shop/products/${p.id}/image?v=${SP.state.photoV}" alt="" onerror="this.remove()">` : '<i class="fa-solid fa-box"></i>'}</span><span><span class="nm" style="color:var(--sp-text)">${esc(p.name)}</span><div class="sb">${esc(p.sku || p.category_name || '')}</div></span></a>` },
          { label: SP.t('Category', 'Jamii'), render: (p) => p.category_name ? SP.chip('info', p.category_name) : '—' },
          ...(showCost ? [{ label: SP.t('Cost', 'Ununuzi'), cls: 'end', render: (p) => SP.money(p.cost_price) }] : []),
          { label: SP.t('Price', 'Bei'), cls: 'end', render: (p) => SP.money(p.sell_price) },
          { label: SP.t('Stock', 'Stoo'), cls: 'end', render: (p) => p.track_stock ? `<b>${SP.num(p.stock_qty)}</b> ${esc(p.unit)}` : `<span class="sp-muted">${SP.t('Service', 'Huduma')}</span>` },
          { label: SP.t('State', 'Hali'), render: (p) => SP.chip(p.stock_state) },
          { label: SP.t('Actions', 'Vitendo'), cls: 'end', render: (p) => `<div class="sp-actions-cell"><a class="sp-btn ghost sm" href="#product/${p.id}" title="${SP.t('View', 'Ona')}"><i class="fa-solid fa-eye"></i></a><button class="sp-btn ghost sm" data-act="menu" data-id="${p.id}" title="${SP.t('More', 'Zaidi')}"><i class="fa-solid fa-ellipsis"></i></button></div>` },
        ];
        const empty = st.q || st.category_id || st.stock || st.status
          ? SP.empty('fa-magnifying-glass', SP.t('No products match your search', 'Hakuna bidhaa inayolingana na utafutaji wako'), SP.t('Try a different name or clear the filters.', 'Jaribu jina tofauti au futa vichujio.'))
          : SP.empty('fa-boxes-stacked', SP.t('No products yet', 'Hakuna bidhaa bado'), SP.t('Add your first product to start selling.', 'Ongeza bidhaa yako ya kwanza kuanza kuuza.'), SP.can('products.manage') ? `<button class="sp-btn primary" data-act="new"><i class="fa-solid fa-plus"></i> ${SP.t('Add Product', 'Ongeza Bidhaa')}</button>` : '');
        listEl._rows = d.products;
        listEl.innerHTML = SP.table(cols, d.products, { empty }) + SP.pager(d.page, d.limit, d.total);
      } catch (e) { listEl.innerHTML = SP.errorBox(e); }
      listEl.style.opacity = '1';
    }
    const bind = (id, key) => el.querySelector(id).addEventListener('change', (e) => { st[key] = e.target.value; st.page = 1; load(); });
    el.querySelector('#fQ').addEventListener('input', SP.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; load(); }, 300));
    bind('#fCat', 'category_id'); bind('#fStock', 'stock'); bind('#fStatus', 'status'); bind('#fSort', 'sort');
    el.querySelector('#fClear').addEventListener('click', () => { Object.assign(st, { q: '', category_id: '', status: '', stock: '', sort: 'name', page: 1 }); el.querySelectorAll('.sp-toolbar input,.sp-toolbar select').forEach((i) => { i.value = ''; }); load(); });

    const remove = async (row) => {
      const ok = await SP.confirm({ title: SP.t('Delete this product?', 'Futa bidhaa hii?'), message: SP.t(`<b>${esc(row.name)}</b> will be permanently deleted.`, `<b>${esc(row.name)}</b> itafutwa kabisa.`) });
      if (!ok) return;
      try { await SP.api.del(`/products/${row.id}`); SP.toast(SP.t('Product deleted.', 'Bidhaa imefutwa.')); load(); } catch (e) { SP.fail(e); }
    };
    SP.delegate(el, {
      // After adding, jump straight to the product's own page — that's where QR codes are generated.
      new: () => openProductForm(null, (r) => SP.go(`product/${r.id}`)),
      cats: () => openCategoriesModal(() => { SP.refreshLookups(); load(); }),
      page: (b) => { st.page = Number(b.dataset.p); load(); },
      menu: (b) => {
        const row = listEl._rows.find((x) => String(x.id) === b.dataset.id); if (!row) return;
        SP.popMenu(b, [
          { label: SP.t('View', 'Ona'), icon: 'fa-eye', fn: () => SP.go(`product/${row.id}`) },
          ...(SP.can('products.manage') ? [{ label: SP.t('Edit', 'Hariri'), icon: 'fa-pen', fn: () => openProductForm(row, () => load()) }] : []),
          ...(SP.can('stock.adjust') && row.track_stock ? [{ label: SP.t('Adjust stock', 'Rekebisha Stoo'), icon: 'fa-boxes-packing', fn: () => openStockAdjust(row, () => load()) }] : []),
          ...(SP.can('products.manage') ? [{ label: SP.t('Delete', 'Futa'), icon: 'fa-trash', danger: true, fn: () => remove(row) }] : []),
        ]);
      },
    });
    await load();
  };

  // =============================================================== categories
  function openCategoriesModal(onChange) {
    SP.lookups().then(async (lk) => {
      const { categories } = await SP.api.get('/categories');
      const back = SP.modal(SP.t('Categories', 'Jamii'), `<form class="sp-row" id="catForm" style="margin-bottom:1rem"><input class="sp-input grow" name="name" placeholder="${SP.t('New category name', 'Jina la jamii mpya')}" maxlength="60" required><input type="color" name="color" value="#4F46E5" style="width:44px;height:42px;border:1px solid var(--sp-border);border-radius:10px;padding:2px"><button class="sp-btn primary" type="submit">${SP.t('Add', 'Ongeza')}</button></form><div class="sp-list" id="catList">${categories.map(catRow).join('') || `<p class="sp-muted sp-small">${SP.t('No categories yet.', 'Hakuna jamii bado.')}</p>`}</div>`, { size: 'wide', footer: `<button class="sp-btn ghost" data-close2>${SP.t('Done', 'Imekamilika')}</button>` });
      back.querySelector('[data-close2]').addEventListener('click', () => { SP.closeModal(); if (onChange) onChange(); });
      back.querySelector('#catForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const data = SP.formData(e.target); if (!data.name || !data.name.trim()) return;
        try { await SP.api.post('/categories', data); e.target.reset(); e.target.querySelector('[name=color]').value = '#4F46E5'; refresh(); } catch (err) { SP.fail(err); }
      });
      async function refresh() { const r = await SP.api.get('/categories'); back.querySelector('#catList').innerHTML = r.categories.map(catRow).join('') || `<p class="sp-muted sp-small">${SP.t('No categories yet.', 'Hakuna jamii bado.')}</p>`; wire(); }
      function wire() {
        back.querySelectorAll('[data-del]').forEach((b) => b.addEventListener('click', async () => {
          const ok = await SP.confirm({ title: SP.t('Delete this category?', 'Futa jamii hii?'), message: b.dataset.n > 0 ? SP.t(`${b.dataset.n} product(s) use this category and will become uncategorised.`, `Bidhaa ${b.dataset.n} zinatumia jamii hii na zitakuwa bila jamii.`) : '' });
          if (!ok) return; await SP.api.del(`/categories/${b.dataset.id}`); refresh();
        }));
      }
      wire();
    });
  }
  function catRow(c) { return `<div class="sp-spread"><span class="sp-row"><span style="width:14px;height:14px;border-radius:4px;background:${esc(c.color || '#999')};display:inline-block"></span><b>${esc(c.name)}</b><span class="sp-muted sp-small">(${c.products})</span></span><button class="sp-icon-btn" style="width:30px;height:30px" data-del data-id="${c.id}" data-n="${c.products}" title="${SP.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button></div>`; }

  // =============================================================== profile
  SP.modules.product = async (el, parts) => {
    const id = parts[0];
    const d = await SP.api.get(`/products/${id}`);
    const p = d.product;
    el.innerHTML = `${SP.pageHead(p.name, `${p.sku || SP.t('No code', 'Hakuna nambari')}${p.category_name ? ' · ' + p.category_name : ''}`, `${SP.can('products.manage') ? `<button class="sp-btn ghost" data-act="edit"><i class="fa-solid fa-pen"></i> ${SP.t('Edit', 'Hariri')}</button>` : ''}${SP.can('stock.adjust') && p.track_stock ? `<button class="sp-btn primary" data-act="adjust"><i class="fa-solid fa-boxes-packing"></i> ${SP.t('Adjust Stock', 'Rekebisha Stoo')}</button>` : ''}<a class="sp-btn ghost" href="#products"><i class="fa-solid fa-arrow-left"></i> ${SP.t('Back', 'Rudi')}</a>`)}
      <div class="sp-grid stats" style="margin-bottom:1.1rem">
        ${p.track_stock ? SP.stat('fa-boxes-stacked', SP.num(p.stock_qty), SP.t('In Stock', 'Ipo Stoo'), esc(p.unit), p.stock_state === 'out' ? 'red' : p.stock_state === 'low' ? 'amber' : 'green') : SP.stat('fa-bell-concierge', SP.t('Service', 'Huduma'), SP.t('Type', 'Aina'))}
        ${SP.stat('fa-tag', SP.moneyHtml(p.sell_price), SP.t('Selling Price', 'Bei ya Mauzo'))}
        ${p.cost_price !== undefined ? SP.stat('fa-receipt', SP.moneyHtml(p.cost_price), SP.t('Cost Price', 'Bei ya Ununuzi'), '', 'blue') : SP.stat('fa-circle-check', SP.cap(p.status), SP.t('Status', 'Hali'))}
        ${SP.stat('fa-chart-simple', SP.num(d.sold.qty), SP.t('Total Sold', 'Jumla Iliyouzwa'), SP.moneyHtml(d.sold.revenue))}
      </div>
      <div class="sp-grid split">
        <div class="sp-stack">
          ${p.description ? `<div class="sp-card"><h3 style="margin-bottom:.6rem">${SP.t('Description', 'Maelezo')}</h3><p style="margin:0">${esc(p.description)}</p></div>` : ''}
          ${d.sold.profit !== undefined ? `<div class="sp-card"><h3 style="margin-bottom:.6rem">${SP.t('Profit so far', 'Faida Hadi Sasa')}</h3><div class="sp-stat" style="border:0;box-shadow:none;padding:0"><div class="ico green"><i class="fa-solid fa-chart-line"></i></div><div><div class="val">${SP.moneyHtml(d.sold.profit)}</div><div class="lbl">${SP.t(`From ${SP.num(d.sold.qty)} units sold`, `Kutoka vipande ${SP.num(d.sold.qty)} vilivyouzwa`)}</div></div></div></div>` : ''}
          ${SP.can('products.view') ? '<div class="sp-card" id="qrCard"></div>' : ''}
        </div>
        <div class="sp-stack">
          <div class="sp-card"><div class="th" style="width:100%;aspect-ratio:1.6/1;border-radius:14px;background:var(--sp-primary-50);display:grid;place-items:center;overflow:hidden;color:var(--sp-primary);font-size:2rem;margin-bottom:.8rem">${p.has_image ? `<img src="/api/shop/products/${p.id}/image?v=${SP.state.photoV}" alt="" style="width:100%;height:100%;object-fit:cover">` : '<i class="fa-solid fa-box"></i>'}</div>${SP.can('products.manage') ? `<label class="sp-btn ghost sm block" for="fPhoto"><i class="fa-solid fa-camera"></i> ${p.has_image ? SP.t('Change photo', 'Badilisha picha') : SP.t('Add photo', 'Ongeza picha')}</label><input type="file" id="fPhoto" accept="image/png,image/jpeg,image/webp" class="sp-sr">` : ''}</div>
          ${p.track_stock ? `<div class="sp-card"><div class="sp-card-head"><h3>${SP.t('Stock history', 'Historia ya Stoo')}</h3></div><div id="stockHist">${SP.skeleton(4)}</div></div>` : ''}
        </div>
      </div>`;

    if (SP.can('products.manage')) {
      const input = el.querySelector('#fPhoto');
      if (input) input.addEventListener('change', async () => {
        if (!input.files[0]) return;
        try { const fd = new FormData(); fd.append('photo', await SP.resizeImage(input.files[0])); await SP.api.upload(`/products/${p.id}/image`, fd); SP.state.photoV = Date.now(); SP.toast(SP.t('Photo updated.', 'Picha imesasishwa.')); SP.go(`product/${p.id}`); } catch (e) { SP.fail(e); }
      });
    }
    if (p.track_stock) {
      SP.api.get(`/products/${p.id}/history`).then((h) => {
        el.querySelector('#stockHist').innerHTML = h.moves.length ? SP.table([
          { label: SP.t('Date', 'Tarehe'), render: (m) => SP.dateTime(m.created_at) }, { label: SP.t('Type', 'Aina'), render: (m) => SP.cap(m.type) },
          { label: SP.t('Change', 'Mabadiliko'), cls: 'end', render: (m) => `<span style="color:${m.qty_change < 0 ? 'var(--sp-danger)' : 'var(--sp-ok)'}">${m.qty_change > 0 ? '+' : ''}${SP.num(m.qty_change)}</span>` },
          { label: SP.t('Balance', 'Baki'), cls: 'end', render: (m) => SP.num(m.balance_after) }, { label: SP.t('By', 'Na'), render: (m) => esc(m.user_name || '—') },
        ], h.moves, { cls: 'compact' }) : SP.empty('fa-clock-rotate-left', SP.t('No movements yet', 'Hakuna mabadiliko bado'), '');
      }).catch((e) => { el.querySelector('#stockHist').innerHTML = SP.errorBox(e); });
    }
    if (SP.can('products.view') && SP.qr) SP.qr.mountProductCard(el.querySelector('#qrCard'), p).catch(SP.fail);
    SP.delegate(el, { edit: () => openProductForm(p, () => SP.go(`product/${p.id}`)), adjust: () => openStockAdjust(p, () => SP.go(`product/${p.id}`)) });
  };
})();
