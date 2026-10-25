// AUDIENCE SIMULATION — tren topik, distribusi rekomendasi, follower churn, dan penonton live.
// Semua variasi berasal dari hrand/hnorm (seed + kunci), sehingga dapat direproduksi.
import { PLATFORMS, NICHES, ACTIVITY, WEEKEND, STREAM_Q, LIVE_ACTIONS, CHAT_LINES, VIEWER_NAMES } from '../../data/creator-platforms.js';
import { weekdayOf } from '../calendar.js';
import { hrand, hnorm, clamp } from '../rng.js';
import { gearItem, dayOfG, gOfDay, W } from './rules.js';

export const nicheOf = id => NICHES.find(n => n.id === id);
const T = 48; // tick per hari (30 menit)

// ————————————————————————— tren & persaingan (value noise halus, tanpa state) —————————————————————————
function vnoise(seed, key, x) {
  const i = Math.floor(x), f = x - i, a = hnorm(seed, 'vn', key, i), b = hnorm(seed, 'vn', key, i + 1);
  const t = (1 - Math.cos(Math.PI * f)) / 2; return a * (1 - t) + b * t;
}
/** Peristiwa tren (mis. turnamen, musim ujian) per niche: blok 30 hari, peluang 40%, 3–6 hari. */
export function trendEvent(seed, niche, d) {
  const blk = Math.floor(d / 30); if (hrand(seed, 'tev', niche, blk) > 0.4) return null;
  const start = blk * 30 + Math.floor(hrand(seed, 'tev-s', niche, blk) * 24), len = 3 + Math.floor(hrand(seed, 'tev-l', niche, blk) * 4);
  if (d < start || d >= start + len) return { upcoming: d < start ? start : null, start, len, bump: 0 };
  const p = (d - start + 0.5) / len; return { start, len, bump: (0.5 + 0.6 * hrand(seed, 'tev-b', niche, blk)) * Math.sin(Math.PI * p), active: true };
}
export function trend(seed, pid, nid, d) {
  const n = nicheOf(nid); if (!n) return 1;
  const ev = trendEvent(seed, nid, Math.floor(d));
  return Math.exp(n.trendVol * (0.6 * vnoise(seed, 'tr' + nid, d / 9) + 0.4 * vnoise(seed, 'tr2' + nid, d / 3)) + 0.12 * vnoise(seed, 'tp' + pid + nid, d / 12) + (ev?.bump || 0));
}
export function competition(seed, pid, nid, d) {
  const n = nicheOf(nid); return clamp(n.competition * Math.exp(0.15 * vnoise(seed, 'cp' + pid + nid, d / 14)), 0.15, 0.98);
}
const meanAct = Object.fromEntries(Object.entries(ACTIVITY).map(([k, a]) => [k, a.reduce((s, x) => s + x, 0) / a.length]));
export const activityAt = (pid, hour, weekend) => ACTIVITY[pid][hour] / meanAct[pid] * (weekend ? WEEKEND[pid] : 1);
/** Rekomendasi jam posting dari kurva aktivitas platform (bukan angka acak). */
export function bestHours(pid, n = 3) { return ACTIVITY[pid].map((v, h) => [h, v]).sort((a, b) => b[1] - a[1]).slice(0, n).map(x => x[0]).sort((a, b) => a - b); }

// ————————————————————————— konten: distribusi rekomendasi —————————————————————————
const POOL = { youtube: 2.5e6, tiktok: 6e6, instagram: 3.5e6 };
// Audiens uji awal (cold start): platform menguji konten baru ke sejumlah kecil non-follower (impresi/hari).
const COLD = { 'youtube.long': 220, 'youtube.shorts': 900, 'tiktok.video': 1100, 'tiktok.photo': 450, 'instagram.reels': 700, 'instagram.carousel': 160, 'instagram.photo': 90 };

/** Impresi awal per hari (E0) saat publish + komposisi sumber. */
export function initialExposure(c, acc, C, ctx, g) {
  const P = PLATFORMS[c.platform], f = P.formats[c.format], n = nicheOf(c.niche), d = g / T - W;
  const days = acc.lastPostDay == null ? 0 : Math.max(0, ctx.day - acc.lastPostDay);
  const active = clamp(0.55 + 0.45 * Math.min(1, acc.rep / 60), 0.3, 1) * (days > 14 ? 0.8 : 1);
  let fol = acc.followers * f.followerReach * active * (c.premiere ? 1.35 : 1);
  const tr = trend(ctx.seed, c.platform, c.niche, d), comp = competition(ctx.seed, c.platform, c.niche, d);
  const nicheMatch = c.niche === acc.niche ? 1 : 0.8;
  let disc = f.discovery * n.audience * (n.fit[c.platform] || 1) * tr * (1 - 0.5 * comp) * (0.6 + 0.8 * acc.rep / 100) * acc.momentum * (1 + Math.log10(1 + acc.followers) / 6) * nicheMatch;
  disc += (COLD[`${c.platform}.${c.format}`] || 0) * (0.5 + hrand(ctx.seed, 'cold', c.id)) * clamp(n.audience * tr, 0.4, 1.6);
  const collab = c.collab ? (C.collabs.find(x => x.id === c.collab)?.followers || 0) * 0.025 : 0;
  const hour = Math.floor((g % T) / 2), wd = weekdayOf(Math.floor(d));
  const slot = Math.pow(activityAt(c.platform, hour, wd === 0 || wd === 6), 0.6);
  const E0 = Math.max(f.viewRule === 'story' || f.viewRule === 'impr' ? 0.5 : 8, (fol + disc + collab) * slot);
  return { E0, parts: { followers: fol * slot, discovery: disc * slot, collab: collab * slot }, trend0: tr, comp, slot };
}

/** Kekuatan sinyal intrinsik konten relatif terhadap rata-rata format (1 = rata-rata). */
export function signal(c) {
  const f = PLATFORMS[c.platform].formats[c.format], q = c.q;
  const ctrR = f.viewRule === 'click' ? q.ctr / f.ctr : f.viewRule === 'feed' ? q.stay / f.stay : 1;
  return Math.pow(Math.max(0.05, ctrR), 0.7) * Math.pow(Math.max(0.05, q.ret / f.ret), 1.3) * Math.pow(Math.max(0.05, q.eng / f.eng), 0.6);
}

/** Batas jangkauan seumur konten (audiens potensial) — tumbuh logaritmik terhadap follower agar tidak terjadi umpan balik tak hingga. */
export function capOf(c, acc) {
  const n = nicheOf(c.niche), f = PLATFORMS[c.platform].formats[c.format];
  const fmt = f.kind === 'video' ? 1 : f.viewRule === 'story' ? 0.05 : 0.35;
  return POOL[c.platform] * fmt * n.audience * (n.fit[c.platform] || 1) * (1 + Math.log10(1 + acc.followers) / 2);
}

/** Satu tick distribusi untuk satu konten terbit. Mengembalikan pertambahan metrik. */
export function contentTick(c, acc, C, ctx, g) {
  const P = PLATFORMS[c.platform], f = P.formats[c.format], n = nicheOf(c.niche), D = c.dist, q = c.q;
  const ageT = g - c.publishedG; if (ageT < 0) return null;
  if (f.expiresH && ageT >= f.expiresH * 2) { if (!c.expired) { c.expired = true; } return null; }
  // Evaluasi ulang algoritma: tiap 2 jam (24 jam pertama), 6 jam (s.d. 4 hari), lalu harian.
  if (g >= D.nextEval) {
    const dtDays = (g - D.lastEval) / T; D.k++;
    // Kejenuhan: audiens yang tertarik pada satu konten terbatas; makin banyak yang sudah dijangkau, makin lemah dorongan algoritma.
    const cap = capOf(c, acc), sat = Math.pow(Math.max(0.03, 1 - c.m.reach / cap), 2.2);
    const P0 = D.sig * Math.exp(f.varSigma * 0.55 * hnorm(ctx.seed, 'ev', c.id, D.k)) * sat;
    const trNow = trend(ctx.seed, c.platform, c.niche, g / T - W), trRatio = trNow / D.trendPrev; D.trendPrev = trNow;
    const ageDays = ageT / T, P1 = P0 * Math.exp(-ageDays / (f.halfLife * 6 + 3)); // dorongan algoritma memudar seiring umur konten
    const rate = f.sensitivity * 1.9 * Math.log(Math.max(0.05, P1)) - Math.LN2 / f.halfLife;
    D.E = D.E * Math.exp(clamp(rate * dtDays, -3, 2.2)) * Math.pow(trRatio, 1.2);
    D.peakE = Math.max(D.peakE || 0, D.E);
    const floor = Math.max(D.E0 * f.tail, D.peakE * f.tail * 0.15) * (0.5 + 2 * n.evergreen) * (c.flags.claimed ? 0.6 : 1);
    if (D.E < floor) D.E = floor;
    D.E = Math.min(D.E, cap * 0.12); // batas jangkauan harian
    D.lastEval = g; const ah = ageT / 2; D.nextEval = g + (ah < 24 ? 4 : ah < 96 ? 12 : 48);
    D.lastP = P0;
  }
  const hour = Math.floor((g % T) / 2), d = dayOfG(g);
  const wd = weekdayOf(d);
  const impr = D.E / T * activityAt(c.platform, hour, wd === 0 || wd === 6) * Math.exp(0.12 * hnorm(ctx.seed, 'ct', c.id, g));
  if (impr <= 0) return null;
  let views;
  if (f.viewRule === 'click') views = impr * q.ctr;
  else if (f.viewRule === 'feed') views = impr * q.stay;
  else views = impr; // impr/reach/story: view = tampil
  if (c.flags.muted) views *= 0.6;
  const reach = impr / (f.freq || 1.2);
  const dur = c.dur || 0, watch = f.kind === 'video' ? views * dur * q.ret : 0;
  const eng = q.eng, A = c.angleCfg || {};
  const likes = views * eng * 0.75, comments = views * eng * 0.06 * n.chat;
  const shares = views * eng * 0.08 * n.share * (A.share || 1), saves = (c.platform === 'youtube' ? 0 : views * eng * 0.07 * n.save * (A.save || 1));
  const pv = c.platform === 'youtube' ? 0 : views * 0.012 * (0.5 + q.idea);
  const follows = views * f.follow * (0.5 + q.overall) * (c.niche === acc.niche ? 1 : 0.7) * (c.sponsorContract ? 0.85 : 1) * (c.collab ? 1.2 : 1) * (1 + (C.skills.audience || 0) / 200);
  const completes = f.kind === 'video' ? views * Math.pow(q.ret, f.viewRule === 'feed' ? 1.4 : 2.2) : 0;
  // Komposisi sumber tayangan (untuk analytics "sumber pertumbuhan").
  const ageD = ageT / T, folShare = clamp((D.parts.followers / D.E0) * Math.exp(-ageD / 0.9), 0, 1);
  const resShare = D.resurfaceG && g - D.resurfaceG < 2 * T ? 0.7 : 0, searchShare = c.format === 'long' ? clamp(1 - D.E / D.E0, 0, 0.8) * n.evergreen : 0;
  const colShare = c.collab ? clamp(D.parts.collab / D.E0, 0, 0.6) * Math.exp(-ageD) : 0;
  const rest = Math.max(0, 1 - folShare - resShare - searchShare - colShare);
  const m = c.m; m.impr += impr; m.views += views; m.reach += reach; m.watchSec += watch; m.likes += likes; m.comments += comments; m.shares += shares; m.saves += saves; m.pv += pv; m.follows += follows; m.completes += completes;
  m.src.followers += views * folShare; m.src.resurface += views * resShare; m.src.search += views * searchShare; m.src.collab += views * colShare; m.src.discovery += views * rest;
  return { impr, views, reach, watch, likes, comments, shares, saves, pv, follows, completes };
}

/** Peluang konten lama kembali direkomendasikan (sekali sehari per konten). */
export function resurfaceCheck(c, ctx, d) {
  const f = PLATFORMS[c.platform].formats[c.format], n = nicheOf(c.niche), D = c.dist;
  if (f.expiresH || d - dayOfG(c.publishedG) < 4 || (D.lastP || D.sig) < 0.85) return false;
  const trRatio = trend(ctx.seed, c.platform, c.niche, d) / D.trend0;
  const p = 0.002 + 0.01 * n.evergreen * (c.platform === 'youtube' ? 1.5 : 0.7) + (trRatio > 1.3 ? 0.035 : 0);
  if (hrand(ctx.seed, 'resurf', c.id, d) >= p) return false;
  D.E = Math.max(D.E, D.E0 * (0.5 + 1.4 * hrand(ctx.seed, 'resurf-m', c.id, d))); D.resurfaceG = gOfDay(d); c.flags.resurfaced = (c.flags.resurfaced || 0) + 1;
  D.nextEval = Math.min(D.nextEval, gOfDay(d) + 4);
  return true;
}

/** Follower yang berhenti mengikuti hari ini (churn). Bisa membuat follower turun. */
export function churn(acc, C, ctx, d, recent) {
  const days = acc.lastPostDay == null ? 0 : d - acc.lastPostDay;
  let rate = 0.0006 + Math.min(30, Math.max(0, days - 7)) * 0.00012;
  if (acc.momentum < 0.7) rate += 0.001;
  if (recent.clickbaitLow) rate += 0.002;
  if (recent.sponsoredShare > 0.4) rate += 0.0015;
  rate = Math.min(rate, 0.006) * (1 - (C.skills.audience || 0) / 250);
  return acc.followers * rate * Math.exp(0.25 * hnorm(ctx.seed, 'churn', acc.id, d));
}

// ————————————————————————— LIVE: penonton per menit —————————————————————————
export function liveQuality(L, C) {
  const cam = gearItem('camera', C.gear.camera), mic = gearItem('audio', C.gear.audio), light = gearItem('light', C.gear.light), net = gearItem('internet', C.gear.internet);
  const sq = STREAM_Q[L.quality];
  const netOk = net.net >= sq.need;
  const stable = net.stable * (netOk ? 1 : 0.82) * (L.quality === '1080p' && net.id === 'net_data' ? 0.92 : 1);
  return { q: (cam.stream * 0.4 + mic.audio * 0.35 + light.light * 0.25) * sq.q, stable, netOk };
}

export function liveMinute(L, acc, C, ctx) {
  const P = PLATFORMS[L.platform], cfg = P.live, n = nicheOf(L.niche), m = ++L.minute, sd = ctx.seed;
  const hour = Math.floor((ctx.g % T) / 2), wd = weekdayOf(ctx.day);
  const act = activityAt(L.platform, hour, wd === 0 || wd === 6);
  const eff = k => L.effects.filter(e => e.until >= m).reduce((s, e) => s * (LIVE_ACTIONS[e.key].effect[k] || 1), 1);
  const lq = liveQuality(L, C), host = (C.skills.live || 0) / 100, pres = (C.skills.presentation || 0) / 100;
  const energy = ctx.energy();
  // Gangguan koneksi: peluang per menit tergantung stabilitas internet.
  if (m > L.lagUntil && hrand(sd, 'lag', L.id, m) > lq.stable + (1 - lq.stable) * 0.6) { L.lagUntil = m + 3; L.lagCount++; L.feed.unshift({ m, t: 'sys', text: 'Koneksi tidak stabil — kualitas stream turun sementara.' }); }
  const lag = m <= L.lagUntil;
  const tr = trend(sd, L.platform, L.niche, ctx.g / T - W);
  const early = m <= 10 ? 1.6 : m <= 30 ? 1 : 0.55; // notifikasi follower paling banyak di awal
  const notify = acc.followers * cfg.notifyRate * act * (L.scheduled ? 1.5 : 1) * early / 30;
  const algo = cfg.discovery * n.audience * (n.fit[L.platform] || 1) * tr * act * lq.q * (0.6 + 0.8 * acc.rep / 100) * (1 + Math.min(2, L.ccv / 40) * (L.chatRateRecent || 0.1)) * eff('discovery');
  const arrivals = Math.max(0, (notify + algo) * Math.exp(0.3 * hnorm(sd, 'arr', L.id, m)));
  const stay = cfg.stay * (0.55 + 0.45 * lq.q) * (0.7 + 0.5 * host + 0.2 * pres) * (energy < 25 ? 0.8 : 1) * eff('stay') * (lag ? 0.45 : 1) * (n.chat > 1.1 ? 1.08 : 1);
  const leave = L.ccv / Math.max(0.5, stay);
  L.ccv = Math.max(0, L.ccv + arrivals - leave);
  L.unique += arrivals * 0.92; L.peak = Math.max(L.peak, L.ccv); L.ccvSum += L.ccv;
  const fol = arrivals * cfg.follow * (0.6 + host) * eff('follow') * (acc.followers < 50 ? 1.3 : 1);
  L.follows += fol;
  const chat = L.ccv * cfg.chat * (0.6 + host + 0.3 * pres) * n.chat * eff('chat') * Math.exp(0.25 * hnorm(sd, 'chat', L.id, m));
  L.chat += chat; L.chatRateRecent = L.ccv > 0 ? chat / Math.max(1, L.ccv) : 0;
  L.likes += L.ccv * cfg.like * (0.6 + 0.6 * pres) * eff('chat');
  L.series.push([m, Math.round(L.ccv)]);
  // Baris chat contoh (teks hiasan; jumlah chat berasal dari model di atas).
  const shown = Math.min(3, Math.floor(chat / 4 + hrand(sd, 'chs', L.id, m)));
  for (let i = 0; i < shown; i++) {
    const pool = lag && i === 0 ? CHAT_LINES.lag : L.effects.some(e => e.until >= m && e.key === 'goal') && i === 0 ? CHAT_LINES.goal : L.effects.some(e => e.until >= m && e.key === 'tantangan') && i === 0 ? CHAT_LINES.tantangan : CHAT_LINES.any;
    L.feed.unshift({ m, t: 'chat', who: VIEWER_NAMES[Math.floor(hrand(sd, 'chw', L.id, m, i) * VIEWER_NAMES.length)] + Math.floor(hrand(sd, 'chn', L.id, m, i) * 90 + 10), text: pool[Math.floor(hrand(sd, 'cht', L.id, m, i) * pool.length)] });
  }
  if (L.feed.length > 60) L.feed.length = 60;
  // Dukungan penonton sesuai capability platform & program yang aktif.
  const gifts = [];
  for (const sid of L.supports) {
    if (sid === 'membership') continue;
    const S = P.support[sid]; if (!S) continue;
    const lambda = L.ccv * S.rate * (0.6 + host) * eff('gift') * (acc.rep / 60) * (lag ? 0.5 : 1);
    let k = 0; const u = hrand(sd, 'gift', L.id, sid, m);
    // Poisson deterministik dari satu uniform (inversi CDF).
    let p = Math.exp(-lambda), cdf = p; while (u > cdf && k < 40) { k++; p *= lambda / k; cdf += p; }
    for (let i = 0; i < k; i++) gifts.push(pickGift(S, sid, sd, L.id, m, i, P));
  }
  return { arrivals, gifts, lag };
}
function pickGift(S, sid, sd, lid, m, i, P) {
  const who = VIEWER_NAMES[Math.floor(hrand(sd, 'gw', lid, m, i) * VIEWER_NAMES.length)] + Math.floor(hrand(sd, 'gwn', lid, m, i) * 90 + 10);
  if (S.unit === 'coin') {
    const tot = S.items.reduce((s, x) => s + x.w, 0); let r = hrand(sd, 'gt', lid, m, i) * tot, it = S.items[0];
    for (const x of S.items) { r -= x.w; if (r <= 0) { it = x; break; } }
    const diamonds = it.coins * S.diamondPerCoin, net = diamonds * S.idrPerDiamond;
    return { sid, name: it.name, type: S.name, coins: it.coins, viewerIdr: it.coins * S.coinPrice, diamonds, fee: it.coins * S.coinPrice - net, net, who, m };
  }
  const tot = S.weights.reduce((s, x) => s + x, 0); let r = hrand(sd, 'gt', lid, m, i) * tot, k = 0;
  for (; k < S.weights.length - 1; k++) { r -= S.weights[k]; if (r <= 0) break; }
  const gross = S.tiers[k]; return { sid, name: S.name, type: S.name, gross, fee: gross * (1 - S.share), net: gross * S.share, who, m };
}
