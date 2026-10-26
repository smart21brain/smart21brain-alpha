import { DatabaseSync } from 'node:sqlite';
import fs from 'node:fs';
const SITE = process.env.SITE_ROOT || new URL('../../', import.meta.url).pathname;
export function makeDb(files, log = true) {
  const raw = new DatabaseSync(':memory:');
  const errs = [];
  for (const f of files) {
    const sql = fs.readFileSync(SITE + f, 'utf8');
    try { raw.exec(sql); } catch (e) {
      // fall back to statement-by-statement so one bad ALTER does not hide the rest
      const stmts = sql.split(/;\s*\n/).map((s) => s.trim()).filter(Boolean);
      for (const s of stmts) { try { raw.exec(s); } catch (e2) { errs.push(`${f}: ${e2.message}`); } }
    }
  }
  if (log && errs.length) console.log('schema notes:', [...new Set(errs)].slice(0, 6));
  const wrap = (sql) => {
    let binds = [];
    const st = {
      bind: (...b) => { binds = b.map((x) => (x === undefined ? null : x)); return st; },
      first: async () => { const r = raw.prepare(sql).get(...binds); return r ? { ...r } : null; },
      all: async () => ({ results: raw.prepare(sql).all(...binds).map((r) => ({ ...r })) }),
      run: async () => { const r = raw.prepare(sql).run(...binds); return { meta: { last_row_id: Number(r.lastInsertRowid), changes: Number(r.changes) } }; },
    };
    return st;
  };
  return { raw, prepare: wrap, batch: async (arr) => Promise.all(arr.map((s) => s.run())) };
}
