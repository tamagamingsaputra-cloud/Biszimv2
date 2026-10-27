# BizSim — Rancangan UI/UX (Prototype Interaktif)

Prototype UI/UX BizSim berdasarkan Master UI/UX Design System (Navy `#0E2A47`, White `#FFFFFF`, Blue-Gray `#DDE5EC`, Financial Green `#2ECC71`, Financial Red `#E74C3C`). Navigasi global dipertahankan dan ditambah satu menu: Dashboard, **Education**, Asset Market, Investments, Business, Career & Jobs.

Semua angka berasal dari simulation engine yang deterministik (seed + state). UI tidak membuat angka acak, dan tidak ada data harga live. Pendidikan (pendaftaran, biaya, kehadiran, ujian, penilaian, ijazah) diproses dan disimpan di **server**.

## Struktur folder

```
BizSim/
├── README.md
├── docs/DESIGN-SPEC.md         Spesifikasi desain per halaman + sistem pendidikan
├── docs/CREATOR-STUDIO.md      Content Creator Studio: capability matrix, alur, model distribusi, status uji
├── docs/CLOCK-CALENDAR.md      Simulation clock & kalender game: aturan, kecepatan, agenda, uji
├── docs/LIFE-NEEDS.md          Kebutuhan karakter: decay/recovery rate, ambang, dampak, aksi
├── docs/FINANCE.md             Personal finance: bank, kartu, dompet fiktif, checkout, keamanan
├── tests/calendar.test.mjs     Regression test kalender, clock, dan agenda (node tests/calendar.test.mjs)
├── tests/needs.test.mjs        Uji engine kebutuhan karakter
├── tests/finance.test.mjs      Uji API keuangan (server pada port 8791, DB sementara)
├── server/
│   ├── package.json            express + better-sqlite3
│   ├── calendar.cjs            Salinan aturan kalender + validasi jam di save
│   ├── finance.cjs             API keuangan: rekening, kartu, dompet, checkout, transfer, tagihan (SQLite)
│   ├── life-catalog.cjs        Konfigurasi bank, dompet, kartu kredit, merchant, item, ongkir
│   ├── catalog.cjs             Data simulasi pendidikan: institusi, biaya, kurikulum, bank soal, aturan
│   └── server.cjs              API + penyajian file statis dari ../public
└── public/
    ├── index.html              Dashboard (profil biodata, kartu pendidikan)
    ├── education.html          Education (9 halaman lewat hash route)
    ├── market.html  investments.html  business.html  career.html
    ├── studio.html             Content Creator Studio (11 bagian lewat hash route; dibuka dari Career)
    ├── calendar.html           Kalender & jadwal (dibuka dengan mengetuk jam di header)
    ├── life.html               Kehidupan: kebutuhan, makan & minum, istirahat, kesehatan, pesan antar, belanja, transport
    ├── finance.html            Keuangan: ringkasan, rekening, kartu, dompet, top up, transfer, riwayat, tagihan
    └── assets/
        ├── css/bizsim.css
        └── js/
            ├── data/           Katalog market, investasi, bisnis, pekerjaan, peluang pendidikan
            ├── engine/         rng (seeded), market, invest, business, calendar (aturan tanggal & jam), agenda (jadwal dari state), core (state, simulation clock, save ke server)
            │   └── creator/    rules, production, audience, monetization, studio (engine kreator)
            ├── ui/             ui.js, api.js, shell.js (navigasi global), onboarding.js (buat karakter)
            └── pages/          Satu modul per halaman
```

## Menjalankan

```bash
cd BizSim/server
npm install
node server.cjs          # http://localhost:8000
```

Variabel opsional: `PORT` (default 8000), `BIZSIM_DB` (default `server/bizsim.db`). Pemain diidentifikasi lewat header `X-Visitor-Id` (saat hosting) atau `?visitor=<id>` di URL saat uji lokal.

## Alur pemain baru

1. Kunjungan pertama membuka **Buat karakter**: nama, nama panggilan, jenis kelamin, tanggal & tempat lahir (umur 6–7 tahun), kota domisili, latar keluarga, wali. Profil tampil di Dashboard dan bisa diubah lewat tombol **Ubah** (nama, panggilan, jenis kelamin, tanggal & tempat lahir, kota domisili, wali, cita-cita). Latar keluarga dan seed dikunci.
2. Karakter selalu mulai sebagai calon siswa **SD kelas 1**, dengan saldo pribadi Rp 0. Uang saku harian dari wali (Rp 5 rb / 10 rb / 20 rb sesuai latar keluarga; setengahnya bila tidak bersekolah) menjadi penghasilan awal.
3. Education → Katalog → Detail institusi → Pendaftaran (rincian biaya, syarat, dan sumber dana tampil sebelum konfirmasi).
4. Aktivitas belajar, tugas, UTS/UAS, rapor, naik kelas, hingga ijazah SD → lanjut ke SMP → SMA atau SMK → (opsional) D3/S1 atau bekerja.

## Jam & kalender

Satu simulation clock untuk seluruh BizSim: `Tahun · Bulan · Tanggal · jam:menit:detik`, kalender game 12 bulan × 30 hari tanpa kabisat (tidak memakai tanggal perangkat). Kecepatan Lambat / Normal / Cepat / Kilat, jeda, dan lewati hari ada di header. Ketuk jam untuk membuka Kalender (bulanan, jadwal harian, agenda 30 hari, riwayat, aturan waktu). Detail: `docs/CLOCK-CALENDAR.md`.

## Content Creator Studio

Karier kreator opsional (YouTube, TikTok, Instagram versi simulasi; Twitch & Facebook disiapkan sebagai `planned`). Konten diproduksi bertahap memakai waktu luang, energi, skill, alat, dan uang; tayangan dihitung per 30 menit game dan bisa naik, turun, atau naik lagi. Monetisasi tidak aktif otomatis. Detail: `docs/CREATOR-STUDIO.md`.

## Navigasi

Sidebar desktop dikelompokkan (Hidup · Uang & Aset · Karier & Ilmu). Di Android, bottom nav berisi Home, Hidup, Uang, Kalender, dan **Menu** — Menu membuka lembar "Semua fitur" dengan tautan langsung ke setiap bagian (mis. Keuangan → Tagihan Kartu). Setiap modul punya warna aksen sendiri (`data-module` di `<body>`), dengan palet BizSim tetap sebagai dasar.

## Kehidupan & keuangan

Dashboard kini menjadi life hub: profil, jam lengkap, bar 8 kebutuhan tepat di bawah profil, saldo tunai/rekening/dompet/utang, aktivitas berlangsung, aksi cepat (dengan alasan bila tidak bisa), jadwal terdekat, dan notifikasi. Aturan kebutuhan: `docs/LIFE-NEEDS.md`. Keuangan pribadi (server-authoritative): `docs/FINANCE.md`.

## Settings (alat uji)

- **Buat karakter baru** — menghapus karakter & catatan pendidikan pengunjung ini di server.
- **Lewati 7 / 28 hari** — mempercepat waktu untuk QA. Ujian yang terlewat bernilai 0 (tidak ada nilai gratis). Dinonaktifkan selama live.
- **Mode uji usia kreator** — Creator Studio menganggap karakter berusia 18 tahun agar fitur kreator bisa diuji tanpa menunggu bertahun-tahun game. Banner peringatan tampil selama aktif.

## Batasan prototype

- Waktu dipadatkan: 1 periode = 28 hari game, 1 tahun ajaran = 56 hari game = 1 tahun umur.
- State pendidikan **server-authoritative**. State ekonomi (market, investasi, bisnis, karier) masih disimulasikan di klien lalu disimpan ke server (`PUT /api/game`); untuk produksi sebaiknya dipindah ke server.
- SQLite bertahan saat server di-restart, tetapi tidak dijamin bertahan setelah redeploy pada hosting prototype.
- Katalog (institusi, bisnis, pekerjaan, aset) adalah data simulasi; jumlah & nama final harus mengikuti katalog source code BizSim.
- Ijazah adalah dokumen fiktif di dalam game, bukan dokumen resmi.
- Bank, dompet digital, kartu, dan QRIS adalah **simulasi dengan merek fiktif** — tidak terhubung ke layanan pembayaran nyata.
- Usia karakter dimulai 6 tahun: rekening pelajar 6–17, dompet digital 13+, bank umum 17+, kartu kredit 21+.
- Aturan platform kreator (syarat, potongan, konversi koin) adalah aturan simulasi BizSim, bukan persyaratan resmi platform.


## Vercel deployment notes (v7.1.0)

The static frontend is served from `public/`; `/api/*` is routed through `api/[...path].js` to the existing Express API. The API uses `/tmp/bizsim.db` when `VERCEL` is set so the SQLite file is writable inside a function. **This is only a connectivity/runtime adapter: `/tmp` is ephemeral and serverless instances may not share it, so it is not durable player storage.** Do not treat this as production persistence. For persistent player saves on Vercel, migrate the database layer to a managed persistent database before public release.

The avatar picker currently saves locally in the browser and is not synced across devices. The Creator Studio QA age bypass was removed; age eligibility now uses the character's simulated age.

## Database persisten untuk Vercel (v7.1.2)
Vercel Functions tidak boleh memakai file SQLite lokal sebagai penyimpanan progres permanen. Konfigurasikan `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` sebagai Environment Variables server-side di Vercel sebelum deploy. Tanpa keduanya, API sengaja gagal mulai untuk mencegah progres tersimpan pada filesystem sementara. Panduan lengkap: `docs/VERCEL-PERSISTENT-DATABASE-v7.1.2.md`.
