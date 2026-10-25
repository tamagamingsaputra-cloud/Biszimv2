// Buat Konten — wizard 10 langkah. Estimasi jam & biaya berasal dari CR.estimate() (rencana engine), bukan angka UI.
import { E, C, PRE, CR, PLATFORMS, NICHES, ACTIVE_PLATFORMS, fN, fInt, fHours, fmtG, pIcon, pName, nName, thumb, res, emptyBox, rp, gOfDay, T } from './common.js';
import { icon, esc, openDialog } from '../../ui/ui.js';
import { ANGLES, QUALITY, BUDGETS, MUSIC, PACKAGING, THUMBS, OUTSOURCE_EDIT, CREATOR_SKILLS, EQUIPMENT, STAGES } from '../../data/creator-platforms.js';
import { competition } from '../../engine/creator/audience.js';
import { gearItem } from '../../engine/creator/rules.js';

const STEPS = ['Platform', 'Format', 'Topik', 'Ide & judul', 'Durasi / isi', 'Kualitas', 'Peralatan & skill', 'Anggaran', 'Mulai produksi', 'Tinjau & terbitkan'];
let WZ = null;
const fresh = () => ({ step: 0, maxStep: 0, draftId: null, done: null, spec: { platform: null, format: null, niche: null, angle: 'tutorial', title: '', caption: '', concept: '', dur: 0, photos: 0, quality: 'standard', budget: 0, music: 'library', packaging: 'honest', thumb: 'text', focus: '', outsource: false, sponsorContract: '', disclosure: false, collab: '', affiliate: false, after: 'manual', schDay: 1, schTime: 38, premiere: false } });

function fmtOf(s) { return PLATFORMS[s.platform]?.formats?.[s.format]; }
function stepError(i) {
  const s = WZ.spec, c = C(), f = fmtOf(s);
  switch (i) {
    case 0: return !s.platform ? 'Pilih platform.' : !c.accounts[s.platform] ? `Buat akun ${pName(s.platform)} dulu.` : null;
    case 1: return !f ? 'Pilih format.' : CR.formatLocksFor(s.platform, s.format)[0] || null;
    case 2: return !s.niche ? 'Pilih topik.' : null;
    case 3: return !s.title.trim() ? (f?.kind === 'text' ? 'Tulis isi singkat postingan.' : 'Judul / konsep singkat wajib diisi.') : null;
    case 4: return f?.durations && !f.durations.includes(+s.dur) ? 'Pilih durasi.' : f?.photos && !f.photos.includes(+s.photos) ? 'Pilih jumlah foto.' : null;
    case 7: { if (s.sponsorContract && !s.disclosure) return 'Konten bersponsor wajib diberi label kerja sama (disclosure).'; return null; }
    case 8: return s.after === 'schedule' && schedG() <= E.S.clock.g ? 'Waktu jadwal harus di masa depan.' : null;
    default: return null;
  }
}
const schedG = () => gOfDay(E.dayNow() + +WZ.spec.schDay) + +WZ.spec.schTime;
function specOut() {
  const s = WZ.spec, f = fmtOf(s);
  return { ...s, dur: f?.durations ? +s.dur : 0, photos: f?.photos ? +s.photos : 0, budget: +s.budget, focus: s.focus || null, sponsorContract: s.sponsorContract ? +s.sponsorContract : null, collab: s.collab || null, scheduleG: s.after === 'schedule' ? schedG() : null, thumb: f?.thumb ? s.thumb : 'auto', music: f?.kind === 'video' || f?.kind === 'story' ? s.music : 'none' };
}

function choice(name, val, cur, title, sub = '', dis = '') {
  return `<label class="choice ${String(cur) === String(val) ? 'on' : ''} ${dis ? 'dis' : ''}"><input type="radio" name="${name}" value="${esc(String(val))}" ${String(cur) === String(val) ? 'checked' : ''} ${dis ? 'disabled' : ''}><span class="t">${title}</span>${sub ? `<span class="subtle s">${sub}</span>` : ''}${dis ? `<span class="s neg-t">${esc(dis)}</span>` : ''}</label>`;
}

function body() {
  const s = WZ.spec, c = C(), P = PLATFORMS[s.platform], f = fmtOf(s), d0 = E.dayNow();
  switch (WZ.step) {
    case 0: return `<h2>1 · Pilih platform</h2><p class="subtle">Setiap platform punya format, pola tayangan, dan aturan monetisasi sendiri.</p><div class="choices c3">${ACTIVE_PLATFORMS.map(pid => { const acc = c.accounts[pid], Pp = PLATFORMS[pid]; return choice('platform', pid, s.platform, `${pIcon(pid, 14)} ${Pp.name}`, acc ? `@${esc(acc.handle)} · ${fInt(acc.followers)} ${Pp.followerShort}` : '', acc ? '' : 'Belum ada akun'); }).join('')}</div>${ACTIVE_PLATFORMS.some(p => !c.accounts[p]) ? `<p class="subtle s"><a href="#accounts">Buat akun platform lain</a></p>` : ''}`;
    case 1: return `<h2>2 · Format konten di ${P.name}</h2><p class="subtle">Hanya format yang didukung ${P.name} versi simulasi yang ditampilkan.</p><div class="choices c2">${Object.entries(P.formats).map(([fid, F]) => { const lk = CR.formatLocksFor(s.platform, fid)[0]; const life = F.expiresH ? `Hilang setelah ${F.expiresH} jam` : F.halfLife <= 1.6 ? 'Cepat naik, cepat turun' : F.halfLife <= 3 ? 'Umur sedang' : 'Umur panjang, bisa dicari lagi'; return choice('format', fid, s.format, F.name, `${life}${F.monetize.length ? '' : ' · tanpa monetisasi langsung'}`, lk || ''); }).join('')}</div>`;
    case 2: {
      const fr = (E.S.clock.g % T) / T;
      return `<h2>3 · Topik</h2><p class="subtle">Indeks tren dan persaingan berasal dari engine dan berubah setiap hari. <b>Tidak ada topik yang menjamin viral.</b></p>
      <div class="choices c3">${NICHES.map(n => { const tr = CR.trend(E.S.seed, s.platform, n.id, d0 + fr), cp = competition(E.S.seed, s.platform, n.id, d0); return choice('niche', n.id, s.niche, n.name, `Tren ${tr.toLocaleString("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} · persaingan ${Math.round(cp * 100)}% · cocok ${n.fit[s.platform] >= 1.15 ? 'tinggi' : n.fit[s.platform] >= 1 ? 'baik' : n.fit[s.platform] >= 0.85 ? 'sedang' : 'rendah'}${c.accounts[s.platform]?.niche === n.id ? ' · topik akun' : ''}`); }).join('')}</div>
      <h3>Sudut ide</h3><div class="choices c3">${ANGLES.map(a => choice('angle', a.id, s.angle, a.name, s.niche && a.good.includes(s.niche) ? 'Cocok dengan topik ini' : '')).join('')}</div>`;
    }
    case 3: {
      const est = CR.estimate(specOut()), notes = est.ok ? est.text.notes : [];
      const isText = f.kind === 'text';
      return `<h2>4 · Ide, judul & caption</h2>
      <label class="field"><span>${isText ? 'Isi postingan' : P.id === 'youtube' ? 'Judul' : 'Judul / hook pembuka'}</span><input class="input" name="title" maxlength="120" value="${esc(s.title)}" placeholder="${isText ? 'mis. Kalian lebih suka video tutorial atau review?' : 'mis. 5 Cara Hemat Uang Jajan yang Benar-benar Bekerja'}"></label>
      ${!isText ? `<label class="field"><span>${f.hashtags ? 'Caption & hashtag' : 'Deskripsi'}</span><textarea class="input" name="caption" rows="3" maxlength="600" placeholder="${f.hashtags ? 'Tulis caption singkat lalu 2–5 hashtag relevan, mis. #hemat #pelajar' : 'Ringkasan isi video'}">${esc(s.caption)}</textarea></label>` : ''}
      <label class="field"><span>Konsep (opsional, catatan untuk dirimu)</span><textarea class="input" name="concept" rows="2" maxlength="400">${esc(s.concept)}</textarea></label>
      <div id="wz-notes">${notesHtml(notes)}</div>`;
    }
    case 4: {
      if (f.durations) return `<h2>5 · Durasi</h2><p class="subtle">Durasi memengaruhi jam produksi, retensi, dan syarat monetisasi tertentu. Rentang paling nyaman ditonton (simulasi): ${f.optimum ? `${lab(f.optimum[0])}–${lab(f.optimum[1])}` : '—'}.</p><div class="choices c4">${f.durations.map(d => choice('dur', d, s.dur, lab(d), P.adsRule?.minDur && d >= P.adsRule.minDur && s.platform === 'tiktok' ? 'Memenuhi syarat program kreator ≥1 menit' : '')).join('')}</div>`;
      if (f.photos) return `<h2>5 · Jumlah foto</h2><p class="subtle">Lebih banyak slide = lebih lama dibuat, tetapi bisa menaikkan waktu lihat & simpan.</p><div class="choices c4">${f.photos.map(n => choice('photos', n, s.photos, `${n} foto`)).join('')}</div>`;
      return `<h2>5 · Format isi</h2><p class="subtle">${f.name} tidak punya pilihan durasi. Lanjutkan.</p>`;
    }
    case 5: return `<h2>6 · Kualitas produksi</h2><div class="choices c4">${Object.entries(QUALITY).map(([k, q]) => choice('quality', k, s.quality, q.name, `Jam ×${q.hours} · biaya ×${q.cost}`)).join('')}</div>
      <h3>Gaya kemasan judul/visual</h3><div class="choices c3">${Object.entries(PACKAGING).map(([k, p]) => choice('packaging', k, s.packaging, p.name, k === 'clickbait' ? 'Klik naik, tapi penonton kecewa bila isi tidak sesuai: retensi & reputasi turun' : k === 'catchy' ? 'Sedikit menaikkan klik' : 'Membangun kepercayaan')).join('')}</div>
      ${f.thumb ? `<h3>Thumbnail</h3><div class="choices c4">${Object.entries(THUMBS).map(([k, t]) => choice('thumb', k, s.thumb, t.name)).join('')}</div>` : ''}
      ${f.kind === 'video' || f.kind === 'story' ? `<h3>Musik / audio</h3><div class="choices c2">${Object.entries(MUSIC).map(([k, m]) => choice('music', k, s.music, m.name, m.cost ? `Rp ${fInt(m.cost)}` : k === 'unlicensed' ? 'Risiko klaim hak cipta, audio dibisukan, atau strike' : 'Gratis')).join('')}</div>` : ''}`;
    case 6: {
      const sk = c.skills, rel = [...new Set(STAGES.filter(st => f.weights[st.key]).map(st => st.skill))];
      return `<h2>7 · Peralatan & skill</h2><p class="subtle">Peralatan yang sedang dipakai ikut menentukan kualitas & kecepatan. Ganti di <a href="#gear">Equipment & Skills</a>.</p>
      <div class="table-wrap"><table class="table"><tbody>${Object.entries(EQUIPMENT).map(([k, cat]) => `<tr><td class="subtle">${cat.name}</td><td>${esc(gearItem(k, c.gear[k]).name)}</td></tr>`).join('')}</tbody></table></div>
      <h3>Skill yang dipakai format ini</h3><div class="skill-bars">${rel.map(k => `<div><div class="row between s"><span>${CREATOR_SKILLS[k].name}</span><span class="num">${Math.round(sk[k])}/100</span></div><div class="bar"><i style="width:${sk[k]}%"></i></div></div>`).join('')}</div>
      <label class="field"><span>Fokus skill untuk konten ini</span><select class="input" name="focus"><option value="">Tanpa fokus khusus</option>${rel.map(k => `<option value="${k}" ${s.focus === k ? 'selected' : ''}>${CREATOR_SKILLS[k].name} — mutu aspek ini +8%, jam tahapnya +10%</option>`).join('')}</select></label>
      ${f.weights.edit && f.kind !== 'text' ? `<label class="check"><input type="checkbox" name="outsource" ${s.outsource ? 'checked' : ''}><span><b>Pakai ${OUTSOURCE_EDIT.name}</b> — Rp ${fInt(OUTSOURCE_EDIT.ratePerHour)}/jam, skill editing setara ${OUTSOURCE_EDIT.skill}. Bekerja 08.00–20.00 paralel dengan karakter, tidak memakai waktu luangmu.</span></label>` : ''}`;
    }
    case 7: {
      const acc = c.accounts[s.platform], ks = c.contracts.filter(k => k.status === 'aktif' && k.platform === s.platform), cbs = (c.collabs || []).filter(k => k.status === 'diterima' && !k.used && k.platform === s.platform && (k.until == null || k.until >= d0));
      const affOk = acc && acc.programs?.affiliate?.status === 'active' && f.monetize.includes('affiliate');
      return `<h2>8 · Anggaran</h2><p class="subtle">Anggaran untuk properti, lokasi, bahan. Menaikkan mutu produksi dengan hasil yang makin kecil (diminishing return) — bukan jaminan performa.</p>
      <div class="choices c5">${BUDGETS.map(b => choice('budget', b, s.budget, b ? `Rp ${fN(b)}` : 'Rp 0')).join('')}</div>
      <h3>Kerja sama (opsional)</h3>
      <label class="field"><span>Kontrak sponsor</span><select class="input" name="sponsorContract"><option value="">Tanpa sponsor</option>${ks.map(k => `<option value="${k.id}" ${+s.sponsorContract === k.id ? 'selected' : ''} ${k.format !== s.format ? 'disabled' : ''}>${esc(k.brand)} — ${PLATFORMS[k.platform].formats[k.format].name} (${k.delivered.length}/${k.qty})${k.format !== s.format ? ' · format berbeda' : ''}</option>`).join('')}</select></label>
      ${s.sponsorContract ? `<label class="check"><input type="checkbox" name="disclosure" ${s.disclosure ? 'checked' : ''}><span>Beri label <b>kerja sama berbayar</b> (wajib). Konten bersponsor tanpa label melanggar kebijakan simulasi.</span></label>` : ''}
      <label class="field"><span>Kolaborasi kreator</span><select class="input" name="collab"><option value="">Tanpa kolaborasi</option>${cbs.map(k => `<option value="${k.id}" ${s.collab === k.id ? 'selected' : ''}>${esc(k.name)} (${fN(k.followers)} audiens)</option>`).join('')}</select></label>
      ${!cbs.length ? '<p class="subtle s" style="margin-top:-6px">Ajak kreator lain di <a href="#sponsors">Sponsorship & Collab</a>.</p>' : ''}
      ${f.monetize.includes('affiliate') ? `<label class="check ${affOk ? '' : 'dis'}"><input type="checkbox" name="affiliate" ${s.affiliate ? 'checked' : ''} ${affOk ? '' : 'disabled'}><span>Sertakan tautan affiliate${affOk ? '' : ' — program affiliate belum aktif untuk akun ini'}</span></label>` : ''}`;
    }
    case 8: {
      const est = CR.estimate(specOut()), dh = c.settings.dailyHours;
      if (!est.ok) return `<h2>9 · Mulai produksi</h2><div class="msg error">${icon('alert')}<span>${est.errors.map(esc).join('<br>')}</span></div>`;
      const days = Math.ceil(est.selfHours / dh);
      return `<h2>9 · Ringkasan & mulai produksi</h2>
      <div class="row" style="gap:14px;align-items:flex-start">${thumb({ ...specOut(), dur: +s.dur }, 84)}<div><b>${esc(s.title)}</b><div class="subtle s">${pName(s.platform)} · ${f.name} · ${nName(s.niche)} · ${QUALITY[s.quality].name}</div></div></div>
      <div class="table-wrap" style="margin-top:12px"><table class="table"><thead><tr><th>Tahap</th><th class="r">Jam</th><th class="r">Biaya</th></tr></thead><tbody>${est.stages.map(x => `<tr><td>${STAGES.find(z => z.key === x.key).label}${x.outsourced ? ' <span class="chip">editor lepas</span>' : ''}</td><td class="r num">${fHours(x.hours)}</td><td class="r num">${rp(x.cost)}</td></tr>`).join('')}<tr><td><b>Total</b></td><td class="r num"><b>${fHours(est.hoursTotal)}</b></td><td class="r num"><b>${rp(est.costTotal)}</b></td></tr></tbody></table></div>
      <p class="subtle s">Jam karaktermu ${fHours(est.selfHours)} — dengan batas ${dh} jam/hari, minimal ±${days} hari kerja, di luar jam tidur, sekolah, dan kerja. Biaya dibayar saat tiap tahap dimulai; jika saldo kurang, produksi menunggu.</p>
      <h3>Setelah produksi selesai</h3><div class="choices c3">${choice('after', 'manual', s.after, 'Review dulu', 'Status Siap diterbitkan — kamu yang menerbitkan')}${choice('after', 'auto', s.after, 'Terbit otomatis', 'Langsung terbit saat selesai')}${f.schedule ? choice('after', 'schedule', s.after, 'Jadwalkan', 'Terbit pada waktu yang dipilih') : ''}</div>
      ${s.after === 'schedule' ? `<div class="row wrap" style="gap:10px"><label class="field"><span>Hari</span><select class="input" name="schDay">${Array.from({ length: 14 }, (_, i) => `<option value="${i}" ${+s.schDay === i ? 'selected' : ''}>${i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : `+${i} hari`} (H${d0 + i + 1})</option>`).join('')}</select></label><label class="field"><span>Jam</span><select class="input" name="schTime">${Array.from({ length: 48 }, (_, i) => `<option value="${i}" ${+s.schTime === i ? 'selected' : ''}>${String(Math.floor(i / 2)).padStart(2, '0')}.${i % 2 ? '30' : '00'}</option>`).join('')}</select></label></div>
        ${f.premiere ? `<label class="check"><input type="checkbox" name="premiere" ${s.premiere ? 'checked' : ''}><span>Tayangkan sebagai <b>Premiere</b> (penonton menunggu bersama; dorongan awal lebih kuat dari follower)</span></label>` : ''}
        <p class="subtle s">Jika produksi belum selesai saat jadwal tiba, konten terbit segera setelah selesai.</p>` : ''}`;
    }
    case 9: {
      const it = WZ.done && c.contents.find(k => k.id === WZ.done);
      return `<h2>10 · Review & terbit</h2>${it ? `<div class="msg ok">${icon('check')}<span><b>${esc(it.title)}</b> masuk antrean produksi (${statusLabel(it)}). Progres berjalan mengikuti waktu simulasi.</span></div>` : ''}
      <p>Langkah ini dilakukan setelah produksi selesai: di <a href="#queue">Antrean Produksi</a>, konten berstatus <b>Siap diterbitkan</b> bisa direview (skor mutu akhir), lalu diterbitkan sekarang, dijadwalkan, atau dibatalkan.</p>
      <div class="row wrap" style="gap:8px"><a class="btn primary" href="#queue">${icon('layers')}Buka Antrean Produksi</a><button class="btn" data-a="new">${icon('edit')}Buat konten lain</button>${it ? `<button class="btn" data-a="dupdone">${icon('copy')}Gandakan konsep ini</button>` : ''}</div>`;
    }
  }
}
const notesHtml = notes => `<div class="msg info">${icon('info')}<span><b>Catatan teks (aturan transparan):</b><br>${notes.length ? notes.map(esc).join('<br>') : 'Belum ada catatan.'}</span></div>`;
const lab = d => d >= 60 ? `${d / 60} menit` : `${d} detik`;
const statusLabel = it => ({ queued: 'In Queue' }[it.status] || it.status);

function side() {
  const s = WZ.spec;
  if (!s.platform || !s.format || !s.niche) return `<div class="subtle s">Ringkasan estimasi muncul setelah platform, format, dan topik dipilih.</div>`;
  const est = CR.estimate(specOut());
  if (!est.ok) return `<div class="subtle s">${est.errors.map(esc).join('<br>')}</div>`;
  return `<dl class="dl"><dt>Jam kerja</dt><dd class="num">${fHours(est.hoursTotal)}</dd><dt>Jam karakter</dt><dd class="num">${fHours(est.selfHours)}</dd><dt>Biaya produksi</dt><dd class="num">${rp(est.costTotal)}</dd><dt>Saldo</dt><dd class="num">${rp(E.S.player.balance)}</dd></dl>
  <div class="divider"></div><div class="subtle s"><b>Yang memengaruhi performa:</b> mutu ide (riset, storytelling, sudut), mutu produksi (skill, alat, kualitas, anggaran, energi), kemasan (judul, thumbnail), kecocokan topik–platform–akun, jam terbit, tren, persaingan, reputasi, dan keberuntungan distribusi. Hasil akhir baru terlihat setelah terbit.</div>`;
}

function shell() {
  const err = stepError(WZ.step), last = WZ.step === 8, review = WZ.step === 9;
  return `<div class="wz">
    <ol class="wz-steps" aria-label="Langkah">${STEPS.map((l, i) => `<li class="${i === WZ.step ? 'cur' : i <= WZ.maxStep ? 'ok' : ''}"><button type="button" data-step="${i}" ${i > WZ.maxStep || (i === 9 && !WZ.done) || (WZ.done && i < 9) ? 'disabled' : ''}><span class="n">${i + 1}</span><span class="l">${l}</span></button></li>`).join('')}</ol>
    <div class="grid wz-grid"><section class="panel"><div class="panel-b wz-body" id="wz-body">${WZ.draftId ? `<div class="chip" style="margin-bottom:8px">Melanjutkan draft #${WZ.draftId}</div>` : ''}${body()}<div id="wz-err">${err && WZ.touched ? `<div class="msg error">${icon('alert')}<span>${esc(err)}</span></div>` : ''}</div></div></section>
    <aside class="panel wz-side"><div class="panel-h"><h2>Estimasi engine</h2></div><div class="panel-b" id="wz-side">${side()}</div></aside></div>
    ${review ? '' : `<div class="wz-bar"><button class="btn" data-a="back" ${WZ.step === 0 ? 'disabled' : ''}>Kembali</button><span class="spacer"></span>
      ${WZ.spec.platform && WZ.spec.format && WZ.spec.niche ? `<button class="btn" data-a="draft">Simpan draft</button>` : ''}
      ${WZ.step > 0 ? `<button class="btn ghost" data-a="cancel">Batal</button>` : ''}
      ${last ? `<button class="btn primary" data-a="start" ${err ? 'disabled' : ''}>${icon('play')}Mulai produksi</button>` : `<button class="btn primary" data-a="next">Lanjut</button>`}</div>`}
  </div>`;
}

export function create({ route }) {
  const c = C();
  if (route[1] === 'draft' && route[2]) {
    const id = +route[2]; const k = c.contents.find(x => x.id === id && x.status === 'draft');
    if (!WZ || WZ.draftId !== id) {
      if (!k) return { html: emptyBox('Draft tidak ditemukan', 'Draft mungkin sudah diproduksi atau dihapus.', '<a class="btn sm" href="#planner">Ke Planner</a>') };
      WZ = fresh(); WZ.draftId = id; Object.assign(WZ.spec, { ...k, sponsorContract: k.sponsorContract || '', collab: k.collab || '', focus: k.focus || '', after: k.after === 'schedule' ? 'manual' : k.after });
      WZ.maxStep = 8; WZ.step = 3;
    }
  } else if (!WZ || WZ.draftId || (WZ.done && WZ.step !== 9)) WZ = fresh();
  const pre = PRE.pid; if (pre && !WZ.spec.platform) { WZ.spec.platform = pre; WZ.maxStep = WZ.step = 1; } PRE.pid = null;
  if (!Object.keys(c.accounts).length) return { html: `<section class="panel"><div class="panel-b">${emptyBox('Belum ada akun kreator', 'Konten hanya bisa dibuat untuk akun yang sudah ada.', '<a class="btn sm primary" href="#accounts">Buat akun</a>')}</div></section>` };
  let root;
  const paint = () => { root.innerHTML = shell(); };
  const go = i => { WZ.step = i; WZ.maxStep = Math.max(WZ.maxStep, i); WZ.touched = false; paint(); root.querySelector('.wz-body h2')?.scrollIntoView?.({ block: 'nearest' }); };
  const onInput = e => {
    const t = e.target, n = t.name; if (!n || !(n in WZ.spec)) return;
    const s = WZ.spec, v = t.type === 'checkbox' ? t.checked : t.value;
    s[n] = v;
    if (n === 'platform') { s.format = null; s.sponsorContract = ''; s.collab = ''; s.affiliate = false; if (!s.niche && C().accounts[v]) s.niche = C().accounts[v].niche; }
    if (n === 'format') { const f = fmtOf(s); s.dur = f.defDur || f.durations?.[0] || 0; s.photos = f.defPhotos || f.photos?.[0] || 0; if (!f.thumb) s.thumb = 'auto'; else if (s.thumb === 'auto') s.thumb = 'text'; if (!f.schedule && s.after === 'schedule') s.after = 'manual'; }
    if (n === 'sponsorContract' && !v) s.disclosure = false;
    if (t.type === 'radio' || t.type === 'checkbox' || t.tagName === 'SELECT') paint();
    else { const sd = root.querySelector('#wz-side'); if (sd) sd.innerHTML = side(); const nb = root.querySelector('#wz-notes'); if (nb) { const est = CR.estimate(specOut()); nb.innerHTML = notesHtml(est.ok ? est.text.notes : []); } }
  };
  const onClick = e => {
    const st = e.target.closest('[data-step]'); if (st && !st.disabled) return go(+st.dataset.step);
    const a = e.target.closest('[data-a]')?.dataset.a; if (!a) return;
    if (a === 'back') return go(Math.max(0, WZ.step - 1));
    if (a === 'next') { const err = stepError(WZ.step); if (err) { WZ.touched = true; paint(); return; } return go(WZ.step + 1); }
    if (a === 'cancel') { if (confirm(WZ.draftId ? 'Tutup tanpa menyimpan perubahan draft?' : 'Batalkan pembuatan konten? Isian yang belum disimpan hilang.')) { WZ = fresh(); paint(); } return; }
    if (a === 'draft') { const r = CR.saveDraft(specOut(), WZ.draftId); res(r, x => { if (x.ok) { WZ = fresh(); location.hash = '#planner'; } }); return; }
    if (a === 'new') { WZ = fresh(); if (location.hash !== '#create') location.hash = '#create'; else paint(); return; }
    if (a === 'dupdone') { const r = CR.duplicate(WZ.done); res(r, x => { if (x.ok) { WZ = null; location.hash = `#create/draft/${x.data?.id ?? ''}`; } }); return; }
    if (a === 'start') {
      for (let i = 0; i <= 8; i++) { const err = stepError(i); if (err) { WZ.touched = true; go(i); return; } }
      const est = CR.estimate(specOut());
      openDialog(`<div class="dlg-h"><h2>Mulai produksi?</h2><button class="icon-btn" data-close aria-label="Tutup">${icon('x')}</button></div><div class="dlg-b stack">
        <p style="margin:0"><b>${esc(WZ.spec.title)}</b> — ${pName(WZ.spec.platform)} ${fmtOf(WZ.spec).name}</p>
        <dl class="dl"><dt>Total biaya (bertahap)</dt><dd class="num">${rp(est.costTotal)}</dd><dt>Jam kerja</dt><dd class="num">${fHours(est.hoursTotal)}</dd><dt>Saldo sekarang</dt><dd class="num">${rp(E.S.player.balance)}</dd></dl>
        <p class="subtle s" style="margin:0">Biaya yang sudah dibayar tidak kembali jika produksi dibatalkan. Performa setelah terbit tidak dijamin.</p></div>
        <div class="dlg-f"><button class="btn" data-close>Batal</button><button class="btn primary" id="go">Mulai produksi</button></div>`, { onMount: d => d.querySelector('#go').addEventListener('click', () => {
        const r = CR.startProduction(specOut(), WZ.draftId); d.close();
        if (!r.ok) return res(r);
        WZ.done = r.data?.id ?? C().contents[C().contents.length - 1].id; WZ.draftId = null; WZ.maxStep = 9; res(r); if (location.hash.startsWith('#create/')) history.replaceState(null, '', '#create'); go(9);
      }) });
    }
  };
  return { keep: true, update: kind => { if (kind === 'change' && root) { const sd = root.querySelector('#wz-side'); if (sd) sd.innerHTML = side(); } },
    html: '<div id="wz-root"></div>', mount: el => { root = el.querySelector('#wz-root'); paint(); root.addEventListener('change', onInput); root.addEventListener('input', e => { if (e.target.matches('input[type=text],input:not([type]),textarea')) onInput(e); }); root.addEventListener('click', onClick); } };
}
