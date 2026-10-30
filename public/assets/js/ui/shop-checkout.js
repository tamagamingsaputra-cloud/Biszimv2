// CHECKOUT BELANJA — dialog pembayaran pesanan toko (offline/online). Harga, ongkir, diskon, total, dan stok dari server.
// "Berhasil" hanya setelah server mengonfirmasi; pembayaran berhasil ≠ barang diterima (lihat Order Center).
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as SH from '../engine/shop.js';
import { options } from './checkout.js';
import { rp, esc, icon, openDialog, toast } from './ui.js';

const hm = min => min < 60 ? `${min} menit` : `${Math.floor(min / 60)} jam ${min % 60 ? (min % 60) + ' menit' : ''}`.trim();

/** items: [{id, variant?, qty}] untuk satu toko dan satu jalur. */
export async function openShopCheckout({ store, mode, items, title, onDone }) {
  await F.loadCatalog(); if (!F.V) await F.refresh();
  await SH.loadCatalog();
  const base = { store, mode, items };
  let st = { method: null, source: null, voucher: '', ship: 'reguler', phase: 'form', idem: SH.newIdem('ord'), res: null, q: null, err: null };
  const d = openDialog(`<div class="dlg-h"><h2>${esc(title || 'Pembayaran pesanan')}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b checkout" data-co></div>`);
  const body = d.querySelector('[data-co]');
  const s = SH.CAT.stores.find(x => x.id === store);
  const opts = () => options({ methods: mode === 'pickup' && s.pickupMethods ? s.pickupMethods : s.methods });
  async function requote() { const r = await SH.quote({ ...base, ship: st.ship, voucher: st.voucher || undefined, method: st.method }); if (r.ok) { st.q = r; st.err = null; } else { st.err = r.error; if (!st.q) st.q = null; } }
  const needSrc = () => st.method && st.method !== 'cash' && st.method !== 'cod';
  const canPay = () => st.phase === 'form' && st.q && !st.err && st.method && (!needSrc() || (st.source && F.V?.pinSet));
  function resultHtml() {
    const r = st.res, o = r.order;
    if (r.ok) return `<div class="co-result ok">${icon('check')}<div><b>${o.payStatus === 'cod_pending' ? 'Pesanan dibuat — bayar saat diterima' : 'Pembayaran berhasil'}</b><p>${esc(r.msg || '')}</p>
      <dl class="dl"><dt>No. pesanan</dt><dd class="mono">${esc(o.id)}</dd><dt>Status pembayaran</dt><dd>${o.payStatus === 'paid' ? 'Dibayar' : 'COD — belum dibayar'}</dd><dt>Status pesanan</dt><dd>${esc(o.fulLabel)} (barang belum diterima)</dd><dt>Estimasi</dt><dd>${o.mode === 'digital' ? 'Beberapa menit' : esc(whenText(o.eta))}</dd></dl>
      <p class="subtle sm">Pantau di Order Center. Bonus belanja dicatat saat kamu mengonfirmasi penerimaan.</p><div class="dlg-f"><a class="btn primary" href="shop.html#pesanan">Buka Order Center</a><button class="btn ghost" data-close>Tutup</button></div></div></div>`;
    return `<div class="co-result fail">${icon('info')}<div><b>Pembayaran tidak berhasil</b><p>${esc(r.error || 'Gagal')}</p>${o ? `<dl class="dl"><dt>No. pesanan</dt><dd class="mono">${esc(o.id)}</dd><dt>Status</dt><dd>Gagal — tidak ada uang yang berpindah</dd></dl>` : ''}<div class="dlg-f"><button class="btn" data-retry>Coba lagi</button><button class="btn ghost" data-close>Tutup</button></div></div></div>`;
  }
  const whenText = SH.whenAbs;
  function draw() {
    const q = st.q, o = opts().find(x => x.key === st.method), locked = st.phase !== 'form';
    if (st.phase === 'done') { body.innerHTML = resultHtml(); return; }
    body.innerHTML = `
      <div class="co-merchant"><div><b>${esc(s.name)}</b><div class="muted sm">${esc(s.hoursText)} · ${mode === 'food' || mode === 'parcel' ? 'Diantar ke rumah' : mode === 'digital' ? 'Akses digital' : 'Ambil di toko'}</div></div><span class="chip">${esc(q?.modeLabel || '')}</span></div>
      ${q ? `<table class="table co-lines"><tbody>${q.lines.map(l => `<tr><td>${l.qty}× ${esc(l.name)}</td><td class="num">${rp(l.total)}</td></tr>`).join('')}${q.fees.map(f => `<tr class="muted"><td>${esc(f.label)}</td><td class="num">${rp(f.amount)}</td></tr>`).join('')}${q.discounts.map(f => `<tr class="pos"><td>${esc(f.label)}</td><td class="num">−${rp(-f.amount)}</td></tr>`).join('')}<tr class="co-total"><td><b>Total</b></td><td class="num"><b>${rp(q.total)}</b></td></tr></tbody></table>
      ${mode === 'digital' ? '' : `<p class="muted sm">${icon('clock')} Estimasi ${mode === 'counter' || mode === 'pickup' ? 'siap' : 'tiba'} ±${hm(q.minutes)} jam game (dapat berubah).</p>`}` : ''}
      ${st.err ? `<div class="msg error">${icon('info')}<span>${esc(st.err)}</span></div>` : ''}
      ${mode === 'parcel' ? `<fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Pengiriman</legend>${['reguler', 'ekspres'].map(k => `<label class="co-m"><input type="radio" name="ship" value="${k}" ${st.ship === k ? 'checked' : ''}><span><b>${k === 'reguler' ? 'Reguler' : 'Ekspres'}</b><small>${k === 'ekspres' ? 'Lebih cepat, ongkir lebih mahal' : 'Hemat'}</small></span></label>`).join('')}</fieldset>` : ''}
      ${q?.vouchers?.length ? `<label class="field"><span>Voucher</span><select class="input" name="voucher" ${locked ? 'disabled' : ''}><option value="">Tanpa voucher</option>${q.vouchers.map(v => `<option value="${v.id}" ${st.voucher === v.id ? 'selected' : ''}>${esc(v.label)}</option>`).join('')}</select></label>` : ''}
      <fieldset class="co-methods" ${locked || !q ? 'disabled' : ''}><legend>Metode pembayaran</legend>
        ${opts().map(x => `<label class="co-m ${x.reason ? 'off' : ''}"><input type="radio" name="m" value="${x.key}" ${st.method === x.key ? 'checked' : ''} ${x.reason ? 'disabled' : ''}><span class="ico">${icon(x.ico)}</span><span><b>${x.label}</b><small>${esc(x.reason || x.desc)}</small></span></label>`).join('')}
      </fieldset>
      ${o && needSrc() ? `<fieldset class="co-src" ${locked ? 'disabled' : ''}><legend>Sumber dana</legend>${o.sources.map(x => `<label class="co-m"><input type="radio" name="s" value="${x.id}" ${st.source === x.id ? 'checked' : ''}><span><b>${esc(x.label)}</b><small>${x.balLabel || 'Saldo'} ${rp(x.bal)}${x.note ? ' · ' + esc(x.note) : ''}</small></span></label>`).join('')}</fieldset>` : ''}
      ${st.method === 'cash' && q && E.S.player.balance < q.total ? `<div class="msg error">${icon('info')}<span>Uang tunai ${rp(E.S.player.balance)} — kurang ${rp(q.total - E.S.player.balance)}.</span></div>` : ''}
      ${needSrc() && st.source ? (F.V?.pinSet ? `<label class="field co-pin"><span>PIN transaksi (6 digit)</span><input name="pin" class="input" type="password" inputmode="numeric" autocomplete="off" maxlength="6"></label>` : `<div class="msg error">${icon('info')}<span>Buat PIN transaksi dulu di <a href="finance.html#ringkasan">Keuangan</a>.</span></div>`) : ''}
      ${st.phase === 'proc' ? `<div class="msg info" role="status">${icon('clock')}<span>Memproses di server… Jangan tutup halaman.</span></div>` : ''}
      <div class="dlg-f"><button class="btn ghost" data-close ${locked ? 'disabled' : ''}>Batal</button><button class="btn primary" data-pay ${canPay() ? '' : 'disabled'}>${st.phase === 'proc' ? 'Memproses…' : q ? (st.method === 'cod' ? 'Buat pesanan COD' : `Bayar ${rp(q.total)}`) : 'Memuat…'}</button></div>`;
  }
  body.addEventListener('change', async e => {
    const n = e.target.name;
    if (n === 'm') { st.method = e.target.value; const o = opts().find(x => x.key === st.method); st.source = o.sources.length === 1 ? o.sources[0].id : null; await requote(); }
    if (n === 's') st.source = e.target.value;
    if (n === 'ship') { st.ship = e.target.value; await requote(); }
    if (n === 'voucher') { st.voucher = e.target.value; await requote(); }
    draw();
  });
  body.addEventListener('input', e => { if (e.target.name === 'pin') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
  body.addEventListener('click', async e => {
    if (e.target.closest('[data-retry]')) { st = { ...st, phase: 'form', res: null, idem: SH.newIdem('ord') }; await requote(); draw(); return; }
    if (!e.target.closest('[data-pay]') || !canPay()) return;
    const pin = body.querySelector('[name=pin]')?.value || '';
    if (needSrc() && !/^\d{6}$/.test(pin)) { toast('Masukkan PIN 6 digit.', 'error'); return; }
    st.phase = 'proc'; draw();
    const r = await SH.checkout({ ...base, idem: st.idem, method: st.method, source: st.source, pin, ship: st.ship, voucher: st.voucher || undefined });
    st.res = r; st.phase = 'done';
    if (r.ok) { if (st.method !== 'cash' && st.method !== 'cod') E.recordExpense(s.cat === 'makanan' ? 'makan' : 'belanja', r.order.total); try { onDone?.(r); } catch (err) { console.error(err); } }
    draw();
  });
  d.addEventListener('cancel', e => { if (st.phase === 'proc') e.preventDefault(); });
  await requote(); draw(); return d;
}
