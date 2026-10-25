import * as E from '../engine/core.js';
import { fmtDay } from '../engine/calendar.js';
import { INVEST_CATEGORIES } from '../data/investment-catalog.js';
import { mountShell } from '../ui/shell.js';
import { rp, rpShort, pct, delta, cls, arrow, icon, empty, lineChart, sparkline, esc, $, $$, toast, fmtDate, num, openDialog, plChip } from '../ui/ui.js';

const page = await mountShell('investments', 'Investasi');
let tab = location.hash.slice(1) || 'portfolio';
const CAT = Object.fromEntries(INVEST_CATEGORIES.map(c => [c.id, c]));
const nameOf = (cat, iid) => { const it = E.instrument(cat, iid); return it.name || `Tanah ${it.location}`; };
const isFund = iid => E.INDEX_FUNDS.some(f => f.id === iid);

page.innerHTML = `
  <div class="page-head"><div><p>Portofolio jangka panjang. Tiap kelas aset punya model valuasi sendiri dan diperbarui harian atau bulanan — tidak bergerak per tick seperti trading di <a href="market.html">Pasar Simulasi</a>.</p></div><span class="sim-badge">Simulated · bukan janji imbal hasil</span></div>
  <section class="panel"><div class="kpi-strip" id="sum"></div></section>
  <div class="tabs" role="tablist" id="tabs" style="margin-top:16px"></div>
  <div id="body" style="margin-top:16px"></div>`;

function holdingsActive() { return E.S.invest.holdings.filter(h => h.status !== 'selesai'); }
function summary() {
  const S = E.S, d = E.dayNow(), hs = holdingsActive();
  let value = 0, cost = 0, income = 0, ongoing = 0;
  for (const h of hs) { value += E.holdingValue(S.invest, h, S.economy, S.seed, d); cost += h.cost; income += h.income; ongoing += h.ongoingCost + h.fees; }
  const closed = S.invest.closed || []; const realized = closed.reduce((s, c) => s + c.pl, 0) + income;
  $('#sum').innerHTML = `
    <div class="kpi"><div class="label">Nilai saat ini <span class="chip warn" style="font-size:10px">Estimasi</span></div><div class="value">${rp(value)}</div><div class="foot">${hs.length} kepemilikan aktif</div></div>
    <div class="kpi"><div class="label">Total modal (harga beli + biaya)</div><div class="value">${rp(cost)}</div><div class="foot">Termasuk pajak & biaya transaksi</div></div>
    <div class="kpi"><div class="label">Perubahan valuasi <span class="chip warn" style="font-size:10px">Belum direalisasikan</span></div><div class="value">${hs.length ? delta(value - cost, cost ? (value - cost) / cost : null) : '<span class="muted">—</span>'}</div><div class="foot">Bisa berubah sampai aset dijual</div></div>
    <div class="kpi"><div class="label">Hasil terealisasi <span class="chip info" style="font-size:10px">Sudah diterima</span></div><div class="value">${closed.length || income ? delta(realized) : '<span class="muted">—</span>'}</div><div class="foot">Sewa, kupon, dividen & penjualan · biaya berjalan ${rpShort(ongoing)}</div></div>`;
}
function renderTabs() {
  const counts = c => holdingsActive().filter(h => h.cat === c).length;
  $('#tabs').innerHTML = [['portfolio', 'Portofolio'], ...INVEST_CATEGORIES.map(c => [c.id, c.label])].map(([k, l]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}${k !== 'portfolio' && counts(k) ? `<span class="count">${counts(k)}</span>` : ''}</button>`).join('');
}
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; history.replaceState(null, '', '#' + tab); renderTabs(); renderBody(); });

function econPanel() {
  const e = E.S.economy;
  return `<section class="panel"><div class="panel-h"><h2>Kondisi ekonomi simulasi</h2><span class="subtle">Penggerak valuasi</span></div><div class="panel-b"><dl class="dl">
    <dt>Inflasi (tahunan)</dt><dd>${pct(e.inflation, 2, false)}</dd><dt>Suku bunga acuan</dt><dd>${pct(e.rate, 2, false)}</dd>
    <dt>Pertumbuhan ekonomi</dt><dd>${pct(e.growth, 2, false)}</dd><dt>Sentimen</dt><dd class="${cls(e.sentiment)}">${arrow(e.sentiment)} ${e.sentiment > 0.25 ? 'Optimis' : e.sentiment < -0.25 ? 'Pesimis' : 'Netral'} (${e.sentiment.toFixed(2)})</dd></dl>
    <p class="subtle" style="margin:10px 0 0">Suku bunga naik → P/E saham & harga obligasi cenderung turun. Sentimen buruk & inflasi → permintaan emas naik. Tanah dinilai ulang bulanan.</p></div></section>`;
}

function holdingRow(h, detail = true) {
  const S = E.S, d = E.dayNow(), it = E.instrument(h.cat, h.iid);
  const v = E.holdingValue(S.invest, h, S.economy, S.seed, d), ch = v - h.cost;
  const qtyTxt = { saham: isFund(h.iid) ? `${num(h.qty, 2)} unit` : `${num(h.qty)} lot`, emas: `${num(h.qty, 2)} g`, tanah: `${it.area} m²`, properti: `${it.units} unit`, obligasi: rpShort(h.qty) + ' nominal', deposito: rpShort(h.qty) }[h.cat];
  const period = h.maturityDay != null ? `Jatuh tempo H${h.maturityDay + 1}` : CAT[h.cat].horizon;
  const st = h.status === 'proses_jual' ? `<span class="chip warn">Dipasarkan · laku ±H${h.saleDay + 1}</span>` : `<span class="chip">Aktif · ${d - h.buyDay} hari</span>`;
  return `<tr class="clickable" data-hid="${h.hid}"><td><b>${esc(nameOf(h.cat, h.iid))}</b><div class="subtle">${CAT[h.cat].short} · ${qtyTxt}</div></td>
    <td class="r">${rp(h.cost)}</td><td class="r"><b>${rp(v)}</b><div class="subtle">estimasi</div></td><td class="r">${delta(ch, ch / h.cost, true)}</td>
    ${detail ? `<td class="r hide-m">${rpShort(h.fees + h.ongoingCost)}</td><td class="r hide-m">${h.income ? delta(h.income, null, true) : '<span class="subtle">—</span>'}</td><td class="hide-m">${esc(String(E.instrument(h.cat, h.iid).risk || { tanah: 'Sedang', properti: 'Sedang', deposito: 'Rendah' }[h.cat]))}</td><td class="hide-m subtle">${period}</td><td class="hide-m">${st}</td>` : ''}</tr>`;
}
const HEAD = `<thead><tr><th>Aset</th><th class="r">Harga beli</th><th class="r">Nilai saat ini</th><th class="r">Perubahan valuasi</th><th class="r hide-m">Biaya</th><th class="r hide-m">Pendapatan</th><th class="hide-m">Risiko</th><th class="hide-m">Periode</th><th class="hide-m">Status</th></tr></thead>`;

function portfolio() {
  const hs = holdingsActive(), closed = E.S.invest.closed || [];
  const tbl = hs.length ? `<div class="table-wrap"><table class="table">${HEAD}<tbody>${hs.map(h => holdingRow(h)).join('')}</tbody></table></div>`
    : empty('invest', 'Belum ada investasi', 'Investasi di BizSim adalah keputusan jangka panjang. Mulai dari instrumen dengan modal kecil — reksa dana indeks dari Rp 10.000 atau emas dari 0,01 gram — setelah punya dana darurat.', `<div class="row" style="justify-content:center"><button class="btn sm primary" data-tab-go="saham">Lihat index fund</button><button class="btn sm" data-tab-go="emas">Lihat emas</button></div>`);
  const cl = closed.length ? `<section class="panel"><div class="panel-h"><h2>Hasil terealisasi</h2><span class="chip info">Sudah diterima</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Aset</th><th>Peristiwa</th><th class="r">Modal</th><th class="r">Diterima</th><th class="r">Realized P/L</th></tr></thead><tbody>
    ${closed.slice(0, 10).map(c => `<tr><td>${esc(nameOf(c.cat, c.iid))}</td><td>${esc(c.label)} · H${c.day + 1}</td><td class="r">${rpShort(c.cost)}</td><td class="r">${rpShort(c.proceeds)}</td><td class="r">${delta(c.pl, c.pl / c.cost, true)}</td></tr>`).join('')}</tbody></table></div></section>` : '';
  // alokasi
  const S = E.S, d = E.dayNow(); const alloc = {}; let tot = 0;
  for (const h of hs) { const v = E.holdingValue(S.invest, h, S.economy, S.seed, d); alloc[h.cat] = (alloc[h.cat] || 0) + v; tot += v; }
  const COL = { saham: '#1F5FA8', emas: '#E5A021', tanah: '#6B8E23', properti: '#8E44AD', obligasi: '#16A085', deposito: '#7F8C8D' };
  const allocHtml = tot ? `<section class="panel"><div class="panel-h"><h2>Alokasi</h2><span class="subtle">berdasarkan nilai estimasi</span></div><div class="panel-b"><div style="display:flex;height:10px;border-radius:99px;overflow:hidden">${Object.entries(alloc).map(([k, v]) => `<i style="width:${v / tot * 100}%;background:${COL[k]}"></i>`).join('')}</div>
    <dl class="dl" style="margin-top:10px">${Object.entries(alloc).map(([k, v]) => `<dt><i class="dot" style="display:inline-block;background:${COL[k]};margin-right:6px"></i>${CAT[k].label}</dt><dd>${pct(v / tot, 1, false)} · ${rpShort(v)}</dd>`).join('')}</dl></div></section>` : '';
  return `<div class="split"><div class="stack"><section class="panel"><div class="panel-h"><h2>Kepemilikan</h2><span class="subtle">Klik baris untuk detail & jual</span></div>${tbl}</section>${cl}</div><div class="stack">${allocHtml}${econPanel()}${guide()}</div></div>`;
}
function guide() {
  return `<section class="panel"><div class="panel-h"><h2>Karakter tiap kelas aset</h2></div><ul class="list">${INVEST_CATEGORIES.map(c => `<li style="flex-direction:column;align-items:flex-start;gap:2px"><b style="font-size:13px">${c.label}</b><span class="subtle">${c.updates}</span><span class="subtle">Likuiditas: ${c.liquidity} · Horizon: ${c.horizon}</span></li>`).join('')}</ul></section>`;
}

function catHeader(c) { return `<div class="msg info" style="margin-bottom:14px">${icon('info')}<span><b>${c.label}.</b> ${c.updates} Likuiditas: ${c.liquidity}. Estimasi periode: ${c.horizon}.</span></div>`; }
function myHoldings(cat) {
  const hs = holdingsActive().filter(h => h.cat === cat);
  return `<section class="panel"><div class="panel-h"><h2>Kepemilikanmu</h2></div>${hs.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Aset</th><th class="r">Harga beli</th><th class="r">Nilai</th><th class="r">Perubahan</th></tr></thead><tbody>${hs.map(h => holdingRow(h, false)).join('')}</tbody></table></div>` : `<div class="panel-b subtle">Belum ada kepemilikan di kategori ini.</div>`}</section>`;
}
function hist30(h) { return h.slice(-30); }
function chg(h) { if (h.length < 2) return null; const a = h[Math.max(0, h.length - 31)][1], b = h[h.length - 1][1]; return (b - a) / a; }

function sahamView() {
  const inv = E.S.invest;
  const rows = E.INVEST_STOCKS.map(s => { const st = inv.stocks[s.id]; const c = chg(st.hist); return `<tr><td><b>${s.id}</b><div class="subtle">${esc(s.name)}</div></td><td class="hide-m">${s.sector}</td><td class="r">${rp(st.price)}</td><td class="r hide-m">${num(st.eps, 1)}</td><td class="r hide-m">${st.pe.toFixed(1)}×</td><td class="r hide-m">${pct(s.divYield, 1, false)}</td><td class="r">${c == null ? '—' : `<span class="${cls(c)}">${arrow(c)} ${pct(c)}</span>`}</td><td class="hide-m">${sparkline(hist30(st.hist))}</td><td>${s.risk}</td><td><button class="btn sm primary" data-buy="saham:${s.id}">Beli</button></td></tr>`; }).join('');
  const f = E.INDEX_FUNDS[0], fs = inv.funds[f.id], fc = chg(fs.hist);
  return catHeader(CAT.saham) + `<div class="split"><div class="stack">
    <section class="panel"><div class="panel-h"><h2>Index fund</h2><span class="chip">Diversifikasi</span></div><div class="panel-b"><div class="row between wrap" style="gap:12px"><div><b>${f.name}</b><div class="subtle">${f.note}</div></div><button class="btn primary sm" data-buy="saham:${f.id}">Beli · min ${rpShort(f.minBuy)}</button></div>
      <div class="g-4 grid" style="margin-top:12px;gap:8px"><div><div class="subtle">NAV/unit</div><b class="num">${rp(fs.nav)}</b></div><div><div class="subtle">30 hari</div><b class="${fc == null ? '' : cls(fc)}">${fc == null ? '—' : arrow(fc) + ' ' + pct(fc)}</b></div><div><div class="subtle">Biaya pengelolaan</div><b>${pct(f.expenseRatio, 1, false)}/thn</b></div><div><div class="subtle">Risiko</div><b>${f.risk}</b></div></div>
      <div id="fund-chart" class="chart" style="margin-top:10px"></div></div></section>
    <section class="panel"><div class="panel-h"><h2>Saham perusahaan (fiktif)</h2><span class="subtle">Harga = EPS × P/E</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Emiten</th><th class="hide-m">Sektor</th><th class="r">Harga</th><th class="r hide-m">EPS</th><th class="r hide-m">P/E</th><th class="r hide-m">Div. yield</th><th class="r">30 hari</th><th class="hide-m">Tren</th><th>Risiko</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="panel-b subtle" style="border-top:1px solid var(--border)">Saham di sini dimiliki untuk jangka panjang dan dinilai dari kinerja perusahaan. Untuk jual-beli cepat BBCA/TLKM per tick, gunakan Pasar Simulasi.</div></section>
  </div><div class="stack">${myHoldings('saham')}${econPanel()}</div></div>`;
}
function emasView() {
  const g = E.GOLD, p = E.S.invest.gold.price, bb = p * g.buybackRatio, c = chg(E.S.invest.gold.hist);
  return catHeader(CAT.emas) + `<div class="split"><div class="stack"><section class="panel"><div class="panel-h"><h2>${g.name}</h2><button class="btn primary sm" data-buy="emas:EMAS">Beli emas</button></div><div class="panel-b">
    <div class="g-4 grid" style="gap:8px"><div><div class="subtle">Harga beli/gram</div><b class="num">${rp(p)}</b></div><div><div class="subtle">Harga buyback/gram</div><b class="num">${rp(bb)}</b></div><div><div class="subtle">Spread</div><b>${pct(1 - g.buybackRatio, 1, false)}</b></div><div><div class="subtle">30 hari</div><b class="${c == null ? '' : cls(c)}">${c == null ? '—' : arrow(c) + ' ' + pct(c)}</b></div></div>
    <div id="gold-chart" class="chart" style="margin-top:12px"></div>
    <div class="msg warn" style="margin-top:12px">${icon('alert')}<span>Nilai kepemilikan dihitung pada <b>harga buyback</b>. Karena spread ${pct(1 - g.buybackRatio, 1, false)}, emas yang baru dibeli langsung tampil lebih rendah dari harga beli. Emas cocok untuk horizon panjang, bukan jual-beli cepat.</span></div>
  </div></section></div><div class="stack">${myHoldings('emas')}${econPanel()}</div></div>`;
}
function tanahView() {
  const inv = E.S.invest, own = new Set(holdingsActive().map(h => h.iid));
  const cards = E.LAND_PLOTS.map(l => { const ppm = inv.land[l.id].ppm, total = ppm * l.area; return `<section class="panel"><div class="panel-h"><div><h2>${esc(l.location)}</h2><div class="subtle">${esc(l.zone)}</div></div>${own.has(l.id) ? '<span class="chip info">Dimiliki</span>' : `<button class="btn sm primary" data-buy="tanah:${l.id}">Beli</button>`}</div><div class="panel-b"><dl class="dl">
    <dt>Luas</dt><dd>${l.area} m²</dd><dt>Harga/m² (penilaian terakhir)</dt><dd>${rp(ppm)}</dd><dt>Harga total</dt><dd><b>${rp(total)}</b></dd>
    <dt>Biaya beli (BPHTB + notaris)</dt><dd>${pct(E.LAND_COSTS.buyTax + E.LAND_COSTS.notary, 0, false)} · ${rpShort(total * (E.LAND_COSTS.buyTax + E.LAND_COSTS.notary))}</dd>
    <dt>Biaya kepemilikan (PBB)</dt><dd>±${rpShort(total * l.pbbRate)}/thn</dd><dt>Asumsi pertumbuhan wilayah</dt><dd>${pct(l.growthYear, 0, false)}/thn <span class="subtle">(asumsi model)</span></dd>
    <dt>Pendapatan</dt><dd>Tidak ada (aset tidur)</dd><dt>Likuiditas</dt><dd>Laku ${l.sellDays[0]}–${l.sellDays[1]} hari sim.</dd></dl></div></section>`; }).join('');
  return catHeader(CAT.tanah) + `<div class="split"><div class="grid g-2">${cards}</div><div class="stack">${myHoldings('tanah')}</div></div>`;
}
function propView() {
  const inv = E.S.invest, own = new Set(holdingsActive().map(h => h.iid));
  const cards = E.RENTAL_PROPERTIES.map(p => { const st = inv.prop[p.id]; const gross = p.rentPerUnit * p.units * 12; const occ = st.occupancy; const net = gross * occ - st.value * p.maintYear - gross * occ * p.mgmtFee;
    return `<section class="panel"><div class="panel-h"><div><h2>${esc(p.name)}</h2><div class="subtle">${esc(p.location)}</div></div>${own.has(p.id) ? '<span class="chip info">Dimiliki</span>' : `<button class="btn sm primary" data-buy="properti:${p.id}">Beli</button>`}</div><div class="panel-b"><dl class="dl">
    <dt>Nilai (penilaian bulanan)</dt><dd><b>${rp(st.value)}</b></dd><dt>Sewa per unit</dt><dd>${rp(p.rentPerUnit)}/bln × ${p.units}</dd><dt>Okupansi bulan ini</dt><dd>${pct(occ, 0, false)}</dd>
    <dt>Perawatan</dt><dd>${pct(p.maintYear, 1, false)} nilai/thn</dd><dt>Biaya pengelola</dt><dd>${pct(p.mgmtFee, 0, false)} dari sewa</dd>
    <dt>Estimasi pendapatan bersih</dt><dd>${rpShort(net / 12)}/bln <span class="subtle">(okupansi saat ini)</span></dd><dt>Estimasi yield bersih</dt><dd>${pct(net / st.value, 1, false)}/thn</dd>
    <dt>Likuiditas</dt><dd>Laku ${p.sellDays[0]}–${p.sellDays[1]} hari sim.</dd></dl></div></section>`; }).join('');
  return catHeader(CAT.properti) + `<div class="split"><div class="grid g-2">${cards}</div><div class="stack">${myHoldings('properti')}</div></div>`;
}
function bondView() {
  const rows = E.BONDS.map(b => `<tr><td><b>${esc(b.name)}</b><div class="subtle">${esc(b.note)}</div></td><td class="r">${pct(b.coupon, 2, false)}</td><td class="r">${b.tenorDays} hari</td><td>${b.tradable ? '<span class="chip">Dapat dijual</span>' : '<span class="chip warn">Tidak diperdagangkan</span>'}</td><td class="r hide-m">${rpShort(b.coupon / 12 * 0.9 * 1_000_000)}/bln per Rp 1 jt</td><td>${b.risk}</td><td><button class="btn sm primary" data-buy="obligasi:${b.id}">Beli</button></td></tr>`).join('');
  return catHeader(CAT.obligasi) + `<div class="split"><div class="stack"><section class="panel"><div class="panel-h"><h2>Seri obligasi tersedia</h2><span class="subtle">Kupon tetap, dibayar bulanan, pajak 10%</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Seri</th><th class="r">Kupon/thn</th><th class="r">Tenor</th><th>Likuiditas</th><th class="r hide-m">Kupon bersih</th><th>Risiko</th><th></th></tr></thead><tbody>${rows}</tbody></table></div>
    <div class="panel-b subtle" style="border-top:1px solid var(--border)">Obligasi yang dapat dijual punya harga pasar simulasi: naik bila suku bunga turun dan sebaliknya. Bila ditahan sampai jatuh tempo, pokok kembali penuh (kecuali gagal bayar pada obligasi korporasi).</div></section></div><div class="stack">${myHoldings('obligasi')}${econPanel()}</div></div>`;
}
function depView() {
  const rows = E.DEPOSITS.map(d => `<tr><td><b>${d.name}</b></td><td class="r">${pct(d.rate, 2, false)}/thn</td><td class="r">${d.tenorDays} hari</td><td class="r">${pct(d.penalty, 1, false)}</td><td class="r hide-m">${rpShort(1_000_000 * d.rate * d.tenorDays / 360 * 0.8)} per Rp 1 jt</td><td><button class="btn sm primary" data-buy="deposito:${d.id}">Buka</button></td></tr>`).join('');
  return catHeader(CAT.deposito) + `<div class="split"><section class="panel"><div class="panel-h"><h2>Deposito</h2><span class="subtle">Bunga dipotong pajak 20%</span></div><div class="table-wrap"><table class="table"><thead><tr><th>Produk</th><th class="r">Bunga</th><th class="r">Tenor</th><th class="r">Penalti cair awal</th><th class="r hide-m">Bunga bersih</th><th></th></tr></thead><tbody>${rows}</tbody></table></div></section><div class="stack">${myHoldings('deposito')}</div></div>`;
}

function renderBody() {
  const v = { portfolio, saham: sahamView, emas: emasView, tanah: tanahView, properti: propView, obligasi: bondView, deposito: depView }[tab] || portfolio;
  $('#body').innerHTML = v();
  const fc = $('#fund-chart'); if (fc && !lineChart(fc, E.S.invest.funds.BZ30.hist.slice(-60), { height: 160, xFmt: (d, l) => l ? fmtDay(d, 'wd') : `H${d + 1}` })) fc.innerHTML = '<div class="chart-empty">Riwayat NAV belum cukup.</div>';
  const gc = $('#gold-chart'); if (gc && !lineChart(gc, E.S.invest.gold.hist.slice(-60), { height: 180, xFmt: (d, l) => l ? fmtDay(d, 'wd') : `H${d + 1}` })) gc.innerHTML = '<div class="chart-empty">Riwayat harga emas belum cukup.</div>';
}
function render() { summary(); renderTabs(); renderBody(); }
render();
E.on('change', render); E.on('day', render);

page.addEventListener('click', e => {
  const go = e.target.closest('[data-tab-go]'); if (go) { tab = go.dataset.tabGo; history.replaceState(null, '', '#' + tab); renderTabs(); renderBody(); return; }
  const b = e.target.closest('[data-buy]'); if (b) { const [cat, iid] = b.dataset.buy.split(':'); buyDialog(cat, iid); return; }
  const r = e.target.closest('[data-hid]'); if (r) holdingDialog(+r.dataset.hid);
});

function buyDialog(cat, iid) {
  const it = E.instrument(cat, iid), fund = isFund(iid);
  const unit = { saham: fund ? 'Rp' : 'lot', emas: 'gram', tanah: '', properti: '', obligasi: 'Rp', deposito: 'Rp' }[cat];
  const whole = cat === 'tanah' || cat === 'properti';
  const ph = { saham: fund ? '10000' : '1', emas: '0.1', obligasi: '1000000', deposito: '1000000' }[cat];
  const d = openDialog(`<div class="dlg-h"><h2>Beli ${esc(nameOf(cat, iid))}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack" style="gap:12px">
    <div class="row between subtle"><span>Saldo tersedia</span><b class="num" style="color:var(--text)">${rp(E.S.player.balance)}</b></div>
    ${whole ? '<div class="subtle">Aset dibeli utuh (1 kepemilikan).</div>' : `<label class="field"><span>Jumlah ${fund ? '(nominal rupiah)' : `(${unit})`}</span><div class="input-group"><input class="input" id="b-qty" inputmode="decimal" placeholder="${ph}"><span class="addon">${unit}</span></div></label>`}
    <div id="b-err"></div><dl class="dl" id="b-calc"></dl>
    <div class="msg warn">${icon('alert')}<span>Nilai investasi dapat turun. Angka di BizSim adalah hasil simulasi, bukan janji keuntungan. Estimasi periode: ${CAT[cat].horizon}.</span></div>
  </div><div class="dlg-f"><button class="btn" data-close>Batal</button><button class="btn primary" id="b-ok">Konfirmasi beli</button></div>`, {
    onMount: dl => {
      const calc = () => {
        const raw = whole ? 1 : dl.querySelector('#b-qty').value.trim().replace(',', '.');
        const qty = raw === '' ? null : Number(raw); const err = dl.querySelector('#b-err'); const ok = dl.querySelector('#b-ok');
        if (qty == null || !(qty > 0)) { dl.querySelector('#b-calc').innerHTML = ''; err.innerHTML = qty == null ? '' : `<div class="msg error">${icon('alert')}<span>Jumlah tidak valid.</span></div>`; ok.disabled = true; return; }
        const q = E.investBuyQuote(cat, iid, qty);
        dl.querySelector('#b-calc').innerHTML = `<dt>Nilai</dt><dd>${rp(q.gross)}</dd><dt>Biaya/pajak transaksi</dt><dd>${rp(q.fee)}</dd><dt><b>Total</b></dt><dd><b>${rp(q.total)}</b></dd>${fund ? `<dt>Unit didapat</dt><dd>${num(q.units, 4)}</dd>` : ''}`;
        const short = q.total > E.S.player.balance;
        err.innerHTML = short ? `<div class="msg error">${icon('alert')}<span>Saldo tidak cukup — kurang ${rp(q.total - E.S.player.balance)}.</span></div>` : '';
        ok.disabled = short;
      };
      dl.querySelector('#b-qty')?.addEventListener('input', calc); calc();
      dl.querySelector('#b-ok').addEventListener('click', () => {
        const qty = whole ? 1 : Number(dl.querySelector('#b-qty').value.trim().replace(',', '.'));
        const r = E.invest(cat, iid, qty);
        if (r.ok) { toast(r.msg); dl.close(); } else dl.querySelector('#b-err').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(r.error)}</span></div>`;
      });
    }
  });
}

function holdingDialog(hid) {
  const S = E.S, h = S.invest.holdings.find(x => x.hid === hid), it = E.instrument(h.cat, h.iid), d = E.dayNow();
  const v = E.holdingValue(S.invest, h, S.economy, S.seed, d), net = E.holdingNetSale(S.invest, h, S.economy, S.seed, d);
  const partial = h.cat === 'saham' || h.cat === 'emas';
  let sellNote = '', canSell = h.status === 'aktif';
  if (h.cat === 'tanah' || h.cat === 'properti') sellNote = `Penjualan butuh waktu mencari pembeli (${it.sellDays[0]}–${it.sellDays[1]} hari simulasi). Harga final mengikuti penilaian saat laku, dikurangi PPh ${pct(E.LAND_COSTS.sellTax, 1, false)} & biaya ${pct(E.LAND_COSTS.sellFee, 0, false)}.`;
  if (h.cat === 'obligasi' && !it.tradable) { const left = 180 - (d - h.buyDay); if (left > 0) { canSell = false; sellNote = `Tidak dapat diperdagangkan. Pencairan awal (maks 50%) tersedia dalam ${left} hari.`; } else sellNote = 'Pencairan awal maksimal 50% nominal.'; }
  if (h.cat === 'deposito' && d < h.maturityDay) sellNote = `Pencairan sebelum jatuh tempo kena penalti ${pct(it.penalty, 1, false)} dan bunga hangus.`;
  if (h.status === 'proses_jual') sellNote = `Sedang dipasarkan. Perkiraan laku hari ke-${h.saleDay + 1}.`;
  openDialog(`<div class="dlg-h"><h2>${esc(nameOf(h.cat, h.iid))}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack" style="gap:12px">
    <div class="grid g-2" style="gap:10px">
      <div class="pl-box"><div class="subtle">Nilai saat ini <span class="chip warn" style="font-size:10px">Estimasi</span></div><b style="font-size:17px" class="num">${rp(v)}</b><div class="subtle">Jika dijual sekarang (bersih): ${rp(net)}</div></div>
      <div class="pl-box ${cls(v - h.cost)}"><div class="subtle">Perubahan valuasi ${plChip(v - h.cost)}</div><b style="font-size:17px">${delta(v - h.cost, (v - h.cost) / h.cost)}</b><div class="subtle">Belum direalisasikan</div></div>
    </div>
    <dl class="dl"><dt>Harga beli (termasuk biaya)</dt><dd>${rp(h.cost)}</dd><dt>Dibeli</dt><dd>Hari ke-${h.buyDay + 1} (${d - h.buyDay} hari lalu)</dd>
      <dt>Jumlah</dt><dd>${{ saham: isFund(h.iid) ? num(h.qty, 3) + ' unit' : num(h.qty) + ' lot', emas: num(h.qty, 2) + ' g', tanah: it.area + ' m²', properti: it.units + ' unit', obligasi: rp(h.qty), deposito: rp(h.qty) }[h.cat]}</dd>
      <dt>Biaya transaksi</dt><dd>${rp(h.fees)}</dd><dt>Biaya kepemilikan berjalan</dt><dd>${rp(h.ongoingCost)}</dd>
      <dt>Pendapatan diterima <span class="chip info" style="font-size:10px">Terealisasi</span></dt><dd>${delta(h.income)}</dd>
      ${h.maturityDay != null ? `<dt>Jatuh tempo</dt><dd>Hari ke-${h.maturityDay + 1} (${Math.max(0, h.maturityDay - d)} hari lagi)</dd>` : ''}
      <dt>Risiko</dt><dd>${esc(String(it.risk || { tanah: 'Sedang — likuiditas rendah', properti: 'Sedang — okupansi & perawatan', deposito: 'Rendah' }[h.cat]))}</dd></dl>
    ${sellNote ? `<div class="msg info">${icon('info')}<span>${sellNote}</span></div>` : ''}
    ${partial && canSell ? `<label class="field"><span>Jumlah dijual (${h.cat === 'emas' ? 'gram' : isFund(h.iid) ? 'unit' : 'lot'})</span><input class="input" id="s-qty" inputmode="decimal" value="${h.cat === 'saham' && !isFund(h.iid) ? h.qty : +h.qty.toFixed(4)}"></label>` : ''}
    <div id="s-err"></div>
  </div><div class="dlg-f"><button class="btn" data-close>Tutup</button>${canSell ? `<button class="btn sell" id="s-ok">${h.cat === 'tanah' || h.cat === 'properti' ? 'Pasang untuk dijual' : h.cat === 'deposito' && d < h.maturityDay ? 'Cairkan (penalti)' : 'Jual'}</button>` : ''}</div>`, {
    onMount: dl => dl.querySelector('#s-ok')?.addEventListener('click', () => {
      const q = dl.querySelector('#s-qty') ? Number(dl.querySelector('#s-qty').value.replace(',', '.')) : undefined;
      if (q !== undefined && (!(q > 0) || q > h.qty + 1e-9)) { dl.querySelector('#s-err').innerHTML = `<div class="msg error">${icon('alert')}<span>Jumlah harus > 0 dan tidak melebihi kepemilikan.</span></div>`; return; }
      if (h.cat === 'saham' && !isFund(h.iid) && !Number.isInteger(q)) { dl.querySelector('#s-err').innerHTML = `<div class="msg error">${icon('alert')}<span>Saham dijual per lot (bilangan bulat).</span></div>`; return; }
      const r = E.divest(hid, q); if (r.ok) { toast(r.msg); dl.close(); } else dl.querySelector('#s-err').innerHTML = `<div class="msg error">${icon('alert')}<span>${esc(r.error)}</span></div>`;
    })
  });
}
