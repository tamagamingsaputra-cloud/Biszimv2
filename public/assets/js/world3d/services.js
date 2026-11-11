// LAYANAN 3D MANDIRI — panel native di dalam dunia 3D (tanpa pindah ke halaman 2D).
// Tidak ada logika/ekonomi baru: semua aksi memanggil engine yang SAMA dengan 2D (needs.js, finance.js, checkout.js).
import * as E from '../engine/core.js';
import * as F from '../engine/finance.js';
import { HOME_ACTIONS } from '../data/needs-rules.js';
import { openCheckout } from '../ui/checkout.js';
import * as CAL from '../engine/calendar.js';
import * as AG from '../engine/agenda.js';
import { post } from '../ui/api.js';
import { esc, ic } from './ui3d.js';

const NE = E.NE;
const rp = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const fxText = fx => Object.entries(fx || {}).filter(([, v]) => v).map(([k, v]) => `${NE.needDef(k)?.short || k} ${v > 0 ? '+' : ''}${v}`).join(' · ');
const why = (min = 0) => NE.blockedReason() || (min ? NE.overlapReason(min) : null);
const btn = (attrs, label, reason, primary) => reason
  ? `<button class="k-btn" disabled title="${esc(reason)}">${label}</button><small class="k-why">${esc(reason)}</small>`
  : `<button class="k-btn${primary ? ' pri' : ''}" ${attrs}>${label}</button>`;
const row = (title, sub, right) => `<div class="k-li k-row3"><span><b>${esc(title)}</b><small>${esc(sub)}</small></span><span class="k-rt">${right}</span></div>`;

function activityHtml() {
  const a = NE.activityProgress(); if (!a) return '';
  return `<div class="k-note" role="status"><b>Sedang: ${esc(a.label)}</b> — ${Math.round(a.pct * 100)}% · sisa ${Math.ceil(a.leftSec / 60)} menit game</div>`;
}
function merchantItems(mid, filter) {
  const m = F.merchant(mid); if (!m || !F.CAT) return `<p class="k-note">Katalog belum termuat. Periksa koneksi lalu buka lagi.</p>`;
  const open = F.openNow(m), travel = m.travelMin || 0;
  const items = F.CAT.ITEMS.filter(i => i.merchant === mid && (!filter || filter(i)));
  return `<div class="k-sec">${esc(m.name)} · ${open ? 'Buka' : 'Tutup'} (${esc(F.hoursText(m))})</div>` + items.map(it => {
    const total = (it.min || 0) + (it.stock || it.delivery || it.ship ? 0 : travel * 2);
    const reason = !open ? `${m.name} tutup.` : why(total);
    const sub = `${it.stock ? 'Masuk inventori' : it.ship ? `Dikirim ${it.ship[0]}–${it.ship[1]} hari` : `${total} menit`}${fxText(it.fx) ? ' · ' + fxText(it.fx) : ''}`;
    return row(it.name, sub, `<b>${rp(it.price)}</b>${btn(`data-buy="${esc(it.id)}"`, 'Beli', reason)}`);
  }).join('');
}
async function buy(id, ctx) {
  const it = F.item(id), m = it && F.merchant(it.merchant); if (!it || !m) { ctx.toast('Barang tidak ditemukan.'); return; }
  const travel = m.travelMin || 0;
  await openCheckout({ merchant: m.id, items: [{ id, qty: 1 }], title: `${m.name} — ${it.name}`, onSuccess: r => {
    if (r.order) { ctx.toast('Pesanan dibuat.'); return; }
    if (it.stock) { NE.addInventory(it, 1); E.save(); ctx.toast(`${it.name} masuk inventori.`); return; }
    const res = NE.start({ kind: 'beli', label: `${it.name} di ${m.name}`, min: (it.min || 0) + travel * 2, fx: it.fx, source: r.txn?.id });
    if (res.ok) ctx.toast(res.msg);
  } });
}
const needsHtml = keys => keys.map(k => { const d = NE.needDef(k); if (!d) return ''; const v = Math.round(NE.value(k)), lv = NE.level(k); return `<div class="k-need"><span>${esc(d.label)}</span><div class="k-bar"><i class="${lv}" style="width:${Math.max(0, Math.min(100, v))}%"></i></div><b>${v}</b></div>`; }).join('');
const invHtml = filter => { const inv = Object.entries(E.S.life.inventory).filter(([, v]) => !filter || filter(v)); return inv.length ? inv.map(([key, v]) => row(v.name, `Jumlah ${v.uses ?? v.qty}`, v.kind === 'konsumsi' ? btn(`data-eat="${esc(key)}"`, 'Pakai', why(v.min || 5)) : '')).join('') : `<p class="k-note">Inventori kosong untuk kategori ini.</p>`; };

export const SERVICES = {
  home: {
    title: 'Rumah Kamu', icon: 'home',
    html: () => {
      const eat = F.item('rumah-makan'), age = E.ageYears(), price = age < 18 ? 0 : eat?.price || 0;
      const homeOpen = F.openNow(F.merchant('rumah'));
      return `${activityHtml()}<div class="k-sec">Kebutuhan</div>${needsHtml(['energy', 'hunger', 'thirst', 'hygiene', 'bladder', 'mood', 'stress', 'health'])}
      <div class="k-sec">Makan di rumah</div>${eat ? row('Makan di rumah', `${eat.min} menit · ${fxText(eat.fx)} · ${price ? rp(price) : 'ditanggung wali'}`, btn('data-homemeal', 'Makan', why(eat.min) || (!homeOpen ? 'Dapur rumah tutup.' : null), true)) : ''}
      <div class="k-sec">Istirahat & kebersihan</div>${HOME_ACTIONS.map(a => {
        const reason = why(a.min) || (a.uses && NE.invCount(a.uses) <= 0 ? 'Sabun & sampo habis.' : null);
        return row(a.label, `${a.min} menit · ${fxText(a.fx) || 'pemulihan seperti tidur'}`, btn(`data-home="${a.id}"`, 'Mulai', reason));
      }).join('')}
      <div class="k-sec">Inventaris rumah</div>${invHtml()}`;
    },
    bind: (el, ctx) => el.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.home) ctx.res(NE.homeAction(t.dataset.home));
      else if (t.dataset.eat) ctx.res(NE.consume(t.dataset.eat));
      else if (t.hasAttribute('data-homemeal')) {
        const it = F.item('rumah-makan');
        if (E.ageYears() < 18) ctx.res(NE.start({ kind: 'makan', label: 'Makan di rumah', min: it.min, fx: it.fx }));
        else { await openCheckout({ merchant: 'rumah', items: [{ id: 'rumah-makan', qty: 1 }], title: 'Makan di rumah', onSuccess: () => ctx.res(NE.start({ kind: 'makan', label: 'Makan di rumah', min: it.min, fx: it.fx })) }); ctx.refresh(); }
      }
    }),
  },
  warung: {
    title: 'Warung Makan Bu Sri', icon: 'food',
    html: () => `${activityHtml()}${needsHtml(['hunger', 'thirst', 'energy'])}${merchantItems('warung')}`,
    bind: (el, ctx) => el.addEventListener('click', async e => { const t = e.target.closest('[data-buy]'); if (!t) return; await buy(t.dataset.buy, ctx); ctx.refresh(); }),
  },
  minimarket: {
    title: 'Toko Lokal', icon: 'cart',
    html: () => `${activityHtml()}${merchantItems('serbamart')}<div class="k-sec">Inventori konsumsi</div>${invHtml(v => v.kind === 'konsumsi')}`,
    bind: (el, ctx) => el.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.buy) { await buy(t.dataset.buy, ctx); ctx.refresh(); } else if (t.dataset.eat) ctx.res(NE.consume(t.dataset.eat));
    }),
  },
  clinic: {
    title: 'Klinik & Apotek', icon: 'hospital',
    html: () => { const hv = Math.round(NE.value('health')), lv = NE.level('health'); return `${activityHtml()}<div class="k-sec">Kesehatan</div>${needsHtml(['health'])}<p class="k-note">${esc(NE.needDef('health').effect)}</p>${merchantItems('klinik')}${merchantItems('apotek')}<div class="k-sec">Vitamin di inventori</div>${invHtml(v => v.id === 'vitamin')}`; },
    bind: (el, ctx) => el.addEventListener('click', async e => {
      const t = e.target.closest('button'); if (!t) return;
      if (t.dataset.buy) { await buy(t.dataset.buy, ctx); ctx.refresh(); } else if (t.dataset.eat) ctx.res(NE.consume(t.dataset.eat));
    }),
  },
};

// ——— Karier: Balai Kerja (memakai E.takeGig / E.apply / E.submitEvaluation / E.acceptOffer / E.resign yang sama dengan 2D) ———
const ST = { evalApp: null };
const APP_LABEL = { dikirim: 'Dikirim', ditinjau: 'Ditinjau HR', evaluasi: 'Perlu evaluasi', menunggu: 'Menunggu keputusan', tawaran: 'Tawaran kerja', diterima: 'Diterima', ditolak: 'Tidak lolos', 'ditolak-pemain': 'Kamu tolak' };
const ACTIVE_APP = ['dikirim', 'ditinjau', 'evaluasi', 'menunggu', 'tawaran'];
function evalHtml() {
  const a = E.S.career.applications.find(x => x.id === ST.evalApp); if (!a) { ST.evalApp = null; return ''; }
  const j = E.jobById(a.jobId), qs = E.EVALUATIONS[j.evaluation];
  return `<div class="k-sec">${j.evaluation === 'interview' ? 'Interview' : 'Tes skill'} — ${esc(j.title)}</div><p class="k-note">Skor dihitung dari jawaban dan level skill. Tidak menjamin diterima.</p>` +
    qs.map((q, i) => `<fieldset class="k-q"><legend>${i + 1}. ${esc(q.q)}</legend>${q.a.map((t, k) => `<label><input type="radio" name="q${i}" value="${k}"> ${esc(t)}</label>`).join('')}</fieldset>`).join('') +
    `<div class="k-rt" style="justify-items:start"><button class="k-btn pri" data-evsend>Kirim jawaban</button><button class="k-btn" data-evcancel>Nanti</button></div>`;
}
function careerHtml() {
  if (ST.evalApp != null) return evalHtml();
  const c = E.S.career, jobNow = c.job && E.jobById(c.job.jobId), gigs = E.JOB_CATALOG.filter(j => j.type === 'gig'), openings = E.JOB_CATALOG.filter(j => j.type !== 'gig' && c.job?.jobId !== j.id);
  const apps = c.applications.filter(a => ACTIVE_APP.includes(a.status));
  return `<div class="k-sec">Pekerjaan aktif</div>` + (jobNow ? row(jobNow.title, `${jobNow.company} · Rp ${E.fmt(jobNow.pay)} · ${c.job.daysWorked} hari kerja · kinerja ${Math.round(c.job.perf)}`, btn('data-resign', 'Resign', null)) : '<p class="k-note">Belum bekerja.</p>') +
    (c.gigToday ? `<p class="k-note">Shift lepas hari ini: ${esc(E.jobById(c.gigToday)?.title || '')}.</p>` : '') +
    `<div class="k-sec">Lamaran berjalan</div>` + (apps.length ? apps.map(a => { const j = E.jobById(a.jobId); const act = a.status === 'evaluasi' ? btn(`data-eval="${a.id}"`, 'Mulai', null, true) : a.status === 'tawaran' ? `${btn(`data-offer="${a.id}"`, 'Terima', null, true)}${btn(`data-decline="${a.id}"`, 'Tolak', null)}` : ''; return row(j.title, `${j.company} · ${APP_LABEL[a.status] || a.status}`, act); }).join('') : '<p class="k-note">Belum ada lamaran berjalan.</p>') +
    `<div class="k-sec">Kerja lepas (shift harian)</div>` + gigs.map(j => { const r = E.jobRequirements(j); return row(j.title, `${j.company} · Rp ${E.fmt(j.pay)}${r.length ? ' · ' + r[0] : ''}`, btn(`data-gig="${j.id}"`, 'Ambil shift', r[0] || null)); }).join('') +
    `<div class="k-sec">Lowongan</div>` + openings.map(j => { const r = E.jobRequirements(j), pending = apps.some(a => a.jobId === j.id); const est = E.acceptanceEstimate(j); return row(j.title, `${j.company} · Rp ${E.fmt(j.pay)} · peluang ${est.band}${r.length ? ' · ' + r[0] : ''}`, btn(`data-apply="${j.id}"`, pending ? 'Diproses' : 'Lamar', pending ? 'Lamaran sedang diproses.' : r.length ? r[0] : null)); }).join('');
}
// ——— Bursa: trading memakai E.tradeQuote / E.trade (satu portofolio, satu saldo) ———
const ST2 = { q: {} };
function bursaHtml() {
  const rows = E.MARKET_ASSETS.map(a => { const pos = E.S.trading.positions[a.symbol], held = pos?.units || 0, q = E.tradeQuote(a.symbol, 'buy', a.minQty), qty = ST2.q[a.symbol] ?? a.minQty;
    return `<div class="k-li k-row3"><span><b>${esc(a.symbol)} · ${esc(a.name)}</b><small>Harga Rp ${E.fmt(q.price)} per ${a.class === 'saham' ? 'lembar' : esc(a.unit)} · dimiliki ${esc(E.fmtQty(a, held))}</small></span><span class="k-rt"><input class="k-qty" type="number" inputmode="decimal" data-qty="${esc(a.symbol)}" min="${a.minQty}" step="${a.step}" value="${qty}" aria-label="Jumlah ${esc(a.symbol)} (${esc(a.unit)})"><span><button class="k-btn pri" data-trade="buy:${esc(a.symbol)}">Beli</button> <button class="k-btn" data-trade="sell:${esc(a.symbol)}">Jual</button></span></span></div>`; });
  return `<p class="k-note">Saldo tunai <b>${rp(E.S.player.balance)}</b> · nilai trading ${rp(E.tradingValue())}. Harga simulasi.</p>` + rows.join('');
}
Object.assign(SERVICES, {
  office: {
    title: 'Balai Kerja', icon: 'briefcase', html: careerHtml,
    bind: (el, ctx) => {
      el.addEventListener('click', e => {
        const t = e.target.closest('button'); if (!t) return;
        if (t.dataset.gig) ctx.res(E.takeGig(t.dataset.gig));
        else if (t.dataset.apply) ctx.res(E.apply(t.dataset.apply));
        else if (t.dataset.offer) ctx.res(E.acceptOffer(+t.dataset.offer));
        else if (t.dataset.decline) ctx.res(E.declineOffer(+t.dataset.decline));
        else if (t.hasAttribute('data-resign')) ctx.res(E.resign());
        else if (t.dataset.eval) { ST.evalApp = +t.dataset.eval; ctx.refresh(); }
        else if (t.hasAttribute('data-evcancel')) { ST.evalApp = null; ctx.refresh(); }
        else if (t.hasAttribute('data-evsend')) {
          const a = E.S.career.applications.find(x => x.id === ST.evalApp), qs = E.EVALUATIONS[E.jobById(a.jobId).evaluation];
          const ans = qs.map((_, i) => { const r = el.querySelector(`input[name="q${i}"]:checked`); return r ? +r.value : null; });
          if (ans.includes(null)) { ctx.toast('Jawab semua pertanyaan.'); return; }
          const r = E.submitEvaluation(ST.evalApp, ans); if (r.ok) ST.evalApp = null; ctx.res(r);
        }
      });
    },
  },
  bursa: {
    title: 'Bursa & Properti', icon: 'chart', html: bursaHtml,
    bind: (el, ctx) => {
      el.addEventListener('input', e => { const q = e.target.closest('[data-qty]'); if (q) ST2.q[q.dataset.qty] = parseFloat(q.value); });
      el.addEventListener('click', e => { const t = e.target.closest('[data-trade]'); if (!t) return; const [side, sym] = t.dataset.trade.split(':'); const qty = ST2.q[sym] ?? E.assetBySym(sym).minQty; ctx.res(E.trade(sym, side, qty)); });
    },
  },
});

// ——— Bank: memakai endpoint /api/fin/* yang sama (PIN, buka rekening, transfer/setor/tarik) lewat engine/finance.js ———
const acctName = id => id === 'cash' ? 'Uang tunai' : F.accounts().find(a => a.id === id)?.name || id;
const pinField = `<input class="k-qty" name="pin" type="password" inputmode="numeric" maxlength="6" autocomplete="off" placeholder="PIN 6 digit" aria-label="PIN transaksi" style="width:130px">`;
function bankHtml() {
  if (!F.V || !F.CAT) return `<p class="k-note">Data keuangan belum termuat. Periksa koneksi lalu buka lagi.</p>`;
  const accs = F.accounts(), movable = accs.filter(a => a.kind !== 'credit'), t = F.totals?.() || {};
  const opts = (list, sel) => list.map(o => `<option value="${esc(o.id)}"${o.id === sel ? ' selected' : ''}>${esc(o.name)}${o.balance != null ? ' — ' + rp(o.balance) : ''}</option>`).join('');
  const src = [{ id: 'cash', name: 'Uang tunai', balance: E.S.player.balance }, ...movable];
  const banks = F.CAT.BANKS.filter(b => !accs.some(a => a.kind === 'bank' && a.provider === b.id));
  return `<p class="k-note">Uang tunai <b>${rp(E.S.player.balance)}</b>${t.total != null ? ` · total aset ${rp(t.total)}` : ''}</p>
  <div class="k-sec">Rekening & dompet</div>${accs.length ? accs.map(a => row(a.name, a.kind === 'credit' ? `Limit tersedia ${rp(a.available)}` : a.kind === 'bank' ? 'Rekening bank' : 'Dompet digital', `<b>${rp(a.kind === 'credit' ? a.limit - a.available : a.balance)}</b>`)).join('') : '<p class="k-note">Belum punya rekening.</p>'}
  ${F.V.pinSet ? '' : `<div class="k-sec">Buat PIN transaksi</div><form class="k-form" data-kform="pin"><input class="k-qty" name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6 digit" aria-label="PIN baru" style="width:130px"><button class="k-btn pri">Simpan PIN</button></form><p class="k-note">PIN dipakai untuk debit, QRIS, dompet, dan transfer.</p>`}
  <div class="k-sec">Buka rekening bank</div>${banks.length ? `<form class="k-form" data-kform="open"><select class="k-qty" name="provider" style="width:100%">${banks.map(b => `<option value="${esc(b.id)}">${esc(b.name)} — min ${rp(b.minOpen)}</option>`).join('')}</select><input class="k-qty" name="initial" type="number" inputmode="numeric" min="0" placeholder="Setoran awal (Rp)" aria-label="Setoran awal"><div class="k-rt" style="justify-items:start">${pinField}<button class="k-btn pri">Buka rekening</button></div></form>` : '<p class="k-note">Semua bank sudah dibuka.</p>'}
  <div class="k-sec">Transfer, setor & tarik</div>${movable.length ? `<form class="k-form" data-kform="transfer"><label class="k-fl">Dari<select class="k-qty" name="from" style="width:100%">${opts(src, 'cash')}</select></label><label class="k-fl">Ke<select class="k-qty" name="to" style="width:100%">${opts(src.filter(x => x.id !== 'cash' || true), movable[0].id)}</select></label><input class="k-qty" name="amount" type="number" inputmode="numeric" min="1" placeholder="Jumlah (Rp)" aria-label="Jumlah"><div class="k-rt" style="justify-items:start">${pinField}<button class="k-btn pri">Kirim</button></div></form>` : '<p class="k-note">Buka rekening dulu untuk transfer.</p>'}
  <div class="k-sec">Riwayat terakhir</div>${(F.V.tx || []).slice(0, 8).map(x => row(x.label || x.kind, `${x.kind} · ${x.status}`, `<b>${rp(x.amount)}</b>`)).join('') || '<p class="k-note">Belum ada transaksi.</p>'}`;
}
SERVICES.bank = {
  title: 'Bank Desa', icon: 'bank', html: bankHtml,
  bind: (el, ctx) => el.addEventListener('submit', async e => {
    e.preventDefault(); const form = e.target.closest('[data-kform]'); if (!form) return; const k = form.dataset.kform, v = n => form.elements[n]?.value, pin = v('pin') || '', b = form.querySelector('button');
    if (!/^\d{6}$/.test(pin)) { ctx.toast('Masukkan PIN 6 digit.'); return; }
    b.disabled = true; let r;
    try {
      if (k === 'pin') r = await F.call('/api/fin/pin', { pin, oldPin: '' });
      else if (k === 'open') r = await F.call('/api/fin/open', { idem: F.newIdem('open'), kind: 'bank', provider: v('provider'), initial: Number(v('initial')), pin });
      else if (k === 'transfer') { if (v('from') === v('to')) { ctx.toast('Asal dan tujuan harus berbeda.'); b.disabled = false; return; } r = await F.transfer({ idem: F.newIdem('tf'), from: v('from'), to: v('to'), amount: Number(v('amount')), pin }); }
    } catch { r = { ok: false, error: 'Koneksi gagal. Coba lagi.' }; }
    ctx.res(r?.ok ? { ok: true, msg: r.msg || 'Berhasil.' } : { ok: false, error: r?.error || 'Gagal.' });
  }),
};

// ——— Balai Desa: jadwal & agenda dari engine/agenda.js + kontrol waktu (Core yang sama) ———
function balaiHtml() {
  const d = E.dayNow(), plan = AG.dayPlan(d), evs = AG.eventsBetween(d, d + 7), sec = E.secOfDay();
  const hh = h => `${CAL.pad2(Math.floor(h))}:${CAL.pad2(Math.round((h % 1) * 60))}`;
  return `<p class="k-note"><b>${esc(CAL.fmtDay(d, 'long'))}</b> · ${CAL.fmtHM(sec)}${E.S.settings.paused ? ' · waktu dijeda' : ''}</p>
  <div class="k-rt" style="justify-items:start;margin-bottom:6px"><button class="k-btn" data-pause>${E.S.settings.paused ? 'Lanjutkan waktu' : 'Jeda waktu'}</button></div>
  <div class="k-sec">Jadwal hari ini</div>${plan.filter(b => b.kind !== 'luang' || b.to - b.from >= 1).map(b => row(b.label, `${hh(b.from)}–${hh(b.to)}`, '')).join('')}
  <div class="k-sec">Agenda 7 hari ke depan</div>${evs.length ? evs.slice(0, 20).map(e => row(e.title, `${CAL.fmtDay(e.day, 'compact')} · ${AG.fmtEvTime(e.sec)} · ${e.certainty}${AG.CATS[e.cat] ? ' · ' + AG.CATS[e.cat].label : ''}`, e.amount ? `<b>${rp(e.amount)}</b>` : '')).join('') : '<p class="k-note">Tidak ada agenda.</p>'}`;
}
SERVICES.balai = { title: 'Balai Desa', icon: 'calendar', html: balaiHtml,
  bind: (el, ctx) => el.addEventListener('click', e => { if (e.target.closest('[data-pause]')) { E.setPaused(!E.S.settings.paused); ctx.refresh(); } }) };

// ——— Pusat UMKM: kelola & buka bisnis lewat E.openBusiness / E.restock / E.setBizParam / E.closeBiz ———
const UM = { sel: null };
function umkmHtml() {
  const owned = E.S.businesses.filter(b => b.status === 'buka'), cats = E.BUSINESS_CATALOG;
  if (!UM.sel) UM.sel = cats[0].id;
  const cat = E.BUSINESS_CATALOG.find(c => c.id === UM.sel), locks = E.businessLocks(cat), sup = Object.keys(E.SUPPLIERS);
  const supName = id => E.SUPPLIERS[id].name;
  const ownedHtml = owned.map(b => { const c = E.BUSINESS_CATALOG.find(x => x.id === b.typeId); return `<div class="k-li k-row3" style="flex-wrap:wrap"><span><b>${esc(c.name)}</b><small>${esc(E.LOCATIONS[b.location].name)} · harga Rp ${E.fmt(b.price)} · karyawan ${b.staff} · ${c.stockBased ? `stok ${b.stock}` : 'tanpa stok'}${b.pending?.length ? ` · ${b.pending.length} pesanan datang` : ''} · laba kumulatif ${rp(b.cumProfit)}</small></span>
    <span class="k-rt"><span><input class="k-qty" style="width:90px" type="number" min="1" data-bprice="${b.bid}" value="${b.price}" aria-label="Harga"> <button class="k-btn" data-bsetprice="${b.bid}">Ubah harga</button></span>
    ${c.stockBased ? `<span><input class="k-qty" style="width:70px" type="number" min="1" value="20" data-bqty="${b.bid}" aria-label="Jumlah restock"> <button class="k-btn pri" data-brestock="${b.bid}">Restock</button></span>` : ''}<button class="k-btn" data-bclose="${b.bid}">Tutup usaha</button></span></div>`; }).join('');
  const optsCost = E.openCost(cat, { supplier: sup[0], initialStock: cat.stockBased ? 20 : 0 });
  return `<p class="k-note">Saldo tunai <b>${rp(E.S.player.balance)}</b>. Operasional dihitung di akhir hari simulasi oleh Core.</p>
  <div class="k-sec">Usaha kamu</div>${ownedHtml || '<p class="k-note">Belum punya usaha berjalan.</p>'}
  <div class="k-sec">Buka usaha baru</div><form class="k-form" data-kform="biz">
    <select class="k-qty" name="type" style="width:100%">${cats.map(c => `<option value="${esc(c.id)}"${c.id === UM.sel ? ' selected' : ''}>${esc(c.name)} — modal ${rp(c.capex)}</option>`).join('')}</select>
    <select class="k-qty" name="location" style="width:100%">${cat.locations.map(l => `<option value="${esc(l)}">${esc(E.LOCATIONS[l].name)}</option>`).join('')}</select>
    ${cat.stockBased ? `<select class="k-qty" name="supplier" style="width:100%">${sup.map(id => `<option value="${esc(id)}">${esc(supName(id))}</option>`).join('')}</select><input class="k-qty" name="stock" type="number" min="1" value="20" aria-label="Stok awal" placeholder="Stok awal">` : ''}
    <input class="k-qty" name="price" type="number" min="1" value="${cat.refPrice}" aria-label="Harga jual">
    <p class="k-note" style="margin:0">Perkiraan biaya awal ± ${rp(optsCost)}.${locks.length ? ' <b>Terkunci:</b> ' + esc(locks[0]) : ''}</p>
    ${btn('', 'Buka usaha', locks[0] || null, true).replace('<button ', '<button type="submit" ')}</form>`;
}
SERVICES.umkm = { title: 'Pusat UMKM & Studio', icon: 'business', html: umkmHtml,
  bind: (el, ctx) => {
    el.addEventListener('change', e => { if (e.target.name === 'type') { UM.sel = e.target.value; ctx.refresh(); } });
    el.addEventListener('submit', e => {
      e.preventDefault(); const f = e.target.closest('[data-kform=biz]'); if (!f) return; const v = n => f.elements[n]?.value, cat = E.BUSINESS_CATALOG.find(c => c.id === UM.sel);
      ctx.res(E.openBusiness(cat.id, { location: v('location'), staff: cat.defaults.staff, price: Number(v('price')), marketingDaily: cat.defaults.marketingDaily, supplier: v('supplier') || Object.keys(E.SUPPLIERS)[0], initialStock: cat.stockBased ? Number(v('stock')) : 0, loan: 0 }));
    });
    el.addEventListener('click', e => {
      const t = e.target.closest('button'); if (!t) return; const q = a => el.querySelector(a);
      if (t.dataset.bsetprice) ctx.res(E.setBizParam(+t.dataset.bsetprice, 'price', Number(q(`[data-bprice="${t.dataset.bsetprice}"]`).value)));
      else if (t.dataset.brestock) { const b = E.S.businesses.find(x => x.bid === +t.dataset.brestock); ctx.res(E.restock(b.bid, Number(q(`[data-bqty="${b.bid}"]`).value), b.supplier)); }
      else if (t.dataset.bclose) ctx.res(E.closeBiz(+t.dataset.bclose));
    });
  } };

// ——— Sekolah: status & nilai dari tampilan pendidikan server (E.EDU) + belajar mandiri (/api/edu/study) ———
// Ujian, membaca materi, dan pendaftaran jenjang BELUM ada di panel 3D (butuh ruang ujian penuh).
const num1 = n => (Math.round((n || 0) * 10) / 10).toLocaleString('id-ID');
function sekolahHtml() {
  const v = E.EDU; if (!v?.edu) return `<p class="k-note">Data pendidikan belum termuat. Periksa koneksi lalu buka lagi.</p>`;
  const e = v.edu, R = v.rules || {};
  if (e.status !== 'enrolled') return `<p class="k-note"><b>${e.status === 'graduated' ? 'Lulus ' + esc(e.highest) : 'Belum terdaftar di sekolah'}</b>. Pendaftaran jenjang belum tersedia di panel 3D.</p>
    <div class="k-sec">Dana pendidikan</div>${row('Dana wali', 'Tersedia untuk biaya sekolah', `<b>${rp(e.wallet)}</b>`)}`;
  const att = e.attendanceLog?.length ? Math.round(e.attendanceLog.filter(a => a.status === 'hadir').length / e.attendanceLog.length * 100) : null;
  const done = e.tasks?.length ? Math.round(e.tasks.filter(t => t.status === 'selesai').length / e.tasks.length * 100) : null;
  const left = Math.max(0, (R.maxStudyHours ?? 3) - (e.studyLog?.[e.lastDay] || 0));
  return `<p class="k-note"><b>${esc(e.stage)} · ${esc(e.labelTerm)}</b> — ${esc(e.institution?.name || '')} · ${esc(e.program || '')}<br>Hari periode ${e.termDay}${R.termDays ? ' / ' + R.termDays : ''} · kehadiran ${att == null ? '—' : att + '%'} · tugas ${done == null ? '—' : done + '%'}</p>
  <div class="k-sec">Mata pelajaran (penguasaan) & belajar mandiri</div>${(e.subjects || []).map(s => row(s.name, `Penguasaan ${num1(s.current?.mastery)}`, [1, 2, 3].map(h => btn(`data-study="${esc(s.id)}:${h}"`, h + ' jam', h > left ? `Sisa jatah belajar hari ini ${left} jam.` : null)).join(''))).join('')}
  <p class="k-note">Jatah belajar mandiri hari ini: ${left} jam.</p>
  <div class="k-sec">Biaya & dana</div>${row('Dana wali', 'Untuk biaya sekolah', `<b>${rp(e.wallet)}</b>`)}${row('Tunggakan', e.outstanding > 0 ? 'Segera lunasi di Keuangan' : 'Tidak ada', `<b>${rp(e.outstanding)}</b>`)}
  <p class="k-note">Ujian, membaca materi, dan tugas belum bisa dikerjakan dari panel 3D.</p>`;
}
SERVICES.school = { title: 'Sekolah Kampung', icon: 'school', html: sekolahHtml,
  bind: (el, ctx) => el.addEventListener('click', async e => {
    const t = e.target.closest('[data-study]'); if (!t) return; const [subject, h] = t.dataset.study.split(':'); t.disabled = true;
    let r; try { r = await post('/api/edu/study', { subject, hours: +h }); } catch { r = { ok: false, error: 'Koneksi gagal.' }; }
    if (r?.ok && r.edu) { E.setEdu(r); ctx.res({ ok: true, msg: `Belajar mandiri ${h} jam tercatat.` }); } else ctx.res({ ok: false, error: r?.error || 'Gagal.' });
  }) };
export const hasService = id => !!SERVICES[id];
