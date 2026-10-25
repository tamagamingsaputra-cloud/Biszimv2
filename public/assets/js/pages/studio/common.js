// UI PRESENTATION — helper bersama Content Creator Studio. Tidak ada logika simulasi di sini:
// semua angka dibaca dari state engine (E.S.creator) atau fungsi engine (CR.*).
import * as E from '../../engine/core.js';
import { fmtDay as fmtDayCal } from '../../engine/calendar.js';
import * as CR from '../../engine/creator/studio.js';
import { PLATFORMS, NICHES, ACTIVE_PLATFORMS, STAGES } from '../../data/creator-platforms.js';
import { rp, rpShort, esc, icon, toast } from '../../ui/ui.js';

export { E, CR, PLATFORMS, NICHES, ACTIVE_PLATFORMS, STAGES };
export const C = () => E.S.creator;
/** Platform pilihan awal untuk wizard (dipakai tombol "Buat konten" di halaman lain; state transien di memori). */
export const PRE = { pid: null };
export const T = 48, W = 14;
export const gOfDay = d => (d + W) * T;
export const dayOfG = g => Math.floor(g / T) - W;

/** Angka ringkas Indonesia: 950 · 12,3 rb · 1,2 jt. Selalu dibulatkan ke bawah untuk hitungan orang. */
export function fN(v, dec = 1) {
  v = +v || 0; const a = Math.abs(v), s = v < 0 ? '−' : '';
  if (a < 1000) return s + Math.floor(a).toLocaleString('id-ID');
  if (a < 1e6) return s + (Math.floor(a / 100) / 10).toLocaleString('id-ID', { maximumFractionDigits: dec }) + ' rb';
  if (a < 1e9) return s + (Math.floor(a / 1e5) / 10).toLocaleString('id-ID', { maximumFractionDigits: dec }) + ' jt';
  return s + (Math.floor(a / 1e8) / 10).toLocaleString('id-ID', { maximumFractionDigits: dec }) + ' M';
}
/** Diamond bisa pecahan (koin × 0,5): tampilkan 1 desimal di bawah 1.000. */
export const fDia = v => (+v || 0) < 1000 ? (Math.floor((+v || 0) * 10) / 10).toLocaleString('id-ID', { maximumFractionDigits: 1 }) : fN(v);
export const fInt = v => Math.floor(+v || 0).toLocaleString('id-ID');
export const fPct = (v, d = 1) => `${((+v || 0) * 100).toLocaleString('id-ID', { maximumFractionDigits: d })}%`;
export const fDur = sec => { sec = Math.round(sec || 0); if (sec < 60) return `${sec} dtk`; const m = Math.floor(sec / 60), s = sec % 60; return m >= 60 ? `${Math.floor(m / 60)} j ${m % 60} m` : s ? `${m} m ${s} d` : `${m} menit`; };
export const fHours = h => `${(Math.round((h || 0) * 10) / 10).toLocaleString('id-ID')} jam`;
export { rp, rpShort };

export function fmtG(g, short = false) {
  if (g == null) return '—';
  const d = dayOfG(g), m = (g % T) * 30, hh = String(Math.floor(m / 60)).padStart(2, '0'), mm = String(m % 60).padStart(2, '0');
  const today = E.dayNow();
  const rel = d === today ? 'Hari ini' : d === today + 1 ? 'Besok' : d === today - 1 ? 'Kemarin' : `H${d + 1}`;
  if (short) return `${rel} ${hh}.${mm}`;
  return `${rel} · ${fmtDayCal(d, 'wd')} ${hh}.${mm}`;
}
export const fmtDay = d => fmtDayCal(d, 'wd');

// ————————————————————————— ikon platform (SVG, bukan logo resmi) —————————————————————————
const PMARK = {
  youtube: '<rect x="2" y="5" width="20" height="14" rx="4"/><path d="M10 9l5 3-5 3z" fill="currentColor" stroke="none"/>',
  tiktok: '<path d="M14 3v11.5a3.5 3.5 0 1 1-3.5-3.5"/><path d="M14 3c.5 2.6 2.4 4.4 5 4.6"/>',
  instagram: '<rect x="3" y="3" width="18" height="18" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.3" cy="6.7" r="0.9" fill="currentColor" stroke="none"/>',
  twitch: '<path d="M4 3h16v11l-5 5h-4l-3 3v-3H4z"/><path d="M11 8v4M16 8v4"/>',
  facebook: '<rect x="3" y="3" width="18" height="18" rx="4"/><path d="M15 8h-1.5A1.5 1.5 0 0 0 12 9.5V21M10 13h5"/>',
};
export function pIcon(pid, size = 18) {
  const P = PLATFORMS[pid];
  return `<span class="p-ico" style="--pc:${P?.color || '#0E2A47'};width:${size + 10}px;height:${size + 10}px" aria-hidden="true"><svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round">${PMARK[pid] || ''}</svg></span>`;
}
export const pName = pid => PLATFORMS[pid]?.name || pid;
export const fmtName = (pid, fid) => PLATFORMS[pid]?.formats?.[fid]?.name || fid;
export const nName = nid => NICHES.find(n => n.id === nid)?.name || nid;

// ————————————————————————— thumbnail SVG generatif (bukan gambar AI) —————————————————————————
const NGLYPH = {
  gaming: '<rect x="3" y="8" width="18" height="10" rx="5"/><path d="M8 11v4M6 13h4"/><circle cx="16" cy="12" r="1"/><circle cx="18" cy="14" r="1"/>',
  edukasi: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
  teknologi: '<rect x="7" y="7" width="10" height="10" rx="1"/><path d="M9 3v4M15 3v4M9 17v4M15 17v4M3 9h4M3 15h4M17 9h4M17 15h4"/>',
  komedi: '<circle cx="12" cy="12" r="9"/><path d="M8 14a5 5 0 0 0 8 0"/><path d="M9 9.5h.01M15 9.5h.01"/>',
  lifestyle: '<path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10z"/>',
  bisnis: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  musik: '<path d="M9 18V5l11-2v13"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/>',
  olahraga: '<circle cx="12" cy="12" r="9"/><path d="M3.5 9h17M3.5 15h17M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
  kuliner: '<path d="M3 12h18a9 9 0 0 1-18 0z"/><path d="M8 8c0-2 2-2 2-4M13 8c0-2 2-2 2-4"/>',
  kecantikan: '<path d="M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z"/>',
  travel: '<path d="M2 16l20-8-6 12-3-5z"/><path d="M13 15l-4 5"/>',
};
const NTONE = { gaming: '#1d3f66', edukasi: '#1f5a4a', teknologi: '#23466e', komedi: '#6b4b1f', lifestyle: '#5d2f4a', bisnis: '#1c4a5a', musik: '#3e2f66', olahraga: '#2d5a2a', kuliner: '#6a3a1e', kecantikan: '#6a2f50', travel: '#1f4f6a' };
export function thumb(c, w = 72) {
  const f = PLATFORMS[c.platform]?.formats?.[c.format] || {}, kind = f.kind;
  const vertical = ['shorts', 'video', 'reels', 'story'].includes(c.format), square = c.format === 'photo' || c.format === 'community_image' || c.format === 'carousel';
  const vw = vertical ? 90 : square ? 100 : 160, vh = vertical ? 160 : square ? (c.format === 'carousel' ? 125 : 100) : 90;
  const h = Math.round(w * vh / vw), tone = NTONE[c.niche] || '#0E2A47';
  const words = String(c.title || '').split(/\s+/).slice(0, vertical ? 6 : 5);
  const lines = []; let cur = '';
  for (const wd of words) { if ((cur + ' ' + wd).trim().length > (vertical ? 10 : 18)) { if (cur) lines.push(cur); cur = wd; } else cur = (cur + ' ' + wd).trim(); }
  if (cur) lines.push(cur);
  const gx = vw / 2 - 14, gy = vertical ? 34 : square ? 22 : 16;
  const text = kind === 'text' ? '' : lines.slice(0, 3).map((l, i) => `<text x="${vw / 2}" y="${gy + 44 + i * 13}" text-anchor="middle" font-size="10.5" font-weight="700" fill="#fff">${esc(l)}</text>`).join('');
  const badge = c.format === 'carousel' || c.format === 'photo' && (c.photos || 1) > 1 ? `<rect x="${vw - 24}" y="6" width="18" height="12" rx="3" fill="rgba(0,0,0,.45)"/><text x="${vw - 15}" y="15.5" text-anchor="middle" font-size="8" fill="#fff">${c.photos || 1}</text>` : '';
  const ring = c.format === 'story' ? `<rect x="2" y="2" width="${vw - 4}" height="${vh - 4}" rx="8" fill="none" stroke="#2ECC71" stroke-width="3"/>` : '';
  const dur = f.kind === 'video' && c.dur ? `<rect x="${vw - 34}" y="${vh - 17}" width="30" height="12" rx="3" fill="rgba(0,0,0,.6)"/><text x="${vw - 19}" y="${vh - 8}" text-anchor="middle" font-size="8" fill="#fff">${c.dur >= 60 ? `${Math.floor(c.dur / 60)}:${String(c.dur % 60).padStart(2, '0')}` : `0:${String(c.dur).padStart(2, '0')}`}</text>` : '';
  const txt = kind === 'text' ? `<text x="10" y="30" font-size="11" fill="#0E2A47" font-weight="700">${esc(String(c.title || '').slice(0, 22))}</text><path d="M10 44h${vw - 20}M10 56h${vw - 40}M10 68h${vw - 30}" stroke="#9fb0c2" stroke-width="5" stroke-linecap="round"/>` : '';
  const bg = kind === 'text' ? '#DDE5EC' : tone;
  return `<svg class="thumb" viewBox="0 0 ${vw} ${vh}" width="${w}" height="${h}" role="img" aria-label="Thumbnail: ${esc(c.title || 'konten')}"><rect width="${vw}" height="${vh}" rx="8" fill="${bg}"/>${kind === 'text' ? txt : `<g transform="translate(${gx} ${gy}) scale(1.15)" fill="none" stroke="rgba(255,255,255,.85)" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${NGLYPH[c.niche] || ''}</g>${text}`}${badge}${dur}${ring}</svg>`;
}

// ————————————————————————— status —————————————————————————
export const STATUS = {
  draft: ['Draf', ''], queued: ['Dalam antrean', 'info'], research: ['Riset', 'info'], script: ['Penulisan naskah', 'info'], prep: ['Persiapan', 'info'],
  record: ['Perekaman', 'info'], edit: ['Penyuntingan', 'info'], review: ['Peninjauan', 'info'], ready: ['Siap diterbitkan', 'pos'], scheduled: ['Terjadwal', 'pos'],
  published: ['Diterbitkan', 'pos'], cancelled: ['Dibatalkan', 'neg'], failed: ['Gagal', 'neg'],
};
export const statusChip = c => { const [l, k] = STATUS[c.status] || [c.status, '']; return `<span class="chip ${k}">${l}${c.paused ? ' · dijeda' : ''}</span>`; };

/** Metrik utama per platform — label mengikuti definisi platform (views vs reach). */
export function primary(c) {
  if (c.platform === 'instagram') return c.format === 'reels' ? ['Plays', c.m.views] : ['Reach', c.m.reach];
  if (c.format === 'community_text' || c.format === 'community_image') return ['Impresi', c.m.impr];
  if (c.format === 'story') return ['Penonton story', c.m.views];
  return ['Views', c.m.views];
}
/** Tren 24 jam dari riwayat harian tersimpan: naik/turun/stabil. */
export function momentumOf(c) {
  const h = c.hist; if (!h || h.length < 2) return null;
  const a = h[h.length - 1][1], b = h[h.length - 2][1]; if (b < 5 && a < 5) return { k: 'flat', t: 'Sepi' };
  const r = (a + 1) / (b + 1);
  if (c.flags?.resurfaced && c.dist?.resurfaceG && E.S.clock.g - c.dist.resurfaceG < 3 * T) return { k: 'up', t: 'Direkomendasikan lagi' };
  return r > 1.15 ? { k: 'up', t: `Naik ${fPct(r - 1, 0)}` } : r < 0.87 ? { k: 'down', t: `Turun ${fPct(1 - r, 0)}` } : { k: 'flat', t: 'Stabil' };
}
export const momChip = m => m ? `<span class="trend-tag ${m.k}">${icon(m.k === 'up' ? 'up' : m.k === 'down' ? 'down' : 'arrowR')}${esc(m.t)}</span>` : '<span class="subtle">—</span>';

export function res(x, after) {
  if (!x) return;
  if (x.ok) { if (x.msg) toast(x.msg); } else toast(x.error || 'Gagal.', 'error');
  E.save(); E.emit('change'); after?.(x);
  return x;
}

/** Bilah progres yang nilainya dibaca dari state produksi (jam selesai / jam total). */
export function progress(c) {
  const pct = c.hoursTotal ? Math.min(100, c.hoursDone / c.hoursTotal * 100) : 0;
  const active = c.stages?.find(s => s.done < s.hours);
  const stage = active ? STAGES.find(s => s.key === active.key) : null;
  const stageKey = stage?.key || (c.status === 'ready' || c.status === 'scheduled' ? 'upload' : c.status === 'published' ? 'published' : 'queued');
  const stageName = stage?.label || ({ upload: 'Siap diunggah', published: 'Sudah diterbitkan', queued: 'Menunggu proses' }[stageKey]);
  const ic = stageKey === 'edit' ? 'scissors' : stageKey === 'upload' ? 'upload' : stageKey === 'published' ? 'check' : stageKey === 'record' ? 'camera' : stageKey === 'review' ? 'shield' : stageKey === 'prep' ? 'tool' : stageKey === 'script' ? 'edit' : stageKey === 'research' ? 'search' : 'clock';
  return `<div class="production-progress stage-${stageKey}" data-stage="${stageKey}"><div class="production-stage-label"><span class="stage-symbol">${icon(ic)}</span><span>${esc(stageName)}</span><b class="num">${Math.round(pct)}%</b></div><div class="prog" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(pct)}" aria-label="Progres produksi ${esc(c.title)} — ${esc(stageName)}"><i style="width:${pct}%"></i></div></div>`;
}
export const stagePills = c => `<ol class="stage-pills">${c.stages.map(s => { const st = STAGES.find(x => x.key === s.key); const done = s.done >= s.hours, act = !done && c.stages.find(z => z.done < z.hours) === s; return `<li class="${done ? 'done' : act ? 'act' : ''}" title="${esc(st.label)} · ${fHours(s.done)} / ${fHours(s.hours)}${s.outsourced ? ' · editor lepas' : ''}">${esc(st.label)}${s.outsourced ? ' *' : ''}</li>`; }).join('')}</ol>`;

export const emptyBox = (title, text, cta = '') => `<div class="empty"><div class="stack" style="align-items:center;gap:6px"><b>${esc(title)}</b><span class="subtle">${text}</span>${cta}</div></div>`;
export const kpi = (label, value, sub = '', tip = '') => `<div class="kpi" ${tip ? `title="${esc(tip)}"` : ''}><div class="subtle">${label}</div><div class="v num">${value}</div>${sub ? `<div class="subtle s">${sub}</div>` : ''}</div>`;
export const accounts = () => ACTIVE_PLATFORMS.filter(p => C().accounts[p]).map(p => C().accounts[p]);
export const ageNow = () => E.creatorAge();
