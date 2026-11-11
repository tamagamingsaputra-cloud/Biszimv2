# BizSim 3D — Fase 0/1 (audit, arsitektur) + Fase 2/3 awal (Kampung 3D layar penuh) — v7.6.2

## 1. Keputusan teknologi (ADR-001)
- **Three.js r160** (MIT), file tunggal `public/assets/vendor/three/three.module.min.js` (~670 KB, ±160 KB gzip), dimuat sebagai ES module lokal — **tanpa CDN, tanpa bundler**, cocok dengan frontend vanilla ES-module dan Vercel statis.
- Alasan memilih Three.js dibanding Babylon.js: ukuran lebih kecil (Babylon ±2–3 MB), tidak butuh build step, cukup untuk dunia low-poly. Babylon tetap opsi bila nanti butuh editor/fisika bawaan.
- Aset: **semua model prosedural** (primitif low-poly, tanpa tekstur, geometri/material di-cache). Tidak ada aset pihak ketiga. Pipeline glTF + kompresi tekstur ditunda sampai dibutuhkan.

## 2. Referensi visual (jujur)
`kampungsebelah.com/kampung` terkunci login (hanya layar masuk yang terlihat: ilustrasi hangat, ayam, kucing jahe, pilih petak tanah). Isi dunianya tidak bisa dilihat sehingga **gaya diturunkan dari kesan itu saja** (palet hangat, rumah/warung kecil, pohon, jalan kampung) dan **tidak ada aset yang disalin**. Bila ada tangkapan layar dunia dalamnya, kirimkan agar bentuk karakter/bangunan bisa disesuaikan.

## 3. Arsitektur: dua renderer, satu core
```
 halaman 2D (life/shop/finance/…)      world3d.html
        │                                   │
        └──── engine/core.js (S), needs.js, calendar.js, server /api/* ────┘
                     satu profil · satu saldo · satu inventori · satu jam game
```
- `pages/world3d.js` memakai `mountShell` yang sama (boot, profil, jam, navigasi), lalu hanya **membaca** `E.S` (waktu, kebutuhan, saldo, aktivitas).
- `world3d/world.js` = renderer + input (click-to-move, kamera, siklus siang/malam dari jam game). `world3d/builders.js` = model prosedural. Tidak ada fetch, penyimpanan, atau perubahan saldo di folder `world3d/` (dijaga `tests/world3d.test.mjs`).
- Interaksi bangunan **mengarahkan ke alur 2D yang sudah divalidasi server** (mis. Warung Bu Sri → `life.html#makan`, merchant `warung`, jam 06–21 sama dengan `server/life-catalog.cjs`). 3D tidak membuat transaksi sendiri, jadi tidak mungkin menggandakan saldo/inventori.
- Perpindahan 2D↔3D: tautan biasa (tidak ada state tersalin). Uji otomatis: saldo identik sebelum/sesudah sesi 3D.

## 4. Kampung 3D v7.6.0 (layar penuh, isometrik) — yang sudah ada
Mengikuti dokumen "BizSim 3D PRD • Roadmap" (8 Nov 2026): layout HUD final (kiri atas profil, kanan atas uang/waktu/notifikasi, tengah dunia 3D, kiri bawah peta mini, kanan bawah aksi kontekstual, navigasi Peta/Ponsel/Bisnis/Sosial/Menu), Light/Dark mengikuti sistem, preset Low/Medium/High, fallback ke 2D.
- **Dunia:** grid 5×3 kavling (57×35 tile), jalan bermarka, jalur tanah, pohon, lampu jalan; kamera ortografik isometrik (geser, cubit/roda zoom, kompas memutar 90°, ikuti karakter, reset).
- **14 bangunan** terikat ke fitur 2D yang ada (tautan hash divalidasi tes): Rumah (istirahat/inventaris), Sekolah (Education), Klinik (Kesehatan), Warung Bu Sri (Makan & Minum; jam buka 06–21 dari katalog server; rolling door & kanopi beranimasi, NPC melambai), Balai Desa (Kalender, Sosial; jam dinding bergerak), Bank Desa (rekening, transfer, top up, tagihan), Toko Lokal (belanja/pesanan/reward), Balai Kerja (lowongan, payroll, magang), Bursa & Properti (market, portofolio, emas, tanah, deposito), Pusat Marketplace, Pusat UMKM & Studio (Business, Seller Center, Creator Studio).
- **Belum ada di sistem 2D → ditandai "Belum aktif" dan tidak dipalsukan:** SPBU & Bengkel, Terminal, Tempat Ibadah (taman tetap bisa dilihat).
- **Gerak:** tap tanah → A* 8 arah di grid (rintangan bangunan/pohon), tap bangunan → berjalan ke pintu → animasi hadap → sheet aksi (state: approach → interact → outcome); jalur titik-titik + jarak; peta mini bisa diketuk untuk berjalan.
- **Hidup:** pejalan kaki ambient dan lalu lintas (mobil/motor) di jalan (visual, deterministik), siang/malam dari jam game (jendela & lampu menyala malam), bendera, ticker bursa.
- **UI/ikon 3D sendiri:** ikon SVG berwarna (tanpa emoji), kartu bulat, bottom sheet, label bangunan berwarna per kategori. Tombol jeda/lanjut waktu di chip jam; kecepatan di Menu; kebutuhan karakter di Menu/profil.
- **Data:** hanya membaca `E.S` dan memakai halaman/engine 2D untuk semua transaksi; satu-satunya panggilan jaringan adalah baca notifikasi toko (read-only, engine/shop.js). Tes: saldo identik sebelum/sesudah sesi 3D.

### Belum dikerjakan (jujur, sesuai roadmap PRD)
Interior bangunan; NPC profil/Quick Card dari mesin Sosial (pejalan kaki saat ini hanya ambient); kendaraan/bahan bakar/SPBU/bengkel/terminal/ojek (belum ada di 2D); agama & kalender budaya; layanan publik (polisi/pemadam/pajak); konstruksi/renovasi & pertanian; cuaca; event dunia (kebakaran, dll.); chat/telepon dalam game; layar pemilihan mode 2D/3D saat login (3D diakses lewat menu "Kampung 3D"); model karakter/bangunan final glTF; audio. Semua di atas menunggu fitur sistem 2D-nya atau keputusan Anda.

## 5. Performa — yang sudah diukur dan yang belum
Diukur di Chromium headless dengan renderer **perangkat lunak (SwiftShader, jauh lebih lambat dari GPU ponsel)**: 85 draw call & ±14 rb segitiga (Medium, potret), 163 draw call & ±19 rb segitiga (High, lanskap), 64 geometri, **0 tekstur**, tanpa bayangan real-time; bangunan statis digabung per material. Ini bukan GPU ponsel, jadi **belum ada klaim lancar di Android 4 GB**. Mitigasi bawaan: pixel ratio ≤1,5 dan turun otomatis (hingga 0,75) bila frame >38 ms selama 3 dtk, render berhenti saat tab tersembunyi, antialias mati, bayangan blob murah.
**Wajib sebelum rilis 3D:** ukur di perangkat Android 4 GB nyata (FPS, frame time, memori, waktu muat, crash) dengan `?debug=1`.

## 6. Batas slice ini / risiko (RISK_REGISTER ringkas)
| Risiko | Status |
|---|---|
| Performa di Android kelas rendah belum terukur | Terbuka; ukur dulu sebelum menambah dunia |
| Tabrakan sederhana (kotak/lingkaran), belum ada navmesh/pathfinding | Cukup untuk slice; perlu grid/navmesh saat dunia lebih besar |
| Posisi pemain tidak disimpan (selalu mulai di jalan) | Disengaja: belum ada kontrak penyimpanan posisi dunia (Fase 1 lanjutan) |
| NPC hanya satu, sapaan template, belum terhubung ke mesin Sosial/NPC | Fase 4 |
| Model prosedural sederhana, belum glTF | Fase 3 (butuh keputusan gaya dengan pemilik) |
| Interaksi mengarah ke halaman 2D, belum panel in-place | Disengaja untuk mencegah duplikasi logika |
| Jaringan sandbox memblokir npm/CDN; three.js diambil dari tag GitHub r160 | Tercatat; lisensi disertakan |

## 7. Urutan fase berikutnya (satu deliverable per sesi)
1. Ukur performa di Android nyata, putuskan anggaran poligon/draw call.
2. Fase 1 lanjutan: `DOMAIN_CONTRACTS.md` (posisi dunia, lokasi, state objek) + migrasi DB kompatibel.
3. Fase 3: modular bangunan (`object_id, building_type, state, actions, animation_set, service binding`), lalu 3–5 bangunan (toko, kantor, sekolah).
4. Fase 4: NPC dari mesin Sosial/NPC yang sudah ada.
5. Model karakter/bangunan final (glTF + kompresi) setelah gaya disepakati.

## 8. v7.6.1 — koreksi input, collision, warna
Lihat `docs/HANDOFF.md` §8. Ringkas: bug kunci A* koordinat negatif diperbaiki; tujuan = titik ketuk; jalur dihaluskan; hasil ketukan dihitung saat sentuh turun; cahaya disesuaikan satuan fisik Three r160 + saturasi seragam; collider lingkaran NPC/kendaraan dengan menyelip, mengalah berbatas waktu, pengawas kemajuan. API QA `world.qa/destination/route/actors/pending` (read-only, untuk tes). Tes: `world3d-path`, `world3d-input`.

## 9. v7.6.2 — model (vehicles.js, people.js), collider kapsul
Lihat `docs/HANDOFF.md` §9.

## 10. v7.6.3 — audio & pengaturan
`world3d/audio.js` (`createAudio`: `unlock/step/door/tap/ui/setRain/setVolumes/update/probe`) dipanggil dari `world.js` (`audio`, `setOptions`, `options`). Panel Pengaturan di `pages/world3d.js` (`settingsHtml`, `setPref` → `E.setPref3D`). Preferensi: `S.settings.w3d`. Tes: `npm run test:world3d-audio`.
