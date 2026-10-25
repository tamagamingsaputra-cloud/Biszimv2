# BizSim — Simulation Clock & Calendar

Status: **diimplementasikan dan diuji** (uji engine headless + uji browser desktop 1440 px dan emulasi mobile 390 px). Belum diuji di perangkat Android fisik.

## 1. Audit sebelum perubahan

| Temuan | Dampak | Tindakan |
| --- | --- | --- |
| Tanggal game dihitung dari kalender Gregorian (`Date.UTC(2026,0,5)` + hari) | Bulan 28–31 hari, ada tahun kabisat, tanggal bergantung kalender dunia nyata | Diganti kalender fiktif BZC-1 (12 × 30 hari) |
| Jam hanya punya tick 30 menit + menit live (`clock.sub`) | Tidak ada detik; jam di UI melompat 30 menit | Ditambah `clock.sec` (detik di dalam tick) dan loop 10 Hz |
| Lima modul kreator menghitung hari dalam minggu sendiri (`Date.UTC`) | Aturan bisa tidak sinkron | Semua membaca `engine/calendar.js` |
| Jam sekolah/kerja/editor tertulis langsung di kode | Tidak dari konfigurasi | Dipindah ke `data/time-rules.js` |
| Jadwal sekolah engine (Senin–Jumat) berbeda dari server (hari periode 1–20 berurutan) | Produksi konten bisa berjalan di hari sekolah versi server | `scheduleOf` mengikuti hari belajar server |
| Log kejadian akhir hari tercatat di hari berikutnya pukul 00:00 | Riwayat tidak cocok dengan buku besar | Dicatat di hari yang ditutup, "Akhir hari" (24:00) |
| Save lama dari tab lain bisa menimpa progres terbaru | Waktu bisa mundur | Server menolak save yang jamnya lebih lama (HTTP 409) |

## 2. Aturan kalender (BZC-1)

| Aturan | Nilai |
| --- | --- |
| Bulan per tahun | 12 (Bulan 1 … Bulan 12, tanpa nama) |
| Hari per bulan | 30, semua bulan sama |
| Hari per tahun | 360 |
| Tahun kabisat | Tidak ada |
| Minggu | 7 hari, Senin–Minggu; berurutan lintas bulan & tahun |
| Hari pertama | Tahun 1 · Bulan 1 · Tanggal 1 = Senin = hari ke-1 (indeks 0) |
| Satu hari | 24 jam × 60 menit × 60 detik = 86.400 detik |
| Proses engine | Setiap 30 menit game (48 tick/hari) |
| Akhir hari | 23:59:59 → 00:00:00; gaji, cicilan, tagihan, dan tutup buku diproses di sini |
| Pra-simulasi | 14 hari riwayat pasar sebelum Tahun 1 tampil sebagai Tahun 0 |

Format: lengkap `Senin · Tahun 1 · Bulan 2 · Tanggal 12 · 12:13:01` (halaman Kalender), ringkas `Th 1 · Bln 2 · Tgl 12 · 12:13:01` (header di semua halaman). Grafik memakai `12/2`.

Usia karakter tetap memakai **skala hidup dipercepat** dari aturan pendidikan EDU-1.0 (56 hari kalender = +1 tahun usia). Ini aturan usia, bukan panjang tahun kalender, dan ditulis apa adanya di halaman Kalender.

## 3. Simulation clock

- State: `S.clock.g` (jumlah tick 30 menit sejak awal dunia) dan `S.clock.sec` (detik game di dalam tick). Jam, menit, dan detik selalu dihitung dari dua nilai ini.
- Loop terpusat (`engine/core.js`) berjalan 10×/detik: ukur waktu nyata yang berlalu × kecepatan → `advanceSeconds()`. Setiap batas 1.800 detik menjalankan `tick()`. Selama live, setiap batas menit menjalankan satu langkah live.
- UI hanya mendengarkan event `clock` dan mengganti teks; tidak ada jam yang dibuat di UI.
- Langkah per frame dibatasi 1 detik nyata. Jika tab tidak aktif atau aplikasi ditutup, waktu game tidak mengejar waktu nyata.
- Posisi jam (sampai detik) ikut tersimpan di server minimal tiap 10 detik nyata dan saat jeda.

| Mode | 1 detik nyata | 1 hari game |
| --- | --- | --- |
| Lambat | 1 menit game | ±24 menit nyata |
| Normal (tempo lama BizSim) | 12 menit game | 2 menit nyata |
| Cepat | 48 menit game | 30 detik nyata |
| Kilat | 3 jam 12 menit game | 7,5 detik nyata |
| Saat live | kecepatan ÷ 12, minimal 1 menit game | — |

Save lama otomatis dimigrasikan: `sec = sub × 60`, kecepatan 1×/4×/16× menjadi Normal/Cepat/Kilat.

## 4. Server

- `server/calendar.cjs`: salinan aturan kalender + `readClock()` untuk memvalidasi jam di save.
- `GET /api/calendar`: aturan kalender untuk klien lain.
- `PUT /api/game`: menolak jam tidak valid (400) dan jam yang lebih lama dari yang tersimpan untuk karakter & dunia yang sama (409, `code: "stale"`). Klien menghentikan jam lokal dan menampilkan banner "Muat ulang".

## 5. Halaman Kalender (`calendar.html`)

Dibuka dengan mengetuk jam di header (desktop dan mobile). Navigasi global tidak diubah.

| Bagian | Sumber data |
| --- | --- |
| Jam simulasi, jeda, kecepatan, lewati hari, progres ke proses engine berikutnya | `clockNow()`, `S.clock.sec` |
| Kalender bulanan (penanda per kategori, tenggat, arus kas hari lewat) | `agenda.eventsBetween()`, buku besar `S.ledger` |
| Jadwal harian (tidur, sekolah, kerja, live, waktu luang) + penanda jam sekarang | `agenda.dayPlan()` ← `scheduleOf()` + `TIME_RULES` |
| Agenda 30 hari + filter + ringkasan masuk/keluar (terjadwal vs estimasi dipisah) | `agenda.eventsBetween()` |
| Riwayat kejadian per tanggal | `S.activity` (150 catatan terakhir) + `S.ledger` (180 hari) |
| Aturan waktu, jam layanan, tanggal penting, modul yang belum ada | `CALENDAR`, `SPEEDS`, `SERVICE_HOURS`, `NOT_YET` |

Sumber event agenda: gaji penuh waktu (tanggal 25, prorata), upah paruh waktu (Jumat), upah shift lepas, tenggat interview/tes/tawaran kerja, keputusan lamaran, jendela UTS/UAS/remedial, tenggat tugas, tagihan sekolah, rapor, periode berikutnya, cicilan (tanggal 30), langganan alat kreator, rapat suku bunga, jatuh tempo deposito/obligasi, kupon, sewa, PBB, dividen, penjualan aset, kiriman stok bisnis, konten & live terjadwal, perkiraan produksi selesai, pembayaran platform (tanggal 21), dan penarikan diamond.

Kepastian: **Terjadwal** (pasti terjadi bila state tidak berubah), **Estimasi** (nominal/hasil bisa berbeda), **Tenggat** (batas aksi pemain).

Pengingat: tagihan dan tenggat untuk hari ini dan besok dicatat sekali ke log aktivitas (tersimpan di save server) dan tampil sebagai notifikasi. Bisa dimatikan di tab Aturan waktu.

## 6. Pengujian

`node tests/calendar.test.mjs` — 23 uji, semuanya lulus:

- Aturan server = aturan klien; hari pertama; pergantian bulan (Tgl 30 → Bulan berikutnya Tgl 1); pergantian tahun; tanpa kabisat (8 tahun berturut-turut × 360 hari); round-trip tanggal; minggu berurutan lintas bulan/tahun; Tahun 0; format `12:13:01`; validasi jam server.
- Clock: detik maju tepat; tick tiap 1.800 detik; pergantian hari memproses akhir hari; pergantian bulan dan tahun lewat engine; kecepatan hanya dari konfigurasi; jeda; detik tersimpan; migrasi save lama.
- Agenda = realisasi: tanggal & nominal gaji bulanan, cicilan tanggal 30, jatuh tempo deposito (nominal sama dengan pencairan); jadwal harian menutup 24 jam; riwayat terbaca.
- Live: 10 menit game maju tepat 600 detik pada laju 60 detik/detik; live berakhir sesuai durasi; kecepatan normal kembali.

Uji browser (Playwright, 1440 px dan 390 px), semuanya tanpa error konsol:

- Normal 2 detik nyata = 1.440 detik game; Lambat 3 detik = 180 detik game; jeda menghentikan jam; reload setelah jeda kembali ke detik yang sama.
- Lewati hari → `00:00:00` hari berikutnya; pilih tanggal di grid; semua tab tampil tanpa overflow horizontal.
- Agenda dengan data SD + utang + pekerjaan paruh waktu (seed QA); pengingat H-1 tercatat.
- Dua tab: tab yang tertinggal ditolak server (409), banner tampil, reload melanjutkan dari save terbaru.
- Regression: semua halaman lama + Creator Studio (alur produksi, live, money) lulus.

## 7. Batasan

- Clock berjalan di browser; server memvalidasi dan menyimpan, tetapi belum menjadi pemilik jam (bukan server-authoritative).
- Waktu tidak berjalan saat aplikasi ditutup (pilihan desain, bukan sinkronisasi waktu nyata).
- Saham dan aset lain diperdagangkan 24 jam; belum ada jam bursa terpisah.
- Pesan makanan, kartu kredit, dan magang belum ada di BizSim, sehingga tidak muncul di kalender.
- Riwayat dibatasi 150 catatan aktivitas terakhir.
