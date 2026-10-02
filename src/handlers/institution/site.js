// Smart21Institution — Website module.
//   * Website builder: pages made of validated "blocks", design settings, media, news & events.
//   * Public site API (no sign-in): /api/institution/public/:slug/site …
//   * Online applications (student registration) and contact messages, reviewed in the app.
//
// Safety rules (same spirit as the rest of the system):
//   - Page content is DATA (JSON blocks), never HTML. The browser draws it with escaping,
//     so an editor can never inject a script into the public site.
//   - Links must be http(s), mailto:, tel:, #anchor or a path on this site; images must be an
//     uploaded media id ("m:12") or an https URL. Anything else is dropped on save.
//   - Public forms have a honeypot field and a per-visitor hourly limit; IPs are stored hashed.
//   - Every query is filtered by institution_id (taken from the sign-in or from the public slug).

import { json, hashPassword } from '../../lib/auth.js';
import {
  fail, secure, readJson, V, audit, likeTerm, paging, storeImage, errorResponse, assertSameOrigin,
} from '../../lib/institution-auth.js';
import { insertStudent } from './people.js';
import { startSession, clientIp } from './core.js';

// ---------------------------------------------------------------------
// Block validation
// ---------------------------------------------------------------------
export const BLOCK_TYPES = [
  'hero', 'text', 'cards', 'stats', 'news', 'events', 'announcements', 'library',
  'apply', 'register', 'contact', 'faq', 'gallery', 'cta', 'quote', 'leader', 'spacer', 'slider', 'quicklinks', 'steps',
];
const MAX_BLOCKS = 60;
const MAX_PAGE_BYTES = 200 * 1024;

export function safeLink(v) {
  const s = String(v == null ? '' : v).trim().slice(0, 500);
  if (!s) return '';
  if (/^(https?:\/\/|mailto:|tel:)/i.test(s)) return s;
  if (s.startsWith('#') || (s.startsWith('/') && !s.startsWith('//'))) return s;
  return '';
}
export function safeImage(v) {
  const s = String(v == null ? '' : v).trim().slice(0, 500);
  if (/^m:\d{1,10}$/.test(s)) return s;
  if (/^https:\/\//i.test(s)) return s;
  return '';
}
const ICON_KEY = /^icon$/i;
const LINK_KEY = /(link|url|href)$/i;
const IMAGE_KEY = /^(image|logo|photo|img|bg)$/i;

function clean(v, depth = 0, key = '') {
  if (typeof v === 'string') {
    if (ICON_KEY.test(key)) return /^fa-[a-z0-9-]{2,40}$/.test(v) ? v : '';
    if (IMAGE_KEY.test(key)) return safeImage(v);
    if (LINK_KEY.test(key)) return safeLink(v);
    return v.slice(0, 5000);
  }
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  if (typeof v === 'boolean') return v;
  if (Array.isArray(v)) return depth > 3 ? [] : v.slice(0, 40).map((x) => clean(x, depth + 1, key));
  if (v && typeof v === 'object') {
    if (depth > 3) return {};
    const o = {};
    for (const [k, val] of Object.entries(v).slice(0, 40)) {
      if (!/^[a-z_][a-z0-9_]{0,30}$/i.test(k)) continue;
      o[k] = clean(val, depth + 1, k);
    }
    return o;
  }
  return null;
}

export function cleanBlocks(input) {
  if (!Array.isArray(input)) fail(400, 'Page content must be a list of blocks.');
  if (input.length > MAX_BLOCKS) fail(400, `A page can have at most ${MAX_BLOCKS} blocks.`);
  const out = [];
  for (const b of input) {
    if (!b || typeof b !== 'object' || !BLOCK_TYPES.includes(b.type)) continue;   // unknown types are dropped
    const c = clean(b, 0, '');
    c.type = b.type;
    c.id = String(b.id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 20) || Math.random().toString(36).slice(2, 9);
    out.push(c);
  }
  const text = JSON.stringify(out);
  if (text.length > MAX_PAGE_BYTES) fail(400, 'This page is too large. Remove some content or split it into two pages.');
  return out;
}

const parse = (s, def) => { try { const v = JSON.parse(s); return v && typeof v === 'object' ? v : def; } catch (e) { return def; } };

// ---------------------------------------------------------------------
// Public helpers
// ---------------------------------------------------------------------
async function publicInstitution(env, slug) {
  const i = await env.DB.prepare(
    'SELECT id, name, short_name, slug, inst_type, about, phone, email, address, website, primary_color, is_public, logo_key FROM ins_institutions WHERE slug = ?'
  ).bind(slug).first();
  if (!i) fail(404, 'This website could not be found.');
  return i;
}
async function publicSite(env, slug) {
  const i = await publicInstitution(env, slug);
  const cfg = await env.DB.prepare('SELECT * FROM ins_site_config WHERE institution_id = ?').bind(i.id).first();
  if (!cfg || !cfg.enabled) fail(404, 'This website has not been published yet.');
  return { i, cfg };
}
async function ipHash(request) {
  const ip = request.headers.get('CF-Connecting-IP') || request.headers.get('X-Forwarded-For') || 'unknown';
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('s21site:' + ip));
  return [...new Uint8Array(buf)].slice(0, 12).map((b) => b.toString(16).padStart(2, '0')).join('');
}
const todayUtc = () => new Date().toISOString().slice(0, 10);

function menuTree(rows) {
  const items = rows.filter((r) => r.show_in_menu).map((r) => ({ id: r.id, slug: r.slug, title: r.title, parent_id: r.parent_id, order: r.menu_order, children: [] }));
  const byId = new Map(items.map((x) => [x.id, x]));
  const top = [];
  for (const it of items) {
    const p = it.parent_id && byId.get(it.parent_id);
    if (p && !p.parent_id) p.children.push(it); else top.push(it);
  }
  const sort = (a, b) => a.order - b.order || a.title.localeCompare(b.title);
  top.sort(sort); top.forEach((t) => t.children.sort(sort));
  return top.map(({ id, slug, title, children }) => ({ slug, title, children: children.map((c) => ({ slug: c.slug, title: c.title })) }));
}

// ---------------------------------------------------------------------
// Public API (no sign-in)
// ---------------------------------------------------------------------
// Whole website in one call: institution card, design, menu and (optionally) one page.
export async function publicSiteBundle({ params, env, url }) {
  try {
    const { i, cfg } = await publicSite(env, params.slug);
    const { results: pages } = await env.DB.prepare(
      'SELECT id, slug, title, parent_id, show_in_menu, menu_order FROM ins_site_pages WHERE institution_id = ? AND published = 1 AND deleted_at IS NULL'
    ).bind(i.id).all();
    const want = (url.searchParams.get('page') || 'home').toLowerCase();
    const page = await env.DB.prepare(
      'SELECT slug, title, seo_description, blocks FROM ins_site_pages WHERE institution_id = ? AND slug = ? AND published = 1 AND deleted_at IS NULL'
    ).bind(i.id, want).first();
    const programmes = (await env.DB.prepare('SELECT id, name FROM ins_programmes WHERE institution_id = ? AND active = 1 ORDER BY name LIMIT 100').bind(i.id).all()).results;
    const { logo_key, ...inst } = i;
    return json({
      institution: { ...inst, has_logo: !!logo_key },
      theme: parse(cfg.theme, {}), header: parse(cfg.header, {}), footer: parse(cfg.footer, {}),
      menu: menuTree(pages), programmes,
      page: page ? { slug: page.slug, title: page.title, seo_description: page.seo_description, blocks: parse(page.blocks, []) } : null,
    }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (e) { return errorResponse(e); }
}

export async function publicPosts({ params, env, url }) {
  try {
    const { i } = await publicSite(env, params.slug);
    const kind = url.searchParams.get('kind') === 'event' ? 'event' : 'news';
    const { page, limit, offset } = paging(url, 9, 30);
    const id = Number(url.searchParams.get('id') || 0);
    if (id) {
      const p = await env.DB.prepare(`SELECT id, kind, title, summary, body, image_id, location, starts_on, ends_on, published_on FROM ins_site_posts WHERE id = ? AND institution_id = ? AND published = 1 AND deleted_at IS NULL`).bind(id, i.id).first();
      if (!p) fail(404, 'This item could not be found.');
      return json({ post: p });
    }
    const order = kind === 'event' ? 'starts_on DESC, id DESC' : 'published_on DESC, id DESC';
    const [{ results }, total] = await Promise.all([
      env.DB.prepare(`SELECT id, kind, title, summary, image_id, location, starts_on, ends_on, published_on FROM ins_site_posts WHERE institution_id = ? AND kind = ? AND published = 1 AND deleted_at IS NULL ORDER BY ${order} LIMIT ${limit} OFFSET ${offset}`).bind(i.id, kind).all(),
      env.DB.prepare('SELECT COUNT(*) AS n FROM ins_site_posts WHERE institution_id = ? AND kind = ? AND published = 1 AND deleted_at IS NULL').bind(i.id, kind).first(),
    ]);
    return json({ posts: results, total: total.n, page, limit }, { headers: { 'Cache-Control': 'public, max-age=60' } });
  } catch (e) { return errorResponse(e); }
}

export async function publicMedia({ params, env }) {
  const m = await env.DB.prepare(
    `SELECT m.file_key FROM ins_site_media m JOIN ins_institutions i ON i.id = m.institution_id
      JOIN ins_site_config c ON c.institution_id = i.id
      WHERE m.id = ? AND i.slug = ? AND c.enabled = 1 AND m.deleted_at IS NULL`
  ).bind(params.id, params.slug).first();
  if (!m || !env.MATERIALS) return new Response('Not found', { status: 404 });
  const obj = await env.MATERIALS.get(m.file_key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, {
    headers: {
      'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg',
      'Cache-Control': 'public, max-age=3600', 'X-Content-Type-Options': 'nosniff',
    },
  });
}

async function throttle(env, table, instId, hash, max) {
  const r = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE institution_id = ? AND ip_hash = ? AND created_at >= datetime('now', '-1 hour')`).bind(instId, hash).first();
  if ((r?.n || 0) >= max) fail(429, 'Too many submissions from this device. Please try again later.');
}

export async function publicApply({ request, env, params }) {
  try {
    assertSameOrigin(request);
    const { i } = await publicSite(env, params.slug);
    const b = await readJson(request);
    if (b.website) return json({ ok: true });                       // honeypot: bots fill hidden fields
    const hash = await ipHash(request);
    await throttle(env, 'ins_applications', i.id, hash, 5);
    const first = V.str(b.first_name, 'First name', { required: true, max: 60 });
    const last = V.str(b.last_name, 'Last name', { required: true, max: 60 });
    const email = V.email(b.email, 'Email', { required: true });
    const phone = V.str(b.phone, 'Phone number', { required: true, max: 24, min: 6 });
    if (!/^\+?[0-9][0-9 ()\-]{5,23}$/.test(phone)) fail(400, 'Please enter a valid phone number, like +255 712 345 678.');
    let programmeId = null; let label = V.str(b.programme_label, 'Programme', { max: 160 });
    if (b.programme_id) {
      const p = await env.DB.prepare('SELECT id, name FROM ins_programmes WHERE id = ? AND institution_id = ? AND active = 1').bind(Number(b.programme_id), i.id).first();
      if (!p) fail(400, 'Please choose a programme from the list.');
      programmeId = p.id; label = p.name;
    }
    const dup = await env.DB.prepare(`SELECT id FROM ins_applications WHERE institution_id = ? AND lower(email) = ? AND COALESCE(programme_label, '') = ? AND created_at >= datetime('now', '-1 day')`).bind(i.id, email, label || '').first();
    if (dup) return json({ ok: true, duplicate: true });
    const r = await env.DB.prepare(
      `INSERT INTO ins_applications (institution_id, programme_id, programme_label, first_name, middle_name, last_name, gender, email, phone, address, organisation, job_title, message, ip_hash)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(i.id, programmeId, label, first, V.str(b.middle_name, 'Middle name', { max: 60 }), last, V.oneOf(b.gender, 'Gender', ['male', 'female']),
      email, phone, V.str(b.address, 'Address', { max: 200 }), V.str(b.organisation, 'Institution / organisation', { max: 160 }),
      V.str(b.job_title, 'Job title', { max: 120 }), V.str(b.message, 'Message', { max: 1500 }), hash).run();
    // Tell everybody who can review applications (in-app notification).
    const { results } = await env.DB.prepare(
      `SELECT DISTINCT m.user_id FROM ins_members m WHERE m.institution_id = ? AND m.active = 1 AND (m.role = 'super_admin' OR EXISTS (SELECT 1 FROM ins_role_permissions rp WHERE rp.institution_id = m.institution_id AND rp.role = m.role AND rp.permission = 'applications.manage')) LIMIT 20`
    ).bind(i.id).all();
    for (const m of results) {
      await env.DB.prepare(`INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, 'application', ?, ?, '#applications')`)
        .bind(i.id, m.user_id, 'New application', `${first} ${last}${label ? ' — ' + label : ''}`.slice(0, 200)).run().catch(() => {});
    }
    return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}

export async function publicContact({ request, env, params }) {
  try {
    assertSameOrigin(request);
    const { i } = await publicSite(env, params.slug);
    const b = await readJson(request);
    if (b.website) return json({ ok: true });
    const hash = await ipHash(request);
    await throttle(env, 'ins_contact_messages', i.id, hash, 5);
    const message = V.str(b.message, 'Message', { required: true, max: 2000, min: 3 });
    await env.DB.prepare('INSERT INTO ins_contact_messages (institution_id, name, email, phone, subject, message, ip_hash) VALUES (?, ?, ?, ?, ?, ?, ?)')
      .bind(i.id, V.str(b.name, 'Name', { max: 120 }), V.email(b.email, 'Email'), V.str(b.phone, 'Phone', { max: 24 }), V.str(b.subject, 'Subject', { max: 160 }), message, hash).run();
    return json({ ok: true }, { status: 201 });
  } catch (e) { return errorResponse(e); }
}

// ---------------------------------------------------------------------
// Builder — site settings
// ---------------------------------------------------------------------
async function ensureConfig(env, instId) {
  await env.DB.prepare('INSERT OR IGNORE INTO ins_site_config (institution_id) VALUES (?)').bind(instId).run();
  return env.DB.prepare('SELECT * FROM ins_site_config WHERE institution_id = ?').bind(instId).first();
}
const FONTS = ['sans', 'serif', 'rounded'];

export const getSiteConfig = secure({ perm: 'site.manage' }, async ({ env, ctx }) => {
  const c = await ensureConfig(env, ctx.inst.id);
  const pages = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_site_pages WHERE institution_id = ? AND deleted_at IS NULL').bind(ctx.inst.id).first();
  return json({
    enabled: !!c.enabled, theme: parse(c.theme, {}), header: parse(c.header, {}), footer: parse(c.footer, {}),
    catalogue_public: !!ctx.inst.is_public, slug: ctx.inst.slug, primary_color: ctx.inst.primary_color, page_count: pages.n,
  });
});

export const saveSiteConfig = secure({ perm: 'site.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const cur = await ensureConfig(env, ctx.inst.id);
  const th = b.theme || {}; const hd = b.header || {}; const ft = b.footer || {};
  const theme = b.theme !== undefined ? {
    primary: V.color(th.primary, 'Main colour') || undefined,
    accent: V.color(th.accent, 'Accent colour') || undefined,
    font: V.oneOf(th.font, 'Font style', FONTS, { def: 'sans' }),
    radius: V.oneOf(th.radius, 'Corners', ['sharp', 'soft', 'round'], { def: 'soft' }),
  } : parse(cur.theme, {});
  const header = b.header !== undefined ? {
    topbar_text: V.str(hd.topbar_text, 'Top bar text', { max: 200 }) || '',
    show_apply: !!hd.show_apply,
    apply_label: V.str(hd.apply_label, 'Apply button text', { max: 30 }) || '',
    apply_link: safeLink(hd.apply_link),
    show_library: hd.show_library !== false,
    allow_register: hd.allow_register !== false,
  } : parse(cur.header, {});
  const footer = b.footer !== undefined ? {
    text: V.str(ft.text, 'Footer text', { max: 400 }) || '',
    links: (Array.isArray(ft.links) ? ft.links : []).slice(0, 12).map((l) => ({ label: String(l.label || '').slice(0, 60), link: safeLink(l.link) })).filter((l) => l.label && l.link),
    socials: (Array.isArray(ft.socials) ? ft.socials : []).slice(0, 8).map((l) => ({ kind: V.oneOf(l.kind, 'Social network', ['facebook', 'instagram', 'x', 'youtube', 'linkedin', 'whatsapp', 'tiktok'], { def: 'facebook' }), url: safeLink(l.url) })).filter((l) => l.url),
  } : parse(cur.footer, {});
  const enabled = b.enabled !== undefined ? (b.enabled ? 1 : 0) : cur.enabled;
  if (enabled && !cur.enabled) {
    const home = await env.DB.prepare(`SELECT 1 AS x FROM ins_site_pages WHERE institution_id = ? AND slug = 'home' AND published = 1 AND deleted_at IS NULL`).bind(ctx.inst.id).first();
    if (!home) fail(400, 'Publish a "home" page before turning the website on.');
  }
  await env.DB.prepare(`UPDATE ins_site_config SET enabled = ?, theme = ?, header = ?, footer = ?, updated_at = datetime('now') WHERE institution_id = ?`)
    .bind(enabled, JSON.stringify(theme), JSON.stringify(header), JSON.stringify(footer), ctx.inst.id).run();
  if (b.catalogue_public !== undefined) await env.DB.prepare('UPDATE ins_institutions SET is_public = ? WHERE id = ?').bind(b.catalogue_public ? 1 : 0, ctx.inst.id).run();
  await audit(env, request, ctx, 'website', 'site.settings', 'site', ctx.inst.id, enabled ? 'Website on' : 'Website off');
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Builder — pages
// ---------------------------------------------------------------------
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const RESERVED = ['api', 'admin', 'login', 'assets', 'static'];

export const listPages = secure({ perm: 'site.manage' }, async ({ env, ctx }) => {
  const { results } = await env.DB.prepare(
    'SELECT id, slug, title, parent_id, show_in_menu, menu_order, published, updated_at FROM ins_site_pages WHERE institution_id = ? AND deleted_at IS NULL ORDER BY menu_order, title'
  ).bind(ctx.inst.id).all();
  return json({ pages: results });
});

export const getPage = secure({ perm: 'site.manage' }, async ({ env, params, ctx }) => {
  const p = await env.DB.prepare('SELECT * FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!p) fail(404, 'The page could not be found.');
  return json({ page: { ...p, blocks: parse(p.blocks, []) } });
});

async function pageFields(env, ctx, b, current) {
  const title = V.str(b.title, 'Page title', { required: true, max: 120, min: 2 });
  let slug = current ? current.slug : String(b.slug || '').trim().toLowerCase();
  if (!current || (b.slug && b.slug !== current.slug && current.slug !== 'home')) slug = String(b.slug || '').trim().toLowerCase();
  if (!SLUG.test(slug) || slug.length > 40) fail(400, 'The web address must use small letters, numbers and dashes only, like "about-us".');
  if (RESERVED.includes(slug)) fail(400, 'That web address is reserved. Please choose another.');
  const dup = await env.DB.prepare('SELECT id FROM ins_site_pages WHERE institution_id = ? AND slug = ? AND deleted_at IS NULL AND id != ?').bind(ctx.inst.id, slug, current ? current.id : 0).first();
  if (dup) fail(409, 'Another page already uses this web address.');
  let parentId = null;
  if (b.parent_id) {
    const par = await env.DB.prepare('SELECT id, parent_id FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(Number(b.parent_id), ctx.inst.id).first();
    if (!par || par.parent_id || (current && par.id === current.id)) fail(400, 'Choose a main menu page as the parent (menus have one level of drop-down).');
    parentId = par.id;
  }
  if (slug === 'home') parentId = null;
  return {
    title, slug, parentId,
    seo: V.str(b.seo_description, 'Search description', { max: 300 }),
    show: slug === 'home' ? 1 : (b.show_in_menu === false ? 0 : 1),
    order: V.int(b.menu_order, 'Menu order', { min: 0, max: 999 }) ?? 100,
    published: b.published ? 1 : 0,
  };
}

export const createPage = secure({ perm: 'site.manage' }, async ({ request, env, ctx }) => {
  const b = await readJson(request);
  const f = await pageFields(env, ctx, b, null);
  const blocks = cleanBlocks(b.blocks || []);
  const r = await env.DB.prepare(
    'INSERT INTO ins_site_pages (institution_id, slug, title, seo_description, blocks, parent_id, show_in_menu, menu_order, published) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).bind(ctx.inst.id, f.slug, f.title, f.seo, JSON.stringify(blocks), f.parentId, f.show, f.order, f.published).run();
  await audit(env, request, ctx, 'website', 'page.create', 'page', r.meta.last_row_id, f.slug);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updatePage = secure({ perm: 'site.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT * FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The page could not be found.');
  const b = await readJson(request);
  const f = await pageFields(env, ctx, b, cur);
  if (cur.slug === 'home' && !f.published) fail(400, 'The home page must stay published.');
  const blocks = b.blocks !== undefined ? cleanBlocks(b.blocks) : parse(cur.blocks, []);
  await env.DB.prepare(
    `UPDATE ins_site_pages SET slug = ?, title = ?, seo_description = ?, blocks = ?, parent_id = ?, show_in_menu = ?, menu_order = ?, published = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`
  ).bind(f.slug, f.title, f.seo, JSON.stringify(blocks), f.parentId, f.show, f.order, f.published, cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'website', 'page.update', 'page', cur.id, f.slug);
  return json({ ok: true });
});

export const deletePage = secure({ perm: 'site.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT id, slug FROM ins_site_pages WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The page could not be found.');
  if (cur.slug === 'home') fail(400, 'The home page cannot be deleted.');
  await env.DB.prepare(`UPDATE ins_site_pages SET deleted_at = datetime('now'), published = 0 WHERE id = ?`).bind(cur.id).run();
  await env.DB.prepare('UPDATE ins_site_pages SET parent_id = NULL WHERE parent_id = ? AND institution_id = ?').bind(cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'website', 'page.delete', 'page', cur.id, cur.slug);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Builder — media library
// ---------------------------------------------------------------------
export const listMedia = secure({ perm: 'site.manage' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 24, 60);
  const [{ results }, total] = await Promise.all([
    env.DB.prepare('SELECT id, alt, created_at FROM ins_site_media WHERE institution_id = ? AND deleted_at IS NULL ORDER BY id DESC LIMIT ? OFFSET ?').bind(ctx.inst.id, limit, offset).all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM ins_site_media WHERE institution_id = ? AND deleted_at IS NULL').bind(ctx.inst.id).first(),
  ]);
  return json({ media: results, total: total.n, page, limit });
});

export const uploadMedia = secure({ perm: 'site.manage' }, async ({ request, env, ctx }) => {
  const cnt = await env.DB.prepare('SELECT COUNT(*) AS n FROM ins_site_media WHERE institution_id = ? AND deleted_at IS NULL').bind(ctx.inst.id).first();
  if (cnt.n >= 300) fail(400, 'The media library is full (300 images). Delete some images first.');
  const form = await request.formData().catch(() => null);
  if (!form) fail(400, 'Please choose an image.');
  const key = await storeImage(env, form.get('image'), `institution/${ctx.inst.id}/site`);
  const r = await env.DB.prepare('INSERT INTO ins_site_media (institution_id, file_key, alt) VALUES (?, ?, ?)').bind(ctx.inst.id, key, V.str(form.get('alt'), 'Description', { max: 200 })).run();
  await audit(env, request, ctx, 'website', 'media.upload', 'media', r.meta.last_row_id, null);
  return json({ ok: true, id: r.meta.last_row_id, ref: `m:${r.meta.last_row_id}` }, { status: 201 });
});

// Admin preview of an image (works before the site is published).
export const mediaFile = secure({ perm: 'site.manage' }, async ({ env, params, ctx }) => {
  const m = await env.DB.prepare('SELECT file_key FROM ins_site_media WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!m || !env.MATERIALS) return new Response('Not found', { status: 404 });
  const obj = await env.MATERIALS.get(m.file_key);
  if (!obj) return new Response('Not found', { status: 404 });
  return new Response(obj.body, { headers: { 'Content-Type': (obj.httpMetadata && obj.httpMetadata.contentType) || 'image/jpeg', 'Cache-Control': 'private, max-age=300', 'X-Content-Type-Options': 'nosniff' } });
});

export const deleteMedia = secure({ perm: 'site.manage' }, async ({ request, env, params, ctx }) => {
  const m = await env.DB.prepare('SELECT id, file_key FROM ins_site_media WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!m) fail(404, 'The image could not be found.');
  await env.DB.prepare(`UPDATE ins_site_media SET deleted_at = datetime('now') WHERE id = ?`).bind(m.id).run();
  if (env.MATERIALS) await env.MATERIALS.delete(m.file_key).catch(() => {});
  await audit(env, request, ctx, 'website', 'media.delete', 'media', m.id, null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Builder — news & events
// ---------------------------------------------------------------------
export const listAdminPosts = secure({ perm: 'site.manage' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 20, 50);
  const kind = ['news', 'event'].includes(url.searchParams.get('kind')) ? url.searchParams.get('kind') : null;
  const where = `institution_id = ? AND deleted_at IS NULL${kind ? ' AND kind = ?' : ''}`;
  const binds = kind ? [ctx.inst.id, kind] : [ctx.inst.id];
  const [{ results }, total] = await Promise.all([
    env.DB.prepare(`SELECT id, kind, title, summary, image_id, location, starts_on, ends_on, published, published_on FROM ins_site_posts WHERE ${where} ORDER BY id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_site_posts WHERE ${where}`).bind(...binds).first(),
  ]);
  return json({ posts: results, total: total.n, page, limit });
});

export const getAdminPost = secure({ perm: 'site.manage' }, async ({ env, params, ctx }) => {
  const p = await env.DB.prepare('SELECT * FROM ins_site_posts WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!p) fail(404, 'The item could not be found.');
  return json({ post: p });
});

async function postFields(env, ctx, b) {
  const kind = V.oneOf(b.kind, 'Type', ['news', 'event'], { def: 'news' });
  let imageId = null;
  if (b.image_id) {
    const m = await env.DB.prepare('SELECT id FROM ins_site_media WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(Number(b.image_id), ctx.inst.id).first();
    if (!m) fail(400, 'That image is not in your media library.');
    imageId = m.id;
  }
  return {
    kind, imageId,
    title: V.str(b.title, 'Title', { required: true, max: 160, min: 3 }),
    summary: V.str(b.summary, 'Short summary', { max: 300 }),
    body: V.str(b.body, 'Full text', { max: 20000 }),
    location: V.str(b.location, 'Place', { max: 160 }),
    starts: V.date(b.starts_on, 'Start date'), ends: V.date(b.ends_on, 'End date'),
    published: b.published === false ? 0 : 1,
    on: V.date(b.published_on, 'Publish date') || todayUtc(),
  };
}

export const createPost = secure({ perm: 'site.manage' }, async ({ request, env, ctx }) => {
  const f = await postFields(env, ctx, await readJson(request));
  const r = await env.DB.prepare('INSERT INTO ins_site_posts (institution_id, kind, title, summary, body, image_id, location, starts_on, ends_on, published, published_on, author_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)')
    .bind(ctx.inst.id, f.kind, f.title, f.summary, f.body, f.imageId, f.location, f.starts, f.ends, f.published, f.on, ctx.user.id).run();
  await audit(env, request, ctx, 'website', 'post.create', 'post', r.meta.last_row_id, f.title);
  return json({ ok: true, id: r.meta.last_row_id }, { status: 201 });
});

export const updatePost = secure({ perm: 'site.manage' }, async ({ request, env, params, ctx }) => {
  const cur = await env.DB.prepare('SELECT id FROM ins_site_posts WHERE id = ? AND institution_id = ? AND deleted_at IS NULL').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The item could not be found.');
  const f = await postFields(env, ctx, await readJson(request));
  await env.DB.prepare(`UPDATE ins_site_posts SET kind = ?, title = ?, summary = ?, body = ?, image_id = ?, location = ?, starts_on = ?, ends_on = ?, published = ?, published_on = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`)
    .bind(f.kind, f.title, f.summary, f.body, f.imageId, f.location, f.starts, f.ends, f.published, f.on, cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'website', 'post.update', 'post', cur.id, f.title);
  return json({ ok: true });
});

export const deletePost = secure({ perm: 'site.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare(`UPDATE ins_site_posts SET deleted_at = datetime('now') WHERE id = ? AND institution_id = ? AND deleted_at IS NULL`).bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'The item could not be found.');
  await audit(env, request, ctx, 'website', 'post.delete', 'post', Number(params.id), null);
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Applications (online student registration) and website messages
// ---------------------------------------------------------------------
const APP_STATUS = ['new', 'reviewing', 'accepted', 'rejected', 'enrolled'];

export const listApplications = secure({ perm: 'applications.manage' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 20, 100);
  const status = url.searchParams.get('status');
  const q = (url.searchParams.get('q') || '').trim();
  let where = 'a.institution_id = ?'; const binds = [ctx.inst.id];
  if (APP_STATUS.includes(status)) { where += ' AND a.status = ?'; binds.push(status); }
  if (q) { const like = likeTerm(q); where += ` AND (a.first_name LIKE ? ESCAPE '\\' OR a.last_name LIKE ? ESCAPE '\\' OR a.email LIKE ? ESCAPE '\\' OR a.phone LIKE ? ESCAPE '\\')`; binds.push(like, like, like, like); }
  const [{ results }, total, counts] = await Promise.all([
    env.DB.prepare(`SELECT a.id, a.first_name, a.middle_name, a.last_name, a.gender, a.email, a.phone, a.address, a.organisation, a.job_title, a.message, a.status, a.admin_note, a.programme_id, a.programme_label, a.student_id, a.created_at FROM ins_applications a WHERE ${where} ORDER BY a.id DESC LIMIT ${limit} OFFSET ${offset}`).bind(...binds).all(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_applications a WHERE ${where}`).bind(...binds).first(),
    env.DB.prepare('SELECT status, COUNT(*) AS n FROM ins_applications WHERE institution_id = ? GROUP BY status').bind(ctx.inst.id).all(),
  ]);
  return json({ applications: results, total: total.n, page, limit, counts: Object.fromEntries(counts.results.map((c) => [c.status, c.n])) });
});

export const updateApplication = secure({ perm: 'applications.manage' }, async ({ request, env, params, ctx }) => {
  const b = await readJson(request);
  const cur = await env.DB.prepare('SELECT id, status, student_id FROM ins_applications WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (!cur) fail(404, 'The application could not be found.');
  const status = V.oneOf(b.status, 'Status', APP_STATUS, { def: cur.status });
  if (status === 'enrolled' && !cur.student_id) fail(400, 'Use "Enrol as student" to create the student record.');
  await env.DB.prepare(`UPDATE ins_applications SET status = ?, admin_note = ?, updated_at = datetime('now') WHERE id = ? AND institution_id = ?`)
    .bind(status, V.str(b.admin_note, 'Note', { max: 600 }), cur.id, ctx.inst.id).run();
  await audit(env, request, ctx, 'website', 'application.update', 'application', cur.id, status);
  return json({ ok: true });
});

// Turns an accepted application into a real student record (needs permission to add students).
export const enrolApplication = secure({ perm: ['applications.manage'] }, async ({ request, env, params, ctx }) => {
  if (!(ctx.role === 'super_admin' || ctx.perms.has('students.manage'))) fail(403, 'You need the permission to add student records to enrol an applicant.');
  const a = await env.DB.prepare('SELECT * FROM ins_applications WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).first();
  if (!a) fail(404, 'The application could not be found.');
  if (a.student_id) fail(409, 'This applicant is already a student.');
  const dup = await env.DB.prepare('SELECT id, student_no FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND lower(email) = ?').bind(ctx.inst.id, a.email.toLowerCase()).first();
  if (dup) fail(409, `A student with this email already exists (${dup.student_no}).`);
  const full = [a.first_name, a.middle_name, a.last_name].filter(Boolean).join(' ');
  const s = await insertStudent(env, ctx, {
    student_no: null, reg_no: null, full_name: full, gender: a.gender, dob: null, phone: a.phone, email: a.email, address: a.address,
    programme_id: a.programme_id, department_id: null, class_name: null, level: null, admission_date: todayUtc(),
    admission_info: `Online application #${a.id}${a.programme_label ? ' — ' + a.programme_label : ''}`, status: 'active',
    guardian_name: null, guardian_phone: null, guardian_relation: null, notes: [a.organisation, a.job_title].filter(Boolean).join(' · ') || null,
  });
  await env.DB.prepare(`UPDATE ins_applications SET status = 'enrolled', student_id = ?, updated_at = datetime('now') WHERE id = ?`).bind(s.id, a.id).run();
  await audit(env, request, ctx, 'website', 'application.enrol', 'application', a.id, s.student_no);
  return json({ ok: true, student_id: s.id, student_no: s.student_no });
});

export const deleteApplication = secure({ perm: 'applications.manage' }, async ({ request, env, params, ctx }) => {
  const r = await env.DB.prepare('DELETE FROM ins_applications WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  if (!r.meta.changes) fail(404, 'The application could not be found.');
  await audit(env, request, ctx, 'website', 'application.delete', 'application', Number(params.id), null);
  return json({ ok: true });
});

export const listMessages = secure({ perm: 'applications.manage' }, async ({ env, url, ctx }) => {
  const { page, limit, offset } = paging(url, 20, 100);
  const [{ results }, total, unread] = await Promise.all([
    env.DB.prepare('SELECT id, name, email, phone, subject, message, read_at, created_at FROM ins_contact_messages WHERE institution_id = ? ORDER BY id DESC LIMIT ? OFFSET ?').bind(ctx.inst.id, limit, offset).all(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM ins_contact_messages WHERE institution_id = ?').bind(ctx.inst.id).first(),
    env.DB.prepare('SELECT COUNT(*) AS n FROM ins_contact_messages WHERE institution_id = ? AND read_at IS NULL').bind(ctx.inst.id).first(),
  ]);
  return json({ messages: results, total: total.n, unread: unread.n, page, limit });
});

export const markMessage = secure({ perm: 'applications.manage' }, async ({ request, env, params, ctx }) => {
  const b = await request.json().catch(() => ({}));
  await env.DB.prepare(`UPDATE ins_contact_messages SET read_at = ${b.unread ? 'NULL' : "datetime('now')"} WHERE id = ? AND institution_id = ?`).bind(params.id, ctx.inst.id).run();
  return json({ ok: true });
});

export const deleteMessage = secure({ perm: 'applications.manage' }, async ({ params, env, ctx }) => {
  await env.DB.prepare('DELETE FROM ins_contact_messages WHERE id = ? AND institution_id = ?').bind(params.id, ctx.inst.id).run();
  return json({ ok: true });
});

// ---------------------------------------------------------------------
// Student self-registration (home page): creates the login AND the student record in one step,
// so the new student shows up in the dashboard (Students list) straight away and can sign in.
// ---------------------------------------------------------------------
export async function publicRegisterStudent({ request, env, params }) {
  try {
    assertSameOrigin(request);
    const { i, cfg } = await publicSite(env, params.slug);
    if (parse(cfg.header, {}).allow_register === false) fail(403, 'Online registration is closed at the moment. Please contact the institution.');
    const b = await readJson(request);
    if (b.website) return json({ ok: true });                                   // honeypot
    const ip = clientIp(request);
    const recent = await env.DB.prepare(`SELECT COUNT(*) AS n FROM ins_login_attempts WHERE ip = ? AND email = '(student-signup)' AND created_at > datetime('now','-1 hour')`).bind(ip).first();
    if (ip && (recent?.n || 0) >= 4) fail(429, 'Too many registrations from this connection. Please try again later.');

    const first = V.str(b.first_name, 'First name', { required: true, max: 60 });
    const last = V.str(b.last_name, 'Last name', { required: true, max: 60 });
    const middle = V.str(b.middle_name, 'Middle name', { max: 60 });
    const email = V.email(b.email, 'Email', { required: true });
    const phone = V.str(b.phone, 'Phone number', { required: true, max: 24, min: 6 });
    if (!/^\+?[0-9][0-9 ()\-]{5,23}$/.test(phone)) fail(400, 'Please enter a valid phone number, like +255 712 345 678.');
    const password = V.password(b.password);
    if (b.password_confirm !== undefined && b.password_confirm !== b.password) fail(400, 'The two passwords do not match.');
    const gender = V.oneOf(b.gender, 'Gender', ['male', 'female']);
    let programmeId = null;
    if (b.programme_id) {
      const p = await env.DB.prepare('SELECT id FROM ins_programmes WHERE id = ? AND institution_id = ? AND active = 1').bind(Number(b.programme_id), i.id).first();
      if (!p) fail(400, 'Please choose a programme from the list.');
      programmeId = p.id;
    }
    const exists = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email).first();
    if (exists) fail(409, 'This email is already registered. Please sign in instead.');
    const dupStudent = await env.DB.prepare('SELECT id FROM ins_students WHERE institution_id = ? AND deleted_at IS NULL AND lower(email) = ?').bind(i.id, email).first();
    if (dupStudent) fail(409, 'A student with this email already exists. Please ask the institution to create your login.');

    const fullName = [first, middle, last].filter(Boolean).join(' ');
    const ctx = { inst: { id: i.id } };
    const stu = await insertStudent(env, ctx, {
      student_no: null, reg_no: null, full_name: fullName, gender, dob: null, phone, email, address: null,
      programme_id: programmeId, department_id: null, class_name: null, level: null, admission_date: todayUtc(),
      admission_info: 'Online registration (website)', status: 'active', guardian_name: null, guardian_phone: null, guardian_relation: null, notes: null,
    });
    const { hash, salt } = await hashPassword(password);
    const u = await env.DB.prepare('INSERT INTO users (name, email, password_hash, password_salt, role) VALUES (?, ?, ?, ?, ?)').bind(fullName, email, hash, salt, 'user').run();
    const userId = u.meta.last_row_id;
    await env.DB.prepare("INSERT INTO ins_members (institution_id, user_id, role, student_id) VALUES (?, ?, 'student', ?)").bind(i.id, userId, stu.id).run();
    await env.DB.prepare(`INSERT INTO ins_login_attempts (email, ip, success) VALUES ('(student-signup)', ?, 1)`).bind(ip).run();
    await audit(env, request, { inst: { id: i.id }, user: { id: userId } }, 'students', 'student.register', 'student', stu.id, `${fullName} (${stu.student_no}) registered online`);

    const { results } = await env.DB.prepare(
      `SELECT DISTINCT m.user_id FROM ins_members m WHERE m.institution_id = ? AND m.active = 1 AND m.role != 'student' AND (m.role = 'super_admin' OR EXISTS (SELECT 1 FROM ins_role_permissions rp WHERE rp.institution_id = m.institution_id AND rp.role = m.role AND rp.permission = 'students.manage')) LIMIT 20`
    ).bind(i.id).all();
    for (const m of results) {
      await env.DB.prepare(`INSERT INTO ins_notifications (institution_id, user_id, kind, title, message, link) VALUES (?, ?, 'admin', ?, ?, '#students')`)
        .bind(i.id, m.user_id, 'New student registered', `${fullName} (${stu.student_no})`).run().catch(() => {});
    }
    const cookie = await startSession(env, userId, true);
    return json({ ok: true, student_no: stu.student_no, name: fullName }, { status: 201, headers: { 'Set-Cookie': cookie } });
  } catch (e) { return errorResponse(e); }
}

// Entry page: which institution websites are live? (name + slug only)
export async function publicSites({ env }) {
  const { results } = await env.DB.prepare(
    `SELECT i.id, i.name, i.slug, i.inst_type FROM ins_institutions i JOIN ins_site_config c ON c.institution_id = i.id WHERE c.enabled = 1 ORDER BY i.name LIMIT 50`
  ).all();
  return json({ sites: results }, { headers: { 'Cache-Control': 'public, max-age=60' } });
}

// ---------------------------------------------------------------------
// Starter website (one click): a complete, professional site with photos (Unsplash) and live library
// ---------------------------------------------------------------------
const bid = () => Math.random().toString(36).slice(2, 9);
// All photos come from Unsplash (free licence). Change any of them later in the builder.
const U = (id, w = 1600) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=${w}&q=70`;
const PH = {
  graduation: '1523050854058-8df90110c9f1', library: '1481627834876-b7833e8f5570', campus: '1541339907198-e08756dedf3f',
  students: '1523240795612-9a054b0db644', study: '1522202176988-66273c2fd55f', lecture: '1524178232363-1fb2b075b655',
  classroom: '1427504494785-3a9ca7044f45', laptop: '1513258496099-48168024aec0', reading: '1456513080510-7bf3a84b82f8',
  hall: '1507842217343-583bb7270b66', books: '1497633762265-9d179a990aa6', tower: '1562774053-701939374585',
  code: '1517694712202-14dd9538aa97', business: '1454165804606-c3d57bc86b40', learning: '1503676260728-1c00da094a0b', health: '1576091160399-112ba8d25d1d',
};
const PROG_PICS = [PH.code, PH.business, PH.learning, PH.health, PH.study, PH.lecture];

export const createStarter = secure({ perm: 'site.manage' }, async ({ request, env, ctx }) => {
  const i = ctx.inst; const sw = (await request.json().catch(() => ({}))).lang === 'sw';
  const t = (en, s) => (sw ? s : en);
  const base = '/s/' + i.slug;
  const progs = (await env.DB.prepare('SELECT name, level, duration_years FROM ins_programmes WHERE institution_id = ? AND active = 1 ORDER BY name LIMIT 12').bind(i.id).all()).results;
  const progCards = (progs.length ? progs : [{ name: t('Your first programme', 'Programu yako ya kwanza') }]).map((p, n) => ({
    title: p.name, image: U(PROG_PICS[n % PROG_PICS.length], 900),
    text: [p.level, p.duration_years ? `${p.duration_years} ${t('year(s)', 'mwaka/miaka')}` : ''].filter(Boolean).join(' · ') || t('Describe this programme here.', 'Eleza programu hii hapa.'),
    link: base + '/register', link_label: t('Register', 'Jisajili'),
  }));
  const about = i.about || t(`${i.name} is committed to quality teaching, strong values and a modern learning environment where every student can succeed.`, `${i.name} imejikita katika ufundishaji bora, maadili thabiti na mazingira ya kisasa ya kujifunzia ambapo kila mwanafunzi anaweza kufanikiwa.`);
  const pages = [
    { slug: 'home', title: t('Home', 'Mwanzo'), order: 0, blocks: [
      { type: 'slider', interval: 6, height: 'tall', items: [
        { image: U(PH.graduation), title: t(`Welcome to ${i.name}`, `Karibu ${i.name}`), subtitle: about.slice(0, 180), button_label: t('Register as a student', 'Jisajili kama mwanafunzi'), button_link: base + '/register' },
        { image: U(PH.library), title: t('A modern library and e-library', 'Maktaba ya kisasa na maktaba mtandao'), subtitle: t('Search the catalogue, read e-books and reserve books from anywhere.', 'Tafuta katalogi, soma vitabu vya kidijitali na hifadhi vitabu ukiwa popote.'), button_label: t('Browse the library', 'Tazama maktaba'), button_link: base + '/library' },
        { image: U(PH.campus), title: t('Learn. Lead. Succeed.', 'Jifunze. Ongoza. Fanikiwa.'), subtitle: t('Qualified teachers, practical learning and a supportive community.', 'Walimu wenye sifa, mafunzo kwa vitendo na jamii inayosaidiana.'), button_label: t('See our programmes', 'Tazama programu zetu'), button_link: base + '/programmes' },
      ] },
      { type: 'quicklinks', items: [
        { icon: 'fa-user-plus', title: t('Student registration', 'Usajili wa mwanafunzi'), text: t('Create your account in one minute.', 'Fungua akaunti yako kwa dakika moja.'), link: base + '/register' },
        { icon: 'fa-book', title: t('Library catalogue', 'Katalogi ya maktaba'), text: t('Search every book we hold.', 'Tafuta kila kitabu tulichonacho.'), link: base + '/library' },
        { icon: 'fa-laptop', title: t('E-Library', 'Maktaba mtandao'), text: t('Read and download e-books.', 'Soma na pakua vitabu vya kidijitali.'), link: base + '/library#ebooks' },
        { icon: 'fa-gauge', title: t('Student dashboard', 'Dashibodi ya mwanafunzi'), text: t('Sign in to your records.', 'Ingia kwenye rekodi zako.'), link: '/institution-start.html?i=' + i.slug },
      ] },
      { type: 'text', heading: t(`About ${i.name}`, `Kuhusu ${i.name}`), body: about + '\n\n' + t('- Experienced and caring teachers\n- Modern library with digital resources\n- Student records and results available online', '- Walimu wenye uzoefu na kujali\n- Maktaba ya kisasa yenye rasilimali za kidijitali\n- Rekodi na matokeo ya wanafunzi yanapatikana mtandaoni'), image: U(PH.students, 1100), layout: 'right' },
      { type: 'cards', heading: t('Our programmes', 'Programu zetu'), intro: t('Choose the programme that fits your future.', 'Chagua programu inayofaa mustakabali wako.'), columns: '3', items: progCards.slice(0, 6) },
      { type: 'stats', image: U(PH.tower), items: [{ value: '1,000+', label: t('Students', 'Wanafunzi') }, { value: '60+', label: t('Teachers & staff', 'Walimu na wafanyakazi') }, { value: '10,000+', label: t('Library books', 'Vitabu vya maktaba') }, { value: '500+', label: t('E-books & notes', 'Vitabu na notisi za kidijitali') }] },
      { type: 'library', heading: t('Library & E-Library', 'Maktaba na Maktaba Mtandao'), mode: 'both', limit: 8, show_search: true },
      { type: 'steps', heading: t('How to join us', 'Jinsi ya kujiunga nasi'), items: [
        { title: t('Create your account', 'Fungua akaunti'), text: t('Fill in the short registration form.', 'Jaza fomu fupi ya usajili.') },
        { title: t('Get your student number', 'Pata namba yako'), text: t('You receive your student number immediately.', 'Unapata namba yako ya mwanafunzi papo hapo.') },
        { title: t('Open your dashboard', 'Fungua dashibodi yako'), text: t('See your records, results and library.', 'Angalia rekodi, matokeo na maktaba yako.') },
      ] },
      { type: 'news', heading: t('Latest news', 'Habari mpya'), limit: 3 },
      { type: 'events', heading: t('Upcoming events', 'Matukio yajayo'), limit: 3 },
      { type: 'gallery', heading: t('Life at our institution', 'Maisha ya chuoni'), items: [PH.classroom, PH.lecture, PH.laptop, PH.reading, PH.hall, PH.books].map((x) => ({ image: U(x, 800), caption: '' })) },
      { type: 'cta', image: U(PH.students), heading: t('Ready to start your journey?', 'Uko tayari kuanza safari yako?'), text: t('Register today and get access to your student dashboard, the library and e-library.', 'Jisajili leo upate dashibodi ya mwanafunzi, maktaba na maktaba mtandao.'), button_label: t('Register now', 'Jisajili sasa'), button_link: base + '/register' },
    ] },
    { slug: 'about', title: t('About us', 'Kuhusu sisi'), order: 10, blocks: [
      { type: 'hero', title: t('About us', 'Kuhusu sisi'), subtitle: t('Who we are and what we stand for', 'Sisi ni nani na tunasimamia nini'), image: U(PH.campus), height: 'short' },
      { type: 'text', heading: t('Our story', 'Historia yetu'), body: about + '\n\n' + t('Write when the institution started, how it has grown and what makes it special.', 'Andika taasisi ilianza lini, imekua vipi na kinachoifanya kuwa ya kipekee.'), image: U(PH.hall, 1100), layout: 'left' },
      { type: 'cards', heading: t('Vision, mission and values', 'Dira, dhima na maadili'), columns: '3', items: [{ icon: 'fa-eye', title: t('Vision', 'Dira'), text: t('Write your vision.', 'Andika dira yako.') }, { icon: 'fa-bullseye', title: t('Mission', 'Dhima'), text: t('Write your mission.', 'Andika dhima yako.') }, { icon: 'fa-heart', title: t('Values', 'Maadili'), text: t('Write your core values.', 'Andika maadili yako.') }] },
    ] },
    { slug: 'leadership', title: t('Leadership', 'Uongozi'), order: 11, parent: 'about', blocks: [
      { type: 'hero', title: t('Our leadership', 'Uongozi wetu'), subtitle: '', image: U(PH.lecture), height: 'short' },
      { type: 'leader', name: t('Name of the Principal', 'Jina la Mkuu wa Taasisi'), role: t('Principal', 'Mkuu wa Taasisi'), message: t('Write a short welcome message here. Add the Principal\'s photo with the Choose button.', 'Andika ujumbe mfupi wa kukaribisha hapa. Ongeza picha ya Mkuu wa Taasisi kwa kitufe cha Chagua.') },
    ] },
    { slug: 'programmes', title: t('Programmes', 'Programu'), order: 20, blocks: [
      { type: 'hero', title: t('Programmes and courses', 'Programu na kozi'), subtitle: t('Find the right programme for you', 'Pata programu sahihi kwako'), image: U(PH.study), height: 'short' },
      { type: 'cards', heading: '', columns: '3', items: progCards },
    ] },
    { slug: 'admissions', title: t('Admissions', 'Udahili'), order: 30, blocks: [
      { type: 'hero', title: t('Admissions', 'Udahili'), subtitle: t('Joining us is simple', 'Kujiunga nasi ni rahisi'), image: U(PH.students), height: 'short' },
      { type: 'steps', heading: t('How to register', 'Jinsi ya kujisajili'), items: [
        { title: t('Choose a programme', 'Chagua programu'), text: t('See the Programmes page.', 'Tazama ukurasa wa Programu.') },
        { title: t('Register online', 'Jisajili mtandaoni'), text: t('Fill in the registration form.', 'Jaza fomu ya usajili.') },
        { title: t('Start learning', 'Anza kujifunza'), text: t('Your dashboard is ready immediately.', 'Dashibodi yako iko tayari mara moja.') },
      ] },
      { type: 'faq', heading: t('Common questions', 'Maswali ya mara kwa mara'), items: [{ q: t('Who can register?', 'Nani anaweza kujisajili?'), a: t('Write the entry requirements here.', 'Andika vigezo vya kujiunga hapa.') }, { q: t('How much are the fees?', 'Ada ni kiasi gani?'), a: t('Write the fees here.', 'Andika ada hapa.') }, { q: t('When does the next intake start?', 'Muhula ujao unaanza lini?'), a: t('Write the dates here.', 'Andika tarehe hapa.') }] },
      { type: 'cta', image: U(PH.graduation), heading: t('Register as a student', 'Jisajili kama mwanafunzi'), text: '', button_label: t('Register now', 'Jisajili sasa'), button_link: base + '/register' },
    ] },
    { slug: 'register', title: t('Student registration', 'Usajili wa mwanafunzi'), order: 31, parent: 'admissions', blocks: [
      { type: 'register', heading: t('Student registration', 'Usajili wa mwanafunzi'), intro: t('Create your account. Your name appears in the institution dashboard straight away and you can sign in immediately.', 'Fungua akaunti yako. Jina lako litaonekana kwenye dashibodi ya taasisi mara moja na unaweza kuingia papo hapo.'),
        image: U(PH.study, 1000), benefits_text: t('Instant student number\nYour own dashboard\nAccess to the library catalogue\nRead e-books online', 'Namba ya mwanafunzi papo hapo\nDashibodi yako mwenyewe\nKatalogi ya maktaba\nSoma vitabu vya kidijitali'), success: t('Welcome! Your account is ready.', 'Karibu! Akaunti yako iko tayari.') },
    ] },
    { slug: 'library', title: t('Library', 'Maktaba'), order: 40, blocks: [
      { type: 'hero', title: t('Library & E-Library', 'Maktaba na Maktaba Mtandao'), subtitle: t('Search our catalogue, read e-books and discover new knowledge.', 'Tafuta katalogi yetu, soma vitabu vya kidijitali na gundua maarifa mapya.'), image: U(PH.library), height: 'short' },
      { type: 'library', heading: '', mode: 'both', limit: 16, show_search: true },
    ] },
    { slug: 'news', title: t('News & events', 'Habari na matukio'), order: 50, blocks: [
      { type: 'hero', title: t('News & events', 'Habari na matukio'), subtitle: '', image: U(PH.hall), height: 'short' },
      { type: 'news', heading: t('News', 'Habari'), limit: 9 }, { type: 'events', heading: t('Events', 'Matukio'), limit: 9 }, { type: 'announcements', heading: t('Announcements', 'Matangazo'), limit: 5 },
    ] },
    { slug: 'gallery', title: t('Gallery', 'Picha'), order: 60, blocks: [
      { type: 'hero', title: t('Gallery', 'Picha'), subtitle: '', image: U(PH.classroom), height: 'short' },
      { type: 'gallery', heading: '', items: [PH.classroom, PH.lecture, PH.laptop, PH.reading, PH.hall, PH.books, PH.students, PH.study, PH.campus].map((x) => ({ image: U(x, 800), caption: '' })) },
    ] },
    { slug: 'contact', title: t('Contact us', 'Wasiliana nasi'), order: 70, blocks: [
      { type: 'hero', title: t('Contact us', 'Wasiliana nasi'), subtitle: t('We would love to hear from you', 'Tungependa kusikia kutoka kwako'), image: U(PH.hall), height: 'short' },
      { type: 'contact', heading: '', intro: '', map_link: '' },
    ] },
  ];
  let created = 0; const ids = {};
  for (const p of pages) {
    const exists = await env.DB.prepare('SELECT id FROM ins_site_pages WHERE institution_id = ? AND slug = ? AND deleted_at IS NULL').bind(i.id, p.slug).first();
    if (exists) { ids[p.slug] = exists.id; continue; }
    const parentId = p.parent ? (ids[p.parent] || null) : null;
    const r = await env.DB.prepare('INSERT INTO ins_site_pages (institution_id, slug, title, blocks, parent_id, show_in_menu, menu_order, published) VALUES (?, ?, ?, ?, ?, 1, ?, 1)')
      .bind(i.id, p.slug, p.title, JSON.stringify(cleanBlocks(p.blocks.map((b) => ({ ...b, id: bid() })))), parentId, p.order).run();
    ids[p.slug] = r.meta.last_row_id; created++;
  }
  const cfg = await ensureConfig(env, i.id);
  const header = parse(cfg.header, {});
  if (!header.apply_link) {
    Object.assign(header, { show_apply: true, apply_label: t('Register', 'Jisajili'), apply_link: base + '/register', allow_register: true });
    await env.DB.prepare('UPDATE ins_site_config SET header = ? WHERE institution_id = ?').bind(JSON.stringify(header), i.id).run();
  }
  await audit(env, request, ctx, 'website', 'site.starter', 'site', i.id, `${created} pages`);
  return json({ ok: true, created });
});
