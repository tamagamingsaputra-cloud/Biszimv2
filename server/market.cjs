// BIZSIM MARKETPLACE — akun per-marketplace, katalog, wishlist, keranjang, voucher, checkout, PayLater.
// Prinsip:
//  • Tidak ada autentikasi ganda: identitas pemain tetap visitor-id BizSim. Akun marketplace adalah profil belanja tambahan
//    (username + password ber-hash scrypt) yang terikat ke karakter; sesi "masuk/keluar" disimpan di database, bukan di browser.
//  • Tidak ada saldo/mesin pesanan kedua: pembayaran memakai inti Keuangan (PIN, limit, rekening, dompet, uang tunai), dan pesanan
//    dimasukkan ke mesin pesanan yang sama (commerce.cjs → Order Center). PayLater hanyalah utang (pinjaman bertagihan), bukan saldo.
//  • Harga, stok, voucher, ongkir, biaya layanan, dan tagihan dihitung server. Klien hanya mengirim id listing, variasi, jumlah, kode.
const crypto = require('crypto');
const M = require('./market-catalog.cjs');
const SHOP = require('./shop-catalog.cjs');
const L = require('./life-catalog.cjs');

const DAY = 86400, WARM = 14;
const mod = (a, n) => ((a % n) + n) % n;
const parse = (t, d = null) => { if (t == null || t === '') return d; try { return JSON.parse(t); } catch { return d; } };
const fmtRp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const CITY_PROV = { 'Pacitan': 'Jawa Timur', 'Malang': 'Jawa Timur', 'Surabaya': 'Jawa Timur', 'Sleman': 'DI Yogyakarta', 'Yogyakarta': 'DI Yogyakarta', 'Semarang': 'Jawa Tengah', 'Bandung': 'Jawa Barat', 'Jakarta Selatan': 'DKI Jakarta' };
const GRADE = { reguler: 'Reguler', ekspres: 'Ekspres' };

module.exports = function mountMarket(app, H, F, CM) {
  const { db, tx: dbTx, vid, rid, now, fail, getPlayer, ageAt } = H;
  const { resolveMethod, debitSource, applyDebit, refund, checkPin, addTx, setResp, txRow, view: finView, idemOk, findIdem, acct, cashOf, cashApply, guard, st, nameOf } = F;
  const PROD = id => M.PRODUCTS.find(p => p.id === id);
  const protoCache = new Map();

  // ————————————————————————— skema —————————————————————————
  const SCHEMA = `
  CREATE TABLE IF NOT EXISTS mp_accounts (visitor TEXT, market TEXT, username TEXT, name TEXT, email TEXT, phone TEXT, pass_hash TEXT, pass_salt TEXT, char_id TEXT, created INTEGER, created_day INTEGER, last_login INTEGER, session INTEGER DEFAULT 0, fails INTEGER DEFAULT 0, locked_until INTEGER DEFAULT 0, PRIMARY KEY (visitor, market));
  CREATE TABLE IF NOT EXISTS mp_addresses (id TEXT PRIMARY KEY, visitor TEXT, market TEXT, label TEXT, name TEXT, phone TEXT, address TEXT, city TEXT, province TEXT, is_default INTEGER DEFAULT 0, created INTEGER);
  CREATE TABLE IF NOT EXISTS mp_history (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor TEXT, market TEXT, abs INTEGER, kind TEXT, text TEXT);
  CREATE TABLE IF NOT EXISTS mp_wishlist (visitor TEXT, market TEXT, listing TEXT, created INTEGER, PRIMARY KEY (visitor, market, listing));
  CREATE TABLE IF NOT EXISTS mp_cart (visitor TEXT, market TEXT, listing TEXT, variant TEXT, qty INTEGER, selected INTEGER DEFAULT 1, created INTEGER, PRIMARY KEY (visitor, market, listing, variant));
  CREATE TABLE IF NOT EXISTS mp_vouchers (visitor TEXT, market TEXT, code TEXT, status TEXT, uses_left INTEGER, claimed_abs INTEGER, expires_day INTEGER, period INTEGER, PRIMARY KEY (visitor, market, code));
  CREATE TABLE IF NOT EXISTS mp_order_meta (order_id TEXT PRIMARY KEY, visitor TEXT, market TEXT, seller TEXT, group_id TEXT, cashback INTEGER DEFAULT 0, svc_fee INTEGER DEFAULT 0, vouchers TEXT, cashback_paid INTEGER DEFAULT 0, loan_id TEXT, points_done INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS mp_paylater (visitor TEXT, market TEXT, status TEXT, lim INTEGER, used INTEGER DEFAULT 0, activated_day INTEGER, late_count INTEGER DEFAULT 0, PRIMARY KEY (visitor, market));
  CREATE TABLE IF NOT EXISTS mp_pl_loans (id TEXT PRIMARY KEY, visitor TEXT, market TEXT, group_id TEXT, principal INTEGER, tenor INTEGER, rate_month REAL, fee INTEGER, interest INTEGER, total INTEGER, created_day INTEGER, status TEXT);
  CREATE TABLE IF NOT EXISTS mp_pl_bills (id TEXT PRIMARY KEY, visitor TEXT, market TEXT, loan TEXT, seq INTEGER, of INTEGER, due_day INTEGER, principal INTEGER, fee INTEGER, interest INTEGER, late_fee INTEGER DEFAULT 0, extra INTEGER DEFAULT 0, paid INTEGER DEFAULT 0, status TEXT, fined INTEGER DEFAULT 0, mo_applied INTEGER DEFAULT 0, paid_day INTEGER);
  CREATE TABLE IF NOT EXISTS mp_points (visitor TEXT PRIMARY KEY, points INTEGER DEFAULT 0);`;
  function migrate() {
    db.exec(SCHEMA);
    for (const ix of ['CREATE INDEX IF NOT EXISTS ix_mp_hist ON mp_history (visitor, market, id)', 'CREATE INDEX IF NOT EXISTS ix_mp_bills ON mp_pl_bills (visitor, market, status)', 'CREATE INDEX IF NOT EXISTS ix_mp_addr ON mp_addresses (visitor, market)', 'CREATE INDEX IF NOT EXISTS ix_mp_meta_v ON mp_order_meta (visitor, group_id)']) { try { db.exec(ix); } catch { /* opsional */ } }
  }
  const TABLES = ['mp_accounts', 'mp_addresses', 'mp_history', 'mp_wishlist', 'mp_cart', 'mp_vouchers', 'mp_order_meta', 'mp_paylater', 'mp_pl_loans', 'mp_pl_bills', 'mp_points'];
  function reset(v) { for (const t of TABLES) db.prepare(`DELETE FROM ${t} WHERE visitor=?`).run(v); }

  // ————————————————————————— bantu —————————————————————————
  const need = (req, res) => { const p = getPlayer(vid(req)); if (!p || !p.profile || !p.game) { fail(res, 'Profil atau save game belum ada.', 404); return null; } return p; };
  const clkGet = (req, p) => CM.absOfClock(p, req.query.day, req.query.sec);
  const clkPost = (req, p) => { const c = req.body?.clock || {}; return CM.absOfClock(p, c.day, c.sec); };
  const mkt = (req, res) => { const m = M.MARKET(req.params.m); if (!m) { fail(res, 'Marketplace tidak dikenal.', 404); return null; } return m; };
  const hist = (v, m, abs, kind, text) => { db.prepare('INSERT INTO mp_history (visitor, market, abs, kind, text) VALUES (?,?,?,?,?)').run(v, m, Math.round(abs), kind, text); db.prepare('DELETE FROM mp_history WHERE visitor=? AND market=? AND id NOT IN (SELECT id FROM mp_history WHERE visitor=? AND market=? ORDER BY id DESC LIMIT 100)').run(v, m, v, m); };
  const hashPw = (pw, salt) => crypto.scryptSync(String(pw), salt, 32).toString('hex');
  const accountRow = (v, m) => db.prepare('SELECT * FROM mp_accounts WHERE visitor=? AND market=?').get(v, m);
  // Semua rute di dalam marketplace memerlukan akun yang sedang masuk (sesi disimpan di database).
  function authed(req, res, { clock = 'get' } = {}) {
    const p = need(req, res); if (!p) return null; const m = mkt(req, res); if (!m) return null;
    const a = accountRow(p.visitor, m.id);
    if (!a) { fail(res, `Kamu belum mendaftar di ${m.name}.`, 401, { code: 'mp-noaccount' }); return null; }
    if (!a.session) { fail(res, `Silakan masuk ke ${m.name} terlebih dahulu.`, 401, { code: 'mp-login' }); return null; }
    const clk = clock === 'post' ? clkPost(req, p) : clock === 'get' ? clkGet(req, p) : null; if (clk && clk.error) { fail(res, clk.error); return null; }
    return { p, m, a, v: p.visitor, clk };
  }
  const handle = (fn, opts) => (req, res) => { try { const c = authed(req, res, opts); if (c) fn(c, req, res); } catch (e) { if (e.user) return res.status(e.code || 400).json({ ok: false, error: e.user }); console.error('[market]', e); fail(res, 'Kesalahan server marketplace.', 500); } };

  // ————————————————————————— toko/produk dinamis untuk mesin pesanan —————————————————————————
  const proto = l => {
    let x = protoCache.get(l.id); if (x) return x; const p = PROD(l.product), sl = M.SELLER(l.seller);
    x = { id: 'mp:' + l.id, store: 'mp-' + l.seller, name: p.name, price: l.sale, min: p.min || 0, fx: p.fx || {}, health: p.health, uses: p.uses, kind: (p.upgrade || p.unlock || p.uses) ? p.kind : undefined, upgrade: p.upgrade, unlock: p.unlock,
      qtyPerUnit: p.unitQty || 1, type: 'marketplace', use: p.use === 'stock' ? 'stock' : 'own', mode: 'parcel', origin: sl.city, returnable: true, quality: p.quality, rating: l.rating, minAge: p.minAge,
      stock: { max: l.max, refillDays: l.refillDays, refillQty: Math.max(1, Math.ceil(l.max / 3)), label: 'stok' }, variants: p.variants.map(v => ({ id: v.id, label: v.label, price: v.price })), bonus: [], desc: p.desc, prepMin: 0 };
    protoCache.set(l.id, x); return x;
  };
  const storeOf = sid => { const sl = M.SELLER(sid), m = M.MARKET(sl.market); return { id: 'mp-' + sid, name: `${sl.name} · ${m.name}`, channel: 'online', cat: 'marketplace', modes: ['parcel'], hours: [0, 24], methods: m.methods.filter(x => !['saldo', 'paylater'].includes(x)), origin: sl.city, travelMin: 0, market: m.id, hoursText: '24 jam' }; };
  CM.EXT.store = id => { if (!id.startsWith('mp-')) return null; const sid = id.slice(3); return M.SELLER(sid) ? storeOf(sid) : null; };
  CM.EXT.prod = id => { if (!id.startsWith('mp:')) return null; const l = M.LISTING(id.slice(3)); return l ? proto(l) : null; };

  // ————————————————————————— jarak & ongkir —————————————————————————
  const kmTo = (sellerCity, buyerCity) => SHOP.distanceKm(sellerCity, buyerCity);
  const etaDays = (km, ship) => { const d = km === 0 ? 1 : Math.ceil(km / 250) + 1; return Math.max(1, ship === 'ekspres' ? Math.ceil(d * 0.5) : d); };
  const roundStep = (n, s) => Math.round(n / s) * s;
  function shipFee(m, km, weightG, ship) {
    const R = M.RULES.ship[ship]; const kg = Math.max(0, Math.ceil(weightG / 1000) - M.RULES.ship.freeKg);
    return Math.max(0, roundStep((R.base + R.per100km * km / 100 + M.RULES.ship.perKg * kg) * (1 - m.shipDiscount), 500));
  }

  // ————————————————————————— akun —————————————————————————
  const publicAcct = a => ({ username: a.username, name: a.name, email: a.email, phone: a.phone, created: a.created_day, lastLogin: a.last_login, charId: a.char_id });
  const addrs = (v, m) => db.prepare('SELECT id, label, name, phone, address, city, province, is_default AS isDefault FROM mp_addresses WHERE visitor=? AND market=? ORDER BY is_default DESC, created').all(v, m);
  function validAcct(b, { pw = true } = {}) {
    const name = String(b.name || '').trim(), user = String(b.username || '').trim().toLowerCase(), email = String(b.email || '').trim().toLowerCase(), phone = String(b.phone || '').replace(/[\s-]/g, '');
    if (name.length < 2 || name.length > 60) return 'Nama lengkap 2–60 karakter.';
    if (!/^[a-z0-9_]{4,20}$/.test(user)) return 'Username 4–20 karakter: huruf kecil, angka, atau garis bawah.';
    if (!/^[^\s@]+@[^\s@]+\.[a-z]{2,}$/.test(email) || email.length > 80) return 'Format email tidak valid.';
    if (!/^(\+62|62|0)8\d{8,11}$/.test(phone)) return 'Nomor telepon harus nomor seluler Indonesia (mis. 081234567890).';
    if (pw && !(typeof b.password === 'string' && b.password.length >= 8 && b.password.length <= 64 && /[A-Za-z]/.test(b.password) && /\d/.test(b.password))) return 'Password minimal 8 karakter dan mengandung huruf serta angka.';
    return null;
  }
  function validAddr(b) {
    const address = String(b.address || '').trim(), city = String(b.city || ''), province = String(b.province || '');
    if (address.length < 8 || address.length > 200) return 'Alamat lengkap 8–200 karakter.';
    if (!CITY_PROV[city]) return 'Pilih kota yang dilayani.';
    if (province !== CITY_PROV[city]) return `Provinsi untuk ${city} adalah ${CITY_PROV[city]}.`;
    return null;
  }
  app.get('/api/mp/launcher', (req, res) => {
    const p = need(req, res); if (!p) return; const clk = clkGet(req, p); if (clk.error) return fail(res, clk.error);
    const accts = Object.fromEntries(db.prepare('SELECT market, username, session FROM mp_accounts WHERE visitor=?').all(p.visitor).map(a => [a.market, a]));
    const pl = Object.fromEntries(db.prepare('SELECT market, status, lim, used FROM mp_paylater WHERE visitor=?').all(p.visitor).map(a => [a.market, a]));
    res.json({ ok: true, day: clk.day, markets: M.MARKETS.map(m => ({ id: m.id, name: m.name, tagline: m.tagline, color: m.color, color2: m.color2, ink: m.ink, logo: m.logo, desc: m.desc, traits: m.traits, rating: m.rating, ratingCount: m.ratingCount, sellerCount: m.sellerCount, productCount: m.productCount,
      feeText: `${(m.feePct * 100).toLocaleString('id-ID')}% (min ${fmtRp(m.feeMin)}, maks ${fmtRp(m.feeMax)})`, feePct: m.feePct, payLater: m.paylater ? m.paylater.name : null, loyalty: m.loyalty, methods: m.methods,
      promos: activePromos(m, clk.day), account: accts[m.id] ? { username: accts[m.id].username, loggedIn: !!accts[m.id].session } : null, paylater: pl[m.id] || null })),
      city: p.profile.city, cities: Object.entries(CITY_PROV).map(([city, province]) => ({ city, province })), profile: { name: p.profile.name, city: p.profile.city, province: CITY_PROV[p.profile.city] || '' } });
  });
  const activePromos = (m, day) => { const out = []; for (const e of M.EVENTS) if (e.test(day)) out.push(e.label); const n = M.VOUCHERS.filter(v => v.market === m.id).length; out.push(`${n} voucher tersedia`); if (m.id === 'shopindo') out.push('Diskon hingga 35%'); if (m.id === 'tokomart') out.push('Biaya layanan terendah'); return out; };

  app.post('/api/mp/:m/register', (req, res) => {
    try {
      const p = need(req, res); if (!p) return; const m = mkt(req, res); if (!m) return; const clk = clkPost(req, p); if (clk.error) return fail(res, clk.error); const b = req.body || {};
      if (accountRow(p.visitor, m.id)) return fail(res, `Kamu sudah punya akun ${m.name}. Silakan masuk.`, 409);
      let e = validAcct(b) || validAddr(b); if (e) return fail(res, e);
      const salt = crypto.randomBytes(16).toString('hex'), id = rid('adr'), user = b.username.trim().toLowerCase();
      dbTx(() => {
        db.prepare('INSERT INTO mp_accounts (visitor, market, username, name, email, phone, pass_hash, pass_salt, char_id, created, created_day, last_login, session) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)').run(p.visitor, m.id, user, b.name.trim(), b.email.trim().toLowerCase(), String(b.phone).replace(/[\s-]/g, ''), hashPw(b.password, salt), salt, p.charId, now(), clk.day, clk.abs);
        db.prepare('INSERT INTO mp_addresses (id, visitor, market, label, name, phone, address, city, province, is_default, created) VALUES (?,?,?,?,?,?,?,?,?,1,?)').run(id, p.visitor, m.id, 'Rumah', b.name.trim(), String(b.phone).replace(/[\s-]/g, ''), b.address.trim(), b.city, b.province, now());
        hist(p.visitor, m.id, clk.abs, 'akun', `Akun ${m.name} dibuat (@${user}).`); hist(p.visitor, m.id, clk.abs, 'masuk', 'Masuk ke akun.');
      })();
      res.json({ ok: true, msg: `Akun ${m.name} dibuat. Selamat datang, ${b.name.trim().split(' ')[0]}!` });
    } catch (e) { console.error('[market]', e); fail(res, 'Kesalahan server marketplace.', 500); }
  });
  app.post('/api/mp/:m/login', (req, res) => {
    try {
      const p = need(req, res); if (!p) return; const m = mkt(req, res); if (!m) return; const clk = clkPost(req, p); if (clk.error) return fail(res, clk.error); const b = req.body || {};
      const a = accountRow(p.visitor, m.id); if (!a) return fail(res, `Belum ada akun ${m.name}. Daftar terlebih dahulu.`, 404);
      if (a.locked_until > now()) return fail(res, `Terlalu banyak percobaan salah. Coba lagi dalam ${Math.ceil((a.locked_until - now()) / 1000)} detik.`, 429);
      const ok = String(b.username || '').trim().toLowerCase() === a.username && typeof b.password === 'string' && crypto.timingSafeEqual(Buffer.from(hashPw(b.password, a.pass_salt), 'hex'), Buffer.from(a.pass_hash, 'hex'));
      if (!ok) { const f = a.fails + 1; db.prepare('UPDATE mp_accounts SET fails=?, locked_until=? WHERE visitor=? AND market=?').run(f >= 5 ? 0 : f, f >= 5 ? now() + 60_000 : 0, p.visitor, m.id); hist(p.visitor, m.id, clk.abs, 'gagal', 'Percobaan masuk gagal.'); return fail(res, f >= 5 ? 'Salah 5×. Akun dikunci 60 detik.' : `Username atau password salah (${f}/5).`, 401); }
      db.prepare('UPDATE mp_accounts SET session=1, fails=0, last_login=? WHERE visitor=? AND market=?').run(clk.abs, p.visitor, m.id); hist(p.visitor, m.id, clk.abs, 'masuk', 'Masuk ke akun.');
      res.json({ ok: true, msg: `Selamat datang kembali, ${a.name.split(' ')[0]}.` });
    } catch (e) { console.error('[market]', e); fail(res, 'Kesalahan server marketplace.', 500); }
  });
  app.post('/api/mp/:m/logout', handle(({ v, m, clk }, req, res) => { db.prepare('UPDATE mp_accounts SET session=0 WHERE visitor=? AND market=?').run(v, m.id); hist(v, m.id, clk.abs, 'keluar', 'Keluar dari akun.'); res.json({ ok: true, msg: `Kamu keluar dari ${m.name}.` }); }, { clock: 'post' }));
  app.get('/api/mp/:m/me', handle(({ v, m, a, clk }, req, res) => {
    const h = db.prepare('SELECT abs, kind, text FROM mp_history WHERE visitor=? AND market=? ORDER BY id DESC LIMIT 60').all(v, m.id);
    const pts = m.loyalty ? (db.prepare('SELECT points FROM mp_points WHERE visitor=?').get(v)?.points || 0) : null;
    res.json({ ok: true, account: publicAcct(a), addresses: addrs(v, m.id), history: h, tier: m.loyalty ? tierOf(pts) : null, points: pts, cities: Object.entries(CITY_PROV).map(([city, province]) => ({ city, province })) });
  }));
  app.post('/api/mp/:m/profile', handle(({ v, m, a, clk }, req, res) => {
    const b = { ...req.body, username: a.username }; const e = validAcct(b, { pw: false }); if (e) return res.status(400).json({ ok: false, error: e });
    db.prepare('UPDATE mp_accounts SET name=?, email=?, phone=? WHERE visitor=? AND market=?').run(b.name.trim(), b.email.trim().toLowerCase(), String(b.phone).replace(/[\s-]/g, ''), v, m.id); hist(v, m.id, clk.abs, 'profil', 'Profil diperbarui.'); res.json({ ok: true, msg: 'Profil diperbarui.' });
  }, { clock: 'post' }));
  app.post('/api/mp/:m/password', handle(({ v, m, a, clk }, req, res) => {
    const b = req.body || {}; if (typeof b.old !== 'string' || !crypto.timingSafeEqual(Buffer.from(hashPw(b.old, a.pass_salt), 'hex'), Buffer.from(a.pass_hash, 'hex'))) return res.status(401).json({ ok: false, error: 'Password lama salah.' });
    if (!(typeof b.password === 'string' && b.password.length >= 8 && b.password.length <= 64 && /[A-Za-z]/.test(b.password) && /\d/.test(b.password))) return res.status(400).json({ ok: false, error: 'Password baru minimal 8 karakter dengan huruf dan angka.' });
    if (b.password === b.old) return res.status(400).json({ ok: false, error: 'Password baru harus berbeda dari yang lama.' });
    const salt = crypto.randomBytes(16).toString('hex'); db.prepare('UPDATE mp_accounts SET pass_hash=?, pass_salt=? WHERE visitor=? AND market=?').run(hashPw(b.password, salt), salt, v, m.id); hist(v, m.id, clk.abs, 'password', 'Password diganti.'); res.json({ ok: true, msg: 'Password diganti.' });
  }, { clock: 'post' }));
  app.post('/api/mp/:m/address', handle(({ v, m, clk }, req, res) => {
    const b = req.body || {}, op = b.op;
    if (op === 'add' || op === 'update') {
      const e = validAddr(b) || (String(b.name || '').trim().length < 2 ? 'Nama penerima wajib diisi.' : /^(\+62|62|0)8\d{8,11}$/.test(String(b.phone || '').replace(/[\s-]/g, '')) ? null : 'Nomor telepon penerima tidak valid.'); if (e) return res.status(400).json({ ok: false, error: e });
      const n = db.prepare('SELECT COUNT(*) AS n FROM mp_addresses WHERE visitor=? AND market=?').get(v, m.id).n;
      if (op === 'add') { if (n >= 8) return res.status(400).json({ ok: false, error: 'Maksimal 8 alamat.' }); db.prepare('INSERT INTO mp_addresses (id, visitor, market, label, name, phone, address, city, province, is_default, created) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run(rid('adr'), v, m.id, String(b.label || 'Alamat').slice(0, 20), b.name.trim(), String(b.phone).replace(/[\s-]/g, ''), b.address.trim(), b.city, b.province, n === 0 ? 1 : 0, now()); hist(v, m.id, clk.abs, 'alamat', `Alamat ${b.city} ditambahkan.`); }
      else { const r = db.prepare('UPDATE mp_addresses SET label=?, name=?, phone=?, address=?, city=?, province=? WHERE id=? AND visitor=? AND market=?').run(String(b.label || 'Alamat').slice(0, 20), b.name.trim(), String(b.phone).replace(/[\s-]/g, ''), b.address.trim(), b.city, b.province, b.id, v, m.id); if (!r.changes) return res.status(404).json({ ok: false, error: 'Alamat tidak ditemukan.' }); hist(v, m.id, clk.abs, 'alamat', 'Alamat diperbarui.'); }
    } else if (op === 'default') {
      const r = db.prepare('SELECT id FROM mp_addresses WHERE id=? AND visitor=? AND market=?').get(b.id, v, m.id); if (!r) return res.status(404).json({ ok: false, error: 'Alamat tidak ditemukan.' });
      db.prepare('UPDATE mp_addresses SET is_default=CASE WHEN id=? THEN 1 ELSE 0 END WHERE visitor=? AND market=?').run(b.id, v, m.id); hist(v, m.id, clk.abs, 'alamat', 'Alamat utama diubah.');
    } else if (op === 'delete') {
      const n = db.prepare('SELECT COUNT(*) AS n FROM mp_addresses WHERE visitor=? AND market=?').get(v, m.id).n; if (n <= 1) return res.status(400).json({ ok: false, error: 'Minimal satu alamat harus tersisa.' });
      const r = db.prepare('DELETE FROM mp_addresses WHERE id=? AND visitor=? AND market=?').run(b.id, v, m.id); if (!r.changes) return res.status(404).json({ ok: false, error: 'Alamat tidak ditemukan.' });
      if (!db.prepare('SELECT 1 FROM mp_addresses WHERE visitor=? AND market=? AND is_default=1').get(v, m.id)) db.prepare('UPDATE mp_addresses SET is_default=1 WHERE id=(SELECT id FROM mp_addresses WHERE visitor=? AND market=? ORDER BY created LIMIT 1)').run(v, m.id);
      hist(v, m.id, clk.abs, 'alamat', 'Alamat dihapus.');
    } else return res.status(400).json({ ok: false, error: 'Aksi alamat tidak dikenal.' });
    res.json({ ok: true, addresses: addrs(v, m.id) });
  }, { clock: 'post' }));

  // ————————————————————————— katalog —————————————————————————
  const tierOf = pts => [...M.PLUS_TIERS].reverse().find(t => pts >= t.at);
  function stockMap(v) { const m = {}; for (const r of db.prepare("SELECT product, qty, day FROM shop_stock WHERE visitor=? AND product LIKE 'mp:%'").all(v)) m[r.product] = r; return m; }
  const stockOf = (l, sm, day) => { const pr = proto(l); return CM.virtualStock(pr, sm[pr.id], day).qty; };
  function card(l, ctx, detail = false) {
    const p = PROD(l.product), sl = M.SELLER(l.seller), km = kmTo(sl.city, ctx.city);
    const out = { id: l.id, pid: p.id, name: p.name, brand: p.brand, cat: p.cat, sub: p.sub, price: l.price, sale: l.sale, disc: l.disc, stock: stockOf(l, ctx.sm, ctx.day), sold: l.sold, rating: l.rating, reviews: l.reviews, added: l.added,
      seller: { id: sl.id, name: sl.name, city: sl.city, rating: sl.rating, official: sl.official }, wish: ctx.wish.has(l.id), etaReg: etaDays(km, 'reguler'), minAge: p.minAge, warranty: l.warranty };
    if (detail) Object.assign(out, { desc: p.desc, weightG: p.weightG, dim: p.dim, variants: p.variants, quality: p.quality, unitQty: p.unitQty, use: p.use, etaEks: etaDays(km, 'ekspres'), km, since: sl.since });
    return out;
  }
  const ctxOf = (c, city) => ({ day: c.clk.day, city: city || defaultCity(c.v, c.m.id, c.p), sm: stockMap(c.v), wish: new Set(db.prepare('SELECT listing FROM mp_wishlist WHERE visitor=? AND market=?').all(c.v, c.m.id).map(r => r.listing)) });
  const defaultCity = (v, m, p) => db.prepare('SELECT city FROM mp_addresses WHERE visitor=? AND market=? AND is_default=1').get(v, m)?.city || p.profile.city;
  const norm = s => String(s || '').toLowerCase();
  app.get('/api/mp/:m/home', handle((c, req, res) => {
    const ctx = ctxOf(c), ls = M.LISTINGS.filter(l => l.market === c.m.id);
    const cnt = {}; for (const l of ls) { const p = PROD(l.product); cnt[p.cat] = (cnt[p.cat] || 0) + 1; }
    const top = (arr, n) => arr.slice(0, n).map(l => card(l, ctx));
    const wishCats = new Set(db.prepare('SELECT listing FROM mp_wishlist WHERE visitor=? AND market=?').all(c.v, c.m.id).map(r => PROD(M.LISTING(r.listing)?.product)?.cat).filter(Boolean));
    const rec = ls.slice().sort((a, b) => (b.rating * 10 + Math.log(b.sold + 1) + (wishCats.has(PROD(b.product).cat) ? 6 : 0)) - (a.rating * 10 + Math.log(a.sold + 1) + (wishCats.has(PROD(a.product).cat) ? 6 : 0)));
    res.json({ ok: true, market: c.m.id, categories: M.CATEGORIES.map(k => ({ id: k.id, label: k.label, count: cnt[k.id] || 0, subs: k.subs.map(([id, label]) => ({ id, label })) })),
      flash: top(ls.filter(l => l.disc >= 15).sort((a, b) => b.disc - a.disc), 8), best: top(ls.slice().sort((a, b) => b.sold - a.sold), 8), newest: top(ls.slice().sort((a, b) => a.added - b.added), 8), recommended: top(rec, 8),
      events: M.EVENTS.filter(e => e.test(c.clk.day)).map(e => e.label), cartCount: db.prepare('SELECT COALESCE(SUM(qty),0) AS n FROM mp_cart WHERE visitor=? AND market=?').get(c.v, c.m.id).n });
  }));
  app.get('/api/mp/:m/products', handle((c, req, res) => {
    const q = req.query, ctx = ctxOf(c, null), tokens = norm(q.q).split(/\s+/).filter(Boolean);
    const min = Number(q.min) || 0, max = Number(q.max) || 0, rate = Number(q.rating) || 0; let ls = M.LISTINGS.filter(l => l.market === c.m.id);
    ls = ls.filter(l => {
      const p = PROD(l.product), sl = M.SELLER(l.seller);
      if (q.cat && p.cat !== q.cat) return false; if (q.sub && p.sub !== q.sub) return false; if (min && l.sale < min) return false; if (max && l.sale > max) return false; if (rate && l.rating < rate) return false; if (q.city && sl.city !== q.city) return false; if (q.disc === '1' && !l.disc) return false;
      if (tokens.length) { const hay = norm(`${p.name} ${p.brand} ${M.SUBCAT[p.sub].label} ${M.CATEGORIES.find(k => k.id === p.cat).label} ${sl.name}`); if (!tokens.every(t => hay.includes(t))) return false; }
      return true;
    });
    const wc = new Set(db.prepare('SELECT listing FROM mp_wishlist WHERE visitor=? AND market=?').all(c.v, c.m.id).map(r => PROD(M.LISTING(r.listing)?.product)?.cat).filter(Boolean));
    const sorters = { murah: (a, b) => a.sale - b.sale, mahal: (a, b) => b.sale - a.sale, populer: (a, b) => b.sold - a.sold, terlaris: (a, b) => b.sold - a.sold, terbaru: (a, b) => a.added - b.added, rating: (a, b) => b.rating - a.rating || b.reviews - a.reviews,
      rekomendasi: (a, b) => (b.rating * 10 + Math.log(b.sold + 1) + (wc.has(PROD(b.product).cat) ? 6 : 0)) - (a.rating * 10 + Math.log(a.sold + 1) + (wc.has(PROD(a.product).cat) ? 6 : 0)) };
    ls.sort(sorters[q.sort] || sorters.populer);
    const size = M.RULES.pageSize, page = Math.max(1, parseInt(q.page) || 1), total = ls.length, pages = Math.max(1, Math.ceil(total / size));
    res.json({ ok: true, total, page: Math.min(page, pages), pages, items: ls.slice((Math.min(page, pages) - 1) * size, Math.min(page, pages) * size).map(l => card(l, ctx)) });
  }));
  app.get('/api/mp/:m/product/:id', handle((c, req, res) => {
    const l = M.LISTING(req.params.id); if (!l || l.market !== c.m.id) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan di marketplace ini.' });
    const ctx = ctxOf(c), p = PROD(l.product);
    const compare = M.LISTINGS.filter(x => x.product === l.product).map(x => { const m2 = M.MARKET(x.market), sl = M.SELLER(x.seller), km = kmTo(sl.city, ctx.city); return { listing: x.id, market: m2.id, marketName: m2.name, color: m2.color, price: x.price, sale: x.sale, disc: x.disc, stock: stockOf(x, ctx.sm, ctx.day), seller: sl.name, city: sl.city, rating: x.rating, etaReg: etaDays(km, 'reguler'), ship: shipFee(m2, km, p.weightG, 'reguler'), fee: Math.min(m2.feeMax, Math.max(m2.feeMin, Math.round(x.sale * m2.feePct))), here: x.market === c.m.id, total: x.sale + shipFee(m2, km, p.weightG, 'reguler') + Math.min(m2.feeMax, Math.max(m2.feeMin, Math.round(x.sale * m2.feePct))) }; }).sort((a, b) => a.total - b.total);
    res.json({ ok: true, item: card(l, ctx, true), compare, related: M.LISTINGS.filter(x => x.market === c.m.id && x.id !== l.id && PROD(x.product).sub === p.sub).slice(0, 4).map(x => card(x, ctx)) });
  }));
  app.post('/api/mp/:m/wishlist', handle((c, req, res) => {
    const l = M.LISTING(req.body.listing); if (!l || l.market !== c.m.id) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan.' });
    if (req.body.on === false) db.prepare('DELETE FROM mp_wishlist WHERE visitor=? AND market=? AND listing=?').run(c.v, c.m.id, l.id); else db.prepare('INSERT INTO mp_wishlist (visitor, market, listing, created) VALUES (?,?,?,?) ON CONFLICT(visitor, market, listing) DO NOTHING').run(c.v, c.m.id, l.id, now());
    res.json({ ok: true, on: req.body.on !== false });
  }, { clock: 'post' }));
  app.get('/api/mp/:m/wishlist', handle((c, req, res) => { const ctx = ctxOf(c); res.json({ ok: true, items: db.prepare('SELECT listing FROM mp_wishlist WHERE visitor=? AND market=? ORDER BY created DESC').all(c.v, c.m.id).map(r => M.LISTING(r.listing)).filter(Boolean).map(l => card(l, ctx)) }); }));

  // ————————————————————————— keranjang —————————————————————————
  function cartView(c) {
    const ctx = ctxOf(c), rows = db.prepare('SELECT listing, variant, qty, selected FROM mp_cart WHERE visitor=? AND market=? ORDER BY created').all(c.v, c.m.id), out = [];
    for (const r of rows) { const l = M.LISTING(r.listing); if (!l) continue; const p = PROD(l.product), vr = p.variants.find(x => x.id === r.variant) || p.variants[0], stock = stockOf(l, ctx.sm, ctx.day);
      out.push({ listing: l.id, variant: vr.id, variantLabel: p.variants.length > 1 ? vr.label : null, qty: r.qty, selected: !!r.selected, name: p.name, brand: p.brand, sub: p.sub, cat: p.cat, unit: l.sale + vr.price, normal: l.price + vr.price, disc: l.disc, seller: M.SELLER(l.seller).name, sellerId: l.seller, stock, ok: stock >= r.qty, maxQty: Math.min(M.RULES.maxQty, stock), warn: stock <= 0 ? 'Stok habis' : stock < r.qty ? `Stok tersisa ${stock}` : null }); }
    const sel = out.filter(x => x.selected && x.stock > 0 && x.ok);
    return { items: out, subtotal: sel.reduce((s, x) => s + x.unit * x.qty, 0), selectedCount: sel.length, count: out.reduce((s, x) => s + x.qty, 0) };
  }
  app.get('/api/mp/:m/cart', handle((c, req, res) => res.json({ ok: true, ...cartView(c) })));
  app.post('/api/mp/:m/cart', handle((c, req, res) => {
    const b = req.body || {}, v = c.v, m = c.m.id, op = b.op;
    const bad = e => res.status(400).json({ ok: false, error: e });
    if (op === 'selectAll') { db.prepare('UPDATE mp_cart SET selected=? WHERE visitor=? AND market=?').run(b.on ? 1 : 0, v, m); return res.json({ ok: true, ...cartView(c) }); }
    const l = M.LISTING(b.listing); if (!l || l.market !== m) return res.status(404).json({ ok: false, error: 'Produk tidak ditemukan.' });
    const p = PROD(l.product), vr = p.variants.find(x => x.id === (b.variant || p.variants[0].id)); if (!vr) return bad('Variasi tidak dikenal.');
    const ctx = ctxOf(c), stock = stockOf(l, ctx.sm, ctx.day); const row = db.prepare('SELECT qty FROM mp_cart WHERE visitor=? AND market=? AND listing=? AND variant=?').get(v, m, l.id, vr.id);
    if (op === 'add') {
      if (p.minAge && ageAt(c.p.profile, c.clk.day) < p.minAge) return bad(`${p.name} untuk usia ${p.minAge}+ (usia karakter: ${ageAt(c.p.profile, c.clk.day)}).`);
      const qty = Math.floor(Number(b.qty ?? 1)); if (!(qty >= 1)) return bad('Jumlah tidak valid.'); const want = (row?.qty || 0) + qty;
      if (stock <= 0) return bad(`${p.name} habis.`); if (want > Math.min(stock, M.RULES.maxQty)) return bad(`Jumlah maksimal ${Math.min(stock, M.RULES.maxQty)} (stok ${stock}).`);
      if (!row && db.prepare('SELECT COUNT(*) AS n FROM mp_cart WHERE visitor=? AND market=?').get(v, m).n >= M.RULES.maxCartLines) return bad(`Keranjang penuh (maks. ${M.RULES.maxCartLines} jenis).`);
      db.prepare('INSERT INTO mp_cart (visitor, market, listing, variant, qty, selected, created) VALUES (?,?,?,?,?,1,?) ON CONFLICT(visitor, market, listing, variant) DO UPDATE SET qty=excluded.qty').run(v, m, l.id, vr.id, want, now());
    } else if (op === 'set') {
      const qty = Math.floor(Number(b.qty)); if (!row) return bad('Item tidak ada di keranjang.'); if (!(qty >= 1)) return bad('Jumlah minimal 1.');
      if (qty > Math.min(stock, M.RULES.maxQty)) return bad(`Jumlah maksimal ${Math.min(stock, M.RULES.maxQty)} (stok ${stock}).`);
      db.prepare('UPDATE mp_cart SET qty=? WHERE visitor=? AND market=? AND listing=? AND variant=?').run(qty, v, m, l.id, vr.id);
    } else if (op === 'variant') {
      const nv = p.variants.find(x => x.id === b.to); if (!nv || !row) return bad('Variasi tidak dikenal.'); const other = db.prepare('SELECT qty FROM mp_cart WHERE visitor=? AND market=? AND listing=? AND variant=?').get(v, m, l.id, nv.id);
      dbTx(() => { db.prepare('DELETE FROM mp_cart WHERE visitor=? AND market=? AND listing=? AND variant=?').run(v, m, l.id, vr.id); db.prepare('INSERT INTO mp_cart (visitor, market, listing, variant, qty, selected, created) VALUES (?,?,?,?,?,1,?) ON CONFLICT(visitor, market, listing, variant) DO UPDATE SET qty=MIN(?, mp_cart.qty + excluded.qty)').run(v, m, l.id, nv.id, row.qty, now(), M.RULES.maxQty); })(); void other;
    } else if (op === 'remove') db.prepare('DELETE FROM mp_cart WHERE visitor=? AND market=? AND listing=? AND variant=?').run(v, m, l.id, vr.id);
    else if (op === 'select') db.prepare('UPDATE mp_cart SET selected=? WHERE visitor=? AND market=? AND listing=? AND variant=?').run(b.on ? 1 : 0, v, m, l.id, vr.id);
    else return bad('Aksi keranjang tidak dikenal.');
    res.json({ ok: true, ...cartView(c) });
  }, { clock: 'post' }));

  // ————————————————————————— voucher —————————————————————————
  const period = day => Math.floor(day / 30);
  const claimedCount = (v, m, code, per) => db.prepare('SELECT COUNT(*) AS n FROM mp_vouchers WHERE visitor=? AND market=? AND code=? AND period=?').get(v, m, code, per).n;
  const npcUsed = (vc, day) => Math.floor(vc.quota * Math.min(0.97, vc.npcRate * M.dom(day)));
  const quotaLeft = (vc, v, day) => Math.max(0, vc.quota - npcUsed(vc, day) - claimedCount(v, vc.market, vc.code, period(day)));
  const orderCount = (v, m) => db.prepare("SELECT COUNT(*) AS n FROM mp_order_meta WHERE visitor=? AND market=?").get(v, m).n;
  const points = v => db.prepare('SELECT points FROM mp_points WHERE visitor=?').get(v)?.points || 0;
  const plActive = (v, m) => { const r = db.prepare('SELECT status FROM mp_paylater WHERE visitor=? AND market=?').get(v, m); return !!r && r.status !== 'none'; };
  // Syarat pemakaian di luar isi keranjang (masa berlaku, event, pengguna baru, eksklusif).
  function vcState(vc, c) {
    const day = c.clk.day; let mine = db.prepare('SELECT * FROM mp_vouchers WHERE visitor=? AND market=? AND code=?').get(c.v, vc.market, vc.code);
    // Voucher bulanan: yang sudah terpakai/kedaluwarsa di periode lalu boleh diklaim lagi pada periode (bulan) berikutnya.
    if (mine && mine.period !== period(day) && (mine.uses_left <= 0 || day > mine.expires_day)) mine = null;
    if (vc.scope === 'event' && !M.EVENT(vc.event).test(day)) return { state: 'inactive', why: `Hanya pada ${M.EVENT(vc.event).label}` };
    if (vc.scope === 'newuser' && orderCount(c.v, vc.market) > 0) return { state: 'ineligible', why: 'Khusus pembelian pertama' };
    if (vc.scope === 'exclusive') { if (vc.req === 'paylater' && !plActive(c.v, vc.market)) return { state: 'ineligible', why: 'Perlu PayLater aktif' }; if (vc.req?.startsWith('tier:')) { const need = vc.req.slice(5), tier = tierOf(points(c.v)); if (M.PLUS_TIERS.findIndex(t => t.id === tier.id) < M.PLUS_TIERS.findIndex(t => t.id === need)) return { state: 'ineligible', why: `Perlu tingkat ${M.PLUS_TIERS.find(t => t.id === need).label}` }; } }
    if (mine) { if (mine.uses_left <= 0) return { state: 'used', why: 'Sudah terpakai', mine }; if (day > mine.expires_day) return { state: 'expired', why: 'Kedaluwarsa', mine }; return { state: 'claimed', mine }; }
    if (quotaLeft(vc, c.v, day) <= 0) return { state: 'soldout', why: 'Kuota bulan ini habis' };
    return { state: 'claimable' };
  }
  const vcOut = (vc, c) => { const s = vcState(vc, c); return { code: vc.code, label: vc.label, desc: vc.desc, kind: vc.kind, value: vc.value, max: vc.max, min: vc.min, cats: vc.cats, scope: vc.scope, seller: vc.seller ? M.SELLER(vc.seller)?.name : null, perUser: vc.perUser, quota: vc.quota, quotaLeft: quotaLeft(vc, c.v, c.clk.day), event: vc.event ? M.EVENT(vc.event).label : null, req: vc.req || null, state: s.state, why: s.why || null, usesLeft: s.mine?.uses_left ?? null, expiresDay: s.mine?.expires_day ?? null, stackClass: vc.kind === 'freeship' ? 'freeship' : vc.kind === 'cashback' ? 'cashback' : 'discount' }; };
  app.get('/api/mp/:m/vouchers', handle((c, req, res) => res.json({ ok: true, vouchers: M.VOUCHERS.filter(v => v.market === c.m.id).map(v => vcOut(v, c)), stack: c.m.stack, day: c.clk.day })));
  app.get('/api/mp/:m/voucher/:code', handle((c, req, res) => { const vc = M.VOUCHER(c.m.id, req.params.code); if (!vc) return res.status(404).json({ ok: false, error: 'Voucher tidak ditemukan.' }); res.json({ ok: true, voucher: vcOut(vc, c), stack: c.m.stack }); }));
  app.post('/api/mp/:m/vouchers/claim', handle((c, req, res) => {
    const vc = M.VOUCHER(c.m.id, String(req.body.code || '').toUpperCase()); if (!vc) return res.status(404).json({ ok: false, error: 'Voucher tidak ditemukan.' });
    let out;
    dbTx(() => {
      const s = vcState(vc, c); if (s.state !== 'claimable') { out = { code: s.state === 'claimed' ? 409 : 400, error: s.state === 'claimed' ? 'Voucher sudah ada di koleksimu.' : `Voucher tidak bisa diklaim: ${s.why}.` }; return; }
      db.prepare('INSERT INTO mp_vouchers (visitor, market, code, status, uses_left, claimed_abs, expires_day, period) VALUES (?,?,?,?,?,?,?,?) ON CONFLICT(visitor, market, code) DO UPDATE SET status=excluded.status, uses_left=excluded.uses_left, claimed_abs=excluded.claimed_abs, expires_day=excluded.expires_day, period=excluded.period').run(c.v, c.m.id, vc.code, 'claimed', vc.perUser, c.clk.abs, c.clk.day + 30, period(c.clk.day));
      hist(c.v, c.m.id, c.clk.abs, 'voucher', `Voucher ${vc.code} diklaim.`); out = { ok: true };
    })();
    if (out.ok) return res.json({ ok: true, voucher: vcOut(vc, c), msg: `Voucher ${vc.code} masuk koleksi (berlaku 30 hari).` }); res.status(out.code).json({ ok: false, error: out.error });
  }, { clock: 'post' }));

  // ————————————————————————— kuotasi checkout —————————————————————————
  const alloc = (total, weights) => { const sum = weights.reduce((s, w) => s + w, 0); if (!sum || total <= 0) return weights.map(() => 0); const raw = weights.map(w => total * w / sum), base = raw.map(Math.floor); let rest = total - base.reduce((s, x) => s + x, 0); const idx = raw.map((r, i) => [r - base[i], i]).sort((a, b) => b[0] - a[0]); for (let k = 0; rest > 0 && k < idx.length; k++, rest--) base[idx[k][1]]++; return base; };
  function quoteGroup(c, b, { forPay = false } = {}) {
    const { p, m, v, clk } = c; const age = ageAt(p.profile, clk.day);
    const rows = db.prepare('SELECT listing, variant, qty FROM mp_cart WHERE visitor=? AND market=? AND selected=1 ORDER BY created').all(v, m.id);
    if (!rows.length) throw Object.assign(new Error(), { user: 'Pilih minimal satu produk di keranjang.' });
    const addr = db.prepare('SELECT * FROM mp_addresses WHERE id=? AND visitor=? AND market=?').get(b.address, v, m.id) || db.prepare('SELECT * FROM mp_addresses WHERE visitor=? AND market=? AND is_default=1').get(v, m.id);
    if (!addr) throw Object.assign(new Error(), { user: 'Tambahkan alamat pengiriman.' });
    const ship = b.ship === 'ekspres' ? 'ekspres' : 'reguler', sm = stockMap(v);
    const bySeller = new Map();
    for (const r of rows) {
      const l = M.LISTING(r.listing); if (!l || l.market !== m.id) throw Object.assign(new Error(), { user: 'Ada produk yang tidak lagi dijual.' }); const pr = PROD(l.product), vr = pr.variants.find(x => x.id === r.variant) || pr.variants[0];
      if (pr.minAge && age < pr.minAge) throw Object.assign(new Error(), { user: `${pr.name} untuk usia ${pr.minAge}+ (usia karakter: ${age}).` });
      const stock = stockOf(l, sm, clk.day); if (r.qty > stock) throw Object.assign(new Error(), { user: stock <= 0 ? `${pr.name} habis.` : `${pr.name}: stok tersisa ${stock}, di keranjang ${r.qty}.` });
      const unit = l.sale + vr.price, base = l.price + vr.price;
      if (!bySeller.has(l.seller)) bySeller.set(l.seller, []);
      bySeller.get(l.seller).push({ id: 'mp:' + l.id, listing: l.id, name: pr.name + (pr.variants.length > 1 ? ` (${vr.label})` : ''), variant: vr.id, qty: r.qty, price: unit, total: unit * r.qty, normalTotal: base * r.qty, cat: pr.cat, weightG: pr.weightG * r.qty });
    }
    const orders = [...bySeller.entries()].map(([sid, lines]) => {
      const sl = M.SELLER(sid), km = kmTo(sl.city, addr.city), sub = lines.reduce((s, l) => s + l.total, 0), wt = lines.reduce((s, l) => s + l.weightG, 0);
      return { seller: sl, lines, sub, km, shipping: shipFee(m, km, wt, ship), discount: 0, shipDisc: 0, cashback: 0, svc: 0, cod: 0, vouchers: [] };
    });
    // voucher: validasi aturan tumpukan, syarat, dan hitung potongan secara transparan
    const codes = [...new Set((Array.isArray(b.vouchers) ? b.vouchers : []).map(x => String(x).toUpperCase()))]; const used = { discount: 0, freeship: 0, cashback: 0 }; const vouchers = [];
    for (const code of codes) {
      const vc = M.VOUCHER(m.id, code); if (!vc) throw Object.assign(new Error(), { user: `Voucher ${code} tidak ditemukan.` });
      const s = vcState(vc, c); if (s.state !== 'claimed') throw Object.assign(new Error(), { user: s.state === 'claimable' ? `Voucher ${code} belum diklaim. Klaim di koleksi voucher.` : `Voucher ${code} tidak bisa dipakai: ${s.why || s.state}.` });
      const cls = vc.kind === 'freeship' ? 'freeship' : vc.kind === 'cashback' ? 'cashback' : 'discount';
      if (m.stack[cls] === 0) throw Object.assign(new Error(), { user: `${m.name} tidak menyediakan voucher ${cls === 'cashback' ? 'cashback' : cls}.` });
      if (++used[cls] > m.stack[cls]) throw Object.assign(new Error(), { user: `${m.name} hanya mengizinkan ${m.stack[cls]} voucher ${cls === 'freeship' ? 'gratis ongkir' : cls === 'cashback' ? 'cashback' : 'diskon'} per checkout.` });
      const elig = orders.map(o => (vc.scope === 'seller' && o.seller.id !== vc.seller) ? 0 : o.lines.filter(l => !vc.cats || vc.cats.includes(l.cat)).reduce((s, l) => s + l.total, 0));
      const eligSum = elig.reduce((s, x) => s + x, 0);
      if (!eligSum) throw Object.assign(new Error(), { user: `Voucher ${code} tidak berlaku untuk produk yang dipilih${vc.cats ? ' (hanya kategori tertentu)' : vc.scope === 'seller' ? ` (hanya ${M.SELLER(vc.seller).name})` : ''}.` });
      if (eligSum < vc.min) throw Object.assign(new Error(), { user: `Voucher ${code} butuh belanja minimal ${fmtRp(vc.min)} (produk yang memenuhi syarat: ${fmtRp(eligSum)}).` });
      let amt;
      if (vc.kind === 'freeship') { const room = orders.map(o => elig[orders.indexOf(o)] ? o.shipping - o.shipDisc : 0); amt = Math.min(vc.max, room.reduce((s, x) => s + x, 0)); const a = alloc(amt, room); orders.forEach((o, i) => { o.shipDisc += a[i]; }); }
      else if (vc.kind === 'cashback') { amt = Math.min(vc.max, Math.round(eligSum * vc.value / 100)); const a = alloc(amt, elig); orders.forEach((o, i) => { o.cashback += a[i]; }); }
      else { amt = vc.kind === 'pct' ? Math.min(vc.max || Infinity, Math.round(eligSum * vc.value / 100)) : Math.min(vc.value, eligSum); const a = alloc(amt, elig); orders.forEach((o, i) => { o.discount += a[i]; }); }
      orders.forEach(o => o.vouchers.push(code)); vouchers.push({ code, label: vc.label, kind: vc.kind, amount: amt, cashback: vc.kind === 'cashback' });
    }
    const grossAfter = orders.reduce((s, o) => s + o.sub - o.discount, 0);
    const svcTotal = Math.min(m.feeMax, Math.max(m.feeMin, Math.round(grossAfter * m.feePct))), svcA = alloc(svcTotal, orders.map(o => o.sub - o.discount));
    const method = String(b.method || ''); if (!m.methods.includes(method)) throw Object.assign(new Error(), { user: method ? `${m.name} tidak menerima metode ini.` : 'Pilih metode pembayaran.' });
    orders.forEach((o, i) => { o.svc = svcA[i]; if (method === 'cod') o.cod = M.RULES.codFee; o.total = Math.max(0, o.sub - o.discount + o.shipping - o.shipDisc + o.svc + o.cod); });
    const total = orders.reduce((s, o) => s + o.total, 0);
    return { orders, addr, ship, vouchers, method, subtotal: orders.reduce((s, o) => s + o.sub, 0), discount: orders.reduce((s, o) => s + o.discount, 0), shipping: orders.reduce((s, o) => s + o.shipping, 0), shipDisc: orders.reduce((s, o) => s + o.shipDisc, 0), svc: svcTotal, cod: orders.reduce((s, o) => s + o.cod, 0), cashback: orders.reduce((s, o) => s + o.cashback, 0), total, age };
  }
  const quoteOut = (g, m, clk) => ({ method: g.method, ship: g.ship, address: { id: g.addr.id, label: g.addr.label, city: g.addr.city, address: g.addr.address },
    orders: g.orders.map(o => ({ seller: o.seller.name, sellerCity: o.seller.city, km: o.km, eta: etaDays(o.km, g.ship), lines: o.lines.map(l => ({ name: l.name, qty: l.qty, price: l.price, total: l.total })), sub: o.sub, discount: o.discount, shipping: o.shipping, shipDisc: o.shipDisc, svc: o.svc, cod: o.cod, cashback: o.cashback, total: o.total })),
    totals: { subtotal: g.subtotal, discount: g.discount, shipping: g.shipping, shipDisc: g.shipDisc, svc: g.svc, cod: g.cod, total: g.total, cashback: g.cashback }, vouchers: g.vouchers, svcRule: `${(m.feePct * 100).toLocaleString('id-ID')}% dari belanja setelah diskon (min ${fmtRp(m.feeMin)}, maks ${fmtRp(m.feeMax)})`,
    paylater: m.paylater ? plQuotes(g.total, m) : null });
  app.post('/api/mp/:m/quote', handle((c, req, res) => { const g = quoteGroup(c, req.body || {}); res.json({ ok: true, ...quoteOut(g, c.m, c.clk) }); }, { clock: 'post' }));

  // ————————————————————————— PayLater —————————————————————————
  const PL = M.RULES.paylater;
  const plRow = (v, m) => db.prepare('SELECT * FROM mp_paylater WHERE visitor=? AND market=?').get(v, m);
  const scoreOf = v => { const s = st(v).score; return s == null ? L.CREDIT_RULES.scoreStart : s; };
  const limitFor = (score, m) => { const t = PL.limitByScore.find(([min]) => score >= min); return t ? Math.round(t[1] * m.paylater.limitMult / 100000) * 100000 : 0; };
  function plCost(principal, tenor, m) {
    const fee = Math.round(principal * m.paylater.feePct), interest = tenor === 1 ? 0 : Math.round(principal * m.paylater.rateMonth * tenor), total = principal + fee + interest;
    const split = (n, k) => { const base = Math.floor(n / k), out = Array(k).fill(base); out[k - 1] += n - base * k; return out; };
    const pr = split(principal, tenor), fe = split(fee, tenor), it = split(interest, tenor);
    return { fee, interest, total, per: Math.ceil(total / tenor), bills: pr.map((x, i) => ({ principal: x, fee: fe[i], interest: it[i] })) };
  }
  const plQuotes = (principal, m) => PL.tenors.map(t => { const c = plCost(principal, t, m); return { tenor: t, fee: c.fee, interest: c.interest, total: c.total, perMonth: c.per, rateMonth: m.paylater.rateMonth }; });
  // Proses tagihan lazim (idempoten): pengingat, denda keterlambatan, bunga susulan, pengurangan limit, skor kredit.
  function plAdvance(c) {
    const { v, m, clk } = c; if (!m.paylater) return; const acc = plRow(v, m.id); if (!acc) return; const day = clk.day;
    const open = db.prepare("SELECT * FROM mp_pl_bills WHERE visitor=? AND market=? AND status IN ('terbuka','telat')").all(v, m.id); if (!open.length) return;
    let score = null, lim = acc.lim, lateN = acc.late_count;
    for (const b of open) {
      const due = b.due_day, outstanding = () => b.principal + b.fee + b.interest + b.late_fee + b.extra - b.paid;
      if (day >= due - 5 && day <= due) CM.notify(v, b.id, 'pl-due', 'Tagihan PayLater segera jatuh tempo', `${m.paylater.name}: ${fmtRp(outstanding())} jatuh tempo pada hari ke-${due + 1}.`, clk.abs);
      if (day > due + PL.graceDays) {
        if (!b.fined) {
          b.late_fee = PL.lateFee; b.fined = 1; b.status = 'telat'; lateN++; lim = Math.max(0, Math.round(lim * 0.8 / 100000) * 100000); score = (score ?? scoreOf(v)) + PL.scorePenalty;
          db.prepare("UPDATE mp_pl_bills SET late_fee=?, fined=1, status='telat' WHERE id=?").run(b.late_fee, b.id);
          hist(v, m.id, clk.abs, 'paylater', `Tagihan PayLater terlambat: denda ${fmtRp(PL.lateFee)}, limit dikurangi, skor kredit turun.`);
          CM.notify(v, b.id, 'pl-late', 'Tagihan PayLater terlambat', `Denda ${fmtRp(PL.lateFee)} dikenakan. Limit dikurangi dan skor kredit turun. Segera lunasi.`, clk.abs);
        }
        const months = Math.floor((day - due - PL.graceDays) / 30);
        if (months > b.mo_applied) { for (let k = b.mo_applied; k < months; k++) b.extra += Math.round((b.principal + b.fee + b.interest + b.late_fee + b.extra - b.paid) * PL.lateRateMonth); b.mo_applied = months; db.prepare('UPDATE mp_pl_bills SET extra=?, mo_applied=? WHERE id=?').run(b.extra, b.mo_applied, b.id); }
      }
    }
    if (score != null) { const clamp = Math.max(L.CREDIT_RULES.scoreMin, Math.min(L.CREDIT_RULES.scoreMax, score)); db.prepare('UPDATE fin_state SET score=? WHERE visitor=?').run(clamp, v); }
    const overdue = db.prepare("SELECT COUNT(*) AS n FROM mp_pl_bills WHERE visitor=? AND market=? AND status='telat'").get(v, m.id).n;
    db.prepare('UPDATE mp_paylater SET lim=?, late_count=?, status=? WHERE visitor=? AND market=?').run(lim, lateN, overdue > 0 ? (lateN >= PL.blockAfter ? 'blocked' : 'restricted') : (acc.status === 'blocked' || acc.status === 'restricted' ? 'active' : acc.status), v, m.id);
  }
  function plView(c) {
    plAdvance(c); const { v, m, clk } = c, acc = plRow(v, m.id), score = scoreOf(v), age = ageAt(c.p.profile, clk.day);
    const bills = acc ? db.prepare("SELECT b.*, l.created_day, l.tenor FROM mp_pl_bills b JOIN mp_pl_loans l ON l.id=b.loan WHERE b.visitor=? AND b.market=? ORDER BY b.due_day, b.seq").all(v, m.id).map(b => ({ id: b.id, loan: b.loan, seq: b.seq, of: b.of, due: b.due_day, amount: b.principal + b.fee + b.interest + b.late_fee + b.extra, paid: b.paid, left: b.principal + b.fee + b.interest + b.late_fee + b.extra - b.paid, lateFee: b.late_fee, extra: b.extra, status: b.status, paidDay: b.paid_day })) : [];
    const loans = acc ? db.prepare("SELECT * FROM mp_pl_loans WHERE visitor=? AND market=? ORDER BY created_day DESC").all(v, m.id) : [];
    const open = bills.filter(b => b.status !== 'lunas'), next = open.slice().sort((a, b) => a.due - b.due)[0] || null;
    return { ok: true, name: m.paylater.name, rateMonth: m.paylater.rateMonth, feePct: m.paylater.feePct, tenors: PL.tenors, minScore: m.paylater.minScore, score, age, minAge: PL.minAge,
      account: acc ? { status: acc.status, limit: acc.lim, used: acc.used, available: Math.max(0, acc.lim - acc.used), lateCount: acc.late_count, activatedDay: acc.activated_day } : null,
      eligible: { ok: age >= PL.minAge && score >= m.paylater.minScore, limit: limitFor(score, m), why: age < PL.minAge ? `Minimal usia ${PL.minAge} tahun (usia karakter: ${age}).` : score < m.paylater.minScore ? `Skor kredit ${score} di bawah syarat ${m.paylater.minScore}.` : null },
      totalDue: open.reduce((s, b) => s + b.left, 0), next, bills, loans: loans.map(l => ({ id: l.id, principal: l.principal, tenor: l.tenor, fee: l.fee, interest: l.interest, total: l.total, createdDay: l.created_day, status: l.status })), rules: { graceDays: PL.graceDays, lateFee: PL.lateFee, lateRateMonth: PL.lateRateMonth, blockAfter: PL.blockAfter }, day: clk.day };
  }
  app.get('/api/mp/:m/paylater', handle((c, req, res) => { if (!c.m.paylater) return res.status(404).json({ ok: false, error: `${c.m.name} tidak menyediakan PayLater.` }); res.json(plView(c)); }));
  app.post('/api/mp/:m/paylater/activate', handle(guard0((c, req, res) => {
    if (!c.m.paylater) return res.status(404).json({ ok: false, error: `${c.m.name} tidak menyediakan PayLater.` }); const v = c.v, score = scoreOf(v), age = ageAt(c.p.profile, c.clk.day);
    if (plRow(v, c.m.id)) return res.status(409).json({ ok: false, error: 'PayLater sudah aktif.' });
    if (age < PL.minAge) return res.status(400).json({ ok: false, error: `PayLater untuk usia ${PL.minAge} tahun ke atas (usia karakter: ${age}).` });
    if (score < c.m.paylater.minScore) return res.status(400).json({ ok: false, error: `Skor kredit ${score} belum memenuhi syarat ${c.m.paylater.minScore}. Bayar tagihan tepat waktu untuk menaikkan skor.` });
    const pe = checkPin(v, req.body.pin); if (pe) return res.status(400).json({ ok: false, error: pe }); const lim = limitFor(score, c.m);
    db.prepare("INSERT INTO mp_paylater (visitor, market, status, lim, used, activated_day, late_count) VALUES (?,?,'active',?,0,?,0)").run(v, c.m.id, lim, c.clk.day); hist(v, c.m.id, c.clk.abs, 'paylater', `${c.m.paylater.name} diaktifkan. Limit ${fmtRp(lim)}.`);
    res.json({ ...plView(c), msg: `${c.m.paylater.name} aktif. Limit ${fmtRp(lim)} (berdasarkan skor kredit ${score}).` });
  }), { clock: 'post' }));
  // Sumber dana untuk pembayaran tagihan / pembelian: tunai, atau saldo rekening/dompet BizSim (bukan saldo kedua).
  function fundSource(v, method, sourceId, m) {
    if (method === 'cash') return { type: 'cash', label: 'Uang tunai' };
    const a = sourceId ? acct(v, sourceId) : null; if (!a) return { error: 'Pilih sumber dana.' }; if (a.status !== 'aktif') return { error: `${nameOf(a)} sedang tidak aktif.` };
    if (!['bank', 'wallet'].includes(a.kind)) return { error: 'Pilih rekening bank atau dompet digital.' };
    return { type: 'acct', acct: a, kind: 'saldo', label: `Saldo ${nameOf(a)}` };
  }
  function payBills(c, req, res, bills, label, kindTx) {
    const v = c.v, clk = c.clk, b = req.body || {}; if (!idemOk(b.idem)) return res.status(400).json({ ok: false, error: 'Kunci transaksi tidak valid.' });
    const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const amount = bills.reduce((s, x) => s + x.left, 0); if (amount <= 0) return res.status(400).json({ ok: false, error: 'Tidak ada tagihan yang harus dibayar.' });
    const src = fundSource(v, b.method === 'cash' ? 'cash' : 'saldo', b.source, c.m); if (src.error) return res.status(400).json({ ok: false, error: src.error });
    if (src.type === 'acct') { const pe = checkPin(v, b.pin); if (pe) return res.status(400).json({ ok: false, error: pe }); }
    let out;
    dbTx(() => {
      const err = debitSource(c.p, src, amount, clk, 'saldo');
      if (err) { const t = addTx(v, { idem: b.idem, kind: kindTx, status: 'gagal', amount: -amount, method: 'saldo', src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: c.m.id, label, reason: err, day: clk.day, sec: clk.sec }); out = { ...finView(c.p, clk.abs), ok: false, error: err, txn: txRow(t) }; setResp(t, out); return; }
      const t = addTx(v, { idem: b.idem, kind: kindTx, status: 'berhasil', amount: -amount, method: 'saldo', src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: c.m.id, label: `${label} · ${src.label}`, day: clk.day, sec: clk.sec });
      const adj = applyDebit(c.p, src, amount, clk, 'saldo', 'belanja', label, t);
      let relieved = 0, onTimeAll = true;
      for (const x of bills) { if (x.interestOff) db.prepare('UPDATE mp_pl_bills SET interest=0 WHERE id=?').run(x.id); const r = db.prepare("UPDATE mp_pl_bills SET paid=paid+?, status='lunas', paid_day=? WHERE id=? AND status IN ('terbuka','telat')").run(x.left, clk.day, x.id); if (!r.changes) throw Object.assign(new Error(), { user: 'Tagihan sudah dibayar.' }); relieved += x.principal; if (clk.day > x.due) onTimeAll = false; }
      db.prepare('UPDATE mp_paylater SET used=MAX(0, used-?) WHERE visitor=? AND market=?').run(relieved, v, c.m.id);
      for (const ln of new Set(bills.map(x => x.loan))) { if (!db.prepare("SELECT 1 FROM mp_pl_bills WHERE loan=? AND status<>'lunas'").get(ln)) db.prepare("UPDATE mp_pl_loans SET status='lunas' WHERE id=?").run(ln); }
      if (onTimeAll) { const sc = Math.min(L.CREDIT_RULES.scoreMax, scoreOf(v) + PL.scoreOnTime * bills.length); db.prepare('UPDATE fin_state SET score=? WHERE visitor=?').run(sc, v); }
      const overdue = db.prepare("SELECT COUNT(*) AS n FROM mp_pl_bills WHERE visitor=? AND market=? AND status='telat'").get(v, c.m.id).n; const acc = plRow(v, c.m.id);
      if (!overdue && acc && ['restricted', 'blocked'].includes(acc.status)) db.prepare("UPDATE mp_paylater SET status='active' WHERE visitor=? AND market=?").run(v, c.m.id);
      hist(v, c.m.id, clk.abs, 'paylater', `${label}: ${fmtRp(amount)} dibayar.`);
      out = { ...finView(c.p, clk.abs), ok: true, txn: txRow(t), paylater: plView(c), cashAdj: adj ? [adj] : [], msg: `${label} ${fmtRp(amount)} berhasil dibayar.` }; setResp(t, out);
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }
  function guard0(fn) { return (c, req, res) => { const g = F.guard((rq, rs) => fn(c, rq, rs)); return g(req, res); }; }
  app.post('/api/mp/:m/paylater/pay', handle(guard0((c, req, res) => {
    if (!c.m.paylater) return res.status(404).json({ ok: false, error: 'PayLater tidak tersedia.' }); plAdvance(c);
    const bl = db.prepare("SELECT * FROM mp_pl_bills WHERE id=? AND visitor=? AND market=? AND status IN ('terbuka','telat')").get(req.body.bill, c.v, c.m.id); if (!bl) return res.status(404).json({ ok: false, error: 'Tagihan tidak ditemukan atau sudah lunas.' });
    // Cicilan harus dibayar berurutan: cicilan sebelumnya pada pinjaman yang sama harus lunas lebih dulu.
    const earlier = db.prepare("SELECT 1 FROM mp_pl_bills WHERE loan=? AND seq<? AND status<>'lunas'").get(bl.loan, bl.seq); if (earlier) return res.status(400).json({ ok: false, error: 'Bayar cicilan sebelumnya terlebih dahulu.' });
    const left = bl.principal + bl.fee + bl.interest + bl.late_fee + bl.extra - bl.paid;
    payBills(c, req, res, [{ id: bl.id, left, principal: bl.principal, loan: bl.loan, due: bl.due_day }], `Cicilan ${bl.seq}/${bl.of} ${c.m.paylater.name}`, 'bayar_paylater');
  }), { clock: 'post' }));
  app.post('/api/mp/:m/paylater/payoff', handle(guard0((c, req, res) => {
    if (!c.m.paylater) return res.status(404).json({ ok: false, error: 'PayLater tidak tersedia.' }); plAdvance(c);
    const loan = db.prepare("SELECT * FROM mp_pl_loans WHERE id=? AND visitor=? AND market=? AND status='aktif'").get(req.body.loan, c.v, c.m.id); if (!loan) return res.status(404).json({ ok: false, error: 'Pinjaman tidak ditemukan atau sudah lunas.' });
    const rows = db.prepare("SELECT * FROM mp_pl_bills WHERE loan=? AND status IN ('terbuka','telat') ORDER BY seq").all(loan.id), list = [];
    for (const b of rows) { const accrued = b.due_day <= c.clk.day + 30; const interest = accrued ? b.interest : 0; list.push({ id: b.id, loan: b.loan, due: b.due_day, principal: b.principal, left: b.principal + b.fee + interest + b.late_fee + b.extra - b.paid, discountInterest: accrued ? 0 : b.interest, interestOff: !accrued }); }
    if (req.body.preview) return res.json({ ok: true, amount: list.reduce((s, x) => s + x.left, 0), savedInterest: list.reduce((s, x) => s + x.discountInterest, 0), count: list.length });
    payBills(c, req, res, list, `Pelunasan ${c.m.paylater.name}`, 'bayar_paylater');
  }), { clock: 'post' }));
  app.post('/api/mp/:m/paylater/payoff-quote', handle((c, req, res) => {
    if (!c.m.paylater) return res.status(404).json({ ok: false, error: 'PayLater tidak tersedia.' }); plAdvance(c);
    const loan = db.prepare("SELECT * FROM mp_pl_loans WHERE id=? AND visitor=? AND market=? AND status='aktif'").get(req.body.loan, c.v, c.m.id); if (!loan) return res.status(404).json({ ok: false, error: 'Pinjaman tidak ditemukan.' });
    const rows = db.prepare("SELECT * FROM mp_pl_bills WHERE loan=? AND status IN ('terbuka','telat')").all(loan.id); let amount = 0, saved = 0;
    for (const b of rows) { const accrued = b.due_day <= c.clk.day + 30; amount += b.principal + b.fee + (accrued ? b.interest : 0) + b.late_fee + b.extra - b.paid; if (!accrued) saved += b.interest; }
    res.json({ ok: true, amount, savedInterest: saved, count: rows.length });
  }, { clock: 'post' }));

  // ————————————————————————— checkout —————————————————————————
  app.post('/api/mp/:m/checkout', handle(guard0((c, req, res) => {
    const { p, m, v, clk } = c, b = req.body || {};
    if (!idemOk(b.idem)) return res.status(400).json({ ok: false, error: 'Kunci transaksi tidak valid.' });
    const dup = db.prepare('SELECT resp FROM shop_orders WHERE visitor=? AND idem=?').get(v, b.idem + ':0'); if (dup?.resp) return res.json({ ...parse(dup.resp, {}), duplicate: true });
    const active = db.prepare("SELECT COUNT(*) AS n FROM shop_orders WHERE visitor=? AND ful_status NOT IN ('completed','cancelled','delivery_failed','returned')").get(v).n;
    let g; try { g = quoteGroup(c, b, { forPay: true }); } catch (e) { if (e.user) return res.status(400).json({ ok: false, error: e.user }); throw e; }
    if (active + g.orders.length > M.RULES.maxOrdersActive) return res.status(400).json({ ok: false, error: `Terlalu banyak pesanan aktif (maks. ${M.RULES.maxOrdersActive}). Selesaikan pesanan sebelumnya.` });
    const pay = g.method; const gid = rid('grp'); const label0 = `${m.name}: ${g.orders.map(o => `${o.lines.length} produk ${o.seller.name}`).join('; ')}`;
    // sumber dana
    let src, pl = null;
    if (pay === 'paylater') {
      if (!m.paylater) return res.status(400).json({ ok: false, error: `${m.name} tidak menyediakan PayLater.` }); plAdvance(c); const acc = plRow(v, m.id);
      if (!acc) return res.status(400).json({ ok: false, error: `Aktifkan ${m.paylater.name} terlebih dahulu.` });
      if (acc.status !== 'active') return res.status(400).json({ ok: false, error: acc.status === 'blocked' ? `${m.paylater.name} diblokir karena tunggakan berulang. Lunasi tagihan terlambat.` : `${m.paylater.name} dibatasi karena ada tagihan terlambat. Lunasi dulu.` });
      const tenor = Number(b.tenor); if (!PL.tenors.includes(tenor)) return res.status(400).json({ ok: false, error: 'Pilih tenor 1, 3, 6, atau 12 bulan.' });
      if (g.total > acc.lim - acc.used) return res.status(400).json({ ok: false, error: `Limit ${m.paylater.name} tersedia ${fmtRp(acc.lim - acc.used)}, total ${fmtRp(g.total)}.` });
      const pe = checkPin(v, b.pin); if (pe) return res.status(400).json({ ok: false, error: pe }); pl = { tenor, cost: plCost(g.total, tenor, m) }; src = { type: 'paylater', label: `${m.paylater.name} ${tenor} bulan` };
    } else if (pay === 'saldo') { src = fundSource(v, 'saldo', b.source, m); if (src.error) return res.status(400).json({ ok: false, error: src.error }); const pe = checkPin(v, b.pin); if (pe) return res.status(400).json({ ok: false, error: pe }); }
    else { const fm = { name: m.name, methods: m.methods.filter(x => !['saldo', 'paylater'].includes(x)) }; src = resolveMethod(v, fm, pay, b.source); if (src.error) return res.status(400).json({ ok: false, error: src.error }); if (src.type === 'acct') { const pe = checkPin(v, b.pin); if (pe) return res.status(400).json({ ok: false, error: pe }); } }
    const cod = !!src.cod; let out;
    dbTx(() => {
      const fails = reason => { const t = addTx(v, { idem: b.idem + ':0', kind: 'belanja', status: 'gagal', amount: -g.total, method: pay, src: src.type === 'cash' ? 'cash' : src.type === 'paylater' ? 'paylater' : src.acct.id, merchant: m.id, label: label0, reason, day: clk.day, sec: clk.sec }); hist(v, m.id, clk.abs, 'checkout', `Checkout gagal: ${reason}`); out = { ...finView(p, clk.abs), ok: false, error: reason, txn: txRow(t) }; setResp(t, out); };
      if (src.type !== 'paylater' && !cod) { const err = debitSource(p, src, g.total, clk, src.kind); if (err) return fails(err); }
      // stok (atomik), lalu pesanan per penjual
      for (const o of g.orders) for (const l of o.lines) { const pr = CM.EXT.prod(l.id); if (!CM.reserveStock(v, pr, l.qty, clk.day)) throw Object.assign(new Error(), { user: `${pr.name}: stok habis saat checkout. Muat ulang keranjang.` }); }
      const created = []; let adjs = [];
      g.orders.forEach((o, i) => {
        const store = CM.EXT.store('mp-' + o.seller.id), oid = rid('ord');
        const fees = [{ code: 'shipping', label: `Ongkos kirim ${GRADE[g.ship]} (${o.km ? o.km + ' km' : 'satu kota'})`, amount: o.shipping }, { code: 'service', label: `Biaya layanan ${m.name}`, amount: o.svc }]; if (o.cod) fees.push({ code: 'cod', label: 'Biaya COD', amount: o.cod });
        const discounts = []; if (o.discount) discounts.push({ code: 'voucher', label: o.vouchers.filter(x => M.VOUCHER(m.id, x).kind !== 'freeship' && M.VOUCHER(m.id, x).kind !== 'cashback').join(' + ') || 'Voucher', amount: -o.discount, type: 'voucher' }); if (o.shipDisc) discounts.push({ code: 'freeship', label: 'Gratis ongkir (voucher)', amount: -o.shipDisc, type: 'voucher' });
        const q = { store, mode: 'parcel', lines: o.lines.map(l => ({ id: l.id, name: l.name, variant: l.variant, qty: l.qty, price: l.price, total: l.total })), sub: o.sub, fees, discounts, discount: o.discount + o.shipDisc, total: o.total, km: o.km, loc: { id: g.addr.id, label: g.addr.label, city: g.addr.city }, ship: g.ship, voucher: null, totalQty: o.lines.reduce((s, l) => s + l.qty, 0), maxPrep: 0, age: g.age };
        const lbl = `${store.name}: ${q.lines.map(l => `${l.qty}× ${l.name}`).join(', ')}`;
        const t = addTx(v, { idem: `${b.idem}:${i}`, kind: 'belanja', status: cod ? 'pending' : 'berhasil', amount: -o.total, method: cod ? 'cod' : src.type === 'paylater' ? 'paylater' : (src.kind || pay), src: src.type === 'cash' ? 'cash' : src.type === 'paylater' ? 'paylater' : src.acct.id, merchant: m.id, label: cod ? lbl : `${lbl} · ${src.label}`, reason: cod ? 'Dibayar tunai saat pesanan diterima' : null, day: clk.day, sec: clk.sec });
        const srcJson = JSON.stringify(src.type === 'cash' ? { type: 'cash' } : src.type === 'paylater' ? { type: 'paylater', market: m.id } : { type: 'acct', id: src.acct.id });
        CM.insertOrder(p, q, { oid, idem: `${b.idem}:${i}`, clk, t, method: cod ? 'cod' : src.type === 'paylater' ? 'paylater' : (src.kind || pay), methodLabel: cod ? 'Bayar di tempat (COD)' : src.label, srcJson, payStatus: cod ? 'cod_pending' : 'paid' });
        db.prepare('INSERT INTO mp_order_meta (order_id, visitor, market, seller, group_id, cashback, svc_fee, vouchers) VALUES (?,?,?,?,?,?,?,?)').run(oid, v, m.id, o.seller.id, gid, o.cashback, o.svc, JSON.stringify(o.vouchers));
        if (src.type !== 'paylater' && !cod) { const a = applyDebit(p, src, o.total, clk, src.kind, 'belanja', lbl, t); if (a) adjs.push(a); }
        CM.notify(v, oid, 'paid', cod ? 'Pesanan dibuat (COD)' : 'Pembayaran berhasil', cod ? `${lbl}. Bayar tunai saat pesanan diterima.` : `${fmtRp(o.total)} dibayar lewat ${src.label}.`, clk.abs);
        created.push({ oid, t });
      });
      // voucher dipakai (dikurangi sekali per checkout) dan riwayat
      for (const code of new Set(g.vouchers.map(x => x.code))) { const r = db.prepare("UPDATE mp_vouchers SET uses_left=uses_left-1, status=CASE WHEN uses_left-1<=0 THEN 'used' ELSE status END WHERE visitor=? AND market=? AND code=? AND uses_left>0").run(v, m.id, code); if (!r.changes) throw Object.assign(new Error(), { user: `Voucher ${code} sudah habis dipakai.` }); }
      if (pl) {
        const lid = rid('loan'); db.prepare("INSERT INTO mp_pl_loans (id, visitor, market, group_id, principal, tenor, rate_month, fee, interest, total, created_day, status) VALUES (?,?,?,?,?,?,?,?,?,?,?,'aktif')").run(lid, v, m.id, gid, g.total, pl.tenor, m.paylater.rateMonth, pl.cost.fee, pl.cost.interest, pl.cost.total, clk.day);
        pl.cost.bills.forEach((bl, k) => db.prepare("INSERT INTO mp_pl_bills (id, visitor, market, loan, seq, of, due_day, principal, fee, interest, status) VALUES (?,?,?,?,?,?,?,?,?,?,'terbuka')").run(rid('bill'), v, m.id, lid, k + 1, pl.tenor, clk.day + 30 * (k + 1), bl.principal, bl.fee, bl.interest));
        db.prepare('UPDATE mp_paylater SET used=used+? WHERE visitor=? AND market=?').run(g.total, v, m.id);
        db.prepare('UPDATE mp_order_meta SET loan_id=? WHERE group_id=?').run(lid, gid);
        hist(v, m.id, clk.abs, 'paylater', `Belanja ${fmtRp(g.total)} dengan ${m.paylater.name} ${pl.tenor} bulan (total ${fmtRp(pl.cost.total)}).`);
      }
      hist(v, m.id, clk.abs, 'checkout', `Pesanan ${created.length} toko, total ${fmtRp(g.total)} (${src.label}).`);
      db.prepare('DELETE FROM mp_cart WHERE visitor=? AND market=? AND selected=1').run(v, m.id);
      const rows = created.map(x => CM.orderOut(db.prepare('SELECT * FROM shop_orders WHERE id=?').get(x.oid), clk.abs, true));
      out = { ...finView(p, clk.abs), ok: true, orders: rows, group: gid, total: g.total, paylater: pl ? { tenor: pl.tenor, total: pl.cost.total, perMonth: pl.cost.per } : null, cashAdj: adjs, msg: cod ? `Pesanan dibuat. Siapkan uang tunai saat paket tiba.` : pl ? `Pesanan dibuat dengan ${m.paylater.name}. Tagihan pertama jatuh tempo hari ke-${clk.day + 31}.` : `Pembayaran ${fmtRp(g.total)} berhasil. Pesanan dikonfirmasi — barang belum diterima.` };
      db.prepare('UPDATE shop_orders SET resp=? WHERE idem=? AND visitor=?').run(JSON.stringify(out), `${b.idem}:0`, v);
      setResp(created[0].t, out);
    })();
    res.status(out.ok === false ? 402 : 200).json(out);
  }), { clock: 'post' }));

  // ————————————————————————— kaitan ke mesin pesanan —————————————————————————
  // Pesanan selesai: cashback masuk (sekali), poin BelanjaPlus, riwayat akun.
  CM.hooks.complete.push(({ p, o, clk }) => {
    const meta = db.prepare('SELECT * FROM mp_order_meta WHERE order_id=?').get(o.id); if (!meta) return null; const m = M.MARKET(meta.market), adjs = [];
    if (meta.cashback > 0 && !meta.cashback_paid) {
      const r = db.prepare('UPDATE mp_order_meta SET cashback_paid=1 WHERE order_id=? AND cashback_paid=0').run(o.id);
      if (r.changes) { const t = addTx(p.visitor, { kind: 'cashback', status: 'berhasil', amount: meta.cashback, method: 'cashback', dst: 'cash', merchant: m.id, label: `Cashback ${m.name} (pesanan ${o.id})`, day: CM.dayOf(clk.abs), sec: CM.secOf(clk.abs) }); adjs.push(cashApply(p, meta.cashback, 'cashback', `Cashback ${m.name}`, t)); CM.notify(p.visitor, o.id, 'cashback', 'Cashback diterima', `${fmtRp(meta.cashback)} cashback ${m.name} masuk ke uang tunai.`, clk.abs); }
    }
    if (m.loyalty && !meta.points_done) { const r = db.prepare('UPDATE mp_order_meta SET points_done=1 WHERE order_id=? AND points_done=0').run(o.id); if (r.changes) { const pts = Math.floor((o.sub - 0) / 10000); db.prepare('INSERT INTO mp_points (visitor, points) VALUES (?,?) ON CONFLICT(visitor) DO UPDATE SET points=points+excluded.points').run(p.visitor, pts); hist(p.visitor, m.id, clk.abs, 'poin', `+${pts} poin Plus dari pesanan ${o.id}.`); } }
    hist(p.visitor, m.id, clk.abs, 'pesanan', `Pesanan ${o.id} diterima.`); return adjs;
  });
  // Pesanan batal/gagal/retur: kembalikan pemakaian voucher.
  CM.hooks.release.push((o, at) => {
    const meta = db.prepare('SELECT * FROM mp_order_meta WHERE order_id=?').get(o.id); if (!meta || meta.points_done === -1) return;
    for (const code of parse(meta.vouchers, [])) { const vc = M.VOUCHER(meta.market, code); const mine = db.prepare('SELECT * FROM mp_vouchers WHERE visitor=? AND market=? AND code=?').get(meta.visitor, meta.market, code); if (!vc || !mine) continue; if (mine.uses_left < vc.perUser && CM.dayOf(at) <= mine.expires_day) db.prepare("UPDATE mp_vouchers SET uses_left=uses_left+1, status='claimed' WHERE visitor=? AND market=? AND code=?").run(meta.visitor, meta.market, code); }
    db.prepare('UPDATE mp_order_meta SET points_done=CASE WHEN points_done=1 THEN 1 ELSE -1 END WHERE order_id=?').run(o.id);
  });
  // Refund pesanan yang dibayar PayLater: kurangi pokok yang belum dibayar; sisanya (yang sudah dibayar) kembali ke uang tunai.
  CM.hooks.paylaterRefund = (o, amount, at, txId) => {
    const meta = db.prepare('SELECT * FROM mp_order_meta WHERE order_id=?').get(o.id); if (!meta?.loan_id) return;
    const bills = db.prepare("SELECT * FROM mp_pl_bills WHERE loan=? AND status IN ('terbuka','telat') ORDER BY seq DESC").all(meta.loan_id); let left = amount, freed = 0;
    for (const b of bills) { if (left <= 0) break; const cut = Math.min(left, b.principal); const ratio = b.principal ? (b.principal - cut) / b.principal : 0; db.prepare('UPDATE mp_pl_bills SET principal=principal-?, fee=?, interest=? WHERE id=?').run(cut, Math.round(b.fee * ratio), Math.round(b.interest * ratio), b.id); left -= cut; freed += cut; if (b.principal - cut <= 0 && b.paid === 0) db.prepare("UPDATE mp_pl_bills SET status='lunas', paid_day=? WHERE id=?").run(CM.dayOf(at), b.id); }
    db.prepare('UPDATE mp_paylater SET used=MAX(0, used-?) WHERE visitor=? AND market=?').run(freed, meta.visitor, meta.market);
    if (!db.prepare("SELECT 1 FROM mp_pl_bills WHERE loan=? AND status<>'lunas'").get(meta.loan_id)) db.prepare("UPDATE mp_pl_loans SET status='lunas' WHERE id=?").run(meta.loan_id);
    if (left > 0) { const p = getPlayer(meta.visitor); if (p) cashApply(p, left, 'refund', `Pengembalian dana PayLater pesanan ${o.id}`, txId); }
    hist(meta.visitor, meta.market, at, 'paylater', `Refund ${fmtRp(amount)} pesanan ${o.id}: tagihan PayLater dikurangi.`);
  };

  return { migrate, reset };
};
