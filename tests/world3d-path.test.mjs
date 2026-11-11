// Tes murni Node: rute 3D (A* + penghalusan), tanpa browser/server. Regresi bug koordinat negatif (kunci z*4096+x).
import assert from 'node:assert/strict';
import { findPath, walkable, clearAt, BUILDINGS, BY_ID, T, W, D } from '../public/assets/js/world3d/city.js';
let n = 0; const ok = m => { n++; console.log('ok', m); };
const home = BY_ID.home.door;

// 1) semua titik rute berada di dalam dunia dan bebas hambatan (jari-jari 0,2) untuk SETIAP pintu, dari beberapa titik awal
const starts = [home, ...BUILDINGS.filter(b => b.door).map(b => b.door)]; let routes = 0;
for (const s of starts) for (const b of BUILDINGS) if (b.door) {
  const r = findPath(s.x, s.z, b.door.x, b.door.z); assert.ok(r, `rute ${b.id} dari (${s.x},${s.z}) harus ada`); routes++;
  for (const q of r) { assert.ok(q.x >= T.ox && q.x < T.ox + W && q.z >= T.oz && q.z < T.oz + D, `titik di luar dunia: ${JSON.stringify(q)}`); assert.ok(clearAt(q.x, q.z, 0.2), `titik menabrak rintangan: ${JSON.stringify(q)}`); }
  const e = r[r.length - 1] || s; assert.ok(Math.hypot(e.x - b.door.x, e.z - b.door.z) < 0.8, 'rute berakhir di pintu');
}
ok(`${routes} rute pintu→pintu valid (di dalam dunia, tanpa tabrakan)`);

// 2) regresi koordinat negatif: tidak ada titik dengan x/z mustahil (mis. 4092)
let maxAbs = 0; for (const s of starts) { const r = findPath(s.x, s.z, BY_ID.bank.door.x, BY_ID.bank.door.z); for (const q of r) maxAbs = Math.max(maxAbs, Math.abs(q.x), Math.abs(q.z)); }
assert.ok(maxAbs < 60, 'koordinat jalur masuk akal'); ok('regresi kunci A* (koordinat negatif) terpenuhi');

// 3) penghalusan: jalur jauh memakai sedikit titik (bukan zig-zag per tile)
const far = findPath(home.x, home.z, BY_ID.bank.door.x, BY_ID.bank.door.z); assert.ok(far.length <= 8, `jalur ter-halus (${far.length} titik)`); ok('jalur dihaluskan (garis pandang)');

// 4) ketuk titik bebas → berhenti TEPAT di titik itu; ketuk tile terhalang → di-snap ke tile walkable TERDEKAT (euklides)
let tx = null; for (let x = -20.3; x < 20 && !tx; x += 1.7) for (let z = -12.2; z < 12; z += 1.3) if (walkable(Math.floor(x), Math.floor(z)) && clearAt(x, z, 0.3) && Math.hypot(x - home.x, z - home.z) > 6) { tx = { x, z }; break; }
const r1 = findPath(home.x, home.z, tx.x, tx.z); const e1 = r1[r1.length - 1]; assert.ok(Math.hypot(e1.x - tx.x, e1.z - tx.z) < 1e-6, 'berhenti tepat di titik ketuk'); ok('titik akhir = titik yang diketuk');
const b = BY_ID.bank, cx = b.cx, cz = b.cz; assert.ok(!walkable(Math.floor(cx), Math.floor(cz)));
const r2 = findPath(home.x, home.z, cx, cz), e2 = r2[r2.length - 1]; assert.ok(walkable(Math.floor(e2.x), Math.floor(e2.z)));
let best = Infinity; for (let x = Math.floor(cx) - 6; x <= Math.floor(cx) + 6; x++) for (let z = Math.floor(cz) - 6; z <= Math.floor(cz) + 6; z++) if (walkable(x, z)) best = Math.min(best, Math.hypot(x + 0.5 - cx, z + 0.5 - cz));
assert.ok(Math.hypot(e2.x - cx, e2.z - cz) <= best + 1e-6, 'snap ke tile walkable terdekat'); ok('tile terhalang di-snap ke yang terdekat secara euklides');

// 5) titik di luar dunia / di dalam tapak bangunan tidak menghasilkan titik rute tak valid
assert.ok(findPath(home.x, home.z, 9999, 9999) === null || findPath(home.x, home.z, 9999, 9999).every(q => walkable(Math.floor(q.x), Math.floor(q.z)))); ok('tujuan di luar dunia aman');
console.log(`\n${n} uji rute 3D lulus`);
