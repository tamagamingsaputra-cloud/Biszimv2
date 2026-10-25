# BizSim v8.3.0 — Chat Handoff

## Baseline
- Folder: `BizSim-v8.3.0-AI-Comparison-A/`
- Baseline sumber yang tersedia: v8.1.0 AI Comparison A.
- Tujuan: perbandingan AI terisolasi; jangan menimpa proyek pembanding lain.

## Perubahan pada rilis ini
1. `web/v830-major-update.css`: override responsive akhir untuk mencegah profil/masthead terpotong, teks membungkus, konten tidak tertutup bottom navigation, dan penekanan visual per fitur.
2. `web/index.html`: stylesheet baru terhubung untuk normal dan noscript.
3. `web/assets/uiux-v830/icons/`: 8 SVG lokal.
4. `web/assets/uiux-v830/avatars/`: 4 avatar SVG lokal.
5. `netlify/functions/v750-education.mjs`: default skenario pendidikan baru `sd`.
6. `web/v750-education.js`: label jenjang/filter pendidikan Indonesia dan urutan SD sebagai pilihan awal.
7. `package.json`: versi 8.3.0.

## Pertahankan
Jangan hapus atau menulis ulang `web/app.js`, `web/engine/api.js`, `server/`, Netlify Functions, `v730-market2.js`, `v730-business2.js`, Creator Studio, clock/calendar, payroll atau persistence tanpa audit dan regression tests. Navigasi global tidak diganti.

## Tes
Jalankan `npm run test:all`. Catat hasil aktual pada `BizSim-Test-Report-v8.3.0.md`. Pengujian otomatis tidak sama dengan screenshot test pada Android fisik.

## Sisa pekerjaan / batasan
- Audit dan terjemahkan string Inggris yang tersisa per halaman tanpa mengubah identifier API.
- Terapkan avatar picker ke biodata profil utama jika belum ditautkan pada route profil di renderer aktif.
- Tambahkan age-gate server-side terpusat untuk Creator/pekerjaan/bisnis; jangan hanya menyembunyikan tombol UI.
- Periksa class root setiap halaman; identitas warna CSS hanya aktif jika renderer mengekspos selector yang cocok.
- Visual regression Android 320/360/390/430px dan desktop belum disertifikasi.

## Tambahan setelah smoke test
- `web/v830-profile-bio.js` membungkus halaman profil aktif dan menampilkan biodata yang dapat diedit. Biodata tersimpan lokal pada perangkat, bukan server-side.
- Umur simulasi ditampilkan dari usia awal 6 tahun, naik 1 tahun per 56 hari game.
- `web/v830-major-update.css` mencakup gaya kartu biodata dan layout profil responsif.
- `package.json` memeriksa sintaks `v830-profile-bio.js`.
