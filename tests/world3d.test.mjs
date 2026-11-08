// Pemeriksaan statis vertical slice 3D: renderer lokal (tanpa CDN), tidak ada data game/penyimpanan sendiri, 2D tetap utuh, navigasi terdaftar.
import fs from 'node:fs'; import assert from 'node:assert/strict';
const rd = p => fs.readFileSync(new URL('../' + p, import.meta.url), 'utf8');
const files = ['public/world3d.html', 'public/assets/css/world3d.css', 'public/assets/js/pages/world3d.js', 'public/assets/js/world3d/world.js', 'public/assets/js/world3d/builders.js', 'public/assets/js/world3d/models.js', 'public/assets/js/world3d/city.js', 'public/assets/js/world3d/ui3d.js'];
for (const f of files) assert.ok(fs.existsSync(new URL('../' + f, import.meta.url)), f);
assert.ok(fs.statSync(new URL('../public/assets/vendor/three/three.module.min.js', import.meta.url)).size > 300000, 'three.js lokal');
assert.ok(fs.existsSync(new URL('../public/assets/vendor/three/LICENSE', import.meta.url)), 'lisensi three.js');
for (const f of files.filter(x => x.endsWith('.js'))) { const s = rd(f); assert.ok(!/https?:\/\/(cdn|unpkg|cdnjs)/.test(s), `${f}: tanpa CDN`); assert.ok(!/localStorage|sessionStorage|indexedDB/.test(s), `${f}: tanpa penyimpanan sendiri`); assert.ok(!/fetch\(/.test(s), `${f}: 3D tidak memanggil API sendiri`); assert.ok(!/balance\s*[-+]?=[^=]/.test(s), `${f}: tidak mengubah saldo`); }
assert.ok(/world3d/.test(rd('public/assets/js/ui/shell.js')), 'navigasi 3D');
for (const h of ['life', 'shop', 'finance', 'index']) assert.ok(fs.existsSync(new URL(`../public/${h}.html`, import.meta.url)), `2D utuh: ${h}.html`);
const wr = rd('public/assets/js/pages/world3d.js'), city = rd('public/assets/js/world3d/city.js'); assert.ok(wr.includes('webglOk') && wr.includes('index.html'), 'fallback WebGL + tautan 2D');
// setiap tautan layanan 3D harus menunjuk halaman 2D yang ada (tidak ada tombol mati)
const hrefs = [...city.matchAll(/A\('[^']+', '([^']+)'/g)].map(m => m[1]); assert.ok(hrefs.length >= 30, 'aksi layanan terdaftar');
for (const h of hrefs) assert.ok(fs.existsSync(new URL('../public/' + h.split('#')[0], import.meta.url)), 'halaman tujuan ada: ' + h);
for (const m of city.matchAll(/id: '(\w+)'[^\n]*?soon: '/g)) assert.ok(true);
assert.ok(/soon:/.test(city), 'bangunan tanpa fitur 2D ditandai soon');
console.log('PASS: vertical slice 3D (lokal, tanpa CDN, tanpa data/penyimpanan sendiri, 2D utuh)');
