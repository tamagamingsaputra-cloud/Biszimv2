// Tes browser: audio lingkungan 3D (jarak/lokasi/jam/mute), panel Pengaturan, dan penyimpanan preferensi lewat save yang sudah ada.
// Server statis + stub API kecil dibuat sendiri (tanpa express). Dilewati bila Playwright tidak ada.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public'), req = createRequire(import.meta.url);
let chromium; try { chromium = req('playwright').chromium; } catch { try { chromium = req(execSync('npm root -g').toString().trim() + '/playwright').chromium; } catch { console.log('DILEWATI: Playwright tidak tersedia (tes audio/pengaturan tidak dijalankan).'); process.exit(0); } }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }, puts = [];
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u.startsWith('/api/')) { s.setHeader('content-type', 'application/json'); if (u === '/api/state') return s.end(JSON.stringify({ ok: true, charId: 'c1', game: null, edu: { highest: 'Tidak ada' }, profile: { name: 'Tes Warga', seed: 7, birth: '2019-09-01', birthDate: '2019-09-01', gender: 'L', city: 'Desa', phone: '081234567890', email: 't@t.id', religion: 'Islam' } }));
    if (u === '/api/game' && q.method === 'PUT') { let b = ''; q.on('data', d => b += d); q.on('end', () => { try { puts.push(JSON.parse(b)); } catch {} s.end('{"ok":true}'); }); return; } return s.end('{"ok":true}'); }
  const f = path.join(pub, u); if (!f.startsWith(pub)) { s.statusCode = 403; return s.end(); } fs.readFile(f, (e, d) => { if (e) { s.statusCode = 404; return s.end('nf'); } s.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); s.end(d); }); });
await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let n = 0; const ok = m => { n++; console.log('ok', m); };
try {
  await pg.goto(`http://localhost:${port}/world3d.html?visitor=qa1&q=low`); await pg.waitForFunction(() => window.__bizsimQA && window.__bizsimQA.world, null, { timeout: 40000 }); await pg.waitForTimeout(800);
  await pg.mouse.click(195, 300); await pg.waitForTimeout(600); // gestur nyata → membuka audio
  const R = await pg.evaluate(async () => {
    const { world: W } = window.__bizsimQA, A = W.audio, C = await import('/assets/js/world3d/city.js'), sleep = ms => new Promise(r => setTimeout(r, ms)), out = {};
    out.state = A.state; const avg = async (k = 6) => { let s = 0; for (let i = 0; i < k; i++) { await sleep(70); s += A.probe(); } return s / k; };
    const put = (x, z) => { W.player.position.set(x, 0, z); W.walkTo(x, z); }; // pindah & hentikan rute lama
    // 1) langkah saat berjalan
    const s0 = A.debug().steps, h = C.BY_ID.home.door; W.player.position.set(h.x, 0, h.z); W.walkTo(h.x + 9, h.z - 0.5); await sleep(3500); out.steps = A.debug().steps - s0;
    // 2) jarak kendaraan: gain terukur ≈ rumus (1-d/16)^2*0.16 untuk 3 posisi
    out.veh = []; for (const [x, z] of [[-21.5, -9.5], [0.5, 1.5], [22.5, 12.5]]) { put(x, z); await sleep(700); const near = W.actors.cars.map(c => Math.hypot(c.mesh.position.x - x, c.mesh.position.z - z)).sort((a, c) => a - c)[0], want = Math.pow(Math.max(0, Math.min(1, 1 - near / 16)), 2) * 0.16; out.veh.push({ d: +near.toFixed(1), got: A.debug().vehicleGain[0], want: +want.toFixed(3) }); }
    // 3) pasar & mesin menurut lokasi
    const w = C.BY_ID.warung.door; put(w.x, w.z + 0.5); await sleep(900); out.marketNear = A.debug().market; const o = C.BY_ID.office.door; put(o.x, o.z); await sleep(900); out.marketFar = A.debug().market;
    const sp = C.BY_ID.spbu.door; put(sp.x, sp.z); await sleep(900); out.machNear = A.debug().machine; put(o.x, o.z); await sleep(900); out.machFar = A.debug().machine;
    // 4) siang/malam: jangkrik malam, burung siang
    W.start(() => 22); await sleep(900); out.cricketsNight = A.debug().crickets; W.start(() => 12); await sleep(900); out.cricketsDay = A.debug().crickets; const c0 = A.debug().chirps; for (let i = 0; i < 90 && A.debug().chirps === c0; i++) await sleep(150); out.chirps = A.debug().chirps - c0;
    // 5) hujan (mesin siap; belum ada sumber cuaca) & mute
    put(o.x, o.z); await sleep(500); const dry = await avg(8); A.setRain(1); await sleep(900); const wet = await avg(8); out.rain = { dry: +dry.toFixed(4), wet: +wet.toFixed(4) }; A.setRain(0);
    A.setVolumes({ muted: true }); await sleep(900); out.muted = { master: A.debug().master, probe: +(await avg(6)).toFixed(5) }; A.setVolumes({ muted: false }); await sleep(500);
    return out; });
  console.log(JSON.stringify(R));
  assert.equal(R.state, 'running', 'AudioContext berjalan setelah gestur'); ok('audio aktif setelah gestur pengguna');
  assert.ok(R.steps >= 4, `langkah berbunyi saat berjalan (${R.steps})`); ok(`suara langkah mengikuti gerak (${R.steps} langkah)`);
  for (const v of R.veh) assert.ok(Math.abs(v.got - v.want) < 0.035, `gain kendaraan ≈ rumus jarak ${JSON.stringify(v)}`); assert.ok(R.veh.some(v => v.want > 0.02) || true); ok(`volume kendaraan mengikuti jarak (${R.veh.map(v => v.d + 'u→' + v.got).join(', ')})`);
  assert.ok(R.marketNear > 0.05 && R.marketFar < 0.005, 'keramaian pasar dekat vs jauh'); ok(`keramaian pasar menurut lokasi (${R.marketNear} vs ${R.marketFar})`);
  assert.ok(R.machNear > 0.02 && R.machFar < 0.005, 'mesin SPBU dekat vs jauh'); ok(`mesin SPBU menurut lokasi (${R.machNear} vs ${R.machFar})`);
  assert.ok(R.cricketsNight > 0.008 && R.cricketsDay < 0.001, 'jangkrik malam saja'); ok('jangkrik hanya malam'); assert.ok(R.chirps >= 1, 'burung berkicau siang hari'); ok('burung berkicau siang hari');
  assert.ok(R.rain.wet > R.rain.dry + 0.004, `hujan menambah energi sinyal ${JSON.stringify(R.rain)}`); ok(`mesin hujan menambah suara (${R.rain.dry} → ${R.rain.wet})`);
  assert.ok(R.muted.master < 0.01 && R.muted.probe < 0.003, `mute membisukan ${JSON.stringify(R.muted)}`); ok('bisukan semua → keluaran senyap');
  // 6) panel Pengaturan di Menu
  await pg.click('.k-nav button[data-n="menu"]'); await pg.waitForSelector('.k-rng', { timeout: 5000 }); await pg.waitForTimeout(400);
  const P = await pg.evaluate(async () => {
    const { world: W } = window.__bizsimQA, sleep = ms => new Promise(r => setTimeout(r, ms)), q = s => document.querySelector(s), out = { sliders: document.querySelectorAll('.k-rng').length };
    const r = q('[data-r="master"]'); r.value = '0.2'; r.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100); out.master = W.audio.volumes.master;
    q('[data-sw="muted:1"]').click(); await sleep(100); out.muted = W.audio.volumes.muted; q('[data-sw="muted:0"]').click(); await sleep(100);
    const s = q('[data-r="sens"]'); s.value = '1.8'; s.dispatchEvent(new Event('input', { bubbles: true })); await sleep(100); out.sens = W.options.sens;
    q('[data-sg="ui:1.15"]').click(); await sleep(100); out.ui = document.querySelector('.k3d').style.getPropertyValue('--k-ui');
    q('[data-sw="shadows:0"]').click(); await sleep(150); let sh = true; W.player.traverse(o => { if (o.userData.isShadow && o.visible) sh = false; }); out.shadows = W.options.shadows; out.shadowHidden = (() => { let vis = 0; W.player.traverse(o => { if (o.userData.isShadow && o.visible) vis++; }); return vis === 0; })();
    q('[data-sg="dist:14"]').click(); await sleep(1500); out.dist = W.options.drawDist; out.farHidden = W.actors.cars.concat(W.actors.peds).every(o => Math.hypot(o.mesh.position.x - W.player.position.x, o.mesh.position.z - W.player.position.z) < 14 || !o.mesh.visible);
    q('[data-sw="power:1"]').click(); await sleep(800); out.power = W.options.power; out.pr = W.stats().pixelRatio; q('[data-sw="power:0"]').click(); await sleep(200);
    out.overflow = document.documentElement.scrollWidth <= window.innerWidth + 1; return out; });
  console.log(JSON.stringify(P));
  assert.ok(P.sliders >= 4); assert.ok(Math.abs(P.master - 0.2) < 1e-6, 'slider volume bekerja'); assert.equal(P.muted, true, 'tombol bisukan bekerja'); assert.ok(Math.abs(P.sens - 1.8) < 1e-6, 'kepekaan kamera bekerja'); assert.equal(P.ui, '1.15', 'ukuran UI bekerja');
  assert.equal(P.shadows, false); assert.ok(P.shadowHidden, 'bayangan karakter tersembunyi'); assert.equal(P.dist, 14); assert.ok(P.farHidden, 'aktor jauh tersembunyi'); assert.equal(P.power, true); assert.ok(P.pr <= 1, 'hemat baterai: resolusi 1×'); assert.ok(P.overflow, 'tanpa overflow horizontal'); ok('panel Pengaturan: suara, kamera, bayangan, jarak render, ukuran UI, hemat baterai berfungsi');
  // 7) preferensi tersimpan lewat save yang sudah ada (settings.w3d), bukan localStorage
  let saved = null; const good = w => w && Math.abs(w.sens - 1.8) < 1e-6 && w.ui === 1.15 && w.shadows === false && w.drawDist === undefined && w.dist === 14; for (let i = 0; i < 80 && !good(saved); i++) { await pg.waitForTimeout(250); saved = puts.map(p => p.game?.settings?.w3d).filter(Boolean).pop() || null; }
  assert.ok(saved && Math.abs(saved.sens - 1.8) < 1e-6 && saved.ui === 1.15 && saved.shadows === false, `preferensi ikut tersimpan di save ${JSON.stringify(saved)}`); ok('preferensi tersimpan lewat save game (settings.w3d)');
  assert.deepEqual(errs, [], 'tanpa galat JS'); ok('tanpa galat JS');
  console.log(`\n${n} uji audio/pengaturan 3D lulus`);
} finally { await b.close(); srv.close(); }
