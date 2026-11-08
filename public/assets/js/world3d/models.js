// Model bangunan & objek bergaya isometrik kampung (low-poly, warna hangat, tanpa tekstur). Dibuat dari primitif bersama lalu
// digabung per material (mergeStatic) agar draw call kecil di HP. Bagian bergerak diberi userData.dyn dan tidak digabung.
import * as THREE from '../../vendor/three/three.module.min.js';
import { makeHuman, animateHuman } from './builders.js';
export { makeHuman, animateHuman };

const mats = new Map();
export const mat = (c, o = {}) => { const k = c + JSON.stringify(o); let m = mats.get(k); if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o }); mats.set(k, m); } return m; };
export const winMat = new THREE.MeshLambertMaterial({ color: 0xbfe3f2, emissive: 0x000000, flatShading: true });
export const lampMat = new THREE.MeshBasicMaterial({ color: 0x9aa3ad });
export const C = { grass: 0x8cc063, grass2: 0x7db356, road: 0x555b63, line: 0xf1e7c3, dirt: 0xd8b27a, dirt2: 0xcfa56c, wall: 0xf6e8c8, wall2: 0xeed4a6, white: 0xf4f1ea, wood: 0x8a5a3b, leaf: 0x4f9a4a, leaf2: 0x68b35a, trunk: 0x7a4f32, water: 0x5fb4d6, stone: 0xb9b2a4, glass: 0x8cc4dc };
const BOX = new THREE.BoxGeometry(1, 1, 1), CYL = new THREE.CylinderGeometry(0.5, 0.5, 1, 10), SPH = new THREE.SphereGeometry(0.5, 12, 8), ICO = new THREE.IcosahedronGeometry(0.5, 0), CONE4 = new THREE.ConeGeometry(0.7071, 1, 4);
CONE4.rotateY(Math.PI / 4);
const GABLE = (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0, 1); s.closePath(); const e = new THREE.ExtrudeGeometry(s, { depth: 1, bevelEnabled: false }); e.translate(0, 0, -0.5); return e; })();
const HALF = new THREE.SphereGeometry(0.5, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2);

const put = (p, g, m, w, h, d, x, y, z, ry = 0) => { const o = new THREE.Mesh(g, m); o.scale.set(w, h, d); o.position.set(x, y, z); o.rotation.y = ry; p.add(o); return o; };
export const box = (p, w, h, d, x, yb, z, c, ry) => put(p, BOX, typeof c === 'object' ? c : mat(c), w, h, d, x, yb + h / 2, z, ry);
export const cyl = (p, r, h, x, yb, z, c) => put(p, CYL, mat(c), r * 2, h, r * 2, x, yb + h / 2, z);
export const sph = (p, r, x, y, z, c) => put(p, SPH, typeof c === 'object' ? c : mat(c), r * 2, r * 2, r * 2, x, y, z);
export const gable = (p, w, h, d, x, yb, z, c, ry) => put(p, GABLE, mat(c), w, h, d, x, yb, z, ry);
export const hip = (p, w, h, d, x, yb, z, c) => put(p, CONE4, mat(c), w * 1.414, h, d * 1.414, x, yb + h / 2, z);
const win = (p, w, h, x, y, z, ry = 0) => put(p, BOX, winMat, w, h, 0.06, x, y, z, ry);

export function tree(s = 1, c = C.leaf) { const g = new THREE.Group(); cyl(g, 0.12, 0.9, 0, 0, 0, C.trunk); put(g, ICO, mat(c), 1.5, 1.5, 1.5, 0, 1.55, 0); put(g, ICO, mat(C.leaf2), 1.0, 1.0, 1.0, 0.4, 1.2, 0.25); g.scale.setScalar(s); return g; }

/** Pintu depan di sisi +z, dengan jendela berjajar. */
function facade(g, def, wallC, { floors = 1, fh = 1.6, doorW = 0.9 } = {}) {
  const { w, d } = def, z = d / 2 + 0.03;
  box(g, doorW, 1.35, 0.1, 0, 0, z, C.wood);
  for (let f = 0; f < floors; f++) { const n = Math.max(2, Math.floor((w - 1.4) / 1.5)); for (let k = 0; k < n; k++) { const x = -((n - 1) / 2) * 1.5 + k * 1.5; if (f === 0 && Math.abs(x) < 0.9) continue; win(g, 0.7, 0.7, x, f * fh + 1.05, z); } }
}

const KINDS = {
  house(g, d) { box(g, d.w, 2.2, d.d, 0, 0, 0, C.wall); gable(g, d.w + 0.5, 1.5, d.d + 0.5, 0, 2.2, 0, d.col); facade(g, d); box(g, 0.45, 1.2, 0.45, d.w * 0.28, 3.0, -0.3, C.stone); box(g, d.w + 0.6, 0.14, 1.0, 0, 0, d.d / 2 + 0.5, C.stone); },
  school(g, d) { box(g, d.w, 3.0, d.d, 0, 0, 0, C.wall2); box(g, d.w + 0.4, 0.3, d.d + 0.4, 0, 3.0, 0, d.col); facade(g, d, 0, { floors: 2, fh: 1.4, doorW: 1.2 }); cyl(g, 0.05, 4.2, d.w / 2 + 0.6, 0, d.d / 2 + 0.8, C.stone); const flag = box(g, 0.9, 0.5, 0.04, d.w / 2 + 1.05, 3.7, d.d / 2 + 0.8, 0xd9534f); flag.userData.dyn = 'flag'; g.userData.flag = flag; },
  hospital(g, d) { box(g, d.w, 3.0, d.d, 0, 0, 0, C.white); box(g, d.w + 0.3, 0.25, d.d + 0.3, 0, 3.0, 0, 0xcbd5e1); facade(g, d, 0, { floors: 2, fh: 1.4, doorW: 1.4 }); box(g, 0.35, 1.2, 0.08, 0, 3.55, d.d / 2 + 0.05, 0xe5484d); box(g, 1.2, 0.35, 0.08, 0, 3.97, d.d / 2 + 0.05, 0xe5484d); box(g, 1.2, 0.35, 0.08, 0, 3.55 + 0.42, d.d / 2 + 0.05, 0xe5484d); },
  park(g, d) { box(g, 7.6, 0.06, 7.6, 0, 0, 1.3, C.grass2); const px = d.pond.x - d.cx, pz = d.pond.z - d.cz; const pond = box(g, 3, 0.07, 2, px, 0, pz, mat(C.water)); // masjid kecil (placeholder tampilan)
    box(g, 2.4, 1.8, 2.2, -1.8, 0, -0.6, C.white); put(g, HALF, mat(0x2f9e8f), 2.0, 1.6, 2.0, -1.8, 1.8, -0.6); cyl(g, 0.16, 3.2, -0.2, 0, -0.9, C.white); put(g, CONE4, mat(0x2f9e8f), 0.5, 0.6, 0.5, -0.2, 3.5, -0.9); box(g, 0.8, 0.5, 0.3, 1.5, 0, 0.2, C.wood); },
  spbu(g, d) { box(g, 3.2, 2.4, 3.0, -1.4, 0, -0.2, C.white); box(g, 3.4, 0.25, 3.2, -1.4, 2.4, -0.2, d.col); for (const x of [0.6, 2.6]) for (const z of [0.2, 2.0]) cyl(g, 0.09, 2.6, x, 0, z, C.stone); box(g, 3.3, 0.35, 2.7, 1.6, 2.6, 1.1, d.col); for (const x of [1.0, 2.2]) box(g, 0.35, 0.9, 0.3, x, 0, 1.1, 0xe5484d); },
  warung(g, d) { box(g, d.w, 2.4, d.d, 0, 0, -0.2, C.wall2); gable(g, d.w + 0.4, 1.0, d.d + 0.6, 0, 2.4, -0.2, 0x6f8f9c); box(g, d.w - 0.5, 0.9, 0.7, 0, 0, d.d / 2 + 0.05, C.wood); box(g, d.w - 0.5, 0.06, 0.74, 0, 0.9, d.d / 2 + 0.05, 0xf0d9a8);
    const awn = new THREE.Group(); awn.position.set(0, 2.2, d.d / 2); for (let i = 0; i < 6; i++) box(awn, (d.w + 0.2) / 6, 0.06, 0.9, -d.w / 2 + (i + 0.5) * (d.w + 0.2) / 6 + 0.1, 0, 0.45, i % 2 ? 0xf4f0e6 : 0xd9534f); awn.userData.dyn = 'awning'; g.add(awn); g.userData.awning = awn;
    const sh = box(g, d.w - 0.5, 1.3, 0.06, 0, 1.0, d.d / 2 + 0.25, 0x8e9aa3); sh.userData.dyn = 'shutter'; g.userData.shutter = sh; box(g, 3.0, 0.5, 0.08, 0, 2.6, d.d / 2 + 0.3, 0xfff3d6);
    const npc = makeHuman({ shirt: 0xd9534f, pants: 0x5a3e5f, female: true, hair: 0x1f1512 }); npc.scale.setScalar(0.85); npc.position.set(0.9, 0, 0.5); npc.userData.dyn = 'npc'; g.add(npc); g.userData.npc = npc; },
  balai(g, d) { box(g, d.w, 0.4, d.d, 0, 0, 0, C.stone); for (const x of [-d.w / 2 + 0.5, d.w / 2 - 0.5]) for (const z of [-d.d / 2 + 0.5, d.d / 2 - 0.5]) cyl(g, 0.16, 2.4, x, 0.4, z, C.wood); box(g, d.w - 0.8, 2.0, d.d - 1.6, 0, 0.4, -0.4, C.wall); hip(g, d.w + 0.6, 2.0, d.d + 0.6, 0, 2.8, 0, 0xb94a32); box(g, 1.4, 0.8, 0.1, 0, 0.4, d.d / 2 - 0.55, C.wood);
    box(g, 1.3, 5.0, 1.3, d.w / 2 + 1.4, 0, -0.6, C.wall2); hip(g, 1.5, 1.0, 1.5, d.w / 2 + 1.4, 5.0, -0.6, 0xb94a32); const face = put(g, CYL, mat(0xffffff), 0.9, 0.08, 0.9, d.w / 2 + 1.4, 4.0, -0.6 + 0.68); face.rotation.x = Math.PI / 2;
    const hand = box(new THREE.Group(), 0.06, 0.34, 0.05, 0, 0.17, 0, 0x222222); const hg = new THREE.Group(); hg.position.set(d.w / 2 + 1.4, 4.0, -0.6 + 0.74); hg.add(hand); hg.userData.dyn = 'hand'; g.add(hg); g.userData.hand = hg; },
  bank(g, d) { box(g, d.w + 0.6, 0.35, d.d + 0.6, 0, 0, 0, C.stone); box(g, d.w, 3.0, d.d, 0, 0.35, -0.3, C.white); gable(g, d.w + 0.4, 1.0, 0.8, 0, 3.35, d.d / 2 - 0.1, 0xdbe3ef); for (let k = 0; k < 5; k++) cyl(g, 0.17, 2.7, -d.w / 2 + 0.7 + k * (d.w - 1.4) / 4, 0.35, d.d / 2 - 0.2, 0xfafafa); box(g, d.w + 0.5, 0.3, 1.0, 0, 3.05, d.d / 2 - 0.2, C.stone); box(g, 2.4, 0.45, 0.08, 0, 3.5, d.d / 2 + 0.3, 0xf1c40f); win(g, 0.7, 1.0, -1.6, 1.5, d.d / 2 - 0.3); win(g, 0.7, 1.0, 1.6, 1.5, d.d / 2 - 0.3); },
  shop(g, d) { box(g, d.w, 2.6, d.d, 0, 0, 0, C.wall); box(g, d.w + 0.3, 0.3, d.d + 0.3, 0, 2.6, 0, d.col); for (let i = 0; i < 8; i++) box(g, (d.w + 0.2) / 8, 0.07, 1.1, -d.w / 2 + (i + 0.5) * (d.w + 0.2) / 8 + 0.1, 2.15 - 0.0, d.d / 2 + 0.55, i % 2 ? 0xf4f0e6 : d.col); win(g, 3.2, 1.2, 0, 1.0, d.d / 2 + 0.03); box(g, 1.0, 1.5, 0.08, d.w / 2 - 0.9, 0, d.d / 2 + 0.04, C.wood); box(g, 2.8, 0.45, 0.08, -d.w / 4, 2.9, d.d / 2 + 0.1, 0xfff3d6); for (const x of [-2.2, -1.5]) box(g, 0.5, 0.4, 0.4, x, 0, d.d / 2 + 0.7, 0xe8833a); },
  terminal(g, d) { box(g, d.w, 0.3, d.d, 0, 0, 0, C.stone); for (let k = 0; k < 4; k++) cyl(g, 0.14, 2.8, -d.w / 2 + 0.6 + k * (d.w - 1.2) / 3, 0.3, d.d / 2 - 0.5, 0x94a3b8); box(g, d.w, 0.3, d.d - 0.4, 0, 3.1, -0.2, d.col); box(g, d.w - 1.2, 2.2, 1.4, 0, 0.3, -d.d / 2 + 0.8, C.white); box(g, 3.0, 1.1, 1.2, 1.2, 0.35, d.d / 2 + 0.9, 0x38bdf8); box(g, 3.0, 0.2, 1.22, 1.2, 1.0, d.d / 2 + 0.9, 0xfafafa); },
  office(g, d) { box(g, d.w, d.h, d.d, 0, 0, 0, 0xdfe7ee); for (let f = 0; f < 4; f++) for (let k = 0; k < 3; k++) { win(g, 0.9, 0.8, -1.4 + k * 1.4, 0.9 + f * 1.2, d.d / 2 + 0.03); } box(g, d.w + 0.2, 0.25, d.d + 0.2, 0, d.h, 0, d.col); box(g, 1.2, 1.5, 0.1, 0, 0, d.d / 2 + 0.04, C.wood); box(g, 2.2, 0.4, 0.08, 0, d.h + 0.3, d.d / 2 - 0.1, 0xfff3d6); },
  bursa(g, d) { box(g, d.w + 0.4, 0.3, d.d + 0.4, 0, 0, 0, C.stone); box(g, d.w, 3.4, d.d, 0, 0.3, 0, 0xe9e2f5); gable(g, d.w + 0.4, 1.0, d.d + 0.4, 0, 3.7, 0, d.col); facade(g, d, 0, { floors: 2, fh: 1.3, doorW: 1.2 }); box(g, 3.6, 0.6, 0.1, 0, 3.0, d.d / 2 + 0.07, 0x1e1b4b); const tick = box(g, 3.4, 0.14, 0.04, 0, 3.0, d.d / 2 + 0.14, 0x4ade80); tick.userData.dyn = 'ticker'; g.userData.ticker = tick; },
  hub(g, d) { box(g, d.w, 2.8, d.d, 0, 0, 0, 0xf3e2c8); box(g, d.w + 0.3, 0.2, d.d + 0.3, 0, 2.8, 0, d.col); for (let k = 0; k < 3; k++) box(g, 1.3, 1.7, 0.1, -2.1 + k * 2.1, 0, d.d / 2 + 0.05, 0x94a3b8); box(g, 2.6, 0.5, 0.08, 0, 3.0, d.d / 2, 0xfff3d6); box(g, 1.7, 1.1, 1.1, d.w / 2 + 1.2, 0.35, 0.8, d.col); box(g, 0.9, 0.9, 1.0, d.w / 2 + 2.2, 0.35, 0.8, 0xfafafa); for (const x of [d.w / 2 + 0.8, d.w / 2 + 2.2]) for (const z of [0.3, 1.3]) cyl(g, 0.22, 0.2, x, 0, z, 0x222222); },
  umkm(g, d) { box(g, d.w, 0.2, d.d, 0, 0, 0, C.stone); const cols = [0xdb2777, 0x0ea5e9, 0xf59e0b, 0x16a34a]; for (let k = 0; k < 4; k++) { const x = -d.w / 2 + 0.9 + k * (d.w - 1.8) / 3; box(g, 1.5, 1.5, 1.4, x, 0.2, -0.4, 0xf3e2c8); gable(g, 1.8, 0.7, 1.8, x, 1.7, -0.4, cols[k], 0); box(g, 1.5, 0.08, 0.9, x, 1.3, 0.55, cols[k]); } box(g, d.w - 1, 0.4, 0.08, 0, 2.7, -1.2, 0xfff3d6); },
  field() {},
};
export function buildModel(def) { const g = new THREE.Group(); KINDS[def.kind](g, def); g.position.set(def.cx, 0, def.cz); g.userData.def = def; return g; }

/** Gabung mesh statis per material → draw call turun drastis. Bagian userData.dyn dan yang di dalam grup dyn tidak digabung. */
export function mergeStatic(root, parent) {
  root.updateMatrixWorld(true); const by = new Map(), kill = [];
  const dynUp = o => { for (let p = o; p; p = p.parent) if (p.userData && p.userData.dyn) return true; return false; };
  root.traverse(o => { if (!o.isMesh || dynUp(o) || o.userData.noMerge) return; let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone(); g.applyMatrix4(o.matrixWorld); const k = o.material.uuid; if (!by.has(k)) by.set(k, { m: o.material, gs: [] }); by.get(k).gs.push(g); kill.push(o); });
  for (const o of kill) o.parent.remove(o);
  for (const { m, gs } of by.values()) { let n = 0; for (const g of gs) n += g.attributes.position.count; const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let off = 0; for (const g of gs) { pos.set(g.attributes.position.array, off * 3); nor.set(g.attributes.normal.array, off * 3); off += g.attributes.position.count; g.dispose(); } const bg = new THREE.BufferGeometry(); bg.setAttribute('position', new THREE.BufferAttribute(pos, 3)); bg.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); bg.computeBoundingSphere(); const me = new THREE.Mesh(bg, m); me.frustumCulled = false; (parent || root).add(me); }
}

export function makePed(shirt, pants, skin) { const g = new THREE.Group(); const body = new THREE.Group(); g.add(body); put(body, CYL, mat(shirt), 0.42, 0.62, 0.3, 0, 0.9, 0); put(body, SPH, mat(skin), 0.34, 0.34, 0.34, 0, 1.38, 0); put(body, SPH, mat(0x2b1d14), 0.36, 0.2, 0.36, 0, 1.46, -0.02);
  const legs = [-1, 1].map(s => { const p = new THREE.Group(); p.position.set(s * 0.1, 0.62, 0); put(p, BOX, mat(pants), 0.14, 0.62, 0.16, 0, -0.31, 0); body.add(p); return p; }); g.userData = { body, legs, phase: Math.random() * 6 }; return g; }
export function animatePed(g, t, v) { const u = g.userData, s = Math.sin(t * 8 + u.phase) * v; u.legs[0].rotation.x = s * 0.9; u.legs[1].rotation.x = -s * 0.9; u.body.position.y = Math.abs(s) * 0.04; }
export function makeCar(c, kind = 'car') { const g = new THREE.Group(); if (kind === 'bike') { put(g, BOX, mat(c), 0.35, 0.35, 1.1, 0, 0.55, 0); put(g, BOX, mat(0x222222), 0.1, 0.5, 0.5, 0, 0.3, 0.45); put(g, BOX, mat(0x222222), 0.1, 0.5, 0.5, 0, 0.3, -0.45); put(g, SPH, mat(0xe0a97c), 0.28, 0.28, 0.28, 0, 1.15, 0); return g; }
  put(g, BOX, mat(c), 1.0, 0.45, 2.0, 0, 0.5, 0); put(g, BOX, mat(0xdfeaf2), 0.9, 0.4, 1.0, 0, 0.92, -0.1); for (const x of [-0.5, 0.5]) for (const z of [-0.7, 0.7]) put(g, CYL, mat(0x1f2937), 0.34, 0.14, 0.34, x, 0.2, z).rotation.z = Math.PI / 2; return g; }
