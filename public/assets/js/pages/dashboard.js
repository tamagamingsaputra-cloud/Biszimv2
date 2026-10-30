import * as E from '../engine/core.js';
import { fmtDay } from '../engine/calendar.js';
import * as F from '../engine/finance.js';
import * as CAL from '../engine/calendar.js';
import * as AG from '../engine/agenda.js';
import * as SH from '../engine/shop.js';
import { mountShell } from '../ui/shell.js';
import { needTiles } from '../ui/needs-ui.js';
import { editProfile } from '../ui/onboarding.js';
import { rp, rpShort, pct, delta, cls, arrow, icon, empty, lineChart, sparkline, esc, $, result, fmtDate, num, toast } from '../ui/ui.js';

const page = await mountShell('dashboard', 'Dashboard');
const INCOME_LABEL = { 'uang saku': 'Uang saku dari wali', gaji: 'Gaji', kerja_lepas: 'Kerja lepas', bisnis: 'Laba bisnis', sewa: 'Sewa properti', kupon: 'Kupon obligasi', dividen: 'Dividen', youtube: 'Kreator · catatan lama', kreator_platform: 'Kreator · pembayaran platform', kreator_dukungan: 'Kreator · gifts & dukungan', kreator_sponsor: 'Kreator · sponsor', kreator_merch: 'Kreator · merchandise', kreator_afiliasi: 'Kreator · affiliate', kreator_membership: 'Kreator · membership', kreator_sponsor_refund: 'Kreator · pengembalian sponsor', investasi_realized: 'Realisasi investasi', trading_realized: 'Realisasi trading' };
const EXP_LABEL = { pendidikan: 'Biaya pendidikan (saldo pribadi)', bisnis_rugi: 'Rugi operasional bisnis', stok_bisnis: 'Belanja stok', modal_bisnis: 'Modal bisnis', cicilan: 'Cicilan utang', kursus: 'Kursus', biaya_trading: 'Biaya trading', biaya_investasi: 'Biaya investasi', pbb: 'PBB', ekspansi: 'Ekspansi bisnis', youtube_alat: 'Peralatan YouTube', kreator_produksi: 'Kreator · biaya produksi', kreator_alat: 'Kreator · peralatan', kreator_langganan: 'Kreator · langganan', kreator_live: 'Kreator · biaya live', kreator_kursus: 'Kreator · kelas', kreator_merch_setup: 'Kreator · setup merch', kreator_sponsor_refund: 'Kreator · pengembalian uang muka sponsor', trading_realized: 'Rugi trading terealisasi', investasi_realized: 'Rugi investasi terealisasi' };
const REAL_INCOME = k => !['trading_realized', 'investasi_realized'].includes(k);

const NE = E.NE;
const SHOP = { active: [] };
const pollShop = async () => { const r = await SH.summary(); if (r.ok) { SHOP.active = [...r.arrived, ...r.ready, ...r.inDelivery, ...r.processing].slice(0, 3); await SH.syncGrants(); for (const f of r.fresh || []) toast(`${f.title}: ${f.body}`, 'ok'); } };
setInterval(() => { if (!document.hidden) pollShop(); }, 6000); pollShop();
page.innerHTML = `
  <section class="panel" aria-label="Kehidupan karakter"><div class="panel-b"><div class="life-hero">
    <div class="stack" style="gap:12px"><div class="row between wrap" style="gap:12px" id="hero-who"></div><div class="needs" id="hero-needs" aria-label="Kebutuhan karakter"></div></div>
    <div class="stack" style="gap:10px"><div class="money-row" id="hero-money"></div><div id="hero-now"></div></div>
  </div></div></section>
  <section class="panel" style="margin-top:12px" aria-label="Aksi cepat"><div class="panel-h"><h2>Aksi cepat</h2><span class="subtle">Aksi yang tidak bisa dilakukan menampilkan alasannya</span></div><div class="panel-b"><div class="qa-grid" id="qa"></div></div></section>
  <div class="grid g-2 dash-near" style="margin-top:12px;gap:12px"><section class="panel" id="agenda-near"></section><section class="panel" id="notif"></section></div>
  <section class="panel" style="margin-top:16px" aria-label="Ringkasan keuangan"><div class="kpi-strip" id="kpis"></div></section>
  <div class="split" style="margin-top:16px">
    <div class="stack">
      <section class="panel" id="next"></section>
      <section class="panel"><div class="panel-h"><h2>Kekayaan bersih</h2><span class="subtle" id="nw-note"></span></div><div class="panel-b"><div id="nw-chart" class="chart"></div><div id="nw-break" style="margin-top:12px"></div></div></section>
      <section class="panel" id="biz"></section>
      <section class="panel" id="inv"></section>
    </div>
    <div class="stack">
      <section class="panel" id="profile"></section>
      <section class="panel" id="edu"></section>
      <section class="panel" id="career"></section>
      <section class="panel" id="cash"></section>
      <section class="panel"><div class="panel-h"><h2>Aktivitas terbaru</h2><span class="subtle">Dari log engine</span></div><ul class="list" id="act"></ul></section>
    </div>
  </div>`;

// ——— LIFE HUB (bagian atas dashboard) ———
function heroWho() {
  const S = E.S, P = E.P || {}, c = S.career, job = c.job ? E.jobById(c.job.jobId) : null, ed = E.EDU?.edu, st = NE.stateAt(S.clock.g);
  const edu = ed?.status === 'enrolled' ? `${ed.stage} · ${ed.labelTerm}` : ed?.status === 'graduated' ? `Lulus ${ed.highest}` : 'Belum sekolah';
  const w = CAL.dateParts(E.dayNow());
  $('#hero-who').innerHTML = `<div class="who"><span class="pic" aria-hidden="true">${esc((P.nickname || S.player.name).slice(0, 1).toUpperCase())}</span><div style="min-width:0"><h2>${esc(P.name || S.player.name)}</h2><div class="meta">${E.ageYears()} tahun · ${esc(P.city || '—')}</div><div class="row wrap" style="gap:6px;margin-top:5px"><span class="chip dark">${esc(NE.STATE_LABEL[st])}</span><span class="chip">${esc(job ? job.title : c.gigToday ? 'Shift lepas hari ini' : 'Belum bekerja')}</span><span class="chip">${esc(edu)}</span></div></div></div>
  <div class="big-clock"><div class="subtle">${CAL.WEEKDAYS[w.weekday]}, ${fmtDay(E.dayNow(), 'long')}</div><div class="t" data-bigclock>${CAL.fmtHMS(E.secOfDay())}</div><div class="subtle">Tahun ${w.year} · bulan ${w.month} · tanggal ${w.date}${S.settings.paused ? ' · dijeda' : ''}</div></div>`;
}
function heroMoney() {
  const t = F.totals(), nw = E.netWorth(), last = E.S.ledger[E.S.ledger.length - 1];
  const inc = last ? Object.entries(last.income).filter(([k]) => REAL_INCOME(k)).reduce((s, [, v]) => s + v, 0) : null;
  const m = (l, v, href, c = '', sub = '') => `<a class="money ${c}" href="${href}"><div class="l">${l}</div><div class="v">${v}</div>${sub ? `<div class="subtle" style="font-size:11px">${sub}</div>` : ''}</a>`;
  $('#hero-money').innerHTML = m('Uang tunai', rp(t.cash), 'finance.html#ringkasan') + m('Rekening bank', F.V ? rp(t.bank) : '—', 'finance.html#rekening', '', F.V ? `${F.accounts('bank').length} rekening` : 'server belum terhubung')
    + m('Dompet digital', F.V ? rp(t.wallet) : '—', 'finance.html#dompet', '', F.V ? `${F.accounts('wallet').length} dompet` : '') + m('Utang', rp(nw.debts + (t.credit || 0)), 'finance.html#tagihan', nw.debts + (t.credit || 0) > 0 ? 'neg' : '', t.credit ? `kartu kredit ${rpShort(t.credit)}` : '')
    + m('Total aset', rpShort(nw.totalAssets), '#nw-chart', '', 'estimasi nilai pasar') + m('Pendapatan kemarin', inc == null ? '—' : rpShort(inc), '#cash', '', inc == null ? 'setelah hari pertama' : '');
}
let nowKey = null;
function heroNow() {
  const a = NE.activityProgress(), why = NE.blockedReason({ allowDuringActivity: true }), sch = E.scheduleOf(E.dayNow()), h = E.secOfDay() / 3600;
  const nextBlock = [['Sekolah', sch.school], ['Kerja', sch.work]].filter(([, x]) => x && x[0] > h).sort((x, y) => x[1][0] - y[1][0])[0];
  const pf = NE.perfFactor();
  const html = `<div class="msg ${a ? 'info' : why ? 'warn' : ''}" style="margin:0">${icon(a ? 'clock' : 'life')}<span>${a ? `<b>${esc(a.label)}</b> — selesai ${CAL.fmtHM(a.endAbs % 86400)} (${Math.round(a.pct * 100)}%). <a href="life.html">Lihat</a>` : why ? esc(why) : 'Tidak ada aktivitas berlangsung. Karakter bebas melakukan aksi.'}${nextBlock ? ` Berikutnya: ${nextBlock[0]} ${CAL.fmtHM(nextBlock[1][0] * 3600)}.` : ''} Performa kerja/sekolah ${Math.round(pf * 100)}%${pf < 0.95 ? ' (turun karena kondisi karakter)' : ''}.</span></div>`;
  if (html !== nowKey) { nowKey = html; $('#hero-now').innerHTML = html; }
}
const QA = [
  ['makan', 'Makan & Minum', 'food', 'life.html#makan', () => NE.blockedReason()],
  ['tidur', 'Tidur / Istirahat', 'bed', 'life.html#istirahat', () => NE.blockedReason()],
  ['edu', 'Pendidikan', 'education', 'education.html', () => null],
  ['karier', 'Karier', 'career', 'career.html', () => E.ageLock('gig') && !E.S.career.job ? `Kerja lepas mulai usia ${E.AGE_RULES.gig}.` : null],
  ['dompet', 'Keuangan', 'wallet', 'finance.html', () => F.V ? null : 'Server keuangan belum terhubung.'],
  ['belanja', 'Belanja', 'cart', 'life.html#belanja', () => NE.blockedReason() || (F.openNow(F.merchant('serbamart')) ? null : 'Minimarket tutup.')],
  ['antar', 'Pesan Antar', 'truck', 'life.html#antar', () => { const m = F.merchant('antarrasa'); return !m ? 'Katalog belum termuat.' : !F.openNow(m) ? `Tutup · buka ${F.hoursText(m)}.` : null; }],
  ['transport', 'Transportasi', 'bus', 'life.html#transport', () => null],
  ['studio', 'Creator Studio', 'studio', 'studio.html', () => E.ageLock('youtube')],
  ['bisnis', 'Bisnis', 'business', 'business.html', () => E.ageLock('business')],
  ['invest', 'Investasi', 'invest', 'investments.html', () => E.ageLock('invest')],
  ['kalender', 'Kalender', 'calendar', 'calendar.html', () => null],
];
let qaKey = null;
function quick() {
  const items = QA.map(([k, l, ic, href, why]) => { const r = why(); return { k, l, ic, href, r }; });
  const key = items.map(i => i.r || '').join('|'); if (key === qaKey) return; qaKey = key;
  $('#qa').innerHTML = items.map(i => i.r ? `<button type="button" class="qa off" data-qa-why="${esc(i.r)}" aria-disabled="true"><span class="ti" style="background:var(--bluegray)">${icon(i.ic)}</span><b>${i.l}</b><small>${esc(i.r)}</small></button>` : `<a class="qa" href="${i.href}"><span class="ti" style="background:var(--accent-bg);color:var(--navy)">${icon(i.ic)}</span><b>${i.l}</b><small>${{ makan: 'Isi lapar & haus', tidur: 'Pulihkan energi', edu: 'Sekolah & ujian', karier: 'Kerja & lamaran', dompet: 'Rekening, kartu, dompet', belanja: 'Minimarket & Pasarku', antar: 'Makanan diantar', transport: 'Moda perjalanan', studio: 'Konten & live', bisnis: 'Usaha milikmu', invest: 'Portofolio', kalender: 'Agenda & riwayat' }[i.k]}</small></a>`).join('');
}
function nearAgenda() {
  const d = E.dayNow(), evs = AG.eventsBetween(d, d + 6).filter(e => e.day > d || (e.sec ?? 0) >= E.secOfDay() || e.sec == null).slice(0, 6);
  $('#agenda-near').innerHTML = `<div class="panel-h"><h2>Jadwal terdekat</h2><a class="btn sm ghost" href="calendar.html">Kalender</a></div>${evs.length ? `<ul class="list">${evs.map(e => `<li><span style="flex:1;min-width:0"><b style="font-size:13px">${esc(e.title)}</b><div class="subtle">${e.day === d ? 'Hari ini' : fmtDay(e.day)} · ${AG.fmtEvTime(e.sec)}${e.certainty !== 'terjadwal' ? ` · ${e.certainty}` : ''}</div></span>${e.amount ? `<span class="num ${e.amount > 0 ? 'pos' : 'neg'}" style="font-size:12.5px;white-space:nowrap">${rpShort(e.amount)}</span>` : ''}</li>`).join('')}</ul>` : '<div class="panel-b subtle">Tidak ada event 7 hari ke depan.</div>'}`;
}
function notifs() {
  const out = [];
  for (const n of NE.NEEDS) { const lv = NE.level(n.key); if (lv === 'critical') out.push(['neg', `${n.label} kritis: ${n.effect}`, 'life.html']); else if (lv === 'low') out.push(['warn', `${n.label} rendah. ${n.effect}`, 'life.html']); }
  for (const st of F.V?.statements || []) if (st.status === 'terbuka') out.push([st.dueDay - E.dayNow() <= 3 ? 'neg' : 'warn', `Tagihan kartu kredit ${rp(st.amount - st.paid)} jatuh tempo ${fmtDay(st.dueDay)}.`, 'finance.html#tagihan']);
  for (const o of F.V?.orders || []) if (!['diterima', 'dibatalkan', 'gagal'].includes(F.orderStage(o))) out.push(['info', `Pesanan ${F.merchant(o.merchant)?.name || ''}: ${{ diproses: 'sedang diproses', diantar: 'dalam perjalanan', tiba: 'sudah tiba — terima pesanan', gagal: 'gagal' }[F.orderStage(o)] || F.orderStage(o)}.`, 'life.html#antar']);
  for (const t of (F.V?.tx || []).filter(t => t.status === 'gagal' && t.day >= E.dayNow() - 1).slice(0, 2)) out.push(['neg', `Transaksi gagal: ${t.label}${t.reason ? ` — ${t.reason}` : ''}.`, 'finance.html#riwayat']);
  for (const o of SHOP.active || []) out.push(['info', `Belanja ${o.storeName}: ${o.fulLabel}${o.canClaim ? ' — konfirmasi penerimaan' : ''}.`, 'shop.html#pesanan']);
  if (E.S.fin.outbox.length) out.push(['warn', `${E.S.fin.outbox.length} transaksi menunggu dikirim ke server.`, 'finance.html']);
  if (F.status.error) out.push(['neg', `Server keuangan: ${F.status.error}`, 'finance.html']);
  const html = `<div class="panel-h"><h2>Notifikasi</h2><span class="subtle">${out.length || 'Tidak ada'}</span></div>${out.length ? `<ul class="list">${out.slice(0, 7).map(([t, x, h]) => `<li><span class="chip ${t}" style="flex:none">${t === 'neg' ? 'Penting' : t === 'warn' ? 'Perhatian' : 'Info'}</span><a href="${h}" style="flex:1;font-size:13px;color:inherit">${esc(x)}</a></li>`).join('')}</ul>` : '<div class="panel-b subtle">Kondisi karakter & keuangan aman.</div>'}`;
  if ($('#notif').innerHTML !== html) $('#notif').innerHTML = html;
}
function hero() { heroWho(); $('#hero-needs').innerHTML = needTiles(); heroMoney(); heroNow(); quick(); }

function kpis() {
  const S = E.S, nw = E.netWorth(), L = S.ledger, last = L[L.length - 1];
  const incYesterday = last ? Object.entries(last.income).filter(([k]) => REAL_INCOME(k)).reduce((s, [, v]) => s + v, 0) : null;
  const incToday = Object.entries(S.today.income).filter(([k]) => REAL_INCOME(k)).reduce((s, [, v]) => s + v, 0);
  const last7 = L.slice(-7);
  const avg7 = last7.length >= 7 ? last7.reduce((s, r) => s + Object.entries(r.income).filter(([k]) => REAL_INCOME(k)).reduce((a, [, v]) => a + v, 0), 0) / 7 : null;
  const debtMonthly = S.debts.reduce((s, d) => s + d.monthlyPay, 0);
  $('#kpis').innerHTML = `
    <div class="kpi"><div class="label">${icon('wallet', 'width="14" height="14"')}Saldo personal</div><div class="value">${rp(S.player.balance)}</div><div class="foot">Kas yang bisa langsung dipakai</div></div>
    <div class="kpi"><div class="label">Pendapatan harian</div><div class="value">${incYesterday == null ? '<span class="muted">—</span>' : rp(incYesterday)}</div>
      <div class="foot">${incYesterday == null ? 'Tercatat setelah hari pertama selesai' : 'Kemarin'}${avg7 != null ? ` · rata-rata 7 hari ${rpShort(avg7)}` : ''}${incToday ? ` · hari ini berjalan ${rpShort(incToday)}` : ''}</div></div>
    <div class="kpi"><div class="label">Total aset</div><div class="value">${rp(nw.totalAssets)}</div><div class="foot">Kas + trading + investasi (estimasi) + bisnis</div></div>
    <div class="kpi"><div class="label">Utang</div><div class="value ${nw.debts > 0 ? 'neg' : ''}">${rp(nw.debts)}</div><div class="foot">${nw.debts > 0 ? `Cicilan ±${rpShort(debtMonthly)}/bulan · ${S.debts.length} pinjaman` : 'Tidak ada utang aktif'}</div></div>`;
}

function nextSteps() {
  const S = E.S, c = S.career, items = [];
  const evalApp = c.applications.find(a => a.status === 'evaluasi');
  const offer = c.applications.find(a => a.status === 'tawaran');
  if (offer) items.push({ tone: 'ok', t: `Tawaran kerja: ${E.jobById(offer.jobId).title}`, d: `Berlaku sampai hari ke-${offer.offerUntil + 1}. Bandingkan jam kerja dan gaji sebelum menerima.`, a: `<a class="btn sm primary" href="career.html#applications">Tinjau tawaran</a>` });
  if (evalApp) items.push({ tone: 'warn', t: `Undangan evaluasi: ${E.jobById(evalApp.jobId).title}`, d: `Selesaikan sebelum hari ke-${evalApp.deadline + 1} atau lamaran kedaluwarsa.`, a: `<a class="btn sm primary" href="career.html#applications">Ikuti evaluasi</a>` });
  const V = E.EDU, ed = V?.edu;
  if (ed) {
    if (ed.status !== 'enrolled') items.push({ tone: 'warn', t: ed.status === 'graduated' ? `Lulus ${ed.highest} — pilih langkah berikutnya` : 'Daftarkan karakter ke Sekolah Dasar', d: ed.status === 'graduated' ? 'Lihat sekolah lanjutan beserta biaya dan syaratnya. Kuliah bersifat opsional.' : `Skenario dimulai dari SD kelas 1. Biaya & syarat tampil sebelum mendaftar (dana wali ${rp(V.family[V.profile.family].perTerm)}/periode).`, a: `<a class="btn sm primary" href="education.html#catalog">Pilih sekolah</a>` });
    else {
      const unpaid = ed.bills.filter(b => b.paid < b.amount);
      if (unpaid.length) items.push({ tone: ed.termDay >= unpaid[0].dueTermDay ? 'error' : 'warn', t: `Tagihan sekolah ${rp(unpaid.reduce((a, b) => a + b.amount - b.paid, 0))}`, d: `${unpaid[0].label} jatuh tempo hari ke-${unpaid[0].dueTermDay} periode. Belum lunas = kartu ujian tertahan.`, a: `<a class="btn sm primary" href="education.html#overview">Bayar</a>` });
      const w = ed.windows, td = ed.termDay, openEx = [['mid', w.mid], ['final', w.final], ['remedial', w.remedial]].find(([k, x]) => td >= x[0] && td <= x[1] && ed.subjects.some(sb => !['selesai', 'tidak-ikut'].includes(ed.exams[`${sb.id}:${k}`]?.status) && (k !== 'remedial' || sb.current.grade < V.rules.pass)));
      if (openEx) items.push({ tone: 'warn', t: `${{ mid: 'UTS', final: 'UAS', remedial: 'Remedial' }[openEx[0]]} sedang dibuka`, d: `Jendela ujian hari ke-${openEx[1][0]}–${openEx[1][1]} periode (sekarang hari ke-${td}). Ujian yang terlewat bernilai 0.`, a: `<a class="btn sm primary" href="education.html#exam">Ruang ujian</a>` });
      const tasks = ed.tasks.filter(t => t.status === 'open');
      if (tasks.length) items.push({ tone: 'info', t: `${tasks.length} tugas sekolah terbuka`, d: `Batas terdekat hari ke-${Math.min(...tasks.map(t => t.dueTermDay))}. Pengumpulan tugas minimal ${V.rules.minTasks}% untuk naik kelas.`, a: `<a class="btn sm" href="education.html#subjects">Kerjakan</a>` });
    }
  }
  const hasIncome = c.job || c.gigToday || S.businesses.some(b => b.status === 'buka');
  const gigLock = E.ageLock('gig');
  if (gigLock && !c.job) items.push({ tone: 'info', t: 'Penghasilan saat ini: uang saku dari wali', d: `${rp(E.allowanceToday())}/hari masuk ke saldo pribadi saat hari berganti${E.EDU?.edu?.status === 'enrolled' ? '' : ' (penuh setelah terdaftar di sekolah)'}. Kerja lepas terbuka mulai usia ${E.AGE_RULES.gig} tahun simulasi; usia sekarang ${E.ageYears()}.`, a: `<a class="btn sm" href="career.html">Lihat Career</a>` });
  if (!c.job && !gigLock) {
    const gig = E.jobById(E.jobRequirements(E.jobById('gig-kurir')).length ? 'gig-angkut' : 'gig-kurir');
    if (!c.gigToday) items.push({ tone: 'info', t: hasIncome ? 'Tambah penghasilan hari ini' : 'Belum ada penghasilan', d: `Kerja lepas tidak butuh modal atau lamaran: ${gig.title}, ${rp(gig.pay)}/shift, dibayar akhir hari.`, a: `<button class="btn sm primary" data-gig="${gig.id}">Ambil shift</button>` });
    else items.push({ tone: 'ok', t: `Shift ${E.jobById(c.gigToday).title} sudah diambil`, d: 'Upah masuk saat hari berganti. Sambil menunggu, lamar pekerjaan tetap agar penghasilan stabil.', a: `<a class="btn sm" href="career.html">Lihat lowongan</a>` });
    if (!c.applications.some(a => ['dikirim', 'ditinjau', 'evaluasi', 'menunggu', 'tawaran'].includes(a.status))) {
      const eligible = E.JOB_CATALOG.filter(j => j.type !== 'gig' && !E.jobRequirements(j).length).length;
      items.push({ tone: 'info', t: 'Cari pekerjaan tetap', d: `${eligible} lowongan sudah sesuai syaratmu. Peluang diterima ditampilkan sebagai estimasi, bukan jaminan.`, a: `<a class="btn sm" href="career.html">Buka Career & Jobs</a>` });
    }
  }
  for (const b of S.businesses.filter(b => b.status === 'buka')) {
    const cat = E.catalogById(b.typeId), h = b.history.slice(-3);
    if (cat.stockBased && h.length) {
      const avgSold = h.reduce((s, r) => s + r.sold, 0) / h.length; const daysLeft = avgSold > 0 ? b.stock / avgSold : null;
      const incoming = b.pending.reduce((s, o) => s + o.qty, 0);
      if (b.stock <= 0 && !incoming) items.push({ tone: 'error', t: `Stok ${cat.name} habis`, d: `Tidak ada penjualan sejak stok habis${b.autoRestock ? '; restock otomatis gagal karena saldo tidak cukup' : ''}. Biaya tetap tetap berjalan — restock, turunkan jumlah order, atau tutup sementara.`, a: `<a class="btn sm primary" href="business.html">Kelola stok</a>` });
      else if (daysLeft != null && daysLeft < 2.5 && !incoming) items.push({ tone: 'warn', t: `Stok ${cat.name} menipis`, d: `Sisa ${num(b.stock)} ${cat.unit} (≈ ${daysLeft.toFixed(1)} hari penjualan). Stok habis = pelanggan hilang & rating turun.`, a: `<a class="btn sm primary" href="business.html#biz-${b.bid}">Pesan stok</a>` });
    }
    const h7 = b.history.slice(-7); if (h7.length === 7 && h7.every(r => r.profit < 0)) items.push({ tone: 'warn', t: `${cat.name} rugi 7 hari berturut-turut`, d: `Total ${rp(h7.reduce((s, r) => s + r.profit, 0))}. Cek harga, stok, dan biaya di panel operasional.`, a: `<a class="btn sm" href="business.html">Lihat laba/rugi</a>` });
    const last = b.history[b.history.length - 1];
    if (last && last.lost > last.sold * 0.3 && (!cat.stockBased || b.stock > 0)) items.push({ tone: 'warn', t: `${cat.name} kekurangan kapasitas`, d: `${num(last.lost)} ${cat.unit} permintaan tidak terlayani kemarin. Pertimbangkan karyawan atau ekspansi.`, a: `<a class="btn sm" href="business.html#biz-${b.bid}">Kelola</a>` });
  }
  const pr = E.promotionStatus(); if (pr?.available && !c.applications.some(a => a.internal && ['dikirim', 'ditinjau', 'evaluasi', 'menunggu', 'tawaran'].includes(a.status))) items.push({ tone: 'ok', t: `Syarat promosi ke ${pr.next.title} terpenuhi`, d: `${pr.next.type === 'full' ? rp(pr.next.pay) + '/bulan' : rp(pr.next.pay) + '/shift'}. Pengajuan tetap melalui evaluasi dan tidak dijamin disetujui.`, a: `<a class="btn sm primary" href="career.html#active">Ajukan</a>` });
  if (!S.businesses.length) {
    const open = E.BUSINESS_CATALOG.filter(cat => !E.businessLocks(cat).length).sort((a, b) => a.capex - b.capex)[0];
    if (open) { const need = open.capex + open.workingCapital - S.player.balance; items.push({ tone: 'info', t: `Bisnis termurah yang terbuka: ${open.name}`, d: need > 0 ? `Modal awal + modal kerja ≈ ${rpShort(open.capex + open.workingCapital)}. Kurang ${rpShort(need)} dari saldomu.` : `Saldo cukup untuk modal awal & modal kerja. Jalankan simulasi kelayakan dulu.`, a: `<a class="btn sm" href="business.html">Lihat katalog</a>` }); }
  }
  if (S.debts.length) { const t = S.debts.reduce((s, d) => s + d.monthlyPay, 0); if (S.player.balance < t) items.push({ tone: 'error', t: 'Saldo di bawah cicilan bulan ini', d: `Cicilan ±${rp(t)} ditagih awal bulan. Gagal bayar menurunkan reputasi.`, a: '' }); }
  if (S.player.balance > 5_000_000 && !S.invest.holdings.some(h => h.status !== 'selesai')) items.push({ tone: 'info', t: 'Ada kas menganggur', d: 'Pertimbangkan dana darurat dulu, lalu instrumen sesuai tujuan. Investasi di BizSim tidak dijamin untung.', a: `<a class="btn sm" href="investments.html">Investments</a>` });

  const ICON = { ok: 'check', warn: 'alert', error: 'alert', info: 'info' };
  $('#next').innerHTML = `<div class="panel-h"><h2>Langkah berikutnya</h2><div class="row"><a class="btn sm ghost" href="market.html">${icon('market')}Trading</a><a class="btn sm ghost hide-m" href="business.html">${icon('business')}Bisnis</a><button class="btn sm" data-skip>${icon('skip')}Lanjut hari</button></div></div>
    <ul class="list">${items.length ? items.slice(0, 4).map(i => `<li><div class="msg ${i.tone}" style="border:0;padding:0;background:none;flex:1">${icon(ICON[i.tone])}<span><b>${esc(i.t)}</b><br><span class="muted">${esc(i.d)}</span></span></div>${i.a}</li>`).join('') : `<li><span class="muted">Tidak ada tindakan mendesak. Pantau arus kas dan bisnis secara berkala.</span></li>`}</ul>`;
}

function netWorthPanel() {
  const S = E.S, L = S.ledger;
  const series = L.map(r => [r.day, r.netWorth]);
  const el = $('#nw-chart');
  $('#nw-note').textContent = series.length >= 2 ? `${series.length} hari tercatat` : '';
  if (!lineChart(el, series, { height: 190, xFmt: (d, long) => long ? fmtDay(d, 'wd') : `H${d + 1}` })) {
    el.innerHTML = `<div class="chart-empty" style="height:150px">Grafik kekayaan muncul setelah minimal 2 hari simulasi tercatat.<br>Saat ini: ${series.length} hari.</div>`;
  }
  const nw = E.netWorth();
  const parts = [['Kas', nw.cash, 'var(--navy)'], ['Trading', nw.trading, '#5B8DEF'], ['Investasi (estimasi)', nw.invest, 'var(--green-ink)'], ['Bisnis (nilai buku)', nw.business, '#E5A021']];
  const tot = Math.max(1, nw.totalAssets);
  const first = series.length >= 2 ? series[0][1] : null;
  $('#nw-break').innerHTML = `
    <div class="row between" style="margin-bottom:8px"><span><span class="subtle">Kekayaan bersih</span> <b class="num" style="font-size:16px">${rp(nw.net)}</b></span>${first != null ? `<span class="subtle">sejak hari ke-${series[0][0] + 1}: ${delta(nw.net - first, first >= 1_000_000 ? (nw.net - first) / first : null, true)}</span>` : ''}</div>
    ${nw.totalAssets > 0 ? `<div style="display:flex;height:8px;border-radius:99px;overflow:hidden;background:var(--bluegray)">${parts.map(p => p[1] > 0 ? `<i style="width:${p[1] / tot * 100}%;background:${p[2]}"></i>` : '').join('')}</div>` : ''}
    <div class="row wrap" style="gap:14px;margin-top:8px;font-size:12px">${parts.map(p => `<span class="row" style="gap:6px"><i class="dot" style="background:${p[2]}"></i>${p[0]} <b class="num">${rpShort(p[1])}</b></span>`).join('')}</div>`;
}

function profile() {
  const S = E.S, P = E.P || {}, V = E.EDU, L = E.levelInfo(), d = E.dayNow(), age = E.ageYears();
  const birth = P.birthDate ? new Date(P.birthDate + 'T00:00:00Z') : null;
  const fam = V?.family?.[P.family];
  $('#profile').innerHTML = `<div class="panel-h"><h2>Profil karakter</h2><div class="row" style="gap:8px"><span class="chip dark">Level ${L.level}</span><button class="btn sm" data-edit-profile>Ubah</button></div></div>
  <div class="panel-b">
    <div class="row" style="gap:12px;margin-bottom:12px"><span class="avatar-lg avatar-photo" aria-hidden="true"><img data-current-avatar alt="Avatar karakter" src="assets/img/avatars/avatar-1.svg"></span><div style="min-width:0;flex:1"><b style="font-size:15px">${esc(P.name || S.player.name)}</b><div class="subtle">Panggilan ${esc(P.nickname || '—')} · <span class="mono">${esc(V?.charId || '')}</span></div><div class="avatar-picker" role="group" aria-label="Pilih avatar">${Array.from({length:6},(_,i)=>`<button type="button" class="avatar-option" data-avatar="${i+1}" aria-label="Pilih avatar ${i+1}" title="Avatar ${i+1}"><img src="assets/img/avatars/avatar-${i+1}.svg" alt=""></button>`).join('')}</div><small class="subtle">Pilihan avatar tersimpan di browser ini.</small></div></div>
    <dl class="dl">
      <dt>Umur</dt><dd>${age} tahun</dd>
      <dt>Tanggal lahir</dt><dd>${birth ? fmtDate(birth, false) : '—'}</dd>
      <dt>Jenis kelamin</dt><dd>${P.gender === 'P' ? 'Perempuan' : 'Laki-laki'}</dd>
      <dt>Tempat lahir</dt><dd>${esc(P.birthPlace || '—')}</dd>
      <dt>Kota domisili</dt><dd>${esc(P.city || '—')}${P.province ? ', ' + esc(P.province) : ''}</dd>
      <dt>Wali</dt><dd>${esc(P.guardian || '—')}</dd>
      <dt>Latar keluarga</dt><dd>${esc(fam?.label || '—')}</dd>
      <dt>Cita-cita</dt><dd>${esc(P.aspiration || '—')}</dd>
      <dt>Pendidikan tertinggi</dt><dd>${esc(S.player.education)}</dd>
      <dt>Reputasi</dt><dd>${S.player.reputation.toFixed(1)} / 100</dd>
    </dl>
    <div class="divider"></div>
    <div class="row between subtle"><span>XP ${num(L.xp - L.cur)} / ${num(L.next - L.cur)}</span><span>Level ${L.level + 1}</span></div>
    <div class="bar" style="margin:6px 0 4px" role="progressbar" aria-valuenow="${Math.round(L.pct * 100)}" aria-valuemin="0" aria-valuemax="100" aria-label="Progres level"><i style="width:${L.pct * 100}%"></i></div>
    <p class="subtle" style="margin:8px 0 0">Hari ke-${d + 1} · ${fmtDay(d, 'long')}. Tanggal mengikuti kalender game (12 bulan × 30 hari). Usia memakai skala hidup dipercepat: 1 tahun ajaran (56 hari game) = 1 tahun usia. <a href="calendar.html">Buka kalender</a></p>
  </div>`;
  const avatarKey = `bizsim-avatar:${V?.charId || 'local'}`;
  const selectedAvatar = Math.max(1, Math.min(6, Number(localStorage.getItem(avatarKey) || 1)));
  const currentAvatar = $('#profile [data-current-avatar]');
  if (currentAvatar) currentAvatar.src = `assets/img/avatars/avatar-${selectedAvatar}.svg`;
  $('#profile .avatar-picker')?.querySelectorAll('[data-avatar]').forEach(btn => {
    btn.setAttribute('aria-pressed', String(Number(btn.dataset.avatar) === selectedAvatar));
    btn.onclick = () => {
      const n = Math.max(1, Math.min(6, Number(btn.dataset.avatar) || 1));
      localStorage.setItem(avatarKey, String(n));
      if (currentAvatar) currentAvatar.src = `assets/img/avatars/avatar-${n}.svg`;
      $('#profile .avatar-picker')?.querySelectorAll('[data-avatar]').forEach(b => b.setAttribute('aria-pressed', String(b === btn)));
    };
  });
  $('#profile [data-edit-profile]').onclick = async () => {
    const r = await editProfile(E.P || {}, { gameDay: E.dayNow() });
    if (!r) return;
    E.setEdu(r); if (E.S) { E.S.player.name = r.profile.name; E.save(); }
    E.emit('change'); render(); toast(r.changed?.length ? 'Profil diperbarui dan disimpan di server.' : 'Tidak ada perubahan.', 'ok');
  };
}

function eduCard() {
  const V = E.EDU, el = $('#edu'); if (!V) { el.innerHTML = ''; return; }
  const e = V.edu;
  if (e.status !== 'enrolled') {
    el.innerHTML = `<div class="panel-h"><h2>Pendidikan</h2><a class="btn sm ghost" href="education.html">Detail</a></div>${empty('education', e.status === 'graduated' ? `Lulus ${esc(e.highest)}` : 'Belum terdaftar di sekolah', e.status === 'graduated' ? 'Catatan kelulusan fiktif tersimpan. Pilih jenjang berikutnya atau jalur lain.' : 'Mulai dari SD kelas 1. Bandingkan biaya sekolah negeri dan swasta sebelum mendaftar.', '<a class="btn sm primary" href="education.html#catalog">Pilih sekolah</a>')}`;
    return;
  }
  const att = e.attendanceLog.length ? Math.round(e.attendanceLog.filter(a => a.status === 'hadir').length / e.attendanceLog.length * 100) : null;
  el.innerHTML = `<div class="panel-h"><h2>Pendidikan</h2><a class="btn sm ghost" href="education.html">Detail</a></div>
  <div class="panel-b"><div><b>${esc(e.institution.name)}</b><div class="subtle">${esc(e.stage)} · ${esc(e.labelTerm)} · ${esc(e.program)}</div></div>
  <div class="row between subtle" style="margin-top:10px"><span>Hari periode ${e.termDay} / ${V.rules.termDays}</span><span>Kehadiran ${att == null ? '—' : att + '%'}</span></div>
  <div class="bar" style="margin-top:6px" role="progressbar" aria-label="Hari periode" aria-valuenow="${e.termDay}" aria-valuemin="0" aria-valuemax="${V.rules.termDays}"><i style="width:${e.termDay / V.rules.termDays * 100}%"></i></div>
  <dl class="dl" style="margin-top:10px">${e.subjects.map(sb => `<dt>${esc(sb.name)}</dt><dd>${num(sb.current.grade, 1)} <span class="subtle">sementara</span></dd>`).join('')}<dt>Tunggakan</dt><dd class="${e.outstanding > 0 ? 'neg' : ''}">${rp(e.outstanding)}</dd></dl></div>`;
}

function careerCard() {
  const S = E.S, c = S.career, el = $('#career');
  if (!c.job) {
    const apps = c.applications.filter(a => ['dikirim', 'ditinjau', 'evaluasi', 'menunggu', 'tawaran'].includes(a.status));
    el.innerHTML = `<div class="panel-h"><h2>Progres karier</h2><a class="btn sm ghost" href="career.html">Detail</a></div>
      ${empty('career', 'Belum ada pekerjaan aktif', E.ageLock('gig') ? `Kerja lepas terbuka mulai usia ${E.AGE_RULES.gig} tahun simulasi. Saat ini fokus sekolah; uang saku dari wali masuk setiap hari.` : apps.length ? `${apps.length} lamaran sedang diproses. Kerja lepas tetap bisa diambil sambil menunggu.` : 'Mulai dari kerja lepas harian tanpa modal, lalu lamar pekerjaan paruh waktu atau penuh waktu.', `<a class="btn sm primary" href="career.html">Cari pekerjaan</a>`)}`;
    return;
  }
  const j = E.jobById(c.job.jobId), pr = E.promotionStatus();
  const started = E.dayNow() >= c.job.startDay;
  el.innerHTML = `<div class="panel-h"><h2>Progres karier</h2><a class="btn sm ghost" href="career.html#active">Detail</a></div>
  <div class="panel-b">
    <div class="row between"><div><b>${esc(j.title)}</b><div class="subtle">${esc(j.company)} · ${j.industry}</div></div><span class="chip info">${{ full: 'Penuh waktu', part: 'Paruh waktu', gig: 'Lepas' }[j.type]}</span></div>
    <dl class="dl" style="margin-top:10px">
      <dt>Hari kerja</dt><dd>${started ? c.job.daysWorked : 'Mulai besok'}</dd>
      <dt>Kinerja rata-rata</dt><dd>${started && c.job.daysWorked ? Math.round(c.job.perf) + ' / 100' : '—'}</dd>
      <dt>${j.type === 'full' ? 'Gaji bulanan' : 'Upah per shift'}</dt><dd>${rp(j.pay)}</dd>
      <dt>Pembayaran berikutnya</dt><dd>${j.type === 'full' ? 'Tanggal 25' : 'Jumat'}${j.type === 'part' && c.job.unpaid ? ` · terkumpul ${rpShort(c.job.unpaid)}` : ''}</dd>
    </dl>
    ${pr?.next ? `<div class="divider"></div><div class="subtle">Promosi ke <b>${esc(pr.next.title)}</b></div>${pr.available ? '<div class="chip pos" style="margin-top:6px">Memenuhi syarat — ajukan di Career</div>' : `<ul style="margin:6px 0 0;padding-left:18px;font-size:12px;color:var(--text-2)">${pr.reasons.slice(0, 3).map(r => `<li>${esc(r)}</li>`).join('')}</ul>`}` : ''}
  </div>`;
}

function cashCard() {
  const S = E.S, last = S.ledger[S.ledger.length - 1], el = $('#cash');
  if (!last) { el.innerHTML = `<div class="panel-h"><h2>Arus kas kemarin</h2></div><div class="panel-b subtle">Belum ada hari yang selesai. Rincian pemasukan & pengeluaran muncul setelah hari ke-1 berakhir.</div>`; return; }
  const inc = Object.entries(last.income).filter(([, v]) => v > 0), ex = Object.entries(last.expense).filter(([, v]) => v > 0);
  const net = inc.reduce((s, [, v]) => s + v, 0) - ex.reduce((s, [, v]) => s + v, 0);
  el.innerHTML = `<div class="panel-h"><h2>Arus kas kemarin</h2><span class="subtle">Hari ke-${last.day + 1}</span></div>
  <div class="panel-b"><dl class="dl">
    ${inc.map(([k, v]) => `<dt>${INCOME_LABEL[k] || k}</dt><dd class="pos">+${rp(v)}</dd>`).join('') || '<dt>Pemasukan</dt><dd>Rp 0</dd>'}
    ${ex.map(([k, v]) => `<dt>${EXP_LABEL[k] || k}</dt><dd class="neg">−${rp(v).replace('−', '')}</dd>`).join('')}
  </dl><div class="divider"></div><div class="row between"><b>Arus kas bersih</b>${delta(net)}</div></div>`;
}

function bizPanel() {
  const S = E.S, list = S.businesses.filter(b => b.status === 'buka'), el = $('#biz');
  if (!list.length) {
    const cheapest = [...E.BUSINESS_CATALOG].sort((a, b) => a.capex - b.capex)[0];
    el.innerHTML = `<div class="panel-h"><h2>Bisnis yang dimiliki</h2></div>${empty('business', 'Belum memiliki bisnis', `Bisnis termurah di katalog (${cheapest.name}) butuh modal awal ${rpShort(cheapest.capex)} plus modal kerja ±${rpShort(cheapest.workingCapital)}. Bangun tabungan dari pekerjaan dulu.`, `<a class="btn sm" href="business.html">Lihat katalog bisnis</a>`)}`;
    return;
  }
  el.innerHTML = `<div class="panel-h"><h2>Bisnis yang dimiliki</h2><a class="btn sm ghost" href="business.html">Kelola</a></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Bisnis</th><th class="r">Laba kemarin</th><th class="r hide-m">Laba 7 hari</th><th class="r hide-m">Kumulatif</th><th class="hide-m">Tren</th></tr></thead><tbody>
  ${list.map(b => { const cat = E.catalogById(b.typeId), h = b.history, last = h[h.length - 1]; const w = h.slice(-7).reduce((s, r) => s + r.profit, 0);
    return `<tr class="clickable" onclick="location.href='business.html#biz-${b.bid}'"><td><b>${cat.name}</b><div class="subtle">${E.LOCATIONS[b.location].name} · ★ ${b.rating.toFixed(1)}</div></td>
    <td class="r">${last ? delta(last.profit, null, true) : '<span class="subtle">Belum ada data</span>'}</td><td class="r hide-m">${h.length ? delta(w, null, true) : '—'}</td><td class="r hide-m">${delta(b.cumProfit, null, true)}</td><td class="hide-m">${sparkline(h.slice(-14).map(r => [r.day, r.profit]), 90, 28, h.slice(-14).reduce((a, r) => a + r.profit, 0) < 0 ? 'var(--red-ink)' : 'var(--green-ink)')}</td></tr>`; }).join('')}
  </tbody></table></div>`;
}

function invPanel() {
  const S = E.S, el = $('#inv'), d = E.dayNow();
  const holds = S.invest.holdings.filter(h => h.status !== 'selesai');
  const pos = Object.entries(S.trading.positions).filter(([, p]) => p.units > 0);
  if (!holds.length && !pos.length) {
    el.innerHTML = `<div class="panel-h"><h2>Investasi & posisi trading</h2></div>${empty('invest', 'Belum ada investasi', 'Reksa dana indeks bisa dimulai dari Rp 10.000 dan emas dari 0,01 gram. Trading jangka pendek ada di Asset Market dan berisiko lebih tinggi.', `<div class="row" style="justify-content:center"><a class="btn sm" href="investments.html">Investments</a><a class="btn sm ghost" href="market.html">Asset Market</a></div>`)}`;
    return;
  }
  const CAT = { saham: 'Saham & Index', emas: 'Emas', tanah: 'Tanah', properti: 'Properti', obligasi: 'Obligasi', deposito: 'Deposito' };
  const rows = holds.map(h => { const it = E.instrument(h.cat, h.iid); const v = E.holdingValue(S.invest, h, S.economy, S.seed, d); return { name: it.name || 'Tanah ' + it.location, cat: CAT[h.cat], v, pl: v - h.cost, rel: (v - h.cost) / h.cost, kind: 'Investasi', href: 'investments.html' }; });
  for (const [sym, p] of pos) { const q = E.currentQuote(S.market, sym); const v = p.units * q, cost = p.units * p.avgCost; rows.push({ name: sym, cat: 'Trading', v, pl: v - cost, rel: (v - cost) / cost, kind: 'Trading', href: `market.html#${sym}` }); }
  el.innerHTML = `<div class="panel-h"><h2>Investasi & posisi trading</h2><span class="subtle">Nilai estimasi — belum direalisasikan</span></div>
  <div class="table-wrap"><table class="table"><thead><tr><th>Aset</th><th class="hide-m">Jenis</th><th class="r">Nilai est.</th><th class="r">Unrealized P/L</th></tr></thead><tbody>
  ${rows.map(r => `<tr class="clickable" onclick="location.href='${r.href}'"><td><b>${esc(r.name)}</b><div class="subtle show-m">${r.cat}</div></td><td class="hide-m"><span class="chip ${r.kind === 'Trading' ? 'info' : ''}">${r.cat}</span></td><td class="r">${rpShort(r.v)}</td><td class="r">${delta(r.pl, r.rel, true)}</td></tr>`).join('')}
  </tbody></table></div>`;
}

function activity() {
  const S = E.S;
  $('#act').innerHTML = S.activity.slice(0, 8).map(a => `<li style="align-items:flex-start"><i class="dot" style="margin-top:6px;background:${a.amount > 0 ? 'var(--green-ink)' : a.amount < 0 ? 'var(--red-ink)' : 'var(--border-strong)'}"></i><div style="flex:1;min-width:0"><div style="font-size:13px">${esc(a.text)}</div><div class="subtle">${fmtDay(a.day)} · ${a.time}</div></div>${a.amount ? `<span class="num ${cls(a.amount)}" style="font-size:12.5px;white-space:nowrap">${rpShort(a.amount)}</span>` : ''}</li>`).join('') || '<li class="subtle">Belum ada aktivitas.</li>';
}

function render() { hero(); nearAgenda(); notifs(); kpis(); nextSteps(); netWorthPanel(); profile(); eduCard(); careerCard(); cashCard(); bizPanel(); invPanel(); activity(); }
render();
let lastG = -1;
E.on('change', render); E.on('edu', render);
let lastSlow = 0;
E.on('tick', () => { // per tick: hanya bagian yang dipengaruhi harga & jam
  hero(); kpis(); invPanel();
  if (Date.now() - lastSlow > 2000) { lastSlow = Date.now(); profile(); nearAgenda(); notifs(); }
});
E.on('clock', () => { const c = page.querySelector('[data-bigclock]'); if (c) c.textContent = CAL.fmtHMS(E.secOfDay()); if (E.S.life?.activity) heroNow(); });
F.onUpdate(() => { qaKey = null; hero(); notifs(); nearAgenda(); });
F.init().catch(() => {});
window.addEventListener('resize', () => netWorthPanel());
page.addEventListener('click', e => {
  const q = e.target.closest('[data-qa-why]'); if (q) { toast(q.dataset.qaWhy, 'error'); return; }
  const g = e.target.closest('[data-gig]'); if (g) result(E.takeGig(g.dataset.gig));
  if (e.target.closest('[data-skip]')) E.skipToNextDay(1);
});
