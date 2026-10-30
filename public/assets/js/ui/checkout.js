// CHECKOUT BIZSIM — satu dialog pembayaran untuk semua merchant simulasi.
// Harga & total dari server (/api/fin/quote). Metode yang tampil hanya yang diterima merchant.
// Hasil "Berhasil" hanya ditampilkan setelah server mengonfirmasi; tombol dikunci selama proses; kunci idempoten per dialog.
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import { rp, esc, icon, openDialog, toast } from './ui.js';

const METHOD = {
  cash: { label: 'Tunai', ico: 'wallet', desc: 'Mengurangi uang tunai.' },
  debit: { label: 'Kartu debit', ico: 'card', desc: 'Langsung mengurangi saldo rekening.' },
  credit: { label: 'Kartu kredit', ico: 'card', desc: 'Menambah tagihan kartu (utang).' },
  qris: { label: 'QRIS', ico: 'qr', desc: 'Scan kode merchant, bayar dari dompet digital atau m-banking.' },
  wallet: { label: 'Dompet digital', ico: 'wallet', desc: 'Mengurangi saldo dompet.' },
  transfer: { label: 'Transfer bank / VA', ico: 'bank', desc: 'Transfer dari rekening ke virtual account merchant.' },
  cod: { label: 'Bayar di tempat (COD)', ico: 'truck', desc: 'Tunai saat pesanan tiba. Status Pending sampai diterima.' },
};
const QRIS_STEPS = ['Pilih QRIS', 'Sumber dana', 'Konfirmasi jumlah', 'Verifikasi saldo & PIN', 'Proses', 'Hasil', 'Tercatat'];
const STEPS = ['Metode', 'Sumber dana', 'Konfirmasi', 'PIN', 'Proses', 'Hasil'];

/** Kelompokkan metode merchant (mis. 'wallet:ovio') menjadi pilihan + daftar sumber dana. */
export function options(m) {
  const out = []; const acc = F.accounts();
  const walletIds = m.methods.filter(x => x.startsWith('wallet')).map(x => x.split(':')[1] || '*');
  for (const key of m.methods) {
    if (key.startsWith('wallet')) continue;
    let sources = [], reason = null;
    if (key === 'debit') { sources = acc.filter(a => a.kind === 'bank' && F.cardOf(a.id)).map(a => ({ id: a.id, label: `${a.name} •••• ${F.cardOf(a.id).last4}`, bal: a.balance, note: F.cardOf(a.id).status !== 'aktif' ? `Kartu ${F.cardOf(a.id).status}` : null })); if (!sources.length) reason = 'Belum punya rekening dengan kartu debit.'; }
    if (key === 'credit') { sources = acc.filter(a => a.kind === 'credit').map(a => ({ id: a.id, label: `${a.name} •••• ${F.cardOf(a.id)?.last4 || ''}`, bal: a.available, balLabel: 'Limit tersedia' })); if (!sources.length) reason = 'Belum punya kartu kredit (syarat usia 21+, riwayat pendapatan).'; }
    if (key === 'qris') { sources = acc.filter(a => (a.kind === 'wallet' && F.wallet(a.provider)?.qris) || a.kind === 'bank').map(a => ({ id: a.id, label: a.kind === 'bank' ? `m-banking ${a.name}` : a.name, bal: a.balance })); if (!sources.length) reason = 'QRIS butuh dompet digital atau rekening bank aktif.'; }
    if (key === 'transfer') { sources = acc.filter(a => a.kind === 'bank').map(a => ({ id: a.id, label: a.name, bal: a.balance })); if (!sources.length) reason = 'Belum punya rekening bank.'; }
    out.push({ key, ...METHOD[key], sources, reason });
  }
  if (walletIds.length) {
    const sources = acc.filter(a => a.kind === 'wallet' && (walletIds.includes('*') || walletIds.includes(a.provider))).map(a => ({ id: a.id, label: a.name, bal: a.balance }));
    const names = walletIds.includes('*') ? 'semua dompet digital' : walletIds.map(id => F.wallet(id)?.name).join(' / ');
    out.push({ key: 'wallet', ...METHOD.wallet, desc: `Diterima: ${names}.`, sources, reason: sources.length ? null : `Aktifkan ${names} di Keuangan › Dompet digital.` });
  }
  return out;
}

export async function openCheckout({ merchant: mid, items, title, onSuccess, note }) {
  await F.loadCatalog(); if (!F.V) await F.refresh();
  const m = F.merchant(mid); if (!m) { toast('Merchant tidak dikenal.', 'error'); return; }
  const q0 = await F.quote({ merchant: mid, items });
  if (!q0.ok) { toast(q0.error, 'error'); return; }
  let st = { method: null, source: null, phase: 'form', idem: F.newIdem('pay'), res: null, q: q0 };
  const opts = options(m);
  const d = openDialog(`<div class="dlg-h"><h2>${esc(title || 'Pembayaran')}</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b checkout" data-co></div>`, { wide: false });
  const body = d.querySelector('[data-co]');
  const needSrc = () => st.method && st.method !== 'cash' && st.method !== 'cod';
  const stepIdx = () => st.phase === 'done' ? (st.res?.ok ? 6 : 5) : st.phase === 'proc' ? 4 : !st.method ? 0 : needSrc() && !st.source ? 1 : 3;
  function draw() {
    const q = st.q, isQ = st.method === 'qris', steps = isQ ? QRIS_STEPS : STEPS, si = Math.min(stepIdx(), steps.length - 1);
    const o = opts.find(x => x.key === st.method), src = o?.sources.find(s => s.id === st.source);
    const locked = st.phase !== 'form';
    const pinNeeded = needSrc() && !(st.method === 'cash');
    body.innerHTML = `
      <div class="co-merchant"><div><b>${esc(m.name)}</b><div class="muted sm">Jam layanan ${F.hoursText(m)}</div></div>${q.open ? '<span class="chip pos">Buka</span>' : '<span class="chip neg">Tutup</span>'}</div>
      <ol class="co-steps" aria-label="Tahap pembayaran">${steps.map((s, i) => `<li class="${i < si ? 'done' : i === si ? 'cur' : ''}">${esc(s)}</li>`).join('')}</ol>
      <table class="table co-lines"><tbody>${q.lines.map(l => `<tr><td>${l.qty}× ${esc(l.name)}</td><td class="num">${rp(l.total)}</td></tr>`).join('')}${q.fees.map(f => `<tr class="muted"><td>${esc(f.label)}</td><td class="num">${rp(f.amount)}</td></tr>`).join('')}<tr class="co-total"><td>Total (dihitung server)</td><td class="num">${rp(q.total)}</td></tr></tbody></table>
      ${note ? `<p class="muted sm">${esc(note)}</p>` : ''}
      ${!q.open ? `<div class="msg error">${icon('info')}<span>${esc(m.name)} sedang tutup. Jam layanan ${F.hoursText(m)}.</span></div>` : ''}
      ${st.phase === 'done' ? resultHtml() : `
      <fieldset class="co-methods" ${locked || !q.open ? 'disabled' : ''}><legend>Metode yang diterima ${esc(m.name)}</legend>
        ${opts.map(x => `<label class="co-m ${x.reason ? 'off' : ''}"><input type="radio" name="m" value="${x.key}" ${st.method === x.key ? 'checked' : ''} ${x.reason ? 'disabled' : ''}><span class="ico">${icon(x.ico)}</span><span><b>${x.label}</b><small>${esc(x.reason || x.desc)}</small></span>${x.key === 'cash' ? `<span class="num sm">${rp(E.S.player.balance)}</span>` : ''}</label>`).join('')}
      </fieldset>
      ${o && needSrc() ? `<fieldset class="co-src" ${locked ? 'disabled' : ''}><legend>Sumber dana</legend>${o.sources.map(s => `<label class="co-m"><input type="radio" name="s" value="${s.id}" ${st.source === s.id ? 'checked' : ''}><span><b>${esc(s.label)}</b><small>${s.balLabel || 'Saldo'} ${rp(s.bal)}${s.note ? ' · ' + esc(s.note) : ''}</small></span>${s.bal < q.total ? '<span class="chip warn">Kurang</span>' : ''}</label>`).join('')}</fieldset>` : ''}
      ${st.method === 'cash' && E.S.player.balance < q.total ? `<div class="msg error">${icon('info')}<span>Uang tunai ${rp(E.S.player.balance)} — kurang ${rp(q.total - E.S.player.balance)}.</span></div>` : ''}
      ${pinNeeded && (st.source || st.method === 'wallet') ? (F.V?.pinSet ? `<label class="field co-pin"><span>PIN transaksi (6 digit)</span><input name="pin" class="input" type="password" inputmode="numeric" autocomplete="off" maxlength="6" pattern="\\d{6}" ${locked ? 'disabled' : ''}></label>` : `<div class="msg info">${icon('lock')}<span>Buat PIN transaksi dulu di <a href="finance.html#ringkasan">Keuangan › Ringkasan</a>.</span></div>`) : ''}
      ${st.phase === 'proc' ? `<div class="msg info" role="status">${icon('clock')}<span>Memproses di server… Jangan tutup halaman. Status belum final.</span></div>` : ''}
      <div class="dlg-f"><button class="btn ghost" data-close ${locked ? 'disabled' : ''}>Batal</button><button class="btn primary" data-pay ${canPay() ? '' : 'disabled'}>${st.phase === 'proc' ? 'Memproses…' : `Bayar ${rp(q.total)}`}</button></div>`}`;
  }
  function canPay() { if (st.phase !== 'form' || !st.q.open || !st.method) return false; if (needSrc() && !st.source) return false; if (needSrc() && !F.V?.pinSet) return false; return true; }
  function resultHtml() {
    const r = st.res, t = r.txn;
    if (r.ok) return `<div class="co-result ok">${icon('check')}<div><b>${t?.status === 'pending' ? 'Pesanan dibuat — pembayaran Pending' : 'Pembayaran berhasil'}</b><p>${esc(r.msg || '')}</p><dl class="dl"><dt>ID transaksi</dt><dd class="mono">${esc(t?.id || '-')}</dd><dt>Status server</dt><dd>${t?.status === 'pending' ? 'Pending' : 'Berhasil'}</dd><dt>Dicatat</dt><dd>Riwayat transaksi Keuangan</dd></dl></div></div><div class="dlg-f"><a class="btn ghost" href="finance.html#riwayat">Lihat riwayat</a><button class="btn primary" data-close>Selesai</button></div>`;
    return `<div class="co-result fail">${icon('info')}<div><b>Pembayaran ${t ? 'ditolak' : 'tidak diproses'}</b><p>${esc(r.error || 'Gagal')}</p>${t ? `<dl class="dl"><dt>ID transaksi</dt><dd class="mono">${esc(t.id)}</dd><dt>Status server</dt><dd>Gagal — tidak ada dana yang berpindah</dd></dl>` : ''}</div></div><div class="dlg-f"><button class="btn ghost" data-close>Tutup</button><button class="btn primary" data-retry>Coba metode lain</button></div>`;
  }
  body.addEventListener('change', e => {
    if (e.target.name === 'm') { st.method = e.target.value; const o = opts.find(x => x.key === st.method); st.source = o.sources.length === 1 ? o.sources[0].id : null; draw(); }
    if (e.target.name === 's') { st.source = e.target.value; draw(); }
  });
  body.addEventListener('input', e => { if (e.target.name === 'pin') e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); });
  body.addEventListener('click', async e => {
    if (e.target.closest('[data-retry]')) { st = { ...st, phase: 'form', res: null, idem: F.newIdem('pay') }; draw(); return; }
    if (!e.target.closest('[data-pay]') || st.phase !== 'form') return;
    const pin = body.querySelector('[name=pin]')?.value || '';
    if (needSrc() && !/^\d{6}$/.test(pin)) { toast('Masukkan PIN 6 digit.', 'error'); return; }
    st.phase = 'proc'; draw();
    const r = await F.pay({ idem: st.idem, merchant: mid, items, method: st.method, source: st.source, pin });
    st.res = r; st.phase = 'done';
    if (r.ok) {
      if (st.method !== 'cash' && st.method !== 'cod') E.recordExpense(m.cat === 'transport' ? 'transport' : m.cat === 'kesehatan' ? 'kesehatan' : m.cat === 'belanja' ? 'belanja' : m.cat === 'hiburan' ? 'hiburan' : 'makan', st.q.total);
      try { onSuccess?.(r); } catch (err) { console.error(err); }
    }
    // gagal karena validasi (bukan transaksi tercatat): kembalikan ke form dengan kunci baru
    if (!r.ok && !r.txn) { st.phase = 'done'; }
    draw();
  });
  // Cegah menutup dialog dengan Escape saat memproses (hasil tetap tercatat di server).
  d.addEventListener('cancel', e => { if (st.phase === 'proc') e.preventDefault(); });
  draw();
  return d;
}
