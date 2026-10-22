/* ============================================================
   BizSim — business-engine.js
   BUSINESS DEPTH — upgrade bertahap, inventory, supplier,
   customer, reputation. EXTEND business system lama, tidak ganti.
   
   Depends on: data-models.js (BUSINESS_UPGRADE_TRACKS, SupplierModel)
   Business asli (State.data.businesses[]) TIDAK diubah strukturnya —
   engine ini nambah data pendamping via businessId sebagai key.
   ============================================================ */

const BusinessEngine = {
  // ---------- UPGRADE BERTAHAP (poin 18-19, 52) ----------
  getUpgradeLevel(businessId, trackId) {
    const upgrades = State.data.businessUpgrades[businessId] || {};
    return upgrades[trackId] || 0;
  },

  getUpgradeCost(trackId, currentLevel) {
    const track = BUSINESS_UPGRADE_TRACKS[trackId];
    if (!track) return null;
    if (currentLevel >= track.maxLevel) return null; // sudah max
    return Math.round(track.baseCost * Math.pow(track.costMult, currentLevel));
  },

  purchaseUpgrade(businessId, trackId) {
    const track = BUSINESS_UPGRADE_TRACKS[trackId];
    if (!track) return { success: false, error: "Upgrade tidak ditemukan" };

    const currentLevel = this.getUpgradeLevel(businessId, trackId);
    if (currentLevel >= track.maxLevel) return { success: false, error: "Sudah level maksimal" };

    const cost = this.getUpgradeCost(trackId, currentLevel);
    if (cost > State.data.cash) return { success: false, error: "Uang tidak cukup. Butuh Rp" + cost.toLocaleString("id-ID") };

    State.data.cash -= cost;
    if (!State.data.businessUpgrades[businessId]) State.data.businessUpgrades[businessId] = {};
    State.data.businessUpgrades[businessId][trackId] = currentLevel + 1;

    State.addTx("Business Upgrade", `${track.name} → Level ${currentLevel + 1}`, -cost);
    State.notify("Upgrade Berhasil", `${track.name} naik ke Level ${currentLevel + 1}`, "success");

    return { success: true, newLevel: currentLevel + 1, cost };
  },

  // Hitung total effect dari semua upgrade track suatu bisnis (dipakai engine.js asli saat hitung revenue)
  getAggregatedUpgradeEffects(businessId) {
    const upgrades = State.data.businessUpgrades[businessId] || {};
    const effects = { revenueMult: 1.0, expenseMult: 1.0, inventorySlots: 0, maxEmployees: 0, reputationBonus: 0, customerSatisfactionBonus: 0 };

    Object.entries(upgrades).forEach(([trackId, level]) => {
      const track = BUSINESS_UPGRADE_TRACKS[trackId];
      if (!track || level <= 0) return;
      const perLevel = track.effectPerLevel;

      if (perLevel.revenueMult) effects.revenueMult += perLevel.revenueMult * level;
      if (perLevel.expenseMult) effects.expenseMult += perLevel.expenseMult * level;
      if (perLevel.inventorySlots) effects.inventorySlots += perLevel.inventorySlots * level;
      if (perLevel.maxEmployees) effects.maxEmployees += perLevel.maxEmployees * level;
      if (perLevel.reputationGain) effects.reputationBonus += perLevel.reputationGain * level;
      if (perLevel.customerSatisfaction) effects.customerSatisfactionBonus += perLevel.customerSatisfaction * level;
    });

    return effects;
  },

  // ---------- HELPER GABUNGAN: dipanggil dari engine.js ASLI saat hitung
  // revenue/expense final bisnis, supaya upgrade (poin 18-19) DAN economy
  // makro (poin 63) sama-sama masuk hitungan tanpa duplikasi logic.
  //
  // Contoh pakai di engine.js asli:
  //   const mult = BusinessEngine.getFinalMultipliers(businessId);
  //   const finalRevenue = baseRevenue * mult.revenueMult;
  //   const finalExpense = baseExpense * mult.expenseMult;
  getFinalMultipliers(businessId) {
    const upgradeEffects = this.getAggregatedUpgradeEffects(businessId);
    const economyMultipliers = (typeof EconomyEngine !== "undefined")
      ? EconomyEngine.getBusinessEconomyMultipliers(businessId)
      : { costMultiplier: 1, demandMultiplier: 1 };
    const biz = (State.data.businesses || []).find(b => (b.id || b.name) === businessId);
    const decisionRevenueMult = biz?._decisionRevenueMult || 1;
    const decisionExpenseMult = biz?._decisionExpenseMult || 1;

    return {
      revenueMult: upgradeEffects.revenueMult * economyMultipliers.demandMultiplier * decisionRevenueMult,
      expenseMult: upgradeEffects.expenseMult * economyMultipliers.costMultiplier * decisionExpenseMult,
    };
  },

  // ---------- SUPPLIER (poin 54) ----------
  initSuppliersForBusiness(businessId, businessType) {
    if (State.data.suppliers[businessId]) return; // sudah ada
    State.data.suppliers[businessId] = SupplierModel.generateForBusiness(businessType);
  },

  selectSupplier(businessId, supplierId) {
    const suppliers = State.data.suppliers[businessId] || [];
    suppliers.forEach(s => s.contractActive = (s.id === supplierId));
    const selected = suppliers.find(s => s.id === supplierId);
    if (selected) {
      State.notify("Supplier Dipilih", `Kontrak dengan ${selected.name} aktif`, "info");
    }
    return selected;
  },

  getActiveSupplier(businessId) {
    const suppliers = State.data.suppliers[businessId] || [];
    return suppliers.find(s => s.contractActive) || null;
  },

  // ---------- INVENTORY (poin 53) ----------
  addInventoryItem(businessId, { name, category, buyPrice, sellPrice, stock, demand }) {
    if (!State.data.inventory[businessId]) State.data.inventory[businessId] = [];
    const item = {
      id: "inv_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      name, category,
      buyPrice, sellPrice,
      stock: stock || 0,
      demand: demand || 50, // 0-100
      margin: sellPrice - buyPrice,
    };
    State.data.inventory[businessId].push(item);
    return item;
  },

  reorderStock(businessId, itemId, quantity) {
    const items = State.data.inventory[businessId] || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return { success: false, error: "Item tidak ditemukan" };

    const supplier = this.getActiveSupplier(businessId);
    const priceMult = supplier ? supplier.priceMult : 1.0;
    const totalCost = Math.round(item.buyPrice * priceMult * quantity);

    if (totalCost > State.data.cash) return { success: false, error: "Uang tidak cukup" };

    // Cek kapasitas inventory dari upgrade
    const effects = this.getAggregatedUpgradeEffects(businessId);
    const maxCapacity = 50 + effects.inventorySlots; // base 50 + upgrade
    const currentTotal = items.reduce((a, i) => a + i.stock, 0);
    if (currentTotal + quantity > maxCapacity) {
      return { success: false, error: `Kapasitas inventory penuh (max ${maxCapacity})` };
    }

    State.data.cash -= totalCost;
    item.stock += quantity;
    State.addTx("Inventory", `Reorder ${quantity}x ${item.name}`, -totalCost);

    return { success: true, item, totalCost };
  },

  // Jual barang dari inventory (dipanggil dari business tick / manual sale)
  sellInventoryItem(businessId, itemId, quantity) {
    const items = State.data.inventory[businessId] || [];
    const item = items.find(i => i.id === itemId);
    if (!item) return { success: false, error: "Item tidak ditemukan" };
    if (item.stock < quantity) return { success: false, error: "Stock tidak cukup" };

    const revenue = item.sellPrice * quantity;
    item.stock -= quantity;
    State.data.cash += revenue;
    State.addTx("Sales", `Terjual ${quantity}x ${item.name}`, revenue);

    return { success: true, revenue };
  },

  // ---------- CUSTOMER (poin 55) ----------
  initCustomersForBusiness(businessId) {
    if (State.data.customers[businessId]) return;
    State.data.customers[businessId] = {
      count: 50,
      demand: 50,
      budget: 50,
      satisfaction: 60,
      loyalty: 50,
      preference: this._randomPreference(), // FIX poin 55: field preference sebelumnya belum ada
    };
  },

  _randomPreference() {
    const prefs = ["harga murah", "kualitas premium", "pelayanan cepat", "variasi produk", "kenyamanan tempat"];
    return prefs[Math.floor(Math.random() * prefs.length)];
  },

  // ---------- REPUTATION (poin 56) ----------
  getReputation(businessId) {
    return State.data.businessReputation[businessId] ?? 50;
  },

  adjustReputation(businessId, delta) {
    const current = this.getReputation(businessId);
    State.data.businessReputation[businessId] = Math.max(0, Math.min(100, current + delta));
  },

  // ---------- MONTHLY TICK: dipanggil dari Engine.processMonth() ----------
  processMonthlyBusinessUpdate(businessId) {
    this.initCustomersForBusiness(businessId);
    const customers = State.data.customers[businessId];
    const reputation = this.getReputation(businessId);
    const effects = this.getAggregatedUpgradeEffects(businessId);
    const supplier = this.getActiveSupplier(businessId);

    // ---- POIN 63: baca multiplier makroekonomi dari EconomyEngine ----
    // Inflasi naik -> economyMultipliers.costMultiplier > 1 -> operating cost naik
    // -> demandMultiplier < 1 -> demand turun -> revenue bisnis ikut turun
    const economyMultipliers = (typeof EconomyEngine !== "undefined")
      ? EconomyEngine.getBusinessEconomyMultipliers(businessId)
      : { costMultiplier: 1, demandMultiplier: 1 };

    // Reputation mempengaruhi customer growth (poin 56), ditekan/didorong oleh demand makro
    const growthRate = ((reputation - 50) / 500) + (economyMultipliers.demandMultiplier - 1) * 0.3;
    customers.count = Math.max(10, Math.round(customers.count * (1 + growthRate)));

    // Satisfaction dipengaruhi supplier quality + upgrade + daya beli makro
    let satisfactionTarget = 50 + effects.customerSatisfactionBonus;
    if (supplier) satisfactionTarget += (supplier.quality - 70) * 0.3;
    satisfactionTarget += (economyMultipliers.demandMultiplier - 1) * 15; // daya beli rendah -> lebih rewel
    customers.satisfaction += (satisfactionTarget - customers.satisfaction) * 0.2;
    customers.satisfaction = Math.max(0, Math.min(100, customers.satisfaction));

    // Reputation drift menuju customer satisfaction
    this.adjustReputation(businessId, (customers.satisfaction - reputation) * 0.1 + effects.reputationBonus * 0.05);

    // FIX v5.0: wire RealismEngine (poin 64 — sebelumnya dead code).
    // Status kesehatan bisnis TIDAK selalu positif, tergantung reputasi,
    // rasio modal, dan demand pasar — dipakai UI Business Detail (badge).
    if (typeof RealismEngine !== "undefined") {
      const biz = (State.data.businesses || []).find(b => (b.id || b.name) === businessId);
      const capitalRatio = biz?.totalInvested ? (biz.value || biz.totalInvested) / biz.totalInvested : 1;
      const growth = RealismEngine.rollBusinessGrowthOutcome({
        reputation: this.getReputation(businessId),
        capitalRatio,
        marketDemand: customers.demand,
      });
      if (!State.data.businessGrowthStatus) State.data.businessGrowthStatus = {};
      State.data.businessGrowthStatus[businessId] = growth.outcome;
    }

    return { customers, reputation: this.getReputation(businessId), effects, economyMultipliers };
  },

  // ==================== DECISION SYSTEM (poin 18, 48-49) ====================
  // FIX BUG: sebelumnya presentBusinessDecision/applyBusinessDecision ada
  // tapi TIDAK PERNAH DIPANGGIL dari mana pun (dead code) — event bisnis
  // tidak pernah benar-benar sampai ke pemain. Sekarang ditambah queue
  // system: event-engine.js memanggil queueDecision(), lalu UI membaca
  // getPendingDecisions() untuk menampilkan modal ke pemain.

  DECISION_TEMPLATES: {
    supplier_price_hike: {
      title: "Supplier Menaikkan Harga",
      description: "Supplier Anda menaikkan harga akibat kondisi ekonomi. Apa yang Anda lakukan?",
      choices: [
        { id: "accept", label: "Terima harga baru", effect: { expenseMult: 1.2 } },
        { id: "new_supplier", label: "Cari supplier baru", effect: { reputationDelta: -2, navigateTo: "supplier" } },
        { id: "reduce_production", label: "Kurangi produksi", effect: { revenueMult: 0.85 } },
        { id: "raise_price", label: "Naikkan harga produk", effect: { customerSatisfactionDelta: -8, revenueMult: 1.1 } },
      ],
    },
  },

  presentBusinessDecision(businessId, decisionType) {
    return this.DECISION_TEMPLATES[decisionType] || null;
  },

  // Dipanggil dari event-engine.js saat event dengan businessImpact terjadi
  queueDecision(businessId, decisionType, eventTitle) {
    const template = this.presentBusinessDecision(businessId, decisionType);
    if (!template) return null;

    const decision = {
      id: "dec_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      businessId,
      decisionType,
      eventTitle,
      daysToRespond: 5, // auto-resolve "accept" kalau tidak direspons (poin: jangan soft-lock)
      resolved: false,
    };
    State.data.businessDecisions.push(decision);

    const biz = (State.data.businesses || []).find(b => (b.id || b.name) === businessId);
    State.notify(
      "⚠️ Keputusan Bisnis Diperlukan",
      `${biz?.name || businessId}: ${template.title}`,
      "warning"
    );
    return decision;
  },

  getPendingDecisions() {
    return (State.data.businessDecisions || []).filter(d => !d.resolved);
  },

  // Dipanggil dari UI saat pemain memilih salah satu opsi
  resolveDecision(decisionId, choiceId) {
    const decision = State.data.businessDecisions.find(d => d.id === decisionId && !d.resolved);
    if (!decision) return { success: false, error: "Keputusan tidak ditemukan" };

    const result = this.applyBusinessDecision(decision.businessId, decision.decisionType, choiceId);
    if (result.success) decision.resolved = true;
    return result;
  },

  // Dipanggil dari central-orchestrator.onDayTick() — auto-resolve "accept"
  // kalau pemain tidak merespons dalam waktu tertentu
  processDecisionTimeouts() {
    const pending = this.getPendingDecisions();
    pending.forEach(d => {
      d.daysToRespond--;
      if (d.daysToRespond <= 0) {
        this.applyBusinessDecision(d.businessId, d.decisionType, "accept");
        d.resolved = true;
        d.autoResolved = true;
      }
    });
  },

  applyBusinessDecision(businessId, decisionType, choiceId) {
    const decision = this.presentBusinessDecision(businessId, decisionType);
    if (!decision) return { success: false };
    const choice = decision.choices.find(c => c.id === choiceId);
    if (!choice) return { success: false };

    const biz = (State.data.businesses || []).find(b => (b.id || b.name) === businessId);

    // FIX: efek revenueMult/expenseMult sekarang benar-benar DITERAPKAN
    // (dulu hanya reputationDelta/customerSatisfactionDelta yang jalan)
    if (biz) {
      if (choice.effect.expenseMult) biz._decisionExpenseMult = (biz._decisionExpenseMult || 1) * choice.effect.expenseMult;
      if (choice.effect.revenueMult) biz._decisionRevenueMult = (biz._decisionRevenueMult || 1) * choice.effect.revenueMult;
    }
    if (choice.effect.reputationDelta) this.adjustReputation(businessId, choice.effect.reputationDelta);
    if (choice.effect.customerSatisfactionDelta) {
      this.initCustomersForBusiness(businessId);
      State.data.customers[businessId].satisfaction = Math.max(0, Math.min(100,
        State.data.customers[businessId].satisfaction + choice.effect.customerSatisfactionDelta
      ));
    }

    return { success: true, effect: choice.effect, navigateTo: choice.effect.navigateTo || null };
  },
};
