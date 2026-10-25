// MONETIZATION CALCULATION — status program, akrual estimasi, finalisasi, pembayaran, sponsor, afiliasi, membership, merch.
// Prinsip: estimasi (belum pasti) ≠ final (menunggu pembayaran) ≠ diterima (masuk saldo pemain). Semua tercatat di C.tx.
import { PLATFORMS, BRANDS } from '../../data/creator-platforms.js';
import { weekdayOf } from '../calendar.js';
import { programStatus, programActive, activeStrikes, rolling } from './rules.js';
import { nicheOf } from './audience.js';
import { hrand, clamp } from '../rng.js';

const T = 48;
export const SPONSOR_TAX = 0.02, AFF_RETURN = 0.08, AFF_PRICE = 150_000, AFF_RATE = 0.08;
export const MERCH = { setup: 750_000, price: 120_000, cogs: 70_000, fee: 0.05 };

export function addTx(C, ctx, t) {
  C.tx.unshift({ id: C.txSeq++, g: ctx.g, day: ctx.day, ...t });
  if (C.tx.length > 500) C.tx.length = 500;
}
export function note(C, ctx, kind, text, platform = null) {
  C.notes.unshift({ id: C.noteSeq++, g: ctx.g, day: ctx.day, kind, text, platform, read: false });
  if (C.notes.length > 120) C.notes.length = 120;
  ctx.emit?.('creator-note', { kind, text });
}

/** Perbarui status program (locked → review → active, atau suspended). Dipanggil harian & saat dibuka. */
export function updatePrograms(C, ctx) {
  for (const acc of Object.values(C.accounts)) {
    const P = PLATFORMS[acc.id];
    for (const pid of Object.keys(P.programs)) {
      const st = (acc.programs[pid] ||= { status: 'locked' });
      const s = programStatus(acc, pid, C, ctx);
      if (s.regionLock) { st.status = 'locked'; continue; }
      const strikeBlock = activeStrikes(acc, ctx.day) > 0 && s.reqs.some(r => r.label.includes('strike'));
      if (st.status === 'active' && strikeBlock) { st.status = 'suspended'; note(C, ctx, 'monetization', `${P.programs[pid].name} ditangguhkan karena strike aktif.`, acc.id); continue; }
      if (st.status === 'suspended' && !strikeBlock) { st.status = 'active'; note(C, ctx, 'monetization', `${P.programs[pid].name} aktif kembali.`, acc.id); continue; }
      // Tidak ada aktivasi otomatis: syarat terpenuhi → 'eligible'; pemain harus mengajukan sendiri.
      if (st.status === 'locked' && s.allMet) { st.status = 'eligible'; note(C, ctx, 'monetization', `${P.name}: syarat ${P.programs[pid].name} terpenuhi. Ajukan di panel Monetization jika ingin mengaktifkan.`, acc.id); }
      else if (st.status === 'eligible' && !s.allMet) st.status = 'locked';
      else if (st.status === 'review' && ctx.day >= st.reviewUntil) {
        if (s.allMet) { st.status = 'active'; st.since = ctx.day; note(C, ctx, 'monetization', `${P.name}: ${P.programs[pid].name} disetujui.`, acc.id); }
        else { st.status = 'locked'; note(C, ctx, 'monetization', `${P.name}: peninjauan ${P.programs[pid].name} tidak lolos — syarat tidak lagi terpenuhi.`, acc.id); }
      }
    }
  }
}

/** Aksi pemain: ajukan program (syarat harus terpenuhi), atau nonaktifkan/aktifkan lagi. */
export function applyProgram(C, ctx, acc, pid) {
  const P = PLATFORMS[acc.id], prog = P.programs[pid]; if (!prog) return 'Program tidak dikenal.';
  const st = (acc.programs[pid] ||= { status: 'locked' }), s = programStatus(acc, pid, C, ctx);
  if (s.regionLock) return s.regionLock;
  if (st.status === 'active') return 'Program sudah aktif.';
  if (st.status === 'review') return 'Pengajuan sedang ditinjau.';
  if (st.status === 'suspended') return 'Program ditangguhkan selama strike aktif.';
  if (!s.allMet) return 'Syarat belum terpenuhi: ' + s.reqs.filter(r => !r.met).map(r => r.label).join('; ');
  if (prog.review) { st.status = 'review'; st.reviewUntil = ctx.day + prog.review; return null; }
  st.status = 'active'; st.since = ctx.day; return null;
}

/** Akrual pendapatan iklan/program kreator dari tayangan konten (estimasi). */
export function adAccrual(c, acc, inc, ctx) {
  const P = PLATFORMS[c.platform], n = nicheOf(c.niche);
  if (c.flags.claimed || c.music === 'unlicensed' && c.platform === 'youtube') return 0;
  let rev = 0;
  if (c.platform === 'youtube' && programActive(acc, 'ads')) {
    const rpm = n.rpm[0] + (n.rpm[1] - n.rpm[0]) * hrand(ctx.seed, 'rpm', c.niche, ctx.day);
    if (c.format === 'long') rev = inc.views * P.adsRule.servedShare * rpm / 1000;
    else if (c.format === 'shorts') rev = inc.views * rpm * P.adsRule.shortsRpmFactor / 1000;
  } else if (c.platform === 'tiktok' && programActive(acc, 'rewards') && c.format === 'video' && c.dur >= P.adsRule.minDur) {
    const [a, b] = P.adsRule.rpm; rev = inc.views * 0.6 * (a + (b - a) * hrand(ctx.seed, 'ttrpm', ctx.day)) / 1000;
  }
  if (rev > 0) { acc.wallet.est += rev; acc.wallet.estBy.ads = (acc.wallet.estBy.ads || 0) + rev; c.m.rev += rev; acc.today.rev += rev; }
  // Afiliasi: komisi tertunda sampai masa retur 14 hari lewat.
  if (c.affiliate && programActive(acc, 'affiliate')) {
    const sales = inc.views * 0.006 * n.intent * (0.5 + c.q.idea) * 0.03;
    if (sales > 0) { const comm = sales * AFF_PRICE * AFF_RATE; c.m.affSales += sales; c.m.affComm += comm; acc.wallet.affPending += comm; acc.today.aff = (acc.today.aff || 0) + comm; }
  }
  return rev;
}

/** Akhir hari: membership, konfirmasi afiliasi, penarikan diamond, sponsor jatuh tempo, merch. */
export function dayEnd(C, ctx, d) {
  for (const acc of Object.values(C.accounts)) {
    const P = PLATFORMS[acc.id];
    // Membership / subscriptions: bergabung dari penonton setia, berhenti ~0,3%/hari.
    const mp = Object.entries(P.programs).find(([, x]) => x.kind === 'membership');
    if (mp && programActive(acc, mp[0])) {
      const engaged = rolling(acc, d, 7, 'likes') / 7;
      const join = engaged * 0.0009 * (acc.rep / 60), leave = acc.members * 0.003;
      acc.members = Math.max(0, acc.members + join - leave);
      const rev = acc.members * mp[1].price * mp[1].share / 30;
      acc.wallet.est += rev; acc.wallet.estBy.membership = (acc.wallet.estBy.membership || 0) + rev; acc.today.rev += rev;
    }
    // Afiliasi: konfirmasi harian porsi yang sudah melewati masa retur (antrian FIFO kasar).
    if (acc.today.aff) { acc.wallet.affQueue.push([d + 14, acc.today.aff]); }
    while (acc.wallet.affQueue.length && acc.wallet.affQueue[0][0] <= d) {
      const [, amt] = acc.wallet.affQueue.shift(); const conf = amt * (1 - AFF_RETURN);
      acc.wallet.affPending = Math.max(0, acc.wallet.affPending - amt); acc.wallet.final += conf; acc.wallet.finalBy.affiliate = (acc.wallet.finalBy.affiliate || 0) + conf;
    }
    // Penarikan diamond yang sudah diproses.
    for (const w of acc.wallet.withdrawals.filter(w => w.status === 'proses' && w.readyDay <= d)) {
      w.status = 'dibayar'; ctx.earn(w.net, 'kreator_dukungan', `Penarikan diamond ${P.name} (simulasi).`);
      addTx(C, ctx, { platform: acc.id, type: 'payout', source: 'gifts', label: `Penarikan ${Math.round(w.diamonds).toLocaleString('id-ID')} diamond`, gross: w.gross, fee: w.fee, tax: w.tax, net: w.net, status: 'dibayar' });
      C.stats.received += w.net;
    }
  }
  // Kontrak sponsor.
  for (const k of C.contracts) {
    if (k.status === 'aktif' && d > k.deadline) {
      k.status = 'gagal'; const acc = C.accounts[k.platform]; acc.rep = clamp(acc.rep - 6, 0, 100);
      if (k.upfrontPaid > 0) { ctx.forceSpend(k.upfrontPaid, 'kreator_sponsor_refund', 'pengembalian uang muka sponsor'); addTx(C, ctx, { platform: k.platform, type: 'refund', source: 'sponsor', label: `Pengembalian uang muka ${k.brand}`, gross: -k.upfrontPaid, fee: 0, tax: 0, net: -k.upfrontPaid, status: 'dibayar' }); }
      note(C, ctx, 'sponsor', `Kontrak ${k.brand} gagal: tenggat terlewat. Reputasi turun & uang muka dikembalikan.`, k.platform);
    }
    if (k.status === 'selesai' && !k.paid && d >= k.payDay) {
      const rest = k.fee - k.upfrontPaid, tax = rest * SPONSOR_TAX; k.paid = true;
      ctx.earn(rest - tax, 'kreator_sponsor', `Pelunasan sponsor ${k.brand} (simulasi).`); C.stats.received += rest - tax;
      addTx(C, ctx, { platform: k.platform, type: 'payout', source: 'sponsor', label: `Pelunasan ${k.brand}`, gross: rest, fee: 0, tax, net: rest - tax, status: 'dibayar' });
      note(C, ctx, 'sponsor', `${k.brand} melunasi pembayaran sponsor.`, k.platform);
    }
  }
  C.offers = C.offers.filter(o => o.expires >= d);
  // Merch: pesanan harian dari penggemar aktif; dibayar tiap Senin.
  const M = C.merch;
  if (M?.open) {
    const acc = C.accounts[M.platform], engaged = rolling(acc, d, 7, 'likes') / 7;
    const orders = engaged * 0.0012 * (acc.rep / 60) * (0.6 + 0.8 * hrand(ctx.seed, 'merch', d));
    M.orders += orders; M.pendingOrders += orders;
    const wd = weekdayOf(d + 1);
    if (wd === 1 && M.pendingOrders >= 1) {
      const qty = Math.floor(M.pendingOrders); M.pendingOrders -= qty;
      const gross = qty * MERCH.price, fee = gross * MERCH.fee, cogs = qty * MERCH.cogs, net = gross - fee - cogs;
      ctx.earn(net, 'kreator_merch', `Penjualan merch ${qty} pcs (simulasi).`); C.stats.received += net;
      addTx(C, ctx, { platform: M.platform, type: 'payout', source: 'merch', label: `Merch ${qty} pcs (HPP ${Math.round(cogs).toLocaleString('id-ID')})`, gross, fee: fee + cogs, tax: 0, net, status: 'dibayar' });
    }
  }
}

/** Akhir bulan: estimasi → final (penyesuaian lalu lintas tidak valid), langganan alat ditagih. */
export function monthEnd(C, ctx, d) {
  for (const acc of Object.values(C.accounts)) {
    if (acc.wallet.est > 0) {
      const adj = 0.9 + 0.1 * hrand(ctx.seed, 'adj', acc.id, d), fin = acc.wallet.est * adj;
      for (const [k, v] of Object.entries(acc.wallet.estBy)) acc.wallet.finalBy[k] = (acc.wallet.finalBy[k] || 0) + v * adj;
      addTx(C, ctx, { platform: acc.id, type: 'finalize', source: 'platform', label: `Finalisasi estimasi bulan ini (penyesuaian ${Math.round((1 - adj) * 1000) / 10}%)`, gross: acc.wallet.est, fee: acc.wallet.est - fin, tax: 0, net: fin, status: 'final' });
      acc.wallet.final += fin; acc.wallet.est = 0; acc.wallet.estBy = {};
    }
  }
}

/** Hari pembayaran (tanggal 21): final ≥ ambang → masuk saldo setelah pajak simulasi. */
export function payoutDay(C, ctx, d, dom) {
  for (const acc of Object.values(C.accounts)) {
    const P = PLATFORMS[acc.id], po = P.payout; if (!po || dom !== po.day) continue;
    const fin = acc.wallet.final; if (fin <= 0) continue;
    if (fin < po.min) { note(C, ctx, 'monetization', `${P.name}: saldo final ${Math.round(fin).toLocaleString('id-ID')} di bawah ambang pembayaran Rp ${po.min.toLocaleString('id-ID')} — dibawa ke bulan berikutnya.`, acc.id); continue; }
    const tax = fin * po.tax, net = fin - tax;
    ctx.earn(net, 'kreator_platform', `Pembayaran ${P.name} (simulasi).`); C.stats.received += net;
    addTx(C, ctx, { platform: acc.id, type: 'payout', source: 'platform', label: `Pembayaran ${P.name}: ${Object.entries(acc.wallet.finalBy).map(([k, v]) => `${k} ${Math.round(v).toLocaleString('id-ID')}`).join(', ')}`, gross: fin, fee: 0, tax, net, status: 'dibayar' });
    note(C, ctx, 'monetization', `${P.name} membayar Rp ${Math.round(net).toLocaleString('id-ID')} ke saldo (setelah pajak simulasi ${po.tax * 100}%).`, acc.id);
    acc.wallet.final = 0; acc.wallet.finalBy = {};
  }
}

/** Penawaran sponsor mingguan (Senin) berdasarkan audiens, engagement, niche, reputasi. */
export function weeklyOffers(C, ctx, d) {
  for (const acc of Object.values(C.accounts)) {
    if (!programActive(acc, 'sponsor') || acc.terminated) continue;
    const P = PLATFORMS[acc.id], n = nicheOf(acc.niche);
    const eng = rolling(acc, d, 14, 'likes') / Math.max(1, rolling(acc, d, 14, 'views'));
    const lam = Math.min(3, Math.pow(acc.followers, 0.28) / 6 * n.brand * (acc.rep / 60) * (0.6 + eng * 8));
    const count = Math.floor(lam + hrand(ctx.seed, 'offer-n', acc.id, d));
    for (let i = 0; i < count; i++) {
      const fmts = Object.entries(P.formats).filter(([, f]) => f.monetize.includes('sponsor')).map(([k]) => k);
      const fid = fmts[Math.floor(hrand(ctx.seed, 'offer-f', acc.id, d, i) * fmts.length)];
      const hist = C.contents.filter(c => c.platform === acc.id && c.format === fid && c.status === 'published').slice(-8);
      const expViews = hist.length ? hist.reduce((s, c) => s + c.m.views, 0) / hist.length : acc.followers * 0.12;
      const qty = fid === 'long' ? 1 : 1 + Math.floor(hrand(ctx.seed, 'offer-q', acc.id, d, i) * 2);
      const fee = Math.round((50_000 + expViews * qty * 30 * n.brand * (0.8 + 0.4 * hrand(ctx.seed, 'offer-p', acc.id, d, i))) / 10_000) * 10_000;
      const brands = BRANDS[acc.niche] || ['Brand Lokal'];
      C.offers.push({ id: C.offerSeq++, platform: acc.id, brand: brands[Math.floor(hrand(ctx.seed, 'offer-b', acc.id, d, i) * brands.length)], niche: acc.niche, format: fid, qty, fee, upfront: hrand(ctx.seed, 'offer-u', acc.id, d, i) < 0.5 ? 0.3 : 0, days: 7 + Math.floor(hrand(ctx.seed, 'offer-d', acc.id, d, i) * 8), expires: d + 3, expViews: Math.round(expViews), createdDay: d });
      note(C, ctx, 'sponsor', `Penawaran sponsor baru dari ${C.offers[C.offers.length - 1].brand} untuk ${P.name}.`, acc.id);
    }
  }
}
