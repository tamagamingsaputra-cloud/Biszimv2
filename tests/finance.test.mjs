// Regression test server Personal Finance (HTTP nyata ke server dengan DB sementara). Jalankan: node tests/finance.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
import { createRequire } from 'node:module';
const ROOT = new URL('../', import.meta.url).pathname, PORT = 8791, DB = '/tmp/bizsim-fin-test.db';
for (const f of [DB, DB + '-wal', DB + '-shm']) rmSync(f, { force: true });
const srv = spawn('node', ['server.cjs'], { cwd: ROOT + 'server', env: { ...process.env, PORT: String(PORT), BIZSIM_DB: DB }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => /on :/.test(d) && r()));
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name); } catch (e) { console.error('GAGAL', name); srv.kill(); throw e; } };
const call = (v, method, path, body) => fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', 'x-visitor-id': v }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, ...(await r.json()) }));
const idem = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const clk = (day, h, m = 0) => ({ day, sec: h * 3600 + m * 60 });
const game = (day, h, cash, extra = {}) => ({ charId: 'c', createdAt: 1, clock: { g: (day + 14) * 48 + h * 2, sec: 0 }, player: { balance: cash, energy: 80 }, ledger: [], finSeq: 0, ...extra });
async function mk(v, day, cash, extra) {
  const r = await call(v, 'POST', '/api/profile', { name: 'Uji ' + v, birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 }); assert.ok(r.ok, r.error);
  const s = await call(v, 'PUT', '/api/game', { game: game(day, 9, cash, extra) }); assert.ok(s.ok, s.error);
}
// usia: 6 th di hari 0; ±56 hari game per tahun usia
const ADULT = 1000, TEEN = 500; // ~23 th dan ~15 th
const V = 'fin-a';

await t('PIN: validasi & disimpan sebagai hash', async () => {
  await mk(V, ADULT, 3_000_000);
  assert.equal((await call(V, 'POST', '/api/fin/pin', { pin: '1234' })).ok, false);
  assert.equal((await call(V, 'POST', '/api/fin/pin', { pin: '111111' })).ok, false, 'PIN angka sama ditolak');
  assert.ok((await call(V, 'POST', '/api/fin/pin', { pin: '482915' })).ok);
  const Database = createRequire(ROOT + 'server/server.cjs')('better-sqlite3');
  const row = new Database(DB, { readonly: true }).prepare('SELECT pin_hash, pin_salt FROM fin_state WHERE visitor=?').get(V);
  assert.ok(row.pin_hash.length === 64 && !row.pin_hash.includes('482915') && row.pin_salt.length === 32);
});
await t('buka rekening: jam teller, setoran awal, kartu debit otomatis', async () => {
  const wd = d => ((d + 1) % 7 + 7) % 7; let d = ADULT; while (wd(d) < 1 || wd(d) > 5) d++;
  const closed = await call(V, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'bnr', initial: 1_000_000, pin: '482915', clock: clk(d, 19) });
  assert.equal(closed.ok, false); assert.match(closed.error, /Senin–Jumat 8:00–15:00/);
  const low = await call(V, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'bnr', initial: 100_000, pin: '482915', clock: clk(d, 10) });
  assert.match(low.error, /minimal Rp 250\.000/);
  const k = idem(); const ok = await call(V, 'POST', '/api/fin/open', { idem: k, kind: 'bank', provider: 'bnr', initial: 1_000_000, pin: '482915', clock: clk(d, 10) });
  assert.ok(ok.ok, ok.error); assert.equal(ok.cash, 2_000_000); assert.equal(ok.cashAdj[0].delta, -1_000_000); assert.equal(ok.cards.length, 1);
  const again = await call(V, 'POST', '/api/fin/open', { idem: k, kind: 'bank', provider: 'bnr', initial: 1_000_000, pin: '482915', clock: clk(d, 10) });
  assert.equal(again.cash, 2_000_000, 'idempoten: tidak memotong dua kali');
  globalThis.D = d;
});
await t('save lama ditolak (finseq) dan menerima penyesuaian', async () => {
  const r = await call(V, 'PUT', '/api/game', { game: game(D, 11, 3_000_000) });
  assert.equal(r.status, 409); assert.equal(r.code, 'finseq'); assert.equal(r.adjustments[0].delta, -1_000_000);
  const ok = await call(V, 'PUT', '/api/game', { game: game(D, 11, 2_000_000, { finSeq: r.adjustments.at(-1).seq }) }); assert.ok(ok.ok);
});
await t('jam simulasi mundur ditolak', async () => {
  const r = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'serbamart', items: [{ id: 'air-600' }], method: 'cash', clock: clk(D, 9) });
  assert.equal(r.ok, false); assert.match(r.error, /tertinggal/);
});
let bnr, wallet;
await t('checkout: metode difilter merchant, debit memotong rekening, PIN salah', async () => {
  const s = await call(V, 'GET', '/api/fin/state'); bnr = s.accounts.find(a => a.provider === 'bnr');
  const w = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'warung', items: [{ id: 'nasi-rames' }], method: 'debit', source: bnr.id, pin: '482915', clock: clk(D, 12) });
  assert.equal(w.ok, false); assert.match(w.error, /tidak menerima kartu debit/);
  const bad = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'minang', items: [{ id: 'nasi-padang' }], method: 'debit', source: bnr.id, pin: '000001', clock: clk(D, 12) });
  assert.match(bad.error, /PIN salah \(1\/3\)/);
  const ok = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'minang', items: [{ id: 'nasi-padang', qty: 2 }], method: 'debit', source: bnr.id, pin: '482915', clock: clk(D, 12) });
  assert.ok(ok.ok, ok.error); assert.equal(ok.accounts.find(a => a.id === bnr.id).balance, 1_000_000 - 64_000); assert.equal(ok.txn.status, 'berhasil');
  const closed = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'minang', items: [{ id: 'nasi-padang' }], method: 'cash', clock: clk(D, 23) });
  assert.match(closed.error, /tutup/);
});
await t('kartu debit nonaktif → transaksi ditolak', async () => {
  const s = await call(V, 'GET', '/api/fin/state'); const c = s.cards[0];
  assert.ok((await call(V, 'POST', '/api/fin/card', { card: c.id, action: 'nonaktifkan', pin: '482915' })).ok);
  const r = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'minang', items: [{ id: 'nasi-padang' }], method: 'debit', source: bnr.id, pin: '482915', clock: clk(D, 13) });
  assert.match(r.error, /nonaktif/);
  assert.ok((await call(V, 'POST', '/api/fin/card', { card: c.id, action: 'aktifkan', pin: '482915' })).ok);
});
await t('dompet digital: top up dari bank, batas akun basic, QRIS', async () => {
  const o = await call(V, 'POST', '/api/fin/open', { idem: idem(), kind: 'wallet', provider: 'danakita', pin: '482915', clock: clk(D, 13) }); assert.ok(o.ok, o.error);
  wallet = o.accounts.find(a => a.provider === 'danakita');
  const big = await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: wallet.id, amount: 2_500_000, pin: '482915', clock: clk(D, 13) });
  assert.match(big.error, /maksimal Rp 2\.000\.000/);
  const top = await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: wallet.id, amount: 200_000, pin: '482915', clock: clk(D, 13) }); assert.ok(top.ok, top.error);
  assert.equal(top.accounts.find(a => a.id === wallet.id).balance, 200_000);
  const q = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'warung', items: [{ id: 'es-teh' }], method: 'qris', source: wallet.id, pin: '482915', clock: clk(D, 14) });
  assert.ok(q.ok, q.error); assert.equal(q.accounts.find(a => a.id === wallet.id).balance, 196_000);
  const nope = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'warung', items: [{ id: 'es-teh' }], method: 'wallet', source: wallet.id, pin: '482915', clock: clk(D, 14) });
  assert.equal(nope.ok, false, 'warung tidak menerima dompet langsung, hanya QRIS');
});
await t('saldo kurang → transaksi Gagal tercatat, saldo tidak berubah', async () => {
  const r = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'pasarku', items: [{ id: 'kasur' }], method: 'wallet', source: wallet.id, pin: '482915', clock: clk(D, 14) });
  assert.match(r.error, /tidak menerima DanaKita/);
  const b0 = (await call(V, 'GET', '/api/fin/state')).accounts.find(a => a.id === bnr.id).balance;
  const f = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'pasarku', items: [{ id: 'kasur' }], method: 'transfer', source: bnr.id, pin: '482915', clock: clk(D, 14) });
  assert.equal(f.status, 402); assert.equal(f.txn.status, 'gagal'); assert.equal(f.accounts.find(a => a.id === bnr.id).balance, b0);
});
await t('tarik tunai ATM: kelipatan 50rb, tunai bertambah', async () => {
  assert.match((await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: 'cash', amount: 120_000, pin: '482915', clock: clk(D, 14) })).error, /kelipatan/);
  const r = await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: 'cash', amount: 100_000, pin: '482915', clock: clk(D, 14) });
  assert.ok(r.ok, r.error); assert.equal(r.cash, 2_100_000);
});
await t('pesan antar: status dari jam game, batal → Reversed + refund', async () => {
  const jp = await call(V, 'POST', '/api/fin/open', { idem: idem(), kind: 'wallet', provider: 'gojalan', pin: '482915', clock: clk(D, 14) });
  const g = jp.accounts.find(a => a.provider === 'gojalan');
  await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: g.id, amount: 100_000, pin: '482915', clock: clk(D, 14) });
  const o = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'antarrasa', items: [{ id: 'ant-ayam' }], method: 'wallet', source: g.id, pin: '482915', clock: clk(D, 15) });
  assert.ok(o.ok, o.error); assert.equal(o.quote.total, 27_000 + 9_000 + 2_000);
  const early = await call(V, 'POST', '/api/fin/order/receive', { order: o.order.id, clock: clk(D, 15, 10) }); assert.match(early.error, /diproses/);
  const c = await call(V, 'POST', '/api/fin/order/cancel', { order: o.order.id, clock: clk(D, 15, 10) }); assert.ok(c.ok, c.error);
  assert.equal(c.accounts.find(a => a.id === g.id).balance, 100_000, 'refund penuh ke dompet (biaya top-up dipotong dari rekening)');
  assert.equal(c.tx.find(x => x.id === o.txn.id).status, 'reversed'); assert.ok(c.tx.some(x => x.kind === 'reversal' && x.reversalOf === o.txn.id));
  const o2 = await call(V, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'antarrasa', items: [{ id: 'ant-ayam' }], method: 'cod', clock: clk(D, 16) });
  assert.equal(o2.txn.status, 'pending');
  const late = await call(V, 'POST', '/api/fin/order/cancel', { order: o2.order.id, clock: clk(D, 16, 30) }); assert.match(late.error, /diantar/);
  const rec = await call(V, 'POST', '/api/fin/order/receive', { order: o2.order.id, clock: clk(D, 17) }); assert.ok(rec.ok, rec.error);
  assert.equal(rec.tx.find(x => x.id === o2.txn.id).status, 'berhasil'); assert.equal(rec.cashAdj[0].delta, -38_000);
  const dup = await call(V, 'POST', '/api/fin/order/receive', { order: o2.order.id, clock: clk(D, 17) }); assert.ok(dup.duplicate); assert.equal(dup.cash, rec.cash);
});
await t('kartu kredit: syarat pendapatan, limit, tagihan, minimum, denda, skor', async () => {
  const V2 = 'fin-b'; await mk(V2, ADULT, 5_000_000, { ledger: Array.from({ length: 30 }, () => ({ income: { gaji: 150_000 }, expense: {} })) });
  await call(V2, 'POST', '/api/fin/pin', { pin: '730194' });
  const wd = d => ((d + 1) % 7 + 7) % 7; let d = ADULT; while (wd(d) < 1 || wd(d) > 5) d++;
  const b = await call(V2, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'bnr', initial: 2_000_000, pin: '730194', clock: clk(d, 9) }); assert.ok(b.ok, b.error);
  const bank = b.accounts[0];
  const a = await call(V2, 'POST', '/api/fin/credit/apply', { product: 'bnr-classic', pin: '730194', clock: clk(d, 9) }); assert.ok(a.ok, a.error);
  const cc = a.accounts.find(x => x.kind === 'credit'); assert.equal(cc.limit, 13_500_000);
  const over = await call(V2, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'pasarku', items: [{ id: 'kasur', qty: 10 }], method: 'credit', source: cc.id, pin: '730194', clock: clk(d, 10) });
  assert.equal(over.txn.status, 'gagal', 'tidak bisa melebihi limit');
  const p = await call(V2, 'POST', '/api/fin/pay', { idem: idem(), merchant: 'pasarku', items: [{ id: 'kasur' }], method: 'credit', source: cc.id, pin: '730194', clock: clk(d, 10) });
  assert.ok(p.ok); const owed = 1_450_000 + 12_000; assert.equal(p.accounts.find(x => x.id === cc.id).balance, owed);
  let sd = d + 1; while (((sd % 30) + 30) % 30 + 1 !== 20) sd++;
  const s1 = await call(V2, 'POST', '/api/fin/advance', { gameDay: sd }); const stm = s1.statements[0];
  assert.equal(stm.amount, owed); assert.equal(stm.minDue, Math.round(owed * 0.05)); assert.equal(stm.dueDay, sd + 15);
  const s2 = await call(V2, 'POST', '/api/fin/advance', { gameDay: sd + 15 });
  assert.equal(s2.statements[0].status, 'telat'); assert.equal(s2.score, 600 + 3 * 0 - 35);
  assert.equal(s2.accounts.find(x => x.id === cc.id).balance, owed + 100_000 + Math.round(owed * 0.0175));
  const pay = await call(V2, 'POST', '/api/fin/credit/pay', { idem: idem(), card: cc.id, from: bank.id, amount: 500_000, pin: '730194', clock: clk(sd + 16, 10) });
  assert.ok(pay.ok, pay.error); assert.equal(pay.accounts.find(x => x.id === bank.id).balance, 2_000_000 - 12_500 - 500_000, 'termasuk biaya admin akhir bulan BNR'); assert.ok(pay.tx.some(x => x.kind === 'biaya_admin'));
  const re = await call(V2, 'POST', '/api/fin/advance', { gameDay: sd + 15 }); assert.equal(re.statements.length, 1, 'advance idempoten');
});
await t('batas usia: remaja tidak bisa kartu kredit/bank umum, bisa tabungan pelajar', async () => {
  const V3 = 'fin-c'; await mk(V3, TEEN, 300_000); await call(V3, 'POST', '/api/fin/pin', { pin: '558201' });
  let d = TEEN; while (((d + 1) % 7) < 1 || ((d + 1) % 7) > 5) d++;
  assert.match((await call(V3, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'sakti', initial: 0, pin: '558201', clock: clk(d, 10) })).error, /minimal 17/);
  assert.ok((await call(V3, 'POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'pelajar', initial: 50_000, pin: '558201', clock: clk(d, 10) })).ok);
});
await t('PIN terkunci setelah 3× salah', async () => {
  for (let i = 0; i < 3; i++) await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: wallet.id, amount: 10_000, pin: '999990', clock: clk(D, 18) });
  const r = await call(V, 'POST', '/api/fin/transfer', { idem: idem(), from: bnr.id, to: wallet.id, amount: 10_000, pin: '482915', clock: clk(D, 18) });
  assert.match(r.error, /terkunci/);
});
await t('double submit bersamaan hanya diproses sekali', async () => {
  const V4 = 'fin-d'; await mk(V4, ADULT, 100_000);
  const k = idem(); const body = { idem: k, merchant: 'serbamart', items: [{ id: 'roti' }], method: 'cash', clock: clk(ADULT, 10) };
  const rs = await Promise.all([1, 2, 3].map(() => call(V4, 'POST', '/api/fin/pay', body)));
  const s = await call(V4, 'GET', '/api/fin/state'); assert.equal(s.cash, 92_000); assert.equal(s.tx.length, 1);
  assert.ok(rs.some(r => r.ok));
});
srv.kill(); console.log(`\n${n} test finance lulus`);
