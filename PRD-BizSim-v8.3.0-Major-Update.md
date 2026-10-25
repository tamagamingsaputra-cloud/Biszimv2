# BizSim v8.3.0 — Major UI/UX, Profile & Education Update

## Tujuan
Meneruskan baseline v8.1.0 dalam folder perbandingan AI terpisah. Paket ini tidak mengganti engine global secara total. Fokus implementasi adalah mengurangi masalah layout pada Android, memperjelas identitas visual per fitur, memperkuat bahasa Indonesia pada pendidikan, menyiapkan aset SVG lokal, dan menjadikan SD kelas 1 sebagai skenario pendidikan awal baru.

## Baseline dan batasan
- Baseline source: `BizSim-v8.1.0-AI-Comparison-A` yang tersedia pada runtime.
- Folder baru: `BizSim-v8.3.0-AI-Comparison-A/`.
- Engine ekonomi, pasar simulasi, business catalog, career, Creator Studio, kalender, persistence dan rute lama dipertahankan kecuali perubahan terinci di bawah.
- Market tetap SIMULATED; tidak ada koneksi broker atau harga live.
- Canva digunakan untuk membuat design reference terpisah. Runtime game tidak bergantung pada Canva; ikon/avatar yang dibundel adalah file lokal.

## Perubahan yang diterapkan

### 1. Lapisan responsif dan layout
- CSS override baru `web/v830-major-update.css` ditambahkan terakhir ke `web/index.html`, termasuk fallback `noscript`.
- Elemen masthead, profil, nama, label dan kartu diberi batas lebar, wrapping dan overflow yang aman agar tidak memotong teks.
- Bar navigasi bawah tetap mengikuti navigasi global yang sudah ada; area konten mendapat ruang bawah untuk menghindari tabrakan dengan navigasi dan FAB.
- Grid status dashboard adaptif; empty state tidak dipaksa memenuhi layar.
- Perubahan tidak menggunakan fixed-height untuk kartu profil yang berisi biodata.

### 2. Identitas visual per halaman
- Dashboard: terang, navy dan abu-abu untuk prioritas informasi.
- Asset Market: terminal navy gelap dengan hijau profit dan merah loss.
- Investments: aksen emerald.
- Business: aksen terakota.
- Career & Jobs: aksen ungu.
- Education: aksen biru langit.
- Profile: aksen ivory/emas.
- Creator Studio: aksen violet.
- Warna fitur diterapkan bila root renderer mengekspos class halaman terkait. Halaman tanpa class root tersebut masih memakai fallback global dan perlu pemeriksaan visual lanjutan.

### 3. Aset lokal
- Menambahkan `web/assets/uiux-v830/icons/` berisi SVG dashboard, market, business, career, education, profile, calendar, creator.
- Menambahkan empat avatar SVG statis pada `web/assets/uiux-v830/avatars/` sebagai aset siap pakai.
- Sistem karakter lama sudah memiliki generator potret SVG dan editor tampilan (`App.v710Creator`, `App.v710SaveChar`); sistem tersebut dipertahankan sebagai sumber avatar interaktif utama. Paket ikon tambahan belum mengganti seluruh pemanggilan ikon inline secara otomatis.

### 4. Pendidikan
- Untuk profil pendidikan yang baru diinisialisasi, skenario default berubah dari `adult` menjadi `sd` (mulai SD kelas 1).
- Urutan pilihan skenario pendidikan kini menampilkan SD terlebih dahulu.
- Label jenjang, filter dan judul utama diterjemahkan/diperjelas dalam bahasa Indonesia.
- Data jenjang SD/SMP/SMA/SMK/perguruan tinggi dan aturan prasyarat yang ada tetap digunakan.
- Perubahan skenario hanya berlaku bagi data pendidikan yang belum memiliki state pendidikan tersimpan. Save lama yang sudah memiliki skenario tidak dipaksa berubah.

### 5. Sistem yang dipertahankan
- Engine market dan pencatatan transaksi.
- Business catalog dari source, modal/skill gate dan operasi bisnis.
- Career application dan payroll yang terhubung ke state.
- Creator queue, production progress dan publishing yang ada.
- Jam simulasi, kalender dan penyimpanan.
- Navigasi global dan route yang sudah ada.

## Yang tidak diklaim selesai
- Tidak mengklaim seluruh teks Inggris di semua halaman sudah diterjemahkan; paket ini hanya mengubah string pendidikan yang disentuh dan visual layer.
- Tidak mengklaim seluruh fitur lama telah dihapus; fitur tidak dihapus tanpa bukti bahwa route/state tidak digunakan.
- Tidak mengklaim semua halaman sudah memiliki foto/ilustrasi baru dari Canva. Canva dipakai sebagai referensi desain; file SVG lokal disertakan untuk runtime.
- Tidak mengklaim validasi visual pada perangkat Android fisik. Tes otomatis tidak menjamin browser chrome, ukuran font perangkat, atau semua breakpoint.
- Pembatasan usia karier/kreator belum diubah secara global dalam paket ini karena perlu sinkronisasi aturan server untuk mencegah bypass dari UI.

## Cara menjalankan
- Node.js >= 22.12.0
- `npm install`
- `npm start`
- Untuk regresi: `npm run test:all`

## Acceptance criteria
- Tidak ada horizontal overflow pada lebar 320–430px dalam smoke test CSS/manual.
- Biodata dan nama profil membungkus baris alih-alih terpotong.
- Bottom nav tidak menutupi bagian akhir konten.
- Asset Market tetap berlabel SIMULATED dan memiliki kontras profit/loss.
- Pendidikan baru memulai dari SD.
- Tes regresi existing tetap lulus sebelum paket dirilis.

### 6. Biodata karakter dan avatar
- Menambahkan `web/v830-profile-bio.js` sebagai wrapper profil yang menampilkan avatar karakter, umur simulasi, pendidikan tertinggi, reputasi/level, dan biodata.
- Biodata yang dapat diisi: tanggal lahir, jenis kelamin, tempat lahir, domisili, wali, latar keluarga, cita-cita.
- Informasi yang belum diisi ditampilkan sebagai “Belum ditentukan”; tidak ada tanggal lahir, wali, atau domisili yang dibuat-buat.
- Biodata disimpan di `localStorage` per akun/perangkat. Ini bukan penyimpanan lintas perangkat/server.
- Umur simulasi dimulai dari 6 tahun dan bertambah satu tahun setiap 56 hari game. Editor avatar interaktif lama tetap digunakan; avatar SVG contoh ikut dibundel.
