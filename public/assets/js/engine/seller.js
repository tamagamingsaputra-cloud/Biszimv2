// KLIEN SELLER CENTER / SOSIAL — tipis. Semua perhitungan, validasi, dan status ada di server (/api/sell, /api/aff, /api/chat, /api/mp/review).
import * as E from './core.js';
import * as F from './finance.js';
import { get, post } from '../ui/api.js';

export const newIdem = (p = 'sl') => `${p}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
const clock = () => ({ day: E.dayNow(), sec: E.secOfDay() });
const qs = () => `day=${E.dayNow()}&sec=${E.secOfDay()}`;
const sep = p => (p.includes('?') ? '&' : '?');
export const rd = path => get(`${path}${sep(path)}${qs()}`);
export const act = (path, body = {}) => post(path, { ...body, clock: clock() });
// Mutasi uang: simpan game lebih dulu agar server melihat tunai terbaru, lalu terapkan koreksi tunai dari server.
let chain = Promise.resolve();
export function money(path, body) {
  const run = async () => {
    await E.flush();
    const r = await post(path, { ...body, clock: clock() });
    if (r.accounts) F.accept?.(r);
    if (r.cashAdj?.length) E.applyCashAdj(r.cashAdj);
    if (r.accounts && F.refresh) F.refresh().catch(() => {});
    return r;
  };
  const p = chain.then(run, run); chain = p.catch(() => {}); return p;
}
// Kompres gambar di klien (maks ±130 KB) → data URL; server tetap memvalidasi ulang.
export function readImage(file, max = 640) {
  return new Promise(resolve => {
    if (!file || !/^image\/(png|jpeg|webp)$/.test(file.type)) return resolve({ error: 'Pilih gambar PNG, JPEG, atau WebP.' });
    const img = new Image(), url = URL.createObjectURL(file);
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height)), c = document.createElement('canvas'); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height); URL.revokeObjectURL(url);
      for (const q of [0.82, 0.7, 0.55, 0.4]) { const d = c.toDataURL('image/jpeg', q); if (d.length < 170000) return resolve({ data: d }); }
      resolve({ error: 'Gambar terlalu besar. Pilih gambar yang lebih kecil.' });
    };
    img.onerror = () => { URL.revokeObjectURL(url); resolve({ error: 'Gambar tidak dapat dibaca.' }); };
    img.src = url;
  });
}
