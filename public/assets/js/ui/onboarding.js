// Pembuatan karakter — biodata disimpan di server (POST /api/profile). Skenario standar: mulai sebagai calon siswa SD.
import { post, patch } from './api.js';
import { icon, esc, rp, openDialog } from './ui.js';

export const CITIES = [
  ['Pacitan', 'Jawa Timur'], ['Malang', 'Jawa Timur'], ['Surabaya', 'Jawa Timur'], ['Sleman', 'DI Yogyakarta'],
  ['Yogyakarta', 'DI Yogyakarta'], ['Semarang', 'Jawa Tengah'], ['Bandung', 'Jawa Barat'], ['Jakarta Selatan', 'DKI Jakarta'],
];
export const ASPIRATIONS = ['Belum ditentukan', 'Wirausaha', 'Guru', 'Dokter', 'Programmer', 'Akuntan', 'Mekanik', 'Kreator konten', 'Petani modern'];
// Rentang usia 6–7 tahun pada hari ke-1 kalender hidup (5 Januari 2026).
const MIN_BIRTH = '2018-01-06', MAX_BIRTH = '2020-01-05';

/** Menampilkan formulir karakter. Resolve dengan state server setelah profil tersimpan. */
export function createCharacter(st, { cancellable = false, seed = 20260105 } = {}) {
  return new Promise(resolve => {
    const fam = st.family || {};
    const wrap = document.createElement('div'); wrap.className = 'onb'; wrap.setAttribute('role', 'dialog'); wrap.setAttribute('aria-modal', 'true'); wrap.setAttribute('aria-labelledby', 'onb-t');
    wrap.innerHTML = `
    <form class="onb-card" novalidate>
      <div class="onb-head">
        <div class="brand"><span class="brand-mark">BZ</span> BIZSIM</div>
        <span class="sim-badge live">Simulated</span>
        ${cancellable ? `<button type="button" class="icon-btn" data-cancel aria-label="Batal" style="margin-left:auto">${icon('x')}</button>` : ''}
      </div>
      <h1 id="onb-t">Buat karakter</h1>
      <p class="muted" style="margin:4px 0 0">Skenario standar: karakter berusia 6–7 tahun dan belum bersekolah. Langkah pertama setelah ini adalah memilih Sekolah Dasar di menu Education. Semua data adalah fiktif di dalam game.</p>
      <div class="onb-grid">
        <label class="field span2"><span>Nama lengkap karakter</span><input class="input" name="name" required minlength="2" maxlength="40" autocomplete="off" placeholder="mis. Sari Wulandari"></label>
        <fieldset class="field span2"><legend>Pilih avatar karakter</legend><div class="avatar-picker">${['avatar-1','avatar-2','avatar-3','avatar-4','avatar-5','avatar-6'].map((id, i) => `<label class="avatar-option"><input type="radio" name="avatarId" value="${id}" ${i === 0 ? 'checked' : ''}><img src="assets/img/avatars/${id}.svg" alt="Avatar ${i + 1}"><span>Avatar ${i + 1}</span></label>`).join('')}</div></fieldset>
        <label class="field"><span>Nama panggilan</span><input class="input" name="nickname" maxlength="20" autocomplete="off" placeholder="mis. Sari"></label>
        <fieldset class="field"><legend>Jenis kelamin</legend><div class="seg" role="radiogroup"><label><input type="radio" name="gender" value="L" checked> Laki-laki</label><label><input type="radio" name="gender" value="P"> Perempuan</label></div></fieldset>
        <label class="field"><span>Tanggal lahir</span><input class="input" type="date" name="birthDate" required min="${MIN_BIRTH}" max="${MAX_BIRTH}" value="2019-07-14"><small class="subtle" data-age></small></label>
        <label class="field"><span>Tempat lahir</span><input class="input" name="birthPlace" maxlength="40" value="Pacitan"></label>
        <label class="field"><span>Kota domisili</span><select class="input" name="city">${CITIES.map(([c, p]) => `<option value="${c}" data-prov="${p}">${c} — ${p}</option>`).join('')}</select><small class="subtle">Sekolah di kota lain memakai biaya transportasi 2×.</small></label>
        <label class="field"><span>Nama wali</span><input class="input" name="guardian" maxlength="40" placeholder="mis. Ibu Rahma"></label>
        <label class="field"><span>Cita-cita (bisa diubah nanti)</span><select class="input" name="aspiration">${ASPIRATIONS.map(a => `<option>${a}</option>`).join('')}</select></label>
        <label class="field"><span>Seed simulasi</span><input class="input" name="seed" inputmode="numeric" value="${seed}"><small class="subtle">Seed yang sama menghasilkan pasar & bank soal yang sama (reproducible).</small></label>
      </div>
      <fieldset class="field" style="margin-top:14px"><legend>Latar ekonomi keluarga</legend>
        <div class="onb-fam">${Object.entries(fam).map(([k, f], i) => `<label class="onb-opt"><input type="radio" name="family" value="${k}" ${k === 'menengah' ? 'checked' : ''}><span><b>${esc(f.label)}</b><br><span class="subtle">Dana pendidikan dari wali ${rp(f.perTerm)} per periode · uang saku ${rp(f.allowance)}/hari sekolah</span></span></label>`).join('')}</div>
        <small class="subtle">Dana wali hanya dipakai untuk tagihan pendidikan dan selalu ditampilkan sebelum dibayar. Keluarga prasejahtera otomatis mendapat bantuan biaya buku & transportasi.</small>
      </fieldset>
      <div class="msg error" data-err hidden></div>
      <div class="row" style="justify-content:flex-end;margin-top:16px;gap:8px">
        ${cancellable ? '<button type="button" class="btn" data-cancel>Batal</button>' : ''}
        <button class="btn primary" type="submit">${icon('check')}Simpan & mulai dari SD</button>
      </div>
      <p class="subtle" style="margin:10px 0 0">Profil, progres pendidikan, nilai ujian, dan catatan kelulusan disimpan di server BizSim — bukan di browser.</p>
    </form>`;
    document.body.appendChild(wrap);
    const f = wrap.querySelector('form'), ageEl = wrap.querySelector('[data-age]'), err = wrap.querySelector('[data-err]');
    const showAge = () => {
      const v = f.birthDate.value; if (!v) { ageEl.textContent = ''; return; }
      const b = new Date(v + 'T00:00:00Z'), t = new Date(Date.UTC(2026, 0, 5));
      let a = t.getUTCFullYear() - b.getUTCFullYear(); if (t.getUTCMonth() < b.getUTCMonth() || (t.getUTCMonth() === b.getUTCMonth() && t.getUTCDate() < b.getUTCDate())) a--;
      ageEl.textContent = `Usia pada hari ke-1: ${a} tahun${a < 6 || a > 7 ? ' — skenario standar butuh 6–7 tahun' : ''}`;
    };
    f.birthDate.addEventListener('input', showAge); showAge();
    wrap.querySelectorAll('[data-cancel]').forEach(b => b.addEventListener('click', () => { wrap.remove(); resolve(null); }));
    f.addEventListener('submit', async ev => {
      ev.preventDefault(); err.hidden = true;
      const fd = Object.fromEntries(new FormData(f));
      if ((fd.name || '').trim().length < 2) { err.hidden = false; err.innerHTML = `${icon('alert')}<span>Nama karakter minimal 2 huruf.</span>`; f.name.focus(); return; }
      const city = CITIES.find(c => c[0] === fd.city);
      const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Menyimpan…';
      const r = await post('/api/profile', { ...fd, province: city?.[1] || '', seed: Number(fd.seed) || 20260105, gameDay: 0 });
      if (!r.ok) { btn.disabled = false; btn.innerHTML = `${icon('check')}Simpan & mulai dari SD`; err.hidden = false; err.innerHTML = `${icon('alert')}<span>${esc(r.error)}</span>`; return; }
      wrap.remove(); resolve(r);
    });
    setTimeout(() => f.name.focus(), 30);
  });
}

/** Dialog ubah biodata (disimpan di server lewat PATCH /api/profile). Resolve dengan state server baru atau null. */
export function editProfile(P, { gameDay = 0 } = {}) {
  return new Promise(resolve => {
    let done = null;
    const cityOpts = CITIES.some(c => c[0] === P.city) ? CITIES : [[P.city, P.province || ''], ...CITIES];
    const aspOpts = ASPIRATIONS.includes(P.aspiration) || !P.aspiration ? ASPIRATIONS : [P.aspiration, ...ASPIRATIONS];
    const sel = (a, b) => a === b ? 'selected' : '';
    const d = openDialog(`<form id="pf-form" novalidate>
      <div class="dlg-h"><h2>Ubah profil</h2><button type="button" class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div>
      <div class="dlg-b"><div class="onb-grid" style="margin-top:0">
        <label class="field span2"><span>Nama lengkap</span><input class="input" name="name" maxlength="40" value="${esc(P.name || '')}"></label>
        <fieldset class="field span2"><legend>Avatar karakter</legend><div class="avatar-picker">${['avatar-1','avatar-2','avatar-3','avatar-4','avatar-5','avatar-6'].map((id, i) => `<label class="avatar-option"><input type="radio" name="avatarId" value="${id}" ${(P.avatarId || 'avatar-1') === id ? 'checked' : ''}><img src="assets/img/avatars/${id}.svg" alt="Avatar ${i + 1}"><span>Avatar ${i + 1}</span></label>`).join('')}</div></fieldset>
        <label class="field"><span>Nama panggilan</span><input class="input" name="nickname" maxlength="20" value="${esc(P.nickname || '')}"></label>
        <fieldset class="field"><legend>Jenis kelamin</legend><div class="seg" role="radiogroup"><label><input type="radio" name="gender" value="L" ${P.gender !== 'P' ? 'checked' : ''}> Laki-laki</label><label><input type="radio" name="gender" value="P" ${P.gender === 'P' ? 'checked' : ''}> Perempuan</label></div></fieldset>
        <label class="field"><span>Tanggal lahir</span><input class="input" type="date" name="birthDate" min="${MIN_BIRTH}" max="${MAX_BIRTH}" value="${esc(P.birthDate || '')}"><small class="subtle">Rentang skenario: usia 6–7 tahun di hari ke-1. Umur & batas usia aktivitas dihitung ulang.</small></label>
        <label class="field"><span>Tempat lahir</span><input class="input" name="birthPlace" maxlength="40" value="${esc(P.birthPlace || '')}"></label>
        <label class="field"><span>Kota domisili</span><select class="input" name="city">${cityOpts.map(([c, p]) => `<option value="${esc(c)}" data-prov="${esc(p)}" ${sel(c, P.city)}>${esc(c)}${p ? ' — ' + esc(p) : ''}</option>`).join('')}</select><small class="subtle">Berlaku untuk biaya transportasi tagihan berikutnya; tagihan yang sudah terbit tidak berubah.</small></label>
        <label class="field"><span>Nama wali</span><input class="input" name="guardian" maxlength="40" value="${esc(P.guardian || '')}"></label>
        <label class="field span2"><span>Cita-cita</span><select class="input" name="aspiration">${aspOpts.map(a => `<option ${sel(a, P.aspiration || 'Belum ditentukan')}>${esc(a)}</option>`).join('')}</select></label>
      </div>
      <p class="subtle" style="margin:12px 0 0">Latar keluarga dan seed simulasi tidak bisa diubah karena memengaruhi dana wali dan reprodusibilitas. Nama di ijazah yang sudah terbit tetap sesuai catatan saat lulus.</p>
      <div class="msg error" data-err hidden style="margin-top:10px"></div></div>
      <div class="dlg-f"><button type="button" class="btn" data-close>Batal</button><button class="btn primary" type="submit">${icon('check')}Simpan perubahan</button></div>
    </form>`, {
      onMount(dl) {
        const f = dl.querySelector('form'), err = dl.querySelector('[data-err]');
        f.addEventListener('submit', async ev => {
          ev.preventDefault(); err.hidden = true;
          const fd = Object.fromEntries(new FormData(f));
          if ((fd.name || '').trim().length < 2) { err.hidden = false; err.innerHTML = `${icon('alert')}<span>Nama karakter minimal 2 huruf.</span>`; return; }
          const opt = f.city.selectedOptions[0];
          const btn = f.querySelector('[type=submit]'); btn.disabled = true; btn.textContent = 'Menyimpan…';
          const r = await patch('/api/profile', { ...fd, province: opt?.dataset.prov || '' });
          if (!r.ok) { btn.disabled = false; btn.innerHTML = `${icon('check')}Simpan perubahan`; err.hidden = false; err.innerHTML = `${icon('alert')}<span>${esc(r.error)}</span>`; return; }
          done = r; dl.close();
        });
      }
    });
    d.addEventListener('close', () => resolve(done));
  });
}
