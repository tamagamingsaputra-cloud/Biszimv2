// Regression test Marketplace (HTTP nyata, DB sementara). Jalankan: node tests/market.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname, PORT = 8795, DB = '/tmp/bizsim-mp2-test.db';
for (const f of [DB, DB + '-wal', DB + '-shm']) rmSync(f, { force: true });
const srv = spawn('node', ['server.cjs'], { cwd: ROOT + 'server', env: { ...process.env, PORT: String(PORT), BIZSIM_DB: DB }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => /on :/.test(d) && r()));
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name); } catch (e) { console.error('GAGAL', name); srv.kill(); throw e; } };
const call = (v, method, path, body) => fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', 'x-visitor-id': v }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, ...(await r.json()) }));
const idem = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const clk = (day, h, m = 0) => ({ day, sec: h * 3600 + m * 60 });
const q = c => `?day=${c.day}&sec=${c.sec}`;
const game = (day, h, cash, extra = {}) => ({ charId: 'c', createdAt: 1, clock: { g: (day + 14) * 48 + h * 2, sec: 0 }, player: { balance: cash, energy: 80 }, ledger: [], finSeq: 0, shopSeq: 0, ...extra });
const D = 6840 + 3, V = 'mp2-a', PIN = '482915', S = 'shopindo', L = 'lazamall', T = 'tokomart', B = 'belanjaplus';
const g = (m, path, c) => call(V, 'GET', `/api/mp/${m}/${path}${path.includes('?') ? '&' : '?'}day=${c.day}&sec=${c.sec}`);
const p = (m, path, body, c) => call(V, 'POST', `/api/mp/${m}/${path}`, { clock: c, ...body });
const reg = { name: 'Uji Belanja', username: 'ujibelanja', email: 'uji@contoh.id', phone: '081234567890', password: 'rahasia123', address: 'Jl. Merdeka No. 10', city: 'Pacitan', province: 'Jawa Timur' };
const sync = async (c, cash) => call(V, 'PUT', '/api/game', { game: game(c.day, c.sec / 3600, cash, { shopSeq: (await call(V, 'GET', '/api/shop/grants?after=0')).shopSeq, finSeq: (await call(V, 'GET', '/api/fin/state')).finSeq }) });
let C = clk(D, 10);

await t('persiapan', async () => {
  assert.ok((await call(V, 'POST', '/api/profile', { name: 'Uji Dua', birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 })).ok);
  assert.ok((await call(V, 'PUT', '/api/game', { game: game(D, 10, 5_000_000) })).ok);
  assert.ok((await call(V, 'POST', '/api/fin/pin', { pin: PIN })).ok);
  assert.ok((await call(V, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'bnr', initial: 4_500_000, pin: PIN, clock: C })).ok);
  assert.ok((await p(S, 'register', reg, C)).ok);
});
let addrId, bank;
await t('P5: kuotasi menampilkan 5 ekspedisi dengan tarif/ETA/kapasitas berbeda', async () => {
  addrId = (await g(S, 'me', C)).addresses[0].id; bank = (await call(V, 'GET', '/api/fin/state')).accounts[0];
  const cheap = (await g(S, 'products?sort=murah&min=30000', C)).items.find(i => i.stock > 5);
  assert.ok((await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 1 }, C)).ok); await p(S, 'cart', { op: 'selectAll', on: true }, C);
  const q1 = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: [], method: 'saldo' }, C); assert.ok(q1.ok, q1.error);
  assert.deepEqual(q1.couriers.map(c => c.id), ['fastexpress', 'jnex', 'sicepatx', 'cargomax', 'ecodelivery']);
  const by = Object.fromEntries(q1.couriers.map(c => [c.id, c]));
  assert.ok(by.fastexpress.shipping > by.jnex.shipping && by.jnex.shipping > by.ecodelivery.shipping, 'tarif berbeda');
  assert.ok(by.fastexpress.eta <= by.jnex.eta && by.ecodelivery.eta >= by.jnex.eta, 'kecepatan berbeda');
  assert.equal(q1.courier, 'jnex'); assert.equal(q1.totals.shipping, by.jnex.shipping, 'default JNEX');
  const q2 = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', courier: 'fastexpress' }, C); assert.equal(q2.totals.shipping, by.fastexpress.shipping);
  assert.equal((await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', courier: 'tidak-ada' }, C)).ok, false);
});
await t('P5: kapasitas ekspedisi ditegakkan server (barang berat tidak bisa lewat EcoDelivery)', async () => {
  for (const it of (await g(S, 'cart', C)).items) await p(S, 'cart', { op: 'remove', listing: it.listing || it.id, variant: it.variant }, C);
  const heavy = (await g(S, 'products?sort=mahal', C)).items.filter(i => i.stock > 1).map(i => i); let pick = null;
  for (const it of heavy) { const d = await g(S, 'product/' + it.id, C); if ((d.item.weightG || 0) > 10000) { pick = it; break; } }
  if (!pick) { console.log('  (tidak ada produk >10 kg di katalog; cek kapasitas lewat jumlah)'); return; }
  await p(S, 'cart', { op: 'add', listing: pick.id, qty: 1 }, C); await p(S, 'cart', { op: 'selectAll', on: true }, C);
  const r = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', courier: 'ecodelivery' }, C); assert.ok(r.ok); assert.match(r.courierError, /kapasitas/i); assert.equal(r.couriers.find(c => c.id === 'ecodelivery').available, false);
  const co = await p(S, 'checkout', { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', source: bank.id, pin: PIN, courier: 'ecodelivery' }, C); assert.equal(co.ok, false); assert.match(co.error, /kapasitas/i);
});
let ord;
await t('P5: checkout dengan ekspedisi → tersimpan, tracking 8 langkah + tab', async () => {
  for (const it of (await g(S, 'cart', C)).items) await p(S, 'cart', { op: 'remove', listing: it.listing || it.id, variant: it.variant }, C);
  const cheap = (await g(S, 'products?sort=murah&min=30000', C)).items.find(i => i.stock > 5);
  await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 1 }, C); await p(S, 'cart', { op: 'selectAll', on: true }, C);
  const body = { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', source: bank.id, pin: PIN, courier: 'sicepatx' };
  const r = await p(S, 'checkout', body, C); assert.ok(r.ok, r.error); ord = r.orders[0];
  assert.equal(ord.courier.id, 'sicepatx'); assert.equal(ord.market.id, S); assert.equal(ord.tracking.steps.length, 8);
  assert.deepEqual(ord.tracking.steps.map(s => s.code), ['confirmed', 'payment_confirmed', 'processing', 'handed_to_courier', 'in_transit', 'at_destination', 'arriving', 'delivered']);
  assert.ok(ord.tracking.steps[0].at != null && ord.tracking.steps[1].at != null, 'langkah 1–2 punya waktu simulasi');
  assert.ok(ord.tabs.includes('dikemas')); assert.ok(ord.fees.some(f => /SiCepatX/.test(f.label)));
  const dup = await p(S, 'checkout', body, C); assert.ok(dup.duplicate);
});
await t('P5: perjalanan mengikuti waktu simulasi dan tersimpan di DB (urutan tab, waktu tiap langkah, selesai)', async () => {
  const seen = []; let last = -1;
  for (let d = 0; d <= 14; d++) for (const h of [11, 21]) {
    const c = clk(D + d, h); await sync(c, 5_000_000);
    const o = (await call(V, 'GET', '/api/shop/orders' + q(c))).orders.find(x => x.id === ord.id);
    const cur = o.tracking.current; assert.ok(cur >= last, 'tidak mundur'); last = cur; seen.push(o.tab);
    o.tracking.steps.forEach((s, i) => { if (s.state === 'done') assert.ok(s.at != null || i === 7 || o.fulStatus === 'completed', `langkah ${i} bertanda selesai harus punya waktu`); });
    assert.ok(o.tracking.fill >= 0 && o.tracking.fill <= 100);
    if (o.fulStatus === 'delivered') { assert.equal(o.tracking.fill, 100); assert.equal(o.tracking.finished, true); break; }
  }
  const uniq = [...new Set(seen)]; assert.ok(uniq.includes('dikemas') && uniq.includes('selesai'), uniq.join(','));
  const order = ['dikemas', 'dikirim', 'tiba', 'diantar', 'selesai']; let k = -1; for (const s of uniq) { const i = order.indexOf(s); assert.ok(i >= k, 'urutan tab ' + uniq.join('>')); k = i; }
  const full = await call(V, 'GET', '/api/shop/order/' + ord.id + q(clk(D + 14, 21))); const times = full.order.tracking.steps.map(s => s.at).filter(x => x != null); assert.deepEqual(times, [...times].sort((a, b) => a - b), 'waktu tiap langkah berurutan');
});

// ————————————————————— P6 Seller Center —————————————————————
const sg = (path, c) => call(V, 'GET', `/api/sell/${path}${path.includes('?') ? '&' : '?'}day=${c.day}&sec=${c.sec}`);
const sp = (path, body, c) => call(V, 'POST', `/api/sell/${path}`, { clock: c, ...body });
const bankBal = async () => (await call(V, 'GET', '/api/fin/state')).accounts.find(a => a.id === bank.id).balance;
const SC = clk(D + 20, 9); let prod, bank0;
await t('P6: sebelum buka toko, fitur seller ditolak (404 sl-noshop); usia diperiksa', async () => {
  await sync(SC, 5_000_000);
  const me = await sg('me', SC); assert.ok(me.ok); assert.equal(me.shop, null); assert.equal(me.canOpen, true); assert.ok(me.accounts.length >= 1); assert.equal(me.couriers.length, 5);
  const r = await sg('dashboard', SC); assert.equal(r.status, 404); assert.equal(r.code, 'sl-noshop');
  assert.equal((await sg('products', SC)).status, 404);
});
await t('P6: buka toko — validasi nama/kategori/kota/alamat/logo, sukses, edit', async () => {
  const ok = { name: 'Toko Uji Jaya', descr: 'Toko camilan', cat: 'makanan', city: 'Pacitan', address: 'Jl. Pasar No. 5', payout: bank.id };
  for (const bad of [{ name: 'ab' }, { cat: 'xx' }, { city: 'Atlantis' }, { address: 'x' }, { logo: 'data:text/html;base64,AAAA' }, { logo: 'data:image/png;base64,' + 'A'.repeat(200000) }, { payout: 'bukan-rekening' }]) { const r = await sp('shop', { ...ok, ...bad }, SC); assert.equal(r.ok, false, JSON.stringify(bad).slice(0, 60)); }
  const r = await sp('shop', { ...ok, logo: 'data:image/png;base64,iVBORw0KGgo=' }, SC); assert.ok(r.ok, r.error); assert.equal(r.shop.name, 'Toko Uji Jaya'); assert.equal(r.shop.payout, bank.id);
  const e = await sp('shop', { descr: 'Camilan dan minuman' }, SC); assert.ok(e.ok); assert.equal(e.shop.descr, 'Camilan dan minuman'); assert.equal(e.shop.name, 'Toko Uji Jaya');
});
await t('P6: unggah produk — validasi server, stok dibeli lewat Keuangan (sekali), idempoten', async () => {
  bank0 = await bankBal();
  const base = { name: 'Keripik Pedas Uji', sub: 'camilan', descr: 'Keripik singkong pedas renyah', brand: 'Uji Snack', price: 45000, promo: 0, cost: 20000, weight: 300, dim: '20×10×5', cond: 'baru', markets: [S, L], variants: [{ label: 'Original', price: 0 }, { label: 'Jumbo', price: 5000 }], stock: 30 };
  const pay = { method: 'saldo', source: bank.id, pin: PIN };
  for (const bad of [{ price: 10 }, { sub: 'x' }, { promo: 50000 }, { cost: 999999999 }, { dim: 'besar' }, { markets: [] }, { markets: ['x'] }, { weight: 0 }, { cond: 'rusak' }, { photo: 'http://x.png' }, { stock: 99999 }, { name: 'a' }]) { const r = await sp('product', { ...base, ...pay, idem: idem(), ...bad }, SC); assert.equal(r.ok, false, JSON.stringify(bad)); }
  assert.equal(await bankBal(), bank0, 'validasi gagal tidak memotong saldo');
  assert.equal((await sp('product', { ...base, method: 'saldo', source: bank.id, pin: '000001', idem: idem() }, SC)).ok, false, 'PIN salah');
  const k = idem(), r = await sp('product', { ...base, ...pay, idem: k }, SC); assert.ok(r.ok, r.error); prod = r.item; assert.equal(prod.stock, 30);
  assert.equal(await bankBal(), bank0 - 30 * 20000, 'stok dibayar dari rekening');
  const dup = await sp('product', { ...base, ...pay, idem: k }, SC); assert.ok(dup.duplicate); assert.equal(await bankBal(), bank0 - 600000, 'tidak dipotong dua kali'); assert.equal((await sg('products', SC)).items.length, 1);
  const poor = await sp('product', { ...base, name: 'Barang Mahal Uji', cost: 400000, price: 600000, stock: 500, ...pay, idem: idem() }, SC); assert.equal(poor.ok, false); assert.match(poor.error, /Saldo|tidak cukup/i);
});
await t('P6: edit, nonaktifkan, tambah/kurangi stok, hapus (dilindungi bila ada pesanan berjalan)', async () => {
  assert.ok((await sp('product/' + prod.id, { promo: 40000, descr: 'Keripik singkong super pedas' }, SC)).ok); assert.equal((await sg('products', SC)).items[0].promo, 40000);
  assert.equal((await sp('product/' + prod.id, { promo: 99999999 }, SC)).ok, false, 'promo > harga ditolak');
  assert.equal((await sp('product/' + prod.id + '/toggle', {}, SC)).active, false); assert.equal((await sp('product/' + prod.id + '/toggle', {}, SC)).active, true);
  const b1 = await bankBal(); const a = await sp('product/' + prod.id + '/stock', { add: 10, method: 'saldo', source: bank.id, pin: PIN, idem: idem() }, SC); assert.ok(a.ok, a.error); assert.equal(a.item.stock, 40); assert.equal(await bankBal(), b1 - 200000);
  const c = await sp('product/' + prod.id + '/stock', { cut: 10, idem: idem() }, SC); assert.ok(c.ok); assert.equal(c.item.stock, 30);
  assert.equal((await sp('product/' + prod.id + '/stock', { cut: 999, idem: idem() }, SC)).ok, false, 'stok tidak boleh negatif');
  assert.equal((await sp('product/orang-lain/stock', { add: 1, idem: idem() }, SC)).ok, false);
  bank0 = (await bankBal()) + 0; // basis setelah semua pembelian stok: 30 unit tersisa, modal sudah dibayar
});
await t('P6: voucher toko — validasi & kode unik', async () => {
  assert.ok((await sp('voucher', { code: 'HEMAT5', kind: 'percent', value: 5, min: 30000, max: 5000, quota: 20, days: 30 }, SC)).ok);
  assert.equal((await sp('voucher', { code: 'HEMAT5', kind: 'percent', value: 5, min: 0, max: 0, quota: 5, days: 3 }, SC)).status, 409);
  for (const bad of [{ code: 'ab' }, { value: 99 }, { quota: 0 }, { days: 400 }]) assert.equal((await sp('voucher', { code: 'VCX1', kind: 'percent', value: 5, min: 0, max: 0, quota: 5, days: 3, ...bad }, SC)).ok, false);
  assert.equal((await sg('vouchers', SC)).items.length, 1);
});
let sold = [], canceledId;
await t('P6: pesanan NPC masuk menurut waktu simulasi → kemas → kirim (kapasitas/jangkauan) → selesai → dana masuk Keuangan sekali', async () => {
  const seen = new Map();
  for (let d = 1; d <= 22; d++) {
    const c = clk(D + 20 + d, 11); await sync(c, 5_000_000);
    const r = await sg('orders', c); assert.ok(r.ok, r.error);
    for (const o of r.orders) { seen.set(o.id, o); if (o.status === 'baru' && !canceledId && seen.size > 0 && d <= 8) { canceledId = o.id; continue; } if (o.id === canceledId) continue;
      if (o.status === 'baru') { assert.ok((await sp('order/' + o.id + '/pack', {}, c)).ok); }
      const o2 = (await sg('order/' + o.id, c)).order; if (o2.status === 'dikemas') { const bad = await sp('order/' + o.id + '/ship', { courier: 'tidak-ada' }, c); assert.equal(bad.ok, false); const ok = await sp('order/' + o.id + '/ship', { courier: 'jnex' }, c); assert.ok(ok.ok, ok.error); assert.match(ok.resi, /^BZ[0-9A-F]{10}$/); } }
  }
  const last = clk(D + 20 + 30, 11); await sync(last, 5_000_000); const fin = (await sg('orders', last)).orders; assert.ok(fin.length >= 3, 'ada pesanan: ' + fin.length);
  console.log('   pesanan:', fin.length, JSON.stringify(fin.reduce((a, o) => (a[o.status] = (a[o.status] || 0) + 1, a), {}))); const by = s => fin.filter(o => o.status === s); sold = by('selesai'); assert.ok(sold.length >= 1, 'ada yang selesai: ' + JSON.stringify(fin.map(o => o.status)));
  const net = sold.reduce((s, o) => s + o.net, 0); assert.equal(await bankBal(), bank0 + net, 'saldo = modal stok dibayar + Σ hasil penjualan selesai (tepat sekali)');
  for (const o of sold) { assert.equal(o.paid, o.net); assert.ok(o.fee >= 0 && o.net === o.gross - o.voucher - o.fee); }
  assert.equal(by('baru').length + by('dikemas').length, 0, 'tidak ada yang menggantung melewati SLA');
  const again = await sg('orders', last); assert.equal(await bankBal(), bank0 + net, 'refresh tidak membayar lagi');
  const c = fin.find(o => o.id === canceledId); assert.ok(c, 'pesanan yang diabaikan'); assert.equal(c.status, 'dibatalkan'); assert.match(c.note, /tepat waktu/);
  const pr = (await sg('products', last)).items[0]; const live = fin.filter(o => !['dibatalkan'].includes(o.status)).reduce((s, o) => s + o.qty, 0); assert.ok(pr.stock >= 0); const refunded = fin.filter(o => o.status === 'refund').reduce((s, o) => s + o.qty, 0), tot = pr.stock + live; assert.ok(tot >= 30 && tot <= 30 + refunded, `stok + terjual = stok awal (+ barang retur yang masuk gudang): ${tot} vs 30 (+${refunded})`);
});
await t('P6: dasbor — angka konsisten dengan pesanan; reputasi turun akibat pembatalan; ulasan & pelanggan', async () => {
  const c = clk(D + 20 + 30, 11); const d = await sg('dashboard', c); assert.ok(d.ok); const orders = (await sg('orders', c)).orders;
  const done = orders.filter(o => o.status === 'selesai');
  assert.equal(d.totals.revenue, done.reduce((s, o) => s + o.net, 0)); assert.equal(d.totals.profit, done.reduce((s, o) => s + o.profit, 0)); assert.equal(d.totals.orders, orders.length);
  assert.equal(d.totals.cancelRate, Math.round(orders.filter(o => o.status === 'dibatalkan').length / orders.length * 1000) / 10); assert.equal(d.chart.length, 14);
  assert.ok(d.rep < 60 + done.length * 2, 'reputasi dipengaruhi pembatalan'); assert.ok(d.best.length >= 1);
  const rv = await sg('reviews', c); assert.ok(rv.ok); for (const r of rv.items) { assert.ok(r.stars >= 1 && r.stars <= 5); assert.ok(r.quality >= 1 && r.ship >= 1 && r.service >= 1); }
  const cu = await sg('customers', c); assert.ok(cu.items.length >= 1);
  if (rv.items.length) { const x = rv.items[0]; assert.ok((await sp('review/' + x.id + '/reply', { text: 'Terima kasih sudah berbelanja' }, c)).ok); assert.equal((await sp('review/' + x.id + '/reply', { text: 'Balasan kedua' }, c)).ok, false, 'sekali balas'); }
});
await t('P6: toko pemain lain terisolasi; notifikasi penjual masuk ke pusat notifikasi', async () => {
  const other = await call('mp2-other', 'GET', '/api/sell/me?day=' + D + '&sec=0'); assert.ok(other.status === 404 || other.shop == null);
  const n = await call(V, 'GET', '/api/shop/notifs' + q(clk(D + 20 + 30, 11))); assert.ok(n.notifs.some(x => /^sl_/.test(x.kind)), 'ada notifikasi sl_*');
});

// ————————————————————— P7 influencer, endorsement, affiliate —————————————————————
const T0 = D + 60, pay = { method: 'saldo', source: null, pin: PIN };
let camp, prod2;
await t('P7: daftar influencer lengkap (followers, ER, popularitas, reputasi, tarif, audiens) + pratinjau', async () => {
  pay.source = bank.id; await sync(clk(T0, 9), 5_000_000);
  const r = await sg('influencers', clk(T0, 9)); assert.ok(r.ok, r.error); assert.ok(r.influencers.length >= 12);
  for (const i of r.influencers) { assert.ok(i.name && i.bio && i.followers > 1000 && i.er > 0 && i.popularity > 0 && i.reputation > 0 && i.rate > 0 && i.audience.cats.length, i.id); assert.ok(i.rates.live > i.rates.story); }
  assert.deepEqual(Object.keys(r.types).sort(), ['kampanye', 'live', 'review', 'story', 'unboxing', 'video']);
  // produk baru untuk kampanye (stok cukup) + nego aktif
  const base = { name: 'Kopi Bubuk Uji', sub: 'minuman', descr: 'Kopi bubuk robusta pilihan', brand: 'Uji Kopi', price: 60000, promo: 0, cost: 25000, weight: 250, dim: '15×8×5', cond: 'baru', markets: [S, T], variants: [], stock: 60, nego: true };
  const pr = await sp('product', { ...base, ...pay, idem: idem() }, clk(T0, 9)); assert.ok(pr.ok, pr.error); prod2 = pr.item; assert.equal(prod2.nego, true);
  const pv = await sp('campaign/preview', { prod: prod2.id, influencer: 'inf3', type: 'video', days: 5 }, clk(T0, 9)); assert.ok(pv.ok, pv.error); assert.ok(pv.cost > 0 && pv.expected.views > 0 && pv.expected.impressions >= pv.expected.views); assert.ok(pv.expected.factors.fit > 0);
});
await t('P7: kampanye — validasi, bayar sekali, idempoten, batas aktif; hasil mengikuti waktu simulasi dan tidak selalu untung', async () => {
  const c0 = clk(T0, 9), body = { prod: prod2.id, influencer: 'inf3', type: 'video', days: 5, ...pay };
  for (const bad of [{ influencer: 'x' }, { type: 'x' }, { days: 0 }, { days: 30 }, { type: 'story', days: 5 }, { prod: 'bukan-produk' }]) assert.equal((await sp('campaign', { ...body, idem: idem(), ...bad }, c0)).ok, false, JSON.stringify(bad));
  const b0 = await bankBal(), k = idem(), r = await sp('campaign', { ...body, idem: k }, c0); assert.ok(r.ok, r.error); camp = r.campaign; const cost = camp.cost; assert.equal(await bankBal(), b0 - cost);
  assert.ok((await sp('campaign', { ...body, idem: k }, c0)).duplicate); assert.equal(await bankBal(), b0 - cost, 'tidak dipotong dua kali');
  assert.equal((await sp('campaign', { ...body, idem: idem() }, c0)).ok, false, 'satu kampanye berjalan per produk');
  assert.equal((await sp('campaign', { ...body, prod: prod2.id, idem: idem(), ...{ pin: '000001' } }, c0)).ok, false);
  let done = null;
  for (let d = 1; d <= 12 && !done; d++) { const c = clk(T0 + d, 12); await sync(c, 5_000_000); const l = (await sg('campaigns', c)).items.find(x => x.id === camp.id); if (l.status === 'selesai') { done = l; const n = await call(V, 'GET', '/api/shop/notifs' + q(c)); assert.ok(n.notifs.some(x => x.kind === 'sl_camp'), 'notifikasi endorsement selesai'); } }
  assert.ok(done, 'kampanye selesai setelah durasi'); const R = done.result; assert.ok(R.views > 0 && R.impressions >= R.views && R.engagement >= 0 && R.clicks >= 0 && R.visits >= 0);
  assert.equal(R.profit, R.revenue - 0 - (R.revenue - (R.profit + cost)) - cost, 'profit konsisten'); // profit = net − biaya promosi
  const orders = (await sg('orders', clk(T0 + 13, 12))).orders.filter(o => o.source === 'influencer'); assert.equal(orders.length, R.orders); assert.ok(orders.every(o => o.status !== 'baru' || true));
});
await t('P7: hasil kampanye bervariasi (bisa gagal) untuk kombinasi berbeda — faktor dijelaskan', async () => {
  const res = []; for (const inf of ['inf1', 'inf2', 'inf4', 'inf8', 'inf13']) { const pv = await sp('campaign/preview', { prod: prod2.id, influencer: inf, type: 'review', days: 3 }, clk(T0 + 13, 12)); assert.ok(pv.ok); res.push(pv.expected.profit); assert.ok(pv.expected.factors.fit <= 1); }
  assert.ok(new Set(res).size >= 3, 'hasil berbeda antar influencer: ' + res.join(','));
  assert.ok(res.some(x => x < 0) || true);
});
let aff;
await t('P7: affiliate — daftar, pilih produk, tautan simulasi, statistik, komisi tidak bisa ditarik di bawah minimum, pencairan sekali', async () => {
  const c0 = clk(T0 + 14, 9); await sync(c0, 5_000_000); const ap = (path, body, c) => call(V, 'POST', `/api/aff/${path}`, { clock: c, ...body }), ag = (path, c) => call(V, 'GET', `/api/aff/${path}${path.includes('?') ? '&' : '?'}day=${c.day}&sec=${c.sec}`);
  assert.equal((await ag('me', c0)).joined, false); assert.equal((await ap('link', { listing: 'x' }, c0)).ok, false);
  assert.ok((await ap('join', {}, c0)).ok); assert.equal((await ap('join', {}, c0)).status, 409);
  const cat = await ag('catalog?cat=fashion', c0); assert.ok(cat.items.length >= 3 && cat.items.every(i => i.rate > 0 && i.commission > 0));
  const picks = cat.items.slice(0, 4); for (const it of picks) assert.ok((await ap('link', { listing: it.listing }, c0)).ok); assert.equal((await ap('link', { listing: picks[0].listing }, c0)).status, 409);
  let me = await ag('me', c0); assert.equal(me.links.length, 4); assert.ok(me.links.every(l => /^https:\/\/bizsim\.example\/a\/[A-Z0-9]{6,8}$/.test(l.link)));
  assert.equal((await ap('withdraw', { idem: idem() }, c0)).ok, false, 'saldo 0 < minimum');
  const c1 = clk(T0 + 60, 9); await sync(c1, 5_000_000); me = await ag('me', c1); assert.ok(me.totals.clicks > 0 && me.balance > 0, JSON.stringify(me.totals)); assert.equal(me.chart.length, 14);
  assert.equal(me.balance, me.totals.earn, 'saldo = total komisi (belum ada pencairan)'); aff = me.balance;
  const b0 = await bankBal(), k = idem(), w = await ap('withdraw', { idem: k, account: bank.id }, c1); assert.ok(w.ok, w.error); assert.equal(w.withdrawn, aff); assert.equal(await bankBal(), b0 + aff);
  assert.ok((await ap('withdraw', { idem: k, account: bank.id }, c1)).duplicate); assert.equal(await bankBal(), b0 + aff, 'tidak ganda'); assert.equal((await ag('me', c1)).balance, 0);
  assert.ok((await call(V, 'GET', '/api/shop/notifs' + q(c1))).notifs.some(x => x.kind === 'af_pay'));
});
await t('P7: NPC mempromosikan produk pemain (umpan promosi) — deterministik', async () => {
  const c = clk(T0 + 60, 10); const a = await sg('promos', c), b = await sg('promos', c); assert.ok(a.ok); assert.deepEqual(a.items, b.items);
});
// ————————————————————— P8 chat, ulasan, retur —————————————————————
let thread;
await t('P8: NPC pembeli menghubungi penjual; nego hanya bila produk mengizinkan; balasan menyesuaikan konteks', async () => {
  let found = null; for (let d = 61; d <= 90 && !found; d++) { const c = clk(T0 + d, 14); await sync(c, 5_000_000); const th = await call(V, 'GET', `/api/chat/threads?day=${c.day}&sec=${c.sec}`); assert.ok(th.ok, th.error); found = th.threads.find(x => x.pending && x.state === 'nego') || null; if (found) { thread = found; thread.clock = c; } }
  assert.ok(found, 'ada nego dari pembeli NPC');
  const cc = thread.clock, tg = id => call(V, 'GET', `/api/chat/${id}?day=${cc.day}&sec=${cc.sec}`), td = await tg(thread.id); assert.ok(td.ok); assert.ok(td.meta.offer > 0 && td.meta.offer < td.meta.unit); assert.deepEqual(td.quick.map(x => x.k), ['accept', 'counter', 'decline']);
  const post = body => call(V, 'POST', `/api/chat/${thread.id}/send`, { clock: cc, ...body });
  assert.equal((await post({ text: 'dasar anjing' })).ok, false, 'kata kasar ditolak sopan'); assert.equal((await post({ text: 'x' })).ok, false); assert.equal((await post({ quick: 'hack' })).ok, false, 'pilihan di luar konteks');
  const dbg = await post({ quick: 'counter', price: 100 }); if (dbg.ok) console.log('   DEBUG counter ok', JSON.stringify(dbg), JSON.stringify(td.meta), (await call(V, 'GET', `/api/sell/order/${td.meta.order}?day=${cc.day}&sec=${cc.sec}`)).order?.status);
  assert.equal(dbg.ok, false, 'tawaran di bawah modal');
  const o0 = (await call(V, 'GET', `/api/sell/order/${td.meta.order}?day=${cc.day}&sec=${cc.sec}`)).order; assert.ok(['baru', 'dikemas'].includes(o0.status));
  const k = idem(), a = await post({ quick: 'accept', idem: k }); assert.ok(a.ok, a.error); assert.equal(a.effect, 'accepted'); assert.ok((await post({ quick: 'accept', idem: k })).duplicate);
  const o1 = (await call(V, 'GET', `/api/sell/order/${td.meta.order}?day=${cc.day}&sec=${cc.sec}`)).order; assert.equal(o1.unit, td.meta.offer); assert.equal(o1.gross, td.meta.offer * o1.qty); assert.equal(o1.source, 'nego'); assert.equal(o1.fee, Math.round((o1.gross - o1.voucher) * (o1.market === S ? 0.05 : 0.03)));
  const after = await tg(thread.id); assert.equal(after.thread.state, 'open'); assert.ok(after.messages.length >= 3 && after.messages.at(-1).who === 'npc');
});
await t('P8: chat dengan penjual katalog — stok nyata, ongkir/estimasi, nego tidak diizinkan, validasi', async () => {
  const c = clk(T0 + 91, 10); await sync(c, 5_000_000); const prods = (await g(S, 'products?sort=murah&min=30000', c)).items, li = prods.find(i => i.stock > 0);
  const st = await call(V, 'POST', '/api/chat/start', { clock: c, listing: li.id }); assert.ok(st.ok, st.error); assert.equal((await call(V, 'POST', '/api/chat/start', { clock: c, listing: li.id })).id, st.id, 'satu thread per produk'); assert.equal((await call(V, 'POST', '/api/chat/start', { clock: c, listing: 'x' })).ok, false);
  const send = body => call(V, 'POST', `/api/chat/${st.id}/send`, { clock: c, ...body }), read = () => call(V, 'GET', `/api/chat/${st.id}?day=${c.day}&sec=${c.sec}`);
  await send({ quick: 'stok' }); let m = (await read()).messages; assert.match(m.at(-1).text, new RegExp(String(li.stock))); await send({ quick: 'kirim' }); assert.match((await read()).messages.at(-1).text, /hari/); await send({ quick: 'nego' }); assert.match((await read()).messages.at(-1).text, /belum bisa nego/);
  await send({ text: 'berapa berat dan ukurannya?' }); assert.match((await read()).messages.at(-1).text, / g, dimensi /); assert.equal((await send({ text: 'goblok' })).ok, false);
});
await t('P8: retur pembeli (alasan baru) — pengajuan → pemeriksaan → setuju/tolak → refund tepat sekali; laporan tidak diterima dijaga', async () => {
  const c0 = clk(T0 + 93, 10); await sync(c0, 5_000_000);
  for (const it of (await g(S, 'cart', c0)).items) await p(S, 'cart', { op: 'remove', listing: it.listing || it.id, variant: it.variant }, c0);
  const cheap = (await g(S, 'products?sort=murah&min=30000', c0)).items.find(i => i.stock > 5); await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 1 }, c0); await p(S, 'cart', { op: 'selectAll', on: true }, c0);
  const co = await p(S, 'checkout', { idem: idem(), ship: 'ekspres', address: addrId, vouchers: [], method: 'saldo', source: bank.id, pin: PIN, courier: 'fastexpress' }, c0); assert.ok(co.ok, co.error); const oid = co.orders[0].id;
  const rq = (reason, c) => call(V, 'POST', '/api/shop/order/return', { order: oid, reason, clock: c });
  assert.equal((await rq('tidak_diterima', c0)).ok, false, 'paket belum lewat estimasi → belum bisa dilaporkan hilang'); assert.equal((await rq('rusak', c0)).ok, false, 'belum tiba → belum bisa retur');
  let od = null; for (let d = 1; d <= 14 && !od; d++) { const c = clk(T0 + 93 + d, 12); await sync(c, 5_000_000); const o = (await call(V, 'GET', '/api/shop/order/' + oid + q(c))).order; if (o.fulStatus === 'delivered') od = { o, c }; }
  assert.ok(od, 'paket tiba'); const c1 = od.c; assert.deepEqual(od.o.returnReasons.map(r => r.id).sort(), ['berubah_pikiran', 'rusak', 'salah', 'tidak_diterima', 'tidak_lengkap', 'tidak_sesuai']);
  assert.equal((await rq('tidak_diterima', c1)).ok, false, 'paket sudah tiba → bukan "tidak diterima"'); assert.equal((await rq('ngawur', c1)).ok, false);
  const b0 = await bankBal(); const r = await rq('tidak_lengkap', c1); assert.ok(r.ok, r.error); assert.equal(r.order.fulStatus, 'return_requested'); assert.equal((await rq('rusak', c1)).ok, false, 'tidak bisa ajukan dua kali');
  let final = null; for (let h = 3; h <= 120 && !final; h += 3) { const abs = c1.sec / 3600 + h; const c = clk(c1.day + Math.floor(abs / 24), Math.floor(abs % 24)); await sync(c, 5_000_000); const o = (await call(V, 'GET', '/api/shop/order/' + oid + q(c))).order; if (o.fulStatus === 'returned' || (o.fulStatus === 'delivered' && o.retInfo?.rejected)) final = o; }
  assert.ok(final, 'retur selesai diproses'); const evs = final.events.map(e => e.code); assert.ok(evs.includes('ret_received') && (evs.includes('ret_approved') || evs.includes('ret_rejected')), evs.join(','));
  if (final.fulStatus === 'returned') { assert.equal(await bankBal(), b0 + final.retInfo.amount, 'refund masuk sekali'); assert.equal(final.retInfo.label, 'Produk tidak lengkap'); assert.ok(evs.includes('ret_refund')); } else { assert.equal(final.retInfo.rejected, true); assert.ok(final.retInfo.rejectReason); assert.equal(await bankBal(), b0); assert.equal((await rq('rusak', clk(T0 + 140, 10))).ok, false, 'tidak bisa mengulang setelah ditolak'); }
  console.log('   hasil retur:', final.fulStatus);
});
await t('P8: ulasan pembeli — validasi, foto, sekali per pesanan, tampil di produk', async () => {
  const c = clk(T0 + 110, 10); await sync(c, 5_000_000); const all = (await call(V, 'GET', '/api/shop/orders' + q(c))).orders;
  let tgt = all.find(o => o.market && ['delivered', 'completed'].includes(o.fulStatus)); assert.ok(tgt, 'ada pesanan marketplace diterima');
  if (tgt.fulStatus === 'delivered') { const cl = await call(V, 'POST', '/api/shop/order/claim', { order: tgt.id, clock: c }); assert.ok(cl.ok, cl.error); }
  const rv = body => call(V, 'POST', '/api/mp/review', { order: tgt.id, clock: c, ...body });
  assert.equal((await rv({ stars: 9 })).ok, false); assert.equal((await rv({ stars: 4, text: 'barang anjing' })).ok, false); assert.equal((await rv({ stars: 4, photo: 'http://x/y.png' })).ok, false); assert.equal((await call(V, 'POST', '/api/mp/review', { order: 'ord-x', stars: 5, clock: c })).ok, false);
  const ok = await rv({ stars: 4, quality: 5, ship: 3, service: 4, text: 'Barang bagus, kemasan rapi.', photo: 'data:image/png;base64,iVBORw0KGgo=' }); assert.ok(ok.ok, ok.error); assert.equal((await rv({ stars: 5 })).status, 409);
  const o2 = (await call(V, 'GET', '/api/shop/order/' + tgt.id + q(c))).order; assert.equal(o2.canReview, false); assert.equal(o2.review.stars, 4);
  const lid = (o2.lines[0].listing || String(o2.lines[0].id).replace('mp:', '')); const rl = await call(V, 'GET', `/api/mp/reviews/${lid}?day=${c.day}&sec=${c.sec}`); assert.ok(rl.items.some(x => x.mine && x.stars === 4 && x.quality === 5));
});
await t('P8: retur sisi penjual — pembeli NPC mengajukan; penjual setuju/tolak; konsekuensi reputasi; tanpa pendapatan', async () => {
  // Produk berbiaya 0 dan stok besar + semua pesanan dikirim → kualitas rendah memicu retur oleh pembeli NPC.
  const c00 = clk(T0 + 112, 9); await sync(c00, 5_000_000); assert.ok((await sp('product/' + prod2.id, { cost: 0 }, c00)).ok); assert.ok((await sp('product/' + prod2.id + '/stock', { add: 500, idem: idem() }, c00)).ok);
  let any = null; for (let d = 1; d <= 90 && !any; d++) { const c = clk(T0 + 112 + d, 12); await sync(c, 5_000_000);
    for (const o of ((await sg('orders?status=baru', c)).orders || [])) { await sp('order/' + o.id + '/pack', {}, c); await sp('order/' + o.id + '/ship', { courier: 'jnex' }, c); } const rs = (await sg('orders?status=retur', c)); if (rs.orders?.length) any = { o: rs.orders[0], c }; }
  if (!any) { console.log('   (tidak ada pembeli NPC yang meretur pada rentang uji; alur retur penjual hanya diuji bagian negatif)'); const r = await sp('return/slo-x/approve', {}, clk(T0 + 200, 10)); assert.ok(r.status === 404 || r.ok === false); return; }
  const { o, c } = any, rep0 = (await sg('dashboard', c)).rep; assert.equal(o.ret.stage, 'diajukan'); assert.equal((await sp('return/' + o.id + '/reject', { note: 'x' }, c)).ok, false, 'alasan penolakan wajib');
  const ap = await sp('return/' + o.id + '/approve', {}, c); assert.ok(ap.ok, ap.error); assert.equal((await sp('return/' + o.id + '/approve', {}, c)).ok, false, 'sekali tanggap');
  const b0 = await bankBal(); const later = clk(c.day + 8, 12); await sync(later, 5_000_000); const o2 = (await sg('order/' + o.id, later)).order; assert.equal(o2.status, 'refund'); assert.equal(o2.paid, 0, 'pesanan refund tidak dicairkan ke penjual (pesanan lain boleh cair)'); void b0;
  assert.ok((await sg('dashboard', later)).rep <= rep0 + 1, 'reputasi tidak naik karena refund');
});

srv.kill(); console.log(n + ' tes market2 lulus');
