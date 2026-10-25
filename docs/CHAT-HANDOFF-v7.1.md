# Chat Handoff — BizSim v7.1

## Baseline
Source of truth adalah upload `BizSim.zip`, bukan ZIP referensi v8.4.0. Root pada rilis harus `BizSim-v7.1/`; struktur internal `public/`, `server/`, `docs/`, `tests/` dan modul engine dipertahankan.

## Perubahan
Tema halaman khusus, responsif/safe area, ikon SVG lokal, avatar lokal dengan API persistence, status creator Indonesia, penghapusan tab YouTube duplikatif, dan penghapusan bypass usia kreator.

## Validasi
UI statis lulus; kalender 23 tes lulus; kebutuhan 13 tes lulus; syntax-check semua script lulus. Tes finance gagal dimulai karena `express` tidak tersedia dan instalasi dependency timeout. Tidak ada klaim bahwa visual Android sudah diverifikasi.

## Lanjutan wajib
1. Jalankan `cd server && npm ci`.
2. Jalankan `npm test` dari `server/` dan `node ../tests/finance.test.mjs` bila dependency terpasang.
3. Jalankan server dan cek dashboard, market, investments, business, career, education, profile/avatar, calendar, life, finance, dan Creator Studio pada viewport Android 360×800 dan desktop 1366×900.
4. Perbaiki setiap clipping/overflow yang terlihat; jangan hapus engine yang masih digunakan oleh save lama.


## Insiden koneksi publik — v7.1.1
Screenshot pengguna memperlihatkan aplikasi di Vercel gagal menghubungi server karena API client fallback ke `http://localhost:8000`. Hotfix mengubah API publik ke same-origin, menambahkan `api/[...path].js`, `vercel.json`, dan root `package.json`/lockfile. Uji statis dan regression UI/calendar/needs lulus. Dependency install timeout, deployment aktual belum dites. Database API adapter sementara memakai `/tmp/bizsim.db`; jangan menjanjikan progres permanen pada Vercel sampai database eksternal persisten dikonfigurasi. Jalankan lokal dengan `cd server && npm ci && npm start`, lalu buka `http://127.0.0.1:8000`.
