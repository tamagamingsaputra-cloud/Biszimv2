// Smoke test UI Education (tanpa browser): menjalankan v750-education.js dengan App tiruan yang terhubung ke engine nyata.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { DAY_HOOKS } from '../netlify/functions/v700-engine.mjs';
import { ensure740, step as clockStep } from '../netlify/functions/v740.mjs';
import { route, ensure750, _internal, view } from '../netlify/functions/v750-education.mjs';
let clockNow = 5e6; const toasts = [], modals = [];
const h = { json: (o, c = 200) => ({ status: c, o }), body: async r => r, clean: (v, n) => String(v ?? '').trim().slice(0, n), save: async () => { }, addNotice() { }, now: () => clockNow };
const s = { day: 1, cash: 5e8, career: { status: 'unemployed' }, skills: {} }; const U = { id: 'u1', name: 'Tamz' };
const esc = t => String(t ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
const App = { state: { state: s }, user: U, view: 'learn', pages700: { learn: () => '<div>LEGACY_KURSUS</div>' }, money: n => 'Rp' + Math.round(n).toLocaleString('id-ID'), toast: (t, m, ty) => toasts.push([t, m, ty]), modal: (t, b, f) => modals.push({ t, b, f }), refresh: async () => { }, render() { }, hydrate() { },
  request: async (path, o = {}) => { const m = (o.method || 'GET'); const r = await route({ p: path.split('?')[0], m, s, user: U, req: o.body ? JSON.parse(o.body) : {}, h }); return { ok: r.status < 400, json: async () => r.o }; },
  v700: { M: n => 'Rp' + Math.round(n).toLocaleString('id-ID'), ic: () => '<i/>', E: esc } };
const ctx = vm.createContext({ App, setInterval: () => 1, clearInterval() { }, setTimeout: (f) => 0, clearTimeout() { }, document: { getElementById: () => null, querySelector: () => null }, closeModal() { }, console, Date });
vm.runInContext(fs.readFileSync(new URL('../web/v750-education.js', import.meta.url), 'utf8'), ctx);
const ed = App.edu, tabs = ['overview', 'catalog', 'schedule', 'exams', 'results', 'records', 'legacy'];
const flush = () => new Promise(r => setImmediate(r));
async function renderAll(tag) { for (const t of tabs) { ed.tab = t; for (let k = 0; k < 4; k++) { const out = App.pages700.learn(); await flush(); await flush(); if (!/Memuat/.test(out)) { assert.ok(out.length > 150, `${tag}/${t} kosong`); assert.ok(!/undefined|NaN|\[object|Gagal menampilkan/.test(out), `${tag}/${t}: ${(out.match(/.{30}(undefined|NaN|\[object|Gagal menampilkan).{30}/) || [''])[0]}`); break; } } } }
const roll = n => { for (let i = 0; i < n; i++) { s.day++; for (const f of DAY_HOOKS) f(s, {}, s.day, 'u1', h); } };
const edPost = (...a) => App.edPost(...a);

// A. belum bersekolah
await renderAll('A-belum'); ed.tab = 'overview'; assert.match(App.pages700.learn(), /Tidak sedang bersekolah/);
ed.tab = 'catalog'; ed.cat = null; for (let k = 0; k < 4; k++) { App.pages700.learn(); await flush(); await flush(); }
for (const i of ed.cat.institutions) { for (const o of (i.programs.length ? i.programs : [{ id: '' }])) { ed.enr = { inst: i.id, major: i.majors[0]?.id || '', program: o.id, track: 'reguler' }; modals.length = 0; App.edDetail(i.id, true); const m = modals.at(-1); assert.ok(m && !/undefined|NaN/.test(m.b), `detail ${i.id}/${o.id}`); if (i.trackFee) { App.edSelOpt('track', 'karyawan'); assert.ok(/karyawan/.test(modals.at(-1).b)); } } }
App.edCmp('sma-negeri'); App.edCmp('smk-negeri'); App.edCmp('univ-swasta'); App.edCmp('sd-negeri'); assert.equal(ed.cmp.length, 3, 'basket maksimal 3'); assert.ok(/Comparison Basket/.test(App.pages700.learn()));
App.edCmpClear(); ed.filt.UNIV = 0; ed.filt.SD = 0; assert.ok(!/SD Negeri Harapan/.test(App.pages700.learn())); ed.filt.UNIV = 1; ed.filt.SD = 1;
// B. skenario + pendaftaran lewat UI
await edPost('scenario', { id: 'sma' }, 'ok'); ed.enr = { inst: 'smk-swasta', major: 'AKL', program: '', track: 'reguler' };
ed.cat = null; ed.tab = 'catalog'; for (let k = 0; k < 4; k++) { App.pages700.learn(); await flush(); await flush(); }
App.edDetail('smk-swasta', true); assert.ok(/Ikuti Tes Masuk|Daftar Sekarang/.test(modals.at(-1).f)); modals.length = 0; App.edAskEnroll(); assert.ok(/Bayar & Daftar/.test(modals.at(-1).f)); App.edDoEnroll(); await flush(); await flush(); await flush();
assert.ok(s.v750.edu.enroll && s.v750.edu.enroll.major === 'AKL', 'pendaftaran lewat UI tersimpan di engine');
await renderAll('B-terdaftar'); ed.tab = 'overview'; assert.match(App.pages700.learn(), /Active Studies/);
// C. tugas/belajar mandiri
roll(10); await App.edPost('study', { alloc: { mat: 2, ind: 1, ing: 1, dasar: 2, prak: 2 } }, 'ok'); assert.equal(s.v750.edu.study.alloc.dasar, 2);
ed.alloc = null; ed.tab = 'schedule'; let out = App.pages700.learn(); assert.ok(/Timetable/.test(out) && /Topics Covered/.test(out) && /Self-Study/.test(out));
// D. ruang ujian
while (s.day < s.v750.edu.enroll.base + 80) roll(1);
const x = ensure740(s); if (x.clock.tod < 8 * 3600) clockStep(s, x, 8 * 3600 - x.clock.tod, h);
await load2(); async function load2() { await App.edPost('view', {}); }
const ex = ed.view.exams.find(q => q.status === 'open'); assert.ok(ex, 'UTS terbuka'); const r0 = await App.edPost('exam/start', { id: ex.id }, 'mulai'); assert.ok(r0, 'ujian dimulai lewat UI');
ed.qi = 0; out = App.pages700.learn(); assert.ok(/Active Exam Room/.test(out) && /Info sistem ujian/.test(out) && /Passing grade/.test(out) && /Random seed/.test(out)); assert.ok(!/"k":|key/.test(JSON.stringify(ed.view.session)));
for (let i = 0; i < ed.view.session.n; i++) { const q = ed.view.session.questions[i]; const c = [0, 1, 2, 3].find(j => !q.elim.includes(j)); App.edAns(i, c); await flush(); await flush(); await flush(); }
assert.equal(s.v750.edu.session.answers.filter(a => a >= 0).length, ed.view.session.n, 'jawaban tersimpan di engine');
await renderAll('D-ujian'); ed.tab = 'exams'; await App.edDoSubmit(); await flush(); assert.equal(s.v750.edu.session, null); assert.ok(modals.at(-1).t === 'Hasil Ujian');
await renderAll('E-hasil'); ed.tab = 'results'; out = App.pages700.learn(); assert.ok(/Pembahasan Ujian/.test(out) && /Jawabanmu/.test(out));
const ev = App.v750.events(1, 2000); assert.ok(ev.some(q => /UTS|UAS|Tenggat|Pembagian rapor/.test(q.title)), 'kalender menerima agenda akademik'); assert.ok(ev.every(q => Number.isFinite(q.day) && q.type));
console.log('UI SMOKE EDUCATION LULUS: katalog, detail, bandingkan, pendaftaran, jadwal, ujian, hasil, rekam');
