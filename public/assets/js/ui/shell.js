// App shell — navigasi global BizSim (sidebar desktop + bottom nav mobile). Struktur sama di semua halaman.
import * as E from '../engine/core.js';
import * as FIN from '../engine/finance.js';
import { icon, rpShort, openDialog, toast, $, esc } from './ui.js';
import { fmtDay, fmtHMS } from '../engine/calendar.js';
import { checkReminders } from './reminders.js';
import { createCharacter } from './onboarding.js';

// Navigasi: sidebar desktop dikelompokkan; mobile memakai 4 tujuan utama + tombol Menu (lembar semua fitur).
export const NAV = [
  { id: 'dashboard', href: 'index.html', label: 'Beranda', short: 'Beranda', icon: 'dashboard', group: 'Hidup' },
  { id: 'life', href: 'life.html', label: 'Kehidupan', short: 'Hidup', icon: 'life', group: 'Hidup' },
  { id: 'calendar', href: 'calendar.html', label: 'Kalender & Jadwal', short: 'Kalender', icon: 'calendar', group: 'Hidup' },
  { id: 'finance', href: 'finance.html', label: 'Keuangan', short: 'Uang', icon: 'wallet', group: 'Uang & Aset' },
  { id: 'market', href: 'market.html', label: 'Pasar Simulasi', short: 'Pasar', icon: 'market', group: 'Uang & Aset' },
  { id: 'investments', href: 'investments.html', label: 'Investasi', short: 'Investasi', icon: 'invest', group: 'Uang & Aset' },
  { id: 'business', href: 'business.html', label: 'Bisnis', short: 'Bisnis', icon: 'business', group: 'Uang & Aset' },
  { id: 'education', href: 'education.html', label: 'Pendidikan', short: 'Sekolah', icon: 'education', group: 'Karier & Ilmu' },
  { id: 'career', href: 'career.html', label: 'Karier & Pekerjaan', short: 'Karier', icon: 'career', group: 'Karier & Ilmu' },
  { id: 'studio', href: 'studio.html', label: 'Studio Kreator', short: 'Kreator', icon: 'studio', group: 'Karier & Ilmu' },
];
const BOTTOM = ['dashboard', 'life', 'finance', 'calendar'];
// Isi lembar Menu (mobile) — setiap fitur dan sub-bagian penting, langsung ke tab yang dituju.
export const MENU = [
  { title: 'Hidup sehari-hari', items: [
    ['dashboard', 'index.html', 'Dashboard', 'dashboard'], ['life', 'life.html#kebutuhan', 'Kebutuhan', 'life'], ['life', 'life.html#makan', 'Makan & Minum', 'food'],
    ['life', 'life.html#istirahat', 'Istirahat & Mandi', 'bed'], ['life', 'life.html#kesehatan', 'Kesehatan', 'heart'], ['life', 'life.html#antar', 'Pesan Antar', 'truck'],
    ['life', 'life.html#belanja', 'Belanja', 'cart'], ['life', 'life.html#transport', 'Transport', 'bus'], ['calendar', 'calendar.html', 'Kalender', 'calendar'] ] },
  { title: 'Keuangan', items: [
    ['finance', 'finance.html#ringkasan', 'Ringkasan', 'wallet'], ['finance', 'finance.html#rekening', 'Rekening Bank', 'bank'], ['finance', 'finance.html#kartu', 'Kartu', 'card'],
    ['finance', 'finance.html#dompet', 'Dompet Digital', 'qr'], ['finance', 'finance.html#topup', 'Top Up', 'up'], ['finance', 'finance.html#transfer', 'Transfer', 'transfer'],
    ['finance', 'finance.html#riwayat', 'Riwayat', 'history'], ['finance', 'finance.html#tagihan', 'Tagihan Kartu', 'doc'] ] },
  { title: 'Aset & Usaha', items: [
    ['market', 'market.html', 'Asset Market', 'market'], ['investments', 'investments.html#portfolio', 'Portofolio', 'chart'], ['investments', 'investments.html#tanah', 'Tanah', 'land'],
    ['investments', 'investments.html#emas', 'Emas', 'gold'], ['investments', 'investments.html#deposito', 'Deposito', 'lock'], ['business', 'business.html', 'Business', 'business'] ] },
  { title: 'Karier & Pendidikan', items: [
    ['education', 'education.html#overview', 'Education', 'education'], ['education', 'education.html#exam', 'Ruang Ujian', 'exam'], ['career', 'career.html#jobs', 'Lowongan', 'career'],
    ['career', 'career.html#active', 'Pekerjaan Aktif', 'task'], ['studio', 'studio.html', 'Creator Studio', 'studio'], ['studio', 'studio.html#live', 'Live Studio', 'broadcast'] ] },
];
const AGE_PAGE = { market: 'trading', investments: 'invest', business: 'business', career: 'gig' };

export async function mountShell(pageId, title, opts = {}) {
  const boot = document.createElement('div'); boot.className = 'boot-screen';
  boot.innerHTML = `<div class="stack" style="align-items:center"><div class="brand" style="color:var(--navy)"><span class="brand-mark">BZ</span> BIZSIM</div><p class="muted" role="status">Memuat profil & progres dari server…</p></div>`;
  document.body.prepend(boot);
  try { await E.boot({ createCharacter: st => createCharacterLoop(st) }); }
  catch (err) {
    boot.innerHTML = `<div class="panel" style="max-width:440px"><div class="panel-b stack"><div class="msg error">${icon('alert')}<span><b>Server BizSim tidak dapat dihubungi.</b><br>${esc(err.message)}</span></div><p class="subtle" style="margin:0">Progres disimpan di server, jadi game tidak berjalan tanpa koneksi. Jalankan <span class="mono">node server/server.cjs</span> lalu muat ulang.</p><button class="btn primary" onclick="location.reload()">Coba lagi</button></div></div>`;
    throw err;
  }
  boot.remove();
  const app = document.createElement('div'); app.className = 'app';
  app.innerHTML = `
  <aside class="sidebar" aria-label="Navigasi utama">
    <div class="brand"><span class="brand-mark">BZ</span> BIZSIM</div>
    <nav class="side-nav">${[...new Set(NAV.map(n => n.group))].map(g => `<div class="nav-group">${g}</div>${NAV.filter(n => n.group === g).map(n => `<a class="nav-link" data-mod="${n.id}" href="${n.href}" ${n.id === pageId ? 'aria-current="page"' : ''}>${icon(n.icon)}${n.label}</a>`).join('')}`).join('')}</nav>
    <div class="spacer"></div>
    <div class="side-card" id="side-status"></div>
    <a class="nav-link" href="#" data-settings>${icon('settings')}Settings</a>
  </aside>
  <div class="main">
    <header class="topbar">
      <h1>${title}</h1>
      <span class="sim-badge live" title="Semua harga, gaji, biaya, dan hasil adalah simulasi game">SIMULASI</span>
      <span class="sync-dot hide-m" id="sync" aria-live="polite"></span>
      <div class="clock" id="clock"></div>
      <div class="avatar" id="avatar"></div>
    </header>
    <header class="mobile-head">
      <div class="r1"><span class="t">${title}</span><span class="sim-badge live">SIMULASI</span><button class="icon-btn" data-settings aria-label="Settings">${icon('settings')}</button></div>
      <div class="r2" id="mclock"></div>
    </header>
    <div id="age-banner"></div>
    <main class="content" id="page"></main>
  </div>
  <nav class="bottomnav" aria-label="Navigasi utama">${BOTTOM.map(id => NAV.find(n => n.id === id)).map(n => `<a href="${n.href}" ${n.id === pageId ? 'aria-current="page"' : ''}>${icon(n.icon)}${n.short}</a>`).join('')}<button type="button" class="bn-menu" data-menu aria-haspopup="dialog" ${BOTTOM.includes(pageId) ? '' : 'aria-current="page"'}>${icon('grid')}Menu</button></nav>`;
  document.body.dataset.module = pageId;
  document.body.dataset.designSystem = 'v71';
  document.body.prepend(app);
  // Simpan ke server sebelum pindah halaman (beacon/keepalive dibatasi 64 KB, jadi tunggu simpan selesai).
  app.addEventListener('click', async e => {
    const a = e.target.closest('a[href]'); if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const href = a.getAttribute('href'); if (!/\.html(\?|#|$)/.test(href)) return;
    e.preventDefault(); E.save(); await E.flush();
    const u = new URL(href, location.href); if (!u.search && location.search) u.search = location.search; location.href = u.href;
  });
  app.querySelector('[data-menu]').addEventListener('click', () => menuSheet(pageId));
  document.querySelectorAll('[data-settings]').forEach(b => b.addEventListener('click', e => { e.preventDefault(); settingsDialog(); }));
  // Jam di header: tanggal & waktu dibaca dari simulation clock (event 'clock' 10 Hz hanya mengganti teks, tombol dirender saat state berubah).
  const clockText = () => { const k = E.clockNow(); return { date: fmtDay(k.day, 'compact'), time: fmtHMS(k.secOfDay), title: `Hari ke-${k.day + 1} · ${fmtDay(k.day, 'full')}` }; };
  const paintClock = () => { const t = clockText(); document.querySelectorAll('[data-clk-date]').forEach(e => { if (e.textContent !== t.date) e.textContent = t.date; }); document.querySelectorAll('[data-clk-time]').forEach(e => { e.textContent = t.time; }); document.querySelectorAll('[data-clk-link]').forEach(e => { e.title = t.title + ' — buka kalender'; }); };
  const renderClock = () => {
    const S = E.S, t = clockText();
    const when = `<a class="when clk-link" href="calendar.html" data-clk-link aria-label="Buka kalender & jadwal">${icon('calendar', 'width="14" height="14"')}<span data-clk-date>${t.date}</span> · <b class="num" data-clk-time>${t.time}</b>${S.settings.paused ? ' <span class="clk-state">Jeda</span>' : E.liveActive() ? ' <span class="clk-state live">Live</span>' : ''}</a>`;
    const ctr = `
      <button class="icon-btn" data-act="pause" aria-pressed="${S.settings.paused}" aria-label="${S.settings.paused ? 'Lanjutkan simulasi' : 'Jeda simulasi'}" title="${S.settings.paused ? 'Lanjutkan' : 'Jeda'}">${icon(S.settings.paused ? 'play' : 'pause')}</button>
      ${E.SPEEDS.map(x => `<button class="icon-btn" data-rate="${x.rate}" aria-pressed="${S.settings.rate === x.rate}" title="${x.name}: ${x.desc}" aria-label="Kecepatan ${x.name}">${x.label}</button>`).join('')}
      <button class="icon-btn" data-act="skip" title="Lewati ke hari berikutnya (00:00:00)" aria-label="Lewati ke hari berikutnya">${icon('skip')}</button>`;
    $('#clock').innerHTML = when + ctr;
    $('#mclock').innerHTML = when + `<span class="row" style="gap:2px">${ctr}</span>`;
    const age = E.ageYears();
    $('#avatar').innerHTML = `<img class="circle avatar-art" src="assets/img/avatars/${esc(E.P?.avatarId || 'avatar-1')}.svg" alt="Avatar karakter"><span class="hide-m"><b>${esc(E.P?.nickname || S.player.name)}</b><br><span class="subtle num">${age} th · ${rpShort(S.player.balance)}</span></span>`;
    const ed = E.EDU?.edu; const eduTxt = ed?.status === 'enrolled' ? `${ed.stage} · ${ed.labelTerm}` : ed?.highest && ed.highest !== 'Tidak ada' ? `Lulus ${ed.highest}` : 'Belum bersekolah';
    $('#side-status').innerHTML = `${esc(S.player.name)} · <b>${age} th</b><br>Saldo <b class="num">${rpShort(S.player.balance)}</b><br>${esc(eduTxt)}`;
    const lock = opts.banner !== false && AGE_PAGE[pageId] ? E.ageLock(AGE_PAGE[pageId]) : null;
    $('#age-banner').innerHTML = lock ? `<div class="content age-banner" style="padding-bottom:0"><div class="msg warn">${icon('lock')}<span><b>Mode lihat saja.</b> ${esc(lock)} ${pageId === 'career' ? 'Lowongan tetap bisa dilihat beserta syaratnya; aksi yang butuh usia lebih tinggi dinonaktifkan oleh engine.' : 'Harga tetap bergerak dari simulation engine; transaksi dinonaktifkan oleh engine.'} Fokus saat ini: <a href="education.html">pendidikan</a>.</span></div></div>` : '';
  };
  const renderSync = () => {
    const s = E.sync, el = $('#sync'); if (!el) return;
    el.className = 'sync-dot hide-m' + (s.status === 'error' ? ' error' : '');
    el.textContent = s.status === 'saving' ? 'Menyimpan…' : s.status === 'error' ? 'Gagal menyimpan — dicoba lagi' : s.status === 'saved' ? 'Tersimpan di server' : s.status === 'stale' ? 'Save lebih lama ditolak' : '';
    if (s.status === 'stale' && !$('#stale-banner')) {
      $('#page').insertAdjacentHTML('afterbegin', `<div class="msg error" id="stale-banner" role="alert" style="margin-bottom:12px">${icon('alert')}<span><b>Jam simulasi di tab ini tertinggal dari server.</b> ${esc(s.error || '')} <button class="btn sm primary" data-act="reload" style="margin-top:6px">Muat ulang</button></span></div>`);
    }
  };
  app.addEventListener('click', e => {
    const b = e.target.closest('[data-act],[data-rate]'); if (!b) return;
    if (b.dataset.act === 'reload') { location.reload(); return; }
    if (E.isStale()) { toast('Muat ulang halaman dulu — jam di tab ini tertinggal dari server.', 'error'); return; }
    if (b.dataset.act === 'pause') E.setPaused(!E.S.settings.paused);
    if (b.dataset.act === 'skip') { if (E.liveActive()) { toast('Tidak bisa melewati hari saat live berjalan. Akhiri live dulu.', 'error'); return; } E.skipToNextDay(1); toast(`${fmtDay(E.dayNow(), 'long')} dimulai (hari ke-${E.dayNow() + 1}). Kehadiran, uang saku, dan jadwal sekolah diproses.`); }
    if (b.dataset.rate) { E.setRate(+b.dataset.rate); if (E.S.settings.paused) E.setPaused(false); }
    renderClock();
  });
  renderClock(); renderSync();
  E.on('tick', renderClock); E.on('change', renderClock); E.on('sync', renderSync); E.on('clock', paintClock);
  E.on('tick', () => checkReminders()); setTimeout(() => checkReminders(), 600);
  FIN.init().catch(() => {}); // sinkron keuangan server (antrean gaji, biaya admin, tagihan) di semua halaman
  return $('#page');
}

/** Lembar Menu (mobile): semua fitur dalam grid ikon, dikelompokkan; tidak perlu mencari fitur di banyak halaman. */
function menuSheet(pageId) {
  const here = location.pathname.split('/').pop() + location.hash;
  openDialog(`<div class="sheet-grip" aria-hidden="true"></div><div class="dlg-h"><h2>Semua fitur</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b menu-sheet">${MENU.map(sec => `<section><h3>${sec.title}</h3><div class="menu-grid">${sec.items.map(([mod, href, label, ico]) => `<a class="menu-tile" data-mod="${mod}" href="${href}" ${href === here || (href.split('#')[0] === here.split('#')[0] && !href.includes('#') && mod === pageId) ? 'aria-current="page"' : ''}><span class="ti">${icon(ico)}</span><span>${label}</span></a>`).join('')}</div></section>`).join('')}
    <section><h3>Akun</h3><div class="menu-grid"><button class="menu-tile" data-mod="dashboard" data-msettings><span class="ti">${icon('settings')}</span><span>Settings & Profil</span></button></div></section>
  </div>`, { onMount: d => {
    d.classList.add('sheet');
    d.addEventListener('click', async e => {
      if (e.target.closest('[data-msettings]')) { d.close(); settingsDialog(); return; }
      const a = e.target.closest('a[href]'); if (!a) return;
      const href = a.getAttribute('href'), [file, hash] = href.split('#');
      e.preventDefault(); d.close();
      const same = file === location.pathname.split('/').pop() || (file === 'index.html' && /\/$/.test(location.pathname));
      E.save(); await E.flush();
      // Halaman yang mendengarkan hashchange cukup ganti hash; halaman lain dimuat ulang pada tab yang dituju.
      if (same) { if (!hash || location.hash === '#' + hash) return; location.hash = hash; if (!window.__hashNav) location.reload(); return; } const u = new URL(href, location.href); if (!u.search && location.search) u.search = location.search; location.href = u.href;
    });
  } });
}

async function createCharacterLoop(st, opts) {
  const r = await createCharacter(st, opts);
  return r;
}

function settingsDialog() {
  const S = E.S, P = E.P || {};
  openDialog(`<div class="dlg-h"><h2>Settings</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
  <div class="dlg-b stack">
    <dl class="dl"><dt>Karakter</dt><dd>${esc(S.player.name)}</dd><dt>ID karakter</dt><dd class="mono">${esc(E.EDU?.charId || '—')}</dd><dt>Seed simulasi</dt><dd class="mono">${S.seed}</dd></dl>
    <div class="msg info">${icon('info')}<span>Harga pasar dan bank soal berasal dari engine dengan <b>seed ${S.seed}</b>. Seed dan aksi yang sama menghasilkan hasil yang sama. Progres disimpan di server BizSim.</span></div>
    <div class="divider"></div>
    <h3>Karakter baru</h3>
    <p class="subtle" style="margin:0">Membuat karakter baru memulai dunia simulasi dari awal (usia 6–7 tahun, calon siswa SD, saldo Rp 0). Catatan kelulusan karakter lama tetap tersimpan di Graduation Records.</p>
    <div><button class="btn" id="newchar">${icon('user')}Buat karakter baru</button></div>
  </div>
  <div class="dlg-f"><button class="btn primary" data-close>Tutup</button></div>`, {
    onMount: d => {
      d.querySelector('#newchar').addEventListener('click', async () => {
        if (!confirm('Buat karakter baru? Dunia simulasi saat ini (saldo, aset, karier, progres sekolah) diganti dengan yang baru.')) return;
        d.close(); E.stop();
        const r = await createCharacter({ family: E.EDU?.family }, { cancellable: true, seed: S.seed });
        if (!r) { E.start(); return; }
        await E.newGameFor(r); location.reload();
      });
    }
  });
}
