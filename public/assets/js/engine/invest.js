// INVESTMENT ENGINE — valuasi jangka panjang (SIMULATED).
// Tiap kelas aset punya model sendiri: tidak ada yang bergerak per-tick seperti crypto.
import { INVEST_STOCKS, INDEX_FUNDS, GOLD, LAND_PLOTS, RENTAL_PROPERTIES, BONDS, DEPOSITS, LAND_COSTS } from '../data/investment-catalog.js';
import { hnorm, hrand, clamp } from './rng.js';

const H = 400;
const push = (arr, v) => { arr.push(v); if (arr.length > H) arr.shift(); };

export function initInvest() {
  const stocks = {};
  for (const s of INVEST_STOCKS) stocks[s.id] = { eps: s.eps, pe: s.pe, price: Math.round(s.eps * s.pe), hist: [] };
  const funds = {};
  for (const f of INDEX_FUNDS) funds[f.id] = { nav: f.startNav, hist: [] };
  const land = {};
  for (const l of LAND_PLOTS) land[l.id] = { ppm: l.pricePerM2, hist: [] };
  const prop = {};
  for (const p of RENTAL_PROPERTIES) prop[p.id] = { value: p.price, hist: [], occupancy: p.baseOccupancy };
  return { stocks, funds, gold: { price: GOLD.startPrice, hist: [] }, land, prop, holdings: [], seq: 1 };
}

export function investDay(inv, eco, seed, day, monthStart) {
  // Saham: harga = EPS × P/E. EPS tumbuh mengikuti ekonomi; P/E turun saat suku bunga naik.
  let idxRet = 0;
  for (const s of INVEST_STOCKS) {
    const st = inv.stocks[s.id];
    const prev = st.price;
    st.eps *= Math.exp((s.growth / 360) * (0.4 + 0.6 * eco.growth / 0.05) + 0.0035 * hnorm(seed, 'eps', s.id, day));
    const peTarget = s.pe * (1 - 4 * (eco.rate - 0.0575)) * (1 + 0.12 * eco.sentiment);
    st.pe += 0.08 * (peTarget - st.pe) + s.pe * 0.004 * hnorm(seed, 'pe', s.id, day);
    st.price = Math.max(10, Math.round(st.eps * st.pe));
    idxRet += Math.log(st.price / prev) / INVEST_STOCKS.length;
    push(st.hist, [day, st.price]);
  }
  for (const f of INDEX_FUNDS) {
    const st = inv.funds[f.id];
    const broad = 0.00025 + 0.0016 * eco.sentiment + 0.0065 * hnorm(seed, 'idx', day);
    st.nav = st.nav * Math.exp(0.35 * idxRet + 0.65 * broad) * (1 - f.expenseRatio / 360);
    push(st.hist, [day, st.nav]);
  }
  // Emas: inflasi + permintaan (siklus ~20 hari) + safe haven saat sentimen buruk.
  const demand = 0.0004 * hnorm(seed, 'golddem', Math.floor(day / 20));
  const g = eco.inflation / 360 + demand - 0.0012 * eco.sentiment + 0.0065 * hnorm(seed, 'gold', day);
  inv.gold.price = Math.round(inv.gold.price * Math.exp(g));
  push(inv.gold.hist, [day, inv.gold.price]);
  // Tanah & properti: penilaian ulang bulanan.
  if (monthStart) {
    for (const l of LAND_PLOTS) {
      const st = inv.land[l.id];
      st.ppm = Math.round(st.ppm * (1 + l.growthYear / 12 + 0.006 * hnorm(seed, 'land', l.id, day)));
      push(st.hist, [day, st.ppm]);
    }
    for (const p of RENTAL_PROPERTIES) {
      const st = inv.prop[p.id];
      st.value = Math.round(st.value * (1 + p.growthYear / 12 + 0.005 * hnorm(seed, 'prop', p.id, day)));
      st.occupancy = clamp(p.baseOccupancy + 0.12 * hnorm(seed, 'occ', p.id, day) + 0.05 * eco.sentiment, 0.3, 1);
      push(st.hist, [day, st.value]);
    }
  }
}

export function bondPricePct(h, eco, seed, day) {
  const b = BONDS.find(x => x.id === h.iid);
  if (!b.tradable) return 100;
  const remYears = Math.max(0, (h.maturityDay - day) / 360);
  let p = 100 * (1 - remYears * (eco.rate - h.rateAtBuy) * 1.0) + 0.15 * hnorm(seed, 'bond', h.hid, day);
  if (h.downgraded) p -= 8;
  return clamp(p, 60, 110);
}

export const instrument = (cat, iid) => ({
  saham: () => INVEST_STOCKS.find(x => x.id === iid) || INDEX_FUNDS.find(x => x.id === iid),
  emas: () => GOLD, tanah: () => LAND_PLOTS.find(x => x.id === iid), properti: () => RENTAL_PROPERTIES.find(x => x.id === iid),
  obligasi: () => BONDS.find(x => x.id === iid), deposito: () => DEPOSITS.find(x => x.id === iid),
}[cat]());

/** Nilai estimasi saat ini (bukan realisasi). */
export function holdingValue(inv, h, eco, seed, day) {
  switch (h.cat) {
    case 'saham': {
      if (inv.funds[h.iid]) return h.qty * inv.funds[h.iid].nav;
      return h.qty * 100 * inv.stocks[h.iid].price;
    }
    case 'emas': return h.qty * inv.gold.price * GOLD.buybackRatio;
    case 'tanah': { const l = instrument('tanah', h.iid); return l.area * inv.land[h.iid].ppm; }
    case 'properti': return inv.prop[h.iid].value;
    case 'obligasi': return h.qty * bondPricePct(h, eco, seed, day) / 100;
    case 'deposito': { const d = instrument('deposito', h.iid); const el = Math.min(d.tenorDays, day - h.buyDay); return h.qty * (1 + d.rate * 0.8 * el / 360); }
  }
  return 0;
}

/** Nilai bersih jika dijual sekarang (setelah biaya). */
export function holdingNetSale(inv, h, eco, seed, day) {
  const v = holdingValue(inv, h, eco, seed, day);
  if (h.cat === 'saham' && !inv.funds[h.iid]) return v * (1 - 0.0025);
  if (h.cat === 'tanah' || h.cat === 'properti') return v * (1 - LAND_COSTS.sellTax - LAND_COSTS.sellFee);
  if (h.cat === 'deposito') { const d = instrument('deposito', h.iid); if (day - h.buyDay < d.tenorDays) return h.qty * (1 - d.penalty); }
  return v;
}

export function holdingRisk(h) {
  const it = instrument(h.cat, h.iid);
  return it?.risk || { tanah: 'Sedang (likuiditas rendah)', properti: 'Sedang (okupansi & perawatan)', deposito: 'Rendah' }[h.cat] || 'Sedang';
}
export { hrand };
