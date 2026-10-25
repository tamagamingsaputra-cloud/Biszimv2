// Uji engine Creator Studio 7.3.1 (tanpa browser/server): node tests/creator-studio-test.mjs
import assert from 'node:assert/strict';
import { DAY_HOOKS } from '../netlify/functions/v700-engine.mjs';
import { route, ensure731, monetization } from '../netlify/functions/v731-creator.mjs';
const notes = []; let saved = 0;
const h = { json: (o, c = 200) => ({ status: c, o }), body: async r => r, clean: (v, n) => String(v ?? '').trim().slice(0, n), save: async () => { saved++; }, addNotice: (s, t, m) => notes.push([t, m]) };
const s = { day: 1, cash: 20000000, career: { status: 'unemployed' }, skills: {} };
const call = async (p, b = {}, m = 'POST') => route({ p: '/api/v731/creator/' + p, m, s, user: { id: 'u1' }, req: b, h });
const tick = n => { for (let i = 0; i < n; i++) { s.day++; for (const f of DAY_HOOKS) f(s, s.v700 || {}, s.day, 'u1', h); } };
let r;
// akun & validasi
assert.equal((await call('content', { platform: 'youtube', type: 'long', topic: 'gaming', quality: 'medium', title: 'Tes' })).status, 400, 'tanpa akun harus ditolak');
assert.equal((await call('account', { platform: 'twitch', handle: 'abc' })).status, 400, 'platform nonaktif ditolak');
assert.equal((await call('account', { platform: 'youtube', handle: 'TamzYT' })).status, 200);
assert.equal((await call('account', { platform: 'youtube', handle: 'TamzYT' })).status, 400, 'akun ganda ditolak');
assert.equal((await call('account', { platform: 'tiktok', handle: 'tamztt' })).status, 200);
// format harus valid per platform
assert.equal((await call('content', { platform: 'tiktok', type: 'long', topic: 'gaming', quality: 'medium', title: 'Tes' })).status, 400, 'format YouTube tidak boleh di TikTok');
assert.equal((await call('content', { platform: 'youtube', type: 'long', topic: 'gaming', quality: 'medium', title: 'ab' })).status, 400, 'judul pendek ditolak');
assert.equal((await call('content', { platform: 'youtube', type: 'long', topic: 'gaming', quality: 'medium', title: 'Tes', budget: 1 })).status, 400, 'anggaran terlalu kecil ditolak');
// produksi: progres dari state & biaya terpotong
r = await call('content', { platform: 'youtube', type: 'long', topic: 'gaming', quality: 'medium', title: 'Video Pertama', start: true }); assert.equal(r.status, 200);
const it = s.v731.creator.queue[0]; assert.equal(it.status, 'queued'); const cash0 = s.cash; assert.equal(it.progress, 0, 'konten baru harus menunggu hari simulasi berikutnya'); assert.equal(it.spent, 0, 'biaya belum dipotong sebelum hari produksi berjalan');
tick(1); assert.equal(it.status, 'queued', 'hari simulasi pertama setelah start menjadi jeda penuh'); assert.equal(it.progress, 0, 'progress tetap 0 selama hari jeda'); assert.equal(it.spent, 0, 'biaya tidak dipotong selama hari jeda'); assert.equal(s.cash, cash0, 'saldo tidak berubah pada hari jeda');
tick(1); assert.ok(it.progress > 0 && it.progress < 100, 'progress mulai pada hari simulasi setelah jeda dilewati'); assert.ok(s.cash < cash0, 'biaya produksi baru dipotong ketika progress benar-benar berjalan');
assert.equal((await call('content/publish', { id: it.id })).status, 400, 'belum siap tidak boleh publish');
const observedStages = new Set(); for (let i = 0; i < 10; i++) { tick(1); observedStages.add(it.status); } assert.ok(observedStages.has('editing'), 'tahap editing harus muncul dari progres simulasi'); assert.ok(observedStages.has('uploading'), 'tahap upload harus muncul sebelum siap'); assert.equal(it.status, 'ready'); assert.ok(Math.abs(it.spent - it.budget) < 2, 'total biaya = anggaran');
// publish & analytics
r = await call('content/publish', { id: it.id }); assert.equal(r.status, 200);
const yt = s.v731.creator.accounts.youtube; assert.equal(yt.posts, 1); assert.ok(yt.views > 0 && s.v731.creator.published.length === 1);
const v1 = yt.views; tick(6); assert.ok(yt.views > v1, 'views bertambah bertahap setelah publish'); assert.ok(Math.abs(yt.views - s.v731.creator.published[0].res.views) < 1, 'total views = hasil performa');
// monetisasi belum terbuka -> tidak ada pendapatan iklan
assert.equal(monetization(yt).ads.unlocked, false); assert.equal(yt.pending, 0);
// live: gift butuh kelayakan
r = await call('live/start', { platform: 'youtube', topic: 'gaming', quality: 'medium', title: 'Live Tes', planned: 30 }); assert.equal(r.status, 200);
assert.equal((await call('live/start', { platform: 'tiktok', topic: 'gaming', quality: 'medium', title: 'Live 2' })).status, 400, 'hanya satu live aktif');
r = await call('live/tick'); assert.ok(r.o.live.conc >= 1); assert.equal(s.v731.creator.gifts.length, 0, 'gift terkunci sebelum syarat');
r = await call('live/tick'); assert.ok(r.o.report, 'live selesai saat durasi habis'); assert.equal(s.v731.creator.live, null);
assert.equal((await call('live/start', { platform: 'youtube', topic: 'gaming', quality: 'medium', title: 'Live lagi' })).status, 400, 'maks 1 live/hari/platform');
// kelayakan gift + potongan platform + saldo kreator vs kas
yt.fol = 2000; yt.views = 20000; yt.watch = 4500; tick(1);
assert.ok(monetization(yt).gifts.unlocked && monetization(yt).ads.unlocked);
r = await call('live/start', { platform: 'youtube', topic: 'gaming', quality: 'medium', title: 'Live Gift', planned: 180 }); assert.equal(r.status, 200);
const cashL = s.cash, pend0 = yt.pending; let rep; for (let i = 0; i < 20 && !rep; i++) { const q = await call('live/tick'); rep = q.o.report; }
assert.ok(rep, 'live berakhir'); assert.ok(s.v731.creator.gifts.length > 0, 'gift masuk setelah syarat terpenuhi');
for (const g of s.v731.creator.gifts) { assert.equal(g.gross, Math.round(g.coins * g.coinRp)); assert.ok(g.fee > 0 && g.net === g.gross - g.fee, 'net = gross - fee platform'); }
assert.ok(yt.pending > pend0, 'gift masuk saldo kreator'); assert.ok(s.cash < cashL, 'biaya stream memotong kas, gift tidak langsung jadi kas');
// payout: baru masuk kas setelah jadwal
const pend = yt.pending; assert.ok(pend > 0); const cashP = s.cash; tick(16); assert.ok(s.v731.creator.payouts.length >= 1, 'payout otomatis'); assert.ok(s.cash > cashP - 1e7); assert.equal(Math.round(yt.pending) < pend, true);
const po = s.v731.creator.payouts[0]; assert.equal(po.paid, po.gross - po.tax);
// equipment & sponsorship
assert.equal((await call('equipment', { item: 'camera' })).status, 200); assert.equal(s.v731.creator.equip.camera, 2);
// persistensi: state serializable & reload-safe
const clone = JSON.parse(JSON.stringify(s)); ensure731(clone); assert.equal(clone.v731.creator.published.length, 1);
// cancel & duplicate
r = await call('content', { platform: 'tiktok', type: 'video', topic: 'komedi', quality: 'low', title: 'Draft TT', durationSec: 30 }); const dr = s.v731.creator.queue.at(-1); assert.equal(dr.status, 'draft'); assert.equal(dr.durationSec, 30);
const longDuration = await call('content', { platform: 'tiktok', type: 'video', topic: 'komedi', quality: 'low', title: 'Video lebih panjang', durationSec: 120 }); assert.equal(longDuration.status, 200); const longIt = s.v731.creator.queue.at(-1); assert.ok(longIt.total > dr.total, 'durasi video yang lebih panjang harus menambah waktu produksi');
assert.equal((await call('content', { platform: 'tiktok', type: 'video', topic: 'komedi', quality: 'low', title: 'Durasi tidak valid', durationSec: 3000 })).status, 400, 'durasi video di luar batas ditolak');
r = await call('content/duplicate', { id: dr.id }); assert.equal(r.status, 200); r = await call('content/cancel', { id: dr.id }); assert.equal(r.status, 200);
console.log('SEMUA UJI CREATOR STUDIO LULUS', { cash: Math.round(s.cash), ytFol: Math.round(yt.fol), notes: notes.length });
