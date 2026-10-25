// BIZSIM PERSONAL FINANCE — klien. Semua saldo rekening/dompet/kartu & validasi ada di server (server/finance.cjs).
// Modul ini hanya: memanggil API, menerapkan penyesuaian uang tunai yang sudah dikonfirmasi server, menyimpan cache
// tampilan, dan memproses antrean (gaji ke rekening, tarif perjalanan harian). Tidak ada saldo yang dihitung di sini.
import * as E from './core.js';
import { get, post } from '../ui/api.js';

export let CAT = null;          // katalog bank/dompet/merchant/harga dari server
export let V = null;            // tampilan keuangan terakhir dari server
export const status = { busy: false, error: null, loadedAt: 0 };
const subs = new Set();
export function onUpdate(fn) { subs.add(fn); return () => subs.delete(fn); }
const notify = () => subs.forEach(f => { try { f(V); } catch (e) { console.error(e); } });

export const newIdem = (p = 'tx') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const clock = () => ({ day: E.dayNow(), sec: E.secOfDay() });
function accept(r) {
  if (r && r.accounts) { V = r; E.setFinView(r); status.loadedAt = Date.now(); }
  if (r && r.cashAdj?.length) E.applyCashAdj(r.cashAdj);
  notify(); return r;
}

export async function loadCatalog() { if (!CAT) { const r = await get('/api/fin/catalog'); if (r.ok) CAT = r; } return CAT; }
export async function refresh() {
  const r = await get(`/api/fin/state?day=${E.dayNow()}&sec=${E.secOfDay()}`);
  if (!r.ok) { status.error = r.error; notify(); return r; }
  if ((r.finSeq || 0) > (E.S.finSeq || 0)) { const l = await get(`/api/fin/cashlog?after=${E.S.finSeq || 0}`); if (l.ok) E.applyCashAdj(l.rows); }
  status.error = null; return accept(r);
}

// Satu permintaan keuangan pada satu waktu. Save game dikirim dulu agar server memvalidasi uang tunai terbaru.
let chain = Promise.resolve();
export function call(path, body = {}) {
  const run = async () => {
    status.busy = true; notify();
    try {
      await E.flush();
      const r = await post(path, { ...body, clock: clock() });
      if (r.accounts) accept(r);
      else if (r.offline) status.error = r.error;
      return r;
    } finally { status.busy = false; notify(); }
  };
  const p = chain.then(run, run); chain = p.catch(() => {}); return p;
}

export const pay = b => call('/api/fin/pay', b);
export const transfer = b => call('/api/fin/transfer', b);
export const quote = b => post('/api/fin/quote', { ...b, clock: clock() });

// ——— helper tampilan (membaca V/CAT; tidak mengubah apa pun) ———
export const accounts = kind => (V?.accounts || []).filter(a => !kind || a.kind === kind);
export const bank = id => CAT?.BANKS.find(b => b.id === id);
export const wallet = id => CAT?.WALLETS.find(w => w.id === id);
export const merchant = id => CAT?.MERCHANTS.find(m => m.id === id);
export const item = id => CAT?.ITEMS.find(i => i.id === id);
export const cardOf = accId => (V?.cards || []).find(c => c.accountId === accId);
export function totals() {
  const a = V?.accounts || [];
  return { cash: E.S.player.balance, bank: a.filter(x => x.kind === 'bank').reduce((s, x) => s + x.balance, 0), wallet: a.filter(x => x.kind === 'wallet').reduce((s, x) => s + x.balance, 0), credit: a.filter(x => x.kind === 'credit').reduce((s, x) => s + x.balance, 0), creditAvail: a.filter(x => x.kind === 'credit').reduce((s, x) => s + x.available, 0) };
}
const wdOf = d => ((d + 1) % 7 + 7) % 7;
export function openNow(m, day = E.dayNow(), sec = E.secOfDay()) { if (!m) return false; if (m.days && !m.days.includes(wdOf(day))) return false; const h = sec / 3600; return h >= m.hours[0] && h < m.hours[1]; }
export const hoursText = m => `${String(m.hours[0]).padStart(2, '0')}:00–${m.hours[1] === 24 ? '24:00' : String(m.hours[1]).padStart(2, '0') + ':00'}${m.days ? ' · Minggu tutup' : ''}`;

// ——— antrean server (gaji ke rekening, tarif perjalanan) ———
let draining = false;
export async function drain() {
  if (draining || !E.S?.fin?.outbox?.length) return; draining = true;
  try {
    while (E.S.fin.outbox.length) {
      const it = E.S.fin.outbox[0]; let r;
      if (it.kind === 'inbound') {
        r = await call('/api/fin/inbound', { idem: it.idem, account: it.account, amount: it.amount, label: it.label });
        if (r.offline || /Transaksi lain/.test(r.error || '')) break;
        if (!r.ok && !r.duplicate) { E.cashFallback(it.amount, `Transfer gaji ke rekening gagal (${r.error}). Gaji dibayar tunai.`); }
      } else if (it.kind === 'commute') {
        const m = it.mode === 'ojek' ? 'jalanyuk' : 'buskota', itemId = it.mode === 'ojek' ? 'ride-ojek' : 'ride-bus';
        const auto = V?.autodebit?.[m];
        r = await call('/api/fin/pay', { idem: it.idem, merchant: m, items: [{ id: itemId, qty: 2 }], method: auto ? 'wallet' : 'cash', source: auto || undefined, auto: !!auto });
        if (r.offline) break;
        if (!r.ok) E.NE.commuteFallback(it.mode, r.error);
        else if (auto) E.recordExpense('transport', r.quote.total);
      }
      E.S.fin.outbox.shift(); E.save();
    }
  } finally { draining = false; }
}

let started = false;
export async function init() {
  if (started) return started; 
  started = (async () => { await loadCatalog(); await refresh(); if (!CAT || !V) { started = false; return; } await start2(); })();
  return started;
}
async function start2() {
  await advance();
  E.on('day', () => { advance(); drain(); });
  E.on('finq', () => drain());
  setInterval(() => { if (E.S?.fin?.outbox?.length) drain(); }, 4000);
  drain();
}
async function advance() { if (E.dayNow() < 1) return { ok: false }; const r = await call('/api/fin/advance', { gameDay: E.dayNow() - 1 }); if (r.ok) accept(r); return r; }
/** Jam absolut server (termasuk 14 hari pemanasan) → detik simulasi klien (E.nowSec). */
export const toLocal = a => a - 14 * 86400;
export function orderStage(o) { if (['diterima', 'dibatalkan', 'gagal'].includes(o.status)) return o.status; const n = E.nowSec(); return n >= toLocal(o.etaAbs) ? 'tiba' : n >= toLocal(o.readyAbs) ? 'diantar' : 'diproses'; }
export const receiveOrder = id => call('/api/fin/order/receive', { order: id });
export const cancelOrder = id => call('/api/fin/order/cancel', { order: id });
