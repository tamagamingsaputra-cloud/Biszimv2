// BizSim 7.4.0: simulation clock (jam/menit/detik), aturan kalender, kebutuhan karakter, dan aksi hidup. State: s.v740. SIMULATION ONLY.
// Semua modul membaca waktu dari satu sumber: s.day (hari) + s.v740.clock.tod (detik sejak 00:00). Hari berganti lewat DAY_HOOKS yang sudah ada.
import { DAY_HOOKS } from './v700-engine.mjs';
export const STEP_HOOKS = [];   // modul lain (mis. Education 7.5.0) dapat menambah/mengubah laju per langkah jam: (s, x, detik, konteks, laju, needs)
export const VERSION = '7.4.0';

/* ====================== ATURAN WAKTU & KALENDER (eksplisit, fiktif, tidak mengikuti tanggal dunia nyata) ====================== */
export const CAL = {
  secPerDay: 86400,
  daysPerMonth: 30,
  monthsPerYear: 12,
  daysPerYear: 360,          // tidak ada tahun kabisat
  leap: false,
  firstWeekday: 1,           // Hari ke-1 = Senin (0 = Minggu ... 6 = Sabtu)
  simSecPerRealSec: 60,      // 1x: 1 detik nyata = 1 menit simulasi (1 jam game = 1 menit nyata, 1 hari = 24 menit nyata)
  speeds: [1, 2, 4],
  startTod: 7 * 3600,        // pemain baru mulai pukul 07:00:00
  workStart: 8 * 3600, workEnd: 17 * 3600, lunchStart: 12 * 3600, lunchEnd: 13 * 3600,   // kerja Senin-Jumat
  studyStart: 19 * 3600, studyEnd: 21 * 3600,                                              // sesi belajar Senin-Kamis (bila ada kursus/program aktif)
  maxSyncSec: 3600
};
export const WEEKDAYS = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
export const weekdayOf = day => (Math.max(1, day) - 1 + CAL.firstWeekday) % 7;
export const dateOf = day => { const i = Math.max(0, (day || 1) - 1), m = Math.floor(i / CAL.daysPerMonth); return { day, year: Math.floor(m / CAL.monthsPerYear) + 1, month: (m % CAL.monthsPerYear) + 1, date: (i % CAL.daysPerMonth) + 1, weekday: weekdayOf(day) }; };
export const dayOfDate = (year, month, date) => ((year - 1) * CAL.monthsPerYear + (month - 1)) * CAL.daysPerMonth + date;
export const hms = tod => { const t = Math.max(0, Math.min(CAL.secPerDay, Math.floor(tod))); return { h: Math.floor(t / 3600) % 24, m: Math.floor(t / 60) % 60, s: t % 60 }; };
const p2 = n => String(n).padStart(2, '0');
export const clockText = (tod, withSec = true) => { const t = hms(tod); return withSec ? `${p2(t.h)}:${p2(t.m)}:${p2(t.s)}` : `${p2(t.h)}:${p2(t.m)}`; };
export const fullText = (day, tod) => { const d = dateOf(day); return `Tahun ${d.year} · Bulan ${d.month} · Tanggal ${d.date} · ${clockText(tod)}`; };
export const shortText = day => { const d = dateOf(day); return `Tahun ${d.year} · Bulan ${d.month} · Tgl ${d.date}`; };
const rp = n => 'Rp' + Math.round(n || 0).toLocaleString('id-ID');
const clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const r1 = v => Math.round(v * 10) / 10;

/* ====================== KEBUTUHAN KARAKTER ====================== */
export const KEYS = ['hunger', 'thirst', 'energy', 'hygiene', 'health', 'mood', 'stress', 'bladder'];
// Nilai 0-100. Semua "makin tinggi makin baik" KECUALI stress (makin rendah makin baik). Bladder = kenyamanan kandung kemih (rendah = ingin ke toilet).
export const META = {
  hunger: { label: 'Hunger', id: 'Kenyang', desc: 'Kebutuhan makan', decay: -4.2, low: 'Stamina turun dan kesehatan terancam bila mendekati 0.', fix: 'Makan (butuh uang dan waktu).' },
  thirst: { label: 'Thirst', id: 'Hidrasi', desc: 'Kebutuhan minum', decay: -5.5, low: 'Fokus dan kesehatan turun; paling cepat habis.', fix: 'Minum air atau minuman lain.' },
  energy: { label: 'Energy', id: 'Energi', desc: 'Tenaga untuk beraktivitas', decay: -3.6, low: 'Kinerja kerja turun (potongan gaji); di 0 karakter pingsan tertidur.', fix: 'Tidur memulihkan energi; istirahat dan kopi membantu sedikit.' },
  hygiene: { label: 'Hygiene', id: 'Kebersihan', desc: 'Kebersihan badan', decay: -2.0, low: 'Mood turun dan risiko kesehatan naik.', fix: 'Mandi.' },
  health: { label: 'Health', id: 'Kesehatan', desc: 'Kondisi fisik', decay: 0, low: 'Kinerja turun; di 0 karakter dirawat di IGD (biaya besar).', fix: 'Pulih pelan bila kebutuhan lain terpenuhi; berobat mempercepat.' },
  mood: { label: 'Mood', id: 'Suasana hati', desc: 'Suasana hati', decay: 0, low: 'Kinerja kerja turun dan stres naik.', fix: 'Penuhi kebutuhan dasar, kurangi stres, makan enak.' },
  stress: { label: 'Stress', id: 'Stres', desc: 'Tekanan mental', decay: 0, low: 'Stres tinggi menurunkan mood dan kinerja.', fix: 'Istirahat, tidur, makan enak; hindari kebutuhan yang kritis.' },
  bladder: { label: 'Bladder', id: 'Toilet', desc: 'Kebutuhan toilet', decay: -6.5, low: 'Mood turun; di 0 terjadi kecelakaan (kebersihan dan mood anjlok).', fix: 'Pergi ke toilet. Minum membuat kandung kemih cepat penuh.' }
};
export const levelOf = (k, v) => k === 'stress' ? (v >= 70 ? 'critical' : v >= 45 ? 'low' : 'ok') : (v < 30 ? 'critical' : v < 60 ? 'low' : 'ok');
export const perfOf = n => { const f = (v, t) => Math.max(0, (t - v) / t); return clamp(1 - .35 * f(n.energy, 40) - .2 * f(n.mood, 50) - .25 * Math.max(0, (n.stress - 50) / 50) - .3 * f(n.health, 40) - .1 * f(n.hunger, 40) - .05 * f(n.thirst, 40), .35, 1); };

/* ====================== KATALOG AKSI ====================== */
const H = (a, b) => [a * 3600, b * 3600];
export const FOOD = [
  { id: 'homestock', n: 'Makan seadanya (stok rumah)', venue: 'Rumah', price: 0, min: 15, gain: { hunger: 28, mood: -2 }, hours: H(0, 24), daily: 2, note: 'Gratis, maksimal 2x sehari' },
  { id: 'cook', n: 'Masak di rumah', venue: 'Rumah', price: 22000, min: 40, gain: { hunger: 55, mood: 3 }, hours: H(0, 24) },
  { id: 'warteg', n: 'Nasi warteg', venue: 'Warteg', price: 15000, min: 20, gain: { hunger: 38, thirst: 4 }, hours: H(6, 21) },
  { id: 'bread', n: 'Roti dan susu', venue: 'Minimarket', price: 18000, min: 5, gain: { hunger: 22, thirst: 8 }, hours: H(0, 24) },
  { id: 'resto', n: 'Makan di restoran', venue: 'Restoran', price: 65000, min: 45, gain: { hunger: 62, thirst: 10, mood: 10, stress: -4 }, hours: H(10, 22) }
];
export const DRINK = [
  { id: 'tap', n: 'Air galon rumah', venue: 'Rumah', price: 0, min: 2, gain: { thirst: 20, bladder: -3 }, hours: H(0, 24) },
  { id: 'water', n: 'Air mineral', venue: 'Minimarket', price: 5000, min: 2, gain: { thirst: 30, bladder: -4 }, hours: H(0, 24) },
  { id: 'tea', n: 'Teh manis', venue: 'Warteg', price: 8000, min: 5, gain: { thirst: 22, mood: 2, bladder: -4 }, hours: H(6, 21) },
  { id: 'coffee', n: 'Kopi di kafe', venue: 'Kafe', price: 22000, min: 15, gain: { thirst: 14, energy: 9, mood: 5, stress: -2, bladder: -5 }, hours: H(7, 23) }
];
export const SLEEP = [
  { id: 'rest30', n: 'Istirahat santai 30 menit', min: 30, gain: { energy: 5, stress: -6, mood: 2 }, kind: 'rest', need: { stressOrEnergy: true } },
  { id: 'nap60', n: 'Tidur siang 1 jam', min: 60, gain: { energy: 14, stress: -5 }, kind: 'nap', need: { energyBelow: 85 } },
  { id: 'sleep4', n: 'Tidur 4 jam', min: 240, gain: {}, kind: 'sleep', need: { energyBelow: 90 } },
  { id: 'sleep6', n: 'Tidur 6 jam', min: 360, gain: {}, kind: 'sleep', need: { energyBelow: 90 } },
  { id: 'sleep8', n: 'Tidur malam 8 jam', min: 480, gain: {}, kind: 'sleep', need: { energyBelow: 90 } }
];
export const CARE = [
  { id: 'bath', n: 'Mandi', venue: 'Rumah', price: 0, min: 15, gain: { hygiene: 90, mood: 4, stress: -2 }, hours: H(0, 24), kind: 'care', need: { hygieneBelow: 85 } },
  { id: 'toilet', n: 'Ke toilet', venue: 'Rumah', price: 0, min: 5, gain: { bladder: 100 }, hours: H(0, 24), kind: 'care', need: { bladderBelow: 80 } },
  { id: 'puskesmas', n: 'Berobat ke puskesmas', venue: 'Puskesmas', price: 15000, min: 120, gain: { health: 20, stress: 2 }, hours: H(8, 14), kind: 'care', need: { healthBelow: 85 } },
  { id: 'klinik', n: 'Berobat ke klinik', venue: 'Klinik', price: 150000, min: 60, gain: { health: 45 }, hours: H(8, 20), kind: 'care', need: { healthBelow: 85 } },
  { id: 'igd', n: 'Rumah sakit (IGD)', venue: 'IGD', price: 600000, min: 90, gain: { health: 80, stress: -3 }, hours: H(0, 24), kind: 'care', need: { healthBelow: 85 } }
];
export const DELIVERY = [
  { id: 'geprek', n: 'Nasi ayam geprek', venue: 'Delivery', price: 32000, gain: { hunger: 48, mood: 5 } },
  { id: 'ramen', n: 'Ramen', venue: 'Delivery', price: 48000, gain: { hunger: 55, thirst: 5, mood: 6 } },
  { id: 'cafe', n: 'Kopi dan roti', venue: 'Delivery', price: 35000, gain: { hunger: 22, thirst: 12, energy: 6, bladder: -4 } }
];
export const DELIVERY_FEE = 12000, DELIVERY_RUSH_FEE = 5000, DELIVERY_HOURS = H(7, 22), DELIVERY_MAX = 2;
export const COMMUTE = {
  walk: { n: 'Jalan kaki', cost: 0, energy: 5, hygiene: 6, note: 'Gratis, tetapi menguras energi dan kebersihan.' },
  angkot: { n: 'Angkot / bus', cost: 12000, energy: 3, hygiene: 4, note: 'Murah, cukup nyaman.' },
  ojek: { n: 'Ojek online', cost: 40000, energy: 1, hygiene: 1.5, note: 'Mahal, hemat energi.' }
};

/* ====================== STATE ====================== */
export function ensure740(s, initDay) {
  if (!s.v740) {
    s.v740 = {
      version: VERSION, day: initDay || s.day || 1, nid: 0,
      clock: { tod: CAL.startTod, speed: 1, paused: false },
      needs: { hunger: 82, thirst: 78, energy: 85, hygiene: 88, health: 96, mood: 72, stress: 22, bladder: 70 },
      act: null, orders: [], commute: 'walk', warn: {}, home: { day: 0, n: 0 },
      dayStat: { sched: 0, work: 0, perf: 0, autoCost: 0 }, log: [], hist: []
    };
  }
  const x = s.v740; x.version = VERSION; x.log ||= []; x.hist ||= []; x.orders ||= []; x.warn ||= {}; x.home ||= { day: 0, n: 0 }; x.dayStat ||= { sched: 0, work: 0, perf: 0 };
  if (!x.commute || !COMMUTE[x.commute]) x.commute = 'walk';
  return x;
}
const absOf = x => (x.day - 1) * CAL.secPerDay + x.clock.tod;
const logIt = (x, kind, title, sub = '') => { x.nid = (x.nid || 0) + 1; x.log.unshift({ id: x.nid, day: x.day, tod: Math.round(x.clock.tod), kind, title, sub }); if (x.log.length > 80) x.log.length = 80; };
const notice = (h, s, title, msg, type = 'info') => { try { h?.addNotice?.(s, title, msg, type); } catch { } };
const studyActive = s => Boolean((s.v720?.lessons || []).length || s.v655?.programs?.education || s.v655?.programs?.training);

/* konteks waktu: apa yang sedang dijadwalkan pada hari/jam tertentu */
export function ctxOf(s, x, day, tod) {
  const wd = weekdayOf(day), employed = s.career?.status === 'employed', weekday = wd >= 1 && wd <= 5;
  const inShift = employed && weekday && tod >= CAL.workStart && tod < CAL.workEnd && !(tod >= CAL.lunchStart && tod < CAL.lunchEnd);
  const lunch = employed && weekday && tod >= CAL.lunchStart && tod < CAL.lunchEnd;
  const act = x.act, sleeping = Boolean(act && act.kind === 'sleep');
  return { wd, employed, weekday, sched: inShift, lunch, work: inShift && !act, studying: studyActive(s) && wd >= 1 && wd <= 4 && tod >= CAL.studyStart && tod < CAL.studyEnd && !act, act, sleeping, resting: Boolean(act && ['sleep', 'rest', 'nap'].includes(act.kind)) };
}

/* laju perubahan per jam simulasi pada kondisi sekarang (decay rate, ambang, dan pemulihan didefinisikan di sini) */
export function ratesOf(n, c, mode) {
  const sl = c.sleeping, cm = COMMUTE[mode] || COMMUTE.walk, r = {};
  r.hunger = (sl ? -2.0 : -4.2) * (c.work ? 1.15 : 1);
  r.thirst = (sl ? -2.5 : -5.5) * (c.work ? 1.1 : 1);
  r.energy = sl ? 12.5 * ((n.hunger < 15 || n.thirst < 15) ? .6 : 1) : (-3.6 - (c.work ? 1.8 + cm.energy / 8 : 0) - (c.studying ? .8 : 0) - (n.health < 30 ? 1.3 : 0));
  r.hygiene = (sl ? -.5 : -2.0) - (c.work ? .8 + cm.hygiene / 8 : 0);
  r.bladder = sl ? -3 : -6.5;
  const crit = ['hunger', 'thirst', 'energy', 'hygiene'].filter(k => n[k] < 12).length;
  r.health = -1.6 * crit - (n.hygiene < 25 ? .3 : 0) + (crit === 0 && n.hunger > 50 && n.thirst > 50 && n.energy > 35 && n.hygiene > 40 ? .5 : 0) + (sl && crit === 0 ? .3 : 0);
  const avg = (n.hunger + n.thirst + n.energy + n.hygiene + n.bladder) / 5, target = .5 * avg + .3 * (100 - n.stress) + .2 * n.health;
  r.mood = (target - n.mood) * .08;
  const pressing = ['hunger', 'thirst', 'energy', 'hygiene', 'bladder'].filter(k => n[k] < 25).length;
  r.stress = sl ? -3.5 : (.25 + (c.work ? 1.1 : 0) + (c.studying ? .6 : 0) + .9 * pressing + (n.health < 30 ? 1 : 0) - .035 * (n.mood - 50) - (c.act && ['rest', 'nap'].includes(c.act.kind) ? 2 : 0));
  return r;
}

/* ====================== MESIN WAKTU ====================== */
function applyGain(n, gain, f) { for (const [k, g] of Object.entries(gain || {})) n[k] = clamp(n[k] + g * f); }
function deliverOrder(s, x, o, h) {
  applyGain(x.needs, o.gain, 1); x.orders = x.orders.filter(q => q !== o);
  logIt(x, 'delivery', `Pesanan tiba: ${o.n}`, 'Langsung disantap.'); notice(h, s, 'Pesanan tiba', `${o.n} sudah sampai dan dimakan.`, 'success');
}
export function step(s, x, dt, h) {
  let left = Math.max(0, Math.min(dt, CAL.secPerDay - x.clock.tod));
  while (left > 0) {
    if (x.auto && !x.act) autoCare(s, x);
    const ch = Math.min(left, 600), n = x.needs, c = ctxOf(s, x, x.day, x.clock.tod), r = ratesOf(n, c, x.commute), hrs = ch / 3600;
    for (const f of STEP_HOOKS) { try { f(s, x, ch, c, r, n); } catch { } }
    for (const k of KEYS) n[k] = clamp(n[k] + r[k] * hrs);
    if (c.act) { const a = c.act, used = Math.min(ch, a.rem), f = a.total ? used / a.total : 0; applyGain(n, a.gain, f); a.rem -= used; }
    const perf = perfOf(n);
    if (c.sched) { x.dayStat.sched += ch; if (c.work) { x.dayStat.work += ch; x.dayStat.perf += perf * ch; } }
    x.clock.tod += ch; left -= ch;
    if (x.act && x.act.rem <= 0.5) { logIt(x, 'activity', `Selesai: ${x.act.label}`); if (x.act.forced) notice(h, s, 'Terbangun', 'Karakter terbangun setelah tertidur karena kelelahan.', 'info'); x.act = null; }
    for (const o of [...x.orders]) if (absOf(x) >= o.arrive) { if (x.act && x.act.kind === 'sleep') { if (o.status !== 'waiting') { o.status = 'waiting'; logIt(x, 'delivery', `${o.n} menunggu di depan pintu`, 'Karakter sedang tidur.'); } } else deliverOrder(s, x, o, h); }
    events(s, x, h);
  }
}
function events(s, x, h) {
  const n = x.needs, abs = absOf(x);
  if (n.bladder <= 0) { n.bladder = 55; n.hygiene = clamp(n.hygiene - 25); n.mood = clamp(n.mood - 12); logIt(x, 'need', 'Kecelakaan toilet', 'Kebersihan dan mood turun.'); notice(h, s, 'Kecelakaan toilet', 'Kandung kemih penuh terlalu lama. Kebersihan dan mood turun.', 'danger'); }
  if (n.health <= 0) {
    const fee = Math.min(Math.max(0, s.cash || 0), 600000); s.cash = (s.cash || 0) - fee; n.health = 25; n.mood = clamp(n.mood - 10);
    x.act = { kind: 'care', label: 'Dirawat di IGD', total: 6 * 3600, rem: 6 * 3600, gain: { health: 45 }, forced: true };
    logIt(x, 'need', 'Dirawat darurat di IGD', `Biaya ${rp(fee)}.`); notice(h, s, 'Dirawat di IGD', `Kesehatan mencapai 0. Biaya perawatan ${rp(fee)}.`, 'danger');
  } else if (n.energy <= 2 && !(x.act && x.act.kind === 'sleep')) {
    x.act = { kind: 'sleep', label: 'Tertidur karena kelelahan', total: 3 * 3600, rem: 3 * 3600, gain: { health: -3, mood: -4 }, forced: true };
    logIt(x, 'need', 'Pingsan karena kelelahan', 'Tertidur 3 jam.'); notice(h, s, 'Pingsan kelelahan', 'Energi habis. Karakter tertidur 3 jam di tempat.', 'danger');
  }
  for (const k of KEYS) {
    const lv = levelOf(k, n[k]), w = x.warn[k];
    if (lv === 'critical') { if (w == null || abs - w > 6 * 3600) { x.warn[k] = abs; const m = META[k]; logIt(x, 'need', `${m.label} kritis (${Math.round(n[k])}%)`, m.low); if (k !== 'bladder' || n[k] < 15) notice(h, s, `${m.label} kritis`, `${m.id} ${Math.round(n[k])}%. ${m.low}`, 'warning'); } }
    else if (lv === 'ok' && w != null) delete x.warn[k];
  }
}
/* pergantian hari: sisa waktu hari lama dijalankan penuh, lalu penyelesaian harian (kinerja, absen, ongkos perjalanan) */
export function rollDay(s, x, newDay, h) {
  const rem = CAL.secPerDay - x.clock.tod; x.auto = rem >= 3600;   // hari dilewati (Simulate Day): sisa hari memakai rutinitas otomatis
  try { step(s, x, rem, h); } finally { x.auto = false; }
  if (x.dayStat.autoCost > 0) { logIt(x, 'auto', `Rutinitas otomatis ${rp(x.dayStat.autoCost)}`, 'Makan, minum, mandi, dan tidur saat hari dilewati.'); }
  const ds = x.dayStat, emp = s.career?.status === 'employed', sal = Number(s.career?.salary) || 0, daily = sal / 30;
  if (emp && ds.sched > 0) {
    const attend = ds.work / ds.sched, avg = ds.work ? ds.perf / ds.work : 0, eff = attend * avg;
    let penalty = 0;
    if (eff < .9) penalty = Math.round(daily * (1 - eff) * .7);
    penalty = Math.min(penalty, Math.max(0, Math.round(s.cash || 0)));
    if (penalty > 0) { s.cash -= penalty; const why = attend < .7 ? 'absen dari jam kerja' : 'kinerja menurun'; logIt(x, 'work', `Potongan gaji ${rp(penalty)}`, `Hari ${x.day}: ${why} (kehadiran ${Math.round(attend * 100)}%, kinerja ${Math.round(avg * 100)}%).`); notice(h, s, 'Potongan gaji', `${rp(penalty)} dipotong: ${why}.`, 'warning'); }
    let cost = 0; const cm = COMMUTE[x.commute] || COMMUTE.walk;
    if (ds.work > 0 && cm.cost > 0) { if ((s.cash || 0) >= cm.cost) { s.cash -= cm.cost; cost = cm.cost; logIt(x, 'work', `Ongkos perjalanan ${rp(cost)}`, cm.n); } else { x.commute = 'walk'; logIt(x, 'work', 'Ongkos perjalanan tidak cukup', 'Kembali ke jalan kaki.'); notice(h, s, 'Transport diubah', 'Uang tidak cukup untuk ongkos. Perjalanan kembali ke jalan kaki.', 'warning'); } }
    x.hist.unshift({ day: x.day, sched: ds.sched, work: ds.work, perf: Math.round(avg * 100), penalty, commute: cost }); if (x.hist.length > 30) x.hist.length = 30;
  }
  x.dayStat = { sched: 0, work: 0, perf: 0, autoCost: 0 }; x.day = newDay; x.clock.tod = 0;
}
DAY_HOOKS.push((s, v, d, userId, h) => { const x = s.v740 ? ensure740(s) : ensure740(s, d - 1); let guard = 0; while (x.day < d && guard++ < 400) rollDay(s, x, x.day + 1, h); });

/* ====================== ATURAN AKSI (ketersediaan + alasan) ====================== */
const isOpen = (it, tod) => !it.hours || (tod >= it.hours[0] && tod < it.hours[1]);
const hoursText = it => it.hours ? (it.hours[0] === 0 && it.hours[1] === 86400 ? '24 jam' : `${clockText(it.hours[0], false)}-${clockText(it.hours[1], false)}`) : '';
const busy = (x, c) => c.act ? (c.sleeping ? 'Sedang tidur. Bangun dulu.' : `Sedang ${String(c.act.label).toLowerCase()}, selesai ±${clockText(x.clock.tod + c.act.rem, false)}.`) : null;
const workBlock = c => c.sched ? `Sedang jam kerja (${clockText(CAL.workStart, false)}-${clockText(CAL.workEnd, false)}). Istirahat ${clockText(CAL.lunchStart, false)}-${clockText(CAL.lunchEnd, false)}.` : null;
function gate(s, x, it, kind) {
  const c = ctxOf(s, x, x.day, x.clock.tod), n = x.needs, tod = x.clock.tod;
  const b = busy(x, c); if (b) return b;
  if (kind === 'eat') {
    if (!isOpen(it, tod)) return `${it.venue} tutup (buka ${hoursText(it)}).`;
    if (it.daily && x.home.day === x.day && x.home.n >= it.daily) return `Stok rumah habis hari ini (maks ${it.daily}x).`;
    const w = workBlock(c); if (w) return w;
    if (n.hunger >= 92) return `Masih kenyang (${Math.round(n.hunger)}%).`;
  } else if (kind === 'drink') {
    if (!isOpen(it, tod)) return `${it.venue} tutup (buka ${hoursText(it)}).`;
    if (n.thirst >= 95) return `Tidak haus (${Math.round(n.thirst)}%).`;
    if (c.sched && it.id === 'coffee') return workBlock(c);
  } else if (kind === 'sleep') {
    const w = workBlock(c); if (w) return w;
    if (it.need.energyBelow && n.energy >= it.need.energyBelow) return `Belum mengantuk (energi ${Math.round(n.energy)}%).`;
    if (it.need.stressOrEnergy && n.energy >= 95 && n.stress <= 20) return 'Sudah segar dan tenang.';
  } else if (kind === 'care') {
    if (!isOpen(it, tod)) return `${it.venue} tutup (buka ${hoursText(it)}).`;
    const w = workBlock(c); if (w && !['toilet'].includes(it.id)) return w;
    const nd = it.need || {};
    if (nd.hygieneBelow && n.hygiene >= nd.hygieneBelow) return `Sudah bersih (${Math.round(n.hygiene)}%).`;
    if (nd.bladderBelow && n.bladder >= nd.bladderBelow) return 'Belum perlu ke toilet.';
    if (nd.healthBelow && n.health >= nd.healthBelow) return `Kondisi sehat (${Math.round(n.health)}%), tidak perlu berobat.`;
  }
  if ((it.price || 0) > (s.cash || 0)) return `Uang tidak cukup (butuh ${rp(it.price)}, tunai ${rp(s.cash || 0)}).`;
  return null;
}
const opt = (s, x, it, kind) => { const reason = gate(s, x, it, kind); return { id: it.id, n: it.n, venue: it.venue || '', price: it.price || 0, min: it.min || 0, gain: it.gain || {}, hours: it.hours ? hoursText(it) : '', note: it.note || '', cat: kind, kind: it.kind || kind, ok: !reason, reason: reason || '' }; };
function deliveryOpt(s, x, it) {
  const c = ctxOf(s, x, x.day, x.clock.tod), tod = x.clock.tod, rush = (tod >= 11 * 3600 && tod < 13 * 3600) || (tod >= 18 * 3600 && tod < 20 * 3600), fee = DELIVERY_FEE + (rush ? DELIVERY_RUSH_FEE : 0), total = it.price + fee;
  let reason = '';
  if (c.sleeping) reason = 'Sedang tidur. Bangun dulu.';
  else if (!(tod >= DELIVERY_HOURS[0] && tod < DELIVERY_HOURS[1])) reason = `Layanan antar tutup (buka ${hoursText({ hours: DELIVERY_HOURS })}).`;
  else if (x.orders.length >= DELIVERY_MAX) reason = 'Masih ada pesanan yang belum tiba.';
  else if (x.needs.hunger >= 92) reason = `Masih kenyang (${Math.round(x.needs.hunger)}%).`;
  else if (total > (s.cash || 0)) reason = `Uang tidak cukup (butuh ${rp(total)}, tunai ${rp(s.cash || 0)}).`;
  return { id: it.id, n: it.n, venue: it.venue, price: it.price, fee, total, rush, gain: it.gain, etaMin: etaMin(x, rush, it.id), ok: !reason, reason };
}
const etaMin = (x, rush, id) => { const h = ((x.day * 31 + Math.floor(x.clock.tod / 600) * 7 + id.length * 13) % 11); return 25 + h + (rush ? 15 : 0); };
function summary(list) { const ok = list.find(o => o.ok); if (ok) return { ok: true, reason: '' }; const freq = {}; for (const o of list) freq[o.reason] = (freq[o.reason] || 0) + 1; const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0]; return { ok: false, reason: top ? top[0] : '' }; }

/* ====================== TAMPILAN (dikirim ke UI) ====================== */
export function view(s, x) {
  const c = ctxOf(s, x, x.day, x.clock.tod), n = x.needs, r = ratesOf(n, c, x.commute), dt = dateOf(x.day);
  const eat = FOOD.map(i => opt(s, x, i, 'eat')), drink = DRINK.map(i => opt(s, x, i, 'drink')), sleep = SLEEP.map(i => opt(s, x, i, 'sleep')), care = CARE.map(i => opt(s, x, i, 'care')), delivery = DELIVERY.map(i => deliveryOpt(s, x, i));
  const cmOK = c.employed, status = c.sleeping ? { code: 'sleep', label: x.act.label } : c.act ? { code: 'act', label: x.act.label } : c.work ? { code: 'work', label: `Bekerja (${clockText(CAL.workStart, false)}-${clockText(CAL.workEnd, false)})` } : c.lunch ? { code: 'lunch', label: 'Istirahat makan siang' } : c.studying ? { code: 'study', label: 'Sesi belajar' } : { code: 'free', label: 'Waktu luang' };
  return {
    version: VERSION, day: x.day, date: dt, weekdayName: WEEKDAYS[dt.weekday],
    clock: { tod: x.clock.tod, speed: x.clock.speed, paused: x.clock.paused, simSecPerRealSec: CAL.simSecPerRealSec * x.clock.speed, text: fullText(x.day, x.clock.tod), short: shortText(x.day) },
    cal: { daysPerMonth: CAL.daysPerMonth, monthsPerYear: CAL.monthsPerYear, daysPerYear: CAL.daysPerYear, leap: CAL.leap, firstWeekday: CAL.firstWeekday, simSecPerRealSec: CAL.simSecPerRealSec, speeds: CAL.speeds, work: [CAL.workStart, CAL.workEnd], lunch: [CAL.lunchStart, CAL.lunchEnd], study: [CAL.studyStart, CAL.studyEnd], weekdays: WEEKDAYS },
    needs: Object.fromEntries(KEYS.map(k => [k, { v: r1(n[k]), rate: r1(r[k]), level: levelOf(k, n[k]) }])), meta: META, th: { hi: 60, crit: 30, sHi: 45, sCrit: 70 }, perf: Math.round(perfOf(n) * 100),
    status, act: x.act ? { kind: x.act.kind, label: x.act.label, rem: Math.round(x.act.rem), total: x.act.total, forced: Boolean(x.act.forced) } : null,
    orders: x.orders.map(o => ({ id: o.id, n: o.n, status: o.status, arrive: o.arrive, arriveTod: o.arrive - (x.day - 1) * CAL.secPerDay, total: o.total })),
    commute: { mode: x.commute, modes: Object.entries(COMMUTE).map(([id, m]) => ({ id, ...m })), employed: cmOK },
    options: { eat, drink, sleep, care, delivery },
    quick: {
      eat: summary([...eat, ...drink]), sleep: summary([...sleep, ...care.filter(q => q.id === 'bath')]), delivery: summary(delivery),
      transport: cmOK ? { ok: true, reason: '' } : { ok: false, reason: 'Belum bekerja, belum ada perjalanan rutin.' }
    },
    dayStat: x.dayStat, hist: x.hist.slice(0, 14), log: x.log.slice(0, 60)
  };
}

/* memulai aktivitas (dipakai pemain maupun autopilot) */
function startAct(s, x, it, kind, auto) {
  s.cash -= it.price || 0;
  if (it.daily) { if (x.home.day !== x.day) x.home = { day: x.day, n: 0 }; x.home.n++; }
  const secs = it.min * 60, kd = kind === 'sleep' ? it.kind : (kind === 'care' ? 'care' : kind === 'drink' ? 'drink' : 'eat');
  x.act = { kind: kd, label: it.n, total: secs, rem: secs, gain: it.gain || {} };
  if (auto) x.dayStat.autoCost = (x.dayStat.autoCost || 0) + (it.price || 0); else logIt(x, 'activity', it.n, it.price ? `Biaya ${rp(it.price)}, ${it.min} menit.` : `${it.min} menit.`);
}
const pickIn = (list, id) => list.find(q => q.id === id);
/* autopilot: rutinitas dasar agar karakter tidak terlantar ketika pemain melewati hari. Tetap membayar biaya hidup dan tunduk pada jam buka/jam kerja. */
function autoCare(s, x) {
  const n = x.needs, tod = x.clock.tod, tries = [];
  if (n.bladder < 25) tries.push([CARE, 'toilet', 'care']);
  if (n.thirst < 35) tries.push([DRINK, 'tap', 'drink'], [DRINK, 'water', 'drink']);
  if (n.hunger < 40) tries.push([FOOD, 'homestock', 'eat'], [FOOD, 'warteg', 'eat'], [FOOD, 'bread', 'eat']);
  if (n.hygiene < 35) tries.push([CARE, 'bath', 'care']);
  if (n.energy < 25 || (tod >= 22 * 3600 && n.energy < 90)) tries.push([SLEEP, 'sleep8', 'sleep']);
  if (n.energy < 25) tries.push([SLEEP, 'nap60', 'sleep']);
  if (n.health < 35) tries.push([CARE, 'puskesmas', 'care']);
  for (const [list, id, kind] of tries) { const it = pickIn(list, id); if (it && !gate(s, x, it, kind)) { startAct(s, x, it, kind, true); return; } }
}

/* ====================== ROUTE ====================== */
export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v740/')) return null;
  const { json, body, clean, save } = h, existed = Boolean(s.v740), x = ensure740(s), err = (msg, c = 400) => json({ error: msg }, c);
  const done = async extra => { await save(user, s); return json({ ok: true, ...(extra || {}), v740: view(s, x) }); };
  if (p === '/api/v740/state' && (m === 'GET' || m === 'POST')) { if (!existed) await save(user, s); return json({ v740: view(s, x) }); }
  if (m !== 'POST') return err('Metode tidak didukung.', 405);
  const b = await body(req);
  if (p === '/api/v740/clock') {
    const act = clean(b.action, 12) || 'sync';
    let dt = Number(b.dt); dt = Number.isFinite(dt) ? Math.max(0, Math.min(CAL.maxSyncSec, dt)) : 0;
    if (act === 'sync' || act === 'pause' || act === 'speed') { if (dt > 0 && !x.clock.paused) step(s, x, dt, h); }
    if (act === 'pause') x.clock.paused = Boolean(b.paused);
    else if (act === 'speed') { const sp = Number(b.speed); if (!CAL.speeds.includes(sp)) return err('Kecepatan harus 1x, 2x, atau 4x.'); x.clock.speed = sp; x.clock.paused = false; }
    else if (act !== 'sync') return err('Aksi jam tidak dikenal.');
    return done({ midnight: x.clock.tod >= CAL.secPerDay });
  }
  if (p === '/api/v740/act') {
    const id = clean(b.id, 24), kind = clean(b.kind, 12), c = ctxOf(s, x, x.day, x.clock.tod);
    if (kind === 'cancel') { if (!x.act) return err('Tidak ada aktivitas yang berjalan.'); if (x.act.forced) return err('Karakter tidak bisa bangun sendiri sekarang.'); if (!['sleep', 'rest', 'nap'].includes(x.act.kind)) return err('Aktivitas ini tidak dapat dibatalkan.'); logIt(x, 'activity', `Berhenti lebih awal: ${x.act.label}`); x.act = null; return done(); }
    if (kind === 'commute') { const md = clean(b.mode, 10); if (!COMMUTE[md]) return err('Moda transport tidak dikenal.'); if (!c.employed) return err('Belum bekerja, belum ada perjalanan rutin.'); x.commute = md; logIt(x, 'work', `Moda perjalanan: ${COMMUTE[md].n}`, COMMUTE[md].cost ? `${rp(COMMUTE[md].cost)} per hari kerja.` : 'Gratis.'); return done(); }
    if (kind === 'delivery') {
      const it = DELIVERY.find(q => q.id === id); if (!it) return err('Menu tidak ditemukan.', 404); const o = deliveryOpt(s, x, it); if (!o.ok) return err(o.reason);
      s.cash -= o.total; x.nid = (x.nid || 0) + 1; x.orders.push({ id: 'o' + x.nid, n: it.n, gain: it.gain, total: o.total, status: 'enroute', arrive: absOf(x) + o.etaMin * 60 });
      logIt(x, 'delivery', `Memesan ${it.n}`, `${rp(o.total)} (ongkir ${rp(o.fee)}), tiba ±${o.etaMin} menit.`); return done();
    }
    const table = { eat: FOOD, drink: DRINK, sleep: SLEEP, care: CARE }[kind]; if (!table) return err('Jenis aksi tidak dikenal.');
    const it = table.find(q => q.id === id); if (!it) return err('Aksi tidak ditemukan.', 404);
    const reason = gate(s, x, it, kind); if (reason) return err(reason);
    startAct(s, x, it, kind, false);
    return done();
  }
  return err('API_NOT_FOUND', 404);
}
