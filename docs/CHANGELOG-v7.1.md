# Changelog — BizSim v7.1

- Redesain sistem warna per halaman, termasuk terminal navy gelap untuk Pasar Simulasi.
- Perbaikan overflow teks, grid responsif, safe-area Android, modal, kartu, dan navigasi bawah.
- Ikon SVG dibenahi dan ditambah ikon tahap produksi: gunting, unggah, pencarian, profil.
- Enam avatar karakter SVG lokal; avatar bisa dipilih saat onboarding/edit dan disimpan di API profil.
- Label navigasi dan status Creator Studio dilokalkan ke Bahasa Indonesia.
- Bypass usia kreator pada Settings dihapus; usia kreator kembali mengikuti usia karakter.
- Tab kreator YouTube lama yang menduplikasi Creator Studio di halaman karier dihapus; migrasi data lama dipertahankan.
- Font eksternal dihapus agar tampilan tidak bergantung pada unduhan Google Fonts.
- Menambahkan tes regresi statis UI.


## v7.1.1 — Hotfix koneksi (2026-10-25)
- API browser menggunakan same-origin di deployment publik, bukan `localhost:8000` milik pengguna.
- Menambahkan Vercel catch-all API function, konfigurasi deployment, dan `package.json`/lockfile pada root proyek.
- Server Express diekspor untuk penggunaan lokal dan serverless tanpa menjalankan `listen()` saat diimpor.
- Menambahkan pengujian statis konfigurasi deployment.
- Batasan: SQLite pada `/tmp` tidak persisten lintas instance serverless; database eksternal tetap diperlukan untuk progres permanen.
