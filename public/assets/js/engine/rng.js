// Deterministic random — semua angka acak di BizSim berasal dari (seed + kunci + indeks).
// Tidak ada Math.random() di engine maupun UI. Seed yang sama + aksi yang sama = hasil yang sama.

function cyrb53(str, seed = 0) {
  let h1 = 0xdeadbeef ^ seed, h2 = 0x41c6ce57 ^ seed;
  for (let i = 0; i < str.length; i++) {
    const ch = str.charCodeAt(i);
    h1 = Math.imul(h1 ^ ch, 2654435761);
    h2 = Math.imul(h2 ^ ch, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

/** Uniform [0,1) dari seed + bagian-bagian kunci. */
export function hrand(seed, ...parts) {
  return (cyrb53(parts.join('|'), seed) % 9007199254740991) / 9007199254740991;
}

/** Normal standar (Box–Muller) deterministik. */
export function hnorm(seed, ...parts) {
  const u1 = Math.max(1e-12, hrand(seed, ...parts, 'a'));
  const u2 = hrand(seed, ...parts, 'b');
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export function hrange(seed, lo, hi, ...parts) {
  return lo + (hi - lo) * hrand(seed, ...parts);
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
