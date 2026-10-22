/* GENERATED dari netlify/functions/v655.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
// BizSim 6.5.5 — additive feature layer. Does not replace v6.1.1 routes; it extends them.
// State lives in s.v655 (inside the existing per-user state blob). Everything is SIMULATION ONLY.
export const VERSION = '6.5.5';
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const R = n => Math.round(n);

/* ---------- deterministic RNG (same user+day => same result, so catch-up is idempotent) ---------- */
export function rngFor(seed) {
  let h = 1779033703 ^ String(seed).length;
  for (const c of String(seed)) { h = Math.imul(h ^ c.charCodeAt(0), 3432918353); h = (h << 13) | (h >>> 19); }
  let a = h >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
export const gauss = r => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());

/* ---------- catalogs ---------- */
export const BUSINESS_EXTRA = [
  { id: 'tiktok-shop', name: 'TikTok Shop & Live Commerce', category: 'E-commerce', startup: 20000000, minSkill: 30, skill: 'marketing', monthlyFixed: 1500000, price: 95000, quality: 52, capacity: 95, image: 'tiktok-shop.svg', description: 'Jualan lewat video pendek dan live shopping. Traffic besar, margin tipis.' },
  { id: 'content-studio', name: 'Content Production Studio', category: 'Media', startup: 60000000, minSkill: 40, skill: 'design', monthlyFixed: 4500000, price: 3500000, quality: 62, capacity: 40, image: 'content-studio.svg', description: 'Produksi video, foto, dan konten untuk brand dan kreator.' },
  { id: 'cloud-kitchen', name: 'Cloud Kitchen', category: 'Food & Beverage', startup: 45000000, minSkill: 36, skill: 'management', monthlyFixed: 3800000, price: 42000, quality: 58, capacity: 100, image: 'cloud-kitchen.svg', description: 'Dapur khusus delivery tanpa area makan di tempat.' }
];
const COGS = { Retail: .78, Services: .35, 'E-commerce': .65, 'Food & Beverage': .38, Fashion: .5, Automotive: .55, Technology: .35, Logistics: .7, Manufacturing: .65, Media: .4 };
const TRACK_IDS = ['capacity', 'quality', 'marketing', 'efficiency', 'safety'];
const TRACK_EFFECT = { capacity: 'Kapasitas +18% per level', quality: 'Kualitas +4 dan reputasi +2 per level', marketing: 'Marketing +6 per level', efficiency: 'Biaya produksi -4% dan biaya tetap -3% per level', safety: 'Risiko insiden -12% per level' };
const TRACK_NAMES = {
  Retail: ['Rak & Gudang', 'Seleksi Produk', 'Promo & Loyalty', 'Kasir Digital', 'CCTV & Alarm'],
  Services: ['Mesin & Kapasitas', 'Standar Layanan', 'Promo & Member', 'Otomasi Alur Kerja', 'Keamanan & K3'],
  'E-commerce': ['Gudang & Fulfillment', 'Kurasi Produk', 'Iklan & Affiliate', 'Otomasi Order', 'Keamanan Akun & Data'],
  'Food & Beverage': ['Dapur & Kursi', 'Kualitas Bahan', 'Promo & Delivery App', 'Peralatan Efisien', 'Higiene & Proteksi Api'],
  Fashion: ['Lini Produksi', 'Kualitas Bahan', 'Kampanye Brand', 'Stok Terintegrasi', 'Proteksi Merek'],
  Automotive: ['Bay Servis', 'Sertifikasi Mekanik', 'Promo Servis', 'Alat Diagnostik', 'Proteksi Api & Aset'],
  Technology: ['Tim & Kapasitas Proyek', 'Standar Delivery', 'Portofolio & Outreach', 'Tooling Otomatis', 'Keamanan Siber'],
  Logistics: ['Armada & Gudang', 'SLA Pengiriman', 'Kemitraan Klien', 'Routing Otomatis', 'Asuransi Kargo'],
  Manufacturing: ['Lini Mesin', 'Quality Control', 'Distribusi & Brand', 'Otomasi Pabrik', 'Keselamatan Pabrik'],
  Media: ['Peralatan Studio', 'Kualitas Produksi', 'Promosi Klien', 'Workflow Editing', 'Backup & Hak Cipta']
};
const upBase = b => Math.max(1500000, b.startup * .1);
const upCost = (b, lvl) => R(upBase(b) * Math.pow(1.65, lvl) / 10000) * 10000;
const upDays = lvl => 2 + 2 * lvl;
const UP_MAX = 10;

const SK = { sales: 'Sales', communication: 'Customer Service', finance: 'Finance', programming: 'Programming', management: 'Management', negotiation: 'Negotiation' };
const TIERS = [{ t: 'basic', n: 'Dasar', cost: 250000, days: 5, gain: 5, min: 0 }, { t: 'mid', n: 'Menengah', cost: 900000, days: 10, gain: 9, min: 25 }, { t: 'pro', n: 'Lanjutan', cost: 3500000, days: 20, gain: 15, min: 45 }];
export const TRAINING = Object.entries(SK).flatMap(([skill, label]) => TIERS.map(t => ({ id: `tr-${skill}-${t.t}`, kind: 'training', name: `${label} ${t.n}`, skill, cost: t.cost, days: t.days, gains: { [skill]: t.gain }, min: t.min })));
export const EDUCATION = [
  { id: 'edu-vokasi', kind: 'education', name: 'Pelatihan Vokasi (SMK)', skill: 'problemSolving', cost: 1500000, days: 30, gains: { problemSolving: 8, sales: 6 }, level: 'SMA/SMK' },
  { id: 'edu-digimar', kind: 'education', name: 'Sertifikat Digital Marketing', skill: 'marketing', cost: 2500000, days: 30, gains: { marketing: 12, design: 4 }, cert: 'Digital Marketing' },
  { id: 'edu-acc', kind: 'education', name: 'Sertifikat Akuntansi', skill: 'finance', cost: 4000000, days: 45, gains: { finance: 15 }, cert: 'Akuntansi' },
  { id: 'edu-prog', kind: 'education', name: 'Sertifikat Programming', skill: 'programming', cost: 5000000, days: 45, gains: { programming: 15 }, cert: 'Programming' },
  { id: 'edu-d3', kind: 'education', name: 'Diploma D3', skill: 'management', cost: 18000000, days: 180, gains: { management: 10, finance: 10, communication: 6 }, level: 'D3' },
  { id: 'edu-s1', kind: 'education', name: 'Sarjana S1', skill: 'management', cost: 36000000, days: 240, gains: { management: 14, finance: 12, negotiation: 12, leadership: 8 }, level: 'S1' }
];
export const PLATFORMS = {
  tiktok: { lvl: 1, name: 'TikTok', unit: 'followers', need: 10000, rpm: 2500, viral: .14, postCost: 0, desc: 'Video pendek. Peluang viral tinggi, bayaran per 1.000 view rendah.' },
  instagram: { lvl: 3, name: 'Instagram Reels', unit: 'followers', need: 5000, rpm: 4500, viral: .08, postCost: 0, desc: 'Reels dan feed. Audiens stabil dengan peluang endorse.' },
  podcast: { lvl: 2, name: 'Podcast', unit: 'listeners', need: 2000, rpm: 9000, viral: .03, postCost: 150000, desc: 'Episode berkala. Tumbuh lambat, sponsor membayar lebih tinggi.' },
  twitch: { lvl: 1, name: 'Live Streaming', unit: 'followers', need: 1000, rpm: 6500, viral: .05, postCost: 50000, desc: 'Siaran langsung. Donasi dan langganan penonton.' }
};
const GEAR = [{ n: 'Smartphone dasar', cost: 0 }, { n: 'Tripod & ring light', cost: 500000 }, { n: 'Mic & lighting studio', cost: 2500000 }, { n: 'Kamera & PC editing', cost: 12000000 }];

/* instrument params: mu/sigma annual, fees as fraction, yield annual paid every N days, settlement days to receive cash on sale */
export const INSTR = {
  'stock-index': { nav: 1000, mu: .09, sigma: .17, buyFee: .0015, sellFee: .0025, yld: .025, every: 90, settle: 0, risk: 'Tinggi', kind: 'Dividen tiap 90 hari' },
  gold: { nav: 1900000, mu: .05, sigma: .13, buyFee: .025, sellFee: .01, yld: 0, every: 0, settle: 0, risk: 'Sedang', kind: 'Tanpa arus kas, selisih beli-jual' },
  land: { nav: 1000000, mu: .06, sigma: .03, buyFee: .025, sellFee: .025, yld: 0, every: 0, settle: 14, risk: 'Rendah', kind: 'Likuiditas rendah, cair 14 hari' },
  property: { nav: 1000000, mu: .04, sigma: .04, buyFee: .025, sellFee: .03, yld: .05, every: 30, settle: 21, risk: 'Sedang', kind: 'Sewa bulanan, cair 21 hari' },
  bond: { nav: 1000, mu: 0, sigma: .03, buyFee: 0, sellFee: .003, yld: .0635, every: 30, settle: 2, risk: 'Rendah', kind: 'Kupon bulanan, cair T+2' }
};
const MARKET_ASSETS = ['BTC', 'BBCA', 'TLKM'];
/* in-game events. impact = fractional price move; macro = delta to macro indicators. */
export const EVENTS = [
  { id: 'rate-hike', title: 'Bank sentral menaikkan suku bunga', body: 'Suku bunga acuan naik 0,25%. Imbal obligasi baru naik, harga obligasi lama dan saham tertekan.', w: 8, tone: 'down', macro: { rate: .25 }, impact: { 'stock-index': -.025, bond: -.03, property: -.012, gold: -.006, BBCA: .01, TLKM: -.012, BTC: -.04 }, dur: 6, vol: 1.2 },
  { id: 'rate-cut', title: 'Bank sentral menurunkan suku bunga', body: 'Suku bunga acuan turun 0,25%. Biaya dana lebih murah dan harga aset naik.', w: 8, tone: 'up', macro: { rate: -.25 }, impact: { 'stock-index': .03, bond: .03, property: .015, gold: .01, BBCA: .015, TLKM: .01, BTC: .05 }, dur: 6, vol: 1 },
  { id: 'inflation-spike', title: 'Inflasi melonjak', body: 'Harga kebutuhan naik lebih cepat dari perkiraan. Emas dan tanah dicari sebagai lindung nilai.', w: 6, tone: 'mixed', macro: { inflation: .6 }, impact: { gold: .035, land: .012, property: .01, 'stock-index': -.015, bond: -.02, BTC: -.02 }, dur: 8, vol: 1.2 },
  { id: 'recession-fear', title: 'Kekhawatiran resesi global', body: 'Investor menghindari risiko. Saham jatuh, emas dan obligasi pemerintah naik.', w: 5, tone: 'down', macro: { growth: -.6 }, impact: { 'stock-index': -.065, gold: .04, bond: .015, property: -.02, BBCA: -.05, TLKM: -.03, BTC: -.1 }, dur: 8, vol: 1.7 },
  { id: 'growth-beat', title: 'Pertumbuhan ekonomi melampaui target', body: 'Konsumsi dan investasi kuat. Saham dan properti ikut menguat.', w: 7, tone: 'up', macro: { growth: .4 }, impact: { 'stock-index': .04, property: .02, land: .015, BBCA: .035, TLKM: .02, BTC: .03 }, dur: 6, vol: 1 },
  { id: 'infra-project', title: 'Proyek infrastruktur baru diumumkan', body: 'Jalan tol dan kawasan industri baru mendorong harga tanah sekitar.', w: 5, tone: 'up', macro: {}, impact: { land: .08, property: .03, 'stock-index': .01 }, dur: 10, vol: 1 },
  { id: 'rupiah-weak', title: 'Rupiah melemah terhadap dolar', body: 'Harga emas dalam rupiah naik, impor lebih mahal dan saham tertekan.', w: 6, tone: 'mixed', macro: { usdidr: 350 }, impact: { gold: .03, 'stock-index': -.02, bond: -.01, BTC: .02, BBCA: -.02 }, dur: 5, vol: 1.3 },
  { id: 'rupiah-strong', title: 'Rupiah menguat', body: 'Aliran dana asing masuk. Saham dan obligasi menguat, emas melemah dalam rupiah.', w: 5, tone: 'up', macro: { usdidr: -250 }, impact: { gold: -.02, 'stock-index': .02, bond: .012, BBCA: .02, TLKM: .01 }, dur: 5, vol: 1 },
  { id: 'political', title: 'Ketidakpastian politik meningkat', body: 'Investor menahan diri sampai arah kebijakan jelas.', w: 4, tone: 'down', macro: {}, impact: { 'stock-index': -.04, bond: -.01, gold: .02, BBCA: -.03, TLKM: -.025, BTC: -.03 }, dur: 6, vol: 1.5 },
  { id: 'housing-subsidy', title: 'Insentif DP rumah diperluas', body: 'Pembelian rumah lebih mudah sehingga permintaan properti dan tanah naik.', w: 4, tone: 'up', macro: {}, impact: { property: .04, land: .02, 'stock-index': .008 }, dur: 8, vol: 1 },
  { id: 'bank-stress', title: 'Tekanan pada sektor perbankan', body: 'Kekhawatiran kredit macet menekan saham perbankan dan indeks.', w: 3, tone: 'down', macro: { rate: .1 }, impact: { 'stock-index': -.08, BBCA: -.09, gold: .05, bond: -.01, property: -.02, BTC: -.06 }, dur: 7, vol: 1.9 },
  { id: 'commodity-boom', title: 'Harga komoditas ekspor naik', body: 'Pendapatan eksportir naik dan menopang indeks saham.', w: 5, tone: 'up', macro: { growth: .2 }, impact: { 'stock-index': .03, land: .005, TLKM: .01, BBCA: .015 }, dur: 6, vol: 1.1 },
  { id: 'earnings-strong', title: 'Laporan keuangan emiten solid', body: 'Laba korporasi di atas ekspektasi analis.', w: 6, tone: 'up', macro: {}, impact: { 'stock-index': .025, BBCA: .03, TLKM: .025 }, dur: 4, vol: 1 },
  { id: 'earnings-weak', title: 'Laporan keuangan emiten mengecewakan', body: 'Laba korporasi di bawah ekspektasi analis.', w: 5, tone: 'down', macro: {}, impact: { 'stock-index': -.03, BBCA: -.025, TLKM: -.03 }, dur: 4, vol: 1.3 },
  { id: 'crypto-rally', title: 'Minat aset kripto meningkat', body: 'Arus dana ritel masuk ke aset digital.', w: 4, tone: 'up', macro: {}, impact: { BTC: .12, 'stock-index': .005 }, dur: 5, vol: 1.4 },
  { id: 'crypto-crackdown', title: 'Regulasi kripto diperketat', body: 'Aturan baru membuat pelaku pasar menjual posisinya.', w: 3, tone: 'down', macro: {}, impact: { BTC: -.14 }, dur: 5, vol: 1.6 },
  { id: 'calm', title: 'Pasar tenang', body: 'Tidak ada kabar besar. Harga bergerak mengikuti tren jangka panjang.', w: 10, tone: 'mixed', macro: {}, impact: {}, dur: 1, vol: .9 }
];

/* expected event impact per asset, removed from daily drift so news moves prices without a built-in bias */
const MEAN_IMP = {}; { const tw = EVENTS.reduce((a, e) => a + e.w, 0); for (const id of [...Object.keys(INSTR)]) MEAN_IMP[id] = EVENTS.reduce((a, e) => a + e.w * (e.impact[id] || 0), 0) / tw; }
/* ---------- state ---------- */
const startMacro = () => ({ rate: 6.25, inflation: 2.8, growth: 5.0, usdidr: 16200, vol: 1 });
function seedSeries(id, nav0, seed) {
  const p = INSTR[id], r = rngFor('seed:' + seed + id); let v = 1; const out = [];
  for (let i = 0; i < 45; i++) { v *= Math.exp(p.mu / 365 + p.sigma / Math.sqrt(365) * gauss(r)); out.push(v); }
  const k = nav0 / out[out.length - 1]; return out.map(x => R(x * k * 100) / 100);
}
export function ensure(s, userId = 0) {
  if (!s.v655) {
    const nav = {}, series = {};
    for (const id of Object.keys(INSTR)) { nav[id] = INSTR[id].nav; series[id] = seedSeries(id, INSTR[id].nav, userId); }
    s.v655 = { version: VERSION, lastDay: s.day || 1, macro: startMacro(), nav, series, navHist: {}, pending: [], pendingCash: [], news: [], programs: { training: null, education: null, history: [] }, platforms: {}, log: [] };
    for (const id of Object.keys(INSTR)) s.v655.navHist[id] = { [s.day || 1]: nav[id] };
  }
  const v = s.v655; v.version = VERSION; v.programs ||= { training: null, education: null, history: [] }; v.platforms ||= {}; v.pendingCash ||= []; v.pending ||= []; v.news ||= [];
  return v;
}
const navAt = (v, id, day) => { const h = v.navHist[id] || {}; if (h[day] != null) return h[day]; const ks = Object.keys(h).map(Number).sort((a, b) => a - b); const k = ks.filter(x => x <= day).pop(); return k != null ? h[k] : v.nav[id]; };

/* ---------- daily processing ---------- */
function applyEvent(s, v, ev, d, h) {
  for (const [k, dv] of Object.entries(ev.macro || {})) v.macro[k] = k === 'rate' ? clamp(v.macro[k] + dv, 3, 12) : k === 'inflation' ? clamp(v.macro[k] + dv, 0.5, 12) : k === 'growth' ? clamp(v.macro[k] + dv, -3, 9) : v.macro[k] + dv;
  v.macro.vol = Math.max(v.macro.vol, ev.vol || 1);
  const moves = [];
  for (const [a, imp] of Object.entries(ev.impact || {})) {
    if (INSTR[a]) { v.nav[a] = Math.max(1, v.nav[a] * (1 + .6 * imp)); v.pending.push({ asset: a, per: .4 * imp / ev.dur, left: ev.dur }); }
    else if (s.market?.prices?.[a]) { const np = Math.max(1, R(s.market.prices[a] * (1 + imp))); s.market.prices[a] = np; (s.market.history[a] ||= []).push(np); s.market.history[a] = s.market.history[a].slice(-30); }
    moves.push({ asset: a, pct: R(imp * 1000) / 10 });
  }
  v.news.unshift({ id: `${d}-${ev.id}`, day: d, event: ev.id, title: ev.title, body: ev.body, tone: ev.tone, impact: moves });
  v.news = v.news.slice(0, 40);
  if (Math.max(0, ...moves.map(m => Math.abs(m.pct))) >= 3) h.addNotice(s, ev.title, ev.body, ev.tone === 'up' ? 'success' : ev.tone === 'down' ? 'warning' : 'info');
}
function pickEvent(r) { const tot = EVENTS.reduce((a, e) => a + e.w, 0); let x = r() * tot; for (const e of EVENTS) { x -= e.w; if (x <= 0) return e; } return EVENTS[EVENTS.length - 1]; }
function completeProgram(s, v, p, d, h) {
  for (const [k, g] of Object.entries(p.gains)) s.skills[k] = Math.min(100, Number(s.skills[k] || 20) + Math.round(g * (1 + (s.v700?.bonus?.learn || 0))));
  s.career.education = s.career.education || []; s.career.education.unshift({ name: p.name, skill: p.skill, cost: p.cost, day: d });
  if (p.cert) { s.career.certifications = s.career.certifications || []; if (!s.career.certifications.includes(p.cert)) s.career.certifications.push(p.cert); }
  if (p.level) s.career.educationLevel = p.level;
  v.programs.history.unshift({ id: p.id, name: p.name, kind: p.kind, finishedDay: d }); v.programs.history = v.programs.history.slice(0, 20);
  h.achievement(s, 'learner', 'Learner'); h.addNotice(s, p.kind === 'training' ? 'Training selesai' : 'Pendidikan selesai', `${p.name} selesai. Skill bertambah.`, 'success');
}
function completeUpgrade(s, biz, up, d, h) {
  const ops = biz.operations || (biz.operations = {}), prods = s.products.filter(x => String(x.business_id) === String(biz.id));
  if (up.track === 'capacity') { ops.capacity = R((ops.capacity || 50) * 1.18); for (const p of prods) p.capacity = R(p.capacity * 1.18); }
  if (up.track === 'quality') { ops.quality = Math.min(100, (ops.quality || 50) + 4); biz.reputation = Math.min(100, (biz.reputation || 0) + 2); for (const p of prods) p.quality = Math.min(100, (p.quality || 50) + 4); }
  if (up.track === 'marketing') ops.marketing = Math.min(100, (ops.marketing || 0) + 6);
  if (up.track === 'efficiency') { for (const p of prods) p.unit_cost = R(p.unit_cost * .96); ops.monthlyFixed = R((ops.monthlyFixed || 0) * .97); }
  if (up.track === 'safety' && biz.risk) for (const k of Object.keys(biz.risk)) biz.risk[k] = Math.max(1, R(biz.risk[k] * .88 * 10) / 10);
  biz.v655.levels[up.track] = up.toLevel; biz.v655.active = null;
  h.addNotice(s, 'Upgrade selesai', `${biz.name}: ${up.label} level ${up.toLevel}.`, 'success');
}
function processDay(s, v, d, userId, h) {
  const r = rngFor(`${userId}:${d}`);
  // 1. in-game event (~22% of days)
  if (r() < .22) applyEvent(s, v, pickEvent(r), d, h);
  // 2. NAV step: drift + noise (scaled by event-driven volatility) + decaying event impulses
  for (const [id, p] of Object.entries(INSTR)) {
    const pend = v.pending.filter(x => x.asset === id).reduce((a, x) => a + x.per, 0);
    const ret = p.mu / 365 + p.sigma / Math.sqrt(365) * v.macro.vol * gauss(r) + pend - .22 * MEAN_IMP[id] + .5 * p.sigma * p.sigma / 365;
    v.nav[id] = Math.max(1, R(v.nav[id] * Math.exp(ret) * 100) / 100);
    v.navHist[id][d] = v.nav[id]; v.series[id].push(v.nav[id]); v.series[id] = v.series[id].slice(-60);
    const ks = Object.keys(v.navHist[id]); if (ks.length > 120) for (const k of ks.slice(0, ks.length - 120)) delete v.navHist[id][k];
  }
  v.pending = v.pending.map(x => ({ ...x, left: x.left - 1 })).filter(x => x.left > 0);
  v.macro.vol = 1 + (v.macro.vol - 1) * .88;
  v.macro.rate += (6.25 - v.macro.rate) * .004; v.macro.inflation += (2.8 - v.macro.inflation) * .01; v.macro.growth += (5 - v.macro.growth) * .01; v.macro.usdidr += (16200 - v.macro.usdidr) * .006;
  // 3. income from holdings (dividend, coupon, rent) and held-back sale proceeds
  let paid = 0;
  for (const hd of s.investments || []) {
    const p = INSTR[hd.assetId]; if (!p) continue;
    if (!hd.v655) { const nav0 = navAt(v, hd.assetId, hd.purchasedDay || d); hd.v655 = { units: hd.currentValue / nav0, entryNav: nav0, coupon: Math.round((v.macro.rate + .6) * 100) / 100, income: 0 }; }
    hd.currentValue = R(hd.v655.units * v.nav[hd.assetId]); hd.units = hd.v655.units;
    if (p.yld && p.every && d > (hd.purchasedDay || 0) && (d - (hd.purchasedDay || 0)) % p.every === 0) {
      let amt = 0;
      if (hd.assetId === 'stock-index') amt = hd.currentValue * p.yld * (p.every / 365) * .9;
      if (hd.assetId === 'bond') amt = hd.invested * (hd.v655.coupon / 100) * (p.every / 365) * .9;
      if (hd.assetId === 'property') amt = Math.max(0, hd.currentValue * p.yld * (p.every / 365) * (r() < .08 ? 0 : 1) * .9 - hd.currentValue * .001);
      amt = R(amt); if (amt > 0) { s.cash += amt; hd.v655.income += amt; paid += amt; }
    }
  }
  if (paid) h.addNotice(s, 'Hasil investasi diterima', `Dividen, kupon, atau sewa Rp${paid.toLocaleString('id-ID')} masuk ke cash.`, 'success');
  const due = v.pendingCash.filter(x => x.dueDay <= d); if (due.length) { for (const x of due) s.cash += x.amount; h.addNotice(s, 'Dana penjualan cair', `Rp${due.reduce((a, x) => a + x.amount, 0).toLocaleString('id-ID')} dari penjualan investasi masuk ke cash.`, 'success'); v.pendingCash = v.pendingCash.filter(x => x.dueDay > d); }
  // 4. programs
  for (const kind of ['training', 'education']) { const p = v.programs[kind]; if (p && d >= p.endDay) { v.programs[kind] = null; completeProgram(s, v, p, d, h); } }
  // 5. business: upgrades, balance fixes (COGS ratio once, demand cap, restock)
  for (const biz of s.businesses || []) {
    biz.v655 ||= { levels: {}, active: null };
    const cat = biz.type, prods = s.products.filter(x => String(x.business_id) === String(biz.id));
    for (const p of prods) { if (!p.v655) { p.unit_cost = R(p.price * (COGS[cat] ?? .6)); p.v655 = 1; } p.demand = clamp(Number(p.demand) || 1, .3, 2.5); if (p.inventory < p.capacity * .3) p.inventory = p.capacity; }
    const up = biz.v655.active; if (up && d >= up.endDay) completeUpgrade(s, biz, up, d, h);
  }
  v.macroHist ||= {}; v.macroHist[d] = { rate: v.macro.rate, inflation: v.macro.inflation, growth: v.macro.growth, usdidr: v.macro.usdidr }; for (const k of Object.keys(v.macroHist)) if (Number(k) < d - 3) delete v.macroHist[k];
  // 6. creator platforms (passive growth and income once monetized)
  for (const [key, pl] of Object.entries(v.platforms)) {
    const def = PLATFORMS[key]; if (!def) continue;
    const q = platformQuality(s, pl), views = R(pl.followers * .05 * (1 + pl.trend / 100) * (.7 + r() * .6) * (1 + q / 200));
    pl.views += views; pl.followers = R(pl.followers * (1 + .002 * (1 + pl.trend / 100))); pl.trend = Math.max(0, pl.trend * .93 - .2);
    if (!pl.monetized && pl.followers >= def.need && pl.posts >= 20) { pl.monetized = true; h.addNotice(s, `${def.name} monetisasi aktif`, 'Channel memenuhi syarat dan mulai menghasilkan pendapatan.', 'success'); }
    if (pl.monetized) { const inc = R(views / 1000 * def.rpm * (1 + q / 150)); pl.income += inc; s.cash += inc; }
  }
}
export function catchup(s, userId, h) {
  const v = ensure(s, userId); let changed = false;
  if (s.day > v.lastDay) { const from = Math.max(v.lastDay + 1, s.day - 120); for (let d = from; d <= s.day; d++) processDay(s, v, d, userId, h); v.lastDay = s.day; changed = true; }
  return changed;
}
export const creatorLevel = s => { const p = Object.values(s.v655?.platforms || {}).reduce((a, x) => a + (x.posts || 0), 0), sk = ((s.skills.design || 20) + (s.skills.communication || 20) + (s.skills.marketing || 20)) / 3; return clamp(1 + Math.floor(p / 8) + Math.floor(sk / 35), 1, 10); };
export const platformQuality = (s, pl) => clamp(((s.skills.design || 20) + (s.skills.communication || 20) + (s.skills.marketing || 20)) / 3 * (1 + .18 * (pl.gear || 0)) + (s.v700?.bonus?.creator || 0), 5, 150);

/* ---------- API ---------- */
export function catalog(businessCatalog) {
  const up = {};
  for (const b of businessCatalog) { const names = TRACK_NAMES[b.category] || TRACK_NAMES.Retail; up[b.id] = TRACK_IDS.map((t, i) => ({ track: t, label: names[i], effect: TRACK_EFFECT[t], costs: [...Array(UP_MAX)].map((_, l) => upCost(b, l)), days: [...Array(UP_MAX)].map((_, l) => upDays(l)) })); }
  return { version: VERSION, upgrades: up, upgradeMax: UP_MAX, training: TRAINING, education: EDUCATION, platforms: PLATFORMS, gear: GEAR, instruments: INSTR, events: EVENTS.map(e => ({ id: e.id, title: e.title, tone: e.tone })) };
}
export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v655/')) return null;
  const { json, body, clean, money, uid, save, addNotice, achievement, findBiz } = h; const v = ensure(s, user.id), b = m === 'POST' ? await body(req) : {};
  const done = async data => { await save(user, s); return json(data); };
  if (m === 'GET' && p === '/api/v655/catalog') return json(catalog(h.businessCatalog));
  /* training and education (one active program per kind, progress is by simulation day) */
  if (m === 'POST' && p === '/api/v655/program/start') {
    const pr = [...TRAINING, ...EDUCATION].find(x => x.id === clean(b.id, 40)); if (!pr) return json({ error: 'Program tidak ditemukan.' }, 404);
    if (v.programs[pr.kind]) return json({ error: 'Selesaikan program yang sedang berjalan terlebih dahulu.' }, 400);
    if (pr.min && Number(s.skills[pr.skill] || 0) < pr.min) return json({ error: `Skill ${pr.skill} minimal ${pr.min} untuk program ini.` }, 400);
    if (s.cash < pr.cost) return json({ error: 'Cash personal tidak cukup.' }, 400);
    s.cash -= pr.cost; v.programs[pr.kind] = { ...pr, startDay: s.day, endDay: s.day + pr.days }; return done({ ok: true, program: v.programs[pr.kind], cash: s.cash });
  }
  /* business upgrades paid from business cash */
  if (m === 'POST' && p === '/api/v655/upgrade/start') {
    const biz = findBiz(s, b.businessId); if (!biz) return json({ error: 'Business tidak ditemukan.' }, 404);
    const cat = h.businessCatalog.find(x => x.id === biz.catalogId); if (!cat) return json({ error: 'Katalog bisnis tidak ditemukan.' }, 400);
    biz.v655 ||= { levels: {}, active: null }; const track = clean(b.track, 20), idx = TRACK_IDS.indexOf(track); if (idx < 0) return json({ error: 'Jenis upgrade tidak valid.' }, 400);
    if (biz.v655.active) return json({ error: 'Masih ada upgrade yang berjalan di bisnis ini.' }, 400);
    const lvl = biz.v655.levels[track] || 0; if (lvl >= UP_MAX) return json({ error: 'Upgrade sudah level maksimum.' }, 400);
    const cost = upCost(cat, lvl); if (biz.cash < cost) return json({ error: `Cash bisnis kurang. Butuh Rp${cost.toLocaleString('id-ID')}.` }, 400);
    biz.cash -= cost; const label = (TRACK_NAMES[cat.category] || TRACK_NAMES.Retail)[idx];
    biz.v655.active = { track, label, toLevel: lvl + 1, cost, startDay: s.day, endDay: s.day + upDays(lvl) }; return done({ ok: true, upgrade: biz.v655.active });
  }
  /* creator platforms */
  if (m === 'POST' && p === '/api/v655/platform/create') {
    const k = clean(b.platform, 20), def = PLATFORMS[k]; if (!def) return json({ error: 'Platform tidak ditemukan.' }, 404); if (v.platforms[k]) return json({ error: 'Platform sudah dibuat.' }, 400); if (creatorLevel(s) < (def.lvl || 1)) return json({ error: `Butuh Creator Level ${def.lvl}. Level Anda ${creatorLevel(s)}.` }, 400);
    v.platforms[k] = { name: clean(b.name, 60) || `${user.name} ${def.name}`, followers: 0, views: 0, posts: 0, income: 0, gear: 0, trend: 0, monetized: false, lastPostDay: 0 }; achievement(s, 'first_platform', 'First Platform'); return done({ ok: true, platform: v.platforms[k] });
  }
  if (m === 'POST' && p === '/api/v655/platform/post') {
    const k = clean(b.platform, 20), def = PLATFORMS[k], pl = v.platforms[k]; if (!def || !pl) return json({ error: 'Platform belum dibuat.' }, 404);
    if (pl.lastPostDay === s.day) return json({ error: 'Konten hari ini sudah diunggah. Lanjutkan ke hari berikutnya.' }, 400);
    if (s.cash < def.postCost) return json({ error: 'Cash personal tidak cukup untuk biaya produksi.' }, 400);
    const r = rngFor(`${user.id}:post:${k}:${s.day}:${pl.posts}`), q = platformQuality(s, pl), viral = r() < def.viral * (1 + pl.trend / 200);
    const views = Math.max(30, R((pl.followers * .18 + 80 + q * 12) * (viral ? 4 + r() * 4 : .6 + r() * .8))), gain = Math.max(1, R(views * (viral ? .02 : .01) * (1 + q / 200)));
    s.cash -= def.postCost; pl.views += views; pl.followers += gain; pl.posts++; pl.lastPostDay = s.day; if (viral) pl.trend = Math.min(100, pl.trend + 40);
    if (!pl.monetized && pl.followers >= def.need && pl.posts >= 20) pl.monetized = true;
    return done({ ok: true, viral, views, followers: gain, monetized: pl.monetized });
  }
  if (m === 'POST' && p === '/api/v655/platform/gear') {
    const k = clean(b.platform, 20), pl = v.platforms[k]; if (!pl) return json({ error: 'Platform belum dibuat.' }, 404);
    const next = GEAR[(pl.gear || 0) + 1]; if (!next) return json({ error: 'Peralatan sudah level maksimum.' }, 400); if (s.cash < next.cost) return json({ error: 'Cash personal tidak cukup.' }, 400);
    s.cash -= next.cost; pl.gear = (pl.gear || 0) + 1; return done({ ok: true, gear: pl.gear });
  }
  /* investments with fees, spreads, settlement; value follows the NAV driven by in-game events */
  if (m === 'POST' && p === '/api/v655/invest/buy') {
    const item = h.investmentCatalog.find(x => x.id === clean(b.assetId, 40)), pr = INSTR[item?.id], amount = money(b.amount);
    if (!item || !pr) return json({ error: 'Instrumen investasi tidak ditemukan.' }, 404); if (amount < item.minimum) return json({ error: `Minimum investasi Rp${item.minimum.toLocaleString('id-ID')}.` }, 400); if (s.cash < amount) return json({ error: 'Cash personal tidak cukup.' }, 400);
    const fee = R(amount * pr.buyFee), nav = v.nav[item.id], units = (amount - fee) / nav;
    const hd = { id: uid(), assetId: item.id, name: item.name, category: item.category, invested: amount, currentValue: R(units * nav), units, purchasedDay: s.day, image: item.image, v655: { units, entryNav: nav, coupon: Math.round((v.macro.rate + .6) * 100) / 100, income: 0, fee } };
    s.cash -= amount; s.investments.unshift(hd); return done({ ok: true, holding: hd, fee, cash: s.cash });
  }
  if (m === 'POST' && p === '/api/v655/invest/sell') {
    const hd = s.investments.find(x => String(x.id) === String(b.id)); if (!hd) return json({ error: 'Investasi tidak ditemukan.' }, 404); const pr = INSTR[hd.assetId];
    if (!hd.v655) return json({ error: 'Muat ulang data lalu coba lagi.' }, 409);
    const pct = clamp(Number(b.percent) || 100, 1, 100) / 100, units = hd.v655.units * pct, gross = R(units * v.nav[hd.assetId]), fee = R(gross * pr.sellFee), net = gross - fee, cost = hd.invested * pct;
    if (pr.settle > 0) v.pendingCash.push({ amount: net, dueDay: s.day + pr.settle, label: hd.name }); else s.cash += net;
    if (pct >= .999) s.investments = s.investments.filter(x => x !== hd); else { hd.v655.units -= units; hd.units = hd.v655.units; hd.invested = R(hd.invested - cost); hd.currentValue = R(hd.v655.units * v.nav[hd.assetId]); }
    return done({ ok: true, gross, fee, net, realized: net - R(cost), settleDays: pr.settle, cash: s.cash });
  }
  return json({ error: 'API_NOT_FOUND' }, 404);
}
