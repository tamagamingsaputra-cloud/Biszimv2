// Regression test Marketplace (HTTP nyata, DB sementara). Jalankan: node tests/market.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname, PORT = 8794, DB = '/tmp/bizsim-mp-test.db';
for (const f of [DB, DB + '-wal', DB + '-shm']) rmSync(f, { force: true });
const srv = spawn('node', ['server.cjs'], { cwd: ROOT + 'server', env: { ...process.env, PORT: String(PORT), BIZSIM_DB: DB }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => /on :/.test(d) && r()));
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name); } catch (e) { console.error('GAGAL', name); srv.kill(); throw e; } };
const call = (v, method, path, body) => fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', 'x-visitor-id': v }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, ...(await r.json()) }));
const idem = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const clk = (day, h, m = 0) => ({ day, sec: h * 3600 + m * 60 });
const q = c => `?day=${c.day}&sec=${c.sec}`;
const game = (day, h, cash, extra = {}) => ({ charId: 'c', createdAt: 1, clock: { g: (day + 14) * 48 + h * 2, sec: 0 }, player: { balance: cash, energy: 80 }, ledger: [], finSeq: 0, shopSeq: 0, ...extra });
const D = 6840 + 3, V = 'mp-a', PIN = '482915', S = 'shopindo', L = 'lazamall', T = 'tokomart', B = 'belanjaplus';
const g = (m, path, c) => call(V, 'GET', `/api/mp/${m}/${path}${path.includes('?') ? '&' : '?'}day=${c.day}&sec=${c.sec}`);
const p = (m, path, body, c) => call(V, 'POST', `/api/mp/${m}/${path}`, { clock: c, ...body });
const reg = { name: 'Uji Belanja', username: 'ujibelanja', email: 'uji@contoh.id', phone: '081234567890', password: 'rahasia123', address: 'Jl. Merdeka No. 10', city: 'Pacitan', province: 'Jawa Timur' };
const sync = async (c, cash) => call(V, 'PUT', '/api/game', { game: game(c.day, c.sec / 3600, cash, { shopSeq: (await call(V, 'GET', '/api/shop/grants?after=0')).shopSeq, finSeq: (await call(V, 'GET', '/api/fin/state')).finSeq }) });
let C = clk(D, 10);

await t('persiapan: karakter dewasa, save, PIN, rekening bank', async () => {
  assert.ok((await call(V, 'POST', '/api/profile', { name: 'Uji Belanja', birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 })).ok);
  assert.ok((await call(V, 'PUT', '/api/game', { game: game(D, 10, 5_000_000) })).ok);
  assert.ok((await call(V, 'POST', '/api/fin/pin', { pin: PIN })).ok);
  const o = await call(V, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'bnr', initial: 3_000_000, pin: PIN, clock: C }); assert.ok(o.ok, o.error);
});
await t('launcher: 4 marketplace dengan identitas berbeda; belum ada akun', async () => {
  const r = await call(V, 'GET', '/api/mp/launcher' + q(C)); assert.ok(r.ok);
  assert.deepEqual(r.markets.map(m => m.id), [S, L, T, B]);
  assert.equal(new Set(r.markets.map(m => m.color)).size, 4); assert.equal(new Set(r.markets.map(m => m.feeText)).size >= 3, true);
  for (const m of r.markets) { assert.equal(m.account, null); assert.ok(m.desc && m.traits.length && m.rating && m.sellerCount && m.productCount, m.id); }
});
await t('belum daftar/masuk → 401, tidak bisa melihat katalog', async () => {
  const r = await g(S, 'products', C); assert.equal(r.status, 401); assert.equal(r.code, 'mp-noaccount');
});
await t('registrasi: validasi, sukses, ganda ditolak, password ter-hash', async () => {
  for (const bad of [{ username: 'A!' }, { email: 'x' }, { phone: '123' }, { password: 'pendek' }, { city: 'Atlantis' }, { province: 'Bali' }]) { const r = await p(S, 'register', { ...reg, ...bad }, C); assert.equal(r.ok, false, JSON.stringify(bad)); }
  const r = await p(S, 'register', reg, C); assert.ok(r.ok, r.error);
  assert.equal((await p(S, 'register', reg, C)).status, 409);
  const me = await g(S, 'me', C); assert.equal(me.account.username, 'ujibelanja'); assert.equal(me.addresses.length, 1); assert.equal(me.addresses[0].isDefault, 1);
  assert.equal(JSON.stringify(me).includes('rahasia123'), false); assert.equal('pass_hash' in me.account, false);
});
await t('logout, login salah/benar, sesi bertahan setelah refresh (disimpan di DB)', async () => {
  assert.ok((await p(S, 'logout', {}, C)).ok); assert.equal((await g(S, 'me', C)).status, 401);
  assert.equal((await p(S, 'login', { username: 'ujibelanja', password: 'salah12345' }, C)).ok, false);
  assert.equal((await p(S, 'login', { username: 'bukan', password: 'rahasia123' }, C)).ok, false);
  assert.ok((await p(S, 'login', { username: 'ujibelanja', password: 'rahasia123' }, C)).ok);
  assert.ok((await g(S, 'me', C)).ok);
  const l = await call(V, 'GET', '/api/mp/launcher' + q(C)); assert.deepEqual(l.markets.find(m => m.id === S).account, { username: 'ujibelanja', loggedIn: true });
});
await t('akun terpisah per marketplace; akun lain belum ada', async () => {
  assert.equal((await g(L, 'me', C)).status, 401);
  assert.ok((await p(L, 'register', { ...reg, username: 'ujilaza', email: 'l@contoh.id' }, C)).ok);
  assert.equal((await g(L, 'me', C)).account.username, 'ujilaza');
});
await t('edit profil, ganti password, kelola alamat', async () => {
  assert.ok((await p(S, 'profile', { name: 'Uji Baru', email: 'baru@contoh.id', phone: '081299998888' }, C)).ok); assert.equal((await g(S, 'me', C)).account.name, 'Uji Baru');
  assert.equal((await p(S, 'password', { old: 'salah', password: 'barubaru12' }, C)).ok, false);
  assert.equal((await p(S, 'password', { old: 'rahasia123', password: 'sama' }, C)).ok, false);
  assert.ok((await p(S, 'password', { old: 'rahasia123', password: 'baru12345' }, C)).ok);
  await p(S, 'logout', {}, C); assert.equal((await p(S, 'login', { username: 'ujibelanja', password: 'rahasia123' }, C)).ok, false); assert.ok((await p(S, 'login', { username: 'ujibelanja', password: 'baru12345' }, C)).ok);
  const a = await p(S, 'address', { op: 'add', label: 'Kantor', name: 'Uji', phone: '081211112222', address: 'Jl. Kantor 5', city: 'Malang', province: 'Jawa Timur' }, C); assert.ok(a.ok, a.error); assert.equal(a.addresses.length, 2);
  const id = a.addresses.find(x => x.label === 'Kantor').id; assert.ok((await p(S, 'address', { op: 'default', id }, C)).addresses.find(x => x.id === id).isDefault);
  const del = await p(S, 'address', { op: 'delete', id }, C); assert.equal(del.addresses.length, 1); assert.equal(del.addresses[0].isDefault, 1);
  assert.equal((await p(S, 'address', { op: 'delete', id: del.addresses[0].id }, C)).ok, false, 'minimal satu alamat');
  const h = (await g(S, 'me', C)).history; assert.ok(h.some(x => x.kind === 'password') && h.some(x => x.kind === 'alamat') && h.some(x => x.kind === 'keluar'));
});
let items;
await t('katalog: 12 kategori, pencarian, filter, urutan, halaman, detail', async () => {
  const h = await g(S, 'home', C); assert.equal(h.categories.length, 12); assert.ok(h.categories.every(c => c.subs.length >= 2));
  const all = await g(S, 'products', C); assert.ok(all.total >= 60); items = all.items; assert.ok(items.length <= 24 && all.pages >= 2);
  for (const k of ['id', 'name', 'brand', 'cat', 'price', 'sale', 'stock', 'rating', 'reviews', 'sold', 'seller']) assert.ok(items[0][k] != null, k);
  const cat = items[0].cat; const byCat = await g(S, `products?cat=${cat}`, C); assert.ok(byCat.items.length && byCat.items.every(i => i.cat === cat));
  const pr = await g(S, 'products?min=50000&max=200000&sort=murah', C); assert.ok(pr.items.every(i => i.sale >= 50000 && i.sale <= 200000)); assert.deepEqual(pr.items.map(i => i.sale), pr.items.map(i => i.sale).sort((a, b) => a - b));
  const rt = await g(S, 'products?rating=4.6&sort=rating', C); assert.ok(rt.items.every(i => i.rating >= 4.6));
  const sr = await g(S, 'products?q=laptop', C); assert.ok(sr.total >= 1 && sr.items.some(i => /laptop/i.test(i.name)) && sr.items.every(i => i.sub === 'komputer'));
  assert.equal((await g(S, 'products?q=zzzxxyy', C)).total, 0);
  const nw = await g(S, 'products?sort=terbaru', C); assert.ok(nw.items.length); const best = await g(S, 'products?sort=terlaris', C); assert.ok(best.items[0].sold >= best.items[1].sold);
  const d = await g(S, 'product/' + items[0].id, C); assert.ok(d.item.desc && d.item.variants.length && d.item.weightG && d.item.dim && d.item.etaReg >= 1);
  assert.equal((await g(L, 'product/' + items[0].id, C)).status, 404, 'id listing milik marketplace lain ditolak');
});
await t('P9: harga dinamis konsisten (katalog = keranjang = kuotasi) + endpoint pasar', async () => {
  const ps = await g(S, 'pasar', C); assert.ok(ps.ok && ps.stats.length === 4 && ps.impact && Array.isArray(ps.events) && Array.isArray(ps.feed));
  assert.ok(Math.abs(ps.stats.reduce((a, x) => a + x.share, 0) - 1) < 0.01, 'pangsa total ~100%');
  const a = await g(S, 'products', C), b = await g(S, 'products', C); assert.deepEqual(a.items.map(i => i.sale), b.items.map(i => i.sale), 'deterministik');
  assert.ok(a.items.every(i => i.sale > 0 && i.price >= i.sale && typeof i.priceMult === 'number'));
});
await t('perbandingan harga lintas marketplace', async () => {
  const multi = (await g(S, 'products?sort=terlaris', C)).items; let found = null;
  for (const it of multi) { const d = await g(S, 'product/' + it.id, C); if (d.compare.length >= 3) { found = d; break; } } assert.ok(found, 'ada produk dijual di ≥3 marketplace');
  assert.ok(found.compare.every(c => c.price > 0 && c.marketName && c.listing));
});
await t('wishlist: tambah, daftar, hapus, persisten', async () => {
  assert.ok((await p(S, 'wishlist', { listing: items[0].id }, C)).ok); assert.equal((await g(S, 'wishlist', C)).items.length, 1);
  assert.equal((await g(S, 'products', C)).items.find(i => i.id === items[0].id).wish, true);
  assert.ok((await p(S, 'wishlist', { listing: items[0].id, on: false }, C)).ok); assert.equal((await g(S, 'wishlist', C)).items.length, 0);
  assert.equal((await p(S, 'wishlist', { listing: 'nope' }, C)).status, 404);
});
let big, cheap;
await t('keranjang: tambah, ubah jumlah, variasi, pilih, hapus, batas stok', async () => {
  const pool = (await g(S, 'products?sort=mahal', C)).items.filter(i => i.stock > 3 && i.sale <= 900_000 && i.sale >= 150_000); big = pool[0]; cheap = (await g(S, 'products?sort=murah&min=30000', C)).items.find(i => i.stock > 5);
  let r = await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 2 }, C); assert.ok(r.ok, r.error); assert.equal(r.items[0].qty, 2); assert.equal(r.subtotal, cheap.sale * 2);
  r = await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 1 }, C); assert.equal(r.items[0].qty, 3);
  r = await p(S, 'cart', { op: 'set', listing: cheap.id, variant: r.items[0].variant, qty: 2 }, C); assert.equal(r.items[0].qty, 2);
  assert.equal((await p(S, 'cart', { op: 'set', listing: cheap.id, variant: r.items[0].variant, qty: 999 }, C)).ok, false, 'melebihi stok/batas');
  r = await p(S, 'cart', { op: 'add', listing: big.id, qty: 1 }, C); assert.equal(r.items.length, 2);
  r = await p(S, 'cart', { op: 'select', listing: big.id, variant: r.items[1].variant, on: false }, C); assert.equal(r.selectedCount, 1);
  r = await p(S, 'cart', { op: 'remove', listing: big.id, variant: r.items[1].variant }, C); assert.equal(r.items.length, 1);
  assert.equal((await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 0 }, C)).ok, false);
  assert.equal((await p(S, 'cart', { op: 'add', listing: 'tidak-ada', qty: 1 }, C)).status, 404);
});
await t('voucher: daftar 8 jenis, klaim, ganda, kuota, syarat belanja minimal', async () => {
  const kinds = new Set(); for (const m of [S, L, T, B]) { if (m !== S) { const rg = await p(m, 'register', { ...reg, username: 'uji' + m, email: m + '@contoh.id' }, C); assert.ok(rg.ok || rg.status === 409, rg.error); } const v = await g(m, 'vouchers', C); for (const x of v.vouchers) { kinds.add(x.kind); kinds.add('scope:' + x.scope); } }
  for (const k of ['pct', 'fixed', 'freeship', 'cashback', 'scope:seller', 'scope:newuser', 'scope:event', 'scope:exclusive']) assert.ok(kinds.has(k), 'jenis voucher: ' + k);
  const v = await g(S, 'vouchers', C); const hemat = v.vouchers.find(x => x.code === 'SHO-HEMAT10'); assert.equal(hemat.state, 'claimable');
  const c1 = await p(S, 'vouchers/claim', { code: 'SHO-HEMAT10' }, C); assert.ok(c1.ok, c1.error); assert.equal((await p(S, 'vouchers/claim', { code: 'SHO-HEMAT10' }, C)).status, 409);
  assert.equal((await p(S, 'vouchers/claim', { code: 'SHO-NOPE' }, C)).status, 404);
  const ev = v.vouchers.find(x => x.code === 'SHO-HARBOLNAS'); assert.equal(ev.state, 'inactive'); assert.equal((await p(S, 'vouchers/claim', { code: 'SHO-HARBOLNAS' }, C)).ok, false);
  const dt = await g(S, 'voucher/SHO-HEMAT10', C); assert.ok(dt.voucher.desc && dt.voucher.min > 0);
  const lz = await g(L, 'vouchers', C); assert.equal(lz.vouchers.find(x => x.code === 'LAZ-VIP').state, 'ineligible');
});
let addrId, qt;
await t('kuotasi checkout: rincian transparan, voucher min. belanja, tidak percaya klien', async () => {
  addrId = (await g(S, 'me', C)).addresses[0].id;
  await p(S, 'cart', { op: 'add', listing: big.id, qty: 1 }, C); await p(S, 'cart', { op: 'selectAll', on: true }, C);
  qt = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: ['SHO-HEMAT10'], method: 'saldo' }, C); assert.ok(qt.ok, qt.error);
  const T0 = qt.totals; for (const k of ['subtotal', 'shipping', 'svc', 'discount', 'total']) assert.ok(typeof T0[k] === 'number', k);
  assert.equal(T0.total, T0.subtotal - T0.discount + T0.shipping - T0.shipDisc + T0.svc + T0.cod, 'rumus total'); assert.ok(T0.discount > 0, 'voucher diskon terpotong'); assert.ok(qt.vouchers[0].amount === T0.discount);
  const bogus = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: ['SHO-NOMINAL', 'SHO-NOMINAL', 'SHO-GAJIAN'], method: 'saldo', total: 1, price: 1 }, C); assert.ok(bogus.ok || bogus.error);
  assert.notEqual((bogus.totals || {}).total, 1);
  assert.equal((await p(S, 'quote', { ship: 'reguler', address: addrId, method: 'tidakada' }, C)).ok, false);
});
let ord;
await t('checkout saldo bank: bayar sekali (idempoten), stok turun, masuk Order Center, PIN dicek', async () => {
  const s0 = await call(V, 'GET', '/api/fin/state'); const bank = s0.accounts.find(a => a.provider === 'bnr');
  const q2 = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: [], method: 'saldo' }, C);
  const bad = await p(S, 'checkout', { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', source: bank.id, pin: '000001' }, C); assert.equal(bad.ok, false);
  const k = idem(), body = { idem: k, ship: 'reguler', address: addrId, vouchers: [], method: 'saldo', source: bank.id, pin: PIN };
  const r = await p(S, 'checkout', body, C); assert.ok(r.ok, r.error); ord = r;
  const s1 = await call(V, 'GET', '/api/fin/state'); assert.equal(s1.accounts.find(a => a.id === bank.id).balance, bank.balance - q2.totals.total, 'saldo dipotong tepat total kuotasi');
  const dup = await p(S, 'checkout', body, C); assert.ok(dup.duplicate); const s2 = await call(V, 'GET', '/api/fin/state'); assert.equal(s2.accounts.find(a => a.id === bank.id).balance, s1.accounts.find(a => a.id === bank.id).balance, 'tidak dipotong dua kali');
  const od = await call(V, 'GET', '/api/shop/orders' + q(C)); assert.ok(od.orders.length >= 1); assert.equal(od.orders[0].payStatus, 'paid');
  assert.equal((await g(S, 'cart', C)).items.length, 0, 'keranjang terpilih dikosongkan');
});
await t('stok: pembelian menghabiskan stok → ditolak dengan alasan', async () => {
  const st = (await g(S, 'product/' + cheap.id, C)).item.stock; assert.ok(st < 99);
  const r = await p(S, 'cart', { op: 'add', listing: cheap.id, qty: st + 1 }, C); assert.equal(r.ok, false);
});
await t('COD: tidak memotong uang saat checkout', async () => {
  await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 1 }, C);
  const c0 = (await call(V, 'GET', '/api/fin/state')).cash;
  const r = await p(S, 'checkout', { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'cod' }, C); assert.ok(r.ok, r.error);
  assert.equal((await call(V, 'GET', '/api/fin/state')).cash, c0);
});
let pl;
await t('PayLater: tidak tersedia di Tokomart; aktivasi butuh PIN; limit dari skor kredit', async () => {
  assert.equal((await g(T, 'paylater', C)).status, 404);
  assert.equal((await p(S, 'paylater/activate', { idem: idem(), pin: '000001' }, C)).ok, false);
  const a = await p(S, 'paylater/activate', { idem: idem(), pin: PIN }, C); assert.ok(a.ok, a.error);
  pl = await g(S, 'paylater', C); assert.ok(pl.ok); assert.ok(pl.account.limit > 0 && pl.account.available === pl.account.limit && pl.account.used === 0 && pl.account.status === 'active');
  assert.equal((await p(S, 'paylater/activate', { idem: idem(), pin: PIN }, C)).ok, false, 'aktivasi ganda');
});
let loanOrder;
await t('PayLater: checkout tenor 3 bulan → tagihan bulanan, pemakaian limit, bunga+biaya', async () => {
  await p(S, 'cart', { op: 'add', listing: big.id, qty: 1 }, C);
  const bad = await p(S, 'checkout', { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'paylater', tenor: 5, pin: PIN }, C); assert.equal(bad.ok, false);
  const qq = await p(S, 'quote', { ship: 'reguler', address: addrId, vouchers: [], method: 'paylater' }, C); assert.ok(qq.paylater && qq.paylater.length === 4);
  const cash0 = (await call(V, 'GET', '/api/fin/state')).cash;
  const r = await p(S, 'checkout', { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'paylater', tenor: 3, pin: PIN }, C); assert.ok(r.ok, r.error); loanOrder = r;
  assert.equal((await call(V, 'GET', '/api/fin/state')).cash, cash0, 'PayLater tidak memotong kas');
  const v = await g(S, 'paylater', C); assert.equal(v.account.used, qq.totals.total); assert.equal(v.bills.length, 3); assert.ok(v.bills.every(b => b.status === 'terbuka')); assert.ok(v.bills.reduce((s, b) => s + b.amount, 0) >= qq.totals.total);
});
await t('PayLater: tagihan jatuh tempo → denda, limit turun, skor turun, pembayaran memulihkan', async () => {
  const sc0 = (await call(V, 'GET', '/api/fin/state')).score ?? 600; const v0 = await g(S, 'paylater', C); const due = v0.bills[0].due;
  const late = clk(due + 6, 9); await sync(late, 5_000_000);
  const v1 = await g(S, 'paylater', late); assert.equal(v1.bills[0].status, 'telat'); assert.ok(v1.bills[0].lateFee > 0); assert.ok(v1.bills[0].amount > v0.bills[0].amount); assert.ok(v1.account.limit <= v0.account.limit);
  assert.ok(((await call(V, 'GET', '/api/fin/state')).score ?? 600) < sc0, 'skor kredit turun');
  const blocked = await p(S, 'cart', { op: 'add', listing: cheap.id, qty: 1 }, late); await p(S, 'cart', { op: 'selectAll', on: true }, late);
  const use = await p(S, 'checkout', { idem: idem(), ship: 'reguler', address: addrId, vouchers: [], method: 'paylater', tenor: 1, pin: PIN }, late); assert.equal(use.ok, false, 'penggunaan dibatasi saat ada tunggakan');
  const bank = (await call(V, 'GET', '/api/fin/state')).accounts.find(a => a.provider === 'bnr');
  const pay = await p(S, 'paylater/pay', { idem: idem(), bill: v1.bills[0].id, method: 'saldo', source: bank.id, pin: PIN }, late); assert.ok(pay.ok, pay.error);
  const v2 = await g(S, 'paylater', late); assert.equal(v2.bills[0].status, 'lunas'); assert.ok(v2.account.used < v1.account.used);
  const dupPay = await p(S, 'paylater/pay', { idem: idem(), bill: v1.bills[0].id, method: 'saldo', source: bank.id, pin: PIN }, late); assert.equal(dupPay.ok, false, 'tidak bisa bayar dua kali');
});
await t('PayLater: pelunasan dipercepat', async () => {
  const late = clk(D + 40, 9); await sync(late, 5_000_000); const v = await g(S, 'paylater', late); const open = v.bills.filter(b => b.status !== 'lunas'); assert.ok(open.length);
  const bank = (await call(V, 'GET', '/api/fin/state')).accounts.find(a => a.provider === 'bnr');
  const loan = v.loans.find(l => l.status === 'aktif'); const pq = await p(S, 'paylater/payoff-quote', { loan: loan.id }, late); assert.ok(pq.ok, pq.error); assert.ok(pq.amount > 0);
  const r = await p(S, 'paylater/payoff', { idem: idem(), loan: loan.id, method: 'saldo', source: bank.id, pin: PIN }, late); assert.ok(r.ok, r.error); assert.equal(r.txn.amount, -pq.amount, 'jumlah sesuai kuotasi');
  const v2 = await g(S, 'paylater', late); assert.equal(v2.account.used, 0); assert.ok(v2.bills.every(b => b.status === 'lunas'));
});
await t('voucher pengguna baru, event, toko, tumpukan & kuota: aturan ditegakkan server', async () => {
  const E = clk(D + 41, 11); // hari ke-1 bulan: bukan event gajian
  // pengguna baru: belum ada pesanan di Laza → boleh; setelah pesanan, tidak
  const lz = await g(L, 'vouchers', E); assert.equal(lz.vouchers.find(x => x.code === 'LAZ-BARU').state, 'claimable');
  assert.equal((await g(S, 'vouchers', E)).vouchers.find(x => x.code === 'SHO-BARU').state, 'ineligible', 'sudah pernah belanja di Shopindo');
  // toko tertentu & kuota habis ditandai
  const tk = await g(T, 'vouchers', E); assert.ok(tk.vouchers.find(x => x.code === 'TOK-UMKM').seller);
  // tumpukan: dua voucher diskon melebihi batas ditolak
  for (const code of ['SHO-HEMAT10', 'SHO-NOMINAL']) await p(S, 'vouchers/claim', { code }, E);
  const a = (await g(S, 'me', E)).addresses[0].id; const cp = (await g(S, 'products?sort=mahal&min=200000&max=900000', E)).items[0];
  await p(S, 'cart', { op: 'add', listing: cp.id, qty: 1 }, E);
  const two = await p(S, 'quote', { ship: 'reguler', address: a, vouchers: ['SHO-HEMAT10', 'SHO-NOMINAL'], method: 'saldo' }, E); assert.equal(two.ok, false); assert.match(two.error, /hanya mengizinkan/);
  const fake = await p(S, 'quote', { ship: 'reguler', address: a, vouchers: ['SHO-GAJIAN'], method: 'saldo' }, E); assert.equal(fake.ok, false);
  const nm = await p(S, 'quote', { ship: 'reguler', address: a, vouchers: ['SHO-HEMAT10'], method: 'saldo' }, E); assert.ok(nm.ok, nm.error);
  await p(S, 'cart', { op: 'remove', listing: cp.id, variant: (await g(S, 'cart', E)).items[0].variant }, E);
});
await t('event tanggal: voucher gajian aktif pada tgl 25–30', async () => {
  const base = D + 41, E = clk(base - (base % 30) + 25, 9); // tanggal 26 bulan itu (dom ≥ 25)
  await sync(E, 5_000_000); const v = await g(S, 'vouchers', E); const gj = v.vouchers.find(x => x.code === 'SHO-GAJIAN');
  assert.ok(['claimable', 'claimed'].includes(gj.state), 'state: ' + gj.state);
});
let doneOrder;
await t('pesanan marketplace tampil di Order Center, selesai → klaim → barang masuk inventori + cashback', async () => {
  const E = clk(D + 41 + 60, 9); await sync(E, 5_000_000);
  const s0 = await call(V, 'GET', '/api/shop/orders' + q(E)); assert.ok(s0.orders.length >= 2); assert.ok(s0.orders.every(o => o.market || o.store));
  const o = s0.orders.find(x => x.fulStatus === 'ready_for_pickup' || x.fulStatus === 'delivered' || x.progress === 100) || s0.orders[0]; assert.ok(o, 'ada pesanan'); doneOrder = o;
  const c = await call(V, 'POST', '/api/shop/order/claim', { order: o.id, clock: E }); assert.ok(c.ok, c.error); assert.equal(c.order.fulStatus, 'completed');
  assert.ok(c.grants.length >= 1, 'grant tercatat');
  const again = await call(V, 'POST', '/api/shop/order/claim', { order: o.id, clock: E }); assert.ok(again.duplicate); assert.equal(again.grants.length, 0, 'tidak ganda');
});
await t('Tokomart tidak menerima metode paylater; Laza punya kebijakan sendiri', async () => {
  const r = await p(T, 'quote', { ship: 'reguler', method: 'paylater' }, C); assert.equal(r.ok, false);
});
await t('data persisten & terhapus saat karakter baru', async () => {
  const C2 = clk(D + 200, 10); await sync(C2, 5_000_000); assert.ok((await g(S, 'me', C2)).ok, 'akun bertahan');
  assert.ok((await call(V, 'POST', '/api/profile', { name: 'Baru', birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 })).ok);
  assert.ok((await call(V, 'PUT', '/api/game', { game: game(D + 200, 10, 100000) })).ok);
  const l = await call(V, 'GET', '/api/mp/launcher' + q(C2)); assert.ok(l.markets.every(m => m.account === null && m.paylater === null));
});
console.log(`\n${n} tes marketplace lulus`); srv.kill();
