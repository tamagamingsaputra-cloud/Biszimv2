// JOB CATALOG — sumber data halaman Career & Jobs (SIMULATED).
// type: 'gig' (kerja lepas, tanpa lamaran, dibayar hari itu) | 'part' | 'full'
// pay: gig = per shift, part = per shift (dibayar mingguan, Jumat), full = per bulan (dibayar tanggal 25)
// evaluation: 'none' | 'interview' | 'skilltest'
export const EDUCATION_LEVELS = ['Tidak ada', 'SD', 'SMP', 'SMA/SMK', 'D3', 'S1'];

export const SKILLS = {
  komunikasi: 'Komunikasi', penjualan: 'Penjualan', manajemen: 'Manajemen', keuangan: 'Keuangan',
  teknologi: 'Teknologi', kreativitas: 'Kreativitas', teknis: 'Teknis/Mekanik',
};

export const JOB_CATALOG = [
  // ——— Jalur pemula: tidak butuh modal, tidak butuh pengalaman ———
  { id: 'gig-angkut', title: 'Bantu Angkut Pasar', company: 'Pasar Minulyo (lepas)', industry: 'Ritel', type: 'gig',
    pay: 85_000, hoursPerWeek: 0, shiftHours: 7, education: 'Tidak ada', skills: {}, expDays: 0, competition: 'Rendah', evaluation: 'none',
    gain: { teknis: 0.3, komunikasi: 0.1 }, desc: 'Kerja lepas harian. Tidak perlu melamar — ambil shift dan dibayar di akhir hari.' },
  { id: 'gig-kurir', title: 'Kurir Paket Harian', company: 'Mitra Antar Kilat (lepas)', industry: 'Logistik', type: 'gig',
    pay: 110_000, hoursPerWeek: 0, shiftHours: 8, education: 'Tidak ada', skills: { teknis: 3 }, expDays: 0, competition: 'Rendah', evaluation: 'none',
    gain: { teknis: 0.3, komunikasi: 0.15 }, desc: 'Kerja lepas harian dengan motor pinjaman mitra. Butuh skill teknis dasar.' },

  // ——— Paruh waktu ———
  { id: 'pt-pelayan', title: 'Pelayan Kafe (Paruh Waktu)', company: 'Kopi Senja', industry: 'F&B', type: 'part',
    pay: 95_000, hoursPerWeek: 25, shiftHours: 5, education: 'SMP', skills: { komunikasi: 8 }, expDays: 0, competition: 'Rendah', evaluation: 'interview',
    gain: { komunikasi: 0.35, penjualan: 0.15 }, promoTo: 'ft-barista', desc: 'Shift sore 5 hari/minggu. Dibayar mingguan setiap Jumat.' },
  { id: 'pt-kasir', title: 'Kasir Minimarket', company: 'Indomart Sejahtera (fiktif)', industry: 'Ritel', type: 'part',
    pay: 105_000, hoursPerWeek: 30, shiftHours: 6, education: 'SMA/SMK', skills: { komunikasi: 6, keuangan: 4 }, expDays: 0, competition: 'Sedang', evaluation: 'skilltest',
    gain: { keuangan: 0.25, penjualan: 0.2 }, promoTo: 'ft-supervisor', desc: 'Shift bergilir. Tes hitung sederhana saat seleksi.' },

  // ——— Penuh waktu ———
  { id: 'ft-admin', title: 'Admin Staff', company: 'CV Maju Bersama', industry: 'Administrasi', type: 'full',
    pay: 3_200_000, hoursPerWeek: 40, education: 'SMA/SMK', skills: { teknologi: 10, komunikasi: 8 }, expDays: 0, competition: 'Tinggi', evaluation: 'skilltest',
    gain: { teknologi: 0.25, manajemen: 0.15 }, promoTo: 'ft-admin-sr', desc: 'Senin–Jumat 08.00–17.00. Gaji dibayar tanggal 25.' },
  { id: 'ft-barista', title: 'Barista', company: 'Kopi Senja', industry: 'F&B', type: 'full',
    pay: 3_000_000, hoursPerWeek: 45, education: 'SMP', skills: { komunikasi: 14, kreativitas: 8 }, expDays: 20, expIndustry: 'F&B', competition: 'Sedang', evaluation: 'interview',
    gain: { kreativitas: 0.25, manajemen: 0.15 }, desc: 'Membutuhkan pengalaman F&B. Jalur promosi dari Pelayan Kafe.' },
  { id: 'ft-supervisor', title: 'Supervisor Toko', company: 'Indomart Sejahtera (fiktif)', industry: 'Ritel', type: 'full',
    pay: 4_300_000, hoursPerWeek: 45, education: 'SMA/SMK', skills: { manajemen: 15, keuangan: 10 }, expDays: 45, expIndustry: 'Ritel', competition: 'Sedang', evaluation: 'interview',
    gain: { manajemen: 0.35, keuangan: 0.2 }, desc: 'Memimpin 4–6 kru toko. Butuh pengalaman ritel.' },
  { id: 'ft-sales', title: 'Sales Lapangan', company: 'PT Distribusi Nusantara (fiktif)', industry: 'Distribusi', type: 'full',
    pay: 3_500_000, hoursPerWeek: 45, education: 'SMA/SMK', skills: { komunikasi: 12, penjualan: 10 }, expDays: 0, competition: 'Sedang', evaluation: 'interview',
    gain: { penjualan: 0.4, komunikasi: 0.2 }, desc: 'Gaji pokok + insentif target (insentif belum dihitung dalam simulasi ini).' },
  { id: 'ft-admin-sr', title: 'Senior Admin', company: 'CV Maju Bersama', industry: 'Administrasi', type: 'full',
    pay: 4_600_000, hoursPerWeek: 40, education: 'SMA/SMK', skills: { teknologi: 18, manajemen: 12 }, expDays: 90, expIndustry: 'Administrasi', competition: 'Sedang', evaluation: 'interview',
    gain: { manajemen: 0.3, keuangan: 0.15 }, desc: 'Promosi internal dari Admin Staff.' },
  { id: 'ft-jrdev', title: 'Junior Developer', company: 'Startup Lokal (fiktif)', industry: 'Teknologi', type: 'full',
    pay: 6_500_000, hoursPerWeek: 40, education: 'D3', skills: { teknologi: 30 }, expDays: 0, competition: 'Tinggi', evaluation: 'skilltest',
    gain: { teknologi: 0.45 }, promoTo: 'ft-dev', desc: 'Remote-friendly. Tes teknis wajib.' },
  { id: 'ft-dev', title: 'Software Engineer', company: 'Startup Lokal (fiktif)', industry: 'Teknologi', type: 'full',
    pay: 11_000_000, hoursPerWeek: 40, education: 'D3', skills: { teknologi: 45, komunikasi: 15 }, expDays: 180, expIndustry: 'Teknologi', competition: 'Tinggi', evaluation: 'interview',
    gain: { teknologi: 0.35, manajemen: 0.15 }, desc: 'Promosi dari Junior Developer.' },
  { id: 'ft-akuntan', title: 'Staf Akuntansi', company: 'KAP Wijaya & Rekan (fiktif)', industry: 'Keuangan', type: 'full',
    pay: 5_200_000, hoursPerWeek: 42, education: 'S1', skills: { keuangan: 25 }, expDays: 0, competition: 'Tinggi', evaluation: 'skilltest',
    gain: { keuangan: 0.45 }, desc: 'Membutuhkan ijazah S1.' },
  { id: 'ft-mktmgr', title: 'Marketing Manager', company: 'PT Rasa Nusantara (fiktif)', industry: 'Pemasaran', type: 'full',
    pay: 14_000_000, hoursPerWeek: 45, education: 'S1', skills: { penjualan: 40, manajemen: 35, kreativitas: 25 }, expDays: 360, competition: 'Tinggi', evaluation: 'interview',
    gain: { manajemen: 0.3, penjualan: 0.2 }, desc: 'Posisi senior. Butuh pengalaman kerja ≥ 1 tahun simulasi.' },
];

// Pertanyaan evaluasi sederhana (dipakai untuk interview / skill test).
export const EVALUATIONS = {
  interview: [
    { q: 'Pelanggan komplain pesanannya terlambat. Apa respons pertamamu?', a: ['Minta maaf, cek status, beri estimasi jelas', 'Menjelaskan bahwa itu bukan salahmu', 'Langsung memberi diskon besar'], correct: 0, skill: 'komunikasi' },
    { q: 'Atasan memberi dua tugas mendesak bersamaan. Apa yang kamu lakukan?', a: ['Kerjakan yang paling mudah dulu', 'Klarifikasi prioritas lalu kerjakan berurutan', 'Kerjakan keduanya setengah-setengah'], correct: 1, skill: 'manajemen' },
    { q: 'Mengapa kamu tertarik dengan posisi ini?', a: ['Hanya karena gaji', 'Sesuai skill dan ingin berkembang di industri ini', 'Tidak ada pilihan lain'], correct: 1, skill: 'komunikasi' },
  ],
  skilltest: [
    { q: 'Harga barang Rp 48.000, diskon 25%. Berapa yang dibayar?', a: ['Rp 36.000', 'Rp 38.000', 'Rp 12.000'], correct: 0, skill: 'keuangan' },
    { q: 'File laporan harus dibagikan ke 5 rekan dan bisa diedit bersama. Cara terbaik?', a: ['Kirim 5 lampiran email terpisah', 'Gunakan dokumen bersama di cloud dengan akses edit', 'Cetak dan bagikan'], correct: 1, skill: 'teknologi' },
    { q: 'Stok awal 120, terjual 45, masuk 30. Stok akhir?', a: ['105', '95', '135'], correct: 0, skill: 'keuangan' },
  ],
};

export const YOUTUBE = {
  niches: [
    { id: 'edukasi', name: 'Edukasi Keuangan', rpm: [14_000, 26_000], growth: 0.9, skill: 'keuangan' },
    { id: 'gaming',  name: 'Gaming',           rpm: [5_000, 11_000],  growth: 1.25, skill: 'kreativitas' },
    { id: 'kuliner', name: 'Kuliner',          rpm: [8_000, 15_000],  growth: 1.05, skill: 'kreativitas' },
    { id: 'tekno',   name: 'Teknologi',        rpm: [12_000, 22_000], growth: 1.0, skill: 'teknologi' },
  ],
  gear: [
    { level: 0, name: 'Smartphone pribadi', cost: 0, quality: 1.0 },
    { level: 1, name: 'Mic + lampu ring', cost: 850_000, quality: 1.25 },
    { level: 2, name: 'Kamera mirrorless + editing', cost: 9_500_000, quality: 1.6 },
  ],
  hoursPerVideo: 8,
  weeklyHoursBudget: 70,        // jam bangun per minggu yang bisa dibagi antara kerja & aktivitas lain (simulasi)
  monetize: { subs: 1000, watchHours: 4000 },
};
