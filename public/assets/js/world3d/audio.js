// Audio lingkungan 3D: sintesis WebAudio murni (tanpa berkas suara, tanpa aset berlisensi, tanpa fetch).
// Suara mengikuti lokasi/jarak/aktivitas/kondisi: langkah (jalan vs rumput), kendaraan per jenis (+sirine), burung (siang), jangkrik (malam),
// keramaian pasar, mesin SPBU/terminal, pintu, klik, dan hujan (mesin siap; belum ada sumber cuaca di simulasi sehingga tidak dipicu otomatis).
// Hanya presentasi: tidak membaca/menulis data game.
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const SIREN = new Set(['ambulance', 'police', 'firetruck']);
const BASE = { car: 95, taxi: 100, police: 100, bike: 150, bus: 62, truck: 58, ambulance: 80, firetruck: 55 };

export function createAudio() {
  let ctx = null, master, fx, amb, noise, vehicles = [], birdT = 2, pingT = 5, seed = 1, nodes = {};
  const vol = { master: 0.7, fx: 1, amb: 1, muted: false }, dbg = { steps: 0, doors: 0, taps: 0, chirps: 0, pings: 0, vehicleGain: [0, 0], market: 0, machine: 0, crickets: 0, birds: 0, rain: 0 };
  const rnd = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }; // deterministik (tanpa Math.random)
  const g = (v = 0) => { const n = ctx.createGain(); n.gain.value = v; return n; };
  const set = (p, v, tc = 0.08) => p.setTargetAtTime(v, ctx.currentTime, tc);

  function build() {
    master = g(0); master.connect(ctx.destination); fx = g(1); amb = g(1); fx.connect(master); amb.connect(master);
    const len = ctx.sampleRate * 2, buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = rnd() * 2 - 1;
    noise = buf; const loop = () => { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(); return s; };
    // keramaian pasar (derau tersaring) · hujan · mesin · jangkrik
    const mk = ctx.createBiquadFilter(); mk.type = 'bandpass'; mk.frequency.value = 520; mk.Q.value = 0.7; const mg = g(0); loop().connect(mk); mk.connect(mg); mg.connect(amb); nodes.market = mg;
    const rf = ctx.createBiquadFilter(); rf.type = 'highpass'; rf.frequency.value = 1400; const rg = g(0); loop().connect(rf); rf.connect(rg); rg.connect(amb); nodes.rain = rg;
    const mo = ctx.createOscillator(); mo.type = 'sawtooth'; mo.frequency.value = 92; const mf = ctx.createBiquadFilter(); mf.type = 'lowpass'; mf.frequency.value = 260; const mcg = g(0); mo.connect(mf); mf.connect(mcg); mcg.connect(amb); mo.start(); nodes.machine = mcg;
    const co = ctx.createOscillator(); co.frequency.value = 4300; const cl = ctx.createOscillator(); cl.frequency.value = 7; const clg = g(0.5); const cg = g(0); cl.connect(clg); const am = g(0.5); clg.connect(am.gain); co.connect(am); am.connect(cg); cg.connect(amb); co.start(); cl.start(); nodes.crickets = cg;
    for (let i = 0; i < 2; i++) { // 2 suara kendaraan terdekat
      const o = ctx.createOscillator(); o.type = 'sawtooth'; const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 420; const vg = g(0), pan = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
      const so = ctx.createOscillator(); so.type = 'sine'; const sg = g(0); so.connect(sg); sg.connect(vg);
      o.connect(lp); lp.connect(vg); if (pan) { vg.connect(pan); pan.connect(fx); } else vg.connect(fx); o.start(); so.start(); vehicles.push({ o, so, sg, vg, pan, t: i * 0.3 });
    }
    applyVol(true);
  }
  function applyVol(now) { if (!ctx) return; const v = vol.muted ? 0 : vol.master; if (now) master.gain.value = v; else set(master.gain, v, 0.05); set(fx.gain, vol.fx, 0.05); set(amb.gain, vol.amb, 0.05); }
  function ensure() { if (ctx) return ctx; const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext); if (!AC) return null; try { ctx = new AC(); build(); } catch { ctx = null; } return ctx; }
  function burst({ dur = 0.06, f = 900, q = 1, type = 'bandpass', gain = 0.3, to = fx }) { // derau pendek tersaring (langkah, pintu)
    const s = ctx.createBufferSource(); s.buffer = noise; const flt = ctx.createBiquadFilter(); flt.type = type; flt.frequency.value = f; flt.Q.value = q; const e = g(0); s.connect(flt); flt.connect(e); e.connect(to);
    const t = ctx.currentTime; e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(gain, t + 0.008); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); s.start(t, rnd() * 1.5, dur + 0.02);
  }
  function tone(f, dur, gain = 0.15, type = 'sine', slide = 0, to = fx) {
    const o = ctx.createOscillator(); o.type = type; const e = g(0); const t = ctx.currentTime; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, f * slide), t + dur);
    e.gain.setValueAtTime(0, t); e.gain.linearRampToValueAtTime(gain, t + 0.01); e.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.connect(e); e.connect(to); o.start(t); o.stop(t + dur + 0.02);
  }
  return {
    /** Wajib dipanggil dari gestur pengguna (kebijakan autoplay peramban). */
    unlock() { const c = ensure(); if (c && c.state === 'suspended') c.resume(); return !!c; },
    get state() { return ctx ? ctx.state : 'none'; },
    get volumes() { return { ...vol }; },
    setVolumes(p) { Object.assign(vol, p); for (const k of ['master', 'fx', 'amb']) vol[k] = clamp(+vol[k] || 0, 0, 1); vol.muted = !!vol.muted; applyVol(false); },
    step(surface = 'hard') { if (!ctx || ctx.state !== 'running') return; dbg.steps++; surface === 'soft' ? burst({ f: 420 + rnd() * 120, q: 0.8, dur: 0.07, gain: 0.22, type: 'lowpass' }) : burst({ f: 1500 + rnd() * 500, q: 1.2, dur: 0.05, gain: 0.26 }); },
    door() { if (!ctx || ctx.state !== 'running') return; dbg.doors++; burst({ f: 260, q: 0.7, dur: 0.16, gain: 0.5, type: 'lowpass' }); tone(190, 0.18, 0.12, 'triangle', 0.7); },
    tap() { if (!ctx || ctx.state !== 'running') return; dbg.taps++; tone(780, 0.07, 0.07, 'sine', 1.25); },
    ui() { if (!ctx || ctx.state !== 'running') return; tone(560, 0.06, 0.06, 'sine', 1.15); },
    setRain(l) { dbg.rain = clamp(+l || 0, 0, 1); },
    /** Dipanggil tiap frame. s = { dt, dayF, vehicles:[{x,z,pan,kind,v,d}], market:jarak(unit), machine:jarak(unit) } ; d = jarak ke pendengar */
    update(s) {
      if (!ctx || ctx.state !== 'running') return; const dt = s.dt || 0.016, dayF = s.dayF ?? 1;
      // kendaraan: 2 terdekat, volume ~ (1 - d/16)^2, nada menurut jenis & kecepatan, sirine untuk kendaraan darurat dalam 12 unit
      const near = [...(s.vehicles || [])].sort((a, b) => a.d - b.d).slice(0, 2);
      vehicles.forEach((vh, i) => { const o = near[i], k = o ? Math.pow(clamp(1 - o.d / 16, 0, 1), 2) : 0, gn = k * 0.16; dbg.vehicleGain[i] = +gn.toFixed(4);
        set(vh.vg.gain, gn, 0.12); if (o) { set(vh.o.frequency, (BASE[o.kind] || 95) + (o.v || 0) * 6, 0.1); if (vh.pan) set(vh.pan.pan, clamp(o.pan || 0, -1, 1), 0.1); vh.t += dt;
          const siren = SIREN.has(o.kind) && o.d < 12 ? 0.35 : 0; set(vh.sg.gain, siren, 0.1); if (siren) vh.so.frequency.setValueAtTime(Math.floor(vh.t / 0.6) % 2 ? 960 : 720, ctx.currentTime); } });
      // lingkungan menurut jam & lokasi
      const mk = clamp(1 - (s.market ?? 99) / 9, 0, 1) * 0.1; set(nodes.market.gain, mk, 0.3); dbg.market = +mk.toFixed(4);
      const mc = clamp(1 - (s.machine ?? 99) / 6, 0, 1) * 0.05; set(nodes.machine.gain, mc, 0.3); dbg.machine = +mc.toFixed(4);
      const cr = (1 - dayF) * 0.012; set(nodes.crickets.gain, cr, 0.5); dbg.crickets = +cr.toFixed(4);
      set(nodes.rain.gain, dbg.rain * 0.16, 0.5);
      birdT -= dt; if (birdT < 0) { birdT = 2 + rnd() * 5; if (dayF > 0.4) { dbg.chirps++; dbg.birds = dayF; const f = 2400 + rnd() * 1400; tone(f, 0.12, 0.05, 'sine', 1.5, amb); setTimeout(() => ctx && ctx.state === 'running' && tone(f * 1.15, 0.1, 0.04, 'sine', 1.3, amb), 140); } }
      pingT -= dt; if (pingT < 0) { pingT = 4 + rnd() * 6; if (mk > 0.03) { dbg.pings++; tone(1760, 0.25, 0.05, 'sine', 0.98, amb); } }
    },
    debug() { return { ...dbg, state: ctx ? ctx.state : 'none', master: ctx ? +master.gain.value.toFixed(3) : 0, vol: { ...vol } }; },
    /** Tingkat energi sinyal keluaran (0..1) untuk tes. */
    probe() { if (!ctx || !master) return -1; if (!nodes.an) { nodes.an = ctx.createAnalyser(); nodes.an.fftSize = 1024; master.connect(nodes.an); } const d = new Float32Array(1024); nodes.an.getFloatTimeDomainData(d); let e = 0; for (const x of d) e += x * x; return Math.sqrt(e / d.length); },
  };
}
