/* ============================================================
   BizSim — career-ui.js (v2 — GANTIKAN versi Phase 1 sebelumnya)
   Player career mode, disesuaikan struktur State.data.cash asli.
   Poin 31-35.
   ============================================================ */

const CareerUI = {
  currentOffers: [],

  renderCareerPanel() {
    const career = State.data.playerCareer;
    return `
      <div class="bs-page-enter" style="padding-bottom:24px;">
        <div class="bs-card--hero bs-mb-12">
          <div style="font-size:12px;opacity:0.85;">KARIR SAYA</div>
          ${career.currentPosition ? `
            <div style="font-size:20px;font-weight:800;margin-top:4px;">${career.currentPosition}</div>
            <div style="font-size:13px;opacity:0.9;">${career.currentCompany}</div>
            <div style="margin-top:14px;font-size:24px;font-weight:800;">Rp${career.salary.toLocaleString("id-ID")}<span style="font-size:12px;font-weight:400;">/bulan</span></div>
          ` : `
            <div style="font-size:18px;font-weight:800;margin-top:4px;">Belum Bekerja</div>
            <div style="font-size:13px;opacity:0.9;">Cari lowongan untuk mulai karir Anda</div>
          `}
        </div>

        ${career.currentPosition ? `
          <div class="bs-card bs-mb-12">
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
              <div><div class="bs-text-secondary" style="font-size:10px;">Level</div><div style="font-weight:700;">${career.levelTitle}</div></div>
              <div><div class="bs-text-secondary" style="font-size:10px;">Performance</div><div style="font-weight:700;">${Math.round(career.performance)}%</div></div>
              <div><div class="bs-text-secondary" style="font-size:10px;">Masa Kerja</div><div style="font-weight:700;">${career.monthsInPosition} bulan</div></div>
              <div><div class="bs-text-secondary" style="font-size:10px;">Pengalaman</div><div style="font-weight:700;">${career.yearsExperience} tahun</div></div>
            </div>
          </div>
          <button class="bs-btn bs-btn-outline bs-btn-block bs-mb-12" onclick="CareerUI.confirmResign()">Resign</button>
        ` : ""}

        <button class="bs-btn bs-btn-primary bs-btn-block bs-mb-12" onclick="CareerUI.openJobListing()">Cari Lowongan Kerja</button>

        <div class="bs-card-subtitle bs-mb-12">Riwayat Karir</div>
        ${State.data.careerHistory.length === 0
          ? `<div class="bs-card bs-text-secondary" style="text-align:center;">Belum ada riwayat</div>`
          : State.data.careerHistory.slice().reverse().map(h => `
            <div class="bs-card bs-mb-12">
              <div style="font-weight:700;font-size:13px;">${h.position}</div>
              <div class="bs-text-secondary" style="font-size:11px;">${h.company} · Rp${h.salary.toLocaleString("id-ID")}/bln</div>
            </div>
          `).join("")
        }
      </div>
    `;
  },

  openJobListing() {
    this.currentOffers = CareerEngine.generateJobOffers(10);
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Lowongan Tersedia</h3>
      <div style="max-height:60vh;overflow-y:auto;">
        ${this.currentOffers.map(o => `
          <div class="bs-card bs-card--interactive bs-mb-12" onclick="CareerUI.viewOffer('${o.id}')">
            <div class="bs-flex" style="justify-content:space-between;">
              <div>
                <div style="font-weight:700;">${o.position}</div>
                <div class="bs-text-secondary" style="font-size:11px;">${o.company} · ${o.industryName}</div>
              </div>
              <div style="text-align:right;">
                <div style="font-weight:800;font-size:13px;">Rp${(o.salary/1000000).toFixed(1)}jt</div>
              </div>
            </div>
          </div>
        `).join("")}
      </div>
    `);
  },

  viewOffer(offerId) {
    const offer = this.currentOffers.find(o => o.id === offerId);
    if (!offer) return;
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="font-size:18px;font-weight:800;">${offer.position}</div>
        <div class="bs-text-secondary" style="margin-bottom:14px;">${offer.company} · ${offer.industryName}</div>
        <div class="bs-card" style="background:var(--bs-surface-alt);margin-bottom:16px;font-size:12px;line-height:1.8;">
          Gaji: Rp${offer.salary.toLocaleString("id-ID")}/bulan<br>
          Min. Pengalaman: ${offer.minExperience} tahun<br>
          Pendidikan: ${offer.requirements.education}
        </div>
        <button class="bs-btn bs-btn-primary bs-btn-block" onclick="CareerUI.applyToOffer('${offer.id}')">Lamar Sekarang</button>
      </div>
    `);
  },

  applyToOffer(offerId) {
    const offer = this.currentOffers.find(o => o.id === offerId);
    const result = CareerEngine.applyToJob(offer);
    document.querySelector(".bs-modal-overlay")?.remove();
    if (result.success) this.startPlayerInterview(result.application.id);
  },

  startPlayerInterview(applicationId) {
    this._renderPlayerInterviewStep(applicationId, 0, []);
  },

  _renderPlayerInterviewStep(applicationId, qIndex, answers) {
    const questions = CareerEngine.INTERVIEW_QUESTIONS;
    if (qIndex >= questions.length) return this._finalizePlayerInterview(applicationId, answers);

    const q = questions[qIndex];
    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div class="bs-text-secondary" style="font-size:11px;margin-bottom:6px;">Pertanyaan ${qIndex+1}/${questions.length}</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;">${q.text}</div>
        ${q.answers.map((a, idx) => `
          <button class="bs-btn bs-btn-outline bs-btn-block bs-mb-12" style="text-align:left;justify-content:flex-start;height:auto;padding:12px 16px;white-space:normal;"
            onclick='CareerUI.answerPlayerInterview("${applicationId}", ${qIndex}, ${idx}, ${JSON.stringify(answers)})'>${a.text}</button>
        `).join("")}
      </div>
    `);
  },

  answerPlayerInterview(applicationId, qIndex, answerIdx, prevAnswersJSON) {
    const answers = typeof prevAnswersJSON === "string" ? JSON.parse(prevAnswersJSON) : prevAnswersJSON;
    answers.push(answerIdx);
    document.querySelector(".bs-modal-overlay")?.remove();
    this._renderPlayerInterviewStep(applicationId, qIndex + 1, answers);
  },

  _finalizePlayerInterview(applicationId, answers) {
    const result = CareerEngine.submitPlayerInterview(applicationId, answers);
    BSInteraction.openModal(`
      <div style="padding:24px;text-align:center;">
        <div style="font-size:36px;font-weight:800;color:${result.passed ? 'var(--bs-success)' : 'var(--bs-danger)'};">${result.passed ? "LOLOS" : "GAGAL"}</div>
        <div class="bs-text-secondary" style="margin-bottom:20px;">Skor: ${Math.round(result.score)}</div>
        ${result.passed
          ? `<button class="bs-btn bs-btn-success bs-btn-block" onclick="CareerUI.acceptOffer('${applicationId}')">Terima Pekerjaan</button>`
          : `<button class="bs-btn bs-btn-outline bs-btn-block" onclick="document.querySelector('.bs-modal-overlay').remove()">Tutup</button>`
        }
      </div>
    `);
  },

  acceptOffer(applicationId) {
    const result = CareerEngine.acceptJobOffer(applicationId);
    document.querySelector(".bs-modal-overlay")?.remove();
    if (result.success) { BSInteraction.showToast({ title: "Diterima Bekerja!", type: "success" }); UI.refresh && UI.refresh(); }
  },

  confirmResign() {
    CareerEngine.resignFromJob();
    BSInteraction.showToast({ title: "Anda resign", type: "info" });
    UI.refresh && UI.refresh();
  },
};
