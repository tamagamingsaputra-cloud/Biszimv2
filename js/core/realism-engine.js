/* ============================================================
   BizSim — realism-engine.js
   REALISM ENGINE (poin 64) — jangan semua hal otomatis berhasil.
   
   Menyediakan FUNGSI PROBABILITAS TERPUSAT yang dipanggil oleh
   engine lain (business, trading, career, creator) sebelum
   memutuskan hasil sukses/gagal, supaya konsisten formulanya
   dan gampang di-tuning di satu tempat.
   ============================================================ */

const RealismEngine = {
  // ==================== INVESTASI TIDAK SELALU PROFIT ====================
  // Dipakai oleh sistem investasi/bisnis baru sebagai pengganti "pasti untung"
  rollInvestmentOutcome({ skillLevel = 50, marketSentiment = 50, capital = 0, riskLevel = "medium" }) {
    const riskFactor = { low: 0.15, medium: 0.3, high: 0.5 }[riskLevel] || 0.3;
    const skillBonus = (skillLevel - 50) / 200; // -0.25 s/d +0.25
    const sentimentBonus = (marketSentiment - 50) / 250; // -0.2 s/d +0.2
    const capitalBonus = Math.min(0.1, Math.log10(Math.max(1, capital)) / 100); // modal besar sedikit lebih stabil

    const successProbability = Math.max(0.15, Math.min(0.9, 0.5 + skillBonus + sentimentBonus + capitalBonus - riskFactor * 0.3));
    const success = Math.random() < successProbability;

    // Magnitude hasil juga variatif, bukan angka tetap
    const magnitude = success
      ? (0.05 + Math.random() * riskFactor * 2)   // profit 5% - riskFactor*2 lebih
      : -(0.03 + Math.random() * riskFactor * 1.5); // loss lebih kecil dari potensi profit rata-rata

    return { success, probability: successProbability, magnitude };
  },

  // ==================== TIDAK SEMUA EMPLOYEE BAGUS ====================
  // Sudah sebagian tercermin di CandidateModel.quality (data-models.js).
  // Fungsi ini dipakai untuk validasi tambahan saat butuh assessment cepat.
  assessCandidateFit({ candidateQuality, jobDifficulty = 50 }) {
    const fitScore = candidateQuality * 100 - (jobDifficulty - 50) * 0.3;
    return {
      fitScore: Math.round(Math.max(0, Math.min(100, fitScore))),
      recommendation: fitScore >= 65 ? "recommended" : fitScore >= 40 ? "risky" : "not_recommended",
    };
  },

  // ==================== TIDAK SEMUA INTERVIEW BERHASIL ====================
  // Dipakai employee-engine.js & career-engine.js sudah ada threshold sendiri;
  // fungsi ini generic version untuk konsistensi + dipakai reusable di tempat lain.
  rollInterviewPass({ baseScore, experienceYears = 0, difficulty = "normal" }) {
    const difficultyPenalty = { easy: -10, normal: 0, hard: 15 }[difficulty] || 0;
    const experienceBonus = Math.min(15, experienceYears * 2.5);
    const threshold = 55 + difficultyPenalty - experienceBonus;
    return { passed: baseScore >= threshold, threshold };
  },

  // ==================== TIDAK SEMUA BISNIS SUKSES ====================
  // Dipakai saat membuka bisnis baru — bisnis bisa gagal berkembang kalau
  // reputation rendah + lokasi buruk + modal kurang.
  rollBusinessGrowthOutcome({ reputation = 50, capitalRatio = 1, marketDemand = 50 }) {
    // capitalRatio: modal aktual / modal ideal untuk skala bisnis itu (1 = cukup)
    const reputationFactor = (reputation - 50) / 100;
    const capitalFactor = Math.min(0.3, (capitalRatio - 1) * 0.3);
    const demandFactor = (marketDemand - 50) / 150;

    const growthRoll = 0.5 + reputationFactor + capitalFactor + demandFactor + (Math.random() * 0.3 - 0.15);
    let outcome;
    if (growthRoll > 0.7) outcome = "thriving";
    else if (growthRoll > 0.45) outcome = "stable";
    else if (growthRoll > 0.25) outcome = "struggling";
    else outcome = "failing";

    return { outcome, growthRoll: Math.round(growthRoll * 100) };
  },

  // ==================== TIDAK SEMUA EVENT MENGUNTUNGKAN ====================
  // Event sudah punya impact positif/negatif acak dari EventModel; fungsi ini
  // dipakai kalau butuh keputusan biner "apakah event ini menguntungkan user".
  isEventFavorable(event, userPortfolioBias = {}) {
    // userPortfolioBias contoh: { gold: 1, crypto: -1 } artinya user pegang gold, short crypto
    let netEffect = 0;
    event.impacts.forEach(impact => {
      const bias = userPortfolioBias[impact.target] || 0;
      netEffect += impact.pct * bias;
    });
    return netEffect > 0;
  },

  // ==================== TIDAK SEMUA TRADING PROFIT ====================
  // Trading sudah pure market-driven (harga naik/turun beneran), tapi fungsi
  // ini bisa dipakai untuk "slippage" realistis saat eksekusi order besar.
  calcSlippage({ orderSizeIDR, assetLiquidity = 100 }) {
    // Liquidity rendah -> slippage lebih besar untuk order besar
    const sizeImpact = Math.min(0.02, orderSizeIDR / 1000000000); // per 1 miliar
    const liquidityPenalty = Math.max(0, (100 - assetLiquidity) / 100) * 0.015;
    return sizeImpact + liquidityPenalty; // dikembalikan sebagai pct, kurangi dari entry price efektif
  },

  // ==================== TIDAK SEMUA VIDEO VIRAL ====================
  // Sudah diimplementasi di creator-engine.js (viralChance based on quality).
  // Expose di sini juga supaya UI bisa preview estimasi sebelum upload.
  estimateViralChance(contentQuality) {
    return contentQuality > 75 ? 0.08 : contentQuality > 50 ? 0.03 : 0.01;
  },

  // ==================== TIDAK SEMUA APPLICATION DITERIMA ====================
  // Sudah ada di career-engine.js (submitPlayerInterview). Expose generic
  // version untuk dipakai NPC-side juga (kandidat melamar ke bisnis player).
  rollApplicationAcceptance({ candidateFitScore, competitionLevel = 50 }) {
    const competitionPenalty = (competitionLevel - 50) / 200;
    const acceptProbability = Math.max(0.1, Math.min(0.95, (candidateFitScore / 100) - competitionPenalty));
    return { accepted: Math.random() < acceptProbability, probability: acceptProbability };
  },
};
