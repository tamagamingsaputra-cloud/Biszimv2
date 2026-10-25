// BUSINESS ENGINE — simulasi harian per unit bisnis + simulasi kelayakan (Monte Carlo deterministik).
import { BUSINESS_CATALOG, LOCATIONS, SUPPLIERS } from '../data/business-catalog.js';
import { hrand, hnorm, clamp } from './rng.js';

export const catalogById = id => BUSINESS_CATALOG.find(b => b.id === id);
const SPOIL = { 'F&B': 0.03, Ritel: 0.003, Manufaktur: 0.004 };

export function capacityOf(cat, b, ownerBusy) {
  const owner = cat.ownerCapacity * (ownerBusy ? 0.5 : 1);
  if ((cat.minStaff || 0) > b.staff) return 0;
  return (owner + b.staff * cat.staffCapacity) * b.capacityMult;
}

/** Model permintaan — dipakai oleh simulasi harian DAN simulasi kelayakan (asumsi yang sama). */
export function demandModel(cat, loc, p, eco, noiseZ, weekday, daysOpen) {
  const priceFactor = Math.pow(p.price / cat.refPrice, -cat.elasticity);
  const mkt = 1 + 0.35 * Math.log10(1 + p.marketingDaily / Math.max(10_000, cat.refPrice * 2));
  const rating = 0.7 + 0.12 * p.rating;
  const ramp = Math.min(1, 0.45 + 0.55 * daysOpen / 30);
  const wk = (weekday === 0 || weekday === 6) ? (['F&B', 'Ritel', 'Jasa'].includes(cat.sector) ? 1.15 : 0.85) : 1;
  const sd = { Rendah: 0.15, Sedang: 0.22, Tinggi: 0.3 }[cat.risk.level] || 0.2;
  const noise = Math.exp(sd * noiseZ - sd * sd / 2);
  return cat.baseDemand * (p.fit || 1) * loc.traffic * eco.consumer * priceFactor * mkt * rating * ramp * wk * noise;
}

export function simulateBusinessDay(b, eco, seed, day, weekday, ownerBusy) {
  const cat = catalogById(b.typeId), loc = LOCATIONS[b.location], sup = SUPPLIERS[b.supplier];
  // pesanan stok datang
  const arrived = [];
  b.pending = b.pending.filter(o => { if (o.arriveDay <= day) { b.stock += o.qty; b.stockValue += o.cost; arrived.push(o); return false; } return true; });
  const daysOpen = day - b.openedDay;
  const demand = demandModel(cat, loc, b, eco, hnorm(seed, 'biz', b.bid, day), weekday, daysOpen);
  const cap = capacityOf(cat, b, ownerBusy);
  let sold = Math.min(demand, cap, cat.stockBased ? b.stock : Infinity);
  sold = cat.unit === 'proyek-hari' ? Math.round(sold * 10) / 10 : Math.floor(sold);
  const lost = Math.max(0, demand - sold);
  const revenue = sold * b.price;
  let cogs;
  if (cat.stockBased) {
    const avg = b.stock > 0 ? b.stockValue / b.stock : cat.unitCost;
    cogs = sold * avg; b.stock -= sold; b.stockValue -= cogs;
    const spoil = Math.floor(b.stock * (SPOIL[cat.sector] || 0.002));
    if (spoil > 0) { const sv = spoil * (b.stockValue / Math.max(1, b.stock)); b.stock -= spoil; b.stockValue -= sv; cogs += sv; }
  } else cogs = sold * cat.unitCost;
  const fixed = (cat.fixedMonthly + loc.rentMonthly) / 30;
  const salaries = b.staff * cat.staffSalary / 30;
  const marketing = b.marketingDaily;
  const profit = revenue - cogs - fixed - salaries - marketing;
  // kepuasan pelanggan
  const lostRatio = demand > 0 ? lost / demand : 0;
  if (lostRatio > 0.2) b.rating -= 0.04; else if (b.price <= cat.refPrice * 1.1) b.rating += 0.015; else b.rating += 0.005;
  b.rating = clamp(b.rating, 1, 5);
  // auto restock
  if (cat.stockBased && b.autoRestock && b.stock + b.pending.reduce((s, o) => s + o.qty, 0) < b.autoRestock.threshold) {
    b._autoOrder = b.autoRestock.qty;
  }
  const rec = { day, demand: Math.round(demand * 10) / 10, capacity: Math.round(cap), sold, lost: Math.round(lost), customers: sold, revenue, cogs, fixed, salaries, marketing, profit, stockEnd: b.stock, arrived: arrived.length };
  b.history.push(rec); if (b.history.length > 120) b.history.shift();
  b.cumProfit += profit;
  return rec;
}

/** Ketidakpastian kecocokan konsep/lokasi — tidak diketahui pemain sebelum bisnis berjalan. */
export function conceptFit(cat, z) { const sd = { Rendah: 0.15, Sedang: 0.25, Tinggi: 0.35 }[cat.risk.level] || 0.25; return Math.exp(sd * z - sd * sd / 2); }

export function restockCost(cat, supplierId, qty) { return Math.round(qty * cat.unitCost * SUPPLIERS[supplierId].costMult); }
export function leadTime(seed, b, supplierId, day) {
  const s = SUPPLIERS[supplierId];
  return s.leadDays + (hrand(seed, 'lead', b.bid, day, b.pending.length) > s.reliability ? 1 + Math.floor(hrand(seed, 'lead2', b.bid, day) * 2) : 0);
}

/**
 * Simulasi kelayakan: N skenario × 30 hari dengan model permintaan yang sama dengan engine.
 * Menghasilkan rentang laba bulanan (p10/p50/p90) — BUKAN janji keuntungan.
 */
export function feasibility(seed, typeId, locId, opts, eco, ownerBusy, runs = 120) {
  const cat = catalogById(typeId), loc = LOCATIONS[locId];
  const p = { price: opts.price, marketingDaily: opts.marketingDaily, rating: 3, fit: 1 };
  const staff = opts.staff, capMult = 1;
  const results = [], month2 = [];
  for (let r = 0; r < runs; r++) {
    let total = 0, total2 = 0;
    p.fit = conceptFit(cat, hnorm(seed, 'feasFit', typeId, locId, r));
    for (let d = 0; d < 60; d++) {
      const z = hnorm(seed, 'feas', typeId, locId, r, d);
      const ecoR = { ...eco, consumer: eco.consumer * Math.exp(0.05 * hnorm(seed, 'feasEco', r)) };
      const demand = demandModel(cat, loc, p, ecoR, z, d % 7, d);
      const cap = capacityOf(cat, { staff, capacityMult: capMult }, ownerBusy);
      const sold = Math.min(demand, cap);
      const profit = sold * (p.price - cat.unitCost) - (cat.fixedMonthly + loc.rentMonthly) / 30 - staff * cat.staffSalary / 30 - p.marketingDaily;
      if (d < 30) total += profit; else total2 += profit;
    }
    results.push(total); month2.push(total2);
  }
  const q = (arr, x) => { const s = [...arr].sort((a, b) => a - b); return s[Math.floor(x * (s.length - 1))]; };
  const cap = capacityOf(cat, { staff, capacityMult: 1 }, ownerBusy);
  return {
    runs, p10: q(results, 0.1), p50: q(results, 0.5), p90: q(results, 0.9),
    m2p10: q(month2, 0.1), m2p50: q(month2, 0.5), m2p90: q(month2, 0.9),
    probLoss: results.filter(x => x < 0).length / runs, probLoss2: month2.filter(x => x < 0).length / runs,
    capacity: cap, unitMargin: p.price - cat.unitCost,
    fixedMonthly: cat.fixedMonthly + loc.rentMonthly + staff * cat.staffSalary,
  };
}
