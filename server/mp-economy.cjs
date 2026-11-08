// EKONOMI MARKETPLACE (P9) — fungsi murni & deterministik: event kalender simulasi, indeks harga dinamis, kompetisi antar marketplace.
// Terhubung ke ekonomi utama: membaca kondisi ekonomi dunia dari save game pemain (inflation, consumer, sentiment) — tidak ada ekonomi terpisah.
// Tidak memakai Math.random: semua turunan hash (id + hari), sehingga server dan klien selalu sepaham dan hasil dapat diuji.
const M = require('./market-catalog.cjs');
const { hf, dom, doy } = M;
const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
const WARM = 14;

const econOf = game => { const e = game?.economy || {}; return { inflation: Number.isFinite(e.inflation) ? e.inflation : 0.031, consumer: Number.isFinite(e.consumer) ? e.consumer : 1, sentiment: Number.isFinite(e.sentiment) ? e.sentiment : 0, growth: Number.isFinite(e.growth) ? e.growth : 0.05 }; };

// ——— event ekonomi (mengikuti kalender simulasi: hari ke-d dari awal dunia; 360 hari/tahun, 30 hari/bulan) ———
// disc = potongan harga yang diberlakukan marketplace; demand = pengali permintaan pembeli NPC; cats = kategori terdampak (null = semua).
const EVENT_DEF = [
  { id: 'gajian', label: 'Promo Gajian', kind: 'kalender', test: d => dom(d) >= 25, disc: 0.02, demand: 1.22, cats: null },
  { id: 'kembar', label: 'Tanggal Kembar 11.11', kind: 'kampanye', test: d => doy(d) >= 10 * 30 + 9 && doy(d) <= 10 * 30 + 11, disc: 0.06, demand: 1.6, cats: null },
  { id: 'harbolnas', label: 'Harbolnas 12.12', kind: 'kampanye', test: d => doy(d) >= 11 * 30 + 10 && doy(d) <= 11 * 30 + 12, disc: 0.10, demand: 1.9, cats: null },
  { id: 'ramadan', label: 'Promo Ramadan', kind: 'musiman', test: d => doy(d) >= 2 * 30 && doy(d) < 3 * 30, disc: 0.04, demand: 1.35, cats: ['makanan', 'fashion', 'rumah'] },
  { id: 'akhirtahun', label: 'Promo Akhir Tahun', kind: 'musiman', test: d => doy(d) >= 11 * 30 + 15, disc: 0.07, demand: 1.5, cats: null },
  { id: 'lokal', label: 'Kampanye Produk Lokal', kind: 'kampanye', test: d => doy(d) >= 7 * 30 + 9 && doy(d) <= 7 * 30 + 19, disc: 0.05, demand: 1.3, cats: ['makanan', 'fashion', 'pertanian', 'kerja'] },
  { id: 'hujan', label: 'Diskon Musim Hujan', kind: 'musiman', test: d => { const m = Math.floor(doy(d) / 30); return m >= 9 || m <= 1; }, disc: 0.03, demand: 1.1, cats: ['rumah', 'kesehatan', 'kendaraan'] },
  { id: 'kemarau', label: 'Diskon Musim Kemarau', kind: 'musiman', test: d => { const m = Math.floor(doy(d) / 30); return m >= 5 && m <= 8; }, disc: 0.03, demand: 1.12, cats: ['olahraga', 'kecantikan', 'makanan'] },
];
// Flash sale: tiap marketplace punya jendela jam 12:00–14:00 pada hari-hari tertentu untuk satu kategori (deterministik).
function flashOf(market, day) {
  if (hf('flash', market, day) > 0.2) return null;
  const cat = M.CATEGORIES[Math.floor(hf('flashcat', market, day) * M.CATEGORIES.length)].id;
  return { id: 'flash', label: 'Flash Sale ' + M.CATEGORIES.find(c => c.id === cat).label, kind: 'flash', cat, from: 12 * 3600, to: 14 * 3600, disc: 0.18, demand: 2.2, cats: [cat] };
}
function eventsOn(day, market, secOfDay = null) {
  const out = EVENT_DEF.filter(e => e.test(day)).map(({ test, ...e }) => e);
  const f = market ? flashOf(market, day) : null; if (f) out.push({ ...f, live: secOfDay == null ? null : secOfDay >= f.from && secOfDay < f.to });
  return out;
}
// Pengali permintaan & diskon untuk satu kategori pada satu hari (flash sale hanya dihitung saat jendela jamnya aktif atau jam tidak diketahui sepanjang hari ×0.25).
function eventEffect(day, market, cat, secOfDay = null) {
  let demand = 1, disc = 0; const act = [];
  for (const e of eventsOn(day, market, secOfDay)) {
    if (e.cats && !e.cats.includes(cat)) continue;
    const w = e.id === 'flash' ? (e.live === true ? 1 : e.live === false ? 0 : 0.25) : 1; if (!w) continue;
    demand *= 1 + (e.demand - 1) * w; disc = Math.max(disc, e.disc * w); act.push(e.id);
  }
  return { demand, disc, active: act };
}

// ——— harga dinamis ———
// Pengali = inflasi berjalan × gelombang pasokan (acak halus mingguan per subkategori) × tekanan permintaan event/musim × kondisi ekonomi × persaingan.
const wk = (sub, w) => hf('wave', sub, w) * 2 - 1;
function supplyWave(sub, day) { const w = Math.floor(day / 7), f = (day % 7) / 7, a = wk(sub, w), b = wk(sub, w + 1); return (a + (b - a) * (f * f * (3 - 2 * f))) * 0.06; }
function priceMult(l, p, day, econ, stats) {
  const infl = 1 + econ.inflation * clamp(day, 0, 3600) / 360 * 0.5;
  const sup = 1 + supplyWave(p.sub, day);
  const ev = eventEffect(day, l.market, p.cat);
  const pressure = 1 + (ev.demand - 1) * 0.06; // permintaan tinggi menaikkan harga dasar sedikit
  const eco = 1 + (econ.consumer - 1) * 0.12;
  const comp = stats ? 1 - clamp((stats.share - 0.25) * -0.1, -0.03, 0.03) : 1; // pangsa kecil → harga ditekan
  const stockP = l.stockPressure || 1;
  const base = infl * sup * pressure * eco * comp * stockP;
  return { mult: clamp(base * (1 - ev.disc), 0.7, 1.4), event: ev };
}
const roundPrice = n => n >= 100000 ? Math.round(n / 1000) * 1000 : n >= 10000 ? Math.round(n / 500) * 500 : Math.round(n / 100) * 100;

// ——— kompetisi marketplace ———
const BASE_USERS = { shopindo: 6.2e6, lazamall: 2.1e6, tokomart: 3.4e6, belanjaplus: 2.6e6 };
function marketStats(day, econ, playerBoost = {}) {
  const raw = M.MARKETS.map(m => {
    const drift = 1 + 0.12 * Math.sin((day + hf('ph', m.id) * 90) / 60) + 0.02 * (hf('d', m.id, Math.floor(day / 10)) - 0.5);
    const promoLevel = M.VOUCHERS.filter(v => v.market === m.id).length;
    const service = clamp(m.rating / 5 * (0.9 + 0.1 * hf('svc', m.id, Math.floor(day / 30))), 0, 1);
    const feeAttr = 1 - m.feePct * 6;
    const pop = clamp((0.35 * service + 0.25 * feeAttr + 0.2 * (promoLevel / 12) + 0.2 * (m.sellerQuality || 0.5)) * drift + (playerBoost[m.id] || 0), 0.05, 2);
    const users = Math.round((BASE_USERS[m.id] || 2e6) * (1 + 0.0004 * day) * (0.9 + pop * 0.2) * (0.95 + 0.05 * econ.consumer));
    const sellers = M.SELLERS.filter(s => s.market === m.id).length * 90 + Math.floor(day / 12) * (3 + Math.floor(hf('ns', m.id) * 4));
    return { m, pop, users, sellers, service };
  });
  const tot = raw.reduce((s, r) => s + r.pop * r.users, 0);
  return raw.map(r => {
    const share = r.pop * r.users / tot, ev = eventEffect(day, r.m.id, null).demand;
    const txPerDay = Math.round(r.users * 0.0035 * ev * econ.consumer);
    return { id: r.m.id, name: r.m.name, color: r.m.color, users: r.users, sellers: r.sellers, tx: txPerDay, share: Math.round(share * 1000) / 1000, popularity: Math.round(r.pop * 100), service: Math.round(r.service * 100), feePct: r.m.feePct, promo: M.VOUCHERS.filter(v => v.market === r.m.id && (v.scope !== 'event' || (M.EVENT(v.event) && M.EVENT(v.event).test(day)))).length, ev: eventEffect(day, r.m.id, null).active };
  });
}
// Dampak ke dunia: indeks aktivitas marketplace terhadap baseline (dipakai tampilan dan permintaan NPC), tanpa mengubah save klien secara diam-diam.
function worldImpact(day, econ, stats) {
  const baseTx = stats.reduce((s, x) => s + x.users * 0.0035, 0), tx = stats.reduce((s, x) => s + x.tx, 0), act = tx / baseTx;
  const sellers = stats.reduce((s, x) => s + x.sellers, 0);
  return { activity: Math.round(act * 100) / 100, courierJobs: Math.round(tx * 0.9), sellerJobs: sellers, purchasingPower: Math.round(econ.consumer * 100) / 100, inflation: econ.inflation, sentiment: econ.sentiment };
}
// Aktivitas NPC (umpan berita ekonomi): pembukaan toko, promo, penurunan harga, penggunaan voucher — deterministik per hari.
function npcFeed(day, n = 8) {
  const out = []; const pool = ['membuka toko baru', 'meluncurkan promo bundling', 'menurunkan harga produk unggulan', 'menambah stok produk terlaris', 'mengunggah 12 produk baru', 'memakai voucher gratis ongkir', 'mengadakan flash sale toko'];
  for (let d = day; d > day - 10 && out.length < n; d--) for (const m of M.MARKETS) { const u = hf('feed', m.id, d); if (u < 0.28) { const sl = M.SELLERS.filter(s => s.market === m.id); const s = sl[Math.floor(hf('fs', m.id, d) * sl.length)]; out.push({ day: d, market: m.id, marketName: m.name, text: `${s.name} ${pool[Math.floor(hf('fa', m.id, d) * pool.length)]}.` }); } if (out.length >= n) break; }
  return out;
}
module.exports = { WARM, econOf, EVENT_DEF, eventsOn, eventEffect, flashOf, priceMult, roundPrice, marketStats, worldImpact, npcFeed, supplyWave, clamp };
