/* ============================================================
   BizSim — ui-interactions.js
   Micro-interaction helpers (poin 3): toast slide-in, animated
   number (harga berubah smooth), skeleton loading, bottom sheet
   controller, achievement unlock animation.
   
   Pure vanilla JS, tidak bentrok dengan ui.js asli — ini
   tambahan utility yang dipanggil dari UI module baru.
   ============================================================ */

const BSInteraction = {
  // ---------- TOAST NOTIFICATION (slide-in, poin 3 & 60) ----------
  showToast({ title, message, type = "info", duration = 3500 }) {
    const icons = { info: "ℹ", success: "✓", warning: "⚠", danger: "✕" };
    const colors = { info: "var(--bs-primary)", success: "var(--bs-success)", warning: "var(--bs-warning)", danger: "var(--bs-danger)" };

    const toast = document.createElement("div");
    toast.className = "bs-toast";
    toast.innerHTML = `
      <div style="width:32px;height:32px;border-radius:50%;background:${colors[type]}22;color:${colors[type]};display:flex;align-items:center;justify-content:center;font-weight:bold;flex-shrink:0;">${icons[type]}</div>
      <div style="flex:1;">
        <div style="font-weight:700;font-size:13px;color:var(--bs-text-primary);">${title}</div>
        ${message ? `<div style="font-size:12px;color:var(--bs-text-secondary);margin-top:2px;">${message}</div>` : ""}
      </div>
    `;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.classList.add("leaving");
      setTimeout(() => toast.remove(), 300);
    }, duration);

    return toast;
  },

  // ---------- ANIMATED NUMBER (portfolio/harga berubah smooth, poin 3) ----------
  animateNumber(element, fromValue, toValue, { duration = 600, formatter = (v) => Math.round(v).toLocaleString("id-ID") } = {}) {
    if (!element) return;
    const startTime = performance.now();
    const diff = toValue - fromValue;

    element.classList.remove("flash-up", "flash-down");
    void element.offsetWidth; // reflow trick untuk restart animasi
    element.classList.add(diff >= 0 ? "flash-up" : "flash-down");
    element.classList.add("bs-animated-number");

    function step(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = fromValue + diff * eased;
      element.textContent = formatter(current);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  },

  // ---------- BUTTON PRESS FEEDBACK (auto-apply ke semua .bs-btn & .bs-card--interactive) ----------
  initPressFeedback() {
    document.addEventListener("touchstart", (e) => {
      const target = e.target.closest(".bs-btn, .bs-card--interactive, .bs-nav-item");
      if (target) target.style.transform = "scale(0.96)";
    }, { passive: true });

    document.addEventListener("touchend", (e) => {
      const target = e.target.closest(".bs-btn, .bs-card--interactive, .bs-nav-item");
      if (target) setTimeout(() => { target.style.transform = ""; }, 100);
    }, { passive: true });
  },

  // ---------- BOTTOM SHEET CONTROLLER ----------
  openBottomSheet(contentHTML, { onClose } = {}) {
    const overlay = document.createElement("div");
    overlay.className = "bs-bottom-sheet-overlay";
    overlay.innerHTML = `
      <div class="bs-bottom-sheet" role="dialog">
        <div class="bs-sheet-handle"></div>
        <div class="bs-sheet-content" style="padding: 0 18px 24px;">${contentHTML}</div>
      </div>
    `;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeBottomSheet(overlay, onClose);
    });

    return overlay;
  },

  closeBottomSheet(overlayEl, onClose) {
    overlayEl.style.animation = "bsFadeIn 0.15s ease reverse";
    const sheet = overlayEl.querySelector(".bs-bottom-sheet");
    if (sheet) sheet.style.animation = "bsSheetIn 0.2s ease reverse";
    setTimeout(() => {
      overlayEl.remove();
      if (onClose) onClose();
    }, 180);
  },

  // ---------- MODAL CONTROLLER ----------
  openModal(contentHTML, { onClose } = {}) {
    const overlay = document.createElement("div");
    overlay.className = "bs-modal-overlay";
    overlay.innerHTML = `<div class="bs-modal">${contentHTML}</div>`;
    document.body.appendChild(overlay);

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) this.closeModal(overlay, onClose);
    });

    return overlay;
  },

  closeModal(overlayEl, onClose) {
    overlayEl.style.opacity = "0";
    setTimeout(() => {
      overlayEl.remove();
      if (onClose) onClose();
    }, 150);
  },

  // ---------- SKELETON LOADING HELPER ----------
  renderSkeletonCards(count = 3, height = 80) {
    let html = "";
    for (let i = 0; i < count; i++) {
      html += `<div class="bs-skeleton" style="height:${height}px;margin-bottom:12px;"></div>`;
    }
    return html;
  },

  // ---------- ACHIEVEMENT UNLOCK (poin 3, 59) ----------
  showAchievementUnlock({ title, description, icon }) {
    const overlay = document.createElement("div");
    overlay.className = "bs-modal-overlay";
    overlay.innerHTML = `
      <div class="bs-modal bs-achievement-unlock" style="text-align:center;padding:32px 24px;">
        <div style="width:72px;height:72px;border-radius:50%;background:var(--bs-gradient-gold);margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:32px;">${icon || "🏆"}</div>
        <div style="font-size:12px;color:var(--bs-text-secondary);font-weight:700;letter-spacing:1px;margin-bottom:4px;">ACHIEVEMENT UNLOCKED</div>
        <div style="font-size:18px;font-weight:800;color:var(--bs-text-primary);margin-bottom:6px;">${title}</div>
        <div style="font-size:13px;color:var(--bs-text-secondary);margin-bottom:20px;">${description}</div>
        <button class="bs-btn bs-btn-primary bs-btn-block" onclick="this.closest('.bs-modal-overlay').remove()">Keren!</button>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  },

  // ---------- EXPAND/COLLAPSE ----------
  toggleCollapse(elementId) {
    const el = document.getElementById(elementId);
    if (el) el.classList.toggle("expanded");
  },

  // ---------- STICKY HEADER SCROLL DETECTION ----------
  initStickyHeaderShadow() {
    const headers = document.querySelectorAll(".bs-sticky-header");
    if (headers.length === 0) return;
    window.addEventListener("scroll", () => {
      headers.forEach(h => {
        h.classList.toggle("scrolled", window.scrollY > 4);
      });
    }, { passive: true });
  },
};

// Auto-init saat DOM ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    BSInteraction.initPressFeedback();
    BSInteraction.initStickyHeaderShadow();
  });
} else {
  BSInteraction.initPressFeedback();
  BSInteraction.initStickyHeaderShadow();
}
