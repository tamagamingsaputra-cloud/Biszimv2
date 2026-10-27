# BizSim v7.1.2 — Database persisten untuk Vercel

## Perubahan teknis
- Database driver beralih ke `libsql` untuk koneksi SQLite-compatible yang tetap memakai API sinkron yang sudah dipakai server/finance.
- Jika `TURSO_DATABASE_URL` dan `TURSO_AUTH_TOKEN` tersedia, semua tabel BizSim dibuat pada database Turso/libSQL terkelola, bukan file `/tmp`.
- Pada Vercel, server sengaja gagal mulai jika kredensial database tidak tersedia. Ini mencegah aplikasi terlihat hidup tetapi kehilangan progres saat instance diganti.
- Endpoint `/api/health` menguji koneksi database sungguhan dan melaporkan `managed-remote-database` hanya ketika koneksi remote dikonfigurasi.
- Di lokal, `better-sqlite3` dan file SQLite tetap dipakai agar alur pengembangan lokal tidak berubah.

## Pengaturan wajib di Vercel
1. Buat database Turso baru dan salin URL database (`libsql://...`).
2. Buat token akses database dengan hak baca/tulis.
3. Di Vercel → Project → Settings → Environment Variables, tambahkan:
   - `TURSO_DATABASE_URL` = URL database `libsql://...`
   - `TURSO_AUTH_TOKEN` = token rahasia database
4. Aktifkan untuk Production dan Preview yang digunakan, lalu redeploy.
5. Buka `/api/health`. Hasil yang diharapkan: HTTP 200, `ok: true`, `persistence: "managed-remote-database"`, `db: "Turso/libSQL"`.
6. Buat/ubah progres game, muat ulang, lalu uji lagi setelah deployment baru. Pastikan profil/progres yang sama masih terbaca.

Jangan masukkan token ke source code, ZIP publik, GitHub, atau variabel `NEXT_PUBLIC_*`. Token hanya disimpan sebagai Environment Variable server-side.

## Batasan yang harus diketahui
- Kode ini menyiapkan integrasi; koneksi produksi belum bisa diverifikasi tanpa database Turso milik pemilik proyek dan Environment Variables di Vercel.
- Saat migrasi pertama, tabel dibuat otomatis di database baru. Data yang hanya berada di file SQLite lokal/`/tmp` tidak otomatis dipindahkan ke Turso. Untuk data lama yang penting, ekspor/impor terkontrol perlu dilakukan dari file database yang benar.
- Jangan menghapus database lama sebelum proses verifikasi/migrasi data selesai.

## Catatan dependency
Lingkungan penyusunan tidak dapat mengakses registry npm (permintaan metadata timeout), sehingga `package-lock.json` belum diregenerasi penuh untuk dependency `libsql`. `vercel.json` mengatur instalasi Vercel dengan `npm install --package-lock=false` agar deployment menyelesaikan dependency dari `package.json`. Sebelum memakai `npm ci` di lingkungan lokal, jalankan `npm install` agar lockfile dibuat ulang dan periksa perubahan yang dihasilkan.
