# Audit & laporan jujur v7.4.0

## Hasil tes (server + DB, shim SQLite)
calendar 23, needs 13, career-market lulus, deployment-config lulus, vercel-database lulus, server-db 11, finance 14, commerce 13, market 26, market2 23, relation 18, ui-redesign lulus. E2E Playwright (320-390px): Seller Center, chat pembeli, duplikat, Sosial, tab Pasar; tanpa error konsol, tanpa overflow horizontal.

## Fitur berfungsi
Order Center & ekspedisi (P5), Seller Center (P6), influencer/endorsement/affiliate (P7), chat/ulasan/retur/refund (P8), harga dinamis + tab Pasar (P9), notifikasi (P10), Sosial & Relationship.

## Batas / masalah yang diketahui
- Balasan NPC memakai template dan aturan, bukan pemahaman bahasa alami; tidak ada chat grup.
- Pesan referral/lowongan hanya informatif (tidak otomatis melamar).
- Waktu aksi bantuan sosial diterapkan klien (`NE.start`), belum ditegakkan server.
- Notifikasi flash/voucher dibuat saat Beranda marketplace dibuka (tidak ada job latar).
- Dampak pasar ke dunia hanya indikator permintaan/harga.
- Jalur retur sisi penjual oleh pembeli NPC hanya diuji bila NPC kebetulan meretur pada rentang uji; beberapa tes relasi menerima salah satu hasil keputusan NPC probabilistik.
- Tes dijalankan pada SQLite shim; Turso/Vercel belum diuji langsung (kode memakai binding positional dan `ensureSchema` lazy).
- `package-lock.json` perlu diregenerasi (`npm install`).

## Setelah deploy
Cek `/api/health`, `/api/fin/catalog`, `/api/shop/catalog`, `/api/mp/launcher`, `/api/mp/shopindo/pasar` (butuh akun).
