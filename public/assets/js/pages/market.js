import * as E from '../engine/core.js';
import { fmtDay } from '../engine/calendar.js';
import { seriesFor, realizedVol, RANGE_NEEDS } from '../engine/market.js';
import { WARMUP_DAYS } from '../data/market-assets.js';
import { mountShell } from '../ui/shell.js';
import { rp, rpShort, pct, delta, cls, arrow, icon, empty, lineChart, sparkline, esc, $, $$, toast, fmtDate, num, skeleton, plChip } from '../ui/ui.js';

const page = await mountShell('market', 'Asset Market');
const T = E.TICKS_PER_DAY;
const COLORS = { BTC: '#E8912D', ETH: '#5B6EE1', BBCA: '#1F5FA8', TLKM: '#C8352B', BBRI: '#0E5AA7', GOTO: '#1F9D55' };
let sym = (location.hash.slice(1) || 'BTC').toUpperCase(); if (!E.assetBySym(sym)) sym = 'BTC';
let range = 'intraday', side = 'buy', lastMsg = null;

const style = document.createElement('style');
style.textContent = `
.mkt{display:grid;grid-template-columns:250px minmax(0,1fr) 340px;gap:16px;align-items:start}
.asset-row{display:flex;align-items:center;gap:10px;padding:10px 12px;border-bottom:1px solid var(--border);cursor:pointer;background:none;border-left:3px solid transparent;width:100%;text-align:left;border-top:0;border-right:0}
.asset-row:hover{background:var(--surface-2)} .asset-row[aria-selected="true"]{background:#EDF3FA;border-left-color:var(--navy)}
.asset-row .p{margin-left:auto;text-align:right;font-size:12.5px}
.price-big{font-size:30px;font-weight:700;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
.stat-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));border-top:1px solid var(--border)}
.stat-grid>div{padding:10px 14px;font-size:12px;color:var(--text-2)} .stat-grid>div:not(:nth-child(3n+1)){border-left:1px solid var(--border)} .stat-grid>div:nth-child(n+4){border-top:1px solid var(--border)} .stat-grid b{display:block;font-size:13.5px;margin-top:2px;font-variant-numeric:tabular-nums}
.flash-up{animation:fu .8s} .flash-dn{animation:fd .8s} @keyframes fu{from{background:var(--green-bg)}} @keyframes fd{from{background:var(--red-bg)}}
.quick{display:grid;grid-template-columns:repeat(4,1fr);gap:6px}
@media(max-width:1280px){.mkt{grid-template-columns:minmax(0,1fr) 330px}.mkt .alist{grid-column:1/-1}.alist .rows{display:grid;grid-template-columns:repeat(3,1fr)}.alist .asset-row{border-right:1px solid var(--border)}}
@media(max-width:860px){.mkt{grid-template-columns:1fr}.alist .rows{display:flex;overflow-x:auto}.alist .asset-row{min-width:168px}.stat-grid{grid-template-columns:repeat(2,1fr)}.stat-grid>div{border-left:0!important;border-top:1px solid var(--border)}.stat-grid>div:nth-child(even){border-left:1px solid var(--border)!important}.price-big{font-size:24px}}
`;
document.head.appendChild(style);

// Loading state: tampil sampai market history dari engine siap dirender.
page.innerHTML = `<div class="mkt"><div class="panel">${Array(6).fill(`<div style="padding:12px">${skeleton(14, '70%')}<div style="height:6px"></div>${skeleton(10, '40%')}</div>`).join('')}</div>
<div class="panel panel-b"><div class="subtle" style="margin-bottom:10px">Memuat market history dari simulation engine…</div>${skeleton(34, '40%')}<div style="height:14px"></div>${skeleton(260)}</div><div class="panel panel-b">${skeleton(200)}</div></div>`;

requestAnimationFrame(() => setTimeout(build, 250));

function build() {
  page.innerHTML = `
  <div class="msg warn" style="margin-bottom:14px">${icon('info')}<span><b>Pasar SIMULATED.</b> Semua harga dihasilkan simulation engine BizSim (seed ${E.S.seed}) dan bergerak per market tick — bukan harga pasar nyata. Trading adalah aktivitas jangka pendek dengan risiko tinggi; untuk tujuan jangka panjang gunakan <a href="investments.html">Investments</a>.</span></div>
  <div class="mkt">
    <section class="panel alist" aria-label="Daftar aset"><div class="panel-h"><h2>Aset</h2><span class="subtle">24 jam sim.</span></div><div class="rows" id="alist" role="listbox" aria-label="Pilih aset"></div></section>
    <section class="stack" style="min-width:0">
      <div class="panel">
        <div class="panel-b" id="head"></div>
        <div style="padding:0 16px 8px" class="row between wrap"><div class="seg" id="ranges" role="group" aria-label="Rentang grafik"></div><span class="subtle" id="range-note"></span></div>
        <div style="padding:0 16px 12px"><div id="chart" class="chart"></div></div>
        <div class="stat-grid" id="stats"></div>
      </div>
      <div class="panel"><div class="panel-h"><h2>Riwayat transaksi <span id="hist-sym"></span></h2><span class="subtle">Eksekusi pada harga tick saat order</span></div><div id="trades"></div></div>
    </section>
    <aside class="stack">
      <section class="panel" id="order" aria-label="Panel BUY dan SELL"></section>
      <section class="panel" id="position" aria-label="Posisi"></section>
    </aside>
  </div>`;
  renderOrder(); renderAll();
  E.on('tick', onTick); E.on('change', () => { renderAll(); updateOrderCalc(); });
  window.addEventListener('resize', renderChart);
}

let prevPrice = null;
function onTick() { renderList(); renderHead(true); renderChart(); renderStats(); renderPosition(); updateOrderCalc(); renderRanges(); }
function renderAll() { renderList(); renderHead(); renderRanges(); renderChart(); renderStats(); renderPosition(); renderTrades(); }

function change24(st) { const t = st.ticks; if (t.length < 2) return null; const ref = t.length >= T ? t[t.length - T][1] : t[0][1]; const p = t[t.length - 1][1]; return { abs: p - ref, rel: (p - ref) / ref }; }

function renderList() {
  const m = E.S.market;
  $('#alist').innerHTML = E.MARKET_ASSETS.map(a => {
    const st = m.assets[a.symbol], p = E.currentQuote(m, a.symbol), ch = change24(st);
    return `<button class="asset-row" role="option" aria-selected="${a.symbol === sym}" data-sym="${a.symbol}">
      <span class="ticker-ico" style="background:${COLORS[a.symbol]}">${a.symbol}</span>
      <span style="min-width:0"><b style="font-size:13px">${a.symbol}</b><span class="subtle" style="display:block;font-size:11px">${a.class === 'crypto' ? 'Crypto' : 'Saham'}</span></span>
      <span class="p"><b class="num">${rpShort(p)}</b><span class="${ch ? cls(ch.abs) : ''} num" style="display:block;font-size:11.5px">${ch ? arrow(ch.abs) + ' ' + pct(ch.rel) : '—'}</span></span>
    </button>`;
  }).join('');
}
page.addEventListener('click', e => {
  const r = e.target.closest('[data-sym]'); if (r) { sym = r.dataset.sym; history.replaceState(null, '', '#' + sym); lastMsg = null; prevPrice = null; renderOrder(); renderAll(); }
  const rg = e.target.closest('[data-range]'); if (rg && !rg.disabled) { range = rg.dataset.range; renderRanges(); renderChart(); renderHead(); }
});

function rangeSeries() { return seriesFor(E.S.market.assets[sym], range, E.tickOfDay()); }
function xLabel(g, long) {
  const d = Math.floor(g / T) - WARMUP_DAYS, m = (g % T) * 30; const t = `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
  if (long) return `${fmtDay(d, 'wd')} ${t}`;
  return range === 'intraday' || range === '1d' ? t : fmtDay(d, 'short');
}

function renderHead(fromTick) {
  const a = E.assetBySym(sym), st = E.S.market.assets[sym], p = E.currentQuote(E.S.market, sym), s = rangeSeries();
  const ref = s ? s[0][1] : st.dayOpen; const abs = p - ref, rel = abs / ref;
  const flash = fromTick && prevPrice != null && p !== prevPrice ? (p > prevPrice ? 'flash-up' : 'flash-dn') : '';
  prevPrice = p;
  const label = { intraday: 'sejak 00:00 hari ini', '1d': '1 hari', '7d': '7 hari', '30d': '30 hari' }[range];
  $('#head').innerHTML = `<div class="row between wrap" style="gap:12px">
    <div class="row"><span class="ticker-ico" style="background:${COLORS[sym]};width:40px;height:40px">${sym}</span><div><h2 style="font-size:17px">${sym} <span class="subtle" style="font-weight:500">${esc(a.name)}</span></h2><div class="subtle">${a.class === 'crypto' ? 'Crypto · 24/7 simulasi' : `Saham · 1 lot = ${a.lot} lembar`} · Tick ${E.timeLabel()}</div></div></div>
    <span class="sim-badge">Harga simulasi</span></div>
  <div class="row wrap" style="margin-top:10px;gap:14px;align-items:baseline"><span class="price-big ${flash}" style="border-radius:4px;padding:0 4px;margin-left:-4px" aria-live="polite">${rp(p)}</span><span style="font-size:14px;font-weight:600">${delta(abs, rel)}</span><span class="subtle">${label}</span></div>`;
}

function renderRanges() {
  const st = E.S.market.assets[sym];
  const opts = [['intraday', 'Intraday'], ['1d', '1 Hari'], ['7d', '7 Hari'], ['30d', '30 Hari']];
  if (!seriesFor(st, range, E.tickOfDay())) { const ok = opts.find(([k]) => seriesFor(st, k, E.tickOfDay())); if (ok) range = ok[0]; }
  $('#ranges').innerHTML = opts.map(([k, l]) => { const avail = !!seriesFor(st, k, E.tickOfDay()); return `<button data-range="${k}" aria-pressed="${k === range}" ${avail ? '' : 'disabled'} title="${avail ? '' : RANGE_NEEDS[k]}">${l}</button>`; }).join('');
  const missing = opts.filter(([k]) => !seriesFor(st, k, E.tickOfDay()));
  const daysHave = Math.floor(st.hourly.length / 24);
  $('#range-note').textContent = missing.length ? `${missing.map(m => m[1]).join(', ')}: data belum cukup (riwayat ${daysHave} hari)` : `${st.hourly.length} titik per jam tersedia`;
}

function renderChart() {
  const el = $('#chart'); if (!el) return; const s = rangeSeries();
  if (!lineChart(el, s, { height: window.innerWidth < 860 ? 210 : 280, xFmt: xLabel, yFmt: v => rpShort(v).replace('Rp ', '') })) {
    el.innerHTML = `<div class="chart-empty" style="height:220px">${RANGE_NEEDS[range]}. Grafik akan terisi saat tick berikutnya diterbitkan.</div>`;
  }
}

function renderStats() {
  const a = E.assetBySym(sym), st = E.S.market.assets[sym], m = E.S.market;
  const vol = realizedVol(st), s = m.sentiment;
  const volLabel = vol == null ? '—' : vol < a.sigmaDaily * 0.8 ? 'Rendah' : vol < a.sigmaDaily * 1.3 ? 'Normal' : 'Tinggi';
  const sentLabel = s > 0.25 ? 'Optimis' : s < -0.25 ? 'Pesimis' : 'Netral';
  const volUnits = a.class === 'saham' ? `${num(st.volToday / a.lot)} lot` : `${num(st.volToday, 1)} ${sym}`;
  $('#stats').innerHTML = `
    <div>Open hari ini<b style="color:var(--text)">${rp(st.dayOpen)}</b></div><div>High hari ini<b style="color:var(--text)">${rp(st.hi)}</b></div><div>Low hari ini<b style="color:var(--text)">${rp(st.lo)}</b></div>
    <div>Volume sim. hari ini<b>${volUnits}</b></div>
    <div>Volatilitas 24j<b>${vol == null ? '—' : pct(vol, 2, false)} <span class="chip ${volLabel === 'Tinggi' ? 'warn' : ''}" style="font-size:10.5px">${volLabel}</span></b></div>
    <div>Sentimen pasar<b class="${cls(s)}">${arrow(s)} ${sentLabel} <span class="subtle num">${s.toFixed(2)}</span></b></div>`;
}

// ———————————— Order panel ————————————
function renderOrder() {
  const a = E.assetBySym(sym);
  $('#order').innerHTML = `<div class="panel-h"><h2>Order ${sym}</h2><div class="seg buy-sell" role="group" aria-label="Arah order"><button data-side="buy" aria-pressed="${side === 'buy'}">BUY</button><button data-side="sell" aria-pressed="${side === 'sell'}">SELL</button></div></div>
  <div class="panel-b stack" style="gap:12px">
    <div class="row between subtle"><span>Saldo tersedia</span><b class="num" id="o-bal" style="color:var(--text)"></b></div>
    <div class="row between subtle"><span>Dimiliki</span><b class="num" id="o-own" style="color:var(--text)"></b></div>
    <label class="field"><span>Jumlah (${a.class === 'saham' ? 'lot' : a.unit})</span>
      <div class="input-group"><input class="input" id="o-qty" inputmode="decimal" autocomplete="off" placeholder="${a.class === 'saham' ? 'mis. 1' : 'mis. ' + a.minQty}" aria-describedby="o-err"><span class="addon">${a.class === 'saham' ? 'lot' : sym}</span></div></label>
    <div class="quick">${[0.25, 0.5, 0.75, 1].map(f => `<button class="btn sm" data-frac="${f}">${f === 1 ? 'Maks' : f * 100 + '%'}</button>`).join('')}</div>
    <div id="o-err" role="alert"></div>
    <dl class="dl" id="o-calc"></dl>
    <button class="btn block ${side}" id="o-submit">${side === 'buy' ? 'BUY' : 'SELL'} ${sym}</button>
    <p class="subtle" style="margin:0">Order dieksekusi pada harga tick saat tombol ditekan. Harga dapat berubah di tick berikutnya. Biaya: beli ${pct(a.feeBuy, 2, false)}, jual ${pct(a.feeSell, 2, false)}.</p>
    <div id="o-result" aria-live="polite"></div>
  </div>`;
  const q = $('#o-qty');
  q.addEventListener('input', () => { lastMsg = null; $('#o-result').innerHTML = ''; updateOrderCalc(); });
  q.addEventListener('keydown', e => { if (e.key === 'Enter') submit(); });
  $$('#order [data-side]').forEach(b => b.addEventListener('click', () => { side = b.dataset.side; const v = q.value; renderOrder(); $('#o-qty').value = v; updateOrderCalc(); }));
  $$('#order [data-frac]').forEach(b => b.addEventListener('click', () => { $('#o-qty').value = maxQty(+b.dataset.frac); lastMsg = null; $('#o-result').innerHTML = ''; updateOrderCalc(); }));
  $('#o-submit').addEventListener('click', submit);
  updateOrderCalc();
}
function maxQty(f) {
  const a = E.assetBySym(sym), pos = E.S.trading.positions[sym];
  if (side === 'sell') { const u = (pos?.units || 0) * f; return a.class === 'saham' ? Math.floor(u / a.lot) : Math.floor(u / a.step) * a.step; }
  const p = E.currentQuote(E.S.market, sym), per = (a.class === 'saham' ? a.lot : 1) * p * (1 + a.feeBuy);
  const raw = E.S.player.balance * f / per; const v = a.class === 'saham' ? Math.floor(raw) : Math.floor(raw / a.step) * a.step;
  return a.class === 'saham' ? v : +v.toFixed(6);
}
function parseQty() { const v = $('#o-qty').value.trim().replace(',', '.'); return v === '' ? '' : Number(v); }
function updateOrderCalc() {
  if (!$('#o-calc')) return;
  const a = E.assetBySym(sym), S = E.S, pos = S.trading.positions[sym];
  $('#o-bal').textContent = rp(S.player.balance);
  $('#o-own').textContent = pos?.units ? E.fmtQty(a, pos.units) : `0 ${a.class === 'saham' ? 'lot' : a.unit}`;
  const qty = parseQty(), btn = $('#o-submit'), err = $('#o-err'), inp = $('#o-qty');
  let problem = null, kind = 'error';
  if (side === 'sell' && !(pos?.units > 0)) { problem = `Kamu belum memiliki ${sym}. Tidak ada posisi untuk dijual.`; kind = 'info'; }
  else if (qty !== '') problem = E.validateQty(sym, qty);
  const q = qty !== '' && !problem ? E.tradeQuote(sym, side, qty) : null;
  if (q && side === 'buy' && q.total > S.player.balance) problem = `Saldo tidak cukup — butuh ${rp(q.total)}, kurang ${rp(q.total - S.player.balance)}.`;
  if (q && side === 'sell' && q.units > (pos?.units || 0) + 1e-9) problem = `Melebihi unit yang dimiliki (${E.fmtQty(a, pos.units)}).`;
  inp.classList.toggle('invalid', !!problem && qty !== '' && kind === 'error');
  inp.setAttribute('aria-invalid', !!problem && qty !== '');
  err.innerHTML = problem ? `<div class="msg ${kind === 'info' ? 'info' : 'error'}">${icon(kind === 'info' ? 'info' : 'alert')}<span>${esc(problem)}</span></div>` : '';
  btn.disabled = !!problem || qty === '';
  const price = E.currentQuote(S.market, sym);
  $('#o-calc').innerHTML = `
    <dt>Harga simulasi</dt><dd>${rp(price)}</dd>
    <dt>Jumlah unit</dt><dd>${q ? (a.class === 'saham' ? `${num(q.units)} lembar` : `${num(q.units, 6)} ${sym}`) : '—'}</dd>
    <dt>Nilai</dt><dd>${q ? rp(q.gross) : '—'}</dd>
    <dt>Biaya transaksi</dt><dd>${q ? rp(q.fee) : '—'}</dd>
    <dt><b>${side === 'buy' ? 'Total dibayar' : 'Diterima bersih'}</b></dt><dd><b>${q ? rp(q.total) : '—'}</b></dd>
    ${q && side === 'sell' && pos ? `<dt>Estimasi realized P/L</dt><dd>${delta(q.total - pos.avgCost * q.units)}</dd>` : ''}`;
}
function submit() {
  const qty = parseQty(); if (qty === '') return;
  const r = E.trade(sym, side, qty);
  const box = $('#o-result');
  if (r.ok) {
    box.innerHTML = `<div class="msg ok">${icon('check')}<span><b>Transaksi berhasil.</b><br>${side === 'buy' ? 'Beli' : 'Jual'} ${E.fmtQty(E.assetBySym(sym), r.data.units)} @ ${rp(r.data.price)} · biaya ${rp(r.data.fee)} · total ${rp(r.data.total)}</span></div>`;
    toast(r.msg); $('#o-qty').value = ''; updateOrderCalc();
  } else {
    box.innerHTML = `<div class="msg error">${icon('alert')}<span><b>Transaksi gagal.</b><br>${esc(r.error)}</span></div>`;
  }
}

function renderPosition() {
  const a = E.assetBySym(sym), pos = E.S.trading.positions[sym], el = $('#position'); if (!el) return;
  if (!pos || (pos.units <= 0 && !pos.realized)) { el.innerHTML = `<div class="panel-h"><h2>Posisi ${sym}</h2></div>${empty('chart', 'Belum ada posisi', `Kamu belum pernah membeli ${sym}. Mulai dengan jumlah kecil; harga simulasi bisa turun maupun naik.`)}`; return; }
  const p = E.currentQuote(E.S.market, sym), value = pos.units * p, cost = pos.units * pos.avgCost, un = value - cost, unRel = cost ? un / cost : 0;
  el.innerHTML = `<div class="panel-h"><h2>Posisi ${sym}</h2>${pos.units > 0 ? plChip(un) : '<span class="chip">Tidak ada posisi terbuka</span>'}</div>
  <div class="panel-b stack" style="gap:10px">
    <dl class="dl"><dt>Jumlah dimiliki</dt><dd>${E.fmtQty(a, pos.units)}${a.class === 'saham' && pos.units ? ` <span class="subtle">(${num(pos.units)} lbr)</span>` : ''}</dd>
    <dt>Average cost</dt><dd>${pos.units ? rp(pos.avgCost) : '—'} <span class="subtle">/${a.class === 'saham' ? 'lbr' : sym}</span></dd>
    <dt>Nilai posisi</dt><dd>${rp(value)}</dd><dt>Total biaya dibayar</dt><dd>${rp(pos.fees)}</dd></dl>
    <div class="pl-box ${cls(un)}"><div class="subtle">Unrealized P/L · belum direalisasikan</div><div style="font-size:17px;font-weight:700">${pos.units ? delta(un, unRel) : '—'}</div></div>
    <div class="pl-box ${cls(pos.realized)}"><div class="subtle">Realized P/L · sudah terkunci dari penjualan</div><div style="font-size:15px;font-weight:700">${delta(pos.realized)}</div></div>
  </div>`;
}
function renderTrades() {
  const list = E.S.trading.trades.filter(t => t.sym === sym), a = E.assetBySym(sym);
  $('#hist-sym').textContent = sym;
  $('#trades').innerHTML = list.length ? `<div class="table-wrap"><table class="table"><thead><tr><th>Waktu</th><th>Arah</th><th class="r">Jumlah</th><th class="r">Harga</th><th class="r hide-m">Biaya</th><th class="r">Total</th></tr></thead><tbody>
    ${list.slice(0, 12).map(t => `<tr><td>H${t.day + 1} ${t.time}</td><td><span class="chip ${t.side === 'buy' ? 'pos' : 'neg'}">${t.side === 'buy' ? 'BUY' : 'SELL'}</span></td><td class="r">${E.fmtQty(a, t.units)}</td><td class="r">${rp(t.price)}</td><td class="r hide-m">${rp(t.fee)}</td><td class="r">${rp(t.total)}</td></tr>`).join('')}
  </tbody></table></div>` : `<div class="panel-b subtle">Belum ada transaksi ${sym}.</div>`;
}
