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

## 8. Sesi v7.6.1 — perbaikan 3D tahap 1 (8–9 Nov 2026)
Permintaan pemilik: 10 prioritas perbaikan 3D + 17–20 (audio, ekspresi karakter, pengaturan/aksesibilitas, validasi aset). Tahap 1 = audit lalu perbaikan masalah yang dilaporkan: **tap/gerak tidak sesuai, warna pudar, collision**. Referensi model: `docs/ref/REF-gaya-model-3d.png` (gambar dari pemilik; HANYA acuan gaya, jangan disalin).
**Penyebab & perbaikan (terbukti dengan render/tes nyata):**
- Kunci A* `z*4096+x` rusak untuk koordinat negatif (`T.ox=-28`, `T.oz=-17`): titik jalur bisa jatuh di luar peta (mis. x=4092). Diperbaiki dengan indeks bergeser (`city.js`).
- Titik tujuan di-snap ke tile terdekat dengan urutan cincin (bias -x/-z) dan dest = tengah tile → kini terdekat euklides, berhenti TEPAT di titik ketuk bila bebas; jalur dihaluskan (garis pandang berjari-jari 0,28) bukan zig-zag.
- Ketukan dihitung saat jari MENYENTUH (kamera mengikuti karakter sehingga saat jari diangkat sudah bergeser). Margin kotak ketuk bangunan diperketat.
- Warna: adegan terlalu GELAP (bukan terang): Three r160 memakai satuan cahaya fisik, intensitas lama tidak dikali π. Rumput tampil (99,139,61) padahal (140,192,99); dinding putih tampil abu (119,120,109). Cahaya ×π (`world.js`) + penguatan saturasi seragam `vivid()` k=1,2 (`models.js`). Luminans rata-rata 102→129; saturasi 0,51→0,59.
- Collision runtime: lingkaran vs NPC/kendaraan (`r` per aktor), karakter menyelip saat head-on, dorong keluar ke arah bebas, aktor mengalah ≤1,2 dtk lalu jalan (cegah kebuntuan 4 kendaraan di persimpangan), pengawas kemajuan 3 dtk → replan, menyerah setelah 8 replan dengan toast "Tidak ada jalan ke sana".
**Tes baru:** `tests/world3d-path.test.mjs` (murni Node, 6 uji) dan `tests/world3d-input.test.mjs` (Playwright + server statis sendiri, 10 uji; dilewati bila Playwright tak ada). Keduanya masuk `npm test`.
**Belum dikerjakan (jujur):** model masih primitif (jauh dari referensi), UI 3D masih tautan ke halaman 2D (butir 5), 3 wilayah, NPC Quick Card, interior/objek interaktif, audio, pengaturan 3D lengkap, simpan posisi, simulasi kehidupan (butuh Core kesehatan di 2D). Tes server (express/sqlite) TIDAK bisa dijalankan di sesi ini karena dependensi tidak ada — jalankan `npm install && npm test` di mesin Anda.
**Berikutnya (urut):** UI 3D mandiri bertahap (Rumah, Warung, Bank, Toko) dengan layanan bersama di `engine/`; lalu NPC (butuh keputusan lokasi NPC); lalu kontrak Core + migrasi (posisi/wilayah/simpan); lalu model/animasi sesuai referensi.

## 9. Sesi v7.6.2 — model 3D mengikuti referensi (tahap 2, bagian 1)
**Selesai & teruji (render nyata + tes):**
- `world3d/vehicles.js`: 8 kendaraan sesuai referensi (mobil, motor+pengendara, bus kota, ambulans, damkar+tangga, mobil polisi, truk barang, taksi) lengkap roda/hub, kaca, lampu depan/belakang, bumper, lightbar. Lalu lintas ambient memakai ke-8 jenis (preset Low = 2 kendaraan, High = 7).
- `world3d/people.js`: 12 peran (pelajar, pelajar putri, pekerja, pegawai, pedagang, petani, dokter, polisi, pemadam, koki, lansia, warga) dengan pakaian/topi/tas/alat per peran + variasi kulit, rambut, tinggi, lebar tubuh (deterministik dari seed). Wajah: hidung, mulut, alis. Pejalan kaki ambient memakai peran ini.
- Bangunan: jendela berbingkai + sekat silang + ambang.
- Collider kendaraan = KAPSUL (ruas + jari-jari, per jenis: `VEHICLE_R/HL`), karena lingkaran gagal untuk bus (diuji: head-on bus diam kini lolos).
- Ukuran (SwiftShader, bukan HP): Low 93 draw call / 15,6 rb segitiga; Medium 132 / 17,5 rb; High 139 / 17,7 rb; 0 tekstur.
**Masih BELUM sesuai referensi (jujur):** bangunan masih berbentuk kotak tanpa halaman/pagar/pohon di tapaknya (tapak = footprint grid; pagar butuh collider + perluasan footprint), tanpa papan nama bertulisan, tanpa interior; Mall, Pabrik, Proyek Konstruksi, Kafe, Rumah Sakit bertingkat belum ada; hewan, furnitur, animasi aksi (duduk, makan, kerja) belum ada. NPC kantor/warung masih makeHuman lama.
**Belum dikerjakan sama sekali:** UI 3D mandiri (butir 5), 3 wilayah + perjalanan (6), NPC Quick Card & simulasi (4), interaksi objek/interior (3), simulasi kehidupan (8), simpan posisi/progres (9), audio (17), pengaturan/aksesibilitas (19), validasi aset (20). Alasan jujur: semuanya menyentuh API/DB server dan tidak bisa dibuktikan di sandbox ini (tanpa express/sqlite); setiap butir memerlukan sesi sendiri sesuai workflow PRD (satu fase per sesi).

## 10. Sesi v7.6.3 — audio, pengaturan 3D, perbaikan batal-interaksi (9–10 Nov 2026)
**Selesai & teruji (Playwright + stub `/api/state`):**
- `world3d/audio.js`: mesin WebAudio prosedural (tanpa file aset, RNG deterministik). Langkah kaki (keras di jalan/lembut di rumput), ketuk, pintu, klik UI, mesin kendaraan 2 suara (gain `(1-d/16)^2*0.16`, sirene dalam 12 unit), dengung pasar (`(1-d/9)*0.1`), mesin SPBU/terminal (`(1-d/6)*0.05`), jangkrik malam, burung siang, hujan. Terbuka hanya setelah gestur pengguna (kebijakan autoplay).
- Panel **Pengaturan** di menu 3D: volume utama/efek/suasana, bisu, sensitivitas kamera, sensitivitas cubit, ukuran UI, bayangan, jarak render, hemat baterai (batas ~30 fps + pixelRatio 1). Disimpan di blob save yang sudah ada (`settings.w3d` via `E.setPref3D`; tanpa localStorage, tanpa tabel baru).
- Bug nyata ditemukan tes & diperbaiki: mengetuk tempat lain saat jeda interaksi (sudah tiba di bangunan) memicu `onBuilding(undefined)` → `TypeError ... 'hours'`. Kini `walkTo/goBuilding` mereset `act` dan `pending` divalidasi.
- Tes baru: `tests/world3d-audio.test.mjs` (12 uji) + uji "ketukan saat jeda interaksi" di input test (11 uji). Masuk `npm test`.
**Tidak bisa diverifikasi di sandbox:** semua suite server (butuh `express`, `better-sqlite3`), performa di Android 4 GB nyata, `PUT /api/game` nyata (hanya stub).
**Belum dikerjakan:** UI 3D mandiri (butir 5), 3 wilayah (6), NPC Quick Card/simulasi (4,18), interior/objek (3), simulasi kehidupan (8), simpan posisi (9), bangunan sesuai referensi (halaman, pagar, papan nama, Mall/Pabrik/Kafe), validasi aset (20), tombol "tak bisa ditekan" (pengguna belum menyebut tombolnya).

## 11. Sesi v7.6.4 — UI 3D mandiri tahap 1 (11 Nov 2026)
**Aturan dari pemilik (11 Nov):** selesaikan fitur/sistem PRD 3D dulu dan pastikan benar-benar berfungsi; dokumen BizSim V3 Big Update (disimpan di `docs/v3/`) adalah revisi/penambahan UNTUK VERSI BERIKUTNYA, bukan sekarang. Referensi model baru: `docs/ref/REF-bangunan-jalan-ui.png`, `REF-kendaraan-v3.png`, `REF-bangunan-lowpoly-ui.png` (10 mobil, 10 motor, sepeda/becak/andong/delman, bioskop/parlemen/Merah Putih/TK–universitas, jalan aspal/tol/jembatan/tanah/batu, sungai/laut, tas/inventaris, interior rumah, UI 3D).
**Selesai & teruji (`tests/world3d-services.test.mjs`, 19 uji, Playwright + stub API memakai katalog server asli):**
- `world3d/services.js`: panel layanan NATIVE di dunia 3D (tanpa pindah ke halaman 2D) untuk **Rumah** (kebutuhan, makan, istirahat, mandi, inventaris), **Warung**, **Toko Lokal**, **Klinik & Apotek** (katalog + checkout bersama `ui/checkout.js`, efek lewat `NE.start/addInventory`), **Balai Kerja** (lowongan, lamar, shift lepas, evaluasi/interview, terima/tolak tawaran, resign) dan **Bursa** (beli/jual lewat `E.trade`, satu saldo & portofolio). Semua memanggil engine yang sama dengan 2D; tombol yang tak boleh dipakai nonaktif + alasan.
- Bangunan tanpa panel native masih memakai daftar tautan 2D lama (Bank, Balai Desa, Pusat Marketplace, UMKM, Sekolah) — BELUM selesai.
**Belum dikerjakan:** panel native Bank/Balai/Marketplace/UMKM/Sekolah, ponsel/pesan/NPC chat, 3 wilayah, NPC Quick Card, interior, simulasi kehidupan, simpan posisi, model bangunan/kendaraan sesuai referensi baru (10 mobil, 10 motor, sepeda, becak, andong…), ukur Android 4 GB, suite server (butuh `express`, `better-sqlite3`).

## 12. Sesi v7.6.5 — UI 3D mandiri tahap 2 (11 Nov 2026)
Ditambah panel native (tanpa pindah ke 2D), semua lewat engine/endpoint yang sama dengan 2D, 34 uji di `tests/world3d-services.test.mjs`:
- **Bank Desa:** ringkasan, buat PIN (validasi 6 digit), buka rekening, setor/tarik/transfer (`/api/fin/pin|open|transfer`, `cashAdj` menerapkan kas sekali), riwayat.
- **Balai Desa:** jadwal hari ini + agenda 7 hari (`engine/agenda.js`) + jeda/lanjut waktu.
- **Pusat UMKM:** buka usaha (cek syarat/kunci), ubah harga, restock, tutup usaha (`E.openBusiness/setBizParam/restock/closeBiz`).
- **Sekolah:** status/nilai/dana dari `E.EDU` + belajar mandiri (`/api/edu/study`).
**Masih memakai tautan 2D / belum native:** Pusat Marketplace (4 aplikasi + pelacakan paket), ujian/materi/tugas/pendaftaran sekolah, kartu/dompet/kredit di Bank, Seller Center/Studio kreator/pinjaman usaha, Sosial (pesan, kontak, utang).
**Catatan uji:** stub API memakai katalog server asli tetapi logika pembayaran/pendidikan di stub disederhanakan; suite server asli belum bisa dijalankan di sandbox.
**Belum dikerjakan (tetap):** 3 wilayah, NPC Quick Card/simulasi/chat, ponsel, interior/objek, simulasi kehidupan, simpan posisi, model sesuai referensi baru (10 mobil, 10 motor, becak, andong, bioskop…), ukur Android 4 GB.
