// Uji end-to-end memakai engine sebenarnya (jalur yang sama dengan mode lokal/Netlify): node tests/e2e-engine-test.mjs
import assert from 'node:assert/strict';
import handler from '../web/engine/api.js';
let cookie = '';
const call = async (path, method = 'GET', body) => { const r = await handler(new Request('http://x' + path, { method, headers: { 'Content-Type': 'application/json', ...(cookie ? { Cookie: cookie } : {}) }, body: body ? JSON.stringify(body) : undefined })); const sc = r.headers.get('set-cookie'); if (sc) cookie = sc.split(';')[0]; let j = null; try { j = await r.json(); } catch { } return { status: r.status, j }; };
const email = `e2e${Date.now()}@bizsim.local`;
let r = await call('/api/auth/register', 'POST', { name: 'E2E', email, password: 'secret123' }); assert.equal(r.status, 201, 'register');
// Career: lamar -> tercatat di state.applications
const jobs = (await call('/api/jobs')).j.jobs.sort((a, b) => a.min_skill - b.min_skill); r = await call('/api/jobs/apply', 'POST', { jobId: jobs[0].id }); assert.equal(r.status, 201);
let me = (await call('/api/me')).j; assert.ok(me.state.applications.length >= 1); console.log('PASS career: lamaran tercatat ->', r.j.status, '(skor', r.j.score + ')');
// Business: katalog & bug catalogId
const cat = (await call('/api/businesses/catalog')).j.businesses; assert.ok(cat.length >= 10); console.log('PASS business: katalog', cat.length, 'jenis');
assert.equal((await call('/api/businesses', 'POST', { name: 'x', type: 'Retail' })).status, 404, 'tanpa catalogId ditolak 404 (bug lama form generik)');
r = await call('/api/businesses', 'POST', { catalogId: cat[0].id, name: 'Tes', location: 'Bandung' }); console.log('PASS business: dengan catalogId ->', r.status, r.j.error || 'dibuat'); assert.ok([201, 400].includes(r.status));
// Kumpulkan modal lewat gaji (pemain baru mulai dari Rp0)
for (let i = 0; i < 40; i++) { await call('/api/simulate/day', 'POST'); me = (await call('/api/me')).j; if (me.state.cash >= 3000000) break; } console.log('kas setelah bekerja:', Math.round(me.state.cash), 'hari', me.state.day);
// Market: SIMULATED + beli/jual + realized
const mk = (await call('/api/market')).j; assert.equal(mk.mode, 'SIMULATED');
me = (await call('/api/me')).j; const px = me.state.market.prices.BBCA;
r = await call('/api/market/transaction', 'POST', { asset: 'BBCA', price: px, quantity: 20, kind: 'BUY' }); assert.equal(r.status, 200); const buyFee = r.j.fee;
r = await call('/api/market/transaction', 'POST', { asset: 'BBCA', price: Math.round(px * 1.1), quantity: 20, kind: 'SELL' }); assert.equal(r.status, 200); assert.equal(typeof r.j.realized, 'number'); console.log('PASS market: BUY lalu SELL ->', 'realized', r.j.realized, '(fee beli', buyFee + ', fee jual', r.j.fee + ')');
me = (await call('/api/me')).j; assert.equal(me.state.transactions[0].realized, r.j.realized, 'realized tersimpan di riwayat transaksi');
// beri modal lewat pekerjaan tidak mungkin instan; uji SELL tanpa holding & validasi
r = await call('/api/market/transaction', 'POST', { asset: 'BBCA', price: px, quantity: 5, kind: 'SELL' }); assert.equal(r.status, 400); console.log('PASS market: jual tanpa holding ditolak:', r.j.error);
// Creator Studio end-to-end
assert.equal((await call('/api/v731/creator/catalog')).j.platforms.tiktok.n, 'TikTok');
assert.equal((await call('/api/v731/creator/account', 'POST', { platform: 'tiktok', handle: 'e2e_tt' })).status, 200);
r = await call('/api/v731/creator/content', 'POST', { platform: 'tiktok', type: 'video', topic: 'komedi', quality: 'low', title: 'Klip uji', start: true }); assert.equal(r.status, 200); console.log('PASS creator: konten masuk antrean');
for (let i = 0; i < 6; i++) await call('/api/simulate/day', 'POST');
me = (await call('/api/me')).j; assert.ok(me.state.v731 && me.state.v731.creator.accounts.tiktok, 'state kreator ada di snapshot'); const qi = me.state.v731.creator.queue[0] || me.state.v731.creator.published[0]; assert.ok(qi, 'konten ada'); console.log('PASS creator: progres dari state engine ->', qi.status, Math.round(qi.progress || 100) + '%'); if (qi.status === 'ready') { r = await call('/api/v731/creator/content/publish', 'POST', { id: qi.id }); assert.equal(r.status, 200); console.log('PASS creator: publish -> views', r.j.item.res.views); }
// persistensi: logout/login ulang
await call('/api/auth/logout', 'POST'); cookie = ''; r = await call('/api/auth/login', 'POST', { email, password: 'secret123' }); assert.equal(r.status, 200);
me = (await call('/api/me')).j; assert.ok(me.state.v731.creator.accounts.tiktok); console.log('PASS persistensi: akun kreator bertahan setelah login ulang');
console.log('E2E ENGINE LULUS');
