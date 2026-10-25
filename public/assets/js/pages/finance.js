// PERSONAL FINANCE — rekening bank, kartu debit/kredit, dompet digital fiktif, top up, transfer, riwayat, tagihan kartu kredit.
// Seluruh saldo, limit, biaya, dan status transaksi divalidasi & disimpan server. Halaman ini tidak menghitung saldo sendiri.
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as CAL from '../engine/calendar.js';
import { mountShell } from '../ui/shell.js';
import { rp, icon, esc, $, toast, empty } from '../ui/ui.js';

const page = await mountShell('finance', 'Keuangan');
window.__hashNav = true;
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, F };
const TABS = [['ringkasan', 'Ringkasan'], ['rekening', 'Rekening Bank'], ['kartu', 'Kartu'], ['dompet', 'Dompet Digital'], ['topup', 'Top Up'], ['transfer', 'Transfer'], ['riwayat', 'Riwayat'], ['tagihan', 'Tagihan Kartu Kredit']];
let tab = TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'ringkasan';
let txFilter = 'semua', prefill = {};
const idems = {}; const idemFor = k => (idems[k] ||= F.newIdem(k)); const resetIdem = k => { delete idems[k]; };

page.innerHTML = `<div class="mod-band"><span class="ti">${icon('wallet')}</span><div><h2>Personal Finance</h2><p>Uang tunai, rekening bank, kartu, dan dompet digital adalah simulasi game dengan merek fiktif — bukan bank, e-wallet, atau QRIS sungguhan. Semua saldo dan status divalidasi server.</p></div><div class="right" id="sum"></div></div>
<div class="tabs" role="tablist" id="tabs"></div><div id="body" style="margin-top:14px"></div>`;

await F.init().catch(() => {});
const age = () => E.ageYears();
const dayTxt = d => CAL.fmtDay(d, 'long');
const pinInput = (name = 'pin') => F.V?.pinSet ? `<label class="field"><span>PIN transaksi</span><input class="input" name="${name}" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="6 digit"></label>` : `<div class="msg info">${icon('lock')}<span>Buat PIN transaksi dulu di tab Ringkasan.</span></div>`;
const acctName = id => id === 'cash' ? 'Uang tunai' : F.accounts().find(a => a.id === id)?.name || '—';
const STATUS = { berhasil: 'Berhasil', gagal: 'Gagal', pending: 'Pending', reversed: 'Reversed' };
const TXI = { belanja: 'cart', setor: 'bank', tarik: 'up', transfer: 'transfer', topup: 'up', tarik_saldo: 'bank', gaji: 'career', biaya_admin: 'bank', bunga: 'info', denda: 'info', bayar_kartu: 'card', reversal: 'history', aktivasi: 'check' };

function summary() {
  const t = F.totals();
  $('#sum').innerHTML = `<span class="chip dark">Tunai ${rp(t.cash)}</span><span class="chip">Rekening ${rp(t.bank)}</span><span class="chip">Dompet ${rp(t.wallet)}</span>${t.credit ? `<span class="chip neg">Utang kartu ${rp(t.credit)}</span>` : ''}${F.status.busy ? '<span class="chip warn">Memproses…</span>' : ''}`;
}
function acctCard(a) {
  const c = F.cardOf(a.id);
  if (a.kind === 'bank') { const b = F.bank(a.provider); return `<div class="acct bank ${a.status !== 'aktif' ? 'off' : ''}"><span class="chip ${a.status === 'aktif' ? 'pos' : 'neg'}">${a.status}</span><span class="k">Rekening · ${esc(b.kind)}</span><span class="n">${esc(b.name)}</span><span class="b">${rp(a.balance)}</span><span class="s">Saldo tersedia ${rp(a.available)} · admin ${b.adminMonthly ? rp(b.adminMonthly) + '/bln' : 'gratis'}${c ? ` · debit •••• ${c.last4} (${c.status})` : ''}</span></div>`; }
  if (a.kind === 'wallet') { const w = F.wallet(a.provider); return `<div class="acct wallet" style="background:${w.color}"><span class="chip ${a.verified ? 'pos' : ''}">${a.verified ? 'Terverifikasi' : 'Basic'}</span><span class="k">Dompet digital (fiktif)</span><span class="n">${esc(w.name)}</span><span class="b">${rp(a.balance)}</span><span class="s">Maks. saldo ${rp(a.max)} · ${esc(w.note)}</span></div>`; }
  return `<div class="acct credit"><span class="chip">${a.status}</span><span class="k">Kartu kredit</span><span class="n">${esc(a.name)} •••• ${c?.last4 || ''}</span><span class="b">${rp(a.balance)}</span><span class="s">Tagihan berjalan · limit tersedia ${rp(a.available)} dari ${rp(a.limit)}</span><div class="limit-bar"><i style="width:${Math.min(100, a.balance / a.limit * 100)}%"></i></div></div>`;
}
function txList(list) {
  if (!list.length) return `<div class="panel-b subtle">Belum ada transaksi.</div>`;
  const MOVE = ['setor', 'tarik', 'transfer', 'topup', 'tarik_saldo'];
  return `<ul class="tx-list">${list.map(t => { const mv = MOVE.includes(t.kind), pos = !mv && t.amount > 0; return `<li><span class="ic">${icon(TXI[t.kind] || 'wallet')}</span><span style="min-width:0"><div class="t">${esc(t.label)}</div><div class="m">${dayTxt(t.day)} ${CAL.fmtHM(t.sec)} · ${mv ? `${esc(acctName(t.src))} → ${esc(acctName(t.dst))} · ` : ''}${esc(t.method || '-')}${t.fee ? ` · biaya ${rp(t.fee)}` : ''}${t.reason ? ` · ${esc(t.reason)}` : ''}</div><span class="st-badge st-${t.status}">${STATUS[t.status]}</span></span><span class="a ${pos ? 'pos' : ''}" ${mv ? 'title="Perpindahan antar-akun milik sendiri"' : ''}>${t.amount === 0 ? '—' : mv ? rp(Math.abs(t.amount)) : (pos ? '+' : '−') + rp(Math.abs(t.amount))}</span></li>`; }).join('')}</ul>`;
}
const nextDate = (from, date) => { let d = from; while (((d % 30) + 30) % 30 + 1 !== date) d++; return d; };

const VIEW = {
  ringkasan() {
    const a = F.accounts(), t = F.totals(), sc = F.V?.score, banks = F.accounts('bank'), pay = E.S.fin.payroll;
    const open = (F.V?.statements || []).filter(s => s.status === 'terbuka');
    return `<div class="fin-cards"><div class="acct cash"><span class="k">Uang tunai (dompet fisik)</span><span class="n">Dibawa karakter</span><span class="b">${rp(t.cash)}</span><span class="s">Dipakai untuk bayar tunai, COD, setor ke bank, top up di kasir.</span></div>${a.map(acctCard).join('')}</div>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:14px;margin-top:14px">
      <section class="panel"><div class="panel-h"><h2>PIN transaksi</h2>${F.V?.pinLocked ? '<span class="chip neg">Terkunci</span>' : F.V?.pinSet ? '<span class="chip pos">Aktif</span>' : '<span class="chip warn">Belum dibuat</span>'}</div><form class="panel-b fin-form" data-form="pin">
        <p class="subtle" style="margin:0">Satu PIN 6 digit untuk debit, kredit, QRIS, dompet, dan transfer. Disimpan sebagai hash di server. 3× salah = terkunci 60 detik.</p>
        ${F.V?.pinSet ? '<label class="field"><span>PIN lama</span><input class="input" name="oldPin" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></label>' : ''}
        <label class="field"><span>${F.V?.pinSet ? 'PIN baru' : 'Buat PIN'}</span><input class="input" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="6 digit, bukan angka berurutan"></label>
        <div><button class="btn primary" type="submit">${F.V?.pinSet ? 'Ganti PIN' : 'Simpan PIN'}</button></div></form></section>
      <section class="panel"><div class="panel-h"><h2>Rekening gaji</h2></div><div class="panel-b fin-form">
        <p class="subtle" style="margin:0">Gaji dari pekerjaan masuk ke rekening ini (status menunggu sampai server mengonfirmasi). Tanpa rekening gaji, gaji dibayar tunai.</p>
        ${banks.length ? `<select class="input" data-payroll><option value="">Tunai</option>${banks.map(b => `<option value="${b.id}" ${pay === b.id ? 'selected' : ''}>${esc(b.name)}</option>`).join('')}</select>` : '<span class="subtle">Belum punya rekening bank.</span>'}
        ${E.S.fin.outbox.length ? `<span class="chip warn">${E.S.fin.outbox.length} transaksi menunggu dikirim ke server</span>` : ''}</div></section>
      <section class="panel"><div class="panel-h"><h2>Skor kredit</h2></div><div class="panel-b"><div style="font-size:28px;font-weight:700" class="num">${sc ?? '—'}</div><p class="subtle" style="margin:4px 0 0">${sc == null ? 'Skor terbentuk saat kartu kredit pertama disetujui (mulai 600, rentang 300–850).' : 'Naik bila tagihan lunas tepat waktu, turun bila telat atau utilisasi > 80%.'}</p>${open.length ? `<div class="msg info" style="margin-top:10px">${icon('calendar')}<span>Tagihan kartu ${rp(open[0].amount - open[0].paid)} jatuh tempo ${dayTxt(open[0].dueDay)}.</span></div>` : ''}</div></section>
    </div>
    <section class="panel" style="margin-top:14px"><div class="panel-h"><h2>Transaksi terbaru</h2><a class="btn sm ghost" href="#riwayat">Semua</a></div>${txList((F.V?.tx || []).slice(0, 6))}</section>`;
  },
  rekening() {
    const mine = F.accounts('bank'), a = age();
    return `${mine.length ? `<div class="fin-cards">${mine.map(acctCard).join('')}</div>` : ''}
    ${mine.map(x => { const b = F.bank(x.provider), u = x.use?.day === E.dayNow() ? x.use : {}; return `<section class="panel" style="margin-top:14px"><div class="panel-h"><h2>${esc(b.name)}</h2><span class="subtle">dibuka ${dayTxt(x.openedDay)}</span></div><div class="panel-b"><dl class="dl">
      <dt>Saldo / tersedia</dt><dd>${rp(x.balance)} / ${rp(x.available)}</dd><dt>Biaya admin</dt><dd>${b.adminMonthly ? rp(b.adminMonthly) + ' tiap tanggal 30' : 'Gratis'}</dd>
      <dt>Transfer antarbank</dt><dd>${rp(b.transferFee)}${b.freeTransfers ? ` (gratis ${b.freeTransfers}×/bulan, terpakai ${x.transfersThisMonth})` : ''}</dd>
      <dt>Tarik tunai hari ini</dt><dd>${rp(u.withdraw || 0)} dari ${rp(b.dailyWithdraw)}</dd><dt>Debit hari ini</dt><dd>${rp(u.debit || 0)} dari ${rp(b.debitDaily)}</dd>
      <dt>Setor tunai</dt><dd>${b.teller ? `Teller Senin–Jumat ${b.teller.from}:00–${b.teller.to}:00` : ''}${b.cashDepositAtm ? ' · ATM setor 24 jam' : ''}${b.id === 'sakti' ? 'Kasir SerbaMart 24 (biaya Rp 2.000)' : ''}</dd></dl>
      <div class="row wrap" style="margin-top:10px;gap:8px"><button class="btn sm" data-go="transfer" data-from="cash" data-to="${x.id}">Setor tunai</button><button class="btn sm" data-go="transfer" data-from="${x.id}" data-to="cash">Tarik tunai (ATM)</button><button class="btn sm" data-go="transfer" data-from="${x.id}">Transfer</button></div></div></section>`; }).join('')}
    <h3 style="margin:18px 0 8px">Buka rekening baru</h3><div class="shop">${F.CAT.BANKS.map(b => { const have = mine.some(m => m.provider === b.id); const reason = have ? 'Sudah punya.' : a < b.minAge ? `Usia minimal ${b.minAge} (sekarang ${a}).` : b.maxAge && a > b.maxAge ? `Hanya sampai usia ${b.maxAge}.` : null;
      return `<form class="shop-card" data-form="open" data-provider="${b.id}"><div class="h"><div><b>${esc(b.name)}</b><small>${esc(b.note)}</small></div><span class="chip">${esc(b.kind)}</span></div><div class="panel-b fin-form" style="gap:8px">
      <span class="subtle">Setoran awal min. ${rp(b.minOpen)} · admin ${b.adminMonthly ? rp(b.adminMonthly) + '/bln' : 'gratis'} · kartu debit ${b.card} · ${b.teller ? `buka di cabang Sen–Jum ${b.teller.from}–${b.teller.to}` : 'buka via aplikasi 24 jam'}</span>
      ${reason ? `<span class="chip ${have ? 'pos' : 'neg'}">${esc(reason)}</span>` : `<label class="field"><span>Setoran awal (tunai)</span><input class="input" name="initial" type="number" min="${b.minOpen}" step="1000" value="${Math.max(b.minOpen, 50_000)}"></label>${pinInput()}<div><button class="btn primary sm" type="submit">Buka rekening</button></div>`}</div></form>`; }).join('')}</div>`;
  },
  kartu() {
    const debit = (F.V?.cards || []).filter(c => c.type === 'debit'), credit = F.accounts('credit'), a = age(), pr = F.CAT.CREDIT_PRODUCTS[0];
    return `<section class="panel"><div class="panel-h"><h2>Kartu debit</h2><span class="subtle">Terhubung ke rekening; transaksi langsung mengurangi saldo</span></div>${debit.length ? `<ul class="list">${debit.map(c => `<li><span class="ic">${icon('card')}</span><span style="flex:1"><b>Debit ${esc(acctName(c.accountId))} •••• ${c.last4}</b><br><span class="subtle">Kartu ${c.form} · dibuat ${dayTxt(c.createdDay)} · saldo ${rp(F.accounts().find(x => x.id === c.accountId)?.balance || 0)}</span></span><span class="chip ${c.status === 'aktif' ? 'pos' : 'neg'}">${c.status}</span><form class="row" data-form="card" data-card="${c.id}" data-action="${c.status === 'aktif' ? 'nonaktifkan' : 'aktifkan'}" style="gap:6px"><input class="input" name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" style="width:90px"><button class="btn sm">${c.status === 'aktif' ? 'Nonaktifkan' : 'Aktifkan'}</button></form></li>`).join('')}</ul>` : '<div class="panel-b subtle">Kartu debit otomatis dibuat saat membuka rekening bank.</div>'}</section>
    <section class="panel" style="margin-top:14px"><div class="panel-h"><h2>Kartu kredit</h2></div>${credit.length ? `<div class="panel-b"><div class="fin-cards">${credit.map(acctCard).join('')}</div>${credit.map(c => { const k = F.cardOf(c.id); return k ? `<form class="row" data-form="card" data-card="${k.id}" data-action="${k.status === 'aktif' ? 'nonaktifkan' : 'aktifkan'}" style="gap:6px;margin-top:10px"><input class="input" name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="PIN" style="width:90px"><button class="btn sm">${k.status === 'aktif' ? 'Nonaktifkan kartu' : 'Aktifkan kartu'}</button><a class="btn sm ghost" href="#tagihan">Tagihan & pembayaran</a></form>` : ''; }).join('')}</div>` : `
      <form class="panel-b fin-form" data-form="credit"><b>${esc(pr.name)} — ${esc(F.bank(pr.issuer).name)}</b>
      <dl class="dl"><dt>Syarat usia</dt><dd>${pr.minAge}+ (sekarang ${a})</dd><dt>Pendapatan 30 hari</dt><dd>min. ${rp(pr.minIncome)} (dari buku harian game)</dd><dt>Limit</dt><dd>${pr.limitMult}× pendapatan bulanan, ${rp(pr.minLimit)}–${rp(pr.maxLimit)}</dd><dt>Tagihan</dt><dd>tiap tanggal ${pr.statementDate}, jatuh tempo ${pr.graceDays} hari kemudian</dd><dt>Bunga / denda</dt><dd>${(pr.interestMonthly * 100).toLocaleString('id-ID')}%/bulan dari sisa · denda telat ${rp(pr.lateFee)}</dd><dt>Minimum bayar</dt><dd>${pr.minPayPct * 100}% atau ${rp(pr.minPayFloor)}</dd></dl>
      ${a < pr.minAge ? `<span class="chip neg">Belum memenuhi syarat usia.</span>` : `${pinInput()}<div><button class="btn primary sm" type="submit">Ajukan kartu kredit</button></div><span class="subtle">Server memeriksa usia, pendapatan, rekening bank, dan skor kredit.</span>`}</form>`}</section>`;
  },
  dompet() {
    const mine = F.accounts('wallet'), a = age();
    return `${mine.length ? `<div class="fin-cards">${mine.map(acctCard).join('')}</div>` : ''}
    <h3 style="margin:18px 0 8px">Dompet digital (merek fiktif, terinspirasi kebiasaan pembayaran di Indonesia)</h3>
    <div class="shop">${F.CAT.WALLETS.map(w => { const have = mine.find(m => m.provider === w.id);
      return `<form class="shop-card" data-form="${have ? 'verify' : 'wopen'}" data-provider="${w.id}" data-acc="${have?.id || ''}"><div class="h"><div><b style="color:${w.color}">${esc(w.name)}</b><small>${esc(w.note)}</small></div>${have ? `<span class="chip pos">${rp(have.balance)}</span>` : ''}</div><div class="panel-b fin-form" style="gap:8px">
      <span class="subtle">Basic maks. ${rp(w.basicMax)} · terverifikasi ${rp(w.verifiedMax)} · top up dari bank ${w.topupBankFee ? rp(w.topupBankFee) : 'gratis'} · top up tunai ${rp(w.topupCashFee)} · tarik ke bank ${w.withdrawFee ? rp(w.withdrawFee) : 'gratis'}${w.withdrawNeedsVerified ? ' (wajib verifikasi)' : ''} · QRIS ${w.qris ? 'ya' : 'tidak'}</span>
      ${!have ? (a < 13 ? `<span class="chip neg">Usia minimal 13 (sekarang ${a}).</span>` : `${pinInput()}<div><button class="btn sm primary">Aktifkan</button></div>`) : have.verified ? '<span class="chip pos">Terverifikasi</span>' : (a < 17 ? `<span class="subtle">Verifikasi butuh usia 17+.</span>` : `${pinInput()}<div><button class="btn sm">Verifikasi akun</button></div>`)}
      ${have ? `<div class="row wrap" style="gap:6px"><button type="button" class="btn sm ghost" data-go="topup" data-to="${have.id}">Top up</button><button type="button" class="btn sm ghost" data-go="transfer" data-from="${have.id}">Tarik ke bank</button></div>` : ''}</div></form>`; }).join('')}</div>`;
  },
  topup() {
    const wallets = F.accounts('wallet'), banks = F.accounts('bank'), to = prefill.to || wallets[0]?.id;
    if (!wallets.length) return `<section class="panel">${empty('wallet', 'Belum ada dompet digital', 'Aktifkan dompet di tab Dompet Digital.')}</section>`;
    return `<section class="panel"><div class="panel-h"><h2>Top up dompet digital</h2></div><form class="panel-b fin-form" data-form="transfer" data-k="topup">
      <label class="field"><span>Dompet tujuan</span><select class="input" name="to">${wallets.map(w => `<option value="${w.id}" ${w.id === to ? 'selected' : ''}>${esc(w.name)} — ${rp(w.balance)} (maks. ${rp(w.max)})</option>`).join('')}</select></label>
      <label class="field"><span>Sumber</span><select class="input" name="from">${banks.map(b => `<option value="${b.id}">${esc(b.name)} — ${rp(b.balance)}</option>`).join('')}<option value="cash">Tunai di kasir SerbaMart 24 — ${rp(E.S.player.balance)}</option></select></label>
      <label class="field"><span>Nominal</span><input class="input" name="amount" type="number" min="10000" step="1000" value="50000"></label>
      <div class="row wrap" style="gap:6px">${[20_000, 50_000, 100_000, 200_000].map(v => `<button type="button" class="btn sm ghost" data-amt="${v}">${rp(v)}</button>`).join('')}</div>
      <p class="subtle" data-fee style="margin:0"></p>${pinInput()}<div><button class="btn primary">Top up</button></div><span class="subtle">Top up tunai tidak memakai PIN (dibayar di kasir). Biaya final dihitung server.</span></form></section>`;
  },
  transfer() {
    const all = F.accounts().filter(a => a.kind !== 'credit'), from = prefill.from || all[0]?.id || 'cash', to = prefill.to || '';
    if (!all.length) return `<section class="panel">${empty('bank', 'Belum ada rekening', 'Buka rekening bank dulu di tab Rekening Bank.')}</section>`;
    const opt = (sel, incCash) => `${incCash ? `<option value="cash" ${sel === 'cash' ? 'selected' : ''}>Uang tunai — ${rp(E.S.player.balance)}</option>` : ''}${all.map(a => `<option value="${a.id}" ${a.id === sel ? 'selected' : ''}>${esc(a.name)} — ${rp(a.balance)}</option>`).join('')}`;
    return `<section class="panel"><div class="panel-h"><h2>Transfer, setor & tarik</h2></div><form class="panel-b fin-form" data-form="transfer" data-k="tf">
      <label class="field"><span>Dari</span><select class="input" name="from">${opt(from, true)}</select></label>
      <label class="field"><span>Ke</span><select class="input" name="to"><option value="">Pilih tujuan</option>${opt(to, true)}</select></label>
      <label class="field"><span>Nominal</span><input class="input" name="amount" type="number" min="10000" step="1000" value="${prefill.amount || 100000}"></label>
      <p class="subtle" data-fee style="margin:0"></p>${pinInput()}<div><button class="btn primary">Kirim</button></div>
      <span class="subtle">Tunai → bank = setor (teller/ATM/kasir sesuai bank & jam). Bank → tunai = tarik ATM (kartu debit aktif, kelipatan Rp 50.000). Dompet → bank = tarik saldo. Antar-dompet tidak didukung.</span></form></section>`;
  },
  riwayat() {
    const all = F.V?.tx || [], present = [...new Set(all.map(t => t.status))];
    const list = txFilter === 'semua' ? all : all.filter(t => t.status === txFilter);
    return `<div class="seg" role="group" style="margin-bottom:12px"><button class="${txFilter === 'semua' ? 'on' : ''}" data-txf="semua">Semua (${all.length})</button>${Object.keys(STATUS).filter(s => present.includes(s)).map(s => `<button class="${txFilter === s ? 'on' : ''}" data-txf="${s}">${STATUS[s]} (${all.filter(t => t.status === s).length})</button>`).join('')}</div>
    <section class="panel"><div class="panel-h"><h2>Riwayat transaksi (server)</h2><span class="subtle">200 terakhir · tunai dari aktivitas lain tercatat di Dashboard</span></div>${txList(list)}</section>`;
  },
  tagihan() {
    const cards = F.accounts('credit');
    if (!cards.length) return `<section class="panel">${empty('card', 'Belum punya kartu kredit', 'Ajukan di tab Kartu bila memenuhi syarat.')}</section>`;
    const banks = F.accounts('bank');
    return cards.map(c => { const pr = F.CAT.CREDIT_PRODUCTS.find(p => p.id === c.provider), st = (F.V?.statements || []).filter(s => s.accountId === c.id), open = st.find(s => s.status === 'terbuka');
      const nd = nextDate(E.dayNow(), pr.statementDate);
      return `<div class="fin-cards">${acctCard(c)}</div>
      <section class="panel" style="margin-top:14px"><div class="panel-h"><h2>Siklus tagihan</h2></div><div class="panel-b"><dl class="dl"><dt>Tagihan berjalan</dt><dd>${rp(c.balance)}</dd><dt>Tanggal cetak berikutnya</dt><dd>${dayTxt(nd)}</dd>${open ? `<dt>Tagihan tercetak</dt><dd>${rp(open.amount)} (dicetak ${dayTxt(open.stmtDay)})</dd><dt>Minimum</dt><dd>${rp(open.minDue)}</dd><dt>Sudah dibayar</dt><dd>${rp(open.paid)}</dd><dt>Jatuh tempo</dt><dd><b>${dayTxt(open.dueDay)}</b> (${open.dueDay - E.dayNow()} hari lagi)</dd>` : '<dt>Tagihan tercetak</dt><dd>Tidak ada yang terbuka</dd>'}</dl>
      <form class="fin-form" data-form="cpay" data-card="${c.id}" style="margin-top:12px">${banks.length ? `<label class="field"><span>Bayar dari</span><select class="input" name="from">${banks.map(b => `<option value="${b.id}">${esc(b.name)} — ${rp(b.balance)}</option>`).join('')}</select></label>
        <label class="field"><span>Nominal</span><input class="input" name="amount" type="number" min="10000" step="1000" value="${open ? Math.max(10_000, open.amount - open.paid) : Math.max(10_000, c.balance)}"></label>
        <div class="row wrap" style="gap:6px">${open ? `<button type="button" class="btn sm ghost" data-amt="${Math.max(10_000, open.minDue - open.paid)}">Minimum</button><button type="button" class="btn sm ghost" data-amt="${Math.max(10_000, open.amount - open.paid)}">Lunasi tagihan</button>` : ''}<button type="button" class="btn sm ghost" data-amt="${c.balance}">Semua utang</button></div>
        ${pinInput()}<div><button class="btn primary" ${c.balance <= 0 ? 'disabled' : ''}>Bayar tagihan</button></div>` : '<span class="subtle">Butuh rekening bank untuk membayar.</span>'}</form></div></section>
      <section class="panel" style="margin-top:14px"><div class="panel-h"><h2>Riwayat tagihan</h2></div>${st.length ? `<div class="panel-b" style="overflow-x:auto"><table class="table"><thead><tr><th>Dicetak</th><th>Jatuh tempo</th><th class="num">Tagihan</th><th class="num">Minimum</th><th class="num">Dibayar</th><th class="num">Bunga/denda</th><th>Status</th></tr></thead><tbody>${st.map(s => `<tr><td>${dayTxt(s.stmtDay)}</td><td>${dayTxt(s.dueDay)}</td><td class="num">${rp(s.amount)}</td><td class="num">${rp(s.minDue)}</td><td class="num">${rp(s.paid)}</td><td class="num">${rp(s.interest + s.lateFee)}</td><td><span class="chip ${s.status === 'lunas' ? 'pos' : s.status === 'telat' ? 'neg' : s.status === 'minimum' ? 'warn' : ''}">${s.status}</span></td></tr>`).join('')}</tbody></table></div>` : '<div class="panel-b subtle">Belum ada tagihan tercetak.</div>'}
      <div class="panel-b" style="border-top:1px solid var(--border)"><b>Pembayaran</b>${txList((F.V?.tx || []).filter(t => t.dst === c.id || (t.src === c.id && ['bunga', 'denda'].includes(t.kind))).slice(0, 10))}</div></section>`; }).join('');
  },
};

function feeHint(form) {
  const p = form.querySelector('[data-fee]'); if (!p) return;
  const f = form.from.value, t = form.to.value, a = Number(form.amount.value) || 0, A = id => F.accounts().find(x => x.id === id);
  const fa = f === 'cash' ? null : A(f), ta = t === 'cash' ? null : A(t); let txt = '';
  if (!t) txt = ''; else if (f === t) txt = 'Sumber dan tujuan sama.';
  else if (!fa && ta?.kind === 'bank') { const b = F.bank(ta.provider); txt = `Setor tunai: ${b.teller ? `teller Sen–Jum ${b.teller.from}–${b.teller.to}` : ''}${b.cashDepositAtm ? ', ATM 24 jam' : ''}${b.id === 'sakti' ? 'kasir SerbaMart, biaya Rp 2.000' : ''}.`; }
  else if (fa?.kind === 'bank' && !ta) { const b = F.bank(fa.provider); txt = `Tarik ATM${b.atmFeeOther ? ` jaringan, biaya ${rp(b.atmFeeOther)}` : ' gratis'} · limit harian ${rp(b.dailyWithdraw)} · kelipatan Rp 50.000.`; }
  else if (fa?.kind === 'bank' && ta?.kind === 'bank') { const b = F.bank(fa.provider); txt = fa.provider === ta.provider ? 'Sesama bank: gratis.' : `Antarbank ${rp(b.transferFee)}${b.freeTransfers ? ` (gratis ${Math.max(0, b.freeTransfers - fa.transfersThisMonth)}× lagi bulan ini)` : ''}.`; }
  else if (ta?.kind === 'wallet') { const w = F.wallet(ta.provider); txt = `Biaya top up ${rp(fa ? w.topupBankFee : w.topupCashFee)} · saldo setelah ${rp(ta.balance + a)} dari maks. ${rp(ta.max)}.`; }
  else if (fa?.kind === 'wallet' && ta?.kind === 'bank') { const w = F.wallet(fa.provider); txt = `Biaya tarik saldo ${rp(w.withdrawFee)}${w.withdrawNeedsVerified && !fa.verified ? ' — akun basic belum bisa tarik.' : ''}.`; }
  else txt = 'Kombinasi tidak didukung.';
  p.textContent = txt ? `Perkiraan: ${txt}` : '';
}

function render() {
  $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join('');
  summary();
  if (!F.CAT || !F.V) { $('#body').innerHTML = `<section class="panel">${empty('info', 'Data keuangan belum termuat', F.status.error || 'Server keuangan tidak merespons. Coba muat ulang.')}</section>`; return; }
  $('#body').innerHTML = VIEW[tab](); $('#body').querySelectorAll('form[data-form=transfer]').forEach(feeHint);
}
function go(t, pf = {}) { tab = t; prefill = pf; history.replaceState(null, '', '#' + t); render(); }
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) go(b.dataset.tab); });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== tab) go(h); });
page.addEventListener('click', e => {
  const g = e.target.closest('[data-go]'); if (g) { e.preventDefault(); go(g.dataset.go, { from: g.dataset.from, to: g.dataset.to }); return; }
  const f = e.target.closest('[data-txf]'); if (f) { txFilter = f.dataset.txf; render(); return; }
  const a = e.target.closest('[data-amt]'); if (a) { const form = a.closest('form'); form.amount.value = a.dataset.amt; if (form.dataset.form === 'transfer') feeHint(form); }
});
page.addEventListener('input', e => { if (e.target.name?.toLowerCase().includes('pin')) e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); const form = e.target.closest('form[data-form=transfer]'); if (form) feeHint(form); });
page.addEventListener('change', e => {
  if (e.target.matches('[data-payroll]')) { E.S.fin.payroll = e.target.value || null; E.save(); toast(e.target.value ? 'Gaji berikutnya ditransfer ke rekening.' : 'Gaji dibayar tunai.'); }
  const form = e.target.closest('form[data-form=transfer]'); if (form) feeHint(form);
});
page.addEventListener('submit', async e => {
  e.preventDefault(); const form = e.target, kind = form.dataset.form, btn = form.querySelector('button:not([type=button])');
  if (!btn || btn.disabled) return;
  const v = n => form.elements[n]?.value; const pin = v('pin');
  if (kind !== 'pin' && form.elements.pin && !/^\d{6}$/.test(pin || '')) { toast('Masukkan PIN 6 digit.', 'error'); return; }
  btn.disabled = true; const label = btn.textContent; btn.textContent = 'Memproses…';
  let r;
  try {
    if (kind === 'pin') r = await F.call('/api/fin/pin', { pin: v('pin'), oldPin: v('oldPin') });
    if (kind === 'open') r = await F.call('/api/fin/open', { idem: idemFor('open-' + form.dataset.provider), kind: 'bank', provider: form.dataset.provider, initial: Number(v('initial')), pin });
    if (kind === 'wopen') r = await F.call('/api/fin/open', { idem: idemFor('w-' + form.dataset.provider), kind: 'wallet', provider: form.dataset.provider, pin });
    if (kind === 'verify') r = await F.call('/api/fin/wallet/verify', { account: form.dataset.acc, pin });
    if (kind === 'card') r = await F.call('/api/fin/card', { card: form.dataset.card, action: form.dataset.action, pin });
    if (kind === 'credit') r = await F.call('/api/fin/credit/apply', { product: F.CAT.CREDIT_PRODUCTS[0].id, pin });
    if (kind === 'transfer') { if (!v('to')) { toast('Pilih tujuan.', 'error'); return; } r = await F.transfer({ idem: idemFor(form.dataset.k), from: v('from'), to: v('to'), amount: Number(v('amount')), pin }); }
    if (kind === 'cpay') r = await F.call('/api/fin/credit/pay', { idem: idemFor('cpay'), card: form.dataset.card, from: v('from'), amount: Number(v('amount')), pin });
  } finally { btn.disabled = false; btn.textContent = label; }
  // Kunci idempoten diganti hanya setelah server memberi hasil final (berhasil atau ditolak & tercatat).
  if (r.ok || r.txn) Object.keys(idems).forEach(resetIdem);
  if (r.ok) { toast(r.msg || 'Berhasil.'); prefill = kind === 'transfer' ? { from: v('from'), to: v('to') } : {}; render(); } else { toast(r.error || 'Gagal.', 'error'); if (r.txn) render(); }
});
const idle = () => !document.querySelector('dialog[open]') && !(page.contains(document.activeElement) && document.activeElement.matches('input,select,textarea'));
F.onUpdate(() => { summary(); if (idle()) render(); });
E.on('change', () => summary());
render();
