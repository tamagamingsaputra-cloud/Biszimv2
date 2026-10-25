/* ============================================================
   BizSim 7.3.1 — dashboard update (poin: Dashboard utama)
   Menambahkan ke Dashboard: level karakter (dari reputasi),
   tanggal simulasi (tahun/bulan), utang, ringkasan investasi,
   ringkasan bisnis yang dimiliki, dan aktivitas terbaru nyata
   (bukan data acak). Juga menyediakan empty state yang jujur
   untuk pemain baru (tanpa angka progres fiktif).
   Additive: membungkus App.dashboard yang sudah ada (dash1 dari
   app.js, sudah dibungkus progressCard() oleh v730-pages.js).
   Struktur navigasi global dan layout dashboard yang sudah ada
   TIDAK dihapus — hanya ditambah.
   ============================================================ */
(() => {
  if (typeof App === 'undefined' || !App.v700) return;
  const { M, ic, E, clamp } = App.v700;
  const S = () => (App.state && App.state.state) || {};
  const day = () => S().day || 1;

  /* ---------- tanggal simulasi: 30 hari/bulan, 12 bulan/tahun ---------- */
  const simCalendar = d => {
    const idx = Math.max(0, d - 1), m = Math.floor(idx / 30), year = Math.floor(m / 12) + 1, monthInYear = (m % 12) + 1;
    return { year, month: monthInYear, label: `Tahun ${year} · Bulan ${monthInYear}` };
  };

  /* ---------- level karakter dari reputasi (0-100) ---------- */
  const REP_TIERS = [
    { min: 0, level: 1, label: 'Pemula' },
    { min: 25, level: 2, label: 'Berkembang' },
    { min: 50, level: 3, label: 'Dipercaya' },
    { min: 75, level: 4, label: 'Senior' },
    { min: 90, level: 5, label: 'Veteran' },
  ];
  const reputationTier = rep => { let t = REP_TIERS[0]; for (const x of REP_TIERS) if (rep >= x.min) t = x; return t; };

  /* ---------- utang (dari pinjaman aktif) ---------- */
  const debtTotal = () => (Array.isArray(App.state.loans) ? App.state.loans : []).reduce((a, x) => a + (Number(x.remaining) || 0), 0);

  /* ---------- investasi (pakai breakdown nyata dari v730-pages: totals/LAB) ---------- */
  const investBreakdown = () => {
    try {
      if (!App.v730 || !App.v730.totals) return [];
      const t = App.v730.totals(), LAB = App.v730.LAB, COL = App.v730.COL;
      return Object.keys(t).filter(k => k !== 'cash' && k !== 'biz' && t[k] > 0).sort((a, b) => t[b] - t[a]).map(k => ({ key: k, label: LAB[k] || k, value: t[k], color: (COL && COL[k]) || '#2467d8' }));
    } catch (e) { return []; }
  };

  /* ---------- bisnis yang dimiliki (data nyata, bukan label level fiktif) ---------- */
  const businessRows = () => (Array.isArray(App.state.businesses) ? App.state.businesses : []).map(b => ({
    name: b.name || 'Bisnis', type: b.type || '', location: b.location || '', value: Number(b.value) || 0,
    monthly: (Number(b.revenue) || 0) - (Number(b.expenses) || 0),
  }));

  /* ---------- aktivitas terbaru: gabungan sumber nyata yang sudah ada di state ---------- */
  const recentActivity = (limit = 6) => {
    const out = [];
    (Array.isArray(App.state.notifications) ? App.state.notifications : []).slice(-limit).reverse().forEach(n => out.push({ ic: 'bell', tone: '', title: n.title || 'Notifikasi', sub: n.message || '', when: '' }));
    (Array.isArray(App.state.incidents) ? App.state.incidents : []).slice(-4).reverse().forEach(x => out.push({ ic: 'warn', tone: x.status === 'active' ? 'bad' : '', title: `${x.type || 'Insiden'}${x.area ? ' · ' + x.area : ''}`, sub: `Kerusakan ${Math.round(x.damage_level || 0)}% · Perbaikan ${M(x.repair_cost || 0)}`, when: '' }));
    (Array.isArray(App.state.transactions) ? App.state.transactions : []).slice(-4).reverse().forEach(x => out.push({ ic: 'trend', tone: x.kind === 'SELL' ? 'good' : '', title: `${x.kind === 'SELL' ? 'Jual' : 'Beli'} ${x.asset || ''}`, sub: `Qty ${x.quantity ?? ''} · ${M(x.total || 0)}`, when: '' }));
    const car = S().career;
    if (car && Array.isArray(car.history) && car.history.length) { const h = car.history[car.history.length - 1]; out.push({ ic: 'briefcase', tone: 'good', title: `${h.position || 'Posisi baru'} · ${h.company || ''}`, sub: `Gaji ${M(h.salary || 0)}/bulan`, when: h.startedDay != null ? `Hari ${h.startedDay}` : '' }); }
    return out.slice(0, limit);
  };

  const isNewPlayer = () => {
    const biz = Array.isArray(App.state.businesses) ? App.state.businesses : [];
    const car = S().career || {};
    const inv = investBreakdown().reduce((a, x) => a + x.value, 0);
    return (Number(S().cash) || 0) <= 0 && biz.length === 0 && car.status !== 'employed' && inv <= 0 && debtTotal() <= 0;
  };

  /* ---------- render: strip status (level, tanggal simulasi, utang) ---------- */
  const statusStripHTML = () => {
    const rep = Math.round(S().reputation || 0), tier = reputationTier(rep), cal = simCalendar(day()), debt = debtTotal();
    return `<div class="bs-status-strip">
      <div class="bs-status-tile"><small>Level Karakter</small><div class="bs-level-row"><b>Level ${tier.level}</b><span class="bs-level-badge">${ic('sparkle', 11)} ${E(tier.label)}</span></div><span>Reputasi ${rep}/100</span></div>
      <div class="bs-status-tile"><small>Tanggal Simulasi</small><b>${E(cal.label)}</b><span>Hari ke-${day()}</span></div>
      <div class="bs-status-tile debt ${debt > 0 ? '' : 'zero'}"><small>Utang</small><b>${M(debt)}</b><span>${debt > 0 ? (App.state.loans || []).length + ' pinjaman aktif' : 'Tidak ada pinjaman aktif'}</span></div>
    </div>`;
  };

  /* ---------- render: ringkasan investasi ---------- */
  const investSectionHTML = () => {
    const rows = investBreakdown(), total = rows.reduce((a, x) => a + x.value, 0);
    return `<section class="card bs-sec"><div class="section-head"><h3 class="section-title">Investasi Saya</h3><button class="btn" onclick="App.go('invest')">Buka Investasi</button></div>
      ${rows.length ? rows.map(r => `<div class="bs-inv-row"><span class="bs-row-name"><span class="bs-row-dot" style="background:${r.color}"></span>${E(r.label)}</span><b>${M(r.value)}</b></div>`).join('') + `<div class="bs-inv-row" style="border-top:2px solid var(--line);margin-top:4px;padding-top:12px"><span class="bs-row-name"><b>Total Investasi</b></span><b>${M(total)}</b></div>`
        : `<div class="empty">Belum memiliki investasi. Status SIMULATED — nilai bergerak mengikuti simulasi, bukan jaminan untung. Mulai dari Asset Market atau Investments.</div>`}
    </section>`;
  };

  /* ---------- render: ringkasan bisnis ---------- */
  const businessSectionHTML = () => {
    const rows = businessRows();
    return `<section class="card bs-sec"><div class="section-head"><h3 class="section-title">Bisnis Saya</h3><button class="btn" onclick="App.go('business')">Kelola Bisnis</button></div>
      ${rows.length ? rows.map(b => `<div class="bs-biz-row"><span class="bs-row-name"><span>${ic('store', 16)}</span><span><b>${E(b.name)}</b><small class="bs-row-sub">${E(b.type)}${b.location ? ' · ' + E(b.location) : ''}</small></span></span><span class="bs-row-right"><b>${M(b.value)}</b><small class="bs-row-sub ${b.monthly >= 0 ? '' : ''}">${b.monthly >= 0 ? '+' : ''}${M(b.monthly)}/bln</small></span></div>`).join('')
        : `<div class="empty">Belum memiliki bisnis. Modal awal bukan hadiah — kumpulkan dari gaji karier, tabungan, atau pinjaman sebelum membuka usaha.</div>`}
    </section>`;
  };

  /* ---------- render: aktivitas terbaru ---------- */
  const activitySectionHTML = () => {
    const rows = recentActivity(6);
    return `<section class="card bs-sec"><div class="section-head"><h3 class="section-title">Aktivitas Terbaru</h3></div>
      ${rows.length ? rows.map(a => `<div class="bs-act-row"><span class="bs-act-ic ${a.tone}">${ic(a.ic, 16)}</span><div class="bs-act-main"><b>${E(a.title)}</b>${a.sub ? `<small>${E(a.sub)}</small>` : ''}</div>${a.when ? `<span class="bs-act-when">${E(a.when)}</span>` : ''}</div>`).join('')
        : `<div class="empty">Belum ada aktivitas. Jalankan Simulate Day atau mulai karier untuk melihat aktivitas di sini.</div>`}
    </section>`;
  };

  /* ---------- empty state: pemain benar-benar baru (cash Rp0, belum ada apa-apa) ---------- */
  const emptyStateHTML = () => `<div class="bs-page-wrap bs-empty-wrap"><div class="bs-empty-hero">
    <div class="bs-empty-mark">${ic('chart', 24)}</div>
    <h2>Mulai dari Rp0</h2>
    <p>Belum ada pekerjaan, bisnis, atau investasi. Bangun kondisi ekonomimu bertahap: cari pekerjaan untuk penghasilan pertama, atau kumpulkan modal sebelum membuka bisnis.</p>
    <div class="bs-empty-stats">
      <div><b>${M(Math.max(0, S().cash || 0))}</b><small>Saldo</small></div>
      <div><b>Rp0</b><small>Pendapatan Harian</small></div>
      <div><b>Rp0</b><small>P/L</small></div>
    </div>
    <div class="bs-empty-activity">${ic('bell', 14)} Aktivitas terbaru: Mulai Game — Hari ${day()}</div>
    <div class="bs-empty-actions"><button class="btn primary" onclick="App.go('career')">${ic('briefcase', 15)} Cari Pekerjaan</button><button class="btn" onclick="App.openCreateBusiness && App.openCreateBusiness()">${ic('store', 15)} Buka Bisnis</button></div>
  </div></div>`;

  /* ---------- pasang ke App.dashboard (membungkus versi sebelumnya, tidak menghapusnya) ---------- */
  const dash2 = App.dashboard;
  App.dashboard = () => {
    try {
      if (isNewPlayer()) return emptyStateHTML();
      return statusStripHTML() + dash2() + investSectionHTML() + businessSectionHTML() + activitySectionHTML();
    } catch (e) { return dash2(); }
  };

  if (App.state) App.render();
})();
