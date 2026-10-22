/* ============================================================
   BizSim — detail-pages-ui.js
   ASSET DETAIL (poin 50) & BUSINESS DETAIL (poin 51) — halaman
   lengkap saat user membuka satu asset atau satu bisnis.
   ============================================================ */

const DetailPagesUI = {
  // ==================== ASSET DETAIL (poin 50) ====================
  renderAssetDetail(assetId) {
    const asset = State.data.market?.assets?.[assetId];
    if (!asset) return `<div class="bs-card">Asset tidak ditemukan</div>`;

    const illustrationType = this._assetIllustrationType(assetId, asset);
    const ownedQty = this._getOwnedQuantity(assetId);
    const eco = EconomyEngine.getSummary();

    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        <div class="bs-card--hero bs-mb-12" style="text-align:center;">
          <div style="width:64px;height:64px;margin:0 auto 10px;">${BSIllustration.asset(illustrationType, 64)}</div>
          <div style="font-size:20px;font-weight:800;">${assetId.toUpperCase()}</div>
          <div style="font-size:26px;font-weight:800;margin-top:8px;">Rp${asset.price.toLocaleString("id-ID")}</div>
          <div style="font-size:13px;font-weight:700;color:${(asset.changePct||0) >= 0 ? '#C8FFD8' : '#FFD0D0'};">
            ${(asset.changePct||0) >= 0 ? "▲" : "▼"} ${Math.abs(asset.changePct||0).toFixed(2)}%
          </div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-card-title bs-mb-12" style="font-size:13px;">Informasi Fundamental</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;font-size:12px;">
            <div><div class="bs-text-secondary">Kategori</div><div style="font-weight:700;text-transform:capitalize;">${asset.type || "-"}</div></div>
            <div><div class="bs-text-secondary">Risk Level</div><div style="font-weight:700;">${this._riskLabel(asset)}</div></div>
            <div><div class="bs-text-secondary">Likuiditas</div><div style="font-weight:700;">${asset.liquidity || 70}/100</div></div>
            <div><div class="bs-text-secondary">Volatilitas</div><div style="font-weight:700;">${(asset.volatility || 2.5).toFixed(1)}%</div></div>
          </div>
        </div>

        <div class="bs-chart-container bs-mb-12" style="height:140px;display:flex;align-items:center;justify-content:center;">
          <canvas id="asset-detail-chart" width="300" height="120" style="max-width:100%;"></canvas>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-card-title bs-mb-12" style="font-size:13px;">Kepemilikan Anda</div>
          <div class="bs-flex" style="justify-content:space-between;font-size:13px;">
            <span>Jumlah Dimiliki</span><span style="font-weight:700;">${ownedQty} unit</span>
          </div>
          <div class="bs-flex" style="justify-content:space-between;font-size:13px;margin-top:6px;">
            <span>Nilai Portfolio</span><span style="font-weight:700;">Rp${(ownedQty * asset.price).toLocaleString("id-ID")}</span>
          </div>
        </div>

        <div class="bs-card bs-mb-12" style="background:var(--bs-surface-alt);">
          <div class="bs-card-title bs-mb-12" style="font-size:13px;">Eksposur Event Makroekonomi</div>
          <div style="font-size:12px;line-height:1.8;">
            Sentiment Pasar: <strong>${eco.marketSentiment}/100</strong><br>
            Inflasi Saat Ini: <strong>${eco.inflation}</strong><br>
            <span class="bs-text-secondary">Asset ini bisa terdampak breaking news — cek tab News untuk riwayat.</span>
          </div>
        </div>

        <div class="bs-flex bs-gap-8">
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="UI.navigate && UI.navigate('market')">Beli/Jual (Saham)</button>
          <button class="bs-btn bs-btn-primary" style="flex:1;" onclick="TradingUI.render('${assetId}'); UI.navigate && UI.navigate('trading');">Trading</button>
        </div>
      </div>
    `;
  },

  _assetIllustrationType(assetId, asset) {
    const id = assetId.toLowerCase();
    if (id.includes("btc") || id.includes("bitcoin")) return "bitcoin";
    if (id.includes("eth") || id.includes("ethereum")) return "ethereum";
    if (id.includes("gold") || id.includes("emas")) return "gold";
    if (id.includes("land") || id.includes("tanah")) return "land";
    if (id.includes("house") || id.includes("rumah")) return "house";
    if (id.includes("apartment")) return "apartment";
    if (id.includes("warehouse") || id.includes("gudang")) return "warehouse";
    if (id.includes("vehicle") || id.includes("kendaraan")) return "vehicle";
    if (id.includes("machine") || id.includes("mesin")) return "machine";
    if (asset.type === "crypto") return "crypto_generic";
    return "stock";
  },

  _riskLabel(asset) {
    const vol = asset.volatility || 2.5;
    if (vol > 6) return "Sangat Tinggi";
    if (vol > 3.5) return "Tinggi";
    if (vol > 1.5) return "Sedang";
    return "Rendah";
  },

  _getOwnedQuantity(assetId) {
    const holding = (State.data.portfolio || State.data.holdings || []).find?.(h => h.assetId === assetId);
    return holding?.quantity || holding?.qty || 0;
  },

  // ==================== BUSINESS DETAIL (poin 51) ====================
  renderBusinessDetail(businessId) {
    const biz = (State.data.businesses || []).find(b => (b.id || b.name) === businessId);
    if (!biz) return `<div class="bs-card">Bisnis tidak ditemukan</div>`;

    const reputation = BusinessEngine.getReputation(businessId);
    const customers = State.data.customers[businessId] || { count: 0, satisfaction: 50, loyalty: 50 };
    const employees = (State.data.employees || []).filter(e => e.businessId === businessId);
    const upgradeEffects = BusinessEngine.getAggregatedUpgradeEffects(businessId);
    const activeUpgradeLevels = Object.entries(State.data.businessUpgrades[businessId] || {});
    const growthStatus = State.data.businessGrowthStatus?.[businessId]; // v5.0: RealismEngine output
    const growthLabel = { thriving: "Berkembang Pesat", stable: "Stabil", struggling: "Kesulitan", failing: "Kritis" }[growthStatus];
    const growthColor = { thriving: "var(--bs-success)", stable: "var(--bs-primary)", struggling: "var(--bs-warning)", failing: "var(--bs-danger)" }[growthStatus];

    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        <div class="bs-card--hero bs-mb-12">
          <div style="width:64px;height:64px;margin-bottom:10px;">${BSIllustration.business(biz.type || "generic", 64)}</div>
          <div style="font-size:20px;font-weight:800;">${biz.name}</div>
          <div style="font-size:12px;opacity:0.85;">Level ${biz.level || 1} · ${biz.location || "Lokasi tidak diketahui"}</div>
          ${growthLabel ? `<span class="bs-badge" style="background:${growthColor};color:white;margin-top:8px;display:inline-block;">${growthLabel}</span>` : ""}
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div class="bs-card"><div class="bs-text-secondary" style="font-size:10px;">Revenue Bulanan</div><div style="font-weight:800;color:var(--bs-success);">Rp${(biz.revenue || 0).toLocaleString("id-ID")}</div></div>
          <div class="bs-card"><div class="bs-text-secondary" style="font-size:10px;">Expense Bulanan</div><div style="font-weight:800;color:var(--bs-danger);">Rp${(biz.expense || 0).toLocaleString("id-ID")}</div></div>
          <div class="bs-card"><div class="bs-text-secondary" style="font-size:10px;">Profit</div><div style="font-weight:800;">Rp${((biz.revenue||0)-(biz.expense||0)).toLocaleString("id-ID")}</div></div>
          <div class="bs-card"><div class="bs-text-secondary" style="font-size:10px;">Reputasi</div><div style="font-weight:800;">${Math.round(reputation)}/100</div></div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-card-title bs-mb-12" style="font-size:13px;">Pelanggan</div>
          <div class="bs-flex" style="justify-content:space-between;font-size:12px;margin-bottom:6px;">
            <span>Jumlah Pelanggan</span><span style="font-weight:700;">${Math.round(customers.count)}</span>
          </div>
          <div class="bs-flex" style="justify-content:space-between;font-size:12px;margin-bottom:6px;">
            <span>Kepuasan</span><span style="font-weight:700;">${Math.round(customers.satisfaction)}%</span>
          </div>
          <div class="bs-progress-track"><div class="bs-progress-fill ${customers.satisfaction < 40 ? 'danger' : ''}" style="width:${customers.satisfaction}%;"></div></div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-flex" style="justify-content:space-between;align-items:center;">
            <div class="bs-card-title" style="font-size:13px;">Karyawan (${employees.length})</div>
            <button class="bs-btn bs-btn-outline" style="min-height:32px;padding:6px 12px;font-size:11px;" onclick="BSNav.go('employees', {businessId:'${businessId}'})">Kelola</button>
          </div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-flex" style="justify-content:space-between;align-items:center;">
            <div class="bs-card-title" style="font-size:13px;">Upgrade Aktif (${activeUpgradeLevels.length})</div>
            <button class="bs-btn bs-btn-outline" style="min-height:32px;padding:6px 12px;font-size:11px;" onclick="BSNav.go('upgrade', {businessId:'${businessId}'})">Lihat Semua</button>
          </div>
          ${activeUpgradeLevels.length > 0 ? `
            <div style="margin-top:10px;font-size:11px;color:var(--bs-text-secondary);">
              Total bonus revenue: +${Math.round((upgradeEffects.revenueMult-1)*100)}% · Efisiensi biaya: ${Math.round((1-upgradeEffects.expenseMult)*100)}%
            </div>
          ` : ""}
        </div>

        <div class="bs-flex bs-gap-8">
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="BSNav.go('supplier', {businessId:'${businessId}'})">Supplier</button>
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="BSNav.go('inventory', {businessId:'${businessId}'})">Inventory</button>
          <button class="bs-btn bs-btn-primary" style="flex:1;" onclick="BSNav.go('upgrade', {businessId:'${businessId}'})">Upgrade Bisnis</button>
        </div>
      </div>
    `;
  },
};
