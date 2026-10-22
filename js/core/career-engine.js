/* ============================================================
   BizSim — career-engine.js
   PLAYER CAREER MODE — player sebagai karyawan (poin 31-35)
   Terpisah dari employee-engine.js (itu untuk NPC karyawan di
   bisnis milik player). Ini untuk player MELAMAR ke company NPC.

   CATATAN PENTING: disesuaikan ke struktur state.js ASLI BizSim
   (State.data.cash, bukan State.data.money; State.data.time punya
   hour/day/week/month/year/tickCount). File career.js dari Phase 1
   sebelumnya PAKAI struktur salah (money) — file ini PENGGANTI yang benar.
   ============================================================ */

const CAREER_INDUSTRIES = {
  technology:    { name: "Technology",        icon: "laptop",    minSalary: 5500000,  maxSalary: 32000000 },
  finance:       { name: "Finance/Banking",   icon: "bank",      minSalary: 4800000,  maxSalary: 28500000 },
  retail:        { name: "Retail/E-Commerce", icon: "shop",      minSalary: 4200000,  maxSalary: 26000000 },
  manufacturing: { name: "Manufacturing",     icon: "factory",   minSalary: 4500000,  maxSalary: 24000000 },
  startup:       { name: "Startup",           icon: "rocket",    minSalary: 5000000,  maxSalary: 30000000 },
  healthcare:    { name: "Healthcare",        icon: "medical",   minSalary: 5200000,  maxSalary: 28000000 },
  education:     { name: "Education",         icon: "book",      minSalary: 4200000,  maxSalary: 23000000 },
  hospitality:   { name: "Hospitality/Tourism", icon: "hotel",   minSalary: 4000000,  maxSalary: 23000000 },
  logistics:     { name: "Transportation/Logistics", icon: "truck", minSalary: 4800000, maxSalary: 25000000 },
  government:    { name: "Government",        icon: "building",  minSalary: 4500000,  maxSalary: 22000000 },
  media:         { name: "Media/Entertainment", icon: "camera",  minSalary: 4800000,  maxSalary: 27000000 },
  agriculture:   { name: "Agriculture/Food",  icon: "leaf",      minSalary: 3800000,  maxSalary: 21000000 },
  construction:  { name: "Construction/RealEstate", icon: "crane", minSalary: 5000000, maxSalary: 25000000 },
  energy:        { name: "Energy/Utilities",  icon: "bolt",      minSalary: 5200000,  maxSalary: 25000000 },
  consulting:    { name: "Consulting",        icon: "briefcase", minSalary: 6500000,  maxSalary: 32000000 },
  marketing:     { name: "Marketing/Advertising", icon: "megaphone", minSalary: 5000000, maxSalary: 24000000 },
};

const CAREER_LEVELS = ["Junior", "Staff", "Senior", "Supervisor", "Manager", "Director"];

const CareerEngine = {
  // ---------- LISTING LOWONGAN NPC COMPANY (poin 33) ----------
  generateJobOffers(count = 8) {
    const offers = [];
    const industryKeys = Object.keys(CAREER_INDUSTRIES);
    for (let i = 0; i < count; i++) {
      const key = industryKeys[Math.floor(Math.random() * industryKeys.length)];
      const ind = CAREER_INDUSTRIES[key];
      const level = Math.floor(Math.random() * 3); // NPC company biasanya buka Junior-Senior
      const salaryRange = ind.maxSalary - ind.minSalary;
      const salary = Math.round(ind.minSalary + (salaryRange / CAREER_LEVELS.length) * level * (0.9 + Math.random() * 0.2));

      offers.push({
        id: "npcjob_" + Date.now() + "_" + i,
        industryKey: key,
        industryName: ind.name,
        position: `${CAREER_LEVELS[level]} ${this._positionSuffix(key)}`,
        level,
        company: this._companyName(key),
        salary,
        minExperience: level,
        requirements: { education: level >= 2 ? "S1" : "SMA/SMK" },
      });
    }
    return offers;
  },

  _positionSuffix(industryKey) {
    const suffix = {
      technology: "Developer", finance: "Analyst", retail: "Associate", manufacturing: "Operator",
      startup: "Associate", healthcare: "Staff", education: "Teacher", hospitality: "Staff",
      logistics: "Coordinator", government: "Officer", media: "Associate", agriculture: "Worker",
      construction: "Worker", energy: "Technician", consulting: "Consultant", marketing: "Specialist",
    };
    return suffix[industryKey] || "Staff";
  },

  _companyName(industryKey) {
    const prefixes = ["Mitra", "Karya", "Sinar", "Cipta", "Global", "Nusantara", "Prima", "Mandiri"];
    const suffixes = ["Group", "Corp", "Indonesia", "Solutions", "Industries"];
    return `${prefixes[Math.floor(Math.random() * prefixes.length)]} ${CAREER_INDUSTRIES[industryKey].name.split("/")[0]} ${suffixes[Math.floor(Math.random() * suffixes.length)]}`;
  },

  // ---------- APPLY (poin 33) ----------
  applyToJob(jobOffer) {
    if (!State.data.playerCareer) State.data.playerCareer = PlayerCareerModel.fresh();
    const application = {
      id: "papp_" + Date.now(),
      jobOffer,
      status: "pending",
      appliedDate: this._nowStr(),
    };
    State.data.playerCareer.applications.push(application);
    return { success: true, application };
  },

  // ---------- INTERVIEW PLAYER (reuse pertanyaan mirip employee, tapi utk player) ----------
  INTERVIEW_QUESTIONS: [
    {
      text: "Apa kelebihan utama Anda untuk posisi ini?",
      answers: [
        { text: "Saya cepat belajar dan mudah beradaptasi.", score: 15 },
        { text: "Saya punya banyak pengalaman di bidang ini.", score: 20 },
        { text: "Saya tidak yakin, tapi saya akan coba.", score: -5 },
        { text: "Saya pekerja keras dan disiplin.", score: 12 },
      ],
    },
    {
      text: "Bagaimana Anda menangani tekanan kerja tinggi?",
      answers: [
        { text: "Saya buat prioritas dan kerjakan bertahap.", score: 18 },
        { text: "Saya biasanya panik dulu baru cari solusi.", score: -8 },
        { text: "Saya minta bantuan tim jika kewalahan.", score: 14 },
        { text: "Saya kerja lembur sampai selesai.", score: 8 },
      ],
    },
  ],

  submitPlayerInterview(applicationId, answerIndices) {
    const career = State.data.playerCareer;
    const application = career.applications.find(a => a.id === applicationId);
    if (!application) return { success: false, error: "Aplikasi tidak ditemukan" };

    let score = 40; // base
    answerIndices.forEach((answerIdx, qIdx) => {
      const q = this.INTERVIEW_QUESTIONS[qIdx];
      if (q && q.answers[answerIdx]) score += q.answers[answerIdx].score;
    });

    // Experience & skill relevan menambah peluang
    score += career.yearsExperience * 3;
    score += (career.performance - 50) * 0.2;

    const passThreshold = 55 - Math.min(15, career.yearsExperience * 2); // makin berpengalaman, makin mudah lolos
    const passed = score >= passThreshold;

    application.status = passed ? "passed_interview" : "rejected";
    if (passed) {
      career.interviewsPassed++;
    } else {
      career.interviewsFailed++;
    }

    return { success: true, passed, score };
  },

  // ---------- ACCEPT JOB OFFER ----------
  acceptJobOffer(applicationId) {
    const career = State.data.playerCareer;
    const application = career.applications.find(a => a.id === applicationId);
    if (!application || application.status !== "passed_interview") {
      return { success: false, error: "Belum lolos interview" };
    }

    // Simpan job lama ke history jika ada
    if (career.currentPosition) {
      State.data.careerHistory.push({
        company: career.currentCompany,
        position: career.currentPosition,
        industry: career.currentIndustry,
        salary: career.salary,
        startDate: career._jobStartDate || this._nowStr(),
        endDate: this._nowStr(),
      });
    }

    const offer = application.jobOffer;
    career.currentJobId = offer.id;
    career.currentCompany = offer.company;
    career.currentPosition = offer.position;
    career.currentIndustry = offer.industryKey;
    career.level = offer.level;
    career.levelTitle = CAREER_LEVELS[offer.level];
    career.salary = offer.salary;
    career.monthsInPosition = 0;
    career._jobStartDate = this._nowStr();

    career.applications = career.applications.filter(a => a.id !== applicationId);

    State.notify("Diterima Bekerja!", `${offer.position} di ${offer.company} — Rp${offer.salary.toLocaleString("id-ID")}/bulan`, "success");
    return { success: true, career };
  },

  resignFromJob() {
    const career = State.data.playerCareer;
    if (!career.currentPosition) return { success: false, error: "Tidak sedang bekerja" };

    State.data.careerHistory.push({
      company: career.currentCompany,
      position: career.currentPosition,
      industry: career.currentIndustry,
      salary: career.salary,
      startDate: career._jobStartDate || this._nowStr(),
      endDate: this._nowStr(),
    });

    career.currentJobId = null;
    career.currentCompany = null;
    career.currentPosition = null;
    career.currentIndustry = null;
    career.level = 0;
    career.levelTitle = "Unemployed";
    career.salary = 0;
    career.monthsInPosition = 0;

    return { success: true };
  },

  // ---------- MONTHLY SALARY & PROMOTION (poin 34-35) ----------
  processMonthlySalary() {
    const career = State.data.playerCareer;
    if (!career || !career.currentPosition) return;

    State.data.cash += career.salary;
    State.addTx("Career Salary", `Gaji dari ${career.currentPosition}`, career.salary);

    career.monthsInPosition++;
    career.yearsExperience = Math.round((career.yearsExperience * 12 + 1) / 12 * 10) / 10;

    // Performance fluctuate sedikit
    career.performance = Math.max(0, Math.min(100, career.performance + (Math.random() * 6 - 3)));

    // Auto-promotion check (poin 35)
    if (career.monthsInPosition >= 12 && career.performance >= 80 && career.level < CAREER_LEVELS.length - 1) {
      this.tryPromotion();
    }
  },

  tryPromotion() {
    const career = State.data.playerCareer;
    career.level++;
    career.levelTitle = CAREER_LEVELS[career.level];
    career.currentPosition = career.currentPosition.replace(
      CAREER_LEVELS[career.level - 1],
      CAREER_LEVELS[career.level]
    );
    career.salary = Math.round(career.salary * 1.2);
    career.monthsInPosition = 0;

    State.notify("Promosi!", `Anda naik jabatan menjadi ${career.levelTitle} — Gaji naik ke Rp${career.salary.toLocaleString("id-ID")}`, "success");
    return { success: true };
  },

  _nowStr() {
    const t = State.data.time;
    return `T${t.year}.${String(t.month).padStart(2, "0")}.${String(t.day).padStart(2, "0")}`;
  },
};
