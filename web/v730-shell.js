/* BizSim 7.3.0 shell: per-page masthead (replaces the identical hero on every page), calmer toasts, page transitions, FAB, animated numbers. Additive. */
(() => {
  if (typeof App === 'undefined' || !App.v700) return;
  const { M, ic, E, lineSvg, cls, pct } = App.v700;
  const S = () => (App.state && App.state.state) || {}, V = () => S().v700 || {}, X = () => S().v720 || {}, BZ = () => (App.state && App.state.businesses) || [];
  const day = () => S().day || 1, sum = (a, f) => a.reduce((t, x) => t + (Number(f(x)) || 0), 0);
  const netWorth = () => { const n = (X().nw || []).slice(-1)[0]; return n ? n.cash + n.inv + n.biz : Math.round(S().cash || 0); };
  const skillAvg = () => { const k = Object.values(S().skills || {}); return k.length ? Math.round(sum(k, x => x) / k.length) : 0; };
  const followers = () => Math.round(sum(Object.values((S().v655 || {}).platforms || {}), p => p.followers));
  const newsCount = () => (V().news || []).filter(n => n.day >= day() - 7).length;
  const incidents = () => (S().incidents || []).filter(i => i.status === 'active' || i.status === 'recovery').length;
  const unreal = () => Object.entries(V().holdings || {}).reduce((a, [t, h]) => a + h.shares * ((V().stocks[t] || {}).price || 0) - h.shares * h.cost, 0);
  const tasks = () => (S().v730 || {}).tasks || [];
  const T = {
    career: { k: 'Karier', t: 'Bangun jalur karier dari nol', a: 'f-career', c: 'navy', s: () => [['Posisi', (S().career || {}).position || 'Belum bekerja'], ['Gaji bulanan', M((S().career || {}).salary || 0)], ['Skill rata-rata', skillAvg()]] },
    learn: { k: 'Pendidikan', t: 'Belajar bertahap, naik level', a: 'job-support', c: 'teal', s: () => [['Pelajaran berjalan', `${(X().lessons || []).length}/2`], ['Sertifikat', Object.values(X().courses || {}).filter(c => c.cert).length], ['Skill rata-rata', skillAvg()]] },
    business: { k: 'Bisnis', t: 'Kelola usaha dan ekspansi', a: 'warung', c: 'gold', s: () => [['Jumlah bisnis', BZ().length], ['Nilai bisnis', M(sum(BZ(), b => b.value))], ['Kas bisnis', M(sum(BZ(), b => b.cash))]] },
    operations: { k: 'Operasional', t: 'Risiko, insiden, dan perlindungan', a: 'f-operations', c: 'burgundy', s: () => [['Insiden aktif', incidents()], ['Bisnis berjalan', BZ().length], ['Asuransi usaha', (V().inv || []).some(i => i.itemId === 'ins-biz' && i.expires > day()) ? 'Aktif' : 'Belum ada']] },
    finance: { k: 'Keuangan', t: 'Arus kas dan kekayaan bersih', a: 'job-finance', c: 'teal', s: () => [['Cash', M(S().cash || 0)], ['Kekayaan bersih', M(netWorth())], ['Credit score', S().creditScore || (App.state.credit && App.state.credit.score) || 650]] },
    invest: { k: 'Investasi', t: 'Saham, trading, dan aset nyata', a: 'f-investments', c: 'navy', s: () => { const n = (X().nw || []).slice(-1)[0]; return [['Total investasi', M(n ? n.inv : 0)], ['Untung/rugi saham', M(unreal())], ['Realized P/L', M(V().realized || 0)]]; } },
    market: { k: 'Aset Pasar', t: 'Pergerakan harga aset', a: 'f-market', c: 'navy', s: () => [['Berita 7 hari', newsCount()], ['Hari simulasi', day()], ['Cash', M(S().cash || 0)]] },
    portfolio: { k: 'Portofolio', t: 'Alokasi, kinerja, dan risiko', a: 'i-stocks', c: 'teal', s: () => { const n = (X().nw || []).slice(-1)[0] || { cash: 0, inv: 0, biz: 0 }; return [['Kekayaan bersih', M(n.cash + n.inv + n.biz)], ['Investasi', M(n.inv)], ['Cash', M(n.cash)]]; } },
    people: { k: 'Tim', t: 'Karyawan, rekrutmen, dan pelatihan', a: 'f-people', c: 'burgundy', s: () => { const e = (S().employees || []).filter(x => x.status === 'active'); return [['Karyawan aktif', e.length], ['Pelamar', ((V().hr || {}).cand || []).length], ['Moral rata-rata', e.length ? Math.round(sum(e, x => x.morale) / e.length) + '%' : '-']]; } },
    suppliers: { k: 'Pemasok', t: 'Rantai pasok dan harga bahan', a: 'job-procurement', c: 'gold', s: () => [['Bisnis', BZ().length], ['Kas bisnis', M(sum(BZ(), b => b.cash))], ['Hari', day()]] },
    events: { k: 'Keputusan', t: 'Event yang menuntut pilihan', a: 'f-events', c: 'burgundy', s: () => [['Insiden aktif', incidents()], ['Berita 7 hari', newsCount()], ['Hari', day()]] },
    calendar: { k: 'Jadwal & Tugas', t: 'Rencana dan target Anda', a: 'job-ops', c: 'slate', s: () => { const t = tasks(), d = t.filter(x => x.status === 'done').length; return [['Tugas selesai', `${d}/${t.length}`], ['Sedang dikerjakan', t.filter(x => x.status === 'doing').length], ['Hari', day()]]; } },
    shop: { k: 'Toko', t: 'Perlengkapan, gaya hidup, koleksi', a: 'online-store', c: 'gold', s: () => [['Cash', M(S().cash || 0)], ['Barang dimiliki', (V().inv || []).length], ['Bonus interview', '+' + ((V().bonus || {}).interview || 0)]] },
    news: { k: 'Berita', t: 'Kabar yang menggerakkan harga', a: 'f-events', c: 'slate', s: () => [['Berita 7 hari', newsCount()], ['Breaking', (V().news || []).filter(n => n.breaking && n.day >= day() - 3).length], ['Hari', day()]] },
    hub: { k: 'Events Hub', t: 'Lelang dan insiden bisnis', a: 'f-events', c: 'burgundy', s: () => [['Lelang berjalan', (X().auctions || []).filter(a => !a.done).length], ['Insiden aktif', incidents()], ['Cash', M(S().cash || 0)]] },
    creator: { k: 'Kreator', t: 'Audiens, konten, dan pendapatan', a: 'content-studio', c: 'teal', s: () => [['Total pengikut', followers().toLocaleString('id-ID')], ['Platform', Object.keys((S().v655 || {}).platforms || {}).length], ['Pendapatan 30 hari', M(sum(Object.values(X().crInc || {}), a => sum(a, x => x)))]] },
    profile: { k: 'Profil', t: 'Identitas dan pengaturan akun', a: 'f-people', c: 'slate', s: () => [['Hari simulasi', day()], ['Reputasi', Math.round(S().reputation || 0)], ['Posisi', (S().career || {}).position || 'Belum bekerja']] }
  };
  const num = v => (typeof v === 'string' && /^Rp[\d.]+$/.test(v) ? Number(v.replace(/[Rp.]/g, '')) : null);
  const tile = x => { const n = num(x[1]); return `<div class="mast-tile"><small>${E(x[0])}</small><b ${n != null ? `data-count="${n}"` : ''}>${E(x[1])}</b></div>`; };
  App.v6Visual = function () {
    const view = App.view || 'dashboard', t0 = (view === 'dashboard') ? null : (T[view] || T[view === 'invest' ? 'invest' : 'profile']);
    if (view === 'dashboard') {
      const hr = new Date().getHours(), gr = hr < 11 ? 'Selamat pagi' : hr < 15 ? 'Selamat siang' : hr < 19 ? 'Selamat sore' : 'Selamat malam', nw = netWorth(), ser = (X().nw || []).slice(-14).map(q => q.cash + q.inv + q.biz), act = (X().lessons || []).length;
      return `<section class="mast mast-dash"><div class="mast-person">${App.playerPortrait ? App.playerPortrait(76) : ''}<div><small>${gr},</small><h2>${E((App.user || {}).name || 'Pemain')}</h2><span class="mast-chip">Hari ${day()} · ${E((S().career || {}).position || 'Belum bekerja')}</span></div></div><div class="mast-worth"><small>Kekayaan bersih</small><b data-count="${nw}">${M(nw)}</b>${ser.length > 2 ? `<div class="mast-spark">${lineSvg(ser, { w: 220, h: 48, color: '#e6cf9b' })}</div>` : ''}</div><div class="mast-actions"><button class="mast-btn gold" onclick="App.simDay()">${ic('refresh', 16)} Simulate Day</button><button class="mast-btn" onclick="App.go('career')">${ic('briefcase', 16)} Karier</button><button class="mast-btn" onclick="App.go('invest')">${ic('chart', 16)} Investasi</button>${act ? `<button class="mast-btn" onclick="App.go('learn')">${ic('cap', 16)} ${act} belajar</button>` : ''}</div></section>`;
    }
    const t = t0, art = (App.v730 && App.v730.art) ? App.v730.art(t.a) : '';
    return `<section class="mast mast-${t.c}"><div class="mast-l"><span class="mast-kick">${ic(({ career: 'briefcase', learn: 'cap', business: 'store', operations: 'shield', finance: 'wallet', invest: 'chart', market: 'trend', portfolio: 'pie', people: 'users', suppliers: 'supply', events: 'compass', calendar: 'calendar', shop: 'store', news: 'news', hub: 'gavel', creator: 'video', profile: 'user' })[view] || 'star', 15)} ${E(t.k)}</span><h2 class="mast-title">${E(t.t)}</h2><div class="mast-stats">${t.s().map(tile).join('')}</div></div><div class="mast-art">${art}</div></section>`;
  };

  /* ---------- toasts: de-duplicated, max 3, readable, never over the bottom bar ---------- */
  const toast0 = App.toast;
  App.toast = (title, msg, type = 'info') => {
    let st = document.querySelector('.toast-stack'); if (!st) { st = document.createElement('div'); st.className = 'toast-stack'; document.body.appendChild(st); }
    const sig = title + '|' + msg, old = Array.from(st.children || []).find(x => x.dataset && x.dataset.sig === sig);
    if (old) { clearTimeout(old._t); old.classList.remove('bump'); void old.offsetWidth; old.classList.add('bump'); old._t = setTimeout(() => old.remove(), 3200); return; }
    while (st.children && st.children.length >= 3) st.firstChild.remove();
    const el = document.createElement('div'); el.className = `toast t-${type}`; el.dataset.sig = sig;
    el.innerHTML = `<span class="toast-ic">${ic(type === 'success' ? 'check' : type === 'danger' ? 'warn' : type === 'warning' ? 'warn' : 'bell', 16)}</span><div><strong>${E(title)}</strong><p>${E(msg)}</p></div><i class="toast-bar"></i>`;
    st.appendChild(el); el._t = setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 260); }, 3200);
  };

  /* ---------- animated numbers ---------- */
  const prevN = {};
  const animate = (el, to, key, instant) => { const from = prevN[key] != null ? prevN[key] : (instant ? to : 0); prevN[key] = to; if (instant || from === to) { el.textContent = M(to); return; } const t0 = performance.now(), dur = 700; const tick = now => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = M(Math.round(from + (to - from) * e)); if (p < 1) requestAnimationFrame(tick); }; requestAnimationFrame(tick); };
  App.v730 = Object.assign(App.v730 || {}, { animate, netWorth, T });

  /* ---------- post-render: topbar text, transitions, counters, FAB ---------- */
  let lastView = null;
  const r5 = App.render;
  App.render = () => {
    r5();
    try {
      const changed = lastView !== App.view; lastView = App.view;
      document.querySelectorAll('.topbar span, .topbar small, .topbar p, .topbar div').forEach(el => { if (el.children && el.children.length === 0 && /^BizSim [\d.]+ \//.test(el.textContent || '')) el.textContent = 'BizSim · ' + (el.textContent.split('/')[1] || '').trim(); });
      const sf = document.querySelector('.sidebar-footer'); if (sf && !sf.dataset.v730) { sf.dataset.v730 = 1; sf.innerHTML = 'Mode lokal: data tersimpan di perangkat ini<br>Build: 7.3.0'; }
      const bs = document.querySelector('.sidebar .brand small'); if (bs) bs.textContent = 'v7.3.0';
      const c = document.querySelector('.content'); if (c && changed) { c.classList.remove('pg-enter'); void c.offsetWidth; c.classList.add('pg-enter'); }
      document.querySelectorAll('[data-count]').forEach((el, i) => animate(el, Number(el.dataset.count), (App.view || '') + ':' + i, !changed));
      document.querySelectorAll('p, span, div, small').forEach(el => { if (el.children && el.children.length === 0 && /^12 pilihan dari usaha kecil/.test(el.textContent || '')) el.textContent = el.textContent.replace('12 pilihan', '15 pilihan'); });
      if (!document.querySelector('.fab')) { const b = document.createElement('button'); b.className = 'fab'; b.setAttribute('aria-label', 'Simulate Day'); b.innerHTML = ic('refresh', 22); b.onclick = async () => { if (b.classList.contains('spin')) return; b.classList.add('spin'); try { await App.simDay(); } finally { setTimeout(() => b.classList.remove('spin'), 400); } }; document.body.appendChild(b); }
    } catch (e) { }
  };
  if (App.state) App.render();
})();
