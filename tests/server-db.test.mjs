// Regression test server + database: profil tersimpan & terbaca ulang, tanpa binding bernama (aman untuk libsql/Turso),
// konfigurasi Vercel yang salah menjawab JSON 503 (bukan crash), dan isolasi data antar-karakter.
// Jalankan: node tests/server-db.test.mjs
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { spawn } from 'node:child_process';
const ROOT = new URL('../', import.meta.url).pathname;

// 1) Statis: tidak ada binding SQL bernama (@x / :x / $x) di server — driver libsql/Turso menyimpan NULL tanpa error.
for (const f of ['server/server.cjs', 'server/finance.cjs']) {
  const src = fs.readFileSync(ROOT + f, 'utf8');
  const sqlLits = [...src.matchAll(/(?:prepare|exec)\(\s*([`'])([\s\S]*?)\1\s*\)/g)].map(m => m[2]);
  for (const q of sqlLits) assert.doesNotMatch(q, /[(,=\s]@[a-z_]\w*/i, `${f}: binding bernama dilarang → ${q.slice(0, 60)}`);
}

const start = (port, env) => new Promise((resolve, reject) => {
  const p = spawn('node', ['server.cjs'], { cwd: ROOT + 'server', env: { ...process.env, PORT: String(port), ...env }, stdio: ['ignore', 'pipe', 'inherit'] });
  p.stdout.on('data', d => /on :/.test(d) && resolve(p)); p.on('error', reject);
});
const call = (port, v, method, path, body) => fetch(`http://localhost:${port}${path}`, { method, headers: { 'content-type': 'application/json', ...(v ? { 'x-visitor-id': v } : {}) }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, ...(await r.json()) }));
let n = 0; const t = async (name, fn) => { await fn(); n++; console.log('ok', name); };

// 2) Vercel tanpa Turso → 503 JSON yang jelas, server tidak crash.
{
  const srv = await start(8792, { VERCEL: '1', TURSO_DATABASE_URL: '', TURSO_AUTH_TOKEN: '' });
  try {
    await t('Vercel tanpa Turso: 503 JSON jelas', async () => {
      const r = await call(8792, 'bzv-test-1234', 'GET', '/api/health');
      assert.equal(r.status, 503); assert.equal(r.ok, false); assert.equal(r.code, 'db-config'); assert.match(r.error, /TURSO_DATABASE_URL/);
    });
  } finally { srv.kill(); }
}

// 3) Server lokal: alur profil end-to-end.
const DB = '/tmp/bizsim-server-test.db'; for (const f of [DB, DB + '-wal', DB + '-shm']) fs.rmSync(f, { force: true });
const srv = await start(8793, { BIZSIM_DB: DB });
const P = 8793, V = 'bzv-uji-profil-0001';
const body = { name: 'Sari Wulandari', birthDate: '2019-07-14', family: 'menengah', city: 'Pacitan', gameDay: 0 };
try {
  await t('health: skema siap', async () => { const r = await call(P, null, 'GET', '/api/health'); assert.equal(r.status, 200); assert.equal(r.schema, true); });
  await t('POST /api/profile menyimpan dan membaca ulang (tidak 500)', async () => {
    const r = await call(P, V, 'POST', '/api/profile', body);
    assert.equal(r.status, 200, r.error); assert.ok(r.ok); assert.match(r.charId, /^CHR-/); assert.equal(r.profile.name, 'Sari Wulandari'); assert.ok(r.edu && r.edu.status === 'not-enrolled');
    const s = await call(P, V, 'GET', '/api/state'); assert.equal(s.charId, r.charId); assert.equal(s.profile.city, 'Pacitan');
  });
  await t('baris database tidak berisi NULL', async () => {
    const { createRequire } = await import('node:module');
    const Database = createRequire(ROOT + 'server/server.cjs')('better-sqlite3');
    const row = new Database(DB, { readonly: true }).prepare('SELECT visitor, char_id, profile, edu FROM players WHERE visitor=?').get(V);
    assert.ok(row && row.visitor && row.char_id && row.profile && row.edu);
  });
  await t('validasi: nama pendek, tanggal lahir, usia', async () => {
    assert.equal((await call(P, V, 'POST', '/api/profile', { ...body, name: 'A' })).status, 400);
    assert.equal((await call(P, V, 'POST', '/api/profile', { ...body, birthDate: '2000-01-01' })).status, 400);
    assert.equal((await call(P, V, 'POST', '/api/profile', { ...body, birthDate: 'x' })).status, 400);
  });
  await t('PATCH profil tersimpan; pemain lain tidak terpengaruh', async () => {
    const r = await call(P, V, 'PATCH', '/api/profile', { nickname: 'Sar', city: 'Malang' }); assert.ok(r.ok); assert.deepEqual(r.changed.sort(), ['city', 'nickname']);
    const o = await call(P, 'bzv-orang-lain-9999', 'GET', '/api/state'); assert.equal(o.profile, null);
  });
  await t('karakter baru tidak mewarisi ijazah/riwayat karakter lama', async () => {
    const { createRequire } = await import('node:module');
    const Database = createRequire(ROOT + 'server/server.cjs')('better-sqlite3');
    const w = new Database(DB); const old = (await call(P, V, 'GET', '/api/state')).charId;
    w.prepare('INSERT INTO records (id,visitor,char_id,payload,created_at) VALUES (?,?,?,?,?)').run('BZS-OLD-1', V, old, JSON.stringify({ recordId: 'BZS-OLD-1' }), 1);
    assert.equal((await call(P, V, 'GET', '/api/state')).records.length, 1);
    const fresh = await call(P, V, 'POST', '/api/profile', { ...body, name: 'Karakter Baru' });
    assert.notEqual(fresh.charId, old); assert.equal(fresh.records.length, 0);
  });
  await t('permintaan rusak menghasilkan JSON, bukan HTML', async () => {
    const r = await fetch(`http://localhost:${P}/api/profile`, { method: 'POST', headers: { 'content-type': 'application/json', 'x-visitor-id': V }, body: '{rusak' });
    assert.equal(r.status, 400); assert.equal((await r.json()).ok, false);
    const nf = await call(P, V, 'GET', '/api/tidak-ada'); assert.equal(nf.status, 404); assert.equal(nf.ok, false);
  });
  await t('POST tanpa body tidak membuat server crash', async () => {
    const r = await fetch(`http://localhost:${P}/api/edu/advance`, { method: 'POST', headers: { 'x-visitor-id': V } }); assert.ok(r.status < 500); await r.json();
  });
} finally { srv.kill(); }

console.log(`${n} uji server/database lulus`);
