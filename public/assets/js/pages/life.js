// KEHIDUPAN — kebutuhan karakter, makan & minum, istirahat & kebersihan, kesehatan, pesan antar, belanja, transport.
// Nilai kebutuhan & aturan berasal dari engine/needs.js + data/needs-rules.js. Harga, jam buka, dan metode bayar dari server.
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as CAL from '../engine/calendar.js';
import { TIME_RULES as TR } from '../data/time-rules.js';
import { mountShell } from '../ui/shell.js';
import { needTiles } from '../ui/needs-ui.js';
import { openCheckout } from '../ui/checkout.js';
import { rp, icon, esc, $, toast, empty } from '../ui/ui.js';

const page = await mountShell('life', 'Kehidupan');
window.__hashNav = true;
const NE = E.NE;
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, F, NE };
const TABS = [['kebutuhan', 'Kebutuhan', 'life'], ['makan', 'Makan & Minum', 'food'], ['istirahat', 'Istirahat & Kebersihan', 'bed'], ['kesehatan', 'Kesehatan', 'heart'], ['antar', 'Pesan Antar', 'truck'], ['belanja', 'Belanja', 'cart'], ['transport', 'Transport', 'bus']];
let tab = TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'kebutuhan';

page.innerHTML = `<div class="mod-band"><span class="ti">${icon('life')}</span><div><h2>Kehidupan sehari-hari</h2><p>Kebutuhan karakter berubah setiap 30 menit game sesuai aktivitas. Makan, minum, mandi, dan istirahat memakan waktu game dan memengaruhi performa sekolah, kerja, dan produksi konten.</p></div><div class="right" id="state"></div></div>
<div class="life-layout"><aside class="life-side"><section class="panel"><div class="panel-h"><h2>Kondisi sekarang</h2></div><div class="panel-b"><div class="needs-col" id="needs"></div></div></section><section class="panel" id="actv"></section></aside>
<div><div class="tabs" role="tablist" id="tabs"></div><div id="body" style="margin-top:14px"></div></div></div>`;

await F.init().catch(() => {});

function stateChips() {
  const st = NE.stateAt(E.S.clock.g), pf = NE.perfFactor();
  $('#state').innerHTML = `<span class="chip dark">${esc(NE.STATE_LABEL[st])}</span><span class="chip ${pf < 0.95 ? 'warn' : 'pos'}" title="Faktor performa kerja/sekolah dari kondisi karakter">Performa ${Math.round(pf * 100)}%</span><span class="chip">${rp(E.S.player.balance)} tunai</span>`;
}
let actKey = null;
function activityPanel() {
  const a = NE.activityProgress(), why = NE.blockedReason({ allowDuringActivity: true }), key = a ? a.startAbs + a.label : 'none:' + why;
  if (a && key === actKey) { const b = $('#actv [data-abar]'), l = $('#actv [data-aleft]'); if (b) b.style.width = Math.round(a.pct * 100) + '%'; if (l) l.textContent = `Selesai ${CAL.fmtHM(a.endAbs % 86400)} · sisa ${Math.ceil(a.leftSec / 60)} menit game`; return; }
  actKey = key;
  $('#actv').innerHTML = `<div class="panel-h"><h2>Aktivitas berlangsung</h2></div><div class="panel-b">${a ? `<b>${esc(a.label)}</b><div class="subtle" data-aleft>Selesai ${CAL.fmtHM(a.endAbs % 86400)} · sisa ${Math.ceil(a.leftSec / 60)} menit game</div><div class="bar" style="margin:8px 0"><i data-abar style="width:${Math.round(a.pct * 100)}%"></i></div><button class="btn sm" data-finish ${E.liveActive() ? 'disabled' : ''}>Lewati sampai selesai</button>` : why ? `<p class="subtle" style="margin:0">${esc(why)}</p>` : '<p class="subtle" style="margin:0">Tidak ada aktivitas. Karakter sedang waktu luang.</p>'}</div>`;
}
function paintSide() { $('#needs').innerHTML = needTiles('full'); activityPanel(); stateChips(); }
function renderTabs() { $('#tabs').innerHTML = TABS.map(([k, l, i]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join(''); }

const why = (extraMin = 0) => NE.blockedReason() || (extraMin ? NE.overlapReason(extraMin) : null);
const actBtn = (attrs, label, reason, primary = false) => reason ? `<button class="btn sm" disabled title="${esc(reason)}">${label}</button>` : `<button class="btn sm ${primary ? 'primary' : ''}" ${attrs}>${label}</button>`;
const fxText = fx => Object.entries(fx || {}).filter(([, v]) => v).map(([k, v]) => `${NE.needDef(k)?.short || k} ${v > 0 ? '+' : ''}${v}`).join(' · ');

function merchantCard(mid, opts = {}) {
  const m = F.merchant(mid); if (!m) return '';
  const open = F.openNow(m), items = F.CAT.ITEMS.filter(i => i.merchant === mid && (!opts.filter || opts.filter(i)));
  const travel = m.travelMin || 0;
  return `<div class="shop-card ${open ? '' : 'closed'}"><div class="h"><div><b>${esc(m.name)}</b><small>${F.hoursText(m)}${travel ? ` · perjalanan ${travel} menit sekali jalan` : ''}</small></div>${open ? '<span class="chip pos">Buka</span>' : '<span class="chip neg">Tutup</span>'}</div>
  <ul>${items.map(it => { const total = (it.min || 0) + (it.stock || it.delivery || it.ship ? 0 : travel * 2); const reason = !open ? `${m.name} tutup (${F.hoursText(m)}).` : opts.online ? onlineReason() : why(total);
    return `<li><span>${esc(it.name)}<small>${it.stock ? 'Masuk inventori' : it.ship ? `Dikirim ${it.ship[0]}–${it.ship[1]} hari` : it.delivery ? `Siap ±${it.delivery.prep + it.delivery.ride} menit` : `${total} menit`}${fxText(it.fx) ? ' · ' + fxText(it.fx) : ''}</small></span><b class="num sm">${rp(it.price)}</b>${actBtn(`data-buy="${it.id}"`, 'Beli', reason)}</li>`; }).join('')}</ul>
  <div class="pay-tags">${m.methods.map(x => `<span>${esc(methodName(x))}</span>`).join('')}</div></div>`;
}
const methodName = x => x.startsWith('wallet:') ? F.wallet(x.split(':')[1])?.name : { cash: 'Tunai', debit: 'Debit', credit: 'Kredit', qris: 'QRIS', wallet: 'Dompet digital', transfer: 'Transfer/VA', cod: 'COD' }[x];
function onlineReason() { if (E.liveActive()) return 'Karakter sedang live.'; const h = E.secOfDay() / 3600; if (h < 6 || h >= 22) return 'Karakter sedang tidur.'; return null; }

async function buy(id) {
  const it = F.item(id), m = F.merchant(it.merchant), travel = m.travelMin || 0;
  await openCheckout({ merchant: m.id, items: [{ id, qty: 1 }], title: `${m.name} — ${it.name}`, onSuccess: r => {
    if (r.order) { toast(m.id === 'pasarku' ? 'Pesanan dibuat. Pantau di tab Belanja.' : 'Pesanan dibuat. Pantau di tab Pesan Antar.'); return; }
    if (it.stock) { NE.addInventory(it, 1); E.save(); toast(`${it.name} masuk inventori.`); return; }
    const res = NE.start({ kind: 'beli', label: `${it.name} di ${m.name}`, min: (it.min || 0) + travel * 2, fx: it.fx, source: r.txn?.id });
    if (res.ok) toast(res.msg);
  } });
}

function inventoryPanel(filter) {
  const inv = Object.entries(E.S.life.inventory).filter(([, v]) => !filter || filter(v));
  return `<section class="panel"><div class="panel-h"><h2>Inventori rumah</h2></div>${inv.length ? `<ul class="list">${inv.map(([k, v]) => `<li><span style="flex:1"><b>${esc(v.name)}</b><br><span class="subtle">${v.uses != null ? `${v.uses}× pakai` : `${v.qty} buah`}${fxText(v.fx) ? ' · ' + fxText(v.fx) : ''}</span></span>${v.uses == null ? actBtn(`data-eat="${esc(k)}"`, 'Pakai', why(v.min || 5)) : ''}</li>`).join('')}</ul>` : `<div class="panel-b subtle">Inventori kosong. Belanja di SerbaMart 24 atau Pasarku.</div>`}</section>`;
}

const VIEW = {
  kebutuhan() {
    const st = NE.stateAt(E.S.clock.g), r = NE.rates(st), h = E.S.life.history;
    return `<section class="panel"><div class="panel-h"><h2>Aturan kebutuhan (simulation engine)</h2><span class="subtle">State sekarang: ${esc(NE.STATE_LABEL[st])}</span></div>
    <div class="panel-b" style="overflow-x:auto"><table class="table"><thead><tr><th>Kebutuhan</th><th class="num">Nilai</th><th>Status</th><th class="num">Laju sekarang</th><th>Ambang</th><th>Dampak</th></tr></thead><tbody>
    ${NE.NEEDS.map(n => { const lv = NE.level(n.key); return `<tr><td><b>${n.label}</b></td><td class="num">${Math.round(NE.value(n.key))}</td><td><span class="chip ${lv === 'ok' ? 'pos' : lv === 'low' ? 'warn' : 'neg'}">${(n.invert ? NE.LEVEL_LABEL_STRESS : NE.LEVEL_LABEL)[lv]}</span></td><td class="num">${r[n.key] >= 0 ? '+' : ''}${r[n.key].toFixed(1)}/jam</td><td class="subtle">${n.invert ? `tinggi ≥ ${n.low} · kritis ≥ ${n.critical}` : `rendah ≤ ${n.low} · kritis ≤ ${n.critical}`}</td><td class="subtle" style="min-width:240px">${esc(n.effect)}</td></tr>`; }).join('')}
    </tbody></table></div></section>
    <div class="g-2" style="margin-top:14px;display:grid;gap:14px">
    <section class="panel"><div class="panel-h"><h2>Laju per state (per jam)</h2></div><div class="panel-b" style="overflow-x:auto"><table class="table"><thead><tr><th></th>${['awake', 'sleep', 'school', 'work'].map(s => `<th class="num">${NE.STATE_LABEL[s]}</th>`).join('')}</tr></thead><tbody>${NE.NEEDS.filter(n => n.key !== 'mood').map(n => `<tr><td>${n.label}</td>${['awake', 'sleep', 'school', 'work'].map(s => `<td class="num">${n.rate[s] > 0 ? '+' : ''}${n.rate[s]}</td>`).join('')}</tr>`).join('')}</tbody></table><p class="subtle" style="margin:8px 0 0">Nilai dasar sebelum interaksi (mis. stres tinggi menguras energi 1,5×, kebutuhan kritis merusak kesehatan). Laju "sekarang" di tabel atas sudah termasuk interaksi.</p></div></section>
    <section class="panel"><div class="panel-h"><h2>Catatan terakhir</h2></div>${h.length ? `<ul class="list">${h.slice(0, 10).map(x => `<li><span class="subtle num" style="width:96px">${CAL.fmtDay(x.day, 'wd')} ${CAL.fmtHM(x.sec)}</span><span style="flex:1">${esc(x.text)}<br><span class="subtle">${esc(fxText(x.fx))}</span></span></li>`).join('')}</ul>` : '<div class="panel-b subtle">Belum ada aktivitas tercatat.</div>'}
    <div class="panel-b" style="border-top:1px solid var(--border)"><label class="row" style="gap:8px;align-items:flex-start"><input type="checkbox" data-automeal ${E.S.life.autoMeals ? 'checked' : ''} ${E.ageYears() >= 18 ? 'disabled' : ''} style="margin-top:3px"><span><b>Ikut makan bersama keluarga</b><br><span class="subtle">${E.ageYears() >= 18 ? 'Usia 18+: makan di rumah dibayar sendiri (tab Makan & Minum).' : 'Sarapan 06:30 & makan malam 18:30 otomatis bila karakter di rumah dan tidak sibuk. Ditanggung wali.'}</span></span></label></div></section></div>`;
  },
  makan() {
    const age = E.ageYears(), home = F.item('rumah-makan'), price = age < 18 ? 0 : home.price;
    return `<section class="panel"><div class="panel-h"><h2>Di rumah</h2></div><ul class="list">
      <li><span style="flex:1"><b>Makan di rumah</b><br><span class="subtle">${home.min} menit · ${fxText(home.fx)} · ${price ? rp(price) + ' (tunai, kontribusi dapur)' : 'ditanggung wali (usia < 18)'}</span></span>${actBtn('data-homemeal', 'Makan', why(home.min) || (!F.openNow(F.merchant('rumah')) ? 'Dapur rumah 05:00–22:00.' : null), true)}</li>
      ${NE.HOME_ACTIONS.filter(a => a.group === 'makan').map(a => `<li><span style="flex:1"><b>${esc(a.label)}</b><br><span class="subtle">${a.min} menit · ${fxText(a.fx)}</span></span>${actBtn(`data-home="${a.id}"`, 'Mulai', why(a.min))}</li>`).join('')}
    </ul></section>
    <h3 style="margin:16px 0 8px">Warung, restoran & kafe</h3><div class="shop">${['warung', 'minang', 'kopisenja'].map(id => merchantCard(id)).join('')}</div>
    <h3 style="margin:16px 0 8px">Minimarket</h3><div class="shop">${merchantCard('serbamart', { filter: i => i.kind !== 'toiletries' })}</div>
    <div style="margin-top:14px">${inventoryPanel(v => v.kind === 'konsumsi')}</div>`;
  },
  istirahat() {
    return `<section class="panel"><div class="panel-h"><h2>Istirahat, tidur & kebersihan</h2><span class="subtle">Tidur malam otomatis ${String(TR.sleep.from).padStart(2, '0')}:00–${String(TR.sleep.to).padStart(2, '0')}:00</span></div><ul class="list">
      ${NE.HOME_ACTIONS.filter(a => a.group !== 'makan').map(a => { const extra = a.uses ? ` · sisa ${NE.invCount(a.uses)}× pakai` : ''; return `<li><span style="flex:1"><b>${esc(a.label)}</b><br><span class="subtle">${a.min} menit · ${fxText(a.fx) || 'pemulihan energi seperti tidur'}${extra}</span></span>${actBtn(`data-home="${a.id}"`, 'Mulai', why(a.min) || (a.uses && NE.invCount(a.uses) <= 0 ? 'Sabun & sampo habis — beli di SerbaMart 24/Pasarku.' : null))}</li>`; }).join('')}
    </ul></section>
    <h3 style="margin:16px 0 8px">Perlengkapan mandi & hiburan</h3><div class="shop">${merchantCard('serbamart', { filter: i => i.kind === 'toiletries' })}${merchantCard('layarkota')}</div>
    <div style="margin-top:14px"><section class="panel"><div class="panel-h"><h2>Peralatan rumah yang memengaruhi kebutuhan</h2></div><ul class="list">${F.CAT.ITEMS.filter(i => i.upgrade || i.unlock).map(i => `<li><span style="flex:1"><b>${esc(i.name)}</b><br><span class="subtle">${i.kind === 'kasur' ? 'Pemulihan energi saat tidur +15%' : i.kind === 'kipas' ? 'Tidur +5%, stres −0,3/jam saat tidur' : i.kind === 'botol' ? 'Haus berkurang 15% lebih lambat' : 'Membuka moda sepeda'}</span></span>${E.S.life.owned[i.kind] ? '<span class="chip pos">Dimiliki</span>' : '<a class="btn sm" href="#belanja">Beli di Pasarku</a>'}</li>`).join('')}</ul></section></div>`;
  },
  kesehatan() {
    const hv = NE.value('health'), lv = NE.level('health');
    return `<section class="panel"><div class="panel-b"><div class="row between wrap"><div><div class="subtle">Kesehatan</div><div style="font-size:26px;font-weight:700" class="num">${Math.round(hv)}/100</div></div><span class="chip ${lv === 'ok' ? 'pos' : lv === 'low' ? 'warn' : 'neg'}">${NE.LEVEL_LABEL[lv]}</span></div><p class="subtle" style="margin:8px 0 0">${esc(NE.needDef('health').effect)}</p></div></section>
    <div class="shop" style="margin-top:14px">${merchantCard('klinik')}${merchantCard('apotek')}</div>
    <div style="margin-top:14px">${inventoryPanel(v => v.id === 'vitamin')}</div>`;
  },
  antar() {
    const orders = (F.V?.orders || []).filter(o => o.merchant === 'antarrasa');
    return `${ordersPanel(orders, 'Pesanan makanan')}<h3 style="margin:16px 0 8px">Menu JalanYuk Food</h3><div class="shop">${merchantCard('antarrasa', { online: true })}</div>
    <p class="subtle">Harga + ongkir Rp ${F.CAT.DELIVERY.deliveryFee.toLocaleString('id-ID')} + biaya layanan Rp ${F.CAT.DELIVERY.serviceFee.toLocaleString('id-ID')} dihitung server. Pesanan bisa dibatalkan selama status "Diproses" (dana dikembalikan, status transaksi Reversed).</p>`;
  },
  belanja() {
    const orders = (F.V?.orders || []).filter(o => o.merchant === 'pasarku');
    return `${ordersPanel(orders, 'Pesanan Pasarku')}<h3 style="margin:16px 0 8px">Pasarku (marketplace)</h3><div class="shop">${merchantCard('pasarku', { online: true })}</div><div style="margin-top:14px">${inventoryPanel()}</div>`;
  },
  transport() {
    const cur = E.S.life.commute, ad = F.V?.autodebit?.jalanyuk, gw = F.accounts('wallet').find(a => a.provider === 'gojalan');
    return `<section class="panel"><div class="panel-h"><h2>Perjalanan harian ke sekolah / kerja</h2><span class="subtle">Dibayar pulang-pergi tiap hari sekolah/kerja, saat jam masuk</span></div><ul class="list">
    ${F.CAT.COMMUTE.map(c => { const lock = c.needs && !E.S.life.owned[c.needs] ? 'Belum punya sepeda (Pasarku).' : null; return `<li><span style="flex:1"><b>${esc(c.name)}</b><br><span class="subtle">${c.fare ? rp(c.fare * 2) + '/hari (2×' + rp(c.fare) + ')' : 'Gratis'} · ${c.minutes} menit sekali jalan · ${fxText(NE.COMMUTE_FX[c.id])}${c.id === 'ojek' ? ` · bayar ${ad ? 'autodebet JalanPay' : 'tunai'}` : c.id === 'bus' ? ' · bayar tunai' : ''}</span></span>${cur === c.id ? '<span class="chip pos">Dipakai</span>' : actBtn(`data-commute="${c.id}"`, 'Pilih', lock)}</li>`; }).join('')}
    </ul></section>
    <section class="panel" style="margin-top:14px"><div class="panel-h"><h2>Autodebet ojek (JalanPay)</h2></div><div class="panel-b stack" style="gap:10px">
      ${!gw ? `<p class="subtle" style="margin:0">Aktifkan JalanPay di <a href="finance.html#dompet">Keuangan › Dompet digital</a> untuk membayar ojek otomatis. Tanpa autodebet, tarif ojek dibayar tunai.</p>` : `<p style="margin:0">${ad ? `Aktif — tarif ojek harian dipotong dari JalanPay (saldo ${rp(gw.balance)}).` : 'Belum aktif — tarif ojek dibayar tunai.'} Jika saldo/uang kurang, karakter berjalan kaki hari itu.</p>
      <div class="row wrap"><input class="input" style="max-width:160px" type="password" inputmode="numeric" maxlength="6" placeholder="PIN 6 digit" data-adpin><button class="btn sm ${ad ? '' : 'primary'}" data-autodebit="${ad ? 'off' : 'on'}">${ad ? 'Matikan autodebet' : 'Aktifkan autodebet'}</button></div>`}
    </div></section>`;
  },
};
function ordersPanel(orders, title) {
  const act = orders.filter(o => !['diterima', 'dibatalkan', 'gagal'].includes(o.status));
  const steps = ['diproses', 'diantar', 'tiba', 'diterima'], L = { diproses: 'Diproses', diantar: 'Diantar', tiba: 'Tiba', diterima: 'Diterima' };
  if (!orders.length) return `<section class="panel"><div class="panel-h"><h2>${title}</h2></div><div class="panel-b subtle">Belum ada pesanan.</div></section>`;
  return `<section class="panel"><div class="panel-h"><h2>${title}</h2><span class="subtle">${act.length} aktif</span></div><ul class="list">${orders.slice(0, 8).map(o => { const s = F.orderStage(o), i = steps.indexOf(s);
    return `<li style="display:block"><div class="row between wrap"><b>${o.items.map(l => `${l.qty}× ${esc(l.name)}`).join(', ')}</b><span class="num">${rp(o.total)} · ${esc(methodName(o.method) || o.method)}</span></div>
    ${i >= 0 ? `<div class="order-track">${steps.map((x, k) => `<span class="${k < i ? 'done' : k === i ? 'cur' : ''}">${L[x]}</span>`).join('')}</div><div class="row between wrap"><span class="subtle">Estimasi tiba ${CAL.fmtStamp(Math.floor(F.toLocal(o.etaAbs) / 86400), F.toLocal(o.etaAbs) % 86400)}</span><span class="row" style="gap:6px">${s === 'diproses' ? `<button class="btn sm" data-cancel="${o.id}">Batalkan</button>` : ''}${s === 'tiba' ? `<button class="btn sm primary" data-receive="${o.id}">Terima pesanan</button>` : ''}</span></div>` : `<span class="chip ${s === 'diterima' ? 'pos' : 'neg'}">${s === 'diterima' ? 'Diterima' : s === 'dibatalkan' ? 'Dibatalkan' : 'Gagal'}</span>`}</li>`; }).join('')}</ul></section>`;
}

function render() { renderTabs(); paintSide(); if (!F.CAT) { $('#body').innerHTML = `<section class="panel">${empty('info', 'Katalog belum termuat', F.status.error || 'Server keuangan tidak merespons.')}</section>`; return; } $('#body').innerHTML = VIEW[tab](); }
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; history.replaceState(null, '', '#' + tab); render(); } });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(t => t[0] === h) && h !== tab) { tab = h; render(); } });
const res = r => { if (r.ok) toast(r.msg || 'Berhasil.'); else toast(r.error, 'error'); render(); return r; };
page.addEventListener('click', async e => {
  const t = e.target.closest('button'); if (!t || t.disabled) return;
  if (t.dataset.finish != null) { res(NE.finishNow()); return; }
  if (t.dataset.home) { res(NE.homeAction(t.dataset.home)); return; }
  if (t.dataset.eat) { res(NE.consume(t.dataset.eat)); return; }
  if (t.dataset.buy) { await buy(t.dataset.buy); render(); return; }
  if (t.dataset.homemeal != null) {
    const it = F.item('rumah-makan');
    if (E.ageYears() < 18) { res(NE.start({ kind: 'makan', label: 'Makan di rumah', min: it.min, fx: it.fx })); return; }
    await openCheckout({ merchant: 'rumah', items: [{ id: 'rumah-makan', qty: 1 }], title: 'Makan di rumah', onSuccess: () => NE.start({ kind: 'makan', label: 'Makan di rumah', min: it.min, fx: it.fx }) }); render(); return;
  }
  if (t.dataset.commute) { res(NE.setCommute(t.dataset.commute)); return; }
  if (t.dataset.cancel) { t.disabled = true; const r = await F.cancelOrder(t.dataset.cancel); res(r); return; }
  if (t.dataset.receive) {
    t.disabled = true; const r = await F.receiveOrder(t.dataset.receive);
    if (r.ok && r.items && !r.duplicate) {
      const lines = r.items.map(l => ({ ...F.item(l.id), qty: l.qty }));
      if (lines[0].merchant === 'pasarku') { for (const l of lines) NE.addInventory(l, l.qty); E.save(); toast('Barang diterima dan masuk inventori/peralatan.'); render(); return; }
      const fx = {}; for (const l of lines) for (const [k, v] of Object.entries(l.fx)) fx[k] = (fx[k] || 0) + v * l.qty;
      const min = Math.max(...lines.map(l => l.min));
      const s = NE.blockedReason() ? null : NE.start({ kind: 'makan', label: 'Makan pesanan antar', min, fx });
      if (!s) { for (const l of lines) NE.addInventory({ id: l.id, name: l.name, kind: 'konsumsi', fx: l.fx, min: l.min }, l.qty); E.save(); toast('Pesanan diterima dan disimpan di inventori (karakter sedang sibuk).'); }
      else toast(s.msg);
      render(); return;
    }
    res(r); return;
  }
  if (t.dataset.autodebit) {
    const pin = page.querySelector('[data-adpin]')?.value || ''; const gw = F.accounts('wallet').find(a => a.provider === 'gojalan');
    t.disabled = true; const r = await F.call('/api/fin/autodebit', { enable: t.dataset.autodebit === 'on', merchant: 'jalanyuk', account: gw?.id, pin }); res(r); return;
  }
});
page.addEventListener('change', e => { if (e.target.matches('[data-automeal]')) { NE.setAutoMeals(e.target.checked); toast(e.target.checked ? 'Ikut makan keluarga.' : 'Makan keluarga dimatikan — atur makan sendiri.'); } });
let last = 0;
const idle = () => !document.querySelector('dialog[open]') && !(page.contains(document.activeElement) && document.activeElement.matches('input,select,textarea'));
E.on('tick', () => { paintSide(); if (Date.now() - last > 1500 && idle()) { last = Date.now(); render(); } });
E.on('clock', () => { if (E.S.life.activity) activityPanel(); });
let rq = null; const soon = () => { clearTimeout(rq); rq = setTimeout(() => { if (idle()) { last = Date.now(); render(); } }, 120); };
E.on('change', () => { paintSide(); soon(); });
F.onUpdate(() => { if (idle()) render(); });
render();
