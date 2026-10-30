// KATALOG & ATURAN COMMERCE BIZSIM (sumber tunggal; dipakai server untuk validasi dan dikirim ke klien).
// Semua toko, produk, harga, stok, bonus, promo, dan aturan pengiriman adalah FIKTIF untuk simulasi game.
// Harga/stok/total TIDAK pernah diambil dari klien — klien hanya mengirim id produk, variasi, dan jumlah.
const L = require('./life-catalog.cjs');

const mer = id => L.MERCHANTS.find(m => m.id === id);
const itm = id => L.ITEMS.find(i => i.id === id);

// ————————————————————————— kota & jarak (km, garis lurus perkiraan) —————————————————————————
const CITY_COORDS = {
  'Pacitan': [-8.20, 111.09], 'Malang': [-7.98, 112.63], 'Surabaya': [-7.25, 112.75], 'Sleman': [-7.72, 110.35],
  'Yogyakarta': [-7.80, 110.37], 'Semarang': [-6.97, 110.42], 'Bandung': [-6.91, 107.61], 'Jakarta Selatan': [-6.26, 106.81],
};
function distanceKm(a, b) {
  if (!a || !b || a === b) return 0;
  const A = CITY_COORDS[a], B = CITY_COORDS[b]; if (!A || !B) return 400;
  const R = 6371, r = x => x * Math.PI / 180, dLat = r(B[0] - A[0]), dLon = r(B[1] - A[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(r(A[0])) * Math.cos(r(B[0])) * Math.sin(dLon / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)));
}

// ————————————————————————— jalur pemenuhan (fulfillment) —————————————————————————
// Setiap jalur punya tahap sendiri. `terminal` = tahap akhir otomatis; pemain mengonfirmasi penerimaan (claim) → completed.
const FULFILLMENT = {
  counter: {
    label: 'Beli di toko', where: 'Ambil di kasir/loket',
    stages: [['confirmed', 'Pesanan diterima toko'], ['preparing', 'Sedang disiapkan'], ['ready_for_pickup', 'Siap diambil']],
    claimLabel: 'Ambil pesanan', cancelable: ['confirmed'], notify: ['confirmed', 'ready_for_pickup'],
  },
  pickup: {
    label: 'Ambil di toko (online)', where: 'Ambil di gerai',
    stages: [['confirmed', 'Pesanan dikonfirmasi'], ['preparing', 'Disiapkan toko'], ['ready_for_pickup', 'Siap diambil']],
    claimLabel: 'Ambil pesanan', cancelable: ['confirmed', 'preparing'], notify: ['confirmed', 'preparing', 'ready_for_pickup'],
  },
  food: {
    label: 'Antar makanan', where: 'Diantar ke alamat',
    stages: [['confirmed', 'Pesanan dikonfirmasi'], ['preparing', 'Restoran menyiapkan'], ['packed', 'Dikemas'], ['handed_to_courier', 'Diserahkan ke kurir'], ['in_transit', 'Dalam perjalanan'], ['arriving', 'Kurir hampir tiba'], ['delivered', 'Tiba di alamat']],
    claimLabel: 'Terima pesanan', cancelable: ['confirmed'], notify: ['confirmed', 'preparing', 'packed', 'in_transit', 'arriving', 'delivered'],
  },
  parcel: {
    label: 'Kirim paket', where: 'Dikirim ke alamat',
    stages: [['confirmed', 'Pesanan dikonfirmasi'], ['processing', 'Penjual memproses'], ['packed', 'Dikemas'], ['handed_to_courier', 'Diserahkan ke kurir'], ['in_transit', 'Dalam perjalanan'], ['arriving', 'Kurir di area kamu'], ['delivered', 'Paket tiba']],
    claimLabel: 'Terima paket', cancelable: ['confirmed', 'processing'], notify: ['confirmed', 'processing', 'packed', 'in_transit', 'arriving', 'delivered'],
  },
  digital: {
    label: 'Produk digital', where: 'Dikirim ke akun',
    stages: [['confirmed', 'Pesanan dikonfirmasi'], ['processing', 'Menyiapkan akses'], ['delivered', 'Akses tersedia']],
    claimLabel: 'Buka & klaim', cancelable: ['confirmed'], notify: ['confirmed', 'delivered'],
  },
};
// Pembeda COD pada jalur yang diantar: pembayaran dilakukan saat claim.
const STAGE_LABEL = {
  confirmed: 'Pesanan dikonfirmasi', preparing: 'Sedang disiapkan', processing: 'Penjual memproses', packed: 'Dikemas', ready_for_pickup: 'Siap diambil',
  handed_to_courier: 'Diserahkan ke kurir', in_transit: 'Dalam perjalanan', arriving: 'Hampir tiba', delivered: 'Tiba / tersedia', completed: 'Selesai',
  cancelled: 'Dibatalkan', delivery_failed: 'Pengiriman gagal', return_requested: 'Pengembalian diajukan', returned: 'Dikembalikan',
};

// ————————————————————————— toko —————————————————————————
// channel: offline (kunjungi toko) | online (aplikasi). modes: jalur yang tersedia. hours/days dari merchant bila ada.
const STORES = [
  { id: 'warung', channel: 'offline', name: 'Warung Makan Bu Sri', cat: 'makanan', blurb: 'Masakan rumahan harian. Porsi terbatas tiap hari.', rating: 4.5, ratingCount: 312, modes: ['counter'], from: 'warung' },
  { id: 'minang', channel: 'offline', name: 'RM Minang Raya', cat: 'makanan', blurb: 'Restoran padang. Dimasak saat dipesan.', rating: 4.6, ratingCount: 540, modes: ['counter'], from: 'minang' },
  { id: 'kopisenja', channel: 'offline', name: 'Kopi Senja', cat: 'makanan', blurb: 'Kafe kopi dan roti. Promo sore hari.', rating: 4.4, ratingCount: 205, modes: ['counter'], from: 'kopisenja' },
  { id: 'serbamart', channel: 'offline', name: 'SerbaMart 24', cat: 'minimarket', blurb: 'Minimarket 24 jam. Bisa beli di toko atau pesan dan ambil (SerbaMart GO).', rating: 4.2, ratingCount: 1180, modes: ['counter', 'pickup'], from: 'serbamart', pickupMethods: ['debit', 'qris', 'wallet'] },
  { id: 'pelita', channel: 'offline', name: 'Toko Buku & ATK Pelita', cat: 'sekolah', blurb: 'Buku latihan, alat tulis, dan kamus untuk pelajar.', rating: 4.7, ratingCount: 96, modes: ['counter'], hours: [8, 17], days: [1, 2, 3, 4, 5, 6], methods: ['cash', 'debit', 'qris', 'wallet'], travelMin: 15 },
  { id: 'apotek', channel: 'offline', name: 'Apotek Waras', cat: 'kesehatan', blurb: 'Vitamin dan obat bebas.', rating: 4.5, ratingCount: 260, modes: ['counter'], from: 'apotek' },
  { id: 'klinik', channel: 'offline', name: 'Klinik Sehat Bersama', cat: 'kesehatan', blurb: 'Konsultasi dokter umum dengan antrean harian.', rating: 4.6, ratingCount: 410, modes: ['counter'], from: 'klinik' },
  { id: 'layarkota', channel: 'offline', name: 'Bioskop Layar Kota', cat: 'hiburan', blurb: 'Tiket film. Kursi terbatas per hari.', rating: 4.3, ratingCount: 733, modes: ['counter'], from: 'layarkota' },
  { id: 'antarrasa', channel: 'online', name: 'JalanYuk Food', cat: 'makanan', blurb: 'Pesan antar makanan. Waktu tiba bergantung dapur, antrean, dan jarak kurir.', rating: 4.4, ratingCount: 2210, modes: ['food'], from: 'antarrasa', origin: 'local' },
  { id: 'pasarku', channel: 'online', name: 'Pasarku (marketplace)', cat: 'marketplace', blurb: 'Marketplace berbagai penjual dari banyak kota. Pengiriman 1–4 hari sesuai jarak.', rating: 4.3, ratingCount: 5820, modes: ['parcel'], from: 'pasarku' },
  { id: 'pustaka', channel: 'online', name: 'Pustaka Digital', cat: 'sekolah', blurb: 'Buku elektronik dan kursus video. Akses terkirim ke akunmu.', rating: 4.6, ratingCount: 1470, modes: ['digital', 'parcel'], hours: [0, 24], days: null, methods: ['wallet', 'debit', 'credit', 'qris', 'transfer'], origin: 'Yogyakarta' },
];
for (const s of STORES) {
  if (s.from) { const m = mer(s.from); s.hours = m.hours; s.days = m.days; s.methods = m.methods; s.travelMin = m.travelMin || 0; s.note = m.note || null; s.legacyCat = m.cat; }
  s.methods = [...s.methods];
}

// ————————————————————————— produk —————————————————————————
// use: eat (dikonsumsi saat diterima), stock (masuk inventori), own (peralatan/aset), learn (bonus belajar), service (layanan).
// stock: { max, refillDays, refillQty } — dihitung per pemain, ditambah otomatis menurut hari simulasi; tanpa stock = tidak dibatasi.
const P = [];
const add = p => P.push(p);
const fromLegacy = (id, o) => { const b = itm(id); add({ id, store: b.merchant, name: b.name, price: b.price, min: b.min || 0, fx: b.fx || {}, health: b.health, uses: b.uses, kind: b.kind, upgrade: b.upgrade, unlock: b.unlock, ...o }); };

// Warung
fromLegacy('nasi-rames', { type: 'makanan', use: 'eat', prepMin: 8, quality: 3, rating: 4.5, stock: { max: 25, refillDays: 1, refillQty: 25 }, desc: 'Nasi dengan sayur, lauk, dan sambal.',
  variants: [{ id: 'biasa', label: 'Biasa', price: 0 }, { id: 'jumbo', label: 'Jumbo', price: 7000, fxMult: 1.3, minAdd: 5 }] });
fromLegacy('mie-ayam', { type: 'makanan', use: 'eat', prepMin: 10, quality: 3, rating: 4.4, stock: { max: 20, refillDays: 1, refillQty: 20 }, desc: 'Mie ayam dengan pangsit. Bonus air mineral untuk pembelian 2 porsi atau lebih.',
  bonus: [{ key: 'freewater', kind: 'item', item: 'air-600', qty: 1, when: { minQty: 2 }, label: 'Bonus air mineral 600 ml (min. 2 porsi)' }] });
fromLegacy('es-teh', { type: 'minuman', use: 'eat', prepMin: 3, quality: 3, rating: 4.3, stock: { max: 40, refillDays: 1, refillQty: 40 }, desc: 'Teh manis dingin.' });
add({ id: 'gorengan', store: 'warung', name: 'Gorengan 5 potong', price: 8000, min: 10, fx: { hunger: 18, mood: 3 }, health: -0.3, type: 'makanan', use: 'eat', prepMin: 4, quality: 2, rating: 4.1, stock: { max: 30, refillDays: 1, refillQty: 30 }, desc: 'Tahu, tempe, dan bakwan goreng hangat.' });
add({ id: 'nasi-telur', store: 'warung', name: 'Nasi telur dadar', price: 12000, min: 20, fx: { hunger: 42, mood: 3 }, type: 'makanan', use: 'eat', prepMin: 7, quality: 3, rating: 4.2, stock: { max: 20, refillDays: 1, refillQty: 20 }, desc: 'Nasi putih dengan telur dadar dan kecap.' });
// Minang
fromLegacy('nasi-padang', { type: 'makanan', use: 'eat', prepMin: 12, quality: 4, rating: 4.7, stock: { max: 30, refillDays: 1, refillQty: 30 }, desc: 'Nasi dengan lauk pilihan, sayur daun singkong, dan sambal hijau.',
  variants: [{ id: 'rendang', label: 'Rendang', price: 0 }, { id: 'ayam', label: 'Ayam pop', price: -4000, fxMult: 0.95 }, { id: 'ikan', label: 'Ikan balado', price: 3000 }] });
// Kopi Senja
fromLegacy('kopi-susu', { type: 'minuman', use: 'eat', prepMin: 6, quality: 4, rating: 4.5, stock: { max: 60, refillDays: 1, refillQty: 60 }, desc: 'Espresso dengan susu segar.',
  variants: [{ id: 'reguler', label: 'Reguler', price: 0 }, { id: 'large', label: 'Large', price: 6000, fxMult: 1.3, minAdd: 5 }] });
fromLegacy('sandwich', { type: 'makanan', use: 'eat', prepMin: 8, quality: 4, rating: 4.3, stock: { max: 20, refillDays: 1, refillQty: 20 }, desc: 'Roti lapis isi telur dan sayur, dengan teh.' });
add({ id: 'roti-bakar', store: 'kopisenja', name: 'Roti bakar cokelat keju', price: 25000, min: 20, fx: { hunger: 30, mood: 7 }, type: 'makanan', use: 'eat', prepMin: 9, quality: 4, rating: 4.6, stock: { max: 20, refillDays: 1, refillQty: 20 }, desc: 'Roti tebal bakar dengan cokelat dan keju.' });
// SerbaMart
fromLegacy('air-600', { type: 'minuman', use: 'stock', prepMin: 1, quality: 3, rating: 4.4, stock: { max: 80, refillDays: 2, refillQty: 40 }, desc: 'Air mineral kemasan 600 ml. Masuk inventori.' });
fromLegacy('roti', { type: 'makanan', use: 'stock', prepMin: 1, quality: 3, rating: 4.1, stock: { max: 40, refillDays: 2, refillQty: 20 }, desc: 'Roti isi kemasan. Masuk inventori.' });
fromLegacy('mie-instan', { type: 'makanan', use: 'stock', prepMin: 1, quality: 2, rating: 4.0, stock: { max: 60, refillDays: 2, refillQty: 30 }, desc: 'Mie instan; dimasak di rumah. Masuk inventori.' });
fromLegacy('sabun', { type: 'kebersihan', use: 'stock', prepMin: 1, quality: 3, rating: 4.3, stock: { max: 30, refillDays: 3, refillQty: 15 }, desc: 'Paket sabun dan sampo untuk 10 kali mandi.' });
add({ id: 'susu-uht', store: 'serbamart', name: 'Susu UHT 250 ml', price: 7000, min: 3, fx: { thirst: 15, hunger: 8, mood: 2 }, type: 'minuman', use: 'stock', prepMin: 1, quality: 3, rating: 4.4, stock: { max: 50, refillDays: 2, refillQty: 25 }, desc: 'Susu cair kemasan. Masuk inventori.' });
add({ id: 'keripik', store: 'serbamart', name: 'Keripik singkong 100 g', price: 10000, min: 4, fx: { hunger: 12, mood: 4 }, health: -0.2, type: 'makanan', use: 'stock', prepMin: 1, quality: 2, rating: 4.2, stock: { max: 40, refillDays: 2, refillQty: 20 }, desc: 'Camilan renyah. Masuk inventori.' });
// Apotek
fromLegacy('vitamin', { type: 'obat', use: 'stock', prepMin: 3, quality: 3, rating: 4.5, stock: { max: 25, refillDays: 3, refillQty: 10 }, desc: 'Vitamin dan obat flu.' });
add({ id: 'obat-pusing', store: 'apotek', name: 'Obat sakit kepala', price: 18000, min: 5, fx: { health: 6, stress: -4 }, type: 'obat', use: 'stock', prepMin: 3, quality: 3, rating: 4.4, stock: { max: 20, refillDays: 3, refillQty: 10 }, desc: 'Obat bebas pereda sakit kepala ringan.' });
// Klinik & bioskop (layanan: slot terbatas per hari)
fromLegacy('dokter-umum', { type: 'layanan', use: 'service', prepMin: 25, quality: 4, rating: 4.6, stock: { max: 8, refillDays: 1, refillQty: 8, label: 'slot' }, desc: 'Konsultasi dan obat resep. Ada antrean pasien.' });
fromLegacy('film', { type: 'tiket', use: 'service', prepMin: 2, quality: 4, rating: 4.3, stock: { max: 40, refillDays: 1, refillQty: 40, label: 'kursi' }, desc: 'Tiket film reguler.',
  variants: [{ id: 'reguler', label: 'Reguler', price: 0 }, { id: 'premier', label: 'Premier', price: 25000, fxAdd: { mood: 6 }, minAdd: 0 }] });
// Pelita (buku & ATK)
add({ id: 'buku-latihan-mat', store: 'pelita', name: 'Buku latihan matematika', price: 45000, min: 0, fx: {}, type: 'buku', use: 'learn', prepMin: 3, quality: 4, rating: 4.7, stock: { max: 15, refillDays: 5, refillQty: 8 }, desc: 'Latihan soal bertingkat. Menambah penguasaan mata pelajaran matematika pada periode berjalan.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 10, once: 'item' }, { key: 'edu', kind: 'edu_mastery', subject: 'math', amount: 6, once: 'term' }] });
add({ id: 'buku-latihan-indo', store: 'pelita', name: 'Buku latihan Bahasa Indonesia', price: 42000, min: 0, fx: {}, type: 'buku', use: 'learn', prepMin: 3, quality: 4, rating: 4.6, stock: { max: 15, refillDays: 5, refillQty: 8 }, desc: 'Latihan membaca dan memahami teks. Menambah penguasaan Bahasa Indonesia pada periode berjalan.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 10, once: 'item' }, { key: 'edu', kind: 'edu_mastery', subject: 'indo', amount: 6, once: 'term' }] });
add({ id: 'kamus', store: 'pelita', name: 'Kamus Bahasa Indonesia', price: 85000, min: 0, fx: {}, type: 'buku', use: 'learn', prepMin: 3, quality: 4, rating: 4.8, stock: { max: 10, refillDays: 7, refillQty: 5 }, desc: 'Kamus saku untuk memperkaya kosakata.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 12, once: 'item' }, { key: 'skill', kind: 'skill_xp', skill: 'komunikasi', amount: 0.3, once: 'item' }] });
add({ id: 'buku-tulis', store: 'pelita', name: 'Buku tulis (10 buah)', price: 25000, min: 0, fx: {}, kind: 'atk', type: 'perlengkapan', use: 'stock', prepMin: 2, quality: 3, rating: 4.4, stock: { max: 30, refillDays: 5, refillQty: 15 }, desc: 'Perlengkapan sekolah. Masuk inventori.' });
// JalanYuk Food (diantar)
fromLegacy('ant-ayam', { type: 'makanan', use: 'eat', prepMin: 15, quality: 3, rating: 4.4, desc: 'Ayam geprek sambal bawang dengan es jeruk. Bonus air mineral untuk pembelian 2 paket atau lebih.',
  bonus: [{ key: 'freewater', kind: 'item', item: 'air-600', qty: 1, when: { minQty: 2 }, label: 'Bonus air mineral 600 ml (min. 2 paket)' }] });
fromLegacy('ant-sate', { type: 'makanan', use: 'eat', prepMin: 25, quality: 4, rating: 4.6, desc: 'Sate ayam 10 tusuk dengan lontong dan bumbu kacang.' });
fromLegacy('ant-jus', { type: 'minuman', use: 'eat', prepMin: 10, quality: 3, rating: 4.3, desc: 'Dua gelas jus buah segar.' });
add({ id: 'ant-nasgor', store: 'antarrasa', name: 'Nasi goreng spesial', price: 25000, min: 20, fx: { hunger: 58, mood: 6, thirst: -3 }, type: 'makanan', use: 'eat', prepMin: 14, quality: 4, rating: 4.5, desc: 'Nasi goreng dengan telur, ayam, dan acar.' });
add({ id: 'ant-bakso', store: 'antarrasa', name: 'Bakso urat + es teh', price: 22000, min: 20, fx: { hunger: 50, thirst: 20, mood: 6 }, type: 'makanan', use: 'eat', prepMin: 12, quality: 4, rating: 4.5, desc: 'Bakso urat kuah gurih dengan es teh.' });
// Pasarku (marketplace; origin = kota penjual)
fromLegacy('kasur', { type: 'peralatan', use: 'own', origin: 'Surabaya', returnable: true, quality: 4, rating: 4.4, stock: { max: 6, refillDays: 7, refillQty: 3 }, desc: 'Kasur busa 160×200. Pemulihan energi saat tidur +15%.' });
fromLegacy('kipas', { type: 'peralatan', use: 'own', origin: 'Semarang', returnable: true, quality: 3, rating: 4.2, stock: { max: 10, refillDays: 5, refillQty: 5 }, desc: 'Kipas angin berdiri 3 kecepatan.' });
fromLegacy('sabun-online', { type: 'kebersihan', use: 'stock', origin: 'Malang', returnable: false, quality: 3, rating: 4.3, stock: { max: 60, refillDays: 4, refillQty: 30 }, desc: 'Paket sabun dan sampo 10 kali mandi, lebih hemat.' });
fromLegacy('botol', { type: 'peralatan', use: 'own', origin: 'Jakarta Selatan', returnable: true, quality: 4, rating: 4.5, stock: { max: 25, refillDays: 5, refillQty: 10 }, desc: 'Botol minum 1 liter bebas BPA.' });
fromLegacy('sepeda', { type: 'peralatan', use: 'own', origin: 'Bandung', returnable: true, quality: 4, rating: 4.6, stock: { max: 4, refillDays: 10, refillQty: 2 }, desc: 'Sepeda kota. Membuka moda perjalanan sepeda.' });
add({ id: 'tas-sekolah', store: 'pasarku', name: 'Tas sekolah ransel', price: 180000, min: 0, fx: {}, type: 'perlengkapan', use: 'learn', origin: 'Bandung', returnable: true, quality: 4, rating: 4.4, stock: { max: 12, refillDays: 7, refillQty: 6 }, desc: 'Ransel dengan banyak kantong dan penyangga punggung.',
  bonus: [{ key: 'mood', kind: 'need', fx: { mood: 8 }, once: 'item', label: 'Mood naik: tas baru' }] });
add({ id: 'mie-dus', store: 'pasarku', name: 'Mie instan 1 dus (40 bungkus)', price: 105000, min: 15, fx: { hunger: 30, thirst: -5 }, health: -0.5, qtyPerUnit: 40, type: 'makanan', use: 'stock', origin: 'Surabaya', returnable: false, quality: 2, rating: 4.1, stock: { max: 20, refillDays: 5, refillQty: 10 }, desc: 'Satu dus berisi 40 bungkus. Masuk inventori.' });
add({ id: 'sepatu', store: 'pasarku', name: 'Sepatu olahraga', price: 320000, min: 0, fx: {}, type: 'perlengkapan', use: 'learn', origin: 'Jakarta Selatan', returnable: true, quality: 4, rating: 4.3, stock: { max: 8, refillDays: 7, refillQty: 4 }, desc: 'Sepatu ringan untuk olahraga harian.',
  bonus: [{ key: 'mood', kind: 'need', fx: { mood: 6, stress: -4 }, once: 'item', label: 'Mood naik dan stres turun: sepatu baru' }] });
// Pustaka Digital
add({ id: 'ebook-keuangan', store: 'pustaka', name: 'E-book: Dasar Mengatur Uang', price: 49000, min: 0, fx: {}, type: 'digital', use: 'learn', mode: 'digital', minAge: 10, quality: 4, rating: 4.7, desc: 'Anggaran, menabung, dan tujuan keuangan untuk pemula.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 15, once: 'item' }, { key: 'skill', kind: 'skill_xp', skill: 'keuangan', amount: 0.4, once: 'item' }] });
add({ id: 'kursus-komunikasi', store: 'pustaka', name: 'Kursus video: Komunikasi Efektif', price: 120000, min: 0, fx: {}, type: 'digital', use: 'learn', mode: 'digital', minAge: 12, quality: 4, rating: 4.6, desc: 'Delapan sesi video tentang menyimak, bertanya, dan menyampaikan pendapat.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 25, once: 'item' }, { key: 'skill', kind: 'skill_xp', skill: 'komunikasi', amount: 0.8, once: 'item' }] });
add({ id: 'kursus-coding', store: 'pustaka', name: 'Kursus video: Logika Pemrograman', price: 180000, min: 0, fx: {}, type: 'digital', use: 'learn', mode: 'digital', minAge: 12, quality: 4, rating: 4.7, desc: 'Dasar logika dan algoritma dengan latihan interaktif.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 30, once: 'item' }, { key: 'skill', kind: 'skill_xp', skill: 'teknologi', amount: 1.0, once: 'item' }] });
add({ id: 'ebook-cerita', store: 'pustaka', name: 'E-book: Kumpulan Cerita Nusantara', price: 29000, min: 0, fx: {}, type: 'digital', use: 'learn', mode: 'digital', quality: 3, rating: 4.5, desc: 'Cerita rakyat pilihan untuk dibaca santai.',
  bonus: [{ key: 'mood', kind: 'need', fx: { mood: 8, stress: -6 }, once: 'item', label: 'Mood naik dan stres turun: membaca cerita' }, { key: 'knowledge', kind: 'knowledge_xp', amount: 5, once: 'item' }] });
add({ id: 'novel-fisik', store: 'pustaka', name: 'Novel remaja (cetak)', price: 75000, min: 0, fx: {}, type: 'buku', use: 'learn', mode: 'parcel', origin: 'Yogyakarta', returnable: true, quality: 4, rating: 4.5, stock: { max: 14, refillDays: 6, refillQty: 7 }, desc: 'Novel cetak; dikirim dari gudang Yogyakarta.',
  bonus: [{ key: 'mood', kind: 'need', fx: { mood: 7, stress: -5 }, once: 'item', label: 'Mood naik: membaca novel' }, { key: 'knowledge', kind: 'knowledge_xp', amount: 8, once: 'item' }] });
add({ id: 'paket-belajar', store: 'pustaka', name: 'Paket belajar: buku latihan + e-book', price: 99000, min: 0, fx: {}, type: 'buku', use: 'learn', mode: 'parcel', origin: 'Yogyakarta', returnable: true, quality: 4, rating: 4.6, stock: { max: 10, refillDays: 6, refillQty: 5 }, desc: 'Buku latihan cetak dengan bonus e-book. Bonus: e-book "Dasar Mengatur Uang" jika belanja min. 2 paket.',
  bonus: [{ key: 'knowledge', kind: 'knowledge_xp', amount: 14, once: 'item' }, { key: 'bonusitem', kind: 'voucher', voucher: 'V-PUSTAKA-5', when: { minQty: 2 }, label: 'Voucher Pustaka Rp 5.000 (min. 2 paket)' }] });

for (const p of P) {
  p.fx = p.fx || {};
  p.mode = p.mode || (STORES.find(s => s.id === p.store).modes[0]);
  p.returnable = !!p.returnable;
  p.variants = p.variants || [{ id: 'std', label: 'Standar', price: 0 }];
  p.bonus = p.bonus || [];
}

// ————————————————————————— aturan —————————————————————————
const RULES = {
  maxQtyPerLine: 20, maxLines: 12,
  service: { food: 2000, parcel: 1000, pickup: 0, counter: 0, digital: 0 },
  codFee: 3000,
  foodDelivery: { base: 5000, perKm: 1000, freeOver: 80000 },
  parcel: { reguler: { base: 8000, per100km: 3500, minDays: 1, label: 'Reguler' }, ekspres: { base: 14000, per100km: 6500, minDays: 1, label: 'Ekspres', speed: 0.5 }, freeOver: 150000 },
  parcelDigitalFee: 0,
  // jam kerja penjual & kurir (jam simulasi)
  seller: { open: 8, close: 17 }, courierPickupHour: 16, deliverWindow: [10, 17],
  rush: [[11, 13, 1.4], [18, 20, 1.5]],      // pengali waktu masak jam sibuk
  disruption: { food: 0.10, parcel: 0.12 }, failure: { food: 0.02, parcel: 0.02 },
  returnWindowDays: 3, returnShippingFee: 8000,
  cancelRefund: 1,
  notifKeep: 80,
};

// Promo otomatis (diterapkan server bila memenuhi syarat). value: percent atau fixed.
const PROMOS = [
  { id: 'P-KOPI-SORE', label: 'Diskon 15% Kopi Senja jam 14.00–17.00', store: 'kopisenja', kind: 'percent', value: 0.15, max: 10000, hours: [14, 17] },
  { id: 'P-FOOD-ONGKIR', label: 'Gratis ongkir JalanYuk Food min. Rp 80.000', store: 'antarrasa', kind: 'shipping', minSpend: 80000 },
  { id: 'P-PASAR-ONGKIR', label: 'Gratis ongkir Pasarku min. Rp 150.000', store: 'pasarku', kind: 'shipping', minSpend: 150000 },
  { id: 'P-FILM-SELASA', label: 'Tiket film diskon Rp 10.000 setiap Selasa', store: 'layarkota', kind: 'fixed', value: 10000, days: [2] },
  { id: 'P-SEKOLAH', label: 'Diskon 10% buku & ATK Pelita untuk pelajar (usia < 18)', store: 'pelita', kind: 'percent', value: 0.10, max: 25000, maxAge: 17 },
];

// Voucher yang dapat dimiliki pemain (hadiah loyalitas, bonus produk).
const VOUCHERS = {
  'V-LOYAL-10': { label: 'Voucher 10% semua toko (maks Rp 15.000)', kind: 'percent', value: 0.10, max: 15000, minSpend: 30000, store: null, validDays: 30 },
  'V-LOYAL-25': { label: 'Voucher Rp 25.000 (min. belanja Rp 100.000)', kind: 'fixed', value: 25000, max: 25000, minSpend: 100000, store: null, validDays: 30 },
  'V-PUSTAKA-5': { label: 'Voucher Pustaka Rp 5.000', kind: 'fixed', value: 5000, max: 5000, minSpend: 20000, store: 'pustaka', validDays: 30 },
  'V-WELCOME': { label: 'Voucher selamat datang Rp 5.000', kind: 'fixed', value: 5000, max: 5000, minSpend: 15000, store: null, validDays: 30 },
};

// Program loyalitas: 1 poin per Rp 10.000 belanja yang SELESAI (diterima). Hadiah per ambang.
const LOYALTY = { pointPerRp: 10000, tiers: [{ id: 'silver', label: 'Silver', at: 50, voucher: 'V-LOYAL-10' }, { id: 'gold', label: 'Gold', at: 150, voucher: 'V-LOYAL-25' }, { id: 'platinum', label: 'Platinum', at: 400, voucher: 'V-LOYAL-25' }] };

// Pencapaian: dievaluasi server saat pesanan selesai. stat: counter dari riwayat pesanan.
const ACHIEVEMENTS = [
  { id: 'first-order', label: 'Pesanan pertama selesai', stat: 'completed', need: 1, voucher: 'V-WELCOME' },
  { id: 'regular', label: 'Pelanggan tetap (5 pesanan selesai)', stat: 'completed', need: 5 },
  { id: 'loyal10', label: 'Pelanggan setia (10 pesanan selesai)', stat: 'completed', need: 10 },
  { id: 'learner', label: 'Pembelajar (3 buku/kursus)', stat: 'learn', need: 3 },
  { id: 'online', label: 'Belanja online perdana', stat: 'online', need: 1 },
  { id: 'saver', label: 'Hemat cerdas: memakai voucher/promo', stat: 'discounted', need: 1 },
];

const CATEGORIES = [
  { id: 'makanan', label: 'Makanan' }, { id: 'minuman', label: 'Minuman' }, { id: 'obat', label: 'Obat & vitamin' }, { id: 'kebersihan', label: 'Kebersihan' },
  { id: 'peralatan', label: 'Peralatan rumah' }, { id: 'buku', label: 'Buku' }, { id: 'digital', label: 'Produk digital' }, { id: 'perlengkapan', label: 'Perlengkapan' },
  { id: 'layanan', label: 'Layanan' }, { id: 'tiket', label: 'Tiket' },
];

module.exports = { CITY_COORDS, distanceKm, FULFILLMENT, STAGE_LABEL, STORES, PRODUCTS: P, RULES, PROMOS, VOUCHERS, LOYALTY, ACHIEVEMENTS, CATEGORIES };
