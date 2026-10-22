// BizSim 7.0.0 static catalogs. All prices and company names are SIMULATION ONLY (not real market data).
export const SECTORS = {
  Perbankan: { rate: .6, infl: -.3, growth: 1.5, usd: 0 }, Telekomunikasi: { rate: -.6, infl: -.5, growth: .5, usd: -.2 },
  Otomotif: { rate: -1.8, infl: -.5, growth: 2, usd: -1 }, Konsumer: { rate: -.3, infl: -1.5, growth: 1, usd: -.8 },
  Energi: { rate: -.3, infl: 1.5, growth: 1, usd: 1.5 }, Teknologi: { rate: -2.5, infl: -.5, growth: 1.5, usd: -.5 },
  Kesehatan: { rate: -.4, infl: -.3, growth: .4, usd: -.3 }, Properti: { rate: -2.2, infl: .5, growth: 1.5, usd: -.4 },
  Logistik: { rate: -1, infl: -.4, growth: 1.5, usd: -.3 }, Media: { rate: -1.2, infl: -.5, growth: 1.2, usd: -.2 }
};
// lot: IDX = 100 shares per lot, foreign = 1 share. mu = annual drift, vol = annual volatility, div = annual yield
export const STOCKS = [
  { t: 'BBCA', n: 'Bank Central Asia', sec: 'Perbankan', c: 'ID', p: 9800, beta: .9, vol: .22, mu: .1, div: .028, cap: 1200, d: 'Bank swasta terbesar dengan basis nasabah transaksi yang kuat dan valuasi premium.' },
  { t: 'BMRI', n: 'Bank Mandiri', sec: 'Perbankan', c: 'ID', p: 5200, beta: 1, vol: .26, mu: .09, div: .055, cap: 480, d: 'Bank BUMN dengan portofolio kredit korporasi dan dividen besar.' },
  { t: 'BBRI', n: 'Bank Rakyat Indonesia', sec: 'Perbankan', c: 'ID', p: 4300, beta: 1.05, vol: .28, mu: .09, div: .06, cap: 650, d: 'Penyalur kredit mikro terbesar dengan jaringan unit di seluruh pelosok.' },
  { t: 'TLKM', n: 'Telkom Indonesia', sec: 'Telekomunikasi', c: 'ID', p: 3200, beta: .8, vol: .22, mu: .06, div: .058, cap: 320, d: 'Operator telekomunikasi dan infrastruktur digital dengan arus kas stabil.' },
  { t: 'ASII', n: 'Astra International', sec: 'Otomotif', c: 'ID', p: 4800, beta: .95, vol: .26, mu: .07, div: .065, cap: 200, d: 'Konglomerat otomotif, alat berat, dan jasa keuangan.' },
  { t: 'UNVR', n: 'Unilever Indonesia', sec: 'Konsumer', c: 'ID', p: 2400, beta: .7, vol: .24, mu: .03, div: .045, cap: 90, d: 'Produsen barang konsumsi harian dengan merek yang dikenal luas.' },
  { t: 'ICBP', n: 'Indofood CBP', sec: 'Konsumer', c: 'ID', p: 11000, beta: .7, vol: .22, mu: .06, div: .03, cap: 130, d: 'Mi instan dan makanan olahan dengan distribusi nasional.' },
  { t: 'ADRO', n: 'Alamtri Resources', sec: 'Energi', c: 'ID', p: 2500, beta: 1.3, vol: .38, mu: .05, div: .08, cap: 80, d: 'Batu bara dan energi. Harga sensitif terhadap komoditas dan kurs.' },
  { t: 'GOTO', n: 'GoTo Gojek Tokopedia', sec: 'Teknologi', c: 'ID', p: 70, beta: 1.6, vol: .55, mu: .08, div: 0, cap: 85, d: 'Ekosistem transportasi, e-commerce, dan fintech. Volatil dan belum membagi dividen.' },
  { t: 'TSLA', n: 'Tesla', sec: 'Otomotif', c: 'US', p: 4000000, beta: 1.9, vol: .55, mu: .1, div: 0, cap: 9000, d: 'Mobil listrik dan energi. Harga sangat dipengaruhi sentimen dan berita.' },
  { t: 'AAPL', n: 'Apple', sec: 'Teknologi', c: 'US', p: 3300000, beta: 1.1, vol: .28, mu: .1, div: .005, cap: 55000, d: 'Perangkat dan layanan digital global dengan buyback besar.' },
  { t: 'NVDA', n: 'Nvidia', sec: 'Teknologi', c: 'US', p: 2300000, beta: 2, vol: .55, mu: .14, div: .0003, cap: 40000, d: 'Chip untuk AI dan komputasi. Pertumbuhan tinggi, risiko tinggi.' },
  { t: 'MSFT', n: 'Microsoft', sec: 'Teknologi', c: 'US', p: 6800000, beta: 1, vol: .25, mu: .1, div: .008, cap: 52000, d: 'Perangkat lunak, cloud, dan produktivitas perusahaan.' },
  { t: 'NSTR', n: 'Nusantara Energi Terbarukan', sec: 'Energi', c: 'ID', p: 640, beta: 1.4, vol: .6, mu: .08, div: 0, cap: 12, d: 'Perusahaan fiktif energi surya dan angin. Kapitalisasi kecil, risiko tinggi.', game: 1 },
  { t: 'KRTV', n: 'Kreatif Media Pratama', sec: 'Media', c: 'ID', p: 420, beta: 1.2, vol: .5, mu: .06, div: .01, cap: 8, d: 'Perusahaan fiktif produksi konten dan iklan digital.', game: 1 }
];
export const TRADE = [
  { id: 'BTC', n: 'Bitcoin', p: 950e6, vol: .65, lev: 10, corr: .45, cls: 'Kripto' },
  { id: 'ETH', n: 'Ethereum', p: 52e6, vol: .75, lev: 10, corr: .5, cls: 'Kripto' },
  { id: 'SOL', n: 'Solana', p: 3.2e6, vol: .9, lev: 8, corr: .5, cls: 'Kripto' },
  { id: 'OIL', n: 'Minyak Mentah', p: 1.25e6, vol: .4, lev: 10, corr: .3, cls: 'Komoditas' },
  { id: 'USDIDR', n: 'USD / IDR', p: 16200, vol: .08, lev: 20, corr: 0, cls: 'Forex' }
];
export const BONDS = [
  { id: 'ori', n: 'Obligasi Negara Ritel (ORI)', issuer: 'Pemerintah', rating: 'Sovereign', tenor: 36, coupon: 6.4, float: 0, spread: .1, min: 1000000, risk: 1, d: 'Kupon tetap bulanan, dijamin negara. Pokok kembali saat jatuh tempo.' },
  { id: 'sbr', n: 'Savings Bond Ritel (SBR)', issuer: 'Pemerintah', rating: 'Sovereign', tenor: 24, coupon: 6.2, float: 1, spread: .15, min: 1000000, risk: 1, d: 'Kupon mengambang mengikuti suku bunga acuan, dengan batas bawah.' },
  { id: 'sukuk', n: 'Sukuk Ritel', issuer: 'Pemerintah', rating: 'Sovereign', tenor: 36, coupon: 6.3, float: 0, spread: .1, min: 1000000, risk: 1, d: 'Imbal hasil tetap berbasis akad syariah.' },
  { id: 'fr', n: 'Obligasi Negara FR 5 Tahun', issuer: 'Pemerintah', rating: 'Sovereign', tenor: 60, coupon: 7, float: 0, spread: .35, min: 5000000, risk: 2, d: 'Tenor panjang. Harga sekunder lebih sensitif terhadap suku bunga.' },
  { id: 'corp-aa', n: 'Obligasi Korporasi AA (Perbankan)', issuer: 'Bank swasta', rating: 'AA', tenor: 36, coupon: 7.8, float: 0, spread: 1.5, min: 5000000, risk: 2, defaultPa: .002, d: 'Imbal hasil lebih tinggi dari negara dengan risiko gagal bayar kecil.' },
  { id: 'corp-bbb', n: 'Obligasi Korporasi BBB (High Yield)', issuer: 'Perusahaan menengah', rating: 'BBB', tenor: 24, coupon: 10.5, float: 0, spread: 4.2, min: 5000000, risk: 4, defaultPa: .03, d: 'Kupon tinggi, ada risiko gagal bayar. Pemulihan sekitar 40% bila default.' }
];
export const FUNDS = [
  { id: 'rd-pu', n: 'Reksa Dana Pasar Uang Nusa', type: 'Pasar Uang', w: { cash: 1 }, fee: .005, risk: 1, settle: 1, min: 100000, d: 'Aman dan likuid. Imbal hasil mengikuti suku bunga deposito.' },
  { id: 'rd-pt', n: 'Reksa Dana Pendapatan Tetap Cakrawala', type: 'Pendapatan Tetap', w: { bond: 1 }, fee: .012, risk: 2, settle: 2, min: 100000, d: 'Berisi obligasi. NAV turun saat suku bunga naik.' },
  { id: 'rd-mix', n: 'Reksa Dana Campuran Garuda', type: 'Campuran', w: { stock: .4, bond: .4, cash: .2 }, fee: .016, risk: 3, settle: 2, min: 100000, d: 'Gabungan saham, obligasi, dan kas untuk risiko menengah.' },
  { id: 'rd-sh', n: 'Reksa Dana Saham Indonesia Prima', type: 'Saham', w: { stock: .92, cash: .08 }, fee: .02, risk: 4, settle: 3, min: 100000, d: 'Berisi saham blue chip. Naik turun mengikuti bursa.' },
  { id: 'rd-idx', n: 'Reksa Dana Indeks Bursa 8 (ETF)', type: 'Indeks', w: { stock: 1 }, fee: .005, risk: 4, settle: 2, min: 100000, d: 'Meniru indeks 8 saham terbesar dengan biaya rendah.' }
];
export const PROPERTY = [
  { k: 'tanah', n: 'Tanah Kavling', base: 180e6, rent: 0, up: 0, src: 'land', sz: '100 m2', city: ['Bogor', 'Bekasi', 'Malang', 'Yogyakarta'] },
  { k: 'rumah', n: 'Rumah Tipe 36', base: 420e6, rent: .0042, up: 400000, src: 'property', sz: '36/72 m2', city: ['Depok', 'Bandung', 'Semarang', 'Surabaya'] },
  { k: 'kos', n: 'Rumah Kos 10 Kamar', base: 850e6, rent: .0075, up: 1800000, src: 'property', sz: '10 kamar', city: ['Yogyakarta', 'Malang', 'Bandung', 'Jatinangor'] },
  { k: 'ruko', n: 'Ruko 2 Lantai', base: 1600e6, rent: .0055, up: 2500000, src: 'property', sz: '2 lantai', city: ['Tangerang', 'Bekasi', 'Medan', 'Makassar'] },
  { k: 'apartemen', n: 'Apartemen Studio', base: 650e6, rent: .0048, up: 1200000, src: 'property', sz: '28 m2', city: ['Jakarta Selatan', 'Jakarta Barat', 'Surabaya'] },
  { k: 'gudang', n: 'Gudang Logistik', base: 2400e6, rent: .006, up: 3500000, src: 'land', sz: '500 m2', city: ['Cikarang', 'Karawang', 'Sidoarjo'] }
];
export const DEPOSIT_TENORS = [1, 3, 6, 12];
export const SHOP = [
  // career tools
  { id: 'suit', cat: 'Karier', n: 'Pakaian Formal', p: 750000, ic: 'shirt', eff: { interview: 4 }, d: 'Penampilan rapi. Skor interview +4.' },
  { id: 'laptop', cat: 'Karier', n: 'Laptop Kerja', p: 8500000, ic: 'laptop', eff: { learn: .1, interview: 2 }, d: 'Belajar 10% lebih efektif. Interview +2.' },
  { id: 'books', cat: 'Karier', n: 'Paket Buku & Kursus Online', p: 400000, ic: 'book', eff: { learn: .05 }, d: 'Pelatihan dan pendidikan memberi 5% skill tambahan.' },
  { id: 'motor', cat: 'Karier', n: 'Sepeda Motor', p: 18000000, ic: 'motor', eff: { interview: 3 }, d: 'Mobilitas lebih baik. Interview +3.' },
  { id: 'tablet', cat: 'Karier', n: 'Tablet Gambar', p: 3500000, ic: 'pen', eff: { creator: 5, interview: 2 }, d: 'Alat desain. Kualitas konten +5.' },
  // creator gear
  { id: 'ringlight', cat: 'Kreator', n: 'Tripod & Ring Light', p: 600000, ic: 'bulb', eff: { creator: 3 }, d: 'Pencahayaan lebih baik. Kualitas konten +3.' },
  { id: 'mic', cat: 'Kreator', n: 'Mikrofon Studio', p: 2500000, ic: 'mic', eff: { creator: 6 }, d: 'Audio jernih. Kualitas konten +6.' },
  { id: 'camera', cat: 'Kreator', n: 'Kamera Mirrorless', p: 14000000, ic: 'camera', eff: { creator: 10 }, d: 'Visual tajam. Kualitas konten +10.' },
  { id: 'editpc', cat: 'Kreator', n: 'PC Editing', p: 18000000, ic: 'monitor', eff: { creator: 8, learn: .03 }, d: 'Render cepat. Kualitas konten +8.' },
  // business equipment: install into a matching business
  { id: 'espresso', cat: 'Bisnis', n: 'Mesin Espresso Komersial', p: 9000000, ic: 'coffee', biz: ['coffee-shop', 'cloud-kitchen'], eff: { quality: 6 }, d: 'Kualitas produk +6 pada coffee shop atau cloud kitchen.' },
  { id: 'oven', cat: 'Bisnis', n: 'Oven Industri', p: 12000000, ic: 'fork', biz: ['restaurant', 'cloud-kitchen', 'coffee-shop'], eff: { capacity: .2 }, d: 'Kapasitas produksi +20%.' },
  { id: 'washer', cat: 'Bisnis', n: 'Mesin Cuci Industri', p: 14000000, ic: 'laundry', biz: ['laundry'], eff: { capacity: .25 }, d: 'Kapasitas laundry +25%.' },
  { id: 'display', cat: 'Bisnis', n: 'Rak Display & Etalase', p: 3000000, ic: 'store', biz: ['warung', 'minimarket', 'clothing', 'online-store'], eff: { capacity: .15 }, d: 'Kapasitas +15%.' },
  { id: 'pos', cat: 'Bisnis', n: 'Sistem Kasir Digital', p: 4000000, ic: 'bolt', biz: ['*'], eff: { efficiency: .03 }, d: 'Biaya produksi -3%.' },
  { id: 'studiokit', cat: 'Bisnis', n: 'Studio Kit Produksi', p: 20000000, ic: 'camera', biz: ['content-studio', 'digital-agency', 'tiktok-shop'], eff: { quality: 8 }, d: 'Kualitas produksi +8.' },
  { id: 'forklift', cat: 'Bisnis', n: 'Forklift & Rak Gudang', p: 45000000, ic: 'truck', biz: ['logistics', 'manufacturing', 'online-store'], eff: { capacity: .2 }, d: 'Kapasitas +20%.' },
  { id: 'cctv', cat: 'Bisnis', n: 'CCTV & Alarm', p: 2500000, ic: 'shield', biz: ['*'], eff: { theft: .6 }, d: 'Risiko kemalingan bisnis turun 60%.' },
  { id: 'genset', cat: 'Bisnis', n: 'Genset Cadangan', p: 6000000, ic: 'bolt', biz: ['*'], eff: { blackout: .8 }, d: 'Kerugian saat listrik padam turun 80%.' },
  // protection
  { id: 'ins-home', cat: 'Proteksi', n: 'Asuransi Harta Benda (1 tahun)', p: 1800000, ic: 'shield', eff: { insured: 1 }, d: 'Kerugian pencurian, kehilangan, dan kerusakan properti turun 70% selama 365 hari.', sub: 365 },
  // collectibles: value follows the art market index
  { id: 'paint-land', cat: 'Koleksi', n: 'Lukisan Pemandangan', p: 4500000, ic: 'frame', col: { beta: .8, vol: .012, fake: .06 }, d: 'Karya pelukis lokal. Nilai mengikuti pasar seni.' },
  { id: 'paint-abs', cat: 'Koleksi', n: 'Lukisan Abstrak Modern', p: 12000000, ic: 'frame', col: { beta: 1, vol: .016, fake: .08 }, d: 'Gaya kontemporer dengan fluktuasi harga lebih besar.' },
  { id: 'paint-master', cat: 'Koleksi', n: 'Lukisan Maestro (Langka)', p: 150000000, ic: 'frame', col: { beta: 1.3, vol: .02, fake: .12 }, d: 'Karya langka. Potensi naik besar, risiko pemalsuan lebih tinggi.' },
  { id: 'keris', cat: 'Koleksi', n: 'Keris Antik', p: 25000000, ic: 'blade', col: { beta: .6, vol: .008, fake: .1 }, d: 'Pusaka antik. Nilai stabil dan naik pelan.' },
  { id: 'watch', cat: 'Koleksi', n: 'Jam Tangan Vintage', p: 60000000, ic: 'watch', col: { beta: .9, vol: .01, fake: .07 }, d: 'Koleksi jam edisi lama.' },
  { id: 'classic-car', cat: 'Koleksi', n: 'Mobil Klasik', p: 400000000, ic: 'car', col: { beta: 1, vol: .01, fake: .04 }, d: 'Nilai tinggi, likuiditas rendah.' },
  { id: 'coin', cat: 'Koleksi', n: 'Koin Langka', p: 6000000, ic: 'coin', col: { beta: .5, vol: .006, fake: .09 }, d: 'Kecil, mudah disimpan, nilai stabil.' },
  { id: 'wine', cat: 'Koleksi', n: 'Wine Koleksi', p: 9000000, ic: 'drop', col: { beta: .5, vol: .005, fake: .02 }, d: 'Nilai naik seiring usia simpan.', age: .0003 },
  { id: 'sneaker', cat: 'Koleksi', n: 'Sepatu Edisi Terbatas', p: 3000000, ic: 'shoe', col: { beta: 1.2, vol: .02, fake: .1 }, d: 'Tren cepat. Bisa naik tajam, bisa juga turun.' },
  { id: 'batik', cat: 'Koleksi', n: 'Batik Tulis Kolektor', p: 7000000, ic: 'frame', col: { beta: .6, vol: .006, fake: .05 }, d: 'Warisan budaya dengan permintaan stabil.' }
];
export const TRAITS = {
  hardworking: { n: 'Pekerja Keras', prod: 8, loy: 2, txt: 'rajin dan jarang mengeluh' },
  creative: { n: 'Kreatif', prod: 3, loy: -3, txt: 'penuh ide tetapi cepat bosan' },
  perfectionist: { n: 'Perfeksionis', prod: -2, loy: 0, txt: 'teliti, namun mudah stres saat target ketat' },
  relaxed: { n: 'Santai', prod: -6, loy: 4, txt: 'tenang dan tidak mudah panik' },
  ambitious: { n: 'Ambisius', prod: 6, loy: -10, txt: 'mengejar promosi dan cepat meminta kenaikan gaji' },
  loyal: { n: 'Loyalis', prod: 0, loy: 15, txt: 'setia dan nyaman bertahan lama' },
  social: { n: 'Komunikatif', prod: 2, loy: 2, txt: 'luwes menghadapi pelanggan dan rekan' },
  techy: { n: 'Melek Teknologi', prod: 4, loy: -2, txt: 'cepat mengadopsi alat dan sistem baru' }
};
export const FLAWS = [
  { id: 'late', n: 'Sering terlambat', prod: -4 }, { id: 'procrast', n: 'Suka menunda pekerjaan', prod: -5 }, { id: 'gossip', n: 'Suka bergosip', prod: -2 },
  { id: 'burnout', n: 'Mudah kelelahan', prod: -3 }, { id: 'arrogant', n: 'Kurang menerima kritik', prod: -2 }, { id: 'none', n: 'Tidak ada kelemahan menonjol', prod: 0 }
];
export const ROLES = {
  generic: ['Staf Penjualan', 'Staf Gudang', 'Admin', 'Supervisor', 'Staf Pemasaran'],
  'Food & Beverage': ['Barista / Koki', 'Kasir', 'Staf Dapur', 'Supervisor Outlet', 'Staf Pemasaran'],
  Technology: ['Developer', 'Desainer UI', 'Customer Support', 'Project Manager', 'Staf Pemasaran'],
  Media: ['Editor Video', 'Videografer', 'Content Writer', 'Social Media Specialist', 'Producer'],
  Logistics: ['Driver', 'Staf Gudang', 'Dispatcher', 'Admin Operasional', 'Supervisor'],
  Manufacturing: ['Operator Mesin', 'Quality Control', 'Teknisi', 'Staf Gudang', 'Supervisor Produksi'],
  Services: ['Staf Layanan', 'Teknisi', 'Kasir', 'Admin', 'Supervisor'],
  'E-commerce': ['Admin Toko Online', 'Customer Service', 'Staf Gudang', 'Content Creator', 'Staf Iklan']
};
export const FIRST = ['Rina', 'Budi', 'Sari', 'Dimas', 'Putri', 'Agus', 'Maya', 'Rizky', 'Dewi', 'Fajar', 'Nadia', 'Hendra', 'Lestari', 'Andi', 'Wulan', 'Bayu', 'Citra', 'Eko', 'Tiara', 'Yoga', 'Intan', 'Galih', 'Salsa', 'Rafi'];
export const LAST = ['Pratama', 'Wijaya', 'Santoso', 'Lestari', 'Kusuma', 'Hidayat', 'Saputra', 'Nugroho', 'Permata', 'Siregar', 'Hutapea', 'Wibowo', 'Anggraini', 'Ramadhan', 'Susanto', 'Maharani'];
export const EDU = ['SMA/SMK', 'SMA/SMK', 'D3', 'D3', 'S1'];
export const QUESTIONS = [
  { id: 'exp', q: 'Ceritakan pengalaman kerja terakhir Anda.' },
  { id: 'why', q: 'Mengapa Anda ingin bergabung dengan kami?' },
  { id: 'press', q: 'Bagaimana Anda menghadapi tekanan dan target ketat?' },
  { id: 'weak', q: 'Apa kelemahan terbesar Anda?' },
  { id: 'sal', q: 'Berapa ekspektasi gaji dan rencana jangka panjang Anda?' },
  { id: 'case', q: 'Studi kasus singkat: pelanggan komplain keras, apa langkah Anda?' }
];
// career interview bank: pts is awarded for the chosen option (0..10)
export const INTERVIEW = [
  { id: 'i1', q: 'Anda diminta lembur mendadak untuk menyelesaikan target tim. Apa yang Anda lakukan?', o: [['Menolak karena di luar jam kerja', 1], ['Menyanggupi dan mengatur prioritas bersama tim', 10], ['Menyanggupi tetapi mengerjakan seadanya', 3]] },
  { id: 'i2', q: 'Atasan memberi kritik pada hasil kerja Anda di depan tim.', o: [['Mencatat masukan dan memperbaiki hasil', 10], ['Membela diri dan menyalahkan data', 2], ['Diam dan mengabaikannya', 4]] },
  { id: 'i3', q: 'Anda menemukan kesalahan pada laporan yang sudah dikirim.', o: [['Segera melapor dan mengirim revisi', 10], ['Menunggu sampai ada yang sadar', 1], ['Memperbaiki diam-diam tanpa memberi tahu', 5]] },
  { id: 'i4', q: 'Dua tugas penting memiliki tenggat bersamaan.', o: [['Mengerjakan keduanya setengah-setengah', 3], ['Menilai dampak, memprioritaskan, dan meminta bantuan bila perlu', 10], ['Mengerjakan yang paling mudah dulu', 5]] },
  { id: 'i5', q: 'Rekan kerja tidak mau bekerja sama dalam proyek.', o: [['Berbicara langsung dan mencari kesepakatan', 10], ['Melapor ke atasan tanpa bicara dulu', 5], ['Mengerjakan semuanya sendiri', 4]] },
  { id: 'i6', q: 'Mengapa perusahaan harus memilih Anda?', o: [['Saya butuh pekerjaan ini', 2], ['Skill saya cocok dan saya siap belajar cepat', 10], ['Saya bisa bekerja dengan gaji berapa pun', 3]] }
];
export const BRANDS = ['Kopi Senja', 'Glow Lab', 'PasarKita', 'NovaPay', 'Tanah Air Apparel', 'Gadget Hub', 'FitNusa', 'Dapur Bunda', 'TravelKu', 'EduPlus'];
export const CONTENT = {
  tiktok: [['Challenge Viral', { cost: 0, viral: 1.6, reach: 1.2, q: .85 }], ['Tutorial Singkat', { cost: 0, viral: .8, reach: 1, q: 1.1 }], ['Review Produk', { cost: 0, viral: 1, reach: 1, q: 1, sponsor: 1.5 }], ['Vlog Harian', { cost: 0, viral: .9, reach: .9, q: 1, loyal: 1.2 }]],
  instagram: [['Reels Kreatif', { cost: 0, viral: 1.3, reach: 1.1, q: 1 }], ['Foto Estetik', { cost: 0, viral: .6, reach: .9, q: 1.2, loyal: 1.3 }], ['Endorse Produk', { cost: 0, viral: 1, reach: 1, q: 1, sponsor: 1.7 }], ['Live Q&A', { cost: 0, viral: .8, reach: 1, q: 1, loyal: 1.4 }]],
  podcast: [['Episode Solo', { cost: 150000, viral: .8, reach: 1, q: 1 }], ['Wawancara Tamu', { cost: 400000, viral: 1.4, reach: 1.3, q: 1.1 }], ['Episode Edukasi', { cost: 200000, viral: .9, reach: 1, q: 1.2, loyal: 1.3 }], ['Episode Sponsor', { cost: 150000, viral: .7, reach: .9, q: 1, sponsor: 1.8 }]],
  twitch: [['Gaming Santai', { cost: 50000, viral: 1, reach: 1, q: 1 }], ['Turnamen Komunitas', { cost: 150000, viral: 1.5, reach: 1.3, q: 1 }], ['Just Chatting', { cost: 50000, viral: .7, reach: .9, q: 1, loyal: 1.4 }], ['Live Sponsor', { cost: 50000, viral: .8, reach: 1, q: 1, sponsor: 1.8 }]]
};
export const CREATOR_THEME = { tiktok: 'Feed Vertikal', instagram: 'Grid Visual', podcast: 'Studio Audio', twitch: 'Ruang Siaran' };
export const TICK = p => (p < 200 ? 1 : p < 500 ? 2 : p < 2000 ? 5 : p < 5000 ? 10 : 25);
