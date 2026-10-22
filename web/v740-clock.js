/* ============================================================
   BizSim 7.4.0 — Simulation Clock & Calendar, Life Dashboard & Character Needs.
   Additive: membungkus App.dashboard, App.calendar, App.render, App.refresh, App.simDay.
   Tidak ada fungsi lama yang diganti isinya; versi lama tetap dipanggil.
   Sumber waktu tunggal = engine (/api/v740/*). UI hanya membaca s.day + jam simulasi dan
   menggerakkannya per 250 ms dari jam nyata; sinkron ke engine tiap 5 detik.
   ============================================================ */
(() => {
  if (typeof App === 'undefined' || !App.v700 || !App.v730 || App.v740) return;
  const { M, E, clamp } = App.v700;
  const S = () => (App.state && App.state.state) || {};
  const KEYS = ['hunger', 'thirst', 'energy', 'hygiene', 'health', 'mood', 'stress', 'bladder'];
  const L = { view: null, tod: 0, day: 1, synced: 0, last: performance.now(), rolling: false, uid: null, logId: 0, tab: 'cal', vm: null, sel: null, evf: 'all', k: 0, fin: false, loading: false };

  /* ---------------- ikon (garis, tanpa emoji) ---------------- */
  const P = {
    food: 'M7 3v7a2 2 0 0 0 4 0V3M9 3v18M17 3c-2.2 1.6-3 4-3 6.5 0 1.6 1 2.5 3 2.5V21',
    drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
    bolt: 'M13 2 5 14h6l-1 8 8-12h-6z',
    spark: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM18 16l.8 2.2L21 19l-2.2.8L18 22l-.8-2.2L15 19l2.2-.8z',
    heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z',
    smile: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM8.5 14c1 1.6 2.2 2.3 3.5 2.3s2.5-.7 3.5-2.3M9 9.5h.01M15 9.5h.01',
    pulse: 'M3 12h3.5l2-6 4 12 2.5-8 1.5 2H21',
    toilet: 'M7 3h10v6H7zM5 9h14c0 5-3 8-7 8s-7-3-7-8zM9 21h6M12 17v4',
    moon: 'M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z',
    bag: 'M5 8h14l-1 12H6zM9 8V6a3 3 0 0 1 6 0v2',
    bus: 'M5 4h14v13H5zM5 11h14M8 20v-3M16 20v-3M8 14h.01M16 14h.01',
    pause: 'M8 5v14M16 5v14',
    play: 'M7 4l13 8-13 8z',
    chev: 'M9 5l7 7-7 7',
    book: 'M5 4h11a3 3 0 0 1 3 3v13H8a3 3 0 0 1-3-3zM5 17a3 3 0 0 1 3-3h11',
    coin: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18zM12 7v10M9.5 9.5c0-1 1-1.7 2.5-1.7s2.5.7 2.5 1.7-1 1.5-2.5 1.8-2.5.8-2.5 1.8 1 1.7 2.5 1.7 2.5-.7 2.5-1.7'
  };
  const svg = (n, sz = 18) => `<svg class="v740-ic" viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${P[n]}"/></svg>`;
  const ico = (n, sz) => (P[n] ? svg(n, sz) : App.icon(n, sz));
  const NIC = { hunger: 'food', thirst: 'drop', energy: 'bolt', hygiene: 'spark', health: 'heart', mood: 'smile', stress: 'pulse', bladder: 'toilet' };

  /* ---------------- aturan waktu: dibaca dari engine (view.cal), bukan ditulis ulang ---------------- */
  const CAL = () => (L.view && L.view.cal) || { daysPerMonth: 30, monthsPerYear: 12, firstWeekday: 1, weekdays: ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'], work: [28800, 61200], lunch: [43200, 46800], study: [68400, 75600], simSecPerRealSec: 60 };
  const p2 = n => String(n).padStart(2, '0');
  const hmsOf = t => { t = Math.max(0, Math.min(86400, Math.floor(t))); return { h: Math.floor(t / 3600) % 24, m: Math.floor(t / 60) % 60, s: t % 60 }; };
  const clk = (t, sec = true) => { const x = hmsOf(t); return sec ? `${p2(x.h)}:${p2(x.m)}:${p2(x.s)}` : `${p2(x.h)}:${p2(x.m)}`; };
  const dateOf = day => { const c = CAL(), i = Math.max(0, day - 1), m = Math.floor(i / c.daysPerMonth); return { day, year: Math.floor(m / c.monthsPerYear) + 1, month: (m % c.monthsPerYear) + 1, date: (i % c.daysPerMonth) + 1, weekday: (i + c.firstWeekday) % 7 }; };
  const dayOf = (y, m, d) => { const c = CAL(); return ((y - 1) * c.monthsPerYear + (m - 1)) * c.daysPerMonth + d; };
  const fmtFull = (day, tod) => { const d = dateOf(day); return `Tahun ${d.year} · Bulan ${d.month} · Tanggal ${d.date} · ${clk(tod)}`; };
  const fmtShort = day => { const d = dateOf(day); return `Tahun ${d.year} · Bulan ${d.month} · Tgl ${d.date}`; };
  const wdName = w => CAL().weekdays[w];
  const rate1 = r => (r > 0 ? '+' : r < 0 ? '−' : '') + Math.abs(r).toFixed(1).replace('.', ',') + '/jam';

  /* ---------------- jaringan: antrean serial, sinkron, pemuatan ---------------- */
  let q = Promise.resolve(); const enq = fn => { const p = q.then(fn); q = p.catch(() => { }); return p; };
  const raw = async (path, body) => { try { const { r, d } = await App.requestJson(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); return r.ok ? d : { error: (d && d.error) || 'Gagal' }; } catch (e) { return null; } };
  const syncInner = async (extra) => {
    if (!L.view || !App.user) return null; const paused = L.view.clock.paused; let dt = paused ? 0 : Math.min(3600, L.tod - L.synced); if (dt < 0.5 && !extra) return null;
    const d = await raw('/api/v740/clock', { action: 'sync', dt: Math.max(0, dt), ...(extra || {}) }); if (d && d.v740) applyView(d.v740); return d;
  };
  const syncNow = () => enq(() => syncInner());
  const loadView = () => enq(async () => { const d = await raw('/api/v740/state', {}); if (d && d.v740) applyView(d.v740); return d; });
  const LS = () => 'bizsim.v740.' + (L.uid || '');

  const applyView = v => {
    const first = !L.view, newDay = L.view && v.day !== L.day;
    L.view = v;
    if (first) { try { const b = JSON.parse(localStorage.getItem(LS()) || 'null'); if (b && b.day === v.day && !v.clock.paused && b.tod > v.clock.tod && b.tod - v.clock.tod <= 1800) { L.tod = b.tod; } else L.tod = v.clock.tod; } catch { L.tod = v.clock.tod; } }
    else if (newDay || v.clock.paused) L.tod = v.clock.tod; else L.tod = Math.max(L.tod, v.clock.tod);
    L.day = v.day; L.synced = v.clock.tod; L.last = performance.now();
    const top = (v.log && v.log[0] && v.log[0].id) || 0;
    if (L.logId && top > L.logId) { let n = 0; for (const e of v.log) { if (e.id <= L.logId) break; if (['need', 'delivery', 'work'].includes(e.kind) && n < 2) { App.toast(e.title, e.sub || '', e.kind === 'need' ? 'warning' : 'info'); n++; } } }
    L.logId = Math.max(L.logId, top);
    paint();
  };

  /* ---------------- gerak jam: dari jam nyata, bukan sekadar mengganti teks ---------------- */
  const tick = () => {
    const now = performance.now(), dr = Math.min((now - L.last) / 1000, 1.5); L.last = now;
    if (!L.view || !App.state || !App.user) return;
    if (!document.hidden && !L.view.clock.paused && !L.rolling) {
      L.tod += dr * L.view.clock.simSecPerRealSec;
      if (L.tod >= 86400) { L.tod = 86400; tickDom(); rollNow(); return; }
    }
    tickDom(); L.k++;
    if (L.k % 4 === 0) { tickNeeds(); try { localStorage.setItem(LS(), JSON.stringify({ day: L.day, tod: L.tod })); } catch { } }
  };
  const rollNow = async () => { if (L.rolling) return; try { await App.simDay(); } catch (e) { console.warn(e); } };
  const abs = () => (L.day - 1) * 86400 + L.tod;
  const needsRefresh = () => { const v = L.view; if (!v || L.rolling || L.fin) return false; if (v.act && projRem() <= 0) return true; return (v.orders || []).some(o => o.arrive <= abs()); };
  const projRem = () => (L.view && L.view.act ? L.view.act.rem - (L.tod - L.view.clock.tod) : 0);
  const proj = k => { const v = L.view, n = v.needs[k]; return clamp(n.v + (v.clock.paused ? 0 : n.rate * ((L.tod - v.clock.tod) / 3600)), 0, 100); };
  const levelOf = (k, x) => { const t = L.view.th; return k === 'stress' ? (x >= t.sCrit ? 'critical' : x >= t.sHi ? 'low' : 'ok') : (x < t.crit ? 'critical' : x < t.hi ? 'low' : 'ok'); };
  const LV = { ok: 'Normal', low: 'Rendah', critical: 'Kritis' }, LVS = { ok: 'Normal', low: 'Tinggi', critical: 'Kritis' };

  const setAll = (sel, fn) => document.querySelectorAll(sel).forEach(fn);
  const tickDom = () => {
    if (!L.view) return;
    const t = hmsOf(L.tod), hd = (t.h % 12 + t.m / 60 + t.s / 3600) * 30, md = (t.m + t.s / 60) * 6, sd = t.s * 6;
    setAll('[data-v740="time"]', el => { el.textContent = clk(L.tod); });
    setAll('[data-v740="full"]', el => { el.textContent = fmtFull(L.day, L.tod); });
    setAll('[data-v740="short"]', el => { el.textContent = fmtShort(L.day); });
    setAll('[data-v740="chip-time"]', el => { el.textContent = clk(L.tod); });
    setAll('[data-v740="hand-h"]', el => el.setAttribute('transform', `rotate(${hd} 60 60)`));
    setAll('[data-v740="hand-m"]', el => el.setAttribute('transform', `rotate(${md} 60 60)`));
    setAll('[data-v740="hand-s"]', el => el.setAttribute('transform', `rotate(${sd} 60 60)`));
    if (needsRefresh()) { L.fin = true; enq(() => syncInner({})).then(() => loadView()).finally(() => { L.fin = false; }); }
  };
  const tickNeeds = () => {
    const v = L.view; if (!v) return;
    setAll('.v740-need[data-k]', el => {
      const k = el.dataset.k, x = proj(k), lv = levelOf(k, x), bar = el.querySelector('.v740-nbar i'), val = el.querySelector('[data-v740="nval"]'), bd = el.querySelector('[data-v740="nlv"]');
      if (bar) bar.style.width = x.toFixed(1) + '%'; if (val) val.textContent = Math.round(x) + '%'; if (bd) { bd.textContent = (k === 'stress' ? LVS : LV)[lv]; bd.className = 'v740-lv ' + lv; } el.className = el.className.replace(/\b(ok|low|critical)\b/g, '') + ' ' + lv;
    });
    const a = v.act;
    if (a) { const rem = Math.max(0, projRem()), f = a.total ? 1 - rem / a.total : 1; setAll('[data-v740="actbar"]', el => { el.style.width = (clamp(f, 0, 1) * 100).toFixed(1) + '%'; }); setAll('[data-v740="actrem"]', el => { el.textContent = `sisa ${Math.ceil(rem / 60)} menit`; }); }
  };

  /* ---------------- kontrol waktu ---------------- */
  const setSpeed = async sp => { await enq(async () => { const d = await raw('/api/v740/clock', { action: 'speed', speed: sp, dt: Math.max(0, Math.min(3600, L.view && !L.view.clock.paused ? L.tod - L.synced : 0)) }); if (d && d.error) App.toast('Gagal', d.error, 'danger'); else if (d && d.v740) applyView(d.v740); }); };
  const togglePause = async () => { if (!L.view) return; const want = !L.view.clock.paused; await enq(async () => { const d = await raw('/api/v740/clock', { action: 'pause', paused: want, dt: want ? Math.max(0, Math.min(3600, L.tod - L.synced)) : 0 }); if (d && d.v740) { if (!want) L.tod = d.v740.clock.tod; applyView(d.v740); } }); };

  /* ---------------- kalender: sumber kejadian nyata dari state ---------------- */
  const TYPES = { school: { n: 'Sekolah', ic: 'cap', c: 'blue' }, pay: { n: 'Gaji', ic: 'coin', c: 'green' }, bill: { n: 'Tagihan', ic: 'wallet', c: 'red' }, deadline: { n: 'Deadline', ic: 'clock', c: 'gold' }, work: { n: 'Kerja', ic: 'briefcase', c: 'navy' }, content: { n: 'Konten', ic: 'video', c: 'teal' } };
  const employed = () => (S().career || {}).status === 'employed';
  const studyOn = () => { const st = S(); return Boolean(((st.v720 || {}).lessons || []).length || ((st.v655 || {}).programs || {}).education || ((st.v655 || {}).programs || {}).training); };
  const events = (from, to) => {
    const out = [], st = S(), car = st.career || {}, V7 = st.v700 || {}, X = st.v720 || {}, V6 = st.v655 || {}, today = L.day, add = (day, type, title, sub) => { if (day >= from && day <= to) out.push({ day, type, title, sub: sub || '' }); };
    const pr = V6.programs || {};
    for (const k of ['education', 'training']) { const p = pr[k]; if (p && p.endDay) add(p.endDay, 'school', `${k === 'education' ? 'Ujian akhir dan kelulusan' : 'Training selesai'}: ${p.name}`, 'Program berjalan berakhir'); }
    for (const l of (X.lessons || [])) add(l.endDay, 'school', `Pelajaran selesai: ${l.name}`, 'Hasil ujian pelajaran keluar');
    if (App.v750 && App.v750.events) { try { for (const q of App.v750.events(from, to)) add(q.day, q.type, q.title, q.sub); } catch { } }
    for (const b of (V7.bonds || [])) if (b.status === 'active') add(b.matureDay, 'deadline', 'Obligasi jatuh tempo', M(b.amount || 0));
    for (const b of (V7.deposits || [])) if (b.status === 'active') add(b.matureDay, 'deadline', 'Deposito jatuh tempo', M(b.amount || 0));
    for (const a of (X.auctions || [])) if (!a.done) add(a.endDay, 'deadline', `Lelang berakhir: ${a.title}`, 'Penawaran ditutup');
    for (const c of ((((st.v731 || {}).creator) || {}).queue || [])) if (c.status === 'scheduled' && c.pubDay) add(c.pubDay, 'content', `Konten tayang: ${c.title || 'Konten'}`, c.platform ? String(c.platform) : 'Jadwal publikasi');
    for (const p of (((X.land || {}).owned) || [])) if (p.leased) { const nx = p.boughtDay + Math.ceil((today - p.boughtDay + 1) / 30) * 30; for (let d = nx; d <= to; d += 30) add(d, 'bill', 'Sewa tanah cair', p.name); }
    for (const e of (Array.isArray(App.state.events) ? App.state.events : [])) if (!e.decision) add(today, 'deadline', `Keputusan menunggu: ${e.title}`, 'Buka Events & Decisions');
    const loans = (Array.isArray(App.state.loans) ? App.state.loans : []).filter(l => l.status === 'pending' && l.remaining > 0);
    if (loans.length) add(today + 1, 'bill', 'Cicilan pinjaman dipotong', `${M(loans.reduce((a, l) => a + Math.min(l.monthly_payment, l.remaining), 0))} setiap pergantian hari`);
    if (employed()) {
      const dm = CAL().daysPerMonth; add(today + 1, 'pay', 'Gaji harian masuk', `${M(Math.round((car.salary || 0) / 30))} saat pergantian hari`);
      for (let d = Math.ceil(Math.max(from, today) / dm) * dm; d <= to; d += dm) add(d, 'pay', 'Akhir bulan: gaji bulanan lengkap', `${M(car.salary || 0)} sudah diterima penuh`);
    }
    return out.sort((a, b) => a.day - b.day);
  };
  const dayBlocks = day => {
    const c = CAL(), wd = dateOf(day).weekday, out = [];
    if (employed() && wd >= 1 && wd <= 5) { out.push({ a: c.work[0], b: c.lunch[0], t: 'Bekerja', ty: 'work' }, { a: c.lunch[0], b: c.lunch[1], t: 'Istirahat makan siang', ty: 'work' }, { a: c.lunch[1], b: c.work[1], t: 'Bekerja', ty: 'work' }); }
    if (studyOn() && wd >= 1 && wd <= 4) out.push({ a: c.study[0], b: c.study[1], t: 'Sesi belajar', ty: 'school' });
    return out;
  };
  const history = () => {
    const out = [], v = L.view, st = S(), car = st.career || {}, pr = ((st.v655 || {}).programs || {});
    for (const e of (v ? v.log : [])) out.push({ day: e.day, tod: e.tod, title: e.title, sub: e.sub, ic: e.kind === 'need' ? 'pulse' : e.kind === 'delivery' ? 'truck' : e.kind === 'work' ? 'briefcase' : 'clock' });
    for (const r of (Array.isArray(st.reports) ? st.reports : [])) out.push({ day: r.day, tod: -1, title: `Laporan hari ${r.day}`, sub: r.summary || '', ic: 'task' });
    for (const h of (car.history || [])) if (h.startedDay != null) out.push({ day: h.startedDay, tod: -2, title: `Bekerja sebagai ${h.position}`, sub: `${h.company} · ${M(h.salary || 0)}/bulan`, ic: 'briefcase' });
    for (const h of (pr.history || [])) out.push({ day: h.finishedDay, tod: -2, title: `Selesai: ${h.name}`, sub: h.kind === 'training' ? 'Training' : 'Education', ic: 'cap' });
    return out.sort((a, b) => b.day - a.day || b.tod - a.tod).slice(0, 40);
  };

  /* ---------------- komponen tampilan ---------------- */
  const analog = () => { let ticks = ''; for (let i = 0; i < 12; i++) { const a = i * 30 * Math.PI / 180, r1 = i % 3 === 0 ? 44 : 48, x1 = 60 + Math.sin(a) * r1, y1 = 60 - Math.cos(a) * r1, x2 = 60 + Math.sin(a) * 52, y2 = 60 - Math.cos(a) * 52; ticks += `<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`; } return `<svg class="v740-analog" viewBox="0 0 120 120" role="img" aria-label="Jam analog simulasi"><circle cx="60" cy="60" r="57" class="face"/><g class="tk">${ticks}</g><g data-v740="hand-h"><line x1="60" y1="60" x2="60" y2="35" class="hh"/></g><g data-v740="hand-m"><line x1="60" y1="60" x2="60" y2="22" class="mh"/></g><g data-v740="hand-s"><line x1="60" y1="68" x2="60" y2="16" class="sh"/></g><circle cx="60" cy="60" r="3.2" class="pin"/></svg>`; };
  const speedHTML = () => { const v = L.view, sp = v.clock.speed, ps = v.clock.paused; return `<div class="v740-speed" role="group" aria-label="Kecepatan waktu simulasi"><button class="${ps ? 'on' : ''}" onclick="App.v740.togglePause()" aria-pressed="${ps}">${svg(ps ? 'play' : 'pause', 14)} ${ps ? 'Lanjut' : 'Pause'}</button>${v.cal.speeds.map(x => `<button class="${!ps && sp === x ? 'on' : ''}" onclick="App.v740.setSpeed(${x})" aria-pressed="${!ps && sp === x}">${x}x</button>`).join('')}</div>`; };
  const chips = g => Object.entries(g || {}).filter(([, x]) => x).map(([k, x]) => `<span class="v740-eff ${(k === 'stress' ? x < 0 : x > 0) ? 'good' : 'bad'}">${E(L.view.meta[k].label)} ${x > 0 ? '+' : '−'}${Math.abs(x)}</span>`).join('');
  const bal = () => { const s = S(); return { cash: Number(s.cash) || 0, bank: Number(s.emergency_fund) || 0, debt: (Array.isArray(App.state.loans) ? App.state.loans : []).reduce((a, x) => a + (Number(x.remaining) || 0), 0) }; };

  const nowCard = () => {
    const v = L.view, b = bal(), a = v.act, live = ((((S().v731 || {}).creator) || {}).live), st = v.status;
    const next = dayBlocks(L.day).filter(x => x.b > L.tod)[0];
    let act;
    if (a) act = `<div class="v740-act"><span class="v740-act-ic">${svg(a.kind === 'sleep' ? 'moon' : a.kind === 'care' ? 'heart' : a.kind === 'drink' ? 'drop' : a.kind === 'rest' || a.kind === 'nap' ? 'moon' : 'food', 18)}</span><div class="v740-act-main"><b>${E(a.label)}</b><small>Selesai ±${clk(v.clock.tod + a.rem, false)} · <span data-v740="actrem">sisa ${Math.ceil(Math.max(0, projRem()) / 60)} menit</span></small><div class="v740-pb"><i data-v740="actbar" style="width:${(clamp(1 - Math.max(0, projRem()) / a.total, 0, 1) * 100).toFixed(1)}%"></i></div></div>${['sleep', 'rest', 'nap'].includes(a.kind) && !a.forced ? `<button class="btn" onclick="App.v740.act('cancel')">${a.kind === 'sleep' ? 'Bangun' : 'Berhenti'}</button>` : ''}</div>`;
    else act = `<div class="v740-act"><span class="v740-act-ic">${ico(st.code === 'work' ? 'briefcase' : st.code === 'study' ? 'cap' : 'clock', 18)}</span><div class="v740-act-main"><b>${E(st.label)}</b><small>${next ? `Berikutnya: ${E(next.t)} ${clk(next.a, false)}-${clk(next.b, false)}` : 'Tidak ada jadwal terdekat hari ini'}</small></div></div>`;
    const ords = (v.orders || []).map(o => `<div class="v740-act sub"><span class="v740-act-ic">${ico('truck', 16)}</span><div class="v740-act-main"><b>Pesanan: ${E(o.n)}</b><small>${o.status === 'waiting' ? 'Menunggu di depan pintu' : `Tiba ±${clk(o.arriveTod, false)}`}</small></div></div>`).join('');
    const lv = live ? `<div class="v740-act sub"><span class="v740-act-ic">${ico('video', 16)}</span><div class="v740-act-main"><b>Live streaming${live.platform ? ': ' + E(String(live.platform)) : ''}</b><small>Sedang berlangsung di Creator Studio</small></div></div>` : '';
    return `<section class="card v740-now" style="grid-area:now"><div class="v740-now-top">${analog()}<div class="v740-digital"><small>Waktu simulasi global</small><b data-v740="time">${clk(L.tod)}</b><span data-v740="short">${fmtShort(L.day)}</span><em>${wdName(dateOf(L.day).weekday)} · Hari ke-${L.day}</em></div></div>${speedHTML()}<div class="v740-rate">1x = 1 detik nyata = 1 menit simulasi (1 jam game = 1 menit nyata). Waktu berhenti saat tab tidak aktif. Simulate Day menjalankan rutinitas otomatis (makan, minum, tidur) dengan biaya hidup.</div><div class="v740-money"><div><small>Saldo tunai</small><b>${M(b.cash)}</b></div><div><small>Rekening (dana darurat)</small><b>${M(b.bank)}</b></div></div><div class="v740-sec-h">Aktivitas saat ini</div>${act}${ords}${lv}</section>`;
  };
  const needsCard = () => {
    const v = L.view, rows = KEYS.map(k => {
      const m = v.meta[k], n = v.needs[k], x = proj(k), lv = levelOf(k, x), good = k === 'stress' ? n.rate < -.05 : n.rate > .05, bad = k === 'stress' ? n.rate > .05 : n.rate < -.05;
      return `<div class="v740-need ${lv}" data-k="${k}" role="button" tabindex="0" onclick="App.v740.needInfo('${k}')" onkeydown="if(event.key==='Enter')App.v740.needInfo('${k}')"><span class="v740-nic">${svg(NIC[k], 17)}</span><div class="v740-nmain"><div class="v740-ntop"><b>${E(m.label)}</b><span data-v740="nval">${Math.round(x)}%</span></div><div class="v740-nbar"><i style="width:${x.toFixed(1)}%"></i></div><div class="v740-ntrend"><span class="v740-tr ${n.rate > .05 ? 'up' : n.rate < -.05 ? 'down' : 'flat'} ${good ? 'good' : bad ? 'bad' : ''}"><i></i>${n.rate > .05 ? 'meningkat' : n.rate < -.05 ? 'menurun' : 'stabil'} ${E(rate1(n.rate))}</span><em data-v740="nlv" class="v740-lv ${lv}">${(k === 'stress' ? LVS : LV)[lv]}</em></div></div></div>`;
    }).join('');
    const worst = KEYS.filter(k => levelOf(k, proj(k)) === 'critical').map(k => v.meta[k].label);
    return `<section class="card v740-needs" style="grid-area:needs"><div class="section-head"><div><h3 class="section-title">Character Needs</h3><span class="small muted">Ketuk satu kebutuhan untuk melihat dampak dan cara memulihkannya</span></div><span class="badge ${v.perf >= 90 ? 'success' : v.perf >= 70 ? 'warn' : 'danger'}">Kinerja kerja ${v.perf}%</span></div><div class="v740-needs-grid">${rows}</div>${worst.length ? `<div class="v740-alert">${ico('warn', 15)} Kritis: ${E(worst.join(', '))}. Kinerja kerja dan kesehatan terdampak.</div>` : ''}</section>`;
  };
  const qaCard = () => {
    const v = L.view, b = bal(), car = S().career || {}, s = S(), q = v.quick, les = ((s.v720 || {}).lessons || []).length + (((s.v655 || {}).programs || {}).education ? 1 : 0) + (((s.v655 || {}).programs || {}).training ? 1 : 0), nb = (App.state.businesses || []).length;
    const reason = k => (q[k] && !q[k].ok) ? q[k].reason : null;
    const items = [
      ['eat', 'food', 'Eat & Drink', reason('eat'), 'Tersedia', 'App.v740.openEat()'],
      ['sleep', 'moon', 'Sleep / Rest', reason('sleep'), 'Tersedia', 'App.v740.openSleep()'],
      ['edu', 'cap', 'Education', null, les ? `${les} program berjalan` : 'Pilih kursus', "App.go('learn')"],
      ['career', 'briefcase', 'Career', null, car.status === 'employed' ? (car.position || 'Bekerja') : 'Belum bekerja', "App.go('career')"],
      ['wallet', 'wallet', 'Wallet', null, M(b.cash), "App.go('finance')"],
      ['shop', 'bag', 'Shopping', null, 'Toko dan perlengkapan', "App.go('shop')"],
      ['delivery', 'truck', 'Food Delivery', reason('delivery'), 'Tersedia', 'App.v740.openDelivery()'],
      ['transport', 'bus', 'Transport', reason('transport'), v.commute.modes.find(x => x.id === v.commute.mode).n, 'App.v740.openTransport()'],
      ['creator', 'video', 'Content Creator Studio', null, 'Kelola konten', "App.go('creator')"],
      ['biz', 'store', 'Business', null, nb ? `${nb} bisnis aktif` : 'Belum ada bisnis', "App.go('business')"],
      ['invest', 'chart', 'Investments', null, 'Portofolio dan pasar', "App.go('invest')"]
    ];
    return `<section class="card v740-qa" style="grid-area:quick"><div class="section-head"><h3 class="section-title">Quick Actions</h3><span class="small muted">Aksi yang tidak bisa dilakukan menampilkan alasannya</span></div><div class="v740-qa-grid">${items.map(([id, ic, t, why, ok, go]) => `<button class="v740-qa-item ${why ? 'off' : ''}" ${why ? 'aria-disabled="true"' : ''} onclick="${why ? `App.toast('${t.replace(/'/g, '')} belum bisa', ${JSON.stringify(why).replace(/"/g, '&quot;')}, 'warning')` : go}"><span class="v740-qic">${ico(ic, 18)}</span><span class="v740-qt"><b>${E(t)}</b><small class="${why ? 'why' : ''}">${E(why || ok)}</small></span><span class="v740-qch">${svg('chev', 14)}</span></button>`).join('')}</div></section>`;
  };
  const upcomingCard = () => {
    const ev = events(L.day, L.day + 14).slice(0, 4), notes = (Array.isArray(App.state.notifications) ? App.state.notifications : []).filter(n => !n.read).slice(0, 2);
    return `<section class="card v740-up" style="grid-area:upc"><div class="section-head"><h3 class="section-title">Jadwal Terdekat</h3><button class="btn" onclick="App.go('calendar')">Calendar</button></div>${ev.length ? ev.map(e => `<div class="v740-ev"><span class="v740-evic ${TYPES[e.type].c}">${ico(TYPES[e.type].ic, 15)}</span><div><b>${E(e.title)}</b><small>${e.day === L.day ? 'Hari ini' : `Tgl ${dateOf(e.day).date} · Bulan ${dateOf(e.day).month}`} · ${E(e.sub)}</small></div></div>`).join('') : '<div class="empty">Belum ada jadwal dalam 14 hari.</div>'}${notes.length ? `<div class="v740-sec-h">Notifikasi baru</div>${notes.map(n => `<div class="v740-ev"><span class="v740-evic gold">${ico('bell', 15)}</span><div><b>${E(n.title)}</b><small>${E(n.message || '')}</small></div></div>`).join('')}` : ''}</section>`;
  };
  const sumCard = () => {
    const s = S(), car = s.career || {}, b = bal(), nw = (() => { try { return App.v730.netWorth(); } catch { return b.cash; } })(), pr = ((s.v655 || {}).programs || {}), les = (s.v720 || {}).lessons || [];
    const edu = pr.education ? pr.education.name : les.length ? 'Kursus berjalan' : (car.educationLevel || 'Belum ada');
    const tile = (l, v, sub) => `<div class="v740-tile"><small>${l}</small><b>${v}</b>${sub ? `<span>${sub}</span>` : ''}</div>`;
    return `<section class="card v740-sum" style="grid-area:sum"><div class="section-head"><h3 class="section-title">Ringkasan Hidup</h3></div><div class="v740-tiles">${tile('Kekayaan bersih', M(nw), 'aset dikurangi utang')}${tile('Total utang', M(b.debt), b.debt ? 'pinjaman aktif' : 'tidak ada pinjaman')}${tile('Pendapatan', car.status === 'employed' ? M(car.salary || 0) : 'Rp0', car.status === 'employed' ? 'gaji per bulan' : 'belum bekerja')}${tile('Pekerjaan', E(car.status === 'employed' ? (car.position || '') : 'Belum bekerja'), car.status === 'employed' ? E(car.company || '') : '')}${tile('Pendidikan', E(edu), les.length ? `${les.length} pelajaran berjalan` : '')}</div></section>`;
  };
  const dashInner = () => { if (!L.view) return `<section class="card v740-load"><b>Memuat jam simulasi...</b><small>Waktu, kebutuhan, dan jadwal diambil dari engine.</small></section>`; return `<div class="v740-grid">${nowCard()}${needsCard()}${qaCard()}${upcomingCard()}${sumCard()}</div>`; };

  /* ---------------- halaman Calendar ---------------- */
  const calInner = () => {
    const v = L.view; if (!v) return '<section class="card v740-load"><b>Memuat kalender...</b></section>';
    const c = v.cal, today = L.day, td = dateOf(today); if (!L.vm) L.vm = { y: td.year, m: td.month }; if (L.sel == null) L.sel = today;
    const first = dayOf(L.vm.y, L.vm.m, 1), lead = dateOf(first).weekday, cells = Math.ceil((lead + c.daysPerMonth) / 7) * 7, from = first - lead, to = from + cells - 1, ev = events(from, to), by = {};
    for (const e of ev) (by[e.day] ||= []).push(e);
    const head = c.weekdays.map(w => `<div class="v740-dow">${w.slice(0, 3)}</div>`).join('');
    let grid = ''; for (let i = 0; i < cells; i++) { const d = from + i, dd = dateOf(d), other = d < first || d >= first + c.daysPerMonth, es = by[d] || [], past = d < today; grid += `<button class="v740-day ${other ? 'dim' : ''} ${d === today ? 'today' : ''} ${d === L.sel ? 'sel' : ''} ${past ? 'past' : ''} ${dd.weekday === 0 || dd.weekday === 6 ? 'we' : ''}" onclick="App.v740.calSel(${d})" aria-label="Tanggal ${dd.date} bulan ${dd.month}${d === today ? ', hari ini' : ''}"><b>${dd.date}</b><span class="v740-dots">${es.slice(0, 3).map(e => `<i class="${TYPES[e.type].c}"></i>`).join('')}</span>${es.slice(0, 2).map(e => `<em class="${TYPES[e.type].c}">${E(e.title.split(':')[0])}</em>`).join('')}${es.length > 2 ? `<u>+${es.length - 2}</u>` : ''}</button>`; }
    const sd = dateOf(L.sel), blocks = dayBlocks(L.sel), dayEv = events(L.sel, L.sel).filter(e => e.day === L.sel), salary = employed() ? Math.round((S().career.salary || 0) / 30) : 0, loans = (Array.isArray(App.state.loans) ? App.state.loans : []).filter(l => l.status === 'pending' && l.remaining > 0);
    const nowIn = b => L.sel === today && L.tod >= b.a && L.tod < b.b;
    const sched = `${blocks.map(b => `<div class="v740-sch ${nowIn(b) ? 'now' : ''}"><span class="t">${clk(b.a, false)}-${clk(b.b, false)}</span><span class="v740-evic ${TYPES[b.ty].c}">${ico(TYPES[b.ty].ic, 14)}</span><b>${E(b.t)}</b>${nowIn(b) ? '<em>Sekarang</em>' : ''}</div>`).join('')}${(salary || loans.length) ? `<div class="v740-sch"><span class="t">00:00</span><span class="v740-evic green">${ico('coin', 14)}</span><b>Pergantian hari</b><small>${salary ? `Gaji ${M(salary)} masuk` : ''}${salary && loans.length ? ' · ' : ''}${loans.length ? 'cicilan pinjaman dipotong' : ''}</small></div>` : ''}${dayEv.map(e => `<div class="v740-sch"><span class="t">Sepanjang hari</span><span class="v740-evic ${TYPES[e.type].c}">${ico(TYPES[e.type].ic, 14)}</span><b>${E(e.title)}</b><small>${E(e.sub)}</small></div>`).join('')}`;
    const upAll = events(today, today + 60).filter(e => L.evf === 'all' || e.type === L.evf), up = upAll.slice(0, 12);
    const flt = [['all', 'Semua'], ['deadline', 'Deadline'], ['bill', 'Tagihan'], ['school', 'Sekolah'], ['pay', 'Gaji'], ['content', 'Konten']];
    const his = history();
    return `<section class="card v740-calhead"><div><small>Waktu simulasi</small><b data-v740="full">${fmtFull(L.day, L.tod)}</b><span>${wdName(td.weekday)} · Hari ke-${today} · ${c.monthsPerYear} bulan × ${c.daysPerMonth} hari = ${c.daysPerYear} hari per tahun, tanpa tahun kabisat. Hari ke-1 = Senin.</span></div>${speedHTML()}</section>
    <div class="v740-calgrid"><section class="card v740-month"><div class="section-head"><h3 class="section-title">Tahun ${L.vm.y} · Bulan ${L.vm.m}</h3><div class="v740-nav"><button class="btn" onclick="App.v740.calNav(-1)" aria-label="Bulan sebelumnya">${svg('chev', 14).replace('<path', '<path transform="rotate(180 12 12)"')}</button><button class="btn" onclick="App.v740.calToday()">Hari ini</button><button class="btn" onclick="App.v740.calNav(1)" aria-label="Bulan berikutnya">${svg('chev', 14)}</button></div></div><div class="v740-cal7">${head}${grid}</div><div class="v740-legend">${Object.entries(TYPES).map(([k, t]) => `<span><i class="${t.c}"></i>${t.n}</span>`).join('')}</div></section>
    <section class="card v740-daily"><div class="section-head"><div><h3 class="section-title">Jadwal Harian</h3><span class="small muted">Tanggal ${sd.date} · Bulan ${sd.month} · Tahun ${sd.year} · ${wdName(sd.weekday)}${L.sel === today ? ' (hari ini)' : ''}</span></div></div>${sched || `<div class="empty">${sd.weekday === 0 || sd.weekday === 6 ? 'Akhir pekan: tidak ada jadwal kerja.' : 'Tidak ada jadwal pada tanggal ini.'}</div>`}</section></div>
    <div class="v740-calgrid two"><section class="card"><div class="section-head"><h3 class="section-title">Event Mendatang</h3><span class="small muted">60 hari ke depan</span></div><div class="v740-flt">${flt.map(([k, n]) => `<button class="${L.evf === k ? 'on' : ''}" onclick="App.v740.calFilter('${k}')">${n}</button>`).join('')}</div>${up.length ? up.map(e => { const dd = dateOf(e.day), n = e.day - today; return `<div class="v740-ev"><span class="v740-evic ${TYPES[e.type].c}">${ico(TYPES[e.type].ic, 15)}</span><div><b>${E(e.title)}</b><small>${E(e.sub)}</small></div><span class="badge ${n <= 1 ? 'danger' : 'blue'}">${n === 0 ? 'Hari ini' : `Tgl ${dd.date} · B${dd.month} · ${n} hari`}</span></div>`; }).join('') : '<div class="empty">Tidak ada event pada filter ini. Event muncul dari kursus, investasi, lelang, konten terjadwal, cicilan, dan keputusan yang menunggu.</div>'}</section>
    <section class="card"><div class="section-head"><h3 class="section-title">Riwayat Kejadian</h3><span class="small muted">Kejadian terbaru</span></div>${his.length ? his.map(h => `<div class="v740-ev"><span class="v740-evic navy">${ico(h.ic, 15)}</span><div><b>${E(h.title)}</b><small>${E(h.sub || '')}</small></div><span class="small muted">${h.tod >= 0 ? `Hari ${h.day} · ${clk(h.tod, false)}` : `Hari ${h.day}`}</span></div>`).join('') : '<div class="empty">Belum ada kejadian tercatat.</div>'}</section></div>`;
  };

  /* ---------------- modal aksi ---------------- */
  const optRow = (o, kind, label = 'Pilih') => `<div class="v740-opt ${o.ok ? '' : 'off'}"><div class="v740-opt-main"><b>${E(o.n)}</b><small>${E(o.venue || '')}${o.venue ? ' · ' : ''}${o.min ? o.min + ' menit · ' : ''}${o.price ? M(o.price) : 'Gratis'}${o.hours ? ' · buka ' + E(o.hours) : ''}${o.note ? ' · ' + E(o.note) : ''}</small><div class="v740-effs">${chips(o.gain)}</div>${o.ok ? '' : `<p class="v740-why">${ico('lock', 12)} ${E(o.reason)}</p>`}</div><button class="btn ${o.ok ? 'primary' : ''}" ${o.ok ? '' : 'disabled'} onclick="App.v740.act('${kind}','${o.id}')">${label}</button></div>`;
  const wakeBar = () => { const a = L.view.act; return a && ['sleep', 'rest', 'nap'].includes(a.kind) && !a.forced ? `<div class="v740-opt"><div class="v740-opt-main"><b>${E(a.label)}</b><small>Sedang berlangsung</small></div><button class="btn" onclick="App.v740.act('cancel')">${a.kind === 'sleep' ? 'Bangun' : 'Berhenti'}</button></div>` : ''; };
  const need2 = { hunger: 'eat', thirst: 'eat', energy: 'sleep', hygiene: 'sleep', health: 'sleep', mood: 'sleep', stress: 'sleep', bladder: 'sleep' };
  const API = {
    now: () => ({ day: L.day, tod: L.tod, ...dateOf(L.day), hour: hmsOf(L.tod).h, minute: hmsOf(L.tod).m, second: hmsOf(L.tod).s, abs: abs(), speed: L.view ? L.view.clock.speed : 1, paused: L.view ? L.view.clock.paused : false, rolling: L.rolling }),
    fmtFull, fmtShort, dateOf, dayOf, view: () => L.view, events, setSpeed, togglePause,
    calNav: d => { L.vm = L.vm || { y: dateOf(L.day).year, m: dateOf(L.day).month }; let m = L.vm.m + d, y = L.vm.y; const mm = CAL().monthsPerYear; if (m > mm) { m = 1; y++; } if (m < 1) { m = mm; y--; } if (y < 1) { y = 1; m = 1; } L.vm = { y, m }; paint(); },
    calToday: () => { const t = dateOf(L.day); L.vm = { y: t.year, m: t.month }; L.sel = L.day; paint(); },
    calSel: d => { L.sel = d; const t = dateOf(d); L.vm = { y: t.year, m: t.month }; paint(); },
    calFilter: k => { L.evf = k; paint(); },
    tab: t => { L.tab = t; App.render(); },
    wake: () => API.act('cancel'),
    openEat: () => { const o = L.view.options; App.modal('Eat & Drink', `<div class="v740-mod-h">Makanan</div>${o.eat.map(x => optRow(x, 'eat')).join('')}<div class="v740-mod-h">Minuman</div>${o.drink.map(x => optRow(x, 'drink')).join('')}`, `<button class="btn" onclick="closeModal()">Tutup</button>`); },
    openSleep: () => { const o = L.view.options; App.modal('Sleep / Rest', `${wakeBar()}<div class="v740-mod-h">Tidur dan istirahat</div>${o.sleep.map(x => optRow(x, 'sleep', 'Mulai')).join('')}<div class="v740-mod-h">Perawatan diri</div>${o.care.map(x => optRow(x, 'care', 'Lakukan')).join('')}`, `<button class="btn" onclick="closeModal()">Tutup</button>`); },
    openDelivery: () => { const o = L.view.options.delivery; App.modal('Food Delivery', `<div class="v740-note">Pesanan tiba setelah beberapa menit simulasi dan langsung dimakan. Jam sibuk (11:00-13:00, 18:00-20:00) memakai biaya tambahan dan estimasi lebih lama.</div>${o.map(x => `<div class="v740-opt ${x.ok ? '' : 'off'}"><div class="v740-opt-main"><b>${E(x.n)}</b><small>${M(x.price)} + ongkir ${M(x.fee)} = <b>${M(x.total)}</b> · estimasi ±${x.etaMin} menit${x.rush ? ' · jam sibuk' : ''}</small><div class="v740-effs">${chips(x.gain)}</div>${x.ok ? '' : `<p class="v740-why">${ico('lock', 12)} ${E(x.reason)}</p>`}</div><button class="btn ${x.ok ? 'primary' : ''}" ${x.ok ? '' : 'disabled'} onclick="App.v740.act('delivery','${x.id}')">Pesan</button></div>`).join('')}`, `<button class="btn" onclick="closeModal()">Tutup</button>`); },
    openTransport: () => { const c = L.view.commute; App.modal('Transport', c.employed ? `<div class="v740-note">Moda ini dipakai untuk perjalanan ke tempat kerja setiap hari kerja. Biaya dipotong saat pergantian hari; energi dan kebersihan terpengaruh selama jam kerja.</div>${c.modes.map(m => `<div class="v740-opt"><div class="v740-opt-main"><b>${E(m.n)}${c.mode === m.id ? ' <span class="badge success">Dipakai</span>' : ''}</b><small>${m.cost ? M(m.cost) + ' per hari kerja' : 'Gratis'} · energi −${m.energy} · kebersihan −${m.hygiene} per hari · ${E(m.note)}</small></div><button class="btn ${c.mode === m.id ? '' : 'primary'}" ${c.mode === m.id ? 'disabled' : ''} onclick="App.v740.act('commute','${m.id}')">Gunakan</button></div>`).join('')}` : `<div class="v740-note">${ico('lock', 14)} Belum bekerja, belum ada perjalanan rutin. Moda transport bisa dipilih setelah mendapat pekerjaan.</div>`, `<button class="btn" onclick="closeModal()">Tutup</button>`); },
    needInfo: k => {
      const v = L.view, m = v.meta[k], n = v.needs[k], x = proj(k), th = v.th, rows = k === 'stress' ? [['Normal', `0-${th.sHi - 1}%`], ['Tinggi', `${th.sHi}-${th.sCrit - 1}%`], ['Kritis', `${th.sCrit}-100%`]] : [['Normal', `${th.hi}-100%`], ['Rendah', `${th.crit}-${th.hi - 1}%`], ['Kritis', `0-${th.crit - 1}%`]];
      const where = need2[k], fn = where === 'eat' ? 'App.v740.openEat()' : 'App.v740.openSleep()';
      App.modal(`${m.label} · ${m.id}`, `<div class="v740-ndetail"><div class="v740-nbig ${levelOf(k, x)}"><b>${Math.round(x)}%</b><span>${E(m.desc)}</span></div><div class="v740-nbar big"><i style="width:${x.toFixed(1)}%"></i></div><div class="metric-row"><span>Perubahan sekarang</span><b>${E(rate1(n.rate))}</b></div><div class="metric-row"><span>Laju dasar saat terjaga</span><b>${m.decay ? E(rate1(m.decay)) : 'Bergantung kondisi lain'}</b></div>${rows.map(r => `<div class="metric-row"><span>${r[0]}</span><b>${r[1]}</b></div>`).join('')}<p><b>Dampak:</b> ${E(m.low)}</p><p><b>Pemulihan:</b> ${E(m.fix)}</p></div>`, `<button class="btn" onclick="closeModal()">Tutup</button><button class="btn primary" onclick="closeModal();${fn}">Buka aksi</button>`);
    },
    act: async (kind, id) => {
      if (!L.view) return;
      const d = await enq(async () => { await syncInner(); const r = await raw('/api/v740/act', { kind, id }); return r; });
      if (!d || d.error) { App.toast('Belum bisa', (d && d.error) || 'Aksi gagal.', 'warning'); if (d && d.error) await loadView(); return; }
      closeModal(); applyView(d.v740);
      const lab = kind === 'cancel' ? 'Aktivitas dihentikan.' : kind === 'commute' ? 'Moda perjalanan diubah.' : kind === 'delivery' ? 'Pesanan dibuat.' : `${d.v740.act ? d.v740.act.label : 'Aktivitas'} dimulai.`;
      App.toast(kind === 'delivery' ? 'Food Delivery' : kind === 'commute' ? 'Transport' : 'Aktivitas', lab, 'success');
      await App.refresh();
    }
  };
    App.v740 = API;

  /* ---------------- pengecatan ---------------- */
  const chipHTML = () => { const v = L.view; if (!v) return ''; return `<button class="v740-chip-main" onclick="App.go('calendar')" title="Waktu simulasi: buka Calendar"><span class="d">Tgl ${dateOf(L.day).date} · B${dateOf(L.day).month}</span><span class="t" data-v740="chip-time">${clk(L.tod)}</span></button><button class="v740-chip-pp" onclick="App.v740.togglePause()" aria-label="${v.clock.paused ? 'Lanjutkan waktu' : 'Jeda waktu'}" title="${v.clock.paused ? 'Lanjut' : 'Jeda'}">${svg(v.clock.paused ? 'play' : 'pause', 14)}</button>`; };
  const mountChip = () => { const host = document.querySelector('.top-actions'); if (!host) return; let el = host.querySelector('.v740-topchip'); if (!el) { el = document.createElement('div'); el.className = 'v740-topchip'; host.insertBefore(el, host.firstChild); } el.className = 'v740-topchip' + (L.view && L.view.clock.paused ? ' paused' : ''); el.innerHTML = chipHTML(); };
  function paint() {
    try {
      const a = document.getElementById('v740-dash'); if (a && !document.querySelector('.modal-backdrop')) a.innerHTML = dashInner();
      const c = document.getElementById('v740-cal'); if (c) c.innerHTML = calInner();
      mountChip(); tickDom();
    } catch (e) { console.warn('v740 paint', e); }
  }

  /* ---------------- pembungkus (tidak mengganti isi fungsi lama) ---------------- */
  const dash0 = App.dashboard;
  App.dashboard = () => { let head = ''; try { head = `<div id="v740-dash" class="v740-wrap">${dashInner()}</div>`; } catch (e) { console.warn(e); } return head + dash0(); };
  const cal0 = App.calendar;
  App.calendar = () => {
    try {
      const tabs = `<div class="v740-tabs" role="tablist"><button class="${L.tab === 'cal' ? 'on' : ''}" onclick="App.v740.tab('cal')" role="tab">Kalender</button><button class="${L.tab === 'tasks' ? 'on' : ''}" onclick="App.v740.tab('tasks')" role="tab">Tugas dan Agenda</button></div>`;
      return tabs + (L.tab === 'cal' ? `<div class="page-head"><div><h1>Calendar</h1><p>Kalender simulasi: jadwal kerja dan belajar, deadline, tagihan, dan riwayat kejadian.</p></div></div><div id="v740-cal" class="v740-wrap">${calInner()}</div>` : cal0());
    } catch (e) { console.warn(e); return cal0(); }
  };
  const ref0 = App.refresh; App.refresh = async (...a) => { const r = await ref0.apply(App, a); try { await loadView(); } catch { } return r; };
  const sim0 = App.simDay;
  App.simDay = async (...a) => { if (L.rolling) return; L.rolling = true; try { if (L.view) { await syncNow(); } await sim0.apply(App, a); } finally { L.rolling = false; try { await loadView(); } catch { } } };
  const ren0 = App.render;
  App.render = () => { ren0(); try { if (App.user && L.uid !== App.user.id) { L.uid = App.user.id; L.view = null; L.logId = 0; L.vm = null; L.sel = null; loadView(); } mountChip(); tickDom(); if (!App._v740t) { App._v740t = setInterval(tick, 250); setInterval(() => { if (!document.hidden) syncNow(); }, 5000); } } catch (e) { console.warn(e); } };
  document.addEventListener('visibilitychange', () => { L.last = performance.now(); if (document.hidden) syncNow(); });
  window.addEventListener('pagehide', () => { try { localStorage.setItem(LS(), JSON.stringify({ day: L.day, tod: L.tod })); } catch { } syncNow(); });
  if (App.state) App.render();
})();
