// Uji jam simulasi, kalender, kebutuhan karakter, dan aksi hidup (BizSim 7.4.0): node tests/v740-clock-test.mjs
import assert from 'node:assert/strict';
import handler from '../web/engine/api.js';
import * as E from '../web/engine/v740.js';
let cookie = '';
const call = async (path, method = 'GET', body) => { const r = await handler(new Request('http://x' + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })); const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; let j = null; try { j = await r.json(); } catch { } return { status: r.status, j }; };
const ok = (m) => console.log('PASS', m);
const sync = async sec => { let r; while (sec > 0) { const c = Math.min(3600, sec); r = await call('/api/v740/clock', 'POST', { action: 'sync', dt: c }); sec -= c; } return r; };

/* ---- 1. aturan kalender (tanpa API) ---- */
const d = E.dateOf;
assert.deepEqual([d(1).year, d(1).month, d(1).date], [1, 1, 1]);
assert.deepEqual([d(30).month, d(30).date], [1, 30]);
assert.deepEqual([d(31).month, d(31).date], [2, 1]);
assert.deepEqual([d(360).year, d(360).month, d(360).date], [1, 12, 30]);
assert.deepEqual([d(361).year, d(361).month, d(361).date], [2, 1, 1]);
assert.deepEqual([d(720).year, d(720).month, d(720).date], [2, 12, 30]); assert.equal(d(721).year, 3);
assert.equal(E.CAL.leap, false);
assert.equal(d(1).weekday, 1); assert.equal(d(7).weekday, 0); assert.equal(d(8).weekday, 1);
assert.equal(E.dayOfDate(2, 1, 1), 361); assert.equal(E.dayOfDate(1, 2, 12), 42);
assert.equal(E.fullText(42, 12 * 3600 + 13 * 60 + 1), 'Tahun 1 · Bulan 2 · Tanggal 12 · 12:13:01');
ok('kalender: 12 bulan x 30 hari, tanpa kabisat, pergantian bulan/tahun, format lengkap');

/* ---- 2. engine lewat API ---- */
const email = `v740${Date.now()}@bizsim.local`;
let r = await call('/api/auth/register', 'POST', { name: 'Uji', email, password: 'secret123' }); assert.equal(r.status, 201);
r = await call('/api/v740/state'); assert.equal(r.status, 200); let v = r.j.v740;
assert.equal(v.day, 1); assert.equal(v.clock.tod, 7 * 3600); assert.equal(v.clock.text, 'Tahun 1 · Bulan 1 · Tanggal 1 · 07:00:00');
for (const k of E.KEYS) assert.ok(v.needs[k].v >= 0 && v.needs[k].v <= 100);
ok('state awal: Hari 1, 07:00:00, 8 kebutuhan dalam rentang 0-100');

r = await call('/api/v740/clock', 'POST', { action: 'sync', dt: 3600 }); v = r.j.v740; assert.equal(v.clock.tod, 8 * 3600);
const h8 = { ...v.needs }; r = await sync(4 * 3600); v = r.j.v740; assert.equal(v.clock.tod, 12 * 3600);
const drop = k => Math.round((h8[k].v - v.needs[k].v) * 10) / 10;
assert.ok(drop('hunger') > 0 && drop('thirst') > 0 && drop('energy') > 0 && drop('hygiene') > 0 && drop('bladder') > 0);
assert.ok(drop('thirst') > drop('hunger') && drop('hunger') > drop('energy') && drop('energy') > drop('hygiene'), 'laju turun tidak sama');
ok(`decay berbeda per kebutuhan (4 jam): thirst -${drop('thirst')}, hunger -${drop('hunger')}, energy -${drop('energy')}, hygiene -${drop('hygiene')}`);

/* pause: dt diabaikan */
r = await call('/api/v740/clock', 'POST', { action: 'pause', paused: true }); assert.equal(r.j.v740.clock.paused, true);
r = await call('/api/v740/clock', 'POST', { action: 'sync', dt: 600 }); assert.equal(r.j.v740.clock.tod, 12 * 3600, 'pause menahan waktu');
r = await call('/api/v740/clock', 'POST', { action: 'speed', speed: 3 }); assert.equal(r.status, 400);
r = await call('/api/v740/clock', 'POST', { action: 'speed', speed: 4 }); assert.equal(r.j.v740.clock.speed, 4); assert.equal(r.j.v740.clock.paused, false); assert.equal(r.j.v740.clock.simSecPerRealSec, 240);
r = await call('/api/v740/clock', 'POST', { action: 'sync', dt: 99999 }); assert.equal(r.j.v740.clock.tod, 12 * 3600 + 3600, 'dt dibatasi 3600 per sinkronisasi');
ok('pause menahan waktu, kecepatan hanya 1/2/4x, dt per sinkronisasi dibatasi');
await call('/api/v740/clock', 'POST', { action: 'speed', speed: 1 });

/* ---- 3. aksi: uang, jam buka, alasan ---- */
v = (await call('/api/v740/state')).j.v740; assert.equal(v.options.eat.find(o => o.id === 'warteg').ok, false);
assert.match(v.options.eat.find(o => o.id === 'warteg').reason, /Uang tidak cukup/);
assert.equal(v.options.eat.find(o => o.id === 'homestock').ok, true);
r = await call('/api/v740/act', 'POST', { kind: 'eat', id: 'warteg' }); assert.equal(r.status, 400); assert.match(r.j.error, /Uang tidak cukup/);
const hb = v.needs.hunger.v; r = await call('/api/v740/act', 'POST', { kind: 'eat', id: 'homestock' }); assert.equal(r.status, 200); assert.equal(r.j.v740.act.label, 'Makan seadanya (stok rumah)');
r = await call('/api/v740/act', 'POST', { kind: 'drink', id: 'tap' }); assert.equal(r.status, 400); assert.match(r.j.error, /Sedang/);
r = await call('/api/v740/clock', 'POST', { action: 'sync', dt: 15 * 60 }); v = r.j.v740; assert.equal(v.act, null); assert.ok(v.needs.hunger.v > hb + 15, 'makan butuh waktu, hasilnya bertahap');
ok('makan: uang dan waktu dibutuhkan, alasan jelas, efek diberikan selama durasi');
await call('/api/v740/act', 'POST', { kind: 'eat', id: 'homestock' }); await call('/api/v740/clock', 'POST', { action: 'sync', dt: 900 });
await sync(3 * 3600);
r = await call('/api/v740/act', 'POST', { kind: 'eat', id: 'homestock' }); assert.equal(r.status, 400); assert.match(r.j.error, /Stok rumah habis|Masih kenyang/);
ok('stok rumah gratis dibatasi 2x per hari');

/* ---- 4. tidur memulihkan energi, bisa dibatalkan ---- */
v = (await call('/api/v740/state')).j.v740; const e0 = v.needs.energy.v;
r = await call('/api/v740/act', 'POST', { kind: 'sleep', id: 'sleep8' }); assert.equal(r.status, 200); assert.equal(r.j.v740.status.code, 'sleep'); assert.ok(r.j.v740.needs.energy.rate > 10);
r = await call('/api/v740/act', 'POST', { kind: 'eat', id: 'homestock' }); assert.match(r.j.error, /tidur/i);
r = await call('/api/v740/clock', 'POST', { action: 'sync', dt: 3600 }); assert.ok(r.j.v740.needs.energy.v > e0 + 8);
r = await call('/api/v740/act', 'POST', { kind: 'cancel' }); assert.equal(r.status, 200); assert.equal(r.j.v740.act, null);
ok('tidur: energi pulih ~12,5/jam, aksi lain ditolak saat tidur, bisa bangun');

/* ---- 5. ganti hari lewat simulate/day: sisa hari tetap dijalankan, jam kembali 00:00 ---- */
v = (await call('/api/v740/state')).j.v740; const before = { ...v.needs }, tod0 = v.clock.tod;
await call('/api/simulate/day', 'POST'); const me = (await call('/api/me')).j; v = me.state.v740;
assert.equal(me.state.day, 2); assert.equal(v.day, 2); assert.equal(v.clock.tod, 0);
assert.ok(['hunger', 'thirst', 'energy', 'hygiene', 'bladder'].some(k => Math.abs(v.needs[k] - before[k].v) > 1), 'sisa hari dihitung (kebutuhan berubah)');
r = await call('/api/v740/state'); assert.equal(r.j.v740.date.date, 2); assert.equal(r.j.v740.weekdayName, 'Selasa');
ok(`Simulate Day dari jam ${E.clockText(tod0, false)} -> Hari 2 00:00:00, kebutuhan ikut berjalan sampai tengah malam`);

/* ---- 6. reload / login ulang: jam dan kebutuhan bertahan ---- */
await call('/api/v740/clock', 'POST', { action: 'sync', dt: 5400 }); const snap = (await call('/api/v740/state')).j.v740;
await call('/api/auth/logout', 'POST'); cookie = ''; r = await call('/api/auth/login', 'POST', { email, password: 'secret123' }); assert.equal(r.status, 200);
const again = (await call('/api/v740/state')).j.v740; assert.equal(again.clock.tod, snap.clock.tod); assert.equal(again.day, snap.day); assert.deepEqual(again.needs.hunger, snap.needs.hunger);
ok('reload: hari, jam, dan kebutuhan bertahan setelah login ulang');

/* ---- 7. tengah malam & hook hari (unit, tanpa API) ---- */
const mk = (career, cash = 1000000, day = 2) => { const s = { day, cash, career, notifications: [] }; const h = { addNotice: (st, t, m) => st.notifications.push({ t, m }) }; return { s, h, x: E.ensure740(s, day) }; };
{ const { s, h, x } = mk({ status: 'employed', salary: 6000000 }); x.clock.tod = 8 * 3600; E.step(s, x, 9 * 3600, h); E.rollDay(s, x, 3, h);
  assert.equal(x.day, 3); assert.equal(x.clock.tod, 0); assert.equal(s.cash, 1000000, 'kebutuhan terawat -> tanpa potongan'); ok('hari kerja dengan kebutuhan terpenuhi: tidak ada potongan gaji'); }
{ const { s, h, x } = mk({ status: 'employed', salary: 6000000 }); x.clock.tod = 8 * 3600; Object.assign(x.needs, { energy: 8, mood: 15, stress: 90, health: 30, hunger: 10 }); E.step(s, x, 9 * 3600, h); E.rollDay(s, x, 3, h);
  assert.ok(s.cash < 1000000, 'kinerja rendah -> potongan'); assert.ok(x.log.some(l => /Potongan gaji/.test(l.title))); ok(`kebutuhan buruk: potongan gaji Rp${(1000000 - s.cash).toLocaleString('id-ID')} tercatat`); }
{ const { s, h, x } = mk({ status: 'employed', salary: 6000000 }); x.clock.tod = 8 * 3600; x.act = { kind: 'sleep', label: 'Tidur', total: 9 * 3600, rem: 9 * 3600, gain: {} }; E.step(s, x, 9 * 3600, h); E.rollDay(s, x, 3, h);
  assert.ok(x.log.some(l => /absen/.test(l.sub || '')), 'tidur saat jam kerja = absen'); ok('tidur saat jam kerja dihitung absen dan dipotong'); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 0, 2); x.clock.tod = 8 * 3600; E.step(s, x, 9 * 3600, h); assert.equal(E.view(s, x).status.code, 'free'); ok('pengangguran: tidak ada jadwal kerja'); }
{ const { s, h, x } = mk({ status: 'employed', salary: 6000000 }, 1000000, 6); x.clock.tod = 10 * 3600; const c = E.view(s, x); assert.equal(c.status.code, 'free', 'Sabtu libur'); }
{ const { s, h, x } = mk({ status: 'employed', salary: 6000000 }, 1000000, 2); x.clock.tod = 10 * 3600; const c = E.view(s, x); assert.equal(c.status.code, 'work'); assert.match(c.options.eat.find(o => o.id === 'cook').reason, /jam kerja/); assert.match(c.options.sleep.find(o => o.id === 'sleep8').reason, /jam kerja/); ok('jam kerja memblokir makan besar dan tidur dengan alasan'); x.clock.tod = 12.5 * 3600; assert.equal(E.view(s, x).status.code, 'lunch'); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 0, 1); for (let i = 0; i < 4; i++) { E.step(s, x, 4 * 3600, h); } assert.ok(x.needs.thirst === 0 || x.needs.thirst < 5); assert.ok(x.needs.health < 96, 'dibiarkan: kesehatan turun'); ok(`dibiarkan 16 jam: thirst ${Math.round(x.needs.thirst)}, hunger ${Math.round(x.needs.hunger)}, health ${Math.round(x.needs.health)}`); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 0, 1); x.needs.energy = 3; E.step(s, x, 3600, h); assert.ok(x.log.some(l => /Pingsan/.test(l.title)), 'energi habis -> pingsan'); ok('energi habis: pingsan tertidur'); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 1000000, 1); x.clock.tod = 21.5 * 3600; assert.equal(E.view(s, x).options.eat.find(o => o.id === 'warteg').ok, false); assert.match(E.view(s, x).options.eat.find(o => o.id === 'warteg').reason, /tutup/); x.clock.tod = 12 * 3600; x.needs.hunger = 40; assert.equal(E.view(s, x).options.eat.find(o => o.id === 'warteg').ok, true); ok('jam buka toko: warteg tutup 21:30, buka siang'); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 200000, 1); x.clock.tod = 13 * 3600; x.needs.hunger = 30; const o0 = E.view(s, x).options.delivery[0]; assert.ok(o0.ok); const cash0 = s.cash;
  const res = await E.route({ p: '/api/v740/act', m: 'POST', s, user: {}, req: {}, h: { json: (d, c = 200) => ({ d, c }), body: async () => ({ kind: 'delivery', id: 'geprek' }), clean: (v, n) => String(v ?? '').slice(0, n), save: async () => { }, addNotice: h.addNotice } });
  assert.equal(res.c, 200); assert.ok(s.cash < cash0 && x.orders.length === 1); E.step(s, x, 3600, h); assert.equal(x.orders.length, 0); assert.ok(x.needs.hunger > 60); ok(`delivery: bayar ${(cash0 - s.cash).toLocaleString('id-ID')}, tiba ±${o0.etaMin} menit, hunger naik`); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 200000, 1); x.clock.tod = 8 * 3600; for (let d = 2; d <= 12; d++) E.rollDay(s, x, d, h);
  assert.ok(x.needs.health > 80, 'autopilot menjaga kesehatan'); assert.ok(x.needs.thirst > 0 || x.needs.hunger > 0); assert.ok(s.cash <= 200000 && s.cash >= 0); assert.ok(x.log.some(l => /Rutinitas otomatis/.test(l.title)) || s.cash === 200000);
  ok(`hari dilewati 11x: kesehatan ${Math.round(x.needs.health)}, kas Rp${Math.round(s.cash).toLocaleString('id-ID')} (biaya hidup otomatis tercatat)`); }
{ const { s, h, x } = mk({ status: 'unemployed' }, 200000, 1); x.clock.tod = 86400 - 600; Object.assign(x.needs, { hunger: 5, thirst: 5 }); E.rollDay(s, x, 2, h); assert.equal(x.needs.hunger <= 5, true); assert.equal(s.cash, 200000); ok('pergantian hari alami (pemain aktif): tanpa autopilot'); }
console.log('V740 LULUS');
