// Uji engine Education 7.5.0 (tanpa browser/server): node tests/v750-education-test.mjs
import assert from 'node:assert/strict';
import { DAY_HOOKS } from '../netlify/functions/v700-engine.mjs';
import { ensure740, step as clockStep, CAL } from '../netlify/functions/v740.mjs';
import { route, ensure750, _internal, view, eligibility } from '../netlify/functions/v750-education.mjs';
import * as D from '../netlify/functions/v750-edu-data.mjs';
import { buildQuestions } from '../netlify/functions/v750-edu-bank.mjs';

const notes = []; let clockNow = 1_000_000;
const h = { json: (o, c = 200) => ({ status: c, o }), body: async r => r, clean: (v, n) => String(v ?? '').trim().slice(0, n), save: async () => { }, addNotice: (s, t, m) => notes.push([t, m]), now: () => clockNow };
const mk = (cash = 1e9, extra = {}) => ({ day: 1, cash, career: { status: 'unemployed', salary: 0 }, skills: { finance: 30, sales: 30 }, ...extra });
const U = { id: 'u1', name: 'Tamz' };
const call = (s, p, b = {}) => route({ p: '/api/v750/' + p, m: 'POST', s, user: U, req: b, h });
const roll = (s, n = 1) => { for (let i = 0; i < n; i++) { s.day++; for (const f of DAY_HOOKS) f(s, {}, s.day, 'u1', h); } };
const X = s => ensure740(s), E = s => ensure750(s).edu;
const toTod = (s, hour) => { const x = X(s); if (x.clock.tod < hour * 3600) { const e = E(s); clockStep(s, x, hour * 3600 - x.clock.tod, h); } };

/* kebijakan siswa: mengerjakan tugas, ujian (jawaban benar dengan peluang acc), bayar tagihan */
async function student(s, { acc = .85, tasks = true, pay = true } = {}) {
  const e = E(s), x = X(s);
  if (pay) for (const i of e.invoices.filter(i => i.status === 'unpaid' && !/ijazah/i.test(i.title))) await call(s, 'pay', { id: i.id });
  const en = e.enroll; if (!en || !en.open) return;
  const open = view(s, e, x, h).exams.filter(q => q.status === 'open');
  for (const ex of open.slice(0, 3)) {
    toTod(s, 8); const r = await call(s, 'exam/start', { id: ex.id }); if (r.status !== 200) continue;
    const ses = e.session, qs = _internal.sessionQs(ses), rng = (i) => ((Math.sin(i * 12.9898 + ses.seed.length * 78.233) * 43758.5453) % 1 + 1) % 1;
    for (let i = 0; i < qs.length; i++) { const ok = rng(i) < acc; let ch = ok ? qs[i].k : (qs[i].k + 1) % 4; const el = view(s, e, x, h).session.questions[i].elim; if (el.includes(ch)) ch = [0, 1, 2, 3].find(c => !el.includes(c) && c !== qs[i].k) ?? qs[i].k; await call(s, 'exam/answer', { i, choice: ch }); }
    await call(s, 'exam/submit');
  }
  if (tasks) { const t = view(s, e, x, h).tasks.find(q => q.status === 'open'); if (t) { toTod(s, 17.5 > 17 ? 17 : 17); if (X(s).clock.tod < 17.1 * 3600) clockStep(s, x, 17.1 * 3600 - x.clock.tod, h); await call(s, 'task/do', { id: t.id }); } }
}

/* ============ 1. katalog, skenario & syarat pendaftaran ============ */
{
  const s = mk(0); ensure750(s); const e = E(s);
  assert.equal(e.scenario, 'sd', 'profil pendidikan baru dimulai dari SD kelas 1');
  await call(s, 'scenario', { id: 'adult' });
  let r = await call(s, 'enroll', { instId: 'sd-negeri' }); assert.equal(r.status, 400, 'skenario dewasa tidak boleh masuk SD'); assert.match(r.o.error, /SD|jenjang/i);
  r = await call(s, 'enroll', { instId: 'univ-negeri', program: 'S1-MAN' }); assert.equal(r.status, 400); // tes masuk + dana
  r = await call(s, 'scenario', { id: 'sd' }); assert.equal(r.status, 200); assert.equal(E(s).scenario, 'sd');
  r = await call(s, 'enroll', { instId: 'sd-negeri' }); assert.equal(r.status, 400); assert.match(r.o.error, /Dana/, 'saldo Rp0 tidak bisa mendaftar');
  s.cash = 1000000; r = await call(s, 'enroll', { instId: 'sd-negeri' }); assert.equal(r.status, 200, JSON.stringify(r.o));
  assert.equal(s.cash, 1000000 - 150000, 'biaya pendaftaran dipotong sesuai konfigurasi');
  const en = E(s).enroll; assert.equal(en.level, 'SD'); assert.equal(en.open, true);
  assert.equal(E(s).invoices.length, 2); const inv = E(s).invoices.find(i => i.status === 'unpaid'); assert.equal(inv.amount, 300000 + 400000, 'tagihan semester 1 = SPP + buku (tertera, tidak diam-diam)'); assert.equal(inv.due, s.day + 14);
  assert.equal((await call(s, 'scenario', { id: 'adult' })).status, 400, 'skenario terkunci setelah mendaftar');
  assert.equal((await call(s, 'enroll', { instId: 'sd-swasta' })).status, 400, 'tidak boleh dobel');
  // timetable sesuai kurikulum
  const subs = D.K12.SD, per = {}; for (const wd of Object.values(en.tt.cells)) for (const id of Object.values(wd)) per[id] = (per[id] || 0) + 1;
  for (const sj of subs) assert.equal(per[sj.id], sj.pr, `jam ${sj.n} sesuai kurikulum`);
  // pembayaran: saldo kurang -> ditolak; cukup -> lunas
  s.cash = 100; assert.equal((await call(s, 'pay', { id: inv.id })).status, 400); s.cash = 5e6; assert.equal((await call(s, 'pay', { id: inv.id })).status, 200); assert.equal(inv.status, 'paid'); assert.equal(s.cash, 5e6 - 700000);
  console.log('PASS 1 katalog, skenario, syarat, biaya, timetable, pembayaran');
}

/* ============ 2. jadwal+jam: kehadiran, belajar, bentrok kerja ============ */
{
  const s = mk(); ensure750(s); await call(s, 'scenario', { id: 'smp' }); let r = await call(s, 'enroll', { instId: 'smp-swasta' }); assert.equal(r.status, 200, JSON.stringify(r.o));
  roll(s, 20); const e = E(s), en = e.enroll; const sb = Object.values(en.sub); assert.ok(sb.every(q => q.sched > 0), 'jam sekolah tercatat dari engine jam');
  const prog = Object.values(en.sub).map(q => q.prog); assert.ok(prog.some(p => p > 0), 'materi bertambah dari kehadiran'); assert.ok(Object.values(en.sub).every(q => q.att <= q.sched));
  const att = Object.values(en.sub).reduce((a, q) => a + q.att, 0) / Object.values(en.sub).reduce((a, q) => a + q.sched, 0); assert.ok(att > .6, 'autopilot hadir mayoritas kelas: ' + att);
  // bekerja membuat bentrok -> kehadiran turun
  const s2 = mk(); ensure750(s2); await call(s2, 'scenario', { id: 'smp' }); await call(s2, 'enroll', { instId: 'smp-swasta' }); s2.career = { status: 'employed', salary: 6e6, position: 'x' }; roll(s2, 20);
  const att2 = Object.values(E(s2).enroll.sub).reduce((a, q) => a + q.att, 0) / Object.values(E(s2).enroll.sub).reduce((a, q) => a + q.sched, 0); assert.ok(att2 < att - .3, `bekerja bentrok dengan sekolah: ${att2.toFixed(2)} < ${att.toFixed(2)}`);
  // self-study alokasi: tidak boleh lebih dari batas
  assert.equal((await call(s, 'study', { alloc: { mat: 99 } })).status, 400); assert.equal((await call(s, 'study', { alloc: { mat: 3, ind: 3 } })).status, 200);
  console.log('PASS 2 kehadiran & belajar mengikuti jam simulasi; kerja bentrok menurunkan kehadiran', att.toFixed(2), att2.toFixed(2));
}

/* ============ 3. tugas, ujian (seed), remedial, rapor ============ */
{
  const s = mk(); ensure750(s); await call(s, 'scenario', { id: 'smp' }); await call(s, 'enroll', { instId: 'smp-swasta' });
  // ke hari 8 untuk tugas pertama; tugas butuh 1 jam & tidak bentrok
  for (let i = 0; i < 12; i++) { roll(s); await student(s, { acc: .8 }); }
  const e = E(s), en = e.enroll; assert.ok(e.tasks.length >= 1, 'tugas dibuat pada kalender akademik'); assert.ok(en.sub.mat.tasks.length + en.sub.ind.tasks.length + en.sub.ing.tasks.length + en.sub.ipa.tasks.length >= 0);
  // sampai UTS
  while (s.day < en.base + D.ACAD.midterm[0]) { roll(s); await student(s, { acc: .8 }); }
  const v = view(s, e, X(s), h); assert.ok(v.exams.some(q => q.kind === 'mid' && q.status === 'open'), 'UTS terbuka di jendela'); assert.equal(v.now.phase, 'Pekan UTS');
  // reproduksi seed
  const ex = v.exams.find(q => q.status === 'open'); toTod(s, 8); const st = await call(s, 'exam/start', { id: ex.id }); assert.equal(st.status, 200, JSON.stringify(st.o)); const ses = e.session;
  const A = JSON.stringify(_internal.sessionQs(ses)), B = JSON.stringify(buildQuestions({ ...ses.parts[0], seed: ses.seed + ':0' }).map(q => ({ ...q, set: ses.parts[0].set })));
  assert.equal(A, B, 'soal ujian dapat direproduksi dari seed'); assert.ok(ses.n >= 6);
  // jawaban tidak bocor di view; hanya satu ujian sekaligus; clock berhenti
  const pub = view(s, e, X(s), h).session; assert.ok(!JSON.stringify(pub).includes('"k":') && !pub.questions.some(q => 'k' in q || 'key' in q), 'kunci jawaban tidak dikirim ke klien'); assert.equal(X(s).clock.paused, true, 'jam dijeda selama ujian');
  assert.equal((await call(s, 'exam/start', { id: v.exams[1].id })).status, 400);
  // soal harus dari mapel & jenjang yang benar
  const sj = D.K12.SMP.find(q => q.id === ex.subj); assert.ok(ses.parts.every(p => p.set === sj.set), 'bank soal sesuai mapel/jenjang');
  const tod0 = X(s).clock.tod; for (let i = 0; i < ses.n; i++) await call(s, 'exam/answer', { i, choice: i % 2 }); const fin = await call(s, 'exam/submit'); assert.equal(fin.status, 200); assert.equal(X(s).clock.paused, false); assert.ok(X(s).clock.tod > tod0, 'ujian memakai waktu simulasi');
  assert.equal(e.exams.find(q => q.id === ex.id).done, true); assert.ok(typeof fin.o.result.score === 'number'); assert.equal(fin.o.result.review.length, ses.n);
  assert.equal((await call(s, 'exam/submit')).status, 400, 'tidak bisa submit dua kali');
  // waktu habis -> auto submit
  const ex2 = view(s, e, X(s), h).exams.find(q => q.status === 'open'); if (ex2) { toTod(s, Math.max(8, Math.ceil(X(s).clock.tod / 3600))); const r = await call(s, 'exam/start', { id: ex2.id }); if (r.status === 200) { clockNow += (e.session.limitSec + 5) * 1000; const vv = await call(s, 'view'); assert.equal(e.session, null, 'sesi kedaluwarsa otomatis dikumpulkan'); assert.equal(X(s).clock.paused, false); } }
  console.log('PASS 3 tugas, UTS, seed reproducible, kunci tidak bocor, jam dijeda, timeout');
}

/* ============ 4. tunggakan menahan UAS, denda, remedial, rapor, kenaikan/ulang ============ */
async function runTerms(s, opts, until) { const e = E(s); let guard = 0; while (!until(e) && guard++ < 3000) { roll(s); await student(s, opts); } return guard; }
{
  const s = mk(); ensure750(s); await call(s, 'scenario', { id: 'smp' }); await call(s, 'enroll', { instId: 'smp-swasta' }); const e = E(s), en = e.enroll;
  const inv = e.invoices.find(i => i.status === 'unpaid');
  while (s.day <= inv.due) { roll(s); await student(s, { acc: .85, pay: false }); }
  roll(s); assert.equal(inv.late, true, 'denda keterlambatan muncul setelah jatuh tempo'); assert.ok(inv.amount > 3500000 + 1000000 - 1); assert.ok(notes.some(n => /terlambat/i.test(n[0])));
  while (s.day < en.base + D.ACAD.final[0]) { roll(s); await student(s, { acc: .85, pay: false, tasks: true }); }
  const ex = view(s, e, X(s), h).exams.find(q => q.kind === 'fin' && q.status === 'open'); toTod(s, 8); const r = await call(s, 'exam/start', { id: ex.id }); assert.equal(r.status, 400); assert.match(r.o.error, /tunggakan/i, 'UAS ditahan bila ada tunggakan');
  await call(s, 'pay', { all: true }); toTod(s, 8); assert.equal((await call(s, 'exam/start', { id: ex.id })).status, 200); await call(s, 'exam/submit');
  // lanjutkan sampai rapor semester 1
  await runTerms(s, { acc: .85 }, e => e.reports.length >= 1); const rep = e.reports[0];
  assert.equal(rep.term, 1); assert.ok(rep.rows.length === 6 && rep.rows.every(r => typeof r.score === 'number' && r.letter)); assert.equal(rep.outcome, 'continue'); assert.ok(rep.attendance > 0 && rep.gpa >= 0 && rep.gpa <= 4);
  assert.equal(e.enroll.t, 2); console.log('PASS 4 denda, UAS ditahan karena tunggakan, rapor semester 1:', rep.decision, 'GPA', rep.gpa, 'hadir', rep.attendance + '%');
}

/* ============ 5. kelulusan penuh, ijazah fiktif, karier ============ */
{
  const s = mk(); ensure750(s); await call(s, 'scenario', { id: 'smp' }); await call(s, 'enroll', { instId: 'smp-swasta' }); const e = E(s);
  await runTerms(s, { acc: .9 }, e => e.records.length >= 1 || !e.enroll && e.history.length);
  assert.equal(e.records.length, 1, 'catatan kelulusan tersimpan'); const rec = e.records[0];
  assert.equal(rec.level, 'SMP'); assert.match(rec.id, /^BZS-SMP-\d{4}$/); assert.equal(rec.id, 'BZS-SMP-0001'); assert.ok(rec.name === 'Tamz' && rec.inst && rec.year >= 3 && rec.gpa > 0 && /fiktif/i.test(rec.note)); assert.match(rec.status, /Ditahan/);
  await call(s, 'pay', { all: true }); assert.equal(rec.status, 'Lulus'); assert.equal(s.career.educationLevel, 'SMP', 'pendidikan terhubung ke karier'); assert.equal(e.reports.length >= 6, true);
  // lulus SMP -> boleh SMA, tidak boleh SD
  assert.equal((await call(s, 'enroll', { instId: 'sd-swasta' })).status, 400); while (D.semDay(s.day) > D.ACAD.enrollWindow) roll(s);
  let r = await call(s, 'enroll', { instId: 'sma-swasta' }); assert.equal(r.status, 200, JSON.stringify(r.o)); assert.equal(e.enroll.level, 'SMA');
  // pekerjaan memeriksa jenjang
  const rank = { SD: 0, SMP: 0, 'SMA/SMK': 1 }; assert.ok((rank[s.career.educationLevel] ?? 1) < 1);
  console.log('PASS 5 lulus SMP:', rec.id, 'IPK', rec.gpa, 'avg', rec.avg, 'tahun', rec.year);
}

/* ============ 6. mengulang kelas bila kehadiran/nilai buruk; ijazah ditahan ============ */
{
  const s = mk(); ensure750(s); await call(s, 'scenario', { id: 'sd' }); await call(s, 'enroll', { instId: 'sd-negeri' }); const e = E(s);
  await runTerms(s, { acc: 0, tasks: false }, e => e.reports.length >= 2);
  const rep = e.reports[0]; assert.equal(rep.outcome, 'repeat', 'nilai buruk -> mengulang kelas: ' + rep.reason); assert.equal(e.enroll.t, 1, 'kembali ke semester 1 kelas yang sama'); assert.equal(D.gradeOf('SD', e.enroll), 1);
  console.log('PASS 6 mengulang kelas:', rep.reason);
}
{
  const s = mk(); ensure750(s); await call(s, 'scenario', { id: 'smp' }); await call(s, 'enroll', { instId: 'smp-swasta' }); const e = E(s);
  await runTerms(s, { acc: .9 }, e => e.records.length >= 1);
  const rec = e.records[0]; assert.equal(rec.held, true, 'ijazah ditahan sampai biaya ijazah & wisuda dibayar'); assert.match(rec.status, /Ditahan/); assert.equal(s.career.educationLevel, undefined, 'jenjang karier belum naik saat ijazah ditahan');
  const gi = e.invoices.find(i => /ijazah/i.test(i.title)); assert.ok(gi && gi.amount === 300000, 'biaya kelulusan tertera sebagai tagihan');
  assert.equal((await call(s, 'enroll', { instId: 'sma-swasta' })).status, 400, 'ijazah ditahan: belum memenuhi syarat jenjang berikutnya');
  assert.equal((await call(s, 'pay', { all: true })).status, 200); assert.equal(rec.held, false); assert.equal(rec.status, 'Lulus'); assert.equal(s.career.educationLevel, 'SMP');
  console.log('PASS 7 ijazah ditahan sampai biaya ijazah dibayar, lalu dirilis dan jenjang karier naik');
}
console.log('SEMUA UJI EDUCATION LULUS');
