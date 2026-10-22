/* ============================================================
   BizSim — data-models.js
   Struktur data terpusat untuk SEMUA fitur baru (poin 65 spec)
   Fitur lama (state.js asli) TIDAK diubah — file ini EXTEND saja.
   
   Cara pakai: load file ini SETELAH state.js asli, SEBELUM engine
   modules lain. Fungsi extendState() akan ditambahkan ke State.data
   tanpa menghapus properti yang sudah ada.
   ============================================================ */

function extendStateWithNewSystems(data) {
  if (data.__extended_v2) return data;

  data.jobs = data.jobs || [];
  data.employees = data.employees || [];
  data.applications = data.applications || [];
  data.interviews = data.interviews || [];
  data.careerHistory = data.careerHistory || [];
  data.playerCareer = data.playerCareer || PlayerCareerModel.fresh();
  data.creatorProfiles = data.creatorProfiles || CreatorModel.fresh();
  data.tradingPositions = data.tradingPositions || [];
  data.tradingHistory = data.tradingHistory || [];
  data.simEvents = data.simEvents || { active: [], history: [] };
  data.newsHistory = data.newsHistory || [];
  data.suppliers = data.suppliers || {};
  data.inventory = data.inventory || {};
  data.customers = data.customers || {};
  data.businessUpgrades = data.businessUpgrades || {};
  data.businessReputation = data.businessReputation || {};
  data.trainingPrograms = data.trainingPrograms || [];
  data.notifications2 = data.notifications2 || [];
  data.unlockedAchievements = data.unlockedAchievements || [];
  data.businessDecisions = data.businessDecisions || []; // FIX poin 48-49: keputusan bisnis pending akibat event
  data.pendingBrandDealOffers = data.pendingBrandDealOffers || {}; // FIX poin 38-39: tawaran brand deal (v5.0)
  data.severeEventsSurvived = data.severeEventsSurvived || 0; // dipakai achievement "Market Survivor" (v5.0)
  data.businessGrowthStatus = data.businessGrowthStatus || {}; // keyed by businessId -> thriving/stable/struggling/failing (v5.0, RealismEngine)

  data.__extended_v2 = true;
  return data;
}

/* ============================================================
   EMPLOYEE MODEL (poin 20-21, 57)
   ============================================================ */
const EmployeeModel = {
  create({ businessId, jobId, name, gender, age, education, position, salary, skills, portraitSeed }) {
    return {
      id: "emp_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      businessId,
      jobId: jobId || null,
      name,
      gender: gender || (Math.random() > 0.5 ? "male" : "female"),
      age: age || (18 + Math.floor(Math.random() * 30)),
      education: education || "SMA",
      position,
      level: 1,
      levelTitle: "Staff",
      experienceYears: 0,
      monthsInPosition: 0,
      salary: salary || 4000000,
      skills: skills || EmployeeModel.randomSkills(),
      performance: 60 + Math.random() * 20,
      loyalty: 50 + Math.random() * 20,
      morale: 60 + Math.random() * 20,
      workload: 50,
      attendance: 95 + Math.random() * 5,
      status: "active",
      hireDate: null,
      portraitSeed: portraitSeed || Math.floor(Math.random() * 100000),
      trainingHistory: [],
      promotionHistory: [],
      salaryHistory: [],
      resignationRisk: 0,
    };
  },

  randomSkills() {
    return {
      customerService: 40 + Math.floor(Math.random() * 40),
      sales: 40 + Math.floor(Math.random() * 40),
      inventory: 40 + Math.floor(Math.random() * 40),
      discipline: 40 + Math.floor(Math.random() * 40),
      leadership: 20 + Math.floor(Math.random() * 30),
      technical: 30 + Math.floor(Math.random() * 40),
    };
  },

  LEVEL_TITLES: ["Intern", "Staff", "Senior Staff", "Supervisor", "Manager", "Store Manager", "Regional Manager"],

  levelTitle(level) {
    return this.LEVEL_TITLES[Math.min(level, this.LEVEL_TITLES.length - 1)];
  },
};

/* ============================================================
   CANDIDATE / APPLICATION MODEL (poin 22-25)
   ============================================================ */
const CandidateModel = {
  FIRST_NAMES_M: ["Raka", "Dimas", "Andi", "Bayu", "Fajar", "Rizky", "Yoga", "Arief", "Doni", "Hendra"],
  FIRST_NAMES_F: ["Sari", "Dewi", "Putri", "Rina", "Ayu", "Fitri", "Wulan", "Indah", "Lestari", "Ratna"],
  LAST_NAMES: ["Pratama", "Wijaya", "Santoso", "Kusuma", "Saputra", "Wibowo", "Hidayat", "Setiawan", "Gunawan", "Firmansyah"],

  generate(jobId, jobRequirements) {
    const gender = Math.random() > 0.5 ? "male" : "female";
    const firstName = gender === "male"
      ? this.FIRST_NAMES_M[Math.floor(Math.random() * this.FIRST_NAMES_M.length)]
      : this.FIRST_NAMES_F[Math.floor(Math.random() * this.FIRST_NAMES_F.length)];
    const lastName = this.LAST_NAMES[Math.floor(Math.random() * this.LAST_NAMES.length)];
    const baseQuality = 0.3 + Math.random() * 0.7;

    return {
      id: "cand_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      jobId,
      name: `${firstName} ${lastName}`,
      gender,
      age: 19 + Math.floor(Math.random() * 25),
      education: this.randomEducation(),
      experienceYears: Math.floor(Math.random() * 6),
      skills: this.randomSkillsScaled(baseQuality),
      previousWorkplace: Math.random() > 0.4 ? this.randomCompanyName() : null,
      expectedSalary: Math.round((jobRequirements?.salaryMin || 4000000) * (0.9 + Math.random() * 0.3)),
      availability: Math.random() > 0.15,
      portraitSeed: Math.floor(Math.random() * 100000),
      quality: baseQuality,
      applicationDate: null,
      status: "pending",
    };
  },

  randomEducation() {
    const opts = ["SMP", "SMA/SMK", "D3", "S1", "S2"];
    const weights = [0.05, 0.4, 0.2, 0.3, 0.05];
    let r = Math.random();
    for (let i = 0; i < opts.length; i++) {
      if (r < weights[i]) return opts[i];
      r -= weights[i];
    }
    return "SMA/SMK";
  },

  randomSkillsScaled(quality) {
    const rand = (base) => Math.round(Math.max(10, Math.min(100, base * quality + (Math.random() * 20 - 10))));
    return {
      customerService: rand(80), sales: rand(80), inventory: rand(75),
      discipline: rand(85), leadership: rand(60), technical: rand(70),
    };
  },

  randomCompanyName() {
    const names = ["Toko Maju Jaya", "CV Sinar Abadi", "PT Karya Mandiri", "Warung Berkah", "UD Sumber Rezeki"];
    return names[Math.floor(Math.random() * names.length)];
  },
};

/* ============================================================
   JOB LISTING MODEL (poin 22, 33)
   ============================================================ */
const JobListingModel = {
  create({ businessId, position, positionsAvailable, salaryMin, salaryMax, requirements }) {
    return {
      id: "job_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      businessId, position,
      positionsAvailable: positionsAvailable || 1,
      positionsFilled: 0,
      salaryMin, salaryMax,
      requirements: requirements || { experienceYears: 0, education: "SMA/SMK", minSkills: {} },
      status: "open",
      postedDate: null,
    };
  },
};

/* ============================================================
   PLAYER CAREER MODEL (poin 31-35)
   ============================================================ */
const PlayerCareerModel = {
  fresh() {
    return {
      currentJobId: null, currentCompany: null, currentPosition: null, currentIndustry: null,
      level: 0, levelTitle: "Unemployed", salary: 0,
      monthsInPosition: 0, yearsExperience: 0, performance: 70,
      skills: EmployeeModel.randomSkills(),
      education: "SMA/SMK",
      cv: { summary: "", workHistory: [] },
      applications: [],
      interviewsPassed: 0, interviewsFailed: 0,
    };
  },
};

/* ============================================================
   CREATOR MODEL (poin 36-40)
   ============================================================ */
const CreatorModel = {
  fresh() {
    return { youtube: null, tiktok: null, clipper: null, activeProfession: null };
  },

  freshYoutube() {
    return {
      channelName: "", subscribers: 0, totalViews: 0, totalWatchTimeHours: 0,
      videosUploaded: 0, uploadFrequencyPerWeek: 1, contentQuality: 40, niche: null,
      monetizationStatus: "not_eligible",
      monetizationRequirements: { subscribers: 1000, watchTimeHours: 4000 },
      revenueThisMonth: 0, totalRevenue: 0, brandDeals: [],
      membershipEnabled: false, affiliateEnabled: false, videos: [],
    };
  },

  freshTiktok() {
    return {
      username: "", followers: 0, totalViews: 0, totalLikes: 0,
      videosUploaded: 0, engagement: 0, contentQuality: 40, niche: null,
      trendAlignment: 50, creatorProgramEligible: false, creatorProgramStatus: "not_eligible",
      revenueThisMonth: 0, totalRevenue: 0, brandDeals: [],
      liveEnabled: false, giftsRevenue: 0, videos: [],
    };
  },

  freshClipper() {
    return {
      alias: "",
      skills: { editing: 40, hook: 40, timing: 40, caption: 40, retention: 40 },
      projectsCompleted: 0, currentProjects: [], rating: 3.0, totalEarnings: 0,
    };
  },
};

/* ============================================================
   TRADING POSITION MODEL (poin 9-17)
   ============================================================ */
const TradingPositionModel = {
  create({ assetId, side, size, leverage, entryPrice }) {
    const margin = size / leverage;
    return {
      id: "pos_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      assetId, side, size, leverage, margin, entryPrice,
      currentPrice: entryPrice,
      liquidationPrice: TradingPositionModel.calcLiquidationPrice(side, entryPrice, leverage),
      stopLoss: null, takeProfit: null, unrealizedPnL: 0,
      status: "open", openedAt: null, closedAt: null, realizedPnL: null,
    };
  },

  calcLiquidationPrice(side, entryPrice, leverage) {
    const liqDistance = 0.9 / leverage;
    return side === "long" ? entryPrice * (1 - liqDistance) : entryPrice * (1 + liqDistance);
  },

  calcPnL(position, currentPrice) {
    const priceDelta = position.side === "long"
      ? (currentPrice - position.entryPrice)
      : (position.entryPrice - currentPrice);
    const pctChange = priceDelta / position.entryPrice;
    return Math.round(position.size * pctChange);
  },
};

/* ============================================================
   BUSINESS UPGRADE TRACK MODEL (poin 18-19, 52)
   ============================================================ */
const BUSINESS_UPGRADE_TRACKS = {
  storeSize:      { name: "Store Size",         maxLevel: 5, baseCost: 8000000,  costMult: 1.8, effectPerLevel: { revenueMult: 0.08 } },
  inventoryCap:   { name: "Inventory Capacity",  maxLevel: 5, baseCost: 5000000,  costMult: 1.7, effectPerLevel: { inventorySlots: 20 } },
  employeeCap:    { name: "Employee Capacity",   maxLevel: 5, baseCost: 6000000,  costMult: 1.75,effectPerLevel: { maxEmployees: 2 } },
  marketing:      { name: "Marketing",           maxLevel: 5, baseCost: 4000000,  costMult: 1.6, effectPerLevel: { revenueMult: 0.06, reputationGain: 3 } },
  technology:     { name: "Technology",          maxLevel: 5, baseCost: 7000000,  costMult: 1.8, effectPerLevel: { expenseMult: -0.05 } },
  interior:       { name: "Interior",            maxLevel: 5, baseCost: 5500000,  costMult: 1.65,effectPerLevel: { reputationGain: 4 } },
  customerService:{ name: "Customer Service",    maxLevel: 5, baseCost: 3500000,  costMult: 1.6, effectPerLevel: { customerSatisfaction: 5 } },
  supplierNetwork:{ name: "Supplier Network",    maxLevel: 5, baseCost: 6500000,  costMult: 1.7, effectPerLevel: { expenseMult: -0.04 } },
  delivery:       { name: "Delivery",            maxLevel: 5, baseCost: 5000000,  costMult: 1.65,effectPerLevel: { revenueMult: 0.05 } },
  onlineStore:    { name: "Online Store",        maxLevel: 3, baseCost: 15000000, costMult: 2.0, effectPerLevel: { revenueMult: 0.15 } },
  branch:         { name: "Branch Expansion",    maxLevel: 5, baseCost: 30000000, costMult: 2.2, effectPerLevel: { revenueMult: 0.25, expenseMult: 0.15 } },
  automation:     { name: "Automation",          maxLevel: 4, baseCost: 20000000, costMult: 2.0, effectPerLevel: { expenseMult: -0.08, employeeCapMult: -0.1 } },
};

/* ============================================================
   SUPPLIER MODEL (poin 54)
   ============================================================ */
const SupplierModel = {
  create({ name, priceMult, quality, deliveryDays, reliability, minOrder }) {
    return {
      id: "sup_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      name, priceMult: priceMult || 1.0, quality: quality || 70,
      deliveryDays: deliveryDays || 3, reliability: reliability || 80,
      minOrder: minOrder || 10, contractActive: false,
    };
  },

  generateForBusiness(businessType) {
    return [
      SupplierModel.create({ name: "Supplier Ekonomis", priceMult: 0.85, quality: 55, deliveryDays: 5, reliability: 70, minOrder: 20 }),
      SupplierModel.create({ name: "Supplier Standar",   priceMult: 1.0,  quality: 75, deliveryDays: 3, reliability: 85, minOrder: 10 }),
      SupplierModel.create({ name: "Supplier Premium",   priceMult: 1.3,  quality: 92, deliveryDays: 1, reliability: 96, minOrder: 5 }),
    ];
  },
};

/* ============================================================
   EVENT MODEL (poin 43-47)
   ============================================================ */
const EventModel = {
  create({ title, category, severity, source, impacts, description }) {
    return {
      id: "evt_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      title, category, severity, source, description,
      impacts: impacts || [],
      startedAt: null, decayRate: 0.05, currentStrength: 1.0, active: true,
    };
  },

  SENSITIVITY: {
    war: { gold: 1.2, oil: 1.5, crypto: 0.8, stock_defense: 1.3, stock_general: -0.6, currency: -0.7, property: -0.3 },
    politics: { stock_general: -0.3, currency: -0.4, crypto: 0.3 },
    economic: { stock_general: -0.5, inflation: 1.0, currency: -0.5 },
    technology: { stock_tech: 0.8, crypto: 0.5 },
    disaster: { property_local: -0.8, stock_insurance: -0.4, commodity_affected: 0.6 },
    crypto: { crypto: 1.0 },
    energy: { oil: 1.0, stock_energy: 0.7, transport_cost: 0.5 },
  },
};

/* ============================================================
   HELPER: init semua system saat game load/fresh
   ============================================================ */
function initNewSystems() {
  if (typeof State === "undefined" || !State.data) {
    console.error("[data-models] State belum siap. Pastikan file ini di-load setelah state.js dan setelah State.load() dipanggil.");
    return;
  }
  extendStateWithNewSystems(State.data);
}
