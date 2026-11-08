// MARKETPLACE — launcher 4 marketplace fiktif, akun per-marketplace, katalog, keranjang, voucher, checkout, PayLater.
// Semua data berasal dari server (/api/mp/*). Pesanan masuk ke Order Center yang sama (shop.html#pesanan).
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as MP from '../engine/mp.js';
import * as SL from '../engine/seller.js';
import { mountShell } from '../ui/shell.js';
import { openMpCheckout } from '../ui/mp-checkout.js';
import { productArt, catArt, mpLogo } from '../ui/product-art.js';
import { rp, rpShort, icon, esc, $, toast, empty, openDialog } from '../ui/ui.js';

const page = await mountShell('shop', 'Marketplace');
window.__hashNav = true;
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, F, MP };
await F.init().catch(() => {});

let LA = null;               // data launcher
let CART = { count: 0 };     // ringkasan keranjang marketplace aktif
let CATS = [];               // kategori marketplace aktif
const MID = () => route().m;
const mk = id => LA?.markets.find(m => m.id === id);
const day = () => E.dayNow();

// ——— routing: #  | #<market> | #<market>/<view>[/<arg>][?query] ———
function route() {
  const [path, qs] = location.hash.slice(1).split('?'); const [m, v = '', a = ''] = path.split('/');
  return { m: m || '', v, a: decodeURIComponent(a), q: new URLSearchParams(qs || '') };
}
const go = h => { if (location.hash === '#' + h) render(); else location.hash = h; };
function theme(m) {
  const s = document.body.style, keys = ['--accent', '--accent-bg', '--accent-head', '--page-accent', '--page-accent-soft'];
  if (!m) { keys.forEach(k => s.removeProperty(k)); return; }
  s.setProperty('--accent', m.color); s.setProperty('--accent-bg', m.color2); s.setProperty('--accent-head', m.ink); s.setProperty('--page-accent', m.color); s.setProperty('--page-accent-soft', m.color2);
}
const busy = () => { $('#mp-body') && ($('#mp-body').innerHTML = `<div class="stack"><div class="skel" style="height:90px"></div><div class="skel" style="height:90px"></div></div>`); };
// Respons 401 → arahkan ke masuk/daftar marketplace itu.
function authGuard(r, mid) { if (r && r.ok === false && ['mp-login', 'mp-noaccount'].includes(r.code)) { go(mid); return true; } return false; }
const errBox = r => `<div class="msg error">${icon('alert')}<span>${esc(r?.error || 'Terjadi kesalahan.')}</span></div>`;

page.innerHTML = `<div id="mp-root"></div>`;
const root = $('#mp-root');

// ——— LAUNCHER ———
async function viewLauncher() {
  theme(null);
  root.innerHTML = `<div class="mod-band"><span class="ti">${icon('store')}</span><div><h2>Marketplace</h2><p>Empat marketplace fiktif dengan biaya, promo, dan layanan berbeda. Akun dibuat per marketplace dan terikat ke karakter ini.</p></div><div class="right"><a class="btn" href="shop.html#pesanan">${icon('box')} Order Center</a></div></div><div id="mp-body"></div>`;
  busy(); const r = await MP.launcher();
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  LA = r;
  $('#mp-body').innerHTML = `<div class="mp-launch">${r.markets.map(m => `<article class="mp-app" style="--mp:${m.color}">
    <div class="mp-app-h">${mpLogo(m, 48)}<div><h3>${esc(m.name)}</h3><p>${esc(m.tagline)}</p></div></div>
    <p class="muted" style="margin:0;font-size:12.5px">${esc(m.desc)}</p>
    <div class="traits">${m.traits.map(t => `<span class="chip">${esc(t)}</span>`).join('')}</div>
    <div class="mp-stats"><div><b>${m.rating.toLocaleString('id-ID', { minimumFractionDigits: 1 })}</b>Rating (${m.ratingCount.toLocaleString('id-ID')})</div><div><b>${m.sellerCount}</b>Penjual</div><div><b>${m.productCount}</b>Produk</div></div>
    <p class="mp-fee"><b>Biaya layanan:</b> ${esc(m.feeText)}${m.payLater ? ` · <b>PayLater:</b> ${esc(m.payLater)}` : ' · Tanpa PayLater'}</p>
    <div class="mp-promos">${m.promos.map(p => `<span class="chip">${icon('tag', 'width="12" height="12"')} ${esc(p)}</span>`).join('')}</div>
    <div class="mp-app-f">${m.account ? `<span class="subtle">@${esc(m.account.username)} · ${m.account.loggedIn ? 'sedang masuk' : 'belum masuk'}</span>` : `<span class="subtle">Belum punya akun</span>`}<a class="btn primary" href="#${m.id}">${m.account?.loggedIn ? 'Buka' : m.account ? 'Masuk' : 'Daftar'}</a></div></article>`).join('')}</div>`;
}

// ——— AUTH ———
function viewAuth(m, mode) {
  const acc = m.account, hasAcc = !!acc; mode = mode || (hasAcc ? 'masuk' : 'daftar');
  root.innerHTML = `<div class="mod-band"><span class="ti">${mpLogo(m, 40)}</span><div><h2>${esc(m.name)}</h2><p>${esc(m.tagline)}</p></div><div class="right"><a class="btn" href="#">${icon('chevL')} Semua marketplace</a></div></div>
  <div class="mp-auth panel"><div class="panel-h"><b>${mode === 'masuk' ? 'Masuk ke akun' : 'Daftar akun baru'}</b></div><div class="panel-b">
    <div class="tabs" role="tablist" style="margin-bottom:12px"><button class="tab" role="tab" aria-selected="${mode === 'masuk'}" data-mode="masuk" ${hasAcc ? '' : 'disabled title="Daftar dulu"'}>Masuk</button><button class="tab" role="tab" aria-selected="${mode === 'daftar'}" data-mode="daftar" ${hasAcc ? 'disabled title="Akun sudah ada"' : ''}>Daftar</button></div>
    <form id="auth" class="stack" novalidate>
      ${mode === 'daftar' ? `<label class="field"><span>Nama lengkap</span><input class="input" name="name" autocomplete="name" value="${esc(E.S?.profile?.name || '')}" required></label>` : ''}
      <label class="field"><span>Username</span><input class="input" name="username" autocomplete="username" autocapitalize="none" required placeholder="huruf kecil, angka, _"></label>
      ${mode === 'daftar' ? `<label class="field"><span>Email</span><input class="input" type="email" name="email" autocomplete="email" required></label><label class="field"><span>Nomor telepon</span><input class="input" type="tel" name="phone" inputmode="tel" autocomplete="tel" required placeholder="081234567890"></label>
      <label class="field"><span>Alamat lengkap</span><input class="input" name="address" required placeholder="Jalan, nomor, RT/RW"></label>
      <div class="grid g-2"><label class="field"><span>Kota</span><select class="input" name="city">${LA.cities.map(c => `<option value="${esc(c.city)}" data-p="${esc(c.province)}" ${c.city === LA.city ? 'selected' : ''}>${esc(c.city)}</option>`).join('')}</select></label><label class="field"><span>Provinsi</span><input class="input" name="province" readonly></label></div>` : ''}
      <label class="field"><span>Password</span><input class="input" type="password" name="password" autocomplete="${mode === 'masuk' ? 'current-password' : 'new-password'}" required>${mode === 'daftar' ? '<small class="subtle">Minimal 8 karakter, memuat huruf dan angka.</small>' : ''}</label>
      <div id="auth-err"></div><button class="btn primary block" type="submit">${mode === 'masuk' ? 'Masuk' : 'Buat akun'}</button>
      <p class="mp-note">${icon('shield')}<span>Akun ${esc(m.name)} terikat ke karakter ini dan tersimpan di server. Password disimpan ter-hash; kamu tetap masuk setelah refresh sampai memilih keluar.</span></p>
    </form></div></div>`;
  const f = $('#auth'), sync = () => { const c = f.elements.city; if (c) f.elements.province.value = c.selectedOptions[0].dataset.p; }; sync(); f.elements.city?.addEventListener('change', sync);
  root.querySelectorAll('[data-mode]').forEach(b => b.addEventListener('click', () => viewAuth(m, b.dataset.mode)));
  f.addEventListener('submit', async e => {
    e.preventDefault(); const btn = f.querySelector('button[type=submit]'); btn.disabled = true;
    const body = Object.fromEntries(new FormData(f)); const r = await MP.act(m.id, mode === 'masuk' ? 'login' : 'register', body);
    btn.disabled = false;
    if (!r.ok) { $('#auth-err').innerHTML = errBox(r); return; }
    toast(r.msg); await loadLauncher(); go(m.id + '/beranda');
  });
}
async function loadLauncher() { const r = await MP.launcher(); if (r.ok) LA = r; return r; }

// ——— kerangka marketplace (header merek + tab) ———
function shell(m, tab, title) {
  const tabs = [['beranda', 'Beranda', 'home'], ['cari', 'Jelajah', 'search'], ['voucher', 'Voucher', 'ticket'], ['wishlist', 'Wishlist', 'heart'], ['pasar', 'Pasar', 'chart'], ...(m.payLater ? [['paylater', 'PayLater', 'repeat']] : []), ['akun', 'Akun', 'user']];
  root.innerHTML = `<div class="mod-band"><span class="ti">${mpLogo(m, 40)}</span><div><h2>${esc(m.name)}</h2><p>${esc(m.tagline)}</p></div><div class="right"><a class="btn" href="#">${icon('chevL')} Marketplace lain</a><a class="btn" href="shop.html#pesanan">${icon('box')} Pesanan</a></div></div>
  <div class="mp-bar"><form id="sf" role="search"><input class="input" name="q" type="search" placeholder="Cari produk, merek, kategori" aria-label="Cari produk" value="${esc(route().q.get('q') || '')}"><button class="btn" type="submit" aria-label="Cari">${icon('search')}</button></form>
    <a class="icon-btn" href="#${m.id}/keranjang" aria-label="Keranjang">${icon('cart')}${CART.count ? `<span class="mp-badge">${CART.count}</span>` : ''}</a></div>
  <div class="tabs" role="tablist" id="mp-tabs">${tabs.map(([k, l, ic]) => `<a class="tab" role="tab" href="#${m.id}/${k}" aria-selected="${k === tab}">${icon(ic, 'width="15" height="15"')}${l}</a>`).join('')}</div>
  <div id="mp-body" style="margin-top:14px"></div>`;
  $('#sf').addEventListener('submit', e => { e.preventDefault(); const q = new FormData(e.target).get('q').trim(); go(`${m.id}/cari${q ? '?q=' + encodeURIComponent(q) : ''}`); });
  document.title = `${title || m.name} — BizSim`;
}
async function refreshCart(mid) { const r = await MP.rd(mid, 'cart'); if (r.ok) { CART = r; const b = root.querySelector('.mp-bar .icon-btn'); if (b) b.innerHTML = `${icon('cart')}${r.count ? `<span class="mp-badge">${r.count}</span>` : ''}`; } return r; }

// ——— kartu produk ———
const stars = r => `${icon('star', 'width="11" height="11" fill="currentColor"')} ${r.toLocaleString('id-ID', { minimumFractionDigits: 1 })}`;
function pcard(it) {
  return `<div class="pcard" data-open="${esc(it.id)}" role="link" tabindex="0" aria-label="${esc(it.name)}">${productArt(it.sub, it.cat, { label: it.name })}
    ${it.disc ? `<span class="disc-b">−${it.disc}%</span>` : ''}<button class="wish-b" data-wish="${esc(it.id)}" aria-pressed="${it.wish}" aria-label="${it.wish ? 'Hapus dari wishlist' : 'Tambah ke wishlist'}">${icon(it.wish ? 'heartFill' : 'heart')}</button>
    <h4>${esc(it.name)}</h4><div class="price">${rp(it.sale)}${it.disc ? `<s>${rp(it.price)}</s>` : ''}</div>
    <div class="meta"><span>${stars(it.rating)}</span><span>${it.sold.toLocaleString('id-ID')} terjual</span></div>
    <div class="meta"><span>${icon('pin')} ${esc(it.seller.city)}</span>${it.stock <= 0 ? '<span class="chip neg">Habis</span>' : it.stock <= 5 ? `<span class="chip">Sisa ${it.stock}</span>` : ''}</div></div>`;
}
function bindCards(scope, m, reload) {
  scope.querySelectorAll('[data-open]').forEach(c => { const open = () => go(`${m.id}/produk/${encodeURIComponent(c.dataset.open)}`); c.addEventListener('click', e => { if (!e.target.closest('[data-wish]')) open(); }); c.addEventListener('keydown', e => { if (e.key === 'Enter') open(); }); });
  scope.querySelectorAll('[data-wish]').forEach(b => b.addEventListener('click', async e => {
    e.stopPropagation(); const on = b.getAttribute('aria-pressed') !== 'true'; b.disabled = true;
    const r = await MP.act(m.id, 'wishlist', { listing: b.dataset.wish, on }); b.disabled = false;
    if (!r.ok) { if (!authGuard(r, m.id)) toast(r.error, 'error'); return; }
    b.setAttribute('aria-pressed', on); b.innerHTML = icon(on ? 'heartFill' : 'heart'); toast(on ? 'Ditambahkan ke wishlist.' : 'Dihapus dari wishlist.'); reload?.();
  }));
}

// ——— BERANDA ———
async function viewHome(m) {
  shell(m, 'beranda'); busy(); const r = await MP.rd(m.id, 'home'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  CATS = r.categories; CART.count = r.cartCount; root.querySelector('.mp-bar .icon-btn').innerHTML = `${icon('cart')}${r.cartCount ? `<span class="mp-badge">${r.cartCount}</span>` : ''}`;
  const row = (title, items, more) => items.length ? `<div class="sec-h"><h3>${title}</h3>${more ? `<a class="btn sm ghost" href="#${m.id}/cari?sort=${more}">Lihat semua ${icon('chevR')}</a>` : ''}</div><div class="hrow">${items.map(pcard).join('')}</div>` : '';
  $('#mp-body').innerHTML = `${r.events.length ? `<div class="msg info">${icon('sparkle')}<span><b>${r.events.map(esc).join(' · ')}</b> sedang berlangsung. Cek voucher event di halaman Voucher.</span></div>` : ''}
    <div class="sec-h"><h3>Kategori</h3></div><div class="cat-grid">${r.categories.map(c => `<a class="cat-tile" href="#${m.id}/cari?cat=${c.id}">${catArt(c.id)}<span>${esc(c.label)}</span><small>${c.count} produk</small></a>`).join('')}</div>
    ${row('Diskon terbesar', r.flash, 'rekomendasi')}${row('Terlaris', r.best, 'terlaris')}${row('Terbaru', r.newest, 'terbaru')}${row('Rekomendasi untukmu', r.recommended, 'rekomendasi')}`;
  bindCards($('#mp-body'), m);
}


// ——— PASAR & EVENT (P9): kompetisi antar marketplace, event aktif, aktivitas NPC ———
async function viewMarketInfo(m) {
  shell(m, 'pasar'); busy(); const r = await MP.rd(m.id, 'pasar'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  const mx = Math.max(...r.stats.map(x => x.share)), im = r.impact, fmtN = n => n >= 1e6 ? (n / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' jt' : n.toLocaleString('id-ID');
  const evs = r.events.length ? r.events.map(e => `<div class="row-i"><span class="ichip">${icon(e.kind === 'flash' ? 'bolt' : 'sparkle')}</span><div><b>${esc(e.label)}</b><div class="muted sm">Diskon sekitar ${Math.round(e.disc * 100)}% · permintaan ×${e.demand}${e.kind === 'flash' ? (e.live ? ' · sedang berlangsung (12:00–14:00)' : ' · jendela 12:00–14:00') : ''}</div></div></div>`).join('') : '<p class="muted">Tidak ada event pada hari ini.</p>';
  $('#mp-body').innerHTML = `<p class="mp-note">${icon('info')}<span>${esc(r.note)}</span></p>
    <div class="sec-h"><h3>Event hari ini</h3></div><div class="card pad stack">${evs}</div>
    <div class="sec-h"><h3>Kompetisi marketplace</h3></div><div class="stack">${r.stats.map(x => `<div class="card pad"><div style="display:flex;align-items:center;gap:8px;justify-content:space-between"><b>${esc(x.name)}${x.id === m.id ? ' <span class="chip">Kamu di sini</span>' : ''}</b><span class="mono">${(x.share * 100).toFixed(1)}%</span></div>
      <div class="bar" role="img" aria-label="Pangsa ${(x.share * 100).toFixed(1)} persen"><i style="width:${Math.round(x.share / mx * 100)}%;background:${esc(x.color || 'var(--accent)')}"></i></div>
      <div class="muted sm">${fmtN(x.users)} pengguna · ${fmtN(x.sellers)} penjual · ${fmtN(x.tx)} transaksi/hari · layanan ${x.service}/100</div></div>`).join('')}</div>
    <div class="sec-h"><h3>Dampak ke dunia</h3></div><div class="card pad"><div class="kv"><span>Aktivitas pasar</span><b>${im.activity}× baseline</b></div><div class="kv"><span>Pekerjaan kurir</span><b>${fmtN(im.courierJobs)}/hari</b></div><div class="kv"><span>Penjual aktif</span><b>${fmtN(im.sellerJobs)}</b></div><div class="kv"><span>Daya beli</span><b>${im.purchasingPower}×</b></div><div class="kv"><span>Inflasi</span><b>${im.inflation}</b></div></div>
    <div class="sec-h"><h3>Kabar pasar</h3></div><div class="card pad stack">${r.feed.length ? r.feed.map(f => `<div class="row-i"><span class="ichip">${icon('store')}</span><div><b>${esc(f.seller || f.name || '')}</b> ${esc(f.text || f.action || '')}<div class="muted sm">${esc(f.marketName || f.market || '')}</div></div></div>`).join('') : '<p class="muted">Belum ada kabar.</p>'}</div>`;
}

// ——— JELAJAH / KATALOG ———
async function viewCatalog(m) {
  const { q } = route(); shell(m, 'cari');
  const f = { q: q.get('q') || '', cat: q.get('cat') || '', sub: q.get('sub') || '', sort: q.get('sort') || 'populer', min: q.get('min') || '', max: q.get('max') || '', rating: q.get('rating') || '', city: q.get('city') || '', page: q.get('page') || '1' };
  if (!CATS.length) { const h = await MP.rd(m.id, 'home'); if (authGuard(h, m.id)) return; if (h.ok) CATS = h.categories; }
  const cat = CATS.find(c => c.id === f.cat);
  const sortOpts = [['populer', 'Terpopuler'], ['terlaris', 'Terlaris'], ['terbaru', 'Terbaru'], ['rekomendasi', 'Rekomendasi'], ['murah', 'Harga terendah'], ['mahal', 'Harga tertinggi'], ['rating', 'Rating tertinggi']];
  const nAct = [f.cat, f.sub, f.min, f.max, f.rating, f.city].filter(Boolean).length;
  $('#mp-body').innerHTML = `<details class="panel filt" style="margin-bottom:12px" ${nAct ? 'open' : ''}><summary class="panel-h">${icon('filter', 'width="15" height="15"')} <b>Filter &amp; urutkan</b>${nAct ? ` <span class="chip">${nAct} aktif</span>` : ''}</summary><div class="panel-b stack">
    <div class="grid g-2" style="grid-template-columns:repeat(auto-fit,minmax(140px,1fr))">
      <label class="field"><span>Kategori</span><select class="input" id="f-cat"><option value="">Semua</option>${CATS.map(c => `<option value="${c.id}" ${c.id === f.cat ? 'selected' : ''}>${esc(c.label)}</option>`).join('')}</select></label>
      <label class="field"><span>Subkategori</span><select class="input" id="f-sub" ${cat ? '' : 'disabled'}><option value="">Semua</option>${(cat?.subs || []).map(s => `<option value="${s.id}" ${s.id === f.sub ? 'selected' : ''}>${esc(s.label)}</option>`).join('')}</select></label>
      <label class="field"><span>Harga minimum</span><input class="input" id="f-min" inputmode="numeric" value="${esc(f.min)}" placeholder="0"></label>
      <label class="field"><span>Harga maksimum</span><input class="input" id="f-max" inputmode="numeric" value="${esc(f.max)}" placeholder="tanpa batas"></label>
      <label class="field"><span>Rating minimum</span><select class="input" id="f-rating">${[['', 'Semua'], ['4', '4,0+'], ['4.5', '4,5+'], ['4.8', '4,8+']].map(([v, l]) => `<option value="${v}" ${v === f.rating ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="field"><span>Lokasi penjual</span><select class="input" id="f-city"><option value="">Semua kota</option>${LA.cities.map(c => `<option value="${esc(c.city)}" ${c.city === f.city ? 'selected' : ''}>${esc(c.city)}</option>`).join('')}</select></label>
      <label class="field"><span>Urutkan</span><select class="input" id="f-sort">${sortOpts.map(([v, l]) => `<option value="${v}" ${v === f.sort ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
    </div><div class="row" style="gap:8px"><button class="btn primary sm" id="f-go">Terapkan</button><button class="btn sm ghost" id="f-reset">Reset</button></div></div></details><div id="res"></div>`;
  const apply = (over = {}) => { const n = { ...f, ...over }; const p = new URLSearchParams(); for (const [k, v] of Object.entries(n)) if (v && !(k === 'sort' && v === 'populer') && !(k === 'page' && v === '1')) p.set(k, v); go(`${m.id}/cari${p.toString() ? '?' + p : ''}`); };
  $('#f-go').onclick = () => apply({ cat: $('#f-cat').value, sub: $('#f-sub').value, min: $('#f-min').value.replace(/\D/g, ''), max: $('#f-max').value.replace(/\D/g, ''), rating: $('#f-rating').value, city: $('#f-city').value, sort: $('#f-sort').value, page: '1' });
  $('#f-cat').onchange = () => { $('#f-sub').value = ''; apply({ cat: $('#f-cat').value, sub: '', page: '1' }); };
  $('#f-sort').onchange = () => apply({ sort: $('#f-sort').value, page: '1' });
  $('#f-reset').onclick = () => go(`${m.id}/cari`);
  const qs = new URLSearchParams({ q: f.q, cat: f.cat, sub: f.sub, min: f.min, max: f.max, rating: f.rating, city: f.city, sort: f.sort, page: f.page }); for (const [k, v] of [...qs]) if (!v) qs.delete(k);
  $('#res').innerHTML = `<div class="skel" style="height:120px"></div>`; const r = await MP.rd(m.id, `products?${qs}`); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#res').innerHTML = errBox(r); return; }
  $('#res').innerHTML = !r.items.length ? empty('search', 'Tidak ada produk', 'Coba kata kunci lain atau longgarkan filter.', `<button class="btn" id="e-reset">Reset filter</button>`)
    : `<p class="subtle" style="margin:0 0 8px">${r.total.toLocaleString('id-ID')} produk${f.q ? ` untuk “${esc(f.q)}”` : ''}</p><div class="pgrid">${r.items.map(pcard).join('')}</div>
    ${r.pages > 1 ? `<div class="row" style="justify-content:center;gap:8px;margin-top:14px"><button class="btn sm" id="pg-p" ${r.page <= 1 ? 'disabled' : ''}>${icon('chevL')} Sebelumnya</button><span class="subtle">Halaman ${r.page} dari ${r.pages}</span><button class="btn sm" id="pg-n" ${r.page >= r.pages ? 'disabled' : ''}>Berikutnya ${icon('chevR')}</button></div>` : ''}`;
  $('#e-reset')?.addEventListener('click', () => go(`${m.id}/cari`));
  $('#pg-p')?.addEventListener('click', () => apply({ page: String(r.page - 1) })); $('#pg-n')?.addEventListener('click', () => apply({ page: String(r.page + 1) }));
  bindCards($('#res'), m);
}

// ——— DETAIL PRODUK ———

// ——— chat dengan penjual (P8): pesan bebas atau pilihan cepat; balasan penjual katalog dibuat server dari data nyata ———
async function openChat(it) {
  const st = await SL.act('/api/chat/start', { listing: it.id }); if (!st.ok) { if (!authGuard(st, MID())) toast(st.error, 'error'); return; }
  const d = openDialog(`<div class="dlg-h"><h3>Chat · ${esc(it.seller.name)}</h3></div><div class="dlg-b"><div class="chat-log" id="cl"></div><div id="cq" class="row" style="gap:6px;flex-wrap:wrap;margin:10px 0"></div><form class="row" id="cf" style="gap:6px"><input class="input" name="t" maxlength="300" placeholder="Tulis pesan…" autocomplete="off"><button class="btn primary">Kirim</button></form></div><div class="dlg-f"><button class="btn" data-close>Tutup</button></div>`);
  const load = async () => { const r = await SL.rd('/api/chat/' + st.id); if (!r.ok) return; $('#cl', d).innerHTML = r.messages.map(m => `<div class="chat-msg ${m.who === 'me' ? 'me' : 'them'}"><span>${esc(m.text)}</span></div>`).join(''); $('#cq', d).innerHTML = r.quick.map(q => `<button class="btn sm" data-k="${q.k}">${esc(q.l)}</button>`).join(''); $('#cl', d).scrollTop = 1e6; };
  const send = async b => { const r = await SL.act('/api/chat/' + st.id + '/send', { ...b, idem: SL.newIdem('ch') }); if (!r.ok) toast(r.error, 'error'); await load(); };
  $('#cf', d).addEventListener('submit', e => { e.preventDefault(); const t = e.target.t.value.trim(); if (t) { e.target.t.value = ''; send({ text: t }); } });
  $('#cq', d).addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) send({ quick: b.dataset.k }); });
  await load();
}

async function viewProduct(m, id) {
  shell(m, 'cari'); busy(); const r = await MP.rd(m.id, `product/${encodeURIComponent(id)}`); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = `${errBox(r)}<p><a class="btn" href="#${m.id}/cari">${icon('chevL')} Kembali ke katalog</a></p>`; return; }
  const it = r.item; let vr = it.variants[0].id, qty = 1;
  const best = Math.min(...r.compare.map(c => c.price));
  const draw = () => {
    const v = it.variants.find(x => x.id === vr), unit = it.sale + v.price;
    $('#mp-body').innerHTML = `<p style="margin:0 0 10px"><a class="btn sm ghost" href="#${m.id}/cari?cat=${it.cat}">${icon('chevL')} Kembali</a></p>
    <div class="pd"><div style="position:relative">${productArt(it.sub, it.cat, { label: it.name })}${it.disc ? `<span class="disc-b">−${it.disc}%</span>` : ''}</div>
      <div class="stack"><div><span class="chip">${esc(it.brand)}</span><h2 style="margin:6px 0 4px;font-size:18px">${esc(it.name)}</h2><div class="meta" style="display:flex;gap:10px;flex-wrap:wrap;font-size:12.5px;color:var(--text-2)"><span>${stars(it.rating)} (${it.reviews.toLocaleString('id-ID')} ulasan)</span><span>${it.sold.toLocaleString('id-ID')} terjual</span></div></div>
        <div class="price" style="font-size:22px">${rp(unit)}${it.disc ? `<s>${rp(it.price + v.price)}</s>` : ''}</div>
        ${it.variants.length > 1 ? `<div><div class="subtle" style="margin-bottom:4px">Variasi</div><div class="opt-row">${it.variants.map(x => `<button class="chip" data-var="${x.id}" aria-pressed="${x.id === vr}">${esc(x.label)}${x.price ? ` (+${rp(x.price)})` : ''}</button>`).join('')}</div></div>` : ''}
        <div class="row" style="gap:12px;flex-wrap:wrap"><div class="qty"><button data-q="-1" aria-label="Kurangi" ${qty <= 1 ? 'disabled' : ''}>${icon('minus')}</button><b aria-live="polite">${qty}</b><button data-q="1" aria-label="Tambah" ${qty >= Math.min(it.stock, 20) ? 'disabled' : ''}>${icon('plus')}</button></div><span class="subtle">${it.stock <= 0 ? 'Stok habis' : `Stok ${it.stock}`}</span></div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-add ${it.stock <= 0 ? 'disabled' : ''}>${icon('cart')} Tambah ke keranjang</button><button class="btn" data-buy ${it.stock <= 0 ? 'disabled' : ''}>Beli sekarang</button><button class="btn" data-chat>${icon('chat')} Chat penjual</button><button class="btn ghost" data-w aria-pressed="${it.wish}">${icon(it.wish ? 'heartFill' : 'heart')} Wishlist</button></div>
        <div id="pd-msg"></div>
        <table class="table"><tbody><tr><th>Penjual</th><td>${esc(it.seller.name)}${it.seller.official ? ` <span class="chip">${icon('shield', 'width="11" height="11"')} Resmi</span>` : ''} · ${esc(it.seller.city)} · rating ${it.seller.rating.toLocaleString('id-ID', { minimumFractionDigits: 1 })}</td></tr>
        <tr><th>Estimasi tiba</th><td>Reguler ${it.etaReg} hari · Ekspres ${it.etaEks} hari (${it.km} km dari penjual)</td></tr><tr><th>Berat</th><td>${it.weightG.toLocaleString('id-ID')} g</td></tr><tr><th>Dimensi</th><td>${esc(it.dim)} cm</td></tr>${it.warranty ? `<tr><th>Garansi</th><td>${esc(it.warranty)}</td></tr>` : ''}${it.minAge ? `<tr><th>Usia</th><td>${it.minAge}+</td></tr>` : ''}</tbody></table>
        <p class="muted" style="margin:0;font-size:13px">${esc(it.desc)}</p></div></div>
    <div class="sec-h"><h3>Bandingkan harga di marketplace lain</h3></div><div class="panel"><div class="panel-b" style="overflow-x:auto"><table class="cmp"><thead><tr><th>Marketplace</th><th>Penjual</th><th>Harga</th></tr></thead><tbody>${r.compare.slice().sort((a, b) => a.price - b.price).map(c => `<tr class="${c.market === m.id ? 'me' : ''} ${c.price === best ? 'best' : ''}"><td>${esc(c.marketName)}${c.market === m.id ? ' (di sini)' : ''}</td><td>${esc(c.seller || '')}</td><td><b>${rp(c.price)}</b>${c.price === best ? ' · termurah' : ''}</td></tr>`).join('')}</tbody></table><p class="subtle" style="margin:8px 0 0">Harga belum termasuk ongkir dan biaya layanan, yang berbeda tiap marketplace.</p></div></div>
    ${r.related.length ? `<div class="sec-h"><h3>Produk serupa</h3></div><div class="hrow">${r.related.map(pcard).join('')}</div>` : ''}`;
    bindCards($('#mp-body'), m);
    $('#mp-body').querySelectorAll('[data-var]').forEach(b => b.onclick = () => { vr = b.dataset.var; draw(); });
    $('#mp-body').querySelectorAll('[data-q]').forEach(b => b.onclick = () => { qty = Math.max(1, Math.min(Math.min(it.stock, 20), qty + Number(b.dataset.q))); draw(); });
    const add = async () => { const rr = await MP.act(m.id, 'cart', { op: 'add', listing: it.id, variant: vr, qty }); if (!rr.ok) { if (!authGuard(rr, m.id)) $('#pd-msg').innerHTML = errBox(rr); return false; } CART = rr; root.querySelector('.mp-bar .icon-btn').innerHTML = `${icon('cart')}<span class="mp-badge">${rr.count}</span>`; return true; };
    $('[data-chat]').onclick = () => openChat(it);
    $('[data-add]').onclick = async e => { e.target.closest('button').disabled = true; if (await add()) toast('Masuk keranjang.'); draw(); };
    $('[data-buy]').onclick = async () => { if (await add()) { const rr = await MP.act(m.id, 'cart', { op: 'selectAll', on: false }); await MP.act(m.id, 'cart', { op: 'select', listing: it.id, variant: vr, on: true }); go(`${m.id}/keranjang`); } };
    $('[data-w]').onclick = async () => { const on = $('[data-w]').getAttribute('aria-pressed') !== 'true'; const rr = await MP.act(m.id, 'wishlist', { listing: it.id, on }); if (rr.ok) { it.wish = on; toast(on ? 'Ditambahkan ke wishlist.' : 'Dihapus dari wishlist.'); draw(); } };
  };
  draw();
}

// ——— KERANJANG ———
async function viewCart(m) {
  shell(m, '', 'Keranjang'); busy(); const r = await MP.rd(m.id, 'cart'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  CART = r; root.querySelector('.mp-bar .icon-btn').innerHTML = `${icon('cart')}${r.count ? `<span class="mp-badge">${r.count}</span>` : ''}`;
  if (!r.items.length) { $('#mp-body').innerHTML = empty('cart', 'Keranjang kosong', 'Tambahkan produk dari katalog.', `<a class="btn primary" href="#${m.id}/cari">Jelajahi produk</a>`); return; }
  const all = r.items.every(x => x.selected);
  $('#mp-body').innerHTML = `<div class="panel"><div class="panel-h"><label class="row" style="gap:8px"><input type="checkbox" id="sel-all" ${all ? 'checked' : ''}> <b>Pilih semua (${r.items.length} jenis)</b></label></div><div class="panel-b">${r.items.map(x => `<div class="cart-line">
    <input type="checkbox" data-sel="${esc(x.listing)}|${esc(x.variant)}" ${x.selected ? 'checked' : ''} ${x.stock <= 0 ? 'disabled' : ''} aria-label="Pilih ${esc(x.name)}">${productArt(x.sub, x.cat, { label: x.name })}
    <div><b style="font-size:13px">${esc(x.name)}</b>${x.variantLabel ? `<div class="subtle">${esc(x.variantLabel)}</div>` : ''}<div class="price">${rp(x.unit)}${x.disc ? `<s>${rp(x.normal)}</s>` : ''}</div>
    ${x.stock <= 0 ? `<div class="msg error" style="margin-top:6px">${icon('info')}<span>Stok habis.</span></div>` : x.qty > x.stock ? `<div class="msg error" style="margin-top:6px">${icon('info')}<span>Stok tersisa ${x.stock}; kurangi jumlah.</span></div>` : ''}
    <div class="row2"><div class="qty"><button data-dec="${esc(x.listing)}|${esc(x.variant)}|${x.qty}" ${x.qty <= 1 ? 'disabled' : ''} aria-label="Kurangi">${icon('minus')}</button><b>${x.qty}</b><button data-inc="${esc(x.listing)}|${esc(x.variant)}|${x.qty}" aria-label="Tambah">${icon('plus')}</button></div>
    <button class="btn sm ghost" data-del="${esc(x.listing)}|${esc(x.variant)}">${icon('trash')} Hapus</button></div></div></div>`).join('')}</div></div>
    <div class="sticky-pay"><div><div class="subtle">Subtotal (${r.selectedCount} dipilih)</div><b style="font-size:16px">${rp(r.subtotal)}</b></div><button class="btn primary" id="go-pay" ${r.selectedCount ? '' : 'disabled'}>Checkout</button></div><div id="cart-msg"></div>`;
  const op = async (o, extra) => { const rr = await MP.act(m.id, 'cart', { op: o, ...extra }); if (!rr.ok) { toast(rr.error, 'error'); return; } viewCart(m); };
  $('#sel-all').onchange = e => op('selectAll', { on: e.target.checked });
  $('#mp-body').querySelectorAll('[data-sel]').forEach(c => c.onchange = () => { const [l, v] = c.dataset.sel.split('|'); op('select', { listing: l, variant: v, on: c.checked }); });
  $('#mp-body').querySelectorAll('[data-inc],[data-dec]').forEach(b => b.onclick = () => { const inc = b.hasAttribute('data-inc'); const [l, v, q] = (b.dataset.inc || b.dataset.dec).split('|'); op('set', { listing: l, variant: v, qty: Number(q) + (inc ? 1 : -1) }); });
  $('#mp-body').querySelectorAll('[data-del]').forEach(b => b.onclick = () => { const [l, v] = b.dataset.del.split('|'); op('remove', { listing: l, variant: v }); });
  $('#go-pay').onclick = () => openMpCheckout({ market: m, onDone: () => { viewCart(m); } });
}

// ——— VOUCHER ———
const VKIND = { pct: 'Diskon persen', fixed: 'Potongan harga', freeship: 'Gratis ongkir', cashback: 'Cashback' };
const VSCOPE = { all: 'Semua pembeli', newuser: 'Pengguna baru', event: 'Event', seller: 'Toko tertentu', exclusive: 'Eksklusif' };
const vState = { claimable: ['Klaim', null], claimed: ['Sudah diklaim', 'ok'], used: ['Terpakai', null], expired: ['Kedaluwarsa', null], soldout: ['Kuota habis', null], inactive: ['Belum aktif', null], ineligible: ['Belum memenuhi syarat', null] };
async function viewVouchers(m) {
  shell(m, 'voucher'); busy(); const r = await MP.rd(m.id, 'vouchers'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  const card = v => `<div class="vcard ${['claimable', 'claimed'].includes(v.state) ? '' : 'off'}"><div class="vi">${icon(v.kind === 'freeship' ? 'truck' : v.kind === 'cashback' ? 'wallet' : 'percent')}</div>
    <div class="vb"><h4>${esc(v.label)}</h4><p>${esc(VKIND[v.kind])} · ${esc(VSCOPE[v.scope])}${v.event ? ` · ${esc(v.event)}` : ''}</p><p>Min. belanja ${rp(v.min)}${v.max ? ` · maks. ${rp(v.max)}` : ''}</p>${v.why ? `<p><span class="chip">${esc(v.why)}</span></p>` : ''}<p class="mono" style="font-size:11px">${esc(v.code)}</p></div>
    <div class="va">${v.state === 'claimable' ? `<button class="btn sm primary" data-claim="${esc(v.code)}">Klaim</button>` : `<span class="chip ${vState[v.state]?.[1] || ''}">${vState[v.state]?.[0] || v.state}</span>`}<button class="icon-btn" data-vd="${esc(v.code)}" aria-label="Detail voucher">${icon('chevR')}</button></div></div>`;
  const mine = r.vouchers.filter(v => v.state === 'claimed'), rest = r.vouchers.filter(v => v.state !== 'claimed');
  $('#mp-body').innerHTML = `<p class="mp-note">${icon('info')}<span>Aturan tumpukan ${esc(m.name)}: ${r.stack.discount} diskon, ${r.stack.freeship} gratis ongkir, ${r.stack.cashback} cashback per checkout. Voucher dihitung dan divalidasi server saat checkout.</span></p>
    ${mine.length ? `<div class="sec-h"><h3>Koleksiku (${mine.length})</h3></div><div class="vgrid">${mine.map(card).join('')}</div>` : ''}<div class="sec-h"><h3>Voucher tersedia</h3></div><div class="vgrid">${rest.map(card).join('')}</div>`;
  $('#mp-body').querySelectorAll('[data-claim]').forEach(b => b.onclick = async () => { b.disabled = true; const rr = await MP.act(m.id, 'vouchers/claim', { code: b.dataset.claim }); if (rr.ok) toast(rr.msg); else toast(rr.error, 'error'); viewVouchers(m); });
  $('#mp-body').querySelectorAll('[data-vd]').forEach(b => b.onclick = () => go(`${m.id}/voucher/${b.dataset.vd}`));
}
async function viewVoucherDetail(m, code) {
  shell(m, 'voucher'); busy(); const r = await MP.rd(m.id, `voucher/${encodeURIComponent(code)}`); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = `${errBox(r)}<p><a class="btn" href="#${m.id}/voucher">${icon('chevL')} Kembali</a></p>`; return; }
  const v = r.voucher, nilai = v.kind === 'pct' ? `${v.value}%` : v.kind === 'cashback' ? `${v.value}% cashback` : rp(v.value);
  $('#mp-body').innerHTML = `<p style="margin:0 0 10px"><a class="btn sm ghost" href="#${m.id}/voucher">${icon('chevL')} Semua voucher</a></p><div class="panel"><div class="panel-h"><b>${esc(v.label)}</b></div><div class="panel-b stack">
    <table class="table"><tbody><tr><th>Kode</th><td class="mono">${esc(v.code)}</td></tr><tr><th>Jenis</th><td>${esc(VKIND[v.kind])} (${esc(nilai)})</td></tr><tr><th>Untuk</th><td>${esc(VSCOPE[v.scope])}${v.seller ? ` — ${esc(v.seller)}` : ''}${v.event ? ` — ${esc(v.event)}` : ''}</td></tr>
    <tr><th>Belanja minimal</th><td>${rp(v.min)}</td></tr>${v.max ? `<tr><th>Potongan maksimal</th><td>${rp(v.max)}</td></tr>` : ''}<tr><th>Kategori</th><td>${v.cats ? v.cats.map(esc).join(', ') : 'Semua kategori'}</td></tr><tr><th>Batas pakai</th><td>${v.perUser}× per klaim</td></tr>
    <tr><th>Kuota bulan ini</th><td>${v.quotaLeft.toLocaleString('id-ID')} dari ${v.quota.toLocaleString('id-ID')}</td></tr>${v.expiresDay != null ? `<tr><th>Berlaku sampai</th><td>hari ke-${v.expiresDay}</td></tr>` : '<tr><th>Masa berlaku</th><td>30 hari sejak diklaim</td></tr>'}${v.req ? `<tr><th>Syarat khusus</th><td>${esc(v.req === 'paylater' ? 'PayLater aktif' : v.req.startsWith('tier:') ? 'Tier ' + v.req.slice(5) : v.req)}</td></tr>` : ''}<tr><th>Status</th><td>${esc(vState[v.state]?.[0] || v.state)}${v.why ? ` — ${esc(v.why)}` : ''}</td></tr></tbody></table>
    ${v.state === 'claimable' ? `<button class="btn primary" id="vd-claim">Klaim voucher</button>` : ''}</div></div>`;
  $('#vd-claim')?.addEventListener('click', async () => { const rr = await MP.act(m.id, 'vouchers/claim', { code: v.code }); if (rr.ok) toast(rr.msg); else toast(rr.error, 'error'); viewVoucherDetail(m, code); });
}

// ——— WISHLIST ———
async function viewWishlist(m) {
  shell(m, 'wishlist'); busy(); const r = await MP.rd(m.id, 'wishlist'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  $('#mp-body').innerHTML = r.items.length ? `<div class="pgrid">${r.items.map(pcard).join('')}</div>` : empty('heart', 'Wishlist kosong', 'Tekan ikon hati pada produk untuk menyimpannya.', `<a class="btn primary" href="#${m.id}/cari">Jelajahi produk</a>`);
  bindCards($('#mp-body'), m, () => viewWishlist(m));
}

// ——— AKUN ———
async function viewAccount(m) {
  shell(m, 'akun'); busy(); const r = await MP.rd(m.id, 'me'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  const a = r.account;
  $('#mp-body').innerHTML = `<div class="grid g-2" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr));align-items:start">
  <div class="panel"><div class="panel-h"><b>Profil</b></div><div class="panel-b stack"><dl class="dl"><dt>Username</dt><dd>@${esc(a.username)}</dd><dt>Karakter</dt><dd class="mono">${esc(a.charId)}</dd>${r.points != null ? `<dt>Poin & tier</dt><dd>${r.points.toLocaleString('id-ID')} poin · ${esc(r.tier?.label || '')}</dd>` : ''}</dl>
    <form id="pf" class="stack"><label class="field"><span>Nama lengkap</span><input class="input" name="name" value="${esc(a.name)}"></label><label class="field"><span>Email</span><input class="input" type="email" name="email" value="${esc(a.email)}"></label><label class="field"><span>Telepon</span><input class="input" type="tel" name="phone" value="${esc(a.phone)}"></label><div id="pf-m"></div><button class="btn primary" type="submit">Simpan profil</button></form></div></div>
  <div class="panel"><div class="panel-h"><b>Ganti password</b></div><div class="panel-b"><form id="pw" class="stack"><label class="field"><span>Password lama</span><input class="input" type="password" name="old" autocomplete="current-password"></label><label class="field"><span>Password baru</span><input class="input" type="password" name="password" autocomplete="new-password"></label><div id="pw-m"></div><button class="btn primary" type="submit">Ganti password</button></form>
    <div class="divider"></div><button class="btn" id="lo">${icon('logout')} Keluar dari ${esc(m.name)}</button></div></div></div>
  <div class="sec-h"><h3>Alamat pengiriman</h3><button class="btn sm" id="ad-new">${icon('plus')} Tambah alamat</button></div><div id="addrs" class="vgrid">${r.addresses.map(ad => `<div class="panel"><div class="panel-b stack"><div class="row" style="justify-content:space-between"><b>${esc(ad.label)}</b>${ad.isDefault ? '<span class="chip ok">Utama</span>' : ''}</div><div style="font-size:13px">${esc(ad.name)} · ${esc(ad.phone)}<br>${esc(ad.address)}, ${esc(ad.city)}, ${esc(ad.province)}</div>
    <div class="row" style="gap:6px;flex-wrap:wrap"><button class="btn sm" data-ae="${ad.id}">Ubah</button>${ad.isDefault ? '' : `<button class="btn sm" data-ad="${ad.id}">Jadikan utama</button>`}${r.addresses.length > 1 ? `<button class="btn sm ghost" data-adel="${ad.id}">Hapus</button>` : ''}</div></div></div>`).join('')}</div>
  <div class="sec-h"><h3>Riwayat akun</h3></div><div class="panel"><ul class="list">${r.history.length ? r.history.map(h => `<li style="padding:8px 12px;display:flex;justify-content:space-between;gap:10px"><span>${esc(h.text)}</span><span class="subtle" style="white-space:nowrap">${esc(whenAbs(h.abs))}</span></li>`).join('') : '<li style="padding:12px" class="subtle">Belum ada aktivitas.</li>'}</ul></div>`;
  $('#pf').onsubmit = async e => { e.preventDefault(); const rr = await MP.act(m.id, 'profile', Object.fromEntries(new FormData(e.target))); $('#pf-m').innerHTML = rr.ok ? `<div class="msg ok">${icon('check')}<span>${esc(rr.msg || 'Profil disimpan.')}</span></div>` : errBox(rr); if (rr.ok) toast('Profil disimpan.'); };
  $('#pw').onsubmit = async e => { e.preventDefault(); const rr = await MP.act(m.id, 'password', Object.fromEntries(new FormData(e.target))); $('#pw-m').innerHTML = rr.ok ? `<div class="msg ok">${icon('check')}<span>${esc(rr.msg || 'Password diganti.')}</span></div>` : errBox(rr); if (rr.ok) e.target.reset(); };
  $('#lo').onclick = async () => { const rr = await MP.act(m.id, 'logout'); if (rr.ok) { toast(rr.msg); await loadLauncher(); go(m.id); } else toast(rr.error, 'error'); };
  const addrForm = (ad = {}) => openDialog(`<div class="dlg-h"><h2>${ad.id ? 'Ubah alamat' : 'Alamat baru'}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><form class="dlg-b stack" id="af"><label class="field"><span>Label</span><input class="input" name="label" value="${esc(ad.label || '')}" placeholder="Rumah, Kantor"></label><label class="field"><span>Nama penerima</span><input class="input" name="name" value="${esc(ad.name || a.name)}"></label><label class="field"><span>Telepon</span><input class="input" type="tel" name="phone" value="${esc(ad.phone || a.phone)}"></label><label class="field"><span>Alamat lengkap</span><input class="input" name="address" value="${esc(ad.address || '')}"></label>
    <div class="grid g-2"><label class="field"><span>Kota</span><select class="input" name="city">${r.cities.map(c => `<option value="${esc(c.city)}" data-p="${esc(c.province)}" ${c.city === (ad.city || LA.city) ? 'selected' : ''}>${esc(c.city)}</option>`).join('')}</select></label><label class="field"><span>Provinsi</span><input class="input" name="province" readonly></label></div><div id="af-m"></div><div class="dlg-f"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn primary" type="submit">Simpan</button></div></form>`, {
    onMount: d => { const f = d.querySelector('#af'), s = () => { f.elements.province.value = f.elements.city.selectedOptions[0].dataset.p; }; s(); f.elements.city.onchange = s;
      f.onsubmit = async e => { e.preventDefault(); const rr = await MP.act(m.id, 'address', { op: ad.id ? 'update' : 'add', id: ad.id, ...Object.fromEntries(new FormData(f)) }); if (!rr.ok) { d.querySelector('#af-m').innerHTML = errBox(rr); return; } d.close(); toast('Alamat disimpan.'); viewAccount(m); }; } });
  $('#ad-new').onclick = () => addrForm();
  $('#addrs').addEventListener('click', async e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.ae) return addrForm(r.addresses.find(x => x.id === b.dataset.ae));
    const op = b.dataset.ad ? ['default', b.dataset.ad] : b.dataset.adel ? ['delete', b.dataset.adel] : null; if (!op) return;
    const rr = await MP.act(m.id, 'address', { op: op[0], id: op[1] }); if (!rr.ok) toast(rr.error, 'error'); else toast('Alamat diperbarui.'); viewAccount(m);
  });
}
const whenAbs = abs => { const l = abs - 14 * 86400, d = Math.floor(l / 86400); return `Hari ke-${d}`; };

// ——— PAYLATER ———
async function viewPayLater(m) {
  shell(m, 'paylater'); busy(); const r = await MP.rd(m.id, 'paylater'); if (authGuard(r, m.id)) return;
  if (!r.ok) { $('#mp-body').innerHTML = errBox(r); return; }
  const ac = r.account;
  if (!ac) {
    $('#mp-body').innerHTML = `<div class="pl-hero"><b style="font-size:15px">${esc(r.name)}</b><p class="muted" style="margin:0">Belanja sekarang, bayar nanti atau cicil 1, 3, 6, atau 12 bulan. Limit mengikuti skor kredit; keterlambatan menambah denda, menurunkan limit dan skor kredit.</p>
      <dl class="dl"><dt>Skor kredit kamu</dt><dd>${r.score}</dd><dt>Syarat skor</dt><dd>≥ ${r.minScore}</dd><dt>Syarat usia</dt><dd>≥ ${r.minAge} tahun (kamu ${r.age})</dd><dt>Perkiraan limit</dt><dd>${r.eligible.ok ? rp(r.eligible.limit) : '—'}</dd><dt>Biaya</dt><dd>Biaya layanan ${(r.feePct * 100).toLocaleString('id-ID')}% + bunga ${(r.rateMonth * 100).toLocaleString('id-ID')}%/bulan (tenor &gt; 1 bulan)</dd></dl>
      ${r.eligible.ok ? '' : `<div class="msg error">${icon('info')}<span>${esc(r.eligible.why)}</span></div>`}
      <div class="row" style="gap:8px"><button class="btn primary" id="pl-on" ${r.eligible.ok ? '' : 'disabled'}>Aktifkan ${esc(r.name)}</button></div></div>`;
    $('#pl-on')?.addEventListener('click', () => pinDialog(`Aktifkan ${r.name}`, async pin => MP.money(m.id, 'paylater/activate', { idem: MP.newIdem('pla'), pin }), 'PayLater aktif.', () => viewPayLater(m)));
    return;
  }
  const pct = ac.limit ? Math.min(100, Math.round(ac.used / ac.limit * 100)) : 0;
  const stat = { active: ['Aktif', 'ok'], restricted: ['Dibatasi (ada tunggakan)', 'neg'], blocked: ['Diblokir', 'neg'] }[ac.status] || [ac.status, ''];
  const open = r.bills.filter(b => b.status !== 'lunas'), done = r.bills.filter(b => b.status === 'lunas');
  $('#mp-body').innerHTML = `<div class="pl-hero"><div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><b>${esc(r.name)}</b><span class="chip ${stat[1]}">${stat[0]}</span></div>
    <div><div class="subtle">Limit tersedia</div><div class="lim">${rp(ac.available)}</div></div><div class="bar" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Pemakaian limit"><i style="width:${pct}%"></i></div>
    <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><span class="subtle">Terpakai ${rp(ac.used)} dari ${rp(ac.limit)}</span><span class="subtle">Skor kredit ${r.score}</span></div></div>
  <div class="shop-sum-row" style="margin-top:12px"><div class="sum-tile"><span>Total tagihan terbuka</span><b>${rp(r.totalDue)}</b></div><div class="sum-tile"><span>Tagihan berikutnya</span><b>${r.next ? `${rp(r.next.left)}` : '—'}</b><span>${r.next ? `jatuh tempo hari ke-${r.next.due}` : ''}</span></div><div class="sum-tile"><span>Keterlambatan</span><b>${ac.lateCount}</b></div></div>
  <div class="msg info">${icon('info')}<span>Jatuh tempo + ${r.rules.graceDays} hari masa tenggang. Telat: denda ${rp(r.rules.lateFee)} + bunga keterlambatan ${(r.rules.lateRateMonth * 100).toLocaleString('id-ID')}%/bulan, limit turun, skor kredit turun. Telat ${r.rules.blockAfter}× diblokir.</span></div>
  <div class="sec-h"><h3>Tagihan terbuka</h3></div><div class="panel"><div class="panel-b">${open.length ? open.map(b => `<div class="bill"><div><b>Cicilan ${b.seq}/${b.of}</b> <span class="chip ${b.status === 'telat' ? 'neg' : ''}">${b.status === 'telat' ? 'Terlambat' : 'Terbuka'}</span><div class="subtle">Jatuh tempo hari ke-${b.due}${b.lateFee ? ` · denda ${rp(b.lateFee)}` : ''}${b.extra ? ` · bunga telat ${rp(b.extra)}` : ''}</div></div><div style="text-align:right"><b>${rp(b.left)}</b><div><button class="btn sm primary" data-pay="${b.id}" data-amt="${b.left}" data-lbl="Cicilan ${b.seq}/${b.of}">Bayar</button></div></div></div>`).join('') : '<p class="subtle" style="margin:0">Tidak ada tagihan terbuka.</p>'}</div></div>
  ${r.loans.filter(l => l.status === 'aktif').length ? `<div class="sec-h"><h3>Pinjaman aktif</h3></div><div class="panel"><div class="panel-b">${r.loans.filter(l => l.status === 'aktif').map(l => `<div class="bill"><div><b>${rp(l.principal)} · ${l.tenor} bulan</b><div class="subtle">Biaya ${rp(l.fee)} · bunga ${rp(l.interest)} · total ${rp(l.total)} · dibuat hari ke-${l.createdDay}</div></div><button class="btn sm" data-off="${l.id}">Lunasi lebih awal</button></div>`).join('')}</div></div>` : ''}
  <div class="sec-h"><h3>Riwayat pembayaran</h3></div><div class="panel"><div class="panel-b">${done.length ? done.map(b => `<div class="bill"><div><b>Cicilan ${b.seq}/${b.of}</b><div class="subtle">Dibayar hari ke-${b.paidDay ?? '—'}</div></div><b>${rp(b.amount)}</b></div>`).join('') : '<p class="subtle" style="margin:0">Belum ada pembayaran.</p>'}</div></div>`;
  $('#mp-body').querySelectorAll('[data-pay]').forEach(b => b.onclick = () => payDialog(m, `${b.dataset.lbl} · ${rp(Number(b.dataset.amt))}`, extra => MP.money(m.id, 'paylater/pay', { idem: MP.newIdem('plp'), bill: b.dataset.pay, ...extra }), () => viewPayLater(m)));
  $('#mp-body').querySelectorAll('[data-off]').forEach(b => b.onclick = async () => { const q = await MP.act(m.id, 'paylater/payoff-quote', { loan: b.dataset.off }); if (!q.ok) { toast(q.error, 'error'); return; } payDialog(m, `Lunasi sekarang · ${rp(q.amount)}${q.savedInterest ? ` (hemat bunga ${rp(q.savedInterest)})` : ''}`, extra => MP.money(m.id, 'paylater/payoff', { idem: MP.newIdem('plo'), loan: b.dataset.off, ...extra }), () => viewPayLater(m)); });
}
function pinDialog(title, run, okMsg, done) {
  openDialog(`<div class="dlg-h"><h2>${esc(title)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><form class="dlg-b stack" id="pf"><label class="field"><span>PIN transaksi (6 digit)</span><input class="input" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></label><div id="pm"></div><div class="dlg-f"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn primary" type="submit">Konfirmasi</button></div></form>`, { onMount: d => {
    d.querySelector('[name=pin]').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); };
    d.querySelector('#pf').onsubmit = async e => { e.preventDefault(); const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; const r = await run(e.target.pin.value); if (!r.ok) { btn.disabled = false; d.querySelector('#pm').innerHTML = errBox(r); return; } d.close(); toast(okMsg); done(); }; } });
}
async function payDialog(m, title, run, done) {
  await F.loadCatalog(); if (!F.V) await F.refresh();
  const acc = F.accounts().filter(a => a.kind === 'bank' || a.kind === 'wallet');
  openDialog(`<div class="dlg-h"><h2>Bayar tagihan</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><form class="dlg-b stack" id="pf"><p style="margin:0"><b>${esc(title)}</b></p>
    <fieldset class="co-methods"><legend>Sumber dana</legend><div style="display:grid;gap:8px">${acc.map((a, i) => `<label class="pm"><input type="radio" name="source" value="${a.id}" ${i === 0 ? 'checked' : ''}><span><b>${esc(a.name)}</b><small>Saldo ${rp(a.balance)}</small></span></label>`).join('') || '<p class="subtle">Belum ada rekening/dompet.</p>'}</div></fieldset>
    <label class="field"><span>PIN transaksi (6 digit)</span><input class="input" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off"></label><div id="pm"></div><div class="dlg-f"><button class="btn ghost" type="button" data-close>Batal</button><button class="btn primary" type="submit" ${acc.length ? '' : 'disabled'}>Bayar</button></div></form>`, { onMount: d => {
    d.querySelector('[name=pin]').oninput = e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); };
    d.querySelector('#pf').onsubmit = async e => { e.preventDefault(); const btn = e.target.querySelector('[type=submit]'); btn.disabled = true; const r = await run({ method: 'saldo', source: e.target.source.value, pin: e.target.pin.value }); if (!r.ok) { btn.disabled = false; d.querySelector('#pm').innerHTML = errBox(r); return; } d.close(); toast(r.msg || 'Pembayaran berhasil.'); done(); }; } });
}

// ——— render utama ———
async function render() {
  const rt = route();
  if (!LA) { const r = await loadLauncher(); if (!r.ok) { root.innerHTML = `<div class="mod-band"><span class="ti">${icon('store')}</span><div><h2>Marketplace</h2></div></div>${errBox(r)}`; return; } }
  const m = mk(rt.m);
  if (!rt.m || !m) { document.title = 'Marketplace — BizSim'; return viewLauncher(); }
  theme(m); window.scrollTo(0, 0);
  const fresh = await loadLauncher(); const mm = mk(rt.m);
  if (!mm.account?.loggedIn) { document.title = `${mm.name} — BizSim`; return viewAuth(mm); }
  if (!rt.v) return go(`${mm.id}/beranda`);
  try {
    switch (rt.v) {
      case 'beranda': return await viewHome(mm);
      case 'cari': return await viewCatalog(mm);
      case 'produk': return await viewProduct(mm, rt.a);
      case 'keranjang': return await viewCart(mm);
      case 'voucher': return rt.a ? await viewVoucherDetail(mm, rt.a) : await viewVouchers(mm);
      case 'wishlist': return await viewWishlist(mm);
      case 'pasar': return await viewMarketInfo(mm);
      case 'akun': return await viewAccount(mm);
      case 'paylater': return mm.payLater ? await viewPayLater(mm) : go(`${mm.id}/beranda`);
      default: return go(`${mm.id}/beranda`);
    }
  } catch (e) { console.error(e); root.innerHTML = `<div class="msg error">${icon('alert')}<span>Halaman gagal dimuat: ${esc(e.message)}</span></div>`; }
}
window.addEventListener('hashchange', render);
render();
