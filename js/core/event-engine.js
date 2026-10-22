/* ============================================================
   BizSim — event-engine.js
   EVENT SYSTEM — Real-World Event (dari backend/API) DIPISAH dari
   Simulation Event (buatan engine BizSim sendiri). Poin 43-49.
   
   PENTING: Event TIDAK langsung mengubah harga real market.
   Event jadi FAKTOR SIMULASI yang mempengaruhi asset lewat
   sensitivity map, dengan decay seiring waktu.
   
   Depends on: data-models.js (EventModel)
   ============================================================ */

const EventEngine = {
  // ==================== SIMULATION EVENTS (poin 45) ====================
  // Event yang dibuat oleh engine BizSim sendiri, tidak butuh API eksternal
  SIMULATION_EVENT_TEMPLATES: [
    {
      category: "war", severity: "high",
      title: "Ketegangan Geopolitik Meningkat",
      description: "Konflik antara dua negara besar meningkat, mempengaruhi pasar global.",
      impacts: [
        { target: "gold", type: "asset_category", pct: 0.06 },
        { target: "oil", type: "asset_category", pct: 0.09 },
        { target: "stock_general", type: "asset_category", pct: -0.04 },
        { target: "currency", type: "asset_category", pct: -0.03 },
      ],
    },
    {
      category: "economic", severity: "medium",
      title: "Inflasi Meningkat",
      description: "Tingkat inflasi naik signifikan, menekan daya beli konsumen.",
      impacts: [
        { target: "inflation", type: "macro", pct: 0.02 },
        { target: "stock_general", type: "asset_category", pct: -0.03 },
        { target: "currency", type: "asset_category", pct: -0.02 },
      ],
      businessImpact: { operatingCostMult: 1.08, wageMult: 1.05 },
    },
    {
      category: "technology", severity: "medium",
      title: "Terobosan Teknologi Baru",
      description: "Inovasi teknologi besar mendorong optimisme pasar sektor tech.",
      impacts: [
        { target: "stock_tech", type: "asset_category", pct: 0.07 },
        { target: "crypto", type: "asset_category", pct: 0.04 },
      ],
    },
    {
      category: "disaster", severity: "high",
      title: "Bencana Alam Melanda Wilayah Produksi",
      description: "Bencana alam mengganggu rantai pasok komoditas tertentu.",
      impacts: [
        { target: "property_local", type: "asset_category", pct: -0.08 },
        { target: "commodity_affected", type: "asset_category", pct: 0.06 },
        { target: "stock_insurance", type: "asset_category", pct: -0.04 },
      ],
    },
    {
      category: "crypto", severity: "medium",
      title: "Regulasi Crypto Baru Diumumkan",
      description: "Pemerintah mengumumkan kebijakan baru terkait aset kripto.",
      impacts: [
        { target: "crypto", type: "asset_category", pct: -0.1 },
      ],
    },
    {
      category: "energy", severity: "medium",
      title: "Gangguan Pasokan Energi",
      description: "Pasokan energi global terganggu, harga minyak melonjak.",
      impacts: [
        { target: "oil", type: "asset_category", pct: 0.1 },
        { target: "stock_energy", type: "asset_category", pct: 0.05 },
        { target: "transport_cost", type: "macro", pct: 0.06 },
      ],
      businessImpact: { operatingCostMult: 1.06 },
    },
    {
      category: "company", severity: "low",
      title: "Laporan Keuangan Perusahaan Besar Mengejutkan Pasar",
      description: "Sebuah perusahaan besar melaporkan kinerja jauh di luar ekspektasi.",
      impacts: [
        { target: "stock_general", type: "asset_category", pct: 0.03 },
      ],
    },
  ],

  // Dipanggil periodik (misal harian dengan chance kecil) dari main tick
  tryTriggerSimulationEvent(chance = 0.08) {
    if (Math.random() > chance) return null;

    const template = this.SIMULATION_EVENT_TEMPLATES[Math.floor(Math.random() * this.SIMULATION_EVENT_TEMPLATES.length)];
    const event = EventModel.create({
      title: template.title,
      category: template.category,
      severity: template.severity,
      source: "simulation",
      description: template.description,
      impacts: template.impacts,
    });
    event.startedAt = this._nowStr();
    event.businessImpact = template.businessImpact || null;

    State.data.simEvents.active.push(event);
    State.data.simEvents.history.unshift({ ...event });
    if (State.data.simEvents.history.length > 100) State.data.simEvents.history.length = 100;

    this._pushNews(event);
    this._applyAssetImpacts(event);

    return event;
  },

  // ==================== REAL-WORLD EVENTS (poin 43, 68) ====================
  // Data harus datang dari BACKEND (yang fetch API eksternal), BUKAN frontend
  // langsung ke API pihak ketiga. Fungsi ini hanya MENERIMA data yang sudah
  // diproses backend, lalu convert jadi Event object utk simulasi.
  //
  // Contoh pemanggilan dari api.js:
  //   const newsData = await Api.get('/api/news/realworld');
  //   newsData.forEach(n => EventEngine.ingestRealWorldEvent(n));
  ingestRealWorldEvent({ title, category, severity, description, suggestedImpacts }) {
    const event = EventModel.create({
      title, category, severity,
      source: "realworld",
      description,
      impacts: suggestedImpacts || this._inferImpactsFromCategory(category, severity),
    });
    event.startedAt = this._nowStr();

    State.data.simEvents.active.push(event);
    State.data.simEvents.history.unshift({ ...event });

    this._pushNews(event);
    this._applyAssetImpacts(event);

    return event;
  },

  // Kalau backend tidak kasih impact spesifik, infer dari sensitivity map (poin 44)
  _inferImpactsFromCategory(category, severity) {
    const sensitivity = EventModel.SENSITIVITY[category] || {};
    const severityMult = { low: 0.4, medium: 0.7, high: 1.0, critical: 1.5 }[severity] || 0.7;
    return Object.entries(sensitivity).map(([target, baseSens]) => ({
      target, type: "asset_category", pct: baseSens * 0.05 * severityMult,
    }));
  },

  // ==================== APPLY IMPACT KE ASSET (poin 44) ====================
  // Setiap asset punya sensitivity BERBEDA — tidak semua bergerak sama rata
  _applyAssetImpacts(event) {
    if (!State.data.market?.assets) return;

    // FIX v5.0: track survived severe event untuk achievement "Market Survivor"
    // (poin 59 — sebelumnya achievement ini kelupaan dari daftar)
    if ((event.severity === "high" || event.severity === "critical") && State.data.cash > 0) {
      State.data.severeEventsSurvived = (State.data.severeEventsSurvived || 0) + 1;
    }

    event.impacts.forEach(impact => {
      Object.values(State.data.market.assets).forEach(asset => {
        if (!this._assetMatchesCategory(asset, impact.target)) return;
        // Setiap asset punya sedikit variasi random agar tidak semua bergerak identik
        const variance = 0.7 + Math.random() * 0.6; // 0.7x - 1.3x dari impact dasar
        const changeAmount = asset.price * impact.pct * variance;
        asset.price = Math.max(1, Math.round(asset.price + changeAmount));
      });
    });

    // Business impact (poin 48) — FIX poin 49: sebelumnya diam-diam
    // mengubah biaya tanpa sepengetahuan pemain. Sekarang di-queue
    // sebagai KEPUTUSAN yang harus direspons pemain (accept/cari
    // supplier baru/kurangi produksi/naikkan harga), masing-masing
    // konsekuensi beda (BusinessEngine.applyBusinessDecision).
    if (event.businessImpact && State.data.businesses && typeof BusinessEngine !== "undefined") {
      State.data.businesses.forEach(biz => {
        const bizId = biz.id || biz.name;
        if (event.businessImpact.operatingCostMult) {
          BusinessEngine.queueDecision(bizId, "supplier_price_hike", event.title);
        }
      });
    }
  },

  // Mapping sederhana asset ke kategori sensitivity — sesuaikan dengan struktur
  // asset asli di State.data.market.assets (field category/type mereka)
  _assetMatchesCategory(asset, targetCategory) {
    if (targetCategory === "stock_general" && asset.type === "stock") return true;
    if (targetCategory === "stock_tech" && asset.type === "stock" && asset.sector === "technology") return true;
    if (targetCategory === "stock_energy" && asset.type === "stock" && asset.sector === "energy") return true;
    if (targetCategory === "stock_insurance" && asset.type === "stock" && asset.sector === "insurance") return true;
    if (targetCategory === "gold" && asset.id === "gold") return true;
    if (targetCategory === "oil" && asset.id === "oil") return true;
    if (targetCategory === "crypto" && asset.type === "crypto") return true;
    if (targetCategory === "currency" && asset.type === "currency") return true;
    if (targetCategory === "property_local" && asset.type === "property") return true;
    if (targetCategory === "commodity_affected" && asset.type === "commodity") return true;
    return false;
  },

  // ==================== NEWS CARD (poin 47) ====================
  _pushNews(event) {
    const news = {
      id: "news_" + Date.now(),
      eventId: event.id,
      title: event.title,
      category: event.category,
      severity: event.severity,
      source: event.source,
      time: this._nowStr(),
      affectedAssets: event.impacts.map(i => ({ target: i.target, pct: i.pct })),
    };
    State.data.newsHistory.unshift(news);
    if (State.data.newsHistory.length > 200) State.data.newsHistory.length = 200;

    State.notify(
      `📰 BREAKING: ${event.title}`,
      event.description,
      event.severity === "critical" || event.severity === "high" ? "danger" : "info"
    );
  },

  // ==================== EVENT DECAY (dipanggil tiap tick) ====================
  processEventDecay() {
    if (!State.data.simEvents?.active) return;
    State.data.simEvents.active.forEach(evt => {
      evt.currentStrength = Math.max(0, evt.currentStrength - evt.decayRate);
      if (evt.currentStrength <= 0) evt.active = false;
    });
    State.data.simEvents.active = State.data.simEvents.active.filter(e => e.active);
  },

  // ==================== EVENT HISTORY VIEW (poin 46) ====================
  getEventHistory(limit = 20) {
    return (State.data.simEvents?.history || []).slice(0, limit);
  },
};
