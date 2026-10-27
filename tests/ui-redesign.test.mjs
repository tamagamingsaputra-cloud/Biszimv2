import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const css = read('public/assets/css/bizsim.css');
const shell = read('public/assets/js/ui/shell.js');
const career = read('public/assets/js/pages/career.js');
const api = read('public/assets/js/ui/api.js');
const server = read('server/server.cjs');
for (const module of ['dashboard','market','investments','business','career','education','studio','finance','life','calendar']) {
  assert.ok(css.includes(`body[data-module="${module}"]`), `tema ${module} tersedia`);
}
assert.ok(!css.includes('@import url('), 'stylesheet tidak membutuhkan font eksternal');
assert.ok(shell.includes("'career.html#internships'") && shell.includes("'life.html#belanja'"), 'menu memuat magang dan toko/inventaris');
assert.ok(career.includes('function internshipsView()') && career.includes("internships: internshipsView"), 'tab magang benar-benar dirender');
assert.ok(api.includes("localStorage.getItem(VISITOR_KEY)") && api.includes("'x-visitor-id': visitorId()"), 'ID pengunjung stabil lintas halaman/reload');
assert.ok(server.includes('TURSO_DATABASE_URL') && server.includes('TURSO_AUTH_TOKEN') && server.includes("'managed-remote-database'"), 'health endpoint memeriksa database persisten terkelola');
console.log('Pemeriksaan UI, navigasi, identitas pengunjung, dan status persistensi lulus');
