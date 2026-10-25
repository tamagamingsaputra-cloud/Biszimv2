// Monetisasi · Sponsorship & Collaboration. Estimasi, final, dan uang diterima selalu dipisahkan.
import { E, C, PRE, CR, PLATFORMS, fN, fInt, fDia, fPct, fmtG, fmtDay, pIcon, pName, fmtName, nName, res, emptyBox, kpi, rp, rpShort, accounts } from './common.js';
import { icon, esc, openDialog } from '../../ui/ui.js';
import { progChip } from './overview.js';

const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);
const SRC = { ads: 'Iklan / program kreator', superchat: 'Super Chat', supersticker: 'Super Stickers', membership: 'Membership', gifts: 'Gifts (diamond)', badges: 'Lencana live', subscriptions: 'Subscriptions', sponsor: 'Sponsor', affiliate: 'Affiliate', merch: 'Merchandise', platform: 'Pembayaran platform', live: 'Live', alat: 'Peralatan', kursus: 'Kelas', langganan: 'Langganan', produksi: 'Produksi' };
const TXS = { dibayar: ['Diterima', 'pos'], estimasi: ['Estimasi', 'info'], final: ['Final · menunggu bayar', 'info'], diproses: ['Diproses', 'info'], 'saldo diamond': ['Saldo diamond', 'info'] };
let TF = 'all', MP = null;

function nextPayout(P) {
  const d0 = E.dayNow(); for (let d = d0; d < d0 + 40; d++) if (E.domOf(d) === P.payout.day) return d; return null;
}
const reqRow = r => {
  if (r.any) return `<li class="${r.met ? 'met' : ''}">${icon(r.met ? 'check' : 'lock')}<div class="grow"><div>${esc(r.label)}</div>${r.any.map(s => `<div class="subtle s">${esc(s.label.split('≥')[0])}: ${fInt(s.cur)} / ${fInt(s.need)}</div>`).join('')}</div></li>`;
  const pctv = r.text || r.inverse ? (r.met ? 100 : 0) : Math.min(100, (r.cur / r.need) * 100);
  return `<li class="${r.met ? 'met' : ''}">${icon(r.met ? 'check' : 'lock')}<div class="grow"><div class="row between"><span>${esc(r.label)}</span>${r.text ? '' : `<span class="num s">${r.inverse ? `${r.cur} aktif` : `${fInt(r.cur)} / ${fInt(r.need)}`}</span>`}</div>${r.text || r.inverse ? '' : `<div class="bar ${r.met ? 'green' : ''}"><i style="width:${pctv}%"></i></div>`}</div></li>`;
};

export function monetization() {
  const c = C(), accs = accounts(), d0 = E.dayNow();
  if (!accs.length) return { html: `<section class="panel"><div class="panel-b">${emptyBox('Belum ada akun kreator', 'Monetisasi tersedia per akun setelah syaratnya terpenuhi.', '<a class="btn sm primary" href="#accounts">Buat akun</a>')}</div></section>` };
  if (!MP || !c.accounts[MP]) MP = accs[0].id;
  const acc = c.accounts[MP], P = PLATFORMS[MP], W = acc.wallet, progs = CR.programsFor(MP), np = nextPayout(P);
  const G = P.support?.gifts, diaIdr = G ? W.diamonds * G.idrPerDiamond : 0;
  const t30 = c.tx.filter(t => t.day > d0 - 30);
  const recv = t30.filter(t => t.status === 'dibayar' && t.net > 0), costs = t30.filter(t => t.status === 'dibayar' && t.net < 0);
  const prodCost = sum(c.costDaily.filter(r => r[0] > d0 - 30), r => r[1]) + sum(accs, a => a.today.cost || 0);
  const bySrc = {}; for (const t of recv) { const k = t.source || 'lain'; const o = (bySrc[k] ||= { gross: 0, fee: 0, tax: 0, net: 0 }); o.gross += t.gross; o.fee += t.fee; o.tax += t.tax; o.net += t.net; }
  const totR = sum(recv, t => t.net), totC = sum(costs, t => -t.net) + prodCost;
  let txs = c.tx; if (TF === 'cost') txs = txs.filter(t => t.net < 0 || t.type === 'cost'); else if (TF !== 'all') txs = txs.filter(t => t.status === TF);
  const html = `
  <div class="kpis st-kpis">
    ${kpi('Diterima 30 hari (semua platform)', rp(totR), 'Uang yang sudah masuk saldo karakter')}
    ${kpi('Biaya kreator 30 hari', rp(totC), `Produksi & live ${rpShort(prodCost)} · lainnya ${rpShort(totC - prodCost)}`)}
    ${kpi('Pendapatan bersih 30 hari', `<span class="${totR - totC >= 0 ? 'pos' : 'neg'}">${rp(totR - totC)}</span>`, 'Diterima − biaya. Estimasi tidak dihitung.')}
    ${kpi('Belum diterima', rp(sum(accs, a => a.wallet.est + a.wallet.final)), `Estimasi ${rpShort(sum(accs, a => a.wallet.est))} · final ${rpShort(sum(accs, a => a.wallet.final))}`)}
  </div>
  <div class="seg" role="tablist" style="margin:4px 0 14px">${accs.map(a => `<button class="${a.id === MP ? 'on' : ''}" data-mp="${a.id}">${pName(a.id)}</button>`).join('')}</div>
  <div class="grid g-2">
    <section class="panel"><div class="panel-h"><div class="row" style="gap:10px">${pIcon(MP, 14)}<h2>Program ${P.name}</h2></div></div><div class="panel-b stack" style="gap:14px">
      <p class="subtle s" style="margin:0">Program tidak aktif otomatis. Saat semua syarat terpenuhi, ajukan sendiri; beberapa program melalui peninjauan. Syarat adalah aturan simulasi BizSim, bukan persyaratan resmi ${P.name}.</p>
      ${progs.map(p => `<div class="prog-card"><div class="row between wrap" style="gap:6px"><b>${esc(p.name)}</b>${progChip(p)}</div>
        ${p.regionLock ? `<div class="subtle s">${esc(p.regionLock)}</div>` : `<ul class="reqs">${p.reqs.map(reqRow).join('')}</ul>`}
        ${p.status === 'review' ? `<div class="subtle s">Peninjauan selesai ${fmtDay(p.reviewUntil)}.</div>` : ''}
        <div class="row wrap" style="gap:6px">${p.status === 'eligible' || (p.status === 'locked' && p.allMet) ? `<button class="btn sm primary" data-apply="${p.id}">Ajukan program</button>` : ''}${p.status === 'active' ? `<button class="btn sm" data-off="${p.id}">Nonaktifkan</button>` : ''}${p.status === 'off' ? `<button class="btn sm" data-on="${p.id}">Aktifkan lagi</button>` : ''}${p.kind === 'merch' && p.status === 'active' && !c.merch?.open ? `<a class="btn sm" href="#sponsors">Buka toko merch</a>` : ''}</div></div>`).join('')}
    </div></section>
    <div class="stack" style="gap:16px">
      <section class="panel"><div class="panel-h"><h2>Dompet ${P.name}</h2></div><div class="panel-b">
        <dl class="dl"><dt>Estimasi bulan berjalan</dt><dd class="num">${rp(W.est)}</dd>${Object.entries(W.estBy).map(([k, v]) => `<dt class="sub">· ${SRC[k] || k}</dt><dd class="num subtle">${rp(v)}</dd>`).join('')}
          <dt>Final, menunggu pembayaran</dt><dd class="num">${rp(W.final)}</dd>${Object.entries(W.finalBy).map(([k, v]) => `<dt class="sub">· ${SRC[k] || k}</dt><dd class="num subtle">${rp(v)}</dd>`).join('')}
          ${W.affPending ? `<dt>Komisi affiliate menunggu konfirmasi</dt><dd class="num">${rp(W.affPending)}</dd>` : ''}
          <dt>Pembayaran berikutnya</dt><dd>${np != null ? `${fmtDay(np)} (tanggal ${P.payout.day})` : '—'} · minimal ${rp(P.payout.min)}</dd><dt>Pajak simulasi</dt><dd>${fPct(P.payout.tax, 1)} dari pembayaran</dd></dl>
        <p class="subtle s" style="margin:8px 0 0">Alur: <b>estimasi</b> (berubah-ubah) → akhir bulan menjadi <b>final</b> setelah penyesuaian lalu lintas tidak valid → dibayar tanggal ${P.payout.day} jika ≥ ambang. Affiliate menunggu 14 hari (retur ±8%).</p>
      </div></section>
      ${G ? `<section class="panel"><div class="panel-h"><h2>Saldo diamond (LIVE Gifts)</h2></div><div class="panel-b"><dl class="dl"><dt>Diamond</dt><dd class="num">${fDia(W.diamonds)}</dd><dt>Setara</dt><dd class="num">${rp(diaIdr)} <span class="subtle s">(1 diamond = Rp ${fInt(G.idrPerDiamond)})</span></dd><dt>Biaya tarik</dt><dd class="num">${rp(G.withdrawFee)} + pajak ${fPct(P.payout.tax, 1)}</dd><dt>Minimal tarik</dt><dd class="num">${rp(G.withdrawMin)}</dd></dl>
        ${W.withdrawals.filter(w => w.status === 'proses').map(w => `<div class="subtle s">Penarikan ${rp(w.net)} diproses, masuk ${fmtDay(w.readyDay)}.</div>`).join('')}
        <button class="btn primary" data-wd style="margin-top:10px" ${diaIdr < G.withdrawMin ? 'disabled' : ''}>${icon('wallet')}Tarik ke saldo</button>${diaIdr < G.withdrawMin ? `<div class="subtle s" style="margin-top:4px">Kurang ${rp(G.withdrawMin - diaIdr)} dari minimal penarikan.</div>` : ''}</div></section>` : ''}
      <section class="panel"><div class="panel-h"><h2>Diterima 30 hari per sumber</h2></div>${Object.keys(bySrc).length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Sumber</th><th class="r">Kotor</th><th class="r">Potongan</th><th class="r">Pajak</th><th class="r">Bersih</th></tr></thead><tbody>${Object.entries(bySrc).map(([k, o]) => `<tr><td>${SRC[k] || k}</td><td class="r num">${rp(o.gross)}</td><td class="r num">−${rp(o.fee)}</td><td class="r num">−${rp(o.tax)}</td><td class="r num">${rp(o.net)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="panel-b"><p class="subtle" style="margin:0">Belum ada uang diterima dalam 30 hari terakhir.</p></div>`}</section>
    </div>
    <section class="panel st-wide"><div class="panel-h wrap" style="gap:8px"><h2>Riwayat transaksi kreator</h2><div class="seg">${[['all', 'Semua'], ['dibayar', 'Diterima'], ['estimasi', 'Estimasi'], ['final', 'Final'], ['diproses', 'Diproses'], ['saldo diamond', 'Diamond'], ['cost', 'Biaya']].map(([k, l]) => `<button class="${TF === k ? 'on' : ''}" data-tf="${k}">${l}</button>`).join('')}</div></div>
      ${txs.length ? `<div class="table-wrap"><table class="table tx-table"><thead><tr><th>Waktu</th><th>Platform</th><th>Keterangan</th><th class="r">Kotor</th><th class="r">Potongan</th><th class="r">Pajak</th><th class="r">Bersih</th><th>Status</th></tr></thead><tbody>${txs.slice(0, 60).map(t => { const [l, k] = TXS[t.status] || [t.status, '']; return `<tr><td class="num s">${fmtG(t.g, true)}</td><td>${t.platform ? pName(t.platform) : '—'}</td><td>${esc(t.label)}</td><td class="r num">${rp(t.gross)}</td><td class="r num">${t.fee ? '−' + rp(t.fee) : '—'}</td><td class="r num">${t.tax ? '−' + rp(t.tax) : '—'}</td><td class="r num ${t.net < 0 ? 'neg' : ''}">${rp(t.net)}</td><td><span class="chip ${t.net < 0 ? '' : k}">${t.net < 0 ? 'Biaya' : l}</span></td></tr>`; }).join('')}</tbody></table></div>` : `<div class="panel-b">${emptyBox('Belum ada transaksi', 'Pendapatan, dukungan, penarikan, pembelian alat, dan kelas tercatat di sini. Biaya produksi per tahap tercatat di riwayat keuangan utama (Dashboard).')}</div>`}
    </section>
  </div>`;
  return { html, mount: el => el.addEventListener('click', e => {
    const q = s => e.target.closest(s);
    if (q('[data-mp]')) { MP = q('[data-mp]').dataset.mp; E.emit('change'); return; }
    if (q('[data-tf]')) { TF = q('[data-tf]').dataset.tf; E.emit('change'); return; }
    if (q('[data-apply]')) return res(CR.requestProgram(MP, q('[data-apply]').dataset.apply));
    if (q('[data-off]')) { if (confirm('Nonaktifkan program ini? Tidak ada pendapatan dari sumber ini sampai diaktifkan lagi.')) res(CR.setProgramOff(MP, q('[data-off]').dataset.off, true)); return; }
    if (q('[data-on]')) return res(CR.setProgramOff(MP, q('[data-on]').dataset.on, false));
    if (q('[data-wd]')) {
      const tax = diaIdr * P.payout.tax, net = diaIdr - tax - G.withdrawFee;
      openDialog(`<div class="dlg-h"><h2>Tarik diamond?</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b"><dl class="dl"><dt>Diamond</dt><dd class="num">${fDia(W.diamonds)}</dd><dt>Nilai</dt><dd class="num">${rp(diaIdr)}</dd><dt>Biaya transfer</dt><dd class="num">−${rp(G.withdrawFee)}</dd><dt>Pajak simulasi</dt><dd class="num">−${rp(tax)}</dd><dt><b>Diterima</b></dt><dd class="num"><b>${rp(net)}</b></dd><dt>Masuk saldo</dt><dd>${G.withdrawDays} hari simulasi</dd></dl></div><div class="dlg-f"><button class="btn" data-close>Batal</button><button class="btn primary" id="wdgo">Tarik</button></div>`, { onMount: d => d.querySelector('#wdgo').addEventListener('click', () => { d.close(); res(CR.withdrawDiamonds(MP)); }) });
    }
  }) };
}

// ————————————————————————— Sponsorship & Collaboration —————————————————————————
export function sponsors() {
  const c = C(), accs = accounts(), d0 = E.dayNow();
  if (!accs.length) return { html: `<section class="panel"><div class="panel-b">${emptyBox('Belum ada akun kreator', 'Sponsor dan kolaborasi butuh akun.', '<a class="btn sm primary" href="#accounts">Buat akun</a>')}</div></section>` };
  const sponsorOn = accs.filter(a => a.programs?.sponsor?.status === 'active');
  const active = c.contracts.filter(k => k.status === 'aktif'), past = c.contracts.filter(k => k.status !== 'aktif').slice(-8).reverse();
  const npcs = CR.collabList();
  const merchAcc = accs.find(a => a.programs?.merch?.status === 'active');
  const html = `<div class="grid g-2">
    <section class="panel"><div class="panel-h"><h2>Penawaran sponsor</h2><span class="subtle s">datang tiap Senin</span></div><div class="panel-b stack" style="gap:10px">
      ${!sponsorOn.length ? `<div class="msg info">${icon('info')}<span>Belum ada akun dengan program sponsor aktif. Penuhi syaratnya lalu ajukan di <a href="#monetization">Monetisasi</a>.</span></div>` : ''}
      ${c.offers.length ? c.offers.map(o => `<article class="offer"><div class="row between wrap"><div><b>${esc(o.brand)}</b><div class="subtle s">${pName(o.platform)} · ${o.qty}× ${fmtName(o.platform, o.format)} · ${nName(o.niche)}</div></div><b class="num">${rp(o.fee)}</b></div>
        <dl class="dl s"><dt>Uang muka</dt><dd>${o.upfront ? `${o.upfront * 100}% saat setuju` : 'Tidak ada — dibayar setelah selesai'}</dd><dt>Waktu pengerjaan</dt><dd>${o.days} hari</dd><dt>Dasar harga</dt><dd>±${fInt(o.expViews)} tayangan/konten (rata-rata kontenmu)</dd><dt>Berlaku sampai</dt><dd>${fmtDay(o.expires)}</dd></dl>
        <div class="row wrap" style="gap:6px"><button class="btn sm primary" data-acc="${o.id}">Terima</button><button class="btn sm" data-dec="${o.id}">Tolak</button></div></article>`).join('') : '<p class="subtle" style="margin:0">Belum ada penawaran.</p>'}
      <p class="subtle s" style="margin:0">Konten bersponsor wajib diberi label kerja sama. Tenggat terlewat = kontrak gagal, reputasi turun, uang muka dikembalikan. Terlalu banyak konten bersponsor menaikkan unfollow.</p>
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Kontrak</h2></div><div class="panel-b stack" style="gap:10px">
      ${active.length ? active.map(k => `<article class="offer"><div class="row between wrap"><div><b>${esc(k.brand)}</b><div class="subtle s">${pName(k.platform)} · ${fmtName(k.platform, k.format)} · tenggat ${fmtDay(k.deadline)} (${k.deadline - d0 + 1} hari lagi)</div></div><span class="chip info">${k.delivered.length}/${k.qty}</span></div><div class="bar"><i style="width:${k.delivered.length / k.qty * 100}%"></i></div><div class="row wrap" style="gap:6px;margin-top:6px"><a class="btn sm primary" href="#create" data-pre="${k.platform}">${icon('edit')}Buat konten sponsor</a><span class="subtle s">Fee ${rp(k.fee)} · uang muka diterima ${rp(k.upfrontPaid)}</span></div></article>`).join('') : '<p class="subtle" style="margin:0">Tidak ada kontrak aktif.</p>'}
      ${past.length ? `<div class="table-wrap"><table class="table"><tbody>${past.map(k => `<tr><td>${esc(k.brand)}<div class="subtle s">${pName(k.platform)} · ${fmtName(k.platform, k.format)}</div></td><td><span class="chip ${k.status === 'gagal' ? 'neg' : 'pos'}">${k.status === 'gagal' ? 'Gagal' : k.paid ? 'Lunas' : 'Selesai · menunggu pelunasan'}</span></td><td class="r num">${rp(k.fee)}</td></tr>`).join('')}</tbody></table></div>` : ''}
    </div></section>
    <section class="panel"><div class="panel-h"><h2>Kolaborasi kreator</h2><span class="subtle s">kreator simulasi</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Kreator</th><th class="r">Audiens</th><th>Status</th><th class="r"></th></tr></thead><tbody>${npcs.map(n => `<tr><td>${pIcon(n.platform, 10)} ${esc(n.name)}<div class="subtle s">${pName(n.platform)} · ${nName(n.niche)}</div></td><td class="r num">${fN(n.followers)}</td><td>${n.status === 'diterima' ? (n.used ? '<span class="chip">Sudah dipakai</span>' : `<span class="chip pos">Setuju s/d ${fmtDay(n.until)}</span>`) : n.status === 'menolak' ? '<span class="chip">Menolak</span>' : '<span class="subtle s">Tersedia</span>'}</td><td class="r">${c.accounts[n.platform] ? `<button class="btn sm" data-col="${n.id}" ${n.status === 'diterima' && !n.used ? 'disabled' : ''}>Ajak</button>` : '<span class="subtle s">butuh akun</span>'}</td></tr>`).join('')}</tbody></table></div>
      <p class="subtle s" style="margin:8px 14px 12px">Peluang diterima bergantung pada ukuran audiensmu dibanding kreator tersebut, reputasi, dan kecocokan topik. Kolaborasi menambah jangkauan dari audiens mereka, tetapi menambah jam persiapan.</p></section>
    <section class="panel"><div class="panel-h"><h2>Merchandise</h2></div><div class="panel-b">${c.merch?.open ? `<dl class="dl"><dt>Toko</dt><dd>${pName(c.merch.platform)} · dibuka ${fmtDay(c.merch.openedDay)}</dd><dt>Total pesanan</dt><dd class="num">${fInt(c.merch.orders)} pcs</dd><dt>Menunggu pembayaran Senin</dt><dd class="num">${fInt(c.merch.pendingOrders)} pcs</dd></dl><p class="subtle s">Print on demand: tanpa stok. Harga Rp 120.000, HPP Rp 70.000, biaya platform 5% (simulasi).</p>` : merchAcc ? `<p style="margin:0">Program merchandise ${pName(merchAcc.id)} aktif.</p><button class="btn primary" data-merch="${merchAcc.id}" style="margin-top:8px">Buka toko (setup Rp 750.000)</button>` : '<p class="subtle" style="margin:0">Merchandise terbuka setelah program merch suatu akun aktif (lihat Monetisasi).</p>'}</div></section>
  </div>`;
  return { html, mount: el => el.addEventListener('click', e => {
    const q = s => e.target.closest(s);
    if (q('[data-acc]')) { const o = C().offers.find(x => x.id === +q('[data-acc]').dataset.acc); if (confirm(`Terima kontrak ${o.brand}? Kamu wajib menerbitkan ${o.qty}× ${fmtName(o.platform, o.format)} berlabel kerja sama dalam ${o.days} hari.`)) res(CR.acceptOffer(o.id)); return; }
    if (q('[data-dec]')) return res(CR.declineOffer(+q('[data-dec]').dataset.dec));
    if (q('[data-col]')) return res(CR.requestCollab(q('[data-col]').dataset.col));
    if (q('[data-merch]')) { if (confirm('Buka toko merch? Biaya setup Rp 750.000 tidak kembali.')) res(CR.openMerch(q('[data-merch]').dataset.merch)); return; }
    if (q('[data-pre]')) PRE.pid = q('[data-pre]').dataset.pre;
  }) };
}
