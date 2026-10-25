# BizSim — Spesifikasi Desain UI/UX

Dokumen ini menjelaskan rancangan lima halaman utama BizSim: tata letak desktop & mobile, komponen, state, dan cara UI terhubung ke engine. Prototype interaktif ada di folder induk yang sama (`index.html`, `market.html`, `investments.html`, `business.html`, `career.html`).

---

## 1. Prinsip umum

| Prinsip | Penerapan |
|---|---|
| Layout & navigasi asli dipertahankan | Sidebar navy 232px (desktop) dan bottom nav 5 item (mobile ≤860px) dengan urutan Dashboard · Asset Market · Investments · Business · Career & Jobs. Settings ada di bawah sidebar / ikon gear di header mobile. |
| Informasi untuk keputusan | Setiap halaman dibuka dengan ringkasan angka utama, lalu daftar tindakan/opsi. Kartu dekoratif dihindari. |
| Grafik hanya bila datanya ada | `lineChart()` mengembalikan `null` jika data < 2 titik; UI lalu menampilkan pesan "grafik muncul setelah …". Rentang waktu yang datanya belum cukup dinonaktifkan. |
| Tanpa angka fiktif | Pemain baru melihat Rp 0, "—", atau empty state yang menjelaskan cara memulai. Progress bar hanya untuk progres nyata (XP, skill, syarat monetisasi). |
| SIMULATED selalu terlihat | Badge kuning "SIMULATED" ada di topbar setiap halaman, plus penjelasan di halaman yang memuat harga/valuasi. |
| Profit vs loss | Hijau (`--green-ink #1E8E4F` untuk teks, `#2ECC71` aksen) + panah ▲ untuk naik; merah (`--red-ink #B8322A`, `#E74C3C` aksen) + panah ▼ untuk turun. Warna tidak pernah jadi satu-satunya penanda (selalu ada tanda +/− dan panah). |
| Estimasi ≠ realisasi | Nilai estimasi diberi label "estimasi"/"belum direalisasikan"; uang yang sudah masuk kas diberi label "terealisasi". |

### Token desain
- Warna: Navy `#0E2A47` (sidebar, tombol primer), White `#FFFFFF` (panel), Blue-Gray `#DDE5EC` (latar, garis), Green `#2ECC71`, Red `#E74C3C`.
- Border 1px `#D5DEE7`, radius 6px, bayangan sangat tipis. Font sistem (Inter bila tersedia), angka `tabular-nums`.
- Komponen: `panel`, `kpi-strip`, `chip` (pos/neg/warn/info/dark), `btn` (primary/buy/sell/ghost), `seg`, `tabs`, `table`, `msg` (info/ok/warn/error), `empty`, `skel`, `toast`, `dialog`.

### Shell & jam simulasi
Topbar memuat judul halaman, badge SIMULATED, jam simulasi ringkas (`Th 1 · Bln 2 · Tgl 12 · 12:13:01`, tautan ke Kalender), kontrol jeda / Lambat (1m) / Normal (1×) / Cepat (4×) / Kilat (16×) / lewati ke hari berikutnya, dan avatar + saldo. Lihat `docs/CLOCK-CALENDAR.md`. Di mobile, jam dan kontrol pindah ke header navy di atas konten.

---

## 2. Dashboard (`index.html`)

**Desktop:** strip 4 KPI (Saldo personal, Pendapatan harian, Total aset, Utang) → kolom kiri: Langkah berikutnya, Kekayaan bersih (grafik + komposisi), Bisnis yang dimiliki, Investasi & posisi trading → kolom kanan 360px: Pemain (level, XP, reputasi, tanggal simulasi, pendidikan), Progres karier, Arus kas kemarin, Aktivitas terbaru.

**Mobile:** satu kolom; KPI 2×2; urutan: KPI → Langkah berikutnya → Pemain → Karier → grafik → bisnis → investasi → aktivitas.

| Data | Sumber | Empty state pemain baru |
|---|---|---|
| Saldo personal | `S.player.balance` | Rp 0 |
| Pendapatan harian | ledger hari kemarin (gaji, upah, laba bisnis, dividen, sewa, AdSense) + rata-rata 7 hari bila ≥7 hari | "—, tercatat setelah hari pertama selesai" |
| Total aset / utang | `netWorth()` | Rp 0 / "Tidak ada utang aktif" |
| Reputasi, level | `S.player`, `levelInfo()` | Level 1, XP 0/120 |
| Progres karier | `S.career.job`, `promotionStatus()` | "Belum bekerja" + tombol ke Career |
| Bisnis | `S.businesses` (laba kemarin, 7 hari, kumulatif, tren 14 hari) | Empty state + bisnis termurah yang terbuka |
| Investasi & trading | holdings + posisi trading, unrealized P/L | Empty state |
| Aktivitas | log engine | "Belum ada aktivitas" |

**Langkah berikutnya** (maks 4, diurutkan dari engine state): tawaran kerja, undangan evaluasi, belum ada penghasilan → "Ambil shift" kerja lepas (bisa diklik langsung), cari pekerjaan tetap, stok habis/menipis, rugi 7 hari berturut-turut, kekurangan kapasitas, syarat promosi terpenuhi, saldo di bawah cicilan, kas menganggur. Akses cepat: Trading, Bisnis, Lanjut hari.

---

## 3. Asset Market (`market.html`) — trading, SIMULATED

**Desktop:** banner peringatan "harga simulasi, bukan harga pasar nyata" → kiri: daftar aset (BTC, ETH, BBCA, TLKM, BBRI, GOTO) dengan harga & perubahan; tengah: header aset (harga, Δ Rp, Δ %), segmented range **Intraday · 1 Hari · 7 Hari · 30 Hari**, grafik garis, statistik (sentimen, volatilitas terealisasi, volume simulasi, high/low); kanan: panel order BUY/SELL dan kartu posisi; bawah: riwayat transaksi.

**Mobile:** daftar aset jadi chip horizontal; grafik penuh; panel order di bawah grafik.

- Harga dari `marketTick()` (random walk dengan drift, mean-reversion, regime sentimen) yang di-seed `hrand(seed, symbol, tick)`. Setiap tick (30 menit simulasi) grafik bertambah satu titik; hasil identik untuk seed dan state yang sama.
- Range dinonaktifkan dengan tooltip bila data belum cukup (`RANGE_NEEDS`). Warm-up 14 hari disimulasikan saat game baru agar 7 Hari tersedia; 30 Hari aktif setelah datanya ada.
- Panel order: Saldo tersedia, input jumlah (lot untuk saham IDX, unit desimal untuk kripto), harga, biaya transaksi (fee broker/exchange), total; setelah transaksi: average cost, nilai posisi, realized P/L, unrealized P/L.
- **State:** loading (skeleton), empty (belum ada posisi/riwayat), insufficient funds, invalid quantity (≤0, bukan kelipatan lot, melebihi unit dimiliki), transaction success, transaction error (`validateQty`, `tradeQuote`, `trade`).
- Teks halaman menegaskan bahwa trading berbeda dari investasi jangka panjang dan menautkan ke Investments.

---

## 4. Investments (`investments.html`) — jangka panjang

**Desktop:** ringkasan (Nilai saat ini — estimasi, Total modal (harga beli + biaya), Perubahan valuasi — estimasi, Hasil terealisasi — sudah diterima) → tab **Portofolio** + kategori: **Saham & index fund · Emas · Tanah · Properti sewa · Obligasi · Deposito** → tiap tab: tabel instrumen dengan detail khusus kategori + daftar kepemilikan.

**Mobile:** ringkasan 2×2; tab bisa digeser; tabel jadi baris ringkas.

| Kategori | Perilaku valuasi | Detail khusus |
|---|---|---|
| Saham & index fund | Harian, volatilitas sedang, dividen per kuartal | Sektor, dividend yield, expense ratio, lot |
| Emas | Harian, volatilitas rendah, harga buyback 92,5% | Spread beli/buyback, biaya penyimpanan |
| Tanah | Bulanan, apresiasi lambat | Lokasi, luas, PBB, biaya notaris/BPHTB, likuiditas rendah |
| Properti sewa | Bulanan + arus sewa | Sewa/bulan, okupansi, biaya perawatan, pajak |
| Obligasi | Harga % par, kupon bulanan | Kupon, tenor, jatuh tempo, risiko gagal bayar (OBK) |
| Deposito | Tetap, bunga di akhir tenor | Tenor, penalti pencairan awal |

Setiap kepemilikan menampilkan harga beli, jumlah, nilai saat ini (estimasi), perubahan valuasi, biaya, pendapatan diterima, risiko, estimasi periode. Dialog beli menampilkan biaya lengkap dan peringatan "tidak ada jaminan keuntungan"; dialog jual menampilkan hasil bersih setelah biaya dan realized P/L.

---

## 5. Business (`business.html`)

**Tab "Bisnis saya"** (default jika punya bisnis): daftar bisnis di kiri; panel operasional di kanan dengan sub-tab **Ringkasan · Penjualan & Pelanggan · Harga · Stok & Pemasok · Karyawan · Pemasaran · Pengeluaran & Laba/Rugi · Ekspansi**.

**Tab "Katalog bisnis"**: filter (pencarian, kategori, risiko, hanya yang terbuka), grid kartu 3 kolom desktop / 1 kolom mobile. 12 tipe: Warung Harian, Laundry Kiloan, Toko Online, Kedai Kopi, Barbershop, Butik Pakaian, Bengkel Motor, Restoran Keluarga, Minimarket, Digital Agency, Jasa Logistik, Manufaktur Skala Kecil. Setiap kartu: ilustrasi, modal awal, modal kerja, biaya tetap/bln, sewa lokasi, kapasitas, kompleksitas, risiko, jumlah lokasi, dan alasan terkunci bila ada.

**Dialog detail:** ilustrasi, angka biaya, skill & persyaratan (✓/✗ dengan nilai pemain), sumber pendapatan, risiko utama, tabel lokasi (traffic relatif, sewa) → **Simulasi kelayakan** (Monte Carlo 120 skenario × 60 hari dari `feasibility()`): rentang P10–P90 bulan 1 & 2, median, peluang rugi, sebaran, margin, kapasitas, biaya tetap, perkiraan balik modal, daftar asumsi, peringatan "rentang hasil model, bukan janji keuntungan" → **Konfirmasi modal**: rincian modal, opsi pinjaman (bila memenuhi syarat), checkbox persetujuan risiko.

**Operasional:** data dari `simulateBusinessDay()` — permintaan, terjual, permintaan tidak terlayani, pelanggan, rating, stok & pesanan masuk (lead time pemasok), restock manual/otomatis, gaji karyawan, pemasaran harian, laba/rugi harian (bar chart), kumulatif vs modal, upgrade/ekspansi, tutup bisnis (nilai buku).

Status terkunci: level, reputasi, skill, atau modal kurang → kartu redup dengan chip "Terkunci" + alasan pertama dan jumlah alasan lain.

---

## 6. Career & Jobs (`career.html`)

Tab: **Lowongan · Status lamaran · Pekerjaan aktif · Skill & pengalaman · YouTube · side income**. Hash URL (`#applications`, `#active`, `#youtube`) dipakai sebagai deep link dari Dashboard.

### Lowongan
Desktop: tabel dengan Jabatan/perusahaan/jenis, Industri, Gaji + jadwal bayar, Pendidikan, Skill minimum, Pengalaman, Jam/minggu, Persaingan, Peluang diterima. Mobile: kartu per lowongan dengan informasi yang sama. Filter jenis (Kerja lepas/Paruh waktu/Penuh waktu) dan "Hanya yang memenuhi syarat".

- Peluang diterima = **band** (Rendah/Sedang/Tinggi) + rentang perkiraan, dari `acceptanceEstimate()` (persaingan, kecocokan skill, reputasi). Selalu disertai "estimasi, bukan kepastian".
- Belum memenuhi syarat → chip merah + alasan pertama (mis. "Skill teknologi minimal 10 (kamu: 6.0)"); dialog detail menampilkan semua alasan dan tombol lamaran nonaktif.

### Jalur pemain bersaldo nol
Kerja lepas (Bantu Angkut Pasar, Kurir Paket Harian) tidak butuh modal, ijazah, atau lamaran. Tombol "Ambil shift hari ini" memanggil `takeGig()`; upah dibayar saat hari berganti. Batasan nyata ditampilkan: 1 shift/hari, batas pengambilan 15:00, tidak bentrok dengan jam kerja utama.

### Status lamaran
Kartu per lamaran dengan timeline (Dikirim → Ditinjau HR → Evaluasi → Menunggu keputusan → Tawaran / Tidak lolos / Kedaluwarsa). Tombol nyata: "Mulai interview/tes skill" (dialog 3 pertanyaan, skor memengaruhi peluang), "Terima tawaran", "Tolak". Alasan penolakan diambil dari engine.

### Pekerjaan aktif
Upah/gaji, pembayaran berikutnya (paruh waktu: tiap Jumat; penuh waktu: tanggal 25, prorata), jumlah terkumpul periode ini, hari kerja, kinerja rata-rata, jam kerja, skill yang berkembang, Resign. Kolom kanan: **Promosi** (syarat dari `promotionStatus()`; bila terpenuhi, "Ajukan promosi" tetap melalui evaluasi) dan **Pengalaman kerja** per industri. Riwayat pekerjaan sebelumnya ditampilkan di bawah.

### Skill & pengalaman
Bar per skill (0–60), tombol Belajar (gratis, +0,4, 1×/hari) dan Kursus (Rp 350.000, +2,5, 1×/hari), serta lowongan berikutnya yang akan terbuka oleh skill tersebut. Pendidikan saat ini ditampilkan; lowongan D3/S1 tetap terkunci dengan alasan yang jelas.

### Kreator — side income opsional
Bukan bisnis di katalog Business; dikelola di Career karena memakai waktu pemain, bukan modal. Tab **Kreator · side income** menampilkan ringkasan akun dan panel **Waktu minggu ini** (sekolah, pekerjaan utama, kreator, waktu luang), lalu tautan ke **Content Creator Studio** (`studio.html`). Fitur YouTube lama dipindahkan ke Studio; channel, video, dan pendapatan lama dimigrasikan otomatis. Spesifikasi lengkap: `docs/CREATOR-STUDIO.md`.

---

## 7. Integrasi dengan engine BizSim

1. **Katalog**: ganti isi `assets/js/data/*.js` dengan katalog dari source code BizSim (jumlah & nama final bisnis, pekerjaan, aset market, instrumen investasi). UI membaca field yang terdokumentasi di komentar tiap file; field tambahan aman diabaikan.
2. **Engine**: `assets/js/engine/core.js` adalah adaptor. Bila BizSim sudah punya business/market engine, pertahankan engine itu dan petakan fungsinya ke API yang dipakai halaman (`trade`, `tradeQuote`, `validateQty`, `invest`, `divest`, `openBusiness`, `runFeasibility`, `setBizParam`, `restock`, `apply`, `takeGig`, `submitEvaluation`, `acceptOffer`, `promotionStatus`, `study`, `createChannel`, `uploadVideo`, dll.). Alur bisnis yang sudah ada tidak diubah oleh UI.
3. **Event**: halaman berlangganan `on('tick')` (market), `on('day')`, dan `on('change')`. Engine BizSim cukup memancarkan event yang sama saat market tick atau hari baru diterbitkan.
4. **Determinisme**: seluruh keacakan lewat `hrand/hnorm(seed, ...keys)` (hash cyrb53). Render ulang tidak pernah mengubah harga atau hasil.
5. **Save**: state disimpan di server (`GET /api/state`, `PUT /api/game`, debounce 4 detik, langsung saat hari berganti, dan sebelum pindah halaman). Tidak ada `localStorage`.

---

## 8. Aksesibilitas & responsif
- Breakpoint 860px (sidebar → bottom nav) dan 560px (grid 1 kolom).
- Fokus terlihat (`outline 2px`), `aria-pressed` pada segmented control, `role="tab"`/`aria-selected`, `role="progressbar"` pada bar skill, label pada semua input, `aria-label` pada tombol ikon.
- Kontras teks di atas navy dan chip berwarna memenuhi WCAG AA.


---

## 9. Education, Exams & Academic Progression

### Jenjang & jalur
- SD kelas 1–6 → SMP kelas 7–9 → **SMA** kelas 10–12 (Sains/Sosial) **atau SMK** kelas 10–12 (jurusan) → opsional **Politeknik D3** (6 semester) / **Universitas S1** (8 semester).
- Tiap kelas = 2 semester (Ganjil/Genap). Tidak semua pemain wajib kuliah: setelah SMP/SMA/SMK pemain boleh langsung bekerja sesuai syarat usia & pendidikan.
- Karakter baru selalu mulai dari SD. Jenjang berikutnya terkunci sampai ijazah jenjang sebelumnya terbit (validasi di server).

### Halaman (education.html)
| Route | Isi |
|---|---|
| `#overview` | Status, hari periode, kehadiran, tugas, agenda & tindakan, nilai berjalan, biaya & dana, jalur pendidikan |
| `#catalog` | Filter jenjang/kota/biaya, kartu institusi dengan total biaya periode pertama, kualitas, beasiswa, status syarat |
| `#inst/<id>` | Detail institusi: program/jurusan, rincian biaya, syarat, kurikulum |
| `#enroll/<id>` | Pilih program, rincian biaya (pendaftaran, uang pangkal, SPP, buku, transport, ujian, praktikum), potongan/beasiswa, jadwal pembayaran, sumber dana; konfirmasi eksplisit |
| `#timetable` | Jadwal hari ini + kalender 28 hari (hari belajar, UTS, UAS, remedial, rapor) |
| `#subjects` | Mapel & modul materi (terbuka sesuai jadwal), baca materi (12 detik nyata), belajar mandiri (maks 3 jam/hari), tugas |
| `#exam` | Ruang ujian layar penuh: batas waktu, jumlah soal, poin per soal, KKM; pembahasan setelah dikirim |
| `#results` | Proyeksi periode berjalan (bukan final), rapor final, riwayat ujian & tugas |
| `#records` | Ijazah fiktif, riwayat pendidikan, peluang yang terbuka/terkunci |

### Biaya
- Semua biaya ada di `server/catalog.cjs` (data simulasi yang bisa diseimbangkan). Kuota dihitung server (`GET /api/edu/quote/:id`) dan ditampilkan sebelum mendaftar.
- Dana: kontribusi wali per periode (Rp 350 rb / 1,5 jt / 6 jt sesuai latar keluarga) + saldo pribadi. Pembayaran dari saldo pribadi divalidasi terhadap saldo yang tersimpan di server.
- Tidak ada biaya tersembunyi: setiap tagihan tercatat (`payments`), tunggakan tampil di Overview & Dashboard.
- Beasiswa prestasi (rata-rata ≥ 85) dan bantuan keluarga prasejahtera dihitung transparan di rincian.

### Kalender periode (28 hari)
- Hari 1–20 hari sekolah (kehadiran dicatat saat hari berganti; sakit ditentukan seed).
- UTS hari 7–9, UAS hari 18–20, remedial hari 21–24, rapor final hari 25.
- Modul materi terbuka bertahap; soal ujian hanya diambil dari modul yang **sudah diajarkan**.

### Ujian
- 6 soal per ujian, 600 detik, poin per soal ditampilkan. Format pilihan ganda & benar/salah.
- Soal diambil dari bank soal per jenjang × kelas × semester × mapel × modul (tingkat kesulitan ikut modul) dengan seed `charId + periode + mapel + jenis + percobaan` — dapat direproduksi.
- Kunci jawaban tidak pernah dikirim ke klien sebelum jawaban dikumpulkan; penilaian dilakukan di server. Sesi yang ditinggalkan bisa dilanjutkan dalam batas waktu; bila lewat, dinilai dari jawaban tersimpan.
- `GET /api/edu/sample?seed=..&stage=..&grade=..&sem=..&subject=..` mengembalikan sampel soal untuk pengujian reprodusibilitas.

### Penilaian & hasil (aturan transparan)
- Nilai akhir mapel = **50% ujian** (UTS 40% + UAS 60%) + **25% tugas** + **15% penguasaan materi** + **10% kehadiran**.
- Penguasaan dipengaruhi kehadiran, kemampuan (aptitude) karakter, waktu belajar mandiri, dan kualitas institusi.
- KKM 65. Syarat naik: semua mapel ≥ KKM, kehadiran ≥ 75%, tugas dikumpulkan ≥ 70%.
- Hasil: **Naik kelas**, **Remedial** (satu kesempatan, nilai dibatasi KKM), **Tinggal kelas**, **Lulus jenjang**, **Memenuhi syarat jenjang berikutnya** (beberapa institusi punya nilai minimal: SMP Insan 75, SMA Mandiri 80, Politeknik 70, Universitas 75).

### Ijazah (fiktif)
Catatan permanen di server: nama, institusi, jenjang/jurusan, tahun lulus simulasi, nilai akhir, status, ID catatan (`BZS-SD-2026-…`). Ditandai jelas "Dokumen fiktif dalam game BizSim — bukan dokumen resmi".

### Kalender hidup & batas usia
- 1 hari game = 365,25/56 hari kalender hidup; umur dan tahun lulus mengikuti kalender ini.
- Batas usia aktivitas: YouTube 13, kerja lepas 15, paruh waktu 16, kurir/trading/investasi/bisnis 17, penuh waktu 18. Halaman Market/Investments/Business/Career tetap dapat dilihat (mode lihat saja) dengan banner usia.

### API pendidikan
`GET /api/state` · `POST /api/profile` · `PATCH /api/profile` (ubah biodata; tanggal lahir tetap harus memberi usia 6–7 tahun di hari ke-1) · `POST /api/edu/advance` · `GET /api/edu/catalog` · `GET /api/edu/quote/:id` · `POST /api/edu/enroll` · `POST /api/edu/pay` · `POST /api/edu/read` · `POST /api/edu/study` · `POST /api/edu/task/start` · `POST /api/edu/exam/start` · `POST /api/edu/submit` · `GET /api/edu/result/:id` · `GET /api/edu/sample`
