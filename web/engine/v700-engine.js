/* GENERATED dari netlify/functions/v700-engine.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
// BizSim 7.0.0 daily engine. Deterministic per (user, day). Prices are SIMULATED; mechanics follow real-life rules (lots, fees, T+2, margin, coupons).
import { rngFor, gauss, clamp, R, EVENTS } from './v655.js';
import { SECTORS, STOCKS, TRADE, BONDS, FUNDS, PROPERTY, SHOP, TRAITS, FIRST, LAST, EDU, ROLES, TICK, BRANDS } from './v700-data.js';
export const VERSION = '7.0.0';
export const DAY_HOOKS = [];
export const logTx = (v, o) => { (v.tx ||= []).unshift(o); v.tx = v.tx.slice(0, 200); };
export const fmt = n => 'Rp' + Math.round(n).toLocaleString('id-ID');
export const pick = (r, a) => a[Math.floor(r() * a.length)];
export const lotOf = m => (m.c === 'US' ? 1 : 100);
export const roundPx = (m, p) => (m.c === 'US' ? Math.max(1000, Math.round(p / 1000) * 1000) : Math.max(1, Math.round(p / TICK(p)) * TICK(p)));
export const meta = (v, t) => STOCKS.find(x => x.t === t) || v.companies[t];
export const last = a => a[a.length - 1];
const SECMAP = { 'Food & Beverage': 'Konsumer', Retail: 'Konsumer', Services: 'Konsumer', Fashion: 'Konsumer', Technology: 'Teknologi', 'E-commerce': 'Teknologi', Logistics: 'Logistik', Media: 'Media', Automotive: 'Otomotif', Manufacturing: 'Energi' };
export const secOf = cat => SECMAP[cat] || 'Konsumer';
const EVENT_SECTOR = { 'bank-stress': { Perbankan: -.05, Properti: -.01 }, 'commodity-boom': { Energi: .04 }, 'infra-project': { Properti: .02, Logistik: .02 }, 'recession-fear': { Otomotif: -.03, Teknologi: -.02 }, 'growth-beat': { Konsumer: .01, Logistik: .01 }, political: { Perbankan: -.01 } };
const COMP_EVENTS = [
  { id: 'earn-beat', w: 6, imp: .06, tone: 'up', t: n => `Laba ${n} melampaui ekspektasi`, b: 'Analis merevisi target harga naik setelah laporan keuangan kuartalan.' },
  { id: 'earn-miss', w: 5, imp: -.06, tone: 'down', t: n => `Laba ${n} di bawah perkiraan`, b: 'Margin menipis dan manajemen memangkas proyeksi.' },
  { id: 'product', w: 4, imp: .05, tone: 'up', t: n => `${n} meluncurkan produk baru`, b: 'Respons pasar awal positif dan pesanan awal melampaui target.' },
  { id: 'contract', w: 4, imp: .07, tone: 'up', t: n => `${n} memenangkan kontrak besar`, b: 'Kontrak multi-tahun menambah visibilitas pendapatan.' },
  { id: 'scandal', w: 2, imp: -.1, tone: 'down', t: n => `Skandal tata kelola menimpa ${n}`, b: 'Regulator memulai pemeriksaan dan investor menjual saham.' },
  { id: 'ceo', w: 2, imp: -.05, tone: 'down', t: n => `Direktur utama ${n} mengundurkan diri`, b: 'Pasar menunggu penerus dan arah strategi baru.' },
  { id: 'buyback', w: 3, imp: .03, tone: 'up', t: n => `${n} mengumumkan pembelian kembali saham`, b: 'Perusahaan menyiapkan dana untuk membeli sahamnya dari pasar.' },
  { id: 'fine', w: 2, imp: -.04, tone: 'down', t: n => `${n} dikenai denda regulator`, b: 'Denda dinilai material namun tidak mengganggu operasional.' },
  { id: 'rights', w: 2, imp: -.04, tone: 'down', t: n => `${n} menerbitkan saham baru (rights issue)`, b: 'Kepemilikan lama terdilusi sehingga harga tertekan.' }
];
const PFX = ['Nusantara', 'Garuda', 'Cakrawala', 'Samudra', 'Bumi', 'Surya', 'Mega', 'Prima', 'Karya', 'Sinar', 'Duta', 'Tirta'];
const CORE = [['Energi', 'Energi'], ['Teknologi', 'Teknologi'], ['Pangan', 'Konsumer'], ['Logistik', 'Logistik'], ['Digital', 'Teknologi'], ['Farmasi', 'Kesehatan'], ['Properti', 'Properti'], ['Agro', 'Konsumer'], ['Media', 'Media'], ['Retail', 'Konsumer'], ['Otomotif', 'Otomotif'], ['Telekom', 'Telekomunikasi']];

export function news(v, d, kind, title, body, tone = 'mixed', extra = {}) {
  v.nid = (v.nid || 0) + 1; v.news.unshift({ id: `n${v.nid}`, day: d, kind, title, body, tone, ...extra }); v.news = v.news.slice(0, 80);
}
function seedCandles(p0, vol, seed, n = 45) {
  const r = rngFor(seed); let px = 1; const cl = [];
  for (let i = 0; i < n; i++) { px *= Math.exp(vol / Math.sqrt(365) * gauss(r)); cl.push(px); }
  const k = p0 / cl[n - 1], out = []; let prev = cl[0] * k;
  for (const c of cl) { const cc = c * k, hi = Math.max(prev, cc) * (1 + Math.abs(gauss(r)) * vol * .02), lo = Math.min(prev, cc) * (1 - Math.abs(gauss(r)) * vol * .02); out.push([prev, hi, lo, cc].map(x => Math.round(x * 100) / 100)); prev = cc; }
  out[n - 1][3] = p0; return out;
}
export function ensure(s, userId = 0) {
  if (!s.v700) {
    const st = {}, tr = {};
    for (const m of STOCKS) { const c = seedCandles(m.p, m.vol, `s:${userId}:${m.t}`).map(x => x.map(y => roundPx(m, y))); c[c.length - 1][3] = m.p; st[m.t] = { price: m.p, candles: c, imp: [], status: 'listed' }; }
    for (const a of TRADE) tr[a.id] = seedCandles(a.p, a.vol, `t:${userId}:${a.id}`);
    s.v700 = { companies: {}, stocks: st, holdings: {}, orders: [], ipos: [], trading: { c: tr, pos: [], closed: [] }, bonds: [], funds: { nav: {}, series: {}, units: {}, sip: [] }, gold: { grams: 0, cost: 0 }, property: { owned: [], listings: [] }, deposits: [], art: { idx: 1, hist: [1] }, inv: [], hr: { vac: [], cand: [] }, creator: { offers: [], deals: [], hist: {}, last: {}, streak: {} }, news: [], bonus: {}, lastDay: s.day || 1, nid: 0, idx: 100, idxHist: [100] };
    for (const f of FUNDS) { s.v700.funds.nav[f.id] = 1000; s.v700.funds.series[f.id] = [1000]; }
  }
  const v = s.v700; v.version = VERSION; v.uid = userId;
  v.companies ||= {}; v.holdings ||= {}; v.orders ||= []; v.ipos ||= []; v.bonds ||= []; v.deposits ||= []; v.inv ||= []; v.news ||= []; v.bonus ||= {};
  v.hr ||= { vac: [], cand: [] }; v.creator ||= { offers: [], deals: [], hist: {}, last: {}, streak: {} }; v.property ||= { owned: [], listings: [] };
  return v;
}
export const bonusOf = v => { const b = {}; for (const it of v.inv) { const d = SHOP.find(x => x.id === it.itemId); if (!d?.eff || it.installedIn || d.cat === 'Bisnis') continue; if (d.slot && !it.equipped) continue; for (const [k, x] of Object.entries(d.eff)) b[k] = (b[k] || 0) + x; } if (v.studioLv) b.creator = (b.creator || 0) + v.studioLv * 3; return b; };
export const insured = (v, d) => v.inv.some(i => i.itemId === 'ins-home' && i.expires > d);
const equip = (v, bizId, id) => v.inv.some(i => i.itemId === id && String(i.installedIn) === String(bizId));
export const bondPrice = (def, h, d, macro) => {
  if (h.status === 'default') return 40;
  const rem = Math.max(0, (h.matureDay - d) / 365), ytm = macro.rate + def.spread, D = Math.min(rem, 4) * .9;
  let p = 100 * (1 - D * (ytm - h.cpn) / 100); p = 100 + (p - 100) * Math.min(1, rem / 1.5); return clamp(p, 60, 112);
};
export const depositRate = (macro, tenor) => Math.max(1.5, Math.round((macro.rate * .55 + (tenor >= 12 ? .35 : tenor >= 6 ? .2 : tenor >= 3 ? .1 : 0)) * 100) / 100);
export const propValue = (v6, p) => p.price * ((v6.nav[p.src] || 1) / p.entryIdx) * (1 + .03 * (p.level || 0));
export const collValue = (v, it) => { const d = SHOP.find(x => x.id === it.itemId); if (!d?.col) return it.price; const days = Math.max(0, (v.lastDay || 0) - it.boughtDay); let val = it.price * it.k * Math.pow(v.art.idx / it.idx0, d.col.beta) * (1 + (d.age || 0) * days); return it.fake ? val * .15 : val; };

function makeIpo(r, d, v) {
  const a = pick(r, PFX), [c, sec] = pick(r, CORE); let t = (a[0] + c.slice(0, 3)).toUpperCase(); while (v.stocks[t] || v.ipos.some(x => x.t === t)) t = t.slice(0, 3) + String.fromCharCode(65 + Math.floor(r() * 26));
  const m = { t, n: `${a} ${c} Tbk`, sec, c: 'ID', p: 0, beta: R((1 + r() * .9) * 100) / 100, vol: R((.4 + r() * .35) * 100) / 100, mu: .07, div: r() < .4 ? .02 : 0, cap: 0, d: `Perusahaan ${c.toLowerCase()} baru yang mencatatkan saham di bursa. Fundamentalnya belum teruji sehingga risikonya tinggi.`, game: 1 };
  const price = [100, 150, 200, 300, 500, 800, 1200][Math.floor(r() * 7)], lots = 20000 + Math.floor(r() * 60000);
  m.p = price; m.cap = R(price * lots * 100 * 4 / 1e9);
  v.ipos.push({ t, kind: 'game', n: m.n, sec, price, lots, openDay: d, closeDay: d + 4, listDay: d + 6, hype: R((.4 + r() * 1.4) * 100) / 100, quality: R(r() * 100) / 100, status: 'open', sub: { lots: 0 }, meta: m });
  news(v, d, 'ipo', `IPO baru: ${m.n} (${t})`, `Penawaran perdana ${fmt(price)} per saham dibuka sampai hari ${d + 4}. Pencatatan hari ${d + 6}.`, 'up', { ticker: t });
}
function listIpo(ip, s, v, d, r, h) {
  const m = ip.meta, price = ip.price, lot = 100;
  let shares = 0;
  if (ip.sub.lots > 0 && ip.kind === 'game') {
    const over = Math.max(1, 1 + ip.hype * 3), allot = Math.floor(ip.sub.lots / over), refund = (ip.sub.lots - allot) * lot * price;
    shares = allot * lot; s.cash += refund;
    if (shares) { const hd = v.holdings[ip.t] || { shares: 0, cost: 0 }; hd.cost = (hd.cost * hd.shares + shares * price) / (hd.shares + shares); hd.shares += shares; v.holdings[ip.t] = hd; }
    h.addNotice(s, `Hasil IPO ${ip.t}`, `Anda mendapat ${shares.toLocaleString('id-ID')} saham dari ${(ip.sub.lots * lot).toLocaleString('id-ID')} yang dipesan. Sisa dana dikembalikan.`, 'info');
  }
  let first = clamp(gauss(r) * .1 + (ip.hype - 1) * .14 + (ip.quality - .5) * .1, -.07, .35);
  if (ip.kind === 'own') {
    const biz = (s.businesses || []).find(b => String(b.id) === String(ip.bizId)); const sold = Math.min(ip.offerShares, Math.round(ip.offerShares * Math.min(1, ip.hype)));
    if (biz) { const proceeds = Math.round(sold * price * .95); biz.cash += proceeds; biz.v700 = { ...(biz.v700 || {}), ipo: { t: ip.t, totalShares: ip.totalShares, listedDay: d, treasury: 0 } }; h.addNotice(s, `IPO ${ip.t} tercatat`, `Terjual ${sold.toLocaleString('id-ID')} dari ${ip.offerShares.toLocaleString('id-ID')} saham. Dana bersih ${fmt(proceeds)} masuk ke kas bisnis.`, 'success'); }
    v.holdings[ip.t] = { shares: ip.totalShares - sold, cost: price };
    first = clamp(first, -.07, .2);
  }
  const p1 = roundPx(m, price * (1 + first));
  v.companies[ip.t] = m; v.stocks[ip.t] = { price: p1, candles: [[price, Math.max(price, p1) * 1.01, Math.min(price, p1) * .99, p1].map(x => roundPx(m, x))], imp: [], status: 'listed', listed: d };
  ip.status = 'listed'; ip.firstDay = R(first * 1000) / 10;
  news(v, d, 'ipo', `${m.n} (${ip.t}) resmi tercatat`, `Hari pertama ${first >= 0 ? 'naik' : 'turun'} ${Math.abs(R(first * 1000) / 10)}% dari harga IPO ${fmt(price)}.`, first >= 0 ? 'up' : 'down', { ticker: ip.t });
}
function mkIncident(s, biz, type, dmgPct, h, d) {
  const damage = Math.round(biz.value * dmgPct), inc = { id: h.uid(), user_id: h.userId, business_id: biz.id, type, area: 'operations', severity: dmgPct > .08 ? 'high' : 'medium', damage_level: .15, damage_value: damage, repair_cost: Math.round(damage * .55), status: 'active', decision: null, insurance_payout: 0, data: { trigger: 'v700', day: d } };
  s.incidents.unshift(inc); biz.value = Math.max(0, biz.value - damage); return inc;
}

export function refreshListings(s, v, d, userId) {
  const v6 = s.v655, rg = rngFor(`${userId}:prop:${Math.floor(d / 7)}`); v.property.listings = v.property.listings.filter(x => d - x.day <= 14);
  for (let i = 0; i < 6; i++) { const t = PROPERTY[Math.floor(rg() * PROPERTY.length)], price = Math.round(t.base * (.85 + rg() * .35) * (v6.nav[t.src] || 1e6) / 1e6 / 1e6) * 1e6; v.property.listings.push({ id: `${Math.floor(d / 7)}-${i}`, k: t.k, n: t.n, city: pick(rg, t.city), sz: t.sz, price, src: t.src, day: d }); }
}
export function processDay(s, v, d, userId, h) {
  const v6 = s.v655, r = rngFor(`${userId}:700:${d}`), macro = v6.macro, mh = v6.macroHist?.[d], mp = v6.macroHist?.[d - 1];
  const dm = mh && mp ? { rate: mh.rate - mp.rate, inflation: mh.inflation - mp.inflation, growth: mh.growth - mp.growth, usd: mh.usdidr - mp.usdidr } : { rate: 0, inflation: 0, growth: 0, usd: 0 };
  const nv = v6.navHist?.['stock-index'], mktRet = nv && nv[d] && nv[d - 1] ? nv[d] / nv[d - 1] - 1 : .09 / 365 + .17 / Math.sqrt(365) * gauss(r);
  const todayEv = (v6.news || []).filter(n => n.day === d);
  const secImp = {}; for (const n of todayEv) for (const [k, x] of Object.entries(EVENT_SECTOR[n.event] || {})) secImp[k] = (secImp[k] || 0) + x;
  const evRet = {};
  for (const f of DAY_HOOKS) f(s, v, d, userId, h);
  /* company events */
  if (r() < .03) {
    const listed = Object.keys(v.stocks).filter(t => v.stocks[t].status === 'listed' && !meta(v, t)?.own), t = pick(r, listed), tot = COMP_EVENTS.reduce((a, e) => a + e.w, 0); let x = r() * tot, ev = COMP_EVENTS[0]; for (const e of COMP_EVENTS) { x -= e.w; if (x <= 0) { ev = e; break; } }
    if (t) { const m = meta(v, t); evRet[t] = ev.imp * .6; v.stocks[t].imp.push({ per: ev.imp * .4 / 3, left: 3 }); news(v, d, 'stock', ev.t(m.n), ev.b, ev.tone, { ticker: t, pct: R(ev.imp * 1000) / 10 }); }
  }
  /* IPO lifecycle and random listings */
  if (r() < 1 / 110 && v.ipos.filter(x => x.status === 'open' || x.status === 'closed').length < 2) makeIpo(r, d, v);
  for (const ip of v.ipos) { if (ip.status === 'open' && d >= ip.closeDay) ip.status = 'closed'; if (ip.status === 'closed' && d >= ip.listDay) listIpo(ip, s, v, d, r, h); }
  v.ipos = v.ipos.filter(x => x.status !== 'listed' || d - x.listDay < 30);
  /* stocks */
  const stockRet = {};
  for (const [t, st] of Object.entries(v.stocks)) {
    if (st.status !== 'listed') continue; const m = meta(v, t); if (!m) continue; const sens = SECTORS[m.sec] || SECTORS.Konsumer, prev = st.price;
    let ret = m.beta * mktRet + (m.mu - .09 * m.beta) / 365 + m.vol * .75 / Math.sqrt(365) * gauss(r) * (macro.vol || 1) + .5 * (Math.pow(m.beta * .17, 2) + Math.pow(m.vol * .75, 2)) / 365;
    ret += (sens.rate * dm.rate + sens.infl * dm.inflation + sens.growth * dm.growth) / 100;
    ret += m.c === 'US' ? (mh && mp ? mh.usdidr / mp.usdidr - 1 : 0) : sens.usd * dm.usd / 1000 / 100;
    ret += secImp[m.sec] || 0; ret += evRet[t] || 0; for (const q of st.imp) ret += q.per; st.imp = st.imp.map(q => ({ ...q, left: q.left - 1 })).filter(q => q.left > 0);
    if (m.own) { const biz = (s.businesses || []).find(b => String(b.id) === String(m.bizId)); if (biz) { const f = biz.value * 1.4 / m.shares; ret += clamp((f / prev - 1) * .03, -.02, .02); } }
    if (m.div && (d + t.charCodeAt(0) * 7) % 182 === 0) { const amt = roundPx(m, prev * m.div / 2); const hd = v.holdings[t]; ret -= amt / prev; if (hd?.shares) { const pay = R(hd.shares * amt * .9); s.cash += pay; hd.div = (hd.div || 0) + pay; news(v, d, 'stock', `Dividen ${m.n}`, `${fmt(amt)} per saham dibagikan. Anda menerima ${fmt(pay)} setelah pajak 10%.`, 'up', { ticker: t }); } }
    const lim = m.c === 'US' ? .15 : .2; ret = clamp(ret, -lim, lim);
    const np = roundPx(m, prev * (1 + ret)), hi = roundPx(m, Math.max(prev, np) * (1 + Math.abs(gauss(r)) * m.vol * .012)), lo = roundPx(m, Math.min(prev, np) * (1 - Math.abs(gauss(r)) * m.vol * .012));
    st.price = np; st.candles.push([prev, Math.max(hi, np, prev), Math.min(lo, np, prev), np]); st.candles = st.candles.slice(-60); stockRet[t] = np / prev - 1;
    if (m.game && !m.own && np < (m.p || 1) * .15 && r() < 1 / 800) { st.status = 'bankrupt'; news(v, d, 'stock', `${m.n} (${t}) dinyatakan pailit`, 'Perdagangan dihentikan dan saham dihapus dari bursa. Nilai kepemilikan menjadi nol.', 'down', { ticker: t }); if (v.holdings[t]) { h.addNotice(s, `${t} pailit`, 'Saham yang Anda pegang tidak lagi memiliki nilai.', 'danger'); delete v.holdings[t]; } }
  }
  /* limit orders (funds reserved when placed) */
  v.orders = v.orders.filter(o => {
    const st = v.stocks[o.t], m = meta(v, o.t); if (!st || st.status !== 'listed') { if (o.side === 'buy') s.cash += o.reserved; return false; }
    const c = last(st.candles); let fill = null;
    if (o.side === 'buy' && c[2] <= o.limit) fill = Math.min(o.limit, c[0]); if (o.side === 'sell' && c[1] >= o.limit) fill = Math.max(o.limit, c[0]);
    if (fill != null) {
      if (o.side === 'buy') { const cost = o.shares * fill, fee = Math.round(cost * (v.brokerFee?.buy ?? .0015)); logTx(v, { k: 'BUY', t: o.t, qty: o.shares, price: fill, total: cost, fee, day: d }); s.cash += o.reserved - cost - fee; const hd = v.holdings[o.t] || { shares: 0, cost: 0 }; hd.cost = (hd.cost * hd.shares + cost) / (hd.shares + o.shares); hd.shares += o.shares; v.holdings[o.t] = hd; }
      else { const net = Math.round(o.shares * fill * (1 - (v.brokerFee?.sell ?? .0035))), realized = Math.round(net - (o.cost || 0) * o.shares); v.realized = (v.realized || 0) + realized; logTx(v, { k: 'SELL', t: o.t, qty: o.shares, price: fill, total: o.shares * fill, fee: Math.round(o.shares * fill * (v.brokerFee?.sell ?? .0035)), realized, day: d }); v6.pendingCash.push({ amount: net, dueDay: d + 2, label: `Jual ${o.t}` }); }
      h.addNotice(s, `Order ${o.t} terisi`, `${o.side === 'buy' ? 'Beli' : 'Jual'} ${o.shares.toLocaleString('id-ID')} saham di ${fmt(fill)}.`, 'success'); return false;
    }
    if (d - o.day >= 20) { if (o.side === 'buy') s.cash += o.reserved; else { const hd = v.holdings[o.t] || { shares: 0, cost: 0 }; hd.shares += o.shares; v.holdings[o.t] = hd; } return false; }
    return true;
  });
  /* trading */
  const cry = todayEv.reduce((a, n) => a + (EVENTS.find(e => e.id === n.event)?.impact?.BTC || 0), 0);
  for (const a of TRADE) {
    const cs = v.trading.c[a.id], prev = last(cs)[3]; let ret = a.vol / Math.sqrt(365) * gauss(r) + a.corr * (mktRet - .09 / 365);
    if (a.cls === 'Kripto') ret += cry * .8 * (a.id === 'BTC' ? 1 : 1.25); if (a.id === 'OIL') ret += dm.growth * .03 + dm.inflation * .01;
    const np = a.id === 'USDIDR' ? Math.round(macro.usdidr * (1 + gauss(r) * .002)) : Math.round(prev * Math.exp(ret) * 100) / 100, hi = Math.max(prev, np) * (1 + Math.abs(gauss(r)) * a.vol * .03), lo = Math.min(prev, np) * (1 - Math.abs(gauss(r)) * a.vol * .03);
    cs.push([prev, hi, lo, np].map(x => Math.round(x * 100) / 100)); v.trading.c[a.id] = cs.slice(-60);
  }
  v.trading.pos = v.trading.pos.filter(p => {
    const cs = v.trading.c[p.asset], c = last(cs), dir = p.dir, liq = dir > 0 ? p.entry * (1 - .95 / p.lev) : p.entry * (1 + .95 / p.lev);
    let exit = null, why = '';
    const hitSL = p.sl && (dir > 0 ? c[2] <= p.sl : c[1] >= p.sl), hitLiq = dir > 0 ? c[2] <= liq : c[1] >= liq, hitTP = p.tp && (dir > 0 ? c[1] >= p.tp : c[2] <= p.tp);
    if (hitLiq && !(hitSL && (dir > 0 ? p.sl > liq : p.sl < liq))) { exit = liq; why = 'Likuidasi'; } else if (hitSL) { exit = p.sl * (1 - dir * .002); why = 'Stop loss'; } else if (hitTP) { exit = p.tp * (1 - dir * .002); why = 'Take profit'; }
    p.fees += p.margin * p.lev * .0002;
    if (!exit) { const eq = p.margin + dir * (c[3] / p.entry - 1) * p.margin * p.lev - p.fees; if (eq <= .05 * p.margin) { exit = c[3]; why = 'Likuidasi'; } }
    if (!exit) return true;
    const pnl = dir * (exit / p.entry - 1) * p.margin * p.lev - p.fees, pay = why === 'Likuidasi' ? 0 : Math.max(0, p.margin + pnl - p.margin * p.lev * .001);
    s.cash += R(pay); v.trading.closed.unshift({ asset: p.asset, dir, pnl: R(why === 'Likuidasi' ? -p.margin : pnl), day: d, why, entry: p.entry, exit: R(exit) }); v.trading.closed = v.trading.closed.slice(0, 30);
    news(v, d, 'trade', `${why}: ${p.asset} ${dir > 0 ? 'Long' : 'Short'}`, `Posisi ditutup di ${fmt(exit)} dengan hasil ${fmt(why === 'Likuidasi' ? -p.margin : pnl)}.`, pnl >= 0 && why !== 'Likuidasi' ? 'up' : 'down');
    h.addNotice(s, `${why} ${p.asset}`, `Hasil ${fmt(why === 'Likuidasi' ? -p.margin : pnl)}.`, pnl >= 0 && why !== 'Likuidasi' ? 'success' : 'danger'); return false;
  });
  /* bonds */
  for (const b of v.bonds) {
    if (b.status !== 'active') continue; const def = BONDS.find(x => x.id === b.bondId);
    if ((d - b.buyDay) % 30 === 0 && d > b.buyDay) {
      if (def.float) b.cpn = Math.max(def.coupon, Math.round((macro.rate + .15) * 100) / 100);
      const cp = R(b.amount * b.cpn / 100 / 12 * .9); s.cash += cp; b.income += cp; h.addNotice(s, 'Kupon obligasi', `${def.n}: ${fmt(cp)} setelah pajak 10%.`, 'success');
      if (def.defaultPa && r() < def.defaultPa / 12) { b.status = 'default'; v6.pendingCash.push({ amount: R(b.amount * .4), dueDay: d + 60, label: `Pemulihan ${def.n}` }); news(v, d, 'bond', `Gagal bayar: ${def.n}`, 'Penerbit gagal membayar kupon. Pemulihan sekitar 40% diperkirakan cair dalam 60 hari.', 'down'); }
    }
    if (b.status === 'active' && d >= b.matureDay) { s.cash += b.amount; b.status = 'matured'; news(v, d, 'bond', `${def.n} jatuh tempo`, `Pokok ${fmt(b.amount)} dikembalikan ke cash.`, 'up'); }
  }
  /* funds */
  const big = ['BBCA', 'BMRI', 'BBRI', 'TLKM', 'ASII', 'UNVR', 'ICBP', 'ADRO'], capSum = big.reduce((a, t) => a + (meta(v, t)?.cap || 0), 0);
  const sRet = big.reduce((a, t) => a + (meta(v, t).cap / capSum) * (stockRet[t] || 0), 0), bRet = 6.5 / 100 / 365 - 3 * dm.rate / 100 + gauss(r) * .0006, cRet = Math.max(0, macro.rate - .8) / 100 / 365;
  v.idx = (v.idx || 100) * (1 + sRet); v.idxHist = [...(v.idxHist || [100]), Math.round(v.idx * 100) / 100].slice(-60);
  for (const f of FUNDS) {
    const rt = (f.w.stock || 0) * sRet + (f.w.bond || 0) * bRet + (f.w.cash || 0) * cRet - f.fee / 365; v.funds.nav[f.id] = Math.round(v.funds.nav[f.id] * (1 + rt) * 100) / 100; v.funds.series[f.id] = [...v.funds.series[f.id], v.funds.nav[f.id]].slice(-90);
  }
  for (const sp of v.funds.sip) if (d >= sp.nextDay) {
    sp.nextDay += 30;
    if (s.cash >= sp.amount) { s.cash -= sp.amount; const u = v.funds.units[sp.fundId] || { units: 0, invested: 0 }; u.units += sp.amount / v.funds.nav[sp.fundId]; u.invested += sp.amount; u.last = d; v.funds.units[sp.fundId] = u; h.addNotice(s, 'SIP reksadana', `${fmt(sp.amount)} diinvestasikan otomatis.`, 'info'); } else h.addNotice(s, 'SIP gagal', 'Cash tidak cukup untuk investasi rutin bulan ini.', 'warning');
  }
  /* deposits */
  for (const dp of v.deposits) if (dp.status === 'active' && d >= dp.matureDay) {
    const interest = R(dp.amount * dp.rate / 100 * dp.tenor / 12 * .8); s.cash += dp.amount + interest; dp.status = 'done'; h.addNotice(s, 'Deposito jatuh tempo', `Pokok dan bunga bersih ${fmt(interest)} masuk ke cash.`, 'success');
    if (dp.aro) { const nd = { id: h.uid(), amount: dp.amount + interest, tenor: dp.tenor, rate: depositRate(macro, dp.tenor), openDay: d, matureDay: d + dp.tenor * 30, aro: true, status: 'active' }; s.cash -= nd.amount; v.deposits.push(nd); }
  }
  /* property: weekly listings, monthly rent */
  if (!v.property.listings.length || d % 7 === 1) refreshListings(s, v, d, userId);
  for (const p of v.property.owned) if ((d - p.boughtDay) % 30 === 0 && d > p.boughtDay) {
    const t = PROPERTY.find(x => x.k === p.k), val = propValue(v6, p); let rent = t.rent ? val * t.rent * (1 + .04 * (p.level || 0)) : 0; if (rent && r() < .08) { rent = 0; p.vacant = (p.vacant || 0) + 1; }
    const net = R(rent - t.up * (1 + .02 * (p.level || 0))); s.cash += net; p.income = (p.income || 0) + net;
  }
  /* art market */
  let ev = 0; if (r() < .012) { ev = r() < .55 ? .06 : -.05; news(v, d, 'art', ev > 0 ? 'Lelang rekor memanaskan pasar seni' : 'Pasar seni lesu', ev > 0 ? 'Karya koleksi terjual jauh di atas estimasi. Harga koleksi ikut naik.' : 'Kolektor menahan pembelian dan harga koleksi melemah.', ev > 0 ? 'up' : 'down'); }
  v.art.idx = Math.round(v.art.idx * Math.exp(.0001 + .012 * gauss(r) + ev) * 10000) / 10000; v.art.hist = [...v.art.hist, v.art.idx].slice(-90);
  for (const it of v.inv) { const dd = SHOP.find(x => x.id === it.itemId); if (dd?.col) { it.k *= Math.exp(dd.col.vol * gauss(r)); it.value = R(collValue(v, it)); } }
  /* life events */
  const ins = insured(v, d);
  for (const biz of s.businesses || []) {
    const lv = biz.v655?.levels?.safety || 0, safe = Math.pow(.9, lv), cctv = equip(v, biz.id, 'cctv'), gen = equip(v, biz.id, 'genset');
    if (r() < .006 * safe * (cctv ? .4 : 1)) {
      const inc = mkIncident(s, biz, 'theft', .04 + r() * .05, h, d), loss = .1 + r() * .2; for (const p of s.products.filter(x => String(x.business_id) === String(biz.id))) p.inventory = Math.round(p.inventory * (1 - loss));
      news(v, d, 'crime', `Kemalingan di ${biz.name}`, `Pencuri membobol toko. Kerugian ${fmt(inc.damage_value)} dan sekitar ${Math.round(loss * 100)}% stok hilang. Buka Operations & Risk untuk menentukan penanganan.`, 'down', { biz: biz.id }); h.addNotice(s, 'Kemalingan', `${biz.name} dibobol. Tentukan penanganan di Operations & Risk.`, 'danger');
    }
    if (r() < .0015 * safe) { const inc = mkIncident(s, biz, 'fire', .08 + r() * .08, h, d); news(v, d, 'fire', `Kebakaran di ${biz.name}`, `Api merusak sebagian aset senilai ${fmt(inc.damage_value)}. Segera tangani kerusakan.`, 'down', { biz: biz.id }); h.addNotice(s, 'Kebakaran', `${biz.name} mengalami kebakaran.`, 'danger'); }
    if (r() < .0015 * safe) { const inc = mkIncident(s, biz, 'flood', .05 + r() * .06, h, d); news(v, d, 'flood', `Banjir merendam ${biz.name}`, `Genangan merusak peralatan dan stok. Kerugian ${fmt(inc.damage_value)}.`, 'down', { biz: biz.id }); h.addNotice(s, 'Banjir', `${biz.name} terdampak banjir.`, 'danger'); }
    if (r() < .004) { const loss = R(biz.value * (.004 + r() * .008) * (gen ? .2 : 1)); biz.cash -= loss; news(v, d, 'power', `Listrik padam di ${biz.name}`, gen ? `Genset menyala dan kerugian ditekan menjadi ${fmt(loss)}.` : `Operasional terhenti beberapa jam. Kerugian ${fmt(loss)}.`, gen ? 'mixed' : 'down', { biz: biz.id }); }
    if (r() < .004) { biz.reputation = Math.max(0, biz.reputation - 5); news(v, d, 'business', `Ulasan negatif viral tentang ${biz.name}`, 'Reputasi turun 5 poin. Tingkatkan kualitas layanan untuk memulihkannya.', 'down', { biz: biz.id }); }
    if (r() < .003) { const fine = R(biz.value * .003); biz.cash -= fine; news(v, d, 'business', `Inspeksi dinas terhadap ${biz.name}`, `Ada temuan administrasi dengan denda ${fmt(fine)}.`, 'down', { biz: biz.id }); }
    if (r() < .003) { for (const p of s.products.filter(x => String(x.business_id) === String(biz.id))) p.unit_cost = R(p.unit_cost * 1.05); news(v, d, 'business', `Pemasok menaikkan harga untuk ${biz.name}`, 'Biaya bahan naik 5%. Pertimbangkan menaikkan harga atau meningkatkan efisiensi.', 'down', { biz: biz.id }); }
    for (const e of (s.employees || []).filter(x => String(x.business_id) === String(biz.id) && x.status === 'active' && x.v700)) {
      const x = e.v700, sat = e.salary / (x.expected || e.salary); x.loyalty = clamp(x.loyalty + (sat < .95 ? -.12 : .03), 0, 100);
      if (e.morale < 30 && x.loyalty < 40 && r() < .03) { e.status = 'resigned'; news(v, d, 'hr', `${e.name} mengundurkan diri`, `${e.role} di ${biz.name} keluar karena moral dan loyalitas rendah.`, 'down'); h.addNotice(s, 'Karyawan keluar', `${e.name} mengundurkan diri.`, 'warning'); continue; }
      if (x.loyalty < 45 && r() < .004) { e.status = 'resigned'; news(v, d, 'hr', `${e.name} pindah ke pesaing`, `${e.role} di ${biz.name} menerima tawaran dengan gaji lebih tinggi.`, 'down'); continue; }
      if (x.trait === 'ambitious' && !x.askRaise && r() < .004) { x.askRaise = true; h.addNotice(s, 'Permintaan kenaikan gaji', `${e.name} meminta kenaikan gaji.`, 'info'); }
      if (x.honesty < 35 && r() < .002) { const l = R(200000 + r() * 800000); biz.cash -= l; news(v, d, 'crime', `Kehilangan kas di ${biz.name}`, `Selisih kas ${fmt(l)} ditemukan dan mengarah pada kelalaian internal.`, 'down'); }
      if (e.morale > 75 && r() < .002) { biz.reputation = Math.min(100, biz.reputation + 1); news(v, d, 'hr', `${e.name} menjadi karyawan teladan`, `Pelayanan prima ${e.role} di ${biz.name} dipuji pelanggan.`, 'up'); }
    }
  }
  if (r() < .02) {
    const k = Math.floor(r() * 5), cap = s.cash;
    if (k === 0 && cap > 200000) { const l = R(Math.min(cap * .02, 1500000) * (ins ? .3 : 1)); s.cash -= l; news(v, d, 'crime', 'Dompet hilang', `Kehilangan ${fmt(l)}.${ins ? ' Asuransi menanggung sebagian.' : ''}`, 'down'); h.addNotice(s, 'Dompet hilang', `Kerugian ${fmt(l)}.`, 'warning'); }
    if (k === 1 && cap > 500000) { const l = R((500000 + r() * 1500000) * (ins ? .3 : 1)); s.cash -= Math.min(l, cap); news(v, d, 'crime', 'Ponsel dicuri', `Anda membeli ponsel pengganti seharga ${fmt(l)}.`, 'down'); }
    if (k === 2 && cap > 1000000) { const l = R(Math.min(cap * .03, 3000000)); s.cash -= l; news(v, d, 'crime', 'Korban penipuan online', `Anda kehilangan ${fmt(l)} karena tautan palsu.`, 'down'); h.addNotice(s, 'Penipuan online', `Kerugian ${fmt(l)}.`, 'warning'); }
    if (k === 3 && cap > 300000) { const l = R(300000 + r() * 1200000); s.cash -= Math.min(l, cap); news(v, d, 'life', 'Biaya servis mendadak', `Pengeluaran tak terduga ${fmt(l)}.`, 'down'); }
    if (k === 4) { const g = R(300000 + r() * 1700000); s.cash += g; news(v, d, 'life', 'Bonus tak terduga', `Anda menerima ${fmt(g)} dari arisan dan bonus kecil.`, 'up'); }
  }
  for (const p of v.property.owned) { if (r() < .001) { const l = R(propValue(v6, p) * .02 * (ins ? .3 : 1)); s.cash -= l; news(v, d, 'crime', `Pembobolan ${p.n}`, `Biaya perbaikan ${fmt(l)}.`, 'down'); } if (r() < .001) { const l = R(propValue(v6, p) * .015 * (ins ? .3 : 1)); s.cash -= l; news(v, d, 'flood', `Banjir di ${p.n}`, `Biaya pemulihan ${fmt(l)}.`, 'down'); } }
  /* creator: history, offers, deal deadlines */
  const cr = v.creator;
  for (const [k, pl] of Object.entries(v6.platforms || {})) {
    const dv = pl.views - (cr.last[k] ?? pl.views); cr.last[k] = pl.views; cr.hist[k] = [...(cr.hist[k] || []), { d, v: Math.max(0, Math.round(dv)), f: Math.round(pl.followers) }].slice(-30);
    if (pl.followers >= 1000 && !cr.offers.some(o => o.platform === k) && !cr.deals.some(o => o.platform === k) && r() < Math.min(.08, pl.followers / 200000 + .01)) {
      const brand = pick(r, BRANDS), payout = clamp(R(pl.followers * (80 + r() * 120) / 10000) * 10000, 150000, 50000000);
      cr.offers.push({ id: h.uid(), platform: k, brand, payout, need: Math.floor(pl.followers * .9), deadline: d + 5, day: d }); news(v, d, 'creator', `${brand} menawarkan kerja sama`, `Tawaran sponsor ${fmt(payout)} untuk kanal ${k}. Berlaku sampai hari ${d + 5}.`, 'up');
    }
  }
  cr.offers = cr.offers.filter(o => o.deadline >= d);
  cr.deals = cr.deals.filter(o => { if (o.deadline >= d) return true; const pl = v6.platforms[o.platform]; if (pl) pl.trend = Math.max(0, pl.trend - 5); h.addNotice(s, 'Sponsor dibatalkan', `Kerja sama ${o.brand} gagal karena tidak ada unggahan tepat waktu.`, 'warning'); return false; });
  /* HR vacancies expire */
  v.hr.vac = v.hr.vac.filter(x => x.expireDay >= d); v.hr.cand = v.hr.cand.filter(c => v.hr.vac.some(x => x.id === c.vacId));
  v.bonus = bonusOf(v); v.lastDay = d;
}
export function genCandidate(r, cat, role, rep) {
  const baseMap = { 'Food & Beverage': 3500000, Technology: 6000000, Media: 4500000, Logistics: 4000000, Manufacturing: 4000000, Services: 3500000, 'E-commerce': 4000000, Fashion: 3200000, Retail: 3200000 }; let base = baseMap[cat] || 3500000; if (/Supervisor|Manager|Developer|Producer/.test(role)) base *= 1.4;
  const exp = Math.floor(r() * 8), tk = Object.keys(TRAITS), trait = pick(r, tk), trait2 = pick(r, tk.filter(x => x !== trait)), flawL = ['late', 'procrast', 'gossip', 'burnout', 'arrogant', 'none', 'none'], flaw = pick(r, flawL);
  const skill = clamp(Math.round(28 + r() * 42 + exp * 2.2), 25, 96), honesty = Math.round(25 + r() * 70), claimed = clamp(Math.round(skill + (honesty < 50 ? (50 - honesty) * .5 + r() * 8 : gauss(r) * 3)), 20, 99), loyalty = clamp(Math.round(30 + r() * 60 + TRAITS[trait].loy), 5, 100);
  const name = `${pick(r, FIRST)} ${pick(r, LAST)}`, edu = pick(r, EDU), age = 20 + exp + Math.floor(r() * 10), expected = Math.round(base * (.75 + skill / 100 * .8) * (.9 + r() * .2) / 50000) * 50000;
  const cap = x => x[0].toUpperCase() + x.slice(1), desc = `${name} (${age}) lulusan ${edu}, ${exp ? exp + ' tahun' : 'belum punya'} pengalaman sebagai ${role}. ${cap(TRAITS[trait].txt)}. Sisi lain: ${TRAITS[trait2].txt}.`;
  return { id: `c${Math.floor(r() * 1e9)}`, name, age, edu, exp, role, trait, trait2, flaw, claimed, skill, honesty, loyalty, expected, desc, asked: [], tests: {}, attempts: 0, rep };
}
