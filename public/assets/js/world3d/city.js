// Tata kota Kampung BizSim: grid kavling, jalan, bangunan (pemetaan ke fitur 2D yang SUDAH ADA), dan pencari jalur A*.
// Data ini hanya deskripsi dunia (lokasi, tampilan, tautan layanan). Saldo, stok, transaksi, jadwal tetap milik sistem 2D + server.
export const T = { ox: -28, oz: -17, nx: 5, nz: 3, pitch: 11, bs: 9, road: 2 };
export const W = T.nx * T.pitch + T.road, D = T.nz * T.pitch + T.road;
export const blockOrigin = (i, j) => ({ x: T.ox + T.road + i * T.pitch, z: T.oz + T.road + j * T.pitch });
const A = (label, href, ic, note) => ({ label, href, ic, note });

// kind = model; svc = fitur 2D terikat; soon = fitur belum ada di sistem 2D (ditandai jujur, tidak dipalsukan)
export const BUILDINGS = [
  { id: 'home', name: 'Rumah Kamu', i: 0, j: 0, w: 5, d: 4, h: 2.4, kind: 'house', cat: 'rumah', col: 0xc2543a, desc: 'Istirahat, mandi, tidur, dan simpan barang di inventaris rumah.', actions: [A('Istirahat & Mandi', 'life.html#istirahat', 'bed', 'Pulihkan energi dan kebersihan'), A('Inventaris Rumah', 'life.html#inventaris', 'box', 'Barang yang sudah diterima'), A('Kebutuhan', 'life.html#kebutuhan', 'heart', 'Lapar, haus, mood, stres')] },
  { id: 'school', name: 'Sekolah Kampung', i: 1, j: 0, w: 7, d: 4, h: 3.2, kind: 'school', cat: 'edu', col: 0xd9534f, desc: 'Jadwal sekolah, tugas, ujian, dan nilai semester.', actions: [A('Education', 'education.html#overview', 'school', 'Jadwal, tugas, nilai'), A('Ruang Ujian', 'education.html#exam', 'exam', 'Ikut ujian')] },
  { id: 'clinic', name: 'Klinik & Apotek', i: 2, j: 0, w: 6, d: 4, h: 3.0, kind: 'hospital', cat: 'sehat', col: 0xe5484d, desc: 'Kesehatan karakter dan pemulihan.', actions: [A('Kesehatan', 'life.html#kesehatan', 'heart', 'Cek dan pulihkan kesehatan')] },
  { id: 'park', name: 'Taman & Tempat Ibadah', i: 3, j: 0, w: 6, d: 5, h: 2.6, kind: 'park', cat: 'umum', col: 0x4f9a4a, soon: 'Taman bisa dinikmati. Fitur ibadah/agama belum ada di sistem 2D, jadi belum bisa dipakai.', desc: 'Ruang terbuka warga.', actions: [] },
  { id: 'spbu', name: 'SPBU & Bengkel', i: 4, j: 0, w: 6, d: 4, h: 3.2, kind: 'spbu', cat: 'transport', col: 0xf59e0b, soon: 'Kendaraan, bahan bakar, dan bengkel belum ada di sistem 2D. Bangunan ini hanya tampilan sementara.', desc: 'Belum aktif.', actions: [] },
  { id: 'warung', name: 'Warung Makan Bu Sri', i: 0, j: 1, w: 5, d: 3, h: 2.6, kind: 'warung', cat: 'makan', col: 0xe8833a, hours: [6, 21], npc: { name: 'Bu Sri', say: h => 'Mampir, Nak. Mau makan atau minum apa?' }, desc: 'Nasi rames, mie ayam, dan minuman. Pembayaran dan efek makanan lewat sistem Kehidupan.', actions: [A('Makan & Minum', 'life.html#makan', 'food', 'Pesan makanan dan minuman')] },
  { id: 'balai', name: 'Balai Desa', i: 1, j: 1, w: 7, d: 5, h: 3.2, kind: 'balai', cat: 'umum', col: 0x8a5a3b, desc: 'Pusat warga: kalender, jadwal, kontak, dan pesan.', actions: [A('Kalender & Jadwal', 'calendar.html', 'calendar', 'Agenda dan pengingat'), A('Sosial', 'social.html', 'people', 'Kontak, pesan, utang & janji')] },
  { id: 'bank', name: 'Bank Desa', i: 2, j: 1, w: 6, d: 4, h: 3.2, kind: 'bank', cat: 'uang', col: 0x2563eb, desc: 'Rekening, kartu, dompet digital, top up, dan transfer.', actions: [A('Ringkasan Keuangan', 'finance.html#ringkasan', 'coin', 'Saldo dan arus kas'), A('Rekening Bank', 'finance.html#rekening', 'bank', 'Buka dan kelola rekening'), A('Transfer', 'finance.html#transfer', 'send', 'Kirim uang'), A('Top Up', 'finance.html#topup', 'plus', 'Isi dompet digital'), A('Tagihan Kartu', 'finance.html#tagihan', 'card', 'Bayar tagihan')] },
  { id: 'minimarket', name: 'Toko Lokal', i: 3, j: 1, w: 6, d: 4, h: 2.8, kind: 'shop', cat: 'belanja', col: 0x16a34a, desc: 'Belanja kebutuhan harian dan pantau pesanan.', actions: [A('Toko Lokal', 'shop.html#toko', 'cart', 'Belanja barang'), A('Order Center', 'shop.html#pesanan', 'box', 'Lacak pesanan'), A('Reward Belanja', 'shop.html#reward', 'gift', 'Poin dan voucher')] },
  { id: 'terminal', name: 'Terminal', i: 4, j: 1, w: 7, d: 4, h: 3.0, kind: 'terminal', cat: 'transport', col: 0x64748b, soon: 'Tiket bus/kereta dan perjalanan antarkota belum ada di sistem 2D. Bangunan ini hanya tampilan sementara.', desc: 'Belum aktif.', actions: [] },
  { id: 'office', name: 'Balai Kerja', i: 0, j: 2, w: 5, d: 4, h: 5.2, kind: 'office', cat: 'karier', col: 0x0e7490, desc: 'Cari lowongan, kerja, magang, dan payroll.', actions: [A('Lowongan', 'career.html#jobs', 'briefcase', 'Cari pekerjaan'), A('Pekerjaan & Payroll', 'career.html#active', 'task', 'Pekerjaan aktif'), A('Program Magang', 'career.html#internships', 'school', 'Magang')] },
  { id: 'bursa', name: 'Bursa & Properti', i: 1, j: 2, w: 7, d: 4, h: 4.0, kind: 'bursa', cat: 'invest', col: 0x7c3aed, desc: 'Trading aset, portofolio, emas, tanah, dan deposito.', actions: [A('Asset Market', 'market.html', 'chart', 'Trading aset'), A('Portofolio', 'investments.html#portfolio', 'pie', 'Investasi kamu'), A('Emas', 'investments.html#emas', 'gold', 'Beli/jual emas'), A('Tanah', 'investments.html#tanah', 'land', 'Properti tanah'), A('Deposito', 'investments.html#deposito', 'lock', 'Simpan berjangka')] },
  { id: 'hub', name: 'Pusat Marketplace', i: 2, j: 2, w: 7, d: 4, h: 3.0, kind: 'hub', cat: 'belanja', col: 0xea580c, desc: 'Empat aplikasi marketplace, ekspedisi, dan pelacakan paket.', actions: [A('Marketplace', 'marketplace.html', 'store', 'Shopindo, LazaMall, dan lainnya'), A('Order Center', 'shop.html#pesanan', 'truck', 'Lacak paket')] },
  { id: 'umkm', name: 'Pusat UMKM & Studio', i: 3, j: 2, w: 7, d: 4, h: 2.8, kind: 'umkm', cat: 'bisnis', col: 0xdb2777, desc: 'Kelola bisnis, toko online, dan karya kreator.', actions: [A('Business', 'business.html', 'business', 'Kelola usaha'), A('Seller Center', 'seller.html', 'store', 'Toko di marketplace'), A('Creator Studio', 'studio.html', 'studio', 'Konten dan karya')] },
  { id: 'field', name: 'Hutan Kecil', i: 4, j: 2, w: 0, d: 0, h: 0, kind: 'field', cat: 'umum', col: 0x4f9a4a, noLabel: true, desc: '', actions: [] },
];
export const BY_ID = Object.fromEntries(BUILDINGS.map(b => [b.id, b]));
export const isOpen = (b, hour) => !b.hours || (hour >= b.hours[0] && hour < b.hours[1]);

// footprint & pintu (menghadap +z); jalur tanah dari pintu ke jalan selatan blok
for (const b of BUILDINGS) {
  const o = blockOrigin(b.i, b.j); b.bx = o.x; b.bz = o.z;
  if (b.kind === 'field') { b.cx = o.x + 4.5; b.cz = o.z + 4.5; b.x0 = b.x1 = b.cx; b.z0 = b.z1 = b.cz; continue; }
  b.x0 = o.x + Math.floor((T.bs - b.w) / 2); b.z0 = o.z + 1; b.x1 = b.x0 + b.w; b.z1 = b.z0 + b.d;
  b.cx = (b.x0 + b.x1) / 2; b.cz = (b.z0 + b.z1) / 2; b.door = { x: Math.floor(b.cx) + 0.5, z: b.z1 + 0.5 };
}
const hash = (a, b) => { let h = (a * 374761393 + b * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) >>> 0) / 4294967296; };
export { hash };

// grid jalan kaki: true = bisa dilalui
const GW = W, GD = D; export const grid = new Uint8Array(GW * GD).fill(1);
const gi = (x, z) => (z - T.oz) * GW + (x - T.ox);
export const inWorld = (x, z) => x >= T.ox && x < T.ox + GW && z >= T.oz && z < T.oz + GD;
export const walkable = (x, z) => inWorld(x, z) && grid[gi(x, z)] === 1;
export const isRoad = (x, z) => { const rx = (x - T.ox) % T.pitch, rz = (z - T.oz) % T.pitch; return rx < T.road || rz < T.road; };
export const trees = [], paths = [];
for (const b of BUILDINGS) {
  if (b.kind !== 'field') for (let x = b.x0; x < b.x1; x++) for (let z = b.z0; z < b.z1; z++) grid[gi(x, z)] = 0;
  if (b.kind !== 'field') for (let z = b.z1; z < b.bz + T.bs; z++) paths.push({ x: Math.floor(b.cx), z });
}
const pathSet = new Set(paths.map(p => p.x + ',' + p.z));
for (let bi = 0; bi < T.nx; bi++) for (let bj = 0; bj < T.nz; bj++) {
  const o = blockOrigin(bi, bj), b = BUILDINGS.find(q => q.i === bi && q.j === bj), field = b?.kind === 'field', park = b?.kind === 'park';
  for (let x = o.x; x < o.x + T.bs; x++) for (let z = o.z; z < o.z + T.bs; z++) {
    if (!walkable(x, z) || pathSet.has(x + ',' + z)) continue; const r = hash(x, z);
    if (field ? r < 0.55 : park ? r < 0.12 : r < 0.07 && (x === o.x || x === o.x + T.bs - 1 || z === o.z + T.bs - 2 ? true : r < 0.04)) { trees.push({ x: x + 0.5, z: z + 0.5, s: 0.8 + hash(z, x) * 0.6 }); grid[gi(x, z)] = 0; }
  }
}
// kolam di taman
const park = BY_ID.park; park.pond = { x: park.bx + 6.5, z: park.bz + 6.2 }; for (let x = park.bx + 5; x < park.bx + 8; x++) for (let z = park.bz + 5; z < park.bz + 7; z++) if (inWorld(x, z)) grid[gi(x, z)] = 0;
for (const b of BUILDINGS) if (b.door) grid[gi(Math.floor(b.door.x), Math.floor(b.door.z))] = 1;

/** Apakah lingkaran (x,z,r) tidak menyentuh tile terhalang? (tabrakan nyata untuk karakter, bukan sekadar titik tengah) */
export function clearAt(x, z, r = 0.28) {
  for (let cx = Math.floor(x - r); cx <= Math.floor(x + r); cx++) for (let cz = Math.floor(z - r); cz <= Math.floor(z + r); cz++) {
    if (walkable(cx, cz)) continue; const nx = Math.max(cx, Math.min(x, cx + 1)), nz = Math.max(cz, Math.min(z, cz + 1)); if (Math.hypot(x - nx, z - nz) < r) return false;
  } return true;
}
/** Garis pandang bebas hambatan bagi lingkaran berjari-jari r. */
export function losClear(ax, az, bx, bz, r = 0.28) { const L = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.ceil(L / 0.15)); for (let k = 0; k <= n; k++) if (!clearAt(ax + (bx - ax) * k / n, az + (bz - az) * k / n, r)) return false; return true; }
/** Tile walkable terdekat secara EUKLIDES dari titik sebenarnya (bukan urutan cincin). */
function nearest(x, z) { const fx = Math.floor(x), fz = Math.floor(z); let best = null, bd = Infinity; for (let r = 0; r < 10; r++) { for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) { if (Math.max(Math.abs(dx), Math.abs(dz)) !== r || !walkable(fx + dx, fz + dz)) continue; const d = Math.hypot(fx + dx + 0.5 - x, fz + dz + 0.5 - z); if (d < bd) { bd = d; best = { x: fx + dx, z: fz + dz }; } } if (best && r >= Math.ceil(bd)) break; } return best; }

/** A* 8 arah tanpa memotong sudut + penghalusan jalur (string pulling) memakai garis pandang berjari-jari.
 *  Mengembalikan daftar titik [{x,z}] (tanpa titik awal) atau null. Titik akhir = titik yang diketuk bila bebas hambatan,
 *  jika tidak = tengah tile walkable terdekat (secara euklides). */
export function findPath(sx, sz, tx, tz) {
  let s = { x: Math.floor(sx), z: Math.floor(sz) }, g = { x: Math.floor(tx), z: Math.floor(tz) }, exact = true;
  if (!walkable(g.x, g.z)) { g = nearest(tx, tz); exact = false; if (!g) return null; } if (!walkable(s.x, s.z)) { s = nearest(sx, sz); if (!s) return null; }
  const key = (x, z) => (z - T.oz) * GW + (x - T.ox), open = new Map(), closed = new Set(), came = new Map(), gs = new Map();
  const h = (x, z) => { const dx = Math.abs(x - g.x), dz = Math.abs(z - g.z); return Math.max(dx, dz) + 0.414 * Math.min(dx, dz) + (isRoad(x, z) ? 0 : 0.25); };
  const sk = key(s.x, s.z); gs.set(sk, 0); open.set(sk, { x: s.x, z: s.z, f: h(s.x, s.z) });
  let n = 0, raw = null;
  while (open.size && n++ < 6000) {
    let cur = null, ck = 0; for (const [k, v] of open) if (!cur || v.f < cur.f) { cur = v; ck = k; } open.delete(ck); closed.add(ck);
    if (cur.x === g.x && cur.z === g.z) { const out = []; let k = ck; while (k !== sk) { const p = came.get(k); out.push({ x: (k % GW) + T.ox + 0.5, z: Math.floor(k / GW) + T.oz + 0.5 }); k = p; } raw = out.reverse(); break; }
    for (let dx = -1; dx <= 1; dx++) for (let dz = -1; dz <= 1; dz++) {
      if (!dx && !dz) continue; const nx = cur.x + dx, nz = cur.z + dz; if (!walkable(nx, nz)) continue; if (dx && dz && (!walkable(cur.x + dx, cur.z) || !walkable(cur.x, cur.z + dz))) continue;
      const k = key(nx, nz); if (closed.has(k)) continue; const cost = gs.get(ck) + (dx && dz ? 1.414 : 1) + (isRoad(nx, nz) ? 0 : 0.3);
      if (cost < (gs.get(k) ?? Infinity)) { gs.set(k, cost); came.set(k, ck); open.set(k, { x: nx, z: nz, f: cost + h(nx, nz) }); }
    }
  }
  if (!raw) return null;
  if (exact && raw.length && clearAt(tx, tz)) raw[raw.length - 1] = { x: tx, z: tz }; // berhenti tepat di titik yang diketuk
  const pts = [{ x: sx, z: sz }, ...raw], out = []; let i = 0;
  while (i < pts.length - 1) { let j = pts.length - 1; while (j > i + 1 && !losClear(pts[i].x, pts[i].z, pts[j].x, pts[j].z)) j--; out.push(pts[j]); i = j; }
  return out;
}
// simpul persimpangan untuk pejalan kaki & kendaraan
export const nodes = []; for (let i = 0; i <= T.nx; i++) for (let j = 0; j <= T.nz; j++) nodes.push({ i, j, x: T.ox + i * T.pitch + 1, z: T.oz + j * T.pitch + 1 });
