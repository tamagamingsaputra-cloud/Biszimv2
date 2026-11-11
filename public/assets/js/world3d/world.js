// Renderer 3D Kampung BizSim (isometrik, ortografik). Hanya MENGGAMBAR dan menangani input/navigasi.
// Waktu, kebutuhan, saldo, transaksi tetap milik sistem 2D + server; world ini tidak menyimpan/mengubah data game.
import * as THREE from '../../vendor/three/three.module.min.js';
import { T, W, D, BUILDINGS, BY_ID, trees, paths, nodes, findPath, walkable, clearAt, isRoad, isOpen, blockOrigin, hash } from './city.js';
import { mat, C, winMat, lampMat, buildModel, mergeStatic, tree, makeHuman, animateHuman } from './models.js';
import { makeVehicle, VEHICLE_KINDS, VEHICLE_R, VEHICLE_HL, VEHICLE_SPEED } from './vehicles.js';
import { makePerson, ROLE_LIST } from './people.js';
import { createAudio } from './audio.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
export const PRESETS = { low: { pr: 1, peds: 4, cars: 2 }, medium: { pr: 1.25, peds: 8, cars: 4 }, high: { pr: 1.75, peds: 14, cars: 7 } };
const SKY = { night: new THREE.Color(0x1d2744), dawn: new THREE.Color(0xf6c79a), day: new THREE.Color(0xa9dcf0), dusk: new THREE.Color(0xee9a72) };
const PITCH = 0.62, DIST = 60;
export function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export function createWorld(canvas, { quality = 'medium', onBuilding, onFrame, onNoRoute, hourFn = () => 12 } = {}) {
  const audio = createAudio(), opts = { sens: 1, pinch: 1, drawDist: 0, shadows: true, power: false }; let lastDraw = 0, stepAcc = 0;
  let preset = PRESETS[quality] ? quality : 'medium', pr = Math.min(window.devicePixelRatio || 1, PRESETS[preset].pr);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance', alpha: false });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-10, 10, 10, -10, 1, 200);
  const hemi = new THREE.HemisphereLight(0xffffff, 0x8a9a6a, 0.9), sun = new THREE.DirectionalLight(0xfff1d0, 1.0); sun.position.set(-20, 40, 15); scene.add(hemi, sun);

  // ——— tanah, kavling, jalan ———
  const root = new THREE.Group(); scene.add(root);
  const flat = (w, d, x, y, z, c) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat(c)); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); root.add(m); return m; };
  flat(220, 220, 0, -0.02, 0, C.grass2);
  const cx0 = T.ox + W / 2, cz0 = T.oz + D / 2;
  flat(W + 6, D + 6, cx0, -0.005, cz0, C.dirt2);
  for (let i = 0; i < T.nx; i++) for (let j = 0; j < T.nz; j++) { const o = blockOrigin(i, j); flat(T.bs, T.bs, o.x + T.bs / 2, 0.01, o.z + T.bs / 2, (i + j) % 2 ? C.grass : 0x93c868); }
  for (let i = 0; i <= T.nx; i++) flat(T.road, D, T.ox + i * T.pitch + 1, 0.02, cz0, C.road);
  for (let j = 0; j <= T.nz; j++) flat(W, T.road, cx0, 0.021, T.oz + j * T.pitch + 1, C.road);
  for (let i = 0; i <= T.nx; i++) for (let z = T.oz + 1; z < T.oz + D - 1; z += 3) flat(0.12, 1.4, T.ox + i * T.pitch + 1, 0.03, z, C.line);
  for (let j = 0; j <= T.nz; j++) for (let x = T.ox + 1; x < T.ox + W - 1; x += 3) flat(1.4, 0.12, x, 0.031, T.oz + j * T.pitch + 1, C.line);
  for (const p of paths) flat(1, 1, p.x + 0.5, 0.03, p.z + 0.5, C.dirt);
  for (const b of BUILDINGS) if (b.door) { flat(b.w + 1.2, b.d + 1.2, b.cx, 0.015, b.cz, 0xe9dcb9); }
  for (const t of trees) { const o = tree(t.s, hash(t.x * 7, t.z * 3) > 0.5 ? C.leaf : C.leaf2); o.position.set(t.x, 0, t.z); root.add(o); }
  for (const n of nodes) for (const [sx, sz] of [[1.4, 1.4]]) { const g = new THREE.Group(); const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), mat(0x4b5563)); pole.position.y = 1.1; const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6), lampMat); lamp.position.y = 2.3; g.add(pole, lamp); g.position.set(n.x + sx, 0, n.z + sz); root.add(g); }
  const dyn = { shutter: null, awning: null, flag: null, hand: null, ticker: null, npc: null };
  const boxes = [];
  for (const b of BUILDINGS) { if (b.kind === 'field') continue; const m = buildModel(b); root.add(m); const u = m.userData; for (const k of Object.keys(dyn)) if (u[k]) dyn[k] = u[k]; boxes.push({ b, box: new THREE.Box3(new THREE.Vector3(b.x0 - 0.1, 0, b.z0 - 0.1), new THREE.Vector3(b.x1 + 0.1, b.h + 1.2, b.z1 + 0.3)) }); }
  mergeStatic(root);

  // ——— karakter, pejalan kaki, kendaraan ———
  const spawn = BY_ID.home.door; const player = makeHuman({ shirt: 0x2f6fbf }); player.scale.setScalar(0.62); player.position.set(spawn.x, 0, spawn.z); root.add(player);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.5, 0.65, 24), new THREE.MeshBasicMaterial({ color: 0x2f6fbf, transparent: true, opacity: 0.9, depthWrite: false })); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.05; player.add(ring); ring.scale.setScalar(1 / 0.62);
  const dest = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.45, 20), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.9, depthWrite: false })); dest.rotation.x = -Math.PI / 2; dest.visible = false; root.add(dest);
  const dotGeo = new THREE.BufferGeometry(), dots = new THREE.Points(dotGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 5, sizeAttenuation: false, depthTest: false, transparent: true, opacity: 0.9 })); dots.renderOrder = 5; dots.frustumCulled = false; root.add(dots);
  const peds = [], cars = []; const shirts = [0xd9534f, 0x2f6fbf, 0x16a34a, 0xf59e0b, 0x7c3aed, 0xdb2777, 0x0e7490], skins = [0xe0a97c, 0xc68a5e, 0xf1c9a5, 0xa8714a];
  const lane = (a, b, off) => { const dx = b.x - a.x, dz = b.z - a.z, L = Math.hypot(dx, dz) || 1; return { ox: -dz / L * off, oz: dx / L * off }; };
  const nextNode = (cur, prev, r) => { const nb = nodes.filter(n => (Math.abs(n.i - cur.i) + Math.abs(n.j - cur.j)) === 1 && n !== prev); const l = nb.length ? nb : nodes.filter(n => (Math.abs(n.i - cur.i) + Math.abs(n.j - cur.j)) === 1); return l[Math.floor(r * l.length) % l.length]; };
  function spawnActors() {
    for (const o of [...peds, ...cars]) root.remove(o.mesh); peds.length = 0; cars.length = 0; const P = PRESETS[preset];
    for (let k = 0; k < P.peds; k++) { const n0 = nodes[Math.floor(hash(k, 3) * nodes.length)], mesh = makePerson(ROLE_LIST[k % ROLE_LIST.length], k); mesh.scale.setScalar(0.62 * mesh.userData.hScale); root.add(mesh); if (!opts.shadows) mesh.traverse(q => { if (q.userData.isShadow) q.visible = false; }); peds.push({ r: 0.3, mesh, a: n0, b: nextNode(n0, null, hash(k, 9)), t: hash(k, 5), v: 1.3, seed: k }); }
    const carColors = [0xe5484d, 0x2563eb, 0xf4f4f5, 0x16a34a, 0xfacc15, 0x7c3aed];
    for (let k = 0; k < P.cars; k++) { const n0 = nodes[Math.floor(hash(k, 33) * nodes.length)], kind = VEHICLE_KINDS[k % VEHICLE_KINDS.length], mesh = makeVehicle(kind, carColors[k % carColors.length]); root.add(mesh); cars.push({ r: VEHICLE_R[kind], hl: VEHICLE_HL[kind], kind, mesh, a: n0, b: nextNode(n0, null, hash(k, 19)), t: hash(k, 7), v: VEHICLE_SPEED[kind], seed: k + 50 }); }
  }
  spawnActors();

  // ——— navigasi ———
  let route = [], pending = null, act = 0, moving = false, follow = true, routeLen = 0;
  const target = new THREE.Vector3(spawn.x, 0, spawn.z); let yaw = Math.PI / 4, yawT = yaw, zoom = 1, zoomT = 1;
  function setRoute(pts, end) {
    route = pts || []; moving = route.length > 0; dest.visible = moving && !!end; if (end) dest.position.set(end.x, 0.06, end.z);
    routeLen = 0; let px = player.position.x, pz = player.position.z; for (const p of route) { routeLen += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; }
    const pos = []; px = player.position.x; pz = player.position.z; for (const p of route) { const L = Math.hypot(p.x - px, p.z - pz), n = Math.max(1, Math.round(L / 0.7)); for (let s = 1; s <= n; s++) pos.push(lerp(px, p.x, s / n), 0.08, lerp(pz, p.z, s / n)); px = p.x; pz = p.z; }
    bestLen = routeLen; noProg = 0;
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dotGeo.setDrawRange(0, pos.length / 3);
  }
  let goal = null, stuck = 0, tries = 0, replanning = false, wish = null, curStep = 0, okT = 0, bestLen = Infinity, noProg = 0;
  function walkTo(x, z) { pending = null; act = 0; goal = { x, z }; if (!replanning) tries = 0; const p = findPath(player.position.x, player.position.z, x, z); if (!p) { onNoRoute?.(); return false; } setRoute(p, p[p.length - 1] || { x, z }); follow = true; if (!replanning) audio.tap(); return true; }
  function replan() { if (!goal || ++tries > 8) { setRoute([]); pending = null; goal = null; onNoRoute?.(); return; } replanning = true; if (goal.id) goBuilding(goal.id); else walkTo(goal.x, goal.z); replanning = false; }
  function goBuilding(id) { const b = BY_ID[id]; if (!b?.door) return false; pending = null; act = 0; goal = { id }; if (!replanning) tries = 0; const p = findPath(player.position.x, player.position.z, b.door.x, b.door.z); if (!p && Math.hypot(player.position.x - b.door.x, player.position.z - b.door.z) > 1.5) return false; pending = id; setRoute(p || [], b.door); follow = true; if (!p || !p.length) arrived(); return true; }
  function arrived() { if (!pending) return; const b = BY_ID[pending]; player.rotation.y = Math.atan2(b.cx - player.position.x, b.cz - player.position.z); act = 0.9; audio.door(); }

  // ——— input ———
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pts = new Map();
  let down = null, drag = false, pinch = null;
  const rect = () => canvas.getBoundingClientRect();
  // hasil ketukan dihitung saat jari MENYENTUH layar (kamera mengikuti karakter, jadi saat jari diangkat kamera sudah bergeser)
  function resolve(ev) {
    const r = rect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    let best = null, bd = Infinity; const hit = new THREE.Vector3(); for (const e of boxes) if (ray.ray.intersectBox(e.box, hit)) { const d = hit.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = e.b; } }
    if (best) return { b: best }; const p = new THREE.Vector3(); return ray.ray.intersectPlane(plane, p) ? { p } : null;
  }
  function doTap(res) { if (!res) return; if (res.b) { if (res.b.door) goBuilding(res.b.id); onBuilding?.(res.b, false); } else walkTo(res.p.x, res.p.z); }
  let downPick = null;
  canvas.addEventListener('pointerdown', e => { audio.unlock(); canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY }; drag = false; downPick = pts.size === 1 ? resolve(e) : null; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomT = clamp(zoomT * Math.pow(d / pinch, opts.pinch), 0.45, 2.6); pinch = d; drag = true; return; }
    if (down && (drag || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8)) { drag = true; follow = false; const s = (2 * (16 / zoom)) / rect().height * opts.sens, cy = Math.cos(yaw), sy = Math.sin(yaw); target.x -= cy * dx * s; target.z += sy * dx * s; target.x -= sy * dy * s / Math.sin(PITCH); target.z -= cy * dy * s / Math.sin(PITCH); target.x = clamp(target.x, T.ox, T.ox + W); target.z = clamp(target.z, T.oz, T.oz + D); } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
  canvas.addEventListener('pointerup', e => { if (!drag && down && pts.has(e.pointerId)) doTap(downPick || resolve(e)); downPick = null; up(e); down = null; }); canvas.addEventListener('pointercancel', up);
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomT = clamp(zoomT * (1 - Math.sign(e.deltaY) * 0.1), 0.45, 2.6); }, { passive: false });
  function resize() { const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300; renderer.setPixelRatio(pr); renderer.setSize(w, h, false); aspect = w / h; }
  let aspect = 1; new ResizeObserver(resize).observe(canvas); resize();

  // ——— loop ———
  const perf = { ms: 16, fps: 60, slow: 0, worst: 0 }; let t = 0, last = performance.now(), running = false, raf = 0, nightK = 0, frameN = 0;
  function skyAt(h) { const c = new THREE.Color(); let night = h < 4.5 || h >= 19.5;
    if (night) c.copy(SKY.night); else if (h < 7) c.copy(SKY.dawn).lerp(SKY.day, clamp((h - 5) / 2, 0, 1)); else if (h < 16.5) c.copy(SKY.day); else if (h < 18.5) c.copy(SKY.day).lerp(SKY.dusk, (h - 16.5) / 2); else c.copy(SKY.dusk).lerp(SKY.night, h - 18.5);
    if (h >= 4.5 && h < 5) c.copy(SKY.night).lerp(SKY.dawn, (h - 4.5) / 0.5);
    const dayF = h < 4.5 || h >= 19.5 ? 0 : h < 6 ? (h - 4.5) / 1.5 : h < 18 ? 1 : (19.5 - h) / 1.5; return { c, dayF: clamp(dayF, 0, 1) }; }
  const tmp = new THREE.Vector3();
  function moveActor(a, dt, isCar) { const A = a.a, B = a.b, dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1, qx = player.position.x - a.mesh.position.x, qz = player.position.z - a.mesh.position.z, yieldTo = (qx * dx + qz * dz) > 0 && Math.hypot(qx, qz) < (isCar ? 1.9 + a.r + a.hl : 1.0); let hold = yieldTo; if (yieldTo) { a.wait = (a.wait || 0) + dt; if (a.wait > 1.2) { a.go = 2; a.wait = 0; } } else a.wait = Math.max(0, (a.wait || 0) - dt); if ((a.go || 0) > 0) { a.go -= dt; hold = false; } // mengalah maksimal ±1,2 dtk agar tidak terjadi kebuntuan
    a.t += hold ? 0 : a.v * dt / L; if (a.t >= 1) { a.t = 0; const prev = a.a; a.a = B; a.b = nextNode(B, prev, hash(a.seed, Math.floor(t * 3) + 1)); }
    const { ox, oz } = lane(a.a, a.b, isCar ? 0.5 : 1.1), x = lerp(a.a.x, a.b.x, a.t) + ox, z = lerp(a.a.z, a.b.z, a.t) + oz; a.mesh.position.set(x, 0, z); a.mesh.rotation.y = Math.atan2(a.b.x - a.a.x, a.b.z - a.a.z); }
  // tabrakan pemain vs NPC/kendaraan (lingkaran) + jaga tidak pernah masuk tile terhalang
  function collide(ox, oz) {
    const R = 0.28; let x = player.position.x, z = player.position.z;
    const push = a => {
      let cx = a.mesh.position.x, cz = a.mesh.position.z; // kapsul: titik terdekat pada ruas garis kendaraan
      if (a.hl) { const ux = a.b.x - a.a.x, uz = a.b.z - a.a.z, L = Math.hypot(ux, uz) || 1, t = Math.max(-a.hl, Math.min(a.hl, ((x - cx) * ux + (z - cz) * uz) / L)); cx += ux / L * t; cz += uz / L * t; }
      const dx = x - cx, dz = z - cz, d = Math.hypot(dx, dz), m = R + a.r; if (d >= m) return;
      const rx = d > 1e-4 ? dx / d : 1, rz = d > 1e-4 ? dz / d : 0;
      // dorong keluar ke titik bebas terdekat di tepi kapsul: arah radial dulu, lalu ±45°, ±90°, ±135°, 180°
      let moved = false; for (const da of [0, 0.785, -0.785, 1.571, -1.571, 2.356, -2.356, 3.1416]) { const c = Math.cos(da), sn = Math.sin(da), ux = rx * c - rz * sn, uz = rx * sn + rz * c, px = cx + ux * m, pz = cz + uz * m; if (clearAt(px, pz, 0.2)) { x = px; z = pz; moved = true; break; } }
      if (!moved) { x = ox; z = oz; return; }
      if (wish) { // menyelip: arah tujuan dikurangi komponen yang menembus aktor (sisa = menyusuri kapsul); bila head-on, pilih sisi yang bebas
        let tx = wish.x - (wish.x * rx + wish.z * rz) * rx, tz = wish.z - (wish.x * rx + wish.z * rz) * rz; const tl = Math.hypot(tx, tz);
        const cand = tl > 0.25 ? [[tx / tl, tz / tl]] : [[-rz, rx], [rz, -rx]], k = curStep * 0.9;
        for (const [ux, uz] of cand) { const sx = x + ux * k, sz = z + uz * k; if (clearAt(sx, sz, 0.2)) { x = sx; z = sz; break; } }
      }
    };
    for (const a of peds) push(a); for (const a of cars) push(a);
    if (!clearAt(x, z, 0.15)) { x = ox; z = oz; } player.position.x = x; player.position.z = z;
  }
  let openK = 0;
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame); if (opts.power && now - lastDraw < 31) return; lastDraw = now; frameN++;
    const rawDt = (now - last) / 1000; last = now; const dt = Math.min(rawDt, 0.1); t += dt; perf.ms = lerp(perf.ms, rawDt * 1000, 0.1); perf.fps = 1000 / perf.ms; perf.worst = Math.max(perf.worst * 0.995, rawDt * 1000);
    if (perf.slow > 3 && pr > 0.75) { pr = Math.max(0.75, pr - 0.25); perf.slow = 0; resize(); } perf.slow = perf.ms > 40 ? perf.slow + dt : Math.max(0, perf.slow - dt);
    const hour = hourFn(); let speed = 0;
    if (act > 0) { act -= dt; animateHuman(player, t, 0, 1); if (act <= 0) { const id = pending; pending = null; if (id && BY_ID[id]) onBuilding?.(BY_ID[id], true); } }
    else if (moving) { const p = route[0], ox = player.position.x, oz = player.position.z, dx = p.x - player.position.x, dz = p.z - player.position.z, d = Math.hypot(dx, dz), step = 3.6 * dt; speed = 1; wish = d > 1e-6 ? { x: dx / d, z: dz / d } : null; curStep = step;
      if (d <= step) { player.position.x = p.x; player.position.z = p.z; route.shift(); if (!route.length) { moving = false; dest.visible = false; setRoute([]); arrived(); } } else { player.position.x += dx / d * step; player.position.z += dz / d * step; player.rotation.y = Math.atan2(dx, dz); }
      collide(ox, oz); { const mv = Math.hypot(player.position.x - ox, player.position.z - oz); stuck = moving && mv < step * 0.3 ? stuck + dt : 0; okT = mv >= step * 0.6 ? okT + dt : 0; if (okT > 1.5) { tries = 0; okT = 0; } if (stuck > 0.7) { stuck = 0; replan(); } }
      if (moving) { routeLen = 0; let px = player.position.x, pz = player.position.z; for (const q of route) { routeLen += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; } }
      if (moving) { if (routeLen < bestLen - 0.4) { bestLen = routeLen; noProg = 0; } else if ((noProg += dt) > 3) { noProg = 0; replan(); } } // pengawas kemajuan: tidak maju 3 dtk → hitung ulang rute
      animateHuman(player, t, speed); }
    else animateHuman(player, t, 0);
    if (!moving) { wish = null; collide(player.position.x, player.position.z); } // diam pun tidak boleh ditembus NPC/kendaraan
    const near = dyn.npc && Math.hypot(player.position.x - BY_ID.warung.cx, player.position.z - BY_ID.warung.cz) < 7; if (dyn.npc) animateHuman(dyn.npc, t, 0, near ? 1 : 0);
    for (const p of peds) { moveActor(p, dt, false); animateHuman(p.mesh, t, 1); } for (const c of cars) moveActor(c, dt, true);
    ring.scale.setScalar((1 + Math.sin(t * 4) * 0.06) / 0.62); dest.scale.setScalar(1 + Math.sin(t * 6) * 0.12);
    // objek bergerak
    const wopen = isOpen(BY_ID.warung, hour) ? 1 : 0; openK += (wopen - openK) * Math.min(1, dt * 4); if (dyn.shutter) { const k = Math.max(0.05, 1 - openK); dyn.shutter.scale.y = 1.3 * k; dyn.shutter.position.y = 2.3 - 0.65 * k; }
    if (dyn.awning) dyn.awning.rotation.x = -0.1 - 0.25 * openK; if (dyn.flag) dyn.flag.rotation.y = Math.sin(t * 3) * 0.35; if (dyn.hand) dyn.hand.rotation.z = -((hour % 1) * 2 * Math.PI); if (dyn.ticker) dyn.ticker.material.color.setHex(Math.sin(t * 2) > 0 ? 0x4ade80 : 0xf87171);
    // kamera
    if (follow) { target.x = lerp(target.x, player.position.x, 1 - Math.pow(0.003, dt)); target.z = lerp(target.z, player.position.z, 1 - Math.pow(0.003, dt)); }
    yaw = lerp(yaw, yawT, 1 - Math.pow(0.0005, dt)); zoom = lerp(zoom, zoomT, 1 - Math.pow(0.0008, dt)); const H = 16 / zoom;
    cam.left = -H * aspect; cam.right = H * aspect; cam.top = H; cam.bottom = -H; cam.updateProjectionMatrix();
    cam.position.set(target.x + Math.sin(yaw) * Math.cos(PITCH) * DIST, Math.sin(PITCH) * DIST, target.z + Math.cos(yaw) * Math.cos(PITCH) * DIST); cam.lookAt(target);
    // siang/malam
    const { c, dayF } = skyAt(hour); scene.background = c; hemi.intensity = Math.PI * (0.28 + 0.36 * dayF); sun.intensity = Math.PI * (0.06 + 0.50 * dayF); sun.color.setHex(dayF < 0.5 ? 0x8fa6ff : 0xfff1d0); nightK = lerp(nightK, 1 - dayF, 0.05);
    winMat.emissive.setRGB(1 * nightK, 0.82 * nightK, 0.45 * nightK); winMat.color.setHex(nightK > 0.5 ? 0xffe9a8 : 0xbfe3f2); lampMat.color.setHex(nightK > 0.5 ? 0xffe39a : 0x9aa3ad);
    // suara: langkah menurut permukaan, kendaraan (jarak/jenis/pan layar), pasar & mesin menurut jarak bangunan
    if (moving) { stepAcc += speed * 3.6 * dt; if (stepAcc > 0.85) { stepAcc = 0; audio.step(isRoad(Math.floor(player.position.x), Math.floor(player.position.z)) ? 'hard' : 'soft'); } } else stepAcc = 0.6;
    { const px = player.position.x, pz = player.position.z, dd = id => { const b = BY_ID[id]; return b ? Math.hypot(b.cx - px, b.cz - pz) : 99; };
      audio.update({ dt, dayF, market: Math.min(dd('warung'), dd('minimarket'), dd('umkm'), dd('bursa'), dd('hub')), machine: Math.min(dd('spbu'), dd('terminal')),
        vehicles: cars.map(c => { const q = c.mesh.position; tmp.set(q.x, 0, q.z).project(cam); return { kind: c.kind, v: c.v, d: Math.hypot(q.x - px, q.z - pz), pan: tmp.x * 0.9 }; }) }); }
    // jarak render & bayangan (pengaturan)
    if (opts.drawDist) for (const o of [...peds, ...cars]) o.mesh.visible = Math.hypot(o.mesh.position.x - player.position.x, o.mesh.position.z - player.position.z) < opts.drawDist;
    renderer.render(scene, cam); if (frameN % 2 === 0) onFrame?.({ yaw, zoom, hour, route: routeLen, moving, follow });
  }
  const api = {
    start(fn) { if (fn) hourFn = fn; if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }, stop() { running = false; cancelAnimationFrame(raf); },
    get destination() { return dest.visible ? { x: dest.position.x, z: dest.position.z } : null; }, get route() { return route.map(q => ({ x: q.x, z: q.z })); }, get actors() { return { peds, cars }; }, get scene() { return scene; }, audio,
    get options() { return { ...opts }; },
    /** Pengaturan tampilan/kontrol (hanya presentasi): sens (geser kamera), pinch (zoom), drawDist (0 = tak terbatas), shadows, power (hemat baterai: 30 fps, resolusi 1×). */
    setOptions(p = {}) {
      if ('sens' in p) opts.sens = clamp(+p.sens || 1, 0.4, 2.5); if ('pinch' in p) opts.pinch = clamp(+p.pinch || 1, 0.4, 2.5); if ('drawDist' in p) { opts.drawDist = Math.max(0, +p.drawDist || 0); if (!opts.drawDist) for (const o of [...peds, ...cars]) o.mesh.visible = true; }
      if ('shadows' in p) { opts.shadows = !!p.shadows; player.traverse(o => { if (o.userData.isShadow) o.visible = opts.shadows; }); for (const o of peds) o.mesh.traverse(q => { if (q.userData.isShadow) q.visible = opts.shadows; }); }
      if ('power' in p) { opts.power = !!p.power; pr = opts.power ? Math.min(pr, 1) : Math.min(window.devicePixelRatio || 1, PRESETS[preset].pr); resize(); }
    }, get qa() { return { goal, tries, stuck, act, moving, pending }; }, // status internal untuk tes
    goBuilding, walkTo, rotate(d = 1) { yawT += d * Math.PI / 2; }, zoomBy(k) { zoomT = clamp(zoomT * k, 0.45, 2.6); }, recenter() { follow = true; }, get follow() { return follow; },
    setQuality(q) { if (!PRESETS[q]) return; preset = q; pr = Math.min(window.devicePixelRatio || 1, PRESETS[q].pr); resize(); spawnActors(); }, get quality() { return preset; },
    project(x, y, z) { tmp.set(x, y, z).project(cam); const r = rect(); return { x: (tmp.x * 0.5 + 0.5) * r.width, y: (-tmp.y * 0.5 + 0.5) * r.height, visible: tmp.z < 1 && tmp.z > -1 }; },
    player, camera: cam, canvas, scene, BUILDINGS, target, get zoom() { return zoom; }, get aspect() { return aspect; }, get yaw() { return yaw; }, get routeLength() { return routeLen; },
    stats() { const i = renderer.info; return { fps: Math.round(perf.fps), ms: +perf.ms.toFixed(1), worstMs: +perf.worst.toFixed(1), drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, pixelRatio: pr, preset, peds: peds.length, cars: cars.length }; },
    dispose() { this.stop(); renderer.dispose(); },
  };
  return api;
}
