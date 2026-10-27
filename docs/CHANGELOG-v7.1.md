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

## Patch review — Career Market & Vercel persistence diagnostics (27 Oct 2026)
- Added deterministic weekly job-market rotation and two internship programs using the existing application/evaluation and part-time payroll flow.
- Added navigation entries for internship, work/payroll, and the existing shop/inventory page.
- Added stable browser visitor identity for new sessions and a health endpoint warning that SQLite files are not durable storage on Vercel Functions.
- Removed external Google Fonts import so the UI does not require a network font request.
- Added `tests/career-market.test.mjs` and refreshed the UI check to match the actual v7.1 source.
- Important: durable hosted database migration and safe migration of legacy `local-dev` player data remain prerequisites for a production release. See `docs/CHAT-HANDOFF-v7.1-career-market.md`.
