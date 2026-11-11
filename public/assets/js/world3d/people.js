// Penduduk berperan (pelajar, pekerja, dokter, polisi, pemadam, koki, petani, pedagang, lansia, dll.) dengan variasi tubuh/kulit/rambut.
// Dibangun di atas makeHuman (rig lengan/kaki yang sama) agar animasi jalan/lambai dipakai ulang. Hanya presentasi.
import * as THREE from '../../vendor/three/three.module.min.js';
import { mat } from './models.js';
import { makeHuman, mesh, geo, box, hash as _h } from './builders.js';

const SKINS = [0xe0a97c, 0xc68a5e, 0xf1c9a5, 0xa8714a, 0x8d5a3b], HAIRS = [0x2b1d14, 0x1a1412, 0x4a3223, 0x111111, 0x5b3a22];
const hz = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const B = (p, w, h, d, x, y, z, c) => { const m = mesh(box(w, h, d), mat(c), x, y, z); p.add(m); return m; };
const dome = (p, r, x, y, z, c, sy = 1) => { const m = mesh(geo('dome' + r, () => new THREE.SphereGeometry(r, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), mat(c), x, y, z); m.scale.y = sy; p.add(m); return m; };
const cylM = (p, rt, rb, h, x, y, z, c) => { const m = mesh(geo(`cy${rt}_${rb}_${h}`, () => new THREE.CylinderGeometry(rt, rb, h, 12)), mat(c), x, y, z); p.add(m); return m; };

export const ROLES = {
  pelajar:      { shirt: 0xffffff, pants: 0x1d4ed8, tie: 0xb91c1c, bag: 0x1e3a8a, cap: 0x1d4ed8 },
  pelajarPutri: { shirt: 0xffffff, skirt: 0x2563eb, female: true, bag: 0x7c3aed, tie: 0xb91c1c },
  pekerja:      { shirt: 0xf8fafc, pants: 0x374151, tie: 0x1d4ed8, case: 0x7c4a2d },
  pegawai:      { shirt: 0x1e3a8a, skirt: 0x374151, female: true, folder: 0x38bdf8 },
  pedagang:     { shirt: 0xd6b48a, pants: 0xa8957a, apron: 0x4b5563, cap: 0xa78bca },
  petani:       { shirt: 0x84cc16, pants: 0x1d4ed8, overall: 0x1d4ed8, hat: 'straw', tool: 0x8a5a3b },
  dokter:       { shirt: 0x93c5fd, pants: 0x1f2937, coat: 0xffffff, tie: 0x2563eb },
  polisi:       { shirt: 0x9ca3af, pants: 0x1f2937, hat: 'police', belt: 0x111827 },
  pemadam:      { shirt: 0xef4444, pants: 0xef4444, helmet: 0xdc2626, stripe: 0xfacc15 },
  koki:         { shirt: 0xffffff, pants: 0x374151, coat: 0xffffff, hat: 'chef' },
  lansia:       { shirt: 0xc084fc, pants: 0x9ca3af, hair: 0xe5e7eb, scale: 0.93, stoop: true, female: true },
  warga:        { shirt: 0x2f6fbf, pants: 0x3a3f58 },
};
export const ROLE_LIST = Object.keys(ROLES);

/** makePerson(role, seed): seed deterministik menentukan kulit, rambut, tinggi dan lebar tubuh. */
export function makePerson(role = 'warga', seed = 0) {
  const r = ROLES[role] || ROLES.warga, skin = SKINS[Math.floor(hz(seed, 1) * SKINS.length)], hair = r.hair ?? HAIRS[Math.floor(hz(seed, 2) * HAIRS.length)];
  const mixShirt = role === 'warga' ? [0xd9534f, 0x2f6fbf, 0x16a34a, 0xf59e0b, 0x7c3aed, 0xdb2777, 0x0e7490][Math.floor(hz(seed, 3) * 7)] : r.shirt;
  const g = makeHuman({ shirt: mixShirt, pants: r.pants ?? r.skirt ?? 0x3a3f58, skin, hair, female: !!r.female || (role === 'warga' && hz(seed, 4) > 0.55) });
  const u = g.userData, body = u.body, h = (r.scale || 1) * (0.94 + hz(seed, 5) * 0.14), w = 0.92 + hz(seed, 6) * 0.2;
  g.userData.hScale = h; body.scale.x = w;
  if (r.skirt) { cylM(body, 0.27, 0.38, 0.4, 0, 0.64, 0, r.skirt); u.legL.visible = true; }
  if (r.coat) { B(body, 0.6, 0.78, 0.4, 0, 0.98, 0, r.coat); B(body, 0.5, 0.34, 0.38, 0, 0.58, 0, r.coat); }
  if (r.overall) { B(body, 0.56, 0.5, 0.34, 0, 0.9, 0.02, r.overall); for (const s of [-1, 1]) B(body, 0.07, 0.4, 0.04, s * 0.15, 1.22, 0.18, r.overall); }
  if (r.apron) B(body, 0.4, 0.6, 0.06, 0, 0.85, 0.24, r.apron);
  if (r.tie) B(body, 0.06, 0.32, 0.03, 0, 1.06, 0.28, r.tie);
  if (r.belt) B(body, 0.56, 0.07, 0.38, 0, 0.74, 0, r.belt);
  if (r.stripe) { B(body, 0.58, 0.07, 0.4, 0, 0.98, 0, r.stripe); B(body, 0.58, 0.07, 0.4, 0, 0.72, 0, r.stripe); }
  if (r.bag) B(body, 0.4, 0.46, 0.16, 0, 1.0, -0.3, r.bag);
  if (r.case) B(u.armR, 0.24, 0.18, 0.34, 0, -0.56, 0.1, r.case);
  if (r.folder) B(u.armL, 0.2, 0.28, 0.04, 0, -0.5, 0.12, r.folder);
  if (r.tool) { B(u.armR, 0.05, 1.3, 0.05, 0.04, -0.2, 0.1, r.tool); B(u.armR, 0.28, 0.07, 0.05, 0.04, 0.45, 0.1, 0x6b7280); }
  if (r.hat === 'straw') { cylM(body, 0.52, 0.52, 0.04, 0, 1.76, 0, 0xe3c46f); dome(body, 0.25, 0, 1.76, 0, 0xe3c46f, 1.1); }
  else if (r.hat === 'police') { B(body, 0.5, 0.2, 0.46, 0, 1.78, 0, 0x1f2937); B(body, 0.5, 0.04, 0.22, 0, 1.7, 0.3, 0x111827); B(body, 0.07, 0.07, 0.03, 0, 1.78, 0.24, 0xf5b800); }
  else if (r.hat === 'chef') { cylM(body, 0.2, 0.2, 0.3, 0, 1.92, 0, 0xffffff); dome(body, 0.24, 0, 2.05, 0, 0xffffff, 0.8); }
  else if (r.helmet) { dome(body, 0.29, 0, 1.64, 0, r.helmet, 1.0); B(body, 0.46, 0.04, 0.12, 0, 1.64, 0.28, r.helmet); }
  else if (r.cap) { dome(body, 0.27, 0, 1.66, 0, r.cap, 0.9); B(body, 0.34, 0.03, 0.18, 0, 1.64, 0.29, r.cap); }
  if (r.stoop) body.rotation.x = 0.12;
  if (role === 'dokter') B(body, 0.05, 0.28, 0.03, 0.14, 1.12, 0.22, 0x2563eb); // stetoskop
  return g;
}
