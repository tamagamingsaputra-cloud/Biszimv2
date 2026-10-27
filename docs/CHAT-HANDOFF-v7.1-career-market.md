# BizSim v7.1 — Handoff pembaruan Career Market

## Baseline
- Sumber: `Biszimv2-main` dari ZIP BizSim v7.1 yang diberikan pengguna (25 Oktober 2026).
- Hosting yang ditetapkan pengguna: Vercel saja.
- Strategi perubahan: integrasi minimal; tidak mengganti framework atau menulis ulang engine utama.

## Perubahan dalam paket ini
- Menambahkan modul `public/assets/js/engine/job-market.js` untuk rotasi lowongan mingguan yang deterministik dari seed karakter dan hari simulasi.
- Lowongan kerja lepas, program magang, pekerjaan aktif, dan lamaran aktif tetap tersedia saat rotasi.
- Menambahkan dua program magang yang memakai pipeline lamaran/evaluasi serta sistem pembayaran paruh waktu yang sudah ada.
- Menambahkan tab Magang dan tautan navigasi ke Magang, Pekerjaan & Payroll, dan Toko & Inventaris (fitur Belanja/Inventaris yang sudah ada).
- API client menggunakan ID pengunjung stabil di `localStorage` agar identitas baru tidak berubah pada reload/perpindahan halaman.
- `/api/health` memberi peringatan jujur bahwa file SQLite lokal tidak dijamin persisten pada Vercel; `BIZSIM_DB` hanya menentukan path file, bukan layanan database persisten.
- Memperbarui tes UI agar memeriksa token warna aktual yang digunakan stylesheet.

## Sistem yang dipertahankan
- Engine simulasi utama, kalender, kebutuhan, keuangan, investasi, bisnis, pendidikan, creator studio, dan career application flow.
- Penilaian wawancara/tes, syarat usia/pendidikan/skill, promosi, jadwal kerja, dan penggajian yang sudah ada.
- Toko dan inventaris tetap menggunakan halaman Kehidupan/Belanja serta state engine lama.

## Pengujian
- `tests/calendar.test.mjs`: 23 tes lulus.
- `tests/needs.test.mjs`: 13 tes lulus.
- `tests/deployment-config.test.mjs`: lulus.
- `tests/career-market.test.mjs`: tes determinisme rotasi, perlindungan lowongan aktif, dan data magang.
- Pemeriksaan sintaks Node untuk server dan modul frontend dilakukan.
- `tests/ui-redesign.test.mjs`: diperbarui agar cocok dengan token warna stylesheet saat ini.
- Pengujian backend penuh belum dapat dinyatakan lulus di lingkungan build ini karena dependensi `express` dan `better-sqlite3` tidak tersedia setelah instalasi paket mengalami timeout. Jalankan `npm ci` lalu seluruh tes di lingkungan Node 22.12+.

## Batasan penting — belum siap disebut rilis produksi
1. **Persistensi Vercel belum diselesaikan.** Server masih memakai SQLite berbasis file. Untuk menjamin progres lintas instance/deployment, integrasikan penyedia database persisten (mis. Turso/libSQL atau layanan yang disetujui) dan migrasikan semua query server; jangan menganggap `/tmp` atau `BIZSIM_DB` sebagai penyimpanan permanen.
2. **Identitas pemain lama:** data yang tersimpan sebelumnya dengan visitor default `local-dev` tidak otomatis dipindahkan ke ID browser baru. Migrasi otomatis tidak dilakukan karena `local-dev` dapat berisi data bersama dan memindahkannya ke pengguna pertama berisiko membocorkan profil. Rencana pemulihan data lama perlu disepakati sebelum deployment.
3. Rotasi pasar saat ini memilih lowongan dari katalog yang sudah ada secara deterministik; ini belum merupakan simulasi permintaan tenaga kerja makroekonomi penuh, pengisian lowongan oleh NPC, atau pemutakhiran gaji berbasis ekonomi.
4. Program magang memakai mekanisme payroll paruh waktu yang tersedia; sistem kontrak magang terpisah belum dibuat.

## Langkah berikutnya sebelum deploy
1. Tentukan dan siapkan database persisten dengan kredensial environment Vercel.
2. Migrasikan SQLite ke adapter database persisten dan uji multi-instance serta restart/deploy.
3. Tentukan alur aman untuk profil lama `local-dev`.
4. Instal dependensi, jalankan seluruh tes termasuk `test:finance`, lalu lakukan smoke test di preview deployment Vercel.
