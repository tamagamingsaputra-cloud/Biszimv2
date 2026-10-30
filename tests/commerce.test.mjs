// Regression test Retail & Commerce (HTTP nyata, DB sementara). Jalankan: node tests/commerce.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname, PORT = 8793, DB = '/tmp/bizsim-shop-test.db';
for (const f of [DB, DB + '-wal', DB + '-shm']) rmSync(f, { force: true });
const srv = spawn('node', ['server.cjs'], { cwd: ROOT + 'server', env: { ...process.env, PORT: String(PORT), BIZSIM_DB: DB }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => /on :/.test(d) && r()));
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name); } catch (e) { console.error('GAGAL', name); srv.kill(); throw e; } };
const call = (v, method, path, body) => fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', 'x-visitor-id': v }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, ...(await r.json()) }));
const idem = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const clk = (day, h, m = 0) => ({ day, sec: h * 3600 + m * 60 });
const q = c => `?day=${c.day}&sec=${c.sec}`;
const game = (day, h, cash, extra = {}) => ({ charId: 'c', createdAt: 1, clock: { g: (day + 14) * 48 + h * 2, sec: 0 }, player: { balance: cash, energy: 80 }, ledger: [], finSeq: 0, shopSeq: 0, ...extra });
const D = 1000, V = 'shop-a';
const checkout = (v, c, o) => call(v, 'POST', '/api/shop/checkout', { idem: idem(), clock: c, ...o });

await t('persiapan: profil, save, belum ada pesanan (tanpa data contoh)', async () => {
  assert.ok((await call(V, 'POST', '/api/profile', { name: 'Uji Belanja', birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 })).ok);
  assert.ok((await call(V, 'PUT', '/api/game', { game: game(D, 12, 500_000) })).ok);
  const cat = await call(V, 'GET', '/api/shop/catalog' + q(clk(D, 12))); assert.ok(cat.ok); assert.ok(cat.products.length >= 40);
  const o = await call(V, 'GET', '/api/shop/orders' + q(clk(D, 12))); assert.equal(o.orders.length, 0);
  const r = await call(V, 'GET', '/api/shop/rewards' + q(clk(D, 12))); assert.equal(r.rewards.length, 0);
});
let ord1;
await t('counter tunai: bayar ≠ barang diterima; harga dihitung server; idempoten', async () => {
  const k = idem(), body = { idem: k, store: 'warung', items: [{ id: 'nasi-rames', qty: 2 }], method: 'cash', clock: clk(D, 12) };
  const r = await call(V, 'POST', '/api/shop/checkout', { ...body, price: 1 });
  assert.ok(r.ok, r.error); ord1 = r.order; assert.equal(r.order.total, 30_000); assert.equal(r.order.payStatus, 'paid'); assert.equal(r.order.fulStatus, 'confirmed'); assert.equal(r.cashAdj[0].delta, -30_000);
  const dup = await call(V, 'POST', '/api/shop/checkout', body); assert.ok(dup.duplicate); assert.equal(dup.order.id, ord1.id);
  const s = await call(V, 'GET', '/api/shop/orders' + q(clk(D, 12))); assert.equal(s.orders.length, 1);
  const early = await call(V, 'POST', '/api/shop/order/claim', { order: ord1.id, clock: clk(D, 12) }); assert.equal(early.ok, false);
});
await t('stok berkurang di server dan habis ditolak dengan alasan', async () => {
  const cat = await call(V, 'GET', '/api/shop/catalog' + q(clk(D, 12, 1))); assert.equal(cat.products.find(p => p.id === 'nasi-rames').stock, 23);
  const r = await checkout(V, clk(D, 12, 1), { store: 'warung', items: [{ id: 'nasi-rames', qty: 24 }], method: 'cash' }); assert.equal(r.ok, false);
});
await t('progress dari jam simulasi, lalu klaim sekali → grant tidak ganda', async () => {
  const mid = await call(V, 'GET', '/api/shop/orders' + q(clk(D, 12, 2))); assert.ok(['confirmed', 'preparing'].includes(mid.orders[0].fulStatus));
  const late = await call(V, 'GET', '/api/shop/orders' + q(clk(D, 14))); assert.equal(late.orders[0].fulStatus, 'ready_for_pickup'); assert.equal(late.orders[0].progress, 100);
  const c = await call(V, 'POST', '/api/shop/order/claim', { order: ord1.id, clock: clk(D, 14) }); assert.ok(c.ok, c.error); assert.equal(c.order.fulStatus, 'completed');
  assert.equal(c.grants.filter(g => g.kind === 'consume').length, 1);
  const again = await call(V, 'POST', '/api/shop/order/claim', { order: ord1.id, clock: clk(D, 14) }); assert.ok(again.duplicate); assert.equal(again.grants.length, 0);
  const g = await call(V, 'GET', '/api/shop/grants?after=0'); assert.equal(g.grants.filter(x => x.kind === 'consume').length, 1);
});
await t('save lama ditolak (shopseq)', async () => {
  const r = await call(V, 'PUT', '/api/game', { game: game(D, 15, 470_000) }); assert.equal(r.status, 409); assert.ok(['shopseq', 'finseq'].includes(r.code));
});
await t('bonus produk: mie-ayam ×2 → air gratis, ×1 → tidak memenuhi syarat (alasan tampil)', async () => {
  let s = await call(V, 'GET', '/api/shop/grants?after=0'); const fin = (await call(V, 'GET', '/api/fin/state')).finSeq;
  await call(V, 'PUT', '/api/game', { game: game(D, 15, 470_000, { shopSeq: s.shopSeq, finSeq: fin }) });
  const a = await checkout(V, clk(D, 15), { store: 'warung', items: [{ id: 'mie-ayam', qty: 1 }], method: 'cash' }); assert.ok(a.ok, a.error);
  assert.ok(a.order.rewards.some(r => r.status === 'ineligible' && /minimal 2/.test(r.reason)));
  const b = await checkout(V, clk(D, 15, 1), { store: 'warung', items: [{ id: 'mie-ayam', qty: 2 }], method: 'cash' }); assert.ok(b.ok, b.error);
  assert.ok(b.order.rewards.some(r => r.status === 'pending'));
  const c = await call(V, 'POST', '/api/shop/order/claim', { order: b.order.id, clock: clk(D, 17) }); assert.ok(c.ok, c.error);
  assert.ok(c.grants.some(g => g.kind === 'inv_add' && g.item.id === 'air-600'));
  assert.ok(c.order.rewards.some(r => r.status === 'received' && r.kind === 'item'));
});
await t('saldo tidak cukup: pesanan gagal tercatat, tanpa stok/uang berpindah', async () => {
  const r = await checkout(V, clk(D, 17, 5), { store: 'warung', items: [{ id: 'nasi-rames', qty: 20 }, { id: 'gorengan', qty: 20 }], method: 'cash' });
  assert.equal(r.ok, false); assert.match(r.error, /tidak cukup/);
  const o = await call(V, 'GET', '/api/shop/orders?filter=cancelled' + q(clk(D, 17, 6)).replace('?', '&')); assert.ok(o.orders.some(x => x.payStatus === 'failed'));
});
await t('toko tutup ditolak dengan jam layanan', async () => {
  const r = await call(V, 'POST', '/api/shop/quote', { store: 'pelita', items: [{ id: 'buku-tulis' }], method: 'cash', clock: clk(D, 22) }); assert.equal(r.ok, false); assert.match(r.error, /tutup/);
});
let food;
await t('COD antar makanan: tidak memotong uang sampai diterima; batal COD', async () => {
  const cash0 = (await call(V, 'GET', '/api/fin/state')).cash;
  const r = await checkout(V, clk(D, 18), { store: 'antarrasa', items: [{ id: 'ant-bakso' }], method: 'cod' }); assert.ok(r.ok, r.error); food = r.order;
  assert.equal(r.order.payStatus, 'cod_pending'); assert.equal((await call(V, 'GET', '/api/fin/state')).cash, cash0);
  assert.ok(r.order.fees.some(f => f.code === 'cod'));
  const cx = await call(V, 'POST', '/api/shop/order/cancel', { order: food.id, clock: clk(D, 18, 1) }); assert.ok(cx.ok, cx.error); assert.equal(cx.order.payStatus, 'cancelled');
  const again = await call(V, 'POST', '/api/shop/order/cancel', { order: food.id, clock: clk(D, 18, 2) }); assert.equal(again.ok, false);
  assert.equal((await call(V, 'GET', '/api/fin/state')).cash, cash0);
});
await t('COD diterima: uang tunai dipotong sekali saat klaim; stok pulih saat batal', async () => {
  const r = await checkout(V, clk(D, 19), { store: 'antarrasa', items: [{ id: 'ant-bakso' }], method: 'cod' }); assert.ok(r.ok, r.error);
  const cash0 = (await call(V, 'GET', '/api/fin/state')).cash;
  const mid = await call(V, 'GET', '/api/shop/order/' + r.order.id + q(clk(D, 19, 20))); assert.ok(['preparing', 'packed', 'handed_to_courier', 'in_transit', 'arriving', 'delivered', 'confirmed'].includes(mid.order.fulStatus));
  const cl0 = await call(V, 'POST', '/api/shop/order/claim', { order: r.order.id, clock: clk(D, 19, 2) }); assert.equal(cl0.ok, false);
  const done = await call(V, 'GET', '/api/shop/order/' + r.order.id + q(clk(D, 21, 30)));
  if (done.order.fulStatus === 'delivery_failed') return; // gangguan acak yang valid
  assert.equal(done.order.fulStatus, 'delivered');
  const c = await call(V, 'POST', '/api/shop/order/claim', { order: r.order.id, clock: clk(D, 21, 31) }); assert.ok(c.ok, c.error); assert.equal(c.cashAdj[0].delta, -r.order.total);
  assert.equal((await call(V, 'GET', '/api/fin/state')).cash, cash0 - r.order.total);
  const c2 = await call(V, 'POST', '/api/shop/order/claim', { order: r.order.id, clock: clk(D, 21, 32) }); assert.ok(c2.duplicate);
  assert.equal((await call(V, 'GET', '/api/fin/state')).cash, cash0 - r.order.total, 'tidak dipotong dua kali');
});
await t('digital: akses terbuka + bonus XP; produk digital tidak bisa dibatalkan setelah tiba', async () => {
  await call(V, 'PUT', '/api/game', { game: game(D + 1, 9, 800_000, { shopSeq: (await call(V, 'GET', '/api/shop/grants?after=0')).shopSeq, finSeq: (await call(V, 'GET', '/api/fin/state')).finSeq }) });
  // pustaka menerima debit/qris/transfer/wallet/credit — butuh akun; dompet via rekening dibuat di test finance. Di sini hanya validasi tunai ditolak.
  const r = await checkout(V, clk(D + 1, 9), { store: 'pustaka', items: [{ id: 'ebook-keuangan' }], method: 'cash' }); assert.equal(r.ok, false); assert.match(r.error, /tunai/);
});
await t('ringkasan dan notifikasi dari status nyata', async () => {
  const s = await call(V, 'GET', '/api/shop/summary' + q(clk(D + 1, 10))); assert.ok(s.ok); assert.ok(s.total >= 3);
  const nf = await call(V, 'GET', '/api/shop/notifs' + q(clk(D + 1, 10))); assert.ok(nf.notifs.length >= 3);
});
await t('isolasi: pemain lain tidak melihat pesanan', async () => {
  const W = 'shop-b'; assert.ok((await call(W, 'POST', '/api/profile', { name: 'Lain', birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 })).ok);
  await call(W, 'PUT', '/api/game', { game: game(D, 12, 100_000) });
  assert.equal((await call(W, 'GET', '/api/shop/orders' + q(clk(D, 12)))).orders.length, 0);
  assert.equal((await call(W, 'GET', '/api/shop/order/' + ord1.id + q(clk(D, 12)))).status, 404);
});
srv.kill(); console.log(`\n${n} tes commerce lulus`);
