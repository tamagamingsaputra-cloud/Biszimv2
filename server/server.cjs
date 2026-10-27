// BizSim server — sumber kebenaran untuk profil karakter, progres pendidikan, ujian, dan riwayat kelulusan.
// Semua hasil ujian dinilai DI SERVER; kunci jawaban tidak pernah dikirim ke browser sebelum ujian selesai.
const path = require('path');
const crypto = require('crypto');
const express = require('express');
const C = require('./catalog.cjs');
const CAL = require('./calendar.cjs');

// Vercel Functions memiliki filesystem sementara. Di Vercel, wajib memakai database
// Turso/libSQL terkelola; jangan pernah diam-diam jatuh kembali ke /tmp.
const TURSO_URL = String(process.env.TURSO_DATABASE_URL || process.env.LIBSQL_URL || '').trim();
const TURSO_TOKEN = String(process.env.TURSO_AUTH_TOKEN || process.env.LIBSQL_AUTH_TOKEN || '').trim();
const isVercel = String(process.env.VERCEL || '') === '1' || !!process.env.VERCEL;
const hasRemoteDb = !!(TURSO_URL && TURSO_TOKEN);
if (isVercel && !hasRemoteDb) {
  throw new Error('BizSim membutuhkan TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN di Vercel. SQLite lokal /tmp tidak persisten; deployment dihentikan agar progres pemain tidak hilang.');
}
if (hasRemoteDb && !/^(libsql|https?):\/\//i.test(TURSO_URL)) {
  throw new Error('TURSO_DATABASE_URL harus berupa URL libsql:// atau https:// yang valid.');
}
const DB_PATH = process.env.BIZSIM_DB || path.join(__dirname, 'bizsim.db');
const Database = hasRemoteDb ? require('libsql') : require('better-sqlite3');
const db = hasRemoteDb ? new Database(TURSO_URL, { authToken: TURSO_TOKEN }) : new Database(DB_PATH);
if (!hasRemoteDb && typeof db.pragma === 'function') db.pragma('journal_mode = WAL');
const DATABASE_MODE = hasRemoteDb ? 'turso-remote' : 'local-file';
db.exec(`
CREATE TABLE IF NOT EXISTS players (visitor TEXT PRIMARY KEY, char_id TEXT, profile TEXT, edu TEXT, game TEXT, updated_at INTEGER);
CREATE TABLE IF NOT EXISTS exam_sessions (id TEXT PRIMARY KEY, visitor TEXT, char_id TEXT, kind TEXT, ref TEXT, seed TEXT, questions TEXT, started_at INTEGER, expires_at INTEGER, submitted INTEGER DEFAULT 0);
CREATE TABLE IF NOT EXISTS exam_results (id TEXT PRIMARY KEY, visitor TEXT, char_id TEXT, kind TEXT, ref TEXT, term_key TEXT, subject TEXT, score REAL, passed INTEGER, correct INTEGER, total INTEGER, review TEXT, game_day INTEGER, created_at INTEGER);
CREATE TABLE IF NOT EXISTS records (id TEXT PRIMARY KEY, visitor TEXT, char_id TEXT, payload TEXT, created_at INTEGER);
CREATE TABLE IF NOT EXISTS edu_ledger (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor TEXT, char_id TEXT, game_day INTEGER, label TEXT, amount INTEGER, source TEXT, created_at INTEGER);
`);
for (const col of ['clock_abs REAL', 'game_key TEXT']) { try { db.exec(`ALTER TABLE players ADD COLUMN ${col}`); } catch { /* kolom sudah ada */ } }

const R = C.RULES;
const START = Date.UTC(2026, 0, 5); // sama dengan engine klien: hari ke-1 = Senin 5 Jan 2026
const dateOf = d => new Date(START + d * 864e5);
const FAMILY = { prasejahtera: { label: 'Prasejahtera', perTerm: 350_000, allowance: 5_000 }, menengah: { label: 'Menengah', perTerm: 1_500_000, allowance: 10_000 }, mampu: { label: 'Mampu', perTerm: 6_000_000, allowance: 20_000 } };
const STAGES = { SD: { grades: [1, 6], award: 'SD', next: ['SMP'] }, SMP: { grades: [7, 9], award: 'SMP', next: ['SMA', 'SMK'] }, SMA: { grades: [10, 12], award: 'SMA/SMK', next: ['PT'] }, SMK: { grades: [10, 12], award: 'SMA/SMK', next: ['PT'] }, PT: { grades: [1, 8] } };
const MIN_FINAL = { 'sma-mandiri': 80, 'universitas': 75, 'politeknik': 70, 'smp-insan': 75 };
const PREV = { SMP: 'SD', SMA: 'SMP', SMK: 'SMP', PT: ['SMA', 'SMK'] };
const MODULE_WINDOWS = [[1, 4], [5, 10], [11, 17]]; // hari ke- di dalam periode saat modul diajarkan
const TASK_DAYS = [3, 12], TASK_DUE = 5;
const MID = [R.midDay, R.midDay + 2], FIN = [R.finalDay, R.finalDay + 2], REMEDIAL = [21, 24], REPORT_DAY = 25;

const vid = req => String(req.get('x-visitor-id') || req.get('x-dev-visitor') || 'local-dev').slice(0, 120);
const now = () => Date.now();
const rid = (p = '') => p + crypto.randomBytes(6).toString('hex');
const round = (x, n = 1) => Math.round(x * 10 ** n) / 10 ** n;

function getPlayer(v) {
  const r = db.prepare('SELECT * FROM players WHERE visitor=?').get(v);
  if (!r) return null;
  return { visitor: v, charId: r.char_id, profile: r.profile ? JSON.parse(r.profile) : null, edu: r.edu ? JSON.parse(r.edu) : null, game: r.game ? JSON.parse(r.game) : null };
}
function savePlayer(p) {
  db.prepare(`INSERT INTO players (visitor,char_id,profile,edu,game,updated_at) VALUES (@v,@c,@p,@e,@g,@t)
    ON CONFLICT(visitor) DO UPDATE SET char_id=@c, profile=@p, edu=@e, game=COALESCE(@g, game), updated_at=@t`)
    .run({ v: p.visitor, c: p.charId, p: JSON.stringify(p.profile), e: JSON.stringify(p.edu), g: p.game === undefined ? null : JSON.stringify(p.game), t: now() });
}
const inst = id => C.institutions.find(i => i.id === id);
// Kalender hidup karakter: 1 tahun ajaran (2 periode × 28 hari game = 56 hari game) = 1 tahun usia karakter.
const LIFE_PER_DAY = 365.25 / (2 * R.termDays);
const lifeDateOf = d => new Date(START + Math.floor(d * LIFE_PER_DAY) * 864e5);
const ageAt = (profile, gameDay) => { const b = new Date(profile.birthDate + 'T00:00:00Z'), d = lifeDateOf(gameDay); let a = d.getUTCFullYear() - b.getUTCFullYear(); if (d.getUTCMonth() < b.getUTCMonth() || (d.getUTCMonth() === b.getUTCMonth() && d.getUTCDate() < b.getUTCDate())) a--; return a; };

// ————— biaya: dihitung dari konfigurasi institusi, tidak pernah dari UI —————
function feeQuote(p, i, kind) {
  const f = i.fees, edu = p.edu, lines = [];
  const far = i.city !== p.profile.city;
  const prevAvg = edu.reports.length ? edu.reports[edu.reports.length - 1].average : null;
  const merit = prevAvg != null && prevAvg >= 85 ? 0.5 * i.aid : 0;
  const poor = p.profile.family === 'prasejahtera';
  if (kind === 'enroll') { if (f.registration) lines.push(['registration', C.feeLabels.registration, f.registration]); if (f.entry) lines.push(['entry', C.feeLabels.entry, f.entry]); }
  if (f.tuition) lines.push(['tuition', C.feeLabels.tuition, f.tuition]);
  lines.push(['books', C.feeLabels.books, f.books]);
  lines.push(['transport', C.feeLabels.transport + (far ? ' (beda kota ×2)' : ''), f.transport * (far ? 2 : 1)]);
  if (f.exam) lines.push(['exam', C.feeLabels.exam, f.exam]);
  if (f.practicum) lines.push(['practicum', C.feeLabels.practicum, f.practicum]);
  const discounts = [];
  if (merit && f.tuition) discounts.push(['merit', `Beasiswa prestasi simulasi (rata-rata ≥ 85: −${Math.round(merit * 100)}% SPP)`, -Math.round(f.tuition * merit)]);
  if (poor) discounts.push(['aid', 'Bantuan keluarga prasejahtera (−50% buku & transport)', -Math.round((f.books + f.transport * (far ? 2 : 1)) * 0.5)]);
  const gross = lines.reduce((s, l) => s + l[2], 0), disc = discounts.reduce((s, l) => s + l[2], 0);
  return { lines: lines.map(([k, label, amount]) => ({ k, label, amount })), discounts: discounts.map(([k, label, amount]) => ({ k, label, amount })), total: gross + disc };
}
function eligibility(p, i, gameDay) {
  const e = p.edu, reasons = [], prevStage = PREV[i.stage];
  const age = ageAt(p.profile, gameDay);
  if (i.stage === 'SD') { if (age < 6) reasons.push(`Usia minimal 6 tahun (usia karakter: ${age})`); if (e.passed.includes('SD')) reasons.push('Karakter sudah lulus SD'); }
  else {
    const have = Array.isArray(prevStage) ? prevStage.find(s => e.passed.includes(s)) : (e.passed.includes(prevStage) ? prevStage : null);
    if (!have) reasons.push(`Butuh catatan kelulusan ${Array.isArray(prevStage) ? 'SMA/SMK' : prevStage}`);
    if (e.passed.includes(i.stage) || (i.stage === 'SMK' && e.passed.includes('SMA')) || (i.stage === 'SMA' && e.passed.includes('SMK'))) reasons.push('Jenjang ini sudah diselesaikan');
    const need = MIN_FINAL[i.id]; const last = e.finalByStage[have];
    if (need && have && (last ?? 0) < need) reasons.push(`Nilai akhir ${have} minimal ${need} (kamu: ${last ?? '—'})`);
  }
  if (e.status === 'enrolled') reasons.push('Masih terdaftar di institusi lain');
  return { ok: !reasons.length, reasons, age };
}

// ————— kurikulum aktif —————
const subjectsNow = e => C.subjects(e.stage, e.grade, e.program, e.term);
const termKey = e => `${e.stage}-${e.grade}-${e.term}-${e.attempt}`;
function newTerm(p, startDay) {
  const e = p.edu, i = inst(e.institutionId);
  e.termStartDay = startDay; e.termDay = 0; e.attendanceLog = []; e.read = {}; e.studyLog = {};
  e.mastery = Object.fromEntries(subjectsNow(e).map(s => [s.id, 0]));
  e.tasks = []; e.exams = {}; e.reportPending = null;
  const fam = FAMILY[p.profile.family];
  e.wallet += fam.perTerm;
  ledger(p, startDay, `Kontribusi wali/keluarga (${fam.label}) untuk periode ini`, fam.perTerm, 'wali');
  if (!e.skipBillOnce) { const q = feeQuote(p, i, 'term'); e.bills.push({ id: rid('b'), termKey: termKey(e), label: `Biaya periode ${labelTerm(e)}`, lines: q.lines, discounts: q.discounts, amount: q.total, paid: 0, dueTermDay: R.midDay, issuedDay: startDay }); }
  e.skipBillOnce = false;
}
const labelTerm = e => e.stage === 'PT' ? `Semester ${e.grade}` : `Kelas ${e.grade} · Semester ${e.term === 1 ? 'Ganjil' : 'Genap'}`;
function ledger(p, day, label, amount, source) { db.prepare('INSERT INTO edu_ledger (visitor,char_id,game_day,label,amount,source,created_at) VALUES (?,?,?,?,?,?,?)').run(p.visitor, p.charId, day, label, amount, source, now()); }
const outstanding = e => e.bills.reduce((s, b) => s + (b.amount - b.paid), 0);

function taught(e, subjId, tday = e.termDay) {
  const mods = C.subjects(e.stage, e.grade, e.program, e.term).find(s => s.id === subjId).modules;
  return mods.filter((m, k) => tday >= MODULE_WINDOWS[k][0]);
}
function learnedModules(e, subjId) {
  const mods = C.subjects(e.stage, e.grade, e.program, e.term).find(s => s.id === subjId).modules;
  return mods.filter((m, k) => (e.termDay >= MODULE_WINDOWS[k][0] && e.attendanceLog.some(a => a.status === 'hadir' && a.termDay >= MODULE_WINDOWS[k][0] && a.termDay <= MODULE_WINDOWS[k][1])) || e.read[m.id]);
}

// ————— proses harian (idempoten, deterministik dari seed) —————
function processDay(p, d) {
  const e = p.edu; if (e.status !== 'enrolled') return;
  if (d < e.termStartDay) return;
  e.termDay = d - e.termStartDay + 1;
  const td = e.termDay, i = inst(e.institutionId), subs = subjectsNow(e);
  if (td <= R.studyDays) {
    const sick = C.hash(e.seed, 'sick', termKey(e), td) < 0.05;
    const status = sick ? 'sakit' : 'hadir';
    e.attendanceLog.push({ termDay: td, day: d, status });
    if (status === 'hadir') {
      const apt = p.profile.aptitude || 50;
      for (const s of subs) e.mastery[s.id] = Math.min(100, e.mastery[s.id] + 2.4 * (i.quality / 80) * (0.75 + apt / 200));
    }
    if (TASK_DAYS.includes(td)) for (const s of subs) {
      const mods = taught(e, s.id, td); const m = mods[mods.length - 1];
      e.tasks.push({ id: rid('t'), subject: s.id, module: m.id, title: `Tugas ${TASK_DAYS.indexOf(td) + 1}: ${m.name}`, issuedTermDay: td, dueTermDay: td + TASK_DUE, status: 'open', score: null });
    }
  }
  for (const t of e.tasks) if (t.status === 'open' && td > t.dueTermDay) { t.status = 'terlambat'; t.score = 0; }
  for (const s of subs) for (const [kind, win] of [['mid', MID], ['final', FIN]]) {
    const k = `${s.id}:${kind}`; if (td > win[1] && (!e.exams[k] || e.exams[k].status === 'berlangsung')) e.exams[k] = { ...(e.exams[k] || {}), subject: s.id, kind, status: 'tidak-ikut', score: 0 };
  }
  if (td === REPORT_DAY) finalizeTerm(p, d);
  if (td >= C.RULES.termDays) advanceTerm(p, d + 1);
}
function subjectGrade(e, s) {
  const mid = e.exams[`${s.id}:mid`]?.score ?? 0, fin = e.exams[`${s.id}:final`]?.score ?? 0, rem = e.exams[`${s.id}:remedial`];
  const tasks = e.tasks.filter(t => t.subject === s.id);
  const taskAvg = tasks.length ? tasks.reduce((a, t) => a + (t.score || 0), 0) / tasks.length : 0;
  const att = e.attendanceLog.length ? e.attendanceLog.filter(a => a.status === 'hadir').length / e.attendanceLog.length * 100 : 0;
  const exam = 0.4 * mid + 0.6 * fin, W = R.weights;
  let final = W.exam * exam + W.tasks * taskAvg + W.mastery * (e.mastery[s.id] || 0) + W.attendance * att;
  let remedied = false;
  if (rem && rem.status === 'selesai' && final < R.pass && rem.score >= R.pass) { final = R.pass; remedied = true; }
  return { id: s.id, name: s.name, mid: round(mid), final_exam: round(fin), tasks: round(taskAvg), mastery: round(e.mastery[s.id] || 0), attendance: round(att), exam: round(exam), grade: round(final), remedied, remedialScore: rem?.score ?? null, passed: final >= R.pass };
}
function finalizeTerm(p, d) {
  const e = p.edu, subs = subjectsNow(e), rows = subs.map(s => subjectGrade(e, s));
  const att = e.attendanceLog.length ? e.attendanceLog.filter(a => a.status === 'hadir').length / e.attendanceLog.length * 100 : 0;
  const tasksDone = e.tasks.length ? e.tasks.filter(t => t.status === 'selesai').length / e.tasks.length * 100 : 0;
  const average = round(rows.reduce((a, r) => a + r.grade, 0) / rows.length);
  const checks = [
    { label: `Semua mata pelajaran ≥ ${R.pass} (setelah remedial)`, ok: rows.every(r => r.passed), detail: rows.filter(r => !r.passed).map(r => `${r.name} ${r.grade}`).join(', ') || 'Terpenuhi' },
    { label: `Kehadiran ≥ ${R.minAttendance}%`, ok: att >= R.minAttendance, detail: `${round(att)}%` },
    { label: `Tugas dikumpulkan ≥ ${R.minTasks}%`, ok: tasksDone >= R.minTasks, detail: `${round(tasksDone)}%` },
    { label: 'Tidak ada tunggakan biaya', ok: outstanding(e) <= 0, detail: outstanding(e) > 0 ? `Tunggakan Rp ${outstanding(e).toLocaleString('id-ID')}` : 'Lunas', soft: true },
  ];
  const academicOk = checks.filter(c => !c.soft).every(c => c.ok);
  const decisionTerm = e.stage === 'PT' || e.term === 2;
  const [g0, g1] = e.stage === 'PT' ? [1, inst(e.institutionId).semesters] : STAGES[e.stage].grades;
  let decision, next;
  if (!decisionTerm) { decision = academicOk ? 'lanjut' : 'peringatan'; next = { grade: e.grade, term: 2 }; }
  else if (!academicOk) { decision = 'mengulang'; next = { grade: e.grade, term: e.stage === 'PT' ? 1 : 1, repeat: true }; }
  else if (e.grade >= g1) { decision = 'lulus'; }
  else { decision = 'naik'; next = { grade: e.grade + 1, term: 1 }; }
  const report = { id: rid('r'), termKey: termKey(e), stage: e.stage, grade: e.grade, term: e.term, label: labelTerm(e), institution: inst(e.institutionId).name, program: e.program, rows, attendance: round(att), tasksDone: round(tasksDone), average, checks, decision, day: d, decisionTerm, absences: { sakit: e.attendanceLog.filter(a => a.status === 'sakit').length, izin: 0, alpa: 0 } };
  e.reports.push(report); e.pendingNext = next || null; e.lastDecision = decision;
  if (decision === 'lulus') graduate(p, d, report);
}
function graduate(p, d, report) {
  const e = p.edu, i = inst(e.institutionId);
  const stageReports = e.reports.filter(r => r.stage === e.stage && r.institution === i.name);
  const finalGrade = round(stageReports.reduce((a, r) => a + r.average, 0) / stageReports.length);
  const year = lifeDateOf(d).getUTCFullYear();
  const recId = `BZS-${e.stage}-${year}-${crypto.createHash('sha256').update([p.charId, e.stage, i.id, d, finalGrade].join('|')).digest('hex').slice(0, 8).toUpperCase()}`;
  const payload = { recordId: recId, characterName: p.profile.name, characterId: p.charId, institution: i.name, institutionId: i.id, city: i.city, stage: e.stage, degree: i.degree || null, program: e.program, graduationYear: year, graduationDate: lifeDateOf(d).toISOString().slice(0, 10), gameDay: d, finalGrade, status: finalGrade >= 85 ? 'Lulus dengan pujian (simulasi)' : 'Lulus', rulesVersion: R.version, fictional: true, terms: stageReports.length };
  db.prepare('INSERT INTO records (id,visitor,char_id,payload,created_at) VALUES (?,?,?,?,?)').run(recId, p.visitor, p.charId, JSON.stringify(payload), now());
  const award = e.stage === 'PT' ? i.degree : STAGES[e.stage].award;
  e.passed.push(e.stage); e.finalByStage[e.stage] = finalGrade; e.highest = award;
  e.history.push({ stage: e.stage, institution: i.name, program: e.program, from: e.enrolledDay, to: d, status: 'Lulus', recordId: recId });
  e.status = 'graduated'; e.graduatedDay = d;
}
function advanceTerm(p, startDay) {
  const e = p.edu; if (e.status !== 'enrolled' || !e.pendingNext) return;
  const n = e.pendingNext; e.pendingNext = null;
  if (n.repeat) { e.attempt += 1; e.history.push({ stage: e.stage, institution: inst(e.institutionId).name, program: e.program, from: e.termStartDay, to: startDay - 1, status: `Mengulang ${e.stage === 'PT' ? 'semester ' + e.grade : 'kelas ' + e.grade}` }); }
  e.grade = n.grade; e.term = e.stage === 'PT' ? 1 : n.term;
  newTerm(p, startDay);
}
function advanceTo(p, gameDay) {
  const e = p.edu; if (e.lastDay == null) e.lastDay = gameDay - 1;
  const from = e.lastDay + 1, to = Math.min(gameDay, from + 4000);
  for (let d = from; d <= to; d++) processDay(p, d);
  e.lastDay = Math.max(e.lastDay, to);
}

// ————— ujian: pemilihan soal berbasis seed yang dapat direproduksi —————
function pickQuestions({ seed, stage, grade, program, term, subject, modules, count, salt }) {
  const sub = C.subjects(stage, grade, program, term).find(s => s.id === subject);
  const pool = C.bank(stage, grade, program, term, sub).filter(q => modules.includes(q.module));
  const keyed = pool.map(q => ({ q, k: C.hash(seed, salt, q.id) })).sort((a, b) => a.k - b.k).map(x => x.q);
  // ambil campuran tingkat kesulitan: setengah dari modul termudah yang tersedia, sisanya dari modul tersulit yang sudah dipelajari
  const byDiff = {}; for (const q of keyed) (byDiff[q.difficulty] ||= []).push(q);
  const diffs = Object.keys(byDiff).map(Number).sort();
  const out = [], seen = new Set();
  let idx = 0; while (out.length < count && keyed.length) {
    const d = diffs[idx % diffs.length]; const cand = (byDiff[d] || []).find(q => !seen.has(q.q)); idx++;
    if (cand) { out.push(cand); seen.add(cand.q); }
    if (idx > count * 6) break;
  }
  for (const q of keyed) { if (out.length >= count) break; if (!seen.has(q.q)) { out.push(q); seen.add(q.q); } }
  return out.map((q, n) => {
    const order = q.type === 'benar-salah' ? q.options.map((o, j) => ({ o, j })) : q.options.map((o, j) => ({ o, j, k: C.hash(seed, salt, q.id, 'opt', j) })).sort((a, b) => a.k - b.k);
    return { id: q.id, n: n + 1, q: q.q, options: order.map(x => x.o), correct: order.findIndex(x => x.j === q.correct), explanation: q.explanation, module: q.module, difficulty: q.difficulty, type: q.type };
  });
}
const publicQ = qs => qs.map(({ correct, explanation, ...rest }) => rest);

// ————— HTTP —————
const app = express();
app.use(express.json({ limit: '4mb' }));
app.use((req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
const fail = (res, error, code = 400) => res.status(code).json({ ok: false, error });
function need(req, res) { const p = getPlayer(vid(req)); if (!p || !p.profile) { fail(res, 'Profil karakter belum dibuat.', 404); return null; } return p; }
function view(p) {
  const e = p.edu, i = e.institutionId ? inst(e.institutionId) : null;
  const subs = e.status === 'enrolled' ? subjectsNow(e).map(s => ({ ...s, modules: s.modules.map((m, k) => ({ ...m, window: MODULE_WINDOWS[k], taught: e.termDay >= MODULE_WINDOWS[k][0], read: !!e.read[m.id] })), learned: learnedModules(e, s.id).map(m => m.id), current: subjectGrade(e, s) })) : [];
  const records = db.prepare('SELECT payload FROM records WHERE visitor=? ORDER BY created_at').all(p.visitor).map(r => JSON.parse(r.payload));
  const results = db.prepare('SELECT id,kind,ref,term_key termKey,subject,score,passed,correct,total,game_day gameDay,created_at createdAt FROM exam_results WHERE visitor=? AND char_id=? ORDER BY created_at DESC LIMIT 200').all(p.visitor, p.charId);
  const payments = db.prepare('SELECT game_day gameDay,label,amount,source FROM edu_ledger WHERE visitor=? AND char_id=? ORDER BY id DESC LIMIT 60').all(p.visitor, p.charId);
  return { ok: true, charId: p.charId, profile: p.profile, edu: { ...e, institution: i, subjects: subs, labelTerm: e.status === 'enrolled' ? labelTerm(e) : null, outstanding: outstanding(e), windows: { mid: MID, final: FIN, remedial: REMEDIAL, report: REPORT_DAY, tasks: TASK_DAYS, taskDue: TASK_DUE, modules: MODULE_WINDOWS } }, rules: { ...R, lifePerDay: LIFE_PER_DAY, start: START }, age: ageAt(p.profile, Math.max(0, e.lastDay)), lifeDate: lifeDateOf(Math.max(0, e.lastDay)).toISOString().slice(0, 10), family: FAMILY, records, results, payments, serverTime: now() };
}

app.get('/api/health', (req, res) => {
  try {
    const check = db.prepare('SELECT 1 AS ok').get();
    const persistent = DATABASE_MODE === 'turso-remote';
    res.status(check && check.ok === 1 ? 200 : 503).json({
      ok: !!(check && check.ok === 1),
      db: persistent ? 'Turso/libSQL' : path.basename(DB_PATH),
      persistence: persistent ? 'managed-remote-database' : 'local-file-only',
      configured: persistent,
      warning: persistent ? null : 'Database lokal tidak persisten di Vercel. Untuk deployment, atur TURSO_DATABASE_URL dan TURSO_AUTH_TOKEN.'
    });
  } catch (err) {
    res.status(503).json({ ok: false, db: DATABASE_MODE, persistence: 'unavailable', error: 'Database tidak dapat dijangkau.' });
  }
});
app.get('/api/state', (req, res) => {
  const p = getPlayer(vid(req)); if (!p || !p.profile) return res.json({ ok: true, profile: null, game: p?.game || null, family: FAMILY });
  res.json({ ...view(p), game: p.game });
});
app.get('/api/calendar', (req, res) => res.json({ ok: true, calendar: CAL.CALENDAR, daysPerYear: CAL.DAYS_PER_YEAR, secPerTick: CAL.SEC_PER_TICK, ticksPerDay: CAL.TICKS_PER_DAY, weekdays: CAL.WEEKDAYS }));
const FINANCE = require('./finance.cjs')(app, { db, vid, rid, now, fail, getPlayer, ageAt });
app.put('/api/game', (req, res) => {
  const p = getPlayer(vid(req)); if (!p) return fail(res, 'Profil belum dibuat.', 404);
  const game = req.body && req.body.game;
  if (!game || typeof game !== 'object') return fail(res, 'Format save tidak valid.');
  // Uang tunai yang sudah diubah server keuangan (fin_seq) tidak boleh tertimpa save lama.
  const missing = FINANCE.checkSeq(p.visitor, game);
  if (missing) return res.status(409).json({ ok: false, code: 'finseq', adjustments: missing, error: 'Save menunggu penyesuaian uang tunai dari server keuangan.' });
  const clk = CAL.readClock(game); if (!clk) return fail(res, 'Jam simulasi pada save tidak valid.');
  // Jam simulasi hanya boleh maju untuk karakter & dunia yang sama. Save dengan jam lebih lama (mis. tab lain yang
  // tertinggal) ditolak agar tidak menimpa progres yang lebih baru.
  const key = `${game.charId || ''}:${game.createdAt || ''}`;
  const cur = db.prepare('SELECT clock_abs, game_key FROM players WHERE visitor=?').get(p.visitor) || {};
  if (cur.game_key === key && cur.clock_abs != null && clk.abs + 1e-6 < cur.clock_abs) {
    const prev = CAL.readClock({ clock: { g: Math.floor(cur.clock_abs / CAL.SEC_PER_TICK), sec: cur.clock_abs % CAL.SEC_PER_TICK } });
    return res.status(409).json({ ok: false, code: 'stale', error: `Save ditolak: jam simulasi (${clk.label}) lebih lama dari yang tersimpan di server (${prev.label}). Muat ulang halaman untuk melanjutkan dari save terbaru.` });
  }
  db.prepare('UPDATE players SET game=?, updated_at=?, clock_abs=?, game_key=? WHERE visitor=?').run(JSON.stringify(game), now(), clk.abs, key, p.visitor);
  res.json({ ok: true, savedAt: now(), clock: clk.label });
});
app.post('/api/profile', (req, res) => {
  const b = req.body || {}, v = vid(req);
  const name = String(b.name || '').trim().slice(0, 40), city = String(b.city || ''), family = String(b.family || 'menengah');
  const birth = String(b.birthDate || ''); const gameDay = Number(b.gameDay) || 0;
  if (name.length < 2) return fail(res, 'Nama karakter minimal 2 huruf.');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birth)) return fail(res, 'Tanggal lahir tidak valid.');
  if (!FAMILY[family]) return fail(res, 'Latar keluarga tidak dikenal.');
  const profile = { name, nickname: String(b.nickname || name.split(' ')[0]).slice(0, 20), gender: b.gender === 'P' ? 'P' : 'L', birthDate: birth, birthPlace: String(b.birthPlace || city).slice(0, 40), city, province: String(b.province || ''), guardian: String(b.guardian || '').slice(0, 40), aspiration: String(b.aspiration || '').slice(0, 40), family, aptitude: 40 + Math.round(C.hash(b.seed || 20260105, 'apt', name) * 30), seed: Number(b.seed) || 20260105, createdAt: now() };
  const age = ageAt(profile, gameDay);
  if (age < 6 || age > 7) return fail(res, `Skenario standar dimulai dari SD kelas 1 untuk usia 6–7 tahun (usia dari tanggal lahir: ${age}).`);
  const charId = 'CHR-' + crypto.randomBytes(4).toString('hex').toUpperCase();
  const edu = { seed: profile.seed, status: 'not-enrolled', stage: null, target: 'SD', grade: null, term: null, attempt: 0, program: null, institutionId: null, wallet: 0, bills: [], reports: [], history: [], passed: [], finalByStage: {}, highest: 'Tidak ada', lastDay: gameDay - 1, attendanceLog: [], mastery: {}, read: {}, tasks: [], exams: {}, studyLog: {} };
  const p = { visitor: v, charId, profile, edu, game: null };
  db.prepare('UPDATE players SET game=NULL, clock_abs=NULL, game_key=NULL WHERE visitor=?').run(v);
  FINANCE.reset(v);
  savePlayer(p); res.json(view(getPlayer(v)));
});
// Ubah biodata. Latar keluarga & seed dikunci (memengaruhi ekonomi & reprodusibilitas). Tanggal lahir tetap harus memberi usia 6–7 tahun di hari ke-1.
app.patch('/api/profile', (req, res) => {
  const p = need(req, res); if (!p) return; const b = req.body || {}, pr = { ...p.profile }, changed = [];
  const str = (k, max, min = 0) => { if (b[k] === undefined) return true; const v = String(b[k]).trim().slice(0, max); if (v.length < min) return false; if (v !== pr[k]) { pr[k] = v; changed.push(k); } return true; };
  if (!str('name', 40, 2)) return fail(res, 'Nama karakter minimal 2 huruf.');
  str('nickname', 20); str('birthPlace', 40); str('guardian', 40); str('aspiration', 40); str('province', 40);
  if (b.city !== undefined) { const c = String(b.city).trim().slice(0, 40); if (!c) return fail(res, 'Kota domisili wajib diisi.'); if (c !== pr.city) { pr.city = c; changed.push('city'); } }
  if (b.gender !== undefined) { const g = b.gender === 'P' ? 'P' : 'L'; if (g !== pr.gender) { pr.gender = g; changed.push('gender'); } }
  if (b.birthDate !== undefined && b.birthDate !== pr.birthDate) {
    const bd = String(b.birthDate); if (!/^\d{4}-\d{2}-\d{2}$/.test(bd) || isNaN(new Date(bd + 'T00:00:00Z'))) return fail(res, 'Tanggal lahir tidak valid.');
    const a0 = ageAt({ birthDate: bd }, 0); if (a0 < 6 || a0 > 7) return fail(res, `Tanggal lahir harus memberi usia 6–7 tahun di hari ke-1 (hasil: ${a0} tahun).`);
    pr.birthDate = bd; changed.push('birthDate');
  }
  if (!pr.nickname) pr.nickname = pr.name.split(' ')[0];
  pr.updatedAt = now(); p.profile = pr; savePlayer(p); res.json({ ...view(p), changed });
});
app.post('/api/edu/advance', (req, res) => { const p = need(req, res); if (!p) return; advanceTo(p, Number(req.body.gameDay) || 0); savePlayer(p); res.json(view(p)); });
app.get('/api/edu/quote/:id', (req, res) => {
  const p = need(req, res); if (!p) return; const i = inst(req.params.id); if (!i) return fail(res, 'Institusi tidak ditemukan.', 404);
  const gameDay = Number(req.query.gameDay) || 0;
  const enroll = feeQuote(p, i, 'enroll'), term = feeQuote(p, i, 'term');
  const terms = i.stage === 'PT' ? i.semesters : (STAGES[i.stage].grades[1] - STAGES[i.stage].grades[0] + 1) * 2;
  const fam = FAMILY[p.profile.family];
  res.json({ ok: true, institution: i, enroll, term, terms, totalStage: enroll.total + term.total * (terms - 1), guardianPerTerm: fam.perTerm, wallet: p.edu.wallet, eligibility: eligibility(p, i, gameDay), minFinal: MIN_FINAL[i.id] || null });
});
app.get('/api/edu/catalog', (req, res) => {
  const p = need(req, res); if (!p) return; const gameDay = Number(req.query.gameDay) || 0; advanceTo(p, gameDay);
  const fam = FAMILY[p.profile.family];
  const list = C.institutions.map(i => { const enroll = feeQuote(p, i, 'enroll'), term = feeQuote(p, i, 'term'); const terms = i.stage === 'PT' ? i.semesters : (STAGES[i.stage].grades[1] - STAGES[i.stage].grades[0] + 1) * 2;
    return { ...i, enrollTotal: enroll.total, termTotal: term.total, terms, totalStage: enroll.total + term.total * (terms - 1), coveredByGuardian: term.total <= fam.perTerm, eligibility: eligibility(p, i, gameDay), minFinal: MIN_FINAL[i.id] || null }; });
  res.json({ ok: true, institutions: list, guardianPerTerm: fam.perTerm, wallet: p.edu.wallet, rules: R });
});
const personalBalance = p => Math.max(0, Math.floor(p.game?.player?.balance ?? 0));
app.post('/api/edu/enroll', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, b = req.body || {}; const i = inst(b.institutionId); if (!i) return fail(res, 'Institusi tidak ditemukan.', 404);
  const gameDay = Number(b.gameDay) || 0; advanceTo(p, gameDay);
  const el = eligibility(p, i, gameDay); if (!el.ok) return fail(res, el.reasons.join('; '));
  if (!i.programs.includes(b.program)) return fail(res, 'Pilih jurusan/program studi yang tersedia.');
  if (!b.acknowledged) return fail(res, 'Konfirmasi rincian biaya dan syarat terlebih dahulu.');
  const q = feeQuote(p, i, 'enroll'); const fam = FAMILY[p.profile.family];
  const personal = Math.max(0, Math.round(Number(b.personalAmount) || 0));
  if (personal > personalBalance(p)) return fail(res, `Saldo pribadi tersimpan hanya Rp ${personalBalance(p).toLocaleString('id-ID')}.`);
  const fromWali = Math.min(q.total, e.wallet + fam.perTerm);
  if (fromWali + personal < q.total) return fail(res, `Dana belum cukup: butuh Rp ${q.total.toLocaleString('id-ID')}, tersedia Rp ${(fromWali + personal).toLocaleString('id-ID')}.`);
  Object.assign(e, { status: 'enrolled', stage: i.stage, grade: i.stage === 'PT' ? 1 : STAGES[i.stage].grades[0], term: 1, attempt: 0, program: b.program, institutionId: i.id, enrolledDay: gameDay, skipBillOnce: true });
  newTerm(p, gameDay + 1);
  const usedPersonal = Math.max(0, q.total - e.wallet); const usedWali = q.total - usedPersonal;
  e.wallet -= usedWali; ledger(p, gameDay, `Pendaftaran ${i.name} (dibayar dana wali)`, -usedWali, 'wali');
  if (usedPersonal) ledger(p, gameDay, `Pendaftaran ${i.name} (saldo pribadi)`, -usedPersonal, 'pribadi');
  e.bills.push({ id: rid('b'), termKey: termKey(e), label: `Pendaftaran & periode pertama — ${i.name}`, lines: q.lines, discounts: q.discounts, amount: q.total, paid: q.total, dueTermDay: 0, issuedDay: gameDay });
  e.history.push({ stage: i.stage, institution: i.name, program: b.program, from: gameDay, to: null, status: 'Terdaftar' });
  savePlayer(p); res.json({ ...view(p), charged: { wali: usedWali, personal: usedPersonal } });
});
app.post('/api/edu/pay', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, b = req.body || {}; const bill = e.bills.find(x => x.id === b.billId); if (!bill) return fail(res, 'Tagihan tidak ditemukan.', 404);
  const due = bill.amount - bill.paid; if (due <= 0) return fail(res, 'Tagihan sudah lunas.');
  if (b.source === 'wali') { const a = Math.min(due, e.wallet); if (a <= 0) return fail(res, 'Dana wali kosong.'); e.wallet -= a; bill.paid += a; ledger(p, e.lastDay, `Bayar ${bill.label} (dana wali)`, -a, 'wali'); }
  else { const a = Math.min(due, Math.round(Number(b.amount) || 0)); if (a <= 0) return fail(res, 'Jumlah pembayaran tidak valid.'); if (a > personalBalance(p)) return fail(res, `Saldo pribadi tersimpan hanya Rp ${personalBalance(p).toLocaleString('id-ID')}.`); bill.paid += a; ledger(p, e.lastDay, `Bayar ${bill.label} (saldo pribadi)`, -a, 'pribadi'); }
  savePlayer(p); res.json({ ...view(p), charged: { source: b.source, amount: bill.paid - (bill.amount - due) } });
});
app.post('/api/edu/read', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, b = req.body || {}; if (e.status !== 'enrolled') return fail(res, 'Belum terdaftar.');
  const s = subjectsNow(e).find(x => x.modules.some(m => m.id === b.moduleId)); if (!s) return fail(res, 'Materi tidak ada di kurikulum periode ini.');
  e.readStart ||= {};
  if (b.phase === 'start') { e.readStart[b.moduleId] = now(); savePlayer(p); return res.json({ ok: true, seconds: R.studySeconds }); }
  const t0 = e.readStart[b.moduleId]; if (!t0 || now() - t0 < R.studySeconds * 1000 - 300) return fail(res, `Baca materi minimal ${R.studySeconds} detik sebelum ditandai selesai.`);
  if (!e.read[b.moduleId]) { e.read[b.moduleId] = true; e.mastery[s.id] = Math.min(100, (e.mastery[s.id] || 0) + 4); }
  savePlayer(p); res.json(view(p));
});
app.post('/api/edu/study', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, b = req.body || {}; if (e.status !== 'enrolled') return fail(res, 'Belum terdaftar.');
  const s = subjectsNow(e).find(x => x.id === b.subject); if (!s) return fail(res, 'Mata pelajaran tidak ditemukan.');
  const h = Math.round(Number(b.hours) || 0); const used = e.studyLog[e.lastDay] || 0;
  if (h < 1) return fail(res, 'Minimal 1 jam.'); if (used + h > R.maxStudyHours) return fail(res, `Waktu belajar mandiri maksimal ${R.maxStudyHours} jam per hari (tersisa ${R.maxStudyHours - used} jam).`);
  e.studyLog[e.lastDay] = used + h; e.mastery[s.id] = Math.min(100, (e.mastery[s.id] || 0) + h * 1.6 * (0.75 + (p.profile.aptitude || 50) / 200));
  savePlayer(p); res.json(view(p));
});
function startSession(p, kind, ref, qs, seconds) {
  const id = rid('s'); db.prepare('INSERT INTO exam_sessions (id,visitor,char_id,kind,ref,seed,questions,started_at,expires_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id, p.visitor, p.charId, kind, ref, String(p.edu.seed), JSON.stringify(qs), now(), seconds ? now() + seconds * 1000 : 0);
  return id;
}
app.post('/api/edu/task/start', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, t = e.tasks.find(x => x.id === req.body.taskId); if (!t) return fail(res, 'Tugas tidak ditemukan.', 404);
  if (t.status !== 'open') return fail(res, 'Tugas sudah ditutup.');
  const qs = pickQuestions({ seed: e.seed, stage: e.stage, grade: e.grade, program: e.program, term: e.term, subject: t.subject, modules: [t.module], count: 3, salt: `task|${termKey(e)}|${t.id}` });
  const sid = startSession(p, 'task', t.id, qs, 0); res.json({ ok: true, sessionId: sid, questions: publicQ(qs), title: t.title });
});
app.post('/api/edu/exam/start', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, b = req.body || {}; if (e.status !== 'enrolled') return fail(res, 'Belum terdaftar.');
  advanceTo(p, Number(b.gameDay) || e.lastDay);
  const s = subjectsNow(e).find(x => x.id === b.subject); if (!s) return fail(res, 'Mata pelajaran tidak ditemukan.');
  const kind = b.kind, key = `${s.id}:${kind}`, td = e.termDay;
  const win = kind === 'mid' ? MID : kind === 'final' ? FIN : REMEDIAL;
  if (!['mid', 'final', 'remedial'].includes(kind)) return fail(res, 'Jenis ujian tidak dikenal.');
  if (td < win[0] || td > win[1]) return fail(res, `Ujian ini dibuka pada hari ke-${win[0]}–${win[1]} periode (sekarang hari ke-${td}).`);
  if (e.exams[key]?.status === 'selesai') return fail(res, 'Ujian ini sudah dikerjakan.');
  if (kind === 'remedial') { const g = subjectGrade(e, s); if (g.grade >= R.pass) return fail(res, 'Remedial hanya untuk nilai di bawah passing grade.'); }
  const bill = e.bills.find(x => x.termKey === termKey(e) && x.paid < x.amount);
  if (bill && td >= bill.dueTermDay) return fail(res, `Kartu ujian tertahan: ${bill.label} belum lunas (sisa Rp ${(bill.amount - bill.paid).toLocaleString('id-ID')}).`);
  // Soal hanya diambil dari materi kurikulum yang sudah diajarkan sampai hari ini (bukan materi kelas lain / materi yang belum diajarkan).
  const learned = taught(e, s.id).map(m => m.id);
  if (!learned.length) return fail(res, 'Belum ada materi yang diajarkan untuk diujikan.');
  if (e.exams[key]?.status === 'berlangsung' && e.exams[key].sessionId) {
    const prev = db.prepare('SELECT * FROM exam_sessions WHERE id=?').get(e.exams[key].sessionId);
    if (prev && !prev.submitted && now() < prev.expires_at) return res.json({ ok: true, resumed: true, sessionId: prev.id, subject: s.name, kind, questions: publicQ(JSON.parse(prev.questions)), seconds: Math.round((prev.expires_at - now()) / 1000), pointsPerQuestion: round(100 / 6, 2), passing: R.pass });
    if (prev && !prev.submitted) return fail(res, 'Waktu sesi ujian sebelumnya sudah habis. Jawaban kosong dinilai 0 — kirim sesi tersebut atau tunggu jendela ujian berakhir.');
  }
  const attempt = (e.exams[key]?.attempts || 0) + 1;
  const count = 6, seconds = R.examSeconds;
  const qs = pickQuestions({ seed: e.seed, stage: e.stage, grade: e.grade, program: e.program, term: e.term, subject: s.id, modules: learned, count, salt: `${kind}|${termKey(e)}|${s.id}|${attempt}` });
  if (qs.length < count) return fail(res, 'Bank soal untuk materi ini belum cukup.');
  const sid = startSession(p, 'exam', key, qs, seconds);
  e.exams[key] = { subject: s.id, kind, status: 'berlangsung', attempts: attempt, sessionId: sid }; savePlayer(p);
  res.json({ ok: true, sessionId: sid, subject: s.name, kind, questions: publicQ(qs), seconds, pointsPerQuestion: round(100 / count, 2), passing: R.pass, modules: learned, seedInfo: { seed: e.seed, salt: `${kind}|${termKey(e)}|${s.id}|${attempt}` } });
});
app.post('/api/edu/submit', (req, res) => {
  const p = need(req, res); if (!p) return; const e = p.edu, b = req.body || {};
  const sess = db.prepare('SELECT * FROM exam_sessions WHERE id=? AND visitor=?').get(b.sessionId, p.visitor); if (!sess) return fail(res, 'Sesi tidak ditemukan.', 404);
  if (sess.submitted) return fail(res, 'Jawaban sudah dikirim.');
  const qs = JSON.parse(sess.questions), ans = Array.isArray(b.answers) ? b.answers : [];
  const late = sess.expires_at && now() > sess.expires_at + 15_000;
  const review = qs.map((q, k) => ({ n: q.n, q: q.q, options: q.options, chosen: Number.isInteger(ans[k]) ? ans[k] : null, correct: q.correct, ok: !late && ans[k] === q.correct, explanation: q.explanation, module: q.module, difficulty: q.difficulty }));
  const correct = review.filter(r => r.ok).length, score = round(correct / qs.length * 100);
  db.prepare('UPDATE exam_sessions SET submitted=1 WHERE id=?').run(sess.id);
  let termK = termKey(e), subject = null;
  if (sess.kind === 'task') { const t = e.tasks.find(x => x.id === sess.ref); if (t && t.status === 'open') { t.status = 'selesai'; t.score = score; subject = t.subject; } }
  else { const ex = e.exams[sess.ref]; subject = ex?.subject; if (ex) { ex.status = 'selesai'; ex.score = score; ex.correct = correct; ex.total = qs.length; ex.late = !!late; } }
  const resultId = rid('x');
  db.prepare('INSERT INTO exam_results (id,visitor,char_id,kind,ref,term_key,subject,score,passed,correct,total,review,game_day,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run(resultId, p.visitor, p.charId, sess.kind === 'task' ? 'task' : sess.ref.split(':')[1], sess.ref, termK, subject, score, score >= R.pass ? 1 : 0, correct, qs.length, JSON.stringify(review), e.lastDay, now());
  savePlayer(p);
  res.json({ ...view(p), result: { id: resultId, score, correct, total: qs.length, passed: score >= R.pass, passing: R.pass, late: !!late, review } });
});
app.get('/api/edu/result/:id', (req, res) => { const r = db.prepare('SELECT * FROM exam_results WHERE id=? AND visitor=?').get(req.params.id, vid(req)); if (!r) return fail(res, 'Hasil tidak ditemukan.', 404); res.json({ ok: true, result: { ...r, review: JSON.parse(r.review) } }); });
// Untuk testing reproduksibilitas: seed + konteks yang sama selalu menghasilkan soal yang sama.
app.get('/api/edu/sample', (req, res) => {
  const q = req.query; const qs = pickQuestions({ seed: Number(q.seed) || 20260105, stage: q.stage || 'SD', grade: Number(q.grade) || 1, program: q.program || 'Umum', term: Number(q.term) || 1, subject: q.subject || 'math', modules: String(q.modules || 'math-m1').split(','), count: Number(q.count) || 6, salt: q.salt || 'sample' });
  res.json({ ok: true, ids: qs.map(x => x.id), questions: publicQ(qs) });
});

app.use(express.static(path.join(__dirname, '..', 'public'), { extensions: ['html'] }));
const PORT = Number(process.env.PORT) || 8000;
if (require.main === module) app.listen(PORT, '0.0.0.0', () => console.log('BizSim server on :' + PORT));
module.exports = app;
