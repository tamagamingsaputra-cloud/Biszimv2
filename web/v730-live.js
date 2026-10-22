/* BizSim 7.3.0 live prices: polls the simulation every few seconds. Movement follows simulation factors (news, momentum, volatility), never a fixed loop. */
(() => {
  if (typeof App === 'undefined' || !App.v700) return;
  const { M, pct, cls, lineSvg, candleSvg } = App.v700;
  const S = () => (App.state && App.state.state) || null;
  App.live = null;
  const INTERVAL = 3000;
  /* write live prices into the local state so every existing screen (portfolio, holdings, watchlist) shows them */
  const apply = live => {
    const s = S(); if (!s || !s.v700 || !live) return; const v = s.v700;
    for (const [t, l] of Object.entries(live.stocks || {})) { const st = v.stocks[t]; if (!st || st.status !== 'listed') continue; st.price = l.px; const c = st.candles[st.candles.length - 1]; if (c) { c[3] = l.px; c[1] = Math.max(c[1], l.px); c[2] = Math.min(c[2], l.px); } }
    for (const [id, l] of Object.entries(live.trade || {})) { const cs = v.trading.c[id]; if (!cs) continue; const c = cs[cs.length - 1]; c[3] = l.px; c[1] = Math.max(c[1], l.px); c[2] = Math.min(c[2], l.px); }
  };
  const hyd = App.hydrate;
  if (hyd) App.hydrate = d => { const r = hyd(d); try { if (App.live) apply(App.live); } catch (e) { } return r; };

  const flash = (el, dir) => { el.classList.remove('tk-up', 'tk-dn'); void el.offsetWidth; el.classList.add(dir > 0 ? 'tk-up' : 'tk-dn'); };
  const setText = (el, txt, dir) => { if (!el || el.textContent === txt) return; el.textContent = txt; if (dir) flash(el, dir); };
  const parse = html => new DOMParser().parseFromString(html, 'text/html');
  const swap = (sel, doc, root = document) => { const a = root.querySelector(sel), b = doc.querySelector(sel); if (a && b && a.innerHTML !== b.innerHTML) a.innerHTML = b.innerHTML; };
  const prevClose = st => (st.candles.length > 1 ? st.candles[st.candles.length - 2][3] : st.candles[0][0]);
  const lastPx = {};

  const patch = () => {
    const s = S(); if (!s || !s.v700) return; const v = s.v700, view = App.view;
    if (view === 'invest') {
      if (App.invTab === 'stock') {
        document.querySelectorAll('.stk-row').forEach(row => {
          const m = /App\.v700Stock\('([A-Z0-9]+)'\)/.exec(row.getAttribute('onclick') || ''), t = m && m[1], st = t && v.stocks[t]; if (!st) return;
          const b = row.querySelector('.stk-px b'), sm = row.querySelector('.stk-px small'), c = st.price / prevClose(st) - 1, dir = lastPx[t] != null ? Math.sign(st.price - lastPx[t]) : 0; lastPx[t] = st.price;
          setText(b, M(st.price), dir); if (sm) { sm.textContent = pct(c, 2); sm.className = cls(c); }
          const sp = row.querySelector('.stk-sp'); if (sp) sp.innerHTML = lineSvg(st.candles.slice(-30).map(x => x[3]), { w: 90, h: 30 });
        });
        const idx = document.querySelector('.stk-idx'); if (idx) { const d = parse(App.pages700.invest()); swap('.stk-idx', d); }
      } else if (App.invTab === 'trade' && App.v720 && App.v720.tTerm) {
        const act = document.activeElement; if (act && act.closest && act.closest('.tm-cols')) { /* keep typing undisturbed, update chart only */ }
        const d = parse('<div>' + App.v720.tTerm() + '</div>');
        for (const sel of ['.tm-head', '.tm-stats', '.tm-chart', '.tm-cols .ob', '.tr-book', '.tm-cta']) swap(sel, d);
        if (App.v700TrEst) App.v700TrEst();
      }
    }
    if (view === 'dashboard') { const d = parse('<div>' + App.dashboard() + '</div>'); swap('.pf', d); swap('.wl-grid', d); }
    if (view === 'portfolio') { const r = document.getElementById('pf-root'); if (r && App.v730.pfHTML) r.innerHTML = App.v730.pfHTML(); }
    /* open stock detail modal */
    const mb = document.querySelector('#modal-root .stk-head');
    if (mb) {
      const h3 = document.querySelector('#modal-root .modal-head h3'), t = h3 && h3.textContent.split('·')[0].trim(), st = t && v.stocks[t];
      if (st) { const c = st.price / prevClose(st) - 1, b = mb.querySelector('b'), sp = mb.querySelector('span'); const dir = lastPx['m' + t] != null ? Math.sign(st.price - lastPx['m' + t]) : 0; lastPx['m' + t] = st.price; setText(b, M(st.price), dir); if (sp) { sp.textContent = pct(c, 2); sp.className = cls(c); } const chart = document.querySelector('#modal-root .modal-body svg.ch'); if (chart) { const tmp = document.createElement('div'); tmp.innerHTML = candleSvg(st.candles, {}); if (tmp.firstChild) chart.outerHTML = tmp.innerHTML; } if (App.v700Est) App.v700Est(t); }
    }
  };

  let busy = false;
  const needs = () => { const view = App.view; return !!(document.querySelector('#modal-root .stk-head')) || view === 'invest' || view === 'dashboard' || view === 'portfolio'; };
  const tick = async () => {
    if (busy || document.visibilityState === 'hidden' || !S() || !needs()) return; busy = true;
    try { const { r, d } = await App.requestJson('/api/v730/live', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }); if (r.ok) { App.live = d; apply(d); patch(); } } catch (e) { } finally { busy = false; }
  };
  setInterval(tick, INTERVAL);
  /* extra info in the order estimate: liquidation price, used and available margin */
  const te = App.v700TrEst;
  if (te) App.v700TrEst = () => {
    te(); const el = document.getElementById('tr-est'); if (!el) return; const s = S(), a = (App.v700.C().trade || []).find(x => x.id === App.trAsset); if (!s || !a) return;
    const cs = s.v700.trading.c[a.id], px = cs[cs.length - 1][3], m = Number((document.getElementById('tr-m') || {}).value) || 0, l = Number((document.getElementById('tr-lev') || {}).value) || 1, used = s.v700.trading.pos.reduce((q, p) => q + p.margin, 0);
    el.insertAdjacentHTML('beforeend', `<div>Likuidasi LONG di <b>${App.v700.nice(px * (1 - .95 / l))}</b> · SHORT di <b>${App.v700.nice(px * (1 + .95 / l))}</b></div><div>Margin terpakai <b>${M(used)}</b> · tersedia <b>${M(Math.max(0, s.cash - m))}</b></div>${l >= 5 ? '<div class="neg">Leverage tinggi: untung dan rugi membesar, posisi mudah terlikuidasi.</div>' : ''}`);
  };
  App.v730 = Object.assign(App.v730 || {}, { applyLive: apply, liveTick: tick });
})();
