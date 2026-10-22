/* ============================================================
   BizSim — employee-engine.js
   SISTEM KARYAWAN INDIVIDUAL. Poin 20-30, 57.
   ============================================================ */

const EmployeeEngine = {
  postJob(businessId, { position, positionsAvailable, salaryMin, salaryMax, requirements }) {
    const job = JobListingModel.create({ businessId, position, positionsAvailable, salaryMin, salaryMax, requirements });
    job.postedDate = this._nowStr();
    State.data.jobs.push(job);
    State.notify("Lowongan Dibuka", `${position} — ${positionsAvailable} posisi`, "info");
    return job;
  },

  closeJob(jobId) {
    const job = State.data.jobs.find(j => j.id === jobId);
    if (job) job.status = "closed";
  },

  generateCandidatesForOpenJobs() {
    const openJobs = State.data.jobs.filter(j => j.status === "open" && j.positionsFilled < j.positionsAvailable);
    openJobs.forEach(job => {
      const chance = 0.15 + Math.random() * 0.25;
      if (Math.random() < chance) {
        const candidate = CandidateModel.generate(job.id, job.requirements ? { salaryMin: job.salaryMin } : {});
        candidate.applicationDate = this._nowStr();
        State.data.applications.push(candidate);
        State.notify("Lamaran Baru", `${candidate.name} melamar untuk ${job.position}`, "info");
      }
    });
  },

  getCandidateCV(candidateId) {
    return State.data.applications.find(a => a.id === candidateId) || null;
  },

  INTERVIEW_QUESTIONS: [
    {
      id: "q_motivation",
      text: "Kenapa Anda ingin bekerja di posisi ini?",
      answers: [
        { text: "Saya butuh uang untuk kebutuhan sehari-hari.", effect: { motivation: -5, reliability: 0 } },
        { text: "Saya tertarik berkembang dan belajar hal baru di bidang ini.", effect: { motivation: 10, reliability: 5 } },
        { text: "Teman saya bilang tempat ini bagus.", effect: { motivation: -2, reliability: -3 } },
        { text: "Saya punya passion di bidang ini dan ingin berkontribusi.", effect: { motivation: 15, reliability: 8 } },
      ],
    },
    {
      id: "q_conflict",
      text: "Bagaimana jika ada pelanggan yang komplain keras?",
      answers: [
        { text: "Saya akan tetap tenang dan dengarkan keluhannya dulu.", effect: { skill_customerService: 8, personality: 5 } },
        { text: "Saya akan panggil supervisor untuk menangani.", effect: { skill_customerService: 2, personality: 0 } },
        { text: "Saya akan jelaskan bahwa itu bukan salah saya.", effect: { skill_customerService: -5, personality: -5 } },
        { text: "Saya minta maaf dan cari solusi terbaik untuk pelanggan.", effect: { skill_customerService: 10, personality: 8 } },
      ],
    },
  ],

  startInterview(candidateId) {
    const candidate = this.getCandidateCV(candidateId);
    if (!candidate) return { success: false, error: "Kandidat tidak ditemukan" };
    const interview = {
      id: "iv_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      candidateId, questions: this.INTERVIEW_QUESTIONS, answers: [],
      status: "in_progress", resultScore: null,
    };
    State.data.interviews.push(interview);
    candidate.status = "interviewed";
    return { success: true, interview };
  },

  answerInterviewQuestion(interviewId, questionId, answerIndex) {
    const interview = State.data.interviews.find(i => i.id === interviewId);
    if (!interview) return { success: false, error: "Interview tidak ditemukan" };
    interview.answers = interview.answers.filter(a => a.questionId !== questionId);
    interview.answers.push({ questionId, answerIndex });
    return { success: true };
  },

  finalizeInterview(interviewId) {
    const interview = State.data.interviews.find(i => i.id === interviewId);
    if (!interview) return { success: false, error: "Interview tidak ditemukan" };
    const candidate = this.getCandidateCV(interview.candidateId);
    if (!candidate) return { success: false, error: "Kandidat tidak ditemukan" };

    let totalEffect = { motivation: 0, reliability: 0, personality: 0 };
    let skillBoosts = {};

    interview.answers.forEach(ans => {
      const q = this.INTERVIEW_QUESTIONS.find(qq => qq.id === ans.questionId);
      if (!q) return;
      const chosen = q.answers[ans.answerIndex];
      if (!chosen) return;
      Object.entries(chosen.effect).forEach(([key, val]) => {
        if (key.startsWith("skill_")) {
          const skillName = key.replace("skill_", "");
          skillBoosts[skillName] = (skillBoosts[skillName] || 0) + val;
        } else {
          totalEffect[key] = (totalEffect[key] || 0) + val;
        }
      });
    });

    Object.entries(skillBoosts).forEach(([skill, boost]) => {
      if (candidate.skills[skill] !== undefined) {
        candidate.skills[skill] = Math.max(0, Math.min(100, candidate.skills[skill] + boost));
      }
    });

    const interviewScore = 50 + totalEffect.motivation + totalEffect.reliability + totalEffect.personality;
    const finalScore = Math.round((candidate.quality * 60) + (interviewScore * 0.4));

    interview.status = "completed";
    interview.resultScore = finalScore;
    interview.effects = totalEffect;
    return { success: true, score: finalScore, effects: totalEffect, candidate };
  },

  hireCandidate(candidateId, { position, salary, businessId }) {
    const candidate = this.getCandidateCV(candidateId);
    if (!candidate) return { success: false, error: "Kandidat tidak ditemukan" };

    const employee = EmployeeModel.create({
      businessId, name: candidate.name, gender: candidate.gender, age: candidate.age,
      education: candidate.education, position, salary, skills: candidate.skills,
      portraitSeed: candidate.portraitSeed,
    });
    employee.hireDate = this._nowStr();
    employee.experienceYears = candidate.experienceYears;
    State.data.employees.push(employee);

    candidate.status = "accepted";
    State.data.applications = State.data.applications.filter(a => a.id !== candidateId);

    const job = State.data.jobs.find(j => j.id === candidate.jobId);
    if (job) {
      job.positionsFilled++;
      if (job.positionsFilled >= job.positionsAvailable) job.status = "filled";
    }
    State.notify("Karyawan Baru", `${employee.name} bergabung sebagai ${position}`, "success");
    return { success: true, employee };
  },

  rejectCandidate(candidateId) {
    const candidate = this.getCandidateCV(candidateId);
    if (candidate) candidate.status = "rejected";
    State.data.applications = State.data.applications.filter(a => a.id !== candidateId);
  },

  checkPromotionEligibility(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return { eligible: false };
    const eligible = emp.monthsInPosition >= 6 && emp.performance >= 75 && emp.loyalty >= 60 && emp.level < EmployeeModel.LEVEL_TITLES.length - 1;
    return { eligible, employee: emp };
  },

  promoteEmployee(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return { success: false, error: "Karyawan tidak ditemukan" };
    const check = this.checkPromotionEligibility(employeeId);
    if (!check.eligible) return { success: false, error: "Karyawan belum memenuhi syarat promosi" };

    emp.level++;
    emp.levelTitle = EmployeeModel.levelTitle(emp.level);
    const raiseAmount = Math.round(emp.salary * 0.15);
    emp.salary += raiseAmount;
    emp.monthsInPosition = 0;
    emp.promotionHistory.push({ date: this._nowStr(), newTitle: emp.levelTitle, newSalary: emp.salary });
    emp.loyalty = Math.min(100, emp.loyalty + 10);
    emp.morale = Math.min(100, emp.morale + 15);
    State.notify("Promosi!", `${emp.name} naik jabatan menjadi ${emp.levelTitle}`, "success");
    return { success: true, employee: emp };
  },

  giveSalaryRaise(employeeId, amount) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return { success: false, error: "Karyawan tidak ditemukan" };
    emp.salary += amount;
    emp.salaryHistory.push({ date: this._nowStr(), newSalary: emp.salary, reason: "raise" });
    emp.morale = Math.min(100, emp.morale + 8);
    emp.loyalty = Math.min(100, emp.loyalty + 5);
    return { success: true, employee: emp };
  },

  giveBonus(employeeId, amount) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return { success: false, error: "Karyawan tidak ditemukan" };
    if (amount > State.data.cash) return { success: false, error: "Uang tidak cukup" };
    State.data.cash -= amount;
    State.addTx("Employee Bonus", `Bonus untuk ${emp.name}`, -amount);
    emp.morale = Math.min(100, emp.morale + 12);
    return { success: true };
  },

  TRAINING_PROGRAMS: {
    customerService: { name: "Customer Service Training", cost: 1500000, days: 3, skillGain: 12, targetSkill: "customerService" },
    leadership:       { name: "Leadership Training",       cost: 2500000, days: 5, skillGain: 10, targetSkill: "leadership" },
    sales:            { name: "Sales Training",            cost: 1800000, days: 3, skillGain: 12, targetSkill: "sales" },
    inventory:        { name: "Inventory Training",        cost: 1200000, days: 2, skillGain: 10, targetSkill: "inventory" },
    digitalMarketing: { name: "Digital Marketing Training", cost: 2200000, days: 4, skillGain: 10, targetSkill: "technical" },
  },

  startTraining(employeeId, trainingType) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    const program = this.TRAINING_PROGRAMS[trainingType];
    if (!emp || !program) return { success: false, error: "Data tidak valid" };
    if (program.cost > State.data.cash) return { success: false, error: "Uang tidak cukup" };
    State.data.cash -= program.cost;
    State.addTx("Training", `${program.name} untuk ${emp.name}`, -program.cost);
    const training = {
      id: "trn_" + Date.now() + "_" + Math.floor(Math.random() * 10000),
      employeeId, type: trainingType, program: program.name,
      daysRemaining: program.days, skillGain: program.skillGain, targetSkill: program.targetSkill,
    };
    State.data.trainingPrograms.push(training);
    return { success: true, training };
  },

  processTrainingDaily() {
    if (!State.data.trainingPrograms) return;
    const completed = [];
    State.data.trainingPrograms.forEach(t => { t.daysRemaining--; if (t.daysRemaining <= 0) completed.push(t); });
    completed.forEach(t => {
      const emp = State.data.employees.find(e => e.id === t.employeeId);
      if (emp && emp.skills[t.targetSkill] !== undefined) {
        emp.skills[t.targetSkill] = Math.min(100, emp.skills[t.targetSkill] + t.skillGain);
        emp.trainingHistory.push({ date: this._nowStr(), program: t.program, skillGain: t.skillGain });
        State.notify("Training Selesai", `${emp.name} menyelesaikan ${t.program}`, "success");
      }
    });
    State.data.trainingPrograms = State.data.trainingPrograms.filter(t => t.daysRemaining > 0);
  },

  processMonthlyEmployeeUpdate() {
    if (!State.data.employees) return;
    const resignations = [];
    State.data.employees.forEach(emp => {
      emp.monthsInPosition++;
      emp.experienceYears = Math.round((emp.experienceYears * 12 + 1) / 12 * 10) / 10;

      if (emp.salary <= State.data.cash) {
        State.data.cash -= emp.salary;
        State.addTx("Payroll", `Gaji ${emp.name}`, -emp.salary);
      }

      const marketRate = 5000000;
      const salaryRatio = emp.salary / marketRate;
      let moraleChange = 0;
      if (salaryRatio < 0.8) moraleChange -= 4; else if (salaryRatio > 1.15) moraleChange += 3;
      if (emp.workload > 80) moraleChange -= 5; else if (emp.workload < 40) moraleChange += 1;

      emp.morale = Math.max(0, Math.min(100, emp.morale + moraleChange));
      emp.performance = Math.max(0, Math.min(100, emp.performance + (emp.morale > 70 ? 1 : emp.morale < 40 ? -2 : 0)));
      emp.loyalty = Math.max(0, Math.min(100, emp.loyalty + (emp.morale > 60 ? 0.5 : -1)));
      emp.resignationRisk = Math.max(0, Math.min(100, (100 - emp.morale) * 0.5 + (100 - emp.loyalty) * 0.3 + (salaryRatio < 0.85 ? 20 : 0)));

      if (emp.resignationRisk > 70 && Math.random() < 0.25) resignations.push(emp);
    });
    resignations.forEach(emp => this.triggerResignation(emp.id));
  },

  RESIGNATION_REASONS: [
    "Gaji terlalu rendah dibanding pasar", "Workload terlalu tinggi",
    "Mendapat tawaran dari perusahaan lain", "Ingin melanjutkan pendidikan", "Alasan pribadi/keluarga",
  ],

  triggerResignation(employeeId) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return;
    const reason = this.RESIGNATION_REASONS[Math.floor(Math.random() * this.RESIGNATION_REASONS.length)];
    emp.status = "resignation_pending";
    emp._resignationReason = reason;
    State.notify("Karyawan Mengajukan Resign", `${emp.name} ingin resign. Alasan: ${reason}`, "warning");
  },

  acceptResignation(employeeId) {
    State.data.employees = State.data.employees.filter(e => e.id !== employeeId);
  },

  counterOffer(employeeId, { newSalary, promote }) {
    const emp = State.data.employees.find(e => e.id === employeeId);
    if (!emp) return { success: false };
    if (newSalary) emp.salary = newSalary;
    if (promote && emp.level < EmployeeModel.LEVEL_TITLES.length - 1) {
      emp.level++;
      emp.levelTitle = EmployeeModel.levelTitle(emp.level);
    }
    emp.status = "active";
    emp.morale = Math.min(100, emp.morale + 20);
    emp.loyalty = Math.min(100, emp.loyalty + 15);
    emp.resignationRisk = Math.max(0, emp.resignationRisk - 40);
    State.notify("Counter Offer Diterima", `${emp.name} memutuskan untuk tetap tinggal`, "success");
    return { success: true, employee: emp };
  },

  _nowStr() {
    const t = State.data.time;
    return `T${t.year}.${String(t.month).padStart(2, "0")}.${String(t.day).padStart(2, "0")}`;
  },
};
