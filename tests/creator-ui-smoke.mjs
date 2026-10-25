// Smoke test render UI Creator Studio (tanpa browser): node tests/creator-ui-smoke.mjs
import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';
import { DAY_HOOKS } from '../netlify/functions/v700-engine.mjs';
import { route, catalog } from '../netlify/functions/v731-creator.mjs';
const h = { json: (o, c = 200) => ({ status: c, o }), body: async r => r, clean: (v, n) => String(v ?? '').trim().slice(0, n), save: async () => {}, addNotice: () => {} };
const s = { day: 1, cash: 30000000, career: { status: 'employed' }, skills: {} };
const call = (p, b = {}) => route({ p: '/api/v731/creator/' + p, m: 'POST', s, user: { id: 'u1' }, req: b, h });
const tick = n => { for (let i = 0; i < n; i++) { s.day++; for (const f of DAY_HOOKS) f(s, {}, s.day, 'u1', h); } };
for (const pl of ['youtube', 'tiktok', 'instagram']) await call('account', { platform: pl, handle: pl + 'han' });
await call('content', { platform: 'youtube', type: 'long', topic: 'gaming', quality: 'high', title: 'A', start: true }); await call('content', { platform: 'tiktok', type: 'video', topic: 'komedi', quality: 'low', title: 'Klip komedi', start: true });
await call('content', { platform: 'instagram', type: 'reels', topic: 'kuliner', quality: 'medium', title: 'Reel kuliner' });
tick(3); const done1 = s.v731.creator.queue.find(q => q.platform === 'tiktok'); tick(8);
for (const q of [...s.v731.creator.queue]) if (q.status === 'ready') await call('content/publish', { id: q.id });
tick(2); s.v731.creator.accounts.youtube.fol = 5000; s.v731.creator.accounts.youtube.watch = 5000; tick(8);
await call('live/start', { platform: 'youtube', topic: 'gaming', quality: 'medium', title: 'Live', planned: 60 }); await call('live/tick');
const els = {}; const html = [];
const App = { state: { state: s }, user: { name: 'Tamz' }, view: 'creator', money: n => 'Rp' + Math.round(n).toLocaleString('id-ID'), toast() {}, modal() {}, hydrate() {}, render() {}, request: async () => ({ ok: true, json: async () => catalog() }),
  v700: { M: n => 'Rp' + Math.round(n).toLocaleString('id-ID'), ic: () => '<i/>', E: t => String(t ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]), lineSvg: () => '<svg/>', bars: () => '<div/>' }, creatorPage: () => '<div>LEGACY</div>' };
const ctx = vm.createContext({ App, setInterval: () => 1, clearInterval() {}, document: { getElementById: () => null }, closeModal() {}, console });
vm.runInContext(fs.readFileSync(new URL('../web/v730-creator2.js', import.meta.url), 'utf8'), ctx);
App._crCat = catalog(); // katalog sudah dimuat
for (const tab of ['overview', 'accounts', 'platform', 'planner', 'create', 'queue', 'published', 'live', 'analytics', 'money', 'sponsor', 'skills']) {
  App.crs.tab = tab; for (const pl of ['youtube', 'tiktok', 'instagram']) { App.crs.plat = pl; App.crs.form.plat = pl; App.crs.live.plat = pl; const out = App.creatorPage(); assert.ok(out.length > 100, tab); assert.ok(!out.includes('Gagal menampilkan'), `render ${tab}/${pl}: ${out.match(/Gagal menampilkan[^<]*/)}`); assert.ok(!out.includes('undefined') && !out.includes('NaN'), `undefined/NaN di ${tab}/${pl}`); }
}
// live non aktif
await call('live/end'); App.crs.tab = 'live'; assert.ok(App.creatorPage().includes('Start Live'));
console.log('UI SMOKE LULUS: 12 tab/area x 3 platform dirender tanpa error/NaN');
