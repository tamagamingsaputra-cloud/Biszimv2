/* ============================================================
   BizSim Backend — routes/newFeatureRoutes.js
   
   CATATAN PENTING: backend BizSim asli pakai vanilla Node.js
   (zero npm dependencies) dengan pola routes/router.js +
   controllers/ + services/ + repositories/ + utils/respond.js
   + utils/body.js. Karena saya tidak punya akses langsung ke
   isi persis router.js/respond.js/body.js kamu, file ini ditulis
   generik dengan asumsi pola umum:
   
     respond(res, statusCode, jsonData)
     parseBody(req) -> Promise<object>
   
   SESUAIKAN nama fungsi util di bagian atas file ini dengan yang
   ASLI ada di utils/respond.js dan utils/body.js kamu (tinggal
   ganti require path & nama fungsi, logic handler tidak perlu diubah).
   
   Cara pasang: di routes/index.js atau router.js yang sudah ada,
   tambahkan mapping path baru yang mengarah ke handler di file ini,
   mengikuti pola yang sudah kamu pakai untuk route lama (poin 66, 75).
   ============================================================ */

// GANTI path require ini sesuai lokasi asli utils kamu:
const { respond } = require("../utils/respond");
const { parseBody } = require("../utils/body");
const { requireAuth } = require("../middleware/auth"); // asumsi middleware auth sudah ada

// ==================== IN-MEMORY / DB PLACEHOLDER ====================
// Ganti dengan repository pattern asli kamu (repositories/*.js) untuk
// akses SQLite. Di sini pakai placeholder query langsung ke db module.
const db = require("../config/database"); // sesuaikan path

// ==================== JOBS ====================
async function listJobs(req, res) {
  const userId = req.user?.id;
  const jobs = await db.all("SELECT * FROM jobs WHERE user_id = ? AND status = 'open'", [userId]);
  respond(res, 200, { jobs });
}

async function createJob(req, res) {
  const userId = req.user?.id;
  const body = await parseBody(req);
  const id = "job_" + Date.now();
  await db.run(
    `INSERT INTO jobs (id, user_id, business_id, position, positions_available, salary_min, salary_max, requirements_json, status, posted_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [id, userId, body.businessId, body.position, body.positionsAvailable || 1, body.salaryMin, body.salaryMax, JSON.stringify(body.requirements || {}), new Date().toISOString()]
  );
  respond(res, 201, { id });
}

// ==================== APPLICATIONS ====================
async function listApplications(req, res) {
  const userId = req.user?.id;
  const applications = await db.all(
    `SELECT ja.* FROM job_applications ja JOIN jobs j ON ja.job_id = j.id WHERE j.user_id = ?`,
    [userId]
  );
  respond(res, 200, { applications });
}

async function submitApplication(req, res) {
  const body = await parseBody(req);
  const id = "app_" + Date.now();
  await db.run(
    `INSERT INTO job_applications (id, job_id, candidate_name, candidate_data_json, status, applied_date)
     VALUES (?, ?, ?, ?, 'pending', ?)`,
    [id, body.jobId, body.candidateName, JSON.stringify(body.candidateData || {}), new Date().toISOString()]
  );
  respond(res, 201, { id });
}

// ==================== EMPLOYEES ====================
async function listEmployees(req, res) {
  const userId = req.user?.id;
  const employees = await db.all("SELECT * FROM employees WHERE user_id = ?", [userId]);
  respond(res, 200, { employees });
}

async function hireEmployee(req, res) {
  const userId = req.user?.id;
  const body = await parseBody(req);
  const id = "emp_" + Date.now();
  await db.run(
    `INSERT INTO employees (id, user_id, business_id, name, gender, age, education, position, salary, skills_json, hire_date, portrait_seed)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [id, userId, body.businessId, body.name, body.gender, body.age, body.education, body.position, body.salary, JSON.stringify(body.skills || {}), new Date().toISOString(), body.portraitSeed || Math.floor(Math.random() * 100000)]
  );
  respond(res, 201, { id });
}

async function updateEmployee(req, res) {
  const { id } = req.params || {};
  const body = await parseBody(req);
  const fields = [];
  const values = [];
  ["position", "salary", "level", "level_title", "performance", "morale", "loyalty", "status"].forEach(f => {
    const camelKey = f.replace(/_([a-z])/g, (_, c) => c.toUpperCase());
    if (body[camelKey] !== undefined) { fields.push(`${f} = ?`); values.push(body[camelKey]); }
  });
  if (fields.length === 0) return respond(res, 400, { error: "Tidak ada field untuk diupdate" });
  values.push(id);
  await db.run(`UPDATE employees SET ${fields.join(", ")}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`, values);
  respond(res, 200, { success: true });
}

// ==================== INTERVIEWS ====================
async function submitInterview(req, res) {
  const body = await parseBody(req);
  const id = "iv_" + Date.now();
  await db.run(
    `INSERT INTO interviews (id, candidate_id, application_id, answers_json, result_score, status)
     VALUES (?, ?, ?, ?, ?, 'completed')`,
    [id, body.candidateId, body.applicationId, JSON.stringify(body.answers || []), body.resultScore || 0]
  );
  respond(res, 201, { id });
}

// ==================== PROMOTIONS ====================
async function promoteEmployee(req, res) {
  const { id } = req.params || {};
  const body = await parseBody(req);
  await db.run(
    `INSERT INTO employee_promotions (id, employee_id, old_title, new_title, old_salary, new_salary)
     VALUES (?, ?, ?, ?, ?, ?)`,
    ["promo_" + Date.now(), id, body.oldTitle, body.newTitle, body.oldSalary, body.newSalary]
  );
  await db.run(`UPDATE employees SET level_title = ?, salary = ? WHERE id = ?`, [body.newTitle, body.newSalary, id]);
  respond(res, 200, { success: true });
}

// ==================== TRAINING ====================
async function startTraining(req, res) {
  const body = await parseBody(req);
  const id = "trn_" + Date.now();
  await db.run(
    `INSERT INTO employee_training (id, employee_id, program_name, target_skill, skill_gain, days_remaining, cost)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, body.employeeId, body.programName, body.targetSkill, body.skillGain, body.daysRemaining, body.cost]
  );
  respond(res, 201, { id });
}

// ==================== TRADING ====================
async function openTradingPosition(req, res) {
  const userId = req.user?.id;
  const body = await parseBody(req);
  const id = "pos_" + Date.now();
  await db.run(
    `INSERT INTO trading_positions (id, user_id, asset_id, side, size, leverage, margin, entry_price, current_price, liquidation_price, status, opened_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?)`,
    [id, userId, body.assetId, body.side, body.size, body.leverage, body.margin, body.entryPrice, body.entryPrice, body.liquidationPrice, new Date().toISOString()]
  );
  respond(res, 201, { id });
}

async function closeTradingPosition(req, res) {
  const { id } = req.params || {};
  const body = await parseBody(req);
  await db.run(
    `UPDATE trading_positions SET status = 'closed', closed_at = ?, realized_pnl = ?, current_price = ? WHERE id = ?`,
    [new Date().toISOString(), body.realizedPnl, body.currentPrice, id]
  );
  respond(res, 200, { success: true });
}

async function listTradingPositions(req, res) {
  const userId = req.user?.id;
  const positions = await db.all("SELECT * FROM trading_positions WHERE user_id = ? AND status = 'open'", [userId]);
  respond(res, 200, { positions });
}

// ==================== NEWS / EVENTS ====================
async function listNews(req, res) {
  const news = await db.all("SELECT * FROM news ORDER BY created_at DESC LIMIT 50");
  respond(res, 200, { news });
}

async function listRealWorldEvents(req, res) {
  // Placeholder: idealnya di sini backend fetch dari API eksternal
  // (mis. NewsAPI) menggunakan API key yang disimpan di ENV VAR backend,
  // BUKAN di frontend (poin 68). Contoh:
  //
  // const apiKey = process.env.NEWS_API_KEY;
  // const response = await fetch(`https://newsapi.org/v2/top-headlines?category=business&apiKey=${apiKey}`);
  // const data = await response.json();
  // const mapped = data.articles.map(a => ({ title: a.title, category: "economic", severity: "medium", description: a.description }));
  // respond(res, 200, { events: mapped });
  //
  // Untuk sekarang, return array kosong sampai API key dikonfigurasi:
  respond(res, 200, { events: [], note: "Konfigurasi NEWS_API_KEY di environment variable backend untuk mengaktifkan real-world event" });
}

// ==================== CREATOR ====================
async function getCreatorProfile(req, res) {
  const userId = req.user?.id;
  const profile = await db.get("SELECT * FROM creator_profiles WHERE user_id = ?", [userId]);
  respond(res, 200, { profile: profile || null });
}

async function saveCreatorProfile(req, res) {
  const userId = req.user?.id;
  const body = await parseBody(req);
  const existing = await db.get("SELECT id FROM creator_profiles WHERE user_id = ?", [userId]);
  if (existing) {
    await db.run(
      `UPDATE creator_profiles SET active_profession = ?, youtube_json = ?, tiktok_json = ?, clipper_json = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?`,
      [body.activeProfession, JSON.stringify(body.youtube || null), JSON.stringify(body.tiktok || null), JSON.stringify(body.clipper || null), userId]
    );
  } else {
    await db.run(
      `INSERT INTO creator_profiles (id, user_id, active_profession, youtube_json, tiktok_json, clipper_json) VALUES (?, ?, ?, ?, ?, ?)`,
      ["cp_" + Date.now(), userId, body.activeProfession, JSON.stringify(body.youtube || null), JSON.stringify(body.tiktok || null), JSON.stringify(body.clipper || null)]
    );
  }
  respond(res, 200, { success: true });
}

// ==================== BUSINESS INVENTORY & SUPPLIERS ====================
async function listInventory(req, res) {
  const { businessId } = req.params || {};
  const items = await db.all("SELECT * FROM inventory WHERE business_id = ?", [businessId]);
  respond(res, 200, { items });
}

async function listSuppliers(req, res) {
  const { businessId } = req.params || {};
  const suppliers = await db.all("SELECT * FROM suppliers WHERE business_id = ?", [businessId]);
  respond(res, 200, { suppliers });
}

/* ============================================================
   EXPORT — sesuaikan cara export dengan pola router.js asli.
   Jika router asli pakai object mapping { 'METHOD /path': handler },
   contoh pemakaian di routes/index.js:
   
   const newRoutes = require('./newFeatureRoutes');
   module.exports = {
     ...existingRoutes,
     'GET /api/jobs': [requireAuth, newRoutes.listJobs],
     'POST /api/jobs': [requireAuth, newRoutes.createJob],
     'GET /api/applications': [requireAuth, newRoutes.listApplications],
     'POST /api/applications': [requireAuth, newRoutes.submitApplication],
     'GET /api/employees': [requireAuth, newRoutes.listEmployees],
     'POST /api/employees': [requireAuth, newRoutes.hireEmployee],
     'PATCH /api/employees/:id': [requireAuth, newRoutes.updateEmployee],
     'POST /api/interviews': [requireAuth, newRoutes.submitInterview],
     'POST /api/promotions/:id': [requireAuth, newRoutes.promoteEmployee],
     'POST /api/training': [requireAuth, newRoutes.startTraining],
     'POST /api/trading/open': [requireAuth, newRoutes.openTradingPosition],
     'POST /api/trading/close/:id': [requireAuth, newRoutes.closeTradingPosition],
     'GET /api/trading/positions': [requireAuth, newRoutes.listTradingPositions],
     'GET /api/news': [newRoutes.listNews],
     'GET /api/events/realworld': [newRoutes.listRealWorldEvents],
     'GET /api/creator': [requireAuth, newRoutes.getCreatorProfile],
     'POST /api/creator': [requireAuth, newRoutes.saveCreatorProfile],
     'GET /api/business/:businessId/inventory': [requireAuth, newRoutes.listInventory],
     'GET /api/business/:businessId/suppliers': [requireAuth, newRoutes.listSuppliers],
   };
   ============================================================ */

module.exports = {
  listJobs, createJob,
  listApplications, submitApplication,
  listEmployees, hireEmployee, updateEmployee,
  submitInterview,
  promoteEmployee,
  startTraining,
  openTradingPosition, closeTradingPosition, listTradingPositions,
  listNews, listRealWorldEvents,
  getCreatorProfile, saveCreatorProfile,
  listInventory, listSuppliers,
};
