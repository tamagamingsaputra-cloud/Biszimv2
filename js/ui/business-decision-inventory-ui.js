/* ============================================================
   BizSim — business-decision-inventory-ui.js
   MELENGKAPI 3 CELAH DARI AUDIT:
   - Poin 49: modal keputusan bisnis (dulu dead code, sekarang aktif)
   - Poin 53: halaman kelola inventory (lihat stok, reorder, tambah produk)
   - Poin 58: tombol Schedule & Contract di profil karyawan
   ============================================================ */

const BusinessDecisionUI = {
  // Panggil ini di halaman manapun (mis. dashboard) untuk cek & tampilkan
  // keputusan bisnis yang menunggu direspons pemain
  checkAndShowPendingDecisions() {
    const pending = BusinessEngine.getPendingDecisions();
    if (pending.length === 0) return;
    this.openDecisionModal(pending[0].id);
  },

  renderPendingBanner() {
    const pending = BusinessEngine.getPendingDecisions();
    if (pending.length === 0) return "";
    return `
      <div class="bs-card bs-card--interactive bs-mb-12" style="background:#FFF3E0;border:1px solid var(--bs-warning);" onclick="BusinessDecisionUI.openDecisionModal('${pending[0].id}')">
        <div class="bs-flex bs-gap-8" style="align-items:center;">
          <span style="font-size:20px;">⚠️</span>
          <div>
            <div style="font-weight:700;font-size:13px;">${pending.length} Keputusan Bisnis Menunggu</div>
            <div class="bs-text-secondary" style="font-size:11px;">Ketuk untuk merespons</div>
          </div>
        </div>
      </div>
    `;
  },

  openDecisionModal(decisionId) {
    const decision = (State.data.businessDecisions || []).find(d => d.id === decisionId);
    if (!decision) return;
    const template = BusinessEngine.presentBusinessDecision(decision.businessId, decision.decisionType);
    if (!template) return;

    const biz = (State.data.businesses || []).find(b => (b.id || b.name) === decision.businessId);

    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="font-size:11px;color:var(--bs-warning);font-weight:700;margin-bottom:4px;">⚠️ ${decision.eventTitle}</div>
        <div style="font-size:17px;font-weight:800;margin-bottom:4px;">${template.title}</div>
        <div class="bs-text-secondary" style="font-size:12px;margin-bottom:6px;">${biz?.name || decision.businessId}</div>
        <div style="font-size:13px;margin-bottom:18px;">${template.description}</div>
        ${template.choices.map(c => `
          <button class="bs-btn bs-btn-outline bs-btn-block bs-mb-12" style="text-align:left;justify-content:flex-start;" onclick="BusinessDecisionUI.resolve('${decisionId}','${c.id}')">${c.label}</button>
        `).join("")}
        <div class="bs-text-secondary" style="font-size:10px;text-align:center;margin-top:8px;">Tidak direspons dalam ${decision.daysToRespond} hari = otomatis "Terima harga baru"</div>
      </div>
    `);
  },

  resolve(decisionId, choiceId) {
    const result = BusinessEngine.resolveDecision(decisionId, choiceId);
    document.querySelector(".bs-modal-overlay")?.remove();
    if (result.success) {
      BSInteraction.showToast({ title: "Keputusan Diterapkan", type: "info" });
      if (result.navigateTo === "supplier") {
        const decision = (State.data.businessDecisions || []).find(d => d.id === decisionId);
        if (decision) BSNav.go("supplier", { businessId: decision.businessId });
      }
      UI.refresh && UI.refresh();
    }
  },
};

/* ============================================================
   INVENTORY MANAGEMENT UI (poin 53)
   ============================================================ */
const InventoryUI = {
  renderInventoryPage(businessId) {
    const items = State.data.inventory[businessId] || [];
    const effects = BusinessEngine.getAggregatedUpgradeEffects(businessId);
    const maxCapacity = 50 + effects.inventorySlots;
    const currentTotal = items.reduce((a, i) => a + i.stock, 0);

    return `
      <div class="bs-page-enter">
        <div class="bs-flex" style="justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div class="bs-card-title" style="font-size:17px;">Inventory</div>
          <button class="bs-btn bs-btn-primary" style="min-height:40px;padding:8px 16px;" onclick="InventoryUI.openAddItemSheet('${businessId}')">+ Produk</button>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-flex" style="justify-content:space-between;font-size:12px;margin-bottom:6px;">
            <span>Kapasitas Gudang</span><span style="font-weight:700;">${currentTotal}/${maxCapacity}</span>
          </div>
          <div class="bs-progress-track"><div class="bs-progress-fill ${currentTotal >= maxCapacity ? 'danger' : ''}" style="width:${Math.min(100,(currentTotal/maxCapacity)*100)}%;"></div></div>
        </div>

        ${items.length === 0
          ? `<div class="bs-card bs-text-secondary" style="text-align:center;">Belum ada produk. Tambah produk pertama Anda!</div>`
          : items.map(item => this._renderItemCard(businessId, item)).join("")
        }
      </div>
    `;
  },

  _renderItemCard(businessId, item) {
    const isOutOfStock = item.stock <= 0;
    return `
      <div class="bs-card bs-mb-12" style="${isOutOfStock ? 'border:1.5px solid var(--bs-danger);' : ''}">
        <div class="bs-flex" style="justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:13px;">${item.name}</div>
            <div class="bs-text-secondary" style="font-size:11px;">${item.category} · Margin Rp${item.margin.toLocaleString("id-ID")}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:800;font-size:15px;color:${isOutOfStock ? 'var(--bs-danger)' : 'var(--bs-text-primary)'};">${item.stock}</div>
            <div class="bs-text-secondary" style="font-size:10px;">stok</div>
          </div>
        </div>
        ${isOutOfStock ? `<div style="font-size:11px;color:var(--bs-danger);font-weight:700;margin-top:6px;">⚠ Stok habis — tidak bisa dijual</div>` : ""}
        <button class="bs-btn bs-btn-outline bs-btn-block" style="margin-top:10px;min-height:38px;" onclick="InventoryUI.openReorderSheet('${businessId}','${item.id}')">Reorder Stok</button>
      </div>
    `;
  },

  openAddItemSheet(businessId) {
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Tambah Produk</h3>
      <input type="text" id="item-name" placeholder="Nama produk" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin-bottom:12px;">
      <input type="text" id="item-category" placeholder="Kategori" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin-bottom:12px;">
      <div class="bs-flex bs-gap-8" style="margin-bottom:16px;">
        <input type="number" id="item-buy" placeholder="Harga beli" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);">
        <input type="number" id="item-sell" placeholder="Harga jual" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);">
      </div>
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="InventoryUI.executeAddItem('${businessId}')">Tambah</button>
    `);
  },

  executeAddItem(businessId) {
    const name = document.getElementById("item-name")?.value || "Produk Baru";
    const category = document.getElementById("item-category")?.value || "Umum";
    const buyPrice = parseFloat(document.getElementById("item-buy")?.value) || 10000;
    const sellPrice = parseFloat(document.getElementById("item-sell")?.value) || 15000;
    BusinessEngine.addInventoryItem(businessId, { name, category, buyPrice, sellPrice, stock: 0 });
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    BSInteraction.showToast({ title: "Produk Ditambahkan", type: "success" });
    UI.refresh && UI.refresh();
  },

  openReorderSheet(businessId, itemId) {
    const item = (State.data.inventory[businessId] || []).find(i => i.id === itemId);
    const supplier = BusinessEngine.getActiveSupplier(businessId);
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 8px;">Reorder ${item.name}</h3>
      <div class="bs-text-secondary" style="font-size:12px;margin-bottom:16px;">
        Supplier aktif: ${supplier ? supplier.name : "Belum pilih supplier"} ${supplier ? `(${(supplier.priceMult*100).toFixed(0)}% harga normal)` : ""}
      </div>
      <label style="font-size:12px;font-weight:700;">Jumlah</label>
      <input type="number" id="reorder-qty" placeholder="20" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 16px;">
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="InventoryUI.executeReorder('${businessId}','${itemId}')">Konfirmasi Reorder</button>
    `);
  },

  executeReorder(businessId, itemId) {
    const qty = parseInt(document.getElementById("reorder-qty")?.value) || 0;
    const result = BusinessEngine.reorderStock(businessId, itemId, qty);
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    if (result.success) { BSInteraction.showToast({ title: "Stok Ditambahkan", message: `+${qty} unit`, type: "success" }); UI.refresh && UI.refresh(); }
    else BSInteraction.showToast({ title: "Gagal", message: result.error, type: "danger" });
  },
};

/* ============================================================
   EXTENSION: Schedule & Contract untuk profil karyawan (poin 58)
   Menambah 2 tombol yang belum ada di EmployeeBusinessUI.openEmployeeProfile
   TANPA mengubah/menulis ulang file employee-business-ui.js — cukup
   panggil EmployeeScheduleContractUI.openScheduleSheet/openContractSheet
   dari tombol tambahan yang kamu taruh di modal profil karyawan.
   ============================================================ */
const EmployeeScheduleContractUI = {
  SCHEDULE_OPTIONS: ["Shift Pagi (08:00-16:00)", "Shift Siang (12:00-20:00)", "Shift Malam (20:00-04:00)", "Fleksibel"],

  openScheduleSheet(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return;
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Jadwal Kerja — ${emp.name}</h3>
      ${this.SCHEDULE_OPTIONS.map(s => `
        <button class="bs-btn ${emp.schedule === s ? 'bs-btn-primary' : 'bs-btn-outline'} bs-btn-block bs-mb-12" onclick="EmployeeScheduleContractUI.setSchedule('${employeeId}','${s}')">${s}</button>
      `).join("")}
    `);
  },

  setSchedule(employeeId, schedule) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (emp) emp.schedule = schedule;
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    BSInteraction.showToast({ title: "Jadwal Diperbarui", type: "success" });
    UI.refresh && UI.refresh();
  },

  openContractSheet(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return;
    if (!emp.contract) {
      emp.contract = { type: "Kontrak 1 Tahun", startDate: emp.hireDate, probation: emp.monthsInPosition < 3 };
    }
    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:14px;">Kontrak — ${emp.name}</div>
        <div class="bs-card" style="background:var(--bs-surface-alt);font-size:12px;line-height:1.9;margin-bottom:16px;">
          Tipe Kontrak: <strong>${emp.contract.type}</strong><br>
          Mulai Bekerja: <strong>${emp.contract.startDate}</strong><br>
          Status: <strong>${emp.contract.probation ? "Masa Percobaan" : "Karyawan Tetap"}</strong><br>
          Jadwal: <strong>${emp.schedule || "Belum diatur"}</strong>
        </div>
        <div class="bs-flex bs-gap-8">
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="document.querySelector('.bs-modal-overlay').remove(); EmployeeScheduleContractUI.openScheduleSheet('${employeeId}');">Atur Jadwal</button>
          ${emp.contract.probation ? `<button class="bs-btn bs-btn-success" style="flex:1;" onclick="EmployeeScheduleContractUI.confirmPermanent('${employeeId}')">Jadikan Tetap</button>` : ""}
        </div>
      </div>
    `);
  },

  confirmPermanent(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (emp && emp.contract) {
      emp.contract.probation = false;
      emp.contract.type = "Kontrak Tetap";
      emp.loyalty = Math.min(100, emp.loyalty + 15);
    }
    document.querySelector(".bs-modal-overlay")?.remove();
    BSInteraction.showToast({ title: "Karyawan Diangkat Tetap", type: "success" });
    UI.refresh && UI.refresh();
  },
};
