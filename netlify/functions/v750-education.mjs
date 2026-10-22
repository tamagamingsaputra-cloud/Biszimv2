// BizSim 7.5.0 — Education, Exams & Academic Progression. SIMULASI: institusi, ijazah, dan nilai adalah fiktif dalam game.
// Waktu dibaca dari engine jam v7.4.0 (s.day + s.v740.clock.tod). Setiap perubahan penting disimpan di state server (s.v750.edu).
import { DAY_HOOKS } from './v700-engine.mjs';
import { STEP_HOOKS, CAL, weekdayOf, dateOf, ensure740, ctxOf, step as clockStep } from './v740.mjs';
import { rngFor } from './v655.mjs';
import * as D from './v750-edu-data.mjs';
import { buildQuestions, topicNames, poolSize, isGen, SETS } from './v750-edu-bank.mjs';
const { ACAD, LEVELS, INST, PROGRAMS, MAJORS, SCENARIOS, WEIGHTS, LEARN, ENTRANCE, SCHOLARSHIPS, semOf, semDay, semStart, inNoClass, letterOf, pointOf } = D;
export const VERSION = D.VERSION;
const R = Math.round, clamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v)), rp = n => 'Rp' + R(n || 0).toLocaleString('id-ID');
const shuffle = (r, a) => { const x = [...a]; for (let i = x.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [x[i], x[j]] = [x[j], x[i]]; } return x; };
const notice = (h, s, t, m, ty = 'info') => { try { h?.addNotice?.(s, t, m, ty); } catch { } };
const WD = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function ensure750(s) {
  if (!s.v750) s.v750 = { version: VERSION };
  const v = s.v750; v.version = VERSION;
  const e = v.edu ||= { scenario: 'adult', nid: 0, day: s.day || 1, name: '', enroll: null, history: [], invoices: [], tasks: [], exams: [], session: null, entrance: {}, entranceLog: {}, records: [], reports: [], reviews: {}, study: { week: -1, alloc: {}, used: {} }, log: [] };
  e.entrance ||= {}; e.entranceLog ||= {}; e.reviews ||= {}; e.study ||= { week: -1, alloc: {}, used: {} }; e.log ||= [];
  return v;
}
const logIt = (e, day, title, sub = '') => { e.nid++; e.log.unshift({ id: e.nid, day, title, sub }); if (e.log.length > 60) e.log.length = 60; };

/* ====================== helper umum ====================== */
const skillAvg = s => { const v = Object.values(s.skills || {}).map(Number).filter(Number.isFinite); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 20; };
export const focusOf = n => clamp(.45 * n.energy + .2 * (100 - n.stress) + .15 * n.mood + .1 * n.hunger + .1 * n.thirst) / 100;
const qualityF = en => .8 + .4 * INST[en.inst].q, abilityF = s => .85 + .3 * skillAvg(s) / 100, focusF = f => .4 + .6 * f;
const subsOf = en => D.subjectsFor(en.level, en);
const levelDone = e => { const sc = SCENARIOS[e.scenario] || SCENARIOS.adult, d = new Set(sc.done); for (const r of e.records) { if (r.held) continue; d.add(r.level === 'SMK' ? 'SMA' : r.level); } return d; };
const lastGpa = e => { const r = e.records.filter(x => !x.held).at(-1); return r ? r.gpa : (SCENARIOS[e.scenario] || SCENARIOS.adult).gpa; };
const overdue = (e, day) => e.invoices.filter(i => i.status === 'unpaid' && i.due < day);
const owedOf = e => e.invoices.filter(i => i.status === 'unpaid').reduce((a, i) => a + i.amount, 0);
const cumGpa = en => { const g = en.gp || []; const w = g.reduce((a, x) => a + x.w, 0); return w ? g.reduce((a, x) => a + x.gpa * x.w, 0) / w : 0; };
const statusText = en => { const L = LEVELS[en.level]; return L.k12 ? `${L.n} Kelas ${D.gradeOf(en.level, en)} · Semester ${((en.t - 1) % 2) + 1}` : `${PROGRAMS[en.program].n} · Semester ${en.t}`; };
const baseOf = (day) => semStart(day);

export function costOf(inst, program, track) {
  const lab = inst.lab || (program ? PROGRAMS[program].labYear : 0), mult = track === 'karyawan' ? 1 + inst.trackFee : 1, spp = R(inst.spp * mult / 1000) * 1000, perTerm = spp + inst.exam + inst.transport;
  return { enroll: inst.enroll, build: inst.build, grad: inst.grad, spp, exam: inst.exam, transport: inst.transport, books: inst.books, lab, atEnroll: inst.enroll + inst.build, annual: inst.enroll + inst.build + 2 * perTerm + inst.books + lab, term1: perTerm + inst.books + lab };
}
const incomeOf = s => s.career?.status === 'employed' ? Number(s.career.salary) || 0 : 0;
export const affordability = (s, cost) => { const cap = Math.max(0, s.cash || 0) + 6 * incomeOf(s); return R(100 * cap / (cap + cost.annual)); };

export function eligibility(s, e, inst, opts = {}) {
  const day = s.day, done = levelDone(e), reqs = [], L = LEVELS[inst.level];
  const prereq = { SMP: 'SD', SMA: 'SMP', SMK: 'SMP', UNIV: 'SMA' }[inst.level];
  if (prereq) reqs.push({ k: 'prev', label: `Lulus ${prereq === 'SMA' ? 'SMA/SMK' : prereq}`, ok: done.has(prereq), note: done.has(prereq) ? '' : `Belum lulus ${prereq === 'SMA' ? 'SMA/SMK' : prereq}.` });
  const already = inst.level === 'UNIV' ? (opts.program && e.records.some(r => r.program === opts.program)) : done.has(inst.level === 'SMK' ? 'SMA' : inst.level);
  reqs.push({ k: 'notyet', label: 'Belum menyelesaikan jenjang ini', ok: !already, note: already ? 'Jenjang/program ini sudah diselesaikan.' : '' });
  if (inst.minGPA) reqs.push({ k: 'gpa', label: `GPA minimal ${String(inst.minGPA).replace('.', ',')}`, ok: lastGpa(e) >= inst.minGPA, note: `GPA terakhir ${String(lastGpa(e).toFixed(2)).replace('.', ',')}.` });
  reqs.push({ k: 'arrears', label: 'Tidak ada tunggakan jatuh tempo', ok: overdue(e, day).length === 0, note: overdue(e, day).length ? `Tunggakan ${rp(overdue(e, day).reduce((a, i) => a + i.amount, 0))}.` : '' });
  reqs.push({ k: 'free', label: 'Tidak sedang bersekolah', ok: !e.enroll, note: e.enroll ? `Masih aktif di ${INST[e.enroll.inst].n}.` : '' });
  const base = reqs.every(r => r.ok);
  if (inst.entrance) { const t = e.entrance[inst.id], okT = Boolean(t && t.until >= day); reqs.push({ k: 'entrance', label: `Tes masuk (nilai ≥ ${ENTRANCE.pass})`, ok: okT, entrance: true, note: okT ? `Lulus (${t.score}), berlaku sampai hari ke-${t.until}.` : 'Belum lulus tes masuk atau masa berlaku habis.' }); }
  const win = semDay(day) <= ACAD.enrollWindow; reqs.push({ k: 'window', label: 'Masa pendaftaran dibuka', ok: win, note: win ? `Ditutup hari ke-${semStart(day) + ACAD.enrollWindow}.` : `Dibuka kembali hari ke-${(semOf(day) + 1) * ACAD.semDays + 1}.` });
  const cost = costOf(inst, opts.program, opts.track); reqs.push({ k: 'funds', label: `Dana untuk biaya pendaftaran ${rp(cost.atEnroll)}`, ok: (s.cash || 0) >= cost.atEnroll, note: `Saldo ${rp(s.cash || 0)}.` });
  return { ok: reqs.every(r => r.ok), canTakeEntrance: base && inst.entrance, reqs, cost };
}

/* ====================== jadwal & tagihan ====================== */
function buildTT(en, subs) {
  const L = LEVELS[en.level], slots = en.level === 'UNIV' && en.track === 'karyawan' ? L.slotsKaryawan : L.slots, r = rngFor(`tt:${en.id}:${en.t}`), cells = [];
  for (let wd = 1; wd <= 5; wd++) for (const h of slots) cells.push([wd, h]);
  const sh = shuffle(r, cells), out = { 1: {}, 2: {}, 3: {}, 4: {}, 5: {} }, per = {};
  for (const pass of [0, 1]) for (const sj of subs) {
    let need = sj.pr - Object.values(out).reduce((a, d) => a + Object.values(d).filter(x => x === sj.id).length, 0);
    for (const [wd, h] of sh) { if (need <= 0) break; if (out[wd][h]) continue; const k = wd + ':' + sj.id; if (pass === 0 && (per[k] || 0) >= 2) continue; out[wd][h] = sj.id; per[k] = (per[k] || 0) + 1; need--; }
  }
  return { slots, cells: out };
}
function makeInvoice(e, en, day) {
  const inst = INST[en.inst], c = costOf(inst, en.program, en.track), lines = [], sppLine = c.spp;
  lines.push({ n: `SPP semester ${en.t}`, amt: sppLine });
  if (en.t % 2 === 1) { if (c.books) lines.push({ n: 'Buku & perlengkapan (per tahun ajaran)', amt: c.books }); if (c.lab) lines.push({ n: 'Biaya lab/praktikum (per tahun ajaran)', amt: c.lab }); }
  if (c.exam) lines.push({ n: 'Biaya ujian', amt: c.exam }); if (c.transport) lines.push({ n: 'Transportasi (estimasi semester)', amt: c.transport });
  let pct = 0, sch = '';
  const prest = en.lastGpa != null ? SCHOLARSHIPS.find(x => en.lastGpa >= x.minGPA) : null; if (prest) { pct = prest.pct; sch = prest.n; }
  if (inst.scholarEntrance && en.entScore >= inst.scholarEntrance && en.t <= 2 && .25 > pct) { pct = .25; sch = 'Beasiswa Masuk'; }
  if (pct) lines.push({ n: `${sch} (−${R(pct * 100)}% SPP)`, amt: -R(sppLine * pct / 1000) * 1000 });
  const amount = lines.reduce((a, l) => a + l.amt, 0);
  e.nid++; const inv = { id: `i${e.nid}`, enr: en.id, inst: inst.id, term: en.t, title: `Tagihan Semester ${en.t} · ${inst.n}`, lines, amount, due: day + ACAD.invoiceDueDays, issued: day, status: 'unpaid', late: false, paidDay: null };
  e.invoices.unshift(inv); if (e.invoices.length > 40) e.invoices.length = 40; return inv;
}
function openTerm(s, e, en, day, h) {
  en.open = true; en.pendingOpen = false; en.base = baseOf(day); const subs = subsOf(en); en.sub = {};
  for (const sj of subs) en.sub[sj.id] = { prog: 0, sched: 0, att: 0, tasks: [], mid: null, fin: null, rem: null, score: null };
  en.tt = buildTT(en, subs);
  e.tasks = e.tasks.filter(t => t.enr === en.id && t.term >= en.t - 1).slice(0, 80);
  for (const sj of subs) for (const [kind, win] of [['mid', ACAD.midterm], ['fin', ACAD.final]]) { e.nid++; e.exams.push({ id: `x${e.nid}`, enr: en.id, term: en.t, subj: sj.id, kind, win: [en.base + win[0], en.base + win[1]], done: false, score: null, missed: false }); }
  e.exams = e.exams.filter(x => x.enr === en.id && x.term >= en.t - 1).slice(-120);
  const inv = makeInvoice(e, en, day);
  const cap = LEVELS[en.level].selfCap, base = Math.floor(cap / subs.length), alloc = {}; subs.forEach((sj, i) => { alloc[sj.id] = base + (i < cap - base * subs.length ? 1 : 0); }); e.study.alloc = alloc; e.study.used = {};
  logIt(e, day, `Semester ${en.t} dimulai · ${statusText(en)}`, `Tagihan ${rp(inv.amount)} jatuh tempo hari ke-${inv.due}.`);
  notice(h, s, 'Semester dimulai', `${INST[en.inst].n}: tagihan ${rp(inv.amount)} jatuh tempo hari ke-${inv.due}.`, 'info');
}

/* ====================== penilaian ====================== */
export function subjScore(en, id, withRem = true) {
  const sb = en.sub[id], kkm = LEVELS[en.level].kkm, parts = [];
  if (sb.tasks.length) parts.push([WEIGHTS.tugas, sb.tasks.reduce((a, b) => a + b, 0) / sb.tasks.length]);
  if (sb.mid != null) parts.push([WEIGHTS.uts, sb.mid]); if (sb.fin != null) parts.push([WEIGHTS.uas, sb.fin]);
  if (sb.sched > 0) parts.push([WEIGHTS.hadir, sb.att / sb.sched * 100]);
  const w = parts.reduce((a, p) => a + p[0], 0); let sc = w ? parts.reduce((a, p) => a + p[0] * p[1], 0) / w : 0;
  if (withRem && sb.rem != null && sb.rem >= kkm && sc < kkm) sc = kkm;
  return Math.round(sc * 10) / 10;
}
function applyCareer(s, rec) {
  s.career = s.career || {}; const lv = D.CAREER_LEVEL[rec.deg || rec.level], cur = D.CAREER_ORDER.indexOf(s.career.educationLevel);
  if (lv && D.CAREER_ORDER.indexOf(lv) > cur) s.career.educationLevel = lv;
  if (rec.cert) { s.career.certifications = s.career.certifications || []; if (!s.career.certifications.includes(rec.cert)) s.career.certifications.push(rec.cert); }
}
function releaseHeld(s, e, day, h) {
  if (e.invoices.some(i => i.status === 'unpaid')) return;
  for (const r of e.records) if (r.held) { r.held = false; r.status = 'Lulus'; applyCareer(s, r); logIt(e, day, `Ijazah dirilis: ${r.id}`, 'Tunggakan lunas.'); notice(h, s, 'Ijazah dirilis', `${r.id} (${r.title}) telah dirilis.`, 'success'); }
}
function closeTerm(s, e, en, day, h) {
  const L = LEVELS[en.level], kkm = L.kkm, subs = subsOf(en), rows = []; let tw = 0, tp = 0, sA = 0, sS = 0;
  for (const sj of subs) { const sb = en.sub[sj.id], sc = subjScore(en, sj.id), pt = pointOf(sc); sb.score = sc; tw += sj.pr; tp += pt * sj.pr; sA += sb.att; sS += sb.sched;
    rows.push({ id: sj.id, n: sj.n, w: sj.pr, score: sc, letter: letterOf(sc), pt, failed: sc < kkm, att: sb.sched ? R(sb.att / sb.sched * 100) : null, tugas: sb.tasks.length ? R(sb.tasks.reduce((a, b) => a + b, 0) / sb.tasks.length) : null, uts: sb.mid, uas: sb.fin, rem: sb.rem }); }
  const gpa = tw ? tp / tw : 0, att = sS ? sA / sS : 1, avg = rows.length ? rows.reduce((a, r) => a + r.score, 0) / rows.length : 0;
  en.gp = (en.gp ||= []); en.gp.push({ gpa, w: tw, avg }); en.reps = (en.reps ||= []);
  const rep = { id: `r${++e.nid}`, enr: en.id, term: en.t, label: statusText(en), inst: INST[en.inst].n, level: en.level, rows, gpa: R(gpa * 100) / 100, avg: R(avg * 10) / 10, attendance: R(att * 100), kkm, failed: rows.filter(r => r.failed).map(r => r.n), day, decision: '', outcome: '', reason: '', attS: sS, attA: sA };
  let outcome = 'promote', reason = '';
  const yearEnd = !L.k12 || en.t % 2 === 0, last = en.t >= D.totalTerms(en.level, en);
  if (L.k12 && !yearEnd) { outcome = 'continue'; reason = 'Lanjut ke semester 2. Kenaikan kelas ditentukan di akhir tahun ajaran.'; if (att < ACAD.attendanceMin) reason += ` Peringatan: kehadiran ${R(att * 100)}% di bawah ${ACAD.attendanceMin * 100}%.`; }
  else {
    let yAtt = att, yFailed = rep.failed, prev = null;
    if (L.k12) { prev = en.reps.at(-1); if (prev && prev.term === en.t - 1) { yAtt = (prev.attA + sA) / Math.max(1, prev.attS + sS); yFailed = rows.filter(r => { const pr = prev.rows.find(x => x.id === r.id); return ((pr ? pr.score : r.score) + r.score) / 2 < kkm; }).map(r => r.n); } }
    rep.yAtt = R(yAtt * 100); rep.yFailed = yFailed;
    if (yAtt < ACAD.attendanceMin) { outcome = 'repeat'; reason = `Kehadiran ${R(yAtt * 100)}% di bawah syarat ${ACAD.attendanceMin * 100}%.`; }
    else if (yFailed.length >= ACAD.repeatIfFailed) { outcome = 'repeat'; reason = `${yFailed.length} mata pelajaran di bawah KKM ${kkm} setelah remedial (batas ${ACAD.repeatIfFailed - 1}).`; }
    else if (last && !L.k12 && cumGpa(en) < 2) { outcome = 'repeat'; reason = `IPK ${cumGpa(en).toFixed(2)} di bawah syarat kelulusan 2,00.`; }
    else if (last || (L.k12 && D.gradeOf(en.level, en) >= L.first + L.years - 1)) { outcome = 'graduate'; reason = yFailed.length ? `Lulus dengan ${yFailed.length} mapel di bawah KKM (maks. ${ACAD.repeatIfFailed - 1}).` : 'Semua syarat terpenuhi.'; }
    else { outcome = 'promote'; reason = yFailed.length ? `Naik kelas dengan catatan: ${yFailed.join(', ')} di bawah KKM.` : 'Semua syarat terpenuhi.'; }
  }
  if (!L.k12 && outcome === 'promote') reason = rep.failed.length ? `Lanjut semester berikutnya (catatan: ${rep.failed.join(', ')} di bawah KKM).` : 'Semua syarat terpenuhi.';
  rep.outcome = outcome; rep.reason = reason; rep.decision = { continue: 'Lanjut semester', promote: L.k12 ? 'Naik kelas' : 'Lanjut semester', repeat: L.k12 ? 'Mengulang kelas' : 'Mengulang semester', graduate: 'Lulus jenjang' }[outcome];
  e.reports.unshift(rep); if (e.reports.length > 30) e.reports.length = 30; en.reps.push(rep); en.open = false; en.lastGpa = gpa;
  e.tasks = e.tasks.filter(t => !(t.enr === en.id && t.status === 'open'));
  if (outcome === 'graduate') {
    const m = en.level === 'SMK' ? MAJORS[en.major] : null, year = dateOf(day).year, allAvg = en.gp.reduce((a, x) => a + x.avg * x.w, 0) / en.gp.reduce((a, x) => a + x.w, 0), id = `BZS-${en.level === 'UNIV' ? en.program : en.level}-${String(e.rid = (e.rid || 0) + 1).padStart(4, '0')}`;
    const rec = { id, name: e.name || 'Pemain', inst: INST[en.inst].n, level: en.level, deg: en.level === 'UNIV' ? PROGRAMS[en.program].deg : null, program: en.program || null, major: en.major || null, title: en.level === 'UNIV' ? PROGRAMS[en.program].n : en.level === 'SMK' ? `SMK · ${m.n}` : `${LEVELS[en.level].full}`, year, day, avg: R(allAvg * 10) / 10, gpa: R(cumGpa(en) * 100) / 100, status: 'Lulus', held: false, cert: m ? m.cert : null, note: 'Dokumen fiktif di dalam game; bukan dokumen resmi.' };
    const gi = INST[en.inst].grad; if (gi > 0) { e.nid++; e.invoices.unshift({ id: `i${e.nid}`, enr: en.id, inst: en.inst, term: 0, title: `Biaya ijazah & wisuda · ${INST[en.inst].n}`, lines: [{ n: 'Biaya ijazah & wisuda', amt: gi }], amount: gi, due: day + ACAD.invoiceDueDays, issued: day, status: 'unpaid', late: false, paidDay: null }); }
    if (e.invoices.some(i => i.status === 'unpaid')) { rec.held = true; rec.status = 'Ditahan (menunggu pelunasan)'; } else applyCareer(s, rec);
    e.records.unshift(rec); e.history.unshift({ enr: en.id, inst: INST[en.inst].n, level: en.level, status: 'Lulus', day }); en.status = 'graduated'; e.enroll = null;
    logIt(e, day, `Lulus ${rec.title}`, `${rec.id} · IPK ${rec.gpa}`); notice(h, s, 'Lulus jenjang', `Selamat! ${rec.title} (${rec.id})${rec.held ? ' — ijazah ditahan sampai tunggakan lunas.' : '.'}`, 'success');
  } else {
    if (outcome === 'promote' || outcome === 'continue') en.t++; else if (outcome === 'repeat') { if (L.k12) en.t = en.t - (en.t % 2 === 0 ? 1 : 0); en.gp = en.gp.slice(0, Math.max(0, en.gp.length - (L.k12 ? 2 : 1))); }
    en.pendingOpen = true; logIt(e, day, `Rapor: ${rep.decision}`, `${rep.label} · GPA ${rep.gpa} · kehadiran ${rep.attendance}%. ${reason}`);
    notice(h, s, 'Rapor dibagikan', `${rep.decision}. GPA ${rep.gpa}, kehadiran ${rep.attendance}%.`, outcome === 'repeat' ? 'warning' : 'success');
  }
}

/* ====================== waktu: hook langkah jam & hook hari ====================== */
function slotsAt(en, wd, tod, ch) {
  const out = []; if (!en.tt || wd < 1 || wd > 5) return out;
  for (const h of en.tt.slots) { const o = Math.min(tod + ch, (h + 1) * 3600) - Math.max(tod, h * 3600); if (o > 0 && en.tt.cells[wd][h]) out.push([en.tt.cells[wd][h], o]); }
  return out;
}
const studyWindow = (wd, tod) => wd >= 1 && wd <= 5 ? (tod >= 16 * 3600 && tod < 21 * 3600) : ((tod >= 9 * 3600 && tod < 12 * 3600) || (tod >= 16 * 3600 && tod < 21 * 3600));
function stepHook(s, e, x, ch, c, r, n) {
  const en = e.enroll; if (!en || !en.open || e.lock) return;
  const day = x.day, tod = x.clock.tod, wd = weekdayOf(day), sd = semDay(day), week = Math.floor((day - 1) / 7);
  if (e.study.week !== week) { e.study.week = week; e.study.used = {}; }
  const f = focusOf(n), mult = qualityF(en) * focusF(f) * abilityF(s); let classSecs = 0, presentSecs = 0;
  if (!inNoClass(sd)) for (const [sid, o] of slotsAt(en, wd, tod, ch)) { const sb = en.sub[sid]; if (!sb) continue; sb.sched += o; classSecs += o; if (!c.act && !c.sched) { sb.att += o; presentSecs += o; sb.prog = Math.min(100, sb.prog + o / 3600 * LEARN.cls * mult); } }
  if (presentSecs) { r.energy -= 1.0 * presentSecs / ch; r.stress += .6 * presentSecs / ch; }
  if (!classSecs && !c.act && !c.sched && n.energy >= 25 && n.hunger >= 20 && n.thirst >= 20 && studyWindow(wd, tod)) {
    const sid = Object.keys(e.study.alloc).find(k => (e.study.alloc[k] || 0) * 3600 - (e.study.used[k] || 0) > 0 && en.sub[k]);
    if (sid) { const spend = Math.min(ch, e.study.alloc[sid] * 3600 - (e.study.used[sid] || 0)); e.study.used[sid] = (e.study.used[sid] || 0) + spend; en.sub[sid].prog = Math.min(100, en.sub[sid].prog + spend / 3600 * LEARN.self * mult); r.energy -= .8 * spend / ch; r.stress += .6 * spend / ch; }
  }
}
STEP_HOOKS.push((s, x, ch, c, r, n) => { const e = s.v750?.edu; if (e && e.enroll) stepHook(s, e, x, ch, c, r, n); });

function dayStart(s, e, day, userId, h) {
  for (const inv of e.invoices) if (inv.status === 'unpaid' && day > inv.due && !inv.late) { const pct = INST[inv.inst]?.late ?? .02, fee = Math.max(25000, R(inv.amount * pct / 1000) * 1000); inv.late = true; inv.lines.push({ n: 'Denda keterlambatan', amt: fee }); inv.amount += fee; logIt(e, day, `Denda keterlambatan ${rp(fee)}`, inv.title); notice(h, s, 'Tagihan terlambat', `${inv.title}: denda ${rp(fee)}. Total ${rp(inv.amount)}.`, 'warning'); }
  const en = e.enroll; if (!en || en.status !== 'active') return;
  const sd = semDay(day);
  if (en.pendingOpen && sd === 0) { openTerm(s, e, en, day, h); return; }
  if (!en.open) return;
  const base = en.base;
  for (const t of e.tasks) if (t.enr === en.id && t.status === 'open' && day > t.due) { t.status = 'missed'; t.score = 0; en.sub[t.subj]?.tasks.push(0); logIt(e, day, `Tugas tidak dikumpulkan: ${t.title}`, 'Nilai 0'); }
  for (const ex of e.exams) if (ex.enr === en.id && !ex.done && day > ex.win[1]) { ex.done = true; ex.missed = true; ex.score = 0; const sb = en.sub[ex.subj]; if (sb) { if (ex.kind === 'mid') sb.mid = 0; else if (ex.kind === 'fin') sb.fin = 0; else sb.rem = 0; } logIt(e, day, 'Tidak mengikuti ujian', `${subsOf(en).find(q => q.id === ex.subj)?.n || ex.subj} (${ex.kind === 'mid' ? 'UTS' : ex.kind === 'fin' ? 'UAS' : 'Remedial'}): nilai 0`); }
  if (day === base + ACAD.remedial[0]) for (const sj of subsOf(en)) if (subjScore(en, sj.id, false) < LEVELS[en.level].kkm) { e.nid++; e.exams.push({ id: `x${e.nid}`, enr: en.id, term: en.t, subj: sj.id, kind: 'rem', win: [base + ACAD.remedial[0], base + ACAD.remedial[1]], done: false, score: null, missed: false }); notice(h, s, 'Remedial dibuka', `${sj.n}: nilai di bawah KKM. Remedial hari ke-${base + ACAD.remedial[0]}–${base + ACAD.remedial[1]}.`, 'warning'); }
  if (day === base + ACAD.midterm[0]) notice(h, s, 'Pekan UTS', `Ujian tengah semester hari ke-${base + ACAD.midterm[0]}–${base + ACAD.midterm[1]}.`, 'info');
  if (day === base + ACAD.final[0]) notice(h, s, 'Pekan UAS', `Ujian akhir semester hari ke-${base + ACAD.final[0]}–${base + ACAD.final[1]}.`, 'info');
  if (sd >= ACAD.taskFrom && sd <= ACAD.taskUntil && !inNoClass(sd)) { const subs = subsOf(en); subs.forEach((sj, i) => { if ((sd - ACAD.taskFrom - i * 2) % ACAD.taskEvery === 0 && sd - ACAD.taskFrom - i * 2 >= 0) { const T = topicNames(sj.set), idx = Math.min(T.length - 1, Math.floor(en.sub[sj.id].prog * T.length / 100)); e.nid++; e.tasks.push({ id: `t${e.nid}`, enr: en.id, term: en.t, subj: sj.id, title: `Tugas ${sj.n}: ${T[idx]}`, issued: day, due: day + ACAD.taskDue, status: 'open', score: null }); } }); }
  if (sd === ACAD.closeDay) closeTerm(s, e, en, day, h);
}
DAY_HOOKS.push((s, v, d, userId, h) => { const e = ensure750(s).edu; let g = 0; while (e.day < d && g++ < 400) { e.day++; try { dayStart(s, e, e.day, userId, h); } catch (err) { logIt(e, e.day, 'Kesalahan sistem pendidikan', String(err.message || err)); } } });

/* ====================== ujian ====================== */
const entranceParts = inst => ({ SMP: ['math_sd', 'ind_sd'], SMA: ['math_smp', 'ind_smp'], SMK: ['math_smp', 'ind_smp'], UNIV: ['math_sma', 'ind_sma'] })[inst.level] || ['math_sd', 'ind_sd'];
function partsFor(en, ex, inst) {
  if (ex.kind === 'entrance') return entranceParts(inst).map(set => ({ set, topics: SETS[set].topics.map((_, i) => i), diff: 2, n: 6 }));
  const sj = subsOf(en).find(q => q.id === ex.subj), T = topicNames(sj.set).length, topics = ex.kind === 'mid' ? Array.from({ length: Math.ceil(T / 2) }, (_, i) => i) : Array.from({ length: T }, (_, i) => i), cap = LEVELS[en.level].examQ;
  return [{ set: sj.set, topics, diff: D.diffOf(en.level, en, sj.off || 0), n: Math.min(cap, poolSize(sj.set, topics)) }];
}
const sessionQs = ses => ses.parts.flatMap((p, pi) => buildQuestions({ ...p, seed: `${ses.seed}:${pi}` }).map(q => ({ ...q, set: p.set })));
function elimOf(ses, i, q) {
  const m = ses.mastery?.[i] ?? 0; let k = m >= .8 ? 2 : m >= .4 ? 1 : 0; if (ses.focus < .4) k = Math.max(0, k - 1);
  if (!k) return []; const wrong = q.o.map((_, j) => j).filter(j => j !== q.k); return shuffle(rngFor(`${ses.seed}:el${i}`), wrong).slice(0, k).sort((a, b) => a - b);
}
function examGate(s, e, x, ex, en) {
  const day = s.day, tod = x.clock.tod; if (e.session) return 'Selesaikan ujian yang sedang berjalan terlebih dahulu.';
  if (day < ex.win[0]) return `Jendela ujian dibuka hari ke-${ex.win[0]}.`; if (day > ex.win[1]) return 'Jendela ujian sudah ditutup.';
  if (ex.kind !== 'mid' && overdue(e, day).length) return `Kartu ujian ditahan: lunasi tunggakan ${rp(overdue(e, day).reduce((a, i) => a + i.amount, 0))} terlebih dahulu.`;
  const c = ctxOf(s, x, x.day, tod); if (c.act) return c.sleeping ? 'Sedang tidur. Bangun dulu.' : `Sedang ${String(c.act.label).toLowerCase()}.`; if (c.sched) return 'Bentrok dengan jam kerja. Ujian bisa diambil setelah pukul 17:00 atau di akhir pekan.';
  const parts = partsFor(en, ex, null), n = parts.reduce((a, p) => a + p.n, 0), dur = n * ACAD.sitMinutesPerQuestion * 60;
  if (tod < ACAD.examHours[0] * 3600) return `Ujian dimulai pukul ${String(ACAD.examHours[0]).padStart(2, '0')}:00.`;
  if (tod + dur > ACAD.examHours[1] * 3600) return `Waktu tersisa tidak cukup (butuh ±${n * ACAD.sitMinutesPerQuestion} menit sebelum ${ACAD.examHours[1]}:00). Coba besok pagi.`;
  return null;
}
function startSession(s, e, x, kind, ex, en, inst, userId, now) {
  const parts = partsFor(en, ex, inst), n = parts.reduce((a, p) => a + p.n, 0), attempt = (ex.attempts = (ex.attempts || 0) + 1);
  const seed = `${userId}:${en ? en.id : 'ent'}:${ex.id}:${attempt}`, ses = { kind, examId: ex.id, instId: inst?.id || null, seed, parts, n, startedAt: now, limitSec: n * ACAD.secPerQuestion, answers: Array(n).fill(-1), focus: focusOf(x.needs), prevPaused: Boolean(x.clock.paused), startDay: s.day };
  if (kind !== 'entrance') { const sj = subsOf(en).find(q => q.id === ex.subj), T = topicNames(sj.set).length, prog = en.sub[sj.id].prog; ses.prog = prog; ses.mastery = sessionQs({ ...ses, mastery: [] }).map(q => clamp(prog * T / 100 - q.t, 0, 1)); }
  e.session = ses; x.clock.paused = true; return ses;
}
function sessionPublic(s, e, now) {
  const ses = e.session; if (!ses) return null; const qs = sessionQs(ses), rem = Math.max(0, ses.limitSec - Math.floor((now - ses.startedAt) / 1000));
  const en = e.enroll, ex = ses.kind === 'entrance' ? { kind: 'entrance' } : e.exams.find(q => q.id === ses.examId), sj = en && ex.subj ? subsOf(en).find(q => q.id === ex.subj) : null;
  return { kind: ses.kind, examId: ses.examId, title: ses.kind === 'entrance' ? `Tes Masuk · ${INST[ses.instId].n}` : `${ex.kind === 'mid' ? 'UTS' : ex.kind === 'fin' ? 'UAS' : 'Remedial'}: ${sj.n}`, n: ses.n, answered: ses.answers.filter(a => a >= 0).length, answers: ses.answers, remainingSec: rem, limitSec: ses.limitSec, kkm: ses.kind === 'entrance' ? ENTRANCE.pass : LEVELS[en.level].kkm,
    focus: R(ses.focus * 100), readiness: ses.kind === 'entrance' ? null : R(ses.prog || 0), questions: qs.map((q, i) => ({ i, q: q.q, o: q.o, topic: q.topic, elim: ses.kind === 'entrance' ? [] : elimOf(ses, i, q) })),
    debug: { seed: ses.seed, bank: ses.parts.map(p => p.set).join('+'), difficulty: ['', 'Mudah', 'Sedang', 'Sulit'][ses.parts[0].diff], materiSync: ses.kind === 'entrance' ? '-' : `${sj ? topicNames(sj.set)[Math.min(topicNames(sj.set).length - 1, Math.floor((ses.prog || 0) * topicNames(sj.set).length / 100))] : ''} (${R(ses.prog || 0)}%)` } };
}
function finishSession(s, e, x, h, why) {
  const ses = e.session, qs = sessionQs(ses), day = s.day; let correct = 0; const review = qs.map((q, i) => { const ch = ses.answers[i], ok = ch === q.k; if (ok) correct++; return { q: q.q, o: q.o, chosen: ch, key: q.k, ok, e: q.e, topic: q.topic }; });
  const score = R(correct / ses.n * 1000) / 10; e.session = null;
  e.lock = true; try { clockStep(s, x, ses.n * ACAD.sitMinutesPerQuestion * 60, h); } finally { e.lock = false; }
  x.clock.paused = ses.prevPaused;
  if (ses.kind === 'entrance') { const inst = INST[ses.instId], pass = score >= ENTRANCE.pass; e.entranceLog[inst.id] = { day, score, pass }; if (pass) e.entrance[inst.id] = { score, until: day + ENTRANCE.validDays }; e.reviews[ses.examId] = { title: `Tes Masuk ${inst.n}`, score, pass, correct, n: ses.n, review, day };
    logIt(e, day, `Tes masuk ${inst.n}: ${score}`, pass ? 'Lulus' : `Belum lulus (minimal ${ENTRANCE.pass}). Coba lagi setelah ${ENTRANCE.retryDays} hari.`); notice(h, s, 'Hasil tes masuk', `${inst.n}: nilai ${score}. ${pass ? 'Lulus.' : 'Belum lulus.'}`, pass ? 'success' : 'warning'); return { score, pass, correct, n: ses.n, review }; }
  const en = e.enroll, ex = e.exams.find(q => q.id === ses.examId), sb = en.sub[ex.subj], kkm = LEVELS[en.level].kkm; ex.done = true; ex.score = score; ex.correct = correct; ex.n = ses.n;
  if (ex.kind === 'mid') sb.mid = score; else if (ex.kind === 'fin') sb.fin = score; else sb.rem = score;
  const sj = subsOf(en).find(q => q.id === ex.subj); e.reviews[ex.id] = { title: `${ex.kind === 'mid' ? 'UTS' : ex.kind === 'fin' ? 'UAS' : 'Remedial'} ${sj.n}`, score, pass: score >= kkm, correct, n: ses.n, review, day };
  const keys = Object.keys(e.reviews); if (keys.length > 12) delete e.reviews[keys[0]];
  sb.prog = Math.min(100, sb.prog + .8);
  logIt(e, day, `${e.reviews[ex.id].title}: ${score}`, `${correct}/${ses.n} benar · ${score >= kkm ? 'Lulus KKM' : 'Di bawah KKM ' + kkm}${why === 'timeout' ? ' · waktu habis' : ''}`);
  notice(h, s, 'Hasil ujian', `${e.reviews[ex.id].title}: ${score} (${correct}/${ses.n}).`, score >= kkm ? 'success' : 'warning');
  return { score, pass: score >= kkm, correct, n: ses.n, review };
}
const nowOf = h => (typeof h?.now === 'function' ? h.now() : Date.now());
function expireSession(s, e, x, h) { const ses = e.session; if (ses && nowOf(h) - ses.startedAt > ses.limitSec * 1000) return finishSession(s, e, x, h, 'timeout'); return null; }

/* ====================== tampilan terhitung (view) ====================== */
function topicsOf(en, sj) { const T = topicNames(sj.set), prog = en.sub[sj.id].prog; return T.map((n, i) => { const lo = i * 100 / T.length, hi = (i + 1) * 100 / T.length; return { n, state: prog >= hi ? 'done' : prog > lo ? 'doing' : 'pending' }; }); }
export function view(s, e, x, h) {
  const day = s.day, tod = x.clock.tod, sd = semDay(day), wd = weekdayOf(day), en = e.enroll, now = nowOf(h), done = levelDone(e), cash = s.cash || 0;
  const phase = !en ? (sd <= ACAD.enrollWindow ? 'Masa pendaftaran' : 'Di luar masa pendaftaran') : sd >= ACAD.midterm[0] && sd <= ACAD.midterm[1] ? 'Pekan UTS' : sd >= ACAD.final[0] && sd <= ACAD.final[1] ? 'Pekan UAS' : sd >= ACAD.remedial[0] && sd <= ACAD.remedial[1] ? 'Remedial' : sd === ACAD.closeDay ? 'Pembagian rapor' : 'Masa perkuliahan';
  const v = { version: VERSION, now: { day, tod: R(tod), wd, wdName: WD[wd], sd, semester: semOf(day) + 1, phase, nextEnroll: sd <= ACAD.enrollWindow ? semStart(day) + ACAD.enrollWindow : (semOf(day) + 1) * ACAD.semDays + 1 }, scenario: { id: e.scenario, ...SCENARIOS[e.scenario], locked: Boolean(e.enroll || e.history.length || e.records.length) }, rules: { weights: WEIGHTS, attendanceMin: ACAD.attendanceMin, repeatIfFailed: ACAD.repeatIfFailed, windows: ACAD, learn: LEARN }, cash };
  const path = [{ k: 'SD', n: 'SD' }, { k: 'SMP', n: 'SMP' }, { k: 'SMA', n: 'SMA' }, { k: 'SMK', n: 'SMK' }, { k: 'UNIV', n: 'University' }];
  v.path = path.map(p => ({ ...p, state: en && en.level === p.k ? 'current' : (p.k === 'UNIV' ? e.records.some(r => r.level === 'UNIV' && !r.held) : (p.k === 'SMA' || p.k === 'SMK') ? e.records.some(r => r.level === p.k && !r.held) || (p.k === 'SMA' && done.has('SMA') && !e.records.some(r => r.level === 'SMK' && !r.held)) : done.has(p.k)) ? 'done' : 'open' }));
  v.finance = { owed: owedOf(e), overdue: overdue(e, day).reduce((a, i) => a + i.amount, 0), invoices: e.invoices.slice(0, 12).map(i => ({ ...i, daysLeft: i.due - day })) };
  v.records = e.records; v.base = (SCENARIOS[e.scenario] || {}).done || []; v.reports = e.reports.slice(0, 12); v.reviews = e.reviews; v.log = e.log.slice(0, 20); v.entrance = Object.fromEntries(Object.entries(e.entrance).filter(([, t]) => t.until >= day));
  if (e.session) v.session = sessionPublic(s, e, now); else v.session = null;
  v.subjects = []; v.exams = []; v.tasks = []; v.attendance = null; v.timetable = null;
  v.upcoming = e.invoices.filter(i => i.status === 'unpaid').map(i => ({ kind: 'pay', title: i.title, sub: `${rp(i.amount)} · ${i.due < day ? 'terlambat' : i.due - day + ' hari'}`, days: i.due - day, tone: 'pay' })).sort((a, b) => a.days - b.days).slice(0, 8);
  if (!en) { v.enrolled = false; return v; }
  const L = LEVELS[en.level], subs = subsOf(en), f = focusOf(x.needs); let sA = 0, sS = 0;
  v.enrolled = true; v.student = { name: e.name || 'Pemain', status: statusText(en), inst: INST[en.inst].n, level: en.level, grade: D.gradeOf(en.level, en), term: en.t, terms: D.totalTerms(en.level, en), major: en.major ? MAJORS[en.major].n : null, program: en.program ? PROGRAMS[en.program].n : null, track: en.track || null, kkm: L.kkm, gpa: R(cumGpa(en) * 100) / 100, open: en.open };
  v.needs = { energy: R(x.needs.energy), focus: R(f * 100), stress: R(x.needs.stress), mood: R(x.needs.mood), hunger: R(x.needs.hunger) };
  v.subjects = en.open ? subs.map(sj => { const sb = en.sub[sj.id]; sA += sb.att; sS += sb.sched; return { id: sj.id, n: sj.n, set: sj.set, pr: sj.pr, prog: R(sb.prog * 10) / 10, att: sb.sched ? R(sb.att / sb.sched * 100) : null, schedH: R(sb.sched / 360) / 10, topics: topicsOf(en, sj), tasksOpen: e.tasks.filter(t => t.enr === en.id && t.subj === sj.id && t.status === 'open').length, mid: sb.mid, fin: sb.fin, rem: sb.rem, est: subjScore(en, sj.id, false), alloc: e.study.alloc[sj.id] || 0, used: R((e.study.used[sj.id] || 0) / 360) / 10 }; }) : [];
  v.attendance = sS ? R(sA / sS * 100) : null;
  v.timetable = en.tt ? { slots: en.tt.slots, cells: en.tt.cells, names: Object.fromEntries(subs.map(q => [q.id, q.n])), today: wd, noClass: inNoClass(sd) } : null;
  v.study = { cap: L.selfCap, alloc: e.study.alloc, used: Object.fromEntries(Object.entries(e.study.used).map(([k, u]) => [k, R(u / 360) / 10])), remaining: R((L.selfCap * 3600 - Object.values(e.study.used).reduce((a, b) => a + b, 0)) / 360) / 10, window: 'Weekday 16:00–21:00 · akhir pekan 09:00–12:00 & 16:00–21:00' };
  v.tasks = e.tasks.filter(t => t.enr === en.id && t.term === en.t).map(t => ({ ...t, subjName: subs.find(q => q.id === t.subj)?.n, daysLeft: t.due - day })).sort((a, b) => a.due - b.due);
  v.exams = e.exams.filter(q => q.enr === en.id && q.term === en.t).map(q => { const sj = subs.find(z => z.id === q.subj), st = q.done ? (q.missed ? 'missed' : 'done') : day < q.win[0] ? 'upcoming' : day <= q.win[1] ? 'open' : 'missed'; return { id: q.id, subj: q.subj, name: sj?.n, kind: q.kind, win: q.win, status: st, score: q.score, correct: q.correct, n: q.n, pass: q.score != null ? q.score >= L.kkm : null, reason: st === 'open' ? examGate(s, e, x, q, en) : null }; });
  v.exams = v.exams.filter(q => q.kind !== 'rem' || q.status !== 'upcoming');
  v.upcoming = [];
  for (const q of v.exams) if (q.status === 'open') v.upcoming.push({ kind: 'exam', title: `${q.kind === 'mid' ? 'UTS' : q.kind === 'fin' ? 'UAS' : 'Remedial'} ${q.name}`, sub: `sampai hari ke-${q.win[1]}`, days: q.win[1] - day, tone: 'warn' });
  for (const t of v.tasks) if (t.status === 'open') v.upcoming.push({ kind: 'task', title: `${t.title}`, sub: t.daysLeft <= 0 ? 'hari ini' : `${t.daysLeft} hari`, days: t.daysLeft, tone: t.daysLeft <= 2 ? 'warn' : '' });
  for (const i of e.invoices) if (i.status === 'unpaid') v.upcoming.push({ kind: 'pay', title: i.title, sub: `${rp(i.amount)} · ${i.due < day ? 'terlambat' : i.due - day + ' hari'}`, days: i.due - day, tone: 'pay' });
  const nx = [[ACAD.midterm[0], 'UTS dimulai'], [ACAD.final[0], 'UAS dimulai'], [ACAD.closeDay, 'Pembagian rapor']].map(([d, n]) => [en.base + d, n]).find(([d]) => d >= day); if (en.open && nx) v.upcoming.push({ kind: 'cal', title: nx[1], sub: `hari ke-${nx[0]}`, days: nx[0] - day, tone: '' });
  v.upcoming.sort((a, b) => a.days - b.days); v.upcoming = v.upcoming.slice(0, 8);
  return v;
}

/* ====================== API ====================== */
export function catalogView(s, e) {
  const day = s.day;
  return { institutions: D.INSTITUTIONS.map(i => {
    const opts = i.level === 'UNIV' ? (i.programs || []).map(p => ({ id: p, n: PROGRAMS[p].n, deg: PROGRAMS[p].deg, terms: PROGRAMS[p].terms })) : [], majors = (i.majors || []).map(m => ({ id: m, n: MAJORS[m].n })), byOpt = {};
    for (const key of (opts.length ? opts.map(o => o.id) : ['-'])) { const pr = key === '-' ? null : key, cost = costOf(i, pr, 'reguler'), costK = i.trackFee ? costOf(i, pr, 'karyawan') : null; byOpt[key] = { cost, costK, afford: affordability(s, cost), elig: eligibility(s, e, i, { program: pr }) }; }
    const first = byOpt[opts.length ? opts[0].id : '-'];
    return { id: i.id, n: i.n, level: i.level, type: i.type, city: i.city, q: i.q, about: i.about, entrance: i.entrance, entranceFee: i.entranceFee, minGPA: i.minGPA, late: i.late, trackFee: i.trackFee, scholarEntrance: i.scholarEntrance, grad: i.grad, programs: opts, majors, byOpt, cost: first.cost, afford: first.afford, elig: first.elig, entranceLog: e.entranceLog[i.id] || null };
  }), levels: Object.fromEntries(Object.entries(LEVELS).map(([k, l]) => [k, { n: l.n, full: l.full, kkm: l.kkm, examQ: l.examQ, years: l.years, k12: l.k12 }])), day, scenarios: SCENARIOS, entrance: ENTRANCE, scholarships: SCHOLARSHIPS };
}

export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v750/')) return null;
  const { json, body, clean, save } = h, v = ensure750(s), e = v.edu, x = ensure740(s), day = s.day, err = (msg, c = 400) => json({ error: msg }, c);
  e.name = user?.name || e.name || 'Pemain';
  const respond = async extra => { await save(user, s); return json({ ok: true, ...(extra || {}), view: view(s, e, x, h) }); };
  const exp = expireSession(s, e, x, h); const expired = exp ? { expired: exp } : null;
  if (p === '/api/v750/view' && (m === 'GET' || m === 'POST')) return respond(expired);
  if (p === '/api/v750/catalog' && (m === 'GET' || m === 'POST')) return json({ ...catalogView(s, e), view: view(s, e, x, h) });
  if (m !== 'POST') return err('Metode tidak didukung.', 405);
  const b = await body(req);
  if (expired) await save(user, s);
  if (p === '/api/v750/scenario') {
    if (e.enroll || e.history.length || e.records.length) return err('Skenario tidak dapat diubah setelah pernah bersekolah.'); const id = clean(b.id, 10); if (!SCENARIOS[id]) return err('Skenario tidak dikenal.'); e.scenario = id; logIt(e, day, `Skenario karakter: ${SCENARIOS[id].n}`); return respond();
  }
  if (p === '/api/v750/enroll') {
    const inst = INST[clean(b.instId, 24)]; if (!inst) return err('Institusi tidak ditemukan.', 404);
    let major = null, program = null, track = null;
    if (inst.level === 'SMK') { major = clean(b.major, 6); if (!(inst.majors || []).includes(major)) return err('Pilih jurusan yang tersedia di sekolah ini.'); }
    if (inst.level === 'UNIV') { program = clean(b.program, 10); if (!(inst.programs || []).includes(program)) return err('Pilih program studi yang tersedia.'); track = clean(b.track, 10) === 'karyawan' ? 'karyawan' : 'reguler'; if (track === 'karyawan' && !inst.trackFee) return err('Kelas karyawan tidak tersedia di institusi ini.'); }
    const el = eligibility(s, e, inst, { program, track }), bad = el.reqs.find(r => !r.ok); if (bad) return err(`${bad.label}: ${bad.note || 'belum terpenuhi.'}`);
    const c = el.cost; s.cash -= c.atEnroll; e.nid++; const eid = `en${e.nid}`;
    const en = { id: eid, inst: inst.id, level: inst.level, major, program, track, t: 1, status: 'active', startDay: day, open: false, pendingOpen: false, gp: [], reps: [], entScore: e.entrance[inst.id]?.score ?? null, lastGpa: null };
    e.enroll = en; delete e.entrance[inst.id];
    e.nid++; e.invoices.unshift({ id: `i${e.nid}`, enr: eid, inst: inst.id, term: 0, title: `Pendaftaran · ${inst.n}`, lines: [{ n: 'Biaya pendaftaran', amt: inst.enroll }, ...(inst.build ? [{ n: 'Uang pangkal', amt: inst.build }] : [])], amount: c.atEnroll, due: day, issued: day, status: 'paid', late: false, paidDay: day });
    logIt(e, day, `Terdaftar di ${inst.n}`, `${rp(c.atEnroll)} dibayar. Semester pertama dimulai.`); notice(h, s, 'Pendaftaran berhasil', `${inst.n}: biaya pendaftaran ${rp(c.atEnroll)} dibayar.`, 'success');
    openTerm(s, e, en, day, h); return respond();
  }
  if (p === '/api/v750/withdraw') {
    if (!e.enroll) return err('Tidak sedang bersekolah.'); if (!b.confirm) return err('Konfirmasi diperlukan.'); if (e.session) return err('Selesaikan ujian yang berjalan terlebih dahulu.');
    const en = e.enroll; en.status = 'dropped'; e.history.unshift({ enr: en.id, inst: INST[en.inst].n, level: en.level, status: 'Berhenti', day }); e.enroll = null; e.tasks = e.tasks.filter(t => t.enr !== en.id); e.exams = e.exams.filter(t => t.enr !== en.id);
    logIt(e, day, `Berhenti dari ${INST[en.inst].n}`, 'Biaya yang sudah dibayar tidak dikembalikan; tagihan belum lunas tetap menjadi tunggakan.'); return respond();
  }
  if (p === '/api/v750/pay') {
    const list = b.all ? e.invoices.filter(i => i.status === 'unpaid') : e.invoices.filter(i => i.id === clean(b.id, 12) && i.status === 'unpaid'); if (!list.length) return err('Tagihan tidak ditemukan atau sudah lunas.', 404);
    const total = list.reduce((a, i) => a + i.amount, 0); if ((s.cash || 0) < total) return err(`Saldo tidak cukup. Butuh ${rp(total)}, saldo ${rp(s.cash || 0)}.`);
    s.cash -= total; for (const i of list) { i.status = 'paid'; i.paidDay = day; } logIt(e, day, `Pembayaran ${rp(total)}`, list.map(i => i.title).join('; ')); releaseHeld(s, e, day, h); return respond({ paid: total });
  }
  if (p === '/api/v750/study') {
    const en = e.enroll; if (!en || !en.open) return err('Belum ada pelajaran aktif.'); const a = b.alloc && typeof b.alloc === 'object' ? b.alloc : {}, subs = subsOf(en), cap = LEVELS[en.level].selfCap, out = {}; let sum = 0;
    for (const sj of subs) { const hrs = Math.floor(Number(a[sj.id]) || 0); if (hrs < 0 || hrs > cap) return err('Jam belajar tidak valid.'); out[sj.id] = hrs; sum += hrs; }
    if (sum > cap) return err(`Total belajar mandiri maksimal ${cap} jam/minggu (diminta ${sum}).`); e.study.alloc = out; return respond();
  }
  if (p === '/api/v750/task/do') {
    const en = e.enroll; if (!en || !en.open) return err('Belum ada pelajaran aktif.'); const t = e.tasks.find(q => q.id === clean(b.id, 12) && q.enr === en.id); if (!t) return err('Tugas tidak ditemukan.', 404); if (t.status !== 'open') return err('Tugas sudah dikerjakan atau lewat tenggat.');
    if (e.session) return err('Sedang ada ujian berjalan.'); const c = ctxOf(s, x, day, x.clock.tod), tod = x.clock.tod;
    if (c.act) return err(c.sleeping ? 'Sedang tidur. Bangun dulu.' : `Sedang ${String(c.act.label).toLowerCase()}.`); if (c.sched) return err('Sedang jam kerja.'); if (x.needs.energy < 15) return err('Terlalu lelah (energi < 15%).');
    if (tod + 3600 > CAL.secPerDay) return err('Hari hampir berganti; kerjakan besok.');
    if (!inNoClass(semDay(day))) for (const [, o] of slotsAt(en, weekdayOf(day), tod, 3600)) if (o > 0) return err('Ada jam pelajaran dalam 1 jam ke depan.');
    const f = focusOf(x.needs), sb = en.sub[t.subj], noise = (rngFor(`${user.id}:task:${t.id}`)() - .5) * 20;
    e.lock = true; try { clockStep(s, x, 3600, h); } finally { e.lock = false; }
    t.score = clamp(R(45 + .4 * sb.prog + .15 * f * 100 + noise)); t.status = 'done'; t.doneDay = day; sb.tasks.push(t.score); sb.prog = Math.min(100, sb.prog + LEARN.task * abilityF(s)); logIt(e, day, `Tugas selesai: ${t.title}`, `Nilai ${t.score} (1 jam waktu simulasi)`); return respond({ score: t.score });
  }
  if (p === '/api/v750/exam/start' || p === '/api/v750/entrance/start') {
    const now = nowOf(h);
    if (p.endsWith('entrance/start')) {
      const inst = INST[clean(b.instId, 24)]; if (!inst || !inst.entrance) return err('Institusi ini tidak memiliki tes masuk.', 404); if (e.session) return err('Selesaikan ujian yang sedang berjalan terlebih dahulu.');
      const pr = inst.level === 'UNIV' ? inst.programs[0] : null, el = eligibility(s, e, inst, { program: pr }); if (!el.canTakeEntrance) { const bad = el.reqs.find(r => !r.ok && !['entrance', 'window', 'funds'].includes(r.k)); return err(bad ? `${bad.label}: ${bad.note}` : 'Belum memenuhi syarat mengikuti tes.'); }
      const lg = e.entranceLog[inst.id]; if (lg && day - lg.day < ENTRANCE.retryDays) return err(`Tes ulang bisa dilakukan hari ke-${lg.day + ENTRANCE.retryDays}.`);
      const c = ctxOf(s, x, day, x.clock.tod); if (c.act) return err('Sedang ada aktivitas.'); if (c.sched) return err('Bentrok dengan jam kerja.'); const dur = 12 * ACAD.sitMinutesPerQuestion * 60;
      if (x.clock.tod < ACAD.examHours[0] * 3600 || x.clock.tod + dur > ACAD.examHours[1] * 3600) return err(`Tes hanya bisa dimulai antara 07:00 dan ${ACAD.examHours[1] - 1}:00 dengan sisa waktu cukup.`);
      if ((s.cash || 0) < inst.entranceFee) return err(`Biaya tes ${rp(inst.entranceFee)} melebihi saldo.`); s.cash -= inst.entranceFee; e.nid++;
      startSession(s, e, x, 'entrance', { id: `e${e.nid}`, kind: 'entrance' }, null, inst, user.id, now); logIt(e, day, `Mulai tes masuk ${inst.n}`, `Biaya ${rp(inst.entranceFee)}`); return respond();
    }
    const en = e.enroll; if (!en || !en.open) return err('Tidak ada semester aktif.'); const ex = e.exams.find(q => q.id === clean(b.id, 12) && q.enr === en.id); if (!ex) return err('Ujian tidak ditemukan.', 404); if (ex.done) return err('Ujian ini sudah selesai.');
    const why = examGate(s, e, x, ex, en); if (why) return err(why);
    startSession(s, e, x, ex.kind, ex, en, INST[en.inst], user.id, now); logIt(e, day, `Mulai ${ex.kind === 'mid' ? 'UTS' : ex.kind === 'fin' ? 'UAS' : 'remedial'} ${subsOf(en).find(q => q.id === ex.subj).n}`); return respond();
  }
  if (p === '/api/v750/exam/answer') {
    if (!e.session) return err('Tidak ada ujian berjalan.'); const i = Math.floor(Number(b.i)), ch = Math.floor(Number(b.choice)), ses = e.session; if (!(i >= 0 && i < ses.n)) return err('Nomor soal tidak valid.'); if (!(ch >= -1 && ch <= 3)) return err('Pilihan tidak valid.');
    if (ch >= 0 && ses.kind !== 'entrance') { const q = sessionQs(ses)[i]; if (elimOf(ses, i, q).includes(ch)) return err('Pilihan ini sudah disingkirkan oleh ingatan karakter.'); }
    ses.answers[i] = ch; return respond();
  }
  if (p === '/api/v750/exam/submit') { if (!e.session) return err('Tidak ada ujian berjalan.'); const res = finishSession(s, e, x, h, 'manual'); await save(user, s); return json({ ok: true, result: res, view: view(s, e, x, h) }); }
  return err('API_NOT_FOUND', 404);
}
export const _internal = { dayStart, closeTerm, openTerm, stepHook, startSession, finishSession, sessionQs, examGate };
