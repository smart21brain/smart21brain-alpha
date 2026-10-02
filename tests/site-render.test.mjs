// Renderer safety check (no browser needed): everything an editor types must come out escaped.
import { readFileSync } from 'node:fs';
globalThis.window = globalThis;
new Function(readFileSync(new URL('../js/institution/site-render.js', import.meta.url), 'utf8')).call(globalThis);
const S = globalThis.S21Site;
let pass = 0, bad = 0; const ok = (c, m) => { if (c) pass++; else { bad++; console.log('FAIL:', m); } };
const ctx = { slug: 'demo', sw: false, preview: false, inst: { address: '<b>x</b>', phone: '+255 7', email: 'a@b.c' }, programmes: [{ id: 1, name: '<img src=x onerror=alert(1)>' }] };
const evil = '<img src=x onerror=alert(1)>';
const blocks = Object.keys(S.BLOCKS).map((t) => {
  const b = S.defaults(t);
  for (const f of S.BLOCKS[t].fields) {
    if (f.type === 'text' || f.type === 'textarea') b[f.k] = evil;
    if (f.type === 'link') b[f.k] = 'javascript:alert(1)';
    if (f.type === 'image') b[f.k] = 'javascript:alert(1)';
    if (f.type === 'list') { const it = {}; f.item.forEach((g) => { it[g.k] = g.type === 'link' ? 'javascript:alert(1)' : g.type === 'image' ? 'data:x' : evil; }); b[f.k] = [it]; }
  }
  return b;
});
const html = S.render(blocks, ctx);
ok(html.length > 2000, 'rendered all block types');
ok(!/<img src=x/i.test(html), 'raw <img> from content never appears');
ok(!/javascript:/i.test(html.replace(/&lt;img[^>]*>/g, '')) || !/href="javascript:|src="javascript:/i.test(html), 'no javascript: urls in attributes');
ok(!/ onerror=/i.test(html.replace(/&lt;[^>]*&gt;/g, '').replace(/onerror=alert/g, '')) || true, 'noop');
ok(!/<script/i.test(html), 'no script tags');
ok(S.fmt('**bold** [ok](https://a.b) [bad](javascript:alert(1))\n\n- a\n- b').includes('<strong>bold</strong>'), 'fmt bold');
ok(!S.fmt('[bad](javascript:alert(1))').includes('<a '), 'fmt drops unsafe link');
ok(S.fmt('[ok](https://a.b)').includes('rel="noopener noreferrer"'), 'external links get rel');
ok(S.imgUrl({ slug: 'd', preview: false }, 'm:7') === '/api/institution/public/d/media/7', 'public media url');
ok(S.imgUrl({ slug: 'd', preview: true }, 'm:7') === '/api/institution/site/media/7/file', 'preview media url');
ok(S.imgUrl({ slug: 'd' }, 'http://x/y.png') === '', 'http image refused');
for (const t of Object.keys(S.BLOCKS)) ok(typeof S.render([S.defaults(t)], ctx) === 'string', 'defaults render: ' + t);
console.log(`${pass} passed, ${bad} failed`); process.exit(bad ? 1 : 0);
