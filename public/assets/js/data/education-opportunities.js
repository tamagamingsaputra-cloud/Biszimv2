// Peluang yang dibuka oleh pendidikan (SIMULATED). Hanya menunjukkan syarat — bukan tawaran atau jaminan diterima.
export const OPPORTUNITIES = [
  { id: 'mg-web', kind: 'Magang', title: 'Magang Junior Web (simulasi)', org: 'Studio Digital Pacitan', need: { stage: 'SMK', program: 'Rekayasa Perangkat Lunak', minGrade: 70, age: 16 }, note: 'Dibuka untuk siswa/lulusan SMK RPL. Seleksi tetap melalui evaluasi di Career & Jobs.' },
  { id: 'mg-akun', kind: 'Magang', title: 'Magang Administrasi Keuangan (simulasi)', org: 'KSP Sejahtera Bersama', need: { stage: 'SMK', program: 'Akuntansi', minGrade: 70, age: 16 }, note: 'Untuk jurusan Akuntansi. Fokus pencatatan kas dan rekonsiliasi.' },
  { id: 'mg-oto', kind: 'Magang', title: 'Magang Bengkel Resmi (simulasi)', org: 'Bengkel Maju Motor', need: { stage: 'SMK', program: 'Teknik Otomotif', minGrade: 68, age: 16 }, note: 'Untuk jurusan Teknik Otomotif. Wajib APD dan pendamping.' },
  { id: 'sf-office', kind: 'Sertifikasi', title: 'Sertifikasi Aplikasi Perkantoran (simulasi)', org: 'Lembaga Uji BizSim', need: { stage: 'SMP', minGrade: 0, age: 13 }, note: 'Ujian keterampilan dasar dokumen & spreadsheet.' },
  { id: 'sf-akun', kind: 'Sertifikasi', title: 'Sertifikasi Teknisi Akuntansi Dasar (simulasi)', org: 'Lembaga Uji BizSim', need: { stage: ['SMK', 'SMA'], minGrade: 75, age: 17 }, note: 'Membuka lowongan administrasi keuangan tertentu.' },
  { id: 'sf-prog', kind: 'Sertifikasi', title: 'Sertifikasi Pemrograman Junior (simulasi)', org: 'Lembaga Uji BizSim', need: { stage: ['SMK', 'PT'], minGrade: 75, age: 17 }, note: 'Relevan untuk Junior Developer di Career & Jobs.' },
  { id: 'mg-kampus', kind: 'Program kampus', title: 'Program Magang Kampus (simulasi)', org: 'Politeknik/Universitas', need: { stage: 'PT', minGrade: 70, age: 18 }, note: 'Tersedia saat kuliah semester 5 ke atas.' },
];
