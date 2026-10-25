// CONTENT CREATOR STUDIO — konfigurasi platform, format, topik, peralatan, dan aturan monetisasi.
// Semua angka di sini adalah DATA SIMULASI yang bisa diseimbangkan. Nama platform dipakai sebagai representasi game;
// syarat, tarif, potongan, dan konversi koin BUKAN persyaratan resmi platform mana pun.

export const SIM_REGION = { id: 'ID', name: 'Indonesia (wilayah simulasi)' };
export const DISCLAIMER = 'Nama platform dipakai sebagai representasi game. Semua syarat, tarif, potongan, dan konversi koin adalah aturan simulasi BizSim — bukan persyaratan resmi platform.';

// Tahap produksi. `skill` = skill kreator yang mempercepat & meningkatkan mutu tahap ini.
export const STAGES = [
  { key: 'research', label: 'Ide & riset', status: 'Researching', skill: 'research' },
  { key: 'script', label: 'Naskah / perencanaan', status: 'Scripting', skill: 'storytelling' },
  { key: 'prep', label: 'Persiapan', status: 'Preparing', skill: 'recording' },
  { key: 'record', label: 'Perekaman / pembuatan materi', status: 'Recording', skill: 'recording' },
  { key: 'edit', label: 'Editing', status: 'Editing', skill: 'editing' },
  { key: 'review', label: 'Review & kemasan', status: 'Reviewing', skill: 'marketing' },
];

export const CREATOR_SKILLS = {
  research: { name: 'Research', desc: 'Menemukan ide & data. Mempercepat tahap riset, menaikkan kualitas ide.' },
  storytelling: { name: 'Storytelling', desc: 'Struktur cerita & naskah. Menaikkan retensi.' },
  recording: { name: 'Recording', desc: 'Teknik rekam, framing, audio. Menaikkan kualitas produksi.' },
  editing: { name: 'Editing', desc: 'Potong, ritme, grafis. Mempercepat editing & menaikkan retensi.' },
  presentation: { name: 'Presentation', desc: 'Cara tampil di kamera. Menaikkan engagement.' },
  audience: { name: 'Audience Management', desc: 'Membalas komentar, komunitas. Menurunkan unfollow, menaikkan loyalitas.' },
  live: { name: 'Live Hosting', desc: 'Memandu live. Penonton bertahan lebih lama, chat & dukungan lebih aktif.' },
  marketing: { name: 'Marketing', desc: 'Judul, thumbnail, caption, jadwal. Menaikkan CTR.' },
};

// Topik/niche. audience = ukuran relatif pasar, competition = kepadatan kreator (0–1), complexity = pengali jam riset/naskah,
// cost = pengali biaya produksi, trendVol = volatilitas tren, evergreen = peluang dicari lagi (long tail), brand = nilai sponsor,
// intent = minat beli (afiliasi), fit = kecocokan per platform, rpm = pendapatan iklan simulasi per 1.000 view termonetisasi (Rp).
export const NICHES = [
  { id: 'gaming', name: 'Gaming', audience: 1.3, competition: 0.8, complexity: 1.05, cost: 0.9, trendVol: 0.35, evergreen: 0.35, brand: 0.9, intent: 0.7, share: 0.8, save: 0.3, chat: 1.4, fit: { youtube: 1.15, tiktok: 1.0, instagram: 0.7, twitch: 1.3, facebook: 0.8 }, skill: 'presentation', rpm: [6_000, 13_000] },
  { id: 'edukasi', name: 'Edukasi', audience: 0.9, competition: 0.45, complexity: 1.35, cost: 0.7, trendVol: 0.2, evergreen: 0.9, brand: 1.0, intent: 0.7, share: 1.1, save: 1.7, chat: 0.8, fit: { youtube: 1.2, tiktok: 0.95, instagram: 0.95, twitch: 0.6, facebook: 1.0 }, skill: 'research', rpm: [12_000, 24_000] },
  { id: 'teknologi', name: 'Teknologi', audience: 0.95, competition: 0.65, complexity: 1.3, cost: 1.2, trendVol: 0.3, evergreen: 0.7, brand: 1.3, intent: 1.5, share: 0.9, save: 1.3, chat: 0.9, fit: { youtube: 1.25, tiktok: 0.95, instagram: 0.85, twitch: 0.8, facebook: 0.9 }, skill: 'research', rpm: [14_000, 28_000] },
  { id: 'komedi', name: 'Komedi', audience: 1.4, competition: 0.85, complexity: 1.0, cost: 0.8, trendVol: 0.5, evergreen: 0.2, brand: 0.8, intent: 0.4, share: 1.9, save: 0.3, chat: 1.2, fit: { youtube: 0.9, tiktok: 1.25, instagram: 1.1, twitch: 0.7, facebook: 1.1 }, skill: 'storytelling', rpm: [4_000, 9_000] },
  { id: 'lifestyle', name: 'Lifestyle', audience: 1.1, competition: 0.75, complexity: 0.95, cost: 1.1, trendVol: 0.3, evergreen: 0.4, brand: 1.2, intent: 1.2, share: 0.8, save: 1.1, chat: 1.0, fit: { youtube: 0.9, tiktok: 1.1, instagram: 1.3, twitch: 0.5, facebook: 0.9 }, skill: 'presentation', rpm: [7_000, 14_000] },
  { id: 'bisnis', name: 'Bisnis & keuangan', audience: 0.7, competition: 0.5, complexity: 1.3, cost: 0.8, trendVol: 0.25, evergreen: 0.85, brand: 1.4, intent: 1.0, share: 1.0, save: 1.5, chat: 0.9, fit: { youtube: 1.25, tiktok: 0.9, instagram: 0.9, twitch: 0.5, facebook: 1.1 }, skill: 'research', rpm: [18_000, 35_000] },
  { id: 'musik', name: 'Musik', audience: 1.2, competition: 0.75, complexity: 1.25, cost: 1.3, trendVol: 0.45, evergreen: 0.5, brand: 0.9, intent: 0.6, share: 1.2, save: 0.8, chat: 1.1, fit: { youtube: 1.05, tiktok: 1.2, instagram: 1.0, twitch: 0.9, facebook: 0.9 }, skill: 'recording', rpm: [4_000, 8_000] },
  { id: 'olahraga', name: 'Olahraga', audience: 1.0, competition: 0.6, complexity: 1.05, cost: 1.1, trendVol: 0.45, evergreen: 0.4, brand: 1.1, intent: 0.9, share: 1.1, save: 0.9, chat: 1.2, fit: { youtube: 1.0, tiktok: 1.05, instagram: 1.05, twitch: 0.7, facebook: 1.1 }, skill: 'presentation', rpm: [7_000, 13_000] },
  { id: 'kuliner', name: 'Kuliner', audience: 1.15, competition: 0.7, complexity: 1.0, cost: 1.4, trendVol: 0.3, evergreen: 0.55, brand: 1.1, intent: 1.1, share: 1.1, save: 1.6, chat: 0.9, fit: { youtube: 1.0, tiktok: 1.15, instagram: 1.2, twitch: 0.4, facebook: 1.15 }, skill: 'recording', rpm: [8_000, 15_000] },
  { id: 'kecantikan', name: 'Kecantikan', audience: 1.0, competition: 0.8, complexity: 1.0, cost: 1.2, trendVol: 0.3, evergreen: 0.5, brand: 1.3, intent: 1.6, share: 0.8, save: 1.4, chat: 1.0, fit: { youtube: 0.95, tiktok: 1.1, instagram: 1.3, twitch: 0.4, facebook: 0.8 }, skill: 'presentation', rpm: [9_000, 16_000] },
  { id: 'travel', name: 'Travel', audience: 0.9, competition: 0.6, complexity: 1.25, cost: 2.0, trendVol: 0.3, evergreen: 0.6, brand: 1.2, intent: 0.9, share: 1.0, save: 1.5, chat: 0.8, fit: { youtube: 1.1, tiktok: 1.0, instagram: 1.25, twitch: 0.3, facebook: 1.0 }, skill: 'recording', rpm: [9_000, 17_000] },
];

// Sudut ide. Kecocokan dengan niche memengaruhi kualitas ide (transparan di wizard).
export const ANGLES = [
  { id: 'tutorial', name: 'Tutorial / cara', good: ['edukasi', 'teknologi', 'bisnis', 'kuliner', 'kecantikan', 'musik'], ret: 1.05, share: 0.9, save: 1.4 },
  { id: 'review', name: 'Review / perbandingan', good: ['teknologi', 'gaming', 'kecantikan', 'kuliner', 'travel'], ret: 1.0, share: 0.9, save: 1.2 },
  { id: 'cerita', name: 'Cerita / pengalaman', good: ['lifestyle', 'travel', 'bisnis', 'komedi', 'olahraga'], ret: 1.08, share: 1.1, save: 0.9 },
  { id: 'tantangan', name: 'Tantangan / eksperimen', good: ['gaming', 'komedi', 'kuliner', 'olahraga'], ret: 1.0, share: 1.3, save: 0.6 },
  { id: 'reaksi', name: 'Reaksi / tanggapan tren', good: ['komedi', 'gaming', 'musik', 'lifestyle'], ret: 0.92, share: 1.2, save: 0.5 },
  { id: 'bts', name: 'Behind the scenes', good: ['musik', 'lifestyle', 'kuliner', 'travel'], ret: 0.95, share: 0.8, save: 0.8 },
  { id: 'tips', name: 'Tips cepat / daftar', good: ['edukasi', 'bisnis', 'kecantikan', 'teknologi', 'lifestyle'], ret: 1.0, share: 1.1, save: 1.6 },
];

export const QUALITY = {
  basic: { name: 'Sederhana', hours: 0.65, cost: 0.5, q: 0.78 },
  standard: { name: 'Standar', hours: 1.0, cost: 1.0, q: 1.0 },
  high: { name: 'Tinggi', hours: 1.5, cost: 1.8, q: 1.16 },
  premium: { name: 'Premium', hours: 2.2, cost: 3.2, q: 1.28 },
};
export const BUDGETS = [0, 50_000, 150_000, 500_000, 1_500_000];
export const MUSIC = {
  none: { name: 'Tanpa musik / suara asli', cost: 0, risk: 0, ret: 0.98 },
  library: { name: 'Pustaka bebas royalti (gratis)', cost: 0, risk: 0, ret: 1.0 },
  licensed: { name: 'Musik berlisensi', cost: 75_000, risk: 0, ret: 1.04 },
  unlicensed: { name: 'Lagu populer tanpa lisensi', cost: 0, risk: 1, ret: 1.06 },
};
export const PACKAGING = {
  honest: { name: 'Jujur & jelas', ctr: 1.0, ret: 1.0, trust: 0.4 },
  catchy: { name: 'Menarik', ctr: 1.12, ret: 0.98, trust: 0 },
  clickbait: { name: 'Clickbait berlebihan', ctr: 1.32, ret: 0.8, trust: -1.5 },
};
export const THUMBS = {
  face: { name: 'Wajah + teks singkat', ctr: 1.08 },
  text: { name: 'Teks besar', ctr: 1.0 },
  scene: { name: 'Cuplikan adegan', ctr: 0.96 },
  auto: { name: 'Otomatis (tanpa thumbnail kustom)', ctr: 0.82 },
};
export const OUTSOURCE_EDIT = { name: 'Editor lepas (simulasi)', ratePerHour: 30_000, skill: 55 };

// Pola aktivitas audiens per jam (0–23) — dipakai untuk distribusi tayangan & rekomendasi jam posting.
const curve = a => a;
export const ACTIVITY = {
  youtube: curve([.35, .22, .14, .1, .1, .16, .3, .45, .5, .55, .6, .66, .75, .72, .68, .72, .82, .95, 1.1, 1.32, 1.45, 1.4, 1.1, .7]),
  tiktok: curve([.5, .32, .2, .12, .1, .16, .34, .58, .62, .58, .6, .8, 1.15, 1.05, .78, .74, .86, 1.0, 1.15, 1.35, 1.5, 1.52, 1.3, .9]),
  instagram: curve([.32, .2, .12, .08, .1, .24, .6, 1.05, 1.0, .75, .7, .9, 1.2, 1.0, .74, .7, .82, .98, 1.12, 1.3, 1.36, 1.22, .92, .58]),
  twitch: curve([.7, .5, .3, .2, .15, .15, .2, .25, .3, .35, .4, .45, .55, .55, .6, .65, .75, .9, 1.1, 1.35, 1.6, 1.7, 1.5, 1.1]),
  facebook: curve([.3, .2, .12, .1, .12, .3, .65, .95, 1.0, .9, .85, .95, 1.15, 1.0, .85, .82, .9, 1.0, 1.1, 1.25, 1.3, 1.15, .85, .5]),
};
export const WEEKEND = { youtube: 1.12, tiktok: 1.08, instagram: 1.05, twitch: 1.15, facebook: 1.05 };

// ————————————————————————— PLATFORM CAPABILITY CONFIG —————————————————————————
// Setiap format: kind, durations (detik) atau photos (jumlah), baseHours(spec), weights per tahap, viewRule,
// ctr/ret/eng referensi, followerReach (porsi follower yang melihat), discovery (impresi rekomendasi/hari, akun kecil),
// sensitivity (seberapa keras algoritma merespons sinyal), halfLife (hari), expiresH (konten sementara), monetize.
export const PLATFORMS = {
  youtube: {
    id: 'youtube', name: 'YouTube', simName: 'YouTube (simulasi)', status: 'active', color: '#C4302B', mark: 'YT',
    followerLabel: 'Subscriber', followerShort: 'subs', minAge: 13, handlePrefix: '@',
    desc: 'Video panjang yang dicari & ditonton lama, Shorts, live, dan postingan komunitas. Pertumbuhan lebih lambat tetapi umur konten panjang (long tail pencarian).',
    metricDefs: {
      views: 'Views: penonton yang mengeklik/memutar konten dan menonton melewati ambang minimum simulasi.',
      watch: 'Watch time: total jam tontonan (views × durasi × rata-rata persentase ditonton).',
      avd: 'Average view duration: rata-rata detik yang ditonton per view.',
      retention: 'Retention: rata-rata persentase durasi yang ditonton.',
      subs: 'Subscribers gained: subscriber baru dikurangi yang berhenti berlangganan.',
      revenue: 'Estimated revenue: estimasi iklan & dukungan setelah bagi hasil — belum tentu dibayar.',
    },
    formats: {
      long: { name: 'Video panjang', kind: 'video', durations: [240, 480, 720, 1200, 2400], defDur: 600, optimum: [480, 1200], baseHours: s => 4 + s.dur / 60 * 0.9, baseCost: 60_000,
        weights: { research: 0.15, script: 0.15, prep: 0.08, record: 0.25, edit: 0.32, review: 0.05 }, viewRule: 'click', ctr: 0.055, ret: 0.42, eng: 0.045, followerReach: 0.14, discovery: 55, sensitivity: 0.85, halfLife: 6, tail: 0.05, varSigma: 0.45, follow: 0.006, thumb: true, schedule: true, premiere: true, monetize: ['ads', 'sponsor', 'affiliate'] },
      shorts: { name: 'Shorts', kind: 'video', durations: [15, 30, 45, 60], defDur: 30, optimum: [20, 45], baseHours: s => 1.4 + s.dur / 60 * 1.1, baseCost: 15_000,
        weights: { research: 0.15, script: 0.15, prep: 0.1, record: 0.3, edit: 0.25, review: 0.05 }, viewRule: 'feed', stay: 0.78, ctr: 1, ret: 0.72, eng: 0.035, followerReach: 0.04, discovery: 240, sensitivity: 1.4, halfLife: 1.6, tail: 0.005, varSigma: 0.7, follow: 0.0016, schedule: true, monetize: ['ads_shorts', 'sponsor'] },
      community_text: { name: 'Postingan komunitas (teks)', kind: 'text', baseHours: () => 0.3, baseCost: 0,
        weights: { research: 0.2, script: 0.6, review: 0.2 }, viewRule: 'impr', ctr: 1, ret: 1, eng: 0.06, followerReach: 0.16, discovery: 0, sensitivity: 0.5, halfLife: 0.8, tail: 0, varSigma: 0.3, follow: 0.0002, schedule: true, monetize: [] },
      community_image: { name: 'Postingan komunitas (gambar)', kind: 'image', baseHours: () => 0.8, baseCost: 5_000,
        weights: { research: 0.1, script: 0.3, prep: 0.1, record: 0.3, edit: 0.15, review: 0.05 }, viewRule: 'impr', ctr: 1, ret: 1, eng: 0.07, followerReach: 0.18, discovery: 0, sensitivity: 0.5, halfLife: 0.9, tail: 0, varSigma: 0.3, follow: 0.0003, schedule: true, monetize: [] },
    },
    live: { name: 'Live streaming', minAge: 16, mobileMinFollowers: 50, notifyRate: 0.022, discovery: 0.55, stay: 9, chat: 0.12, like: 0.25, follow: 0.012, supports: ['superchat', 'supersticker', 'membership'], qualities: ['480p', '720p', '1080p'] },
    programs: {
      ads: { name: 'Pendapatan iklan (Program Partner simulasi)', kind: 'ads', review: 3, reqs: [['age', 18], ['followers', 500], ['oneOf', [['watchHours90', 1000], ['shortsViews90', 1_000_000]]], ['noStrikes']] },
      superchat: { name: 'Super Chat & Super Stickers', kind: 'support', reqs: [['program', 'ads'], ['age', 18]] },
      membership: { name: 'Memberships', kind: 'membership', price: 29_000, share: 0.7, reqs: [['program', 'ads'], ['followers', 1000], ['age', 18]] },
      sponsor: { name: 'Sponsorship', kind: 'sponsor', reqs: [['age', 16], ['followers', 300]] },
      affiliate: { name: 'Affiliate (belanja simulasi)', kind: 'affiliate', reqs: [['program', 'ads'], ['followers', 1000]] },
      merch: { name: 'Merchandise', kind: 'merch', reqs: [['program', 'ads'], ['followers', 2000]] },
    },
    support: {
      superchat: { name: 'Super Chat', unit: 'idr', tiers: [15_000, 30_000, 75_000, 150_000, 300_000, 750_000], weights: [40, 28, 16, 9, 5, 2], share: 0.7, rate: 0.0016 },
      supersticker: { name: 'Super Stickers', unit: 'idr', tiers: [10_000, 20_000, 50_000, 100_000], weights: [45, 30, 17, 8], share: 0.7, rate: 0.0011 },
    },
    adsRule: { servedShare: 0.62, shortsRpmFactor: 0.06 },
    payout: { day: 21, min: 500_000, tax: 0.025, method: 'Transfer bulanan (simulasi)', finalize: 'Akhir bulan' },
  },
  tiktok: {
    id: 'tiktok', name: 'TikTok', simName: 'TikTok (simulasi)', status: 'active', color: '#111111', mark: 'TT',
    followerLabel: 'Follower', followerShort: 'followers', minAge: 13, handlePrefix: '@',
    desc: 'Video pendek dengan rekomendasi agresif: bisa naik cepat lalu turun cepat. Foto carousel, Stories, LIVE dengan Gifts setelah syarat terpenuhi.',
    metricDefs: {
      views: 'Video views: setiap kali video mulai diputar di feed (termasuk putar ulang).',
      completion: 'Completion rate: persentase views yang menonton sampai selesai.',
      avgWatch: 'Average watch time: rata-rata detik ditonton per view.',
      shares: 'Shares: jumlah dibagikan.',
      followers: 'Followers gained: follower baru dikurangi unfollow.',
      live: 'Live performance: penonton unik, puncak penonton, dan gifts per sesi LIVE.',
    },
    formats: {
      video: { name: 'Video pendek', kind: 'video', durations: [15, 30, 60, 180], defDur: 30, optimum: [15, 60], baseHours: s => 1.2 + s.dur / 60 * 1.1, baseCost: 15_000,
        weights: { research: 0.15, script: 0.12, prep: 0.1, record: 0.33, edit: 0.25, review: 0.05 }, viewRule: 'feed', stay: 0.92, ctr: 1, ret: 0.55, eng: 0.06, followerReach: 0.07, discovery: 380, sensitivity: 1.65, halfLife: 1.3, tail: 0.002, varSigma: 0.85, follow: 0.0022, hashtags: true, schedule: true, monetize: ['rewards', 'sponsor', 'affiliate'] },
      photo: { name: 'Foto / photo carousel', kind: 'image', photos: [1, 3, 5, 10], defPhotos: 5, baseHours: s => 0.6 + 0.15 * s.photos, baseCost: 8_000,
        weights: { research: 0.15, script: 0.15, prep: 0.15, record: 0.35, edit: 0.15, review: 0.05 }, viewRule: 'feed', stay: 0.85, ctr: 1, ret: 0.6, eng: 0.055, followerReach: 0.07, discovery: 210, sensitivity: 1.3, halfLife: 1.5, tail: 0.002, varSigma: 0.7, follow: 0.0017, hashtags: true, schedule: true, monetize: ['sponsor', 'affiliate'] },
      story: { name: 'Stories (24 jam)', kind: 'story', baseHours: () => 0.25, baseCost: 0,
        weights: { script: 0.2, record: 0.6, review: 0.2 }, viewRule: 'story', ctr: 1, ret: 0.8, eng: 0.03, followerReach: 0.1, discovery: 0, sensitivity: 0.4, halfLife: 0.5, tail: 0, varSigma: 0.25, follow: 0.0001, expiresH: 24, monetize: [] },
    },
    live: { name: 'LIVE', minAge: 18, minFollowers: 1000, notifyRate: 0.03, discovery: 3.4, stay: 1.7, chat: 0.3, like: 2.2, follow: 0.018, supports: ['gifts'], qualities: ['480p', '720p', '1080p'] },
    programs: {
      gifts: { name: 'LIVE Gifts', kind: 'support', reqs: [['age', 18], ['followers', 1000], ['noStrikes']] },
      rewards: { name: 'Program Kreator (simulasi) — video ≥ 1 menit', kind: 'ads', review: 3, reqs: [['age', 18], ['followers', 10_000], ['views30', 100_000], ['noStrikes']] },
      sponsor: { name: 'Kerja sama brand', kind: 'sponsor', reqs: [['age', 16], ['followers', 1000]] },
      affiliate: { name: 'Affiliate toko (simulasi)', kind: 'affiliate', reqs: [['age', 18], ['followers', 1000]] },
    },
    support: {
      gifts: { name: 'LIVE Gifts', unit: 'coin', rate: 0.0024,
        items: [
          { id: 'mawar', name: 'Mawar', coins: 1, w: 46 }, { id: 'jempol', name: 'Jempol', coins: 1, w: 24 }, { id: 'hati', name: 'Hati Jari', coins: 5, w: 14 },
          { id: 'donat', name: 'Donat', coins: 30, w: 8 }, { id: 'topi', name: 'Topi Pesta', coins: 99, w: 5 }, { id: 'planet', name: 'Planet', coins: 500, w: 2.2 }, { id: 'paus', name: 'Paus Raksasa', coins: 2_150, w: 0.8 },
        ],
        coinPrice: 250, diamondPerCoin: 0.5, idrPerDiamond: 75, withdrawMin: 100_000, withdrawFee: 2_500, withdrawDays: 3 },
    },
    adsRule: { rpm: [3_000, 9_000], minDur: 60 },
    payout: { day: 21, min: 200_000, tax: 0.025, method: 'Transfer bulanan (simulasi); diamond gifts ditarik manual', finalize: 'Akhir bulan' },
  },
  instagram: {
    id: 'instagram', name: 'Instagram', simName: 'Instagram (simulasi)', status: 'active', color: '#B4366A', mark: 'IG',
    followerLabel: 'Follower', followerShort: 'followers', minAge: 13, handlePrefix: '@',
    desc: 'Feed foto & carousel untuk follower, Reels untuk jangkauan baru, Stories harian, dan Live. Metrik utama: reach & impressions.',
    metricDefs: {
      reach: 'Reach: jumlah akun unik yang melihat konten.',
      impressions: 'Impressions: total berapa kali konten ditampilkan (satu akun bisa lebih dari sekali).',
      likes: 'Likes: jumlah suka.', saves: 'Saves: jumlah disimpan — sinyal kuat untuk konten bermanfaat.', shares: 'Shares: dibagikan ke DM/Stories.',
      profileVisits: 'Profile visits: kunjungan profil dari konten.', followers: 'Followers gained: follower baru dikurangi unfollow.',
      plays: 'Plays (Reels): berapa kali Reels mulai diputar.',
    },
    formats: {
      photo: { name: 'Feed foto', kind: 'image', photos: [1], defPhotos: 1, baseHours: () => 0.8, baseCost: 10_000,
        weights: { research: 0.1, script: 0.15, prep: 0.2, record: 0.35, edit: 0.15, review: 0.05 }, viewRule: 'reach', freq: 1.3, ctr: 1, ret: 1, eng: 0.06, followerReach: 0.28, discovery: 35, sensitivity: 0.6, halfLife: 1.2, tail: 0.003, varSigma: 0.4, follow: 0.0012, hashtags: true, schedule: true, monetize: ['sponsor', 'affiliate'] },
      carousel: { name: 'Carousel', kind: 'image', photos: [3, 5, 10], defPhotos: 5, baseHours: s => 1 + 0.25 * s.photos, baseCost: 15_000,
        weights: { research: 0.15, script: 0.2, prep: 0.15, record: 0.25, edit: 0.2, review: 0.05 }, viewRule: 'reach', freq: 1.45, ctr: 1, ret: 1, eng: 0.07, followerReach: 0.3, discovery: 60, sensitivity: 0.8, halfLife: 2, tail: 0.004, varSigma: 0.45, follow: 0.0015, hashtags: true, schedule: true, monetize: ['sponsor', 'affiliate'] },
      reels: { name: 'Reels', kind: 'video', durations: [15, 30, 60, 90], defDur: 30, optimum: [15, 60], baseHours: s => 1.4 + s.dur / 60 * 1.1, baseCost: 15_000,
        weights: { research: 0.15, script: 0.12, prep: 0.1, record: 0.33, edit: 0.25, review: 0.05 }, viewRule: 'feed', freq: 1.15, stay: 0.85, ctr: 1, ret: 0.5, eng: 0.05, followerReach: 0.1, discovery: 240, sensitivity: 1.35, halfLife: 2.2, tail: 0.003, varSigma: 0.7, follow: 0.0018, hashtags: true, schedule: true, monetize: ['sponsor', 'affiliate', 'reelGifts'] },
      story: { name: 'Stories (24 jam)', kind: 'story', baseHours: () => 0.25, baseCost: 0,
        weights: { script: 0.2, record: 0.6, review: 0.2 }, viewRule: 'story', freq: 1.1, ctr: 1, ret: 0.8, eng: 0.025, followerReach: 0.15, discovery: 0, sensitivity: 0.4, halfLife: 0.5, tail: 0, varSigma: 0.25, follow: 0.0001, expiresH: 24, monetize: [] },
    },
    live: { name: 'Live', minAge: 16, notifyRate: 0.04, discovery: 0.5, stay: 3.6, chat: 0.2, like: 1.2, follow: 0.014, supports: ['badges'], qualities: ['480p', '720p'] },
    programs: {
      badges: { name: 'Lencana Live (dukungan penonton)', kind: 'support', reqs: [['age', 18], ['followers', 10_000], ['noStrikes']] },
      reelGifts: { name: 'Gifts di Reels', kind: 'support', region: { disabled: ['ID'], reason: 'Tidak diaktifkan pada model wilayah simulasi Indonesia.' }, reqs: [['age', 18], ['followers', 5000]] },
      subscriptions: { name: 'Subscriptions', kind: 'membership', price: 25_000, share: 0.9, reqs: [['age', 18], ['followers', 10_000]] },
      sponsor: { name: 'Brand deals', kind: 'sponsor', reqs: [['age', 16], ['followers', 500]] },
      affiliate: { name: 'Affiliate', kind: 'affiliate', reqs: [['age', 18], ['followers', 1000]] },
    },
    support: {
      badges: { name: 'Lencana', unit: 'idr', tiers: [15_000, 30_000, 75_000], weights: [55, 32, 13], share: 0.9, rate: 0.0012 },
    },
    payout: { day: 21, min: 300_000, tax: 0.025, method: 'Transfer bulanan (simulasi)', finalize: 'Akhir bulan' },
  },
  // Platform tambahan — arsitektur siap, belum diimplementasikan di versi simulasi ini (tidak bisa dipakai).
  twitch: {
    id: 'twitch', name: 'Twitch', simName: 'Twitch (simulasi)', status: 'planned', color: '#6441A5', mark: 'TW', followerLabel: 'Follower', followerShort: 'followers', minAge: 13,
    desc: 'Live-first: Bits, langganan kanal, dan raid. Direncanakan — capability sudah didefinisikan, engine belum diaktifkan.',
    plannedCaps: ['LIVE (utama)', 'Klip pendek', 'Bits (dukungan)', 'Langganan kanal', 'Raid antar kreator'], formats: {}, programs: {}, support: {},
  },
  facebook: {
    id: 'facebook', name: 'Facebook', simName: 'Facebook (simulasi)', status: 'planned', color: '#1F5FA8', mark: 'FB', followerLabel: 'Follower', followerShort: 'followers', minAge: 13,
    desc: 'Video, Reels, Live dengan Stars, dan grup komunitas. Direncanakan — belum diaktifkan.',
    plannedCaps: ['Video', 'Reels', 'Live', 'Stars (dukungan)', 'Grup komunitas'], formats: {}, programs: {}, support: {},
  },
};
export const ACTIVE_PLATFORMS = Object.values(PLATFORMS).filter(p => p.status === 'active').map(p => p.id);

// Kualitas stream: kebutuhan internet & pengali kualitas.
export const STREAM_Q = { '480p': { q: 0.85, need: 1, dataPerHour: 3_000 }, '720p': { q: 1.0, need: 2, dataPerHour: 5_000 }, '1080p': { q: 1.12, need: 3, dataPerHour: 9_000 } };
export const LIVE_ACTIONS = {
  sapa: { name: 'Sapa & jawab chat', cd: 8, dur: 6, effect: { chat: 1.6, stay: 1.15 }, energy: 0.6 },
  follow: { name: 'Ajak follow / subscribe', cd: 12, dur: 5, effect: { follow: 1.8, stay: 0.97 }, energy: 0.3 },
  tantangan: { name: 'Tantangan / mini game', cd: 18, dur: 10, effect: { stay: 1.25, chat: 1.3, gift: 1.3, discovery: 1.15 }, energy: 1.5 },
  goal: { name: 'Pasang target dukungan', cd: 30, dur: 15, effect: { gift: 1.6, stay: 0.98 }, energy: 0.3, trust: -0.2, needsSupport: true },
  segmen: { name: 'Ganti segmen / topik', cd: 15, dur: 8, effect: { discovery: 1.3, stay: 1.05 }, energy: 0.6 },
};

// Peralatan. Efek: rec (kualitas rekam), audio, light, edit (kualitas editing), speed (pengali jam editing), stream (kualitas live),
// net (tingkat internet 1–3), stable (0–1 stabilitas), monthly (biaya langganan/bulan).
export const EQUIPMENT = {
  camera: { name: 'Kamera', items: [
    { id: 'cam_hp', name: 'Kamera HP bawaan', cost: 0, rec: 0.85, stream: 0.85, reliability: 0.97 },
    { id: 'cam_hp2', name: 'HP kamera menengah', cost: 3_200_000, rec: 1.0, stream: 1.0, reliability: 0.985 },
    { id: 'cam_mirrorless', name: 'Kamera mirrorless + lensa kit', cost: 9_500_000, rec: 1.22, stream: 1.12, reliability: 0.99 },
  ] },
  audio: { name: 'Audio', items: [
    { id: 'mic_hp', name: 'Mic bawaan HP', cost: 0, audio: 0.85 },
    { id: 'mic_clip', name: 'Mic clip-on', cost: 250_000, audio: 1.0 },
    { id: 'mic_condenser', name: 'Mic kondensor + interface', cost: 1_400_000, audio: 1.15 },
  ] },
  light: { name: 'Pencahayaan', items: [
    { id: 'light_none', name: 'Cahaya ruangan', cost: 0, light: 0.9 },
    { id: 'light_ring', name: 'Ring light', cost: 180_000, light: 1.0 },
    { id: 'light_softbox', name: 'Softbox 2 titik', cost: 900_000, light: 1.1 },
  ] },
  computer: { name: 'Perangkat editing', items: [
    { id: 'pc_none', name: 'Edit di HP', cost: 0, edit: 0.85, speed: 1.3, pcLive: false },
    { id: 'pc_laptop', name: 'Laptop entry-level', cost: 6_500_000, edit: 1.0, speed: 1.0, pcLive: true },
    { id: 'pc_editing', name: 'PC editing', cost: 15_000_000, edit: 1.15, speed: 0.72, pcLive: true },
  ] },
  internet: { name: 'Internet', items: [
    { id: 'net_data', name: 'Paket data HP', cost: 0, monthly: 0, net: 2, stable: 0.9, dataCost: true },
    { id: 'net_wifi20', name: 'WiFi 20 Mbps', cost: 350_000, monthly: 250_000, net: 3, stable: 0.96 },
    { id: 'net_wifi100', name: 'WiFi 100 Mbps', cost: 350_000, monthly: 450_000, net: 3, stable: 0.995 },
  ] },
  software: { name: 'Software', items: [
    { id: 'sw_free', name: 'Aplikasi edit gratis', cost: 0, monthly: 0, edit: 0.95, speed: 1.05 },
    { id: 'sw_pro', name: 'Software edit berlangganan', cost: 0, monthly: 150_000, edit: 1.08, speed: 0.88 },
  ] },
};
export const DEFAULT_GEAR = { camera: 'cam_hp', audio: 'mic_hp', light: 'light_none', computer: 'pc_none', internet: 'net_data', software: 'sw_free' };

export const TIERS = [
  { id: 'beginner', name: 'Beginner Creator', need: null },
  { id: 'growing', name: 'Growing Creator', need: { followers: 1_000, published: 10 } },
  { id: 'established', name: 'Established Creator', need: { followers: 10_000, income30: 1_000_000, published: 40 } },
  { id: 'professional', name: 'Professional Creator', need: { followers: 100_000, income30: 10_000_000, published: 120 } },
];

// Brand fiktif per niche (untuk penawaran sponsor simulasi).
export const BRANDS = {
  gaming: ['Garuda Gear', 'Liga Nusantara Esports', 'KopiKoding Snack'], edukasi: ['BelajarYuk', 'Pustaka Cerdas', 'Les Kilat'], teknologi: ['Nusa Gadget', 'AwanData Cloud', 'Charger Kilat'],
  komedi: ['Keripik Kriuk', 'Minuman Segar Sore', 'Aplikasi Tawa'], lifestyle: ['Rumah Rapi', 'Batik Kini', 'Parfum Senja'], bisnis: ['DompetKu Bisnis', 'Kasir Mudah', 'Akademi UMKM'],
  musik: ['Senar Jaya', 'Studio Gema', 'Headset Nada'], olahraga: ['Sepatu Lari Kencang', 'Gym Merdeka', 'Isotonik Juara'], kuliner: ['Bumbu Nenek', 'Dapur Kilat', 'Teflon Awet'],
  kecantikan: ['Glow Lokal', 'Serum Embun', 'Sunscreen Tropis'], travel: ['Tiket Nusantara', 'Ransel Petualang', 'Homestay Kita'],
};
export const COLLAB_NAMES = ['Raka Main', 'Dinda Belajar', 'Bang Teknik', 'Lala Lucu', 'Mas Kuliner', 'Kak Fit', 'Nara Nada', 'Si Petualang', 'Ayu Glow', 'Pak Bisnis', 'Tara Gaming', 'Duo Ngakak', 'Rumah Resep', 'Jejak Kaki', 'Kode Kopi'];
export const CHAT_LINES = {
  any: ['halo kak', 'baru join', 'mantap', 'lanjut kak', 'salam dari Pacitan', 'keren', 'wkwk', 'setuju', 'boleh request?', 'suara aman', 'gas terus', 'semangat kak', 'jam berapa live lagi?', 'pertama kali nonton', 'ini live ke berapa?'],
  lag: ['putus-putus kak', 'buffering', 'suara delay'],
  goal: ['dikit lagi targetnya', 'ayo bantu', 'semoga tembus'],
  tantangan: ['ayo bisa', 'seru', 'coba lagi'],
};
export const VIEWER_NAMES = ['dimas', 'sari', 'bagas', 'putri', 'rizky', 'nadia', 'yoga', 'tiara', 'fajar', 'intan', 'arif', 'mega', 'rendi', 'citra', 'galih', 'wulan', 'bima', 'ayu', 'eko', 'laras'];
