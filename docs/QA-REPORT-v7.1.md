# QA Report — BizSim v7.1.1 Hotfix Koneksi

## Berhasil
- `node tests/ui-redesign.test.mjs` — lulus.
- `node tests/calendar.test.mjs` — 23 pengujian lulus.
- `node tests/needs.test.mjs` — 13 pengujian lulus.
- `node tests/deployment-config.test.mjs` — lulus: API publik menggunakan same-origin dan adapter Vercel terdaftar.
- `node --check server/server.cjs` dan `node --check api/[...path].js` — lulus.

## Belum diverifikasi
- `npm ci` di lingkungan kerja timeout; runtime dependency dan API server belum dapat diuji end-to-end di sini.
- Belum melakukan deployment Vercel aktual atau uji browser pada URL publik.
- **Penyimpanan:** adapter serverless memakai SQLite di `/tmp`; Vercel dapat membuang data tersebut saat instance berganti. Progres permanen membutuhkan database persisten eksternal. Jangan anggap ini konfigurasi produksi final sebelum database persisten dipasang.

## Perbaikan insiden
API client tidak lagi mengarahkan pengunjung Vercel ke localhost milik perangkat pengunjung. Ditambahkan catch-all API function dan konfigurasi root dependency agar deployment memiliki rute `/api/*`.
