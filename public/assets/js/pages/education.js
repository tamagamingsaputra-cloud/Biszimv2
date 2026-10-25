// EDUCATION — SD sampai perguruan tinggi. Semua biaya, syarat, soal, penilaian, dan kelulusan berasal dari server BizSim.
// UI hanya menampilkan data server dan mengirim aksi pemain; tidak ada nilai/biaya yang dihitung atau diacak di browser.
import * as E from '../engine/core.js';
import { fmtDay } from '../engine/calendar.js';
import { mountShell } from '../ui/shell.js';
import { get, post } from '../ui/api.js';
import { rp, rpShort, icon, esc, $, $$, toast, openDialog, empty, fmtDate, num } from '../ui/ui.js';
import { EDUCATION_LEVELS } from '../data/job-catalog.js';
import { OPPORTUNITIES } from '../data/education-opportunities.js';

const page = await mountShell('education', 'Education');
const ROUTES = [
  ['overview', 'Ringkasan', 'education'], ['catalog', 'Katalog sekolah', 'school'], ['timetable', 'Jadwal', 'calendar'],
  ['subjects', 'Mapel & materi', 'book'], ['exam', 'Ruang ujian', 'exam'], ['results', 'Nilai & rapor', 'chart'], ['records', 'Riwayat kelulusan', 'doc'],
];
const STAGE_NAME = { SD: 'Sekolah Dasar', SMP: 'SMP', SMA: 'SMA', SMK: 'SMK', PT: 'Perguruan tinggi' };
const KIND = { mid: 'Ujian tengah periode (UTS)', final: 'Ujian akhir periode (UAS)', remedial: 'Remedial' };
const KIND_SHORT = { mid: 'UTS', final: 'UAS', remedial: 'Remedial' };
const DECISION = { lanjut: ['pos', 'Lanjut ke semester genap'], peringatan: ['warn', 'Lanjut dengan peringatan'], naik: ['pos', 'Naik kelas'], mengulang: ['neg', 'Mengulang'], lulus: ['pos', 'Lulus jenjang'] };

page.innerHTML = `
  <div class="tabs edu-tabs" role="tablist" aria-label="Menu pendidikan">${ROUTES.map(([id, label, ic]) => `<a class="tab" role="tab" href="#${id}" data-r="${id}">${icon(ic, 'width="15" height="15"')}<span>${label}</span></a>`).join('')}</div>
  <div id="view" style="margin-top:16px"></div>`;

const V = () => E.EDU, ed = () => E.EDU?.edu, R = () => E.EDU?.rules || {};
const view = () => $('#view');
const termDay = td => ed().termStartDay + td - 1;
const subjName = id => ed()?.subjects?.find(s => s.id === id)?.name || id;
const chip = (cls, t) => `<span class="chip ${cls}">${t}</span>`;
let busy = false;

async function act(fn, okMsg) {
  if (busy) return null; busy = true;
  try {
    const r = await fn();
    if (!r?.ok) { toast(r?.error || 'Permintaan gagal.', 'error'); return r; }
    if (r.edu) E.setEdu(r);
    if (okMsg) toast(okMsg);
    return r;
  } finally { busy = false; }
}

// ————————————————————————— router —————————————————————————
async function route() {
  const [r, arg] = (location.hash.slice(1) || 'overview').split('/');
  const top = ['inst', 'enroll'].includes(r) ? 'catalog' : r;
  $$('.edu-tabs .tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.r === top)));
  const fn = { overview, catalog, inst: () => institution(arg), enroll: () => enroll(arg), timetable, subjects, exam, results, records }[r] || overview;
  await fn();
}
window.addEventListener('hashchange', () => { route(); window.scrollTo({ top: 0 }); });

// ————————————————————————— 1. Education Overview —————————————————————————
function pathMap() {
  const e = ed(), steps = [['SD', 'SD kelas 1–6'], ['SMP', 'SMP kelas 7–9'], ['SMA/SMK', 'SMA atau SMK kelas 10–12'], ['PT', 'Perguruan tinggi (opsional)']];
  const has = s => s === 'SMA/SMK' ? e.passed.some(x => x === 'SMA' || x === 'SMK') : e.passed.includes(s);
  const cur = s => e.status === 'enrolled' && (s === e.stage || (s === 'SMA/SMK' && ['SMA', 'SMK'].includes(e.stage)));
  return `<ol class="edu-path">${steps.map(([s, l]) => `<li class="${has(s) ? 'done' : cur(s) ? 'cur' : ''}"><span class="dotn">${has(s) ? icon('check', 'width="14" height="14"') : ''}</span><div><b>${l}</b><div class="subtle">${has(s) ? 'Lulus — tercatat di server' : cur(s) ? `Sedang berjalan · ${esc(e.labelTerm)}` : 'Belum dimulai'}</div></div></li>`).join('')}</ol>
  <p class="subtle" style="margin:8px 0 0">Setelah SMP, pemain dapat memilih SMA atau SMK, langsung bekerja saat usia mencukupi, atau melanjutkan kuliah. Kuliah bukan keharusan.</p>`;
}
function agendaItems() {
  const e = ed(), items = [], td = e.termDay, w = e.windows;
  if (e.status !== 'enrolled') return items;
  const unpaid = e.bills.filter(b => b.paid < b.amount);
  for (const b of unpaid) items.push({ tone: td >= b.dueTermDay ? 'error' : 'warn', t: `Tagihan: ${b.label}`, d: `Sisa ${rp(b.amount - b.paid)} · jatuh tempo hari ke-${b.dueTermDay} periode. Jika belum lunas, kartu ujian tertahan.`, a: `<a class="btn sm primary" href="#overview" data-paybill="${b.id}">Bayar</a>` });
  const open = e.tasks.filter(t => t.status === 'open');
  if (open.length) items.push({ tone: 'warn', t: `${open.length} tugas belum dikumpulkan`, d: open.map(t => `${subjName(t.subject)} (batas hari ke-${t.dueTermDay})`).join(', '), a: `<a class="btn sm" href="#subjects">Kerjakan</a>` });
  for (const [k, win] of [['mid', w.mid], ['final', w.final]]) {
    if (td >= win[0] && td <= win[1]) { const left = e.subjects.filter(s => e.exams[`${s.id}:${k}`]?.status !== 'selesai'); if (left.length) items.push({ tone: 'warn', t: `${KIND[k]} dibuka`, d: `${left.length} mapel belum dikerjakan. Jendela ujian sampai hari ke-${win[1]}.`, a: `<a class="btn sm primary" href="#exam">Masuk ruang ujian</a>` }); }
    else if (td < win[0] && win[0] - td <= 3) items.push({ tone: 'info', t: `${KIND[k]} ${win[0] - td} hari lagi`, d: `Dibuka hari ke-${win[0]}–${win[1]}. Soal diambil dari materi yang sudah diajarkan.`, a: `<a class="btn sm" href="#subjects">Belajar</a>` });
  }
  if (td >= w.remedial[0] && td <= w.remedial[1]) { const rem = e.subjects.filter(s => s.current.grade < R().pass && e.exams[`${s.id}:remedial`]?.status !== 'selesai'); if (rem.length) items.push({ tone: 'error', t: 'Remedial tersedia', d: `${rem.map(s => s.name).join(', ')} di bawah ${R().pass}. Remedial sampai hari ke-${w.remedial[1]}.`, a: `<a class="btn sm primary" href="#exam">Ikut remedial</a>` }); }
  if (td > w.report && e.lastDecision) items.push({ tone: 'ok', t: 'Rapor periode ini sudah terbit', d: DECISION[e.lastDecision]?.[1] || e.lastDecision, a: `<a class="btn sm" href="#results">Lihat rapor</a>` });
  return items;
}
async function overview() {
  const v = V(), e = v.edu, p = v.profile;
  const fam = v.family[p.family];
  if (e.status !== 'enrolled') {
    const grad = e.status === 'graduated';
    const next = grad ? (e.highest === 'SD' ? 'SMP' : e.highest === 'SMP' ? 'SMA atau SMK' : e.highest === 'SMA/SMK' ? 'perguruan tinggi, kerja, atau magang' : '') : 'Sekolah Dasar';
    view().innerHTML = `<div class="split">
      <div class="stack">
        <section class="panel"><div class="panel-b stack">
          <div class="row" style="gap:12px"><div class="edu-ico">${icon(grad ? 'doc' : 'school')}</div><div><h2 style="font-size:18px">${grad ? `Lulus ${esc(e.highest)} — langkah berikutnya` : `${esc(p.nickname)} belum terdaftar di sekolah`}</h2>
          <div class="muted">${grad ? `Catatan kelulusan tersimpan di server. Pilihan berikutnya: ${next}.` : `Usia ${v.age} tahun. Skenario standar dimulai dari SD kelas 1. Pilih sekolah setelah melihat biaya dan syaratnya.`}</div></div></div>
          <div class="row wrap"><a class="btn primary" href="#catalog">${icon('school')}${grad ? 'Lihat sekolah berikutnya' : 'Pilih Sekolah Dasar'}</a>${grad ? '<a class="btn" href="#records">Lihat ijazah fiktif</a>' : ''}</div>
          <div class="msg info">${icon('info')}<span>Dana pendidikan dari wali: <b>${rp(fam.perTerm)}</b> per periode (keluarga ${esc(fam.label)}). Saldo dana wali saat ini <b>${rp(e.wallet)}</b>. Biaya selalu ditampilkan sebelum pendaftaran; tidak ada potongan otomatis.</span></div>
        </div></section>
        <section class="panel"><div class="panel-h"><h2>Jalur pendidikan</h2></div><div class="panel-b">${pathMap()}</div></section>
      </div>
      <div class="stack">${rulesCard()}</div></div>`;
    return;
  }
  const td = e.termDay, subs = e.subjects, i = e.institution;
  const att = e.attendanceLog.length ? Math.round(e.attendanceLog.filter(a => a.status === 'hadir').length / e.attendanceLog.length * 100) : null;
  const tasksDone = e.tasks.length ? Math.round(e.tasks.filter(t => t.status === 'selesai').length / e.tasks.length * 100) : null;
  const ICON = { ok: 'check', warn: 'alert', error: 'alert', info: 'info' };
  const ag = agendaItems();
  view().innerHTML = `
  <section class="panel"><div class="kpi-strip">
    <div class="kpi"><div class="label">${icon('school', 'width="14" height="14"')}Status</div><div class="value" style="font-size:18px">${esc(e.stage)} · ${esc(e.labelTerm)}</div><div class="foot">${esc(i.name)} · ${esc(e.program)}${e.attempt ? ` · percobaan ke-${e.attempt + 1}` : ''}</div></div>
    <div class="kpi"><div class="label">Hari periode</div><div class="value">${td} <span class="subtle" style="font-size:14px">/ ${R().termDays}</span></div><div class="foot">${td <= R().studyDays ? 'Hari belajar' : td <= e.windows.remedial[1] ? 'Masa remedial' : td === e.windows.report ? 'Pembagian rapor' : 'Libur antarperiode'}</div></div>
    <div class="kpi"><div class="label">Kehadiran</div><div class="value">${att == null ? '<span class="muted">—</span>' : att + '%'}</div><div class="foot">Minimal ${R().minAttendance}% · ${e.attendanceLog.length} hari tercatat</div></div>
    <div class="kpi"><div class="label">Tugas dikumpulkan</div><div class="value">${tasksDone == null ? '<span class="muted">—</span>' : tasksDone + '%'}</div><div class="foot">Minimal ${R().minTasks}% · ${e.tasks.length} tugas diberikan</div></div>
  </div><div class="panel-b" style="border-top:1px solid var(--border)"><div class="row between subtle"><span>Progres periode (hari ke-${td} dari ${R().termDays})</span><span>${fmtDay(termDay(1), 'wd')} – ${fmtDay(termDay(R().termDays), 'wd')}</span></div>
    <div class="bar" style="margin-top:6px" role="progressbar" aria-valuenow="${td}" aria-valuemin="0" aria-valuemax="${R().termDays}" aria-label="Hari periode"><i style="width:${td / R().termDays * 100}%"></i></div></div></section>
  <div class="split" style="margin-top:16px">
    <div class="stack">
      <section class="panel"><div class="panel-h"><h2>Agenda & tindakan</h2><span class="subtle">Dari jadwal server</span></div>
        <ul class="list">${ag.length ? ag.map(x => `<li><div class="msg ${x.tone}" style="border:0;padding:0;background:none;flex:1">${icon(ICON[x.tone])}<span><b>${esc(x.t)}</b><br><span class="muted">${esc(x.d)}</span></span></div>${x.a}</li>`).join('') : `<li><span class="muted">Tidak ada tindakan mendesak. Materi diajarkan otomatis saat karakter hadir; tambah waktu belajar mandiri untuk meningkatkan penguasaan.</span></li>`}</ul></section>
      <section class="panel"><div class="panel-h"><h2>Nilai berjalan</h2><a class="btn sm ghost" href="#results">Rapor</a></div>
        <div class="table-wrap"><table class="table"><thead><tr><th>Mata pelajaran</th><th class="r">Penguasaan</th><th class="r hide-m">UTS</th><th class="r hide-m">UAS</th><th class="r">Nilai sementara</th></tr></thead><tbody>
        ${subs.map(s => { const c = s.current, mid = e.exams[`${s.id}:mid`], fin = e.exams[`${s.id}:final`]; return `<tr><td><b>${esc(s.name)}</b></td><td class="r num">${num(c.mastery)}</td><td class="r hide-m num">${mid?.status === 'selesai' ? num(mid.score) : mid?.status === 'tidak-ikut' ? '0 (tidak ikut)' : '—'}</td><td class="r hide-m num">${fin?.status === 'selesai' ? num(fin.score) : fin?.status === 'tidak-ikut' ? '0 (tidak ikut)' : '—'}</td><td class="r num"><b>${num(c.grade, 1)}</b></td></tr>`; }).join('')}
        </tbody></table></div>
        <div class="panel-b subtle" style="border-top:1px solid var(--border)">Nilai sementara memakai rumus rapor dengan komponen yang belum ada dihitung 0 — bukan nilai final.</div></section>
    </div>
    <div class="stack">
      <section class="panel"><div class="panel-h"><h2>Biaya & dana</h2></div><div class="panel-b">
        <dl class="dl"><dt>Dana wali tersedia</dt><dd>${rp(e.wallet)}</dd><dt>Kontribusi wali / periode</dt><dd>${rp(v.family[p.family].perTerm)}</dd><dt>Tunggakan</dt><dd class="${e.outstanding > 0 ? 'neg' : ''}">${rp(e.outstanding)}</dd><dt>Saldo pribadi</dt><dd>${rp(E.S.player.balance)}</dd></dl>
        ${billsList(e.bills.slice(-3).reverse())}
      </div></section>
      <section class="panel"><div class="panel-h"><h2>Jalur pendidikan</h2></div><div class="panel-b">${pathMap()}</div></section>
    </div>
  </div>`;
}
function billsList(bills) {
  if (!bills.length) return '';
  return `<div class="divider"></div><ul class="list flush">${bills.map(b => { const due = b.amount - b.paid; return `<li style="padding:8px 0"><div style="flex:1"><b>${esc(b.label)}</b><div class="subtle">${rp(b.amount)} · ${due > 0 ? `sisa ${rp(due)} · jatuh tempo hari ke-${b.dueTermDay}` : 'Lunas'}</div></div>${due > 0 ? `<button class="btn sm primary" data-paybill="${b.id}">Bayar</button>` : chip('pos', 'Lunas')}</li>`; }).join('')}</ul>`;
}
function rulesCard() {
  const r = R(), w = r.weights || {};
  return `<section class="panel"><div class="panel-h"><h2>Aturan akademik</h2><span class="chip">${esc(r.version || '')}</span></div><div class="panel-b">
    <dl class="dl"><dt>Panjang periode</dt><dd>${r.termDays} hari game</dd><dt>Hari belajar</dt><dd>hari ke-1–${r.studyDays}</dd><dt>UTS / UAS</dt><dd>hari ke-${r.midDay}–${r.midDay + 2} / ${r.finalDay}–${r.finalDay + 2}</dd><dt>Passing grade (KKM)</dt><dd>${r.pass}</dd><dt>Kehadiran minimal</dt><dd>${r.minAttendance}%</dd><dt>Tugas minimal</dt><dd>${r.minTasks}%</dd>
    <dt>Bobot nilai</dt><dd>Ujian ${Math.round(w.exam * 100)}% · Tugas ${Math.round(w.tasks * 100)}% · Penguasaan ${Math.round(w.mastery * 100)}% · Hadir ${Math.round(w.attendance * 100)}%</dd></dl>
    <p class="subtle" style="margin:10px 0 0">Periode dipadatkan: 2 periode (1 tahun ajaran = 56 hari game) setara 1 tahun usia karakter. Naik kelas diputuskan di akhir semester genap dari nilai, kehadiran, dan tugas — tidak dari satu klik.</p>
  </div></section>`;
}

// ————————————————————————— 2. Catalog —————————————————————————
let catFilter = null;
async function catalog() {
  view().innerHTML = `<div class="panel"><div class="panel-b">Memuat katalog institusi…</div></div>`;
  const r = await get(`/api/edu/catalog?gameDay=${E.dayNow()}`);
  if (!r.ok) { view().innerHTML = empty('alert', 'Katalog gagal dimuat', esc(r.error)); return; }
  const e = ed(); const suggested = e.status === 'enrolled' ? e.stage : (e.passed.includes('SMP') ? 'SMA' : e.passed.includes('SD') ? 'SMP' : 'SD');
  catFilter ||= e.passed.some(x => x === 'SMA' || x === 'SMK') ? 'PT' : suggested;
  const stages = ['SD', 'SMP', 'SMA', 'SMK', 'PT'];
  const list = r.institutions.filter(i => i.stage === catFilter).sort((a, b) => a.totalStage - b.totalStage);
  view().innerHTML = `
  <div class="row between wrap" style="margin-bottom:12px"><div class="seg" role="group" aria-label="Filter jenjang">${stages.map(s => `<button data-stage="${s}" aria-pressed="${s === catFilter}">${s === 'PT' ? 'Kuliah' : s}</button>`).join('')}</div>
  <span class="subtle">Dana wali ${rp(r.guardianPerTerm)}/periode · semua biaya data simulasi</span></div>
  <div class="grid g-3 edu-cat">${list.map(i => {
    const el = i.eligibility; return `<article class="panel inst-card">
    <div class="panel-b stack" style="gap:10px">
      <div class="row between" style="align-items:flex-start"><div><h3 style="font-size:15px">${esc(i.name)}</h3><div class="subtle">${esc(i.type)} · ${esc(i.city)}${i.degree ? ' · ' + i.degree : ''}</div></div>${el.ok ? chip('pos', 'Memenuhi syarat') : chip('', `${icon('lock', 'width="12" height="12"')}Terkunci`)}</div>
      <div class="subtle">${esc(i.tag)}</div>
      <dl class="dl"><dt>Kualitas institusi</dt><dd>${i.quality} / 100</dd><dt>Daftar + periode 1</dt><dd>${rp(i.enrollTotal)}</dd><dt>Per periode berikutnya</dt><dd>${rp(i.termTotal)}</dd><dt>Estimasi total jenjang</dt><dd>${rp(i.totalStage)}</dd></dl>
      <div class="row wrap" style="gap:6px">${i.coveredByGuardian ? chip('pos', 'Tertutup dana wali per periode') : chip('warn', 'Melebihi dana wali per periode')}${i.programs.length > 1 ? chip('info', `${i.programs.length} jurusan`) : ''}${i.minFinal ? chip('', `Nilai masuk ≥ ${i.minFinal}`) : ''}</div>
      ${el.ok ? '' : `<div class="subtle">${icon('lock', 'width="12" height="12"')} ${esc(el.reasons[0])}</div>`}
      <a class="btn ${el.ok ? 'primary' : ''} block" href="#inst/${i.id}">Lihat detail & biaya</a>
    </div></article>`; }).join('')}</div>
  <p class="subtle">Kualitas institusi memengaruhi kecepatan penguasaan materi saat karakter hadir. Biaya lebih tinggi tidak menjamin nilai lebih baik — kehadiran, tugas, dan ujian tetap menentukan.</p>`;
  $$('[data-stage]').forEach(b => b.addEventListener('click', () => { catFilter = b.dataset.stage; catalog(); }));
}

// ————————————————————————— 3. Institution Details —————————————————————————
function feeTable(q, title) {
  return `<table class="table"><thead><tr><th>${title}</th><th class="r">Jumlah</th></tr></thead><tbody>
  ${q.lines.map(l => `<tr><td>${esc(l.label)}</td><td class="r num">${rp(l.amount)}</td></tr>`).join('')}
  ${q.discounts.map(l => `<tr><td class="pos">${esc(l.label)}</td><td class="r num pos">${rp(l.amount)}</td></tr>`).join('')}
  <tr><td><b>Total</b></td><td class="r num"><b>${rp(q.total)}</b></td></tr></tbody></table>`;
}
async function institution(id) {
  view().innerHTML = `<div class="panel"><div class="panel-b">Memuat detail institusi…</div></div>`;
  const q = await get(`/api/edu/quote/${encodeURIComponent(id)}?gameDay=${E.dayNow()}`);
  if (!q.ok) { view().innerHTML = empty('alert', 'Institusi tidak ditemukan', esc(q.error), '<a class="btn" href="#catalog">Kembali ke katalog</a>'); return; }
  const i = q.institution, el = q.eligibility, r = R();
  view().innerHTML = `
  <a class="btn sm ghost" href="#catalog" style="margin-bottom:10px">← Katalog</a>
  <div class="split"><div class="stack">
    <section class="panel"><div class="panel-b stack">
      <div class="row between wrap"><div><h2 style="font-size:20px">${esc(i.name)}</h2><div class="muted">${esc(STAGE_NAME[i.stage])} · ${esc(i.type)} · ${esc(i.city)}${i.degree ? ` · ${i.degree}, ${i.semesters} semester` : ''}</div></div><span class="chip dark">Kualitas ${i.quality}</span></div>
      <div><b>${i.stage === 'PT' ? 'Program studi' : i.programs.length > 1 ? 'Jurusan' : 'Program'}:</b> ${i.programs.map(esc).join(' · ')}</div>
      <div class="msg info">${icon('info')}<span>${esc(i.tag)}. Data institusi, kurikulum, dan biaya adalah parameter simulasi yang dapat diseimbangkan — bukan data sekolah nyata.</span></div>
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Rincian biaya</h2><span class="subtle">Dihitung server dari data institusi</span></div>
      <div class="grid g-2" style="gap:0"><div class="table-wrap">${feeTable(q.enroll, 'Pendaftaran + periode 1')}</div><div class="table-wrap">${feeTable(q.term, 'Setiap periode berikutnya')}</div></div>
      <div class="panel-b" style="border-top:1px solid var(--border)"><dl class="dl"><dt>Jumlah periode jenjang</dt><dd>${q.terms} ${i.stage === 'PT' ? 'semester' : 'semester (2 per kelas)'}</dd><dt>Estimasi total jika tidak mengulang</dt><dd><b>${rp(q.totalStage)}</b></dd><dt>Dana wali per periode</dt><dd>${rp(q.guardianPerTerm)}</dd><dt>Dana wali tersedia sekarang</dt><dd>${rp(q.wallet)}</dd></dl></div></section>
    <section class="panel"><div class="panel-h"><h2>Jadwal pembayaran</h2></div><ul class="list">
      <li><span class="chip dark">Saat daftar</span><span style="flex:1">Pendaftaran${q.enroll.lines.some(l => l.k === 'entry') ? ', uang pangkal,' : ''} dan biaya periode 1</span><b class="num">${rp(q.enroll.total)}</b></li>
      <li><span class="chip">Tiap periode</span><span style="flex:1">Tagihan terbit di hari ke-1 periode, jatuh tempo hari ke-${r.midDay}. Lewat jatuh tempo: kartu ujian tertahan sampai lunas.</span><b class="num">${rp(q.term.total)}</b></li>
    </ul></section>
  </div><div class="stack">
    <section class="panel"><div class="panel-h"><h2>Syarat masuk</h2></div><div class="panel-b stack">
      ${el.ok ? `<div class="msg ok">${icon('check')}<span>Karakter memenuhi semua syarat masuk (usia ${el.age} tahun).</span></div>` : `<div class="msg error">${icon('lock')}<span><b>Belum memenuhi syarat</b><br>${el.reasons.map(esc).join('<br>')}</span></div>`}
      <ul class="checks">${[[i.stage === 'SD' ? 'Usia minimal 6 tahun' : `Lulus ${i.stage === 'SMP' ? 'SD' : i.stage === 'PT' ? 'SMA/SMK' : 'SMP'}`, !el.reasons.some(x => /Usia|Butuh/.test(x))], ...(q.minFinal ? [[`Nilai akhir jenjang sebelumnya ≥ ${q.minFinal}`, !el.reasons.some(x => /Nilai akhir/.test(x))]] : []), ['Tidak terdaftar di institusi lain', !el.reasons.some(x => /Masih terdaftar/.test(x))]].map(([t, ok]) => `<li class="${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x', 'width="14" height="14"')}${esc(t)}</li>`).join('')}</ul>
      <a class="btn ${el.ok ? 'primary' : ''} block" ${el.ok ? `href="#enroll/${i.id}"` : 'aria-disabled="true" tabindex="-1" style="pointer-events:none;opacity:.55"'}>${icon('task')}Lanjut ke pendaftaran</a>
      <p class="subtle" style="margin:0">Pendaftaran baru diproses setelah kamu meninjau rincian biaya dan memberi konfirmasi.</p>
    </div></section>
    ${rulesCard()}
  </div></div>`;
}

// ————————————————————————— 4. Enrollment —————————————————————————
async function enroll(id) {
  const q = await get(`/api/edu/quote/${encodeURIComponent(id)}?gameDay=${E.dayNow()}`);
  if (!q.ok) { view().innerHTML = empty('alert', 'Institusi tidak ditemukan', esc(q.error)); return; }
  const i = q.institution, el = q.eligibility, fam = V().family[V().profile.family];
  if (!el.ok) { view().innerHTML = `<section class="panel">${empty('lock', 'Pendaftaran tidak tersedia', esc(el.reasons.join('; ')), `<a class="btn" href="#inst/${i.id}">Detail institusi</a> <a class="btn primary" href="#overview">Ringkasan</a>`)}</section>`; return; }
  const waliAvail = q.wallet + fam.perTerm; // kontribusi periode pertama masuk saat pendaftaran
  const needPersonal = Math.max(0, q.enroll.total - waliAvail);
  const bal = E.S.player.balance;
  view().innerHTML = `
  <a class="btn sm ghost" href="#inst/${i.id}" style="margin-bottom:10px">← ${esc(i.name)}</a>
  <form class="panel" id="enroll-form" style="max-width:820px"><div class="panel-h"><h2>Pendaftaran — ${esc(i.name)}</h2><span class="chip">${esc(STAGE_NAME[i.stage])}</span></div>
  <div class="panel-b stack" style="gap:18px">
    <section><h3 class="step"><span>1</span>${i.stage === 'PT' ? 'Program studi' : 'Program / jurusan'}</h3>
      <div class="onb-fam">${i.programs.map((p, k) => `<label class="onb-opt"><input type="radio" name="program" value="${esc(p)}" ${k === 0 ? 'checked' : ''}><span><b>${esc(p)}</b></span></label>`).join('')}</div></section>
    <section><h3 class="step"><span>2</span>Syarat</h3><div class="msg ok">${icon('check')}<span>Semua syarat terpenuhi · usia karakter ${el.age} tahun${q.minFinal ? ` · nilai masuk minimal ${q.minFinal}` : ''}.</span></div></section>
    <section><h3 class="step"><span>3</span>Rincian biaya & sumber dana</h3>
      <div class="table-wrap">${feeTable(q.enroll, 'Dibayar saat pendaftaran')}</div>
      <dl class="dl" style="margin-top:10px"><dt>Dana wali (termasuk kontribusi periode 1)</dt><dd>${rp(waliAvail)}</dd><dt>Dipakai dari dana wali</dt><dd>${rp(Math.min(q.enroll.total, waliAvail))}</dd><dt>Kekurangan dari saldo pribadi</dt><dd class="${needPersonal > bal ? 'neg' : ''}">${rp(needPersonal)}</dd><dt>Saldo pribadi</dt><dd>${rp(bal)}</dd><dt>Tagihan periode berikutnya</dt><dd>${rp(q.term.total)} / periode</dd></dl>
      ${needPersonal > bal ? `<div class="msg error" style="margin-top:10px">${icon('alert')}<span>Dana belum cukup. Pilih institusi yang lebih terjangkau di katalog.</span></div>` : ''}</section>
    <section><h3 class="step"><span>4</span>Konfirmasi</h3>
      <label class="row" style="align-items:flex-start;gap:10px"><input type="checkbox" name="ack" style="margin-top:3px"><span>Saya sudah meninjau total biaya <b>${rp(q.enroll.total)}</b>, jadwal tagihan per periode (${rp(q.term.total)}, jatuh tempo hari ke-${R().midDay}), dan aturan kelulusan. Biaya akan dicatat di riwayat pembayaran pendidikan.</span></label></section>
    <div class="msg error" id="enroll-err" hidden></div>
  </div>
  <div class="dlg-f" style="position:static"><a class="btn" href="#inst/${i.id}">Batal</a><button class="btn primary" type="submit" ${needPersonal > bal ? 'disabled' : ''}>${icon('check')}Daftar sekarang</button></div></form>`;
  $('#enroll-form').addEventListener('submit', async ev => {
    ev.preventDefault(); const f = ev.target, err = $('#enroll-err');
    if (!f.ack.checked) { err.hidden = false; err.innerHTML = `${icon('alert')}<span>Centang konfirmasi biaya terlebih dahulu.</span>`; return; }
    await E.forceSave();
    const r = await act(() => post('/api/edu/enroll', { institutionId: i.id, program: f.program.value, acknowledged: true, personalAmount: needPersonal, gameDay: E.dayNow() }));
    if (!r?.ok) { err.hidden = false; err.innerHTML = `${icon('alert')}<span>${esc(r?.error || 'Gagal')}</span>`; return; }
    if (r.charged?.personal) E.chargeEducation(r.charged.personal, `Pendaftaran ${i.name} (saldo pribadi)`);
    E.S.player.education = r.edu.highest; E.save();
    toast(`Terdaftar di ${i.name}. Periode pertama dimulai besok (hari game ${E.dayNow() + 2}).`);
    location.hash = 'overview';
  });
}

// ————————————————————————— 5. Timetable —————————————————————————
const SLOTS = ['07.00–08.20', '08.30–09.50', '10.10–11.30'];
function dayKind(td) {
  const w = ed().windows, r = R();
  if (td >= w.mid[0] && td <= w.mid[1]) return ['UTS', 'warn'];
  if (td >= w.final[0] && td <= w.final[1]) return ['UAS', 'warn'];
  if (td <= r.studyDays) return ['Belajar', ''];
  if (td >= w.remedial[0] && td <= w.remedial[1]) return ['Remedial', 'neg'];
  if (td === w.report) return ['Rapor', 'pos'];
  return ['Libur', 'flat'];
}
function notEnrolled(what) { view().innerHTML = `<section class="panel">${empty('school', `${what} muncul setelah terdaftar`, 'Daftarkan karakter di institusi pendidikan terlebih dahulu. Biaya dan syarat ditampilkan sebelum mendaftar.', '<a class="btn primary" href="#catalog">Buka katalog sekolah</a>')}</section>`; }
async function timetable() {
  const e = ed(); if (e.status !== 'enrolled') return notEnrolled('Jadwal kelas');
  const td = e.termDay, subs = e.subjects, w = e.windows;
  const order = d => subs.map((_, k) => subs[(k + d) % subs.length]);
  const attBy = Object.fromEntries(e.attendanceLog.map(a => [a.termDay, a.status]));
  const markers = d => [...(w.tasks.includes(d) ? ['Tugas terbit'] : []), ...(w.tasks.map(x => x + w.taskDue).includes(d) ? ['Batas tugas'] : []), ...w.modules.map((m, k) => m[0] === d ? `Mulai materi ${k + 1}` : null).filter(Boolean)];
  view().innerHTML = `
  <div class="split"><div class="stack">
    <section class="panel"><div class="panel-h"><h2>Jadwal hari ini · hari periode ke-${td}</h2><span class="subtle">${fmtDay(E.dayNow(), 'wd')}</span></div>
      ${td <= R().studyDays ? `<div class="table-wrap"><table class="table"><thead><tr><th>Jam</th><th>Mata pelajaran</th><th class="hide-m">Materi diajarkan</th></tr></thead><tbody>${order(td).map((s, k) => { const mods = s.modules.filter(m => m.taught); const m = mods[mods.length - 1]; return `<tr><td class="num">${SLOTS[k]}</td><td><b>${esc(s.name)}</b><div class="subtle show-m">${esc(m?.name || '')}</div></td><td class="hide-m">${esc(m?.name || '—')}</td></tr>`; }).join('')}</tbody></table></div>` : `<div class="panel-b muted">Tidak ada kelas hari ini (${dayKind(td)[0].toLowerCase()}).</div>`}
      <div class="panel-b subtle" style="border-top:1px solid var(--border)">Periode dipadatkan: setiap hari game pada hari ke-1–${R().studyDays} adalah hari sekolah. Kehadiran dicatat otomatis saat hari berganti; karakter bisa sakit (ditentukan seed).</div></section>
    <section class="panel"><div class="panel-h"><h2>Kalender periode</h2><span class="subtle">${esc(e.labelTerm)}</span></div><div class="panel-b">
      <div class="cal">${Array.from({ length: R().termDays }, (_, k) => { const d = k + 1, [kind, tone] = dayKind(d), a = attBy[d], mk = markers(d); return `<div class="cal-d ${d === td ? 'today' : ''} ${d < td ? 'past' : ''}"><div class="row between"><b>${d}</b><span class="chip ${tone}" style="font-size:10.5px;padding:0 6px">${kind}</span></div><div class="subtle" style="font-size:11px">${fmtDay(termDay(d), 'short')}</div>${a ? `<div class="att ${a}">${a === 'hadir' ? 'Hadir' : 'Sakit'}</div>` : ''}${mk.map(m => `<div class="mk">${esc(m)}</div>`).join('')}</div>`; }).join('')}</div>
    </div></section>
  </div><div class="stack">
    <section class="panel"><div class="panel-h"><h2>Rekap kehadiran</h2></div><div class="panel-b">
      <dl class="dl"><dt>Hadir</dt><dd>${e.attendanceLog.filter(a => a.status === 'hadir').length} hari</dd><dt>Sakit</dt><dd>${e.attendanceLog.filter(a => a.status === 'sakit').length} hari</dd><dt>Hari belajar tersisa</dt><dd>${Math.max(0, R().studyDays - Math.min(td, R().studyDays))} hari</dd><dt>Syarat naik kelas</dt><dd>≥ ${R().minAttendance}%</dd></dl>
      <p class="subtle" style="margin:10px 0 0">Materi yang terlewat karena sakit bisa dikejar dengan membaca modul di Mapel & materi.</p></div></section>
    <section class="panel"><div class="panel-h"><h2>Jadwal penting</h2></div><ul class="list">
      ${[['Materi 1–3', w.modules.map(m => `${m[0]}–${m[1]}`).join(' · ')], ['Tugas terbit', w.tasks.join(' & ') + ` (batas +${w.taskDue} hari)`], ['UTS', `${w.mid[0]}–${w.mid[1]}`], ['UAS', `${w.final[0]}–${w.final[1]}`], ['Remedial', `${w.remedial[0]}–${w.remedial[1]}`], ['Rapor', `${w.report}`]].map(([a, b]) => `<li><span style="flex:1">${a}</span><span class="num subtle">hari ke-${b}</span></li>`).join('')}</ul></section>
  </div></div>`;
}

// ————————————————————————— 6. Subjects & Materials —————————————————————————
async function subjects() {
  const e = ed(); if (e.status !== 'enrolled') return notEnrolled('Mata pelajaran');
  const used = e.studyLog[e.lastDay] || 0, left = R().maxStudyHours - used;
  view().innerHTML = `
  <div class="msg info" style="margin-bottom:14px">${icon('info')}<span>Waktu belajar mandiri hari ini: <b>${used} / ${R().maxStudyHours} jam</b>. Penguasaan naik saat hadir di kelas, membaca modul, dan belajar mandiri. Tidak ada jalan pintas: modul harus dibaca minimal ${R().studySeconds} detik.</span></div>
  <div class="stack">${e.subjects.map(s => { const tasks = e.tasks.filter(t => t.subject === s.id); return `
  <section class="panel"><div class="panel-h"><h2>${esc(s.name)}</h2><span class="subtle">Penguasaan <b class="num">${num(s.current.mastery)}</b> / 100</span></div>
    <div class="panel-b"><div class="bar ${s.current.mastery >= 65 ? 'green' : ''}" role="progressbar" aria-label="Penguasaan ${esc(s.name)}" aria-valuenow="${Math.round(s.current.mastery)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${s.current.mastery}%"></i></div></div>
    <div class="grid g-2" style="gap:0;border-top:1px solid var(--border)">
      <div><div class="panel-h" style="border-bottom:0;padding-bottom:0"><h3 style="font-size:13px">Materi</h3></div><ul class="list">${s.modules.map((m, k) => `<li><span class="chip ${m.read ? 'pos' : m.taught ? 'info' : ''}" style="flex:none">${m.read ? 'Dibaca' : m.taught ? 'Diajarkan' : `Mulai hari ke-${m.window[0]}`}</span><div style="flex:1;min-width:0"><b>${esc(m.name)}</b><div class="subtle">Kesulitan ${'●'.repeat(m.difficulty)}${'○'.repeat(3 - m.difficulty)} · hari ke-${m.window[0]}–${m.window[1]}</div></div><button class="btn sm" data-read="${m.id}" ${m.taught ? '' : 'disabled'}>${icon('book')}${m.read ? 'Ulangi' : 'Baca'}</button></li>`).join('')}</ul></div>
      <div style="border-left:1px solid var(--border)"><div class="panel-h" style="border-bottom:0;padding-bottom:0"><h3 style="font-size:13px">Tugas</h3></div><ul class="list">${tasks.length ? tasks.map(t => `<li><div style="flex:1"><b>${esc(t.title)}</b><div class="subtle">Batas hari ke-${t.dueTermDay}${t.score != null ? ` · nilai ${num(t.score)}` : ''}</div></div>${t.status === 'open' ? `<button class="btn sm primary" data-task="${t.id}">Kerjakan</button>` : chip(t.status === 'selesai' ? 'pos' : 'neg', t.status === 'selesai' ? 'Selesai' : 'Terlambat (0)')}</li>`).join('') : `<li class="muted">Tugas terbit hari ke-${e.windows.tasks.join(' & ')}.</li>`}</ul>
        <div class="panel-b row wrap" style="border-top:1px solid var(--border);gap:8px"><span class="subtle" style="flex:1">Belajar mandiri</span>${[1, 2, 3].map(h => `<button class="btn sm" data-study="${s.id}" data-h="${h}" ${h > left ? 'disabled' : ''}>${h} jam</button>`).join('')}</div></div>
    </div></section>`; }).join('')}</div>`;
}
function reader(moduleId) {
  const s = ed().subjects.find(x => x.modules.some(m => m.id === moduleId)), m = s.modules.find(x => x.id === moduleId);
  let left = R().studySeconds, timer = null;
  openDialog(`<div class="dlg-h"><h2>${esc(m.name)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack"><div class="subtle">${esc(s.name)} · ${esc(ed().labelTerm)} · kesulitan ${m.difficulty}/3</div><p style="margin:0;line-height:1.6">${esc(m.body)}</p>
  ${m.points?.length ? `<div><b>Poin & contoh</b><ul style="margin:6px 0 0;padding-left:18px">${m.points.map(p => `<li>${esc(p)}</li>`).join('')}</ul></div>` : ''}</div>
  <div class="dlg-f"><span class="subtle" id="rd-t" style="margin-right:auto" aria-live="polite"></span><button class="btn primary" id="rd-done" disabled>Tandai selesai dibaca</button></div>`, {
    onMount: async d => {
      const r = await post('/api/edu/read', { moduleId, phase: 'start' }); if (!r.ok) { toast(r.error, 'error'); d.close(); return; }
      const t = d.querySelector('#rd-t'), b = d.querySelector('#rd-done');
      const tick = () => { t.textContent = left > 0 ? `Baca dulu… ${left} detik` : 'Siap ditandai'; if (left <= 0) { b.disabled = false; clearInterval(timer); } left--; };
      tick(); timer = setInterval(tick, 1000);
      d.addEventListener('close', () => clearInterval(timer));
      b.addEventListener('click', async () => { const x = await act(() => post('/api/edu/read', { moduleId, phase: 'finish' }), 'Materi selesai dibaca. Penguasaan bertambah (sekali per modul).'); if (x?.ok) { d.close(); subjects(); } });
    }
  });
}

// ————————————————————————— Kuis/ujian: ruang fokus —————————————————————————
function examRoom(sess, { title, timed }) {
  return new Promise(resolve => {
    const wasPaused = E.S.settings.paused; E.setPaused(true);
    const qs = sess.questions, ans = qs.map(() => null); let cur = 0, timer = null;
    const deadline = timed ? Date.now() + sess.seconds * 1000 : null;
    const room = document.createElement('div'); room.className = 'exam-room'; room.setAttribute('role', 'dialog'); room.setAttribute('aria-modal', 'true'); room.setAttribute('aria-label', title);
    document.body.appendChild(room);
    const finish = async (auto = false) => {
      if (!auto && ans.some(a => a == null) && !confirm(`${ans.filter(a => a == null).length} soal belum dijawab dan akan dinilai salah. Kirim jawaban?`)) return;
      clearInterval(timer); const sb = room.querySelector('[data-submit]'); if (sb) sb.disabled = true;
      const r = await post('/api/edu/submit', { sessionId: sess.sessionId, answers: ans });
      room.remove(); if (!wasPaused) E.setPaused(false);
      if (r.ok) E.setEdu(r); else toast(r.error, 'error');
      resolve(r);
    };
    const render = () => {
      const q = qs[cur];
      room.innerHTML = `<div class="exam-top"><div><b>${esc(title)}</b><div class="subtle">${qs.length} soal · ${sess.pointsPerQuestion ?? Math.round(100 / qs.length * 100) / 100} poin/soal · passing grade ${sess.passing ?? R().pass}</div></div>${timed ? `<div class="exam-timer" id="ex-t" aria-live="off"></div>` : '<span class="chip">Tanpa batas waktu</span>'}</div>
      <div class="exam-body"><nav class="exam-nav" aria-label="Navigasi soal">${qs.map((_, k) => `<button data-go="${k}" class="${k === cur ? 'cur' : ''} ${ans[k] != null ? 'ans' : ''}" aria-label="Soal ${k + 1}${ans[k] != null ? ', terjawab' : ''}">${k + 1}</button>`).join('')}</nav>
      <section class="exam-q"><div class="subtle">Soal ${cur + 1} dari ${qs.length} · ${q.type === 'benar-salah' ? 'Benar / salah' : 'Pilihan ganda'} · kesulitan ${q.difficulty}/3</div>
        <h2>${esc(q.q)}</h2>
        <div class="opts" role="radiogroup">${q.options.map((o, j) => `<label class="opt ${ans[cur] === j ? 'sel' : ''}"><input type="radio" name="o" value="${j}" ${ans[cur] === j ? 'checked' : ''}><span class="k">${String.fromCharCode(65 + j)}</span><span>${esc(o)}</span></label>`).join('')}</div>
        <div class="row between" style="margin-top:18px"><button class="btn" data-prev ${cur === 0 ? 'disabled' : ''}>Sebelumnya</button>${cur < qs.length - 1 ? '<button class="btn primary" data-next>Berikutnya</button>' : '<button class="btn primary" data-submit>Kirim jawaban</button>'}</div>
      </section></div>
      <div class="exam-foot subtle">Jawaban dinilai di server. Kunci jawaban dan pembahasan baru ditampilkan setelah dikirim. Simulasi dijeda selama ujian.</div>`;
      if (cur === qs.length - 1) room.querySelector('[data-submit]').addEventListener('click', () => finish());
      else room.querySelector('[data-submit]')?.remove();
      room.querySelectorAll('input[name=o]').forEach(inp => inp.addEventListener('change', () => { ans[cur] = +inp.value; render(); }));
      room.querySelectorAll('[data-go]').forEach(b => b.addEventListener('click', () => { cur = +b.dataset.go; render(); }));
      room.querySelector('[data-prev]').addEventListener('click', () => { cur--; render(); });
      room.querySelector('[data-next]')?.addEventListener('click', () => { cur++; render(); });
      paint();
    };
    const paint = () => { if (!timed) return; const s = Math.max(0, Math.round((deadline - Date.now()) / 1000)); const t = room.querySelector('#ex-t'); if (t) { t.textContent = `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; t.classList.toggle('low', s <= 60); } if (s <= 0) { toast('Waktu habis. Jawaban dikirim otomatis.', 'error'); finish(true); } };
    render(); if (timed) timer = setInterval(paint, 1000);
  });
}
function reviewDialog(res, title) {
  openDialog(`<div class="dlg-h"><h2>Hasil: ${esc(title)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack">
    <div class="row wrap" style="gap:16px"><div><div class="subtle">Nilai</div><div style="font-size:28px;font-weight:700" class="num">${num(res.score, 1)}</div></div><div><div class="subtle">Benar</div><div style="font-size:20px;font-weight:700">${res.correct} / ${res.total}</div></div><div><div class="subtle">Passing grade</div><div style="font-size:20px;font-weight:700">${res.passing ?? R().pass}</div></div>${chip(res.passed ? 'pos' : 'neg', res.passed ? 'Tuntas' : 'Belum tuntas')}</div>
    ${res.late ? `<div class="msg error">${icon('alert')}<span>Jawaban dikirim setelah batas waktu sehingga tidak dinilai.</span></div>` : ''}
    <h3>Pembahasan</h3>
    <ol class="review">${res.review.map(r => `<li class="${r.ok ? 'ok' : 'no'}"><b>${esc(r.q)}</b><div>Jawabanmu: ${r.chosen == null ? '<i>tidak dijawab</i>' : esc(r.options[r.chosen])} ${r.ok ? chip('pos', 'Benar') : chip('neg', 'Salah')}</div>${r.ok ? '' : `<div>Jawaban benar: <b>${esc(r.options[r.correct])}</b></div>`}<div class="subtle">${esc(r.explanation)}</div></li>`).join('')}</ol>
  </div><div class="dlg-f"><button class="btn primary" data-close>Tutup</button></div>`, { wide: true });
}
async function doTask(taskId) {
  const t = ed().tasks.find(x => x.id === taskId);
  const s = await act(() => post('/api/edu/task/start', { taskId })); if (!s?.ok) return;
  const r = await examRoom(s, { title: `${subjName(t.subject)} — ${t.title}`, timed: false });
  if (r?.ok) { reviewDialog(r.result, t.title); route(); }
}

// ————————————————————————— 7. Exam Room —————————————————————————
function examStatus(s, kind) {
  const e = ed(), td = e.termDay, w = e.windows[kind], x = e.exams[`${s.id}:${kind}`];
  const unpaid = e.bills.find(b => b.paid < b.amount && td >= b.dueTermDay);
  if (x?.status === 'selesai') return { st: 'done', label: `Selesai · ${num(x.score, 1)}`, tone: x.score >= R().pass ? 'pos' : 'neg' };
  if (x?.status === 'tidak-ikut') return { st: 'missed', label: 'Tidak ikut (0)', tone: 'neg' };
  if (kind === 'remedial' && s.current.grade >= R().pass) return { st: 'na', label: 'Tidak perlu', tone: '' };
  if (td < w[0]) return { st: 'soon', label: `Dibuka hari ke-${w[0]}`, tone: '' };
  if (td > w[1]) return { st: 'closed', label: 'Ditutup', tone: '' };
  if (unpaid) return { st: 'blocked', label: 'Kartu ujian tertahan', tone: 'warn', why: `${unpaid.label} belum lunas (sisa ${rp(unpaid.amount - unpaid.paid)}).` };
  if (x?.status === 'berlangsung') return { st: 'open', label: 'Lanjutkan sesi', tone: 'warn' };
  return { st: 'open', label: `Terbuka s.d. hari ke-${w[1]}`, tone: 'info' };
}
async function exam() {
  const e = ed(); if (e.status !== 'enrolled') return notEnrolled('Ruang ujian');
  const r = R();
  view().innerHTML = `
  <div class="split"><div class="stack">${['mid', 'final', 'remedial'].map(kind => `
    <section class="panel"><div class="panel-h"><h2>${KIND[kind]}</h2><span class="subtle">Hari ke-${e.windows[kind][0]}–${e.windows[kind][1]}</span></div>
    <ul class="list">${e.subjects.map(s => { const x = examStatus(s, kind); return `<li><div style="flex:1;min-width:0"><b>${esc(s.name)}</b><div class="subtle">${x.why ? esc(x.why) : kind === 'remedial' ? `Nilai sementara ${num(s.current.grade, 1)} · remedial menaikkan nilai maksimal ke ${r.pass}` : `Materi diajarkan: ${s.modules.filter(m => m.taught).length} dari ${s.modules.length}`}</div></div>${chip(x.tone, x.label)}${x.st === 'open' ? `<button class="btn sm primary" data-exam="${s.id}" data-kind="${kind}">Mulai</button>` : x.st === 'done' ? `<button class="btn sm" data-res="${s.id}:${kind}">Pembahasan</button>` : x.st === 'blocked' ? '<a class="btn sm" href="#overview">Bayar</a>' : ''}</li>`; }).join('')}</ul></section>`).join('')}
  </div><div class="stack">
    <section class="panel"><div class="panel-h"><h2>Tata tertib ujian</h2></div><div class="panel-b"><dl class="dl"><dt>Jumlah soal</dt><dd>6</dd><dt>Batas waktu</dt><dd>${Math.round(r.examSeconds / 60)} menit (waktu nyata)</dd><dt>Nilai per soal</dt><dd>${num(100 / 6, 2)}</dd><dt>Passing grade</dt><dd>${r.pass}</dd><dt>Bentuk soal</dt><dd>Pilihan ganda, benar/salah</dd></dl>
    <p class="subtle" style="margin:10px 0 0">Soal dipilih server dari bank soal sesuai jenjang, kelas/semester, mata pelajaran, tingkat kesulitan, dan materi yang sudah diajarkan — memakai seed yang dapat direproduksi. Satu kesempatan per ujian; ujian yang terlewat bernilai 0 dan bisa diperbaiki lewat remedial.</p></div></section>
  </div></div>`;
}
async function startExam(subject, kind) {
  const e = ed(), s = e.subjects.find(x => x.id === subject), taught = s.modules.filter(m => m.taught);
  openDialog(`<div class="dlg-h"><h2>${KIND[kind]} — ${esc(s.name)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack"><dl class="dl"><dt>Jenjang / periode</dt><dd>${esc(e.stage)} · ${esc(e.labelTerm)}</dd><dt>Jumlah soal</dt><dd>6</dd><dt>Batas waktu</dt><dd>${Math.round(R().examSeconds / 60)} menit</dd><dt>Nilai per soal</dt><dd>${num(100 / 6, 2)}</dd><dt>Passing grade</dt><dd>${R().pass}</dd></dl>
  <div><b>Materi yang diujikan</b><ul style="margin:6px 0 0;padding-left:18px">${taught.map(m => `<li>${esc(m.name)} ${m.read ? '' : '<span class="subtle">(belum dibaca mandiri)</span>'}</li>`).join('')}</ul></div>
  <div class="msg warn">${icon('alert')}<span>Setelah dimulai, timer berjalan walau halaman ditutup. Hanya satu kesempatan.</span></div></div>
  <div class="dlg-f"><button class="btn" data-close>Nanti</button><button class="btn primary" id="go">Mulai ujian</button></div>`, {
    onMount: d => d.querySelector('#go').addEventListener('click', async () => {
      d.close();
      const sess = await act(() => post('/api/edu/exam/start', { subject, kind, gameDay: E.dayNow() })); if (!sess?.ok) return;
      const r = await examRoom(sess, { title: `${KIND_SHORT[kind]} ${s.name}`, timed: true });
      if (r?.ok) { reviewDialog(r.result, `${KIND_SHORT[kind]} ${s.name}`); exam(); }
    })
  });
}
async function showResult(key) {
  const e = ed(); const [subject, kind] = key.split(':');
  const row = V().results.find(x => x.ref === key && x.termKey?.startsWith(`${e.stage}-${e.grade}-${e.term}`));
  if (!row) return toast('Hasil belum tersedia.', 'error');
  const r = await get(`/api/edu/result/${row.id}`); if (!r.ok) return toast(r.error, 'error');
  reviewDialog({ ...r.result, passed: !!r.result.passed, passing: R().pass }, `${KIND_SHORT[kind]} ${subjName(subject)}`);
}

// ————————————————————————— 8. Results & Report Card —————————————————————————
function reportTable(rep) {
  return `<div class="table-wrap"><table class="table"><thead><tr><th>Mata pelajaran</th><th class="r">UTS</th><th class="r">UAS</th><th class="r hide-m">Tugas</th><th class="r hide-m">Penguasaan</th><th class="r hide-m">Hadir</th><th class="r">Nilai akhir</th><th>Status</th></tr></thead><tbody>
  ${rep.rows.map(r => `<tr><td><b>${esc(r.name)}</b>${r.remedied ? '<div class="subtle">Remedial: dinaikkan ke KKM</div>' : ''}</td><td class="r num">${num(r.mid)}</td><td class="r num">${num(r.final_exam)}</td><td class="r num hide-m">${num(r.tasks)}</td><td class="r num hide-m">${num(r.mastery)}</td><td class="r num hide-m">${num(r.attendance)}%</td><td class="r num"><b>${num(r.grade, 1)}</b></td><td>${chip(r.passed ? 'pos' : 'neg', r.passed ? 'Tuntas' : 'Belum tuntas')}</td></tr>`).join('')}
  </tbody></table></div>`;
}
async function results() {
  const e = ed(), reps = [...e.reports].reverse();
  const live = e.status === 'enrolled' && !(e.termDay >= e.windows.report && e.reports.some(r => r.termKey?.startsWith(`${e.stage}-${e.grade}-${e.term}`) && r.day >= e.termStartDay));
  const w = R().weights;
  view().innerHTML = `
  <div class="stack">
  ${live ? `<section class="panel"><div class="panel-h"><h2>Proyeksi periode berjalan · ${esc(e.labelTerm)}</h2>${chip('warn', 'Belum final')}</div>${reportTable({ rows: e.subjects.map(s => s.current) })}
    <div class="panel-b subtle" style="border-top:1px solid var(--border)">Rumus: ${Math.round(w.exam * 100)}% ujian (UTS 40% + UAS 60%) + ${Math.round(w.tasks * 100)}% tugas + ${Math.round(w.mastery * 100)}% penguasaan + ${Math.round(w.attendance * 100)}% kehadiran. Rapor final terbit hari ke-${e.windows.report}.</div></section>` : ''}
  ${reps.length ? reps.map((rep, k) => { const [tone, label] = DECISION[rep.decision] || ['', rep.decision]; return `
    <section class="panel" ${k > 0 ? '' : 'id="latest"'}><div class="panel-h"><div><h2>Rapor ${esc(rep.label)}</h2><div class="subtle">${esc(rep.institution)} · ${esc(rep.program)} · rata-rata <b>${num(rep.average, 1)}</b></div></div>${chip(tone, label)}</div>
      ${reportTable(rep)}
      <div class="panel-b" style="border-top:1px solid var(--border)"><ul class="checks">${rep.checks.map(c => `<li class="${c.ok ? 'ok' : c.soft ? 'soft' : 'no'}">${icon(c.ok ? 'check' : c.soft ? 'info' : 'x', 'width="14" height="14"')}<span>${esc(c.label)} — <span class="subtle">${esc(c.detail)}</span></span></li>`).join('')}</ul>
      <p class="subtle" style="margin:8px 0 0">${rep.decisionTerm ? 'Keputusan naik kelas/lulus diambil di semester ini.' : 'Semester ganjil: hasil menjadi peringatan dini, keputusan naik kelas di semester genap.'} Sakit: ${rep.absences.sakit} hari.</p></div></section>`; }).join('') : (live ? '' : `<section class="panel">${empty('chart', 'Belum ada rapor', 'Rapor terbit di akhir setiap periode setelah daftar sekolah.', '<a class="btn primary" href="#catalog">Katalog sekolah</a>')}</section>`)}
  ${V().results.length ? `<section class="panel"><div class="panel-h"><h2>Riwayat ujian & tugas</h2><span class="subtle">Tersimpan di server</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Jenis</th><th>Mapel</th><th class="hide-m">Periode</th><th class="r">Benar</th><th class="r">Nilai</th><th></th></tr></thead><tbody>
    ${V().results.slice(0, 30).map(x => `<tr><td>${x.kind === 'task' ? 'Tugas' : KIND_SHORT[x.kind] || x.kind}</td><td>${esc(x.subject ? subjName(x.subject) : '')}</td><td class="hide-m subtle">${esc(x.termKey)}</td><td class="r num">${x.correct}/${x.total}</td><td class="r num"><b>${num(x.score, 1)}</b></td><td><button class="btn sm ghost" data-rid="${x.id}">Pembahasan</button></td></tr>`).join('')}</tbody></table></div></section>` : ''}
  </div>`;
}

// ————————————————————————— 9. Graduation Records —————————————————————————
const eduRank = x => EDUCATION_LEVELS.indexOf(x);
function oppStatus(o) {
  const e = ed(), age = V().age, need = o.need, stages = [].concat(need.stage);
  const has = stages.some(s => e.passed.includes(s) || (e.status === 'enrolled' && e.stage === s));
  const progOk = !need.program || e.program === need.program || e.history.some(h => h.program === need.program);
  const grade = Math.max(0, ...stages.map(s => e.finalByStage[s] || 0), e.status === 'enrolled' && stages.includes(e.stage) && e.reports.length ? e.reports[e.reports.length - 1].average : 0);
  const reasons = []; if (!has) reasons.push(`Butuh ${stages.join('/')}`); if (!progOk) reasons.push(`Jurusan ${need.program}`); if (need.minGrade && grade < need.minGrade) reasons.push(`Nilai ≥ ${need.minGrade}`); if (age < need.age) reasons.push(`Usia ≥ ${need.age} (kini ${age})`);
  return reasons;
}
async function records() {
  const v = V(), e = v.edu, recs = [...v.records].reverse();
  const jobs = E.JOB_CATALOG.filter(j => j.type !== 'gig').reduce((m, j) => ((m[j.education] ||= []).push(j), m), {});
  view().innerHTML = `
  <div class="split"><div class="stack">
    ${recs.length ? recs.map(r => `
    <article class="ijazah" aria-label="Catatan kelulusan fiktif ${esc(r.recordId)}">
      <div class="wm" aria-hidden="true">DOKUMEN FIKTIF DALAM GAME</div>
      <div class="ij-head"><span class="brand-mark">BZ</span><div><div class="ij-k">BIZSIM · CATATAN KELULUSAN SIMULASI</div><div class="ij-t">${esc(STAGE_NAME[r.stage])}${r.degree ? ` (${r.degree})` : ''}</div></div>${r.characterId === v.charId ? chip('dark', 'Karakter aktif') : chip('', 'Karakter sebelumnya')}</div>
      <dl class="dl ij-dl"><dt>Nama karakter</dt><dd>${esc(r.characterName)}</dd><dt>Institusi</dt><dd>${esc(r.institution)}, ${esc(r.city)}</dd><dt>Jenjang & jurusan</dt><dd>${esc(r.stage)} · ${esc(r.program)}</dd><dt>Tahun kelulusan simulasi</dt><dd>${r.graduationYear}</dd><dt>Nilai akhir</dt><dd><b>${num(r.finalGrade, 1)}</b></dd><dt>Status</dt><dd>${esc(r.status)}</dd><dt>ID record pendidikan</dt><dd class="mono">${esc(r.recordId)}</dd></dl>
      <div class="ij-foot">Dokumen ini fiktif dan hanya berlaku di dalam game BizSim. Bukan ijazah atau dokumen resmi, tidak dapat digunakan di luar game. Aturan ${esc(r.rulesVersion)} · ${r.terms} periode.</div>
    </article>`).join('') : `<section class="panel">${empty('doc', 'Belum ada catatan kelulusan', 'Catatan kelulusan dibuat server secara permanen saat karakter lulus satu jenjang (mis. setelah SD kelas 6 semester genap).', '<a class="btn" href="#overview">Lihat progres</a>')}</section>`}
    <section class="panel"><div class="panel-h"><h2>Riwayat pendidikan</h2></div><ul class="list">${e.history.length ? [...e.history].reverse().map(h => `<li><span class="chip ${h.status === 'Lulus' ? 'pos' : /Mengulang/.test(h.status) ? 'neg' : 'info'}">${esc(h.status)}</span><div style="flex:1"><b>${esc(h.institution)}</b><div class="subtle">${esc(h.stage)} · ${esc(h.program)} · hari game ${h.from + 1}${h.to != null ? `–${h.to + 1}` : ' – sekarang'}</div></div>${h.recordId ? `<span class="mono subtle hide-m">${esc(h.recordId)}</span>` : ''}</li>`).join('') : '<li class="muted">Belum ada riwayat.</li>'}</ul></section>
  </div><div class="stack">
    <section class="panel"><div class="panel-h"><h2>Peluang dari pendidikan</h2></div><div class="panel-b subtle" style="padding-bottom:0">Menunjukkan syarat yang sudah/ belum terpenuhi. Ini bukan tawaran dan tidak menjamin diterima.</div>
      <ul class="list">${OPPORTUNITIES.map(o => { const rs = oppStatus(o); return `<li style="align-items:flex-start"><span class="chip ${rs.length ? '' : 'pos'}" style="flex:none">${o.kind}</span><div style="flex:1"><b>${esc(o.title)}</b><div class="subtle">${esc(o.org)} · ${rs.length ? `${icon('lock', 'width="11" height="11"')} ${esc(rs.join(' · '))}` : 'Syarat pendidikan terpenuhi'}</div></div></li>`; }).join('')}</ul></section>
    <section class="panel"><div class="panel-h"><h2>Lowongan menurut pendidikan</h2><a class="btn sm ghost" href="career.html">Career</a></div><ul class="list">
      ${Object.entries(jobs).sort((a, b) => eduRank(a[0]) - eduRank(b[0])).map(([lvl, js]) => { const ok = eduRank(E.S.player.education) >= eduRank(lvl); return `<li style="align-items:flex-start">${icon(ok ? 'check' : 'lock', 'width="16" height="16" style="flex:none;margin-top:2px"')}<div style="flex:1"><b>Pendidikan ${esc(lvl)}</b><div class="subtle">${js.map(j => esc(j.title)).join(' · ')}</div></div>${chip(ok ? 'pos' : '', ok ? 'Terpenuhi' : 'Belum')}</li>`; }).join('')}
    </ul><div class="panel-b subtle" style="border-top:1px solid var(--border)">Pendidikan tertinggi tercatat: <b>${esc(E.S.player.education)}</b>. Lowongan juga mensyaratkan usia, skill, dan pengalaman.</div></section>
  </div></div>`;
}

// ————————————————————————— aksi —————————————————————————
async function payBill(id) {
  const e = ed(), b = e.bills.find(x => x.id === id); if (!b) return;
  const due = b.amount - b.paid, bal = E.S.player.balance;
  openDialog(`<div class="dlg-h"><h2>Bayar ${esc(b.label)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack"><div class="table-wrap">${feeTable({ lines: b.lines, discounts: b.discounts, total: b.amount }, 'Rincian tagihan')}</div>
  <dl class="dl"><dt>Sudah dibayar</dt><dd>${rp(b.paid)}</dd><dt>Sisa</dt><dd><b>${rp(due)}</b></dd><dt>Dana wali</dt><dd>${rp(e.wallet)}</dd><dt>Saldo pribadi</dt><dd>${rp(bal)}</dd></dl></div>
  <div class="dlg-f"><button class="btn" data-src="pribadi" ${bal <= 0 ? 'disabled' : ''}>Saldo pribadi (${rpShort(Math.min(due, bal))})</button><button class="btn primary" data-src="wali" ${e.wallet <= 0 ? 'disabled' : ''}>Dana wali (${rpShort(Math.min(due, e.wallet))})</button></div>`, {
    onMount: d => d.querySelectorAll('[data-src]').forEach(btn => btn.addEventListener('click', async () => {
      const src = btn.dataset.src; const amount = src === 'pribadi' ? Math.min(due, Math.floor(E.S.player.balance)) : undefined;
      if (src === 'pribadi') await E.forceSave();
      const r = await act(() => post('/api/edu/pay', { billId: id, source: src, amount }));
      if (r?.ok) { if (src === 'pribadi') E.chargeEducation(r.charged.amount, `Bayar ${b.label} (saldo pribadi)`); toast(`Pembayaran ${rp(r.charged.amount)} tercatat.`); d.close(); route(); }
    }))
  });
}
page.addEventListener('click', async ev => {
  const t = ev.target.closest('[data-read],[data-task],[data-study],[data-exam],[data-res],[data-rid],[data-paybill]'); if (!t) return;
  ev.preventDefault();
  if (t.dataset.read) reader(t.dataset.read);
  else if (t.dataset.task) doTask(t.dataset.task);
  else if (t.dataset.study) { const r = await act(() => post('/api/edu/study', { subject: t.dataset.study, hours: +t.dataset.h }), `Belajar mandiri ${t.dataset.h} jam tercatat.`); if (r?.ok) subjects(); }
  else if (t.dataset.exam) startExam(t.dataset.exam, t.dataset.kind);
  else if (t.dataset.res) showResult(t.dataset.res);
  else if (t.dataset.rid) { const r = await get(`/api/edu/result/${t.dataset.rid}`); if (r.ok) reviewDialog({ ...r.result, passed: !!r.result.passed, passing: R().pass }, 'Riwayat'); }
  else if (t.dataset.paybill) payBill(t.dataset.paybill);
});

let lastKey = '';
E.on('edu', () => { // render ulang jika state server berubah (hari baru, nilai baru) — kecuali saat dialog terbuka
  const e = ed(), k = `${e.status}|${e.termDay}|${e.lastDay}|${e.reports.length}|${e.grade}|${e.term}`;
  const r = location.hash.slice(1).split('/')[0];
  if (k !== lastKey && !['inst', 'enroll', 'catalog'].includes(r) && !document.querySelector('dialog[open], .exam-room')) { lastKey = k; route(); }
});
lastKey = (() => { const e = ed(); return `${e.status}|${e.termDay}|${e.lastDay}|${e.reports.length}|${e.grade}|${e.term}`; })();
route();
