/* ============================================================
   BizSim — creator-engine.js
   DIGITAL JOBS: YouTuber, TikToker, Clipper — sistem BERBEDA
   per profesi (poin 36-41), bukan satu template generik.
   
   Depends on: data-models.js (CreatorModel)
   ============================================================ */

const CreatorEngine = {
  // ==================== YOUTUBE (poin 37-38) ====================
  startYoutube(channelName, niche) {
    if (!State.data.creatorProfiles) State.data.creatorProfiles = CreatorModel.fresh();
    const yt = CreatorModel.freshYoutube();
    yt.channelName = channelName;
    yt.niche = niche;
    State.data.creatorProfiles.youtube = yt;
    State.data.creatorProfiles.activeProfession = "youtube";
    State.notify("Channel Dibuat", `${channelName} resmi diluncurkan!`, "success");
    return yt;
  },

  uploadYoutubeVideo({ title, editingSkill, scriptingSkill }) {
    const yt = State.data.creatorProfiles?.youtube;
    if (!yt) return { success: false, error: "Belum punya channel YouTube" };

    // Quality dipengaruhi skill + sedikit random (poin 37: jangan langsung besar)
    const skillAvg = ((editingSkill || 40) + (scriptingSkill || 40)) / 2;
    const quality = Math.max(10, Math.min(100, skillAvg + (Math.random() * 20 - 10)));
    yt.contentQuality = Math.round((yt.contentQuality * 0.7) + (quality * 0.3)); // moving average

    // Views dipengaruhi subscriber base + quality + sedikit viral chance
    const baseViews = Math.max(20, yt.subscribers * (0.05 + quality / 1000));
    const viralChance = quality > 75 ? 0.08 : 0.02;
    const isViral = Math.random() < viralChance;
    const views = Math.round(baseViews * (isViral ? (3 + Math.random() * 7) : (0.5 + Math.random())));

    const likes = Math.round(views * (0.03 + quality / 2000));
    const watchTimeHours = Math.round(views * (3 + quality / 20) / 60); // rough estimate

    const video = {
      id: "yt_" + Date.now(),
      title, views, likes, quality: Math.round(quality),
      uploadDate: this._nowStr(),
      isViral,
    };
    yt.videos.unshift(video);
    if (yt.videos.length > 50) yt.videos.length = 50;

    yt.videosUploaded++;
    yt.totalViews += views;
    yt.totalWatchTimeHours += watchTimeHours;

    // Subscriber growth: sebagian kecil viewer jadi subscriber (poin 37: progression bertahap)
    const newSubs = Math.round(views * (0.01 + quality / 3000) * (isViral ? 2 : 1));
    yt.subscribers += newSubs;

    if (isViral) {
      State.notify("🔥 Video Viral!", `"${title}" mendapat ${views.toLocaleString("id-ID")} views!`, "success");
    }

    this._checkYoutubeMonetizationEligibility(yt);

    return { success: true, video, newSubs };
  },

  // Sistem eligibility monetisasi (poin 38) — jangan langsung dapat Ad Revenue
  _checkYoutubeMonetizationEligibility(yt) {
    if (yt.monetizationStatus === "not_eligible") {
      const req = yt.monetizationRequirements;
      if (yt.subscribers >= req.subscribers && yt.totalWatchTimeHours >= req.watchTimeHours) {
        yt.monetizationStatus = "eligible_not_applied";
        State.notify("Monetisasi Tersedia!", "Channel Anda sudah memenuhi syarat. Ajukan monetisasi sekarang!", "info");
      }
    }
  },

  applyYoutubeMonetization() {
    const yt = State.data.creatorProfiles?.youtube;
    if (!yt) return { success: false, error: "Belum punya channel" };
    if (yt.monetizationStatus !== "eligible_not_applied") {
      return { success: false, error: "Belum memenuhi syarat atau sudah diajukan" };
    }
    yt.monetizationStatus = "pending_review";
    // Review butuh waktu — diproses di tick harian (lihat processCreatorDaily)
    yt._reviewDaysLeft = 7 + Math.floor(Math.random() * 14);
    return { success: true };
  },

  processYoutubeMonthlyRevenue() {
    const yt = State.data.creatorProfiles?.youtube;
    if (!yt || yt.monetizationStatus !== "approved") return;

    const cpmIDR = 8000 + Math.random() * 12000; // CPM realistis Indonesia (kasar)
    const adRevenue = Math.round((yt.totalWatchTimeHours * 0.3) * (cpmIDR / 1000) * 60);
    const membershipRevenue = yt.membershipEnabled ? Math.round(yt.subscribers * 0.002 * 30000) : 0;
    const affiliateRevenue = yt.affiliateEnabled ? Math.round(yt.totalViews * 0.001 * 2000) : 0;
    const brandDealRevenue = yt.brandDeals.filter(b => b.active).reduce((a, b) => a + b.amount, 0);

    const total = adRevenue + membershipRevenue + affiliateRevenue + brandDealRevenue;
    yt.revenueThisMonth = total;
    yt.totalRevenue += total;

    State.data.cash += total;
    State.addTx("YouTube Revenue", `Pendapatan channel ${yt.channelName}`, total);

    return { total, breakdown: { adRevenue, membershipRevenue, affiliateRevenue, brandDealRevenue } };
  },

  // ==================== TIKTOK (poin 39) ====================
  startTiktok(username, niche) {
    if (!State.data.creatorProfiles) State.data.creatorProfiles = CreatorModel.fresh();
    const tt = CreatorModel.freshTiktok();
    tt.username = username;
    tt.niche = niche;
    State.data.creatorProfiles.tiktok = tt;
    State.data.creatorProfiles.activeProfession = "tiktok";
    return tt;
  },

  uploadTiktokVideo({ title, editingSkill }) {
    const tt = State.data.creatorProfiles?.tiktok;
    if (!tt) return { success: false, error: "Belum punya akun TikTok" };

    const quality = Math.max(10, Math.min(100, (editingSkill || 40) + (Math.random() * 25 - 12)));
    tt.contentQuality = Math.round((tt.contentQuality * 0.6) + (quality * 0.4));

    // TikTok: algoritma lebih volatile, trend-based, bukan cuma follower base
    const trendBonus = tt.trendAlignment / 100;
    const baseViews = Math.max(50, tt.followers * 0.3 + 200);
    const algorithmBoost = Math.random() < (0.1 + trendBonus * 0.15) ? (5 + Math.random() * 20) : (0.3 + Math.random() * 1.5);
    const views = Math.round(baseViews * algorithmBoost * (quality / 60));

    const likes = Math.round(views * (0.05 + quality / 1500));
    const engagement = Math.round(((likes / Math.max(1, views)) * 100) * 10) / 10;

    const video = { id: "tt_" + Date.now(), title, views, likes, quality: Math.round(quality), uploadDate: this._nowStr() };
    tt.videos.unshift(video);
    if (tt.videos.length > 50) tt.videos.length = 50;

    tt.videosUploaded++;
    tt.totalViews += views;
    tt.totalLikes += likes;
    tt.engagement = engagement;

    const newFollowers = Math.round(views * (0.02 + quality / 2500));
    tt.followers += newFollowers;

    // Creator Program eligibility (poin 39, configurable-style threshold)
    if (!tt.creatorProgramEligible && tt.followers >= 10000) {
      tt.creatorProgramEligible = true;
      tt.creatorProgramStatus = "eligible_not_applied";
      State.notify("Creator Program Tersedia", "Anda memenuhi syarat TikTok Creator Program!", "info");
    }

    return { success: true, video, newFollowers };
  },

  applyTiktokCreatorProgram() {
    const tt = State.data.creatorProfiles?.tiktok;
    if (!tt || !tt.creatorProgramEligible) return { success: false, error: "Belum memenuhi syarat" };
    tt.creatorProgramStatus = "approved"; // TikTok umumnya lebih cepat approve dibanding YouTube
    return { success: true };
  },

  processTiktokMonthlyRevenue() {
    const tt = State.data.creatorProfiles?.tiktok;
    if (!tt) return;

    let total = 0;
    if (tt.creatorProgramStatus === "approved") {
      // Rate TikTok per-view jauh lebih kecil dari YouTube CPM, tapi volume bisa tinggi
      total += Math.round(tt.totalViews * (2 + Math.random() * 3));
    }
    total += tt.brandDeals.filter(b => b.active).reduce((a, b) => a + b.amount, 0);
    total += tt.giftsRevenue;

    tt.revenueThisMonth = total;
    tt.totalRevenue += total;
    tt.giftsRevenue = 0; // reset bulanan

    if (total > 0) {
      State.data.cash += total;
      State.addTx("TikTok Revenue", `Pendapatan @${tt.username}`, total);
    }

    return { total };
  },

  // ==================== CLIPPER (poin 40) ====================
  startClipper(alias) {
    if (!State.data.creatorProfiles) State.data.creatorProfiles = CreatorModel.fresh();
    const clipper = CreatorModel.freshClipper();
    clipper.alias = alias;
    State.data.creatorProfiles.clipper = clipper;
    State.data.creatorProfiles.activeProfession = "clipper";
    return clipper;
  },

  // Project masuk dari "client" (procedural), clipper terima & kerjakan
  generateClipperProjectOffer() {
    const sourceLengthMin = 20 + Math.floor(Math.random() * 100); // panjang video sumber (menit)
    const payRate = 50000 + Math.floor(Math.random() * 150000); // per clip
    return {
      id: "proj_" + Date.now(),
      sourceLength: sourceLengthMin,
      clipsRequested: 2 + Math.floor(Math.random() * 4),
      deadlineDays: 2 + Math.floor(Math.random() * 5),
      payRate,
      status: "offered",
    };
  },

  acceptClipperProject(project) {
    const clipper = State.data.creatorProfiles?.clipper;
    if (!clipper) return { success: false, error: "Belum jadi clipper" };
    project.status = "in_progress";
    project.daysRemaining = project.deadlineDays;
    clipper.currentProjects.push(project);
    return { success: true };
  },

  // Kualitas hasil clip dipengaruhi skill (poin 40: editing, hook, timing, caption, retention)
  completeClipperProject(projectId) {
    const clipper = State.data.creatorProfiles?.clipper;
    if (!clipper) return { success: false };
    const project = clipper.currentProjects.find(p => p.id === projectId);
    if (!project) return { success: false, error: "Project tidak ditemukan" };

    const skillAvg = Object.values(clipper.skills).reduce((a, b) => a + b, 0) / 5;
    const qualityScore = Math.max(0, Math.min(100, skillAvg + (Math.random() * 15 - 7)));

    // Rate makin tinggi jika kualitas bagus (poin 40)
    const payMultiplier = 0.7 + (qualityScore / 100) * 0.8;
    const totalPay = Math.round(project.payRate * project.clipsRequested * payMultiplier);

    State.data.cash += totalPay;
    State.addTx("Clipper Payment", `Project: ${project.clipsRequested} clips`, totalPay);

    clipper.totalEarnings += totalPay;
    clipper.projectsCompleted++;
    clipper.currentProjects = clipper.currentProjects.filter(p => p.id !== projectId);

    // Rating update (poin 40)
    const projectRating = 1 + (qualityScore / 100) * 4; // 1-5
    clipper.rating = Math.round(((clipper.rating * (clipper.projectsCompleted - 1)) + projectRating) / clipper.projectsCompleted * 10) / 10;

    // Skill sedikit naik tiap project selesai (learning by doing)
    Object.keys(clipper.skills).forEach(s => {
      clipper.skills[s] = Math.min(100, clipper.skills[s] + (1 + Math.random() * 2));
    });

    State.notify("Project Selesai", `+Rp${totalPay.toLocaleString("id-ID")} — Rating: ${projectRating.toFixed(1)}/5`, "success");
    return { success: true, totalPay, qualityScore, projectRating };
  },

  // ---------- DAILY TICK ----------
  processCreatorDaily() {
    const profiles = State.data.creatorProfiles;
    if (!profiles) return;

    // YouTube monetization review countdown
    if (profiles.youtube?.monetizationStatus === "pending_review" && profiles.youtube._reviewDaysLeft > 0) {
      profiles.youtube._reviewDaysLeft--;
      if (profiles.youtube._reviewDaysLeft <= 0) {
        const approved = Math.random() < 0.85; // sebagian besar approved kalau sudah eligible
        profiles.youtube.monetizationStatus = approved ? "approved" : "rejected";
        State.notify(
          approved ? "Monetisasi Disetujui!" : "Monetisasi Ditolak",
          approved ? "Channel Anda kini dapat menghasilkan Ad Revenue" : "Silakan ajukan kembali nanti",
          approved ? "success" : "warning"
        );
      }
    }

    // Project deadline countdown
    if (profiles.clipper) {
      profiles.clipper.currentProjects.forEach(p => {
        if (p.status === "in_progress") p.daysRemaining--;
      });
    }

    // Brand deal offer check (poin 38-39) — hanya generate kalau belum ada offer pending
    if (profiles.youtube && !State.data.pendingBrandDealOffers.youtube) {
      const offer = this.tryGenerateBrandDealOffer("youtube");
      if (offer) State.data.pendingBrandDealOffers.youtube = offer;
    }
    if (profiles.tiktok && !State.data.pendingBrandDealOffers.tiktok) {
      const offer = this.tryGenerateBrandDealOffer("tiktok");
      if (offer) State.data.pendingBrandDealOffers.tiktok = offer;
    }
  },

  // ---------- BRAND DEAL (poin 38-39, sebelumnya array kosong tanpa cara
  // mendapatkannya — sekarang benar-benar bisa didapat & diterima) ----------
  BRAND_SPONSORS: [
    { name: "TechGadget ID", niche: "technology" }, { name: "KulinerNusantara", niche: "food" },
    { name: "FashionKita", niche: "fashion" }, { name: "GameZone", niche: "gaming" },
    { name: "SkincareLokal", niche: "beauty" }, { name: "FinTechapp", niche: "finance" },
  ],

  // Muncul otomatis kalau channel sudah cukup besar (dicek dari processCreatorDaily)
  tryGenerateBrandDealOffer(platform) {
    const profile = State.data.creatorProfiles?.[platform];
    if (!profile) return null;

    const audienceSize = platform === "youtube" ? profile.subscribers : profile.followers;
    const minAudience = platform === "youtube" ? 5000 : 8000;
    if (audienceSize < minAudience) return null;

    const chance = platform === "youtube" ? 0.04 : 0.05;
    if (Math.random() > chance) return null;

    const sponsor = this.BRAND_SPONSORS[Math.floor(Math.random() * this.BRAND_SPONSORS.length)];
    // Rate berdasarkan audience size + content quality (poin 64: tidak semua deal besar)
    const baseRate = audienceSize * (platform === "youtube" ? 350 : 120);
    const qualityMult = 0.7 + (profile.contentQuality / 100) * 0.6;
    const amount = Math.round(baseRate * qualityMult * (0.8 + Math.random() * 0.5));

    const offer = {
      id: "deal_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      sponsor: sponsor.name,
      niche: sponsor.niche,
      amount,
      durationMonths: 1 + Math.floor(Math.random() * 3),
      platform,
      status: "offered",
      active: false,
    };
    State.notify("💰 Tawaran Brand Deal", `${sponsor.name} ingin sponsorship — Rp${amount.toLocaleString("id-ID")}`, "info");
    return offer;
  },

  acceptBrandDeal(platform, offer) {
    const profile = State.data.creatorProfiles?.[platform];
    if (!profile) return { success: false, error: "Profil tidak ditemukan" };
    offer.status = "accepted";
    offer.active = true;
    offer.monthsRemaining = offer.durationMonths;
    profile.brandDeals.push(offer);
    State.data.pendingBrandDealOffers[platform] = null;
    State.notify("Brand Deal Diterima!", `Kerja sama dengan ${offer.sponsor} dimulai`, "success");
    return { success: true };
  },

  rejectBrandDeal(platform) {
    State.data.pendingBrandDealOffers[platform] = null;
    return { success: true };
  },

  // Kurangi durasi brand deal aktif tiap bulan, non-aktifkan kalau habis
  processBrandDealDurations(platform) {
    const profile = State.data.creatorProfiles?.[platform];
    if (!profile) return;
    profile.brandDeals.forEach(deal => {
      if (!deal.active) return;
      deal.monthsRemaining--;
      if (deal.monthsRemaining <= 0) {
        deal.active = false;
        State.notify("Brand Deal Berakhir", `Kerja sama dengan ${deal.sponsor} telah selesai`, "info");
      }
    });
  },

  // ---------- MONTHLY TICK ----------
  processCreatorMonthly() {
    this.processYoutubeMonthlyRevenue();
    this.processTiktokMonthlyRevenue();
    this.processBrandDealDurations("youtube");
    this.processBrandDealDurations("tiktok");
  },

  _nowStr() {
    const t = State.data.time;
    return `T${t.year}.${String(t.month).padStart(2, "0")}.${String(t.day).padStart(2, "0")}`;
  },
};
