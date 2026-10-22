/* GENERATED dari netlify/functions/v730-live.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
// BizSim 7.3.0 live price layer. Intraday ticks follow simulation factors (news impulses, market momentum, volatility, mean reversion).
// The path never repeats: each tick is seeded by (user, asset, wall-clock slot). SIMULATION ONLY.
import { rngFor, gauss, clamp } from './v655.js';
import { meta, roundPx, last } from './v700-engine.js';
import { TRADE, TICK } from './v700-data.js';
export const STEP_MS = 3000, DAY_STEPS = 240, MAX_STEPS = 40;
/* finer than the exchange tick so prices visibly move every few seconds in the simulation */
const roundLive = (m, p) => { if (m.c === 'US') return Math.max(1000, Math.round(p / 100) * 100); const st = Math.max(1, Math.round(TICK(p) / 5)); return Math.max(1, Math.round(p / st) * st); };
const LIVE = new Map();
const key = (u, id) => `${u}:${id}`;
const recent = (v, id, sec, kinds) => {
  let drift = 0; const d0 = v.lastDay || 0;
  for (const n of v.news || []) {
    const age = d0 - n.day; if (age < 0 || age > 3) continue; const decay = Math.exp(-age / 1.6);
    if (n.ticker && n.ticker === id && n.pct != null) drift += n.pct / 100 * decay * .25;
    for (const c of n.impact || []) if (c.asset === id || c.asset === sec || kinds.includes(c.asset)) drift += c.pct / 100 * decay * .2;
  }
  return drift;
};
function factorsStock(s, v, id) {
  const m = meta(v, id), st = v.stocks[id], macro = s.v655.macro, ih = v.idxHist || [];
  const pend = (st.imp || []).reduce((a, q) => a + q.per, 0), news = recent(v, id, m.sec, ['IGB']), mom = ih.length > 1 ? ih[ih.length - 1] / ih[ih.length - 2] - 1 : 0;
  const sigmaDay = m.vol / Math.sqrt(365) * (macro.vol || 1), drift = (pend + news + (m.beta || 1) * mom * .4);
  return { m, base: st.price, sigma: sigmaDay / Math.sqrt(DAY_STEPS) * 1.3, drift: drift / DAY_STEPS, lim: .06, sent: pend + news + mom * .4, volaIdx: sigmaDay * Math.sqrt(365) };
}
function factorsTrade(s, v, a) {
  const cs = v.trading.c[a.id], base = last(cs)[3], macro = s.v655.macro, ih = v.idxHist || [];
  const kinds = a.cls === 'Kripto' ? ['Kripto', 'BTC'] : a.id === 'OIL' ? ['Minyak'] : ['USD/IDR'], news = recent(v, a.id, '', kinds), mom = ih.length > 1 ? ih[ih.length - 1] / ih[ih.length - 2] - 1 : 0;
  const sigmaDay = a.vol / Math.sqrt(365) * (macro.vol || 1);
  return { base, sigma: sigmaDay / Math.sqrt(DAY_STEPS) * 1.3, drift: (news + a.corr * mom * .4) / DAY_STEPS, lim: .08, sent: news + a.corr * mom * .4, volaIdx: sigmaDay * Math.sqrt(365) };
}
function step(userId, id, e, f, now, isStock, m) {
  const slots = Math.min(MAX_STEPS, Math.floor((now - e.ts) / STEP_MS)); if (slots < 1) return;
  const c0 = Math.floor(e.ts / STEP_MS);
  for (let i = 1; i <= slots; i++) {
    const r = rngFor(`${userId}:${id}:${c0 + i}`), ret = f.drift + f.sigma * gauss(r) - .02 * Math.log(e.px / f.base);
    e.px = clamp(e.px * Math.exp(ret), f.base * (1 - f.lim), f.base * (1 + f.lim)); e.hi = Math.max(e.hi, e.px); e.lo = Math.min(e.lo, e.px); e.vol += Math.round((40 + Math.abs(ret) * 2e6) * (.6 + r()));
  }
  e.ts += slots * STEP_MS;
}
export function tickAll(s, userId, now = Date.now()) {
  const v = s.v700, out = { ts: now, day: s.day, stocks: {}, trade: {} };
  for (const id of Object.keys(v.stocks)) {
    const st = v.stocks[id]; if (st.status !== 'listed') continue; const f = factorsStock(s, v, id), k = key(userId, id); let e = LIVE.get(k);
    if (!e) { e = { px: f.base, o: f.base, hi: f.base, lo: f.base, vol: 0, day: s.day, ts: now - STEP_MS }; LIVE.set(k, e); }
    if (e.day !== s.day) { e.o = f.base; e.px = clamp(e.px, f.base * .97, f.base * 1.03); e.hi = e.lo = e.px; e.vol = 0; e.day = s.day; }
    step(userId, id, e, f, now, true, f.m);
    out.stocks[id] = { px: roundLive(f.m, e.px), o: e.o, hi: roundLive(f.m, e.hi), lo: roundLive(f.m, e.lo), vol: e.vol, sent: Math.round(f.sent * 1e4) / 1e4, vola: Math.round(f.volaIdx * 100) / 100 };
  }
  for (const a of TRADE) {
    const f = factorsTrade(s, v, a), k = key(userId, a.id); let e = LIVE.get(k);
    if (!e) { e = { px: f.base, o: f.base, hi: f.base, lo: f.base, vol: 0, day: s.day, ts: now - STEP_MS }; LIVE.set(k, e); }
    if (e.day !== s.day) { e.o = f.base; e.px = clamp(e.px, f.base * .97, f.base * 1.03); e.hi = e.lo = e.px; e.vol = 0; e.day = s.day; }
    step(userId, a.id, e, f, now, false, null);
    out.trade[a.id] = { px: Math.round(e.px * 100) / 100, o: e.o, hi: Math.round(e.hi * 100) / 100, lo: Math.round(e.lo * 100) / 100, vol: e.vol, sent: Math.round(f.sent * 1e4) / 1e4, vola: Math.round(f.volaIdx * 100) / 100, spread: Math.round(e.px * .0008 * 100) / 100 };
  }
  return out;
}
export const livePxStock = (v, t) => { const e = LIVE.get(key(v.uid, t)), st = v.stocks[t]; return e && e.day === v.lastDay && st.status === 'listed' ? roundLive(meta(v, t), e.px) : st.price; };
export const livePxTrade = (v, id) => { const e = LIVE.get(key(v.uid, id)); return e && e.day === v.lastDay ? Math.round(e.px * 100) / 100 : last(v.trading.c[id])[3]; };
