// Katalog instrumen INVESTASI jangka panjang (SIMULATED). Terpisah dari Asset Market.
// Nilai diperbarui harian (saham/emas/obligasi) atau bulanan (tanah/properti) oleh engine,
// bukan per tick seperti trading.
export const INVEST_CATEGORIES = [
  { id: 'saham',    label: 'Saham & Index Fund', short: 'Saham',    updates: 'Harian, mengikuti laba perusahaan (EPS) × valuasi (P/E) yang dipengaruhi suku bunga & sentimen ekonomi.', liquidity: 'Tinggi (T+2 simulasi)', horizon: '3–5 tahun simulasi' },
  { id: 'emas',     label: 'Emas',               short: 'Emas',     updates: 'Harian, dipengaruhi inflasi, permintaan, dan sentimen risiko (naik saat sentimen memburuk).', liquidity: 'Tinggi, tetapi ada selisih harga jual-beli (spread)', horizon: '≥ 3 tahun simulasi' },
  { id: 'tanah',    label: 'Tanah',              short: 'Tanah',    updates: 'Penilaian ulang bulanan berdasarkan pertumbuhan wilayah.', liquidity: 'Rendah — penjualan butuh waktu mencari pembeli', horizon: '5–10 tahun simulasi' },
  { id: 'properti', label: 'Properti Sewa',      short: 'Properti', updates: 'Sewa dibayar bulanan sesuai okupansi; nilai properti dinilai ulang bulanan.', liquidity: 'Rendah', horizon: '≥ 5 tahun simulasi' },
  { id: 'obligasi', label: 'Obligasi',           short: 'Obligasi', updates: 'Kupon tetap dibayar bulanan; harga pasar (jika dapat diperdagangkan) bergerak berlawanan dengan suku bunga.', liquidity: 'Sedang / sesuai jenis', horizon: 'Sampai jatuh tempo' },
  { id: 'deposito', label: 'Deposito',           short: 'Deposito', updates: 'Bunga tetap, dibayarkan saat jatuh tempo. Pencairan awal dikenai penalti.', liquidity: 'Terkunci sampai jatuh tempo', horizon: '1–3 bulan simulasi' },
];

// Perusahaan fiktif untuk investasi saham jangka panjang (valuasi berbasis fundamental).
export const INVEST_STOCKS = [
  { id: 'NSPG', name: 'PT Nusa Pangan Tbk (fiktif)',    sector: 'Konsumer',   eps: 210, pe: 16, growth: 0.07, divYield: 0.035, risk: 'Sedang', minBuy: 1, lot: 100 },
  { id: 'ARKA', name: 'PT Arka Infrastruktur Tbk (fiktif)', sector: 'Infrastruktur', eps: 95, pe: 13, growth: 0.05, divYield: 0.02, risk: 'Sedang', minBuy: 1, lot: 100 },
  { id: 'TKNO', name: 'PT Teknologi Nusantara Tbk (fiktif)', sector: 'Teknologi', eps: 40, pe: 34, growth: 0.15, divYield: 0.0, risk: 'Tinggi', minBuy: 1, lot: 100 },
];
export const INDEX_FUNDS = [
  { id: 'BZ30', name: 'Reksa Dana Indeks BizSim-30', expenseRatio: 0.006, risk: 'Sedang', minBuy: 10_000, startNav: 1_000, note: 'Mengikuti rata-rata tertimbang 30 perusahaan simulasi. Biaya pengelolaan dipotong harian.' },
];

export const GOLD = { id: 'EMAS', name: 'Emas batangan digital (gram)', startPrice: 1_420_000, buybackRatio: 0.925, minGram: 0.01, storageFeeYear: 0.0, risk: 'Rendah–Sedang' };

export const LAND_PLOTS = [
  { id: 'TNH-PCT', location: 'Pacitan, Jawa Timur',  area: 200, pricePerM2: 450_000,   growthYear: 0.06, pbbRate: 0.001, sellDays: [30, 75], zone: 'Pesisir, dekat jalur lintas selatan' },
  { id: 'TNH-MLG', location: 'Malang, Jawa Timur',   area: 120, pricePerM2: 2_400_000, growthYear: 0.08, pbbRate: 0.002, sellDays: [20, 55], zone: 'Dekat kampus' },
  { id: 'TNH-SLM', location: 'Sleman, DIY',          area: 150, pricePerM2: 3_100_000, growthYear: 0.09, pbbRate: 0.002, sellDays: [20, 50], zone: 'Kawasan berkembang' },
  { id: 'TNH-BKS', location: 'Bekasi, Jawa Barat',   area: 100, pricePerM2: 6_500_000, growthYear: 0.07, pbbRate: 0.003, sellDays: [15, 45], zone: 'Dekat kawasan industri' },
];
export const LAND_COSTS = { buyTax: 0.05, notary: 0.01, sellTax: 0.025, sellFee: 0.01 };

export const RENTAL_PROPERTIES = [
  { id: 'PRP-KOS', name: 'Kos 6 kamar', location: 'Sleman, DIY', price: 780_000_000, rentPerUnit: 1_300_000, units: 6, baseOccupancy: 0.82, maintYear: 0.012, mgmtFee: 0.08, growthYear: 0.06, sellDays: [30, 90] },
  { id: 'PRP-RKO', name: 'Ruko 2 lantai', location: 'Malang, Jawa Timur', price: 1_250_000_000, rentPerUnit: 7_500_000, units: 1, baseOccupancy: 0.75, maintYear: 0.01, mgmtFee: 0.05, growthYear: 0.05, sellDays: [45, 120] },
  { id: 'PRP-KTR', name: 'Kontrakan 3 pintu', location: 'Pacitan, Jawa Timur', price: 320_000_000, rentPerUnit: 850_000, units: 3, baseOccupancy: 0.78, maintYear: 0.015, mgmtFee: 0.0, growthYear: 0.05, sellDays: [30, 90] },
];

export const BONDS = [
  { id: 'ORI-S1', name: 'ORI-SIM 01 (obligasi negara ritel)', coupon: 0.064, tenorDays: 360, tradable: true,  minBuy: 1_000_000, risk: 'Rendah', note: 'Dapat dijual sebelum jatuh tempo pada harga pasar simulasi.' },
  { id: 'SBR-S1', name: 'SBR-SIM 01 (tabungan negara)',       coupon: 0.066, tenorDays: 540, tradable: false, minBuy: 1_000_000, risk: 'Rendah', note: 'Tidak dapat diperdagangkan. Pencairan awal maksimal 50% setelah 180 hari.' },
  { id: 'OBK-S1', name: 'Obligasi Korporasi PT Arka (fiktif, rating A)', coupon: 0.085, tenorDays: 720, tradable: true, minBuy: 5_000_000, risk: 'Sedang', note: 'Kupon lebih tinggi dengan risiko gagal bayar simulasi.' },
];

export const DEPOSITS = [
  { id: 'DEP-30', name: 'Deposito 1 bulan', rate: 0.0425, tenorDays: 30, minBuy: 1_000_000, penalty: 0.005 },
  { id: 'DEP-90', name: 'Deposito 3 bulan', rate: 0.0475, tenorDays: 90, minBuy: 1_000_000, penalty: 0.01 },
];
