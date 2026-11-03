// CHECKOUT MARKETPLACE — dialog pembayaran satu langkah. Rincian, ongkir, biaya layanan, voucher, dan PayLater dihitung server (/api/mp/:m/quote).
// "Berhasil" hanya setelah server mengonfirmasi. Kunci idempoten per dialog mencegah transaksi ganda; tombol terkunci saat memproses.
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import * as MP from '../engine/mp.js';
import { options } from './checkout.js';
import { rp, esc, icon, openDialog, toast } from './ui.js';

const SHIP = { reguler: 'Reguler', ekspres: 'Ekspres' };

export async function openMpCheckout({ market, onDone }) {
  await F.loadCatalog(); if (!F.V) await F.refresh();
  const m = market, id = m.id;
  const [me, vs] = await Promise.all([MP.rd(id, 'me'), MP.rd(id, 'vouchers')]);
  if (!me.ok) { toast(me.error, 'error'); return; }
  const mine = (vs.vouchers || []).filter(v => v.state === 'claimed');
  let st = { ship: 'reguler', address: me.addresses.find(a => a.isDefault)?.id || me.addresses[0]?.id, vouchers: [], method: null, source: null, tenor: 3, phase: 'form', idem: MP.newIdem('mpo'), q: null, err: null, res: null };
  const d = openDialog(`<div class="dlg-h"><h2>Checkout · ${esc(m.name)}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b checkout" data-co></div>`);
  const body = d.querySelector('[data-co]');

  const payOpts = () => {
    const acc = F.accounts().filter(a => a.kind === 'bank' || a.kind === 'wallet');
    const out = [];
    for (const k of m.methods) {
      if (k === 'saldo') out.push({ key: 'saldo', label: 'Saldo BizSim', ico: 'wallet', desc: 'Potong saldo rekening bank atau dompet digital.', sources: acc.map(a => ({ id: a.id, label: a.name, bal: a.balance })), reason: acc.length ? null : 'Belum punya rekening atau dompet. Buka di menu Keuangan.' });
      else if (k === 'paylater') out.push({ key: 'paylater', label: m.payLater, ico: 'repeat', desc: 'Bayar nanti atau cicil 1/3/6/12 bulan (ada biaya & bunga).', sources: [], reason: null });
      else if (k === 'wallet' || k === 'transfer' || k === 'qris' || k === 'credit' || k === 'debit' || k === 'cod') {
        if (k === 'wallet' && m.methods.includes('saldo')) continue;
        if (k === 'transfer' && m.methods.includes('saldo')) continue; // transfer/VA diwakili "Saldo BizSim" bila ada rekening; selain itu tersedia terpisah
        out.push(...options({ methods: [k] }));
      }
    }
    // Transfer bank / virtual account tetap ditawarkan sebagai metode tersendiri agar sesuai tuntutan fitur.
    if (m.methods.includes('transfer') && m.methods.includes('saldo')) out.splice(1, 0, ...options({ methods: ['transfer'] }));
    return out;
  };
  const needSrc = () => st.method && !['cod', 'paylater'].includes(st.method);
  const needPin = () => ['saldo', 'transfer', 'wallet', 'qris', 'credit', 'debit', 'paylater'].includes(st.method);
  async function requote() { const r = await MP.quote(id, { ship: st.ship, address: st.address, vouchers: st.vouchers, method: st.method || 'cod' }); if (r.ok) { st.q = r; st.err = null; } else { st.err = r.error; } }
  const canPay = () => st.phase === 'form' && st.q && !st.err && st.method && (!needSrc() || st.source) && (!needPin() || F.V?.pinSet);

  function resultHtml() {
    const r = st.res;
    if (r.ok) return `<div class="co-result ok">${icon('check')}<div><b>${st.method === 'cod' ? 'Pesanan dibuat — bayar saat diterima' : 'Pembayaran berhasil'}</b><p>${esc(r.msg || '')}</p>
      <dl class="dl"><dt>Jumlah pesanan</dt><dd>${r.orders.length} toko</dd><dt>Total</dt><dd>${rp(r.total)}</dd>${r.orders.map(o => `<dt>${esc(o.storeName || 'Toko')}</dt><dd class="mono">${esc(o.id)} · ${esc(o.fulLabel)}</dd>`).join('')}</dl>
      <p class="subtle sm">Pembayaran berhasil ≠ barang diterima. Pantau di Order Center; konfirmasi penerimaan agar barang masuk inventori.</p>
      <div class="dlg-f"><a class="btn primary" href="shop.html#pesanan">Buka Order Center</a><button class="btn ghost" data-close>Tutup</button></div></div></div>`;
    return `<div class="co-result fail">${icon('info')}<div><b>Pembayaran tidak berhasil</b><p>${esc(r.error || 'Gagal')}</p><p class="subtle sm">Tidak ada uang yang berpindah dan keranjang tidak berubah.</p><div class="dlg-f"><button class="btn primary" data-retry>Coba lagi</button><button class="btn ghost" data-close>Tutup</button></div></div></div>`;
  }
  function draw() {
    if (st.phase === 'done') { body.innerHTML = resultHtml(); return; }
    const q = st.q, T = q?.totals, locked = st.phase !== 'form', opts = payOpts(), cur = opts.find(o => o.key === st.method);
    body.innerHTML = `
      <fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Alamat pengiriman</legend>
        <select class="input" name="address">${me.addresses.map(a => `<option value="${a.id}" ${a.id === st.address ? 'selected' : ''}>${esc(a.label)} — ${esc(a.address)}, ${esc(a.city)}</option>`).join('')}</select></fieldset>
      <fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Pengiriman</legend><div class="seg-tabs">${Object.keys(SHIP).map(k => `<label class="pm"><input type="radio" name="ship" value="${k}" ${st.ship === k ? 'checked' : ''}><span><b>${SHIP[k]}</b><small>${k === 'ekspres' ? 'Lebih cepat, ongkir lebih tinggi' : 'Ongkir hemat'}</small></span></label>`).join('')}</div></fieldset>
      ${q ? q.orders.map(o => `<div class="panel"><div class="panel-b"><b>${esc(o.seller)}</b> <span class="muted sm">· ${esc(o.sellerCity)} · estimasi ${o.eta} hari</span>
        <table class="sum">${o.lines.map(l => `<tr><td>${l.qty}× ${esc(l.name)}</td><td>${rp(l.total)}</td></tr>`).join('')}<tr class="muted"><td>Ongkir ${o.shipDisc ? '(setelah gratis ongkir)' : ''}</td><td>${rp(o.shipping - o.shipDisc)}</td></tr></table></div></div>`).join('') : ''}
      ${mine.length ? `<fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Voucher (${esc(m.name)} — aturan tumpukan ditentukan server)</legend>${mine.map(v => `<label class="pm"><input type="checkbox" name="vc" value="${v.code}" ${st.vouchers.includes(v.code) ? 'checked' : ''}><span><b>${esc(v.label)}</b><small>${esc(v.code)} · min. belanja ${rp(v.min)}</small></span></label>`).join('')}</fieldset>` : `<p class="mp-note">${icon('ticket')}<span>Belum ada voucher yang diklaim. Klaim di halaman Voucher.</span></p>`}
      ${st.err ? `<div class="msg error">${icon('info')}<span>${esc(st.err)}</span></div>` : ''}
      <fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Metode pembayaran</legend><div style="display:grid;gap:8px">${opts.map(o => `<label class="pm ${o.reason ? 'off' : ''}"><input type="radio" name="m" value="${o.key}" ${st.method === o.key ? 'checked' : ''} ${o.reason ? 'disabled' : ''}><span class="ico">${icon(o.ico)}</span><span><b>${esc(o.label)}</b><small>${esc(o.reason || o.desc)}</small></span></label>`).join('')}</div></fieldset>
      ${cur && needSrc() ? `<fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Sumber dana</legend><div style="display:grid;gap:8px">${cur.sources.map(x => `<label class="pm"><input type="radio" name="s" value="${x.id}" ${st.source === x.id ? 'checked' : ''}><span><b>${esc(x.label)}</b><small>${x.balLabel || 'Saldo'} ${rp(x.bal)}</small></span></label>`).join('')}</div></fieldset>` : ''}
      ${st.method === 'paylater' && q?.paylater ? `<fieldset class="co-methods" ${locked ? 'disabled' : ''}><legend>Tenor cicilan</legend><div style="display:grid;gap:8px">${q.paylater.map(p => `<label class="pm"><input type="radio" name="tenor" value="${p.tenor}" ${st.tenor === p.tenor ? 'checked' : ''}><span><b>${p.tenor === 1 ? 'Bayar bulan depan' : p.tenor + ' bulan'} · ${rp(p.perMonth)}/bln</b><small>Biaya layanan ${rp(p.fee)}${p.interest ? ` · bunga ${rp(p.interest)} (${(p.rateMonth * 100).toLocaleString('id-ID')}%/bln)` : ' · tanpa bunga'} · total ${rp(p.total)}</small></span></label>`).join('')}</div></fieldset>` : ''}
      ${q ? `<table class="sum"><tr><td>Subtotal produk</td><td>${rp(T.subtotal)}</td></tr>${T.discount ? `<tr class="neg"><td>Diskon voucher</td><td>−${rp(T.discount)}</td></tr>` : ''}<tr><td>Ongkos kirim</td><td>${rp(T.shipping)}</td></tr>${T.shipDisc ? `<tr class="neg"><td>Potongan ongkir</td><td>−${rp(T.shipDisc)}</td></tr>` : ''}<tr><td title="${esc(q.svcRule)}">Biaya layanan ${esc(m.name)}</td><td>${rp(T.svc)}</td></tr>${T.cod ? `<tr><td>Biaya COD</td><td>${rp(T.cod)}</td></tr>` : ''}<tr class="tot"><td>Total bayar</td><td>${rp(T.total)}</td></tr>${T.cashback ? `<tr class="neg"><td>Cashback (cair saat pesanan selesai)</td><td>${rp(T.cashback)}</td></tr>` : ''}</table><p class="mp-note">${icon('info')}<span>${esc(q.svcRule)}</span></p>` : ''}
      ${needPin() && st.method && !F.V?.pinSet ? `<div class="msg error">${icon('info')}<span>Buat PIN transaksi dulu di <a href="finance.html">Keuangan</a>.</span></div>` : ''}
      ${needPin() && st.method && F.V?.pinSet && (!needSrc() || st.source) ? `<label class="field co-pin"><span>PIN transaksi (6 digit)</span><input name="pin" class="input" type="password" inputmode="numeric" autocomplete="off" maxlength="6"></label>` : ''}
      ${st.phase === 'proc' ? `<div class="msg info" role="status">${icon('clock')}<span>Memproses di server… Jangan tutup halaman.</span></div>` : ''}
      <div class="dlg-f"><button class="btn ghost" data-close ${locked ? 'disabled' : ''}>Batal</button><button class="btn primary" data-pay ${canPay() ? '' : 'disabled'}>${st.phase === 'proc' ? 'Memproses…' : !q ? 'Memuat…' : st.method === 'cod' ? 'Buat pesanan COD' : st.method === 'paylater' ? 'Bayar dengan PayLater' : `Bayar ${rp(T.total)}`}</button></div>`;
  }
  body.addEventListener('change', async e => {
    const n = e.target.name; if (n === 'pin') return; // jangan render ulang saat PIN selesai diketik (akan menghapus isian)
    if (n === 'address') st.address = e.target.value;
    if (n === 'ship') st.ship = e.target.value;
    if (n === 'vc') st.vouchers = [...body.querySelectorAll('[name=vc]:checked')].map(x => x.value);
    if (n === 'm') { st.method = e.target.value; const o = payOpts().find(x => x.key === st.method); st.source = o?.sources?.length === 1 ? o.sources[0].id : null; }
    if (n === 's') st.source = e.target.value;
    if (n === 'tenor') st.tenor = Number(e.target.value);
    if (['address', 'ship', 'vc', 'm'].includes(n)) await requote();
    draw();
  });
  body.addEventListener('input', e => { if (e.target.name === 'pin') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
  body.addEventListener('click', async e => {
    if (e.target.closest('[data-retry]')) { st = { ...st, phase: 'form', res: null, idem: MP.newIdem('mpo') }; await requote(); draw(); return; }
    if (!e.target.closest('[data-pay]') || !canPay()) return;
    const pin = body.querySelector('[name=pin]')?.value || '';
    if (needPin() && !/^\d{6}$/.test(pin)) { toast('Masukkan PIN 6 digit.', 'error'); return; }
    st.phase = 'proc'; draw();
    const r = await MP.checkout(id, { idem: st.idem, ship: st.ship, address: st.address, vouchers: st.vouchers, method: st.method, source: st.source, tenor: st.tenor, pin });
    st.res = r; st.phase = 'done';
    if (r.ok) { if (['saldo', 'transfer', 'wallet', 'qris', 'credit', 'debit'].includes(st.method)) E.recordExpense?.('belanja', r.total); try { onDone?.(r); } catch (err) { console.error(err); } }
    draw();
  });
  d.addEventListener('cancel', e => { if (st.phase === 'proc') e.preventDefault(); });
  const first = payOpts().find(o => !o.reason); if (first) { st.method = first.key; st.source = first.sources?.length === 1 ? first.sources[0].id : null; }
  await requote(); draw(); return d;
}
