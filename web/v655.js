/* BizSim 6.5.5 — additive layer. Loaded after app.js; wraps App.* and never edits v6.1.1 code. */
(() => {
  if (typeof App === 'undefined') return;
  const P = {
    store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6',
    laundry: 'M5 3h14v18H5zM5 8h14M12 18a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7',
    online: 'M3 4h3l2 11h10l2-8H7M10 20h.01M17 20h.01',
    coffee: 'M5 8h11v6a5 5 0 0 1-5 5h-1a5 5 0 0 1-5-5zM16 9h2a2 2 0 0 1 0 5h-2M8 3v2M12 3v2',
    scissors: 'M6 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8.5 7.5 20 18M8.5 16.5 20 6',
    shirt: 'M9 3 3 6l2 4 3-1v12h8V9l3 1 2-4-6-3a3 3 0 0 1-6 0z',
    wrench: 'M4 20l8-8M14 4a4 4 0 0 0-4 5L4 15v5h5l6-6a4 4 0 0 0 5-4l-3 3-3-1-1-3z',
    fork: 'M6 3v8M9 3v8M6 7h3M7.5 11v10M17 3c-2 2-3 5-3 8h3v10',
    cart: 'M3 4h2l2 12h11l2-8H6M9 20h.01M17 20h.01',
    monitor: 'M3 4h18v12H3zM8 20h8M12 16v4',
    truck: 'M2 6h11v10H2zM13 9h4l4 3v4h-8M6 19h.01M17 19h.01',
    factory: 'M3 21V10l6 4V10l6 4V6h3v15zM7 17h2m3 0h2',
    note: 'M10 18a3 3 0 1 1-3-3 3 3 0 0 1 3 3V4c1 3 3 4 6 4',
    camera: 'M3 7h12v10H3zM15 11l6-3v8l-6-3',
    cloud: 'M7 18a4 4 0 0 1-.5-8A5.5 5.5 0 0 1 17 8.5 4 4 0 0 1 17 18z',
    cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
    dumbbell: 'M6 6v12M18 6v12M3 9v6M21 9v6M6 12h12',
    star: 'M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z',
    mega: 'M3 11v3h4l8 4V7L7 11zM18 9a4 4 0 0 1 0 6',
    bolt: 'M13 2 4 14h7l-1 8 9-12h-7z',
    insta: 'M4 4h16v16H4zM12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8M17 7h.01',
    mic: 'M12 3a3 3 0 0 0-3 3v6a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3M6 11a6 6 0 0 0 12 0M12 17v4',
    live: 'M3 5h18v11H9l-4 4v-4H3z',
    clock: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2',
    video: 'M3 6h12v12H3zM15 10l6-3v10l-6-3',
    up: 'M5 15l7-7 7 7', down: 'M5 9l7 7 7-7'
  };
  const BIZ = { warung: 'store', laundry: 'laundry', 'online-store': 'online', 'coffee-shop': 'coffee', barbershop: 'scissors', clothing: 'shirt', workshop: 'wrench', restaurant: 'fork', minimarket: 'cart', 'digital-agency': 'monitor', logistics: 'truck', manufacturing: 'factory', 'tiktok-shop': 'note', 'content-studio': 'camera', 'cloud-kitchen': 'cloud' };
  const TRK = { capacity: 'box', quality: 'star', marketing: 'mega', efficiency: 'bolt', safety: 'shield' };
  const PLT = { tiktok: 'note', instagram: 'insta', podcast: 'mic', twitch: 'live' };
  const SKILL_ICON = { training: 'dumbbell', education: 'cap' };
  const svg = (d, s = 18) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const i0 = App.icon;
  App.icon = (n, s = 18) => P[n] ? svg(P[n], s) : i0(n, s);
  const ic = (n, s) => App.icon(n, s);
  const v = () => App.state?.state?.v655 || null;
  const cat = () => App.v655cat || { upgrades: {}, training: [], education: [], platforms: {}, gear: [], instruments: {} };
  const post = async (path, body) => { const { r, d } = await App.requestJson(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); return { ok: r.ok, d }; };
  const pct = (a, b) => Math.max(0, Math.min(100, b ? a / b * 100 : 0));
  const sgn = n => (n >= 0 ? '+' : '') + n.toFixed(1) + '%';

  /* ---------- reusable icon progress bar ---------- */
  const bar = ({ icon, title, sub, value, right, tone = '' }) => `<div class="v655-prog ${tone}"><span class="v655-prog-ic">${ic(icon, 18)}</span><div class="v655-prog-main"><div class="v655-prog-top"><b>${esc(title)}</b><span>${right || ''}</span></div><div class="progress"><i style="width:${value}%"></i></div><small>${sub || ''}</small></div></div>`;
  const programBar = p => { const day = App.state.state.day, left = Math.max(0, p.endDay - day); return bar({ icon: SKILL_ICON[p.kind], title: p.name, value: Math.round(pct(day - p.startDay, p.endDay - p.startDay)), right: left ? `${left} hari lagi` : 'Selesai', sub: `${p.kind === 'training' ? 'Training' : 'Pendidikan'} · hari ${p.startDay} → ${p.endDay}` }); };

  /* ---------- catalogs ---------- */
  const loadCat0 = App.loadCatalogs;
  App.loadCatalogs = async () => { await loadCat0(); try { const { r, d } = await App.requestJson('/api/v655/catalog'); if (r.ok) App.v655cat = d; } catch (e) { console.error(e); } };

  /* ---------- training & education (replaces the stub modals) ---------- */
  const programModal = kind => {
    const list = cat()[kind] || [], pr = v()?.programs || {}, act = pr[kind], s = App.state.state;
    const rows = list.map(x => { const no = act || s.cash < x.cost || (x.min && (s.skills[x.skill] || 0) < x.min); return `<div class="list-item"><div class="v655-row-ic">${ic(SKILL_ICON[kind], 18)}</div><div style="flex:1"><div class="title">${esc(x.name)}</div><div class="meta">${App.money(x.cost)} · ${x.days} hari · ${Object.entries(x.gains).map(([k, g]) => `${esc(k)} +${g}`).join(', ')}${x.min ? ` · syarat ${esc(x.skill)} ${x.min}+` : ''}</div></div><button class="btn accent" ${no ? 'disabled' : ''} onclick="App.v655StartProgram('${x.id}')">Mulai</button></div>`; }).join('');
    App.modal(kind === 'training' ? 'Training Program' : 'Education', `${act ? programBar(act) : '<div class="notice">Satu program per jenis berjalan sekaligus. Progres bertambah setiap hari simulasi.</div>'}<div class="list" style="margin-top:14px">${rows || '<div class="empty">Katalog belum dimuat.</div>'}</div>`);
  };
  App.openSkillTraining = () => programModal('training');
  App.openEducation = () => programModal('education');
  App.v655StartProgram = async id => { const { ok, d } = await post('/api/v655/program/start', { id }); if (!ok) return App.toast('Program gagal', d.error || '', 'danger'); closeModal(); App.toast('Program dimulai', `${d.program.name} selesai pada hari ${d.program.endDay}.`, 'success'); await App.refresh(); };

  const career0 = App.career;
  App.career = () => {
    const pr = v()?.programs || {}, list = [pr.training, pr.education].filter(Boolean);
    const panel = `<div class="card v655-card"><div class="section-head"><div><h3 class="section-title">Training & Education</h3><span class="small muted">Progres berjalan menurut hari simulasi</span></div><div class="actions"><button class="btn" onclick="App.openSkillTraining()">Training</button><button class="btn" onclick="App.openEducation()">Education</button></div></div>${list.map(programBar).join('') || '<div class="empty">Belum ada program berjalan.</div>'}</div>`;
    return panel + career0();
  };

  /* ---------- business: upgrades section ---------- */
  const lvlPips = n => `<span class="v655-pips">${Array.from({ length: (cat().upgradeMax || 5) }, (_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  const upgradeSection = () => {
    const biz = App.state.businesses || []; if (!biz.length) return '';
    const day = App.state.state.day;
    return `<div class="section-head" style="margin-top:24px"><div><h3 class="section-title">Business Upgrades</h3><span class="small muted">Dibayar dari cash bisnis. Selesai menurut hari simulasi.</span></div></div><div class="grid two v655-up-grid">${biz.map(b => {
      const tracks = cat().upgrades[b.catalogId] || [], st = b.v655 || { levels: {}, active: null }, act = st.active;
      return `<article class="card v655-card"><div class="v655-biz-head"><span class="v655-biz-ic">${ic(BIZ[b.catalogId] || 'store', 22)}</span><div><b>${esc(b.name)}</b><span class="small muted">Cash bisnis ${App.money(b.cash)}</span></div></div>${act ? bar({ icon: TRK[act.track], title: `${act.label} → level ${act.toLevel}`, value: Math.round(pct(day - act.startDay, act.endDay - act.startDay)), right: `${Math.max(0, act.endDay - day)} hari lagi`, sub: 'Upgrade berjalan' }) : ''}${tracks.map(t => { const lv = st.levels?.[t.track] || 0, max = lv >= (cat().upgradeMax || 5), cost = t.costs[lv]; const off = !!act || max || b.cash < cost; return `<div class="v655-up-row"><span class="v655-up-ic">${ic(TRK[t.track], 17)}</span><div class="v655-up-main"><b>${esc(t.label)}</b><small>${esc(t.effect)}</small>${lvlPips(lv)}</div><button class="btn ${max ? '' : 'accent'}" ${off ? 'disabled' : ''} onclick="App.v655Upgrade('${b.id}','${t.track}')">${max ? 'Max' : `${App.money(cost)}<br><small>${t.days[lv]} hari</small>`}</button></div>`; }).join('')}</article>`;
    }).join('')}</div>`;
  };
  const business0 = App.business;
  App.business = () => business0() + upgradeSection();
  App.v655Upgrade = async (businessId, track) => { const { ok, d } = await post('/api/v655/upgrade/start', { businessId, track }); if (!ok) return App.toast('Upgrade gagal', d.error || '', 'danger'); App.toast('Upgrade dimulai', `${d.upgrade.label} selesai hari ${d.upgrade.endDay}.`, 'success'); await App.refresh(); };

  /* ---------- creator studio (TikTok, Instagram, Podcast, Live) ---------- */
  App.creatorPage = () => {
    const pl = v()?.platforms || {}, day = App.state.state.day, defs = cat().platforms || {}, gear = cat().gear || [];
    const cards = Object.entries(defs).map(([k, d]) => {
      const x = pl[k];
      if (!x) return `<article class="card v655-card"><div class="v655-biz-head"><span class="v655-biz-ic">${ic(PLT[k], 22)}</span><div><b>${esc(d.name)}</b><span class="small muted">Syarat monetisasi ${d.need.toLocaleString('id-ID')} ${d.unit}, 20 unggahan</span></div></div><p class="small muted">${esc(d.desc)}</p><button class="btn primary" style="width:100%" onclick="App.v655CreatePlatform('${k}')">Buat Akun</button></article>`;
      const next = gear[(x.gear || 0) + 1];
      return `<article class="card v655-card"><div class="v655-biz-head"><span class="v655-biz-ic">${ic(PLT[k], 22)}</span><div><b>${esc(x.name)}</b><span class="badge ${x.monetized ? 'success' : 'warn'}">${x.monetized ? 'Monetized' : 'Membangun'}</span></div></div><div class="detail-grid"><div class="detail"><span>${esc(d.unit)}</span><b>${Math.round(x.followers).toLocaleString('id-ID')}</b></div><div class="detail"><span>Views</span><b>${Math.round(x.views).toLocaleString('id-ID')}</b></div><div class="detail"><span>Unggahan</span><b>${x.posts}</b></div><div class="detail"><span>Pendapatan</span><b>${App.money(x.income)}</b></div></div>${bar({ icon: PLT[k], title: 'Menuju monetisasi', value: Math.round(Math.min(pct(x.followers, d.need), pct(x.posts, 20))), right: `${Math.round(pct(x.followers, d.need))}%`, sub: `${d.need.toLocaleString('id-ID')} ${d.unit} dan ${x.posts}/20 unggahan` })}<div class="small muted" style="margin:8px 0">Peralatan: ${esc(gear[x.gear || 0]?.n || '')}${x.trend > 5 ? ' · sedang tren' : ''}</div><div class="actions"><button class="btn accent" ${x.lastPostDay === day ? 'disabled' : ''} onclick="App.v655Post('${k}')">${x.lastPostDay === day ? 'Sudah unggah hari ini' : `Unggah${d.postCost ? ' · ' + App.money(d.postCost) : ''}`}</button><button class="btn" ${next ? '' : 'disabled'} onclick="App.v655Gear('${k}')">${next ? `Upgrade alat · ${App.money(next.cost)}` : 'Alat maksimum'}</button></div></article>`;
    }).join('');
    return `<div class="page-head"><div><h1>Creator Studio</h1><p>Penghasilan tambahan di luar gaji dan bisnis. Kualitas konten dipengaruhi skill design, communication, dan marketing.</p></div><button class="btn" onclick="App.openYoutubeCareer()">Kelola YouTube</button></div><div class="grid two v655-up-grid">${cards}</div>`;
  };
  App.v655CreatePlatform = async platform => { const { ok, d } = await post('/api/v655/platform/create', { platform }); if (!ok) return App.toast('Gagal', d.error || '', 'danger'); await App.refresh(); };
  App.v655Post = async platform => { const { ok, d } = await post('/api/v655/platform/post', { platform }); if (!ok) return App.toast('Unggah gagal', d.error || '', 'danger'); App.toast(d.viral ? 'Konten viral' : 'Konten diunggah', `+${d.views.toLocaleString('id-ID')} views · +${d.followers.toLocaleString('id-ID')} pengikut${d.monetized ? ' · monetized' : ''}`, d.viral ? 'success' : 'info'); await App.refresh(); };
  App.v655Gear = async platform => { const { ok, d } = await post('/api/v655/platform/gear', { platform }); if (!ok) return App.toast('Gagal', d.error || '', 'danger'); await App.refresh(); };
  if (!App.navItems.some(x => x[0] === 'investments')) App.navItems.splice(6, 0, ['investments', 'Investments', 'chart']);
  if (!App.navItems.some(x => x[0] === 'creator')) App.navItems.splice(6, 0, ['creator', 'Creator Studio', 'video']);
  const page0 = App.page;
  App.page = () => (App.view === 'creator' ? App.creatorPage() : page0());

  /* ---------- investments: event-driven NAV, fees, income, settlement ---------- */
  const macroPanel = m => `<div class="v655-macro">${[['Suku bunga', m.rate.toFixed(2) + '%'], ['Inflasi', m.inflation.toFixed(1) + '%'], ['Pertumbuhan', m.growth.toFixed(1) + '%'], ['USD/IDR', Math.round(m.usdidr).toLocaleString('id-ID')]].map(([a, b]) => `<div><span>${a}</span><b>${b}</b></div>`).join('')}</div>`;
  const newsFeed = (n, k = 5) => (n || []).slice(0, k).map(x => `<div class="v655-news ${x.tone}"><span class="v655-news-ic">${ic(x.tone === 'up' ? 'up' : x.tone === 'down' ? 'down' : 'clock', 16)}</span><div><b>${esc(x.title)}</b><p>${esc(x.body)}</p><div class="v655-chips">${(x.impact || []).map(i => `<span class="${i.pct >= 0 ? 'pos' : 'neg'}">${esc(i.asset)} ${sgn(i.pct)}</span>`).join('')}<span>Hari ${x.day}</span></div></div></div>`).join('') || '<div class="empty">Belum ada berita pasar. Jalankan hari simulasi.</div>';
  const nav = (V, id) => V.nav[id], chg = (V, id) => { const a = V.series[id] || []; const b = a[Math.max(0, a.length - 31)] || a[0] || 1; return ((a[a.length - 1] || b) / b - 1) * 100; };
  App.investments = () => {
    const V = v(), s = App.state.state, inv = s.investments || [], I = cat().instruments || {};
    if (!V) return '<div class="empty">Memuat data investasi…</div>';
    const cards = App.investmentCatalog.map(x => { const p = I[x.id] || {}, c = chg(V, x.id); return `<article class="card investment-card">${App.image(`investments/${x.image}`, x.name)}<div class="section-head" style="margin-top:12px"><div><h3 class="section-title">${esc(x.name)}</h3><span class="small muted">${esc(x.category)} · risiko ${esc(p.risk || '-')}</span></div><span class="market-change ${c >= 0 ? 'up' : 'down'}">${sgn(c)} / 30h</span></div>${App.marketSpark((V.series[x.id] || []).slice(-30))}<div class="metric-row"><span>NAV</span><b>${App.money(nav(V, x.id))}</b></div><div class="metric-row"><span>Biaya beli / jual</span><b>${(p.buyFee * 100).toFixed(2)}% / ${(p.sellFee * 100).toFixed(2)}%</b></div><div class="metric-row"><span>Arus kas</span><b>${esc(p.kind || '-')}</b></div><button class="btn primary" style="width:100%;margin-top:10px" onclick="App.openInvestment('${x.id}')">Invest · min ${App.money(x.minimum)}</button></article>`; }).join('');
    const hold = inv.map(x => { const pl = x.currentValue - x.invested, pc = x.invested ? pl / x.invested * 100 : 0, p = I[x.assetId] || {}; return `<div class="list-item"><div><div class="title">${esc(x.name)}</div><div class="meta">Modal ${App.money(x.invested)} · sejak hari ${x.purchasedDay}${x.v655?.income ? ' · hasil diterima ' + App.money(x.v655.income) : ''}${p.settle ? ' · cair ' + p.settle + ' hari' : ''}</div></div><div style="text-align:right"><b class="${pl >= 0 ? 'positive' : 'negative'}">${App.money(x.currentValue)}</b><div class="small ${pl >= 0 ? 'positive' : 'negative'}">${pl >= 0 ? '+' : ''}${App.money(pl)} (${sgn(pc)})</div><button class="btn" style="margin-top:6px" onclick="App.sellInvestment('${x.id}')">Jual</button></div></div>`; }).join('') || '<div class="empty">Belum ada investasi.</div>';
    const pend = (V.pendingCash || []).map(x => `<div class="metric-row"><span>${esc(x.label)} · cair hari ${x.dueDay}</span><b>${App.money(x.amount)}</b></div>`).join('');
    return `<div class="page-head"><div><h1>Investments</h1><p>Simulasi investasi jangka panjang. Nilai bergerak mengikuti tren, volatilitas, dan event ekonomi di dalam game. Bukan saran keuangan nyata.</p></div><span class="badge blue">SIMULATED</span></div><div class="card v655-card"><div class="section-head"><h3 class="section-title">Kondisi Makro</h3></div>${macroPanel(V.macro)}</div><div class="grid three" style="margin-top:14px">${cards}</div><div class="grid two" style="margin-top:16px"><div class="card"><div class="section-head"><h3 class="section-title">My Investments</h3></div>${hold}${pend ? `<div style="margin-top:12px"><div class="small muted">Dana menunggu settlement</div>${pend}</div>` : ''}</div><div class="card"><div class="section-head"><h3 class="section-title">Berita Pasar</h3><span class="small muted">Memengaruhi harga</span></div>${newsFeed(V.news, 6)}</div></div>`;
  };
  App.openInvestment = id => {
    const x = App.investmentCatalog.find(q => q.id === id), p = cat().instruments[id] || {}, V = v(); if (!x) return;
    App.modal(x.name, `${App.image(`investments/${x.image}`, x.name)}<p class="small muted">${esc(x.description)}</p><div class="detail-grid"><div class="detail"><span>NAV saat ini</span><b>${App.money(V.nav[id])}</b></div><div class="detail"><span>Biaya beli</span><b>${(p.buyFee * 100).toFixed(2)}%</b></div></div><div class="field" style="margin-top:12px"><label>Nominal investasi</label><input id="inv-amount" type="number" min="${x.minimum}" value="${x.minimum}"></div>`, `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="App.buyInvestment('${x.id}')">Invest</button>`);
  };
  App.buyInvestment = async id => { const amount = Number(document.getElementById('inv-amount').value); const { ok, d } = await post('/api/v655/invest/buy', { assetId: id, amount }); if (!ok) return App.toast('Investasi gagal', d.error || '', 'danger'); closeModal(); App.toast('Investasi dibeli', `Biaya ${App.money(d.fee)}.`, 'success'); await App.refresh(); };
  App.sellInvestment = id => {
    const h = (App.state.state.investments || []).find(q => String(q.id) === String(id)); if (!h) return; const p = cat().instruments[h.assetId] || {};
    App.modal('Jual investasi', `<div class="detail-grid"><div class="detail"><span>Nilai sekarang</span><b>${App.money(h.currentValue)}</b></div><div class="detail"><span>Biaya jual</span><b>${(p.sellFee * 100).toFixed(2)}%</b></div><div class="detail"><span>Pencairan</span><b>${p.settle ? p.settle + ' hari' : 'Langsung'}</b></div></div><div class="field" style="margin-top:12px"><label>Porsi dijual</label><select id="sell-pct"><option value="25">25%</option><option value="50">50%</option><option value="100" selected>100%</option></select></div>`, `<button class="btn" onclick="closeModal()">Cancel</button><button class="btn primary" onclick="App.v655Sell('${id}')">Jual</button>`);
  };
  App.v655Sell = async id => { const percent = Number(document.getElementById('sell-pct').value); const { ok, d } = await post('/api/v655/invest/sell', { id, percent }); if (!ok) return App.toast('Penjualan gagal', d.error || '', 'danger'); closeModal(); App.toast('Investasi dijual', `Bersih ${App.money(d.net)} · ${d.settleDays ? 'cair ' + d.settleDays + ' hari' : 'masuk cash'}.`, 'success'); await App.refresh(); };

  /* asset market: show the same in-game news that moves BTC/BBCA/TLKM */
  const market0 = App.marketPage;
  App.marketPage = () => market0() + `<div class="card" style="margin-top:16px"><div class="section-head"><h3 class="section-title">Berita Pasar</h3><span class="small muted">Event game memengaruhi harga</span></div>${newsFeed(v()?.news, 4)}</div>`;

  /* ---------- post-render: business icons on cards ---------- */
  const render0 = App.render;
  App.render = () => {
    render0();
    try {
      const cs = App.businessCatalog || [];
      document.querySelectorAll('.business-card').forEach(el => { const n = el.querySelector('h3')?.textContent, c = cs.find(x => x.name === n); if (c && !el.querySelector('.v655-biz-ic')) el.querySelector('h3').insertAdjacentHTML('beforebegin', `<span class="v655-biz-ic sm">${ic(BIZ[c.id] || 'store', 16)}</span>`); });
      const own = App.state?.businesses || [];
      document.querySelectorAll('.business-owned').forEach((el, i) => { const b = own[i]; if (b && !el.querySelector('.v655-biz-ic')) el.querySelector('h3')?.insertAdjacentHTML('beforebegin', `<span class="v655-biz-ic sm">${ic(BIZ[b.catalogId] || 'store', 16)}</span>`); });
      const pg = document.querySelector('.page-head p'); if (pg && /^12 bisnis/.test(pg.textContent)) pg.textContent = pg.textContent.replace('12 bisnis', '15 bisnis');
      const f = document.querySelector('.sidebar-footer'); if (f) f.innerHTML = f.innerHTML.replace(/Build: [\d.]+/, 'Build: 7.3.0');
      const br = document.querySelector('.brand small'); if (br) br.textContent = 'v7.3.0';
    } catch (e) { console.error(e); }
  };
  if (App.state) App.loadCatalogs().then(() => App.render());
})();
