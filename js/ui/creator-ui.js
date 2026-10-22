/* ============================================================
   BizSim — creator-ui.js
   DASHBOARD BERBEDA PER PROFESI (poin 41) — bukan satu template
   
   YouTube -> Channel dashboard (subscriber, watch time, monetisasi)
   TikTok -> Short video dashboard (followers, trend, engagement)
   Clipper -> Project editing dashboard (skill, project, rating)
   ============================================================ */

const CreatorUI = {
  // ==================== PROFESSION PICKER ====================
  renderProfessionPicker() {
    return `
      <div class="bs-page-enter">
        <div class="bs-card-title bs-mb-12" style="font-size:17px;">Pekerjaan Digital</div>
        <div class="bs-card bs-card--interactive bs-mb-12" onclick="CreatorUI.openStartSheet('youtube')">
          <div class="bs-flex bs-gap-12" style="align-items:center;">
            <div style="width:56px;height:56px;">${BSIllustration.job('youtuber', 56)}</div>
            <div><div style="font-weight:700;">YouTuber</div><div class="bs-text-secondary" style="font-size:11px;">Channel, Ad Revenue, Brand Deal</div></div>
          </div>
        </div>
        <div class="bs-card bs-card--interactive bs-mb-12" onclick="CreatorUI.openStartSheet('tiktok')">
          <div class="bs-flex bs-gap-12" style="align-items:center;">
            <div style="width:56px;height:56px;">${BSIllustration.job('tiktoker', 56)}</div>
            <div><div style="font-weight:700;">TikToker</div><div class="bs-text-secondary" style="font-size:11px;">Followers, Trend, Live Gift</div></div>
          </div>
        </div>
        <div class="bs-card bs-card--interactive bs-mb-12" onclick="CreatorUI.openStartSheet('clipper')">
          <div class="bs-flex bs-gap-12" style="align-items:center;">
            <div style="width:56px;height:56px;">${BSIllustration.job('clipper', 56)}</div>
            <div><div style="font-weight:700;">Clipper</div><div class="bs-text-secondary" style="font-size:11px;">Edit klip, per-project payment</div></div>
          </div>
        </div>
      </div>
    `;
  },

  openStartSheet(type) {
    const labels = { youtube: "Nama Channel", tiktok: "Username", clipper: "Nama/Alias" };
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Mulai jadi ${type === 'youtube' ? 'YouTuber' : type === 'tiktok' ? 'TikToker' : 'Clipper'}</h3>
      <label style="font-size:12px;font-weight:700;">${labels[type]}</label>
      <input type="text" id="creator-name-input" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 16px;">
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="CreatorUI.executeStart('${type}')">Mulai</button>
    `);
  },

  executeStart(type) {
    const name = document.getElementById("creator-name-input")?.value || "MyChannel";
    if (type === "youtube") CreatorEngine.startYoutube(name, "general");
    if (type === "tiktok") CreatorEngine.startTiktok(name, "general");
    if (type === "clipper") CreatorEngine.startClipper(name);
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    UI.refresh && UI.refresh();
  },

  // ==================== YOUTUBE DASHBOARD (poin 37-38) ====================
  renderYoutubeDashboard() {
    const yt = State.data.creatorProfiles.youtube;
    if (!yt) return this.renderProfessionPicker();

    const monetizationLabel = {
      not_eligible: "Belum Memenuhi Syarat",
      eligible_not_applied: "Bisa Ajukan Monetisasi",
      pending_review: "Sedang Direview",
      approved: "Monetisasi Aktif",
      rejected: "Ditolak",
    }[yt.monetizationStatus];

    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        ${this._renderBrandDealBanner("youtube")}
        <div class="bs-card--hero bs-mb-12">
          <div style="font-size:12px;opacity:0.85;">YOUTUBE CHANNEL</div>
          <div style="font-size:20px;font-weight:800;">${yt.channelName}</div>
          <div style="display:flex;gap:20px;margin-top:14px;">
            <div><div style="font-size:22px;font-weight:800;">${this._formatCount(yt.subscribers)}</div><div style="font-size:11px;opacity:0.85;">Subscriber</div></div>
            <div><div style="font-size:22px;font-weight:800;">${this._formatCount(yt.totalViews)}</div><div style="font-size:11px;opacity:0.85;">Total Views</div></div>
          </div>
        </div>

        <div class="bs-card bs-mb-12">
          <div class="bs-flex" style="justify-content:space-between;align-items:center;">
            <div>
              <div style="font-weight:700;font-size:13px;">Status Monetisasi</div>
              <div class="bs-text-secondary" style="font-size:11px;">${monetizationLabel}</div>
            </div>
            ${yt.monetizationStatus === "eligible_not_applied"
              ? `<button class="bs-btn bs-btn-primary" style="min-height:36px;" onclick="CreatorUI.applyMonetization()">Ajukan</button>`
              : `<span class="bs-badge ${yt.monetizationStatus === 'approved' ? 'success' : ''}">${yt.monetizationStatus === 'approved' ? '✓' : '—'}</span>`
            }
          </div>
          ${yt.monetizationStatus === "not_eligible" ? `
            <div class="bs-progress-track" style="margin-top:10px;"><div class="bs-progress-fill" style="width:${Math.min(100,(yt.subscribers/yt.monetizationRequirements.subscribers)*100)}%;"></div></div>
            <div class="bs-text-secondary" style="font-size:10px;margin-top:4px;">${yt.subscribers}/${yt.monetizationRequirements.subscribers} subscriber</div>
          ` : ""}
        </div>

        ${yt.monetizationStatus === "approved" ? `
          <div class="bs-card bs-mb-12">
            <div class="bs-text-secondary" style="font-size:10px;">Revenue Bulan Ini</div>
            <div style="font-size:20px;font-weight:800;color:var(--bs-success);">Rp${yt.revenueThisMonth.toLocaleString("id-ID")}</div>
          </div>
        ` : ""}

        <button class="bs-btn bs-btn-primary bs-btn-block bs-mb-12" onclick="CreatorUI.openUploadSheet('youtube')">Upload Video Baru</button>

        <div class="bs-card-subtitle bs-mb-12">Video Terbaru</div>
        ${yt.videos.slice(0, 5).map(v => `
          <div class="bs-card bs-mb-12">
            <div style="font-weight:700;font-size:13px;">${v.title} ${v.isViral ? '🔥' : ''}</div>
            <div class="bs-text-secondary" style="font-size:11px;">${this._formatCount(v.views)} views · ${this._formatCount(v.likes)} likes</div>
          </div>
        `).join("") || `<div class="bs-card bs-text-secondary" style="text-align:center;">Belum ada video</div>`}
      </div>
    `;
  },

  applyMonetization() {
    const result = CreatorEngine.applyYoutubeMonetization();
    if (result.success) BSInteraction.showToast({ title: "Pengajuan Terkirim", message: "Review 7-21 hari", type: "info" });
    UI.refresh && UI.refresh();
  },

  // ==================== TIKTOK DASHBOARD (poin 39) ====================
  renderTiktokDashboard() {
    const tt = State.data.creatorProfiles.tiktok;
    if (!tt) return this.renderProfessionPicker();

    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        ${this._renderBrandDealBanner("tiktok")}
        <div class="bs-card--hero bs-mb-12" style="background:linear-gradient(135deg,#1A1A2E 0%,#4F1A5C 100%);">
          <div style="font-size:12px;opacity:0.85;">TIKTOK</div>
          <div style="font-size:20px;font-weight:800;">@${tt.username}</div>
          <div style="display:flex;gap:20px;margin-top:14px;">
            <div><div style="font-size:22px;font-weight:800;">${this._formatCount(tt.followers)}</div><div style="font-size:11px;opacity:0.85;">Followers</div></div>
            <div><div style="font-size:22px;font-weight:800;">${tt.engagement}%</div><div style="font-size:11px;opacity:0.85;">Engagement</div></div>
          </div>
        </div>

        <div class="bs-card bs-mb-12">
          <div style="font-weight:700;font-size:13px;">Creator Program</div>
          <div class="bs-text-secondary" style="font-size:11px;">${tt.creatorProgramStatus === 'approved' ? 'Aktif ✓' : tt.creatorProgramEligible ? 'Bisa Diajukan' : `Butuh 10.000 followers (${tt.followers})`}</div>
          ${tt.creatorProgramEligible && tt.creatorProgramStatus !== 'approved' ? `<button class="bs-btn bs-btn-primary bs-btn-block" style="margin-top:10px;min-height:38px;" onclick="CreatorUI.applyTiktokProgram()">Ajukan</button>` : ""}
        </div>

        <button class="bs-btn bs-btn-primary bs-btn-block bs-mb-12" onclick="CreatorUI.openUploadSheet('tiktok')">Upload Video Baru</button>

        <div class="bs-card-subtitle bs-mb-12">Video Terbaru</div>
        ${tt.videos.slice(0, 5).map(v => `
          <div class="bs-card bs-mb-12">
            <div style="font-weight:700;font-size:13px;">${v.title}</div>
            <div class="bs-text-secondary" style="font-size:11px;">${this._formatCount(v.views)} views · ${this._formatCount(v.likes)} likes</div>
          </div>
        `).join("") || `<div class="bs-card bs-text-secondary" style="text-align:center;">Belum ada video</div>`}
      </div>
    `;
  },

  applyTiktokProgram() {
    CreatorEngine.applyTiktokCreatorProgram();
    UI.refresh && UI.refresh();
  },

  openUploadSheet(type) {
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Upload Video</h3>
      <input type="text" id="video-title-input" placeholder="Judul video" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin-bottom:16px;">
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="CreatorUI.executeUpload('${type}')">Publish</button>
    `);
  },

  executeUpload(type) {
    const title = document.getElementById("video-title-input")?.value || "Video Baru";
    const skillProxy = State.data.playerCareer?.skills?.technical || 40;
    let result;
    if (type === "youtube") result = CreatorEngine.uploadYoutubeVideo({ title, editingSkill: skillProxy, scriptingSkill: skillProxy });
    else result = CreatorEngine.uploadTiktokVideo({ title, editingSkill: skillProxy });

    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    if (result.success) BSInteraction.showToast({ title: "Video Diupload", message: `${this._formatCount(result.video.views)} views`, type: "success" });
    UI.refresh && UI.refresh();
  },

  // ==================== CLIPPER DASHBOARD (poin 40) ====================
  renderClipperDashboard() {
    const c = State.data.creatorProfiles.clipper;
    if (!c) return this.renderProfessionPicker();

    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        <div class="bs-card--hero bs-mb-12" style="background:linear-gradient(135deg,#4F6BFF 0%,#2A3B99 100%);">
          <div style="font-size:12px;opacity:0.85;">CLIPPER</div>
          <div style="font-size:20px;font-weight:800;">${c.alias}</div>
          <div style="display:flex;gap:20px;margin-top:14px;">
            <div><div style="font-size:22px;font-weight:800;">${c.rating.toFixed(1)}★</div><div style="font-size:11px;opacity:0.85;">Rating</div></div>
            <div><div style="font-size:22px;font-weight:800;">${c.projectsCompleted}</div><div style="font-size:11px;opacity:0.85;">Project Selesai</div></div>
          </div>
        </div>

        <div class="bs-card-subtitle bs-mb-12">Skill</div>
        <div class="bs-card bs-mb-12">
          ${Object.entries(c.skills).map(([skill, val]) => `
            <div class="bs-skill-bar-row">
              <span class="bs-skill-bar-label">${skill}</span>
              <div class="bs-progress-track" style="flex:1;"><div class="bs-progress-fill" style="width:${val}%;"></div></div>
              <span style="font-size:11px;font-weight:700;width:26px;text-align:right;">${Math.round(val)}</span>
            </div>
          `).join("")}
        </div>

        <button class="bs-btn bs-btn-primary bs-btn-block bs-mb-12" onclick="CreatorUI.findClipperProject()">Cari Project</button>

        <div class="bs-card-subtitle bs-mb-12">Project Berjalan</div>
        ${c.currentProjects.length === 0
          ? `<div class="bs-card bs-text-secondary" style="text-align:center;">Tidak ada project aktif</div>`
          : c.currentProjects.map(p => `
            <div class="bs-card bs-mb-12">
              <div style="font-weight:700;font-size:13px;">${p.clipsRequested} clips dari video ${p.sourceLength} menit</div>
              <div class="bs-text-secondary" style="font-size:11px;">Rp${p.payRate.toLocaleString("id-ID")}/clip · ${p.daysRemaining} hari tersisa</div>
              ${p.daysRemaining <= 0 ? `<button class="bs-btn bs-btn-success bs-btn-block" style="margin-top:8px;min-height:36px;" onclick="CreatorUI.completeProject('${p.id}')">Selesaikan</button>` : ""}
            </div>
          `).join("")
        }
      </div>
    `;
  },

  findClipperProject() {
    const offer = CreatorEngine.generateClipperProjectOffer();
    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="font-size:16px;font-weight:800;margin-bottom:10px;">Tawaran Project</div>
        <div class="bs-card" style="background:var(--bs-surface-alt);font-size:12px;line-height:1.8;margin-bottom:16px;">
          Video sumber: ${offer.sourceLength} menit<br>
          Jumlah clip: ${offer.clipsRequested}<br>
          Rate: Rp${offer.payRate.toLocaleString("id-ID")}/clip<br>
          Deadline: ${offer.deadlineDays} hari
        </div>
        <button class="bs-btn bs-btn-primary bs-btn-block" onclick='CreatorUI.acceptProject(${JSON.stringify(offer)})'>Terima Project</button>
      </div>
    `);
  },

  acceptProject(offerJSON) {
    const offer = typeof offerJSON === "string" ? JSON.parse(offerJSON) : offerJSON;
    CreatorEngine.acceptClipperProject(offer);
    document.querySelector(".bs-modal-overlay")?.remove();
    UI.refresh && UI.refresh();
  },

  completeProject(projectId) {
    const result = CreatorEngine.completeClipperProject(projectId);
    if (result.success) UI.refresh && UI.refresh();
  },

  // ==================== BRAND DEAL (poin 38-39, v5.0) ====================
  _renderBrandDealBanner(platform) {
    const offer = State.data.pendingBrandDealOffers?.[platform];
    if (!offer) return "";
    return `
      <div class="bs-card bs-mb-12" style="background:#FFF9E6;border:1px solid var(--bs-warning);">
        <div class="bs-flex" style="justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;font-size:13px;">💰 Tawaran Brand Deal</div>
            <div class="bs-text-secondary" style="font-size:11px;">${offer.sponsor} · Rp${offer.amount.toLocaleString("id-ID")} / ${offer.durationMonths} bulan</div>
          </div>
        </div>
        <div class="bs-flex bs-gap-8" style="margin-top:10px;">
          <button class="bs-btn bs-btn-outline" style="flex:1;min-height:36px;" onclick="CreatorUI.rejectDeal('${platform}')">Tolak</button>
          <button class="bs-btn bs-btn-success" style="flex:1;min-height:36px;" onclick="CreatorUI.acceptDeal('${platform}')">Terima</button>
        </div>
      </div>
    `;
  },

  acceptDeal(platform) {
    const offer = State.data.pendingBrandDealOffers[platform];
    if (!offer) return;
    CreatorEngine.acceptBrandDeal(platform, offer);
    UI.refresh && UI.refresh();
  },

  rejectDeal(platform) {
    CreatorEngine.rejectBrandDeal(platform);
    UI.refresh && UI.refresh();
  },

  _formatCount(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(1) + "jt";
    if (n >= 1000) return (n / 1000).toFixed(1) + "rb";
    return n.toString();
  },
};
