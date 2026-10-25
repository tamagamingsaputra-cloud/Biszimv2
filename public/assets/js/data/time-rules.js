// ATURAN WAKTU HARIAN BIZSIM — jam layanan, jadwal, dan tanggal pembayaran (konfigurasi simulasi, bukan aturan dunia nyata).
// Semua modul membaca jam dari sini; jangan menulis angka jam langsung di UI.

export const TIME_RULES = Object.freeze({
  sleep: { from: 22, to: 6, label: 'Tidur' },                     // produksi konten, live, dan aktivitas pribadi tidak berjalan
  school: { SD: [7, 13], SMP: [7, 13], SMA: [7, 13], SMK: [7, 13], PT: [8, 15], days: 'Senin–Jumat' },
  work: { full: [8, 17], part: [17, 21], days: 'Senin–Jumat' },
  gig: { pickupUntil: 15, start: 8, label: 'Shift lepas' },        // shift lepas hanya bisa diambil sampai 15:00
  freelanceEditor: [8, 20],                                       // editor lepas Creator Studio bekerja 08–20
  pay: { fullDay: 25, fullDays: 22, partWeekday: 5 },             // gaji bulanan tanggal 25 (prorata 22 hari kerja), upah paruh waktu tiap Jumat
  debtDue: 'monthEnd',                                            // cicilan dipotong otomatis di akhir tanggal 30
  rateMeeting: 'monthEnd',                                        // rapat suku bunga simulasi di akhir tanggal 30
  dividendMonths: [3, 6, 9, 12],
});

/** Layanan dan jam operasionalnya — ditampilkan apa adanya di halaman Calendar. */
export const SERVICE_HOURS = Object.freeze([
  { id: 'sekolah', name: 'Sekolah (SD–SMA/SMK)', hours: '07:00–13:00', days: 'Senin–Jumat', rule: 'Kehadiran dicatat server per hari periode.' },
  { id: 'kampus', name: 'Perguruan tinggi', hours: '08:00–15:00', days: 'Senin–Jumat', rule: 'Sama seperti sekolah.' },
  { id: 'kerja-full', name: 'Pekerjaan penuh waktu', hours: '08:00–17:00', days: 'Senin–Jumat', rule: 'Gaji tanggal 25, prorata 22 hari kerja.' },
  { id: 'kerja-part', name: 'Pekerjaan paruh waktu', hours: '17:00–21:00', days: 'Senin–Jumat', rule: 'Upah dibayar setiap Jumat akhir hari.' },
  { id: 'gig', name: 'Pengambilan shift lepas', hours: 'Sampai 15:00', days: 'Setiap hari', rule: 'Satu shift per hari; upah masuk akhir hari.' },
  { id: 'pasar', name: 'Asset Market (simulasi)', hours: '24 jam', days: 'Setiap hari', rule: 'Harga bergerak tiap 30 menit game. Belum ada jam bursa terpisah untuk saham.' },
  { id: 'bisnis', name: 'Operasional bisnis', hours: 'Sepanjang hari', days: 'Setiap hari', rule: 'Penjualan dan biaya dihitung saat pergantian hari.' },
  { id: 'editor', name: 'Editor lepas (Creator Studio)', hours: '08:00–20:00', days: 'Setiap hari', rule: 'Bekerja paralel dengan jadwal karakter.' },
  { id: 'produksi', name: 'Produksi konten & live', hours: '06:00–22:00', days: 'Setiap hari', rule: 'Hanya di luar jam tidur, sekolah, dan kerja.' },
]);

/** Modul yang disebut di spesifikasi waktu tetapi belum ada di BizSim. Ditampilkan agar tidak dianggap sudah berfungsi. */
export const NOT_YET = Object.freeze([
  'Jadwal magang terpisah dari lowongan kerja',
]);
