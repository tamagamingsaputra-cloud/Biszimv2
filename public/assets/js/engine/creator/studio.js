// CREATOR SIMULATION ENGINE — state Creator Studio, aksi pemain, dan hook waktu (per tick, per menit live, per hari).
// Engine ini memperluas core BizSim: uang lewat earn/spend core, waktu lewat jam simulasi core, persistence lewat save core.
import { PLATFORMS, ACTIVE_PLATFORMS, NICHES, QUALITY, MUSIC, PACKAGING, EQUIPMENT, DEFAULT_GEAR, CREATOR_SKILLS, STAGES, TIERS, LIVE_ACTIONS, STREAM_Q, COLLAB_NAMES } from '../../data/creator-platforms.js';
import { weekdayOf } from '../calendar.js';
import { TIME_RULES } from '../../data/time-rules.js';
const ED = TIME_RULES.freelanceEditor;
import { hrand, hnorm, clamp } from '../rng.js';
import { formatLocks, liveLocks, liveSupports, programActive, activeStrikes, gearItem, rolling, programStatus, dayOfG, gOfDay } from './rules.js';
import { initialExposure, signal, contentTick, resurfaceCheck, churn, liveMinute, nicheOf, trend } from './audience.js';
import { validateSpec, plan, finalQuality, busyAt, etaQueue, inProduction, angleOf, textScore } from './production.js';
import { updatePrograms, applyProgram, adAccrual, dayEnd, monthEnd, payoutDay, weeklyOffers, addTx, note, MERCH } from './monetization.js';

const T = 48;
let CTX = null;
export function attach(fn) { CTX = fn; }
const X = () => CTX();
const ok = (msg, data) => { const x = X(); x.save(); x.emit('change'); x.emit('creator'); return { ok: true, msg, data }; };
const fail = (error, code = 'error') => ({ ok: false, error, code });
export const C = () => X().S.creator;

// ————————————————————————— state —————————————————————————
const blankDay = () => ({ views: 0, impr: 0, reach: 0, watchSec: 0, watchLong: 0, shortsViews: 0, likes: 0, comments: 0, shares: 0, saves: 0, pv: 0, gained: 0, lost: 0, rev: 0, aff: 0, liveMin: 0, liveViewers: 0, cost: 0, posts: 0 });
export function initCreator(S) {
  const ps = S.player.skills || {};
  S.creator = {
    v: 1, accounts: {}, contents: [], queue: [], seq: 1, txSeq: 1, noteSeq: 1, offerSeq: 1, liveSeq: 1, contractSeq: 1,
    gear: { ...DEFAULT_GEAR }, owned: Object.values(DEFAULT_GEAR),
    skills: { research: 2 + (ps.teknologi || 0) * 2, storytelling: (ps.kreativitas || 0) * 3, recording: 3 + (ps.teknis || 0) * 3, editing: (ps.teknologi || 0) * 2, presentation: (ps.komunikasi || 0) * 3, audience: (ps.komunikasi || 0) * 2, live: (ps.komunikasi || 0) * 2, marketing: (ps.penjualan || 0) * 3 },
    settings: { dailyHours: 3 }, hoursToday: 0, hoursWeek: 0, week: null, trainedToday: false, courseToday: false,
    live: null, lives: [], scheduledLives: [], offers: [], contracts: [], collabs: [], tx: [], notes: [], merch: null,
    stats: { published: 0, received: 0, cost: 0, livesDone: 0 }, costDaily: [],
  };
  for (const k of Object.keys(S.creator.skills)) S.creator.skills[k] = Math.min(40, Math.round(S.creator.skills[k] * 10) / 10);
  if (S.player.energy == null) S.player.energy = 100;
  return S.creator;
}
/** Migrasi fitur YouTube lama (Career) ke Creator Studio — data tidak hilang. */
export function migrateLegacyYoutube(S, day) {
  const y = S.youtube; if (!y) return;
  const C = S.creator, map = { edukasi: 'bisnis', gaming: 'gaming', kuliner: 'kuliner', tekno: 'teknologi' };
  const acc = newAccount('youtube', y.name, map[y.niche] || 'edukasi', y.videos[0]?.day ?? day);
  acc.followers = y.subs; acc.totalViews = y.views;
  acc.daily.push({ d: day - 1, ...blankDay(), views: y.views, watchLong: y.watchHours * 3600, followers: y.subs, legacy: true });
  if (y.monetized) acc.programs.ads = { status: 'active', since: day };
  acc.wallet.est = y.unpaid || 0;
  C.accounts.youtube = acc;
  if (y.gear >= 1) { C.owned.push('mic_clip', 'light_ring'); C.gear.audio = 'mic_clip'; C.gear.light = 'light_ring'; }
  if (y.gear >= 2) { C.owned.push('cam_mirrorless', 'pc_laptop'); C.gear.camera = 'cam_mirrorless'; C.gear.computer = 'pc_laptop'; }
  for (const v of y.videos) {
    const c = blankContent({ platform: 'youtube', format: 'long', niche: acc.niche, angle: 'tutorial', title: `Video #${v.n} (dari channel lama)`, dur: 600, quality: 'standard', budget: 0, music: 'library', packaging: 'honest', thumb: 'text' }, C);
    c.status = 'published'; c.publishedG = gOfDay(v.day); c.legacy = true; c.m.views = v.views; c.m.impr = v.views / 0.05; c.m.reach = c.m.impr / 1.2;
    c.q = { idea: v.q * 0.6, prod: v.q * 0.6, pack: 0.6, fit: 1, durFit: 1, ret: 0.4, ctr: 0.05, stay: 1, eng: 0.04, overall: v.q * 0.6, textNotes: [] };
    c.dist = { E0: Math.max(10, v.views / 6), E: Math.max(2, v.views / 200), parts: { followers: 0, discovery: 1, collab: 0 }, trend0: 1, trendPrev: 1, sig: 0.9, nextEval: gOfDay(day), lastEval: gOfDay(day), k: 0 };
    C.contents.push(c);
  }
  C.stats.published = y.videos.length; S.youtube = null;
  note(C, { g: S.clock.g, day, emit: null }, 'growth', `Channel YouTube lama "${y.name}" dipindahkan ke Creator Studio beserta ${y.videos.length} video, subscriber, dan pendapatan tertunda.`, 'youtube');
}
function newAccount(pid, handle, niche, day) {
  return { id: pid, handle, niche, createdDay: day, followers: 0, peak: 0, totalViews: 0, rep: 50, momentum: 1, lastPostDay: null, strikes: [], terminated: false, violations: 0,
    programs: {}, wallet: { est: 0, estBy: {}, final: 0, finalBy: {}, diamonds: 0, withdrawals: [], affPending: 0, affQueue: [] }, members: 0, daily: [], today: blankDay() };
}
function blankContent(spec, C) {
  return { id: C.seq++, platform: spec.platform, format: spec.format, niche: spec.niche, angle: spec.angle || 'tutorial', title: String(spec.title || '').trim().slice(0, 120), caption: String(spec.caption || '').slice(0, 600), concept: String(spec.concept || '').slice(0, 400),
    dur: +spec.dur || 0, photos: +spec.photos || 0, quality: spec.quality || 'standard', budget: +spec.budget || 0, music: spec.music || 'library', packaging: spec.packaging || 'honest', thumb: spec.thumb || 'text', focus: spec.focus || null,
    outsource: !!spec.outsource, sponsorContract: spec.sponsorContract || null, disclosure: !!spec.disclosure, collab: spec.collab || null, affiliate: !!spec.affiliate, premiere: !!spec.premiere, after: spec.after || 'manual', scheduleG: spec.scheduleG ?? null,
    status: 'draft', stages: [], hoursTotal: 0, hoursDone: 0, costTotal: 0, costSpent: 0, createdG: null, startedG: null, readyG: null, publishedG: null, endedG: null, wait: null, paused: false, energySum: 0, energyN: 0, recFails: 0,
    gearUsed: null, q: null, dist: null, m: { impr: 0, views: 0, reach: 0, watchSec: 0, likes: 0, comments: 0, shares: 0, saves: 0, pv: 0, follows: 0, completes: 0, rev: 0, affSales: 0, affComm: 0, src: { followers: 0, discovery: 0, search: 0, resurface: 0, collab: 0 } },
    hist: [], flags: {}, expired: false };
}

// ————————————————————————— ringkasan untuk UI —————————————————————————
export const ageNow = () => X().age();
export function tierInfo() {
  const c = C(), x = X(); const followers = Object.values(c.accounts).reduce((s, a) => s + a.followers, 0);
  const income30 = c.tx.filter(t => t.status === 'dibayar' && t.day > x.day - 30 && t.net > 0).reduce((s, t) => s + t.net, 0);
  const pub = c.stats.published; let cur = TIERS[0], next = null;
  for (const t of TIERS) { if (!t.need || (followers >= t.need.followers && (t.need.income30 == null || income30 >= t.need.income30) && pub >= t.need.published)) cur = t; else { next = t; break; } }
  return { cur, next, followers, income30, published: pub };
}
export const queueEta = () => etaQueue(C(), X());
export function accountLocks(pid) {
  const P = PLATFORMS[pid], x = X(), out = [];
  if (!P || P.status !== 'active') return ['Platform ini belum diimplementasikan di versi simulasi.'];
  if (x.age() < P.minAge) out.push(`Akun ${P.name} terbuka mulai usia ${P.minAge} tahun simulasi (sekarang ${x.age()}).`);
  return out;
}
export const liveLocksFor = pid => { const acc = C().accounts[pid]; return acc ? liveLocks(acc, C(), X()) : ['Buat akun dulu.']; };
export const programsFor = pid => { const acc = C().accounts[pid]; return acc ? Object.keys(PLATFORMS[pid].programs).map(k => programStatus(acc, k, C(), X())) : []; };
export const supportsFor = pid => { const acc = C().accounts[pid]; return acc ? liveSupports(acc) : []; };
export function estimate(spec) {
  const c = C(), err = validateSpec({ ...spec, title: spec.title || 'x' }, c).filter(e => !e.startsWith('Judul'));
  if (err.length) return { ok: false, errors: err };
  const p = plan(spec, c);
  return { ok: true, ...p, text: textScore(spec) };
}
export function weeklyCreatorHours() { const c = C(), x = X(), wk = Math.floor(x.day / 7); return c.week === wk ? c.hoursWeek : 0; }

// ————————————————————————— aksi: akun —————————————————————————
export function createAccount(pid, handle, niche) {
  const c = C(), x = X(), P = PLATFORMS[pid];
  if (!P || P.status !== 'active') return fail('Platform ini belum tersedia di versi simulasi.');
  if (c.accounts[pid]) return fail(`Akun ${P.name} sudah ada.`);
  const locks = accountLocks(pid); if (locks.length) return fail(locks[0], 'age');
  const h = String(handle || '').trim().replace(/^@/, '');
  if (!/^[\p{L}\p{N}._]{3,24}$/u.test(h)) return fail('Nama akun 3–24 karakter: huruf, angka, titik, atau garis bawah.');
  if (!nicheOf(niche)) return fail('Pilih topik utama akun.');
  c.accounts[pid] = newAccount(pid, h, niche, x.day);
  x.log('kreator', `Membuat akun ${P.name} @${h}.`);
  return ok(`Akun ${P.name} @${h} dibuat. Audiens mulai dari 0 — tidak ada follower bawaan.`);
}

// ————————————————————————— aksi: konten —————————————————————————
export function saveDraft(spec, id = null) {
  const c = C();
  if (id != null) {
    const it = c.contents.find(k => k.id === id); if (!it || it.status !== 'draft') return fail('Draft tidak ditemukan atau sudah diproduksi.');
    Object.assign(it, { ...blankContent(spec, { seq: it.id }), id: it.id, status: 'draft', createdG: it.createdG });
    return ok('Draft diperbarui.', it);
  }
  const it = blankContent(spec, c); it.createdG = X().g; c.contents.push(it);
  return ok('Draft disimpan. Lanjutkan kapan saja dari Content Planner.', it);
}
export function startProduction(spec, draftId = null) {
  const c = C(), x = X();
  const err = validateSpec(spec, c); if (err.length) return fail(err[0]);
  const acc = c.accounts[spec.platform]; const fl = formatLocks(acc, spec.format, x); if (fl.length) return fail(fl[0]);
  if (spec.sponsorContract) { const k = c.contracts.find(k => k.id === +spec.sponsorContract); if (!k || k.status !== 'aktif') return fail('Kontrak sponsor tidak aktif.'); if (k.platform !== spec.platform || k.format !== spec.format) return fail(`Kontrak ${k.brand} meminta format ${PLATFORMS[k.platform].formats[k.format].name} di ${PLATFORMS[k.platform].name}.`); }
  if (spec.collab) { const cb = c.collabs.find(k => k.id === spec.collab); if (!cb || cb.status !== 'diterima' || cb.used) return fail('Kolaborasi belum disetujui atau sudah dipakai.'); }
  if (spec.affiliate && !programActive(acc, 'affiliate')) return fail('Program affiliate belum aktif untuk akun ini.');
  if (spec.after === 'schedule' && !(spec.scheduleG > x.g)) return fail('Pilih jadwal publikasi di masa depan.');
  let it = draftId != null ? c.contents.find(k => k.id === draftId && k.status === 'draft') : null;
  if (it) Object.assign(it, { ...blankContent(spec, { seq: it.id }), id: it.id, createdG: it.createdG }); else { it = blankContent(spec, c); it.createdG = x.g; c.contents.push(it); }
  const p = plan(spec, c);
  Object.assign(it, { stages: p.stages, hoursTotal: p.hoursTotal, costTotal: p.costTotal, status: 'queued', startedG: x.g, gearUsed: { ...c.gear } });
  if (spec.collab) c.collabs.find(k => k.id === spec.collab).used = it.id;
  c.queue.push(it.id);
  return ok(`Masuk antrean produksi: ${p.hoursTotal} jam kerja, biaya Rp ${p.costTotal.toLocaleString('id-ID')} (dibayar per tahap).`, it);
}
export function duplicate(id) {
  const c = C(), src = c.contents.find(k => k.id === id); if (!src) return fail('Konten tidak ditemukan.');
  const it = blankContent({ ...src, title: (src.title + ' (salinan)').slice(0, 120), sponsorContract: null, collab: null, scheduleG: null, after: 'manual' }, c); it.createdG = X().g; c.contents.push(it);
  return ok('Konsep digandakan sebagai draft baru.', it);
}
export function cancel(id) {
  const c = C(), it = c.contents.find(k => k.id === id); if (!it) return fail('Konten tidak ditemukan.');
  if (!['draft', 'ready', 'scheduled'].includes(it.status) && !inProduction(it)) return fail('Konten yang sudah terbit tidak bisa dibatalkan.');
  const spent = it.costSpent; it.status = 'cancelled'; it.endedG = X().g; c.queue = c.queue.filter(q => q !== id);
  if (it.collab) { const cb = c.collabs.find(k => k.id === it.collab); if (cb) cb.used = null; }
  return ok(spent > 0 ? `Produksi dibatalkan. Biaya yang sudah keluar (Rp ${Math.round(spent).toLocaleString('id-ID')}) tidak kembali.` : 'Dibatalkan.');
}
export function deleteDraft(id) { const c = C(), i = c.contents.findIndex(k => k.id === id && k.status === 'draft'); if (i < 0) return fail('Draft tidak ditemukan.'); c.contents.splice(i, 1); return ok('Draft dihapus.'); }
export function togglePause(id) { const it = C().contents.find(k => k.id === id); if (!it || !inProduction(it)) return fail('Tidak sedang diproduksi.'); it.paused = !it.paused; return ok(it.paused ? 'Produksi dijeda.' : 'Produksi dilanjutkan.'); }
export function move(id, dir) { const q = C().queue, i = q.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= q.length) return fail('Tidak bisa dipindah.'); [q[i], q[j]] = [q[j], q[i]]; return ok('Prioritas antrean diubah.'); }
export function setDailyHours(h) { const v = clamp(Math.round(+h * 2) / 2, 0.5, 10); C().settings.dailyHours = v; return ok(`Jam kreator maksimal ${v} jam/hari.`); }

export function publish(id, at = null, opts = {}) {
  const c = C(), x = X(), it = c.contents.find(k => k.id === id); if (!it) return fail('Konten tidak ditemukan.');
  if (!['ready', 'scheduled'].includes(it.status)) return fail('Konten belum siap dipublikasikan.');
  const acc = c.accounts[it.platform]; if (acc.terminated) return fail('Akun ditutup — konten tidak bisa dipublikasikan.');
  if (opts.premiere != null) it.premiere = !!opts.premiere && !!PLATFORMS[it.platform].formats[it.format].premiere;
  if (at != null && at > x.g) { it.status = 'scheduled'; it.scheduleG = at; return ok(`Dijadwalkan terbit ${fmtG(at)}${it.premiere ? ' sebagai Premiere' : ''}.`); }
  doPublish(it, x.g); return ok('Konten diterbitkan. Performa dihitung bertahap — pantau di Published Content.');
}
export function unschedule(id) { const it = C().contents.find(k => k.id === id); if (!it || it.status !== 'scheduled') return fail('Tidak terjadwal.'); it.status = 'ready'; it.scheduleG = null; return ok('Jadwal dibatalkan; konten kembali siap terbit.'); }
const fmtG = g => { const d = dayOfG(g), m = (g % T) * 30; return `hari ke-${d + 1} pukul ${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };

function doPublish(it, g) {
  const c = C(), x = X(), acc = c.accounts[it.platform], P = PLATFORMS[it.platform], f = P.formats[it.format], sd = x.seed;
  it.status = 'published'; it.publishedG = g; it.scheduleG = null; c.queue = c.queue.filter(q => q !== it.id);
  it.angleCfg = angleOf(it.angle);
  const ex = initialExposure(it, acc, c, x, g);
  const luck = Math.exp(f.varSigma * 0.6 * hnorm(sd, 'luck', it.id));
  it.dist = { E0: ex.E0, E: ex.E0, parts: ex.parts, trend0: ex.trend0, trendPrev: ex.trend0, comp: ex.comp, slot: ex.slot, sig: signal(it) * luck, luck, nextEval: g + 4, lastEval: g, k: 0 };
  acc.lastPostDay = x.day; acc.today.posts++; c.stats.published++; x.addXp(3);
  // Hak cipta: lagu tanpa lisensi berisiko klaim / audio dibisukan / strike.
  if (it.music === 'unlicensed') {
    const pClaim = { youtube: 0.85, tiktok: 0.6, instagram: 0.7 }[it.platform];
    if (hrand(sd, 'claim', it.id) < pClaim) {
      if (it.platform === 'youtube') { it.flags.claimed = true; note(c, x, 'copyright', `Klaim hak cipta (simulasi) pada "${it.title}": pendapatan iklan video ini dialihkan ke pemilik lagu.`, it.platform); }
      else { it.flags.muted = true; note(c, x, 'copyright', `Audio "${it.title}" dibisukan karena lagu tanpa lisensi (simulasi). Tayangan turun.`, it.platform); }
      if (hrand(sd, 'strike', it.id) < (it.platform === 'youtube' ? 0.15 : 0.08)) addStrike(acc, 'Pelanggaran hak cipta berulang (simulasi)');
    }
  }
  // Pengungkapan sponsor.
  if (it.sponsorContract) {
    const k = c.contracts.find(k => k.id === it.sponsorContract);
    if (!it.disclosure && hrand(sd, 'disc', it.id) < 0.5) {
      acc.rep = clamp(acc.rep - 8, 0, 100); acc.violations++; it.flags.disclosure = true;
      note(c, x, 'policy', `Konten bersponsor "${it.title}" tidak diberi label kerja sama dan terdeteksi (simulasi). Reputasi akun turun.`, it.platform);
      if (acc.violations >= 2) addStrike(acc, 'Pelanggaran kebijakan konten bersponsor berulang');
    }
    if (k && k.status === 'aktif') { k.delivered.push(it.id); if (k.delivered.length >= k.qty) { k.status = 'selesai'; k.payDay = x.day + 7; note(c, x, 'sponsor', `Semua konten untuk ${k.brand} terbit. Pelunasan dijadwalkan hari ke-${k.payDay + 1}.`, k.platform); } }
  }
  const pk = PACKAGING[it.packaging];
  if (it.packaging === 'clickbait' && it.q.overall < 0.6) { it.flags.misleading = true; acc.rep = clamp(acc.rep - 2, 0, 100); note(c, x, 'policy', `Banyak penonton menilai judul "${it.title}" menyesatkan. Kepercayaan akun turun.`, it.platform); }
  else acc.rep = clamp(acc.rep + pk.trust * 0.5 + (it.dist.sig > 1.1 ? 0.4 : 0), 0, 100);
  x.log('kreator', `Terbit di ${P.name}: "${it.title}".`);
}
function addStrike(acc, reason) {
  const c = C(), x = X(); acc.strikes.push({ day: x.day, until: x.day + 90, reason });
  const n = activeStrikes(acc, x.day);
  note(c, x, 'policy', `Strike ${n}/3 untuk akun ${PLATFORMS[acc.id].name}: ${reason}. Berlaku 90 hari; live & monetisasi ditangguhkan selama strike aktif.`, acc.id);
  if (n >= 3) { acc.terminated = true; note(c, x, 'policy', `Akun ${PLATFORMS[acc.id].name} ditutup karena 3 strike aktif (simulasi).`, acc.id); }
}

// ————————————————————————— aksi: live —————————————————————————
export function startLive(spec) {
  const c = C(), x = X(), acc = c.accounts[spec.platform];
  if (!acc) return fail('Buat akun dulu.');
  if (c.live) return fail('Masih ada live yang berjalan.');
  const locks = liveLocks(acc, c, x); if (locks.length) return fail(locks[0]);
  const P = PLATFORMS[spec.platform];
  if (!P.live.qualities.includes(spec.quality)) return fail('Kualitas stream tidak didukung.');
  if (!String(spec.title || '').trim()) return fail('Judul live wajib diisi.');
  if (!nicheOf(spec.niche)) return fail('Pilih kategori live.');
  const dur = +spec.durMin; if (!(dur >= 15 && dur <= 240)) return fail('Durasi live 15–240 menit.');
  const busy = busyAt(x, { ...c, live: null }, x.g); if (busy === 'sekolah' || busy === 'kerja' || busy === 'aktivitas') return fail(`Karakter sedang ${busy === 'aktivitas' ? 'aktivitas pribadi' : busy}. Live bisa dimulai di waktu luang.`);
  if (x.energy() < 25) return fail('Energi karakter di bawah 25 — istirahat dulu.');
  const sch = spec.scheduledId ? c.scheduledLives.find(s => s.id === +spec.scheduledId) : null;
  if (sch) sch.status = 'dimulai';
  c.live = { id: c.liveSeq++, platform: spec.platform, niche: spec.niche, title: String(spec.title).trim().slice(0, 100), desc: String(spec.desc || '').slice(0, 300), quality: spec.quality, plannedMin: dur,
    startG: x.g, startSub: x.S.clock.sub || 0, minute: 0, ccv: 0, unique: 0, peak: 0, ccvSum: 0, follows: 0, chat: 0, likes: 0, gifts: [], giftAgg: {}, gross: 0, fee: 0, net: 0, coins: 0, diamonds: 0, cost: 0, costPaidMin: 0,
    feed: [{ m: 0, t: 'sys', text: 'Live dimulai. Penonton datang dari notifikasi follower dan rekomendasi.' }], series: [[0, 0]], actions: {}, effects: [], lagUntil: -1, lagCount: 0, supports: liveSupports(acc), scheduled: !!sch, status: 'live', goalUses: 0, startFollowers: acc.followers };
  x.restartClock(); x.log('kreator', `Mulai live di ${P.name}: "${c.live.title}".`);
  return ok('Live dimulai. Waktu simulasi berjalan per menit selama live.');
}
export function liveAction(key) {
  const c = C(), x = X(), L = c.live, A = LIVE_ACTIONS[key]; if (!L || !A) return fail('Tidak ada live aktif.');
  const last = L.actions[key]; if (last != null && L.minute - last < A.cd) return fail(`${A.name} bisa dipakai lagi dalam ${A.cd - (L.minute - last)} menit.`);
  if (A.needsSupport && !L.supports.length) return fail('Fitur dukungan penonton belum aktif untuk akun ini.');
  L.actions[key] = L.minute; L.effects.push({ key, until: L.minute + A.dur }); x.setEnergy(x.energy() - A.energy);
  if (key === 'goal') { L.goalUses++; if (L.goalUses > 2) c.accounts[L.platform].rep = clamp(c.accounts[L.platform].rep + (A.trust || 0), 0, 100); }
  L.feed.unshift({ m: L.minute, t: 'act', text: A.name });
  c.skills.live = Math.min(100, c.skills.live + 0.05 * (1 - c.skills.live / 120));
  return ok(A.name + '.');
}
export function endLive(reason = 'Diakhiri oleh pemain') {
  const c = C(), x = X(), L = c.live; if (!L) return fail('Tidak ada live aktif.');
  const acc = c.accounts[L.platform], P = PLATFORMS[L.platform];
  payLiveCost(L, true);
  const gained = L.follows; acc.followers += gained; acc.peak = Math.max(acc.peak, acc.followers);
  acc.today.gained += gained; acc.today.liveMin += L.minute; acc.today.liveViewers += L.unique; acc.today.views += L.unique; acc.totalViews += L.unique; acc.today.likes += L.likes;
  const rep = { id: L.id, platform: L.platform, title: L.title, niche: L.niche, quality: L.quality, startG: L.startG, endG: x.g, minutes: L.minute, peak: Math.round(L.peak), avg: L.minute ? L.ccvSum / L.minute : 0, unique: Math.round(L.unique), follows: gained, chat: Math.round(L.chat), likes: Math.round(L.likes),
    gifts: L.gifts.length, giftAgg: L.giftAgg, gross: L.gross, fee: L.fee, net: L.net, coins: L.coins, diamonds: L.diamonds, cost: L.cost, lagCount: L.lagCount, reason, series: L.series.filter((_, i) => i % Math.max(1, Math.floor(L.series.length / 120)) === 0), supports: L.supports };
  c.lives.unshift(rep); if (c.lives.length > 40) c.lives.length = 40;
  c.stats.livesDone++; x.addXp(Math.min(15, Math.round(L.minute / 10)));
  c.skills.live = Math.min(100, c.skills.live + L.minute / 60 * 0.8 * (1 - c.skills.live / 120));
  c.skills.presentation = Math.min(100, c.skills.presentation + L.minute / 60 * 0.3 * (1 - c.skills.presentation / 120));
  addTx(c, x, { platform: L.platform, type: 'live', source: 'live', label: `Ringkasan live "${L.title}" (${L.minute} menit, ${L.gifts.length} dukungan)`, gross: L.gross, fee: L.fee, tax: 0, net: L.net, status: L.platform === 'tiktok' ? 'saldo diamond' : 'estimasi' });
  c.live = null; x.restartClock(); x.log('kreator', `Live selesai: ${L.minute} menit, puncak ${Math.round(L.peak)} penonton.`);
  return ok('Live diakhiri. Laporan tersedia di Live Studio.', rep);
}
function payLiveCost(L, final) {
  const c = C(), x = X(), net = gearItem('internet', c.gear.internet), sq = STREAM_Q[L.quality];
  const due = L.minute - L.costPaidMin; if (due <= 0 || (!final && due < 30)) return;
  const amt = Math.round(due / 60 * ((net.dataCost ? sq.dataPerHour : 0) + 1_500));
  L.costPaidMin = L.minute; if (amt <= 0) return;
  L.cost += amt; x.forceSpend(amt, 'kreator_live', 'biaya live (data & listrik)'); c.stats.cost += amt; c.accounts[L.platform].today.cost += amt;
}
/** Satu menit simulasi live (dipanggil core sebagai pengganti tick biasa selama live). */
export function liveStep() {
  const c = C(), x = X(), L = c.live; if (!L) return;
  const acc = c.accounts[L.platform], P = PLATFORMS[L.platform];
  const r = liveMinute(L, acc, c, x);
  x.setEnergy(x.energy() - 0.15);
  for (const gft of r.gifts) {
    L.gross += gft.viewerIdr ?? gft.gross; L.fee += gft.fee; L.net += gft.net;
    const key = gft.name; const a = (L.giftAgg[key] ||= { n: 0, gross: 0, net: 0, coins: 0 }); a.n++; a.gross += gft.viewerIdr ?? gft.gross; a.net += gft.net; a.coins += gft.coins || 0;
    if (gft.coins) { L.coins += gft.coins; L.diamonds += gft.diamonds; acc.wallet.diamonds += gft.diamonds; }
    else { acc.wallet.est += gft.net; acc.wallet.estBy[gft.sid] = (acc.wallet.estBy[gft.sid] || 0) + gft.net; }
    acc.today.rev += gft.net;
    if (L.gifts.length < 300) L.gifts.push(gft);
    L.feed.unshift({ m: L.minute, t: 'gift', who: gft.who, text: gft.coins ? `${gft.name} × 1 (${gft.coins} koin)` : `${gft.name} Rp ${gft.gross.toLocaleString('id-ID')}` });
    if (L.gifts.length <= 80) addTx(c, x, { platform: L.platform, type: 'support', source: gft.sid, label: `${gft.name} dari ${gft.who}${gft.coins ? ` · ${gft.coins} koin → ${gft.diamonds} diamond` : ''}`, gross: gft.viewerIdr ?? gft.gross, fee: gft.fee, tax: 0, net: gft.net, status: gft.coins ? 'saldo diamond' : 'estimasi' });
    x.emit('creator-gift', gft);
  }
  if (L.feed.length > 80) L.feed.length = 80;
  payLiveCost(L, false);
  if (L.minute >= L.plannedMin) return endLive('Durasi rencana tercapai');
  if (x.energy() <= 3) return endLive('Energi karakter habis');
}
export function scheduleLive(spec) {
  const c = C(), x = X(); if (!c.accounts[spec.platform]) return fail('Buat akun dulu.');
  if (!(spec.at > x.g)) return fail('Pilih waktu di masa depan.');
  if (!String(spec.title || '').trim()) return fail('Judul live wajib diisi.');
  c.scheduledLives.push({ id: c.liveSeq++, platform: spec.platform, niche: spec.niche, title: String(spec.title).trim().slice(0, 100), desc: spec.desc || '', quality: spec.quality, durMin: +spec.durMin || 60, at: spec.at, status: 'terjadwal' });
  return ok(`Live dijadwalkan ${fmtG(spec.at)}. Follower diberi pengingat (notifikasi lebih kuat saat mulai tepat waktu).`);
}
export function cancelScheduledLive(id) { const s = C().scheduledLives.find(k => k.id === id); if (!s || !['terjadwal', 'waktunya'].includes(s.status)) return fail('Tidak ditemukan.'); s.status = 'dibatalkan'; return ok('Jadwal live dibatalkan.'); }

// ————————————————————————— aksi: monetisasi & kerja sama —————————————————————————
export function withdrawDiamonds(pid) {
  const c = C(), x = X(), acc = c.accounts[pid], S = PLATFORMS[pid]?.support?.gifts; if (!acc || !S) return fail('Tidak tersedia.');
  if (x.age() < 18) return fail('Penarikan butuh usia 18 tahun simulasi.');
  const gross = acc.wallet.diamonds * S.idrPerDiamond; if (gross < S.withdrawMin) return fail(`Minimal penarikan Rp ${S.withdrawMin.toLocaleString('id-ID')} (saldo diamond setara Rp ${Math.floor(gross).toLocaleString('id-ID')}).`);
  const tax = gross * PLATFORMS[pid].payout.tax, fee = S.withdrawFee, net = gross - tax - fee;
  acc.wallet.withdrawals.push({ diamonds: acc.wallet.diamonds, gross, fee, tax, net, readyDay: x.day + S.withdrawDays, status: 'proses' });
  addTx(c, x, { platform: pid, type: 'withdraw', source: 'gifts', label: `Ajukan penarikan ${Math.round(acc.wallet.diamonds).toLocaleString('id-ID')} diamond`, gross, fee, tax, net, status: 'diproses' });
  acc.wallet.diamonds = 0;
  return ok(`Penarikan diproses ${S.withdrawDays} hari. Bersih Rp ${Math.round(net).toLocaleString('id-ID')} setelah biaya transfer & pajak simulasi.`);
}
export function requestProgram(pid, progId) {
  const c = C(), x = X(), acc = c.accounts[pid]; if (!acc) return fail('Buat akun dulu.');
  const e = applyProgram(c, x, acc, progId); if (e) return fail(e);
  const P = PLATFORMS[pid], prog = P.programs[progId], st = acc.programs[progId];
  x.log('kreator', `Mengajukan ${prog.name} (${P.name}).`);
  return ok(st.status === 'review' ? `Pengajuan ${prog.name} dikirim. Peninjauan ${prog.review} hari simulasi.` : `${prog.name} aktif.`);
}
export function setProgramOff(pid, progId, off) {
  const c = C(), acc = c.accounts[pid], st = acc?.programs?.[progId]; if (!st) return fail('Program tidak ditemukan.');
  if (off) { if (st.status !== 'active') return fail('Hanya program aktif yang bisa dinonaktifkan.'); st.status = 'off'; return ok(`${PLATFORMS[pid].programs[progId].name} dinonaktifkan. Tidak ada pendapatan dari sumber ini sampai diaktifkan lagi.`); }
  if (st.status !== 'off') return fail('Program tidak dalam status nonaktif.');
  const s = programStatus(acc, progId, c, X()); if (!s.allMet) { st.status = 'locked'; return fail('Syarat tidak lagi terpenuhi.'); }
  st.status = 'active'; return ok('Program diaktifkan kembali.');
}
export function acceptOffer(id) {
  const c = C(), x = X(), o = c.offers.find(k => k.id === id); if (!o) return fail('Penawaran sudah tidak berlaku.');
  const k = { id: c.contractSeq++, ...o, status: 'aktif', deadline: x.day + o.days, delivered: [], upfrontPaid: 0, paid: false, acceptedDay: x.day };
  if (o.upfront) { const up = Math.round(o.fee * o.upfront), tax = up * 0.02; k.upfrontPaid = up; x.earn(up - tax, 'kreator_sponsor', `Uang muka sponsor ${o.brand}.`); c.stats.received += up - tax; addTx(c, x, { platform: o.platform, type: 'payout', source: 'sponsor', label: `Uang muka ${o.brand} (${o.upfront * 100}%)`, gross: up, fee: 0, tax, net: up - tax, status: 'dibayar' }); }
  c.contracts.push(k); c.offers = c.offers.filter(q => q.id !== id);
  return ok(`Kontrak ${o.brand} aktif. Terbitkan ${o.qty} ${PLATFORMS[o.platform].formats[o.format].name} dengan label kerja sama sebelum hari ke-${k.deadline + 1}.`);
}
export function declineOffer(id) { const c = C(); c.offers = c.offers.filter(q => q.id !== id); return ok('Penawaran ditolak.'); }
export function collabList() {
  const c = C(), x = X();
  if (!c.collabs.length) c.collabs = COLLAB_NAMES.map((name, i) => ({ id: 'npc' + i, name, niche: NICHES[i % NICHES.length].id, platform: ['youtube', 'tiktok', 'instagram'][i % 3], followers: Math.round(300 * Math.pow(10, 3.2 * hrand(x.seed, 'npc', i))), status: 'tersedia', used: null }));
  return c.collabs;
}
export function requestCollab(npcId) {
  const c = C(), x = X(), n = collabList().find(k => k.id === npcId); if (!n) return fail('Kreator tidak ditemukan.');
  const acc = c.accounts[n.platform]; if (!acc) return fail(`Kolaborasi ini di ${PLATFORMS[n.platform].name} — buat akun dulu.`);
  if (n.status === 'diterima' && !n.used) return fail('Kolaborasi sudah disetujui; gunakan di Create Content.');
  if (n.lastAsk != null && x.day - n.lastAsk < 7) return fail('Tunggu 7 hari sebelum mengajak kreator yang sama lagi.');
  n.lastAsk = x.day;
  const chance = clamp(0.1 + 0.6 * Math.sqrt(Math.max(1, acc.followers) / n.followers) + (acc.rep - 50) / 200 + (n.niche === acc.niche ? 0.1 : -0.05), 0.03, 0.9);
  if (hrand(x.seed, 'collab', npcId, x.day) < chance) { n.status = 'diterima'; n.used = null; n.until = x.day + 14; return ok(`${n.name} setuju berkolaborasi (berlaku 14 hari). Pilih kolaborasi ini di Create Content.`); }
  n.status = 'menolak'; X().save(); X().emit('creator'); return { ok: false, error: `${n.name} menolak saat ini (perkiraan peluang ${Math.round(chance * 100)}%). Audiens & reputasi yang lebih besar menaikkan peluang.` };
}
export function openMerch(pid) {
  const c = C(), x = X(), acc = c.accounts[pid]; if (!acc) return fail('Akun tidak ditemukan.');
  if (!programActive(acc, 'merch')) return fail('Program merchandise belum terbuka untuk akun ini.');
  if (c.merch?.open) return fail('Toko merch sudah dibuka.');
  if (!x.spend(MERCH.setup, 'kreator_merch_setup')) return fail(`Saldo tidak cukup untuk desain & setup toko (Rp ${MERCH.setup.toLocaleString('id-ID')}).`);
  c.merch = { open: true, platform: pid, orders: 0, pendingOrders: 0, openedDay: x.day }; c.stats.cost += MERCH.setup;
  addTx(c, x, { platform: pid, type: 'cost', source: 'merch', label: 'Setup toko merch (print on demand, tanpa stok)', gross: -MERCH.setup, fee: 0, tax: 0, net: -MERCH.setup, status: 'dibayar' });
  return ok('Toko merch dibuka. Pesanan bergantung pada penggemar aktif; dibayar tiap Senin.');
}

// ————————————————————————— aksi: peralatan & skill —————————————————————————
export function buyGear(id) {
  const c = C(), x = X(); let cat = null, it = null;
  for (const [k, v] of Object.entries(EQUIPMENT)) { const f = v.items.find(i => i.id === id); if (f) { cat = k; it = f; } }
  if (!it) return fail('Peralatan tidak ditemukan.');
  if (c.owned.includes(id)) { c.gear[cat] = id; return ok(`${it.name} dipakai.`); }
  if (it.cost > 0 && !x.spend(it.cost, 'kreator_alat')) return fail(`Saldo tidak cukup (butuh Rp ${it.cost.toLocaleString('id-ID')}).`);
  c.owned.push(id); c.gear[cat] = id; c.stats.cost += it.cost;
  if (it.cost) addTx(c, x, { platform: null, type: 'cost', source: 'alat', label: `Beli ${it.name}`, gross: -it.cost, fee: 0, tax: 0, net: -it.cost, status: 'dibayar' });
  x.log('kreator', `Peralatan baru: ${it.name}.`, it.cost ? -it.cost : null);
  return ok(`${it.name} dibeli dan dipakai.${it.monthly ? ` Biaya bulanan Rp ${it.monthly.toLocaleString('id-ID')} ditagih akhir bulan.` : ''}`);
}
export function train(skill, paid) {
  const c = C(), x = X(); if (!CREATOR_SKILLS[skill]) return fail('Skill tidak dikenal.');
  if (paid) {
    if (c.courseToday) return fail('Kelas kreator hanya sekali per hari.');
    if (!x.spend(300_000, 'kreator_kursus')) return fail('Saldo tidak cukup untuk kelas (Rp 300.000).');
    c.courseToday = true; c.skills[skill] = Math.min(100, c.skills[skill] + 4 * (1 - c.skills[skill] / 120)); c.stats.cost += 300_000;
    addTx(c, x, { platform: null, type: 'cost', source: 'kursus', label: `Kelas ${CREATOR_SKILLS[skill].name}`, gross: -300_000, fee: 0, tax: 0, net: -300_000, status: 'dibayar' });
    return ok(`${CREATOR_SKILLS[skill].name} naik melalui kelas.`);
  }
  if (c.trainedToday) return fail('Latihan mandiri sudah dilakukan hari ini.');
  if (x.weeklyFree() < 2) return fail('Waktu luang minggu ini kurang dari 2 jam.');
  if (x.energy() < 20) return fail('Energi terlalu rendah untuk latihan.');
  c.trainedToday = true; addHours(2); x.setEnergy(x.energy() - 8);
  c.skills[skill] = Math.min(100, c.skills[skill] + 1.2 * (1 - c.skills[skill] / 120));
  return ok(`Latihan mandiri ${CREATOR_SKILLS[skill].name} (2 jam).`);
}
function addHours(h) { const c = C(), x = X(), wk = Math.floor(x.day / 7); if (c.week !== wk) { c.week = wk; c.hoursWeek = 0; } c.hoursWeek += h; }
export function markNotesRead() { for (const n of C().notes) n.read = true; return ok(''); }

// ————————————————————————— hook per tick (30 menit) —————————————————————————
export function creatorTick(g) {
  const c = C(); if (!c) return; const x = X();
  // Energi karakter.
  const busy = busyAt(x, c, g);
  // Perubahan energi dasar (tidur, sekolah, kerja, waktu luang) dihitung engine kebutuhan (engine/needs.js)
  // sebelum hook ini; di sini hanya biaya energi produksi konten.
  let e = x.energy();
  // Editor lepas bekerja 08–20, paralel dengan karakter.
  const h = (g % T) / 2;
  if (h >= ED[0] && h < ED[1]) for (const id of c.queue) {
    const it = c.contents.find(k => k.id === id); if (!it || !inProduction(it) || it.paused) continue;
    const s = it.stages.find(s => s.done < s.hours); if (s?.outsourced) { if (!payStage(it, s)) continue; s.done += 0.5; it.hoursDone += 0.5; it.status = s.key; if (s.done >= s.hours) advance(it, g); }
  }
  // Karakter mengerjakan item teratas yang bisa dikerjakan.
  const wk = Math.floor(x.day / 7); if (c.week !== wk) { c.week = wk; c.hoursWeek = 0; }
  let worked = false;
  for (const id of c.queue) {
    const it = c.contents.find(k => k.id === id); if (!it || !inProduction(it)) continue;
    if (it.paused) { it.wait = 'Dijeda'; continue; }
    const s = it.stages.find(s => s.done < s.hours); if (!s) { advance(it, g); continue; }
    if (s.outsourced) { it.wait = h >= ED[0] && h < ED[1] ? null : `Editor lepas bekerja ${String(ED[0]).padStart(2, "0")}.00–${ED[1]}.00`; continue; }
    if (worked) { it.wait = 'Menunggu giliran'; continue; }
    if (busy) { it.wait = { tidur: 'Karakter tidur', sekolah: 'Karakter di sekolah', kerja: 'Karakter bekerja', live: 'Karakter sedang live', aktivitas: 'Karakter sedang aktivitas pribadi (makan/mandi/istirahat)' }[busy]; continue; }
    if (c.hoursToday >= c.settings.dailyHours) { it.wait = `Batas ${c.settings.dailyHours} jam kreator hari ini tercapai`; continue; }
    if (x.weeklyFree() <= 0) { it.wait = 'Waktu luang minggu ini habis'; continue; }
    if (e < 20) { it.wait = 'Energi karakter rendah (< 20)'; continue; }
    if (!payStage(it, s)) { it.wait = `Menunggu dana Rp ${s.cost.toLocaleString('id-ID')} untuk tahap ${STAGES.find(x => x.key === s.key).label.toLowerCase()}`; continue; }
    it.wait = null; it.status = s.key; s.done += 0.5; it.hoursDone += 0.5; worked = true;
    c.hoursToday += 0.5; addHours(0.5); e -= 3;
    if (s.key === 'record' || s.key === 'edit') { it.energySum += e; it.energyN++; }
    const sk = STAGES.find(x => x.key === s.key).skill; c.skills[sk] = Math.min(100, c.skills[sk] + 0.5 * 0.35 * (1 - c.skills[sk] / 120));
    if (s.done >= s.hours) {
      // Risiko file rekaman rusak (keandalan kamera) — tahap rekam diulang sekali.
      if (s.key === 'record' && it.recFails === 0 && hrand(x.seed, 'recfail', it.id) > gearItem('camera', it.gearUsed.camera).reliability) {
        it.recFails++; s.done = 0; it.hoursDone -= s.hours; note(c, x, 'production', `File rekaman "${it.title}" rusak — tahap perekaman diulang (biaya tidak ditagih ulang).`, it.platform);
      } else advance(it, g);
    }
  }
  x.setEnergy(e);
  // Publikasi terjadwal.
  for (const it of c.contents) if (it.status === 'scheduled' && it.scheduleG <= g + 1) { if (c.accounts[it.platform].terminated) { it.status = 'failed'; it.failReason = 'Akun ditutup sebelum jadwal terbit.'; continue; } doPublish(it, g + 1); note(c, x, 'production', `"${it.title}" terbit sesuai jadwal${it.premiere ? ' (Premiere)' : ''}.`, it.platform); }
  // Distribusi & metrik konten terbit (sampai 120 hari).
  for (const it of c.contents) {
    if (it.status !== 'published' || it.expired || g - it.publishedG > 120 * T) continue;
    const acc = c.accounts[it.platform]; const inc = contentTick(it, acc, c, x, g); if (!inc) continue;
    const td = acc.today; td.views += inc.views; td.impr += inc.impr; td.reach += inc.reach; td.watchSec += inc.watch; td.likes += inc.likes; td.comments += inc.comments; td.shares += inc.shares; td.saves += inc.saves; td.pv += inc.pv; td.gained += inc.follows;
    if (it.format === 'long') td.watchLong += inc.watch; if (it.format === 'shorts') td.shortsViews += inc.views;
    acc.followers += inc.follows; acc.totalViews += inc.views; acc.peak = Math.max(acc.peak, acc.followers);
    it._today = it._today || [0, 0, 0, 0, 0, 0]; it._today[0] += inc.views; it._today[1] += inc.impr; it._today[2] += inc.likes; it._today[3] += inc.shares; it._today[4] += inc.follows;
    const rev = adAccrual(it, acc, inc, x); it._today[5] += rev;
  }
  // Live terjadwal.
  for (const s of c.scheduledLives) {
    if (s.status === 'terjadwal' && g + 1 >= s.at) { s.status = 'waktunya'; note(c, x, 'live', `Waktunya live terjadwal: "${s.title}" di ${PLATFORMS[s.platform].name}.`, s.platform); }
    else if (s.status === 'waktunya' && g > s.at + 4) { s.status = 'terlewat'; const a = c.accounts[s.platform]; if (a) a.rep = clamp(a.rep - 1, 0, 100); note(c, x, 'live', `Live terjadwal "${s.title}" terlewat. Sebagian follower kecewa (reputasi −1).`, s.platform); }
  }
}
function payStage(it, s) {
  if (s.paid || s.cost <= 0) { s.paid = true; return true; }
  const x = X(), c = C();
  if (!x.spend(s.cost, 'kreator_produksi')) return false;
  s.paid = true; it.costSpent += s.cost; c.stats.cost += s.cost; c.accounts[it.platform].today.cost += s.cost;
  return true;
}
function advance(it, g) {
  if (it.stages.some(s => s.done < s.hours)) return;
  const c = C(), x = X(), acc = c.accounts[it.platform];
  it.q = finalQuality(it, c, acc, x); it.readyG = g + 1; it.wait = null; c.queue = c.queue.filter(q => q !== it.id);
  if (it.after === 'schedule' && it.scheduleG > g + 1) { it.status = 'scheduled'; note(c, x, 'production', `"${it.title}" selesai diproduksi dan menunggu jadwal terbit.`, it.platform); }
  else if (it.after === 'auto' || (it.after === 'schedule' && it.scheduleG <= g + 1)) { it.status = 'ready'; doPublish(it, g + 1); note(c, x, 'production', `"${it.title}" selesai dan langsung terbit (opsi terbit otomatis).`, it.platform); }
  else { it.status = 'ready'; note(c, x, 'production', `"${it.title}" siap dipublikasikan.`, it.platform); }
  x.addXp(2);
}

// ————————————————————————— hook akhir hari —————————————————————————
export function creatorDay(d, isMonthEnd, domNext) {
  const c = C(); if (!c) return; const x = X();
  for (const acc of Object.values(c.accounts)) {
    const recent = c.contents.filter(k => k.platform === acc.id && k.status === 'published').slice(-10);
    const lost = churn(acc, c, x, d, { clickbaitLow: recent.slice(-3).some(k => k.flags.misleading), sponsoredShare: recent.length ? recent.filter(k => k.sponsorContract).length / recent.length : 0 });
    acc.followers = Math.max(0, acc.followers - lost); acc.today.lost += lost;
    acc.momentum = clamp(1 + (acc.momentum - 1) * 0.97, 0.4, 2.5);
    acc.daily.push({ d, ...acc.today, followers: acc.followers });
    if (acc.daily.length > 120) acc.daily.shift();
    acc.today = blankDay();
  }
  for (const it of c.contents) {
    if (it.status !== 'published') continue;
    if (it._today) { it.hist.push([d, ...it._today.map(v => Math.round(v * 10) / 10)]); if (it.hist.length > 60) it.hist.shift(); it._today = null; }
    const age = d - dayOfG(it.publishedG);
    if (age === 3 && !it.measured) {
      const f = PLATFORMS[it.platform].formats[it.format], conv = f.viewRule === 'click' ? f.ctr : f.viewRule === 'feed' ? f.stay : 1;
      const r = clamp(it.m.views / Math.max(1, it.dist.E0 * 3 * conv), 0.2, 4); const acc = c.accounts[it.platform];
      acc.momentum = clamp(acc.momentum * Math.pow(r, 0.25), 0.4, 2.5); it.measured = Math.round(r * 100) / 100;
    }
    if (resurfaceCheck(it, x, d)) note(c, x, 'growth', `"${it.title}" kembali direkomendasikan — tayangan naik lagi.`, it.platform);
  }
  updatePrograms(c, x);
  dayEnd(c, x, d);
  const wdNext = weekdayOf(d + 1);
  if (wdNext === 1) weeklyOffers(c, x, d + 1);
  if (isMonthEnd) {
    monthEnd(c, x, d);
    for (const cat of ['internet', 'software']) {
      const it = gearItem(cat, c.gear[cat]); if (!it.monthly) continue;
      if (x.spend(it.monthly, 'kreator_langganan')) { c.stats.cost += it.monthly; addTx(c, x, { platform: null, type: 'cost', source: 'langganan', label: `Langganan ${it.name}`, gross: -it.monthly, fee: 0, tax: 0, net: -it.monthly, status: 'dibayar' }); }
      else { c.gear[cat] = DEFAULT_GEAR[cat]; note(c, x, 'production', `Saldo tidak cukup untuk langganan ${it.name}; kembali ke ${gearItem(cat, DEFAULT_GEAR[cat]).name}.`); }
    }
  }
  payoutDay(c, x, d, domNext);
  c.hoursToday = 0; c.trainedToday = false; c.courseToday = false;
  c.costDaily.push([d, Object.values(c.accounts).reduce((s, a) => s + (a.daily[a.daily.length - 1]?.cost || 0), 0)]); if (c.costDaily.length > 120) c.costDaily.shift();
  // Kompaksi: konten > 120 hari berhenti disimulasikan & riwayat harian dipangkas.
  for (const it of c.contents) if (it.status === 'published' && d - dayOfG(it.publishedG) > 120 && it.hist.length > 14) it.hist = it.hist.slice(-14);
  const dead = c.contents.filter(k => k.status === 'cancelled'); if (dead.length > 40) { const rm = new Set(dead.slice(0, dead.length - 40).map(k => k.id)); c.contents = c.contents.filter(k => !rm.has(k.id)); }
}

// ————————————————————————— agregat analytics —————————————————————————
export function accountSeries(pid, key, days = 30) {
  const acc = C().accounts[pid]; if (!acc) return [];
  return acc.daily.filter(r => !r.legacy).slice(-days).map(r => [r.d, r[key] || 0]);
}
export function totals(pid, days) {
  const acc = C().accounts[pid], x = X(); const out = blankDay();
  for (const r of acc.daily) if (!r.legacy && r.d > x.day - days) for (const k of Object.keys(out)) out[k] += r[k] || 0;
  for (const k of Object.keys(out)) out[k] += acc.today[k] || 0;
  return out;
}
export { trend, nicheOf, inProduction, STAGES };
export const formatLocksFor = (pid, fid) => { const acc = C().accounts[pid]; return acc ? formatLocks(acc, fid, X()) : ['Buat akun dulu.']; };
export const nowG = () => X().g;
