// BIZSIM CORE ENGINE — state, jam simulasi, ledger, dan semua aksi pemain.
// UI tidak pernah menghitung harga/hasil sendiri: UI hanya membaca state & memanggil aksi di sini.
import { MARKET_ASSETS, TICKS_PER_DAY as T, WARMUP_DAYS } from '../data/market-assets.js';
import { JOB_CATALOG, EDUCATION_LEVELS, EVALUATIONS, YOUTUBE } from '../data/job-catalog.js';
import { BUSINESS_CATALOG, LOCATIONS, SUPPLIERS } from '../data/business-catalog.js';
import { INVEST_STOCKS, INDEX_FUNDS, GOLD, LAND_PLOTS, RENTAL_PROPERTIES, BONDS, DEPOSITS, LAND_COSTS } from '../data/investment-catalog.js';
import { hrand, hnorm, clamp } from './rng.js';
import { initMarket, marketTick, marketDayClose, currentQuote } from './market.js';
import { initInvest, investDay, holdingValue, holdingNetSale, instrument, bondPricePct } from './invest.js';
import { catalogById, simulateBusinessDay, restockCost, leadTime, feasibility, capacityOf, conceptFit } from './business.js';
import { get, post, put } from '../ui/api.js';
import * as CR from './creator/studio.js';
import * as NE from './needs.js';
import * as CAL from './calendar.js';
import { TIME_RULES as TR } from '../data/time-rules.js';

// Titik acuan internal untuk "kalender hidup" (usia karakter, lihat LIFE_PER_DAY). Bukan kalender game.
const START = Date.UTC(2026, 0, 5);
const G0 = WARMUP_DAYS * T;
if (T !== CAL.TICKS_PER_DAY) throw new Error('TICKS_PER_DAY tidak sinkron dengan aturan kalender.');
export const VERSION = 2;

// ————————————————————————— event bus —————————————————————————
const listeners = {};
export function on(ev, fn) { (listeners[ev] ||= []).push(fn); return () => listeners[ev] = listeners[ev].filter(f => f !== fn); }
export function emit(ev, data) { (listeners[ev] || []).forEach(f => { try { f(data); } catch (e) { console.error(e); } }); }

export let S = null; // state aktif

// ————————————————————————— kalender & jam (sumber tunggal: engine/calendar.js) —————————————————————————
// S.clock.g   = jumlah tick 30 menit sejak awal dunia (termasuk 14 hari warm-up pasar)
// S.clock.sec = detik game di dalam tick berjalan (0 … 1.799,x). Jam/menit/detik dihitung dari dua nilai ini.
export const weekdayOf = CAL.weekdayOf;
export const domOf = CAL.dateOfMonth;
export const monthOf = CAL.monthOf;
export const dayNow = () => Math.floor(S.clock.g / T) - WARMUP_DAYS;
export const tickOfDay = () => S.clock.g % T;
/** Detik game sejak 00:00:00 hari ini. */
export const secOfDay = () => tickOfDay() * CAL.SEC_PER_TICK + Math.floor(S.clock.sec || 0);
/** Detik game absolut sejak Tahun 1 · Bulan 1 · Tanggal 1 00:00:00 (negatif = pra-simulasi). */
export const nowSec = () => (S.clock.g - G0) * CAL.SEC_PER_TICK + (S.clock.sec || 0);
export const gOfSec = s => Math.floor(s / CAL.SEC_PER_TICK) + G0;
export function timeLabel() { return CAL.fmtHM(secOfDay()); }
export function timeLabelFull() { return CAL.fmtHMS(secOfDay()); }
/** Snapshot jam simulasi untuk UI (semua komponen dari state, bukan dari jam perangkat). */
export function clockNow() {
  const d = dayNow(), s = secOfDay(), p = CAL.dateParts(d), t = CAL.timeParts(s);
  return { ...p, ...t, secOfDay: s, abs: nowSec(), paused: !!S.settings.paused, rate: S.settings.rate, effRate: effectiveRate(), live: !!S.creator?.live };
}

// ————————————————————————— dunia baru —————————————————————————
function freshState(seed, profile = null, charId = null) {
  const st = {
    version: VERSION, seed, charId, createdAt: Date.now(),
    clock: { g: 0, sub: 0, sec: 0 }, settings: { paused: false, speed: 1, rate: CAL.DEFAULT_RATE },
    player: {
      name: profile?.name || 'Pemain', balance: 0, xp: 0, reputation: 0, education: 'Tidak ada', energy: 100,
      skills: { komunikasi: 3, penjualan: 1, manajemen: 1, keuangan: 1, teknologi: 2, kreativitas: 4, teknis: 1 },
    },
    economy: { inflation: 0.031, rate: 0.0575, growth: 0.05, sentiment: 0, consumer: 1 },
    market: initMarket(),
    trading: { positions: {}, trades: [] },
    invest: initInvest(),
    career: { job: null, applications: [], experience: {}, history: [], gigToday: null, studiedToday: false, courseToday: false, appSeq: 1 },
    youtube: null,
    businesses: [], bizSeq: 1,
    debts: [], debtSeq: 1,
    today: { income: {}, expense: {} },
    ledger: [],
    activity: [],
  };
  st.finSeq = 0; st.shopSeq = 0; st.fin = { outbox: [], payroll: null };
  S = st;
  CR.initCreator(st);
  NE.initLife(st);
  // Warm-up: engine membangkitkan riwayat pasar & valuasi sebelum pemain masuk (dari seed).
  for (let g = 0; g < G0; g++) {
    marketTick(st.market, seed, g, st.economy.sentiment);
    st.clock.g = g + 1;
    if ((g + 1) % T === 0) {
      const d = (g + 1) / T - 1 - WARMUP_DAYS;
      marketDayClose(st.market, d);
      economyDay(d);
      investDay(st.invest, st.economy, seed, d, domOf(d + 1) === 1);
    }
  }
  log('sistem', 'Dunia simulasi dibuat. Karakter mulai sebagai calon siswa SD dengan saldo pribadi Rp 0. Uang saku harian dari wali masuk ke saldo.', 0);
  return st;
}

function economyDay(d) {
  const e = S.economy, sd = S.seed;
  e.inflation = clamp(e.inflation + 0.0004 * hnorm(sd, 'infl', d) + 0.01 * (0.03 - e.inflation) / 30, 0.005, 0.09);
  if (d % 30 === 29) { // rapat suku bunga simulasi tiap 30 hari
    const r = hrand(sd, 'rate', d);
    if (r < 0.2) e.rate += 0.0025; else if (r > 0.8) e.rate -= 0.0025;
    e.rate = clamp(e.rate + (e.inflation - 0.03) * 0.05, 0.03, 0.09);
  }
  e.growth = clamp(e.growth + 0.0006 * hnorm(sd, 'gdp', d) + (0.05 - e.growth) * 0.01, 0.01, 0.08);
  e.sentiment = clamp(0.9 * e.sentiment + 0.1 * S.market.sentiment + 0.05 * hnorm(sd, 'esent', d), -1, 1);
  e.consumer = clamp(1 + (e.growth - 0.05) * 3 + 0.06 * e.sentiment - (e.inflation - 0.03) * 2, 0.8, 1.2);
}

// ————————————————————————— persistence (server) —————————————————————————
// Simpanan game dikirim ke server BizSim (PUT /api/game). Tidak ada penyimpanan di browser.
let saveTimer = null, dirty = false, lastSave = 0;
export const sync = { status: 'idle', at: 0, error: null };
export function save() { if (stale) return; dirty = true; if (!saveTimer) saveTimer = setTimeout(flush, Math.max(500, 4000 - (Date.now() - lastSave))); }
let inflight = null;
export async function flush(keepalive = false) {
  if (inflight) { await inflight; }
  clearTimeout(saveTimer); saveTimer = null; if (!dirty || !S) return;
  inflight = doFlush(keepalive); await inflight; inflight = null;
}
async function doFlush(keepalive) {
  dirty = false; lastSave = Date.now(); sync.status = 'saving'; emit('sync');
  const body = JSON.stringify({ game: S });
  const r = await put('/api/game', body, { keepalive: keepalive && body.length < 60000, raw: true });
  sync.status = r.ok ? 'saved' : 'error'; sync.at = Date.now(); sync.error = r.ok ? null : r.error; if (!r.ok) dirty = true;
  // Server menolak save dengan jam lebih lama (tab lain sudah lebih maju): hentikan jam lokal agar tidak bercabang.
  // Server keuangan sudah mengubah uang tunai (setor/tarik/bayar tunai) setelah save terakhir: terapkan lalu kirim ulang.
  if (r.code === 'finseq') { applyCashAdj(r.adjustments || []); dirty = true; sync.status = 'saving'; setTimeout(() => flush(), 30); }
  if (r.code === 'shopseq') { applyShopGrants(r.grants || []); dirty = true; sync.status = 'saving'; setTimeout(() => flush(), 30); }
  if (r.code === 'stale') { stale = true; dirty = false; stop(); S.settings.paused = true; sync.status = 'stale'; emit('change'); }
  emit('sync');
}
let stale = false;
export const isStale = () => stale;

// ————————————————————————— profil, usia & pendidikan (data server) —————————————————————————
export let P = null;      // profil karakter (biodata) — dari server
export let EDU = null;    // tampilan pendidikan terbaru dari server (view)
export function setEdu(view) {
  if (!view || !view.ok) return;
  EDU = view; P = view.profile;
  if (S && view.edu) {
    const hi = view.edu.highest || 'Tidak ada';
    if (S.player.education !== hi) { S.player.education = hi; if (hi !== 'Tidak ada') log('pendidikan', `Riwayat pendidikan tercatat: ${hi}.`); save(); }
  }
  emit('edu', view); emit('change');
}
/** Kalender hidup karakter: 1 tahun ajaran (56 hari game) = 1 tahun usia. Sama dengan server. */
export const LIFE_PER_DAY = 365.25 / 56;
export const lifeDateOf = d => new Date(START + Math.floor(Math.max(0, d) * LIFE_PER_DAY) * 864e5);
export function ageYears(d = S ? dayNow() : 0) {
  if (!P) return null;
  const b = new Date(P.birthDate + 'T00:00:00Z'), x = lifeDateOf(d);
  let a = x.getUTCFullYear() - b.getUTCFullYear();
  if (x.getUTCMonth() < b.getUTCMonth() || (x.getUTCMonth() === b.getUTCMonth() && x.getUTCDate() < b.getUTCDate())) a--;
  return a;
}
/** Batas usia simulasi untuk aktivitas finansial (dikelola engine, bukan UI). */
export const AGE_RULES = { kurir: 17, trading: 17, invest: 17, business: 17, youtube: 13, gig: 15, part: 16, full: 18 };
export function ageLock(kind) {
  const a = ageYears(), min = AGE_RULES[kind];
  if (a == null || a >= min) return null;
  return `Usia karakter ${a} tahun. Aktivitas ini terbuka mulai usia ${min} tahun simulasi.`;
}
const ALLOWANCE = { prasejahtera: 5_000, menengah: 10_000, mampu: 20_000 };
export const allowanceToday = () => (P ? ALLOWANCE[P.family] || 0 : 0) * (EDU?.edu?.status === 'enrolled' ? 1 : 0.5);
let advancing = null;
export async function syncEducation() {
  if (!S || !P) return;
  const r = await post('/api/edu/advance', { gameDay: dayNow() });
  if (r.ok) setEdu(r);
  return r;
}
function queueEduSync() { clearTimeout(advancing); advancing = setTimeout(syncEducation, 250); }
/** Pembayaran pendidikan dari saldo pribadi — dipanggil setelah server mencatat pembayaran. */
export function chargeEducation(amount, label) {
  if (!(amount > 0)) return;
  S.player.balance = Math.max(0, S.player.balance - amount); addTo('expense', 'pendidikan', amount);
  log('pendidikan', label, -amount); save(); emit('change');
}
export async function forceSave() { dirty = true; await flush(); }
export function newGameFor(view, seed) { stop(); freshState(seed || view.profile.seed, view.profile, view.charId); P = view.profile; setEdu(view); dirty = true; return flush(); }

// ————————————————————————— loop —————————————————————————
// Simulation clock terpusat. Satu loop (10 Hz) mengukur waktu nyata yang berlalu, mengubahnya menjadi detik game
// sesuai kecepatan, lalu memajukan S.clock. Setiap kali batas 30 menit terlewati, tick() menjalankan engine ekonomi.
// Selama live, setiap batas menit menjalankan satu langkah live. UI hanya membaca hasilnya (event 'clock').
let timer = null, lastReal = 0, lastSaveReal = 0, endStamp = null;
const FRAME_MS = 100;
export const SPEEDS = CAL.SPEEDS;
export const effectiveRate = () => { const r = S.settings.rate || CAL.DEFAULT_RATE; return S.creator?.live ? CAL.liveRate(r) : r; };
export function start() {
  stop(); if (stale) return;
  if (S.settings.paused) { emit('clock', clockNow()); return; }
  lastReal = performance.now();
  timer = setInterval(frame, FRAME_MS);
}
function frame() {
  const now = performance.now();
  const dt = Math.min(CAL.MAX_REAL_STEP_MS, Math.max(0, now - lastReal)); lastReal = now;
  advanceSeconds(dt / 1000 * effectiveRate());
  NE.checkActivity();
  if (now - lastSaveReal > 10_000) { lastSaveReal = now; save(); }
  emit('clock', clockNow());
}
/** Majukan jam sebanyak `secs` detik game. Dipakai loop dan uji otomatis; tidak melompati tick maupun menit live. */
export function advanceSeconds(secs) {
  let rem = Math.max(0, secs), guard = 0;
  while (rem > 1e-9 && guard++ < 10_000) {
    const c = S.clock; c.sec = c.sec || 0;
    if (S.creator?.live) {
      const toMin = 60 - (c.sec % 60);
      if (rem < toMin - 1e-9) { c.sec += rem; rem = 0; break; }
      rem -= toMin; c.sec = Math.round(c.sec + toMin);
      c.sub = Math.floor(c.sec / 60);
      CR.liveStep();
      if (c.sec >= CAL.SEC_PER_TICK) tick();
      else if (c.sub % 5 === 0) save();
      if (!S.creator.live) { save(); emit('tick', { g: c.g }); emit('change'); }
      emit('live');
    } else {
      const toTick = CAL.SEC_PER_TICK - c.sec;
      if (rem < toTick - 1e-9) { c.sec += rem; c.sub = Math.floor(c.sec / 60); rem = 0; break; }
      rem -= toTick; tick();
    }
  }
}
export const liveActive = () => !!S.creator?.live;
export function stop() { if (timer) clearInterval(timer); timer = null; }
export function setPaused(p) { S.settings.paused = !!p; save(); start(); emit('change'); emit('clock', clockNow()); }
/** Kecepatan dalam detik game per detik nyata; hanya nilai dari konfigurasi SPEEDS yang diterima. */
export function setRate(rate) {
  const sp = CAL.SPEEDS.find(x => x.rate === +rate); if (!sp) return fail('Kecepatan tidak dikenal.');
  S.settings.rate = sp.rate; S.settings.speed = sp.rate / CAL.DEFAULT_RATE; save(); start(); emit('change'); emit('clock', clockNow());
  return { ok: true, msg: `Kecepatan ${sp.name}: ${sp.desc}.` };
}
export function setSpeed(x) { return setRate(CAL.DEFAULT_RATE * x); }

let saveCounter = 0;
export function tick(silent = false) {
  const g = S.clock.g;
  marketTick(S.market, S.seed, g, S.economy.sentiment);
  NE.needsTick(g);
  CR.creatorTick(g);
  S.clock.g = g + 1; S.clock.sub = 0; S.clock.sec = 0;
  let dayEnded = false;
  if ((g + 1) % T === 0) { const d = (g + 1) / T - 1 - WARMUP_DAYS; endStamp = d; try { endOfDay(d); } finally { endStamp = null; } dayEnded = true; }
  if (!silent) {
    if (++saveCounter % 4 === 0 || dayEnded) save();
    emit('tick', { g: S.clock.g });
    if (dayEnded) { emit('day', { day: dayNow() }); emit('change'); queueEduSync(); flush(); }
  }
}
/** Percepat ke awal hari berikutnya (menjalankan semua tick sisa — tetap deterministik). */
export function skipToNextDay(n = 1) {
  if (S.creator?.live) return false;
  for (let k = 0; k < n; k++) { const rem = T - tickOfDay(); for (let i = 0; i < rem; i++) tick(true); }
  save(); emit('tick', { g: S.clock.g }); emit('day', { day: dayNow() }); emit('change'); queueEduSync(); flush();
}

// ————————————————————————— uang & ledger —————————————————————————
const addTo = (bucket, k, v) => { S.today[bucket][k] = (S.today[bucket][k] || 0) + v; };
function earn(amount, cat, text) { S.player.balance += amount; addTo('income', cat, amount); if (text) log(cat, text, amount); }
function spend(amount, cat) { if (S.player.balance < amount) return false; S.player.balance -= amount; addTo('expense', cat, amount); return true; }
const INTERNAL = new Set(['tabungan_bank', 'tarik_tunai', 'topup_dompet']);
/** Penyesuaian uang tunai yang sudah dikonfirmasi server keuangan (berurutan, idempoten per seq). */
export function applyCashAdj(list) {
  let n = 0;
  for (const a of [...(list || [])].sort((x, y) => x.seq - y.seq)) {
    if (a.seq <= (S.finSeq || 0)) continue;
    S.player.balance = Math.round(S.player.balance + a.delta); S.finSeq = a.seq; n++;
    if (!INTERNAL.has(a.cat)) addTo(a.delta < 0 ? 'expense' : 'income', a.cat || 'lainnya', Math.abs(a.delta));
  }
  if (n) { save(); emit('change'); }
  return n;
}
/** Hadiah/barang belanja yang sudah dikonfirmasi server (berurutan, idempoten per seq). Server tidak menerima save yang belum memuatnya. */
export function applyShopGrants(list) {
  let n = 0;
  for (const g of [...(list || [])].sort((x, y) => x.seq - y.seq)) {
    if (g.seq <= (S.shopSeq || 0)) continue;
    S.shopSeq = g.seq; n++;
    if (g.kind === 'inv_add') NE.addInventory(g.item, g.qty || 1);
    else if (g.kind === 'consume') { const r = (NE.blockedReason() || NE.overlapReason(g.min || 5)) ? null : NE.start({ kind: 'beli', label: g.label, min: g.min || 5, fx: g.fx }); if (!r) NE.addInventory({ id: 'consume-' + g.seq, name: g.label, kind: 'konsumsi-' + g.seq, fx: g.fx, min: g.min || 5 }, 1), log('kehidupan', `${g.label} disimpan di inventori (karakter sedang sibuk).`); }
    else if (g.kind === 'need') NE.applyFx(g.fx);
    else if (g.kind === 'knowledge') { addXp(g.amount || 0); log('skill', `Bonus belajar dari belanja: +${g.amount} Knowledge XP.`); }
    else if (g.kind === 'skill') { S.player.skills[g.skill] = (S.player.skills[g.skill] || 0) + (g.amount || 0); log('skill', `Bonus belanja: +${g.amount} skill ${g.skill}.`); }
    else if (g.kind === 'log') log('belanja', g.text);
  }
  if (n) { save(); emit('change'); }
  return n;
}
/** Pengeluaran non-tunai (debit/kredit/dompet) dicatat di buku harian tanpa mengubah uang tunai. */
export function recordExpense(cat, amount) { addTo('expense', cat, amount); save(); }
export let FINV = null;
export function setFinView(v) { FINV = v; emit('fin', v); emit('change'); }
/** Pendapatan yang dikirim ke rekening gaji (jika diatur) — saldo bank diubah server, bukan klien. */
function payIncome(amount, cat, text, key) {
  const acc = S.fin?.payroll && FINV?.accounts?.find(a => a.id === S.fin.payroll && a.status === 'aktif');
  if (!acc) return earn(amount, cat, text);
  addTo('income', cat, amount); log(cat, `${text} Ditransfer ke ${acc.name} (menunggu konfirmasi server).`, amount);
  S.fin.outbox.push({ kind: 'inbound', idem: `gaji-${S.charId}-${key}`.replace(/[^a-zA-Z0-9:_-]/g, ''), account: acc.id, amount, label: text, day: dayNow() });
}
/** Gaji yang gagal masuk rekening dibayar tunai (pendapatan sudah tercatat saat gaji diproses). */
export function cashFallback(amount, text) { S.player.balance += amount; log('gaji', text, amount); save(); emit('change'); }
export function finQueue(item) { S.fin.outbox.push({ ...item, idem: item.idem || `q-${item.kind}-${item.day}-${Math.random().toString(36).slice(2, 8)}` }); save(); emit('finq'); }
function forceSpend(amount, cat, why) {
  if (S.player.balance >= amount) { spend(amount, cat); return; }
  const short = amount - Math.max(0, S.player.balance);
  addTo('expense', cat, amount);
  S.player.balance = Math.max(0, S.player.balance) - amount + short; // saldo jadi 0
  let d = S.debts.find(x => x.kind === 'darurat');
  if (!d) { d = { id: S.debtSeq++, kind: 'darurat', name: 'Kredit darurat (simulasi)', principal: 0, remaining: 0, rateYear: 0.24, monthlyPay: 0, startDay: dayNow() }; S.debts.push(d); }
  d.principal += short; d.remaining += short; d.monthlyPay = Math.ceil(d.remaining / 6);
  log('utang', `Saldo tidak cukup untuk ${why}. Kekurangan ditutup kredit darurat 24%/thn.`, -short);
}
export function log(type, text, amount = null) {
  // Kejadian dari proses pergantian hari dicatat pada hari yang ditutup, jam 24:00 ("akhir hari"), sama dengan buku besar.
  if (endStamp != null) S.activity.unshift({ day: endStamp, time: '24:00', sec: CAL.SEC_PER_DAY, type, text, amount });
  else S.activity.unshift({ day: dayNow(), time: timeLabel(), sec: secOfDay(), type, text, amount });
  if (S.activity.length > 150) S.activity.length = 150;
}
function addXp(n) {
  const before = levelInfo().level; S.player.xp += n;
  const after = levelInfo().level;
  if (after > before) log('level', `Naik ke Level ${after}.`);
}
export function levelInfo(xp = S.player.xp) {
  let L = 1; while (60 * (L + 1) * L <= xp) L++;
  const cur = 60 * L * (L - 1), next = 60 * (L + 1) * L;
  return { level: L, xp, cur, next, pct: (xp - cur) / (next - cur) };
}
const rep = n => { S.player.reputation = clamp(S.player.reputation + n, 0, 100); };

// ————————————————————————— akhir hari —————————————————————————
function endOfDay(d) {
  marketDayClose(S.market, d);
  const al = allowanceToday(); if (al > 0) earn(al, 'uang saku');
  economyDay(d);
  const monthEnd = domOf(d + 1) === 1;
  investDay(S.invest, S.economy, S.seed, d, monthEnd);
  careerDay(d, NE.takeDayPerf());
  businessDay(d);
  investmentEvents(d, monthEnd);
  CR.creatorDay(d, monthEnd, domOf(d + 1));
  if (monthEnd) debtsMonth(d);
  // tutup buku
  const inc = Object.values(S.today.income).reduce((s, x) => s + x, 0);
  const exp = Object.values(S.today.expense).reduce((s, x) => s + x, 0);
  const nw = netWorth();
  S.ledger.push({ day: d, income: S.today.income, expense: S.today.expense, totalIncome: inc, totalExpense: exp, netWorth: nw.net, assets: nw.totalAssets, cash: S.player.balance });
  if (S.ledger.length > 180) S.ledger.shift();
  S.today = { income: {}, expense: {} };
  S.career.gigToday = null; S.career.studiedToday = false; S.career.courseToday = false;
}

// ————————————————————————— KARIER —————————————————————————
export const jobById = id => JOB_CATALOG.find(j => j.id === id);
const eduRank = e => EDUCATION_LEVELS.indexOf(e);
export function isWorkday(d = dayNow()) { const w = weekdayOf(d); return w >= 1 && w <= 5; }

export function jobRequirements(j) {
  const p = S.player, reasons = [];
  const al = ageLock(j.id === 'gig-kurir' ? 'kurir' : j.type); if (al) reasons.push(al);
  if (eduRank(p.education) < eduRank(j.education)) reasons.push(`Pendidikan minimal ${j.education} (kamu: ${p.education})`);
  for (const [k, v] of Object.entries(j.skills)) if ((p.skills[k] || 0) < v) reasons.push(`Skill ${k} minimal ${v} (kamu: ${(p.skills[k] || 0).toFixed(1)})`);
  if (j.expDays) {
    const have = j.expIndustry ? (S.career.experience[j.expIndustry] || 0) : Object.values(S.career.experience).reduce((s, x) => s + x, 0);
    if (have < j.expDays) reasons.push(`Pengalaman ${j.expIndustry ? 'di ' + j.expIndustry + ' ' : ''}minimal ${j.expDays} hari kerja (kamu: ${have})`);
  }
  return reasons;
}
function fitScore(j) {
  const ent = Object.entries(j.skills);
  if (!ent.length) return 0.3;
  return ent.reduce((s, [k, v]) => s + clamp(((S.player.skills[k] || 0) - v) / Math.max(v, 5), -1, 1), 0) / ent.length;
}
/** Estimasi peluang diterima — selalu ditampilkan sebagai rentang, bukan kepastian. */
export function acceptanceEstimate(j, internal = false) {
  const base = { Rendah: 0.72, Sedang: 0.48, Tinggi: 0.26 }[j.competition];
  const c = clamp(base + fitScore(j) * 0.22 + S.player.reputation / 100 * 0.12 + (internal ? 0.15 : 0), 0.05, 0.9);
  const lo = clamp(c - 0.1, 0.02, 0.95), hi = clamp(c + 0.1, 0.05, 0.95);
  return { mid: c, lo, hi, band: c >= 0.6 ? 'Tinggi' : c >= 0.35 ? 'Sedang' : 'Rendah' };
}

export function takeGig(jobId) {
  const j = jobById(jobId); const c = S.career;
  if (j.type !== 'gig') return fail('Pekerjaan ini membutuhkan lamaran.');
  const r = jobRequirements(j); if (r.length) return fail(r[0]);
  if (c.gigToday) return fail('Kamu sudah mengambil shift lepas hari ini.');
  if (c.job && isWorkday() && jobById(c.job.jobId).type !== 'gig') return fail('Hari ini jadwal kerja utamamu. Shift lepas bisa diambil di akhir pekan.');
  if (secOfDay() >= TR.gig.pickupUntil * 3600) return fail(`Shift hari ini sudah lewat (batas pengambilan ${CAL.pad2(TR.gig.pickupUntil)}:00). Coba besok.`);
  c.gigToday = jobId;
  log('karier', `Mengambil shift: ${j.title}. Dibayar di akhir hari.`);
  return ok(`Shift ${j.title} diambil. Upah Rp ${fmt(j.pay)} dibayar di akhir hari simulasi.`);
}

export function apply(jobId, internal = false) {
  const j = jobById(jobId), c = S.career;
  if (j.type === 'gig') return fail('Kerja lepas tidak perlu melamar.');
  const r = jobRequirements(j); if (r.length) return fail('Belum memenuhi syarat: ' + r.join('; '));
  if (c.applications.some(a => a.jobId === jobId && ['dikirim', 'ditinjau', 'evaluasi', 'menunggu', 'tawaran'].includes(a.status))) return fail('Lamaran untuk posisi ini masih diproses.');
  if (c.job?.jobId === jobId) return fail('Ini pekerjaan aktifmu.');
  const est = acceptanceEstimate(j, internal);
  const a = { id: c.appSeq++, jobId, day: dayNow(), status: 'dikirim', chance: est.mid, internal, evalScore: null, timeline: [{ day: dayNow(), s: 'Lamaran dikirim' }] };
  c.applications.unshift(a);
  log('karier', `${internal ? 'Mengajukan promosi' : 'Melamar'}: ${j.title} — ${j.company}.`);
  return ok('Lamaran terkirim. Status akan diperbarui saat hari simulasi berganti.');
}

export function submitEvaluation(appId, answers) {
  const a = S.career.applications.find(x => x.id === appId);
  if (!a || a.status !== 'evaluasi') return fail('Evaluasi tidak tersedia.');
  const j = jobById(a.jobId); const qs = EVALUATIONS[j.evaluation];
  let score = 0;
  qs.forEach((q, i) => { const correct = answers[i] === q.correct; const sk = (S.player.skills[q.skill] || 0) / 40; score += (correct ? 0.75 : 0.15) + clamp(sk, 0, 0.25); });
  a.evalScore = clamp(score / qs.length, 0, 1);
  a.status = 'menunggu'; a.evalDay = dayNow();
  a.timeline.push({ day: dayNow(), s: `${j.evaluation === 'interview' ? 'Interview' : 'Tes skill'} selesai — skor ${Math.round(a.evalScore * 100)}/100` });
  log('karier', `Menyelesaikan ${j.evaluation === 'interview' ? 'interview' : 'tes skill'} untuk ${j.title}.`);
  return ok('Evaluasi terkirim. Keputusan keluar pada hari simulasi berikutnya.');
}

export function acceptOffer(appId) {
  const a = S.career.applications.find(x => x.id === appId);
  if (!a || a.status !== 'tawaran') return fail('Tawaran tidak tersedia.');
  const c = S.career, j = jobById(a.jobId);
  if (c.job) { c.history.push({ jobId: c.job.jobId, start: c.job.startDay, end: dayNow(), daysWorked: c.job.daysWorked }); log('karier', `Berhenti dari ${jobById(c.job.jobId).title}.`); }
  if (c.job && c.job.unpaid > 0) { earn(c.job.unpaid, 'gaji', 'Pembayaran sisa gaji saat berhenti.'); }
  c.job = { jobId: a.jobId, startDay: dayNow() + 1, daysWorked: 0, perf: 65, unpaid: 0, periodDays: 0, lastPay: null };
  a.status = 'diterima'; a.timeline.push({ day: dayNow(), s: 'Tawaran diterima' });
  log('karier', `Mulai bekerja sebagai ${j.title} di ${j.company} besok.`);
  return ok(`Selamat — kamu mulai sebagai ${j.title} pada hari simulasi berikutnya.`);
}
export function declineOffer(appId) {
  const a = S.career.applications.find(x => x.id === appId); if (!a || a.status !== 'tawaran') return fail('Tawaran tidak tersedia.');
  a.status = 'ditolak-pemain'; a.timeline.push({ day: dayNow(), s: 'Tawaran ditolak oleh pemain' }); return ok('Tawaran ditolak.');
}
export function resign() {
  const c = S.career; if (!c.job) return fail('Tidak ada pekerjaan aktif.');
  const j = jobById(c.job.jobId);
  if (c.job.unpaid > 0) earn(c.job.unpaid, 'gaji', 'Pembayaran sisa upah.');
  if (j.type === 'full' && c.job.periodDays > 0) earn(Math.round(j.pay * Math.min(1, c.job.periodDays / 22)), 'gaji', 'Gaji prorata saat resign.');
  c.history.push({ jobId: c.job.jobId, start: c.job.startDay, end: dayNow(), daysWorked: c.job.daysWorked });
  c.job = null; log('karier', `Resign dari ${j.title}.`); return ok('Kamu resign. Sisa upah telah dibayarkan.');
}
export function promotionStatus() {
  const c = S.career; if (!c.job) return null;
  const j = jobById(c.job.jobId); if (!j.promoTo) return { available: false, reasons: ['Tidak ada jalur promosi internal untuk posisi ini.'] };
  const next = jobById(j.promoTo), reasons = [];
  if (c.job.daysWorked < 30) reasons.push(`Minimal 30 hari kerja di posisi ini (kamu: ${c.job.daysWorked})`);
  if (c.job.perf < 65) reasons.push(`Rata-rata kinerja minimal 65 (kamu: ${Math.round(c.job.perf)})`);
  reasons.push(...jobRequirements(next).filter(r => !r.startsWith('Pengalaman')));
  return { available: reasons.length === 0, reasons, next };
}
export function requestPromotion() {
  const p = promotionStatus(); if (!p?.available) return fail(p?.reasons?.[0] || 'Belum memenuhi syarat.');
  return apply(p.next.id, true);
}
export function study(skill, paid) {
  const c = S.career;
  if (paid) {
    if (c.courseToday) return fail('Kursus hanya bisa diikuti sekali per hari.');
    if (!spend(350_000, 'kursus')) return fail('Saldo tidak cukup untuk kursus (Rp 350.000).');
    S.player.skills[skill] += 2.5; c.courseToday = true; log('skill', `Ikut kursus ${skill} (+2,5).`, -350_000); addXp(4);
    return ok(`Skill ${skill} +2,5.`);
  }
  if (c.studiedToday) return fail('Belajar mandiri sudah dilakukan hari ini.');
  S.player.skills[skill] += 0.4; c.studiedToday = true; log('skill', `Belajar mandiri ${skill} (+0,4).`); addXp(2);
  return ok(`Skill ${skill} +0,4.`);
}

function careerDay(d, pf = 1) {
  const c = S.career, wd = weekdayOf(d);
  if (c.job && d >= c.job.startDay) {
    const j = jobById(c.job.jobId);
    if (wd >= 1 && wd <= 5) {
      c.job.daysWorked++; c.experience[j.industry] = (c.experience[j.industry] || 0) + 1;
      // Performa harian dikalikan kondisi karakter (energi, lapar, stres, kesehatan) rata-rata selama jam kerja.
      const daily = clamp((58 + 32 * fitScore(j) + 8 * hnorm(S.seed, 'perf', d)) * pf, 0, 100);
      if (pf < 0.95) log('karier', `Performa kerja turun ${Math.round((1 - pf) * 100)}% karena kondisi karakter (lihat Kebutuhan).`);
      c.job.perf = 0.9 * c.job.perf + 0.1 * daily;
      for (const [k, v] of Object.entries(j.gain)) S.player.skills[k] += v * (0.7 + daily / 300);
      addXp(j.type === 'full' ? 12 : 8); if (daily >= 70) rep(0.2);
      if (j.type === 'part') c.job.unpaid += j.pay; else c.job.periodDays++;
    }
    if (j.type === 'part' && wd === TR.pay.partWeekday && c.job.unpaid > 0) { payIncome(c.job.unpaid, 'gaji', `Upah mingguan ${j.title}.`, `p${d}`); c.job.lastPay = d; c.job.unpaid = 0; }
    if (j.type === 'full' && domOf(d) === TR.pay.fullDay && c.job.periodDays > 0) {
      const pay = Math.round(j.pay * Math.min(1, c.job.periodDays / TR.pay.fullDays));
      payIncome(pay, 'gaji', `Gaji bulanan ${j.title}${c.job.periodDays < 22 ? ' (prorata ' + c.job.periodDays + ' hari)' : ''}.`, `f${d}`); c.job.periodDays = 0; c.job.lastPay = d;
    }
  }
  if (c.gigToday) {
    const j = jobById(c.gigToday);
    earn(j.pay, 'kerja_lepas', `Upah shift ${j.title}.`);
    c.experience[j.industry] = (c.experience[j.industry] || 0) + 1;
    for (const [k, v] of Object.entries(j.gain)) S.player.skills[k] += v;
    addXp(6); rep(0.05);
  }
  for (const a of c.applications) {
    const j = jobById(a.jobId);
    if (a.status === 'dikirim' && d >= a.day) { a.status = 'ditinjau'; a.timeline.push({ day: d + 1, s: 'Lamaran ditinjau HR' }); }
    else if (a.status === 'ditinjau' && d >= a.day + 1) {
      if (j.evaluation !== 'none') { a.status = 'evaluasi'; a.deadline = d + 3; a.timeline.push({ day: d + 1, s: `Diundang ${j.evaluation === 'interview' ? 'interview' : 'tes skill'} (batas hari ke-${a.deadline + 1})` }); log('karier', `Undangan ${j.evaluation === 'interview' ? 'interview' : 'tes skill'}: ${j.title}.`); }
      else decide(a, j, d);
    } else if (a.status === 'evaluasi' && d > a.deadline) { a.status = 'kedaluwarsa'; a.timeline.push({ day: d + 1, s: 'Undangan evaluasi kedaluwarsa' }); }
    else if (a.status === 'menunggu' && d >= a.evalDay) decide(a, j, d);
    else if (a.status === 'tawaran' && d > a.offerUntil) { a.status = 'kedaluwarsa'; a.timeline.push({ day: d + 1, s: 'Tawaran kedaluwarsa' }); }
  }
}
function decide(a, j, d) {
  const final = clamp(a.chance * (a.evalScore == null ? 1 : 0.55 + 0.9 * a.evalScore), 0.02, 0.95);
  const roll = hrand(S.seed, 'app', a.id, a.jobId);
  if (roll < final) { a.status = 'tawaran'; a.offerUntil = d + 3; a.timeline.push({ day: d + 1, s: 'Menerima tawaran kerja' }); log('karier', `Tawaran kerja: ${j.title}. Jawab sebelum hari ke-${d + 4}.`); }
  else {
    a.status = 'ditolak';
    const weak = Object.entries(j.skills).sort((x, y) => ((S.player.skills[x[0]] || 0) - x[1]) - ((S.player.skills[y[0]] || 0) - y[1]))[0];
    a.reason = a.evalScore != null && a.evalScore < 0.6 ? 'Skor evaluasi di bawah kandidat lain.' : weak ? `Kandidat lain lebih kuat di skill ${weak[0]}.` : 'Persaingan kandidat tinggi.';
    a.timeline.push({ day: d + 1, s: 'Lamaran tidak lolos — ' + a.reason }); log('karier', `Lamaran ${j.title} tidak lolos.`);
  }
}

// ————————————————————————— WAKTU KARAKTER (dipakai Career & Creator Studio) —————————————————————————
const SCHOOL_H = 30;
export function weeklyHours() {
  const job = S.career.job ? jobById(S.career.job.jobId) : null;
  const jobH = job ? job.hoursPerWeek : 0;
  const school = EDU?.edu?.status === 'enrolled' ? SCHOOL_H : 0;
  const cr = CR.weeklyCreatorHours();
  const budget = YOUTUBE.weeklyHoursBudget;
  return { budget, job: jobH, school, creator: cr, youtube: cr, free: Math.max(0, budget - jobH - school - cr) };
}
/** Jam sibuk harian karakter (sekolah / kerja) — dipakai antrean produksi & live. */
export function scheduleOf(d) {
  const wd = weekdayOf(d), weekday = wd >= 1 && wd <= 5, e = EDU?.edu;
  // Hari belajar mengikuti server pendidikan: hari periode 1…studyDays (berurutan), bukan hari kerja kalender.
  const td = e?.termStartDay != null ? d - e.termStartDay + 1 : 0;
  const school = e?.status === 'enrolled' && td >= 1 && td <= (EDU?.rules?.studyDays ?? 20) ? (TR.school[e.stage] || TR.school.SD) : null;
  const job = S.career.job && d >= S.career.job.startDay ? jobById(S.career.job.jobId) : null;
  let work = null;
  if (job && weekday && job.type !== 'gig') work = TR.work[job.type] || null;
  if (S.career.gigToday && d === dayNow()) { const gj = jobById(S.career.gigToday); work = [TR.gig.start, TR.gig.start + (gj.shiftHours || 7)]; }
  return { school, work };
}
export const energy = () => S.player.energy ?? 100;
export const creatorAge = () => ageYears();

// ————————————————————————— TRADING (Asset Market) —————————————————————————
export const assetBySym = s => MARKET_ASSETS.find(a => a.symbol === s);
export function tradeQuote(sym, side, qty) {
  const a = assetBySym(sym); const price = currentQuote(S.market, sym);
  const units = a.class === 'saham' ? qty * a.lot : qty;
  const gross = units * price; const fee = Math.round(gross * (side === 'buy' ? a.feeBuy : a.feeSell));
  return { price, units, gross, fee, total: side === 'buy' ? gross + fee : gross - fee };
}
export function validateQty(sym, qty) {
  const a = assetBySym(sym);
  if (qty === '' || qty == null || isNaN(qty)) return 'Masukkan jumlah.';
  if (qty <= 0) return 'Jumlah harus lebih dari 0.';
  if (a.class === 'saham' && !Number.isInteger(qty)) return 'Saham diperdagangkan per lot (bilangan bulat, 1 lot = 100 lembar).';
  if (qty < a.minQty) return `Minimal ${a.minQty} ${a.unit}.`;
  const steps = Math.round(qty / a.step); if (Math.abs(steps * a.step - qty) > 1e-9) return `Kelipatan ${a.step} ${a.unit}.`;
  return null;
}
export function trade(sym, side, qty) {
  { const al = ageLock('trading'); if (al) return fail(al, 'age'); }
  const err = validateQty(sym, qty); if (err) return fail(err, 'invalid');
  const a = assetBySym(sym); const q = tradeQuote(sym, side, qty);
  const pos = S.trading.positions[sym] ||= { units: 0, avgCost: 0, realized: 0, fees: 0 };
  if (side === 'buy') {
    if (S.player.balance < q.total) return fail(`Saldo tidak cukup. Dibutuhkan Rp ${fmt(q.total)}, tersedia Rp ${fmt(S.player.balance)}.`, 'funds');
    S.player.balance -= q.total; addTo('expense', 'biaya_trading', q.fee);
    pos.avgCost = (pos.avgCost * pos.units + q.total) / (pos.units + q.units); pos.units += q.units; pos.fees += q.fee;
  } else {
    if (pos.units + 1e-9 < q.units) return fail(`Unit tidak cukup. Kamu memiliki ${fmtQty(a, pos.units)}.`, 'invalid');
    const pl = q.total - pos.avgCost * q.units;
    S.player.balance += q.total; addTo('expense', 'biaya_trading', q.fee);
    pos.units -= q.units; pos.realized += pl; pos.fees += q.fee; if (pos.units < 1e-9) { pos.units = 0; pos.avgCost = 0; }
    addTo(pl >= 0 ? 'income' : 'expense', 'trading_realized', Math.abs(pl));
  }
  const rec = { day: dayNow(), time: timeLabel(), sym, side, qty, units: q.units, price: q.price, fee: q.fee, total: q.total };
  S.trading.trades.unshift(rec); if (S.trading.trades.length > 100) S.trading.trades.length = 100;
  addXp(1);
  log('trading', `${side === 'buy' ? 'BELI' : 'JUAL'} ${fmtQty(a, q.units)} ${sym} @ Rp ${fmt(q.price)}.`, side === 'buy' ? -q.total : q.total);
  return ok(`${side === 'buy' ? 'Pembelian' : 'Penjualan'} ${sym} berhasil @ Rp ${fmt(q.price)} (harga simulasi).`, rec);
}

// ————————————————————————— INVESTASI —————————————————————————
export function investPrice(cat, iid) {
  const inv = S.invest;
  if (cat === 'saham') return inv.funds[iid] ? inv.funds[iid].nav : inv.stocks[iid].price;
  if (cat === 'emas') return inv.gold.price;
  if (cat === 'tanah') { const l = instrument('tanah', iid); return l.area * inv.land[iid].ppm; }
  if (cat === 'properti') return inv.prop[iid].value;
  return 1;
}
export function investBuyQuote(cat, iid, qty) {
  const it = instrument(cat, iid);
  if (cat === 'saham' && INDEX_FUNDS.find(f => f.id === iid)) return { gross: qty, fee: 0, total: qty, units: qty / S.invest.funds[iid].nav };
  if (cat === 'saham') { const g = qty * 100 * S.invest.stocks[iid].price; const f = Math.round(g * 0.0015); return { gross: g, fee: f, total: g + f, units: qty }; }
  if (cat === 'emas') { const g = Math.round(qty * S.invest.gold.price); return { gross: g, fee: 0, total: g, units: qty }; }
  if (cat === 'tanah' || cat === 'properti') { const g = investPrice(cat, iid); const f = Math.round(g * (LAND_COSTS.buyTax + LAND_COSTS.notary)); return { gross: g, fee: f, total: g + f, units: 1 }; }
  return { gross: qty, fee: 0, total: qty, units: qty }; // obligasi & deposito: nominal
}
export function invest(cat, iid, qty) {
  { const al = ageLock('invest'); if (al) return fail(al, 'age'); }
  const it = instrument(cat, iid); const isFund = cat === 'saham' && INDEX_FUNDS.find(f => f.id === iid);
  if (!(qty > 0)) return fail('Masukkan jumlah yang valid.', 'invalid');
  if (cat === 'saham' && !isFund && !Number.isInteger(qty)) return fail('Saham dibeli per lot (bilangan bulat).', 'invalid');
  if (isFund && qty < it.minBuy) return fail(`Minimal pembelian Rp ${fmt(it.minBuy)}.`, 'invalid');
  if (cat === 'emas' && qty < GOLD.minGram) return fail(`Minimal ${GOLD.minGram} gram.`, 'invalid');
  if ((cat === 'obligasi' || cat === 'deposito') && (qty < it.minBuy || qty % 1_000_000 !== 0)) return fail(`Minimal Rp ${fmt(it.minBuy)}, kelipatan Rp 1.000.000.`, 'invalid');
  if ((cat === 'tanah' || cat === 'properti') && S.invest.holdings.some(h => h.iid === iid && h.status !== 'selesai')) return fail('Aset ini sudah kamu miliki.', 'invalid');
  const q = investBuyQuote(cat, iid, qty);
  if (S.player.balance < q.total) return fail(`Saldo tidak cukup. Dibutuhkan Rp ${fmt(q.total)}, tersedia Rp ${fmt(S.player.balance)}.`, 'funds');
  S.player.balance -= q.total; addTo('expense', 'biaya_investasi', q.fee);
  const inv = S.invest; const d = dayNow();
  let h = (cat === 'saham' || cat === 'emas') ? inv.holdings.find(x => x.iid === iid && x.status === 'aktif') : null;
  if (h) { h.qty += q.units; h.cost += q.total; h.fees += q.fee; }
  else {
    h = { hid: inv.seq++, cat, iid, qty: q.units, cost: q.total, fees: q.fee, buyDay: d, income: 0, ongoingCost: 0, status: 'aktif' };
    if (cat === 'obligasi') { h.maturityDay = d + it.tenorDays; h.rateAtBuy = S.economy.rate; }
    if (cat === 'deposito') h.maturityDay = d + it.tenorDays;
    inv.holdings.push(h);
  }
  addXp(3);
  log('investasi', `Investasi ${it.name || it.location || iid}: Rp ${fmt(q.total)}.`, -q.total);
  return ok('Investasi tercatat. Nilai yang ditampilkan adalah estimasi simulasi sampai direalisasikan.');
}
export function divest(hid, qty) {
  const inv = S.invest, h = inv.holdings.find(x => x.hid === hid); if (!h || h.status !== 'aktif') return fail('Kepemilikan tidak ditemukan.');
  const d = dayNow(), it = instrument(h.cat, h.iid);
  if (h.cat === 'tanah' || h.cat === 'properti') {
    const [a, b] = it.sellDays; h.status = 'proses_jual'; h.saleDay = d + Math.round(a + (b - a) * hrand(S.seed, 'sale', h.hid, d));
    log('investasi', `Memasang ${it.name || 'tanah ' + it.location} untuk dijual. Perkiraan pembeli ditemukan hari ke-${h.saleDay + 1} (simulasi).`);
    return ok(`Aset dipasarkan. Perkiraan laku dalam ${h.saleDay - d} hari simulasi; harga final mengikuti penilaian saat itu.`);
  }
  if (h.cat === 'obligasi' && !it.tradable) {
    if (d - h.buyDay < 180) return fail(`${it.name} tidak dapat diperdagangkan. Pencairan awal baru bisa setelah 180 hari (sisa ${180 - (d - h.buyDay)} hari).`);
  }
  const frac = (h.cat === 'saham' || h.cat === 'emas') ? Math.min(1, (qty ?? h.qty) / h.qty) : 1;
  if (!(frac > 0)) return fail('Jumlah tidak valid.', 'invalid');
  const proceeds = holdingNetSale(inv, h, S.economy, S.seed, d) * frac * (h.cat === 'obligasi' && !it.tradable ? 0.5 : 1);
  const costPart = h.cost * frac * (h.cat === 'obligasi' && !it.tradable ? 0.5 : 1);
  closePart(h, frac * (h.cat === 'obligasi' && !it.tradable ? 0.5 : 1), proceeds, costPart, 'Dijual');
  return ok(`Terjual. Hasil Rp ${fmt(proceeds)} (realisasi P/L Rp ${fmt(proceeds - costPart)}).`);
}
function closePart(h, frac, proceeds, costPart, label) {
  const inv = S.invest; const pl = proceeds - costPart;
  S.player.balance += proceeds;
  addTo(pl >= 0 ? 'income' : 'expense', 'investasi_realized', Math.abs(pl));
  (inv.closed ||= []).unshift({ hid: h.hid, cat: h.cat, iid: h.iid, day: dayNow(), proceeds, cost: costPart, pl, income: h.income * frac, label });
  if (frac >= 0.9999) { h.status = 'selesai'; h.closedDay = dayNow(); }
  else { h.qty *= (1 - frac); h.cost -= costPart; }
  const it = instrument(h.cat, h.iid);
  log('investasi', `${label}: ${it.name || 'Tanah ' + it.location}. Realisasi P/L Rp ${fmt(pl)}.`, proceeds);
}
function investmentEvents(d, monthEnd) {
  const inv = S.invest, eco = S.economy;
  for (const h of inv.holdings) {
    if (h.status === 'selesai') continue;
    const it = instrument(h.cat, h.iid);
    if (h.status === 'proses_jual' && d >= h.saleDay) { const v = holdingNetSale(inv, h, eco, S.seed, d); h.status = 'aktif'; closePart(h, 1, v, h.cost, 'Terjual (pembeli ditemukan)'); continue; }
    if (monthEnd) {
      if (h.cat === 'properti') {
        const p = inv.prop[h.iid]; const rent = it.rentPerUnit * it.units * p.occupancy;
        const cost = p.value * it.maintYear / 12 + rent * it.mgmtFee; const net = Math.round(rent - cost);
        h.income += net; h.ongoingCost += cost; earn(net, 'sewa', `Sewa bersih ${it.name} (okupansi ${Math.round(p.occupancy * 100)}%).`);
      }
      if (h.cat === 'tanah') { const pbb = Math.round(holdingValue(inv, h, eco, S.seed, d) * it.pbbRate / 12); h.ongoingCost += pbb; h.income -= pbb; forceSpend(pbb, 'pbb', 'PBB tanah'); }
      if (h.cat === 'obligasi') {
        const cpn = Math.round(h.qty * it.coupon / 12 * 0.9); h.income += cpn; earn(cpn, 'kupon', `Kupon ${it.name} (setelah pajak 10%).`);
        if (it.id === 'OBK-S1' && !h.downgraded && hrand(S.seed, 'dg', h.hid, d) < 0.02) { h.downgraded = true; log('investasi', `Peringkat ${it.name} turun (simulasi). Harga pasar obligasi melemah.`); }
      }
      const m = monthOf(d);
      if (h.cat === 'saham' && !inv.funds[h.iid] && TR.dividendMonths.includes(m) && it.divYield > 0) {
        const dv = Math.round(h.qty * 100 * inv.stocks[h.iid].price * it.divYield / 4 * 0.9); h.income += dv; earn(dv, 'dividen', `Dividen ${it.id} (setelah pajak 10%).`);
      }
    }
    if ((h.cat === 'obligasi' || h.cat === 'deposito') && d >= h.maturityDay) {
      let proceeds = h.qty;
      if (h.cat === 'deposito') { const interest = h.qty * it.rate * it.tenorDays / 360 * 0.8; h.income += interest; proceeds += interest; }
      closePart(h, 1, proceeds, h.cost, 'Jatuh tempo');
    }
  }
}

// ————————————————————————— BISNIS —————————————————————————
export function businessLocks(cat) {
  const p = S.player, r = [], L = levelInfo().level;
  { const al = ageLock('business'); if (al) r.push(al); }
  if (L < cat.req.level) r.push(`Level karakter minimal ${cat.req.level} (kamu: ${L})`);
  if (p.reputation < cat.req.reputation) r.push(`Reputasi minimal ${cat.req.reputation} (kamu: ${p.reputation.toFixed(1)})`);
  for (const [k, v] of Object.entries(cat.req.skills)) if ((p.skills[k] || 0) < v) r.push(`Skill ${k} minimal ${v} (kamu: ${(p.skills[k] || 0).toFixed(1)})`);
  return r;
}
export function loanEligibility(cat) {
  const days = S.career.job?.daysWorked || 0;
  const eligible = S.player.reputation >= 10 || days >= 30;
  return { eligible, max: Math.floor(cat.capex * 0.5 / 100_000) * 100_000, rate: 0.09, months: 12, reason: eligible ? null : 'Butuh reputasi ≥ 10 atau ≥ 30 hari kerja di pekerjaan aktif.' };
}
export function ownerBusy() { const j = S.career.job ? jobById(S.career.job.jobId) : null; return !!j && j.type === 'full'; }
export function openCost(cat, opts) { return cat.capex + (cat.stockBased ? restockCost(cat, opts.supplier, opts.initialStock || 0) : 0); }
export function openBusiness(typeId, opts) {
  const cat = catalogById(typeId); const locks = businessLocks(cat);
  if (locks.length) return fail('Bisnis masih terkunci: ' + locks.join('; '));
  if (!cat.locations.includes(opts.location)) return fail('Lokasi tidak tersedia untuk bisnis ini.');
  if ((cat.minStaff || 0) > opts.staff) return fail(`Bisnis ini butuh minimal ${cat.minStaff} karyawan.`);
  const total = openCost(cat, opts); const loan = opts.loan || 0;
  if (loan > 0) { const le = loanEligibility(cat); if (!le.eligible) return fail(le.reason); if (loan > le.max) return fail(`Pinjaman maksimal Rp ${fmt(le.max)}.`); }
  if (S.player.balance + loan < total) return fail(`Saldo tidak cukup. Butuh Rp ${fmt(total)}, tersedia Rp ${fmt(S.player.balance + loan)} (termasuk pinjaman).`, 'funds');
  if (loan > 0) { S.player.balance += loan; const mp = Math.ceil(loan * (1 + 0.09) / 12); S.debts.push({ id: S.debtSeq++, kind: 'usaha', name: `Pinjaman usaha — ${cat.name}`, principal: loan, remaining: loan, rateYear: 0.09, monthlyPay: mp, startDay: dayNow() }); log('utang', `Pinjaman usaha Rp ${fmt(loan)} (9%/thn, 12 bulan).`, loan); }
  S.player.balance -= total; addTo('expense', 'modal_bisnis', total);
  const bid = S.bizSeq++;
  const b = { bid, fit: conceptFit(cat, hnorm(S.seed, 'fit', bid, typeId, opts.location)), typeId, location: opts.location, openedDay: dayNow(), price: opts.price, staff: opts.staff, marketingDaily: opts.marketingDaily, supplier: opts.supplier, stock: cat.stockBased ? opts.initialStock : 0, stockValue: cat.stockBased ? restockCost(cat, opts.supplier, opts.initialStock) : 0, pending: [], rating: 3, capacityMult: 1, upgrades: [], history: [], cumProfit: 0, invested: total, autoRestock: null, status: 'buka' };
  S.businesses.push(b); addXp(20); rep(1);
  log('bisnis', `Membuka ${cat.name} di ${LOCATIONS[opts.location].name}.`, -total);
  return ok(`${cat.name} dibuka. Operasional pertama dihitung di akhir hari simulasi.`, b);
}
const bizOf = bid => S.businesses.find(b => b.bid === bid);
export function setBizParam(bid, key, val) {
  const b = bizOf(bid); const cat = catalogById(b.typeId);
  if (key === 'price') { if (!(val > 0)) return fail('Harga tidak valid.', 'invalid'); b.price = Math.round(val); return ok('Harga diperbarui.'); }
  if (key === 'marketingDaily') { if (!(val >= 0)) return fail('Anggaran tidak valid.', 'invalid'); b.marketingDaily = Math.round(val); return ok('Anggaran pemasaran diperbarui.'); }
  if (key === 'staff') {
    if (val < (cat.minStaff || 0)) return fail(`Minimal ${cat.minStaff} karyawan agar bisa beroperasi.`);
    if (val > cat.maxStaff) return fail(`Maksimal ${cat.maxStaff} karyawan untuk skala ini.`);
    const diff = val - b.staff; b.staff = val; log('bisnis', `${diff > 0 ? 'Merekrut' : 'Mengurangi'} ${Math.abs(diff)} karyawan di ${cat.name}.`); return ok('Jumlah karyawan diperbarui.');
  }
  if (key === 'supplier') { b.supplier = val; return ok('Pemasok diganti.'); }
  if (key === 'autoRestock') { b.autoRestock = val; return ok(val ? 'Restock otomatis aktif.' : 'Restock otomatis nonaktif.'); }
}
export function restock(bid, qty, supplierId) {
  const b = bizOf(bid), cat = catalogById(b.typeId);
  if (!(qty > 0) || !Number.isInteger(qty)) return fail('Jumlah stok harus bilangan bulat > 0.', 'invalid');
  const cost = restockCost(cat, supplierId, qty);
  if (!spend(cost, 'stok_bisnis')) return fail(`Saldo tidak cukup. Butuh Rp ${fmt(cost)}.`, 'funds');
  const lt = leadTime(S.seed, b, supplierId, dayNow());
  b.pending.push({ qty, cost, arriveDay: dayNow() + lt, supplier: supplierId });
  log('bisnis', `Pesan ${qty} ${cat.unit} stok ${cat.name} dari ${SUPPLIERS[supplierId].name} (tiba ±${lt} hari).`, -cost);
  return ok(`Pesanan stok dibuat. Estimasi tiba ${lt} hari simulasi.`);
}
export function upgradeBiz(bid, upId) {
  const b = bizOf(bid), cat = catalogById(b.typeId); const up = cat.upgrades.find(u => u.id === upId);
  if (b.upgrades.includes(upId)) return fail('Sudah dipasang.');
  if (!spend(up.cost, 'ekspansi')) return fail(`Saldo tidak cukup. Butuh Rp ${fmt(up.cost)}.`, 'funds');
  b.upgrades.push(upId); b.capacityMult *= up.capacityMult; b.invested += up.cost;
  log('bisnis', `Ekspansi ${cat.name}: ${up.name}.`, -up.cost); return ok('Ekspansi selesai. Kapasitas meningkat mulai besok.');
}
export function closeBiz(bid) {
  const b = bizOf(bid), cat = catalogById(b.typeId);
  const salvage = Math.round(bizValue(b));
  S.player.balance += salvage; b.status = 'tutup'; b.closedDay = dayNow(); rep(-3);
  log('bisnis', `Menutup ${cat.name}. Aset dijual Rp ${fmt(salvage)}.`, salvage);
  return ok(`Bisnis ditutup. Nilai sisa Rp ${fmt(salvage)} masuk ke saldo.`);
}
export const bizValue = b => { const cat = catalogById(b.typeId); const up = cat.upgrades.filter(u => b.upgrades.includes(u.id)).reduce((s, u) => s + u.cost, 0); return (cat.capex + up) * 0.4 + b.stockValue; };
export function runFeasibility(typeId, loc, opts) { return feasibility(S.seed, typeId, loc, opts, S.economy, ownerBusy()); }

function businessDay(d) {
  const wd = weekdayOf(d), busy = ownerBusy();
  for (const b of S.businesses) {
    if (b.status !== 'buka') continue;
    const cat = catalogById(b.typeId);
    const rec = simulateBusinessDay(b, S.economy, S.seed, d, wd, busy);
    if (rec.profit >= 0) earn(Math.round(rec.profit), 'bisnis'); else forceSpend(Math.round(-rec.profit), 'bisnis_rugi', `operasional ${cat.name}`);
    addXp(4 + (rec.profit > 0 ? 2 : 0)); if (b.rating >= 4) rep(0.08);
    if (rec.lost > rec.sold * 0.3 && rec.demand > 1) log('bisnis', `${cat.name}: ${rec.lost} ${cat.unit} permintaan tidak terlayani (${cat.stockBased && b.stock < 1 ? 'stok habis' : 'kapasitas penuh'}).`);
    if (b._autoOrder) { const qty = b._autoOrder; b._autoOrder = null; const r = restock(b.bid, qty, b.supplier); if (!r.ok) log('bisnis', `Restock otomatis ${cat.name} gagal: ${r.error}`); }
  }
}

// ————————————————————————— UTANG —————————————————————————
function debtsMonth(d) {
  for (const debt of S.debts) {
    if (debt.remaining <= 0) continue;
    const interest = debt.remaining * debt.rateYear / 12;
    const pay = Math.min(debt.monthlyPay, debt.remaining + interest);
    if (S.player.balance >= pay) { S.player.balance -= pay; addTo('expense', 'cicilan', pay); debt.remaining = debt.remaining + interest - pay; log('utang', `Cicilan ${debt.name}.`, -pay); }
    else { debt.remaining += interest * 1.5; rep(-2); log('utang', `Cicilan ${debt.name} gagal dibayar — denda & reputasi turun.`); }
    if (debt.remaining < 1) debt.remaining = 0;
  }
  S.debts = S.debts.filter(x => x.remaining > 0);
}
export function repayDebt(id, amount) {
  const d = S.debts.find(x => x.id === id); if (!d) return fail('Utang tidak ditemukan.');
  const a = Math.min(amount, d.remaining); if (!spend(a, 'cicilan')) return fail('Saldo tidak cukup.', 'funds');
  d.remaining -= a; if (d.remaining < 1) S.debts = S.debts.filter(x => x.id !== id); log('utang', `Pelunasan ${d.name}.`, -a); return ok('Pembayaran utang tercatat.');
}

// ————————————————————————— agregat —————————————————————————
export function tradingValue() {
  let v = 0, cost = 0; for (const [sym, p] of Object.entries(S.trading.positions)) { if (p.units > 0) { v += p.units * currentQuote(S.market, sym); cost += p.units * p.avgCost; } }
  return { value: v, cost };
}
export function investValue() {
  let v = 0, cost = 0; for (const h of S.invest.holdings) if (h.status !== 'selesai') { v += holdingValue(S.invest, h, S.economy, S.seed, dayNow()); cost += h.cost; }
  return { value: v, cost };
}
export function netWorth() {
  const cash = S.player.balance, tr = tradingValue().value, iv = investValue().value;
  const bz = S.businesses.filter(b => b.status === 'buka').reduce((s, b) => s + bizValue(b), 0);
  const fa = FINV?.accounts || [];
  const bank = fa.filter(a => a.kind === 'bank').reduce((s, a) => s + a.balance, 0), wallets = fa.filter(a => a.kind === 'wallet').reduce((s, a) => s + a.balance, 0);
  const credit = fa.filter(a => a.kind === 'credit').reduce((s, a) => s + a.balance, 0);
  const debts = S.debts.reduce((s, d) => s + d.remaining, 0) + credit;
  const totalAssets = cash + bank + wallets + tr + iv + bz;
  return { cash, bank, wallets, credit, trading: tr, invest: iv, business: bz, debts, totalAssets, net: totalAssets - debts };
}

// ————————————————————————— util —————————————————————————
const ok = (msg, data) => { save(); emit('change'); return { ok: true, msg, data }; };
const fail = (error, code = 'error') => ({ ok: false, error, code });
export const fmt = n => Math.round(n).toLocaleString('id-ID');
export function fmtQty(a, units) { return a.class === 'saham' ? `${Math.round(units / a.lot).toLocaleString('id-ID')} lot` : `${(+units).toLocaleString('id-ID', { maximumFractionDigits: 4 })} ${a.unit}`; }
export { NE };
export { MARKET_ASSETS, JOB_CATALOG, BUSINESS_CATALOG, LOCATIONS, SUPPLIERS, EVALUATIONS, YOUTUBE, INVEST_STOCKS, INDEX_FUNDS, GOLD, LAND_PLOTS, RENTAL_PROPERTIES, BONDS, DEPOSITS, LAND_COSTS, T as TICKS_PER_DAY, currentQuote, holdingValue, holdingNetSale, instrument, bondPricePct, capacityOf, catalogById };

NE.attach(() => ({
  S, g: () => S.clock.g, day: dayNow, sec: secOfDay, abs: nowSec, schedule: scheduleOf, liveOn: () => !!S.creator?.live, stale: () => stale,
  log, emit, save, ageYears: () => ageYears() ?? 0, finQueue, advance: s => { advanceSeconds(s); emit('tick', { g: S.clock.g }); emit('change'); },
}));
const activityAt = g => { const a = S.life?.activity; if (!a) return false; const t0 = (g - G0) * CAL.SEC_PER_TICK; return a.startAbs < t0 + CAL.SEC_PER_TICK && a.endAbs > t0; };
CR.attach(() => ({ activityAt,
  S, seed: S.seed, g: S.clock.g, day: dayNow(), age: creatorAge, energy, setEnergy: v => { S.player.energy = clamp(v, 0, 100); },
  schedule: scheduleOf, weeklyFree: () => weeklyHours().free, weeklyBudget: () => { const w = weeklyHours(); return w.budget - w.job - w.school; },
  earn, spend, forceSpend, log, addXp, emit, save, restartClock: start,
}));

// ————————————————————————— boot —————————————————————————
/** Muat profil & simpanan dari server. Jika belum ada karakter, `createCharacter()` dipanggil (onboarding). */
function migrate() {
  S.clock.sub ||= 0; if (S.player.energy == null) S.player.energy = 100;
  // Jam versi lama hanya menyimpan menit di dalam tick; detik dimulai dari menit tersebut.
  if (S.clock.sec == null) S.clock.sec = S.clock.sub * 60;
  if (!CAL.SPEEDS.some(x => x.rate === S.settings.rate)) S.settings.rate = CAL.SPEEDS.find(x => x.rate === CAL.DEFAULT_RATE * (S.settings.speed || 1))?.rate || CAL.DEFAULT_RATE;
  if (!S.creator) CR.initCreator(S);
  NE.initLife(S); S.fin ||= { outbox: [], payroll: null }; S.fin.outbox ||= []; S.finSeq ||= 0; S.shopSeq ||= 0;
  if (S.youtube) CR.migrateLegacyYoutube(S, dayNow());
}
export async function boot({ createCharacter }) {
  let st = await get('/api/state');
  if (!st.ok) throw new Error(st.error || 'Server tidak merespons.');
  if (!st.profile) { st = await createCharacter(st); await newGameFor(st); }
  else if (st.game && st.game.version === VERSION && st.game.charId === st.charId) { S = st.game; P = st.profile; setEdu(st); migrate(); }
  else { await newGameFor(st); }
  await syncEducation();
  start();
  window.addEventListener('pagehide', () => { if (dirty) flush(true); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && dirty) flush(true); });
  return S;
}

