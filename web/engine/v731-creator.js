/* GENERATED dari netlify/functions/v731-creator.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
// BizSim 7.3.1: Content Creator Studio multi-platform. SIMULATION ONLY.
// Nama platform hanyalah representasi dalam game. Semua angka (syarat monetisasi, RPM, fee, nilai koin) adalah ATURAN SIMULASI BizSim,
// bukan aturan resmi platform mana pun. Semua hasil dihitung dari state game + seed deterministik, tidak ada angka acak saat render UI.
import { DAY_HOOKS } from './v700-engine.js';
import { rngFor, gauss, clamp } from './v655.js';
export const VERSION = '7.3.1';
const R = Math.round, fm = n => 'Rp' + R(n).toLocaleString('id-ID');

export const TOPICS = {
  gaming: { n: 'Gaming', aud: 1.25, comp: 1.3, cost: 1, cx: 1 }, edukasi: { n: 'Edukasi', aud: .8, comp: .7, cost: 1, cx: 1.3 },
  teknologi: { n: 'Teknologi', aud: 1, comp: 1, cost: 1.2, cx: 1.3 }, komedi: { n: 'Komedi', aud: 1.2, comp: 1.2, cost: .9, cx: 1.1, risk: .03 },
  lifestyle: { n: 'Lifestyle', aud: 1.05, comp: 1.1, cost: 1, cx: 1 }, bisnis: { n: 'Bisnis', aud: .85, comp: .8, cost: 1, cx: 1.2 },
  musik: { n: 'Musik', aud: 1.1, comp: 1.2, cost: 1.1, cx: 1.2, risk: .05 }, olahraga: { n: 'Olahraga', aud: 1, comp: 1, cost: 1, cx: 1.1 },
  kuliner: { n: 'Kuliner', aud: 1.1, comp: 1, cost: 1.1, cx: 1 }
};
export const QUALITY = { low: { n: 'Rendah', s: .7, c: .6, t: .7, live: 15000 }, medium: { n: 'Sedang', s: 1, c: 1, t: 1, live: 30000 }, high: { n: 'Tinggi', s: 1.3, c: 1.8, t: 1.5, live: 70000 } };
export const SKILL_NAMES = { research: 'Research', storytelling: 'Storytelling', recording: 'Recording', editing: 'Editing', presentation: 'Presentation', audience: 'Audience Mgmt', liveHosting: 'Live Hosting', marketing: 'Marketing' };
export const EQUIP = { camera: { n: 'Kamera', costs: [1500000, 4000000, 9000000, 20000000] }, mic: { n: 'Mikrofon', costs: [500000, 1500000, 4000000, 9000000] }, light: { n: 'Lighting', costs: [400000, 1200000, 3000000, 7000000] }, editing: { n: 'Software Editing', costs: [600000, 2000000, 5000000, 12000000] } };
export const TIERS = [[0, 'Beginner Creator'], [1000, 'Growing Creator'], [10000, 'Established Creator'], [100000, 'Professional Creator']];
const BRANDS = ['Nusa Gadget', 'Kopi Senja', 'Arunika Fashion', 'PasarKita', 'Lumina Skincare', 'Garuda Sport', 'Rasa Nusantara', 'BizWorks'];
const TOPIC_KEYS = Object.keys(TOPICS);

/* capability configuration per platform: jangan menyalin fitur satu platform ke platform lain */
export const PLATFORMS = {
  youtube: {
    n: 'YouTube', fol: 'Subscriber', main: 'Views', enabled: true, liveRate: .02, giftRate: 1, coinRp: 1, fee: .3, rpm: 18000, share: .55,
    types: { long: { n: 'Video Panjang', h: 14, c: 600000, r: 1, dur: 600, sk: ['research', 'storytelling', 'recording', 'editing'] }, shorts: { n: 'YouTube Shorts', h: 4, c: 150000, r: 1.3, dur: 40, sk: ['storytelling', 'editing'] }, community: { n: 'Community Post', h: 1.5, c: 30000, r: .5, dur: 0, sk: ['storytelling', 'audience'] } },
    gifts: [{ n: 'Super Chat Rp10.000', coins: 10000, w: 5 }, { n: 'Super Chat Rp50.000', coins: 50000, w: 2 }, { n: 'Super Sticker', coins: 20000, w: 3 }],
    req: { ads: { fol: 1000, watch: 4000 }, gifts: { fol: 500 }, memberships: { fol: 1000 }, sponsorship: { fol: 500 }, affiliate: { fol: 300 }, merch: null },
    metrics: ['Views', 'Watch time (jam)', 'Avg view duration', 'Retention', 'Subscribers gained', 'Estimated revenue']
  },
  tiktok: {
    n: 'TikTok', fol: 'Followers', main: 'Video views', enabled: true, liveRate: .03, giftRate: 1.6, coinRp: 150, fee: .5, rpm: 9000, share: .5,
    types: { video: { n: 'Video Pendek', h: 3, c: 120000, r: 1.5, dur: 30, sk: ['storytelling', 'editing'] }, photo: { n: 'Photo Carousel', h: 1.5, c: 50000, r: .8, dur: 0, sk: ['storytelling', 'presentation'] }, story: { n: 'Story', h: .5, c: 10000, r: .4, dur: 0, sk: ['audience'] } },
    gifts: [{ n: 'Mawar', coins: 1, w: 10 }, { n: 'Panda', coins: 5, w: 5 }, { n: 'Singa', coins: 299, w: .5 }],
    req: { ads: { fol: 1000, views: 10000 }, gifts: { fol: 1000, lives: 1 }, memberships: null, sponsorship: { fol: 500 }, affiliate: { fol: 300 }, merch: null },
    metrics: ['Video views', 'Completion rate', 'Average watch time', 'Shares', 'Followers gained', 'Live performance']
  },
  instagram: {
    n: 'Instagram', fol: 'Followers', main: 'Reach', enabled: true, liveRate: .025, giftRate: .8, coinRp: 13, fee: .3, rpm: 0, share: 0,
    types: { feed: { n: 'Feed Foto', h: 2, c: 60000, r: .7, dur: 0, sk: ['presentation', 'storytelling'] }, carousel: { n: 'Carousel', h: 3, c: 90000, r: .9, dur: 0, sk: ['presentation', 'storytelling'] }, reels: { n: 'Reels', h: 4, c: 150000, r: 1.2, dur: 30, sk: ['storytelling', 'editing'] }, story: { n: 'Story', h: .5, c: 10000, r: .4, dur: 0, sk: ['audience'] } },
    gifts: [{ n: 'Stars 100', coins: 100, w: 6 }, { n: 'Stars 500', coins: 500, w: 2 }],
    req: { ads: null, gifts: { fol: 1000 }, memberships: { fol: 2000 }, sponsorship: { fol: 500 }, affiliate: { fol: 300 }, merch: null },
    metrics: ['Reach', 'Impressions', 'Likes', 'Saves', 'Shares', 'Profile visits', 'Followers gained']
  },
  twitch: { n: 'Twitch', fol: 'Followers', main: 'Views', enabled: false, note: 'Slot platform tambahan: tinggal isi capability config (types, gifts, req) untuk mengaktifkan.', types: {}, gifts: [], req: {} }
};

export function ensure731(s) {
  if (!s.v731) s.v731 = { version: VERSION };
  const v = s.v731; v.version = VERSION;
  const x = v.creator ||= { nid: 0, accounts: {}, queue: [], published: [], live: null, liveReports: [], gifts: [], payouts: [], ledger: [], skills: {}, equip: {}, lastLive: {} };
  for (const k of Object.keys(SKILL_NAMES)) x.skills[k] ??= 15;
  for (const k of Object.keys(EQUIP)) x.equip[k] ??= 1;
  return v;
}
const skillAvg = (x, list) => list.reduce((a, k) => a + (x.skills[k] || 15), 0) / (list.length || 1);
const equipF = x => 1 + .08 * (Object.values(x.equip).reduce((a, b) => a + b, 0) / 4 - 1);
const slots = s => s.career?.status === 'employed' ? 2 : 3;
const hoursPerDay = s => s.career?.status === 'employed' ? 3 : 6;
const need = (acc, k) => ({ fol: acc.fol, watch: acc.watch, views: acc.views, lives: acc.lives })[k] || 0;
export function monetization(acc) {
  const P = PLATFORMS[acc.platform], out = {};
  for (const src of ['ads', 'gifts', 'memberships', 'sponsorship', 'affiliate', 'merch']) {
    const rq = P.req[src];
    if (!rq) { out[src] = { supported: false, unlocked: false, reqs: [] }; continue; }
    const reqs = Object.entries(rq).map(([k, n]) => ({ k, need: n, have: Math.floor(need(acc, k)), ok: need(acc, k) >= n }));
    out[src] = { supported: true, unlocked: reqs.every(r => r.ok), reqs };
  }
  return out;
}
const unlocked = (acc, src) => !!monetization(acc)[src]?.unlocked;
export const tierOf = x => { const t = Object.values(x.accounts).reduce((a, c) => a + c.fol, 0); let r = TIERS[0][1]; for (const [m, n] of TIERS) if (t >= m) r = n; return r; };
const stageOf = p => p >= 100 ? 'ready' : p >= 92 ? 'uploading' : p >= 82 ? 'reviewing' : p >= 55 ? 'editing' : p >= 32 ? 'recording' : p >= 22 ? 'preparing' : p >= 10 ? 'scripting' : 'researching';
const needCost = (P, it) => R(P.types[it.type].c * TOPICS[it.topic].cost * QUALITY[it.quality].c);
const totalHours = (x, P, it) => { const ty = P.types[it.type]; const durationFactor = ty.dur > 0 ? Math.sqrt(clamp((Number(it.durationSec) || ty.dur) / ty.dur, .25, 4)) : 1; return ty.h * durationFactor * QUALITY[it.quality].t * TOPICS[it.topic].cx / (.6 + skillAvg(x, ty.sk) / 100 * .8) / equipF(x); };

function newAccount(platform, handle, d) {
  return { platform, handle, created: d, fol: 0, views: 0, watch: 0, lives: 0, posts: 0, rep: 0, pending: 0, gross: 0, fees: 0, expenses: 0, tax: 0, paid: 0, earned: { ads: 0, gifts: 0, memberships: 0, sponsorship: 0, affiliate: 0 }, nextPayout: d + 15, hist: [], alerts: [], affinity: {}, obligations: [], offers: [], seen: {} };
}
function addRev(x, acc, src, gross, fee, d, ref) {
  const net = gross - fee; acc.pending += net; acc.gross += gross; acc.fees += fee; acc.earned[src] = (acc.earned[src] || 0) + net;
  x.ledger.unshift({ day: d, platform: acc.platform, src, gross: R(gross), fee: R(fee), net: R(net), ref: ref || '' }); x.ledger.length = Math.min(x.ledger.length, 80);
}
const alert = (acc, d, text, h, s) => { acc.alerts.unshift({ day: d, text }); acc.alerts.length = Math.min(acc.alerts.length, 12); h?.addNotice?.(s, 'Creator Studio', text, 'info'); };

/* hasil performa konten: kombinasi topik, kualitas, skill, judul, durasi, timing, tren, reputasi, kompetisi, riwayat dan variasi algoritma simulasi */
function perform(s, x, acc, it, d, userId) {
  const P = PLATFORMS[acc.platform], T = TOPICS[it.topic], ty = P.types[it.type], Q = QUALITY[it.quality], r = rngFor(`${userId}:731:pub:${it.id}`);
  const sk = skillAvg(x, ty.sk), aff = 1 + Math.min(.4, (acc.affinity[it.topic] || 0) * .04), trend = .8 + .5 * rngFor(`731:trend:${it.topic}:${Math.floor(d / 7)}`)();
  const qual = Q.s * it.bf * (.7 + sk / 100 * .6) * equipF(x), titleF = .85 + x.skills.marketing / 100 * .4, timing = .95 + .1 * rngFor(`731:dow:${d % 7}`)();
  const algo = clamp(Math.exp(gauss(r) * .35), .4, 2.5), base = (acc.fol * .12 + 40 + x.skills.audience * 2) * ty.r;
  const views = Math.max(5, R(base * T.aud * aff * trend * qual * titleF * timing * (1 + acc.rep / 200) * algo / Math.sqrt(T.comp)));
  const ret = clamp(.28 + qual * .16 + x.skills.storytelling / 400 + gauss(r) * .04, .12, .78);
  const res = { views, ret: +ret.toFixed(3), factors: { topik: +(T.aud * aff).toFixed(2), tren: +trend.toFixed(2), kualitas: +qual.toFixed(2), judul: +titleF.toFixed(2), algoritma: +algo.toFixed(2) } };
  if (acc.platform === 'youtube') { res.avgDur = R(ty.dur * ret); res.watchH = views * res.avgDur / 3600; res.folGain = views * .004 * ret * (1 + x.skills.audience / 200); }
  else if (acc.platform === 'tiktok') { const comp = clamp(ret + .05, .15, .9); res.completion = +comp.toFixed(3); res.avgWatch = R(ty.dur * comp); res.shares = R(views * .02 * qual); res.watchH = 0; res.folGain = views * .003 * comp; }
  else { res.impressions = R(views * 1.3); res.likes = R(views * .06 * qual); res.saves = R(views * .015 * qual); res.shares = R(views * .01 * qual); res.visits = R(views * .02); res.watchH = 0; res.folGain = views * .002 * (1 + x.skills.audience / 300); }
  res.claim = !!(T.risk && r() < T.risk * (1.5 - sk / 100));
  res.rev = {};
  if (P.rpm && unlocked(acc, 'ads') && ty.dur > 0) { const g = views / 1000 * P.rpm * (.7 + ret) * (res.claim ? .5 : 1); res.rev.ads = [g, g * (1 - P.share)]; }
  if (unlocked(acc, 'affiliate')) res.rev.affiliate = [views * .002 * 5000 * titleF, 0];
  return res;
}
function applyFrac(x, acc, it, f, d) {
  const res = it.res; acc.views += res.views * f; acc.watch += res.watchH * f; acc.fol += res.folGain * f; it.views = (it.views || 0) + res.views * f;
  for (const [src, [g, fe]] of Object.entries(res.rev)) addRev(x, acc, src, g * f, fe * f, d, it.title);
  const hrow = acc.hist.at(-1)?.day === d ? acc.hist.at(-1) : (acc.hist.push({ day: d, fol: 0, views: 0, rev: 0 }), acc.hist.at(-1));
  hrow.views += res.views * f; hrow.fol = acc.fol; hrow.rev += Object.values(res.rev).reduce((a, [g, fe]) => a + (g - fe) * f, 0); if (acc.hist.length > 90) acc.hist.shift();
}
function publish(s, x, it, d, userId, h) {
  const acc = x.accounts[it.platform]; it.res = perform(s, x, acc, it, d, userId); it.status = 'published'; it.pubDay = d; it.rel = .55; it.views = 0;
  acc.posts++; acc.affinity[it.topic] = (acc.affinity[it.topic] || 0) + 1; acc.rep = Math.min(100, acc.rep + (it.res.views > acc.fol * .2 ? .6 : .2));
  const P = PLATFORMS[it.platform], ty = P.types[it.type];
  for (const k of ty.sk) x.skills[k] = Math.min(100, x.skills[k] + .8 * (1 - x.skills[k] / 110));
  applyFrac(x, acc, it, .55, d);
  const ob = acc.obligations.findIndex(o => o.topic === 'any' || o.topic === it.topic);
  if (ob >= 0) { const o = acc.obligations.splice(ob, 1)[0]; addRev(x, acc, 'sponsorship', o.fee, 0, d, `Sponsor ${o.brand}`); acc.rep = Math.min(100, acc.rep + 1); h?.addNotice?.(s, 'Sponsorship terpenuhi', `${o.brand}: ${fm(o.fee)} masuk saldo kreator (menunggu payout).`, 'success'); }
  if (it.res.claim) alert(acc, d, `Copyright claim pada "${it.title}": pendapatan iklan konten ini dipotong 50% (simulasi).`, h, s);
  x.published.unshift(it); x.published.length = Math.min(x.published.length, 60);
  x.queue = x.queue.filter(q => q !== it);
}

function dayTick(s, x, d, userId, h) {
  /* Produksi menunggu satu hari simulasi penuh setelah dimulai. Job yang menunggu tidak memakan slot harian. */
  for (const q of x.queue) {
    if (q.status !== 'queued') continue;
    const startDay = Number.isFinite(Number(q.startedDay)) ? Number(q.startedDay) : Number(q.created || d);
    if (d > startDay) q.status = 'researching';
  }
  const productive = ['researching', 'scripting', 'preparing', 'recording', 'editing', 'reviewing', 'uploading', 'stalled'];
  const active = x.queue.filter(q => productive.includes(q.status)).slice(0, slots(s));
  const each = active.length ? hoursPerDay(s) / active.length : 0;
  for (const it of active) {
    const startDay = Number.isFinite(Number(it.startedDay)) ? Number(it.startedDay) : Number(it.created || d);
    if (d <= startDay) continue;
    const P = PLATFORMS[it.platform], acc = x.accounts[it.platform], dh = Math.min(each, it.total - it.done), inc = it.budget * dh / it.total;
    if (s.cash < inc) { if (it.status !== 'stalled') { it.prev = it.status; alert(acc, d, `Produksi "${it.title}" tertahan: dana personal kurang ${fm(inc - s.cash)}.`, h, s); } it.status = 'stalled'; continue; }
    s.cash -= inc; it.spent += inc; acc.expenses += inc; it.done += dh; it.progress = Math.min(100, it.done / it.total * 100);
    it.status = it.progress >= 100 ? 'ready' : stageOf(it.progress); it.eta = R((it.total - it.done) / Math.max(.1, each));
    if (it.status === 'ready') h?.addNotice?.(s, 'Konten siap', `"${it.title}" (${P.n}) selesai diproduksi. Review lalu publish.`, 'success');
  }
  for (const it of x.queue.filter(q => q.status === 'scheduled' && q.pubDay <= d)) publish(s, x, it, d, userId, h);
  for (const it of x.published) if (it.rel < 1) { const f = Math.min(.09, 1 - it.rel); it.rel += f; applyFrac(x, x.accounts[it.platform], it, f, d); }
  for (const acc of Object.values(x.accounts)) {
    const m = monetization(acc);
    for (const [src, st] of Object.entries(m)) if (st.unlocked && !acc.seen[src]) { acc.seen[src] = d; alert(acc, d, `${PLATFORMS[acc.platform].n}: sumber pendapatan "${src}" terbuka (syarat simulasi terpenuhi).`, h, s); }
    if (m.memberships.unlocked && d % 30 === 0) addRev(x, acc, 'memberships', R(acc.fol * .003) * 25000, R(acc.fol * .003) * 25000 * .3, d, 'Membership bulanan');
    const P = PLATFORMS[acc.platform], r = rngFor(`${userId}:731:offer:${acc.platform}:${d}`);
    acc.offers = acc.offers.filter(o => o.exp >= d);
    for (const o of acc.obligations.filter(o => o.due < d)) { acc.obligations.splice(acc.obligations.indexOf(o), 1); acc.rep = Math.max(0, acc.rep - 2); alert(acc, d, `Sponsorship ${o.brand} gagal: konten tidak dikirim sebelum tenggat. Reputasi turun.`, h, s); }
    if (m.sponsorship.unlocked && d % 7 === 0 && acc.offers.length < 2 && r() < .6) acc.offers.push({ id: `o${d}${acc.platform}`, brand: BRANDS[Math.floor(r() * BRANDS.length)], fee: R(acc.fol * 35 * (1 + acc.rep / 100) * (.8 + r() * .4) / 1000) * 1000, topic: r() < .5 ? 'any' : TOPIC_KEYS[Math.floor(r() * TOPIC_KEYS.length)], exp: d + 10, days: 14 });
    if (d >= acc.nextPayout) {
      if (acc.pending >= 100000) { const tax = R(acc.pending * .05), paid = R(acc.pending) - tax; s.cash += paid; x.payouts.unshift({ day: d, platform: acc.platform, gross: R(acc.pending), tax, paid }); x.payouts.length = Math.min(x.payouts.length, 40); acc.paid += paid; acc.tax += tax; acc.pending = 0; h?.addNotice?.(s, 'Payout kreator', `${P.n}: ${fm(paid)} masuk saldo (pajak simulasi ${fm(tax)}).`, 'success'); }
      acc.nextPayout = d + 15;
    }
  }
}
DAY_HOOKS.push((s, v, d, userId, h) => { const x = ensure731(s).creator; if (Object.keys(x.accounts).length || x.queue.length) dayTick(s, x, d, userId, h); });

function liveTick(s, x, userId, h) {
  const L = x.live, acc = x.accounts[L.platform], P = PLATFORMS[L.platform], Q = QUALITY[L.quality], r = rngFor(`${userId}:731:live:${L.id}:${L.min}`);
  const step = 15, T = TOPICS[L.topic], curve = .6 + .4 * Math.sin(Math.PI * Math.min(1, (L.min + step / 2) / L.planned));
  const cost = Q.live * step / 60; if (s.cash < cost) { return endLive(s, x, userId, h, 'Dana personal habis'); }
  s.cash -= cost; L.cost += cost; acc.expenses += cost; L.min += step;
  const aff = 1 + Math.min(.4, (acc.affinity[L.topic] || 0) * .04), host = .7 + x.skills.liveHosting / 100 * .6;
  const conc = Math.max(1, R(((acc.fol * P.liveRate) + 3 + x.skills.liveHosting / 6) * T.aud * aff * Q.s * host * equipF(x) * (1 + acc.rep / 200) * curve * clamp(Math.exp(gauss(r) * .15), .6, 1.6)));
  const eng = clamp(.2 + x.skills.liveHosting / 200 + Q.s * .1, .1, .8);
  L.conc = conc; L.peak = Math.max(L.peak, conc); L.sum += conc; L.ticks++; L.unique += R(conc * .25 + 1); L.folGain += conc * .01 * eng; L.chat += R(conc * eng * 2.2);
  if (unlocked(acc, 'gifts')) {
    const n = R(conc * eng * .12 * P.giftRate), tw = P.gifts.reduce((a, g) => a + g.w, 0);
    for (let i = 0; i < n; i++) { let q = r() * tw, g = P.gifts[0]; for (const c of P.gifts) { q -= c.w; if (q <= 0) { g = c; break; } }
      const gross = g.coins * P.coinRp, fee = gross * P.fee, rec = { id: `g${x.nid++}`, platform: acc.platform, gift: g.n, coins: g.coins, coinRp: P.coinRp, gross: R(gross), fee: R(fee), net: R(gross - fee), day: s.day, min: L.min };
      L.gifts.unshift(rec); L.gifts.length = Math.min(L.gifts.length, 30); L.giftGross += gross; L.giftFee += fee; addRev(x, acc, 'gifts', gross, fee, s.day, g.n); x.gifts.unshift(rec); x.gifts.length = Math.min(x.gifts.length, 60); }
  }
  if (L.min >= L.planned) return endLive(s, x, userId, h, 'Durasi selesai');
  return { live: L };
}
function endLive(s, x, userId, h, why) {
  const L = x.live, acc = x.accounts[L.platform]; acc.fol += L.folGain; acc.views += L.unique; acc.lives++; acc.rep = Math.min(100, acc.rep + Math.min(1.5, L.min / 120));
  x.skills.liveHosting = Math.min(100, x.skills.liveHosting + 1.2 * (1 - x.skills.liveHosting / 110)); x.skills.audience = Math.min(100, x.skills.audience + .5);
  const rep = { id: L.id, platform: L.platform, title: L.title, topic: L.topic, day: s.day, minutes: L.min, peak: L.peak, avg: L.ticks ? R(L.sum / L.ticks) : 0, unique: L.unique, folGain: R(L.folGain), chat: L.chat, giftGross: R(L.giftGross), giftFee: R(L.giftFee), giftNet: R(L.giftGross - L.giftFee), cost: R(L.cost), result: R(L.giftGross - L.giftFee - L.cost), why };
  x.liveReports.unshift(rep); x.liveReports.length = Math.min(x.liveReports.length, 20); x.lastLive[L.platform] = s.day; x.live = null;
  h?.addNotice?.(s, 'Live selesai', `${PLATFORMS[rep.platform].n}: puncak ${rep.peak} penonton, +${rep.folGain} ${PLATFORMS[rep.platform].fol}.`, 'success');
  return { report: rep };
}

export const catalog = () => ({ platforms: PLATFORMS, topics: TOPICS, quality: QUALITY, skills: SKILL_NAMES, equip: EQUIP, tiers: TIERS, version: VERSION });

export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v731/')) return null;
  const { json, body, clean, save } = h, v = ensure731(s), x = v.creator, d = s.day;
  const err = (msg, c = 400) => json({ error: msg }, c), done = async o => { await save(user, s); return json(o); };
  if (m === 'GET' && p === '/api/v731/creator/catalog') return json(catalog());
  if (m !== 'POST') return err('Metode tidak didukung.', 405);
  const b = await body(req), pl = clean(b.platform, 20), P = PLATFORMS[pl], acc = x.accounts[pl];
  if (p === '/api/v731/creator/account') {
    if (!P || !P.enabled) return err('Platform belum tersedia.'); if (acc) return err('Akun platform ini sudah ada.');
    const handle = clean(b.handle, 40); if (handle.length < 3) return err('Nama akun minimal 3 karakter.');
    x.accounts[pl] = newAccount(pl, handle, d); return done({ ok: true });
  }
  if (p === '/api/v731/creator/content') {
    if (!P || !acc) return err('Buat akun platform terlebih dahulu.'); const type = clean(b.type, 20), topic = clean(b.topic, 20), quality = clean(b.quality, 10);
    if (!P.types[type]) return err('Format tidak didukung platform ini.'); if (!TOPICS[topic]) return err('Topik tidak valid.'); if (!QUALITY[quality]) return err('Kualitas tidak valid.');
    const title = clean(b.title, 80); if (title.length < 3) return err('Judul minimal 3 karakter.'); const durationSec = P.types[type].dur > 0 ? Number(b.durationSec || P.types[type].dur) : 0; if (P.types[type].dur > 0 && (!Number.isFinite(durationSec) || durationSec < 5 || durationSec > 1800)) return err('Durasi video harus antara 5 detik dan 30 menit.'); if (x.queue.length >= 12) return err('Antrean penuh (maks. 12).');
    const nc = needCost(P, { type, topic, quality }), budget = R(Number(b.budget) || nc); if (budget < nc * .5 || budget > nc * 3) return err(`Anggaran harus antara ${fm(nc * .5)} dan ${fm(nc * 3)}.`);
    const start = !!b.start; if (start && s.cash < budget * .15) return err('Dana personal belum cukup untuk memulai produksi.');
    const it = { id: `c${++x.nid}`, platform: pl, type, topic, quality, title, caption: clean(b.caption, 200), durationSec, budget, bf: clamp(budget / nc, .5, 1.2), spent: 0, done: 0, progress: 0, status: start ? 'queued' : 'draft', created: d, startedDay: start ? d + 1 : null, eta: null };
    it.total = totalHours(x, P, it); x.queue.push(it); return done({ ok: true, id: it.id });
  }
  const it = x.queue.find(q => q.id === clean(b.id, 12));
  if (p.startsWith('/api/v731/creator/content/')) {
    if (!it) return err('Konten tidak ditemukan.', 404); const act = p.split('/').pop();
    if (act === 'start') { if (it.status !== 'draft') return err('Hanya draft yang bisa dimulai.'); if (s.cash < it.budget * .15) return err('Dana personal belum cukup untuk memulai produksi.'); it.status = 'queued'; it.startedDay = d + 1; it.startedAtDay = d; return done({ ok: true, startsOnDay: d + 2, message: 'Hari simulasi berikutnya menjadi jeda; progress mulai setelah itu.' }); }
    if (act === 'cancel') { if (['ready', 'published'].includes(it.status)) return err('Konten sudah selesai; gunakan publish atau hapus draft.'); it.status = 'cancelled'; x.queue = x.queue.filter(q => q !== it); return done({ ok: true, lost: R(it.spent) }); }
    if (act === 'duplicate') { if (x.queue.length >= 12) return err('Antrean penuh.'); const c = { ...it, id: `c${++x.nid}`, status: 'draft', spent: 0, done: 0, progress: 0, startedDay: null, startedAtDay: null, eta: null, title: `${it.title} (salinan)`.slice(0, 80) }; x.queue.push(c); return done({ ok: true, id: c.id }); }
    if (act === 'priority') { const i = x.queue.indexOf(it), j = b.dir === 'up' ? i - 1 : i + 1; if (j < 0 || j >= x.queue.length) return err('Tidak bisa dipindah.'); [x.queue[i], x.queue[j]] = [x.queue[j], x.queue[i]]; return done({ ok: true }); }
    if (act === 'publish') { if (it.status !== 'ready') return err('Konten belum siap dipublikasikan.'); const sd = Math.floor(Number(b.scheduleDay) || 0); if (sd > d) { it.status = 'scheduled'; it.pubDay = sd; return done({ ok: true, scheduled: sd }); } publish(s, x, it, d, user.id, h); return done({ ok: true, item: x.published[0] }); }
  }
  if (p === '/api/v731/creator/live/start') {
    if (!P || !acc) return err('Buat akun platform terlebih dahulu.'); if (x.live) return err('Masih ada live yang berjalan.'); if (x.lastLive[pl] === d) return err('Maksimal 1 live per platform per hari simulasi.');
    const topic = clean(b.topic, 20), quality = clean(b.quality, 10), title = clean(b.title, 80); if (!TOPICS[topic] || !QUALITY[quality]) return err('Topik/kualitas tidak valid.'); if (title.length < 3) return err('Judul live minimal 3 karakter.');
    const planned = clamp(Math.round((Number(b.planned) || 60) / 15) * 15, 15, 180), est = QUALITY[quality].live * planned / 60; if (s.cash < est * .25) return err(`Dana personal kurang untuk biaya stream (estimasi ${fm(est)}).`);
    x.live = { id: `l${++x.nid}`, platform: pl, topic, quality, title, planned, min: 0, startDay: d, conc: 0, peak: 0, sum: 0, ticks: 0, unique: 0, folGain: 0, chat: 0, cost: 0, gifts: [], giftGross: 0, giftFee: 0 }; return done({ ok: true, live: x.live });
  }
  if (p === '/api/v731/creator/live/tick') { if (!x.live) return err('Tidak ada live berjalan.'); const o = liveTick(s, x, user.id, h); return done(o); }
  if (p === '/api/v731/creator/live/end') { if (!x.live) return err('Tidak ada live berjalan.'); return done(endLive(s, x, user.id, h, 'Diakhiri pemain')); }
  if (p === '/api/v731/creator/equipment') {
    const k = clean(b.item, 12), E = EQUIP[k]; if (!E) return err('Equipment tidak dikenal.'); const lv = x.equip[k]; if (lv >= 5) return err('Sudah level maksimum.'); const cost = E.costs[lv - 1]; if (s.cash < cost) return err(`Dana kurang: butuh ${fm(cost)}.`);
    s.cash -= cost; x.equip[k]++; return done({ ok: true, level: x.equip[k], cost });
  }
  if (p === '/api/v731/creator/sponsor') {
    if (!acc) return err('Akun tidak ditemukan.', 404); const o = acc.offers.find(q => q.id === clean(b.id, 40)); if (!o) return err('Tawaran sudah kedaluwarsa.', 404);
    acc.offers = acc.offers.filter(q => q !== o); if (b.accept) { acc.obligations.push({ brand: o.brand, fee: o.fee, topic: o.topic, due: d + o.days }); } return done({ ok: true });
  }
  if (p === '/api/v731/creator/payout') {
    if (!acc) return err('Akun tidak ditemukan.', 404); if (d < acc.nextPayout) return err(`Payout berikutnya pada hari ke-${acc.nextPayout}.`); if (acc.pending < 100000) return err('Saldo kreator belum mencapai batas payout Rp100.000.');
    const tax = R(acc.pending * .05), paid = R(acc.pending) - tax; s.cash += paid; x.payouts.unshift({ day: d, platform: pl, gross: R(acc.pending), tax, paid }); acc.paid += paid; acc.tax += tax; acc.pending = 0; acc.nextPayout = d + 15; return done({ ok: true, paid, tax });
  }
  return err('API_NOT_FOUND', 404);
}
export const _internal = { dayTick, liveTick, endLive, publish };
