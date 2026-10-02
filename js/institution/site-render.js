/* Smart21Institution — website renderer (shared by the public site and the builder preview).
   Page content is DATA (a list of blocks). This file turns blocks into HTML and escapes every
   value, so nothing an editor types can ever run as a script. It also holds BLOCKS: the list of
   block types and their fields, which the builder uses to draw its editing forms. */
(function (global) {
  'use strict';
  const S = global.S21Site || (global.S21Site = {});

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  S.esc = esc;
  const safeLink = (v) => {
    const s = String(v == null ? '' : v).trim();
    if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
    if (s.startsWith('#') || (s.startsWith('/') && !s.startsWith('//'))) return s;
    return '';
  };
  S.safeLink = safeLink;
  const ext = (u) => (/^https?:\/\//i.test(u) ? ' target="_blank" rel="noopener noreferrer"' : '');

  // Light text formatting: **bold**, [text](link), blank line = new paragraph, "- " = bullet list.
  function fmtInline(raw) {
    let s = esc(raw);
    s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    s = s.replace(/\[([^\]]{1,120})\]\(([^)\s]{1,400})\)/g, (m, text, href) => {
      const u = safeLink(href.replace(/&amp;/g, '&'));
      return u ? `<a href="${esc(u)}"${ext(u)}>${text}</a>` : text;
    });
    return s;
  }
  function fmt(body) {
    return String(body || '').split(/\n{2,}/).map((p) => {
      const lines = p.split('\n').map((l) => l.trim()).filter(Boolean);
      if (!lines.length) return '';
      if (lines.every((l) => /^[-•]\s+/.test(l))) return `<ul>${lines.map((l) => `<li>${fmtInline(l.replace(/^[-•]\s+/, ''))}</li>`).join('')}</ul>`;
      return `<p>${lines.map(fmtInline).join('<br>')}</p>`;
    }).join('');
  }
  S.fmt = fmt;

  // ---------------------------------------------------------------- block catalogue (builder uses this too)
  // Field types: text, textarea, image, link, number, check, select (options), list (item fields)
  const L = (en, sw) => [en, sw];
  S.BLOCKS = {
    hero: { icon: 'fa-image', label: L('Banner (hero)', 'Bango kuu'), fields: [
      { k: 'title', type: 'text', label: L('Headline', 'Kichwa kikuu') }, { k: 'subtitle', type: 'textarea', label: L('Sub-text', 'Maelezo mafupi') },
      { k: 'image', type: 'image', label: L('Background image', 'Picha ya nyuma') },
      { k: 'button1_label', type: 'text', label: L('Button 1 text', 'Maandishi ya kitufe 1') }, { k: 'button1_link', type: 'link', label: L('Button 1 link', 'Kiungo cha kitufe 1') },
      { k: 'button2_label', type: 'text', label: L('Button 2 text', 'Maandishi ya kitufe 2') }, { k: 'button2_link', type: 'link', label: L('Button 2 link', 'Kiungo cha kitufe 2') },
      { k: 'height', type: 'select', label: L('Height', 'Urefu'), options: [['normal', L('Normal', 'Kawaida')], ['tall', L('Tall', 'Mrefu')]] }] },
    text: { icon: 'fa-align-left', label: L('Text', 'Maandishi'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'body', type: 'textarea', rows: 7, label: L('Text', 'Maandishi'), hint: L('Blank line = new paragraph. "- " starts a bullet. **bold**, [link text](https://…)', 'Mstari mtupu = aya mpya. "- " huanzisha orodha. **nzito**, [maandishi](https://…)') },
      { k: 'image', type: 'image', label: L('Picture (optional)', 'Picha (si lazima)') }, { k: 'layout', type: 'select', label: L('Picture position', 'Mahali pa picha'), options: [['right', L('Right', 'Kulia')], ['left', L('Left', 'Kushoto')], ['top', L('Above', 'Juu')]] }] },
    cards: { icon: 'fa-table-cells-large', label: L('Cards (programmes, facilities…)', 'Kadi (programu, vifaa…)'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'intro', type: 'textarea', label: L('Intro (optional)', 'Utangulizi (si lazima)') },
      { k: 'columns', type: 'select', label: L('Columns', 'Safu'), options: [['2', '2'], ['3', '3'], ['4', '4']] },
      { k: 'items', type: 'list', label: L('Cards', 'Kadi'), add: L('Add card', 'Ongeza kadi'), item: [
        { k: 'title', type: 'text', label: L('Title', 'Kichwa') }, { k: 'text', type: 'textarea', label: L('Text', 'Maelezo') }, { k: 'image', type: 'image', label: L('Picture', 'Picha') },
        { k: 'link', type: 'link', label: L('Link', 'Kiungo') }, { k: 'link_label', type: 'text', label: L('Link text', 'Maandishi ya kiungo') }] }] },
    stats: { icon: 'fa-chart-simple', label: L('Numbers', 'Takwimu'), fields: [
      { k: 'items', type: 'list', label: L('Numbers', 'Takwimu'), add: L('Add number', 'Ongeza takwimu'), item: [{ k: 'value', type: 'text', label: L('Number', 'Namba') }, { k: 'label', type: 'text', label: L('Label', 'Maelezo') }] }] },
    news: { icon: 'fa-newspaper', label: L('Latest news', 'Habari mpya'), fields: [{ k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'limit', type: 'number', min: 1, max: 12, label: L('How many', 'Ngapi') }] },
    events: { icon: 'fa-calendar-days', label: L('Events', 'Matukio'), fields: [{ k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'limit', type: 'number', min: 1, max: 12, label: L('How many', 'Ngapi') }] },
    announcements: { icon: 'fa-bullhorn', label: L('Announcements', 'Matangazo'), fields: [{ k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'limit', type: 'number', min: 1, max: 10, label: L('How many', 'Ngapi') }] },
    library: { icon: 'fa-book-open', label: L('Library books (live)', 'Vitabu vya maktaba (moja kwa moja)'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'limit', type: 'number', min: 3, max: 24, label: L('Books to show', 'Vitabu vya kuonyesha') },
      { k: 'show_search', type: 'check', label: L('Show search box', 'Onyesha kisanduku cha kutafuta') }] },
    apply: { icon: 'fa-user-plus', label: L('Application / registration form', 'Fomu ya maombi / usajili'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'intro', type: 'textarea', label: L('Intro', 'Utangulizi') },
      { k: 'programmes_text', type: 'textarea', rows: 4, label: L('Extra programme names (one per line)', 'Majina ya programu za ziada (moja kwa mstari)'), hint: L('Programmes from your system are listed automatically.', 'Programu kutoka kwenye mfumo huonekana zenyewe.') },
      { k: 'ask_organisation', type: 'check', label: L('Ask for organisation & job title', 'Uliza taasisi na kazi') }, { k: 'success', type: 'text', label: L('Thank-you message', 'Ujumbe wa shukrani') }] },
    contact: { icon: 'fa-envelope', label: L('Contact details & form', 'Mawasiliano na fomu'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'intro', type: 'textarea', label: L('Intro', 'Utangulizi') }, { k: 'map_link', type: 'link', label: L('Map link (Google Maps)', 'Kiungo cha ramani') }] },
    faq: { icon: 'fa-circle-question', label: L('Questions & answers', 'Maswali na majibu'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'items', type: 'list', label: L('Questions', 'Maswali'), add: L('Add question', 'Ongeza swali'), item: [{ k: 'q', type: 'text', label: L('Question', 'Swali') }, { k: 'a', type: 'textarea', label: L('Answer', 'Jibu') }] }] },
    gallery: { icon: 'fa-images', label: L('Photo gallery', 'Picha'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'items', type: 'list', label: L('Photos', 'Picha'), add: L('Add photo', 'Ongeza picha'), item: [{ k: 'image', type: 'image', label: L('Photo', 'Picha') }, { k: 'caption', type: 'text', label: L('Caption', 'Maelezo') }] }] },
    cta: { icon: 'fa-bullseye', label: L('Call to action', 'Wito wa kuchukua hatua'), fields: [
      { k: 'heading', type: 'text', label: L('Heading', 'Kichwa') }, { k: 'text', type: 'textarea', label: L('Text', 'Maelezo') }, { k: 'button_label', type: 'text', label: L('Button text', 'Maandishi ya kitufe') }, { k: 'button_link', type: 'link', label: L('Button link', 'Kiungo cha kitufe') }] },
    quote: { icon: 'fa-quote-left', label: L('Quote', 'Nukuu'), fields: [
      { k: 'text', type: 'textarea', label: L('Quote', 'Nukuu') }, { k: 'author', type: 'text', label: L('Who said it', 'Aliyesema') }, { k: 'role', type: 'text', label: L('Role', 'Wadhifa') }, { k: 'image', type: 'image', label: L('Photo (optional)', 'Picha (si lazima)') }] },
    leader: { icon: 'fa-user-tie', label: L('Leader message', 'Ujumbe wa kiongozi'), fields: [
      { k: 'name', type: 'text', label: L('Name', 'Jina') }, { k: 'role', type: 'text', label: L('Title', 'Wadhifa') }, { k: 'image', type: 'image', label: L('Photo', 'Picha') }, { k: 'message', type: 'textarea', rows: 6, label: L('Message', 'Ujumbe') }] },
    spacer: { icon: 'fa-arrows-up-down', label: L('Space', 'Nafasi'), fields: [{ k: 'size', type: 'select', label: L('Size', 'Ukubwa'), options: [['s', L('Small', 'Ndogo')], ['m', L('Medium', 'Kati')], ['l', L('Large', 'Kubwa')]] }] },
  };
  S.defaults = (type) => {
    const d = { type, id: Math.random().toString(36).slice(2, 9) };
    const f = (S.BLOCKS[type] || { fields: [] }).fields;
    f.forEach((x) => { if (x.type === 'list') d[x.k] = []; else if (x.type === 'check') d[x.k] = x.k !== 'ask_organisation' ? true : false; else if (x.type === 'number') d[x.k] = x.k === 'limit' ? 3 : 0; else if (x.type === 'select') d[x.k] = String(x.options[0][0]); else d[x.k] = ''; });
    if (type === 'cards') d.items = [{ title: '', text: '', image: '', link: '', link_label: '' }];
    return d;
  };

  // ---------------------------------------------------------------- runtime context
  // ctx: { slug, sw, preview, inst, programmes }
  const T = (ctx) => (en, sw) => (ctx.sw ? sw : en);
  const imgUrl = (ctx, ref) => {
    const r = String(ref || '');
    if (/^https:\/\//i.test(r)) return r;
    const m = /^m:(\d+)$/.exec(r);
    if (!m) return '';
    return ctx.preview ? `/api/institution/site/media/${m[1]}/file` : `/api/institution/public/${encodeURIComponent(ctx.slug)}/media/${m[1]}`;
  };
  S.imgUrl = imgUrl;
  const head = (b, extra = '') => (b.heading ? `<div class="sx-head"><h2>${esc(b.heading)}</h2>${extra}</div>` : '');
  const btn = (label, link, cls = '') => { const u = safeLink(link); return label && u ? `<a class="sx-btn ${cls}" href="${esc(u)}"${ext(u)}>${esc(label)}</a>` : ''; };
  const num = (v, d, lo, hi) => Math.min(hi, Math.max(lo, Number.isFinite(Number(v)) && Number(v) > 0 ? Math.floor(Number(v)) : d));

  const R = {
    hero(b, ctx) {
      const bg = imgUrl(ctx, b.image);
      return `<section class="sx-hero ${b.height === 'tall' ? 'tall' : ''}" ${bg ? `style="background-image:url('${esc(bg)}')"` : ''}><div class="sx-wrap"><div class="in"><h1>${esc(b.title)}</h1>${b.subtitle ? `<p>${esc(b.subtitle)}</p>` : ''}<div class="sx-btns">${btn(b.button1_label, b.button1_link, 'primary')}${btn(b.button2_label, b.button2_link, 'light')}</div></div></div></section>`;
    },
    text(b, ctx) {
      const im = imgUrl(ctx, b.image); const lay = ['left', 'right', 'top'].includes(b.layout) ? b.layout : 'right';
      return `<section class="sx-sec"><div class="sx-wrap"><div class="sx-text ${im ? 'has-img ' + lay : ''}"><div class="body">${b.heading ? `<h2>${esc(b.heading)}</h2>` : ''}${fmt(b.body)}</div>${im ? `<div class="pic"><img src="${esc(im)}" alt="" loading="lazy"></div>` : ''}</div></div></section>`;
    },
    cards(b, ctx) {
      const cols = ['2', '3', '4'].includes(String(b.columns)) ? String(b.columns) : '3';
      return `<section class="sx-sec alt"><div class="sx-wrap">${head(b)}${b.intro ? `<p class="sx-intro">${esc(b.intro)}</p>` : ''}<div class="sx-grid c${cols}">${(b.items || []).map((c) => {
        const im = imgUrl(ctx, c.image); const u = safeLink(c.link);
        return `<article class="sx-card">${im ? `<div class="im"><img src="${esc(im)}" alt="" loading="lazy"></div>` : ''}<div class="bd"><h3>${esc(c.title)}</h3>${c.text ? `<p>${esc(c.text)}</p>` : ''}${u ? `<a class="more" href="${esc(u)}"${ext(u)}>${esc(c.link_label || T(ctx)('Read more', 'Soma zaidi'))} →</a>` : ''}</div></article>`;
      }).join('')}</div></div></section>`;
    },
    stats(b) {
      return `<section class="sx-stats"><div class="sx-wrap"><div class="row">${(b.items || []).map((s) => `<div><b>${esc(s.value)}</b><span>${esc(s.label)}</span></div>`).join('')}</div></div></section>`;
    },
    news: (b) => `<section class="sx-sec"><div class="sx-wrap">${head(b)}<div class="sx-grid c3" data-load="news" data-limit="${num(b.limit, 3, 1, 12)}"><div class="sx-loading">…</div></div></div></section>`,
    events: (b) => `<section class="sx-sec alt"><div class="sx-wrap">${head(b)}<div class="sx-grid c3" data-load="event" data-limit="${num(b.limit, 3, 1, 12)}"><div class="sx-loading">…</div></div></div></section>`,
    announcements: (b) => `<section class="sx-sec"><div class="sx-wrap">${head(b)}<div class="sx-ann" data-load="announcements" data-limit="${num(b.limit, 5, 1, 10)}"><div class="sx-loading">…</div></div></div></section>`,
    library(b, ctx) {
      const t = T(ctx);
      return `<section class="sx-sec alt"><div class="sx-wrap">${head(b, `<a class="sx-link" href="/institution-opac.html?i=${encodeURIComponent(ctx.slug)}">${t('Full catalogue', 'Katalogi kamili')} →</a>`)}${b.show_search !== false ? `<form class="sx-search" data-lib-search><input type="search" placeholder="${esc(t('Search title, author, subject…', 'Tafuta kichwa, mwandishi, somo…'))}" aria-label="${esc(t('Search books', 'Tafuta vitabu'))}"><button class="sx-btn primary" type="submit">${t('Search', 'Tafuta')}</button></form>` : ''}<div class="sx-books" data-load="books" data-limit="${num(b.limit, 6, 3, 24)}"><div class="sx-loading">…</div></div></div></section>`;
    },
    apply(b, ctx) {
      const t = T(ctx);
      const names = []; (ctx.programmes || []).forEach((p) => names.push([p.id, p.name]));
      String(b.programmes_text || '').split('\n').map((x) => x.trim()).filter(Boolean).slice(0, 40).forEach((n) => names.push(['t:' + n, n]));
      const f = (n, label, o = {}) => `<label class="sx-f ${o.wide ? 'wide' : ''}"><span>${esc(label)}${o.req ? ' *' : ''}</span><input name="${n}" type="${o.type || 'text'}" ${o.req ? 'required' : ''} maxlength="${o.max || 120}" autocomplete="${o.ac || 'off'}"></label>`;
      return `<section class="sx-sec" id="apply"><div class="sx-wrap narrow">${head(b)}${b.intro ? `<p class="sx-intro">${esc(b.intro)}</p>` : ''}<form class="sx-form" data-apply data-success="${esc(b.success || t('Thank you! Your application was received.', 'Asante! Ombi lako limepokelewa.'))}" novalidate>
        ${names.length ? `<label class="sx-f wide"><span>${t('Programme', 'Programu')}</span><select name="programme"><option value="">${t('Select…', 'Chagua…')}</option>${names.map((n) => `<option value="${esc(n[0])}">${esc(n[1])}</option>`).join('')}</select></label>` : ''}
        ${f('first_name', t('First name', 'Jina la kwanza'), { req: 1, ac: 'given-name' })}${f('middle_name', t('Middle name', 'Jina la kati'))}${f('last_name', t('Last name', 'Jina la mwisho'), { req: 1, ac: 'family-name' })}
        <label class="sx-f"><span>${t('Gender', 'Jinsia')}</span><select name="gender"><option value="">${t('Select…', 'Chagua…')}</option><option value="male">${t('Male', 'Kiume')}</option><option value="female">${t('Female', 'Kike')}</option></select></label>
        ${f('email', t('Email', 'Barua pepe'), { req: 1, type: 'email', ac: 'email' })}${f('phone', t('Phone number', 'Namba ya simu'), { req: 1, type: 'tel', ac: 'tel', max: 24 })}
        ${f('address', t('Postal / home address', 'Anwani'), { wide: 1, max: 200 })}
        ${b.ask_organisation ? f('organisation', t('Institution you are from', 'Taasisi unayotoka'), { max: 160 }) + f('job_title', t('Your job', 'Kazi yako')) : ''}
        <label class="sx-f wide"><span>${t('Message (optional)', 'Ujumbe (si lazima)')}</span><textarea name="message" rows="3" maxlength="1500"></textarea></label>
        <input class="sx-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
        <div class="sx-msg" role="alert"></div><button class="sx-btn primary wide" type="submit">${t('Submit application', 'Tuma ombi')}</button></form></div></section>`;
    },
    contact(b, ctx) {
      const t = T(ctx); const i = ctx.inst || {}; const map = safeLink(b.map_link);
      const row = (ic, v, href) => (v ? `<li><i class="fa-solid ${ic}"></i>${href ? `<a href="${esc(href)}">${esc(v)}</a>` : `<span>${esc(v)}</span>`}</li>` : '');
      return `<section class="sx-sec alt" id="contact"><div class="sx-wrap">${head(b)}${b.intro ? `<p class="sx-intro">${esc(b.intro)}</p>` : ''}<div class="sx-two"><ul class="sx-contact">${row('fa-location-dot', i.address)}${row('fa-phone', i.phone, i.phone ? 'tel:' + String(i.phone).replace(/[^+0-9]/g, '') : '')}${row('fa-envelope', i.email, i.email ? 'mailto:' + i.email : '')}${map ? `<li><i class="fa-solid fa-map"></i><a href="${esc(map)}" target="_blank" rel="noopener noreferrer">${t('Open map', 'Fungua ramani')}</a></li>` : ''}</ul>
        <form class="sx-form" data-contact data-success="${esc(t('Thank you! Your message was sent.', 'Asante! Ujumbe wako umetumwa.'))}" novalidate><label class="sx-f wide"><span>${t('Your name', 'Jina lako')}</span><input name="name" maxlength="120"></label><label class="sx-f"><span>${t('Email', 'Barua pepe')}</span><input name="email" type="email" maxlength="120"></label><label class="sx-f"><span>${t('Phone', 'Simu')}</span><input name="phone" type="tel" maxlength="24"></label><label class="sx-f wide"><span>${t('Subject', 'Kichwa cha ujumbe')}</span><input name="subject" maxlength="160"></label><label class="sx-f wide"><span>${t('Message', 'Ujumbe')} *</span><textarea name="message" rows="4" required maxlength="2000"></textarea></label><input class="sx-hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><div class="sx-msg" role="alert"></div><button class="sx-btn primary wide" type="submit">${t('Send message', 'Tuma ujumbe')}</button></form></div></div></section>`;
    },
    faq: (b) => `<section class="sx-sec"><div class="sx-wrap narrow">${head(b)}<div class="sx-faq">${(b.items || []).map((x) => `<details><summary>${esc(x.q)}</summary><div>${fmt(x.a)}</div></details>`).join('')}</div></div></section>`,
    gallery(b, ctx) {
      return `<section class="sx-sec"><div class="sx-wrap">${head(b)}<div class="sx-gallery">${(b.items || []).map((g) => { const u = imgUrl(ctx, g.image); return u ? `<figure><a href="${esc(u)}" data-zoom><img src="${esc(u)}" alt="${esc(g.caption || '')}" loading="lazy"></a>${g.caption ? `<figcaption>${esc(g.caption)}</figcaption>` : ''}</figure>` : ''; }).join('')}</div></div></section>`;
    },
    cta: (b) => `<section class="sx-cta"><div class="sx-wrap"><h2>${esc(b.heading)}</h2>${b.text ? `<p>${esc(b.text)}</p>` : ''}${btn(b.button_label, b.button_link, 'light')}</div></section>`,
    quote(b, ctx) {
      const im = imgUrl(ctx, b.image);
      return `<section class="sx-sec alt"><div class="sx-wrap narrow"><blockquote class="sx-quote"><p>${esc(b.text)}</p><footer>${im ? `<img src="${esc(im)}" alt="" loading="lazy">` : ''}<span><b>${esc(b.author)}</b>${b.role ? `<small>${esc(b.role)}</small>` : ''}</span></footer></blockquote></div></section>`;
    },
    leader(b, ctx) {
      const im = imgUrl(ctx, b.image);
      return `<section class="sx-sec"><div class="sx-wrap"><div class="sx-leader">${im ? `<img src="${esc(im)}" alt="${esc(b.name)}" loading="lazy">` : ''}<div><h3>${esc(b.name)}</h3><div class="role">${esc(b.role)}</div>${fmt(b.message)}</div></div></div></section>`;
    },
    spacer: (b) => `<div class="sx-spacer ${['s', 'm', 'l'].includes(b.size) ? b.size : 'm'}"></div>`,
  };

  S.render = (blocks, ctx) => (blocks || []).map((b) => (R[b.type] ? `<div class="sx-block" data-bid="${esc(b.id || '')}">${R[b.type](b, ctx)}</div>` : '')).join('');

  // ---------------------------------------------------------------- behaviours (loading data, forms)
  const fdate = (ctx, d) => { if (!d) return ''; const dt = new Date(String(d).slice(0, 10) + 'T00:00:00'); return Number.isNaN(dt.getTime()) ? d : dt.toLocaleDateString(ctx.sw ? 'sw-TZ' : 'en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); };
  async function getJson(url, opt) {
    const r = await fetch(url, opt); const d = await r.json().catch(() => ({}));
    if (!r.ok) { const e = new Error(d.error || 'Error'); e.status = r.status; throw e; }
    return d;
  }
  const base = (ctx) => `/api/institution/public/${encodeURIComponent(ctx.slug)}`;
  const empty = (ctx, en, sw) => `<div class="sx-empty">${esc(T(ctx)(en, sw))}</div>`;

  function postCard(ctx, p) {
    const im = p.image_id ? imgUrl(ctx, 'm:' + p.image_id) : '';
    const when = p.kind === 'event' ? [fdate(ctx, p.starts_on), p.ends_on && p.ends_on !== p.starts_on ? '– ' + fdate(ctx, p.ends_on) : ''].filter(Boolean).join(' ') : fdate(ctx, p.published_on);
    return `<article class="sx-card post" data-post="${p.id}" tabindex="0" role="button">${im ? `<div class="im"><img src="${esc(im)}" alt="" loading="lazy"></div>` : ''}<div class="bd"><div class="date">${esc(when)}${p.location ? ` · ${esc(p.location)}` : ''}</div><h3>${esc(p.title)}</h3>${p.summary ? `<p>${esc(p.summary)}</p>` : ''}<span class="more">${esc(T(ctx)('Read more', 'Soma zaidi'))} →</span></div></article>`;
  }
  function bookCard(ctx, b) {
    const t = T(ctx);
    const st = b.status === 'available' ? t('Available', 'Ipo') : b.status === 'borrowed' ? t('Borrowed', 'Imekopwa') : b.status === 'reserved' ? t('Reserved', 'Imehifadhiwa') : t('Not available', 'Haipatikani');
    return `<a class="sx-book" href="/institution-opac.html?i=${encodeURIComponent(ctx.slug)}&q=${encodeURIComponent(b.title)}"><span class="cv">${esc((b.title || '?').charAt(0).toUpperCase())}${b.has_cover ? `<img src="/api/institution/books/${b.id}/cover" alt="" loading="lazy" onerror="this.remove()">` : ''}</span><span class="mt"><b>${esc(b.title)}</b><small>${esc(b.author || '')}</small><em class="${esc(b.status)}">${esc(st)}</em></span></a>`;
  }

  async function loadBlock(el, ctx) {
    const kind = el.dataset.load; const limit = el.dataset.limit || 6; const t = T(ctx);
    try {
      if (kind === 'news' || kind === 'event') {
        const d = await getJson(`${base(ctx)}/posts?kind=${kind}&limit=${limit}`);
        el.innerHTML = d.posts.length ? d.posts.map((p) => postCard(ctx, p)).join('') : empty(ctx, 'Nothing to show yet.', 'Hakuna cha kuonyesha bado.');
      } else if (kind === 'announcements') {
        const d = await getJson(base(ctx));
        el.innerHTML = d.announcements.length ? d.announcements.slice(0, Number(limit)).map((a) => `<div class="sx-note"><b>${esc(a.title)}</b><p>${esc(a.body)}</p><small>${esc(fdate(ctx, String(a.created_at).slice(0, 10)))}</small></div>`).join('') : empty(ctx, 'No announcements.', 'Hakuna matangazo.');
      } else if (kind === 'books') {
        const q = el.dataset.q || '';
        const d = await getJson(`${base(ctx)}/books?limit=${limit}${q ? '&q=' + encodeURIComponent(q) : ''}&sort=year`);
        el.innerHTML = d.books.length ? d.books.map((b) => bookCard(ctx, b)).join('') : empty(ctx, 'No books found.', 'Hakuna vitabu vilivyopatikana.');
      }
    } catch (e) {
      if (ctx.preview && e.status === 404) { el.innerHTML = empty(ctx, 'Live items appear here once the website is turned on.', 'Vipengee halisi vitaonekana hapa tovuti ikiwashwa.'); return; }
      el.innerHTML = e.status === 403 && kind !== 'news' && kind !== 'event'
        ? `<div class="sx-empty">${esc(ctx.preview ? t('The library catalogue is private. Turn on "Public catalogue" in Website → Design & settings.', 'Katalogi ni ya faragha. Washa "Katalogi ya umma" kwenye Website → Muonekano na mipangilio.') : t('The catalogue is not public.', 'Katalogi si ya umma.'))}</div>`
        : empty(ctx, 'Could not load this section.', 'Imeshindwa kupakia sehemu hii.');
    }
  }

  function openPost(ctx, id) {
    getJson(`${base(ctx)}/posts?id=${id}`).then(({ post: p }) => {
      const im = p.image_id ? imgUrl(ctx, 'm:' + p.image_id) : '';
      const back = document.createElement('div'); back.className = 'sx-modal';
      back.innerHTML = `<div class="box" role="dialog" aria-modal="true"><button class="x" aria-label="${esc(T(ctx)('Close', 'Funga'))}">&times;</button>${im ? `<img src="${esc(im)}" alt="">` : ''}<div class="pd"><div class="date">${esc(p.kind === 'event' ? fdate(ctx, p.starts_on) : fdate(ctx, p.published_on))}${p.location ? ` · ${esc(p.location)}` : ''}</div><h2>${esc(p.title)}</h2>${fmt(p.body || p.summary || '')}</div></div>`;
      document.body.appendChild(back);
      const close = () => back.remove();
      back.addEventListener('click', (e) => { if (e.target === back || e.target.closest('.x')) close(); });
      document.addEventListener('keydown', function k(e) { if (e.key === 'Escape') { close(); document.removeEventListener('keydown', k); } });
    }).catch(() => {});
  }

  async function submitForm(form, ctx, path, mapper) {
    const t = T(ctx); const msg = form.querySelector('.sx-msg'); const b = form.querySelector('button[type=submit]');
    msg.className = 'sx-msg'; msg.textContent = '';
    let bad = null;
    form.querySelectorAll('[required]').forEach((x) => { if (!x.value.trim() && !bad) bad = x; });
    const em = form.querySelector('[name=email]');
    if (!bad && em && em.value.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(em.value.trim())) bad = em;
    if (bad) { msg.className = 'sx-msg err show'; msg.textContent = t('Please fill in the required fields correctly.', 'Tafadhali jaza sehemu zinazohitajika kwa usahihi.'); bad.focus(); return; }
    if (ctx.preview) { msg.className = 'sx-msg ok show'; msg.textContent = t('Preview only — forms are not sent from the builder.', 'Onyesho tu — fomu hazitumwi kutoka kwenye builder.'); return; }
    const label = b.textContent; b.disabled = true; b.textContent = t('Sending…', 'Inatuma…');
    try {
      const data = {}; new FormData(form).forEach((v, k) => { data[k] = v; });
      await getJson(`${base(ctx)}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(mapper ? mapper(data) : data) });
      form.reset(); msg.className = 'sx-msg ok show'; msg.textContent = form.dataset.success || t('Thank you!', 'Asante!');
    } catch (e) { msg.className = 'sx-msg err show'; msg.textContent = e.message || t('Something went wrong. Please try again.', 'Hitilafu imetokea. Tafadhali jaribu tena.'); }
    finally { b.disabled = false; b.textContent = label; }
  }

  S.hydrate = (root, ctx) => {
    root.querySelectorAll('[data-load]').forEach((el) => loadBlock(el, ctx));
    if (root.__sx) return; root.__sx = true;
    root.addEventListener('click', (e) => {
      const post = e.target.closest('[data-post]'); if (post) { openPost(ctx, post.dataset.post); return; }
      const z = e.target.closest('[data-zoom]');
      if (z) { e.preventDefault(); const back = document.createElement('div'); back.className = 'sx-modal'; back.innerHTML = `<div class="box zoom"><button class="x" aria-label="Close">&times;</button><img src="${esc(z.getAttribute('href'))}" alt=""></div>`; back.addEventListener('click', (ev) => { if (ev.target === back || ev.target.closest('.x')) back.remove(); }); document.body.appendChild(back); }
    });
    root.addEventListener('keydown', (e) => { if (e.key === 'Enter') { const post = e.target.closest && e.target.closest('[data-post]'); if (post) openPost(ctx, post.dataset.post); } });
    root.addEventListener('submit', (e) => {
      const f = e.target;
      if (f.matches('[data-lib-search]')) { e.preventDefault(); const box = f.parentElement.querySelector('[data-load=books]'); box.dataset.q = f.querySelector('input').value.trim(); box.innerHTML = '<div class="sx-loading">…</div>'; loadBlock(box, ctx); }
      else if (f.matches('[data-apply]')) {
        e.preventDefault();
        submitForm(f, ctx, '/apply', (d) => { const p = d.programme || ''; const out = { ...d }; delete out.programme; if (/^\d+$/.test(p)) out.programme_id = Number(p); else if (p.startsWith('t:')) out.programme_label = p.slice(2); return out; });
      } else if (f.matches('[data-contact]')) { e.preventDefault(); submitForm(f, ctx, '/contact'); }
    });
  };
})(window);
