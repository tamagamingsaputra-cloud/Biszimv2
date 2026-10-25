// KATALOG KEUANGAN & KEHIDUPAN BIZSIM (sumber tunggal, dipakai server untuk validasi dan dikirim ke klien).
// Semua bank, dompet digital, merchant, dan harga adalah FIKTIF untuk simulasi game. Nama dompet terinspirasi
// kebiasaan pembayaran di Indonesia, tetapi bukan layanan resmi dan tidak memakai logo/UI mereka.
// Harga dari server — klien tidak bisa menentukan harga sendiri.

const BANKS = [
  { id: 'bnr', name: 'Bank Nusantara Raya', short: 'BNR', kind: 'konvensional', minAge: 17, minOpen: 250_000, adminMonthly: 12_500,
    transferFee: 2_500, freeTransfers: 0, teller: { days: [1, 2, 3, 4, 5], from: 8, to: 15 }, atm: true, atmFeeOther: 0, cashDepositAtm: true,
    dailyWithdraw: 10_000_000, dailyTransfer: 25_000_000, debitDaily: 15_000_000, card: 'fisik', note: 'Kantor cabang & ATM setor-tarik 24 jam. Biaya admin bulanan.' },
  { id: 'sakti', name: 'Bank Sakti Digital', short: 'Sakti', kind: 'digital', minAge: 17, minOpen: 0, adminMonthly: 0,
    transferFee: 2_500, freeTransfers: 25, teller: null, atm: true, atmFeeOther: 5_000, cashDepositAtm: false,
    dailyWithdraw: 5_000_000, dailyTransfer: 20_000_000, debitDaily: 10_000_000, card: 'virtual', note: 'Tanpa kantor cabang. Kartu debit virtual; tarik tunai di ATM jaringan (biaya). Setor tunai lewat minimarket.' },
  { id: 'pelajar', name: 'TabunganKu Pelajar — Bank Rakyat Desa', short: 'BRD Pelajar', kind: 'pelajar', minAge: 6, maxAge: 17, minOpen: 5_000, adminMonthly: 0,
    transferFee: 2_500, freeTransfers: 0, teller: { days: [1, 2, 3, 4, 5], from: 8, to: 15 }, atm: true, atmFeeOther: 0, cashDepositAtm: false,
    dailyWithdraw: 500_000, dailyTransfer: 1_000_000, debitDaily: 500_000, card: 'fisik', note: 'Untuk usia 6–17 dengan pendampingan wali. Tanpa biaya admin, limit kecil.' },
];

// capability: qris, merchants (id merchant yang menerima), withdraw (ke bank), topup (sumber)
const WALLETS = [
  { id: 'danakita', name: 'DanaKita', inspired: 'DANA', color: '#2F6FB3', basicMax: 2_000_000, verifiedMax: 20_000_000, perTx: 10_000_000,
    topupBankFee: 0, topupCashFee: 2_000, withdrawFee: 2_500, withdrawNeedsVerified: false, qris: true, note: 'Dompet umum: QRIS, top-up gratis dari bank.' },
  { id: 'gojalan', name: 'JalanPay', inspired: 'GoPay', color: '#1F8A5B', basicMax: 2_000_000, verifiedMax: 20_000_000, perTx: 10_000_000,
    topupBankFee: 1_000, topupCashFee: 2_000, withdrawFee: 2_500, withdrawNeedsVerified: true, qris: true, note: 'Ekosistem ojek & pesan antar JalanYuk.' },
  { id: 'ovio', name: 'Ovio', inspired: 'OVO', color: '#5B4B9A', basicMax: 2_000_000, verifiedMax: 20_000_000, perTx: 10_000_000,
    topupBankFee: 1_000, topupCashFee: 2_000, withdrawFee: 5_000, withdrawNeedsVerified: true, qris: true, note: 'Dompet ritel: kafe, bioskop, mal.' },
  { id: 'belanjapay', name: 'BelanjaPay', inspired: 'ShopeePay', color: '#C4572A', basicMax: 2_000_000, verifiedMax: 20_000_000, perTx: 10_000_000,
    topupBankFee: 0, topupCashFee: 2_500, withdrawFee: 0, withdrawNeedsVerified: true, qris: true, note: 'Dompet marketplace Pasarku.' },
];

const CREDIT_PRODUCTS = [
  { id: 'bnr-classic', name: 'Nusantara Classic', issuer: 'bnr', minAge: 21, minIncome: 3_000_000, minLimit: 3_000_000, maxLimit: 15_000_000, limitMult: 3,
    interestMonthly: 0.0175, lateFee: 100_000, minPayPct: 0.05, minPayFloor: 50_000, statementDate: 20, graceDays: 15, minScore: 500 },
];
const CREDIT_RULES = { scoreStart: 600, scoreMin: 300, scoreMax: 850, onTime: 6, minOnly: -4, late: -35, highUtil: -5, highUtilAt: 0.8 };

// Metode: cash, debit, credit, qris, wallet:<id>, transfer (bank transfer / virtual account), cod
const MERCHANTS = [
  { id: 'rumah', name: 'Dapur rumah', cat: 'makan', hours: [5, 22], days: null, methods: ['cash'], note: 'Makan bersama keluarga. Usia di bawah 18 ditanggung wali.' },
  { id: 'warung', name: 'Warung Makan Bu Sri', cat: 'makan', hours: [6, 21], days: null, methods: ['cash', 'qris'], travelMin: 10 },
  { id: 'serbamart', name: 'SerbaMart 24', cat: 'minimarket', hours: [0, 24], days: null, methods: ['cash', 'debit', 'qris', 'wallet'], travelMin: 10, topup: true },
  { id: 'minang', name: 'RM Minang Raya', cat: 'makan', hours: [10, 22], days: null, methods: ['cash', 'debit', 'credit', 'qris'], travelMin: 20 },
  { id: 'kopisenja', name: 'Kopi Senja', cat: 'makan', hours: [8, 23], days: null, methods: ['debit', 'credit', 'qris', 'wallet:ovio', 'wallet:danakita'], travelMin: 15 },
  { id: 'antarrasa', name: 'JalanYuk Food', cat: 'antar', hours: [8, 23], days: null, methods: ['wallet:gojalan', 'credit', 'cod'], note: 'Pesan antar. Ongkir & biaya layanan dihitung server.' },
  { id: 'klinik', name: 'Klinik Sehat Bersama', cat: 'kesehatan', hours: [8, 20], days: [1, 2, 3, 4, 5, 6], methods: ['cash', 'debit', 'credit', 'qris'], travelMin: 20 },
  { id: 'apotek', name: 'Apotek Waras', cat: 'kesehatan', hours: [7, 22], days: null, methods: ['cash', 'debit', 'qris', 'wallet'], travelMin: 10 },
  { id: 'layarkota', name: 'Bioskop Layar Kota', cat: 'hiburan', hours: [10, 23], days: null, methods: ['debit', 'credit', 'qris', 'wallet:ovio'], travelMin: 25 },
  { id: 'pasarku', name: 'Pasarku (marketplace)', cat: 'belanja', hours: [0, 24], days: null, methods: ['wallet:belanjapay', 'transfer', 'credit', 'cod'], note: 'Belanja online, dikirim 2–4 hari.' },
  { id: 'jalanyuk', name: 'JalanYuk Ride', cat: 'transport', hours: [5, 24], days: null, methods: ['wallet:gojalan', 'cash'] },
  { id: 'buskota', name: 'Bus Kota', cat: 'transport', hours: [5, 21], days: null, methods: ['cash', 'qris'] },
];

// Efek kebutuhan (poin 0–100) dan durasi (menit game). Nilai efek dipakai engine kebutuhan klien.
const ITEMS = [
  // dapur rumah
  { id: 'rumah-makan', merchant: 'rumah', name: 'Makan di rumah', price: 15_000, under18: 0, min: 30, fx: { hunger: 45, thirst: 15, mood: 3 } },
  { id: 'rumah-minum', merchant: 'rumah', name: 'Air minum (dispenser)', price: 0, min: 5, fx: { thirst: 30, bladder: -12 } },
  // warung
  { id: 'nasi-rames', merchant: 'warung', name: 'Nasi rames', price: 15_000, min: 25, fx: { hunger: 50, thirst: 5, mood: 3 } },
  { id: 'mie-ayam', merchant: 'warung', name: 'Mie ayam', price: 13_000, min: 20, fx: { hunger: 40, thirst: 5, mood: 4 } },
  { id: 'es-teh', merchant: 'warung', name: 'Es teh manis', price: 4_000, min: 5, fx: { thirst: 35, mood: 2, bladder: -15 } },
  // minimarket (sebagian masuk inventori)
  { id: 'air-600', merchant: 'serbamart', name: 'Air mineral 600 ml', price: 4_000, min: 3, fx: { thirst: 30, bladder: -12 }, stock: true },
  { id: 'roti', merchant: 'serbamart', name: 'Roti isi', price: 8_000, min: 5, fx: { hunger: 20, mood: 1 }, stock: true },
  { id: 'mie-instan', merchant: 'serbamart', name: 'Mie instan (masak di rumah)', price: 3_500, min: 15, fx: { hunger: 30, thirst: -5 }, stock: true, health: -0.5 },
  { id: 'sabun', merchant: 'serbamart', name: 'Paket sabun & sampo (10× mandi)', price: 25_000, min: 0, fx: {}, stock: true, uses: 10, kind: 'toiletries' },
  // restoran & kafe
  { id: 'nasi-padang', merchant: 'minang', name: 'Nasi rendang + sayur', price: 32_000, min: 35, fx: { hunger: 65, thirst: 10, mood: 8 } },
  { id: 'kopi-susu', merchant: 'kopisenja', name: 'Kopi susu', price: 22_000, min: 20, fx: { thirst: 25, energy: 10, mood: 6, stress: -4, bladder: -15 } },
  { id: 'sandwich', merchant: 'kopisenja', name: 'Sandwich & teh', price: 38_000, min: 30, fx: { hunger: 40, thirst: 25, mood: 6 } },
  // pesan antar (dikirim)
  { id: 'ant-ayam', merchant: 'antarrasa', name: 'Paket ayam geprek + es jeruk', price: 27_000, min: 20, fx: { hunger: 55, thirst: 25, mood: 6, bladder: -10 }, delivery: { prep: 15, ride: 25 } },
  { id: 'ant-sate', merchant: 'antarrasa', name: 'Sate ayam 10 tusuk + lontong', price: 35_000, min: 25, fx: { hunger: 60, thirst: 5, mood: 7 }, delivery: { prep: 25, ride: 25 } },
  { id: 'ant-jus', merchant: 'antarrasa', name: 'Jus buah 2 gelas', price: 24_000, min: 10, fx: { thirst: 50, mood: 4, bladder: -20 }, delivery: { prep: 10, ride: 25 } },
  // kesehatan
  { id: 'dokter-umum', merchant: 'klinik', name: 'Konsultasi dokter umum + obat', price: 120_000, min: 60, fx: { health: 25, stress: -5 } },
  { id: 'vitamin', merchant: 'apotek', name: 'Vitamin & obat flu', price: 35_000, min: 10, fx: { health: 10 }, stock: true },
  // hiburan
  { id: 'film', merchant: 'layarkota', name: 'Tiket film reguler', price: 45_000, min: 130, fx: { mood: 22, stress: -18, energy: -4 } },
  // marketplace (dikirim, masuk inventori)
  { id: 'kasur', merchant: 'pasarku', name: 'Kasur busa 160×200', price: 1_450_000, min: 0, fx: {}, ship: [2, 4], kind: 'kasur', upgrade: { sleep: 1.15 } },
  { id: 'kipas', merchant: 'pasarku', name: 'Kipas angin berdiri', price: 245_000, min: 0, fx: {}, ship: [2, 3], kind: 'kipas', upgrade: { sleep: 1.05, stress: -0.3 } },
  { id: 'sabun-online', merchant: 'pasarku', name: 'Paket sabun & sampo (10× mandi)', price: 21_000, min: 0, fx: {}, ship: [2, 4], stock: true, uses: 10, kind: 'toiletries' },
  { id: 'botol', merchant: 'pasarku', name: 'Botol minum 1 L', price: 55_000, min: 0, fx: {}, ship: [2, 4], kind: 'botol', upgrade: { thirst: 0.85 } },
  { id: 'sepeda', merchant: 'pasarku', name: 'Sepeda kota', price: 1_250_000, min: 0, fx: {}, ship: [3, 4], kind: 'sepeda', unlock: 'sepeda' },
  // transport (tarif satu arah)
  { id: 'ride-ojek', merchant: 'jalanyuk', name: 'Ojek online (satu arah)', price: 12_000, min: 15, fx: {} },
  { id: 'ride-bus', merchant: 'buskota', name: 'Bus kota (satu arah)', price: 4_000, min: 35, fx: {} },
];

const DELIVERY = { serviceFee: 2_000, deliveryFee: 9_000, cancelBeforePrepPct: 1 };
const MARKET_SHIP = { fee: 12_000, codFee: 3_000 };

// Moda perjalanan harian ke sekolah/kerja (dua arah per hari sekolah/kerja).
const COMMUTE = [
  { id: 'jalan', name: 'Jalan kaki', fare: 0, minutes: 40, fx: { energy: -6, hygiene: -6, stress: 2 }, methods: [] },
  { id: 'sepeda', name: 'Sepeda', fare: 0, minutes: 25, fx: { energy: -4, hygiene: -4, mood: 1 }, methods: [], needs: 'sepeda' },
  { id: 'bus', name: 'Bus kota', fare: 4_000, minutes: 35, fx: { energy: -2, stress: 1 }, methods: ['cash'], merchant: 'buskota' },
  { id: 'ojek', name: 'Ojek online', fare: 12_000, minutes: 15, fx: { energy: -1 }, methods: ['cash', 'wallet:gojalan'], merchant: 'jalanyuk' },
];

module.exports = { BANKS, WALLETS, CREDIT_PRODUCTS, CREDIT_RULES, MERCHANTS, ITEMS, DELIVERY, MARKET_SHIP, COMMUTE };
