/* ============================================================
   BizSim — central-orchestrator.js
   SATU TITIK KOORDINASI untuk semua sistem baru (poin 69).
   
   TIDAK membuat interval baru. File ini HOOK ke fungsi tick/
   processMonth yang SUDAH ADA di engine.js asli, lalu panggil
   semua engine baru dari situ. Kalau engine.js asli tidak punya
   nama fungsi persis seperti yang diasumsikan di sini, sesuaikan
   nama function call di bagian bawah file ini (lihat komentar).
   
   Depends on: SEMUA file core/*.js sudah di-load duluan.
   ============================================================ */

const BizSimOrchestrator = {
  initialized: false,

  // Panggil SEKALI saat game load (dari main.js, setelah State.load())
  init() {
    if (this.initialized) return;
    initNewSystems(); // dari data-models.js — extend State.data dengan struktur baru
    if (typeof initBizSimLifeSystems === "function") initBizSimLifeSystems();
    if (typeof NotificationEngine !== "undefined") NotificationEngine.init(); // FIX: aktifkan pencatatan histori notifikasi
    this.initialized = true;
    console.log("[BizSimOrchestrator] Sistem baru siap: Trading, Employee, Business, Career, Creator, Event, Economy, Notification");
  },

  // ---------- DAILY TICK ----------
  // Panggil dari dalam fungsi tick harian yang SUDAH ADA di engine.js asli.
  // Contoh integrasi di engine.js asli:
  //   processDay() {
  //     ...kode lama tetap disini...
  //     BizSimOrchestrator.onDayTick();
  //   }
  onDayTick() {
    if (!this.initialized) this.init();

    // Trading: cek harga tiap hari (liquidation, SL/TP)
    TradingEngine.processTick();

    // Employee: generate kandidat baru utk lowongan terbuka
    EmployeeEngine.generateCandidatesForOpenJobs();
    EmployeeEngine.processTrainingDaily();

    // Creator: proses review monetisasi, deadline project
    CreatorEngine.processCreatorDaily();

    // Event: coba trigger simulation event (chance kecil per hari)
    EventEngine.tryTriggerSimulationEvent(0.08);
    EventEngine.processEventDecay();

    // v5.1: incident recovery, loan timers, insurance, tasks/calendar
    if (typeof BizSimLifeEngine !== "undefined") BizSimLifeEngine.processDaily();

    // Business decision: auto-resolve keputusan yang tidak direspons (poin 49)
    if (typeof BusinessEngine !== "undefined") BusinessEngine.processDecisionTimeouts();

    // Achievement: cek unlock baru (poin 59)
    if (typeof EventNewsUI !== "undefined") EventNewsUI.checkAndUnlockAchievements();
  },

  // ---------- MONTHLY TICK ----------
  // Panggil dari dalam fungsi processMonth yang SUDAH ADA di engine.js asli.
  // Contoh integrasi:
  //   processMonth() {
  //     ...kode lama tetap disini (business revenue lama, dll)...
  //     BizSimOrchestrator.onMonthTick();
  //   }
  onMonthTick() {
    if (!this.initialized) this.init();

    // Economy: proses rantai makroekonomi DULUAN — bisnis & saham baca
    // multiplier hasil ekonomi ini di step selanjutnya (poin 63)
    EconomyEngine.processMonthlyEconomy();

    // Career: gaji player + cek promosi
    CareerEngine.processMonthlySalary();

    // Employee: gaji karyawan NPC + morale/turnover
    EmployeeEngine.processMonthlyEmployeeUpdate();

    // Business: update customer/reputation per bisnis yang dimiliki player
    if (State.data.businesses && State.data.businesses.length > 0) {
      State.data.businesses.forEach(biz => {
        const bizId = biz.id || biz.name; // sesuaikan dgn field id asli business object
        BusinessEngine.processMonthlyBusinessUpdate(bizId);
      });
    }

    // Creator: revenue bulanan (ad revenue, brand deal, dll)
    CreatorEngine.processCreatorMonthly();

    // v5.1: valuation, investor reporting, customer/competitor simulation,
    // business risk and financial processing
    if (typeof BizSimLifeEngine !== "undefined") BizSimLifeEngine.processMonthly();
  },

  // ---------- REAL-TIME PRICE TICK (jika ada, mis. tiap beberapa detik/menit game-time) ----------
  // Panggil dari fungsi update harga market yang sudah ada, SETELAH harga di-update
  onPriceTick() {
    if (!this.initialized) this.init();
    TradingEngine.processTick(); // re-check posisi trading setiap harga berubah
  },
};

/* ============================================================
   AUTO-HOOK (opsional, fallback jika integrasi manual sulit)
   
   Kalau kamu TIDAK mau edit engine.js asli secara manual, bagian
   di bawah ini mencoba "membungkus" fungsi processMonth/processDay
   yang sudah ada secara otomatis — TANPA mengubah isi function asli.
   
   Cara kerja: simpan referensi fungsi asli, lalu ganti dengan versi
   baru yang panggil fungsi asli DULU baru orchestrator.
   
   Uncomment blok ini HANYA JIKA nama fungsi di bawah cocok dengan
   engine.js asli kamu. Kalau nama beda, edit nama function-nya.
   ============================================================ */

/*
document.addEventListener("DOMContentLoaded", () => {
  // Tunggu State & Engine siap
  const hookInterval = setInterval(() => {
    if (typeof State !== "undefined" && State.data && typeof Engine !== "undefined") {
      clearInterval(hookInterval);

      BizSimOrchestrator.init();

      // Hook processDay jika ada
      if (typeof Engine.processDay === "function") {
        const originalProcessDay = Engine.processDay.bind(Engine);
        Engine.processDay = function (...args) {
          const result = originalProcessDay(...args);
          BizSimOrchestrator.onDayTick();
          return result;
        };
      }

      // Hook processMonth jika ada
      if (typeof Engine.processMonth === "function") {
        const originalProcessMonth = Engine.processMonth.bind(Engine);
        Engine.processMonth = function (...args) {
          const result = originalProcessMonth(...args);
          BizSimOrchestrator.onMonthTick();
          return result;
        };
      }
    }
  }, 100);
});
*/
