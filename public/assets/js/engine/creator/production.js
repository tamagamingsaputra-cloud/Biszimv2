// CONTENT PRODUCTION QUEUE — rencana tahap, estimasi jam/biaya, ketersediaan waktu karakter, kualitas akhir.
import { PLATFORMS, STAGES, QUALITY, MUSIC, PACKAGING, THUMBS, ANGLES, OUTSOURCE_EDIT, NICHES } from '../../data/creator-platforms.js';
import { weekdayOf } from '../calendar.js';
import { TIME_RULES } from '../../data/time-rules.js';
import { NEEDS } from '../../data/needs-rules.js';
import { gearItem, dayOfG } from './rules.js';
import { hnorm, clamp } from '../rng.js';

const T = 48;
export const nicheOf = id => NICHES.find(n => n.id === id);
// Laju energi per jam dari aturan kebutuhan (proyeksi kasar antrean; nilai pasti dihitung engine/needs.js).
const ER = NEEDS.find(n => n.key === 'energy').rate;
export const angleOf = id => ANGLES.find(a => a.id === id);
const skillSpeed = s => 1.35 - 0.7 * clamp(s, 0, 100) / 100;

/** Waktu sibuk karakter pada tick g: tidur, sekolah, kerja, live. null = waktu luang. */
export function busyAt(ctx, C, g) {
  const d = dayOfG(g), h = (g % T) / 2, sch = ctx.schedule(d);
  if (h < TIME_RULES.sleep.to || h >= TIME_RULES.sleep.from) return 'tidur';
  if (sch.school && h >= sch.school[0] && h < sch.school[1]) return 'sekolah';
  if (sch.work && h >= sch.work[0] && h < sch.work[1]) return 'kerja';
  if (ctx.activityAt && ctx.activityAt(g)) return 'aktivitas';
  if (C.live && C.live.status === 'live') return 'live';
  return null;
}

/** Normalisasi & validasi spesifikasi dari wizard. Mengembalikan daftar error (bukan exception). */
export function validateSpec(spec, C) {
  const err = [], P = PLATFORMS[spec.platform];
  if (!P || P.status !== 'active') err.push('Pilih platform yang aktif.');
  else if (!C.accounts[spec.platform]) err.push(`Buat akun ${P.name} terlebih dahulu.`);
  const f = P?.formats?.[spec.format]; if (P && !f) err.push(`Format tidak didukung ${P.name}.`);
  if (!nicheOf(spec.niche)) err.push('Pilih topik.');
  if (f) {
    if (f.durations && !f.durations.includes(+spec.dur)) err.push('Durasi tidak valid untuk format ini.');
    if (f.photos && !f.photos.includes(+spec.photos)) err.push('Jumlah foto tidak valid.');
    if (f.kind !== 'video' && spec.thumb && spec.thumb !== 'auto' && !f.thumb) { /* abaikan */ }
  }
  if (!String(spec.title || '').trim()) err.push(f?.kind === 'video' && spec.platform === 'youtube' ? 'Judul wajib diisi.' : 'Judul/konsep singkat wajib diisi.');
  if (!QUALITY[spec.quality]) err.push('Pilih kualitas produksi.');
  if (!MUSIC[spec.music]) err.push('Pilih sumber musik.');
  if (!PACKAGING[spec.packaging]) err.push('Pilih gaya kemasan.');
  return err;
}

/** Skor judul/caption — aturan transparan, catatan ditampilkan ke pemain. */
export function textScore(spec) {
  const f = PLATFORMS[spec.platform]?.formats?.[spec.format]; if (!f) return { score: 0.5, notes: [] };
  const t = String(spec.title || '').trim(), cap = String(spec.caption || ''), notes = []; let s = 0.6;
  if (spec.platform === 'youtube' && (spec.format === 'long' || spec.format === 'shorts')) {
    const L = t.length;
    if (L < 15) { s -= 0.25; notes.push(`Judul ${L} karakter — terlalu pendek (ideal 25–70).`); } else if (L <= 70) { s += 0.2; notes.push(`Panjang judul ${L} karakter — ideal.`); } else if (L > 100) { s -= 0.15; notes.push('Judul terlalu panjang, terpotong di tampilan.'); }
    if (/\d/.test(t) || /\?/.test(t)) { s += 0.08; notes.push('Judul memuat angka/pertanyaan — membantu CTR.'); }
  } else {
    const L = cap.length || t.length;
    if (L < 15) { s -= 0.15; notes.push('Caption sangat pendek.'); } else if (L <= 160) { s += 0.12; notes.push('Panjang caption pas.'); } else if (L > 400) { s -= 0.08; notes.push('Caption terlalu panjang.'); }
  }
  if (f.hashtags) {
    const h = (cap.match(/#[\p{L}\p{N}_]+/gu) || []).length;
    if (h === 0) { s -= 0.06; notes.push('Belum ada hashtag (disarankan 2–5).'); } else if (h <= 5) { s += 0.08; notes.push(`${h} hashtag — sesuai.`); } else if (h > 10) { s -= 0.15; notes.push(`${h} hashtag — terlihat spam.`); }
  }
  const caps = (t.match(/[A-Z]/g) || []).length / Math.max(1, (t.match(/[A-Za-z]/g) || []).length);
  if (t.length > 10 && caps > 0.6) { s -= 0.15; notes.push('Judul hampir semua huruf kapital — terlihat spam.'); }
  return { score: clamp(s, 0.1, 1), notes };
}

/** Rencana tahap: jam & biaya per tahap. Dipakai untuk estimasi wizard maupun antrean. */
export function plan(spec, C) {
  const P = PLATFORMS[spec.platform], f = P.formats[spec.format], n = nicheOf(spec.niche), Q = QUALITY[spec.quality];
  const dur = f.durations ? +spec.dur : 0, photos = f.photos ? +spec.photos : 0;
  const base = f.baseHours({ dur, photos });
  const comp = gearItem('computer', C.gear.computer), sw = gearItem('software', C.gear.software);
  const stages = [];
  for (const st of STAGES) {
    const w = f.weights[st.key]; if (!w) continue;
    let h = base * w * Q.hours * skillSpeed(C.skills[st.skill] || 0);
    if (st.key === 'research' || st.key === 'script') h *= n.complexity;
    if (st.key === 'edit') h *= comp.speed * sw.speed;
    if (spec.focus === st.skill) h *= 1.1;
    if (spec.collab && st.key === 'prep') h *= 1.4;
    const outsourced = st.key === 'edit' && spec.outsource && f.kind !== 'text';
    stages.push({ key: st.key, hours: Math.max(0.5, Math.round(h * 2) / 2), done: 0, outsourced, cost: 0, paid: false });
  }
  // Biaya: produksi dasar × kualitas × niche, anggaran properti/lokasi (persiapan & rekam), lisensi musik, editor lepas.
  const baseCost = Math.round(f.baseCost * Q.cost * n.cost / 1000) * 1000, budget = +spec.budget || 0, music = MUSIC[spec.music]?.cost || 0;
  const tot = stages.reduce((s, x) => s + x.hours, 0);
  for (const s of stages) {
    s.cost = Math.round(baseCost * s.hours / tot);
    if (s.key === 'prep') s.cost += Math.round(budget * (stages.some(x => x.key === 'record') ? 0.4 : 1)) + music;
    if (s.key === 'record') s.cost += Math.round(budget * (stages.some(x => x.key === 'prep') ? 0.6 : 1));
    if (s.outsourced) s.cost += Math.round(s.hours * OUTSOURCE_EDIT.ratePerHour);
  }
  if (!stages.some(x => x.key === 'prep' || x.key === 'record') && (budget || music)) stages[0].cost += budget + music;
  return { stages, hoursTotal: stages.reduce((s, x) => s + x.hours, 0), selfHours: stages.filter(x => !x.outsourced).reduce((s, x) => s + x.hours, 0), costTotal: stages.reduce((s, x) => s + x.cost, 0), dur, photos };
}

/** Kualitas akhir saat produksi selesai (komponen ditampilkan di analytics). */
export function finalQuality(c, C, acc, ctx) {
  const P = PLATFORMS[c.platform], f = P.formats[c.format], n = nicheOf(c.niche), Q = QUALITY[c.quality], A = angleOf(c.angle) || {};
  const sk = k => (C.skills[k] || 0) / 100, cam = gearItem('camera', c.gearUsed.camera), mic = gearItem('audio', c.gearUsed.audio), light = gearItem('light', c.gearUsed.light);
  const comp = gearItem('computer', c.gearUsed.computer), sw = gearItem('software', c.gearUsed.software);
  const focus = k => c.focus === k ? 1.08 : 1;
  const angleFit = A.good?.includes(c.niche) ? 1.12 : 0.92;
  const idea = clamp((0.35 + 0.4 * sk('research') * focus('research') + 0.25 * sk('storytelling') * focus('storytelling')) * angleFit * Math.exp(0.18 * hnorm(ctx.seed, 'idea', c.id)), 0.1, 1.4);
  const budgetF = 1 + 0.12 * Math.log10(1 + (c.budget || 0) / (20_000 * n.cost));
  const eAvg = c.energyN ? c.energySum / c.energyN : 80, eF = 0.8 + 0.2 * eAvg / 100;
  const editSkill = c.outsource ? OUTSOURCE_EDIT.skill / 100 : sk('editing') * focus('editing');
  const equip = f.kind === 'text' ? 1 : (cam.rec * 0.4 + mic.audio * (f.kind === 'video' ? 0.3 : 0.1) + light.light * (f.kind === 'video' ? 0.3 : 0.5)) / (f.kind === 'video' ? 1 : 1);
  const prod = clamp((0.3 + 0.35 * sk('recording') * focus('recording') + 0.35 * editSkill) * equip * (comp.edit * sw.edit) * Q.q * budgetF * eF, 0.1, 1.6);
  const ts = textScore(c);
  const pack = clamp(0.4 + 0.35 * sk('marketing') * focus('marketing') + 0.35 * ts.score, 0.1, 1.3);
  const fit = (n.fit[c.platform] || 1) * (c.niche === acc.niche ? 1 : 0.85);
  let durFit = 1;
  if (f.optimum && c.dur) { const [lo, hi] = f.optimum; durFit = c.dur < lo ? 0.85 + 0.15 * c.dur / lo : c.dur > hi ? Math.max(0.55, 1 - 0.35 * Math.log2(c.dur / hi)) : 1; }
  const pk = PACKAGING[c.packaging], mu = MUSIC[c.music], th = f.thumb ? THUMBS[c.thumb] || THUMBS.auto : null;
  const ret = clamp(f.ret * (0.55 + 0.3 * prod + 0.3 * idea * (0.7 + 0.3 * sk('storytelling'))) * durFit * (A.ret || 1) * mu.ret * pk.ret * (0.85 + 0.15 * fit), 0.04, 0.97);
  const ctr = f.viewRule === 'click' ? clamp(f.ctr * (0.55 + 0.7 * pack) * pk.ctr * (th ? th.ctr : 1) * (0.85 + 0.15 * fit), 0.005, 0.25) : 1;
  const stay = f.viewRule === 'feed' ? clamp(f.stay * (0.78 + 0.18 * idea + 0.1 * pack) * Math.pow(pk.ctr, 0.4), 0.3, 0.99) : 1;
  const eng = clamp(f.eng * (0.5 + 0.45 * idea + 0.3 * sk('presentation')) * fit * (c.sponsorContract ? 0.9 : 1) * (pk.trust < 0 ? 0.85 : 1), 0.002, 0.25);
  const overall = clamp((idea * 0.3 + prod * 0.35 + pack * 0.15 + durFit * 0.2) * fit, 0.1, 1.5);
  return { idea, prod, pack, fit, durFit, ret, ctr, stay, eng, overall, textNotes: ts.notes, energyAvg: eAvg };
}

/** Perkiraan selesai antrean (simulasi maju tanpa acak: jam luang, batas jam/hari, energi kasar). */
export function etaQueue(C, ctx, horizonDays = 21) {
  const items = C.queue.map(id => C.contents.find(c => c.id === id)).filter(c => c && inProduction(c));
  const rem = new Map(items.map(c => [c.id, c.stages.map(s => ({ key: s.key, left: s.hours - s.done, outsourced: s.outsourced }))]));
  const out = {}; let g = ctx.g, todayH = C.hoursToday, day = dayOfG(g), energy = ctx.energy(), weekFree = ctx.weeklyFree();
  const end = g + horizonDays * T;
  while (g < end && Object.keys(out).length < items.length) {
    const d = dayOfG(g); if (d !== day) { day = d; todayH = 0; if (weekdayOf(d) === 1) weekFree = ctx.weeklyBudget(); }
    const busy = busyAt(ctx, { ...C, live: null }, g), h = (g % T) / 2;
    energy = Math.min(100, energy + (ER[{ tidur: 'sleep', sekolah: 'school', kerja: 'work', aktivitas: 'act' }[busy] || 'awake'] ?? 0) / 2);
    // editor lepas bekerja 08–20 paralel
    if (h >= TIME_RULES.freelanceEditor[0] && h < TIME_RULES.freelanceEditor[1]) for (const c of items) { const st = rem.get(c.id); const i = st.findIndex(s => s.left > 0); if (i >= 0 && st[i].outsourced) st[i].left -= 0.5; }
    if (!busy && todayH < C.settings.dailyHours && energy >= 20 && weekFree > 0) {
      const c = items.find(c => !out[c.id] && !c.paused && rem.get(c.id).some(s => s.left > 0 && !s.outsourced) && !blockedByOutsource(rem.get(c.id)));
      if (c) { const st = rem.get(c.id), s = st.find(s => s.left > 0); s.left -= 0.5; todayH += 0.5; weekFree -= 0.5; energy -= 3; }
    }
    for (const c of items) if (!out[c.id] && rem.get(c.id).every(s => s.left <= 0)) out[c.id] = g + 1;
    g++;
  }
  return out;
}
const blockedByOutsource = st => { const i = st.findIndex(s => s.left > 0); return i >= 0 && st[i].outsourced; };
export const inProduction = c => ['queued', 'research', 'script', 'prep', 'record', 'edit', 'review'].includes(c.status);
