// Progress bar pelacakan paket: ikon per tahap, kendaraan bergerak di titik progres, efek saat tahap berubah.
// Semua data (langkah, waktu simulasi, posisi) berasal dari server (order.tracking); modul ini hanya menggambar.
import { icon, esc } from './ui.js';
import { whenAbs } from '../engine/shop.js';

const STEP_ICON = ['receipt', 'card', 'package', 'send', 'truck', 'pin', 'van', 'check'];
const SHORT = ['Diterima', 'Dibayar', 'Dikemas', 'Dikirim', 'Transit', 'Kota tujuan', 'Diantar', 'Sampai'];
const VEH = { bike: 'bike', van: 'van', truck: 'truck', ev: 'leaf' };
const last = new Map(); // fill terakhir yang digambar per pesanan → animasi maju hanya saat progres benar-benar berubah

export function trackerHtml(o, { compact = false } = {}) {
  const t = o.tracking; if (!t) return '';
  const prev = last.get(o.id), cur = t.fill; last.set(o.id, cur);
  const moving = !t.finished && !t.failed && t.current >= 3;
  const adv = prev != null && cur > prev ? ' adv' : '';
  return `<div class="trk ${t.finished ? 'fin' : ''} ${t.failed ? 'bad' : ''} ${moving ? 'mov' : ''}${adv}" data-trk="${esc(o.id)}" data-prev="${prev ?? cur}" data-fill="${cur}" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.round(cur)}" aria-label="Progres pengiriman">
    <div class="trk-rail"><i class="trk-fill" style="width:${prev ?? cur}%"></i><span class="trk-veh" style="left:${prev ?? cur}%">${icon(VEH[t.vehicle] || 'van')}</span></div>
    <ol class="trk-steps">${t.steps.map((s, i) => `<li class="${s.state}" title="${esc(s.label)}${s.at != null ? ' · ' + esc(whenAbs(s.at)) : ''}"><span class="trk-n">${icon(s.state === 'done' && i === 7 ? 'check' : STEP_ICON[i])}</span>${compact ? '' : `<span class="trk-l">${SHORT[i]}</span>`}</li>`).join('')}</ol>
    <div class="trk-foot">${t.finished ? `<span class="chip pos">${icon('check')} Selesai${t.steps[7].at != null ? ' · ' + esc(whenAbs(t.steps[7].at)) : ''}</span>` : t.failed ? '<span class="chip neg">Pengiriman dihentikan</span>' : `<span class="chip info">${icon('clock')} Estimasi tiba ${esc(whenAbs(t.eta))}</span>`}<span class="muted sm">${esc(t.steps[Math.max(0, t.current)]?.label || '')}</span></div></div>`;
}
// Jalankan setelah HTML disisipkan: geser bar dari posisi lama ke posisi baru dengan transisi.
export function animateTrackers(root = document) {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  root.querySelectorAll('.trk[data-trk]').forEach(el => {
    const to = el.dataset.fill, f = el.querySelector('.trk-fill'), v = el.querySelector('.trk-veh'); if (f.style.width === to + '%') return;
    if (reduce) { f.style.width = to + '%'; v.style.left = to + '%'; return; }
    requestAnimationFrame(() => requestAnimationFrame(() => { f.style.width = to + '%'; v.style.left = to + '%'; }));
  });
}
