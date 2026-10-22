// BizSim 7.3.0: live price route and a real task system (states, auto-completion from game state). SIMULATION ONLY.
import { DAY_HOOKS, news, fmt } from './v700-engine.mjs';
import { tickAll } from './v730-live.mjs';
export const VERSION = '7.3.0';
const SEED = [
  { rule: 'job', title: 'Dapatkan pekerjaan pertama', note: 'Lamar pekerjaan di Career & Jobs sampai diterima.', priority: 'high' },
  { rule: 'lesson', title: 'Selesaikan satu pelajaran', note: 'Daftar kursus di Training, lalu tunggu pelajaran selesai.', priority: 'high' },
  { rule: 'fund', need: 5e6, title: 'Kumpulkan dana darurat Rp5.000.000', note: 'Simpan uang tunai agar siap menghadapi kejadian tak terduga.', priority: 'normal' },
  { rule: 'invest', title: 'Lakukan investasi pertama', note: 'Beli saham, reksadana, obligasi, emas, atau deposito.', priority: 'normal' },
  { rule: 'business', title: 'Buka bisnis pertama', note: 'Kumpulkan modal dan buka bisnis di halaman Business.', priority: 'normal' },
  { rule: 'manual', title: 'Periksa risiko bisnis', note: 'Buka Operations & Risk dan tinjau kondisi bisnis Anda.', priority: 'low' }
];
export function ensure730(s) {
  if (!s.v730) { s.v730 = { version: VERSION, tasks: [], nid: 0 }; for (const t of SEED) addTask(s.v730, t, s.day || 1); }
  const x = s.v730; x.version = VERSION; x.tasks ||= []; x.nid ||= x.tasks.length; return x;
}
function addTask(x, t, day) { x.nid = (x.nid || 0) + 1; const task = { id: 't' + x.nid, title: t.title, note: t.note || '', priority: t.priority || 'normal', rule: t.rule || 'manual', need: t.need || 0, status: 'todo', created: day, doneDay: null, prog: null }; x.tasks.push(task); return task; }
function progress(s, t) {
  const v = s.v700 || {}, x = s.v720 || {}, v6 = s.v655 || {};
  switch (t.rule) {
    case 'job': { const ok = s.career?.status === 'employed'; return { done: ok, have: ok ? 1 : 0, need: 1, hint: 'Belum bekerja' }; }
    case 'lesson': { const n = Object.values(x.courses || {}).filter(c => c.done > 0).length + (v6.programs?.history?.length || 0); return { done: n > 0, have: Math.min(n, 1), need: 1, hint: 'Belum ada pelajaran selesai' }; }
    case 'fund': return { done: s.cash >= t.need, have: Math.max(0, Math.round(s.cash)), need: t.need, hint: `Cash ${fmt(Math.max(0, s.cash))} dari ${fmt(t.need)}` };
    case 'invest': { const n = Object.keys(v.holdings || {}).length + (v.bonds || []).length + Object.keys(v.funds?.units || {}).length + ((v.gold?.grams || 0) > 0 ? 1 : 0) + (v.deposits || []).length + (s.investments || []).length + (v.trading?.pos || []).length; return { done: n > 0, have: Math.min(n, 1), need: 1, hint: 'Belum ada investasi' }; }
    case 'business': { const n = (s.businesses || []).length; return { done: n > 0, have: Math.min(n, 1), need: 1, hint: 'Belum punya bisnis' }; }
    case 'incident': { const inc = (s.incidents || []).find(i => String(i.id) === String(t.ref)); const ok = !inc || (inc.status !== 'active' && inc.status !== 'recovery'); return { done: ok, have: ok ? 1 : 0, need: 1, hint: 'Insiden belum ditangani' }; }
    default: return null;
  }
}
export function evalTasks(s, h) {
  const x = ensure730(s); let changed = false;
  for (const inc of s.incidents || []) if ((inc.status === 'active' || inc.status === 'recovery') && !x.tasks.some(t => t.rule === 'incident' && String(t.ref) === String(inc.id))) { const t = addTask(x, { rule: 'incident', title: `Tangani insiden: ${({ fire: 'kebakaran', flood: 'banjir', theft: 'pencurian' })[inc.type] || 'insiden'}`, note: 'Buka Events Hub, tinjau laporan kerusakan, lalu perbaiki atau ajukan klaim asuransi.', priority: 'high' }, s.day); t.ref = String(inc.id); changed = true; }
  for (const t of x.tasks) {
    const p = progress(s, t); t.prog = p;
    if (p && p.done && t.status !== 'done') { t.status = 'done'; t.doneDay = s.day; t.auto = true; changed = true; s.reputation = Math.min(100, (s.reputation || 0) + 1); h?.addNotice?.(s, 'Tugas selesai', t.title, 'success'); }
  }
  x.tasks = x.tasks.filter(t => !(t.status === 'done' && t.rule === 'incident' && s.day - (t.doneDay || 0) > 14));
  return changed;
}
DAY_HOOKS.push((s, v, d, userId, h) => { evalTasks(s, h); });
export function catchup730(s, userId, h) { const had = !!s.v730; ensure730(s); return evalTasks(s, h) || !had; }
export async function route({ p, m, s, user, req, h }) {
  if (!p.startsWith('/api/v730/')) return null;
  const { json, body, clean, save } = h;
  if (m === 'POST' && p === '/api/v730/live') { if (!s.v700) return json({ error: 'Belum siap.' }, 400); return json(tickAll(s, user.id)); }
  if (m === 'POST' && p === '/api/v730/task') {
    const b = await body(req), x = ensure730(s), act = clean(b.action, 12), err = (msg, c = 400) => json({ error: msg }, c), done = async d => { await save(user, s); return json(d); };
    if (act === 'add') { const title = clean(b.title, 80); if (title.length < 3) return err('Judul tugas minimal 3 karakter.'); if (x.tasks.length >= 40) return err('Maksimal 40 tugas.'); const t = addTask(x, { title, note: clean(b.note, 200), priority: ['high', 'normal', 'low'].includes(b.priority) ? b.priority : 'normal' }, s.day); return done({ ok: true, task: t }); }
    const t = x.tasks.find(q => q.id === clean(b.id, 12)); if (!t) return err('Tugas tidak ditemukan.', 404);
    if (act === 'start') { if (t.status === 'done') return err('Tugas sudah selesai.'); t.status = 'doing'; return done({ ok: true, task: t }); }
    if (act === 'complete') { if (t.status === 'done') return err('Tugas sudah selesai.'); const p2 = progress(s, t); if (p2 && !p2.done) return err(`Syarat belum terpenuhi: ${p2.hint}.`); t.status = 'done'; t.doneDay = s.day; t.prog = p2; return done({ ok: true, task: t }); }
    if (act === 'reopen') { if (t.status !== 'done') return err('Tugas belum selesai.'); if (t.rule !== 'manual') return err('Tugas otomatis tidak bisa dibuka ulang.'); t.status = 'todo'; t.doneDay = null; return done({ ok: true, task: t }); }
    if (act === 'delete') { if (t.rule !== 'manual' && t.status !== 'done') return err('Tugas otomatis hanya bisa dihapus setelah selesai.'); x.tasks = x.tasks.filter(q => q !== t); return done({ ok: true }); }
    return err('Aksi tidak dikenal.');
  }
  return json({ error: 'API_NOT_FOUND' }, 404);
}
