// SELLER CENTER — pemain membuka toko di marketplace BizSim. Semua angka/status dari server (/api/sell/*, /api/aff/*, /api/chat/*).
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as S from '../engine/seller.js';
import * as SH from '../engine/shop.js';
import { mountShell } from '../ui/shell.js';
import { productArt } from '../ui/product-art.js';
import { rp, rpShort, icon, esc, $, $$, toast, empty, openDialog, barChart } from '../ui/ui.js';

const page = await mountShell('seller', 'Seller Center');
window.__hashNav = true;
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, F, S };
await F.init().catch(() => {});
const TABS = [['dasbor', 'Dasbor'], ['produk', 'Produk'], ['pesanan', 'Pesanan'], ['promosi', 'Promosi'], ['voucher', 'Voucher'], ['ulasan', 'Ulasan'], ['chat', 'Chat'], ['pelanggan', 'Pelanggan'], ['affiliate', 'Affiliate']];
let tab = TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'dasbor';
let ME = null, ordFilter = '', chatId = '';
const SUBS = {};
const errBox = r => `<div class="msg error">${icon('alert')}<span>${esc(r?.error || 'Terjadi kesalahan.')}</span></div>`;
const absTxt = abs => SH.whenAbs(abs);
const STCHIP = { baru: 'warn', dikemas: 'info', dikirim: 'info', terkirim: 'info', selesai: 'pos', dibatalkan: 'neg', retur: 'warn', refund: 'neg' };

page.innerHTML = `<div class="mod-band"><span class="ti">${icon('store')}</span><div><h2>Seller Center</h2><p>Buka tokomu di marketplace fiktif BizSim. Pembeli, ongkir, dan hasil penjualan adalah simulasi; saldo dan pembayaran memakai Keuangan yang sama.</p></div></div>
<div class="tabs" role="tablist" id="tabs"></div><div id="body" style="margin-top:14px"></div>`;

async function boot() {
  const r = await S.rd('/api/sell/me'); if (!r.ok) { $('#body').innerHTML = errBox(r); return; }
  ME = r; if (!ME.shop) { $('#tabs').innerHTML = ''; return viewOpen(); }
  renderTabs(); render();
}
function renderTabs() { $('#tabs').innerHTML = TABS.map(([id, l]) => `<button role="tab" class="tab" aria-selected="${tab === id}" data-tab="${id}">${l}</button>`).join(''); }
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (!b) return; tab = b.dataset.tab; history.replaceState(null, '', '#' + tab); renderTabs(); render(); });
async function render() {
  const el = $('#body'); el.innerHTML = `<div class="stack"><div class="skel" style="height:80px"></div><div class="skel" style="height:80px"></div></div>`;
  const fn = { dasbor: viewDash, produk: viewProd, pesanan: viewOrders, promosi: viewPromo, voucher: viewVoucher, ulasan: viewReviews, chat: viewChat, pelanggan: viewCust, affiliate: viewAff }[tab];
  try { await fn(); } catch (e) { console.error(e); el.innerHTML = errBox({ error: 'Gagal memuat bagian ini.' }); }
}
const catName = id => ME.categories.find(c => c.id === id)?.label || id;
const opts = (arr, sel, f = x => [x.id, x.label || x.name]) => arr.map(x => { const [v, l] = f(x); return `<option value="${esc(v)}" ${v === sel ? 'selected' : ''}>${esc(l)}</option>`; }).join('');
const tile = (l, v, sub = '') => `<div class="sum-tile"><span>${l}</span><b>${v}</b>${sub ? `<small class="subtle">${sub}</small>` : ''}</div>`;

// ——— buka / ubah toko ———
function shopForm(sh) {
  const s = sh || {};
  return `<form id="shop-form" class="stack"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))">
    <label class="field"><span>Nama toko</span><input class="input" name="name" maxlength="40" value="${esc(s.name || '')}" required></label>
    <label class="field"><span>Kategori utama</span><select class="input" name="cat">${opts(ME.categories, s.cat)}</select></label>
    <label class="field"><span>Kota</span><select class="input" name="city">${opts(ME.cities, s.city, c => [c, c])}</select></label>
    <label class="field"><span>Alamat toko</span><input class="input" name="address" maxlength="120" value="${esc(s.address || '')}" required></label></div>
    <label class="field"><span>Deskripsi toko</span><textarea class="input" name="descr" rows="2" maxlength="300" style="height:auto;padding:8px 10px">${esc(s.descr || '')}</textarea></label>
    <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(220px,1fr))"><label class="field"><span>Logo toko (PNG/JPEG/WebP)</span><input class="input" type="file" name="logo" accept="image/png,image/jpeg,image/webp" style="padding-top:6px"></label>
    <label class="field"><span>Pencairan hasil penjualan</span><select class="input" name="payout"><option value="cash" ${(s.payout || 'cash') === 'cash' ? 'selected' : ''}>Uang tunai</option>${ME.accounts.map(a => `<option value="${a.id}" ${s.payout === a.id ? 'selected' : ''}>${esc(a.label)}</option>`).join('')}</select></label></div>
    <div class="row" style="gap:8px"><button class="btn primary" type="submit">${sh ? 'Simpan perubahan' : 'Buka toko'}</button></div></form>`;
}
async function submitShop(form, creating) {
  const fd = new FormData(form), b = Object.fromEntries(['name', 'cat', 'city', 'address', 'descr', 'payout'].map(k => [k, fd.get(k)]));
  const f = form.elements.logo.files[0]; if (f) { const im = await S.readImage(f, 256); if (im.error) return toast(im.error, 'error'); b.logo = im.data; }
  const r = await S.act('/api/sell/shop', b); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); await boot();
}
function viewOpen() {
  const el = $('#body');
  if (!ME.canOpen) { el.innerHTML = `<div class="msg warn">${icon('lock')}<span>Pembuka toko minimal berusia ${ME.minAge} tahun. Karaktermu belum memenuhi syarat.</span></div>`; return; }
  el.innerHTML = `<div class="panel"><div class="panel-h"><h2>Buka tokomu</h2></div><div class="panel-b">${shopForm(null)}<p class="subtle sm" style="margin-top:10px">Komisi marketplace: ${ME.markets.map(m => `${esc(m.name)} ${(m.commission * 100).toFixed(1).replace('.0', '')}%`).join(' · ')}.</p></div></div>`;
  $('#shop-form').addEventListener('submit', e => { e.preventDefault(); submitShop(e.target, true); });
}

// ——— dasbor ———
async function viewDash() {
  const [r, pr] = await Promise.all([S.rd('/api/sell/dashboard'), S.rd('/api/sell/products')]); if (!r.ok) return $('#body').innerHTML = errBox(r);
  const t = r.totals, sh = r.shop;
  $('#body').innerHTML = `<div class="panel"><div class="panel-b row" style="gap:12px;align-items:center">${sh.logo ? `<img src="${sh.logo}" alt="" width="48" height="48" style="border-radius:10px;object-fit:cover">` : `<span class="ti" style="width:48px;height:48px">${icon('store')}</span>`}
    <div style="flex:1;min-width:0"><b>${esc(sh.name)}</b><div class="subtle sm">${esc(sh.city)} · ${esc(catName(sh.cat))} · Reputasi ${r.rep}/100 · ${r.rating ? `Rating ${r.rating} (${r.ratingN})` : 'Belum ada ulasan'}</div></div><button class="btn sm" data-act="shop-edit">${icon('settings', 'width="14" height="14"')} Ubah</button></div></div>
    <div class="shop-sum-row" style="margin-top:12px">${tile('Penjualan', rp(t.sales))}${tile('Pendapatan bersih', rp(t.revenue), 'pesanan selesai')}${tile('Laba', rp(t.profit))}${tile('Pesanan masuk', t.incoming)}${tile('Dikirim', t.shipping)}${tile('Retur', t.returns)}${tile('Produk aktif', t.activeProducts)}${tile('Batal', t.cancelRate + '%')}</div>
    ${t.pending ? `<p class="subtle sm">Dana tertahan dari pesanan berjalan: ${rp(t.pending)} (cair setelah pembeli menerima).</p>` : ''}
    ${t.outOfStock.length ? `<div class="msg warn" style="margin-top:8px">${icon('alert')}<span>Stok habis: ${t.outOfStock.map(x => esc(x.name)).join(', ')}. Produk tanpa stok tidak tampil.</span></div>` : ''}
    <div class="panel" style="margin-top:12px"><div class="panel-h"><h2>Penjualan 14 hari</h2></div><div class="panel-b"><div id="ch14"></div></div></div>
    <div class="panel" style="margin-top:12px"><div class="panel-h"><h2>Produk terlaris</h2></div><div class="panel-b tight">${r.best.length ? `<table class="table"><tbody>${r.best.map(b => `<tr><td>${esc(b.name)}</td><td class="num">${b.qty} terjual</td><td class="num">${rp(b.gross)}</td></tr>`).join('')}</tbody></table>` : `<div class="panel-b subtle">Belum ada penjualan.</div>`}</div></div>`;
  barChart($('#ch14'), r.chart.map(d => ({ label: String(d.day), value: d.gross })), { height: 150 });
  $('[data-act=shop-edit]').onclick = () => { const d = openDialog(`<div class="dlg-h"><h3>Ubah toko</h3></div><div class="dlg-b">${shopForm(ME.shop)}</div>`, { onMount: d => d.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); await submitShop(e.target, false); d.close(); }) }); };
}

// ——— produk ———
const subcats = () => ME.categories.flatMap(c => (c.subs || []).map(([id, l]) => ({ id, label: `${c.label} · ${l}` })));
async function viewProd() {
  const r = await S.rd('/api/sell/products'); if (!r.ok) return $('#body').innerHTML = errBox(r);
  $('#body').innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="subtle sm">${r.items.length}/40 produk</span><button class="btn primary sm" data-act="prod-new">${icon('plus', 'width="14" height="14"')} Tambah produk</button></div>
    ${r.items.length ? `<div class="stack">${r.items.map(p => `<article class="panel"><div class="panel-b row" style="gap:12px;align-items:flex-start"><span class="ord-art" style="width:56px;height:56px;flex:none">${p.photo ? `<img src="${p.photo}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:8px">` : productArt(p.sub, p.cat)}</span>
      <div style="flex:1;min-width:0"><b>${esc(p.name)}</b> ${p.active ? '' : '<span class="chip neg">Nonaktif</span>'}${p.stock <= 0 ? ' <span class="chip warn">Stok habis</span>' : ''}
      <div class="subtle sm">${rp(p.promo && p.promo < p.price ? p.promo : p.price)}${p.promo && p.promo < p.price ? ` <s>${rp(p.price)}</s>` : ''} · modal ${rp(p.cost)} · stok ${p.stock} · terjual ${p.sold}${p.rating ? ` · ★ ${p.rating} (${p.ratingN})` : ''}</div>
      <div class="subtle sm">${p.markets.map(m => esc(ME.markets.find(x => x.id === m)?.name || m)).join(', ')} · kualitas ${p.quality}/5 · harga acuan pasar ${rp(p.ref)}${p.nego ? ' · nego diizinkan' : ''}</div>
      <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="prod-edit" data-id="${p.id}">Ubah</button><button class="btn sm" data-act="prod-stock" data-id="${p.id}">Stok</button><button class="btn sm" data-act="prod-toggle" data-id="${p.id}">${p.active ? 'Nonaktifkan' : 'Aktifkan'}</button><button class="btn sm ghost" data-act="prod-del" data-id="${p.id}">Hapus</button></div></div></div></article>`).join('')}</div>` : empty('box', 'Belum ada produk', 'Tambahkan produk pertama: harga, modal, stok, foto, dan marketplace tujuan.')}`;
  SUBS.prods = r.items;
}
function payFields() {
  const acc = F.accounts().filter(a => ['bank', 'wallet'].includes(a.kind) && a.status === 'aktif');
  return `<fieldset class="co-methods"><legend>Bayar stok dari</legend><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><label class="field"><span>Sumber dana</span><select class="input" name="src"><option value="cash">Uang tunai</option>${acc.map(a => `<option value="${a.id}">${esc(a.name || a.label || a.id)}</option>`).join('')}</select></label>
  <label class="field"><span>PIN transaksi (jika rekening)</span><input class="input" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></label></div></fieldset>`;
}
const payBody = f => { const src = f.elements.src.value; return src === 'cash' ? { method: 'cash' } : { method: 'saldo', source: src, pin: f.elements.pin.value }; };
function prodForm(p) {
  const s = p || { variants: [], markets: [ME.markets[0].id] };
  return `<form id="prod-form" class="stack"><label class="field"><span>Nama produk</span><input class="input" name="name" maxlength="80" value="${esc(s.name || '')}" required></label>
  <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(200px,1fr))"><label class="field"><span>Kategori</span><select class="input" name="sub">${opts(subcats(), s.sub)}</select></label><label class="field"><span>Merek</span><input class="input" name="brand" maxlength="40" value="${esc(s.brand || '')}"></label>
  <label class="field"><span>Harga jual (Rp)</span><input class="input" name="price" inputmode="numeric" value="${s.price || ''}" required></label><label class="field"><span>Harga promo (opsional)</span><input class="input" name="promo" inputmode="numeric" value="${s.promo || ''}"></label>
  <label class="field"><span>Harga modal / satuan (Rp)</span><input class="input" name="cost" inputmode="numeric" value="${s.cost ?? ''}" required></label>${p ? '' : `<label class="field"><span>Stok awal</span><input class="input" name="stock" inputmode="numeric" value="10"></label>`}
  <label class="field"><span>Berat (gram)</span><input class="input" name="weight" inputmode="numeric" value="${s.weight || 500}"></label><label class="field"><span>Dimensi p×l×t (cm)</span><input class="input" name="dim" value="${esc(s.dim || '20×10×5')}"></label>
  <label class="field"><span>Kondisi</span><select class="input" name="cond"><option value="baru" ${s.cond !== 'bekas' ? 'selected' : ''}>Baru</option><option value="bekas" ${s.cond === 'bekas' ? 'selected' : ''}>Bekas</option></select></label><label class="field"><span>Foto produk</span><input class="input" type="file" name="photo" accept="image/png,image/jpeg,image/webp" style="padding-top:6px"></label></div>
  <label class="field"><span>Deskripsi</span><textarea class="input" name="descr" rows="3" maxlength="500" style="height:auto;padding:8px 10px" required>${esc(s.descr || '')}</textarea></label>
  <label class="field"><span>Variasi (satu per baris: nama | tambahan harga)</span><textarea class="input" name="variants" rows="2" style="height:auto;padding:8px 10px">${esc((s.variants || []).map(v => `${v.label} | ${v.price || 0}`).join('\n'))}</textarea></label>
  <fieldset class="co-methods"><legend>Tayang di marketplace</legend><div class="row" style="gap:12px;flex-wrap:wrap">${ME.markets.map(m => `<label class="row" style="gap:6px"><input type="checkbox" name="mk" value="${m.id}" ${s.markets.includes(m.id) ? 'checked' : ''}> ${esc(m.name)} <span class="subtle sm">komisi ${(m.commission * 100).toFixed(1).replace('.0', '')}%</span></label>`).join('')}</div></fieldset>
  <label class="row" style="gap:6px"><input type="checkbox" name="nego" ${s.nego ? 'checked' : ''}> Izinkan tawar-menawar lewat chat</label>
  ${p ? '' : payFields()}<div class="dlg-f"><button class="btn" type="button" data-close>Batal</button><button class="btn primary" type="submit">${p ? 'Simpan' : 'Tayangkan'}</button></div></form>`;
}
async function prodBody(f, creating) {
  const b = { name: f.elements.name.value, sub: f.elements.sub.value, brand: f.elements.brand.value, price: f.elements.price.value, promo: f.elements.promo.value || 0, cost: f.elements.cost.value, weight: f.elements.weight.value, dim: f.elements.dim.value, cond: f.elements.cond.value, descr: f.elements.descr.value, nego: f.elements.nego.checked, markets: $$('[name=mk]:checked', f).map(x => x.value),
    variants: f.elements.variants.value.split('\n').map(l => l.trim()).filter(Boolean).map(l => { const [a, c] = l.split('|'); return { label: (a || '').trim(), price: Number((c || '0').replace(/\D/g, '')) || 0 }; }) };
  const ph = f.elements.photo.files[0]; if (ph) { const im = await S.readImage(ph); if (im.error) { toast(im.error, 'error'); return null; } b.photo = im.data; }
  if (creating) { b.stock = f.elements.stock.value; Object.assign(b, payBody(f), { idem: S.newIdem('sp') }); }
  return b;
}

// ——— pesanan ———
const OSUB = [['', 'Semua'], ['baru', 'Baru'], ['dikemas', 'Dikemas'], ['dikirim', 'Dikirim'], ['terkirim', 'Terkirim'], ['selesai', 'Selesai'], ['retur', 'Retur'], ['refund', 'Refund'], ['dibatalkan', 'Batal']];
async function viewOrders() {
  const r = await S.rd('/api/sell/orders' + (ordFilter ? `?status=${ordFilter}` : '')); if (!r.ok) return $('#body').innerHTML = errBox(r);
  $('#body').innerHTML = `<div class="tabs sub ordtabs" role="tablist">${OSUB.map(([k, l]) => `<button class="tab" aria-selected="${ordFilter === k}" data-of="${k}">${l}${k && r.counts[k] ? ` <span class="chip">${r.counts[k]}</span>` : ''}</button>`).join('')}</div>
  <div class="stack" style="margin-top:10px">${r.orders.length ? r.orders.map(o => `<article class="panel"><div class="panel-b"><div class="row" style="justify-content:space-between;gap:8px;align-items:flex-start"><div style="min-width:0"><b>${o.qty}× ${esc(o.name)}</b>${o.variant ? ` <span class="subtle sm">(${esc(o.variant)})</span>` : ''}<div class="subtle sm">${esc(o.buyer)} · ${esc(o.city)} · ${esc(o.marketName || '')}</div></div><span class="chip ${STCHIP[o.status] || ''}">${esc(o.statusLabel)}</span></div>
    <div class="subtle sm" style="margin-top:4px">Bruto ${rp(o.gross)} · biaya ${rp(o.fee)}${o.voucher ? ` · voucher −${rp(o.voucher)}` : ''} · bersih ${rp(o.net)} · laba ${rp(o.profit)}${o.resi ? ` · resi ${esc(o.resi)}` : ''}</div>
    ${o.deadline && ['baru', 'dikemas'].includes(o.status) ? `<div class="subtle sm">Batas proses: ${absTxt(o.deadline)}</div>` : ''}
    ${o.ret ? `<div class="msg warn" style="margin-top:6px">${icon('info')}<span><b>Retur:</b> ${esc(o.ret.reasonLabel || o.ret.reason)} — ${esc(o.ret.history?.at(-1)?.text || o.ret.stage)}</span></div>` : ''}
    <div class="row" style="gap:6px;margin-top:8px;flex-wrap:wrap"><button class="btn sm" data-act="ord-open" data-id="${o.id}">Detail</button>
    ${o.status === 'baru' ? `<button class="btn sm primary" data-act="ord-pack" data-id="${o.id}">Kemas</button><button class="btn sm ghost" data-act="ord-cancel" data-id="${o.id}">Batalkan</button>` : ''}${o.status === 'dikemas' ? `<button class="btn sm primary" data-act="ord-ship" data-id="${o.id}">Kirim</button><button class="btn sm ghost" data-act="ord-cancel" data-id="${o.id}">Batalkan</button>` : ''}
    ${o.status === 'retur' && o.ret?.stage === 'diajukan' ? `<button class="btn sm buy" data-act="ret-ok" data-id="${o.id}">Setujui retur</button><button class="btn sm danger" data-act="ret-no" data-id="${o.id}">Tolak</button>` : ''}</div></div></article>`).join('') : empty('box', 'Belum ada pesanan', 'Pesanan dari pembeli muncul di sini saat produkmu tayang dan stok tersedia.')}</div>`;
}
async function orderDetail(id) {
  const r = await S.rd('/api/sell/order/' + id); if (!r.ok) return toast(r.error, 'error'); const o = r.order;
  openDialog(`<div class="dlg-h"><h3>${esc(o.name)}</h3></div><div class="dlg-b"><p class="subtle sm">${esc(o.buyer)} · ${esc(o.city)} · ${esc(o.statusLabel)}</p><ol class="timeline" style="padding-left:18px;margin:8px 0">${r.events.map(e => `<li><b>${absTxt(e.abs)}</b> — ${esc(e.text)}</li>`).join('') || '<li class="subtle">Belum ada riwayat.</li>'}</ol>
  <table class="sum"><tr><td>Harga satuan</td><td>${rp(o.unit)}</td></tr><tr><td>Bruto</td><td>${rp(o.gross)}</td></tr><tr class="muted"><td>Biaya marketplace</td><td>−${rp(o.fee)}</td></tr>${o.voucher ? `<tr class="muted"><td>Voucher toko</td><td>−${rp(o.voucher)}</td></tr>` : ''}<tr class="muted"><td>Modal</td><td>−${rp(o.cost)}</td></tr><tr><td><b>Laba</b></td><td><b>${rp(o.profit)}</b></td></tr></table></div><div class="dlg-f"><button class="btn" data-close>Tutup</button></div>`);
}
function shipDialog(id) {
  openDialog(`<div class="dlg-h"><h3>Pilih ekspedisi</h3></div><form class="dlg-b stack" id="ship-f"><div class="cour-list">${ME.couriers.map((c, i) => `<label class="pm cour"><input type="radio" name="courier" value="${c.id}" ${i === 0 ? 'checked' : ''}><span><b>${esc(c.name)}</b></span></label>`).join('')}</div><p class="subtle sm">Ekspedisi menentukan kecepatan dan risiko gagal kirim; ada batas berat dan jarak. Ongkir ditanggung pembeli.</p><div class="dlg-f"><button class="btn" type="button" data-close>Batal</button><button class="btn primary" type="submit">Kirim paket</button></div></form>`,
    { onMount: d => d.querySelector('form').addEventListener('submit', async e => { e.preventDefault(); const r = await S.act(`/api/sell/order/${id}/ship`, { courier: e.target.courier.value }); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); d.close(); render(); }) });
}

// ——— promosi (influencer + kampanye) ———
async function viewPromo() {
  const [inf, camps, prods, promos] = await Promise.all([S.rd('/api/sell/influencers'), S.rd('/api/sell/campaigns'), S.rd('/api/sell/products'), S.rd('/api/sell/promos')]); if (!inf.ok) return $('#body').innerHTML = errBox(inf);
  SUBS.inf = inf; SUBS.prods = prods.items || [];
  $('#body').innerHTML = `<div class="panel"><div class="panel-h"><h2>Endorsement influencer</h2></div><div class="panel-b"><div class="stack">${inf.influencers.map(i => `<div class="row" style="gap:10px;align-items:center;justify-content:space-between"><div style="min-width:0"><b>${esc(i.name)}</b> <span class="chip">${esc(i.cat || 'umum')}</span><div class="subtle sm">${(i.followers).toLocaleString('id-ID')} pengikut · engagement ${(i.er * 100).toFixed(1)}% · reputasi ${i.reputation}/100 · mulai ${rp(Math.min(...Object.values(i.rates)))}</div></div><button class="btn sm" data-act="camp-new" data-id="${i.id}">Pilih</button></div>`).join('')}</div></div></div>
    <div class="panel" style="margin-top:12px"><div class="panel-h"><h2>Kampanye</h2></div><div class="panel-b tight">${camps.items?.length ? `<div class="stack" style="padding:12px">${camps.items.map(c => `<div><b>${esc(c.influencer?.name || '')}</b> — ${esc(c.typeLabel)} · ${esc(c.prodName)} <span class="chip ${c.status === 'berjalan' ? 'info' : 'pos'}">${esc(c.status)}</span><div class="subtle sm">Biaya ${rp(c.cost)} · ${c.days} hari${c.result?.orders != null ? ` · hasil: ${c.result.orders} pesanan, ${(c.result.views || 0).toLocaleString('id-ID')} tayangan` : ''}${c.result?.flop ? ' · kampanye kurang berhasil' : ''}</div></div>`).join('')}</div>` : `<div class="panel-b subtle">Belum ada kampanye.</div>`}</div></div>
    ${promos.items?.length ? `<div class="panel" style="margin-top:12px"><div class="panel-h"><h2>Dipromosikan pihak lain</h2></div><div class="panel-b tight"><table class="table"><tbody>${promos.items.map(x => `<tr><td>${esc(x.prod)}</td><td>${esc(x.who)}</td><td class="num">+${x.boost}% permintaan</td></tr>`).join('')}</tbody></table></div></div>` : ''}`;
}
function campDialog(infId) {
  const inf = SUBS.inf.influencers.find(i => i.id === infId), P = SUBS.prods.filter(p => p.active && p.stock > 0); if (!P.length) return toast('Butuh produk aktif dengan stok untuk dipromosikan.', 'error');
  const types = SUBS.inf.types;
  openDialog(`<div class="dlg-h"><h3>Endorsement ${esc(inf.name)}</h3></div><form class="dlg-b stack" id="camp-f"><label class="field"><span>Produk</span><select class="input" name="prod">${opts(P, '', p => [p.id, p.name])}</select></label>
  <label class="field"><span>Jenis konten</span><select class="input" name="type">${Object.entries(types).map(([k, t]) => `<option value="${k}">${esc(t.label)} · ${rp(inf.rates[k])} (${t.days[0]}–${t.days[1]} hari)</option>`).join('')}</select></label><label class="field"><span>Durasi (hari)</span><input class="input" name="days" inputmode="numeric" value="3"></label>
  <div id="camp-prev" class="msg info">${icon('info')}<span>Pilih opsi untuk melihat perkiraan.</span></div>${payFields()}<div class="dlg-f"><button class="btn" type="button" data-close>Batal</button><button class="btn primary" type="submit">Mulai kampanye</button></div></form>`, { onMount: d => {
    const f = d.querySelector('form'), body = () => ({ prod: f.prod.value, influencer: infId, type: f.type.value, days: f.days.value });
    const prev = async () => { const r = await S.act('/api/sell/campaign/preview', body()); $('#camp-prev', d).innerHTML = r.ok ? `${icon('info')}<span>Biaya <b>${rp(r.cost)}</b>. Perkiraan: ${r.expected.views.toLocaleString('id-ID')} tayangan, ±${r.expected.orders} pesanan, laba ${rp(r.expected.profit)}. ${esc(r.note)}</span>` : `${icon('alert')}<span>${esc(r.error)}</span>`; };
    f.addEventListener('change', prev); prev();
    f.addEventListener('submit', async e => { e.preventDefault(); const r = await S.money('/api/sell/campaign', { ...body(), ...payBody(f), idem: S.newIdem('camp') }); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); d.close(); render(); }); } });
}

// ——— voucher, ulasan, pelanggan ———
async function viewVoucher() {
  const r = await S.rd('/api/sell/vouchers'); if (!r.ok) return $('#body').innerHTML = errBox(r);
  $('#body').innerHTML = `<div class="row" style="justify-content:space-between;margin-bottom:10px"><span class="subtle sm">Biaya diskon voucher ditanggung tokomu.</span><button class="btn primary sm" data-act="vc-new">${icon('plus', 'width="14" height="14"')} Buat voucher</button></div>
  ${r.items.length ? `<div class="stack">${r.items.map(v => `<div class="panel"><div class="panel-b row" style="justify-content:space-between;gap:8px"><div><b>${esc(v.code)}</b> ${v.active ? '' : '<span class="chip neg">Nonaktif</span>'}<div class="subtle sm">${v.kind === 'percent' ? v.value + '%' : rp(v.value)}${v.max ? ` maks ${rp(v.max)}` : ''} · min belanja ${rp(v.min)} · terpakai ${v.used}/${v.quota} · sampai hari ${v.untilDay}</div></div><button class="btn sm" data-act="vc-toggle" data-id="${v.id}">${v.active ? 'Matikan' : 'Aktifkan'}</button></div></div>`).join('')}</div>` : empty('tag', 'Belum ada voucher', 'Buat voucher toko untuk menarik pembeli.')}`;
}
async function viewReviews() {
  const r = await S.rd('/api/sell/reviews'); if (!r.ok) return $('#body').innerHTML = errBox(r);
  $('#body').innerHTML = r.items.length ? `<div class="stack">${r.items.map(v => `<div class="panel"><div class="panel-b"><b>${'★'.repeat(v.stars)}${'☆'.repeat(5 - v.stars)}</b> <span class="subtle sm">${esc(v.prodName || '')} · ${esc(v.buyer)}</span><p style="margin:4px 0">${esc(v.text)}</p><div class="subtle sm">Kualitas ${v.quality} · Pengiriman ${v.ship} · Layanan ${v.service}</div>
    ${v.reply ? `<div class="msg info" style="margin-top:6px">${icon('chat')}<span><b>Balasan toko:</b> ${esc(v.reply)}</span></div>` : `<form class="row" data-reply="${v.id}" style="gap:6px;margin-top:8px"><input class="input" name="t" maxlength="200" placeholder="Balas ulasan…"><button class="btn sm primary">Kirim</button></form>`}</div></div>`).join('')}</div>` : empty('star', 'Belum ada ulasan', 'Ulasan muncul setelah pembeli menerima pesanan.');
}
async function viewCust() {
  const r = await S.rd('/api/sell/customers'); if (!r.ok) return $('#body').innerHTML = errBox(r);
  $('#body').innerHTML = r.items.length ? `<div class="panel"><div class="panel-b tight"><table class="table"><thead><tr><th>Pelanggan</th><th>Kota</th><th class="num">Pesanan</th><th class="num">Belanja</th></tr></thead><tbody>${r.items.map(c => `<tr><td>${esc(c.buyer)}</td><td>${esc(c.city)}</td><td class="num">${c.orders}</td><td class="num">${rp(c.spent)}</td></tr>`).join('')}</tbody></table></div></div>` : empty('user', 'Belum ada pelanggan', 'Pelanggan tercatat dari pesanan yang masuk.');
}

// ——— chat ———
async function viewChat() {
  if (chatId) return viewThread();
  const r = await S.rd('/api/chat/threads'); if (!r.ok) return $('#body').innerHTML = errBox(r);
  $('#body').innerHTML = r.threads.length ? `<div class="stack">${r.threads.map(t => `<button class="panel" style="text-align:left;width:100%;cursor:pointer" data-act="chat-open" data-id="${t.id}"><div class="panel-b"><div class="row" style="justify-content:space-between"><b>${esc(t.title)}</b>${t.unread ? '<span class="chip neg">Baru</span>' : t.pending ? '<span class="chip warn">Belum dibalas</span>' : ''}</div><div class="subtle sm" style="margin-top:2px">${esc(t.last?.text || '')}</div></div></button>`).join('')}</div>` : empty('chat', 'Belum ada percakapan', 'Pembeli menghubungimu saat bertanya soal pengiriman, menawar harga, atau menyampaikan keluhan. Balas dalam 2 hari agar reputasi toko terjaga.');
}
async function viewThread() {
  const r = await S.rd('/api/chat/' + chatId); if (!r.ok) { chatId = ''; return viewChat(); }
  $('#body').innerHTML = `<button class="btn sm ghost" data-act="chat-back">← Semua percakapan</button><div class="panel" style="margin-top:8px"><div class="panel-h"><h2>${esc(r.thread.title)}</h2></div><div class="panel-b"><div class="chat-log">${r.messages.map(m => `<div class="chat-msg ${m.who === 'me' ? 'me' : 'them'}"><span>${esc(m.text)}</span><small>${absTxt(m.abs)}</small></div>`).join('')}</div>
  ${r.quick.length ? `<div class="row" style="gap:6px;flex-wrap:wrap;margin:10px 0">${r.quick.map(q => `<button class="btn sm" data-act="chat-quick" data-k="${q.k}">${esc(q.l)}</button>`).join('')}</div>` : ''}
  <form class="row" id="chat-f" style="gap:6px"><input class="input" name="t" maxlength="300" placeholder="Tulis balasan sopan…"><button class="btn primary">Kirim</button></form></div></div>`;
  SUBS.meta = r.meta; const lg = $('.chat-log'); if (lg) lg.scrollTop = lg.scrollHeight;
}
async function sendChat(body) { const r = await S.money('/api/chat/' + chatId + '/send', { ...body, idem: S.newIdem('ch') }); if (!r.ok) return toast(r.error, 'error'); if (r.effect) toast(typeof r.effect === 'string' ? r.effect : 'Terkirim.'); render(); }

// ——— affiliate ———
async function viewAff() {
  const r = await S.rd('/api/aff/me'); if (!r.ok) return $('#body').innerHTML = errBox(r);
  if (!r.joined) { $('#body').innerHTML = `<div class="panel"><div class="panel-b stack"><p>Program affiliate: pilih produk marketplace, dapatkan tautan simulasi, dan terima komisi dari penjualan simulasi. Tanpa modal.</p><button class="btn primary" data-act="aff-join">Gabung affiliate</button></div></div>`; return; }
  $('#body').innerHTML = `<div class="shop-sum-row">${tile('Saldo komisi', rp(r.balance))}${tile('Sudah dicairkan', rp(r.paid))}${tile('Klik', r.totals.clicks.toLocaleString('id-ID'))}${tile('Pesanan', r.totals.orders)}${tile('Total komisi', rp(r.totals.earn))}</div>
  <div class="row" style="gap:8px;margin:10px 0;flex-wrap:wrap"><button class="btn primary sm" data-act="aff-add">${icon('plus', 'width="14" height="14"')} Tambah produk</button><button class="btn sm" data-act="aff-wd" ${r.balance < r.minWithdraw ? 'disabled' : ''}>Cairkan komisi</button><span class="subtle sm">Minimal pencairan ${rp(r.minWithdraw)}. Komisi bersumber dari penjualan simulasi, bukan lalu lintas internet nyata.</span></div>
  <div class="panel"><div class="panel-h"><h2>Komisi 14 hari</h2></div><div class="panel-b"><div id="affch"></div></div></div>
  <div class="stack" style="margin-top:12px">${r.links.length ? r.links.map(l => `<div class="panel"><div class="panel-b row" style="justify-content:space-between;gap:8px"><div style="min-width:0"><b>${esc(l.name)}</b> <span class="chip">${esc(l.marketName)}</span><div class="subtle sm">${rp(l.price)} · komisi ${(l.rate * 100).toFixed(1).replace('.0', '')}% · ${l.clicks} klik · ${l.orders} pesanan · <span style="word-break:break-all">${esc(l.link)}</span></div></div><button class="btn sm ghost" data-act="aff-rm" data-id="${l.id}">Hapus</button></div></div>`).join('') : ''}</div>`;
  barChart($('#affch'), r.chart.map(d => ({ label: String(d.day), value: d.earn })), { height: 120 });
}
async function affCatalog() {
  const d = openDialog(`<div class="dlg-h"><h3>Pilih produk affiliate</h3></div><div class="dlg-b stack"><input class="input" id="aq" placeholder="Cari produk…"><div id="alist" class="stack"></div></div><div class="dlg-f"><button class="btn" data-close>Tutup</button></div>`);
  const load = async () => { const r = await S.rd('/api/aff/catalog?q=' + encodeURIComponent($('#aq', d).value)); $('#alist', d).innerHTML = r.ok ? r.items.map(i => `<div class="row" style="justify-content:space-between;gap:8px"><div style="min-width:0"><b>${esc(i.name)}</b><div class="subtle sm">${esc(i.marketName)} · ${rp(i.price)} · komisi ${rp(i.commission)}</div></div><button class="btn sm" data-lid="${i.listing}">Pilih</button></div>`).join('') || '<p class="subtle">Tidak ada hasil.</p>' : errBox(r); };
  $('#aq', d).addEventListener('input', () => { clearTimeout(load.t); load.t = setTimeout(load, 250); }); load();
  d.addEventListener('click', async e => { const b = e.target.closest('[data-lid]'); if (!b) return; const r = await S.act('/api/aff/link', { listing: b.dataset.lid }); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); d.close(); render(); });
}

// ——— aksi ———
page.addEventListener('submit', async e => {
  const f = e.target; if (f.dataset.reply) { e.preventDefault(); const r = await S.act(`/api/sell/review/${f.dataset.reply}/reply`, { text: f.t.value }); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); render(); }
  if (f.id === 'chat-f') { e.preventDefault(); if (f.t.value.trim()) { const t = f.t.value; f.t.value = ''; sendChat({ text: t }); } }
});
document.addEventListener('submit', async e => {
  const f = e.target;
  if (f.id === 'prod-form') { e.preventDefault(); const d = f.closest('dialog'), id = d.dataset.pid, b = await prodBody(f, !id); if (!b) return; const r = id ? await S.act('/api/sell/product/' + id, b) : await S.money('/api/sell/product', b); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); d.close(); render(); }
});
document.addEventListener('click', async e => {
  const of = e.target.closest('[data-of]'); if (of) { ordFilter = of.dataset.of; return viewOrders(); }
  const a = e.target.closest('[data-act]'); if (!a) return; const id = a.dataset.id, k = a.dataset.act;
  const call = async (path, body, ok) => { const r = await S.act(path, body); if (!r.ok) return toast(r.error, 'error'); toast(ok || r.msg || 'Berhasil.'); render(); return r; };
  if (k === 'prod-new') { const d = openDialog(`<div class="dlg-h"><h3>Produk baru</h3></div><div class="dlg-b">${prodForm(null)}</div>`, { wide: true }); }
  else if (k === 'prod-edit') { const p = SUBS.prods.find(x => x.id === id), d = openDialog(`<div class="dlg-h"><h3>Ubah produk</h3></div><div class="dlg-b">${prodForm(p)}</div>`, { wide: true }); d.dataset.pid = id; }
  else if (k === 'prod-toggle') call(`/api/sell/product/${id}/toggle`);
  else if (k === 'prod-del') { if (confirm('Hapus produk ini? Riwayat penjualan tetap tersimpan.')) call(`/api/sell/product/${id}/delete`); }
  else if (k === 'prod-stock') { const p = SUBS.prods.find(x => x.id === id); openDialog(`<div class="dlg-h"><h3>Stok ${esc(p.name)}</h3></div><form class="dlg-b stack" id="stk-f"><p class="subtle sm">Stok saat ini ${p.stock}. Menambah stok membeli dari pemasok seharga modal ${rp(p.cost)}/pcs.</p><div class="seg"><label><input type="radio" name="mode" value="add" checked> Tambah</label><label><input type="radio" name="mode" value="cut"> Kurangi</label></div><label class="field"><span>Jumlah</span><input class="input" name="n" inputmode="numeric" value="10"></label>${payFields()}<div class="dlg-f"><button class="btn" type="button" data-close>Batal</button><button class="btn primary">Simpan</button></div></form>`, { onMount: d => d.querySelector('form').addEventListener('submit', async ev => { ev.preventDefault(); const f = ev.target, n = f.n.value, b = { [f.mode.value]: n, idem: S.newIdem('stk'), ...payBody(f) }; const r = await S.money(`/api/sell/product/${id}/stock`, b); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); d.close(); render(); }) }); }
  else if (k === 'ord-open') orderDetail(id);
  else if (k === 'ord-pack') call(`/api/sell/order/${id}/pack`);
  else if (k === 'ord-ship') shipDialog(id);
  else if (k === 'ord-cancel') { if (confirm('Batalkan pesanan? Reputasi toko turun sedikit.')) call(`/api/sell/order/${id}/cancel`); }
  else if (k === 'ret-ok') call(`/api/sell/return/${id}/approve`);
  else if (k === 'ret-no') { const n = prompt('Alasan penolakan (min. 5 karakter):'); if (n) call(`/api/sell/return/${id}/reject`, { note: n }); }
  else if (k === 'camp-new') campDialog(id);
  else if (k === 'vc-new') openDialog(`<div class="dlg-h"><h3>Voucher toko</h3></div><form class="dlg-b stack" id="vc-f"><div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(170px,1fr))"><label class="field"><span>Kode</span><input class="input" name="code" maxlength="16" required></label><label class="field"><span>Jenis</span><select class="input" name="kind"><option value="fixed">Potongan (Rp)</option><option value="percent">Persen (%)</option></select></label><label class="field"><span>Nilai</span><input class="input" name="value" inputmode="numeric" required></label><label class="field"><span>Maks. potongan (Rp)</span><input class="input" name="max" inputmode="numeric" value="0"></label><label class="field"><span>Min. belanja (Rp)</span><input class="input" name="min" inputmode="numeric" value="0"></label><label class="field"><span>Kuota</span><input class="input" name="quota" inputmode="numeric" value="50"></label><label class="field"><span>Berlaku (hari)</span><input class="input" name="days" inputmode="numeric" value="14"></label></div><div class="dlg-f"><button class="btn" type="button" data-close>Batal</button><button class="btn primary">Buat</button></div></form>`, { onMount: d => d.querySelector('form').addEventListener('submit', async ev => { ev.preventDefault(); const f = ev.target, r = await S.act('/api/sell/voucher', Object.fromEntries(['code', 'kind', 'value', 'max', 'min', 'quota', 'days'].map(x => [x, f[x].value]))); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); d.close(); render(); }) });
  else if (k === 'vc-toggle') call(`/api/sell/voucher/${id}/toggle`);
  else if (k === 'chat-open') { chatId = id; render(); } else if (k === 'chat-back') { chatId = ''; render(); }
  else if (k === 'chat-quick') { const q = a.dataset.k; if (q === 'counter') { const p = prompt('Harga tawaran per pcs (Rp):'); if (p) sendChat({ quick: q, price: Number(p.replace(/\D/g, '')) }); } else sendChat({ quick: q }); }
  else if (k === 'aff-join') call('/api/aff/join'); else if (k === 'aff-add') affCatalog(); else if (k === 'aff-rm') call(`/api/aff/link/${id}/remove`);
  else if (k === 'aff-wd') { const r = await S.money('/api/aff/withdraw', { idem: S.newIdem('afw') }); if (!r.ok) return toast(r.error, 'error'); toast(r.msg); render(); }
});
await boot();
