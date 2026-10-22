/* GENERATED dari netlify/functions/v750-edu-data.mjs. Jangan diedit di sini. Jalankan: npm run sync:local */
// BizSim 7.5.0 — konfigurasi Education (data simulasi yang bisa diseimbangkan; bukan angka acak dari UI).
// Semua nominal Rupiah (IDR). Institusi, ijazah, dan nilai adalah FIKTIF di dalam game.
export const VERSION = '7.5.0';

/* ---------- kalender akademik (hari simulasi; 1 semester = 180 hari = 6 bulan game) ---------- */
export const ACAD = {
  semDays: 180,
  enrollWindow: 13,                 // pendaftaran dibuka pada hari semester 0..13
  midterm: [80, 86],                // UTS (7 hari, termasuk akhir pekan)
  final: [170, 175],                // UAS
  remedial: [176, 178],             // remedial
  closeDay: 179,                    // hari terakhir semester: rapor dibagikan, kenaikan kelas/kelulusan diproses
  noClass: [[80, 86], [170, 179]],  // tidak ada pelajaran reguler pada rentang ini
  examHours: [7, 20],               // ujian bisa diambil pukul 07:00-20:00
  taskEvery: 28, taskDue: 7, taskFrom: 7, taskUntil: 160,
  invoiceDueDays: 14,
  attendanceMin: 0.75,              // syarat kehadiran minimum naik kelas/lulus
  repeatIfFailed: 3,                // >= 3 mapel di bawah KKM setelah remedial = mengulang
  sitMinutesPerQuestion: 3,         // waktu simulasi yang terpakai per soal saat ujian
  secPerQuestion: 90                // batas waktu nyata per soal
};
export const semOf = day => Math.floor((Math.max(1, day) - 1) / ACAD.semDays);
export const semDay = day => (Math.max(1, day) - 1) % ACAD.semDays;
export const semStart = day => semOf(day) * ACAD.semDays + 1;
export const inNoClass = sd => ACAD.noClass.some(([a, b]) => sd >= a && sd <= b);

/* ---------- penilaian (transparan) ---------- */
export const WEIGHTS = { tugas: .2, uts: .3, uas: .4, hadir: .1 };
export const letterOf = sc => sc >= 85 ? 'A' : sc >= 70 ? 'B' : sc >= 55 ? 'C' : sc >= 40 ? 'D' : 'E';
export const pointOf = sc => ({ A: 4, B: 3, C: 2, D: 1, E: 0 })[letterOf(sc)];
export const LEARN = { cls: .9, self: .75, task: 1.2 };   // % progres materi per jam (pada fokus 1, kualitas 1)

/* ---------- jenjang ---------- */
export const LEVELS = {
  SD: { n: 'SD', full: 'Sekolah Dasar', k12: true, first: 1, years: 6, slots: [7, 8, 9, 10, 11], examQ: 10, kkm: 60, selfCap: 4, rank: 1 },
  SMP: { n: 'SMP', full: 'Sekolah Menengah Pertama', k12: true, first: 7, years: 3, slots: [7, 8, 9, 10, 11, 12], examQ: 12, kkm: 70, selfCap: 6, rank: 2 },
  SMA: { n: 'SMA', full: 'Sekolah Menengah Atas', k12: true, first: 10, years: 3, slots: [7, 8, 9, 10, 11, 12, 13], examQ: 15, kkm: 70, selfCap: 8, rank: 3 },
  SMK: { n: 'SMK', full: 'Sekolah Menengah Kejuruan', k12: true, first: 10, years: 3, slots: [7, 8, 9, 10, 11, 12, 13, 14], examQ: 15, kkm: 70, selfCap: 8, rank: 3 },
  UNIV: { n: 'Perguruan Tinggi', full: 'Perguruan Tinggi', k12: false, first: 1, years: 4, slots: [8, 9, 10, 11, 12, 13, 14, 15], slotsKaryawan: [18, 19, 20], examQ: 20, kkm: 60, selfCap: 14, rank: 4 }
};
export const CAREER_LEVEL = { SD: 'SD', SMP: 'SMP', SMA: 'SMA/SMK', SMK: 'SMA/SMK', D3: 'D3', S1: 'S1' };
export const CAREER_ORDER = ['SD', 'SMP', 'SMA/SMK', 'D3', 'S1'];

/* ---------- skenario karakter (aturan awal; tidak semua pemain harus kuliah atau memulai dari SD) ---------- */
export const SCENARIOS = {
  adult: { n: 'Dewasa (lulusan SMA/SMK)', done: ['SD', 'SMP', 'SMA'], gpa: 3.0, note: 'Status awal bawaan BizSim. Bukan ijazah game; dapat langsung bekerja atau kuliah.' },
  sma: { n: 'Pelajar lulusan SMP', done: ['SD', 'SMP'], gpa: 3.0, note: 'Mulai dari jenjang SMA atau SMK.' },
  smp: { n: 'Pelajar lulusan SD', done: ['SD'], gpa: 3.0, note: 'Mulai dari jenjang SMP.' },
  sd: { n: 'Belum bersekolah', done: [], gpa: 3.0, note: 'Mulai dari SD kelas 1.' }
};

/* ---------- jurusan SMK & program studi ---------- */
export const MAJORS = {
  TKJ: { n: 'Teknik Komputer & Jaringan', dasar: 'tkj', prak: 'tkj', cert: 'Kompetensi TKJ' },
  AKL: { n: 'Akuntansi & Keuangan Lembaga', dasar: 'acc', prak: 'acc', cert: 'Kompetensi AKL' },
  BDP: { n: 'Bisnis Daring & Pemasaran', dasar: 'bdp', prak: 'bdp', cert: 'Kompetensi BDP' }
};
const C = (n, set, cr = 3) => ({ n, set, cr });
export const PROGRAMS = {
  'S1-MAN': { n: 'S1 Manajemen', deg: 'S1', terms: 8, labYear: 0, courses: [
    [C('Pengantar Manajemen', 'mgmt'), C('Matematika Bisnis', 'bizmath'), C('Pengantar Akuntansi', 'acc'), C('Bahasa Inggris Akademik', 'eng_sma')],
    [C('Ekonomi Mikro', 'econ_univ'), C('Statistika Bisnis I', 'stat_univ'), C('Akuntansi Biaya', 'acc'), C('Perilaku Organisasi', 'mgmt')],
    [C('Ekonomi Makro', 'econ_univ'), C('Statistika Bisnis II', 'stat_univ'), C('Manajemen Pemasaran', 'mgmt'), C('Matematika Keuangan', 'bizmath')],
    [C('Manajemen SDM', 'mgmt'), C('Manajemen Keuangan I', 'bizmath'), C('Akuntansi Manajemen', 'acc'), C('Teori Ekonomi Lanjut', 'econ_univ')],
    [C('Manajemen Operasi', 'mgmt'), C('Manajemen Keuangan II', 'bizmath'), C('Riset Pemasaran', 'stat_univ'), C('Ekonomi Moneter', 'econ_univ')],
    [C('Manajemen Strategis', 'mgmt'), C('Analisis Laporan Keuangan', 'acc'), C('Kewirausahaan', 'mgmt'), C('Ekonomi Internasional', 'econ_univ')],
    [C('Etika Bisnis', 'mgmt'), C('Studi Kelayakan Bisnis', 'bizmath'), C('Manajemen Risiko', 'econ_univ'), C('Metode Penelitian', 'stat_univ')],
    [C('Seminar Manajemen', 'mgmt'), C('Kebijakan Bisnis', 'mgmt'), C('Investasi & Pasar Modal', 'bizmath'), C('Skripsi (Metodologi)', 'stat_univ')]
  ] },
  'S1-INF': { n: 'S1 Informatika', deg: 'S1', terms: 8, labYear: 1000000, courses: [
    [C('Pengantar Informatika', 'inf_univ'), C('Matematika Diskrit', 'inf_univ'), C('Logika Informatika', 'inf_univ'), C('Bahasa Inggris Teknik', 'eng_sma')],
    [C('Algoritma & Pemrograman I', 'inf_univ'), C('Statistika', 'stat_univ'), C('Organisasi Komputer', 'inf_univ'), C('Sistem Digital', 'inf_univ')],
    [C('Struktur Data', 'inf_univ'), C('Aljabar Linear', 'stat_univ'), C('Basis Data I', 'inf_univ'), C('Jaringan Komputer', 'inf_univ')],
    [C('Algoritma & Pemrograman II', 'inf_univ'), C('Probabilitas', 'stat_univ'), C('Basis Data II', 'inf_univ'), C('Sistem Operasi', 'inf_univ')],
    [C('Rekayasa Perangkat Lunak', 'inf_univ'), C('Analisis Algoritma', 'inf_univ'), C('Pemrograman Web', 'inf_univ'), C('Kecerdasan Buatan Dasar', 'inf_univ')],
    [C('Keamanan Informasi', 'inf_univ'), C('Interaksi Manusia-Komputer', 'inf_univ'), C('Pemrograman Mobile', 'inf_univ'), C('Metode Penelitian', 'stat_univ')],
    [C('Komputasi Awan', 'inf_univ'), C('Manajemen Proyek TI', 'mgmt'), C('Data Mining', 'inf_univ'), C('Etika Profesi', 'mgmt')],
    [C('Seminar Informatika', 'inf_univ'), C('Proyek Akhir I', 'inf_univ'), C('Kewirausahaan Digital', 'mgmt'), C('Skripsi (Metodologi)', 'stat_univ')]
  ] },
  'D3-ADB': { n: 'D3 Administrasi Bisnis', deg: 'D3', terms: 6, labYear: 0, courses: [
    [C('Pengantar Administrasi Bisnis', 'mgmt'), C('Matematika Bisnis', 'bizmath'), C('Dasar Akuntansi', 'acc'), C('Bahasa Inggris Bisnis', 'eng_sma')],
    [C('Korespondensi Bisnis', 'mgmt'), C('Statistika Terapan', 'stat_univ'), C('Akuntansi Perusahaan', 'acc'), C('Ekonomi Mikro', 'econ_univ')],
    [C('Manajemen Perkantoran', 'mgmt'), C('Matematika Keuangan', 'bizmath'), C('Perpajakan Dasar', 'acc'), C('Ekonomi Makro', 'econ_univ')],
    [C('Manajemen Pemasaran', 'mgmt'), C('Manajemen Keuangan', 'bizmath'), C('Hukum Bisnis', 'mgmt'), C('Praktik Administrasi', 'mgmt')],
    [C('Manajemen SDM', 'mgmt'), C('Kewirausahaan', 'mgmt'), C('Analisis Biaya', 'acc'), C('Komunikasi Bisnis', 'mgmt')],
    [C('Praktik Kerja Lapangan', 'mgmt'), C('Etika Bisnis', 'mgmt'), C('Studi Kasus Bisnis', 'bizmath'), C('Tugas Akhir (Metodologi)', 'stat_univ')]
  ] }
};

/* ---------- kurikulum K-12: [id, nama, set bank soal, jam pelajaran/minggu, offset kesulitan] ---------- */
const S = (id, n, set, pr, off = 0) => ({ id, n, set, pr, off });
export const K12 = {
  SD: [S('mat', 'Matematika', 'math_sd', 5), S('ind', 'Bahasa Indonesia', 'ind_sd', 5), S('ipa', 'IPA', 'ipa_sd', 4), S('ips', 'IPS', 'ips_sd', 3), S('pkn', 'PKn', 'pkn_sd', 2), S('ing', 'Bahasa Inggris', 'eng_sd', 2)],
  SMP: [S('mat', 'Matematika', 'math_smp', 5), S('ind', 'Bahasa Indonesia', 'ind_smp', 4), S('ing', 'Bahasa Inggris', 'eng_smp', 4), S('ipa', 'IPA', 'ipa_smp', 5), S('ips', 'IPS', 'ips_smp', 4), S('pkn', 'PKn', 'pkn_smp', 2)],
  SMA: [S('mat', 'Matematika', 'math_sma', 5), S('ind', 'Bahasa Indonesia', 'ind_sma', 4), S('ing', 'Bahasa Inggris', 'eng_sma', 4), S('fis', 'Fisika', 'fis_sma', 4), S('eko', 'Ekonomi', 'eko_sma', 3), S('sej', 'Sejarah', 'sej_sma', 3), S('inf', 'Informatika', 'inf_sma', 3)],
  SMK: [S('mat', 'Matematika Terapan', 'math_smk', 4), S('ind', 'Bahasa Indonesia', 'ind_sma', 3), S('ing', 'Bahasa Inggris', 'eng_sma', 3)]   // + 2 mapel jurusan (lihat subjectsFor)
};
export function subjectsFor(level, en) {
  if (level === 'SMK') { const m = MAJORS[en.major]; return [...K12.SMK, S('dasar', `Dasar ${m.n}`, m.dasar, 6), S('prak', `Praktik ${m.n}`, m.prak, 6, 1)]; }
  if (level === 'UNIV') { const P = PROGRAMS[en.program], row = P.courses[Math.min(P.terms, en.t) - 1]; return row.map((c, i) => S(`c${i + 1}`, c.n, c.set, c.cr)); }
  return K12[level];
}
export const gradeOf = (level, en) => LEVELS[level].k12 ? LEVELS[level].first + Math.floor((en.t - 1) / 2) : null;
export const totalTerms = (level, en) => level === 'UNIV' ? PROGRAMS[en.program].terms : LEVELS[level].years * 2;
export const diffOf = (level, en, off = 0) => { const T = totalTerms(level, en); return Math.max(1, Math.min(3, 1 + Math.floor((en.t - 1) * 3 / T) + off)); };

/* ---------- institusi (biaya, syarat, kualitas) ---------- */
const I = (o) => ({ grad: 0, transport: 0, build: 0, books: 0, lab: 0, exam: 0, entrance: false, entranceFee: 0, minGPA: 0, late: .02, trackFee: 0, scholarEntrance: 0, ...o });
export const INSTITUTIONS = [
  I({ id: 'sd-negeri', grad: 50000, n: 'SD Negeri Harapan Bangsa', level: 'SD', type: 'Negeri', city: 'Jakarta Selatan', q: .70, enroll: 150000, spp: 300000, books: 400000, about: 'Sekolah dasar negeri dengan biaya terjangkau dan kelas besar.' }),
  I({ id: 'sd-swasta', grad: 250000, n: 'SD Swasta Cendekia Mulia', level: 'SD', type: 'Swasta', city: 'Jakarta Selatan', q: .86, enroll: 1500000, build: 3000000, spp: 3000000, books: 1200000, exam: 150000, about: 'Sekolah dasar swasta dengan kelas kecil dan fasilitas lengkap.' }),
  I({ id: 'smp-negeri', grad: 75000, n: 'SMP Negeri 1 Nusantara', level: 'SMP', type: 'Negeri', city: 'Bandung', q: .80, enroll: 250000, spp: 500000, books: 600000, exam: 100000, entrance: true, entranceFee: 50000, minGPA: 2.5, about: 'SMP negeri favorit; seleksi masuk melalui tes.' }),
  I({ id: 'smp-swasta', grad: 300000, n: 'SMP Swasta Bina Insan', level: 'SMP', type: 'Swasta', city: 'Bandung', q: .78, enroll: 2000000, build: 4000000, spp: 3500000, books: 1000000, exam: 200000, minGPA: 2.0, about: 'SMP swasta tanpa tes masuk, syarat nilai minimum.' }),
  I({ id: 'sma-negeri', grad: 100000, n: 'SMA Negeri Bina Bangsa', level: 'SMA', type: 'Negeri', city: 'Jakarta Pusat', q: .85, enroll: 500000, spp: 1000000, books: 750000, entrance: true, entranceFee: 100000, minGPA: 3.0, about: 'SMA negeri unggulan; tes masuk wajib dan GPA minimum 3.0.' }),
  I({ id: 'sma-swasta', grad: 500000, n: 'SMA Swasta Global Harapan', level: 'SMA', type: 'Swasta', city: 'Jakarta Pusat', q: .80, enroll: 3000000, build: 6000000, spp: 5000000, books: 1500000, exam: 400000, transport: 600000, minGPA: 2.0, scholarEntrance: 90, about: 'SMA swasta dengan program akselerasi dan beasiswa masuk.' }),
  I({ id: 'smk-negeri', grad: 150000, n: 'SMK Negeri Global Mandiri', level: 'SMK', type: 'Negeri', city: 'Surabaya', q: .82, enroll: 1000000, spp: 2500000, lab: 1500000, entrance: true, entranceFee: 100000, minGPA: 2.5, majors: ['TKJ', 'AKL'], about: 'SMK teknik negeri dengan laboratorium praktik.' }),
  I({ id: 'smk-swasta', grad: 400000, n: 'SMK Swasta Karya Teknik', level: 'SMK', type: 'Swasta', city: 'Surabaya', q: .75, enroll: 2000000, build: 3000000, spp: 3000000, books: 1000000, lab: 2000000, exam: 250000, minGPA: 2.0, majors: ['TKJ', 'BDP', 'AKL'], about: 'SMK swasta dengan tiga jurusan dan kerja sama industri.' }),
  I({ id: 'univ-negeri', grad: 500000, n: 'Universitas Negeri Nusantara', level: 'UNIV', type: 'Negeri', city: 'Yogyakarta', q: .90, enroll: 1000000, spp: 4000000, books: 1500000, entrance: true, entranceFee: 200000, minGPA: 3.0, programs: ['S1-MAN', 'S1-INF'], about: 'Universitas negeri; seleksi masuk ketat, UKT terjangkau.' }),
  I({ id: 'univ-swasta', grad: 1500000, n: 'Universitas Cipta Karya', level: 'UNIV', type: 'Swasta', city: 'Jakarta Barat', q: .78, enroll: 3000000, build: 10000000, spp: 8000000, books: 2000000, exam: 500000, minGPA: 2.0, programs: ['S1-MAN', 'D3-ADB'], trackFee: .2, scholarEntrance: 90, about: 'Universitas swasta dengan kelas karyawan (malam hari, SPP +20%).' }),
  I({ id: 'poli-negeri', grad: 500000, n: 'Politeknik Negeri Mandala', level: 'UNIV', type: 'Negeri', city: 'Semarang', q: .84, enroll: 1000000, spp: 3000000, books: 1500000, entrance: true, entranceFee: 150000, minGPA: 2.7, programs: ['D3-ADB'], about: 'Politeknik negeri dengan program diploma terapan.' })
];
export const INST = Object.fromEntries(INSTITUTIONS.map(x => [x.id, x]));

/* ---------- beasiswa (otomatis, terlihat di tagihan) ---------- */
export const SCHOLARSHIPS = [
  { id: 'prestasi-a', n: 'Beasiswa Prestasi A', minGPA: 3.7, pct: .5, note: 'GPA semester sebelumnya >= 3,7: potongan 50% SPP.' },
  { id: 'prestasi-b', n: 'Beasiswa Prestasi B', minGPA: 3.4, pct: .25, note: 'GPA semester sebelumnya >= 3,4: potongan 25% SPP.' }
];
export const ENTRANCE = { pass: 60, validDays: 60, retryDays: 14, sec: 90 };
