# Mode Lokal (tanpa backend)

BizSim sekarang berjalan penuh di browser. Tidak ada server, API, maupun API key. Cocok untuk Cloudflare Pages atau hosting statis lain (folder publish: `web`).

- **Login:** username (3-30 karakter: huruf kecil, angka, `.` `_` `-`) dan password (min. 6 karakter).
- **Data:** disimpan di IndexedDB browser pada perangkat ini. Menghapus data situs menghapus akun dan progres.
- **Cara kerja:** `web/local-api.js` mencegat panggilan `/api/*` dan menjalankan logika backend yang sama dari `web/engine/*.js`.
- **`web/engine` adalah salinan otomatis** dari `netlify/functions/*.mjs`. Setelah mengubah file di `netlify/functions`, jalankan `npm run sync:local`.
- **Layar putih:** `index.html` kini menampilkan pesan error di layar bila ada skrip yang gagal, dan font Adobe dimuat tanpa memblokir tampilan.
- **Kembali ke server:** ubah `<meta name="bizsim-mode" content="local">` menjadi `content="server"`. Form login tetap memakai username; server menerimanya sebagai email.

## Jika layar masih putih (Vercel / Cloudflare Pages)
Layar putih tanpa tulisan apa pun berarti HTML baru belum tersaji. Biasanya karena folder deploy salah.

1. Buka `https://NAMA-SITUS/ping.txt`. Harus tampil teks `BizSim 7.2.0 (fixed4) OK`. Jika 404 atau kosong, folder yang di-deploy bukan folder `web`.
2. Buka `https://NAMA-SITUS/diag.html` (atau `/web/diag.html` bila situs menyajikan folder induk). Tunggu "Selesai", lalu kirim seluruh teksnya.
3. Pengaturan hosting:
   - **Vercel:** `Root Directory` = folder proyek (yang berisi `vercel.json`, contoh `BizSim-v7.1.0`). `vercel.json` sudah mengarahkan `Output Directory` ke `web`. Atau set `Root Directory` langsung ke `.../web` tanpa Build Command.
   - **Cloudflare Pages:** `Build output directory` = `web`, tanpa build command.
4. Semua jalur file di `web/index.html` bersifat relatif, jadi aplikasi juga jalan bila disajikan dari `/web/`. `index.html` di folder induk otomatis mengarahkan ke `web/`.
5. Setelah login muncul, versi yang tampil di layar pemuatan adalah `7.2.0 (fixed4)`. Bila tulisan itu tidak muncul, yang tampil masih versi lama (cache atau deploy belum terbaru).
