// Tes browser (Playwright + Chromium): ketukan, rute, ganti tujuan, tabrakan NPC/kendaraan. Server statis dibuat sendiri (tanpa express).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public'), req = createRequire(import.meta.url);
let chromium; try { chromium = req('playwright').chromium; } catch { try { chromium = req(execSync('npm root -g').toString().trim() + '/playwright').chromium; } catch { console.log('DILEWATI: Playwright tidak tersedia di lingkungan ini (tes ketukan/tabrakan tidak dijalankan).'); process.exit(0); } }
const HARNESS = `<!doctype html><meta charset=utf-8><style>html,body{margin:0;height:100%}canvas{width:100vw;height:100vh;display:block;touch-action:none}</style><canvas id=cv></canvas>
<script type=module>import{createWorld}from'/assets/js/world3d/world.js';window.__ev=[];window.NR=0;const w=createWorld(document.getElementById('cv'),{quality:'low',hourFn:()=>12,onBuilding:(b,a)=>__ev.push({id:b.id,a}),onNoRoute:()=>NR++});window.W=w;w.start(()=>12);window.READY=true;</script>`;
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]); if (u === '/__h.html') { s.setHeader('content-type', 'text/html'); return s.end(HARNESS); }
  const f = path.join(pub, u); if (!f.startsWith(pub)) { s.statusCode = 403; return s.end(); } fs.readFile(f, (e, d) => { if (e) { s.statusCode = 404; return s.end('nf'); } s.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); s.end(d); }); });
await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const pg = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true }); const errs = []; pg.on('pageerror', e => errs.push(String(e)));
let n = 0; const ok = m => { n++; console.log('ok', m); };
try {
  await pg.goto(`http://localhost:${port}/__h.html`); await pg.waitForFunction(() => window.READY, null, { timeout: 30000 }); await pg.waitForTimeout(1200);
  const R = await pg.evaluate(async () => {
    W.setQuality('high'); const C = await import('/assets/js/world3d/city.js'), cv = W.canvas, r = cv.getBoundingClientRect(), sleep = ms => new Promise(x => setTimeout(x, ms)), out = { err: [], reached: 0, tried: 0, inside: 0, door: 0, doorOk: 0 };
    const tap = (x, z) => { const q = W.project(x, 0, z), ev = t => new PointerEvent(t, { clientX: r.left + q.x, clientY: r.top + q.y, pointerId: 1, pointerType: 'touch', bubbles: true, isPrimary: true }); cv.dispatchEvent(ev('pointerdown')); cv.dispatchEvent(ev('pointerup')); };
    const vis = (x, z) => { const q = W.project(x, 0, z); return q.x > 25 && q.x < r.width - 25 && q.y > 25 && q.y < r.height - 25; };
    const spots = []; for (let x = -26; x < 28; x += 2.3) for (let z = -15; z < 17; z += 2.1) if (C.walkable(Math.floor(x), Math.floor(z)) && C.clearAt(x, z, 0.3)) spots.push({ x, z });
    const isDoor = d => Object.values(C.BY_ID).some(bb => bb.door && Math.hypot(bb.door.x - d.x, bb.door.z - d.z) < 0.6);
    const gapTo = q => { let cx = q.mesh.position.x, cz = q.mesh.position.z; if (q.hl) { const ux = q.b.x - q.a.x, uz = q.b.z - q.a.z, L = Math.hypot(ux, uz) || 1, tt = Math.max(-q.hl, Math.min(q.hl, ((W.player.position.x - cx) * ux + (W.player.position.z - cz) * uz) / L)); cx += ux / L * tt; cz += uz / L * tt; } return Math.hypot(W.player.position.x - cx, W.player.position.z - cz) - (0.28 + q.r); };
    // A) ketukan ke tanah: tujuan = titik ketukan (±0,35), sampai, tidak pernah menembus rintangan
    let i = 0; for (const s of spots.filter((_, k) => k % 7 === 0).slice(0, 16)) {
      W.player.position.set(s.x, 0, s.z); const t = spots[(i++ * 17 + 5) % spots.length]; W.target.x = (s.x + t.x) / 2; W.target.z = (s.z + t.z) / 2; await sleep(150); if (!vis(t.x, t.z)) continue;
      __ev.length = 0; tap(t.x, t.z); const d = W.destination; if (!d) continue; out.tried++;
      if (isDoor(d) && Math.hypot(d.x - t.x, d.z - t.z) > 0.6) { out.door++; const t0 = performance.now(); while (performance.now() - t0 < 120000 && !__ev.some(e => e.a)) { await sleep(80); if (!C.clearAt(W.player.position.x, W.player.position.z, 0.12)) out.inside++; const q = W.qa; if (!q.moving && q.act <= 0 && !q.pending && !__ev.some(e => e.a)) break; } if (__ev.some(e => e.a)) out.doorOk++; continue; }
      out.err.push(+Math.hypot(d.x - t.x, d.z - t.z).toFixed(2)); const t0 = performance.now(); let ok = false;
      while (performance.now() - t0 < 120000) { await sleep(80); if (!C.clearAt(W.player.position.x, W.player.position.z, 0.12)) out.inside++; if (Math.hypot(W.player.position.x - t.x, W.player.position.z - t.z) < 0.4) { ok = true; break; } if (!W.qa.moving) break; } if (ok) out.reached++; else (out.fail ||= []).push({ s, t, q: W.qa, pos: [+W.player.position.x.toFixed(1), +W.player.position.z.toFixed(1)] });
    }
    // B) ganti tujuan saat berjalan
    const a = spots[3], b1 = spots[40], b2 = spots[90]; W.player.position.set(a.x, 0, a.z); W.target.x = a.x; W.target.z = a.z; W.recenter(); await sleep(150);
    W.walkTo(b1.x, b1.z); await sleep(700); const d1 = W.destination; W.walkTo(b2.x, b2.z); const d2 = W.destination; out.swap = { changed: !!d1 && !!d2 && Math.hypot(d1.x - d2.x, d1.z - d2.z) > 0.5, toNew: Math.hypot(d2.x - b2.x, d2.z - b2.z) < 0.6 };
    // C) tabrakan: karakter berjalan acak ±25 dtk; jarak ke SETIAP NPC/kendaraan tidak boleh < jari-jari gabungan − 0,08
    let minGap = 9, frames = 0; for (let k = 0; k < 12; k++) { const t = spots[(k * 29 + 11) % spots.length]; W.walkTo(t.x, t.z); const t0 = performance.now(); while (performance.now() - t0 < 2400) { await sleep(40); frames++; for (const q of [...W.actors.peds, ...W.actors.cars]) minGap = Math.min(minGap, gapTo(q)); } }
    out.minGap = +minGap.toFixed(2); out.frames = frames;
    // D) karakter DIAM dengan kendaraan dipaksa menumpuk → didorong keluar
    W.walkTo(W.player.position.x, W.player.position.z); await sleep(150);
    const car = W.actors.cars[0]; car.v = 0; await sleep(250); const cp = car.mesh.position; W.player.position.set(cp.x + 0.2, 0, cp.z); await sleep(500);
    out.pushGap = +gapTo(car).toFixed(2);
    // F) head-on: mobil DIAM tepat di jalur → karakter menyelip dan tetap sampai (tanpa menyerah, tanpa menembus)
    out.head = [];
    for (const ci of [1, 2, 3]) { const car2 = W.actors.cars[ci]; if (!car2) continue; car2.v = 0; await sleep(250); const cp2 = car2.mesh.position, dx = car2.b.x - car2.a.x, dz = car2.b.z - car2.a.z, L = Math.hypot(dx, dz), ux = dx / L, uz = dz / L;
      const st = { x: cp2.x - ux * 5, z: cp2.z - uz * 5 }, tg = { x: cp2.x + ux * 5, z: cp2.z + uz * 5 }; if (!C.clearAt(st.x, st.z, 0.3) || !C.clearAt(tg.x, tg.z, 0.3)) { out.head.push('lewati'); continue; }
      W.player.position.set(st.x, 0, st.z); const nr = NR; W.walkTo(tg.x, tg.z); let gap = 9, done = false; const t0 = performance.now();
      while (performance.now() - t0 < 120000) { await sleep(60); gap = Math.min(gap, gapTo(car2)); if (!C.clearAt(W.player.position.x, W.player.position.z, 0.12)) out.inside++; if (Math.hypot(W.player.position.x - tg.x, W.player.position.z - tg.z) < 0.5) { done = true; break; } if (!W.qa.moving) break; }
      out.head.push({ done, gap: +gap.toFixed(2), gaveUp: NR > nr }); }
    // G) mengetuk tempat lain saat jeda interaksi (tiba di bangunan) → interaksi dibatalkan, tanpa galat
    { const bk = C.BY_ID.bank; W.player.position.set(bk.door.x, 0, bk.door.z + 2); W.target.x = bk.door.x; W.target.z = bk.door.z; __ev.length = 0; W.goBuilding('bank'); const t0 = performance.now(); while (W.qa.act <= 0 && performance.now() - t0 < 30000) await sleep(30);
      out.actStarted = W.qa.act > 0; const el = C.BY_ID.home.door; W.walkTo(el.x, el.z); await sleep(1800); out.cancelled = !__ev.some(e => e.a && e.id === 'bank'); }
    // E) tujuan mustahil → pemberitahuan, tidak crash
    out.nr0 = NR; W.walkTo(9999, 9999); out.nr1 = NR; return out;
  });
  console.log(JSON.stringify(R));
  if (R.fail) console.log('GAGAL-TUJUAN', JSON.stringify(R.fail));
  assert.ok(R.tried >= 5, `cukup percobaan ketukan tanah (${R.tried})`); assert.ok(R.err.every(e => e < 0.35), 'tujuan = titik ketukan'); ok(`ketukan tanah akurat (${R.err.length} percobaan, galat maks ${Math.max(...R.err)})`);
  assert.equal(R.reached, R.err.length, 'karakter sampai ke setiap tujuan'); ok('karakter sampai ke tujuan');
  assert.equal(R.inside, 0, 'tidak pernah masuk rintangan'); ok('tidak pernah menembus bangunan/pohon/kolam');
  assert.equal(R.doorOk, R.door, 'ketukan bangunan berjalan ke pintu & memicu interaksi'); ok(`ketukan bangunan → pintu → interaksi (${R.door})`);
  assert.ok(R.swap.changed && R.swap.toNew, 'ganti tujuan saat berjalan'); ok('tujuan dapat diganti saat berjalan');
  assert.ok(R.minGap >= -0.08, `tidak menembus NPC/kendaraan (celah min ${R.minGap})`); ok(`tidak menembus NPC/kendaraan (${R.frames} sampel, celah min ${R.minGap})`);
  assert.ok(R.pushGap >= -0.06 && R.pushGap < 0.2, `karakter diam didorong keluar dari kendaraan diam (celah ${R.pushGap})`); ok('tabrakan juga berlaku saat karakter diam');
  assert.ok(R.head.some(h => h.done !== undefined), 'skenario head-on dijalankan'); for (const h of R.head) if (h !== 'lewati') { assert.ok(h.done && !h.gaveUp, `menyelip mobil diam hingga tujuan ${JSON.stringify(h)}`); assert.ok(h.gap >= -0.08, 'tidak menembus mobil diam'); } ok(`menyelip kendaraan yang menghalangi (${R.head.filter(h => h !== 'lewati').length} skenario)`);
  assert.ok(R.actStarted && R.cancelled, `ketukan saat jeda interaksi membatalkan interaksi ${R.actStarted}/${R.cancelled}`); ok('ketukan saat jeda interaksi → batal, tanpa galat');
  assert.ok(R.nr1 > R.nr0, 'tujuan mustahil memberi umpan balik'); ok('tujuan mustahil → umpan balik, tanpa crash');
  assert.deepEqual(errs, [], 'tanpa galat JS'); ok('tanpa galat JS');
  console.log(`\n${n} uji input/tabrakan 3D lulus`);
} finally { await b.close(); srv.close(); }
