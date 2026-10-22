// Menyalin netlify/functions/*.mjs menjadi web/engine/*.js agar logika backend yang sama bisa berjalan di browser (mode lokal, tanpa server).
// Jalankan ulang setiap kali file di netlify/functions berubah:  npm run sync:local
import { readdirSync, readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = join(dirname(fileURLToPath(import.meta.url)), '..'), src = join(root, 'netlify/functions'), out = join(root, 'web/engine');
mkdirSync(out, { recursive: true });
let n = 0;
for (const f of readdirSync(src).filter(x => x.endsWith('.mjs'))) {
  let t = readFileSync(join(src, f), 'utf8');
  t = t.replace(/from '\.\/([\w-]+)\.mjs'/g, "from './$1.js'").replace(/from 'node:crypto'/g, "from './shim/node-crypto.js'").replace(/from '@netlify\/blobs'/g, "from './shim/blobs.js'");
  writeFileSync(join(out, f.replace(/\.mjs$/, '.js')), `/* GENERATED dari netlify/functions/${f}. Jangan diedit di sini. Jalankan: npm run sync:local */\n` + t);
  n++;
}
console.log(`web/engine: ${n} file disinkronkan`);
