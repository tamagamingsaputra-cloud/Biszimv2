import * as E from '../engine/core.js';
import { mountShell } from '../ui/shell.js';
import { rp, rpShort, pct, delta, cls, arrow, icon, empty, barChart, lineChart, esc, $, $$, toast, fmtDate, num, openDialog, skillLabel } from '../ui/ui.js';

const lossTxt = p => p < 0.05 ? '<5% di model (tidak termasuk stok habis/kas kurang)' : pct(p, 0, false);
const page = await mountShell('business', 'Business');
const IMG = id => `assets/img/business/${id}.webp`;
let view = E.S.businesses.some(b => b.status === 'buka') ? 'mine' : 'catalog';
let filter = { sector: 'all', onlyOpen: false, sort: 'capex' };
let selBid = null, opTab = 'ringkasan';
const hb = location.hash.match(/^#biz-(\d+)/); if (hb) { view = 'mine'; selBid = +hb[1]; }

const style = document.createElement('style');
style.textContent = `.op-grid{display:grid;grid-template-columns:220px minmax(0,1fr);gap:16px;align-items:start}.biz-pick{display:flex;gap:10px;align-items:center;padding:10px 12px;border:0;border-bottom:1px solid var(--border);background:none;width:100%;text-align:left;cursor:pointer;border-left:3px solid transparent}.biz-pick[aria-selected="true"]{background:#EDF3FA;border-left-color:var(--navy)}.biz-pick img{width:44px;height:33px;object-fit:cover;border-radius:4px}
.req{display:flex;gap:6px;align-items:flex-start;font-size:12.5px}.req svg{width:15px;height:15px;flex:none;margin-top:2px}.req.ok{color:var(--green-ink)}.req.no{color:var(--red-ink)}
.range-bar{position:relative;height:28px;background:var(--surface-2);border:1px solid var(--border);border-radius:4px;margin:8px 0 4px}.range-bar .band{position:absolute;top:5px;bottom:5px;background:#C9D8E8;border-radius:3px}.range-bar .mid{position:absolute;top:2px;bottom:2px;width:2px;background:var(--navy)}.range-bar .zero{position:absolute;top:0;bottom:0;width:1px;background:var(--red)}
@media(max-width:860px){.op-grid{grid-template-columns:1fr}.op-list{display:flex;overflow-x:auto}.op-list .biz-pick{min-width:200px;border-right:1px solid var(--border)}}`;
document.head.appendChild(style);

page.innerHTML = `<div class="page-head"><div><p>Pilih bisnis berdasarkan modal, syarat, kapasitas, dan risiko. Semua estimasi berasal dari business engine dengan asumsi yang ditampilkan — tidak ada keuntungan yang dijamin.</p></div><span class="sim-badge">Simulated</span></div>
<div class="tabs" role="tablist" id="vtabs"></div><div id="vbody" style="margin-top:16px"></div>`;

function renderTabs() {
  const n = E.S.businesses.filter(b => b.status === 'buka').length;
  $('#vtabs').innerHTML = `<button class="tab" role="tab" aria-selected="${view === 'mine'}" data-view="mine">Bisnis saya <span class="count">${n}</span></button><button class="tab" role="tab" aria-selected="${view === 'catalog'}" data-view="catalog">Katalog bisnis <span class="count">${E.BUSINESS_CATALOG.length}</span></button>`;
}
$('#vtabs').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) { view = b.dataset.view; render(); } });

// ———————————————————— KATALOG ————————————————————
const rentRange = cat => { const r = cat.locations.map(l => E.LOCATIONS[l].rentMonthly); return [Math.min(...r), Math.max(...r)]; };
const cx = n => `<span class="complexity" aria-label="Kompleksitas ${n} dari 5">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= n ? 'on' : ''}"></i>`).join('')}</span>`;
const riskChip = l => `<span class="chip ${l === 'Tinggi' ? 'neg' : l === 'Sedang' ? 'warn' : 'pos'}">Risiko ${l.toLowerCase()}</span>`;
function catalog() {
  const sectors = [...new Set(E.BUSINESS_CATALOG.map(b => b.sector))];
  let list = E.BUSINESS_CATALOG.map(c => ({ c, locks: E.businessLocks(c) }));
  if (filter.sector !== 'all') list = list.filter(x => x.c.sector === filter.sector);
  if (filter.onlyOpen) list = list.filter(x => !x.locks.length);
  list.sort((a, b) => filter.sort === 'capex' ? a.c.capex - b.c.capex : filter.sort === 'complexity' ? a.c.complexity - b.c.complexity : a.c.name.localeCompare(b.c.name));
  const bal = E.S.player.balance;
  return `<div class="filters" style="margin-bottom:14px">
    <select class="input" style="width:auto" id="f-sector" aria-label="Filter sektor"><option value="all">Semua sektor</option>${sectors.map(s => `<option ${filter.sector === s ? 'selected' : ''}>${s}</option>`).join('')}</select>
    <select class="input" style="width:auto" id="f-sort" aria-label="Urutkan"><option value="capex" ${filter.sort === 'capex' ? 'selected' : ''}>Modal terkecil</option><option value="complexity" ${filter.sort === 'complexity' ? 'selected' : ''}>Paling sederhana</option><option value="name" ${filter.sort === 'name' ? 'selected' : ''}>Nama</option></select>
    <label class="row" style="font-size:13px;gap:6px"><input type="checkbox" id="f-open" ${filter.onlyOpen ? 'checked' : ''}> Hanya yang syaratnya terpenuhi</label>
    <span class="subtle" style="margin-left:auto">${list.length} dari ${E.BUSINESS_CATALOG.length} bisnis · saldo ${rpShort(bal)}</span></div>
  ${list.length ? `<div class="biz-grid">${list.map(({ c, locks }) => { const [r0, r1] = rentRange(c); const need = c.capex + c.workingCapital; const afford = bal >= need;
    return `<article class="panel biz-card ${locks.length ? 'locked' : ''}"><div class="img"><img src="${IMG(c.img)}" alt="Ilustrasi ${esc(c.name)}" loading="lazy">${locks.length ? `<span class="chip dark lock">${icon('lock', 'width="12" height="12"')} Terkunci</span>` : afford ? '<span class="chip pos lock">Siap dibuka</span>' : '<span class="chip warn lock">Modal belum cukup</span>'}</div>
    <div class="body"><div class="row between"><h3>${esc(c.name)}</h3><span class="chip">${c.sector}</span></div>
      <div class="facts"><span>Modal awal</span><b>${rpShort(c.capex)}</b><span>Modal kerja</span><b>±${rpShort(c.workingCapital)}</b>
        <span>Biaya tetap/bln</span><b>${rpShort(c.fixedMonthly)} + sewa</b><span>Sewa lokasi</span><b>${r1 === 0 ? 'Rp 0' : `${rpShort(r0)}–${rpShort(r1)}`}</b>
        <span>Kapasitas</span><b>${capText(c)}</b><span>Kompleksitas</span><b>${cx(c.complexity)}</b></div>
      <div class="row wrap" style="gap:6px">${riskChip(c.risk.level)}<span class="chip">${c.locations.length} lokasi</span></div>
      ${locks.length ? `<div class="subtle" style="color:var(--red-ink)">${icon('lock', 'width="12" height="12" style="vertical-align:-1px"')} ${esc(locks[0])}${locks.length > 1 ? ` (+${locks.length - 1} syarat)` : ''}</div>` : `<div class="subtle">${afford ? 'Saldo cukup untuk modal awal + modal kerja.' : `Kurang ${rpShort(need - bal)} untuk modal awal + modal kerja.`}</div>`}
      <button class="btn sm ${locks.length ? '' : 'primary'}" style="margin-top:auto" data-detail="${c.id}">Detail & simulasi kelayakan</button></div></article>`; }).join('')}</div>`
    : empty('business', 'Tidak ada bisnis yang cocok', 'Belum ada bisnis yang syaratnya terpenuhi. Naikkan level, reputasi, dan skill lewat pekerjaan, lalu kembali ke katalog.', `<button class="btn sm" id="f-reset">Tampilkan semua</button>`)}`;
}
function capText(c) { const own = c.ownerCapacity, st = c.staffCapacity; return own ? `${num(own)} ${c.unit}/hari (pemilik)` : `${num(st)} ${c.unit}/hari per karyawan`; }

// ———————————————————— DETAIL + KELAYAKAN + KONFIRMASI ————————————————————
function detailDialog(id) {
  const c = E.catalogById(id), locks = E.businessLocks(c), L = E.levelInfo().level, P = E.S.player;
  const reqs = [[`Level ${c.req.level}`, L >= c.req.level, `kamu ${L}`], [`Reputasi ${c.req.reputation}`, P.reputation >= c.req.reputation, `kamu ${P.reputation.toFixed(1)}`], ...Object.entries(c.req.skills).map(([k, v]) => [`${skillLabel(k)} ${v}`, (P.skills[k] || 0) >= v, `kamu ${(P.skills[k] || 0).toFixed(1)}`])];
  const busy = E.ownerBusy();
  openDialog(`<div class="dlg-h"><h2>${esc(c.name)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack">
    <div class="grid g-2" style="align-items:start">
      <img src="${IMG(c.img)}" alt="Ilustrasi ${esc(c.name)}" style="width:100%;border-radius:6px;border:1px solid var(--border)">
      <div class="stack" style="gap:10px">
        <div class="row wrap" style="gap:6px"><span class="chip">${c.sector}</span>${riskChip(c.risk.level)}<span class="chip">Kompleksitas ${c.complexity}/5</span></div>
        <dl class="dl"><dt>Modal awal (peralatan, renovasi)</dt><dd>${rp(c.capex)}</dd><dt>Perkiraan modal kerja</dt><dd>${rp(c.workingCapital)}</dd><dt>Biaya tetap/bln (di luar sewa)</dt><dd>${rp(c.fixedMonthly)}</dd><dt>Gaji per karyawan</dt><dd>${rp(c.staffSalary)}/bln</dd>
        <dt>Harga referensi</dt><dd>${rp(c.refPrice)}/${c.unit}</dd><dt>HPP/biaya variabel</dt><dd>${rp(c.unitCost)}/${c.unit}</dd><dt>Kapasitas</dt><dd>${c.ownerCapacity ? `${num(c.ownerCapacity)} (pemilik) + ` : ''}${num(c.staffCapacity)}/karyawan · maks ${c.maxStaff} karyawan</dd>${c.minStaff ? `<dt>Karyawan minimal</dt><dd>${c.minStaff}</dd>` : ''}</dl>
      </div></div>
    <div class="grid g-3">
      <div><h3 style="margin-bottom:6px">Skill & persyaratan</h3>${reqs.map(([t, ok, y]) => `<div class="req ${ok ? 'ok' : 'no'}">${icon(ok ? 'check' : 'x')}<span>${t} <span class="subtle">(${y})</span></span></div>`).join('')}</div>
      <div><h3 style="margin-bottom:6px">Potensi sumber pendapatan</h3><ul style="margin:0;padding-left:18px;font-size:12.5px">${c.revenue.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
      <div><h3 style="margin-bottom:6px">Risiko utama</h3><ul style="margin:0;padding-left:18px;font-size:12.5px">${c.risk.factors.map(r => `<li>${esc(r)}</li>`).join('')}</ul></div>
    </div>
    <div><h3 style="margin-bottom:6px">Ketersediaan lokasi</h3><div class="table-wrap"><table class="table"><thead><tr><th>Lokasi</th><th class="r">Traffic relatif</th><th class="r">Sewa/bln</th></tr></thead><tbody>${c.locations.map(l => { const x = E.LOCATIONS[l]; return `<tr><td>${x.name}</td><td class="r">${x.traffic.toFixed(1)}×</td><td class="r">${rp(x.rentMonthly)}</td></tr>`; }).join('')}</tbody></table></div></div>
    <div class="divider"></div>
    <h3>Simulasi kelayakan</h3>
    <div class="grid g-3" style="gap:10px">
      <label class="field"><span>Lokasi</span><select class="input" id="fz-loc">${c.locations.map(l => `<option value="${l}">${E.LOCATIONS[l].name}</option>`).join('')}</select></label>
      <label class="field"><span>Harga jual / ${c.unit}</span><input class="input" id="fz-price" inputmode="numeric" value="${c.refPrice}"></label>
      <label class="field"><span>Karyawan (0–${c.maxStaff})</span><input class="input" id="fz-staff" inputmode="numeric" value="${c.defaults.staff}"></label>
      <label class="field"><span>Pemasaran / hari</span><input class="input" id="fz-mkt" inputmode="numeric" value="${c.defaults.marketingDaily}"></label>
      ${c.stockBased ? `<label class="field"><span>Stok awal (${c.unit})</span><input class="input" id="fz-stock" inputmode="numeric" value="${Math.round(c.baseDemand * 4)}"></label>
      <label class="field"><span>Pemasok</span><select class="input" id="fz-sup">${Object.values(E.SUPPLIERS).map(s => `<option value="${s.id}">${s.name} (${s.costMult < 1 ? '−' + Math.round((1 - s.costMult) * 100) + '%' : 'harga normal'}, ${s.leadDays} hari, ${Math.round(s.reliability * 100)}% tepat waktu)</option>`).join('')}</select></label>` : ''}
    </div>
    ${busy ? `<div class="msg info">${icon('info')}<span>Kamu bekerja penuh waktu — kapasitas yang ditangani pemilik dihitung 50%.</span></div>` : ''}
    <div><button class="btn" id="fz-run">${icon('chart')}Jalankan simulasi (120 skenario × 60 hari)</button></div>
    <div id="fz-out"></div>
    <div class="divider"></div>
    <h3>Konfirmasi modal</h3>
    <div id="cf"></div>
  </div>
  <div class="dlg-f"><button class="btn" data-close>Tutup</button><button class="btn primary" id="cf-open" ${locks.length ? 'disabled' : ''}>${locks.length ? `${icon('lock')} Terkunci` : 'Buka bisnis'}</button></div>`, {
    wide: true, onMount: d => {
      const opts = () => ({ location: d.querySelector('#fz-loc').value, price: Number(d.querySelector('#fz-price').value), staff: Number(d.querySelector('#fz-staff').value), marketingDaily: Number(d.querySelector('#fz-mkt').value), initialStock: c.stockBased ? Number(d.querySelector('#fz-stock').value) : 0, supplier: c.stockBased ? d.querySelector('#fz-sup').value : 'stabil' });
      const validate = o => { if (!(o.price > 0)) return 'Harga harus lebih dari 0.'; if (!Number.isInteger(o.staff) || o.staff < (c.minStaff || 0) || o.staff > c.maxStaff) return `Karyawan harus ${c.minStaff || 0}–${c.maxStaff}.`; if (!(o.marketingDaily >= 0)) return 'Anggaran pemasaran tidak valid.'; if (c.stockBased && (!Number.isInteger(o.initialStock) || o.initialStock < 0)) return 'Stok awal harus bilangan bulat ≥ 0.'; return null; };
      const runFz = () => {
        const o = opts(), err = validate(o), out = d.querySelector('#fz-out');
        if (err) { out.innerHTML = `<div class="msg error">${icon('alert')}<span>${err}</span></div>`; return; }
        const f = E.runFeasibility(id, o.location, o); const loc = E.LOCATIONS[o.location];
        const lo = Math.min(f.m2p10, 0), hi = Math.max(f.m2p90, 1), X = v => ((v - lo) / (hi - lo) * 100).toFixed(1);
        const payback = f.m2p50 > 0 ? c.capex / f.m2p50 : null;
        out.innerHTML = `<div class="grid g-2" style="gap:12px;margin-top:8px">
          <div class="pl-box"><div class="subtle">Bulan 1 (masa ramp-up)</div><div class="num" style="font-weight:600">${rpShort(f.p10)} s/d ${rpShort(f.p90)}</div><div class="subtle">Median ${rpShort(f.p50)} · peluang rugi ${lossTxt(f.probLoss)}</div></div>
          <div class="pl-box"><div class="subtle">Bulan 2 (setelah pelanggan terbentuk)</div><div class="num" style="font-weight:600">${rpShort(f.m2p10)} s/d ${rpShort(f.m2p90)}</div><div class="subtle">Median ${rpShort(f.m2p50)} · peluang rugi ${lossTxt(f.probLoss2)}</div></div></div>
          <div class="subtle" style="margin-top:10px">Sebaran laba bulan 2 (P10–P90, garis = median, merah = Rp 0)</div>
          <div class="range-bar"><div class="band" style="left:${X(f.m2p10)}%;width:${X(f.m2p90) - X(f.m2p10)}%"></div><div class="zero" style="left:${X(0)}%"></div><div class="mid" style="left:${X(f.m2p50)}%"></div></div>
          <dl class="dl" style="margin-top:8px"><dt>Margin per ${c.unit}</dt><dd class="${cls(f.unitMargin)}">${rp(f.unitMargin)}</dd><dt>Kapasitas harian</dt><dd>${num(f.capacity)} ${c.unit}</dd><dt>Biaya tetap + sewa + gaji/bln</dt><dd>${rp(f.fixedMonthly)}</dd><dt>Perkiraan balik modal (median bulan 2)</dt><dd>${payback ? `±${payback.toFixed(1)} bulan` : 'Tidak tercapai pada asumsi ini'}</dd></dl>
          <details style="margin-top:8px;font-size:12.5px"><summary style="cursor:pointer;font-weight:600">Asumsi simulasi</summary><ul style="margin:6px 0 0;padding-left:18px;color:var(--text-2)">
            <li>Permintaan dasar ${num(c.baseDemand, 1)} ${c.unit}/hari × traffic ${loc.name} ${loc.traffic}× × kondisi konsumen saat ini ${E.S.economy.consumer.toFixed(2)}×.</li>
            <li>Elastisitas harga ${c.elasticity}: harga 10% di atas referensi menurunkan permintaan ±${Math.round((1 - Math.pow(1.1, -c.elasticity)) * 100)}%.</li>
            <li>Kecocokan konsep/lokasi tidak diketahui sebelum buka — divariasikan antarskenario (risiko ${c.risk.level.toLowerCase()}).</li>
            <li>Pelanggan tumbuh bertahap: 45% permintaan di hari pertama, penuh setelah 30 hari. Rating awal 3,0.</li>
            <li>Stok dianggap selalu tersedia; kehabisan stok, kerusakan barang, dan keterlambatan pemasok dapat menurunkan hasil nyata di game.</li>
            <li>Tidak termasuk pajak usaha, cicilan pinjaman, dan peristiwa khusus.</li></ul></details>
          <div class="msg warn" style="margin-top:10px">${icon('alert')}<span>Ini rentang hasil dari model, bukan janji keuntungan. Hasil di game mengikuti keputusan harian dan kondisi simulasi.</span></div>`;
      };
      const renderCf = () => {
        const o = opts(); const cf = d.querySelector('#cf'); const err = validate(o);
        if (locks.length) { cf.innerHTML = `<div class="msg error">${icon('lock')}<span><b>Bisnis terkunci.</b> ${locks.map(esc).join(' · ')}. Tingkatkan lewat pekerjaan, kursus, dan pengalaman di halaman Career.</span></div>`; return; }
        if (err) { cf.innerHTML = `<div class="msg error">${icon('alert')}<span>${err}</span></div>`; d.querySelector('#cf-open').disabled = true; return; }
        const total = E.openCost(c, o), le = E.loanEligibility(c), loan = Number(d.querySelector('#cf-loan')?.value || 0);
        const after = E.S.player.balance + loan - total, buffer = c.workingCapital - (c.stockBased ? o.initialStock * c.unitCost : 0);
        cf.innerHTML = `<dl class="dl"><dt>Modal awal</dt><dd>${rp(c.capex)}</dd>${c.stockBased ? `<dt>Stok awal (${num(o.initialStock)} ${c.unit})</dt><dd>${rp(total - c.capex)}</dd>` : ''}<dt><b>Dibayar saat buka</b></dt><dd><b>${rp(total)}</b></dd>
          <dt>Saldo saat ini</dt><dd>${rp(E.S.player.balance)}</dd>
          <dt>Pinjaman usaha (opsional)</dt><dd>${le.eligible ? `<input class="input" id="cf-loan" style="width:150px;height:30px;display:inline-block" inputmode="numeric" value="${loan || 0}" aria-label="Jumlah pinjaman"> <span class="subtle">maks ${rpShort(le.max)}, 9%/thn, 12 bln</span>` : `<span class="subtle">${le.reason}</span>`}</dd>
          <dt>Sisa saldo setelah buka</dt><dd class="${after < 0 ? 'neg' : ''}">${rp(after)}</dd><dt>Cadangan modal kerja disarankan</dt><dd>${rp(Math.max(0, buffer))}</dd></dl>
          ${after < 0 ? `<div class="msg error" style="margin-top:8px">${icon('alert')}<span>Saldo tidak cukup — kurang ${rp(-after)}.</span></div>` : after < buffer ? `<div class="msg warn" style="margin-top:8px">${icon('alert')}<span>Sisa saldo di bawah cadangan modal kerja. Rugi harian atau belanja stok bisa memicu kredit darurat 24%/thn.</span></div>` : ''}
          <label class="row" style="margin-top:10px;font-size:13px;gap:8px"><input type="checkbox" id="cf-ack"> Saya memahami hasil bisnis tidak dijamin dan modal bisa berkurang.</label>`;
        const btn = d.querySelector('#cf-open'); btn.disabled = after < 0 || !d.querySelector('#cf-ack').checked;
        d.querySelector('#cf-ack').addEventListener('change', e => { btn.disabled = after < 0 || !e.target.checked; });
        d.querySelector('#cf-loan')?.addEventListener('change', renderCf);
      };
      d.querySelector('#fz-run').addEventListener('click', runFz);
      d.querySelectorAll('#fz-loc,#fz-price,#fz-staff,#fz-mkt,#fz-stock,#fz-sup').forEach(i => i.addEventListener('change', () => { renderCf(); if (d.querySelector('#fz-out').innerHTML) runFz(); }));
      renderCf();
      d.querySelector('#cf-open').addEventListener('click', () => {
        const o = { ...opts(), loan: Number(d.querySelector('#cf-loan')?.value || 0) };
        const r = E.openBusiness(id, o);
        if (r.ok) { toast(r.msg); d.close(); view = 'mine'; selBid = r.data.bid; opTab = 'ringkasan'; render(); }
        else d.querySelector('#cf').insertAdjacentHTML('afterbegin', `<div class="msg error" style="margin-bottom:8px">${icon('alert')}<span>${esc(r.error)}</span></div>`);
      });
    }
  });
}

// ———————————————————— OPERASIONAL ————————————————————
const OPS = [['ringkasan', 'Ringkasan'], ['penjualan', 'Penjualan & Pelanggan'], ['harga', 'Harga'], ['stok', 'Stok & Pemasok'], ['karyawan', 'Karyawan'], ['pemasaran', 'Pemasaran'], ['laba', 'Pengeluaran & Laba/Rugi'], ['ekspansi', 'Ekspansi']];
function mine() {
  const list = E.S.businesses.filter(b => b.status === 'buka');
  if (!list.length) return `<section class="panel">${empty('business', 'Belum memiliki bisnis', 'Buka katalog untuk membandingkan modal, syarat, dan risiko. Jalankan simulasi kelayakan sebelum menaruh modal.', '<button class="btn sm primary" data-view="catalog">Buka katalog bisnis</button>')}</section>`;
  if (!list.find(b => b.bid === selBid)) selBid = list[0].bid;
  const b = list.find(x => x.bid === selBid), c = E.catalogById(b.typeId);
  const ops = OPS.filter(([k]) => k !== 'stok' || c.stockBased);
  return `<div class="op-grid"><section class="panel op-list">${list.map(x => { const cc = E.catalogById(x.typeId); const last = x.history[x.history.length - 1]; return `<button class="biz-pick" aria-selected="${x.bid === selBid}" data-bid="${x.bid}"><img src="${IMG(cc.img)}" alt=""><span style="min-width:0"><b style="font-size:13px">${cc.name}</b><span class="subtle" style="display:block">${last ? `Kemarin ${rpShort(last.profit)}` : 'Belum beroperasi'}</span></span></button>`; }).join('')}</section>
  <section class="panel" id="biz-${b.bid}"><div class="panel-h"><div><h2>${c.name}</h2><div class="subtle">${E.LOCATIONS[b.location].name} · buka sejak hari ke-${b.openedDay + 1} · ★ ${b.rating.toFixed(2)}</div></div><span class="chip pos">Beroperasi</span></div>
  <div class="tabs" role="tablist" style="padding:0 8px">${ops.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${opTab === k}" data-op="${k}">${l}</button>`).join('')}</div>
  <div class="panel-b" id="op-body">${opBody(b, c)}</div></section></div>`;
}
function sum(h, k) { return h.reduce((s, r) => s + r[k], 0); }
function opBody(b, c) {
  const h = b.history, last = h[h.length - 1], h7 = h.slice(-7), h30 = h.slice(-30);
  const noData = `<div class="msg info">${icon('info')}<span>Belum ada hari operasional yang selesai. Data penjualan muncul setelah hari simulasi berganti.</span></div>`;
  const cap = E.capacityOf(c, b, E.ownerBusy());
  switch (opTab) {
    case 'ringkasan': return `${last ? `<div class="grid g-4" style="gap:10px">
        <div class="pl-box"><div class="subtle">Terjual kemarin</div><b class="num">${num(last.sold, 1)} ${c.unit}</b><div class="subtle">dari permintaan ${num(last.demand, 1)}</div></div>
        <div class="pl-box"><div class="subtle">Pendapatan kemarin</div><b class="num">${rp(last.revenue)}</b></div>
        <div class="pl-box ${cls(last.profit)}"><div class="subtle">Laba/rugi kemarin</div><b>${delta(last.profit)}</b></div>
        <div class="pl-box ${cls(b.cumProfit)}"><div class="subtle">Kumulatif vs modal ${rpShort(b.invested)}</div><b>${delta(b.cumProfit, null, true)}</b></div></div>` : noData}
      <h3 style="margin:16px 0 6px">Laba/rugi harian ${h.length >= 2 ? `(${Math.min(30, h.length)} hari terakhir)` : ''}</h3><div id="pl-chart" class="chart"></div>
      <dl class="dl" style="margin-top:12px"><dt>Kapasitas saat ini</dt><dd>${num(cap)} ${c.unit}/hari</dd>${c.stockBased ? `<dt>Stok</dt><dd>${num(b.stock)} ${c.unit}${b.pending.length ? ` · ${b.pending.length} pesanan dalam perjalanan` : ''}</dd>` : ''}<dt>Karyawan</dt><dd>${b.staff}</dd><dt>Harga</dt><dd>${rp(b.price)}/${c.unit}</dd><dt>Pemasaran</dt><dd>${rp(b.marketingDaily)}/hari</dd></dl>`;
    case 'penjualan': return h.length ? `<div class="grid g-3" style="gap:10px;margin-bottom:12px"><div class="pl-box"><div class="subtle">Pelanggan dilayani (7 hari)</div><b class="num">${num(sum(h7, 'customers'), 1)}</b></div><div class="pl-box ${sum(h7, 'lost') > 0 ? 'neg' : ''}"><div class="subtle">Permintaan tak terlayani (7 hari)</div><b class="num">${num(sum(h7, 'lost'))}</b></div><div class="pl-box"><div class="subtle">Rating pelanggan</div><b>★ ${b.rating.toFixed(2)} / 5</b></div></div>
      <div class="table-wrap"><table class="table"><thead><tr><th>Hari</th><th class="r">Permintaan</th><th class="r">Kapasitas</th><th class="r">Terjual</th><th class="r">Hilang</th><th class="r">Pendapatan</th></tr></thead><tbody>${h.slice(-14).reverse().map(r => `<tr><td>H${r.day + 1}</td><td class="r">${num(r.demand, 1)}</td><td class="r">${num(r.capacity)}</td><td class="r">${num(r.sold, 1)}</td><td class="r ${r.lost ? 'neg' : ''}">${num(r.lost)}</td><td class="r">${rpShort(r.revenue)}</td></tr>`).join('')}</tbody></table></div>
      <p class="subtle">Permintaan hilang karena stok habis atau kapasitas penuh menurunkan rating; rating memengaruhi permintaan berikutnya.</p>` : noData;
    case 'harga': return `<div class="grid g-2"><div class="stack" style="gap:10px"><label class="field"><span>Harga jual per ${c.unit}</span><input class="input" id="op-price" inputmode="numeric" value="${b.price}"></label><button class="btn primary" data-save="price">Simpan harga</button></div>
      <dl class="dl"><dt>Harga referensi pasar</dt><dd>${rp(c.refPrice)}</dd><dt>HPP/biaya variabel</dt><dd>${rp(c.unitCost)}</dd><dt>Margin per ${c.unit}</dt><dd class="${cls(b.price - c.unitCost)}">${rp(b.price - c.unitCost)}</dd><dt>Elastisitas harga</dt><dd>${c.elasticity}</dd></dl></div>
      <div class="msg info" style="margin-top:12px">${icon('info')}<span>Harga 10% di atas referensi memangkas permintaan ±${Math.round((1 - Math.pow(1.1, -c.elasticity)) * 100)}% dan memperlambat kenaikan rating. Harga terlalu rendah bisa membuat kapasitas penuh dan stok cepat habis.</span></div>`;
    case 'stok': {
      const avg = h7.length ? sum(h7, 'sold') / h7.length : null; const cover = avg ? b.stock / avg : null;
      return `<div class="grid g-3" style="gap:10px;margin-bottom:12px"><div class="pl-box ${cover != null && cover < 2 ? 'neg' : ''}"><div class="subtle">Stok saat ini</div><b class="num">${num(b.stock)} ${c.unit}</b><div class="subtle">${cover != null ? `≈ ${cover.toFixed(1)} hari penjualan` : 'Belum ada data penjualan'}</div></div><div class="pl-box"><div class="subtle">Nilai stok</div><b class="num">${rp(b.stockValue)}</b></div><div class="pl-box"><div class="subtle">Pemasok aktif</div><b style="font-size:13px">${E.SUPPLIERS[b.supplier].name}</b></div></div>
      ${b.pending.length ? `<h3 style="margin-bottom:6px">Pesanan dalam perjalanan</h3><ul class="list" style="border:1px solid var(--border);border-radius:6px;margin-bottom:12px">${b.pending.map(o => `<li>${num(o.qty)} ${c.unit} · ${rpShort(o.cost)} · ${E.SUPPLIERS[o.supplier].name}<span class="subtle" style="margin-left:auto">tiba H${o.arriveDay + 1}</span></li>`).join('')}</ul>` : ''}
      <div class="grid g-3" style="gap:10px;align-items:end"><label class="field"><span>Jumlah pesan (${c.unit})</span><input class="input" id="op-qty" inputmode="numeric" value="${Math.round(c.baseDemand * 3)}"></label>
      <label class="field"><span>Pemasok</span><select class="input" id="op-sup">${Object.values(E.SUPPLIERS).map(s => `<option value="${s.id}" ${s.id === b.supplier ? 'selected' : ''}>${s.name}</option>`).join('')}</select></label><button class="btn primary" data-save="restock">Pesan stok</button></div>
      <div id="op-cost" class="subtle" style="margin-top:6px"></div>
      <div class="divider"></div><h3 style="margin-bottom:6px">Pemasok</h3><div class="table-wrap"><table class="table"><thead><tr><th>Pemasok</th><th class="r">Harga</th><th class="r">Waktu kirim</th><th class="r">Tepat waktu</th></tr></thead><tbody>${Object.values(E.SUPPLIERS).map(s => `<tr><td>${s.name}</td><td class="r">${s.costMult < 1 ? '−' + Math.round((1 - s.costMult) * 100) + '%' : 'normal'}</td><td class="r">${s.leadDays} hari</td><td class="r">${Math.round(s.reliability * 100)}%</td></tr>`).join('')}</tbody></table></div>
      <div class="divider"></div><label class="row" style="gap:8px;font-size:13px"><input type="checkbox" id="op-auto" ${b.autoRestock ? 'checked' : ''}> Restock otomatis bila stok + pesanan di bawah <input class="input" id="op-th" style="width:80px;height:30px" value="${b.autoRestock?.threshold ?? Math.round(c.baseDemand * 2)}" inputmode="numeric"> pesan <input class="input" id="op-aq" style="width:80px;height:30px" value="${b.autoRestock?.qty ?? Math.round(c.baseDemand * 3)}" inputmode="numeric"></label>`;
    }
    case 'karyawan': return `<div class="grid g-2"><div class="stack" style="gap:10px"><div class="row between"><span>Jumlah karyawan</span><div class="row"><button class="btn sm" data-staff="-1" aria-label="Kurangi karyawan">−</button><b style="min-width:24px;text-align:center" class="num">${b.staff}</b><button class="btn sm" data-staff="1" aria-label="Tambah karyawan">+</button></div></div>
      <dl class="dl"><dt>Gaji per karyawan</dt><dd>${rp(c.staffSalary)}/bln</dd><dt>Total gaji</dt><dd>${rp(b.staff * c.staffSalary)}/bln</dd><dt>Kapasitas per karyawan</dt><dd>${num(c.staffCapacity)} ${c.unit}/hari</dd><dt>Kapasitas pemilik</dt><dd>${num(c.ownerCapacity * (E.ownerBusy() ? 0.5 : 1))} ${c.unit}/hari${E.ownerBusy() ? ' (50%, kamu kerja penuh waktu)' : ''}</dd><dt>Batas</dt><dd>${c.minStaff || 0}–${c.maxStaff} karyawan</dd></dl></div>
      <div>${h7.length ? `<div class="msg ${sum(h7, 'lost') > sum(h7, 'sold') * 0.15 ? 'warn' : 'info'}">${icon('info')}<span>7 hari terakhir: rata-rata permintaan ${num(sum(h7, 'demand') / h7.length, 1)} vs kapasitas ${num(cap)} ${c.unit}/hari. ${sum(h7, 'lost') > sum(h7, 'sold') * 0.15 ? 'Kapasitas atau stok kurang — pertimbangkan karyawan tambahan.' : 'Kapasitas memadai; karyawan tambahan menambah biaya tetap.'}</span></div>` : noData}</div></div>`;
    case 'pemasaran': return `<div class="grid g-2"><div class="stack" style="gap:10px"><label class="field"><span>Anggaran pemasaran per hari</span><input class="input" id="op-mkt" inputmode="numeric" value="${b.marketingDaily}"></label><button class="btn primary" data-save="mkt">Simpan anggaran</button></div>
      <dl class="dl"><dt>Per bulan</dt><dd>${rp(b.marketingDaily * 30)}</dd><dt>Efek ke permintaan (model)</dt><dd>+${pct(0.35 * Math.log10(1 + b.marketingDaily / Math.max(10_000, c.refPrice * 2)), 1, false).replace('+', '')}</dd><dt>Pemasaran 7 hari</dt><dd>${rp(sum(h7, 'marketing'))}</dd></dl></div>
      <p class="subtle">Efek pemasaran menurun (diminishing returns): menggandakan anggaran tidak menggandakan pelanggan.</p>`;
    case 'laba': return h.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Komponen</th><th class="r">Kemarin</th><th class="r">7 hari</th><th class="r">${Math.min(30, h.length)} hari</th></tr></thead><tbody>
      ${[['Pendapatan', 'revenue', 1], ['HPP / biaya variabel', 'cogs', -1], ['Biaya tetap + sewa', 'fixed', -1], ['Gaji karyawan', 'salaries', -1], ['Pemasaran', 'marketing', -1]].map(([l, k, s]) => `<tr><td>${l}</td><td class="r ${s < 0 ? 'neg' : ''}">${s < 0 ? '−' : ''}${rpShort(last[k]).replace('−', '')}</td><td class="r ${s < 0 ? 'neg' : ''}">${s < 0 ? '−' : ''}${rpShort(sum(h7, k))}</td><td class="r ${s < 0 ? 'neg' : ''}">${s < 0 ? '−' : ''}${rpShort(sum(h30, k))}</td></tr>`).join('')}
      <tr><td><b>Laba/rugi bersih</b></td><td class="r"><b>${delta(last.profit, null, true)}</b></td><td class="r"><b>${delta(sum(h7, 'profit'), null, true)}</b></td><td class="r"><b>${delta(sum(h30, 'profit'), null, true)}</b></td></tr></tbody></table></div>
      <dl class="dl" style="margin-top:12px"><dt>Total modal ditanam</dt><dd>${rp(b.invested)}</dd><dt>Laba/rugi kumulatif</dt><dd>${delta(b.cumProfit)}</dd><dt>Nilai buku (peralatan 40% + stok)</dt><dd>${rp(E.bizValue(b))}</dd></dl>` : noData;
    case 'ekspansi': return `<div class="stack" style="gap:10px">${c.upgrades.map(u => { const done = b.upgrades.includes(u.id); return `<div class="pl-box row between wrap" style="gap:10px"><div><b>${esc(u.name)}</b><div class="subtle">Kapasitas ×${u.capacityMult} · biaya ${rp(u.cost)}</div></div>${done ? '<span class="chip pos">Terpasang</span>' : `<button class="btn sm primary" data-upgrade="${u.id}" ${E.S.player.balance < u.cost ? 'disabled' : ''}>${E.S.player.balance < u.cost ? `Kurang ${rpShort(u.cost - E.S.player.balance)}` : 'Pasang'}</button>`}</div>`; }).join('')}
      <p class="subtle" style="margin:0">Ekspansi hanya menguntungkan bila permintaan sudah melebihi kapasitas. Cek tab Penjualan & Pelanggan untuk permintaan yang tidak terlayani.</p>
      <div class="divider"></div><div class="row between wrap"><div><b>Tutup bisnis</b><div class="subtle">Aset dijual pada nilai buku ${rp(E.bizValue(b))}. Reputasi −3.</div></div><button class="btn sell sm" data-close-biz>Tutup bisnis</button></div></div>`;
  }
  return '';
}

function render() {
  renderTabs();
  $('#vbody').innerHTML = view === 'catalog' ? catalog() : mine();
  const plc = $('#pl-chart'); if (plc) { const b = E.S.businesses.find(x => x.bid === selBid); const h = b.history.slice(-30); if (h.length < 2 || !barChart(plc, h.map(r => ({ label: `H${r.day + 1}`, value: r.profit })), { height: 150 })) plc.innerHTML = `<div class="chart-empty">Grafik muncul setelah minimal 2 hari operasional (saat ini ${h.length}).</div>`; }
  updateRestockCost();
}
function updateRestockCost() { const q = $('#op-qty'); if (!q) return; const b = E.S.businesses.find(x => x.bid === selBid), c = E.catalogById(b.typeId); const n = Number(q.value); $('#op-cost').textContent = Number.isInteger(n) && n > 0 ? `Biaya: ${rp(Math.round(n * c.unitCost * E.SUPPLIERS[$('#op-sup').value].costMult))} · saldo ${rp(E.S.player.balance)}` : 'Masukkan bilangan bulat > 0.'; }
render();
E.on('day', render); E.on('change', () => { if (!document.querySelector('dialog[open]') && !document.activeElement?.matches('input,select')) render(); });

page.addEventListener('change', e => {
  if (e.target.id === 'f-sector') { filter.sector = e.target.value; render(); }
  if (e.target.id === 'f-sort') { filter.sort = e.target.value; render(); }
  if (e.target.id === 'f-open') { filter.onlyOpen = e.target.checked; render(); }
  if (['op-auto', 'op-th', 'op-aq'].includes(e.target.id)) { const on = $('#op-auto').checked; const th = Number($('#op-th').value), q = Number($('#op-aq').value); if (on && !(th > 0 && q > 0)) return toast('Ambang & jumlah harus > 0.', 'error'); toast(E.setBizParam(selBid, 'autoRestock', on ? { threshold: Math.round(th), qty: Math.round(q) } : null).msg); }
  if (e.target.id === 'op-sup') updateRestockCost();
});
page.addEventListener('input', e => { if (e.target.id === 'op-qty') updateRestockCost(); });
page.addEventListener('click', e => {
  const t = e.target;
  if (t.closest('#f-reset')) { filter = { sector: 'all', onlyOpen: false, sort: 'capex' }; render(); }
  const v = t.closest('[data-view]'); if (v && !v.closest('#vtabs')) { view = v.dataset.view; render(); }
  const dt = t.closest('[data-detail]'); if (dt) detailDialog(dt.dataset.detail);
  const bp = t.closest('[data-bid]'); if (bp) { selBid = +bp.dataset.bid; history.replaceState(null, '', '#biz-' + selBid); render(); }
  const op = t.closest('[data-op]'); if (op) { opTab = op.dataset.op; render(); }
  const sv = t.closest('[data-save]'); if (sv) {
    const k = sv.dataset.save; let r;
    if (k === 'price') r = E.setBizParam(selBid, 'price', Number($('#op-price').value));
    if (k === 'mkt') r = E.setBizParam(selBid, 'marketingDaily', Number($('#op-mkt').value));
    if (k === 'restock') r = E.restock(selBid, Number($('#op-qty').value), $('#op-sup').value);
    r.ok ? toast(r.msg) : toast(r.error, 'error'); render();
  }
  const st = t.closest('[data-staff]'); if (st) { const b = E.S.businesses.find(x => x.bid === selBid); const r = E.setBizParam(selBid, 'staff', b.staff + Number(st.dataset.staff)); r.ok ? toast(r.msg) : toast(r.error, 'error'); render(); }
  const up = t.closest('[data-upgrade]'); if (up) { const r = E.upgradeBiz(selBid, up.dataset.upgrade); r.ok ? toast(r.msg) : toast(r.error, 'error'); render(); }
  if (t.closest('[data-close-biz]') && confirm('Tutup bisnis ini? Tindakan tidak bisa dibatalkan.')) { const r = E.closeBiz(selBid); toast(r.msg); render(); }
});
