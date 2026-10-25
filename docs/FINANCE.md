# Personal Finance & Ekosistem Pembayaran Digital (Simulasi)

Status: **diimplementasikan & diuji** (server-authoritative). Server: `server/finance.cjs`, konfigurasi `server/life-catalog.cjs`. Klien: `engine/finance.js`, `ui/checkout.js`, `pages/finance.js`.

Semua merek fiktif: Bank Nusantara Raya, Bank Sakti Digital, TabunganKu Pelajar BRD; dompet DanaKita, JalanPay, Ovio, BelanjaPay. Tidak ada logo atau UI resmi yang disalin, dan tidak ada integrasi dengan layanan pembayaran nyata.

## Halaman
Keuangan (`finance.html`): Ringkasan (PIN, rekening gaji, skor kredit), Rekening Bank, Kartu (debit & kredit), Dompet Digital, Top Up, Transfer (termasuk setor/tarik tunai), Riwayat, Tagihan Kartu Kredit. Checkout muncul sebagai dialog dari Kehidupan (makan, belanja, pesan antar, klinik, transport).

## Aturan inti
- **Uang tunai** = saldo pemain di save; server menyesuaikannya lewat `fin_cash_log` berurutan (`fin_seq`), klien yang tertinggal ditolak (409 `finseq`).
- **Bank**: usia, setoran awal, biaya admin bulanan (tanggal 30), transfer antarbank, kuota gratis, limit tarik & debit harian, jam teller.
- **Debit**: terhubung rekening, bisa dinonaktifkan; ditolak bila saldo kurang atau kartu nonaktif.
- **Kredit**: syarat usia 21+, pendapatan 30 hari ≥ Rp 3 jt, limit 3× pendapatan (Rp 3–15 jt), tagihan tanggal 20, jatuh tempo +15 hari, minimum 5% / Rp 50 rb, bunga 1,75%/bulan, denda Rp 100 rb, skor kredit 300–850. Tidak bisa melebihi limit.
- **Dompet**: basic maks. Rp 2 jt, terverifikasi Rp 20 jt; biaya top up/tarik per merek.
- **Checkout**: metode ditentukan merchant (mis. warung: tunai & QRIS; antar: dompet JalanPay, kredit, COD). QRIS: pilih QRIS → sumber dana → konfirmasi → PIN → proses → hasil → tercatat.
- Cash mengurangi tunai, debit mengurangi rekening, kredit menambah utang, dompet mengurangi saldo dompet.

## Keamanan (simulasi)
- PIN 6 digit disimpan sebagai hash scrypt + salt; 3× salah → terkunci 60 detik.
- Validasi saldo, limit, jam, dan usia di server. UI baru menampilkan "berhasil" setelah respons server.
- Kunci idempoten per transaksi (`UNIQUE(visitor, idem)`) + guard in-flight per pemain → double submit/refresh tidak membuat transaksi ganda.
- Status yang benar-benar ada: `pending` (COD), `berhasil`, `gagal`, `reversed` (pembatalan pesanan).

## Uji
`node tests/finance.test.mjs` (14 uji): PIN hash & lock, buka rekening, setor/tarik, limit, kredit (persetujuan, limit, tagihan, bunga, denda), dompet, checkout per metode, COD, idempoten, double submit. QA browser: buat PIN, buka rekening pelajar, setor, tarik, PIN salah, bayar tunai & QRIS di warung.

## Batasan
- Nominal gaji yang dikirim ke rekening (`/api/fin/inbound`) masih berasal dari engine karier di klien.
- Karakter mulai usia 6 tahun, jadi dompet (13+), bank umum (17+), dan kartu kredit (21+) baru terbuka setelah waktu game berjalan lama.
