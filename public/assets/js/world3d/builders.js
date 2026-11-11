// Pembuat model prosedural bergaya "kampung" (low-poly hangat, tanpa tekstur & tanpa aset pihak ketiga).
// Semua geometri dibagi (cache) agar draw call/memori kecil di Android 4 GB. Tidak ada data game di sini.
import * as THREE from '../../vendor/three/three.module.min.js';

export const PAL = { grass: 0x8fbf6a, grass2: 0x7fb25d, road: 0x6b6f76, roadLine: 0xf2e9c8, dirt: 0xc9a66b, wall: 0xf3e3c3, wall2: 0xe9c9a0, roof: 0xc2543a, roof2: 0x6f8f9c, wood: 0x8a5a3b, trunk: 0x7a4f32, leaf: 0x4f9a4a, leaf2: 0x66b055, skin: 0xe0a97c, skin2: 0xc68a5e, glass: 0xbfe3f2, shadow: 0x000000 };
const mats = new Map();
export const mat = (c, o = {}) => { const k = c + JSON.stringify(o); let m = mats.get(k); if (!m) { m = new THREE.MeshLambertMaterial({ color: c, flatShading: true, ...o }); mats.set(k, m); } return m; };
export const hash = (a, b) => { const x = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return x - Math.floor(x); };
const geos = new Map();
export const geo = (k, f) => { let g = geos.get(k); if (!g) { g = f(); geos.set(k, g); } return g; };
export const box = (w, h, d) => geo(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const mesh = (g, m, x = 0, y = 0, z = 0) => { const o = new THREE.Mesh(g, m); o.position.set(x, y, z); return o; };

export function blobShadow(r = 0.5) { const m = mesh(geo('sh' + r, () => new THREE.CircleGeometry(r, 14)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22, depthWrite: false }), 0, 0.02, 0); m.rotation.x = -Math.PI / 2; m.userData.isShadow = true; return m; }

/** Manusia low-poly: kepala, badan, lengan & kaki berpivot (untuk animasi jalan/lambai). */
export function makeHuman({ shirt = 0x2f6fbf, pants = 0x3a3f58, skin = PAL.skin, hair = 0x2b1d14, female = false } = {}) {
  const g = new THREE.Group(), body = new THREE.Group(); g.add(body);
  const torso = mesh(geo('torso', () => new THREE.CapsuleGeometry(0.26, 0.34, 3, 8)), mat(shirt), 0, 1.0, 0); body.add(torso);
  const head = mesh(geo('head', () => new THREE.SphereGeometry(0.24, 12, 10)), mat(skin), 0, 1.58, 0); body.add(head);
  const hairM = mesh(geo('hair', () => new THREE.SphereGeometry(0.255, 12, 8, 0, Math.PI * 2, 0, Math.PI * (female ? 0.62 : 0.5))), mat(hair), 0, 1.6, -0.01); body.add(hairM);
  if (female) body.add(mesh(box(0.34, 0.3, 0.14), mat(hair), 0, 1.42, -0.17));
  for (const s of [-1, 1]) body.add(mesh(geo('eye', () => new THREE.SphereGeometry(0.035, 6, 6)), mat(0x1a1a1a), s * 0.09, 1.6, 0.21));
  body.add(mesh(box(0.05, 0.06, 0.05), mat(skin), 0, 1.55, 0.235)); // hidung
  const mouth = mesh(box(0.1, 0.022, 0.03), mat(0x8a3b3b), 0, 1.48, 0.222); body.add(mouth);
  for (const s of [-1, 1]) { const br = mesh(box(0.085, 0.02, 0.03), mat(hair), s * 0.09, 1.67, 0.205); br.rotation.z = s * -0.12; body.add(br); }
  const limb = (x, y, len, w, c, geoKey) => { const p = new THREE.Group(); p.position.set(x, y, 0); p.add(mesh(box(w, len, w), mat(c), 0, -len / 2, 0)); body.add(p); return p; };
  const armL = limb(-0.36, 1.2, 0.5, 0.14, shirt), armR = limb(0.36, 1.2, 0.5, 0.14, shirt);
  const legL = limb(-0.14, 0.72, 0.72, 0.17, pants), legR = limb(0.14, 0.72, 0.72, 0.17, pants);
  for (const l of [legL, legR]) l.add(mesh(box(0.2, 0.1, 0.28), mat(0x2a2320), 0, -0.72, 0.04));
  g.add(blobShadow(0.42)); g.userData = { body, armL, armR, legL, legR, head, mouth, torso, phase: Math.random() * 6 };
  return g;
}

/** Animasi: speed 0..1 (jalan), wave 0..1 (lambai tangan kanan). Dipanggil tiap frame; murah (hanya rotasi). */
export function animateHuman(g, t, speed, wave = 0) {
  const u = g.userData, s = Math.sin(t * 9 + u.phase) * speed;
  u.legL.rotation.x = s * 0.9; u.legR.rotation.x = -s * 0.9; u.armL.rotation.x = -s * 0.7;
  u.armR.rotation.x = wave > 0 ? -2.4 + Math.sin(t * 8) * 0.35 * wave : s * 0.7; u.armR.rotation.z = wave > 0 ? -0.25 : 0;
  u.body.position.y = Math.abs(Math.sin(t * 9 + u.phase)) * 0.05 * speed + Math.sin(t * 1.6 + u.phase) * 0.008 * (1 - speed);
}

export function makeTree(s = 1, c = PAL.leaf) {
  const g = new THREE.Group(); g.add(mesh(geo('trunk', () => new THREE.CylinderGeometry(0.12, 0.17, 1.1, 6)), mat(PAL.trunk), 0, 0.55, 0));
  g.add(mesh(geo('crown', () => new THREE.IcosahedronGeometry(0.85, 0)), mat(c), 0, 1.7, 0)); g.add(mesh(geo('crown2', () => new THREE.IcosahedronGeometry(0.6, 0)), mat(PAL.leaf2), 0.45, 1.35, 0.2));
  g.add(blobShadow(0.8)); g.scale.setScalar(s); return g;
}

/** Rumah sederhana (atap pelana, pintu, jendela). */
export function makeHouse({ wall = PAL.wall, roof = PAL.roof, w = 4.4, d = 3.6 } = {}) {
  const g = new THREE.Group(); g.add(mesh(box(w, 2.2, d), mat(wall), 0, 1.1, 0));
  const r = mesh(geo(`roof${w},${d}`, () => { const sh = new THREE.Shape(); sh.moveTo(-w / 2 - 0.3, 0); sh.lineTo(w / 2 + 0.3, 0); sh.lineTo(0, 1.4); sh.closePath(); const e = new THREE.ExtrudeGeometry(sh, { depth: d + 0.5, bevelEnabled: false }); e.translate(0, 0, -(d + 0.5) / 2); return e; }), mat(roof), 0, 2.2, 0); g.add(r);
  g.add(mesh(box(0.8, 1.4, 0.08), mat(PAL.wood), 0, 0.7, d / 2 + 0.02));
  for (const s of [-1, 1]) g.add(mesh(box(0.8, 0.7, 0.08), mat(PAL.glass), s * 1.5, 1.3, d / 2 + 0.02));
  g.add(mesh(box(w + 0.8, 0.12, 0.9), mat(0xb9b2a4), 0, 0.06, d / 2 + 0.45));
  return g;
}

/** Warung: kios terbuka dengan kanopi & rolling door (state buka/tutup dianimasikan lewat setOpen). */
export function makeWarung() {
  const g = new THREE.Group(), w = 5, d = 3.2;
  g.add(mesh(box(w, 2.4, d), mat(PAL.wall2), 0, 1.2, 0));
  g.add(mesh(box(w + 0.4, 0.18, d + 0.5), mat(PAL.roof2), 0, 2.5, 0.1));
  const awn = new THREE.Group(); awn.position.set(0, 2.35, d / 2); g.add(awn);
  for (let i = 0; i < 6; i++) awn.add(mesh(box((w + 0.2) / 6, 0.05, 0.8), mat(i % 2 ? 0xf4f0e6 : 0xd9534f), -w / 2 + (i + 0.5) * (w + 0.2) / 6 + 0.1, 0, 0.4));
  const counter = mesh(box(w - 0.6, 0.9, 0.7), mat(PAL.wood), 0, 0.45, d / 2 + 0.05); g.add(counter);
  const shutter = mesh(box(w - 0.5, 1.4, 0.06), mat(0x8e9aa3), 0, 1.65, d / 2 + 0.22); g.add(shutter);
  g.add(mesh(box(w - 0.5, 0.06, 0.74), mat(0xf0d9a8), 0, 0.93, d / 2 + 0.05));
  for (const x of [-1.5, 0, 1.5]) g.add(mesh(box(0.5, 0.3, 0.35), mat(PAL.leaf2), x, 1.08, d / 2 + 0.12));
  const lamp = mesh(geo('lamp', () => new THREE.SphereGeometry(0.12, 8, 6)), new THREE.MeshBasicMaterial({ color: 0xffe9a8 }), 0, 2.2, d / 2 + 0.5); g.add(lamp);
  const sign = mesh(box(3.2, 0.5, 0.08), mat(0xfff3d6), 0, 2.85, d / 2 + 0.3); g.add(sign);
  let open = null, k = 0;
  g.userData.setOpen = (o, instant) => { open = o; if (instant) k = o ? 1 : 0; };
  g.userData.update = dt => { if (open === null) return; k += ((open ? 1 : 0) - k) * Math.min(1, dt * 4); shutter.scale.y = Math.max(0.04, 1 - k); shutter.position.y = 2.35 - 0.7 * Math.max(0.04, 1 - k) * 1; awn.rotation.x = -0.12 - 0.25 * k; lamp.visible = k > 0.5; };
  return g;
}

export function makeFence(len, step = 0.6) { const g = new THREE.Group(); for (let x = 0; x <= len; x += step) g.add(mesh(box(0.08, 0.6, 0.08), mat(PAL.wood), x, 0.3, 0)); g.add(mesh(box(len, 0.06, 0.05), mat(PAL.wood), len / 2, 0.45, 0)); return g; }
