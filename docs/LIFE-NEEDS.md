# Kebutuhan Karakter (Life Needs)

Status: **diimplementasikan & diuji** (engine klien, disimpan di save server). Sumber aturan: `public/assets/js/data/needs-rules.js`; engine: `public/assets/js/engine/needs.js`; UI: `pages/life.js`, `ui/needs-ui.js`, hero Dashboard.

## Delapan kebutuhan
| Kebutuhan | Skala | Contoh laju (poin/jam game) | Ambang rendah / kritis | Dampak utama |
|---|---|---|---|---|
| Lapar | 100 = kenyang | luang −4,2 · tidur −1,6 · kerja −5,4 | 35 / 15 | mood & stres; kritis: kesehatan −1,5/jam, performa −10% |
| Haus | 100 = cukup minum | luang −4,5 · tidur −1,8 · kerja −5,8 | 35 / 15 | kritis: kesehatan −2,5/jam, energi turun |
| Energi | 100 = segar | tidur +12 · luang −2,5 · kerja −5 | 30 / 12 | < 20 produksi konten berhenti; performa −8% / −20% |
| Kebersihan | 100 = bersih | luang −2,2 · kerja −3,5 | 35 / 15 | mood; kritis: kesehatan & reputasi |
| Kesehatan | 100 = sehat | pulih +0,2–0,5 bila kebutuhan lain aman | 40 / 20 | < 30 performa −15% |
| Mood | menuju 60 | drift 4%/jam + penalti | 35 / 15 | dipengaruhi kebutuhan rendah, stres, hiburan |
| Stres | 0 = tenang (terbalik) | tidur −3 · sekolah +1,5 · kerja +2 | 70 / 90 | mood −; > 90 energi terkuras 1,5× |
| Kandung kemih | 100 = nyaman | luang −6 · tidur −2,2 | 30 / 10 | sekolah/kerja: toilet otomatis ≤ 25; 0 = "kecelakaan" |

Laju berbeda per state (tidur, sekolah, kerja, live, aktivitas pribadi, waktu luang) dan antar-kebutuhan saling memengaruhi. Tick dijalankan setiap 30 menit game bersama simulation clock.

## Aksi
- Aksi rumah (minum, toilet, mandi, istirahat, tidur siang, hiburan) dan makan/belanja memakan **waktu game** (karakter "sedang beraktivitas" dan aksi lain diblokir dengan alasan).
- Makan keluarga otomatis 06:30 & 18:30 untuk usia < 18 (bisa dimatikan).
- Merchant punya jam buka; pembelian lewat checkout server (lihat `FINANCE.md`). Pesan antar punya tahap diproses → diantar → tiba.
- Perjalanan harian (jalan kaki, sepeda, bus, ojek) memengaruhi energi & biaya.
- Faktor performa (40–100%) dipakai karier dan sekolah; kondisi buruk = performa turun.

## Uji
`node tests/needs.test.mjs` (13 uji): laju per state, ambang, toilet otomatis, aktivitas memblokir aksi, makan keluarga, performa, penyesuaian tunai idempoten. QA browser: Dashboard & Kehidupan di 1440 px dan 390 px, makan di rumah, beli di warung (tunai & QRIS).

## Batasan
- State kebutuhan disimulasikan di klien lalu disimpan ke server bersama save game (bukan server-authoritative).
- Angka adalah aturan game, bukan rekomendasi kesehatan.
