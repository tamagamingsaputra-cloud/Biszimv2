// SELLER CENTER (P6) — pemain menjadi penjual di marketplace BizSim.
// Prinsip: tidak ada sistem uang/pesanan kedua. Pembelian stok memakai debit Keuangan (tunai/rekening + PIN); hasil penjualan masuk lewat
// FINANCE.core.creditIn (ledger yang sama) hanya saat pesanan SELESAI. Pembeli adalah NPC yang dibangkitkan deterministik per hari simulasi
// (hash id+hari, bukan Math.random) dari harga, kualitas, reputasi toko, event, dan ekonomi dunia (mp-economy.cjs).
const crypto = require('crypto');
const M = require('./market-catalog.cjs');
const SHOP = require('./shop-catalog.cjs');
const ECON = require('./mp-economy.cjs');
const { hf } = M;

const DAY = 86400, WARM = 14, DOM = 20;
const parse = (t, d = null) => { if (t == null || t === '') return d; try { return JSON.parse(t); } catch { return d; } };
const fmtRp = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const clamp = ECON.clamp;
const dayOfAbs = abs => Math.floor(abs / DAY) - WARM;
const COMMISSION = { shopindo: 0.05, lazamall: 0.07, tokomart: 0.03, belanjaplus: 0.045 };
const FIRST = ['Adi', 'Bayu', 'Citra', 'Dewi', 'Eko', 'Fitri', 'Gita', 'Hadi', 'Indra', 'Joko', 'Kiki', 'Lina', 'Mira', 'Nanda', 'Oki', 'Putri', 'Rani', 'Sari', 'Tono', 'Umar', 'Vina', 'Wawan', 'Yuni', 'Zaki'];
const LAST = ['Santoso', 'Wijaya', 'Lestari', 'Pratama', 'Hidayat', 'Kusuma', 'Saputra', 'Rahayu', 'Nugroho', 'Permata', 'Setiawan', 'Maharani'];
const STATUS_LABEL = { baru: 'Pesanan baru', dikemas: 'Dikemas', dikirim: 'Dikirim', terkirim: 'Terkirim', selesai: 'Selesai', dibatalkan: 'Dibatalkan', retur: 'Pengembalian', refund: 'Dana dikembalikan' };
const OPEN = ['baru', 'dikemas', 'dikirim', 'terkirim', 'retur'];
const MAX_IMG = 180000; // panjang data URL maksimum (≈130 KB) — foto/logo disimpan di DB, bukan di disk (kompatibel Vercel)
const IMG_RE = /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/;

module.exports = function mountSeller(app, H, F, CM) {
  const { db, tx: dbTx, vid, rid, now, fail, getPlayer, ageAt } = H;
  const { resolveMethod, debitSource, applyDebit, checkPin, addTx, setResp, txRow, view: finView, idemOk, findIdem, acct, creditIn, nameOf, guard } = F;
  const hooks = { boost: () => 1, extra: null, after: null, onDone: [], onNew: [] };

  const SCHEMA = `
  CREATE TABLE IF NOT EXISTS sl_shops (visitor TEXT PRIMARY KEY, id TEXT, name TEXT, logo TEXT, descr TEXT, cat TEXT, city TEXT, address TEXT, payout TEXT, created_day INTEGER, created_abs INTEGER, rep REAL DEFAULT 60, rating REAL DEFAULT 0, rating_n INTEGER DEFAULT 0, cancels INTEGER DEFAULT 0, last_tick INTEGER DEFAULT 0, status TEXT DEFAULT 'aktif');
  CREATE TABLE IF NOT EXISTS sl_prods (id TEXT PRIMARY KEY, visitor TEXT, name TEXT, cat TEXT, sub TEXT, descr TEXT, brand TEXT, price INTEGER, promo INTEGER DEFAULT 0, cost INTEGER DEFAULT 0, stock INTEGER DEFAULT 0, weight_g INTEGER, dim TEXT, variants TEXT, cond TEXT, photo TEXT, markets TEXT, active INTEGER DEFAULT 1, deleted INTEGER DEFAULT 0, created_day INTEGER, sold INTEGER DEFAULT 0, rating REAL DEFAULT 0, rating_n INTEGER DEFAULT 0, nego INTEGER DEFAULT 0);
  CREATE TABLE IF NOT EXISTS sl_orders (id TEXT PRIMARY KEY, visitor TEXT, prod TEXT, name TEXT, variant TEXT, qty INTEGER, unit INTEGER, gross INTEGER, voucher INTEGER DEFAULT 0, fee INTEGER DEFAULT 0, cost INTEGER DEFAULT 0, market TEXT, buyer TEXT, city TEXT, status TEXT, courier TEXT, resi TEXT, source TEXT, ref TEXT, created_abs INTEGER, packed_abs INTEGER, ship_abs INTEGER, deliver_abs INTEGER, done_abs INTEGER, paid INTEGER DEFAULT 0, tx_id TEXT, shipfee INTEGER DEFAULT 0, note TEXT, ret TEXT);
  CREATE TABLE IF NOT EXISTS sl_vouchers (id TEXT PRIMARY KEY, visitor TEXT, code TEXT, kind TEXT, value INTEGER, min INTEGER DEFAULT 0, max INTEGER DEFAULT 0, quota INTEGER, used INTEGER DEFAULT 0, until_day INTEGER, active INTEGER DEFAULT 1, created_day INTEGER);
  CREATE TABLE IF NOT EXISTS sl_reviews (id TEXT PRIMARY KEY, visitor TEXT, order_id TEXT UNIQUE, prod TEXT, stars INTEGER, quality INTEGER, ship INTEGER, service INTEGER, text TEXT, buyer TEXT, abs INTEGER, reply TEXT);
  CREATE TABLE IF NOT EXISTS sl_events (id INTEGER PRIMARY KEY AUTOINCREMENT, visitor TEXT, order_id TEXT, abs INTEGER, code TEXT, text TEXT);`;
  const TABLES = ['sl_shops', 'sl_prods', 'sl_orders', 'sl_vouchers', 'sl_reviews', 'sl_events'];
  function migrate() {
    db.exec(SCHEMA);
    for (const ix of ['CREATE INDEX IF NOT EXISTS ix_sl_prods ON sl_prods (visitor, deleted)', 'CREATE INDEX IF NOT EXISTS ix_sl_orders ON sl_orders (visitor, status, created_abs)', 'CREATE INDEX IF NOT EXISTS ix_sl_rev ON sl_reviews (visitor, abs)', 'CREATE INDEX IF NOT EXISTS ix_sl_ev ON sl_events (order_id)']) { try { db.exec(ix); } catch { /* indeks opsional */ } }
  }
  const reset = v => { for (const t of TABLES) db.prepare(`DELETE FROM ${t} WHERE visitor=?`).run(v); };

  // ————————————————————————— bantu —————————————————————————
  const need = (req, res) => { const p = getPlayer(vid(req)); if (!p || !p.profile || !p.game) { fail(res, 'Profil atau save game belum ada.', 404); return null; } return p; };
  const clkOf = (req, p) => { const c = req.method === 'GET' ? { day: req.query.day, sec: req.query.sec } : (req.body?.clock || {}); return CM.absOfClock(p, c.day, c.sec); };
  const shopOf = v => db.prepare('SELECT * FROM sl_shops WHERE visitor=?').get(v);
  const ev = (v, oid, abs, code, text) => db.prepare('INSERT INTO sl_events (visitor, order_id, abs, code, text) VALUES (?,?,?,?,?)').run(v, oid, Math.round(abs), code, text);
  const notif = (v, oid, kind, title, body, abs) => CM.notify(v, oid, kind, title, body, abs);
  const str = (x, n) => String(x ?? '').replace(/[\u0000-\u001f<>]/g, ' ').trim().slice(0, n);
  const intIn = (x, a, b) => { const n = Math.floor(Number(x)); return Number.isFinite(n) && n >= a && n <= b ? n : null; };
  const img = x => { if (x == null || x === '') return ''; const s = String(x); if (s.length > MAX_IMG || !IMG_RE.test(s)) return null; return s; };
  const refPrice = (() => { const c = {}; return sub => { if (c[sub]) return c[sub]; const a = M.PRODUCTS.filter(p => p.sub === sub).map(p => p.price).sort((x, y) => x - y); return (c[sub] = a.length ? a[Math.floor(a.length / 2)] : 50000); }; })();
  const effPrice = p => (p.promo > 0 && p.promo < p.price ? p.promo : p.price);
  const quality = p => clamp(1.5 + 4 * (p.cost / Math.max(1, refPrice(p.sub))), 1, 5);
  const gameOf = p => p.game || {};

  // ————————————————————————— validasi toko & produk —————————————————————————
  function validShop(b, { partial = false } = {}) {
    const out = {}; const name = str(b.name, 40), descr = str(b.descr, 300), address = str(b.address, 120);
    if (!partial || b.name !== undefined) { if (name.length < 3) return { error: 'Nama toko minimal 3 karakter.' }; out.name = name; }
    if (!partial || b.descr !== undefined) out.descr = descr;
    if (!partial || b.cat !== undefined) { if (!M.CATEGORIES.some(c => c.id === b.cat)) return { error: 'Pilih kategori toko.' }; out.cat = b.cat; }
    if (!partial || b.city !== undefined) { if (!M.CITIES.includes(b.city)) return { error: 'Pilih kota lokasi toko.' }; out.city = b.city; }
    if (!partial || b.address !== undefined) { if (address.length < 5) return { error: 'Alamat toko minimal 5 karakter.' }; out.address = address; }
    if (b.logo !== undefined) { const l = img(b.logo); if (l === null) return { error: 'Logo harus PNG/JPEG/WebP dan maksimal ±130 KB.' }; out.logo = l; }
    return { out };
  }
  function validProd(b, { partial = false } = {}) {
    const o = {}, e = m => ({ error: m });
    if (!partial || b.name !== undefined) { const n = str(b.name, 80); if (n.length < 3) return e('Nama produk minimal 3 karakter.'); o.name = n; }
    if (!partial || b.sub !== undefined) { const s = M.SUBCAT[b.sub]; if (!s) return e('Pilih kategori produk.'); o.sub = s.id; o.cat = s.cat; }
    if (!partial || b.descr !== undefined) { const d = str(b.descr, 500); if (d.length < 10) return e('Deskripsi minimal 10 karakter.'); o.descr = d; }
    if (!partial || b.brand !== undefined) o.brand = str(b.brand, 40) || 'Tanpa merek';
    if (!partial || b.price !== undefined) { const x = intIn(b.price, 500, 500_000_000); if (x == null) return e('Harga tidak valid (Rp 500 – Rp 500 juta).'); o.price = x; }
    if (!partial || b.promo !== undefined) { const x = intIn(b.promo ?? 0, 0, 500_000_000); if (x == null) return e('Harga promosi tidak valid.'); o.promo = x; }
    if (!partial || b.cost !== undefined) { const x = intIn(b.cost, 0, 500_000_000); if (x == null) return e('Harga modal tidak valid.'); o.cost = x; }
    if (!partial || b.weight !== undefined) { const x = intIn(b.weight, 1, 300000); if (x == null) return e('Berat 1–300.000 gram.'); o.weight_g = x; }
    if (!partial || b.dim !== undefined) { const d = str(b.dim, 30); if (!/^\d{1,3}\s*[x×]\s*\d{1,3}\s*[x×]\s*\d{1,3}$/i.test(d)) return e('Dimensi dengan format p×l×t cm, mis. 20×10×5.'); o.dim = d.replace(/\s/g, '').replace(/x/gi, '×'); }
    if (!partial || b.cond !== undefined) { if (!['baru', 'bekas'].includes(b.cond)) return e('Kondisi barang: baru atau bekas.'); o.cond = b.cond; }
    if (!partial || b.variants !== undefined) { const v = Array.isArray(b.variants) ? b.variants.slice(0, 6).map(x => ({ label: str(x.label, 30), price: intIn(x.price ?? 0, 0, 100_000_000) })).filter(x => x.label) : []; if (v.some(x => x.price == null)) return e('Harga variasi tidak valid.'); o.variants = JSON.stringify(v); }
    if (!partial || b.markets !== undefined) { const m = [...new Set((Array.isArray(b.markets) ? b.markets : []).filter(x => M.MARKET(x)))]; if (!m.length) return e('Pilih minimal satu marketplace.'); o.markets = JSON.stringify(m); }
    if (b.photo !== undefined) { const x = img(b.photo); if (x === null) return e('Foto harus PNG/JPEG/WebP dan maksimal ±130 KB.'); o.photo = x; }
    if (b.nego !== undefined) o.nego = b.nego ? 1 : 0;
    const price = o.price ?? b.curPrice, promo = o.promo ?? b.curPromo, cost = o.cost ?? b.curCost;
    if (price != null && promo != null && promo !== 0 && promo >= price) return e('Harga promosi harus lebih kecil dari harga normal.');
    if (price != null && cost != null && cost > price * 1.5) return e('Harga modal tidak masuk akal dibanding harga jual.');
    return { out: o };
  }
  const prodOut = p => ({ id: p.id, name: p.name, cat: p.cat, sub: p.sub, descr: p.descr, brand: p.brand, price: p.price, promo: p.promo, cost: p.cost, stock: p.stock, weight: p.weight_g, dim: p.dim, cond: p.cond, photo: p.photo || null, markets: parse(p.markets, []), variants: parse(p.variants, []), active: !!p.active, sold: p.sold, rating: p.rating_n ? Math.round(p.rating * 10) / 10 : null, ratingN: p.rating_n, nego: !!p.nego, quality: Math.round(quality(p) * 10) / 10, ref: refPrice(p.sub), createdDay: p.created_day });

  // ————————————————————————— pembayaran stok (debit Keuangan) —————————————————————————
  function fundSrc(v, method, sourceId) {
    if (method === 'cash') return { type: 'cash', label: 'Uang tunai' };
    const a = sourceId ? acct(v, sourceId) : null; if (!a) return { error: 'Pilih sumber dana.' }; if (a.status !== 'aktif') return { error: `${nameOf(a)} sedang tidak aktif.` };
    if (!['bank', 'wallet'].includes(a.kind)) return { error: 'Pilih rekening bank atau dompet digital.' };
    return { type: 'acct', acct: a, kind: 'saldo', label: `Saldo ${nameOf(a)}` };
  }
  // Membeli stok dari pemasok: debit atomik. Mengembalikan { error } atau { tx }.
  function payStock(p, clk, b, amount, label, idemKey) {
    const v = p.visitor; if (amount <= 0) return { tx: null };
    const src = fundSrc(v, b.method === 'cash' ? 'cash' : 'saldo', b.source); if (src.error) return { error: src.error };
    if (src.type === 'acct') { const pe = checkPin(v, b.pin); if (pe) return { error: pe }; }
    const err = debitSource(p, src, amount, clk, src.kind); if (err) return { error: err };
    const t = addTx(v, { idem: idemKey, kind: 'belanja', status: 'berhasil', amount: -amount, method: src.type === 'cash' ? 'cash' : 'saldo', src: src.type === 'cash' ? 'cash' : src.acct.id, merchant: 'pemasok', label: `${label} · ${src.label}`, day: clk.day, sec: clk.sec });
    applyDebit(p, src, amount, clk, src.kind, 'belanja', label, t);
    return { tx: t };
  }

  // ————————————————————————— simulasi pembeli NPC —————————————————————————
  const poisson = (lambda, u) => { let k = 0, pk = Math.exp(-lambda), cdf = pk; while (u > cdf && k < 30) { k++; pk *= lambda / k; cdf += pk; } return k; };
  const kmTo = (a, b) => SHOP.distanceKm(a, b);
  function demandFor(pr, shop, day, econ, stats, volBoost) {
    const markets = parse(pr.markets, []); if (!markets.length || pr.stock <= 0 || !pr.active || pr.deleted) return { lambda: 0, per: {} };
    const ref = refPrice(pr.sub), pm = ECON.priceMult({ market: markets[0] }, { sub: pr.sub, cat: pr.cat }, day, econ, null).mult;
    const priceF = clamp(Math.pow(ref * pm / Math.max(500, effPrice(pr)), 1.3), 0.08, 2.5);
    const q = quality(pr), qualF = 0.55 + 0.9 * ((pr.rating_n >= 3 ? pr.rating : q) / 5), condF = pr.cond === 'bekas' ? 0.7 : 1;
    const age = Math.max(0, day - shop.created_day), vis = 0.45 + Math.min(0.55, age / 60), repF = 0.5 + shop.rep / 100;
    const per = {}; let sum = 0;
    for (const m of markets) { const st = stats.find(s => s.id === m); const e = ECON.eventEffect(day, m, pr.cat).demand; per[m] = (st ? st.share * 4 : 1) * e * (1 + 0.05 * (ECON.supplyWave(pr.sub, day) < 0 ? 1 : 0)); sum += per[m]; }
    const catF = 0.55 + 0.45 * hf('catpop', pr.cat);
    const lambda = 1.6 * sum * priceF * qualF * condF * vis * repF * catF * econ.consumer * volBoost;
    return { lambda: clamp(lambda, 0, 14), per };
  }
  const buyerName = (...k) => `${FIRST[Math.floor(hf(...k, 'f') * FIRST.length)]} ${LAST[Math.floor(hf(...k, 'l') * LAST.length)]}`;
  function sellerVoucherFor(v, gross, day) {
    const vc = db.prepare("SELECT * FROM sl_vouchers WHERE visitor=? AND active=1 AND used<quota AND until_day>=? AND min<=? ORDER BY value DESC LIMIT 1").get(v, day, gross); if (!vc) return null;
    const d = vc.kind === 'percent' ? Math.min(vc.max || Infinity, Math.round(gross * vc.value / 100)) : vc.value; return { vc, d: Math.min(d, gross) };
  }
  // Membangkitkan pesanan masuk untuk hari-hari yang belum diproses (idempoten: id deterministik, INSERT OR IGNORE).
  function genOrders(p, shop, abs) {
    const v = p.visitor, today = dayOfAbs(abs), from = Math.max(shop.last_tick + 1, shop.created_day + 1, today - 4); if (from > today) return 0; // hari yang terlewat lebih dari 4 hari = pembeli beralih ke toko lain (tanpa penalti)
    const econ = ECON.econOf(gameOf(p)); let made = 0;
    for (let d = from; d <= today; d++) {
      const stats = ECON.marketStats(d, econ); const prods = db.prepare('SELECT * FROM sl_prods WHERE visitor=? AND deleted=0 AND active=1 AND stock>0').all(v);
      for (const pr of prods) {
        if (d <= pr.created_day) continue;
        const dm = demandFor(pr, shop, d, econ, stats, hooks.boost(v, pr.id, d, abs));
        let n = poisson(dm.lambda, hf(pr.id, d, 'n')); let stock = db.prepare('SELECT stock FROM sl_prods WHERE id=?').get(pr.id).stock;
        for (let k = 0; k < n && stock > 0; k++) {
          const id = `slo-${pr.id}-${d}-${k}`; const vars = parse(pr.variants, []); const vi = vars.length ? Math.floor(hf(id, 'v') * (vars.length + 1)) : 0, vr = vars.length && vi ? vars[vi - 1] : null;
          const qty = Math.min(stock, hf(id, 'q') < 0.65 ? 1 : hf(id, 'q') < 0.9 ? 2 : 3);
          const unit = effPrice(pr) + (vr ? vr.price : 0), gross = unit * qty;
          const mk = Object.keys(dm.per); let r = hf(id, 'm') * mk.reduce((s, m) => s + dm.per[m], 0), market = mk[0]; for (const m of mk) { if ((r -= dm.per[m]) <= 0) { market = m; break; } }
          const vch = hf(id, 'vc') < 0.4 ? sellerVoucherFor(v, gross, d) : null;
          const fee = Math.round((gross - (vch ? vch.d : 0)) * COMMISSION[market]);
          const at = (d + WARM) * DAY + Math.round((8 + hf(id, 't') * 14) * 3600);
          const city = M.CITIES[Math.floor(hf(id, 'c') * M.CITIES.length)];
          const r0 = db.prepare("INSERT OR IGNORE INTO sl_orders (id, visitor, prod, name, variant, qty, unit, gross, voucher, fee, cost, market, buyer, city, status, source, created_abs) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,'baru',?,?)")
            .run(id, v, pr.id, pr.name, vr ? vr.label : null, qty, unit, gross, vch ? vch.d : 0, fee, pr.cost * qty, market, buyerName(id), city, dm.per && hooks.boost(v, pr.id, d, abs) > 1.01 ? 'promosi' : 'organik', at);
          if (!r0.changes) { stock = db.prepare('SELECT stock FROM sl_prods WHERE id=?').get(pr.id).stock; continue; }
          db.prepare('UPDATE sl_prods SET stock=stock-?, sold=sold+? WHERE id=?').run(qty, qty, pr.id); stock -= qty;
          if (vch) db.prepare('UPDATE sl_vouchers SET used=used+1 WHERE id=?').run(vch.vc.id);
          ev(v, id, at, 'baru', `Pesanan dari ${buyerName(id)} via ${M.MARKET(market).name}.`); made++;
          if (today - d <= 2) notif(v, id, 'sl_new', 'Pesanan toko baru', `${qty}× ${pr.name} dari ${buyerName(id)} (${M.MARKET(market).name}). Proses dan kirim dalam 5 hari.`, at);
        }
      }
    }
    db.prepare('UPDATE sl_shops SET last_tick=? WHERE visitor=?').run(today, v); return made;
  }
  const SLA = 5 * DAY;
  const dlvDays = (city, shopCity, cr, ship) => Math.max(1, Math.ceil((kmTo(shopCity, city) === 0 ? 1 : Math.ceil(kmTo(shopCity, city) / 250) + 1) * cr.speed));
  // Memajukan siklus pesanan berdasarkan waktu simulasi: SLA kirim → terkirim → selesai (+ulasan, pembayaran masuk ke Keuangan).
  function advance(p, shop, abs) {
    const v = p.visitor; let capRep = 0;
    const rows = db.prepare("SELECT * FROM sl_orders WHERE visitor=? AND status IN ('baru','dikemas','dikirim','terkirim') ORDER BY created_abs").all(v);
    for (const o of rows) {
      let cur = o;
      if (['baru', 'dikemas'].includes(cur.status) && abs >= cur.created_abs + SLA) {
        dbTx(() => { db.prepare("UPDATE sl_orders SET status='dibatalkan', done_abs=?, note='Penjual tidak mengirim tepat waktu' WHERE id=? AND status IN ('baru','dikemas')").run(cur.created_abs + SLA, cur.id); db.prepare('UPDATE sl_prods SET stock=stock+?, sold=MAX(0,sold-?) WHERE id=?').run(cur.qty, cur.qty, cur.prod);
          if (capRep < 8) { db.prepare('UPDATE sl_shops SET rep=MAX(5, rep-2), cancels=cancels+1 WHERE visitor=?').run(v); capRep += 2; } else db.prepare('UPDATE sl_shops SET cancels=cancels+1 WHERE visitor=?').run(v);
          ev(v, cur.id, cur.created_abs + SLA, 'dibatalkan', 'Dibatalkan otomatis: batas kirim 5 hari terlewat.'); notif(v, cur.id, 'sl_cancel', 'Pesanan dibatalkan', `${cur.qty}× ${cur.name} dibatalkan karena tidak dikirim tepat waktu. Reputasi toko turun.`, cur.created_abs + SLA); })();
        continue;
      }
      if (cur.status === 'dikirim' && abs >= cur.deliver_abs) {
        const cr = M.COURIER(cur.courier) || M.COURIER('jnex');
        if (hf(cur.id, 'fail') < 0.02 * cr.fail) { dbTx(() => { db.prepare("UPDATE sl_orders SET status='dibatalkan', done_abs=?, note='Paket gagal dikirim ekspedisi' WHERE id=? AND status='dikirim'").run(cur.deliver_abs, cur.id); db.prepare('UPDATE sl_prods SET stock=stock+?, sold=MAX(0,sold-?) WHERE id=?').run(cur.qty, cur.qty, cur.prod); ev(v, cur.id, cur.deliver_abs, 'gagal', 'Paket hilang/rusak di ekspedisi — pembeli dikembalikan dananya oleh marketplace.'); notif(v, cur.id, 'sl_cancel', 'Paket gagal dikirim', `${cur.name}: ${cr.name} gagal mengirim. Stok dikembalikan.`, cur.deliver_abs); })(); continue; }
        db.prepare("UPDATE sl_orders SET status='terkirim' WHERE id=? AND status='dikirim'").run(cur.id); ev(v, cur.id, cur.deliver_abs, 'terkirim', 'Paket tiba di pembeli.'); cur = { ...cur, status: 'terkirim' };
      }
      if (cur.status === 'terkirim' && abs >= cur.deliver_abs + DAY) completeOrder(p, shop, cur, cur.deliver_abs + DAY);
    }
  }
  // Selesai: pembeli mengonfirmasi (atau otomatis 1 hari setelah tiba). Dana masuk ke Keuangan sekali (idem), reputasi/rating diperbarui.
  function completeOrder(p, shop, o, at, force = false) {
    const v = p.visitor, pr = db.prepare('SELECT * FROM sl_prods WHERE id=?').get(o.prod), cr = M.COURIER(o.courier) || M.COURIER('jnex');
    const retP = clamp(0.025 + (pr && pr.cond === 'bekas' ? 0.04 : 0) + (pr ? (5 - quality(pr)) * 0.012 : 0.02) + (cr.fail - 1) * 0.02 + (pr && effPrice(pr) < refPrice(pr.sub) * 0.5 ? 0.03 : 0), 0.01, 0.2);
    if (!force && hf(o.id, 'ret') < retP) {
      const reasons = ['rusak', 'salah', 'tidak_sesuai', 'tidak_lengkap']; const reason = reasons[Math.floor(hf(o.id, 'rr') * reasons.length)];
      dbTx(() => { const r0 = db.prepare("UPDATE sl_orders SET status='retur', ret=? WHERE id=? AND status='terkirim'").run(JSON.stringify({ reason, stage: 'diajukan', at, history: [{ at, stage: 'diajukan', text: `Pembeli mengajukan pengembalian: ${RET_LABEL[reason]}.` }] }), o.id); if (r0.changes) { ev(v, o.id, at, 'retur', `Pembeli mengajukan pengembalian: ${RET_LABEL[reason]}.`); notif(v, o.id, 'sl_return', 'Pengajuan pengembalian', `${o.name}: ${RET_LABEL[reason]}. Tanggapi di Seller Center.`, at); } })(); return;
    }
    const day = dayOfAbs(at), sec = ((at % DAY) + DAY) % DAY, net = o.gross - o.voucher - o.fee;
    dbTx(() => {
      const r0 = db.prepare("UPDATE sl_orders SET status='selesai', done_abs=? WHERE id=? AND status='terkirim'").run(at, o.id); if (!r0.changes) return;
      const c = creditIn(p, { amount: net, idem: 'slp:' + o.id, kind: 'penjualan', merchant: o.market, label: `Penjualan ${o.qty}× ${o.name} (${M.MARKET(o.market).name})`, account: shop.payout, day, sec });
      if (c.error) throw new Error(c.error); db.prepare('UPDATE sl_orders SET paid=?, tx_id=? WHERE id=?').run(net, c.id || null, o.id);
      ev(v, o.id, at, 'selesai', `Selesai. ${fmtRp(net)} masuk ke ${shop.payout && shop.payout !== 'cash' ? 'rekening' : 'uang tunai'} (setelah biaya ${M.MARKET(o.market).name} ${fmtRp(o.fee)}).`);
      notif(v, o.id, 'sl_done', 'Penjualan berhasil', `${o.qty}× ${o.name}: ${fmtRp(net)} masuk ke Keuangan.`, at);
      db.prepare('UPDATE sl_shops SET rep=MIN(100, rep+0.6) WHERE visitor=?').run(v);
      makeReview(v, shop, o, pr, at);
      for (const h of hooks.onDone) h(p, o, at);
    })();
  }
  const RET_LABEL = { rusak: 'barang rusak', salah: 'barang salah', tidak_sesuai: 'tidak sesuai deskripsi', tidak_lengkap: 'barang tidak lengkap', tidak_diterima: 'barang tidak diterima' };
  const TXT_GOOD = ['Barang sesuai deskripsi, pengemasan rapi.', 'Pengiriman cepat dan penjual responsif.', 'Kualitas bagus untuk harganya.', 'Sesuai harapan, puas berbelanja.'];
  const TXT_MID = ['Barang lumayan, pengiriman agak lama.', 'Kualitas standar, sesuai harga.', 'Cukup baik, bisa ditingkatkan.'];
  const TXT_BAD = ['Kualitas kurang sesuai harapan.', 'Barang tidak seperti di deskripsi.', 'Pengiriman lama dan kemasan kurang rapi.'];
  function makeReview(v, shop, o, pr, at) {
    if (hf(o.id, 'rv') > 0.55) return; const q = pr ? quality(pr) : 3, cr = M.COURIER(o.courier) || M.COURIER('jnex'), late = o.deliver_abs - (o.ship_abs || o.created_abs) > 4 * DAY;
    const qs = clamp(Math.round(q + (hf(o.id, 'rq') - 0.5) * 1.6), 1, 5), ss = clamp(Math.round(cr.q + 0.4 - (late ? 1 : 0) + (hf(o.id, 'rs') - 0.5)), 1, 5), vs = clamp(Math.round(3 + shop.rep / 40 + (hf(o.id, 'rv2') - 0.5)), 1, 5);
    const stars = clamp(Math.round(qs * 0.5 + ss * 0.25 + vs * 0.25), 1, 5), pool = stars >= 4 ? TXT_GOOD : stars === 3 ? TXT_MID : TXT_BAD;
    db.prepare('INSERT OR IGNORE INTO sl_reviews (id, visitor, order_id, prod, stars, quality, ship, service, text, buyer, abs) VALUES (?,?,?,?,?,?,?,?,?,?,?)').run('rv-' + o.id, v, o.id, o.prod, stars, qs, ss, vs, pool[Math.floor(hf(o.id, 'rt') * pool.length)], o.buyer, at);
    db.prepare('UPDATE sl_shops SET rating=(rating*rating_n+?)/(rating_n+1), rating_n=rating_n+1, rep=MAX(5,MIN(100,rep+?)) WHERE visitor=?').run(stars, (stars - 3) * 0.4, v);
    if (pr) db.prepare('UPDATE sl_prods SET rating=(rating*rating_n+?)/(rating_n+1), rating_n=rating_n+1 WHERE id=?').run(stars, pr.id);
  }
  function refresh(p, abs) { const shop = shopOf(p.visitor); if (!shop) return null; dbTx(() => { genOrders(p, shop, abs); if (hooks.extra) hooks.extra(p, shop, abs); })(); advance(p, shop, abs); if (hooks.after) dbTx(() => hooks.after(p, shopOf(p.visitor), abs))(); return shopOf(p.visitor); }

  // ————————————————————————— rute —————————————————————————
  const handle = (fn, { post = false, shop = true } = {}) => (req, res) => {
    try { const p = need(req, res); if (!p) return; const clk = clkOf(req, p); if (clk.error) return fail(res, clk.error);
      const s = shop ? refresh(p, clk.abs) : null; if (shop && !s) return fail(res, 'Buka toko terlebih dahulu di Seller Center.', 404, { code: 'sl-noshop' });
      fn({ p, v: p.visitor, clk, shop: s, req, res }); } catch (e) { if (e.user) return fail(res, e.user, e.code || 400); console.error('[seller]', e); fail(res, 'Kesalahan server Seller Center.', 500); }
  };
  const ageOk = (p, clk) => ageAt(p.profile, clk.day) >= 17;
  app.get('/api/sell/me', handle(({ p, v, clk, res }) => {
    const shop = shopOf(v) ? refresh(p, clk.abs) : null;
    const fin = finView(p, clk.abs);
    res.json({ ok: true, shop: shop ? shopOut(shop) : null, canOpen: ageOk(p, clk), minAge: 17, categories: M.CATEGORIES, cities: M.CITIES, commission: COMMISSION, couriers: M.COURIERS.map(c => ({ id: c.id, name: c.name })), accounts: (fin.accounts || []).filter(a => ['bank', 'wallet'].includes(a.kind) && a.status === 'aktif').map(a => ({ id: a.id, label: nameOf(a), kind: a.kind })), markets: M.MARKETS.map(m => ({ id: m.id, name: m.name, color: m.color, commission: COMMISSION[m.id] })) });
  }, { shop: false }));
  const shopOut = s => ({ id: s.id, name: s.name, logo: s.logo || null, descr: s.descr, cat: s.cat, city: s.city, address: s.address, payout: s.payout, rep: Math.round(s.rep), rating: s.rating_n ? Math.round(s.rating * 10) / 10 : null, ratingN: s.rating_n, createdDay: s.created_day, status: s.status });
  app.post('/api/sell/shop', guard((req, res) => {
    try { const p = need(req, res); if (!p) return; const clk = clkOf(req, p); if (clk.error) return fail(res, clk.error); const v = p.visitor, b = req.body || {}, ex = shopOf(v);
      if (!ageOk(p, clk)) return fail(res, 'Pembuka toko minimal berusia 17 tahun.');
      const r = validShop(b, { partial: !!ex }); if (r.error) return fail(res, r.error);
      let payout = ex ? ex.payout : 'cash'; if (b.payout !== undefined) { if (b.payout === 'cash') payout = 'cash'; else { const a = acct(v, b.payout); if (!a || !['bank', 'wallet'].includes(a.kind) || a.status !== 'aktif') return fail(res, 'Rekening pencairan tidak valid.'); payout = a.id; } }
      if (!ex) { const o = r.out; db.prepare('INSERT INTO sl_shops (visitor, id, name, logo, descr, cat, city, address, payout, created_day, created_abs, last_tick) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)').run(v, rid('shop'), o.name, o.logo || '', o.descr || '', o.cat, o.city, o.address, payout, clk.day, clk.abs, clk.day); }
      else { const o = { ...r.out, payout }; const ks = Object.keys(o); if (ks.length) db.prepare(`UPDATE sl_shops SET ${ks.map(k => k + '=?').join(',')} WHERE visitor=?`).run(...ks.map(k => o[k]), v); }
      res.json({ ok: true, shop: shopOut(shopOf(v)), msg: ex ? 'Toko diperbarui.' : 'Toko dibuka. Unggah produk pertamamu.' });
    } catch (e) { console.error('[seller]', e); fail(res, 'Kesalahan server Seller Center.', 500); }
  }));
  // Produk
  app.get('/api/sell/products', handle(({ v, res }) => { res.json({ ok: true, items: db.prepare('SELECT * FROM sl_prods WHERE visitor=? AND deleted=0 ORDER BY created_day DESC, rowid DESC').all(v).map(prodOut) }); }));
  app.post('/api/sell/product', guard(handle(({ p, v, clk, shop, req, res }) => {
    const b = req.body || {}; if (!idemOk(b.idem)) throw Object.assign(new Error(), { user: 'Kunci transaksi tidak valid.' });
    const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const r = validProd(b); if (r.error) throw Object.assign(new Error(), { user: r.error }); const o = r.out;
    const count = db.prepare('SELECT COUNT(*) AS n FROM sl_prods WHERE visitor=? AND deleted=0').get(v).n; if (count >= 40) throw Object.assign(new Error(), { user: 'Maksimal 40 produk aktif per toko.' });
    const stock = intIn(b.stock ?? 0, 0, 5000); if (stock == null) throw Object.assign(new Error(), { user: 'Stok awal 0–5.000.' });
    const id = rid('sp'); let out;
    dbTx(() => {
      let txId = null; if (stock > 0 && o.cost > 0) { const pay = payStock(p, clk, b, stock * o.cost, `Beli stok ${o.name} (${stock})`, b.idem); if (pay.error) throw Object.assign(new Error(), { user: pay.error }); txId = pay.tx; }
      else if (stock > 0) { /* modal 0 = stok tanpa biaya (mis. barang sendiri) */ txId = addTx(v, { idem: b.idem, kind: 'stok', status: 'berhasil', amount: 0, label: `Stok awal ${o.name}`, day: clk.day, sec: clk.sec }); }
      else txId = addTx(v, { idem: b.idem, kind: 'stok', status: 'berhasil', amount: 0, label: `Produk baru ${o.name}`, day: clk.day, sec: clk.sec });
      db.prepare('INSERT INTO sl_prods (id, visitor, name, cat, sub, descr, brand, price, promo, cost, stock, weight_g, dim, variants, cond, photo, markets, active, created_day, nego) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?,?)').run(id, v, o.name, o.cat, o.sub, o.descr, o.brand, o.price, o.promo || 0, o.cost, stock, o.weight_g, o.dim, o.variants || '[]', o.cond, o.photo || '', o.markets, clk.day, o.nego || 0);
      out = { ...finView(p, clk.abs), ok: true, item: prodOut(db.prepare('SELECT * FROM sl_prods WHERE id=?').get(id)), msg: `${o.name} ditayangkan di ${parse(o.markets, []).length} marketplace.` }; setResp(txId, out);
    })();
    res.json(out);
  })));
  const ownProd = (v, id) => { const r = db.prepare('SELECT * FROM sl_prods WHERE id=? AND visitor=? AND deleted=0').get(id, v); if (!r) throw Object.assign(new Error(), { user: 'Produk tidak ditemukan.', code: 404 }); return r; };
  app.post('/api/sell/product/:id', handle(({ v, req, res }) => {
    const pr = ownProd(v, req.params.id), b = { ...(req.body || {}), curPrice: pr.price, curPromo: pr.promo, curCost: pr.cost };
    const r = validProd(b, { partial: true }); if (r.error) throw Object.assign(new Error(), { user: r.error }); const ks = Object.keys(r.out);
    if (!ks.length) throw Object.assign(new Error(), { user: 'Tidak ada perubahan.' });
    db.prepare(`UPDATE sl_prods SET ${ks.map(k => k + '=?').join(',')} WHERE id=?`).run(...ks.map(k => r.out[k]), pr.id);
    res.json({ ok: true, item: prodOut(db.prepare('SELECT * FROM sl_prods WHERE id=?').get(pr.id)), msg: 'Produk diperbarui.' });
  }));
  app.post('/api/sell/product/:id/toggle', handle(({ v, req, res }) => { const pr = ownProd(v, req.params.id), on = pr.active ? 0 : 1; db.prepare('UPDATE sl_prods SET active=? WHERE id=?').run(on, pr.id); res.json({ ok: true, active: !!on, msg: on ? 'Produk diaktifkan.' : 'Produk dinonaktifkan.' }); }));
  app.post('/api/sell/product/:id/delete', handle(({ v, req, res }) => {
    const pr = ownProd(v, req.params.id); const open = db.prepare("SELECT COUNT(*) AS n FROM sl_orders WHERE prod=? AND status IN ('baru','dikemas','dikirim','terkirim','retur')").get(pr.id).n;
    if (open) throw Object.assign(new Error(), { user: `Masih ada ${open} pesanan berjalan untuk produk ini. Selesaikan dulu atau nonaktifkan produk.` });
    db.prepare('UPDATE sl_prods SET deleted=1, active=0 WHERE id=?').run(pr.id); res.json({ ok: true, msg: 'Produk dihapus. Riwayat penjualan tetap tersimpan.' });
  }));
  // Perbarui stok: tambah (beli dari pemasok, debit Keuangan) atau koreksi turun (tanpa refund).
  app.post('/api/sell/product/:id/stock', guard(handle(({ p, v, clk, req, res }) => {
    const b = req.body || {}, pr = ownProd(v, req.params.id); if (!idemOk(b.idem)) throw Object.assign(new Error(), { user: 'Kunci transaksi tidak valid.' });
    const dup = findIdem(v, b.idem); if (dup) return res.json({ ...dup, duplicate: true });
    const add = intIn(b.add ?? 0, 0, 5000), cut = intIn(b.cut ?? 0, 0, 5000); if (add == null || cut == null || (!add && !cut)) throw Object.assign(new Error(), { user: 'Isi jumlah tambah atau kurangi stok (0–5.000).' });
    if (add && cut) throw Object.assign(new Error(), { user: 'Pilih tambah atau kurangi, tidak keduanya.' });
    if (cut > pr.stock) throw Object.assign(new Error(), { user: `Stok hanya ${pr.stock}.` }); if (pr.stock + add > 20000) throw Object.assign(new Error(), { user: 'Stok maksimal 20.000.' });
    let out; dbTx(() => {
      let txId; if (add) { if (pr.cost > 0) { const pay = payStock(p, clk, b, add * pr.cost, `Beli stok ${pr.name} (+${add})`, b.idem); if (pay.error) throw Object.assign(new Error(), { user: pay.error }); txId = pay.tx; } else txId = addTx(v, { idem: b.idem, kind: 'stok', status: 'berhasil', amount: 0, label: `Tambah stok ${pr.name} (+${add})`, day: clk.day, sec: clk.sec }); }
      else txId = addTx(v, { idem: b.idem, kind: 'stok', status: 'berhasil', amount: 0, label: `Koreksi stok ${pr.name} (−${cut})`, day: clk.day, sec: clk.sec });
      const r0 = db.prepare('UPDATE sl_prods SET stock=stock+? WHERE id=? AND stock+?>=0').run(add - cut, pr.id, add - cut); if (!r0.changes) throw Object.assign(new Error(), { user: 'Stok berubah, coba lagi.' });
      out = { ...finView(p, clk.abs), ok: true, item: prodOut(db.prepare('SELECT * FROM sl_prods WHERE id=?').get(pr.id)), msg: add ? `Stok +${add} (${add * pr.cost ? fmtRp(add * pr.cost) : 'tanpa biaya'}).` : `Stok −${cut}.` }; setResp(txId, out);
    })(); res.json(out);
  })));
  // Pesanan
  const orderOut = (o, abs) => ({ id: o.id, prod: o.prod, name: o.name, variant: o.variant, qty: o.qty, unit: o.unit, gross: o.gross, voucher: o.voucher, fee: o.fee, net: o.gross - o.voucher - o.fee, cost: o.cost, profit: o.gross - o.voucher - o.fee - o.cost, market: o.market, marketName: M.MARKET(o.market)?.name, buyer: o.buyer, city: o.city, status: o.status, statusLabel: STATUS_LABEL[o.status] || o.status, courier: o.courier, courierName: M.COURIER(o.courier)?.name || null, resi: o.resi, source: o.source, createdAbs: o.created_abs, shipAbs: o.ship_abs, deliverAbs: o.deliver_abs, doneAbs: o.done_abs, paid: o.paid, deadline: ['baru', 'dikemas'].includes(o.status) ? o.created_abs + SLA : null, note: o.note, ret: parse(o.ret, null) });
  app.get('/api/sell/orders', handle(({ v, clk, req, res }) => {
    const st = String(req.query.status || ''); const rows = (st && STATUS_LABEL[st] ? db.prepare('SELECT * FROM sl_orders WHERE visitor=? AND status=? ORDER BY created_abs DESC LIMIT 120').all(v, st) : db.prepare('SELECT * FROM sl_orders WHERE visitor=? ORDER BY created_abs DESC LIMIT 120').all(v));
    const counts = Object.fromEntries(db.prepare('SELECT status, COUNT(*) AS n FROM sl_orders WHERE visitor=? GROUP BY status').all(v).map(r => [r.status, r.n]));
    res.json({ ok: true, orders: rows.map(o => orderOut(o, clk.abs)), counts });
  }));
  app.get('/api/sell/order/:id', handle(({ v, clk, req, res }) => {
    const o = db.prepare('SELECT * FROM sl_orders WHERE id=? AND visitor=?').get(req.params.id, v); if (!o) throw Object.assign(new Error(), { user: 'Pesanan tidak ditemukan.', code: 404 });
    res.json({ ok: true, order: orderOut(o, clk.abs), events: db.prepare('SELECT abs, code, text FROM sl_events WHERE order_id=? ORDER BY abs, id').all(o.id) });
  }));
  const ownOrder = (v, id) => { const o = db.prepare('SELECT * FROM sl_orders WHERE id=? AND visitor=?').get(id, v); if (!o) throw Object.assign(new Error(), { user: 'Pesanan tidak ditemukan.', code: 404 }); return o; };
  app.post('/api/sell/order/:id/pack', handle(({ v, clk, req, res }) => {
    const o = ownOrder(v, req.params.id); if (o.status !== 'baru') throw Object.assign(new Error(), { user: 'Hanya pesanan baru yang bisa dikemas.' });
    const r0 = db.prepare("UPDATE sl_orders SET status='dikemas', packed_abs=? WHERE id=? AND status='baru'").run(clk.abs, o.id); if (r0.changes) ev(v, o.id, clk.abs, 'dikemas', 'Pesanan dikemas oleh penjual.');
    res.json({ ok: true, msg: 'Pesanan dikemas. Pilih ekspedisi untuk mengirim.' });
  }));
  // Ongkir ditanggung pembeli; ekspedisi memengaruhi kecepatan, risiko gagal kirim, dan nilai pengiriman pada ulasan.
  app.post('/api/sell/order/:id/ship', handle(({ v, shop, clk, req, res }) => {
    const o = ownOrder(v, req.params.id), cr = M.COURIER(req.body?.courier); if (!cr) throw Object.assign(new Error(), { user: 'Pilih ekspedisi.' });
    if (o.status !== 'dikemas') throw Object.assign(new Error(), { user: o.status === 'baru' ? 'Kemas pesanan terlebih dahulu.' : 'Pesanan ini tidak bisa dikirim.' });
    const pr = db.prepare('SELECT weight_g FROM sl_prods WHERE id=?').get(o.prod), w = (pr?.weight_g || 500) * o.qty, km = kmTo(shop.city, o.city);
    if (w > cr.maxKg * 1000) throw Object.assign(new Error(), { user: `${cr.name} hanya menerima paket sampai ${cr.maxKg} kg (paket ini ${(w / 1000).toFixed(1)} kg).` });
    if (km > cr.maxKm) throw Object.assign(new Error(), { user: `${cr.name} tidak menjangkau ${o.city} (jarak ${km} km, maks ${cr.maxKm} km).` });
    const days = dlvDays(o.city, shop.city, cr), hr = 9 + Math.floor(hf(o.id, 'dh') * 9), deliver = (Math.floor(clk.abs / DAY) + days) * DAY + hr * 3600, resi = 'BZ' + crypto.createHash('sha1').update(o.id + cr.id).digest('hex').slice(0, 10).toUpperCase();
    const r0 = db.prepare("UPDATE sl_orders SET status='dikirim', courier=?, resi=?, ship_abs=?, deliver_abs=? WHERE id=? AND status='dikemas'").run(cr.id, resi, clk.abs, deliver, o.id);
    if (r0.changes) { ev(v, o.id, clk.abs, 'dikirim', `Dikirim lewat ${cr.name} (resi ${resi}), estimasi ${days} hari.`); notif(v, o.id, 'sl_ship', 'Paket dikirim', `${o.name} dikirim lewat ${cr.name}. Estimasi tiba ${days} hari.`, clk.abs); }
    res.json({ ok: true, msg: `Dikirim lewat ${cr.name}. Resi ${resi}.`, resi, eta: deliver });
  }));
  app.post('/api/sell/order/:id/cancel', handle(({ v, clk, req, res }) => {
    const o = ownOrder(v, req.params.id); if (!['baru', 'dikemas'].includes(o.status)) throw Object.assign(new Error(), { user: 'Pesanan yang sudah dikirim tidak bisa dibatalkan penjual.' });
    dbTx(() => { const r0 = db.prepare("UPDATE sl_orders SET status='dibatalkan', done_abs=?, note='Dibatalkan oleh penjual' WHERE id=? AND status IN ('baru','dikemas')").run(clk.abs, o.id); if (!r0.changes) return;
      db.prepare('UPDATE sl_prods SET stock=stock+?, sold=MAX(0,sold-?) WHERE id=?').run(o.qty, o.qty, o.prod); db.prepare('UPDATE sl_shops SET rep=MAX(5,rep-1.5), cancels=cancels+1 WHERE visitor=?').run(v); ev(v, o.id, clk.abs, 'dibatalkan', 'Dibatalkan oleh penjual.'); })();
    res.json({ ok: true, msg: 'Pesanan dibatalkan. Reputasi toko turun sedikit.' });
  }));
  // Voucher toko (ditanggung penjual)
  app.get('/api/sell/vouchers', handle(({ v, res }) => { res.json({ ok: true, items: db.prepare('SELECT id, code, kind, value, min, max, quota, used, until_day AS untilDay, active FROM sl_vouchers WHERE visitor=? ORDER BY created_day DESC, rowid DESC').all(v) }); }));
  app.post('/api/sell/voucher', handle(({ v, clk, req, res }) => {
    const b = req.body || {}, code = str(b.code, 16).toUpperCase().replace(/[^A-Z0-9]/g, ''), kind = b.kind === 'percent' ? 'percent' : 'fixed';
    if (code.length < 4) throw Object.assign(new Error(), { user: 'Kode voucher 4–16 huruf/angka.' });
    const value = intIn(b.value, 1, kind === 'percent' ? 50 : 5_000_000), min = intIn(b.min ?? 0, 0, 100_000_000), max = intIn(b.max ?? 0, 0, 5_000_000), quota = intIn(b.quota, 1, 1000), days = intIn(b.days, 1, 90);
    if (value == null) throw Object.assign(new Error(), { user: kind === 'percent' ? 'Diskon persen 1–50.' : 'Nominal potongan tidak valid.' }); if (min == null || max == null || quota == null || days == null) throw Object.assign(new Error(), { user: 'Minimal belanja, kuota (1–1000), dan masa berlaku (1–90 hari) harus valid.' });
    if (kind === 'fixed' && min && value > min) throw Object.assign(new Error(), { user: 'Potongan tidak boleh melebihi minimal belanja.' });
    if (db.prepare('SELECT 1 FROM sl_vouchers WHERE visitor=? AND code=?').get(v, code)) throw Object.assign(new Error(), { user: 'Kode voucher sudah dipakai.', code: 409 });
    if (db.prepare('SELECT COUNT(*) AS n FROM sl_vouchers WHERE visitor=? AND active=1').get(v).n >= 10) throw Object.assign(new Error(), { user: 'Maksimal 10 voucher aktif.' });
    db.prepare('INSERT INTO sl_vouchers (id, visitor, code, kind, value, min, max, quota, until_day, created_day) VALUES (?,?,?,?,?,?,?,?,?,?)').run(rid('svc'), v, code, kind, value, min, max, quota, clk.day + days, clk.day);
    res.json({ ok: true, msg: `Voucher ${code} dibuat. Biaya diskon ditanggung toko.` });
  }));
  app.post('/api/sell/voucher/:id/toggle', handle(({ v, req, res }) => { const r = db.prepare('SELECT * FROM sl_vouchers WHERE id=? AND visitor=?').get(req.params.id, v); if (!r) throw Object.assign(new Error(), { user: 'Voucher tidak ditemukan.', code: 404 }); db.prepare('UPDATE sl_vouchers SET active=? WHERE id=?').run(r.active ? 0 : 1, r.id); res.json({ ok: true, active: !r.active }); }));
  // Ulasan & pelanggan
  app.get('/api/sell/reviews', handle(({ v, res }) => { const rows = db.prepare('SELECT r.id, r.order_id AS orderId, r.prod, p.name AS prodName, r.stars, r.quality, r.ship, r.service, r.text, r.buyer, r.abs, r.reply FROM sl_reviews r LEFT JOIN sl_prods p ON p.id=r.prod WHERE r.visitor=? ORDER BY r.abs DESC LIMIT 100').all(v); res.json({ ok: true, items: rows }); }));
  app.post('/api/sell/review/:id/reply', handle(({ v, req, res }) => { const t = str(req.body?.text, 200); if (t.length < 3) throw Object.assign(new Error(), { user: 'Balasan minimal 3 karakter.' }); const r = db.prepare('UPDATE sl_reviews SET reply=? WHERE id=? AND visitor=? AND reply IS NULL').run(t, req.params.id, v); if (!r.changes) throw Object.assign(new Error(), { user: 'Ulasan tidak ditemukan atau sudah dibalas.' }); res.json({ ok: true, msg: 'Balasan terkirim.' }); }));
  app.get('/api/sell/customers', handle(({ v, res }) => { res.json({ ok: true, items: db.prepare("SELECT buyer, city, COUNT(*) AS orders, SUM(CASE WHEN status='selesai' THEN gross-voucher ELSE 0 END) AS spent, MAX(created_abs) AS last FROM sl_orders WHERE visitor=? AND status!='dibatalkan' GROUP BY buyer, city ORDER BY spent DESC, orders DESC LIMIT 60").all(v) }); }));
  // Dasbor
  app.get('/api/sell/dashboard', handle(({ v, clk, shop, res }) => {
    const today = dayOfAbs(clk.abs), A = status => db.prepare(`SELECT COUNT(*) AS n, COALESCE(SUM(gross),0) AS gross, COALESCE(SUM(gross-voucher-fee),0) AS net, COALESCE(SUM(gross-voucher-fee-cost),0) AS profit, COALESCE(SUM(qty),0) AS qty FROM sl_orders WHERE visitor=? AND status IN (${status.map(() => '?').join(',')})`).get(v, ...status);
    const done = A(['selesai']), live = A(['baru', 'dikemas', 'dikirim', 'terkirim']), canc = A(['dibatalkan']), ret = A(['retur', 'refund']), all = db.prepare('SELECT COUNT(*) AS n FROM sl_orders WHERE visitor=?').get(v).n;
    const days = []; const rows = db.prepare("SELECT created_abs, gross, qty FROM sl_orders WHERE visitor=? AND status!='dibatalkan' AND created_abs>=?").all(v, (today - 13 + WARM) * DAY);
    for (let i = 13; i >= 0; i--) { const d = today - i, s = rows.filter(r => Math.floor(r.created_abs / DAY) - WARM === d); days.push({ day: d, gross: s.reduce((a, r) => a + r.gross, 0), orders: s.length }); }
    const best = db.prepare("SELECT prod, name, SUM(qty) AS qty, SUM(gross) AS gross FROM sl_orders WHERE visitor=? AND status!='dibatalkan' GROUP BY prod ORDER BY qty DESC LIMIT 5").all(v);
    const prods = db.prepare('SELECT * FROM sl_prods WHERE visitor=? AND deleted=0').all(v);
    res.json({ ok: true, shop: shopOut(shop), totals: { sales: done.gross + live.gross, completedGross: done.gross, revenue: done.net, profit: done.profit, qty: done.qty, incoming: db.prepare("SELECT COUNT(*) AS n FROM sl_orders WHERE visitor=? AND status IN ('baru','dikemas')").get(v).n, shipping: db.prepare("SELECT COUNT(*) AS n FROM sl_orders WHERE visitor=? AND status IN ('dikirim','terkirim')").get(v).n, returns: ret.n, pending: live.net, activeProducts: prods.filter(p => p.active).length, outOfStock: prods.filter(p => p.stock <= 0).map(p => ({ id: p.id, name: p.name })), cancelRate: all ? Math.round(canc.n / all * 1000) / 10 : 0, orders: all }, chart: days, best, rep: Math.round(shop.rep), rating: shop.rating_n ? Math.round(shop.rating * 10) / 10 : null, ratingN: shop.rating_n });
  }));

  // ————————————————————————— ekspor untuk modul sosial (P7/P8) —————————————————————————
  const X = { ageOk, refresh, shopOf, fundSrc, payStock, poisson, buyerName, genOrdersCap: null, db, dbTx, hooks, shopOf, refresh, handle, need, clkOf, ev, notif, str, intIn, orderOut, prodOut, refPrice, effPrice, quality, completeOrder, ownProd, ownOrder, RET_LABEL, STATUS_LABEL, COMMISSION, dayOfAbs, fmtRp, WARM, DAY, ownerOfSellerCity: null };
  return { migrate, reset, X };
};
