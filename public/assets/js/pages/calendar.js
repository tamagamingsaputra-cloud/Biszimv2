// CALENDAR — jam simulasi, kalender bulanan, jadwal harian, agenda, riwayat, dan aturan waktu.
// Semua nilai dibaca dari simulation clock (engine/core.js), aturan kalender (engine/calendar.js),
// dan event engine (engine/agenda.js). Halaman ini tidak membuat jadwal sendiri.
import * as E from '../engine/core.js';
import * as CAL from '../engine/calendar.js';
import * as AG from '../engine/agenda.js';
import { TIME_RULES as TR, SERVICE_HOURS, NOT_YET } from '../data/time-rules.js';
import { mountShell } from '../ui/shell.js';
import { rp, rpShort, cls, icon, esc, $, toast, empty } from '../ui/ui.js';

const page = await mountShell('calendar', 'Kalender & Jadwal');
// Kait QA hanya untuk uji lokal (localhost + ?visitor=), tidak aktif di deploy.
if (new URLSearchParams(location.search).has('visitor') && ['localhost', '127.0.0.1'].includes(location.hostname)) window.__bizsimQA = { E, AG, CAL };
const TABS = [['month', 'Bulan'], ['day', 'Hari'], ['agenda', 'Agenda'], ['history', 'Riwayat'], ['rules', 'Aturan waktu']];
let tab = TABS.some(t => t[0] === location.hash.slice(1)) ? location.hash.slice(1) : 'month';
let sel = E.dayNow();                              // hari yang dipilih
let view = { y: CAL.yearOf(sel), m: CAL.monthOf(sel) }; // bulan yang ditampilkan
let agFilter = 'all';
const AG_FILTERS = [['all', 'Semua'], ['tenggat', 'Tenggat'], ['tagihan', 'Tagihan'], ['gaji', 'Gajian'], ['sekolah', 'Sekolah & ujian'], ['kreator', 'Kreator'], ['investasi', 'Investasi & bisnis']];
const CERT = { terjadwal: ['Terjadwal', 'info'], estimasi: ['Estimasi', 'warn'], tenggat: ['Tenggat', 'neg'] };
const PLAN_LBL = { tidur: 'Tidur', sekolah: 'Sekolah', kerja: 'Kerja', live: 'Live', luang: 'Waktu luang' };

page.innerHTML = `<div class="page-head"><div><p>Satu jam simulasi untuk seluruh BizSim. Tanggal memakai kalender game (12 bulan × 30 hari, tanpa tahun kabisat), terpisah dari tanggal perangkat. Jadwal di sini dibaca dari aturan yang benar-benar dijalankan engine.</p></div></div>
<section class="panel cal-clock" id="clk"></section>
<div class="tabs" role="tablist" id="tabs" style="margin-top:16px"></div>
<div id="body" style="margin-top:16px"></div>`;

// ————————————————————————— jam (diperbarui oleh event 'clock', 10×/detik) —————————————————————————
function clockPanel() {
  const k = E.clockNow(), sp = CAL.SPEEDS.find(x => x.rate === E.S.settings.rate) || CAL.SPEEDS[1];
  const state = E.isStale() ? ['Tertahan', 'neg'] : k.paused ? ['Jeda', 'warn'] : k.live ? ['Live — diperlambat', 'info'] : ['Berjalan', 'pos'];
  $('#clk').innerHTML = `<div class="panel-b cal-clock-b">
    <div class="cal-now">
      <div class="subtle" data-c="wd">${CAL.WEEKDAYS[k.weekday]} · Hari ke-${k.day + 1}</div>
      <div class="cal-date" data-c="date">${CAL.fmtDay(k.day, 'long')}</div>
      <div class="cal-time num" data-c="time" aria-live="off">${CAL.fmtHMS(k.secOfDay)}</div>
      <div class="row" style="gap:8px;flex-wrap:wrap"><span class="chip ${state[1]}" data-c="state">${state[0]}</span><span class="subtle" data-c="rate">${k.live ? `Live: 1 detik nyata = ${Math.round(k.effRate / 60)} menit game` : sp.desc}</span></div>
    </div>
    <div class="cal-ctl">
      <div class="label">Kecepatan waktu</div>
      <div class="seg cal-speed" role="group" aria-label="Kecepatan waktu">${CAL.SPEEDS.map(x => `<button data-crate="${x.rate}" aria-pressed="${E.S.settings.rate === x.rate}" title="${x.desc}">${x.name}</button>`).join('')}</div>
      <div class="row" style="gap:8px;margin-top:10px;flex-wrap:wrap">
        <button class="btn sm ${k.paused ? 'primary' : ''}" data-cact="pause">${icon(k.paused ? 'play' : 'pause')} ${k.paused ? 'Lanjutkan' : 'Jeda'}</button>
        <button class="btn sm" data-cact="skip" ${k.live ? 'disabled title="Akhiri live dulu"' : ''}>${icon('skip')} Lewati ke hari berikutnya</button>
      </div>
      <div class="cal-tick"><div class="row between subtle"><span>Proses engine berikutnya</span><b class="num" data-c="next">${CAL.fmtHM((Math.floor(k.secOfDay / CAL.SEC_PER_TICK) + 1) * CAL.SEC_PER_TICK)}</b></div>
        <div class="bar" style="margin-top:6px"><i data-c="bar" style="width:${(E.S.clock.sec / CAL.SEC_PER_TICK * 100).toFixed(1)}%"></i></div>
        <div class="subtle" style="margin-top:4px">Ekonomi, produksi, dan pasar diproses setiap 30 menit game. Waktu tidak berjalan saat aplikasi ditutup.</div></div>
    </div></div>`;
}
let lastClockDay = null, lastPaused = null, lastRate = null, lastLive = null;
function paintClock() {
  const k = E.clockNow();
  if (k.day !== lastClockDay || k.paused !== lastPaused || k.rate !== lastRate || k.live !== lastLive) { lastClockDay = k.day; lastPaused = k.paused; lastRate = k.rate; lastLive = k.live; clockPanel(); return; }
  const set = (c, v) => { const el = $(`#clk [data-c="${c}"]`); if (el && el.textContent !== v) el.textContent = v; };
  set('time', CAL.fmtHMS(k.secOfDay));
  set('next', CAL.fmtHM((Math.floor(k.secOfDay / CAL.SEC_PER_TICK) + 1) * CAL.SEC_PER_TICK));
  const bar = $('#clk [data-c="bar"]'); if (bar) bar.style.width = `${(E.S.clock.sec / CAL.SEC_PER_TICK * 100).toFixed(1)}%`;
  const now = $('#plan-now'); if (now && sel === k.day) now.style.left = `${k.secOfDay / CAL.SEC_PER_DAY * 100}%`;
}
$('#clk').addEventListener('click', e => {
  const b = e.target.closest('[data-crate],[data-cact]'); if (!b) return;
  if (E.isStale()) { toast('Muat ulang halaman dulu — jam di tab ini tertinggal dari server.', 'error'); return; }
  if (b.dataset.crate) { const r = E.setRate(+b.dataset.crate); if (E.S.settings.paused) E.setPaused(false); if (r?.msg) toast(r.msg); }
  if (b.dataset.cact === 'pause') E.setPaused(!E.S.settings.paused);
  if (b.dataset.cact === 'skip') { if (E.liveActive()) return toast('Tidak bisa melewati hari saat live berjalan.', 'error'); E.skipToNextDay(1); toast(`${CAL.fmtDay(E.dayNow(), 'long')} dimulai.`); }
});

// ————————————————————————— tab —————————————————————————
function tabs() { $('#tabs').innerHTML = TABS.map(([k, l]) => `<button class="tab" role="tab" aria-selected="${tab === k}" data-tab="${k}">${l}</button>`).join(''); }
$('#tabs').addEventListener('click', e => { const b = e.target.closest('[data-tab]'); if (b) { tab = b.dataset.tab; history.replaceState(null, '', '#' + tab); render(); } });

const evAmount = ev => ev.amount == null ? '' : `<span class="num ${cls(ev.amount)}" style="white-space:nowrap">${ev.certainty === 'estimasi' ? '≈ ' : ''}${rp(ev.amount)}</span>`;
const evChip = ev => { const c = CERT[ev.certainty]; return `<span class="chip ${c[1]}">${c[0]}</span>`; };
const evRow = (ev, showDate = false) => `<li class="cal-ev cat-${ev.cat}">
  <span class="cal-ev-t num">${showDate ? `<b>${CAL.fmtDay(ev.day, 'short')}</b> ` : ''}${AG.fmtEvTime(ev.sec)}</span>
  <div class="grow" style="min-width:0"><div class="row" style="gap:6px;flex-wrap:wrap"><i class="cal-dot cat-${ev.cat}"></i><b>${esc(ev.title)}</b> ${evChip(ev)}</div>${ev.detail ? `<div class="subtle">${esc(ev.detail)}</div>` : ''}${ev.href ? `<a class="subtle" href="${ev.href}">Buka ${esc(AG.CATS[ev.cat].label)}</a>` : ''}</div>
  ${evAmount(ev)}</li>`;

// ————————————————————————— Bulan —————————————————————————
function monthView() {
  const { y, m } = view, d0 = CAL.monthStartDay(y, m), d1 = d0 + CAL.CALENDAR.daysPerMonth - 1, today = E.dayNow();
  const evs = AG.eventsBetween(d0, d1), byDay = new Map(); for (const ev of evs) { if (!byDay.has(ev.day)) byDay.set(ev.day, []); byDay.get(ev.day).push(ev); }
  const hist = AG.historyIndex(), led = new Map(E.S.ledger.map(l => [l.day, l]));
  const lead = (CAL.weekdayOf(d0) + 6) % 7; // kolom mulai Senin
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push('<div class="cal-cell blank" aria-hidden="true"></div>');
  for (let d = d0; d <= d1; d++) {
    const list = byDay.get(d) || [], cats = [...new Set(list.map(x => x.cat))], l = led.get(d), net = l ? l.totalIncome - l.totalExpense : null;
    const flags = list.some(x => x.certainty === 'tenggat') ? 'has-dl' : '';
    cells.push(`<button class="cal-cell ${d === today ? 'today' : ''} ${d === sel ? 'sel' : ''} ${d < today ? 'past' : ''} ${flags}" data-day="${d}" aria-label="${CAL.fmtDay(d, 'full')}${list.length ? `, ${list.length} jadwal` : ''}">
      <span class="cal-n">${CAL.dateOfMonth(d)}</span>
      <span class="cal-dots">${cats.slice(0, 4).map(c => `<i class="cal-dot cat-${c}"></i>`).join('')}${cats.length > 4 ? '<i class="cal-more">+</i>' : ''}</span>
      ${d < today && net != null && net !== 0 ? `<span class="cal-net num ${cls(net)}">${rpShort(net).replace('Rp ', '')}</span>` : d < today && hist.get(d) ? `<span class="cal-net subtle">${hist.get(d)} cat.</span>` : list.length ? `<span class="cal-net subtle">${list.length} jadwal</span>` : ''}
    </button>`);
  }
  const legend = Object.entries(AG.CATS).map(([k, v]) => `<span class="row" style="gap:4px"><i class="cal-dot cat-${k}"></i>${v.label}</span>`).join('');
  return `<div class="split cal-split"><section class="panel">
    <div class="panel-h"><h2>${CAL.fmtMonth(y, m)}</h2><div class="row" style="gap:6px">
      <button class="icon-btn" data-mon="-1" aria-label="Bulan sebelumnya">${icon('arrowR', 'style="transform:rotate(180deg)"')}</button>
      <button class="btn sm" data-mon="0">Bulan ini</button>
      <button class="icon-btn" data-mon="1" aria-label="Bulan berikutnya">${icon('arrowR')}</button></div></div>
    <div class="panel-b"><div class="cal-grid cal-head">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map(x => `<div>${x}</div>`).join('')}</div>
      <div class="cal-grid" id="grid">${cells.join('')}</div>
      <div class="cal-legend subtle">${legend}</div>
      <div class="subtle" style="margin-top:8px">Hari lewat menampilkan arus kas bersih dari buku besar (riwayat). Hari mendatang menampilkan jadwal yang dihitung dari state saat ini; nominal estimasi bisa berubah.</div></div>
  </section><div>${dayDetail(sel, true)}</div></div>`;
}

// ————————————————————————— Hari —————————————————————————
function planBar(d) {
  const blocks = AG.dayPlan(d), today = E.dayNow();
  return `<div class="plan" role="img" aria-label="Jadwal ${CAL.fmtDay(d)}: ${blocks.map(b => `${PLAN_LBL[b.kind]} ${CAL.fmtHM(b.from * 3600)}–${CAL.fmtHM(b.to * 3600)}`).join(', ')}">
    ${blocks.map(b => `<i class="plan-b k-${b.kind}" style="left:${b.from / 24 * 100}%;width:${(b.to - b.from) / 24 * 100}%" title="${b.label} ${CAL.fmtHM(b.from * 3600)}–${b.to >= 24 ? '24:00' : CAL.fmtHM(b.to * 3600)}"></i>`).join('')}
    ${d === today ? `<i class="plan-now" id="plan-now" style="left:${E.secOfDay() / CAL.SEC_PER_DAY * 100}%"></i>` : ''}
  </div><div class="plan-axis subtle num"><span>00</span><span>06</span><span>12</span><span>18</span><span>24</span></div>
  <ul class="plan-list">${blocks.filter(b => b.to - b.from > 0).map(b => `<li><i class="plan-sw k-${b.kind}"></i><span class="num">${CAL.fmtHM(b.from * 3600)}–${b.to >= 24 ? '24:00' : CAL.fmtHM(b.to * 3600)}</span> ${esc(b.label)}</li>`).join('')}</ul>`;
}
function dayDetail(d, compact = false) {
  const today = E.dayNow(), past = d < today, evs = past ? [] : AG.eventsBetween(d, d), h = AG.historyOf(d);
  if (d === today && !h.ledger) { const sum = o => Object.values(o || {}).reduce((x, y) => x + y, 0); h.ledger = { totalIncome: sum(E.S.today.income), totalExpense: sum(E.S.today.expense), running: true }; }
  const head = `<div class="panel-h"><h2>${CAL.fmtDay(d, 'full')}</h2><div class="row" style="gap:6px">
    <button class="icon-btn" data-dstep="-1" aria-label="Hari sebelumnya">${icon('arrowR', 'style="transform:rotate(180deg)"')}</button>
    ${d !== today ? '<button class="btn sm" data-dstep="0">Hari ini</button>' : '<span class="chip dark">Hari ini</span>'}
    <button class="icon-btn" data-dstep="1" aria-label="Hari berikutnya">${icon('arrowR')}</button></div></div>`;
  const plan = past ? '' : `<div class="panel-b"><div class="label" style="margin-bottom:6px">Jadwal harian${d > today ? ' (berdasarkan state saat ini)' : ''}</div>${planBar(d)}
    <div class="subtle" style="margin-top:6px">Waktu luang dipakai produksi konten bila ada antrean (maks. ${E.S.creator?.settings?.dailyHours ?? 3} jam/hari). Uang saku, gaji, dan tagihan diproses saat pergantian hari ("akhir hari").</div></div>`;
  const evHtml = past ? '' : `<div class="panel-b" style="border-top:1px solid var(--border)"><div class="label" style="margin-bottom:6px">Jadwal & tenggat</div>${evs.length ? `<ul class="cal-evs">${evs.map(x => evRow(x)).join('')}</ul>` : '<p class="subtle" style="margin:0">Tidak ada gajian, tagihan, ujian, atau jadwal kreator di hari ini.</p>'}</div>`;
  const hs = (past || d === today) ? `<div class="panel-b" style="border-top:1px solid var(--border)"><div class="label" style="margin-bottom:6px">Riwayat kejadian${d === today ? ' sampai sekarang' : ''}</div>
    ${h.ledger ? `<dl class="dl" style="margin-bottom:8px"><dt>Pemasukan tercatat${h.ledger.running ? ' (berjalan)' : ''}</dt><dd class="pos">${rp(h.ledger.totalIncome)}</dd><dt>Pengeluaran tercatat</dt><dd class="neg">${rp(-h.ledger.totalExpense)}</dd></dl>` : ''}
    ${h.activity.length ? `<ul class="cal-hist">${h.activity.slice(0, compact ? 8 : 60).map(a => `<li><span class="num subtle">${a.sec >= CAL.SEC_PER_DAY ? 'Akhir hari' : a.sec != null ? CAL.fmtHM(a.sec) : a.time}</span><span class="grow">${esc(a.text)}</span>${a.amount ? `<span class="num ${cls(a.amount)}">${rpShort(a.amount)}</span>` : ''}</li>`).join('')}</ul>${compact && h.activity.length > 8 ? `<button class="btn sm ghost" data-goto-day="${d}">Lihat ${h.activity.length} catatan</button>` : ''}` : `<p class="subtle" style="margin:0">${past ? 'Tidak ada catatan aktivitas tersimpan untuk hari ini (log menyimpan 150 catatan terakhir).' : 'Belum ada kejadian hari ini.'}</p>`}</div>` : '';
  return `<section class="panel">${head}${plan}${evHtml}${hs}</section>`;
}

// ————————————————————————— Agenda —————————————————————————
function agendaView() {
  const today = E.dayNow(), all = AG.eventsBetween(today, today + 29);
  const f = agFilter, list = all.filter(ev => f === 'all' || (f === 'tenggat' ? ev.certainty === 'tenggat' : f === 'sekolah' ? ['sekolah', 'ujian'].includes(ev.cat) : f === 'investasi' ? ['investasi', 'bisnis'].includes(ev.cat) : f === 'gaji' ? ['gaji', 'karier'].includes(ev.cat) : ev.cat === f));
  const sum = (pred) => all.filter(pred).reduce((s, e) => s + (e.amount || 0), 0);
  const inSure = sum(e => e.amount > 0 && e.certainty !== 'estimasi'), inEst = sum(e => e.amount > 0 && e.certainty === 'estimasi');
  const outSure = sum(e => e.amount < 0 && e.certainty !== 'estimasi'), outEst = sum(e => e.amount < 0 && e.certainty === 'estimasi');
  const groups = new Map(); for (const ev of list) { if (!groups.has(ev.day)) groups.set(ev.day, []); groups.get(ev.day).push(ev); }
  return `<section class="panel"><div class="kpi-strip cal-kpis">
      <div class="kpi"><div class="label">Masuk terjadwal (30 hari)</div><div class="value pos">${rp(inSure)}</div><div class="foot">Nominal sudah pasti bila state tidak berubah</div></div>
      <div class="kpi"><div class="label">Masuk estimasi</div><div class="value">≈ ${rp(inEst)}</div><div class="foot">Gaji prorata, sewa, dividen — bisa berbeda</div></div>
      <div class="kpi"><div class="label">Keluar terjadwal</div><div class="value neg">${rp(outSure)}</div><div class="foot">Cicilan, tagihan sekolah, langganan</div></div>
      <div class="kpi"><div class="label">Keluar estimasi</div><div class="value">≈ ${rp(outEst)}</div><div class="foot">PBB dan biaya yang bergantung nilai aset</div></div></div></section>
    <div class="filters" style="margin:14px 0 12px"><div class="seg cal-filter" role="group" aria-label="Filter agenda">${AG_FILTERS.map(([k, l]) => `<button data-agf="${k}" aria-pressed="${f === k}">${l}</button>`).join('')}</div><span class="subtle" style="margin-left:auto">${list.length} jadwal · ${CAL.fmtDay(today, 'short')}–${CAL.fmtDay(today + 29, 'short')}</span></div>
    <section class="panel">${list.length ? [...groups].map(([d, evs]) => `<div class="cal-agday"><button class="cal-agh" data-goto-day="${d}"><b>${CAL.fmtDay(d, 'full')}</b><span class="subtle">${d === today ? 'Hari ini' : d === today + 1 ? 'Besok' : `${d - today} hari lagi`}</span></button><ul class="cal-evs">${evs.map(x => evRow(x)).join('')}</ul></div>`).join('')
      : empty('calendar', 'Belum ada jadwal', f === 'all' ? 'Agenda terisi otomatis saat kamu bekerja, sekolah, punya cicilan, investasi, atau jadwal kreator.' : 'Tidak ada jadwal untuk filter ini dalam 30 hari ke depan.', '')}</section>`;
}

// ————————————————————————— Riwayat —————————————————————————
function historyView() {
  const byDay = new Map(); for (const a of E.S.activity) { if (!byDay.has(a.day)) byDay.set(a.day, []); byDay.get(a.day).push(a); }
  const led = new Map(E.S.ledger.map(l => [l.day, l]));
  const days = [...byDay.keys()].sort((a, b) => b - a);
  return `<section class="panel"><div class="panel-h"><h2>Riwayat kejadian</h2><span class="subtle">${E.S.activity.length} catatan terakhir</span></div>
    ${days.length ? days.map(d => { const l = led.get(d); return `<div class="cal-agday"><button class="cal-agh" data-goto-day="${d}"><b>${CAL.fmtDay(d, 'full')}</b>${l ? `<span class="num subtle"><span class="pos">+${rpShort(l.totalIncome)}</span> · <span class="neg">−${rpShort(l.totalExpense)}</span></span>` : ''}</button>
      <ul class="cal-hist">${byDay.get(d).slice().reverse().map(a => `<li><span class="num subtle">${a.sec >= CAL.SEC_PER_DAY ? 'Akhir hari' : a.sec != null ? CAL.fmtHMS(a.sec) : a.time}</span><span class="grow">${esc(a.text)}</span>${a.amount ? `<span class="num ${cls(a.amount)}">${rpShort(a.amount)}</span>` : ''}</li>`).join('')}</ul></div>`; }).join('')
      : empty('calendar', 'Belum ada riwayat', 'Kejadian (gaji, transaksi, sekolah, pengingat) tercatat di sini sesuai jam simulasi.', '')}
    <div class="panel-b subtle" style="border-top:1px solid var(--border)">Log aktivitas menyimpan 150 catatan terakhir; buku besar harian menyimpan 180 hari. Catatan lama tidak dihapus dari transaksi, hanya tidak ditampilkan di sini.</div></section>`;
}

// ————————————————————————— Aturan —————————————————————————
function rulesView() {
  const C = CAL.CALENDAR;
  return `<div class="cal-rules">
  <section class="panel"><div class="panel-h"><h2>Aturan kalender (${C.id})</h2></div><div class="panel-b"><dl class="dl">
    <dt>Bulan per tahun</dt><dd>${C.monthsPerYear}</dd><dt>Hari per bulan</dt><dd>${C.daysPerMonth} (semua bulan sama)</dd>
    <dt>Hari per tahun</dt><dd>${CAL.DAYS_PER_YEAR}</dd><dt>Tahun kabisat</dt><dd>Tidak ada</dd><dt>Hari per minggu</dt><dd>${C.daysPerWeek} (Senin–Minggu)</dd>
    <dt>Hari pertama</dt><dd>Tahun 1 · Bulan 1 · Tanggal 1 (Senin)</dd><dt>Satu hari</dt><dd>24 jam · 60 menit · 60 detik</dd><dt>Proses engine</dt><dd>Setiap ${C.tickMinutes} menit game (48×/hari)</dd>
    <dt>"Akhir hari"</dt><dd>Saat 23:59:59 → 00:00:00</dd></dl>
    <p class="subtle" style="margin:10px 0 0">Tanggal perangkat tidak dipakai dan tidak pernah mengoreksi kalender game. Riwayat pasar sebelum Tahun 1 (14 hari warm-up) tampil sebagai Tahun 0.</p>
    <p class="subtle" style="margin:6px 0 0">Usia karakter memakai skala hidup dipercepat dari aturan pendidikan: ${(E.EDU?.rules?.termDays ?? 28) * 2} hari kalender (1 tahun ajaran) = +1 tahun usia. Ini aturan usia, bukan panjang tahun kalender.</p></div></section>
  <section class="panel"><div class="panel-h"><h2>Kecepatan waktu</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Mode</th><th>1 detik nyata</th><th class="r">1 hari game</th></tr></thead><tbody>
    ${CAL.SPEEDS.map(x => `<tr><td><b>${x.name}</b>${E.S.settings.rate === x.rate ? ' <span class="chip dark">Aktif</span>' : ''}</td><td>${x.rate >= 3600 ? `${(x.rate / 3600).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jam` : `${x.rate / 60} menit`} game</td><td class="r num">${fmtReal(CAL.SEC_PER_DAY / x.rate)}</td></tr>`).join('')}
    <tr><td><b>Saat live</b></td><td colspan="2">Waktu diperlambat 12× (min. 1 menit game/detik) agar setiap menit siaran bisa diikuti.</td></tr></tbody></table></div>
    <div class="panel-b subtle">Jeda menghentikan seluruh jam. Jika tab tidak aktif lebih dari 1 detik, jam tidak mengejar waktu nyata. Posisi jam (sampai detik) tersimpan di server dan dilanjutkan setelah muat ulang. Server menolak save yang jamnya mundur.</div></section>
  <section class="panel"><div class="panel-h"><h2>Jam layanan & jadwal</h2></div><div class="table-wrap"><table class="table"><thead><tr><th>Layanan</th><th>Jam</th><th class="hide-m">Hari</th></tr></thead><tbody>
    ${SERVICE_HOURS.map(s => `<tr><td><b>${esc(s.name)}</b><div class="subtle">${esc(s.rule)}</div></td><td class="num" style="white-space:nowrap">${s.hours}</td><td class="hide-m">${s.days}</td></tr>`).join('')}</tbody></table></div>
    <div class="panel-b subtle">Hari belajar mengikuti periode sekolah di server: hari periode 1–${E.EDU?.rules?.studyDays ?? 20} berurutan, lalu ujian akhir, rapor, dan libur sampai hari ${E.EDU?.rules?.termDays ?? 28}.</div></section>
  <section class="panel"><div class="panel-h"><h2>Pengingat & tanggal penting</h2></div><div class="panel-b"><dl class="dl">
    <dt>Gaji penuh waktu</dt><dd>Tanggal ${TR.pay.fullDay}, akhir hari</dd><dt>Upah paruh waktu</dt><dd>Jumat, akhir hari</dd><dt>Cicilan</dt><dd>Tanggal 30, akhir hari</dd>
    <dt>Rapat suku bunga</dt><dd>Tanggal 30</dd><dt>Dividen</dt><dd>Akhir bulan ${TR.dividendMonths.join(', ')}</dd><dt>Pembayaran kreator</dt><dd>Tanggal 21</dd></dl>
    <label class="row" style="gap:8px;margin-top:12px;font-size:13px"><input type="checkbox" id="rem" ${E.S.settings.reminders !== false ? 'checked' : ''}> Catat pengingat tagihan & tenggat (H-1 dan hari H) di log aktivitas</label>
    <div class="label" style="margin-top:14px">Belum tersedia di BizSim</div><ul style="margin:4px 0 0;padding-left:18px;font-size:13px">${NOT_YET.map(x => `<li>${esc(x)}</li>`).join('')}</ul>
    <p class="subtle" style="margin:6px 0 0">Modul ini belum dibuat, sehingga tidak muncul di kalender.</p></div></section></div>`;
}
const fmtReal = s => s >= 60 ? `${(s / 60).toLocaleString('id-ID', { maximumFractionDigits: 1 })} menit` : `${s.toLocaleString('id-ID', { maximumFractionDigits: 1 })} detik`;

// ————————————————————————— render & interaksi —————————————————————————
function render() {
  tabs();
  const body = $('#body');
  body.innerHTML = tab === 'month' ? monthView() : tab === 'day' ? `<div class="cal-dayonly">${dayDetail(sel)}</div>` : tab === 'agenda' ? agendaView() : tab === 'history' ? historyView() : rulesView();
}
$('#body').addEventListener('click', e => {
  const t = e.target;
  const c = t.closest('[data-day]'); if (c) { sel = +c.dataset.day; render(); return; }
  const mb = t.closest('[data-mon]'); if (mb) { const k = +mb.dataset.mon; if (k === 0) { sel = E.dayNow(); view = { y: CAL.yearOf(sel), m: CAL.monthOf(sel) }; } else { let m = view.m + k, y = view.y; if (m < 1) { m = 12; y--; } if (m > 12) { m = 1; y++; } view = { y, m }; } render(); return; }
  const ds = t.closest('[data-dstep]'); if (ds) { const k = +ds.dataset.dstep; sel = k === 0 ? E.dayNow() : sel + k; view = { y: CAL.yearOf(sel), m: CAL.monthOf(sel) }; render(); return; }
  const g = t.closest('[data-goto-day]'); if (g) { sel = +g.dataset.gotoDay; view = { y: CAL.yearOf(sel), m: CAL.monthOf(sel) }; tab = 'day'; history.replaceState(null, '', '#day'); render(); window.scrollTo({ top: $('#tabs').offsetTop - 70, behavior: 'smooth' }); return; }
  const af = t.closest('[data-agf]'); if (af) { agFilter = af.dataset.agf; render(); }
});
$('#body').addEventListener('change', e => { if (e.target.id === 'rem') { E.S.settings.reminders = e.target.checked; E.save(); toast(e.target.checked ? 'Pengingat aktif.' : 'Pengingat dimatikan.'); } });

let lastRenderDay = E.dayNow();
E.on('clock', paintClock);
// Render ulang paling sering 2×/detik nyata (pada kecepatan Kilat ada ±6 tick per detik).
let rq = null, lastR = 0;
const schedule = () => { if (rq) return; const wait = Math.max(0, 500 - (performance.now() - lastR)); rq = setTimeout(() => { rq = null; lastR = performance.now(); render(); }, wait); };
E.on('tick', () => { const d = E.dayNow(); if (d !== lastRenderDay) { if (sel === lastRenderDay) { sel = d; view = { y: CAL.yearOf(d), m: CAL.monthOf(d) }; } lastRenderDay = d; } schedule(); });
E.on('change', () => { clockPanel(); });
clockPanel(); render();
