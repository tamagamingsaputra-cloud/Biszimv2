// Satu-satunya fungsi Vercel. vercel.json me-rewrite SEMUA /api/* ke /api?__p=<sisa-path> agar rute bersarang
// (mis. /api/fin/catalog) tidak bergantung pada dukungan catch-all berbasis nama-file. Path asli direkonstruksi di sini
// sebelum diserahkan ke Express, sehingga berfungsi baik jika Vercel mempertahankan URL asli maupun tidak.
const app = require('../server/server.cjs');
module.exports = (req, res) => {
  try {
    const u = new URL(req.url, 'http://localhost');
    const p = u.searchParams.get('__p');
    if (p !== null) {
      u.searchParams.delete('__p');
      req.url = '/api' + (p ? '/' + p.replace(/^\/+/, '') : '') + u.search;
    }
  } catch { /* biarkan URL apa adanya */ }
  return app(req, res);
};
