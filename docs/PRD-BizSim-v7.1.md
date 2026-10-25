# PRD — BizSim v7.1 Major Update

## Tujuan
Menerapkan redesain nyata pada source asli `BizSim.zip`, bukan menyalin struktur dari ZIP referensi v8.4.0. Struktur internal dipertahankan; nama folder induk rilis adalah `BizSim-v7.1`.

## Keputusan struktur
- Entry point tetap di `public/*.html`; CSS tetap di `public/assets/css/bizsim.css`.
- Modul `engine`, `data`, `pages`, `server`, dan `tests` dipertahankan pada lokasi semula.
- Engine bisnis, kalender, trading, investasi, kebutuhan, pendidikan, pekerjaan, dan Creator Studio tidak ditulis ulang.
- Jalur YouTube lama yang menduplikasi Creator Studio di halaman karier dihapus dari UI. Migrasi data lama tetap dipertahankan agar save pemain tidak hilang.

## UI/UX
- Setiap halaman memiliki tema: Beranda navy, Pasar navy gelap, Investasi emerald, Bisnis terracotta, Karier violet, Pendidikan biru, Creator Studio teal, Keuangan teal, Kehidupan coral, Kalender indigo.
- Ikon memakai SVG konsisten dari helper lokal, tanpa emoji dan tanpa ketergantungan font eksternal.
- CSS menambahkan safe-area Android, overflow wrapping, grid mobile satu kolom, dialog responsif, dan bottom navigation yang menghormati safe area.
- Status umum Creator Studio diterjemahkan ke Bahasa Indonesia.
- Enam avatar SVG lokal disediakan untuk pembuatan karakter dan edit profil. `avatarId` divalidasi dan disimpan di profil server.

## Aturan usia
- Karakter baru tetap berusia 6–7 tahun sesuai kalender awal dan memulai jalur pendidikan dari SD.
- Batas aktivitas memakai `AGE_RULES` dan konfigurasi platform di simulation engine.
- Toggle uji yang memaksa usia kreator 18 tahun dihapus dari UI dan `creatorAge()` sekarang mengembalikan usia karakter sesungguhnya.
- Aturan usia bisnis, investasi, trading, dan karier yang telah ada tetap di engine; tidak dibuat ulang di UI.

## Creator Studio
- Progres tetap dihitung dari `hoursDone / hoursTotal` pada state produksi.
- Progres memperlihatkan ikon tahap aktif; penyuntingan memakai ikon gunting dan bar merah, tahap siap terbit memakai ikon unggah.
- Status utama diganti ke bahasa Indonesia. Tidak ada angka progres yang dibuat hanya untuk tampilan.

## Acceptance criteria
1. Struktur folder inti sama dengan arsip sumber; hanya root folder pada ZIP rilis yang bernama `BizSim-v7.1/`.
2. Semua modul punya tema halaman sendiri dan tampilan mobile memakai grid satu kolom pada breakpoint kecil.
3. Avatar lokal tersedia dan ID avatar tersimpan melalui API profil.
4. Creator Studio tidak dapat melewati aturan usia melalui toggle publik.
5. Jalur YouTube duplikatif di halaman karier tidak ditampilkan; migrasi save lama tidak dihapus.
6. Test kalender, kebutuhan, tes UI statis, serta syntax-check seluruh JS lulus.

## Batasan yang diketahui
- UI seluruhnya belum dibuktikan lewat screenshot visual pada perangkat Android fisik.
- Endpoint profil menggunakan SQLite server yang sudah ada; deployment harus menyediakan server BizSim, bukan hanya hosting file statis.
- Sebagian teks deskriptif dan istilah platform yang panjang di modul tetap memerlukan review bahasa manual; label utama, navigasi, dan status produksi sudah dilokalkan.
