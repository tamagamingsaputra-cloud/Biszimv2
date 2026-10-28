# BizSim v7.1.3 — Audit & perbaikan server/database

## Akar masalah `POST /api/profile` → 500 (`Cannot read properties of null (reading 'edu')`)
`savePlayer()` memakai binding SQL bernama (`@v`, `@c`, …). Pada driver libsql/Turso binding bernama tidak andal: INSERT tidak
gagal tetapi tidak menyimpan baris yang benar, sehingga `getPlayer()` mengembalikan `null` dan `view(null)` melempar error.
Direproduksi: server asli + driver yang menolak binding bernama → 500.

## Perbaikan
| Area | Masalah | Perbaikan |
|---|---|---|
| server.cjs | Binding bernama di `savePlayer` | Positional + `ON CONFLICT … excluded.*` |
| finance.cjs | `addTx` juga binding bernama (semua transaksi keuangan akan rusak di Turso — tidak ada di handoff) | Positional |
| server.cjs | Profil dijawab sukses tanpa baca-ulang | Baca ulang + cocokkan `char_id`; jika gagal → 500 JSON yang jelas |
| server.cjs | `view()`/`need()` crash bila data pemain tidak lengkap | Guard; `/api/state` memperlakukan data tak lengkap sebagai "belum ada profil" |
| server.cjs | `throw` saat modul dimuat bila env Turso kosong → `FUNCTION_INVOCATION_FAILED` tanpa pesan | Menjawab 503 JSON `db-config` dengan instruksi |
| server.cjs | Skema dibuat saat cold start; gagal sekali = fungsi mati | Skema malas + dicoba ulang; 503 `db-unreachable` bila Turso tak terjangkau |
| server.cjs | Fallback visitor `local-dev` di produksi → semua pengunjung tanpa header berbagi satu profil; `x-dev-visitor` bisa dipakai di produksi | Di produksi ID wajib valid (400), `x-dev-visitor` diabaikan |
| server.cjs | Ijazah/riwayat karakter lama muncul di karakter baru (query `records` hanya per visitor) | Difilter per `char_id` |
| server.cjs | Kirim jawaban ujian ganda bersamaan dinilai dua kali; sesi karakter lama bisa dikirim | `UPDATE … WHERE submitted=0` atomik + cek pemilik sesi |
| server.cjs | Body kosong → `req.body` undefined (Express 5) → crash; error HTML | Normalisasi body; error handler JSON; 404 JSON untuk `/api/*`; `GET /api` |
| finance.cjs | Loop `advance` hingga 400 hari melakukan banyak query per hari (round-trip Turso → timeout Vercel) | Data dimuat sekali per permintaan |
| Skema | Tanpa indeks | Indeks per `visitor` |
| /api/health | Minimal | + `schema`, `players`, `version` |
| vercel.json | — | `maxDuration: 30` |
| server/package.json | Tidak ada `libsql`; lockfile usang | `libsql` ditambahkan; lock usang dihapus |
| tests | `finance.test` bergantung pada `server/node_modules` | Resolusi lewat `createRequire`; tes baru `server-db.test.mjs`; `npm test` |
| .gitignore | `node_modules` root, `.env`, `.vercel` tidak diabaikan | Ditambahkan |

## Yang TIDAK dapat diverifikasi di sini
- Koneksi nyata ke Turso/Vercel (registry npm & Turso tidak dapat dijangkau dari sandbox). Pengujian memakai shim `node:sqlite`
  yang menolak binding bernama untuk meniru libsql. **Jalankan validasi pasca-deploy** (README → Deploy ke Vercel).
- `package-lock.json` root belum memuat `libsql`; jalankan `npm install` sekali lalu commit (Vercel memakai `--package-lock=false`).
- Dua baris lama di Turso: tidak disentuh. Bila salah satunya `visitor`/`profile` NULL itu sisa bug lama; hapus manual dengan
  `DELETE FROM players WHERE visitor IS NULL OR profile IS NULL;` setelah memeriksanya.

## Tambahan (laporan "Katalog belum termuat — Respons server tidak valid (404)")
Rute bersarang seperti `/api/fin/catalog` mengembalikan 404 non-JSON dari Vercel: routing bergantung pada fungsi catch-all
berbasis nama-file `api/[...path].js` (dan pola `functions` dengan kurung siku). Diganti dengan satu fungsi `api/index.js` +
`rewrites` di `vercel.json` (`/api/:path*` → `/api?__p=:path*`); path asli direkonstruksi di adapter sebelum masuk Express.
Pesan error klien kini menyebut path yang gagal. Diuji lokal untuk kedua kemungkinan perilaku Vercel (URL asli dipertahankan / tidak).
