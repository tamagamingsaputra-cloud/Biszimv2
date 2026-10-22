/* ============================================================
   BizSim — trading-engine.js
   TRADING TERMINAL — TERPISAH TOTAL dari sistem Saham. Poin 9-17.
   ============================================================ */

const TradingEngine = {
  LEVERAGE_OPTIONS: [1, 2, 5, 10],

  getCurrentPrice(assetId) {
    const asset = State.data.market?.assets?.[assetId];
    if (!asset) { console.error(`[TradingEngine] Asset ${assetId} tidak ditemukan`); return null; }
    return asset.price;
  },

  openPosition({ assetId, side, sizeIDR, leverage }) {
    const price = this.getCurrentPrice(assetId);
    if (!price) return { success: false, error: "Asset tidak ditemukan" };
    if (!this.LEVERAGE_OPTIONS.includes(leverage)) {
      return { success: false, error: "Leverage tidak valid. Pilih: " + this.LEVERAGE_OPTIONS.join("x, ") + "x" };
    }
    const margin = sizeIDR / leverage;
    if (margin > State.data.cash) return { success: false, error: "Margin tidak cukup. Butuh Rp" + margin.toLocaleString("id-ID") };

    // FIX v5.0: wire RealismEngine (poin 64 — sebelumnya fungsi ini ada tapi
    // tidak pernah dipanggil / dead code). Order besar di asset kurang likuid
    // kena slippage nyata pada harga masuk, bukan harga sempurna terus.
    const asset = State.data.market.assets[assetId];
    const slippagePct = (typeof RealismEngine !== "undefined")
      ? RealismEngine.calcSlippage({ orderSizeIDR: sizeIDR, assetLiquidity: asset?.liquidity ?? 70 })
      : 0;
    const effectivePrice = side === "long" ? price * (1 + slippagePct) : price * (1 - slippagePct);

    State.data.cash -= margin;
    const position = TradingPositionModel.create({ assetId, side, size: sizeIDR, leverage, entryPrice: effectivePrice });
    position.openedAt = `T${State.data.time.year}.${String(State.data.time.month).padStart(2, "0")}.${String(State.data.time.day).padStart(2, "0")}`;
    State.data.tradingPositions.push(position);
    State.addTx("Trading", `Buka posisi ${side.toUpperCase()} ${assetId} (${leverage}x)`, -margin);
    State.notify(`Posisi ${side.toUpperCase()} Dibuka`, `${assetId} @ Rp${Math.round(effectivePrice).toLocaleString("id-ID")} — Size Rp${sizeIDR.toLocaleString("id-ID")}, Leverage ${leverage}x`, "info");
    return { success: true, position };
  },

  addToPosition(positionId, additionalSizeIDR) {
    const pos = State.data.tradingPositions.find(p => p.id === positionId && p.status === "open");
    if (!pos) return { success: false, error: "Posisi tidak ditemukan" };
    const price = this.getCurrentPrice(pos.assetId);
    const additionalMargin = additionalSizeIDR / pos.leverage;
    if (additionalMargin > State.data.cash) return { success: false, error: "Margin tidak cukup" };

    const totalSize = pos.size + additionalSizeIDR;
    pos.entryPrice = ((pos.entryPrice * pos.size) + (price * additionalSizeIDR)) / totalSize;
    pos.size = totalSize;
    pos.margin += additionalMargin;
    pos.liquidationPrice = TradingPositionModel.calcLiquidationPrice(pos.side, pos.entryPrice, pos.leverage);
    State.data.cash -= additionalMargin;
    State.addTx("Trading", `Tambah posisi ${pos.side.toUpperCase()} ${pos.assetId}`, -additionalMargin);
    return { success: true, position: pos };
  },

  closePosition(positionId) {
    const pos = State.data.tradingPositions.find(p => p.id === positionId && p.status === "open");
    if (!pos) return { success: false, error: "Posisi tidak ditemukan" };
    const currentPrice = this.getCurrentPrice(pos.assetId);
    const pnl = TradingPositionModel.calcPnL(pos, currentPrice);
    State.data.cash += pos.margin + pnl;
    pos.status = "closed";
    pos.closedAt = `T${State.data.time.year}.${String(State.data.time.month).padStart(2, "0")}.${String(State.data.time.day).padStart(2, "0")}`;
    pos.realizedPnL = pnl;
    pos.currentPrice = currentPrice;
    State.data.tradingPositions = State.data.tradingPositions.filter(p => p.id !== positionId);
    State.data.tradingHistory.unshift(pos);
    if (State.data.tradingHistory.length > 100) State.data.tradingHistory.length = 100;
    State.addTx("Trading", `Tutup posisi ${pos.side.toUpperCase()} ${pos.assetId} (${pnl >= 0 ? "Profit" : "Loss"})`, pnl);
    State.notify(pnl >= 0 ? "Posisi Ditutup — Profit" : "Posisi Ditutup — Loss", `${pos.assetId} ${pos.side.toUpperCase()}: ${pnl >= 0 ? "+" : ""}Rp${pnl.toLocaleString("id-ID")}`, pnl >= 0 ? "success" : "warning");
    return { success: true, pnl };
  },

  setStopLoss(positionId, priceLevel) {
    const pos = State.data.tradingPositions.find(p => p.id === positionId);
    if (!pos) return { success: false, error: "Posisi tidak ditemukan" };
    pos.stopLoss = priceLevel;
    return { success: true };
  },

  setTakeProfit(positionId, priceLevel) {
    const pos = State.data.tradingPositions.find(p => p.id === positionId);
    if (!pos) return { success: false, error: "Posisi tidak ditemukan" };
    pos.takeProfit = priceLevel;
    return { success: true };
  },

  processTick() {
    if (!State.data.tradingPositions || State.data.tradingPositions.length === 0) return;
    const toClose = [];
    const toLiquidate = [];

    State.data.tradingPositions.forEach(pos => {
      const currentPrice = this.getCurrentPrice(pos.assetId);
      if (!currentPrice) return;
      pos.currentPrice = currentPrice;
      pos.unrealizedPnL = TradingPositionModel.calcPnL(pos, currentPrice);

      const isLiquidated = pos.side === "long" ? currentPrice <= pos.liquidationPrice : currentPrice >= pos.liquidationPrice;
      if (isLiquidated) { toLiquidate.push(pos); return; }

      if (pos.stopLoss) {
        const slHit = pos.side === "long" ? currentPrice <= pos.stopLoss : currentPrice >= pos.stopLoss;
        if (slHit) { toClose.push({ pos, reason: "stop_loss" }); return; }
      }
      if (pos.takeProfit) {
        const tpHit = pos.side === "long" ? currentPrice >= pos.takeProfit : currentPrice <= pos.takeProfit;
        if (tpHit) { toClose.push({ pos, reason: "take_profit" }); return; }
      }

      const distanceToLiq = Math.abs(currentPrice - pos.liquidationPrice) / currentPrice;
      if (distanceToLiq < 0.05 && !pos._warnedLiquidation) {
        pos._warnedLiquidation = true;
        State.notify("⚠️ Margin Warning", `Posisi ${pos.side.toUpperCase()} ${pos.assetId} mendekati liquidation!`, "warning");
      }
    });

    toLiquidate.forEach(pos => {
      pos.status = "liquidated";
      pos.closedAt = `T${State.data.time.year}.${String(State.data.time.month).padStart(2, "0")}.${String(State.data.time.day).padStart(2, "0")}`;
      pos.realizedPnL = -pos.margin;
      State.data.tradingPositions = State.data.tradingPositions.filter(p => p.id !== pos.id);
      State.data.tradingHistory.unshift(pos);
      State.addTx("Trading", `LIQUIDATED: ${pos.side.toUpperCase()} ${pos.assetId}`, -pos.margin);
      State.notify("💥 Posisi Liquidated", `${pos.assetId} ${pos.side.toUpperCase()} — Margin hilang Rp${pos.margin.toLocaleString("id-ID")}`, "danger");
    });

    toClose.forEach(({ pos, reason }) => {
      const result = this.closePosition(pos.id);
      if (result.success) {
        State.notify(reason === "stop_loss" ? "Stop Loss Terpicu" : "Take Profit Terpicu", `${pos.assetId} ${pos.side.toUpperCase()} auto-closed`, reason === "stop_loss" ? "warning" : "success");
      }
    });

    if (State.data.tradingHistory.length > 100) State.data.tradingHistory.length = 100;
  },

  getOpenPositionsSummary() {
    const positions = State.data.tradingPositions || [];
    return {
      count: positions.length,
      totalMargin: positions.reduce((a, p) => a + p.margin, 0),
      totalUnrealizedPnL: positions.reduce((a, p) => a + (p.unrealizedPnL || 0), 0),
      longCount: positions.filter(p => p.side === "long").length,
      shortCount: positions.filter(p => p.side === "short").length,
    };
  },

  getMarginInfo() {
    const positions = State.data.tradingPositions || [];
    const usedMargin = positions.reduce((a, p) => a + p.margin, 0);
    return { cash: State.data.cash, usedMargin, availableMargin: State.data.cash };
  },
};
