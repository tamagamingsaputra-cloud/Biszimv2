# BizSim — HANDOFF (ringkasan percakapan untuk chat baru)

> Baca file ini PERTAMA saat memulai chat baru. Perbarui di akhir setiap sesi. Bahasa komunikasi dengan pemilik proyek: **Indonesia**.

## 1. Proyek
BizSim: simulasi kehidupan + bisnis (Indonesia). Express 5 (`server/*.cjs`), frontend vanilla ES-module (`public/`), SQLite lokal / Turso di Vercel (`api/index.js` + rewrite `/api/:path*`).
Identitas: header `x-visitor-id` (QA: `?visitor=X` → `qa-X`, header `x-dev-visitor`). Waktu simulasi: `abs=(day+14)*86400+sec`; klien kirim `clock {day,sec}`; 360 hari/tahun, 30 hari/bulan.
Aturan teknis: binding SQL **positional `?`** saja (libsql/Turso), tidak ada saldo/inventori/pesanan kedua, semua transaksi divalidasi server + idempoten (`idem`), tanpa localStorage untuk data penting, tanpa emoji sebagai ikon, UI konsisten (chip ikon berwarna `--accent-bg`, 32px, ikon 17px).
Cara uji: shim sqlite di `scratchpad/shim/node_modules`; `NODE_PATH=<shim> STRICT_POSITIONAL=1 node tests/<nama>.test.mjs`. Jalankan job panjang di background ke log. Playwright global (`npm root -g`). Jangan `pkill -f`; pakai `fuser -k <port>/tcp`.

## 2. Riwayat rilis
- v7.1.3/7.1.4: perbaikan server + DB (profil, Vercel). v7.2.0: Retail & Commerce (Order Center, kurir, voucher, reward). v7.3.0: Marketplace (Prompt 1–4: 4 marketplace fiktif Shopindo/LazaMall/Tokomart/BelanjaPlus, akun, katalog 108 produk/340 listing, keranjang, voucher, checkout, PayLater).
- **v7.6.0: Kampung 3D layar penuh (Three.js) — lihat docs/3D-WORLD.md.** Repo GitHub pengguna (tamagamingsaputra-cloud/Biszimv2) masih v7.3.0; zip terbaru menggantikannya.
- **v7.4.0: Prompt 5–11 + konsistensi UI + Social Life + hapus duplikat (selesai, lihat §3). Berikutnya: tahap 3D.**

## 3. Status Prompt 5–11 (jujur, v7.4.0)
| Prompt | Status | Catatan |
|---|---|---|
| UI ikon/warna fitur baru | SELESAI | token `.ichip`/`.prod-h .ico` di `bizsim.css` |
| P5 ekspedisi & tracking | SELESAI (tes lulus) | 5 ekspedisi, tracker 8 langkah |
| P6 Seller Center | SELESAI (server + UI `seller.html`, tes + e2e) | toko, produk, stok, pesanan, promo, voucher, ulasan, chat, pelanggan |
| P7 influencer/endorsement/affiliate | SELESAI (`server/social.cjs`, UI di Seller Center) | kampanye deterministik |
| P8 chat/ulasan/retur/refund | SELESAI | chat pembeli-penjual, ulasan sekali per pesanan, retur dua sisi, refund; tes `market2` (23) |
| P9 ekonomi dinamis | SELESAI dengan batas | `dynOf()` di `market.cjs` dipakai katalog, urutan, filter, keranjang, kuotasi, checkout (harga = harga dibayar). Endpoint `/api/mp/:m/pasar` + tab "Pasar". Dampak ke dunia hanya indikator permintaan/harga, belum memengaruhi lapangan kerja |
| P10 notifikasi | SELESAI dengan batas | kind: paid, kirim, retur, `sl_*`, `rl_msg`, `pl-due`, `pl-late`, `flash`, `voucher`. Notifikasi flash/voucher dibuat saat membuka Beranda marketplace (lazy), bukan push latar belakang |
| P11 audit | REGRESI HIJAU; laporan di `docs/AUDIT-v7.4.md` | tidak ada klaim 100% |
| Social Life & Relationship | SELESAI (`server/relation.cjs`, `social.html`, 18 tes) | balasan NPC dari template/aturan, bukan NLP; tanpa chat grup; pesan referral/lowongan informatif saja |
| Hapus fitur duplikat | SELESAI | menu Marketplace digabung, Pesan Antar, sisa Pasarku dihapus |
| 3D | KAMPUNG 3D v7.6.0 (layar penuh isometrik, 14 bangunan terikat fitur 2D) | `docs/3D-WORLD.md`; `public/world3d.html`, `css/world3d.css`, `pages/world3d.js`, `world3d/{city,models,world,ui3d,builders}.js`; tes `tests/world3d.test.mjs` + e2e Playwright; performa hanya terukur di SwiftShader; SPBU/terminal/ibadah ditandai belum aktif |

## 4. File kunci
Server: `server/server.cjs`, `finance.cjs` (core: `creditIn` baru), `commerce.cjs` (`hooks.decorate` baru), `market.cjs`, `market-catalog.cjs`, `seller.cjs`, `mp-economy.cjs`, `shop-catalog.cjs`.
Klien: `public/shop.html` (Order Center), `public/marketplace.html`, `assets/js/pages/{shop,marketplace}.js`, `ui/{tracker,mp-checkout,product-art,ui,shell}.js`, `css/bizsim.css`.
Tes: `tests/{commerce,market,market2,relation}.test.mjs`, skrip `npm test`. Dokumen: `docs/MARKETPLACE.md`.
Pengingat pengguna: regenerasi `package-lock.json` (`npm install`); setelah deploy cek `/api/health`, `/api/fin/catalog`, `/api/shop/catalog`, `/api/mp/launcher`. Icon Magang digambar manual (Canva tidak aktif).

## 5. Rencana 3D (permintaan pemilik)
Sumber: `BizSim_3D_PRD_Workflow_SkillPack_Claude_Free.docx` (PRD, workflow fase 0–8, skill pack). Aturan inti: **2D tetap utuh; 3D = renderer tambahan di atas core yang sama** (satu profil, saldo, inventori, waktu, NPC, event, save). Referensi gaya: kampungsebelah.com/kampung (hanya kamera/rasa eksplorasi; jangan salin aset/kode).
Permintaan pemilik: gunakan **library 3D yang mumpuni — Three.js atau Babylon.js** (bukan canvas buatan sendiri). Rekomendasi saat mulai: Three.js (ringan, ekosistem besar; cocok vertical slice, bundler tanpa build step via ES module/importmap + versi terkunci dari cdnjs/jsdelivr) atau Babylon.js bila perlu navmesh/inspector/physics bawaan; putuskan di Fase 0 setelah audit dan ukur di Android 4 GB. Jangan klaim lancar sebelum diukur. Urutan: Fase 0 audit (AUDIT_REPORT, FEATURE_MATRIX, ARCHITECTURE_CURRENT, RISK_REGISTER) → Fase 1 shared core → Fase 2 vertical slice (satu jalan, satu bangunan, satu NPC, satu objek interaktif, click-to-move) → dst.

## 6. Cara memulai chat baru
1. Baca file ini + `docs/MARKETPLACE.md`. 2. Jalankan `npm test` (atau tes per modul) untuk baseline. 3. Lanjutkan tabel §3 dari baris pertama yang belum SELESAI. 4. Perbarui file ini di akhir sesi.

## 7. Status 3D (v7.6.0)
HUD mengikuti PRD 8 Nov 2026. Berikutnya (urut): ukur di Android 4 GB → NPC Quick Card dari mesin Sosial → interior bangunan prioritas → fitur sistem yang belum ada di 2D (kendaraan/SPBU/terminal, ibadah, layanan publik) dibuat DI 2D dulu lalu dihubungkan ke 3D → model final & audio. Jangan klaim lancar sebelum diukur di perangkat nyata.
