// BIZSIM LIFE NEEDS ENGINE — kebutuhan karakter (lapar, haus, energi, kebersihan, kesehatan, mood, stres, kandung kemih),
// aktivitas pribadi yang memakan waktu game, inventori rumah, dan moda perjalanan harian.
// Semua perubahan nilai terjadi di sini (per tick 30 menit + saat aktivitas selesai). UI hanya membaca.
import { NEEDS, NEED_RULES as R, HOME_ACTIONS } from '../data/needs-rules.js';
import { TIME_RULES as TR } from '../data/time-rules.js';
import * as CAL from './calendar.js';

let X = null; // konteks dari core: { S, g, day, sec, schedule, liveOn, log, emit, save, ageYears, finQueue, advance }
export function attach(fn) { X = fn; }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const T = 48, SPT = 1800;
export { NEEDS, HOME_ACTIONS };
export const needDef = k => NEEDS.find(n => n.key === k);

export function initLife(S) {
  if (S.life) return S.life;
  const { energy, ...rest } = R.start;
  S.life = { needs: { ...rest }, activity: null, inventory: {}, owned: {}, commute: 'jalan', autoMeals: true, flags: {}, perfAcc: { sum: 0, n: 0 }, commuteDay: null, history: [], lastMealDay: null };
  if (S.player.energy == null) S.player.energy = energy;
  return S.life;
}
const L = () => X().S.life;
export function value(k) { const x = X(); return k === 'energy' ? x.S.player.energy ?? 100 : x.S.life.needs[k]; }
function setVal(k, v) { const x = X(); if (k === 'energy') x.S.player.energy = clamp(v, 0, 100); else x.S.life.needs[k] = clamp(v, 0, 100); }
function add(k, dv) { setVal(k, value(k) + dv); }
export function level(k, v = value(k)) { const n = needDef(k); if (n.invert) return v >= n.critical ? 'critical' : v >= n.low ? 'low' : 'ok'; return v <= n.critical ? 'critical' : v <= n.low ? 'low' : 'ok'; }
export const LEVEL_LABEL = { ok: 'Baik', low: 'Rendah', critical: 'Kritis' };
export const LEVEL_LABEL_STRESS = { ok: 'Terkendali', low: 'Tinggi', critical: 'Sangat tinggi' };

// ——— status karakter pada tick g ———
export function stateAt(g) {
  const x = X(), d = Math.floor(g / T) - 14, h = (g % T) / 2, sch = x.schedule(d), a = L().activity;
  const t0 = (g - 14 * T) * SPT, t1 = t0 + SPT;
  if (a && a.startAbs < t1 && a.endAbs > t0) return a.rateState || 'act';
  if (h < TR.sleep.to || h >= TR.sleep.from) return 'sleep';
  if (sch.school && h >= sch.school[0] && h < sch.school[1]) return 'school';
  if (sch.work && h >= sch.work[0] && h < sch.work[1]) return 'work';
  if (x.liveOn()) return 'live';
  return 'awake';
}
export const STATE_LABEL = { sleep: 'Tidur', school: 'Di sekolah', work: 'Bekerja', live: 'Siaran langsung', act: 'Beraktivitas', awake: 'Waktu luang' };

/** Rate efektif per jam untuk tiap kebutuhan pada state tertentu (termasuk interaksi antar-kebutuhan). Dipakai tick & UI. */
export function rates(state) {
  const out = {}, owned = L().owned;
  for (const n of NEEDS) out[n.key] = n.rate[state] ?? n.rate.awake;
  if (owned.botol) out.thirst *= 0.85;
  if (state === 'sleep') { if (owned.kasur) out.energy *= 1.15; if (owned.kipas) { out.energy *= 1.05; out.stress -= 0.3; } }
  // interaksi
  let lows = 0, crits = 0;
  for (const k of ['hunger', 'thirst', 'energy', 'hygiene', 'bladder']) { const lv = level(k); if (lv === 'low') lows++; if (lv === 'critical') crits++; }
  out.mood += lows * R.lowPenalty.mood + crits * R.criticalPenalty.mood;
  out.stress += lows * R.lowPenalty.stress + crits * R.criticalPenalty.stress;
  const st = value('stress');
  if (st >= needDef('stress').low) out.mood += R.stressMoodHigh;
  if (st >= needDef('stress').critical && out.energy < 0) out.energy *= R.stressEnergyMult;
  if (level('thirst') === 'critical') out.energy += R.thirstEnergyCritical;
  // kesehatan: pulih hanya bila tidak ada kebutuhan kritis
  let dmg = 0;
  if (level('hunger') === 'critical') dmg += R.healthDamage.hunger;
  if (level('thirst') === 'critical') dmg += R.healthDamage.thirst;
  if (level('hygiene') === 'critical') dmg += R.healthDamage.hygiene;
  if (level('energy') === 'critical') dmg += R.healthDamage.energy;
  if (st >= needDef('stress').critical) dmg += R.healthDamage.stressHigh;
  out.health = dmg < 0 ? dmg : out.health;
  // mood bergerak ke target
  const m = needDef('mood'); out.mood += (m.target - value('mood')) * m.drift;
  if (state === 'live') out.energy = 0; // biaya energi live dihitung Creator Studio per menit
  return out;
}

/** Dipanggil core.tick() untuk tick g (30 menit yang baru selesai), sebelum Creator Studio. */
export function needsTick(g) {
  const x = X(), life = L(); if (!life) return;
  const state = stateAt(g), r = rates(state), d = Math.floor(g / T) - 14, tod = g % T;
  const before = {}; for (const n of NEEDS) before[n.key] = level(n.key);
  for (const n of NEEDS) add(n.key, r[n.key] / 2);
  // kandung kemih
  if ((state === 'school' || state === 'work') && value('bladder') <= R.autoToiletAt) { setVal('bladder', 100); }
  else if (state === 'sleep' && value('bladder') <= R.wakeToiletAt) { setVal('bladder', 100); add('energy', -2); }
  else if (value('bladder') <= 0) {
    for (const [k, v] of Object.entries(R.accident)) add(k, v); setVal('bladder', 100);
    x.log('kehidupan', 'Karakter tidak sempat ke toilet — kebersihan −40, mood −20. Perhatikan indikator kandung kemih.');
  }
  // performa (rata-rata selama sekolah/kerja)
  if (state === 'school' || state === 'work') { life.perfAcc.sum += perfFactor(); life.perfAcc.n++; }
  // makan keluarga otomatis
  for (const fm of R.familyMeals) if (tod === fm.h * 2 + (fm.m >= 30 ? 1 : 0) && life.autoMeals) familyMeal(g, d, fm, state);
  // perjalanan harian (sekali per hari sekolah/kerja, saat jam masuk)
  const sch = x.schedule(d), h = tod / 2, startH = sch.school?.[0] ?? sch.work?.[0];
  if (startH != null && h === startH && life.commuteDay !== d) commute(d);
  // log saat masuk kondisi kritis (sekali per penurunan)
  for (const n of NEEDS) { const lv = level(n.key); if (lv === 'critical' && before[n.key] !== 'critical') x.log('kehidupan', `${n.label} ${n.invert ? 'sangat tinggi' : 'kritis'} (${Math.round(value(n.key))}). ${n.effect}`); }
  // aktivitas selesai di tick ini
  checkActivity();
}

function familyMeal(g, d, fm, state) {
  const x = X(), life = L();
  if (state !== 'awake') return; // sedang sekolah/kerja/aktivitas/live — tidak ikut makan keluarga
  if (value('hunger') > 85) return;
  const age = x.ageYears();
  if (age >= 18) return; // dewasa: makan di rumah berbayar lewat checkout (lihat halaman Kehidupan)
  applyFx(R.familyMealFx); life.lastMealDay = d;
  pushHistory(`${fm.label}`, R.familyMealFx);
}

// ——— perjalanan harian ———
export const COMMUTE_FX = {
  jalan: { energy: -6, hygiene: -6, stress: 2 }, sepeda: { energy: -4, hygiene: -4, mood: 1 }, bus: { energy: -2, stress: 1 }, ojek: { energy: -1 },
};
function commute(d) {
  const x = X(), life = L(); life.commuteDay = d;
  let mode = life.commute || 'jalan';
  if (mode === 'sepeda' && !life.owned.sepeda) mode = 'jalan';
  applyFx(COMMUTE_FX[mode]);
  if (mode === 'bus' || mode === 'ojek') x.finQueue({ kind: 'commute', mode, day: d });
}
/** Dipanggil engine keuangan bila tarif perjalanan gagal dibayar: karakter berjalan kaki. */
export function commuteFallback(mode, reason) {
  const a = COMMUTE_FX[mode], b = COMMUTE_FX.jalan;
  for (const k of Object.keys(b)) add(k, (b[k] || 0) - (a[k] || 0));
  X().log('transport', `Tarif ${mode === 'ojek' ? 'ojek online' : 'bus'} gagal dibayar (${reason}). Karakter berjalan kaki hari ini.`);
}

// ——— performa ———
export function perfFactor() {
  let f = 1; const seen = new Set();
  for (const p of R.perf) { if (seen.has(p.key)) continue; const v = value(p.key); if ((p.below != null && v < p.below) || (p.above != null && v > p.above)) { f += p.f; seen.add(p.key); } }
  return clamp(f, 0.4, 1);
}
/** Rata-rata faktor performa selama jam kerja/sekolah hari ini; di-reset tiap akhir hari. */
export function takeDayPerf() { const a = L().perfAcc; const v = a.n ? a.sum / a.n : perfFactor(); L().perfAcc = { sum: 0, n: 0 }; return v; }

// ——— efek & riwayat ———
export function applyFx(fx) { for (const [k, v] of Object.entries(fx || {})) if (k !== 'set' && (k === 'energy' || k in L().needs)) add(k, v); }
function pushHistory(text, fx) { const x = X(), h = L().history; h.unshift({ day: x.day(), sec: x.sec(), text, fx }); if (h.length > 40) h.length = 40; }

// ——— aktivitas pribadi ———
export function blockedReason({ allowDuringActivity = false } = {}) {
  const x = X(), life = L(); if (!life) return 'Data kehidupan belum siap.';
  if (x.stale()) return 'Sesi ini kedaluwarsa (tab lain lebih baru). Muat ulang halaman.';
  if (x.liveOn()) return 'Karakter sedang siaran langsung. Akhiri live dulu.';
  const a = life.activity; if (a && !allowDuringActivity) return `Karakter sedang ${a.label.toLowerCase()} — selesai pukul ${CAL.fmtHM(a.endAbs % 86400)}.`;
  const g = x.g(), h = (g % T) / 2 + (x.sec() % SPT) / 3600, d = x.day(), sch = x.schedule(d);
  if (h < TR.sleep.to || h >= TR.sleep.from) return `Karakter sedang tidur (${pad(TR.sleep.from)}:00–${pad(TR.sleep.to)}:00). Aksi pribadi tersedia lagi pukul ${pad(TR.sleep.to)}:00.`;
  if (sch.school && h >= sch.school[0] && h < sch.school[1]) return `Karakter sedang di sekolah (${pad(sch.school[0])}:00–${pad(sch.school[1])}:00).`;
  if (sch.work && h >= sch.work[0] && h < sch.work[1]) return `Karakter sedang bekerja (${pad(sch.work[0])}:00–${pad(sch.work[1])}:00).`;
  return null;
}
const pad = n => String(n).padStart(2, '0');
/** Apakah aktivitas selama `min` menit akan menabrak jam tidur/sekolah/kerja? */
export function overlapReason(min) {
  const x = X(), d = x.day(), now = x.sec(), end = now + min * 60, sch = x.schedule(d);
  const blocks = [[TR.sleep.from * 3600, 86400, 'jam tidur'], sch.school && [sch.school[0] * 3600, sch.school[1] * 3600, 'jam sekolah'], sch.work && [sch.work[0] * 3600, sch.work[1] * 3600, 'jam kerja']].filter(Boolean);
  for (const [a, b, l] of blocks) if (end > a && now < b) return `Aktivitas ${min} menit akan melewati ${l} (mulai ${CAL.fmtHM(a)}).`;
  return null;
}
export function invCount(kind) { return Object.entries(L().inventory).filter(([, v]) => v.kind === kind).reduce((s, [, v]) => s + (v.uses ?? v.qty), 0); }
function useInv(kind) { const e = Object.entries(L().inventory).find(([, v]) => v.kind === kind && (v.uses ?? v.qty) > 0); if (!e) return false; const v = e[1]; if (v.uses != null) v.uses--; else v.qty--; if ((v.uses ?? v.qty) <= 0) delete L().inventory[e[0]]; return true; }
export function addInventory(item, qty = 1) {
  const inv = L().inventory;
  if (item.upgrade || item.unlock) { L().owned[item.kind] = true; return; }
  const key = item.kind || item.id;
  if (!inv[key]) inv[key] = { id: item.id, name: item.name, kind: item.kind || 'konsumsi', qty: 0, uses: item.uses != null ? 0 : undefined, fx: item.fx, min: item.min, health: item.health };
  if (item.uses != null) inv[key].uses += item.uses * qty; else inv[key].qty += qty;
}
export function homeAction(id) {
  const a = HOME_ACTIONS.find(x => x.id === id); if (!a) return { ok: false, error: 'Aksi tidak dikenal.' };
  const why = blockedReason() || overlapReason(a.min); if (why) return { ok: false, error: why };
  if (a.uses && invCount(a.uses) <= 0) return { ok: false, error: 'Sabun & sampo habis. Beli di SerbaMart 24 atau Pasarku, atau pilih "Mandi tanpa sabun".' };
  if (a.uses) useInv(a.uses);
  return start({ kind: a.id, label: a.label, min: a.min, fx: a.fx, set: a.set, rateState: a.rateState });
}
/** Konsumsi barang dari inventori (mis. roti, air mineral, vitamin). */
export function consume(key) {
  const v = L().inventory[key]; if (!v || (v.qty ?? 0) <= 0) return { ok: false, error: 'Barang tidak ada di inventori.' };
  const why = blockedReason() || overlapReason(v.min || 5); if (why) return { ok: false, error: why };
  v.qty--; const fx = { ...v.fx }; if (v.health) fx.health = (fx.health || 0) + v.health; if (v.qty <= 0) delete L().inventory[key];
  return start({ kind: 'konsumsi', label: v.name, min: v.min || 5, fx });
}
/** Mulai aktivitas dengan efek yang diterapkan saat selesai. Dipakai juga setelah pembayaran merchant dikonfirmasi server. */
export function start({ kind, label, min, fx, set, rateState, source }) {
  const x = X(), now = x.abs();
  L().activity = { kind, label, startAbs: now, endAbs: now + Math.max(1, min) * 60, fx: fx || {}, set: set || null, rateState: rateState || null, source: source || null };
  x.log('kehidupan', `Mulai: ${label} (${min} menit).`); x.save(); x.emit('change');
  return { ok: true, msg: `${label} — ${min} menit game.` };
}
export function checkActivity() {
  const x = X(), a = L()?.activity; if (!a) return;
  if (x.abs() < a.endAbs) return;
  applyFx(a.fx); if (a.set) for (const [k, v] of Object.entries(a.set)) setVal(k, v);
  L().activity = null; pushHistory(a.label, a.fx);
  x.log('kehidupan', `Selesai: ${a.label}.`); x.save(); x.emit('change');
}
/** Majukan jam sampai aktivitas selesai (dibatasi aturan jam yang sama dengan tombol jam). */
export function finishNow() {
  const x = X(), a = L()?.activity; if (!a) return { ok: false, error: 'Tidak ada aktivitas berjalan.' };
  if (x.liveOn()) return { ok: false, error: 'Tidak bisa mempercepat saat live.' };
  x.advance(Math.max(0, a.endAbs - x.abs())); checkActivity(); return { ok: true };
}
export function activityProgress() { const x = X(), a = L()?.activity; if (!a) return null; return { ...a, pct: clamp((x.abs() - a.startAbs) / (a.endAbs - a.startAbs), 0, 1), leftSec: Math.max(0, a.endAbs - x.abs()) }; }
export function setCommute(mode) { if (!COMMUTE_FX[mode]) return { ok: false, error: 'Moda tidak dikenal.' }; if (mode === 'sepeda' && !L().owned.sepeda) return { ok: false, error: 'Belum punya sepeda. Beli di Pasarku.' }; L().commute = mode; X().save(); X().emit('change'); return { ok: true, msg: 'Moda perjalanan harian diubah.' }; }
export function setAutoMeals(on) { L().autoMeals = !!on; X().save(); X().emit('change'); return { ok: true }; }
export function setNeedsQA(obj) { for (const [k, v] of Object.entries(obj)) setVal(k, v); }
