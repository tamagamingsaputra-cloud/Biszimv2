/* ============================================================
   BizSim — employee-business-ui.js
   UI untuk sistem karyawan (individu, bukan buff abstrak) dan
   business depth (upgrade bertahap, supplier, inventory).
   Poin 20-30, 50-58.
   
   Depends on: employee-engine.js, business-engine.js,
   illustrations.js, ui-interactions.js
   ============================================================ */

const EmployeeBusinessUI = {
  // ==================== DAFTAR KARYAWAN BISNIS ====================
  renderEmployeeList(businessId) {
    const employees = State.data.employees.filter(e => e.businessId === businessId);
    const applications = State.data.applications.filter(a => {
      const job = State.data.jobs.find(j => j.id === a.jobId);
      return job && job.businessId === businessId;
    });

    return `
      <div class="bs-page-enter">
        <div class="bs-flex" style="justify-content:space-between;align-items:center;margin-bottom:14px;">
          <div class="bs-card-title" style="font-size:17px;">Karyawan (${employees.length})</div>
          <button class="bs-btn bs-btn-primary" style="min-height:40px;padding:8px 16px;" onclick="EmployeeBusinessUI.openPostJobSheet('${businessId}')">+ Lowongan</button>
        </div>

        ${applications.length > 0 ? `
          <div class="bs-mb-12">
            <div class="bs-card-subtitle bs-mb-12">Lamaran Masuk (${applications.length})</div>
            ${applications.map(a => this._renderCandidateCard(a)).join("")}
          </div>
        ` : ""}

        <div class="bs-card-subtitle bs-mb-12">Tim Aktif</div>
        ${employees.length === 0
          ? `<div class="bs-card bs-text-secondary" style="text-align:center;">Belum ada karyawan. Buka lowongan dulu!</div>`
          : employees.map(e => this._renderEmployeeCard(e)).join("")
        }
      </div>
    `;
  },

  _renderCandidateCard(candidate) {
    return `
      <div class="bs-character-card bs-card--interactive bs-mb-12" onclick="EmployeeBusinessUI.openCandidateCV('${candidate.id}')">
        <div class="bs-character-portrait">${BSIllustration.characterPortrait(candidate.portraitSeed, candidate.gender, 56)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${candidate.name}</div>
          <div class="bs-text-secondary" style="font-size:11px;">${candidate.education} · ${candidate.experienceYears} thn pengalaman</div>
        </div>
        <span class="bs-badge">Baru</span>
      </div>
    `;
  },

  _renderEmployeeCard(emp) {
    const statusBadge = emp.status === "resignation_pending"
      ? `<span class="bs-badge warning">Mau Resign</span>`
      : `<span class="bs-badge success">${emp.levelTitle}</span>`;

    return `
      <div class="bs-character-card bs-card--interactive bs-mb-12" onclick="EmployeeBusinessUI.openEmployeeProfile('${emp.id}')">
        <div class="bs-character-portrait">${BSIllustration.characterPortrait(emp.portraitSeed, emp.gender, 56)}</div>
        <div style="flex:1;">
          <div style="font-weight:700;">${emp.name}</div>
          <div class="bs-text-secondary" style="font-size:11px;">${emp.position} · Rp${emp.salary.toLocaleString("id-ID")}/bln</div>
          <div class="bs-progress-track" style="margin-top:6px;height:5px;">
            <div class="bs-progress-fill ${emp.morale < 40 ? 'danger' : ''}" style="width:${emp.morale}%;"></div>
          </div>
        </div>
        ${statusBadge}
      </div>
    `;
  },

  // ==================== CV KANDIDAT (poin 23) ====================
  openCandidateCV(candidateId) {
    const c = EmployeeEngine.getCandidateCV(candidateId);
    if (!c) return;

    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="width:80px;height:80px;margin:0 auto 10px;border-radius:20px;overflow:hidden;">${BSIllustration.characterPortrait(c.portraitSeed, c.gender, 80)}</div>
          <div style="font-size:18px;font-weight:800;">${c.name}</div>
          <div class="bs-text-secondary" style="font-size:12px;">${c.age} tahun · ${c.education}</div>
        </div>

        <div class="bs-card" style="background:var(--bs-surface-alt);margin-bottom:12px;">
          <div style="font-size:12px;line-height:1.8;">
            <strong>Pengalaman:</strong> ${c.experienceYears} tahun<br>
            <strong>Workplace Sebelumnya:</strong> ${c.previousWorkplace || "Fresh graduate"}<br>
            <strong>Ekspektasi Gaji:</strong> Rp${c.expectedSalary.toLocaleString("id-ID")}
          </div>
        </div>

        <div class="bs-card-subtitle bs-mb-12">Skill</div>
        ${Object.entries(c.skills).map(([skill, val]) => `
          <div class="bs-skill-bar-row">
            <span class="bs-skill-bar-label">${skill}</span>
            <div class="bs-progress-track" style="flex:1;"><div class="bs-progress-fill" style="width:${val}%;"></div></div>
            <span style="font-size:11px;font-weight:700;width:26px;text-align:right;">${val}</span>
          </div>
        `).join("")}

        <div class="bs-flex bs-gap-8" style="margin-top:20px;">
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="EmployeeBusinessUI.rejectCandidate('${candidateId}')">Tolak</button>
          <button class="bs-btn bs-btn-primary" style="flex:1;" onclick="EmployeeBusinessUI.startInterview('${candidateId}')">Interview</button>
        </div>
      </div>
    `);
  },

  rejectCandidate(candidateId) {
    EmployeeEngine.rejectCandidate(candidateId);
    document.querySelector(".bs-modal-overlay")?.remove();
    BSInteraction.showToast({ title: "Kandidat Ditolak", type: "info" });
    UI.refresh && UI.refresh();
  },

  // ==================== INTERVIEW (poin 24) ====================
  startInterview(candidateId) {
    const result = EmployeeEngine.startInterview(candidateId);
    if (!result.success) return;
    document.querySelector(".bs-modal-overlay")?.remove();
    this._renderInterviewStep(result.interview.id, 0);
  },

  _renderInterviewStep(interviewId, qIndex) {
    const interview = State.data.interviews.find(i => i.id === interviewId);
    const questions = EmployeeEngine.INTERVIEW_QUESTIONS;
    if (qIndex >= questions.length) return this._finalizeAndShowResult(interviewId);

    const q = questions[qIndex];
    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div class="bs-text-secondary" style="font-size:11px;margin-bottom:6px;">Pertanyaan ${qIndex + 1}/${questions.length}</div>
        <div style="font-size:15px;font-weight:700;margin-bottom:16px;">${q.text}</div>
        ${q.answers.map((a, idx) => `
          <button class="bs-btn bs-btn-outline bs-btn-block bs-mb-12" style="text-align:left;justify-content:flex-start;height:auto;padding:12px 16px;white-space:normal;line-height:1.4;"
            onclick="EmployeeBusinessUI.answerInterview('${interviewId}', ${qIndex}, ${idx})">${a.text}</button>
        `).join("")}
      </div>
    `);
  },

  answerInterview(interviewId, qIndex, answerIdx) {
    EmployeeEngine.answerInterviewQuestion(interviewId, EmployeeEngine.INTERVIEW_QUESTIONS[qIndex].id, answerIdx);
    document.querySelector(".bs-modal-overlay")?.remove();
    this._renderInterviewStep(interviewId, qIndex + 1);
  },

  _finalizeAndShowResult(interviewId) {
    const result = EmployeeEngine.finalizeInterview(interviewId);
    if (!result.success) return;

    BSInteraction.openModal(`
      <div style="padding:24px;text-align:center;">
        <div style="font-size:36px;font-weight:800;color:${result.score >= 55 ? 'var(--bs-success)' : 'var(--bs-danger)'};">${result.score}</div>
        <div class="bs-text-secondary" style="margin-bottom:20px;">Skor Interview</div>
        <button class="bs-btn bs-btn-primary bs-btn-block" onclick="EmployeeBusinessUI.openHireSheet('${result.candidate.id}')">Lanjut ke Penawaran</button>
      </div>
    `);
  },

  openHireSheet(candidateId) {
    const c = EmployeeEngine.getCandidateCV(candidateId);
    document.querySelector(".bs-modal-overlay")?.remove();
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Tawarkan Posisi ke ${c.name}</h3>
      <label style="font-size:12px;font-weight:700;">Posisi</label>
      <input type="text" id="hire-position" value="Store Staff" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 14px;">
      <label style="font-size:12px;font-weight:700;">Gaji Bulanan (Rp)</label>
      <input type="number" id="hire-salary" value="${c.expectedSalary}" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 16px;">
      <button class="bs-btn bs-btn-success bs-btn-block" onclick="EmployeeBusinessUI.executeHire('${candidateId}')">Rekrut Sekarang</button>
    `);
  },

  executeHire(candidateId) {
    const c = EmployeeEngine.getCandidateCV(candidateId);
    const job = State.data.jobs.find(j => j.id === c.jobId);
    const position = document.getElementById("hire-position")?.value || "Staff";
    const salary = parseFloat(document.getElementById("hire-salary")?.value) || c.expectedSalary;

    const result = EmployeeEngine.hireCandidate(candidateId, { position, salary, businessId: job?.businessId });
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    if (result.success) { BSInteraction.showToast({ title: "Karyawan Direkrut!", type: "success" }); UI.refresh && UI.refresh(); }
  },

  // ==================== PROFIL KARYAWAN (poin 58) ====================
  openEmployeeProfile(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return;

    const resignBanner = emp.status === "resignation_pending" ? `
      <div class="bs-card" style="background:#FFF3E0;border:1px solid var(--bs-warning);margin-bottom:14px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:4px;">⚠ ${emp.name} ingin resign</div>
        <div style="font-size:12px;color:var(--bs-text-secondary);margin-bottom:10px;">${emp._resignationReason}</div>
        <div class="bs-flex bs-gap-8">
          <button class="bs-btn bs-btn-outline" style="flex:1;min-height:38px;" onclick="EmployeeBusinessUI.acceptResign('${emp.id}')">Terima</button>
          <button class="bs-btn bs-btn-primary" style="flex:1;min-height:38px;" onclick="EmployeeBusinessUI.openCounterOfferSheet('${emp.id}')">Counter Offer</button>
        </div>
      </div>
    ` : "";

    const promoCheck = EmployeeEngine.checkPromotionEligibility(employeeId);

    BSInteraction.openModal(`
      <div style="padding:24px;">
        <div style="text-align:center;margin-bottom:16px;">
          <div style="width:80px;height:80px;margin:0 auto 10px;border-radius:20px;overflow:hidden;">${BSIllustration.characterPortrait(emp.portraitSeed, emp.gender, 80)}</div>
          <div style="font-size:18px;font-weight:800;">${emp.name}</div>
          <div class="bs-text-secondary" style="font-size:12px;">${emp.position} · ${emp.levelTitle}</div>
        </div>

        ${resignBanner}

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;">
          <div class="bs-card" style="background:var(--bs-surface-alt);padding:12px;">
            <div class="bs-text-secondary" style="font-size:10px;">Performance</div>
            <div style="font-weight:800;font-size:16px;">${Math.round(emp.performance)}%</div>
          </div>
          <div class="bs-card" style="background:var(--bs-surface-alt);padding:12px;">
            <div class="bs-text-secondary" style="font-size:10px;">Morale</div>
            <div style="font-weight:800;font-size:16px;">${Math.round(emp.morale)}%</div>
          </div>
          <div class="bs-card" style="background:var(--bs-surface-alt);padding:12px;">
            <div class="bs-text-secondary" style="font-size:10px;">Loyalty</div>
            <div style="font-weight:800;font-size:16px;">${Math.round(emp.loyalty)}%</div>
          </div>
          <div class="bs-card" style="background:var(--bs-surface-alt);padding:12px;">
            <div class="bs-text-secondary" style="font-size:10px;">Gaji</div>
            <div style="font-weight:800;font-size:14px;">Rp${(emp.salary/1000000).toFixed(1)}jt</div>
          </div>
        </div>

        <div class="bs-card-subtitle bs-mb-12">Skill</div>
        ${Object.entries(emp.skills).map(([skill, val]) => `
          <div class="bs-skill-bar-row">
            <span class="bs-skill-bar-label">${skill}</span>
            <div class="bs-progress-track" style="flex:1;"><div class="bs-progress-fill" style="width:${val}%;"></div></div>
            <span style="font-size:11px;font-weight:700;width:26px;text-align:right;">${Math.round(val)}</span>
          </div>
        `).join("")}

        <div class="bs-flex bs-gap-8" style="margin-top:16px;flex-wrap:wrap;">
          ${promoCheck.eligible ? `<button class="bs-btn bs-btn-success" style="flex:1;" onclick="EmployeeBusinessUI.promote('${emp.id}')">Promosikan</button>` : ""}
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="EmployeeBusinessUI.openTrainingSheet('${emp.id}')">Training</button>
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="EmployeeBusinessUI.openBonusSheet('${emp.id}')">Beri Bonus</button>
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="document.querySelector('.bs-modal-overlay').remove(); EmployeeScheduleContractUI.openScheduleSheet('${emp.id}');">Schedule</button>
          <button class="bs-btn bs-btn-outline" style="flex:1;" onclick="document.querySelector('.bs-modal-overlay').remove(); EmployeeScheduleContractUI.openContractSheet('${emp.id}');">Contract</button>
        </div>
      </div>
    `);
  },

  promote(employeeId) {
    const result = EmployeeEngine.promoteEmployee(employeeId);
    if (result.success) {
      document.querySelector(".bs-modal-overlay")?.remove();
      BSInteraction.showAchievementUnlock({ title: "Promosi Karyawan!", description: `${result.employee.name} naik jabatan`, icon: "⭐" });
      UI.refresh && UI.refresh();
    }
  },

  acceptResign(employeeId) {
    EmployeeEngine.acceptResignation(employeeId);
    document.querySelector(".bs-modal-overlay")?.remove();
    BSInteraction.showToast({ title: "Karyawan Resign", type: "info" });
    UI.refresh && UI.refresh();
  },

  openCounterOfferSheet(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    document.querySelector(".bs-modal-overlay")?.remove();
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Counter Offer untuk ${emp.name}</h3>
      <label style="font-size:12px;font-weight:700;">Gaji Baru (Rp)</label>
      <input type="number" id="counter-salary" value="${Math.round(emp.salary * 1.15)}" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 16px;">
      <label style="display:flex;align-items:center;gap:8px;margin-bottom:16px;font-size:13px;">
        <input type="checkbox" id="counter-promote"> Sertakan promosi jabatan
      </label>
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="EmployeeBusinessUI.executeCounterOffer('${employeeId}')">Kirim Counter Offer</button>
    `);
  },

  executeCounterOffer(employeeId) {
    const newSalary = parseFloat(document.getElementById("counter-salary")?.value);
    const promote = document.getElementById("counter-promote")?.checked;
    EmployeeEngine.counterOffer(employeeId, { newSalary, promote });
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    UI.refresh && UI.refresh();
  },

  openTrainingSheet(employeeId) {
    document.querySelector(".bs-modal-overlay")?.remove();
    const programs = EmployeeEngine.TRAINING_PROGRAMS;
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Pilih Training</h3>
      ${Object.entries(programs).map(([key, p]) => `
        <div class="bs-card bs-card--interactive bs-mb-12" onclick="EmployeeBusinessUI.startTraining('${employeeId}', '${key}')">
          <div style="font-weight:700;">${p.name}</div>
          <div class="bs-text-secondary" style="font-size:11px;">Rp${p.cost.toLocaleString("id-ID")} · ${p.days} hari · +${p.skillGain} skill</div>
        </div>
      `).join("")}
    `);
  },

  startTraining(employeeId, trainingType) {
    const result = EmployeeEngine.startTraining(employeeId, trainingType);
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    if (result.success) BSInteraction.showToast({ title: "Training Dimulai", type: "success" });
    else BSInteraction.showToast({ title: "Gagal", message: result.error, type: "danger" });
    UI.refresh && UI.refresh();
  },

  openBonusSheet(employeeId) {
    document.querySelector(".bs-modal-overlay")?.remove();
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Beri Bonus</h3>
      <input type="number" id="bonus-amount" placeholder="500000" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin-bottom:16px;">
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="EmployeeBusinessUI.giveBonus('${employeeId}')">Berikan</button>
    `);
  },

  giveBonus(employeeId) {
    const amount = parseFloat(document.getElementById("bonus-amount")?.value) || 0;
    const result = EmployeeEngine.giveBonus(employeeId, amount);
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    if (result.success) BSInteraction.showToast({ title: "Bonus Diberikan", type: "success" });
    UI.refresh && UI.refresh();
  },

  openPostJobSheet(businessId) {
    BSInteraction.openBottomSheet(`
      <h3 style="margin:0 0 16px;">Buka Lowongan</h3>
      <label style="font-size:12px;font-weight:700;">Posisi</label>
      <input type="text" id="job-position" placeholder="Store Staff" style="width:100%;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);margin:6px 0 14px;">
      <label style="font-size:12px;font-weight:700;">Gaji Min - Max (Rp)</label>
      <div class="bs-flex bs-gap-8" style="margin:6px 0 14px;">
        <input type="number" id="job-salary-min" placeholder="4000000" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);">
        <input type="number" id="job-salary-max" placeholder="5000000" style="flex:1;padding:12px;border-radius:12px;border:1.5px solid var(--bs-border);">
      </div>
      <button class="bs-btn bs-btn-primary bs-btn-block" onclick="EmployeeBusinessUI.executePostJob('${businessId}')">Posting Lowongan</button>
    `);
  },

  executePostJob(businessId) {
    const position = document.getElementById("job-position")?.value || "Staff";
    const salaryMin = parseFloat(document.getElementById("job-salary-min")?.value) || 4000000;
    const salaryMax = parseFloat(document.getElementById("job-salary-max")?.value) || 5000000;
    EmployeeEngine.postJob(businessId, { position, positionsAvailable: 1, salaryMin, salaryMax });
    document.querySelector(".bs-bottom-sheet-overlay")?.remove();
    UI.refresh && UI.refresh();
  },

  // ==================== BUSINESS UPGRADE (poin 18-19, 52) ====================
  renderUpgradeTracks(businessId) {
    return `
      <div class="bs-page-enter">
        <div class="bs-card-title bs-mb-12" style="font-size:17px;">Upgrade Bisnis</div>
        ${Object.entries(BUSINESS_UPGRADE_TRACKS).map(([trackId, track]) => {
          const level = BusinessEngine.getUpgradeLevel(businessId, trackId);
          const cost = BusinessEngine.getUpgradeCost(trackId, level);
          const isMax = level >= track.maxLevel;
          return `
            <div class="bs-card bs-mb-12">
              <div class="bs-flex" style="justify-content:space-between;align-items:center;margin-bottom:8px;">
                <div style="font-weight:700;font-size:13px;">${track.name}</div>
                <span class="bs-badge">Lv ${level}/${track.maxLevel}</span>
              </div>
              <div class="bs-progress-track bs-mb-12"><div class="bs-progress-fill" style="width:${(level/track.maxLevel)*100}%;"></div></div>
              ${isMax
                ? `<div class="bs-text-secondary" style="font-size:12px;text-align:center;">Level Maksimal</div>`
                : `<button class="bs-btn bs-btn-primary bs-btn-block" style="min-height:40px;" onclick="EmployeeBusinessUI.purchaseUpgrade('${businessId}','${trackId}')">Upgrade — Rp${cost.toLocaleString("id-ID")}</button>`
              }
            </div>
          `;
        }).join("")}
      </div>
    `;
  },

  purchaseUpgrade(businessId, trackId) {
    const result = BusinessEngine.purchaseUpgrade(businessId, trackId);
    if (result.success) { BSInteraction.showToast({ title: "Upgrade Berhasil", type: "success" }); UI.refresh && UI.refresh(); }
    else BSInteraction.showToast({ title: "Gagal", message: result.error, type: "danger" });
  },

  // ==================== SUPPLIER (poin 54) ====================
  renderSupplierSelector(businessId) {
    BusinessEngine.initSuppliersForBusiness(businessId, "retail");
    const suppliers = State.data.suppliers[businessId] || [];
    return `
      <div class="bs-page-enter">
        <div class="bs-card-title bs-mb-12" style="font-size:17px;">Pilih Supplier</div>
        ${suppliers.map(s => `
          <div class="bs-card bs-card--interactive bs-mb-12 ${s.contractActive ? 'bs-card--hero' : ''}" onclick="EmployeeBusinessUI.selectSupplier('${businessId}','${s.id}')">
            <div class="bs-flex" style="justify-content:space-between;">
              <div style="font-weight:700;">${s.name}</div>
              ${s.contractActive ? '<span class="bs-badge success">Aktif</span>' : ''}
            </div>
            <div style="font-size:11px;margin-top:6px;opacity:0.85;">
              Harga: ${(s.priceMult*100).toFixed(0)}% · Kualitas: ${s.quality} · Delivery: ${s.deliveryDays} hari · Reliabilitas: ${s.reliability}%
            </div>
          </div>
        `).join("")}
      </div>
    `;
  },

  selectSupplier(businessId, supplierId) {
    BusinessEngine.selectSupplier(businessId, supplierId);
    UI.refresh && UI.refresh();
  },
};
