// PLATFORM CAPABILITY RULES — kelayakan format, live, dan program monetisasi.
// Murni: hanya membaca state + konfigurasi; tidak mengubah apa pun.
import { PLATFORMS, SIM_REGION, EQUIPMENT } from '../../data/creator-platforms.js';

export const W = 14; // WARMUP_DAYS (sinkron dengan data/market-assets.js)
export const dayOfG = g => Math.floor(g / 48) - W;
export const gOfDay = d => (d + W) * 48;

export const platform = id => PLATFORMS[id];
export const formatOf = (pid, fid) => PLATFORMS[pid]?.formats?.[fid];
export const gearItem = (cat, id) => EQUIPMENT[cat].items.find(i => i.id === id);

/** Jumlah strike aktif (belum kedaluwarsa). */
export const activeStrikes = (acc, day) => (acc?.strikes || []).filter(s => s.until > day).length;

/** Metrik bergulir dari ringkasan harian akun (data tersimpan, bukan perkiraan). */
export function rolling(acc, day, n, key) {
  let s = 0; for (const r of acc.daily) if (r.d > day - n && r.d <= day) s += r[key] || 0;
  return s + (acc.today?.[key] || 0);
}

/** Evaluasi satu syarat → { label, met, cur, need }. */
export function evalReq(req, acc, C, ctx) {
  const [k, v] = req, day = ctx.day;
  const P = PLATFORMS[acc.id];
  switch (k) {
    case 'age': { const a = ctx.age(); return { label: `Usia minimal ${v} tahun simulasi`, met: a >= v, cur: a, need: v, unit: 'th' }; }
    case 'followers': return { label: `${P.followerLabel} ≥ ${v.toLocaleString('id-ID')}`, met: acc.followers >= v, cur: Math.floor(acc.followers), need: v };
    case 'watchHours90': { const h = rolling(acc, day, 90, 'watchLong') / 3600; return { label: `Jam tonton video panjang 90 hari ≥ ${v.toLocaleString('id-ID')}`, met: h >= v, cur: Math.floor(h), need: v }; }
    case 'shortsViews90': { const x = rolling(acc, day, 90, 'shortsViews'); return { label: `Views Shorts 90 hari ≥ ${v.toLocaleString('id-ID')}`, met: x >= v, cur: Math.floor(x), need: v }; }
    case 'views30': { const x = rolling(acc, day, 30, 'views'); return { label: `Views 30 hari ≥ ${v.toLocaleString('id-ID')}`, met: x >= v, cur: Math.floor(x), need: v }; }
    case 'noStrikes': { const n = activeStrikes(acc, day); return { label: 'Tidak ada strike pelanggaran aktif', met: n === 0, cur: n, need: 0, inverse: true }; }
    case 'program': { const st = acc.programs?.[v]?.status; return { label: `${P.programs[v].name} aktif`, met: st === 'active', cur: st || 'locked', need: 'active', text: true }; }
    case 'oneOf': { const subs = v.map(r => evalReq(r, acc, C, ctx)); const best = subs.find(s => s.met) || subs.reduce((a, b) => (b.cur / b.need > a.cur / a.need ? b : a)); return { label: subs.map(s => s.label).join(' ATAU '), met: subs.some(s => s.met), cur: best.cur, need: best.need, any: subs }; }
    default: return { label: k, met: false };
  }
}

/** Status program monetisasi: daftar syarat + kunci wilayah/kebijakan. */
export function programStatus(acc, progId, C, ctx) {
  const P = PLATFORMS[acc.id], prog = P.programs[progId];
  if (!prog) return null;
  const reqs = prog.reqs.map(r => evalReq(r, acc, C, ctx));
  const regionLock = prog.region?.disabled?.includes(SIM_REGION.id) ? prog.region.reason : null;
  const st = acc.programs?.[progId] || { status: 'locked' };
  const allMet = !regionLock && reqs.every(r => r.met);
  return { id: progId, ...prog, reqs, regionLock, allMet, status: regionLock ? 'region' : st.status, reviewUntil: st.reviewUntil, since: st.since };
}
export const programActive = (acc, progId) => acc?.programs?.[progId]?.status === 'active';

/** Bisakah format ini dibuat di akun ini sekarang? */
export function formatLocks(acc, fid, ctx) {
  const P = PLATFORMS[acc.id], f = P.formats[fid], out = [];
  if (!f) return ['Format tidak tersedia di platform ini.'];
  if (acc.terminated) out.push('Akun ditutup karena 3 strike (simulasi).');
  if (f.minFollowers && acc.followers < f.minFollowers) out.push(`Butuh ${f.minFollowers} ${P.followerShort}.`);
  return out;
}

/** Syarat live per platform (usia, follower, perangkat, strike). */
export function liveLocks(acc, C, ctx) {
  const P = PLATFORMS[acc.id], L = P.live, out = [];
  if (!L) return ['Platform ini tidak mendukung live di versi simulasi.'];
  const a = ctx.age(); if (a < L.minAge) out.push(`Live terbuka mulai usia ${L.minAge} tahun simulasi (sekarang ${a}).`);
  if (L.minFollowers && acc.followers < L.minFollowers) out.push(`Butuh ${L.minFollowers.toLocaleString('id-ID')} ${P.followerShort} (sekarang ${Math.floor(acc.followers).toLocaleString('id-ID')}).`);
  if (L.mobileMinFollowers && acc.followers < L.mobileMinFollowers && !gearItem('computer', C.gear.computer).pcLive) out.push(`Live dari HP butuh ${L.mobileMinFollowers} ${P.followerShort}; live dari laptop/PC tidak butuh syarat ini.`);
  if (activeStrikes(acc, ctx.day) > 0) out.push('Ada strike aktif — live dinonaktifkan sampai strike kedaluwarsa.');
  if (acc.terminated) out.push('Akun ditutup.');
  return out;
}

/** Fitur dukungan yang aktif dalam live (mengikuti capability + program). */
export function liveSupports(acc) {
  const P = PLATFORMS[acc.id], out = [];
  for (const s of P.live?.supports || []) {
    if (s === 'superchat' || s === 'supersticker') { if (programActive(acc, 'superchat')) out.push(s); }
    else if (s === 'membership') { if (programActive(acc, 'membership')) out.push(s); }
    else if (programActive(acc, s)) out.push(s);
  }
  return out;
}

/** Matriks kapabilitas untuk UI (desain + status per akun). */
export function capabilityMatrix() {
  const rows = [
    ['Video panjang', p => !!p.formats?.long], ['Video pendek', p => !!(p.formats?.shorts || p.formats?.video || p.formats?.reels)], ['Foto / carousel', p => !!(p.formats?.photo || p.formats?.carousel)],
    ['Stories', p => !!p.formats?.story], ['Postingan komunitas', p => !!p.formats?.community_text], ['Premiere / jadwal', p => Object.values(p.formats || {}).some(f => f.premiere)],
    ['Live', p => !!p.live], ['Iklan / program kreator', p => Object.values(p.programs || {}).some(x => x.kind === 'ads')], ['Dukungan saat live', p => (p.live?.supports || []).length > 0],
    ['Membership / langganan', p => Object.values(p.programs || {}).some(x => x.kind === 'membership')], ['Sponsorship', p => !!p.programs?.sponsor], ['Affiliate', p => !!p.programs?.affiliate], ['Merchandise', p => !!p.programs?.merch],
  ];
  return rows.map(([label, f]) => ({ label, cells: Object.values(PLATFORMS).map(p => p.status === 'planned' ? 'planned' : f(p) ? 'yes' : 'no') }));
}
