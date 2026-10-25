import * as E from '../engine/core.js';
import { fmtDay } from '../engine/calendar.js';
import { TIME_RULES } from '../data/time-rules.js';
import { mountShell } from '../ui/shell.js';
import { rp, rpShort, pct, delta, cls, icon, empty, lineChart, esc, $, $$, toast, fmtDate, num, openDialog, skillLabel } from '../ui/ui.js';

const page = await mountShell('career', 'Karier & Pekerjaan');
const TYPE = { gig: 'Kerja lepas', part: 'Paruh waktu', full: 'Penuh waktu' };
const STATUS = { dikirim: ['Dikirim', 'info'], ditinjau: ['Ditinjau HR', 'info'], evaluasi: ['Perlu evaluasi', 'warn'], menunggu: ['Menunggu keputusan', 'info'], tawaran: ['Tawaran kerja', 'pos'], diterima: ['Diterima', 'pos'], ditolak: ['Tidak lolos', 'neg'], 'ditolak-pemain': ['Kamu tolak', ''], kedaluwarsa: ['Kedaluwarsa', ''] };
const ACTIVE = ['dikirim', 'ditinjau', 'evaluasi', 'menunggu', 'tawaran'];
let tab = location.hash.slice(1) || 'jobs';
let jf = { type: 'all', eligible: false };

page.innerHTML = `<div class="page-head"><div><p>Jalur perkembangan karakter: mulai dari kerja lepas tanpa modal, bangun pengalaman & skill, lalu naik ke posisi yang lebih baik. Peluang diterima adalah estimasi — keputusan akhir dihitung engine saat lamaran diproses.</p></div><span class="sim-badge">SIMULASI</span></div>
<div class="tabs" role="tablist" id="tabs"></div><div id="body" style="margin-top:16px"></div>`;

function tabs() {
  const c = E.S.career, act = c.applications.filter(a => ACTIVE.includes(a.status)).length;
  $('#tabs').innerHTML = [['jobs', 'Lowongan', E.JOB_CATALOG.length], ['applications', 'Status lamaran', act], ['active', 'Pekerjaan aktif', c.job ? 1 : 0], ['skills', 'Skill & pengalaman', null]]
    .map(([k, l, n]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}${n ? `<span class="count">${n}</span>` : ''}</button>`).join('');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; history.replaceState(null, '', '#' + tab); render(); } });

const payTxt = j => j.type === 'full' ? `${rp(j.pay)}/bln` : `${rp(j.pay)}/shift`;
const schedTxt = j => ({ gig: 'Dibayar akhir hari', part: 'Mingguan, tiap Jumat', full: 'Bulanan, tanggal 25' }[j.type]);
const compChip = c => `<span class="chip ${c === 'Tinggi' ? 'neg' : c === 'Sedang' ? 'warn' : 'pos'}">${c}</span>`;
const skillsTxt = j => Object.entries(j.skills).map(([k, v]) => `${skillLabel(k)} ${v}`).join(', ') || 'Tidak ada';
const expTxt = j => j.expDays ? `${j.expDays} hari${j.expIndustry ? ' di ' + j.expIndustry : ''}` : 'Tidak perlu';
function chanceCell(j) {
  if (j.type === 'gig') { const r = E.jobRequirements(j); return r.length ? `<span class="chip neg">Belum memenuhi syarat</span>` : `<span class="chip pos">Langsung kerja</span>`; }
  const r = E.jobRequirements(j); if (r.length) return `<span class="chip neg">Belum memenuhi syarat</span><div class="subtle" style="margin-top:3px">${esc(r[0])}${r.length > 1 ? ` (+${r.length - 1})` : ''}</div>`;
  const e = E.acceptanceEstimate(j); return `<span class="chip ${e.band === 'Tinggi' ? 'pos' : e.band === 'Sedang' ? 'warn' : 'neg'}">${e.band}</span> <span class="subtle num">est. ${Math.round(e.lo * 100)}–${Math.round(e.hi * 100)}%</span>`;
}

function jobsView() {
  let list = E.JOB_CATALOG;
  if (jf.type !== 'all') list = list.filter(j => j.type === jf.type);
  if (jf.eligible) list = list.filter(j => !E.jobRequirements(j).length);
  const c = E.S.career, noIncome = !c.job && E.S.player.balance < 100_000;
  return `${noIncome ? `<div class="msg info" style="margin-bottom:14px">${icon('info')}<span><b>Saldo awal Rp 0 bukan jalan buntu.</b> Kerja lepas (Bantu Angkut Pasar, Kurir Paket Harian) tidak butuh modal, ijazah, atau lamaran — ambil shift dan upah dibayar di akhir hari. Gunakan sambil melamar pekerjaan tetap.</span></div>` : ''}
  <div class="filters" style="margin-bottom:12px"><div class="seg" role="group" aria-label="Jenis pekerjaan">${[['all', 'Semua'], ['gig', 'Kerja lepas'], ['part', 'Paruh waktu'], ['full', 'Penuh waktu']].map(([k, l]) => `<button data-jt="${k}" aria-pressed="${jf.type === k}">${l}</button>`).join('')}</div>
  <label class="row" style="font-size:13px;gap:6px"><input type="checkbox" id="jf-el" ${jf.eligible ? 'checked' : ''}> Hanya yang memenuhi syarat</label><span class="subtle" style="margin-left:auto">${list.length} lowongan</span></div>
  <section class="panel">${list.length ? `<ul class="list show-m">${list.map(j => `<li class="clickable" data-job="${j.id}" style="flex-direction:column;align-items:stretch;gap:6px;cursor:pointer"><div class="row between" style="align-items:flex-start"><div><b>${esc(j.title)}</b><div class="subtle">${esc(j.company)} · ${j.industry}</div></div><div style="text-align:right;white-space:nowrap"><b>${payTxt(j)}</b><div class="subtle">${TYPE[j.type]}</div></div></div><div class="subtle" style="font-size:12px">${j.education} · Skill: ${skillsTxt(j)} · Pengalaman: ${expTxt(j)} · ${j.type === 'gig' ? j.shiftHours + ' j/shift' : j.hoursPerWeek + ' j/minggu'} · Persaingan ${j.competition}</div><div>${chanceCell(j)}</div></li>`).join('')}</ul><div class="table-wrap hide-m"><table class="table"><thead><tr><th>Jabatan</th><th class="hide-m">Industri</th><th class="r">Gaji</th><th class="hide-m">Pendidikan</th><th class="hide-m">Skill minimum</th><th class="hide-m">Pengalaman</th><th class="r hide-m">Jam/minggu</th><th class="hide-m">Persaingan</th><th>Peluang diterima</th></tr></thead><tbody>
  ${list.map(j => `<tr class="clickable" data-job="${j.id}"><td><b>${esc(j.title)}</b><div class="subtle">${esc(j.company)} · ${TYPE[j.type]}</div></td><td class="hide-m">${j.industry}</td><td class="r" style="white-space:nowrap"><b>${payTxt(j)}</b><div class="subtle">${schedTxt(j)}</div></td><td class="hide-m">${j.education}</td><td class="hide-m" style="font-size:12px">${skillsTxt(j)}</td><td class="hide-m" style="font-size:12px">${expTxt(j)}</td><td class="r hide-m">${j.type === 'gig' ? `${j.shiftHours} j/shift` : j.hoursPerWeek}</td><td class="hide-m">${compChip(j.competition)}</td><td>${chanceCell(j)}</td></tr>`).join('')}
  </tbody></table></div>` : empty('career', 'Tidak ada lowongan yang cocok', 'Belum ada lowongan dengan filter ini yang syaratnya kamu penuhi. Tingkatkan skill di tab Skill & pengalaman.', '<button class="btn sm" data-jt="all">Tampilkan semua</button>')}</section>`;
}

function jobDialog(id) {
  const j = E.jobById(id), reasons = E.jobRequirements(j), c = E.S.career;
  const pending = c.applications.find(a => a.jobId === id && ACTIVE.includes(a.status));
  const est = j.type !== 'gig' && !reasons.length ? E.acceptanceEstimate(j) : null;
  const isActive = c.job?.jobId === id;
  let action = '';
  if (j.type === 'gig') {
    const blocked = c.gigToday ? 'Kamu sudah mengambil shift lepas hari ini.' : c.job && E.isWorkday() && E.jobById(c.job.jobId).type !== 'gig' ? 'Hari ini jadwal kerja utamamu — shift lepas bisa diambil di akhir pekan.' : E.secOfDay() >= TIME_RULES.gig.pickupUntil * 3600 ? `Batas ambil shift hari ini (${TIME_RULES.gig.pickupUntil}:00) sudah lewat.` : reasons[0] || null;
    action = `<button class="btn primary" data-gig="${id}" ${blocked ? 'disabled' : ''}>Ambil shift hari ini</button>`;
    if (blocked) action = `<span class="subtle" style="margin-right:auto">${esc(blocked)}</span>` + action;
  } else if (isActive) action = `<span class="chip pos">Pekerjaan aktifmu</span>`;
  else if (pending) action = `<span class="chip info">Lamaran ${STATUS[pending.status][0].toLowerCase()}</span>`;
  else action = `<button class="btn primary" data-apply="${id}" ${reasons.length ? 'disabled' : ''}>${reasons.length ? `${icon('lock')} Belum memenuhi syarat` : 'Kirim lamaran'}</button>`;
  openDialog(`<div class="dlg-h"><div><h2>${esc(j.title)}</h2><div class="subtle">${esc(j.company)} · ${j.industry} · ${TYPE[j.type]}</div></div><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack" style="gap:12px">
    <p style="margin:0">${esc(j.desc)}</p>
    <dl class="dl"><dt>Gaji</dt><dd>${payTxt(j)}</dd><dt>Jadwal pembayaran</dt><dd>${schedTxt(j)}</dd><dt>Jam kerja</dt><dd>${j.type === 'gig' ? `${j.shiftHours} jam per shift, kapan saja` : `${j.hoursPerWeek} jam/minggu, Senin–Jumat`}</dd>
      <dt>Pendidikan minimal</dt><dd>${j.education}</dd><dt>Skill minimum</dt><dd>${skillsTxt(j)}</dd><dt>Pengalaman</dt><dd>${expTxt(j)}</dd><dt>Tingkat persaingan</dt><dd>${j.competition}</dd>
      <dt>Seleksi</dt><dd>${{ none: 'Tanpa seleksi', interview: 'Interview', skilltest: 'Tes skill' }[j.evaluation]}</dd><dt>Skill yang berkembang</dt><dd>${Object.keys(j.gain).map(skillLabel).join(', ')}</dd>${j.promoTo ? `<dt>Jalur promosi</dt><dd>${esc(E.jobById(j.promoTo).title)}</dd>` : ''}</dl>
    ${reasons.length ? `<div class="msg error">${icon('lock')}<span><b>Kenapa belum bisa melamar:</b><ul style="margin:4px 0 0;padding-left:18px">${reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul></span></div>` : ''}
    ${est ? `<div class="msg info">${icon('info')}<span><b>Estimasi peluang diterima: ${est.band} (±${Math.round(est.lo * 100)}–${Math.round(est.hi * 100)}%).</b> Dihitung dari persaingan, selisih skill dengan syarat, dan reputasimu. ${j.evaluation !== 'none' ? 'Skor evaluasi akan menaikkan atau menurunkan peluang ini. ' : ''}Ini bukan kepastian.</span></div>` : ''}
    <div id="jd-msg"></div>
  </div><div class="dlg-f">${action}</div>`, {
    onMount: d => {
      d.querySelector('[data-apply]')?.addEventListener('click', () => { const r = E.apply(id); if (r.ok) { toast(r.msg); d.close(); } else d.querySelector('#jd-msg').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(r.error)}</span></div>`; });
      d.querySelector('[data-gig]')?.addEventListener('click', () => { const r = E.takeGig(id); if (r.ok) { toast(r.msg); d.close(); } else d.querySelector('#jd-msg').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(r.error)}</span></div>`; });
    }
  });
}

function appsView() {
  const apps = E.S.career.applications;
  if (!apps.length) return `<section class="panel">${empty('career', 'Belum ada lamaran', 'Lamaran yang kamu kirim akan muncul di sini beserta tahapannya: ditinjau, evaluasi, keputusan, dan tawaran.', '<button class="btn sm primary" data-tab-go="jobs">Lihat lowongan</button>')}</section>`;
  return `<div class="stack">${apps.map(a => { const j = E.jobById(a.jobId), [lab, tone] = STATUS[a.status];
    const act = a.status === 'evaluasi' ? `<button class="btn sm primary" data-eval="${a.id}">Mulai ${j.evaluation === 'interview' ? 'interview' : 'tes skill'}</button>` : a.status === 'tawaran' ? `<button class="btn sm" data-decline="${a.id}">Tolak</button><button class="btn sm primary" data-accept="${a.id}">Terima tawaran</button>` : '';
    return `<section class="panel"><div class="panel-h"><div><h2>${esc(j.title)}${a.internal ? ' <span class="chip info">Promosi internal</span>' : ''}</h2><div class="subtle">${esc(j.company)} · ${payTxt(j)} · dikirim hari ke-${a.day + 1}</div></div><span class="chip ${tone}">${lab}</span></div>
    <div class="panel-b"><ol style="margin:0;padding-left:18px;font-size:13px">${a.timeline.map(t => `<li><span class="subtle">H${t.day + 1}</span> — ${esc(t.s)}</li>`).join('')}</ol>
    ${a.status === 'tawaran' ? `<div class="msg ok" style="margin-top:10px">${icon('check')}<span>Tawaran berlaku sampai hari ke-${a.offerUntil + 1}. ${E.S.career.job ? `Menerima berarti berhenti dari ${esc(E.jobById(E.S.career.job.jobId).title)}.` : ''}</span></div>` : ''}
    ${a.status === 'evaluasi' ? `<div class="msg warn" style="margin-top:10px">${icon('clock')}<span>Selesaikan sebelum hari ke-${a.deadline + 1}.</span></div>` : ''}
    ${act ? `<div class="row" style="justify-content:flex-end;margin-top:10px">${act}</div>` : ''}</div></section>`; }).join('')}</div>`;
}

function evalDialog(appId) {
  const a = E.S.career.applications.find(x => x.id === appId), j = E.jobById(a.jobId), qs = E.EVALUATIONS[j.evaluation];
  openDialog(`<div class="dlg-h"><h2>${j.evaluation === 'interview' ? 'Interview' : 'Tes skill'} — ${esc(j.title)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack"><p class="subtle" style="margin:0">Skor dihitung dari jawaban dan level skill terkait. Skor tinggi menaikkan peluang, tetapi tidak menjamin diterima.</p>
  ${qs.map((q, i) => `<fieldset style="border:1px solid var(--border);border-radius:6px;padding:10px 12px;margin:0"><legend style="font-weight:600;font-size:13px;padding:0 4px">${i + 1}. ${esc(q.q)}</legend>${q.a.map((t, k) => `<label class="row" style="gap:8px;font-size:13px;padding:3px 0"><input type="radio" name="q${i}" value="${k}"> ${esc(t)}</label>`).join('')}</fieldset>`).join('')}
  <div id="ev-err"></div></div><div class="dlg-f"><button class="btn" data-close>Nanti</button><button class="btn primary" id="ev-ok">Kirim jawaban</button></div>`, {
    onMount: d => d.querySelector('#ev-ok').addEventListener('click', () => {
      const ans = qs.map((_, i) => { const r = d.querySelector(`input[name="q${i}"]:checked`); return r ? +r.value : null; });
      if (ans.includes(null)) { d.querySelector('#ev-err').innerHTML = `<div class="msg error">${icon('alert')}<span>Jawab semua pertanyaan.</span></div>`; return; }
      const r = E.submitEvaluation(appId, ans); r.ok ? (toast(r.msg), d.close()) : (d.querySelector('#ev-err').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(r.error)}</span></div>`);
    })
  });
}

function nextPayday(j) {
  let d = E.dayNow();
  for (let k = 0; k < 40; k++, d++) { if (j.type === 'part' && E.weekdayOf(d) === 5) return d; if (j.type === 'full' && E.domOf(d) === 25) return d; }
  return null;
}
function activeView() {
  const c = E.S.career;
  const hist = c.history.length ? `<section class="panel"><div class="panel-h"><h2>Riwayat pekerjaan</h2></div><ul class="list">${c.history.map(h => `<li><b>${esc(E.jobById(h.jobId).title)}</b><span class="subtle" style="margin-left:auto">H${h.start + 1}–H${h.end + 1} · ${h.daysWorked} hari kerja</span></li>`).join('')}</ul></section>` : '';
  if (!c.job) return `<div class="stack"><section class="panel">${empty('career', 'Belum ada pekerjaan aktif', 'Kirim lamaran dari tab Lowongan. Sambil menunggu, kerja lepas tetap menghasilkan upah harian.', '<button class="btn sm primary" data-tab-go="jobs">Lihat lowongan</button>')}</section>${hist}</div>`;
  const j = E.jobById(c.job.jobId), pr = E.promotionStatus(), started = E.dayNow() >= c.job.startDay, np = nextPayday(j);
  const est = j.type === 'full' ? Math.round(j.pay * Math.min(1, c.job.periodDays / 22)) : c.job.unpaid;
  return `<div class="split"><div class="stack"><section class="panel"><div class="panel-h"><div><h2>${esc(j.title)}</h2><div class="subtle">${esc(j.company)} · ${j.industry}</div></div><span class="chip info">${TYPE[j.type]}</span></div>
    <div class="panel-b"><div class="grid g-3" style="gap:10px"><div class="pl-box"><div class="subtle">${j.type === 'full' ? 'Gaji bulanan' : 'Upah per shift'}</div><b class="num">${rp(j.pay)}</b></div><div class="pl-box"><div class="subtle">Pembayaran berikutnya</div><b>${np != null ? fmtDay(np, 'wd') : '—'}</b><div class="subtle">${schedTxt(j)}</div></div><div class="pl-box"><div class="subtle">Terkumpul periode ini</div><b class="num">${rp(est)}</b><div class="subtle">${j.type === 'full' ? `${c.job.periodDays}/22 hari kerja` : 'dibayar Jumat'}</div></div></div>
    <dl class="dl" style="margin-top:12px"><dt>Mulai bekerja</dt><dd>Hari ke-${c.job.startDay + 1}${started ? '' : ' (besok)'}</dd><dt>Hari kerja di posisi ini</dt><dd>${c.job.daysWorked}</dd><dt>Kinerja rata-rata</dt><dd>${c.job.daysWorked ? Math.round(c.job.perf) + ' / 100' : '—'}</dd><dt>Jam kerja</dt><dd>${j.hoursPerWeek} jam/minggu</dd><dt>Skill yang berkembang</dt><dd>${Object.keys(j.gain).map(skillLabel).join(', ')}</dd></dl>
    <div class="row" style="justify-content:flex-end;margin-top:12px"><button class="btn sell sm" data-resign>Resign</button></div></div></section>${hist}</div>
  <div class="stack"><section class="panel"><div class="panel-h"><h2>Promosi</h2></div><div class="panel-b">${!pr?.next ? `<p class="subtle" style="margin:0">${esc(pr?.reasons?.[0] || '')}</p>` : `<div><b>${esc(pr.next.title)}</b> · ${payTxt(pr.next)}</div>
    ${pr.available ? `<div class="msg ok" style="margin-top:8px">${icon('check')}<span>Syarat terpenuhi. Pengajuan tetap melalui evaluasi dan tidak dijamin disetujui.</span></div><button class="btn primary block" style="margin-top:10px" data-promo>Ajukan promosi</button>` : `<div class="subtle" style="margin-top:8px">Syarat yang belum terpenuhi:</div><ul style="margin:4px 0 0;padding-left:18px;font-size:12.5px;color:var(--red-ink)">${pr.reasons.map(r => `<li>${esc(r)}</li>`).join('')}</ul>`}`}</div></section>
  <section class="panel"><div class="panel-h"><h2>Pengalaman kerja</h2></div><div class="panel-b">${expList()}</div></section></div></div>`;
}
function expList() { const ex = Object.entries(E.S.career.experience); return ex.length ? `<dl class="dl">${ex.map(([k, v]) => `<dt>${k}</dt><dd>${v} hari</dd>`).join('')}</dl>` : '<span class="subtle">Belum ada pengalaman. Setiap shift atau hari kerja menambah pengalaman di industri tersebut.</span>'; }

function skillsView() {
  const P = E.S.player, c = E.S.career;
  const unlocks = k => E.JOB_CATALOG.filter(j => j.skills[k] && P.skills[k] < j.skills[k]).sort((a, b) => a.skills[k] - b.skills[k]).slice(0, 2);
  return `<div class="split"><section class="panel"><div class="panel-h"><h2>Skill</h2><span class="subtle">Naik dari kerja, kursus, dan belajar mandiri</span></div><ul class="list">
    ${Object.entries(P.skills).map(([k, v]) => { const nx = unlocks(k); return `<li style="flex-wrap:wrap"><div style="width:120px"><b style="font-size:13px">${skillLabel(k)}</b><div class="subtle num">${v.toFixed(1)}</div></div><div class="bar" style="flex:1;min-width:120px" role="progressbar" aria-valuenow="${Math.round(v)}" aria-valuemin="0" aria-valuemax="60" aria-label="${skillLabel(k)}"><i style="width:${Math.min(100, v / 60 * 100)}%"></i></div>
      <div class="row" style="gap:6px"><button class="btn sm" data-study="${k}" ${c.studiedToday ? 'disabled' : ''} title="Gratis, +0,4">Belajar</button><button class="btn sm" data-course="${k}" ${c.courseToday || P.balance < 350_000 ? 'disabled' : ''} title="Rp 350.000, +2,5">Kursus</button></div>
      ${nx.length ? `<div class="subtle" style="width:100%">Berikutnya: ${nx.map(j => `${esc(j.title)} (butuh ${j.skills[k]})`).join(' · ')}</div>` : ''}</li>`; }).join('')}</ul>
    <div class="panel-b subtle" style="border-top:1px solid var(--border)">Belajar mandiri gratis 1×/hari (+0,4). Kursus Rp 350.000 1×/hari (+2,5)${P.balance < 350_000 ? ' — saldo belum cukup' : ''}.${c.studiedToday ? ' Belajar mandiri hari ini sudah dilakukan.' : ''}</div></section>
  <div class="stack"><section class="panel"><div class="panel-h"><h2>Pendidikan</h2></div><div class="panel-b"><b>${P.education}</b><p class="subtle" style="margin:6px 0 0">Beberapa lowongan butuh D3/S1. Jalur pendidikan lanjutan belum tersedia di versi engine ini, sehingga lowongan tersebut ditampilkan terkunci dengan alasannya.</p></div></section>
  <section class="panel"><div class="panel-h"><h2>Pengalaman kerja</h2></div><div class="panel-b">${expList()}</div></section></div></div>`;
}

function render() {
  tabs();
  $('#body').innerHTML = ({ jobs: jobsView, applications: appsView, active: activeView, skills: skillsView }[tab] || jobsView)();
}
render();
E.on('change', () => { if (!document.querySelector('dialog[open]') && !document.activeElement?.matches('input,select')) render(); });

page.addEventListener('change', e => { if (e.target.id === 'jf-el') { jf.eligible = e.target.checked; render(); } });
page.addEventListener('click', e => {
  const t = e.target, r = x => (x.ok ? toast(x.msg) : toast(x.error, 'error'), render());
  const jt = t.closest('[data-jt]'); if (jt) { jf.type = jt.dataset.jt; if (!jt.closest('.seg')) jf.eligible = false; render(); return; }
  const go = t.closest('[data-tab-go]'); if (go) { tab = go.dataset.tabGo; render(); return; }
  const job = t.closest('[data-job]'); if (job) { jobDialog(job.dataset.job); return; }
  const ev = t.closest('[data-eval]'); if (ev) { evalDialog(+ev.dataset.eval); return; }
  const ac = t.closest('[data-accept]'); if (ac) return r(E.acceptOffer(+ac.dataset.accept));
  const dc = t.closest('[data-decline]'); if (dc) return r(E.declineOffer(+dc.dataset.decline));
  if (t.closest('[data-resign]') && confirm('Resign dari pekerjaan ini? Sisa upah akan dibayarkan.')) return r(E.resign());
  if (t.closest('[data-promo]')) return r(E.requestPromotion());
  const st = t.closest('[data-study]'); if (st) return r(E.study(st.dataset.study, false));
  const co = t.closest('[data-course]'); if (co) return r(E.study(co.dataset.course, true));
});
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (h && h !== tab) { tab = h; render(); } });
