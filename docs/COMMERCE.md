# BizSim — Retail & Commerce (v7.2.0)

Simulasi belanja offline & online. Semua merek, toko, kurir, dan pembayaran adalah **fiktif/simulasi**.

## Arsitektur
- `server/shop-catalog.cjs` — data game: 11 toko, 42 produk, aturan ongkir/promo/voucher/loyalitas/pencapaian, bonus produk.
- `server/commerce.cjs` — sumber kebenaran: kuotasi, stok, checkout, jadwal pemenuhan, batal/retur/refund, klaim, reward. Memakai inti keuangan (`finance.cjs`: PIN, limit, buku transaksi, uang tunai bernomor `fin_seq`).
- `public/assets/js/engine/shop.js` (API klien), `ui/shop-checkout.js` (dialog bayar), `pages/shop.js` + `shop.html` (Toko, Keranjang, Pesanan/Order Center, Reward, Notifikasi).
- `core.js`: `applyShopGrants` + `S.shopSeq`; `PUT /api/game` menolak save yang belum memuat hadiah terbaru (409 `shopseq`), sama seperti `finseq`.

## Model data (tabel baru)
`shop_orders`, `shop_events` (riwayat status, UNIQUE per pesanan+kode), `shop_stock` (per pemain, isi ulang malas per hari game), `shop_notifs`, `shop_rewards` (UNIQUE per pesanan+bonus), `shop_grants` (berurut), `shop_vouchers`, `shop_loyalty`, `shop_once`, kolom `players.shop_seq`.

## Aturan utama
- Rupiah; harga, stok, ongkir, diskon, total dihitung server. Klien hanya kirim id, variasi, jumlah.
- **Status pembayaran** (`paid`, `cod_pending`, `failed`, `refunded`, `partially_refunded`, `cancelled`) terpisah dari **status pemenuhan** (`confirmed → preparing/processing → packed → handed_to_courier → in_transit → arriving → delivered/ready_for_pickup → completed`; cabang `cancelled`, `delivery_failed`, `return_requested`, `returned`).
- Jadwal tahap dibuat deterministik saat pesanan dibuat (seed id pesanan, jam sibuk, jarak antarkota, jam kerja penjual/kurir); status dan progress diturunkan dari jadwal dan jam simulasi — tanpa timer UI. Gangguan (ETA berubah, gagal kirim) ditentukan di jadwal.
- Idempoten: kunci `idem` per checkout; peristiwa dan reward memakai UNIQUE + UPDATE bersyarat; klaim kedua tidak memberi apa pun.
- Pembayaran gagal tercatat (pesanan `failed` + transaksi Gagal) dengan alasan; stok tidak berkurang.
- Batal: hanya pada tahap yang diizinkan jalur itu; refund penuh ke sumber pembayaran (riwayat tidak dihapus; transaksi asal `reversed`). COD dibayar tunai saat klaim; tunai kurang → pengiriman gagal.
- Retur: hanya paket `delivered`, belum diterima, dalam 3 hari, produk `returnable`. Rusak/tidak sesuai = refund penuh; berubah pikiran = dipotong ongkir, biaya layanan, Rp 8.000.
- Bonus (XP, penguasaan pelajaran, barang, voucher) berstatus `pending → received/ineligible/void`, hanya diberikan saat pesanan diterima, dengan alasan bila tidak memenuhi syarat.
- Integrasi: jam simulasi, Personal Finance (PIN/limit/rekening/kartu/dompet), inventori & kebutuhan (`consume`/`inv_add`/`need` grants), edukasi (mastery periode berjalan), notifikasi, dashboard.

## Endpoint
`GET /api/shop/catalog|orders|order/:id|summary|rewards|notifs|grants`, `POST /api/shop/quote|checkout|order/claim|order/cancel|order/return|notifs/read`.

## Pengujian
`npm run test:commerce` (13 skenario HTTP) + regresi penuh `npm test`. E2E Playwright (390px): toko → keranjang → checkout → Order Center → reload.

## Batasan
Belum diuji pada Turso/Vercel nyata (hanya shim libsql ketat). Pesanan lama (`fin_orders` Pasarku/JalanYuk) tetap berjalan di tab Kehidupan; toko baru ada di Belanja.
