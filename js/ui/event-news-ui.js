/* ============================================================
   BizSim — event-news-ui.js
   BREAKING NEWS UI (poin 47) + Event History (poin 46) +
   Achievement baru (poin 59)
   ============================================================ */

const EventNewsUI = {
  renderNewsFeed() {
    const news = State.data.newsHistory || [];
    return `
      <div class="bs-page-enter">
        <div class="bs-card-title bs-mb-12" style="font-size:17px;">Breaking News</div>
        ${news.length === 0
          ? `<div class="bs-card bs-text-secondary" style="text-align:center;">Belum ada berita</div>`
          : news.slice(0, 30).map(n => this._renderNewsCard(n)).join("")
        }
      </div>
    `;
  },

  _renderNewsCard(news) {
    const severityColor = { low: "var(--bs-text-secondary)", medium: "var(--bs-warning)", high: "var(--bs-danger)", critical: "var(--bs-danger)" }[news.severity];
    return `
      <div class="bs-card bs-card--interactive bs-mb-12" onclick="EventNewsUI.viewNewsDetail('${news.id}')">
        <div class="bs-flex bs-gap-12" style="align-items:flex-start;">
          <div style="flex-shrink:0;">${BSIllustration.eventBanner(news.category, 44)}</div>
          <div style="flex:1;">
            <div class="bs-flex" style="justify-content:space-between;align-items:center;margin-bottom:4px;">
              <span class="bs-badge" style="background:${severityColor}22;color:${severityColor};">${news.severity.toUpperCase()}</span>
              <span class="bs-text-secondary" style="font-size:10px;">${news.source === 'realworld' ? '🌐 Real-World' : '⚙ Simulasi'}</span>
            </div>
            <div style="font-weight:700;font-size:13px;">${news.title}</div>
            <div class="bs-text-secondary" style="font-size:11px;margin-top:2px;">${news.time}</div>
          </div>
        </div>
      </div>
    `;
  },

  viewNewsDetail(newsId) {
    const news = State.data.newsHistory.find(n => n.id === newsId);
    if (!news) return;
    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="text-align:center;margin-bottom:14px;">${BSIllustration.eventBanner(news.category, 64)}</div>
        <div style="font-size:17px;font-weight:800;text-align:center;margin-bottom:6px;">${news.title}</div>
        <div class="bs-text-secondary" style="text-align:center;font-size:12px;margin-bottom:16px;">${news.time} · ${news.category}</div>
        <div class="bs-card-subtitle bs-mb-12">Dampak ke Asset</div>
        ${news.affectedAssets.map(a => `
          <div class="bs-flex" style="justify-content:space-between;padding:8px 0;border-bottom:1px solid var(--bs-border);">
            <span style="font-size:13px;text-transform:capitalize;">${a.target.replace(/_/g, " ")}</span>
            <span style="font-weight:700;color:${a.pct >= 0 ? 'var(--bs-success)' : 'var(--bs-danger)'};">${a.pct >= 0 ? "+" : ""}${(a.pct*100).toFixed(1)}%</span>
          </div>
        `).join("")}
      </div>
    `);
  },

  // ==================== ACHIEVEMENT (poin 59) ====================
  ACHIEVEMENTS: [
    { id: "first_job", title: "First Job", description: "Dapatkan pekerjaan pertama Anda", icon: "💼", check: (d) => !!d.playerCareer?.currentPosition },
    { id: "first_salary", title: "First Salary", description: "Terima gaji pertama", icon: "💰", check: (d) => (d.playerCareer?.monthsInPosition || 0) >= 1 },
    { id: "first_promotion", title: "First Promotion", description: "Naik jabatan pertama kali", icon: "⭐", check: (d) => (d.playerCareer?.level || 0) >= 1 },
    { id: "first_employee", title: "First Employee", description: "Rekrut karyawan pertama", icon: "👤", check: (d) => (d.employees?.length || 0) >= 1 },
    { id: "good_boss", title: "Good Boss", description: "Miliki karyawan dengan morale 90+", icon: "😊", check: (d) => (d.employees || []).some(e => e.morale >= 90) },
    { id: "business_owner", title: "Business Owner", description: "Miliki bisnis pertama", icon: "🏢", check: (d) => (d.businesses?.length || 0) >= 1 },
    { id: "multiple_businesses", title: "Multiple Businesses", description: "Miliki 3+ bisnis", icon: "🏙", check: (d) => (d.businesses?.length || 0) >= 3 },
    { id: "first_trading_profit", title: "First Trading Profit", description: "Dapatkan profit trading pertama", icon: "📈", check: (d) => (d.tradingHistory || []).some(p => p.realizedPnL > 0) },
    { id: "first_short_profit", title: "First Short Profit", description: "Profit dari posisi SHORT", icon: "📉", check: (d) => (d.tradingHistory || []).some(p => p.side === "short" && p.realizedPnL > 0) },
    { id: "content_creator", title: "Content Creator", description: "Mulai jadi content creator", icon: "🎥", check: (d) => !!d.creatorProfiles?.activeProfession },
    { id: "1k_followers", title: "1K Followers", description: "Capai 1.000 followers/subscriber", icon: "🎉", check: (d) => (d.creatorProfiles?.youtube?.subscribers || 0) >= 1000 || (d.creatorProfiles?.tiktok?.followers || 0) >= 1000 },
    { id: "100k_followers", title: "100K Followers", description: "Capai 100.000 followers/subscriber", icon: "🌟", check: (d) => (d.creatorProfiles?.youtube?.subscribers || 0) >= 100000 || (d.creatorProfiles?.tiktok?.followers || 0) >= 100000 },
    { id: "first_million", title: "First Million", description: "Net worth mencapai Rp1 Miliar", icon: "💎", check: (d) => d.cash >= 1000000000 },
    { id: "business_empire", title: "Business Empire", description: "Miliki 5+ bisnis dengan total omzet besar", icon: "👑", check: (d) => (d.businesses?.length || 0) >= 5 },
    // FIX v5.0: 3 achievement dari spec asli poin 59 yang sebelumnya kelupaan
    { id: "first_investment", title: "First Investment", description: "Lakukan investasi/pembelian aset pertama", icon: "📊", check: (d) => (d.tradingHistory?.length || 0) >= 1 || (d.tradingPositions?.length || 0) >= 1 || (d.portfolio?.length || 0) >= 1 || (d.holdings?.length || 0) >= 1 },
    { id: "market_survivor", title: "Market Survivor", description: "Bertahan dari 3 event pasar parah tanpa bangkrut", icon: "🛡", check: (d) => (d.severeEventsSurvived || 0) >= 3 },
    { id: "first_brand_deal", title: "First Brand Deal", description: "Dapatkan brand deal pertama sebagai creator", icon: "🤝", check: (d) => (d.creatorProfiles?.youtube?.brandDeals?.length || 0) >= 1 || (d.creatorProfiles?.tiktok?.brandDeals?.length || 0) >= 1 },
  ],

  checkAndUnlockAchievements() {
    if (!State.data.unlockedAchievements) State.data.unlockedAchievements = [];
    const newlyUnlocked = [];

    this.ACHIEVEMENTS.forEach(ach => {
      if (State.data.unlockedAchievements.includes(ach.id)) return;
      if (ach.check(State.data)) {
        State.data.unlockedAchievements.push(ach.id);
        newlyUnlocked.push(ach);
      }
    });

    newlyUnlocked.forEach(ach => {
      BSInteraction.showAchievementUnlock({ title: ach.title, description: ach.description, icon: ach.icon });
    });

    return newlyUnlocked;
  },

  renderAchievementList() {
    const unlocked = State.data.unlockedAchievements || [];
    return `
      <div class="bs-page-enter">
        <div class="bs-card-title bs-mb-12" style="font-size:17px;">Achievement (${unlocked.length}/${this.ACHIEVEMENTS.length})</div>
        ${this.ACHIEVEMENTS.map(ach => {
          const isUnlocked = unlocked.includes(ach.id);
          return `
            <div class="bs-card bs-mb-12" style="opacity:${isUnlocked ? 1 : 0.45};">
              <div class="bs-flex bs-gap-12" style="align-items:center;">
                <div style="width:40px;height:40px;border-radius:12px;background:${isUnlocked ? 'var(--bs-gradient-gold)' : 'var(--bs-surface-alt)'};display:flex;align-items:center;justify-content:center;font-size:20px;">${ach.icon}</div>
                <div>
                  <div style="font-weight:700;font-size:13px;">${ach.title}</div>
                  <div class="bs-text-secondary" style="font-size:11px;">${ach.description}</div>
                </div>
              </div>
            </div>
          `;
        }).join("")}
      </div>
    `;
  },
};
