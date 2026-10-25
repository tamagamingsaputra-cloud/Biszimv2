// UI helpers: format, ikon, toast, dialog, grafik SVG ringan.
export const rp = (n, opts = {}) => {
  if (n == null || isNaN(n)) return '—';
  const s = Math.round(Math.abs(n)).toLocaleString('id-ID');
  const sign = n < 0 ? '−' : (opts.sign && n > 0 ? '+' : '');
  return `${sign}Rp ${s}`;
};
export const rpShort = n => {
  if (n == null || isNaN(n)) return '—';
  const a = Math.abs(n), sign = n < 0 ? '−' : '';
  if (a >= 1e12) return `${sign}Rp ${(a / 1e12).toLocaleString('id-ID', { maximumFractionDigits: 2 })} T`;
  if (a >= 1e9) return `${sign}Rp ${(a / 1e9).toLocaleString('id-ID', { maximumFractionDigits: 2 })} M`;
  if (a >= 1e6) return `${sign}Rp ${(a / 1e6).toLocaleString('id-ID', { maximumFractionDigits: 2 })} jt`;
  if (a >= 1e4) return `${sign}Rp ${(a / 1e3).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`;
  return `${sign}Rp ${Math.round(a).toLocaleString('id-ID')}`;
};
export const pct = (x, d = 2, sign = true) => x == null || isNaN(x) ? '—' : `${sign && x > 0 ? '+' : x < 0 ? '−' : ''}${Math.abs(x * 100).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d })}%`;
export const num = (x, d = 0) => (+x).toLocaleString('id-ID', { maximumFractionDigits: d, minimumFractionDigits: 0 });
export const cls = x => x > 0.00001 ? 'pos' : x < -0.00001 ? 'neg' : 'flat';
export const arrow = x => x > 0.00001 ? '▲' : x < -0.00001 ? '▼' : '■';
/** Perubahan dengan warna + tanda + teks (tidak hanya mengandalkan warna). */
export const delta = (abs, rel, short = false) => `<span class="${cls(abs)} num">${arrow(abs)} ${short ? rpShort(abs) : rp(abs, { sign: true })}${rel != null ? ` (${pct(rel)})` : ''}</span>`;
export const plChip = (v, label) => `<span class="chip ${cls(v)}">${arrow(v)} ${label ?? (v > 0 ? 'Profit' : v < 0 ? 'Loss' : 'Impas')}</span>`;
export const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const $ = (s, r = document) => r.querySelector(s);
export const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const DAYS = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
export const fmtDate = (dt, wd = true) => `${wd ? DAYS[dt.getUTCDay()] + ', ' : ''}${dt.getUTCDate()} ${MONTHS[dt.getUTCMonth()]} ${dt.getUTCFullYear()}`;
export const skillLabel = k => ({ komunikasi: 'Komunikasi', penjualan: 'Penjualan', manajemen: 'Manajemen', keuangan: 'Keuangan', teknologi: 'Teknologi', kreativitas: 'Kreativitas', teknis: 'Teknis' }[k] || k);

const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  market: '<path d="M3 17l5-6 4 3 6-8 3 3"/><path d="M3 21h18"/>',
  invest: '<path d="M12 2v20"/><path d="M17 6H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>',
  business: '<path d="M3 9l1.5-5h15L21 9"/><path d="M4 9v11h16V9"/><path d="M3 9h18"/><path d="M9 20v-6h6v6"/>',
  career: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><path d="M3 13h18"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
  play: '<path d="M7 4l13 8-13 8z" fill="currentColor"/>', pause: '<rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none"/><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none"/>',
  skip: '<path d="M5 4l10 8-10 8z" fill="currentColor"/><path d="M19 5v14"/>',
  lock: '<rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
  check: '<path d="M20 6L9 17l-5-5"/>', alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>', x: '<path d="M18 6L6 18M6 6l12 12"/>',
  wallet: '<path d="M20 7H5a2 2 0 0 1 0-4h13v4"/><path d="M3 5v14a2 2 0 0 0 2 2h15V7"/><circle cx="16" cy="14" r="1.5"/>',
  arrowR: '<path d="M5 12h14M13 6l6 6-6 6"/>', video: '<rect x="2" y="5" width="15" height="14" rx="2"/><path d="M17 10l5-3v10l-5-3z"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>', user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  box: '<path d="M21 8l-9-5-9 5 9 5 9-5z"/><path d="M3 8v8l9 5 9-5V8"/><path d="M12 13v8"/>', chart: '<path d="M3 3v18h18"/><path d="M7 15l4-4 3 3 5-6"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>', star: '<path d="M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1z"/>',
  menu: '<path d="M3 6h18M3 12h18M3 18h18"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1.5"/><rect x="14" y="3" width="7" height="7" rx="1.5"/><rect x="3" y="14" width="7" height="7" rx="1.5"/><rect x="14" y="14" width="7" height="7" rx="1.5"/>',
  food: '<path d="M4 3v8a3 3 0 0 0 6 0V3M7 3v18"/><path d="M17 3c-2 2-3 5-3 8h3v10"/>',
  drop: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z"/>',
  bed: '<path d="M3 18V7M21 18v-5a3 3 0 0 0-3-3h-8v6"/><path d="M3 15h18"/><circle cx="6.5" cy="11.5" r="1.8"/>',
  shower: '<path d="M4 20V8a4 4 0 0 1 8 0"/><path d="M9 8h6"/><path d="M10 12v1M13 12v1M16 12v1M11.5 16v1M14.5 16v1"/>',
  heart: '<path d="M20.8 5.6a5 5 0 0 0-7.1 0L12 7.3l-1.7-1.7a5 5 0 0 0-7.1 7.1L12 21.5l8.8-8.8a5 5 0 0 0 0-7.1z"/>',
  card: '<rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20M6 15h4"/>',
  qr: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v1M14 20h1M17 17h4v4h-4"/>',
  bank: '<path d="M3 10l9-6 9 6"/><path d="M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="2"/><path d="M4 11h16M8 18v3M16 18v3"/><circle cx="8" cy="14.5" r="1"/><circle cx="16" cy="14.5" r="1"/>',
  cart: '<circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M2 3h3l2.5 12h12l2-8H6.2"/>',
  truck: '<path d="M2 6h12v10H2zM14 9h4l3 3v4h-7"/><circle cx="6" cy="18" r="2"/><circle cx="17" cy="18" r="2"/>',
  smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>',
  bolt: '<path d="M13 2L4 14h7l-1 8 9-12h-7z"/>',
  toilet: '<path d="M6 3h5v8H6zM4 11h14a0 0 0 0 1 0 0 6 6 0 0 1-6 6H10a6 6 0 0 1-6-6z"/><path d="M9 17l-1 4h8l-1-4"/>',
  home: '<path d="M3 11l9-7 9 7"/><path d="M5 10v10h14V10"/><path d="M10 20v-5h4v5"/>',
  transfer: '<path d="M4 8h14l-4-4M20 16H6l4 4"/>',
  history: '<path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5M12 7v5l3 2"/>',
  pill: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-45 12 12)"/><path d="M8.5 8.5l7 7"/>',
  life: '<circle cx="12" cy="7" r="3.5"/><path d="M5 21v-2a7 7 0 0 1 14 0v2"/><path d="M3 12h3l1.5-2 2 4 1.5-2h2"/>',

  studio: '<rect x="2" y="6" width="14" height="12" rx="2"/><path d="M16 10l6-3v10l-6-3"/><circle cx="9" cy="12" r="2.5"/>',
  mic: '<rect x="9" y="2" width="6" height="12" rx="3"/><path d="M5 10a7 7 0 0 0 14 0M12 17v5M8 22h8"/>',
  broadcast: '<circle cx="12" cy="12" r="2"/><path d="M16.2 7.8a6 6 0 0 1 0 8.4M7.8 16.2a6 6 0 0 1 0-8.4M19.1 4.9a10 10 0 0 1 0 14.2M4.9 19.1a10 10 0 0 1 0-14.2"/>',
  camera: '<path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/>',
  gift: '<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8C10 4 7 4 7 6s3 2 5 2c2 0 5 0 5-2s-3-2-5 2z"/>',
  layers: '<path d="M12 2l10 5-10 5L2 7z"/><path d="M2 12l10 5 10-5M2 17l10 5 10-5"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/>',
  up: '<path d="M12 19V5M5 12l7-7 7 7"/>', down: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21a7 7 0 0 1 14 0"/><path d="M16 4a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 4 7"/>',
  bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.7 21a2 2 0 0 1-3.4 0"/>',
  send: '<path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4z"/>', trash: '<path d="M3 6h18M8 6V4h8v2M6 6l1 15h10l1-15"/>',
  stop: '<rect x="6" y="6" width="12" height="12" rx="1" fill="currentColor"/>', handshake: '<path d="M2 12l4-4 4 2 4-3 4 3 4 2"/><path d="M6 8v6l4 4 2-2 2 2 4-4v-6"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>',
  education: '<path d="M2 9l10-5 10 5-10 5z"/><path d="M6 11v5c0 1.7 2.7 3 6 3s6-1.3 6-3v-5"/><path d="M22 9v6"/>',
  book: '<path d="M4 4h6a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4z"/><path d="M20 4h-6a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h7z"/>',
  exam: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3h6v3H9z"/><path d="M9 11h6M9 15h4"/>',
  doc: '<path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"/><path d="M14 3v6h6"/><path d="M8 13h8M8 17h5"/>',
  school: '<path d="M3 21h18"/><path d="M5 21V10l7-5 7 5v11"/><path d="M10 21v-5h4v5"/><path d="M12 5V2h3"/>',
  task: '<path d="M9 11l3 3 8-8"/><path d="M20 12v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h9"/>', land: '<path d="M2 20h20"/><path d="M5 20V10l7-6 7 6v10"/>', gold: '<path d="M4 18h16l-3-8H7z"/><path d="M8 10l2-5h4l2 5"/>',
};
export const icon = (name, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${P[name] || ''}</svg>`;

export function toast(text, kind = 'ok') {
  let box = $('.toasts'); if (!box) { box = document.createElement('div'); box.className = 'toasts'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite'); document.body.appendChild(box); }
  while (box.children.length >= 3) box.firstChild.remove();
  const t = document.createElement('div'); t.className = `toast ${kind}`; t.innerHTML = `${icon(kind === 'error' ? 'alert' : 'check', 'width="16" height="16" style="flex:none;margin-top:1px"')}<span>${esc(text)}</span>`;
  box.appendChild(t); setTimeout(() => t.remove(), 4200);
}
export function result(r, okMsg) { if (r.ok) toast(okMsg || r.msg, 'ok'); else toast(r.error, 'error'); return r; }

export function openDialog(html, { wide = false, onMount } = {}) {
  const d = document.createElement('dialog'); if (wide) d.classList.add('wide');
  d.innerHTML = html; document.body.appendChild(d);
  d.addEventListener('close', () => d.remove());
  d.addEventListener('click', e => { if (e.target === d) d.close(); if (e.target.closest('[data-close]')) d.close(); });
  d.showModal(); onMount?.(d); return d;
}

export const empty = (ico, title, text, actions = '') => `<div class="empty"><div class="ico">${icon(ico)}</div><h3>${title}</h3><p>${text}</p>${actions}</div>`;
export const skeleton = (h = 14, w = '100%') => `<div class="skel" style="height:${h}px;width:${w}"></div>`;

/**
 * Grafik garis SVG. series: [[x, y], ...]. Tidak membuat data — hanya merender data engine.
 * Mengembalikan null jika data < 2 titik (pemanggil menampilkan empty state).
 */
let gradSeq = 0;
export function lineChart(el, series, { height = 240, yFmt = rpShort, tipFmt = rp, xFmt = x => x, color, baseline, area = true, axis = true, floor = null } = {}) {
  if (!series || series.length < 2) return null;
  const W = el.clientWidth || 600, H = height, padL = axis ? 8 : 0, padR = axis ? 64 : 0, padT = 10, padB = axis ? 22 : 2;
  const ys = series.map(p => p[1]); let min = Math.min(...ys), max = Math.max(...ys);
  if (baseline != null) { min = Math.min(min, baseline); max = Math.max(max, baseline); }
  if (min === max) { min -= 1; max += 1; }
  const span = max - min; min -= span * 0.06; max += span * 0.06; if (floor != null) min = Math.max(min, floor);
  const n = series.length;
  const X = i => padL + (W - padL - padR) * (i / (n - 1));
  const Y = v => padT + (H - padT - padB) * (1 - (v - min) / (max - min));
  const up = series[n - 1][1] >= (baseline ?? series[0][1]);
  const c = color || (up ? 'var(--green-ink)' : 'var(--red-ink)');
  const gid = 'g' + (++gradSeq);
  let d = ''; series.forEach((p, i) => { d += (i ? 'L' : 'M') + X(i).toFixed(1) + ' ' + Y(p[1]).toFixed(1); });
  const grid = axis ? [0, 0.25, 0.5, 0.75, 1].map(f => { const v = min + (max - min) * (1 - f); const y = padT + (H - padT - padB) * f; return `<line x1="${padL}" x2="${W - padR}" y1="${y}" y2="${y}" stroke="#E3E9EF"/><text x="${W - padR + 6}" y="${y + 4}" font-size="10.5" fill="#6B7C90">${yFmt(v)}</text>`; }).join('') : '';
  const xt = axis ? [0, Math.floor((n - 1) / 2), n - 1].map((i, k) => `<text x="${X(i)}" y="${H - 6}" font-size="10.5" fill="#6B7C90" text-anchor="${k === 0 ? 'start' : k === 2 ? 'end' : 'middle'}">${xFmt(series[i][0])}</text>`).join('') : '';
  const base = baseline != null && axis ? `<line x1="${padL}" x2="${W - padR}" y1="${Y(baseline)}" y2="${Y(baseline)}" stroke="#8A9BB0" stroke-dasharray="3 3"/>` : '';
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Grafik harga">
    <defs><linearGradient id="${gid}" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="${c}" stop-opacity=".18"/><stop offset="1" stop-color="${c}" stop-opacity="0"/></linearGradient></defs>
    ${grid}${base}
    ${area ? `<path d="${d}L${X(n - 1)} ${H - padB}L${X(0)} ${H - padB}Z" fill="url(#${gid})"/>` : ''}
    <path d="${d}" fill="none" stroke="${c}" stroke-width="${axis ? 1.8 : 1.5}" stroke-linejoin="round"/>
    ${axis ? `<circle cx="${X(n - 1)}" cy="${Y(series[n - 1][1])}" r="3.5" fill="${c}"/>` : ''}
    ${xt}
    <line class="xh" y1="${padT}" y2="${H - padB}" stroke="#0E2A47" stroke-opacity=".35" style="display:none"/>
  </svg><div class="tip"></div>`;
  if (axis) {
    const svg = el.querySelector('svg'), tip = el.querySelector('.tip'), xh = el.querySelector('.xh');
    const move = e => {
      const r = svg.getBoundingClientRect(); const px = ((e.touches ? e.touches[0].clientX : e.clientX) - r.left) * (W / r.width);
      const i = Math.max(0, Math.min(n - 1, Math.round((px - padL) / (W - padL - padR) * (n - 1))));
      xh.setAttribute('x1', X(i)); xh.setAttribute('x2', X(i)); xh.style.display = '';
      tip.style.display = 'block'; tip.style.left = (X(i) * r.width / W) + 'px'; tip.style.top = (Y(series[i][1]) * r.height / H) + 'px';
      tip.innerHTML = `${xFmt(series[i][0], true)} · <b>${tipFmt(series[i][1])}</b>`;
    };
    svg.addEventListener('pointermove', move); svg.addEventListener('pointerleave', () => { tip.style.display = 'none'; xh.style.display = 'none'; });
  }
  return true;
}
export function sparkline(series, w = 90, h = 28, color) {
  if (!series || series.length < 2) return '<span class="subtle">—</span>';
  const ys = series.map(p => p[1]); const min = Math.min(...ys), max = Math.max(...ys) || 1, sp = (max - min) || 1;
  const d = series.map((p, i) => `${i ? 'L' : 'M'}${(w * i / (series.length - 1)).toFixed(1)} ${(h - 2 - (h - 4) * (p[1] - min) / sp).toFixed(1)}`).join('');
  const c = color || (ys[ys.length - 1] >= ys[0] ? 'var(--green-ink)' : 'var(--red-ink)');
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="${d}" fill="none" stroke="${c}" stroke-width="1.5"/></svg>`;
}
export function barChart(el, rows, { height = 160, fmt = rpShort } = {}) {
  // rows: [{label, value}] — nilai negatif digambar di bawah garis nol
  if (!rows.length) return null;
  const W = el.clientWidth || 500, H = height, pad = 18;
  const max = Math.max(1, ...rows.map(r => Math.abs(r.value)));
  const hasNeg = rows.some(r => r.value < 0);
  const zero = hasNeg ? H / 2 : H - pad;
  const scale = (hasNeg ? H / 2 - pad : H - 2 * pad) / max;
  const bw = (W - 8) / rows.length;
  el.innerHTML = `<svg viewBox="0 0 ${W} ${H}" height="${H}" role="img" aria-label="Grafik batang">
    <line x1="0" x2="${W}" y1="${zero}" y2="${zero}" stroke="#B9C6D3"/>
    ${rows.map((r, i) => { const h = Math.abs(r.value) * scale; const y = r.value >= 0 ? zero - h : zero; return `<rect x="${4 + i * bw + bw * 0.15}" y="${y}" width="${bw * 0.7}" height="${Math.max(1, h)}" rx="1.5" fill="${r.value >= 0 ? 'var(--green-ink)' : 'var(--red-ink)'}"><title>${r.label}: ${fmt(r.value)}</title></rect>`; }).join('')}
    <text x="2" y="12" font-size="10.5" fill="#6B7C90">${fmt(max)}</text>
  </svg>`;
  return true;
}
