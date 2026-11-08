// BELANJA & ORDER CENTER — toko offline/online, keranjang, pesanan, reward. Semua angka dan status berasal dari server (/api/shop/*).
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as SH from '../engine/shop.js';
import * as SL from '../engine/seller.js';
import { mountShell } from '../ui/shell.js';
import { openShopCheckout } from '../ui/shop-checkout.js';
import { rp, icon, esc, $, toast, empty, openDialog } from '../ui/ui.js';
import { trackerHtml, animateTrackers } from '../ui/tracker.js';
import { productArt } from '../ui/product-art.js';

const page = await mountShell('shop', 'Belanja');
window.__hashNav = true;
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, F, SH };
const TABS = [['toko', 'Toko'], ['keranjang', 'Keranjang'], ['pesanan', 'Pesanan'], ['reward', 'Reward'], ['notif', 'Notifikasi']];
let tab = TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'toko';
const flt = { ch: 'semua', cat: 'semua', q: '', max: 0, sort: 'relevan', store: '' };
let ordFilter = '', SUM = null, ORD = [], REW = null, NF = null;
const CART_KEY = 'bizsim.cart.v1';
const cartKey = () => CART_KEY + ':' + (E.S?.charId || '');
const loadCart = () => { try { return JSON.parse(localStorage.getItem(cartKey()) || '[]'); } catch { return []; } };
let cart = loadCart();
const saveCart = () => { try { localStorage.setItem(cartKey(), JSON.stringify(cart)); } catch { /* opsional */ } };

page.innerHTML = `<div class="mod-band"><span class="ti">${icon('cart')}</span><div><h2>Belanja & Order Center</h2><p>Toko, kurir, dan pembayaran adalah simulasi game dengan merek fiktif. Harga, stok, status pesanan, dan bonus dihitung server.</p></div></div>
<div id="sum" class="shop-sum"></div><div class="tabs" role="tablist" id="tabs"></div><div id="body" style="margin-top:14px"></div>`;
await F.init().catch(() => {});
await SH.loadCatalog();
const CAT = () => SH.CAT;
const STORE = id => CAT().stores.find(s => s.id === id);
const PROD = id => CAT().products.find(p => p.id === id);
const MODE_ICON = { counter: 'cart', pickup: 'box', food: 'truck', parcel: 'truck', digital: 'book' };
const PAY = { paid: ['Dibayar', 'pos'], cod_pending: ['COD · belum dibayar', 'warn'], failed: ['Pembayaran gagal', 'neg'], refunded: ['Dana dikembalikan', 'info'], partially_refunded: ['Refund sebagian', 'info'], cancelled: ['Tidak ada pembayaran', ''] };
const FUL_CHIP = s => ['completed'].includes(s) ? 'pos' : ['cancelled', 'delivery_failed'].includes(s) ? 'neg' : ['returned', 'return_requested'].includes(s) ? 'warn' : ['delivered', 'ready_for_pickup'].includes(s) ? 'info' : '';
const rewardLabel = { received: ['Diterima', 'pos'], pending: ['Menunggu pesanan diterima', 'warn'], ineligible: ['Tidak memenuhi syarat', 'neg'], void: ['Dibatalkan', ''] };

function summaryHtml() {
  if (!SUM) return '';
  const n = (a) => a.length, lo = SUM.loyalty;
  return `<div class="shop-sum-row">
    <div class="sum-tile"><span>Diproses</span><b>${n(SUM.processing)}</b></div><div class="sum-tile"><span>Siap diambil</span><b>${n(SUM.ready)}</b></div>
    <div class="sum-tile"><span>Dalam pengiriman</span><b>${n(SUM.inDelivery)}</b></div><div class="sum-tile"><span>Menunggu diterima</span><b>${n(SUM.arrived)}</b></div>
    <div class="sum-tile"><span>Poin loyalitas</span><b>${lo.points}</b></div>
    <div class="sum-tile wide"><span>Pesanan terdekat</span><b>${SUM.next ? `${esc(SUM.next.store)} · ${esc(SH.whenAbs(SUM.next.eta))}` : 'Tidak ada pesanan aktif'}</b></div></div>
    ${SUM.promos.length ? `<div class="shop-promos">${SUM.promos.map(p => `<span class="chip info">${icon('star')} ${esc(p.label)}</span>`).join('')}</div>` : ''}`;
}
function tabs() {
  const nc = cart.reduce((s, l) => s + l.qty, 0), un = NF?.unread || 0;
  $('#tabs').innerHTML = TABS.map(([id, l]) => `<button role="tab" class="tab" aria-selected="${tab === id}" data-tab="${id}">${l}${id === 'keranjang' && nc ? ` <span class="chip dark">${nc}</span>` : ''}${id === 'notif' && un ? ` <span class="chip neg">${un}</span>` : ''}</button>`).join('');
}

// ——— Toko ———
const typeLabel = { makanan: 'Makanan', minuman: 'Minuman', obat: 'Obat & vitamin', kebersihan: 'Kebersihan', peralatan: 'Peralatan', buku: 'Buku', digital: 'Digital', perlengkapan: 'Perlengkapan', layanan: 'Layanan', tiket: 'Tiket' };
function productCard(p) {
  const s = STORE(p.store), open = s.openNow !== false;
  const out = p.stock != null && p.stock <= 0, inCart = cart.filter(l => l.id === p.id).reduce((a, l) => a + l.qty, 0);
  return `<article class="prod ${out ? 'off' : ''}"><div class="prod-h"><span class="ico">${icon(MODE_ICON[p.mode] || 'box')}</span><div><b>${esc(p.name)}</b><div class="muted sm">${esc(s.name)} · ${s.channel === 'online' ? 'Online' : 'Offline'}</div></div></div>
    <p class="sm muted">${esc(p.desc || '')}</p>
    ${p.bonus.length ? `<ul class="bonus-list">${p.bonus.map(b => `<li>${icon('gift')} ${esc(b.text)}</li>`).join('')}</ul>` : ''}
    <div class="prod-f"><div><b class="num">${rp(p.price)}</b>${p.variants.length > 1 ? '<div class="muted sm">Ada pilihan variasi</div>' : ''}<div class="muted sm">${p.stock == null ? 'Selalu tersedia' : out ? `${p.stockLabel} habis` : `${p.stockLabel} ${p.stock}`}</div></div>
    <div class="row" style="gap:6px">${p.variants.length > 1 ? `<select class="input sm" data-var="${p.id}">${p.variants.map(v => `<option value="${v.id}">${esc(v.label)}${v.price ? ' +' + rp(v.price) : ''}</option>`).join('')}</select>` : ''}<button class="btn sm primary" data-add="${p.id}" ${out ? 'disabled' : ''}>${icon('cart')} Tambah${inCart ? ` (${inCart})` : ''}</button></div></div>
    ${p.minAge ? `<div class="chip warn sm">Usia ${p.minAge}+</div>` : ''}</article>`;
}
function toko() {
  const C = CAT(); let list = C.products.filter(p => (flt.ch === 'semua' || STORE(p.store).channel === flt.ch) && (!flt.store || p.store === flt.store) && (flt.cat === 'semua' || p.type === flt.cat) && (!flt.max || p.price <= flt.max) && (!flt.q || (p.name + ' ' + (p.desc || '') + ' ' + STORE(p.store).name).toLowerCase().includes(flt.q.toLowerCase())));
  if (flt.sort === 'murah') list = list.slice().sort((a, b) => a.price - b.price); else if (flt.sort === 'mahal') list = list.slice().sort((a, b) => b.price - a.price); else if (flt.sort === 'rating') list = list.slice().sort((a, b) => (b.rating || 0) - (a.rating || 0));
  const types = [...new Set(C.products.map(p => p.type))];
  return `<div class="shop-filters"><label class="field"><span>Cari</span><input class="input" data-f="q" value="${esc(flt.q)}" placeholder="Nama produk atau toko"></label>
    <label class="field"><span>Saluran</span><select class="input" data-f="ch"><option value="semua">Semua</option><option value="offline" ${flt.ch === 'offline' ? 'selected' : ''}>Offline</option><option value="online" ${flt.ch === 'online' ? 'selected' : ''}>Online</option></select></label>
    <label class="field"><span>Toko</span><select class="input" data-f="store"><option value="">Semua toko</option>${C.stores.map(s => `<option value="${s.id}" ${flt.store === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select></label>
    <label class="field"><span>Jenis</span><select class="input" data-f="cat"><option value="semua">Semua</option>${types.map(t => `<option value="${t}" ${flt.cat === t ? 'selected' : ''}>${typeLabel[t] || t}</option>`).join('')}</select></label>
    <label class="field"><span>Harga maks.</span><select class="input" data-f="max">${[[0, 'Bebas'], [25000, '≤ Rp 25.000'], [100000, '≤ Rp 100.000'], [500000, '≤ Rp 500.000']].map(([v, l]) => `<option value="${v}" ${flt.max === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    <label class="field"><span>Urutkan</span><select class="input" data-f="sort">${[['relevan', 'Relevan'], ['murah', 'Termurah'], ['mahal', 'Termahal'], ['rating', 'Rating']].map(([v, l]) => `<option value="${v}" ${flt.sort === v ? 'selected' : ''}>${l}</option>`).join('')}</select></label></div>
  <div class="shop-stores">${C.stores.map(s => `<button class="chip ${flt.store === s.id ? 'dark' : ''}" data-store="${s.id}">${esc(s.name)} · ${esc(s.hoursText)}</button>`).join('')}</div>
  ${list.length ? `<div class="prod-grid">${list.map(productCard).join('')}</div>` : empty('search', 'Tidak ada produk', 'Ubah kata kunci atau filter.', '<button class="btn" data-reset>Reset filter</button>')}`;
}

// ——— Keranjang ———
function groups() {
  const g = {}; for (const l of cart) { const p = PROD(l.id); if (!p) continue; const k = p.store + '|' + (p.mode === 'pickup' ? 'counter' : p.mode); (g[k] ||= { store: p.store, mode: p.mode, lines: [] }).lines.push({ ...l, p }); } return Object.values(g);
}
function keranjang() {
  const gs = groups(); if (!gs.length) return empty('cart', 'Keranjang kosong', 'Tambahkan produk dari tab Toko. Tidak ada barang yang ditambahkan otomatis.', '<button class="btn primary" data-go="toko">Lihat toko</button>');
  return gs.map(g => { const s = STORE(g.store), est = g.lines.reduce((a, l) => a + (l.p.price + (l.p.variants.find(v => v.id === l.variant)?.price || 0)) * l.qty, 0);
    return `<section class="panel" style="margin-bottom:12px"><div class="panel-h"><h2>${esc(s.name)}</h2><span class="chip">${esc(CAT().fulfillment[g.mode]?.label || g.mode)}</span></div><div class="panel-b">
      <ul class="list">${g.lines.map(l => `<li><span style="flex:1"><b>${esc(l.p.name)}</b>${l.variant && l.p.variants.length > 1 ? ` <span class="muted">(${esc(l.p.variants.find(v => v.id === l.variant)?.label || '')})</span>` : ''}<br><span class="subtle">${rp(l.p.price)} per ${esc(l.p.stockLabel === 'slot' || l.p.stockLabel === 'kursi' ? l.p.stockLabel : 'item')}</span></span>
        <span class="row" style="gap:4px"><button class="btn sm" data-dec="${l.id}|${l.variant || ''}" aria-label="Kurangi">−</button><b class="num">${l.qty}</b><button class="btn sm" data-inc="${l.id}|${l.variant || ''}" aria-label="Tambah">+</button><button class="icon-btn" data-rm="${l.id}|${l.variant || ''}" aria-label="Hapus">${icon('trash')}</button></span></li>`).join('')}</ul>
      <div class="row between" style="margin-top:10px"><span class="muted">Subtotal perkiraan ${rp(est)} — total final (ongkir, diskon, voucher) dihitung server saat checkout.</span><button class="btn primary" data-co="${g.store}|${g.mode}">Checkout</button></div></div></section>`; }).join('');
}

// ——— Pesanan ———
const OSUB = [['', 'Semua'], ['belum_dibayar', 'Belum dibayar'], ['dikemas', 'Dikemas'], ['dikirim', 'Dikirim'], ['diantar', 'Sedang diantar'], ['tiba', 'Tiba di kota tujuan'], ['selesai', 'Selesai'], ['dibatalkan', 'Dibatalkan'], ['retur', 'Pengembalian barang']];
// Tab pesanan: marketplace dihitung server (order.tabs); pesanan toko lokal memakai pemetaan status yang sama.
const tabsOf = o => o.tabs || [{ confirmed: 'dikemas', preparing: 'dikemas', processing: 'dikemas', packed: 'dikemas', ready_for_pickup: 'selesai', handed_to_courier: 'dikirim', in_transit: 'dikirim', at_destination: 'tiba', arriving: 'diantar', delivered: 'selesai', completed: 'selesai', cancelled: 'dibatalkan', delivery_failed: 'dibatalkan', return_requested: 'retur', returned: 'retur' }[o.fulStatus] || 'dikemas', ...(o.payStatus === 'cod_pending' && !['completed', 'cancelled', 'delivery_failed', 'returned'].includes(o.fulStatus) ? ['belum_dibayar'] : [])];
const inTab = (o, k) => !k || tabsOf(o).includes(k);
function orderCard(o) {
  const pay = PAY[o.payStatus] || [o.payStatus, ''];
  const stg = o.stages.map(s => `<li class="${s.state}"><i></i><span>${esc(s.label)}</span></li>`).join('');
  return `<article class="ord"><div class="ord-h"><div><b>${esc(o.storeName)}</b> <span class="mono muted sm">${esc(o.id)}</span><div class="muted sm">${esc(SH.whenAbs(o.placedAbs))} · ${esc(o.modeLabel)}</div></div><div class="stack" style="gap:4px;align-items:flex-end"><span class="chip ${FUL_CHIP(o.fulStatus)}">${esc(o.fulLabel)}</span><span class="chip ${pay[1]}">${esc(pay[0])}</span></div></div>
    <div class="row" style="gap:10px;align-items:center">${o.lines[0]?.art ? `<span class="ord-art">${productArt(o.lines[0].art.sub, o.lines[0].art.cat)}</span>` : ''}<div class="sm" style="min-width:0">${o.market ? `<span class="ord-mk" style="background:${o.market.color}1A;color:${o.market.color}">${icon('store')}${esc(o.market.name)}</span> ` : ''}${o.lines.map(l => `${l.qty}× ${esc(l.name)}`).join(', ')}</div></div>
    ${o.tracking || ['completed', 'cancelled', 'delivery_failed', 'returned'].includes(o.fulStatus) ? '' : `<div class="bar" role="progressbar" aria-valuenow="${Math.round(o.progress)}" aria-valuemin="0" aria-valuemax="100"><i style="width:${o.progress}%"></i></div>`}
    ${o.tracking ? trackerHtml(o) : `<ol class="stg">${stg}</ol>`}
    ${o.reason ? `<div class="msg ${o.fulStatus === 'cancelled' || o.fulStatus === 'delivery_failed' ? 'error' : 'info'}">${icon('info')}<span>${esc(o.reason)}</span></div>` : ''}
    ${o.etaChanged ? `<div class="msg info">${icon('clock')}<span>Estimasi tiba berubah: ${esc(SH.whenAbs(o.eta))} (semula ${esc(SH.whenAbs(o.etaOrig))}).</span></div>` : ['completed', 'cancelled', 'delivery_failed', 'returned'].includes(o.fulStatus) || o.mode === 'digital' || o.tracking ? '' : `<div class="muted sm">Estimasi ${esc(SH.whenAbs(o.eta))}</div>`}
    <div class="row between" style="margin-top:8px"><b class="num">${rp(o.total)}</b><div class="row" style="gap:6px"><button class="btn sm" data-detail="${o.id}">Detail</button>${o.canClaim ? `<button class="btn sm primary" data-claim="${o.id}">${esc(o.claimLabel)}</button>` : ''}${o.canCancel ? `<button class="btn sm" data-cancel="${o.id}">Batalkan</button>` : ''}</div></div>
    ${o.claimNote ? `<div class="muted sm">${esc(o.claimNote)}</div>` : ''}</article>`;
}
function pesanan() {
  const list = ORD.filter(o => inTab(o, ordFilter)), cnt = k => ORD.filter(o => inTab(o, k)).length;
  return `<div class="tabs sub ordtabs" role="tablist">${OSUB.map(([k, l]) => `<button class="tab" aria-selected="${ordFilter === k}" data-ofilter="${k}">${l}${k && cnt(k) ? ` <span class="chip">${cnt(k)}</span>` : ''}</button>`).join('')}</div>
  <div style="margin-top:12px">${list.length ? list.map(orderCard).join('') : empty('box', 'Belum ada pesanan', ordFilter ? 'Tidak ada pesanan pada status ini.' : 'Pesanan yang kamu buat akan muncul di sini, dengan status nyata dari server.', '<button class="btn primary" data-go="toko">Mulai belanja</button>')}</div>`;
}
async function detail(id) {
  const r = await SH.order(id); if (!r.ok) { toast(r.error, 'error'); return; } const o = r.order, pay = PAY[o.payStatus] || [o.payStatus, ''];
  const d = openDialog(`<div class="dlg-h"><h2>Pesanan ${esc(o.id)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b" data-det>
    <div class="row between wrap"><b>${esc(o.storeName)}</b><span><span class="chip ${FUL_CHIP(o.fulStatus)}">${esc(o.fulLabel)}</span> <span class="chip ${pay[1]}">${esc(pay[0])}</span></span></div>
    ${o.tracking ? trackerHtml(o) : ''}
    ${o.market ? `<ul class="list ord-info"><li><span class="muted">Marketplace</span><b>${esc(o.market.name)}</b></li><li><span class="muted">Toko</span><b>${esc(o.seller?.name || o.storeName)}${o.seller?.city ? ' · ' + esc(o.seller.city) : ''}</b></li><li><span class="muted">Ekspedisi</span><b>${esc(o.courier.name)}</b></li>${o.vouchers?.length ? `<li><span class="muted">Voucher</span><b>${o.vouchers.map(esc).join(', ')}</b></li>` : ''}${o.cashback ? `<li><span class="muted">Cashback</span><b>${rp(o.cashback)}</b></li>` : ''}</ul>` : ''}
    <table class="table co-lines"><tbody>${o.lines.map(l => `<tr><td><div class="row" style="gap:8px;align-items:center">${l.art ? `<span class="ord-art" style="width:36px;height:36px">${productArt(l.art.sub, l.art.cat)}</span>` : ''}<span>${l.qty}× ${esc(l.name)}${l.qty > 1 || l.unit ? `<div class="muted sm">${rp(l.unit || l.price)} / unit</div>` : ''}</span></div></td><td class="num">${rp(l.total)}</td></tr>`).join('')}${o.fees.map(f => `<tr class="muted"><td>${esc(f.label)}</td><td class="num">${rp(f.amount)}</td></tr>`).join('')}${o.discounts.map(f => `<tr class="pos"><td>${esc(f.label)}</td><td class="num">−${rp(-f.amount)}</td></tr>`).join('')}<tr class="co-total"><td><b>Total</b></td><td class="num"><b>${rp(o.total)}</b></td></tr></tbody></table>
    <p class="muted sm">Dibayar lewat ${esc(o.methodLabel || "—")} · ${esc(SH.whenAbs(o.placedAbs))}. ${o.mode === 'food' || o.mode === 'parcel' ? 'Alamat: rumah karakter.' : ''}</p>
    <h3 style="margin:12px 0 6px;font-size:13px">Riwayat status</h3><ol class="tl">${o.events.map(e => `<li><span class="mono sm muted">${esc(SH.whenAbs(e.at))}</span> <b>${esc(e.label)}</b>${e.detail ? `<div class="muted sm">${esc(e.detail)}</div>` : ''}</li>`).join('')}</ol>
    ${o.rewards?.length ? `<h3 style="margin:12px 0 6px;font-size:13px">Bonus pesanan</h3><ul class="list">${o.rewards.map(w => `<li><span style="flex:1">${esc(w.label)}${w.reason ? `<div class="muted sm">${esc(w.reason)}</div>` : ''}</span><span class="chip ${rewardLabel[w.status]?.[1] || ''}">${esc(rewardLabel[w.status]?.[0] || w.status)}</span></li>`).join('')}</ul>` : ''}
    ${o.canReturn ? `<fieldset class="co-methods"><legend>Ajukan retur</legend>${(o.returnReasons?.length ? o.returnReasons.map(r => [r.id, r.label + (r.full ? ' (refund penuh)' : ' (dipotong ongkir, biaya layanan, dan Rp 8.000)')]) : [['rusak', 'Barang rusak/cacat (refund penuh)'], ['tidak_sesuai', 'Tidak sesuai pesanan (refund penuh)'], ['berubah_pikiran', 'Berubah pikiran (dipotong ongkir, biaya layanan, dan Rp 8.000)']]).map(([k, l], i) => `<label class="co-m"><input type="radio" name="rr" value="${k}" ${i === 0 ? 'checked' : ''}><span><b>${l}</b></span></label>`).join('')}<button class="btn" data-return="${o.id}">Ajukan retur</button></fieldset>` : o.returnWhy && o.mode === 'parcel' && o.fulStatus === 'delivered' ? `<p class="muted sm">${esc(o.returnWhy)}</p>` : ''}
    ${o.retInfo ? `<div class="msg ${o.retInfo.rejected ? 'error' : 'warn'}">${icon('info')}<span><b>Pengembalian:</b> ${esc(o.retInfo.label || '')}${o.retInfo.rejected ? ` — ditolak setelah pemeriksaan${o.retInfo.rejectReason ? ': ' + esc(o.retInfo.rejectReason) : ''}` : o.retInfo.amount ? ` — dana ${rp(o.retInfo.amount)} dikembalikan setelah barang diperiksa` : ''}</span></div>` : ''}
    ${o.review ? `<div class="msg info">${icon('star')}<span><b>Ulasanmu:</b> ${'★'.repeat(o.review.stars)}${'☆'.repeat(5 - o.review.stars)} ${esc(o.review.text || '')}</span></div>` : ''}${o.canReview ? `<fieldset class="co-methods" id="rv-box"><legend>Beri ulasan</legend><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(120px,1fr))">${[['stars', 'Keseluruhan'], ['quality', 'Kualitas'], ['ship', 'Pengiriman'], ['service', 'Layanan']].map(([k, l]) => `<label class="field"><span>${l}</span><select class="input" name="rv-${k}">${[5, 4, 3, 2, 1].map(n => `<option value="${n}">${'★'.repeat(n)}</option>`).join('')}</select></label>`).join('')}</div><label class="field"><span>Komentar</span><textarea class="input" name="rv-text" rows="2" maxlength="400" style="height:auto;padding:8px 10px" placeholder="Ceritakan pengalamanmu…"></textarea></label><label class="field"><span>Foto (opsional)</span><input class="input" type="file" name="rv-photo" accept="image/png,image/jpeg,image/webp" style="padding-top:6px"></label><button class="btn primary" data-review="${o.id}">Kirim ulasan</button></fieldset>` : ''}
    <div class="dlg-f">${o.canClaim ? `<button class="btn primary" data-claim="${o.id}">${esc(o.claimLabel)}</button>` : ''}${o.canCancel ? `<button class="btn" data-cancel="${o.id}">Batalkan pesanan</button>` : o.cancelWhy && !['cancelled', 'completed'].includes(o.fulStatus) ? `<span class="muted sm" style="flex:1">${esc(o.cancelWhy)}</span>` : ''}<button class="btn ghost" data-close>Tutup</button></div></div>`, {});
  animateTrackers(d); d.addEventListener('click', async e => { const rv = e.target.closest('[data-review]'); if (rv) { const g = n => d.querySelector(`[name=rv-${n}]`), body = { order: rv.dataset.review, stars: g('stars').value, quality: g('quality').value, ship: g('ship').value, service: g('service').value, text: g('text').value, idem: SL.newIdem('rv') }; const f = g('photo').files[0]; if (f) { const im = await SL.readImage(f); if (im.error) return toast(im.error, 'error'); body.photo = im.data; } rv.disabled = true; const x = await SL.money('/api/mp/review', body); toast(x.ok ? x.msg : x.error, x.ok ? 'ok' : 'error'); if (x.ok) { d.close(); await refreshAll(); } else rv.disabled = false; return; } const b = e.target.closest('[data-return]'); if (!b) return; const reason = d.querySelector('[name=rr]:checked')?.value; b.disabled = true; const x = await SH.requestReturn(b.dataset.return, reason); toast(x.ok ? x.msg : x.error, x.ok ? 'ok' : 'error'); d.close(); await refreshAll(); });
}

// ——— Reward & Notifikasi ———
function reward() {
  if (!REW) return '<div class="panel-b subtle">Memuat…</div>'; const R = REW, lo = R.loyalty;
  const groups = { received: [], pending: [], ineligible: [], void: [] }; for (const w of R.rewards) (groups[w.status] ||= []).push(w);
  const list = (k, t) => `<section class="panel"><div class="panel-h"><h2>${t}</h2><span class="chip ${rewardLabel[k][1]}">${groups[k].length}</span></div><div class="panel-b tight">${groups[k].length ? `<ul class="list">${groups[k].map(w => `<li><span style="flex:1"><b>${esc(w.label)}</b><div class="muted sm">${esc(w.source || '')}${w.reason ? ' · ' + esc(w.reason) : ''}</div></span></li>`).join('')}</ul>` : '<div class="panel-b subtle">Belum ada.</div>'}</div></section>`;
  return `<div class="grid g-2" style="gap:12px"><section class="panel"><div class="panel-h"><h2>Loyalitas</h2><span class="chip dark">${esc(lo.tier)}</span></div><div class="panel-b"><div style="font-size:26px;font-weight:700" class="num">${lo.points} poin</div><p class="subtle">1 poin per ${rp(lo.perPoint)} belanja yang sudah diterima. ${lo.next ? `Berikutnya: ${esc(lo.next.label)} di ${lo.next.at} poin (hadiah: ${esc(lo.next.reward)}).` : 'Tingkat tertinggi tercapai.'}</p></div></section>
    <section class="panel"><div class="panel-h"><h2>Voucher</h2></div><div class="panel-b tight">${R.vouchers.length ? `<ul class="list">${R.vouchers.map(v => `<li><span style="flex:1"><b>${esc(v.label)}</b><div class="muted sm">${v.store ? 'Toko ' + esc(STORE(v.store)?.name || v.store) : 'Semua toko'} · min. belanja ${rp(v.minSpend)}${v.expires ? ' · berlaku sampai ' + esc(SH.whenAbs(v.expires)) : ''}</div></span><span class="chip ${v.status === 'available' ? 'pos' : ''}">${v.status === 'available' ? 'Tersedia' : v.status === 'used' ? 'Terpakai' : 'Kedaluwarsa'}</span></li>`).join('')}</ul>` : '<div class="panel-b subtle">Belum ada voucher. Voucher didapat dari loyalitas, pencapaian, dan bonus produk.</div>'}</div></section></div>
  <div class="grid g-2" style="gap:12px;margin-top:12px">${list('received', 'Reward diterima')}${list('pending', 'Menunggu pesanan diterima')}${list('ineligible', 'Tidak memenuhi syarat')}
  <section class="panel"><div class="panel-h"><h2>Pencapaian</h2></div><div class="panel-b tight"><ul class="list">${R.achievements.map(a => `<li><span style="flex:1"><b>${esc(a.label)}</b><div class="muted sm">${a.have}/${a.need}</div></span><span class="chip ${a.earned ? 'pos' : ''}">${a.earned ? 'Diraih' : 'Belum'}</span></li>`).join('')}</ul></div></section></div>
  <p class="subtle" style="margin-top:10px">Total Knowledge XP dari belanja: ${R.knowledge}. Bonus hanya diberikan setelah pesanan benar-benar diterima, sekali per aturan.</p>`;
}
function notif() {
  if (!NF) return '<div class="panel-b subtle">Memuat…</div>';
  return `<div class="row between" style="margin-bottom:8px"><span class="muted">${NF.unread} belum dibaca</span><button class="btn sm" data-readall>Tandai semua dibaca</button></div>${NF.notifs.length ? `<ul class="list">${NF.notifs.map(n => `<li class="${n.read ? '' : 'unread'}"><span class="ic">${icon('bell')}</span><span style="flex:1"><b>${esc(n.title)}</b><div class="muted sm">${esc(n.body)}${n.kind === 'rl_msg' ? ' <a href="social.html">Buka Sosial</a>' : ''}${n.kind === 'flash' || n.kind === 'voucher' ? ' <a href="marketplace.html">Buka Marketplace</a>' : ''}${n.kind === 'pl-due' || n.kind === 'pl-late' ? ' <a href="marketplace.html">Buka PayLater</a>' : ''}</div></span><span class="muted sm">${esc(SH.whenAbs(n.at))}</span></li>`).join('')}</ul>` : empty('bell', 'Belum ada notifikasi', 'Notifikasi muncul saat status pesananmu berubah.')}`;
}

function render() {
  tabs(); $('#sum').innerHTML = summaryHtml();
  $('#body').innerHTML = { toko, keranjang, pesanan, reward, notif }[tab](); animateTrackers($('#body'));
}
async function refreshAll() {
  const [s, o, r, n] = await Promise.all([SH.summary(), SH.orders(''), tab === 'reward' ? SH.rewards() : null, SH.notifs()]);
  if (s.ok) { SUM = s; for (const f of s.fresh || []) toast(`${f.title}: ${f.body}`, 'ok'); } if (o.ok) ORD = o.orders; if (r?.ok) REW = r; if (n.ok) NF = n;
  await SH.syncGrants(); await SH.loadCatalog(true); if (idle()) render();
}
const idle = () => !document.querySelector('dialog[open]') && !(page.contains(document.activeElement) && document.activeElement.matches('input,select,textarea'));
const go = t => { tab = t; location.hash = t; refreshAll().then(render); render(); };
const addToCart = (id, variant) => { const p = PROD(id), v = variant || p.variants[0].id; const l = cart.find(x => x.id === id && (x.variant || p.variants[0].id) === v); if (l) l.qty = Math.min(20, l.qty + 1); else cart.push({ id, variant: v, qty: 1 }); saveCart(); toast(`${p.name} ditambahkan ke keranjang.`); render(); };
const keyOf = s => { const [id, variant] = s.split('|'); return cart.find(l => l.id === id && (l.variant || '') === variant); };

page.addEventListener('click', async e => {
  const t = e.target.closest('button,a'); if (!t) return;
  if (t.dataset.tab) return go(t.dataset.tab);
  if (t.dataset.go) return go(t.dataset.go);
  if (t.dataset.add) return addToCart(t.dataset.add, page.querySelector(`[data-var="${t.dataset.add}"]`)?.value);
  if (t.dataset.store) { flt.store = flt.store === t.dataset.store ? '' : t.dataset.store; return render(); }
  if ('reset' in t.dataset) { Object.assign(flt, { ch: 'semua', cat: 'semua', q: '', max: 0, sort: 'relevan', store: '' }); return render(); }
  if (t.dataset.inc) { const l = keyOf(t.dataset.inc); if (l) l.qty = Math.min(20, l.qty + 1); saveCart(); return render(); }
  if (t.dataset.dec) { const l = keyOf(t.dataset.dec); if (l) { l.qty--; if (l.qty <= 0) cart = cart.filter(x => x !== l); } saveCart(); return render(); }
  if (t.dataset.rm) { const l = keyOf(t.dataset.rm); cart = cart.filter(x => x !== l); saveCart(); return render(); }
  if (t.dataset.co) {
    const [store, mode] = t.dataset.co.split('|'), g = groups().find(x => x.store === store && x.mode === mode); if (!g) return;
    const eff = mode === 'pickup' ? 'counter' : mode;
    await openShopCheckout({ store, mode: eff, items: g.lines.map(l => ({ id: l.id, variant: l.variant, qty: l.qty })), title: `Checkout ${STORE(store).name}`, onDone: () => { cart = cart.filter(l => !g.lines.some(x => x.id === l.id && x.variant === l.variant)); saveCart(); go('pesanan'); } });
    return;
  }
  if (t.dataset.ofilter !== undefined) { ordFilter = t.dataset.ofilter; return render(); }
  if (t.dataset.detail) return detail(t.dataset.detail);
  if (t.dataset.claim || t.dataset.cancel) {
    const claim = !!t.dataset.claim, id = t.dataset.claim || t.dataset.cancel; t.disabled = true;
    const r = await (claim ? SH.claim(id) : SH.cancel(id)); toast(r.ok ? r.msg : r.error, r.ok ? 'ok' : 'error');
    document.querySelectorAll('dialog[open]').forEach(d => d.close()); await refreshAll(); render(); return;
  }
  if ('readall' in t.dataset) { await SH.readNotifs(); await refreshAll(); render(); }
});
page.addEventListener('input', e => { if (e.target.dataset.f === 'q') { flt.q = e.target.value; const pos = e.target.selectionStart; render(); const el = page.querySelector('[data-f=q]'); el?.focus(); el?.setSelectionRange(pos, pos); } });
page.addEventListener('change', e => { const f = e.target.dataset.f; if (!f || f === 'q') return; flt[f] = f === 'max' ? Number(e.target.value) : e.target.value; render(); });
window.addEventListener('hashchange', () => { const h = location.hash.slice(1); if (TABS.some(x => x[0] === h) && h !== tab) { tab = h; render(); refreshAll(); } });
setInterval(() => { if (!document.hidden && idle()) refreshAll(); }, 4000);
E.on('change', () => { if (idle() && tab === 'toko') return; });
await refreshAll(); render();
