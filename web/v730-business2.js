/* ============================================================
   BizSim 7.3.1 — Business update (poin: Business)
   Katalog bisnis (App.business, grid "business-catalog") sudah
   berisi >10 jenis bisnis nyata dari businessCatalog di engine.
   TAPI tombol "Open Business" di tiap kartu memanggil
   App.openCreateBusiness(catalogId) sementara fungsi lama
   mengabaikan catalogId dan memakai form generik (nama/tipe/
   lokasi) tanpa mengirim catalogId ke server — sehingga
   /api/businesses SELALU menolak dengan 404 "Pilihan bisnis
   tidak ditemukan." Modul ini memperbaiki bug tersebut dan
   menambahkan: detail bisnis per katalog, simulasi kelayakan
   (parameter awal nyata, bukan proyeksi untung), status
   terkunci dengan alasan jelas, dan konfirmasi modal.
   Additive: App.business (grid katalog) dan operational panel
   (upgradeSection, growth) yang sudah ada TIDAK diubah.
   ============================================================ */
(() => {
  if (typeof App === 'undefined') return;

  const complexityTier = minSkill => minSkill >= 45 ? ['Kompleks', 'danger'] : minSkill >= 30 ? ['Menengah', 'warn'] : ['Sederhana', 'success'];
  /* Risiko dasar ini adalah nilai tetap yang dipakai engine (engine/api.js) untuk
     SEMUA bisnis baru saat dibuat — bukan angka berbeda per katalog, dan bukan
     dikarang untuk tampilan. */
  const BASE_RISK = [['Kebakaran', 8], ['Pencurian', 8], ['Banjir', 5], ['Kerusakan alat', 8], ['Cyber', 4], ['Gangguan supplier', 8], ['Recall produk', 3]];

  App.openCreateBusiness = catalogId => {
    const x = (App.businessCatalog || []).find(c => c.id === catalogId);
    if (!x) return App.toast ? App.toast('Bisnis tidak ditemukan', 'Katalog bisnis tidak valid.', 'danger') : alert('Katalog bisnis tidak ditemukan.');
    const skills = App.state.state.skills || {}, have = Number(skills[x.skill] || 0), cash = Number(App.state.state.cash || 0);
    const canCash = cash >= x.startup, canSkill = have >= x.minSkill, ok = canCash && canSkill;
    const tier = complexityTier(x.minSkill), workingCapital3mo = x.monthlyFixed * 3;
    const reasons = [];
    if (!canCash) reasons.push(`Modal kurang ${App.money(x.startup - cash)}`);
    if (!canSkill) reasons.push(`Skill ${x.skill} kurang ${Math.ceil(x.minSkill - have)} poin`);

    App.modal(`${x.name}`, `
      ${App.image ? App.image(`business/${x.image}`, x.name) : ''}
      <p class="small muted" style="margin-top:8px">${x.description || ''}</p>
      <div class="detail-grid" style="margin-top:10px">
        <div class="detail"><span>Kategori</span><b>${x.category}</b></div>
        <div class="detail"><span>Modal Awal</span><b>${App.money(x.startup)}</b></div>
        <div class="detail"><span>Biaya Tetap / Bulan</span><b>${App.money(x.monthlyFixed)}</b></div>
        <div class="detail"><span>Estimasi Modal Kerja (buffer 3 bulan)</span><b>${App.money(workingCapital3mo)}</b></div>
        <div class="detail"><span>Skill Dibutuhkan</span><b>${x.skill} ≥ ${x.minSkill} (kamu ${Math.round(have)})</b></div>
        <div class="detail"><span>Kapasitas Operasional</span><b>${x.capacity}/hari</b></div>
        <div class="detail"><span>Kualitas Awal</span><b>${x.quality}/100</b></div>
        <div class="detail"><span>Kompleksitas Manajemen</span><b><span class="badge ${tier[1]}">${tier[0]}</span></b></div>
        <div class="detail"><span>Ketersediaan Lokasi</span><b>Bebas dipilih</b></div>
      </div>
      <div class="progress" style="margin-top:10px"><i style="width:${Math.min(100, have / x.minSkill * 100)}%"></i></div>

      <div class="section-head" style="margin-top:16px"><h3 class="section-title">Risiko Dasar Operasional</h3></div>
      <div class="detail-grid">${BASE_RISK.map(r => `<div class="detail"><span>${r[0]}</span><b>${r[1]}%</b></div>`).join('')}</div>
      <p class="small muted" style="margin-top:6px">Peluang kejadian per periode simulasi, berlaku sama untuk semua bisnis saat ini. Bukan jaminan — kejadian nyata tetap acak dalam simulasi.</p>

      <div class="section-head" style="margin-top:16px"><h3 class="section-title">Simulasi Kelayakan — Parameter Awal</h3></div>
      <div class="detail-grid">
        <div class="detail"><span>Harga Jual Awal</span><b>${App.money(x.price)}</b></div>
        <div class="detail"><span>Status Modal</span><b class="${canCash ? 'positive' : 'negative'}">${canCash ? 'Cukup' : 'Belum cukup'}</b></div>
        <div class="detail"><span>Status Skill</span><b class="${canSkill ? 'positive' : 'negative'}">${canSkill ? 'Memenuhi' : 'Belum memenuhi'}</b></div>
      </div>
      <p class="small muted" style="margin-top:6px">Ini parameter awal nyata jika bisnis dibuka — bukan proyeksi untung. Laba/rugi ditentukan oleh penjualan, biaya, dan keputusanmu setelah bisnis berjalan.</p>

      <div class="form-grid" style="margin-top:16px">
        <div class="field"><label>Nama Bisnis (opsional)</label><input id="biz-name" value="${x.name}"></div>
        <div class="field"><label>Lokasi</label><select id="biz-location"><option>Jakarta Selatan</option><option>Bandung</option><option>Surabaya</option><option>Yogyakarta</option></select></div>
      </div>
      ${!ok ? `<div class="notice" style="margin-top:10px;background:#fdebed;border-color:#efc7ca;color:#a23d45">Terkunci: ${reasons.join(' · ')}</div>` : ''}
      <div id="biz-err" class="notice" style="display:none;margin-top:10px;background:#fdebed;border-color:#efc7ca;color:#a23d45"></div>
      `,
      `<button class="btn" onclick="closeModal()">Batal</button><button class="btn primary" id="biz-confirm" ${ok ? '' : 'disabled'} onclick="App.createBusinessSubmit('${x.id}')">Buka Bisnis · ${App.money(x.startup)}</button>`);
  };

  App.createBusinessSubmit = async catalogId => {
    const btn = document.getElementById('biz-confirm'), errEl = document.getElementById('biz-err');
    const showErr = msg => { if (errEl) { errEl.style.display = 'block'; errEl.textContent = msg; } };
    const nameEl = document.getElementById('biz-name'), locEl = document.getElementById('biz-location');
    if (btn) { btn.disabled = true; btn.textContent = 'Memproses...'; }
    try {
      const r = await App.request('/api/businesses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ catalogId, name: nameEl && nameEl.value, location: locEl && locEl.value }) });
      const d = await r.json();
      if (!r.ok) { if (btn) { btn.disabled = false; btn.textContent = 'Coba Lagi'; } return showErr(d.error || 'Gagal membuka bisnis.'); }
      closeModal();
      App.toast('Bisnis dibuka', `${d.business ? d.business.name : 'Bisnis baru'} mulai beroperasi.`, 'success');
      await App.refresh();
    } catch (e) { if (btn) { btn.disabled = false; btn.textContent = 'Coba Lagi'; } showErr('Koneksi gagal. Coba lagi.'); }
  };

  if (App.state) App.render();
})();
