# BizSim v7.1.2 — Handoff perbaikan database Vercel

## Baseline
Paket sumber yang dipakai: `BizSim-v7.1-Career-Market-Patch.zip` (berdasarkan proyek BizSim v7.1). Perubahan ini melanjutkan paket tersebut, bukan mengganti engine game.

## Perubahan
- Integrasi driver `libsql` untuk menghubungkan server BizSim ke database Turso/libSQL terkelola melalui API SQLite-compatible.
- Server tetap memakai `better-sqlite3` berbasis file saat berjalan lokal.
- Di Vercel, aplikasi sekarang menolak startup jika `TURSO_DATABASE_URL` atau `TURSO_AUTH_TOKEN` tidak tersedia, alih-alih menyimpan progres pada `/tmp` yang sementara.
- `/api/health` menjalankan query nyata `SELECT 1` dan melaporkan status database yang dikonfigurasi.
- Panduan pengaturan ada di `docs/VERCEL-PERSISTENT-DATABASE-v7.1.2.md`.
- Tes konfigurasi deployment diperbarui dan tes khusus database persisten ditambahkan.

## Pengaturan wajib di dashboard Vercel
1. Buat database Turso, lalu buat token baca/tulis.
2. Tambahkan environment variable server-side `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` pada environment yang digunakan.
3. Redeploy dari Vercel.
4. Pastikan `/api/health` memberi HTTP 200 dan `persistence: "managed-remote-database"`.
5. Uji buat karakter, simpan progres, muat ulang, lalu redeploy dan periksa progres kembali.

## Hasil pengujian yang berhasil
- `node tests/vercel-database.test.mjs` — lulus.
- `node tests/deployment-config.test.mjs` — lulus.
- `node tests/ui-redesign.test.mjs` — lulus.
- `node tests/calendar.test.mjs` — 23 tes lulus.
- `node tests/needs.test.mjs` — 13 tes lulus.
- `node tests/career-market.test.mjs` — 7 pemeriksaan lulus.
- `node --check server/server.cjs` — lulus.

## Belum terverifikasi
- Koneksi nyata ke Turso belum dapat dites karena proyek tidak menyediakan URL database/token pemilik.
- Tes finance/backend penuh belum dijalankan karena dependency belum terpasang di lingkungan kerja ini; instalasi npm sebelumnya timeout. Jangan anggap tes integrasi remote sudah lulus hanya berdasarkan tes statis.
- Data SQLite lama tidak otomatis pindah ke database Turso. Bila ada progres lama yang harus dipertahankan, lakukan ekspor/impor terkontrol dari file database asli sebelum menghapus apa pun.

## Sistem yang dipertahankan
Struktur Vercel API, Express, game engine, pendidikan, keuangan, kalender, karier/pasar kerja, navigasi, dan identitas pengunjung dari paket baseline tetap ada. Tidak ada kredensial rahasia yang ditanam dalam kode.

## Catatan dependency tambahan
Registry npm tidak merespons selama sesi penyusunan, sehingga lockfile lengkap untuk `libsql` belum dapat dibuat ulang. Vercel menggunakan `installCommand` yang mengabaikan lockfile. Untuk lingkungan lokal, jalankan `npm install` untuk menyinkronkan lockfile sebelum memakai `npm ci`; perubahan dependency ini tetap perlu diverifikasi di lingkungan yang memiliki akses registry.
