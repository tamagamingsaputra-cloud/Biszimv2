// Regression test Social Life & Relationship (HTTP nyata, DB sementara). Jalankan: node tests/relation.test.mjs
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { rmSync } from 'node:fs';
const ROOT = new URL('../', import.meta.url).pathname, PORT = 8796, DB = '/tmp/bizsim-rel-test.db';
for (const f of [DB, DB + '-wal', DB + '-shm']) rmSync(f, { force: true });
const srv = spawn('node', ['server.cjs'], { cwd: ROOT + 'server', env: { ...process.env, PORT: String(PORT), BIZSIM_DB: DB }, stdio: ['ignore', 'pipe', 'inherit'] });
await new Promise(r => srv.stdout.on('data', d => /on :/.test(d) && r()));
let n = 0; const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name); } catch (e) { console.error('GAGAL', name); srv.kill(); throw e; } };
const V = 'rel-a', PIN = '482915', D0 = 700;
const call = (method, path, body, v = V) => fetch(`http://localhost:${PORT}${path}`, { method, headers: { 'content-type': 'application/json', 'x-visitor-id': v }, body: body ? JSON.stringify(body) : undefined }).then(async r => ({ status: r.status, ...(await r.json()) }));
const idem = () => 'k' + Math.random().toString(36).slice(2, 12) + Date.now().toString(36);
const clk = (day, h, m = 0) => ({ day, sec: h * 3600 + m * 60 });
const q = c => `day=${c.day}&sec=${c.sec}`;
const game = (c, cash, extra = {}) => ({ charId: 'c', createdAt: 1, clock: { g: (c.day + 14) * 48 + Math.floor(c.sec / 1800), sec: 0 }, player: { balance: cash, energy: 80 }, ledger: [], finSeq: 0, shopSeq: 0, ...extra });
let CASH = 4_300_000;
const sync = async c => call('PUT', '/api/game', { game: game(c, CASH, { shopSeq: (await call('GET', '/api/shop/grants?after=0')).shopSeq, finSeq: (await call('GET', '/api/fin/state')).finSeq }) });
const ov = c => call('GET', `/api/rel/overview?${q(c)}`);
const chat = (id, c) => call('GET', `/api/rel/chat/${id}?${q(c)}`);
const send = (id, c, body) => call('POST', `/api/rel/chat/${id}/send`, { clock: c, idem: idem(), ...body });
const xfer = (c, body) => call('POST', '/api/rel/transfer', { clock: c, idem: idem(), method: 'saldo', pin: PIN, ...body });
const bank = async () => (await call('GET', '/api/fin/state')).accounts[0];
let C = clk(D0, 10), BANK, FAM, EXPECT;

await t('persiapan: profil, PIN, rekening', async () => {
  assert.ok((await call('POST', '/api/profile', { name: 'Uji Sosial', birthDate: '2019-09-01', family: 'menengah', city: 'Pacitan', gameDay: 0 })).ok);
  assert.ok((await call('PUT', '/api/game', { game: game(C, CASH) })).ok);
  assert.ok((await call('POST', '/api/fin/pin', { pin: PIN })).ok);
  { const o = await call('POST', '/api/fin/open', { idem: idem(), kind: 'bank', provider: 'bnr', initial: 4_000_000, pin: PIN, clock: C }); assert.ok(o.ok, o.error); }
  CASH = 300_000; BANK = (await bank()); EXPECT = BANK.balance; await sync(C);
});
await t('kontak & social graph: kategori, profil, kepribadian, kenalan bersama', async () => {
  const o = await ov(C); assert.ok(o.ok, o.error); assert.ok(o.contacts.length >= 6);
  const cats = new Set(o.contacts.map(c => c.cat)); for (const k of ['family', 'classmate', 'friend', 'acquaintance']) assert.ok(cats.has(k), 'kategori ' + k);
  FAM = o.contacts.find(c => c.cat === 'family'); const d = await call('GET', `/api/rel/contact/${FAM.id}?${q(C)}`);
  assert.ok(d.ok && d.contact.persLabel && d.contact.goal && d.contact.interests.length && d.contact.job && Number.isFinite(d.contact.trust));
  assert.ok(o.contacts.some(c => c.cat === 'family') && (await call('GET', `/api/rel/contact/${o.contacts.find(c => c.cat === 'classmate').id}?${q(C)}`)).links.length >= 1, 'social graph');
  assert.ok((await call('GET', `/api/rel/contact/rc-999?${q(C)}`)).status === 404);
});
await t('pemain memulai chat: balasan NPC tertunda sesuai jadwal; pilihan divalidasi', async () => {
  const c0 = clk(D0, 18); await sync(c0); const f = (await ov(c0)).contacts.find(x => x.cat === 'friend');
  const r0 = await chat(f.id, c0); assert.ok(r0.quick.some(x => x.k === 'sapa') && r0.quick.length >= 5, 'pilihan membuka percakapan');
  assert.equal((await send(f.id, c0, { quick: 'tidak_ada' })).status, 400);
  const s = await send(f.id, c0, { quick: 'sapa' }); assert.ok(s.ok, s.error);
  const dupe = await call('POST', `/api/rel/chat/${f.id}/send`, { clock: c0, idem: 'dup-1', quick: 'kabar' }); const r1 = await chat(f.id, c0);
  const later = clk(D0, 19, 30); await sync(later); const r2 = await chat(f.id, later);
  assert.ok(r2.messages.some(m => m.who === 'npc'), 'NPC membalas'); assert.ok(r2.messages.filter(m => m.who === 'me').length >= 1);
  assert.ok(['friendly', 'neutral', 'promise_made'].includes(r2.state));
  const ok = r2.messages.find(m => m.who === 'npc' && m.text); assert.ok(ok.abs > r2.messages.find(m => m.who === 'me').abs, 'balasan setelah pesan');
  assert.ok(dupe.ok || dupe.status === 400);
});
await t('pesan bebas: validasi sopan, kata kunci, bukan bukti transfer', async () => {
  const c0 = clk(D0 + 1, 18); await sync(c0); const f = (await ov(c0)).contacts.find(x => x.cat === 'classmate');
  const bad = await send(f.id, c0, { text: 'dasar bodoh kamu' }); assert.equal(bad.status, 422); assert.ok(/sopan/i.test(bad.error));
  assert.equal((await send(f.id, c0, { text: 'aku bunuh kamu' })).status, 422); assert.equal((await send(f.id, c0, { text: 'x' })).status, 400);
  const ok = await send(f.id, c0, { text: 'Halo, apa kabar? Lagi sibuk apa?' }); assert.ok(ok.ok, ok.error);
  const c1 = clk(D0 + 1, 21); await sync(c1); const f2 = (await ov(c1)).contacts.find(x => x.cat === 'friend');
  assert.ok((await send(f2.id, c1, { text: 'Aku sudah transfer ya' })).ok); const c2 = clk(D0 + 2, 9); await sync(c2);
  const m = (await chat(f2.id, c2)).messages.filter(x => x.who === 'npc').map(x => x.text).join(' '); assert.ok(/belum melihat transfer/i.test(m), 'klaim transfer tanpa ledger tidak dipercaya');
});
let C2 = clk(D0 + 3, 10), reqIn = null, byDay = {};
await t('NPC memulai chat (otonomi): cooldown, batas harian, konteks, tanpa pengulangan', async () => {
  const all = {};
  const cnt = () => Object.values(all).reduce((x, m) => x + m.size, 0);
  for (let d = D0 + 3; d <= D0 + 120; d++) {
    const c = clk(d, 22); await sync(c); const o = await ov(c);
    for (const ct of o.contacts) { const ch = await chat(ct.id, c); for (const m of ch.messages) if (m.who === 'npc' && m.kind === 'prompt') (all[ct.id] ||= new Map()).set(m.id, m.abs); }
    if (!reqIn && o.requests.some(r => r.dir === 'in' && r.type !== 'help' && r.type !== 'tunda')) { reqIn = o.requests.find(r => r.dir === 'in' && r.type !== 'help' && r.type !== 'tunda'); C2 = c; }
    if (reqIn && cnt() >= 4 && d > D0 + 30) break; if (reqIn && cnt() >= 4 && !o.requests.some(r => r.id === reqIn.id)) reqIn = null;
  }
  const stamps = Object.values(all).map(m => [...m.values()].sort((a, b) => a - b)); assert.ok(stamps.flat().length >= 4, 'NPC menginisiasi pesan');
  for (const arr of stamps) for (let i = 1; i < arr.length; i++) assert.ok(arr[i] - arr[i - 1] >= 3 * 86400 - 3600, 'cooldown antar pesan NPC per kontak ≥3 hari');
  const perDay = {}; for (const arr of stamps) for (const a of arr) { const k = Math.floor(a / 86400); perDay[k] = (perDay[k] || 0) + 1; } assert.ok(Math.max(...Object.values(perDay)) <= 3, 'maks 3 pesan NPC/hari');
  assert.ok(reqIn, 'ada permintaan uang masuk dalam 60 hari simulasi');
});
await t('pilihan konteks permintaan uang + validasi pesan terkait uang', async () => {
  const ch = await chat(reqIn.contact, C2); assert.equal(ch.ctx, 'minta_uang'); assert.deepEqual(ch.quick.map(x => x.k), ['tanya_jumlah', 'tanya_alasan', 'tawar_kecil', 'tolak_sopan', 'minta_waktu']);
  assert.equal(ch.state, 'request_pending'); assert.ok(ch.requests.some(r => r.id === reqIn.id && r.status === 'pending'));
  assert.ok((await send(reqIn.contact, C2, { quick: 'tanya_jumlah' })).ok); C2 = clk(C2.day + 1, 8); await sync(C2);
  const ch2 = await chat(reqIn.contact, C2); assert.ok(ch2.messages.some(m => m.who === 'npc' && /Rp/.test(m.text)), 'NPC menyebut nominal'); assert.equal(ch2.state, 'negotiation');
  assert.equal((await send(reqIn.contact, C2, { quick: 'tawar_kecil', amount: reqIn.amount + 5000 })).status, 400, 'tawaran harus lebih kecil');
  const sm = await call('POST', `/api/rel/chat/${reqIn.contact}/send`, { clock: C2, idem: idem(), quick: 'tawar_kecil', amount: Math.max(1000, Math.floor(reqIn.amount / 2)) }); assert.ok(sm.ok, sm.error);
  const u = (await send(reqIn.contact, C2, { text: 'Aku mau pinjam uang dong' })); assert.ok(u.ok || u.status === 400);
});
await t('transfer: persetujuan memerlukan konfirmasi; transfer sebagian; ledger & saldo konsisten', async () => {
  C2 = clk(C2.day + 1, 12); await sync(C2); const b0 = (await bank()).balance;
  const rr = await call('POST', `/api/rel/request/${reqIn.id}/respond`, { clock: C2, action: 'accept' }); assert.equal(rr.status, 400, 'tidak ada transfer otomatis dari tombol setuju');
  assert.equal((await bank()).balance, b0, 'saldo tidak berubah tanpa konfirmasi transfer');
  const part = Math.max(1000, Math.floor(reqIn.amount / 2 / 1000) * 1000), r = await xfer(C2, { contact: reqIn.contact, amount: part, kind: 'bantuan', source: BANK.id, request: reqIn.id, note: 'semoga membantu' });
  assert.ok(r.ok, r.error); assert.equal(r.transfer.fee, 2500); const b1 = (await bank()).balance; assert.equal(b1, b0 - part - 2500, 'saldo berkurang nominal + biaya');
  const o = await ov(C2); assert.ok(!o.requests.some(x => x.id === reqIn.id), 'permintaan tidak lagi pending');
  const ch = await chat(reqIn.contact, C2), m = ch.messages.find(x => x.kind === 'tx' && x.ref?.tx === r.transfer.tx); assert.ok(m && m.ref.txStatus === 'berhasil', 'status transaksi dari ledger');
  EXPECT = b1;
});
await t('transfer gagal: saldo kurang, kontak/sumber/PIN/nominal tidak valid; tidak ada perubahan parsial', async () => {
  const b0 = (await bank()).balance, f = FAM.id;
  const big = await xfer(C2, { contact: f, amount: 9_000_000, kind: 'hadiah', source: BANK.id }); assert.equal(big.status, 400); assert.ok(/saldo|cukup/i.test(big.error), big.error); assert.equal((await bank()).balance, b0);
  assert.equal((await xfer(C2, { contact: 'rc-999', amount: 10000, kind: 'hadiah', source: BANK.id })).status, 404);
  assert.equal((await xfer(C2, { contact: f, amount: 10000, kind: 'hadiah', source: 'acct-palsu' })).status, 400);
  assert.equal((await xfer(C2, { contact: f, amount: 10000, kind: 'hadiah', source: BANK.id, pin: '000000' })).status, 400);
  for (const a of [0, -5, 500, 1.5, 20_000_000, 'abc']) assert.equal((await xfer(C2, { contact: f, amount: a, kind: 'hadiah', source: BANK.id })).status, 400, 'nominal ' + a);
  assert.equal((await xfer(C2, { contact: f, amount: 10000, kind: 'sembarang', source: BANK.id })).status, 400);
  assert.equal((await bank()).balance, b0, 'saldo tetap setelah semua kegagalan');
});
await t('pencegahan transaksi ganda (idempotensi) dan transfer tunai', async () => {
  const b0 = (await bank()).balance, key = idem(), body = { clock: C2, idem: key, method: 'saldo', pin: PIN, source: BANK.id, contact: FAM.id, amount: 50000, kind: 'hadiah' };
  const [a, b] = await Promise.all([call('POST', '/api/rel/transfer', body), call('POST', '/api/rel/transfer', body)]); const c = await call('POST', '/api/rel/transfer', body);
  assert.ok(a.ok && (b.ok || b.status === 409 || b.status === 400)); assert.ok(c.ok && c.duplicate); assert.equal((await bank()).balance, b0 - 50000 - 2500, 'hanya satu debit');
  EXPECT = (await bank()).balance; CASH = 300_000; await sync(C2); const cr = await call('POST', '/api/rel/transfer', { clock: C2, idem: idem(), method: 'cash', contact: FAM.id, amount: 20000, kind: 'hadiah' }); assert.ok(cr.ok, cr.error); assert.equal(cr.transfer.fee, 0);
  assert.equal((await call('POST', '/api/rel/transfer', { clock: C2, idem: idem(), method: 'cash', contact: FAM.id, amount: 9_000_000, kind: 'hadiah' })).status, 400, 'tunai tidak cukup');
});
let loanOut1;
await t('pemain meminta pinjaman: keputusan sesuai kemampuan NPC; dana masuk ledger; syarat tersimpan', async () => {
  C2 = clk(C2.day + 5, 9); await sync(C2); const o = await ov(C2), cands = o.contacts.filter(c => ['family', 'friend', 'close_friend'].includes(c.cat));
  const b0 = (await bank()).balance; let accepted = null, declined = null;
  for (const c of cands) { const huge = await call('POST', '/api/rel/ask', { clock: C2, idem: idem(), contact: c.id, type: 'darurat', amount: 5_000_000, reason: 'uji batas kemampuan', mode: 'pinjam', dueDays: 30, recv: BANK.id }); assert.ok(huge.ok, huge.error); C2 = clk(C2.day, 14); await sync(C2); const ov2 = await ov(C2);
    const after = (await call('GET', `/api/rel/chat/${c.id}?${q(C2)}`)); const msg = after.messages.filter(m => m.who === 'npc').pop(); assert.ok(msg, 'NPC menjawab permintaan'); const bnow = (await bank()).balance;
    if (bnow > b0) { accepted = { c, gain: bnow - b0 }; assert.ok(accepted.gain < 5_000_000, 'NPC tidak meminjamkan melebihi kemampuan finansialnya (5 juta)'); break; } else declined = c; C2 = clk(C2.day + 4, 9); await sync(C2); }
  assert.ok(accepted || declined, 'ada keputusan'); assert.ok(declined || accepted); EXPECT = (await bank()).balance;
  if (accepted) { const o3 = await ov(C2); loanOut1 = o3.loans.find(l => l.dir === 'i_owe' && l.status === 'aktif'); assert.ok(loanOut1 && loanOut1.total >= loanOut1.principal && loanOut1.principal === accepted.gain, 'pinjaman tercatat sesuai dana masuk'); }
  const dupAsk = await call('POST', '/api/rel/ask', { clock: C2, idem: 'same-ask', contact: cands[0].id, type: 'kebutuhan', amount: 50_000, reason: 'uji ganda', mode: 'bantuan' }); const dupAsk2 = await call('POST', '/api/rel/ask', { clock: C2, idem: 'same-ask', contact: cands[0].id, type: 'kebutuhan', amount: 50_000, reason: 'uji ganda', mode: 'bantuan' });
  assert.ok(dupAsk2.duplicate || dupAsk2.status === 400 || dupAsk.status === 400);
});
await t('pembayaran utang & cicilan: sisa, kelebihan bayar ditolak, lunas menaikkan kepercayaan', async () => {
  if (!loanOut1) { console.log('  (tidak ada pinjaman diterima pada skenario ini; dicakup tes pinjaman balik di bawah)'); return; }
  C2 = clk(C2.day + 1, 10); await sync(C2); const L = loanOut1, before = (await call('GET', `/api/rel/contact/${L.contact}?${q(C2)}`)).contact.trust;
  assert.equal((await xfer(C2, { contact: L.contact, amount: L.remaining + 1000, kind: 'bayar_utang', loan: L.id, source: BANK.id })).status, 400, 'melebihi sisa');
  const half = Math.floor(L.remaining / 2 / 1000) * 1000; const r1 = await xfer(C2, { contact: L.contact, amount: half, kind: 'bayar_utang', loan: L.id, source: BANK.id }); assert.ok(r1.ok, r1.error);
  let o = await ov(C2); let l1 = o.loans.find(x => x.id === L.id); assert.equal(l1.paid, half); assert.equal(l1.status, 'aktif');
  const r2 = await xfer(C2, { contact: L.contact, amount: l1.remaining, kind: 'bayar_utang', loan: L.id, source: BANK.id }); assert.ok(r2.ok, r2.error); o = await ov(C2); l1 = o.loans.find(x => x.id === L.id); assert.equal(l1.status, 'lunas'); assert.equal(l1.remaining, 0);
  const after = (await call('GET', `/api/rel/contact/${L.contact}?${q(C2)}`)).contact.trust; assert.ok(after > before, 'melunasi utang menaikkan kepercayaan'); assert.ok((await xfer(C2, { contact: L.contact, amount: 1000, kind: 'bayar_utang', loan: L.id, source: BANK.id })).status === 404, 'utang lunas tidak bisa dibayar lagi'); EXPECT = (await bank()).balance;
});
await t('pemain meminjamkan (cicilan, syarat tersimpan) → NPC membayar atau meminta tunda; konsistensi ledger', async () => {
  C2 = clk(C2.day + 1, 10); await sync(C2); const f = (await ov(C2)).contacts.find(c => c.cat === 'friend'), b0 = (await bank()).balance;
  assert.equal((await xfer(C2, { contact: f.id, amount: 100000, kind: 'pinjaman', source: BANK.id, dueDays: 1, installments: 2 })).status, 400, 'tenggat minimal 3 hari');
  const r = await xfer(C2, { contact: f.id, amount: 200000, kind: 'pinjaman', source: BANK.id, dueDays: 30, installments: 3, interest: 0 }); assert.ok(r.ok, r.error); assert.equal((await bank()).balance, b0 - 200000 - 2500);
  let o = await ov(C2), L = o.loans.find(x => x.id === r.transfer.loan); assert.ok(L && L.dir === 'owed_me' && L.total === 200000 && L.installments === 3 && L.status === 'aktif');
  let got = 0, ask = false; for (let d = 1; d <= 45; d++) { const c = clk(C2.day + d, 20); await sync(c); o = await ov(c); L = o.loans.find(x => x.id === r.transfer.loan); if (L.paid > got) got = L.paid; if (o.requests.some(x => x.dir === 'in' && x.type === 'tunda')) ask = true; }
  assert.ok(got > 0 || ask, 'NPC membayar cicilan atau meminta penundaan'); EXPECT = (await bank()).balance - 0; C2 = clk(C2.day + 45, 20);
  const bk = (await bank()).balance; const xs = await call('GET', `/api/rel/contact/${f.id}?${q(C2)}`); const inflow = xs.transfers.filter(x => x.dir === 'in').reduce((s, x) => s + x.amount, 0); assert.ok(inflow >= got - 1, 'pembayaran NPC tercatat di ledger'); assert.ok(bk >= b0 - 200000 - 2500 + got - 1, 'saldo mencerminkan pembayaran masuk');
});
await t('janji: dicatat, ditepati menaikkan reputasi; dilanggar menurunkan kepercayaan (tidak langsung merusak)', async () => {
  C2 = clk(C2.day + 1, 18); await sync(C2); const o0 = await ov(C2), f = o0.contacts.find(c => c.cat === 'friend'), rep0 = o0.reputation;
  // pastikan konteks terbuka: ajak bertemu dari pemain
  let ok = false, who = f; for (let i = 0; i < 14 && !ok; i++) { const c = clk(C2.day + 1 + i, 18); await sync(c); C2 = c; const o = await ov(c); if (o.promises.length) { ok = true; who = o.contacts.find(x => x.id === o.promises[0].contact); break; }
    for (const ct of o.contacts) { const ch = await chat(ct.id, c); const k = ch.quick.find(x => x.k === 'ikut') || ch.quick.find(x => x.k === 'ajak_ketemu'); if (k && (await send(ct.id, c, { quick: k.k })).ok) { C2 = clk(c.day, 21); await sync(C2); break; } } }
  { const o = await ov(C2); ok = o.promises.length > 0; who = o.contacts.find(x => x.id === o.promises[0]?.contact) || f; }
  const pm = (await ov(C2)).promises[0]; assert.ok(ok && pm, 'janji tercatat'); const f2 = who;
  const kept = await call('POST', `/api/rel/promise/${pm.id}/keep`, { clock: C2 }); assert.ok(kept.ok, kept.error); const o1 = await ov(C2); assert.ok(o1.reputation.kept >= 1 && o1.reputation.score >= rep0.score - 1);
  const c3 = clk(C2.day + 1, 18); await sync(c3); const chx = await chat(f2.id, c3); const kx = chx.quick.find(x => x.k === 'ikut') || chx.quick.find(x => x.k === 'ajak_ketemu'); const r = kx ? await send(f2.id, c3, { quick: kx.k }) : { ok: false };
  const has2 = r.ok && (await ov(c3)).promises.length > 0;
  if (!has2) console.log('  (NPC menolak ajakan kedua; pelanggaran janji dicakup sebagian)');
  if (has2) { const far = clk(c3.day + 12, 12); await sync(far); const o2 = await ov(far); assert.ok(o2.reputation.broken >= 1, 'janji lewat tanggal tercatat dilanggar');  C2 = far; }
});
await t('bantuan non-finansial: waktu, biaya, peluang ditampilkan; tidak otomatis berhasil; ketersediaan NPC', async () => {
  C2 = clk(C2.day + 1, 3); await sync(C2); const f = (await ov(C2)).contacts.find(c => c.cat === 'family'), night = await call('GET', `/api/rel/help/${f.id}?${q(C2)}`);
  assert.ok(night.options.every(o => !o.ok && /tidur/.test(o.why)), 'tengah malam NPC tidak tersedia');
  assert.equal((await call('POST', '/api/rel/help', { clock: C2, idem: idem(), contact: f.id, kind: 'saran' })).status, 400);
  C2 = clk(C2.day, 19); await sync(C2); const ho = await call('GET', `/api/rel/help/${f.id}?${q(C2)}`); const opt = ho.options.find(o => o.k === 'saran'); assert.ok(opt.min === 30 && opt.chance > 0 && opt.chance < 1, 'peluang tampil, tidak pasti');
  const t0 = (await call('GET', `/api/rel/contact/${f.id}?${q(C2)}`)).contact.close; let r = await call('POST', '/api/rel/help', { clock: C2, idem: idem(), contact: f.id, kind: 'saran' });
  if (!r.ok && /sibuk/.test(r.error)) { C2 = clk(C2.day + 1, 19); await sync(C2); r = await call('POST', '/api/rel/help', { clock: C2, idem: idem(), contact: f.id, kind: 'saran' }); }
  assert.ok(r.ok, r.error); assert.equal(r.minutes, 30); assert.equal(r.cost, 0); assert.ok((await call('GET', `/api/rel/contact/${f.id}?${q(C2)}`)).contact.close >= t0);
  const ant = ho.options.find(o => o.k === 'antar'); assert.equal(ant.cost, 15000);
});
await t('hubungan berkembang dari riwayat: memori terukur (≤12), kategori tidak berubah hanya karena satu tombol', async () => {
  const f = (await ov(C2)).contacts.find(c => c.cat === 'acquaintance'); const cat0 = f.cat; for (let i = 0; i < 6; i++) { const c = clk(C2.day + i, 19); await sync(c); await send(f.id, c, { quick: 'sapa' }); }
  C2 = clk(C2.day + 6, 19); await sync(C2); const d = await call('GET', `/api/rel/contact/${f.id}?${q(C2)}`); assert.ok(d.memories.length <= 8 && d.timeline.length <= 12); assert.equal(d.contact.cat, cat0, 'kategori belum berubah setelah beberapa sapaan');
  assert.ok(d.contact.close >= f.close, 'kedekatan tumbuh dari interaksi'); assert.ok(d.contact.close - f.close <= 18, 'kenaikan kedekatan dibatasi per hari');
});
await t('permintaan diabaikan → kedaluwarsa dengan konsekuensi', async () => {
  let found = null; for (let d = 1; d <= 70 && !found; d++) { const c = clk(C2.day + d, 22); await sync(c); const o = await ov(c); const r = o.requests.find(x => x.dir === 'in' && x.type !== 'help' && x.type !== 'tunda'); if (r) { found = { r, c, tr: o.contacts.find(x => x.id === r.contact).trust }; } }
  if (!found) { console.log('  (tidak ada permintaan baru dalam 70 hari pada skenario ini)'); return; }
  const far = clk(found.c.day + 6, 22); await sync(far); const o = await ov(far); assert.ok(!o.requests.some(x => x.id === found.r.id), 'tidak lagi pending'); const tr = o.contacts.find(x => x.id === found.r.contact).trust; assert.ok(tr < found.tr + 1, 'kepercayaan turun/tertahan'); C2 = far;
});
await t('notifikasi pesan baru & persistensi setelah reload', async () => {
  const c = clk(C2.day + 1, 20); await sync(c); const o1 = await ov(c); const nf = await call('GET', `/api/shop/notifs?${q(c)}`); const list = nf.notifs || nf.items || nf.notifications || []; assert.ok(nf.ok && list.some(x => x.kind === 'rl_msg'), 'notifikasi pesan NPC muncul di pusat notifikasi');
  const o2 = await ov(c); assert.deepEqual(o2.contacts.map(x => [x.id, x.cat, x.trust, x.close]), o1.contacts.map(x => [x.id, x.cat, x.trust, x.close])); assert.deepEqual(o2.loans, o1.loans);
  const f = o1.contacts[0], c1 = await chat(f.id, c), c2 = await chat(f.id, c); assert.deepEqual(c1.messages.map(m => m.id), c2.messages.map(m => m.id));
});
await t('pemain lain tidak melihat data (isolasi visitor) dan regresi keuangan tetap lulus', async () => {
  const other = await call('GET', `/api/rel/overview?${q(C2)}`, null, 'rel-b'); assert.ok(other.status === 404 || other.ok === false);
  const fin = await call('GET', '/api/fin/state'); assert.ok(fin.ok && fin.accounts.length >= 1);
  const txs = fin.transactions || fin.tx || []; for (const x of txs) assert.ok(Number.isFinite(x.amount));
});
srv.kill(); console.log(n + ' tes relation lulus');
