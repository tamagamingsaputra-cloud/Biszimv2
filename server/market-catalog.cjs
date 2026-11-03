// KATALOG MARKETPLACE BIZSIM — 4 marketplace fiktif, 12 kategori, penjual, listing, voucher, event.
// Semua merek, toko, harga, dan promo adalah FIKTIF untuk simulasi game. Data ini deterministik (tanpa acak runtime):
// listing (harga, diskon, stok awal, terjual, rating) diturunkan dari hash id marketplace+produk, sehingga server dan klien selalu sepaham.
const crypto = require('crypto');
const SHOP = require('./shop-catalog.cjs');
const L = require('./life-catalog.cjs');
const hf = (...p) => crypto.createHash('sha1').update(p.join('|')).digest().readUInt32BE(0) / 4294967296;
const pickH = (arr, ...k) => arr[Math.floor(hf(...k) * arr.length) % arr.length];
const roundTo = (n, step) => Math.max(step, Math.round(n / step) * step);
const legacy = id => L.ITEMS.find(i => i.id === id);

// ————————————————————————— kategori & subkategori —————————————————————————
const CATEGORIES = [
  { id: 'elektronik', label: 'Elektronik', subs: [['ponsel', 'Ponsel & Tablet'], ['komputer', 'Laptop & Komputer'], ['audio', 'Audio & Aksesoris']] },
  { id: 'fashion', label: 'Fashion', subs: [['pria', 'Pakaian Pria'], ['wanita', 'Pakaian Wanita'], ['sepatu', 'Sepatu & Tas']] },
  { id: 'makanan', label: 'Makanan & Minuman', subs: [['instan', 'Makanan Instan'], ['minuman', 'Minuman'], ['camilan', 'Camilan']] },
  { id: 'rumah', label: 'Peralatan Rumah', subs: [['tidur', 'Furnitur & Tidur'], ['dapur', 'Dapur & Makan'], ['listrik', 'Kebersihan & Listrik']] },
  { id: 'kendaraan', label: 'Kendaraan', subs: [['sepeda', 'Sepeda'], ['motor', 'Motor & Aksesoris'], ['rawat', 'Perawatan Kendaraan']] },
  { id: 'kesehatan', label: 'Kesehatan', subs: [['vitamin', 'Vitamin & Suplemen'], ['obat', 'Obat Bebas'], ['alkes', 'Alat Kesehatan']] },
  { id: 'kecantikan', label: 'Kecantikan', subs: [['wajah', 'Perawatan Wajah'], ['tubuh', 'Perawatan Tubuh'], ['rambut', 'Perawatan Rambut']] },
  { id: 'pendidikan', label: 'Pendidikan', subs: [['buku', 'Buku'], ['atk', 'Alat Tulis'], ['sekolah', 'Perlengkapan Sekolah']] },
  { id: 'olahraga', label: 'Olahraga', subs: [['pakaian', 'Pakaian Olahraga'], ['fitness', 'Alat Fitness'], ['outdoor', 'Outdoor']] },
  { id: 'pertanian', label: 'Pertanian', subs: [['bibit', 'Bibit & Benih'], ['pupuk', 'Pupuk & Obat Tanaman'], ['alattani', 'Alat Tani']] },
  { id: 'kerja', label: 'Peralatan Kerja', subs: [['tangan', 'Alat Tangan'], ['kantor', 'Perlengkapan Kantor'], ['k3', 'Keselamatan Kerja']] },
  { id: 'hewan', label: 'Hewan & Perlengkapan', subs: [['pakanhewan', 'Makanan Hewan'], ['aksesorihewan', 'Perlengkapan Hewan'], ['rawathewan', 'Perawatan Hewan']] },
];
const SUBCAT = {}; for (const c of CATEGORIES) for (const [id, label] of c.subs) SUBCAT[id] = { id, label, cat: c.id };

// ————————————————————————— produk dasar —————————————————————————
// [sub, nama, merek, harga normal, berat g, "p×l×t cm", opsi]. opsi: v=[[label, +harga]...], use (own|stock), fx, min, kind, uses, health, origin, q (kualitas 1–5), age.
const T = [];
const A = (sub, name, brand, price, g, dim, o = {}) => T.push({ sub, name, brand, price, g, dim, o });
// Elektronik
A('ponsel', 'Ponsel Nova X5 128 GB', 'Novatek', 2350000, 190, '16×7.5×0.8', { v: [['Hitam', 0], ['Biru', 0], ['256 GB', 450000]], q: 4, origin: 'Jakarta Selatan' });
A('ponsel', 'Ponsel Lite A2 64 GB', 'Novatek', 1150000, 185, '16×7.4×0.9', { v: [['Abu', 0], ['Hijau', 0]], q: 3 });
A('ponsel', 'Tablet Belajar 10 inci', 'Pintar', 1890000, 480, '24×16×0.8', { v: [['Wi-Fi', 0], ['Wi-Fi + 4G', 350000]], q: 4 });
A('komputer', 'Laptop Kerja 14 inci i5', 'Komputindo', 7450000, 1500, '32×22×1.8', { v: [['8/256 GB', 0], ['16/512 GB', 1800000]], q: 4, origin: 'Surabaya' });
A('komputer', 'Laptop Pelajar 11 inci', 'Komputindo', 3650000, 1100, '28×19×2', { q: 3 });
A('komputer', 'Mouse nirkabel + keyboard', 'Klikku', 189000, 520, '40×15×4', { q: 3 });
A('audio', 'Earbud nirkabel', 'Suaraku', 249000, 60, '6×6×3', { v: [['Putih', 0], ['Hitam', 0]], q: 3 });
A('audio', 'Headphone studio', 'Suaraku', 579000, 280, '19×17×8', { q: 4 });
A('audio', 'Speaker bluetooth mini', 'Dentum', 329000, 400, '17×7×7', { v: [['Merah', 0], ['Biru', 0]], q: 4 });
// Fashion
A('pria', 'Kemeja katun lengan panjang', 'Garuda Wear', 159000, 300, '30×22×3', { v: [['M', 0], ['L', 0], ['XL', 10000]], q: 3 });
A('pria', 'Kaos polos premium (2 pcs)', 'Garuda Wear', 99000, 360, '28×20×3', { v: [['M', 0], ['L', 0], ['XL', 8000]] });
A('pria', 'Celana chino slim fit', 'Garuda Wear', 219000, 520, '32×24×4', { v: [['30', 0], ['32', 0], ['34', 0]] });
A('wanita', 'Blus rajut lengan panjang', 'Anggun', 189000, 280, '30×22×3', { v: [['S', 0], ['M', 0], ['L', 0]] });
A('wanita', 'Gamis harian polos', 'Anggun', 279000, 600, '34×26×5', { v: [['M', 0], ['L', 0], ['XL', 15000]] });
A('wanita', 'Rok plisket panjang', 'Anggun', 149000, 330, '30×22×4', { v: [['All size', 0]] });
A('sepatu', 'Sepatu sneakers kasual', 'Langkah', 329000, 820, '32×21×12', { v: [['40', 0], ['41', 0], ['42', 0], ['43', 0]], q: 4 });
A('sepatu', 'Tas ransel harian', 'Langkah', 219000, 700, '42×30×16', { q: 4 });
A('sepatu', 'Sandal jepit karet', 'Langkah', 45000, 300, '28×11×4', { v: [['39', 0], ['41', 0], ['43', 0]], q: 3 });
// Makanan & minuman (konsumsi → inventori)
A('instan', 'Mie instan goreng (karton 40)', 'Mie Kuyup', 105000, 3200, '40×30×22', { use: 'stock', fx: { hunger: 30, thirst: -5 }, min: 15, health: -0.5, unitQty: 40, kind: 'mie-dus-mp', q: 3, origin: 'Surabaya' });
A('instan', 'Bubur instan sachet (10)', 'Bubur Sehat', 38000, 450, '24×16×8', { use: 'stock', fx: { hunger: 28, mood: 2 }, min: 10, unitQty: 10, kind: 'bubur-mp' });
A('instan', 'Nasi kaleng lauk ayam', 'Siap Santap', 24000, 280, '12×9×9', { use: 'stock', fx: { hunger: 34 }, min: 8, kind: 'nasikaleng-mp' });
A('minuman', 'Air mineral 600 ml (karton 24)', 'Tirta', 62000, 14400, '38×26×20', { use: 'stock', fx: { thirst: 26 }, min: 2, unitQty: 24, kind: 'air-mp', q: 4 });
A('minuman', 'Kopi bubuk sachet (20)', 'Kopi Dusun', 52000, 500, '24×14×8', { use: 'stock', fx: { energy: 6, mood: 3, thirst: 5 }, min: 5, unitQty: 20, kind: 'kopi-mp', origin: 'Malang' });
A('minuman', 'Susu UHT 1 liter (karton 12)', 'Susu Segar', 176000, 12500, '30×24×20', { use: 'stock', fx: { thirst: 20, hunger: 12, mood: 2 }, min: 4, unitQty: 12, kind: 'susu-mp' });
A('camilan', 'Keripik kentang (paket 6)', 'Renyah', 54000, 480, '30×20×14', { use: 'stock', fx: { hunger: 12, mood: 4 }, health: -0.2, min: 4, unitQty: 6, kind: 'keripik-mp' });
A('camilan', 'Cokelat batang (paket 8)', 'Manis Sejati', 88000, 640, '26×18×6', { use: 'stock', fx: { mood: 9, hunger: 6 }, health: -0.2, min: 3, unitQty: 8, kind: 'cokelat-mp' });
A('camilan', 'Kacang panggang (toples)', 'Gurih Kita', 39000, 400, '12×12×18', { use: 'stock', fx: { hunger: 14, mood: 3 }, min: 4, kind: 'kacang-mp', origin: 'Yogyakarta' });
// Peralatan rumah (kasur/kipas = peralatan lama yang membuka bonus kebutuhan)
A('tidur', 'Kasur busa 160×200', 'Lelap', 1450000, 18000, '200×160×20', { legacy: 'kasur', q: 4, origin: 'Surabaya' });
A('tidur', 'Bantal & guling set', 'Lelap', 135000, 1800, '60×40×25', { q: 3 });
A('tidur', 'Lemari pakaian 2 pintu', 'Kayu Jati Mini', 1290000, 32000, '90×50×180', { q: 4, origin: 'Semarang' });
A('dapur', 'Panci set stainless (3 pcs)', 'Dapurku', 249000, 2500, '30×30×18', { q: 4 });
A('dapur', 'Rice cooker 1,8 liter', 'Masak Cepat', 389000, 3100, '30×30×27', { q: 4 });
A('dapur', 'Botol minum 1 L', 'Tirta', 55000, 300, '8×8×27', { legacy: 'botol', q: 4, origin: 'Jakarta Selatan' });
A('listrik', 'Kipas angin berdiri', 'Sejuk', 245000, 4200, '40×40×120', { legacy: 'kipas', q: 3, origin: 'Semarang' });
A('listrik', 'Paket sabun & sampo (10× mandi)', 'Bersih Harian', 21000, 900, '20×12×8', { legacy: 'sabun-online', origin: 'Malang' });
A('listrik', 'Lampu LED 12 W (4 pcs)', 'Terang', 72000, 380, '20×14×12', { q: 3 });
// Kendaraan
A('sepeda', 'Sepeda kota 26 inci', 'Gowes', 1250000, 14500, '170×60×105', { legacy: 'sepeda', q: 4, origin: 'Bandung' });
A('sepeda', 'Helm sepeda dewasa', 'Gowes', 175000, 350, '28×22×15', { v: [['M', 0], ['L', 0]] });
A('sepeda', 'Gembok sepeda kombinasi', 'Aman', 69000, 400, '30×6×6');
A('motor', 'Helm full face', 'Lindung', 389000, 1400, '32×26×26', { v: [['M', 0], ['L', 0], ['XL', 0]], q: 4 });
A('motor', 'Jas hujan setelan', 'Lindung', 95000, 520, '30×24×6', { v: [['L', 0], ['XL', 0]] });
A('motor', 'Sarung tangan touring', 'Lindung', 119000, 220, '26×14×6');
A('rawat', 'Oli mesin motor 1 liter', 'Pelumas Jaya', 62000, 900, '10×10×22', { q: 4 });
A('rawat', 'Pompa ban portabel', 'Aman', 145000, 1100, '30×12×10');
A('rawat', 'Cairan pembersih kendaraan', 'Kilap', 39000, 700, '10×10×24');
// Kesehatan (konsumsi)
A('vitamin', 'Vitamin C 500 mg (60 tablet)', 'Sehat Selalu', 68000, 120, '8×8×12', { use: 'stock', fx: { health: 4, energy: 3 }, min: 3, unitQty: 10, kind: 'vitc-mp' });
A('vitamin', 'Multivitamin harian (30)', 'Sehat Selalu', 96000, 150, '8×8×12', { use: 'stock', fx: { health: 5, energy: 4 }, min: 3, unitQty: 10, kind: 'multi-mp' });
A('vitamin', 'Madu murni 250 ml', 'Lebah Nusantara', 74000, 450, '7×7×14', { use: 'stock', fx: { energy: 6, health: 2, mood: 2 }, min: 3, kind: 'madu-mp', origin: 'Pacitan' });
A('obat', 'Obat flu & batuk (strip)', 'Apotek Waras', 22000, 40, '10×5×1', { use: 'stock', fx: { health: 5, stress: -2 }, min: 3, kind: 'flu-mp', age: 12 });
A('obat', 'Obat sakit kepala (strip)', 'Apotek Waras', 18000, 35, '10×5×1', { use: 'stock', fx: { health: 6, stress: -4 }, min: 5, kind: 'pusing-mp', age: 12 });
A('obat', 'Plester luka (isi 50)', 'Apotek Waras', 24000, 120, '12×8×4');
A('alkes', 'Termometer digital', 'Medisku', 59000, 60, '16×6×3', { q: 4 });
A('alkes', 'Tensimeter digital', 'Medisku', 289000, 480, '18×14×8', { q: 4 });
A('alkes', 'Masker medis (50)', 'Medisku', 36000, 220, '18×10×8', { use: 'stock', fx: {}, min: 1, unitQty: 50, kind: 'masker-mp' });
// Kecantikan
A('wajah', 'Pembersih wajah 100 ml', 'Cantik Alami', 49000, 140, '5×5×16');
A('wajah', 'Tabir surya SPF 50', 'Cantik Alami', 78000, 80, '4×4×14');
A('wajah', 'Masker wajah (10 lembar)', 'Cantik Alami', 59000, 300, '18×12×6');
A('tubuh', 'Sabun mandi cair 450 ml', 'Segar', 32000, 500, '8×6×20', { use: 'stock', fx: {}, min: 1, unitQty: 10, uses: 10, kind: 'toiletries' });
A('tubuh', 'Lotion tubuh 200 ml', 'Segar', 41000, 230, '6×4×16');
A('tubuh', 'Deodoran roll-on', 'Segar', 27000, 70, '3×3×10');
A('rambut', 'Sampo 340 ml', 'Mahkota', 36000, 380, '6×5×20');
A('rambut', 'Hair dryer 1200 W', 'Mahkota', 189000, 600, '24×9×20', { q: 3 });
A('rambut', 'Sisir & ikat rambut set', 'Mahkota', 29000, 150, '20×8×3');
// Pendidikan
A('buku', 'Buku latihan matematika SD', 'Cerdas', 45000, 400, '26×19×1', { q: 4 });
A('buku', 'Kamus Bahasa Indonesia', 'Cerdas', 85000, 900, '24×17×4', { q: 4 });
A('buku', 'Novel remaja populer', 'Pustaka Muda', 75000, 350, '21×14×3', { origin: 'Yogyakarta' });
A('atk', 'Buku tulis (10 buah)', 'Cerdas', 25000, 700, '24×18×6');
A('atk', 'Pulpen gel (12 pcs)', 'Tulis Kita', 36000, 160, '16×8×3');
A('atk', 'Kotak pensil + alat gambar', 'Tulis Kita', 54000, 380, '22×10×6');
A('sekolah', 'Tas sekolah ransel', 'Cerdas', 180000, 800, '42×30×16', { v: [['Biru', 0], ['Merah', 0]], q: 4, origin: 'Bandung' });
A('sekolah', 'Sepatu sekolah hitam', 'Cerdas', 165000, 700, '30×20×11', { v: [['35', 0], ['37', 0], ['39', 0]] });
A('sekolah', 'Botol minum anak', 'Cerdas', 42000, 250, '7×7×22');
// Olahraga
A('pakaian', 'Kaos olahraga dry-fit', 'Lari Cepat', 109000, 200, '28×20×3', { v: [['M', 0], ['L', 0]] });
A('pakaian', 'Celana training', 'Lari Cepat', 139000, 330, '30×22×4', { v: [['M', 0], ['L', 0]] });
A('pakaian', 'Sepatu lari', 'Lari Cepat', 320000, 700, '32×21×12', { v: [['40', 0], ['42', 0], ['44', 0]], q: 4, origin: 'Jakarta Selatan' });
A('fitness', 'Matras yoga 6 mm', 'Bugar', 99000, 900, '61×61×6', { q: 3 });
A('fitness', 'Dumbbell set 10 kg', 'Bugar', 259000, 10500, '40×20×15', { q: 4 });
A('fitness', 'Tali skipping', 'Bugar', 35000, 180, '20×10×4');
A('outdoor', 'Tenda kemah 2 orang', 'Rimba', 689000, 3200, '60×20×20', { q: 4 });
A('outdoor', 'Senter LED isi ulang', 'Rimba', 89000, 250, '16×5×5');
A('outdoor', 'Matras camping', 'Rimba', 129000, 700, '55×15×15');
// Pertanian
A('bibit', 'Benih cabai rawit (sachet)', 'Tani Makmur', 18000, 15, '10×7×0.5', { origin: 'Malang' });
A('bibit', 'Bibit jeruk okulasi', 'Tani Makmur', 65000, 2500, '30×30×70', { origin: 'Malang' });
A('bibit', 'Benih padi unggul 5 kg', 'Tani Makmur', 98000, 5000, '40×30×10', { origin: 'Malang' });
A('pupuk', 'Pupuk NPK 5 kg', 'Subur', 74000, 5000, '40×25×10');
A('pupuk', 'Pupuk kompos organik 10 kg', 'Subur', 52000, 10000, '50×35×12', { origin: 'Pacitan' });
A('pupuk', 'Pestisida nabati 500 ml', 'Subur', 46000, 600, '8×8×22');
A('alattani', 'Cangkul baja', 'Tani Kokoh', 89000, 2100, '120×16×6');
A('alattani', 'Sprayer punggung 16 L', 'Tani Kokoh', 245000, 3200, '45×22×50');
A('alattani', 'Sabit & gunting tanaman set', 'Tani Kokoh', 68000, 700, '40×12×4');
// Peralatan kerja
A('tangan', 'Set obeng 24 in 1', 'Kokoh Tools', 79000, 450, '22×14×5');
A('tangan', 'Bor listrik 500 W', 'Kokoh Tools', 349000, 1600, '30×25×8', { q: 4 });
A('tangan', 'Meteran 5 m (3 pcs)', 'Kokoh Tools', 48000, 450, '14×10×6');
A('kantor', 'Printer inkjet multifungsi', 'Cetakin', 1350000, 5500, '45×38×20', { q: 4 });
A('kantor', 'Kertas A4 80 gsm (5 rim)', 'Cetakin', 215000, 12500, '31×22×28');
A('kantor', 'Kursi kerja ergonomis', 'Duduk Nyaman', 749000, 9500, '60×60×100', { q: 4, origin: 'Semarang' });
A('k3', 'Helm proyek', 'Aman Kerja', 58000, 400, '28×22×15');
A('k3', 'Sepatu safety', 'Aman Kerja', 289000, 1400, '32×22×14', { v: [['40', 0], ['42', 0], ['44', 0]] });
A('k3', 'Sarung tangan kerja (6 pasang)', 'Aman Kerja', 54000, 480, '24×14×8');
// Hewan
A('pakanhewan', 'Makanan kucing 1 kg', 'Meong', 68000, 1000, '28×18×8');
A('pakanhewan', 'Makanan anjing 3 kg', 'Guk Guk', 165000, 3000, '40×25×10');
A('pakanhewan', 'Pakan ikan hias 250 g', 'Akuaria', 32000, 260, '8×8×12');
A('aksesorihewan', 'Kandang kucing lipat', 'Meong', 289000, 3500, '60×40×50');
A('aksesorihewan', 'Kalung & tali hewan', 'Guk Guk', 59000, 180, '20×12×3');
A('aksesorihewan', 'Akuarium kaca 40 cm', 'Akuaria', 349000, 9000, '40×25×30');
A('rawathewan', 'Sampo hewan 250 ml', 'Meong', 38000, 280, '6×6×18');
A('rawathewan', 'Vitamin hewan (tablet 60)', 'Guk Guk', 52000, 120, '6×6×10');
A('rawathewan', 'Sisir bulu hewan', 'Meong', 29000, 110, '16×8×4');

const PRODUCTS = T.map((t, i) => {
  const sub = SUBCAT[t.sub], l = t.o.legacy ? legacy(t.o.legacy) : null, o = t.o;
  const price = l ? l.price : t.price;
  return {
    id: 'p' + String(i + 1).padStart(3, '0'), name: l ? l.name : t.name, brand: t.brand, cat: sub.cat, sub: t.sub, price, weightG: t.g, dim: t.dim,
    variants: (o.v && o.v.length ? o.v : [['Standar', 0]]).map(([label, d], k) => ({ id: 'v' + k, label, price: d })),
    quality: o.q || 3, origin: o.origin || null, minAge: o.age || null,
    use: o.use || 'own', fx: o.fx || (l && l.fx) || {}, min: o.min || 0, health: o.health, unitQty: o.unitQty || 1, uses: l && l.uses, kind: o.kind || (l && l.kind) || null, upgrade: l && l.upgrade, unlock: l && l.unlock,
    desc: `${t.brand} — ${SUBCAT[t.sub].label.toLowerCase()}. ${t.name}${o.v && o.v.length > 1 ? ' tersedia dalam beberapa pilihan.' : '.'}`,
  };
});

// ————————————————————————— marketplace —————————————————————————
// feePct/feeMin/feeMax: biaya layanan per pesanan. stack: berapa voucher per jenis yang boleh digabung. cover: peluang suatu produk dijual per kategori.
const ALL = c => 1;
const MARKETS = [
  { id: 'shopindo', name: 'Shopindo', tagline: 'Belanja hemat, promo tiap hari', color: '#E8590C', color2: '#FFD8BF', ink: '#7A2E00', logo: 'bag', rating: 4.4, ratingCount: 18420,
    desc: 'Marketplace umum dengan promo agresif: diskon besar, flash sale, dan gratis ongkir. Harga terendah, tetapi mutu penjual bervariasi.',
    traits: ['Diskon sampai 35%', 'Gratis ongkir rutin', 'Penjual sangat banyak'], feePct: 0.015, feeMin: 1000, feeMax: 12000, priceMult: 0.97, discProb: 0.55, discMax: 35, stockMult: 1.5, popularity: 1.6, sellerQuality: 0.55,
    cover: c => 0.92, stack: { discount: 1, freeship: 1, cashback: 1 }, methods: ['saldo', 'transfer', 'wallet', 'qris', 'credit', 'debit', 'cod', 'paylater'],
    paylater: { name: 'ShopPay Later', rateMonth: 0.0229, feePct: 0.012, limitMult: 1, minScore: 520 }, loyalty: false, shipDiscount: 0.2 },
  { id: 'lazamall', name: 'LazaMall', tagline: 'Resmi, premium, bergaransi', color: '#4338CA', color2: '#E0E7FF', ink: '#1E1B6B', logo: 'gem', rating: 4.7, ratingCount: 9210,
    desc: 'Marketplace premium dan elektronik dengan toko resmi merek. Harga lebih tinggi, mutu dan layanan purna jual lebih terjaga.',
    traits: ['Toko resmi merek', 'Elektronik lengkap', 'Garansi & retur mudah'], feePct: 0.03, feeMin: 2500, feeMax: 30000, priceMult: 1.06, discProb: 0.3, discMax: 15, stockMult: 0.8, popularity: 0.9, sellerQuality: 0.9,
    cover: c => ({ elektronik: 1, fashion: 0.9, kecantikan: 0.9, olahraga: 0.85, kesehatan: 0.7, rumah: 0.85, kendaraan: 0.7, kerja: 0.7, pendidikan: 0.5, makanan: 0.2, pertanian: 0.1, hewan: 0.35 }[c] ?? 0.5),
    stack: { discount: 1, freeship: 1, cashback: 0 }, methods: ['saldo', 'transfer', 'wallet', 'qris', 'credit', 'debit', 'paylater'],
    paylater: { name: 'Laza Cicil', rateMonth: 0.0149, feePct: 0.008, limitMult: 1.6, minScore: 620 }, loyalty: false, shipDiscount: 0 },
  { id: 'tokomart', name: 'Tokomart', tagline: 'Dari tetangga, untuk tetangga', color: '#15803D', color2: '#DCFCE7', ink: '#0B4A24', logo: 'store', rating: 4.5, ratingCount: 6730,
    desc: 'Marketplace lokal dan UMKM. Penjual berasal dari kota sekitar sehingga pengiriman lebih cepat dan murah; biaya layanan terendah.',
    traits: ['Penjual UMKM lokal', 'Biaya layanan terendah', 'Pengiriman cepat antarkota dekat'], feePct: 0.005, feeMin: 500, feeMax: 5000, priceMult: 0.99, discProb: 0.35, discMax: 20, stockMult: 1, popularity: 0.8, sellerQuality: 0.7,
    cover: c => ({ makanan: 1, pertanian: 1, hewan: 0.9, rumah: 0.85, fashion: 0.8, kesehatan: 0.75, pendidikan: 0.7, kerja: 0.6, kecantikan: 0.55, olahraga: 0.45, elektronik: 0.35, kendaraan: 0.35 }[c] ?? 0.5),
    stack: { discount: 1, freeship: 1, cashback: 1 }, methods: ['saldo', 'transfer', 'wallet', 'qris', 'cod'],
    paylater: null, loyalty: false, shipDiscount: 0.35, local: true },
  { id: 'belanjaplus', name: 'BelanjaPlus', tagline: 'Makin sering belanja, makin untung', color: '#BE185D', color2: '#FCE7F3', ink: '#6B0F38', logo: 'plus', rating: 4.5, ratingCount: 11980,
    desc: 'Marketplace dengan program loyalitas: kumpulkan poin Plus, naik tingkat, dan nikmati voucher eksklusif serta cashback.',
    traits: ['Poin & tingkat Plus', 'Voucher eksklusif anggota', 'Cashback rutin'], feePct: 0.02, feeMin: 1500, feeMax: 18000, priceMult: 1, discProb: 0.4, discMax: 25, stockMult: 1.1, popularity: 1.1, sellerQuality: 0.75,
    cover: c => 0.88, stack: { discount: 1, freeship: 1, cashback: 1 }, methods: ['saldo', 'transfer', 'wallet', 'qris', 'credit', 'debit', 'cod', 'paylater'],
    paylater: { name: 'Plus Bayar Nanti', rateMonth: 0.0189, feePct: 0.01, limitMult: 1.2, minScore: 560 }, loyalty: true, shipDiscount: 0.1 },
];
const MARKET = id => MARKETS.find(m => m.id === id);

// ————————————————————————— penjual —————————————————————————
const CITIES = Object.keys(SHOP.CITY_COORDS);
const SELLER_NAMES = {
  shopindo: ['Grosir Murah Jaya', 'Toko Serba Ada', 'Hemat Mart Online', 'Pojok Diskon', 'Kios Nusantara', 'Sumber Rejeki', 'Lapak Kilat', 'Gudang Promo'],
  lazamall: ['Novatek Official Store', 'Komputindo Official', 'Garuda Wear Flagship', 'Lelap Home Official', 'Cantik Alami Official', 'Gowes Official', 'Lari Cepat Store', 'Medisku Official'],
  tokomart: ['Warung Bu Sari Online', 'UMKM Berkah Tani', 'Kios Mbak Ratna', 'Toko Pak Slamet', 'Lumbung Desa', 'Dapur Nusantara', 'Pasar Pagi Online', 'Griya Hewan Kita'],
  belanjaplus: ['Plus Official Mart', 'Mitra Plus Store', 'Sahabat Belanja', 'Toko Anggun Plus', 'Rumah Sehat Plus', 'Gadget Plus Corner', 'Plus Fashion House', 'Cerdas Plus Books'],
};
const SELLERS = [];
for (const m of MARKETS) SELLER_NAMES[m.id].forEach((name, i) => {
  const pool = m.local ? ['Pacitan', 'Malang', 'Sleman', 'Yogyakarta', 'Semarang'] : CITIES;
  SELLERS.push({ id: `${m.id}-s${i + 1}`, market: m.id, name, city: pickH(pool, m.id, i, 'city'), rating: Math.round((3.9 + hf(m.id, i, 'sr') * 1.0 * (0.6 + m.sellerQuality * 0.4)) * 10) / 10, official: m.id === 'lazamall', since: 20 + Math.floor(hf(m.id, i, 'since') * 300) });
});

// ————————————————————————— listing (produk di setiap marketplace) —————————————————————————
const LISTINGS = [];
for (const m of MARKETS) {
  const sellers = SELLERS.filter(s => s.market === m.id);
  for (const p of PRODUCTS) {
    if (!p.upgrade && !p.unlock && hf(m.id, p.id, 'cov') >= m.cover(p.cat)) continue; // peralatan yang membuka bonus kebutuhan selalu tersedia
    const seller = sellers[Math.floor(hf(m.id, p.id, 'seller') * sellers.length)];
    const step = p.price >= 500000 ? 5000 : p.price >= 50000 ? 500 : 100;
    const price = roundTo(p.price * m.priceMult * (0.95 + 0.1 * hf(m.id, p.id, 'price')), step);
    const disc = hf(m.id, p.id, 'disc') < m.discProb ? Math.max(5, Math.round((5 + hf(m.id, p.id, 'discp') * (m.discMax - 5)) / 5) * 5) : 0;
    const sale = disc ? roundTo(price * (1 - disc / 100), step) : price;
    const max = Math.max(3, Math.round((6 + hf(m.id, p.id, 'stock') * 60 * m.stockMult) * (p.price > 1000000 ? 0.3 : 1)));
    const sold = Math.floor(hf(m.id, p.id, 'sold') * 4000 * m.popularity * (p.price > 1000000 ? 0.1 : p.price > 200000 ? 0.4 : 1));
    const rating = Math.min(5, Math.round((3.7 + 1.2 * hf(m.id, p.id, 'rate') * (0.5 + m.sellerQuality * 0.5) + (p.quality - 3) * 0.1) * 10) / 10);
    LISTINGS.push({ id: `${m.id}:${p.id}`, market: m.id, product: p.id, seller: seller.id, price, disc, sale, max, refillDays: 3 + Math.floor(hf(m.id, p.id, 'rd') * 4), sold, rating, reviews: Math.floor(sold * (0.12 + 0.2 * hf(m.id, p.id, 'rev'))), added: Math.floor(hf(m.id, p.id, 'added') * 120), warranty: m.id === 'lazamall' ? 12 : 0 });
  }
}
const LISTING = id => LISTINGS.find(l => l.id === id);
const SELLER = id => SELLERS.find(s => s.id === id);
for (const m of MARKETS) { m.sellerCount = SELLERS.filter(s => s.market === m.id).length; m.productCount = LISTINGS.filter(l => l.market === m.id).length; }

// ————————————————————————— event kalender (hari simulasi; tahun 360 hari, bulan 30 hari) —————————————————————————
const dom = d => ((d % 30) + 30) % 30 + 1, doy = d => ((d % 360) + 360) % 360;
const EVENTS = [
  { id: 'gajian', label: 'Promo Gajian (tgl 25–30)', test: d => dom(d) >= 25 },
  { id: 'kembar', label: 'Tanggal Kembar 11.11', test: d => doy(d) >= 10 * 30 + 9 && doy(d) <= 10 * 30 + 11 },
  { id: 'harbolnas', label: 'Harbolnas 12.12', test: d => doy(d) >= 11 * 30 + 10 && doy(d) <= 11 * 30 + 12 },
  { id: 'ramadan', label: 'Promo Ramadan', test: d => doy(d) >= 2 * 30 && doy(d) < 3 * 30 },
  { id: 'akhirtahun', label: 'Promo Akhir Tahun', test: d => doy(d) >= 11 * 30 + 15 },
];
const EVENT = id => EVENTS.find(e => e.id === id);

// ————————————————————————— voucher —————————————————————————
// kind: pct | fixed | freeship | cashback.  scope: all | seller | newuser | event | exclusive.
// kuota: total dunia; NPC menghabiskan kuota seiring hari simulasi (npcRate per hari) sehingga kuota bisa habis.
const VOUCHERS = [];
const V = (market, code, o) => VOUCHERS.push({ market, code, scope: 'all', cats: null, perUser: 1, min: 0, max: 0, npcRate: 0.004, from: 0, to: 9999, ...o });
for (const m of MARKETS) {
  const P = m.id.slice(0, 3).toUpperCase();
  V(m.id, `${P}-HEMAT10`, { label: 'Diskon 10% semua produk', kind: 'pct', value: 10, max: 25000, min: 80000, quota: 3000, perUser: 3, desc: 'Diskon 10% hingga Rp 25.000 untuk belanja minimal Rp 80.000.' });
  V(m.id, `${P}-ONGKIR`, { label: 'Gratis ongkir', kind: 'freeship', value: 100, max: 20000, min: 50000, quota: 5000, perUser: 5, desc: 'Potongan ongkos kirim hingga Rp 20.000 untuk belanja minimal Rp 50.000.' });
  V(m.id, `${P}-BARU`, { label: 'Pengguna baru Rp 20.000', kind: 'fixed', value: 20000, min: 60000, scope: 'newuser', quota: 20000, perUser: 1, npcRate: 0.001, desc: 'Khusus pembelian pertama di marketplace ini.' });
  V(m.id, `${P}-NOMINAL`, { label: 'Potongan Rp 15.000', kind: 'fixed', value: 15000, min: 100000, quota: 2000, perUser: 2, desc: 'Potongan Rp 15.000 untuk belanja minimal Rp 100.000.' });
  V(m.id, `${P}-CASHBACK`, { label: 'Cashback 5%', kind: 'cashback', value: 5, max: 30000, min: 120000, quota: 1500, perUser: 2, desc: 'Cashback 5% (maks. Rp 30.000) masuk setelah pesanan diterima.' });
  V(m.id, `${P}-GAJIAN`, { label: 'Event Gajian 15%', kind: 'pct', value: 15, max: 40000, min: 150000, scope: 'event', event: 'gajian', quota: 1000, perUser: 1, npcRate: 0.02, desc: 'Berlaku tanggal 25–30 setiap bulan.' });
  V(m.id, `${P}-HARBOLNAS`, { label: 'Harbolnas 12.12 — Rp 50.000', kind: 'fixed', value: 50000, min: 300000, scope: 'event', event: 'harbolnas', quota: 600, perUser: 1, npcRate: 0.05, desc: 'Hanya pada Harbolnas 12.12.' });
}
V('shopindo', 'SHO-ELEKTRO', { label: 'Elektronik 8% (maks. Rp 150.000)', kind: 'pct', value: 8, max: 150000, min: 500000, cats: ['elektronik'], quota: 800, perUser: 1, desc: 'Khusus kategori elektronik, belanja minimal Rp 500.000.' });
V('shopindo', 'SHO-FASHION', { label: 'Fashion Rp 30.000', kind: 'fixed', value: 30000, min: 150000, cats: ['fashion'], quota: 1500, perUser: 2, desc: 'Khusus kategori fashion.' });
V('lazamall', 'LAZ-RESMI', { label: 'Toko resmi — diskon 7%', kind: 'pct', value: 7, max: 200000, min: 400000, scope: 'seller', seller: 'lazamall-s1', quota: 700, perUser: 1, desc: 'Khusus belanja di Novatek Official Store.' });
V('lazamall', 'LAZ-VIP', { label: 'Eksklusif PayLater — Rp 75.000', kind: 'fixed', value: 75000, min: 600000, scope: 'exclusive', req: 'paylater', quota: 300, perUser: 1, npcRate: 0.001, desc: 'Eksklusif pengguna dengan Laza Cicil aktif.' });
V('tokomart', 'TOK-LOKAL', { label: 'Produk lokal 12%', kind: 'pct', value: 12, max: 20000, min: 40000, cats: ['makanan', 'pertanian', 'hewan'], quota: 4000, perUser: 4, desc: 'Dukung UMKM: makanan, pertanian, dan hewan.' });
V('tokomart', 'TOK-UMKM', { label: 'Toko UMKM — Rp 8.000', kind: 'fixed', value: 8000, min: 30000, scope: 'seller', seller: 'tokomart-s2', quota: 1200, perUser: 3, desc: 'Khusus UMKM Berkah Tani.' });
V('belanjaplus', 'PLS-ANGGOTA', { label: 'Eksklusif anggota Silver+ — 12%', kind: 'pct', value: 12, max: 60000, min: 100000, scope: 'exclusive', req: 'tier:silver', quota: 600, perUser: 2, npcRate: 0.002, desc: 'Khusus anggota Plus tingkat Silver ke atas.' });
V('belanjaplus', 'PLS-POIN2X', { label: 'Cashback 8% anggota', kind: 'cashback', value: 8, max: 50000, min: 200000, scope: 'exclusive', req: 'tier:bronze', quota: 500, perUser: 1, desc: 'Cashback 8% untuk anggota Plus.' });
const VOUCHER = (market, code) => VOUCHERS.find(v => v.market === market && v.code === code);

// Program loyalitas BelanjaPlus: 1 poin per Rp 10.000 pesanan yang diterima.
const PLUS_TIERS = [{ id: 'bronze', label: 'Bronze', at: 0 }, { id: 'silver', label: 'Silver', at: 30 }, { id: 'gold', label: 'Gold', at: 120 }, { id: 'platinum', label: 'Platinum', at: 350 }];

// Gambar produk: klien menggambar piktogram SVG per subkategori (lihat public/assets/js/ui/product-art.js).
const RULES = {
  maxCartLines: 30, maxQty: 20, maxOrdersActive: 15,
  ship: { reguler: { base: 9000, per100km: 3500, label: 'Reguler', speed: 1 }, ekspres: { base: 16000, per100km: 6500, label: 'Ekspres', speed: 0.5 }, perKg: 2500, freeKg: 1 },
  codFee: 3000, pageSize: 24,
  paylater: { tenors: [1, 3, 6, 12], graceDays: 3, lateFee: 25000, lateRateMonth: 0.02, minAge: 18, limitByScore: [[850, 15000000], [750, 8000000], [650, 4000000], [580, 2000000], [520, 1000000]], restrictAfter: 1, blockAfter: 3, scorePenalty: -35, scoreOnTime: 6 },
};

module.exports = { CATEGORIES, SUBCAT, PRODUCTS, MARKETS, MARKET, SELLERS, SELLER, LISTINGS, LISTING, EVENTS, EVENT, VOUCHERS, VOUCHER, PLUS_TIERS, RULES, CITIES, hf, dom, doy };
