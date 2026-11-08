// Renderer 3D Kampung BizSim (isometrik, ortografik). Hanya MENGGAMBAR dan menangani input/navigasi.
// Waktu, kebutuhan, saldo, transaksi tetap milik sistem 2D + server; world ini tidak menyimpan/mengubah data game.
import * as THREE from '../../vendor/three/three.module.min.js';
import { T, W, D, BUILDINGS, BY_ID, trees, paths, nodes, findPath, walkable, isOpen, blockOrigin, hash } from './city.js';
import { mat, C, winMat, lampMat, buildModel, mergeStatic, tree, makeHuman, animateHuman, makePed, animatePed, makeCar } from './models.js';

const clamp = (x, a, b) => Math.max(a, Math.min(b, x)), lerp = (a, b, t) => a + (b - a) * t;
export const PRESETS = { low: { pr: 1, peds: 4, cars: 2 }, medium: { pr: 1.25, peds: 8, cars: 4 }, high: { pr: 1.75, peds: 14, cars: 7 } };
const SKY = { night: new THREE.Color(0x1d2744), dawn: new THREE.Color(0xf6c79a), day: new THREE.Color(0xa9dcf0), dusk: new THREE.Color(0xee9a72) };
const PITCH = 0.62, DIST = 60;
export function webglOk() { try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; } }

export function createWorld(canvas, { quality = 'medium', onBuilding, onFrame, hourFn = () => 12 } = {}) {
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
  for (const b of BUILDINGS) { if (b.kind === 'field') continue; const m = buildModel(b); root.add(m); const u = m.userData; for (const k of Object.keys(dyn)) if (u[k]) dyn[k] = u[k]; boxes.push({ b, box: new THREE.Box3(new THREE.Vector3(b.x0 - 0.2, 0, b.z0 - 0.2), new THREE.Vector3(b.x1 + 0.2, b.h + 1.2, b.z1 + 0.6)) }); }
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
    for (let k = 0; k < P.peds; k++) { const n0 = nodes[Math.floor(hash(k, 3) * nodes.length)], mesh = makePed(shirts[k % shirts.length], 0x374151, skins[k % skins.length]); mesh.scale.setScalar(0.62); root.add(mesh); peds.push({ mesh, a: n0, b: nextNode(n0, null, hash(k, 9)), t: hash(k, 5), v: 1.3, seed: k }); }
    for (let k = 0; k < P.cars; k++) { const n0 = nodes[Math.floor(hash(k, 33) * nodes.length)], bike = k % 3 === 2, mesh = makeCar([0xe5484d, 0x2563eb, 0xfacc15, 0xf4f4f5, 0x16a34a][k % 5], bike ? 'bike' : 'car'); root.add(mesh); cars.push({ mesh, a: n0, b: nextNode(n0, null, hash(k, 19)), t: hash(k, 7), v: bike ? 5 : 4, seed: k + 50 }); }
  }
  spawnActors();

  // ——— navigasi ———
  let route = [], pending = null, act = 0, moving = false, follow = true, routeLen = 0;
  const target = new THREE.Vector3(spawn.x, 0, spawn.z); let yaw = Math.PI / 4, yawT = yaw, zoom = 1, zoomT = 1;
  function setRoute(pts, end) {
    route = pts || []; moving = route.length > 0; dest.visible = moving && !!end; if (end) dest.position.set(end.x, 0.06, end.z);
    routeLen = 0; let px = player.position.x, pz = player.position.z; for (const p of route) { routeLen += Math.hypot(p.x - px, p.z - pz); px = p.x; pz = p.z; }
    const pos = []; px = player.position.x; pz = player.position.z; for (const p of route) { const L = Math.hypot(p.x - px, p.z - pz), n = Math.max(1, Math.round(L / 0.7)); for (let s = 1; s <= n; s++) pos.push(lerp(px, p.x, s / n), 0.08, lerp(pz, p.z, s / n)); px = p.x; pz = p.z; }
    dotGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); dotGeo.setDrawRange(0, pos.length / 3);
  }
  function walkTo(x, z) { pending = null; const p = findPath(player.position.x, player.position.z, x, z); if (!p) return false; setRoute(p, p[p.length - 1]); follow = true; return true; }
  function goBuilding(id) { const b = BY_ID[id]; if (!b?.door) return false; pending = null; const p = findPath(player.position.x, player.position.z, b.door.x, b.door.z); if (!p && Math.hypot(player.position.x - b.door.x, player.position.z - b.door.z) > 1.5) return false; pending = id; setRoute(p || [], b.door); follow = true; if (!p || !p.length) arrived(); return true; }
  function arrived() { if (!pending) return; const b = BY_ID[pending]; player.rotation.y = Math.atan2(b.cx - player.position.x, b.cz - player.position.z); act = 0.9; }

  // ——— input ———
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0), pts = new Map();
  let down = null, drag = false, pinch = null;
  const rect = () => canvas.getBoundingClientRect();
  function pick(ev) {
    const r = rect(); ndc.set(((ev.clientX - r.left) / r.width) * 2 - 1, -((ev.clientY - r.top) / r.height) * 2 + 1); ray.setFromCamera(ndc, cam);
    let best = null, bd = Infinity; const hit = new THREE.Vector3(); for (const e of boxes) if (ray.ray.intersectBox(e.box, hit)) { const d = hit.distanceTo(ray.ray.origin); if (d < bd) { bd = d; best = e.b; } }
    if (best) { if (best.door) goBuilding(best.id); onBuilding?.(best, false); return; }
    const p = new THREE.Vector3(); if (ray.ray.intersectPlane(plane, p)) walkTo(p.x, p.z);
  }
  canvas.addEventListener('pointerdown', e => { canvas.setPointerCapture(e.pointerId); pts.set(e.pointerId, { x: e.clientX, y: e.clientY }); down = { x: e.clientX, y: e.clientY }; drag = false; if (pts.size === 2) { const [a, b] = [...pts.values()]; pinch = Math.hypot(a.x - b.x, a.y - b.y); } });
  canvas.addEventListener('pointermove', e => { const p = pts.get(e.pointerId); if (!p) return; const dx = e.clientX - p.x, dy = e.clientY - p.y; p.x = e.clientX; p.y = e.clientY;
    if (pts.size === 2 && pinch) { const [a, b] = [...pts.values()], d = Math.hypot(a.x - b.x, a.y - b.y); zoomT = clamp(zoomT * d / pinch, 0.45, 2.6); pinch = d; drag = true; return; }
    if (down && (drag || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 8)) { drag = true; follow = false; const s = (2 * (16 / zoom)) / rect().height, cy = Math.cos(yaw), sy = Math.sin(yaw); target.x -= cy * dx * s; target.z += sy * dx * s; target.x -= sy * dy * s / Math.sin(PITCH); target.z -= cy * dy * s / Math.sin(PITCH); target.x = clamp(target.x, T.ox, T.ox + W); target.z = clamp(target.z, T.oz, T.oz + D); } });
  const up = e => { pts.delete(e.pointerId); if (pts.size < 2) pinch = null; };
  canvas.addEventListener('pointerup', e => { if (!drag && down && pts.has(e.pointerId)) pick(e); up(e); down = null; }); canvas.addEventListener('pointercancel', up);
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
  function moveActor(a, dt, isCar) { const A = a.a, B = a.b, dx = B.x - A.x, dz = B.z - A.z, L = Math.hypot(dx, dz) || 1; a.t += a.v * dt / L; if (a.t >= 1) { a.t = 0; const prev = a.a; a.a = B; a.b = nextNode(B, prev, hash(a.seed, Math.floor(t * 3) + 1)); }
    const { ox, oz } = lane(a.a, a.b, isCar ? 0.5 : 1.1), x = lerp(a.a.x, a.b.x, a.t) + ox, z = lerp(a.a.z, a.b.z, a.t) + oz; a.mesh.position.set(x, 0, z); a.mesh.rotation.y = Math.atan2(a.b.x - a.a.x, a.b.z - a.a.z); }
  let openK = 0;
  function frame(now) {
    if (!running) return; raf = requestAnimationFrame(frame); frameN++;
    const rawDt = (now - last) / 1000; last = now; const dt = Math.min(rawDt, 0.1); t += dt; perf.ms = lerp(perf.ms, rawDt * 1000, 0.1); perf.fps = 1000 / perf.ms; perf.worst = Math.max(perf.worst * 0.995, rawDt * 1000);
    if (perf.slow > 3 && pr > 0.75) { pr = Math.max(0.75, pr - 0.25); perf.slow = 0; resize(); } perf.slow = perf.ms > 40 ? perf.slow + dt : Math.max(0, perf.slow - dt);
    const hour = hourFn(); let speed = 0;
    if (act > 0) { act -= dt; animateHuman(player, t, 0, 1); if (act <= 0) { const id = pending; pending = null; onBuilding?.(BY_ID[id], true); } }
    else if (moving) { const p = route[0], dx = p.x - player.position.x, dz = p.z - player.position.z, d = Math.hypot(dx, dz), step = 3.6 * dt; speed = 1;
      if (d <= step) { player.position.x = p.x; player.position.z = p.z; route.shift(); if (!route.length) { moving = false; dest.visible = false; setRoute([]); arrived(); } } else { player.position.x += dx / d * step; player.position.z += dz / d * step; player.rotation.y = Math.atan2(dx, dz); }
      if (moving) { routeLen = 0; let px = player.position.x, pz = player.position.z; for (const q of route) { routeLen += Math.hypot(q.x - px, q.z - pz); px = q.x; pz = q.z; } }
      animateHuman(player, t, speed); }
    else animateHuman(player, t, 0);
    const near = dyn.npc && Math.hypot(player.position.x - BY_ID.warung.cx, player.position.z - BY_ID.warung.cz) < 7; if (dyn.npc) animateHuman(dyn.npc, t, 0, near ? 1 : 0);
    for (const p of peds) { moveActor(p, dt, false); animatePed(p.mesh, t, 1); } for (const c of cars) moveActor(c, dt, true);
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
    const { c, dayF } = skyAt(hour); scene.background = c; hemi.intensity = 0.42 + 0.6 * dayF; sun.intensity = 0.1 + 0.95 * dayF; sun.color.setHex(dayF < 0.5 ? 0x8fa6ff : 0xfff1d0); nightK = lerp(nightK, 1 - dayF, 0.05);
    winMat.emissive.setRGB(1 * nightK, 0.82 * nightK, 0.45 * nightK); winMat.color.setHex(nightK > 0.5 ? 0xffe9a8 : 0xbfe3f2); lampMat.color.setHex(nightK > 0.5 ? 0xffe39a : 0x9aa3ad);
    renderer.render(scene, cam); if (frameN % 2 === 0) onFrame?.({ yaw, zoom, hour, route: routeLen, moving, follow });
  }
  const api = {
    start(fn) { if (fn) hourFn = fn; if (running) return; running = true; last = performance.now(); raf = requestAnimationFrame(frame); }, stop() { running = false; cancelAnimationFrame(raf); },
    goBuilding, walkTo, rotate(d = 1) { yawT += d * Math.PI / 2; }, zoomBy(k) { zoomT = clamp(zoomT * k, 0.45, 2.6); }, recenter() { follow = true; }, get follow() { return follow; },
    setQuality(q) { if (!PRESETS[q]) return; preset = q; pr = Math.min(window.devicePixelRatio || 1, PRESETS[q].pr); resize(); spawnActors(); }, get quality() { return preset; },
    project(x, y, z) { tmp.set(x, y, z).project(cam); const r = rect(); return { x: (tmp.x * 0.5 + 0.5) * r.width, y: (-tmp.y * 0.5 + 0.5) * r.height, visible: tmp.z < 1 && tmp.z > -1 }; },
    player, camera: cam, canvas, scene, BUILDINGS, target, get zoom() { return zoom; }, get aspect() { return aspect; }, get yaw() { return yaw; }, get routeLength() { return routeLen; },
    stats() { const i = renderer.info; return { fps: Math.round(perf.fps), ms: +perf.ms.toFixed(1), worstMs: +perf.worst.toFixed(1), drawCalls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, pixelRatio: pr, preset, peds: peds.length, cars: cars.length }; },
    dispose() { this.stop(); renderer.dispose(); },
  };
  return api;
}
