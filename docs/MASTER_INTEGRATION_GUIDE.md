# 🚀 BizSim — MASTER INTEGRATION GUIDE
### Update Besar: Career, Employee, Trading, Business Depth, Creator Jobs, Event System, UI Overhaul

**PRINSIP UTAMA (poin 70, 75): FITUR LAMA TIDAK DIHAPUS/DIUBAH.**
Semua file di paket ini adalah TAMBAHAN. Tidak ada file lama yang perlu dihapus.

---

## 📦 ISI PAKET

```
bizsim-full/
├── css/
│   └── design-system.css          -> UI overhaul (poin 1-3)
├── js/
│   ├── core/
│   │   ├── data-models.js         -> WAJIB paling pertama dari semua file baru
│   │   ├── trading-engine.js      -> Trading Terminal (poin 9-17)
│   │   ├── employee-engine.js     -> Sistem karyawan (poin 20-30)
│   │   ├── business-engine.js     -> Upgrade bisnis, supplier, inventory (poin 18-19, 50-56)
│   │   ├── career-engine.js       -> Player career mode (poin 31-35)
│   │   ├── creator-engine.js      -> YouTuber/TikToker/Clipper (poin 36-40)
│   │   ├── event-engine.js        -> Real-world & simulation event (poin 43-49)
│   │   └── central-orchestrator.js-> Koordinator tunggal (poin 69)
│   └── ui/
│       ├── illustrations.js       -> SVG asset/karakter (poin 4-6, 42, 57, 73)
│       ├── ui-interactions.js     -> Toast, modal, animasi (poin 3)
│       ├── trading-ui.js
│       ├── employee-business-ui.js
│       ├── career-ui.js           -> GANTIKAN career.js Phase 1 lama (struktur beda)
│       ├── creator-ui.js
│       ├── event-news-ui.js
│       └── dashboard-profile-ui.js
├── assets/images/                 -> Folder terstruktur (poin 4), kosong = siap diisi
│   ├── assets/  business/  jobs/  characters/  events/  ui/
├── backend/
│   ├── migrations/002_add_career_employee_trading_creator.sql
│   └── routes/newFeatureRoutes.js
└── docs/ (folder ini)
```

**PENTING:** Kalau kamu masih punya `career.js` + `career-ui.js` dari Phase 1 sebelumnya (yang pakai `State.data.money`), **HAPUS/GANTI dengan `career-engine.js` + `career-ui.js` (v2) di paket ini** — struktur lama salah asumsi (asli BizSim pakai `State.data.cash`, bukan `money`).

---

## 1️⃣ URUTAN LOAD SCRIPT DI index.html

Tambahkan tag ini **SETELAH** script lama (`state.js`, `engine.js`, `ui.js`, dll), urutannya **HARUS PERSIS** seperti ini karena ada dependency:

```html
<!-- CSS Design System -->
<link rel="stylesheet" href="css/design-system.css">

<!-- ===== CORE ENGINES (urutan penting) ===== -->
<script src="js/core/data-models.js"></script>
<script src="js/core/trading-engine.js"></script>
<script src="js/core/employee-engine.js"></script>
<script src="js/core/business-engine.js"></script>
<script src="js/core/career-engine.js"></script>
<script src="js/core/creator-engine.js"></script>
<script src="js/core/event-engine.js"></script>
<script src="js/core/economy-engine.js"></script>
<script src="js/core/realism-engine.js"></script>
<script src="js/core/notification-engine.js"></script>
<script src="js/core/bs-router.js"></script>
<script src="js/core/central-orchestrator.js"></script>

<!-- ===== UI MODULES ===== -->
<script src="js/ui/illustrations.js"></script>
<script src="js/ui/ui-interactions.js"></script>
<script src="js/ui/trading-ui.js"></script>
<script src="js/ui/employee-business-ui.js"></script>
<script src="js/ui/career-ui.js"></script>
<script src="js/ui/creator-ui.js"></script>
<script src="js/ui/event-news-ui.js"></script>
<script src="js/ui/dashboard-profile-ui.js"></script>
<script src="js/ui/detail-pages-ui.js"></script>
<script src="js/ui/business-decision-inventory-ui.js"></script>

<!-- Inisialisasi (taruh SETELAH State.load() dipanggil di main.js) -->
<script>
  document.addEventListener("DOMContentLoaded", () => {
    // Tunggu State siap (biasanya main.js sudah handle load save)
    if (typeof State !== "undefined" && State.data) {
      BizSimOrchestrator.init();
    }
  });
</script>
```

---

## 2️⃣ HOOK KE engine.js ASLI (poin 69)

Buka `js/engine.js` asli kamu. Cari fungsi tick harian dan bulanan (nama mungkin `processDay()`, `tick()`, `processMonth()`, atau serupa — sesuaikan dengan nama asli).

**Tambahkan SATU BARIS** di akhir fungsi tersebut (jangan hapus kode lama):

```javascript
// Di dalam fungsi tick harian yang SUDAH ADA:
processDay() {  // atau nama asli fungsi kamu
  // ...SEMUA kode lama tetap di sini, tidak diubah...

  BizSimOrchestrator.onDayTick();  // <-- TAMBAHKAN BARIS INI
}

// Di dalam fungsi tick bulanan yang SUDAH ADA:
processMonth() {  // atau nama asli fungsi kamu
  // ...SEMUA kode lama tetap di sini, tidak diubah...

  BizSimOrchestrator.onMonthTick();  // <-- TAMBAHKAN BARIS INI
}
```

**Kalau kamu tidak yakin nama fungsi tick di engine.js asli**, buka file itu dan cari kata kunci `setInterval`, `tick`, `processDay`, atau `processMonth` — beri tahu saya isinya dan saya bantu titik hook yang persis.

**Alternatif tanpa edit manual:** file `central-orchestrator.js` punya blok auto-hook (di-comment) yang bisa di-uncomment kalau nama fungsi `Engine.processDay`/`Engine.processMonth` cocok — lihat komentar di file tersebut.

---

## 3️⃣ EXTEND State.data (via data-models.js — OTOMATIS)

`data-models.js` sudah handle ini otomatis lewat `initNewSystems()` yang dipanggil `BizSimOrchestrator.init()`. Tidak perlu edit `state.js` manual — struktur baru (`jobs`, `employees`, `tradingPositions`, dll) ditambahkan ke `State.data` tanpa menyentuh field lama.

**Cek di `state.js`:** pastikan fungsi save/load kamu (`localStorage.setItem`/`JSON.stringify(State.data)`) generic — kalau begitu, field baru otomatis ikut ke-save tanpa perlu edit apapun.

---

## 4️⃣ TAMBAHKAN NAVIGASI BARU (Bottom Nav / Menu)

Di `ui.js` asli, cari tempat render bottom navigation / menu utama. Tambahkan entry baru mengarah ke halaman baru:

```html
<div class="bs-bottom-nav">
  <!-- ...nav item lama tetap di sini... -->
  <button class="bs-nav-item" onclick="UI.navigate('trading')">Trading</button>
  <button class="bs-nav-item" onclick="UI.navigate('career')">Karir</button>
  <button class="bs-nav-item" onclick="UI.navigate('creator')">Creator</button>
  <button class="bs-nav-item" onclick="UI.navigate('news')">News</button>
</div>
```

Lalu di router/switch halaman `ui.js` (dimanapun kamu menentukan halaman mana yang di-render), tambahkan case baru:

```javascript
case "trading": container.innerHTML = TradingUI.render(); break;
case "career": container.innerHTML = CareerUI.renderCareerPanel(); break;
case "creator": container.innerHTML = getCreatorDashboard(); break; // lihat helper di bawah
case "news": container.innerHTML = EventNewsUI.renderNewsFeed(); break;
case "achievements": container.innerHTML = EventNewsUI.renderAchievementList(); break;
case "dashboard": container.innerHTML = DashboardUI.renderMainDashboard(); break;
case "profile": container.innerHTML = DashboardUI.renderProfile(); break;
```

Helper untuk dashboard creator dinamis (karena beda profesi beda dashboard, poin 41):
```javascript
function getCreatorDashboard() {
  const active = State.data.creatorProfiles?.activeProfession;
  if (active === "youtube") return CreatorUI.renderYoutubeDashboard();
  if (active === "tiktok") return CreatorUI.renderTiktokDashboard();
  if (active === "clipper") return CreatorUI.renderClipperDashboard();
  return CreatorUI.renderProfessionPicker();
}
```

---

## 4️⃣.5 MODUL TAMBAHAN: Economy, Realism, Notification, Detail Pages

**Economy Engine (poin 63)** — dipanggil OTOMATIS dari `onMonthTick()` orchestrator, tidak perlu setup manual. Rantai efeknya: inflasi naik → biaya operasional bisnis naik → daya beli turun → demand pelanggan turun → revenue bisnis ikut turun → saham tertentu ikut tertekan. Untuk memakainya di kalkulasi revenue **asli** milik `engine.js` kamu:

```javascript
// Di engine.js asli, saat hitung revenue bulanan bisnis:
const mult = BusinessEngine.getFinalMultipliers(businessId);
const finalRevenue = baseRevenue * mult.revenueMult;
const finalExpense = baseExpense * mult.expenseMult;
```

Kalau baris ini TIDAK ditambahkan, Economy Engine tetap jalan (mempengaruhi customer/reputation/saham) tapi revenue bisnis di engine lama belum ikut baca multiplier-nya — tambahkan baris di atas supaya efeknya terasa penuh di angka revenue.

**Realism Engine (poin 64)** — kumpulan fungsi probabilitas siap pakai (`rollInvestmentOutcome`, `rollBusinessGrowthOutcome`, `rollApplicationAcceptance`, dst). Engine yang sudah ada (employee, career, creator) SUDAH punya threshold probabilitas sendiri secara langsung. Realism Engine ini untuk kamu pakai kalau mau **menambah fitur investasi/bisnis baru lagi nanti** tanpa menulis ulang formula probabilitas dari nol — tinggal panggil salah satu fungsinya.

**Notification Engine (poin 60)** — melengkapi `State.notify()` lama dengan riwayat notifikasi yang bisa dibuka user (`NotificationUI.openCenter()`). Tambahkan tombol lonceng di header:
```html
<button onclick="NotificationUI.openCenter()" style="position:relative;">🔔 ${NotificationUI.renderBellBadge()}</button>
```

**Detail Pages (poin 50-51) & navigasi berparameter** — halaman detail saat asset/bisnis dibuka BUTUH parameter (businessId/assetId), jadi navigasinya pakai `BSNav.go()` (dari `bs-router.js`), bukan `UI.navigate()` langsung. Tambahkan case baru di router halaman `ui.js`:
```javascript
case "asset-detail": container.innerHTML = DetailPagesUI.renderAssetDetail(BSNav.params.assetId); break;
case "business-detail": container.innerHTML = DetailPagesUI.renderBusinessDetail(BSNav.params.businessId); break;
case "employees": container.innerHTML = EmployeeBusinessUI.renderEmployeeList(BSNav.params.businessId); break;
case "upgrade": container.innerHTML = EmployeeBusinessUI.renderUpgradeTracks(BSNav.params.businessId); break;
case "supplier": container.innerHTML = EmployeeBusinessUI.renderSupplierSelector(BSNav.params.businessId); break;
case "inventory": container.innerHTML = InventoryUI.renderInventoryPage(BSNav.params.businessId); break;
```
Untuk membuka halaman ini dari mana saja (misalnya dari daftar bisnis di UI lama kamu), panggil:
```javascript
BSNav.go('business-detail', { businessId: biz.id });
```
Halaman TANPA parameter (trading, career, news, dst di atas) tetap pakai `UI.navigate('nama')` seperti biasa — tidak perlu diganti ke `BSNav.go`.

**Keputusan bisnis (poin 49)** — saat event ekonomi terjadi, pemain HARUS merespons (bukan otomatis diam-diam). Panggil sekali saat dashboard/halaman utama dibuka (atau taruh di `onDayTick` kalau mau dicek tiap hari):
```javascript
BusinessDecisionUI.checkAndShowPendingDecisions();
```
`DashboardUI.renderMainDashboard()` SUDAH menampilkan banner peringatan otomatis kalau ada keputusan pending — baris di atas untuk memunculkan modalnya langsung (opsional, bisa dipicu dari mana saja).

---

## 5️⃣ BACKEND (opsional, untuk cloud save fitur baru)

1. Jalankan migration: `backend/migrations/002_add_career_employee_trading_creator.sql` terhadap database SQLite kamu.
2. Merge `backend/routes/newFeatureRoutes.js` ke struktur `routes/`, `controllers/` kamu — **file ini generik**, sesuaikan nama fungsi `respond`/`parseBody` dengan util asli kamu (lihat komentar di file).
3. Untuk real-world news (poin 43, 68), isi `NEWS_API_KEY` di Railway environment variables kalau mau pakai data berita sungguhan. Tanpa ini, sistem tetap jalan penuh pakai **Simulation Event** (poin 45).

**Kalau fitur baru TIDAK di-sync ke backend dulu**, semua tetap berfungsi 100% secara lokal (localStorage) — cloud save fitur baru optional, bisa menyusul.

---

## 6️⃣ ACHIEVEMENT CHECK (poin 59)

Panggil ini secara periodik (misal di `onDayTick` orchestrator, atau tambahkan manual):

```javascript
EventNewsUI.checkAndUnlockAchievements();
```

Sudah otomatis dipanggil kalau kamu tambahkan baris ini di `central-orchestrator.js` → `onDayTick()`:
```javascript
EventNewsUI.checkAndUnlockAchievements();
```
(Baris ini BELUM ada di file asli agar tidak crash kalau kamu load modul secara parsial — tambahkan manual setelah semua modul lain terpasang.)

---

## ✅ TESTING CHECKLIST (poin 72)

**Fitur LAMA (pastikan TIDAK rusak):**
- [ ] Login / Register / Google Login masih jalan
- [ ] Business simulation lama masih jalan
- [ ] Saham: Buy/Sell masih pakai ownership asli (qty, avg buy)
- [ ] Offline asset (properti, emas, tanah, kendaraan) masih ada
- [ ] Portfolio & net worth lama masih terhitung
- [ ] World events lama masih muncul
- [ ] Cloud save / database / REST API masih jalan
- [ ] Admin panel masih jalan
- [ ] Achievement & notification lama masih jalan

**Fitur BARU:**
- [ ] Trading Terminal: buka halaman, lihat chart placeholder, pilih leverage
- [ ] Trading: buka LONG, cek margin terpotong dari cash
- [ ] Trading: buka SHORT, cek posisi muncul di "Posisi Terbuka"
- [ ] Trading: set Stop Loss / Take Profit, cek tersimpan
- [ ] Trading: tutup posisi manual, cek P/L masuk ke cash
- [ ] Trading: simulasikan harga jatuh drastis, cek liquidation trigger
- [ ] Employee: buka lowongan dari halaman bisnis
- [ ] Employee: kandidat auto-muncul (tunggu beberapa hari game-time)
- [ ] Employee: buka CV kandidat, lihat skill
- [ ] Employee: jalani interview, cek skor keluar
- [ ] Employee: hire kandidat, cek masuk daftar karyawan dengan portrait SVG
- [ ] Employee: cek gaji otomatis kepotong dari cash tiap bulan
- [ ] Employee: employee dengan performance>75 & loyalty>60 & 6+ bulan bisa dipromosikan
- [ ] Employee: mulai training, tunggu selesai, cek skill naik
- [ ] Employee: employee dengan morale rendah bisa trigger resign
- [ ] Employee: counter-offer resign berhasil batalkan resign
- [ ] Business: buka upgrade track, beli salah satu, cek level naik & cash berkurang
- [ ] Business: pilih supplier, cek reorder stock pakai harga sesuai supplier
- [ ] Career: buka job listing NPC company
- [ ] Career: apply, jalani interview player, terima/tolak
- [ ] Career: terima offer, cek gaji masuk bulan berikutnya
- [ ] Career: auto-promosi setelah 12 bulan + performance>80
- [ ] Creator: mulai jadi YouTuber, upload video, cek subscriber naik
- [ ] Creator: cek monetisasi TIDAK langsung aktif (harus penuhi syarat dulu)
- [ ] Creator: ajukan monetisasi, tunggu review, cek approved/rejected
- [ ] Creator: mulai jadi TikToker, upload video, cek followers naik
- [ ] Creator: mulai jadi Clipper, terima project, selesaikan, cek payment masuk
- [ ] Event: simulation event muncul random (breaking news notification)
- [ ] Event: cek asset yang relevan bergerak sesuai sensitivity (bukan semua sama)
- [ ] Event: buka News Feed, lihat history
- [ ] Achievement: dapat achievement baru (First Job, First Employee, dst) dengan animasi unlock
- [ ] Dashboard: net worth menggabungkan cash+bisnis+trading dengan benar
- [ ] UI: bottom nav berfungsi di semua halaman baru
- [ ] UI: modal & bottom sheet muncul dengan animasi slide/fade
- [ ] UI: toast notification muncul untuk setiap aksi penting
- [ ] UI: mobile: semua halaman baru responsive di layar HP
- [ ] Economy: tunggu beberapa bulan game-time, cek biaya bisnis naik saat inflasi naik (lihat `EconomyEngine.getSummary()` di console)
- [ ] Notification: buka pusat notifikasi (`NotificationUI.openCenter()`), pastikan histori terisi dari aksi-aksi sebelumnya (bukan kosong)
- [ ] Detail Pages: buka Business Detail dari daftar bisnis, tombol "Kelola"/"Upgrade Bisnis"/"Supplier"/"Inventory" berpindah halaman dengan benar (bukan blank/error)
- [ ] Business Decision (poin 49): trigger event "Inflasi Meningkat", cek modal keputusan muncul dengan 4 pilihan, pilih salah satu, cek efek revenue/expense bisnis benar-benar berubah
- [ ] Business Decision: biarkan keputusan tidak direspons 5 hari, cek auto-resolve ke "Terima harga baru"
- [ ] Inventory (poin 53): tambah produk baru, reorder stok, cek stok bertambah dan cash berkurang; kosongkan stok, cek tidak bisa jual
- [ ] Employee Profile (poin 58): buka profil karyawan, cek tombol Schedule & Contract muncul dan berfungsi (pilih jadwal, lihat detail kontrak, angkat jadi tetap)

**Kalau ada tombol yang keliatan tapi tidak berfungsi — LAPORKAN, jangan biarkan (poin 72).**

---

## 🐛 TROUBLESHOOTING

**"BizSimOrchestrator is not defined"**
→ Cek urutan script tag persis seperti Section 1. `central-orchestrator.js` harus di-load setelah semua file `core/*.js`.

**"State.data.jobs is undefined"**
→ `BizSimOrchestrator.init()` belum dipanggil. Pastikan dipanggil SETELAH `State.load()` selesai (lihat Section 1, script inisialisasi).

**Karyawan tidak dapat kandidat baru**
→ `EmployeeEngine.generateCandidatesForOpenJobs()` dipanggil dari `onDayTick()`. Pastikan hook Section 2 sudah dipasang dan tick harian benar-benar jalan (game time berjalan).

**Trading position tidak update harga**
→ Trading pakai harga dari `State.data.market.assets[assetId].price` — pastikan asset ID yang dipakai trading SAMA dengan asset ID di market asli kamu.

**UI baru terlihat tidak konsisten dengan UI lama**
→ Class `.bs-*` di `design-system.css` ditambahkan sebagai layer baru. Kalau bentrok dengan class lama, cek CSS specificity — `design-system.css` harus di-load SETELAH `css/style.css` asli.

---

## 📝 CATATAN JUJUR (batasan implementasi)

1. **Gambar karakter/asset** memakai SVG vector buatan, BUKAN ilustrasi anime/foto asli (karena tidak ada tool image-generation di sesi pembuatan ini). Struktur folder `assets/images/` sudah siap — tinggal ganti fungsi di `illustrations.js` untuk pakai `<img src="assets/images/...">` begitu ada aset asli.
2. **Backend routes** (`newFeatureRoutes.js`) ditulis generik karena saya tidak punya akses langsung ke isi persis `utils/respond.js` & `utils/body.js` kamu — sesuaikan nama fungsi sebelum dipakai.
3. **Real-world event API** (poin 43, 68) perlu API key pihak ketiga (mis. NewsAPI) yang harus kamu daftarkan & pasang di environment variable Railway sendiri. Tanpa itu, Simulation Event tetap jalan penuh.
4. **Chart trading** memakai `<canvas>` placeholder kosong — hook ke `charts.js` asli kamu (kalau pakai Chart.js atau custom canvas) untuk render candlestick/line chart sungguhan.


---

# v5.1 ADDITIVE INTEGRATION — ECONOMIC LIFE SYSTEM

Tambahkan **setelah** `data-models.js` dan sebelum UI:
```html
<script src="js/core/bizsim-life-engine.js"></script>
```
Lalu setelah `central-orchestrator.js`:
```html
<script src="js/ui/bizsim-life-ui.js"></script>
```

`BizSimOrchestrator.init()` dan tick harian/bulanan v5.1 sudah memanggil engine baru jika file tersebut tersedia.

## Aturan career baru
Career baru dimulai dengan:
- Cash Rp0
- Tidak ada pekerjaan
- Tidak ada bisnis
- Tidak ada aset
- Portfolio kosong
- Reputation 0/field reputation tidak diberi modal
- Skill dasar sesuai career

Migrasi v5.1 **tidak mereset save lama**. Save yang sudah memiliki pekerjaan, cash, bisnis, portfolio, atau pengalaman dipertahankan.

## Sistem yang sekarang aktif
- Career from zero dan economic progression
- Investor offer + accept/reject/negotiation
- Investor type, risk tolerance, size dan horizon
- Business valuation
- Business-specific incident pools
- Partial damage per area
- Damage report + repair/temporary fix/delay
- Insurance + claim + deductible + payout
- Risk dashboard + prevention upgrades
- Emergency fund
- Business loan + approval + credit score + repayment
- Revenue/expense/profit/cash-flow/accounting state
- Product expansion, branch, location recommendation
- Competitor state + marketing campaign
- Customer segment state
- Ownership + partner + dividend policy
- Asset portfolio + allocation + P/L
- Monthly/yearly report
- Calendar, tasks, meetings
- Incident history

## Integrasi backend
Jalankan migration:
`backend/migrations/003_bizsim_life_v5_1.sql`

Tambahkan route map dari:
`backend/routes/lifeRoutes.js`

Route module tetap mengikuti convention backend v5.0 (`respond`, `parseBody`, `requireAuth`, database adapter). Jika nama/path util backend asli berbeda, sesuaikan hanya adapter route-nya; engine simulasi frontend tidak bergantung pada route tersebut.

## Keputusan bisnis
Pilihan supplier dan keputusan lain tidak otomatis dianggap menguntungkan. Setiap pilihan harus mengubah minimal satu variabel yang relevan: cost, revenue, quality, delivery, risk, reputation, inventory, atau cash flow.

## Partial damage
Tidak ada fungsi generik yang menghapus seluruh bisnis ketika incident terjadi. Incident hanya menandai `business._partialDamage[affectedArea]` dan memproses inventory/revenue yang memang terdampak.

## Data persistence
Semua state baru berada di `State.data`. Jika `State.save()` lama melakukan serialisasi seluruh `State.data`, data v5.1 ikut tersimpan. Backend persistence opsional tersedia melalui migration + route module.
