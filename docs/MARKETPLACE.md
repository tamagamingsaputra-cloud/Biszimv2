# BizSim Marketplace (v7.3.0) — Prompt 1–4

Empat marketplace fiktif (Shopindo, LazaMall, Tokomart, BelanjaPlus) di `marketplace.html`.

- **Akun**: per marketplace, terikat ke karakter (visitor-id BizSim, tanpa autentikasi ganda). Password scrypt, sesi masuk/keluar di DB (`mp_accounts`), alamat, riwayat akun. Dihapus saat karakter baru.
- **Katalog**: 12 kategori / 36 subkategori, 108 produk, 340 listing. Cari, filter (kategori, harga, rating, lokasi), urutan, halaman, detail, wishlist, perbandingan harga lintas marketplace. Gambar = piktogram per subkategori (`ui/product-art.js`).
- **Keranjang & voucher**: stok dicek ulang di server; 8 jenis voucher (persen, nominal, gratis ongkir, cashback, toko, pengguna baru, event, eksklusif) dengan kuota, masa berlaku, minimal belanja, batas diskon, aturan tumpukan per marketplace.
- **Pembayaran**: saldo (rekening/dompet), transfer/VA, QRIS, kartu, COD, PayLater. Memakai inti Keuangan (PIN, rekening, tunai) — tidak ada saldo kedua. Idempoten.
- **PayLater**: aktivasi (usia ≥ 18, skor kredit), limit dari skor, tenor 1/3/6/12, biaya + bunga, tagihan bulanan (bulan = 30 hari), denda + bunga telat, limit turun, skor turun, blokir, pelunasan dipercepat.
- **Pesanan** masuk ke Order Center yang sama (`shop.html#pesanan`), sehingga pelacakan, batal, retur/refund, dan penambahan inventori memakai mesin pesanan yang sudah ada.

Tes: `npm run test:market` (25 tes HTTP nyata). Rute: `/api/mp/launcher`, `/api/mp/:market/*`.
Prompt 5–11 belum dikerjakan.
