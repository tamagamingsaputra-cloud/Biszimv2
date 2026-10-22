/* BizSim 7.1.0 character UI. Procedural anime-style SVG portraits (no emoji, no raster). Additive: hooks into v700 via App.portrait. */
(() => {
  if (typeof App === 'undefined' || !App.v700) return;
  const { ic, M, S, V, api, val, E, clamp } = App.v700;
  const hash = s => { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; };
  const rnd = seed => { let a = seed >>> 0; return () => { a = (a + 0x6D2B79F5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; };
  const SKIN = ['#fbe3d0', '#f6cfae', '#e9b48a', '#cf9467', '#a86f45', '#7a4a2b'];
  const HAIR = ['#1f1a17', '#3b2416', '#5a3a22', '#8a5a2b', '#c9a24a', '#2f3a5a', '#6b2fa0', '#c2417c', '#1a8f84', '#b4472a'];
  const EYE = ['#3b2a1a', '#244a7a', '#1f6b52', '#6b2fa0', '#8a2b3a'];
  const STYLES = ['short', 'long', 'bob', 'spiky', 'ponytail', 'buns', 'wavy', 'sidepart'];
  const TRAIT_BG = { hardworking: ['#d9f3ee', '#9ddcd0'], creative: ['#ffe9cf', '#ffc58a'], perfectionist: ['#e8e1ff', '#c4b3ff'], relaxed: ['#dff1fd', '#a9dbf7'], ambitious: ['#ffe0d6', '#ffa98c'], loyal: ['#dde9ff', '#a9c4fb'], social: ['#fde0ee', '#f7a9cd'], techy: ['#e2e8f0', '#b4c0d2'] };
  const TRAIT_HAIR = { creative: [7, 8, 6], ambitious: [9, 0, 1], techy: [5, 8, 0], social: [3, 4, 7], perfectionist: [0, 1, 5], relaxed: [2, 3, 4], loyal: [1, 2, 0], hardworking: [0, 1, 2, 3] };
  const OUTFIT = (role = '') => { const r = role.toLowerCase(); if (/barista|koki|dapur|outlet/.test(r)) return 'apron'; if (/support|service|layanan|admin|kasir|dispatcher/.test(r)) return /kasir|admin/.test(r) ? 'vest' : 'headset'; if (/operator|teknisi|mesin|gudang|driver|quality|produksi/.test(r)) return 'hardhat'; if (/manager|supervisor|producer|project/.test(r)) return 'suit'; if (/developer|desainer|editor|video|writer|content|social|iklan|pemasaran|penjualan/.test(r)) return 'hoodie'; return 'shirt'; };
  const OUT_COL = { apron: '#c2793a', headset: '#2f6fed', hardhat: '#e0a31a', suit: '#1e293b', hoodie: '#7a5af8', vest: '#0f9f8f', shirt: '#475569' };

  const hairBack = (st, c) => ({
    long: `<path d="M24 56c-4 24 0 42 8 52h56c8-10 12-28 8-52 0-26-14-40-36-40S24 30 24 56z" fill="${c}"/>`, bob: `<path d="M26 54c-2 18 2 30 8 36h52c6-6 10-18 8-36 0-24-14-38-34-38S26 30 26 54z" fill="${c}"/>`,
    ponytail: `<path d="M84 40c14 4 20 20 12 40-4 8-10 8-12 2 6-12 4-26-4-34z" fill="${c}"/>`, buns: `<circle cx="32" cy="30" r="11" fill="${c}"/><circle cx="88" cy="30" r="11" fill="${c}"/>`,
    wavy: `<path d="M24 52c-6 20 2 38 12 50 4-8 0-14 4-22M96 52c6 20-2 38-12 50-4-8 0-14-4-22M30 40c0-18 14-26 30-26s30 8 30 26z" fill="${c}"/>`, short: '', spiky: '', sidepart: ''
  })[st] || '';
  const hairFront = (st, c) => ({
    short: `<path d="M30 52c-2-24 10-38 30-38s32 14 30 38c-6-10-12-16-22-18-10 4-24 6-38 18z" fill="${c}"/>`,
    long: `<path d="M30 52c-2-24 10-38 30-38s32 14 30 38c-8-8-16-16-26-18-8 6-20 10-34 18z" fill="${c}"/>`,
    bob: `<path d="M30 54c-2-24 10-40 30-40s32 16 30 40c-8-8-14-14-24-18-10 6-22 10-36 18z" fill="${c}"/>`,
    spiky: `<path d="M28 54l-4-18 12 6 2-20 12 14 8-18 8 18 12-14 2 20 12-6-4 18c-6-10-12-14-20-16-10 4-24 6-40 16z" fill="${c}"/>`,
    ponytail: `<path d="M30 52c-2-24 10-38 30-38s32 14 30 38c-6-8-14-14-24-16-10 4-22 8-36 16z" fill="${c}"/>`,
    buns: `<path d="M30 52c-2-24 10-38 30-38s32 14 30 38c-6-8-14-14-24-16-10 4-22 8-36 16z" fill="${c}"/>`,
    wavy: `<path d="M30 54c-2-26 10-40 30-40s32 14 30 40c-6-10-14-16-24-18-10 4-22 8-36 18z" fill="${c}"/>`,
    sidepart: `<path d="M28 56c-2-26 10-42 32-42s32 14 32 42c-4-10-10-16-18-20-18 4-30 8-46 20z" fill="${c}"/><path d="M58 15c-14 4-24 12-30 26" stroke="${c}" stroke-width="2" fill="none"/>`
  })[st];
  const mouth = m => (m === 'happy' ? '<path d="M52 82q8 8 16 0" stroke="#7a2e2e" stroke-width="2.4" fill="#fff" stroke-linecap="round"/>' : m === 'tired' ? '<path d="M53 85q7-4 14 0" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>' : '<path d="M54 83q6 4 12 0" stroke="#7a2e2e" stroke-width="2.4" fill="none" stroke-linecap="round"/>');
  const eyes = (c, m, glasses) => { const y = m === 'tired' ? 62 : 60, h = m === 'tired' ? 7 : 11; const one = x => `<g><ellipse cx="${x}" cy="${y + 4}" rx="8" ry="${h}" fill="#fff"/><ellipse cx="${x}" cy="${y + 5}" rx="6" ry="${h - 2}" fill="${c}"/><ellipse cx="${x}" cy="${y + 5}" rx="3" ry="${Math.max(3, h - 6)}" fill="#111"/><circle cx="${x - 2.4}" cy="${y + 1}" r="2.4" fill="#fff"/><circle cx="${x + 2.4}" cy="${y + 8}" r="1.2" fill="#fff" opacity=".8"/>${m === 'tired' ? `<path d="M${x - 8} ${y - 1}h16" stroke="#3a2a22" stroke-width="2.4" stroke-linecap="round"/>` : `<path d="M${x - 9} ${y - 5}q9-6 18 0" stroke="#2a1d18" stroke-width="2.4" fill="none" stroke-linecap="round"/>`}</g>`; return one(46) + one(74) + (glasses ? '<g fill="none" stroke="#334155" stroke-width="2"><rect x="35" y="55" width="22" height="18" rx="7"/><rect x="63" y="55" width="22" height="18" rx="7"/><path d="M57 63h6"/></g>' : ''); };
  const body = (o, c) => {
    const base = `<path d="M18 120c0-18 14-28 42-28s42 10 42 28z" fill="${c}"/>`;
    return ({
      apron: base + '<path d="M44 96h32l4 24H40z" fill="#fff8ec"/><path d="M50 96l-4-6M70 96l4-6" stroke="#fff8ec" stroke-width="3"/>',
      headset: base, hardhat: base,
      suit: base + '<path d="M48 94l12 14 12-14" fill="#fff"/><path d="M60 100l-4 20h8z" fill="#be185d"/>',
      hoodie: base + '<path d="M40 94q20 14 40 0" stroke="#5b3fd0" stroke-width="4" fill="none"/><circle cx="52" cy="104" r="1.8" fill="#fff"/><circle cx="68" cy="104" r="1.8" fill="#fff"/>',
      vest: base + '<path d="M44 94l16 26 16-26" fill="#fff"/>', shirt: base + '<path d="M50 94l10 10 10-10" fill="#fff"/>'
    })[o];
  };
  const overlay = o => (o === 'hardhat' ? '<path d="M24 44c2-24 16-34 36-34s34 10 36 34z" fill="#e0a31a"/><rect x="20" y="42" width="80" height="7" rx="3" fill="#f3c24a"/><rect x="54" y="8" width="12" height="11" rx="3" fill="#f3c24a"/>' : o === 'headset' ? '<path d="M26 56c0-22 14-38 34-38s34 16 34 38" fill="none" stroke="#1e293b" stroke-width="4"/><rect x="20" y="54" width="9" height="16" rx="4" fill="#1e293b"/><rect x="91" y="54" width="9" height="16" rx="4" fill="#1e293b"/><path d="M95 68q0 14-18 16" stroke="#1e293b" stroke-width="2.6" fill="none"/><circle cx="76" cy="84" r="3" fill="#1e293b"/>' : '');
  /* opts: {name, trait, role, mood, skin, hair, style, eye, outfit, glasses, size} */
  App.portrait = (name, trait, o = {}) => {
    const seed = hash(name + '|' + (trait || '')), r = rnd(seed), pick = a => a[Math.floor(r() * a.length)];
    const skin = o.skin != null ? SKIN[o.skin % SKIN.length] : pick(SKIN), hc = o.hair != null ? HAIR[o.hair % HAIR.length] : HAIR[pick(TRAIT_HAIR[trait] || [0, 1, 2, 3])], st = o.style != null ? STYLES[o.style % STYLES.length] : pick(STYLES), ec = EYE[Math.floor(r() * EYE.length)];
    const outfit = o.outfit || OUTFIT(o.role), oc = OUT_COL[outfit], bg = TRAIT_BG[trait] || ['#e2e8f0', '#b4c0d2'], glasses = o.glasses != null ? o.glasses : (trait === 'techy' || trait === 'perfectionist') && r() < .7, mood = o.mood || 'neutral', size = o.size || 52, id = 'g' + seed.toString(36);
    const blush = mood === 'happy' ? '.5' : '.28';
    return `<svg class="portrait" width="${size}" height="${size}" viewBox="0 0 120 120" role="img" aria-label="Potret ${E(name)}"><defs><linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${bg[0]}"/><stop offset="1" stop-color="${bg[1]}"/></linearGradient><clipPath id="c${id}"><rect width="120" height="120" rx="26"/></clipPath></defs><g clip-path="url(#c${id})"><rect width="120" height="120" fill="url(#${id})"/>${hairBack(st, hc)}${body(outfit, oc)}<rect x="52" y="82" width="16" height="16" rx="6" fill="${skin}"/><ellipse cx="60" cy="62" rx="30" ry="34" fill="${skin}"/><ellipse cx="31" cy="64" rx="4.5" ry="7" fill="${skin}"/><ellipse cx="89" cy="64" rx="4.5" ry="7" fill="${skin}"/>${outfit === 'hardhat' ? '' : hairFront(st, hc)}<ellipse cx="40" cy="74" rx="6" ry="3.4" fill="#ff7a8a" opacity="${blush}"/><ellipse cx="80" cy="74" rx="6" ry="3.4" fill="#ff7a8a" opacity="${blush}"/>${eyes(ec, mood, glasses)}<path d="M60 68v4" stroke="#00000022" stroke-width="2" stroke-linecap="round"/>${mouth(mood)}${overlay(outfit)}</g></svg>`;
  };
  const moodOf = e => { const m = e?.morale ?? 60; return m >= 72 ? 'happy' : m < 38 ? 'tired' : 'neutral'; };
  App.portraitFor = (c, o = {}) => App.portrait(c.name, c.trait || c.v700?.trait, { role: c.role, mood: c.v700 ? moodOf(c) : 'neutral', ...o });

  /* ---------- player character ---------- */
  const key = () => 'bizsim.char.' + (App.user?.id || 0);
  const loadChar = () => { try { return JSON.parse(localStorage.getItem(key()) || 'null'); } catch (e) { return null; } };
  const saveChar = c => { try { localStorage.setItem(key(), JSON.stringify(c)); } catch (e) { } };
  const defChar = () => { const r = rnd(hash(App.user?.name || 'Anda')); return { skin: Math.floor(r() * 5), hair: Math.floor(r() * 5), style: Math.floor(r() * STYLES.length), outfit: 'shirt', glasses: false }; };
  App.playerChar = () => ({ ...defChar(), ...(loadChar() || {}) });
  App.playerPortrait = (size = 96) => { const c = App.playerChar(); return App.portrait(App.user?.name || 'Anda', 'loyal', { ...c, size, mood: 'happy', role: '' }); };
  const picker = (label, id, n, cur, render) => `<div class="pk"><small>${label}</small><div class="pk-row">${Array.from({ length: n }, (_, i) => `<button class="pk-o ${cur === i ? 'on' : ''}" onclick="App.v710Pick('${id}',${i})">${render(i)}</button>`).join('')}</div></div>`;
  App._cc = null;
  App.v710Creator = () => {
    App._cc = App._cc || App.playerChar(); const c = App._cc, ou = ['shirt', 'suit', 'hoodie', 'vest', 'apron', 'headset', 'hardhat'];
    App.modal('Karakter Anda', `<div class="cc"><div class="cc-prev">${App.portrait(App.user?.name || 'Anda', 'loyal', { ...c, size: 150, mood: 'happy' })}<b>${E(App.user?.name || 'Anda')}</b></div><div class="cc-opts">${picker('Warna kulit', 'skin', SKIN.length, c.skin, i => `<i style="background:${SKIN[i]}"></i>`)}${picker('Gaya rambut', 'style', STYLES.length, c.style, i => `<span>${i + 1}</span>`)}${picker('Warna rambut', 'hair', HAIR.length, c.hair, i => `<i style="background:${HAIR[i]}"></i>`)}<div class="pk"><small>Pakaian</small><div class="pk-row">${ou.map(o => `<button class="pk-o wide ${c.outfit === o ? 'on' : ''}" onclick="App.v710Pick('outfit','${o}')">${{ shirt: 'Kemeja', suit: 'Jas', hoodie: 'Hoodie', vest: 'Rompi', apron: 'Apron', headset: 'Headset', hardhat: 'Helm' }[o]}</button>`).join('')}</div></div><div class="pk"><small>Kacamata</small><div class="pk-row"><button class="pk-o wide ${c.glasses ? '' : 'on'}" onclick="App.v710Pick('glasses',false)">Tidak</button><button class="pk-o wide ${c.glasses ? 'on' : ''}" onclick="App.v710Pick('glasses',true)">Ya</button></div></div></div></div>`, `<button class="btn" onclick="App._cc=null;closeModal()">Batal</button><button class="btn primary" onclick="App.v710SaveChar()">Simpan</button>`);
  };
  App.v710Pick = (k, v) => { App._cc[k] = v; App.v710Creator(); };
  App.v710SaveChar = () => { saveChar(App._cc); App._cc = null; closeModal(); App.toast('Karakter disimpan', 'Tampilan karakter Anda diperbarui.', 'success'); App.render(); };
  const prof0 = App.profile;
  App.profile = () => `<div class="card char-card"><div class="char-head">${App.playerPortrait(110)}<div><h3 class="section-title" style="margin:0">Karakter Anda</h3><p class="small muted" style="margin:4px 0 10px">${E(App.user?.name || '')} · hari ${S().day} · ${E(S().career?.position || 'Belum bekerja')}</p><button class="btn accent" onclick="App.v710Creator()">${ic('pen', 14)} Ubah Penampilan</button></div></div></div>` + prof0();

  /* ---------- hook into hiring/roster avatars ---------- */
  const people1 = App.people;
  App.people = () => people1();
  const r1 = App.render;
  App.render = () => {
    r1();
    try {
      const cands = V().hr.vac.filter(v => S().day >= v.readyDay).flatMap(v => V().hr.cand.filter(c => c.vacId === v.id));
      const emps = (App.state.employees || []).filter(e => e.status === 'active');
      document.querySelectorAll('.cd-card .av').forEach((el, i) => { const c = cands[i]; if (c && el.tagName === 'SPAN') el.outerHTML = App.portraitFor(c, { size: 56 }); });
      document.querySelectorAll('.rs-card .av').forEach((el, i) => { const e = emps[i]; if (e && el.tagName === 'SPAN') el.outerHTML = App.portraitFor(e, { size: 64 }); });
    } catch (e) { }
  };

  /* ---------- free-form interview question ---------- */
  const iv0 = App.v700Interview;
  App.v700Interview = id => {
    iv0(id); const c = V().hr.cand.find(x => x.id === id), log = App._iv[id] || {}, host = document.querySelector('.modal .chat, .modal-body .chat');
    if (!c || !host) return; const left = 3 - (c.asked || []).length, free = (App._ivFree ||= {})[id] || [];
    host.insertAdjacentHTML('afterbegin', `<div class="iv-cand">${App.portraitFor(c, { size: 64 })}<div><b>${E(c.name)}</b><small>${E(c.role)}</small></div></div>`);
    if (free.length) host.insertAdjacentHTML('beforeend', free.map(f => `<div class="bub hr">${E(f.q)}</div><div class="bub cand">${E(f.a)}</div>`).join(''));
    host.parentElement.insertAdjacentHTML('beforeend', `<div class="iv-free"><input id="iv-free-q" type="text" maxlength="140" placeholder="Tulis pertanyaan sendiri, misalnya: berapa gaji yang Anda harapkan?" onkeydown="if(event.key==='Enter')App.v710Free('${id}')"><button class="btn primary" ${left <= 0 ? 'disabled' : ''} onclick="App.v710Free('${id}')">Tanya</button></div>`);
  };
  App.v710Free = async id => {
    const q = (val('iv-free-q') || '').trim(); if (q.length < 3) return App.toast('Pertanyaan kosong', 'Tulis pertanyaan terlebih dahulu.', 'warning');
    const d = await api('/api/v710/hr/ask', { candId: id, text: q }); if (!d) return; (App._ivFree ||= {})[id] = [...((App._ivFree[id]) || []), { q, a: d.answer }]; await App.refresh(); App.v700Interview(id);
  };
})();
