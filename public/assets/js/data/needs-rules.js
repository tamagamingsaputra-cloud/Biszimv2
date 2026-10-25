// ATURAN KEBUTUHAN KARAKTER (Life Needs) — konfigurasi simulation engine, bukan angka UI.
// Satuan: poin per JAM game. Skala 0–100. Untuk 'stress' nilai tinggi = buruk; untuk yang lain nilai rendah = buruk.
// Kandung kemih (bladder): 100 = nyaman/kosong, turun seiring waktu & bertambah cepat setelah minum.
// State aktivitas: sleep (tidur), school (sekolah), work (kerja), live (siaran langsung), act (aktivitas pribadi), awake (waktu luang).

export const NEEDS = Object.freeze([
  { key: 'hunger', label: 'Lapar', short: 'Makan', invert: false, low: 35, critical: 15,
    rate: { awake: -4.2, sleep: -1.6, school: -4.8, work: -5.4, live: -4.6, act: -3.5 },
    effect: 'Di bawah 35: mood turun & stres naik. Di bawah 15: kesehatan turun 1,5/jam dan performa kerja −10%.' },
  { key: 'thirst', label: 'Haus', short: 'Minum', invert: false, low: 35, critical: 15,
    rate: { awake: -4.5, sleep: -1.8, school: -5.2, work: -5.8, live: -6, act: -4 },
    effect: 'Di bawah 15: kesehatan turun 2,5/jam, energi turun lebih cepat.' },
  { key: 'energy', label: 'Energi', short: 'Energi', invert: false, low: 30, critical: 12,
    rate: { awake: -2.5, sleep: 12, school: -4, work: -5, live: 0, act: -1 },
    effect: 'Di bawah 20: produksi konten berhenti. Di bawah 30: performa kerja −8%, di bawah 12: −20%.' },
  { key: 'hygiene', label: 'Kebersihan', short: 'Bersih', invert: false, low: 35, critical: 15,
    rate: { awake: -2.2, sleep: -0.8, school: -3, work: -3.5, live: -2.5, act: -1.5 },
    effect: 'Di bawah 35: mood turun. Di bawah 15: reputasi kerja & kesehatan turun.' },
  { key: 'health', label: 'Kesehatan', short: 'Sehat', invert: false, low: 40, critical: 20,
    rate: { awake: 0.3, sleep: 0.5, school: 0.2, work: 0.2, live: 0.2, act: 0.3 },
    effect: 'Pulih pelan bila kebutuhan lain terpenuhi. Di bawah 30: performa kerja −15%. Klinik memulihkan lebih cepat.' },
  { key: 'mood', label: 'Mood', short: 'Mood', invert: false, low: 35, critical: 15,
    rate: { awake: 0, sleep: 0, school: 0, work: 0, live: 0, act: 0 }, target: 60, drift: 0.04,
    effect: 'Bergerak ke 60 bila tidak ada gangguan. Turun karena kebutuhan rendah & stres tinggi; naik dengan hiburan dan makan enak.' },
  { key: 'stress', label: 'Stres', short: 'Stres', invert: true, low: 70, critical: 90,
    rate: { awake: 0.3, sleep: -3, school: 1.5, work: 2, live: 1.5, act: -0.5 },
    effect: 'Di atas 70: mood turun & performa −8%. Di atas 90: energi terkuras 1,5× dan performa −18%.' },
  { key: 'bladder', label: 'Kandung kemih', short: 'Toilet', invert: false, low: 30, critical: 10,
    rate: { awake: -6, sleep: -2.2, school: -6, work: -6, live: -6, act: -5 },
    effect: 'Di sekolah/kerja toilet otomatis saat istirahat (≤ 25). Di waktu luang harus ke toilet sendiri; 0 = "kecelakaan" (kebersihan −40, mood −20).' },
]);

export const NEED_RULES = Object.freeze({
  start: { hunger: 80, thirst: 80, energy: 100, hygiene: 85, health: 90, mood: 65, stress: 15, bladder: 90 },
  // dampak antar-kebutuhan (per jam)
  lowPenalty: { mood: -1, stress: 0.5 }, criticalPenalty: { mood: -3, stress: 1.5 },
  healthDamage: { hunger: -1.5, thirst: -2.5, hygiene: -0.4, energy: -0.6, stressHigh: -0.3 },
  stressMoodHigh: -1.5, stressEnergyMult: 1.5, thirstEnergyCritical: -1.5,
  autoToiletAt: 25, wakeToiletAt: 12, accident: { hygiene: -40, mood: -20, stress: 10 },
  // jadwal makan keluarga (otomatis bila diaktifkan & karakter di rumah & tidak sibuk)
  familyMeals: [{ h: 6, m: 30, label: 'Sarapan bersama keluarga' }, { h: 18, m: 30, label: 'Makan malam bersama keluarga' }],
  familyMealFx: { hunger: 45, thirst: 25, mood: 3, bladder: -10 },
  // performa kerja (dirata-rata selama jam kerja/sekolah)
  perf: [
    { key: 'energy', below: 12, f: -0.2 }, { key: 'energy', below: 30, f: -0.08 },
    { key: 'hunger', below: 15, f: -0.1 }, { key: 'thirst', below: 15, f: -0.1 },
    { key: 'health', below: 30, f: -0.15 }, { key: 'hygiene', below: 15, f: -0.05 },
    { key: 'stress', above: 90, f: -0.18 }, { key: 'stress', above: 70, f: -0.08 },
    { key: 'mood', below: 15, f: -0.08 },
  ],
});

// Aksi pribadi (gratis, di rumah). Aksi berbayar memakai merchant di server/life-catalog.cjs.
// min = durasi menit game. need: syarat inventori. fx diterapkan saat aksi SELESAI.
export const HOME_ACTIONS = Object.freeze([
  { id: 'minum', label: 'Minum air (dispenser rumah)', min: 5, fx: { thirst: 30, bladder: -12 }, group: 'makan' },
  { id: 'toilet', label: 'Ke toilet', min: 5, fx: { bladder: 100, hygiene: -2 }, set: { bladder: 100 }, group: 'bersih' },
  { id: 'mandi', label: 'Mandi (pakai sabun & sampo)', min: 20, fx: { hygiene: 70, mood: 4, stress: -3 }, uses: 'toiletries', group: 'bersih' },
  { id: 'mandi-air', label: 'Mandi tanpa sabun', min: 15, fx: { hygiene: 30, mood: 1 }, group: 'bersih' },
  { id: 'istirahat', label: 'Istirahat 30 menit', min: 30, fx: { energy: 6, stress: -6, mood: 1 }, group: 'istirahat' },
  { id: 'tidur-siang', label: 'Tidur siang 2 jam', min: 120, fx: { mood: 2 }, rateState: 'sleep', group: 'istirahat' },
  { id: 'hiburan-rumah', label: 'Main / nonton di rumah 1 jam', min: 60, fx: { mood: 8, stress: -7, energy: -2 }, group: 'istirahat' },
]);
