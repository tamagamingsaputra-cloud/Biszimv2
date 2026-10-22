/* ============================================================
   BizSim 7.3.1 — Asset Market update (poin: Asset Market)
   Market yang sudah ada (app.js, dibungkus v655.js untuk Berita
   Pasar) sebenarnya sudah memakai harga nyata dari engine lokal
   (random walk per-aset dengan sentimen & volatilitas tetap,
   bukan angka acak saat render). Modul ini HANYA menambah yang
   belum ada di tampilan: badge SIMULATED, sentimen pasar,
   volatilitas per aset, average cost, tombol SELL terpisah dari
   BUY, realized P/L, serta validasi saldo tidak cukup / qty
   tidak valid sebelum transaksi dikirim.
   Additive: Berita Pasar (v655) tetap dipertahankan dan dipakai
   ulang (diambil dari HTML versi lama), bukan dihapus.
   ============================================================ */
(() => {
  if (typeof App === 'undefined') return;
  const prevMarket = App.marketPage;

  /* Volatilitas harian tetap per aset — nilai ini berasal dari engine/api.js
     (fungsi randomWalk), bukan dikarang untuk tampilan. */
  const VOL = { BTC: 0.035, BBCA: 0.018, TLKM: 0.02 };
  const CLASS = { BTC: 'Kripto', BBCA: 'Saham', TLKM: 'Saham' };
  const SENT = { bullish: ['Bullish', 'success'], neutral: ['Netral', 'blue'], bearish: ['Bearish', 'danger'], volatile: ['Volatil', 'warn'] };

  const marketSummary = () => {
    const tx = (App.state.transactions || []).filter(x => x.kind === 'SELL' && x.realized != null);
    return { realized: tx.reduce((a, x) => a + x.realized, 0), feeTotal: (App.state.transactions || []).reduce((a, x) => a + (x.fee || 0), 0), count: (App.state.transactions || []).length };
  };

  const assetCard = a => {
    const m = App.state.state.market || {}, prices = m.prices || {}, history = m.history || {};
    const p = prices[a] || 0, h = history[a] || [], prev = h.length > 1 ? h[h.length - 2] : p, ch = prev ? ((p - prev) / prev) * 100 : 0;
    const hold = App.state.state.portfolio?.holdings || {}, costBasis = App.state.state.portfolio?.costBasis || {};
    const q = Number(hold[a] || 0), cost = Number(costBasis[a] || 0), avgCost = q > 0 ? cost / q : 0, value = q * p, pnl = value - cost;
    return `<article class="card market-card">
      <div class="section-head"><div><h3 class="section-title">${a}</h3><span class="small muted">${CLASS[a] || 'Aset'} · Volatilitas harian ~${(VOL[a] * 100).toFixed(1)}%</span></div><span class="market-change ${ch >= 0 ? 'up' : 'down'}">${ch >= 0 ? '+' : ''}${ch.toFixed(2)}%</span></div>
      <div class="market-price">${App.money(p)}</div>
      ${App.marketSpark ? App.marketSpark(h) : ''}
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail"><span>Holding</span><b>${q}</b></div>
        <div class="detail"><span>Avg Cost</span><b>${q > 0 ? App.money(avgCost) : '-'}</b></div>
        <div class="detail"><span>Nilai Posisi</span><b>${App.money(value)}</b></div>
        <div class="detail"><span>Unrealized P/L</span><b class="${pnl >= 0 ? 'positive' : 'negative'}">${pnl >= 0 ? '+' : ''}${App.money(pnl)}</b></div>
      </div>
      <div class="actions" style="margin-top:12px">
        <button class="btn accent" style="flex:1" onclick="App.openTrade('${a}',${p},'BUY')">Beli</button>
        <button class="btn" style="flex:1" ${q > 0 ? '' : 'disabled'} onclick="App.openTrade('${a}',${p},'SELL')">Jual</button>
      </div>
    </article>`;
  };

  App.marketPage = () => {
    let prevHTML = ''; try { prevHTML = prevMarket ? prevMarket() : ''; } catch (e) { }
    const newsMark = '<div class="card" style="margin-top:16px">';
    const newsIdx = prevHTML.indexOf(newsMark);
    const newsHTML = newsIdx >= 0 ? prevHTML.slice(newsIdx) : '';
    const m = App.state.state.market || {}, sent = SENT[m.sentiment] || SENT.neutral, sum = marketSummary();
    const assets = ['BTC', 'BBCA', 'TLKM'];
    return `<div class="page-head"><div><h1>Asset Market</h1><p>Pasar trading simulasi penuh. Harga bergerak dari random walk engine lokal (drift + volatilitas per aset), bukan data pasar nyata dan bukan angka acak saat tampilan dirender.</p></div><div class="actions"><span class="badge warn">SIMULATED</span><span class="badge ${sent[1]}">Sentimen: ${sent[0]}</span></div></div>
      <div class="grid three">${assets.map(assetCard).join('')}</div>
      <div class="card" style="margin-top:16px"><div class="section-head"><h3 class="section-title">Ringkasan Transaksi Market</h3></div><div class="metric-row"><span>Realized P/L (sejak update ini)</span><b class="${sum.realized >= 0 ? 'positive' : 'negative'}">${sum.realized >= 0 ? '+' : ''}${App.money(sum.realized)}</b></div><div class="metric-row"><span>Total biaya transaksi</span><b>${App.money(sum.feeTotal)}</b></div><div class="metric-row"><span>Jumlah transaksi</span><b>${sum.count}</b></div></div>
      ${newsHTML}`;
  };

  /* ---------- modal Beli/Jual dengan validasi saldo & qty, loading & error state ---------- */
  App.openTrade = (asset, price, kind = 'BUY') => {
    const hold = App.state.state.portfolio?.holdings || {}, costBasis = App.state.state.portfolio?.costBasis || {};
    const q = Number(hold[asset] || 0), cost = Number(costBasis[asset] || 0), avgCost = q > 0 ? cost / q : 0;
    const isSell = kind === 'SELL';
    App.modal(`${isSell ? 'Jual' : 'Beli'} ${asset}`, `<div class="detail-grid">
        <div class="detail"><span>Market</span><b>SIMULATED</b></div>
        <div class="detail"><span>Harga</span><b>${App.money(price)}</b></div>
        <div class="detail"><span>Fee</span><b>0.25%</b></div>
        <div class="detail"><span>Saldo Tersedia</span><b>${App.money(App.state.state.cash)}</b></div>
        <div class="detail"><span>Holding Saat Ini</span><b>${q}</b></div>
        <div class="detail"><span>Avg Cost</span><b>${q > 0 ? App.money(avgCost) : '-'}</b></div>
      </div>
      <div class="field" style="margin-top:14px"><label>Jumlah${isSell ? ` (maks. ${q})` : ''}</label><input id="trade-qty" type="number" step="0.0001" min="0" value="${isSell ? (Math.min(q, 0.01) || q) : 0.01}"></div>
      <div id="trade-err" class="notice" style="display:none;margin-top:10px;background:#fdebed;border-color:#efc7ca;color:#a23d45"></div>`,
      `<button class="btn" onclick="closeModal()">Batal</button><button class="btn ${isSell ? '' : 'primary'}" id="trade-confirm" onclick="App.trade('${asset}',${price},'${kind}')">${isSell ? 'Konfirmasi Jual' : 'Konfirmasi Beli'}</button>`);
  };

  App.trade = async (asset, price, kind) => {
    const qEl = document.getElementById('trade-qty'), errEl = document.getElementById('trade-err'), btn = document.getElementById('trade-confirm');
    const showErr = msg => { if (errEl) { errEl.style.display = 'block'; errEl.textContent = msg; } };
    const q = Number(qEl && qEl.value);
    if (!q || q <= 0 || !Number.isFinite(q)) return showErr('Jumlah tidak valid. Masukkan angka lebih besar dari 0.');
    const hold = App.state.state.portfolio?.holdings || {};
    if (kind === 'BUY') {
      const total = Math.round(q * price), fee = Math.round(total * 0.0025);
      if (App.state.state.cash < total + fee) return showErr(`Saldo tidak cukup. Butuh ${App.money(total + fee)}, saldo ${App.money(App.state.state.cash)}.`);
    } else if (kind === 'SELL') {
      const held = Number(hold[asset] || 0);
      if (held < q) return showErr(`Holding ${asset} tidak cukup. Dimiliki ${held}, diminta ${q}.`);
    }
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
    try {
      const r = await App.request('/api/market/transaction', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ asset, price, quantity: q, kind }) });
      const d = await r.json();
      if (!r.ok) { if (btn) { btn.disabled = false; btn.textContent = kind === 'SELL' ? 'Konfirmasi Jual' : 'Konfirmasi Beli'; } return showErr(d.error || 'Transaksi gagal.'); }
      closeModal();
      App.toast('Transaksi berhasil', `${kind === 'SELL' ? 'Jual' : 'Beli'} ${asset} · Total ${App.money(d.total)} · Fee ${App.money(d.fee)}${d.realized != null ? ` · Realized ${d.realized >= 0 ? '+' : ''}${App.money(d.realized)}` : ''}`, 'success');
      await App.refresh();
    } catch (e) { if (btn) { btn.disabled = false; btn.textContent = kind === 'SELL' ? 'Konfirmasi Jual' : 'Konfirmasi Beli'; } showErr('Koneksi gagal. Coba lagi.'); }
  };

  if (App.state) App.render();
})();
