// Katalog aset yang dapat di-TRADING di Asset Market (SIMULATED).
// Parameter di sini adalah input untuk simulation engine — bukan harga pasar nyata.
// muDaily = drift harian (log-return), sigmaDaily = volatilitas harian, beta = sensitivitas ke sentimen pasar.
export const MARKET_ASSETS = [
  { symbol: 'BTC',  name: 'Bitcoin (simulasi)',          class: 'crypto', unit: 'koin',  minQty: 0.0001, step: 0.0001, lot: 1,   startPrice: 1_050_000_000, muDaily: 0.0004, sigmaDaily: 0.032, beta: 1.6, baseVolume: 420,     feeBuy: 0.001,  feeSell: 0.001 },
  { symbol: 'ETH',  name: 'Ethereum (simulasi)',         class: 'crypto', unit: 'koin',  minQty: 0.001,  step: 0.001,  lot: 1,   startPrice: 52_000_000,    muDaily: 0.0003, sigmaDaily: 0.038, beta: 1.8, baseVolume: 6_800,   feeBuy: 0.001,  feeSell: 0.001 },
  { symbol: 'BBCA', name: 'Bank Central Asia (simulasi)', class: 'saham',  unit: 'lot',   minQty: 1,      step: 1,      lot: 100, startPrice: 9_650,         muDaily: 0.0002, sigmaDaily: 0.012, beta: 0.7, baseVolume: 180_000, feeBuy: 0.0015, feeSell: 0.0025 },
  { symbol: 'TLKM', name: 'Telkom Indonesia (simulasi)',  class: 'saham',  unit: 'lot',   minQty: 1,      step: 1,      lot: 100, startPrice: 3_120,         muDaily: 0.0000, sigmaDaily: 0.015, beta: 0.6, baseVolume: 260_000, feeBuy: 0.0015, feeSell: 0.0025 },
  { symbol: 'BBRI', name: 'Bank Rakyat Indonesia (simulasi)', class: 'saham', unit: 'lot', minQty: 1,    step: 1,      lot: 100, startPrice: 4_380,         muDaily: 0.0001, sigmaDaily: 0.016, beta: 0.8, baseVolume: 310_000, feeBuy: 0.0015, feeSell: 0.0025 },
  { symbol: 'GOTO', name: 'GoTo Gojek Tokopedia (simulasi)', class: 'saham', unit: 'lot', minQty: 1,     step: 1,      lot: 100, startPrice: 68,            muDaily: -0.0001, sigmaDaily: 0.034, beta: 1.3, baseVolume: 2_400_000, feeBuy: 0.0015, feeSell: 0.0025 },
];

export const TICKS_PER_DAY = 48;      // 1 tick = 30 menit waktu simulasi
export const WARMUP_DAYS = 14;        // riwayat yang dibangkitkan engine saat world-init (dari seed)
