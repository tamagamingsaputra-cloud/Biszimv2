// API client — semua progres (profil, pendidikan, ujian, simpanan game) disimpan di server BizSim.
// API selalu same-origin agar cocok dengan server lokal maupun route /api pada Vercel.
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
const raw = String(window.__API_BASE__ || '');
const unresolved = raw.startsWith('__PORT_');
export const API = unresolved ? (LOCAL.has(location.hostname) && location.port !== '8000' ? 'http://localhost:8000' : '') : raw.replace(/\/$/, '');
const devVisitor = new URLSearchParams(location.search).get('visitor'); // hanya untuk QA lokal (isolasi pemain uji)
// Identitas pengunjung harus konsisten lintas halaman dan reload. Tanpa header ini server
// memakai fallback local-dev sehingga sesi bisa tercampur atau terlihat seperti profil hilang.
const VISITOR_KEY = 'bizsim.visitor.v1';
function visitorId() {
  if (devVisitor) return `qa-${devVisitor}`.slice(0, 120);
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id || !/^bzv-[a-f0-9-]{20,80}$/i.test(id)) {
      id = `bzv-${crypto.randomUUID()}`;
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // Browser tanpa localStorage tetap memperoleh ID per tab; status ini tidak menjamin
    // persistensi lintas sesi dan tidak disamarkan sebagai sesi permanen.
    if (!window.__bizsimVisitorFallback) window.__bizsimVisitorFallback = `bzv-${crypto.randomUUID()}`;
    return window.__bizsimVisitorFallback;
  }
}

export async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json', 'x-visitor-id': visitorId() };
  if (devVisitor) headers['x-dev-visitor'] = devVisitor;
  let res;
  try {
    res = await fetch(`${API}${path}`, { method, headers, credentials: 'same-origin', body: body === undefined ? undefined : opts.raw ? body : JSON.stringify(body), keepalive: !!opts.keepalive });
  } catch (e) {
    return { ok: false, error: 'Server BizSim tidak dapat dihubungi. Periksa koneksi lalu coba lagi.', offline: true };
  }
  let data = null; try { data = await res.json(); } catch { data = null; }
  if (!data) return { ok: false, error: `Respons server tidak valid (${res.status}).` };
  if (!res.ok && data.ok !== false) data.ok = false;
  return data;
}
export const get = p => api('GET', p);
export const post = (p, b) => api('POST', p, b || {});
export const put = (p, b, o) => api('PUT', p, b, o);
export const patch = (p, b) => api('PATCH', p, b || {});
