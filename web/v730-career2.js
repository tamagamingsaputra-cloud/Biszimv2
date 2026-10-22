/* ============================================================
   BizSim 7.3.1 — Career & Jobs update (poin: Career & Jobs)
   Yang sudah ada & TIDAK diubah: Current Career, Skills, Job
   Market list, Work History, YouTube Side Income (sudah benar
   sebagai side income opsional, bukan bisnis), Training &
   Education.
   Gap nyata yang diperbaiki di sini: backend sudah mencatat
   setiap lamaran ke s.applications (score & status), tapi
   belum pernah ditampilkan ke pemain — jadi pemain tidak tahu
   riwayat/status lamaran mereka. Juga menambah "Detail
   Pekerjaan" sebelum melamar, dengan estimasi peluang diterima
   (bukan kepastian) berdasarkan skill rata-rata vs syarat job.
   Additive: App.applyJob tetap dipakai (tidak diganti logikanya),
   hanya dibungkus agar bisa dipanggil dari detail modal juga.
   ============================================================ */
(() => {
  if (typeof App === 'undefined') return;
  const prevCareer = App.career;
  const prevApply = App.applyJob;

  const skillAvg = () => { const s = App.state.state.skills || {}, v = Object.values(s); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : 0; };

  const competitionTier = minSkill => minSkill >= 55 ? ['Tinggi', 'danger'] : minSkill >= 35 ? ['Sedang', 'warn'] : ['Rendah', 'success'];
  const chanceEstimate = minSkill => { const diff = skillAvg() - minSkill; return diff >= 10 ? ['Tinggi', 'success'] : diff >= -10 ? ['Sedang', 'warn'] : ['Rendah', 'danger']; };

  const applicationsHTML = () => {
    const apps = Array.isArray(App.state.applications) ? App.state.applications : [];
    if (!apps.length) return `<div class="empty">Belum ada lamaran. Pilih pekerjaan di Job Market dan lihat detailnya sebelum melamar.</div>`;
    return `<div class="list">${apps.slice(0, 8).map(a => `<div class="list-item"><div><div class="title">${a.title}</div><div class="meta">${a.company} · Score ${a.score}</div></div><span class="badge ${a.status === 'accepted' ? 'success' : 'warn'}">${a.status === 'accepted' ? 'Diterima' : 'Ditolak'}</span></div>`).join('')}</div>`;
  };

  App.career = () => `${prevCareer()}<div class="card" style="margin-top:16px"><div class="section-head"><h3 class="section-title">Riwayat & Status Lamaran</h3><span class="small muted">Tercatat otomatis setiap kali melamar</span></div>${applicationsHTML()}</div>`;

  /* ---------- Detail Pekerjaan sebelum melamar ---------- */
  App.openJobDetail = id => {
    const j = (App.jobs() || []).find(x => String(x.id) === String(id)); if (!j) return;
    const skills = App.state.state.skills || {}, comp = competitionTier(j.min_skill), chance = chanceEstimate(j.min_skill);
    App.modal(j.title, `
      <div class="detail-grid">
        <div class="detail"><span>Perusahaan</span><b>${j.company}</b></div>
        <div class="detail"><span>Industri</span><b>${j.industry}</b></div>
        <div class="detail"><span>Gaji</span><b>${App.money(j.salary)}</b></div>
        <div class="detail"><span>Pendidikan</span><b>${j.education || '-'}</b></div>
        <div class="detail"><span>Skill Minimum</span><b>${j.min_skill}</b></div>
        <div class="detail"><span>Skill Rata-rata Kamu</span><b>${Math.round(skillAvg())}</b></div>
        <div class="detail"><span>Tingkat Persaingan (estimasi)</span><b><span class="badge ${comp[1]}">${comp[0]}</span></b></div>
        <div class="detail"><span>Peluang Diterima (estimasi)</span><b><span class="badge ${chance[1]}">${chance[0]}</span></b></div>
      </div>
      <p class="small muted" style="margin-top:10px">Estimasi, bukan kepastian. Jam kerja mengikuti kebijakan masing-masing perusahaan dan belum dimodelkan terpisah di engine. Melamar akan langsung memicu evaluasi skill (interview) oleh sistem.</p>
      `, `<button class="btn" onclick="closeModal()">Tutup</button><button class="btn accent" onclick="App.applyJob('${j.id}')">Lamar & Interview</button>`);
  };

  /* bungkus applyJob supaya menutup modal detail (jika terbuka) sebelum toast muncul — logika asli tidak diubah */
  App.applyJob = async id => { if (typeof closeModal === 'function') closeModal(); return prevApply(id); };

  if (App.state) App.render();
})();
