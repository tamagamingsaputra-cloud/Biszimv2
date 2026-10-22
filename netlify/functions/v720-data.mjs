// BizSim 7.2.0 static data. All market effects are SIMULATION ONLY.
import { PLATFORMS } from './v655.mjs';
import { SHOP, CONTENT } from './v700-data.mjs';
export const VERSION = '7.2.0';

/* extra creator platform (gated by creator level) */
PLATFORMS.facebook = { lvl: 4, name: 'Facebook', unit: 'followers', need: 3000, rpm: 3500, viral: .05, postCost: 0, desc: 'Halaman dan grup. Audiens luas dan pertumbuhan stabil.' };
CONTENT.facebook = [['Video Pendek', { cost: 0, viral: 1.1, reach: 1.1, q: 1 }], ['Artikel Komunitas', { cost: 0, viral: .6, reach: .9, q: 1.2, loyal: 1.3 }], ['Iklan Berbayar', { cost: 300000, viral: 1, reach: 1.6, q: 1 }], ['Live Grup', { cost: 0, viral: .8, reach: 1, q: 1, loyal: 1.4 }]];
export const STUDIO = { max: 5, costs: [5e6, 15e6, 40e6, 100e6, 250e6], names: ['Sudut Rekam', 'Studio Rumahan', 'Studio Semi-Profesional', 'Studio Profesional', 'Studio Broadcast'] };

/* lifestyle shop (equip slots). Added to the shared SHOP array so /api/v700/shop/buy handles purchases. */
SHOP.push(
  { id: 'ls-suit', cat: 'Gaya Hidup', slot: 'outfit', n: 'Jas Wol Mewah', p: 5200000, ic: 'shirt', eff: { interview: 5 }, stat: { Karisma: 10 }, d: 'Memberi kesan profesional saat interview dan negosiasi.' },
  { id: 'ls-watch', cat: 'Gaya Hidup', slot: 'accessory', n: 'Jam Tangan Berlian', p: 12000000, ic: 'watch', eff: { interview: 2, creator: 3 }, stat: { Gaya: 15 }, d: 'Aksesori mewah yang menaikkan citra di depan kamera dan klien.' },
  { id: 'ls-desk', cat: 'Gaya Hidup', slot: 'desk', n: 'Meja Kantor Modern', p: 3800000, ic: 'laptop', eff: { learn: .05 }, stat: { Efisiensi: 5 }, d: 'Ruang kerja nyaman sehingga belajar 5% lebih efektif.' },
  { id: 'ls-phone', cat: 'Gaya Hidup', slot: 'device', n: 'Ponsel Flagship', p: 14000000, ic: 'camera', eff: { creator: 4 }, stat: { Gaya: 8 }, d: 'Kamera dan layar premium untuk konten harian.' },
  { id: 'ls-shoes', cat: 'Gaya Hidup', slot: 'shoes', n: 'Sepatu Kulit Pantofel', p: 1800000, ic: 'shoe', eff: { interview: 2 }, stat: { Karisma: 4 }, d: 'Penampilan rapi dari ujung kepala sampai kaki.' },
  { id: 'ls-chair', cat: 'Gaya Hidup', slot: 'chair', n: 'Kursi Ergonomis', p: 4500000, ic: 'box', eff: { learn: .03 }, stat: { Efisiensi: 3 }, d: 'Duduk lebih lama tanpa lelah, belajar lebih fokus.' },
  { id: 'ls-car', cat: 'Gaya Hidup', slot: 'vehicle', n: 'Mobil Sedan Pribadi', p: 320000000, ic: 'car', eff: { interview: 3, creator: 2 }, stat: { Karisma: 8, Gaya: 8 }, d: 'Mobilitas dan citra yang meyakinkan klien.' },
  { id: 'ins-biz', cat: 'Proteksi', n: 'Asuransi Usaha (1 tahun)', p: 3500000, ic: 'shield', eff: {}, sub: 365, d: 'Klaim kebakaran, banjir, dan pencurian menanggung 70% kerugian di semua bisnis selama 365 hari.' }
);

/* courses: lessons are sequential. gains apply on completion. lock: {skill,min} | {creator:n} | {course:id} */
const T = [['basic', 'Dasar', 250000, 5, 5, 0], ['mid', 'Menengah', 900000, 10, 9, 25], ['pro', 'Lanjutan', 3500000, 20, 15, 45]];
const trainingOf = (skill, label, ic) => ({ id: `tr-${skill}`, kind: 'training', name: `Training ${label}`, ic, skill, cert: `${label} Bersertifikat`, lessons: T.map(t => ({ n: t[1], cost: t[2], days: t[3], gains: { [skill]: t[4] }, min: t[5] })) });
export const COURSES = [
  { id: 'biz101', kind: 'education', name: 'Business Management 101', ic: 'chart', skill: 'management', cert: 'Business Management', lessons: [{ n: 'Finance Fundamentals', cost: 1500000, days: 14, gains: { finance: 6, management: 3 } }, { n: 'Team Leadership', cost: 2000000, days: 14, gains: { management: 8, communication: 3 } }, { n: 'Record Plan', cost: 1500000, days: 10, gains: { finance: 5 } }, { n: 'Strategic Scaling', cost: 3000000, days: 21, gains: { management: 8, negotiation: 4 } }] },
  { id: 'trading', kind: 'education', name: 'Trading Masterclass', ic: 'candle', skill: 'finance', cert: 'Trading', lessons: [{ n: 'Market Basics', cost: 1000000, days: 7, gains: { finance: 4 } }, { n: 'Technical Analysis', cost: 1800000, days: 14, gains: { finance: 6 } }, { n: 'Risk Management', cost: 2200000, days: 14, gains: { finance: 6, problemSolving: 3 } }, { n: 'Chart Patterns', cost: 2500000, days: 14, gains: { finance: 7 } }, { n: 'Trading Psychology', cost: 2500000, days: 10, gains: { finance: 5, negotiation: 3 } }] },
  { id: 'seo', kind: 'education', name: 'Advanced SEO & Marketing', ic: 'mega', skill: 'marketing', cert: 'SEO Marketing', lessons: [{ n: 'Riset Kata Kunci', cost: 1200000, days: 7, gains: { marketing: 5 } }, { n: 'Konten dan Backlink', cost: 1800000, days: 14, gains: { marketing: 7, design: 3 } }, { n: 'Iklan Berbayar', cost: 2500000, days: 14, gains: { marketing: 8 } }, { n: 'Analitik dan Konversi', cost: 3000000, days: 14, gains: { marketing: 8, finance: 2 } }] },
  { id: 'logi', kind: 'education', name: 'Logistics Management', ic: 'truck', skill: 'management', cert: 'Logistik', lessons: [{ n: 'Rantai Pasok', cost: 1500000, days: 10, gains: { management: 5 } }, { n: 'Gudang dan Inventori', cost: 2000000, days: 14, gains: { management: 6, problemSolving: 3 } }, { n: 'Distribusi dan Rute', cost: 2500000, days: 14, gains: { management: 7, negotiation: 3 } }] },
  { id: 'media', kind: 'education', name: 'Media Production', ic: 'video', skill: 'design', cert: 'Produksi Media', lock: { creator: 3 }, lessons: [{ n: 'Penyuntingan Video', cost: 2000000, days: 10, gains: { design: 7 } }, { n: 'Audio dan Suara', cost: 2000000, days: 10, gains: { design: 4, communication: 3 } }, { n: 'Pencahayaan', cost: 2500000, days: 10, gains: { design: 6 } }, { n: 'Storytelling', cost: 3000000, days: 14, gains: { design: 5, communication: 6, marketing: 3 } }] },
  { id: 'acc', kind: 'education', name: 'Akuntansi Bisnis', ic: 'file', skill: 'finance', cert: 'Akuntansi', lessons: [{ n: 'Pembukuan Dasar', cost: 1500000, days: 14, gains: { finance: 6 } }, { n: 'Laporan Keuangan', cost: 2500000, days: 21, gains: { finance: 9 } }] },
  { id: 'prog', kind: 'education', name: 'Programming Bootcamp', ic: 'laptop', skill: 'programming', cert: 'Programming', lessons: [{ n: 'Dasar Pemrograman', cost: 1800000, days: 14, gains: { programming: 6 } }, { n: 'Web dan Basis Data', cost: 2500000, days: 21, gains: { programming: 9 } }, { n: 'Proyek Akhir', cost: 2500000, days: 14, gains: { programming: 7, problemSolving: 3 } }] },
  { id: 'd3', kind: 'degree', name: 'Diploma D3', ic: 'cap', skill: 'management', level: 'D3', lessons: Array.from({ length: 6 }, (_, i) => ({ n: `Semester ${i + 1}`, cost: 3000000, days: 30, gains: i % 2 ? { finance: 3, communication: 2 } : { management: 3, problemSolving: 2 } })) },
  { id: 's1', kind: 'degree', name: 'Sarjana S1', ic: 'cap', skill: 'management', level: 'S1', lock: { course: 'd3' }, lessons: Array.from({ length: 8 }, (_, i) => ({ n: `Semester ${i + 1}`, cost: 4500000, days: 30, gains: i % 2 ? { negotiation: 3, leadership: 2, finance: 2 } : { management: 4, finance: 3 } })) },
  trainingOf('sales', 'Sales', 'cart'), trainingOf('communication', 'Customer Service', 'chat'), trainingOf('finance', 'Finance', 'wallet'), trainingOf('programming', 'Programming', 'laptop'), trainingOf('management', 'Management', 'chart'), trainingOf('negotiation', 'Negotiation', 'handshake')
];

/* land */
export const LK = {
  pesisir: { label: 'Oceanview Pesisir', cities: ['Bali', 'Lombok', 'Banyuwangi', 'Pangandaran'], sqm: [500, 750, 1000], ppsm: 3.2e6, mu: .085, vol: .10, legal: .03, flood: .10, lease: .02 },
  pinggiran: { label: 'Kavling Pinggiran Kota', cities: ['Bogor', 'Bekasi', 'Depok', 'Tangerang Selatan'], sqm: [150, 200, 300, 500], ppsm: 2.5e6, mu: .07, vol: .06, legal: .02, flood: .05, lease: .025 },
  agrikultur: { label: 'Lahan Pertanian', cities: ['Subang', 'Karawang', 'Garut', 'Malang'], sqm: [5000, 10000, 20000], ppsm: 3e5, mu: .04, vol: .05, legal: .03, flood: .08, lease: .035 },
  industri: { label: 'Kawasan Industri', cities: ['Cikarang', 'Karawang', 'Sidoarjo', 'Batam'], sqm: [2000, 5000, 10000], ppsm: 2.2e6, mu: .08, vol: .09, legal: .02, flood: .04, lease: .05 },
  komersial: { label: 'Lahan Komersial', cities: ['Jakarta Selatan', 'Surabaya', 'Medan', 'Makassar'], sqm: [300, 500, 800], ppsm: 9e6, mu: .06, vol: .07, legal: .04, flood: .03, lease: .04 },
  wisata: { label: 'Lahan Wisata', cities: ['Labuan Bajo', 'Mandalika', 'Raja Ampat', 'Danau Toba'], sqm: [1000, 2000, 5000], ppsm: 1.5e6, mu: .12, vol: .17, legal: .08, flood: .06, lease: .02 }
};

/* events: outcomes are randomized and can be good OR bad. imp targets: all | sec:X | tk:X | gold | land | prop | bond | crypto | oil | usd | art | rate */
export const EVT = [
  { id: 'pres', kind: 'speech', w: 10, who: ['Presiden', 'Wakil Presiden', 'Menko Perekonomian'], outs: [
    { p: .42, tone: 'up', t: w => `${w} berpidato: percepatan investasi dan izin usaha`, b: 'Pelaku pasar menyambut optimis janji percepatan proyek dan kemudahan izin.', imp: [['all', .012], ['sec:Perbankan', .008], ['land', .01]] },
    { p: .33, tone: 'down', t: w => `${w} berpidato: belanja negara diperketat`, b: 'Investor khawatir pertumbuhan melambat karena pemangkasan anggaran.', imp: [['all', -.015], ['gold', .01], ['prop', -.008]] },
    { p: .25, tone: 'mixed', t: w => `${w} berpidato tanpa arah kebijakan baru`, b: 'Pasar bergerak terbatas dan menunggu aturan pelaksana.', imp: [['all', .002]] }] },
  { id: 'bi', kind: 'speech', w: 8, who: ['Gubernur Bank Sentral'], outs: [
    { p: .4, tone: 'down', t: w => `${w} bernada hawkish: suku bunga bisa naik`, b: 'Bank sentral memberi sinyal pengetatan. Saham tertekan dan imbal obligasi baru naik.', imp: [['all', -.022], ['bond', -.015], ['prop', -.01], ['rate', .25]] },
    { p: .4, tone: 'up', t: w => `${w} bernada dovish: pelonggaran moneter`, b: 'Biaya dana turun sehingga saham, properti, dan obligasi menguat.', imp: [['all', .025], ['bond', .015], ['prop', .012], ['rate', -.25]] },
    { p: .2, tone: 'mixed', t: w => `${w} menahan suku bunga`, b: 'Keputusan sesuai ekspektasi dan pasar bergerak tipis.', imp: [['all', .003]] }] },
  { id: 'fin', kind: 'policy', w: 7, who: ['Menteri Keuangan'], outs: [
    { p: .5, tone: 'up', t: w => `${w} umumkan insentif pajak konsumsi`, b: 'Emiten konsumer dan ritel diuntungkan kenaikan daya beli.', imp: [['sec:Konsumer', .03], ['all', .008]] },
    { p: .5, tone: 'down', t: w => `${w} umumkan tarif pajak baru`, b: 'Beban pelaku usaha naik dan emiten konsumer dan properti tertekan.', imp: [['sec:Konsumer', -.03], ['prop', -.012], ['all', -.006]] }] },
  { id: 'ceo', kind: 'speech', w: 7, who: ['CEO Tesla'], outs: [
    { p: .5, tone: 'up', t: w => `${w} memamerkan teknologi baru di pidato peluncuran`, b: 'Antusiasme ritel mendorong saham teknologi dan kripto.', imp: [['tk:TSLA', .07], ['sec:Teknologi', .02], ['crypto', .03]] },
    { p: .5, tone: 'down', t: w => `${w} memicu kontroversi dalam pidato`, b: 'Pernyataan kontroversial membuat investor menjual saham.', imp: [['tk:TSLA', -.08], ['crypto', -.02]] }] },
  { id: 'ojk', kind: 'policy', w: 6, who: ['Ketua OJK'], outs: [
    { p: .5, tone: 'down', t: w => `${w} umumkan aturan kripto lebih ketat`, b: 'Pelaku pasar melepas aset kripto menjelang aturan baru.', imp: [['crypto', -.09]] },
    { p: .5, tone: 'up', t: w => `${w} beri kepastian hukum untuk aset digital`, b: 'Kepastian regulasi mengundang arus dana baru.', imp: [['crypto', .06], ['sec:Teknologi', .01]] }] },
  { id: 'infl', kind: 'policy', w: 7, who: ['Badan Pusat Statistik'], outs: [
    { p: .5, tone: 'down', t: () => 'Inflasi dirilis lebih tinggi dari perkiraan', b: 'Emas dan tanah dicari sebagai lindung nilai, saham dan obligasi melemah.', imp: [['gold', .035], ['land', .01], ['bond', -.012], ['all', -.012]] },
    { p: .5, tone: 'up', t: () => 'Inflasi dirilis lebih rendah dari perkiraan', b: 'Tekanan harga mereda sehingga ruang pelonggaran terbuka.', imp: [['all', .014], ['bond', .01], ['gold', -.012]] }] },
  { id: 'geo', kind: 'geo', w: 5, who: [''], outs: [
    { p: .6, tone: 'down', t: () => 'Ketegangan geopolitik meningkat', b: 'Harga minyak dan emas naik sementara saham global tertekan.', imp: [['oil', .06], ['gold', .03], ['all', -.025], ['sec:Energi', .02]] },
    { p: .4, tone: 'up', t: () => 'Gencatan senjata disepakati', b: 'Selera risiko pulih. Minyak turun dan saham naik.', imp: [['oil', -.05], ['all', .02], ['gold', -.015]] }] },
  { id: 'disaster', kind: 'disaster', w: 5, who: [''], outs: [
    { p: 1, tone: 'down', t: () => 'Bencana alam melanda kawasan industri', b: 'Distribusi terganggu dan harga lahan di sekitar lokasi tertekan.', imp: [['sec:Logistik', -.03], ['land', -.03], ['prop', -.012], ['all', -.006]] }] },
  { id: 'infra', kind: 'policy', w: 6, who: ['Menteri PUPR'], outs: [
    { p: .75, tone: 'up', t: w => `${w} umumkan proyek tol dan kawasan baru`, b: 'Harga tanah dan properti di koridor proyek naik.', imp: [['land', .05], ['prop', .02], ['sec:Properti', .02], ['sec:Logistik', .015]] },
    { p: .25, tone: 'down', t: w => `${w} menunda proyek infrastruktur`, b: 'Penundaan membuat spekulan tanah melepas kepemilikan.', imp: [['land', -.03], ['sec:Properti', -.02]] }] },
  { id: 'art', kind: 'market', w: 3, who: [''], outs: [
    { p: .5, tone: 'up', t: () => 'Kolektor asing memborong karya seni lokal', b: 'Harga lukisan dan barang koleksi naik tajam.', imp: [['art', .07]] },
    { p: .5, tone: 'down', t: () => 'Skandal pemalsuan karya mengguncang pasar seni', b: 'Kolektor menahan pembelian dan harga koleksi turun.', imp: [['art', -.07]] }] }
];

/* brokers */
export const BROKER_BASE = { id: 'default', name: 'Bursa Dasar', buy: .0015, sell: .0035, min: 0, perk: 'Biaya standar tanpa saldo minimum.' };
export const BROKERS0 = [
  { id: 'nusa', name: 'Nusa Sekuritas', buy: .0011, sell: .0024, min: 10e6, perk: 'Biaya lebih rendah, saldo minimum Rp10 juta.' },
  { id: 'garuda', name: 'Garuda Trade', buy: .0018, sell: .0038, min: 0, perk: 'Riset gratis dan aplikasi cepat.' },
  { id: 'samudra', name: 'Samudra Sekuritas', buy: .0008, sell: .0019, min: 50e6, perk: 'Biaya terendah untuk nasabah prioritas Rp50 juta.' }
];
export const BROKER_NAMES = ['Cakrawala', 'Prima', 'Bumi', 'Surya', 'Karya', 'Mega', 'Tirta', 'Duta', 'Arunika', 'Sentosa'];
export const MYBROKER = { cost: 500e6, minFee: .0008, maxFee: .004, upCost: l => Math.round(50e6 * Math.pow(1.8, l) / 1e6) * 1e6, max: 5 };

/* location choices for branches */
export const BRANCH_CITIES = ['Pusat Kota', 'Kawasan Kampus', 'Dekat Stasiun', 'Perumahan Baru', 'Kawasan Industri', 'Pusat Perbelanjaan'];
