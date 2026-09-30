/* Settings — shop info & logo, payment methods & receipt, roles & permissions, sample data. */
(function () {
  'use strict';
  const SP = window.SP; const esc = SP.esc;

  const TABS = () => [
    { k: 'info', l: SP.t('Shop Information', 'Taarifa za Duka'), i: 'fa-store' },
    { k: 'payments', l: SP.t('Payments & Receipts', 'Malipo na Risiti'), i: 'fa-receipt' },
    { k: 'roles', l: SP.t('Roles & Permissions', 'Majukumu na Ruhusa'), i: 'fa-user-shield' },
    { k: 'data', l: SP.t('Sample Data', 'Data ya Mfano'), i: 'fa-database' },
  ];

  SP.modules.settings = async (el, parts) => {
    const TABLIST = TABS();
    const tab = parts[0] && TABLIST.some((t) => t.k === parts[0]) ? parts[0] : 'info';
    el.innerHTML = `${SP.pageHead(SP.t('Settings', 'Mipangilio'), SP.t('Shop information, payments, roles and starter data', 'Taarifa za duka, malipo, majukumu na data ya awali'))}
      <div class="sp-tabs" id="setTabs">${TABLIST.map((t) => `<button type="button" class="${t.k === tab ? 'on' : ''}" data-t="${t.k}"><i class="fa-solid ${t.i}"></i> ${t.l}</button>`).join('')}</div>
      <div id="setBody">${SP.skeletonPage()}</div>`;
    el.querySelector('#setTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; history.replaceState(null, '', `#settings/${b.dataset.t}`); el.querySelectorAll('#setTabs button').forEach((x) => x.classList.toggle('on', x === b)); renderTab(el.querySelector('#setBody'), b.dataset.t); });
    await renderTab(el.querySelector('#setBody'), tab);
  };

  async function renderTab(box, tab) {
    box.innerHTML = SP.skeletonPage();
    try {
      if (tab === 'info') return renderInfo(box);
      if (tab === 'payments') return renderPayments(box);
      if (tab === 'roles') return renderRoles(box);
      if (tab === 'data') return renderData(box);
    } catch (e) { box.innerHTML = SP.errorBox(e); }
  }

  // ---------------------------------------------------------- shop info
  async function renderInfo(box) {
    const { shop } = await SP.api.get('/shop-info');
    box.innerHTML = `<div class="sp-grid split">
      <div class="sp-card"><h3 style="margin-bottom:.8rem">${SP.t('Logo', 'Nembo')}</h3>
        <div class="sp-row" style="align-items:flex-start;gap:1rem"><div style="width:84px;height:84px;border-radius:18px;overflow:hidden;background:var(--sp-primary-50);display:grid;place-items:center;color:var(--sp-primary);font-weight:800;font-size:1.4rem">${shop.has_logo ? `<img src="${SP.logoUrl(shop.id)}" alt="" style="width:100%;height:100%;object-fit:cover">` : esc((shop.short_name || 'S').slice(0, 2))}</div>
        <div><label class="sp-btn ghost sm" for="fLogo"><i class="fa-solid fa-upload"></i> ${SP.t('Change logo', 'Badilisha nembo')}</label><input type="file" id="fLogo" accept="image/png,image/jpeg,image/webp,image/svg+xml" class="sp-sr"><p class="sp-small sp-muted" style="margin:.4rem 0 0">${SP.t('Shown on receipts, reports and the sidebar.', 'Inaonekana kwenye risiti, ripoti na upande wa menyu.')}</p></div></div></div>
      <div class="sp-card"><form class="sp-form" id="infoForm" novalidate><div class="sp-form-error" role="alert"></div>
        <div class="cols">${SP.f.input('name', SP.t('Shop name', 'Jina la duka'), { required: true, value: shop.name })}${SP.f.input('short_name', SP.t('Short name', 'Jina fupi'), { required: true, value: shop.short_name, hint: SP.t('Shown on the logo badge, up to 8 letters', 'Inaonekana kwenye nembo, hadi herufi 8'), attr: { maxlength: 8 } })}</div>
        <div class="cols">${SP.f.input('phone', SP.t('Phone', 'Simu'), { type: 'tel', value: shop.phone })}${SP.f.input('email', SP.t('Email', 'Barua pepe'), { type: 'email', value: shop.email })}</div>
        ${SP.f.input('address', SP.t('Address', 'Anwani'), { value: shop.address })}
        <div class="cols">${SP.f.input('website', SP.t('Website (optional)', 'Tovuti (si lazima)'), { value: shop.website })}${SP.f.input('tax_no', SP.t('Tax / TIN number (optional)', 'Namba ya TIN (si lazima)'), { value: shop.tax_no })}</div>
        <div class="cols-3">${SP.f.input('currency', SP.t('Currency code', 'Nambari ya Sarafu'), { required: true, value: shop.currency, attr: { maxlength: 6 } })}${SP.f.input('tax_rate', SP.t('VAT rate %', 'Kiwango cha Kodi %'), { type: 'number', value: shop.tax_rate, hint: SP.t('0 = no VAT added at the till', '0 = hakuna kodi inayoongezwa'), attr: { min: 0, max: 100, step: '0.01' } })}<div class="sp-field"><label>${SP.t('Brand colour', 'Rangi ya Chapa')}</label><input type="color" class="sp-input" name="primary_color" value="${shop.primary_color}" style="height:42px;padding:3px"></div></div>
        ${SP.f.textarea('receipt_note', SP.t('Extra note on receipts (optional)', 'Maelezo ya ziada kwenye risiti (si lazima)'), { value: shop.receipt_note, rows: 2 })}
        <button class="sp-btn primary" type="submit">${SP.t('Save changes', 'Hifadhi Mabadiliko')}</button></form></div></div>`;
    box.querySelector('#fLogo').addEventListener('change', async (e) => {
      if (!e.target.files[0]) return;
      try { const fd = new FormData(); fd.append('logo', await SP.resizeImage(e.target.files[0], 400)); await SP.api.upload('/shop-info/logo', fd); SP.state.photoV = Date.now(); SP.toast(SP.t('Logo updated.', 'Nembo imesasishwa.')); SP.go('settings/info'); } catch (err) { SP.fail(err); }
    });
    const form = box.querySelector('#infoForm');
    const saveLabel = SP.t('Save changes', 'Hifadhi Mabadiliko');
    form.addEventListener('submit', async (e) => {
      e.preventDefault(); if (!SP.validate(form)) return;
      const btn = form.querySelector('button'); btn.disabled = true; btn.innerHTML = `<span class="sp-spin"></span> ${SP.t('Saving…', 'Inahifadhi…')}`;
      try { await SP.api.put('/shop-info', SP.formData(form)); SP.state.shop = { ...SP.state.shop, ...SP.formData(form) }; SP.setBrand(SP.formData(form).primary_color); SP.toast(SP.t('Shop information saved.', 'Taarifa za duka zimehifadhiwa.')); }
      catch (err) { const b = form.querySelector('.sp-form-error'); b.textContent = err.message; b.classList.add('show'); }
      finally { btn.disabled = false; btn.textContent = saveLabel; }
    });
  }

  // ---------------------------------------------------------- payments & receipts
  async function renderPayments(box) {
    const { shop, settings } = await SP.api.get('/shop-info');
    box.innerHTML = `<div class="sp-grid split">
      <div class="sp-card"><h3 style="margin-bottom:.7rem">${SP.t('Payment methods', 'Njia za Malipo')}</h3><p class="sp-small sp-muted" style="margin-top:0">${SP.t('Shown at the till and when receiving customer payments.', 'Zinaonekana kwenye mauzo na wakati wa kupokea malipo ya wateja.')}</p>
        <div class="sp-list" id="methodList">${settings.payment_methods.map((m, i) => `<div class="sp-spread"><input class="sp-input" data-i="${i}" value="${esc(m)}" style="max-width:220px"><button class="sp-icon-btn" style="width:30px;height:30px" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}</div>
        <button class="sp-btn ghost sm" id="addMethod" style="margin-top:.6rem"><i class="fa-solid fa-plus"></i> ${SP.t('Add method', 'Ongeza njia')}</button>
        <button class="sp-btn primary" id="saveMethods" style="margin-top:1rem;display:block">${SP.t('Save payment methods', 'Hifadhi Njia za Malipo')}</button></div>
      <div class="sp-stack">
        <div class="sp-card"><h3 style="margin-bottom:.7rem">${SP.t('Numbering & receipt', 'Namba na Risiti')}</h3><form class="sp-form" id="numForm">
          <div class="cols">${SP.f.input('receipt_prefix', SP.t('Receipt prefix', 'Kiambishi cha Risiti'), { value: settings.receipt_prefix, hint: 'e.g. RCT → RCT-000123' })}${SP.f.input('customer_prefix', SP.t('Customer number prefix', 'Kiambishi cha Namba ya Mteja'), { value: settings.customer_prefix, hint: 'e.g. C → C-0001' })}</div>
          ${SP.f.textarea('receipt_footer', SP.t('Receipt footer message', 'Ujumbe wa Chini wa Risiti'), { value: settings.receipt_footer, rows: 2 })}
          ${SP.f.input('loyalty_rate', SP.t('Loyalty: currency spent per point', 'Uaminifu: fedha kwa kila pointi'), { type: 'number', value: settings.loyalty_rate, hint: SP.t('0 turns loyalty points off', '0 huzima pointi za uaminifu'), attr: { min: 0, step: '1' } })}
          ${SP.f.check('allow_negative_stock', SP.t('Allow selling when stock would go below zero', 'Ruhusu kuuza hata stoo ikipungua chini ya sifuri'), settings.allow_negative_stock)}
          <button class="sp-btn primary" type="submit">${SP.t('Save', 'Hifadhi')}</button></form></div>
        <div class="sp-card"><h3 style="margin-bottom:.7rem">${SP.t('Expense categories', 'Jamii za Matumizi')}</h3>
          <div class="sp-list" id="catExpList">${settings.expense_categories.map((c, i) => `<div class="sp-spread"><input class="sp-input" data-i="${i}" value="${esc(c)}" style="max-width:220px"><button class="sp-icon-btn" style="width:30px;height:30px" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join('')}</div>
          <button class="sp-btn ghost sm" id="addExpCat" style="margin-top:.6rem"><i class="fa-solid fa-plus"></i> ${SP.t('Add category', 'Ongeza jamii')}</button>
          <button class="sp-btn primary" id="saveExpCats" style="margin-top:1rem;display:block">${SP.t('Save expense categories', 'Hifadhi Jamii za Matumizi')}</button></div>
      </div></div>`;

    function wireList(listId, addId, saveId, key, label) {
      const list = box.querySelector(listId);
      const render = (items) => { list.innerHTML = items.map((m, i) => `<div class="sp-spread"><input class="sp-input" data-i="${i}" value="${esc(m)}" style="max-width:220px"><button class="sp-icon-btn" style="width:30px;height:30px" data-rm="${i}"><i class="fa-solid fa-xmark"></i></button></div>`).join(''); };
      const read = () => Array.from(list.querySelectorAll('input')).map((i) => i.value.trim()).filter(Boolean);
      list.addEventListener('click', (e) => { const b = e.target.closest('[data-rm]'); if (!b) return; const items = read(); items.splice(Number(b.dataset.rm), 1); render(items); });
      box.querySelector(addId).addEventListener('click', () => { const items = read(); items.push(''); render(items); list.lastElementChild.querySelector('input').focus(); });
      box.querySelector(saveId).addEventListener('click', async () => {
        const items = read(); if (!items.length) { SP.toast(SP.t(`Add at least one ${label}.`, `Ongeza angalau ${label} moja.`), 'warn'); return; }
        try { await SP.api.put('/settings', { [key]: items }); SP.state.settings[key] = items; SP.toast(SP.t('Saved.', 'Imehifadhiwa.')); } catch (e) { SP.fail(e); }
      });
    }
    wireList('#methodList', '#addMethod', '#saveMethods', 'payment_methods', SP.t('payment method', 'njia ya malipo'));
    wireList('#catExpList', '#addExpCat', '#saveExpCats', 'expense_categories', SP.t('category', 'jamii'));

    const numForm = box.querySelector('#numForm');
    numForm.addEventListener('submit', async (e) => {
      e.preventDefault(); const btn = numForm.querySelector('button'); btn.disabled = true;
      try { const r = await SP.api.put('/settings', SP.formData(numForm)); SP.state.settings = { ...SP.state.settings, ...r.settings }; SP.toast(SP.t('Saved.', 'Imehifadhiwa.')); } catch (err) { SP.fail(err); } finally { btn.disabled = false; }
    });
  }

  // ---------------------------------------------------------- roles & permissions
  async function renderRoles(box) {
    if (!SP.can('settings.manage')) { box.innerHTML = SP.empty('fa-lock', SP.t('Owners only', 'Wamiliki Pekee'), SP.t('Ask the shop owner to change roles and permissions.', 'Muombe mmiliki wa duka abadilishe majukumu na ruhusa.')); return; }
    const { catalogue, matrix } = await SP.api.get('/permissions');
    const groups = [...new Set(catalogue.map((p) => p.group))];
    box.innerHTML = `<div class="sp-card"><p class="sp-small sp-muted" style="margin-top:0">${SP.t('Owners can always do everything. Choose what', 'Wamiliki wanaweza kufanya kila kitu daima. Chagua kile ambacho')} <b>${SP.t('Managers', 'Wasimamizi')}</b> ${SP.t('and', 'na')} <b>${SP.t('Cashiers', 'Makarani wa Fedha')}</b> ${SP.t('may do — changes apply the next time they open a page.', 'wanaweza kufanya — mabadiliko yataanza mara wafunguapo ukurasa.')}</p>
      <div class="sp-tabs" id="roleTabs"><button class="on" data-r="manager">${SP.t('Manager', 'Meneja')}</button><button data-r="cashier">${SP.t('Cashier', 'Karani wa Fedha')}</button></div>
      <div id="permBody"></div><button class="sp-btn primary" id="savePerms" style="margin-top:1rem">${SP.t('Save permissions', 'Hifadhi Ruhusa')}</button></div>`;
    let role = 'manager'; let selected = new Set(matrix[role]);
    function draw() {
      box.querySelector('#permBody').innerHTML = groups.map((g) => `<div class="sp-section-title" style="margin-top:1rem"><i class="fa-solid fa-layer-group"></i> ${esc(g)}</div><div class="sp-perm-grid">${catalogue.filter((p) => p.group === g).map((p) => `<label class="sp-check"><input type="checkbox" value="${p.key}" ${selected.has(p.key) ? 'checked' : ''}> ${esc(p.label)}</label>`).join('')}</div>`).join('');
    }
    draw();
    box.querySelector('#roleTabs').addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; role = b.dataset.r; selected = new Set(matrix[role]); box.querySelectorAll('#roleTabs button').forEach((x) => x.classList.toggle('on', x === b)); draw(); });
    box.querySelector('#permBody').addEventListener('change', (e) => { if (e.target.type !== 'checkbox') return; if (e.target.checked) selected.add(e.target.value); else selected.delete(e.target.value); matrix[role] = [...selected]; });
    box.querySelector('#savePerms').addEventListener('click', async () => {
      const btn = box.querySelector('#savePerms'); btn.disabled = true; btn.innerHTML = `<span class="sp-spin"></span> ${SP.t('Saving…', 'Inahifadhi…')}`;
      try { await SP.api.put('/permissions', { role, permissions: [...selected] }); SP.toast(SP.t(`${SP.cap(role)} permissions saved.`, `Ruhusa za ${SP.cap(role)} zimehifadhiwa.`)); } catch (e) { SP.fail(e); } finally { btn.disabled = false; btn.innerHTML = SP.t('Save permissions', 'Hifadhi Ruhusa'); }
    });
  }

  // ---------------------------------------------------------- sample data
  async function renderData(box) {
    if (!SP.can('settings.manage')) { box.innerHTML = SP.empty('fa-lock', SP.t('Owners only', 'Wamiliki Pekee'), ''); return; }
    box.innerHTML = `<div class="sp-grid split">
      <div class="sp-card"><h3 style="margin-bottom:.5rem"><i class="fa-solid fa-database"></i> ${SP.t('Load sample data', 'Pakia Data ya Mfano')}</h3><p class="sp-muted">${SP.t('Adds sample customers, products and 30 days of sales so you can explore Smart21Shop before entering your real data. Only works on an empty shop.', 'Inaongeza wateja wa mfano, bidhaa na mauzo ya siku 30 ili uweze kuchunguza Smart21Shop kabla ya kuweka data yako halisi. Inafanya kazi kwenye duka tupu tu.')}</p><button class="sp-btn primary" id="loadDemo"><i class="fa-solid fa-wand-magic-sparkles"></i> ${SP.t('Load sample data', 'Pakia Data ya Mfano')}</button></div>
      <div class="sp-card"><h3 style="margin-bottom:.5rem;color:var(--sp-danger)"><i class="fa-solid fa-triangle-exclamation"></i> ${SP.t('Reset shop data', 'Weka Upya Data ya Duka')}</h3><p class="sp-muted">${SP.t('Permanently deletes every customer, product, sale and expense in this shop. Your shop settings and staff logins are kept.', 'Inafuta kabisa kila mteja, bidhaa, mauzo na matumizi katika duka hili. Mipangilio ya duka na akaunti za wafanyakazi zitabaki.')}</p><button class="sp-btn danger-ghost" id="resetShop"><i class="fa-solid fa-eraser"></i> ${SP.t('Reset shop data', 'Weka Upya Data ya Duka')}</button></div>
    </div>`;
    box.querySelector('#loadDemo').addEventListener('click', async () => {
      const ok = await SP.confirm({ title: SP.t('Load sample data?', 'Pakia data ya mfano?'), danger: false, message: SP.t('This adds sample customers, products and sales to explore the app.', 'Hii inaongeza wateja wa mfano, bidhaa na mauzo kuchunguza programu.') });
      if (!ok) return;
      const btn = box.querySelector('#loadDemo'); btn.disabled = true; btn.innerHTML = `<span class="sp-spin"></span> ${SP.t('Loading…', 'Inapakia…')}`;
      try { const r = await SP.api.post('/demo-data'); SP.toast(SP.t(`Sample data loaded: ${r.customers} customers, ${r.products} products, ${r.sales} sales.`, `Data ya mfano imepakiwa: wateja ${r.customers}, bidhaa ${r.products}, mauzo ${r.sales}.`)); SP.refreshLookups(); }
      catch (e) { SP.fail(e); } finally { btn.disabled = false; btn.innerHTML = `<i class="fa-solid fa-wand-magic-sparkles"></i> ${SP.t('Load sample data', 'Pakia Data ya Mfano')}`; }
    });
    box.querySelector('#resetShop').addEventListener('click', () => {
      SP.formModal({ title: SP.t('Reset shop data', 'Weka Upya Data ya Duka'), submit: SP.t('Delete everything', 'Futa Kila Kitu'), danger: true,
        body: `<div class="sp-alert bad"><i class="fa-solid fa-triangle-exclamation"></i><div>${SP.t('This deletes every customer, product, sale and expense. This <b>cannot be undone</b>.', 'Hii inafuta kila mteja, bidhaa, mauzo na matumizi. Hili <b>haliwezi kutenduliwa</b>.')}</div></div>${SP.f.input('confirm', SP.t('Type RESET to confirm', 'Andika RESET kuthibitisha'), { required: true, placeholder: 'RESET' })}`,
        onSubmit: async (data) => { await SP.api.post('/reset-data', data); SP.closeModal(); SP.toast(SP.t('Shop data has been reset.', 'Data ya duka imewekwa upya.')); SP.refreshLookups(); },
      });
    });
  }
})();
