/* ============================================================
   BizSim — economy-engine.js
   ECONOMY ENGINE (poin 63) — SEMUA SISTEM TERHUBUNG.
   
   Rantai contoh dari spec:
   Inflation naik -> Operating cost naik -> Business profit turun
   -> Stock valuation tertentu turun -> Consumer purchasing power
   turun -> Demand berubah -> Revenue bisnis berubah -> Net worth
   user berubah.
   
   File ini TIDAK menggantikan business logic lama — ini LAPISAN
   MAKROEKONOMI yang menghasilkan multiplier, lalu multiplier itu
   dibaca oleh business-engine.js & event-engine.js saat kalkulasi.
   ============================================================ */

const EconomyEngine = {
  // State makroekonomi tunggal (bukan per-bisnis) — mempengaruhi SEMUA
  fresh() {
    return {
      inflationRate: 0.03,       // 3% baseline
      purchasingPower: 100,       // index, 100 = normal
      interestRate: 0.06,
      unemploymentRate: 0.08,
      consumerConfidence: 60,     // 0-100
      businessCostIndex: 100,     // index biaya operasional umum
      marketSentiment: 50,        // 0-100, dipengaruhi berita & event
    };
  },

  init() {
    if (!State.data.economy) State.data.economy = this.fresh();
  },

  // ==================== RANTAI UTAMA (dipanggil bulanan) ====================
  processMonthlyEconomy() {
    this.init();
    const eco = State.data.economy;

    // 1. Inflasi bergerak sedikit random + terpengaruh event aktif (poin 44, 48)
    const activeEventInflationPush = (State.data.simEvents?.active || [])
      .filter(e => e.category === "economic" || e.category === "war")
      .reduce((a, e) => a + (e.currentStrength * 0.005), 0);
    eco.inflationRate = Math.max(0, Math.min(0.25, eco.inflationRate + (Math.random() * 0.006 - 0.003) + activeEventInflationPush));

    // 2. Inflasi -> Business Cost Index naik
    eco.businessCostIndex = Math.round(eco.businessCostIndex * (1 + eco.inflationRate * 0.3));

    // 3. Business Cost naik -> Purchasing Power turun (konsumen lebih hati-hati)
    const costImpactOnPower = (eco.businessCostIndex - 100) * 0.15;
    eco.purchasingPower = Math.max(30, Math.min(150, 100 - costImpactOnPower));

    // 4. Purchasing Power rendah -> Consumer Confidence turun
    eco.consumerConfidence = Math.max(0, Math.min(100, (eco.purchasingPower - 30) * (100 / 120)));

    // 5. Interest rate menyesuaikan inflasi (bank sentral sederhana)
    eco.interestRate = Math.max(0.02, Math.min(0.15, eco.inflationRate * 1.5));

    // 6. Market sentiment dipengaruhi confidence + event
    const eventSentimentPush = (State.data.simEvents?.active || []).reduce((a, e) => a + (e.category === "war" || e.category === "disaster" ? -e.currentStrength * 5 : 0), 0);
    eco.marketSentiment = Math.max(0, Math.min(100, eco.consumerConfidence * 0.6 + 20 + eventSentimentPush));

    // 7. Terapkan efek ke SEMUA bisnis milik player (poin 63 chain lengkap)
    this._applyEconomyToBusinesses();

    // 8. Terapkan efek ke valuasi saham umum (poin 63: stock valuation turun)
    this._applyEconomyToStocks();

    return eco;
  },

  // ---------- EFEK KE BISNIS (poin 48, 63) ----------
  _applyEconomyToBusinesses() {
    const eco = State.data.economy;
    const costMultiplier = eco.businessCostIndex / 100; // >1 = biaya lebih mahal
    const demandMultiplier = eco.purchasingPower / 100;  // <1 = demand turun

    (State.data.businesses || []).forEach(biz => {
      const bizId = biz.id || biz.name;

      // Simpan multiplier ekonomi makro terpisah dari multiplier upgrade bisnis
      // (business-engine.js baca ini saat hitung revenue final)
      biz._economyCostMultiplier = costMultiplier;
      biz._economyDemandMultiplier = demandMultiplier;

      // Update customer demand langsung (poin 55, terhubung ke poin 63)
      if (State.data.customers[bizId]) {
        State.data.customers[bizId].demand = Math.max(10, Math.min(100,
          State.data.customers[bizId].demand + (demandMultiplier - 1) * 20
        ));
        State.data.customers[bizId].budget = Math.max(10, Math.min(100, eco.purchasingPower));
      }
    });
  },

  // ---------- EFEK KE SAHAM (poin 63: "stock valuation tertentu turun") ----------
  _applyEconomyToStocks() {
    const eco = State.data.economy;
    if (!State.data.market?.assets) return;

    // Sentiment tinggi -> saham umum naik sedikit. Cost index tinggi -> saham turun.
    const sentimentEffect = (eco.marketSentiment - 50) / 1000; // -0.05 s/d +0.05
    const costEffect = -(eco.businessCostIndex - 100) / 2000;  // biaya tinggi menekan saham

    Object.values(State.data.market.assets).forEach(asset => {
      if (asset.type !== "stock") return;
      const variance = 0.6 + Math.random() * 0.8; // tidak semua saham bergerak sama (poin 44 prinsip)
      const totalEffect = (sentimentEffect + costEffect) * variance;
      asset.price = Math.max(1, Math.round(asset.price * (1 + totalEffect)));
    });
  },

  // ---------- HELPER: dipakai business-engine.js saat hitung revenue final ----------
  getBusinessEconomyMultipliers(businessId) {
    const biz = (State.data.businesses || []).find(b => (b.id || b.name) === businessId);
    return {
      costMultiplier: biz?._economyCostMultiplier || 1,
      demandMultiplier: biz?._economyDemandMultiplier || 1,
    };
  },

  // ---------- RINGKASAN UNTUK UI ----------
  getSummary() {
    this.init();
    const eco = State.data.economy;
    return {
      inflation: (eco.inflationRate * 100).toFixed(1) + "%",
      purchasingPower: Math.round(eco.purchasingPower),
      interestRate: (eco.interestRate * 100).toFixed(1) + "%",
      consumerConfidence: Math.round(eco.consumerConfidence),
      marketSentiment: Math.round(eco.marketSentiment),
      businessCostIndex: Math.round(eco.businessCostIndex),
    };
  },
};
