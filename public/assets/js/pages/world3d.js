// KAMPUNG 3D — mode layar penuh. Satu Core, dua tampilan: 3D hanya membaca/menjalankan lewat engine & halaman 2D yang sama.
// Tidak ada fetch/penyimpanan/perubahan saldo di sini selain membaca notifikasi toko (read-only) lewat engine/shop.js yang sudah ada.
import * as E from '../engine/core.js';
import * as NE from '../engine/needs.js';
import * as CAL from '../engine/calendar.js';
import * as SH from '../engine/shop.js';
import { NEEDS } from '../data/needs-rules.js';
import { mountShell } from '../ui/shell.js';
import { createWorld, webglOk, PRESETS } from '../world3d/world.js';
import { BUILDINGS, BY_ID, T, W, D, isOpen } from '../world3d/city.js';
import { SERVICES, hasService } from '../world3d/services.js';
import { IC, ic, esc, sheet, closeSheet, CAT_COLOR, CAT_ICON } from '../world3d/ui3d.js';

await mountShell('world3d', 'Kampung 3D');
const qs = new URLSearchParams(location.search), LOCAL = ['localhost', '127.0.0.1'].includes(location.hostname);
document.body.classList.add('k3d-on');
const rp = n => 'Rp ' + Math.round(n || 0).toLocaleString('id-ID');
const hourNow = () => E.secOfDay() / 3600;
const ageLabel = a => a < 13 ? 'Anak' : a < 18 ? 'Remaja' : a < 60 ? 'Dewasa' : 'Lansia';
const partOf = h => h < 5 ? 'Malam' : h < 10 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam';
const root = document.createElement('div'); root.className = 'k3d'; document.body.appendChild(root);

if (!webglOk()) {
  root.innerHTML = `<div class="k-fallback"><div><h2>Perangkat tidak mendukung grafik 3D</h2><p>Semua fitur tetap tersedia di mode 2D dengan akun dan data yang sama.</p><p><a class="btn primary" href="index.html">Buka mode 2D</a></p></div></div>`;
} else {
  root.innerHTML = `<canvas id="cv" aria-label="Peta kampung 3D. Ketuk tanah untuk berjalan, ketuk bangunan untuk berinteraksi."></canvas><div id="lbls"></div>
  <div class="k-top"><button class="k-card k-prof" id="prof" aria-label="Status karakter"><span class="k-av">${IC.user}</span><span style="min-width:0"><b id="p-name"></b><small id="p-sub"></small><small id="p-job"></small></span></button>
    <div class="k-res"><div class="k-row"><span class="k-chip" id="c-money">${ic('coin')}<span id="v-money"></span></span><button class="k-round" id="bell" aria-label="Notifikasi" style="width:38px;height:38px">${ic('info')}<span class="k-badge" id="bell-n" hidden></span></button></div>
      <div class="k-row"><button class="k-chip btn" id="c-time" aria-label="Jeda atau lanjutkan waktu"><span id="i-time">${ic('sun')}</span><span id="v-time"></span><small id="v-part" style="font-weight:600;color:var(--k-mut)"></small></button></div></div></div>
  <div class="k-right"><button class="k-compass" id="compass" aria-label="Putar kamera 90 derajat"><svg id="cmp" viewBox="0 0 52 52"><circle cx="26" cy="26" r="22" fill="none" stroke="currentColor" stroke-opacity=".18" stroke-width="2"/><path d="M26 6 31 26 26 22 21 26z" fill="#ef4444"/><path d="M26 46 21 26 26 30 31 26z" fill="#94a3b8"/><g id="cmpl" font-size="9" font-weight="800" fill="currentColor" text-anchor="middle"><text x="26" y="14">U</text><text x="43" y="29">T</text><text x="26" y="46">S</text><text x="9" y="29">B</text></g></svg></button>
    <button class="k-round" id="zin" aria-label="Perbesar">${ic('plus')}</button><button class="k-round" id="zout" aria-label="Perkecil">${ic('minus')}</button><button class="k-round" id="eye" aria-label="Tampilkan atau sembunyikan label">${ic('eye')}</button><button class="k-round" id="ctr" aria-label="Kembali ke karakter">${ic('target')}</button></div>
  <div class="k-card k-mini" id="mini"><canvas id="mm" width="296" height="184" aria-label="Peta mini"></canvas></div>
  <div class="k-route" id="route" hidden></div><button class="k-act" id="act"></button>
  <nav class="k-card k-nav" aria-label="Navigasi 3D"><button data-n="peta">${ic('pin')}<span class="t">Peta</span></button><button data-n="ponsel">${ic('phone')}<span class="t">Ponsel</span></button><button data-n="bisnis">${ic('briefcase')}<span class="t">Bisnis</span></button><button data-n="sosial">${ic('people')}<span class="t">Sosial</span></button><button data-n="menu">${ic('grid2d')}<span class="t">Menu</span></button></nav>${qs.has('debug') ? '<pre class="k-dbg" id="dbg"></pre>' : ''}`;
  const $ = s => root.querySelector(s), cv = $('#cv'), lblHost = $('#lbls');
  let nearest = null, openB = null;
  const world = createWorld(cv, { quality: qs.get('q') || (matchMedia('(max-width:700px)').matches ? 'medium' : 'high'), hourFn: hourNow, onNoRoute: () => toast('Tidak ada jalan ke sana. Coba ketuk tempat lain.'),
    onBuilding: (b, arrived) => { if (arrived) openBuilding(b); else toast(`Menuju ${b.name}…`); }, onFrame: f => frameHud(f) });
  const nav = (k) => { root.querySelectorAll('.k-nav button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.n === k))); };
  let toastT = 0; const rt = $('#route'); function toast(t) { rt.textContent = t; rt.hidden = false; clearTimeout(toastT); toastT = setTimeout(() => rt.hidden = true, 1800); }

  // ——— label bangunan ———
  const lbl = new Map(); for (const b of BUILDINGS) { if (b.noLabel) continue; const el = document.createElement('div'); el.className = 'k-lbl' + (b.soon ? ' soon' : ''); el.style.setProperty('--c', CAT_COLOR[b.cat] || '#888'); el.innerHTML = `${ic(CAT_ICON[b.id] || 'info')}<span>${esc(b.name)}</span>`; lblHost.appendChild(el); lbl.set(b.id, el); }
  const me = document.createElement('div'); me.className = 'k-lbl me'; me.textContent = 'Kamu'; lblHost.appendChild(me);
  const place = (el, x, y, z, ox = 0, oy = 0) => { const p = world.project(x, y, z); el.style.display = p.visible && p.y > 70 && p.y < innerHeight - 70 ? '' : 'none'; el.style.transform = `translate(${Math.round(p.x + ox)}px, ${Math.round(p.y + oy)}px) translate(-50%, -100%)`; };

  // ——— peta mini ———
  const mm = $('#mm'), mx = mm.getContext('2d'), sx = mm.width / W, sz = mm.height / D;
  const base = document.createElement('canvas'); base.width = mm.width; base.height = mm.height; (() => { const c = base.getContext('2d'); c.fillStyle = '#8cc063'; c.fillRect(0, 0, base.width, base.height); c.fillStyle = '#555b63'; for (let i = 0; i <= T.nx; i++) c.fillRect((i * T.pitch) * sx, 0, T.road * sx, base.height); for (let j = 0; j <= T.nz; j++) c.fillRect(0, (j * T.pitch) * sz, base.width, T.road * sz);
    for (const b of BUILDINGS) { if (b.kind === 'field') continue; c.fillStyle = CAT_COLOR[b.cat] || '#888'; c.fillRect((b.x0 - T.ox) * sx, (b.z0 - T.oz) * sz, b.w * sx, b.d * sz); } })();
  const drawMini = () => { mx.drawImage(base, 0, 0); const p = world.player.position; mx.fillStyle = '#2563eb'; mx.strokeStyle = '#fff'; mx.lineWidth = 3; mx.beginPath(); mx.arc((p.x - T.ox) * sx, (p.z - T.oz) * sz, 7, 0, 7); mx.fill(); mx.stroke();
    const t = world.target, hh = 16 / world.zoom, ww = hh * world.aspect; mx.strokeStyle = 'rgba(255,255,255,.9)'; mx.lineWidth = 2; mx.strokeRect((t.x - ww * 0.75 - T.ox) * sx, (t.z - hh * 1.1 - T.oz) * sz, ww * 1.5 * sx, hh * 2.2 * sz); };
  $('#mini').addEventListener('click', e => { const r = mm.getBoundingClientRect(); world.walkTo(T.ox + (e.clientX - r.left) / r.width * W, T.oz + (e.clientY - r.top) / r.height * D); });

  // ——— HUD ———
  let frames = 0, lastNear = '';
  function frameHud(f) {
    frames++; const pp = world.player.position;
    for (const [id, el] of lbl) { const b = BY_ID[id]; place(el, b.cx, b.h + 0.6, b.cz); } place(me, pp.x, 1.6, pp.z);
    $('#cmpl').setAttribute('transform', `rotate(${(f.yaw * 180 / Math.PI - 45).toFixed(1)} 26 26)`);
    let nb = null, nd = 1e9; for (const b of BUILDINGS) if (b.door) { const d = Math.hypot(b.door.x - pp.x, b.door.z - pp.z); if (d < nd) { nd = d; nb = b; } }
    nearest = nd < 2.6 ? nb : null; const key = (nearest?.id || '') + f.follow + (f.moving ? 'm' : '');
    if (key !== lastNear) { lastNear = key; const a = $('#act'); a.className = 'k-act' + (nearest ? '' : ' ghost'); a.innerHTML = nearest ? `${ic(CAT_ICON[nearest.id] || 'info')}<span>Masuk ${esc(nearest.name)}<small>${nearest.soon ? 'Belum aktif' : isOpen(nearest, hourNow()) ? 'Ketuk untuk membuka layanan' : 'Sedang tutup'}</small></span>` : `${ic('target')}<span>Kembali ke karakter<small>${f.follow ? 'Kamera mengikuti' : 'Kamera bebas'}</small></span>`; }
    if (f.moving && f.route > 1) { rt.textContent = `Perjalanan ±${Math.round(f.route * 10)} m`; rt.hidden = false; clearTimeout(toastT); } else if (!toastT || rt.textContent.startsWith('Perjalanan')) rt.hidden = true;
    if (frames % 4 === 0) drawMini(); if (frames % 10 === 0) statusHud(); const dbg = $('#dbg'); if (dbg && frames % 20 === 0) dbg.textContent = JSON.stringify(world.stats(), null, 1);
  }
  let notifN = 0;
  function statusHud() {
    const h = hourNow(), age = Math.floor(E.ageYears?.() ?? 0), job = E.S.career?.job, jt = job ? (E.jobById?.(job.jobId || job.id)?.title || job.title || 'Bekerja') : 'Belum bekerja';
    $('#p-name').textContent = E.S.player.name; $('#p-sub').textContent = `${ageLabel(age)} · ${age} th · ${E.P?.city || ''}`; $('#p-job').textContent = (nearest ? 'Di ' + nearest.name : 'Di jalan kampung') + ' · ' + jt;
    $('#v-money').textContent = rp(E.S.player.balance); $('#v-time').textContent = CAL.fmtHM(E.secOfDay()); $('#v-part').textContent = partOf(h) + (E.S.settings.paused ? ' · jeda' : ''); $('#i-time').innerHTML = (h < 6 || h >= 18) ? IC.moon : IC.sun;
    const b = $('#bell-n'); b.hidden = !notifN; b.textContent = notifN > 9 ? '9+' : notifN;
  }
  const refreshNotifs = async () => { try { const r = await SH.notifs(); if (r?.ok) notifN = r.unread || 0; } catch { /* offline: abaikan */ } }; refreshNotifs(); setInterval(refreshNotifs, 30000);

  // ——— sheet bangunan ———
  const dist = b => Math.round(Math.hypot(b.door.x - world.player.position.x, b.door.z - world.player.position.z) * 10);
  function openService(b) {
    const S = SERVICES[b.id]; openB = b;
    const ctx = { toast, refresh: () => paint(), res: r => { toast(r.ok ? r.msg || 'Selesai.' : r.error || 'Gagal.'); paint(); } };
    let el; const paint = () => { const body = el.querySelector('.k-svc'); const y = el.scrollTop; body.innerHTML = S.html(); el.scrollTop = y; statusHud(); };
    el = sheet(root, `<div class="k-sh">${ic(S.icon)}<div><h3>${esc(S.title)}</h3><p><span class="k-tag">Layanan 3D</span></p></div></div><div class="k-svc"></div><a class="k-note" href="${esc(b.actions[0]?.href || 'index.html')}" style="display:block">Butuh tampilan lengkap? Buka versi 2D (data sama).</a>`);
    el.querySelector('.k-svc').innerHTML = S.html(); S.bind(el.querySelector('.k-svc'), ctx);
  }
  function openBuilding(b) {
    if (hasService(b.id) && !b.soon) return openService(b);
    openB = b; const open = isOpen(b, hourNow()), npc = b.npc; const tag = b.soon ? '<span class="k-tag off">Belum aktif</span>' : b.hours ? (open ? `<span class="k-tag">Buka ${String(b.hours[0]).padStart(2, '0')}:00–${String(b.hours[1]).padStart(2, '0')}:00</span>` : `<span class="k-tag warn">Tutup · buka ${String(b.hours[0]).padStart(2, '0')}:00</span>`) : '<span class="k-tag">Layanan online</span>';
    const acts = b.soon ? `<p class="k-note"><b>Jujur:</b> ${esc(b.soon)}</p>` : `<div class="k-list">${b.actions.filter(a => !(b.hours && !open)).map(a => `<a class="k-li" href="${a.href}">${ic(a.ic)}<span><b>${esc(a.label)}</b><small>${esc(a.note)}</small></span></a>`).join('') || `<p class="k-note">Tutup saat ini. Kembali pukul ${String(b.hours?.[0] ?? 0).padStart(2, '0')}:00.</p>`}</div>`;
    const els = sheet(root, `<div class="k-sh">${ic(CAT_ICON[b.id] || 'info')}<div><h3>${esc(b.name)}</h3><p>${tag}</p></div></div>${npc ? `<p class="k-note" style="margin:0 0 6px"><b>${esc(npc.name)}:</b> ${esc(open ? npc.say() : 'Warung sudah tutup, Nak. Buka lagi pukul 06:00 ya.')}</p>` : ''}<p class="k-note" style="margin:0">${esc(b.desc)}</p>${acts}<p class="k-note">Semua transaksi dijalankan oleh sistem BizSim yang sama dengan mode 2D (divalidasi server).</p>`, { onClose: () => { openB = null; nav(''); } });
  }
  $('#act').onclick = () => nearest ? openBuilding(nearest) : (world.recenter(), toast('Kamera kembali ke karakter'));

  // ——— tab navigasi ———
  const apps = [['Marketplace', 'marketplace.html', 'store'], ['Bank', 'finance.html#rekening', 'bank'], ['Investasi', 'investments.html#portfolio', 'pie'], ['Pasar Saham', 'market.html', 'chart'], ['Pesan & Sosial', 'social.html', 'people'], ['Kalender', 'calendar.html', 'calendar'], ['Lowongan', 'career.html#jobs', 'briefcase'], ['Pesanan', 'shop.html#pesanan', 'truck'], ['Notifikasi', 'shop.html#notif', 'info']];
  const needBars = () => NEEDS.map(n => { const v = Math.round(NE.value(n.key)), lv = NE.level(n.key), pct = Math.max(0, Math.min(100, v)); return `<div class="k-need"><span>${esc(n.label)}</span><div class="k-bar"><i class="${lv === 'critical' ? 'crit' : lv === 'low' ? 'low' : ''}" style="width:${pct}%"></i></div><b>${v}</b></div>`; }).join('');
  function panel(k) {
    nav(k);
    if (k === 'peta') { const list = BUILDINGS.filter(b => b.door).map(b => ({ b, d: dist(b) })).sort((a, c) => a.d - c.d); sheet(root, `<div class="k-sh">${ic('pin')}<div><h3>Peta kampung</h3><p>Ketuk untuk berjalan ke sana</p></div></div><div class="k-list">${list.map(({ b, d }) => `<button class="k-li" data-go="${b.id}">${ic(CAT_ICON[b.id] || 'info')}<span><b>${esc(b.name)}</b><small>${d} m${b.soon ? ' · belum aktif' : b.hours && !isOpen(b, hourNow()) ? ' · tutup' : ''}</small></span></button>`).join('')}</div>`, { onClose: () => nav('') }).addEventListener('click', e => { const g = e.target.closest('[data-go]'); if (g) { closeSheet(root); world.goBuilding(g.dataset.go); } }); }
    else if (k === 'ponsel') sheet(root, `<div class="k-sh">${ic('phone')}<div><h3>Ponsel</h3><p>Aplikasi memakai sistem yang sama dengan 2D</p></div></div><div class="k-grid">${apps.map(([l, h, i]) => `<a class="k-app" href="${h}">${ic(i)}<span>${l}</span></a>`).join('')}</div>`, { onClose: () => nav('') });
    else if (k === 'bisnis') sheet(root, `<div class="k-sh">${ic('briefcase')}<div><h3>Bisnis & Karier</h3><p>Saldo ${rp(E.S.player.balance)}</p></div></div><div class="k-list">${[['Business', 'business.html', 'business', 'Kelola usaha dan produksi'], ['Seller Center', 'seller.html', 'store', 'Toko dan pesanan marketplace'], ['Creator Studio', 'studio.html', 'studio', 'Konten dan karya'], ['Karier', 'career.html#active', 'task', 'Pekerjaan, payroll, magang'], ['Asset Market', 'market.html', 'chart', 'Trading aset'], ['Keuangan', 'finance.html#ringkasan', 'coin', 'Rekening, kartu, transfer'], ['Investasi', 'investments.html#portfolio', 'pie', 'Portofolio, emas, tanah']].map(([l, h, i, n]) => `<a class="k-li" href="${h}">${ic(i)}<span><b>${l}</b><small>${n}</small></span></a>`).join('')}</div>`, { onClose: () => nav('') });
    else if (k === 'sosial') sheet(root, `<div class="k-sh">${ic('people')}<div><h3>Sosial</h3><p>Kontak, pesan, utang, dan janji</p></div></div><div class="k-list"><a class="k-li" href="social.html">${ic('people')}<span><b>Buka Sosial</b><small>Kontak NPC, pesan, bantuan</small></span></a><a class="k-li" href="calendar.html">${ic('calendar')}<span><b>Kalender & Jadwal</b><small>Agenda dan pengingat</small></span></a></div><p class="k-note">Penduduk di jalan adalah ambient (visual saja) dan belum punya profil; kontak nyata ada di Sosial.</p>`, { onClose: () => nav('') });
    else menuPanel();
  }
  // ——— pengaturan 3D (suara, kamera/kontrol, tampilan, hemat baterai) — presentasi saja, tersimpan di save lewat E.setPref3D ———
  const PREF_DEF = { master: 0.7, fx: 1, amb: 1, muted: false, sens: 1, pinch: 1, dist: 0, shadows: true, ui: 1, power: false };
  const prefs = () => ({ ...PREF_DEF, ...(E.S.settings.w3d || {}) });
  function applyPrefs() { const p = prefs(); world.audio.setVolumes({ master: p.master, fx: p.fx, amb: p.amb, muted: p.muted }); world.setOptions({ sens: p.sens, pinch: p.pinch, drawDist: p.dist, shadows: p.shadows, power: p.power }); root.style.setProperty('--k-ui', p.ui); }
  const setPref = patch => { E.setPref3D(patch); applyPrefs(); };
  const rng = (k, l, min, max, step, v) => `<div class="k-srow"><label for="r_${k}">${l}</label><input id="r_${k}" class="k-rng" type="range" data-r="${k}" min="${min}" max="${max}" step="${step}" value="${v}"></div>`;
  const sw = (k, l, on) => `<div class="k-srow"><span class="k-sl">${l}</span><div class="k-seg"><button data-sw="${k}:1" aria-pressed="${!!on}">Aktif</button><button data-sw="${k}:0" aria-pressed="${!on}">Mati</button></div></div>`;
  const segOf = (k, l, opts, cur) => `<div class="k-srow"><span class="k-sl">${l}</span><div class="k-seg">${opts.map(([v, t]) => `<button data-sg="${k}:${v}" aria-pressed="${cur === v}">${t}</button>`).join('')}</div></div>`;
  function settingsHtml() { const p = prefs(); return `<div class="k-sec">Suara</div><div class="k-set">${sw('muted', 'Bisukan semua', p.muted)}${rng('master', 'Volume utama', 0, 1, 0.05, p.master)}${rng('fx', 'Efek (langkah, kendaraan, pintu)', 0, 1, 0.05, p.fx)}${rng('amb', 'Lingkungan (burung, pasar, mesin)', 0, 1, 0.05, p.amb)}<button class="k-btn" data-test="1">Tes suara</button></div>
      <div class="k-sec">Kamera & kontrol</div><div class="k-set">${rng('sens', 'Kepekaan geser kamera', 0.5, 2, 0.1, p.sens)}${rng('pinch', 'Kepekaan zoom cubit', 0.5, 2, 0.1, p.pinch)}</div>
      <div class="k-sec">Tampilan</div><div class="k-set">${segOf('dist', 'Jarak render NPC/kendaraan', [[14, 'Dekat'], [24, 'Sedang'], [0, 'Jauh']], p.dist)}${sw('shadows', 'Bayangan karakter', p.shadows)}${segOf('ui', 'Ukuran UI', [[0.9, 'Kecil'], [1, 'Normal'], [1.15, 'Besar']], p.ui)}${sw('power', 'Mode hemat baterai (30 fps, resolusi 1×)', p.power)}</div>`; }
  function menuPanel() {
    const q = world.quality; const el = sheet(root, `<div class="k-sh">${ic('grid2d')}<div><h3>Menu</h3><p>${esc(E.S.player.name)}</p></div></div>
      <div class="k-sec">Kebutuhan karakter</div>${needBars()}<div class="k-sec">Pengaturan grafis</div><div class="k-seg" id="qseg">${['low', 'medium', 'high'].map(x => `<button data-q="${x}" aria-pressed="${q === x}">${{ low: 'Low', medium: 'Medium', high: 'High' }[x]}</button>`).join('')}</div>
      <p class="k-note">Low: resolusi 1×, 4 pejalan, 2 kendaraan. High: resolusi hingga 1,75×, 14 pejalan, 7 kendaraan. Kualitas turun otomatis bila frame lambat.</p><div class="k-sec">Waktu</div><div class="k-seg" id="spd">${[['pause', 'Jeda'], ...CAL.SPEEDS.slice(0, 4).map(s => [s.rate, s.label || (s.rate / CAL.DEFAULT_RATE) + '×'])].map(([v, l]) => `<button data-s="${v}" aria-pressed="${v === 'pause' ? E.S.settings.paused : (!E.S.settings.paused && E.S.settings.rate === v)}">${l}</button>`).join('')}</div>
      ${settingsHtml()}<div class="k-sec">Mode</div><div class="k-list"><a class="k-li" href="index.html">${ic('grid2d')}<span><b>Buka mode 2D</b><small>Akun, karakter, dan save sama persis</small></span></a><a class="k-li" href="life.html">${ic('heart')}<span><b>Kehidupan 2D</b><small>Makan, istirahat, inventaris</small></span></a></div>`, { onClose: () => nav('') });
    el.addEventListener('input', e => { const r = e.target.closest('[data-r]'); if (r) setPref({ [r.dataset.r]: +r.value }); });
    el.addEventListener('click', e => {
      const sg = e.target.closest('[data-sg],[data-sw]'); if (sg) { const [k, v] = (sg.dataset.sg || sg.dataset.sw).split(':'); setPref({ [k]: sg.dataset.sw ? v === '1' : +v }); sg.parentElement.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b === sg))); }
      if (e.target.closest('[data-test]')) { world.audio.unlock(); world.audio.door(); setTimeout(() => world.audio.step('hard'), 200); setTimeout(() => world.audio.tap(), 380); }
    });
    el.addEventListener('click', e => { const q = e.target.closest('[data-q]'); if (q) { world.setQuality(q.dataset.q); el.querySelectorAll('[data-q]').forEach(b => b.setAttribute('aria-pressed', String(b === q))); } const s = e.target.closest('[data-s]'); if (s) { if (s.dataset.s === 'pause') E.setPaused(!E.S.settings.paused); else { E.setRate(+s.dataset.s); if (E.S.settings.paused) E.setPaused(false); } closeSheet(root); setTimeout(menuPanel, 220); } });
  }
  applyPrefs(); root.addEventListener('click', e => { if (e.target.closest('button,a')) world.audio.ui(); });
  root.querySelector('.k-nav').addEventListener('click', e => { const b = e.target.closest('button[data-n]'); if (b) panel(b.dataset.n); });
  $('#prof').onclick = () => { nav('menu'); menuPanel(); };
  $('#bell').onclick = () => { location.href = 'shop.html#notif'; };
  $('#compass').onclick = () => world.rotate(1); $('#zin').onclick = () => world.zoomBy(1.25); $('#zout').onclick = () => world.zoomBy(0.8); $('#ctr').onclick = () => { world.recenter(); toast('Kamera kembali ke karakter'); };
  $('#eye').onclick = () => root.classList.toggle('k-hide-lbl'); $('#c-time').onclick = () => E.setPaused(!E.S.settings.paused);

  world.start(hourNow); statusHud();
  document.addEventListener('visibilitychange', () => document.hidden ? world.stop() : world.start(hourNow));
  if (LOCAL) window.__bizsimQA = { E, NE, world, openBuilding, panel, F: null };
}
