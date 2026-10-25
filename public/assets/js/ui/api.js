// API client — semua progres (profil, pendidikan, ujian, simpanan game) disimpan di server BizSim.
// Base URL berasal dari placeholder deploy `__PORT_8000__` di <head> HTML. Saat dijalankan lokal
// (node server/server.cjs) server yang sama juga melayani folder public/, jadi cukup same-origin.
const LOCAL = new Set(['localhost', '127.0.0.1', '[::1]']);
const raw = String(window.__API_BASE__ || '');
const unresolved = !raw || raw.startsWith('__PORT_');
if (unresolved && !LOCAL.has(location.hostname) && location.protocol !== 'file:') {
  console.error('Placeholder backend belum diganti saat deploy.');
}
export const API = unresolved ? (location.port === '8000' ? '' : 'http://localhost:8000') : raw.replace(/\/$/, '');
const devVisitor = new URLSearchParams(location.search).get('visitor'); // hanya untuk QA lokal (isolasi pemain uji)

export async function api(method, path, body, opts = {}) {
  const headers = { 'Content-Type': 'application/json' };
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
