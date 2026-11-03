// BIZSIM MARKETPLACE — klien tipis. Semua harga, stok, voucher, ongkir, biaya, tagihan, dan status dihitung server (server/market.cjs).
// Keadaan akun (masuk/keluar), keranjang, wishlist, voucher, dan PayLater disimpan di database server — bukan localStorage.
import * as E from './core.js';
import { get, post } from '../ui/api.js';
import * as F from './finance.js';

export const newIdem = (p = 'mp') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const clock = () => ({ day: E.dayNow(), sec: E.secOfDay() });
const qs = () => `day=${E.dayNow()}&sec=${E.secOfDay()}`;
const sep = p => (p.includes('?') ? '&' : '?');
export const rd = (m, path) => get(`/api/mp/${m}/${path}${sep(path)}${qs()}`);
export const launcher = () => get(`/api/mp/launcher?${qs()}`);
// Mutasi non-uang: kirim jam simulasi saja.
export const act = (m, path, body = {}) => post(`/api/mp/${m}/${path}`, { ...body, clock: clock() });
// Mutasi yang menyentuh uang: save game dikirim dulu (server melihat tunai terbaru), lalu terapkan koreksi tunai/grant dari server.
let chain = Promise.resolve();
export function money(m, path, body) {
  const run = async () => {
    await E.flush();
    const r = await post(`/api/mp/${m}/${path}`, { ...body, clock: clock() });
    if (r.accounts) F.accept?.(r);
    if (r.cashAdj?.length) E.applyCashAdj(r.cashAdj);
    if (r.grants?.length) E.applyShopGrants(r.grants);
    if (r.accounts && F.refresh) F.refresh().catch(() => {});
    return r;
  };
  const p = chain.then(run, run); chain = p.catch(() => {}); return p;
}
export const quote = (m, b) => post(`/api/mp/${m}/quote`, { ...b, clock: clock() });
export const checkout = (m, b) => money(m, 'checkout', b);
