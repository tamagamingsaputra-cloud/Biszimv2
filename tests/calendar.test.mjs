// Regression test kalender & simulation clock (headless, tanpa browser). Jalankan: node tests/calendar.test.mjs
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
globalThis.window = {}; globalThis.location = { hostname: 'localhost', search: '', port: '8000', protocol: 'http:' };
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
const ROOT = new URL('../', import.meta.url).pathname;
const CAL = await import(ROOT + 'public/assets/js/engine/calendar.js');
const SRV = createRequire(import.meta.url)(ROOT + 'server/calendar.cjs');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };

t('aturan server = aturan client', () => { assert.deepEqual({ ...SRV.CALENDAR }, { ...CAL.CALENDAR }); assert.equal(SRV.DAYS_PER_YEAR, CAL.DAYS_PER_YEAR); assert.deepEqual(SRV.WEEKDAYS, CAL.WEEKDAYS); for (const d of [-14, 0, 29, 30, 359, 360, 1234]) assert.deepEqual({ ...SRV.dateParts(d) }, (({ day, year, month, date, weekday }) => ({ day, year, month, date, weekday }))(CAL.dateParts(d))); });
t('hari pertama', () => { assert.deepEqual(CAL.dateParts(0), { day: 0, year: 1, month: 1, date: 1, dayOfYear: 1, weekday: 1 }); assert.equal(CAL.fmtDay(0, 'full'), 'Senin · Tahun 1 · Bulan 1 · Tanggal 1'); });
t('pergantian bulan', () => { assert.equal(CAL.fmtDay(29, 'long'), 'Tahun 1 · Bulan 1 · Tanggal 30'); assert.equal(CAL.fmtDay(30, 'long'), 'Tahun 1 · Bulan 2 · Tanggal 1'); assert.ok(CAL.isMonthEnd(29) && !CAL.isMonthEnd(30)); });
t('pergantian tahun & tanpa kabisat', () => { assert.equal(CAL.fmtDay(359, 'long'), 'Tahun 1 · Bulan 12 · Tanggal 30'); assert.equal(CAL.fmtDay(360, 'long'), 'Tahun 2 · Bulan 1 · Tanggal 1'); assert.ok(CAL.isYearEnd(359)); for (let y = 1; y <= 8; y++) assert.equal(CAL.dayFrom(y + 1, 1, 1) - CAL.dayFrom(y, 1, 1), 360); assert.equal(CAL.dayFrom(1, 2, 31), null); assert.equal(CAL.dayFrom(1, 13, 1), null); });
t('round-trip dayFrom/dateParts', () => { for (let d = -400; d < 2000; d += 7) { const p = CAL.dateParts(d); assert.equal(CAL.dayFrom(p.year, p.month, p.date), d); } });
t('minggu 7 hari tetap berurutan lintas bulan/tahun', () => { for (let d = -20; d < 800; d++) assert.equal(CAL.weekdayOf(d + 1), (CAL.weekdayOf(d) + 1) % 7); });
t('pra-simulasi = Tahun 0', () => { assert.equal(CAL.fmtDay(-1, 'long'), 'Tahun 0 · Bulan 12 · Tanggal 30'); assert.equal(CAL.weekdayOf(-1), 0); });
t('format jam', () => { assert.equal(CAL.fmtHMS(12 * 3600 + 13 * 60 + 1), '12:13:01'); assert.equal(CAL.fmtStamp(41, 12 * 3600 + 13 * 60 + 1), 'Tahun 1 · Bulan 2 · Tanggal 12 · 12:13:01'); });
t('server menolak jam tidak valid', () => { assert.equal(SRV.readClock({ clock: { g: -1, sec: 0 } }), null); assert.equal(SRV.readClock({ clock: { g: 5, sec: 1800 } }), null); assert.equal(SRV.readClock({ clock: { g: 672, sub: 3 } }).abs, 672 * 1800 + 180); });

// ——— simulation clock (engine) ———
const E = await import(ROOT + 'public/assets/js/engine/core.js');
globalThis.__CR = await import(ROOT + 'public/assets/js/engine/creator/studio.js');
await E.newGameFor({ ok: true, profile: { seed: 'cal-1', name: 'Uji', family: 'menengah', birthDate: '2010-06-01' }, charId: 'c1', edu: null }, 'cal-1');
const S = E.S;
t('awal game 00:00:00 Tahun 1', () => { const k = E.clockNow(); assert.equal(k.day, 0); assert.equal(k.secOfDay, 0); assert.equal(k.year, 1); });
t('detik maju sesuai advanceSeconds, tick tiap 1800 dtk', () => {
  const g0 = S.clock.g; E.advanceSeconds(61.5); assert.equal(E.timeLabelFull(), '00:01:01'); assert.equal(S.clock.g, g0);
  E.advanceSeconds(1800 - 61.5); assert.equal(S.clock.g, g0 + 1); assert.equal(E.timeLabelFull(), '00:30:00');
  E.advanceSeconds(12 * 3600 + 13 * 60 + 1 - 1800); assert.equal(E.timeLabelFull(), '12:13:01'); assert.equal(S.clock.g, g0 + 24);
});
t('pergantian hari lewat clock memproses end-of-day', () => { const d0 = E.dayNow(); E.advanceSeconds(86400 - E.secOfDay()); assert.equal(E.dayNow(), d0 + 1); assert.equal(E.timeLabelFull(), '00:00:00'); });
t('pergantian bulan & tahun lewat engine', () => {
  while (E.dayNow() < 29) E.skipToNextDay(1); assert.equal(E.clockNow().date, 30);
  E.skipToNextDay(1); const k = E.clockNow(); assert.equal(k.month, 2); assert.equal(k.date, 1);
  while (E.dayNow() < 360) E.skipToNextDay(1); const y = E.clockNow(); assert.equal(y.year, 2); assert.equal(y.month, 1); assert.equal(y.date, 1);
});
t('kecepatan hanya dari konfigurasi', () => { assert.equal(E.setRate(999).ok, false); assert.equal(E.setRate(60).ok, true); assert.equal(S.settings.rate, 60); assert.equal(E.effectiveRate(), 60); E.setRate(11520); assert.equal(E.effectiveRate(), 11520); E.setSpeed(1); assert.equal(S.settings.rate, 720); });
t('pause menghentikan loop', () => { E.setPaused(true); assert.equal(E.clockNow().paused, true); E.setPaused(false); E.stop(); });
t('save/reload mempertahankan detik', () => { E.advanceSeconds(7 * 3600 + 5); const snap = JSON.parse(JSON.stringify(S)); assert.equal(snap.clock.sec, S.clock.sec); const c = SRV.readClock(snap); assert.ok(c.label.endsWith('07:00:05'), c.label); });
t('migrasi save lama (sub menit, speed)', () => { const k = SRV.readClock({ clock: { g: 700, sub: 12 } }); assert.ok(k.label.endsWith(':12:00')); });

// ——— agenda: prediksi harus cocok dengan yang benar-benar diproses engine ———
const AG = await import(ROOT + 'public/assets/js/engine/agenda.js');
const sync = () => { E.S.player.energy = 100; };
t('gaji penuh waktu: tanggal & nominal agenda = realisasi', () => {
  // pasang pekerjaan langsung (jalur lamaran diuji di regression UI)
  const d = E.dayNow(); S.career.job = { jobId: 'ft-admin', startDay: d, daysWorked: 0, perf: 65, unpaid: 0, periodDays: 0, lastPay: null };
  const ev = AG.eventsBetween(d, d + 40).find(x => x.cat === 'gaji'); assert.ok(ev, 'ada event gaji');
  assert.equal(CAL.dateOfMonth(ev.day), 25); assert.equal(ev.sec, 86400); assert.equal(ev.certainty, 'estimasi');
  const before = S.player.balance; let paid = null;
  const nAct = S.activity.length; let payDay = null;
  while (E.dayNow() <= ev.day) { sync(); const d0 = E.dayNow(); E.skipToNextDay(1); const pay = S.activity.find(a => /Gaji bulanan/.test(a.text)); if (pay && paid == null) { paid = pay.amount; payDay = d0; } }
  assert.equal(payDay, ev.day, 'gaji diproses di akhir hari yang sama dengan agenda');
  assert.equal(paid, ev.amount, `prediksi ${ev.amount} vs realisasi ${paid}`);
});
t('cicilan akhir bulan: tanggal 30 & nominal', () => {
  const d = E.dayNow(); S.debts.push({ id: S.debtSeq++, kind: 'uji', name: 'Pinjaman uji', principal: 600000, remaining: 600000, rateYear: 0.12, monthlyPay: 100000, startDay: d });
  S.player.balance += 1_000_000;
  const ev = AG.eventsBetween(d, d + 31).find(x => x.title === 'Cicilan Pinjaman uji'); assert.ok(ev); assert.equal(CAL.dateOfMonth(ev.day), 30);
  const bal0 = S.debts.at(-1).remaining; while (E.dayNow() <= ev.day) E.skipToNextDay(1);
  assert.ok(S.debts.at(-1).remaining < bal0, 'cicilan diproses'); assert.equal(ev.amount, -100000);
});
t('deposito: jatuh tempo agenda = hari pencairan', () => {
  S.player.balance += 2_000_000; const r = E.invest('deposito', 'DEP-30', 1_000_000); assert.ok(r.ok, r.error);
  const h = S.invest.holdings.find(x => x.cat === 'deposito'); const ev = AG.eventsBetween(E.dayNow(), E.dayNow() + 31).find(x => x.title.startsWith('Jatuh tempo')); assert.equal(ev.day, h.maturityDay);
  let hit = null; while (E.dayNow() <= ev.day) { const d0 = E.dayNow(); E.skipToNextDay(1); const a = S.activity.find(x => /Jatuh tempo: Deposito/.test(x.text)); if (a && !hit) hit = { d0, a }; }
  assert.ok(hit, 'deposito dicairkan'); assert.equal(hit.d0, ev.day); assert.equal(Math.round(hit.a.amount), ev.amount, `prediksi ${ev.amount} vs ${hit.a.amount}`);
});
t('jadwal harian: tidur 22–06 dan kerja 08–17 di hari kerja', () => {
  let d = E.dayNow(); while (!CAL.isWeekday(d)) d++;
  const p = AG.dayPlan(d); assert.ok(p.some(b => b.kind === 'tidur' && b.from === 0 && b.to === 6)); assert.ok(p.some(b => b.kind === 'kerja' && b.from === 8 && b.to === 17));
  const tot = p.reduce((s, b) => s + (b.to - b.from), 0); assert.equal(tot, 24, 'blok menutup 24 jam tanpa tumpang tindih');
});
t('riwayat hari ini terbaca dari log', () => { E.log('uji', 'catatan uji kalender'); const h = AG.historyOf(E.dayNow()); assert.ok(h.activity.some(a => a.text === 'catatan uji kalender' && a.sec != null)); });

t('live: satu langkah live per menit game, diperlambat 12×', () => {
  const CR = globalThis.__CR; S.settings.qaCreatorAge = true; S.player.balance += 2_000_000; S.player.energy = 100;
  CR.createAccount('tiktok', 'uji_jam', 'gaming'); S.creator.accounts.tiktok.followers = 4000;
  while (E.secOfDay() < 19 * 3600) E.advanceSeconds(1800);
  S.player.energy = 100; // energi kini diturunkan engine kebutuhan sepanjang hari; uji ini fokus ke timing live
  const r = CR.startLive({ platform: 'tiktok', niche: 'gaming', title: 'Uji jam live', quality: '720p', durMin: 30 }); assert.ok(r.ok, r.error);
  E.setRate(720); assert.equal(E.effectiveRate(), 60);
  const steps0 = S.creator.live.min ?? S.creator.live.minutes ?? null;
  const t0 = E.nowSec(); E.advanceSeconds(10 * 60); assert.equal(Math.round(E.nowSec() - t0), 600);
  const lv = S.creator.live; assert.ok(lv, 'live masih berjalan');
  E.advanceSeconds(40 * 60); assert.equal(S.creator.live, null, 'live berakhir setelah durasinya');
  assert.equal(E.effectiveRate(), 720, 'kecepatan normal kembali setelah live');
});
console.log(`\n${n} uji lulus`);
process.exit(0);
