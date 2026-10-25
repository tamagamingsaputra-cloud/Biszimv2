# Content Creator Studio — Spesifikasi & Status Implementasi

Fitur karier kreator multi-platform (YouTube, TikTok, Instagram versi simulasi) di dalam BizSim. Kreator adalah **jalur karier/side income opsional** di bawah Career & Jobs, bukan kategori bisnis. Navigasi global tidak berubah; halaman baru `studio.html` dibuka dari tab **Career → Kreator · side income** (menu aktif tetap "Career & Jobs").

> Nama platform dipakai sebagai representasi game. Semua syarat, tarif, potongan, konversi koin, dan ambang monetisasi adalah **aturan simulasi BizSim**, bukan persyaratan resmi platform.

## Status: desain vs prototype vs teruji

| Lapisan | Status |
|---|---|
| Desain UI (11 bagian + detail platform + detail konten + laporan live) | Selesai, mengikuti design system BizSim |
| Simulation engine kreator (produksi, distribusi, audiens, live, monetisasi, sponsor) | Implementasi fungsional di klien (`engine/creator/`) |
| Penyimpanan | State kreator ikut state game → `PUT /api/game` (SQLite server). Bertahan setelah reload (diuji) |
| Teruji otomatis | Headless engine (3 skenario) + Playwright desktop 1440 px & mobile 390 px (lihat bagian Pengujian) |
| Belum | Server-authoritative untuk ekonomi kreator, uji perangkat Android fisik, uji beban jangka sangat panjang (>1 tahun game) |

## Struktur kode

```
public/studio.html
public/assets/js/data/creator-platforms.js   Konfigurasi platform (capability per platform), niche, alat, skill, tier, aksi live
public/assets/js/engine/creator/
  rules.js         Konstanta waktu (T=48 tick/hari, W=14 hari pemanasan), tren topik, persaingan, helper alat
  production.js    Tahap produksi, jam, biaya, risiko gagal, mutu akhir
  audience.js      Distribusi tayangan per tick: impresi, CTR/feed stay, retensi, saturasi, penurunan usia, rekomendasi ulang
  monetization.js  Status program (locked → eligible → review/active/off), dompet estimasi/final/dibayar, payout
  studio.js        API publik (createAccount, startProduction, publish, startLive, liveStep, requestProgram, withdrawDiamonds, buyGear, train, ...)
public/assets/js/pages/studio.js             Router hash + render
public/assets/js/pages/studio/
  common.js  overview.js  create.js  queue.js  live.js  money.js  analytics.js
```

Integrasi dengan sistem global (diperluas, tidak ditulis ulang): `core.js` memanggil `creatorTick(g)` setiap tick dan `creatorDay()` di akhir hari; jam mingguan dibagi antara sekolah, kerja, dan kreator (`weeklyHours()`); energi karakter; mode live mengganti tick 30 menit dengan langkah per menit simulasi. Data YouTube lama dimigrasikan otomatis ke akun YouTube baru.

## Capability matrix (simulasi)

| Kapabilitas | YouTube | TikTok | Instagram | Twitch / Facebook |
|---|---|---|---|---|
| Video panjang | Ya | — | — | rencana |
| Video pendek | Shorts | Video | Reels | rencana |
| Foto / carousel | — | Photo carousel | Foto, Carousel | rencana |
| Stories | — | Ya | Ya | rencana |
| Postingan komunitas teks/gambar | Ya | — | — | rencana |
| Premiere / jadwal | Ya | jadwal | jadwal | rencana |
| Live | Ya (16+, 50 subs dari HP; laptop/PC tanpa syarat subs) | LIVE (18+, 1.000 follower) | Live (16+) | rencana |
| Dukungan live | Super Chat, Super Stickers, Memberships | Gifts (koin → diamond) | Lencana | rencana |
| Program iklan/kreator | Partner (500 subs + 1.000 jam tonton 90 hari ATAU 1 jt views Shorts) | Program Kreator (10 rb follower + 100 rb views 30 hari) | — | rencana |
| Sponsor / affiliate / merch | Ya / Ya / Ya | Ya / Ya / — | Ya / Ya / — | rencana |

Setiap platform memiliki objek konfigurasi sendiri (`PLATFORMS[pid].formats`, `.live`, `.support`, `.programs`, `.payout`, `.metricDefs`). Twitch dan Facebook sudah didefinisikan dengan status `planned` sehingga muncul di matrix tetapi tidak bisa dipakai — menambah platform cukup menambah konfigurasi.

## Alur utama

1. **Akun** — nama akun (3–24 karakter), topik utama; semua akun mulai dari 0 follower. Terkunci di bawah usia 13 tahun simulasi (Settings punya mode uji usia kreator untuk QA).
2. **Create Content (10 langkah)** — platform → format → topik (tren & persaingan dari engine) → ide & judul → durasi/isi → kualitas → alat & skill → anggaran → mulai produksi (dialog konfirmasi biaya) → review & terbit. Draft bisa disimpan, dilanjutkan, digandakan, dibatalkan.
3. **Production Queue** — status Draft, In Queue, Researching, Recording, Editing, Reviewing, Ready to Publish, Published, Failed/Cancelled. Progres = jam selesai / jam total dari state engine (bukan animasi). Dikerjakan per 30 menit di luar tidur, sekolah, dan kerja; batas jam kreator per hari dapat diatur. Antrean bisa diurutkan, dijeda, dibatalkan (biaya yang sudah keluar tidak kembali).
4. **Terbit** — sekarang, dijadwalkan, atau Premiere (YouTube). Mutu akhir (ide, produksi, kemasan, kecocokan, durasi) ditampilkan sebagai faktor, bukan jaminan.
5. **Live Studio** — setup 9 langkah, jadwal live, dashboard (penonton bersamaan, chat & aktivitas, aksi host dengan jeda, dukungan masuk, biaya data), laporan sesi tersimpan. Saat live, lewati hari dinonaktifkan.
6. **Monetization** — tidak ada program yang aktif otomatis: syarat terpenuhi → status *eligible* + notifikasi → pemain mengajukan → aktif / ditinjau. Program aktif bisa dinonaktifkan. Dompet memisahkan **estimasi** (berubah-ubah), **final** (akhir bulan, setelah penyesuaian), **dibayar** (tanggal 21 bila ≥ ambang), dan **saldo diamond** (TikTok, ditarik manual, minimum Rp 100.000, proses 3 hari, biaya transfer + pajak simulasi).

## Model distribusi (ringkas)

Setiap konten yang terbit disimulasikan per tick (30 menit game):

- **Impresi** = (jangkauan follower × aktivitas jam × akhir pekan) + (penemuan × tren topik × momentum akun × mutu × keberuntungan konten [log-normal per konten]) × saturasi.
- **Saturasi**: `cap = POOL × faktor format × audiens niche × kecocokan × (1 + log10(1+follower)/2)`, `sat = (1 − jangkauan/cap)^2.2` — konten tidak bisa tumbuh tanpa batas.
- **Penurunan usia**: `P1 = P0 × exp(−umur / (halfLife × 6 + 3))`; tiap format punya half-life sendiri (Stories 0,5 hari, Shorts 1,6, video panjang 6).
- **Rekomendasi ulang & pencarian**: konten evergreen dapat muncul lagi (notifikasi "kembali direkomendasikan"), sehingga tayangan dapat **naik, turun, lalu naik lagi**.
- **Konten buruk** (mutu rendah, judul menyesatkan, hak cipta musik) dapat memakan biaya tanpa tayangan, menurunkan reputasi/momentum, atau terkena klaim/strike.
- **Follower churn** harian: `0,0006 + min(30, hari−7) × 0,00012`, maksimal 0,6%/hari, dikurangi skill Audience Management.
- **Live**: penonton bersamaan dari notifikasi follower × penemuan × mutu stream × skill Live Hosting × energi; gift/dukungan hanya bila program dukungan aktif, berasal dari penonton aktual (bukan angka acak bebas). Koin virtual dibedakan dari uang yang diterima (potongan platform ditampilkan).

Contoh hasil uji headless (seed tetap): konten TikTok #1 harian 1.578 → 3.356 → 929 → 86 → 4–5 (ekor), naik lagi ke 111 pada hari ke-38; video YouTube #2 tumbuh pelan 28 → 519 pada hari ke-17 lalu menurun ke 5/hari; video #6 menyentuh 3/hari lalu naik kembali ke 85 (rekomendasi ulang).

## Analytics

Per platform dengan periode 7/28/90 hari; metrik **tidak dicampur** antarplatform:
- YouTube: views, watch time, average view duration, retention, subscriber bersih (baru − berhenti), estimasi pendapatan.
- TikTok: video views, completion rate, average watch time, shares, follower bersih, performa LIVE.
- Instagram: reach, impressions, likes, saves, shares, profile visits, follower bersih.
Grafik hanya memakai data harian tersimpan; empty state bila belum ada 2 hari data. Tersedia sumber pertumbuhan, perbandingan format & topik, performa per konten, dan definisi metrik tiap platform.

## Tier kreator

Beginner → Growing (1.000 audiens, 10 konten) → Established (10 rb audiens, Rp 1 jt/30 hari, 40 konten) → Professional (100 rb audiens, Rp 10 jt/30 hari, 120 konten).

## Pengujian yang dilakukan

Otomatis, server lokal + Chromium (Playwright), desktop 1440×900 dan mobile 390×844 (emulasi `isMobile`):

| Skenario | Hasil |
|---|---|
| Akun terkunci di usia 6; nama akun tidak valid ditolak dengan pesan | Lulus |
| Buat akun YouTube, TikTok, Instagram | Lulus |
| Wizard 10 langkah untuk 3 platform/format berbeda, dialog konfirmasi | Lulus |
| Progres produksi dari engine (0/12,5 jam → 12,5/12,5 setelah 6 hari, antrean berurutan, menunggu saat tidur) | Lulus |
| Review & terbit; tayangan harian berubah per hari | Lulus |
| Live TikTok: program Gifts diajukan manual → live → gift (koin, potongan, bersih, diamond) → aksi host → akhiri → laporan | Lulus |
| Lewati hari ditolak selama live | Lulus |
| Tarik diamond di bawah minimum dinonaktifkan; penarikan diproses lalu dibayar ke saldo setelah 3 hari | Lulus |
| Pengajuan program (Sponsorship) → aktif; program tidak aktif otomatis | Lulus |
| Beli alat tanpa saldo: tombol nonaktif & engine menolak | Lulus |
| Reload: akun, konten, saldo sama | Lulus |
| Regresi Dashboard, Asset Market, Investments, Business, Career, Education, Studio (desktop & mobile) | Tanpa error konsol |

Catatan uji: beberapa skenario memakai pengaturan state khusus QA (saldo, follower TikTok 2.400, diamond tambahan) melalui hook yang hanya aktif di `localhost` dengan parameter `?visitor=`. Tidak diuji di perangkat Android fisik.

## Batasan

- Ekonomi kreator disimulasikan di klien lalu disimpan ke server; untuk produksi sebaiknya dipindah ke server agar tidak bisa dimanipulasi.
- Batas body JSON server 4 MB; konten > 120 hari dipadatkan riwayatnya, laporan live disimpan maksimal 40, konten dibatalkan maksimal 40.
- Angka (RPM, potongan, ambang) adalah keseimbangan game, bukan data riil.
