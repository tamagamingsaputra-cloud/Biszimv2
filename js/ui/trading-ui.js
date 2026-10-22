/* ============================================================
   BizSim — trading-ui.js
   TRADING TERMINAL UI — terpisah total dari halaman Saham (poin 12-17)
   
   Depends on: trading-engine.js, ui-interactions.js, illustrations.js
   ============================================================ */

const TradingUI = {
  currentAssetId: null,
  currentTimeframe: "1H",
  selectedLeverage: 1,
  selectedSide: null, // "long" | "short" saat user pilih sebelum konfirmasi

  TIMEFRAMES: ["1m", "5m", "15m", "30m", "1H", "4H", "1D", "1W"],

  // ---------- HALAMAN UTAMA TRADING TERMINAL ----------
  render(assetId) {
    this.currentAssetId = assetId || this.currentAssetId || Object.keys(State.data.market?.assets || {})[0];
    const asset = State.data.market.assets[this.currentAssetId];
    if (!asset) return `<div class="bs-card">Asset tidak ditemukan</div>`;

    const existingPosition = State.data.tradingPositions.find(p => p.assetId === this.currentAssetId && p.status === "open");
    const priceChangePct = asset.changePct || 0;
    const changeColor = priceChangePct >= 0 ? "var(--bs-success)" : "var(--bs-danger)";

    return `
      <div class="bs-page-enter" style="padding-bottom: 100px;">
        <!-- Header (poin 12) -->
        <div class="bs-card--hero" style="margin-bottom:14px;">
          <div class="bs-flex" style="justify-content:space-between;align-items:flex-start;">
            <div>
              <div style="font-size:12px;opacity:0.85;">TRADING TERMINAL</div>
              <div style="font-size:22px;font-weight:800;">${this.currentAssetId.toUpperCase()}</div>
            </div>
            <span class="bs-badge" style="background:rgba(255,255,255,0.2);color:white;">
              <span class="bs-status-dot online"></span> Market Open
            </span>
          </div>
          <div style="margin-top:14px;display:flex;align-items:baseline;gap:10px;">
            <span style="font-size:28px;font-weight:800;">Rp${asset.price.toLocaleString("id-ID")}</span>
            <span style="font-size:14px;font-weight:700;color:${priceChangePct >= 0 ? '#C8FFD8' : '#FFD0D0'};">
              ${priceChangePct >= 0 ? "▲" : "▼"} ${Math.abs(priceChangePct).toFixed(2)}%
            </span>
          </div>
        </div>

        <!-- Timeframe selector -->
        <div class="bs-tabs" style="margin-bottom:14px;overflow-x:auto;">
          ${this.TIMEFRAMES.map(tf => `
            <button class="bs-tab ${tf === this.currentTimeframe ? 'active' : ''}" onclick="TradingUI.setTimeframe('${tf}')">${tf}</button>
          `).join("")}
        </div>

        <!-- Chart placeholder (hook ke charts.js asli jika tersedia) -->
        <div class="bs-chart-container" style="margin-bottom:14px;height:180px;display:flex;align-items:center;justify-content:center;">
          <canvas id="trading-chart-canvas" width="320" height="160" style="max-width:100%;"></canvas>
        </div>

        <!-- Market stats (poin 12) -->
        <div class="bs-card" style="margin-bottom:14px;">
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:12px;">
            <div><div class="bs-text-secondary">High</div><div style="font-weight:700;">Rp${(asset.high || asset.price * 1.02).toLocaleString("id-ID")}</div></div>
            <div><div class="bs-text-secondary">Low</div><div style="font-weight:700;">Rp${(asset.low || asset.price * 0.98).toLocaleString("id-ID")}</div></div>
            <div><div class="bs-text-secondary">Volatility</div><div style="font-weight:700;">${(asset.volatility || 2.5).toFixed(1)}%</div></div>
          </div>
        </div>

        <!-- Existing position atau leverage selector -->
        ${existingPosition ? this._renderExistingPositionCard(existingPosition) : this._renderLeverageSelector()}

        <!-- Open positions list -->
        <div class="bs-mt-12">
          <div class="bs-card-title bs-mb-12">Posisi Terbuka (${TradingEngine.getOpenPositionsSummary().count})</div>
          ${this._renderOpenPositionsList()}
        </div>
      </div>

      <!-- Bottom action buttons (poin 13) -->
      <div style="position:fixed;bottom:0;left:0;right:0;padding:12px 16px calc(12px + env(safe-area-inset-bottom,0px));background:var(--bs-surface);box-shadow:0 -4px 20px rgba(0,0,0,0.08);display:flex;gap:10px;z-index:900;">
        ${this._renderActionButtons(existingPosition)}
      </div>
    `;
  },

  _renderLeverageSelector() {
    return `
      <div class="bs-card">
        <div class="bs-card-title bs-mb-12">Leverage (poin 14)</div>
        <div class="bs-flex bs-gap-8">
          ${TradingEngine.LEVERAGE_OPTIONS.map(lv => `
            <button class="bs-btn ${this.selectedLeverage === lv ? 'bs-btn-primary' : 'bs-btn-outline'}" style="flex:1;min-height:40px;" onclick="TradingUI.setLeverage(${lv})">${lv}x</button>
          `).join("")}
        </div>
        <div class="bs-text-secondary" style="font-size:11px;margin-top:8px;">Leverage tinggi = profit lebih besar, TAPI risiko liquidation lebih cepat.</div>
      </div>
    `;
  },

  _renderExistingPositionCard(pos) {
    const pnlColor = pos.unrealizedPnL >= 0 ? "var(--bs-success)" : "var(--bs-danger)";
    return `
      <div class="bs-card" style="border:1.5px solid ${pos.side === 'long' ? 'var(--bs-success)' : 'var(--bs-danger)'};">
        <div class="bs-flex" style="justify-content:space-between;align-items:center;margin-bottom:10px;">
          <span class="bs-badge ${pos.side === 'long' ? 'success' : 'danger'}">${pos.side.toUpperCase()} ${pos.leverage}x</span>
          <span style="font-weight:800;color:${pnlColor};">${pos.unrealizedPnL >= 0 ? "+" : ""}Rp${Math.round(pos.unrealizedPnL).toLocaleString("id-ID")}</span>
        </div>
        <div style="font-size:12px;color:var(--bs-text-secondary);line-height:1.7;">
          Entry: Rp${pos.entryPrice.toLocaleString("id-ID")}<br>
          Current: Rp${pos.currentPrice.toLocaleString("id-ID")}<br>
          Margin: Rp${pos.margin.toLocaleString("id-ID")}<br>
          Liquidation: <span style="color:var(--bs-danger);">Rp${Math.round(pos.liquidationPrice).toLocaleString("id-ID")}</span>
        </div>
        <div class="bs-flex bs-gap-8" style="margin-top:10px;">
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="TradingUI.openSLTPSheet('${pos.id}')">SL/TP</button>
        </div>
      </div>
    `;
  },

  _renderActionButtons(existingPosition) {
    if (!existingPosition) {
      // Belum ada posisi (poin 13)
      return `
        <button class="bs-btn bs-btn-danger" style="flex:1;" onclick="TradingUI.confirmOpenPosition('short')">SELL / SHORT</button>
        <button class="bs-btn bs-btn-success" style="flex:1;" onclick="TradingUI.confirmOpenPosition('long')">BUY / LONG</button>
      `;
    }
    if (existingPosition.side === "long") {
      return `
        <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="TradingUI.confirmClosePosition('${existingPosition.id}')">Close LONG</button>
        <button class="bs-btn bs-btn-success" style="flex:1;" onclick="TradingUI.confirmAddPosition('${existingPosition.id}')">Tambah LONG</button>
      `;
    }
    return `
      <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="TradingUI.confirmClosePosition('${existingPosition.id}')">Close SHORT</button>
      <button class="bs-btn bs-btn-danger" style="flex:1;" onclick="TradingUI.confirmAddPosition('${existingPosition.id}')">Tambah SHORT</button>
    `;
  },

  _renderOpenPositionsList() {
    const positions = State.data.tradingPositions || [];
    if (positions.length === 0) {
      return `<div class="bs-card bs-text-secondary" style="text-align:center;font-size:13px;">Belum ada posisi terbuka</div>`;
    }
    return positions.map(pos => {
      const pnlColor = pos.unrealizedPnL >= 0 ? "var(--bs-success)" : "var(--bs-danger)";
      return `
        <div class="bs-card bs-card--interactive bs-mb-12" onclick="TradingUI.render('${pos.assetId}'); UI.refresh && UI.refresh();">
          <div class="bs-flex" style="justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;">${pos.assetId.toUpperCase()} <span class="bs-badge ${pos.side === 'long' ? 'success' : 'danger'}">${pos.side.toUpperCase()}</span></div>
              <div class="bs-text-secondary" style="font-size:11px;">Size Rp${pos.size.toLocaleString("id-ID")} · ${pos.leverage}x</div>
            </div>
            <span style="font-weight:800;color:${pnlColor};">${pos.unrealizedPnL >= 0 ? "+" : ""}Rp${Math.round(pos.unrealizedPnL).toLocaleString("id-ID")}</span>
          </div>
        </div>
      `;
    }).join("");
  },

  setTimeframe(tf) { this.currentTimeframe = tf; UI.refresh && UI.refresh(); },
  setLeverage(lv) { this.selectedLeverage = lv; UI.refresh && UI.refresh(); },

  // ---------- KONFIRMASI BUKA POSISI (bottom sheet) ----------
  confirmOpenPosition(side) {
    const asset = State.data.market.assets[this.currentAssetId];
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 4px;">${side === "long" ? "Buka LONG" : "Buka SHORT"} — ${this.currentAssetId.toUpperCase()}</h3>
      <p class="bs-text-secondary" style="font-size:12px;margin-bottom:16px;">Harga saat ini: Rp${asset.price.toLocaleString("id-ID")}</p>
      <label style="font-size:12px;font-weight:700;">Size Posisi (IDR)</label>
      <input type="number" id="trade-size-input" placeholder="10000000" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 16px;font-size:14px;">
      <div class="bs-text-secondary" style="font-size:12px;margin-bottom:16px;">Leverage: ${this.selectedLeverage}x · Margin dibutuhkan: <span id="margin-preview">Rp0</span></div>
      <button class="bs-btn ${side === 'long' ? 'bs-btn-success' : 'bs-btn-danger'} bs-btn-block" onclick="TradingUI.executeOpenPosition('${side}')">Konfirmasi ${side === "long" ? "LONG" : "SHORT"}</button>
    `);

    setTimeout(() => {
      const input = document.getElementById("trade-size-input");
      if (input) {
        input.addEventListener("input", () => {
          const size = parseFloat(input.value) || 0;
          const margin = size / this.selectedLeverage;
          document.getElementById("margin-preview").textContent = "Rp" + Math.round(margin).toLocaleString("id-ID");
        });
      }
    }, 50);
  },

  executeOpenPosition(side) {
    const input = document.getElementById("trade-size-input");
    const size = parseFloat(input?.value) || 0;
    if (size <= 0) { BSInteraction.showToast({ title: "Size tidak valid", type: "warning" }); return; }

    const result = TradingEngine.openPosition({ assetId: this.currentAssetId, side, sizeIDR: size, leverage: this.selectedLeverage });
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();

    if (result.success) {
      BSInteraction.showToast({ title: "Posisi Dibuka", message: `${side.toUpperCase()} ${this.currentAssetId.toUpperCase()}`, type: "success" });
      UI.refresh && UI.refresh();
    } else {
      BSInteraction.showToast({ title: "Gagal", message: result.error, type: "danger" });
    }
  },

  confirmClosePosition(positionId) {
    const result = TradingEngine.closePosition(positionId);
    if (result.success) {
      BSInteraction.showToast({
        title: result.pnl >= 0 ? "Profit!" : "Loss",
        message: `${result.pnl >= 0 ? "+" : ""}Rp${Math.round(result.pnl).toLocaleString("id-ID")}`,
        type: result.pnl >= 0 ? "success" : "warning",
      });
      UI.refresh && UI.refresh();
    }
  },

  confirmAddPosition(positionId) {
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Tambah Posisi</h3>
      <input type="number" id="add-size-input" placeholder="5000000" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin-bottom:16px;">
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="TradingUI.executeAddPosition('${positionId}')">Konfirmasi</button>
    `);
  },

  executeAddPosition(positionId) {
    const input = document.getElementById("add-size-input");
    const size = parseFloat(input?.value) || 0;
    const result = TradingEngine.addToPosition(positionId, size);
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    if (result.success) { BSInteraction.showToast({ title: "Posisi Ditambah", type: "success" }); UI.refresh && UI.refresh(); }
    else BSInteraction.showToast({ title: "Gagal", message: result.error, type: "danger" });
  },

  openSLTPSheet(positionId) {
    const pos = State.data.tradingPositions.find(p => p.id === positionId);
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Stop Loss / Take Profit</h3>
      <label style="font-size:12px;font-weight:700;">Stop Loss (Rp)</label>
      <input type="number" id="sl-input" value="${pos.stopLoss || ''}" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 14px;">
      <label style="font-size:12px;font-weight:700;">Take Profit (Rp)</label>
      <input type="number" id="tp-input" value="${pos.takeProfit || ''}" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 16px;">
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="TradingUI.saveSLTP('${positionId}')">Simpan</button>
    `);
  },

  saveSLTP(positionId) {
    const sl = parseFloat(document.getElementById("sl-input")?.value) || null;
    const tp = parseFloat(document.getElementById("tp-input")?.value) || null;
    if (sl) TradingEngine.setStopLoss(positionId, sl);
    if (tp) TradingEngine.setTakeProfit(positionId, tp);
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    BSInteraction.showToast({ title: "SL/TP Disimpan", type: "success" });
    UI.refresh && UI.refresh();
  },
};
