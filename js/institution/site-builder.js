/* Smart21Institution — Website builder and online applications (screens inside the app).
   Needs js/institution/site-render.js (S21Site) for block definitions and the live preview.
   Screens: #website (pages, news & events, media, design) · #site-page/<id> (block editor) · #applications */
(function () {
  'use strict';
  const IN = window.IN; const S = window.S21Site; const esc = IN.esc;
  const tr = (pair) => (Array.isArray(pair) ? IN.t(pair[0], pair[1]) : pair);
  const slugify = (s) => String(s || '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  const siteUrl = (slug, page) => `${location.origin}/s/${encodeURIComponent(slug)}${page && page !== 'home' ? '/' + encodeURIComponent(page) : ''}`;

  // ------------------------------------------------------------ image picker (own overlay, so it can open on top of a form)
  function pickImage(current) {
    return new Promise((resolve) => {
      const back = document.createElement('div'); back.className = 'in-modal-back'; back.id = 'inPick'; back.style.zIndex = 1200;
      back.innerHTML = `<div class="in-modal lg" role="dialog" aria-modal="true"><div class="in-modal-head"><h3>${IN.t('Choose a picture', 'Chagua picha')}</h3><button class="in-icon-btn" data-x aria-label="${IN.t('Close', 'Funga')}"><i class="fa-solid fa-xmark"></i></button></div>
        <div class="in-modal-body"><div class="in-row" style="gap:.6rem;flex-wrap:wrap;margin-bottom:.9rem"><label class="in-btn primary sm" for="pkFile"><i class="fa-solid fa-upload"></i> ${IN.t('Upload new picture', 'Pakia picha mpya')}</label><input type="file" id="pkFile" accept="image/png,image/jpeg,image/webp" class="in-sr">
        <input class="in-input" id="pkUrl" placeholder="${IN.t('…or paste a picture address (https://)', '…au bandika anwani ya picha (https://)')}" style="flex:1;min-width:220px"><button class="in-btn ghost sm" id="pkUse">${IN.t('Use address', 'Tumia anwani')}</button></div>
        <div id="pkGrid" class="in-pick-grid">${IN.t('Loading…', 'Inapakia…')}</div></div></div>`;
      document.body.appendChild(back);
      const done = (v) => { back.remove(); resolve(v); };
      back.addEventListener('mousedown', (e) => { if (e.target === back) done(null); });
      back.querySelector('[data-x]').addEventListener('click', () => done(null));
      const grid = back.querySelector('#pkGrid');
      const load = async () => {
        const { media } = await IN.api.get('/site/media?limit=60');
        grid.innerHTML = media.length ? media.map((m) => `<button type="button" class="in-pick ${current === 'm:' + m.id ? 'on' : ''}" data-ref="m:${m.id}"><img src="/api/institution/site/media/${m.id}/file" alt="${esc(m.alt || '')}" loading="lazy"></button>`).join('') : `<div class="in-muted">${IN.t('No pictures yet. Upload your first one.', 'Hakuna picha bado. Pakia ya kwanza.')}</div>`;
      };
      load().catch(IN.fail);
      grid.addEventListener('click', (e) => { const b = e.target.closest('[data-ref]'); if (b) done(b.dataset.ref); });
      back.querySelector('#pkUse').addEventListener('click', () => { const v = back.querySelector('#pkUrl').value.trim(); if (!/^https:\/\//i.test(v)) { IN.toast(IN.t('The address must start with https://', 'Anwani lazima ianze na https://'), 'error'); return; } done(v); });
      back.querySelector('#pkFile').addEventListener('change', async (e) => {
        const f = e.target.files[0]; if (!f) return;
        try { const fd = new FormData(); fd.append('image', await IN.resizeImage(f, 1600)); const r = await IN.api.upload('/site/media', fd); done(r.ref); } catch (err) { IN.fail(err); }
      });
    });
  }
  IN.pickSiteImage = pickImage;
  const thumb = (ref) => (ref ? `<img src="${esc(S.imgUrl({ preview: true, slug: IN.state.inst.slug }, ref))}" alt="" onerror="this.style.visibility='hidden'">` : '<i class="fa-regular fa-image"></i>');

  // ============================================================ #website
  IN.modules.website = async (el) => {
    const [cfg, { pages }] = await Promise.all([IN.api.get('/site/config'), IN.api.get('/site/pages')]);
    const st = { tab: (sessionStorage.getItem('in-site-tab') || 'pages') };
    const tabs = [['pages', IN.t('Pages', 'Kurasa')], ['posts', IN.t('News & events', 'Habari na matukio')], ['media', IN.t('Pictures', 'Picha')], ['design', IN.t('Design & settings', 'Muonekano na mipangilio')]];
    const open = cfg.enabled ? `<a class="in-btn ghost" href="${siteUrl(cfg.slug)}" target="_blank" rel="noopener"><i class="fa-solid fa-arrow-up-right-from-square"></i> ${IN.t('Open website', 'Fungua tovuti')}</a>` : '';
    el.innerHTML = `${IN.pageHead(IN.t('Website', 'Tovuti'), IN.t('Build and publish your institution website — pages, news, pictures and online registration.', 'Jenga na uchapishe tovuti ya taasisi yako — kurasa, habari, picha na usajili mtandaoni.'), `${IN.chip(cfg.enabled ? 'active' : 'archived', cfg.enabled ? IN.t('Website is live', 'Tovuti iko hewani') : IN.t('Not published', 'Haijachapishwa'))}${open}`)}
      <div id="siteBanner"></div><div class="in-tabs" id="siteTabs">${tabs.map((t) => `<button data-tab="${t[0]}" class="${st.tab === t[0] ? 'on' : ''}">${t[1]}</button>`).join('')}</div><div id="siteBody"></div>`;
    if (cfg.enabled) el.querySelector('#siteBanner').innerHTML = `<div class="in-alert info" style="margin-bottom:1rem"><i class="fa-solid fa-globe"></i><div>${IN.t('Your website address:', 'Anwani ya tovuti yako:')} <b>${esc(siteUrl(cfg.slug))}</b></div></div>`;
    const body = el.querySelector('#siteBody');

    const draw = async () => {
      sessionStorage.setItem('in-site-tab', st.tab);
      el.querySelectorAll('#siteTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
      body.innerHTML = IN.skeleton(4);
      try { await ({ pages: drawPages, posts: drawPosts, media: drawMedia, design: drawDesign })[st.tab](); } catch (e) { body.innerHTML = IN.errorBox(e); }
    };
    el.querySelector('#siteTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { st.tab = b.dataset.tab; draw(); } });

    // ---- Pages
    async function drawPages() {
      const { pages: list } = await IN.api.get('/site/pages');
      if (!list.length) {
        body.innerHTML = `<div class="in-card">${IN.empty('fa-wand-magic-sparkles', IN.t('Start with a ready-made website', 'Anza na tovuti iliyotayarishwa'), IN.t('One click creates Home, About, Programmes, Library, News, Apply and Contact pages from your institution details. You can then change anything.', 'Mbofyo mmoja huunda kurasa za Mwanzo, Kuhusu, Programu, Maktaba, Habari, Omba na Mawasiliano kutoka taarifa za taasisi yako. Kisha unaweza kubadilisha chochote.'), `<button class="in-btn primary" data-act="starter"><i class="fa-solid fa-wand-magic-sparkles"></i> ${IN.t('Create starter website', 'Tengeneza tovuti ya kuanzia')}</button> <button class="in-btn ghost" data-act="newpage">${IN.t('Or start with a blank page', 'Au anza na ukurasa mtupu')}</button>`)}</div>`;
        return;
      }
      const byId = Object.fromEntries(list.map((p) => [p.id, p]));
      body.innerHTML = `<div class="in-card"><div class="in-spread" style="margin-bottom:.8rem"><span class="in-muted in-small">${IN.t('Pages marked "In menu" appear in the top menu of your website.', 'Kurasa zenye "Kwenye menyu" huonekana kwenye menyu ya juu ya tovuti.')}</span><button class="in-btn primary" data-act="newpage"><i class="fa-solid fa-plus"></i> ${IN.t('New page', 'Ukurasa mpya')}</button></div>${IN.table([
        { label: IN.t('Page', 'Ukurasa'), render: (p) => `<b>${esc(p.title)}</b>${p.parent_id && byId[p.parent_id] ? `<div class="in-small in-muted">↳ ${esc(byId[p.parent_id].title)}</div>` : ''}` },
        { label: IN.t('Address', 'Anwani'), render: (p) => `<code>/s/${esc(cfg.slug)}${p.slug === 'home' ? '' : '/' + esc(p.slug)}</code>` },
        { label: IN.t('Menu', 'Menyu'), render: (p) => (p.show_in_menu ? IN.t('In menu', 'Kwenye menyu') : '—') },
        { label: IN.t('Status', 'Hali'), render: (p) => IN.chip(p.published ? 'active' : 'archived', p.published ? IN.t('Published', 'Imechapishwa') : IN.t('Draft', 'Rasimu')) },
        { label: '', cls: 'in-right', render: (p) => `<a class="in-btn primary sm" href="#site-page/${p.id}"><i class="fa-solid fa-pen"></i> ${IN.t('Edit', 'Hariri')}</a> ${cfg.enabled && p.published ? `<a class="in-btn ghost sm" target="_blank" rel="noopener" href="${siteUrl(cfg.slug, p.slug)}" aria-label="${IN.t('Open', 'Fungua')}"><i class="fa-solid fa-arrow-up-right-from-square"></i></a>` : ''} ${p.slug === 'home' ? '' : `<button class="in-btn danger-ghost sm" data-act="delpage" data-id="${p.id}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button>`}` },
      ], list)}</div>`;
    }

    // ---- News & events
    async function drawPosts() {
      const { posts } = await IN.api.get('/site/posts?limit=50');
      body.innerHTML = `<div class="in-card"><div class="in-spread" style="margin-bottom:.8rem"><span class="in-muted in-small">${IN.t('News and events shown on your website (use the "Latest news" and "Events" blocks on a page).', 'Habari na matukio yanayoonyeshwa kwenye tovuti (tumia vipengele vya "Habari mpya" na "Matukio" kwenye ukurasa).')}</span><button class="in-btn primary" data-act="newpost"><i class="fa-solid fa-plus"></i> ${IN.t('New item', 'Kipengee kipya')}</button></div>${IN.table([
        { label: IN.t('Title', 'Kichwa'), render: (p) => `<b>${esc(p.title)}</b>` },
        { label: IN.t('Type', 'Aina'), render: (p) => (p.kind === 'event' ? IN.t('Event', 'Tukio') : IN.t('News', 'Habari')) },
        { label: IN.t('Date', 'Tarehe'), render: (p) => IN.date(p.kind === 'event' ? p.starts_on : p.published_on) },
        { label: IN.t('Status', 'Hali'), render: (p) => IN.chip(p.published ? 'active' : 'archived', p.published ? IN.t('Published', 'Imechapishwa') : IN.t('Draft', 'Rasimu')) },
        { label: '', cls: 'in-right', render: (p) => `<button class="in-btn ghost sm" data-act="editpost" data-id="${p.id}"><i class="fa-solid fa-pen"></i></button> <button class="in-btn danger-ghost sm" data-act="delpost" data-id="${p.id}"><i class="fa-solid fa-trash"></i></button>` },
      ], posts, { empty: IN.empty('fa-newspaper', IN.t('Nothing posted yet', 'Hakuna kilichowekwa'), IN.t('Add your first news item or event.', 'Weka habari au tukio la kwanza.')) })}</div>`;
    }
    async function postForm(id) {
      const p = id ? (await IN.api.get(`/site/posts/${id}`)).post : { kind: 'news', published: 1, published_on: IN.today() };
      let image = p.image_id ? 'm:' + p.image_id : '';
      IN.formModal({ title: id ? IN.t('Edit item', 'Hariri kipengee') : IN.t('New news or event', 'Habari au tukio jipya'), size: 'lg', submit: IN.t('Save', 'Hifadhi'),
        body: `<div class="cols">${IN.f.select('kind', IN.t('Type', 'Aina'), [['news', IN.t('News', 'Habari')], ['event', IN.t('Event', 'Tukio')]], { value: p.kind, noBlank: true })}${IN.f.input('published_on', IN.t('Publish date', 'Tarehe ya kuchapisha'), { type: 'date', value: p.published_on })}</div>${IN.f.input('title', IN.t('Title', 'Kichwa'), { required: true, value: p.title })}${IN.f.textarea('summary', IN.t('Short summary (shown on cards)', 'Muhtasari mfupi (huonekana kwenye kadi)'), { value: p.summary || '', rows: 2 })}${IN.f.textarea('body', IN.t('Full text', 'Maelezo kamili'), { value: p.body || '', rows: 7 })}
        <div class="cols">${IN.f.input('starts_on', IN.t('Event starts', 'Tukio linaanza'), { type: 'date', value: p.starts_on || '' })}${IN.f.input('ends_on', IN.t('Event ends', 'Tukio linaisha'), { type: 'date', value: p.ends_on || '' })}</div>${IN.f.input('location', IN.t('Place', 'Mahali'), { value: p.location || '' })}
        <div class="in-field"><label>${IN.t('Picture', 'Picha')}</label><div class="in-row" style="gap:.7rem"><span class="in-thumb" id="pImg">${thumb(image)}</span><button type="button" class="in-btn ghost sm" id="pPick">${IN.t('Choose picture', 'Chagua picha')}</button><button type="button" class="in-btn ghost sm" id="pClear">${IN.t('Remove', 'Ondoa')}</button></div></div>${IN.f.check('published', IN.t('Show on the website', 'Onyesha kwenye tovuti'), !!p.published)}`,
        onOpen: (form) => {
          form.querySelector('#pPick').addEventListener('click', async () => { const r = await pickImage(image); if (r && /^m:/.test(r)) { image = r; form.querySelector('#pImg').innerHTML = thumb(image); } else if (r) IN.toast(IN.t('For news, please upload the picture.', 'Kwa habari, tafadhali pakia picha.'), 'warn'); });
          form.querySelector('#pClear').addEventListener('click', () => { image = ''; form.querySelector('#pImg').innerHTML = thumb(''); });
        },
        onSubmit: async (d) => {
          const body = { ...d, image_id: image ? Number(image.slice(2)) : null, starts_on: d.starts_on || null, ends_on: d.ends_on || null };
          if (id) await IN.api.put(`/site/posts/${id}`, body); else await IN.api.post('/site/posts', body);
          IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); draw();
        } });
    }

    // ---- Media
    async function drawMedia() {
      const { media } = await IN.api.get('/site/media?limit=60');
      body.innerHTML = `<div class="in-card"><div class="in-spread" style="margin-bottom:.8rem"><span class="in-muted in-small">${IN.t('Pictures you can use on pages and news. PNG, JPG or WEBP up to 3 MB.', 'Picha unazoweza kutumia kwenye kurasa na habari. PNG, JPG au WEBP hadi MB 3.')}</span><label class="in-btn primary" for="mUp"><i class="fa-solid fa-upload"></i> ${IN.t('Upload picture', 'Pakia picha')}</label><input type="file" id="mUp" accept="image/png,image/jpeg,image/webp" class="in-sr" multiple></div>
        ${media.length ? `<div class="in-pick-grid">${media.map((m) => `<div class="in-pick"><img src="/api/institution/site/media/${m.id}/file" alt="${esc(m.alt || '')}" loading="lazy"><button class="in-btn danger sm" data-act="delmedia" data-id="${m.id}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button></div>`).join('')}</div>` : IN.empty('fa-images', IN.t('No pictures yet', 'Hakuna picha bado'), IN.t('Upload logos, building photos, events…', 'Pakia nembo, picha za majengo, matukio…'))}</div>`;
      body.querySelector('#mUp').addEventListener('change', async (e) => {
        try { for (const f of e.target.files) { const fd = new FormData(); fd.append('image', await IN.resizeImage(f, 1600)); await IN.api.upload('/site/media', fd); } IN.toast(IN.t('Uploaded.', 'Imepakiwa.')); draw(); } catch (err) { IN.fail(err); }
      });
    }

    // ---- Design & settings
    async function drawDesign() {
      const c = await IN.api.get('/site/config'); const th = c.theme || {}; const h = c.header || {}; const f = c.footer || {};
      body.innerHTML = `<form class="in-form" id="dsForm" novalidate><div class="in-grid cols-2">
        <div class="in-card"><h3>${IN.t('Publishing', 'Kuchapisha')}</h3>${IN.f.check('enabled', `<b>${IN.t('Website is live', 'Tovuti iko hewani')}</b> — ${IN.t('visitors can open it at', 'wageni wanaweza kuifungua kwenye')} <code>/s/${esc(c.slug)}</code>`, c.enabled)}<div style="height:.6rem"></div>${IN.f.check('catalogue_public', IN.t('Make the library catalogue public (needed for the library block and online catalogue)', 'Fanya katalogi ya maktaba iwe ya umma (inahitajika kwa kipengele cha maktaba na katalogi mtandaoni)'), c.catalogue_public)}</div>
        <div class="in-card"><h3>${IN.t('Look & feel', 'Muonekano')}</h3><div class="cols"><div class="in-field"><label>${IN.t('Main colour', 'Rangi kuu')}</label><input class="in-input" type="color" name="primary" value="${esc(th.primary || c.primary_color || '#0F766E')}" style="height:42px;padding:3px"></div><div class="in-field"><label>${IN.t('Accent colour', 'Rangi ya pili')}</label><input class="in-input" type="color" name="accent" value="${esc(th.accent || '#F59E0B')}" style="height:42px;padding:3px"></div></div>
          <div class="cols">${IN.f.select('font', IN.t('Font style', 'Mtindo wa herufi'), [['sans', IN.t('Clean (sans-serif)', 'Safi (sans-serif)')], ['serif', IN.t('Classic (serif)', 'Kawaida (serif)')], ['rounded', IN.t('Friendly (rounded)', 'Rafiki (rounded)')]], { value: th.font || 'sans', noBlank: true })}${IN.f.select('radius', IN.t('Corners', 'Pembe'), [['sharp', IN.t('Sharp', 'Kali')], ['soft', IN.t('Soft', 'Laini')], ['round', IN.t('Round', 'Duara')]], { value: th.radius || 'soft', noBlank: true })}</div></div>
        <div class="in-card"><h3>${IN.t('Header', 'Kichwa cha tovuti')}</h3>${IN.f.input('topbar_text', IN.t('Top bar text (leave empty to show phone & email)', 'Maandishi ya juu (acha tupu kuonyesha simu na barua pepe)'), { value: h.topbar_text || '' })}${IN.f.check('show_apply', IN.t('Show an "Apply" button in the menu', 'Onyesha kitufe cha "Omba nafasi" kwenye menyu'), !!h.show_apply)}<div class="cols">${IN.f.input('apply_label', IN.t('Button text', 'Maandishi ya kitufe'), { value: h.apply_label || '' })}${IN.f.input('apply_link', IN.t('Button link (default: Apply page)', 'Kiungo (chaguo-msingi: ukurasa wa Omba)'), { value: h.apply_link || '' })}</div>${IN.f.check('show_library', IN.t('Show "Catalogue" in the menu', 'Onyesha "Katalogi" kwenye menyu'), h.show_library !== false)}</div>
        <div class="in-card"><h3>${IN.t('Footer', 'Chini ya tovuti')}</h3>${IN.f.textarea('footer_text', IN.t('Footer text', 'Maandishi ya chini'), { value: f.text || '', rows: 2 })}${IN.f.textarea('footer_links', IN.t('Extra links (one per line: Label | /s/page or https://…)', 'Viungo vya ziada (kimoja kwa mstari: Jina | /s/ukurasa au https://…)'), { value: (f.links || []).map((l) => `${l.label} | ${l.link}`).join('\n'), rows: 3 })}${IN.f.textarea('footer_socials', IN.t('Social media (one per line: facebook | https://… — also instagram, x, youtube, linkedin, whatsapp, tiktok)', 'Mitandao ya kijamii (mmoja kwa mstari: facebook | https://… — pia instagram, x, youtube, linkedin, whatsapp, tiktok)'), { value: (f.socials || []).map((l) => `${l.kind} | ${l.url}`).join('\n'), rows: 3 })}</div></div>
        <div class="in-row" style="margin-top:1rem"><button class="in-btn primary" type="submit">${IN.t('Save settings', 'Hifadhi mipangilio')}</button></div></form>`;
      body.querySelector('#dsForm').addEventListener('submit', async (e) => {
        e.preventDefault(); const d = IN.formData(e.target);
        const lines = (v) => String(v || '').split('\n').map((x) => x.split('|').map((y) => y.trim())).filter((x) => x[0] && x[1]);
        try {
          await IN.api.put('/site/config', { enabled: d.enabled, catalogue_public: d.catalogue_public, theme: { primary: d.primary, accent: d.accent, font: d.font, radius: d.radius },
            header: { topbar_text: d.topbar_text, show_apply: d.show_apply, apply_label: d.apply_label, apply_link: d.apply_link, show_library: d.show_library },
            footer: { text: d.footer_text, links: lines(d.footer_links).map((x) => ({ label: x[0], link: x[1] })), socials: lines(d.footer_socials).map((x) => ({ kind: x[0].toLowerCase(), url: x[1] })) } });
          IN.toast(IN.t('Settings saved.', 'Mipangilio imehifadhiwa.')); IN.route();
        } catch (err) { IN.fail(err); }
      });
    }

    IN.delegate(el, {
      starter: async (b) => { b.disabled = true; try { const r = await IN.api.post('/site/starter', { lang: IN.lang() }); IN.toast(IN.t(`${r.created} pages created.`, `Kurasa ${r.created} zimeundwa.`)); IN.route(); } catch (e) { b.disabled = false; throw e; } },
      newpage: () => IN.formModal({ title: IN.t('New page', 'Ukurasa mpya'), submit: IN.t('Create page', 'Unda ukurasa'),
        body: `${IN.f.input('title', IN.t('Page title', 'Kichwa cha ukurasa'), { required: true })}${IN.f.input('slug', IN.t('Web address (small letters, numbers, dashes)', 'Anwani (herufi ndogo, namba, vistari)'), { required: true, hint: IN.t('Example: about-us', 'Mfano: about-us') })}`,
        onOpen: (form) => { const t = form.querySelector('[name=title]'); const s = form.querySelector('[name=slug]'); t.addEventListener('input', () => { if (!s.dataset.touched) s.value = slugify(t.value); }); s.addEventListener('input', () => { s.dataset.touched = '1'; }); },
        onSubmit: async (d) => { const r = await IN.api.post('/site/pages', { title: d.title, slug: d.slug, published: false, show_in_menu: true, blocks: [] }); IN.closeModal(); location.hash = `#site-page/${r.id}`; } }),
      delpage: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this page?', 'Futa ukurasa huu?'), message: IN.t('The page will disappear from your website.', 'Ukurasa utaondoka kwenye tovuti yako.') }))) return; await IN.api.del(`/site/pages/${b.dataset.id}`); draw(); },
      newpost: () => postForm(null), editpost: (b) => postForm(b.dataset.id),
      delpost: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this item?', 'Futa kipengee hiki?'), message: '' }))) return; await IN.api.del(`/site/posts/${b.dataset.id}`); draw(); },
      delmedia: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this picture?', 'Futa picha hii?'), message: IN.t('Pages using it will show an empty space.', 'Kurasa zinazoitumia zitaonyesha nafasi tupu.') }))) return; await IN.api.del(`/site/media/${b.dataset.id}`); draw(); },
    });
    await draw();
  };

  // ============================================================ #site-page/<id>  (block editor + live preview)
  IN.modules.sitePage = async (el, args) => {
    const id = Number(args[0]); if (!id) { location.hash = '#website'; return; }
    const [{ page }, { pages }, cfg, prog] = await Promise.all([IN.api.get(`/site/pages/${id}`), IN.api.get('/site/pages'), IN.api.get('/site/config'), IN.api.get('/lookups').catch(() => ({}))]);
    const inst = IN.state.inst || {};
    const ctx = { slug: cfg.slug, sw: IN.isSw(), preview: true, inst: { address: inst.address, phone: inst.phone, email: inst.email, name: inst.name }, programmes: (prog.programmes || []).map((p) => ({ id: p.id, name: p.name })) };
    const blocks = page.blocks; let dirty = false; const open = new Set(blocks.length === 1 ? [blocks[0].id] : []);
    const mark = () => { dirty = true; el.querySelector('#spSave').classList.add('pulse'); };
    window.onbeforeunload = () => (dirty ? 'unsaved' : undefined);
    const parents = pages.filter((p) => !p.parent_id && p.id !== page.id);

    el.innerHTML = `${IN.pageHead(page.title, IN.t('Edit the page. The preview on the right updates as you type.', 'Hariri ukurasa. Onyesho la kulia husasishwa unapoandika.'), `<a class="in-btn ghost" href="#website"><i class="fa-solid fa-arrow-left"></i> ${IN.t('Back', 'Rudi')}</a><button class="in-btn primary" id="spSave"><i class="fa-solid fa-floppy-disk"></i> ${IN.t('Save page', 'Hifadhi ukurasa')}</button>`)}
      <div class="in-site-editor"><div class="in-stack" id="spLeft"><div class="in-card" id="spSettings"></div><div id="spBlocks" class="in-stack"></div><div><button class="in-btn primary" data-act="addblock"><i class="fa-solid fa-plus"></i> ${IN.t('Add a section', 'Ongeza sehemu')}</button></div></div>
      <div class="in-site-preview"><div class="in-spread" style="margin-bottom:.5rem"><b>${IN.t('Preview', 'Onyesho')}</b><span class="in-row"><button class="in-btn ghost sm on" data-act="pw" data-w="100%"><i class="fa-solid fa-desktop"></i></button><button class="in-btn ghost sm" data-act="pw" data-w="390px"><i class="fa-solid fa-mobile-screen"></i></button></span></div><div class="in-site-frame"><div id="spPreview" class="sx-body sx-preview"></div></div></div></div>`;

    const th = cfg.theme || {};
    const pv = el.querySelector('#spPreview');
    pv.dataset.font = th.font || 'sans'; pv.dataset.radius = th.radius || 'soft';
    pv.style.setProperty('--sx-primary', th.primary || cfg.primary_color || '#0F766E'); if (th.accent) pv.style.setProperty('--sx-accent', th.accent);
    const renderPreview = IN.debounce(() => { pv.innerHTML = S.render(blocks, ctx) || `<div class="sx-empty" style="margin:2rem">${IN.t('This page is empty. Add a section on the left.', 'Ukurasa huu ni mtupu. Ongeza sehemu upande wa kushoto.')}</div>`; S.hydrate(pv, ctx); }, 250);

    const settings = () => {
      el.querySelector('#spSettings').innerHTML = `<h3>${IN.t('Page settings', 'Mipangilio ya ukurasa')}</h3><div class="cols">${IN.f.input('p_title', IN.t('Page title', 'Kichwa cha ukurasa'), { value: page.title })}${page.slug === 'home' ? `<div class="in-field"><label>${IN.t('Web address', 'Anwani')}</label><input class="in-input" value="/" disabled></div>` : IN.f.input('p_slug', IN.t('Web address', 'Anwani'), { value: page.slug })}</div>
        <div class="cols">${IN.f.select('p_parent', IN.t('Under menu item', 'Chini ya kipengee cha menyu'), parents.map((p) => [p.id, p.title]), { value: page.parent_id || '', placeholder: IN.t('— Main menu —', '— Menyu kuu —'), attr: page.slug === 'home' ? { disabled: true } : {} })}${IN.f.input('p_order', IN.t('Menu order (small = first)', 'Mpangilio wa menyu (ndogo = kwanza)'), { type: 'number', value: page.menu_order, attr: { min: 0, max: 999 } })}</div>
        ${IN.f.textarea('p_seo', IN.t('Search engine description (optional)', 'Maelezo ya injini za utafutaji (si lazima)'), { value: page.seo_description || '', rows: 2 })}<div class="in-row" style="gap:1.4rem;flex-wrap:wrap">${page.slug === 'home' ? '' : IN.f.check('p_menu', IN.t('Show in the website menu', 'Onyesha kwenye menyu ya tovuti'), !!page.show_in_menu)}${IN.f.check('p_pub', `<b>${IN.t('Published', 'Imechapishwa')}</b>`, !!page.published)}</div>`;
    };
    const fieldHtml = (f, val, at) => {
      const lab = esc(tr(f.label)); const hint = f.hint ? `<span class="hint">${esc(tr(f.hint))}</span>` : '';
      if (f.type === 'textarea') return `<div class="in-field"><label>${lab}</label><textarea class="in-textarea" rows="${f.rows || 3}" ${at}>${esc(val)}</textarea>${hint}</div>`;
      if (f.type === 'check') return `<div class="in-field">${`<label class="in-check"><input type="checkbox" ${at} ${val ? 'checked' : ''}> ${lab}</label>`}</div>`;
      if (f.type === 'select') return `<div class="in-field"><label>${lab}</label><select class="in-select" ${at}>${f.options.map((o) => `<option value="${esc(o[0])}" ${String(o[0]) === String(val) ? 'selected' : ''}>${esc(tr(o[1]))}</option>`).join('')}</select></div>`;
      if (f.type === 'number') return `<div class="in-field"><label>${lab}</label><input class="in-input" type="number" value="${esc(val)}" ${f.min != null ? `min="${f.min}"` : ''} ${f.max != null ? `max="${f.max}"` : ''} ${at}></div>`;
      if (f.type === 'image') return `<div class="in-field"><label>${lab}</label><div class="in-row" style="gap:.6rem"><span class="in-thumb">${thumb(val)}</span><button type="button" class="in-btn ghost sm" data-act="pick" ${at}>${IN.t('Choose', 'Chagua')}</button>${val ? `<button type="button" class="in-btn ghost sm" data-act="unpick" ${at}>${IN.t('Remove', 'Ondoa')}</button>` : ''}</div></div>`;
      return `<div class="in-field"><label>${lab}</label><input class="in-input" type="text" value="${esc(val)}" ${f.type === 'link' ? `placeholder="${IN.t('/s/page, https://… or #apply', '/s/ukurasa, https://… au #apply')}"` : ''} ${at}>${hint}</div>`;
    };
    const summary = (b) => esc(String(b.title || b.heading || b.name || b.text || (b.items && b.items[0] && (b.items[0].title || b.items[0].q || b.items[0].label)) || '').slice(0, 60));
    const drawBlocks = () => {
      el.querySelector('#spBlocks').innerHTML = blocks.map((b, bi) => {
        const def = S.BLOCKS[b.type]; const isOpen = open.has(b.id);
        const fields = def.fields.map((f) => {
          const at = `data-bi="${bi}" data-k="${f.k}"`;
          if (f.type !== 'list') return fieldHtml(f, b[f.k], at);
          return `<div class="in-field"><label>${esc(tr(f.label))}</label><div class="in-stack" style="gap:.6rem">${(b[f.k] || []).map((it, li) => `<div class="in-site-item"><div class="in-spread"><b class="in-small">#${li + 1}</b><span class="in-row" style="gap:.2rem"><button class="in-icon-btn" data-act="li-up" data-bi="${bi}" data-k="${f.k}" data-li="${li}" aria-label="Up"><i class="fa-solid fa-arrow-up"></i></button><button class="in-icon-btn" data-act="li-down" data-bi="${bi}" data-k="${f.k}" data-li="${li}" aria-label="Down"><i class="fa-solid fa-arrow-down"></i></button><button class="in-icon-btn" data-act="li-del" data-bi="${bi}" data-k="${f.k}" data-li="${li}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button></span></div>${f.item.map((g) => fieldHtml(g, it[g.k], `data-bi="${bi}" data-k="${f.k}" data-li="${li}" data-lk="${g.k}"`)).join('')}</div>`).join('')}<button type="button" class="in-btn ghost sm" data-act="li-add" data-bi="${bi}" data-k="${f.k}"><i class="fa-solid fa-plus"></i> ${esc(tr(f.add))}</button></div></div>`;
        }).join('');
        return `<div class="in-card in-site-block" data-id="${esc(b.id)}"><div class="in-spread"><button class="in-site-bh" data-act="toggle" data-bi="${bi}"><i class="fa-solid ${def.icon}"></i> <b>${esc(tr(def.label))}</b> <span class="in-muted in-small">${summary(b)}</span></button><span class="in-row" style="gap:.2rem"><button class="in-icon-btn" data-act="b-up" data-bi="${bi}" aria-label="Up" ${bi === 0 ? 'disabled' : ''}><i class="fa-solid fa-arrow-up"></i></button><button class="in-icon-btn" data-act="b-down" data-bi="${bi}" aria-label="Down" ${bi === blocks.length - 1 ? 'disabled' : ''}><i class="fa-solid fa-arrow-down"></i></button><button class="in-icon-btn" data-act="b-dup" data-bi="${bi}" aria-label="Copy"><i class="fa-regular fa-copy"></i></button><button class="in-icon-btn" data-act="b-del" data-bi="${bi}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button></span></div>${isOpen ? `<div class="in-site-fields">${fields}</div>` : ''}</div>`;
      }).join('') || `<div class="in-card">${IN.empty('fa-layer-group', IN.t('No sections yet', 'Hakuna sehemu bado'), IN.t('Add a banner, text, cards, news, library books or a form.', 'Ongeza bango, maandishi, kadi, habari, vitabu vya maktaba au fomu.'))}</div>`;
    };
    const redraw = () => { drawBlocks(); renderPreview(); };
    settings(); drawBlocks(); renderPreview();

    // typing in any field updates the data and the preview
    const onInput = (e) => {
      const t = e.target; const d = t.dataset;
      if ((t.name || '').startsWith('p_')) { mark(); return; }
      if (d.bi === undefined || d.k === undefined) return;
      const b = blocks[Number(d.bi)]; if (!b) return;
      const val = t.type === 'checkbox' ? t.checked : t.type === 'number' ? Number(t.value) : t.value;
      if (d.li !== undefined) b[d.k][Number(d.li)][d.lk] = val; else b[d.k] = val;
      mark(); renderPreview();
    };
    el.querySelector('#spLeft').addEventListener('input', onInput); el.querySelector('#spLeft').addEventListener('change', onInput);
    const move = (arr, i, to) => { if (to < 0 || to >= arr.length) return; arr.splice(to, 0, arr.splice(i, 1)[0]); };
    const ref = (b) => { const bi = Number(b.dataset.bi); const blk = blocks[bi]; return { blk, list: b.dataset.li !== undefined ? blk[b.dataset.k] : null, li: Number(b.dataset.li), k: b.dataset.k, lk: b.dataset.lk }; };
    const blockMenu = () => IN.modal(IN.t('Add a section', 'Ongeza sehemu'), `<div class="in-block-pick">${Object.entries(S.BLOCKS).map(([k, d]) => `<button type="button" data-type="${k}"><i class="fa-solid ${d.icon}"></i><span>${esc(tr(d.label))}</span></button>`).join('')}</div>`, { size: 'lg' });

    IN.delegate(el, {
      pw: (b) => { el.querySelectorAll('[data-act=pw]').forEach((x) => x.classList.toggle('on', x === b)); el.querySelector('.in-site-frame').style.maxWidth = b.dataset.w; },
      toggle: (b) => { const blk = blocks[Number(b.dataset.bi)]; if (open.has(blk.id)) open.delete(blk.id); else open.add(blk.id); drawBlocks(); },
      'b-up': (b) => { const i = Number(b.dataset.bi); move(blocks, i, i - 1); mark(); redraw(); }, 'b-down': (b) => { const i = Number(b.dataset.bi); move(blocks, i, i + 1); mark(); redraw(); },
      'b-dup': (b) => { const i = Number(b.dataset.bi); const c = JSON.parse(JSON.stringify(blocks[i])); c.id = Math.random().toString(36).slice(2, 9); blocks.splice(i + 1, 0, c); open.add(c.id); mark(); redraw(); },
      'b-del': async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this section?', 'Futa sehemu hii?'), message: '' }))) return; blocks.splice(Number(b.dataset.bi), 1); mark(); redraw(); },
      'li-add': (b) => { const { blk, k } = ref(b); const f = S.BLOCKS[blk.type].fields.find((x) => x.k === k); const it = {}; f.item.forEach((g) => { it[g.k] = ''; }); blk[k].push(it); mark(); redraw(); },
      'li-del': (b) => { const r = ref(b); r.list.splice(r.li, 1); mark(); redraw(); },
      'li-up': (b) => { const r = ref(b); move(r.list, r.li, r.li - 1); mark(); redraw(); }, 'li-down': (b) => { const r = ref(b); move(r.list, r.li, r.li + 1); mark(); redraw(); },
      pick: async (b) => { const r = ref(b); const cur = r.list ? r.list[r.li][r.lk] : r.blk[r.k]; const v = await pickImage(cur); if (!v) return; if (r.list) r.list[r.li][r.lk] = v; else r.blk[r.k] = v; mark(); redraw(); },
      unpick: (b) => { const r = ref(b); if (r.list) r.list[r.li][r.lk] = ''; else r.blk[r.k] = ''; mark(); redraw(); },
      addblock: () => {
        const m = blockMenu();
        m.querySelector('.in-block-pick').addEventListener('click', (e) => { const x = e.target.closest('[data-type]'); if (!x) return; const nb = S.defaults(x.dataset.type); blocks.push(nb); open.add(nb.id); IN.closeModal(); mark(); redraw(); setTimeout(() => el.querySelector(`[data-id="${nb.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 80); });
      },
    });

    el.querySelector('#spSave').addEventListener('click', async (e) => {
      const btn = e.currentTarget; const g = (n) => el.querySelector(`[name=${n}]`);
      const body = { title: g('p_title').value, slug: page.slug === 'home' ? 'home' : g('p_slug').value, parent_id: g('p_parent') && g('p_parent').value ? Number(g('p_parent').value) : null,
        menu_order: Number(g('p_order').value || 100), seo_description: g('p_seo').value, show_in_menu: page.slug === 'home' ? true : g('p_menu').checked, published: g('p_pub').checked, blocks };
      btn.disabled = true;
      try { await IN.api.put(`/site/pages/${id}`, body); dirty = false; window.onbeforeunload = null; btn.classList.remove('pulse'); IN.toast(IN.t('Page saved.', 'Ukurasa umehifadhiwa.') + (cfg.enabled ? '' : ' ' + IN.t('Turn the website on in Design & settings to make it public.', 'Washa tovuti kwenye Muonekano na mipangilio ili iwe ya umma.'))); page.slug = body.slug; }
      catch (err) { IN.fail(err); } finally { btn.disabled = false; }
    });
  };

  // ============================================================ #applications  (online applications + website messages)
  IN.modules.applications = async (el) => {
    const st = { tab: 'apps', page: 1, status: '', q: '' };
    const canEnrol = IN.can('students.manage');
    const STAT = { new: ['info', IN.t('New', 'Mpya')], reviewing: ['pending', IN.t('Reviewing', 'Inakaguliwa')], accepted: ['success', IN.t('Accepted', 'Imekubaliwa')], rejected: ['bad', IN.t('Rejected', 'Imekataliwa')], enrolled: ['enrolled', IN.t('Enrolled', 'Amesajiliwa')] };
    el.innerHTML = `${IN.pageHead(IN.t('Applications & messages', 'Maombi na jumbe'), IN.t('People who applied or wrote to you through your website.', 'Watu walioomba nafasi au kuandika kupitia tovuti yako.'))}<div class="in-tabs" id="apTabs"><button data-tab="apps" class="on">${IN.t('Applications', 'Maombi')}</button><button data-tab="msgs">${IN.t('Messages', 'Jumbe')}</button></div><div id="apBody"></div>`;
    const body = el.querySelector('#apBody');
    const draw = async () => {
      el.querySelectorAll('#apTabs button').forEach((b) => b.classList.toggle('on', b.dataset.tab === st.tab));
      body.innerHTML = IN.skeleton(4);
      try { await (st.tab === 'apps' ? drawApps() : drawMsgs()); } catch (e) { body.innerHTML = IN.errorBox(e); }
    };
    async function drawApps() {
      const r = await IN.api.get('/applications' + IN.qs({ page: st.page, status: st.status, q: st.q, limit: 20 }));
      body.innerHTML = `<div class="in-card"><div class="in-toolbar" style="margin-bottom:.8rem"><input class="in-input" id="apQ" type="search" placeholder="${IN.t('Search name, email or phone…', 'Tafuta jina, barua pepe au simu…')}" value="${esc(st.q)}" style="flex:1;min-width:200px"><select class="in-select" id="apS"><option value="">${IN.t('All statuses', 'Hali zote')}</option>${Object.entries(STAT).map(([k, v]) => `<option value="${k}" ${st.status === k ? 'selected' : ''}>${v[1]} (${r.counts[k] || 0})</option>`).join('')}</select></div>${IN.table([
        { label: IN.t('Applicant', 'Muombaji'), render: (a) => `<b>${esc([a.first_name, a.last_name].join(' '))}</b><div class="in-small in-muted">${esc(a.email)} · ${esc(a.phone)}</div>` },
        { label: IN.t('Programme', 'Programu'), render: (a) => esc(a.programme_label || '—') },
        { label: IN.t('Date', 'Tarehe'), render: (a) => IN.date(a.created_at) },
        { label: IN.t('Status', 'Hali'), render: (a) => IN.chip(STAT[a.status][0], STAT[a.status][1]) },
        { label: '', cls: 'in-right', render: (a) => `<button class="in-btn primary sm" data-act="open" data-id="${a.id}">${IN.t('Open', 'Fungua')}</button>` },
      ], r.applications, { empty: IN.empty('fa-user-plus', IN.t('No applications yet', 'Hakuna maombi bado'), IN.t('Applications from your website will appear here.', 'Maombi kutoka kwenye tovuti yako yataonekana hapa.')) })}${IN.pager(r.page, r.limit, r.total)}</div>`;
      st.rows = r.applications;
      body.querySelector('#apQ').addEventListener('input', IN.debounce((e) => { st.q = e.target.value.trim(); st.page = 1; drawApps(); }, 350));
      body.querySelector('#apS').addEventListener('change', (e) => { st.status = e.target.value; st.page = 1; drawApps(); });
    }
    async function drawMsgs() {
      const r = await IN.api.get('/site-messages' + IN.qs({ page: st.page, limit: 20 }));
      body.innerHTML = `<div class="in-stack">${r.messages.length ? r.messages.map((m) => `<div class="in-card" style="${m.read_at ? 'opacity:.8' : 'border-left:4px solid var(--in-primary)'}"><div class="in-spread"><b>${esc(m.subject || IN.t('(no subject)', '(bila kichwa)'))}</b><span class="in-small in-muted">${IN.dateTime(m.created_at)}</span></div><div class="in-small in-muted">${esc([m.name, m.email, m.phone].filter(Boolean).join(' · '))}</div><p style="white-space:pre-wrap;margin:.5rem 0">${esc(m.message)}</p><div class="in-row" style="gap:.4rem"><button class="in-btn ghost sm" data-act="mread" data-id="${m.id}" data-unread="${m.read_at ? 1 : 0}">${m.read_at ? IN.t('Mark unread', 'Weka haijasomwa') : IN.t('Mark read', 'Weka imesomwa')}</button>${m.email ? `<a class="in-btn ghost sm" href="mailto:${esc(m.email)}"><i class="fa-solid fa-reply"></i> ${IN.t('Reply', 'Jibu')}</a>` : ''}<button class="in-btn danger-ghost sm" data-act="mdel" data-id="${m.id}" aria-label="${IN.t('Delete', 'Futa')}"><i class="fa-solid fa-trash"></i></button></div></div>`).join('') : `<div class="in-card">${IN.empty('fa-envelope', IN.t('No messages yet', 'Hakuna jumbe bado'), IN.t('Messages from your contact form will appear here.', 'Jumbe kutoka fomu ya mawasiliano zitaonekana hapa.'))}</div>`}</div>${IN.pager(r.page, r.limit, r.total)}`;
    }
    el.querySelector('#apTabs').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) { st.tab = b.dataset.tab; st.page = 1; draw(); } });
    IN.delegate(el, {
      page: (b) => { st.page = Number(b.dataset.p); draw(); },
      mread: async (b) => { await IN.api.put(`/site-messages/${b.dataset.id}`, { unread: b.dataset.unread === '1' }); draw(); },
      mdel: async (b) => { if (!(await IN.confirm({ title: IN.t('Delete this message?', 'Futa ujumbe huu?'), message: '' }))) return; await IN.api.del(`/site-messages/${b.dataset.id}`); draw(); },
      open: (b) => openApp(st.rows.find((x) => String(x.id) === b.dataset.id)),
    });
    function openApp(a) {
      {
        if (!a) return;
        const kv = (l, v) => (v ? `<dt>${l}</dt><dd>${esc(v)}</dd>` : '');
        const m = IN.formModal({ title: [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' '), size: 'lg', submit: IN.t('Save', 'Hifadhi'),
          body: `<dl class="in-kv">${kv(IN.t('Programme', 'Programu'), a.programme_label)}${kv('Email', a.email)}${kv(IN.t('Phone', 'Simu'), a.phone)}${kv(IN.t('Gender', 'Jinsia'), a.gender)}${kv(IN.t('Address', 'Anwani'), a.address)}${kv(IN.t('Organisation', 'Taasisi'), a.organisation)}${kv(IN.t('Job', 'Kazi'), a.job_title)}${kv(IN.t('Message', 'Ujumbe'), a.message)}${kv(IN.t('Received', 'Imepokelewa'), IN.dateTime(a.created_at))}</dl>
            ${a.student_id ? `<div class="in-alert info"><i class="fa-solid fa-user-graduate"></i><div>${IN.t('Enrolled as a student.', 'Amesajiliwa kama mwanafunzi.')} <a href="#student/${a.student_id}">${IN.t('Open student record', 'Fungua rekodi ya mwanafunzi')}</a></div></div>` : ''}
            <div class="cols">${IN.f.select('status', IN.t('Status', 'Hali'), Object.entries(STAT).filter(([k]) => k !== 'enrolled').map(([k, v]) => [k, v[1]]), { value: a.status === 'enrolled' ? '' : a.status, noBlank: a.status !== 'enrolled', attr: a.student_id ? { disabled: true } : {} })}</div>${IN.f.textarea('admin_note', IN.t('Internal note', 'Maelezo ya ndani'), { value: a.admin_note || '', rows: 2 })}
            <div class="in-row" style="gap:.5rem;flex-wrap:wrap">${!a.student_id && canEnrol ? `<button type="button" class="in-btn success" id="apEnrol"><i class="fa-solid fa-user-graduate"></i> ${IN.t('Enrol as student', 'Sajili kama mwanafunzi')}</button>` : ''}<button type="button" class="in-btn danger-ghost" id="apDel"><i class="fa-solid fa-trash"></i> ${IN.t('Delete', 'Futa')}</button></div>`,
          onSubmit: async (d) => { await IN.api.put(`/applications/${a.id}`, { status: a.student_id ? 'enrolled' : d.status, admin_note: d.admin_note }); IN.closeModal(); IN.toast(IN.t('Saved.', 'Imehifadhiwa.')); draw(); },
          onOpen: (form) => {
            const en = form.querySelector('#apEnrol');
            if (en) en.addEventListener('click', async () => { if (!(await IN.confirm({ title: IN.t('Enrol this applicant as a student?', 'Msajili muombaji huyu kama mwanafunzi?'), message: IN.t('A student record with a student number will be created.', 'Rekodi ya mwanafunzi yenye namba itaundwa.'), confirmText: IN.t('Enrol', 'Sajili'), danger: false }))) { openApp(a); return; } try { const r = await IN.api.post(`/applications/${a.id}/enrol`, {}); IN.toast(IN.t(`Enrolled — student number ${r.student_no}.`, `Amesajiliwa — namba ${r.student_no}.`)); draw(); } catch (e) { IN.fail(e); } });
            form.querySelector('#apDel').addEventListener('click', async () => { if (!(await IN.confirm({ title: IN.t('Delete this application?', 'Futa ombi hili?'), message: '' }))) { openApp(a); return; } await IN.api.del(`/applications/${a.id}`); draw(); });
          } });
        return m;
      }
    }
    await draw();
  };
})();
