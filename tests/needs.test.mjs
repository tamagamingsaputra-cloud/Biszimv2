// Regression test engine kebutuhan karakter (headless). Jalankan: node tests/needs.test.mjs
import assert from 'node:assert/strict';
globalThis.window = { addEventListener() {} }; globalThis.document = { addEventListener() {} };
globalThis.location = { hostname: 'localhost', search: '', port: '8000', protocol: 'http:' };
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => ({ ok: true }) });
const ROOT = new URL('../', import.meta.url).pathname;
const E = await import(ROOT + 'public/assets/js/engine/core.js');
const { NE } = E; const R = await import(ROOT + 'public/assets/js/data/needs-rules.js');
let n = 0; const t = (name, fn) => { fn(); n++; console.log('ok', name); };
await E.newGameFor({ ok: true, profile: { seed: 'nd-1', name: 'Uji', family: 'menengah', birthDate: '2019-09-01' }, charId: 'c1', edu: null }, 'nd-1');
const S = E.S; E.stop();
const toHour = h => { while (E.secOfDay() !== h * 3600) E.advanceSeconds(Math.min(1800, ((h * 3600 - E.secOfDay()) + 86400) % 86400 || 86400)); };

t('state awal dari konfigurasi', () => { assert.equal(S.life.needs.hunger, R.NEED_RULES.start.hunger); assert.equal(S.player.energy, 100); });
t('laju berbeda per kebutuhan & per state (bukan seragam)', () => {
  const a = NE.rates('awake'), s = NE.rates('sleep');
  const set = new Set(['hunger', 'thirst', 'hygiene', 'bladder', 'energy'].map(k => a[k])); assert.ok(set.size >= 4, 'decay tiap kebutuhan berbeda');
  assert.ok(s.energy > 0 && a.energy < 0, 'tidur memulihkan energi'); assert.ok(Math.abs(s.hunger) < Math.abs(a.hunger), 'lapar lebih lambat saat tidur');
  assert.ok(NE.rates('work').stress > NE.rates('awake').stress && NE.rates('sleep').stress < 0);
});
t('tidur 22–06 memulihkan energi, siang hari menurunkan', () => {
  toHour(22); S.player.energy = 40; S.life.needs.hunger = 90; S.life.needs.thirst = 90; S.life.needs.bladder = 100; S.life.needs.stress = 30;
  toHour(6); assert.ok(S.player.energy > 90, 'energi pulih ' + S.player.energy);
  const e0 = S.player.energy; S.life.needs.hunger = 90; S.life.needs.thirst = 90; E.advanceSeconds(3 * 3600 + 1); assert.ok(S.player.energy < e0);
});
t('ambang: low/critical & efek kesehatan saat lapar kritis', () => {
  S.life.needs.hunger = 10; assert.equal(NE.level('hunger'), 'critical'); S.life.needs.health = 80; S.life.needs.thirst = 90;
  const h0 = S.life.needs.health; E.advanceSeconds(1800); assert.ok(S.life.needs.health < h0, 'kesehatan turun');
  S.life.needs.hunger = 30; assert.equal(NE.level('hunger'), 'low'); S.life.needs.hunger = 80; assert.equal(NE.level('hunger'), 'ok');
  S.life.needs.stress = 75; assert.equal(NE.level('stress'), 'low'); S.life.needs.stress = 95; assert.equal(NE.level('stress'), 'critical'); S.life.needs.stress = 20;
});
t('faktor performa turun saat energi/kesehatan rendah', () => {
  S.player.energy = 90; Object.assign(S.life.needs, { hunger: 80, thirst: 80, health: 90, stress: 20, mood: 60, hygiene: 80 }); assert.equal(NE.perfFactor(), 1);
  S.player.energy = 10; S.life.needs.health = 25; assert.ok(Math.abs(NE.perfFactor() - (1 - 0.2 - 0.15)) < 1e-9);
  S.player.energy = 90; S.life.needs.health = 90;
});
t('aksi memakan waktu game; efek diterapkan saat selesai; aksi lain diblokir dengan alasan', () => {
  toHour(15); S.life.needs.thirst = 40;
  const r = NE.homeAction('minum'); assert.ok(r.ok, r.error); assert.equal(S.life.needs.thirst, 40, 'belum diterapkan');
  const b = NE.homeAction('istirahat'); assert.equal(b.ok, false); assert.match(b.error, /sedang minum air/i);
  E.advanceSeconds(5 * 60 + 1); NE.checkActivity(); assert.ok(S.life.needs.thirst > 60); assert.equal(S.life.activity, null);
});
t('mandi butuh sabun; tanpa sabun pilih mandi biasa', () => {
  const r = NE.homeAction('mandi'); assert.equal(r.ok, false); assert.match(r.error, /Sabun/);
  NE.addInventory({ id: 'sabun', name: 'Sabun', kind: 'toiletries', uses: 10 }); assert.equal(NE.invCount('toiletries'), 10);
  S.life.needs.hygiene = 20; assert.ok(NE.homeAction('mandi').ok); assert.equal(NE.invCount('toiletries'), 9);
  NE.finishNow(); assert.ok(S.life.needs.hygiene >= 85);
});
t('aksi ditolak saat jam tidur & aktivitas menabrak jam tidur', () => {
  toHour(23); assert.match(NE.homeAction('minum').error, /tidur/);
  toHour(21); const r = NE.homeAction('tidur-siang'); assert.equal(r.ok, false); assert.match(r.error, /jam tidur/);
});
t('kandung kemih: 0 = kecelakaan, tercatat di log', () => {
  toHour(15); S.life.needs.bladder = 1; S.life.needs.hygiene = 80; E.advanceSeconds(1800);
  assert.equal(S.life.needs.bladder, 100); assert.ok(S.life.needs.hygiene <= 41); assert.ok(S.activity.some(a => /tidak sempat ke toilet/.test(a.text)));
});
t('makan keluarga otomatis untuk usia < 18 pada 06:30', () => {
  toHour(6); S.life.needs.hunger = 40; E.advanceSeconds(3600 + 1); assert.ok(S.life.needs.hunger > 70, 'sarapan ' + S.life.needs.hunger);
});
const P = await import(ROOT + 'public/assets/js/engine/creator/production.js');
t('aktivitas memblokir produksi konten (busyAt = aktivitas)', () => {
  toHour(15); const ctx = { schedule: E.scheduleOf, activityAt: g => NE.stateAt(g) === 'act' };
  assert.equal(P.busyAt(ctx, { live: null }, S.clock.g), null);
  NE.homeAction('istirahat'); assert.equal(P.busyAt(ctx, { live: null }, S.clock.g), 'aktivitas'); NE.finishNow();
});
t('save memuat state kehidupan', () => { const snap = JSON.parse(JSON.stringify(S)); assert.ok(snap.life.needs && snap.life.inventory); assert.equal(typeof snap.finSeq, 'number'); });
t('penyesuaian tunai server: idempoten per seq & transfer internal tidak dihitung pengeluaran', () => {
  const b0 = S.player.balance; S.today.expense = {};
  E.applyCashAdj([{ seq: 1, delta: -50000, cat: 'tabungan_bank' }, { seq: 2, delta: -15000, cat: 'makan' }]);
  E.applyCashAdj([{ seq: 2, delta: -15000, cat: 'makan' }]);
  assert.equal(S.player.balance, b0 - 65000); assert.equal(S.finSeq, 2); assert.deepEqual(S.today.expense, { makan: 15000 });
});
console.log(`\n${n} uji kebutuhan lulus`); process.exit(0);
