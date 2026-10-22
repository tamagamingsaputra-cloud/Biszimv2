/* BizSim mode lokal: seluruh /api/* dijalankan di browser (tanpa server, tanpa API key). Login memakai username dan password.
   Data disimpan di IndexedDB perangkat ini. Untuk kembali memakai server: ubah <meta name="bizsim-mode" content="server"> di index.html. */
(() => {
  const mode = (document.querySelector('meta[name="bizsim-mode"]') || {}).content || 'local';
  if (mode === 'server') return;
  const base = (document.currentScript && document.currentScript.src) || location.href;
  const COOKIE = 'bizsim.cookie', DOMAIN = '@bizsim.local', NativeResponse = window.Response, nativeFetch = window.fetch.bind(window);
  /* Response bawaan browser membuang header Set-Cookie. Subclass ini menyimpannya agar sesi login tetap bisa dibaca. */
  class LocalResponse extends NativeResponse {
    constructor(body, init) { super(body, init); let sc = null; try { const h = init && init.headers; if (h) { if (typeof h.get === 'function') sc = h.get('set-cookie'); else for (const k of Object.keys(h)) if (k.toLowerCase() === 'set-cookie') sc = h[k]; } } catch (e) { } Object.defineProperty(this, '__setCookie', { value: sc }); }
  }
  window.Response = LocalResponse;
  let engine = null; const load = () => (engine ||= import(window.BIZSIM_ENGINE_URL || new URL('engine/api.js', base).href).then(m => m.default));
  const out = (obj, status = 200) => new NativeResponse(JSON.stringify(obj), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  const store = { get: k => { try { return localStorage.getItem(k); } catch (e) { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { } }, del: k => { try { localStorage.removeItem(k); } catch (e) { } } };
  const normUser = v => { const u = String(v == null ? '' : v).trim().toLowerCase(); return /^[a-z0-9._-]{3,30}$/.test(u) ? u : ''; };
  let queue = Promise.resolve();
  async function run(u, init, input) {
    const method = String(init.method || (input && input.method) || 'GET').toUpperCase();
    let text = typeof init.body === 'string' ? init.body : '';
    if (!text && method !== 'GET' && input && typeof input !== 'string' && typeof input.text === 'function') { try { text = await input.clone().text(); } catch (e) { } }
    const auth = method === 'POST' && (u.pathname === '/api/auth/login' || u.pathname === '/api/auth/register');
    if (auth) {
      let b = {}; try { b = JSON.parse(text || '{}'); } catch (e) { }
      const un = normUser(b.email != null ? b.email : b.username);
      if (!un) return out({ error: 'Username 3 sampai 30 karakter: huruf kecil, angka, titik, garis bawah, atau strip.' }, 400);
      if (String(b.password || '').length < 6) return out({ error: 'Password minimal 6 karakter.' }, 400);
      text = JSON.stringify({ email: un + DOMAIN, password: b.password, name: String(b.name || '').trim() || un });
    }
    let handler; try { handler = await load(); } catch (e) { console.error('BizSim mesin lokal gagal dimuat', e); return out({ error: 'Mesin lokal gagal dimuat: ' + (e && e.message || e) }, 503); }
    const cookie = store.get(COOKIE) || '';
    const req = { url: u.href, method, headers: { get: n => { n = String(n).toLowerCase(); return n === 'cookie' ? cookie : n === 'content-type' ? 'application/json' : null; } }, text: async () => text, json: async () => JSON.parse(text || '{}') };
    let res; try { res = await handler(req); } catch (e) { console.error(e); return out({ error: (e && e.message) || 'LOCAL_ERROR' }, 500); }
    const sc = res.__setCookie; if (sc) { const first = String(sc).split(';')[0], val = first.split('=').slice(1).join('='); if (/max-age=0/i.test(sc) || !val) store.del(COOKIE); else store.set(COOKIE, first); }
    let body = await res.text();
    body = body.replace(/"email":"([^"@]+)@bizsim\.local"/g, '"email":"$1"').replace(/Email atau password/g, 'Username atau password').replace(/Email sudah terdaftar/g, 'Username sudah terdaftar').replace(/Nama, email valid, dan password minimal 6 karakter diperlukan\./g, 'Username dan password minimal 6 karakter diperlukan.');
    return new NativeResponse(res.status === 204 ? null : body, { status: res.status, headers: { 'Content-Type': res.headers.get('content-type') || 'application/json; charset=utf-8', 'Cache-Control': 'no-store' } });
  }
  window.fetch = (input, init) => {
    try { const raw = typeof input === 'string' ? input : (input && input.url) || String(input), u = new URL(raw, location.href); if (u.origin === location.origin && u.pathname.startsWith('/api/')) { const p = queue.then(() => run(u, init || {}, input)); queue = p.catch(() => { }); return p; } } catch (e) { }
    return nativeFetch(input, init);
  };
  window.BizSimLocal = { mode: 'local', reset: () => { try { indexedDB.deleteDatabase('bizsim-local'); } catch (e) { } store.del(COOKIE); } };
})();
