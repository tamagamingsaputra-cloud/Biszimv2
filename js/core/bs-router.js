/* ============================================================
   BizSim — bs-router.js
   FIX BUG: navigasi ke halaman baru yang butuh parameter (mis.
   Business Detail perlu businessId) sebelumnya ditulis sebagai
   string "upgrade:${businessId}" tanpa parser — tombol akan
   gagal. File ini menyediakan cara AMAN untuk passing parameter
   tanpa perlu mengubah UI.navigate() asli milik ui.js kamu.
   
   Cara pakai di semua halaman baru: panggil BSNav.go('nama-halaman', {param}),
   lalu di dalam render function halaman tujuan, baca BSNav.params.
   ============================================================ */

const BSNav = {
  params: {},

  go(page, params = {}) {
    this.params = params;
    if (typeof UI !== "undefined" && typeof UI.navigate === "function") {
      UI.navigate(page);
    } else {
      console.warn(`[BSNav] UI.navigate('${page}') belum tersedia — pastikan sudah wired sesuai MASTER_INTEGRATION_GUIDE.md`);
    }
  },
};
