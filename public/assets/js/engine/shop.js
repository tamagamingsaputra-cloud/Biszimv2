// BIZSIM RETAIL & COMMERCE — klien. Harga, stok, total, status, refund, dan bonus dihitung di server (server/commerce.cjs).
// Modul ini hanya memanggil API, menerapkan "grants" yang sudah dikonfirmasi server, dan menyimpan cache tampilan.
import * as E from './core.js';
import { get, post } from '../ui/api.js';
import * as F from './finance.js';
import * as CAL from './calendar.js';

export let CAT = null;
export const newIdem = (p = 'shop') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const clock = () => ({ day: E.dayNow(), sec: E.secOfDay() });
const qs = () => `day=${E.dayNow()}&sec=${E.secOfDay()}`;
const subs = new Set();
export const onUpdate = fn => { subs.add(fn); return () => subs.delete(fn); };
const notify = () => subs.forEach(f => { try { f(); } catch (e) { console.error(e); } });

export async function loadCatalog(force = false) { if (!CAT || force) { const r = await get(`/api/shop/catalog?${qs()}`); if (r.ok) CAT = r; return r; } return { ok: true, ...CAT }; }
export async function syncGrants() {
  const r = await get(`/api/shop/grants?after=${E.S.shopSeq || 0}`);
  if (r.ok && r.grants.length) E.applyShopGrants(r.grants); return r;
}
// Satu permintaan belanja pada satu waktu. Save game dikirim dulu agar server melihat uang tunai terbaru.
let chain = Promise.resolve();
function mut(path, body) {
  const run = async () => {
    await E.flush();
    const r = await post(path, { ...body, clock: clock() });
    if (r.accounts) { F.accept?.(r); }
    if (r.cashAdj?.length) E.applyCashAdj(r.cashAdj);
    if (r.grants?.length) E.applyShopGrants(r.grants);
    if (r.accounts && F.refresh) F.refresh().catch(() => {});
    notify(); return r;
  };
  const p = chain.then(run, run); chain = p.catch(() => {}); return p;
}
export const quote = b => post('/api/shop/quote', { ...b, clock: clock() });
export const checkout = b => mut('/api/shop/checkout', b);
export const claim = order => mut('/api/shop/order/claim', { order });
export const cancel = order => mut('/api/shop/order/cancel', { order });
export const requestReturn = (order, reason) => mut('/api/shop/order/return', { order, reason });
export const orders = (filter = '') => get(`/api/shop/orders?${qs()}${filter ? `&filter=${filter}` : ''}`);
export const order = id => get(`/api/shop/order/${id}?${qs()}`);
export const summary = () => get(`/api/shop/summary?${qs()}`);
export const rewards = () => get(`/api/shop/rewards?${qs()}`);
export const notifs = () => get(`/api/shop/notifs?${qs()}`);
export const readNotifs = () => post('/api/shop/notifs/read', {});
/** Jam absolut server → label hari & jam simulasi. */
export const whenAbs = abs => { if (abs == null) return '—'; const l = abs - 14 * 86400, day = Math.floor(l / 86400), sec = Math.max(0, Math.round(l - day * 86400)); return CAL.fmtStamp(day, Math.min(sec, 86399), 'wd').replace(/:\d\d$/, ''); };
