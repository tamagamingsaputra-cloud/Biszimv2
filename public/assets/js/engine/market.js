// MARKET ENGINE — menerbitkan market tick untuk Asset Market (SIMULATED).
// Harga = fungsi deterministik dari (seed, simbol, indeks tick global) + state sentimen.
import { MARKET_ASSETS, TICKS_PER_DAY } from '../data/market-assets.js';
import { hnorm, clamp } from './rng.js';

const MAX_TICKS = TICKS_PER_DAY * 2;   // 2 hari tick 30-menit (untuk intraday & 1 hari)
const MAX_HOURLY = 24 * 30;            // 30 hari titik per jam (untuk 7 & 30 hari)
const MAX_DAILY = 120;

export function initMarket() {
  const assets = {};
  for (const a of MARKET_ASSETS) {
    assets[a.symbol] = { price: a.startPrice, dayOpen: a.startPrice, prevClose: a.startPrice, hi: a.startPrice, lo: a.startPrice, volToday: 0, ticks: [], hourly: [], daily: [] };
  }
  return { sentiment: 0, assets };
}

export function idxTick(p) { // fraksi harga BEI (disederhanakan)
  if (p < 200) return 1; if (p < 500) return 2; if (p < 2000) return 5; if (p < 5000) return 10; return 25;
}
export function quotePrice(asset, raw) {
  if (asset.class === 'saham') { const t = idxTick(raw); return Math.max(t, Math.round(raw / t) * t); }
  return Math.round(raw);
}

export function marketTick(m, seed, g, ecoSentiment = 0) {
  const zs = hnorm(seed, 'sent', g);
  m.sentiment = clamp(0.985 * m.sentiment + 0.06 * zs + 0.002 * ecoSentiment, -1, 1);
  for (const a of MARKET_ASSETS) {
    const st = m.assets[a.symbol];
    const sigT = a.sigmaDaily / Math.sqrt(TICKS_PER_DAY);
    const muT = a.muDaily / TICKS_PER_DAY;
    const volMult = 1 + 0.6 * Math.abs(m.sentiment);
    const z = hnorm(seed, 'mkt', a.symbol, g);
    const s = sigT * volMult;
    const ret = muT + a.beta * 0.0007 * m.sentiment + s * z - 0.5 * s * s;
    st.price = st.price * Math.exp(ret);
    const p = quotePrice(a, st.price);
    const vol = (a.baseVolume / TICKS_PER_DAY) * (0.55 + 0.9 * Math.abs(z)) * (1 + 0.5 * Math.abs(m.sentiment));
    st.volToday += vol;
    st.hi = Math.max(st.hi, p); st.lo = Math.min(st.lo, p);
    st.ticks.push([g, p, vol]); if (st.ticks.length > MAX_TICKS) st.ticks.shift();
    if (g % 2 === 1) { st.hourly.push([g, p]); if (st.hourly.length > MAX_HOURLY) st.hourly.shift(); }
  }
}

export function marketDayClose(m, day) {
  for (const a of MARKET_ASSETS) {
    const st = m.assets[a.symbol];
    const c = quotePrice(a, st.price);
    st.daily.push({ d: day, o: st.dayOpen, h: st.hi, l: st.lo, c, v: st.volToday });
    if (st.daily.length > MAX_DAILY) st.daily.shift();
    st.prevClose = c; st.dayOpen = c; st.hi = c; st.lo = c; st.volToday = 0;
  }
}

export function currentQuote(m, sym) {
  const a = MARKET_ASSETS.find(x => x.symbol === sym);
  return quotePrice(a, m.assets[sym].price);
}

/** Volatilitas terealisasi 24 jam (std return per-jam × √24), dalam fraksi. */
export function realizedVol(st) {
  const h = st.hourly.slice(-25);
  if (h.length < 6) return null;
  const r = [];
  for (let i = 1; i < h.length; i++) r.push(Math.log(h[i][1] / h[i - 1][1]));
  const mean = r.reduce((s, x) => s + x, 0) / r.length;
  const v = r.reduce((s, x) => s + (x - mean) ** 2, 0) / (r.length - 1);
  return Math.sqrt(v) * Math.sqrt(24);
}

/** Seri untuk grafik per rentang; null jika data belum mendukung. */
export function seriesFor(st, range, tickOfDay) {
  if (range === 'intraday') {
    const n = Math.max(1, tickOfDay);
    const pts = st.ticks.slice(-n);
    return pts.length >= 2 ? pts.map(t => [t[0], t[1]]) : null;
  }
  if (range === '1d') return st.ticks.length >= TICKS_PER_DAY ? st.ticks.slice(-TICKS_PER_DAY).map(t => [t[0], t[1]]) : null;
  if (range === '7d') return st.hourly.length >= 24 * 7 ? st.hourly.slice(-24 * 7) : null;
  if (range === '30d') return st.hourly.length >= 24 * 30 ? st.hourly.slice(-24 * 30) : null;
  return null;
}
export const RANGE_NEEDS = { intraday: 'Tersedia setelah tick pertama hari ini', '1d': 'Butuh 48 tick (1 hari simulasi)', '7d': 'Butuh 7 hari riwayat simulasi', '30d': 'Butuh 30 hari riwayat simulasi' };
