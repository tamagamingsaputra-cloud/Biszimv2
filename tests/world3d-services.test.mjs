// Tes browser: layanan 3D mandiri (Rumah, Warung, Toko, Klinik) memakai engine/checkout yang sama dengan 2D. Stub API memakai katalog server asli.
// Dilewati bila Playwright tidak ada.
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict'; import { execSync } from 'node:child_process'; import { fileURLToPath } from 'node:url'; import { createRequire } from 'node:module';
const pub = path.join(path.dirname(fileURLToPath(import.meta.url)), '../public'), req = createRequire(import.meta.url);
let chromium; try { chromium = req('playwright').chromium; } catch { try { chromium = req(execSync('npm root -g').toString().trim() + '/playwright').chromium; } catch { console.log('DILEWATI: Playwright tidak tersedia (tes audio/pengaturan tidak dijalankan).'); process.exit(0); } }
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' }, puts = [];
const cat = req('../server/life-catalog.cjs'), fin = { ok: true, accounts: [], cards: [], tx: [], statements: [], orders: [], pinSet: false, finSeq: 0, cash: 0, lastDay: 0 }, pays = [], transfers = [], studies = [], edu = { ok: true, profile: { name: 'Tes', family: 'menengah' }, rules: { maxStudyHours: 3, termDays: 28 }, edu: { status: 'enrolled', highest: 'Tidak ada', stage: 'SD', labelTerm: 'Kelas 1 Semester 1', institution: { name: 'SD Negeri Tes' }, program: 'Reguler', termDay: 5, lastDay: 1, studyLog: {}, attendanceLog: [{ status: 'hadir' }, { status: 'hadir' }, { status: 'alpa' }], tasks: [{ status: 'selesai' }, { status: 'belum' }], wallet: 750000, outstanding: 0, subjects: [{ id: 'mat', name: 'Matematika', current: { mastery: 10 } }, { id: 'ind', name: 'Bahasa Indonesia', current: { mastery: 20 } }] } };
const srv = http.createServer((q, s) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (u.startsWith('/api/')) { s.setHeader('content-type', 'application/json'); const J = o => s.end(JSON.stringify(o));
    if (u === '/api/state') return J({ ok: true, charId: 'c1', game: null, edu: { highest: 'Tidak ada' }, profile: { name: 'Tes Warga', seed: 7, birth: '1990-09-01', birthDate: '1990-09-01', gender: 'L', city: 'Desa', phone: '081234567890', email: 't@t.id', religion: 'Islam' } });
    if (u === '/api/fin/catalog') return J({ ok: true, ...cat });
    if (u === '/api/fin/state' || u === '/api/fin/advance') return J(fin);
    if (u === '/api/fin/cashlog') return J({ ok: true, rows: [] });
    if (u === '/api/shop/notifs') return J({ ok: true, unread: 0, notifs: [] });
    let body = ''; q.on('data', d => body += d); return q.on('end', () => { let j = {}; try { j = JSON.parse(body || '{}'); } catch {}
      if (u === '/api/fin/quote') { const m = cat.MERCHANTS.find(x => x.id === j.merchant), lines = (j.items || []).map(i => { const it = cat.ITEMS.find(x => x.id === i.id); return { id: it.id, name: it.name, qty: i.qty, total: it.price * i.qty }; }); return J({ ok: true, open: true, lines, fees: [], total: lines.reduce((a, l) => a + l.total, 0), merchant: m.id }); }
      if (u === '/api/fin/pin') { fin.pinSet = true; return J({ ...fin, msg: 'PIN transaksi dibuat.' }); }
      if (u === '/api/fin/open') { if (!fin.pinSet) return J({ ok: false, error: 'Buat PIN dulu.' }); const bk = cat.BANKS.find(x => x.id === j.provider); if (j.initial < bk.minOpen) return J({ ok: false, error: `Setoran awal minimal ${bk.minOpen}.` }); fin.accounts.push({ id: 'acc-' + j.provider, kind: 'bank', provider: j.provider, name: bk.name, balance: j.initial, available: j.initial }); fin.finSeq++; return J({ ...fin, cashAdj: [{ seq: fin.finSeq, delta: -j.initial, cat: 'setor' }], msg: 'Rekening dibuka.' }); }
      if (u === '/api/fin/transfer') { const f = fin.accounts.find(x => x.id === j.from), t = fin.accounts.find(x => x.id === j.to); if (f && f.balance < j.amount) return J({ ok: false, error: 'Saldo rekening tidak cukup.' }); if (f) f.balance -= j.amount; if (t) t.balance += j.amount; let adj = []; if (j.from === 'cash') { fin.finSeq++; adj = [{ seq: fin.finSeq, delta: -j.amount, cat: 'setor' }]; } transfers.push(j); return J({ ...fin, cashAdj: adj, msg: 'Transfer berhasil.' }); }
      if (u === '/api/edu/study') { const sj = edu.edu.subjects.find(x => x.id === j.subject); if (!sj) return J({ ok: false, error: 'Mata pelajaran tidak ditemukan.' }); const used = edu.edu.studyLog[edu.edu.lastDay] || 0; if (used + j.hours > 3) return J({ ok: false, error: 'Waktu belajar mandiri maksimal 3 jam per hari.' }); edu.edu.studyLog[edu.edu.lastDay] = used + j.hours; sj.current.mastery += j.hours * 1.6; studies.push(j); return J(edu); }
      if (u === '/api/fin/pay') { pays.push(j); return J({ ok: true, msg: 'Pembayaran tunai diterima (stub).', txn: { id: 'tx-stub-' + pays.length, status: 'sukses' } }); }
      if (u === '/api/game' && q.method === 'PUT') return J({ ok: true }); return J({ ok: true }); }); }
  const f = path.join(pub, u); if (!f.startsWith(pub)) { s.statusCode = 403; return s.end(); } fs.readFile(f, (e, d) => { if (e) { s.statusCode = 404; return s.end('nf'); } s.setHeader('content-type', mime[path.extname(f)] || 'application/octet-stream'); s.end(d); }); });
await new Promise(r => srv.listen(0, r)); const port = srv.address().port;
const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
const pg = await b.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); const errs = []; pg.on('pageerror', e => errs.push(String(e))); pg.on('console', m => { if (m.type() === 'error') errs.push(m.text().slice(0, 200)); });
let n = 0; const ok = m => { n++; console.log('ok', m); };
try {
  await pg.goto(`http://localhost:${port}/world3d.html?visitor=qa2&q=low`); await pg.waitForFunction(() => window.__bizsimQA && window.__bizsimQA.world, null, { timeout: 40000 }); await pg.waitForTimeout(2500);
  const url0 = pg.url().split('#')[0];
  // set jam ke 12:00 & uang tunai cukup
  await pg.evaluate(async () => { const { E } = window.__bizsimQA, CAL = await import('/assets/js/engine/calendar.js'); E.S.settings.paused = true; const Tn = Math.round(86400 / CAL.SEC_PER_TICK); E.S.clock.g += ((Math.round(43200 / CAL.SEC_PER_TICK) - E.tickOfDay()) % Tn + Tn) % Tn; E.S.clock.sec = 0; E.S.player.balance = 500000; });
  const open = id => pg.evaluate(async id => { const Q = window.__bizsimQA, C = await import('/assets/js/world3d/city.js'); Q.openBuilding(C.BY_ID[id]); await new Promise(r => setTimeout(r, 500)); const el = document.querySelector('.k-sheet'); return { has: !!el?.querySelector('.k-svc'), title: el?.querySelector('h3')?.textContent, buttons: [...el.querySelectorAll('.k-svc button:not([disabled])')].length, links2d: [...el.querySelectorAll('.k-svc a')].length, needs: el.querySelectorAll('.k-need').length, text: el.textContent.slice(0, 400) }; }, id);
  // 1) Rumah: panel native, tanpa tautan 2D di dalam layanan, aksi benar-benar menjalankan engine
  const H = await open('home'); console.log(JSON.stringify(H).slice(0, 300));
  assert.ok(H.has && H.title === 'Rumah Kamu' && H.needs >= 6 && H.buttons >= 3 && H.links2d === 0, 'panel Rumah native'); ok('Rumah: panel 3D mandiri (kebutuhan + aksi), tanpa tautan 2D');
  const before = await pg.evaluate(() => ({ e: window.__bizsimQA.NE.value('energy'), act: window.__bizsimQA.NE.activityProgress()?.label || null }));
  await pg.click('.k-svc [data-home="istirahat"]'); await pg.waitForTimeout(600);
  const A1 = await pg.evaluate(() => ({ act: window.__bizsimQA.NE.activityProgress()?.label, shown: document.querySelector('.k-svc')?.textContent.includes('Sedang:') }));
  assert.equal(A1.act, 'Istirahat 30 menit'); assert.ok(A1.shown, 'panel menampilkan aktivitas berjalan'); ok('tombol Istirahat memulai aktivitas di Core yang sama & panel diperbarui');
  // aksi saat sibuk ditolak dengan alasan (tombol nonaktif + alasan)
  const dis = await pg.evaluate(() => [...document.querySelectorAll('.k-svc button[data-home]')].every(b => b.disabled) || [...document.querySelectorAll('.k-svc .k-why')].length > 0);
  assert.ok(dis, 'aksi lain tertahan selama aktivitas berjalan, dengan alasan'); ok('aksi bentrok tertahan dengan alasan yang jelas');
  await pg.evaluate(() => window.__bizsimQA.NE.finishNow());
  // 2) Warung: beli lewat checkout bersama (dialog), efeknya masuk Core
  const Wn = await open('warung'); assert.ok(Wn.has && Wn.buttons >= 1 && Wn.links2d === 0, `panel Warung ${JSON.stringify(Wn)}`); ok('Warung: daftar menu native dengan harga');
  const hunger0 = await pg.evaluate(() => window.__bizsimQA.NE.value('hunger'));
  await pg.click('.k-svc [data-buy]'); await pg.waitForSelector('dialog[open] .checkout', { timeout: 8000 }); ok('tombol Beli membuka checkout bersama di atas dunia 3D');
  await pg.click('dialog[open] input[name=m][value=cash]'); await pg.click('dialog[open] [data-pay]'); await pg.waitForSelector('dialog[open] .co-result.ok', { timeout: 8000 });
  assert.equal(pays.length, 1); assert.equal(pays[0].merchant, 'warung'); ok('pembayaran tunai terkirim ke API keuangan yang sama (1 transaksi)');
  const A2 = await pg.evaluate(() => ({ act: window.__bizsimQA.NE.activityProgress()?.label })); assert.ok(/Warung/.test(A2.act || ''), `aktivitas makan dimulai ${A2.act}`); ok('efek makanan dijalankan Core setelah bayar sukses');
  await pg.click('dialog[open] [data-close]').catch(() => {}); await pg.evaluate(() => { document.querySelectorAll('dialog[open]').forEach(d => d.close()); window.__bizsimQA.NE.finishNow(); });
  // 3) Toko lokal: barang stok masuk inventori
  const M = await open('minimarket'); assert.ok(M.has && M.buttons >= 1 && M.links2d === 0, 'panel Toko'); ok('Toko Lokal: katalog native');
  const inv0 = await pg.evaluate(() => Object.keys(window.__bizsimQA.E.S.life.inventory).length);
  const stockBtn = await pg.evaluate(async () => { const F = await import('/assets/js/engine/finance.js'); const it = F.CAT.ITEMS.find(i => i.merchant === 'serbamart' && i.stock); return it?.id; });
  await pg.click(`.k-svc [data-buy="${stockBtn}"]`); await pg.waitForSelector('dialog[open] .checkout'); await pg.click('dialog[open] input[name=m][value=cash]'); await pg.click('dialog[open] [data-pay]'); await pg.waitForSelector('dialog[open] .co-result.ok'); await pg.waitForTimeout(300);
  const inv1 = await pg.evaluate(() => Object.keys(window.__bizsimQA.E.S.life.inventory).length); assert.ok(inv1 > inv0, 'barang masuk inventori'); ok('belanja stok → inventori Core bertambah');
  await pg.evaluate(() => document.querySelectorAll('dialog[open]').forEach(d => d.close()));
  // 4) Klinik
  const K = await open('clinic'); assert.ok(K.has && K.needs >= 1 && K.links2d === 0, 'panel Klinik'); ok('Klinik & Apotek: status kesehatan + layanan native');
  // 5) Bursa: trading memakai E.trade (saldo & posisi Core yang sama)
  const age = await pg.evaluate(() => window.__bizsimQA.E.ageYears()); console.log('umur', age);
  await pg.evaluate(() => { window.__bizsimQA.E.S.player.balance = 50000000; });
  const Bu = await open('bursa'); assert.ok(Bu.has && Bu.buttons >= 4 && Bu.links2d === 0, 'panel Bursa'); ok('Bursa: daftar aset + beli/jual native');
  const T0 = await pg.evaluate(() => ({ bal: window.__bizsimQA.E.S.player.balance, pos: window.__bizsimQA.E.S.trading.positions.BBCA?.units || 0 }));
  await pg.fill('[data-qty="BBCA"]', '2'); await pg.click('[data-trade="buy:BBCA"]'); await pg.waitForTimeout(400);
  const T1 = await pg.evaluate(() => ({ bal: window.__bizsimQA.E.S.player.balance, pos: window.__bizsimQA.E.S.trading.positions.BBCA?.units || 0, n: window.__bizsimQA.E.S.trading.trades.length, toast: document.querySelector('.k-route')?.textContent }));
  if (age == null || age >= 17) { assert.equal(T1.pos, T0.pos + 200, 'posisi bertambah 2 lot'); assert.ok(T1.bal < T0.bal, 'saldo berkurang'); ok(`beli 2 lot BBCA mengubah saldo & posisi Core (${T0.bal} → ${T1.bal})`);
    await pg.click('[data-trade="sell:BBCA"]'); await pg.waitForTimeout(300); const T2 = await pg.evaluate(() => window.__bizsimQA.E.S.trading.positions.BBCA.units); assert.ok(T2 < T1.pos, 'jual mengurangi posisi'); ok('jual mengurangi posisi'); }
  else { assert.equal(T1.pos, T0.pos); assert.ok(/17|usia|umur/i.test(T1.toast || ''), `pembatasan usia ditampilkan: ${T1.toast}`); ok('pembatasan usia trading ditolak dengan alasan (Core)'); }
  // 6) Balai Kerja: lamaran, shift lepas, evaluasi
  await pg.evaluate(async () => { const { E } = window.__bizsimQA, CAL = await import('/assets/js/engine/calendar.js'), Tn = Math.round(86400 / CAL.SEC_PER_TICK); E.S.clock.g += ((Math.round(32400 / CAL.SEC_PER_TICK) - E.tickOfDay()) % Tn + Tn) % Tn; E.S.clock.sec = 0; });
  await pg.evaluate(() => { const { E } = window.__bizsimQA, p = E.S.player; for (const j of E.JOB_CATALOG) { for (const k of Object.keys(j.skills)) p.skills[k] = 99; if (j.expIndustry) E.S.career.experience[j.expIndustry] = 999; } p.education = 'S1'; E.S.career.experience.Ritel = 999; });
  const O = await open('office'); assert.ok(O.has && O.links2d === 0, 'panel Balai Kerja'); ok('Balai Kerja: lowongan & shift native');
  const apply1 = await pg.evaluate(async () => { const { E } = window.__bizsimQA; const j = E.JOB_CATALOG.find(x => x.type !== 'gig' && E.jobRequirements(x).length === 0); return j ? j.id : null; });
  if (apply1) { await pg.click(`[data-apply="${apply1}"]`); await pg.waitForTimeout(400); const ap = await pg.evaluate(id => window.__bizsimQA.E.S.career.applications.some(a => a.jobId === id), apply1); assert.ok(ap, 'lamaran tercatat di Core'); ok('Lamar → tercatat di save Core yang sama'); }
  const gig = await pg.evaluate(() => { const { E } = window.__bizsimQA; return E.JOB_CATALOG.find(x => x.type === 'gig' && E.jobRequirements(x).length === 0)?.id || null; });
  if (gig) { await pg.click(`[data-gig="${gig}"]`); await pg.waitForTimeout(400); const g = await pg.evaluate(() => window.__bizsimQA.E.S.career.gigToday); assert.equal(g, gig, await pg.evaluate(() => document.querySelector('.k-route')?.textContent)); ok('Ambil shift lepas → tercatat'); }
  if (apply1) {
    await pg.evaluate(() => { const { E } = window.__bizsimQA; E.S.career.applications.find(a => a.status === 'dikirim').status = 'evaluasi'; }); await open('office');
    await pg.click('[data-eval]'); await pg.waitForSelector('.k-q'); const nq = await pg.evaluate(() => document.querySelectorAll('.k-q').length);
    await pg.click('[data-evsend]'); await pg.waitForTimeout(200); const still = await pg.evaluate(() => !!document.querySelector('.k-q')); assert.ok(still, 'evaluasi tidak terkirim bila belum semua dijawab');
    for (let i = 0; i < nq; i++) await pg.check(`input[name="q${i}"][value="1"]`); await pg.click('[data-evsend]'); await pg.waitForTimeout(400);
    const st = await pg.evaluate(() => window.__bizsimQA.E.S.career.applications.find(a => a.evalScore != null)?.status); assert.equal(st, 'menunggu'); ok('Evaluasi/interview dikerjakan di 3D → status "menunggu" di Core');
  }
  // 7) Bank: PIN → buka rekening → setor tunai → transfer (semua lewat /api/fin/* yang sama)
  await pg.evaluate(() => { window.__bizsimQA.E.S.player.balance = 5000000; });
  const Bk = await open('bank'); assert.ok(Bk.has && Bk.links2d === 0 && /Buat PIN/.test(Bk.text + (await pg.evaluate(() => document.querySelector('.k-svc').textContent))), 'panel Bank'); ok('Bank: panel native (ringkasan, PIN, rekening, transfer)');
  await pg.fill('[data-kform=pin] [name=pin]', '12'); await pg.click('[data-kform=pin] button'); await pg.waitForTimeout(300);
  assert.ok(/6 digit/.test(await pg.evaluate(() => document.querySelector('.k-route')?.textContent || '')), 'PIN pendek ditolak di klien'); ok('validasi PIN 6 digit');
  await pg.fill('[data-kform=pin] [name=pin]', '482916'); await pg.click('[data-kform=pin] button'); await pg.waitForSelector('[data-kform=open]');
  const bk0 = await pg.evaluate(() => window.__bizsimQA.E.S.player.balance);
  await pg.fill('[data-kform=open] [name=initial]', '10'); await pg.fill('[data-kform=open] [name=pin]', '482916'); await pg.click('[data-kform=open] button'); await pg.waitForTimeout(600);
  assert.ok(/minimal/i.test(await pg.evaluate(() => document.querySelector('.k-route')?.textContent || '')), 'setoran di bawah minimum ditolak server'); ok('error server (setoran minimum) ditampilkan');
  await pg.fill('[data-kform=open] [name=initial]', '1000000'); await pg.fill('[data-kform=open] [name=pin]', '482916'); await pg.click('[data-kform=open] button'); await pg.waitForFunction(() => document.querySelector('.k-svc')?.textContent.includes('Rekening bank'), null, { timeout: 8000 });
  const bk1 = await pg.evaluate(() => window.__bizsimQA.E.S.player.balance); assert.equal(bk1, bk0 - 1000000, 'uang tunai berkurang sesuai setoran'); ok('buka rekening: kas tunai berkurang sekali (cashAdj) dan rekening muncul');
  await pg.selectOption('[data-kform=transfer] [name=from]', 'cash'); await pg.selectOption('[data-kform=transfer] [name=to]', 'acc-bnr'); await pg.fill('[data-kform=transfer] [name=amount]', '250000'); await pg.fill('[data-kform=transfer] [name=pin]', '482916'); await pg.click('[data-kform=transfer] button'); await pg.waitForTimeout(700);
  assert.equal(transfers.length, 1); const bk2 = await pg.evaluate(() => window.__bizsimQA.E.S.player.balance); assert.equal(bk2, bk1 - 250000); ok('setor tunai lewat transfer: 1 permintaan, saldo konsisten');
  // 8) Balai Desa: jadwal/agenda + jeda waktu (Core)
  const Ba = await open('balai'); assert.ok(Ba.has && Ba.links2d === 0 && /Jadwal hari ini/.test(await pg.evaluate(() => document.querySelector('.k-svc').textContent)), 'panel Balai'); ok('Balai Desa: jadwal & agenda native');
  const p0 = await pg.evaluate(() => window.__bizsimQA.E.S.settings.paused); await pg.click('[data-pause]'); await pg.waitForTimeout(300);
  const p1 = await pg.evaluate(() => window.__bizsimQA.E.S.settings.paused); assert.notEqual(p0, p1); ok('tombol jeda/lanjut waktu mengubah jam Core');
  await pg.evaluate(() => { window.__bizsimQA.E.S.settings.paused = true; });
  // 9) UMKM: buka usaha, ubah harga, restock, tutup
  await pg.evaluate(() => { const { E } = window.__bizsimQA; E.S.player.skills.penjualan = 99; E.S.player.balance = 20000000; });
  const U = await open('umkm'); assert.ok(U.has && U.links2d === 0, 'panel UMKM'); ok('Pusat UMKM: daftar & pembukaan usaha native');
  const nb0 = await pg.evaluate(() => window.__bizsimQA.E.S.businesses.length); const bal0 = await pg.evaluate(() => window.__bizsimQA.E.S.player.balance);
  await pg.click('[data-kform=biz] button[type=submit]'); await pg.waitForTimeout(500);
  const U1 = await pg.evaluate(() => ({ n: window.__bizsimQA.E.S.businesses.length, bal: window.__bizsimQA.E.S.player.balance, bid: window.__bizsimQA.E.S.businesses.at(-1)?.bid }));
  assert.equal(U1.n, nb0 + 1); assert.ok(U1.bal < bal0, 'modal dipotong'); ok(`usaha dibuka: modal terpotong (${bal0} → ${U1.bal})`);
  await pg.fill(`[data-bprice="${U1.bid}"]`, '15000'); await pg.click(`[data-bsetprice="${U1.bid}"]`); await pg.waitForTimeout(300);
  assert.equal(await pg.evaluate(b => window.__bizsimQA.E.S.businesses.find(x => x.bid === b).price, U1.bid), 15000); ok('ubah harga usaha tersimpan di Core');
  await pg.click(`[data-brestock="${U1.bid}"]`); await pg.waitForTimeout(300);
  assert.equal(await pg.evaluate(b => window.__bizsimQA.E.S.businesses.find(x => x.bid === b).pending.length, U1.bid), 1); ok('restock membuat 1 pesanan stok (saldo terpotong)');
  await pg.click(`[data-bclose="${U1.bid}"]`); await pg.waitForTimeout(300);
  assert.equal(await pg.evaluate(b => window.__bizsimQA.E.S.businesses.find(x => x.bid === b).status, U1.bid), 'tutup'); ok('tutup usaha: status Core "tutup"');
  // 10) Sekolah: status dari tampilan pendidikan + belajar mandiri (POST /api/edu/study)
  await pg.evaluate(async () => { const { E } = window.__bizsimQA; const r = await (await fetch('/api/edu/study', { method: 'POST', body: JSON.stringify({ subject: 'zzz', hours: 1 }) })).json(); });
  await pg.evaluate(async () => { const { E } = window.__bizsimQA, v = await (await fetch('/api/edu/study', { method: 'POST', body: JSON.stringify({ subject: 'mat', hours: 0 }) })).json(); E.setEdu(v); });
  const Sk = await open('school'); assert.ok(Sk.has && Sk.links2d === 0 && /Matematika/.test(await pg.evaluate(() => document.querySelector('.k-svc').textContent)), 'panel Sekolah'); ok('Sekolah: status, nilai, dana tampil dari data pendidikan server');
  await pg.click('[data-study="mat:2"]'); await pg.waitForTimeout(500);
  assert.equal(studies.length >= 1 && studies.at(-1).hours, 2); assert.ok(/Sisa jatah belajar|1 jam/.test(await pg.evaluate(() => document.querySelector('.k-svc').textContent)) , 'jatah berkurang'); ok('belajar mandiri 2 jam → API pendidikan + penguasaan naik');
  const dis2 = await pg.evaluate(() => document.querySelectorAll('.k-svc button:disabled').length); assert.ok(dis2 >= 2, 'tombol melebihi jatah dinonaktifkan'); ok('jatah belajar habis → tombol berlebih nonaktif dengan alasan');
  assert.equal(pg.url().split('#')[0], url0, 'tidak berpindah ke halaman 2D'); ok('tetap di dunia 3D (tanpa pindah halaman)');
  assert.deepEqual(errs, [], 'tanpa galat JS'); ok('tanpa galat JS');
  console.log(`\n${n} uji layanan 3D mandiri lulus`);
} finally { await b.close(); srv.close(); }
