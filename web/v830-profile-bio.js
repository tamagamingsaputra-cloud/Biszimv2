/* BizSim v8.3.0 — character biodata wrapper. Stores optional player-entered bio locally; never invents personal facts. */
(() => {
  if (typeof App === 'undefined' || !App.v700) return;
  const { E, M, ic } = App.v700;
  const priorProfile = App.profile;
  const bioKey = () => `bizsim.bio.v830.${App.user?.id || 'guest'}`;
  const loadBio = () => { try { return JSON.parse(localStorage.getItem(bioKey()) || '{}') || {}; } catch (_) { return {}; } };
  const saveBio = b => { try { localStorage.setItem(bioKey(), JSON.stringify(b)); } catch (_) {} };
  const age = () => 6 + Math.floor(Math.max(0, (Number(App.state?.state?.day) || 1) - 1) / 56);
  const label = (v, fallback = 'Belum ditentukan') => E(v || fallback);
  const rows = b => [
    ['Tanggal lahir', b.birthDate], ['Jenis kelamin', b.gender], ['Tempat lahir', b.birthPlace],
    ['Kota domisili', b.city], ['Wali', b.guardian], ['Latar keluarga', b.family], ['Cita-cita', b.goal]
  ].map(([k,v]) => `<div class="bs830-bio-row"><span>${k}</span><b>${label(v)}</b></div>`).join('');
  App.v830EditBio = () => {
    const b = loadBio();
    App.modal('Ubah biodata karakter', `<p class="small muted">Isi sendiri informasi yang ingin ditampilkan. Kolom kosong tidak akan diisi dengan data rekaan.</p><div class="form-grid bs830-bio-form">
      <div class="field"><label>Tanggal lahir</label><input id="bio-birthDate" type="date" value="${E(b.birthDate || '')}"></div>
      <div class="field"><label>Jenis kelamin</label><select id="bio-gender"><option value="">Belum ditentukan</option>${['Laki-laki','Perempuan','Lainnya'].map(v=>`<option ${b.gender===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field"><label>Tempat lahir</label><input id="bio-birthPlace" maxlength="80" value="${E(b.birthPlace || '')}" placeholder="Kota / daerah"></div>
      <div class="field"><label>Kota domisili</label><input id="bio-city" maxlength="80" value="${E(b.city || '')}" placeholder="Kota domisili"></div>
      <div class="field"><label>Wali</label><input id="bio-guardian" maxlength="80" value="${E(b.guardian || '')}" placeholder="Nama wali (opsional)"></div>
      <div class="field"><label>Latar keluarga</label><select id="bio-family"><option value="">Belum ditentukan</option>${['Kurang mampu','Menengah','Menengah atas','Berkecukupan'].map(v=>`<option ${b.family===v?'selected':''}>${v}</option>`).join('')}</select></div>
      <div class="field" style="grid-column:1/-1"><label>Cita-cita</label><input id="bio-goal" maxlength="120" value="${E(b.goal || '')}" placeholder="Belum ditentukan"></div>
    </div><div class="small muted">Umur dihitung dari skala usia simulasi: mulai 6 tahun, bertambah 1 tahun setiap 56 hari game. Biodata tersimpan di perangkat ini.</div>`, `<button class="btn" onclick="closeModal()">Batal</button><button class="btn primary" onclick="App.v830SaveBio()">Simpan biodata</button>`);
  };
  App.v830SaveBio = () => {
    const get = id => document.getElementById('bio-'+id)?.value?.trim() || '';
    saveBio({birthDate:get('birthDate'),gender:get('gender'),birthPlace:get('birthPlace'),city:get('city'),guardian:get('guardian'),family:get('family'),goal:get('goal')});
    closeModal(); App.render(); App.toast?.('Biodata disimpan','Biodata karakter diperbarui pada perangkat ini.','success');
  };
  App.profile = () => {
    const b = loadBio(), s = App.state?.state || {}, career = s.career || {}, rep = Math.max(0, Math.min(100, Number(s.reputation) || 0));
    const level = rep >= 90 ? 5 : rep >= 75 ? 4 : rep >= 50 ? 3 : rep >= 25 ? 2 : 1;
    const portrait = App.playerPortrait ? App.playerPortrait(88) : `<div class="portrait-fallback">${ic('user',28)}</div>`;
    return `<section class="card bs830-profile-card"><div class="bs830-profile-head"><div class="bs830-avatar">${portrait}</div><div class="bs830-profile-name"><span class="small muted">Profil karakter</span><h2>${E(App.user?.name || 'Pemain')}</h2><p>${E(career.position || 'Belum bekerja')} · Umur simulasi ${age()} tahun</p></div><button class="btn" onclick="App.v710Creator && App.v710Creator()">${ic('user',14)} Avatar</button></div>
      <div class="bs830-profile-facts"><div><small>Umur</small><b>${age()} tahun</b></div><div><small>Pendidikan tertinggi</small><b>${label(career.educationLevel, 'Belum ada')}</b></div><div><small>Reputasi</small><b>${rep.toFixed(1)} / 100</b></div><div><small>Level karakter</small><b>Level ${level}</b></div></div>
      <div class="bs830-bio-title"><h3>Biodata</h3><button class="btn" onclick="App.v830EditBio()">Ubah biodata</button></div><div class="bs830-bio-rows">${rows(b)}</div>
      <p class="small muted bs830-bio-note">Umur mengikuti waktu simulasi (1 tahun usia = 56 hari game). Biodata kosong ditampilkan sebagai “Belum ditentukan”, bukan diisi otomatis dengan data fiktif.</p>
    </section>${priorProfile ? priorProfile() : ''}`;
  };
  if (App.state) App.render();
})();
