// AGENDA & JADWAL — membaca state engine dan server (pendidikan) lalu menyusun event per tanggal kalender game.
// Tidak membuat event sendiri: setiap item berasal dari aturan yang benar-benar dijalankan engine pada hari itu.
// Jenis kepastian:  'terjadwal' = pasti terjadi bila state tidak berubah · 'estimasi' = nominal/hasil bisa berbeda
//                   'tenggat'   = batas waktu aksi pemain (jika lewat, konsekuensi berlaku).
import * as E from './core.js';
import * as CAL from './calendar.js';
import * as F from './finance.js';
import * as CR from './creator/studio.js';
import { gearItem } from './creator/rules.js';
import { TIME_RULES as TR } from '../data/time-rules.js';
import { PLATFORMS } from '../data/creator-platforms.js';
import { WARMUP_DAYS } from '../data/market-assets.js';

const T = CAL.TICKS_PER_DAY, END = CAL.SEC_PER_DAY; // sec = END berarti "akhir hari" (saat pergantian hari diproses)
const gDay = g => Math.floor(g / T) - WARMUP_DAYS, gSec = g => (g % T) * CAL.SEC_PER_TICK;
const ev = (day, sec, cat, title, o = {}) => ({ day, sec, cat, title, certainty: 'terjadwal', ...o });

export const CATS = {
  sekolah: { label: 'Sekolah', tone: 'navy' }, ujian: { label: 'Ujian & tugas', tone: 'warn' }, kerja: { label: 'Kerja', tone: 'navy' },
  gaji: { label: 'Gajian', tone: 'pos' }, tagihan: { label: 'Tagihan', tone: 'neg' }, kreator: { label: 'Kreator', tone: 'info' },
  investasi: { label: 'Investasi', tone: 'pos' }, bisnis: { label: 'Bisnis', tone: 'info' }, karier: { label: 'Karier', tone: 'warn' }, ekonomi: { label: 'Ekonomi', tone: 'muted' },
};

/** Semua event terjadwal/estimasi dari hari `from` sampai `to` (inklusif). Hari yang sudah lewat tidak diproyeksikan. */
export function eventsBetween(from, to) {
  const S = E.S, today = E.dayNow(), out = [];
  from = Math.max(from, today); if (to < from) return out;
  const inR = d => d >= from && d <= to;
  // ——— karier: gaji & upah ———
  const c = S.career, job = c.job ? E.jobById(c.job.jobId) : null;
  if (job && job.type === 'full') {
    let pd = CAL.nextDateOfMonth(Math.max(today, c.job.startDay), TR.pay.fullDay), days = c.job.periodDays;
    for (let d = today; d <= Math.min(pd, to + 400); d++) if (CAL.isWeekday(d) && d >= c.job.startDay) days++;
    for (let k = 0; pd <= to && k < 24; k++) {
      if (inR(pd)) out.push(ev(pd, END, 'gaji', `Gaji bulanan ${job.title}`, { amount: Math.round(job.pay * Math.min(1, days / TR.pay.fullDays)), certainty: 'estimasi', detail: `Prorata ${Math.min(days, TR.pay.fullDays)}/${TR.pay.fullDays} hari kerja jika masuk setiap hari kerja sampai tanggal ${TR.pay.fullDay}.`, href: 'career.html' }));
      const next = CAL.nextDateOfMonth(pd + 1, TR.pay.fullDay); days = 0; for (let d = pd + 1; d <= next; d++) if (CAL.isWeekday(d)) days++; pd = next;
    }
  }
  if (job && job.type === 'part') {
    let unpaid = c.job.unpaid;
    for (let d = today; d <= to; d++) {
      if (CAL.isWeekday(d) && d >= c.job.startDay) unpaid += job.pay;
      if (CAL.weekdayOf(d) === TR.pay.partWeekday) { if (inR(d) && unpaid > 0) out.push(ev(d, END, 'gaji', `Upah mingguan ${job.title}`, { amount: unpaid, certainty: 'estimasi', detail: 'Dibayar Jumat akhir hari untuk shift yang dijalani minggu ini.', href: 'career.html' })); unpaid = 0; }
    }
  }
  if (c.gigToday && inR(today)) { const gj = E.jobById(c.gigToday); out.push(ev(today, END, 'gaji', `Upah shift lepas ${gj.title}`, { amount: gj.pay, detail: 'Masuk saldo saat pergantian hari.', href: 'career.html' })); }
  for (const a of c.applications) {
    const j = E.jobById(a.jobId); if (!j) continue;
    if (a.status === 'evaluasi' && inR(a.deadline)) out.push(ev(a.deadline, END, 'karier', `Batas ${j.evaluation === 'interview' ? 'interview' : 'tes skill'}: ${j.title}`, { certainty: 'tenggat', detail: 'Jika tidak dikerjakan sampai akhir hari ini, undangan kedaluwarsa.', href: 'career.html' }));
    if (a.status === 'tawaran' && inR(a.offerUntil)) out.push(ev(a.offerUntil, END, 'karier', `Batas menjawab tawaran: ${j.title}`, { certainty: 'tenggat', detail: 'Tawaran kedaluwarsa setelah akhir hari ini.', href: 'career.html' }));
    if (a.status === 'menunggu' && inR(Math.max(today, a.evalDay))) out.push(ev(Math.max(today, a.evalDay), END, 'karier', `Keputusan lamaran: ${j.title}`, { certainty: 'estimasi', detail: 'Hasil diumumkan saat pergantian hari; peluang tidak dijamin.', href: 'career.html' }));
    if (a.status === 'dikirim' || a.status === 'ditinjau') { const d = a.status === 'dikirim' ? Math.max(today, a.day) : Math.max(today, a.day + 1); if (inR(d)) out.push(ev(d, END, 'karier', `Lamaran ${j.title} diproses HR`, { certainty: 'estimasi', href: 'career.html' })); }
  }
  // ——— pendidikan (data server) ———
  const e = E.EDU?.edu, R = E.EDU?.rules;
  if (e?.status === 'enrolled' && R && e.termStartDay != null) {
    const t0 = e.termStartDay, day = td => t0 + td - 1, w = e.windows || {};
    const win = (rng, cat, title, detail, conditional = false) => { if (!rng) return; for (let td = rng[0]; td <= rng[1]; td++) if (inR(day(td))) out.push(ev(day(td), null, cat, `${title}${rng[1] > rng[0] ? ` (hari ${td - rng[0] + 1}/${rng[1] - rng[0] + 1})` : ''}`, { certainty: conditional ? 'estimasi' : td === rng[1] ? 'tenggat' : 'terjadwal', detail, href: 'education.html#exams' })); };
    win(w.mid, 'ujian', 'Jendela UTS', 'Ujian dikerjakan di halaman Education; nilai dihitung server. Setelah hari terakhir jendela, ujian tercatat tidak dikerjakan.');
    win(w.final, 'ujian', 'Jendela UAS', 'Sama seperti UTS. Kartu ujian tertahan jika tagihan periode belum lunas.');
    if (w.remedial) win(w.remedial, 'ujian', 'Jendela remedial', 'Hanya berlaku jika ada mata pelajaran di bawah KKM setelah UAS.', true);
    if (w.report && inR(day(w.report))) out.push(ev(day(w.report), null, 'sekolah', 'Rapor & keputusan naik kelas', { detail: 'Diputuskan server dari nilai, kehadiran, dan tugas.', href: 'education.html' }));
    if (inR(day(R.termDays + 1))) out.push(ev(day(R.termDays + 1), 0, 'sekolah', 'Periode berikutnya dimulai', { certainty: 'estimasi', detail: 'Tergantung keputusan rapor (naik, mengulang, atau lulus).', href: 'education.html' }));
    for (const t of e.tasks || []) if (t.status === 'open' && inR(day(t.dueTermDay))) out.push(ev(day(t.dueTermDay), END, 'ujian', `Tenggat ${t.title}`, { certainty: 'tenggat', detail: 'Tugas yang lewat tenggat bernilai 0.', href: 'education.html#subjects' }));
    for (const b of e.bills || []) if (b.paid < b.amount && inR(Math.max(today, day(b.dueTermDay)))) out.push(ev(Math.max(today, day(b.dueTermDay)), null, 'tagihan', `Jatuh tempo: ${b.label}`, { amount: -(b.amount - b.paid), certainty: 'tenggat', detail: 'Jika belum lunas, kartu ujian tertahan.', href: 'education.html' }));
  }
  // ——— akhir bulan: cicilan, langganan, ekonomi ———
  for (let d = from; d <= to; d++) {
    if (!CAL.isMonthEnd(d)) continue;
    for (const debt of S.debts) if (debt.remaining > 0) { const interest = debt.remaining * debt.rateYear / 12; out.push(ev(d, END, 'tagihan', `Cicilan ${debt.name}`, { amount: -Math.round(Math.min(debt.monthlyPay, debt.remaining + interest)), detail: 'Dipotong otomatis dari saldo. Jika saldo kurang: bunga ×1,5 dan reputasi −2.', certainty: d === CAL.nextDateOfMonth(today, 30) ? 'terjadwal' : 'estimasi', href: 'index.html' })); }
    out.push(ev(d, END, 'ekonomi', 'Rapat suku bunga (simulasi)', { certainty: 'estimasi', detail: 'Hasil ditentukan engine saat pergantian hari dan tidak diketahui sebelumnya.' }));
    if (S.creator?.gear) for (const cat of ['internet', 'software']) { const it = gearItem(cat, S.creator.gear[cat]); if (it?.monthly) out.push(ev(d, END, 'tagihan', `Langganan ${it.name}`, { amount: -it.monthly, detail: 'Jika saldo kurang, kembali ke opsi gratis.', href: 'studio.html#gear' })); }
  }
  // ——— investasi ———
  for (const h of S.invest.holdings) {
    if (h.status === 'selesai' || !(h.qty > 0)) continue;
    const it = E.instrument(h.cat, h.iid), name = it.name || `Tanah ${it.location || ''}`;
    if ((h.cat === 'deposito' || h.cat === 'obligasi') && inR(h.maturityDay)) out.push(ev(h.maturityDay, END, 'investasi', `Jatuh tempo ${name}`, { amount: Math.round(h.qty + (h.cat === 'deposito' ? h.qty * it.rate * it.tenorDays / 360 * 0.8 : 0)), certainty: 'terjadwal', detail: h.cat === 'deposito' ? 'Pokok + bunga (setelah pajak 20%) masuk saldo.' : 'Nilai pokok dikembalikan.', href: 'investments.html' }));
    if (h.status === 'proses_jual' && inR(h.saleDay)) out.push(ev(h.saleDay, END, 'investasi', `Perkiraan pembeli ditemukan: ${name}`, { certainty: 'estimasi', detail: 'Harga final mengikuti penilaian pada hari itu.', href: 'investments.html' }));
    for (let d = from; d <= to; d++) {
      if (!CAL.isMonthEnd(d)) continue;
      if (h.cat === 'properti') { const p = S.invest.prop[h.iid], rent = it.rentPerUnit * it.units * p.occupancy; out.push(ev(d, END, 'investasi', `Sewa bersih ${name}`, { amount: Math.round(rent - p.value * it.maintYear / 12 - rent * it.mgmtFee), certainty: 'estimasi', detail: 'Dihitung dari okupansi & nilai saat ini; bisa berubah.', href: 'investments.html' })); }
      if (h.cat === 'tanah') out.push(ev(d, END, 'tagihan', `PBB ${name}`, { amount: -Math.round(E.holdingValue(S.invest, h, S.economy, S.seed, today) * it.pbbRate / 12), certainty: 'estimasi', detail: 'Dihitung dari nilai tanah saat itu.', href: 'investments.html' }));
      if (h.cat === 'obligasi') out.push(ev(d, END, 'investasi', `Kupon ${name}`, { amount: Math.round(h.qty * it.coupon / 12 * 0.9), detail: 'Setelah pajak 10%.', href: 'investments.html' }));
      if (h.cat === 'saham' && !S.invest.funds[h.iid] && TR.dividendMonths.includes(CAL.monthOf(d)) && it.divYield > 0) out.push(ev(d, END, 'investasi', `Dividen ${it.id}`, { amount: Math.round(h.qty * 100 * S.invest.stocks[h.iid].price * it.divYield / 4 * 0.9), certainty: 'estimasi', detail: 'Nominal mengikuti harga saham saat itu (setelah pajak 10%).', href: 'investments.html' }));
    }
  }
  // ——— bisnis ———
  for (const b of S.businesses) for (const o of b.pending || []) if (inR(o.arriveDay)) out.push(ev(o.arriveDay, 0, 'bisnis', `Kiriman stok tiba: ${E.catalogById(b.typeId).name}`, { detail: `${o.qty} unit dari pemasok.`, href: 'business.html' }));
  // ——— Creator Studio ———
  const cr = S.creator;
  if (cr) {
    for (const k of cr.contents) if (k.status === 'scheduled' && inR(gDay(k.scheduleG))) out.push(ev(gDay(k.scheduleG), gSec(k.scheduleG), 'kreator', `Terbit terjadwal: ${k.title}`, { detail: PLATFORMS[k.platform]?.name, href: 'studio.html#queue' }));
    for (const s of cr.scheduledLives) if (['terjadwal', 'waktunya'].includes(s.status) && inR(gDay(s.at))) out.push(ev(gDay(s.at), gSec(s.at), 'kreator', `Live terjadwal: ${s.title}`, { dur: s.durMin * 60, detail: `${PLATFORMS[s.platform]?.name} · ${s.durMin} menit`, href: 'studio.html#live' }));
    let eta = {}; try { eta = CR.queueEta(); } catch { eta = {}; }
    for (const [id, g] of Object.entries(eta)) { const k = cr.contents.find(x => x.id === +id); if (k && inR(gDay(g))) out.push(ev(gDay(g), gSec(g), 'kreator', `Perkiraan produksi selesai: ${k.title}`, { certainty: 'estimasi', detail: 'Dihitung dari jam luang, batas jam harian, dan energi. Bisa bergeser.', href: 'studio.html#queue' })); }
    for (const acc of Object.values(cr.accounts)) {
      const po = PLATFORMS[acc.id]?.payout;
      for (const w of acc.wallet.withdrawals) if (w.status === 'proses' && inR(Math.max(today, w.readyDay))) out.push(ev(Math.max(today, w.readyDay), END, 'kreator', `Penarikan diamond ${PLATFORMS[acc.id].name} cair`, { amount: Math.round(w.net), detail: 'Bersih setelah biaya transfer & pajak simulasi.', href: 'studio.html#money' }));
      if (po && (acc.wallet.final > 0 || acc.wallet.est > 0)) for (let d = from; d <= to; d++) if (CAL.dateOfMonth(d) === po.day) out.push(ev(d, 0, 'kreator', `Hari pembayaran ${PLATFORMS[acc.id].name}`, { certainty: 'estimasi', amount: acc.wallet.final > 0 ? Math.round(acc.wallet.final * (1 - po.tax)) : null, detail: `Dibayar jika saldo final ≥ Rp ${po.min.toLocaleString('id-ID')}. Estimasi bulan berjalan difinalkan akhir bulan.`, href: 'studio.html#money' }));
    }
  }
  // ——— keuangan (data server): tagihan kartu kredit, cetak tagihan, biaya admin bank ———
  if (F.V && F.CAT) {
    for (const st of F.V.statements || []) if (st.status === 'terbuka' && inR(st.dueDay)) out.push(ev(st.dueDay, END, 'tagihan', 'Jatuh tempo tagihan kartu kredit', { certainty: 'tenggat', amount: -(st.amount - st.paid), detail: `Minimum ${Math.max(0, st.minDue - st.paid).toLocaleString('id-ID')} rupiah. Lewat tanggal ini: denda & bunga, skor kredit turun.`, href: 'finance.html#tagihan' }));
    for (const a of F.accounts('credit')) { const pr = F.CAT.CREDIT_PRODUCTS.find(p => p.id === a.provider); if (!pr) continue;
      for (let d = from; d <= to; d++) if (CAL.dateOfMonth(d) === pr.statementDate && a.balance > 0) out.push(ev(d, END, 'tagihan', `Cetak tagihan ${a.name}`, { certainty: 'estimasi', amount: -a.balance, detail: 'Nominal = saldo kartu saat tanggal cetak.', href: 'finance.html#tagihan' })); }
    for (const a of F.accounts('bank')) { const b = F.bank(a.provider); if (!b?.adminMonthly) continue;
      for (let d = from; d <= to; d++) if (CAL.dateOfMonth(d) === 30 && a.openedDay <= d - 1) out.push(ev(d, END, 'tagihan', `Biaya admin ${b.short || b.name}`, { amount: -b.adminMonthly, detail: 'Autodebet dari rekening.', href: 'finance.html#rekening' })); }
  }
  return out.sort((a, b) => a.day - b.day || (a.sec ?? -1) - (b.sec ?? -1));
}

/** Blok jadwal harian (jam) untuk hari d — dari aturan yang sama dengan antrean produksi & live. */
export function dayPlan(d) {
  const sch = E.scheduleOf(d), blocks = [];
  blocks.push({ from: 0, to: TR.sleep.to, kind: 'tidur', label: TR.sleep.label });
  if (sch.school) blocks.push({ from: sch.school[0], to: sch.school[1], kind: 'sekolah', label: 'Sekolah' });
  if (sch.work) blocks.push({ from: sch.work[0], to: sch.work[1], kind: 'kerja', label: E.S.career.gigToday && d === E.dayNow() ? 'Shift lepas' : 'Kerja' });
  for (const s of E.S.creator?.scheduledLives || []) if (['terjadwal', 'waktunya'].includes(s.status) && gDay(s.at) === d) { const h = gSec(s.at) / 3600; blocks.push({ from: h, to: Math.min(24, h + s.durMin / 60), kind: 'live', label: 'Live terjadwal' }); }
  blocks.push({ from: TR.sleep.from, to: 24, kind: 'tidur', label: TR.sleep.label });
  blocks.sort((a, b) => a.from - b.from);
  // sisa jam = waktu luang (dipakai produksi konten sesuai batas jam harian)
  const free = []; let t = 0;
  for (const b of blocks) { if (b.from > t) free.push({ from: t, to: b.from, kind: 'luang', label: 'Waktu luang' }); t = Math.max(t, b.to); }
  return [...blocks, ...free].sort((a, b) => a.from - b.from);
}

/** Riwayat kejadian hari d (activity log + buku besar harian). */
export function historyOf(d) {
  const S = E.S;
  return { activity: S.activity.filter(a => a.day === d).slice().reverse(), ledger: S.ledger.find(l => l.day === d) || null };
}
/** Hari-hari yang punya catatan riwayat (untuk penanda di kalender bulanan). */
export function historyIndex() {
  const m = new Map();
  for (const a of E.S.activity) m.set(a.day, (m.get(a.day) || 0) + 1);
  return m;
}
export const fmtEvTime = sec => sec == null ? 'Sepanjang hari' : sec >= END ? 'Akhir hari' : CAL.fmtHM(sec);
