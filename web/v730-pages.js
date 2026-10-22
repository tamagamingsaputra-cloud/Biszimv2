/* BizSim 7.3.0 pages: dashboard progress, real task board and agenda, portfolio analytics, job cards, asset logos. Additive; old functions stay reachable as App._*Old. */
(() => {
  if (typeof App === 'undefined' || !App.v700 || !App.v730) return;
  const { M, ic, E, pct, cls, clamp, lineSvg, donut, api, val } = App.v700;
  const S = () => App.state.state, V = () => S().v700 || {}, V6 = () => S().v655 || {}, X = () => S().v720 || {}, day = () => S().day;
  const tasks = () => (S().v730 || {}).tasks || [];
  const bar = (p, tone = '') => `<div class="pb ${tone}"><i style="width:${Math.round(clamp(p, 0, 1) * 100)}%"></i></div>`;

  /* ================= DASHBOARD: progress (training, education, tasks) ================= */
  const lessonRows = () => {
    const out = [], c = (App.v720cat && App.v720cat.courses) || [];
    for (const l of (X().lessons || [])) { const cs = c.find(q => q.id === l.course) || { name: l.course, kind: 'education', ic: 'cap' }, f = (day() - l.startDay) / Math.max(1, l.endDay - l.startDay); out.push({ ic: cs.kind === 'training' ? 'briefcase' : 'cap', kind: cs.kind === 'training' ? 'Training' : cs.kind === 'degree' ? 'Pendidikan' : 'Education', title: cs.name, sub: l.name, f, right: `${Math.max(0, l.endDay - day())} hari lagi` }); }
    const pr = V6().programs || {};
    for (const k of ['training', 'education']) { const p = pr[k]; if (p) out.push({ ic: k === 'training' ? 'briefcase' : 'cap', kind: k === 'training' ? 'Training' : 'Education', title: p.name, sub: 'Program berjalan', f: (day() - p.startDay) / Math.max(1, p.endDay - p.startDay), right: `${Math.max(0, p.endDay - day())} hari lagi` }); }
    return out;
  };
  const progressCard = () => {
    const rows = lessonRows(), t = tasks(), done = t.filter(x => x.status === 'done').length, fund = t.find(x => x.rule === 'fund'), nxt = t.find(x => x.status !== 'done' && x.rule !== 'fund');
    const row = r => `<div class="pg-row"><span class="pg-ic">${ic(r.ic, 18)}</span><div class="pg-main"><div class="pg-top"><b>${E(r.title)}</b><span>${E(r.right)}</span></div>${bar(r.f)}<small>${E(r.kind)} · ${E(r.sub)}</small></div></div>`;
    return `<section class="card pg"><div class="section-head"><h3 class="section-title">Progres Saya</h3><button class="btn" onclick="App.go('learn')">Training</button></div>${rows.length ? rows.map(row).join('') : `<div class="pg-row idle"><span class="pg-ic">${ic('cap', 18)}</span><div class="pg-main"><div class="pg-top"><b>Training dan education</b><span>Belum aktif</span></div>${bar(0)}<small>Daftar kursus untuk menaikkan skill dan membuka karier lebih baik.</small></div></div>`}<div class="pg-row"><span class="pg-ic gold">${ic('task', 18)}</span><div class="pg-main"><div class="pg-top"><b>Tugas dan target</b><span>${done}/${t.length} selesai</span></div>${bar(t.length ? done / t.length : 0, 'gold')}<small>${nxt ? 'Berikutnya: ' + E(nxt.title) : 'Semua tugas selesai.'}</small></div></div>${fund && fund.status !== 'done' ? `<div class="pg-row"><span class="pg-ic teal">${ic('wallet', 18)}</span><div class="pg-main"><div class="pg-top"><b>Dana darurat</b><span>${M(Math.max(0, S().cash))} / ${M(fund.need)}</span></div>${bar(Math.max(0, S().cash) / fund.need, 'teal')}<small>Target dana darurat Rp5.000.000.</small></div></div>` : ''}</section>`;
  };
  const dash1 = App.dashboard;
  App.dashboard = () => { try { return progressCard() + dash1(); } catch (e) { return dash1(); } };

  /* ================= CALENDAR: real agenda + task board ================= */
  const agenda = () => {
    const d = day(), L = [], add = (dd, t, n, i) => { if (dd >= d && dd <= d + 45) L.push({ d: dd, t, n, i }); }, v = V(), c = (App.v720cat && App.v720cat.courses) || [];
    for (const l of (X().lessons || [])) add(l.endDay, 'Pelajaran selesai', `${(c.find(q => q.id === l.course) || {}).name || l.course}: ${l.name}`, 'cap');
    const pr = V6().programs || {}; for (const k of ['training', 'education']) if (pr[k]) add(pr[k].endDay, 'Program selesai', pr[k].name, 'cap');
    for (const a of (X().auctions || [])) if (!a.done) add(a.endDay, a.bidder === 'you' ? 'Lelang: Anda memimpin' : 'Lelang berakhir', a.title, 'gavel');
    for (const q of (v.ipos || [])) { if (q.status === 'open') add(q.closeDay, 'Pemesanan IPO ditutup', q.n, 'chart'); if (q.status !== 'listed') add(q.listDay, 'IPO tercatat', q.n, 'chart'); }
    for (const q of (v.deposits || [])) if (q.status === 'active') add(q.matureDay, 'Deposito jatuh tempo', M(q.amount), 'wallet');
    for (const q of (v.bonds || [])) if (q.status === 'active') add(q.matureDay, 'Obligasi jatuh tempo', M(q.amount), 'bank');
    for (const q of ((v.hr || {}).vac || [])) { add(q.readyDay, 'Pelamar tiba', q.role, 'userplus'); add(q.expireDay, 'Lowongan ditutup', q.role, 'users'); }
    for (const q of (V6().pendingCash || [])) add(q.dueDay, 'Dana cair', `${q.label}: ${M(q.amount)}`, 'coins');
    const emp = (S().employees || []).filter(e => e.status === 'active').length; if (emp) add(d + (30 - (d % 30 || 30)) || d + 30, 'Gaji karyawan', `${emp} karyawan`, 'users');
    for (const p of ((X().land || {}).owned || [])) if (p.leased) { const nx = p.boughtDay + Math.ceil((d - p.boughtDay + 1) / 30) * 30; add(nx, 'Sewa tanah cair', p.name, 'land'); }
    return L.sort((a, b) => a.d - b.d).slice(0, 9);
  };
  const PRI = { high: ['Prioritas tinggi', 'danger'], normal: ['Prioritas normal', 'blue'], low: ['Prioritas rendah', ''] };
  const taskCard = t => { const p = t.prog, f = p && p.need ? clamp(p.have / p.need, 0, 1) : t.status === 'done' ? 1 : 0; return `<article class="tk ${t.status}" onclick="App.v730.openTask('${t.id}')"><div class="tk-top"><b>${E(t.title)}</b><span class="badge ${PRI[t.priority][1]}">${PRI[t.priority][0]}</span></div><p>${E(t.note)}</p>${p ? `${bar(f, t.status === 'done' ? 'good' : '')}<small>${t.status === 'done' ? `Selesai hari ${t.doneDay}` : E(p.hint)}</small>` : `<small>${t.status === 'done' ? `Selesai hari ${t.doneDay}` : 'Tugas manual'}</small>`}</article>`; };
  App._calendarOld = App.calendar;
  App.calendar = () => {
    const t = tasks(), col = (st, title, tone) => { const l = t.filter(x => x.status === st); return `<div class="tk-col ${tone}"><div class="tk-col-h"><b>${title}</b><span>${l.length}</span></div>${l.map(taskCard).join('') || '<div class="tk-empty">Kosong</div>'}</div>`; };
    const ag = agenda();
    return `<div class="page-head"><div><h1>Calendar & Tasks</h1><p>Agenda berasal dari kejadian nyata di simulasi Anda. Tugas selesai otomatis saat syaratnya terpenuhi, atau Anda bisa menyelesaikannya sendiri.</p></div><button class="btn primary" onclick="App.v730.addTask()">${ic('plus', 16)} Tugas Baru</button></div><section class="card"><div class="section-head"><h3 class="section-title">Agenda 45 Hari</h3><span class="small muted">Hari ini: ${day()}</span></div>${ag.map(a => `<div class="ag"><span class="ag-ic">${ic(a.i, 17)}</span><div><b>${E(a.t)}</b><small>${E(a.n)}</small></div><span class="badge blue">${a.d === day() ? 'Hari ini' : `Hari ${a.d} · ${a.d - day()} hari`}</span></div>`).join('') || '<div class="empty">Belum ada agenda. Mulai kursus, ajukan lowongan, atau ikuti lelang.</div>'}</section><div class="section-head" style="margin-top:18px"><h3 class="section-title">Task Board</h3><span class="small muted">${t.filter(x => x.status === 'done').length}/${t.length} selesai</span></div><div class="tk-board">${col('doing', 'Sedang dikerjakan', 'doing')}${col('todo', 'Belum dikerjakan', 'todo')}${col('done', 'Selesai', 'done')}</div>`;
  };
  Object.assign(App.v730, {
    openTask: id => {
      const t = tasks().find(q => q.id === id); if (!t) return; const p = t.prog, auto = t.rule !== 'manual';
      App.modal('Detail Tugas', `<div class="tkd"><span class="badge ${PRI[t.priority][1]}">${PRI[t.priority][0]}</span><h3>${E(t.title)}</h3><p>${E(t.note)}</p>${p ? `<div class="tkd-p"><div class="pg-top"><b>Progres</b><span>${t.status === 'done' ? 'Selesai' : E(p.hint)}</span></div>${bar(p.need ? clamp(p.have / p.need, 0, 1) : t.status === 'done' ? 1 : 0, t.status === 'done' ? 'good' : '')}</div>` : ''}<div class="metric-row"><span>Status</span><b>${{ todo: 'Belum dikerjakan', doing: 'Sedang dikerjakan', done: 'Selesai' }[t.status]}</b></div><div class="metric-row"><span>Jenis</span><b>${auto ? 'Otomatis (mengikuti kondisi game)' : 'Manual'}</b></div><div class="metric-row"><span>Dibuat</span><b>Hari ${t.created}</b></div>${t.doneDay != null ? `<div class="metric-row"><span>Selesai</span><b>Hari ${t.doneDay}</b></div>` : ''}</div>`,
        `<button class="btn danger" ${(!auto || t.status === 'done') ? '' : 'disabled'} onclick="App.v730.taskAct('${id}','delete')">Hapus</button>${t.status === 'done' ? `<button class="btn" ${auto ? 'disabled' : ''} onclick="App.v730.taskAct('${id}','reopen')">Buka ulang</button>` : `${t.status === 'todo' ? `<button class="btn" onclick="App.v730.taskAct('${id}','start')">Mulai</button>` : ''}<button class="btn primary" onclick="App.v730.taskAct('${id}','complete')">Selesaikan</button>`}`);
    },
    taskAct: async (id, action) => { const d = await api('/api/v730/task', { id, action }); if (!d) return; closeModal(); const msg = { start: 'Tugas sedang dikerjakan.', complete: 'Tugas ditandai selesai.', reopen: 'Tugas dibuka kembali.', delete: 'Tugas dihapus.' }[action]; App.toast('Tugas diperbarui', msg, 'success'); await App.refresh(); },
    addTask: () => App.modal('Tugas Baru', `<div class="field"><label>Judul</label><input id="tk-title" maxlength="80" placeholder="Contoh: Cek laporan keuangan"></div><div class="field"><label>Catatan</label><input id="tk-note" maxlength="200" placeholder="Opsional"></div><div class="field"><label>Prioritas</label><select id="tk-pri"><option value="high">Tinggi</option><option value="normal" selected>Normal</option><option value="low">Rendah</option></select></div>`, `<button class="btn" onclick="closeModal()">Batal</button><button class="btn primary" onclick="App.v730.addTaskGo()">Tambah</button>`),
    addTaskGo: async () => { const d = await api('/api/v730/task', { action: 'add', title: val('tk-title'), note: val('tk-note'), priority: val('tk-pri') }); if (!d) return; closeModal(); App.toast('Tugas ditambahkan', d.task.title, 'success'); await App.refresh(); }
  });

  /* ================= PORTFOLIO ANALYTICS ================= */
  const COL = { cash: '#8fa3bf', stock: '#1c2f52', trade: '#7a5a8c', bond: '#2f7d78', fund: '#c08a3e', gold: '#b8924a', prop: '#8c3a48', land: '#5b8a5a', dep: '#4a7fa7', art: '#a05a78', biz: '#47607f' };
  const LAB = { cash: 'Cash', stock: 'Saham', trade: 'Trading', bond: 'Obligasi', fund: 'Reksadana', gold: 'Emas', prop: 'Properti', land: 'Tanah', dep: 'Deposito', art: 'Koleksi', biz: 'Bisnis' };
  const holdings = () => Object.entries(V().holdings || {}).map(([t, h]) => { const st = (V().stocks || {})[t] || { price: 0 }, m = (App.v700.stockMeta && App.v700.stockMeta(t)) || { n: t, sec: '' }, val2 = h.shares * st.price, cost = h.shares * h.cost; return { t, n: m.n, sec: m.sec, lot: m.c === 'US' ? 1 : 100, h, price: st.price, val: val2, cost, pl: val2 - cost }; });
  const totals = () => {
    const v = V(), v6 = V6(), x = X(), o = {}, hs = holdings();
    o.cash = Math.max(0, S().cash || 0); o.stock = hs.reduce((a, h) => a + h.val, 0); o.trade = (v.trading ? v.trading.pos : []).reduce((a, p) => { const c = (v.trading.c[p.asset] || [[0, 0, 0, p.entry]]).slice(-1)[0][3]; return a + Math.max(0, p.margin + p.dir * (c / p.entry - 1) * p.margin * p.lev - p.fees); }, 0);
    o.bond = (v.bonds || []).filter(b => b.status === 'active').reduce((a, b) => a + b.amount, 0); o.fund = Object.entries((v.funds || {}).units || {}).reduce((a, [k, u]) => a + u.units * v.funds.nav[k], 0); o.gold = ((v.gold || {}).grams || 0) * (v6.nav ? v6.nav.gold : 0);
    o.prop = ((v.property || {}).owned || []).reduce((a, p) => a + p.price * ((v6.nav[p.src] || 1) / p.entryIdx) * (1 + .03 * (p.level || 0)), 0); o.land = ((x.land || {}).owned || []).reduce((a, p) => a + p.sqm * p.ppsm * p.idx, 0);
    o.dep = (v.deposits || []).filter(d => d.status === 'active').reduce((a, d) => a + d.amount, 0); const col = ((App.v700.C && App.v700.C().shop) || []); o.art = (v.inv || []).filter(i => (col.find(q => q.id === i.itemId) || {}).col).reduce((a, i) => a + (i.value || i.price), 0);
    o.biz = (App.state.businesses || []).reduce((a, b) => a + (b.value || 0) + (b.cash || 0), 0); return o;
  };
  const pfHTML = () => {
    const t = totals(), tot = Object.values(t).reduce((a, b) => a + b, 0), inv = tot - t.cash - t.biz, hs = holdings().sort((a, b) => b.val - a.val), nwH = (X().nw || []).slice(-30).map(q => q.cash + q.inv + q.biz), nwNow = tot;
    const series = nwH.length ? [...nwH.slice(0, -1), nwNow] : [nwNow], first = series[0] || nwNow, ch = first ? nwNow / first - 1 : 0;
    const unreal = hs.reduce((a, h) => a + h.pl, 0), real = V().realized || 0, divs = hs.reduce((a, h) => a + (h.h.div || 0), 0), posn = (V().trading || { pos: [] }).pos, usedM = posn.reduce((a, p) => a + p.margin, 0), expo = posn.reduce((a, p) => a + p.margin * p.lev, 0);
    const parts = Object.keys(t).filter(k => t[k] > 0).sort((a, b) => t[b] - t[a]), top = hs[0], conc = top && inv > 0 ? top.val / inv : 0, hhi = hs.length ? hs.reduce((a, h) => a + Math.pow(h.val / (hs.reduce((q, w) => q + w.val, 0) || 1), 2), 0) : 0, lev = tot ? expo / tot : 0, liq = tot ? t.cash / tot : 0;
    const rate = (label, v2, tone, note) => `<div class="rk"><div class="rk-top"><b>${label}</b><span class="badge ${tone}">${v2}</span></div><small>${note}</small></div>`;
    const tx = (V().tx || []).slice(0, 8);
    return `<div class="pf-wrap"><div class="pf-kpis"><div class="kp main"><small>Kekayaan bersih</small><b data-count="${Math.round(nwNow)}">${M(nwNow)}</b><span class="${cls(ch)}">${pct(ch)} dalam ${Math.max(1, series.length - 1)} hari</span></div><div class="kp"><small>Total investasi</small><b>${M(inv)}</b><span>${tot ? Math.round(inv / tot * 100) : 0}% dari kekayaan</span></div><div class="kp"><small>Untung/rugi belum realisasi</small><b class="${cls(unreal)}">${M(unreal)}</b><span>Saham yang dimiliki</span></div><div class="kp"><small>Untung/rugi realisasi</small><b class="${cls(real)}">${M(real)}</b><span>Dividen ${M(divs)}</span></div></div>
    <div class="grid two"><section class="card"><div class="section-head"><h3 class="section-title">Kekayaan Bersih</h3><span class="small muted">${series.length} titik data</span></div>${series.length > 1 ? `<div class="pf-line">${lineSvg(series, { w: 360, h: 120, color: 'var(--g-navy)' })}</div>` : '<div class="empty">Grafik muncul setelah beberapa hari simulasi.</div>'}</section>
    <section class="card"><div class="section-head"><h3 class="section-title">Alokasi Aset</h3></div><div class="alloc2">${donut(parts.map(k => ({ v: t[k], c: COL[k] })), 138)}<div class="alloc2-leg">${parts.map(k => `<div><i style="background:${COL[k]}"></i><span>${LAB[k]}</span><b>${tot ? (t[k] / tot * 100).toFixed(1) : 0}%</b><small>${M(t[k])}</small></div>`).join('') || '<div class="empty">Belum ada aset.</div>'}</div></div></section></div>
    <section class="card"><div class="section-head"><h3 class="section-title">Kepemilikan Saham</h3><span class="small muted">${hs.length} emiten</span></div>${hs.length ? `<div class="ht">${hs.map(h => `<div class="ht-r">${App.v730.logo ? App.v730.logo(h.t, h.sec, 38) : ''}<div class="ht-n"><b>${h.t}</b><small>${E(h.n)}</small></div><div class="ht-q"><small>Jumlah</small><b>${(h.h.shares / h.lot).toLocaleString('id-ID')} ${h.lot === 100 ? 'lot' : 'lembar'}</b></div><div class="ht-q"><small>Rata-rata beli</small><b>${M(h.h.cost)}</b></div><div class="ht-q"><small>Harga kini</small><b>${M(h.price)}</b></div><div class="ht-v"><b>${M(h.val)}</b><small class="${cls(h.pl)}">${h.pl >= 0 ? '+' : ''}${M(h.pl)} (${pct(h.cost ? h.pl / h.cost : 0)})</small></div></div>`).join('')}</div>` : '<div class="empty">Belum memiliki saham. Beli saham di Investment Hub untuk melihat kepemilikan.</div>'}</section>
    <div class="grid two"><section class="card"><div class="section-head"><h3 class="section-title">Posisi Trading</h3><span class="small muted">${posn.length}/6</span></div><div class="mg"><div><small>Margin terpakai</small><b>${M(usedM)}</b></div><div><small>Margin tersedia</small><b>${M(Math.max(0, S().cash))}</b></div><div><small>Eksposur</small><b>${M(expo)}</b></div></div>${posn.map(p => { const c = ((V().trading.c[p.asset] || []).slice(-1)[0] || [0, 0, 0, p.entry])[3], pnl = p.dir * (c / p.entry - 1) * p.margin * p.lev - p.fees; return `<div class="metric-row"><span>${p.asset} ${p.dir > 0 ? 'LONG' : 'SHORT'} ${p.lev}x</span><b class="${cls(pnl)}">${M(pnl)}</b></div>`; }).join('') || '<div class="empty">Tidak ada posisi trading terbuka.</div>'}</section>
    <section class="card"><div class="section-head"><h3 class="section-title">Eksposur Risiko</h3></div>${rate('Konsentrasi saham', top ? Math.round(conc * 100) + '%' : '-', conc > .6 ? 'danger' : conc > .4 ? 'warn' : 'success', top ? `Terbesar: ${top.t}` : 'Belum ada saham')}${rate('Diversifikasi', hs.length ? (hhi > .5 ? 'Rendah' : hhi > .3 ? 'Cukup' : 'Baik') : '-', hhi > .5 ? 'danger' : hhi > .3 ? 'warn' : 'success', `${hs.length} emiten, indeks HHI ${hhi.toFixed(2)}`)}${rate('Leverage trading', lev.toFixed(2) + 'x', lev > 1 ? 'danger' : lev > .4 ? 'warn' : 'success', 'Eksposur dibanding kekayaan')}${rate('Likuiditas', Math.round(liq * 100) + '%', liq < .05 ? 'danger' : liq < .15 ? 'warn' : 'success', 'Porsi cash dari kekayaan')}</section></div>
    <section class="card"><div class="section-head"><h3 class="section-title">Riwayat Transaksi Saham</h3></div>${tx.map(x => `<div class="tx"><span class="tx-k ${x.k}">${x.k === 'BUY' ? 'BELI' : 'JUAL'}</span><div><b>${x.t}</b><small>Hari ${x.day} · ${x.qty.toLocaleString('id-ID')} lembar @ ${M(x.price)}</small></div><div class="tx-v"><b>${M(x.total)}</b>${x.realized != null ? `<small class="${cls(x.realized)}">${x.realized >= 0 ? '+' : ''}${M(x.realized)}</small>` : `<small>Biaya ${M(x.fee || 0)}</small>`}</div></div>`).join('') || '<div class="empty">Belum ada transaksi saham.</div>'}</section></div>`;
  };
  App._portfolioOld = App.portfolio;
  App.portfolio = () => `<div class="page-head"><div><h1>Portfolio & Analytics</h1><p>Nilai bergerak mengikuti harga pasar simulasi. Semua angka dihitung dari aset yang benar-benar Anda miliki.</p></div><button class="btn primary" onclick="App.invTab='stock';App.go('invest')">${ic('chart', 16)} Investasi</button></div><div id="pf-root">${pfHTML()}</div>`;
  App.v730.pfHTML = pfHTML;

  /* ================= CAREER: job cards with pictures (and a fix for unquoted ids) ================= */
  const JOBART = { 'job-sales': 'job-sales', 'job-support': 'job-support', 'job-accountant': 'job-accountant', 'job-content': 'job-content' };
  const artOf = j => { const t = (j.title || '').toLowerCase(); return JOBART[j.id] || (/market/.test(t) ? 'job-marketing' : /design|desain/.test(t) ? 'job-design' : /program|develop|tech|it /.test(t) ? 'job-tech' : /finance|keuangan|audit/.test(t) ? 'job-finance' : /admin|secretary/.test(t) ? 'job-admin' : /procure|buyer|supply|gudang/.test(t) ? 'job-procurement' : /supervisor|manager|lead/.test(t) ? 'job-supervisor' : /operation|ops/.test(t) ? 'job-ops' : 'job-sales'); };
  const skillAvg = () => { const k = Object.values(S().skills || {}); return k.length ? Math.round(k.reduce((a, b) => a + b, 0) / k.length) : 0; };
  const career1 = App.career;
  App.career = () => {
    const html = career1();
    try {
      const jobs = App.jobs(); let n = 0;
      const out = html.replace(/<article class="job-card"><div class="art-frame"[^>]*>[\s\S]*?<\/svg><\/div>(<div class="job-card-body">[\s\S]*?App\.applyJob\('([^']+)'\)[\s\S]*?<\/article>)/g, (m, rest, id) => { const j = jobs.find(q => q.id === id); if (!j) return m; n++; const ok = skillAvg() >= j.min_skill; return `<article class="job-card">${App.v730.art(artOf(j))}${rest.replace('<div class="job-card-body">', `<div class="job-card-body"><span class="jc-state ${ok ? 'ok' : 'low'}">${ok ? 'Memenuhi syarat' : 'Skill kurang'}</span>`)}`; });
      return n ? out : html;
    } catch (e) { return html; }
  };

  /* ================= expose portfolio helpers for other additive modules (e.g. dashboard v2) ================= */
  Object.assign(App.v730, { totals, holdings, COL, LAB });

  /* ================= logos for stocks and coins (post-render) ================= */
  const r6 = App.render;
  App.render = () => {
    r6();
    try {
      const A = App.v730; if (!A.logo) return;
      document.querySelectorAll('.stk-row').forEach(row => { if (row.querySelector('.coin')) return; const m = /App\.v700Stock\('([A-Z0-9]+)'\)/.exec(row.getAttribute('onclick') || ''), t = m && m[1], mt = t && App.v700.stockMeta && App.v700.stockMeta(t); const tk = row.querySelector('.stk-tk'); if (tk && mt) tk.outerHTML = A.logo(t, mt.sec, 40); });
      document.querySelectorAll('.tr-asset').forEach(b => { if (b.querySelector('.coin')) return; const t = (b.querySelector('b') || {}).textContent; if (t) b.insertAdjacentHTML('afterbegin', A.coin(t, 26)); });
    } catch (e) { }
  };
  if (App.state) App.render();
})();
