// Kendaraan prosedural (low-poly, tanpa tekstur) mengikuti gambar referensi: mobil, motor, bus kota, ambulans, damkar, polisi, truk barang, taksi.
// Panjang searah +z (depan = +z). Hanya presentasi; tidak ada data game.
import * as THREE from '../../vendor/three/three.module.min.js';
import { mat } from './models.js';
import { mesh, geo, box } from './builders.js';

const GLASS = 0x6fb4d6, TYRE = 0x23262b, CHROME = 0xc9ced6, RED = 0xdc2626, WHITE = 0xf7f7f5, HEAD = 0xfff0a8;
const B = (g, w, h, d, x, y, z, c) => { const m = mesh(box(w, h, d), mat(c), x, y + h / 2, z); g.add(m); return m; };
const wheel = (g, x, z, r = 0.17, w = 0.15) => {
  g.add(mesh(geo(`tyre${r}_${w}`, () => { const c = new THREE.CylinderGeometry(r, r, w, 12); c.rotateZ(Math.PI / 2); return c; }), mat(TYRE), x, r, z));
  g.add(mesh(geo(`hub${r}_${w}`, () => { const c = new THREE.CylinderGeometry(r * 0.55, r * 0.55, w + 0.03, 8); c.rotateZ(Math.PI / 2); return c; }), mat(CHROME), x, r, z));
};
const lights = (g, w, zf, zb, y = 0.36, sz = 0.2) => { for (const s of [-1, 1]) { B(g, sz, 0.1, 0.05, s * w * 0.34, y, zf, HEAD); B(g, sz, 0.1, 0.05, s * w * 0.34, y, zb, RED); } };
const lightBar = (g, y, z, w = 0.5) => { B(g, w / 2, 0.1, 0.16, -w / 4, y, z, 0x2563eb); B(g, w / 2, 0.1, 0.16, w / 4, y, z, RED); };

function sedan(g, c, { roofSign = 0, stripe = 0, bar = false } = {}) {
  B(g, 1.0, 0.34, 2.0, 0, 0.16, 0, c); B(g, 0.94, 0.1, 0.62, 0, 0.5, 0.68, c); B(g, 0.94, 0.1, 0.42, 0, 0.5, -0.78, c);
  B(g, 0.88, 0.34, 1.0, 0, 0.5, -0.06, c); B(g, 0.9, 0.2, 0.84, 0, 0.58, -0.06, GLASS); B(g, 0.8, 0.05, 0.72, 0, 0.84, -0.06, c);
  B(g, 0.8, 0.2, 0.04, 0, 0.58, 0.38, GLASS); B(g, 0.8, 0.2, 0.04, 0, 0.58, -0.5, GLASS);
  for (const s of [-1, 1]) B(g, 0.05, 0.2, 0.05, s * 0.45, 0.58, -0.06, c);
  B(g, 1.02, 0.1, 0.07, 0, 0.14, 1.0, 0x8b9199); B(g, 1.02, 0.1, 0.07, 0, 0.14, -1.0, 0x8b9199); lights(g, 1.0, 1.01, -1.01, 0.34);
  if (stripe) B(g, 1.02, 0.1, 1.9, 0, 0.3, 0, stripe);
  if (roofSign) B(g, 0.42, 0.13, 0.2, 0, 0.88, -0.06, roofSign);
  if (bar) lightBar(g, 0.88, -0.06, 0.5);
  for (const x of [-0.5, 0.5]) for (const z of [-0.65, 0.65]) wheel(g, x, z);
}
function bike(g, c) {
  for (const z of [-0.5, 0.5]) { g.add(mesh(geo('mw', () => { const t = new THREE.CylinderGeometry(0.27, 0.27, 0.1, 12); t.rotateZ(Math.PI / 2); return t; }), mat(TYRE), 0, 0.27, z)); g.add(mesh(geo('mh', () => { const t = new THREE.CylinderGeometry(0.14, 0.14, 0.13, 8); t.rotateZ(Math.PI / 2); return t; }), mat(CHROME), 0, 0.27, z)); }
  B(g, 0.14, 0.14, 0.8, 0, 0.34, 0, 0x2a2e35); B(g, 0.26, 0.2, 0.34, 0, 0.55, 0.16, c); B(g, 0.2, 0.08, 0.42, 0, 0.55, -0.22, 0x1a1a1a);
  B(g, 0.07, 0.5, 0.07, 0, 0.1, 0.52, 0x8b9199); B(g, 0.52, 0.05, 0.06, 0, 0.78, 0.42, 0x2a2e35); B(g, 0.14, 0.12, 0.05, 0, 0.7, 0.56, HEAD); B(g, 0.14, 0.14, 0.2, 0, 0.26, 0.0, 0x4b5563); B(g, 0.1, 0.06, 0.04, 0, 0.5, -0.5, RED);
  B(g, 0.3, 0.42, 0.2, 0, 0.62, -0.18, 0x374151); B(g, 0.1, 0.34, 0.1, -0.2, 0.62, 0.12, 0x374151); B(g, 0.1, 0.34, 0.1, 0.2, 0.62, 0.12, 0x374151);
  g.add(mesh(geo('mhead', () => new THREE.SphereGeometry(0.17, 10, 8)), mat(0xe5484d), 0, 1.22, -0.16));
}
function bus(g) {
  B(g, 1.2, 1.08, 3.6, 0, 0.26, 0, 0xf5b800); B(g, 1.14, 0.08, 3.5, 0, 1.34, 0, 0xfdfdf8); B(g, 1.22, 0.12, 3.62, 0, 0.5, 0, 0xd97706);
  B(g, 1.23, 0.44, 3.2, 0, 0.78, -0.1, GLASS); for (let k = 0; k < 7; k++) B(g, 1.25, 0.44, 0.07, 0, 0.78, -1.6 + k * 0.5, 0xf5b800);
  B(g, 1.02, 0.5, 0.05, 0, 0.74, 1.81, GLASS); B(g, 0.7, 0.14, 0.05, 0, 1.22, 1.81, 0x111827); B(g, 1.06, 0.1, 0.07, 0, 0.18, 1.82, 0x6b7280); B(g, 1.06, 0.1, 0.07, 0, 0.18, -1.82, 0x6b7280); lights(g, 1.2, 1.83, -1.83, 0.3, 0.22);
  for (const z of [-1.2, 1.15]) for (const x of [-0.6, 0.6]) wheel(g, x, z, 0.27, 0.2);
}
function ambulance(g) {
  B(g, 1.1, 1.1, 1.7, 0, 0.26, -0.5, WHITE); B(g, 1.0, 0.8, 0.9, 0, 0.26, 0.82, WHITE); B(g, 0.92, 0.3, 0.05, 0, 0.7, 1.28, GLASS); B(g, 1.02, 0.26, 0.5, 0, 0.62, 0.8, GLASS);
  B(g, 1.12, 0.1, 1.7, 0, 0.5, -0.5, RED); for (const s of [-1, 1]) { B(g, 0.03, 0.4, 0.14, s * 0.56, 0.82, -0.45, RED); B(g, 0.03, 0.14, 0.4, s * 0.56, 0.95, -0.45, RED); }
  lightBar(g, 1.36, 0.85, 0.5); B(g, 1.04, 0.1, 0.06, 0, 0.16, 1.3, 0x6b7280); lights(g, 1.0, 1.29, -1.36, 0.34);
  for (const z of [-0.85, 0.85]) for (const x of [-0.55, 0.55]) wheel(g, x, z, 0.22, 0.17);
}
function firetruck(g) {
  B(g, 1.14, 0.9, 2.0, 0, 0.28, -0.6, RED); B(g, 1.1, 0.92, 1.0, 0, 0.28, 1.0, RED); B(g, 0.96, 0.34, 0.05, 0, 0.78, 1.51, GLASS); B(g, 1.12, 0.3, 0.55, 0, 0.74, 1.0, GLASS);
  B(g, 1.16, 0.1, 3.1, 0, 0.5, 0.2, WHITE); for (const s of [-0.18, 0.18]) B(g, 0.05, 0.08, 2.1, s, 1.18, -0.6, 0xb0b6bf); for (let k = 0; k < 9; k++) B(g, 0.4, 0.04, 0.05, 0, 1.2, -1.55 + k * 0.23, 0xb0b6bf);
  B(g, 0.5, 0.2, 0.4, 0, 1.2, 0.5, 0x6b7280); lightBar(g, 1.2, 1.0, 0.5); B(g, 1.14, 0.1, 0.06, 0, 0.18, 1.52, 0x6b7280); lights(g, 1.1, 1.53, -1.6, 0.34);
  for (const z of [-1.0, 1.0]) for (const x of [-0.58, 0.58]) wheel(g, x, z, 0.28, 0.2);
}
function truck(g) {
  B(g, 1.2, 1.3, 1.9, 0, 0.3, -0.55, 0xf5b800); B(g, 1.22, 0.08, 1.92, 0, 1.62, -0.55, 0xd97706); B(g, 1.1, 0.8, 0.9, 0, 0.3, 0.95, 0xf5b800); B(g, 0.94, 0.3, 0.05, 0, 0.74, 1.41, GLASS); B(g, 1.12, 0.26, 0.45, 0, 0.7, 0.95, GLASS);
  B(g, 1.1, 0.1, 0.06, 0, 0.2, 1.43, 0x6b7280); lights(g, 1.1, 1.44, -1.52, 0.36);
  for (const z of [-0.95, 0.95]) for (const x of [-0.58, 0.58]) wheel(g, x, z, 0.26, 0.19);
}
export const VEHICLE_KINDS = ['car', 'bus', 'bike', 'taxi', 'police', 'truck', 'ambulance', 'firetruck'];
// ukuran collider kapsul per jenis
export const VEHICLE_R = { car: 0.55, taxi: 0.55, police: 0.55, bike: 0.35, bus: 0.8, truck: 0.7, ambulance: 0.65, firetruck: 0.7 };
// setengah panjang kapsul (collider = ruas garis sepanjang arah jalan ± HL, tebal R)
export const VEHICLE_HL = { car: 0.5, taxi: 0.5, police: 0.5, bike: 0.3, bus: 1.0, truck: 0.75, ambulance: 0.75, firetruck: 1.0 };
export const VEHICLE_SPEED = { car: 4, taxi: 4.2, police: 4.4, bike: 5, bus: 3.2, truck: 3.4, ambulance: 4.6, firetruck: 4.2 };
export function makeVehicle(kind = 'car', c = 0xe5484d) {
  const g = new THREE.Group(); g.userData.kind = kind;
  switch (kind) {
    case 'bike': bike(g, c); break; case 'bus': bus(g); break; case 'ambulance': ambulance(g); break; case 'firetruck': firetruck(g); break; case 'truck': truck(g); break;
    case 'taxi': sedan(g, 0x84cc16, { roofSign: 0xffd23f, stripe: 0x1f2937 }); break;
    case 'police': sedan(g, WHITE, { stripe: 0x2563eb, bar: true }); break;
    default: sedan(g, c);
  } return g;
}
