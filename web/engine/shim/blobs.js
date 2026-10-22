/* Pengganti @netlify/blobs untuk browser (mode lokal): menyimpan JSON di IndexedDB, cadangan memori bila IndexedDB tidak tersedia. */
const mem = new Map(); let dbp = null;
const open = () => (dbp ||= new Promise(res => { try { if (typeof indexedDB === 'undefined') return res(null); const r = indexedDB.open('bizsim-local', 1); r.onupgradeneeded = () => r.result.createObjectStore('kv'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); r.onblocked = () => res(null); } catch (e) { res(null); } }));
const run = async (mode, fn) => { const db = await open(); if (!db) return null; return new Promise((res, rej) => { const t = db.transaction('kv', mode); let out; const rq = fn(t.objectStore('kv')); if (rq) rq.onsuccess = () => { out = rq.result; }; t.oncomplete = () => res(out); t.onerror = () => rej(t.error || new Error('Penyimpanan perangkat gagal.')); t.onabort = () => rej(t.error || new Error('Penyimpanan perangkat penuh atau ditolak.')); }); };
const rd = async k => { const db = await open(); return db ? (await run('readonly', s => s.get(k))) ?? null : mem.get(k) ?? null; };
const wr = async (k, v) => { const db = await open(); if (db) await run('readwrite', s => s.put(v, k)); else mem.set(k, v); };
const rm = async k => { const db = await open(); if (db) await run('readwrite', s => s.delete(k)); else mem.delete(k); };
export function getStore() {
  return {
    async get(key) { const t = await rd(key); return t == null ? null : JSON.parse(t); },
    async setJSON(key, value, opts = {}) { if (opts.onlyIfNew && (await rd(key)) != null) return { modified: false }; await wr(key, JSON.stringify(value)); return { modified: true }; },
    async delete(key) { await rm(key); }
  };
}
