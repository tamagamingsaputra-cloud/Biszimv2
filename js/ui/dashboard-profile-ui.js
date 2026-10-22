/* ============================================================
   BizSim — dashboard-profile-ui.js
   DASHBOARD (poin 61) & PROFILE (poin 62) terpadu — menggabungkan
   cash, business value, portfolio, trading P/L, career income,
   creator income dalam satu ringkasan.
   ============================================================ */

const DashboardUI = {
  renderMainDashboard() {
    const cash = State.data.cash || 0;
    const businessValue = (State.data.businesses || []).reduce((a, b) => a + (b.value || b.totalInvested || 0), 0);
    const tradingSummary = TradingEngine.getOpenPositionsSummary();
    const career = State.data.playerCareer;
    const monthlyIncome = this._calcMonthlyIncome();

    const netWorth = cash + businessValue + tradingSummary.totalMargin + tradingSummary.totalUnrealizedPnL;

    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        ${BusinessDecisionUI.renderPendingBanner()}
        <div class="bs-card--hero bs-mb-12">
          <div style="font-size:12px;opacity:0.85;">NET WORTH</div>
          <div class="bs-animated-number" id="networth-display" style="font-size:28px;font-weight:800;margin-top:4px;">Rp${netWorth.toLocaleString("id-ID")}</div>
          <div style="display:flex;gap:16px;margin-top:14px;flex-wrap:wrap;">
            <div><div style="font-size:11px;opacity:0.8;">Cash</div><div style="font-weight:700;">Rp${(cash/1000000).toFixed(1)}jt</div></div>
            <div><div style="font-size:11px;opacity:0.8;">Bisnis</div><div style="font-weight:700;">Rp${(businessValue/1000000).toFixed(1)}jt</div></div>
            <div><div style="font-size:11px;opacity:0.8;">Trading</div><div style="font-weight:700;">Rp${(tradingSummary.totalMargin/1000000).toFixed(1)}jt</div></div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div class="bs-card">
            <div class="bs-text-secondary" style="font-size:10px;">Income Bulanan</div>
            <div style="font-weight:800;font-size:15px;color:var(--bs-success);">+Rp${(monthlyIncome.total/1000000).toFixed(1)}jt</div>
          </div>
          <div class="bs-card">
            <div class="bs-text-secondary" style="font-size:10px;">Trading P/L</div>
            <div style="font-weight:800;font-size:15px;color:${tradingSummary.totalUnrealizedPnL >= 0 ? 'var(--bs-success)' : 'var(--bs-danger)'};">
              ${tradingSummary.totalUnrealizedPnL >= 0 ? "+" : ""}Rp${(tradingSummary.totalUnrealizedPnL/1000000).toFixed(1)}jt
            </div>
          </div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-card-title bs-mb-12" style="font-size:13px;">Sumber Income</div>
          <div style="font-size:12px;line-height:2;">
            ${career?.currentPosition ? `<div class="bs-flex" style="justify-content:space-between;"><span>Gaji (${career.currentPosition})</span><span style="font-weight:700;">Rp${career.salary.toLocaleString("id-ID")}</span></div>` : ""}
            ${monthlyIncome.business > 0 ? `<div class="bs-flex" style="justify-content:space-between;"><span>Bisnis</span><span style="font-weight:700;">Rp${monthlyIncome.business.toLocaleString("id-ID")}</span></div>` : ""}
            ${monthlyIncome.creator > 0 ? `<div class="bs-flex" style="justify-content:space-between;"><span>Creator</span><span style="font-weight:700;">Rp${monthlyIncome.creator.toLocaleString("id-ID")}</span></div>` : ""}
            ${monthlyIncome.total === 0 ? `<div class="bs-text-secondary">Belum ada sumber income aktif</div>` : ""}
          </div>
        </div>

        <div class="bs-card-subtitle bs-mb-12">Posisi & Aset Aktif</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
          <div class="bs-card" style="text-align:center;">
            <div style="font-size:20px;font-weight:800;">${tradingSummary.count}</div>
            <div class="bs-text-secondary" style="font-size:11px;">Posisi Trading</div>
          </div>
          <div class="bs-card" style="text-align:center;">
            <div style="font-size:20px;font-weight:800;">${(State.data.businesses || []).length}</div>
            <div class="bs-text-secondary" style="font-size:11px;">Bisnis</div>
          </div>
          <div class="bs-card" style="text-align:center;">
            <div style="font-size:20px;font-weight:800;">${(State.data.employees || []).length}</div>
            <div class="bs-text-secondary" style="font-size:11px;">Karyawan</div>
          </div>
          <div class="bs-card" style="text-align:center;">
            <div style="font-size:20px;font-weight:800;">${State.data.newsHistory?.length || 0}</div>
            <div class="bs-text-secondary" style="font-size:11px;">Event Tercatat</div>
          </div>
        </div>
      </div>
    `;
  },

  _calcMonthlyIncome() {
    const career = (State.data.playerCareer?.salary) || 0;
    const business = 0; // dihitung dari engine bisnis asli, sambungkan jika ada field revenue
    const creator = (State.data.creatorProfiles?.youtube?.revenueThisMonth || 0) + (State.data.creatorProfiles?.tiktok?.revenueThisMonth || 0);
    return { career, business, creator, total: career + business + creator };
  },

  // ==================== PROFILE (poin 62) ====================
  renderProfile() {
    const career = State.data.playerCareer;
    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        <div class="bs-card--hero bs-mb-12" style="text-align:center;">
          <div style="width:72px;height:72px;margin:0 auto 10px;border-radius:20px;overflow:hidden;background:rgba(255,255,255,0.15);">
            ${BSIllustration.characterPortrait(1, "male", 72)}
          </div>
          <div style="font-size:18px;font-weight:800;">${State.data.playerName || "Pemain"}</div>
          <div style="font-size:12px;opacity:0.85;">${career?.currentPosition || "Belum Bekerja"}</div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-card-title bs-mb-12" style="font-size:13px;">Ringkasan</div>
          <div style="font-size:12px;line-height:2;">
            <div class="bs-flex" style="justify-content:space-between;"><span>Pendidikan</span><span style="font-weight:700;">${career?.education || "-"}</span></div>
            <div class="bs-flex" style="justify-content:space-between;"><span>Pengalaman Kerja</span><span style="font-weight:700;">${career?.yearsExperience || 0} tahun</span></div>
            <div class="bs-flex" style="justify-content:space-between;"><span>Interview Lolos</span><span style="font-weight:700;">${career?.interviewsPassed || 0}</span></div>
            <div class="bs-flex" style="justify-content:space-between;"><span>Achievement</span><span style="font-weight:700;">${(State.data.unlockedAchievements || []).length}/${EventNewsUI.ACHIEVEMENTS.length}</span></div>
          </div>
        </div>

        <div class="bs-flex bs-gap-8">
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="UI.navigate && UI.navigate('achievements')">Achievement</button>
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="UI.navigate && UI.navigate('career')">Riwayat Karir</button>
        </div>
      </div>
    `;
  },
};
