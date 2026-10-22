/* BizSim 7.0.0 core: icons (SVG only, no emoji), charts, helpers, animated news, shop. Additive; wraps App.* */
(() => {
  if (typeof App === 'undefined') return;
  const P = {
    candle: 'M6 4v3M6 17v3M4 7h4v10H4zM12 2v4M12 14v6M10 6h4v8h-4zM18 6v2M18 16v4M16 8h4v8h-4z', trend: 'M3 17l6-6 4 4 8-9M15 6h6v6', bank: 'M3 10l9-6 9 6M5 10v8M9 10v8M15 10v8M19 10v8M3 21h18',
    pie: 'M12 3v9h9a9 9 0 1 1-9-9zM15 3a9 9 0 0 1 6 6h-6z', coins: 'M8 8a5 3 0 1 0 0-.01M3 8v4c0 1.7 2.2 3 5 3s5-1.3 5-3V8M13 12c0 1.7 2.2 3 5 3s3-.7 3-1v-4c0-1.2-1.5-2.2-3.5-2.7M3 12v4c0 1.7 2.2 3 5 3s5-1.3 5-3',
    gold: 'M3 17l3-7h12l3 7zM9 10l1.5-4h3L15 10', building: 'M4 21V4h10v17M14 9h6v12M8 8h2M8 12h2M8 16h2M17 13h0M17 17h0M2 21h20', land: 'M3 18l5-9 4 6 3-4 6 7zM3 21h18',
    key: 'M14 10a4 4 0 1 0-3.9 4L21 14v3h-3v3h-3v-3h-4.9', frame: 'M3 4h18v16H3zM6 7h12v10H6zM8 15l3-4 2 2 3-4 2 6', blade: 'M5 19l9-9M14 10l5-6-1 7-4 3M4 20l2-4 2 2z', watch: 'M8 3h8l1 4H7zM8 21h8l1-4H7zM12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10M12 10v2l1.5 1',
    car: 'M3 15v-3l2-5h14l2 5v3zM3 15v3h3v-3M18 15v3h3v-3M7 12h.01M17 12h.01', coin: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v10M9.5 9.5h4a1.5 1.5 0 0 1 0 3h-3a1.5 1.5 0 0 0 0 3h4', drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
    shoe: 'M3 16c0-3 2-3 4-3 1.5 0 2-2 2-4l3 2c2 1 5 1.5 8 3v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 18h18', laptop: 'M5 5h14v10H5zM2 19h20l-2-4H4z', book: 'M4 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H4zM20 4h-6M20 4v14h-6', motor: 'M5 17a3 3 0 1 0 0-.01M19 17a3 3 0 1 0 0-.01M5 17h7l3-7h3M9 10h4',
    pen: 'M4 20l1-4L16 5l3 3L8 19zM14 7l3 3', bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-4 10.5c.7.7 1 1.5 1 2.5h6c0-1 .3-1.8 1-2.5A6 6 0 0 0 12 3z', bell: 'M6 16V11a6 6 0 0 1 12 0v5l2 2H4zM10 21h4',
    fire: 'M12 3c1 3 5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 2-4 0 2 1 2.5 1.5 2C11 8 11 5 12 3z', flood: 'M3 10c2 0 2 1.5 4.5 1.5S10 10 12 10s2 1.5 4.5 1.5S19 10 21 10M3 15c2 0 2 1.5 4.5 1.5S10 15 12 15s2 1.5 4.5 1.5S19 15 21 15M3 20c2 0 2 1.5 4.5 1.5',
    mask: 'M4 5h16v7a8 8 0 0 1-16 0zM8 10h2M14 10h2M9 15c1.5 1 4.5 1 6 0', power: 'M13 2L5 14h6l-1 8 9-12h-6z', handshake: 'M2 11l4-4 4 2 3-2 5 3 4-1M6 7l-4 4 6 7 3 1 2-2 5 1 2-2-4-5M11 14l2 2', user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M4 21c0-4 3.5-7 8-7s8 3 8 7',
    userplus: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21c0-4 3.5-7 8-7M18 8v6M15 11h6', userx: 'M10 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8M2 21c0-4 3.5-7 8-7M16 8l5 5M21 8l-5 5', file: 'M6 3h9l4 4v14H6zM14 3v5h5M9 13h7M9 17h7',
    check: 'M5 12l5 5 9-10', x: 'M6 6l12 12M18 6L6 18', lock: 'M6 11h12v10H6zM8 11V8a4 4 0 0 1 8 0v3', news: 'M4 5h13v14H4zM17 8h3v9a2 2 0 0 1-2 2M7 9h7M7 12h7M7 15h4', rocket: 'M5 15c-1.5 1-2 4-2 6 2 0 5-.5 6-2M14 4c4-1 6-1 6-1s0 2-1 6l-6 6-4-4zM9 12l-3-1 2-3 3 .5M12 15l1 3 3-2-.5-3M15 9h.01',
    tag: 'M3 3h8l10 10-8 8L3 11zM8 8h.01', gift: 'M3 9h18v4H3zM5 13v8h14v-8M12 9v12M12 9c-2 0-4-1-4-3s3-2 4 3zM12 9c2 0 4-1 4-3s-3-2-4 3z', wallet: 'M3 7h16a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM3 7l2-3h12M16 14h2',
    percent: 'M19 5L5 19M7 9a2 2 0 1 0 0-.01M17 17a2 2 0 1 0 0-.01', scale: 'M12 3v18M5 7h14M5 7l-3 7a3 3 0 0 0 6 0zM19 7l-3 7a3 3 0 0 0 6 0z', flag: 'M5 21V4M5 4h12l-2 4 2 4H5', search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14M20 20l-4-4',
    calendar: 'M4 6h16v14H4zM4 10h16M8 3v4M16 3v4', heart: 'M12 20s-8-5-8-11a4.5 4.5 0 0 1 8-2.5A4.5 4.5 0 0 1 20 9c0 6-8 11-8 11z', chat: 'M4 5h16v11H9l-5 4z', box: 'M4 8l8-4 8 4v9l-8 4-8-4zM4 8l8 4 8-4M12 12v9', cap: 'M2 9l10-5 10 5-10 5zM6 11v5c3 2 9 2 12 0v-5',
    store: 'M4 9l1.5-5h13L20 9M4 9v11h16V9M4 9h16M9 20v-6h6v6', ticket: 'M3 8a2 2 0 0 0 0 4v4h18v-4a2 2 0 0 1 0-4V6H3zM9 6v12', warn: 'M12 3l10 18H2zM12 10v5M12 18h.01', down2: 'M12 4v14M6 13l6 6 6-6', up2: 'M12 20V6M6 11l6-6 6 6', globe: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18',
    zap: 'M13 2L4 14h7l-1 8 9-12h-7z', leaf: 'M5 19c0-9 5-14 15-14 0 10-5 15-14 15M5 19l7-7', sparkle: 'M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z'
  };
  const svg = (d, s = 18, w = 1.8) => `<svg width="${s}" height="${s}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
  const i1 = App.icon; App.icon = (n, s = 18) => (P[n] ? svg(P[n], s) : i1(n, s));
  const ic = (n, s) => App.icon(n, s), M = n => App.money(n), E = esc;
  const S = () => App.state.state, V = () => S().v700, V6 = () => S().v655, C = () => App.v700cat || { stocks: [], trade: [], bonds: [], funds: [], property: [], shop: [], traits: {}, flaws: [], roles: {}, questions: [], content: {}, depositTenors: [] };
  const pct = (n, d = 1) => (n >= 0 ? '+' : '') + (n * 100).toFixed(d) + '%', cls = n => (n >= 0 ? 'pos' : 'neg'), clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const last = a => a[a.length - 1];
  const api = async (path, body) => { const { r, d } = await App.requestJson(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }); if (!r.ok) { App.toast('Gagal', d.error || 'Terjadi kesalahan.', 'danger'); return null; } return d; };
  const act = async (path, body, okTitle, okMsg) => { const d = await api(path, body); if (!d) return null; closeModal(); if (okTitle) App.toast(okTitle, typeof okMsg === 'function' ? okMsg(d) : okMsg || '', 'success'); await App.refresh(); return d; };
  const val = id => document.getElementById(id)?.value;
  const stockMeta = t => C().stocks.find(x => x.t === t) || V().companies[t];
  const lotOf = m => (m && m.c === 'US' ? 1 : 100);
  Object.assign(App, { v700: { P, svg, ic, M, S, V, V6, C, pct, cls, clamp, last, api, act, val, stockMeta, lotOf, E } });

  /* ---------- charts ---------- */
  const nice = n => (Math.abs(n) >= 1e6 ? (n / 1e6).toFixed(2) + ' jt' : Math.abs(n) >= 1000 ? Math.round(n).toLocaleString('id-ID') : String(Math.round(n * 100) / 100));
  const candleSvg = (cs, o = {}) => {
    cs = cs.slice(-(o.n || 45)); const W = 640, H = o.h || 230, pl = 8, pr = 62, pt = 10, pb = 18; let hi = Math.max(...cs.map(c => c[1])), lo = Math.min(...cs.map(c => c[2])); const pad = (hi - lo) * .08 || hi * .01; hi += pad; lo -= pad; const y = v => pt + (H - pt - pb) * (1 - (v - lo) / (hi - lo)), bw = (W - pl - pr) / cs.length;
    let g = ''; for (let i = 0; i <= 4; i++) { const v = lo + (hi - lo) * i / 4; g += `<line x1="${pl}" x2="${W - pr}" y1="${y(v)}" y2="${y(v)}" class="ch-grid"/><text x="${W - pr + 6}" y="${y(v) + 3}" class="ch-lbl">${nice(v)}</text>`; }
    const body = cs.map((c, i) => { const x = pl + bw * i + bw / 2, up = c[3] >= c[0], k = up ? 'ch-up' : 'ch-dn'; return `<line x1="${x}" x2="${x}" y1="${y(c[1])}" y2="${y(c[2])}" class="${k}"/><rect x="${x - bw * .32}" y="${y(Math.max(c[0], c[3]))}" width="${bw * .64}" height="${Math.max(1.2, Math.abs(y(c[0]) - y(c[3])))}" class="${k} fill"/>`; }).join('');
    const lines = (o.lines || []).map(l => (l.v > lo && l.v < hi ? `<line x1="${pl}" x2="${W - pr}" y1="${y(l.v)}" y2="${y(l.v)}" class="ch-ref ${l.k}"/><text x="${pl + 4}" y="${y(l.v) - 3}" class="ch-lbl ${l.k}">${l.t}</text>` : '')).join('');
    const cur = last(cs)[3]; return `<svg viewBox="0 0 ${W} ${H}" class="ch ${o.cls || ''}" preserveAspectRatio="none">${g}${body}${lines}<line x1="${pl}" x2="${W - pr}" y1="${y(cur)}" y2="${y(cur)}" class="ch-cur"/><rect x="${W - pr}" y="${y(cur) - 8}" width="${pr}" height="16" class="ch-tag"/><text x="${W - pr + 4}" y="${y(cur) + 4}" class="ch-tagt">${nice(cur)}</text></svg>`;
  };
  const lineSvg = (a, o = {}) => {
    if (!a || a.length < 2) return ''; const W = o.w || 300, H = o.h || 70, hi = Math.max(...a), lo = Math.min(...a), r = hi - lo || 1, pts = a.map((v, i) => [i / (a.length - 1) * W, 4 + (H - 8) * (1 - (v - lo) / r)]), d = pts.map((p, i) => (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1)).join('');
    const up = a[a.length - 1] >= a[0], col = o.color || (up ? 'var(--good)' : 'var(--bad)'); return `<svg viewBox="0 0 ${W} ${H}" class="ln" preserveAspectRatio="none"><path d="${d}L${W} ${H}L0 ${H}z" fill="${col}" opacity=".12"/><path d="${d}" fill="none" stroke="${col}" stroke-width="2" stroke-linejoin="round" vector-effect="non-scaling-stroke"/></svg>`;
  };
  const donut = (parts, size = 120) => { const tot = parts.reduce((a, p) => a + p.v, 0) || 1; let a0 = -Math.PI / 2; const R = 44, r = 28, cx = 60, cy = 60; const seg = parts.filter(p => p.v > 0).map(p => { const a1 = a0 + p.v / tot * Math.PI * 2 - .0001, big = a1 - a0 > Math.PI ? 1 : 0, pt = (rr, a) => `${(cx + rr * Math.cos(a)).toFixed(2)} ${(cy + rr * Math.sin(a)).toFixed(2)}`; const d = `M${pt(R, a0)}A${R} ${R} 0 ${big} 1 ${pt(R, a1)}L${pt(r, a1)}A${r} ${r} 0 ${big} 0 ${pt(r, a0)}z`; a0 = a1 + .0001; return `<path d="${d}" fill="${p.c}"/>`; }).join(''); return `<svg viewBox="0 0 120 120" width="${size}" height="${size}">${seg}</svg>`; };
  const bars = (arr, o = {}) => { const mx = Math.max(1, ...arr.map(x => x.v)); return `<div class="bars ${o.cls || ''}">${arr.map(x => `<i style="height:${Math.max(3, x.v / mx * 100)}%" title="${E(x.l || '')}"></i>`).join('')}</div>`; };
  Object.assign(App.v700, { candleSvg, lineSvg, donut, bars, nice });

  /* ---------- animated news ---------- */
  const NK = { stock: ['trend', 'k-stock'], ipo: ['rocket', 'k-ipo'], trade: ['candle', 'k-trade'], bond: ['bank', 'k-bond'], art: ['frame', 'k-art'], crime: ['mask', 'k-crime'], fire: ['fire', 'k-fire'], flood: ['flood', 'k-flood'], power: ['power', 'k-power'], business: ['store', 'k-biz'], hr: ['user', 'k-hr'], creator: ['video', 'k-creator'], career: ['briefcase', 'k-career'], life: ['heart', 'k-life'], macro: ['globe', 'k-macro'], market: ['chart', 'k-macro'] };
  const kindOf = n => (NK[n.kind] ? n.kind : n.event ? 'macro' : 'market');
  const allNews = () => [...(V().news || []).map(n => ({ ...n, src: 'v7' })), ...(V6().news || []).map(n => ({ id: 'm' + n.id, day: n.day, kind: 'macro', title: n.title, body: n.body, tone: n.tone, impact: n.impact, src: 'v6' }))].sort((a, b) => b.day - a.day);
  const newsCard = n => { const k = NK[n.kind] || NK.market; return `<article class="nw ${k[1]} t-${n.tone || 'mixed'}"><span class="nw-ic">${ic(k[0], 22)}</span><div class="nw-main"><div class="nw-top"><b>${E(n.title)}</b><small>Hari ${n.day}</small></div><p>${E(n.body)}</p>${n.impact ? `<div class="chips">${n.impact.map(i => `<span class="${cls(i.pct)}">${E(i.asset)} ${i.pct >= 0 ? '+' : ''}${i.pct}%</span>`).join('')}</div>` : ''}${n.ticker || n.pct ? `<div class="chips">${n.ticker ? `<span>${E(n.ticker)}</span>` : ''}${n.pct != null ? `<span class="${cls(n.pct)}">${n.pct >= 0 ? '+' : ''}${n.pct}%</span>` : ''}</div>` : ''}</div></article>`; };
  const NEWS_TABS = [['all', 'Semua'], ['stock', 'Saham'], ['macro', 'Ekonomi'], ['crime', 'Keamanan'], ['business', 'Bisnis'], ['hr', 'Tim'], ['creator', 'Kreator'], ['life', 'Pribadi']];
  App.newsTab = 'all';
  App.newsPage = () => {
    const t = App.newsTab, f = { stock: ['stock', 'ipo', 'trade', 'bond', 'art'], macro: ['macro', 'market'], crime: ['crime', 'fire', 'flood', 'power'], business: ['business', 'career'], hr: ['hr'], creator: ['creator'], life: ['life'] }[t], list = allNews().filter(n => !f || f.includes(kindOf(n))).slice(0, 60);
    return `<div class="page-head"><div><h1>News</h1><p>Berita ekonomi, bursa, keamanan, dan kejadian di bisnis dan hidup Anda. Efek berita pada harga hanya simulasi.</p></div></div><div class="tabs">${NEWS_TABS.map(x => `<button class="${t === x[0] ? 'on' : ''}" onclick="App.newsTab='${x[0]}';App.render()">${x[1]}</button>`).join('')}</div><div class="nw-list">${list.map(newsCard).join('') || '<div class="empty">Belum ada berita. Jalankan hari simulasi.</div>'}</div>`;
  };
  App.newsStrip = (kinds, k = 4) => `<div class="nw-list compact">${allNews().filter(n => !kinds || kinds.includes(kindOf(n))).slice(0, k).map(newsCard).join('') || '<div class="empty">Belum ada berita.</div>'}</div>`;
  const popup = n => {
    let st = document.querySelector('.nw-pop-stack'); if (!st) { st = document.createElement('div'); st.className = 'nw-pop-stack'; document.body.appendChild(st); } if (st.children.length >= 3) st.firstChild.remove(); const k = NK[n.kind] || NK.market, el = document.createElement('div'); el.className = `nw-pop ${k[1]} t-${n.tone || 'mixed'}`;
    el.innerHTML = `<span class="nw-ic">${ic(k[0], 22)}</span><div><b>${E(n.title)}</b><p>${E(n.body).slice(0, 110)}</p></div>`; st.appendChild(el); setTimeout(() => { el.classList.add('out'); setTimeout(() => el.remove(), 400); }, 5200);
  };
  const sim0 = App.simDay;
  App.simDay = async () => { const seen = new Set((V()?.news || []).map(n => n.id)); await sim0(); const fresh = (V()?.news || []).filter(n => !seen.has(n.id) && (n.tone === 'down' || ['crime', 'fire', 'flood', 'ipo', 'hr', 'creator', 'career'].includes(n.kind))); fresh.slice(0, 3).forEach((n, i) => setTimeout(() => popup(n), i * 450)); };
  Object.assign(App.v700, { newsCard, kindOf, allNews, popup, NK });

  /* ---------- shop ---------- */
  App.shopTab = 'Karier';
  const itemCard = it => { const owned = V().inv.some(x => x.itemId === it.id), single = it.cat === 'Karier' || it.cat === 'Kreator', dis = (single && owned) || S().cash < it.p; return `<article class="sh-card sh-${it.cat}"><div class="sh-ic">${ic(it.ic, 26)}</div><div class="sh-main"><b>${E(it.n)}</b><p>${E(it.d)}</p>${it.col ? '<small class="warnTxt">Risiko barang palsu. Lakukan appraisal untuk memastikan.</small>' : ''}${it.biz ? `<small>Cocok untuk: ${it.biz.includes('*') ? 'semua bisnis' : it.biz.map(x => (App.businessCatalog.find(c => c.id === x) || { name: x }).name).join(', ')}</small>` : ''}</div><div class="sh-buy"><b>${M(it.p)}</b><button class="btn ${dis ? '' : 'primary'}" ${dis ? 'disabled' : ''} onclick="App.v700Buy('${it.id}')">${single && owned ? 'Dimiliki' : 'Beli'}</button></div></article>`; };
  App.v700Buy = async id => { const d = await api('/api/v700/shop/buy', { itemId: id }); if (d) { App.toast('Pembelian berhasil', `${d.item.name} masuk ke inventaris.`, 'success'); await App.refresh(); } };
  App.v700Install = id => {
    const ent = V().inv.find(x => x.id === id), it = C().shop.find(x => x.id === ent.itemId), list = (App.state.businesses || []).filter(b => it.biz.includes('*') || it.biz.includes(b.catalogId));
    App.modal(`Pasang ${it.n}`, list.length ? `<div class="list">${list.map(b => `<div class="list-item"><div class="v655-biz-ic sm">${ic('store', 16)}</div><div style="flex:1"><div class="title">${E(b.name)}</div></div><button class="btn accent" onclick="App.v700InstallDo('${id}',${b.id})">Pasang</button></div>`).join('')}</div>` : '<div class="empty">Tidak ada bisnis yang cocok untuk peralatan ini.</div>');
  };
  App.v700InstallDo = (id, bid) => act('/api/v700/shop/install', { invId: id, businessId: bid }, 'Terpasang', 'Efek peralatan aktif di bisnis.');
  App.v700Appraise = id => act('/api/v700/shop/appraise', { invId: id }, null).then(d => { if (d) App.toast('Hasil appraisal', d.fake ? 'Barang ini terbukti PALSU. Nilainya hanya sekitar 15%.' : 'Barang ini asli.', d.fake ? 'danger' : 'success'); });
  App.v700Auction = id => { const ent = V().inv.find(x => x.id === id); App.modal('Jual lewat lelang', `<p class="small muted">Barang dilelang dengan harga palu sekitar 88% sampai 116% dari nilai pasar. Biaya rumah lelang 12%. Dana cair 5 hari.</p><div class="detail-grid"><div class="detail"><span>Estimasi nilai</span><b>${M(ent.value)}</b></div></div>`, `<button class="btn" onclick="closeModal()">Batal</button><button class="btn primary" onclick="App.v700AuctionDo('${id}')">Lelang</button>`); };
  App.v700AuctionDo = id => act('/api/v700/shop/auction', { invId: id }, 'Terjual', d => `Harga palu ${M(d.hammer)}, bersih ${M(d.net)} cair 5 hari.`);
  App.shopPage = () => {
    const t = App.shopTab, tabs = ['Karier', 'Kreator', 'Bisnis', 'Proteksi', 'Koleksi', 'Inventaris'], day = S().day, b = V().bonus || {};
    const body = t === 'Inventaris' ? (() => { const g = V().inv; return g.length ? `<div class="inv-grid">${g.map(x => { const it = C().shop.find(q => q.id === x.itemId) || {}; const pl = (x.value || x.price) - x.price; return `<div class="sh-card inv"><div class="sh-ic">${ic(it.ic || 'box', 24)}</div><div class="sh-main"><b>${E(x.name)}</b><p>${x.expires ? `Aktif sampai hari ${x.expires} (${Math.max(0, x.expires - day)} hari lagi)` : x.installedIn ? 'Terpasang di bisnis' : E(it.cat || '')}</p>${it.col ? `<small class="${cls(pl)}">Nilai ${M(x.value)} (${pct(x.price ? pl / x.price : 0)})</small> ${x.appraised ? `<span class="badge ${x.fake ? 'danger' : 'success'}">${x.fake ? 'Palsu' : 'Asli'}</span>` : ''}` : ''}</div><div class="sh-buy">${it.cat === 'Bisnis' && !x.installedIn ? `<button class="btn accent" onclick="App.v700Install('${x.id}')">Pasang</button>` : ''}${it.col ? `${x.appraised ? '' : `<button class="btn" onclick="App.v700Appraise('${x.id}')">Appraisal</button>`}<button class="btn primary" onclick="App.v700Auction('${x.id}')">Lelang</button>` : ''}</div></div>`; }).join('')}</div>` : '<div class="empty">Inventaris kosong.</div>'; })() : `<div class="sh-grid">${C().shop.filter(x => x.cat === t).map(itemCard).join('')}</div>`;
    return `<div class="page-head"><div><h1>Shop</h1><p>Beli perlengkapan karier, peralatan bisnis, proteksi, dan barang koleksi. Harga koleksi bergerak mengikuti pasar seni (simulasi).</p></div><span class="badge blue">${ic('wallet', 12)} ${M(S().cash)}</span></div><div class="sh-effects">${[['Interview', b.interview ? '+' + b.interview : '0', 'briefcase'], ['Belajar', '+' + Math.round((b.learn || 0) * 100) + '%', 'book'], ['Kualitas konten', '+' + (b.creator || 0), 'video'], ['Proteksi', insuredNow() ? 'Aktif' : 'Tidak ada', 'shield']].map(x => `<div><span>${ic(x[2], 16)}</span><small>${x[0]}</small><b>${x[1]}</b></div>`).join('')}</div><div class="tabs">${tabs.map(x => `<button class="${t === x ? 'on' : ''}" onclick="App.shopTab='${x}';App.render()">${x}</button>`).join('')}</div>${body}`;
  };
  const insuredNow = () => V().inv.some(i => i.itemId === 'ins-home' && i.expires > S().day);

  /* ---------- nav, pages, catalog ---------- */
  const lc = App.loadCatalogs;
  App.loadCatalogs = async () => { await lc(); try { const { r, d } = await App.requestJson('/api/v700/catalog'); if (r.ok) App.v700cat = d; } catch (e) { console.error(e); } };
  const addNav = (id, label, icon, at) => { if (!App.navItems.some(x => x[0] === id)) App.navItems.splice(at, 0, [id, label, icon]); };
  App.navItems = App.navItems.filter(x => x[0] !== 'investments'); addNav('invest', 'Investment Hub', 'chart', 5); addNav('shop', 'Shop', 'store', 6); addNav('news', 'News', 'news', 7);
  const page0 = App.page; App.pages700 = {};
  App.page = () => (App.v700cat && V() ? (App.view === 'news' ? App.newsPage() : App.view === 'shop' ? App.shopPage() : App.pages700[App.view] ? App.pages700[App.view]() : page0()) : page0());
  App.investments = () => App.pages700.invest();
  const r0 = App.render; App.render = () => { r0(); try { const bt = document.querySelectorAll('.nav-item,.sidebar button,.sidebar a'); const n = allNews().filter(x => x.day >= S().day - 1).length; document.querySelectorAll('.sidebar [onclick*="\'news\'"]').forEach(el => { if (n && !el.querySelector('.nw-dot')) el.insertAdjacentHTML('beforeend', `<span class="nw-dot">${Math.min(n, 9)}</span>`); }); } catch (e) { } };
  if (App.state) App.loadCatalogs().then(() => App.render());
})();
